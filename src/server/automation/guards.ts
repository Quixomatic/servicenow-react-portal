import { gs } from '@servicenow/glide'

/** Abort the current database operation with a user-visible message. */
export function abort(current: any, message: string): void {
    gs.addErrorMessage(message)
    current.setAbortAction(true)
}

/** True when any of the listed fields changed on `current`. */
export function anyChanged(current: any, fields: string[]): boolean {
    for (const f of fields) if (current.getElement(f).changes()) return true
    return false
}

export function changedFields(current: any, fields: string[]): string[] {
    return fields.filter((f) => current.getElement(f).changes())
}
