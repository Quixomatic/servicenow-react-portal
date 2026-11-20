import { gs, GlideScopedEvaluator } from '@servicenow/glide'
import { getById, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, isRPError, notFound, rpError, sanitizeError } from '../lib/errors.ts'
import { correlationId as newCorrelationId, isPlainObject } from '../lib/util.ts'
import { isUsableBuild } from '../registry/registry.ts'
import { canAccessManifestPage, hasStudioCapability, requirePortalAccess } from '../security/access.ts'
import { currentManifest, findPortalBySlug, placementIndex, matchPage, effectiveLayoutOptions, Manifest, ManifestPage } from './portal-service.ts'
import { logExecution } from './diagnostics.ts'
import { createServerApi } from './server-api.ts'
import { drainSessionMessages } from '../lib/global-helpers.ts'
import { MAX_EMBED_DEPTH, MAX_EMBED_OPTIONS_BYTES, effectiveEmbedOptions, serverEmbedOptions } from './embed-options.ts'
import { signEmbed } from './embed-token.ts'
import type { ComponentImport, EmbedDescriptor, EmbedModel, EmbedRequest, ExecuteAction, InstanceResult, PlacementRef, ServerMessage, ServerMode } from '../../shared/contracts'

/**
 * RPComponentExecutor: runs a component's server script, always the one pinned in the
 * component's build, so client and server versions match.
 *
 * The script runs through GlideScopedEvaluator in the x_312987_portal scope with these
 * variables: input, data, options, component, context. It may mutate `data` (Service
 * Portal style) or return an object, which is merged over `data`.
 *
 * Two kinds of instance run here:
 * - placements (a placement sys_id in the portal's manifest);
 * - embedded instances: a widget another component's build imports and renders, addressed as
 *   root placement + embed path (see .plans/embedded-widgets.md §4.4, §5). They have no record:
 *   each request is authorized against the sealed manifest's direct import edges.
 * Either can also hang off a layout root, 'layout:<component sys_id>': the layout's own server
 * script, and widgets the layout's build imports. Authorized against the request's effective
 * layout (layoutRootOf).
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
    /** Run an embedded instance under placementId (the root). */
    embed?: EmbedRequest
}

export interface ExecuteResult {
    data: Record<string, unknown>
    options: Record<string, unknown>
    buildId: string
    release: { id: string; version: number } | null
    durationMs: number
    messages: ServerMessage[]
    /** Embedded instances only. */
    embed?: { id: string; token: string | null; dropped?: string[] }
}

/** Embed limits (per request / per descriptor list). */
export const MAX_EMBED_DESCRIPTORS = 50
export const MAX_GETWIDGET_CALLS = 20
const EMBED_KEY = /^[A-Za-z0-9_-]{1,64}$/

/** gs.getInfoMessages()/getErrorMessages() as string arrays (Java lists or JS arrays). */
function listOf(v: any): string[] {
    if (!v) return []
    if (typeof v.size === 'function') return Array.from({ length: v.size() }, (_, i) => String(v.get(i)))
    return Array.isArray(v) ? v.map(String) : []
}
function sessionMessages(): { info: string[]; error: string[] } {
    try {
        const g: any = gs
        return { info: listOf(g.getInfoMessages()), error: listOf(g.getErrorMessages()) }
    } catch (e) {
        return { info: [], error: [] }
    }
}
/**
 * Messages queued on the session after a script ran. With the global helper app installed, the
 * whole queue is drained and flushed (Service Portal behaviour: anything queued, also before the
 * script, reaches the portal once and never resurfaces as a classic-UI banner). Without it, only
 * the messages the script added since `before` (the queue can't be flushed from this scope).
 */
function newSessionMessages(before: { info: string[]; error: string[] }): ServerMessage[] {
    const drained = drainSessionMessages()
    if (drained) return drained
    const after = sessionMessages()
    const out: ServerMessage[] = []
    after.info.slice(before.info.length).forEach((m) => out.push({ type: 'info', message: m }))
    after.error.slice(before.error.length).forEach((m) => out.push({ type: 'error', message: m }))
    return out
}

interface PreparedPortal {
    portal: any
    manifest: Manifest
    release: { id: string; version: number } | null
    index: ReturnType<typeof placementIndex>
    params: Record<string, string>
    /** The page the request's `page` path matches (layout roots authorize against its layout). */
    match: { page: ManifestPage; params: Record<string, string> } | null
}

