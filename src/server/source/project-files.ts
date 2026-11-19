import { gs } from '@servicenow/glide'
import { each, str, int } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { sha256, isPlainObject } from '../lib/util.ts'
import { mimeFor } from '../lib/paths.ts'
import type { Owner, OwnerType } from './owner.ts'
import type { SourceFileDto, SourceTarget } from '../../shared/contracts'

/**
 * A component/theme "project": virtual baseline files backed by record fields plus the extra
 * source_file rows. Shared by the source service (Studio) and the build service (compiler).
 */

/** What an empty server script opens as in Studio — Service Portal's IIFE shape. */
export const SERVER_SCRIPT_TEMPLATE = [
    '(function () {',
    "    /* populate the 'data' object */",
    "    /* e.g., data.title = $sp.getValue('title') */",
    '    /* available: input, data, options, $sp ($rp), context */',
    '})()',
    '',
].join('\n')

export interface VirtualFile {
    field: string
    target: SourceTarget
    /** Shown in Studio when the field is empty; saving exactly this back is a no-op. */
    empty: string
    /** JSON-valued field (validated on save). */
    json?: boolean
    /** Fed to the client compiler (main.tsx, styles.css); metadata files are not. */
    compile?: boolean
}

/** A virtual file as it applies to one owner: `unused` = not listed for the kind, shown only for its legacy content. */
export interface ActiveVirtualFile extends VirtualFile {
    unused?: boolean
}

/**
 * Virtual path → record field, per owner type. Studio shows these as files; saving one writes the
 * field. They can't be deleted, and source_file can't use these paths. (Mirrors VIRTUAL_FILES in
 * shared/contracts.) Which component files a kind gets is KIND_FILES_PROPERTY's job.
 */
export const VIRTUAL: Record<OwnerType, Record<string, VirtualFile>> = {
    component: {
        'main.tsx': { field: 'client_script', target: 'client', empty: '', compile: true },
        'styles.css': { field: 'css', target: 'style', empty: '', compile: true },
        'server.js': { field: 'script', target: 'server', empty: SERVER_SCRIPT_TEMPLATE },
        'options.schema.json': { field: 'options_schema_json', target: 'asset', empty: '{}', json: true },
        'options.defaults.json': { field: 'default_options_json', target: 'asset', empty: '{}', json: true },
        'regions.json': { field: 'regions_json', target: 'asset', empty: '[]', json: true },
    },
    theme: {
        'theme.css': { field: 'stylesheet', target: 'style', empty: '', compile: true },
        'tokens.json': { field: 'tokens_json', target: 'asset', empty: '{}', json: true },
    },
}

export const RESERVED_VIRTUAL_PATHS = ['main.tsx', 'styles.css', 'server.js', 'options.schema.json', 'options.defaults.json', 'regions.json', 'theme.css', 'tokens.json']

/* ---------------- baseline files per component kind ---------------- */

/**
 * System property: JSON object, component kind → array of baseline virtual file names. The single
 * switch for which baseline files a kind gets (e.g. adding "server.js" to "block" gives blocks a
 * server script). Read at request time; see kindFiles() for the fallback rules.
 */
export const KIND_FILES_PROPERTY = 'x_312987_portal.studio.kind_files'

/** Built-in default (and fallback) for KIND_FILES_PROPERTY. Keep in sync with its Fluent default value. */
export const DEFAULT_KIND_FILES: Record<string, string[]> = {
    widget: ['main.tsx', 'styles.css', 'server.js', 'options.schema.json', 'options.defaults.json'],
    layout: ['main.tsx', 'styles.css', 'server.js', 'regions.json', 'options.schema.json', 'options.defaults.json'],
    block: ['main.tsx', 'styles.css', 'regions.json', 'options.schema.json', 'options.defaults.json'],
    primitive: ['main.tsx', 'styles.css'],
    utility: ['main.tsx'],
}

/** main.tsx is the compiler entry: every component kind has it, whatever the property says. */
const ENTRY_FILE = 'main.tsx'

let warnedValue: string | null = null
function warnOnce(raw: string, message: string): void {
    if (warnedValue === raw) return
    warnedValue = raw
    gs.warn(`[React Portal] ${KIND_FILES_PROPERTY}: ${message}; using the built-in defaults`)
}

/** Canonical order of the component virtual files (main.tsx first). */
function inVirtualOrder(names: string[]): string[] {
    return Object.keys(VIRTUAL.component).filter((p) => names.indexOf(p) >= 0)
}

