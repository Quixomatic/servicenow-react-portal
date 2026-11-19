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
    const pinned = build === undefined ? buildOf('component', component.getUniqueValue()) : build
    const ref: ComponentRef = {
        id: component.getUniqueValue(),
        uniqueId: str(component, 'unique_id'),
        name: str(component, 'name'),
        kind,
        serverMode: (str(component, 'server_mode') || 'none') as ServerMode,
        build: buildRef(pinned),
    }
    if (kind === 'layout') {
        const regions = regionsOf(component)
        ref.regions = regions.length ? regions : DEFAULT_REGIONS
        const defaults = parseJson<Record<string, unknown>>(str(component, 'default_options_json'), {})
        ref.defaultOptions = isPlainObject(defaults) ? defaults : {}
    }
    const imports = pinned ? componentImports(pinned.getUniqueValue()) : []
    if (imports.length) ref.imports = imports
    return ref
}

/**
 * A build's record imports, transitively and dependencies first (post-order), each component once.
 * Cycles are cut (the host also guards). Uses each imported component's current build.
 */
export function componentImports(buildId: string): ComponentImport[] {
    const out: ComponentImport[] = []
    const placed: Record<string, boolean> = {}
    const visiting: Record<string, boolean> = {}
    const visit = (bId: string, depth: number) => {
        if (depth > 12 || visiting[bId]) return
        visiting[bId] = true
        each(T.buildDep, `build=${bId}^kind=component`, (dep) => {
            const target = getById(T.build, str(dep, 'target_build'))
            if (!target) return
            const compId = str(target, 'owner_key').replace(/^component:/, '')
            const comp = getById(T.component, compId)
            if (!comp) return
            const current = buildOf('component', compId)
            if (current) visit(current.getUniqueValue(), depth + 1)
            const specifier = str(dep, 'specifier')
            const key = `${specifier}|${compId}`
            if (placed[key]) return
            placed[key] = true
            out.push({
                specifier,
                id: compId,
                uniqueId: str(comp, 'unique_id'),
                kind: (str(comp, 'kind') || 'widget') as ComponentKind,
                build: buildRef(current),
            })
        })
        visiting[bId] = false
    }
    visit(buildId, 0)
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
