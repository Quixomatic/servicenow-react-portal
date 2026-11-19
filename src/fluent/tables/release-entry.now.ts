import '@servicenow/sdk/global'
import { Table, Form, default_view, StringColumn, ReferenceColumn, ChoiceColumn } from '@servicenow/sdk/core'

/**
 * One row per piece of a portal's compiled release (theme, each layout, each placement),
 * kept in sync when the release is reprocessed. Indexed lookup for runtime authorization
 * of assets and executions.
 */
export const x_312987_portal_release_entry = Table({
    name: 'x_312987_portal_release_entry',
    extends: 'sys_metadata',
    label: 'Release Entry',
    display: 'stable_key',
    allowWebServiceAccess: true,
    schema: {
        release: ReferenceColumn({ label: 'Release', referenceTable: 'x_312987_portal_release', mandatory: true, cascadeRule: 'cascade' }),
        stable_key: StringColumn({ label: 'Stable key', maxLength: 100, mandatory: true, hint: 'placement:<id>, layout:<id>, theme:<id>' }),
        entry_type: ChoiceColumn({
            label: 'Type',
            dropdown: 'dropdown_without_none',
            default: 'placement',
            choices: {
                placement: { label: 'Placement', sequence: 0 },
                layout: { label: 'Layout', sequence: 1 },
                theme: { label: 'Theme', sequence: 2 },
            },
        }),
        component: ReferenceColumn({ label: 'Component', referenceTable: 'x_312987_portal_component', cascadeRule: 'delete' }),
        theme: ReferenceColumn({ label: 'Theme', referenceTable: 'x_312987_portal_theme', cascadeRule: 'delete' }),
        placement: ReferenceColumn({ label: 'Placement', referenceTable: 'x_312987_portal_placement', cascadeRule: 'delete' }),
        build: ReferenceColumn({ label: 'Build', referenceTable: 'x_312987_portal_build', cascadeRule: 'clear' }),
        server_mode: StringColumn({ label: 'Server mode', maxLength: 20 }),
    },
    index: [
        { name: 'rp_entry_release_key', element: ['release', 'stable_key'], unique: true },
        { name: 'rp_entry_build', element: 'build', unique: false },
    ],
})

Form({
    table: 'x_312987_portal_release_entry',
    view: default_view,
    sections: [
        {
            caption: 'Release Entry',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'release', type: 'table_field' },
                        { field: 'stable_key', type: 'table_field' },
                        { field: 'entry_type', type: 'table_field' },
                        { field: 'server_mode', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'component', type: 'table_field' },
                        { field: 'theme', type: 'table_field' },
                        { field: 'placement', type: 'table_field' },
                        { field: 'build', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
})
