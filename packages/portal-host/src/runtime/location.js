// Property adapter (spec §8.1): turns the raw host properties UI Builder hands us into one
// normalized location. Everything else in the host reads the normalized form only.
//
// Platform quirks handled here:
// - an absent optional URL parameter can arrive as "" or as the string "true";
// - values may arrive URL-encoded (page "orders%2F42", q "view%3Dsummary%26tab%3D2") or
//   already decoded, depending on how the URL was built;
// - a real ?query on a direct link is readable from window.location but never reaches the
//   properties, and platform navigation drops it;
// - UI Builder doesn't deliver an ABSENT optional param: Back from .../params/q/x to the same page
//   without q leaves the old q property in place. The hook re-reads window.location's
//   /params/<name>/<value> segments and drops a stale optional value (see urlParamsOf / staleness).
//
// Standard record params: `table`, `sysId` (UIB param sys_id), `view`, `query` (an encoded query),
// each also accepted packed inside `q` (q=table%3Dincident%26sys_id%3D…). Explicit params win over
// keys inside q. `recordId` (UIB param id) stays as it was; `sysId` falls back to it.

const ABSENT = new Set(['', 'true']);
// Host debug flags read from the real ?query (see api.js); never part of the portal location.
const DEBUG_KEYS = ['rpmock'];

/** Returns '' for absent values ("", "true", null, undefined), otherwise a trimmed string. */
export function present(value) {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    return ABSENT.has(text) ? '' : text;
}

/** decodeURIComponent that never throws and leaves undecodable text as it was. */
export function safeDecode(value) {
    if (!value || value.indexOf('%') === -1) return value;
    try {
        return decodeURIComponent(value);
    } catch (error) {
        return value;
    }
}

/** Portal-relative page path: decoded, no leading/trailing slashes. '' means the home page. */
export function normalizePage(value) {
    return safeDecode(present(value)).replace(/^\/+|\/+$/g, '');
}

/** Accepts a query string (with or without '?', encoded or not), an object or URLSearchParams. */
export function toSearchParams(value) {
    if (value instanceof URLSearchParams) return new URLSearchParams(value);
    if (value && typeof value === 'object') {
        const params = new URLSearchParams();
        Object.keys(value).forEach((key) => {
            const entry = value[key];
            if (entry === undefined || entry === null || entry === '') return;
            if (Array.isArray(entry)) entry.forEach((item) => params.append(key, String(item)));
            else params.append(key, String(entry));
        });
        return params;
    }
    let text = present(value).replace(/^\?/, '');
    // A fully encoded query string ("view%3Dsummary%26tab%3D2") has no literal '='.
    if (text && text.indexOf('=') === -1 && /%3D/i.test(text)) text = safeDecode(text).replace(/^\?/, '');
    return new URLSearchParams(text);
}

/** URLSearchParams -> plain object; repeated keys become arrays. */
export function searchParamsToObject(params) {
    const result = {};
    params.forEach((entryValue, key) => {
        if (!(key in result)) result[key] = entryValue;
        else if (Array.isArray(result[key])) result[key].push(entryValue);
        else result[key] = [result[key], entryValue];
    });
    return result;
}

/** The raw property values we care about, as plain strings, for diagnostics and comparisons. */
export function rawProperties(properties) {
    const props = properties || {};
    return {
        mode: props.mode,
        portalSlug: props.portalSlug,
        page: props.page,
        recordId: props.recordId,
        q: props.q,
        view: props.view,
        table: props.table,
        sysId: props.sysId,
        query: props.query,
    };
}

export function rawKey(properties) {
    return JSON.stringify(rawProperties(properties));
}

/** Optional host properties and the UIB URL param names they are bound to (dash-cased variants too). */
export const OPTIONAL_PARAMS = {
    // The page itself is an optional UIB param too: Back from .../params/page-id/form/… to the bare
    // portal URL (/site/sp) leaves the old pageId property behind, so it must go stale like the rest
    // ('' = the portal's home page).
    page: ['page-id', 'pageId', 'page_id'],
    q: ['q'],
    table: ['table'],
    sysId: ['sys_id', 'sys-id', 'sysId'],
    view: ['view'],
    query: ['query'],
};

/** Keys of q that are the standard record params (explicit props win over them). */
const RECORD_KEYS = { table: 'table', sys_id: 'sysId', view: 'view', query: 'query' };

/**
 * The UIB page's optional params from a URL path. UIB writes them after one `params` segment as
 * name/value pairs, dash-casing names (sys_id → sys-id, pageId → page-id):
 *   '/x/…/site/sp/params/page-id/form/table/incident/sys-id/abc' → { 'page-id': 'form', table: 'incident', 'sys-id': 'abc' }
 * A repeated `params` segment is tolerated. Values are decoded. null when the path isn't a UIB
 * route for `slug`.
 */
export function urlParamsOf(pathname, slug) {
    const path = String(pathname || '');
    if (!slug || (path.indexOf('/' + slug + '/') < 0 && !path.endsWith('/' + slug))) return null;
    const parts = path.split('/');
    const start = parts.indexOf('params');
    const out = {};
    if (start < 0) return out;
    for (let i = start + 1; i < parts.length; ) {
        if (parts[i] === 'params') {
            i += 1;
            continue;
        }
        const name = safeDecode(parts[i] || '');
        if (name) out[name] = safeDecode(parts[i + 1] || '');
        i += 2;
    }
    return out;
}

