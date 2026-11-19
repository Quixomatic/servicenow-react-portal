import { GR, newGR, getById, findOne, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, conflict, notFound } from '../lib/errors.ts'
import { canonicalJson, sha256, byteLength, nowValue, parseJson, prop, propInt } from '../lib/util.ts'
import { isValidAssetPath, mimeFor } from '../lib/paths.ts'
import { requireStudio } from '../security/access.ts'
import { Owner, ownerRecordOf, ownerOfRecord, loadOwner } from '../source/owner.ts'
import { compilerInputs } from '../source/project-files.ts'
import { compileComponent, COMPILER_VERSION } from '../compiler/compiler.ts'
import { replaceDependencies, flagDependents } from './dependency-service.ts'
import { componentRef, themeRef, buildRef, buildOf } from '../registry/registry.ts'
import { reprocessForOwner } from '../release/release-service.ts'
import type { BuildSummary, CompleteBuildRequest, BuildState, BuildAssetDto } from '../../shared/contracts'

/**
 * RPBuildService: one build record per component/theme.
 *
 * Save → requestCompile(): records the revision that needs compiling (pending_revision)
 *        unless the compiled output already matches the sources (same input hash).
 * The browser compiler compiles that revision → completeBuild(): if the revision is still
 *        current, the build's assets, dependencies and server script are replaced together;
 *        a stale revision is rejected (409); a failed compile keeps the last good output.
 * After a successful compile, every portal using the owner is reprocessed.
 */

const ASSET_KINDS = ['js', 'css', 'map', 'wasm', 'other']
const SERVER_SCRIPT_FORMAT = 4

export function runtimeAbiVersion(): string {
    return prop('runtime_abi_version', '1')
}

export function buildSummary(build: GR, extra?: Partial<BuildSummary>): BuildSummary {
    return {
        id: build.getUniqueValue(),
        state: (str(build, 'state') || 'pending') as BuildState,
        builtRevision: int(build, 'built_revision'),
        pendingRevision: int(build, 'pending_revision'),
        inputHash: str(build, 'input_hash'),
        needsRebuild: bool(build, 'needs_rebuild') || undefined,
        diagnostics: parseJson<unknown>(str(build, 'diagnostics_json'), null),
        ...(extra || {}),
    }
}

interface Snapshot {
    files: { path: string; target: string; hash: string; revision: number }[]
    script: string
    clientScriptHash: string
    cssHash: string
    tailwind: boolean
    exports: string
    optionsSchema: string
    defaultOptions: string
    dependencySpec: string
    tokens: string
    stylesheetHash: string
    runtimeAbi: string
    /** Bump when compileServerScript's output format changes, so builds recompile. */
    serverFormat: number
    /** Compiler identity: a compiler upgrade invalidates every component build. */
    compiler: string
}

function snapshotOf(owner: Owner): Snapshot {
    const files: Snapshot['files'] = []
    each(
        T.sourceFile,
        `owner_key=${owner.key}`,
        (f) => files.push({ path: str(f, 'path'), target: str(f, 'target'), hash: str(f, 'content_hash'), revision: int(f, 'revision') }),
        'path',
    )
    const g = owner.gr
    const c = owner.type === 'component'
    return {
        files,
        script: c ? str(g, 'script') : '',
        clientScriptHash: c ? sha256(str(g, 'client_script')) : '',
        cssHash: c ? sha256(str(g, 'css')) : '',
        tailwind: c ? bool(g, 'tailwind') : false,
        exports: c ? str(g, 'exports_json') : '',
        optionsSchema: c ? str(g, 'options_schema_json') : '',
        defaultOptions: c ? str(g, 'default_options_json') : '',
        dependencySpec: c ? str(g, 'dependency_spec_json') : '',
        tokens: c ? '' : str(g, 'tokens_json'),
        stylesheetHash: c ? '' : sha256(str(g, 'stylesheet')),
        runtimeAbi: runtimeAbiVersion(),
        serverFormat: SERVER_SCRIPT_FORMAT,
        compiler: c ? COMPILER_VERSION : '',
    }
}

