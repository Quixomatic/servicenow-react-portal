// useNavigation(key = 'primary'): a portal menu, resolved once for every header / sidebar variant.
//
// Returns { items: NavItem[], activePath: NavItem[] (root → active, for breadcrumbs),
//           active: NavItem | null, menu: { key, name } | null, path,
//           source: 'menu' | 'navigation' | 'pages' | 'none' }
//
// NavItem = { id, type: 'page'|'route'|'url'|'group'|'separator', label, icon?, badge?, tooltip?,
//             to?, href?, target?, match?, active, open?, children: NavItem[], tint?,
//             recordId?, q?, portalSlug?, table?, sysId?, view?, query?, link?, attrs }
//   `link` is the <Link {...item.link}> props for route/page items ({ to, recordId, q, portalSlug,
//   table, sysId, view, query }
//   plus `data-rp-nav-item`). `attrs` ({ 'data-rp-nav-item': id }) goes on any other element that
//   renders the item (url anchors, group triggers): Studio's Menus preview selects items by it.
//
// Source:
//   1. bootstrap.menus[key] (menu records, resolved per user by the server)       → 'menu'
//   2. primary only: portal.navigation (navigation_json, deprecated)             → 'navigation'
//   3. primary only: every page without route parameters                         → 'pages'
//   Other keys without a menu record are empty ('none'), so a footer or account slot shows
//   nothing rather than repeating the primary navigation.
// Legacy navigation entries:
//   { label, to | page, recordId?, q?, portalSlug?, icon?, badge?, tooltip? }   → 'route'
//   { label, href, target? }                                                   → 'url'
//   { label, icon?, children | items: [...], open? }                           → 'group'
//   { type: 'separator' }                                                      → 'separator'
//
// Active: the route item whose resolved path equals the current page path, else the one whose
// path is the longest prefix of it (orders → active on orders/42); items with match 'exact' are
// only active on their own path. Explicit record params (table / sysId / view / query, from menu
// params_json.record) must all equal the location's for the item to be active, so two items on
// one page (list?table=incident… and list?table=sc_req_item…) highlight apart; among items on the
// same path the one with the most matching record params, then matching q keys, wins (an item
// without params is the fallback). At most one leaf is active; its ancestor groups are active and
// open. Leaves without a tint get chart-1…chart-5 by position (menu records have no tint).
//
// MenuPreviewContext (internal, Studio's Menus preview): { [key]: NavItem[] } replaces the
// bootstrap menus for those keys, so the preview renders unsaved-free, role-filtered trees live.
import { createContext, useContext, useMemo } from 'react';
import { PortalContext, usePortal } from './contexts';
import { resolvePath } from '#/portal/router';

export const MenuPreviewContext = createContext(null);

function clean(path) {
	return String(path === undefined || path === null ? '' : path).replace(/^\/+|\/+$/g, '');
}

const TYPES = ['page', 'route', 'url', 'group', 'separator'];
const TINTS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

function normalize(raw, id, portal, leaves) {
	if (!raw || typeof raw !== 'object') return null;
	const children = Array.isArray(raw.children) ? raw.children : Array.isArray(raw.items) ? raw.items : null;
	const href = raw.href || raw.url;
	const external = !!href && /^(https?:)?\/\/|^mailto:|^tel:/i.test(String(href));
	let type = TYPES.indexOf(raw.type) >= 0 ? raw.type : children ? 'group' : external ? 'url' : 'route';
	const itemId = String(raw.id || id);
	const base = {
		id: itemId,
		type,
		label: String(raw.label || raw.title || raw.name || ''),
		icon: raw.icon ? String(raw.icon) : undefined,
		badge: raw.badge !== undefined && raw.badge !== null && raw.badge !== '' ? String(raw.badge) : undefined,
		tooltip: raw.tooltip ? String(raw.tooltip) : undefined,
		// Optional accent for icon tiles (e.g. 'chart-1'…'chart-5'); widgets may ignore it.
		tint: raw.tint ? String(raw.tint) : undefined,
		active: false,
		attrs: { 'data-rp-nav-item': itemId },
		children: []
	};
	if (type === 'separator') return base;
	if (type === 'group') {
		base.children = (children || []).map((c, i) => normalize(c, `${base.id}.${i}`, portal, leaves)).filter(Boolean);
		base.open = raw.open !== undefined ? !!raw.open : raw.defaultOpen !== false;
		return base;
	}
	leaves.all.push(base);
	if (type === 'url') {
		base.href = String(href || '');
		base.target = raw.target === '_self' ? '_self' : '_blank';
		return base;
	}
	const to = clean(raw.to !== undefined ? raw.to : raw.page !== undefined ? raw.page : raw.path !== undefined ? raw.path : raw.route);
	const portalSlug = raw.portalSlug ? String(raw.portalSlug) : undefined;
	const recordId = raw.recordId !== undefined && raw.recordId !== null && raw.recordId !== '' ? String(raw.recordId) : undefined;
	const q = raw.q || undefined;
	const str = (v) => (v === undefined || v === null || v === '' ? undefined : String(v));
	const record = { table: str(raw.table), sysId: str(raw.sysId !== undefined ? raw.sysId : raw.sys_id), view: str(raw.view), query: str(raw.query) };
	base.to = to;
	base.target = raw.target === '_blank' ? '_blank' : '_self';
	base.match = raw.match === 'exact' ? 'exact' : 'prefix';
	base.recordId = recordId;
	base.q = q;
	base.portalSlug = portalSlug;
	Object.keys(record).forEach((k) => {
		if (record[k] !== undefined) base[k] = record[k];
	});
	base.link = { to, recordId, q, portalSlug, ...record, 'data-rp-nav-item': itemId };
	// Resolved page path for matching (cross-portal links never match).
	leaves.routes.push({ item: base, path: portalSlug ? null : resolvePath(portal, to) });
	return base;
}

