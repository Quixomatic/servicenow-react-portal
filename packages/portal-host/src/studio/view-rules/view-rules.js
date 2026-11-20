// Studio "View rules" activity: portal view rules (x_312987_portal_view_rule) per portal.
// The editor itself is the record component app/view-rules-editor (built on the portal primitives:
// condition builder, comboboxes, the explain/test panel). It loads through the host's loader and
// renders with the host's React and contexts, like the component preview.
import React, { useEffect, useRef, useState } from 'react';
import { studioApi } from '../studio-api';
import { isMock } from '#/runtime/api';
import { useHostTextStyle } from '../host-text';
import { useActivityState } from '../deep-link/registry';
import { selectViewRulesPortal, viewRulesState } from './location';

const EDITOR_ID = 'app/view-rules-editor';

function host() {
	const registry = globalThis.__REACT_PORTAL__ || {};
	const modules = registry.modules || {};
	return { React: modules.react, ReactDOMClient: modules['react-dom/client'], internals: registry.internals || {} };
}

export default function ViewRules({ studio, root }) {
	const [portals, setPortals] = useState(null);
	// The open portal and rule: the deep-link state (./location.js), so links can set them.
	const portal = useActivityState(viewRulesState, (s) => s.portalId);
	const rule = useActivityState(viewRulesState, (s) => s.ruleId);
	const setPortal = (id) => selectViewRulesPortal((portals || []).find((p) => p.id === id));
	const [state, setState] = useState({ status: 'loading' });

	useEffect(() => {
		let alive = true;
		Promise.all([studioApi.listPortals(), studioApi.listComponents()])
			.then(([plist, comps]) => {
				if (!alive) return;
				const list = Array.isArray(plist) ? plist : [];
				setPortals(list);
				const def = list.find((p) => p.isDefault) || list[0];
				if (!viewRulesState.get().portalId && def) selectViewRulesPortal(def);
				const comp = (Array.isArray(comps) ? comps : []).find((c) => c.uniqueId === EDITOR_ID);
				if (!comp || !comp.build || !(comp.build.builtRevision > 0)) {
					setState({ status: 'message', message: `The editor component (${EDITOR_ID}) has no build yet. Seed it, then reload.` });
					return null;
				}
				return studioApi.preview(comp.build.id).then((ctx) => {
					const ref = ctx.component;
					if (!ref || !ref.build || !ref.build.js) throw new Error('The editor build has no client output');
					const { loadComponent } = host().internals;
					return loadComponent(ref).then((loaded) => {
						if (!alive) return;
						if (loaded.cssText) host().internals.ensureStyle(root, `view-rules:${ref.build.id}`, loaded.cssText, 'widget');
						setState({ status: 'ready', Component: loaded.Component, ref });
					});
				});
			})
			.catch((error) => alive && setState({ status: 'error', message: (error && error.message) || String(error) }));
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="rps-view-rules" style={{ height: '100%', overflow: 'auto' }} data-rps-view-rules="">
			<div className="rps-preview-bar" style={{ gap: 8 }}>
				<span>View rules</span>
				<label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
					<span style={{ color: 'var(--rps-muted)' }}>Portal</span>
					<select value={portal} onChange={(e) => setPortal(e.target.value)} disabled={!portals} data-rps-view-rules-portal="">
						{(portals || []).map((p) => (
							<option key={p.id} value={p.id}>
								{p.name} (/{p.slug})
							</option>
						))}
					</select>
				</label>
				{isMock() ? <span style={{ color: 'var(--rps-muted)' }}>mock: view rules need the instance</span> : null}
			</div>
			{state.status === 'loading' ? <div className="rps-preview-msg">Loading the view rules editor…</div> : null}
			{state.status === 'message' ? <div className="rps-preview-msg">{state.message}</div> : null}
			{state.status === 'error' ? <div className="rps-preview-msg" style={{ color: 'var(--rps-error)' }}>{state.message}</div> : null}
			{state.status === 'ready' && portal ? <EditorStage key={portal} Component={state.Component} componentRef={state.ref} portal={portal} rule={rule} studio={studio} root={root} /> : null}
		</div>
	);
}

/** Mounts a host-React root and renders the editor with host contexts (as the preview does). */
function EditorStage({ Component, componentRef, portal, rule, studio, root }) {
	const hostText = useHostTextStyle(root);
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
		if (!storeRef.current) storeRef.current = internals.createStore({ mode: 'portal', portalSlug: 'studio-view-rules', page: '', recordId: '', q: '', query: {}, raw: {} });
		const navigate = (to) => studio.log('info', `View rules: navigation to "${typeof to === 'string' ? to : JSON.stringify(to)}" ignored`);
		const stub = { id: 'studio-view-rules', slug: 'studio-view-rules', name: 'Studio', homeRoute: '', settings: {}, navigation: [] };
		const portalCtx = { slug: stub.slug, portal: stub, pages: [], theme: null, release: null, navigate, locationStore: storeRef.current, router: null, getPath: () => '' };
		// rule / onSelectRule: the selected rule follows the URL (q rule=<sys_id>) both ways.
		const options = { portal, rule: rule || '', onSelectRule: (id) => viewRulesState.get().ruleId !== (id || '') && viewRulesState.set({ ruleId: id || '' }) };
		const placement = { id: 'studio-view-rules', region: 'main', order: 0, component: componentRef, options };
		const instance = { placement, component: componentRef, options, scope: 'studio' };
		const h = H.createElement;
		const tree = h(
			internals.NavigationContext.Provider,
			{ value: navigate },
			h(
				internals.PortalContext.Provider,
				{ value: portalCtx },
				h(
					internals.WidgetInstanceContext.Provider,
					{ value: instance },
					h(internals.WidgetErrorBoundary, { label: EDITOR_ID }, h('div', { 'data-rp-widget': componentRef.build.id, 'data-rp-placement': 'studio-view-rules' }, h(Component, { instanceId: 'studio-view-rules', options, region: 'main' })))
				)
			)
		);
		r.render(internals.QueryClientProvider ? h(internals.QueryClientProvider, { client: internals.queryClient }, tree) : tree);
	}, [Component, componentRef, portal, rule, studio]);

	return (
		<div className="rps-host-content" style={hostText} data-rp-root="">
			<div ref={ref} />
		</div>
	);
}
