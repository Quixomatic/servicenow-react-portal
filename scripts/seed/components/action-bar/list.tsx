import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@portal/runtime';
import { useActions, useActionSecurity, useRunAction } from 'utilities:app/actions';
import type { ActionFilterOptions, ActionRunContext, RpAction } from 'utilities:app/actions';
import { createListScriptEnvironment, scriptUserFrom } from 'utilities:app/gform';
import type { GListTarget } from 'utilities:app/gform';
import { ActionBar, actionMenuItems } from './bar';

/**
 * Platform list actions on a RecordList (components:app/data-table), through its extension slots:
 *
 *   const slots = useListActionSlots({ table, view, openRecord })
 *   <RecordList table={table} {...slots.props} />
 *
 * - toolbar: actions that need no selection (New, Export, Launch Process Mining…);
 * - selection bar: bulk actions on the checked rows (declarative actions with recordSelectionRequired;
 *   classic server-side list actions the platform allows on at least one checked row);
 * - row context menu (right-click / Shift+F10): the selection actions for that row, and classic
 *   context-menu actions the platform allows on it (AJAXActionSecurity over the page's rows).
 * Client scripts run with g_list (utilities:app/gform), server parts as the user; notifications
 * become toasts and the list refreshes.
 */

/** The parts of data-table's ListController this module reads (structural, see ListController). */
export type ListControllerLike = {
    table: string;
    view?: string;
    filter: string;
    fixedQuery?: string;
    query: string;
    orderBy?: string;
    rows: { sysId: string; className?: string }[];
    count: number;
    selectedIds: string[];
    setSelection?: (ids: string[]) => void;
    clearSelection?: () => void;
    refresh: () => void;
    setFilter: (encoded: string) => void;
    setGroupBy?: (column: string) => void;
};

export type ListActionSlotOptions = ActionFilterOptions & {
    table: string;
    view?: string;
    kind?: 'list' | 'related_list';
    fixedQuery?: string;
    parentTable?: string;
    parentRecordSysId?: string;
    relatedListName?: string;
    listTitle?: string;
    /** sys_ux_action_config sys_id (default: the portal's settings.actionConfigId). */
    actionConfigId?: string;
    /** Classic server-side list UI actions (context menu / list choice). */
    classic?: boolean;
    openRecord?: (table: string, sysId: string, params?: Record<string, unknown>) => void;
    /** Toolbar button budget (the rest go into More). Default 3. */
    maxButtons?: number;
};

/** g_list over a controller (read at call time). */
export function gListTarget(get: () => ListControllerLike | null, extra: Partial<GListTarget> = {}): GListTarget {
    const c = () => get() || ({ table: '', filter: '', query: '', rows: [], count: 0, selectedIds: [] } as any);
    return {
        table: extra.table || c().table,
        view: extra.view !== undefined ? extra.view : c().view,
        listName: extra.listName,
        title: extra.title,
        query: () => {
            const ctl = c();
            const order = String(ctl.orderBy || '');
            const ob = order ? (order.charAt(0) === '-' ? 'ORDERBYDESC' + order.slice(1) : 'ORDERBY' + order) : '';
            return [ctl.filter, ob].filter(Boolean).join('^');
        },
        fixedQuery: extra.fixedQuery !== undefined ? extra.fixedQuery : c().fixedQuery,
        parentTable: extra.parentTable,
        relatedField: extra.relatedField,
        selectedIds: () => c().selectedIds || [],
        totalRows: () => c().count || 0,
        // The controller takes the user filter alone; a GROUPBY goes through setGroupBy, ORDERBY is dropped
        // (the list keeps its own sort).
        setFilter: (q: string) => {
            const parts = String(q || '')
                .split('^')
                .filter(Boolean);
            const group = parts.find((p) => /^GROUPBY/.test(p));
            c().setFilter(parts.filter((p) => !/^(ORDERBY|GROUPBY)/.test(p)).join('^'));
            if (group && c().setGroupBy) c().setGroupBy!(group.replace(/^GROUPBY/, ''));
        },
        refresh: () => c().refresh(),
    };
}

