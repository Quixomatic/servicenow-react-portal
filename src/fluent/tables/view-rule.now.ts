import '@servicenow/sdk/global'
import {
    Table,
    Record,
    StringColumn,
    BooleanColumn,
    ReferenceColumn,
    IntegerColumn,
    ChoiceColumn,
    ScriptColumn,
    UserRolesColumn,
    ConditionsColumn,
    TableNameColumn,
} from '@servicenow/sdk/core'

/**
 * Portal view rules: which form / list view a portal shows for a table (src/server/views/view-rules.ts).
 *
 * - Page rules (page set) come first, then portal rules (page empty), each by order; the first
 *   match FORCES the view (URL, widget option and remembered view can't override it).
 * - A portal can use another portal's portal rules (settings.viewRulesFrom); page rules always
 *   belong to the current portal's pages.
 * - The table matches exactly (Workspace view rules don't apply to child tables either).
 * - Audience: roles (any of) and user criteria (Available for / Not available for, the m2m tables
 *   below), evaluated live per request.
 * - Like portals, pages and menus, rules extend sys_metadata so they travel with the application
 *   (listed in now.config.json ignoreTransformTableList).
 */
export const x_312987_portal_view_rule = Table({
    name: 'x_312987_portal_view_rule',
    extends: 'sys_metadata',
    label: [{ label: 'Portal View Rule', plural: 'Portal View Rules', language: 'en' }],
    display: 'name',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        name: StringColumn({ label: 'Name', maxLength: 100, mandatory: true }),
        portal: ReferenceColumn({ label: 'Portal', referenceTable: 'x_312987_portal_portal', mandatory: true, cascadeRule: 'cascade' }),
        page: ReferenceColumn({
            label: 'Page',
            referenceTable: 'x_312987_portal_page',
            cascadeRule: 'cascade',
            useReferenceQualifier: 'advanced',
            referenceQual: "javascript:'portal=' + current.portal",
            hint: 'Empty = the whole portal. Page rules are evaluated before portal rules.',
        }),
        table: TableNameColumn({ label: 'Table', mandatory: true, hint: 'The exact table (rules do not apply to child tables, as in Workspace)' }),
        applies_to: ChoiceColumn({
            label: 'Applies to',
            mandatory: true,
            default: 'form',
            dropdown: 'dropdown_without_none',
            choices: {
                form: { label: 'Forms', sequence: 0 },
                list: { label: 'Lists', sequence: 1 },
                both: { label: 'Forms and lists', sequence: 2 },
            },
        }),
        active: BooleanColumn({ label: 'Active', default: true }),
        order: IntegerColumn({ label: 'Order', default: 100, hint: 'Lower first; the first matching rule wins' }),
        condition: ConditionsColumn({
            label: 'Condition',
            dependent: 'table',
            maxLength: 4000,
            hint: 'Forms only. Empty = always. "Sys ID is -1" = a new record, as in Workspace view rules.',
        }),
        view: ReferenceColumn({ label: 'View', referenceTable: 'sys_ui_view', hint: 'Kept in sync with View name; survives a view rename' }),
        view_name: StringColumn({ label: 'View name', maxLength: 100, mandatory: true, default: 'default', hint: 'What uiView / getListLayout receive. "default" = the Default view.' }),
        roles: UserRolesColumn({ label: 'Roles', hint: 'Empty = anyone in the audience; else any of these roles' }),
        advanced: BooleanColumn({ label: 'Advanced', default: false }),
        script: ScriptColumn({
            label: 'Script',
            hint: 'Advanced: return true to apply. Variables: record (GlideRecord or null), table, kind, isNew, portal, page, user.',
        }),
        description: StringColumn({ label: 'Description', maxLength: 1000 }),
    },
    index: [{ name: 'rp_view_rule_lookup', element: ['portal', 'table', 'active', 'order'], unique: false }],
})

/* ---- Audience: user criteria (Available for / Not available for) ---- */

