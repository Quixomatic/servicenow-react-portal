import '@servicenow/sdk/global';
import {
    Table,
    Form,
    default_view,
    StringColumn,
    BooleanColumn,
    ReferenceColumn,
    JsonColumn,
    UserRolesColumn,
    MultiLineTextColumn,
} from '@servicenow/sdk/core';

/** One record per portal (sp, crm, …). */
export const x_312987_portal_portal = Table({
    name: 'x_312987_portal_portal',
    extends: 'sys_metadata',
    label: 'Portal',
    display: 'name',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        slug: StringColumn({
            label: 'Slug',
            maxLength: 63,
            mandatory: true,
            unique: true,
            hint: 'URL segment: /x/312987/portal/site/<slug>',
        }),
        description: MultiLineTextColumn({ label: 'Description', maxLength: 1000 }),
        active: BooleanColumn({ label: 'Active', default: true }),
        is_default: BooleanColumn({ label: 'Default portal', default: false, hint: 'Shown at the experience root' }),
        theme: ReferenceColumn({ label: 'Theme', referenceTable: 'x_312987_portal_theme', cascadeRule: 'restrict' }),
        default_layout: ReferenceColumn({
            label: 'Default layout',
            referenceTable: 'x_312987_portal_component',
            referenceQual: 'kind=layout^active=true',
            cascadeRule: 'restrict',
        }),
        home_page: ReferenceColumn({
            label: 'Home page',
            referenceTable: 'x_312987_portal_page',
            useReferenceQualifier: 'advanced',
            referenceQual: "javascript:'portal=' + current.getUniqueValue()",
            cascadeRule: 'clear',
        }),
        navigation_json: JsonColumn({ label: 'Navigation', maxLength: 65000 }),
        settings_json: JsonColumn({ label: 'Settings', maxLength: 65000 }),
        roles: UserRolesColumn({ label: 'Audience roles', hint: 'Empty = every authenticated user' }),
    },
});

Form({
    table: 'x_312987_portal_portal',
    view: default_view,
    sections: [
        {
            caption: 'Portal',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'name', type: 'table_field' },
                        { field: 'slug', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                        { field: 'is_default', type: 'table_field' },
                        { field: 'roles', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'theme', type: 'table_field' },
                        { field: 'default_layout', type: 'table_field' },
                        { field: 'home_page', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'description', type: 'table_field' },
                        { field: 'navigation_json', type: 'table_field' },
                        { field: 'settings_json', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});
