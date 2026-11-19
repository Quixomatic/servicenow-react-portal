import { gs } from '@servicenow/glide'
import { GR, getById, findOne, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { parseJson, isPlainObject } from '../lib/util.ts'
import { matchRoute } from '../lib/paths.ts'
import { notFound, rpError } from '../lib/errors.ts'
import { componentRef, themeRef, DEFAULT_REGIONS } from '../registry/registry.ts'
import { parseRegionSpec, resolveRegions, RegionSpecEntry } from '../registry/block-regions.ts'
import { currentUser } from '../security/user.ts'
import { assembleMenus, resolveMenus, ManifestMenu, MenuResolveContext } from './menu-service.ts'
import { createServerApi } from './server-api.ts'
import { requirePortalAccess, canAccessPageConfig, PageAccessConfig, pageAccessConfig } from '../security/access.ts'
import type {
    BootstrapData,
    ComponentRef,
    ContentWidth,
    PlacementRef,
    RegionDef,
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

// v2: blocks — placements nest under their parent block (children by drop zone), plus
// layout / classes / instance css per placement.
// v3: menus — menu definitions by key (x_312987_portal_menu / _menu_item).
export const MANIFEST_VERSION = 3

/** Maximum block nesting depth (a block inside a block inside …). */
export const MAX_BLOCK_DEPTH = 6

export interface ManifestPage {
    id: string
    route: string
    title: string
    order: number
    layoutId: string | null
    access: PageAccessConfig
    /** The page's own setting: 'inherit' or a ContentWidth. */
    contentWidth: string
    /** The page's own layout options override ({} = portal default). */
    layoutOptions: Record<string, unknown>
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
    /** Active menus by key, unfiltered; bootstrap and $sp.getMenu() resolve them per user. */
    menus: Record<string, ManifestMenu>
}

export function findPortalBySlug(slug: string): GR | null {
    const clean = (slug || '').trim().toLowerCase()
    if (!clean) return null
    return findOne(T.portal, `slug=${clean}`)
}

export function defaultPortal(): GR | null {
    return findOne(T.portal, 'active=true^is_default=true')
}

function regionSpecOf(component: GR): RegionSpecEntry[] {
    try {
        return parseRegionSpec(parseJson<unknown>(str(component, 'regions_json'), []))
    } catch (e) {
        return []
    }
}

/** A block placement's resolved drop zones (null when the placement isn't a block). */
export function blockRegionsOf(placement: GR): RegionDef[] | null {
    const comp = getById(T.component, str(placement, 'component'))
    if (!comp || str(comp, 'kind') !== 'block') return null
    return resolveRegions(regionSpecOf(comp), mergeOptions(comp, placement))
}

/**
 * Placements for one owner as a tree: top-level placements grouped by layout region, and each
 * block's children grouped by its drop zones. Children of a missing or inactive parent are
 * dropped (they reappear when the parent does).
 */
export function placementsFor(ownerQuery: string, layouts: Record<string, ComponentRef>): RegionMap {
    const items: Record<string, PlacementRef> = {}
    const order: string[] = []
    each(
        T.placement,
        `${ownerQuery}^active=true`,
        (pl) => {
            const comp = getById(T.component, str(pl, 'component'))
            if (!comp || !bool(comp, 'active')) return
            const ref = componentRef(comp)
            if (ref.kind === 'layout') layouts[ref.id] = ref
            const item: PlacementRef = {
                id: pl.getUniqueValue(),
                region: str(pl, 'region') || 'main',
                order: int(pl, 'order', 100),
                parentId: str(pl, 'parent') || null,
                component: ref,
                options: mergeOptions(comp, pl),
                styleTokens: parseJson<Record<string, unknown>>(str(pl, 'style_tokens_json'), {}) || {},
                layout: parseJson<PlacementRef['layout']>(str(pl, 'layout_json'), {}) || {},
                classes: str(pl, 'classes'),
                css: str(pl, 'instance_css'),
            }
            if (ref.kind === 'block') {
                item.regions = resolveRegions(regionSpecOf(comp), item.options)
                item.children = {}
            }
            items[item.id] = item
            order.push(item.id)
        },
        ['order', 'sys_created_on'],
    )
    const root: RegionMap = {}
    for (const id of order) {
        const item = items[id]
        if (!item.parentId) {
            ;(root[item.region] = root[item.region] || []).push(item)
            continue
        }
        const parent = items[item.parentId]
        if (!parent || !parent.children) continue
        ;(parent.children[item.region] = parent.children[item.region] || []).push(item)
    }
    return root
}

/** Every placement in a region map, depth-first (blocks' children included). */
export function flattenRegions(map: RegionMap): PlacementRef[] {
    const out: PlacementRef[] = []
    const walk = (m: RegionMap) => {
        for (const r of Object.keys(m)) {
            for (const pl of m[r]) {
                out.push(pl)
                if (pl.children) walk(pl.children)
            }
        }
    }
    walk(map)
    return out
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
                contentWidth: str(pg, 'content_width') || 'inherit',
                layoutOptions: plainObject(parseJson<unknown>(str(pg, 'layout_options_json'), {})),
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
        menus: assembleMenus(portalId),
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
            layoutOptions: effectiveLayoutOptions(manifest, manifest.defaultLayoutId, null),
            regions: manifest.regions,
            pages: manifest.pages
                .filter((p) => canAccessPageConfig(p.access))
                .map((p) => ({ id: p.id, route: p.route, title: p.title })),
            menus: resolveMenus(manifest.menus, menuContext(manifest, null)),
        },
    }
}

