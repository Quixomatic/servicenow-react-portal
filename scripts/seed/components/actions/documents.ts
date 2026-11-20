import { graphql, authHeaders, safeName } from 'utilities:app/graphql';
import type { SessionNotification } from 'utilities:app/graphql';
import {
    applyPayloadMap,
    evaluateConditions,
    evaluateScriptedCondition,
    interpolate,
    interpolateDeep,
    parseJson,
} from './conditions';
import type { ActionModel, ActionRun, RpAction } from './types';

/**
 * Platform action sources (all evaluated by the platform for the session user; conditions and
 * roles applied server side, client conditions applied by transformActions):
 *
 *   fetchListDeclarativeActions   GlideListLayout_Query.getListDeclarativeActionsLayout   list / related list actions
 *   fetchFormActionLayout         GlideUxActionLayout_Query.getActionLayout               UX form action layout (UI + declarative)
 *   fetchRelatedItems             GlideDeclarativeActions_Query…formDeclarativeActions    related items / side bar (Seismic components)
 *   fetchClassicListActions       sys_ui_action (server-side list context menu / list choice)
 *   checkActionSecurity           POST /xmlhttp.do AJAXActionSecurity                     can_execute per record (UI16's check)
 *   runDeclarativeServerScript    POST /api/now/ui/declarative_action/:assignmentId
 */

// ---- GraphQL documents ----------------------------------------------------------------------------

const LIST_DA_FIELDS = `toolTip buttonType recordSelectionRequired confirmationRequired confirmationMessage assignmentId table view name icon label order groupBy group actionType actionComponent: actionComponentTag actionAttributes actionDispatch actionPayload clientScript requiresValue dependency modelConditions { field operator value newQuery or } payloadMap { name value }`;

export const LIST_ACTIONS_QUERY = `query rpListActions($table: String!, $view: String, $actionConfigId: String, $workspaceConfigId: String, $source: String, $parentTable: String, $parentRecordSysId: String, $fixedQuery: String) {
  GlideListLayout_Query {
    getListDeclarativeActionsLayout(workspaceConfigId: $workspaceConfigId, actionConfigId: $actionConfigId, source: $source, table: $table, view: $view, parentRecordSysId: $parentRecordSysId, parentTable: $parentTable, fixedQuery: $fixedQuery) {
      declarativeActions {
        ... on GlideListLayout_DeclarativeActionModelType { ${LIST_DA_FIELDS} }
        ... on GlideListLayout_DeclarativeActionGroupType { group groupId order groupedActions { ${LIST_DA_FIELDS} } }
      }
    }
  }
}`;

const UX_COMMON = `name label color icon shouldBeInOverflow`;
const UX_DA = `${UX_COMMON} assignmentId tooltip actionPayload actionDispatch actionType confirmationMessage confirmationRequired scriptedClientCondition modelConditions { field operator value newQuery or } payloadMap { name value }`;
const UX_UI = `${UX_COMMON} sysId clientScript hint hasClientScript`;

export const FORM_ACTION_LAYOUT_QUERY = `query rpFormActionLayout($table: String!, $sysId: String!, $view: String, $query: String, $actionConfigId: String) {
  GlideUxActionLayout_Query {
    getActionLayout(table: $table, sysId: $sysId, view: $view, query: $query, actionConfigId: $actionConfigId) {
      actionLayoutItems {
        ... on GlideUxActionLayout_UxActionGroupType { name label color shouldBeInOverflow type actions {
            ... on GlideUxActionLayout_UxUiActionType { ${UX_UI} order }
            ... on GlideUxActionLayout_UxDeclarativeActionType { ${UX_DA} } } }
        ... on GlideUxActionLayout_UxUiActionType { ${UX_UI} }
        ... on GlideUxActionLayout_UxDeclarativeActionType { ${UX_DA} }
      }
    }
  }
}`;

export const RELATED_ITEMS_QUERY = `query rpRelatedItems($table: String!, $sysId: String!, $view: String, $query: String, $actionConfigId: String) {
  GlideDeclarativeActions_Query {
    GlideDeclarativeActions_formQuery {
      formDeclarativeActions(table: $table, view: $view, sysId: $sysId, query: $query, source: "form", workspaceConfigId: "", actionConfigId: $actionConfigId, position: "", parentTable: "", parentRecordSysId: "") {
        formActions { position actions { name icon label tooltip actionComponent actionAttributes order assignmentId modelConditions { field operator value newQuery or } payloadMap { name value } } }
      }
    }
  }
}`;

