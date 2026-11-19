import { each, str, int, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { requireStudio } from '../security/access.ts'
import { buildSummary } from '../build/build-service.ts'
import { buildOf } from './registry.ts'
import { releaseOf, releaseSummary } from '../release/release-service.ts'

/** Studio listings (metadata only, never source). */

export function listComponents(): unknown[] {
    requireStudio('any')
    const out: unknown[] = []
    each(
        T.component,
        '',
        (c) => {
            const latest = buildOf('component', c.getUniqueValue())
            out.push({
                id: c.getUniqueValue(),
                uniqueId: str(c, 'unique_id'),
                name: str(c, 'name'),
                kind: str(c, 'kind'),
                placeable: bool(c, 'placeable'),
                active: bool(c, 'active'),
                serverMode: str(c, 'server_mode'),
                revision: int(c, 'source_revision'),
                build: latest ? buildSummary(latest) : null,
            })
        },
        ['kind', 'unique_id'],
    )
    return out
}

export function listThemes(): unknown[] {
    requireStudio('any')
    const out: unknown[] = []
    each(
        T.theme,
        '',
        (t) => {
            const latest = buildOf('theme', t.getUniqueValue())
            out.push({
                id: t.getUniqueValue(),
                key: str(t, 'key'),
                name: str(t, 'name'),
                active: bool(t, 'active'),
                revision: int(t, 'source_revision'),
                build: latest ? buildSummary(latest) : null,
            })
        },
        'key',
    )
    return out
}

export function listPortals(): unknown[] {
    requireStudio('any')
    const out: unknown[] = []
    each(
        T.portal,
        '',
        (p) => {
            out.push({
                id: p.getUniqueValue(),
                slug: str(p, 'slug'),
                name: str(p, 'name'),
                active: bool(p, 'active'),
                isDefault: bool(p, 'is_default'),
                theme: str(p, 'theme') || null,
                defaultLayout: str(p, 'default_layout') || null,
                release: (() => {
                    const r = releaseOf(p.getUniqueValue())
                    return r ? releaseSummary(r) : null
                })(),
            })
        },
        'slug',
    )
    return out
}
