import { graphql, restGet, safeName, authHeaders } from './client'
import type {
    Choice,
    FieldMeta,
    FormBootstrap,
    FormChanges,
    FormView,
    ReferenceItem,
    ReferenceSearchResult,
    FieldValue,
    SessionNotification,
    UiAction,
    UiActionResult,
    UiPolicy,
    ClientScript,
    ClientScripts,
} from './types'

/**
 * Documents and fetchers. Each fetcher is a plain async function (usable outside React) and the
 * hooks in hooks.ts wrap them in TanStack Query.
 *
 *   fetchTableMeta      GET  /api/now/ui/meta/{table}              (REST: GraphQL has no per-table dictionary query outside a form view)
 *   fetchFormBootstrap  POST /api/now/graphql  GlideViewQuery_Query.uiView → formLayout + UI policies + UI actions
 *   fetchFormViews      POST /api/now/graphql  GlideViewQuery_Query.uiView.availableViews
 *   executeUiAction     POST /api/now/ui/ui_action/{sysId}   (form Save = sysverb_ws_save)
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

/** UI policy fields (forms and catalog share the shape; catalog adds value / message actions). */
export const UI_POLICY_FIELDS = `shortDescription sysId reverse onLoad isRunScripts preEvaluated preEvaluatedResult
  scriptTrue { script } scriptFalse { script }
  actions { visible name disabled mandatory cleared: clearValue }
  conditions { type field: fieldName fieldLabel value oper: operator or: isOrQuery newquery: isNewQuery preEvaluatedTerm preEvaluatedTermResult }`

/** Client scripts (forms and catalog share the shape). */
export const CLIENT_SCRIPT_FIELDS = `onLoad { name sysId script type fieldName tableName }
  onChange { name sysId script type fieldName tableName }
  onSubmit { name sysId script type fieldName tableName }
  messages { name value }`

/** GraphQL client scripts → ClientScripts (unknown shape → empty lists). */
export function normalizeClientScripts(s: any): ClientScripts {
    const list = (arr: any): ClientScript[] =>
        (Array.isArray(arr) ? arr : [])
            .filter((x: any) => x && x.script)
            .map((x: any) => ({ name: String(x.name || ''), sysId: String(x.sysId || ''), script: String(x.script), type: String(x.type || ''), fieldName: String(x.fieldName || ''), tableName: String(x.tableName || '') }))
    const messages: Record<string, string> = {}
    for (const m of (s && s.messages) || []) if (m && m.name) messages[String(m.name)] = m.value == null ? String(m.name) : String(m.value)
    return { onLoad: list(s && s.onLoad), onChange: list(s && s.onChange), onSubmit: list(s && s.onSubmit), messages }
}

function parseScratchpad(v: unknown): Record<string, unknown> {
    if (!v) return {}
    if (typeof v === 'object') return v as Record<string, unknown>
    try {
        const o = JSON.parse(String(v))
        return o && typeof o === 'object' ? o : {}
    } catch (e) {
        return {}
    }
}

/**
 * The record form as Workspace loads it: the view resolver (GlideViewQuery_Query.uiView) wraps
 * the form layout, the UI policies (GlideClientScriptingEnvironment_Query) and the form's UI
 * actions (GlideUIAction_Query), all evaluated for the resolved view ("$$parent.viewName$$").
 */
