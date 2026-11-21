import { GR, getById, findOne, str, bool, distinctRows, inChunks } from '../lib/gr.ts';
import { T, RUNTIME_API_BASE } from '../lib/tables.ts';
import { parseJson, isPlainObject } from '../lib/util.ts';
import { each } from '../lib/gr.ts';
import type {
    BuildRef,
    ComponentRef,
    ComponentImport,
    RegionDef,
    ThemeRef,
    ComponentKind,
    ServerMode,
} from '../../shared/contracts';

/**
 * RPRegistry: canonical IDs, descriptors and build resolution for components and themes.
 */

export const DEFAULT_NAMESPACE = 'app';
export const DEFAULT_REGIONS: RegionDef[] = [
    { name: 'header', acceptsContributions: true },
    { name: 'sidebar', acceptsContributions: true },
    { name: 'main', acceptsContributions: false },
    { name: 'footer', acceptsContributions: true },
];

/** Canonical component ID: '<namespace>/<key>', lower-case. */
export function canonicalId(namespace: string, key: string): string {
    return `${(namespace || DEFAULT_NAMESPACE).toLowerCase()}/${(key || '').toLowerCase()}`;
}

/** Turn a display name into a key: 'Order List' → 'order-list'. */
export function slugify(text: string): string {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 80);
}

/**
 * Asset URL. A build record is overwritten by each compile, so the URL carries the compiled
 * content's hash (?v=) — a new compile means a new URL, which keeps immutable caching safe.
 */
export function assetUrl(buildId: string, path: string, version: string): string {
    // The file name sits before a fixed '/raw' segment: the platform serves its own error page for
    // /api/... URLs whose last segment has a file extension (.js, .css), before scripted REST runs.
    return `${RUNTIME_API_BASE}/assets/${buildId}/${encodeURIComponent(path)}/raw?v=${encodeURIComponent(version)}`;
}

/** A build is usable at runtime once it has compiled output (a failed recompile keeps the last good one). */
export function isUsableBuild(build: GR | null): boolean {
    if (!build) return false;
    return str(build, 'state') === 'ready' && parseInt(str(build, 'built_revision'), 10) > 0;
}

/** A component build's own Tailwind utilities sheet (compiler v6+); the fallback for the portal sheet. */
export const UTILITIES_ASSET = 'utilities.css';
/** A component build's valid Tailwind candidates (JSON array), unioned into the portal sheet. */
export const CANDIDATES_ASSET = 'tailwind-candidates.json';

/**
 * Entry assets of a build: the JS asset named index.* (else the first JS), the author CSS (index.css,
 * else the first other CSS asset: theme.css, or a pre-v6 build's combined sheet) and the Tailwind
 * utilities sheet with its key (the first 16 characters of its content hash, also its URL version).
 */
export function buildRef(build: GR | null): BuildRef | null {
    if (!isUsableBuild(build)) return null;
    const id = build.getUniqueValue();
    const js =
        findOne(T.buildAsset, `build=${id}^kind=js^pathSTARTSWITHindex.`) ||
        findOne(T.buildAsset, `build=${id}^kind=js`, 'path');
    const css =
        findOne(T.buildAsset, `build=${id}^kind=css^path=index.css`) ||
        findOne(T.buildAsset, `build=${id}^kind=css^path!=${UTILITIES_ASSET}`, 'path');
    const utilities = findOne(T.buildAsset, `build=${id}^kind=css^path=${UTILITIES_ASSET}`);
    const ref: BuildRef = {
        id,
        js: js ? assetUrl(id, str(js, 'path'), str(js, 'hash').substring(0, 16)) : null,
        css: css ? assetUrl(id, str(css, 'path'), str(css, 'hash').substring(0, 16)) : null,
    };
    if (utilities) {
        const key = str(utilities, 'hash').substring(0, 16);
        ref.utilities = assetUrl(id, UTILITIES_ASSET, key);
        ref.utilitiesKey = key;
    }
    return ref;
}

