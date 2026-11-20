// All server access for the host goes through this module. One switch picks the source:
// the mock (in-browser data and widget sources) or the real scripted REST API in
// x_312987_portal. Swapping mock for real is `USE_MOCK_BY_DEFAULT = false` (or ?rpmock=0).
//
// Contract (scripted REST): responses are { result: { data, meta } }. Requests send the session
// cookie (credentials: same-origin) and X-UserToken: window.g_ck.
//   GET  /api/x_312987_portal/rp/portals/{slug}/bootstrap
//        -> { portal, release, theme, layout, regions, pages }
//   POST /api/x_312987_portal/rp/pages/resolve  { portal, page }
//        -> { page, layout, regions }
//   POST /api/x_312987_portal/rp/instances/initialize  { portal, page, instances: [id | embed] }
//        embed = { id, placement, path: [uniqueId…], keys?, options?, token? }  (embedded widgets)
//        -> { instances: { [id]: { ok, data, options, error?, token? } } }
//   POST /api/x_312987_portal/rp/instances/{id}/execute  { portal, page, action, input, embed? }
//        action: 'get' (returns data) | 'update' (replaces data) | 'initialize' (refresh)
//        embed = { path, keys, options, token }: run the embedded instance below placement {id}
// Errors: non-2xx with { result: { error: { status, code, message }, meta } }.
// ComponentRef = { id, uniqueId, kind, build: { id, js, css } | null, serverMode, regions? }
// PlacementRef = { id, region, order, component: ComponentRef, options }
import * as mock from './mock';

const USE_MOCK_BY_DEFAULT = false; // backend is live; ?rpmock=1 forces the mock
export const API_BASE = '/api/x_312987_portal/rp';

function readFlag() {
    try {
        const fromUrl = new URLSearchParams(window.location.search).get('rpmock');
        if (fromUrl === '0' || fromUrl === 'false') return false;
        if (fromUrl === '1' || fromUrl === 'true') return true;
        const stored = window.localStorage && window.localStorage.getItem('rpmock');
        if (stored === '0') return false;
        if (stored === '1') return true;
    } catch (error) {
        /* no window / storage */
    }
    return USE_MOCK_BY_DEFAULT;
}

// Read once per page load: platform navigation drops the real ?query afterwards.
const useMock = readFlag();

export function isMock() {
    return useMock;
}

/** Persist the source choice for this browser (takes effect on reload). */
export function setMockPreference(value) {
    try {
        window.localStorage.setItem('rpmock', value ? '1' : '0');
    } catch (error) {
        /* ignore */
    }
}

export class ApiError extends Error {
    constructor(message, status, detail) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.detail = detail;
    }
}

function headers(hasBody) {
    const result = { Accept: 'application/json' };
    if (typeof window !== 'undefined' && window.g_ck) result['X-UserToken'] = window.g_ck;
    if (hasBody) result['Content-Type'] = 'application/json';
    return result;
}

async function request(method, path, body) {
    return requestAt(API_BASE, method, path, body);
}

export const STUDIO_API_BASE = '/api/x_312987_portal/rp_studio';

// Messages server scripts raise (gs.addInfoMessage / addErrorMessage, $sp.add*Message) arrive in
// the envelope's meta.messages (or error.details.messages); the portal shows them as toasts.
let serverMessageSink = null;
export function setServerMessageSink(fn) {
    serverMessageSink = fn;
}
export function emitServerMessages(messages) {
    if (serverMessageSink && Array.isArray(messages) && messages.length) serverMessageSink(messages);
}

/**
 * Scripted REST call against `base`: session cookie + X-UserToken, { result: { data } } unwrapped,
 * errors thrown as ApiError with status, code and details. Studio uses it with STUDIO_API_BASE.
 */
export async function requestAt(base, method, path, body) {
    return (await requestEnvelopeAt(base, method, path, body)).data;
}