/**
 * Context for resolving a manifest's menus for the current user. Condition scripts get `api` as
 * $sp / $rp; without one (bootstrap) a portal-scoped helper is created.
 */
export function menuContext(manifest: Manifest, api: Record<string, unknown> | null): MenuResolveContext {
    const portal = manifest.portal
    return {
        pages: manifest.pages,
        portal: { id: portal.id, slug: portal.slug, name: portal.name },
        api:
            api ||
            createServerApi({
                input: {},
                options: {},
                params: {},
                portal: { id: portal.id, slug: portal.slug, name: portal.name, settings: portal.settings },
                page: null,
                component: { id: '', uniqueId: 'menu', instanceId: '' },
                manifest,
            }),
    }
}

export const CONTENT_WIDTHS = ['full', '7xl', '6xl', '5xl', '4xl', '3xl']

function plainObject(v: unknown): Record<string, unknown> {
    return isPlainObject(v) ? v : {}
}

/**
 * Effective layout options: the layout's defaults, then the portal default (settings.layoutOptions,
 * only when the layout is the portal's default layout), then the page's own override.
 */
export function effectiveLayoutOptions(manifest: Manifest, layoutId: string | null, page: ManifestPage | null): Record<string, unknown> {
    const layout = layoutId ? manifest.layouts[layoutId] : null
    const out: Record<string, unknown> = { ...plainObject(layout ? layout.defaultOptions : null) }
    if (layoutId && layoutId === manifest.defaultLayoutId) Object.assign(out, plainObject((manifest.portal.settings || {}).layoutOptions))
    if (page) Object.assign(out, plainObject(page.layoutOptions))
    return out
}

/** Effective content width: the page's own, else the portal default, else 7xl. */
export function effectiveContentWidth(manifest: Manifest, page: ManifestPage): ContentWidth {
    const own = page.contentWidth
    if (own && CONTENT_WIDTHS.indexOf(own) >= 0) return own as ContentWidth
    const portalDefault = String((manifest.portal.settings || {}).contentWidth || '')
    return (CONTENT_WIDTHS.indexOf(portalDefault) >= 0 ? portalDefault : '7xl') as ContentWidth
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
            page: {
                id: match.page.id,
                route: match.page.route,
                title: match.page.title,
                params: match.params,
                contentWidth: effectiveContentWidth(manifest, match.page),
            },
            layout: layoutId ? manifest.layouts[layoutId] || null : null,
            layoutOptions: effectiveLayoutOptions(manifest, layoutId, match.page),
            regions: match.page.regions,
        },
    }
}

/** Every placement in a manifest by id (portal-level and page-level). */
export function placementIndex(manifest: Manifest): Record<string, { placement: PlacementRef; page: ManifestPage | null }> {
    const out: Record<string, { placement: PlacementRef; page: ManifestPage | null }> = {}
    for (const pl of flattenRegions(manifest.regions)) out[pl.id] = { placement: pl, page: null }
    for (const page of manifest.pages) for (const pl of flattenRegions(page.regions)) out[pl.id] = { placement: pl, page }
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
