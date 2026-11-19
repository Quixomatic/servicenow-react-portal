import { gs } from '@servicenow/glide'
import { drainSessionMessages } from '../lib/global-helpers.ts'
import { clearSessionFlag } from '../lib/session-flags.ts'

/** Session key holding the last abort message (REST callers can't read gs.addErrorMessage). */
export const ABORT_MESSAGE_KEY = 'x_312987_portal.abort_message'

/** Abort the current database operation with a user-visible message. */
export function abort(current: any, message: string): void {
    gs.addErrorMessage(message)
    const session: any = gs.getSession()
    session.putClientData(ABORT_MESSAGE_KEY, message)
    current.setAbortAction(true)
}

/** The last abort message in this session ('' if none), cleared on read. */
export function takeAbortMessage(): string {
    const session: any = gs.getSession()
    const msg = String(session.getClientData(ABORT_MESSAGE_KEY) || '')
    if (msg) clearSessionFlag(ABORT_MESSAGE_KEY)
    return msg
}

/**
 * The message for an aborted write: `recorded` (from takeAbortMessage) or the session's queued
 * error messages, else `fallback`. Drains the session queue through the global helper app, so a
 * rule's gs.addErrorMessage travels in the API response instead of resurfacing as a banner on the
 * user's next classic page. Without the helper the queue is only read.
 */
export function abortMessageFromSession(recorded: string, fallback: string): string {
    const drained = drainSessionMessages()
    if (recorded) return recorded
    if (drained) {
        const errors = drained.filter((m) => m.type === 'error').map((m) => m.message)
        return errors.length ? errors.join(' ') : fallback
    }
    try {
        const msgs: any = gs.getErrorMessages()
        const list = msgs && typeof msgs.size === 'function' ? Array.from({ length: msgs.size() }, (_, i) => String(msgs.get(i))) : []
        return list.length ? list.join(' ') : fallback
    } catch (e) {
        return fallback
    }
}

/** True when any of the listed fields changed on `current`. */
export function anyChanged(current: any, fields: string[]): boolean {
    for (const f of fields) if (current.getElement(f).changes()) return true
    return false
}

export function changedFields(current: any, fields: string[]): string[] {
    return fields.filter((f) => current.getElement(f).changes())
}