function inputHashOf(s: Snapshot): string {
    return sha256(canonicalJson({ ...s, files: s.files.map((f) => ({ path: f.path, target: f.target, hash: f.hash })) }))
}

/** The owner's build record, created (pending) if it doesn't exist yet. */
export function ensureBuild(owner: Owner): GR {
    const existing = buildOf(owner.type, owner.id)
    if (existing) return existing
    const b = newGR(T.build)
    b.initialize()
    b.setValue(owner.type, owner.id)
    b.setValue('state', 'pending')
    b.setValue('built_revision', 0)
    b.setValue('pending_revision', 0)
    b.insert()
    return b
}

/**
 * Record that the owner's current revision needs compiling. When the compiled output
 * already matches the sources (same input hash, same ABI) nothing is pending.
 */
export function requestCompile(owner: Owner): { gr: GR; upToDate: boolean; runtimeAbiVersion: string } {
    const snap = snapshotOf(owner)
    const hash = inputHashOf(snap)
    const b = ensureBuild(owner)
    const revision = int(owner.gr, 'source_revision')

    if (str(b, 'state') === 'ready' && str(b, 'input_hash') === hash && str(b, 'runtime_abi_version') === snap.runtimeAbi) {
        if (int(b, 'pending_revision') !== 0 || int(b, 'built_revision') !== revision) {
            b.setValue('pending_revision', 0)
            b.setValue('built_revision', revision)
            b.update()
        }
        return { gr: b, upToDate: true, runtimeAbiVersion: snap.runtimeAbi }
    }
    b.setValue('pending_revision', revision)
    b.setValue('requested_at', nowValue())
    b.update()
    return { gr: b, upToDate: false, runtimeAbiVersion: snap.runtimeAbi }
}

/** Accept compiled outputs from the browser compiler for a specific revision. */
/** Accept compiled outputs from a browser compiler (Studio) for a specific revision. */
export function completeBuild(buildId: string, req: CompleteBuildRequest): BuildSummary {
    const build = getById(T.build, buildId)
    if (!build) throw notFound('Build not found')
    const o = ownerOfRecord(build)
    requireStudio(o && o.type === 'theme' ? 'design' : 'author')
    const owner = ownerRecordOf(build)
    if (!owner) throw conflict('Build has no owner')
    if (!req || typeof req.success !== 'boolean') throw badRequest('success is required')
    if (typeof req.revision !== 'number') throw badRequest('revision is required (the pendingRevision you compiled)')
    if (req.runtimeAbiVersion && req.runtimeAbiVersion !== runtimeAbiVersion()) {
        throw conflict(`Runtime ABI mismatch: host expects ${runtimeAbiVersion()}, compiler produced ${req.runtimeAbiVersion}`)
    }
    if (req.success) validateAssets(Array.isArray(req.assets) ? req.assets : [], owner.type)
    return applyCompileResult(owner, build, req)
}

/**
 * Write a compile result into the owner's single build record. Shared by the server compiler
 * (compileOwner) and browser compilers (completeBuild).
 * - stale revision: 409, never overwrite newer output with older;
 * - failure: diagnostics + last_error, the last good output keeps serving;
 * - success: assets, dependencies and server script replaced together, portals reprocessed.
 */
