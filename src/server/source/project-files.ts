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

/** Virtual path → record field, per owner type. (Mirrors VIRTUAL_FILES in shared/contracts.) */
export const VIRTUAL: Record<OwnerType, Record<string, { field: string; target: SourceTarget }>> = {
    component: {
        'main.tsx': { field: 'client_script', target: 'client' },
        'styles.css': { field: 'css', target: 'style' },
        'server.js': { field: 'script', target: 'server' },
    },
    theme: {
        'theme.css': { field: 'stylesheet', target: 'style' },
    },
}

export function virtualFiles(owner: Owner): SourceFileDto[] {
    const out: SourceFileDto[] = []
    const map = VIRTUAL[owner.type]
    for (const path of Object.keys(map)) {
        const content = str(owner.gr, map[path].field)
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

/** Inputs for the browser compiler: client/style virtual files and extras, never server code. */
export function compilerInputs(owner: Owner): SourceFileDto[] {
    return virtualFiles(owner)
        .concat(listExtraFiles(owner, true))
        .filter((f) => f.target === 'client' || f.target === 'style' || f.target === 'asset')
}

