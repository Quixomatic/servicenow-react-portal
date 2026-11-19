import { gs } from '@servicenow/glide'

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
    if (msg) session.putClientData(ABORT_MESSAGE_KEY, '')
    return msg
}

/** True when any of the listed fields changed on `current`. */
export function anyChanged(current: any, fields: string[]): boolean {
    for (const f of fields) if (current.getElement(f).changes()) return true
    return false
}

export function changedFields(current: any, fields: string[]): string[] {
    return fields.filter((f) => current.getElement(f).changes())
}
