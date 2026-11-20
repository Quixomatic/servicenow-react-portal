import { authHeaders, GraphQLError, restGet, safeName } from 'utilities:app/graphql';
import type { SavedFilter } from './types';

/**
 * Saved filters: the platform's own `sys_filter` table (what the classic list's "Save filter" and
 * filter menu use), read and written as the user through the Table API, so its ACLs decide:
 *   read / write / delete your own (user = you), group filters with filter_group + membership,
 *   global filters (no user, no group) with filter_global; filter_admin manages all.
 * Nothing here elevates; a refusal comes back as an error to show.
 */

const FIELDS = 'sys_id,title,table,filter,user,group';

function str(v: any): string {
    if (v == null) return '';
    if (typeof v === 'object') return String(v.value ?? '');
    return String(v);
}
function label(v: any): string {
    if (v == null) return '';
    if (typeof v === 'object') return String(v.display_value ?? v.value ?? '');
    return String(v);
}

function toFilter(r: any, userSysId: string): SavedFilter {
    const user = str(r.user);
    const group = str(r.group);
    return {
        sysId: str(r.sys_id),
        title: label(r.title) || '(untitled)',
        table: str(r.table),
        filter: str(r.filter),
        user,
        group,
        groupName: group ? label(r.group) : '',
        scope: user && user === userSysId ? 'mine' : group ? 'group' : 'global',
    };
}

/** Saved filters of a table the user may read: their own, their groups', global ones (ACLs filter the rest). */
export async function fetchSavedFilters(
    table: string,
    userSysId: string,
    signal?: AbortSignal
): Promise<SavedFilter[]> {
    const t = safeName(table, 'table');
    const q = encodeURIComponent(
        `table=${t}^user=${userSysId}^NQtable=${t}^groupISNOTEMPTY^NQtable=${t}^userISEMPTY^groupISEMPTY^ORDERBYtitle`
    );
    const rows = await restGet<any[]>(
        `/api/now/table/sys_filter?sysparm_query=${q}&sysparm_fields=${FIELDS}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=200`,
        signal
    );
    const order = { mine: 0, group: 1, global: 2 } as const;
    return (rows || [])
        .map((r) => toFilter(r, userSysId))
        .sort((a, b) => order[a.scope] - order[b.scope] || a.title.localeCompare(b.title));
}

async function send(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<any> {
    const r = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: authHeaders(true),
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (e) {
        /* not JSON */
    }
    if (!r.ok) {
        const msg = (json && json.error && (json.error.message || json.error.detail)) || `HTTP ${r.status}`;
        throw new GraphQLError(r.status === 403 ? `You don’t have permission to do that (${msg})` : msg, r.status);
    }
    return json ? json.result : null;
}

/** Save a filter for yourself (default) or for a group you belong to (needs filter_group). */
export async function createSavedFilter(
    args: { table: string; title: string; filter: string; userSysId: string; group?: string },
    signal?: AbortSignal
): Promise<SavedFilter> {
    if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const body: Record<string, string> = {
        table: safeName(args.table, 'table'),
        title: String(args.title || '').trim(),
        filter: args.filter || '',
    };
    if (!body.title) throw new Error('Give the filter a name');
    if (args.group) body.group = args.group;
    else body.user = args.userSysId;
    const r = await send('POST', `/api/now/table/sys_filter?sysparm_fields=${FIELDS}&sysparm_display_value=all`, body);
    const saved = toFilter(r || {}, args.userSysId);
    // A field ACL may have dropped `user` (filter_admin only): the row would then be global or
    // refused. Report it instead of silently creating something else.
    if (!args.group && saved.user !== args.userSysId)
        throw new Error('The platform saved the filter without you as its owner; check the sys_filter ACLs');
    return saved;
}

export async function updateSavedFilter(
    sysId: string,
    patch: { title?: string; filter?: string },
    userSysId: string
): Promise<SavedFilter> {
    if (!/^[0-9a-f]{32}$/.test(sysId)) throw new Error('Invalid filter id');
    const r = await send(
        'PATCH',
        `/api/now/table/sys_filter/${sysId}?sysparm_fields=${FIELDS}&sysparm_display_value=all`,
        patch
    );
    return toFilter(r || {}, userSysId);
}

export async function deleteSavedFilter(sysId: string): Promise<void> {
    if (!/^[0-9a-f]{32}$/.test(sysId)) throw new Error('Invalid filter id');
    await send('DELETE', `/api/now/table/sys_filter/${sysId}`);
}