/** An asset's identity, without its content (enough to build a BuildRef). */
interface AssetMeta {
    path: string;
    kind: string;
    hash: string;
}

/**
 * buildRef() from already-loaded asset metadata (bulk preload). Same picks as buildRef's queries;
 * where those take "the first match" without an order, this takes the first by path.
 */
function refFromAssets(id: string, assets: AssetMeta[]): BuildRef {
    const sorted = assets.slice().sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const pick = (test: (a: AssetMeta) => boolean): AssetMeta | null => {
        for (const a of sorted) if (test(a)) return a;
        return null;
    };
    const js = pick((a) => a.kind === 'js' && a.path.indexOf('index.') === 0) || pick((a) => a.kind === 'js');
    const css =
        pick((a) => a.kind === 'css' && a.path === 'index.css') ||
        pick((a) => a.kind === 'css' && a.path !== UTILITIES_ASSET);
    const utilities = pick((a) => a.kind === 'css' && a.path === UTILITIES_ASSET);
    const ref: BuildRef = {
        id,
        js: js ? assetUrl(id, js.path, js.hash.substring(0, 16)) : null,
        css: css ? assetUrl(id, css.path, css.hash.substring(0, 16)) : null,
    };
    if (utilities) {
        const key = utilities.hash.substring(0, 16);
        ref.utilities = assetUrl(id, UTILITIES_ASSET, key);
        ref.utilitiesKey = key;
    }
    return ref;
}

/** The single build record of an owner, or null. */
export function buildOf(ownerType: 'component' | 'theme', ownerId: string): GR | null {
    return findOne(T.build, `owner_key=${ownerType}:${ownerId}`);
}

/* ---------------- Per-call lookup cache ---------------- */

/** A record import edge of a build: its specifier and the imported component's sys_id. */
interface DepEdge {
    specifier: string;
    compId: string;
}

/** The plain fields of a component that an import entry carries. */
interface CompInfo {
    uniqueId: string;
    name: string;
    kind: ComponentKind;
    serverMode: ServerMode;
}

/** A component's current build: its sys_id and entry assets (null when not usable). */
interface CurrentBuild {
    id: string;
    ref: BuildRef | null;
}

interface RegistryCache {
    components: Record<string, GR | null>;
    infos: Record<string, CompInfo | null>;
    builds: Record<string, CurrentBuild | null>;
    owners: Record<string, string | null>;
    deps: Record<string, DepEdge[]>;
    /** componentImports results by build (only once preloadRegistry ran: the bulk path). */
    imports: Record<string, ComponentImport[]>;
    /** Set by preloadRegistry: the bulk path, which also memoizes import trees. */
    bulk: boolean;
}

/**
 * Lookups memoized for the duration of ONE withRegistryCache() call (one manifest assembly).
 * Never shared across calls: it is created on entry and dropped in `finally`. Contains only
 * registry records (components, builds, build_dep edges), nothing user-specific.
 */
let cache: RegistryCache | null = null;

/**
 * Run fn with registry lookups memoized (components, current builds and their entry assets,
 * build owners, record import edges). Use only around read-only work: a build written inside fn
 * would not be seen. Nested calls share the outer cache.
 */
export function withRegistryCache<R>(fn: () => R): R {
    if (cache) return fn();
    cache = { components: {}, infos: {}, builds: {}, owners: {}, deps: {}, imports: {}, bulk: false };
    try {
        return fn();
    } finally {
        cache = null;
    }
}

/**
 * A read-only copy of some fields of a record, read in a bulk query. It answers getValue() /
 * getUniqueValue() like a GlideRecord; any other field loads the real record once (getById).
 */
