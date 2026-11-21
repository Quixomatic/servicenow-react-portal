import { gs } from '@servicenow/glide';
import { GR, newGR, getById, findOne, each, str, int, distinctRows } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { notFound } from '../lib/errors.ts';
import { canonicalJson, sha256, nowValue, parseJson, propBool } from '../lib/util.ts';
import { requireStudio } from '../security/access.ts';
import { assembleManifest, Manifest, flattenRegions, MANIFEST_VERSION } from '../runtime/portal-service.ts';
import { buildOf, copyBuildRef } from '../registry/registry.ts';
import { reprocessSuppressed } from '../lib/session-flags.ts';
import {
    planUtilities,
    utilitiesFor,
    utilitiesDescriptor,
    descriptor,
    UtilitiesPlan,
    compileInBackground,
    clearSheetPending,
    compileSheetsInline,
} from './portal-utilities.ts';
import type { ReleaseSummary, PlacementRef, ComponentRef, BuildRef } from '../../shared/contracts';

/**
 * RPReleaseService: the compiled form of a portal.
 *
 * Exactly one release record per portal holds its manifest, plus one release_entry per
 * piece (theme, layouts, placements). It is reprocessed whenever the portal's inputs change
 * (business rules on portal/page/placement/theme/component, and every successful compile).
 * Nothing is written when the manifest is unchanged, so update sets only record real changes.
 * There is no release history: reverting an input (version history / update set) reprocesses.
 *
 * Two cheaper paths write the same manifest a full reprocess would (each can be checked against a
 * full assembly with the x_312987_portal.release.verify_patch property):
 * - patchUtilities: after a portal sheet compile, only `utilities` changes;
 * - patchPortalBuild: after a compile that changed only one component's entry assets (same import
 *   edges), only that component's BuildRefs change (placements, layouts, imports[] entries).
 * Structural changes (pages, placements, menus, theme, portal settings, import edges) and Studio's
 * Reprocess button always assemble the whole manifest.
 */

const HOST_ABI_PROP = 'runtime_abi_version';

/** Incremental manifest patch after a compile (D). On unless x_312987_portal.release.incremental is 'false'. */
export function incrementalPatch(): boolean {
    return propBool('release.incremental', INCREMENTAL_DEFAULT);
}
const INCREMENTAL_DEFAULT = true;

/** Debug: check every patched manifest against a full assembly (x_312987_portal.release.verify_patch). */
function verifyPatches(): boolean {
    return propBool('release.verify_patch', false);
}

export function releaseOf(portalId: string): GR | null {
    return findOne(T.release, `portal=${portalId}`);
}

export function releaseSummary(r: GR): ReleaseSummary {
    return {
        id: r.getUniqueValue(),
        portal: str(r, 'portal'),
        revision: int(r, 'revision'),
        manifestHash: str(r, 'manifest_hash'),
        processedAt: str(r, 'processed_at'),
        problems: parseJson<string[]>(str(r, 'problems_json'), []),
    };
}

function allPlacements(m: Manifest): PlacementRef[] {
    const out: PlacementRef[] = flattenRegions(m.regions);
    for (const p of m.pages) out.push(...flattenRegions(p.regions));
    return out;
}

/** Components without compiled output (they render as placeholders until compiled). */
export function manifestProblems(m: Manifest): string[] {
    const problems: string[] = [];
    if (!m.defaultLayoutId) problems.push('Portal has no default layout');
    for (const id of Object.keys(m.layouts)) {
        const l = m.layouts[id];
        if (!l.build) problems.push(`Layout "${l.uniqueId}" has not been compiled`);
    }
    const seen: Record<string, boolean> = {};
    for (const pl of allPlacements(m)) {
        if (!pl.component.build && !seen[pl.component.id]) {
            seen[pl.component.id] = true;
            problems.push(`Component "${pl.component.uniqueId}" has not been compiled`);
        }
    }
    return problems;
}

interface DesiredEntry {
    type: 'theme' | 'layout' | 'placement';
    fields: Record<string, string>;
}

