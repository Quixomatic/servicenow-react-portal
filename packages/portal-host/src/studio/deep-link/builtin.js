// The built-in activities' deep-link entries: code editor, Pages designer, Menus.
// See registry.js for the entry shape and .plans/studio-deep-links.md for the URL table.
import * as L from '../layout';
import { PREVIEW_TAB } from '../store';
import { confirmDiscard } from '../dialogs';
import { designApi } from '../designer/designer-api';
import { findPlacement } from '../designer/designer-store';
import { menusApi } from '../menus/menus-api';
import { registerStudioLocation } from './registry';
import { isSysId } from './url';

const DEVICES = ['desktop', 'tablet', 'mobile'];
const PANELS = ['problems', 'output'];
const PREVIEWS = ['sidebar', 'header', 'footer'];
const trimSlashes = (s) => String(s || '').replace(/^\/+|\/+$/g, '');

/** The server's id resolve, '' kind on failure. */
async function resolveId(id) {
	try {
		return (await designApi.resolve(id)) || { kind: 'unknown' };
	} catch (error) {
		return { kind: 'unknown' };
	}
}

/** The activity param a resolved kind belongs to. */
export function viewOfKind(kind) {
	if (kind === 'component' || kind === 'theme') return 'code';
	if (kind === 'portal' || kind === 'page') return 'pages';
	if (kind === 'menu' || kind === 'menuItem') return 'menus';
	return '';
}

/** A portal by slug or sys_id from the (cached) portal list. */
async function findPortal(ctx, ref) {
	const list = (await ctx.portals()) || [];
	return list.find((p) => p.id === ref) || list.find((p) => p.slug === ref) || list.find((p) => String(p.slug).toLowerCase() === String(ref).toLowerCase()) || null;
}

async function defaultPortal(ctx) {
	const list = (await ctx.portals()) || [];
	return list.find((p) => p.isDefault) || list[0] || null;
}

/** 'sp:/home', 'sp:home', 'sp/home' → { slug, route }; 'sp' → { slug, route: null }. */
export function splitPortalRef(ref) {
	const text = String(ref || '');
	const colon = text.indexOf(':');
	if (colon > 0) return { slug: text.slice(0, colon), rest: text.slice(colon + 1) };
	const slash = text.indexOf('/');
	if (slash > 0) return { slug: text.slice(0, slash), rest: text.slice(slash + 1) };
	return { slug: text, rest: null };
}

// ---- code editor --------------------------------------------------------------------------

function activeFile(s) {
	const g = L.findGroup(s.layout, s.activeGroup);
	const path = g && g.active;
	return path && path !== PREVIEW_TAB ? path : '';
}

function ownerRef(s) {
	const owner = s.owner;
	if (!owner) return '';
	const comps = s.catalog.components || [];
	const themes = s.catalog.themes || [];
	if (owner.type === 'theme') {
		const t = themes.find((x) => x.id === owner.id);
		const key = (t && t.key) || owner.uniqueId;
		return key && themes.filter((x) => x.key === key).length <= 1 ? 'theme:' + key : owner.id;
	}
	const c = comps.find((x) => x.id === owner.id);
	const uid = (c && c.uniqueId) || owner.uniqueId;
	return uid && !isSysId(uid) && comps.filter((x) => x.uniqueId === uid).length <= 1 ? uid : owner.id;
}

/** A code-editor id → { type, id, name } or null (catalog first, then the server for sys_ids). */
async function findOwner(ctx, ref) {
	const { studio } = ctx;
	if (!studio.get().catalog.components) await studio.loadCatalog();
	const cat = studio.get().catalog;
	const comps = cat.components || [];
	const themes = cat.themes || [];
	const themeKey = ref.indexOf('theme:') === 0 ? ref.slice(6) : null;
	if (themeKey !== null) {
		const t = themes.find((x) => x.key === themeKey || x.id === themeKey);
		return t ? { type: 'theme', id: t.id, name: t.name } : null;
	}
	const c = comps.find((x) => x.id === ref) || comps.find((x) => x.uniqueId === ref);
	if (c) return { type: 'component', id: c.id, name: c.name };
	const t = themes.find((x) => x.id === ref) || themes.find((x) => x.key === ref);
	if (t) return { type: 'theme', id: t.id, name: t.name };
	return null;
}

