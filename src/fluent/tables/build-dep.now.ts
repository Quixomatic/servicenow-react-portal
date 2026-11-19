import '@servicenow/sdk/global'
import { Table, Form, default_view, StringColumn, ReferenceColumn, ChoiceColumn } from '@servicenow/sdk/core'

/**
 * Exact dependency edge of a build, used for invalidation.
 * Spec name: build_dependency (shortened to fit the 30-character table name limit).
 */
export const x_312987_portal_build_dep = Table({
    name: 'x_312987_portal_build_dep',
    extends: 'sys_metadata',
    label: 'Build Dependency',
    display: 'specifier',
    allowWebServiceAccess: true,
    schema: {
        build: ReferenceColumn({ label: 'Build', referenceTable: 'x_312987_portal_build', mandatory: true, cascadeRule: 'cascade' }),
        specifier: StringColumn({ label: 'Specifier', maxLength: 255, mandatory: true }),
        kind: ChoiceColumn({
            label: 'Kind',
            dropdown: 'dropdown_without_none',
            default: 'host',
            choices: {
                component: { label: 'Component build', sequence: 0 },
                host: { label: 'Host export', sequence: 1 },
                package: { label: 'Package', sequence: 2 },
                relative: { label: 'Relative file', sequence: 3 },
            },
        }),
        target_build: ReferenceColumn({ label: 'Target build', referenceTable: 'x_312987_portal_build', cascadeRule: 'clear' }),
        host_export: StringColumn({ label: 'Host export', maxLength: 255 }),
        package_version: StringColumn({ label: 'Package version', maxLength: 255 }),
        resolved_entry: StringColumn({ label: 'Resolved entry', maxLength: 255 }),
    },
})

Form({
    table: 'x_312987_portal_build_dep',
    view: default_view,
    sections: [
        {
            caption: 'Build Dependency',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'build', type: 'table_field' },
                        { field: 'specifier', type: 'table_field' },
                        { field: 'kind', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'target_build', type: 'table_field' },
                        { field: 'host_export', type: 'table_field' },
                        { field: 'package_version', type: 'table_field' },
                        { field: 'resolved_entry', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
})
