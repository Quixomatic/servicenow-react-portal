import { newGR, findOne, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, conflict } from '../lib/errors.ts'
import { parseJson, isPlainObject, propInt, sha256 } from '../lib/util.ts'
import { normalizeSourcePath, inferTarget, mimeFor } from '../lib/paths.ts'
import { normalizeRegions, buildOf } from '../registry/registry.ts'
import { requireStudio } from '../security/access.ts'
import { loadOwner, Owner, OwnerType } from './owner.ts'
import { gs } from '@servicenow/glide'
import { compileOwner, buildSummary, runtimeAbiVersion } from '../build/build-service.ts'
import { compileComponent, CompilerFile } from '../compiler/compiler.ts'
import { virtualMapFor, VirtualFile, RESERVED_VIRTUAL_PATHS, virtualFiles, listExtraFiles, compilerInputs } from './project-files.ts'
import type { ComponentMetaDto, ProjectData, SaveData, SaveRequest, SourceFileDto, SourceTarget, CheckData } from '../../shared/contracts'

/**
 * RPSourceService: component/theme projects, revision-checked saves.
 *
 * A component is one record with baseline fields, like a Service Portal widget:
 *   client_script → virtual main.tsx (the entry), css → virtual styles.css,
 *   script → virtual server.js (server only, never sent to the client compiler).
 * A theme's stylesheet is the virtual theme.css. Extra files (helpers, sub-components,
 * hooks, more CSS) are source_file rows imported with relative paths.
 *
 * Every save names the revision it was based on (expectedRevision); a mismatch is a 409.
 */

const TARGETS: SourceTarget[] = ['client', 'server', 'style', 'asset']

export function capabilityFor(type: OwnerType): 'author' | 'design' {
    return type === 'component' ? 'author' : 'design'
}

function componentMeta(gr: any): ComponentMetaDto {
    return {
        name: str(gr, 'name'),
        namespace: str(gr, 'namespace'),
        key: str(gr, 'key'),
        kind: (str(gr, 'kind') || 'widget') as ComponentMetaDto['kind'],
        description: str(gr, 'description'),
        placeable: bool(gr, 'placeable'),
        active: bool(gr, 'active'),
        tailwind: bool(gr, 'tailwind'),
        serverMode: (str(gr, 'server_mode') || 'none') as ComponentMetaDto['serverMode'],
        exports: parseJson<unknown>(str(gr, 'exports_json'), null),
        optionsSchema: parseJson<unknown>(str(gr, 'options_schema_json'), null),
        defaultOptions: parseJson<Record<string, unknown>>(str(gr, 'default_options_json'), {}),
        // Blocks keep their spec as written (templates like { repeat: 'tracks' }); layouts are normalized.
        regions: str(gr, 'kind') === 'block' ? (parseJson<unknown>(str(gr, 'regions_json'), []) as ComponentMetaDto['regions']) : normalizeRegions(parseJson<unknown>(str(gr, 'regions_json'), null)),
        dependencySpec: parseJson<unknown>(str(gr, 'dependency_spec_json'), null),
    }
}

export function getProject(type: OwnerType, id: string): ProjectData {
    requireStudio(capabilityFor(type))
    const owner = loadOwner(type, id)
    const build = buildOf(type, id)
    const meta =
        type === 'component'
            ? componentMeta(owner.gr)
            : {
                  name: str(owner.gr, 'name'),
                  key: str(owner.gr, 'key'),
                  description: str(owner.gr, 'description'),
                  active: bool(owner.gr, 'active'),
                  tokens: parseJson<Record<string, string>>(str(owner.gr, 'tokens_json'), {}),
              }
    return {
        owner: {
            type,
            id,
            uniqueId: type === 'component' ? str(owner.gr, 'unique_id') : str(owner.gr, 'key'),
            name: str(owner.gr, 'name'),
        },
        meta,
        revision: int(owner.gr, 'source_revision'),
        files: virtualFiles(owner).concat(listExtraFiles(owner, true)),
        latestBuild: build ? buildSummary(build) : null,
    }
}

