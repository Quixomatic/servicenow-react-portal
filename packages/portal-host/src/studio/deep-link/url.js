// Studio deep-link URLs (.plans/studio-deep-links.md). The UI Builder params path only, never a
// ?query string:
//   /x/312987/portal/studio/params/view/<activity>/id/<target>/q/<urlencoded k=v&k=v>
// `view` and `id` are the studio page's own params; every other key is packed inside `q`.
import { safeDecode, toSearchParams, urlParamsOf } from '#/runtime/location';

export const STUDIO_ROUTE = 'studio';

/** Accepted `view` values → the canonical URL value. */
const VIEW_ALIASES = { components: 'code', component: 'code', viewRules: 'view-rules', rules: 'view-rules' };

export function normalizeView(value) {
	const v = String(value || '').trim();
	if (!v) return '';
	return VIEW_ALIASES[v] || VIEW_ALIASES[v.toLowerCase()] || v.toLowerCase();
}

/** The studio route's base path ('/x/312987/portal/studio'), or null when this isn't the studio route. */
export function studioBase(pathname) {
	const path = String(pathname || '');
	const parts = path.split('/');
	const at = parts.indexOf(STUDIO_ROUTE);
	if (at < 1) return null;
	const next = parts[at + 1];
	if (next !== undefined && next !== '' && next !== 'params') return null;
	return parts.slice(0, at + 1).join('/');
}

/** q text (encoded or not) → { key: value } (first value wins). */
export function parseQ(text) {
	const out = {};
	toSearchParams(text || '').forEach((value, key) => {
		if (!(key in out)) out[key] = value;
	});
	return out;
}

/** { view, id, params } from a studio route path (null when it isn't one). Loose extra pairs count as q keys. */
export function parseStudioPath(pathname) {
	const base = studioBase(pathname);
	if (base === null) return null;
	const pairs = urlParamsOf(pathname, STUDIO_ROUTE) || {};
	const params = parseQ(pairs.q);
	Object.keys(pairs).forEach((name) => {
		if (name === 'view' || name === 'id' || name === 'q') return;
		if (!(name in params) && pairs[name]) params[name] = pairs[name];
	});
	return { view: normalizeView(pairs.view), id: pairs.id || '', params };
}

/** The same shape from the host's properties (local dev server, mock mode: no studio route). */
export function parseStudioProps(location) {
	const loc = location || {};
	return { view: normalizeView(loc.view), id: safeDecode(loc.recordId || ''), params: parseQ(loc.q || '') };
}

const escapeQ = (value) => String(value).replace(/[%&=+#]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/** { key: value } in the given key order (then the rest, sorted) → 'k=v&k=v' (values escaped for & = + % #). */
export function buildQ(params, order) {
	const p = params || {};
	const keys = (order || []).filter((k) => k in p).concat(Object.keys(p).filter((k) => !(order || []).includes(k)).sort());
	return keys
		.filter((k) => p[k] !== undefined && p[k] !== null && String(p[k]) !== '')
		.map((k) => escapeQ(k) + '=' + escapeQ(p[k]))
		.join('&');
}

/** base + '/params/view/…/id/…/q/…' (empty pairs dropped; base alone when nothing is set). */
export function buildStudioPath(base, state) {
	const s = state || {};
	const pairs = [];
	if (s.view) pairs.push('view', s.view);
	if (s.id) pairs.push('id', s.id);
	if (s.q) pairs.push('q', s.q);
	if (!pairs.length) return base;
	return base + '/params/' + pairs.map((x) => encodeURIComponent(x)).join('/');
}

/** Same place? (view, id and every q key compared as decoded strings.) */
export function sameStudioLocation(a, b) {
	if (!a || !b) return false;
	if (normalizeView(a.view) !== normalizeView(b.view) || String(a.id || '') !== String(b.id || '')) return false;
	const pa = a.params || {};
	const pb = b.params || {};
	const keys = new Set(Object.keys(pa).concat(Object.keys(pb)));
	for (const k of keys) if (String(pa[k] || '') !== String(pb[k] || '')) return false;
	return true;
}

/** A ServiceNow sys_id (32 hex characters). */
export const isSysId = (value) => /^[0-9a-f]{32}$/i.test(String(value || ''));
