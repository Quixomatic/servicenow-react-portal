// Menus API (/api/x_312987_portal/rp_studio): menus, menu items, icon search, studio context.
// Live only: on mock data the Menus activity says so instead of editing.
import { STUDIO_API_BASE, requestAt } from '#/runtime/api';

const call = (method, path, body) => requestAt(STUDIO_API_BASE, method, path, body);
const e = encodeURIComponent;

export const menusApi = {
	/** → MenuDto[] (each with its full item tree) */
	listMenus: (portalId) => call('GET', `/portals/${e(portalId)}/menus`),
	createMenu: (body) => call('POST', '/menus', body),
	updateMenu: (id, body) => call('PATCH', `/menus/${e(id)}`, body),
	deleteMenu: (id) => call('DELETE', `/menus/${e(id)}`),
	/** body: { menu, parent?, index?, type, label?, …fields } → MenuItemDto */
	createItem: (body) => call('POST', '/menu-items', body),
	/** body: fields and/or { parent, index } (a move) → MenuItemDto */
	updateItem: (id, body) => call('PATCH', `/menu-items/${e(id)}`, body),
	/** mode: undefined | 'lift' | 'cascade' (groups with children need one) */
	deleteItem: (id, mode) => call('DELETE', `/menu-items/${e(id)}${mode ? `?mode=${e(mode)}` : ''}`),
	/** → { version, names, total } */
	icons: (q, limit) => call('GET', `/icons?q=${e(q || '')}&limit=${e(limit || 120)}`)
};