export class RecordSnapshot {
    private real: GR | null | undefined;
    constructor(
        private table: string,
        private id: string,
        private values: Record<string, string | null>
    ) {}
    static of(table: string, gr: GR, fields: string[]): RecordSnapshot {
        const values: Record<string, string | null> = {};
        for (const f of fields) {
            const v = gr.getValue(f);
            values[f] = v === null || v === undefined ? null : String(v);
        }
        return new RecordSnapshot(table, gr.getUniqueValue(), values);
    }
    getUniqueValue(): string {
        return this.id;
    }
    getValue(field: string): string | null {
        if (field in this.values) return this.values[field];
        if (field === 'sys_id') return this.id;
        if (this.real === undefined) this.real = getById(this.table, this.id);
        return this.real ? this.real.getValue(field) : null;
    }
    getDisplayValue(field: string): string {
        if (this.real === undefined) this.real = getById(this.table, this.id);
        return this.real ? String(this.real.getDisplayValue(field) || '') : '';
    }
    isValidRecord(): boolean {
        return true;
    }
}

/** The component fields a manifest reads (componentRef, placements, layouts, imports). */
const COMPONENT_FIELDS = [
    'unique_id',
    'name',
    'kind',
    'server_mode',
    'active',
    'regions_json',
    'default_options_json',
    'options_schema_json',
];

/**
 * Bulk-load the registry records a manifest needs into the withRegistryCache cache: the given
 * components, their builds and entry assets (metadata only), their record import edges, and the same
 * for every imported component, transitively. A handful of IN queries per import depth instead of
 * several findOne per build and per edge. The lazy lookups then read the cache; anything not
 * preloaded still falls back to its own query, so the result is the same either way.
 */
export function preloadRegistry(componentIds: string[]): void {
    const c = cache;
    if (!c) return;
    c.bulk = true;
    const pendingRef: Record<string, boolean> = {};
    const assetsOf: Record<string, AssetMeta[]> = {};
    // A build becomes its component's current build only while that component is still to be loaded
    // here (a target build), or when it is the answer to the owner query of a component being loaded.
    const register = (b: GR, asOwnerAnswer: boolean) => {
        const bid = b.getUniqueValue();
        const ownerKey = str(b, 'owner_key');
        const owner = ownerKey.replace(/^component:/, '');
        c.owners[bid] = owner;
        if (ownerKey.indexOf('component:') !== 0 || owner in c.builds) return;
        if (!asOwnerAnswer && owner in c.components) return;
        c.builds[owner] = { id: bid, ref: null };
        if (isUsableBuild(b)) pendingRef[bid] = true;
    };
    let todo = unique(componentIds).filter((id) => !(id in c.components));
    for (let depth = 0; todo.length && depth < 16; depth++) {
        // Components.
        for (const chunk of inChunks(todo)) {
            each(T.component, `sys_idIN${chunk}`, (gr) => {
                c.components[gr.getUniqueValue()] = RecordSnapshot.of(T.component, gr, COMPONENT_FIELDS);
            });
        }
        for (const id of todo) if (!(id in c.components)) c.components[id] = null;
        // Their builds (components reached through an import already have theirs: the import's target).
        const noBuild = todo.filter((id) => !(id in c.builds));
        for (const chunk of inChunks(noBuild.map((id) => 'component:' + id))) {
            each(T.build, `owner_keyIN${chunk}`, (b) => register(b, true));
        }
        for (const id of noBuild) if (!(id in c.builds)) c.builds[id] = null;
        const buildIds: string[] = [];
        for (const id of todo) {
            const b = c.builds[id];
            if (b) buildIds.push(b.id);
        }
        // Entry assets of the usable builds: path, kind and hash only (never the content).
        const needRef = buildIds.filter((bid) => pendingRef[bid]);
        for (const chunk of inChunks(needRef)) {
            for (const row of distinctRows(T.buildAsset, `buildIN${chunk}^kindINjs,css`, [
                'build',
                'path',
                'kind',
                'hash',
            ])) {
                (assetsOf[row.build] = assetsOf[row.build] || []).push({
                    path: row.path,
                    kind: row.kind,
                    hash: row.hash,
                });
            }
        }
        for (const id of todo) {
            const b = c.builds[id];
            if (b && pendingRef[b.id]) {
                b.ref = refFromAssets(b.id, assetsOf[b.id] || []);
                delete pendingRef[b.id];
            }
        }
        // Record import edges, in sys_id order per build (the order of componentDeps' own query).
        const needDeps = buildIds.filter((bid) => !(bid in c.deps));
        const rows: Record<string, string>[] = [];
        for (const chunk of inChunks(needDeps)) {
            for (const row of distinctRows(T.buildDep, `buildIN${chunk}^kind=component`, [
                'build',
                'sys_id',
                'specifier',
                'target_build',
            ]))
                rows.push(row);
        }
        const unknownTargets = unique(rows.map((r) => r.target_build)).filter((t) => t && !(t in c.owners));
        for (const chunk of inChunks(unknownTargets)) each(T.build, `sys_idIN${chunk}`, (b) => register(b, false));
        for (const t of unknownTargets) if (!(t in c.owners)) c.owners[t] = null;
        const next: Record<string, boolean> = {};
        for (const bid of needDeps) c.deps[bid] = [];
        for (const r of rows) {
            const owner = r.target_build ? c.owners[r.target_build] : null;
            if (owner === null || owner === undefined) continue;
            c.deps[r.build].push({ specifier: r.specifier, compId: owner });
            if (owner && !(owner in c.components)) next[owner] = true;
        }
        todo = Object.keys(next);
    }
}