/** The first value the URL has for an optional property (any of its UIB names), or ''. */
export function urlValueOf(urlParams, name) {
    if (!urlParams || !OPTIONAL_PARAMS[name]) return '';
    for (const u of OPTIONAL_PARAMS[name]) if (urlParams[u]) return urlParams[u];
    return '';
}

/** The browser's current path, or '' (not available in every environment). */
export function readWindowPath() {
    try {
        return typeof window !== 'undefined' && window.location ? window.location.pathname || '' : '';
    } catch (error) {
        return '';
    }
}

/** The browser's current ?query, or '' (not available in every environment). */
export function readWindowSearch() {
    try {
        return typeof window !== 'undefined' && window.location ? window.location.search || '' : '';
    } catch (error) {
        return '';
    }
}

/**
 * Normalize once.
 * @param properties raw host properties
 * @param initialSearch window.location.search captured when this host instance first rendered,
 *        or '' once the properties have moved on from that first set (see usePortalLocation).
 */
export function normalizeLocation(properties, initialSearch, stale, fromUrl) {
    const raw = { ...rawProperties(properties) };
    // Optional params the URL no longer has, whose property value UIB left behind (Back).
    if (stale) Object.keys(stale).forEach((name) => stale[name] && (raw[name] = ''));
    // Optional params the URL has but the binding didn't deliver (e.g. sys-id: UIB dash-cases the
    // URL name, and a binding on `sys_id` stays empty).
    if (fromUrl)
        Object.keys(fromUrl).forEach((name) => fromUrl[name] && !present(raw[name]) && (raw[name] = fromUrl[name]));
    const mode = present(raw.mode).toLowerCase() || 'portal';
    const portalSlug = safeDecode(present(raw.portalSlug));
    const page = normalizePage(raw.page);
    const recordId = safeDecode(present(raw.recordId));
    // Studio: the initial view hint (code | pages | menus). Portals: the record view (form view).
    const viewRaw = safeDecode(present(raw.view));
    const view = mode === 'studio' ? viewRaw.toLowerCase() : viewRaw;

    // Direct-link ?query first, so the bound q property wins on duplicate keys.
    const search = toSearchParams(initialSearch || '');
    DEBUG_KEYS.forEach((key) => search.delete(key));
    const fromQ = toSearchParams(raw.q);
    const fromQKeys = new Set();
    fromQ.forEach((value, key) => fromQKeys.add(key));
    fromQKeys.forEach((key) => search.delete(key));
    fromQ.forEach((value, key) => search.append(key, value));
    const qParams = searchParamsToObject(search);

    // Standard record params: explicit property, else the key packed inside q.
    const fromQRecord = (key) => {
        const v = qParams[key];
        return Array.isArray(v) ? String(v[0] || '') : v === undefined ? '' : String(v);
    };
    const table = safeDecode(present(raw.table)) || fromQRecord('table');
    const sysId = safeDecode(present(raw.sysId)) || fromQRecord('sys_id') || recordId;
    const recordView = (mode === 'studio' ? '' : view) || fromQRecord('view');
    const query = safeDecode(present(raw.query)) || fromQRecord('query');

    // Every q key plus the explicit params (explicit win), as strings / string arrays.
    const params = { ...qParams };
    if (table) params.table = table;
    if (sysId) params.sys_id = sysId;
    if (recordView) params.view = recordView;
    if (query) params.query = query;

    return {
        mode,
        portalSlug,
        page,
        isHome: page === '',
        recordId,
        view: mode === 'studio' ? view : recordView,
        table,
        sysId,
        query,
        q: search.toString(),
        /** The q keys only (the router's search). */
        qParams,
        /** q keys + explicit table / sys_id / view / query (explicit win). */
        params,
        initialSearch: initialSearch || '',
        raw,
    };
}

/** The server-call context for a location: { params, recordId } (strings only). */
export function requestContextOf(location) {
    if (!location) return { params: {}, recordId: '' };
    return { params: location.params || {}, recordId: location.recordId || '' };
}

/**
 * Which optional params are stale: the URL (a UIB route for this portal) lacks them, while the
 * property still holds a value that did NOT just change (`fresh(name)` → true when it changed
 * moments ago and the URL may not have caught up). Returns { name: true } or null.
 */
export function staleParams(properties, fresh, urlParams) {
    if (!urlParams) return null;
    const raw = rawProperties(properties);
    if (present(raw.mode).toLowerCase() === 'studio') return null;
    let out = null;
    Object.keys(OPTIONAL_PARAMS).forEach((name) => {
        const value = present(raw[name]);
        if (!value) return;
        const inUrl = OPTIONAL_PARAMS[name].some((u) => urlParams[u] !== undefined && urlParams[u] !== '');
        if (inUrl || (fresh && fresh(name))) return;
        out = out || {};
        out[name] = true;
    });
    return out;
}

/** True when two normalized locations point at the same place (used for loop safety). */
export function sameLocation(a, b) {
    return (
        !!a &&
        !!b &&
        a.portalSlug === b.portalSlug &&
        a.page === b.page &&
        a.recordId === b.recordId &&
        a.q === b.q &&
        a.table === b.table &&
        a.sysId === b.sysId &&
        a.view === b.view &&
        a.query === b.query
    );
}
