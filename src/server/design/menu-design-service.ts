import { gs } from '@servicenow/glide'
import { GR, newGR, getById, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, notFound, rpError } from '../lib/errors.ts'
import { parseJson, isPlainObject, splitList } from '../lib/util.ts'
import { requireStudio } from '../security/access.ts'
import { processPortal } from '../release/release-service.ts'
import { SKIP_REPROCESS_KEY } from '../lib/session-flags.ts'
import { takeAbortMessage } from '../automation/guards.ts'
import { MENU_ITEM_TYPES } from '../runtime/menu-service.ts'
import { searchIcons, LUCIDE_VERSION } from '../icons/icons.ts'
import type { MenuDto, MenuItemDto, NavItemType } from '../../shared/contracts'

/**
 * RPMenuDesignService: the studio's menu API. Reads return full definitions (unfiltered, scripts
 * included). Writes go through the menu business rules (validation) and end with one release
 * reprocess for the portal, like the page designer's batch().
 */

function batch<R>(portalId: string, fn: () => R): R {
    const session: any = gs.getSession()
    session.putClientData(SKIP_REPROCESS_KEY, 'true')
    takeAbortMessage() // drop a stale message from an earlier request
    try {
        return fn()
    } finally {
        session.putClientData(SKIP_REPROCESS_KEY, '')
        if (portalId) processPortal(portalId)
    }
}

/**
 * The business rule's abort message for the API error. The rule also queued it with
 * gs.addErrorMessage, which would otherwise show up as a banner on the user's next classic page,
 * so the queue is flushed (the message travels in the API response instead).
 */
function abortedMessage(fallback: string): string {
    const recorded = takeAbortMessage()
    let message = recorded || fallback
    try {
        if (!recorded) {
            const msgs: any = gs.getErrorMessages()
            const list = msgs && typeof msgs.size === 'function' ? Array.from({ length: msgs.size() }, (_, i) => String(msgs.get(i))) : []
            if (list.length) message = list.join(' ')
        }
        gs.flushMessages()
    } catch (e) {
        // keep the message we have
    }
    return message
}

/* ---------------- DTOs ---------------- */

function itemDto(gr: GR): MenuItemDto {
    const pageId = str(gr, 'page') || null
    const page = pageId ? getById(T.page, pageId) : null
    const params = parseJson<MenuItemDto['params']>(str(gr, 'params_json'), null)
    const target = str(gr, 'target')
    return {
        id: gr.getUniqueValue(),
        menuId: str(gr, 'menu'),
        parentId: str(gr, 'parent') || null,
        order: int(gr, 'order', 100),
        type: (str(gr, 'type') || 'page') as NavItemType,
        label: str(gr, 'label'),
        active: bool(gr, 'active'),
        pageId,
        page: page ? { id: pageId as string, route: str(page, 'route_pattern'), title: str(page, 'title') || str(page, 'name') } : null,
        params: isPlainObject(params) ? params : null,
        route: str(gr, 'route'),
        url: str(gr, 'url'),
        icon: str(gr, 'icon'),
        target: target === '_self' || target === '_blank' ? target : '',
        match: str(gr, 'match') === 'exact' ? 'exact' : 'prefix',
        tooltip: str(gr, 'tooltip'),
        collapsed: bool(gr, 'collapsed'),
        roles: splitList(str(gr, 'roles')),
        condition: str(gr, 'condition'),
        badge: str(gr, 'badge'),
        badgeScript: str(gr, 'badge_script'),
        script: str(gr, 'script'),
        children: [],
    }
}

/** Every item of a menu as a tree (orphans of a deleted parent surface at the top level). */
function itemTree(menuId: string): MenuItemDto[] {
    const items: Record<string, MenuItemDto> = {}
    const order: string[] = []
    each(
        T.menuItem,
        `menu=${menuId}`,
        (gr) => {
            const d = itemDto(gr)
            items[d.id] = d
            order.push(d.id)
        },
        ['order', 'sys_created_on'],
    )
    const root: MenuItemDto[] = []
    for (const id of order) {
        const d = items[id]
        const parent = d.parentId ? items[d.parentId] : null
        if (parent) parent.children.push(d)
        else root.push(d)
    }
    return root
}

