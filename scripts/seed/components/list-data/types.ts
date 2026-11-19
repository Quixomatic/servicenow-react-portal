export type CellValue = { value: string; displayValue: string }

/** One column as the platform's list layout describes it. */
export type ListColumn = {
    /** Column name, dot-walks included ('caller_id.department'). */
    name: string
    label: string
    /** Glide internal type ('string', 'reference', 'glide_date_time', …). */
    type: string
    /** Table that defines the field (e.g. 'task' for incident.number). */
    tableName: string
    isChoice: boolean
    isSortable: boolean
    isFilterable: boolean
    isGroupable: boolean
    /** Encoded operators the condition builder must not offer for this column. */
    excludedOperators: string[]
    /** The table's display (first non-reference) column. */
    isDisplay: boolean
    /** Dot-walked column. */
    isDotWalk: boolean
}

export type ListRow = {
    sysId: string
    /** sys_class_name (an extended table, e.g. a task subclass). */
    className: string
    /** The record's display value. */
    display: string
    cells: Record<string, CellValue>
    /** Class of the referenced record, per reference cell (to open it). */
    refClass: Record<string, string>
}

export type ListPage = {
    table: string
    tableLabel: string
    columns: ListColumn[]
    rows: ListRow[]
    /** Total matching records (the platform's count). */
    count: number
    /** Effective encoded query (filter + order) the server ran. */
    query: string
    orderBy: { field: string; desc: boolean } | null
    /** The platform's list-level inline-edit switch (list_edit ACLs and list control). */
    inlineEditingEnabled: boolean
    limit: number
    offset: number
    dateFormat?: string
    dateTimeFormat?: string
}

export type ListArgs = {
    table: string
    /** Comma-separated columns; '' or undefined = the view's list layout (sys_ui_list). */
    columns?: string | string[]
    /** Encoded filter (no ORDERBY). */
    query?: string
    /** Always-applied query the user can't remove (e.g. a related list's parent). */
    fixedQuery?: string
    orderBy?: { field: string; desc: boolean }[]
    keywords?: string
    limit?: number
    offset?: number
    view?: string
    /** Platform related list (e.g. 'task_sla.task'), with its parent. */
    relatedListName?: string
    parentTable?: string
    parentRecordSysId?: string
}

/** A field you can filter on (one level of dot-walk metadata). */
export type FilterField = {
    name: string
    label: string
    type: string
    referenceTable?: string
}

/** A condition rendered for breadcrumbs (labels from the platform's own query parser). */
export type Crumb = {
    field: string
    fieldLabel: string
    op: string
    opLabel: string
    value: string
    valueLabel: string
    join: 'NQ' | 'AND' | 'OR'
    /** Position in the model, for removal. */
    gi: number
    ci: number
    ti: number
}

export type ListPreferences = {
    /** Visible columns, in order (undefined = the platform's layout). */
    columns?: string[]
    /** Column widths in px. */
    widths?: Record<string, number>
    density?: 'compact' | 'normal' | 'comfortable'
    pageSize?: number
    wrap?: boolean
}

export type CellEditability = { canEdit: boolean; reason?: string }

export type WriteResult = { ok: boolean; written: string[]; failed: string[]; errors: string[]; info: string[] }