function desiredEntries(m: Manifest): Record<string, DesiredEntry> {
    const out: Record<string, DesiredEntry> = {};
    if (m.theme) {
        const b = buildOf('theme', m.theme.id);
        out[`theme:${m.theme.id}`] = {
            type: 'theme',
            fields: { theme: m.theme.id, build: b ? b.getUniqueValue() : '', server_mode: '' },
        };
    }
    for (const id of Object.keys(m.layouts)) {
        const l = m.layouts[id];
        out[`layout:${l.id}`] = {
            type: 'layout',
            fields: { component: l.id, build: l.build ? l.build.id : '', server_mode: l.serverMode },
        };
    }
    for (const pl of allPlacements(m)) {
        out[`placement:${pl.id}`] = {
            type: 'placement',
            fields: {
                placement: pl.id,
                component: pl.component.id,
                build: pl.component.build ? pl.component.build.id : '',
                server_mode: pl.component.serverMode,
            },
        };
    }
    return out;
}

/** Bring the release's entries in line with `desired`: update in place, insert missing, delete the rest. */
function syncEntries(releaseId: string, desired: Record<string, DesiredEntry>): void {
    const kept: Record<string, boolean> = {};
    each(T.releaseEntry, `release=${releaseId}`, (e) => {
        const key = str(e, 'stable_key');
        if (!desired[key] || kept[key]) {
            e.deleteRecord();
            return;
        }
        kept[key] = true;
        const want = desired[key];
        let dirty = false;
        if (str(e, 'entry_type') !== want.type) {
            e.setValue('entry_type', want.type);
            dirty = true;
        }
        for (const f of Object.keys(want.fields)) {
            if (str(e, f) !== want.fields[f]) {
                e.setValue(f, want.fields[f]);
                dirty = true;
            }
        }
        if (dirty) e.update();
    });
    for (const key of Object.keys(desired)) {
        if (kept[key]) continue;
        const want = desired[key];
        const e = newGR(T.releaseEntry);
        e.initialize();
        e.setValue('release', releaseId);
        e.setValue('stable_key', key);
        e.setValue('entry_type', want.type);
        for (const f of Object.keys(want.fields)) e.setValue(f, want.fields[f]);
        e.insert();
    }
}

/** Write a new revision of a release (new record when `r` is null). id is '' when the write was refused. */
function writeRelease(
    portalId: string,
    r: GR | null,
    manifest: Manifest,
    hash: string,
    problems: string[]
): { r: GR; id: string } {
    if (!r) {
        r = newGR(T.release);
        r.initialize();
        r.setValue('portal', portalId);
        r.setValue('revision', 0);
    }
    r.setValue('revision', int(r, 'revision') + 1);
    r.setValue('manifest_json', JSON.stringify(manifest));
    r.setValue('manifest_hash', hash);
    r.setValue('host_abi', gs.getProperty('x_312987_portal.' + HOST_ABI_PROP, '1'));
    r.setValue('problems_json', JSON.stringify(problems));
    r.setValue('processed_at', nowValue());
    r.setValue('processed_by', gs.getUserID());
    const id = r.isNewRecord() ? r.insert() : (r.update(), r.getUniqueValue());
    return { r, id: id ? String(id) : '' };
}

/** The manifest stored on a release, or null when missing or of another manifest version. */
function storedManifest(r: GR): Manifest | null {
    const m = parseJson<Manifest | null>(str(r, 'manifest_json'), null);
    return m && m.manifestVersion === MANIFEST_VERSION ? m : null;
}

/** Reprocess one portal's release. Writes only when the manifest changed. */
export function processPortal(portalId: string, force = false): ReleaseSummary | null {
    const portal = getById(T.portal, portalId);
    if (!portal) return null;
    const manifest = assembleManifest(portal);
    const r = releaseOf(portalId);
    // The portal utilities sheet: reused while the candidate union is unchanged; otherwise compiled at
    // the end of this script, after which only the manifest's `utilities` is patched (patchUtilities).
    manifest.utilities = utilitiesFor(portalId, r, planUtilities(manifest), patchUtilities);
    const hash = sha256(canonicalJson(manifest));
    const problems = manifestProblems(manifest);

    if (r && !force && str(r, 'manifest_hash') === hash) return releaseSummary(r);

    const written = writeRelease(portalId, r, manifest, hash, problems);
    if (written.id) syncEntries(written.id, desiredEntries(manifest));
    return releaseSummary(written.r);
}

/**
 * The canonical hash a full reprocess would give the portal right now, without writing or queueing
 * anything (the patch paths' debug check). null when the portal is gone.
 */
