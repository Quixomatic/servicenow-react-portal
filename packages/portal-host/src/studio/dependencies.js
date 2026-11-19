// Studio Dependencies panel (.plans/embedded-widgets.md §6): the component records the open
// component imports directly (kind badges; widget imports are "embeddable": they render as their
// own embedded instances) and the components that import it ("Used by", from build_dep reverse
// edges). A widget with importers shows "Embedded by N components" in the title bar, because a
// change to its options schema can break them.
import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Layers, Loader2, RefreshCw } from 'lucide-react';
import { studioApi } from './studio-api';
import { useStudio } from './store';

// Cache: one request per (component id, version); every consumer of the same pair shares it.
const cache = new Map();
const listeners = new Set();
const notifyAll = () => listeners.forEach((l) => l());

/** GET /rp_studio/components/{id}/dependencies, uncached: { component, build, imports, importedBy }. */
export function fetchComponentDependencies(componentId) {
	return studioApi.dependencies(componentId);
}

function load(key, id, force) {
	const hit = cache.get(key);
	if (hit && !force && hit.status !== 'error') return hit;
	const entry = { status: 'loading', data: hit ? hit.data : null, error: null };
	cache.set(key, entry);
	fetchComponentDependencies(id).then(
		(data) => {
			cache.set(key, { status: 'ready', data, error: null });
			notifyAll();
		},
		(error) => {
			cache.set(key, { status: 'error', data: null, error });
			notifyAll();
		}
	);
	return entry;
}

/**
 * useComponentDependencies(componentId, version?) → { status: 'idle'|'loading'|'ready'|'error',
 * data, error, reload }. Any Studio surface can use it (the designer, menus, a hover card); pass a
 * `version` that changes when the component is saved or rebuilt to refetch.
 */
