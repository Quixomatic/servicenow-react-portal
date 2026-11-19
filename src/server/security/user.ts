import { gs } from '@servicenow/glide'
import { getById, str } from '../lib/gr.ts'

/** The current user as the runtime exposes it (bootstrap `user`, `$rp.getUser()`). */
export interface PortalUser {
    sysId: string
    userName: string
    name: string
    firstName: string
    lastName: string
    email: string
    title: string
    avatar: string | null
    roles: string[]
    timeZone: string
    language: string
    isImpersonating: boolean
}

function rolesOf(user: any): string[] {
    try {
        const v = user.getRoles()
        if (!v) return []
        const out: string[] = []
        if (typeof v.size === 'function') {
            for (let i = 0; i < v.size(); i++) out.push(String(v.get(i)))
        } else {
            for (const r of String(v).replace(/^\[|\]$/g, '').split(',')) if (r.trim()) out.push(r.trim())
        }
        return out.sort()
    } catch (e) {
        return []
    }
}

export function currentUser(): PortalUser {
    const user: any = gs.getUser()
    const session: any = gs.getSession()
    const record = getById('sys_user', gs.getUserID())
    const avatar = record ? str(record, 'avatar') : ''
    let timeZone = ''
    let language = ''
    try {
        timeZone = String(session.getTimeZoneName() || '')
    } catch (e) {
        /* not available in this context */
    }
    try {
        language = String(session.getLanguage() || '')
    } catch (e) {
        /* not available in this context */
    }
    // gs.getImpersonatingUserName() is not allowed in scoped apps; the session API may be.
    let impersonating = false
    try {
        impersonating = !!session.isImpersonating()
    } catch (e) {
        impersonating = false
    }
    return {
        sysId: gs.getUserID(),
        userName: gs.getUserName(),
        name: gs.getUserDisplayName(),
        firstName: String(user.getFirstName() || ''),
        lastName: String(user.getLastName() || ''),
        email: String(user.getEmail() || ''),
        title: record ? str(record, 'title') : '',
        avatar: avatar ? `/${avatar}.iix` : null,
        roles: rolesOf(user),
        timeZone,
        language,
        isImpersonating: impersonating,
    }
}
