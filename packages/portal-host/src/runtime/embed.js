// Embedded widgets (.plans/embedded-widgets.md): a widget record imported by another component
// renders as its OWN instance: own composite id, options, server script, on-load data, error
// boundary and error toasts.
//
//   import ServerClock from 'components:app/server-clock'   // the default export is wrapped
//   <ServerClock embedKey="utc" options={{ title: 'UTC' }} onTick={…} />
//   <ServerClock.Raw />                                      // presentational, parent's instance
//   <Embed model={data.clock} />                             // a model from $sp.getWidget / getWidget()
//   <ServerClock lazy embedKey="below" />                    // initialize once scrolled into view
//
// Identity: <parentInstanceId>~<key>. The root segment is a placement sys_id, or
// 'layout:<component sys_id>' for embeds under a layout. Server calls go to
// /instances/<root>/execute with an `embed` body; the server authorizes the chain against the
// manifest's direct import edges (a layout root against the page's effective layout), so only
// imported widgets ever run.
import React, { forwardRef, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BlockContext, PortalContext, WidgetInstanceContext, useInstanceInit, useWidgetInstance } from './contexts';
import { useInstanceRecord } from './instance-init';
import { esModule, setImportWrapper } from './loader';
import { executeInstanceEnvelope, isMock } from './api';
import { useDiagCounter } from './diag-hooks';
import { requestContextOf } from './location';
import { DEFAULT_ROOT_MARGIN, useInViewOnce } from './in-view';
import { WidgetErrorBoundary, WidgetPlaceholder, ServerErrorBanner, reportServerError, toServerError } from './widgets';

export const MAX_EMBED_DEPTH = 4;
const KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
const EMPTY = Object.freeze({});
const NO_LIST = Object.freeze([]);
const CONTENTS = Object.freeze({ display: 'contents' });

// ---- helpers ---------------------------------------------------------------------------------

function warnOnce(message) {
	if (warned.has(message)) return;
	warned.add(message);
	// eslint-disable-next-line no-console
	console.warn('[react-portal] ' + message);
}
const warned = new Set();

/** Stable JSON (sorted keys): the options hash for dedupe and cache keys. */
export function canonical(value) {
	if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value);
	if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
	return '{' + Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

function defaultKey(uniqueId) {
	const last = String(uniqueId || '').split('/').pop() || 'embed';
	return last.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64) || 'embed';
}

/**
 * The embed chain of an instance context: { root, rootComponent, path, keys, ids } (empty for a
 * placement). A layout's instance carries `rootId` ('layout:<component sys_id>'), the server
 * root for embeds under it (its placement id stays 'layout' for the designer's markers).
 */
function chainOf(instance) {
	const placement = (instance && instance.placement) || {};
	if (placement.embed) return placement.embed;
	return { root: placement.rootId || placement.id || '', rootComponent: placement.component || (instance && instance.component) || null, path: NO_LIST, keys: NO_LIST, ids: NO_LIST };
}

/** The id embeds under this instance hang off: an embed's composite id, a layout's root, else the placement id. */
function parentIdOf(instance) {
	const placement = (instance && instance.placement) || {};
	return (placement.embed ? placement.id : placement.rootId || placement.id) || 'no-instance';
}

/** True when `parentComponentId` imports widget `uid` directly in the root's import tree. */
function importEdge(rootComponent, parentComponentId, uid) {
	const list = (rootComponent && rootComponent.imports) || [];
	return list.find((imp) => imp.uniqueId === uid && imp.kind === 'widget' && Array.isArray(imp.importers) && imp.importers.indexOf(parentComponentId) >= 0) || null;
}

/**
 * Roots the server can execute under: a placement sys_id, or a layout root
 * ('layout:<component sys_id>', authorized against the page's effective layout). Not Studio's
 * preview ('studio-preview') or a layout without a component.
 */
function serverRootOk(root) {
	return !!root && /^(layout:)?[0-9a-f]{32}$/.test(root);
}

// ---- lazy embeds (in-view.js: IntersectionObserver, shared per rootMargin) ---------------------

const LAZY_HEIGHT = '10rem';

/** `lazy` prop → { height, rootMargin } (true = defaults), or null when not lazy. */
function lazySettings(lazy) {
	if (!lazy) return null;
	const o = typeof lazy === 'object' ? lazy : EMPTY;
	const h = o.height;
	return {
		height: typeof h === 'number' ? `${h}px` : typeof h === 'string' && h ? h : LAZY_HEIGHT,
		rootMargin: typeof o.rootMargin === 'string' && o.rootMargin ? o.rootMargin : DEFAULT_ROOT_MARGIN
	};
}

