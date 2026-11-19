import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'
import { developerRole, designerRole, publisherRole, adminRole } from './roles.now'

/**
 * Table ACLs. Consumers never read React Portal tables directly: the runtime REST API checks
 * portal/page access (RPAccess) and reads with GlideRecord. Studio roles get table access by duty:
 *   developer: component source, themes        designer: portals, pages, placements, themes
 *   publisher: read (publishing runs through the studio API)    admin: everything (contains all roles)
 * Builds, assets, releases and logs are written only by server services (or admins).
 * Generated from a role matrix; Fluent files can't contain loops, so each ACL is explicit.
 */

/* ---- x_312987_portal_portal ---- */

Acl({
    $id: Now.ID['acl-portal-read'],
    type: 'record',
    table: 'x_312987_portal_portal',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on portal',
})

Acl({
    $id: Now.ID['acl-portal-write'],
    type: 'record',
    table: 'x_312987_portal_portal',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on portal',
})

Acl({
    $id: Now.ID['acl-portal-create'],
    type: 'record',
    table: 'x_312987_portal_portal',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on portal',
})

Acl({
    $id: Now.ID['acl-portal-delete'],
    type: 'record',
    table: 'x_312987_portal_portal',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on portal',
})

/* ---- x_312987_portal_theme ---- */

Acl({
    $id: Now.ID['acl-theme-read'],
    type: 'record',
    table: 'x_312987_portal_theme',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on theme',
})

Acl({
    $id: Now.ID['acl-theme-write'],
    type: 'record',
    table: 'x_312987_portal_theme',
    operation: 'write',
    roles: [developerRole, designerRole],
    adminOverrides: true,
    description: 'React Portal: write on theme',
})

Acl({
    $id: Now.ID['acl-theme-create'],
    type: 'record',
    table: 'x_312987_portal_theme',
    operation: 'create',
    roles: [developerRole, designerRole],
    adminOverrides: true,
    description: 'React Portal: create on theme',
})

Acl({
    $id: Now.ID['acl-theme-delete'],
    type: 'record',
    table: 'x_312987_portal_theme',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on theme',
})

/* ---- x_312987_portal_component ---- */

Acl({
    $id: Now.ID['acl-component-read'],
    type: 'record',
    table: 'x_312987_portal_component',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on component',
})

Acl({
    $id: Now.ID['acl-component-write'],
    type: 'record',
    table: 'x_312987_portal_component',
    operation: 'write',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: write on component',
})

Acl({
    $id: Now.ID['acl-component-create'],
    type: 'record',
    table: 'x_312987_portal_component',
    operation: 'create',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: create on component',
})

Acl({
    $id: Now.ID['acl-component-delete'],
    type: 'record',
    table: 'x_312987_portal_component',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on component',
})

/* ---- x_312987_portal_source_file ---- */

