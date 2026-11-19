// TanStack Router (memory history) for one portal (spec §8.1).
//
//   root route   = the portal shell: theme, layout, portal-level regions. Loader: bootstrap.
//   page routes  = one per bootstrap page (orders/:id -> orders/$id, docs/* -> docs/$),
//                  plus "/" (home) and a catch-all. Loader: pages/resolve.
//
// The platform owns the browser URL: UI Builder properties drive the router through
// syncRouter() (replace, never dispatching), and outgoing navigation still dispatches
// PORTAL_NAVIGATE (runtime/navigation.js). A portal switch builds a new router.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	useLoaderData,
	useRouterState
} from '@tanstack/react-router';
import { queryClient } from '#/runtime/query-client';
import { getBootstrap, resolvePage } from '#/runtime/api';
import { InstanceInitContext, LocationStoreContext, PortalContext, useLayout } from '#/runtime/contexts';
import { useNavigate } from '#/runtime/navigation';
import { createInstanceInitStore, onLoadIds } from '#/runtime/instance-init';
import { loadCss } from '#/runtime/loader';
import { useThemeStyles } from '#/runtime/theme';
import { LayoutHost, PagePlacements, createOutletStore, mainRegionOf, prefetchBuilds } from '#/runtime/widgets';
import { searchParamsToObject, toSearchParams, safeDecode } from '#/runtime/location';
import { leafData } from '#/runtime/page-state';
import { useDiagCounter } from '#/runtime/diag-hooks';
import { clearActiveRouter, navNoop, navResolved, navStart, setActiveRouter } from '#/runtime/diagnostics';
import { Button } from '#/components/ui/button';
import { Toaster } from '#/components/ui/sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { resolvePath } from './router';

// ---- queries --------------------------------------------------------------------------------

export function bootstrapQuery(slug) {
	return { queryKey: ['rp', 'bootstrap', slug], queryFn: () => getBootstrap(slug), staleTime: 5 * 60_000, retry: false };
}

function pageQuery(slug, path) {
	return { queryKey: ['rp', 'page', slug, path], queryFn: () => resolvePage(slug, path), staleTime: 60_000, retry: false };
}

// ---- search and paths -----------------------------------------------------------------------

/** Plain-string search (URLSearchParams), not TanStack's JSON-ish default: "2" stays "2". */
export function parseSearch(search) {
	return searchParamsToObject(toSearchParams(search || ''));
}

export function stringifySearch(search) {
	const text = toSearchParams(search || {}).toString();
	return text ? '?' + text : '';
}

/** Router target for a normalized location: page '' -> '/', q -> search. */
export function targetOf(location) {
	const to = '/' + (location.page || '');
	const search = location.query || {};
	return { to, search, key: to + stringifySearch(search) };
}

function currentKey(router) {
	const l = router.state.location;
	return l ? safeDecode(l.pathname) + stringifySearch(l.search) : '';
}

function pathOf(pathname) {
	return safeDecode(String(pathname || '')).replace(/^\/+|\/+$/g, '');
}

/** orders/:id -> orders/$id, docs/* -> docs/$ (TanStack path syntax). */
export function toRouterPath(pattern) {
	const segments = String(pattern || '')
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean);
	return segments
		.map((seg, i) => {
			if (seg === '*' && i === segments.length - 1) return '$';
			if (seg.charAt(0) === ':') return '$' + (seg.slice(1).replace(/[^A-Za-z0-9_]/g, '_') || 'param');
			return seg;
		})
		.join('/');
}

/**
 * Incoming navigation: UI Builder properties changed. Navigate the router (replace, no
 * dispatch). Updates that match the current router location are ignored (loop safety).
 */
export function syncRouter(router, location, kind) {
	const target = targetOf(location);
	const from = currentKey(router);
	if (target.key === from) {
		navNoop(kind || 'props', from, target.key);
		return false;
	}
	navStart(kind || 'props', from, target.key);
	router.navigate({ to: target.to, search: target.search, replace: true }).catch((error) => {
		// eslint-disable-next-line no-console
		console.error('[react-portal] router navigation failed', error);
	});
	return true;
}

// ---- router ---------------------------------------------------------------------------------