function menuDto(m: GR): MenuDto {
    return {
        id: m.getUniqueValue(),
        portalId: str(m, 'portal'),
        key: str(m, 'key'),
        name: str(m, 'name'),
        description: str(m, 'description'),
        active: bool(m, 'active'),
        items: itemTree(m.getUniqueValue()),
    }
}

/* ---------------- Reads ---------------- */

/** GET /portals/{id}/menus */
export function listMenus(portalId: string): MenuDto[] {
    requireStudio('design')
    if (!getById(T.portal, portalId)) throw notFound('Portal not found')
    const out: MenuDto[] = []
    each(T.menu, `portal=${portalId}`, (m) => out.push(menuDto(m)), 'key')
    return out
}

/** GET /icons?q=&limit= */
export function iconSearch(q: string, limit: number): { version: string; names: string[]; total: number } {
    requireStudio('any')
    const r = searchIcons(q, limit)
    return { version: LUCIDE_VERSION, names: r.names, total: r.total }
}

/* ---------------- Menu writes ---------------- */

type MenuReq = { portal?: string; key?: string; name?: string; description?: string; active?: boolean }

function applyMenu(m: GR, req: MenuReq): void {
    if (req.key !== undefined) m.setValue('key', String(req.key || ''))
    if (req.name !== undefined) m.setValue('name', String(req.name || ''))
    if (req.description !== undefined) m.setValue('description', String(req.description || ''))
    if (req.active !== undefined) m.setValue('active', !!req.active)
}

/** POST /menus { portal, key, name?, description?, active? } */
export function createMenu(req: MenuReq): MenuDto {
    requireStudio('design')
    const portalId = String(req.portal || '')
    if (!getById(T.portal, portalId)) throw badRequest('portal is required')
    if (!req.key) throw badRequest('key is required')
    return batch(portalId, () => {
        const m = newGR(T.menu)
        m.initialize()
        m.setValue('portal', portalId)
        m.setValue('active', true)
        applyMenu(m, req)
        const id = m.insert()
        if (!id) throw rpError(400, 'invalid', abortedMessage('Could not create the menu'))
        return menuDto(getById(T.menu, id) as GR)
    })
}

/** PATCH /menus/{id} { key?, name?, description?, active? } (a menu never changes portal here). */
export function updateMenu(id: string, req: MenuReq): MenuDto {
    requireStudio('design')
    const m = getById(T.menu, id)
    if (!m) throw notFound('Menu not found')
    return batch(str(m, 'portal'), () => {
        applyMenu(m, req)
        if (!m.update()) throw rpError(400, 'invalid', abortedMessage('Could not update the menu'))
        return menuDto(getById(T.menu, id) as GR)
    })
}

/** DELETE /menus/{id}: the menu and every item. */
export function deleteMenu(id: string): { deleted: true; id: string } {
    requireStudio('design')
    const m = getById(T.menu, id)
    if (!m) throw notFound('Menu not found')
    batch(str(m, 'portal'), () => {
        m.deleteRecord() // items cascade
    })
    return { deleted: true, id }
}

/* ---------------- Item writes ---------------- */

type ItemReq = {
    menu?: string
    parent?: string | null
    index?: number
    type?: string
    label?: string
    active?: boolean
    page?: string | null
    params?: { params?: Record<string, unknown>; query?: Record<string, unknown> } | null
    route?: string
    url?: string
    icon?: string
    target?: string
    match?: string
    tooltip?: string
    collapsed?: boolean
    roles?: string[] | string
    condition?: string
    badge?: string
    badgeScript?: string
    script?: string
}

