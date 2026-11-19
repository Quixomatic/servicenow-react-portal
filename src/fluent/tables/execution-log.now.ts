import '@servicenow/sdk/global'
import { Table, Form, default_view, StringColumn, ReferenceColumn, ChoiceColumn, IntegerColumn, MultiLineTextColumn } from '@servicenow/sdk/core'

/** Server-script execution log (errors always; successes when log_executions is on). Trimmed nightly. */
export const x_312987_portal_execution_log = Table({
    name: 'x_312987_portal_execution_log',
    label: 'Execution Log',
    display: 'correlation_id',
    allowWebServiceAccess: true,
    schema: {
        correlation_id: StringColumn({ label: 'Correlation ID', maxLength: 64 }),
        portal: ReferenceColumn({ label: 'Portal', referenceTable: 'x_312987_portal_portal', cascadeRule: 'clear' }),
        release: ReferenceColumn({ label: 'Release', referenceTable: 'x_312987_portal_release', cascadeRule: 'clear' }),
        build: ReferenceColumn({ label: 'Build', referenceTable: 'x_312987_portal_build', cascadeRule: 'clear' }),
        placement: ReferenceColumn({ label: 'Instance', referenceTable: 'x_312987_portal_placement', cascadeRule: 'clear' }),
        component: ReferenceColumn({ label: 'Component', referenceTable: 'x_312987_portal_component', cascadeRule: 'clear' }),
        instance: StringColumn({ label: 'Instance ID', maxLength: 255 }),
        action: StringColumn({ label: 'Action', maxLength: 40 }),
        duration_ms: IntegerColumn({ label: 'Duration (ms)' }),
        outcome: ChoiceColumn({
            label: 'Outcome',
            dropdown: 'dropdown_without_none',
            default: 'success',
            choices: {
                success: { label: 'Success', sequence: 0 },
                error: { label: 'Error', sequence: 1 },
                denied: { label: 'Denied', sequence: 2 },
            },
        }),
        sanitized_error: MultiLineTextColumn({ label: 'Error', maxLength: 1000 }),
    },
    index: [{ name: 'rp_log_correlation', element: 'correlation_id', unique: false }],
})

Form({
    table: 'x_312987_portal_execution_log',
    view: default_view,
    sections: [
        {
            caption: 'Execution',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'correlation_id', type: 'table_field' },
                        { field: 'action', type: 'table_field' },
                        { field: 'outcome', type: 'table_field' },
                        { field: 'duration_ms', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'portal', type: 'table_field' },
                        { field: 'release', type: 'table_field' },
                        { field: 'placement', type: 'table_field' },
                        { field: 'instance', type: 'table_field' },
                        { field: 'component', type: 'table_field' },
                        { field: 'build', type: 'table_field' },
                    ],
                },
                { layout: 'one-column', elements: [{ field: 'sanitized_error', type: 'table_field' }] },
            ],
        },
    ],
})
