import { handle, wrap, send, requiredParam, bodyString } from './http.ts'
import { bootstrap, resolvePage, exposedProperties, translateMessages } from '../runtime/portal-service.ts'
import { execute, initialize, InitializeEntry } from '../runtime/component-executor.ts'
import { getAsset } from '../runtime/asset-service.ts'
import { badRequest, isRPError } from '../lib/errors.ts'
import { resetAccessCache } from '../security/access.ts'
import { isPlainObject } from '../lib/util.ts'
import type { EmbedRequest, ExecuteAction } from '../../shared/contracts'

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
        if (!Array.isArray(instances)) throw badRequest('instances must be an array of instance ids or embed descriptors')
        const r = initialize({
            portal,
            page: req.body.page === undefined ? undefined : bodyString(req, 'page'),
            instances: (instances as unknown[]).map(initializeEntry),
            context: isPlainObject(req.body.context) ? req.body.context : undefined,
            correlationId: req.correlationId,
        })
        return { data: { instances: r.instances }, meta: { release: r.release } }
    })
}

/**
 * A placement id (string), or an embed descriptor { id, placement, path[], keys?, options?, token? }
 * with its shape checked here (the executor authorizes it and validates limits).
 */
function initializeEntry(v: unknown): InitializeEntry {
    if (!isPlainObject(v)) return String(v)
    const id = typeof v.id === 'string' ? v.id : ''
    const placement = typeof v.placement === 'string' ? v.placement : ''
    // The root: a placement sys_id, or layout:<component sys_id> (embeds under a layout).
    if (!id || id.length > 400 || !/^(layout:)?[0-9a-f]{32}$/.test(placement)) throw badRequest('embed descriptors need an id and a placement sys_id (or layout:<component sys_id>)')
    if (!Array.isArray(v.path) || (v.path as unknown[]).some((p) => typeof p !== 'string')) throw badRequest('embed descriptor path must be an array of component ids')
    if (v.keys !== undefined && !Array.isArray(v.keys)) throw badRequest('embed descriptor keys must be an array')
    if (v.options !== undefined && v.options !== null && !isPlainObject(v.options)) throw badRequest('embed descriptor options must be an object')
    return {
        id,
        placement,
        path: (v.path as unknown[]).map(String),
        keys: Array.isArray(v.keys) ? (v.keys as unknown[]).map(String) : undefined,
        options: isPlainObject(v.options) ? v.options : undefined,
        token: typeof v.token === 'string' ? v.token : null,
    }
}

/** The execute body's `embed`, when it's a plain object with a path. */
function embedOf(v: unknown): EmbedRequest | undefined {
    if (!isPlainObject(v)) return undefined
    if (!Array.isArray(v.path)) throw badRequest('embed.path must be an array of component ids')
    return {
        path: (v.path as unknown[]).map(String),
        keys: Array.isArray(v.keys) ? (v.keys as unknown[]).map(String) : undefined,
        options: v.options === undefined || v.options === null ? undefined : (v.options as Record<string, unknown>),
        token: typeof v.token === 'string' ? v.token : null,
    }
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
            embed: embedOf(req.body.embed),
        })
        return {
            data: r.data,
            options: r.options,
            meta: { build: r.buildId, release: r.release, ...(r.messages.length ? { messages: r.messages } : {}), ...(r.embed ? { embed: r.embed } : {}) } as any,
        }
    })
}

/** GET /assets/{build}/{file}/raw: raw asset body, immutable caching. */
export function assetRoute(request: any, response: any): void {
    let req
    try {
        resetAccessCache()
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
