import { authHeaders } from 'utilities:app/graphql'

/**
 * Search sources: each one asks the platform's own search for one kind of result, as the user
 * (ACLs, catalog user criteria and KB user criteria apply).
 *
 *   catalog    GET /api/sn_sc/servicecatalog/items?sysparm_text=   the catalog's search (text index +
 *              user criteria; price and picture in the payload; X-Total-Count)
 *   knowledge  GET /api/now/table/kb_knowledge  123TEXTQUERY321=…   the platform text index (relevance
 *              ranked), published + active articles the user can read
 *   requests   GET /api/now/table/sc_req_item   text query, requested for or opened by me
 *   incidents  GET /api/now/table/incident      text query, caller or opened by me
 *   pages      the portal's own pages and menu items (bootstrap data, no request)
 *
 * A term that looks like a record number (INC0010001, RITM0010003, KB0000028) matches the number
 * field instead of the text index. "Me" is the platform's dynamic filter (Me), so the same query
 * strings work in list URLs.
 */

export type SearchSourceId = 'catalog' | 'knowledge' | 'requests' | 'incidents' | 'pages'

export type SearchLink = {
    to: string
    q?: Record<string, string>
    table?: string
    sysId?: string
    query?: string
    href?: string
}

export type SearchHit = {
    id: string
    source: SearchSourceId
    title: string
    subtitle?: string
    /** Short trailing text: a price, a state, a view count. */
    meta?: string
    /** A state / stage label for app/highlighted-value. */
    state?: string
    number?: string
    icon?: string
    /** Picture URL (catalog items). */
    image?: string
    link: SearchLink
}

export type SearchPage = { hits: SearchHit[]; total: number }

export type SearchTargets = {
    /** Portal page of the catalog item widget (opened with q item=<sys_id>). */
    catalogPage?: string
    /** Portal page of the knowledge widget (opened with sys_id). */
    kbPage?: string
    /** Portal page of the record form (opened with table + sys_id). */
    recordPage?: string
    /** Knowledge search page (app/kb-search, q term=…): the knowledge group's "See all" opens it. */
    kbSearchPage?: string
    /** Limit the knowledge source to one knowledge base (sys_id). */
    kb?: string
}

export type SearchSourceDef = {
    id: SearchSourceId
    label: string
    /** Lucide icon. */
    icon: string
    /** Remote sources need at least 2 characters; pages search from the first. */
    remote: boolean
}

export const SEARCH_SOURCES: Record<SearchSourceId, SearchSourceDef> = {
    catalog: { id: 'catalog', label: 'Catalog', icon: 'store', remote: true },
    knowledge: { id: 'knowledge', label: 'Knowledge', icon: 'book-open', remote: true },
    requests: { id: 'requests', label: 'My requests', icon: 'package', remote: true },
    incidents: { id: 'incidents', label: 'My incidents', icon: 'life-buoy', remote: true },
    pages: { id: 'pages', label: 'Pages', icon: 'panels-top-left', remote: false },
}

export const DEFAULT_SOURCES: SearchSourceId[] = ['catalog', 'knowledge', 'requests', 'incidents', 'pages']

/** The platform's dynamic filter option "Me" (sys_filter_option_dynamic). */
export const ME_DYNAMIC = 'DYNAMIC90d1921e5f510100a9ad2572f2b477fe'

const NUMBER_RE = /^[a-z]{2,6}\d{4,}$/i