function unique(list: string[]): string[] {
    const seen: Record<string, boolean> = {};
    const out: string[] = [];
    for (const v of list) {
        if (!v || seen[v]) continue;
        seen[v] = true;
        out.push(v);
    }
    return out;
}

/** A component record by sys_id (memoized inside withRegistryCache). Treat it as read-only. */
export function componentById(id: string): GR | null {
    if (!cache) return getById(T.component, id);
    if (!(id in cache.components)) cache.components[id] = getById(T.component, id);
    return cache.components[id];
}

function componentInfo(id: string): CompInfo | null {
    const read = (): CompInfo | null => {
        const comp = cache ? componentById(id) : getById(T.component, id);
        if (!comp) return null;
        return {
            uniqueId: str(comp, 'unique_id'),
            name: str(comp, 'name'),
            kind: (str(comp, 'kind') || 'widget') as ComponentKind,
            serverMode: (str(comp, 'server_mode') || 'none') as ServerMode,
        };
    };
    if (!cache) return read();
    if (!(id in cache.infos)) cache.infos[id] = read();
    return cache.infos[id];
}

/** A component's current build (buildOf + buildRef), or null when it has no build record. */
function currentBuild(compId: string): CurrentBuild | null {
    const read = (): CurrentBuild | null => {
        const b = buildOf('component', compId);
        return b ? { id: b.getUniqueValue(), ref: buildRef(b) } : null;
    };
    if (!cache) return read();
    if (!(compId in cache.builds)) cache.builds[compId] = read();
    return cache.builds[compId];
}

export function copyBuildRef(ref: BuildRef | null): BuildRef | null {
    if (!ref) return null;
    const copy: BuildRef = { id: ref.id, js: ref.js, css: ref.css };
    if (ref.utilities) {
        copy.utilities = ref.utilities;
        copy.utilitiesKey = ref.utilitiesKey;
    }
    return copy;
}

/** The owner component sys_id of a build ('' when the owner key is empty; null when no such build). */
function buildOwner(buildId: string): string | null {
    const read = (): string | null => {
        const b = getById(T.build, buildId);
        return b ? str(b, 'owner_key').replace(/^component:/, '') : null;
    };
    if (!cache) return read();
    if (!(buildId in cache.owners)) cache.owners[buildId] = read();
    return cache.owners[buildId];
}

