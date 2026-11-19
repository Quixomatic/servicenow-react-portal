import '@servicenow/sdk/global'
import {
    Table,
    Form,
    default_view,
    StringColumn,
    ReferenceColumn,
    JsonColumn,
    IntegerColumn,
    ChoiceColumn,
    ScriptColumn,
    DateTimeColumn,
    BooleanColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core'

/**
 * The compiled form of one component or theme: exactly one build record per owner,
 * overwritten by each successful compile (a failed compile keeps the last good output).
 * Client assets (build_asset) and the server script are replaced together, so the client
 * and server versions always match. As an application file it travels with its source in
 * update sets; reverting the source and recompiling reverts the build.
 */
export const x_312987_portal_build = Table({
    name: 'x_312987_portal_build',
    extends: 'sys_metadata',
    label: 'Build',
    display: 'owner_key',
    allowWebServiceAccess: true,
    schema: {
        component: ReferenceColumn({ label: 'Component', referenceTable: 'x_312987_portal_component', cascadeRule: 'cascade' }),
        theme: ReferenceColumn({ label: 'Theme', referenceTable: 'x_312987_portal_theme', cascadeRule: 'cascade' }),
        owner_key: StringColumn({ label: 'Owner', maxLength: 80, readOnly: true, unique: true }),
        state: ChoiceColumn({
            label: 'State',
            default: 'pending',
            dropdown: 'dropdown_without_none',
            readOnly: true,
            choices: {
                pending: { label: 'Pending (never compiled)', sequence: 0 },
                ready: { label: 'Ready', sequence: 1 },
                failed: { label: 'Failed (never compiled successfully)', sequence: 2 },
            },
        }),
        built_revision: IntegerColumn({ label: 'Built revision', readOnly: true, default: 0, hint: 'Source revision of the compiled output being served' }),
        pending_revision: IntegerColumn({ label: 'Pending revision', readOnly: true, default: 0, hint: 'Revision awaiting a compile (0 = none)' }),
        needs_rebuild: BooleanColumn({ label: 'Needs rebuild', readOnly: true, default: false, hint: 'A dependency changed since this was compiled' }),
        input_hash: StringColumn({ label: 'Input hash', maxLength: 64, readOnly: true }),
        compiler_version: StringColumn({ label: 'Compiler version', maxLength: 100, readOnly: true }),
        runtime_abi_version: StringColumn({ label: 'Runtime ABI', maxLength: 40, readOnly: true }),
        server_script: ScriptColumn({ label: 'Server script (compiled with the client)', readOnly: true }),
        options_snapshot: JsonColumn({ label: 'Options snapshot', maxLength: 65000, readOnly: true }),
        exports_snapshot: JsonColumn({ label: 'Exports snapshot', maxLength: 65000, readOnly: true }),
        source_snapshot_json: JsonColumn({ label: 'Source snapshot', maxLength: 65000, readOnly: true }),
        diagnostics_json: MultiLineTextColumn({ label: 'Diagnostics (last compile)', maxLength: 65000, readOnly: true }),
        last_error: MultiLineTextColumn({ label: 'Last error', maxLength: 4000, readOnly: true }),
        requested_at: DateTimeColumn({ label: 'Compile requested', readOnly: true }),
        completed_at: DateTimeColumn({ label: 'Last compiled', readOnly: true }),
    },
})

Form({
    table: 'x_312987_portal_build',
    view: default_view,
    sections: [
        {
            caption: 'Build',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'component', type: 'table_field' },
                        { field: 'theme', type: 'table_field' },
                        { field: 'state', type: 'table_field' },
                        { field: 'built_revision', type: 'table_field' },
                        { field: 'pending_revision', type: 'table_field' },
                        { field: 'needs_rebuild', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'compiler_version', type: 'table_field' },
                        { field: 'runtime_abi_version', type: 'table_field' },
                        { field: 'requested_at', type: 'table_field' },
                        { field: 'completed_at', type: 'table_field' },
                        { field: 'input_hash', type: 'table_field' },
                        { field: 'owner_key', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'last_error', type: 'table_field' },
                        { field: 'diagnostics_json', type: 'table_field' },
                        { field: 'server_script', type: 'table_field' },
                        { field: 'options_snapshot', type: 'table_field' },
                        { field: 'exports_snapshot', type: 'table_field' },
                        { field: 'source_snapshot_json', type: 'table_field' },
                    ],
                },
            ],
        },
        {
            caption: 'Assets',
            content: [
                {
                    layout: 'one-column',
                    elements: [{ type: 'list', listType: '12M', listRef: 'x_312987_portal_build_asset.build' }],
                },
            ],
        },
    ],
})
