import { gs } from '@servicenow/glide'
import { GR, newGR, getById, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, notFound, rpError } from '../lib/errors.ts'
import { parseJson, isPlainObject } from '../lib/util.ts'
import { requireStudio } from '../security/access.ts'
import { normalizeRegions, DEFAULT_REGIONS } from '../registry/registry.ts'
import { processPortal } from '../release/release-service.ts'
import { effectiveRegionNames } from '../runtime/portal-service.ts'

/**
 * RPDesignService: the page designer's API. Every write is validated by the placement/page
 * business rules and ends with one release reprocess for the affected portal (reprocessing is
 * suspended while a multi-record operation such as a reorder runs).
 */

export const SKIP_REPROCESS_KEY = 'x_312987_portal.skip_reprocess'

export function reprocessSuppressed(): boolean {
    const session: any = gs.getSession()
    return String(session.getClientData(SKIP_REPROCESS_KEY) || '') === 'true'
}

/** Run `fn` with reprocess rules suspended, then reprocess the given portal once. */
function batch<R>(portalId: string, fn: () => R): R {
    const session: any = gs.getSession()
    session.putClientData(SKIP_REPROCESS_KEY, 'true')
    try {
        return fn()
    } finally {
        session.putClientData(SKIP_REPROCESS_KEY, '')
        if (portalId) processPortal(portalId)
    }
}

/* ---------------- DTOs ---------------- */

export interface PlacementDto {
    id: string
    region: string
    order: number
    active: boolean
    scope: 'page' | 'portal'
    pageId: string | null
    component: { id: string; uniqueId: string; name: string }
    options: Record<string, unknown>
    effectiveOptions: Record<string, unknown>
}

function placementDto(pl: GR): PlacementDto {
    const comp = getById(T.component, str(pl, 'component'))
    const own = parseJson<Record<string, unknown>>(str(pl, 'options_json'), {})
    const defaults = comp ? parseJson<Record<string, unknown>>(str(comp, 'default_options_json'), {}) : {}
    return {
        id: pl.getUniqueValue(),
        region: str(pl, 'region'),
        order: int(pl, 'order', 100),
        active: bool(pl, 'active'),
        scope: str(pl, 'page') ? 'page' : 'portal',
        pageId: str(pl, 'page') || null,
        component: comp ? { id: comp.getUniqueValue(), uniqueId: str(comp, 'unique_id'), name: str(comp, 'name') } : { id: '', uniqueId: '', name: '(missing component)' },
        options: isPlainObject(own) ? own : {},
        effectiveOptions: { ...(isPlainObject(defaults) ? defaults : {}), ...(isPlainObject(own) ? own : {}) },
    }
}

function groupPlacements(query: string): Record<string, PlacementDto[]> {
    const out: Record<string, PlacementDto[]> = {}
    each(
        T.placement,
        query,
        (pl) => {
            const d = placementDto(pl)
            ;(out[d.region] = out[d.region] || []).push(d)
        },
        ['order', 'sys_created_on'],
    )
    return out
}

function pageDto(pg: GR) {
    return {
        id: pg.getUniqueValue(),
        name: str(pg, 'name'),
        title: str(pg, 'title'),
        route: str(pg, 'route_pattern'),
        order: int(pg, 'order', 100),
        active: bool(pg, 'active'),
        layoutOverride: str(pg, 'layout_override') || null,
        access: parseJson<Record<string, unknown>>(str(pg, 'access_config_json'), {}),
        portalId: str(pg, 'portal'),
    }
}

function portalDto(p: GR) {
    return {
        id: p.getUniqueValue(),
        slug: str(p, 'slug'),
        name: str(p, 'name'),
        active: bool(p, 'active'),
        isDefault: bool(p, 'is_default'),
        theme: str(p, 'theme') || null,
        defaultLayout: str(p, 'default_layout') || null,
        homePage: str(p, 'home_page') || null,
        navigation: parseJson<unknown>(str(p, 'navigation_json'), []),
        settings: parseJson<Record<string, unknown>>(str(p, 'settings_json'), {}),
    }
}

