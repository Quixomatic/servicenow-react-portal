import { getById, findOne, str, int } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { sha256, byteLength, propInt } from '../lib/util.ts';
import { normalizeSourcePath, inferTarget, mimeFor } from '../lib/paths.ts';
import { ownerOfRecord, ownerKey, ownerTable } from '../source/owner.ts';
import { abort } from './guards.ts';
import { RESERVED_VIRTUAL_PATHS } from '../source/project-files.ts';

/**
 * Source file business rules.
 */

const TARGETS = ['client', 'server', 'style', 'asset'];

/** Virtual files backed by component fields; never stored as source_file rows. */
export const RESERVED_PATHS = RESERVED_VIRTUAL_PATHS;

/** before insert/update: one owner, safe path, size limit, hash, per-file revision. */
export function validateSourceFile(current: any, previous: any): void {
    const owner = ownerOfRecord(current);
    if (!owner) return abort(current, 'A source file belongs to exactly one component or theme.');
    if (!getById(ownerTable(owner.type), owner.id)) return abort(current, 'Source file owner not found.');
    current.setValue('owner_key', ownerKey(owner.type, owner.id));

    const path = normalizeSourcePath(str(current, 'path'));
    if (!path)
        return abort(
            current,
            `Invalid source path "${str(current, 'path')}". Paths are relative and can't contain "..".`
        );
    current.setValue('path', path);
    if (RESERVED_PATHS.indexOf(path.toLowerCase()) >= 0) {
        return abort(
            current,
            `"${path}" is reserved: it is a field of the component/theme record (edit it there or in Studio).`
        );
    }

    const dup = findOne(
        T.sourceFile,
        `owner_key=${ownerKey(owner.type, owner.id)}^path=${path}^sys_id!=${current.getUniqueValue()}`
    );
    if (dup) return abort(current, `"${path}" already exists in this project.`);

    const target = str(current, 'target') || inferTarget(path);
    if (TARGETS.indexOf(target) < 0) return abort(current, 'Target must be client, server, style or asset.');
    current.setValue('target', target);
    if (!str(current, 'encoding')) current.setValue('encoding', 'utf8');
    if (!str(current, 'mime_type')) current.setValue('mime_type', mimeFor(path));

    const content = str(current, 'content_text');
    const bytes = byteLength(content);
    const max = propInt('source.max_file_bytes', 1024 * 1024);
    if (bytes > max) return abort(current, `"${path}" is ${bytes} bytes; the limit is ${max}.`);
    current.setValue('byte_length', bytes);

    const hash = sha256(content);
    if (current.isNewRecord()) {
        current.setValue('revision', 1);
    } else if (
        hash !== str(previous, 'content_hash') ||
        current.getElement('path').changes() ||
        current.getElement('target').changes()
    ) {
        current.setValue('revision', int(previous, 'revision') + 1);
    }
    current.setValue('content_hash', hash);
}

/** after insert/update/delete: advance the owner's source revision (the build compares built_revision). */
export function trackSourceChange(current: any, previous: any): void {
    const owner = ownerOfRecord(current);
    if (!owner) return;
    if (
        current.operation() === 'update' &&
        previous &&
        str(previous, 'content_hash') === str(current, 'content_hash') &&
        str(previous, 'path') === str(current, 'path') &&
        str(previous, 'target') === str(current, 'target')
    ) {
        return; // metadata-only change
    }
    const og = getById(ownerTable(owner.type), owner.id);
    if (!og) return;
    og.setValue('source_revision', int(og, 'source_revision') + 1);
    og.setWorkflow(false); // the owner's own rules would treat this as a definition change
    og.update();
}
