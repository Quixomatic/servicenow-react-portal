import { graphql, authHeaders, normalizePolicy, normalizeClientScripts, executeUiAction, CLIENT_SCRIPT_FIELDS } from 'utilities:app/graphql'
import type { ClientScript, ClientScripts, UiPolicy } from 'utilities:app/graphql'
import type { CatalogItem, CatalogVariable, DelegationResult, MrvsRowField, MrvsRowForm, PriceResult, SubmitResult, VariableEditorData } from './types'

/**
 * Catalog platform calls (the same ones Workspace's catalog form makes):
 *
 *   fetchCatalogItem      POST /api/now/graphql   AppCatalogView_Query.itemViewLayout → AppCatalog_Query.itemLayout
 *                         (item, pricing, variables, variablesLayout, variablesValues, catalog UI
 *                         policies: one request)
 *   fetchItemPrice        POST /api/sn_sc/servicecatalog/items/{id}/price
 *   submitCatalogItem     POST /api/sn_sc/servicecatalog/items/{id}/order_now | submit_producer
 *   fetchMrvsRowForm      POST /api/now/sp/widget/sc-multi-row-active-row   (row form metadata, plus the set's
 *                         catalog client scripts and UI policies; Workspace's MRVS modal uses it)
 *   validateVariableRegex POST /api/now/graphql   snSc.serviceCatalog.validateVariableRegex
 *   checkDelegation / canRequestFor  GET /api/sn_sc/v1/servicecatalog/items/{id}/delegation/{user}
 *                         (body { result: { result: true | false } }; Workspace's requested-for uses it)
 *   uploadVariableAttachment POST /api/now/attachment/file  (table ZZ_YY<draft table>, the draft record)
 *   fetchVariableEditor   POST /api/now/graphql   GlideLayout_Query.formLayout: the `variables` element
 *                         (GlideLayout_VariablesElementType._elements) + variablesLayout + recordValues,
 *                         the record's catalog UI policies / client scripts and its Save UI action:
 *                         what Workspace's form section renders as the variable editor
 *   saveRecordVariables   POST /api/now/ui/ui_action/{Save}   changed 'variables.<name>' fields (as Workspace's form save)
 */

export const ITEM_LAYOUT_QUERY = `query rpCatalogItem($table: String!, $sysId: String!) {
  AppCatalogView_Query {
    itemViewLayout(sourceTable: $table, sourceId: $sysId) {
      _query {
        AppCatalog_Query {
          itemLayout(sourceTable: $table, sourceId: $sysId) {
            name shortDescription description sysId picture requestMethod mandatoryAttachment hideQuantity hideAttachment
            quantity { label value } type targetRecordTable targetRecordSysId
            pricing { price displayPrice recurringPrice recurringDisplayPrice recurringFrequencyDisplay showPrices currencyCode currencySymbol }
            variablesLayout { name type parent ... on AppCatalog_ContainerVariableFieldLayoutType { caption captionDisplay layout columns { fields { name type } } } }
            variablesValues { name value displayValue }
            variables {
              __typename
              ... on AppCatalog_MultiRowVariableSetType { type name label containerType variableName id maxRows visible: canRead fields { name id label type unique hideOnGrid } rowData { row { id value displayValue } } }
              ... on AppCatalog_SingleRowVariableSetType { type id name label containerType visible variableName }
              ... on AppCatalog_ChoiceQuestionElementType { type id name variableName label order mandatory readOnly visible variableAttributes defaultValue lookupTable includeNone choiceDirection choices { displayValue: label value } dependentField referringTable referringRecordId hasPriceImplecations showHelp helpText instructions }
              ... on AppCatalog_ReferenceQuestionElementType { type id name variableName label order mandatory readOnly visible reference referenceQual listTable useReferenceQualifier variableAttributes defaultValue referringTable referringRecordId refAcOrderBy hasPriceImplecations showHelp helpText instructions }
              ... on AppCatalog_ContainerQuestionElementType { type id name variableName label order visible displayTitle layout containerType showHelp helpText instructions }
              ... on AppCatalog_AttachmentQuestionElementType { type id name variableName label order mandatory readOnly visible allowedFileExtensions maxAttachmentSize variableAttributes defaultValue showHelp helpText instructions }
              ... on AppCatalog_MacroQuestionElementType { type id name variableName label order mandatory variableAttributes defaultValue macroponentId showHelp helpText instructions }
              ... on AppCatalog_StandardQuestionElementType { type id name variableName label order mandatory readOnly visible variableAttributes defaultValue exampleText useConfirmation regExp hasPriceImplecations showHelp helpText instructions }
            }
          }
        }
        GlideClientScriptingEnvironment_Query {
          CatalogClientScriptingEnvironment_Policies(table: $table, sysId: $sysId) {
            shortDescription sysId reverse onLoad isRunScripts preEvaluated preEvaluatedResult
            scriptTrue { script } scriptFalse { script }
            actions { visible name disabled mandatory cleared: clearValue value valueAction fieldMessageType fieldMessage }
            conditions { type field: fieldName fieldLabel value oper: operator or: isOrQuery newquery: isNewQuery preEvaluatedTerm preEvaluatedTermResult }
          }
          CatalogClientScriptingEnvironment_Scripts(table: $table, sysId: $sysId) { ${CLIENT_SCRIPT_FIELDS} }
        }
      }
    }
  }
}`