function applyItem(gr: GR, req: ItemReq): void {
    if (req.type !== undefined) {
        if (MENU_ITEM_TYPES.indexOf(req.type as NavItemType) < 0) throw badRequest(`type must be one of ${MENU_ITEM_TYPES.join(', ')}`)
        gr.setValue('type', req.type)
    }
    if (req.label !== undefined) gr.setValue('label', String(req.label || ''))
    if (req.active !== undefined) gr.setValue('active', !!req.active)
    if (req.page !== undefined) gr.setValue('page', req.page || '')
    if (req.params !== undefined) {
        const p = isPlainObject(req.params) ? req.params : null
        gr.setValue('params_json', p && Object.keys(p).length ? JSON.stringify(p) : '')
    }
    if (req.route !== undefined) gr.setValue('route', String(req.route || ''))
    if (req.url !== undefined) gr.setValue('url', String(req.url || ''))
    if (req.icon !== undefined) gr.setValue('icon', String(req.icon || ''))
    if (req.target !== undefined) gr.setValue('target', String(req.target || ''))
    if (req.match !== undefined) gr.setValue('match', String(req.match || 'prefix'))
    if (req.tooltip !== undefined) gr.setValue('tooltip', String(req.tooltip || ''))
    if (req.collapsed !== undefined) gr.setValue('collapsed', !!req.collapsed)
    if (req.roles !== undefined) gr.setValue('roles', (Array.isArray(req.roles) ? req.roles.map(String) : splitList(String(req.roles || ''))).join(','))
    if (req.condition !== undefined) gr.setValue('condition', String(req.condition || ''))
    if (req.badge !== undefined) gr.setValue('badge', String(req.badge || ''))
    if (req.badgeScript !== undefined) gr.setValue('badge_script', String(req.badgeScript || ''))
    if (req.script !== undefined) gr.setValue('script', String(req.script || ''))
}

function siblingQuery(menuId: string, parentId: string | null): string {
    return `menu=${menuId}^${parentId ? `parent=${parentId}` : 'parentISEMPTY'}`
}

/** Renumber one container's items (100, 200, …), putting `movingId` at `index` if given. */
function renumber(menuId: string, parentId: string | null, movingId: string | null, index: number | null): void {
    const ids: string[] = []
    each(
        T.menuItem,
        siblingQuery(menuId, parentId),
        (it) => {
            if (it.getUniqueValue() !== movingId) ids.push(it.getUniqueValue())
        },
        ['order', 'sys_created_on'],
    )
    if (movingId) {
        const at = index === null || index < 0 || index > ids.length ? ids.length : index
        ids.splice(at, 0, movingId)
    }
    ids.forEach((id, i) => {
        const it = getById(T.menuItem, id)
        if (it && int(it, 'order', -1) !== (i + 1) * 100) {
            it.setValue('order', (i + 1) * 100)
            it.update()
        }
    })
}

/** Every item nested under `id`, parents before children. */
function descendantsOf(id: string): GR[] {
    const out: GR[] = []
    let frontier = [id]
    for (let depth = 0; frontier.length && depth < 16; depth++) {
        const next: string[] = []
        each(T.menuItem, `parentIN${frontier.join(',')}`, (it) => {
            out.push(getById(T.menuItem, it.getUniqueValue()) as GR)
            next.push(it.getUniqueValue())
        })
        frontier = next
    }
    return out
}

function portalOfMenu(menuId: string): string {
    const m = getById(T.menu, menuId)
    if (!m) throw badRequest('menu not found')
    return str(m, 'portal')
}

/** POST /menu-items { menu, parent?, index?, type, label?, …fields } */
export function createMenuItem(req: ItemReq): MenuItemDto {
    requireStudio('design')
    const menuId = String(req.menu || '')
    if (!menuId) throw badRequest('menu is required')
    const portalId = portalOfMenu(menuId)
    const parentId = req.parent ? String(req.parent) : null
    return batch(portalId, () => {
        const gr = newGR(T.menuItem)
        gr.initialize()
        gr.setValue('menu', menuId)
        if (parentId) gr.setValue('parent', parentId)
        gr.setValue('type', 'page')
        gr.setValue('active', true)
        gr.setValue('order', 99999)
        applyItem(gr, req)
        const id = gr.insert()
        if (!id) throw rpError(400, 'invalid', abortedMessage('Could not create the menu item'))
        renumber(menuId, parentId, id, typeof req.index === 'number' ? req.index : null)
        return itemDto(getById(T.menuItem, id) as GR)
    })
}

