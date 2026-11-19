// Menus activity state: the open portal (its design: pages, portal-wide widgets), its menus
// (full item trees), the open menu, the selected item, preview settings, and an undo/redo
// stack of the writes this activity issued (undo sends the inverse), like the page designer.
// Every edit saves immediately; the preview renders from these DTOs (no re-bootstrap).
import { toast } from 'sonner';
import { menusApi } from './menus-api';
import { designApi } from '../designer/designer-api';
import { isWrongScope, markOutOfScope, readOnly } from '../scope';

const LIST_LIMIT = 100;

/** The writable fields of a MenuItemDto, as a PATCH / POST body. */
export function itemBody(dto) {
	return {
		type: dto.type,
		label: dto.label,
		active: dto.active,
		page: dto.pageId || null,
		params: dto.params || null,
		route: dto.route || '',
		url: dto.url || '',
		icon: dto.icon || '',
		target: dto.target || '',
		match: dto.match || 'prefix',
		tooltip: dto.tooltip || '',
		collapsed: !!dto.collapsed,
		roles: dto.roles || [],
		condition: dto.condition || '',
		badge: dto.badge || '',
		badgeScript: dto.badgeScript || '',
		script: dto.script || ''
	};
}

/** Visit every item of a tree: fn(item, parent, index, siblings). */
export function eachItem(items, fn, parent) {
	(items || []).forEach((item, i, list) => {
		fn(item, parent || null, i, list);
		if (item.children && item.children.length) eachItem(item.children, fn, item);
	});
}

export function findItem(menu, id) {
	let hit = null;
	if (menu && id) eachItem(menu.items, (item, parent, index) => !hit && item.id === id && (hit = { item, parent, index }));
	return hit;
}

const FIELD_KEYS = Object.keys(itemBody({}));

