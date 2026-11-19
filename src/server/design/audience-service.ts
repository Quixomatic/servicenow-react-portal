import { getById, newGR, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { notFound, badRequest } from '../lib/errors.ts'
import { requireStudio, withViewAsUser, ucAudience, UcAudience } from '../security/access.ts'

/**
 * Studio "View as user": what a portal's user criteria hide from a given user. Read-only and
 * studio-gated. Only the user-criteria layer is simulated (legacy roles keep their client-side
 * "View as role" preview in Menus); a subject with admin or a studio role bypasses, as at runtime.
 */

export interface StudioUser {
    id: string
    name: string
    userName: string
}

export interface PortalAudience extends UcAudience {
    user: StudioUser
}

const SYS_ID = /^[0-9a-f]{32}$/

function userOf(gr: any): StudioUser {
    return { id: gr.getUniqueValue(), name: str(gr, 'name'), userName: str(gr, 'user_name') }
}

/** GET /users?q=&limit=: active users by name / user name / email (for the View-as picker). */
export function searchUsers(q: string, limit: number): StudioUser[] {
    requireStudio('any')
    const term = String(q || '').trim()
    const gr = newGR('sys_user')
    gr.addActiveQuery()
    if (term) {
        const c = gr.addQuery('name', 'CONTAINS', term)
        c.addOrCondition('user_name', 'CONTAINS', term)
        c.addOrCondition('email', 'CONTAINS', term)
    }
    gr.orderBy('name')
    gr.setLimit(Math.min(Math.max(limit || 20, 1), 50))
    gr.query()
    const out: StudioUser[] = []
    while (gr.next()) out.push(userOf(gr))
    return out
}

/** GET /portals/{id}/audience?user=<sys_id>: the portal's user-criteria verdicts for that user. */
export function portalAudience(portalId: string, userId: string): PortalAudience {
    requireStudio('any')
    if (!SYS_ID.test(String(userId || ''))) throw badRequest('user must be a sys_user sys_id')
    const portal = getById(T.portal, portalId)
    if (!portal) throw notFound('Portal not found')
    const user = getById('sys_user', userId)
    if (!user) throw notFound('User not found')
    const verdicts = withViewAsUser(userId, () => ucAudience(portal.getUniqueValue()))
    return { user: userOf(user), ...verdicts }
}