function layoutDto(c: GR) {
    const regions = normalizeRegions(parseJson<unknown>(str(c, 'regions_json'), null))
    return { id: c.getUniqueValue(), uniqueId: str(c, 'unique_id'), name: str(c, 'name'), regions: regions.length ? regions : DEFAULT_REGIONS }
}

/* ---------------- Reads ---------------- */

export function resolveDesignTarget(id: string) {
    requireStudio('any')
    const portal = getById(T.portal, id)
    if (portal) return { kind: 'portal', portalId: id, pageId: null }
    const page = getById(T.page, id)
    if (page) return { kind: 'page', portalId: str(page, 'portal'), pageId: id }
    if (getById(T.component, id)) return { kind: 'component', portalId: null, pageId: null }
    if (getById(T.theme, id)) return { kind: 'theme', portalId: null, pageId: null }
    return { kind: 'unknown', portalId: null, pageId: null }
}

export function portalDesign(portalId: string) {
    requireStudio('design')
    const portal = getById(T.portal, portalId)
    if (!portal) throw notFound('Portal not found')
    const themes: unknown[] = []
    each(T.theme, 'active=true', (t) => themes.push({ id: t.getUniqueValue(), key: str(t, 'key'), name: str(t, 'name') }), 'name')
    const layouts: unknown[] = []
    each(T.component, 'kind=layout^active=true', (c) => layouts.push(layoutDto(c)), 'name')
    const palette: unknown[] = []
    each(
        T.component,
        'kind=widget^placeable=true^active=true',
        (c) =>
            palette.push({
                id: c.getUniqueValue(),
                uniqueId: str(c, 'unique_id'),
                name: str(c, 'name'),
                description: str(c, 'description'),
                serverMode: str(c, 'server_mode') || 'none',
                optionsSchema: parseJson<unknown>(str(c, 'options_schema_json'), null),
                defaultOptions: parseJson<Record<string, unknown>>(str(c, 'default_options_json'), {}),
            }),
        'name',
    )
    const pages: unknown[] = []
    each(T.page, `portal=${portalId}`, (pg) => pages.push(pageDto(pg)), ['order', 'route_pattern'])
    return {
        portal: portalDto(portal),
        themes,
        layouts,
        palette,
        pages,
        portalPlacements: groupPlacements(`portal=${portalId}^pageISEMPTY`),
    }
}

export function pageDesign(pageId: string) {
    requireStudio('design')
    const page = getById(T.page, pageId)
    if (!page) throw notFound('Page not found')
    const portal = getById(T.portal, str(page, 'portal'))
    const layout = getById(T.component, str(page, 'layout_override')) || (portal ? getById(T.component, str(portal, 'default_layout')) : null)
    return {
        page: pageDto(page),
        layout: layout ? layoutDto(layout) : null,
        placements: groupPlacements(`page=${pageId}`),
        portalPlacements: portal ? groupPlacements(`portal=${portal.getUniqueValue()}^pageISEMPTY`) : {},
    }
}

/* ---------------- Placement writes ---------------- */

/** Renumber a region's placements (100, 200, …), putting `movingId` at `index` if given. */
function renumber(ownerQuery: string, region: string, movingId: string | null, index: number | null): void {
    const ids: string[] = []
    each(
        T.placement,
        `${ownerQuery}^region=${region}`,
        (pl) => {
            if (pl.getUniqueValue() !== movingId) ids.push(pl.getUniqueValue())
        },
        ['order', 'sys_created_on'],
    )
    if (movingId) {
        const at = index === null || index < 0 || index > ids.length ? ids.length : index
        ids.splice(at, 0, movingId)
    }
    ids.forEach((id, i) => {
        const pl = getById(T.placement, id)
        if (pl && int(pl, 'order', -1) !== (i + 1) * 100) {
            pl.setValue('order', (i + 1) * 100)
            pl.update()
        }
    })
}

