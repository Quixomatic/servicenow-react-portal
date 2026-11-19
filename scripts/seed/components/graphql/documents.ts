import { graphql, restGet, safeName } from './client'
import type { Choice, FieldMeta, FormBootstrap, FormChanges, ReferenceItem, ReferenceSearchResult, FieldValue } from './types'

/**
 * Documents and fetchers. Each fetcher is a plain async function (usable outside React) and the
 * hooks in hooks.ts wrap them in TanStack Query.
 *
 *   fetchTableMeta      GET  /api/now/ui/meta/{table}              (REST: GraphQL has no per-table dictionary query outside a form view)
 *   fetchFormBootstrap  POST /api/now/graphql  GlideLayout_Query.formLayout
 *   fetchChoices        POST /api/now/graphql  GlideLayout_Query.choiceDataRetriever
 *   searchReference     POST /api/now/graphql  GlideLayout_Query.referenceDataRetriever
 *   fetchRecordValues   POST /api/now/graphql  GlideRecord_Query.<table>
 */

// ---- helpers --------------------------------------------------------------------------------

export function parseAttributes(input: unknown): Record<string, string> {
    const out: Record<string, string> = {}
    if (!input) return out
    if (Array.isArray(input)) {
        for (const a of input) if (a && a.name) out[String(a.name)] = a.value == null ? '' : String(a.value)
        return out
    }
    for (const part of String(input).split(',')) {
        const i = part.indexOf('=')
        const k = (i < 0 ? part : part.slice(0, i)).trim()
        if (k) out[k] = i < 0 ? 'true' : part.slice(i + 1).trim()
    }
    return out
}

function bool(v: unknown): boolean {
    return v === true || v === 'true'
}

function list(v: unknown): string[] | undefined {
    if (Array.isArray(v)) return v.map(String).filter(Boolean)
    if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean)
    return undefined
}

/** Stable JSON for query keys and serializedChanges (sorted keys). */
export function stableChanges(changes?: FormChanges | null): string {
    if (!changes) return '{}'
    const sorted: FormChanges = {}
    Object.keys(changes)
        .sort()
        .forEach((k) => {
            sorted[k] = changes[k] == null ? '' : String(changes[k])
        })
    return JSON.stringify(sorted)
}

// ---- table metadata (UI meta API) -----------------------------------------------------------

function metaFromUiColumn(table: string, c: any): FieldMeta {
    const attributes = parseAttributes(c.attributes)
    const refAttrs = c.reference_attributes || {}
    const type = String(c.internal_type || c.type || 'string')
    const uiType = String(c.type || type)
    const meta: FieldMeta = {
        table,
        name: String(c.name),
        label: String(c.label || c.name),
        // Choice fields report type=choice over a string/integer column: the UI type wins.
        type: uiType === 'choice' ? 'choice' : type,
        internalType: type,
        mandatory: bool(c.mandatory),
        readOnly: bool(c.read_only),
        hint: c.hint || undefined,
        maxLength: c.max_length ? Number(c.max_length) : undefined,
        defaultValue: c.default || undefined,
        attributes,
        source: 'meta',
    }
    if (Array.isArray(c.choices)) {
        meta.choices = c.choices.map(
            (ch: any): Choice => ({
                value: String(ch.value ?? ''),
                label: String(ch.label ?? ch.value ?? ''),
                sequence: ch.sequence,
                dependentValues: ch.parameters && Array.isArray(ch.parameters.dependent_values) ? ch.parameters.dependent_values.map(String) : undefined,
            }),
        )
        meta.choiceType = c.choice_type != null ? Number(c.choice_type) : undefined
    }
    if (c.reference) {
        meta.reference = {
            table: String(c.reference),
            displayField: c.reference_display_field || refAttrs.display_field || undefined,
            displayColumns: list(refAttrs.ref_ac_columns),
        }
    }
    return meta
}

/** Every column of a table (label, type, hint, choices, reference, attributes, max length). */
export async function fetchTableMeta(table: string, signal?: AbortSignal): Promise<Record<string, FieldMeta>> {
    const result = await restGet<{ columns: Record<string, any> }>(`/api/now/ui/meta/${encodeURIComponent(safeName(table, 'table'))}`, signal)
    const out: Record<string, FieldMeta> = {}
    const cols = (result && result.columns) || {}
    for (const name of Object.keys(cols)) out[name] = metaFromUiColumn(table, cols[name])
    return out
}

// ---- form bootstrap (GlideLayout_Query.formLayout) ------------------------------------------

