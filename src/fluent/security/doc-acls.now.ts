import '@servicenow/sdk/global';
import { Acl } from '@servicenow/sdk/core';
import { adminRole } from './roles.now';

/**
 * x_312987_portal_doc (the docs portal's pages). Any logged-in user reads active rows: the docs
 * widgets query them through the Table API with the user's session. Only React Portal admins write
 * (the seed runs as an admin); deleting is admin-only too, and the seed never deletes (it
 * deactivates pages that left docs/guide/).
 */

Acl({
    $id: Now.ID['acl-doc-read'],
    type: 'record',
    table: 'x_312987_portal_doc',
    operation: 'read',
    securityAttribute: 'user_is_authenticated',
    condition: 'active=true',
    adminOverrides: true,
    description: 'React Portal: read active doc pages (logged-in users)',
});

Acl({
    $id: Now.ID['acl-doc-write'],
    type: 'record',
    table: 'x_312987_portal_doc',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on doc page',
});

Acl({
    $id: Now.ID['acl-doc-create'],
    type: 'record',
    table: 'x_312987_portal_doc',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on doc page',
});

Acl({
    $id: Now.ID['acl-doc-delete'],
    type: 'record',
    table: 'x_312987_portal_doc',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on doc page',
});

/*
 * x_312987_portal_doc_collection and x_312987_portal_doc_section: the same pattern. Logged-in users
 * read active rows (the docs widgets build the sidebar and the switcher from them); React Portal
 * admins write. Studio's Docs activity writes through the Studio API (requireStudio('author')).
 */

Acl({
    $id: Now.ID['acl-doc-collection-read'],
    type: 'record',
    table: 'x_312987_portal_doc_collection',
    operation: 'read',
    securityAttribute: 'user_is_authenticated',
    condition: 'active=true',
    adminOverrides: true,
    description: 'React Portal: read active doc collections (logged-in users)',
});

Acl({
    $id: Now.ID['acl-doc-collection-write'],
    type: 'record',
    table: 'x_312987_portal_doc_collection',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on doc collection',
});

Acl({
    $id: Now.ID['acl-doc-collection-create'],
    type: 'record',
    table: 'x_312987_portal_doc_collection',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on doc collection',
});

Acl({
    $id: Now.ID['acl-doc-collection-delete'],
    type: 'record',
    table: 'x_312987_portal_doc_collection',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on doc collection',
});

Acl({
    $id: Now.ID['acl-doc-section-read'],
    type: 'record',
    table: 'x_312987_portal_doc_section',
    operation: 'read',
    securityAttribute: 'user_is_authenticated',
    condition: 'active=true',
    adminOverrides: true,
    description: 'React Portal: read active doc sections (logged-in users)',
});

Acl({
    $id: Now.ID['acl-doc-section-write'],
    type: 'record',
    table: 'x_312987_portal_doc_section',
    operation: 'write',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: write on doc section',
});

Acl({
    $id: Now.ID['acl-doc-section-create'],
    type: 'record',
    table: 'x_312987_portal_doc_section',
    operation: 'create',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: create on doc section',
});

Acl({
    $id: Now.ID['acl-doc-section-delete'],
    type: 'record',
    table: 'x_312987_portal_doc_section',
    operation: 'delete',
    roles: [adminRole],
    adminOverrides: true,
    description: 'React Portal: delete on doc section',
});