function applyComponentMeta(gr: any, meta: ComponentMetaDto): void {
    const set = (field: string, v: unknown) => {
        if (v !== undefined) gr.setValue(field, v)
    }
    const setJson = (field: string, v: unknown) => {
        if (v !== undefined) gr.setValue(field, v === null ? '' : JSON.stringify(v))
    }
    set('name', meta.name)
    set('namespace', meta.namespace)
    set('key', meta.key)
    set('kind', meta.kind)
    set('description', meta.description)
    if (meta.placeable !== undefined) gr.setValue('placeable', !!meta.placeable)
    if (meta.active !== undefined) gr.setValue('active', !!meta.active)
    if (meta.tailwind !== undefined) gr.setValue('tailwind', !!meta.tailwind)
    set('client_script', meta.clientScript)
    set('css', meta.css)
    set('script', meta.script)
    set('server_mode', meta.serverMode)
    setJson('exports_json', meta.exports)
    setJson('options_schema_json', meta.optionsSchema)
    setJson('default_options_json', meta.defaultOptions)
    setJson('regions_json', meta.regions)
    setJson('dependency_spec_json', meta.dependencySpec)
}

function applyThemeMeta(gr: any, meta: SaveRequest['meta']): void {
    if (!meta) return
    if (meta.name !== undefined) gr.setValue('name', meta.name)
    if (meta.key !== undefined) gr.setValue('key', meta.key)
    if (meta.description !== undefined) gr.setValue('description', meta.description)
    if (meta.active !== undefined) gr.setValue('active', !!meta.active)
    if (meta.tokens !== undefined) gr.setValue('tokens_json', JSON.stringify(meta.tokens || {}))
    if (meta.stylesheet !== undefined) gr.setValue('stylesheet', meta.stylesheet)
}

/** Session flag that tells the compile-on-save business rules to stand down during a Studio save. */
export const SKIP_COMPILE_KEY = 'x_312987_portal.skip_compile'

function setSkipCompile(on: boolean): void {
    const session: any = gs.getSession()
    if (on) session.putClientData(SKIP_COMPILE_KEY, 'true')
    else session.putClientData(SKIP_COMPILE_KEY, '') // scoped GlideSession has no clearClientData
}

export function compileSuppressed(): boolean {
    const session: any = gs.getSession()
    return String(session.getClientData(SKIP_COMPILE_KEY) || '') === 'true'
}

/** Normalize a virtual file's incoming content into the stored field value ('' = field empty). */
function virtualFieldValue(path: string, v: VirtualFile, content: string, currentRaw: string): string | null {
    const trimmed = content.trim()
    // Saving the "empty" placeholder (e.g. "{}") back onto an empty field is a no-op.
    if (!currentRaw && (trimmed === '' || trimmed === v.empty.trim())) return null
    if (v.json) {
        if (trimmed === '') return ''
        try {
            JSON.parse(trimmed)
        } catch (e) {
            throw badRequest(`${path} is not valid JSON: ${String((e as Error).message || e)}`)
        }
        // Unchanged if semantically equal to what's stored.
        try {
            if (currentRaw && JSON.stringify(JSON.parse(currentRaw)) === JSON.stringify(JSON.parse(trimmed))) return null
        } catch (e) {
            /* stored value isn't valid JSON: overwrite it */
        }
        return trimmed
    }
    return content === currentRaw ? null : content
}

/**
 * Revision-checked save of fields + files, compiled once at the end. Resolves with the finished
 * compile result (Studio shows errors straight from the save response). The compile-on-save
 * business rules are suppressed for the batch so a multi-file save compiles once, not per file.
 */