/** 400 with a helpful message when the region isn't on the owner's effective layout. */
function assertRegion(portalId: string, pageId: string | null, region: string): void {
    const regions = effectiveRegionNames(portalId, pageId)
    if (regions && regions.indexOf(region) < 0) {
        throw badRequest(`Region "${region}" isn't on this ${pageId ? 'page' : 'portal'}'s layout (${regions.join(', ')})`)
    }
}

function ownerQueryOf(portalId: string, pageId: string | null): string {
    return pageId ? `page=${pageId}` : `portal=${portalId}^pageISEMPTY`
}

function abortedMessage(fallback: string): string {
    try {
        const msgs: any = gs.getErrorMessages()
        const list = msgs && typeof msgs.size === 'function' ? Array.from({ length: msgs.size() }, (_, i) => String(msgs.get(i))) : []
        return list.length ? list.join(' ') : fallback
    } catch (e) {
        return fallback
    }
}

export function createPlacement(req: { portal?: string; page?: string | null; region?: string; component?: string; index?: number; options?: Record<string, unknown> }): PlacementDto {
    requireStudio('design')
    const portalId = String(req.portal || '')
    const pageId = req.page ? String(req.page) : null
    if (!getById(T.portal, portalId)) throw badRequest('portal is required')
    if (!req.component || !getById(T.component, String(req.component))) throw badRequest('component is required')
    const region = String(req.region || 'main')
    assertRegion(portalId, pageId, region)
    return batch(portalId, () => {
        const pl = newGR(T.placement)
        pl.initialize()
        pl.setValue('portal', portalId)
        if (pageId) pl.setValue('page', pageId)
        pl.setValue('region', region)
        pl.setValue('component', String(req.component))
        pl.setValue('order', 99999)
        pl.setValue('active', true)
        pl.setValue('options_json', JSON.stringify(isPlainObject(req.options) ? req.options : {}))
        const id = pl.insert()
        if (!id) throw rpError(400, 'invalid', abortedMessage('Could not place the widget'))
        renumber(ownerQueryOf(portalId, pageId), region, id, typeof req.index === 'number' ? req.index : null)
        return placementDto(getById(T.placement, id) as GR)
    })
}

export function updatePlacement(id: string, req: { region?: string; index?: number; page?: string | null; options?: Record<string, unknown>; active?: boolean }): PlacementDto {
    requireStudio('design')
    const pl = getById(T.placement, id)
    if (!pl) throw notFound('Placement not found')
    const portalId = str(pl, 'portal')
    const fromPage = str(pl, 'page') || null
    const fromRegion = str(pl, 'region')
    const toPage = req.page === undefined ? fromPage : req.page ? String(req.page) : null
    const toRegion = req.region === undefined ? fromRegion : String(req.region)
    if (req.region !== undefined || req.page !== undefined) assertRegion(portalId, toPage, toRegion)
    return batch(portalId, () => {
        if (req.page !== undefined) pl.setValue('page', toPage || '')
        if (req.region !== undefined) pl.setValue('region', toRegion)
        if (req.options !== undefined) pl.setValue('options_json', JSON.stringify(isPlainObject(req.options) ? req.options : {}))
        if (req.active !== undefined) pl.setValue('active', !!req.active)
        if (!pl.update()) throw rpError(400, 'invalid', abortedMessage('Could not update the placement'))
        const moved = toPage !== fromPage || toRegion !== fromRegion
        if (moved) renumber(ownerQueryOf(portalId, fromPage), fromRegion, null, null)
        if (moved || typeof req.index === 'number') renumber(ownerQueryOf(portalId, toPage), toRegion, id, typeof req.index === 'number' ? req.index : null)
        return placementDto(getById(T.placement, id) as GR)
    })
}

