import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { LayoutContext, PortalContext, WidgetInstanceContext, useInstanceInit, useLayout, useWidgetInstance } from './contexts';
import { loadBuild, peekBuild } from './loader';
import { ensureStyle, styleTarget } from './styles';
import { executeInstance } from './api';
import { useInstanceRecord } from './instance-init';
import { useDiagCounter } from './diag-hooks';
import { EMPTY_LIST, leafData } from './page-state';

// ---- error boundary -------------------------------------------------------------------------

/** One per widget instance: a crash shows a placeholder instead of taking down the page. */
export class WidgetErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error) {
		// eslint-disable-next-line no-console
		console.error(`[react-portal] widget ${this.props.label} crashed`, error);
	}

	render() {
		if (this.state.error) {
			if (this.props.fallback) return this.props.fallback(this.state.error, () => this.setState({ error: null }));
			return <WidgetPlaceholder label={this.props.label} error={this.state.error} onRetry={() => this.setState({ error: null })} />;
		}
		return this.props.children;
	}
}

export function WidgetPlaceholder({ label, error, onRetry }) {
	return (
		<div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border border-dashed p-3 text-xs" data-rp-placeholder="">
			<div className="font-semibold">Widget {label} failed</div>
			<div className="mt-1 font-mono break-all">{String((error && error.message) || error)}</div>
			{onRetry ? (
				<button type="button" className="mt-2 underline" onClick={onRetry}>
					Retry
				</button>
			) : null}
		</div>
	);
}

// ---- module loading -------------------------------------------------------------------------

