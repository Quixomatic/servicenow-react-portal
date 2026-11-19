// Preview of the component's latest build: POST /builds/{id}/preview gives the ComponentRef and
// default options; the build loads through the same runtime loader and registry as portal
// widgets, inside an error boundary, with stub portal/instance contexts.
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
// The host's React, loader and contexts (the registry): widgets are built against them, and
// this chunk has its own React copy, so previews render in a root owned by the host's React.
function host() {
	const registry = globalThis.__REACT_PORTAL__ || {};
	const modules = registry.modules || {};
	return { React: modules.react, ReactDOMClient: modules['react-dom/client'], internals: registry.internals || {} };
}
import { studioApi } from './studio-api';
import { isMock } from '#/runtime/api';
import { useStudio } from './store';

const PREVIEW_PORTAL = { id: 'studio-preview', slug: 'studio-preview', name: 'Studio preview', homeRoute: '', settings: {}, navigation: [] };

export default function PreviewPane({ studio, root, active }) {
	const build = useStudio(studio, (s) => s.build);
	const owner = useStudio(studio, (s) => s.owner);
	const version = useStudio(studio, (s) => s.previewVersion);
	const [state, setState] = useState({ status: 'idle' });
	const [refresh, setRefresh] = useState(0);
	const buildId = build && build.id;
	const usable = build && build.builtRevision > 0;

	useEffect(() => {
		if (!active) return undefined;
		if (!owner || owner.type !== 'component') {
			setState({ status: 'message', message: 'Preview renders components. Themes apply in portals.' });
			return undefined;
		}
		if (!buildId || !usable) {
			setState({ status: 'message', message: 'No successful build yet. Save to compile.' });
			return undefined;
		}
		let alive = true;
		setState((prev) => ({ ...prev, status: prev.Component ? 'refreshing' : 'loading' }));
		studioApi
			.preview(buildId)
			.then((ctx) => {
				const ref = ctx.component;
				if (!ref || !ref.build || !ref.build.js) throw new Error('The build has no client output');
				return host().internals.loadBuild(ref.build).then((loaded) => ({ ctx, ref, loaded }));
			})
			.then(({ ctx, ref, loaded }) => {
				if (!alive) return;
				if (loaded.cssText) host().internals.ensureStyle(root, `preview:${ref.build.id}`, loaded.cssText, 'widget');
				setState({ status: 'ready', Component: loaded.Component, ref, options: ctx.options || {}, at: new Date().toLocaleTimeString() });
				studio.log('info', `Preview updated (build ${ref.build.id}, revision ${ctx.owner ? ctx.owner.revision : '?'})`);
			})
			.catch((error) => {
				if (!alive) return;
				setState({ status: 'error', error });
				studio.log('error', `Preview failed: ${error.message}`);
			});
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, buildId, usable, version, refresh, owner && owner.id]);

	return (
		<div className="rps-preview" style={{ display: active ? 'block' : 'none' }} data-rps-preview="">
			<div className="rps-preview-bar">
				<span>Preview · latest build{state.at ? ` · ${state.at}` : ''}</span>
				{build && build.state === 'failed' ? <span style={{ color: 'var(--rps-error)' }}>last compile failed: showing the previous good build</span> : null}
				{isMock() ? <span style={{ color: 'var(--rps-muted)' }}>mock: TSX isn't compiled offline, so this runs a pre-built module (styles.css edits do apply)</span> : null}
				<span style={{ flex: 1 }} />
				<button className="rps-icon-btn" title="Reload preview" onClick={() => setRefresh((n) => n + 1)}>
					<RefreshCw size={14} className={state.status === 'loading' || state.status === 'refreshing' ? 'rps-spin' : ''} />
				</button>
			</div>
			{state.status === 'message' ? <div className="rps-preview-msg">{state.message}</div> : null}
			{state.status === 'loading' ? <div className="rps-preview-msg">Loading the build…</div> : null}
			{state.status === 'error' ? <div className="rps-preview-msg" style={{ color: 'var(--rps-error)' }}>{String(state.error && state.error.message)}</div> : null}
			{state.Component && (state.status === 'ready' || state.status === 'refreshing') ? (
				<PreviewStage key={`${state.ref.build.id}:${state.ref.build.js}`} Component={state.Component} componentRef={state.ref} options={state.options} studio={studio} />
			) : null}
		</div>
	);
}

/** Mounts a host-React root and renders the widget there with host contexts. */
function PreviewStage({ Component, componentRef, options, studio }) {
	const ref = useRef(null);
	const rootRef = useRef(null);
	const storeRef = useRef(null);

	useEffect(() => {
		const { ReactDOMClient } = host();
		if (!ref.current || !ReactDOMClient) return undefined;
		rootRef.current = ReactDOMClient.createRoot(ref.current);
		return () => {
			const r = rootRef.current;
			rootRef.current = null;
			setTimeout(() => r && r.unmount(), 0);
		};
	}, []);

	useEffect(() => {
		const { React: H, internals } = host();
		const r = rootRef.current;
		if (!r || !H || !internals.PortalContext) return;
		if (!storeRef.current) storeRef.current = internals.createStore({ mode: 'portal', portalSlug: PREVIEW_PORTAL.slug, page: '', recordId: '', q: '', query: {}, raw: {} });
		const navigate = (to, opts) =>
			studio.log('info', `Preview: navigation to "${typeof to === 'string' ? to : JSON.stringify(to)}"${opts && opts.recordId ? ` (record ${opts.recordId})` : ''} ignored`);
		const portal = { slug: PREVIEW_PORTAL.slug, portal: PREVIEW_PORTAL, pages: [], theme: null, release: null, navigate, locationStore: storeRef.current, router: null, getPath: () => '' };
		const placement = { id: 'studio-preview', region: 'main', order: 0, component: componentRef, options };
		const instance = { placement, component: componentRef, options, scope: 'preview' };
		const isLayout = componentRef.kind === 'layout';
		const h = H.createElement;
		const widget = isLayout ? h(Component, { regions: componentRef.regions || [] }) : h(Component, { instanceId: 'studio-preview', options, region: 'main' });
		const tree = h(
				internals.NavigationContext.Provider,
				{ value: navigate },
				h(
					internals.PortalContext.Provider,
					{ value: portal },
					h(
						internals.WidgetInstanceContext.Provider,
						{ value: instance },
						h(
							internals.WidgetErrorBoundary,
							{ label: componentRef.uniqueId || 'preview' },
							h('div', { 'data-rp-widget': componentRef.build.id, 'data-rp-placement': 'studio-preview' }, widget)
						)
					)
				)
			);
		// Data hooks (useRecord, useProperty, …) need the host's page-level query cache.
		r.render(internals.QueryClientProvider ? h(internals.QueryClientProvider, { client: internals.queryClient }, tree) : tree);
	}, [Component, componentRef, options, studio]);

	return (
		<div className="rps-preview-stage" data-rp-root="">
			<div ref={ref} />
			{componentRef.kind === 'layout' ? <div className="rps-preview-msg">Layouts render their regions inside a portal; regions are empty here.</div> : null}
		</div>
	);
}
