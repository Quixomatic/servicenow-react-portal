import { gs } from '@servicenow/glide';
import { str } from '../lib/gr.ts';
import { loadOwner, ownerOfRecord, OwnerType } from '../source/owner.ts';
import { compileOwner } from '../build/build-service.ts';
import { COMPONENT_BUILD_FIELDS } from './component-rules.ts';
import { anyChanged } from './guards.ts';
import { compileSuppressed } from '../source/source-service.ts';

/**
 * Compile on save. Each rule compiles the owner's current sources on the server and writes
 * its build (failures land in the build's diagnostics; the last good output keeps serving).
 * The compile is asynchronous only because Tailwind's compile() is; the Promise settles
 * before this business rule's script finishes, so the save completes with the build written.
 */

function run(type: OwnerType, id: string, reason: string): void {
    if (compileSuppressed()) return; // a Studio save compiles once at the end of its batch
    let owner;
    try {
        owner = loadOwner(type, id);
    } catch (e) {
        return;
    }
    compileOwner(owner).then(
        (b) => {
            if (b.state === 'failed' || (b.diagnostics && (b.diagnostics as { errors?: unknown[] }).errors?.length)) {
                const errors = (
                    (b.diagnostics as { errors?: { file?: string; line?: number; message: string }[] }).errors || []
                )
                    .slice(0, 3)
                    .map((e) => `${e.file || ''}${e.line ? ':' + e.line : ''} ${e.message}`)
                    .join('\n');
                gs.addErrorMessage(
                    `React Portal: ${str(owner.gr, 'name')} did not compile — ${errors || 'see the build diagnostics'}`
                );
            }
        },
        (e) => gs.error(`[React Portal] compile after ${reason} failed: ${e}`)
    );
}

/** after insert/update on component: new component, or a build-relevant field changed. */
export function compileComponentOnSave(current: any, previous: any): void {
    if (current.operation() === 'insert' || anyChanged(current, COMPONENT_BUILD_FIELDS)) {
        run('component', current.getUniqueValue(), 'component save');
    }
}

/** after insert/update on theme: stylesheet or tokens changed. */
export function compileThemeOnSave(current: any, previous: any): void {
    if (current.operation() === 'insert' || anyChanged(current, ['stylesheet', 'tokens_json'])) {
        run('theme', current.getUniqueValue(), 'theme save');
    }
}

/** after insert/update/delete on source_file: recompile its owner. */
export function compileOnSourceChange(current: any, previous: any): void {
    const owner = ownerOfRecord(current);
    if (owner) run(owner.type, owner.id, 'source file change');
}
