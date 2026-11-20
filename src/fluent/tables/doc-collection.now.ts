import '@servicenow/sdk/global';
import { Table, Form, default_view, StringColumn, BooleanColumn } from '@servicenow/sdk/core';

/**
 * A docs collection: one independent set of doc sections and pages (x_312987_portal_doc_section,
 * x_312987_portal_doc). React Portal's own guide (docs/guide) is the collection `react-portal`;
 * other collections are instance-only for now (the docs seed never touches them).
 *
 * A docs portal points at one or more collections with settings_json.docsCollections (keys; the
 * first is the default). Several portals may share a collection. Content, not application metadata:
 * rows don't extend sys_metadata, so they never travel in the app package or update sets.
 */
export const x_312987_portal_doc_collection = Table({
    name: 'x_312987_portal_doc_collection',
    label: [{ label: 'Doc Collection', plural: 'Doc Collections', language: 'en' }],
    display: 'title',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    schema: {
        key: StringColumn({
            label: 'Key',
            maxLength: 60,
            mandatory: true,
            hint: 'Lower-case slug used in portal settings (docsCollections) and URLs, e.g. react-portal',
        }),
        title: StringColumn({ label: 'Title', maxLength: 120, mandatory: true }),
        description: StringColumn({ label: 'Description', maxLength: 500, hint: 'Shown in the docs switcher' }),
        icon: StringColumn({ label: 'Icon', maxLength: 80, hint: 'Lucide icon name for the docs switcher' }),
        active: BooleanColumn({ label: 'Active', default: true }),
    },
    index: [{ name: 'rp_doc_collection_key', element: 'key', unique: true }],
});

Form({
    table: 'x_312987_portal_doc_collection',
    view: default_view,
    sections: [
        {
            caption: 'Doc collection',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'title', type: 'table_field' },
                        { field: 'key', type: 'table_field' },
                        { field: 'icon', type: 'table_field' },
                    ],
                    rightElements: [{ field: 'active', type: 'table_field' }],
                },
                {
                    layout: 'one-column',
                    elements: [{ field: 'description', type: 'table_field' }],
                },
            ],
        },
    ],
});