export const FORM_LAYOUT_QUERY = `query rpFormLayout($table: String!, $view: String, $sysId: String, $query: String) {
  GlideLayout_Query {
    formLayout(table: $table, view: $view, sysId: $sysId, query: $query) {
      table sysId isValidRecord canReadRecord lastErrorMessage encodedRecord
      recordMetadata { modCount }
      sectionLayout { sysId caption rows { fields } }
      recordValues { name value displayValue }
      fieldStates { name hidden mandatory readonly }
      elementsData {
        name: elementName
        dictionary: dictionaryData {
          type: dictionaryType label isMandatory sysReadonly canWrite canRead dependentField internalType
          attributes { name value }
        }
        ... on GlideLayout_ChoiceElementType { choices { displayValue value } }
        ... on GlideLayout_ReferenceElementType { reference referenceQualifier useReferenceQualifier refAcColumns refAcOrderBy refAcDisplayValue dependentOnField }
        ... on GlideLayout_GlideListElementType { reference }
        ... on GlideLayout_ValueElementType { maxLength }
        ... on GlideLayout_CurrencyElementType { code defaultCurrency currencyCodes { code symbol name } }
        ... on GlideLayout_PhoneNumberElementType { country countryCodes { code name } }
      }
    }
  }
}`

function metaFromElement(table: string, e: any): FieldMeta {
    const d = e.dictionary || {}
    const attributes = parseAttributes(d.attributes)
    const meta: FieldMeta = {
        table,
        name: String(e.name),
        label: String(d.label || e.name),
        type: String(d.type || d.internalType || 'string'),
        internalType: d.internalType || undefined,
        mandatory: bool(d.isMandatory),
        readOnly: bool(d.sysReadonly),
        canRead: d.canRead !== false,
        canWrite: d.canWrite !== false,
        dependsOn: d.dependentField || undefined,
        maxLength: e.maxLength ? Number(e.maxLength) : undefined,
        attributes,
        source: 'layout',
    }
    if (Array.isArray(e.choices)) meta.choices = e.choices.map((c: any) => ({ value: String(c.value ?? ''), label: String(c.displayValue ?? c.value ?? '') }))
    if (e.reference) {
        meta.reference = {
            table: String(e.reference),
            qualifier: e.referenceQualifier || undefined,
            useQualifier: e.useReferenceQualifier || undefined,
            displayColumns: list(e.refAcColumns),
            orderBy: e.refAcOrderBy || undefined,
            dependsOn: e.dependentOnField || undefined,
        }
    }
    if (Array.isArray(e.currencyCodes)) meta.currencyCodes = e.currencyCodes
    if (Array.isArray(e.countryCodes)) meta.countryCodes = e.countryCodes
    return meta
}

/**
 * One request for a record form: values + display values, server field states (dictionary, ACL,
 * policies), field metadata for the view's elements, the encoded record and modCount.
 * sysId '-1' opens a new record (the platform evaluates defaults, including the next number).
 */
export async function fetchFormBootstrap(table: string, sysId: string, view = '', signal?: AbortSignal): Promise<FormBootstrap> {
    const data = await graphql(FORM_LAYOUT_QUERY, { table, sysId: sysId || '-1', view, query: '' }, { signal })
    const L = data && data.GlideLayout_Query && data.GlideLayout_Query.formLayout
    if (!L) throw new Error(`No form layout for ${table}`)
    if (L.isValidRecord === false || L.canReadRecord === false) throw new Error(L.lastErrorMessage || `Record ${table}/${sysId} not found or not readable`)
    const values: Record<string, FieldValue> = {}
    for (const v of L.recordValues || []) values[v.name] = { value: v.value == null ? '' : String(v.value), displayValue: v.displayValue == null ? '' : String(v.displayValue) }
    const states: FormBootstrap['states'] = {}
    for (const s of L.fieldStates || []) states[s.name] = { hidden: !!s.hidden, mandatory: !!s.mandatory, readonly: !!s.readonly }
    const meta: Record<string, FieldMeta> = {}
    for (const e of L.elementsData || []) if (e && e.name) meta[e.name] = metaFromElement(L.table || table, e)
    return {
        table: L.table || table,
        sysId: L.sysId || sysId,
        isNew: !sysId || sysId === '-1',
        encodedRecord: L.encodedRecord || '',
        modCount: L.recordMetadata ? Number(L.recordMetadata.modCount) : null,
        values,
        states,
        meta,
        sections: (L.sectionLayout || []).map((s: any) => ({ id: s.sysId, caption: s.caption || '', rows: (s.rows || []).map((r: any) => r.fields || []) })),
    }
}

// ---- choices (GlideLayout_Query.choiceDataRetriever) ----------------------------------------

export const CHOICES_QUERY = `query rpChoices($table: String!, $field: String!, $sysId: String, $changes: String, $encodedRecord: String) {
  GlideLayout_Query {
    choiceDataRetriever(tableName: $table, fieldName: $field, sysId: $sysId, serializedChanges: $changes, encodedRecord: $encodedRecord) {
      choice { value label }
    }
  }
}`

