import { str } from '../lib/gr.ts'
import { processPortal, reprocessForOwner } from '../release/release-service.ts'

/**
 * Keep each portal's compiled release in sync with its inputs. Every rule is an `after`
 * rule in the author's transaction; processPortal writes only when the manifest changed.
 */

/** after insert/update on portal. (On delete the release cascades away.) */
export function reprocessPortal(current: any, previous: any): void {
    processPortal(current.getUniqueValue())
}

/** after insert/update/delete on page or placement: reprocess its portal (old and new). */
export function reprocessOwningPortal(current: any, previous: any): void {
    const now = str(current, 'portal')
    if (now) processPortal(now)
    const before = previous ? str(previous, 'portal') : ''
    if (before && before !== now) processPortal(before)
}

/** after update/delete on theme: reprocess portals using it (tokens/stylesheet live in the manifest). */
export function reprocessThemePortals(current: any, previous: any): void {
    reprocessForOwner('theme', current.getUniqueValue())
}

/** after update/delete on component: manifest-relevant fields (name, kind, mode, regions, defaults…). */
export function reprocessComponentPortals(current: any, previous: any): void {
    reprocessForOwner('component', current.getUniqueValue())
}
