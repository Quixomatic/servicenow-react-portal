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

/** One compiled output file of a build, delivered by the runtime asset API. */
export const x_312987_portal_build_asset = Table({
    name: 'x_312987_portal_build_asset',
    extends: 'sys_metadata',
    label: 'Build Asset',
    display: 'path',
    allowWebServiceAccess: true,
    schema: {
        build: ReferenceColumn({
            label: 'Build',
            referenceTable: 'x_312987_portal_build',
            mandatory: true,
            cascadeRule: 'cascade',
        }),
        path: StringColumn({ label: 'Path', maxLength: 200, mandatory: true }),
        kind: ChoiceColumn({
            label: 'Kind',
            dropdown: 'dropdown_without_none',
            default: 'js',
            choices: {
                js: { label: 'JavaScript', sequence: 0 },
                css: { label: 'CSS', sequence: 1 },
                map: { label: 'Source map', sequence: 2 },
                wasm: { label: 'WASM', sequence: 3 },
                other: { label: 'Other', sequence: 4 },
            },
        }),
        mime_type: StringColumn({ label: 'MIME type', maxLength: 100 }),
        hash: StringColumn({ label: 'Hash', maxLength: 64, readOnly: true }),
        byte_length: IntegerColumn({ label: 'Bytes', readOnly: true }),
        content: MultiLineTextColumn({ label: 'Content', maxLength: 5000000 }),
    },
    index: [{ name: 'rp_asset_build_path', element: ['build', 'path'], unique: true }],
});

Form({
    table: 'x_312987_portal_build_asset',
    view: default_view,
    sections: [
        {
            caption: 'Build Asset',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'build', type: 'table_field' },
                        { field: 'path', type: 'table_field' },
                        { field: 'kind', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'mime_type', type: 'table_field' },
                        { field: 'byte_length', type: 'table_field' },
                        { field: 'hash', type: 'table_field' },
                    ],
                },
                { layout: 'one-column', elements: [{ field: 'content', type: 'table_field' }] },
            ],
        },
    ],
});
