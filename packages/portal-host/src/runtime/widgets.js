import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { BlockContext, LayoutContext, PortalContext, WidgetInstanceContext, useBlockContext, useInstanceInit, useLayout, useLayoutOptions, useWidgetInstance } from './contexts';
import { loadComponent, peekComponent } from './loader';
import { acquireStyle, ensureStyle, styleTarget } from './styles';
import { executeInstance } from './api';
import { useInstanceRecord } from './instance-init';
import { useDiagCounter } from './diag-hooks';
import { toast } from 'sonner';
import { setServerMessageSink } from './api';

/**
 * Platform messages (gs.add*Message, errors) arrive HTML-escaped ("&#39;", "&amp;") and sometimes
 * with markup. Toasts show plain text: decode entities and drop tags with an inert DOMParser
 * document (nothing is rendered as HTML, nothing runs), then tidy whitespace.
 */
export function messageText(value) {
	const raw = String(value == null ? '' : value);
	if (!/[&<]/.test(raw)) return raw.trim();
	try {
		const doc = new DOMParser().parseFromString(raw.replace(/<br\s*\/?>/gi, '\n'), 'text/html');
		return (doc.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
	} catch (e) {
		return raw;
	}
}

// Server-script messages → toasts coloured by type.
setServerMessageSink((messages) =>
	messages.forEach((m) => {
		const show = (m && toast[m.type]) || toast;
		show(messageText(m && m.message));
	})
);
import { EMPTY_LIST, leafData } from './page-state';
import { requestContextOf } from './location';
import { useBootReady } from './boot-gate';

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

// ---- server error reporting -----------------------------------------------------------------

/** Roles that see real error details (message, script line, code); everyone else sees a generic message + reference. */
const DETAIL_ROLES = ['admin', 'x_312987_portal.admin', 'x_312987_portal.developer', 'x_312987_portal.designer'];

export function canSeeErrorDetails(portal) {
	const roles = (portal && portal.user && portal.user.roles) || [];
	return roles.some((r) => DETAIL_ROLES.indexOf(r) >= 0);
}

/** { title, description } for an error, shaped for the viewer. */
export function describeServerError(error, label, detailed) {
	const ref = error && error.correlationId ? `Reference ${error.correlationId}` : '';
	if (!detailed) return { title: 'Something went wrong', description: ref || undefined };
	const line = error && error.details && error.details.line ? ` · line ${error.details.line}` : '';
	const code = error && error.code ? error.code : 'error';
	return { title: `${label}: ${(error && error.message) || String(error)}`, description: `${code}${line}${ref ? ' · ' + ref : ''}` };
}

const toasted = new Set();
/** Toast a server error (deduped per key for load errors) and log it. */
export function reportServerError(error, { portal, label, key }) {
	if (key) {
		if (toasted.has(key)) return;
		toasted.add(key);
	}
	const { title, description } = describeServerError(error, label, canSeeErrorDetails(portal));
	toast.error(messageText(title), description ? { description: messageText(description) } : undefined);
	console.error(`[react-portal] ${label} server error`, error);
}

/** In-place notice above a widget whose on-load server script failed. */
export function ServerErrorBanner({ error, label }) {
	const portal = useContext(PortalContext);
	const { title, description } = describeServerError(error, label, canSeeErrorDetails(portal));
	return (
		<div role="alert" className="border-destructive/40 bg-destructive/5 text-destructive mb-2 rounded-lg border p-2.5 text-xs" data-rp-server-error="">
			<div className="font-semibold break-words">{title}</div>
			{description ? <div className="mt-0.5 font-mono break-all opacity-80">{description}</div> : null}
		</div>
	);
}

export function WidgetPlaceholder({ label, error, onRetry }) {
	const portal = useContext(PortalContext);
	// Crash and load errors (stack-ish messages, component ids) are for authors only. Studio's
	// preview has no bootstrapped user, so it keeps the details.
	const detailed = !portal || !portal.user || canSeeErrorDetails(portal);
	if (!detailed) {
		return (
			<div className="border-border bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-3 text-xs" data-rp-placeholder="">
				<div className="font-semibold">This section couldn't be displayed.</div>
				{onRetry ? (
					<button type="button" className="mt-2 underline" onClick={onRetry}>
						Try again
					</button>
				) : null}
			</div>
		);
	}
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
	const imports = componentRef && Array.isArray(componentRef.imports) ? componentRef.imports : null;
	const key = build ? `${build.id}|${build.js}|${build.css}|${imports ? imports.map((i) => (i.build ? i.build.id : '-')).join(',') : ''}` : '';
	const refNow = useRef(componentRef);
	refNow.current = componentRef;
	const [state, setState] = useState(() => initialState(componentRef));

	useEffect(() => {
		if (!build || !build.js) {
			setState((prev) => (prev.status === 'empty' ? prev : { status: 'empty' }));
			return undefined;
		}
		const cached = peekComponent(refNow.current);
		if (cached) {
			setState((prev) => (prev.status === 'ready' && prev.Component === cached.Component ? prev : { status: 'ready', ...cached }));
			return undefined;
		}
		let alive = true;
		setState({ status: 'loading' });
		loadComponent(refNow.current).then(
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

function initialState(componentRef) {
	const build = componentRef && componentRef.build;
	if (!build || !build.js) return { status: 'empty' };
	const cached = peekComponent(componentRef);
	return cached ? { status: 'ready', ...cached } : { status: 'loading' };
}

/** Prefetch builds (JS + CSS) so a page renders complete; failures surface later in the slot. */
export function prefetchBuilds(componentRefs) {
	return Promise.all(
		(componentRefs || []).filter((c) => c && c.build && c.build.js).map((c) => loadComponent(c).catch(() => null))
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
export const WidgetSlot = memo(function WidgetSlot({ placement, scope, parentId, zone }) {
	const component = placement.component || {};
	const label = component.uniqueId || component.id || placement.id;
	return (
		<WidgetErrorBoundary key={component.build ? component.build.id : 'none'} label={label}>
			<WidgetSlotInner placement={placement} component={component} scope={scope} label={label} parentId={parentId || ''} zone={zone || ''} />
		</WidgetErrorBoundary>
	);
});

/**
 * Wrappers are subgrid-safe:
 * - a widget's wrapper is a real element carrying data-rp-placement + the instance's classes, so
 *   it is the grid/flex item its parent block lays out (instance CSS targets it);
 * - a block has no wrapper at all: the block's own root element carries data-rp-placement via
 *   useBlock().rootProps, so a nested Grid is a direct grid child of its parent grid;
 * - a layout's wrapper is display: contents.
 */
function WidgetSlotInner({ placement, component, scope, label, parentId, zone, layoutOptions }) {
	const isLayout = component.kind === 'layout';
	const isBlock = component.kind === 'block';
	useDiagCounter(isLayout ? 'layout' : `slot:${placement.id}`, { placement, scope });
	const ref = useRef(null);
	const portal = useContext(PortalContext);
	const loaded = useComponentModule(component);
	const buildId = component.build ? component.build.id : '';
	// Where styles go: the wrapper's shadow root, or (blocks have no wrapper) the portal's.
	const targetOf = () => (ref.current ? styleTarget(ref.current) : portal && portal.shadowRoot ? portal.shadowRoot : null);

	useLayoutEffect(() => {
		if (loaded.status === 'ready' && loaded.cssText) ensureStyle(targetOf(), `widget:${buildId}`, loaded.cssText, 'widget');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loaded.status, loaded.cssText, buildId]);

	// Instance CSS (classes, style tokens, grid layout, responsive option variables): once per
	// placement, updated when it changes, removed when the placement is gone.
	const instanceCss = placement.css || '';
	useLayoutEffect(() => {
		if (!instanceCss || isLayout) return undefined;
		return acquireStyle(targetOf(), `placement:${placement.id}`, instanceCss, 'instance');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [instanceCss, placement.id, isLayout]);

	const initStore = useInstanceInit();
	const record = useInstanceRecord(isLayout || isBlock ? null : initStore, placement.id);
	const options = isLayout ? layoutOptions || EMPTY_OPTIONS : (record.entry && record.entry.options) || placement.options || EMPTY_OPTIONS;
	const instance = useMemo(() => ({ placement, component, options, scope }), [placement, component, options, scope]);
	const Rendered = useCountedComponent(loaded.Component, isLayout ? 'layout:component' : `widget:${placement.id}`);
	const portalCtx = useContext(PortalContext);
	const initError = !isLayout && !isBlock && record.entry && record.entry.ok === false ? toError(record.entry.error || 'Initialization failed') : null;
	useEffect(() => {
		if (initError) reportServerError(initError, { portal: portalCtx, label: component.name || label, key: `init:${placement.id}:${initError.message}` });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initError && initError.message, placement.id]);
	const classes = placement.classes || '';

	// Markers the page designer measures; the block root gets them through rootProps.
	const markers = {
		'data-rp-widget': buildId,
		'data-rp-placement': placement.id,
		'data-rp-component': component.uniqueId || '',
		'data-rp-scope': scope || '',
		'data-rp-parent': parentId || undefined,
		'data-rp-zone': zone || undefined,
		'data-rp-kind': component.kind || undefined
	};
	const block = useMemo(() => {
		if (!isBlock) return null;
		const rootProps = { ...markers, className: classes || undefined };
		return {
			placement,
			scope,
			api: { placementId: placement.id, options, regions: placement.regions || EMPTY_LIST, rootProps }
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isBlock, placement, scope, options, classes, buildId, parentId, zone]);

	let body;
	if (loaded.status === 'ready') {
		// Runtime contract: widgets get { instanceId, options, region }; layouts get { regions, options }
		// (the region definitions and the effective layout options) and render <Region name=… />
		// for each; blocks read useBlock().
		body = isLayout ? (
			<Rendered regions={component.regions || EMPTY_LIST} options={options} />
		) : (
			<>
				{initError ? <ServerErrorBanner error={initError} label={component.name || label} /> : null}
				<Rendered instanceId={placement.id} options={options} region={placement.region} />
			</>
		);
	} else if (loaded.status === 'error') {
		body = <WidgetPlaceholder label={label} error={loaded.error} />;
	} else if (loaded.status === 'empty') {
		body = <WidgetPlaceholder label={label} error="No build: nothing compiled for this component yet" />;
	} else {
		body = <div className="bg-muted/60 h-16 animate-pulse rounded-lg" data-rp-loading="" />;
	}

	if (isBlock) {
		// No wrapper. Until the block renders its own root (loading / failed), stand in with one.
		const content = <WidgetInstanceContext.Provider value={instance}>{body}</WidgetInstanceContext.Provider>;
		return (
			<BlockContext.Provider value={block}>
				{loaded.status === 'ready' ? content : <div {...block.api.rootProps}>{content}</div>}
			</BlockContext.Provider>
		);
	}

	return (
		<div ref={ref} {...markers} className={isLayout ? 'contents' : classes || undefined}>
			<BlockContext.Provider value={null}>
				<WidgetInstanceContext.Provider value={instance}>{body}</WidgetInstanceContext.Provider>
			</BlockContext.Provider>
		</div>
	);
}

/**
 * useBlock() (blocks only) → { placementId, options, regions, rootProps }. Spread rootProps on the
 * block's root element (merging className): it carries data-rp-placement (the instance CSS
 * target) and the instance's classes. `regions` are the instance's resolved drop zones.
 */
export function useBlock() {
	const block = useContext(BlockContext);
	const instance = useWidgetInstance();
	if (block) return block.api;
	const placement = (instance && instance.placement) || {};
	return {
		placementId: placement.id || '',
		options: (instance && instance.options) || EMPTY_OPTIONS,
		regions: placement.regions || EMPTY_LIST,
		rootProps: placement.id ? { 'data-rp-placement': placement.id, className: placement.classes || undefined } : {}
	};
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
export const Region = memo(function Region({ name, className, contents, as: Tag = 'div' }) {
	const layout = useLayout();
	const block = useBlockContext();
	useDiagCounter(block ? `zone:${block.placement.id}:${name}` : `region:${name}`, { name, className, layout, block });
	const outlets = layout ? layout.outlets : null;
	const outletRef = useCallback(
		(el) => {
			if (outlets) outlets.set(name, el);
		},
		[outlets, name]
	);
	// Inside a block: that instance's children in this drop zone.
	if (block) return <BlockZone block={block} name={name} className={className} contents={contents} Tag={Tag} />;
	if (!layout) return null;
	const placements = layout.regions[name] || EMPTY_LIST;
	const isMain = name === layout.mainRegion;
	return (
		<Tag className={className} style={contents ? CONTENTS_STYLE : undefined} data-rp-region={name}>
			{placements.map((p) => (
				<WidgetSlot key={`portal:${p.id}`} placement={p} scope="portal" />
			))}
			{isMain ? <Outlet /> : <PageRegion name={name} />}
			<div data-rp-outlet={name} ref={outletRef} />
		</Tag>
	);
});

const CONTENTS_STYLE = Object.freeze({ display: 'contents' });

/**
 * A block's drop zone. With `contents`, the zone renders no element of its own, so its children
 * are direct DOM children of the block's root: grid/flex items for the block's CSS (`.rp-grid > *`)
 * and for subgrid. Otherwise it renders one element (className applied).
 */
function BlockZone({ block, name, className, contents, Tag }) {
	const list = (block.placement.children && block.placement.children[name]) || EMPTY_LIST;
	const parentId = block.placement.id;
	const items = list.map((p) => <WidgetSlot key={`${block.scope}:${p.id}`} placement={p} scope={block.scope} parentId={parentId} zone={name} />);
	if (contents) return <>{items}</>;
	return (
		<Tag className={className} data-rp-zone={name} data-rp-parent={parentId}>
			{items}
		</Tag>
	);
}

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
	// id 'layout' is the designer's marker; rootId is the server root for the layout's own script
	// and for widgets it embeds (authorized against the page's effective layout).
	const layoutPlacement = useMemo(
		() => ({ id: 'layout', rootId: value.layout && value.layout.id ? `layout:${value.layout.id}` : '', component: value.layout, options: EMPTY_OPTIONS }),
		[value.layout]
	);
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
	// Only the layout reads the options context: an options change re-renders the layout, never
	// remounts it, and never re-renders regions or widgets (they are memoized).
	const layoutOptions = useLayoutOptions();
	// An on-load layout's server script initializes once per mount, in the same batched request
	// as client-declared embeds (instance-init requestInstance). useComponent() reads it by rootId.
	const initStore = useInstanceInit();
	const portal = useContext(PortalContext);
	const rootId = placement.rootId || '';
	const serverMode = placement.component ? placement.component.serverMode : 'none';
	useLayoutEffect(() => {
		if (!initStore || !initStore.requestInstance || !rootId || serverMode !== 'on-load') return;
		initStore.requestInstance(portal ? portal.slug : '', portal && portal.getPath ? portal.getPath() : '', rootId, requestContextOf(portal && portal.locationStore ? portal.locationStore.get() : null));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initStore, rootId, serverMode]);
	// The layout's first render lifts the host's loading skeleton (boot gate).
	useBootReady(loaded.status !== 'loading');
	if (loaded.status === 'error' || loaded.status === 'empty') {
		return <LayoutFailure error={loaded.error || 'Layout has no build'} />;
	}
	return <WidgetSlotInner placement={placement} component={placement.component || {}} scope="layout" label="layout" layoutOptions={layoutOptions} />;
}

function LayoutFailure({ error }) {
	useBootReady(true);
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

export function toServerError(value) {
	return toError(value);
}

function toError(value) {
	if (!value) return null;
	if (value instanceof Error) return value;
	const error = new Error(value.message || String(value));
	error.status = value.status;
	error.code = value.code;
	error.details = value.details;
	error.correlationId = value.correlationId || null;
	return error;
}

/** Resolve input values: functions are read at call time (pinned "variables"). */
function resolveInputs(values) {
	const out = {};
	if (!values) return out;
	Object.keys(values).forEach((k) => {
		const v = values[k];
		out[k] = typeof v === 'function' ? v() : v;
	});
	return out;
}

/**
 * Per-instance data and server calls (spec §8.5), runtime contract:
 * { instanceId, options, data, pending, error, server }.
 * on-load placements get their initial data from the page's batch initialize call.
 *
 * server.get(input?, opts?)     → resolves with the server's data; local data unchanged
 * server.update(input?, opts?)  → the server's data replaces local data
 * server.refresh(opts?)         → re-initialize; replaces local data
 * Every call sends `input` = pinned ← staged ← the call's own input (later wins). The widget's
 * data is never sent back to the server.
 * server.setInputs(obj | prev => obj), server.setInput(k, v): staged; sent with the next call, then cleared
 * server.pinInputs(obj): sent with every call until unpinned (function values are read at call time)
 * server.unpinInputs(keys?): remove some (or all) imperative pins
 * server.inputs → { pinned, staged }
 * useServer({ pinned: { k: value } }): reactive pins (latest render's values); { toastErrors: false } opts out of error toasts.
 */
export function useComponent(hookOptions) {
	const toastErrors = !(hookOptions && hookOptions.toastErrors === false);
	const hookPinnedRef = useRef(null);
	hookPinnedRef.current = (hookOptions && hookOptions.pinned) || null;
	const stagedRef = useRef({});
	const pinnedRef = useRef({});
	const instance = useWidgetInstance();
	const portal = useContext(PortalContext);
	const initStore = useInstanceInit();
	const placement = (instance && instance.placement) || {};
	const component = (instance && instance.component) || {};
	// A layout's instance id is its server root ('layout:<component sys_id>').
	const instanceId = (!placement.embed && placement.rootId) || placement.id || '';
	const record = useInstanceRecord(initStore, instanceId);
	const entry = record.entry;
	const [local, setLocal] = useState({ set: false, data: undefined, error: null });

	const data = local.set ? local.data : entry ? entry.data : undefined;
	const dataRef = useRef(data);
	dataRef.current = data;

	// Read at call time (not render time), so calling the server never subscribes to navigation.
	// `context` carries the URL params (table, sys_id, view, query, q keys) and recordId: the
	// server exposes them as context.client / context.query and through $sp.getParameter().
	const context = () => ({
		portal: portal ? portal.slug : '',
		page: portal && portal.getPath ? portal.getPath() : '',
		context: requestContextOf(portal && portal.locationStore ? portal.locationStore.get() : null)
	});
	// Action errors toast automatically (detailed for developers), unless the widget opted out
	// (useServer({ toastErrors: false })) or the call did ({ toast: false }). The promise still rejects.
	const label = component.name || component.uniqueId || 'Widget';
	// Embedded instances run under their root placement, with the embed chain in the body.
	const embed = placement.embed || null;
	const run = (action, extra, callOptions) => {
		if (embed && !embed.serverOk) {
			const error = toError({ status: 400, code: 'no_server', message: 'This embedded widget has no server here (no placement, e.g. Studio preview)' });
			if (toastErrors && !(callOptions && callOptions.toast === false)) reportServerError(error, { portal, label });
			return Promise.reject(error);
		}
		const target = embed ? embed.root : instanceId;
		const body = { ...context(), action, ...extra };
		if (embed) body.embed = { path: embed.path, keys: embed.keys, options: embed.options || {}, token: embed.token || null };
		return executeInstance(target, body).catch((error) => {
			if (toastErrors && !(callOptions && callOptions.toast === false)) reportServerError(error, { portal, label });
			throw error;
		});
	};
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

	// pinned (hook, then imperative) ← staged ← the call's own input; staged inputs are consumed.
	const buildInput = (input) => {
		const staged = stagedRef.current;
		stagedRef.current = {};
		return {
			...resolveInputs(hookPinnedRef.current),
			...resolveInputs(pinnedRef.current),
			...staged,
			...(input && typeof input === 'object' ? input : {})
		};
	};
	const server = {
		get: (input, callOptions) => run('get', { input: buildInput(input) }, callOptions),
		update: (input, callOptions) => replace(run('update', { input: buildInput(input) }, callOptions)),
		refresh: (callOptions) => replace(run('initialize', { input: buildInput(null) }, callOptions)),
		setInputs: (next) => {
			const value = typeof next === 'function' ? next({ ...stagedRef.current }) : next;
			stagedRef.current = { ...stagedRef.current, ...(value || {}) };
		},
		setInput: (key, value) => {
			stagedRef.current = { ...stagedRef.current, [key]: value };
		},
		pinInputs: (values) => {
			pinnedRef.current = { ...pinnedRef.current, ...(values || {}) };
		},
		unpinInputs: (keys) => {
			if (!keys) pinnedRef.current = {};
			else {
				const next = { ...pinnedRef.current };
				[].concat(keys).forEach((k) => delete next[k]);
				pinnedRef.current = next;
			}
		},
		get inputs() {
			return { pinned: { ...resolveInputs(hookPinnedRef.current), ...resolveInputs(pinnedRef.current) }, staged: { ...stagedRef.current } };
		}
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