function preparePortal(slug: string, pagePath: string | undefined): PreparedPortal {
    const portal = requirePortalAccess(findPortalBySlug(slug))
    const { manifest, release } = currentManifest(portal)
    let params: Record<string, string> = {}
    let match: PreparedPortal['match'] = null
    if (pagePath !== undefined) {
        match = matchPage(manifest, pagePath)
        if (match) params = match.params
    }
    return { portal, manifest, release, index: placementIndex(manifest), params, match }
}

/* ---------------- targets ---------------- */

/** What a script run needs to know about the instance it runs for. */
interface Target {
    /** Placement id, or the composite embed id (<placement>~<key>…). */
    instanceId: string
    root: PlacementRef
    page: ManifestPage | null
    component: { id: string; uniqueId: string; name: string; serverMode: ServerMode }
    build: any
    options: Record<string, unknown>
    embed: null | {
        root: string
        /** Embedded components' unique ids, outermost first. */
        path: string[]
        /** Component sys_ids matching path (authorization chain). */
        ids: string[]
        keys: string[]
        parentInstanceId: string
        key: string
        token: string | null
        dropped: string[]
    }
}

const NOT_FOUND = 'Component instance not found in this portal'

/**
 * Script failures carry author details (the thrown message, line, component). Only authors see
 * them (the same audience as the host's detailed error toasts: admin, portal admin, developer,
 * designer); everyone else gets a generic message, and the response's correlationId is the
 * reference into the execution log, which keeps the full message.
 */
const GENERIC_SCRIPT_ERROR = 'The server script failed'

function canSeeScriptDetails(): boolean {
    return hasStudioCapability('design')
}

/** True for script failures (as opposed to controlled not_found / bad_request / forbidden errors). */
function isScriptFailure(e: unknown): boolean {
    return !isRPError(e) || e.code === 'script_error' || e.status >= 500
}

/** The message a viewer may see for a thrown value. */
function viewerMessage(e: unknown): string {
    return isScriptFailure(e) && !canSeeScriptDetails() ? GENERIC_SCRIPT_ERROR : sanitizeError(e)
}

/** An error to rethrow to the viewer: script failures lose their message and details for non-authors (script messages stay). */
function forViewer(e: unknown): unknown {
    if (!isRPError(e) || !isScriptFailure(e) || canSeeScriptDetails()) return e
    const messages = e.details && Array.isArray((e.details as any).messages) ? (e.details as any).messages : []
    return rpError(e.status, e.code, GENERIC_SCRIPT_ERROR, { messages })
}

/** Layout roots: 'layout:<component sys_id>' (embeds under a layout, and the layout's own script). */
const LAYOUT_ROOT = /^layout:([0-9a-f]{32})$/

export function isLayoutRoot(id: string): boolean {
    return LAYOUT_ROOT.test(String(id || ''))
}

/**
 * A layout as an instance root. Layouts aren't placements, so the root is authorized against the
 * EFFECTIVE layout of the request: the matched page's layout override, else the portal's default
 * layout (no page, or a path no page matches). A page the user can't open, or any other layout
 * (another page's override, an inactive or unknown one), is the same 404 as a missing placement.
 * The synthetic placement carries the effective layout options (layout defaults → portal
 * settings.layoutOptions → the page's own), exactly what the host renders the layout with.
 */
function layoutRootOf(prep: PreparedPortal, rootId: string): { placement: PlacementRef; page: ManifestPage | null } {
    const m = LAYOUT_ROOT.exec(rootId)
    if (!m) throw notFound(NOT_FOUND)
    const page = prep.match ? prep.match.page : null
    if (page && !canAccessManifestPage(prep.manifest.portal.id, page)) throw notFound(NOT_FOUND)
    const effective = (page && page.layoutId) || prep.manifest.defaultLayoutId
    const ref = effective ? prep.manifest.layouts[effective] : null
    if (!ref || effective !== m[1] || ref.kind !== 'layout') throw notFound(NOT_FOUND)
    return {
        placement: {
            id: rootId,
            region: 'layout',
            order: 0,
            parentId: null,
            component: ref,
            options: effectiveLayoutOptions(prep.manifest, effective, page),
            styleTokens: {},
            layout: {},
            classes: '',
            css: '',
        },
        page,
    }
}

