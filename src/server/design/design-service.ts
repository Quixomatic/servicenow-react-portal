import { gs } from '@servicenow/glide'
import { GR, newGR, getById, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, notFound, rpError } from '../lib/errors.ts'
import { parseJson, isPlainObject } from '../lib/util.ts'
import { requireStudio } from '../security/access.ts'
import { normalizeRegions, DEFAULT_REGIONS } from '../registry/registry.ts'
import { processPortal } from '../release/release-service.ts'
import { effectiveRegionNames, blockRegionsOf } from '../runtime/portal-service.ts'
import { refreshInstanceCss } from './instance-style.ts'
import type { RegionDef } from '../../shared/contracts'
import { SKIP_REPROCESS_KEY, reprocessSuppressed, clearSessionFlag } from '../lib/session-flags.ts'
import { abortMessageFromSession } from '../automation/guards.ts'

/**
 * RPDesignService: the page designer's API (pages, placements, and blocks with nested drop
 * zones). Every write is validated by the placement/page business rules and ends with one
 * release reprocess for the affected portal (reprocessing is suspended while a multi-record
 * operation such as a reorder runs). Writes that change an instance's styling recompile its
 * instance CSS before returning.
 */

export { SKIP_REPROCESS_KEY, reprocessSuppressed }

/** Run `fn` with reprocess rules suspended, then reprocess the given portal once. */
function batch<R>(portalId: string, fn: () => R): R {
    const session: any = gs.getSession()
    session.putClientData(SKIP_REPROCESS_KEY, 'true')
    try {
        return fn()
    } finally {
        clearSessionFlag(SKIP_REPROCESS_KEY)
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
    parentId: string | null
    component: { id: string; uniqueId: string; name: string; kind: string }
    options: Record<string, unknown>
    effectiveOptions: Record<string, unknown>
    styleTokens: Record<string, unknown>
    layout: Record<string, unknown>
    classes: string
    /** Blocks only: the instance's resolved drop zones and the placements in them. */
    regions?: RegionDef[]
    children?: Record<string, PlacementDto[]>
}

function placementDto(pl: GR): PlacementDto {
    const comp = getById(T.component, str(pl, 'component'))
    const own = parseJson<Record<string, unknown>>(str(pl, 'options_json'), {})
    const defaults = comp ? parseJson<Record<string, unknown>>(str(comp, 'default_options_json'), {}) : {}
    const kind = comp ? str(comp, 'kind') : ''
    const dto: PlacementDto = {
        id: pl.getUniqueValue(),
        region: str(pl, 'region'),
        order: int(pl, 'order', 100),
        active: bool(pl, 'active'),
        scope: str(pl, 'page') ? 'page' : 'portal',
        pageId: str(pl, 'page') || null,
        parentId: str(pl, 'parent') || null,
        component: comp
            ? { id: comp.getUniqueValue(), uniqueId: str(comp, 'unique_id'), name: str(comp, 'name'), kind }
            : { id: '', uniqueId: '', name: '(missing component)', kind: '' },
        options: isPlainObject(own) ? own : {},
        effectiveOptions: { ...(isPlainObject(defaults) ? defaults : {}), ...(isPlainObject(own) ? own : {}) },
        styleTokens: parseJson<Record<string, unknown>>(str(pl, 'style_tokens_json'), {}) || {},
        layout: parseJson<Record<string, unknown>>(str(pl, 'layout_json'), {}) || {},
        classes: str(pl, 'classes'),
    }
    if (kind === 'block') {
        dto.regions = blockRegionsOf(pl) || []
        dto.children = {}
    }
    return dto
}

/** An owner's placements as a tree: top level by layout region, block children by drop zone. */
function groupPlacements(query: string): Record<string, PlacementDto[]> {
    const items: Record<string, PlacementDto> = {}
    const order: string[] = []
    each(
        T.placement,
        query,
        (pl) => {
            const d = placementDto(pl)
            items[d.id] = d
            order.push(d.id)
        },
        ['order', 'sys_created_on'],
    )
    const out: Record<string, PlacementDto[]> = {}
    for (const id of order) {
        const d = items[id]
        const parent = d.parentId ? items[d.parentId] : null
        if (parent && parent.children) (parent.children[d.region] = parent.children[d.region] || []).push(d)
        else if (!d.parentId) (out[d.region] = out[d.region] || []).push(d)
    }
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
        contentWidth: str(pg, 'content_width') || 'inherit',
        layoutOptions: parseJson<Record<string, unknown> | null>(str(pg, 'layout_options_json'), null),
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
    return {
        id: c.getUniqueValue(),
        uniqueId: str(c, 'unique_id'),
        name: str(c, 'name'),
        regions: regions.length ? regions : DEFAULT_REGIONS,
        optionsSchema: parseJson<unknown>(str(c, 'options_schema_json'), null),
        defaultOptions: parseJson<Record<string, unknown>>(str(c, 'default_options_json'), {}),
    }
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
    const blocks: unknown[] = []
    each(
        T.component,
        'kind=block^active=true',
        (c) =>
            blocks.push({
                id: c.getUniqueValue(),
                uniqueId: str(c, 'unique_id'),
                name: str(c, 'name'),
                description: str(c, 'description'),
                regionSpec: parseJson<unknown>(str(c, 'regions_json'), []),
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
        blocks,
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

function ownerQueryOf(portalId: string, pageId: string | null): string {
    return pageId ? `page=${pageId}` : `portal=${portalId}^pageISEMPTY`
}

/** One container's siblings: an owner's top-level region, or a block's drop zone. */
function scopeQuery(ownerQuery: string, parentId: string | null): string {
    return `${ownerQuery}^${parentId ? `parent=${parentId}` : 'parentISEMPTY'}`
}

/** Renumber a container's placements (100, 200, …), putting `movingId` at `index` if given. */
function renumber(ownerQuery: string, parentId: string | null, region: string, movingId: string | null, index: number | null): void {
    const ids: string[] = []
    each(
        T.placement,
        `${scopeQuery(ownerQuery, parentId)}^region=${region}`,
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

/** 400 with a helpful message when the region isn't a drop zone of the target container. */
function assertRegion(portalId: string, pageId: string | null, parentId: string | null, region: string): void {
    if (parentId) {
        const parent = getById(T.placement, parentId)
        if (!parent) throw badRequest('Parent placement not found')
        const zones = blockRegionsOf(parent)
        if (!zones) throw badRequest('Only blocks can contain placements')
        const names = zones.map((z) => z.name)
        if (names.indexOf(region) < 0) throw badRequest(`Region "${region}" isn't a drop zone of the parent block (${names.join(', ') || 'none'})`)
        if ((str(parent, 'page') || null) !== pageId) throw badRequest('The parent block belongs to a different page')
        return
    }
    const regions = effectiveRegionNames(portalId, pageId)
    if (regions && regions.indexOf(region) < 0) {
        throw badRequest(`Region "${region}" isn't on this ${pageId ? 'page' : 'portal'}'s layout (${regions.join(', ')})`)
    }
}

/** Every placement nested under `id`, parents before children. */
function descendantsOf(id: string): GR[] {
    const out: GR[] = []
    let frontier = [id]
    for (let depth = 0; frontier.length && depth < 16; depth++) {
        const next: string[] = []
        each(T.placement, `parentIN${frontier.join(',')}`, (pl) => {
            out.push(getById(T.placement, pl.getUniqueValue()) as GR)
            next.push(pl.getUniqueValue())
        })
        frontier = next
    }
    return out
}

/** The business rule's abort message (drains the session queue so it doesn't resurface as a classic banner). */
function abortedMessage(fallback: string): string {
    return abortMessageFromSession('', fallback)
}

/** Recompile instance CSS for the given placements, reprocess once if any changed, then return `value()`. */
function withInstanceCss<R>(portalId: string, ids: string[], value: () => R): Promise<R> {
    return ids
        .reduce<Promise<boolean>>((acc, id) => acc.then((changed) => refreshInstanceCss(id).then((c) => changed || c)), Promise.resolve(false))
        .then((changed) => {
            if (changed && portalId) processPortal(portalId)
            return value()
        })
}

type StyleReq = { styleTokens?: Record<string, unknown>; layout?: Record<string, unknown>; classes?: string }

function applyStyle(pl: GR, req: StyleReq): boolean {
    let touched = false
    if (req.styleTokens !== undefined) {
        pl.setValue('style_tokens_json', JSON.stringify(isPlainObject(req.styleTokens) ? req.styleTokens : {}))
        touched = true
    }
    if (req.layout !== undefined) {
        pl.setValue('layout_json', JSON.stringify(isPlainObject(req.layout) ? req.layout : {}))
        touched = true
    }
    if (req.classes !== undefined) {
        pl.setValue('classes', String(req.classes || ''))
        touched = true
    }
    return touched
}

type CreateReq = {
    portal?: string
    page?: string | null
    parent?: string | null
    region?: string
    component?: string
    index?: number
    options?: Record<string, unknown>
} & StyleReq

export function createPlacement(req: CreateReq): Promise<PlacementDto> {
    requireStudio('design')
    const portalId = String(req.portal || '')
    const pageId = req.page ? String(req.page) : null
    const parentId = req.parent ? String(req.parent) : null
    if (!getById(T.portal, portalId)) throw badRequest('portal is required')
    if (!req.component || !getById(T.component, String(req.component))) throw badRequest('component is required')
    const region = String(req.region || 'main')
    assertRegion(portalId, pageId, parentId, region)
    const id = batch(portalId, () => {
        const pl = newGR(T.placement)
        pl.initialize()
        pl.setValue('portal', portalId)
        if (pageId) pl.setValue('page', pageId)
        if (parentId) pl.setValue('parent', parentId)
        pl.setValue('region', region)
        pl.setValue('component', String(req.component))
        pl.setValue('order', 99999)
        pl.setValue('active', true)
        pl.setValue('options_json', JSON.stringify(isPlainObject(req.options) ? req.options : {}))
        applyStyle(pl, req)
        const newId = pl.insert()
        if (!newId) throw rpError(400, 'invalid', abortedMessage('Could not place the component'))
        renumber(ownerQueryOf(portalId, pageId), parentId, region, newId, typeof req.index === 'number' ? req.index : null)
        return newId
    })
    return withInstanceCss(portalId, [id], () => placementDto(getById(T.placement, id) as GR))
}

type UpdateReq = {
    region?: string
    index?: number
    page?: string | null
    parent?: string | null
    options?: Record<string, unknown>
    active?: boolean
} & StyleReq

/**
 * Move and/or edit a placement. `parent` moves it into a block (null: back to the top level).
 * A block moves with its whole subtree; changing page/portal scope moves every descendant too.
 */
export function updatePlacement(id: string, req: UpdateReq): Promise<PlacementDto> {
    requireStudio('design')
    const pl = getById(T.placement, id)
    if (!pl) throw notFound('Placement not found')
    const portalId = str(pl, 'portal')
    const fromPage = str(pl, 'page') || null
    const fromParent = str(pl, 'parent') || null
    const fromRegion = str(pl, 'region')
    const toPage = req.page === undefined ? fromPage : req.page ? String(req.page) : null
    let toParent = fromParent
    if (req.parent !== undefined) toParent = req.parent ? String(req.parent) : null
    else if (toPage !== fromPage) toParent = null // changing scope without a target block → top level
    const toRegion = req.region === undefined ? fromRegion : String(req.region)
    const moved = toPage !== fromPage || toParent !== fromParent || toRegion !== fromRegion
    if (moved) {
        if (toParent === id || descendantsOf(id).some((d) => d.getUniqueValue() === toParent)) {
            throw badRequest("A block can't be moved inside itself")
        }
        assertRegion(portalId, toPage, toParent, toRegion)
    }
    const styleIds: string[] = []
    batch(portalId, () => {
        if (req.page !== undefined) pl.setValue('page', toPage || '')
        if (toParent !== fromParent) pl.setValue('parent', toParent || '')
        if (req.region !== undefined) pl.setValue('region', toRegion)
        if (req.options !== undefined) pl.setValue('options_json', JSON.stringify(isPlainObject(req.options) ? req.options : {}))
        if (req.active !== undefined) pl.setValue('active', !!req.active)
        if (applyStyle(pl, req) || req.options !== undefined) styleIds.push(id)
        if (!pl.update()) throw rpError(400, 'invalid', abortedMessage('Could not update the placement'))
        if (toPage !== fromPage) {
            for (const d of descendantsOf(id)) {
                d.setValue('page', toPage || '')
                if (!d.update()) throw rpError(400, 'invalid', abortedMessage('Could not move a nested placement'))
            }
        }
        if (moved) renumber(ownerQueryOf(portalId, fromPage), fromParent, fromRegion, null, null)
        if (moved || typeof req.index === 'number') {
            renumber(ownerQueryOf(portalId, toPage), toParent, toRegion, id, typeof req.index === 'number' ? req.index : null)
        }
    })
    return withInstanceCss(portalId, styleIds, () => placementDto(getById(T.placement, id) as GR))
}

/**
 * Delete a placement. A block with children needs a `mode`: 'lift' moves its children out to
 * where the block was (in drop-zone, then order sequence); 'cascade' deletes them with it.
 */
export function deletePlacement(id: string, mode?: string): { deleted: true; placement: PlacementDto; lifted: string[] } {
    requireStudio('design')
    const pl = getById(T.placement, id)
    if (!pl) throw notFound('Placement not found')
    const dto = placementDto(pl)
    const portalId = str(pl, 'portal')
    const pageId = str(pl, 'page') || null
    const parentId = str(pl, 'parent') || null
    const children: GR[] = []
    each(T.placement, `parent=${id}`, (c) => children.push(getById(T.placement, c.getUniqueValue()) as GR), ['region', 'order'])
    if (children.length && mode !== 'lift' && mode !== 'cascade') {
        throw rpError(
            409,
            'has_children',
            `This block contains ${children.length} placement(s): delete with mode "lift" (move them out) or "cascade" (delete them too)`,
            { children: children.length },
        )
    }
    const lifted: string[] = []
    const owner = ownerQueryOf(portalId, pageId)
    batch(portalId, () => {
        if (mode === 'lift' && children.length) {
            let index = 0
            each(T.placement, `${scopeQuery(owner, parentId)}^region=${dto.region}`, (s) => {
                if (s.getUniqueValue() !== id && int(s, 'order', 0) < dto.order) index++
            })
            for (const c of children) {
                c.setValue('parent', parentId || '')
                c.setValue('region', dto.region)
                if (!c.update()) throw rpError(400, 'invalid', abortedMessage('Could not move a nested placement out'))
                renumber(owner, parentId, dto.region, c.getUniqueValue(), index++)
                lifted.push(c.getUniqueValue())
            }
        }
        pl.deleteRecord() // cascade: the parent reference cascades to the remaining children
        renumber(owner, parentId, dto.region, null, null)
    })
    return { deleted: true, placement: dto, lifted }
}

/* ---------------- Page & portal writes ---------------- */

type PageReq = {
    portal?: string
    name?: string
    title?: string
    route?: string
    layoutOverride?: string | null
    contentWidth?: string | null
    /** null/{} = use the portal default. */
    layoutOptions?: Record<string, unknown> | null
    order?: number
    active?: boolean
    access?: Record<string, unknown>
}

const PAGE_WIDTHS = ['inherit', 'full', '7xl', '6xl', '5xl', '4xl', '3xl']

function applyPage(pg: GR, req: PageReq): void {
    if (req.name !== undefined) pg.setValue('name', String(req.name))
    if (req.title !== undefined) pg.setValue('title', String(req.title))
    if (req.route !== undefined) pg.setValue('route_pattern', String(req.route))
    if (req.layoutOverride !== undefined) pg.setValue('layout_override', req.layoutOverride || '')
    if (req.layoutOptions !== undefined) {
        const o = isPlainObject(req.layoutOptions) ? req.layoutOptions : null
        pg.setValue('layout_options_json', o && Object.keys(o).length ? JSON.stringify(o) : '')
    }
    if (req.contentWidth !== undefined) {
        const w = req.contentWidth || 'inherit'
        if (PAGE_WIDTHS.indexOf(w) < 0) throw badRequest(`contentWidth must be one of ${PAGE_WIDTHS.join(', ')}`)
        pg.setValue('content_width', w)
    }
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