export const FORM_QUERY = `query rpForm($table: String!, $sysId: String!, $query: String, $forcedViewName: String) {
  GlideViewQuery_Query {
    uiView(table: $table, views: "", sysId: $sysId, query: $query, forcedViewName: $forcedViewName) {
      view
      glideLayoutItem(table: $table, sysId: $sysId, query: $query) {
        _query {
          GlideLayout_Query {
            formLayout(table: $table, view: "$$parent.viewName$$", sysId: $sysId, query: $query) {
              table sysId isValidRecord canReadRecord lastErrorMessage encodedRecord
              recordMetadata { modCount }
              sectionLayout { sysId caption captionDisplay rows { fields } }
              formatters { name }
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
          GlideClientScriptingEnvironment_Query {
            ClientScriptingEnvironment_Policies(table: $table, view: "$$parent.viewName$$", sysId: $sysId, query: $query) { ${UI_POLICY_FIELDS} }
            ClientScriptingEnvironment_Scripts(table: $table, view: "$$parent.viewName$$", sysId: $sysId, query: $query) { ${CLIENT_SCRIPT_FIELDS} }
            ClientScriptingEnvironment_Globals(table: $table, sysId: $sysId, query: $query) { g_scratchpad g_language g_date_time_format g_decimal_separator g_user_grouping g_text_direction }
          }
          GlideUIAction_Query {
            uiActions(table: $table, sysId: $sysId, query: $query, view: "$$parent.viewName$$") {
              formActions { label name sysId order style type clientScript hasClientScript hint }
            }
          }
        }
      }
    }
  }
}`

const flag = (v: unknown): 'true' | 'false' | 'ignore' => (v === true || v === 'true' ? 'true' : v === false || v === 'false' ? 'false' : 'ignore')

/** GraphQL policy → UiPolicy (forms and catalog). */
export function normalizePolicy(p: any): UiPolicy {
    return {
        id: String(p.sysId || ''),
        description: String(p.shortDescription || ''),
        reverse: bool(p.reverse),
        onLoad: p.onLoad == null ? true : bool(p.onLoad),
        runScripts: bool(p.isRunScripts),
        preEvaluated: bool(p.preEvaluated),
        preEvaluatedResult: bool(p.preEvaluatedResult),
        scriptTrue: (p.scriptTrue && p.scriptTrue.script) || undefined,
        scriptFalse: (p.scriptFalse && p.scriptFalse.script) || undefined,
        actions: (p.actions || []).filter((a: any) => a && a.name).map((a: any) => ({
            name: String(a.name),
            visible: flag(a.visible),
            mandatory: flag(a.mandatory),
            disabled: flag(a.disabled),
            cleared: bool(a.cleared),
            value: a.value == null ? undefined : String(a.value),
            valueAction: a.valueAction || undefined,
            fieldMessage: a.fieldMessage || undefined,
            fieldMessageType: a.fieldMessageType || undefined,
        })),
        conditions: (p.conditions || []).filter((c: any) => c && c.field).map((c: any) => ({
            field: String(c.field),
            oper: String(c.oper || '='),
            value: c.value == null ? '' : String(c.value),
            type: c.type || undefined,
            label: c.fieldLabel || undefined,
            or: bool(c.or),
            newquery: bool(c.newquery),
            preEvaluatedTerm: bool(c.preEvaluatedTerm),
            preEvaluatedTermResult: bool(c.preEvaluatedTermResult),
        })),
    }
}

function normalizeAction(a: any): UiAction {
    return {
        sysId: String(a.sysId || ''),
        name: String(a.name || ''),
        label: String(a.label || a.name || ''),
        order: Number(a.order || 0),
        type: String(a.type || 'button'),
        style: a.style || undefined,
        hint: a.hint || undefined,
        hasClientScript: bool(a.hasClientScript),
        clientScript: a.clientScript || undefined,
    }
}

/**
 * One request for a record form, as Workspace makes it: the resolved view, values + display
 * values, server field states (dictionary, ACL), field metadata for the view's elements, sections
 * (rows → columns → fields), UI policies, form UI actions, the encoded record and modCount.
 * sysId '-1' opens a new record: the platform evaluates defaults and RESERVES the next number, so
 * never refetch a new record in the background. `query` (encoded, e.g. 'incident=<id>') presets a
 * new record's values, as Workspace's openRecord(table, '-1', { query }) does.
 */