/**
 * Kind → listed baseline files, from KIND_FILES_PROPERTY over DEFAULT_KIND_FILES:
 * - missing, empty or invalid property (not JSON, not an object): the built-in default, with one
 *   warning per invalid value;
 * - a kind the property doesn't list (or lists with a non-array value): its built-in default;
 * - unknown file names are ignored; main.tsx is always included;
 * - "theme" is ignored (themes always have theme.css + tokens.json).
 */
export function kindFiles(): Record<string, string[]> {
    const out: Record<string, string[]> = {}
    for (const k of Object.keys(DEFAULT_KIND_FILES)) out[k] = DEFAULT_KIND_FILES[k].slice()
    let raw = ''
    try {
        raw = String(gs.getProperty(KIND_FILES_PROPERTY, '') || '').trim()
    } catch (e) {
        raw = ''
    }
    if (!raw) return out
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (e) {
        warnOnce(raw, `not valid JSON (${String((e as Error).message || e)})`)
        return out
    }
    if (!isPlainObject(parsed)) {
        warnOnce(raw, 'must be a JSON object of kind → file names')
        return out
    }
    for (const kind of Object.keys(parsed)) {
        const list = parsed[kind]
        if (kind === 'theme' || !Array.isArray(list)) continue
        const names = [ENTRY_FILE]
        list.forEach((n) => {
            if (typeof n === 'string' && VIRTUAL.component[n.trim()]) names.push(n.trim())
        })
        out[kind] = inVirtualOrder(names)
    }
    return out
}

/** The baseline files listed for a component kind (unknown kinds: the widget list). */
export function listedFilesFor(kind: string, map?: Record<string, string[]>): string[] {
    const m = map || kindFiles()
    return m[kind] || m.widget || DEFAULT_KIND_FILES.widget
}

export function componentKind(owner: Owner): string {
    return owner.type === 'component' ? str(owner.gr, 'kind') || 'widget' : ''
}

/** True when a virtual file's stored field holds real content (not empty, not its placeholder, not an empty JSON value). */
export function hasVirtualContent(v: VirtualFile, raw: string): boolean {
    const t = String(raw || '').trim()
    if (!t || t === v.empty.trim()) return false
    if (!v.json) return true
    try {
        const parsed = JSON.parse(t)
        if (parsed === null) return false
        if (Array.isArray(parsed)) return parsed.length > 0
        if (typeof parsed === 'object') return Object.keys(parsed).length > 0
        return true
    } catch (e) {
        return true // unparseable text is content: keep it visible so it can be fixed or cleared
    }
}

/**
 * The virtual files that apply to this owner: for a component, the files its kind lists plus
 * "legacy" ones (not listed, but the field still has content), flagged `unused`, so content is
 * never hidden; once emptied they drop out. Themes: always theme.css + tokens.json.
 * `kind` overrides the record's kind (a save that changes it).
 */
export function virtualMapFor(owner: Owner, kind?: string): Record<string, ActiveVirtualFile> {
    const all = VIRTUAL[owner.type]
    const out: Record<string, ActiveVirtualFile> = {}
    if (owner.type !== 'component') {
        for (const path of Object.keys(all)) out[path] = all[path]
        return out
    }
    const listed = listedFilesFor(kind || componentKind(owner))
    for (const path of Object.keys(all)) {
        const v = all[path]
        if (listed.indexOf(path) >= 0) out[path] = v
        else if (hasVirtualContent(v, str(owner.gr, v.field))) out[path] = { ...v, unused: true }
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
        const dto: SourceFileDto = { path, target: map[path].target, content, mimeType: mimeFor(path), hash: sha256(content), virtual: true }
        if (map[path].unused) dto.unused = true
        out.push(dto)
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

/**
 * Inputs for the client compiler: compiled virtual files that apply to the owner (main.tsx, plus
 * styles.css when the kind lists it or it still has legacy CSS) and client/style extras (every
 * kind). Never server code or metadata.
 */
export function compilerInputs(owner: Owner): SourceFileDto[] {
    const map = virtualMapFor(owner)
    return virtualFiles(owner)
        .filter((f) => map[f.path] && map[f.path].compile)
        .concat(listExtraFiles(owner, true).filter((f) => f.target === 'client' || f.target === 'style'))
}

/**
 * The server script a component's build compiles (and the executor then runs): the script field
 * only when server.js applies to the component (listed for its kind, or legacy content). A kind
 * without server.js and an empty field has nothing to run, exactly as before.
 */
export function serverScriptOf(owner: Owner): string {
    if (owner.type !== 'component') return ''
    return virtualMapFor(owner)['server.js'] ? str(owner.gr, 'script') : ''
}