// ---- normalization -----------------------------------------------------------------------------------

/** UXF client actions the portal maps onto its own behaviour. */
export const MAPPED_UXF = ['CREATE_NEW_RECORD', 'DA#EDIT_SELECTED', 'DA#EXPORT_MODAL'];

function isRecordRoute(payload: Record<string, any>): boolean {
    return !!payload && payload.route === 'record' && !!payload.fields && !!payload.fields.table;
}

function runOfDeclarative(a: any): ActionRun {
    const type = String(a.actionType || '');
    const id = String(a.assignmentId || '');
    if (type === 'server_script') return { type: 'server_script', assignmentId: id };
    if (type === 'client_script')
        return a.clientScript
            ? { type: 'client_script', assignmentId: id, script: String(a.clientScript) }
            : { type: 'unsupported', reason: 'This action has no client script.' };
    if (type === 'uxf_client_action' || type === 'dispatch_action') {
        const payload = applyPayloadMap(parseJson(a.actionPayload), a.payloadMap);
        return { type: 'uxf', assignmentId: id, dispatch: String(a.actionDispatch || ''), payload };
    }
    return { type: 'unsupported', reason: `“${type || 'unknown'}” actions only run in Workspace.` };
}

function supportedRun(run: ActionRun): boolean {
    if (run.type === 'unsupported') return false;
    if (run.type === 'uxf') return MAPPED_UXF.indexOf(run.dispatch) >= 0 || isRecordRoute(run.payload);
    return true;
}

function variantOf(v: unknown): RpAction['variant'] {
    const s = String(v || '').toLowerCase();
    if (s === 'primary' || s === 'primary-positive') return 'primary';
    if (s === 'destructive' || s === 'primary-negative' || s === 'secondary-negative') return 'destructive';
    return 'default';
}

/** A declarative action (list or UX form layout) as an RpAction, before client evaluation. */
export function normalizeDeclarative(a: any, extra: Partial<RpAction> = {}): RpAction {
    const run = runOfDeclarative(a);
    return {
        id: String(a.assignmentId || a.name || ''),
        source: 'declarative',
        name: String(a.name || ''),
        label: String(a.label || a.name || ''),
        hint: a.toolTip || a.tooltip || undefined,
        icon: a.icon || undefined,
        order: Number(a.order || 0),
        placement: a.shouldBeInOverflow ? 'menu' : 'button',
        variant: variantOf(a.buttonType || a.color),
        selection: a.recordSelectionRequired ? 'required' : 'none',
        confirm: a.confirmationRequired
            ? { message: String(a.confirmationMessage || 'Do you want to proceed?') }
            : undefined,
        run,
        supported: supportedRun(run),
        raw: a,
        ...extra,
    };
}

/** A UX layout UI action as an RpAction. */
export function normalizeUxUiAction(a: any, extra: Partial<RpAction> = {}): RpAction {
    return {
        id: String(a.sysId || ''),
        source: 'ui_action',
        name: String(a.name || ''),
        label: String(a.label || a.name || ''),
        hint: a.hint || undefined,
        icon: a.icon || undefined,
        order: Number(a.order || 0),
        placement: a.shouldBeInOverflow ? 'menu' : 'button',
        variant: variantOf(a.color),
        selection: 'none',
        run: {
            type: 'ui_action',
            sysId: String(a.sysId || ''),
            clientScript: a.hasClientScript ? a.clientScript : undefined,
        },
        supported: true,
        raw: a,
        ...extra,
    };
}

/**
 * Client evaluation (Workspace's transformer): interpolate label, hint, payload and conditions, keep
 * the actions whose model conditions and scripted client condition pass, sort by order.
 * `recordSelectionRequired` with count 0: "Edit (0)" reads "Edit".
 */
export function transformActions(actions: RpAction[], model: ActionModel): RpAction[] {
    const out: RpAction[] = [];
    actions.forEach((a) => {
        const raw: any = a.raw || {};
        if (a.source === 'declarative') {
            const conditions = interpolateDeep(raw.modelConditions || [], model);
            if (!evaluateConditions(conditions, model)) return;
            if (!evaluateScriptedCondition(interpolate(raw.scriptedClientCondition, model), model)) return;
        }
        let label = String(interpolate(a.label, model));
        let hint = a.hint ? String(interpolate(a.hint, model)) : undefined;
        if (a.selection === 'required' && !Number(model.count || 0)) {
            label = label.replace(/\(0\)/, '').trim();
            if (hint) hint = hint.replace(/\(0\)/, '').trim();
        }
        const run: ActionRun =
            a.run.type === 'uxf' ? { ...a.run, payload: interpolateDeep(a.run.payload, model) } : a.run;
        out.push({ ...a, label, hint, run });
    });
    return out.sort((x, y) => x.order - y.order);
}

