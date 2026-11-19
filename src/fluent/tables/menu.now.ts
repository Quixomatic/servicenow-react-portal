import '@servicenow/sdk/global'
import { Table, Form, default_view, StringColumn, BooleanColumn, ReferenceColumn, MultiLineTextColumn } from '@servicenow/sdk/core'

/**
 * A portal menu (primary, footer, account, …). Menus belong to exactly one portal, like pages:
 * page items point at that portal's pages. Items live in x_312987_portal_menu_item.
 */
export const x_312987_portal_menu = Table({
    name: 'x_312987_portal_menu',
    extends: 'sys_metadata',
    label: 'Menu',
    display: 'name',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        portal: ReferenceColumn({ label: 'Portal', referenceTable: 'x_312987_portal_portal', mandatory: true, cascadeRule: 'cascade' }),
        key: StringColumn({
            label: 'Key',
            maxLength: 40,
            mandatory: true,
            hint: 'Lower-case slug, unique per portal: primary, footer, account…',
        }),
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        description: MultiLineTextColumn({ label: 'Description', maxLength: 1000 }),
        active: BooleanColumn({ label: 'Active', default: true }),
    },
    index: [{ name: 'rp_menu_portal_key', element: ['portal', 'key'], unique: true }],
})

Form({
    table: 'x_312987_portal_menu',
    view: default_view,
    sections: [
        {
            caption: 'Menu',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'key', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'name', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                    ],
                },
                { layout: 'one-column', elements: [{ field: 'description', type: 'table_field' }] },
            ],
        },
    ],
})