registerStudioLocation({
	activity: 'components',
	param: 'code',
	aliases: ['components', 'component'],
	qKeys: ['file', 'line', 'col', 'panel', 'props'],
	serialize({ studio }) {
		const s = studio.get();
		if (!s.owner) return {};
		const file = activeFile(s);
		const main = s.owner.type === 'theme' ? 'theme.css' : 'main.tsx';
		return { id: ownerRef(s), file: file && file !== main ? file : '' };
	},
	/** Copy link adds the cursor line. */
	linkExtras({ studio }) {
		const s = studio.get();
		const file = activeFile(s);
		return file && s.cursor && s.cursor.line > 1 ? { file, line: String(s.cursor.line) } : {};
	},
	async apply(params, ctx) {
		const { studio } = ctx;
		const current = studio.get().owner;
		if (params.id) {
			let owner = await findOwner(ctx, params.id);
			if (!owner && isSysId(params.id)) {
				const r = await resolveId(params.id);
				const other = viewOfKind(r.kind);
				if (other && other !== 'code') return { view: other };
				if (r.kind === 'component' || r.kind === 'theme') owner = { type: r.kind, id: params.id, name: params.id };
			}
			if (!owner) {
				ctx.notFound(`No component or theme "${params.id}"`);
				return undefined;
			}
			if (!current || current.id !== owner.id) {
				if (current && studio.anyDirty()) {
					const choice = await confirmDiscard(studio, current.name);
					if (choice === null) return { cancelled: true };
					if (choice === 'save') await studio.save();
				}
				await studio.openOwner(owner, { navigate: false });
			}
		}
		if (!studio.get().owner) return undefined;
		const line = parseInt(params.line, 10) || 0;
		const col = parseInt(params.col, 10) || 0;
		if (params.file) {
			if (studio.get().files.some((f) => f.path === params.file)) studio.openFile(params.file, { preview: false, line: line || undefined, column: col || undefined });
			else ctx.notFound(`No file "${params.file}" in ${studio.get().owner.name}`);
		} else if (line) {
			const file = activeFile(studio.get());
			if (file) studio.revealLine(file, line, col || 1);
		}
		if (PANELS.includes(params.panel)) studio.set({ panelOpen: true, panelTab: params.panel });
		if (params.props === '1' || params.props === 'true') studio.set({ propertiesOpen: true });
		return undefined;
	},
	subscribe({ studio }, onChange) {
		return studio.subscribe(onChange);
	},
	label({ studio }) {
		const s = studio.get();
		const file = activeFile(s);
		return s.owner ? s.owner.name + (file ? ' · ' + file : '') : 'Components';
	}
});

// ---- Pages designer -----------------------------------------------------------------------

function pageRef(d) {
	const portal = d.design && d.design.portal;
	if (!portal) return d.portalId || '';
	const slug = portal.slug && !/[:/]/.test(portal.slug) ? portal.slug : '';
	if (d.node === 'portal') return slug || portal.id;
	const pages = d.design.pages || [];
	const page = pages.find((p) => p.id === d.pageId);
	if (!page) return slug || portal.id;
	const route = trimSlashes(page.route);
	const unique = pages.filter((p) => trimSlashes(p.route) === route).length === 1;
	return slug && unique ? slug + ':/' + route : page.id;
}

registerStudioLocation({
	activity: 'pages',
	param: 'pages',
	qKeys: ['placement', 'device'],
	serialize({ designer }) {
		const d = designer.get();
		if (!d.portalId) return {};
		return { id: pageRef(d), placement: d.node === 'page' ? d.selection || '' : '', device: d.device && d.device !== 'desktop' ? d.device : '' };
	},
	async apply(params, ctx) {
		const { designer } = ctx;
		let portalId = null;
		let pageId = null;
		let node = 'page';
		if (params.id && isSysId(params.id)) {
			const r = await resolveId(params.id);
			const other = viewOfKind(r.kind);
			if (other && other !== 'pages') return { view: other };
			if (r.kind === 'portal') {
				portalId = r.portalId;
				node = 'portal';
			} else if (r.kind === 'page') {
				portalId = r.portalId;
				pageId = r.pageId;
			} else ctx.notFound(`No portal or page with the id ${params.id}`);
		} else if (params.id) {
			const { slug, rest } = splitPortalRef(params.id);
			const portal = await findPortal(ctx, slug);
			if (!portal) ctx.notFound(`No portal "${slug}"`);
			else if (rest === null) {
				portalId = portal.id;
				node = 'portal';
			} else {
				portalId = portal.id;
				const design = await designApi.portalDesign(portal.id);
				const route = trimSlashes(rest);
				const pages = (design && design.pages) || [];
				const page = route === '' ? pages.find((p) => p.id === design.portal.homePage) || pages.find((p) => trimSlashes(p.route) === '') : pages.find((p) => trimSlashes(p.route) === route) || pages.find((p) => p.name === route);
				if (page) pageId = page.id;
				else ctx.notFound(`No page "/${route}" in portal ${slug}`);
			}
		}
		if (!portalId && !designer.get().portalId) {
			const def = await defaultPortal(ctx);
			if (def) portalId = def.id;
		}
		const d = designer.get();
		if (portalId) {
			const same = d.portalId === portalId && (node === 'portal' ? d.node === 'portal' : d.node === 'page' && (!pageId || d.pageId === pageId));
			if (!same) await designer.openPortal(portalId, { pageId, node, navigate: false });
		}
		if (DEVICES.includes(params.device)) designer.set({ device: params.device });
		else if (params.id) designer.set({ device: 'desktop' });
		if (params.placement) {
			if (findPlacement(designer.get(), params.placement)) designer.select(params.placement);
			else ctx.notFound(`No placement ${params.placement} on this page`);
		} else if (designer.get().selection) designer.select(null);
		return undefined;
	},
	subscribe({ designer }, onChange) {
		return designer.subscribe(onChange);
	},
	label({ designer }) {
		const d = designer.get();
		const portal = d.design && d.design.portal;
		const page = d.page && d.page.page;
		return (portal ? portal.name : 'Pages') + (d.node === 'portal' ? ' · portal settings' : page ? ' · ' + page.title : '');
	}
});

