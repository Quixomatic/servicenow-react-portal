import '@servicenow/sdk/global';
import { CrossScopePrivilege } from '@servicenow/sdk/core';

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
});

/**
 * View rules (src/server/views): the GraphQL resolver reads its arguments through the platform's
 * resolver environment, and view existence is checked on the form-section / list-layout tables.
 * Adopted so they keep working under "enforcing" runtime access tracking.
 */
CrossScopePrivilege({
    $id: Now.ID['csp-graphql-get-arguments'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'ScriptedDataFetchingEnvironment.getArguments',
    targetScope: 'global',
    targetType: 'scriptable',
});

CrossScopePrivilege({
    $id: Now.ID['csp-read-sys-ui-section'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_ui_section',
    targetScope: 'global',
    targetType: 'sys_db_object',
});

CrossScopePrivilege({
    $id: Now.ID['csp-read-sys-ui-list'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_ui_list',
    targetScope: 'global',
    targetType: 'sys_db_object',
});

CrossScopePrivilege({
    $id: Now.ID['csp-read-sys-ui-view'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_ui_view',
    targetScope: 'global',
    targetType: 'sys_db_object',
});
