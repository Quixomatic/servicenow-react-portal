// Property adapter (spec §8.1): turns the raw host properties UI Builder hands us into one
// normalized location. Everything else in the host reads the normalized form only.
//
// Platform quirks handled here:
// - an absent optional URL parameter can arrive as "" or as the string "true";
// - values may arrive URL-encoded (page "orders%2F42", q "view%3Dsummary%26tab%3D2") or
//   already decoded, depending on how the URL was built;
// - a real ?query on a direct link is readable from window.location but never reaches the
//   properties, and platform navigation drops it.

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
		view: props.view
	};
}

export function rawKey(properties) {
	return JSON.stringify(rawProperties(properties));
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
export function normalizeLocation(properties, initialSearch) {
	const raw = rawProperties(properties);
	const mode = present(raw.mode).toLowerCase() || 'portal';
	const portalSlug = safeDecode(present(raw.portalSlug));
	const page = normalizePage(raw.page);
	const recordId = safeDecode(present(raw.recordId));
	// Studio's initial view hint (code | pages | menus); portals ignore it.
	const view = safeDecode(present(raw.view)).toLowerCase();

	// Direct-link ?query first, so the bound q property wins on duplicate keys.
	const search = toSearchParams(initialSearch || '');
	DEBUG_KEYS.forEach((key) => search.delete(key));
	const fromQ = toSearchParams(raw.q);
	const fromQKeys = new Set();
	fromQ.forEach((value, key) => fromQKeys.add(key));
	fromQKeys.forEach((key) => search.delete(key));
	fromQ.forEach((value, key) => search.append(key, value));

	return {
		mode,
		portalSlug,
		page,
		isHome: page === '',
		recordId,
		view,
		q: search.toString(),
		query: searchParamsToObject(search),
		initialSearch: initialSearch || '',
		raw
	};
}

/** True when two normalized locations point at the same place (used for loop safety). */
export function sameLocation(a, b) {
	return !!a && !!b && a.portalSlug === b.portalSlug && a.page === b.page && a.recordId === b.recordId && a.q === b.q;
}