/** Loads a component's build. { status: 'loading'|'ready'|'error'|'empty', Component, cssText, error } */
export function useComponentModule(componentRef) {
	const build = componentRef && componentRef.build;
	const key = build ? `${build.id}|${build.js}|${build.css}` : '';
	const [state, setState] = useState(() => initialState(build));

	useEffect(() => {
		if (!build || !build.js) {
			setState((prev) => (prev.status === 'empty' ? prev : { status: 'empty' }));
			return undefined;
		}
		const cached = peekBuild(build);
		if (cached) {
			setState((prev) => (prev.status === 'ready' && prev.Component === cached.Component ? prev : { status: 'ready', ...cached }));
			return undefined;
		}
		let alive = true;
		setState({ status: 'loading' });
		loadBuild(build).then(
			(loaded) => alive && setState({ status: 'ready', ...loaded }),
			(error) => alive && setState({ status: 'error', error })
		);
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	return state;
}

function initialState(build) {
	if (!build || !build.js) return { status: 'empty' };
	const cached = peekBuild(build);
	return cached ? { status: 'ready', ...cached } : { status: 'loading' };
}

/** Prefetch builds (JS + CSS) so a page renders complete; failures surface later in the slot. */
export function prefetchBuilds(componentRefs) {
	return Promise.all(
		(componentRefs || []).filter((c) => c && c.build && c.build.js).map((c) => loadBuild(c.build).catch(() => null))
	);
}

/**
 * Wraps an authored function component so its renders are counted under `name` (its hooks run
 * inside the wrapper, so its own state updates are counted too). Classes and exotic components
 * ($$typeof) are rendered as they are.
 */
function useCountedComponent(Component, name) {
	return useMemo(() => {
		if (typeof Component !== 'function' || (Component.prototype && Component.prototype.isReactComponent)) return Component;
		function CountedWidget(props) {
			useDiagCounter(name, props);
			return Component(props);
		}
		CountedWidget.displayName = `Counted(${Component.displayName || Component.name || 'Widget'})`;
		return CountedWidget;
	}, [Component, name]);
}

// ---- widget slot ----------------------------------------------------------------------------

/**
 * Renders one placement: loads its build, injects its CSS, provides the instance context and
 * wraps it in an error boundary. The wrapper carries data-rp-widget for CSS scoping.
 * Memoized: a slot only re-renders when its placement object changes.
 */
export const WidgetSlot = memo(function WidgetSlot({ placement, scope }) {
	const component = placement.component || {};
	const label = component.uniqueId || component.id || placement.id;
	return (
		<WidgetErrorBoundary key={component.build ? component.build.id : 'none'} label={label}>
			<WidgetSlotInner placement={placement} component={component} scope={scope} label={label} />
		</WidgetErrorBoundary>
	);
});

function WidgetSlotInner({ placement, component, scope, label }) {
	const isLayout = component.kind === 'layout';
	useDiagCounter(isLayout ? 'layout' : `slot:${placement.id}`, { placement, scope });
	const ref = useRef(null);
	const loaded = useComponentModule(component);
	const buildId = component.build ? component.build.id : '';

	useLayoutEffect(() => {
		if (loaded.status === 'ready' && loaded.cssText) ensureStyle(styleTarget(ref.current), `widget:${buildId}`, loaded.cssText, 'widget');
	}, [loaded.status, loaded.cssText, buildId]);

	const initStore = useInstanceInit();
	const record = useInstanceRecord(isLayout ? null : initStore, placement.id);
	const options = (record.entry && record.entry.options) || placement.options || EMPTY_OPTIONS;
	const instance = useMemo(() => ({ placement, component, options, scope }), [placement, component, options, scope]);
	const Rendered = useCountedComponent(loaded.Component, isLayout ? 'layout:component' : `widget:${placement.id}`);

	let body;
	if (loaded.status === 'ready') {
		// Runtime contract: widgets get { instanceId, options, region }; layouts get { regions }
		// (the region definitions) and render <Region name=… /> for each.
		body = isLayout ? (
			<Rendered regions={component.regions || EMPTY_LIST} />
		) : (
			<Rendered instanceId={placement.id} options={options} region={placement.region} />
		);
	} else if (loaded.status === 'error') {
		body = <WidgetPlaceholder label={label} error={loaded.error} />;
	} else if (loaded.status === 'empty') {
		body = <WidgetPlaceholder label={label} error="No build: nothing compiled for this component yet" />;
	} else {
		body = <div className="bg-muted/60 h-16 animate-pulse rounded-lg" data-rp-loading="" />;
	}

	return (
		<div
			ref={ref}
			data-rp-widget={buildId}
			data-rp-placement={placement.id}
			data-rp-component={component.uniqueId || ''}
			data-rp-scope={scope || ''}
			className={isLayout ? 'contents' : undefined}
		>
			<WidgetInstanceContext.Provider value={instance}>{body}</WidgetInstanceContext.Provider>
		</div>
	);
}

const EMPTY_OPTIONS = Object.freeze({});

// ---- regions --------------------------------------------------------------------------------

/** Outlet elements per region, as an external store so RegionPortal re-renders when they appear. */
export function createOutletStore() {
	const outlets = new Map();
	const listeners = new Set();
	return {
		get: (name) => outlets.get(name) || null,
		set: (name, el) => {
			if (outlets.get(name) === el) return;
			if (el) outlets.set(name, el);
			else outlets.delete(name);
			listeners.forEach((l) => l());
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}

/** Page placements, keyed by page path so a new path gets fresh instances. */
export function PagePlacements({ list, path }) {
	return (list || EMPTY_LIST).map((p) => <WidgetSlot key={`page:${path}:${p.id}`} placement={p} scope={`page:${path}`} />);
}

/**
 * Page placements for a region other than main, read from the current route's loader data.
 * Only this component re-renders on navigation, and only if its list or the path changes.
 */
function PageRegion({ name }) {
	const list = useRouterState({
		select: (state) => {
			const data = leafData(state);
			return (data && data.regions && data.regions[name]) || EMPTY_LIST;
		}
	});
	const path = useRouterState({
		select: (state) => {
			const data = leafData(state);
			return list.length && data ? data.path : '';
		}
	});
	useDiagCounter(`pageRegion:${name}`, { list, path });
	return list.length ? <PagePlacements list={list} path={path} /> : null;
}

/**
 * <Region name="header" />: rendered by layouts. Renders the region's portal-level placements
 * (stable keys: they stay mounted across navigation), then the page's placements — the main
 * region through <Outlet/> (the matched page route), other regions through PageRegion — then
 * an outlet that RegionPortal contributions render into. Memoized: navigation never
 * re-renders a Region itself.
 */
export const Region = memo(function Region({ name, className, as: Tag = 'div' }) {
	const layout = useLayout();
	useDiagCounter(`region:${name}`, { name, className, layout });
	const outlets = layout ? layout.outlets : null;
	const outletRef = useCallback(
		(el) => {
			if (outlets) outlets.set(name, el);
		},
		[outlets, name]
	);
	if (!layout) return null;
	const placements = layout.regions[name] || EMPTY_LIST;
	const isMain = name === layout.mainRegion;
	return (
		<Tag className={className} data-rp-region={name}>
			{placements.map((p) => (
				<WidgetSlot key={`portal:${p.id}`} placement={p} scope="portal" />
			))}
			{isMain ? <Outlet /> : <PageRegion name={name} />}
			<div data-rp-outlet={name} ref={outletRef} />
		</Tag>
	);
});

/**
 * <RegionPortal region="header">…</RegionPortal>: lets a page or widget contribute into a layout
 * region (createPortal into the region's outlet). The contribution unmounts with its owner.
 */
export function RegionPortal({ region, children }) {
	const layout = useLayout();
	const store = layout ? layout.outlets : null;
	const el = useSyncExternalStore(
		store ? store.subscribe : noopSubscribe,
		() => (store ? store.get(region) : null),
		() => null
	);
	if (!layout) return null;
	const declared = layout.layout && layout.layout.regions;
	if (declared && declared.length) {
		const entry = declared.find((r) => r.name === region);
		if (!entry || !entry.acceptsContributions) {
			warnOnce(`RegionPortal: layout ${layout.layout.uniqueId} does not accept contributions in "${region}"`);
			return null;
		}
	}
	return el ? createPortal(children, el) : null;
}

function noopSubscribe() {
	return () => {};
}

const warned = new Set();
function warnOnce(message) {
	if (warned.has(message)) return;
	warned.add(message);
	// eslint-disable-next-line no-console
	console.warn('[react-portal] ' + message);
}

/** Used when the layout module can't load: stacks the regions so widgets still render. */
export function FallbackLayout() {
	const layout = useLayout();
	const names = ['header', layout ? layout.mainRegion : 'main', 'sidebar', 'footer'].filter((n, i, a) => a.indexOf(n) === i);
	return (
		<div className="flex flex-col gap-4 p-4" data-rp-fallback-layout="">
			{names.map((n) => (
				<Region key={n} name={n} className={n === (layout && layout.mainRegion) ? 'flex flex-col gap-4' : undefined} />
			))}
		</div>
	);
}

/** The region that hosts the page route's <Outlet/>: "main" if declared, else the first one. */
export function mainRegionOf(layoutRef) {
	const regions = (layoutRef && layoutRef.regions) || [];
	if (!regions.length || regions.some((r) => r.name === 'main')) return 'main';
	return regions[0].name;
}

/** Provides the layout context and renders the layout component. Memoized on `value`. */
export const LayoutHost = memo(function LayoutHost({ value }) {
	const layoutPlacement = useMemo(() => ({ id: 'layout', component: value.layout, options: EMPTY_OPTIONS }), [value.layout]);
	return (
		<LayoutContext.Provider value={value}>
			<WidgetErrorBoundary key={value.layout ? value.layout.id : 'none'} label="layout" fallback={(error) => <LayoutFailure error={error} />}>
				<LayoutSlot placement={layoutPlacement} />
			</WidgetErrorBoundary>
		</LayoutContext.Provider>
	);
});

function LayoutSlot({ placement }) {
	const loaded = useComponentModule(placement.component);
	if (loaded.status === 'error' || loaded.status === 'empty') {
		return <LayoutFailure error={loaded.error || 'Layout has no build'} />;
	}
	return <WidgetSlotInner placement={placement} component={placement.component || {}} scope="layout" label="layout" />;
}

function LayoutFailure({ error }) {
	return (
		<div>
			<div className="px-4 pt-4">
				<WidgetPlaceholder label="layout" error={error} />
			</div>
			<FallbackLayout />
		</div>
	);
}

// ---- useComponent ---------------------------------------------------------------------------

function toError(value) {
	if (!value) return null;
	if (value instanceof Error) return value;
	const error = new Error(value.message || String(value));
	error.status = value.status;
	error.code = value.code;
	return error;
}

/**
 * Per-instance data and server calls (spec §8.5), runtime contract:
 * { instanceId, options, data, pending, error, server: { get, update, refresh } }.
 * on-load placements get their initial data from the page's batch initialize call.
 * get(input) returns data without replacing it; update(data?) and refresh() replace it.
 */
export function useComponent() {
	const instance = useWidgetInstance();
	const portal = useContext(PortalContext);
	const initStore = useInstanceInit();
	const placement = (instance && instance.placement) || {};
	const component = (instance && instance.component) || {};
	const instanceId = placement.id || '';
	const record = useInstanceRecord(initStore, instanceId);
	const entry = record.entry;
	const [local, setLocal] = useState({ set: false, data: undefined, error: null });

	const data = local.set ? local.data : entry ? entry.data : undefined;
	const dataRef = useRef(data);
	dataRef.current = data;

	// Read at call time (not render time), so calling the server never subscribes to navigation.
	const context = () => ({
		portal: portal ? portal.slug : '',
		page: portal && portal.getPath ? portal.getPath() : ''
	});
	const run = (action, extra) => executeInstance(instanceId, { ...context(), action, ...extra });
	const replace = (promise) =>
		promise.then(
			(next) => {
				setLocal({ set: true, data: next, error: null });
				return next;
			},
			(error) => {
				setLocal((prev) => ({ ...prev, error }));
				throw error;
			}
		);

	const server = {
		get: (input) => run('get', { input }),
		update: (next) => replace(run('update', { data: next === undefined ? dataRef.current : next })),
		refresh: () => replace(run('initialize', {}))
	};

	const onLoad = component.serverMode === 'on-load';
	const entryError = entry && entry.ok === false ? toError(entry.error || 'Initialization failed') : null;
	return {
		instanceId,
		options: (entry && entry.options) || placement.options || EMPTY_OPTIONS,
		data,
		pending: onLoad && !local.set && !entry && record.pending,
		error: local.error || entryError || (onLoad && !entry ? toError(record.error) : null),
		server
	};
}
