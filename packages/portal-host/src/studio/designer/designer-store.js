// Page designer state: the open portal (its design), the selected page (its design), the
// selection, and an undo/redo stack of the writes this designer issued (undo sends the inverse).
// Every write re-fetches the designs and bumps `version`, which re-renders the canvas from the
// freshly published runtime data.
import { toast } from 'sonner';
import { designApi } from './designer-api';

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
		set((s) => ({ busy: s.busy + 1 }));
		try {
			const result = await run();
			if (result && result.undo && !options.fromHistory) set((s) => ({ undo: s.undo.concat({ label, ...result }).slice(-LIST_LIMIT), redo: [] }));
			await refresh();
			if (!options.quiet) toast.success(label);
			say('info', label);
			return result;
		} catch (error) {
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

	function scopePage(scope) {
		return scope === 'portal' ? null : state.pageId;
	}

	/** Index of a placement within its region list (same scope), from the current designs. */
	function indexOf(placementId) {
		const found = findPlacement(state, placementId);
		if (!found) return -1;
		const list = (found.scope === 'portal' ? state.page ? state.page.portalPlacements : state.design.portalPlacements : state.page.placements)[found.placement.region] || [];
		return list.findIndex((p) => p.id === placementId);
	}

	function addPlacement(component, region, scope, index) {
		const body = { portal: state.portalId, page: scopePage(scope), region, component: component.id, index };
		const ref = { id: null };
		return write(`Added ${component.name} to ${region}${scope === 'portal' ? ' (portal-wide)' : ''}`, async () => {
			const created = await designApi.createPlacement(body);
			ref.id = created.id;
			set({ selection: created.id });
			return {
				undo: () => designApi.deletePlacement(ref.id),
				redo: async () => {
					const again = await designApi.createPlacement(body);
					ref.id = again.id;
				}
			};
		});
	}

	function movePlacement(placementId, region, scope, index) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		const from = { region: found.placement.region, page: found.scope === 'portal' ? null : state.pageId, index: indexOf(placementId) };
		const to = { region, page: scopePage(scope), index };
		if (from.region === to.region && from.page === to.page && from.index === to.index) return null;
		return write(`Moved ${found.placement.component.name} to ${region}${scope === 'portal' ? ' (portal-wide)' : ''}`, async () => {
			await designApi.patchPlacement(placementId, to);
			return { undo: () => designApi.patchPlacement(placementId, from), redo: () => designApi.patchPlacement(placementId, to) };
		});
	}

	function deletePlacement(placementId) {
		const found = findPlacement(state, placementId);
		if (!found) return null;
		const index = indexOf(placementId);
		const ref = { id: placementId };
		return write(`Removed ${found.placement.component.name}`, async () => {
			const res = await designApi.deletePlacement(ref.id);
			const p = (res && res.placement) || found.placement;
			set({ selection: null });
			const body = {
				portal: state.portalId,
				page: p.scope === 'portal' ? null : p.pageId || p.page || state.pageId,
				region: p.region,
				component: p.component.id,
				index,
				options: p.options || {}
			};
			return {
				undo: async () => {
					const again = await designApi.createPlacement(body);
					ref.id = again.id;
					if (p.active === false) await designApi.patchPlacement(again.id, { active: false });
				},
				redo: () => designApi.deletePlacement(ref.id)
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
		setActive,
		createPage,
		updatePage,
		deletePage,
		updatePortal,
		undo,
		redo,
		select: (id) => set({ selection: id }),
		paletteEntry: (componentId) => ((state.design && state.design.palette) || []).find((c) => c.id === componentId) || null
	};
}

/** Find a placement in the current page design (page-level first, then portal-wide). */
export function findPlacement(s, placementId) {
	if (!placementId) return null;
	const page = s.page;
	const lists = [];
	if (page && page.placements) lists.push(['page', page.placements]);
	const portalPlacements = (page && page.portalPlacements) || (s.design && s.design.portalPlacements);
	if (portalPlacements) lists.push(['portal', portalPlacements]);
	for (const [scope, byRegion] of lists) {
		for (const region of Object.keys(byRegion)) {
			const placement = byRegion[region].find((p) => p.id === placementId);
			if (placement) return { placement, scope };
		}
	}
	return null;
}

/** A concrete path for a route pattern, so the canvas can resolve it (orders/:id → orders/sample). */
export function samplePath(route) {
	return String(route || '')
		.split('/')
		.map((seg) => (seg.charAt(0) === ':' || seg === '*' ? 'sample' : seg))
		.join('/');
}
