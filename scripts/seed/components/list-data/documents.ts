import { graphql, restGet, safeName } from 'utilities:app/graphql'
import { flattenTerms, parseQuery, serializeQuery, findOperator, describeTerm } from './query'
import type { QueryModel } from './query'
import type { CellEditability, Crumb, FilterField, ListArgs, ListColumn, ListPage, ListPreferences, ListRow, WriteResult } from './types'

/**
 * The list data path: the same platform GraphQL documents Workspace's record list uses.
 *
 *   fetchList            GlideListLayout_Query.getListLayout        columns + rows (value/display) + count, one request
 *   fetchListCount       GlideListCount_Query.getListCount          count only
 *   fetchCrumbs          GlideConditionBuilder_Query.parse          labels for breadcrumbs (field, operator, display value)
 *   fetchFilterFields    GlideConditionBuilder_Query.dotwalkTableData  fields of one table (for the field picker / dot-walk)
 *   fetchEditability     GlideListLayoutInline_Query.getPreFetch    canListEdit per record (list_edit + field write ACLs)
 *   writeCells           GlideListLayoutInline_Query.writeMultiRow  inline / bulk edit, then getNotifications
 *   fetchPreference / savePreference   sys_user_preference (read) + GlideLayoutDomain_Mutation.user.setPreference
 */

export const LIST_QUERY = `query rpList($table: String!, $view: String, $columns: String, $query: String, $fixedQuery: String, $limit: Int, $offset: Int,
  $relatedListName: String, $parentTable: String, $parentRecordSysId: String) {
  GlideListLayout_Query {
    getListLayout(table: $table, view: $view, columns: $columns, query: $query, fixedQuery: $fixedQuery, limit: $limit, offset: $offset,
      relatedListName: $relatedListName, parentTable: $parentTable, parentRecordSysId: $parentRecordSysId,
      runHighlightedValuesQuery: false, ignoreTotalRecordCount: false) {
      tableLabel query fixedQuery
      metadata { dateFormat dateTimeFormat canCreate canWrite canDelete m2MData { isM2M sourceField targetTable targetField } }
      allColumns {
        columnName
        columnData { label fullLabel internalType isChoice isFilterable isSortable isGroupable tableName excludedOperators isFirstNonRef }
      }
      layoutQuery {
        table orderByColumn orderByIsDescending count inlineEditingEnabled
        queryRows {
          ... on GlideListLayout_QueryRowType {
            className uniqueId displayValue
            rowData { columnName columnData { displayValue value recordClassName } }
          }
        }
      }
    }
  }
}`

export function columnsParam(columns: ListArgs['columns']): string {
    if (!columns) return ''
    const list = Array.isArray(columns) ? columns : String(columns).split(',')
    return list
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
            if (!/^[a-z0-9_$][a-zA-Z0-9_.$]*$/.test(c)) throw new Error(`Invalid column "${c}"`)
            return c
        })
        .join(',')
}

/** The query the server runs: keywords + filter + ORDERBY. */
export function effectiveQuery(args: Pick<ListArgs, 'query' | 'orderBy' | 'keywords'>): string {
    const model = parseQuery(args.query || '')
    if (args.keywords !== undefined) model.keywords = args.keywords
    if (args.orderBy && args.orderBy.length) model.orderBy = args.orderBy
    // A unique tie-breaker so offset paging is stable when many rows share the sort value.
    if (model.orderBy.length && !model.orderBy.some((o) => o.field === 'sys_id')) model.orderBy = model.orderBy.concat([{ field: 'sys_id', desc: false }])
    return serializeQuery(model)
}

function toColumn(c: any): ListColumn {
    const d = c.columnData || {}
    const name = String(c.columnName)
    return {
        name,
        label: String(name.indexOf('.') > 0 ? String(d.fullLabel || d.label || name).split('.').join(' › ') : d.label || d.fullLabel || name),
        type: String(d.internalType || c.internalType || 'string'),
        tableName: String(d.tableName || ''),
        isChoice: !!d.isChoice,
        isSortable: d.isSortable !== false,
        isFilterable: d.isFilterable !== false,
        isGroupable: !!d.isGroupable,
        excludedOperators: Array.isArray(d.excludedOperators) ? d.excludedOperators.map(String) : [],
        isDisplay: !!d.isFirstNonRef,
        isDotWalk: name.indexOf('.') > 0,
    }
}

