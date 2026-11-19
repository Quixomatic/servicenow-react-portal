import React, { memo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAvailableHeight } from '#/runtime/use-available-height';
import { useNavigate } from '#/runtime/navigation';
import { styleTarget } from '#/runtime/styles';
import { useDiagCounter } from '#/runtime/diag-hooks';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import DiagnosticsPanel from './diagnostics-panel';
import { PortalRouterHost, bootstrapQuery, toRouterPath } from './portal-router';

// The page frame is the `rp-page` size container: instance CSS (placement.css) answers its
// tablet/mobile container queries, so in the designer the device-width frame renders exactly.
const PAGE_CONTAINER = Object.freeze({ containerType: 'inline-size', containerName: 'rp-page' });

const KNOWN_PORTALS = ['sp', 'crm', 'app'];

/**
 * Portal mode. Memoized on (portalSlug, hostId): property changes within a portal never
 * re-render it; they reach the router through the host's location store instead.
 */
const PortalApp = memo(function PortalApp({ portalSlug, hostId }) {
	useDiagCounter('PortalApp', { portalSlug, hostId });
	const [target, setTarget] = useState(null);
	const [rootEl, setRootEl] = useState(null);
	const height = useAvailableHeight(rootEl);
	const setRoot = useCallback((el) => {
		if (el) {
			setTarget(styleTarget(el));
			setRootEl(el);
		}
	}, []);

	// The root fills the visible viewport below the host's top edge. Inside it, the layout sits
	// in a one-cell grid frame, so the layout's root stretches to the full width and height and
	// its main region gets all the space the other regions leave; main scrolls only after that.
	return (
		<div ref={setRoot} data-rp-root="" className="relative flex flex-col overflow-hidden" style={{ height }}>
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]" style={PAGE_CONTAINER} data-rp-layout-frame="">
				{!portalSlug ? <NoPortal /> : target ? <PortalBoot key={portalSlug} slug={portalSlug} target={target} /> : null}
			</div>
			<DiagnosticsPanel hostId={hostId} target={target} />
		</div>
	);
});

export default PortalApp;

/** Bootstrap the portal, then build its router (rebuilt only if the page routes change). */
export function PortalBoot({ slug, target, embedded, sidebarStore }) {
	const boot = useQuery(bootstrapQuery(slug));
	useDiagCounter('PortalBoot', { slug, data: boot.data });
	if (boot.isError) return <BootError slug={slug} error={boot.error} />;
	if (!boot.data) return <div className="bg-muted/60 m-4 h-40 animate-pulse rounded-xl" data-rp-booting="" />;
	const routesKey = (boot.data.pages || []).map((p) => toRouterPath(p.route)).join('|') + '#' + ((boot.data.layout && boot.data.layout.id) || '');
	return <PortalRouterHost key={routesKey} slug={slug} boot={boot.data} target={target} embedded={embedded} sidebarStore={sidebarStore} />;
}

function PortalSwitchButtons({ current }) {
	const navigate = useNavigate();
	return (
		<div className="flex gap-2">
			{KNOWN_PORTALS.filter((p) => p !== current).map((p) => (
				<Button key={p} variant="outline" size="sm" onClick={() => navigate('', { portalSlug: p })}>
					Open {p}
				</Button>
			))}
		</div>
	);
}

function NoPortal() {
	return (
		<div className="p-4">
			<Card>
				<CardHeader>
					<CardTitle>No portal selected</CardTitle>
					<CardDescription>The Portal slug property is empty. Bind it to the page's portal URL parameter.</CardDescription>
				</CardHeader>
				<CardContent>
					<PortalSwitchButtons />
				</CardContent>
			</Card>
		</div>
	);
}

function BootError({ slug, error }) {
	return (
		<div className="p-4">
			<Card>
				<CardHeader>
					<CardTitle>Portal "{slug}" could not load</CardTitle>
					<CardDescription className="text-destructive font-mono break-all">{String((error && error.message) || error)}</CardDescription>
				</CardHeader>
				<CardContent>
					<PortalSwitchButtons current={slug} />
				</CardContent>
			</Card>
		</div>
	);
}