function rootOf(prep: PreparedPortal, placementId: string): { placement: PlacementRef; page: ManifestPage | null } {
    if (isLayoutRoot(placementId)) return layoutRootOf(prep, placementId)
    const found = prep.index[placementId]
    if (!found) throw notFound(NOT_FOUND)
    // Embeds resolve through their root placement, so its page's roles and user criteria cover them.
    if (found.page && !canAccessManifestPage(prep.manifest.portal.id, found.page)) throw notFound(NOT_FOUND)
    return found
}

function usableBuildOf(ref: { build: { id: string } | null } | null): any {
    if (!ref || !ref.build) throw rpError(409, 'no_build', 'Component has no usable build')
    const build = getById(T.build, ref.build.id)
    if (!build || !isUsableBuild(build)) throw rpError(409, 'no_build', 'Component build is not available')
    return build
}

/** The last segment of a unique id: 'app/server-clock' → 'server-clock'. */
function defaultKey(uniqueId: string): string {
    const last = String(uniqueId || '').split('/').pop() || 'embed'
    const clean = last.replace(/[^A-Za-z0-9_-]/g, '-').substring(0, 64)
    return clean || 'embed'
}

/** 'components:app/x' → 'app/x'. */
function normalizeUid(id: unknown): string {
    return String(id === null || id === undefined ? '' : id)
        .trim()
        .replace(/^components:/, '')
        .toLowerCase()
}

/**
 * The import `uid` of the root placement's component tree that `importerId` imports DIRECTLY,
 * as a widget; null otherwise. Mirrors build_dep edges sealed in the manifest.
 */
function importEdge(root: PlacementRef, importerId: string, uid: string): ComponentImport | null {
    const list = root.component.imports || []
    for (const imp of list) {
        if (imp.uniqueId !== uid || imp.kind !== 'widget') continue
        if (Array.isArray(imp.importers) && imp.importers.indexOf(importerId) >= 0) return imp
    }
    return null
}

/** The execution log's placement reference: null for layout roots (the instance column names them). */
function logPlacementId(id: string): string | null {
    return isLayoutRoot(id) ? null : id
}

function embedNotImported(): any {
    // 404 like a missing placement, so a probe can't learn the structure.
    return rpError(404, 'embed_not_imported', NOT_FOUND)
}

/** Validate an embed request's shape (both endpoints). Returns the clean path/keys/options. */
function cleanEmbed(embed: EmbedRequest): { path: string[]; keys: string[] | null; options: Record<string, unknown>; token: string | null } {
    if (!embed || !Array.isArray(embed.path) || !embed.path.length) throw badRequest('embed.path must be a non-empty array of component ids')
    if (embed.path.length > MAX_EMBED_DEPTH) throw rpError(400, 'embed_too_deep', `Embeds nest at most ${MAX_EMBED_DEPTH} levels below a placement`)
    const path = embed.path.map(normalizeUid)
    if (path.some((p) => !p || p.length > 200)) throw badRequest('embed.path entries must be component ids')
    let keys: string[] | null = null
    if (Array.isArray(embed.keys)) {
        if (embed.keys.length !== path.length || embed.keys.some((k) => typeof k !== 'string' || !EMBED_KEY.test(k))) {
            throw badRequest('embed.keys must match embed.path and be [A-Za-z0-9_-]{1,64}')
        }
        keys = embed.keys.map(String)
    }
    const options = embed.options === undefined || embed.options === null ? {} : embed.options
    if (!isPlainObject(options)) throw rpError(400, 'embed_options_invalid', 'embed.options must be an object')
    if (JSON.stringify(options).length > MAX_EMBED_OPTIONS_BYTES) throw rpError(400, 'embed_options_invalid', `embed.options exceeds ${MAX_EMBED_OPTIONS_BYTES} bytes`)
    const token = typeof embed.token === 'string' && embed.token.length <= 200 ? embed.token : null
    return { path, keys, options, token }
}

/**
 * Resolve what to run: a placement (as before), or an embedded instance below a root placement,
 * authorized step by step (§5.1): every path entry must be a widget the previous component
 * imports directly, with a usable build.
 */
