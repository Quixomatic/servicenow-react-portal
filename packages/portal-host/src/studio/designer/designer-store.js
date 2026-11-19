// Page designer state: the open portal (its design), the selected page (its design), the
// selection, and an undo/redo stack of the writes this designer issued (undo sends the inverse).
// Every write re-fetches the designs and bumps `version`, which re-renders the canvas from the
// freshly published runtime data.
import { toast } from 'sonner';
import { designApi } from './designer-api';
import { isWrongScope, markOutOfScope, readOnly as scopeReadOnly } from '../scope';

function internals() {
	return (globalThis.__REACT_PORTAL__ && globalThis.__REACT_PORTAL__.internals) || {};
}

const LIST_LIMIT = 100;

export function createDesigner({ navigate, log }) {
	let state = {
		portals: null,
		portalId: null,
		design: null,
		pageId: null,
		page: null,
		node: 'page', // 'page' | 'portal'
		selection: null,
		version: 0,
		busy: 0,
		loading: false,
		error: null,
		device: 'desktop',
		interact: false,
		undo: [],
		redo: []
	};
	const listeners = new Set();
	const get = () => state;
	const set = (partial) => {
		state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
		listeners.forEach((l) => l());
	};
	const say = (level, text) => log && log(level, `Designer: ${text}`);

	async function loadPortals() {
		try {
			const portals = await designApi.listPortals();
			set({ portals: portals || [] });
			return portals || [];
		} catch (error) {
			set({ error });
			toast.error(`Could not load portals: ${error.message}`);
			return [];
		}
	}

	/** Open a portal (and a page of it; default: the home page, else the first). */
	async function openPortal(portalId, opts) {
		const options = opts || {};
		set({ loading: true, error: null });
		try {
			const design = await designApi.portalDesign(portalId);
			const pages = design.pages || [];
			const pageId =
				(options.pageId && pages.some((p) => p.id === options.pageId) && options.pageId) ||
				(state.portalId === portalId && state.pageId && pages.some((p) => p.id === state.pageId) && state.pageId) ||
				design.portal.homePage ||
				(pages[0] && pages[0].id) ||
				null;
			const page = pageId ? await designApi.pageDesign(pageId) : null;
			set({ portalId, design, pageId, page, node: options.node || 'page', selection: null, loading: false });
			if (options.navigate !== false && navigate) navigate('', { recordId: options.node === 'portal' ? portalId : pageId || portalId });
		} catch (error) {
			set({ loading: false, error });
			toast.error(`Could not open the portal: ${error.message}`);
		}
	}

	async function openPage(pageId, opts) {
		const options = opts || {};
		if (!pageId) return;
		set({ loading: true });
		try {
			const page = await designApi.pageDesign(pageId);
			set({ pageId, page, node: 'page', selection: null, loading: false });
			if (options.navigate !== false && navigate) navigate('', { recordId: pageId });
		} catch (error) {
			set({ loading: false });
			toast.error(`Could not open the page: ${error.message}`);
		}
	}

	function showPortalNode() {
		set({ node: 'portal', selection: null });
		if (navigate && state.portalId) navigate('', { recordId: state.portalId });
	}

	/** Re-fetch designs and re-render the canvas from the published runtime data. */
	async function refresh() {
		if (!state.portalId) return;
		const design = await designApi.portalDesign(state.portalId);
		const stillThere = state.pageId && design.pages.some((p) => p.id === state.pageId);
		const pageId = stillThere ? state.pageId : design.portal.homePage || (design.pages[0] && design.pages[0].id) || null;
		const page = pageId ? await designApi.pageDesign(pageId) : null;
		const inv = internals().invalidatePortal;
		if (inv && design.portal) inv(design.portal.slug);
		const selection = state.selection && findPlacement({ design, page }, state.selection) ? state.selection : null;
		set((s) => ({ design, pageId, page, selection, version: s.version + 1 }));
	}

	/** Run a write: busy indicator, toast on error, refresh after, push to the undo stack. */
	async function write(label, run, opts) {
		const options = opts || {};
		if (scopeReadOnly()) {
			toast.error('Switch to React Portal to edit (see the banner).');
			return null;
		}
		set((s) => ({ busy: s.busy + 1 }));
		try {
			const result = await run();
			if (result && result.undo && !options.fromHistory) set((s) => ({ undo: s.undo.concat({ label, ...result }).slice(-LIST_LIMIT), redo: [] }));
			await refresh();
			if (!options.quiet) toast.success(label);
			say('info', label);
			return result;
		} catch (error) {
			if (isWrongScope(error)) markOutOfScope(error);
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

	// ---- placements -------------------------------------------------------------------------
	// A target is { region, scope: 'page'|'portal', parentId?: block id, index? }: `region` is a
	// layout region at the top level, or the block's drop zone when parentId is set.

	function scopePage(scope) {
		return scope === 'portal' ? null : state.pageId;
	}

	function normalizeTarget(regionOrTarget, scope, index) {
		if (regionOrTarget && typeof regionOrTarget === 'object') return { parentId: null, ...regionOrTarget };
		return { region: regionOrTarget, scope, index, parentId: null };
	}

	function where(t) {
		const zone = t.parentId ? findPlacement(state, t.parentId) : null;
		const zoneLabel = zone ? ((zone.placement.regions || []).find((r) => r.name === t.region) || {}).label || t.region : null;
		return zone ? `${zone.placement.component.name} › ${zoneLabel}` : `${t.region}${t.scope === 'portal' ? ' (portal-wide)' : ''}`;
	}

	/** Index of a placement among its siblings (same parent, same region/zone). */
	function indexOf(placementId) {
		const found = findPlacement(state, placementId);
		return found ? siblingsOf(state, found).findIndex((p) => p.id === placementId) : -1;
	}

	/** Create a placement (widget or block) at a target, optionally with options (e.g. a preset). */
	function addPlacement(component, regionOrTarget, scope, index, options) {
		const t = normalizeTarget(regionOrTarget, scope, index);
		const body = { portal: state.portalId, page: scopePage(t.scope), parent: t.parentId || null, region: t.region, component: component.id, index: t.index };
		if (options) body.options = options;
		const ref = { id: null };
		return write(`Added ${component.name} to ${where(t)}`, async () => {
			const created = await designApi.createPlacement(body);
			ref.id = created.id;
			set({ selection: created.id });
			return {
				undo: () => designApi.deletePlacement(ref.id, 'cascade'),
				redo: async () => {
					const again = await designApi.createPlacement(body);
					ref.id = again.id;
				}
			};
		});
	}

	/** Move to a target (between regions, zones, blocks, page ↔ portal-wide). Blocks move with their subtree. */
	function movePlacement(placementId, regionOrTarget, scope, index) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		const t = normalizeTarget(regionOrTarget, scope, index);
		const from = { region: found.placement.region, page: found.scope === 'portal' ? null : state.pageId, parent: found.parent ? found.parent.id : null, index: indexOf(placementId) };
		const to = { region: t.region, page: scopePage(t.scope), parent: t.parentId || null, index: t.index };
		if (from.region === to.region && from.page === to.page && from.parent === to.parent && (to.index === undefined || from.index === to.index)) return null;
		if (to.parent && (to.parent === placementId || isInside(state, to.parent, placementId))) {
			toast.error("A block can't be moved inside itself");
			return null;
		}
		return write(`Moved ${found.placement.component.name} to ${where(t)}`, async () => {
			await designApi.patchPlacement(placementId, to);
			return { undo: () => designApi.patchPlacement(placementId, from), redo: () => designApi.patchPlacement(placementId, to) };
		});
	}

	/**
	 * Delete. A block with children needs a mode: 'lift' moves its children out to where the block
	 * was (undoable: the block is re-created and its children moved back), 'cascade' deletes them
	 * too (not undoable).
	 */
	function deletePlacement(placementId, mode) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		const p0 = found.placement;
		const index = indexOf(placementId);
		const childOrder = [];
		Object.keys(p0.children || {}).forEach((zone) => (p0.children[zone] || []).forEach((c, i) => childOrder.push({ id: c.id, zone, index: i })));
		if (childOrder.length && mode !== 'lift' && mode !== 'cascade') {
			toast.error(`${p0.component.name} contains ${childOrder.length} item(s): choose "Move contents out" or "Delete everything"`);
			return null;
		}
		const ref = { id: placementId };
		const label = mode === 'cascade' && childOrder.length ? `Deleted ${p0.component.name} and ${childOrder.length} item(s)` : mode === 'lift' && childOrder.length ? `Removed ${p0.component.name} (contents moved out)` : `Removed ${p0.component.name}`;
		return write(label, async () => {
			const res = await designApi.deletePlacement(ref.id, childOrder.length ? mode : undefined);
			const p = (res && res.placement) || p0;
			set({ selection: null });
			if (mode === 'cascade' && childOrder.length) return null; // not undoable (the subtree is gone)
			const body = {
				portal: state.portalId,
				page: p.scope === 'portal' ? null : p.pageId || p.page || state.pageId,
				parent: p.parentId || null,
				region: p.region,
				component: p.component.id,
				index,
				options: p.options || {},
				styleTokens: p.styleTokens || {},
				layout: p.layout || {},
				classes: p.classes || ''
			};
			return {
				undo: async () => {
					const again = await designApi.createPlacement(body);
					ref.id = again.id;
					if (p.active === false) await designApi.patchPlacement(again.id, { active: false });
					// lift: move the children back into the re-created block, zone by zone, in order
					for (const c of childOrder) await designApi.patchPlacement(c.id, { parent: again.id, region: c.zone, index: c.index, page: body.page });
				},
				redo: () => designApi.deletePlacement(ref.id, childOrder.length ? 'lift' : undefined)
			};
		});
	}

	function setOptions(placementId, options) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		const before = found.placement.options || {};
		if (JSON.stringify(before) === JSON.stringify(options)) return null;
		return write(`Updated options of ${found.placement.component.name}`, async () => {
			await designApi.patchPlacement(placementId, { options });
			return { undo: () => designApi.patchPlacement(placementId, { options: before }), redo: () => designApi.patchPlacement(placementId, { options }) };
		});
	}

	/** Styling / grid layout / classes: patch = { styleTokens?, layout?, classes? } (whole values). */
	function setStyle(placementId, patch, label) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		const before = {};
		Object.keys(patch).forEach((k) => (before[k] = found.placement[k] === undefined ? (k === 'classes' ? '' : {}) : found.placement[k]));
		if (JSON.stringify(before) === JSON.stringify(patch)) return null;
		return write(`${label || 'Updated styling of'} ${found.placement.component.name}`, async () => {
			await designApi.patchPlacement(placementId, patch);
			return { undo: () => designApi.patchPlacement(placementId, before), redo: () => designApi.patchPlacement(placementId, patch) };
		});
	}

	function setActive(placementId, active) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		return write(`${active ? 'Activated' : 'Deactivated'} ${found.placement.component.name}`, async () => {
			await designApi.patchPlacement(placementId, { active });
			return { undo: () => designApi.patchPlacement(placementId, { active: !active }), redo: () => designApi.patchPlacement(placementId, { active }) };
		});
	}

	// ---- pages and portal -------------------------------------------------------------------

	async function createPage(fields) {
		const result = await write(`Created page ${fields.title || fields.route}`, async () => {
			const page = await designApi.createPage({ portal: state.portalId, ...fields });
			return { page };
		});
		if (result && result.page) await openPage(result.page.id);
		return result;
	}

	function updatePage(pageId, fields) {
		const before = (state.design.pages || []).find((p) => p.id === pageId) || {};
		const prior = {};
		Object.keys(fields).forEach((k) => (prior[k] = before[k] === undefined ? null : before[k]));
		return write(`Updated page ${fields.title || before.title || ''}`.trim(), async () => {
			await designApi.patchPage(pageId, fields);
			return { undo: () => designApi.patchPage(pageId, prior), redo: () => designApi.patchPage(pageId, fields) };
		});
	}

	function deletePage(pageId) {
		const page = (state.design.pages || []).find((p) => p.id === pageId) || {};
		return write(`Deleted page ${page.title || page.route || ''}`.trim(), async () => {
			await designApi.deletePage(pageId);
			return null;
		});
	}

	function updatePortal(fields) {
		const before = state.design.portal || {};
		const prior = {};
		Object.keys(fields).forEach((k) => (prior[k] = before[k] === undefined ? null : before[k]));
		const id = state.portalId;
		return write('Updated portal settings', async () => {
			await designApi.patchPortal(id, fields);
			return { undo: () => designApi.patchPortal(id, prior), redo: () => designApi.patchPortal(id, fields) };
		});
	}

	// ---- history ----------------------------------------------------------------------------

	async function undo() {
		const entry = state.undo[state.undo.length - 1];
		if (!entry || state.busy) return;
		set((s) => ({ undo: s.undo.slice(0, -1) }));
		const ok = await write(`Undo: ${entry.label}`, async () => {
			await entry.undo();
			return null;
		}, { fromHistory: true });
		if (ok !== null || true) set((s) => ({ redo: s.redo.concat(entry) }));
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
		openPage,
		showPortalNode,
		refresh,
		addPlacement,
		movePlacement,
		deletePlacement,
		setOptions,
		setStyle,
		setActive,
		createPage,
		updatePage,
		deletePage,
		updatePortal,
		undo,
		redo,
		select: (id) => set({ selection: id }),
		paletteEntry: (componentId) =>
			((state.design && state.design.palette) || []).concat((state.design && state.design.blocks) || []).find((c) => c.id === componentId) || null
	};
}

