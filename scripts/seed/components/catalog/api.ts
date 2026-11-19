import { graphql, authHeaders } from 'utilities:app/graphql'
import type { CatalogItem, CatalogVariable, MrvsRowField, MrvsRowForm, PriceResult, SubmitResult } from './types'

/**
 * Catalog platform calls (the same ones Workspace's catalog form makes):
 *
 *   fetchCatalogItem      POST /api/now/graphql   AppCatalogView_Query.itemViewLayout → AppCatalog_Query.itemLayout
 *                         (item, pricing, variables, variablesLayout, variablesValues: one request)
 *   fetchItemPrice        POST /api/sn_sc/servicecatalog/items/{id}/price
 *   submitCatalogItem     POST /api/sn_sc/servicecatalog/items/{id}/order_now | submit_producer
 *   fetchMrvsRowForm      POST /api/now/sp/widget/sc-multi-row-active-row   (row form metadata; Workspace's MRVS modal uses it)
 *   validateVariableRegex POST /api/now/graphql   snSc.serviceCatalog.validateVariableRegex
 *   checkDelegation       GET  /api/sn_sc/v1/servicecatalog/items/{id}/delegation/{user}
 *   uploadVariableAttachment POST /api/now/attachment/file  (table ZZ_YY<draft table>, the draft record)
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
      }
    }
  }
}`

const bool = (v: unknown) => v === true || v === 'true'

/** Item or record producer, with variables, layout and default values, in one GraphQL request. */
export async function fetchCatalogItem(sysId: string, table = 'sc_cat_item', signal?: AbortSignal): Promise<CatalogItem> {
    const data = await graphql(ITEM_LAYOUT_QUERY, { table, sysId }, { signal })
    const L = data && data.AppCatalogView_Query && data.AppCatalogView_Query.itemViewLayout && data.AppCatalogView_Query.itemViewLayout._query.AppCatalog_Query.itemLayout
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
            choices: Array.isArray(f.choices) ? f.choices.map((c: any) => ({ value: String(c.value ?? ''), label: String(c.label ?? c.value ?? '') })) : undefined,
            reference: f.refTable || ed.reference || f.reference || undefined,
            referenceQual: ed.qualifier || f.reference_qual || undefined,
            attributes: f.attributes || '',
            helpText: f.help_text || f.instructions || '',
            placeholder: f.placeholder || '',
        }
    })
    fields.sort((a, b) => a.order - b.order)
    const columns: string[][] = []
    for (const s of row._sections || []) for (const c of s.columns || []) columns.push((c.fields || []).map((x: any) => x.name))
    return { fields, columns: columns.filter((c) => c.length) }
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

/** Can the current user request this item for `userId`? Resolves with an error message or ''. */
export async function checkDelegation(itemId: string, userId: string): Promise<string> {
    const r = await restJson('GET', `/api/sn_sc/v1/servicecatalog/items/${encodeURIComponent(itemId)}/delegation/${encodeURIComponent(userId)}`)
    if (!r) return ''
    return r.failed_delegations && r.failed_delegations.length ? r.failed_delegations.map((f: any) => f.message || f).join(' ') : r.errMsg || ''
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
