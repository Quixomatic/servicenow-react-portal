import '@servicenow/sdk/global';
import {
    Table,
    Form,
    default_view,
    StringColumn,
    BooleanColumn,
    JsonColumn,
    IntegerColumn,
    ChoiceColumn,
    ScriptColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core';

/** Widgets, layouts and utilities share one table. */
export const x_312987_portal_component = Table({
    name: 'x_312987_portal_component',
    extends: 'sys_metadata',
    label: 'Component',
    display: 'name',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        namespace: StringColumn({ label: 'Namespace', maxLength: 40, default: 'app' }),
        key: StringColumn({ label: 'Key', maxLength: 80, hint: 'Derived from the name when empty' }),
        unique_id: StringColumn({
            label: 'Unique ID',
            maxLength: 121,
            unique: true,
            readOnly: true,
            hint: '<namespace>/<key>',
        }),
        kind: ChoiceColumn({
            label: 'Kind',
            mandatory: true,
            default: 'widget',
            dropdown: 'dropdown_without_none',
            choices: {
                widget: { label: 'Widget', sequence: 0 },
                layout: { label: 'Layout', sequence: 1 },
                utility: { label: 'Utility', sequence: 2 },
                block: { label: 'Block', sequence: 3 },
                primitive: { label: 'Primitive', sequence: 4 },
            },
        }),
        description: MultiLineTextColumn({ label: 'Description', maxLength: 1000 }),
        placeable: BooleanColumn({ label: 'Placeable', default: true }),
        active: BooleanColumn({ label: 'Active', default: true }),
        client_script: ScriptColumn({
            label: 'Client script',
            hint: 'Main React component (compiled as main.tsx). Import extra files with ./path',
        }),
        css: MultiLineTextColumn({
            label: 'CSS',
            maxLength: 1000000,
            hint: 'Component stylesheet (compiled as styles.css)',
        }),
        tailwind: BooleanColumn({
            label: 'Tailwind',
            default: true,
            hint: 'Generate CSS for the Tailwind classes used in the client code; the CSS field is appended after it',
        }),
        script: ScriptColumn({ label: 'Server script', hint: 'Runs with input, data, options, component, context' }),
        server_mode: ChoiceColumn({
            label: 'Server mode',
            default: 'none',
            dropdown: 'dropdown_without_none',
            choices: {
                none: { label: 'None (UI only)', sequence: 0 },
                'on-load': { label: 'On load', sequence: 1 },
                'on-demand': { label: 'On demand', sequence: 2 },
            },
        }),
        exports_json: JsonColumn({ label: 'Exports', maxLength: 65000 }),
        options_schema_json: JsonColumn({ label: 'Options schema', maxLength: 65000 }),
        default_options_json: JsonColumn({ label: 'Default options', maxLength: 65000 }),
        regions_json: JsonColumn({
            label: 'Regions',
            maxLength: 65000,
            hint: 'Layouts: [{"name":"header","acceptsContributions":true}, …]',
        }),
        dependency_spec_json: JsonColumn({ label: 'Dependency spec', maxLength: 65000 }),
        source_revision: IntegerColumn({ label: 'Source revision', readOnly: true, default: 1 }),
    },
});

Form({
    table: 'x_312987_portal_component',
    view: default_view,
    sections: [
        {
            caption: 'Component',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'name', type: 'table_field' },
                        { field: 'namespace', type: 'table_field' },
                        { field: 'key', type: 'table_field' },
                        { field: 'unique_id', type: 'table_field' },
                        { field: 'kind', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'placeable', type: 'table_field' },
                        { field: 'server_mode', type: 'table_field' },
                        { field: 'tailwind', type: 'table_field' },
                        { field: 'source_revision', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'description', type: 'table_field' },
                        { field: 'client_script', type: 'table_field' },
                        { field: 'css', type: 'table_field' },
                        { field: 'script', type: 'table_field' },
                        { field: 'regions_json', type: 'table_field' },
                        { field: 'options_schema_json', type: 'table_field' },
                        { field: 'default_options_json', type: 'table_field' },
                        { field: 'exports_json', type: 'table_field' },
                        { field: 'dependency_spec_json', type: 'table_field' },
                    ],
                },
            ],
        },
        {
            caption: 'Extra Files',
            content: [
                {
                    layout: 'one-column',
                    elements: [{ type: 'list', listType: '12M', listRef: 'x_312987_portal_source_file.component' }],
                },
            ],
        },
        {
            caption: 'Build',
            content: [
                {
                    layout: 'one-column',
                    elements: [{ type: 'list', listType: '12M', listRef: 'x_312987_portal_build.component' }],
                },
            ],
        },
    ],
});
