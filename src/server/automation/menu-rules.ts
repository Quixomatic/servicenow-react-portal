import { getById, findOne, exists, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { isValidJson, parseJson, isPlainObject } from '../lib/util.ts'
import { processPortal } from '../release/release-service.ts'
import { reprocessSuppressed } from '../lib/session-flags.ts'
import { MENU_ITEM_TYPES, MAX_MENU_DEPTH, parseItemParams } from '../runtime/menu-service.ts'
import { isLucideIcon, normalizeIconName } from '../icons/icons.ts'
import { abort } from './guards.ts'

/**
 * Menu and menu item business rules: validation/normalization (before) and release
 * reprocessing (after). Nesting: only groups contain items.
 */

export const MENU_KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** "Primary Nav" / "primary_nav" → "primary-nav". */
export function normalizeMenuKey(raw: string): string {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[\s_.]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

const URL_RE = /^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i

/** null when valid, else the problem. */
export function urlProblem(url: string): string | null {
    if (!url) return 'URL is required for external URL items.'
    if (!URL_RE.test(url)) return 'URL must start with http://, https:// or mailto:.'
    return null
}

/** Normalize a portal-relative route ("/orders/42/" → "orders/42"); null when it isn't portal-relative. */
export function normalizeMenuRoute(raw: string): string | null {
    const r = String(raw || '').trim()
    if (/^[a-z][a-z0-9+.-]*:/i.test(r) || r.indexOf('//') === 0 || /\s/.test(r)) return null
    const qi = r.indexOf('?')
    const path = (qi >= 0 ? r.substring(0, qi) : r).replace(/^\/+|\/+$/g, '')
    if (path.split('/').some((s) => s === '..' || s === '.')) return null
    return qi >= 0 ? `${path}${r.substring(qi)}` : path
}

/* ---------------- Menu ---------------- */

/** before insert/update on menu: portal, key format and uniqueness per portal, name. */
export function validateMenu(current: any, previous: any): void {
    const portalId = str(current, 'portal')
    if (!getById(T.portal, portalId)) return abort(current, 'A menu belongs to a portal.')

    const key = normalizeMenuKey(str(current, 'key'))
    if (!key || !MENU_KEY_RE.test(key)) return abort(current, 'Key must be a lower-case slug such as "primary", "footer" or "account".')
    current.setValue('key', key)
    if (findOne(T.menu, `portal=${portalId}^key=${key}^sys_id!=${current.getUniqueValue()}`)) {
        return abort(current, `This portal already has a menu with key "${key}".`)
    }
    if (!str(current, 'name')) current.setValue('name', key.charAt(0).toUpperCase() + key.substring(1))

    const before = previous ? str(previous, 'portal') : ''
    if (before && before !== portalId && exists(T.menuItem, `menu=${current.getUniqueValue()}^type=page^pageISNOTEMPTY`)) {
        return abort(current, "This menu has page items: their pages belong to the old portal, so the menu can't move.")
    }
}

/* ---------------- Menu item ---------------- */

/** before insert/update on menu item. */
export function validateMenuItem(current: any, previous: any): void {
    const menu = getById(T.menu, str(current, 'menu'))
    if (!menu) return abort(current, 'A menu item belongs to a menu.')
    const portalId = str(menu, 'portal')
    const id = current.getUniqueValue()

    const type = str(current, 'type') || 'page'
    if (MENU_ITEM_TYPES.indexOf(type as any) < 0) return abort(current, `Type must be one of ${MENU_ITEM_TYPES.join(', ')}.`)
    current.setValue('type', type)
    if (type !== 'group' && !current.isNewRecord() && exists(T.menuItem, `parent=${id}`)) {
        return abort(current, 'This item contains other items; only groups can. Move or delete them first.')
    }

    // Parent: a group of the same menu, no cycles, bounded depth.
    let ancestor = str(current, 'parent')
    if (ancestor) {
        const seen: Record<string, boolean> = { [id]: true }
        let depth = 0
        while (ancestor) {
            if (seen[ancestor]) return abort(current, 'Menu item parents form a cycle.')
            seen[ancestor] = true
            const parent = getById(T.menuItem, ancestor)
            if (!parent) return abort(current, 'Parent item not found.')
            if (depth === 0) {
                if (str(parent, 'menu') !== str(current, 'menu')) return abort(current, 'The parent item belongs to a different menu.')
                if (str(parent, 'type') !== 'group') return abort(current, 'Only groups can contain items.')
            }
            ancestor = str(parent, 'parent')
            if (++depth > MAX_MENU_DEPTH) return abort(current, `Menu groups can nest at most ${MAX_MENU_DEPTH} levels deep.`)
        }
    }

    const paramsText = str(current, 'params_json')
    if (!isValidJson(paramsText)) return abort(current, 'params_json is not valid JSON.')
    const paramsRaw = parseJson<unknown>(paramsText, null)
    if (paramsRaw !== null && !isPlainObject(paramsRaw)) {
        return abort(current, 'params_json must be an object: {"params": {"id": "42"}, "query": {"tab": "open"}}.')
    }

    const label = str(current, 'label').trim()
    current.setValue('label', label)
    switch (type) {
        case 'page': {
            const page = getById(T.page, str(current, 'page'))
            if (!page) return abort(current, 'Page items need a page.')
            if (str(page, 'portal') !== portalId) return abort(current, "The page belongs to a different portal than the menu's.")
            const params = parseItemParams(paramsText).params
            const missing = str(page, 'route_pattern')
                .split('/')
                .filter((s) => s.charAt(0) === ':' && !params[s.substring(1)])
            if (missing.length) {
                return abort(current, `The page route "/${str(page, 'route_pattern')}" needs params_json.params for ${missing.join(', ')}.`)
            }
            if (!label) current.setValue('label', str(page, 'title') || str(page, 'name'))
            break
        }
        case 'route': {
            const route = normalizeMenuRoute(str(current, 'route'))
            if (route === null) return abort(current, 'Route must be a portal-relative path such as "orders" or "orders/42" ("" = home). Use a URL item for other sites.')
            current.setValue('route', route)
            if (!label) return abort(current, 'Route items need a label.')
            break
        }
        case 'url': {
            const url = str(current, 'url').trim()
            const problem = urlProblem(url)
            if (problem) return abort(current, problem)
            current.setValue('url', url)
            if (!label) return abort(current, 'URL items need a label.')
            if (!str(current, 'target')) current.setValue('target', '_blank')
            break
        }
        case 'group':
            if (!label) return abort(current, 'Groups need a label.')
            break
        case 'dynamic':
            if (!str(current, 'script').trim()) return abort(current, 'Dynamic items need a script that returns their child items.')
            break
    }

    const rawIcon = str(current, 'icon')
    if (rawIcon) {
        const icon = normalizeIconName(rawIcon)
        if (!isLucideIcon(icon)) return abort(current, `"${rawIcon}" isn't a lucide icon name (kebab-case, e.g. layout-dashboard).`)
        current.setValue('icon', icon)
    }
    const target = str(current, 'target')
    if (target && target !== '_self' && target !== '_blank') return abort(current, 'Target must be _self or _blank.')
    const match = str(current, 'match') || 'prefix'
    if (match !== 'exact' && match !== 'prefix') return abort(current, 'Match must be exact or prefix.')
    current.setValue('match', match)
}

/* ---------------- Reprocess ---------------- */

/** after insert/update/delete on menu: reprocess its portal (old and new). */
export function reprocessMenuPortal(current: any, previous: any): void {
    if (reprocessSuppressed()) return // a studio batch reprocesses once at the end
    const now = str(current, 'portal')
    if (now) processPortal(now)
    const before = previous ? str(previous, 'portal') : ''
    if (before && before !== now) processPortal(before)
}

function portalOfMenu(menuId: string): string {
    const menu = menuId ? getById(T.menu, menuId) : null
    return menu ? str(menu, 'portal') : ''
}

/** after insert/update/delete on menu item: reprocess the portal of its menu (old and new). */
export function reprocessMenuItemPortal(current: any, previous: any): void {
    if (reprocessSuppressed()) return // a studio batch reprocesses once at the end
    const now = portalOfMenu(str(current, 'menu'))
    if (now) processPortal(now)
    const before = previous ? portalOfMenu(str(previous, 'menu')) : ''
    if (before && before !== now) processPortal(before)
}