// ---- wrapped imports -------------------------------------------------------------------------

const wrappers = new Map(); // `${buildId}|${uniqueId}` -> wrapper
const byUniqueId = new Map(); // uniqueId -> wrapper (latest registered)

/**
 * The embeddable wrapper for a widget import's default export. Cached per build, so the component
 * identity is stable across peeks and re-registrations. `.Raw` is the unwrapped component.
 */
export function embeddable(Component, imp) {
	if (!Component || !imp) return Component;
	const cacheKey = `${(imp.build && imp.build.id) || ''}|${imp.uniqueId}`;
	if (wrappers.has(cacheKey)) {
		const existing = wrappers.get(cacheKey);
		existing.$rpImport = imp; // newer manifest data (importers, serverMode)
		byUniqueId.set(imp.uniqueId, existing);
		return existing;
	}
	const Wrapper = forwardRef(function EmbeddableWidget(props, ref) {
		return <EmbeddedWidget Component={Component} imp={Wrapper.$rpImport} props={props} forwardedRef={ref} />;
	});
	Wrapper.displayName = `Embedded(${imp.name || imp.uniqueId})`;
	Wrapper.Raw = Component;
	Wrapper.$rpImport = imp;
	wrappers.set(cacheKey, Wrapper);
	byUniqueId.set(imp.uniqueId, Wrapper);
	return Wrapper;
}

// The loader calls this for every widget-kind record import (no import cycle: loader → embed).
setImportWrapper((ns, imp) => {
	if (!imp || imp.kind !== 'widget' || !ns || !ns.default) return ns;
	return esModule({ ...ns, default: embeddable(ns.default, imp) });
});

/** The import a wrapped component, a unique id or a specifier refers to. */
function resolveImport(componentOrId) {
	if (!componentOrId) return null;
	if (componentOrId.$rpImport) return componentOrId.$rpImport;
	const uid = String(componentOrId).replace(/^components:/, '').toLowerCase();
	const w = byUniqueId.get(uid);
	return w ? w.$rpImport : null;
}

// ---- per-parent key registry (auto keys, duplicate detection) and the designer's view ----------

const claims = new Map(); // parentInstanceId -> Map(key -> token)
const live = new Map(); // compositeId -> info (designer outline, diagnostics)
let liveVersion = 0;

function publishLive() {
	liveVersion += 1;
	const g = globalThis;
	g.__REACT_PORTAL__ = g.__REACT_PORTAL__ || { modules: {} };
	g.__REACT_PORTAL__.embeds = { version: liveVersion, list: Array.from(live.values()) };
	try {
		if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('rp-embeds-change', { detail: { version: liveVersion } }));
	} catch (error) {
		/* no window */
	}
}

/** Live embeds (designer outline, diagnostics): [{ id, root, parent, component, key, depth, options, status }]. */
export function liveEmbeds() {
	return Array.from(live.values());
}

/**
 * Claim `key` (explicit) or the next free auto key under `parentId`. Returns { key, ok }:
 * ok = false when an explicit key is already taken by another live embed (duplicate embedKey).
 */
function claimKey(parentId, explicit, base, token) {
	if (!claims.has(parentId)) claims.set(parentId, new Map());
	const map = claims.get(parentId);
	if (explicit) {
		const holder = map.get(explicit);
		if (holder && holder !== token) return { key: explicit, ok: false };
		map.set(explicit, token);
		return { key: explicit, ok: true };
	}
	for (const [k, t] of map) if (t === token && (k === base || k.indexOf(base + '-') === 0)) return { key: k, ok: true };
	let key = base;
	for (let n = 2; map.has(key); n += 1) key = `${base}-${n}`;
	if (key !== base) warnOnce(`repeated embeds of ${base} in ${parentId}: give each an embedKey (auto keys depend on mount order)`);
	map.set(key, token);
	return { key, ok: true };
}

function releaseKey(parentId, key, token) {
	const map = claims.get(parentId);
	if (map && map.get(key) === token) map.delete(key);
	if (map && !map.size) claims.delete(parentId);
}

// ---- EmbeddedWidget ----------------------------------------------------------------------------

/** Reserved props on an embeddable widget; everything else passes through to the component. */
function splitProps(props) {
	const { options, embedKey, model, fallback, lazy, ...rest } = props || {};
	return { options, embedKey, model, fallback, lazy, rest };
}

