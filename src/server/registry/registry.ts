import { GR, getById, findOne, str, bool } from '../lib/gr.ts'
import { T, RUNTIME_API_BASE } from '../lib/tables.ts'
import { parseJson, isPlainObject } from '../lib/util.ts'
import { each } from '../lib/gr.ts'
import type { BuildRef, ComponentRef, ComponentImport, RegionDef, ThemeRef, ComponentKind, ServerMode } from '../../shared/contracts'

/**
 * RPRegistry: canonical IDs, descriptors and build resolution for components and themes.
 */

export const DEFAULT_NAMESPACE = 'app'
export const DEFAULT_REGIONS: RegionDef[] = [
    { name: 'header', acceptsContributions: true },
    { name: 'sidebar', acceptsContributions: true },
    { name: 'main', acceptsContributions: false },
    { name: 'footer', acceptsContributions: true },
]

/** Canonical component ID: '<namespace>/<key>', lower-case. */
export function canonicalId(namespace: string, key: string): string {
    return `${(namespace || DEFAULT_NAMESPACE).toLowerCase()}/${(key || '').toLowerCase()}`
}

/** Turn a display name into a key: 'Order List' → 'order-list'. */
export function slugify(text: string): string {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 80)
}

/**
 * Asset URL. A build record is overwritten by each compile, so the URL carries the compiled
 * content's hash (?v=) — a new compile means a new URL, which keeps immutable caching safe.
 */
export function assetUrl(buildId: string, path: string, version: string): string {
    // The file name sits before a fixed '/raw' segment: the platform serves its own error page for
    // /api/... URLs whose last segment has a file extension (.js, .css), before scripted REST runs.
    return `${RUNTIME_API_BASE}/assets/${buildId}/${encodeURIComponent(path)}/raw?v=${encodeURIComponent(version)}`
}

/** A build is usable at runtime once it has compiled output (a failed recompile keeps the last good one). */
export function isUsableBuild(build: GR | null): boolean {
    if (!build) return false
    return str(build, 'state') === 'ready' && parseInt(str(build, 'built_revision'), 10) > 0
}

/** Entry assets of a build: the JS asset named index.* (else the first JS) and the first CSS asset. */
export function buildRef(build: GR | null): BuildRef | null {
    if (!isUsableBuild(build)) return null
    const id = build.getUniqueValue()
    const js =
        findOne(T.buildAsset, `build=${id}^kind=js^pathSTARTSWITHindex.`) || findOne(T.buildAsset, `build=${id}^kind=js`, 'path')
    const css = findOne(T.buildAsset, `build=${id}^kind=css`, 'path')
    return {
        id,
        js: js ? assetUrl(id, str(js, 'path'), str(js, 'hash').substring(0, 16)) : null,
        css: css ? assetUrl(id, str(css, 'path'), str(css, 'hash').substring(0, 16)) : null,
    }
}

/** The single build record of an owner, or null. */
export function buildOf(ownerType: 'component' | 'theme', ownerId: string): GR | null {
    return findOne(T.build, `owner_key=${ownerType}:${ownerId}`)
}

/* ---------------- Per-call lookup cache ---------------- */

/** A record import edge of a build: its specifier and the imported component's sys_id. */
interface DepEdge {
    specifier: string
    compId: string
}

/** The plain fields of a component that an import entry carries. */
interface CompInfo {
    uniqueId: string
    name: string
    kind: ComponentKind
    serverMode: ServerMode
}

/** A component's current build: its sys_id and entry assets (null when not usable). */
interface CurrentBuild {
    id: string
    ref: BuildRef | null
}

interface RegistryCache {
    components: Record<string, GR | null>
    infos: Record<string, CompInfo | null>
    builds: Record<string, CurrentBuild | null>
    owners: Record<string, string | null>
    deps: Record<string, DepEdge[]>
}

/**
 * Lookups memoized for the duration of ONE withRegistryCache() call (one manifest assembly).
 * Never shared across calls: it is created on entry and dropped in `finally`. Contains only
 * registry records (components, builds, build_dep edges), nothing user-specific.
 */
let cache: RegistryCache | null = null

