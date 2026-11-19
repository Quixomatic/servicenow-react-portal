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

/**
 * A widget placed in a layout region. Owner is a page (page-level placement) or, when page
 * is empty, the portal itself (portal-level: header/sidebar/footer, mounted across navigation).
 * Spec name: widget_instance (shortened to fit the 30-character table name limit).
 */
export const x_312987_portal_placement = Table({
    name: 'x_312987_portal_placement',
    extends: 'sys_metadata',
    label: 'Placement',
    display: 'region',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        portal: ReferenceColumn({ label: 'Portal', referenceTable: 'x_312987_portal_portal', cascadeRule: 'cascade' }),
        page: ReferenceColumn({
            label: 'Page',
            referenceTable: 'x_312987_portal_page',
            cascadeRule: 'cascade',
            hint: 'Empty = portal-level placement',
        }),
        owner_key: StringColumn({ label: 'Owner key', maxLength: 80, readOnly: true }),
        region: StringColumn({ label: 'Region', maxLength: 40, mandatory: true, default: 'main' }),
        component: ReferenceColumn({
            label: 'Component',
            referenceTable: 'x_312987_portal_component',
            referenceQual: 'kind=widget^placeable=true',
            mandatory: true,
            cascadeRule: 'restrict',
        }),
        parent: ReferenceColumn({ label: 'Parent placement', referenceTable: 'x_312987_portal_placement', cascadeRule: 'cascade' }),
        order: IntegerColumn({ label: 'Order', default: 100 }),
        active: BooleanColumn({ label: 'Active', default: true }),
        options_json: JsonColumn({ label: 'Options', maxLength: 65000 }),
        style_tokens_json: JsonColumn({ label: 'Style tokens', maxLength: 8000 }),
        visibility_config_json: JsonColumn({ label: 'Visibility', maxLength: 8000 }),
    },
    index: [{ name: 'rp_placement_owner_region', element: ['owner_key', 'region', 'order'], unique: false }],
})

Form({
    table: 'x_312987_portal_placement',
    view: default_view,
    sections: [
        {
            caption: 'Placement',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'page', type: 'table_field' },
                        { field: 'region', type: 'table_field' },
                        { field: 'component', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'parent', type: 'table_field' },
                        { field: 'order', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                        { field: 'owner_key', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'options_json', type: 'table_field' },
                        { field: 'style_tokens_json', type: 'table_field' },
                        { field: 'visibility_config_json', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
})
