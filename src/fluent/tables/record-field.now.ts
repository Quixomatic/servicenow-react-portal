import '@servicenow/sdk/global';
import {
    Table,
    Form,
    List,
    default_view,
    StringColumn,
    BooleanColumn,
    IntegerColumn,
    ChoiceColumn,
    ListColumn,
    UserRolesColumn,
    TableNameColumn,
    FieldNameColumn,
} from '@servicenow/sdk/core';

/**
 * Record header fields: which fields app/record-header (title, subtitle, highlighted-value pills)
 * and app/record-ribbon show for a table (src/server/views/record-fields.ts).
 *
 * - Per slot, the most specific matching rows win: the record's exact table beats a parent table
 *   (incident beats task), then rows listing the portal beat all-portal rows (portals empty), then
 *   order. Pill / ribbon: every row of that group; title / subtitle: its first row.
 * - The winning rows REPLACE the slot's built-in default; a slot with no rows keeps the default.
 * - Roles (any of): rows the user lacks the roles for are ignored.
 * - Highlight colours stay the platform's highlighted-value rules (sys_highlighted_value).
 * - Like view rules and menus, rows extend sys_metadata so they travel with the application
 *   (listed in now.config.json ignoreTransformTableList). The shipped defaults are demo records
 *   (record-field-defaults.now.ts).
 */
export const x_312987_portal_record_field = Table({
    name: 'x_312987_portal_record_field',
    extends: 'sys_metadata',
    label: [{ label: 'Record Header Field', plural: 'Record Header Fields', language: 'en' }],
    display: 'field',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        table: TableNameColumn({
            label: 'Table',
            mandatory: true,
            hint: 'Applies to this table and its child tables (rows on task apply to incident unless incident has its own)',
        }),
        slot: ChoiceColumn({
            label: 'Slot',
            mandatory: true,
            default: 'ribbon',
            dropdown: 'dropdown_without_none',
            choices: {
                title: { label: 'Title', sequence: 0 },
                subtitle: { label: 'Subtitle', sequence: 1 },
                pill: { label: 'Pill', sequence: 2 },
                ribbon: { label: 'Ribbon', sequence: 3 },
            },
            hint: 'Title / subtitle: the first row wins. Pill / ribbon: every row, by order.',
        }),
        field: FieldNameColumn({
            label: 'Field',
            mandatory: true,
            dependent: 'table',
            maxLength: 160,
            attributes: { allow_references: true },
            hint: 'Ribbon fields may dot-walk (caller_id.department); other slots take a field of the table',
        }),
        label: StringColumn({ label: 'Label', maxLength: 100, hint: "Empty = the field's label" }),
        order: IntegerColumn({ label: 'Order', default: 100, hint: 'Lower first' }),
        portals: ListColumn({
            label: 'Portals',
            referenceTable: 'x_312987_portal_portal',
            hint: 'Empty = every portal. Rows listing the portal beat all-portal rows.',
        }),
        roles: UserRolesColumn({ label: 'Roles', hint: 'Empty = everyone; else only users with any of these roles' }),
        active: BooleanColumn({ label: 'Active', default: true }),
    },
    index: [{ name: 'rp_record_field_lookup', element: ['table', 'active', 'slot', 'order'], unique: false }],
});

Form({
    table: 'x_312987_portal_record_field',
    view: default_view,
    sections: [
        {
            caption: 'Record header field',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'table', type: 'table_field' },
                        { field: 'slot', type: 'table_field' },
                        { field: 'field', type: 'table_field' },
                        { field: 'label', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'order', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                        { field: 'portals', type: 'table_field' },
                        { field: 'roles', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});

List({
    table: 'x_312987_portal_record_field',
    view: default_view,
    columns: ['table', 'slot', 'field', 'label', 'order', 'portals', 'roles', 'active'],
});
