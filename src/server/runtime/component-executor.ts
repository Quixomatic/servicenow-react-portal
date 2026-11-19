import { gs, GlideScopedEvaluator } from '@servicenow/glide'
import { getById, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, isRPError, notFound, rpError, sanitizeError } from '../lib/errors.ts'
import { correlationId as newCorrelationId, isPlainObject } from '../lib/util.ts'
import { isUsableBuild } from '../registry/registry.ts'
import { canAccessPageConfig, requirePortalAccess } from '../security/access.ts'
import { currentManifest, findPortalBySlug, placementIndex, matchPage, Manifest } from './portal-service.ts'
import { logExecution } from './diagnostics.ts'
import { createServerApi } from './server-api.ts'
import type { ExecuteAction, InstanceResult, PlacementRef } from '../../shared/contracts'

/**
 * RPComponentExecutor: runs a component's server script, always the one pinned in the
 * component's build, so client and server versions match.
 *
 * The script runs through GlideScopedEvaluator in the x_312987_portal scope with these
 * variables: input, data, options, component, context. It may mutate `data` (Service
 * Portal style) or return an object, which is merged over `data`.
 *
 * Transport-agnostic: REST handlers (and a future Data Broker) are thin adapters.
 */

export interface ExecuteParams {
    portal: string
    page?: string
    placementId: string
    action: ExecuteAction
    input?: Record<string, unknown>
    data?: Record<string, unknown>
    context?: Record<string, unknown>
    correlationId?: string
}

export interface ExecuteResult {
    data: Record<string, unknown>
    options: Record<string, unknown>
    buildId: string
    release: { id: string; version: number } | null
    durationMs: number
}

interface PreparedPortal {
    portal: any
    manifest: Manifest
    release: { id: string; version: number } | null
    index: ReturnType<typeof placementIndex>
    params: Record<string, string>
}

function preparePortal(slug: string, pagePath: string | undefined): PreparedPortal {
    const portal = requirePortalAccess(findPortalBySlug(slug))
    const { manifest, release } = currentManifest(portal)
    let params: Record<string, string> = {}
    if (pagePath !== undefined) {
        const m = matchPage(manifest, pagePath)
        if (m) params = m.params
    }
    return { portal, manifest, release, index: placementIndex(manifest), params }
}

function runOne(prep: PreparedPortal, p: ExecuteParams): ExecuteResult {
    const started = Date.now()
    const found = prep.index[p.placementId]
    if (!found) throw notFound('Component instance not found in this portal')
    if (found.page && !canAccessPageConfig(found.page.access)) throw notFound('Component instance not found in this portal')

    const placement: PlacementRef = found.placement
    if (placement.component.serverMode === 'none') throw badRequest('This component has no server script')
    if (!placement.component.build) throw rpError(409, 'no_build', 'Component has no usable build')

    const build = getById(T.build, placement.component.build.id)
    if (!build || !isUsableBuild(build)) throw rpError(409, 'no_build', 'Component build is not available')

    const options = { ...placement.options }
    // Every action starts from empty data: the client's data is never sent back to the server.
    const data: Record<string, unknown> = {}
    const input: Record<string, unknown> = isPlainObject(p.input) ? p.input : {}

    const script = str(build, 'server_script')
    if (script.trim()) {
        // Same pattern as the TurboForge Now Experience component API: hand the variables to the
        // evaluator, run the build's (raw) server script, read `data` back.
        const evaluator: any = new GlideScopedEvaluator()
        evaluator.putVariable('input', input)
        evaluator.putVariable('data', data)
        evaluator.putVariable('options', options)
        evaluator.putVariable('component', {
            id: placement.component.id,
            uniqueId: placement.component.uniqueId,
            instanceId: placement.id,
            region: placement.region,
            build: build.getUniqueValue(),
        })
        evaluator.putVariable('context', {
            portal: prep.manifest.portal.slug,
            portalId: prep.manifest.portal.id,
            page: found.page ? found.page.route : null,
            params: prep.params,
            action: p.action,
            release: prep.release,
            user: { id: gs.getUserID(), name: gs.getUserName() },
            client: isPlainObject(p.context) ? p.context : {},
        })
        // $rp (and the Service Portal-compatible alias $sp): server helpers for component scripts.
        const api = createServerApi({
            input,
            options,
            params: prep.params,
            portal: { id: prep.manifest.portal.id, slug: prep.manifest.portal.slug, name: prep.manifest.portal.name, settings: prep.manifest.portal.settings },
            page: found.page ? { route: found.page.route, params: prep.params } : null,
            component: { id: placement.component.id, uniqueId: placement.component.uniqueId, instanceId: placement.id },
            manifest: prep.manifest,
        })
        evaluator.putVariable('$rp', api)
        evaluator.putVariable('$sp', api)
        evaluator.putVariable('__rpError', null)
        evaluator.evaluateScript(build, 'server_script', null)
        const caught = evaluator.getVariable('__rpError')
        if (caught) {
            const err = JSON.parse(JSON.stringify(caught)) as { message?: string; line?: number | null }
            const line = typeof err.line === 'number' && err.line > 1 ? err.line - 1 : null
            throw rpError(500, 'script_error', `Server script error${line ? ' (line ' + line + ')' : ''}: ${err.message || 'unknown error'}`, {
                component: placement.component.uniqueId,
                line,
            })
        }
        const out = evaluator.getVariable('data')
        // Normalize whatever the script left in `data` (native objects, Java strings) to plain JSON.
        const plain = out === null || out === undefined ? {} : JSON.parse(JSON.stringify(out))
        for (const k of Object.keys(data)) delete data[k]
        if (isPlainObject(plain)) for (const k of Object.keys(plain)) data[k] = plain[k]
    }

    return {
        data,
        options,
        buildId: build.getUniqueValue(),
        release: prep.release,
        durationMs: Date.now() - started,
    }
}