export function fullManifestHash(portalId: string): string | null {
    const portal = getById(T.portal, portalId);
    if (!portal) return null;
    const manifest = assembleManifest(portal);
    manifest.utilities = utilitiesDescriptor(releaseOf(portalId), planUtilities(manifest)).utilities;
    return sha256(canonicalJson(manifest));
}

/** Debug check of a patched manifest: true when it matches a full assembly (or checks are off). */
function patchMatchesFull(portalId: string, hash: string, label: string): boolean {
    if (!verifyPatches()) return true;
    const full = fullManifestHash(portalId);
    if (full === hash) {
        gs.info(`[rp] ${label} ${portalId}: verified against a full assembly (${hash.substring(0, 12)})`);
        return true;
    }
    gs.error(`[rp] ${label} ${portalId}: MISMATCH patched ${hash} vs full ${full}; reprocessing in full`);
    return false;
}

/**
 * After a portal sheet compile (portal-utilities.ts): point the stored manifest at the new sheet. Only
 * `utilities` changes, so the stored manifest is patched instead of reassembled. Falls back to a full
 * reprocess when the stored manifest's union is no longer the compiled one.
 */
export function patchUtilities(portalId: string, plan: UtilitiesPlan): void {
    const r = releaseOf(portalId);
    const manifest = r ? storedManifest(r) : null;
    if (!r || !manifest || str(r, 'utilities_hash') !== plan.hash) {
        processPortal(portalId);
        return;
    }
    const current = planUtilities(manifest);
    if (current.hash !== plan.hash) {
        processPortal(portalId);
        return;
    }
    manifest.utilities = descriptor(r.getUniqueValue(), plan.hash, current.covers);
    const hash = sha256(canonicalJson(manifest));
    if (str(r, 'manifest_hash') === hash) return;
    if (!patchMatchesFull(portalId, hash, 'utilities patch')) {
        processPortal(portalId);
        return;
    }
    writeRelease(portalId, r, manifest, hash, manifestProblems(manifest));
}

/**
 * Background mode (x_312987_portal.portal_sheet.background): the job of the
 * x_312987_portal.portal_sheet.compile event. Clears the pending marker first (a save from now on
 * queues a follow-up job), then plans from the stored manifest as it is now: nothing to do when the
 * release's sheet already matches; otherwise the sheet compiles at the end of this script and
 * patchUtilitiesCurrent points the current release at it. `queuedAt`: when the event was queued (ms).
 */
export function compileSheetInBackground(portalId: string, queuedAt: number): void {
    const started = Date.now();
    compileSheetsInline(); // whatever this job reprocesses compiles here, never re-queued
    const r = releaseOf(portalId);
    const manifest = r ? storedManifest(r) : null;
    if (!r || !manifest) {
        gs.info(`[rp] portal sheet (background) ${portalId}: no release; nothing to do`);
        return;
    }
    clearSheetPending(r.getUniqueValue());
    const plan = planUtilities(manifest);
    if (str(r, 'utilities_hash') === plan.hash) {
        const u = manifest.utilities;
        if (!u || u.hash !== plan.hash || (u.covers || []).join(',') !== plan.covers.join(','))
            patchUtilitiesCurrent(portalId, plan);
        gs.info(
            `[rp] portal sheet (background) ${portalId}: already covered (queue wait ${queuedAt ? started - queuedAt + ' ms' : 'unknown'})`
        );
        return;
    }
    compileInBackground(portalId, plan, patchUtilitiesCurrent, started, queuedAt, sheetSuperseded);
}

/**
 * Before a background job writes its sheet: has another job meanwhile written a different sheet that
 * matches the portal's current union? Then this one is stale and is dropped (the queue is sequential,
 * but a job can also overlap an inline compile, e.g. Studio's Reprocess). Otherwise it writes, even when the union moved on (patchUtilitiesCurrent
 * covers only what it compiled and reprocesses the rest).
 */
function sheetSuperseded(portalId: string, plan: UtilitiesPlan): boolean {
    const r = releaseOf(portalId);
    const manifest = r ? storedManifest(r) : null;
    if (!r || !manifest) return false;
    const written = str(r, 'utilities_hash');
    return !!written && written !== plan.hash && written === planUtilities(manifest).hash;
}

