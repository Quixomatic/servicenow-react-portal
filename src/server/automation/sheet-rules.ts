import { gs } from '@servicenow/glide';
import { compileSheetInBackground } from '../release/release-service.ts';

/**
 * Script action of the x_312987_portal.portal_sheet.compile event (background portal sheet compile,
 * x_312987_portal.portal_sheet.background, on by default; queue x_312987_portal.portal_sheet). parm1: portal sys_id; parm2: when it was queued (ms).
 * Queued explicitly by portal-utilities.ts (gs.eventQueue), so writes with setWorkflow(false) don't
 * suppress it. The compile settles at the end of this script.
 */
export function compilePortalSheetEvent(event: any, current: any): void {
    const portalId = String(event.parm1 || '');
    if (!portalId) return;
    const queuedAt = parseInt(String(event.parm2 || ''), 10);
    try {
        compileSheetInBackground(portalId, isNaN(queuedAt) ? 0 : queuedAt);
    } catch (e) {
        gs.error(`[rp] portal sheet (background) ${portalId} failed: ${String((e && (e as Error).message) || e)}`);
    }
}
