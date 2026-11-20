// Live preview: components:app/docs-content (the real renderer) in a host-React root, with the
// page header the docs portal shows (title + description; the source's leading # heading skipped).
import React, { useEffect, useRef, useState } from 'react';
import { useHostTextStyle } from '../host-text';
import { host } from './host-modules';

const STUB = { id: 'studio-docs', slug: 'studio-docs', name: 'Studio', homeRoute: '', settings: {}, navigation: [] };

/** Debounced value. */
function useDebounced(value, ms) {
	const [v, setV] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setV(value), ms);
		return () => clearTimeout(t);
	}, [value, ms]);
	return v;
}

export default function DocsPreview({ renderer, markdown, title, description, path, anchor, studio, root }) {
	const hostText = useHostTextStyle(root);
	const ref = useRef(null);
	const scrollRef = useRef(null);
	const rootRef = useRef(null);
	const storeRef = useRef(null);
	const md = useDebounced(markdown, 200);

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
		if (!r || !H || !internals.PortalContext || !renderer) return;
		if (!storeRef.current) storeRef.current = internals.createStore({ mode: 'portal', portalSlug: STUB.slug, page: path || 'index', recordId: '', q: '', query: {}, raw: {} });
		const navigate = (to) => studio.log('info', `Docs preview: link to "${typeof to === 'string' ? to : JSON.stringify(to)}" (not followed in the preview)`);
		const portalCtx = { slug: STUB.slug, portal: STUB, pages: [], theme: null, release: null, navigate, locationStore: storeRef.current, router: null, getPath: () => '' };
		const placement = { id: 'studio-docs', region: 'main', order: 0, component: renderer.ref, options: {} };
		const instance = { placement, component: renderer.ref, options: {}, scope: 'studio' };
		const h = H.createElement;
		const header = h(
			'header',
			{ className: 'rpd-docs-preview-head' },
			h('h1', null, title || 'Untitled'),
			description ? h('p', null, description) : null
		);
		const tree = h(
			internals.NavigationContext.Provider,
			{ value: navigate },
			h(
				internals.PortalContext.Provider,
				{ value: portalCtx },
				h(
					internals.WidgetInstanceContext.Provider,
					{ value: instance },
					h(
						internals.WidgetErrorBoundary,
						{ label: 'docs preview' },
						h('div', { 'data-rp-widget': renderer.ref.build.id, 'data-rp-placement': 'studio-docs', className: 'rpd-docs-preview-page' }, header, h(renderer.Component, { markdown: md || '', path: path || 'index', skipTitle: true }))
					)
				)
			)
		);
		r.render(internals.QueryClientProvider ? h(internals.QueryClientProvider, { client: internals.queryClient }, tree) : tree);
	}, [renderer, md, title, description, path, studio]);

	// Scroll to the requested anchor (deep link q anchor, link picker, heading clicks).
	useEffect(() => {
		if (!anchor || !scrollRef.current) return undefined;
		const t = setTimeout(() => {
			const box = scrollRef.current;
			const el = box && box.querySelector('[id="' + (window.CSS && CSS.escape ? CSS.escape(anchor) : anchor) + '"]');
			if (el) box.scrollTo({ top: el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12, behavior: 'smooth' });
		}, 250);
		return () => clearTimeout(t);
	}, [anchor, md]);

	return (
		<div className="rpd-docs-preview" ref={scrollRef} data-rpd-docs-preview="" data-docs-scroller="">
			<div className="rps-host-content rpd-docs-preview-inner" style={hostText} data-rp-root="">
				<div ref={ref} />
			</div>
		</div>
	);
}