Acl({
    $id: Now.ID['acl-source-file-read-developer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'read',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: read on source_file',
})

Acl({
    $id: Now.ID['acl-source-file-read-designer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'read',
    roles: [designerRole],
    condition: 'themeISNOTEMPTY',
    adminOverrides: true,
    description: 'React Portal: read on source_file (theme source only)',
})

Acl({
    $id: Now.ID['acl-source-file-write-developer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'write',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: write on source_file',
})

Acl({
    $id: Now.ID['acl-source-file-write-designer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'write',
    roles: [designerRole],
    condition: 'themeISNOTEMPTY',
    adminOverrides: true,
    description: 'React Portal: write on source_file (theme source only)',
})

Acl({
    $id: Now.ID['acl-source-file-create-developer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'create',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: create on source_file',
})

Acl({
    $id: Now.ID['acl-source-file-create-designer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'create',
    roles: [designerRole],
    condition: 'themeISNOTEMPTY',
    adminOverrides: true,
    description: 'React Portal: create on source_file (theme source only)',
})

Acl({
    $id: Now.ID['acl-source-file-delete-developer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'delete',
    roles: [developerRole],
    adminOverrides: true,
    description: 'React Portal: delete on source_file',
})

Acl({
    $id: Now.ID['acl-source-file-delete-designer'],
    type: 'record',
    table: 'x_312987_portal_source_file',
    operation: 'delete',
    roles: [designerRole],
    condition: 'themeISNOTEMPTY',
    adminOverrides: true,
    description: 'React Portal: delete on source_file (theme source only)',
})

/* ---- x_312987_portal_page ---- */

Acl({
    $id: Now.ID['acl-page-read'],
    type: 'record',
    table: 'x_312987_portal_page',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on page',
})

Acl({
    $id: Now.ID['acl-page-write'],
    type: 'record',
    table: 'x_312987_portal_page',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on page',
})

Acl({
    $id: Now.ID['acl-page-create'],
    type: 'record',
    table: 'x_312987_portal_page',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on page',
})

Acl({
    $id: Now.ID['acl-page-delete'],
    type: 'record',
    table: 'x_312987_portal_page',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on page',
})

/* ---- x_312987_portal_placement ---- */

Acl({
    $id: Now.ID['acl-placement-read'],
    type: 'record',
    table: 'x_312987_portal_placement',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on placement',
})

Acl({
    $id: Now.ID['acl-placement-write'],
    type: 'record',
    table: 'x_312987_portal_placement',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on placement',
})

Acl({
    $id: Now.ID['acl-placement-create'],
    type: 'record',
    table: 'x_312987_portal_placement',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on placement',
})

Acl({
    $id: Now.ID['acl-placement-delete'],
    type: 'record',
    table: 'x_312987_portal_placement',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on placement',
})

/* ---- x_312987_portal_build ---- */

Acl({
    $id: Now.ID['acl-build-read'],
    type: 'record',
    table: 'x_312987_portal_build',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on build',
})

Acl({
    $id: Now.ID['acl-build-write'],
    type: 'record',
    table: 'x_312987_portal_build',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on build',
})

Acl({
    $id: Now.ID['acl-build-create'],
    type: 'record',
    table: 'x_312987_portal_build',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on build',
})

Acl({
    $id: Now.ID['acl-build-delete'],
    type: 'record',
    table: 'x_312987_portal_build',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on build',
})

/* ---- x_312987_portal_build_asset ---- */

Acl({
    $id: Now.ID['acl-build-asset-read'],
    type: 'record',
    table: 'x_312987_portal_build_asset',
    operation: 'read',
    roles: [developerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on build_asset',
})

Acl({
    $id: Now.ID['acl-build-asset-write'],
    type: 'record',
    table: 'x_312987_portal_build_asset',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on build_asset',
})

Acl({
    $id: Now.ID['acl-build-asset-create'],
    type: 'record',
    table: 'x_312987_portal_build_asset',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on build_asset',
})

Acl({
    $id: Now.ID['acl-build-asset-delete'],
    type: 'record',
    table: 'x_312987_portal_build_asset',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on build_asset',
})

/* ---- x_312987_portal_build_dep ---- */

Acl({
    $id: Now.ID['acl-build-dep-read'],
    type: 'record',
    table: 'x_312987_portal_build_dep',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on build_dep',
})

Acl({
    $id: Now.ID['acl-build-dep-write'],
    type: 'record',
    table: 'x_312987_portal_build_dep',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on build_dep',
})

Acl({
    $id: Now.ID['acl-build-dep-create'],
    type: 'record',
    table: 'x_312987_portal_build_dep',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on build_dep',
})

Acl({
    $id: Now.ID['acl-build-dep-delete'],
    type: 'record',
    table: 'x_312987_portal_build_dep',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on build_dep',
})

/* ---- x_312987_portal_release ---- */

Acl({
    $id: Now.ID['acl-release-read'],
    type: 'record',
    table: 'x_312987_portal_release',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on release',
})

Acl({
    $id: Now.ID['acl-release-write'],
    type: 'record',
    table: 'x_312987_portal_release',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on release',
})

Acl({
    $id: Now.ID['acl-release-create'],
    type: 'record',
    table: 'x_312987_portal_release',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on release',
})

Acl({
    $id: Now.ID['acl-release-delete'],
    type: 'record',
    table: 'x_312987_portal_release',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on release',
})

/* ---- x_312987_portal_release_entry ---- */

Acl({
    $id: Now.ID['acl-release-entry-read'],
    type: 'record',
    table: 'x_312987_portal_release_entry',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on release_entry',
})

Acl({
    $id: Now.ID['acl-release-entry-write'],
    type: 'record',
    table: 'x_312987_portal_release_entry',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on release_entry',
})

Acl({
    $id: Now.ID['acl-release-entry-create'],
    type: 'record',
    table: 'x_312987_portal_release_entry',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on release_entry',
})

Acl({
    $id: Now.ID['acl-release-entry-delete'],
    type: 'record',
    table: 'x_312987_portal_release_entry',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on release_entry',
})

/* ---- x_312987_portal_execution_log ---- */

Acl({
    $id: Now.ID['acl-execution-log-read'],
    type: 'record',
    table: 'x_312987_portal_execution_log',
    operation: 'read',
    roles: [developerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on execution_log',
})

Acl({
    $id: Now.ID['acl-execution-log-write'],
    type: 'record',
    table: 'x_312987_portal_execution_log',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on execution_log',
})

Acl({
    $id: Now.ID['acl-execution-log-create'],
    type: 'record',
    table: 'x_312987_portal_execution_log',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on execution_log',
})

Acl({
    $id: Now.ID['acl-execution-log-delete'],
    type: 'record',
    table: 'x_312987_portal_execution_log',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on execution_log',
})

/* ---- x_312987_portal_menu ---- */

Acl({
    $id: Now.ID['acl-menu-read'],
    type: 'record',
    table: 'x_312987_portal_menu',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on menu',
})

Acl({
    $id: Now.ID['acl-menu-write'],
    type: 'record',
    table: 'x_312987_portal_menu',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on menu',
})

Acl({
    $id: Now.ID['acl-menu-create'],
    type: 'record',
    table: 'x_312987_portal_menu',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on menu',
})

Acl({
    $id: Now.ID['acl-menu-delete'],
    type: 'record',
    table: 'x_312987_portal_menu',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on menu',
})

/* ---- x_312987_portal_menu_item ---- */

Acl({
    $id: Now.ID['acl-menu-item-read'],
    type: 'record',
    table: 'x_312987_portal_menu_item',
    operation: 'read',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal: read on menu_item',
})

Acl({
    $id: Now.ID['acl-menu-item-write'],
    type: 'record',
    table: 'x_312987_portal_menu_item',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on menu_item',
})

Acl({
    $id: Now.ID['acl-menu-item-create'],
    type: 'record',
    table: 'x_312987_portal_menu_item',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on menu_item',
})

Acl({
    $id: Now.ID['acl-menu-item-delete'],
    type: 'record',
    table: 'x_312987_portal_menu_item',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on menu_item',
})
