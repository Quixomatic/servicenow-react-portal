/**
 * Knowledge platform calls, as the user. Every read goes through the Table / Aggregate APIs with the
 * user's session, so the platform's KB ACLs decide what comes back:
 *
 *   kb_knowledge_base  read ACL → KBScopedKnowledgeSNC.canReadKnowledgeBase (can / cannot read user
 *                      criteria: kb_uc_can_read_mtom, kb_uc_cannot_read_mtom)
 *   kb_category        read follows the category's knowledge base
 *   kb_knowledge       read ACL → KBScopedKnowledgeSNC.canReadArticle (the KB's criteria, plus the
 *                      article's can_read_user_criteria / cannot_read_user_criteria when the platform
 *                      property glide.knowman.apply_article_read_criteria is on)
 *
 * Row-level ACLs filter rows after the query, so X-Total-Count would still count rows the user can't
 * read. Article queries therefore always carry an explicit `kb_knowledge_baseIN<readable KBs>` filter:
 * totals, paging and facet counts stay exact.
 */
import { restGet } from 'utilities:app/graphql'
import { cleanText, getWithTotal, queryTerm } from 'utilities:app/search'

export const SYS_ID_RE = /^[0-9a-f]{32}$/

/** A sys_id or '' (anything else is dropped before it reaches a query). */
export function safeId(value: unknown): string {
    const s = String(value || '').trim()
    return SYS_ID_RE.test(s) ? s : ''
}

/** Safe sys_id list from an array or comma string. */
export function safeIds(value: unknown): string[] {
    const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
    return list.map(safeId).filter(Boolean)
}

const dv = (f: any): string => (f && typeof f === 'object' ? String(f.display_value === null || f.display_value === undefined ? '' : f.display_value) : String(f === null || f === undefined ? '' : f))
const v = (f: any): string => (f && typeof f === 'object' ? String(f.value === null || f.value === undefined ? '' : f.value) : String(f === null || f === undefined ? '' : f))
const truthy = (f: any) => v(f) === 'true' || v(f) === '1'

