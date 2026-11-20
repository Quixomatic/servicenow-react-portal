/** Glide field types (dictionary internal_type), e.g. 'string', 'reference', 'choice', 'glide_date_time'. */
export type GlideType = string;

export type Choice = {
    value: string;
    label: string;
    /** Values of the dependent field this choice applies to (dictionary dependent choices). */
    dependentValues?: string[];
    sequence?: number;
};

export type ReferenceMeta = {
    table: string;
    /** Encoded reference qualifier (simple qualifiers; dynamic/advanced ones are evaluated server-side). */
    qualifier?: string;
    /** 'simple' | 'dynamic' | 'advanced' */
    useQualifier?: string;
    displayField?: string;
    /** Extra columns shown in search results (ref_ac_columns). */
    displayColumns?: string[];
    orderBy?: string;
    /** Field whose value narrows the search (dictionary dependent field). */
    dependsOn?: string;
};

/** Typed, parsed field metadata: one shape for every source (UI meta, form layout, props). */
export interface FieldMeta {
    table: string;
    name: string;
    label: string;
    type: GlideType;
    /** The UI type when it differs from the storage type, e.g. 'choice' over an integer column. */
    internalType?: string;
    mandatory: boolean;
    readOnly: boolean;
    canRead?: boolean;
    canWrite?: boolean;
    hint?: string;
    maxLength?: number;
    defaultValue?: string;
    /** Dictionary dependent field (choices / references narrow on its value). */
    dependsOn?: string;
    /** Parsed dictionary attributes (name=value pairs). */
    attributes: Record<string, string>;
    choices?: Choice[];
    /** 1 = dropdown with "-- None --", 3 = dropdown without it (sys_dictionary.choice). */
    choiceType?: number;
    reference?: ReferenceMeta;
    currencyCodes?: { code: string; symbol?: string; name?: string }[];
    countryCodes?: { code: string; name?: string }[];
    /** Where the metadata came from. */
    source: 'meta' | 'layout' | 'props';
}

export type FieldValue = { value: string; displayValue: string };

export type ServerFieldState = { hidden?: boolean; mandatory?: boolean; readonly?: boolean };

/** A form section: rows → columns → element names (fields, formatters, annotations). */
export type FormSection = {
    id: string;
    /** Section name ('' for the first, untitled section). */
    caption: string;
    /** Display label (the first section shows the table label). */
    label: string;
    rows: string[][][];
};

/** 'true' | 'false' | 'ignore' (leave as is), as UI policy actions store them. */
export type PolicyFlag = 'true' | 'false' | 'ignore';

export type UiPolicyAction = {
    /** Field name (catalog: 'variables.<name>'). */
    name: string;
    visible: PolicyFlag;
    mandatory: PolicyFlag;
    /** Read-only. */
    disabled: PolicyFlag;
    /** Clear the value when the condition becomes true. */
    cleared: boolean;
    /** Catalog: set a value / show a field message when true. */
    value?: string;
    valueAction?: string;
    fieldMessage?: string;
    fieldMessageType?: string;
};

export type UiPolicyCondition = {
    field: string;
    oper: string;
    value: string;
    /** Field type (integer, boolean, reference, …). */
    type?: string;
    label?: string;
    /** OR with the previous term. */
    or: boolean;
    /** Starts a new OR group (^NQ). */
    newquery: boolean;
    /** The server evaluated this term (dot-walks, fields not on the form): use the result. */
    preEvaluatedTerm: boolean;
    preEvaluatedTermResult: boolean;
};

export type UiPolicy = {
    id: string;
    description: string;
    /** Reverse if false. */
    reverse: boolean;
    /** Evaluate on load (otherwise only after a condition field changes). */
    onLoad: boolean;
    runScripts: boolean;
    preEvaluated: boolean;
    preEvaluatedResult: boolean;
    scriptTrue?: string;
    scriptFalse?: string;
    actions: UiPolicyAction[];
    conditions: UiPolicyCondition[];
};

/** A form UI action (server conditions already evaluated). */
export type UiAction = {
    sysId: string;
    name: string;
    label: string;
    order: number;
    /** 'button' | 'menuItem' */
    type: string;
    style?: string;
    hint?: string;
    hasClientScript: boolean;
    clientScript?: string;
};

export interface FormBootstrap {
    table: string;
    sysId: string;
    isNew: boolean;
    /** Opaque record snapshot; lookups send it back so qualifiers evaluate against the record. */
    encodedRecord: string;
    modCount: number | null;
    values: Record<string, FieldValue>;
    /** Server-merged dictionary, ACL and policy states. */
    states: Record<string, ServerFieldState>;
    meta: Record<string, FieldMeta>;
    sections: FormSection[];
    /** The view the server resolved ('Default view', 'ess', …). */
    view: string;
    /** What the request asked for (view resolution): the forced view, the candidate list, the rule config. */
    requested?: { forcedView: string; views: string; viewRuleConfigId: string };
    /** Portal view rules: how the view was chosen (only with FormViewResolution.rules). */
    resolution?: ViewResolutionInfo;
    /** Table label (the first section's display caption). */
    tableLabel: string;
    /** Formatter element names in this view (activity.xml, …). */
    formatters: string[];
    /** Annotations by sys_id (rows list the annotation's sys_id where it sits). */
    annotations: Record<string, FormAnnotation>;
    policies: UiPolicy[];
    actions: UiAction[];
    /** Client scripts (onLoad / onChange / onSubmit) for this view, plus pre-translated messages. */
    scripts: ClientScripts;
    /** g_scratchpad, filled by the table's display business rules. */
    scratchpad: Record<string, unknown>;
    /** Client scripting globals (formats, language). */
    globals: {
        language: string;
        dateTimeFormat: string;
        decimalSeparator: string;
        grouping: string;
        textDirection: string;
    };
    /** Parts of the bootstrap that failed without failing the form (policies, actions). */
    warnings: string[];
    // ---- related lists (app/related-list wave): formLayout.relatedLists, as Workspace requests them ----
    /** The view's related lists (sys_ui_related_list), with counts and resolved filters; [] for a new record. */
    relatedLists?: RelatedListInfo[];
    /** formLayout.relatedListMetadata.hasRelatedLists. */
    hasRelatedLists?: boolean;
    /** Platform highlighted-value styles by field (formLayout.highlightedValueStyle, matched rules only). */
    highlights?: Record<string, HighlightStyle>;
}