function resolveTarget(prep: PreparedPortal, placementId: string, embed?: EmbedRequest | null): Target {
    const found = rootOf(prep, placementId)
    const root = found.placement
    if (!embed) {
        if (root.component.serverMode === 'none') throw badRequest('This component has no server script')
        const build = usableBuildOf(root.component)
        return {
            instanceId: root.id,
            root,
            page: found.page,
            component: { id: root.component.id, uniqueId: root.component.uniqueId, name: root.component.name, serverMode: root.component.serverMode },
            build,
            options: { ...root.options },
            embed: null,
        }
    }
    const clean = cleanEmbed(embed)
    let prev = root.component.id
    const ids: string[] = []
    let leaf: ComponentImport | null = null
    let leafBuild: any = null
    for (const uid of clean.path) {
        const imp = importEdge(root, prev, uid)
        if (!imp || !imp.build) throw embedNotImported()
        const b = getById(T.build, imp.build.id)
        if (!b || !isUsableBuild(b)) throw embedNotImported()
        ids.push(imp.id)
        prev = imp.id
        leaf = imp
        leafBuild = b
    }
    if (!leaf) throw embedNotImported()
    if ((leaf.serverMode || 'none') === 'none') throw badRequest('This component has no server script')
    const keys = clean.keys || clean.path.map(defaultKey)
    const effective = effectiveEmbedOptions(leafBuild, clean.options, clean.token, root.id, clean.path)
    const instanceId = [root.id].concat(keys).join('~')
    return {
        instanceId,
        root,
        page: found.page,
        component: { id: leaf.id, uniqueId: leaf.uniqueId, name: leaf.name || leaf.uniqueId, serverMode: leaf.serverMode || 'none' },
        build: leafBuild,
        options: effective.options,
        embed: {
            root: root.id,
            path: clean.path,
            ids,
            keys,
            parentInstanceId: [root.id].concat(keys.slice(0, -1)).join('~'),
            key: keys[keys.length - 1],
            token: effective.trusted ? clean.token : null,
            dropped: effective.dropped,
        },
    }
}

/* ---------------- client context (URL params) ---------------- */

const PARAM_KEY = /^[A-Za-z0-9_.:-]{1,64}$/
const MAX_CONTEXT_BYTES = 16 * 1024

/**
 * The client's request context, validated: { params: { name: string | string[] }, recordId }.
 * params are the portal URL's table / sys_id / view / query and the q keys (explicit params
 * already win on the client). Strings only, ≤ 50 keys, ≤ 4000 chars a value, ≤ 16 KB in all;
 * anything else is dropped. Untrusted, like input.
 */
export function cleanClientContext(raw: unknown): { params: Record<string, string | string[]>; recordId: string } {
    const out: { params: Record<string, string | string[]>; recordId: string } = { params: {}, recordId: '' }
    if (!isPlainObject(raw)) return out
    try {
        if (JSON.stringify(raw).length > MAX_CONTEXT_BYTES) return out
    } catch (e) {
        return out
    }
    if (typeof raw.recordId === 'string' && raw.recordId.length <= 64) out.recordId = raw.recordId
    const params = isPlainObject(raw.params) ? raw.params : {}
    let n = 0
    for (const key of Object.keys(params)) {
        if (n >= 50 || !PARAM_KEY.test(key)) continue
        const v = params[key]
        if (typeof v === 'string' && v.length <= 4000) {
            out.params[key] = v
            n++
        } else if (Array.isArray(v)) {
            const list = (v as unknown[]).filter((x) => typeof x === 'string' && (x as string).length <= 4000).slice(0, 20) as string[]
            if (list.length) {
                out.params[key] = list
                n++
            }
        }
    }
    return out
}

/** URL params as single strings (first value of a repeated key), for $sp.getParameter(). */
function firstValues(params: Record<string, string | string[]>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const k of Object.keys(params)) {
        const v = params[k]
        out[k] = Array.isArray(v) ? v[0] || '' : v
    }
    return out
}

/* ---------------- running scripts ---------------- */

interface RunBudget {
    calls: number
}

interface RunOptions {
    action: ExecuteAction
    input: Record<string, unknown>
    client: Record<string, unknown>
    budget: RunBudget
    /** Shared message sink; nested runs ($sp.getWidget) add to the caller's. */
    messages: ServerMessage[]
    /** Nested runs leave the session queue to the outermost run (it drains once). */
    nested: boolean
}

interface RunResult {
    data: Record<string, unknown>
    options: Record<string, unknown>
    buildId: string
    durationMs: number
}

