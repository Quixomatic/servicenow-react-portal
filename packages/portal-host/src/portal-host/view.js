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

// Portal Studio is a separate chunk: only mode = studio downloads CodeMirror, allotment and the
// editor (spec §12). The deployed chunk is a standalone bundle with its own React, so it mounts
// its own root into a container here (see src/portal-studio.js) and gets only plain objects.
function Studio({ locationStore, navigate }) {
	const containerRef = useRef(null);
	const [state, setState] = useState({ status: 'loading' });
	useEffect(() => {
		let alive = true;
		let handle = null;
		import(/* webpackChunkName: "portal-studio" */ '../portal-studio')
			.then((mod) => {
				if (!alive || !containerRef.current) return;
				const mount = mod.mount || mod.default;
				handle = mount(containerRef.current, { locationStore, navigate, root: containerRef.current.getRootNode() });
				setState({ status: 'ready' });
			})
			.catch((error) => alive && setState({ status: 'error', error }));
		return () => {
			alive = false;
			// Unmount the other root outside this commit.
			if (handle) setTimeout(() => handle.unmount(), 0);
		};
	}, [locationStore, navigate]);
	return (
		<>
			{state.status === 'loading' ? <StudioPlaceholder loading /> : null}
			{state.status === 'error' ? <StudioPlaceholder error={state.error} /> : null}
			<div ref={containerRef} data-rps-container="" />
		</>
	);
}

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
						{location.mode === 'studio' ? <Studio locationStore={locationStore} navigate={navigate} /> : <PortalApp portalSlug={location.portalSlug} hostId={instanceId} />}
					</div>
				</NavigationContext.Provider>
			</LocationStoreContext.Provider>
		</QueryClientProvider>
	);
}