export function applyCompileResult(owner: Owner, build: GR, req: CompleteBuildRequest): BuildSummary {
    const buildId = build.getUniqueValue()
    const current = int(owner.gr, 'source_revision')
    if (req.revision !== current) {
        throw conflict('Sources changed since this compile started; compile the latest revision', {
            compiledRevision: req.revision,
            currentRevision: current,
        })
    }

    const diagnostics = req.diagnostics === undefined ? null : req.diagnostics
    build.setValue('diagnostics_json', diagnostics === null ? '' : JSON.stringify(diagnostics))
    build.setValue('completed_at', nowValue())
    build.setValue('compiler_version', String(req.compilerVersion || ''))

    if (!req.success) {
        // Keep the last good output; only a never-compiled build becomes "failed".
        build.setValue('last_error', summarizeDiagnostics(diagnostics))
        build.setValue('pending_revision', 0)
        if (int(build, 'built_revision') === 0) build.setValue('state', 'failed')
        build.update()
        return buildSummary(build)
    }

    const assets = Array.isArray(req.assets) ? req.assets : []
    const keep: Record<string, boolean> = {}
    for (const a of assets) {
        keep[a.path] = true
        const existing = findOne(T.buildAsset, `build=${buildId}^path=${a.path}`)
        const ag = existing || newGR(T.buildAsset)
        if (!existing) {
            ag.initialize()
            ag.setValue('build', buildId)
            ag.setValue('path', a.path)
        }
        const hash = sha256(a.content)
        if (existing && str(existing, 'hash') === hash && str(existing, 'kind') === a.kind) continue
        ag.setValue('kind', a.kind)
        ag.setValue('mime_type', a.mimeType || mimeFor(a.path))
        ag.setValue('content', a.content)
        ag.setValue('hash', hash)
        ag.setValue('byte_length', byteLength(a.content))
        if (existing) ag.update()
        else ag.insert()
    }
    each(T.buildAsset, `build=${buildId}`, (ag) => {
        if (!keep[str(ag, 'path')]) ag.deleteRecord()
    })
    replaceDependencies(buildId, Array.isArray(req.dependencies) ? req.dependencies : [])

    const snap = snapshotOf(owner)
    build.setValue('state', 'ready')
    build.setValue('built_revision', current)
    build.setValue('pending_revision', 0)
    build.setValue('needs_rebuild', false)
    build.setValue('last_error', '')
    build.setValue('input_hash', inputHashOf(snap))
    build.setValue('runtime_abi_version', snap.runtimeAbi)
    build.setValue('server_script', compileServerScript(snap.script))
    build.setValue('options_snapshot', JSON.stringify({ schema: parseJson(snap.optionsSchema, null), defaults: parseJson(snap.defaultOptions, {}) }))
    build.setValue('exports_snapshot', snap.exports || '')
    build.setValue('source_snapshot_json', JSON.stringify(snap.files))
    build.update()

    flagDependents(owner.type, owner.id)
    reprocessForOwner(owner.type, owner.id)
    return buildSummary(build)
}

/**
 * Compile an owner's current sources on the server and write the build. Resolves with the
 * build summary (compile errors land in diagnostics, not a rejection). On the instance the
 * Promise settles before the calling script (business rule, REST handler, background
 * script) finishes.
 */
export function compileOwner(owner: Owner, force = false): Promise<BuildSummary> {
    const requested = requestCompile(owner)
    if (requested.upToDate && !force) return Promise.resolve(buildSummary(requested.gr, { upToDate: true }))
    const revision = int(owner.gr, 'source_revision')
    const build = requested.gr

    if (owner.type === 'theme') {
        // Themes: the stylesheet is served as written (tokens travel in the manifest).
        const css = str(owner.gr, 'stylesheet') || '/* empty theme stylesheet */'
        return Promise.resolve(
            applyCompileResult(owner, build, {
                revision,
                success: true,
                compilerVersion: 'rp-server-compiler/1 (theme passthrough)',
                assets: [{ path: 'theme.css', kind: 'css', content: css }],
            }),
        )
    }

    const label = str(owner.gr, 'unique_id') || owner.id
    return compileComponent({
        files: compilerInputs(owner).map((f) => ({ path: f.path, content: f.content, target: f.target })),
        tailwind: bool(owner.gr, 'tailwind'),
        label,
    }).then((result) => {
        const assets: BuildAssetDto[] = []
        if (result.ok) {
            assets.push({ path: 'index.js', kind: 'js', content: result.js, mimeType: 'text/javascript' })
            if (result.css.trim()) assets.push({ path: 'index.css', kind: 'css', content: result.css, mimeType: 'text/css' })
        }
        // Reload: a concurrent save may have advanced the revision while compiling.
        const fresh = loadOwner(owner.type, owner.id)
        if (int(fresh.gr, 'source_revision') !== revision) return buildSummary(build, { pendingRevision: int(fresh.gr, 'source_revision') })
        return applyCompileResult(fresh, getById(T.build, build.getUniqueValue()), {
            revision,
            success: result.ok,
            compilerVersion: result.compilerVersion,
            assets,
            dependencies: result.dependencies.map((d) => ({
                specifier: d.specifier,
                kind: d.kind,
                hostExport: d.hostExport,
                resolvedEntry: d.resolvedEntry,
            })),
            diagnostics: { ...result.diagnostics, ms: result.ms },
        })
    })
}

