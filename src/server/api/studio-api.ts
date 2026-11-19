import { handle, requiredParam } from './http.ts'
import {
    resolveDesignTarget,
    portalDesign,
    pageDesign,
    createPlacement,
    updatePlacement,
    deletePlacement,
    createPage,
    updatePage,
    deletePage,
    updatePortal,
} from '../design/design-service.ts'
import { getProject, save, check, createComponent } from '../source/source-service.ts'
import { completeBuild, previewContext } from '../build/build-service.ts'
import { reprocess } from '../release/release-service.ts'
import { listComponents, listThemes, listPortals } from '../registry/catalog.ts'
import { listMenus, createMenu, updateMenu, deleteMenu, createMenuItem, updateMenuItem, deleteMenuItem, iconSearch } from '../design/menu-design-service.ts'
import { studioContext, requireReactPortalScope } from '../security/scope.ts'
import { requireStudio } from '../security/access.ts'
import type { CompleteBuildRequest, SaveRequest } from '../../shared/contracts'

/**
 * Studio scripted REST API (/api/x_312987_portal/rp_studio/...). Restricted to React
 * Portal studio roles by the API's ACL and again per handler (RPAccess.requireStudio).
 *
 * Every write first checks the user's current application (scope.ts): writes made while the
 * application picker is on another app would land in the wrong scope / update set, so they're
 * rejected with 409 wrong_scope. Reads are always allowed.
 */

/** Write guard, then the handler. */
function write<R>(fn: () => R): R {
    requireReactPortalScope()
    return fn()
}

/** GET /components */
export function listComponentsRoute(request: any, response: any): void {
    handle(request, response, () => ({ data: listComponents() }))
}

/** GET /themes */
export function listThemesRoute(request: any, response: any): void {
    handle(request, response, () => ({ data: listThemes() }))
}

/** GET /portals */
export function listPortalsRoute(request: any, response: any): void {
    handle(request, response, () => ({ data: listPortals() }))
}

/** GET /components/{id}/project */
export function componentProjectRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: getProject('component', requiredParam(req, 'id')) }))
}

/** POST /components/{id}/save */
export function componentSaveRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => save('component', requiredParam(req, 'id'), req.body as unknown as SaveRequest).then((data) => ({ data }))))
}

/** GET /themes/{id}/project */
export function themeProjectRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: getProject('theme', requiredParam(req, 'id')) }))
}

/** POST /themes/{id}/save */
export function themeSaveRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => save('theme', requiredParam(req, 'id'), req.body as unknown as SaveRequest).then((data) => ({ data }))))
}

/** POST /builds/{id}/complete */
export function buildCompleteRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: completeBuild(requiredParam(req, 'id'), req.body as unknown as CompleteBuildRequest) })))
}

/** POST /builds/{id}/preview */
export function buildPreviewRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: previewContext(requiredParam(req, 'id')) }))
}

/** POST /portals/{id}/process: force-reprocess the portal's compiled release. */
export function processRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: reprocess(requiredParam(req, 'id')) })))
}

/** POST /components { name, kind, namespace?, key? }: create with a starter client script. */
export function createComponentRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => createComponent(req.body as { name?: string; kind?: string }).then((data) => ({ data, status: 201 }))))
}

/** POST /components/{id}/check { files: [{ path, content }] }: dry-run compile, nothing written. */
export function componentCheckRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const files = Array.isArray(req.body.files) ? (req.body.files as { path: string; content: string }[]) : []
        return check('component', requiredParam(req, 'id'), files).then((data) => ({ data }))
    })
}

/* ---------------- Page designer ---------------- */

/** GET /design/{id}: what a record id is (portal, page, component, theme). */
export function designTargetRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: resolveDesignTarget(requiredParam(req, 'id')) }))
}

/** GET /portals/{id}/design */
export function portalDesignRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: portalDesign(requiredParam(req, 'id')) }))
}

/** GET /pages/{id}/design */
export function pageDesignRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: pageDesign(requiredParam(req, 'id')) }))
}

/** POST /placements { portal, page?, parent?, region, component, index?, options?, styleTokens?, layout?, classes? } */
export function createPlacementRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => createPlacement(req.body as any).then((data) => ({ data, status: 201 }))))
}

/** PATCH /placements/{id} { region?, index?, page?, parent?, options?, active?, styleTokens?, layout?, classes? } */
export function updatePlacementRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => updatePlacement(requiredParam(req, 'id'), req.body as any).then((data) => ({ data }))))
}

/** DELETE /placements/{id}?mode=lift|cascade (mode is required when the block has children) */
export function deletePlacementRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: deletePlacement(requiredParam(req, 'id'), ((req.queryParams || {}).mode || [])[0]) })))
}

/** POST /pages { portal, name, title?, route, layoutOverride? } */
export function createPageRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: createPage(req.body as any), status: 201 })))
}

/** PATCH /pages/{id} */
export function updatePageRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: updatePage(requiredParam(req, 'id'), req.body as any) })))
}

/** DELETE /pages/{id} */
export function deletePageRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: deletePage(requiredParam(req, 'id')) })))
}

/** PATCH /portals/{id} */
export function updatePortalRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: updatePortal(requiredParam(req, 'id'), req.body as any) })))
}

/* ---------------- Studio context ---------------- */

/** GET /context: React Portal's app, the user's current application, inScope, update set. */
export function contextRoute(request: any, response: any): void {
    handle(request, response, () => {
        requireStudio('any')
        return { data: studioContext() }
    })
}

/* ---------------- Menus ---------------- */

function queryParam(req: { queryParams: Record<string, string[]> }, name: string): string {
    const v = (req.queryParams || {})[name]
    return v && v.length ? String(v[0]) : ''
}

/** GET /portals/{id}/menus: every menu of the portal with its full item tree (unfiltered). */
export function listMenusRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: listMenus(requiredParam(req, 'id')) }))
}

/** POST /menus { portal, key, name?, description?, active? } */
export function createMenuRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: createMenu(req.body as any), status: 201 })))
}

/** PATCH /menus/{id} { key?, name?, description?, active? } */
export function updateMenuRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: updateMenu(requiredParam(req, 'id'), req.body as any) })))
}

/** DELETE /menus/{id} (items cascade) */
export function deleteMenuRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: deleteMenu(requiredParam(req, 'id')) })))
}

/** POST /menu-items { menu, parent?, index?, type, label?, page?, params?, route?, url?, icon?, ... } */
export function createMenuItemRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: createMenuItem(req.body as any), status: 201 })))
}

/** PATCH /menu-items/{id} { ...fields, parent?, index?, menu? } */
export function updateMenuItemRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: updateMenuItem(requiredParam(req, 'id'), req.body as any) })))
}

/** DELETE /menu-items/{id}?mode=lift|cascade (mode is required when the group has children) */
export function deleteMenuItemRoute(request: any, response: any): void {
    handle(request, response, (req) => write(() => ({ data: deleteMenuItem(requiredParam(req, 'id'), queryParam(req, 'mode') || undefined) })))
}

/** GET /icons?q=&limit=: lucide icon names for pickers. */
export function iconsRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: iconSearch(queryParam(req, 'q'), parseInt(queryParam(req, 'limit'), 10) || 200) }))
}
