import { useCallback, useMemo, useRef, useState } from 'react';
import { usePortal } from '@portal/runtime';
import { useQuery } from 'utilities:react-query';
import {
    checkActionSecurity,
    fetchClassicListActions,
    fetchFormActionLayout,
    fetchListDeclarativeActions,
    fetchRelatedItems,
    filterActions,
    transformActions,
} from './documents';
import type { RelatedItem } from './documents';
import { runAction } from './run';
import type {
    ActionFilterOptions,
    ActionModel,
    ActionOutcome,
    ActionRunContext,
    ActionsContext,
    RpAction,
} from './types';

const MINUTE = 60 * 1000;

/** Query keys: everything this utility caches lives under ['rp-actions', …]. */
export const actionKeys = {
    all: ['rp-actions'] as const,
    form: (table: string, sysId: string, view: string, config: string) =>
        ['rp-actions', 'form', table, sysId, view, config] as const,
    list: (table: string, view: string, source: string, config: string, parent: string) =>
        ['rp-actions', 'list', table, view, source, config, parent] as const,
    classic: (table: string) => ['rp-actions', 'classic', table] as const,
    security: (table: string, actions: string, ids: string) => ['rp-actions', 'security', table, actions, ids] as const,
    relatedItems: (table: string, sysId: string, view: string, config: string) =>
        ['rp-actions', 'related-items', table, sysId, view, config] as const,
};

/** The portal's action configuration (settings_json.actionConfigId: a sys_ux_action_config sys_id). */
export function usePortalActionConfig(): string {
    const ctx = usePortal() as any;
    const settings = (ctx && ctx.portal && ctx.portal.settings) || {};
    return typeof settings.actionConfigId === 'string' ? settings.actionConfigId : '';
}

export type UseActionsResult = {
    /** Evaluated (client conditions), filtered (widget options) and sorted actions. */
    actions: RpAction[];
    /** Before the widget filter (still client-evaluated). */
    all: RpAction[];
    /** The model client conditions were evaluated against (also handed to runs). */
    model: ActionModel;
    /**
     * Forms: true when the portal (or widget) names an action configuration; the UX form action
     * layout then replaces the bootstrap's UI actions, as in Workspace. False: only declarative
     * actions come back, to sit next to the bootstrap's UI actions.
     */
    replacesUiActions: boolean;
    isLoading: boolean;
    error: Error | null;
};

/**
 * The platform's actions for a form, list or related list, evaluated by the platform (conditions,
 * roles, ACLs) plus Workspace's client conditions against the current model (selection count,
 * view…). Cached per table / view / config; the model re-evaluates without a request.
 *
 *   const { actions } = useActions({ kind: 'list', table, view, query, selectedIds }, { exclude: 'export' })
 *   const { actions } = useActions({ kind: 'form', table, sysId, view })
 */
export function useActions(context: ActionsContext, filter: ActionFilterOptions = {}): UseActionsResult {
    const portalConfig = usePortalActionConfig();
    const config = context.actionConfigId !== undefined ? context.actionConfigId : portalConfig;
    const enabled = context.enabled !== false && filter.actions !== false && !!context.table;
    const isForm = context.kind === 'form';
    const view = context.view || '';

    const formQuery = useQuery({
        queryKey: isForm
            ? actionKeys.form(context.table, (context as any).sysId || '-1', view, config)
            : ['rp-actions', 'off'],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchFormActionLayout({
                table: context.table,
                sysId: (context as any).sysId || '-1',
                view,
                query: context.query || '',
                actionConfigId: config,
                signal,
            }),
        enabled: enabled && isForm,
        staleTime: MINUTE,
    });

    const list = context.kind !== 'form' ? context : null;
    const source = context.kind === 'related_list' ? 'related_list' : 'list';
    const parent = list ? `${list.parentTable || ''}:${list.parentRecordSysId || ''}` : '';
    const listQuery = useQuery({
        queryKey: list ? actionKeys.list(context.table, view, source, config, parent) : ['rp-actions', 'off'],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchListDeclarativeActions({
                table: context.table,
                view,
                source,
                actionConfigId: config,
                parentTable: list ? list.parentTable : '',
                parentRecordSysId: list ? list.parentRecordSysId : '',
                fixedQuery: list ? list.fixedQuery : '',
                signal,
            }),
        enabled: enabled && !!list,
        staleTime: MINUTE,
    });
    const classicOn = !!list && list.classic === true;
    const classicQuery = useQuery({
        queryKey: actionKeys.classic(context.table),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchClassicListActions(context.table, signal),
        enabled: enabled && classicOn,
        staleTime: 5 * MINUTE,
    });

    const selected = (list && list.selectedIds) || [];
    const modelExtra = context.model;
    const model: ActionModel = useMemo(() => {
        if (isForm) {
            const f = context as Extract<ActionsContext, { kind: 'form' }>;
            return {
                ...(modelExtra || {}),
                modelType: 'FORM',
                table: f.table,
                sysId: f.sysId || '-1',
                isNewRecord: !f.sysId || f.sysId === '-1',
                view,
                query: f.query || '',
                actionConfigId: config,
            };
        }
        const l = context as Extract<ActionsContext, { kind: 'list' | 'related_list' }>;
        return {
            ...(modelExtra || {}),
            modelType: l.kind === 'related_list' ? 'RELATED_LIST' : 'LIST',
            table: l.table,
            view,
            query: l.query || '',
            count: l.count !== undefined ? l.count : selected.length,
            sysIds: selected.join(','),
            selectionQuery: selected.length ? `sys_idIN${selected.join(',')}` : '',
            parentTable: l.parentTable || '',
            parentRecordSysId: l.parentRecordSysId || '',
            relatedListName: l.relatedListName || '',
            listTitle: l.listTitle || '',
            label: l.listTitle || '',
            actionConfigId: config,
        };
    }, [
        isForm,
        context.table,
        view,
        context.query,
        (context as any).sysId,
        config,
        selected.join(','),
        list && list.count,
        modelExtra,
    ]);

    const raw: RpAction[] = useMemo(() => {
        if (isForm) {
            const items = formQuery.data || [];
            // No action config: the bootstrap already has the UI actions; only declarative ones add.
            return config ? items : items.filter((a) => a.source === 'declarative');
        }
        return (listQuery.data || []).concat(classicOn ? classicQuery.data || [] : []);
    }, [isForm, formQuery.data, listQuery.data, classicQuery.data, classicOn, config]);

    const all = useMemo(() => transformActions(raw, model), [raw, model]);
    const actions = useMemo(
        () => dedupeClassic(filterActions(all, filter)),
        [all, filter.actions, String(filter.include || ''), String(filter.exclude || ''), filter.showUnsupported]
    );
    const q = isForm ? formQuery : listQuery;
    return {
        actions,
        all,
        model,
        replacesUiActions: isForm && !!config,
        isLoading: enabled && (q.isLoading || (classicOn && classicQuery.isLoading)),
        error: (q.error as Error) || null,
    };
}