function toError(value) {
	return toServerError(value);
}

function EmbeddedWidget({ Component, imp, props, forwardedRef }) {
	const parent = useWidgetInstance();
	const portal = useContext(PortalContext);
	const initStore = useInstanceInit();
	const { options: requestedProp, embedKey, model, fallback, lazy, rest } = splitProps(props);
	const chain = chainOf(parent);
	const parentPlacement = (parent && parent.placement) || {};
	const parentId = parentIdOf(parent);
	const parentComponentId = (parent && parent.component && parent.component.id) || '';
	const depth = chain.path.length + 1;
	const token = useRef(null);
	if (!token.current) token.current = {};

	const explicit = embedKey !== undefined && embedKey !== null ? String(embedKey) : model && model.key ? String(model.key) : '';
	const badKey = explicit && !KEY_RE.test(explicit);
	const claim = claimKey(parentId, badKey ? '' : explicit, defaultKey(imp.uniqueId), token.current);
	const key = claim.key;
	useEffect(() => () => releaseKey(parentId, key, token.current), [parentId, key]);

	const compositeId = `${parentId}~${key}`;
	const path = useMemo(() => chain.path.concat([imp.uniqueId]), [chain.path, imp.uniqueId]);
	const keys = useMemo(() => chain.keys.concat([key]), [chain.keys, key]);
	const ids = useMemo(() => (chain.ids || []).concat([imp.id]), [chain.ids, imp.id]);
	useDiagCounter(`embed:${compositeId}`, { props, model });

	// Options: a server-built model's options are signed (sent back as they are, with the token);
	// client options are re-filtered by the server on every call.
	const requested = model && model.$embed ? model.options || EMPTY : requestedProp && typeof requestedProp === 'object' ? requestedProp : EMPTY;
	const hash = canonical(requested) + '|' + ((model && model.token) || '');
	const stableRequested = useMemo(() => requested, [hash]); // eslint-disable-line react-hooks/exhaustive-deps
	const rootOk = serverRootOk(chain.root) || isMock();
	const serverMode = imp.serverMode || 'none';
	const authorized = !!importEdge(chain.rootComponent, parentComponentId, imp.uniqueId) || isMock();

	// lazy: render a placeholder and skip initialize until the placeholder nears the viewport. A
	// server-built model has nothing to fetch, so lazy is ignored there.
	const lazyCfg = model && model.$embed ? null : lazySettings(lazy);
	const [lazyRef, inView] = useInViewOnce({ rootMargin: lazyCfg ? lazyCfg.rootMargin : undefined, disabled: !lazyCfg });
	const deferred = !!lazyCfg && !inView;

	// Seed from a server-built model before the first render of the subtree (no request).
	const seededRef = useRef(null);
	if (model && model.$embed && initStore && seededRef.current !== model) {
		seededRef.current = model;
		initStore.seed(
			compositeId,
			model.ok
				? { ok: true, data: model.data || {}, options: model.options || {}, token: model.token || null, build: model.build || null }
				: { ok: false, error: model.error || { status: 500, code: 'error', message: 'Embedded widget failed' }, options: model.options || {} },
			hash
		);
	}

	// Client-declared on-load embeds: one batched initialize per commit (deduped by id + options).
	useLayoutEffect(() => {
		if (model && model.$embed) return;
		if (deferred || !initStore || serverMode !== 'on-load' || depth > MAX_EMBED_DEPTH || !claim.ok || !rootOk || !authorized) return;
		const descriptor = { id: compositeId, placement: chain.root, path, keys, options: stableRequested, token: null };
		initStore.requestEmbed(portal ? portal.slug : '', portal && portal.getPath ? portal.getPath() : '', descriptor, hash, requestContextOf(portal && portal.locationStore ? portal.locationStore.get() : null));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initStore, compositeId, hash, serverMode, depth, claim.ok, rootOk, authorized, deferred]);

	const record = useInstanceRecord(initStore, compositeId);
	const entry = record.entry;
	const options = (entry && entry.options) || stableRequested;
	const trustedToken = (entry && entry.token) || (model && model.token) || null;

	const ref = useMemo(
		() => ({ id: imp.id, uniqueId: imp.uniqueId, name: imp.name || imp.uniqueId, kind: 'widget', serverMode, build: imp.build || null }),
		[imp.id, imp.uniqueId, imp.name, serverMode, imp.build]
	);
	const embed = useMemo(
		() => ({
			root: chain.root,
			rootComponent: chain.rootComponent,
			path,
			keys,
			ids,
			// Sent with every server call: the signed options with their token, else the requested ones.
			options: trustedToken ? options : stableRequested,
			token: trustedToken,
			depth,
			serverOk: rootOk && authorized
		}),
		[chain.root, chain.rootComponent, path, keys, ids, trustedToken, options, stableRequested, depth, rootOk, authorized]
	);
	const instance = useMemo(
		() => ({
			placement: { id: compositeId, region: parentPlacement.region || '', component: ref, options, embed },
			component: ref,
			options,
			scope: parent ? parent.scope : ''
		}),
		[compositeId, parentPlacement.region, ref, options, embed, parent]
	);

	// Designer / diagnostics view of live embeds.
	const status = deferred ? 'deferred' : entry ? (entry.ok === false ? 'error' : 'ready') : record.pending ? 'loading' : serverMode === 'on-load' ? 'idle' : 'no-init';
	useEffect(() => {
		live.set(compositeId, {
			id: compositeId,
			root: chain.root,
			parent: parentId,
			component: imp.uniqueId,
			name: imp.name || imp.uniqueId,
			key,
			depth,
			options,
			trusted: !!trustedToken,
			status
		});
		publishLive();
	}, [compositeId, chain.root, parentId, imp.uniqueId, imp.name, key, depth, options, trustedToken, status]);
	useEffect(
		() => () => {
			live.delete(compositeId);
			publishLive();
		},
		[compositeId]
	);

	const label = `${imp.name || imp.uniqueId} (${key})`;
	const initError = entry && entry.ok === false ? toError(entry.error || 'Initialization failed') : null;
	useEffect(() => {
		if (initError) reportServerError(initError, { portal, label, key: `init:${compositeId}:${initError.message}` });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initError && initError.message, compositeId]);

	const markers = {
		style: CONTENTS,
		'data-rp-embed': compositeId,
		'data-rp-component': imp.uniqueId,
		'data-rp-embed-root': chain.root,
		'data-rp-embed-depth': String(depth)
	};

	let body;
	if (!parent) {
		body = <WidgetPlaceholder label={label} error="Embedded widgets render inside a widget instance" />;
	} else if (depth > MAX_EMBED_DEPTH) {
		body = <WidgetPlaceholder label={label} error={`Embeds nest at most ${MAX_EMBED_DEPTH} levels below a placement`} />;
	} else if (badKey) {
		body = <WidgetPlaceholder label={label} error={`embedKey "${explicit}" must match [A-Za-z0-9_-]{1,64}`} />;
	} else if (!claim.ok) {
		body = <WidgetPlaceholder label={label} error={`Duplicate embedKey "${key}" in ${parentId}`} />;
	} else if (deferred) {
		// The observed element (the marker wrapper is display: contents, so it has no box).
		body = <div ref={lazyRef} className="bg-muted/60 animate-pulse rounded-lg" style={{ minHeight: lazyCfg.height }} aria-busy="true" aria-label={`${label}: loads when scrolled into view`} data-rp-lazy="" />;
	} else {
		body = (
			<>
				{initError ? <ServerErrorBanner error={initError} label={label} /> : null}
				<Component ref={forwardedRef} {...rest} instanceId={compositeId} options={options} region={parentPlacement.region || ''} embedded />
			</>
		);
	}

	return (
		<div {...markers}>
			<BlockContext.Provider value={null}>
				<WidgetInstanceContext.Provider value={instance}>
					<WidgetErrorBoundary key={(imp.build && imp.build.id) || 'none'} label={label} fallback={fallback}>
						{body}
					</WidgetErrorBoundary>
				</WidgetInstanceContext.Provider>
			</BlockContext.Provider>
		</div>
	);
}

