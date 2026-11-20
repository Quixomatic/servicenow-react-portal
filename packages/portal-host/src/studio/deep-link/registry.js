// Studio location registry (.plans/studio-deep-links.md §5). Each activity declares its URL state:
// how to serialize what's open, and how to open a parsed location. The controller (controller.js)
// turns that into deep links, URL sync, Back / Forward and Copy link.
//
//   registerStudioLocation({
//     activity: 'viewRules',          // studio.get().view value
//     param: 'view-rules',            // the URL `view` value
//     aliases: ['viewRules'],         // optional extra accepted `view` values
//     qKeys: ['rule'],                // q keys this activity owns, in URL order
//     pushKeys: ['id'],               // optional (default ['id']): a change pushes history; others replace
//     serialize(ctx) { return { id, rule } },     // strings; '' / null / undefined are dropped
//     async apply(params, ctx) { … },             // open { id, rule, … } ('' when absent)
//     subscribe(ctx, onChange) { return unsubscribe },
//     label(ctx) { return 'View rules · sp' },    // optional, for the Copy link toast
//   })
//
// apply() may return { view: '<other param>' } to hand the same params to another activity (an id
// that turned out to be a menu), or { cancelled: true } when the user cancelled (unsaved changes).
// Report unknown targets with ctx.notFound(message).
import { useSyncExternalStore } from 'react';
import { normalizeView } from './url';

const entries = new Map(); // activity -> entry
const listeners = new Set();

export function registerStudioLocation(entry) {
	if (!entry || !entry.activity || !entry.param) throw new Error('registerStudioLocation: activity and param are required');
	const normalized = {
		aliases: [],
		qKeys: [],
		pushKeys: ['id'],
		serialize: () => ({}),
		apply: async () => undefined,
		subscribe: () => () => {},
		...entry
	};
	entries.set(entry.activity, normalized);
	listeners.forEach((l) => l());
	return () => {
		if (entries.get(entry.activity) === normalized) entries.delete(entry.activity);
		listeners.forEach((l) => l());
	};
}

export function locationEntries() {
	return Array.from(entries.values());
}

export function entryForActivity(activity) {
	return entries.get(activity) || null;
}

/** The entry for a URL `view` value (its param, an alias, or the activity name). */
export function entryForView(view) {
	const v = normalizeView(view);
	if (!v) return null;
	for (const e of entries.values()) if (e.param === v || e.activity === view || e.aliases.includes(view) || e.aliases.includes(v)) return e;
	return null;
}

export function onRegistryChange(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

/** A tiny store for activity state that apply() sets before the activity's component mounts. */
export function createActivityState(initial) {
	let state = { ...(initial || {}) };
	const subs = new Set();
	return {
		get: () => state,
		set(partial) {
			const next = typeof partial === 'function' ? partial(state) : partial;
			state = { ...state, ...next };
			subs.forEach((l) => l());
		},
		subscribe(l) {
			subs.add(l);
			return () => subs.delete(l);
		}
	};
}

/** React hook for createActivityState stores: useActivityState(store, (s) => s.portalId). */
export function useActivityState(store, selector) {
	const pick = selector || ((s) => s);
	return useSyncExternalStore(store.subscribe, () => pick(store.get()), () => pick(store.get()));
}
