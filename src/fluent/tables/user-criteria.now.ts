import '@servicenow/sdk/global';
import { Table, Form, default_view, ReferenceColumn } from '@servicenow/sdk/core';

/**
 * User criteria (user_criteria) for portals, pages and menu items: the platform's many-to-many
 * "Available for" / "Not available for" pattern (as sc_cat_item_user_criteria_mtom / _no_mtom,
 * kb_uc_can_read_mtom / kb_uc_cannot_read_mtom and Employee Center's sn_ex_sp_* tables).
 *
 * Semantics (src/server/security/access.ts): allowed = (no "Available for" rows, or the user
 * matches any of them) AND the user matches none of the "Not available for" rows.
 *
 * The rows are evaluated live per request (never stored in the release manifest), so changing them
 * needs no release reprocess. Like the records they point at, the tables extend sys_metadata, so
 * the rows travel with the application (and are listed in now.config.json ignoreTransformTableList).
 * Table names stay within 30 characters, hence `item_uc` for menu items.
 */

/* ---- Portal ---- */

export const x_312987_portal_portal_uc = Table({
    name: 'x_312987_portal_portal_uc',
    extends: 'sys_metadata',
    label: [{ label: 'Portal Available For', plural: 'Portal Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        portal: ReferenceColumn({
            label: 'Portal',
            referenceTable: 'x_312987_portal_portal',
            mandatory: true,
            cascadeRule: 'delete',
        }),
        user_criteria: ReferenceColumn({
            label: 'Available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_portal_uc', element: ['portal', 'user_criteria'], unique: true }],
});

export const x_312987_portal_portal_uc_no = Table({
    name: 'x_312987_portal_portal_uc_no',
    extends: 'sys_metadata',
    label: [{ label: 'Portal Not Available For', plural: 'Portal Not Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        portal: ReferenceColumn({
            label: 'Portal',
            referenceTable: 'x_312987_portal_portal',
            mandatory: true,
            cascadeRule: 'delete',
        }),
        user_criteria: ReferenceColumn({
            label: 'Not available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_portal_uc_no', element: ['portal', 'user_criteria'], unique: true }],
});

/* ---- Page ---- */

export const x_312987_portal_page_uc = Table({
    name: 'x_312987_portal_page_uc',
    extends: 'sys_metadata',
    label: [{ label: 'Page Available For', plural: 'Page Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        page: ReferenceColumn({
            label: 'Page',
            referenceTable: 'x_312987_portal_page',
            mandatory: true,
            cascadeRule: 'delete',
        }),
        user_criteria: ReferenceColumn({
            label: 'Available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_page_uc', element: ['page', 'user_criteria'], unique: true }],
});

export const x_312987_portal_page_uc_no = Table({
    name: 'x_312987_portal_page_uc_no',
    extends: 'sys_metadata',
    label: [{ label: 'Page Not Available For', plural: 'Page Not Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        page: ReferenceColumn({
            label: 'Page',
            referenceTable: 'x_312987_portal_page',
            mandatory: true,
            cascadeRule: 'delete',
        }),
        user_criteria: ReferenceColumn({
            label: 'Not available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_page_uc_no', element: ['page', 'user_criteria'], unique: true }],
});

/* ---- Menu item ---- */

export const x_312987_portal_item_uc = Table({
    name: 'x_312987_portal_item_uc',
    extends: 'sys_metadata',
    label: [{ label: 'Menu Item Available For', plural: 'Menu Item Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        menu_item: ReferenceColumn({
            label: 'Menu item',
            referenceTable: 'x_312987_portal_menu_item',
            mandatory: true,
            cascadeRule: 'delete',
        }),
        user_criteria: ReferenceColumn({
            label: 'Available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_item_uc', element: ['menu_item', 'user_criteria'], unique: true }],
});

export const x_312987_portal_item_uc_no = Table({
    name: 'x_312987_portal_item_uc_no',
    extends: 'sys_metadata',
    label: [{ label: 'Menu Item Not Available For', plural: 'Menu Item Not Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        menu_item: ReferenceColumn({
            label: 'Menu item',
            referenceTable: 'x_312987_portal_menu_item',
            mandatory: true,
            cascadeRule: 'delete',
        }),
        user_criteria: ReferenceColumn({
            label: 'Not available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_item_uc_no', element: ['menu_item', 'user_criteria'], unique: true }],
});

/* ---- Forms (one section: the owner and the criterion) ---- */

Form({
    table: 'x_312987_portal_portal_uc',
    view: default_view,
    sections: [
        {
            caption: 'Portal Available For',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'user_criteria', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

Form({
    table: 'x_312987_portal_portal_uc_no',
    view: default_view,
    sections: [
        {
            caption: 'Portal Not Available For',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'user_criteria', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

Form({
    table: 'x_312987_portal_page_uc',
    view: default_view,
    sections: [
        {
            caption: 'Page Available For',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'page', type: 'table_field' },
                        { field: 'user_criteria', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

Form({
    table: 'x_312987_portal_page_uc_no',
    view: default_view,
    sections: [
        {
            caption: 'Page Not Available For',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'page', type: 'table_field' },
                        { field: 'user_criteria', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

Form({
    table: 'x_312987_portal_item_uc',
    view: default_view,
    sections: [
        {
            caption: 'Menu Item Available For',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'menu_item', type: 'table_field' },
                        { field: 'user_criteria', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

Form({
    table: 'x_312987_portal_item_uc_no',
    view: default_view,
    sections: [
        {
            caption: 'Menu Item Not Available For',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'menu_item', type: 'table_field' },
                        { field: 'user_criteria', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

// Related lists (Available for / Not available for on the portal, page and menu item forms) live in
// related-lists.now.ts with every other parent → child list.