// ---- <Embed model> -----------------------------------------------------------------------------

/**
 * <Embed model={data.panel} fallback? embedKey? …props />: renders whatever widget a model names
 * (from $sp.getWidget or getWidget()). The model's component must be a widget the CURRENT
 * component imports; otherwise a placeholder.
 */
export function Embed({ model, ...props }) {
	if (!model) return null;
	if (!model.$embed || !model.component) return <WidgetPlaceholder label="Embed" error="Not an embed model ($sp.getWidget / getWidget)" />;
	const Wrapper = byUniqueId.get(model.component);
	if (!Wrapper) return <WidgetPlaceholder label={model.component} error={`${model.component} is not imported by this component`} />;
	return <Wrapper {...props} model={model} />;
}

// ---- getWidget / useEmbeddedWidget (the spUtils.get equivalent) --------------------------------

/**
 * The imperative fetcher bound to the calling widget instance:
 *   const getWidget = useGetWidget()
 *   const model = await getWidget(RecordDetail, { table, sys_id }, { key: 'modal' })
 * Calls /instances/<root>/execute (action initialize) with the embed chain; resolves to an
 * EmbedModel (token null: client-originated options). Rejects when the component isn't a widget
 * this component imports.
 */
export function useGetWidget() {
	const instance = useWidgetInstance();
	const portal = useContext(PortalContext);
	const instanceRef = useRef(instance);
	instanceRef.current = instance;
	return useCallback(
		(componentOrId, options, settings) => fetchWidget(instanceRef.current, portal, componentOrId, options, settings),
		[portal]
	);
}