/** Loader results get a stable identity per (data, path), so selectors don't churn. */
const withPathCache = new WeakMap();
function withPath(data, path) {
	let byPath = withPathCache.get(data);
	if (!byPath) withPathCache.set(data, (byPath = new Map()));
	if (!byPath.has(path)) byPath.set(path, { ...data, path });
	return byPath.get(path);
}

function placementsOf(regions) {
	const list = [];
	Object.keys(regions || {}).forEach((name) => (regions[name] || []).forEach((p) => list.push(p)));
	return list;
}

export function createPortalRouter({ slug, boot, target, locationStore, navigate, initialHref, embedded }) {
	const initStore = createInstanceInitStore(queryClient);
	let routerRef = null;

	const portalValue = {
		slug,
		portal: boot.portal,
		pages: boot.pages,
		theme: boot.theme,
		release: boot.release,
		navigate,
		locationStore,
		get router() {
			return routerRef;
		},
		getPath: () => {
			const data = routerRef ? leafData(routerRef.state) : null;
			return data ? data.path : resolvePath(boot.portal, '');
		},
		/** The signed-in user from the bootstrap (useUser). */
		user: boot.user || null,
		/** The host's shadow root (usePortalUtils().scrollTo). */
		shadowRoot: target,
		/**
		 * usePortalUtils().refresh(): refetch the current page manifest and all on-load data. The
		 * router keeps the current page on screen until the new data is in.
		 */
		async refresh() {
			queryClient.removeQueries({ queryKey: ['rp', 'page', slug] });
			queryClient.removeQueries({ queryKey: ['rp', 'init', slug] });
			if (routerRef) await routerRef.invalidate();
			await initStore.fetch(slug, resolvePath(boot.portal, ''), onLoadIds(boot.regions), 'portal');
		}
	};

	// Root: the shell. Never re-runs on page navigation (staleTime Infinity, shouldReload false).
	async function rootLoader() {
		const data = await queryClient.ensureQueryData(bootstrapQuery(slug));
		const theme = data.theme || {};
		await Promise.all([
			theme.cssText == null ? Promise.all((theme.css || []).map((url) => loadCss(url).catch(() => null))) : null,
			prefetchBuilds([data.layout].concat(placementsOf(data.regions).map((p) => p.component)))
		]);
		initStore.fetch(slug, resolvePath(data.portal, ''), onLoadIds(data.regions), 'portal');
		return null;
	}

	async function pageLoader({ location }) {
		const path = resolvePath(boot.portal, pathOf(location.pathname));
		const data = await queryClient.ensureQueryData(pageQuery(slug, path));
		await prefetchBuilds([data.layout].concat(placementsOf(data.regions).map((p) => p.component)));
		initStore.fetch(slug, path, onLoadIds(data.regions), 'page');
		return withPath(data, path);
	}

	function PortalShell() {
		useDiagCounter('RouterRoot');
		const themeReady = useThemeStyles(target, boot.theme);
		return (
			<PortalContext.Provider value={portalValue}>
				<InstanceInitContext.Provider value={initStore}>
					<RouterProgress />
					{themeReady ? <LayoutSwitch /> : <ShellSkeleton />}
					{/* usePortalUtils().addInfoMessage & co.: one toaster per portal, in the overlay layer. */}
					{embedded ? null : <Toaster position="top-right" richColors={false} closeButton />}

				</InstanceInitContext.Provider>
			</PortalContext.Provider>
		);
	}

	/** Picks the effective layout (page override or portal default); re-renders only if it changes. */
	function LayoutSwitch() {
		const layoutId = useRouterState({
			select: (state) => {
				const data = leafData(state);
				return (data && data.layout && data.layout.id) || '';
			}
		});
		useDiagCounter('LayoutSwitch', { layoutId });
		const value = useMemo(() => {
			let layout = boot.layout;
			if (layoutId && (!boot.layout || layoutId !== boot.layout.id)) {
				const data = routerRef ? leafData(routerRef.state) : null;
				if (data && data.layout) layout = data.layout;
			}
			return { layout, regions: boot.regions || {}, outlets: createOutletStore(), mainRegion: mainRegionOf(layout) };
		}, [layoutId]);
		return <LayoutHost value={value} />;
	}

	/** The matched page route: renders the page's placements for the layout's main region. */
	function PageRoute() {
		const data = useLoaderData({ strict: false });
		const layout = useLayout();
		useDiagCounter('PageRoute', { data });
		const main = layout ? layout.mainRegion : 'main';
		return <PagePlacements list={data && data.regions ? data.regions[main] : null} path={data ? data.path : ''} />;
	}

	const rootRoute = createRootRoute({
		component: PortalShell,
		loader: rootLoader,
		staleTime: Infinity,
		shouldReload: false
	});

	const pageOptions = {
		component: PageRoute,
		loader: pageLoader,
		errorComponent: PageErrorView,
		// Keep the previous page on screen while the next one loads; only after pendingMs does
		// main show a placeholder. A thin progress bar (RouterProgress) runs meanwhile.
		pendingComponent: MainPending,
		pendingMs: 4000,
		pendingMinMs: 400
	};

	const seen = new Set(['', '$']);
	const children = [createRoute({ getParentRoute: () => rootRoute, path: '/', ...pageOptions })];
	(boot.pages || []).forEach((page) => {
		const path = toRouterPath(page.route);
		if (seen.has(path)) return;
		seen.add(path);
		children.push(createRoute({ getParentRoute: () => rootRoute, path, ...pageOptions }));
	});
	// Anything else still asks the server (which answers 404 for unknown pages).
	children.push(createRoute({ getParentRoute: () => rootRoute, path: '$', ...pageOptions }));

	const router = createRouter({
		routeTree: rootRoute.addChildren(children),
		history: createMemoryHistory({ initialEntries: [initialHref] }),
		parseSearch,
		stringifySearch,
		defaultPreloadStaleTime: 0,
		defaultStructuralSharing: true
	});
	routerRef = router;
	return router;
}