function toRow(r: any): ListRow {
    const cells: ListRow['cells'] = {}
    const refClass: ListRow['refClass'] = {}
    for (const c of r.rowData || []) {
        const d = c.columnData || {}
        const value = d.value == null ? '' : String(d.value)
        cells[c.columnName] = { value, displayValue: d.displayValue == null ? (value && !/^[0-9a-f]{32}$/.test(value) ? value : '') : String(d.displayValue) }
        if (d.recordClassName) refClass[c.columnName] = String(d.recordClassName)
    }
    return { sysId: String(r.uniqueId), className: String(r.className || ''), display: String(r.displayValue || ''), cells, refClass }
}

/** One page of a list: columns, rows (value + display value per cell) and the total count. */
export async function fetchList(args: ListArgs, signal?: AbortSignal): Promise<ListPage> {
    const table = safeName(args.table, 'table')
    const limit = Math.max(1, Math.min(args.limit || 20, 1000))
    const offset = Math.max(0, args.offset || 0)
    const data = await graphql(
        LIST_QUERY,
        {
            table,
            view: args.view || '',
            columns: columnsParam(args.columns),
            query: effectiveQuery(args),
            fixedQuery: args.fixedQuery || '',
            limit,
            offset,
            relatedListName: args.relatedListName || null,
            parentTable: args.parentTable || null,
            parentRecordSysId: args.parentRecordSysId || null,
        },
        { signal },
    )
    const L = data && data.GlideListLayout_Query && data.GlideListLayout_Query.getListLayout
    if (!L) throw new Error(`No list layout for ${table}`)
    const lq = L.layoutQuery || {}
    const rows = (lq.queryRows || []).filter((r: any) => r && r.uniqueId).map(toRow)
    return {
        table: lq.table || table,
        tableLabel: L.tableLabel || table,
        columns: (L.allColumns || []).map(toColumn),
        rows,
        count: lq.count == null ? rows.length : Number(lq.count),
        query: L.query || '',
        orderBy: lq.orderByColumn ? { field: String(lq.orderByColumn), desc: !!lq.orderByIsDescending } : null,
        inlineEditingEnabled: lq.inlineEditingEnabled !== false,
        limit,
        offset,
        dateFormat: L.metadata ? L.metadata.dateFormat : undefined,
        dateTimeFormat: L.metadata ? L.metadata.dateTimeFormat : undefined,
        // Related lists: the server-resolved fixed query, table permissions and m2m metadata.
        fixedQuery: L.fixedQuery || '',
        canCreate: !L.metadata || L.metadata.canCreate !== false,
        canWrite: !L.metadata || L.metadata.canWrite !== false,
        canDelete: !L.metadata || L.metadata.canDelete !== false,
        m2m: L.metadata && L.metadata.m2MData && L.metadata.m2MData.isM2M
            ? { sourceField: String(L.metadata.m2MData.sourceField || ''), targetTable: String(L.metadata.m2MData.targetTable || ''), targetField: String(L.metadata.m2MData.targetField || '') }
            : null,
    }
}

export async function fetchListCount(args: Pick<ListArgs, 'table' | 'query' | 'fixedQuery' | 'keywords'>, signal?: AbortSignal): Promise<number> {
    const data = await graphql(
        `query rpListCount($table: String!, $query: String, $fixedQuery: String) { GlideListCount_Query { getListCount(table: $table, query: $query, fixedQuery: $fixedQuery) { count } } }`,
        { table: safeName(args.table, 'table'), query: effectiveQuery({ query: args.query, keywords: args.keywords }), fixedQuery: args.fixedQuery || '' },
        { signal },
    )
    const c = data && data.GlideListCount_Query && data.GlideListCount_Query.getListCount
    return c ? Number(c.count) : 0
}

// ---- breadcrumbs (the platform's parser supplies labels and display values) ------------------

const PARSE_QUERY = `query rpParse($table: String!, $query: String) {
  GlideConditionBuilder_Query {
    parse(tableName: $table, encodedQueryString: $query) {
      comparisons {
        ... on GlideConditionBuilder_BasicComparisonType {
          comparisonType
          field { internal display type }
          operator { internal display }
          conditionValue { internal display displayParts }
        }
      }
    }
  }
}`

/**
 * Breadcrumbs for a filter: our own model gives the structure (positions for removal), the
 * platform's parse() gives the labels ("Caller is Abel Tuter", "Opened on Today").
 */