/**
 * After a background sheet compile: point the CURRENT release's manifest (re-read now, not the one
 * the job planned from) at the new sheet. A save may have changed the manifest during the compile, so
 * `covers` lists only the builds both in the compiled union and in the current manifest; the rest keep
 * their own sheets. When the current union differs, it is then reprocessed (compiling the newer union
 * inline in this job), so the portal converges. Never overwrites a sheet written after this one.
 */
export function patchUtilitiesCurrent(portalId: string, plan: UtilitiesPlan): void {
    for (let attempt = 0; attempt < 3; attempt++) {
        const r = releaseOf(portalId);
        const manifest = r ? storedManifest(r) : null;
        if (!r || !manifest) {
            processPortal(portalId);
            return;
        }
        if (str(r, 'utilities_hash') !== plan.hash) {
            gs.info(`[rp] portal sheet (background) ${portalId}: a newer sheet was written meanwhile; left alone`);
            return;
        }
        const current = planUtilities(manifest);
        const compiled: Record<string, boolean> = {};
        for (const k of plan.covers) compiled[k] = true;
        manifest.utilities = descriptor(
            r.getUniqueValue(),
            plan.hash,
            current.covers.filter((k) => compiled[k])
        );
        const hash = sha256(canonicalJson(manifest));
        if (str(r, 'manifest_hash') !== hash) {
            // Revision check: a save that wrote the release since it was read wins; plan again on it.
            const now = getById(T.release, r.getUniqueValue());
            if (!now || int(now, 'revision') !== int(r, 'revision')) continue;
            writeRelease(portalId, r, manifest, hash, manifestProblems(manifest));
        }
        if (current.hash !== plan.hash) processPortal(portalId);
        return;
    }
    gs.warn(`[rp] portal sheet (background) ${portalId}: release kept changing; reprocessing in full`);
    processPortal(portalId);
}

/**
 * After a compile that changed only `componentId`'s entry assets (same build record, same import
 * edges, usable before and after): rewrite its BuildRefs in the stored manifest (placements, layouts
 * and every imports[] entry), then redo the utilities plan and the hash. Release entries hold build
 * ids and server modes, which this can't change, so they stay. Returns null when the manifest can't
 * be patched (the caller reprocesses in full).
 */
export function patchPortalBuild(portalId: string, componentId: string, ref: BuildRef): ReleaseSummary | null {
    const r = releaseOf(portalId);
    const manifest = r ? storedManifest(r) : null;
    if (!r || !manifest) return null;
    let ok = true;
    const swap = (b: BuildRef | null): BuildRef | null => {
        if (!b || b.id !== ref.id) ok = false;
        return copyBuildRef(ref);
    };
    const patchRef = (cr: ComponentRef) => {
        if (cr.id === componentId) cr.build = swap(cr.build);
        for (const imp of cr.imports || []) if (imp.id === componentId) imp.build = swap(imp.build);
    };
    for (const id of Object.keys(manifest.layouts)) patchRef(manifest.layouts[id]);
    for (const pl of allPlacements(manifest)) patchRef(pl.component);
    if (!ok) return null;

    manifest.utilities = utilitiesFor(portalId, r, planUtilities(manifest), patchUtilities);
    const hash = sha256(canonicalJson(manifest));
    if (str(r, 'manifest_hash') === hash) return releaseSummary(r);
    if (!patchMatchesFull(portalId, hash, 'build patch')) return null;
    return releaseSummary(writeRelease(portalId, r, manifest, hash, manifestProblems(manifest)).r);
}

/**
 * Reprocess every portal (force). Run once after a manifest version bump: until then each portal
 * serves a live-assembled manifest (correct, slower). new x_312987_portal.ReactPortal().reprocessAll()
 */
export function processAllPortals(): number {
    compileSheetsInline();
    let n = 0;
    each(T.portal, '', (p) => {
        if (processPortal(p.getUniqueValue(), true)) n++;
    });
    return n;
}

/** reprocessForOwner calls per owner in this script (Studio's save checks whether its compile reprocessed). */
const reprocessCalls: Record<string, number> = {};

export function reprocessCount(type: 'component' | 'theme', id: string): number {
    return reprocessCalls[`${type}:${id}`] || 0;
}

/**
 * Reprocess every portal that uses a component or a theme.
 * - cause 'record': the owner record changed (name, active, defaults…);
 * - cause 'build': a compile changed its output. `patch` (the new BuildRef) is given when only the
 *   entry assets changed: each portal's stored manifest is then patched instead of reassembled
 *   (when x_312987_portal.release.incremental is on).
 */
