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
import type { CompleteBuildRequest, SaveRequest } from '../../shared/contracts'

/**
 * Studio scripted REST API (/api/x_312987_portal/rp_studio/...). Restricted to React
 * Portal studio roles by the API's ACL and again per handler (RPAccess.requireStudio).
 */

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
    handle(request, response, (req) => save('component', requiredParam(req, 'id'), req.body as unknown as SaveRequest).then((data) => ({ data })))
}

/** GET /themes/{id}/project */
export function themeProjectRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: getProject('theme', requiredParam(req, 'id')) }))
}

/** POST /themes/{id}/save */
export function themeSaveRoute(request: any, response: any): void {
    handle(request, response, (req) => save('theme', requiredParam(req, 'id'), req.body as unknown as SaveRequest).then((data) => ({ data })))
}

/** POST /builds/{id}/complete */
export function buildCompleteRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: completeBuild(requiredParam(req, 'id'), req.body as unknown as CompleteBuildRequest) }))
}

/** POST /builds/{id}/preview */
export function buildPreviewRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: previewContext(requiredParam(req, 'id')) }))
}

/** POST /portals/{id}/process: force-reprocess the portal's compiled release. */
export function processRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: reprocess(requiredParam(req, 'id')) }))
}

/** POST /components { name, kind, namespace?, key? }: create with a starter client script. */
export function createComponentRoute(request: any, response: any): void {
    handle(request, response, (req) => createComponent(req.body as { name?: string; kind?: string }).then((data) => ({ data, status: 201 })))
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

/** POST /placements { portal, page?, region, component, index?, options? } */
export function createPlacementRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: createPlacement(req.body as any), status: 201 }))
}

/** PATCH /placements/{id} { region?, index?, page?, options?, active? } */
export function updatePlacementRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: updatePlacement(requiredParam(req, 'id'), req.body as any) }))
}

/** DELETE /placements/{id} */
export function deletePlacementRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: deletePlacement(requiredParam(req, 'id')) }))
}

/** POST /pages { portal, name, title?, route, layoutOverride? } */
export function createPageRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: createPage(req.body as any), status: 201 }))
}

/** PATCH /pages/{id} */
export function updatePageRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: updatePage(requiredParam(req, 'id'), req.body as any) }))
}

/** DELETE /pages/{id} */
export function deletePageRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: deletePage(requiredParam(req, 'id')) }))
}

/** PATCH /portals/{id} */
export function updatePortalRoute(request: any, response: any): void {
    handle(request, response, (req) => ({ data: updatePortal(requiredParam(req, 'id'), req.body as any) }))
}
