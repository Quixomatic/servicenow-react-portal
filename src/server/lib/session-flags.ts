import { gs } from '@servicenow/glide';
import { clearClientData } from './global-helpers.ts';

/** Session flag set by the page designer while a multi-record write runs (it reprocesses once at the end). */
export const SKIP_REPROCESS_KEY = 'x_312987_portal.skip_reprocess';

export function reprocessSuppressed(): boolean {
    const session: any = gs.getSession();
    return String(session.getClientData(SKIP_REPROCESS_KEY) || '') === 'true';
}

/**
 * Session flag set by writers that compile placement instance CSS themselves (the page designer, the
 * demo seed): the placement rule then leaves the compile to them, so it runs once per write.
 */
export const SKIP_INSTANCE_CSS_KEY = 'x_312987_portal.skip_instance_css';

export function instanceCssSuppressed(): boolean {
    const session: any = gs.getSession();
    return String(session.getClientData(SKIP_INSTANCE_CSS_KEY) || '') === 'true';
}

/**
 * Clear a session client-data key: removed through the global helper app when it's installed,
 * else blanked (the scoped GlideSession has no clearClientData).
 */
export function clearSessionFlag(key: string): void {
    if (clearClientData(key)) return;
    const session: any = gs.getSession();
    session.putClientData(key, '');
}
