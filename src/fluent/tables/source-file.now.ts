import '@servicenow/sdk/global';
import {
    Table,
    Form,
    default_view,
    StringColumn,
    ReferenceColumn,
    IntegerColumn,
    ChoiceColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core';

/** Source files of a component or theme (exactly one owner). */
export const x_312987_portal_source_file = Table({
    name: 'x_312987_portal_source_file',
    extends: 'sys_metadata',
    label: 'Source File',
    display: 'path',
    allowWebServiceAccess: true,
    schema: {
        component: ReferenceColumn({
            label: 'Component',
            referenceTable: 'x_312987_portal_component',
            cascadeRule: 'cascade',
        }),
        theme: ReferenceColumn({ label: 'Theme', referenceTable: 'x_312987_portal_theme', cascadeRule: 'cascade' }),
        owner_key: StringColumn({ label: 'Owner key', maxLength: 80, readOnly: true }),
        path: StringColumn({ label: 'Path', maxLength: 255, mandatory: true }),
        target: ChoiceColumn({
            label: 'Target',
            default: 'client',
            dropdown: 'dropdown_without_none',
            choices: {
                client: { label: 'Client', sequence: 0 },
                server: { label: 'Server', sequence: 1 },
                style: { label: 'Style', sequence: 2 },
                asset: { label: 'Asset', sequence: 3 },
            },
        }),
        content_text: MultiLineTextColumn({ label: 'Content', maxLength: 1000000 }),
        encoding: ChoiceColumn({
            label: 'Encoding',
            default: 'utf8',
            dropdown: 'dropdown_without_none',
            choices: { utf8: { label: 'UTF-8' }, base64: { label: 'Base64' } },
        }),
        mime_type: StringColumn({ label: 'MIME type', maxLength: 100 }),
        content_hash: StringColumn({ label: 'Content hash', maxLength: 64, readOnly: true }),
        byte_length: IntegerColumn({ label: 'Bytes', readOnly: true }),
        revision: IntegerColumn({ label: 'Revision', readOnly: true, default: 1 }),
    },
    index: [{ name: 'rp_source_owner_path', element: ['owner_key', 'path'], unique: true }],
});

Form({
    table: 'x_312987_portal_source_file',
    view: default_view,
    sections: [
        {
            caption: 'Source File',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'component', type: 'table_field' },
                        { field: 'theme', type: 'table_field' },
                        { field: 'path', type: 'table_field' },
                        { field: 'target', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'encoding', type: 'table_field' },
                        { field: 'mime_type', type: 'table_field' },
                        { field: 'revision', type: 'table_field' },
                        { field: 'byte_length', type: 'table_field' },
                        { field: 'content_hash', type: 'table_field' },
                        { field: 'owner_key', type: 'table_field' },
                    ],
                },
                { layout: 'one-column', elements: [{ field: 'content_text', type: 'table_field' }] },
            ],
        },
    ],
});
