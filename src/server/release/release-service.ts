import { gs } from '@servicenow/glide'
import { GR, newGR, getById, findOne, each, str, int } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { notFound } from '../lib/errors.ts'
import { canonicalJson, sha256, nowValue, parseJson } from '../lib/util.ts'
import { requireStudio } from '../security/access.ts'
import { assembleManifest, Manifest, flattenRegions } from '../runtime/portal-service.ts'
import { buildOf } from '../registry/registry.ts'
import { reprocessSuppressed } from '../lib/session-flags.ts'
import type { ReleaseSummary, PlacementRef } from '../../shared/contracts'

/**
 * RPReleaseService: the compiled form of a portal.
 *
 * Exactly one release record per portal holds its manifest, plus one release_entry per
 * piece (theme, layouts, placements). It is reprocessed whenever the portal's inputs change
 * (business rules on portal/page/placement/theme/component, and every successful compile).
 * Nothing is written when the manifest is unchanged, so update sets only record real changes.
 * There is no release history: reverting an input (version history / update set) reprocesses.
 */

const HOST_ABI_PROP = 'runtime_abi_version'

export function releaseOf(portalId: string): GR | null {
    return findOne(T.release, `portal=${portalId}`)
}

export function releaseSummary(r: GR): ReleaseSummary {
    return {
        id: r.getUniqueValue(),
        portal: str(r, 'portal'),
        revision: int(r, 'revision'),
        manifestHash: str(r, 'manifest_hash'),
        processedAt: str(r, 'processed_at'),
        problems: parseJson<string[]>(str(r, 'problems_json'), []),
    }
}

function allPlacements(m: Manifest): PlacementRef[] {
    const out: PlacementRef[] = flattenRegions(m.regions)
    for (const p of m.pages) out.push(...flattenRegions(p.regions))
    return out
}

/** Components without compiled output (they render as placeholders until compiled). */
export function manifestProblems(m: Manifest): string[] {
    const problems: string[] = []
    if (!m.defaultLayoutId) problems.push('Portal has no default layout')
    for (const id of Object.keys(m.layouts)) {
        const l = m.layouts[id]
        if (!l.build) problems.push(`Layout "${l.uniqueId}" has not been compiled`)
    }
    const seen: Record<string, boolean> = {}
    for (const pl of allPlacements(m)) {
        if (!pl.component.build && !seen[pl.component.id]) {
            seen[pl.component.id] = true
            problems.push(`Component "${pl.component.uniqueId}" has not been compiled`)
        }
    }
    return problems
}

interface DesiredEntry {
    type: 'theme' | 'layout' | 'placement'
    fields: Record<string, string>
}

function desiredEntries(m: Manifest): Record<string, DesiredEntry> {
    const out: Record<string, DesiredEntry> = {}
    if (m.theme) {
        const b = buildOf('theme', m.theme.id)
        out[`theme:${m.theme.id}`] = { type: 'theme', fields: { theme: m.theme.id, build: b ? b.getUniqueValue() : '', server_mode: '' } }
    }
    for (const id of Object.keys(m.layouts)) {
        const l = m.layouts[id]
        out[`layout:${l.id}`] = { type: 'layout', fields: { component: l.id, build: l.build ? l.build.id : '', server_mode: l.serverMode } }
    }
    for (const pl of allPlacements(m)) {
        out[`placement:${pl.id}`] = {
            type: 'placement',
            fields: { placement: pl.id, component: pl.component.id, build: pl.component.build ? pl.component.build.id : '', server_mode: pl.component.serverMode },
        }
    }
    return out
}

function syncEntries(releaseId: string, desired: Record<string, DesiredEntry>): void {
    const existing: Record<string, GR> = {}
    each(T.releaseEntry, `release=${releaseId}`, (e) => {
        const key = str(e, 'stable_key')
        if (!desired[key] || existing[key]) e.deleteRecord()
        else existing[key] = getById(T.releaseEntry, e.getUniqueValue())
    })
    for (const key of Object.keys(desired)) {
        const want = desired[key]
        const e = existing[key] || newGR(T.releaseEntry)
        let dirty = !existing[key]
        if (!existing[key]) {
            e.initialize()
            e.setValue('release', releaseId)
            e.setValue('stable_key', key)
        }
        if (str(e, 'entry_type') !== want.type) {
            e.setValue('entry_type', want.type)
            dirty = true
        }
        for (const f of Object.keys(want.fields)) {
            if (str(e, f) !== want.fields[f]) {
                e.setValue(f, want.fields[f])
                dirty = true
            }
        }
        if (!dirty) continue
        if (existing[key]) e.update()
        else e.insert()
    }
}