export async function fetchCrumbs(table: string, filter: string, signal?: AbortSignal): Promise<Crumb[]> {
    const model: QueryModel = parseQuery(filter)
    const flat = flattenTerms(model)
    if (!flat.length) return []
    let comparisons: any[] = []
    try {
        const data = await graphql(PARSE_QUERY, { table: safeName(table, 'table'), query: serializeQuery({ groups: model.groups }) }, { signal, allowPartial: true })
        comparisons = (data && data.GlideConditionBuilder_Query && data.GlideConditionBuilder_Query.parse && data.GlideConditionBuilder_Query.parse.comparisons) || []
    } catch (e) {
        if ((e as Error).name === 'AbortError') throw e
    }
    return flat.map((f, i) => {
        const c = comparisons[i]
        const match = c && c.field && c.field.internal === f.term.field
        const op = findOperator(match ? c.field.type : undefined, false, f.term.op)
        const valueLabel = match && c.conditionValue ? String(c.conditionValue.display || (c.conditionValue.displayParts || []).join(', ') || '') : ''
        return {
            field: f.term.field,
            fieldLabel: match ? String(c.field.display || f.term.field) : f.term.field,
            op: f.term.op,
            opLabel: match && c.operator ? String(c.operator.display || op.label) : op.label,
            value: f.term.value,
            valueLabel: valueLabel || (op.editor === 'none' ? '' : describeTerm({ ...f.term, field: '', op: '' }).trim()),
            join: f.join,
            gi: f.gi,
            ci: f.ci,
            ti: f.ti,
        }
    })
}

// ---- fields for the condition builder ---------------------------------------------------------

export async function fetchFilterFields(table: string, signal?: AbortSignal): Promise<{ table: string; label: string; fields: FilterField[] }> {
    const data = await graphql(
        `query rpFilterFields($table: String!) { GlideConditionBuilder_Query { dotwalkTableData(tableName: $table) { tableName tableLabel dotwalkFieldData { name label type referenceTable } } } }`,
        { table: safeName(table, 'table') },
        { signal },
    )
    const d = data && data.GlideConditionBuilder_Query && data.GlideConditionBuilder_Query.dotwalkTableData
    if (!d) return { table, label: table, fields: [] }
    const fields: FilterField[] = (d.dotwalkFieldData || []).map((f: any) => ({
        name: String(f.name),
        label: String(f.label || f.name),
        type: String(f.type || 'string'),
        referenceTable: f.referenceTable || undefined,
    }))
    fields.sort((a, b) => a.label.localeCompare(b.label))
    return { table: d.tableName || table, label: d.tableLabel || table, fields }
}

// ---- inline edit ------------------------------------------------------------------------------

const PREFETCH_QUERY = `query rpCanEdit($table: String!, $sysIds: [String]!, $column: String!, $selectedSysId: String!, $fieldType: String!) {
  GlideListLayoutInline_Query {
    getPreFetch(table: $table, column: $column, sysIds: $sysIds, selectedSysId: $selectedSysId, fieldType: $fieldType) {
      inlineEditPreFetch {
        ... on GlideListLayoutInline_ListLayoutInlineEditSinglePreFetchType { sysId value displayValue canListEdit verifiedColumn verifiedSysId verifiedTable }
        ... on GlideListLayoutInline_ListLayoutInlineEditSinglePreFetchPhoneType { sysId value displayValue canListEdit verifiedColumn verifiedSysId verifiedTable }
      }
    }
  }
}`

/**
 * Whether the user may list-edit `column` on each record: the platform evaluates the list_edit
 * ACLs, field write ACLs and dot-walk targets (verifiedTable/SysId/Column = what actually gets
 * written). Records the server doesn't return are not editable.
 */
export async function fetchEditability(
    args: { table: string; column: string; sysIds: string[]; fieldType?: string },
    signal?: AbortSignal,
): Promise<Record<string, CellEditability & { table?: string; sysId?: string; column?: string; value?: string; displayValue?: string }>> {
    const out: Record<string, any> = {}
    if (!args.sysIds.length) return out
    const data = await graphql(
        PREFETCH_QUERY,
        { table: safeName(args.table, 'table'), sysIds: args.sysIds, column: args.column, selectedSysId: args.sysIds[0], fieldType: args.fieldType || 'string' },
        { signal, allowPartial: true },
    )
    const list = (data && data.GlideListLayoutInline_Query && data.GlideListLayoutInline_Query.getPreFetch && data.GlideListLayoutInline_Query.getPreFetch.inlineEditPreFetch) || []
    for (const id of args.sysIds) out[id] = { canEdit: false, reason: 'You can’t edit this field on this record' }
    for (const p of list) {
        if (!p || !p.sysId) continue
        out[p.sysId] = {
            canEdit: !!p.canListEdit,
            reason: p.canListEdit ? undefined : 'You can’t edit this field on this record',
            table: p.verifiedTable || args.table,
            sysId: p.verifiedSysId || p.sysId,
            column: p.verifiedColumn || args.column,
            value: p.value == null ? '' : String(p.value),
            displayValue: p.displayValue == null ? '' : String(p.displayValue),
        }
    }
    return out
}

