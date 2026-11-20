import { restGet, authHeaders } from 'utilities:app/graphql'

/**
 * Data for the view-rules editor: Table API reads and writes on x_312987_portal_view_rule and its
 * audience tables (studio roles have the ACLs), portal settings through the Studio API (which
 * reprocesses the portal so the runtime sees the new settings).
 */

export const RULE_TABLE = 'x_312987_portal_view_rule'
export const UC_TABLE = 'x_312987_portal_vrule_uc'
export const UC_NO_TABLE = 'x_312987_portal_vrule_uc_no'
const STUDIO_API = '/api/x_312987_portal/rp_studio'

export type Ref = { value: string; label: string }

export type ViewRule = {
    id: string
    name: string
    portal: Ref
    page: Ref
    table: string
    appliesTo: 'form' | 'list' | 'both'
    active: boolean
    order: number
    condition: string
    conditionLabel: string
    view: Ref
    /** The referenced view's current name (repair when it differs from viewName). */
    viewRefName: string
    viewName: string
    roles: string
    advanced: boolean
    script: string
    description: string
    can: Ref[]
    cannot: Ref[]
}

export type PortalRow = { id: string; name: string; slug: string; settings: Record<string, unknown> }
export type PageRow = { id: string; title: string; route: string }

type DV = { value?: string; display_value?: string } | string | undefined
const val = (f: DV) => (f && typeof f === 'object' ? String(f.value || '') : String(f || ''))
const disp = (f: DV) => (f && typeof f === 'object' ? String(f.display_value || f.value || '') : String(f || ''))
const ref = (f: DV): Ref => ({ value: val(f), label: disp(f) })

function qs(params: Record<string, string | number>): string {
    return Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
}

