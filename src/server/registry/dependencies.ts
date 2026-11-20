import { getById, each, str, bool } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { notFound } from '../lib/errors.ts';
import { requireStudio } from '../security/access.ts';
import { buildOf } from './registry.ts';
import type { ComponentKind, ServerMode } from '../../shared/contracts';

/**
 * Studio Dependencies panel (.plans/embedded-widgets.md §6): the component records a component's
 * build imports DIRECTLY (forward build_dep edges, kind=component) and the components whose builds
 * import it (reverse edges). Host modules and packages are left out: they're not records.
 *
 * Each component has one build record (overwritten by every compile), so build_dep.target_build
 * always points at the importee's current build and the reverse query finds every importer.
 */

export interface DependencyEntry {
    id: string;
    uniqueId: string;
    name: string;
    kind: ComponentKind;
    serverMode: ServerMode;
    active: boolean;
    /** The import specifier as written (components:app/x, utilities:app/y). */
    specifier: string;
    /** Imports only: a widget import renders as its own embedded instance. */
    embeddable?: boolean;
    /** Imported-by only: the importer's build is flagged for a rebuild (a dependency changed). */
    needsRebuild?: boolean;
}

export interface DependencyData {
    component: { id: string; uniqueId: string; name: string; kind: ComponentKind };
    build: string | null;
    imports: DependencyEntry[];
    importedBy: DependencyEntry[];
}

function entryOf(comp: any, specifier: string): DependencyEntry {
    return {
        id: comp.getUniqueValue(),
        uniqueId: str(comp, 'unique_id'),
        name: str(comp, 'name'),
        kind: (str(comp, 'kind') || 'widget') as ComponentKind,
        serverMode: (str(comp, 'server_mode') || 'none') as ServerMode,
        active: bool(comp, 'active'),
        specifier,
    };
}

function ownerComponentOf(build: any): any {
    const key = str(build, 'owner_key');
    if (key.indexOf('component:') !== 0) return null;
    return getById(T.component, key.substring('component:'.length));
}

/** GET /rp_studio/components/{id}/dependencies */
export function componentDependencies(componentId: string): DependencyData {
    requireStudio('any');
    const comp = getById(T.component, componentId);
    if (!comp) throw notFound('Component not found');
    const build = buildOf('component', componentId);
    const buildId = build ? build.getUniqueValue() : null;

    const imports: DependencyEntry[] = [];
    const importedBy: DependencyEntry[] = [];
    if (buildId) {
        const seenImports: Record<string, boolean> = {};
        each(
            T.buildDep,
            `build=${buildId}^kind=component`,
            (dep) => {
                const target = getById(T.build, str(dep, 'target_build'));
                const child = target ? ownerComponentOf(target) : null;
                if (!child || seenImports[child.getUniqueValue()]) return;
                seenImports[child.getUniqueValue()] = true;
                const e = entryOf(child, str(dep, 'specifier'));
                e.embeddable = e.kind === 'widget';
                imports.push(e);
            },
            'specifier'
        );
        const seenImporters: Record<string, boolean> = {};
        each(
            T.buildDep,
            `target_build=${buildId}^kind=component`,
            (dep) => {
                const owner = getById(T.build, str(dep, 'build'));
                const parent = owner ? ownerComponentOf(owner) : null;
                if (!parent || seenImporters[parent.getUniqueValue()]) return;
                seenImporters[parent.getUniqueValue()] = true;
                const e = entryOf(parent, str(dep, 'specifier'));
                e.needsRebuild = bool(owner, 'needs_rebuild');
                importedBy.push(e);
            },
            'specifier'
        );
        importedBy.sort((a, b) => (a.uniqueId < b.uniqueId ? -1 : a.uniqueId > b.uniqueId ? 1 : 0));
    }
    return {
        component: {
            id: componentId,
            uniqueId: str(comp, 'unique_id'),
            name: str(comp, 'name'),
            kind: (str(comp, 'kind') || 'widget') as ComponentKind,
        },
        build: buildId,
        imports,
        importedBy,
    };
}