function runScript(prep: PreparedPortal, target: Target, run: RunOptions): RunResult {
    const started = Date.now()
    const options = { ...target.options }
    // Every action starts from empty data: the client's data is never sent back to the server.
    const data: Record<string, unknown> = {}
    const input = run.input
    const messages = run.messages
    const build = target.build
    const script = str(build, 'server_script')
    const embed = target.embed
    const client = cleanClientContext(run.client)
    if (script.trim()) {
        const sessionBefore = run.nested ? null : sessionMessages()
        const componentVar = {
            id: target.component.id,
            uniqueId: target.component.uniqueId,
            instanceId: target.instanceId,
            region: target.root.region,
            build: build.getUniqueValue(),
            embedded: !!embed,
            parentInstanceId: embed ? embed.parentInstanceId : null,
            key: embed ? embed.key : null,
            path: embed ? embed.path.slice() : [],
        }
        // Same pattern as the TurboForge Now Experience component API: hand the variables to the
        // evaluator, run the build's (raw) server script, read `data` back.
        const evaluator: any = new GlideScopedEvaluator()
        evaluator.putVariable('input', input)
        evaluator.putVariable('data', data)
        evaluator.putVariable('options', options)
        evaluator.putVariable('component', componentVar)
        evaluator.putVariable('context', {
            portal: prep.manifest.portal.slug,
            portalId: prep.manifest.portal.id,
            page: target.page ? target.page.route : null,
            params: prep.params,
            action: run.action,
            release: prep.release,
            user: { id: gs.getUserID(), name: gs.getUserName() },
            // The URL params (table, sys_id, view, query, q keys) and recordId, validated.
            client,
            query: client.params,
            embed: embed ? { root: embed.root, path: embed.path.slice(), keys: embed.keys.slice() } : null,
        })
        // $rp (and the Service Portal-compatible alias $sp): server helpers for component scripts.
        const api = createServerApi({
            input,
            options,
            params: prep.params,
            urlParams: firstValues(client.params),
            portal: { id: prep.manifest.portal.id, slug: prep.manifest.portal.slug, name: prep.manifest.portal.name, settings: prep.manifest.portal.settings },
            page: target.page ? { route: target.page.route, params: prep.params } : null,
            component: componentVar,
            manifest: prep.manifest,
            messages,
            getWidget: (id: unknown, opts?: unknown, settings?: unknown) => getWidget(prep, target, run, id, opts, settings),
        })
        evaluator.putVariable('$rp', api)
        evaluator.putVariable('$sp', api)
        evaluator.putVariable('__rpError', null)
        evaluator.evaluateScript(build, 'server_script', null)
        const caught = evaluator.getVariable('__rpError')
        // gs.addInfoMessage / addErrorMessage from the script reach the portal as toasts.
        if (sessionBefore) messages.push(...newSessionMessages(sessionBefore))
        if (caught) {
            const err = JSON.parse(JSON.stringify(caught)) as { message?: string; line?: number | null }
            const line = typeof err.line === 'number' && err.line > 1 ? err.line - 1 : null
            throw rpError(500, 'script_error', `Server script error${line ? ' (line ' + line + ')' : ''}: ${err.message || 'unknown error'}`, {
                component: target.component.uniqueId,
                instance: target.instanceId,
                line,
                messages,
            })
        }
        const out = evaluator.getVariable('data')
        // Normalize whatever the script left in `data` (native objects, Java strings) to plain JSON.
        const plain = out === null || out === undefined ? {} : JSON.parse(JSON.stringify(out))
        for (const k of Object.keys(data)) delete data[k]
        if (isPlainObject(plain)) for (const k of Object.keys(plain)) data[k] = plain[k]
    }
    return { data, options, buildId: build.getUniqueValue(), durationMs: Date.now() - started }
}

/**
 * $sp.getWidget(id, options?, settings?) for the script running as `caller`: runs a widget the
 * caller's build imports directly, synchronously, with server-chosen (trusted) options, and
 * returns its EmbedModel. Author errors (not an import, too deep, budget) throw, failing the
 * caller's script with a script_error naming the id; the child's own script errors don't throw
 * (ok: false), like Service Portal.
 */