export async function tableGet<T = any>(table: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T[]> {
    const rows = await restGet<T[]>(`/api/now/table/${table}?${qs(params)}`, signal)
    return Array.isArray(rows) ? rows : []
}

async function send(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<any> {
    const res = await fetch(url, { method, credentials: 'same-origin', headers: authHeaders(true), body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await res.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    if (!res.ok) {
        const msg = (json && json.error && (json.error.message || json.error.detail)) || `HTTP ${res.status}`
        throw new Error(msg)
    }
    return json && json.result !== undefined ? json.result : json && json.data !== undefined ? json.data : json
}

export const tableInsert = (table: string, body: Record<string, unknown>) => send('POST', `/api/now/table/${table}`, body)
export const tableUpdate = (table: string, id: string, body: Record<string, unknown>) => send('PATCH', `/api/now/table/${table}/${id}`, body)
export const tableDelete = (table: string, id: string) => send('DELETE', `/api/now/table/${table}/${id}`)

const RULE_FIELDS = 'sys_id,name,portal,page,table,applies_to,active,order,condition,view,view.name,view_name,roles,advanced,script,description'

/** Rules for a portal: its own pages' rules plus the rule portal's portal-wide rules. */
export async function fetchRules(portalId: string, rulePortalId: string, signal?: AbortSignal): Promise<ViewRule[]> {
    const q = `page.portal=${portalId}^NQportal=${rulePortalId}^pageISEMPTY^ORDERBYorder^ORDERBYname`
    const [rows, can, cannot] = await Promise.all([
        tableGet<any>(RULE_TABLE, { sysparm_query: q, sysparm_fields: RULE_FIELDS, sysparm_display_value: 'all', sysparm_limit: 500 }, signal),
        tableGet<any>(UC_TABLE, { sysparm_query: `rule.page.portal=${portalId}^NQrule.portal=${rulePortalId}`, sysparm_fields: 'sys_id,rule,user_criteria', sysparm_display_value: 'all', sysparm_limit: 2000 }, signal),
        tableGet<any>(UC_NO_TABLE, { sysparm_query: `rule.page.portal=${portalId}^NQrule.portal=${rulePortalId}`, sysparm_fields: 'sys_id,rule,user_criteria', sysparm_display_value: 'all', sysparm_limit: 2000 }, signal),
    ])
    const by = (list: any[]) => {
        const out: Record<string, Ref[]> = {}
        for (const r of list) (out[val(r.rule)] = out[val(r.rule)] || []).push({ value: val(r.user_criteria), label: disp(r.user_criteria), ...{ m2m: val(r.sys_id) } } as Ref)
        return out
    }
    const canBy = by(can)
    const cannotBy = by(cannot)
    return rows.map((r) => {
        const id = val(r.sys_id)
        const a = val(r.applies_to)
        return {
            id,
            name: val(r.name),
            portal: ref(r.portal),
            page: ref(r.page),
            table: val(r.table),
            appliesTo: (a === 'list' || a === 'both' ? a : 'form') as ViewRule['appliesTo'],
            active: val(r.active) === 'true',
            order: parseInt(val(r.order), 10) || 0,
            condition: val(r.condition),
            conditionLabel: disp(r.condition),
            view: ref(r.view),
            viewRefName: val(r['view.name']),
            viewName: val(r.view_name),
            roles: val(r.roles),
            advanced: val(r.advanced) === 'true',
            script: val(r.script),
            description: val(r.description),
            can: canBy[id] || [],
            cannot: cannotBy[id] || [],
        }
    })
}

export async function fetchPortals(signal?: AbortSignal): Promise<PortalRow[]> {
    const rows = await tableGet<any>('x_312987_portal_portal', { sysparm_query: 'ORDERBYname', sysparm_fields: 'sys_id,name,slug,settings_json', sysparm_limit: 200 }, signal)
    return rows.map((r) => {
        let settings: Record<string, unknown> = {}
        try {
            settings = JSON.parse(String(r.settings_json || '{}')) || {}
        } catch (e) {
            settings = {}
        }
        return { id: String(r.sys_id), name: String(r.name || r.slug), slug: String(r.slug || ''), settings }
    })
}

export async function fetchPages(portalId: string, signal?: AbortSignal): Promise<PageRow[]> {
    const rows = await tableGet<any>('x_312987_portal_page', { sysparm_query: `portal=${portalId}^ORDERBYtitle`, sysparm_fields: 'sys_id,title,route', sysparm_limit: 500 }, signal)
    return rows.map((r) => ({ id: String(r.sys_id), title: String(r.title || r.route || r.sys_id), route: String(r.route || '') }))
}

export type ViewOption = { id: string; name: string; title: string }

/** Views with form sections (form) or a list layout (list) on the table, plus Default. */
export async function fetchTableViews(table: string, kind: 'form' | 'list' | 'both', signal?: AbortSignal): Promise<ViewOption[]> {
    if (!/^[a-z0-9_]+$/i.test(table)) return []
    const sources = kind === 'list' ? ['sys_ui_list'] : kind === 'both' ? ['sys_ui_section', 'sys_ui_list'] : ['sys_ui_section']
    const lists = await Promise.all(sources.map((t) => tableGet<any>(t, { sysparm_query: `name=${table}`, sysparm_fields: 'view,view.name,view.title', sysparm_display_value: 'false', sysparm_limit: 500 }, signal)))
    const seen: Record<string, ViewOption> = {}
    for (const list of lists)
        for (const r of list) {
            const name = String(r['view.name'] || '')
            const id = String((r.view && (r.view.value || r.view)) || '')
            if (!name || seen[name]) continue
            seen[name] = { id, name, title: String(r['view.title'] || name) }
        }
    const out = Object.values(seen).sort((a, b) => a.title.localeCompare(b.title))
    return [{ id: '', name: 'default', title: 'Default view' }, ...out]
}

export async function searchTable(table: string, query: string, fields: string, limit = 15, signal?: AbortSignal): Promise<any[]> {
    return tableGet<any>(table, { sysparm_query: query, sysparm_fields: fields, sysparm_limit: limit, sysparm_display_value: 'true' }, signal)
}

/** Portal settings through the Studio API (merged; reprocesses the portal). */
export async function savePortalSettings(portal: PortalRow, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const merged: Record<string, unknown> = { ...portal.settings }
    for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v === undefined || v === null) delete merged[k]
        else merged[k] = v
    }
    await send('PATCH', `${STUDIO_API}/portals/${portal.id}`, { settings: merged })
    return merged
}

/** Rule fields for the Table API. */
export function ruleBody(r: Partial<ViewRule>): Record<string, unknown> {
    const b: Record<string, unknown> = {}
    if (r.name !== undefined) b.name = r.name
    if (r.portal !== undefined) b.portal = r.portal.value
    if (r.page !== undefined) b.page = r.page.value
    if (r.table !== undefined) b.table = r.table
    if (r.appliesTo !== undefined) b.applies_to = r.appliesTo
    if (r.active !== undefined) b.active = r.active
    if (r.order !== undefined) b.order = r.order
    if (r.condition !== undefined) b.condition = r.condition
    if (r.view !== undefined) b.view = r.view.value
    if (r.viewName !== undefined) b.view_name = r.viewName
    if (r.roles !== undefined) b.roles = r.roles
    if (r.advanced !== undefined) b.advanced = r.advanced
    if (r.script !== undefined) b.script = r.script
    if (r.description !== undefined) b.description = r.description
    return b
}

/** Make the audience rows of a rule match `next` (adds and removes m2m rows). */
export async function saveAudience(ruleId: string, table: string, current: Ref[], next: Ref[]): Promise<void> {
    const want = new Set(next.map((r) => r.value))
    const have = new Map(current.map((r) => [r.value, (r as any).m2m as string]))
    const ops: Promise<unknown>[] = []
    for (const [uc, m2m] of have) if (!want.has(uc) && m2m) ops.push(tableDelete(table, m2m))
    for (const uc of want) if (!have.has(uc)) ops.push(tableInsert(table, { rule: ruleId, user_criteria: uc }))
    await Promise.all(ops)
}