const bool = (v: unknown) => v === true || v === 'true'

/** Item or record producer, with variables, layout and default values, in one GraphQL request. */
export async function fetchCatalogItem(sysId: string, table = 'sc_cat_item', signal?: AbortSignal): Promise<CatalogItem> {
    const data = await graphql(ITEM_LAYOUT_QUERY, { table, sysId }, { signal })
    const V = data && data.AppCatalogView_Query && data.AppCatalogView_Query.itemViewLayout && data.AppCatalogView_Query.itemViewLayout._query
    const L = V && V.AppCatalog_Query.itemLayout
    const S = V && V.GlideClientScriptingEnvironment_Query
    if (!L) throw new Error('Catalog item not found or not available to you')
    const values: CatalogItem['values'] = {}
    for (const v of L.variablesValues || []) values[v.name] = { value: v.value == null ? '' : String(v.value), displayValue: v.displayValue == null ? '' : String(v.displayValue) }
    return {
        sysId: L.sysId,
        name: L.name || '',
        shortDescription: L.shortDescription || '',
        description: L.description || '',
        picture: L.picture || '',
        type: L.type || 'catalog_item',
        requestMethod: L.requestMethod || 'order',
        mandatoryAttachment: bool(L.mandatoryAttachment),
        hideQuantity: bool(L.hideQuantity),
        hideAttachment: bool(L.hideAttachment),
        quantity: L.quantity || [],
        targetRecordTable: L.targetRecordTable || '',
        targetRecordSysId: L.targetRecordSysId || '',
        pricing: L.pricing || null,
        variables: (L.variables || []) as CatalogVariable[],
        layout: L.variablesLayout || [],
        values,
        policies: ((S && S.CatalogClientScriptingEnvironment_Policies) || []).map(normalizePolicy),
        scripts: normalizeClientScripts(S && S.CatalogClientScriptingEnvironment_Scripts),
    }
}