export function reprocessForOwner(
    type: 'component' | 'theme',
    id: string,
    cause: 'record' | 'build' = 'record',
    patch?: BuildRef | null
): number {
    // A batch (designer write, demo seed) sets the skip flag and reprocesses each portal once at
    // its end, so a compile inside the batch must not rebuild every portal that uses the component.
    if (reprocessSuppressed()) return 0;
    const key = `${type}:${id}`;
    reprocessCalls[key] = (reprocessCalls[key] || 0) + 1;
    const usePatch = !!patch && type === 'component' && incrementalPatch();
    let n = 0;
    for (const pid of portalsForOwner(type, id, cause === 'record')) {
        const summary = (usePatch && patchPortalBuild(pid, id, patch as BuildRef)) || processPortal(pid);
        if (summary) n++;
    }
    return n;
}

/**
 * Portals whose release depends on a theme or a component.
 *
 * A component: the portals whose stored manifest mentions its sys_id (as a layout, a placed component
 * or an imports[] entry at any depth: the manifest already holds the transitive import tree), so a
 * primitive's change reaches only the portals that really use it. `direct` adds the portals whose
 * records point at it (default layout, page layout override, placement), for record changes such as
 * activating a component, which isn't in any manifest while inactive. Portals without a release fall
 * back to the record-based lookup (records plus transitive importers).
 */
export function portalsForOwner(type: 'component' | 'theme', id: string, direct: boolean): string[] {
    const portals: Record<string, boolean> = {};
    if (type === 'theme') {
        for (const row of distinctRows(T.portal, `theme=${id}`, ['sys_id'])) portals[row.sys_id] = true;
        return Object.keys(portals);
    }
    const released: Record<string, boolean> = {};
    each(T.release, 'manifest_jsonISNOTEMPTY', (r) => {
        const pid = str(r, 'portal');
        released[pid] = true;
        if (str(r, 'manifest_json').indexOf(id) >= 0) portals[pid] = true;
    });
    const unreleased = distinctRows(T.portal, '', ['sys_id'])
        .map((row) => row.sys_id)
        .filter((pid) => !released[pid]);
    const addRecordPortals = (cid: string, only: Record<string, boolean> | null) => {
        const add = (pid: string) => {
            if (pid && (!only || only[pid])) portals[pid] = true;
        };
        for (const row of distinctRows(T.portal, `default_layout=${cid}`, ['sys_id'])) add(row.sys_id);
        for (const row of distinctRows(T.page, `layout_override=${cid}`, ['portal'])) add(row.portal);
        for (const row of distinctRows(T.placement, `component=${cid}`, ['portal'])) add(row.portal);
    };
    if (direct) addRecordPortals(id, null);
    if (unreleased.length) {
        const only: Record<string, boolean> = {};
        for (const pid of unreleased) only[pid] = true;
        for (const cid of [id].concat(importersOf(id))) addRecordPortals(cid, only);
    }
    return Object.keys(portals);
}

/** Components whose builds import `componentId`, transitively. */
export function importersOf(componentId: string): string[] {
    const found: Record<string, boolean> = { [componentId]: true };
    const out: string[] = [];
    let frontier = [componentId];
    for (let depth = 0; frontier.length && depth < 12; depth++) {
        const next: string[] = [];
        for (const cid of frontier) {
            // One GROUP BY per level: the distinct importing builds' owners (no row or build lookups).
            for (const row of distinctRows(T.buildDep, `kind=component^target_build.owner_key=component:${cid}`, [
                'build.owner_key',
            ])) {
                const importer = row['build.owner_key'].replace(/^component:/, '');
                if (importer && !found[importer]) {
                    found[importer] = true;
                    out.push(importer);
                    next.push(importer);
                }
            }
        }
        frontier = next;
    }
    return out;
}

/** Studio: force-reprocess a portal (e.g. after changing properties that feed the manifest). */
export function reprocess(portalId: string): ReleaseSummary {
    requireStudio('publish');
    compileSheetsInline(); // Reprocess compiles the portal sheet in the request, whatever the property says
    const summary = processPortal(portalId, true);
    if (!summary) throw notFound('Portal not found');
    return summary;
}