/**
 * A classic list action with the same label as a shown declarative one (Assign to me) is the same
 * action twice: the declarative one wins, as in Workspace.
 */
function dedupeClassic(actions: RpAction[]): RpAction[] {
    const labels = new Set(
        actions
            .filter((a) => a.source === 'declarative')
            .map((a) => a.label.replace(/\s*\(\d*\)\s*$/, '').toLowerCase())
    );
    return actions.filter((a) => a.group !== 'classic' || !labels.has(a.label.toLowerCase()));
}

/**
 * The platform's per-record check (AJAXActionSecurity) for classic list actions on a set of records
 * (the page's rows): { actionSysId: allowed sys_ids }. Cached per table, actions and records.
 */
export function useActionSecurity(table: string, actions: RpAction[], sysIds: string[], enabled = true) {
    const ids = actions.filter((a) => a.source === 'ui_action' && a.run.type === 'ui_action').map((a) => a.id);
    const key = ids.join(',');
    const rows = sysIds.join(',');
    return useQuery({
        queryKey: actionKeys.security(table, key, rows),
        queryFn: ({ signal }: { signal: AbortSignal }) => checkActionSecurity(table, ids, sysIds, signal),
        enabled: enabled && !!table && !!ids.length && !!sysIds.length,
        staleTime: 30 * 1000,
    });
}

/** Related items / contextual side bar entries of a record (Seismic components; see fetchRelatedItems). */
export function useRelatedItems(
    args: { table: string; sysId: string; view?: string; actionConfigId?: string },
    enabled = true
) {
    const portalConfig = usePortalActionConfig();
    const config = args.actionConfigId !== undefined ? args.actionConfigId : portalConfig;
    return useQuery<RelatedItem[]>({
        queryKey: actionKeys.relatedItems(args.table, args.sysId, args.view || '', config),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchRelatedItems({
                table: args.table,
                sysId: args.sysId,
                view: args.view,
                actionConfigId: config,
                signal,
            }),
        enabled: enabled && !!args.table && !!args.sysId && args.sysId !== '-1',
        staleTime: 5 * MINUTE,
    });
}

/**
 * Run actions with a busy state (one at a time):
 *   const { run, running } = useRunAction(() => ({ surface: 'list', table, sysIds, refresh, openRecord }))
 *   run(action)           // → ActionOutcome
 * `context` is read at run time, so it can close over the latest selection.
 */
export function useRunAction(context: ActionRunContext | (() => ActionRunContext)) {
    const [running, setRunning] = useState('');
    const busy = useRef(false);
    const ctxRef = useRef(context);
    ctxRef.current = context;
    const run = useCallback(
        async (action: RpAction, overrides: Partial<ActionRunContext> = {}): Promise<ActionOutcome> => {
            if (busy.current) return { ok: false, reason: 'blocked', message: 'Another action is running.' };
            busy.current = true;
            setRunning(action.id);
            try {
                const c = ctxRef.current;
                const base = typeof c === 'function' ? c() : c;
                return await runAction(action, { ...base, ...overrides });
            } finally {
                busy.current = false;
                setRunning('');
            }
        },
        []
    );
    return { run, running, busy: !!running };
}