/** Plain text: tags stripped, entities decoded, whitespace collapsed. */
export function cleanText(value: unknown, max = 0): string {
    let s = String(value === null || value === undefined ? '' : value)
    if (s.indexOf('<') >= 0) s = s.replace(/<[^>]*>/g, ' ')
    if (s.indexOf('&') >= 0) {
        s = s
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
    }
    s = s.replace(/\s+/g, ' ').trim()
    return max && s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

/** Encoded-query safe term (no ^ separators, no newlines). */
export function queryTerm(term: string): string {
    return String(term || '').replace(/\^/g, ' ').replace(/[\r\n]+/g, ' ').trim()
}

/** The text-index condition for a term, or a number match for record numbers. */
export function textCondition(term: string): string {
    const t = queryTerm(term)
    return NUMBER_RE.test(t) ? `numberSTARTSWITH${t.toUpperCase()}` : `123TEXTQUERY321=${t}`
}

type Fetched = { result: any[]; total: number }

/** GET a same-origin JSON endpoint and read X-Total-Count. */
export async function getWithTotal(url: string, signal?: AbortSignal): Promise<Fetched> {
    const response = await fetch(url, { credentials: 'same-origin', headers: authHeaders(false), signal })
    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    if (!response.ok) {
        const msg = (json && json.error && (json.error.message || json.error.detail)) || `HTTP ${response.status}`
        const err: any = new Error(msg)
        err.status = response.status
        throw err
    }
    const result = (json && Array.isArray(json.result) ? json.result : []) as any[]
    const header = parseInt(response.headers.get('X-Total-Count') || '', 10)
    return { result, total: isNaN(header) ? result.length : header }
}

const dv = (field: any): string => (field && typeof field === 'object' ? String(field.display_value || '') : String(field || ''))
const val = (field: any): string => (field && typeof field === 'object' ? String(field.value || '') : String(field || ''))

/** A catalog picture path ("abc.iix") as a URL, or ''. */
export function pictureUrl(picture: unknown): string {
    const p = String(picture || '').trim()
    if (!p) return ''
    if (/^(https?:)?\/\//.test(p) || p.charAt(0) === '/') return p
    return '/' + p
}

/** A Lucide icon for a catalog item, from its name and category (items rarely have pictures). */
export function catalogIcon(name: string, category = ''): string {
    const s = (name + ' ' + category).toLowerCase()
    const rules: [RegExp, string][] = [
        [/laptop|macbook|notebook|computer|desktop|pc\b/, 'laptop'],
        [/ipad|tablet|surface/, 'tablet'],
        [/phone|mobile|iphone|galaxy|pixel|softphone|jabber/, 'smartphone'],
        [/monitor|display|screen/, 'monitor'],
        [/keyboard/, 'keyboard'],
        [/mouse/, 'mouse'],
        [/headset|audio|webinar|zoom|meeting/, 'headphones'],
        [/printer|print|toner|finishing|document/, 'printer'],
        [/email|mail|alias|outlook/, 'mail'],
        [/password|access|role|account|permission|delegation/, 'key-round'],
        [/network|vpn|wifi|firewall|ip\b/, 'network'],
        [/software|license|adobe|office|application|app\b/, 'app-window'],
        [/parking|sticker|badge|building|facilit/, 'building-2'],
        [/outage|incident|report|issue|broken/, 'triangle-alert'],
        [/cable|adapter|dongle|peripheral/, 'cable'],
        [/server|storage|database|cloud/, 'server'],
        [/change|template/, 'git-pull-request'],
    ]
    for (const [re, icon] of rules) if (re.test(s)) return icon
    return 'package'
}

/** One catalog API item → a hit. */
export function catalogHit(i: any, t: SearchTargets): SearchHit {
    const category = (i.category && i.category.title) || ''
    const showPrice = i.show_price !== false && !!i.price && Number(i.price_value || 0) > 0
    return {
        id: String(i.sys_id),
        source: 'catalog',
        title: cleanText(i.name),
        subtitle: cleanText(i.short_description, 140),
        meta: showPrice ? String(i.localized_price || i.price) : '',
        icon: catalogIcon(String(i.name || ''), category),
        image: pictureUrl(i.picture),
        number: category,
        link: { to: t.catalogPage || 'catalog', q: { item: String(i.sys_id) } },
    }
}

async function searchCatalog(term: string, limit: number, offset: number, t: SearchTargets, signal?: AbortSignal): Promise<SearchPage> {
    const url = `/api/sn_sc/servicecatalog/items?sysparm_text=${encodeURIComponent(queryTerm(term))}&sysparm_limit=${limit}&sysparm_offset=${offset}`
    const r = await getWithTotal(url, signal)
    return { hits: r.result.map((i) => catalogHit(i, t)), total: r.total }
}

const KB_FIELDS = 'sys_id,number,short_description,kb_category,kb_knowledge_base,sys_view_count,sys_updated_on'

/** One kb_knowledge row (display_value=all) → a hit. */
export function knowledgeHit(r: any, t: SearchTargets): SearchHit {
    const views = parseInt(val(r.sys_view_count), 10) || 0
    const category = dv(r.kb_category)
    return {
        id: val(r.sys_id),
        source: 'knowledge',
        title: cleanText(dv(r.short_description)),
        subtitle: [dv(r.kb_knowledge_base), category].filter(Boolean).join(' · '),
        meta: views ? `${views.toLocaleString()} view${views === 1 ? '' : 's'}` : '',
        number: val(r.number),
        icon: 'file-text',
        link: { to: t.kbPage || 'kb', sysId: val(r.sys_id) },
    }
}

async function searchKnowledge(term: string, limit: number, offset: number, t: SearchTargets, signal?: AbortSignal): Promise<SearchPage> {
    const kb = t.kb && /^[0-9a-f]{32}$/.test(t.kb) ? '^kb_knowledge_base=' + t.kb : ''
    const d = new Date()
    const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const q = `${textCondition(term)}^workflow_state=published^active=true^valid_toISEMPTY^ORvalid_to>=${today}${kb}`
    const url = `/api/now/table/kb_knowledge?sysparm_query=${encodeURIComponent(q)}&sysparm_fields=${KB_FIELDS}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}&sysparm_offset=${offset}`
    const r = await getWithTotal(url, signal)
    return { hits: r.result.map((row) => knowledgeHit(row, t)), total: r.total }
}

/** One sc_req_item row → a hit. */
export function requestHit(r: any, t: SearchTargets): SearchHit {
    const item = dv(r.cat_item)
    const stage = dv(r.stage)
    return {
        id: val(r.sys_id),
        source: 'requests',
        title: cleanText(item || dv(r.short_description) || val(r.number)),
        subtitle: cleanText(dv(r.short_description) && item ? dv(r.short_description) : '', 120),
        number: val(r.number),
        state: stage || dv(r.state),
        meta: dv(r.sys_updated_on),
        icon: catalogIcon(item),
        link: { to: t.recordPage || 'form', table: 'sc_req_item', sysId: val(r.sys_id) },
    }
}

async function searchRequests(term: string, limit: number, offset: number, t: SearchTargets, signal?: AbortSignal): Promise<SearchPage> {
    const q = `${textCondition(term)}^requested_for${ME_DYNAMIC}^ORopened_by${ME_DYNAMIC}^ORDERBYDESCsys_updated_on`
    const url = `/api/now/table/sc_req_item?sysparm_query=${encodeURIComponent(q)}&sysparm_fields=sys_id,number,cat_item,short_description,state,stage,sys_updated_on&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}&sysparm_offset=${offset}`
    const r = await getWithTotal(url, signal)
    return { hits: r.result.map((row) => requestHit(row, t)), total: r.total }
}

/** One incident row → a hit. */
export function incidentHit(r: any, t: SearchTargets): SearchHit {
    return {
        id: val(r.sys_id),
        source: 'incidents',
        title: cleanText(dv(r.short_description) || val(r.number)),
        subtitle: '',
        number: val(r.number),
        state: dv(r.state),
        meta: dv(r.sys_updated_on),
        icon: 'life-buoy',
        link: { to: t.recordPage || 'form', table: 'incident', sysId: val(r.sys_id) },
    }
}

async function searchIncidents(term: string, limit: number, offset: number, t: SearchTargets, signal?: AbortSignal): Promise<SearchPage> {
    const q = `${textCondition(term)}^caller_id${ME_DYNAMIC}^ORopened_by${ME_DYNAMIC}^ORDERBYDESCsys_updated_on`
    const url = `/api/now/table/incident?sysparm_query=${encodeURIComponent(q)}&sysparm_fields=sys_id,number,short_description,state,sys_updated_on&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}&sysparm_offset=${offset}`
    const r = await getWithTotal(url, signal)
    return { hits: r.result.map((row) => incidentHit(row, t)), total: r.total }
}

/** Remote search for one source. */
export function searchSource(source: SearchSourceId, term: string, opts: { limit?: number; offset?: number; targets?: SearchTargets; signal?: AbortSignal } = {}): Promise<SearchPage> {
    const limit = Math.max(1, Math.min(50, opts.limit || 5))
    const offset = Math.max(0, opts.offset || 0)
    const t = opts.targets || {}
    if (source === 'catalog') return searchCatalog(term, limit, offset, t, opts.signal)
    if (source === 'knowledge') return searchKnowledge(term, limit, offset, t, opts.signal)
    if (source === 'requests') return searchRequests(term, limit, offset, t, opts.signal)
    if (source === 'incidents') return searchIncidents(term, limit, offset, t, opts.signal)
    return Promise.resolve({ hits: [], total: 0 })
}

export type PageEntry = { label: string; to: string; icon?: string; q?: Record<string, string>; table?: string; sysId?: string; query?: string; group?: string }

/** Local search over portal pages and menu items: every word must appear in the label or group. */
export function searchPages(entries: PageEntry[], term: string, limit = 5): SearchPage {
    const words = String(term || '').toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return { hits: [], total: 0 }
    const seen: Record<string, boolean> = {}
    const hits: SearchHit[] = []
    for (const e of entries) {
        const hay = (e.label + ' ' + (e.group || '')).toLowerCase()
        if (!words.every((w) => hay.indexOf(w) >= 0)) continue
        const key = e.label.toLowerCase() + '|' + e.to + '|' + (e.table || '') + '|' + (e.query || '')
        if (seen[key]) continue
        seen[key] = true
        hits.push({
            id: key,
            source: 'pages',
            title: e.label,
            subtitle: e.group || '',
            icon: e.icon || 'panels-top-left',
            link: { to: e.to, q: e.q, table: e.table, sysId: e.sysId, query: e.query },
        })
    }
    // Labels starting with the term first.
    const first = words[0]
    hits.sort((a, b) => Number(b.title.toLowerCase().indexOf(first) === 0) - Number(a.title.toLowerCase().indexOf(first) === 0))
    return { hits: hits.slice(0, limit), total: hits.length }
}
