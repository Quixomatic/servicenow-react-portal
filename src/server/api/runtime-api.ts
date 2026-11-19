import { handle, wrap, send, requiredParam, bodyString } from './http.ts'
import { bootstrap, resolvePage, exposedProperties, translateMessages } from '../runtime/portal-service.ts'
import { execute, initialize } from '../runtime/component-executor.ts'
import { getAsset } from '../runtime/asset-service.ts'
import { badRequest, isRPError } from '../lib/errors.ts'
import { isPlainObject } from '../lib/util.ts'
import type { ExecuteAction } from '../../shared/contracts'

/**
 * Runtime scripted REST API (/api/x_312987_portal/rp/...). Consumers use these; every
 * handler performs its own portal/page access checks (RPAccess).
 */

/** GET /portals/{slug}/bootstrap */
export function bootstrapRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const r = bootstrap(requiredParam(req, 'slug'))
        return { data: r.data, meta: { release: r.release } }
    })
}

/** POST /pages/resolve { portal, page } */
export function resolvePageRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const portal = bodyString(req, 'portal')
        if (!portal) throw badRequest('portal is required')
        const r = resolvePage(portal, bodyString(req, 'page'))
        return { data: r.data, meta: { release: r.release } }
    })
}

/** POST /instances/initialize { portal, page?, instances: [], context? } */
export function initializeRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const portal = bodyString(req, 'portal')
        if (!portal) throw badRequest('portal is required')
        const instances = req.body.instances
        if (!Array.isArray(instances)) throw badRequest('instances must be an array of instance ids')
        const r = initialize({
            portal,
            page: req.body.page === undefined ? undefined : bodyString(req, 'page'),
            instances: instances.map(String),
            context: isPlainObject(req.body.context) ? req.body.context : undefined,
            correlationId: req.correlationId,
        })
        return { data: { instances: r.instances }, meta: { release: r.release } }
    })
}

const ACTIONS: ExecuteAction[] = ['initialize', 'get', 'update']

/** POST /instances/{instance}/execute { portal, page?, action?, input?, data?, context? } */
export function executeRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const portal = bodyString(req, 'portal')
        if (!portal) throw badRequest('portal is required')
        const action = (bodyString(req, 'action', 'get') || 'get') as ExecuteAction
        if (ACTIONS.indexOf(action) < 0) throw badRequest('action must be initialize, get or update')
        const r = execute({
            portal,
            page: req.body.page === undefined ? undefined : bodyString(req, 'page'),
            placementId: requiredParam(req, 'instance'),
            action,
            input: isPlainObject(req.body.input) ? req.body.input : undefined,
            data: isPlainObject(req.body.data) ? req.body.data : undefined,
            context: isPlainObject(req.body.context) ? req.body.context : undefined,
            correlationId: req.correlationId,
        })
        return { data: r.data, options: r.options, meta: { build: r.buildId, release: r.release, ...(r.messages.length ? { messages: r.messages } : {}) } as any }
    })
}

/** GET /assets/{build}/{file}/raw: raw asset body, immutable caching. */
export function assetRoute(request: any, response: any): void {
    let req
    try {
        req = wrap(request)
        const asset = getAsset(requiredParam(req, 'build'), requiredParam(req, 'file'))
        const etag = `"${asset.hash}"`
        response.setHeader('ETag', etag)
        response.setHeader('Cache-Control', asset.cacheControl)
        response.setHeader('X-Content-Type-Options', 'nosniff')
        if (req.header('If-None-Match') === etag) {
            response.setStatus(304)
            return
        }
        response.setStatus(200)
        response.setContentType(asset.mimeType + '; charset=utf-8')
        response.getStreamWriter().writeString(asset.content)
    } catch (e) {
        const status = isRPError(e) ? e.status : 500
        send(response, status, {
            error: { status, code: isRPError(e) ? e.code : 'internal_error', message: isRPError(e) ? e.message : 'Unexpected server error' },
            meta: { correlationId: req ? req.correlationId : '' },
        })
    }
}

/** GET /properties?portal=<slug>&names=a,b — exposed system properties only. */
export function propertiesRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const q = req.queryParams || {}
        const portal = String((q.portal && q.portal[0]) || '')
        if (!portal) throw badRequest('portal is required')
        const names = String((q.names && q.names[0]) || '').split(',')
        return { data: { values: exposedProperties(portal, names) } }
    })
}

/** POST /messages { keys: [] } — translated UI messages. */
export function messagesRoute(request: any, response: any): void {
    handle(request, response, (req) => {
        const keys = Array.isArray(req.body.keys) ? (req.body.keys as unknown[]).map(String) : []
        return { data: { messages: translateMessages(keys) } }
    })
}
