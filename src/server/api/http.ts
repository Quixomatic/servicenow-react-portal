import { gs } from '@servicenow/glide'
import { isRPError, sanitizeError } from '../lib/errors.ts'
import { correlationId as newCorrelationId, isPlainObject } from '../lib/util.ts'
import type { EnvelopeMeta } from '../../shared/contracts'

/**
 * Thin scripted-REST adapter shared by the runtime and studio APIs.
 * Success: { data, options?, meta } with a normal 2xx status (no TurboForge-style 202s).
 * Failure: { error: { status, code, message, details? }, meta } with the matching status.
 */

export interface HandlerResult {
    data: unknown
    options?: Record<string, unknown>
    meta?: Partial<EnvelopeMeta>
    status?: number
}

export interface Req {
    pathParams: Record<string, string>
    queryParams: Record<string, string[]>
    body: Record<string, unknown>
    header(name: string): string
    correlationId: string
}

function readBody(request: any): Record<string, unknown> {
    try {
        const b = request.body
        if (!b) return {}
        const data = b.data
        if (isPlainObject(data)) return data
        const text = b.dataString
        if (text) {
            const parsed = JSON.parse(text)
            return isPlainObject(parsed) ? parsed : {}
        }
    } catch (e) {
        // GET requests have no body; malformed JSON is treated as empty and validated downstream.
    }
    return {}
}

export function wrap(request: any): Req {
    const cid = (request.getHeader && request.getHeader('x-correlation-id')) || newCorrelationId()
    return {
        pathParams: request.pathParams || {},
        queryParams: request.queryParams || {},
        body: readBody(request),
        header: (name: string) => (request.getHeader ? request.getHeader(name) || '' : ''),
        correlationId: String(cid).substring(0, 64),
    }
}

export function send(response: any, status: number, body: unknown): void {
    response.setStatus(status)
    response.setHeader('Cache-Control', 'no-store')
    response.setBody(body as any)
}

/** Run a handler and write the envelope / error body. */
export function handle(request: any, response: any, fn: (req: Req) => HandlerResult): void {
    const started = Date.now()
    let req: Req | null = null
    try {
        req = wrap(request)
        const result = fn(req)
        const meta: EnvelopeMeta = { correlationId: req.correlationId, durationMs: Date.now() - started, ...(result.meta || {}) }
        const body: Record<string, unknown> = { data: result.data, meta }
        if (result.options) body.options = result.options
        send(response, result.status || 200, body)
    } catch (e) {
        const cid = req ? req.correlationId : newCorrelationId()
        const status = isRPError(e) ? e.status : 500
        const code = isRPError(e) ? e.code : 'internal_error'
        const message = isRPError(e) ? e.message : 'Unexpected server error'
        if (!isRPError(e)) gs.error(`[React Portal] ${cid}: ${sanitizeError(e)}`)
        const error: Record<string, unknown> = { status, code, message }
        if (isRPError(e) && e.details !== undefined) error.details = e.details
        send(response, status, { error, meta: { correlationId: cid, durationMs: Date.now() - started } })
    }
}

export function requiredParam(req: Req, name: string): string {
    const v = req.pathParams[name]
    if (!v) throw { rpError: true, status: 400, code: 'bad_request', message: `Missing ${name}` }
    return decodeURIComponent(String(v))
}

export function bodyString(req: Req, name: string, fallback = ''): string {
    const v = req.body[name]
    return v === undefined || v === null ? fallback : String(v)
}