/**
 * Run fn with registry lookups memoized (components, current builds and their entry assets,
 * build owners, record import edges). Use only around read-only work: a build written inside fn
 * would not be seen. Nested calls share the outer cache.
 */
export function withRegistryCache<R>(fn: () => R): R {
    if (cache) return fn()
    cache = { components: {}, infos: {}, builds: {}, owners: {}, deps: {} }
    try {
        return fn()
    } finally {
        cache = null
    }
}

/** A component record by sys_id (memoized inside withRegistryCache). Treat it as read-only. */
export function componentById(id: string): GR | null {
    if (!cache) return getById(T.component, id)
    if (!(id in cache.components)) cache.components[id] = getById(T.component, id)
    return cache.components[id]
}

function componentInfo(id: string): CompInfo | null {
    const read = (): CompInfo | null => {
        const comp = cache ? componentById(id) : getById(T.component, id)
        if (!comp) return null
        return {
            uniqueId: str(comp, 'unique_id'),
            name: str(comp, 'name'),
            kind: (str(comp, 'kind') || 'widget') as ComponentKind,
            serverMode: (str(comp, 'server_mode') || 'none') as ServerMode,
        }
    }
    if (!cache) return read()
    if (!(id in cache.infos)) cache.infos[id] = read()
    return cache.infos[id]
}

/** A component's current build (buildOf + buildRef), or null when it has no build record. */
function currentBuild(compId: string): CurrentBuild | null {
    const read = (): CurrentBuild | null => {
        const b = buildOf('component', compId)
        return b ? { id: b.getUniqueValue(), ref: buildRef(b) } : null
    }
    if (!cache) return read()
    if (!(compId in cache.builds)) cache.builds[compId] = read()
    return cache.builds[compId]
}

function copyBuildRef(ref: BuildRef | null): BuildRef | null {
    return ref ? { id: ref.id, js: ref.js, css: ref.css } : null
}

/** The owner component sys_id of a build ('' when the owner key is empty; null when no such build). */
function buildOwner(buildId: string): string | null {
    const read = (): string | null => {
        const b = getById(T.build, buildId)
        return b ? str(b, 'owner_key').replace(/^component:/, '') : null
    }
    if (!cache) return read()
    if (!(buildId in cache.owners)) cache.owners[buildId] = read()
    return cache.owners[buildId]
}

/** A build's record import edges (kind=component), in query order; edges to a missing build are dropped. */
function componentDeps(buildId: string): DepEdge[] {
    const read = (): DepEdge[] => {
        const edges: DepEdge[] = []
        each(T.buildDep, `build=${buildId}^kind=component`, (dep) => {
            const owner = buildOwner(str(dep, 'target_build'))
            if (owner === null) return
            edges.push({ specifier: str(dep, 'specifier'), compId: owner })
        })
        return edges
    }
    if (!cache) return read()
    if (!(buildId in cache.deps)) cache.deps[buildId] = read()
    return cache.deps[buildId]
}

export function regionsOf(component: GR): RegionDef[] {
    const raw = parseJson<unknown>(str(component, 'regions_json'), null)
    return normalizeRegions(raw)
}

/** Accepts ['header', …], [{name, acceptsContributions}], or { regions: [...] }. */
export function normalizeRegions(raw: unknown): RegionDef[] {
    let list: unknown = raw
    if (isPlainObject(raw) && Array.isArray((raw as { regions?: unknown }).regions)) list = (raw as { regions: unknown[] }).regions
    if (!Array.isArray(list)) return []
    const out: RegionDef[] = []
    const seen: Record<string, boolean> = {}
    for (const item of list) {
        const name = typeof item === 'string' ? item : isPlainObject(item) ? String(item.name || '') : ''
        const clean = name.trim().toLowerCase()
        if (!clean || !/^[a-z][a-z0-9_-]*$/.test(clean) || seen[clean]) continue
        seen[clean] = true
        out.push({
            name: clean,
            acceptsContributions: isPlainObject(item) ? item.acceptsContributions !== false : true,
        })
    }
    return out
}