async function restJson(method: string, url: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<any> {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { ...authHeaders(body !== undefined), ...(extraHeaders || {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    if (!response.ok) {
        const err = json && (json.error || (json.result && json.result.errMsg))
        const message = (err && (err.message || err.detail || err)) || `HTTP ${response.status}`
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
    }
    return json ? json.result : null
}

/** Price for the current values and quantity (variables keyed by variable name). */
export async function fetchItemPrice(itemId: string, variables: Record<string, string>, quantity = '1'): Promise<PriceResult> {
    const r = (await restJson('POST', `/api/sn_sc/servicecatalog/items/${encodeURIComponent(itemId)}/price`, { sysparm_id: itemId, sysparm_quantity: quantity, variables })) || {}
    return {
        price: r.price ? String(r.price_display || r.price) : '',
        recurringPrice: r.recurring_frequency ? `${r.recurring_price_display || r.recurring_price} ${r.recurring_frequency}` : '',
        priceValue: Number(r.price || 0),
        recurringValue: Number(r.recurring_price || 0),
        frequency: r.recurring_frequency || '',
        subtotal: r.price_subtotal_display ? String(r.price_subtotal_display) : '',
        recurringSubtotal: r.recurring_frequency && r.recurring_price_subtotal_display ? `${r.recurring_price_subtotal_display} ${r.recurring_frequency}` : '',
    }
}

/**
 * Order now (catalog items) or submit (record producers). `variables` are keyed by variable name;
 * MRVS values are JSON arrays of rows (keyed by the set's variable names), as strings.
 */
export async function submitCatalogItem(args: {
    itemId: string
    kind: 'order_now' | 'submit_producer'
    variables: Record<string, string>
    quantity?: string
    requestedFor?: string
    itemGuid?: string
}): Promise<SubmitResult> {
    const body: Record<string, unknown> = { variables: args.variables }
    if (args.itemGuid) body.sysparm_item_guid = args.itemGuid
    if (args.kind === 'order_now') {
        body.sysparm_quantity = args.quantity || '1'
        if (args.requestedFor) body.sysparm_requested_for = args.requestedFor
    }
    const r = (await restJson('POST', `/api/sn_sc/servicecatalog/items/${encodeURIComponent(args.itemId)}/${args.kind}`, body)) || {}
    return {
        table: r.table || (args.kind === 'order_now' ? 'sc_request' : ''),
        sysId: r.sys_id || r.request_id || '',
        number: r.number || r.request_number || '',
        requestNumber: r.request_number,
        requestId: r.request_id,
        raw: r,
    }
}

const SP_PORTAL = '81b75d3147032100ba13a5554ee4902b' // Service Portal id Workspace sends for this widget

/** MRVS row form: field metadata for one row (add) or prefilled from a row (edit). */
export async function fetchMrvsRowForm(args: { setId: string; itemId: string; sourceTable?: string; row?: Record<string, string> }): Promise<MrvsRowForm> {
    const r = await restJson(
        'POST',
        '/api/now/sp/widget/sc-multi-row-active-row',
        {
            action: args.row ? 'edit' : 'add',
            variable_set_id: args.setId,
            source_id: args.itemId,
            source_table: args.sourceTable || 'sc_cat_item',
            row_data: args.row ? JSON.stringify(args.row) : '',
            workspace_form: true,
        },
        { 'x-portal': SP_PORTAL },
    )
    const row = r && r.data && r.data.active_row
    if (!row) throw new Error('The platform returned no row form for this variable set')
    const fields: MrvsRowField[] = Object.keys(row._fields || {}).map((name) => {
        const f = row._fields[name]
        const ed = f.ed || {}
        const pricing = !!(f._pricing && bool(f._pricing.pricing_implications))
        return {
            name,
            sysId: f.sys_id,
            label: f.label || name,
            type: String(f.type || 'string'),
            mandatory: bool(f.mandatory),
            readOnly: bool(f.read_only) || bool(f.readonly) || bool(f.sys_readonly),
            visible: f.visible !== false,
            value: f.value == null ? '' : String(f.value),
            displayValue: f.displayValue == null ? String(f.display_value ?? f.value ?? '') : String(f.displayValue),
            order: Number(f.order || 0),
            unique: bool(f.unique),
            choices: Array.isArray(f.choices)
                ? f.choices.map((c: any) => ({ value: String(c.value ?? ''), label: String(c.label ?? c.value ?? ''), price: Number(c.price || 0) || 0, recurringPrice: Number(c.recurring_price || 0) || 0 }))
                : undefined,
            reference: f.refTable || ed.reference || f.reference || undefined,
            referenceQual: ed.qualifier || f.reference_qual || undefined,
            attributes: f.attributes || '',
            helpText: f.help_text || f.instructions || '',
            placeholder: f.placeholder || '',
            pricing,
        }
    })
    fields.sort((a, b) => a.order - b.order)
    const columns: string[][] = []
    for (const s of row._sections || []) for (const c of s.columns || []) columns.push((c.fields || []).map((x: any) => x.name))
    return {
        fields,
        columns: columns.filter((c) => c.length),
        scripts: spClientScripts(row.client_script),
        policies: (Array.isArray(row.policy) ? row.policy : []).map(spPolicy),
        hasPricing: fields.some((f) => f.pricing),
    }
}

/** Service Portal model client scripts ({ onLoad: [...], onChange: [...], onSubmit: [...], messages: {} }) → ClientScripts. */
export function spClientScripts(s: any): ClientScripts {
    const list = (arr: any): ClientScript[] =>
        (Array.isArray(arr) ? arr : [])
            .filter((x: any) => x && x.script)
            .map((x: any) => ({
                name: String(x.name || x.sys_name || ''),
                sysId: String(x.sys_id || x.sysId || ''),
                script: String(x.script),
                type: String(x.type || ''),
                fieldName: String(x.fieldName || x.field_name || x.cat_variable || x.variable_name || x.field || ''),
                tableName: String(x.tableName || x.table || ''),
            }))
    const messages: Record<string, string> = {}
    const m = s && s.messages
    if (Array.isArray(m)) for (const x of m) x && x.name && (messages[String(x.name)] = String(x.value ?? x.name))
    else if (m && typeof m === 'object') for (const k of Object.keys(m)) messages[k] = String(m[k])
    return { onLoad: list(s && s.onLoad), onChange: list(s && s.onChange), onSubmit: list(s && s.onSubmit), messages }
}

const first = (...v: unknown[]) => v.find((x) => x !== undefined && x !== null)

/** Service Portal model UI policy (snake_case, as sp widgets receive it) → UiPolicy. Lenient: camelCase works too. */
export function spPolicy(p: any): UiPolicy {
    return normalizePolicy({
        sysId: first(p.sys_id, p.sysId),
        shortDescription: first(p.short_description, p.shortDescription),
        reverse: first(p.reverse, p.reverse_if_false),
        onLoad: first(p.onload, p.on_load, p.onLoad),
        // The SP model has no run_scripts flag: the platform only ships script_true / script_false when it's on.
        isRunScripts: first(p.run_scripts, p.isRunScripts, !!(p.script_true || p.script_false)),
        preEvaluated: p.preEvaluated,
        preEvaluatedResult: p.preEvaluatedResult,
        scriptTrue: { script: first(p.script_true, p.scriptTrue && p.scriptTrue.script, typeof p.scriptTrue === 'string' ? p.scriptTrue : undefined) },
        scriptFalse: { script: first(p.script_false, p.scriptFalse && p.scriptFalse.script, typeof p.scriptFalse === 'string' ? p.scriptFalse : undefined) },
        actions: (p.actions || []).map((a: any) => ({
            name: first(a.name, a.variable, a.catalog_variable, a.field),
            visible: a.visible,
            mandatory: a.mandatory,
            disabled: a.disabled,
            cleared: a.cleared,
            value: a.value,
            valueAction: first(a.value_action, a.valueAction),
            fieldMessage: first(a.field_message, a.fieldMessage),
            fieldMessageType: first(a.field_message_type, a.fieldMessageType),
        })),
        conditions: (p.conditions || []).map((c: any) => ({
            field: first(c.field, c.fieldName, c.name),
            oper: first(c.oper, c.operator),
            value: c.value,
            type: c.type,
            fieldLabel: c.fieldLabel,
            or: c.or,
            newquery: c.newquery,
            preEvaluatedTerm: c.preEvaluatedTerm,
            preEvaluatedTermResult: c.preEvaluatedTermResult,
        })),
    })
}

/** Server-side regex validation of a variable (question regex). Resolves with an error message or ''. */
export async function validateVariableRegex(questionId: string, value: string): Promise<string> {
    const data = await graphql(
        `query rpVarRegex($questionId: String!, $value: String!) { snSc { serviceCatalog { validateVariableRegex(questionId: $questionId, value: $value) { result errMsg } } } }`,
        { questionId, value },
    )
    const r = data && data.snSc && data.snSc.serviceCatalog && data.snSc.serviceCatalog.validateVariableRegex
    return r && r.result === false ? r.errMsg || 'Invalid value' : ''
}

/** The platform's message when the delegation check fails (Workspace's requested-for uses the same). */
export const REQUESTED_FOR_NOT_ELIGIBLE = "This person isn't eligible for this request."

/**
 * Can the current user request this item for `userId` (delegation rights, the item's user criteria
 * for that person)? The platform answers { result: true | false }. An empty user or item is ok.
 */
export async function canRequestFor(itemId: string, userId: string): Promise<DelegationResult> {
    if (!itemId || !userId) return { ok: true, message: '' }
    const r = await restJson('GET', `/api/sn_sc/v1/servicecatalog/items/${encodeURIComponent(itemId)}/delegation/${encodeURIComponent(userId)}`)
    // { result: false, errMsg: 'Item is unavailable for this user' }: shown as Workspace does.
    if (r === false || (r && (r.result === false || r.result === 'false'))) return { ok: false, message: REQUESTED_FOR_NOT_ELIGIBLE }
    // Older shapes: { failed_delegations: [...] } / { errMsg } without a result.
    if (r && Array.isArray(r.failed_delegations) && r.failed_delegations.length) return { ok: false, message: r.failed_delegations.map((f: any) => f.message || f).join(' ') }
    if (r && r.result === undefined && r.errMsg) return { ok: false, message: String(r.errMsg) }
    return { ok: true, message: '' }
}

/** Can the current user request this item for `userId`? Resolves with an error message or ''. */
export async function checkDelegation(itemId: string, userId: string): Promise<string> {
    return (await canRequestFor(itemId, userId)).message
}

// ---- variable editor (a record's variables) ---------------------------------------------------

const VE_COMMON = 'type id name variableName label order catalogItem variableSet mandatory canRead canWrite showHelp helpText instructions'
export const VARIABLE_EDITOR_QUERY = `query rpVariableEditor($table: String!, $sysId: String!) {
  GlideUIAction_Query { uiActions(table: $table, sysId: $sysId, query: "", view: "") { formActions { name sysId } } }
  GlideLayout_Query {
    formLayout(table: $table, view: "", sysId: $sysId, query: "") {
      sysId encodedRecord isValidRecord canReadRecord
      variablesLayout { name type parent ... on GlideLayout_ContainerVariableFieldLayoutType { caption captionDisplay layout columns { fields { name type } } } }
      recordValues { name value displayValue }
      fieldStates { name hidden mandatory readonly }
      elementsData {
        name: elementName
        dictionary: dictionaryData { canWrite }
        ... on GlideLayout_VariablesElementType {
          variables: _elements {
            __typename
            ... on GlideLayout_MultiRowVariableSetType { type name variableName label containerType id maxRows canRead canWrite fields { name id label type unique hideOnGrid } rowData { row { id name value displayValue } } }
            ... on GlideLayout_SingleRowVariableSetType { type id name label containerType visible canRead canWrite variableName }
            ... on GlideLayout_ChoiceQuestionElementType { ${VE_COMMON} readOnly visible variableAttributes defaultValue lookupTable includeNone choiceDirection choices { displayValue: label value } dependentField referringTable referringRecordId }
            ... on GlideLayout_ReferenceQuestionElementType { ${VE_COMMON} readOnly visible reference referenceQual listTable useReferenceQualifier variableAttributes defaultValue referringTable referringRecordId refAcOrderBy }
            ... on GlideLayout_ContainerQuestionElementType { ${VE_COMMON} visible displayTitle layout containerType }
            ... on GlideLayout_MacroQuestionElementType { ${VE_COMMON} variableAttributes defaultValue macroponentId }
            ... on GlideLayout_StandardQuestionElementType { ${VE_COMMON} readOnly visible variableAttributes defaultValue exampleText useConfirmation regExp }
            ... on GlideLayout_AttachmentQuestionElementType { ${VE_COMMON} readOnly visible allowedFileExtensions maxAttachmentSize variableAttributes defaultValue }
          }
        }
      }
    }
  }
  GlideClientScriptingEnvironment_Query {
    CatalogClientScriptingEnvironment_Policies(table: $table, sysId: $sysId, query: "") {
      shortDescription sysId reverse onLoad isRunScripts preEvaluated preEvaluatedResult
      scriptTrue { script } scriptFalse { script }
      actions { visible name disabled mandatory cleared: clearValue value valueAction fieldMessageType fieldMessage }
      conditions { type field: fieldName fieldLabel value oper: operator or: isOrQuery newquery: isNewQuery preEvaluatedTerm preEvaluatedTermResult }
    }
    CatalogClientScriptingEnvironment_Scripts(table: $table, sysId: $sysId, query: "") { ${CLIENT_SCRIPT_FIELDS} }
  }
}`

const SAVE_ACTION_NAMES = ['sysverb_ws_save', 'sysverb_update', 'sysverb_save']

/**
 * A record's catalog variables, the way Workspace's variable editor gets them: the form layout's
 * `variables` element (GlideLayout_VariablesElementType) with the variables layout and values,
 * the record's catalog UI policies and client scripts (those that apply to requested items /
 * target records), and its Save action. The result has the CatalogItem shape (variables, layout,
 * values, policies, scripts), so createCatalogForm and VariableLayout render it unchanged.
 */
export async function fetchVariableEditor(table: string, sysId: string, signal?: AbortSignal): Promise<VariableEditorData> {
    const data = await graphql(VARIABLE_EDITOR_QUERY, { table, sysId }, { signal })
    const L = data && data.GlideLayout_Query && data.GlideLayout_Query.formLayout
    if (!L || L.isValidRecord === false || L.canReadRecord === false) throw new Error('Record not found or not available to you')
    const S = data.GlideClientScriptingEnvironment_Query || {}
    const actions = (data.GlideUIAction_Query && data.GlideUIAction_Query.uiActions && data.GlideUIAction_Query.uiActions.formActions) || []
    const save = SAVE_ACTION_NAMES.map((n) => actions.find((a: any) => a && a.name === n)).find(Boolean)
    const element = (L.elementsData || []).find((e: any) => e && Array.isArray(e.variables))
    // GlideLayout_* element types mirror the AppCatalog_* ones the catalog form maps.
    const variables: CatalogVariable[] = ((element && element.variables) || [])
        .filter((v: any) => v && v.name)
        .map((v: any) => ({ ...v, __typename: String(v.__typename || '').replace(/^GlideLayout_/, 'AppCatalog_'), visible: v.visible === undefined ? v.canRead !== false : v.visible && v.canRead !== false }))
    const values: CatalogItem['values'] = {}
    let catItemId = ''
    for (const v of L.recordValues || []) {
        if (v.name === 'cat_item') catItemId = String(v.value || '')
        if (String(v.name).indexOf('variables.') === 0) values[v.name] = { value: v.value == null ? '' : String(v.value), displayValue: v.displayValue == null ? '' : String(v.displayValue) }
    }
    return {
        sysId: L.sysId || sysId,
        name: '',
        shortDescription: '',
        description: '',
        picture: '',
        type: 'variable_editor',
        requestMethod: '',
        mandatoryAttachment: false,
        hideQuantity: true,
        hideAttachment: true,
        quantity: [],
        targetRecordTable: '',
        targetRecordSysId: '',
        pricing: null,
        variables,
        layout: L.variablesLayout || [],
        values,
        policies: (S.CatalogClientScriptingEnvironment_Policies || []).map(normalizePolicy),
        scripts: normalizeClientScripts(S.CatalogClientScriptingEnvironment_Scripts),
        table,
        recordSysId: L.sysId || sysId,
        encodedRecord: L.encodedRecord || '',
        catItemId,
        saveActionId: save ? String(save.sysId) : '',
        canWrite: !!(element && element.dictionary && element.dictionary.canWrite !== false),
    }
}

/**
 * Save changed variables on a record through its Save UI action (fields named 'variables.<name>',
 * as Workspace's form save sends them), so business rules, ACLs and data policies run.
 */
export async function saveRecordVariables(args: {
    data: Pick<VariableEditorData, 'table' | 'recordSysId' | 'encodedRecord' | 'saveActionId'>
    changes: { name: string; value: string; displayValue?: string; originalValue?: string }[]
}) {
    if (!args.data.saveActionId) throw new Error('This record has no Save action for you')
    return executeUiAction({ actionSysId: args.data.saveActionId, table: args.data.table, sysId: args.data.recordSysId, encodedRecord: args.data.encodedRecord, fields: args.changes })
}

/** Upload a file for an attachment variable to the form's draft record; resolves with the attachment sys_id. */
export async function uploadVariableAttachment(args: { file: File; draftTable: string; draftSysId: string }): Promise<{ sysId: string; fileName: string }> {
    const url = `/api/now/attachment/file?table_name=${encodeURIComponent('ZZ_YY' + args.draftTable)}&table_sys_id=${encodeURIComponent(args.draftSysId)}&file_name=${encodeURIComponent(args.file.name)}`
    const headers = authHeaders(false)
    headers['Content-Type'] = args.file.type || 'application/octet-stream'
    const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers, body: args.file })
    const json = await response.json().catch(() => null)
    if (!response.ok || !json || !json.result) throw new Error((json && json.error && json.error.message) || `Upload failed (HTTP ${response.status})`)
    return { sysId: json.result.sys_id, fileName: json.result.file_name }
}
