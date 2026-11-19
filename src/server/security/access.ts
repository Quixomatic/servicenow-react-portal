import { gs } from '@servicenow/glide'
import { GR, str, bool } from '../lib/gr.ts'
import { ROLES } from '../lib/tables.ts'
import { forbidden, rpError } from '../lib/errors.ts'
import { parseJson, splitList } from '../lib/util.ts'

/**
 * RPAccess: role, portal and page checks.
 *
 * Consumers never read React Portal tables directly (table ACLs only admit studio roles);
 * the runtime services read with GlideRecord after these checks pass.
 */

export type StudioCapability = 'author' | 'design' | 'publish' | 'admin' | 'any'

export function isAdmin(): boolean {
    return gs.hasRole(ROLES.admin)
}

export function hasStudioCapability(cap: StudioCapability): boolean {
    if (gs.hasRole(ROLES.admin)) return true
    switch (cap) {
        case 'author':
            return gs.hasRole(ROLES.developer)
        case 'design':
            return gs.hasRole(ROLES.designer) || gs.hasRole(ROLES.developer)
        case 'publish':
            return gs.hasRole(ROLES.publisher)
        case 'admin':
            return false
        case 'any':
            return gs.hasRole(ROLES.developer) || gs.hasRole(ROLES.designer) || gs.hasRole(ROLES.publisher)
    }
    return false
}

export function requireStudio(cap: StudioCapability): void {
    if (!gs.isLoggedIn()) throw rpError(401, 'unauthenticated', 'Login required')
    if (!hasStudioCapability(cap)) throw forbidden(`Requires React Portal ${cap} access`)
}

/** True when the user holds at least one of the given role names (empty list = everyone). */
export function hasAnyRole(roles: string[]): boolean {
    if (!roles.length) return true
    for (const r of roles) if (gs.hasRole(r)) return true
    return false
}

/** Portal audience: active, logged in, and in `roles` (empty = all authenticated users). */
export function canAccessPortal(portal: GR): boolean {
    if (!portal || !portal.isValidRecord()) return false
    if (!gs.isLoggedIn()) return false
    if (hasStudioCapability('any')) return true
    if (!bool(portal, 'active')) return false
    return hasAnyRole(splitList(str(portal, 'roles')))
}

export interface PageAccessConfig {
    roles?: string[]
}

export function pageAccessConfig(page: GR): PageAccessConfig {
    return parseJson<PageAccessConfig>(str(page, 'access_config_json'), {})
}

export function canAccessPageConfig(cfg: PageAccessConfig): boolean {
    if (hasStudioCapability('any')) return true
    return hasAnyRole(Array.isArray(cfg.roles) ? cfg.roles : [])
}

export function canAccessPage(page: GR): boolean {
    if (!page || !page.isValidRecord()) return false
    if (hasStudioCapability('any')) return true
    if (!bool(page, 'active')) return false
    return canAccessPageConfig(pageAccessConfig(page))
}

export function requirePortalAccess(portal: GR | null): GR {
    if (!gs.isLoggedIn()) throw rpError(401, 'unauthenticated', 'Login required')
    if (!portal || !canAccessPortal(portal)) throw rpError(404, 'portal_not_found', 'Portal not found')
    return portal
}

export function userKey(): string {
    return gs.getUserID()
}
