/** Glide field types (dictionary internal_type), e.g. 'string', 'reference', 'choice', 'glide_date_time'. */
export type GlideType = string

export type Choice = {
    value: string
    label: string
    /** Values of the dependent field this choice applies to (dictionary dependent choices). */
    dependentValues?: string[]
    sequence?: number
}

export type ReferenceMeta = {
    table: string
    /** Encoded reference qualifier (simple qualifiers; dynamic/advanced ones are evaluated server-side). */
    qualifier?: string
    /** 'simple' | 'dynamic' | 'advanced' */
    useQualifier?: string
    displayField?: string
    /** Extra columns shown in search results (ref_ac_columns). */
    displayColumns?: string[]
    orderBy?: string
    /** Field whose value narrows the search (dictionary dependent field). */
    dependsOn?: string
}

/** Typed, parsed field metadata: one shape for every source (UI meta, form layout, props). */
export interface FieldMeta {
    table: string
    name: string
    label: string
    type: GlideType
    /** The UI type when it differs from the storage type, e.g. 'choice' over an integer column. */
    internalType?: string
    mandatory: boolean
    readOnly: boolean
    canRead?: boolean
    canWrite?: boolean
    hint?: string
    maxLength?: number
    defaultValue?: string
    /** Dictionary dependent field (choices / references narrow on its value). */
    dependsOn?: string
    /** Parsed dictionary attributes (name=value pairs). */
    attributes: Record<string, string>
    choices?: Choice[]
    /** 1 = dropdown with "-- None --", 3 = dropdown without it (sys_dictionary.choice). */
    choiceType?: number
    reference?: ReferenceMeta
    currencyCodes?: { code: string; symbol?: string; name?: string }[]
    countryCodes?: { code: string; name?: string }[]
    /** Where the metadata came from. */
    source: 'meta' | 'layout' | 'props'
}

export type FieldValue = { value: string; displayValue: string }

export type ServerFieldState = { hidden?: boolean; mandatory?: boolean; readonly?: boolean }

/** A form section: rows → columns → element names (fields, formatters, annotations). */
export type FormSection = {
    id: string
    /** Section name ('' for the first, untitled section). */
    caption: string
    /** Display label (the first section shows the table label). */
    label: string
    rows: string[][][]
}

/** 'true' | 'false' | 'ignore' (leave as is), as UI policy actions store them. */
export type PolicyFlag = 'true' | 'false' | 'ignore'

export type UiPolicyAction = {
    /** Field name (catalog: 'variables.<name>'). */
    name: string
    visible: PolicyFlag
    mandatory: PolicyFlag
    /** Read-only. */
    disabled: PolicyFlag
    /** Clear the value when the condition becomes true. */
    cleared: boolean
    /** Catalog: set a value / show a field message when true. */
    value?: string
    valueAction?: string
    fieldMessage?: string
    fieldMessageType?: string
}

export type UiPolicyCondition = {
    field: string
    oper: string
    value: string
    /** Field type (integer, boolean, reference, …). */
    type?: string
    label?: string
    /** OR with the previous term. */
    or: boolean
    /** Starts a new OR group (^NQ). */
    newquery: boolean
    /** The server evaluated this term (dot-walks, fields not on the form): use the result. */
    preEvaluatedTerm: boolean
    preEvaluatedTermResult: boolean
}

export type UiPolicy = {
    id: string
    description: string
    /** Reverse if false. */
    reverse: boolean
    /** Evaluate on load (otherwise only after a condition field changes). */
    onLoad: boolean
    runScripts: boolean
    preEvaluated: boolean
    preEvaluatedResult: boolean
    scriptTrue?: string
    scriptFalse?: string
    actions: UiPolicyAction[]
    conditions: UiPolicyCondition[]
}

/** A form UI action (server conditions already evaluated). */
export type UiAction = {
    sysId: string
    name: string
    label: string
    order: number
    /** 'button' | 'menuItem' */
    type: string
    style?: string
    hint?: string
    hasClientScript: boolean
    clientScript?: string
}

export interface FormBootstrap {
    table: string
    sysId: string
    isNew: boolean
    /** Opaque record snapshot; lookups send it back so qualifiers evaluate against the record. */
    encodedRecord: string
    modCount: number | null
    values: Record<string, FieldValue>
    /** Server-merged dictionary, ACL and policy states. */
    states: Record<string, ServerFieldState>
    meta: Record<string, FieldMeta>
    sections: FormSection[]
    /** The view the server resolved ('Default view', 'ess', …). */
    view: string
    /** Table label (the first section's display caption). */
    tableLabel: string
    /** Formatter element names in this view (activity.xml, …). */
    formatters: string[]
    /** Annotations by sys_id (rows list the annotation's sys_id where it sits). */
    annotations: Record<string, FormAnnotation>
    policies: UiPolicy[]
    actions: UiAction[]
    /** Client scripts (onLoad / onChange / onSubmit) for this view, plus pre-translated messages. */
    scripts: ClientScripts
    /** g_scratchpad, filled by the table's display business rules. */
    scratchpad: Record<string, unknown>
    /** Client scripting globals (formats, language). */
    globals: { language: string; dateTimeFormat: string; decimalSeparator: string; grouping: string; textDirection: string }
    /** Parts of the bootstrap that failed without failing the form (policies, actions). */
    warnings: string[]
}

/** A client script (sys_script_client / catalog_script_client) as the platform ships it to Workspace. */
export type ClientScript = { name: string; sysId: string; script: string; type: string; fieldName: string; tableName: string }

export type ClientScripts = { onLoad: ClientScript[]; onChange: ClientScript[]; onSubmit: ClientScript[]; messages: Record<string, string> }

export type FormView = { name: string; label: string }

/** A form annotation (sys_ui_annotation): type is the display value ('Info Box Blue', 'Line Separator', …). */
export type FormAnnotation = { sysId: string; text: string; type: string; typeId: string; isPlainText: boolean }

export type ReferenceItem = {
    value: string
    displayValue: string
    /** Display columns (name first), as { key, value }. */
    columns: { key: string; value: string }[]
    recent?: boolean
}

export type ReferenceSearchResult = {
    recent: ReferenceItem[]
    matches: ReferenceItem[]
    total: number | null
}

/** A notification the platform queued during a request (business rule gs.addInfoMessage, …). */
export type SessionNotification = { type: string; text: string }

/** Result of a server UI action (save, insert, …) through /api/now/ui/ui_action/:id. */
export type UiActionResult = {
    operation: string
    table: string
    sysId: string
    notifications: SessionNotification[]
    /** Where the action asked to go next (action.setRedirectURL / redirect to a record), if anywhere. */
    redirect?: { type: string; table?: string; sysId?: string; query?: string; url?: string }
    raw: unknown
}

/** Unsaved form state sent with lookups (serializedChanges): { field: value }. */
export type FormChanges = Record<string, string>
