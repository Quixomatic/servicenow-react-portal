import '@servicenow/sdk/global'
import {
    Table,
    Form,
    default_view,
    StringColumn,
    BooleanColumn,
    ReferenceColumn,
    JsonColumn,
    IntegerColumn,
} from '@servicenow/sdk/core'

/** A portal page. Portal A's "/" and portal B's "/" are different rows. */
export const x_312987_portal_page = Table({
    name: 'x_312987_portal_page',
    extends: 'sys_metadata',
    label: 'Page',
    display: 'name',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        portal: ReferenceColumn({ label: 'Portal', referenceTable: 'x_312987_portal_portal', mandatory: true, cascadeRule: 'cascade' }),
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        route_pattern: StringColumn({
            label: 'Route',
            maxLength: 255,
            hint: '"" = home; "orders", "orders/:id", "docs/*"',
        }),
        title: StringColumn({ label: 'Title', maxLength: 200 }),
        layout_override: ReferenceColumn({
            label: 'Layout override',
            referenceTable: 'x_312987_portal_component',
            referenceQual: 'kind=layout^active=true',
            cascadeRule: 'restrict',
        }),
        access_config_json: JsonColumn({ label: 'Access', maxLength: 4000, hint: '{"roles": ["itil"]}; empty = portal audience' }),
        order: IntegerColumn({ label: 'Order', default: 100 }),
        active: BooleanColumn({ label: 'Active', default: true }),
    },
    index: [{ name: 'rp_page_portal_route', element: ['portal', 'route_pattern'], unique: true }],
})

Form({
    table: 'x_312987_portal_page',
    view: default_view,
    sections: [
        {
            caption: 'Page',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'name', type: 'table_field' },
                        { field: 'route_pattern', type: 'table_field' },
                        { field: 'title', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'layout_override', type: 'table_field' },
                        { field: 'order', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                    ],
                },
                { layout: 'one-column', elements: [{ field: 'access_config_json', type: 'table_field' }] },
            ],
        },
    ],
})