/** Visit every placement of a design tree (blocks' children included). */
export function eachPlacement(byRegion, fn, parent) {
	Object.keys(byRegion || {}).forEach((region) =>
		(byRegion[region] || []).forEach((p) => {
			fn(p, parent || null);
			if (p.children) eachPlacement(p.children, fn, p);
		})
	);
}

/**
 * Find a placement in the current page design (page-level first, then portal-wide), at any
 * depth: → { placement, scope: 'page'|'portal', parent: block DTO | null }.
 */
export function findPlacement(s, placementId) {
	if (!placementId) return null;
	const page = s.page;
	const lists = [];
	if (page && page.placements) lists.push(['page', page.placements]);
	const portalPlacements = (page && page.portalPlacements) || (s.design && s.design.portalPlacements);
	if (portalPlacements) lists.push(['portal', portalPlacements]);
	for (const [scope, byRegion] of lists) {
		let hit = null;
		eachPlacement(byRegion, (p, parent) => {
			if (!hit && p.id === placementId) hit = { placement: p, scope, parent };
		});
		if (hit) return hit;
	}
	return null;
}

/** The sibling list a found placement sits in (its parent's zone, or its layout region). */
export function siblingsOf(s, found) {
	if (found.parent) return (found.parent.children && found.parent.children[found.placement.region]) || [];
	const byRegion = found.scope === 'portal' ? (s.page ? s.page.portalPlacements : s.design.portalPlacements) : s.page.placements;
	return (byRegion || {})[found.placement.region] || [];
}

/** True when `id` is somewhere inside the block `ancestorId`. */
export function isInside(s, id, ancestorId) {
	let found = findPlacement(s, id);
	while (found && found.parent) {
		if (found.parent.id === ancestorId) return true;
		found = findPlacement(s, found.parent.id);
	}
	return false;
}

/** A concrete path for a route pattern, so the canvas can resolve it (orders/:id → orders/sample). */
export function samplePath(route) {
	return String(route || '')
		.split('/')
		.map((seg) => (seg.charAt(0) === ':' || seg === '*' ? 'sample' : seg))
		.join('/');
}