/**
 * The build's server script is the component's script as written: the executor hands it
 * input, data, options, component and context through GlideScopedEvaluator.putVariable and
 * reads `data` back (the TurboForge component API pattern). Kept as a function so a future
 * server-side transform (e.g. TypeScript) has one place to live.
 */
export function compileServerScript(script: string): string {
    if (!script || !script.trim()) return ''
    // GlideScopedEvaluator swallows script errors (the script just stops), so the compiled form
    // catches them into __rpError, which the executor reads back and reports. The author's code is
    // kept on its own lines, starting on line 2 (the executor subtracts 1 from reported lines).
    return ['try {', script, '} catch (__rpCaught) { __rpError = { message: String(__rpCaught && __rpCaught.message || __rpCaught), line: __rpCaught && __rpCaught.lineNumber || null } }'].join('\n')
}

function summarizeDiagnostics(d: unknown): string {
    if (!d) return 'Compile failed'
    try {
        const errors = (d as { errors?: { message?: string }[] }).errors
        if (Array.isArray(errors) && errors.length) return errors.map((e) => e.message || String(e)).join('\n').substring(0, 3900)
        return JSON.stringify(d).substring(0, 3900)
    } catch (e) {
        return 'Compile failed'
    }
}

function validateAssets(assets: CompleteBuildRequest['assets'], ownerType: string): void {
    const list = assets || []
    if (!list.length) throw badRequest('A successful build needs at least one asset')
    const maxBytes = propInt('build.max_bytes', 5 * 1024 * 1024)
    let total = 0
    const seen: Record<string, boolean> = {}
    let hasJs = false
    let hasCss = false
    for (const a of list) {
        if (!a || !isValidAssetPath(a.path)) throw badRequest(`Invalid asset path "${a && a.path}"`)
        if (seen[a.path]) throw badRequest(`Duplicate asset path "${a.path}"`)
        seen[a.path] = true
        if (ASSET_KINDS.indexOf(a.kind) < 0) throw badRequest(`Invalid asset kind for "${a.path}"`)
        if (typeof a.content !== 'string') throw badRequest(`Asset "${a.path}" needs string content`)
        total += byteLength(a.content)
        if (a.kind === 'js') hasJs = true
        if (a.kind === 'css') hasCss = true
    }
    if (total > maxBytes) throw badRequest(`Build output is ${total} bytes (max ${maxBytes})`)
    if (ownerType === 'component' && !hasJs) throw badRequest('A component build needs a JS asset')
    if (ownerType === 'theme' && !hasCss) throw badRequest('A theme build needs a CSS asset')
}

/** Author preview context: descriptors as the runtime sees them for this build. */
export function previewContext(buildId: string): Record<string, unknown> {
    requireStudio('any')
    const build = getById(T.build, buildId)
    if (!build) throw notFound('Build not found')
    const owner = ownerRecordOf(build)
    if (!owner) throw conflict('Build has no owner')
    return {
        build: { ...buildSummary(build), assets: buildRef(build) },
        owner: { type: owner.type, id: owner.id, revision: int(owner.gr, 'source_revision') },
        component: owner.type === 'component' ? componentRef(owner.gr, build) : null,
        theme: owner.type === 'theme' ? themeRef(owner.gr, build) : null,
        options: parseJson<Record<string, unknown>>(str(build, 'options_snapshot'), {}),
    }
}
