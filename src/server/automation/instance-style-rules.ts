import { gs } from '@servicenow/glide';
import { str } from '../lib/gr.ts';
import { anyChanged } from './guards.ts';
import { refreshInstanceCss } from '../design/instance-style.ts';
import { reprocessSuppressed } from '../lib/session-flags.ts';
import { processPortal } from '../release/release-service.ts';

/** Fields that feed placement.instance_css. */
export const INSTANCE_STYLE_FIELDS = ['classes', 'style_tokens_json', 'layout_json', 'options_json', 'component'];

/**
 * after insert/update on placement: recompile the instance CSS when its inputs change, whether
 * the edit came from the page designer or straight on the record. (Designer writes compile
 * explicitly once their batch finishes, so they're skipped here.)
 */
export function compileInstanceStyle(current: any, previous: any): void {
    if (current.operation() !== 'insert' && !anyChanged(current, INSTANCE_STYLE_FIELDS)) return;
    // Always compile the placement's CSS. Inside a batch (designer write, demo seed) only the
    // portal reprocess is deferred: the batch reprocesses once at its end. (Skipping the compile
    // itself here left seeded placements with an empty instance_css.)
    const batched = reprocessSuppressed();
    const portalId = str(current, 'portal');
    refreshInstanceCss(current.getUniqueValue()).then(
        (changed) => {
            if (changed && portalId && !batched) processPortal(portalId);
        },
        (e) => gs.error(`[React Portal] instance CSS compile failed for placement ${current.getUniqueValue()}: ${e}`)
    );
}
