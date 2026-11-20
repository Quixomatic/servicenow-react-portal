import '@servicenow/sdk/global';
import { Acl } from '@servicenow/sdk/core';
import { designerRole } from './roles.now';

/**
 * Record header field ACLs (x_312987_portal_record_field).
 * - Read: any authenticated user (the user_is_authenticated security attribute; an empty ACL denies
 *   on this release). Rows name fields, not data: values are always read as the user.
 * - Write / create / delete: designers (and admins), like view rules.
 * Fluent files can't contain loops, so each ACL is explicit.
 */

Acl({
    $id: Now.ID['acl-record-field-read'],
    type: 'record',
    table: 'x_312987_portal_record_field',
    operation: 'read',
    securityAttribute: 'user_is_authenticated',
    adminOverrides: true,
    description: 'React Portal: read on record_field (any authenticated user; configuration, no data)',
});

Acl({
    $id: Now.ID['acl-record-field-write'],
    type: 'record',
    table: 'x_312987_portal_record_field',
    operation: 'write',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: write on record_field',
});

Acl({
    $id: Now.ID['acl-record-field-create'],
    type: 'record',
    table: 'x_312987_portal_record_field',
    operation: 'create',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: create on record_field',
});

Acl({
    $id: Now.ID['acl-record-field-delete'],
    type: 'record',
    table: 'x_312987_portal_record_field',
    operation: 'delete',
    roles: [designerRole],
    adminOverrides: true,
    description: 'React Portal: delete on record_field',
});
