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
