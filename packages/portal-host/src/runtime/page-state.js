// Reading the current page from router state. Page route loaders return
// { page, layout, regions, path } (stable references, see portal-router.js).
const ROOT = '__root__';

/** Loader data of the deepest successful page match, or null. */
export function leafData(state) {
	const matches = (state && state.matches) || [];
	for (let i = matches.length - 1; i >= 0; i -= 1) {
		const m = matches[i];
		if (m.routeId !== ROOT && m.status === 'success' && m.loaderData) return m.loaderData;
	}
	return null;
}

export const EMPTY_LIST = Object.freeze([]);

/**
 * Subscribe to every router state change (the same store useRouterState reads). Works outside
 * RouterProvider. Returns an unsubscribe function.
 */
export function subscribeRouterState(router, listener) {
	const store = router && router.stores && router.stores.__store;
	if (store && typeof store.subscribe === 'function') {
		const sub = store.subscribe(listener);
		return typeof sub === 'function' ? sub : () => sub && sub.unsubscribe && sub.unsubscribe();
	}
	if (router && typeof router.subscribe === 'function') {
		const offs = ['onLoad', 'onResolved', 'onBeforeLoad'].map((type) => router.subscribe(type, listener));
		return () => offs.forEach((off) => off());
	}
	return () => {};
}
