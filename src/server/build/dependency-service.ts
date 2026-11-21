import { newGR, each, str, distinctRows, inChunks } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { badRequest } from '../lib/errors.ts';
import { OwnerType } from '../source/owner.ts';
import type { BuildDependencyDto } from '../../shared/contracts';

/**
 * RPDependencyService: dependency edges of a build (replaced on every successful compile)
 * and invalidation.
 *
 * kind = component → target_build is the imported component's build;
 * kind = host → host_export names a registry export (react, @portal/runtime, components:button…);
 * kind = package → package_version (later: cached npm packages);
 * kind = relative → bundled file inside the same project (diagnostics only).
 */

const KINDS = ['component', 'host', 'package', 'relative'];

export function replaceDependencies(buildId: string, deps: BuildDependencyDto[]): void {
    if (deps.length > 500) throw badRequest('Too many dependencies');
    for (const d of deps) {
        if (!d || typeof d.specifier !== 'string' || KINDS.indexOf(d.kind) < 0)
            throw badRequest('Invalid dependency entry');
    }
    // Component edges must point at existing builds (one IN query for all of them).
    const targets = deps.filter((d) => d.kind === 'component').map((d) => d.targetBuild || '');
    const known: Record<string, boolean> = {};
    const ids = targets.filter((t) => !!t);
    for (const chunk of inChunks(ids)) {
        for (const row of distinctRows(T.build, `sys_idIN${chunk}`, ['sys_id'])) known[row.sys_id] = true;
    }
    for (const d of deps) {
        if (d.kind === 'component' && !known[d.targetBuild || ''])
            throw badRequest(`Dependency "${d.specifier}" points at an unknown build`);
    }
    // Unchanged edges keep their rows (and sys_ids): edges are listed in sys_id order, so rewriting
    // every row would reshuffle each importer's imports[] order in the manifests on every compile.
    const keyOf = (specifier: string, kind: string, target: string, host: string, pkg: string, entry: string) =>
        [specifier, kind, target, host, pkg, entry].join('|');
    const keys = deps.map((d) =>
        keyOf(
            d.specifier.substring(0, 255),
            d.kind,
            d.targetBuild || '',
            d.hostExport || '',
            d.packageVersion || '',
            d.resolvedEntry || ''
        )
    );
    const wanted: Record<string, number> = {};
    for (const k of keys) wanted[k] = (wanted[k] || 0) + 1;
    const kept: Record<string, number> = {};
    each(T.buildDep, `build=${buildId}`, (old) => {
        const k = keyOf(
            str(old, 'specifier'),
            str(old, 'kind'),
            str(old, 'target_build'),
            str(old, 'host_export'),
            str(old, 'package_version'),
            str(old, 'resolved_entry')
        );
        if ((kept[k] || 0) < (wanted[k] || 0)) kept[k] = (kept[k] || 0) + 1;
        else old.deleteRecord();
    });
    deps.forEach((d, i) => {
        if (kept[keys[i]]) {
            kept[keys[i]]--;
            return;
        }
        const gr = newGR(T.buildDep);
        gr.initialize();
        gr.setValue('build', buildId);
        gr.setValue('specifier', d.specifier.substring(0, 255));
        gr.setValue('kind', d.kind);
        if (d.targetBuild) gr.setValue('target_build', d.targetBuild);
        if (d.hostExport) gr.setValue('host_export', d.hostExport);
        if (d.packageVersion) gr.setValue('package_version', d.packageVersion);
        if (d.resolvedEntry) gr.setValue('resolved_entry', d.resolvedEntry);
        gr.insert();
    });
}

/**
 * After a component recompiles, every build that imports it is flagged needs_rebuild so
 * Studio can prompt a recompile. Their current output keeps running.
 */
export function flagDependents(ownerType: OwnerType, ownerId: string): number {
    if (ownerType !== 'component') return 0;
    let flagged = 0;
    // The distinct importing builds (one GROUP BY), then only those not flagged yet.
    const ids = distinctRows(T.buildDep, `kind=component^target_build.component=${ownerId}`, ['build'])
        .map((row) => row.build)
        .filter((id) => !!id);
    for (const chunk of inChunks(ids)) {
        each(T.build, `sys_idIN${chunk}^needs_rebuild!=true`, (dependent) => {
            dependent.setValue('needs_rebuild', true);
            dependent.update();
            flagged++;
        });
    }
    return flagged;
}
