// Studio deep-link controller (.plans/studio-deep-links.md §3): one hook that
// - opens the location in the URL on load (and on Back / Forward),
// - keeps the URL in step with what's open: push when the activity or its push keys (id) change,
//   replace when only q keys change,
// - copies a link to the current location.
//
// Writing the URL goes through one seam, WRITER (below). Reading always uses the URL path, because
// the shell doesn't deliver absent optional params, and re-binds only the params it knows.
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { readWindowPath } from '#/runtime/location';
import { designApi } from '../designer/designer-api';
import { entryForActivity, entryForView, locationEntries, onRegistryChange } from './registry';
import { viewOfKind } from './builtin';
import { buildQ, buildStudioPath, isSysId, parseQ, parseStudioPath, parseStudioProps, sameStudioLocation, studioBase } from './url';

const DETECT_MS = 450;
const DEFER_MS = 2500;

/**
 * How Studio writes its URL (.plans/studio-deep-links.md §4):
 * - 'auto'      (default) PORTAL_NAVIGATE { recordId, view, q, replace } through the studio page's
 *               Portal navigate handler (a script-mode Link to destination: view / id / q, redirect ←
 *               replace). If the first dispatch of a page load doesn't move the URL within
 *               DETECT_MS (no handler), Studio writes the entries itself from then on.
 * - 'history'   Studio always writes the entries itself with the shell's convention ({ position }
 *               in history.state: push = position + 1, replace = keep); the shell re-binds view /
 *               id on Back / Forward.
 * - 'uib-push'  pushes through the handler, replaces as a replaceState on the current entry (for
 *               a handler without a Redirect binding).
 */
export const WRITER = 'auto';
// 'auto' only: 'detect' | 'uib' | 'history', decided by the first write of the page load.
let writerMode = 'detect';

/** The location object for what's open now: { view, id, params, q, entry }. */
function currentLocation(studio, ctx, extras) {
	const entry = entryForActivity(studio.get().view);
	if (!entry) return { view: '', id: '', params: {}, q: '', entry: null };
	let raw = {};
	try {
		raw = entry.serialize(ctx) || {};
	} catch (error) {
		raw = {};
	}
	if (extras && entry.linkExtras) raw = { ...raw, ...(entry.linkExtras(ctx) || {}) };
	const id = raw.id ? String(raw.id) : '';
	const params = {};
	Object.keys(raw).forEach((k) => {
		if (k !== 'id' && raw[k] !== undefined && raw[k] !== null && String(raw[k]) !== '') params[k] = String(raw[k]);
	});
	return { view: entry.param, id, params, q: buildQ(params, entry.qKeys), entry };
}

function historyWrite(path, replace) {
	try {
		const url = path + (window.location.search || '') + (window.location.hash || '');
		const state = history.state || {};
		const pos = typeof state.position === 'number' ? state.position : 0;
		if (replace) history.replaceState({ ...state, position: pos }, '', url);
		else history.pushState({ ...state, position: pos + 1 }, '', url);
	} catch (error) {
		/* no history */
	}
}

/**
 * useStudioDeepLinks({ studio, designer, menus, locationStore, navigate, handling })
 * `handling` is a ref the activity default-open effects read (true while a location is applied).
 * Returns nothing; Copy link goes through copyStudioLink() (wired by the hook).
 */