/**
 * PATCH /menu-items/{id}: edit fields and/or move. `parent` (null = top level) and `index` move it
 * within its menu; `menu` moves it (and its subtree) to another menu of the same portal.
 */
export function updateMenuItem(id: string, req: ItemReq): MenuItemDto {
    requireStudio('design')
    const gr = getById(T.menuItem, id)
    if (!gr) throw notFound('Menu item not found')
    const fromMenu = str(gr, 'menu')
    const fromParent = str(gr, 'parent') || null
    const toMenu = req.menu ? String(req.menu) : fromMenu
    const portalId = portalOfMenu(fromMenu)
    if (toMenu !== fromMenu && portalOfMenu(toMenu) !== portalId) throw badRequest("Items can only move between menus of the same portal")
    let toParent = fromParent
    if (req.parent !== undefined) toParent = req.parent ? String(req.parent) : null
    else if (toMenu !== fromMenu) toParent = null
    const moved = toMenu !== fromMenu || toParent !== fromParent
    if (moved && toParent && (toParent === id || descendantsOf(id).some((d) => d.getUniqueValue() === toParent))) {
        throw badRequest("A group can't be moved inside itself")
    }
    return batch(portalId, () => {
        if (toMenu !== fromMenu) gr.setValue('menu', toMenu)
        if (toParent !== fromParent) gr.setValue('parent', toParent || '')
        applyItem(gr, req)
        if (!gr.update()) throw rpError(400, 'invalid', abortedMessage('Could not update the menu item'))
        if (toMenu !== fromMenu) {
            for (const d of descendantsOf(id)) {
                d.setValue('menu', toMenu)
                if (!d.update()) throw rpError(400, 'invalid', abortedMessage('Could not move a nested menu item'))
            }
        }
        if (moved) renumber(fromMenu, fromParent, null, null)
        if (moved || typeof req.index === 'number') renumber(toMenu, toParent, id, typeof req.index === 'number' ? req.index : null)
        return itemDto(getById(T.menuItem, id) as GR)
    })
}

/**
 * DELETE /menu-items/{id}?mode=lift|cascade. A group with children needs a mode: 'lift' moves its
 * children out to where the group was; 'cascade' deletes them with it.
 */
export function deleteMenuItem(id: string, mode?: string): { deleted: true; item: MenuItemDto; lifted: string[] } {
    requireStudio('design')
    const gr = getById(T.menuItem, id)
    if (!gr) throw notFound('Menu item not found')
    const dto = itemDto(gr)
    const menuId = dto.menuId
    const parentId = dto.parentId
    const portalId = portalOfMenu(menuId)
    const children: GR[] = []
    each(T.menuItem, `parent=${id}`, (c) => children.push(getById(T.menuItem, c.getUniqueValue()) as GR), ['order', 'sys_created_on'])
    if (children.length && mode !== 'lift' && mode !== 'cascade') {
        throw rpError(
            409,
            'has_children',
            `This group contains ${children.length} item(s): delete with mode "lift" (move them out) or "cascade" (delete them too)`,
            { children: children.length },
        )
    }
    const lifted: string[] = []
    batch(portalId, () => {
        if (mode === 'lift' && children.length) {
            let index = 0
            each(T.menuItem, siblingQuery(menuId, parentId), (s) => {
                if (s.getUniqueValue() !== id && int(s, 'order', 0) < dto.order) index++
            })
            for (const c of children) {
                c.setValue('parent', parentId || '')
                if (!c.update()) throw rpError(400, 'invalid', abortedMessage('Could not move a nested item out'))
                renumber(menuId, parentId, c.getUniqueValue(), index++)
                lifted.push(c.getUniqueValue())
            }
        }
        gr.deleteRecord() // cascade: the parent reference cascades to the remaining children
        renumber(menuId, parentId, null, null)
    })
    return { deleted: true, item: dto, lifted }
}
