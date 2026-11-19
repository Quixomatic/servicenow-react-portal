import { gs, GlideScopedEvaluator } from '@servicenow/glide'
import { GR, getById, each, str, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { parseJson, isPlainObject, splitList } from '../lib/util.ts'
import { canAccessPageConfig, hasAnyRole, PageAccessConfig } from '../security/access.ts'
import type { MenuMap, NavItem, NavItemType } from '../../shared/contracts'

/**
 * RPMenuService: portal menus (x_312987_portal_menu / _menu_item).
 *
 * - assembleMenus(): the definitions the release manifest stores, per portal, keyed by menu key.
 *   Only active menus and active items; scripts are stored as text.
 * - resolveMenus(): the per-user tree bootstrap and $sp.getMenu() return (roles, condition
 *   scripts, page access, empty groups).
 *
 * Phase 2 (not evaluated yet): badge_script and dynamic items (script). Dynamic items are dropped
 * at runtime; badge scripts are not part of the manifest.
 */

export const MENU_ITEM_TYPES: NavItemType[] = ['page', 'route', 'url', 'group', 'separator', 'dynamic']

/** Maximum item nesting depth (group in group in …). */
export const MAX_MENU_DEPTH = 4

export interface ManifestMenuItem {
    id: string
    type: NavItemType
    label: string
    icon: string
    tooltip: string
    badge: string
    target: string
    match: string
    collapsed: boolean
    roles: string[]
    /** Condition script text ('' = none). */
    condition: string
    pageId: string | null
    params: Record<string, string>
    query: Record<string, string>
    route: string
    url: string
    /** Route items: another portal's slug (params_json.portal) for a cross-portal link ('' = this portal). */
    portal?: string
    children: ManifestMenuItem[]
}

export interface ManifestMenu {
    id: string
    key: string
    name: string
    items: ManifestMenuItem[]
}

/** The page fields menu resolution needs (a subset of ManifestPage). */
export interface MenuPage {
    id: string
    route: string
    access: PageAccessConfig
}

function stringMap(v: unknown): Record<string, string> {
    const out: Record<string, string> = {}
    if (!isPlainObject(v)) return out
    for (const k of Object.keys(v)) {
        const val = v[k]
        if (val !== null && val !== undefined && typeof val !== 'object') out[k] = String(val)
    }
    return out
}

/** params_json.portal: a route item's target portal slug ('' = the menu's own portal). */
export function parseItemPortal(text: string): string {
    const raw = parseJson<unknown>(text, null)
    if (!isPlainObject(raw) || typeof raw.portal !== 'string') return ''
    return raw.portal.trim()
}

/** params_json → { params, query }. */
export function parseItemParams(text: string): { params: Record<string, string>; query: Record<string, string> } {
    const raw = parseJson<unknown>(text, null)
    if (!isPlainObject(raw)) return { params: {}, query: {} }
    return { params: stringMap(raw.params), query: stringMap(raw.query) }
}

function manifestItem(gr: GR): ManifestMenuItem {
    const p = parseItemParams(str(gr, 'params_json'))
    return {
        id: gr.getUniqueValue(),
        type: (str(gr, 'type') || 'route') as NavItemType,
        label: str(gr, 'label'),
        icon: str(gr, 'icon'),
        tooltip: str(gr, 'tooltip'),
        badge: str(gr, 'badge'),
        target: str(gr, 'target'),
        match: str(gr, 'match') || 'prefix',
        collapsed: bool(gr, 'collapsed'),
        roles: splitList(str(gr, 'roles')),
        condition: str(gr, 'condition').trim(),
        pageId: str(gr, 'page') || null,
        params: p.params,
        query: p.query,
        route: str(gr, 'route'),
        url: str(gr, 'url'),
        portal: parseItemPortal(str(gr, 'params_json')),
        children: [],
    }
}

/** Active items of one menu as a tree (children of a missing/inactive/non-group parent are dropped). */
function itemTree(menuId: string): ManifestMenuItem[] {
    const items: Record<string, ManifestMenuItem> = {}
    const parents: Record<string, string> = {}
    const order: string[] = []
    each(
        T.menuItem,
        `menu=${menuId}^active=true`,
        (gr) => {
            const item = manifestItem(gr)
            items[item.id] = item
            parents[item.id] = str(gr, 'parent')
            order.push(item.id)
        },
        ['order', 'sys_created_on'],
    )
    const root: ManifestMenuItem[] = []
    for (const id of order) {
        const parentId = parents[id]
        if (!parentId) {
            root.push(items[id])
            continue
        }
        const parent = items[parentId]
        if (parent && parent.type === 'group') parent.children.push(items[id])
    }
    return root
}

/** Active menus of a portal, keyed by menu key (the release manifest's `menus`). */
export function assembleMenus(portalId: string): Record<string, ManifestMenu> {
    const out: Record<string, ManifestMenu> = {}
    each(
        T.menu,
        `portal=${portalId}^active=true`,
        (m) => {
            const key = str(m, 'key')
            if (!key || out[key]) return
            out[key] = { id: m.getUniqueValue(), key, name: str(m, 'name'), items: itemTree(m.getUniqueValue()) }
        },
        'key',
    )
    return out
}

/* ---------------- Per-user resolution ---------------- */

export interface MenuResolveContext {
    pages: MenuPage[]
    portal: { id: string; slug: string; name: string }
    /** The $sp / $rp helper handed to condition scripts. */
    api?: Record<string, unknown> | null
}

function cleanPath(p: string): string {
    return String(p || '').replace(/^\/+|\/+$/g, '')
}

/** Fill a page route pattern with params; null when a required param is missing. */
export function fillRoute(pattern: string, params: Record<string, string>): string | null {
    if (!pattern) return ''
    const out: string[] = []
    for (const seg of pattern.split('/')) {
        if (seg === '*') {
            const rest = cleanPath(params['*'] || '')
            if (rest) out.push(rest.split('/').map(encodeURIComponent).join('/'))
            continue
        }
        if (seg.charAt(0) === ':') {
            const v = params[seg.substring(1)]
            if (v === undefined || v === '') return null
            out.push(encodeURIComponent(v))
            continue
        }
        out.push(seg)
    }
    return out.join('/')
}

/** Split a route field ("orders?tab=open") into a path and query map. */
function splitRoute(route: string): { to: string; q: Record<string, string> } {
    const raw = String(route || '').trim()
    const qi = raw.indexOf('?')
    const q: Record<string, string> = {}
    if (qi >= 0) {
        for (const pair of raw.substring(qi + 1).split('&')) {
            if (!pair) continue
            const eq = pair.indexOf('=')
            const k = decodeURIComponent((eq >= 0 ? pair.substring(0, eq) : pair).replace(/\+/g, ' '))
            const v = eq >= 0 ? decodeURIComponent(pair.substring(eq + 1).replace(/\+/g, ' ')) : ''
            if (k) q[k] = v
        }
    }
    return { to: cleanPath(qi >= 0 ? raw.substring(0, qi) : raw), q }
}

const STATEMENT_START = /^(var|let|const|if|for|while|do|switch|try|throw|return|function|class)\b/

/**
 * True for a one-line expression such as `gs.hasRole('itil')` or `false`: no statements, no
 * `return`/`answer`. Anything else runs as a function body (wrapping a statement in `return (…)`
 * would be a syntax error that the evaluator only reports at the end of the transaction).
 */
export function isBareExpression(script: string): boolean {
    const s = String(script || '').trim().replace(/;$/, '')
    if (!s || /[\n;{}]/.test(s)) return false
    if (/\breturn\b|\banswer\b/.test(s)) return false
    return !STATEMENT_START.test(s)
}

/**
 * Wrap a condition script: it may `return` a value, set `answer`, or be a bare expression. Errors
 * are caught into __rpError (GlideScopedEvaluator swallows them otherwise) and hide the item.
 */
export function wrapCondition(script: string): string {
    const body = isBareExpression(script) ? `return (${script.trim().replace(/;$/, '')}\n)` : script

    return [
        'var answer;',
        '__rpResult = (function () {',
        '    try {',
        '        var __r = (function () {',
        body,
        '        })();',
        '        return __r === undefined ? answer : __r;',
        '    } catch (e) {',
        "        __rpError = { message: String(e && e.message ? e.message : e), line: e && e.lineNumber ? e.lineNumber : null };",
        '        return false;',
        '    }',
        '})();',
    ].join('\n')
}

/** Evaluate an item's condition for the current user. True = keep. Failures hide the item. */
export function evaluateCondition(item: ManifestMenuItem, ctx: MenuResolveContext): boolean {
    if (!item.condition) return true
    try {
        // GlideScopedEvaluator only runs scripts of a stored record (an initialize()d one evaluates to
        // nothing), so load the item and evaluate the manifest's condition text in memory on it.
        const gr = getById(T.menuItem, item.id)
        if (!gr) return false
        gr.setValue('condition', wrapCondition(item.condition))
        const evaluator: any = new GlideScopedEvaluator()
        evaluator.putVariable('__rpResult', null)
        evaluator.putVariable('__rpError', null)
        evaluator.putVariable('portal', { id: ctx.portal.id, slug: ctx.portal.slug, name: ctx.portal.name })
        evaluator.putVariable('item', { id: item.id, type: item.type, label: item.label, pageId: item.pageId, route: item.route })
        evaluator.putVariable('user', { id: gs.getUserID(), name: gs.getUserName() })
        if (ctx.api) {
            evaluator.putVariable('$sp', ctx.api)
            evaluator.putVariable('$rp', ctx.api)
        }
        evaluator.evaluateScript(gr, 'condition', null)
        const err = evaluator.getVariable('__rpError')
        if (err) {
            const e = JSON.parse(JSON.stringify(err)) as { message?: string }
            gs.warn(`[React Portal] menu item ${item.id} condition failed: ${e.message || 'error'}`)
            return false
        }
        const result = evaluator.getVariable('__rpResult')
        if (result === null || result === undefined) return false // script didn't run (syntax error)
        const s = String(result)
        return !(s === 'false' || s === '' || s === '0' || s === 'null' || s === 'undefined')
    } catch (e) {
        gs.warn(`[React Portal] menu item ${item.id} condition failed: ${e}`)
        return false
    }
}

function resolveItem(item: ManifestMenuItem, ctx: MenuResolveContext, pagesById: Record<string, MenuPage>, depth: number): NavItem | null {
    if (depth > MAX_MENU_DEPTH) return null
    if (!hasAnyRole(item.roles)) return null
    if (item.type === 'dynamic') return null // phase 2
    if (!evaluateCondition(item, ctx)) return null

    const nav: NavItem = { id: item.id, type: item.type, label: item.label, children: [] }
    if (item.icon) nav.icon = item.icon
    if (item.badge) nav.badge = item.badge
    if (item.tooltip) nav.tooltip = item.tooltip
    if (item.type === 'separator') return nav

    if (item.type === 'group') {
        nav.children = resolveList(item.children, ctx, pagesById, depth + 1)
        if (!nav.children.some((c) => c.type !== 'separator')) return null
        nav.open = !item.collapsed
        return nav
    }
    if (item.type === 'url') {
        if (!item.url) return null
        nav.href = item.url
        nav.target = item.target === '_self' ? '_self' : '_blank'
        return nav
    }
    if (item.type === 'page') {
        const page = item.pageId ? pagesById[item.pageId] : null
        if (!page || !canAccessPageConfig(page.access)) return null
        const to = fillRoute(page.route, item.params)
        if (to === null) return null
        nav.to = to
        if (Object.keys(item.query).length) nav.q = { ...item.query }
    } else {
        const r = splitRoute(item.route)
        nav.to = r.to
        if (Object.keys(r.q).length) nav.q = r.q
        if (item.portal && item.portal !== ctx.portal.slug) nav.portalSlug = item.portal
    }
    nav.match = item.match === 'exact' ? 'exact' : 'prefix'
    if (item.target === '_blank') nav.target = '_blank'
    return nav
}

/** Resolve a list, then drop leading, trailing and doubled separators. */
function resolveList(items: ManifestMenuItem[], ctx: MenuResolveContext, pagesById: Record<string, MenuPage>, depth: number): NavItem[] {
    const out: NavItem[] = []
    for (const item of items || []) {
        const nav = resolveItem(item, ctx, pagesById, depth)
        if (!nav) continue
        if (nav.type === 'separator' && (!out.length || out[out.length - 1].type === 'separator')) continue
        out.push(nav)
    }
    while (out.length && out[out.length - 1].type === 'separator') out.pop()
    return out
}

function pageIndex(pages: MenuPage[]): Record<string, MenuPage> {
    const out: Record<string, MenuPage> = {}
    for (const p of pages || []) out[p.id] = p
    return out
}

/** One menu for the current user ([] when the menu doesn't exist). */
export function resolveMenu(menus: Record<string, ManifestMenu> | undefined, key: string, ctx: MenuResolveContext): NavItem[] {
    const menu = menus ? menus[String(key || '')] : null
    if (!menu) return []
    return resolveList(menu.items, ctx, pageIndex(ctx.pages), 0)
}

/** Every menu for the current user, by key. */
export function resolveMenus(menus: Record<string, ManifestMenu> | undefined, ctx: MenuResolveContext): MenuMap {
    const out: MenuMap = {}
    if (!menus) return out
    const pagesById = pageIndex(ctx.pages)
    for (const key of Object.keys(menus)) out[key] = resolveList(menus[key].items, ctx, pagesById, 0)
    return out
}

/** Find one resolved item (any depth) by id, or null. */
export function findNavItem(map: MenuMap, id: string): NavItem | null {
    const walk = (items: NavItem[]): NavItem | null => {
        for (const it of items) {
            if (it.id === id) return it
            const found = walk(it.children)
            if (found) return found
        }
        return null
    }
    for (const key of Object.keys(map)) {
        const found = walk(map[key])
        if (found) return found
    }
    return null
}
