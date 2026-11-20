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
    ChoiceColumn,
    ReferenceColumn,
} from '@servicenow/sdk/core';

/**
 * Documentation pages: one row per page of a docs collection (x_312987_portal_doc_collection), in a
 * section (x_312987_portal_doc_section, `doc_section`). The collection `react-portal` is docs/guide/,
 * one row per Markdown file, written by
 * `npm run seed` (the docs step, diff-based on content_hash) and by Portal Studio's Docs activity. Content, not application metadata, so
 * it doesn't extend sys_metadata: rows never travel in the app package or update sets.
 *
 * The docs widgets read it through the Table API with the user's session (read ACL: logged-in
 * users, active rows). `markdown` is rendered on the client; `headings_json` and `search_text` are
 * precomputed by the seed for the table of contents and the client-side search index.
 */
export const x_312987_portal_doc = Table({
    name: 'x_312987_portal_doc',
    label: [{ label: 'Doc Page', plural: 'Doc Pages', language: 'en' }],
    display: 'title',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    schema: {
        path: StringColumn({
            label: 'Path',
            maxLength: 255,
            mandatory: true,
            hint: 'Doc path without .md, e.g. concepts/layouts (index = the home page)',
        }),
        title: StringColumn({ label: 'Title', maxLength: 200, mandatory: true }),
        doc_section: ReferenceColumn({
            label: 'Section',
            referenceTable: 'x_312987_portal_doc_section',
            cascadeRule: 'restrict',
            hint: 'The sidebar section (its collection is the page collection)',
        }),
        collection: ReferenceColumn({
            label: 'Collection',
            referenceTable: 'x_312987_portal_doc_collection',
            cascadeRule: 'restrict',
            readOnly: true,
            hint: "Set from the section's collection (RP: Doc page collection from section)",
        }),
        description: StringColumn({ label: 'Description', maxLength: 1000 }),
        // Legacy section strings: part of content_hash (so existing hashes never change), meaning "the
        // page's section as of its last content write" (seed write or Studio save). Read doc_section.
        section: StringColumn({
            label: 'Section title (legacy)',
            maxLength: 100,
            hint: "The section's title at the page's last content write (part of the content hash); doc_section is authoritative",
        }),
        section_slug: StringColumn({ label: 'Section slug (legacy)', maxLength: 80 }),
        section_order: IntegerColumn({ label: 'Section order (legacy)', default: 100 }),
        order: IntegerColumn({ label: 'Order', default: 100, hint: 'Position within the section' }),
        tags: StringColumn({ label: 'Tags', maxLength: 500, hint: 'Comma-separated' }),
        icon: StringColumn({ label: 'Icon', maxLength: 80, hint: 'Lucide icon name for the sidebar' }),
        source_path: StringColumn({
            label: 'Source path',
            maxLength: 255,
            hint: 'Repository path, e.g. docs/guide/concepts/layouts.md',
        }),
        markdown: MultiLineTextColumn({ label: 'Markdown', maxLength: 1000000 }),
        headings_json: JsonColumn({
            label: 'Headings',
            maxLength: 65000,
            hint: '[{ depth, text, slug }] for the table of contents',
        }),
        search_text: MultiLineTextColumn({
            label: 'Search text',
            maxLength: 1000000,
            hint: 'Plain text for the client-side search index',
        }),
        content_hash: StringColumn({ label: 'Content hash', maxLength: 64, readOnly: true }),
        active: BooleanColumn({ label: 'Active', default: true }),
        // Source of truth (.plans/docs-editor.md): docs/guide stays canonical; Studio edits are held
        // until `npm run docs:pull` writes them back. "Edited in Studio" = content_hash ≠ seed_hash.
        origin: ChoiceColumn({
            label: 'Origin',
            default: 'repo',
            dropdown: 'dropdown_without_none',
            choices: {
                repo: { label: 'Repository (docs/guide)', sequence: 0 },
                studio: { label: 'Studio (not yet pulled into the repo)', sequence: 1 },
            },
        }),
        seed_hash: StringColumn({
            label: 'Seed hash',
            maxLength: 64,
            readOnly: true,
            hint: 'content_hash as last written by the docs seed (differs from content_hash = edited in Studio)',
        }),
    },
    // Paths are unique per collection (replaces the old table-wide rp_doc_path).
    // rp_doc_path stays declared, now NON-unique: the platform never drops an index on upgrade, so
    // removing the declaration left v1.19's unique DB index on `path` in place (it blocked a second
    // collection from reusing a path such as `index`). Declaring it non-unique lets the install alter it.
    index: [
        { name: 'rp_doc_collection_path', element: ['collection', 'path'], unique: true },
        { name: 'rp_doc_path', element: 'path', unique: false },
    ],
});

Form({
    table: 'x_312987_portal_doc',
    view: default_view,
    sections: [
        {
            caption: 'Doc page',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'title', type: 'table_field' },
                        { field: 'path', type: 'table_field' },
                        { field: 'section', type: 'table_field' },
                        { field: 'icon', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'section_slug', type: 'table_field' },
                        { field: 'section_order', type: 'table_field' },
                        { field: 'order', type: 'table_field' },
                        { field: 'source_path', type: 'table_field' },
                        { field: 'content_hash', type: 'table_field' },
                        { field: 'origin', type: 'table_field' },
                        { field: 'seed_hash', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'description', type: 'table_field' },
                        { field: 'tags', type: 'table_field' },
                        { field: 'markdown', type: 'table_field' },
                        { field: 'headings_json', type: 'table_field' },
                        { field: 'search_text', type: 'table_field' },
                    ],
                },
            ],
        },
        {
            // Its own form section, so the existing layout keeps its element positions.
            caption: 'Collection',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'doc_section', type: 'table_field' },
                        { field: 'collection', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});