function today(): string {
    const d = new Date()
    const p = (n: number) => (n < 10 ? '0' : '') + n
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

/**
 * Published, active and not expired (valid_to empty or today and later): what normal readers see,
 * the same rule the platform's KB search and portal widgets apply.
 */
export function publishedCondition(): string {
    return 'workflow_state=published^active=true^valid_toISEMPTY^ORvalid_to>=' + today()
}

/* ---------------- Knowledge bases ---------------- */

export type KnowledgeBase = {
    id: string
    title: string
    description: string
    /** Icon picture URL ('/<sys_id>.iix') or ''. */
    icon: string
    color: string
    order: number
    /** Published articles the user can read. */
    count: number
    disableRating: boolean
    disableHelpful: boolean
    disableSuggesting: boolean
    disableCommenting: boolean
}

const KB_FIELDS = 'sys_id,title,description,icon,card_color,order,disable_rating,disable_mark_as_helpful,disable_suggesting,disable_commenting'

/** Knowledge bases the user can read (active), with published article counts, in the platform's order. */
export async function fetchKnowledgeBases(signal?: AbortSignal): Promise<KnowledgeBase[]> {
    const rows: any[] = (await restGet(`/api/now/table/kb_knowledge_base?sysparm_query=active=true^ORDERBYorder^ORDERBYtitle&sysparm_fields=${KB_FIELDS}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=200`, signal)) || []
    const kbs: KnowledgeBase[] = rows.map((r) => {
        const icon = dv(r.icon) || v(r.icon)
        return {
            id: v(r.sys_id),
            title: cleanText(dv(r.title)),
            description: cleanText(dv(r.description)),
            icon: icon ? '/' + icon.replace(/^\//, '').replace(/\.iix$/, '') + '.iix' : '',
            color: v(r.card_color),
            order: parseInt(v(r.order), 10) || 0,
            count: 0,
            disableRating: truthy(r.disable_rating),
            disableHelpful: truthy(r.disable_mark_as_helpful),
            disableSuggesting: truthy(r.disable_suggesting),
            disableCommenting: truthy(r.disable_commenting),
        }
    })
    if (!kbs.length) return kbs
    const q = encodeURIComponent(publishedCondition() + '^kb_knowledge_baseIN' + kbs.map((k) => k.id).join(','))
    const stats: any[] | null = await restGet(`/api/now/stats/kb_knowledge?sysparm_count=true&sysparm_group_by=kb_knowledge_base&sysparm_query=${q}`, signal).catch(() => null)
    if (stats) {
        const counts: Record<string, number> = {}
        stats.forEach((s) => {
            const id = String((s.groupby_fields && s.groupby_fields[0] && s.groupby_fields[0].value) || '')
            counts[id] = parseInt((s.stats && s.stats.count) || '0', 10) || 0
        })
        kbs.forEach((k) => (k.count = counts[k.id] || 0))
        return kbs
    }
    // The Aggregate API refuses some users (403 without a role): count each KB with the Table API's
    // X-Total-Count instead (one row, sys_id only).
    await Promise.all(
        kbs.map(async (k) => {
            const cq = encodeURIComponent(publishedCondition() + '^kb_knowledge_base=' + k.id)
            const r = await getWithTotal(`/api/now/table/kb_knowledge?sysparm_query=${cq}&sysparm_fields=sys_id&sysparm_limit=1`, signal).catch(() => ({ result: [], total: 0 }))
            k.count = r.total
        }),
    )
    return kbs
}

/* ---------------- Categories ---------------- */

export type KbCategoryNode = {
    id: string
    label: string
    kb: string
    parentId: string
    /** Published articles filed directly in this category. */
    own: number
    /** own + every descendant's. */
    count: number
    depth: number
    children: KbCategoryNode[]
}

export type KbCategoryTree = {
    /** Top-level categories per knowledge base id. */
    byKb: Record<string, KbCategoryNode[]>
    /** Every category by id. */
    byId: Record<string, KbCategoryNode>
    /** False when the Aggregate API refused the counts (some roleless users): show categories without numbers. */
    countsKnown: boolean
}

/** The category tree of the readable knowledge bases (kb_category as the user), with article counts. */
export async function fetchCategoryTree(kbIds: string[], signal?: AbortSignal): Promise<KbCategoryTree> {
    const tree: KbCategoryTree = { byKb: {}, byId: {}, countsKnown: true }
    if (!kbIds.length) return tree
    const [cats, stats] = await Promise.all([
        restGet(`/api/now/table/kb_category?sysparm_query=active=true^ORDERBYlabel&sysparm_fields=sys_id,label,parent_id,parent_table&sysparm_limit=2000`, signal),
        restGet(
            `/api/now/stats/kb_knowledge?sysparm_count=true&sysparm_group_by=kb_category&sysparm_query=${encodeURIComponent(publishedCondition() + '^kb_categoryISNOTEMPTY^kb_knowledge_baseIN' + kbIds.join(','))}`,
            signal,
        ).catch(() => null),
    ])
    tree.countsKnown = !!stats
    const own: Record<string, number> = {}
    ;((stats as any[]) || []).forEach((s) => {
        const id = String((s.groupby_fields && s.groupby_fields[0] && s.groupby_fields[0].value) || '')
        own[id] = parseInt((s.stats && s.stats.count) || '0', 10) || 0
    })
    const rows: any[] = (cats as any[]) || []
    rows.forEach((r) => {
        const id = v(r.sys_id)
        tree.byId[id] = { id, label: cleanText(v(r.label)), kb: '', parentId: v(r.parent_id), own: own[id] || 0, count: 0, depth: 0, children: [] }
    })
    rows.forEach((r) => {
        const n = tree.byId[v(r.sys_id)]
        const parentTable = v(r.parent_table)
        if (parentTable === 'kb_knowledge_base') {
            n.kb = n.parentId
            if (kbIds.indexOf(n.kb) < 0) return
            ;(tree.byKb[n.kb] = tree.byKb[n.kb] || []).push(n)
        } else if (parentTable === 'kb_category' && tree.byId[n.parentId]) tree.byId[n.parentId].children.push(n)
    })
    const finish = (n: KbCategoryNode, kb: string, depth: number): number => {
        n.kb = kb
        n.depth = depth
        n.children.sort((a, b) => a.label.localeCompare(b.label))
        n.count = n.own + n.children.reduce((sum, c) => sum + finish(c, kb, depth + 1), 0)
        return n.count
    }
    Object.keys(tree.byKb).forEach((kb) => {
        tree.byKb[kb].forEach((n) => finish(n, kb, 0))
        tree.byKb[kb].sort((a, b) => a.label.localeCompare(b.label))
    })
    // Categories that never reached a readable KB root are left out.
    Object.keys(tree.byId).forEach((id) => {
        if (!tree.byId[id].kb) delete tree.byId[id]
    })
    return tree
}

/** The category and all its descendants' ids. */
export function categoryWithDescendants(tree: KbCategoryTree | undefined, id: string): string[] {
    const n = tree && tree.byId[id]
    if (!n) return id ? [id] : []
    const out: string[] = []
    const walk = (c: KbCategoryNode) => {
        out.push(c.id)
        c.children.forEach(walk)
    }
    walk(n)
    return out
}

/** Root-to-leaf path of a category (for breadcrumbs). */
export function categoryPath(tree: KbCategoryTree | undefined, id: string): KbCategoryNode[] {
    const out: KbCategoryNode[] = []
    let n = tree ? tree.byId[id] : undefined
    let guard = 0
    while (n && guard++ < 20) {
        out.unshift(n)
        n = tree!.byId[n.parentId]
    }
    return out
}

/* ---------------- Articles ---------------- */

export type KbArticleSummary = {
    id: string
    number: string
    title: string
    kbId: string
    kb: string
    categoryId: string
    category: string
    views: number
    rating: number
    author: string
    /** Display values (user format). */
    published: string
    updated: string
    /** Raw UTC value ('YYYY-MM-DD HH:mm:ss'), for relative dates. */
    updatedValue: string
    type: string
    /** Plain-text excerpt (search: around the first match). */
    snippet: string
}

export const ARTICLE_LIST_FIELDS = 'sys_id,number,short_description,kb_knowledge_base,kb_category,sys_view_count,rating,author,published,sys_updated_on,article_type,meta_description'

/** Plain text of article HTML (tags, scripts and styles removed, entities decoded). */
export function articleText(html: string): string {
    return cleanText(String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' '))
}

/** A ~`max`-character excerpt, centred on the first word of `term` that occurs. */
export function excerpt(text: string, term = '', max = 220): string {
    const t = String(text || '')
    if (t.length <= max) return t
    const words = String(term || '').toLowerCase().split(/\s+/).filter((w) => w.length > 1)
    const lower = t.toLowerCase()
    let at = -1
    for (const w of words) {
        const i = lower.indexOf(w)
        if (i >= 0 && (at < 0 || i < at)) at = i
    }
    if (at < 0) return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
    let start = Math.max(0, at - Math.floor(max / 3))
    if (start > 0) {
        const sp = t.indexOf(' ', start)
        start = sp > 0 && sp < at ? sp + 1 : start
    }
    const end = Math.min(t.length, start + max)
    return (start > 0 ? '…' : '') + t.slice(start, end).replace(/\s+\S*$/, '') + (end < t.length ? '…' : '')
}

export function articleSummary(r: any, term = ''): KbArticleSummary {
    let text = r.text !== undefined ? articleText(v(r.text)) : cleanText(dv(r.meta_description))
    // Bodies often open with the title again: don't repeat it in the excerpt.
    const title = cleanText(dv(r.short_description))
    if (title && text.toLowerCase().indexOf(title.toLowerCase()) === 0) text = text.slice(title.length).replace(/^[\s:.\-–]+/, '')
    return {
        id: v(r.sys_id),
        number: v(r.number),
        title: cleanText(dv(r.short_description)),
        kbId: v(r.kb_knowledge_base),
        kb: cleanText(dv(r.kb_knowledge_base)),
        categoryId: v(r.kb_category),
        category: cleanText(dv(r.kb_category)),
        views: parseInt(v(r.sys_view_count), 10) || 0,
        rating: parseFloat(v(r.rating)) || 0,
        author: dv(r.author),
        published: dv(r.published),
        updated: dv(r.sys_updated_on),
        updatedValue: v(r.sys_updated_on),
        type: v(r.article_type) || 'text',
        snippet: excerpt(text, term),
    }
}

export type KbSort = 'relevance' | 'views' | 'updated' | 'published' | 'title' | 'rating'

export const KB_SORTS: Record<KbSort, { label: string; order: string }> = {
    relevance: { label: 'Relevance', order: '' },
    views: { label: 'Most viewed', order: '^ORDERBYDESCsys_view_count' },
    updated: { label: 'Recently updated', order: '^ORDERBYDESCsys_updated_on' },
    published: { label: 'Newest', order: '^ORDERBYDESCpublished^ORDERBYDESCsys_updated_on' },
    rating: { label: 'Top rated', order: '^ORDERBYDESCrating^ORDERBYDESCsys_view_count' },
    title: { label: 'Title A–Z', order: '^ORDERBYshort_description' },
}

export type ArticleQuery = {
    /** Readable knowledge bases (always applied; [] = nothing). */
    kbIds: string[]
    /** Narrow to one knowledge base (must be readable). */
    kb?: string
    /** Category ids (pass the category with its descendants). */
    categories?: string[]
    /** article_type values (text, wiki). */
    types?: string[]
    term?: string
    /** Extra encoded query (e.g. metaLIKEhomepage), appended as is. */
    extra?: string
    exclude?: string[]
    sort?: KbSort
}

/** The encoded query for an article list or search (no ORDERBY). */
export function articleCondition(q: ArticleQuery): string {
    const kbs = q.kb && q.kbIds.indexOf(q.kb) >= 0 ? [q.kb] : q.kbIds
    let s = publishedCondition() + '^kb_knowledge_baseIN' + (kbs.length ? kbs.join(',') : 'none')
    const t = queryTerm(q.term || '')
    if (t) s = (/^kb\d{4,}$/i.test(t) ? 'numberSTARTSWITH' + t.toUpperCase() : '123TEXTQUERY321=' + t) + '^' + s
    const cats = (q.categories || []).filter((c) => SYS_ID_RE.test(c))
    if (cats.length) s += '^kb_categoryIN' + cats.join(',')
    const types = (q.types || []).filter((x) => /^[a-z_]+$/.test(x))
    if (types.length) s += '^article_typeIN' + types.join(',')
    const ex = (q.exclude || []).filter((c) => SYS_ID_RE.test(c))
    if (ex.length) s += '^sys_idNOT IN' + ex.join(',')
    if (q.extra) s += '^' + q.extra
    return s
}

export type ArticlePage = { articles: KbArticleSummary[]; total: number }

/** One page of articles: `limit` from `offset`, sorted. `withText` adds `text` for excerpts (search). */
export async function fetchArticles(q: ArticleQuery, opts: { limit?: number; offset?: number; withText?: boolean; signal?: AbortSignal } = {}): Promise<ArticlePage> {
    if (!q.kbIds.length) return { articles: [], total: 0 }
    const limit = Math.max(1, Math.min(100, opts.limit || 10))
    const offset = Math.max(0, opts.offset || 0)
    const sort = q.sort && KB_SORTS[q.sort] ? q.sort : q.term ? 'relevance' : 'views'
    const order = sort === 'relevance' && !q.term ? KB_SORTS.views.order : KB_SORTS[sort].order
    const fields = ARTICLE_LIST_FIELDS + (opts.withText ? ',text' : '')
    const url = `/api/now/table/kb_knowledge?sysparm_query=${encodeURIComponent(articleCondition(q) + order)}&sysparm_fields=${fields}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}&sysparm_offset=${offset}`
    const r = await getWithTotal(url, opts.signal)
    return { articles: r.result.map((row) => articleSummary(row, q.term)), total: r.total }
}

export type KbFacetValue = { value: string; label: string; count: number }
export type KbFacets = { kb: KbFacetValue[]; category: KbFacetValue[]; type: KbFacetValue[] }

const TYPE_LABELS: Record<string, string> = { text: 'Article', wiki: 'Wiki' }

/**
 * Facet counts for a query (Aggregate API, grouped by knowledge base, category and type). Each facet
 * is counted with the other facets' filters applied but not its own, so picking a value never hides
 * the alternatives.
 */
export async function fetchFacets(q: ArticleQuery, labels: { kbs: Record<string, string>; categories: Record<string, string> }, signal?: AbortSignal): Promise<KbFacets> {
    if (!q.kbIds.length) return { kb: [], category: [], type: [] }
    const group = async (field: string, query: ArticleQuery) => {
        const rows: any[] = (await restGet(`/api/now/stats/kb_knowledge?sysparm_count=true&sysparm_group_by=${field}&sysparm_query=${encodeURIComponent(articleCondition(query))}`, signal).catch(() => [])) || []
        return rows
            .map((s) => ({ value: String((s.groupby_fields && s.groupby_fields[0] && s.groupby_fields[0].value) || ''), count: parseInt((s.stats && s.stats.count) || '0', 10) || 0 }))
            .filter((x) => x.value && x.count > 0)
    }
    const [kb, category, type] = await Promise.all([
        group('kb_knowledge_base', { ...q, kb: undefined }),
        group('kb_category', { ...q, categories: [] }),
        group('article_type', { ...q, types: [] }),
    ])
    const byCount = (a: KbFacetValue, b: KbFacetValue) => b.count - a.count || a.label.localeCompare(b.label)
    return {
        kb: kb.map((x) => ({ ...x, label: labels.kbs[x.value] || 'Knowledge base' })).sort(byCount),
        category: category.map((x) => ({ ...x, label: labels.categories[x.value] || '' })).filter((x) => x.label).sort(byCount),
        type: type.map((x) => ({ ...x, label: TYPE_LABELS[x.value] || x.value })).sort(byCount),
    }
}

/* ---------------- One article ---------------- */

export type KbArticle = KbArticleSummary & {
    html: string
    wiki: boolean
    state: string
    stateLabel: string
    validTo: string
    published: string
    publishedValue: string
    authorId: string
    helpfulCount: number
    displayAttachments: boolean
    disableSuggesting: boolean
    disableCommenting: boolean
    flagged: boolean
    /** Version label when the versioning plugin is installed, else ''. */
    version: string
    /** False when the article isn't published or has expired (only shown to readers who can still read it: authors, KB managers). */
    live: boolean
}

const ARTICLE_FIELDS =
    'sys_id,number,short_description,text,wiki,article_type,kb_knowledge_base,kb_category,author,published,sys_updated_on,sys_view_count,rating,helpful_count,valid_to,workflow_state,active,display_attachments,disable_suggesting,disable_commenting,flagged,version,meta_description'

/** One article (text or wiki) as the user: null when it doesn't exist or isn't readable. */
export async function fetchArticle(sysId: string, signal?: AbortSignal): Promise<KbArticle | null> {
    const id = safeId(sysId)
    if (!id) return null
    const rows: any[] = await restGet(`/api/now/table/kb_knowledge?sysparm_query=sys_id=${id}&sysparm_fields=${ARTICLE_FIELDS}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=1`, signal)
    const r = Array.isArray(rows) ? rows[0] : null
    if (!r) return null
    const base = articleSummary(r)
    const wiki = v(r.article_type) === 'wiki'
    const validTo = v(r.valid_to)
    const state = v(r.workflow_state)
    return {
        ...base,
        html: wiki ? v(r.wiki) : v(r.text),
        wiki,
        state,
        stateLabel: dv(r.workflow_state),
        validTo,
        publishedValue: v(r.published),
        authorId: v(r.author),
        helpfulCount: parseInt(v(r.helpful_count), 10) || 0,
        displayAttachments: truthy(r.display_attachments),
        disableSuggesting: truthy(r.disable_suggesting),
        disableCommenting: truthy(r.disable_commenting),
        flagged: truthy(r.flagged),
        version: r.version ? dv(r.version) : '',
        live: state === 'published' && truthy(r.active) && (!validTo || validTo >= today()),
    }
}

/** Reading time in minutes (≈ 230 words a minute, at least 1). */
export function readingMinutes(htmlOrText: string): number {
    const words = articleText(htmlOrText).split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 230))
}

/** Words of a title worth searching for related articles (stop words and short words dropped). */
export function keywords(title: string, max = 5): string {
    const stop = /^(the|and|for|with|how|what|why|when|where|can|does|your|you|are|from|into|that|this|have|has|about|should|which|its|our|not|but|all|get|use)$/i
    return String(title || '')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.test(w))
        .slice(0, max)
        .join(' ')
}