// ---- Menus --------------------------------------------------------------------------------

function menuRef(m) {
	const portal = m.design && m.design.portal;
	const slug = portal && portal.slug && !/[:/]/.test(portal.slug) ? portal.slug : '';
	const list = m.menus || [];
	const menu = list.find((x) => x.id === m.menuId);
	if (!menu) return slug || m.portalId || '';
	const unique = menu.key && list.filter((x) => x.key === menu.key).length === 1;
	return slug && unique ? slug + ':' + menu.key : menu.id;
}

registerStudioLocation({
	activity: 'menus',
	param: 'menus',
	qKeys: ['item', 'preview'],
	serialize({ menus }) {
		const m = menus.get();
		if (!m.portalId) return {};
		return { id: menuRef(m), item: m.selection || '', preview: m.preview && m.preview !== 'sidebar' ? m.preview : '' };
	},
	async apply(params, ctx) {
		const { menus, designer } = ctx;
		let portalId = null;
		let menuId = null;
		let menuKey = null;
		let itemId = params.item || null;
		if (params.id && isSysId(params.id)) {
			const r = await resolveId(params.id);
			if (r.kind === 'menu' || r.kind === 'menuItem') {
				portalId = r.portalId;
				menuId = r.menuId;
				if (r.itemId) itemId = r.itemId;
			} else if (r.kind === 'portal') portalId = r.portalId;
			else if (r.kind === 'page') portalId = r.portalId;
			else {
				const other = viewOfKind(r.kind);
				if (other && other !== 'menus') return { view: other };
				ctx.notFound(`No menu, menu item or portal with the id ${params.id}`);
			}
		} else if (params.id) {
			const { slug, rest } = splitPortalRef(params.id);
			const portal = await findPortal(ctx, slug);
			if (!portal) ctx.notFound(`No portal "${slug}"`);
			else {
				portalId = portal.id;
				menuKey = rest ? trimSlashes(rest) : null;
			}
		}
		if (!portalId && !menus.get().portalId) {
			const d = designer.get();
			const def = d.portalId ? { id: d.portalId } : await defaultPortal(ctx);
			if (def) portalId = def.id;
		}
		if (portalId && menuKey) {
			const list = (await menusApi.listMenus(portalId)) || [];
			const menu = list.find((x) => x.key === menuKey) || list.find((x) => x.id === menuKey);
			if (menu) menuId = menu.id;
			else ctx.notFound(`No menu "${menuKey}" in portal ${params.id.split(':')[0]}`);
		}
		const m = menus.get();
		if (portalId && (m.portalId !== portalId || (menuId && m.menuId !== menuId))) await menus.openPortal(portalId, { menuId, itemId, navigate: false });
		else if (itemId !== (m.selection || null)) menus.set({ selection: itemId });
		if (PREVIEWS.includes(params.preview)) menus.set({ preview: params.preview });
		return undefined;
	},
	subscribe({ menus }, onChange) {
		return menus.subscribe(onChange);
	},
	label({ menus }) {
		const m = menus.get();
		const menu = (m.menus || []).find((x) => x.id === m.menuId);
		return (m.design ? m.design.portal.name : 'Menus') + (menu ? ' · ' + menu.name : '');
	}
});
