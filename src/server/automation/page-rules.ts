import { getById, findOne, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { isValidJson, parseJson, isPlainObject } from '../lib/util.ts'
import { normalizeRoutePattern } from '../lib/paths.ts'
import { effectiveRegionNames, blockRegionsOf, MAX_BLOCK_DEPTH } from '../runtime/portal-service.ts'
import { classTokens } from '../lib/css-safe.ts'
import { abort } from './guards.ts'

/**
 * Page and placement business rules.
 */

/** before insert/update on page: route pattern, unique per portal, layout kind, access JSON. */
export function validatePage(current: any, previous: any): void {
    const portalId = str(current, 'portal')
    if (!getById(T.portal, portalId)) return abort(current, 'A page belongs to a portal.')

    const route = normalizeRoutePattern(str(current, 'route_pattern'))
    if (route === null) {
        return abort(current, 'Route must be "" (home) or segments like "orders", "orders/:id" or "docs/*".')
    }
    current.setValue('route_pattern', route)

    const dup = findOne(T.page, `portal=${portalId}^route_pattern=${route}^sys_id!=${current.getUniqueValue()}`)
    if (dup) return abort(current, `This portal already has a page at "/${route}".`)

    const layout = getById(T.component, str(current, 'layout_override'))
    if (layout && str(layout, 'kind') !== 'layout') return abort(current, 'Layout override must be a component of kind "layout".')

    const access = str(current, 'access_config_json')
    if (!isValidJson(access)) return abort(current, 'access_config_json is not valid JSON.')
    const cfg = parseJson<unknown>(access, {})
    if (cfg !== null && !isPlainObject(cfg)) return abort(current, 'access_config_json must be an object, e.g. {"roles":["itil"]}.')

    if (!str(current, 'title')) current.setValue('title', str(current, 'name'))
}

/**
 * before insert/update on placement: exactly one owner (a page, or the portal itself),
 * region exists on the effective layout (or the parent block's drop zones), widget or block,
 * parent in the same owner, no cycles, bounded nesting.
 */
export function validatePlacement(current: any, previous: any): void {
    const pageId = str(current, 'page')
    let portalId = str(current, 'portal')
    if (pageId) {
        const page = getById(T.page, pageId)
        if (!page) return abort(current, 'Page not found.')
        if (portalId && portalId !== str(page, 'portal')) return abort(current, 'Page belongs to a different portal.')
        portalId = str(page, 'portal')
        current.setValue('portal', portalId)
        current.setValue('owner_key', `page:${pageId}`)
    } else {
        if (!getById(T.portal, portalId)) return abort(current, 'A placement belongs to a portal (portal-level) or a page.')
        current.setValue('owner_key', `portal:${portalId}`)
    }

    const component = getById(T.component, str(current, 'component'))
    if (!component) return abort(current, 'Component is required.')
    const kind = str(component, 'kind')
    if (kind !== 'widget' && kind !== 'block') {
        return abort(current, 'Only widgets and blocks can be placed; layouts are chosen on the portal or page.')
    }

    const region = (str(current, 'region') || 'main').trim().toLowerCase()
    current.setValue('region', region)
    const parentId = str(current, 'parent')
    if (parentId) {
        // Inside a block: the region must be one of the block instance's drop zones.
        const parent = getById(T.placement, parentId)
        if (!parent) return abort(current, 'Parent placement not found.')
        const zones = blockRegionsOf(parent)
        if (!zones) return abort(current, 'Only blocks can contain placements.')
        const names = zones.map((z) => z.name)
        if (names.indexOf(region) < 0) {
            return abort(current, `Region "${region}" isn't a drop zone of the parent block (${names.join(', ') || 'none'}).`)
        }
    } else {
        const regions = effectiveRegionNames(portalId, pageId || null)
        if (regions && regions.indexOf(region) < 0) {
            return abort(current, `Region "${region}" doesn't exist on the effective layout (${regions.join(', ')}).`)
        }
    }

    const classes = str(current, 'classes')
    if (classes) current.setValue('classes', classTokens(classes).join(' '))

    for (const f of ['options_json', 'style_tokens_json', 'visibility_config_json', 'layout_json']) {
        if (!isValidJson(str(current, f))) return abort(current, `${f} is not valid JSON.`)
    }

    // Parent: same owner, no cycles, bounded depth.
    let ancestor = parentId
    if (ancestor) {
        const seen: Record<string, boolean> = { [current.getUniqueValue()]: true }
        let depth = 0
        while (ancestor) {
            if (seen[ancestor]) return abort(current, 'Placement parents form a cycle.')
            seen[ancestor] = true
            const parent = getById(T.placement, ancestor)
            if (!parent) return abort(current, 'Parent placement not found.')
            if (depth === 0 && str(parent, 'owner_key') !== str(current, 'owner_key')) {
                return abort(current, 'Parent placement must belong to the same portal or page.')
            }
            ancestor = str(parent, 'parent')
            if (++depth > MAX_BLOCK_DEPTH) return abort(current, `Blocks can nest at most ${MAX_BLOCK_DEPTH} levels deep.`)
        }
    }
}
