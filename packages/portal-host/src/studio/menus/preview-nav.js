// Client-side resolution of a menu's item records into the NavItem tree the portal widgets read
// (useNavigation), for Studio's live preview. Mirrors the server's resolveItem
// (src/server/runtime/menu-service.ts) with one approximation: condition scripts are not run.
//
// viewAs:
//   'all'    every active item (empty groups stay, so new groups are visible while building)
//   'none'   a user with no roles: items with roles are dropped
//   '<role>' a user with exactly that role
// hidden (View as user): { portal, pages: Set, items: Set } from the server's user-criteria verdicts;
// those items, and page items of those pages, drop like at runtime.
// Filtered views (a role or a user) drop empty groups and tidy separators, like the server.

/** Fill a page route pattern with params; a sample value when a param is missing (preview only). */
function fillRoute(pattern, params) {
	if (!pattern) return '';
	return String(pattern)
		.split('/')
		.map((seg) => {
			if (seg === '*') return params['*'] || '';
			if (seg.charAt(0) === ':') return encodeURIComponent(params[seg.substring(1)] || 'sample');
			return seg;
		})
		.filter((s) => s !== '')
		.join('/');
}

function splitRoute(route) {
	const raw = String(route || '').trim();
	const qi = raw.indexOf('?');
	const q = {};
	if (qi >= 0) {
		new URLSearchParams(raw.substring(qi + 1)).forEach((v, k) => {
			if (k) q[k] = v;
		});
	}
	return { to: (qi >= 0 ? raw.substring(0, qi) : raw).replace(/^\/+|\/+$/g, ''), q };
}

function allowed(item, viewAs) {
	if (viewAs === 'all') return true;
	const roles = item.roles || [];
	if (!roles.length) return true;
	if (viewAs === 'none') return false;
	return roles.indexOf(viewAs) >= 0;
}

function resolve(item, ctx, depth) {
	if (depth > 4 || item.active === false) return null;
	if (!allowed(item, ctx.viewAs)) return null;
	if (ctx.hidden && ctx.hidden.items.has(item.id)) return null;
	if (ctx.hidden && item.type === 'page' && ctx.hidden.pages.has(item.pageId || (item.page && item.page.id))) return null;
	if (item.type === 'dynamic') return null; // phase 2 on the server too
	const nav = { id: item.id, type: item.type, label: item.label || (item.page && item.page.title) || '', children: [] };
	if (item.icon) nav.icon = item.icon;
	if (item.badge) nav.badge = item.badge;
	if (item.tooltip) nav.tooltip = item.tooltip;
	if (item.type === 'separator') return nav;
	if (item.type === 'group') {
		nav.children = resolveList(item.children || [], ctx, depth + 1);
		if (ctx.filtering && !nav.children.some((c) => c.type !== 'separator')) return null;
		nav.open = !item.collapsed;
		return nav;
	}
	if (item.type === 'url') {
		if (!item.url) return !ctx.filtering ? { ...nav, href: '#', target: '_blank' } : null;
		nav.href = item.url;
		nav.target = item.target === '_self' ? '_self' : '_blank';
		return nav;
	}
	const params = (item.params && item.params.params) || {};
	if (item.type === 'page') {
		if (!item.page) return null;
		nav.to = fillRoute(item.page.route, params);
		const query = (item.params && item.params.query) || {};
		if (Object.keys(query).length) nav.q = { ...query };
	} else {
		const r = splitRoute(item.route);
		nav.to = r.to;
		if (Object.keys(r.q).length) nav.q = r.q;
		const portal = item.params && typeof item.params.portal === 'string' ? item.params.portal : '';
		if (portal && portal !== ctx.portalSlug) nav.portalSlug = portal;
	}
	nav.match = item.match === 'exact' ? 'exact' : 'prefix';
	if (item.target === '_blank') nav.target = '_blank';
	return nav;
}

function resolveList(items, ctx, depth) {
	const out = [];
	(items || []).forEach((item) => {
		const nav = resolve(item, ctx, depth);
		if (!nav) return;
		if (ctx.filtering && nav.type === 'separator' && (!out.length || out[out.length - 1].type === 'separator')) return;
		out.push(nav);
	});
	if (ctx.filtering) while (out.length && out[out.length - 1].type === 'separator') out.pop();
	return out;
}

/** MenuDto → NavItem[] for the preview. */
export function previewNav(menu, { viewAs, portalSlug, hidden }) {
	if (!menu) return [];
	const v = viewAs || 'all';
	if (hidden && hidden.portal) return [];
	return resolveList(menu.items || [], { viewAs: v, portalSlug, hidden: hidden || null, filtering: v !== 'all' || !!hidden }, 0);
}

/** Every role named by a menu's items (for the "View as" switch). */
export function rolesOf(menu) {
	const seen = {};
	const walk = (items) =>
		(items || []).forEach((it) => {
			(it.roles || []).forEach((r) => (seen[r] = true));
			walk(it.children);
		});
	if (menu) walk(menu.items);
	return Object.keys(seen).sort();
}

/** Items with a condition script (the preview doesn't run them). */
export function conditionCount(menu) {
	let n = 0;
	const walk = (items) =>
		(items || []).forEach((it) => {
			if (it.condition && String(it.condition).trim()) n += 1;
			walk(it.children);
		});
	if (menu) walk(menu.items);
	return n;
}
