import '@servicenow/sdk/global'
import {
    Table,
    Form,
    default_view,
    StringColumn,
    BooleanColumn,
    JsonColumn,
    IntegerColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core'

/**
 * Documentation pages for the `docs` portal: one row per Markdown file of docs/guide/, written by
 * `npm run seed` (the docs step, diff-based on content_hash). Content, not application metadata, so
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
        path: StringColumn({ label: 'Path', maxLength: 255, mandatory: true, hint: 'Doc path without .md, e.g. concepts/layouts (index = the home page)' }),
        title: StringColumn({ label: 'Title', maxLength: 200, mandatory: true }),
        description: StringColumn({ label: 'Description', maxLength: 1000 }),
        section: StringColumn({ label: 'Section', maxLength: 100, hint: 'Sidebar section title (from _nav.json)' }),
        section_slug: StringColumn({ label: 'Section slug', maxLength: 80 }),
        section_order: IntegerColumn({ label: 'Section order', default: 100 }),
        order: IntegerColumn({ label: 'Order', default: 100, hint: 'Position within the section' }),
        tags: StringColumn({ label: 'Tags', maxLength: 500, hint: 'Comma-separated' }),
        icon: StringColumn({ label: 'Icon', maxLength: 80, hint: 'Lucide icon name for the sidebar' }),
        source_path: StringColumn({ label: 'Source path', maxLength: 255, hint: 'Repository path, e.g. docs/guide/concepts/layouts.md' }),
        markdown: MultiLineTextColumn({ label: 'Markdown', maxLength: 1000000 }),
        headings_json: JsonColumn({ label: 'Headings', maxLength: 65000, hint: '[{ depth, text, slug }] for the table of contents' }),
        search_text: MultiLineTextColumn({ label: 'Search text', maxLength: 1000000, hint: 'Plain text for the client-side search index' }),
        content_hash: StringColumn({ label: 'Content hash', maxLength: 64, readOnly: true }),
        active: BooleanColumn({ label: 'Active', default: true }),
    },
    index: [{ name: 'rp_doc_path', element: 'path', unique: true }],
})

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
    ],
})
