import '@servicenow/sdk/global'
import { CrossScopePrivilege } from '@servicenow/sdk/core'

/**
 * Execute access to global.ReactPortalGlobal (the global helper app in packages/global-helpers):
 * session message drain, impersonation name, clearClientData. Adopts the privilege the platform
 * created on the first call under permissive runtime access tracking, so it's versioned and still
 * works under "enforcing".
 */
CrossScopePrivilege({
    $id: Now.ID['csp-react-portal-global'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'ReactPortalGlobal',
    targetScope: 'global',
    targetType: 'sys_script_include',
})