/** A build's record import edges (kind=component), in query order; edges to a missing build are dropped. */
function componentDeps(buildId: string): DepEdge[] {
    const read = (): DepEdge[] => {
        const edges: DepEdge[] = [];
        each(T.buildDep, `build=${buildId}^kind=component`, (dep) => {
            const owner = buildOwner(str(dep, 'target_build'));
            if (owner === null) return;
            edges.push({ specifier: str(dep, 'specifier'), compId: owner });
        });
        return edges;
    };
    if (!cache) return read();
    if (!(buildId in cache.deps)) cache.deps[buildId] = read();
    return cache.deps[buildId];
}

export function regionsOf(component: GR): RegionDef[] {
    const raw = parseJson<unknown>(str(component, 'regions_json'), null);
    return normalizeRegions(raw);
}

/** Accepts ['header', …], [{name, acceptsContributions}], or { regions: [...] }. */
export function normalizeRegions(raw: unknown): RegionDef[] {
    let list: unknown = raw;
    if (isPlainObject(raw) && Array.isArray((raw as { regions?: unknown }).regions))
        list = (raw as { regions: unknown[] }).regions;
    if (!Array.isArray(list)) return [];
    const out: RegionDef[] = [];
    const seen: Record<string, boolean> = {};
    for (const item of list) {
        const name = typeof item === 'string' ? item : isPlainObject(item) ? String(item.name || '') : '';
        const clean = name.trim().toLowerCase();
        if (!clean || !/^[a-z][a-z0-9_-]*$/.test(clean) || seen[clean]) continue;
        seen[clean] = true;
        out.push({
            name: clean,
            acceptsContributions: isPlainObject(item) ? item.acceptsContributions !== false : true,
        });
    }
    return out;
}

/** Descriptor for a component. `build` overrides latest_build (release mode pins builds). */
export function componentRef(component: GR, build?: GR | null): ComponentRef {
    const kind = (str(component, 'kind') || 'widget') as ComponentKind;
    let pinnedId: string | null;
    let pinnedRef: BuildRef | null;
    if (build === undefined) {
        const current = currentBuild(component.getUniqueValue());
        pinnedId = current ? current.id : null;
        pinnedRef = current ? copyBuildRef(current.ref) : null;
    } else {
        pinnedId = build ? build.getUniqueValue() : null;
        pinnedRef = buildRef(build);
    }
    const ref: ComponentRef = {
        id: component.getUniqueValue(),
        uniqueId: str(component, 'unique_id'),
        name: str(component, 'name'),
        kind,
        serverMode: (str(component, 'server_mode') || 'none') as ServerMode,
        build: pinnedRef,
    };
    if (kind === 'layout') {
        const regions = regionsOf(component);
        ref.regions = regions.length ? regions : DEFAULT_REGIONS;
        const defaults = parseJson<Record<string, unknown>>(str(component, 'default_options_json'), {});
        ref.defaultOptions = isPlainObject(defaults) ? defaults : {};
    }
    const imports = pinnedId ? componentImports(pinnedId) : [];
    if (imports.length) ref.imports = imports;
    return ref;
}

/**
 * A build's record imports, transitively and dependencies first (post-order), each component once.
 * Cycles are cut (the host also guards). Uses each imported component's current build.
 *
 * Each import also records `importers`: the components whose builds import it DIRECTLY (one per
 * build_dep edge in this tree). Embedded widgets are authorized step by step against these edges,
 * so a request can't skip an intermediate component (§5.1 of .plans/embedded-widgets.md).
 */
export function componentImports(buildId: string): ComponentImport[] {
    if (!cache || !cache.bulk) return walkImports(buildId, false);
    // Bulk path: each build's tree is walked once per assembly (widgets share primitives, and one
    // component is often placed many times), and every caller gets its own copy.
    if (!(buildId in cache.imports)) cache.imports[buildId] = walkImports(buildId, true);
    return cache.imports[buildId].map((imp) => ({
        ...imp,
        build: copyBuildRef(imp.build),
        importers: imp.importers ? imp.importers.slice() : imp.importers,
    }));
}

