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
//   POST /api/x_312987_portal/rp/instances/initialize  { portal, page, instances: [ids] }
//        -> { instances: { [id]: { ok, data, options, error? } } }
//   POST /api/x_312987_portal/rp/instances/{id}/execute  { portal, page, action, input | data }
//        action: 'get' (returns data) | 'update' (replaces data) | 'initialize' (refresh)
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

/**
 * Scripted REST call against `base`: session cookie + X-UserToken, { result: { data } } unwrapped,
 * errors thrown as ApiError with status, code and details. Studio uses it with STUDIO_API_BASE.
 */
export async function requestAt(base, method, path, body) {
	const response = await fetch(base + path, {
		method,
		credentials: 'same-origin',
		headers: headers(body !== undefined),
		body: body !== undefined ? JSON.stringify(body) : undefined
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
		const message =
			(err && (err.message || err.detail)) || `${method} ${path} failed: HTTP ${response.status}`;
		const apiError = new ApiError(message, (err && err.status) || response.status, json);
		apiError.code = err && err.code;
		apiError.details = err && err.details;
		throw apiError;
	}
	if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
		throw new ApiError(`${method} ${path}: response has no { data } envelope`, response.status, json);
	}
	return envelope.data;
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
export function initializeInstances(portal, page, instances) {
	const body = { portal, page: page || '', instances: instances || [] };
	if (useMock) return mock.initializeInstances(body);
	return request('POST', '/instances/initialize', body);
}

/** body = { portal, page, action: 'get'|'update'|'initialize', input?, data? } -> data */
export function executeInstance(instanceId, body) {
	if (useMock) return mock.executeInstance(instanceId, body);
	return request('POST', `/instances/${encodeURIComponent(instanceId)}/execute`, body || {});
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