function getWidget(prep: PreparedPortal, caller: Target, run: RunOptions, id: unknown, opts?: unknown, settings?: unknown): EmbedModel {
    const requested = normalizeUid(id)
    if (!requested) throw new Error('$sp.getWidget: a component id is required')
    const callerDepth = caller.embed ? caller.embed.path.length : 0
    if (callerDepth + 1 > MAX_EMBED_DEPTH) throw new Error(`$sp.getWidget('${requested}'): embed_too_deep (embeds nest at most ${MAX_EMBED_DEPTH} levels)`)
    if (run.budget.calls >= MAX_GETWIDGET_CALLS) throw new Error(`$sp.getWidget('${requested}'): embed_budget (at most ${MAX_GETWIDGET_CALLS} calls per request)`)
    run.budget.calls++

    // A bare key ('server-clock') is accepted when exactly one direct widget import ends with it.
    let uid = requested
    if (uid.indexOf('/') < 0) {
        const matches = (caller.root.component.imports || []).filter(
            (i) => i.kind === 'widget' && Array.isArray(i.importers) && i.importers.indexOf(caller.component.id) >= 0 && defaultKey(i.uniqueId) === uid,
        )
        if (matches.length === 1) uid = matches[0].uniqueId
    }
    const imp = importEdge(caller.root, caller.component.id, uid)
    if (!imp) throw new Error(`$sp.getWidget('${requested}'): not a widget that ${caller.component.uniqueId} imports (add: import X from 'components:${uid}')`)

    const set = isPlainObject(settings) ? settings : {}
    const key = typeof set.key === 'string' && EMBED_KEY.test(set.key) ? set.key : defaultKey(imp.uniqueId)
    const path = (caller.embed ? caller.embed.path : []).concat([imp.uniqueId])
    const keys = (caller.embed ? caller.embed.keys : []).concat([key])
    const ids = (caller.embed ? caller.embed.ids : []).concat([imp.id])
    const base: EmbedModel = { $embed: 1, component: imp.uniqueId, key, ok: false, options: {}, token: null, build: null }

    const b = imp.build ? getById(T.build, imp.build.id) : null
    if (!b || !isUsableBuild(b)) {
        return { ...base, error: { status: 409, code: 'no_build', message: `${imp.uniqueId} has no usable build` } }
    }
    const options = serverEmbedOptions(b, isPlainObject(opts) ? JSON.parse(JSON.stringify(opts)) : {})
    const token = signEmbed(caller.root.id, path, options)
    const child: Target = {
        instanceId: [caller.root.id].concat(keys).join('~'),
        root: caller.root,
        page: caller.page,
        component: { id: imp.id, uniqueId: imp.uniqueId, name: imp.name || imp.uniqueId, serverMode: imp.serverMode || 'none' },
        build: b,
        options,
        embed: { root: caller.root.id, path, ids, keys, parentInstanceId: caller.instanceId, key, token, dropped: [] },
    }
    const model: EmbedModel = { ...base, options, token, build: b.getUniqueValue() }
    if ((imp.serverMode || 'none') === 'none') return { ...model, ok: true, data: {} }
    try {
        const r = runScript(prep, child, { ...run, action: 'initialize', input: {}, nested: true })
        return { ...model, ok: true, data: r.data, options: r.options }
    } catch (e) {
        const status = isRPError(e) ? e.status : 500
        const code = isRPError(e) ? e.code : 'script_error'
        return { ...model, ok: false, error: { status, code, message: viewerMessage(e) } }
    }
}

function runOne(prep: PreparedPortal, p: ExecuteParams, budget: RunBudget): ExecuteResult & { target: Target } {
    const target = resolveTarget(prep, p.placementId, p.embed || null)
    const messages: ServerMessage[] = []
    const r = runScript(prep, target, {
        action: p.action,
        input: isPlainObject(p.input) ? p.input : {},
        client: isPlainObject(p.context) ? p.context : {},
        budget,
        messages,
        nested: false,
    })
    return {
        data: r.data,
        options: r.options,
        buildId: r.buildId,
        release: prep.release,
        durationMs: r.durationMs,
        messages,
        target,
        embed: target.embed ? { id: target.instanceId, token: target.embed.token, dropped: target.embed.dropped.length ? target.embed.dropped : undefined } : undefined,
    }
}