export function fetchWidget(instance, portal, componentOrId, options, settings) {
	const imp = resolveImport(componentOrId);
	const uid = imp ? imp.uniqueId : String(componentOrId || '').replace(/^components:/, '');
	if (!instance || !instance.placement) return Promise.reject(new Error('getWidget must be called from a widget instance'));
	const chain = chainOf(instance);
	const parentComponentId = instance.component ? instance.component.id : '';
	if (!imp || (!importEdge(chain.rootComponent, parentComponentId, uid) && !isMock())) {
		return Promise.reject(new Error(`getWidget: ${uid} is not a widget that ${(instance.component && instance.component.uniqueId) || 'this component'} imports`));
	}
	if (chain.path.length + 1 > MAX_EMBED_DEPTH) return Promise.reject(new Error(`getWidget: embeds nest at most ${MAX_EMBED_DEPTH} levels`));
	if (!serverRootOk(chain.root) && !isMock()) return Promise.reject(new Error('getWidget: no server here (no placement, e.g. Studio preview)'));
	const key = settings && settings.key && KEY_RE.test(settings.key) ? settings.key : defaultKey(uid);
	const opts = options && typeof options === 'object' ? options : {};
	const base = { $embed: 1, component: uid, key, options: opts, token: null, build: imp.build ? imp.build.id : null };
	if ((imp.serverMode || 'none') === 'none') return Promise.resolve({ ...base, ok: true, data: {} });
	return executeInstanceEnvelope(chain.root, {
		portal: portal ? portal.slug : '',
		page: portal && portal.getPath ? portal.getPath() : '',
		action: 'initialize',
		input: {},
		context: requestContextOf(portal && portal.locationStore ? portal.locationStore.get() : null),
		embed: { path: chain.path.concat([uid]), keys: chain.keys.concat([key]), options: opts, token: null }
	}).then(
		(envelope) => ({ ...base, ok: true, data: envelope.data || {}, options: envelope.options || opts, build: (envelope.meta && envelope.meta.build) || base.build }),
		(error) => ({ ...base, ok: false, error: { status: error.status || 500, code: error.code || 'error', message: error.message || String(error), correlationId: error.correlationId || null } })
	);
}

/**
 * Declarative: fetch a model on mount and whenever the component, options or key change.
 *   const { model, pending, error, refetch } = useEmbeddedWidget(RecordDetail, { sys_id }, { key: 'detail', enabled: !!sys_id })
 *   return model ? <RecordDetail model={model} /> : null
 */
export function useEmbeddedWidget(componentOrId, options, settings) {
	const getWidget = useGetWidget();
	const enabled = !(settings && settings.enabled === false);
	const key = settings && settings.key;
	const uid = (resolveImport(componentOrId) || {}).uniqueId || String(componentOrId || '');
	const hash = canonical(options || {});
	const [state, setState] = useState({ model: null, pending: enabled, error: null });
	const [nonce, setNonce] = useState(0);
	const latest = useRef(0);
	useEffect(() => {
		if (!enabled) {
			setState((s) => (s.pending ? { ...s, pending: false } : s));
			return;
		}
		const call = (latest.current += 1);
		setState((s) => ({ ...s, pending: true }));
		getWidget(componentOrId, options, { key }).then(
			(model) => {
				if (latest.current !== call) return;
				setState({ model, pending: false, error: model.ok ? null : toError(model.error) });
			},
			(error) => {
				if (latest.current !== call) return;
				setState({ model: null, pending: false, error });
			}
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uid, hash, key, enabled, nonce, getWidget]);
	const refetch = useCallback(() => setNonce((n) => n + 1), []);
	return { ...state, refetch };
}