export async function fetchFormBootstrap(table: string, sysId: string, view = '', signal?: AbortSignal, query = ''): Promise<FormBootstrap> {
    safeName(table, 'table')
    const data = await graphql(FORM_QUERY, { table, sysId: sysId || '-1', query: query || '', forcedViewName: view || '' }, { signal, allowPartial: true })
    const U = data && data.GlideViewQuery_Query && data.GlideViewQuery_Query.uiView
    const Q = (U && U.glideLayoutItem && U.glideLayoutItem._query) || {}
    const L = Q.GlideLayout_Query && Q.GlideLayout_Query.formLayout
    if (!L) throw new Error(`No form layout for ${table}`)
    if (L.isValidRecord === false || L.canReadRecord === false) throw new Error(L.lastErrorMessage || `Record ${table}/${sysId} not found or not readable`)
    const values: Record<string, FieldValue> = {}
    for (const v of L.recordValues || []) values[v.name] = { value: v.value == null ? '' : String(v.value), displayValue: v.displayValue == null ? '' : String(v.displayValue) }
    const states: FormBootstrap['states'] = {}
    for (const s of L.fieldStates || []) states[s.name] = { hidden: !!s.hidden, mandatory: !!s.mandatory, readonly: !!s.readonly }
    const meta: Record<string, FieldMeta> = {}
    for (const e of L.elementsData || []) if (e && e.name) meta[e.name] = metaFromElement(L.table || table, e)
    const S = Q.GlideClientScriptingEnvironment_Query
    const A = Q.GlideUIAction_Query && Q.GlideUIAction_Query.uiActions
    const warnings: string[] = []
    if (!S || !S.ClientScriptingEnvironment_Policies) warnings.push('UI policies unavailable')
    if (!A || !A.formActions) warnings.push('UI actions unavailable')
    if (!S || !S.ClientScriptingEnvironment_Scripts) warnings.push('Client scripts unavailable')
    const G = (S && S.ClientScriptingEnvironment_Globals) || {}
    const sections = (L.sectionLayout || []).map((s: any) => ({
        id: String(s.sysId || ''),
        caption: s.caption || '',
        label: s.captionDisplay || s.caption || '',
        // rows: [[{ fields: [...] }, { fields: [...] }], …] → rows → columns → fields
        rows: (s.rows || []).map((row: any) => (Array.isArray(row) ? row : [row]).map((col: any) => ((col && col.fields) || []).map(String))),
    }))
    return {
        table: L.table || table,
        sysId: L.sysId || sysId,
        isNew: !sysId || sysId === '-1',
        encodedRecord: L.encodedRecord || '',
        modCount: L.recordMetadata ? Number(L.recordMetadata.modCount) : null,
        values,
        states,
        meta,
        sections,
        view: (U && U.view) || view || '',
        tableLabel: (sections[0] && sections[0].label) || table,
        formatters: (L.formatters || []).map((f: any) => String(f.name || '')).filter(Boolean),
        policies: ((S && S.ClientScriptingEnvironment_Policies) || []).map(normalizePolicy),
        actions: ((A && A.formActions) || []).map(normalizeAction).sort((a: UiAction, b: UiAction) => a.order - b.order),
        scripts: normalizeClientScripts(S && S.ClientScriptingEnvironment_Scripts),
        scratchpad: parseScratchpad(G.g_scratchpad),
        globals: {
            language: G.g_language || '',
            dateTimeFormat: G.g_date_time_format || '',
            decimalSeparator: G.g_decimal_separator || '.',
            grouping: G.g_user_grouping || ',',
            textDirection: G.g_text_direction || 'ltr',
        },
        warnings,
    }
}

// ---- form views (GlideViewQuery_Query.uiView.availableViews) --------------------------------

export const FORM_VIEWS_QUERY = `query rpFormViews($table: String!, $sysId: String!) {
  GlideViewQuery_Query { uiView(table: $table, views: "", sysId: $sysId, query: "") { view availableViews { name label } } }
}`

/** The form views a table offers (and the one the view rules pick for this record; the list is
 *  empty for a new record, '-1'). No layout is loaded. */