/** Descriptor for a component. `build` overrides latest_build (release mode pins builds). */
export function componentRef(component: GR, build?: GR | null): ComponentRef {
    const kind = (str(component, 'kind') || 'widget') as ComponentKind
    let pinnedId: string | null
    let pinnedRef: BuildRef | null
    if (build === undefined) {
        const current = currentBuild(component.getUniqueValue())
        pinnedId = current ? current.id : null
        pinnedRef = current ? copyBuildRef(current.ref) : null
    } else {
        pinnedId = build ? build.getUniqueValue() : null
        pinnedRef = buildRef(build)
    }
    const ref: ComponentRef = {
        id: component.getUniqueValue(),
        uniqueId: str(component, 'unique_id'),
        name: str(component, 'name'),
        kind,
        serverMode: (str(component, 'server_mode') || 'none') as ServerMode,
        build: pinnedRef,
    }
    if (kind === 'layout') {
        const regions = regionsOf(component)
        ref.regions = regions.length ? regions : DEFAULT_REGIONS
        const defaults = parseJson<Record<string, unknown>>(str(component, 'default_options_json'), {})
        ref.defaultOptions = isPlainObject(defaults) ? defaults : {}
    }
    const imports = pinnedId ? componentImports(pinnedId) : []
    if (imports.length) ref.imports = imports
    return ref
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
    const out: ComponentImport[] = []
    const placed: Record<string, ComponentImport> = {}
    const visiting: Record<string, boolean> = {}
    const rootOwner = buildOwner(buildId) || ''
    const visit = (bId: string, ownerId: string, depth: number) => {
        if (depth > 12 || visiting[bId]) return
        visiting[bId] = true
        for (const dep of componentDeps(bId)) {
            const compId = dep.compId
            const info = componentInfo(compId)
            if (!info) continue
            const current = currentBuild(compId)
            if (current) visit(current.id, compId, depth + 1)
            const specifier = dep.specifier
            const key = `${specifier}|${compId}`
            const existing = placed[key]
            if (existing) {
                if (ownerId && existing.importers && existing.importers.indexOf(ownerId) < 0) existing.importers.push(ownerId)
                continue
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
            }
            placed[key] = imp
            out.push(imp)
        }
        visiting[bId] = false
    }
    visit(buildId, rootOwner, 0)
    return out
}

export function componentRefById(id: string): ComponentRef | null {
    const c = getById(T.component, id)
    return c ? componentRef(c) : null
}

export function themeRef(theme: GR, build?: GR | null): ThemeRef {
    const pinned = build === undefined ? buildOf('theme', theme.getUniqueValue()) : build
    const b = buildRef(pinned)
    const { light, dark } = splitTokens(parseJson<unknown>(str(theme, 'tokens_json'), {}))
    return {
        id: theme.getUniqueValue(),
        key: str(theme, 'key'),
        name: str(theme, 'name'),
        tokens: light,
        tokensDark: dark,
        css: b && b.css ? [b.css] : [],
        cssText: b && b.css ? null : str(theme, 'stylesheet') || null,
    }
}

/**
 * Theme tokens come either flat ({ primary: '…' } = light only) or per mode
 * ({ light: { … }, dark: { … } }). Dark tokens are null when the theme doesn't define them; the
 * host then falls back to the framework's default dark palette.
 */
export function splitTokens(raw: unknown): { light: Record<string, string>; dark: Record<string, string> | null } {
    if (!isPlainObject(raw)) return { light: {}, dark: null }
    const hasModes = isPlainObject(raw.light) || isPlainObject(raw.dark)
    if (!hasModes) return { light: stringifyValues(raw), dark: null }
    return {
        light: isPlainObject(raw.light) ? stringifyValues(raw.light) : {},
        dark: isPlainObject(raw.dark) ? stringifyValues(raw.dark) : null,
    }
}

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (v === null || v === undefined) continue
        out[k] = typeof v === 'string' ? v : String(v)
    }
    return out
}

export function findComponentByUniqueId(uniqueId: string): GR | null {
    return findOne(T.component, `unique_id=${uniqueId.toLowerCase()}`)
}

export function isActive(gr: GR): boolean {
    return bool(gr, 'active')
}
