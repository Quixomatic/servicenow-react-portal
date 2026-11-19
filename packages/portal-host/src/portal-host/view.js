import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '#/runtime/query-client';
import { useNormalizedLocation } from '#/runtime/use-normalized-location';
import { NavigationContext, createNavigate } from '#/runtime/navigation';
import { LocationStoreContext } from '#/runtime/contexts';
import { rawKey } from '#/runtime/location';
import { createStore } from '#/runtime/store';
import { useDiagCounter } from '#/runtime/diag-hooks';
import { nextInstanceId, recordMount, recordProperties, recordUnmount } from '#/runtime/diagnostics';
import PortalApp from '#/portal/portal-app';
import StudioPlaceholder from '#/studio/studio-placeholder';

// Host view: normalize the properties once, publish them through a per-instance store, pick the
// mode. The view re-renders on every property change; nothing below it does unless it reads
// the location (usePortalLocation / usePortal().location) or the router moves.
export default function PortalHostView({ properties, dispatch }) {
	const location = useNormalizedLocation(properties);
	const [instanceId] = useState(nextInstanceId);
	useDiagCounter(`host:${instanceId}`, { location });

	const lastKey = useRef(null);
	const key = rawKey(properties);
	if (lastKey.current !== key) {
		lastKey.current = key;
		recordProperties(instanceId, location.raw);
	}

	// Stable for the life of the instance: a store for the location, and a navigate() that
	// reads the current portal and dispatch at call time.
	const [locationStore] = useState(() => createStore(location));
	const dispatchRef = useRef(dispatch);
	dispatchRef.current = dispatch;
	const [navigate] = useState(() =>
		createNavigate((type, payload) => dispatchRef.current(type, payload), {
			get portalSlug() {
				return locationStore.get().portalSlug;
			}
		})
	);

	// Before paint: subscribers (the router sync, location readers) see the new location.
	useLayoutEffect(() => {
		locationStore.set(location);
	}, [location, locationStore]);

	const rootRef = useRef(null);
	useEffect(() => {
		const host = rootRef.current && rootRef.current.getRootNode && rootRef.current.getRootNode().host;
		recordMount(instanceId, `${location.portalSlug || '(no portal)'}/${location.page || '(home)'}`, host ? host.tagName.toLowerCase() : undefined);
		return () => recordUnmount(instanceId);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<QueryClientProvider client={queryClient}>
			<LocationStoreContext.Provider value={locationStore}>
				<NavigationContext.Provider value={navigate}>
					<div ref={rootRef} className="contents" data-rp-host-root="">
						{location.mode === 'studio' ? <StudioPlaceholder /> : <PortalApp portalSlug={location.portalSlug} hostId={instanceId} />}
					</div>
				</NavigationContext.Provider>
			</LocationStoreContext.Provider>
		</QueryClientProvider>
	);
}