// ---- host -----------------------------------------------------------------------------------

/**
 * Builds the router for one portal, loads the first location before mounting (no blank first
 * paint), then mirrors the host's location store into it.
 */
export function PortalRouterHost({ slug, boot, target, embedded }) {
	const locationStore = useContext(LocationStoreContext);
	const navigate = useNavigate();
	useDiagCounter('PortalRouterHost', { slug, boot, target });
	const [router] = useState(() =>
		createPortalRouter({ slug, boot, target, locationStore, navigate, initialHref: targetOf(locationStore.get()).key, embedded })
	);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setActiveRouter(router);
		let alive = true;
		const offResolved = router.subscribe('onResolved', (event) => {
			const loc = (event && event.toLocation) || router.state.resolvedLocation;
			navResolved(loc ? safeDecode(loc.pathname) + stringifySearch(loc.search) : null);
		});
		navStart('initial', null, targetOf(locationStore.get()).key);
		router.load().then(
			() => {
				if (!alive) return;
				setReady(true);
				syncRouter(router, locationStore.get(), 'props');
			},
			(error) => {
				// eslint-disable-next-line no-console
				console.error('[react-portal] initial route load failed', error);
				if (alive) setReady(true);
			}
		);
		const offLocation = locationStore.subscribe(() => syncRouter(router, locationStore.get(), 'props'));
		return () => {
			alive = false;
			offResolved();
			offLocation();
			clearActiveRouter(router);
		};
	}, [router, locationStore]);

	if (!ready) return <ShellSkeleton />;
	return <RouterProvider router={router} />;
}

// ---- small views ----------------------------------------------------------------------------

/** Thin progress bar while the router loads; the only thing that re-renders on pending. */
function RouterProgress() {
	const busy = useRouterState({ select: (state) => state.status === 'pending' || !!state.isLoading });
	return busy ? <div className="bg-primary/70 pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse" data-rp-progress="" /> : null;
}

function ShellSkeleton() {
	return <div className="bg-muted/60 m-4 h-40 animate-pulse rounded-xl" data-rp-booting="" />;
}

function MainPending() {
	return <div className="bg-muted/60 h-32 animate-pulse rounded-xl" data-rp-page-pending="" />;
}

function PageErrorView({ error }) {
	const navigate = useNavigate();
	return (
		<Card data-rp-page-error="">
			<CardHeader>
				<CardTitle>{error && error.status === 404 ? 'Page not found' : 'Page could not load'}</CardTitle>
				<CardDescription className="font-mono break-all">{String((error && error.message) || error)}</CardDescription>
			</CardHeader>
			<CardContent>
				<Button variant="outline" size="sm" onClick={() => navigate('')}>
					Go to the portal home
				</Button>
			</CardContent>
		</Card>
	);
}
