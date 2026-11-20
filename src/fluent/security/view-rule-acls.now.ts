import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'
import { developerRole, designerRole, publisherRole, adminRole } from './roles.now'

/**
 * View rule ACLs.
 * - The rule and audience tables are studio-only, like every React Portal table: customers never
 *   read rule rows; the resolver reads them server-side after its own checks.
 * - The answer table (a remote table of computed rows) is readable by any authenticated user: a
 *   row only carries the caller's own resolution. It stores nothing and can't be written.
 * Fluent files can't contain loops, so each ACL is explicit.
 */

/* ---- x_312987_portal_view_rule ---- */

Acl({
    $id: Now.ID['acl-view-rule-read'],
    type: 'record',
    table: 'x_312987_portal_view_rule',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on view_rule',
})

Acl({
    $id: Now.ID['acl-view-rule-write'],
    type: 'record',
    table: 'x_312987_portal_view_rule',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on view_rule',
})

Acl({
    $id: Now.ID['acl-view-rule-create'],
    type: 'record',
    table: 'x_312987_portal_view_rule',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on view_rule',
})

Acl({
    $id: Now.ID['acl-view-rule-delete'],
    type: 'record',
    table: 'x_312987_portal_view_rule',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on view_rule',
})

/** Advanced scripts run on the server: only developers (and admins) write them. */
Acl({
    $id: Now.ID['acl-view-rule-script-write'],
    type: 'record',
    table: 'x_312987_portal_view_rule',
    field: 'script',
    operation: 'write',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: write on view_rule.script',
})

/* ---- x_312987_portal_vrule_uc ---- */

Acl({
    $id: Now.ID['acl-vrule-uc-read'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on vrule_uc',
})

Acl({
    $id: Now.ID['acl-vrule-uc-write'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on vrule_uc',
})

Acl({
    $id: Now.ID['acl-vrule-uc-create'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on vrule_uc',
})

Acl({
    $id: Now.ID['acl-vrule-uc-delete'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on vrule_uc',
})

/* ---- x_312987_portal_vrule_uc_no ---- */

Acl({
    $id: Now.ID['acl-vrule-uc-no-read'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc_no',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on vrule_uc_no',
})

Acl({
    $id: Now.ID['acl-vrule-uc-no-write'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc_no',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on vrule_uc_no',
})

Acl({
    $id: Now.ID['acl-vrule-uc-no-create'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc_no',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on vrule_uc_no',
})

Acl({
    $id: Now.ID['acl-vrule-uc-no-delete'],
    type: 'record',
    table: 'x_312987_portal_vrule_uc_no',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on vrule_uc_no',
})

/* ---- x_312987_portal_view_answer (remote table, computed rows) ---- */

Acl({
    $id: Now.ID['acl-view-answer-read'],
    type: 'record',
    table: 'x_312987_portal_view_answer',
    operation: 'read',
    securityAttribute: 'user_is_authenticated',
    adminOverrides: true,
    description: "React Portal: read on view_answer (any authenticated user; a row is the caller's own view resolution)",
})

Acl({
    $id: Now.ID['acl-view-answer-read-fields'],
    type: 'record',
    table: 'x_312987_portal_view_answer',
    field: '*',
    operation: 'read',
    securityAttribute: 'user_is_authenticated',
    adminOverrides: true,
    description: 'React Portal: read on view_answer.* (any authenticated user)',
})

Acl({
    $id: Now.ID['acl-view-answer-write'],
    type: 'record',
    table: 'x_312987_portal_view_answer',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on view_answer (nobody; computed rows)',
})

Acl({
    $id: Now.ID['acl-view-answer-create'],
    type: 'record',
    table: 'x_312987_portal_view_answer',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on view_answer (nobody; computed rows)',
})

Acl({
    $id: Now.ID['acl-view-answer-delete'],
    type: 'record',
    table: 'x_312987_portal_view_answer',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on view_answer (nobody; computed rows)',
})