export function useStudioDeepLinks({ studio, designer, menus, locationStore, navigate, handling }) {
	const navigateRef = useRef(navigate);
	navigateRef.current = navigate;
	useEffect(() => {
		let alive = true;
		const base = studioBase(readWindowPath());
		let portalsPromise = null;
		const ctx = {
			studio,
			designer,
			menus,
			toast,
			isSysId,
			notFound: (message) => toast.error(message),
			portals: () => {
				const known = designer.get().portals;
				if (known && known.length) return Promise.resolve(known);
				if (!portalsPromise) portalsPromise = designer.loadPortals();
				return portalsPromise;
			}
		};
		let applying = 0;
		let last = null; // the location last written or applied
		let timer = null;
		let deferSince = 0;

		const readUrl = () => (base !== null ? parseStudioPath(readWindowPath()) : parseStudioProps(locationStore.get()));

		const write = (loc, replace) => {
			const path = buildStudioPath(base, loc);
			const dispatch = () => navigateRef.current && navigateRef.current('', { recordId: loc.id, view: loc.view, q: loc.q, replace: !!replace });
			if (WRITER === 'history') {
				historyWrite(path, replace);
				return;
			}
			if (WRITER === 'uib-push') {
				if (replace) historyWrite(path, true);
				else dispatch();
				return;
			}
			if (writerMode === 'history') {
				historyWrite(path, replace);
				return;
			}
			// Detection asks one question: did the shell move the URL at all after our dispatch? (We
			// only write when the URL differs from what's open, so a working handler always moves it.)
			// Comparing against this write's own target would misfire when a second write follows
			// within DETECT_MS (an anchor cleared, then a new page): the shell is already on the second.
			const before = readWindowPath();
			dispatch();
			if (writerMode === 'detect') {
				setTimeout(() => {
					if (!alive || writerMode !== 'detect') return;
					if (readWindowPath() !== before) {
						writerMode = 'uib';
						return;
					}
					writerMode = 'history';
					// No handler: write what's open now (it may have moved on since this write).
					const cur = currentLocation(studio, ctx);
					if (cur.entry && !sameStudioLocation(parseStudioPath(readWindowPath()), cur)) historyWrite(buildStudioPath(base, cur), replace);
				}, DETECT_MS);
			}
		};

		const sync = () => {
			timer = null;
			if (!alive || applying || base === null) return;
			const loc = currentLocation(studio, ctx);
			if (!loc.entry) return;
			const inUrl = parseStudioPath(readWindowPath());
			if (sameStudioLocation(inUrl, loc)) {
				last = loc;
				return;
			}
			const prev = last || inUrl;
			// An activity switch whose target is still loading (no id yet): wait for it (up to
			// DEFER_MS) so one entry carries the activity and its target, not two.
			if (prev.view !== loc.view && !loc.id) {
				if (!deferSince) deferSince = Date.now();
				if (Date.now() - deferSince < DEFER_MS) {
					timer = setTimeout(sync, 150);
					return;
				}
			}
			deferSince = 0;
			// Push for a new place (activity or a push key); replace for q-only changes and for the
			// first fill of an empty location (a default portal opening on load).
			const pushKeys = loc.entry.pushKeys || ['id'];
			const prevValue = (k) => (k === 'id' ? prev.id : (prev.params || {})[k]) || '';
			const nowValue = (k) => (k === 'id' ? loc.id : loc.params[k]) || '';
			const moved = prev.view !== loc.view || pushKeys.some((k) => prevValue(k) !== nowValue(k));
			const emptyBefore = !prev.id && (!prev.view || prev.view === loc.view);
			write(loc, !moved || emptyBefore);
			last = loc;
		};
		const schedule = () => {
			if (timer || applying) return;
			timer = setTimeout(sync, 0);
		};

		const apply = async (target, opts) => {
			const options = opts || {};
			applying += 1;
			if (handling) handling.current = true;
			let cancelled = false;
			try {
				let view = target.view;
				if (!view && target.id) {
					if (isSysId(target.id)) {
						let r = { kind: 'unknown' };
						try {
							r = await designApi.resolve(target.id);
						} catch (error) {
							r = { kind: 'component' }; // older backends: try it as a component
						}
						view = viewOfKind(r.kind);
						if (!view) toast.error('Nothing in React Portal has the id ' + target.id);
					} else view = target.id.indexOf(':') > 0 ? 'pages' : 'code';
				}
				let entry = view ? entryForView(view) : entryForActivity(studio.get().view);
				if (view && !entry) toast.error(`Studio has no "${view}" view`);
				const params = { id: target.id || '', ...(target.params || {}) };
				for (let hop = 0; entry && hop < 3; hop += 1) {
					if (studio.get().view !== entry.activity) studio.set({ view: entry.activity });
					if (!view && !target.id && !Object.keys(target.params || {}).length) break; // bare URL: keep the restored state
					const result = await entry.apply(params, ctx);
					if (result && result.cancelled) cancelled = true;
					if (result && result.view && entryForView(result.view) && entryForView(result.view) !== entry) {
						entry = entryForView(result.view);
						continue;
					}
					break;
				}
			} catch (error) {
				toast.error(`Could not open the link: ${(error && error.message) || error}`);
			} finally {
				applying -= 1;
				if (handling) handling.current = false;
			}
			if (!alive || base === null) return;
			const loc = currentLocation(studio, ctx);
			last = loc;
			if (!loc.entry) return;
			// Cancelled Back / Forward: put the address bar back on what's on screen (a new entry).
			if (cancelled && options.fromPop) write(loc, false);
			else if (!sameStudioLocation(parseStudioPath(readWindowPath()), loc)) write(loc, true);
		};

		// Subscriptions: Studio itself (the activity) plus every registered entry.
		let unsubs = [];
		const resubscribe = () => {
			unsubs.forEach((u) => u && u());
			unsubs = [studio.subscribe(schedule)].concat(locationEntries().map((e) => e.subscribe(ctx, schedule)));
		};
		resubscribe();
		const offRegistry = onRegistryChange(resubscribe);

		// Back / Forward.
		const onPop = () => {
			if (base === null) return;
			const loc = parseStudioPath(readWindowPath());
			if (!loc || (last && sameStudioLocation(loc, last))) return;
			last = loc;
			apply(loc, { fromPop: true });
		};
		window.addEventListener('popstate', onPop);

		// Off the studio route (local dev / mock): the host props drive it, nothing is written.
		let propsKey = '';
		const onProps = () => {
			if (base !== null) return;
			const loc = parseStudioProps(locationStore.get());
			const key = JSON.stringify(loc);
			if (key === propsKey) return;
			propsKey = key;
			apply(loc);
		};
		const offProps = locationStore.subscribe(onProps);

		copyImpl = (opts) => {
			const loc = currentLocation(studio, ctx, opts && opts.line !== false);
			if (opts && opts.file) {
				loc.params = { ...loc.params, file: opts.file };
				if (opts.lineNumber) loc.params.line = String(opts.lineNumber);
				else if (!opts.line) delete loc.params.line;
				loc.q = buildQ(loc.params, loc.entry && loc.entry.qKeys);
			}
			const path = buildStudioPath(base !== null ? base : '/x/312987/portal/studio', loc);
			const url = window.location.origin + path;
			const label = loc.entry && loc.entry.label ? loc.entry.label(ctx) : 'Studio';
			const done = () => toast.success(`Link copied: ${label}`, { description: path.replace(/^.*\/studio/, '…/studio') });
			const fail = () => toast.error('Could not copy the link', { description: url });
			try {
				if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fail);
				else fail();
			} catch (error) {
				fail();
			}
			return url;
		};

		// Initial location.
		const initial = readUrl();
		if (base === null) propsKey = JSON.stringify(initial);
		apply(initial || { view: '', id: '', params: {} });

		return () => {
			alive = false;
			clearTimeout(timer);
			unsubs.forEach((u) => u && u());
			offRegistry();
			offProps();
			window.removeEventListener('popstate', onPop);
			copyImpl = null;
		};
	}, [studio, designer, menus, locationStore, handling]);
}

let copyImpl = null;

/**
 * Copy a link to the current Studio location. opts:
 *   line: false      leave the cursor line out (default: the code editor adds file + line)
 *   file, lineNumber a specific file (and line) of the open component
 * Returns the URL (or null before Studio has mounted).
 */
export function copyStudioLink(opts) {
	return copyImpl ? copyImpl(opts || {}) : null;
}

export { parseQ };