/** Reprocess one portal's release. Writes only when the manifest changed. */
export function processPortal(portalId: string, force = false): ReleaseSummary | null {
    const portal = getById(T.portal, portalId)
    if (!portal) return null
    const manifest = assembleManifest(portal)
    const hash = sha256(canonicalJson(manifest))
    const problems = manifestProblems(manifest)

    let r = releaseOf(portalId)
    if (r && !force && str(r, 'manifest_hash') === hash) return releaseSummary(r)

    if (!r) {
        r = newGR(T.release)
        r.initialize()
        r.setValue('portal', portalId)
        r.setValue('revision', 0)
    }
    r.setValue('revision', int(r, 'revision') + 1)
    r.setValue('manifest_json', JSON.stringify(manifest))
    r.setValue('manifest_hash', hash)
    r.setValue('host_abi', gs.getProperty('x_312987_portal.' + HOST_ABI_PROP, '1'))
    r.setValue('problems_json', JSON.stringify(problems))
    r.setValue('processed_at', nowValue())
    r.setValue('processed_by', gs.getUserID())
    const releaseId = r.isNewRecord() ? r.insert() : (r.update(), r.getUniqueValue())
    if (releaseId) syncEntries(releaseId, desiredEntries(manifest))
    return releaseSummary(r)
}

/**
 * Reprocess every portal (force). Run once after a manifest version bump: until then each portal
 * serves a live-assembled manifest (correct, slower). new x_312987_portal.ReactPortal().reprocessAll()
 */
export function processAllPortals(): number {
    let n = 0
    each(T.portal, '', (p) => {
        if (processPortal(p.getUniqueValue(), true)) n++
    })
    return n
}

/** Reprocess every portal that uses a component (layout or placement) or a theme. */
export function reprocessForOwner(type: 'component' | 'theme', id: string): number {
    // A batch (designer write, demo seed) sets the skip flag and reprocesses each portal once at
    // its end, so a compile inside the batch must not rebuild every portal that uses the component.
    if (reprocessSuppressed()) return 0
    const portals: Record<string, boolean> = {}
    if (type === 'theme') {
        each(T.portal, `theme=${id}`, (p) => (portals[p.getUniqueValue()] = true))
    } else {
        // The component itself plus every component that imports it (transitively): a primitive's
        // new build URL must reach the manifests of the widgets that use it.
        const ids = [id].concat(importersOf(id))
        for (const cid of ids) {
            each(T.portal, `default_layout=${cid}`, (p) => (portals[p.getUniqueValue()] = true))
            each(T.page, `layout_override=${cid}`, (pg) => (portals[str(pg, 'portal')] = true))
            each(T.placement, `component=${cid}`, (pl) => (portals[str(pl, 'portal')] = true))
        }
    }
    let n = 0
    for (const pid of Object.keys(portals)) {
        if (pid && processPortal(pid)) n++
    }
    return n
}

/** Components whose builds import `componentId`, transitively. */
export function importersOf(componentId: string): string[] {
    const found: Record<string, boolean> = { [componentId]: true }
    const out: string[] = []
    let frontier = [componentId]
    for (let depth = 0; frontier.length && depth < 12; depth++) {
        const next: string[] = []
        for (const cid of frontier) {
            each(T.buildDep, `kind=component^target_build.owner_key=component:${cid}`, (dep) => {
                const b = getById(T.build, str(dep, 'build'))
                const importer = b ? str(b, 'owner_key').replace(/^component:/, '') : ''
                if (importer && !found[importer]) {
                    found[importer] = true
                    out.push(importer)
                    next.push(importer)
                }
            })
        }
        frontier = next
    }
    return out
}

/** Studio: force-reprocess a portal (e.g. after changing properties that feed the manifest). */
export function reprocess(portalId: string): ReleaseSummary {
    requireStudio('publish')
    const summary = processPortal(portalId, true)
    if (!summary) throw notFound('Portal not found')
    return summary
}