export function useComponentDependencies(componentId, version) {
	const [, setTick] = useState(0);
	useEffect(() => {
		const l = () => setTick((n) => n + 1);
		listeners.add(l);
		return () => listeners.delete(l);
	}, []);
	const key = componentId ? `${componentId}|${version || ''}` : '';
	useEffect(() => {
		if (key) load(key, componentId, false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);
	if (!key) return { status: 'idle', data: null, error: null, reload: () => {} };
	const entry = cache.get(key) || { status: 'loading', data: null, error: null };
	return {
		...entry,
		reload: () => {
			load(key, componentId, true);
			setTick((n) => n + 1);
		}
	};
}

/** The editor's open component (version = saved revision + build state). */
export function useDependencies(studio) {
	const owner = useStudio(studio, (s) => s.owner);
	const revision = useStudio(studio, (s) => s.revision);
	const build = useStudio(studio, (s) => s.build);
	const isComponent = !!owner && owner.type === 'component';
	const version = `${revision || 0}|${build ? `${build.id || ''}:${build.state || ''}:${build.builtRevision || ''}` : '-'}`;
	return useComponentDependencies(isComponent ? owner.id : '', version);
}

const KIND_LABEL = { widget: 'widget', primitive: 'primitive', utility: 'utility', block: 'block', layout: 'layout' };

function KindBadge({ kind }) {
	return (
		<span className={`rps-dep-kind k-${kind || 'widget'}`} data-rps-dep-kind={kind}>
			{KIND_LABEL[kind] || kind || 'widget'}
		</span>
	);
}

function DepRow({ entry, onOpen, direction }) {
	const title = `${entry.name || entry.uniqueId}\n${entry.specifier}${entry.active === false ? '\n(inactive)' : ''}${entry.needsRebuild ? '\nNeeds a rebuild: a dependency changed' : ''}`;
	return (
		<li>
			<button type="button" className="rps-dep-row" title={title} onClick={() => onOpen(entry)} data-rps-dep={direction} data-rps-dep-id={entry.id}>
				<KindBadge kind={entry.kind} />
				<span className="rps-dep-name">
					<span className="n">{entry.name || entry.uniqueId}</span>
					<span className="u">{entry.uniqueId}</span>
				</span>
				{entry.embeddable ? (
					<span className="rps-dep-flag emb" title="Renders as its own embedded instance (own server script, options and on-load data). Use .Raw for presentational use.">
						embeddable
					</span>
				) : null}
				{entry.needsRebuild ? <span className="rps-dep-flag warn">rebuild</span> : null}
				{entry.active === false ? <span className="rps-dep-flag">inactive</span> : null}
			</button>
		</li>
	);
}

/** A list of dependency rows (imports or importers). Reusable outside the properties panel. */
export function DependencyList({ entries, onOpen, direction }) {
	return (
		<ul className="rps-deps-list" data-rps-deps-list={direction}>
			{(entries || []).map((e) => (
				<DepRow key={e.id} entry={e} onOpen={onOpen} direction={direction} />
			))}
		</ul>
	);
}

/**
 * Properties-panel section. onOpen(entry) opens a component in the editor (chrome.js passes its
 * guarded open, which asks about unsaved changes first).
 */
export function DependenciesSection({ studio, onOpen }) {
	const deps = useDependencies(studio);
	const meta = useStudio(studio, (s) => s.meta);
	const owner = useStudio(studio, (s) => s.owner);
	if (!owner || owner.type !== 'component') return null;
	const data = deps.data;
	const imports = (data && data.imports) || [];
	const importedBy = (data && data.importedBy) || [];
	const isWidget = (meta.kind || (data && data.component.kind)) === 'widget';
	return (
		<section className="rps-deps" aria-label="Dependencies" data-rps-dependencies="">
			<h4 className="rps-deps-head">
				Dependencies
				<button type="button" className="rps-tbtn rps-deps-reload" title="Reload dependencies" aria-label="Reload dependencies" onClick={deps.reload}>
					{deps.status === 'loading' ? <Loader2 size={12} className="rps-spin" /> : <RefreshCw size={12} />}
				</button>
			</h4>
			{deps.status === 'error' ? <div className="rps-deps-msg err">{String((deps.error && deps.error.message) || deps.error)}</div> : null}
			{data && !data.build ? <div className="rps-deps-msg">Not compiled yet: dependencies are recorded when the component builds.</div> : null}
			<div className="rps-deps-sub">
				<ArrowDownToLine size={12} /> Imports <span className="rps-count">{imports.length}</span>
			</div>
			{imports.length ? (
				<DependencyList entries={imports} onOpen={onOpen} direction="import" />
			) : data ? (
				<div className="rps-deps-msg">No component records (host modules aren't listed).</div>
			) : null}
			<div className="rps-deps-sub">
				<ArrowUpFromLine size={12} /> Used by <span className="rps-count">{importedBy.length}</span>
			</div>
			{importedBy.length ? (
				<>
					{isWidget ? <div className="rps-deps-msg">Each importer renders this widget as its own embedded instance: options schema changes affect them.</div> : null}
					<DependencyList entries={importedBy} onOpen={onOpen} direction="importer" />
				</>
			) : data ? (
				<div className="rps-deps-msg">No component imports this one.</div>
			) : null}
		</section>
	);
}

/** Title-bar badge on a widget that other components import (embed). Click: show the properties panel. */
export function EmbeddedByBadge({ studio }) {
	const deps = useDependencies(studio);
	const meta = useStudio(studio, (s) => s.meta);
	const importedBy = (deps.data && deps.data.importedBy) || [];
	const kind = meta.kind || (deps.data && deps.data.component.kind);
	if (kind !== 'widget' || !importedBy.length) return null;
	const n = importedBy.length;
	return (
		<button
			type="button"
			className="rps-badge rps-embedded-by"
			title={`Embedded by: ${importedBy.map((e) => e.uniqueId).join(', ')}. A change to this widget's options schema can break them. Click for Dependencies.`}
			onClick={() => studio.set({ propertiesOpen: true })}
			data-rps-embedded-by={n}
		>
			<Layers size={12} /> Embedded by {n} component{n === 1 ? '' : 's'}
		</button>
	);
}

/** Styles (appended to the Studio stylesheet by studio-css.js). */
export const DEPENDENCIES_CSS = `
/* dependencies panel */
.rps-deps { display: flex; flex-direction: column; gap: 6px; }
.rps-deps-head { display: flex; align-items: center; justify-content: space-between; }
.rps-deps-reload { height: 20px; width: 20px; padding: 0; justify-content: center; }
.rps-deps-sub { display: flex; align-items: center; gap: 6px; color: var(--rps-fg); font-weight: 600; margin-top: 2px; }
.rps-deps-msg { color: var(--rps-muted); font-size: 11px; line-height: 1.4; }
.rps-deps-msg.err { color: var(--rps-error); }
.rps-deps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.rps-dep-row { width: 100%; display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 3px; text-align: left; color: var(--rps-fg); cursor: pointer; min-width: 0; }
.rps-dep-row:hover { background: var(--rps-hover); }
.rps-dep-row:focus-visible { outline: 1px solid var(--rps-focus); outline-offset: -1px; }
.rps-dep-name { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.rps-dep-name .n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rps-dep-name .u { color: var(--rps-muted); font-family: Consolas, monospace; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rps-dep-kind { flex: none; min-width: 58px; text-align: center; padding: 1px 5px; border-radius: 3px; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; background: var(--rps-badge); color: var(--rps-fg); }
.rps-dep-kind.k-widget { background: color-mix(in srgb, var(--rps-accent) 30%, transparent); }
.rps-dep-kind.k-primitive { background: color-mix(in srgb, var(--rps-ok) 26%, transparent); }
.rps-dep-kind.k-utility { background: color-mix(in srgb, var(--rps-warn) 26%, transparent); }
.rps-dep-kind.k-block, .rps-dep-kind.k-layout { background: color-mix(in srgb, var(--rps-fg) 16%, transparent); }
.rps-dep-flag { flex: none; padding: 0 5px; border-radius: 8px; font-size: 10px; line-height: 16px; border: 1px solid var(--rps-border); color: var(--rps-muted); }
.rps-dep-flag.emb { border-color: color-mix(in srgb, var(--rps-accent) 60%, transparent); color: var(--rps-fg); }
.rps-dep-flag.warn { border-color: color-mix(in srgb, var(--rps-warn) 70%, transparent); color: var(--rps-fg); }
.rps-embedded-by { cursor: pointer; background: color-mix(in srgb, var(--rps-accent) 28%, transparent); }
.rps-embedded-by:hover { background: color-mix(in srgb, var(--rps-accent) 40%, transparent); }
`;