export function createMenusStore({ navigate, log }) {
	let state = {
		portals: null,
		portalId: null,
		design: null,
		menus: null,
		menuId: null,
		selection: null,
		busy: 0,
		loading: false,
		error: null,
		fieldErrors: {}, // { [itemId]: { message, field? } }: the server's last 400 for that item
		preview: 'sidebar', // 'sidebar' | 'header' | 'footer'
		rail: false, // sidebar preview: collapsed icon rail
		viewAs: 'all', // 'all' | 'none' (no roles) | '<role name>'
		dark: null, // preview light/dark override (null = Studio's)
		undo: [],
		redo: []
	};
	const listeners = new Set();
	const get = () => state;
	const set = (partial) => {
		state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
		listeners.forEach((l) => l());
	};
	const say = (level, text) => log && log(level, `Menus: ${text}`);
	const go = (id) => navigate && id && navigate('', { recordId: id, view: 'menus' });

	async function loadPortals() {
		try {
			const portals = await designApi.listPortals();
			set({ portals: portals || [] });
			return portals || [];
		} catch (error) {
			set({ error });
			return [];
		}
	}

	/** Open a portal; then a menu (menuId, else primary, else the first) and optionally an item. */
	async function openPortal(portalId, opts) {
		const options = opts || {};
		set({ loading: true, error: null });
		try {
			const [design, menus] = await Promise.all([designApi.portalDesign(portalId), menusApi.listMenus(portalId)]);
			const list = menus || [];
			const keep = state.portalId === portalId && state.menuId && list.some((m) => m.id === state.menuId) ? state.menuId : null;
			const menuId = (options.menuId && list.some((m) => m.id === options.menuId) && options.menuId) || keep || ((list.find((m) => m.key === 'primary') || list[0] || {}).id || null);
			const samePortal = state.portalId === portalId;
			set({ portalId, design, menus: list, menuId, selection: options.itemId || null, loading: false, undo: samePortal ? state.undo : [], redo: samePortal ? state.redo : [] });
			if (options.navigate !== false) go(options.itemId || menuId || portalId);
		} catch (error) {
			set({ loading: false, error });
			toast.error(`Could not open the portal's menus: ${error.message}`);
		}
	}

	function openMenu(menuId) {
		set({ menuId, selection: null });
		go(menuId);
	}

	function select(itemId) {
		set({ selection: itemId });
		go(itemId || state.menuId);
	}

	async function refresh() {
		if (!state.portalId) return;
		const menus = (await menusApi.listMenus(state.portalId)) || [];
		const menuId = menus.some((m) => m.id === state.menuId) ? state.menuId : ((menus.find((m) => m.key === 'primary') || menus[0] || {}).id || null);
		const menu = menus.find((m) => m.id === menuId);
		const selection = state.selection && findItem(menu, state.selection) ? state.selection : null;
		set({ menus, menuId, selection });
	}

	/** Run a write: busy, toast on error, refresh after, push to the undo stack. */
	async function write(label, run, opts) {
		const options = opts || {};
		if (readOnly()) {
			toast.error('Switch to React Portal to edit (see the banner).');
			return null;
		}
		set((s) => ({ busy: s.busy + 1 }));
		try {
			const result = await run();
			if (result && result.undo && !options.fromHistory) set((s) => ({ undo: s.undo.concat({ label, ...result }).slice(-LIST_LIMIT), redo: [] }));
			if (options.itemId) set((s) => ({ fieldErrors: { ...s.fieldErrors, [options.itemId]: null } }));
			await refresh();
			if (!options.quiet) toast.success(label);
			say('info', label);
			return result || true;
		} catch (error) {
			if (isWrongScope(error)) markOutOfScope(error);
			if (options.itemId) set((s) => ({ fieldErrors: { ...s.fieldErrors, [options.itemId]: { message: error.message, field: options.field || null } } }));
			toast.error(`${label} failed: ${error.message}`);
			say('error', `${label} failed: ${error.message}`);
			try {
				await refresh();
			} catch (e) {
				/* ignore */
			}
			return null;
		} finally {
			set((s) => ({ busy: Math.max(0, s.busy - 1) }));
		}
	}

	const currentMenu = () => (state.menus || []).find((m) => m.id === state.menuId) || null;

	// ---- menus ----------------------------------------------------------------------------

	async function createMenu(fields) {
		const ref = { id: null };
		const body = { portal: state.portalId, ...fields };
		const ok = await write(`Created menu "${fields.name || fields.key}"`, async () => {
			const dto = await menusApi.createMenu(body);
			ref.id = dto.id;
			return {
				undo: () => menusApi.deleteMenu(ref.id),
				redo: async () => {
					const again = await menusApi.createMenu(body);
					ref.id = again.id;
				}
			};
		});
		if (ok && ref.id) openMenu(ref.id);
		return ok;
	}

	function updateMenu(id, fields) {
		const menu = (state.menus || []).find((m) => m.id === id);
		if (!menu) return null;
		const prior = {};
		Object.keys(fields).forEach((k) => (prior[k] = menu[k]));
		return write('Updated the menu', async () => {
			await menusApi.updateMenu(id, fields);
			return { undo: () => menusApi.updateMenu(id, prior), redo: () => menusApi.updateMenu(id, fields) };
		});
	}

	function deleteMenu(id) {
		return write('Deleted the menu', async () => {
			await menusApi.deleteMenu(id);
			return null; // not undoable (its items are gone)
		});
	}

	// ---- items ----------------------------------------------------------------------------

	/** Add an item: target = { parent: id | null, index? } (default: after the selection, else at the end). */
	async function addItem(fields, target) {
		const menu = currentMenu();
		if (!menu) return null;
		let parent = null;
		let index;
		if (target) {
			parent = target.parent || null;
			index = target.index;
		} else if (state.selection) {
			const hit = findItem(menu, state.selection);
			if (hit && hit.item.type === 'group') {
				parent = hit.item.id;
			} else if (hit) {
				parent = hit.parent ? hit.parent.id : null;
				index = hit.index + 1;
			}
		}
		const body = { menu: menu.id, parent, ...fields };
		if (typeof index === 'number') body.index = index;
		const ref = { id: null };
		const ok = await write(`Added ${fields.label ? `"${fields.label}"` : fields.type}`, async () => {
			const dto = await menusApi.createItem(body);
			ref.id = dto.id;
			return {
				undo: () => menusApi.deleteItem(ref.id, 'cascade'),
				redo: async () => {
					const again = await menusApi.createItem(body);
					ref.id = again.id;
				}
			};
		});
		if (ok && ref.id) select(ref.id);
		return ok ? ref.id : null;
	}

	/** Add several items in one undo step ("Add all pages"). */
	async function addItems(list, parent) {
		const menu = currentMenu();
		if (!menu || !list.length) return null;
		const refs = [];
		return write(`Added ${list.length} item(s)`, async () => {
			for (const fields of list) {
				const dto = await menusApi.createItem({ menu: menu.id, parent: parent || null, ...fields });
				refs.push({ id: dto.id, body: { menu: menu.id, parent: parent || null, ...fields } });
			}
			return {
				undo: async () => {
					for (const r of refs) await menusApi.deleteItem(r.id, 'cascade');
				},
				redo: async () => {
					for (const r of refs) r.id = (await menusApi.createItem(r.body)).id;
				}
			};
		});
	}

	/** Edit fields of an item (field = the form field, for error placement). */
	function updateItem(id, fields, field) {
		const hit = findItem(currentMenu(), id);
		if (!hit) return null;
		const before = itemBody(hit.item);
		const prior = {};
		Object.keys(fields).forEach((k) => (prior[k] = FIELD_KEYS.indexOf(k) >= 0 ? before[k] : undefined));
		const what = Object.keys(fields).join(', ');
		return write(`Updated ${hit.item.label || hit.item.type} (${what})`, async () => {
			await menusApi.updateItem(id, fields);
			return { undo: () => menusApi.updateItem(id, prior), redo: () => menusApi.updateItem(id, fields) };
		}, { itemId: id, field: field || Object.keys(fields)[0], quiet: true });
	}

	/** Move an item: parent (null = top level) and index among the new siblings. */
	function moveItem(id, parent, index) {
		const hit = findItem(currentMenu(), id);
		if (!hit) return null;
		const from = { parent: hit.parent ? hit.parent.id : null, index: hit.index };
		if (from.parent === (parent || null) && from.index === index) return null;
		return write(`Moved ${hit.item.label || hit.item.type}`, async () => {
			await menusApi.updateItem(id, { parent: parent || null, index });
			return { undo: () => menusApi.updateItem(id, from), redo: () => menusApi.updateItem(id, { parent: parent || null, index }) };
		}, { quiet: true });
	}

	/**
	 * Delete an item. A group with children needs mode 'lift' (children move out to where it was:
	 * undoable) or 'cascade' (deleted too: not undoable).
	 */
	function deleteItem(id, mode) {
		const menu = currentMenu();
		const hit = findItem(menu, id);
		if (!hit) return null;
		const dto = hit.item;
		const parent = hit.parent ? hit.parent.id : null;
		const index = hit.index;
		const children = (dto.children || []).map((c) => c.id);
		const ref = { id };
		return write(`Deleted ${dto.label || dto.type}`, async () => {
			const result = await menusApi.deleteItem(ref.id, children.length ? mode : undefined);
			if (state.selection === id) set({ selection: null });
			if (children.length && mode === 'cascade') return null;
			const lifted = (result && result.lifted) || [];
			return {
				undo: async () => {
					const again = await menusApi.createItem({ menu: menu.id, parent, index, ...itemBody(dto) });
					ref.id = again.id;
					for (let i = 0; i < lifted.length; i += 1) await menusApi.updateItem(lifted[i], { parent: ref.id, index: i });
				},
				redo: () => menusApi.deleteItem(ref.id, lifted.length ? 'lift' : undefined)
			};
		});
	}

	// ---- history ----------------------------------------------------------------------------

	async function undo() {
		const entry = state.undo[state.undo.length - 1];
		if (!entry || state.busy) return;
		set((s) => ({ undo: s.undo.slice(0, -1) }));
		await write(`Undo: ${entry.label}`, async () => {
			await entry.undo();
			return null;
		}, { fromHistory: true });
		set((s) => ({ redo: s.redo.concat(entry) }));
	}

	async function redo() {
		const entry = state.redo[state.redo.length - 1];
		if (!entry || state.busy) return;
		set((s) => ({ redo: s.redo.slice(0, -1) }));
		await write(`Redo: ${entry.label}`, async () => {
			await entry.redo();
			return null;
		}, { fromHistory: true });
		set((s) => ({ undo: s.undo.concat(entry) }));
	}

	return {
		get,
		set,
		subscribe: (l) => {
			listeners.add(l);
			return () => listeners.delete(l);
		},
		loadPortals,
		openPortal,
		openMenu,
		select,
		refresh,
		currentMenu,
		createMenu,
		updateMenu,
		deleteMenu,
		addItem,
		addItems,
		updateItem,
		moveItem,
		deleteItem,
		undo,
		redo
	};
}
