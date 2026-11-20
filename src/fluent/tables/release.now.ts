import '@servicenow/sdk/global';
import {
    Table,
    Form,
    default_view,
    StringColumn,
    ReferenceColumn,
    JsonColumn,
    IntegerColumn,
    DateTimeColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core';

/**
 * The compiled form of a portal: exactly one record per portal holding its manifest
 * (theme, layouts, pages, placements, build URLs). Reprocessed automatically whenever the
 * portal's inputs change (portal, pages, placements, theme, components, builds). The runtime
 * serves this record; there is no release history — reverting inputs reprocesses it.
 */
export const x_312987_portal_release = Table({
    name: 'x_312987_portal_release',
    extends: 'sys_metadata',
    label: 'Release',
    display: 'portal',
    allowWebServiceAccess: true,
    schema: {
        portal: ReferenceColumn({
            label: 'Portal',
            referenceTable: 'x_312987_portal_portal',
            mandatory: true,
            unique: true,
            cascadeRule: 'cascade',
        }),
        revision: IntegerColumn({
            label: 'Revision',
            readOnly: true,
            default: 0,
            hint: 'Increments each time the manifest changes',
        }),
        manifest_json: JsonColumn({ label: 'Manifest', maxLength: 4000000, readOnly: true }),
        manifest_hash: StringColumn({ label: 'Manifest hash', maxLength: 64, readOnly: true }),
        host_abi: StringColumn({ label: 'Host ABI', maxLength: 40, readOnly: true }),
        problems_json: JsonColumn({
            label: 'Problems',
            maxLength: 65000,
            readOnly: true,
            hint: 'e.g. components without compiled output',
        }),
        processed_at: DateTimeColumn({ label: 'Processed', readOnly: true }),
        processed_by: ReferenceColumn({
            label: 'Processed by',
            referenceTable: 'sys_user',
            readOnly: true,
            cascadeRule: 'clear',
        }),
        notes: MultiLineTextColumn({ label: 'Notes', maxLength: 4000 }),
    },
});

Form({
    table: 'x_312987_portal_release',
    view: default_view,
    sections: [
        {
            caption: 'Release',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'revision', type: 'table_field' },
                        { field: 'host_abi', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'processed_at', type: 'table_field' },
                        { field: 'processed_by', type: 'table_field' },
                        { field: 'manifest_hash', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'problems_json', type: 'table_field' },
                        { field: 'notes', type: 'table_field' },
                        { field: 'manifest_json', type: 'table_field' },
                    ],
                },
            ],
        },
        {
            caption: 'Entries',
            content: [
                {
                    layout: 'one-column',
                    elements: [{ type: 'list', listType: '12M', listRef: 'x_312987_portal_release_entry.release' }],
                },
            ],
        },
    ],
});