/** A platform highlighted-value style for one field (the server evaluated the rules as the user). */
export type HighlightStyle = {
    field: string;
    /** The label to show (display value or the rule's override). */
    value: string;
    status: string;
    colorName: string;
    showIcon: boolean;
    iconName: string;
    variantName: string;
};

/**
 * One related list of a record's form view (GlideLayout_Query.formLayout.relatedLists, normalized).
 * Kinds: reference ('task_sla.task': rows whose `relatedField` points at the parent), scripted
 * ('REL:<sys_relationship>': the server runs the relationship and returns its query as `filter`),
 * many-to-many (an m2m table such as sys_user_grmember; only the list call's m2MData tells).
 */
export type RelatedListInfo = {
    /** The related list name: '<table>.<field>' or 'REL:<sys_id>' (g_form.hideRelatedList names). */
    name: string;
    /** Rows' table (targetTable). */
    table: string;
    /** The parent's table (sourceTable). */
    parentTable: string;
    /** displayLabel, else label (scripted relationships have no displayLabel). */
    label: string;
    /** The platform's count of related records (as the user can read them). */
    count: number;
    /** Encoded query selecting the related rows (server-resolved, also for scripted relationships). */
    filter: string;
    /** The reference field on `table` pointing at the parent; for 'REL:' lists the same as name. */
    relatedField: string;
    /** Hide the list when it has no rows (sys_ui_related_list omit-if-empty). */
    omitIfEmpty: boolean;
    groupByField: string;
    kind: 'reference' | 'scripted';
};

/** A client script (sys_script_client / catalog_script_client) as the platform ships it to Workspace. */
export type ClientScript = {
    name: string;
    sysId: string;
    script: string;
    type: string;
    fieldName: string;
    tableName: string;
};

export type ClientScripts = {
    onLoad: ClientScript[];
    onChange: ClientScript[];
    onSubmit: ClientScript[];
    messages: Record<string, string>;
};

export type FormView = { name: string; label: string };

/**
 * How a form's view is resolved when no view is forced (GlideViewQuery_Query.uiView):
 * - viewRuleConfigId: a sys_ux_view_rules_configuration; its Workspace view rules (sysrule_view_workspace) apply;
 * - views: an ordered candidate list ('sp,ess'); the first view that exists for the table wins.
 * Rules beat `views`; a forced view beats both.
 */
export type FormViewResolution = { views?: string; viewRuleConfigId?: string; rules?: ViewRuleInputs };

/**
 * Portal view rules (x_312987_portal_view_rule): the inputs of the server resolution. With `rules`,
 * the form resolves its view in the same request (page rules → portal rules force the view; else
 * the URL view, the option (lockView: option first), the remembered view; else uiView decides).
 */
export type ViewRuleInputs = {
    /** Portal sys_id (or slug). */
    portal: string;
    page?: string;
    urlView?: string;
    optionView?: string;
    lockView?: boolean;
    /** false: ignore the remembered view. */
    remember?: boolean;
    /** The remembered view the client knows ('' = none); undefined / null = the server reads the preference. */
    remembered?: string | null;
};

/** How the view was chosen. source 'rule' = forced by a portal view rule (the switcher is locked). */
export type ViewResolutionInfo = {
    view: string;
    source: 'rule' | 'url' | 'option' | 'remembered' | 'auto';
    ruleId: string;
    ruleName: string;
    /** A URL / option view that doesn't exist for the table. */
    missing: string;
    /** Why (studio users only). */
    reason: string;
    /** 'answer' = the one-request path; 'api' = resolve, then the form (two calls). */
    via: 'answer' | 'api';
};

/** A form annotation (sys_ui_annotation): type is the display value ('Info Box Blue', 'Line Separator', …). */
export type FormAnnotation = { sysId: string; text: string; type: string; typeId: string; isPlainText: boolean };

export type ReferenceItem = {
    value: string;
    displayValue: string;
    /** Display columns (name first), as { key, value }. */
    columns: { key: string; value: string }[];
    recent?: boolean;
};

export type ReferenceSearchResult = {
    recent: ReferenceItem[];
    matches: ReferenceItem[];
    total: number | null;
};

/** A notification the platform queued during a request (business rule gs.addInfoMessage, …). */
export type SessionNotification = { type: string; text: string };

/** Result of a server UI action (save, insert, …) through /api/now/ui/ui_action/:id. */
export type UiActionResult = {
    operation: string;
    table: string;
    sysId: string;
    notifications: SessionNotification[];
    /** Where the action asked to go next (action.setRedirectURL / redirect to a record), if anywhere. */
    redirect?: { type: string; table?: string; sysId?: string; query?: string; url?: string };
    raw: unknown;
};

/** Unsaved form state sent with lookups (serializedChanges): { field: value }. */
export type FormChanges = Record<string, string>;
