import { compileScript, createGModal, createGUser } from './environment';
import type { ScriptError, ScriptUser } from './environment';
import { createGlideAjaxClass } from './glide-ajax';
import { createGlideRecordClass } from './glide-record';

/**
 * g_list: the list scripting API (Workspace's GlideList public API) over any list, for list UI action
 * scripts and declarative list client scripts. A compatibility layer like g_form: new widgets use
 * the list controller directly.
 *
 * setFilter / addFilter / setOrderBy / setGroupBy stage a query; refresh() / refreshWithOrderBy() /
 * setFilterAndRefresh() apply it through the target. Unsupported classic calls (isUserList,
 * setFirstRow, showHideGroups, showHideList, toggleList, toggleListNoPref) only warn, as in Workspace.
 */

/** What g_list reads and drives: any list (data-table's ListController maps onto it). */
export type GListTarget = {
    table: string;
    view?: string;
    /** 'incident' or, for related lists, '<table>.<relationship>'. */
    listName?: string;
    title?: string;
    /** The user filter, encoded (ORDERBY terms included if the list keeps them there). */
    query: () => string;
    fixedQuery?: string;
    /** Related lists: the parent's table and the relationship field. */
    parentTable?: string;
    relatedField?: string;
    selectedIds: () => string[];
    totalRows: () => number;
    /** Apply a new user filter (and refresh). */
    setFilter?: (encoded: string) => void;
    /** Sort by a column. */
    sort?: (field: string, descending: boolean) => void;
    refresh?: () => void;
    setPageSize?: (rows: number) => void;
};

const parts = (q: string) =>
    String(q || '')
        .split('^')
        .filter(Boolean);
const isOrder = (p: string) => /^ORDERBY/.test(p);
const isGroup = (p: string) => /^GROUPBY/.test(p);
const join = (list: string[]) => list.filter(Boolean).join('^');

function warn(name: string) {
    // eslint-disable-next-line no-console
    console.warn(`Script error: g_list.${name}() is not supported. Contact your administrator to update this.`);
}

/** The g_list object for a target. */
export function createGList(target: GListTarget): any {
    let pending: string | null = null;
    const current = () => (pending !== null ? pending : target.query() || '');
    const conditions = (q: string) => parts(q).filter((p) => !isOrder(p) && !isGroup(p));
    const orderOf = (q: string) => parts(q).filter(isOrder);
    const groupOf = (q: string) => parts(q).filter(isGroup);
    const apply = (q: string) => {
        pending = null;
        if (target.setFilter) target.setFilter(q);
        else if (target.refresh) target.refresh();
    };
    const g_list: any = {
        get tableName() {
            return target.table;
        },
        get query() {
            return current();
        },
        get view() {
            return target.view || '';
        },
        get parentTable() {
            return target.parentTable || '';
        },
        get fixedQuery() {
            return target.fixedQuery || '';
        },
        get selectedSysIds() {
            return target.selectedIds();
        },
        get totalRows() {
            return target.totalRows();
        },
        get related() {
            return target.relatedField || '';
        },
        addFilter(filter: string) {
            if (filter == null || filter === '') return;
            pending = join(
                conditions(current()).concat(parts(filter)).concat(orderOf(current())).concat(groupOf(current()))
            );
        },
        getChecked: () => target.selectedIds().join(','),
        getFixedQuery: () => target.fixedQuery || '',
        getListName: () => target.listName || target.table,
        getParentTable: () => target.parentTable || '',
        getQuery(
            opts: { orderBy?: boolean; orderby?: boolean; groupBy?: boolean; fixed?: boolean; all?: boolean } = {}
        ) {
            const q = current();
            const fixed = target.fixedQuery || '';
            const withFixed = fixed && q.indexOf(fixed) < 0 ? join([fixed, q]) : q;
            if (opts.all) return withFixed;
            let list = parts(opts.fixed ? withFixed : q);
            if (!(opts.orderBy || opts.orderby)) list = list.filter((p) => !isOrder(p));
            if (!opts.groupBy) list = list.filter((p) => !isGroup(p));
            return join(list);
        },
        getTableName: () => target.table,
        getTitle: () => target.title || '',
        getView: () => target.view || '',
        getOrderBy: () =>
            orderOf(current())
                .map((p) => p.replace(/^ORDERBY(DESC)?/, ''))
                .join(','),
        getGroupBy: () =>
            groupOf(current())
                .map((p) => p.replace(/^GROUPBY/, ''))
                .join(','),
        refresh() {
            apply(join(conditions(current()).concat(groupOf(current()))));
        },
        refreshWithOrderBy() {
            apply(current());
        },
        sort(column: string) {
            if (!column) return;
            if (target.sort) target.sort(column, false);
            else apply(join(conditions(current()).concat('ORDERBY' + column)));
        },
        sortDescending(column: string) {
            if (!column) return;
            if (target.sort) target.sort(column, true);
            else apply(join(conditions(current()).concat('ORDERBYDESC' + column)));
        },
        setFilter(filter: string, saveOrderBy = false, saveGroupBy = false) {
            if (filter == null) return;
            const next = parts(filter);
            const keepOrder = saveOrderBy ? next.filter(isOrder) : orderOf(current());
            const keepGroup = saveGroupBy ? next.filter(isGroup) : groupOf(current());
            pending = join(
                next
                    .filter((p) => !isOrder(p) && !isGroup(p))
                    .concat(keepOrder)
                    .concat(keepGroup)
            );
        },
        setFilterAndRefresh(filter: string) {
            g_list.setFilter(filter, true, true);
            g_list.refreshWithOrderBy();
        },
        setGroupBy(groupBy: string) {
            if (groupBy == null) return;
            pending = join(
                conditions(current())
                    .concat(orderOf(current()))
                    .concat(groupBy ? ['GROUPBY' + groupBy] : [])
            );
        },
        setOrderBy(orderBy: string) {
            if (orderBy == null) return;
            const order = parts(orderBy).map((p) => (isOrder(p) ? p : 'ORDERBY' + p));
            pending = join(conditions(current()).concat(order).concat(groupOf(current())));
        },
        setRowsPerPage(rows: number) {
            if (target.setPageSize) target.setPageSize(Number(rows));
        },
        isUserList: () => warn('isUserList'),
        setFirstRow: () => warn('setFirstRow'),
        showHideGroups: () => warn('showHideGroups'),
        showHideList: () => warn('showHideList'),
        toggleList: () => warn('toggleList'),
        toggleListNoPref: () => warn('toggleListNoPref'),
    };
    return g_list;
}