/** Execute one instance (execute endpoint). Throws RPError on failure. */
export function execute(p: ExecuteParams): ExecuteResult {
    const cid = p.correlationId || newCorrelationId()
    const started = Date.now()
    let prep: PreparedPortal | null = null
    try {
        prep = preparePortal(p.portal, p.page)
        const result = runOne(prep, p)
        logExecution({
            correlationId: cid,
            action: p.action,
            outcome: 'success',
            durationMs: result.durationMs,
            releaseId: prep.release ? prep.release.id : null,
            buildId: result.buildId,
            placementId: p.placementId,
            portalId: prep.manifest.portal.id,
        })
        return result
    } catch (e) {
        const status = isRPError(e) ? e.status : 500
        logExecution({
            correlationId: cid,
            action: p.action,
            outcome: status === 403 || status === 401 ? 'denied' : 'error',
            durationMs: Date.now() - started,
            releaseId: prep && prep.release ? prep.release.id : null,
            placementId: p.placementId,
            portalId: prep ? prep.manifest.portal.id : null,
            error: sanitizeError(e),
        })
        if (isRPError(e)) throw e
        throw rpError(500, 'script_error', sanitizeError(e))
    }
}

/** Batch-initialize instances; each instance succeeds or fails independently. */
export function initialize(params: {
    portal: string
    page?: string
    instances: string[]
    context?: Record<string, unknown>
    correlationId?: string
}): { instances: Record<string, InstanceResult>; release: { id: string; version: number } | null } {
    const cid = params.correlationId || newCorrelationId()
    const prep = preparePortal(params.portal, params.page)
    const out: Record<string, InstanceResult> = {}
    const ids = (params.instances || []).slice(0, 100)
    for (const id of ids) {
        const started = Date.now()
        try {
            const r = runOne(prep, {
                portal: params.portal,
                page: params.page,
                placementId: id,
                action: 'initialize',
                context: params.context,
            })
            out[id] = { ok: true, data: r.data, options: r.options, build: r.buildId }
            logExecution({
                correlationId: cid,
                action: 'initialize',
                outcome: 'success',
                durationMs: r.durationMs,
                releaseId: prep.release ? prep.release.id : null,
                buildId: r.buildId,
                placementId: id,
                portalId: prep.manifest.portal.id,
            })
        } catch (e) {
            const status = isRPError(e) ? e.status : 500
            const code = isRPError(e) ? e.code : 'script_error'
            out[id] = { ok: false, error: { status, code, message: sanitizeError(e) } }
            logExecution({
                correlationId: cid,
                action: 'initialize',
                outcome: 'error',
                durationMs: Date.now() - started,
                releaseId: prep.release ? prep.release.id : null,
                placementId: id,
                portalId: prep.manifest.portal.id,
                error: sanitizeError(e),
            })
        }
    }
    return { instances: out, release: prep.release }
}
