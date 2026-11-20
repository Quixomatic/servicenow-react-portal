import '@servicenow/sdk/global';
import {
    Table,
    Form,
    Record,
    UiMacro,
    default_view,
    StringColumn,
    BooleanColumn,
    ReferenceColumn,
    JsonColumn,
    IntegerColumn,
    ChoiceColumn,
    ScriptColumn,
    UserRolesColumn,
} from '@servicenow/sdk/core';

/**
 * One entry of a portal menu. Items nest under groups (parent). Page items reference a page of
 * the menu's portal, so they survive route renames. Spec name: menu_item.
 *
 * Phase 1 evaluates roles and condition per user; badge_script and script (dynamic items) are
 * stored and validated but not evaluated yet.
 */
export const x_312987_portal_menu_item = Table({
    name: 'x_312987_portal_menu_item',
    extends: 'sys_metadata',
    label: 'Menu Item',
    display: 'label',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        menu: ReferenceColumn({
            label: 'Menu',
            referenceTable: 'x_312987_portal_menu',
            mandatory: true,
            cascadeRule: 'cascade',
        }),
        parent: ReferenceColumn({
            label: 'Parent group',
            referenceTable: 'x_312987_portal_menu_item',
            cascadeRule: 'cascade',
            useReferenceQualifier: 'advanced',
            referenceQual:
                "javascript:'menu=' + current.getValue('menu') + '^type=group^sys_id!=' + current.getUniqueValue()",
            hint: 'Empty = top level. Only groups contain items.',
        }),
        order: IntegerColumn({ label: 'Order', default: 100 }),
        label: StringColumn({ label: 'Label', maxLength: 100 }),
        active: BooleanColumn({ label: 'Active', default: true }),
        type: ChoiceColumn({
            label: 'Type',
            mandatory: true,
            default: 'page',
            dropdown: 'dropdown_without_none',
            choices: {
                page: { label: 'Page', sequence: 0 },
                route: { label: 'Route', sequence: 1 },
                url: { label: 'External URL', sequence: 2 },
                group: { label: 'Group', sequence: 3 },
                separator: { label: 'Separator', sequence: 4 },
                dynamic: { label: 'Dynamic (script)', sequence: 5 },
            },
        }),
        page: ReferenceColumn({
            label: 'Page',
            referenceTable: 'x_312987_portal_page',
            cascadeRule: 'cascade',
            useReferenceQualifier: 'advanced',
            referenceQual: "javascript:'portal=' + current.menu.portal",
            hint: "A page of the menu's portal (deleting the page deletes its items)",
        }),
        params_json: JsonColumn({
            label: 'Page params',
            maxLength: 4000,
            hint: '{"params": {"id": "42"}, "query": {"tab": "open"}}: route params and query for page items',
        }),
        route: StringColumn({
            label: 'Route',
            maxLength: 255,
            hint: 'Portal-relative path: orders, orders/42, "" = home',
        }),
        url: StringColumn({ label: 'URL', maxLength: 1000, hint: 'http(s):// or mailto: only' }),
        icon: StringColumn({
            label: 'Icon',
            maxLength: 60,
            hint: 'lucide icon name (kebab-case), e.g. layout-dashboard',
        }),
        target: ChoiceColumn({
            label: 'Target',
            dropdown: 'dropdown_with_none',
            choices: {
                _self: { label: 'Same tab (_self)', sequence: 0 },
                _blank: { label: 'New tab (_blank)', sequence: 1 },
            },
        }),
        match: ChoiceColumn({
            label: 'Active match',
            default: 'prefix',
            dropdown: 'dropdown_without_none',
            choices: {
                prefix: { label: 'Prefix (orders is active on orders/42)', sequence: 0 },
                exact: { label: 'Exact', sequence: 1 },
            },
        }),
        tooltip: StringColumn({ label: 'Tooltip', maxLength: 200 }),
        collapsed: BooleanColumn({ label: 'Collapsed', default: false, hint: 'Groups: start collapsed' }),
        roles: UserRolesColumn({ label: 'Roles', hint: 'Empty = everyone who can see the menu' }),
        condition: ScriptColumn({
            label: 'Condition',
            hint: 'Optional server script; return false (or set answer = false) to hide. Variables: $sp, portal, item, user.',
        }),
        badge: StringColumn({ label: 'Badge', maxLength: 40 }),
        badge_script: ScriptColumn({
            label: 'Badge script',
            hint: 'Phase 2 (not evaluated yet): returns the badge text',
        }),
        script: ScriptColumn({
            label: 'Script',
            hint: 'Dynamic items, phase 2 (not evaluated yet): returns child items',
        }),
    },
    index: [{ name: 'rp_menu_item_menu_parent', element: ['menu', 'parent', 'order'], unique: false }],
});

/** Classic-form icon picker: a searchable grid of lucide icons that sets the icon field. */
export const menuIconPickerMacro = UiMacro({
    $id: Now.ID['macro-menu-icon-picker'],
    name: 'menu_icon_picker',
    description:
        'React Portal: lucide icon picker for the icon field of menu items (no parameters). Loads the icon sprite from /api/x_312987_portal/rp/icons/lucide.',
    xml: Now.include('../ui-macros/menu-icon-picker.jelly.xml'),
});

export const menuIconPickerFormatter = Record({
    $id: Now.ID['formatter-menu-icon-picker'],
    table: 'sys_ui_formatter',
    data: {
        name: 'React Portal Icon Picker',
        type: 'formatter',
        formatter: 'x_312987_portal_menu_icon_picker.xml',
        table: 'x_312987_portal_menu_item',
        active: true,
    },
});

Form({
    table: 'x_312987_portal_menu_item',
    view: default_view,
    sections: [
        {
            caption: 'Menu Item',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'menu', type: 'table_field' },
                        { field: 'parent', type: 'table_field' },
                        { field: 'type', type: 'table_field' },
                        { field: 'label', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'order', type: 'table_field' },
                        { field: 'active', type: 'table_field' },
                        { field: 'collapsed', type: 'table_field' },
                        { field: 'match', type: 'table_field' },
                    ],
                },
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'page', type: 'table_field' },
                        { field: 'route', type: 'table_field' },
                        { field: 'url', type: 'table_field' },
                        { field: 'target', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'tooltip', type: 'table_field' },
                        { field: 'badge', type: 'table_field' },
                        { field: 'roles', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'params_json', type: 'table_field' },
                        { field: 'icon', type: 'table_field' },
                        {
                            type: 'formatter',
                            formatterRef: menuIconPickerFormatter,
                            formatterName: 'x_312987_portal_menu_icon_picker.xml',
                        },
                    ],
                },
            ],
        },
        {
            caption: 'Scripts',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'condition', type: 'table_field' },
                        { field: 'badge_script', type: 'table_field' },
                        { field: 'script', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
});
