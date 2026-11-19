import { each, str, int } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { sha256 } from '../lib/util.ts'
import { mimeFor } from '../lib/paths.ts'
import type { Owner, OwnerType } from './owner.ts'
import type { SourceFileDto, SourceTarget } from '../../shared/contracts'

/**
 * A component/theme "project": virtual baseline files backed by record fields plus the extra
 * source_file rows. Shared by the source service (Studio) and the build service (compiler).
 */

export interface VirtualFile {
    field: string
    target: SourceTarget
    /** Shown in Studio when the field is empty; saving exactly this back is a no-op. */
    empty: string
    /** JSON-valued field (validated on save). */
    json?: boolean
    /** Fed to the client compiler (main.tsx, styles.css); metadata files are not. */
    compile?: boolean
    /** Only for components of these kinds. */
    kinds?: string[]
}

/**
 * Virtual path → record field, per owner type. Studio shows these as files; saving one writes the
 * field. They can't be deleted, and source_file can't use these paths. (Mirrors VIRTUAL_FILES in
 * shared/contracts.)
 */
export const VIRTUAL: Record<OwnerType, Record<string, VirtualFile>> = {
    component: {
        'main.tsx': { field: 'client_script', target: 'client', empty: '', compile: true },
        'styles.css': { field: 'css', target: 'style', empty: '', compile: true },
        'server.js': { field: 'script', target: 'server', empty: '' },
        'options.schema.json': { field: 'options_schema_json', target: 'asset', empty: '{}', json: true },
        'options.defaults.json': { field: 'default_options_json', target: 'asset', empty: '{}', json: true },
        'regions.json': { field: 'regions_json', target: 'asset', empty: '[]', json: true, kinds: ['layout'] },
    },
    theme: {
        'theme.css': { field: 'stylesheet', target: 'style', empty: '', compile: true },
        'tokens.json': { field: 'tokens_json', target: 'asset', empty: '{}', json: true },
    },
}

export const RESERVED_VIRTUAL_PATHS = ['main.tsx', 'styles.css', 'server.js', 'options.schema.json', 'options.defaults.json', 'regions.json', 'theme.css', 'tokens.json']

/** The virtual files that apply to this owner (regions.json only for layouts). */
export function virtualMapFor(owner: Owner): Record<string, VirtualFile> {
    const all = VIRTUAL[owner.type]
    const kind = owner.type === 'component' ? str(owner.gr, 'kind') || 'widget' : ''
    const out: Record<string, VirtualFile> = {}
    for (const path of Object.keys(all)) {
        const v = all[path]
        if (v.kinds && v.kinds.indexOf(kind) < 0) continue
        out[path] = v
    }
    return out
}

/** Pretty-print JSON-valued fields for editing; other fields as stored. */
function displayContent(v: VirtualFile, raw: string): string {
    if (!raw) return v.empty
    if (!v.json) return raw
    try {
        return JSON.stringify(JSON.parse(raw), null, 2)
    } catch (e) {
        return raw
    }
}

export function virtualFiles(owner: Owner): SourceFileDto[] {
    const out: SourceFileDto[] = []
    const map = virtualMapFor(owner)
    for (const path of Object.keys(map)) {
        const content = displayContent(map[path], str(owner.gr, map[path].field))
        out.push({ path, target: map[path].target, content, mimeType: mimeFor(path), hash: sha256(content), virtual: true })
    }
    return out
}

export function listExtraFiles(owner: Owner, withContent: boolean): SourceFileDto[] {
    const files: SourceFileDto[] = []
    each(
        T.sourceFile,
        `owner_key=${owner.key}`,
        (f) => {
            files.push({
                id: f.getUniqueValue(),
                path: str(f, 'path'),
                target: (str(f, 'target') || 'client') as SourceTarget,
                content: withContent ? str(f, 'content_text') : '',
                encoding: (str(f, 'encoding') || 'utf8') as 'utf8' | 'base64',
                mimeType: str(f, 'mime_type'),
                hash: str(f, 'content_hash'),
                revision: int(f, 'revision'),
            })
        },
        'path',
    )
    return files
}

/** Inputs for the client compiler: compiled virtual files (main.tsx, styles.css) and client/style extras. Never server code or metadata. */
export function compilerInputs(owner: Owner): SourceFileDto[] {
    const map = virtualMapFor(owner)
    return virtualFiles(owner)
        .filter((f) => map[f.path] && map[f.path].compile)
        .concat(listExtraFiles(owner, true).filter((f) => f.target === 'client' || f.target === 'style'))
}