export type ListScriptEnvironment = {
    g_list: any;
    g_user: any;
    errors: ScriptError[];
    /**
     * Run a list script: compiles `script` in the client-script sandbox (window, document, jQuery…
     * = null) and calls `fnName` (default onClick; a script without that function runs as a body).
     */
    run: (name: string, script: string, fnName?: string) => Promise<unknown>;
};

/**
 * The list scripting environment: g_list, g_user, GlideAjax, GlideRecord (async), g_modal,
 * getMessage, g_navigation / g_aw.openRecord. Script errors are reported (onError, errors) and never
 * break the list.
 */
export function createListScriptEnvironment(options: {
    list: GListTarget;
    user: ScriptUser;
    onError?: (e: ScriptError) => void;
    openRecord?: (table: string, sysId: string, params?: Record<string, unknown>) => void;
    navigate?: (url: string, target?: string) => void;
    messages?: Record<string, string>;
}): ListScriptEnvironment {
    const errors: ScriptError[] = [];
    let current = '';
    const report = (script: string, kind: string, e: unknown) => {
        const err: ScriptError = { script, kind, message: String((e && (e as Error).message) || e), at: Date.now() };
        errors.push(err);
        // eslint-disable-next-line no-console
        console.error(`[client script] ${kind} "${script}": ${err.message}`, e);
        if (options.onError) options.onError(err);
    };
    const wrap = <F extends (...a: any[]) => any>(fn: F): F => {
        const owner = current || 'callback';
        return ((...args: any[]) => {
            try {
                return fn(...args);
            } catch (e) {
                report(owner, 'callback', e);
                return undefined;
            }
        }) as unknown as F;
    };
    const messages = options.messages || {};
    const getMessage = (k: string) => (k in messages ? messages[k] : String(k));
    const openRecord = (table: string, sysId: string, params?: Record<string, unknown>) => {
        if (options.openRecord) options.openRecord(table, sysId, params);
        else window.open(`/${encodeURIComponent(table)}.do?sys_id=${encodeURIComponent(sysId)}`, '_blank', 'noopener');
    };
    const g_list = createGList(options.list);
    const g_user = createGUser(options.user);
    const api: Record<string, unknown> = {
        g_list,
        g_user,
        g_scratchpad: {},
        GlideAjax: createGlideAjaxClass({ wrap }),
        GlideRecord: createGlideRecordClass({ wrap }),
        getMessage,
        getMessages: (keys: string[], cb?: (m: Record<string, string>) => void) => {
            const out: Record<string, string> = {};
            (keys || []).forEach((k) => (out[k] = getMessage(k)));
            if (typeof cb === 'function') wrap(cb)(out);
            return out;
        },
        g_modal: createGModal(wrap),
        g_aw: { openRecord, closeRecord: () => {}, setTabLabel: () => {} },
        g_navigation: {
            open: (url: string, target?: string) =>
                options.navigate ? options.navigate(url, target) : window.open(url, target || '_self'),
            openRecord,
        },
        g_i18n: { getMessage },
    };
    return {
        g_list,
        g_user,
        errors,
        run(name, script, fnName = 'onClick') {
            const prev = current;
            current = name;
            try {
                const exportsOf = compileScript(script, [fnName]);
                const fn = exportsOf(api)[fnName];
                return Promise.resolve(typeof fn === 'function' ? fn() : undefined);
            } catch (e) {
                report(name, fnName, e);
                return Promise.resolve(undefined);
            } finally {
                current = prev;
            }
        },
    };
}
