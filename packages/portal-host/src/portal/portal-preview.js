// The real portal runtime, driven by props instead of UI Builder: Portal Studio's page designer
// mounts it (through registry internals, with the host's React) to render a page exactly as the
// portal does: same router, layout, regions, loader, theme and light/dark. Navigation inside the
// preview goes to `onNavigate` instead of the platform.
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '#/runtime/query-client';
import { LocationStoreContext } from '#/runtime/contexts';
import { NavigationContext } from '#/runtime/navigation';
import { normalizeLocation } from '#/runtime/location';
import { createStore } from '#/runtime/store';
import { PortalBoot } from './portal-app';

function locationOf(slug, page) {
	return normalizeLocation({ mode: 'portal', portalSlug: slug, page: page || '', recordId: '', q: '' }, '');
}

/**
 * <PortalPreview slug page version target height onNavigate />
 *   version   bump after a design write: the portal re-bootstraps and re-renders (builds and theme
 *             CSS are cached, so this is quick)
 *   target    the shadow root styles go into
 */
export function PortalPreview({ slug, page, version, target, height, onNavigate }) {
	const [store] = useState(() => createStore(locationOf(slug, page)));
	useLayoutEffect(() => {
		store.set(locationOf(slug, page));
	}, [store, slug, page]);
	const navigate = useMemo(() => (to, opts) => onNavigate && onNavigate(to, opts), [onNavigate]);
	return (
		<QueryClientProvider client={queryClient}>
			<LocationStoreContext.Provider value={store}>
				<NavigationContext.Provider value={navigate}>
					<div data-rp-root="" data-rp-preview-root="" className="relative flex flex-col" style={{ minHeight: height || '100%' }}>
						<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]" data-rp-layout-frame="">
							{slug && target ? <PortalBoot key={`${slug}:${version || 0}`} slug={slug} target={target} embedded /> : null}
						</div>
					</div>
				</NavigationContext.Provider>
			</LocationStoreContext.Provider>
		</QueryClientProvider>
	);
}

/** Drop cached runtime data for a portal, so the next render fetches the published state. */
export function invalidatePortal(slug) {
	queryClient.removeQueries({ queryKey: ['rp', 'bootstrap', slug] });
	queryClient.removeQueries({ queryKey: ['rp', 'page', slug] });
	queryClient.removeQueries({ queryKey: ['rp', 'init', slug] });
}
