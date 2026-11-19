import { gs } from '@servicenow/glide'
import { GR, getById, findOne, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { parseJson, isPlainObject } from '../lib/util.ts'
import { matchRoute } from '../lib/paths.ts'
import { notFound, rpError } from '../lib/errors.ts'
import { componentRef, themeRef, DEFAULT_REGIONS } from '../registry/registry.ts'
import { currentUser } from '../security/user.ts'
import { requirePortalAccess, canAccessPageConfig, PageAccessConfig, pageAccessConfig } from '../security/access.ts'
import type {
    BootstrapData,
    ComponentRef,
    PlacementRef,
    RegionMap,
    ResolvePageData,
    ThemeRef,
} from '../../shared/contracts'

/**
 * RPPortalService: bootstrap and page resolution.
 *
 * Both modes serve the same Manifest shape:
 * - release mode: the portal has an active release → its sealed manifest_json is served;
 * - live mode: no active release → the manifest is assembled from current records and
 *   each component's latest usable build (authoring / pre-release).
 */

export const MANIFEST_VERSION = 1

export interface ManifestPage {
    id: string
    route: string
    title: string
    order: number
    layoutId: string | null
    access: PageAccessConfig
    regions: RegionMap
}

export interface Manifest {
    manifestVersion: number
    portal: BootstrapData['portal']
    theme: ThemeRef | null
    defaultLayoutId: string | null
    layouts: Record<string, ComponentRef>
    regions: RegionMap
    pages: ManifestPage[]
}

export function findPortalBySlug(slug: string): GR | null {
    const clean = (slug || '').trim().toLowerCase()
    if (!clean) return null
    return findOne(T.portal, `slug=${clean}`)
}

export function defaultPortal(): GR | null {
    return findOne(T.portal, 'active=true^is_default=true')
}

/** Placements for one owner, grouped by region and ordered. */
export function placementsFor(ownerQuery: string, layouts: Record<string, ComponentRef>): RegionMap {
    const map: RegionMap = {}
    each(
        T.placement,
        `${ownerQuery}^active=true`,
        (pl) => {
            const comp = getById(T.component, str(pl, 'component'))
            if (!comp || !bool(comp, 'active')) return
            const ref = componentRef(comp)
            if (ref.kind === 'layout') layouts[ref.id] = ref
            const region = str(pl, 'region') || 'main'
            const item: PlacementRef = {
                id: pl.getUniqueValue(),
                region,
                order: int(pl, 'order', 100),
                parentId: str(pl, 'parent') || null,
                component: ref,
                options: mergeOptions(comp, pl),
                styleTokens: parseJson<Record<string, string>>(str(pl, 'style_tokens_json'), {}),
            }
            ;(map[region] = map[region] || []).push(item)
        },
        ['order', 'sys_created_on'],
    )
    return map
}

/** Effective options: component defaults overlaid by the placement's options. */
export function mergeOptions(component: GR, placement: GR | null): Record<string, unknown> {
    const defaults = parseJson<Record<string, unknown>>(str(component, 'default_options_json'), {})
    const own = placement ? parseJson<Record<string, unknown>>(str(placement, 'options_json'), {}) : {}
    return { ...(isPlainObject(defaults) ? defaults : {}), ...(isPlainObject(own) ? own : {}) }
}

/** Assemble a manifest from current records (live mode, and the input to publishing). */
export function assembleManifest(portal: GR): Manifest {
    const portalId = portal.getUniqueValue()
    const layouts: Record<string, ComponentRef> = {}

    const defaultLayout = getById(T.component, str(portal, 'default_layout'))
    let defaultLayoutId: string | null = null
    if (defaultLayout && bool(defaultLayout, 'active')) {
        const ref = componentRef(defaultLayout)
        layouts[ref.id] = ref
        defaultLayoutId = ref.id
    }

    const theme = getById(T.theme, str(portal, 'theme'))
    const pages: ManifestPage[] = []
    each(
        T.page,
        `portal=${portalId}^active=true`,
        (pg) => {
            let layoutId: string | null = null
            const override = getById(T.component, str(pg, 'layout_override'))
            if (override && bool(override, 'active')) {
                const ref = componentRef(override)
                layouts[ref.id] = ref
                layoutId = ref.id
            }
            pages.push({
                id: pg.getUniqueValue(),
                route: str(pg, 'route_pattern'),
                title: str(pg, 'title') || str(pg, 'name'),
                order: int(pg, 'order', 100),
                layoutId,
                access: pageAccessConfig(pg),
                regions: placementsFor(`page=${pg.getUniqueValue()}`, layouts),
            })
        },
        ['order', 'route_pattern'],
    )

    const homePage = getById(T.page, str(portal, 'home_page'))
    return {
        manifestVersion: MANIFEST_VERSION,
        portal: {
            id: portalId,
            slug: str(portal, 'slug'),
            name: str(portal, 'name'),
            homeRoute: homePage ? str(homePage, 'route_pattern') : '',
            settings: parseJson<Record<string, unknown>>(str(portal, 'settings_json'), {}),
            navigation: parseJson<unknown>(str(portal, 'navigation_json'), null),
        },
        theme: theme && bool(theme, 'active') ? themeRef(theme) : null,
        defaultLayoutId,
        layouts,
        regions: placementsFor(`portal=${portalId}^pageISEMPTY`, layouts),
        pages,
    }
}

export interface ResolvedManifest {
    manifest: Manifest
    release: { id: string; version: number } | null
}

/**
 * The manifest the runtime serves: the portal's compiled release record. If the portal has
 * never been processed, the manifest is assembled in memory (consumers never write records).
 */
export function currentManifest(portal: GR): ResolvedManifest {
    const release = findOne(T.release, `portal=${portal.getUniqueValue()}`)
    if (release) {
        const manifest = parseJson<Manifest | null>(str(release, 'manifest_json'), null)
        if (manifest && manifest.manifestVersion === MANIFEST_VERSION) {
            return { manifest, release: { id: release.getUniqueValue(), version: int(release, 'revision') } }
        }
    }
    return { manifest: assembleManifest(portal), release: null }
}

export function bootstrap(slug: string): { data: BootstrapData; release: ResolvedManifest['release'] } {
    const portal = requirePortalAccess(findPortalBySlug(slug))
    const { manifest, release } = currentManifest(portal)
    return {
        release,
        data: {
            portal: manifest.portal,
            user: currentUser(),
            release,
            theme: manifest.theme,
            layout: manifest.defaultLayoutId ? manifest.layouts[manifest.defaultLayoutId] || null : null,
            regions: manifest.regions,
            pages: manifest.pages
                .filter((p) => canAccessPageConfig(p.access))
                .map((p) => ({ id: p.id, route: p.route, title: p.title })),
        },
    }
}

/** Find the best-matching accessible page for a decoded portal-relative path. */
export function matchPage(manifest: Manifest, path: string): { page: ManifestPage; params: Record<string, string> } | null {
    const target = (path || '').replace(/^\/+|\/+$/g, '') || manifest.portal.homeRoute || ''
    let best: { page: ManifestPage; params: Record<string, string>; score: number } | null = null
    for (const page of manifest.pages) {
        const m = matchRoute(page.route, target)
        if (m && (!best || m.score > best.score)) best = { page, params: m.params, score: m.score }
    }
    return best ? { page: best.page, params: best.params } : null
}

export function resolvePage(slug: string, path: string): { data: ResolvePageData; release: ResolvedManifest['release'] } {
    const portal = requirePortalAccess(findPortalBySlug(slug))
    const { manifest, release } = currentManifest(portal)
    const match = matchPage(manifest, path)
    if (!match) throw rpError(404, 'page_not_found', `No page matches "${path || '/'}"`)
    if (!canAccessPageConfig(match.page.access)) throw notFound('Page not found')
    const layoutId = match.page.layoutId || manifest.defaultLayoutId
    return {
        release,
        data: {
            page: { id: match.page.id, route: match.page.route, title: match.page.title, params: match.params },
            layout: layoutId ? manifest.layouts[layoutId] || null : null,
            regions: match.page.regions,
        },
    }
}

/** Every placement in a manifest by id (portal-level and page-level). */
export function placementIndex(manifest: Manifest): Record<string, { placement: PlacementRef; page: ManifestPage | null }> {
    const out: Record<string, { placement: PlacementRef; page: ManifestPage | null }> = {}
    for (const region of Object.keys(manifest.regions)) for (const pl of manifest.regions[region]) out[pl.id] = { placement: pl, page: null }
    for (const page of manifest.pages)
        for (const region of Object.keys(page.regions)) for (const pl of page.regions[region]) out[pl.id] = { placement: pl, page }
    return out
}

/** Region names of the effective layout for an owner (used by placement validation). */
export function effectiveRegionNames(portalId: string, pageId: string | null): string[] | null {
    let layout: GR | null = null
    if (pageId) {
        const page = getById(T.page, pageId)
        if (page) layout = getById(T.component, str(page, 'layout_override'))
        if (!layout && page) portalId = str(page, 'portal')
    }
    if (!layout) {
        const portal = getById(T.portal, portalId)
        if (portal) layout = getById(T.component, str(portal, 'default_layout'))
    }
    if (!layout) return null
    const ref = componentRef(layout, null)
    return (ref.regions || DEFAULT_REGIONS).map((r) => r.name)
}

/**
 * System property values for the browser. Only properties the portal exposes
 * (settings.exposedProperties) or under x_312987_portal.public. are returned; anything else is
 * null — the browser must never be able to read arbitrary sys_properties.
 */
export function exposedProperties(slug: string, names: string[]): Record<string, string | null> {
    const portal = requirePortalAccess(findPortalBySlug(slug))
    const settings = parseJson<Record<string, unknown>>(str(portal, 'settings_json'), {})
    const allowed = Array.isArray(settings.exposedProperties) ? (settings.exposedProperties as unknown[]).map(String) : []
    const out: Record<string, string | null> = {}
    for (const raw of names.slice(0, 100)) {
        const name = String(raw || '').trim()
        if (!name) continue
        const ok = name.indexOf('x_312987_portal.public.') === 0 || allowed.indexOf(name) >= 0
        out[name] = ok ? gs.getProperty(name, null) : null
    }
    return out
}

/** Translated UI messages (gs.getMessage) in the user's language. */
export function translateMessages(keys: string[]): Record<string, string> {
    const out: Record<string, string> = {}
    for (const raw of keys.slice(0, 300)) {
        const key = String(raw || '')
        if (key) out[key] = gs.getMessage(key)
    }
    return out
}