export function save(type: OwnerType, id: string, req: SaveRequest): Promise<SaveData> {
    requireStudio(capabilityFor(type))
    let owner = loadOwner(type, id)
    if (!req || typeof req.expectedRevision !== 'number') throw badRequest('expectedRevision is required')
    const current = int(owner.gr, 'source_revision')
    if (req.expectedRevision !== current) {
        throw conflict('Source changed since it was loaded', { expectedRevision: req.expectedRevision, currentRevision: current })
    }

    const files = Array.isArray(req.files) ? req.files : []
    const maxFiles = propInt('max_files_per_owner', 200)
    if (files.length > maxFiles) throw badRequest(`Too many files (max ${maxFiles})`)

    // Validate everything before writing anything.
    const virtualMap = virtualMapFor(owner)
    const fieldUpdates: Record<string, string> = {}
    const seen: Record<string, boolean> = {}
    const ops: { path: string; dto: SourceFileDto }[] = []
    for (const f of files) {
        if (!f || typeof f.path !== 'string') throw badRequest('Each file needs a path')
        const path = normalizeSourcePath(f.path)
        if (!path) throw badRequest(`Invalid path "${f.path}"`)
        if (seen[path]) throw badRequest(`Duplicate path "${path}"`)
        seen[path] = true
        const virtual = virtualMap[path]
        if (virtual) {
            if (f.deleted) throw badRequest(`"${path}" is a baseline file and can't be deleted (save it empty instead)`)
            if (typeof f.content !== 'string') throw badRequest(`File "${path}" needs string content`)
            const value = virtualFieldValue(path, virtual, f.content, str(owner.gr, virtual.field))
            if (value !== null) fieldUpdates[virtual.field] = value
            continue
        }
        if (RESERVED_VIRTUAL_PATHS.indexOf(path.toLowerCase()) >= 0) throw badRequest(`"${path}" is reserved for a record field`)
        if (!f.deleted) {
            if (typeof f.content !== 'string') throw badRequest(`File "${path}" needs string content`)
            if (f.target && TARGETS.indexOf(f.target) < 0) throw badRequest(`File "${path}" has an invalid target`)
        }
        ops.push({ path, dto: f })
    }

    setSkipCompile(true)
    try {
        let ownerDirty = false
        if (req.meta && isPlainObject(req.meta)) {
            if (type === 'component') applyComponentMeta(owner.gr, req.meta)
            else applyThemeMeta(owner.gr, req.meta)
            ownerDirty = true
        }
        for (const field of Object.keys(fieldUpdates)) {
            owner.gr.setValue(field, fieldUpdates[field])
            ownerDirty = true
        }
        if (ownerDirty) owner.gr.update()

        for (const op of ops) {
            const existing = findOne(T.sourceFile, `owner_key=${owner.key}^path=${op.path}`)
            if (op.dto.deleted) {
                if (existing) existing.deleteRecord()
                continue
            }
            if (existing && str(existing, 'content_text') === op.dto.content && (!op.dto.target || str(existing, 'target') === op.dto.target)) {
                continue // unchanged
            }
            const gr = existing || newGR(T.sourceFile)
            if (!existing) {
                gr.initialize()
                gr.setValue(type, id)
                gr.setValue('path', op.path)
            }
            gr.setValue('target', op.dto.target || inferTarget(op.path))
            gr.setValue('content_text', op.dto.content)
            gr.setValue('encoding', op.dto.encoding || 'utf8')
            gr.setValue('mime_type', op.dto.mimeType || mimeFor(op.path))
            if (existing) gr.update()
            else gr.insert()
        }
    } finally {
        setSkipCompile(false)
    }

    owner = loadOwner(type, id) // pick up the revision advanced by business rules
    return compileOwner(owner).then((build) => {
        const fresh = loadOwner(type, id)
        return {
            revision: int(fresh.gr, 'source_revision'),
            build,
            files: virtualFiles(fresh).concat(listExtraFiles(fresh, true)),
            registry: { runtimeAbiVersion: runtimeAbiVersion() },
        }
    })
}

/**
 * Dry-run compile of unsaved editor buffers merged over the saved project. Nothing is written.
 * Drives Studio's live Problems panel.
 */
export function check(type: OwnerType, id: string, files: { path: string; content: string }[]): Promise<CheckData> {
    requireStudio(capabilityFor(type))
    const owner = loadOwner(type, id)
    const started = Date.now()
    if (type === 'theme') return Promise.resolve({ ok: true, diagnostics: { errors: [], warnings: [] }, ms: 0 })

    const merged: Record<string, CompilerFile> = {}
    for (const f of compilerInputs(owner)) merged[f.path] = { path: f.path, content: f.content, target: f.target as CompilerFile['target'] }
    const map = virtualMapFor(owner)
    const errors: CheckData['diagnostics']['errors'] = []
    for (const f of Array.isArray(files) ? files : []) {
        if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue
        const path = normalizeSourcePath(f.path)
        if (!path) continue
        const v = map[path]
        if (v && v.json) {
            // Metadata files aren't compiled, but a broken one would fail on save: check it here.
            if (f.content.trim()) {
                try {
                    JSON.parse(f.content)
                } catch (e) {
                    errors.push({ file: path, message: `Invalid JSON: ${String((e as Error).message || e)}` })
                }
            }
            continue
        }
        if (v && !v.compile) continue // server.js: not part of the client build
        const target = v ? v.target : inferTarget(path)
        if (target !== 'client' && target !== 'style') continue
        merged[path] = { path, content: f.content, target: target as CompilerFile['target'] }
    }
    return compileComponent({
        files: Object.keys(merged).map((k) => merged[k]),
        tailwind: bool(owner.gr, 'tailwind'),
        label: str(owner.gr, 'unique_id'),
    }).then((r) => {
        const all = errors.concat(r.diagnostics.errors)
        return { ok: all.length === 0, diagnostics: { errors: all, warnings: r.diagnostics.warnings }, ms: Date.now() - started }
    })
}

