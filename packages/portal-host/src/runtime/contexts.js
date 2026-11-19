import { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react';
import { leafData, subscribeRouterState } from './page-state';

// Per-host store of the normalized location (location.js). Stable identity: a property change
// updates the store, it never changes the context value, so nothing re-renders unless it reads
// the location.
export const LocationStoreContext = createContext(null);

/** The normalized location; re-renders the caller on every property change. */
export function usePortalLocation() {
	const store = useContext(LocationStoreContext);
	return useSyncExternalStore(store ? store.subscribe : noopSubscribe, () => (store ? store.get() : null), () => null);
}

// Stable portal value (per router): { portal, pages, theme, release, slug, router, navigate,
// locationStore, getPath }.
export const PortalContext = createContext(null);

/**
 * Runtime contract: { portal, pages, theme, page, release } (+ path, location, navigate).
 * `page`, `path` and `location` are tracked getters: a component subscribes to page or location
 * changes only once it reads them, so portal-level widgets that don't care about the current
 * page are not re-rendered by navigation.
 */
export function usePortal() {
	const ctx = useContext(PortalContext);
	const tracked = useRef({ page: false, location: false });
	const router = ctx ? ctx.router : null;
	const locationStore = ctx ? ctx.locationStore : null;

	// Subscriptions are always made (hook order), but select null until the getter is read.
	const subscribeRouter = useCallback((listener) => subscribeRouterState(router, listener), [router]);
	useSyncExternalStore(subscribeRouter, () => (tracked.current.page && router ? leafData(router.state) : null), () => null);
	useSyncExternalStore(
		locationStore ? locationStore.subscribe : noopSubscribe,
		() => (tracked.current.location && locationStore ? locationStore.get() : null),
		() => null
	);

	if (!ctx) return null;
	return {
		portal: ctx.portal,
		pages: ctx.pages,
		theme: ctx.theme,
		release: ctx.release,
		navigate: ctx.navigate,
		get page() {
			tracked.current.page = true;
			const data = router ? leafData(router.state) : null;
			return data ? data.page : null;
		},
		get path() {
			tracked.current.page = true;
			const data = router ? leafData(router.state) : null;
			return data ? data.path : '';
		},
		get location() {
			tracked.current.location = true;
			return locationStore ? locationStore.get() : null;
		}
	};
}

// The effective layout and the portal-level placements per region (stable while the layout
// doesn't change): { layout, regions, outlets, mainRegion }.
export const LayoutContext = createContext(null);
export function useLayout() {
	return useContext(LayoutContext);
}

// The widget instance being rendered: { placement, component, options, scope }.
export const WidgetInstanceContext = createContext(null);
export function useWidgetInstance() {
	return useContext(WidgetInstanceContext);
}

// The block instance being rendered (kind = 'block'): { placement, scope, api }. <Region> inside a
// block renders that instance's children; useBlock() returns `api`. Widgets and layouts reset it.
export const BlockContext = createContext(null);
export function useBlockContext() {
	return useContext(BlockContext);
}

// Per-router store of batch-initialized instance data (instance-init.js).
export const InstanceInitContext = createContext(null);
export function useInstanceInit() {
	return useContext(InstanceInitContext);
}

function noopSubscribe() {
	return () => {};
}