/** Widget allow / deny list and the unsupported filter. */
export function filterActions(
    actions: RpAction[],
    options: {
        actions?: boolean;
        include?: string | string[];
        exclude?: string | string[];
        showUnsupported?: boolean;
    } = {}
): RpAction[] {
    if (options.actions === false) return [];
    const list = (v?: string | string[]) =>
        (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    const inc = list(options.include);
    const exc = list(options.exclude);
    const key = (a: RpAction) => [a.name, a.id, a.label].map((s) => String(s || '').toLowerCase());
    return actions.filter((a) => {
        if (!a.supported && !options.showUnsupported) return false;
        const k = key(a);
        if (inc.length && !k.some((x) => inc.indexOf(x) >= 0)) return false;
        if (exc.length && k.some((x) => exc.indexOf(x) >= 0)) return false;
        return true;
    });
}

// ---- fetchers -------------------------------------------------------------------------------------

export type ListActionsArgs = {
    table: string;
    view?: string;
    source?: 'list' | 'related_list';
    actionConfigId?: string;
    parentTable?: string;
    parentRecordSysId?: string;
    fixedQuery?: string;
    signal?: AbortSignal;
};

/** List (or related list) declarative actions, flattened (group labels kept on `group`). */
export async function fetchListDeclarativeActions(args: ListActionsArgs): Promise<RpAction[]> {
    const data = await graphql(
        LIST_ACTIONS_QUERY,
        {
            table: safeName(args.table, 'table'),
            view: args.view || '',
            actionConfigId: args.actionConfigId || '',
            workspaceConfigId: '',
            source: args.source || 'list',
            parentTable: args.parentTable || '',
            parentRecordSysId: args.parentRecordSysId || '',
            fixedQuery: args.fixedQuery || '',
        },
        { signal: args.signal, allowPartial: true }
    );
    const L = data && data.GlideListLayout_Query && data.GlideListLayout_Query.getListDeclarativeActionsLayout;
    const out: RpAction[] = [];
    ((L && L.declarativeActions) || []).forEach((a: any) => {
        if (!a) return;
        if (a.groupedActions)
            (a.groupedActions || []).forEach(
                (g: any) => g && out.push(normalizeDeclarative(g, { group: a.group || undefined }))
            );
        else out.push(normalizeDeclarative(a));
    });
    return out;
}

export type FormActionArgs = {
    table: string;
    sysId: string;
    view?: string;
    query?: string;
    actionConfigId?: string;
    signal?: AbortSignal;
};

/** The UX form action layout: UI actions and declarative actions, groups flattened onto `group`. */
export async function fetchFormActionLayout(args: FormActionArgs): Promise<RpAction[]> {
    const data = await graphql(
        FORM_ACTION_LAYOUT_QUERY,
        {
            table: safeName(args.table, 'table'),
            sysId: args.sysId || '-1',
            view: args.view || '',
            query: args.query || '',
            actionConfigId: args.actionConfigId || '',
        },
        { signal: args.signal, allowPartial: true }
    );
    const L = data && data.GlideUxActionLayout_Query && data.GlideUxActionLayout_Query.getActionLayout;
    const out: RpAction[] = [];
    let order = 0;
    const one = (a: any, group?: string) => {
        order += 10;
        const extra: Partial<RpAction> = { order: a.order ? Number(a.order) : order, group };
        if (group) extra.placement = 'menu';
        out.push(a.assignmentId ? normalizeDeclarative(a, extra) : normalizeUxUiAction(a, extra));
    };
    ((L && L.actionLayoutItems) || []).forEach((item: any) => {
        if (!item) return;
        if (Array.isArray(item.actions))
            item.actions.forEach((a: any) => a && one(a, item.label || item.name || undefined));
        else one(item);
    });
    return out;
}

export type RelatedItem = {
    id: string;
    name: string;
    label: string;
    icon?: string;
    hint?: string;
    order: number;
    /** related_item | contexual_sidebar (sic) | action_bar */
    position: string;
    /** The Seismic component Workspace renders for it. */
    component: string;
    attributes: Record<string, any>;
};

/** Related items and contextual side bar entries (declarative actions rendering Seismic components). */
export async function fetchRelatedItems(args: FormActionArgs): Promise<RelatedItem[]> {
    const data = await graphql(
        RELATED_ITEMS_QUERY,
        {
            table: safeName(args.table, 'table'),
            sysId: args.sysId || '-1',
            view: args.view || '',
            query: args.query || '',
            actionConfigId: args.actionConfigId || '',
        },
        { signal: args.signal, allowPartial: true }
    );
    const F =
        data &&
        data.GlideDeclarativeActions_Query &&
        data.GlideDeclarativeActions_Query.GlideDeclarativeActions_formQuery &&
        data.GlideDeclarativeActions_Query.GlideDeclarativeActions_formQuery.formDeclarativeActions;
    const out: RelatedItem[] = [];
    ((F && F.formActions) || []).forEach((group: any) =>
        ((group && group.actions) || []).forEach((a: any) => {
            if (!a || group.position === 'action_bar') return;
            out.push({
                id: String(a.assignmentId || a.name || ''),
                name: String(a.name || a.actionComponent || ''),
                label: String(a.label || a.name || ''),
                icon: a.icon || undefined,
                hint: a.tooltip || undefined,
                order: Number(a.order || 0),
                position: String(group.position || ''),
                component: String(a.actionComponent || ''),
                attributes: parseJson(a.actionAttributes),
            });
        })
    );
    return out.sort((x, y) => x.order - y.order);
}

// ---- classic list UI actions (server-side context menu / list choice) ------------------------------

const hierarchyCache = new Map<string, Promise<string[]>>();

/** The table and its parents ('incident' → ['incident', 'task']), via sys_db_object. */
export function tableHierarchy(table: string): Promise<string[]> {
    const hit = hierarchyCache.get(table);
    if (hit) return hit;
    const p = (async () => {
        const chain: string[] = [];
        let cur = table;
        for (let i = 0; cur && i < 8; i++) {
            chain.push(cur);
            const r = await fetch(
                `/api/now/table/sys_db_object?sysparm_query=name=${encodeURIComponent(cur)}&sysparm_fields=super_class.name&sysparm_limit=1`,
                { credentials: 'same-origin', headers: authHeaders(false) }
            );
            const j = r.ok ? await r.json().catch(() => null) : null;
            const row = j && j.result && j.result[0];
            cur = row ? String(row['super_class.name'] || '') : '';
        }
        return chain;
    })();
    p.catch(() => hierarchyCache.delete(table));
    hierarchyCache.set(table, p);
    return p;
}

/**
 * Server-side list UI actions (list_context_menu / list_choice with client = false) of the table and
 * its parents and global; a child table's action overrides its parent's action of the same name.
 * Whether each one may run on a record is the platform's call (checkActionSecurity), so these come
 * back with selection 'required' and rowMenu true. Empty when sys_ui_action isn't readable.
 */
export async function fetchClassicListActions(table: string, signal?: AbortSignal): Promise<RpAction[]> {
    safeName(table, 'table');
    const chain = (await tableHierarchy(table).catch(() => [table])).concat('global');
    const q = [
        'active=true',
        'client=false',
        `tableIN${chain.join(',')}`,
        'list_context_menu=true^ORlist_choice=true',
    ].join('^');
    const r = await fetch(
        `/api/now/table/sys_ui_action?sysparm_query=${encodeURIComponent(q + '^ORDERBYorder')}&sysparm_fields=sys_id,name,action_name,table,order,hint,list_context_menu,list_choice,form_style&sysparm_limit=200`,
        { credentials: 'same-origin', headers: authHeaders(false), signal }
    );
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    const rows: any[] = (j && j.result) || [];
    const rank = (t: string) => {
        const i = chain.indexOf(t);
        return i < 0 ? chain.length : i;
    };
    const best = new Map<string, any>();
    rows.forEach((row) => {
        const key = String(row.action_name || row.name || row.sys_id);
        const prev = best.get(key);
        if (!prev || rank(row.table) < rank(prev.table)) best.set(key, row);
    });
    return Array.from(best.values()).map((row) => ({
        id: String(row.sys_id),
        source: 'ui_action' as const,
        name: String(row.action_name || ''),
        label: String(row.name || row.action_name || ''),
        hint: row.hint || undefined,
        order: Number(row.order || 0),
        placement: 'menu' as const,
        variant: row.form_style === 'destructive' ? ('destructive' as const) : ('default' as const),
        group: 'classic',
        selection: 'required' as const,
        rowMenu: row.list_context_menu === 'true',
        run: { type: 'ui_action' as const, sysId: String(row.sys_id) },
        supported: true,
        raw: row,
    }));
}

/**
 * The platform's per-record check for list actions (UI16's AJAXActionSecurity): condition and
 * roles evaluated as the user for every checked record → { actionSysId: [sysIds it may run on] }.
 */
export async function checkActionSecurity(
    table: string,
    actionIds: string[],
    sysIds: string[],
    signal?: AbortSignal
): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    if (!actionIds.length || !sysIds.length) return out;
    const body = new URLSearchParams({
        sysparm_processor: 'AJAXActionSecurity',
        sysparm_scope: 'global',
        sys_target: safeName(table, 'table'),
        sys_action: actionIds.join(','),
        sysparm_checked_items: sysIds.join(','),
    });
    const h = authHeaders(false);
    h['Content-Type'] = 'application/x-www-form-urlencoded';
    const r = await fetch('/xmlhttp.do', { method: 'POST', credentials: 'same-origin', headers: h, body, signal });
    const text = await r.text();
    if (!r.ok) return out;
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    actionIds.forEach((id) => {
        const node = doc.getElementsByTagName('action_' + id)[0];
        const ok: string[] = [];
        if (node)
            Array.from(node.getElementsByTagName('key')).forEach((k) => {
                if (k.getAttribute('can_execute') === 'true') ok.push(String(k.getAttribute('sys_id') || ''));
            });
        out[id] = ok;
    });
    return out;
}