export function deletePlacement(id: string): { deleted: true; placement: PlacementDto } {
    requireStudio('design')
    const pl = getById(T.placement, id)
    if (!pl) throw notFound('Placement not found')
    const dto = placementDto(pl)
    const portalId = str(pl, 'portal')
    const pageId = str(pl, 'page') || null
    batch(portalId, () => {
        pl.deleteRecord()
        renumber(ownerQueryOf(portalId, pageId), dto.region, null, null)
    })
    return { deleted: true, placement: dto }
}

/* ---------------- Page & portal writes ---------------- */

type PageReq = { portal?: string; name?: string; title?: string; route?: string; layoutOverride?: string | null; order?: number; active?: boolean; access?: Record<string, unknown> }

function applyPage(pg: GR, req: PageReq): void {
    if (req.name !== undefined) pg.setValue('name', String(req.name))
    if (req.title !== undefined) pg.setValue('title', String(req.title))
    if (req.route !== undefined) pg.setValue('route_pattern', String(req.route))
    if (req.layoutOverride !== undefined) pg.setValue('layout_override', req.layoutOverride || '')
    if (req.order !== undefined) pg.setValue('order', Number(req.order))
    if (req.active !== undefined) pg.setValue('active', !!req.active)
    if (req.access !== undefined) pg.setValue('access_config_json', JSON.stringify(isPlainObject(req.access) ? req.access : {}))
}

export function createPage(req: PageReq) {
    requireStudio('design')
    const portalId = String(req.portal || '')
    if (!getById(T.portal, portalId)) throw badRequest('portal is required')
    if (!req.name) throw badRequest('name is required')
    return batch(portalId, () => {
        const pg = newGR(T.page)
        pg.initialize()
        pg.setValue('portal', portalId)
        pg.setValue('active', true)
        applyPage(pg, { route: '', ...req })
        const id = pg.insert()
        if (!id) throw rpError(400, 'invalid', abortedMessage('Could not create the page'))
        return pageDto(getById(T.page, id) as GR)
    })
}

export function updatePage(id: string, req: PageReq) {
    requireStudio('design')
    const pg = getById(T.page, id)
    if (!pg) throw notFound('Page not found')
    return batch(str(pg, 'portal'), () => {
        applyPage(pg, req)
        if (!pg.update()) throw rpError(400, 'invalid', abortedMessage('Could not update the page'))
        return pageDto(getById(T.page, id) as GR)
    })
}

export function deletePage(id: string): { deleted: true } {
    requireStudio('design')
    const pg = getById(T.page, id)
    if (!pg) throw notFound('Page not found')
    const portalId = str(pg, 'portal')
    batch(portalId, () => {
        const portal = getById(T.portal, portalId)
        if (portal && str(portal, 'home_page') === id) {
            portal.setValue('home_page', '')
            portal.update()
        }
        pg.deleteRecord() // placements on the page cascade
    })
    return { deleted: true }
}

export function updatePortal(id: string, req: { name?: string; theme?: string | null; defaultLayout?: string | null; homePage?: string | null; navigation?: unknown; settings?: Record<string, unknown>; active?: boolean }) {
    requireStudio('design')
    const p = getById(T.portal, id)
    if (!p) throw notFound('Portal not found')
    return batch(id, () => {
        if (req.name !== undefined) p.setValue('name', String(req.name))
        if (req.theme !== undefined) p.setValue('theme', req.theme || '')
        if (req.defaultLayout !== undefined) p.setValue('default_layout', req.defaultLayout || '')
        if (req.homePage !== undefined) p.setValue('home_page', req.homePage || '')
        if (req.navigation !== undefined) p.setValue('navigation_json', JSON.stringify(req.navigation || []))
        if (req.settings !== undefined) p.setValue('settings_json', JSON.stringify(isPlainObject(req.settings) ? req.settings : {}))
        if (req.active !== undefined) p.setValue('active', !!req.active)
        if (!p.update()) throw rpError(400, 'invalid', abortedMessage('Could not update the portal'))
        return portalDto(getById(T.portal, id) as GR)
    })
}
