import { newGR, findOne, each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, conflict } from '../lib/errors.ts'
import { parseJson, isPlainObject, propInt, sha256 } from '../lib/util.ts'
import { normalizeSourcePath, inferTarget, mimeFor } from '../lib/paths.ts'
import { normalizeRegions, buildOf } from '../registry/registry.ts'
import { requireStudio } from '../security/access.ts'
import { loadOwner, Owner, OwnerType } from './owner.ts'
import { requestCompile, buildSummary } from '../build/build-service.ts'
import { VIRTUAL, virtualFiles, listExtraFiles, compilerInputs } from './project-files.ts'
import type { ComponentMetaDto, ProjectData, SaveData, SaveRequest, SourceFileDto, SourceTarget } from '../../shared/contracts'

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
        regions: normalizeRegions(parseJson<unknown>(str(gr, 'regions_json'), null)),
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

/** Revision-checked save of fields + files, then request a compile of the new revision. */
export function save(type: OwnerType, id: string, req: SaveRequest): SaveData {
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
    const virtualMap = VIRTUAL[type]
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
            fieldUpdates[virtual.field] = f.content
            continue
        }
        if (!f.deleted) {
            if (typeof f.content !== 'string') throw badRequest(`File "${path}" needs string content`)
            if (f.target && TARGETS.indexOf(f.target) < 0) throw badRequest(`File "${path}" has an invalid target`)
        }
        ops.push({ path, dto: f })
    }

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

    owner = loadOwner(type, id) // pick up the revision advanced by business rules
    const compile = requestCompile(owner)
    return {
        revision: int(owner.gr, 'source_revision'),
        build: buildSummary(compile.gr, { upToDate: compile.upToDate || undefined }),
        files: compilerInputs(owner),
        registry: { runtimeAbiVersion: compile.runtimeAbiVersion },
    }
}