const STARTERS: Record<string, string> = {
    widget: [
        "import { Card, CardHeader, CardTitle, CardContent } from 'components:card'",
        '',
        'type Props = { options?: { title?: string } }',
        '',
        'export default function Widget({ options = {} }: Props) {',
        '    return (',
        '        <Card>',
        '            <CardHeader>',
        "                <CardTitle>{options.title || 'New widget'}</CardTitle>",
        '            </CardHeader>',
        '            <CardContent className="text-sm text-muted-foreground">Edit main.tsx to get started.</CardContent>',
        '        </Card>',
        '    )',
        '}',
        '',
    ].join('\n'),
    primitive: [
        '/** A primitive: a reusable building block that widgets import, e.g.',
        " *  import Thing from 'components:app/my-primitive'. Never placed on a page directly. */",
        'type Props = { label?: string; children?: React.ReactNode }',
        '',
        'export default function Primitive({ label, children }: Props) {',
        '    return (',
        '        <div className="flex flex-col gap-1.5">',
        '            {label ? <span className="text-sm font-medium">{label}</span> : null}',
        '            {children}',
        '        </div>',
        '    )',
        '}',
        '',
    ].join('\n'),
    block: [
        "import { Region, useBlock } from '@portal/runtime'",
        '',
        '/** A block: page structure with drop zones. regions.json declares the zones; rootProps carry the',
        " *  instance's styling, grid position and classes, so spread them on the root element. */",
        'export default function Block() {',
        '    const { rootProps, regions } = useBlock()',
        '    return (',
        '        <div {...rootProps} className={`flex flex-col gap-4 ${rootProps.className}`}>',
        '            {regions.map((r) => (',
        '                <Region key={r.name} name={r.name} />',
        '            ))}',
        '        </div>',
        '    )',
        '}',
        '',
    ].join('\n'),
    layout: [
        "import { Region } from '@portal/runtime'",
        '',
        'export default function Layout() {',
        '    return (',
        '        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-background text-foreground">',
        '            <header className="border-b"><Region name="header" /></header>',
        '            <main className="min-h-0 overflow-auto p-6"><Region name="main" /></main>',
        '            <footer className="border-t px-6 py-3 text-xs text-muted-foreground"><Region name="footer" /></footer>',
        '        </div>',
        '    )',
        '}',
        '',
    ].join('\n'),
    utility: ['// Shared helpers for other components.', 'export function hello(name: string): string {', '    return `Hello, ${name}`', '}', ''].join('\n'),
}

/** Create a component with a starter client script, compile it, and return its project. */
export function createComponent(req: { name?: string; kind?: string; namespace?: string; key?: string }): Promise<ProjectData> {
    requireStudio('author')
    const name = String((req && req.name) || '').trim()
    if (!name) throw badRequest('name is required')
    const kind = ['layout', 'utility', 'block', 'primitive'].indexOf(String(req.kind)) >= 0 ? String(req.kind) : 'widget'
    const gr = newGR(T.component)
    gr.initialize()
    gr.setValue('name', name)
    gr.setValue('kind', kind)
    if (req.namespace) gr.setValue('namespace', String(req.namespace))
    if (req.key) gr.setValue('key', String(req.key))
    gr.setValue('client_script', STARTERS[kind])
    gr.setValue('tailwind', true)
    gr.setValue('active', true)
    if (kind === 'block') gr.setValue('regions_json', JSON.stringify([{ name: 'content', label: 'Content' }]))
    if (kind === 'layout') gr.setValue('regions_json', JSON.stringify([{ name: 'header', acceptsContributions: true }, { name: 'main', acceptsContributions: false }, { name: 'footer', acceptsContributions: true }]))
    setSkipCompile(true)
    let id: string | null
    try {
        id = gr.insert()
    } finally {
        setSkipCompile(false)
    }
    if (!id) throw badRequest(`Could not create component: ${gs.getErrorMessages ? gs.getErrorMessages() : 'insert failed'}`)
    return compileOwner(loadOwner('component', id)).then(() => getProject('component', id as string))
}
