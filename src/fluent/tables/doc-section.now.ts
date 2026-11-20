import '@servicenow/sdk/global';
import {
    Table,
    Form,
    default_view,
    StringColumn,
    BooleanColumn,
    IntegerColumn,
    ReferenceColumn,
    ChoiceColumn,
} from '@servicenow/sdk/core';

/**
 * A sidebar section of a docs collection (x_312987_portal_doc_collection). Pages point at it with
 * x_312987_portal_doc.doc_section. Renaming or reordering a section edits this row only.
 *
 * For `react-portal`, the docs seed writes sections from docs/guide/_nav.json (title, slug, order)
 * and scripts/seed/docs-icons.json (icon), with the same source-of-truth rule as pages: a section
 * edited in Studio (content_hash ≠ seed_hash, or origin studio) is kept until `npm run docs:pull`
 * writes it back. content_hash = sectionHash() in src/server/docs/docs-text.ts.
 */
export const x_312987_portal_doc_section = Table({
    name: 'x_312987_portal_doc_section',
    label: [{ label: 'Doc Section', plural: 'Doc Sections', language: 'en' }],
    display: 'title',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    schema: {
        collection: ReferenceColumn({
            label: 'Collection',
            referenceTable: 'x_312987_portal_doc_collection',
            mandatory: true,
            cascadeRule: 'restrict',
        }),
        slug: StringColumn({
            label: 'Slug',
            maxLength: 80,
            mandatory: true,
            hint: 'Lower-case slug, unique per collection (the _nav.json section slug)',
        }),
        title: StringColumn({ label: 'Title', maxLength: 100, mandatory: true }),
        order: IntegerColumn({ label: 'Order', default: 100, hint: 'Position in the sidebar: (index + 1) * 100' }),
        icon: StringColumn({
            label: 'Icon',
            maxLength: 80,
            hint: "Lucide icon name: the default of the section's pages",
        }),
        active: BooleanColumn({ label: 'Active', default: true }),
        origin: ChoiceColumn({
            label: 'Origin',
            default: 'repo',
            dropdown: 'dropdown_without_none',
            choices: {
                repo: { label: 'Repository (docs/guide)', sequence: 0 },
                studio: { label: 'Studio (not yet pulled into the repo)', sequence: 1 },
            },
        }),
        content_hash: StringColumn({ label: 'Content hash', maxLength: 64, readOnly: true }),
        seed_hash: StringColumn({
            label: 'Seed hash',
            maxLength: 64,
            readOnly: true,
            hint: 'content_hash as last written by the docs seed (differs from content_hash = edited in Studio)',
        }),
    },
    index: [{ name: 'rp_doc_section_collection_slug', element: ['collection', 'slug'], unique: true }],
});

Form({
    table: 'x_312987_portal_doc_section',
    view: default_view,
    sections: [
        {
            caption: 'Doc section',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'collection', type: 'table_field' },
                        { field: 'title', type: 'table_field' },
                        { field: 'slug', type: 'table_field' },
                        { field: 'icon', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'order', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                        { field: 'origin', type: 'table_field' },
                        { field: 'content_hash', type: 'table_field' },
                        { field: 'seed_hash', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});
