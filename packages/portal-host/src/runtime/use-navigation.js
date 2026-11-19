// useNavigation(key = 'primary'): a portal menu, resolved once for every header / sidebar variant.
//
// Returns { items: NavItem[], activePath: NavItem[] (root → active, for breadcrumbs),
//           active: NavItem | null, menu: { key, name } | null, path }
//
// NavItem = { id, type: 'page'|'route'|'url'|'group'|'separator', label, icon?, badge?, tooltip?,
//             to?, href?, target?, active, open?, children: NavItem[], tint?,
//             recordId?, q?, portalSlug?, link? }
//   `link` is the <Link {...item.link}> props for route/page items ({ to, recordId, q, portalSlug }).
//
// Source: bootstrap.menus[key] when present (menu records), else portal.navigation
// (navigation_json) for every key. Entries:
//   { label, to | page, recordId?, q?, portalSlug?, icon?, badge?, tooltip? }   → 'route'
//   { label, href, target? }                                                   → 'url'
//   { label, icon?, children | items: [...], open? }                           → 'group'
//   { type: 'separator' }                                                      → 'separator'
// With no navigation configured, every page without route parameters is listed (type 'page').
// Menu records (x_312987_portal_menu / _item) will replace the source; this shape stays.
//
// Active: the route item whose resolved path equals the current page path, else the one whose
// path is the longest prefix of it (orders → active on orders/42). At most one leaf is active;
// its ancestor groups are active and open.
import { useContext, useMemo } from 'react';
import { PortalContext, usePortal } from './contexts';
import { resolvePath } from '#/portal/router';

function clean(path) {
	return String(path === undefined || path === null ? '' : path).replace(/^\/+|\/+$/g, '');
}

const TYPES = ['page', 'route', 'url', 'group', 'separator'];

function normalize(raw, id, portal, leaves) {
	if (!raw || typeof raw !== 'object') return null;
	const children = Array.isArray(raw.children) ? raw.children : Array.isArray(raw.items) ? raw.items : null;
	const href = raw.href || raw.url;
	const external = !!href && /^(https?:)?\/\/|^mailto:|^tel:/i.test(String(href));
	let type = TYPES.indexOf(raw.type) >= 0 ? raw.type : children ? 'group' : external ? 'url' : 'route';
	const base = {
		id: String(raw.id || id),
		type,
		label: String(raw.label || raw.title || raw.name || ''),
		icon: raw.icon ? String(raw.icon) : undefined,
		badge: raw.badge !== undefined && raw.badge !== null && raw.badge !== '' ? String(raw.badge) : undefined,
		tooltip: raw.tooltip ? String(raw.tooltip) : undefined,
		// Optional accent for icon tiles (e.g. 'chart-1'…'chart-5'); widgets may ignore it.
		tint: raw.tint ? String(raw.tint) : undefined,
		active: false,
		children: []
	};
	if (type === 'separator') return base;
	if (type === 'group') {
		base.children = (children || []).map((c, i) => normalize(c, `${base.id}.${i}`, portal, leaves)).filter(Boolean);
		base.open = raw.open !== undefined ? !!raw.open : raw.defaultOpen !== false;
		return base;
	}
	if (type === 'url') {
		base.href = String(href || '');
		base.target = raw.target === '_self' ? '_self' : '_blank';
		return base;
	}
	const to = clean(raw.to !== undefined ? raw.to : raw.page !== undefined ? raw.page : raw.path !== undefined ? raw.path : raw.route);
	const portalSlug = raw.portalSlug ? String(raw.portalSlug) : undefined;
	const recordId = raw.recordId !== undefined && raw.recordId !== null && raw.recordId !== '' ? String(raw.recordId) : undefined;
	const q = raw.q || undefined;
	base.to = to;
	base.target = '_self';
	base.recordId = recordId;
	base.q = q;
	base.portalSlug = portalSlug;
	base.link = { to, recordId, q, portalSlug };
	// Resolved page path for matching (cross-portal links never match).
	leaves.push({ item: base, path: portalSlug ? null : resolvePath(portal, to) });
	return base;
}

function fromPages(pages) {
	return (pages || [])
		.filter((p) => p && p.route && p.route.indexOf(':') === -1 && p.route.indexOf('*') === -1)
		.map((p) => ({ type: 'page', id: p.id, label: p.title || p.name || '/' + p.route, to: p.route }));
}

function findActive(leaves, current) {
	let best = null;
	let bestLen = -1;
	leaves.forEach((l) => {
		if (l.path === null) return;
		if (l.path === current) {
			if (bestLen !== Infinity) {
				best = l.item;
				bestLen = Infinity;
			}
		} else if (bestLen !== Infinity && l.path && current.indexOf(l.path + '/') === 0 && l.path.length > bestLen) {
			best = l.item;
			bestLen = l.path.length;
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
	const api = usePortal();
	const current = api ? api.path : '';
	const navigation = ctx && ctx.portal ? ctx.portal.navigation : null;
	// Menu records (bootstrap.menus[key]: NavItem[] or { name, items }) win over navigation_json.
	const menus = ctx ? ctx.menus : null;
	const menuEntry = menus && typeof menus === 'object' ? menus[menuKey] : undefined;
	const pages = ctx ? ctx.pages : null;
	const portal = ctx ? ctx.portal : null;

	return useMemo(() => {
		const fromMenu = Array.isArray(menuEntry) ? menuEntry : menuEntry && Array.isArray(menuEntry.items) ? menuEntry.items : null;
		const configured = !!fromMenu || (Array.isArray(navigation) && navigation.length > 0);
		const raw = fromMenu || (configured ? navigation : fromPages(pages));
		const leaves = [];
		const items = raw.map((r, i) => normalize(r, `${menuKey}.${i}`, portal, leaves)).filter(Boolean);
		const active = findActive(leaves, current || resolvePath(portal, ''));
		const activePath = active ? pathTo(items, active, []) || [active] : [];
		activePath.forEach((item) => {
			item.active = true;
			if (item.type === 'group') item.open = true;
		});
		return {
			items,
			activePath,
			active,
			menu: fromMenu
				? { key: menuKey, name: (menuEntry && !Array.isArray(menuEntry) && menuEntry.name) || menuKey }
				: configured
					? { key: menuKey, name: (portal && portal.name) || menuKey }
					: null,
			path: current
		};
	}, [navigation, menuEntry, pages, portal, current, menuKey]);
}
