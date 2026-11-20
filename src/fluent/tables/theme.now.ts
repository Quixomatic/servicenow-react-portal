import '@servicenow/sdk/global';
import {
    Table,
    Form,
    default_view,
    StringColumn,
    BooleanColumn,
    JsonColumn,
    IntegerColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core';

/** Always-loaded portal styling: design tokens plus a stylesheet. */
export const x_312987_portal_theme = Table({
    name: 'x_312987_portal_theme',
    extends: 'sys_metadata',
    label: 'Theme',
    display: 'name',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    schema: {
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        key: StringColumn({ label: 'Key', maxLength: 80, unique: true, hint: 'Derived from the name when empty' }),
        description: MultiLineTextColumn({ label: 'Description', maxLength: 1000 }),
        active: BooleanColumn({ label: 'Active', default: true }),
        tokens_json: JsonColumn({
            label: 'Tokens',
            maxLength: 65000,
            hint: 'CSS custom properties, e.g. {"primary": "oklch(0.55 0.2 260)"}',
        }),
        stylesheet: MultiLineTextColumn({ label: 'Stylesheet', maxLength: 1000000 }),
        source_revision: IntegerColumn({ label: 'Source revision', readOnly: true, default: 1 }),
    },
});

Form({
    table: 'x_312987_portal_theme',
    view: default_view,
    sections: [
        {
            caption: 'Theme',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'name', type: 'table_field' },
                        { field: 'key', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                    ],
                    rightElements: [{ field: 'source_revision', type: 'table_field' }],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'description', type: 'table_field' },
                        { field: 'tokens_json', type: 'table_field' },
                        { field: 'stylesheet', type: 'table_field' },
                    ],
                },
            ],
        },
        {
            caption: 'Build',
            content: [
                {
                    layout: 'one-column',
                    elements: [{ type: 'list', listType: '12M', listRef: 'x_312987_portal_build.theme' }],
                },
            ],
        },
    ],
});