/**
 * The walk behind componentImports. `pruned` skips a build already walked at the same or a smaller
 * depth: its subtree's imports and importer edges are all in place by then, so walking it again (once
 * per path through a shared primitive) adds nothing. Without it the walk is the original one.
 */
function walkImports(buildId: string, pruned: boolean): ComponentImport[] {
    const out: ComponentImport[] = [];
    const placed: Record<string, ComponentImport> = {};
    const visiting: Record<string, boolean> = {};
    const walkedAt: Record<string, number> = {};
    const rootOwner = buildOwner(buildId) || '';
    const visit = (bId: string, ownerId: string, depth: number) => {
        if (depth > 12 || visiting[bId]) return;
        if (pruned) {
            if (bId in walkedAt && walkedAt[bId] <= depth) return;
            walkedAt[bId] = depth;
        }
        visiting[bId] = true;
        for (const dep of componentDeps(bId)) {
            const compId = dep.compId;
            const info = componentInfo(compId);
            if (!info) continue;
            const current = currentBuild(compId);
            if (current) visit(current.id, compId, depth + 1);
            const specifier = dep.specifier;
            const key = `${specifier}|${compId}`;
            const existing = placed[key];
            if (existing) {
                if (ownerId && existing.importers && existing.importers.indexOf(ownerId) < 0)
                    existing.importers.push(ownerId);
                continue;
            }
            const imp: ComponentImport = {
                specifier,
                id: compId,
                uniqueId: info.uniqueId,
                kind: info.kind,
                build: current ? copyBuildRef(current.ref) : null,
                name: info.name,
                serverMode: info.serverMode,
                importers: ownerId ? [ownerId] : [],
            };
            placed[key] = imp;
            out.push(imp);
        }
        visiting[bId] = false;
    };
    visit(buildId, rootOwner, 0);
    return out;
}

export function componentRefById(id: string): ComponentRef | null {
    const c = getById(T.component, id);
    return c ? componentRef(c) : null;
}

export function themeRef(theme: GR, build?: GR | null): ThemeRef {
    const pinned = build === undefined ? buildOf('theme', theme.getUniqueValue()) : build;
    const b = buildRef(pinned);
    const { light, dark } = splitTokens(parseJson<unknown>(str(theme, 'tokens_json'), {}));
    return {
        id: theme.getUniqueValue(),
        key: str(theme, 'key'),
        name: str(theme, 'name'),
        tokens: light,
        tokensDark: dark,
        css: b && b.css ? [b.css] : [],
        cssText: b && b.css ? null : str(theme, 'stylesheet') || null,
    };
}

/**
 * Theme tokens come either flat ({ primary: '…' } = light only) or per mode
 * ({ light: { … }, dark: { … } }). Dark tokens are null when the theme doesn't define them; the
 * host then falls back to the framework's default dark palette.
 */
export function splitTokens(raw: unknown): { light: Record<string, string>; dark: Record<string, string> | null } {
    if (!isPlainObject(raw)) return { light: {}, dark: null };
    const hasModes = isPlainObject(raw.light) || isPlainObject(raw.dark);
    if (!hasModes) return { light: stringifyValues(raw), dark: null };
    return {
        light: isPlainObject(raw.light) ? stringifyValues(raw.light) : {},
        dark: isPlainObject(raw.dark) ? stringifyValues(raw.dark) : null,
    };
}

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v === null || v === undefined) continue;
        out[k] = typeof v === 'string' ? v : String(v);
    }
    return out;
}

export function findComponentByUniqueId(uniqueId: string): GR | null {
    return findOne(T.component, `unique_id=${uniqueId.toLowerCase()}`);
}

export function isActive(gr: GR): boolean {
    return bool(gr, 'active');
}