export async function fetchFormViews(table: string, sysId = '-1', signal?: AbortSignal): Promise<{ current: string; views: FormView[] }> {
    const data = await graphql(FORM_VIEWS_QUERY, { table: safeName(table, 'table'), sysId: sysId || '-1' }, { signal })
    const U = (data && data.GlideViewQuery_Query && data.GlideViewQuery_Query.uiView) || {}
    return { current: U.view || '', views: (U.availableViews || []).map((v: any) => ({ name: String(v.name), label: String(v.label || v.name) })) }
}

// ---- server UI actions (save, insert, …): POST /api/now/ui/ui_action/:sysId -----------------

/** A failed UI action: the platform's message plus field-level messages. */
export class UiActionError extends Error {
    status: number
    fieldMessages: { field: string; type: string; message: string }[]
    notifications: SessionNotification[]
    constructor(message: string, status: number, fieldMessages: UiActionError['fieldMessages'] = [], notifications: SessionNotification[] = []) {
        super(message)
        this.name = 'UiActionError'
        this.status = status
        this.fieldMessages = fieldMessages
        this.notifications = notifications
    }
}

function notificationsOf(json: any): SessionNotification[] {
    const list = (json && json.session && json.session.notifications) || []
    return list.map((n: any) => ({ type: String(n.type || n.notificationType || 'info'), text: String(n.text || n.message || '') })).filter((n: SessionNotification) => n.text)
}

/**
 * Run a server UI action against a record, exactly as Workspace's g_form does (the form's Save
 * is the 'sysverb_ws_save' action): the server applies `fields` to the record, runs the action
 * script (update / insert → business rules, data policies, ACLs) and returns the operation plus
 * the session notifications business rules queued.
 *   fields: [{ name, value, displayValue?, originalValue? }]
 */
export async function executeUiAction(args: {
    actionSysId: string
    table: string
    sysId: string
    encodedRecord?: string
    fields: { name: string; value: string; displayValue?: string; originalValue?: string }[]
    signal?: AbortSignal
}): Promise<UiActionResult> {
    const url = `/api/now/ui/ui_action/${encodeURIComponent(args.actionSysId)}?sysparm_table=${encodeURIComponent(args.table)}&sysparm_sys_id=${encodeURIComponent(args.sysId || '-1')}`
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(true), 'X-WantSessionNotificationMessages': 'true' },
        body: JSON.stringify({
            encodedRecord: args.encodedRecord || '',
            fields: args.fields,
            parentTable: '',
            parentRecordSysId: '',
            linkCollection: '',
            collectionRelatedField: '',
            collectionKey: '',
            additionalParams: {},
        }),
        signal: args.signal,
    })
    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    const notifications = notificationsOf(json)
    const result = (json && (json.result || json)) || {}
    if (!response.ok || result.status === 'failure') {
        const err = result.error || (json && json.error) || {}
        const fieldMessages: UiActionError['fieldMessages'] = []
        for (const f of result.fieldMessages || []) for (const m of f.debugMessages || []) fieldMessages.push({ field: String(f.elementId || ''), type: String(m.type || 'error'), message: String(m.message || '') })
        const message = err.message || err.detail || (notifications.find((n) => n.type === 'error') || ({} as any)).text || `The action failed (HTTP ${response.status})`
        throw new UiActionError(String(message), response.status, fieldMessages, notifications)
    }
    const record = result.record || {}
    const r = result.redirect
    const meta = (r && (r.type_metadata || r.typeMetadata)) || {}
    const redirect =
        r && typeof r === 'object'
            ? { type: String(r.type || ''), table: meta.table || undefined, sysId: meta.sys_id || undefined, query: meta.query || undefined, url: r.url || meta.url || undefined }
            : typeof r === 'string' && r
              ? { type: 'URL', url: r }
              : undefined
    return { operation: String(result.operation || ''), table: String(record.table || args.table), sysId: String(record.sys_id || args.sysId), notifications, redirect, raw: json }
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