/** Execute one instance (execute endpoint). Throws RPError on failure. */
export function execute(p: ExecuteParams): ExecuteResult {
    const cid = p.correlationId || newCorrelationId()
    const started = Date.now()
    let prep: PreparedPortal | null = null
    try {
        prep = preparePortal(p.portal, p.page)
        const result = runOne(prep, p, { calls: 0 })
        const target = result.target
        logExecution({
            correlationId: cid,
            action: p.action,
            outcome: 'success',
            durationMs: result.durationMs,
            releaseId: prep.release ? prep.release.id : null,
            buildId: result.buildId,
            placementId: logPlacementId(p.placementId),
            componentId: target.component.id,
            instanceId: target.instanceId,
            portalId: prep.manifest.portal.id,
        })
        delete (result as any).target
        return result
    } catch (e) {
        const status = isRPError(e) ? e.status : 500
        logExecution({
            correlationId: cid,
            action: p.action,
            outcome: status === 403 || status === 401 || (isRPError(e) && e.code === 'embed_not_imported') ? 'denied' : 'error',
            durationMs: Date.now() - started,
            releaseId: prep && prep.release ? prep.release.id : null,
            placementId: logPlacementId(p.placementId),
            instanceId: p.embed && Array.isArray(p.embed.keys) ? [p.placementId].concat(p.embed.keys.map(String)).join('~').substring(0, 255) : null,
            portalId: prep ? prep.manifest.portal.id : null,
            error: sanitizeError(e),
        })
        if (isRPError(e) && e.code === 'embed_not_imported') throw notFound(NOT_FOUND)
        if (isRPError(e)) throw forViewer(e)
        throw rpError(500, 'script_error', viewerMessage(e))
    }
}

/** A validated initialize entry: a placement id or an embed descriptor. */
export type InitializeEntry = string | EmbedDescriptor

/** Batch-initialize instances; each instance succeeds or fails independently. */
export function initialize(params: {
    portal: string
    page?: string
    instances: InitializeEntry[]
    context?: Record<string, unknown>
    correlationId?: string
}): { instances: Record<string, InstanceResult>; release: { id: string; version: number } | null } {
    const cid = params.correlationId || newCorrelationId()
    const prep = preparePortal(params.portal, params.page)
    const out: Record<string, InstanceResult> = {}
    const entries = (params.instances || []).slice(0, 100)
    let descriptors = 0
    for (const entry of entries) {
        const started = Date.now()
        const isEmbed = typeof entry !== 'string'
        const resultKey = isEmbed ? String((entry as EmbedDescriptor).id) : String(entry)
        const placementId = isEmbed ? String((entry as EmbedDescriptor).placement) : String(entry)
        try {
            if (isEmbed && ++descriptors > MAX_EMBED_DESCRIPTORS) throw rpError(400, 'embed_budget', `At most ${MAX_EMBED_DESCRIPTORS} embedded instances per initialize`)
            const d = entry as EmbedDescriptor
            const r = runOne(
                prep,
                {
                    portal: params.portal,
                    page: params.page,
                    placementId,
                    action: 'initialize',
                    context: params.context,
                    embed: isEmbed ? { path: d.path, keys: d.keys, options: d.options, token: d.token } : undefined,
                },
                { calls: 0 },
            )
            out[resultKey] = {
                ok: true,
                data: r.data,
                options: r.options,
                build: r.buildId,
                messages: r.messages.length ? r.messages : undefined,
                ...(r.embed ? { token: r.embed.token } : {}),
            }
            logExecution({
                correlationId: cid,
                action: 'initialize',
                outcome: 'success',
                durationMs: r.durationMs,
                releaseId: prep.release ? prep.release.id : null,
                buildId: r.buildId,
                placementId: logPlacementId(placementId),
                componentId: r.target.component.id,
                instanceId: r.target.instanceId,
                portalId: prep.manifest.portal.id,
            })
        } catch (e) {
            const status = isRPError(e) ? e.status : 500
            const code = isRPError(e) ? e.code : 'script_error'
            const failMessages = isRPError(e) && e.details && Array.isArray((e.details as any).messages) ? (e.details as any).messages : undefined
            out[resultKey] = {
                ok: false,
                error: { status, code: code === 'embed_not_imported' ? 'not_found' : code, message: viewerMessage(e) },
                messages: failMessages && failMessages.length ? failMessages : undefined,
            }
            logExecution({
                correlationId: cid,
                action: 'initialize',
                outcome: code === 'embed_not_imported' ? 'denied' : 'error',
                durationMs: Date.now() - started,
                releaseId: prep.release ? prep.release.id : null,
                placementId: logPlacementId(placementId),
                instanceId: isEmbed || isLayoutRoot(placementId) ? resultKey.substring(0, 255) : null,
                portalId: prep.manifest.portal.id,
                error: sanitizeError(e),
            })
        }
    }
    return { instances: out, release: prep.release }
}