export function useListActionSlots(options: ListActionSlotOptions) {
    const user = useUser() as any;
    const ctl = useRef<ListControllerLike | null>(null);
    const [snap, setSnap] = useState<{ query: string; selected: string[]; rowIds: string[] }>({
        query: '',
        selected: [],
        rowIds: [],
    });
    const kind = options.kind || (options.parentRecordSysId ? 'related_list' : 'list');
    const { actions } = useActions(
        {
            kind,
            table: options.table,
            view: options.view,
            query: snap.query,
            fixedQuery: options.fixedQuery,
            parentTable: options.parentTable,
            parentRecordSysId: options.parentRecordSysId,
            relatedListName: options.relatedListName,
            listTitle: options.listTitle,
            selectedIds: snap.selected,
            actionConfigId: options.actionConfigId,
            classic: options.classic,
        },
        options
    );
    const classic = actions.filter((a) => a.source === 'ui_action');
    // The platform's per-record check for classic actions: the page's rows plus the checked ones.
    const checkIds = useMemo(
        () => Array.from(new Set(snap.rowIds.concat(snap.selected))).sort(),
        [snap.rowIds.join(','), snap.selected.join(',')]
    );
    const security = useActionSecurity(options.table, classic, checkIds, !!classic.length);
    const allowed = (a: RpAction, ids: string[]) => {
        if (a.source !== 'ui_action') return true;
        const map = security.data;
        if (!map) return false;
        const ok = map[a.id] || [];
        return ids.some((id) => ok.indexOf(id) >= 0);
    };

    const env = useMemo(
        () =>
            createListScriptEnvironment({
                list: gListTarget(() => ctl.current, {
                    table: options.table,
                    view: options.view,
                    fixedQuery: options.fixedQuery,
                    parentTable: options.parentTable,
                    title: options.listTitle,
                    listName: options.relatedListName ? `${options.table}.${options.relatedListName}` : options.table,
                }),
                user: scriptUserFrom(user),
                openRecord: options.openRecord,
            }),
        [
            options.table,
            options.view,
            options.fixedQuery,
            options.parentTable,
            options.relatedListName,
            user && user.sysId,
        ]
    );

    const runCtx = (ids: string[]): ActionRunContext => {
        const c = ctl.current;
        return {
            surface: kind,
            table: options.table,
            sysIds: ids,
            view: options.view,
            query: c ? c.query : '',
            parentTable: options.parentTable,
            parentRecordSysId: options.parentRecordSysId,
            openRecord: options.openRecord,
            refresh: () => ctl.current && ctl.current.refresh(),
            runClientScript: (name, script, fnName) => env.run(name, script, fnName),
        };
    };
    const { run, running } = useRunAction(() => runCtx(ctl.current ? ctl.current.selectedIds : []));

    // The list's own Export and "Edit field…" already cover Workspace's export / edit-selected actions.
    const own = (a: RpAction) =>
        a.run.type === 'uxf' && (a.run.dispatch === 'DA#EXPORT_MODAL' || a.run.dispatch === 'DA#EDIT_SELECTED');
    const shown = actions.filter((a) => !own(a));
    const toolbar = shown.filter((a) => a.selection === 'none');
    const bulk = shown.filter((a) => a.selection === 'required');

    // Keep what the hook evaluates against (query, selection, page rows) in step with the list.
    const sync = useCallback((c: ListControllerLike) => {
        ctl.current = c;
        const next = {
            query: c.query || '',
            selected: c.selectedIds || [],
            rowIds: (c.rows || []).map((r) => r.sysId),
        };
        setSnap((prev) =>
            prev.query === next.query &&
            prev.selected.join(',') === next.selected.join(',') &&
            prev.rowIds.join(',') === next.rowIds.join(',')
                ? prev
                : next
        );
    }, []);

    // Phones: every toolbar action goes into the More menu, so search and the list's own buttons fit.
    const narrow = useNarrow();
    const max = options.maxButtons === undefined ? (narrow ? 0 : 3) : options.maxButtons;
    const enabled = options.actions !== false;
    const props = {
        toolbarActions: enabled
            ? (c: ListControllerLike) => (
                  <ListSync controller={c} onSync={sync}>
                      <ActionBar
                          actions={toolbar}
                          onRun={(a) => run(a, { sysIds: c.selectedIds })}
                          running={running}
                          maxButtons={max}
                          size="default"
                          label="List actions"
                      />
                  </ListSync>
              )
            : undefined,
        selectionActions: enabled
            ? (c: ListControllerLike) => {
                  ctl.current = c;
                  // Bulk actions read as buttons next to "Edit field…" (groups don't apply in the selection bar).
                  const list = bulk
                      .filter((a) => allowed(a, c.selectedIds))
                      .map((a) =>
                          a.source === 'declarative' ? { ...a, group: undefined, placement: 'button' as const } : a
                      );
                  return list.length ? (
                      <ActionBar
                          actions={list}
                          onRun={(a) => run(a, { sysIds: c.selectedIds })}
                          running={running}
                          maxButtons={2}
                          size="default"
                          label="Actions on selected rows"
                          moreLabel="Actions"
                      />
                  ) : null;
              }
            : undefined,
        contextMenuItems: enabled
            ? (cell: { row?: { sysId?: string; original?: { sysId?: string } } } | any, c: ListControllerLike) => {
                  ctl.current = c;
                  const row = (cell && cell.row && (cell.row.original || cell.row)) || {};
                  const id = String(row.sysId || '');
                  if (!id) return [];
                  const list = bulk.filter((a) =>
                      a.source === 'ui_action' ? a.rowMenu && allowed(a, [id]) : a.supported
                  );
                  if (!list.length) return [];
                  return actionMenuItems(list, (a) => run(a, { sysIds: [id] }), {
                      label: (a) => a.label.replace(/\s*\(\d+\)\s*$/, ''),
                  });
              }
            : undefined,
    };
    return { props, actions, running, env, controller: ctl };
}

/** Viewport narrower than 640px (tracks resizes). */
function useNarrow(): boolean {
    const query = '(max-width: 639px)';
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setNarrow(mq.matches);
        mq.addEventListener('change', on);
        on();
        return () => mq.removeEventListener('change', on);
    }, []);
    return narrow;
}

/** Renders children and reports the controller to the hook after each render. */
function ListSync({
    controller,
    onSync,
    children,
}: {
    controller: ListControllerLike;
    onSync: (c: ListControllerLike) => void;
    children: any;
}) {
    useEffect(() => onSync(controller));
    return children;
}
