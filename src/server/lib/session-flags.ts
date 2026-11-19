import { gs } from '@servicenow/glide'

/** Session flag set by the page designer while a multi-record write runs (it reprocesses once at the end). */
export const SKIP_REPROCESS_KEY = 'x_312987_portal.skip_reprocess'

export function reprocessSuppressed(): boolean {
    const session: any = gs.getSession()
    return String(session.getClientData(SKIP_REPROCESS_KEY) || '') === 'true'
}