// ---- declarative server script ---------------------------------------------------------------------

export type DeclarativeResult = {
    notifications: SessionNotification[];
    redirect?: { table?: string; sysId?: string; query?: string };
    ok: boolean;
    message?: string;
};

function notificationsOf(json: any): SessionNotification[] {
    const list = (json && json.session && json.session.notifications) || [];
    return list
        .map((n: any) => ({ type: String(n.type || 'info'), text: String(n.text || n.message || '') }))
        .filter((n: SessionNotification) => n.text);
}

/** Run a declarative action's server script (Workspace's mediator call), as the user. */
export async function runDeclarativeServerScript(args: {
    assignmentId: string;
    table: string;
    sysId?: string;
    sysIds?: string[];
    fields?: { name: string; value: string; displayValue?: string }[];
    encodedRecord?: string;
    query?: string;
    parentTable?: string;
    parentRecordSysId?: string;
    signal?: AbortSignal;
}): Promise<DeclarativeResult> {
    const ids = args.sysIds || [];
    const url = `/api/now/ui/declarative_action/${encodeURIComponent(args.assignmentId)}?sysparm_table=${encodeURIComponent(safeName(args.table, 'table'))}`;
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(true), 'X-WantSessionNotificationMessages': 'true' },
        body: JSON.stringify({
            sysId: args.sysId || (ids.length === 1 ? ids[0] : ''),
            sysIds: ids.join(','),
            fields: args.fields || [],
            encodedRecord: args.encodedRecord || '',
            query: args.query || '',
            selectionQuery: ids.length ? `sys_idIN${ids.join(',')}` : '',
            parentTable: args.parentTable || '',
            parentRecordSysId: args.parentRecordSysId || '',
        }),
        signal: args.signal,
    });
    const text = await response.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (e) {
        /* not JSON */
    }
    const notifications = notificationsOf(json);
    const result = (json && json.result) || {};
    if (!response.ok || result.status === 'failure') {
        const err = (json && json.error) || result.error || {};
        let message = err.message || err.detail || '';
        if (!message && result && typeof result === 'object') {
            const first = result[Object.keys(result)[0]];
            message = (first && first.resultBody && first.resultBody.error && first.resultBody.error.message) || '';
        }
        return { ok: false, notifications, message: message || `The action failed (HTTP ${response.status})` };
    }
    const r = result.redirect;
    const meta = (r && (r.type_metadata || r.typeMetadata)) || {};
    return {
        ok: true,
        notifications,
        redirect: r
            ? { table: meta.table || undefined, sysId: meta.sys_id || undefined, query: meta.query || undefined }
            : undefined,
    };
}