export const x_312987_portal_vrule_uc = Table({
    name: 'x_312987_portal_vrule_uc',
    extends: 'sys_metadata',
    label: [{ label: 'View Rule Available For', plural: 'View Rule Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        rule: ReferenceColumn({ label: 'View rule', referenceTable: 'x_312987_portal_view_rule', mandatory: true, cascadeRule: 'delete' }),
        user_criteria: ReferenceColumn({
            label: 'Available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_vrule_uc', element: ['rule', 'user_criteria'], unique: true }],
})

export const x_312987_portal_vrule_uc_no = Table({
    name: 'x_312987_portal_vrule_uc_no',
    extends: 'sys_metadata',
    label: [{ label: 'View Rule Not Available For', plural: 'View Rule Not Available For', language: 'en' }],
    display: 'user_criteria',
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    audit: true,
    schema: {
        rule: ReferenceColumn({ label: 'View rule', referenceTable: 'x_312987_portal_view_rule', mandatory: true, cascadeRule: 'delete' }),
        user_criteria: ReferenceColumn({
            label: 'Not available for',
            referenceTable: 'user_criteria',
            mandatory: true,
            cascadeRule: 'delete',
            referenceQual: 'active=true',
        }),
    },
    index: [{ name: 'rp_vrule_uc_no', element: ['rule', 'user_criteria'], unique: true }],
})

/* ---- The answer: a remote table with one computed row per query ---- */

/**
 * Remote (scriptable) table: GlideRecord_Query { x_312987_portal_view_answer(queryConditions: "…") }
 * returns the view resolution as one row, whose fields feed uiView through _query in the same GraphQL
 * request: uiView(views: "$$parent.views$$", viewRuleConfigId: "$$parent.rule_config$$"). It stores
 * nothing. Inputs: the query's field=value terms. `views` is never empty: an empty $$parent value
 * substitutes the string "null", which uiView treats as a view name.
 */
export const x_312987_portal_view_answer = Table({
    name: 'x_312987_portal_view_answer',
    label: [{ label: 'View Answer', plural: 'View Answers', language: 'en' }],
    scriptableTable: true,
    allowWebServiceAccess: true,
    accessibleFrom: 'public',
    actions: { read: true },
    schema: {
        kind: StringColumn({ label: 'Kind', maxLength: 10 }),
        target_table: StringColumn({ label: 'Target table', maxLength: 80 }),
        record: StringColumn({ label: 'Record', maxLength: 40 }),
        preset: StringColumn({ label: 'Preset query', maxLength: 4000 }),
        portal: StringColumn({ label: 'Portal', maxLength: 100 }),
        page: StringColumn({ label: 'Page', maxLength: 40 }),
        url_view: StringColumn({ label: 'URL view', maxLength: 200 }),
        option_view: StringColumn({ label: 'Option view', maxLength: 200 }),
        lock_view: StringColumn({ label: 'Lock view', maxLength: 10 }),
        remember: StringColumn({ label: 'Remember', maxLength: 10 }),
        remembered: StringColumn({ label: 'Remembered view', maxLength: 200 }),
        default_views: StringColumn({ label: 'Default views (input)', maxLength: 400, hint: "The portal's candidate list ('sp,ess'); absent = settings.formViews" }),
        config_in: StringColumn({ label: 'Workspace rule config (input)', maxLength: 40, hint: 'A sys_ux_view_rules_configuration; absent = settings.viewRuleConfigId' }),
        views: StringColumn({ label: 'Views (output)', maxLength: 400, hint: "uiView's views: the resolved view, or the default views; never empty" }),
        rule_config: StringColumn({ label: 'Rule config (output)', maxLength: 40, hint: "uiView's viewRuleConfigId: only when no view was forced" }),
        view: StringColumn({ label: 'View', maxLength: 100 }),
        source: StringColumn({ label: 'Source', maxLength: 20 }),
        rule_id: StringColumn({ label: 'Rule', maxLength: 40 }),
        rule_name: StringColumn({ label: 'Rule name', maxLength: 100 }),
        missing: StringColumn({ label: 'Missing view', maxLength: 200 }),
        reason: StringColumn({ label: 'Reason', maxLength: 400 }),
    },
})

Record({
    $id: Now.ID['vtable-view-answer'],
    table: 'sys_script_vtable',
    data: {
        name: 'React Portal view answer',
        table: 'x_312987_portal_view_answer',
        active: true,
        advanced: false,
        script: '(function executeQuery(v_table, v_query) {\n    new x_312987_portal.ReactPortal().viewAnswer(v_table, v_query);\n})(v_table, v_query);',
    },
})