const WRITE_QUERY = `query rpWriteCells($table: String!, $values: [GlideListLayoutInline_InlineMultiRowInputType]!, $sysIds: [String]!) {
  GlideListLayoutInline_Query {
    writeMultiRow(table: $table, multiRowInlineValue: $values, sysIds: $sysIds) {
      multiRowWrittenValues { sysId writtenValues { column table value } }
    }
  }
}`

const NOTIFICATIONS_QUERY = `query rpListNotifications { GlideListLayoutInline_Query { getNotifications { infoMessages errorMessages trivialMessages } } }`

/**
 * Write one or more columns on one or more records (inline edit, bulk edit). The platform runs
 * the update with business rules and data policies; messages they raise come back as
 * errors/info (getNotifications).
 */
export async function writeCells(args: { table: string; sysIds: string[]; values: { column: string; value: string }[] }, signal?: AbortSignal): Promise<WriteResult> {
    const data = await graphql(WRITE_QUERY, { table: safeName(args.table, 'table'), values: args.values, sysIds: args.sysIds }, { signal, allowPartial: true })
    const written = ((data && data.GlideListLayoutInline_Query && data.GlideListLayoutInline_Query.writeMultiRow && data.GlideListLayoutInline_Query.writeMultiRow.multiRowWrittenValues) || []) as any[]
    const ok = new Set<string>()
    for (const w of written) {
        const cols = (w.writtenValues || []).map((x: any) => x.column)
        if (args.values.every((v) => cols.indexOf(v.column) >= 0 || cols.indexOf(v.column.split('.').pop()) >= 0)) ok.add(String(w.sysId))
    }
    let errors: string[] = []
    let info: string[] = []
    try {
        const n = await graphql(NOTIFICATIONS_QUERY, {}, { signal, allowPartial: true })
        const g = n && n.GlideListLayoutInline_Query && n.GlideListLayoutInline_Query.getNotifications
        if (g) {
            errors = (g.errorMessages || []).map(String)
            info = (g.infoMessages || []).map(String)
        }
    } catch (e) {
        /* notifications are best effort */
    }
    const failed = args.sysIds.filter((id) => !ok.has(id))
    return { ok: failed.length === 0 && errors.length === 0, written: Array.from(ok), failed, errors, info }
}

// ---- personalization (per-user preference, with a local cache) --------------------------------

export function preferenceName(key: string): string {
    return 'x_312987_portal.list.' + String(key).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80)
}

/** The user's stored list preferences (sys_user_preference), or null. */
export async function fetchPreference(userSysId: string, key: string, signal?: AbortSignal): Promise<ListPreferences | null> {
    if (!userSysId) return null
    const q = encodeURIComponent(`user=${userSysId}^name=${preferenceName(key)}`)
    const rows = await restGet<any[]>(`/api/now/table/sys_user_preference?sysparm_query=${q}&sysparm_fields=value&sysparm_limit=1`, signal)
    if (!rows || !rows.length || !rows[0].value) return null
    try {
        return JSON.parse(rows[0].value)
    } catch (e) {
        return null
    }
}

/**
 * Any of OUR user preferences by full name (raw string value), on the same read / save path as list
 * personalization. Callers keep to the x_312987_portal.* namespace: never a platform preference
 * the classic UI or Workspace reads.
 */
export async function fetchUserPreferenceValue(userSysId: string, name: string, signal?: AbortSignal): Promise<string | null> {
    if (!userSysId || !/^x_312987_portal\./.test(name)) return null
    const q = encodeURIComponent(`user=${userSysId}^name=${name}`)
    const rows = await restGet<any[]>(`/api/now/table/sys_user_preference?sysparm_query=${q}&sysparm_fields=value&sysparm_limit=1`, signal)
    return rows && rows.length ? String(rows[0].value ?? '') : null
}

export async function saveUserPreferenceValue(name: string, value: string): Promise<void> {
    if (!/^x_312987_portal\./.test(name)) throw new Error(`Refusing to write a non-portal preference: ${name}`)
    await graphql(`mutation rpSetPref($name: String!, $value: String!) { GlideLayoutDomain_Mutation { user { setPreference(name: $name, value: $value) { name } } } }`, { name, value })
}

export async function savePreference(key: string, prefs: ListPreferences): Promise<void> {
    await graphql(
        `mutation rpSetPref($name: String!, $value: String!) { GlideLayoutDomain_Mutation { user { setPreference(name: $name, value: $value) { name } } } }`,
        { name: preferenceName(key), value: JSON.stringify(prefs) },
    )
}
