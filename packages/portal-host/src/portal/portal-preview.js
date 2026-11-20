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
import { createSidebarStore } from '#/runtime/sidebar';
import { MenuPreviewContext } from '#/runtime/use-navigation';
import { OverlayContainerContext } from '#/runtime/overlay';
import { PortalBoot } from './portal-app';
import { LiveContext, LIVE_OFF } from '#/runtime/record-watch';

// The page frame is the `rp-page` size container: instance CSS (placement.css) answers its
// tablet/mobile container queries, so in the designer the device-width frame renders exactly.
const LIVE_ON_PREVIEW = Object.freeze({ enabled: true });

const PAGE_CONTAINER = Object.freeze({ containerType: 'inline-size', containerName: 'rp-page' });

function locationOf(slug, page) {
    return normalizeLocation({ mode: 'portal', portalSlug: slug, page: page || '', recordId: '', q: '' }, '');
}

/**
 * <PortalPreview slug page version target height onNavigate menus? sidebarOpen? />
 *   menus        { [key]: NavItem[] }: replaces those bootstrap menus (Studio's Menus preview)
 *   sidebarOpen  true / false: drives the shell sidebar (expanded / icon rail) in memory, without
 *                touching the portal's persisted state; undefined = the portal's own state
 *   version   bump after a design write: the portal re-bootstraps and re-renders (builds and theme
 *             CSS are cached, so this is quick)
 *   target    the shadow root styles go into
 *   liveData  true: widgets' record watches (AMB live updates) run; default off in the designer so
 *             edits don't churn subscriptions or refetch while you work
 */
export function PortalPreview({ slug, page, version, target, height, onNavigate, menus, sidebarOpen, liveData }) {
    const [store] = useState(() => createStore(locationOf(slug, page)));
    const controlled = sidebarOpen !== undefined && sidebarOpen !== null;
    const [sidebarStore] = useState(() =>
        controlled ? createSidebarStore(`preview:${slug}`, { persist: false, defaultOpen: !!sidebarOpen }) : null
    );
    useLayoutEffect(() => {
        if (sidebarStore && controlled) sidebarStore.get().setOpen(!!sidebarOpen);
    }, [sidebarStore, controlled, sidebarOpen]);
    useLayoutEffect(() => {
        store.set(locationOf(slug, page));
    }, [store, slug, page]);
    const navigate = useMemo(() => (to, opts) => onNavigate && onNavigate(to, opts), [onNavigate]);
    // Its own overlay layer: this root has no renderer context, so dropdowns etc. portal here.
    const [overlay, setOverlay] = useState(null);
    return (
        <LiveContext.Provider value={liveData ? LIVE_ON_PREVIEW : LIVE_OFF}>
            <QueryClientProvider client={queryClient}>
                <LocationStoreContext.Provider value={store}>
                    <NavigationContext.Provider value={navigate}>
                        <div
                            data-rp-root=""
                            data-rp-preview-root=""
                            className="relative flex flex-col"
                            style={{ minHeight: height || '100%' }}
                        >
                            <div
                                className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]"
                                style={PAGE_CONTAINER}
                                data-rp-layout-frame=""
                            >
                                {slug && target ? (
                                    <OverlayContainerContext.Provider value={overlay}>
                                        <MenuPreviewContext.Provider value={menus || null}>
                                            <PortalBoot
                                                key={`${slug}:${version || 0}`}
                                                slug={slug}
                                                target={target}
                                                embedded
                                                sidebarStore={sidebarStore}
                                            />
                                        </MenuPreviewContext.Provider>
                                    </OverlayContainerContext.Provider>
                                ) : null}
                            </div>
                            <div
                                ref={setOverlay}
                                className="absolute inset-x-0 top-0 z-50 h-0"
                                data-rp-preview-overlay=""
                            />
                        </div>
                    </NavigationContext.Provider>
                </LocationStoreContext.Provider>
            </QueryClientProvider>
        </LiveContext.Provider>
    );
}

/** Drop cached runtime data for a portal, so the next render fetches the published state. */
export function invalidatePortal(slug) {
    queryClient.removeQueries({ queryKey: ['rp', 'bootstrap', slug] });
    queryClient.removeQueries({ queryKey: ['rp', 'page', slug] });
    queryClient.removeQueries({ queryKey: ['rp', 'init', slug] });
}