/** requestAt, resolving to the whole envelope ({ data, options?, meta }). */
export async function requestEnvelopeAt(base, method, path, body) {
    const response = await fetch(base + path, {
        method,
        credentials: 'same-origin',
        headers: headers(body !== undefined),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (error) {
        /* not JSON */
    }
    const envelope = json && typeof json === 'object' && 'result' in json ? json.result : json;
    if (!response.ok) {
        const err = (envelope && envelope.error) || (json && json.error) || null;
        const message = (err && (err.message || err.detail)) || `${method} ${path} failed: HTTP ${response.status}`;
        const apiError = new ApiError(message, (err && err.status) || response.status, json);
        apiError.code = err && err.code;
        apiError.details = err && err.details;
        const meta = (envelope && envelope.meta) || (json && json.meta) || null;
        apiError.correlationId = (meta && meta.correlationId) || null;
        emitServerMessages(err && err.details && err.details.messages);
        throw apiError;
    }
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
        throw new ApiError(`${method} ${path}: response has no { data } envelope`, response.status, json);
    }
    if (envelope.meta) emitServerMessages(envelope.meta.messages);
    return envelope;
}

export function getBootstrap(slug) {
    if (useMock) return mock.getBootstrap(slug);
    return request('GET', `/portals/${encodeURIComponent(slug)}/bootstrap`);
}

export function resolvePage(portal, page) {
    if (useMock) return mock.resolvePage(portal, page);
    return request('POST', '/pages/resolve', { portal, page: page || '' });
}

/** Batch init for on-load placements: -> { instances: { [id]: { ok, data, options, error? } } } */
export function initializeInstances(portal, page, instances, context) {
    const body = { portal, page: page || '', instances: instances || [] };
    if (context) body.context = context;
    if (useMock) return mock.initializeInstances(body);
    return request('POST', '/instances/initialize', body);
}

/** body = { portal, page, action: 'get'|'update'|'initialize', input?, data? } -> data */
export function executeInstance(instanceId, body) {
    if (useMock) return mock.executeInstance(instanceId, body);
    return request('POST', `/instances/${encodeURIComponent(instanceId)}/execute`, body || {});
}

/** executeInstance resolving to { data, options, meta } (embedded-widget models need the options). */
export function executeInstanceEnvelope(instanceId, body) {
    if (useMock)
        return mock
            .executeInstance(instanceId, body)
            .then((data) => ({ data, options: (body && body.embed && body.embed.options) || {}, meta: {} }));
    return requestEnvelopeAt(API_BASE, 'POST', `/instances/${encodeURIComponent(instanceId)}/execute`, body || {});
}

/** Text of an asset (theme or widget CSS). Mock assets are served from memory. */
export async function fetchText(url) {
    const local = mock.assetText(url);
    if (local !== undefined) return local;
    const response = await fetch(url, { credentials: 'same-origin', headers: assetHeaders('text/css,*/*') });
    if (!response.ok) throw new ApiError(`GET ${url} failed: HTTP ${response.status}`, response.status);
    return response.text();
}

/**
 * Headers for fetching a runtime asset. The asset API is scripted REST, which rejects
 * session-cookie requests without X-UserToken; that's why assets are fetched (with the token)
 * and loaded from memory instead of via a plain import() / <link>.
 */
export function assetHeaders(accept) {
    const result = { Accept: accept };
    if (typeof window !== 'undefined' && window.g_ck) result['X-UserToken'] = window.g_ck;
    return result;
}

/** True for same-origin scripted REST URLs, which need X-UserToken (so no direct import()). */
export function needsToken(url) {
    return typeof url === 'string' && url.indexOf('/api/') === 0;
}

// ---- Service Portal-style utilities (runtime/sp-utils.js) ------------------------------------

/** GET /properties?portal=&names= → { name: value | null } (only exposed / public properties). */
export function getProperties(portal, names) {
    if (useMock) return mock.getProperties(portal, names);
    const qs = `?portal=${encodeURIComponent(portal || '')}&names=${names.map(encodeURIComponent).join(',')}`;
    return request('GET', `/properties${qs}`).then((data) => (data && data.values) || {});
}

/** POST /messages { keys } → { key: translated } (gs.getMessage in the user's language). */
export function getMessages(keys) {
    if (useMock) return mock.getMessages(keys);
    return request('POST', '/messages', { keys }).then((data) => (data && data.messages) || {});
}

/** Standard request headers for same-origin REST calls from widgets. */
export function getHeaders() {
    return headers(true);
}

/**
 * fetch() for same-origin JSON endpoints: session cookie + X-UserToken, JSON body in, parsed JSON
 * out. Throws an ApiError with the ServiceNow error message on a non-2xx status.
 */
export async function fetchJson(url, init) {
    const options = init || {};
    const target = new URL(url, window.location.origin);
    if (target.origin !== window.location.origin)
        throw new ApiError(`fetchJson only calls same-origin URLs (got ${target.origin})`, 0);
    const hasBody = options.body !== undefined && options.body !== null;
    const body =
        hasBody && typeof options.body !== 'string' && !(options.body instanceof FormData)
            ? JSON.stringify(options.body)
            : options.body;
    const response = await fetch(target.toString(), {
        ...options,
        credentials: 'same-origin',
        headers: { ...headers(hasBody), ...(options.headers || {}) },
        body,
    });
    const text = await response.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (error) {
        /* not JSON */
    }
    if (!response.ok) {
        const err = (json && json.result && json.result.error) || (json && json.error) || null;
        const message =
            (err && (err.message || err.detail)) || `${options.method || 'GET'} ${url} failed: HTTP ${response.status}`;
        const apiError = new ApiError(message, response.status, json);
        apiError.code = err && err.code;
        throw apiError;
    }
    return json;
}

/** Table API (/api/now/table): the platform's ACLs apply. Returns `result`. */
export function tableApi(table, sysId, params) {
    if (useMock) return mock.tableApi(table, sysId, params);
    const qs = new URLSearchParams();
    Object.keys(params || {}).forEach((k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') qs.set(k, String(params[k]));
    });
    const path = `/api/now/table/${encodeURIComponent(table)}${sysId ? '/' + encodeURIComponent(sysId) : ''}${qs.toString() ? '?' + qs : ''}`;
    return fetchJson(path).then((json) => (json ? json.result : null));
}
