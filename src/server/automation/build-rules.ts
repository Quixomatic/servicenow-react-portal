import { getById, findOne, str } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { ownerOfRecord, ownerKey, ownerTable } from '../source/owner.ts';
import { abort } from './guards.ts';

/**
 * Generated-record rules (build, build asset/dependency, release, release entry).
 * These records are application files like their sources; they're written by the server
 * services, one current record per piece.
 */

/** before insert/update on build: exactly one owner, one build per owner, owner's scope. */
export function normalizeBuild(current: any, previous: any): void {
    const owner = ownerOfRecord(current);
    if (!owner) return abort(current, 'A build belongs to exactly one component or theme.');
    const og = getById(ownerTable(owner.type), owner.id);
    if (!og) return abort(current, 'Build owner not found.');
    const key = ownerKey(owner.type, owner.id);
    current.setValue('owner_key', key);
    const dup = findOne(T.build, `owner_key=${key}^sys_id!=${current.getUniqueValue()}`);
    if (dup) return abort(current, 'This component/theme already has a build record; it is updated in place.');
    inheritScope(current, og);
    if (!str(current, 'state')) current.setValue('state', 'pending');
}

/** before insert on build_asset / build_dep: same application scope as the build. */
export function inheritBuildScope(current: any, previous: any): void {
    const build = getById(T.build, str(current, 'build'));
    if (!build) return abort(current, 'Build not found.');
    inheritScope(current, build);
}

/** before insert on release: one release per portal, portal's scope. */
export function normalizeRelease(current: any, previous: any): void {
    const portal = getById(T.portal, str(current, 'portal'));
    if (!portal) return abort(current, 'Portal not found.');
    const dup = findOne(T.release, `portal=${portal.getUniqueValue()}^sys_id!=${current.getUniqueValue()}`);
    if (dup) return abort(current, 'This portal already has a release record; it is reprocessed in place.');
    inheritScope(current, portal);
}

/** before insert on release_entry: release's scope. */
export function inheritReleaseScope(current: any, previous: any): void {
    const release = getById(T.release, str(current, 'release'));
    if (!release) return abort(current, 'Release not found.');
    inheritScope(current, release);
}

/**
 * Generated records live in the same application as the record they're generated from,
 * whatever application the author's session happens to be in. (A build's server script runs
 * through GlideScopedEvaluator in the build record's scope.)
 */
function inheritScope(current: any, source: any): void {
    const scope = str(source, 'sys_scope');
    if (scope && str(current, 'sys_scope') !== scope) current.setValue('sys_scope', scope);
    const pkg = str(source, 'sys_package');
    if (pkg && str(current, 'sys_package') !== pkg) current.setValue('sys_package', pkg);
}