function fromPages(pages) {
	return (pages || [])
		.filter((p) => p && p.route && p.route.indexOf(':') === -1 && p.route.indexOf('*') === -1)
		.map((p) => ({ type: 'page', id: p.id, label: p.title || p.name || '/' + p.route, to: p.route }));
}

const RECORD_KEYS = ['table', 'sysId', 'view', 'query'];

/** -1 when an explicit record param differs from the location's, else a specificity score. */
function paramScore(item, loc) {
	let score = 0;
	for (const k of RECORD_KEYS) {
		if (item[k] === undefined) continue;
		if (!loc || String(loc[k] || '') !== item[k]) return -1;
		score += 100;
	}
	const q = item.q && typeof item.q === 'object' ? item.q : null;
	const have = (loc && loc.qParams) || {};
	if (q) Object.keys(q).forEach((k) => {
		if (String(have[k] === undefined ? '' : have[k]) === String(q[k])) score += 1;
	});
	return score;
}

function findActive(leaves, current, loc) {
	let best = null;
	let bestScore = -1;
	let bestLen = -1;
	leaves.forEach((l) => {
		if (l.path === null) return;
		const score = paramScore(l.item, loc);
		if (score < 0) return;
		if (l.path === current) {
			if (bestLen !== Infinity || score > bestScore) {
				best = l.item;
				bestLen = Infinity;
				bestScore = score;
			}
		} else if (bestLen !== Infinity && l.item.match !== 'exact' && l.path && current.indexOf(l.path + '/') === 0 && l.path.length > bestLen) {
			best = l.item;
			bestLen = l.path.length;
			bestScore = score;
		}
	});
	return best;
}

function pathTo(items, target, parents) {
	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		if (item === target) return parents.concat(item);
		if (item.children.length) {
			const found = pathTo(item.children, target, parents.concat(item));
			if (found) return found;
		}
	}
	return null;
}

export function useNavigation(key) {
	const menuKey = key || 'primary';
	const ctx = useContext(PortalContext);
	const preview = useContext(MenuPreviewContext);
	const api = usePortal();
	const current = api ? api.path : '';
	// The location's record params and q keys decide between items on the same page.
	const loc = api ? api.location : null;
	const navigation = ctx && ctx.portal ? ctx.portal.navigation : null;
	// Menu records (bootstrap.menus[key]: NavItem[] or { name, items }) win over navigation_json.
	const menus = ctx ? ctx.menus : null;
	const previewEntry = preview && Object.prototype.hasOwnProperty.call(preview, menuKey) ? preview[menuKey] : undefined;
	const menuEntry = previewEntry !== undefined ? previewEntry : menus && typeof menus === 'object' ? menus[menuKey] : undefined;
	const pages = ctx ? ctx.pages : null;
	const portal = ctx ? ctx.portal : null;

	return useMemo(() => {
		const fromMenu = Array.isArray(menuEntry) ? menuEntry : menuEntry && Array.isArray(menuEntry.items) ? menuEntry.items : null;
		const primary = menuKey === 'primary';
		const legacy = primary && Array.isArray(navigation) && navigation.length > 0;
		const source = fromMenu ? 'menu' : legacy ? 'navigation' : primary ? 'pages' : 'none';
		const raw = fromMenu || (legacy ? navigation : primary ? fromPages(pages) : []);
		const leaves = { routes: [], all: [] };
		const items = raw.map((r, i) => normalize(r, `${menuKey}.${i}`, portal, leaves)).filter(Boolean);
		leaves.all.forEach((item, i) => {
			if (!item.tint) item.tint = TINTS[i % TINTS.length];
		});
		const active = findActive(leaves.routes, current || resolvePath(portal, ''), loc);
		const activePath = active ? pathTo(items, active, []) || [active] : [];
		activePath.forEach((item) => {
			item.active = true;
			if (item.type === 'group') item.open = true;
		});
		return {
			items,
			activePath,
			active,
			source,
			menu: fromMenu
				? { key: menuKey, name: (menuEntry && !Array.isArray(menuEntry) && menuEntry.name) || menuKey }
				: legacy
					?{ key: menuKey, name: (portal && portal.name) || menuKey }
					: null,
			path: current
		};
	}, [navigation, menuEntry, pages, portal, current, menuKey, loc]);
}