/** Choices evaluated by the server against unsaved form values (dependent choices). */
export async function fetchChoices(
    args: { table: string; field: string; sysId?: string; changes?: FormChanges; encodedRecord?: string },
    signal?: AbortSignal,
): Promise<Choice[]> {
    const data = await graphql(
        CHOICES_QUERY,
        { table: args.table, field: args.field, sysId: args.sysId || '-1', changes: stableChanges(args.changes), encodedRecord: args.encodedRecord || '' },
        { signal },
    )
    const r = data && data.GlideLayout_Query && data.GlideLayout_Query.choiceDataRetriever
    return ((r && r.choice) || []).map((c: any) => ({ value: String(c.value ?? ''), label: String(c.label ?? c.value ?? '') }))
}

// ---- reference search (GlideLayout_Query.referenceDataRetriever) ----------------------------

export const REFERENCE_QUERY = `query rpReference($table: String!, $field: String!, $sysId: String, $encodedRecord: String, $changes: String, $chars: String!, $limit: Int, $offset: Int, $ignoreRefQual: Glide_Boolean) {
  GlideLayout_Query {
    referenceDataRetriever(tableName: $table, fieldName: $field, sysId: $sysId, encodedRecord: $encodedRecord, serializedChanges: $changes,
      chars: $chars, pagination: { limit: $limit, offset: $offset }, ignoreTotalCount: false, orderByDisplayColumn: true, sysparm_ignore_ref_qual: $ignoreRefQual) {
      totalCount recentCount matchesCount
      referenceRecentDataList { sysId referenceData { key value } }
      referenceDataList { sysId referenceData { key value } }
    }
  }
}`

function toItem(r: any, recent: boolean): ReferenceItem {
    const columns = (r.referenceData || []).map((d: any) => ({ key: String(d.key), value: d.value == null ? '' : String(d.value) }))
    return { value: String(r.sysId), displayValue: columns.length ? columns[0].value : String(r.sysId), columns, recent }
}

/**
 * Reference lookup for a field, as the form would do it: the server applies the field's reference
 * qualifier (simple, dynamic or advanced) and dependent field against `changes` (unsaved values)
 * and `encodedRecord`. term '' returns the user's recent picks only; '*' matches everything.
 */
export async function searchReference(
    args: { table: string; field: string; term: string; sysId?: string; changes?: FormChanges; encodedRecord?: string; limit?: number; offset?: number; ignoreQualifier?: boolean },
    signal?: AbortSignal,
): Promise<ReferenceSearchResult> {
    const data = await graphql(
        REFERENCE_QUERY,
        {
            table: args.table,
            field: args.field,
            sysId: args.sysId || '-1',
            encodedRecord: args.encodedRecord || '',
            changes: stableChanges(args.changes),
            chars: args.term,
            limit: args.limit || 20,
            offset: args.offset || 0,
            ignoreRefQual: !!args.ignoreQualifier,
        },
        { signal },
    )
    const r = (data && data.GlideLayout_Query && data.GlideLayout_Query.referenceDataRetriever) || {}
    const recent = (r.referenceRecentDataList || []).map((x: any) => toItem(x, true))
    const seen = new Set(recent.map((x: ReferenceItem) => x.value))
    const matches = (r.referenceDataList || []).map((x: any) => toItem(x, false)).filter((x: ReferenceItem) => !seen.has(x.value))
    return { recent, matches, total: r.totalCount == null ? null : Number(r.totalCount) }
}

// ---- record values (GlideRecord_Query) ------------------------------------------------------

/** Values + display values of some fields of one record (or of the first match of a query). */
export async function fetchRecordValues(
    table: string,
    target: { sysId?: string; query?: string },
    fields: string[],
    signal?: AbortSignal,
): Promise<Record<string, FieldValue> | null> {
    safeName(table, 'table')
    const names = Array.from(new Set(['sys_id'].concat(fields))).map((f) => safeName(f, 'field'))
    const doc = `query rpRecord($q: String) { GlideRecord_Query { ${table}(queryConditions: $q, pagination: { limit: 1 }) { _results { ${names
        .map((n) => `${n} { value displayValue }`)
        .join(' ')} } } } }`
    const q = target.sysId ? `sys_id=${target.sysId}` : target.query || ''
    const data = await graphql(doc, { q }, { signal })
    const rows = data && data.GlideRecord_Query && data.GlideRecord_Query[table] && data.GlideRecord_Query[table]._results
    if (!rows || !rows.length) return null
    const out: Record<string, FieldValue> = {}
    for (const n of names) {
        const cell = rows[0][n] || {}
        out[n] = { value: cell.value == null ? '' : String(cell.value), displayValue: cell.displayValue == null ? '' : String(cell.displayValue) }
    }
    return out
}

/** Display value of a referenced record (its display field). */
export async function fetchDisplayValue(table: string, sysId: string, displayField = 'name', signal?: AbortSignal): Promise<string> {
    if (!sysId) return ''
    const v = await fetchRecordValues(table, { sysId }, [displayField], signal)
    return v ? v[displayField].displayValue || v[displayField].value : ''
}
