import { newGR, getById, each, str } from '../lib/gr.ts';
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
        if (d.kind === 'component' && !getById(T.build, d.targetBuild || '')) {
            throw badRequest(`Dependency "${d.specifier}" points at an unknown build`);
        }
    }
    each(T.buildDep, `build=${buildId}`, (old) => old.deleteRecord());
    for (const d of deps) {
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
    }
}

/**
 * After a component recompiles, every build that imports it is flagged needs_rebuild so
 * Studio can prompt a recompile. Their current output keeps running.
 */
export function flagDependents(ownerType: OwnerType, ownerId: string): number {
    if (ownerType !== 'component') return 0;
    let flagged = 0;
    const done: Record<string, boolean> = {};
    each(T.buildDep, `kind=component^target_build.component=${ownerId}`, (dep) => {
        const id = str(dep, 'build');
        if (done[id]) return;
        done[id] = true;
        const dependent = getById(T.build, id);
        if (!dependent || str(dependent, 'needs_rebuild') === '1') return;
        dependent.setValue('needs_rebuild', true);
        dependent.update();
        flagged++;
    });
    return flagged;
}
