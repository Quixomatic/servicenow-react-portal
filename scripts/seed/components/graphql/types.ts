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
    sections: { id: string; caption: string; rows: string[][] }[]
}

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

/** Unsaved form state sent with lookups (serializedChanges): { field: value }. */
export type FormChanges = Record<string, string>
