import { useEffect, useMemo, useRef } from 'react'
import { useQuery, keepPreviousData } from 'utilities:react-query'
import { useProperties } from '@portal/runtime'
import {
    fetchKnowledgeBases,
    fetchCategoryTree,
    fetchArticles,
    fetchArticle,
    fetchFacets,
    categoryWithDescendants,
    keywords,
    safeId,
    safeIds,
} from './api'
import type { KnowledgeBase, KbCategoryTree, ArticlePage, KbSort, KbFacets, KbArticle, ArticleQuery } from './api'

export const KB_KEY = 'rp-kb'

/** Platform properties the KB pieces read (list them in the portal's settings.exposedProperties). */
export const KB_PROPERTIES = [
    'glide.knowman.default_keyword',
    'glide.knowman.show_rating_options',
    'glide.knowman.show_rating_options.roles',
    'glide.knowman.show_yn_rating',
    'glide.knowman.show_yn_rating.roles',
    'glide.knowman.show_star_rating',
    'glide.knowman.show_star_rating.roles',
    'glide.knowman.show_flag',
    'glide.knowman.show_flag.roles',
    'glide.knowman.feedback.enable_actionable_feedback_for_flag',
    'glide.knowman.feedback.enable_actionable_feedback_for_helpful',
    'glide.knowman.show_only_populated',
]

/** The exposed glide.knowman.* properties (null where the portal doesn't expose one). */
export function useKbProperties(): { values: Record<string, string | null>; isLoading: boolean } {
    const p = useProperties(KB_PROPERTIES) as any
    return { values: (p && p.values) || {}, isLoading: !!(p && p.isLoading) }
}

/**
 * Knowledge bases the user can read (the platform's KB read ACL applies the can / cannot read user
 * criteria), with their published article counts. `ids` narrows to some KBs (in that order); empty
 * KBs are left out unless `includeEmpty` (the platform's glide.knowman.show_only_populated).
 */
export function useKnowledgeBases(options: { ids?: string[] | string; includeEmpty?: boolean } = {}) {
    const q = useQuery({
        queryKey: [KB_KEY, 'bases'],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchKnowledgeBases(signal),
        staleTime: 10 * 60_000,
    }) as any
    const props = useKbProperties()
    const only = safeIds(options.ids)
    const all: KnowledgeBase[] = q.data || []
    const populatedOnly = options.includeEmpty === undefined ? props.values['glide.knowman.show_only_populated'] !== 'false' : !options.includeEmpty
    const list = useMemo(() => {
        let out = all
        if (only.length) out = only.map((id) => all.find((k) => k.id === id)).filter(Boolean) as KnowledgeBase[]
        return populatedOnly ? out.filter((k) => k.count > 0) : out
    }, [all, only.join(','), populatedOnly])
    /** Every readable KB id (also empty ones): the filter every article query carries. */
    const readableIds = useMemo(() => (only.length ? only.filter((id) => all.some((k) => k.id === id)) : all.map((k) => k.id)), [all, only.join(',')])
    const byId = useMemo(() => {
        const m: Record<string, KnowledgeBase> = {}
        all.forEach((k) => (m[k.id] = k))
        return m
    }, [all])
    // ready also on error: dependants then show their empty states instead of loading forever.
    return { data: list, all, byId, readableIds, isLoading: q.isLoading, error: q.error, ready: !!q.data || !!q.error }
}

/** The category tree of the readable knowledge bases, with counts (own + descendants). */
export function useKbCategories(options: { ids?: string[] | string } = {}) {
    const kbs = useKnowledgeBases({ ids: options.ids, includeEmpty: true })
    const q = useQuery({
        queryKey: [KB_KEY, 'categories', kbs.readableIds.join(',')],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCategoryTree(kbs.readableIds, signal),
        enabled: kbs.ready,
        staleTime: 10 * 60_000,
    }) as any
    // A failed category read (rare) behaves like "no categories".
    const tree: KbCategoryTree | undefined = q.data || (q.error ? { byKb: {}, byId: {}, countsKnown: false } : undefined)
    return { tree, kbs, isLoading: kbs.isLoading || q.isLoading, error: kbs.error || q.error }
}

export type KbArticlesOptions = {
    /** Narrow to some knowledge bases (option value); default every readable one. */
    knowledgeBases?: string[] | string
    kb?: string
    category?: string
    /** Include subcategories (default true). */
    deep?: boolean
    types?: string[]
    sort?: KbSort
    limit?: number
    page?: number
    /** Featured: articles whose meta keywords hold glide.knowman.default_keyword ("homepage"), as the KM portal's Featured widget. */
    featured?: boolean
    exclude?: string[]
    term?: string
    /** Fetch text for excerpts. */
    withText?: boolean
    enabled?: boolean
}

function useArticleQuery(o: KbArticlesOptions): { query: ArticleQuery | null; tree: KbCategoryTree | undefined; labels: { kbs: Record<string, string>; categories: Record<string, string> } } {
    const cats = useKbCategories({ ids: o.knowledgeBases })
    const kbs = cats.kbs
    const props = useKbProperties()
    const category = safeId(o.category)
    const keyword = String(props.values['glide.knowman.default_keyword'] || 'homepage').replace(/[\^\n]/g, '')
    const needTree = !!category && o.deep !== false
    const ready = kbs.ready && (!needTree || !!cats.tree) && (!o.featured || !props.isLoading)
    const query: ArticleQuery | null = ready
        ? {
              kbIds: kbs.readableIds,
              kb: safeId(o.kb) || undefined,
              categories: category ? (o.deep === false ? [category] : categoryWithDescendants(cats.tree, category)) : [],
              types: o.types,
              term: o.term,
              sort: o.sort,
              exclude: o.exclude,
              extra: o.featured ? 'metaLIKE' + keyword : '',
          }
        : null
    const labels = useMemo(() => {
        const k: Record<string, string> = {}
        kbs.all.forEach((x) => (k[x.id] = x.title))
        const c: Record<string, string> = {}
        if (cats.tree) Object.keys(cats.tree.byId).forEach((id) => (c[id] = cats.tree!.byId[id].label))
        return { kbs: k, categories: c }
    }, [kbs.all, cats.tree])
    return { query, tree: cats.tree, labels }
}

/**
 * Published articles the user can read: by knowledge base, category (with subcategories), type,
 * featured, term; sorted (views by default, relevance with a term) and paged (`page` from 1).
 */
export function useKbArticles(o: KbArticlesOptions = {}) {
    const { query } = useArticleQuery(o)
    const limit = Math.max(1, Math.min(100, o.limit || 10))
    const page = Math.max(1, o.page || 1)
    const q = useQuery({
        queryKey: [KB_KEY, 'articles', query, limit, page, !!o.withText],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchArticles(query!, { limit, offset: (page - 1) * limit, withText: o.withText, signal }),
        enabled: !!query && o.enabled !== false,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    }) as any
    const data: ArticlePage | undefined = q.data
    return { articles: data ? data.articles : [], total: data ? data.total : 0, pages: data ? Math.max(1, Math.ceil(data.total / limit)) : 1, isLoading: !query || q.isLoading, isFetching: q.isFetching, error: q.error }
}

/**
 * KB search: results (with excerpts), total and facets (knowledge base, category, type) for a term
 * and filters. With an empty term it lists (most viewed first), so the same page browses.
 */
export function useKbSearch(o: KbArticlesOptions & { pageSize?: number } = {}) {
    const { query, labels } = useArticleQuery(o)
    const pageSize = Math.max(1, Math.min(50, o.pageSize || o.limit || 10))
    const page = Math.max(1, o.page || 1)
    const results = useQuery({
        queryKey: [KB_KEY, 'search', query, pageSize, page],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchArticles(query!, { limit: pageSize, offset: (page - 1) * pageSize, withText: true, signal }),
        enabled: !!query && o.enabled !== false,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    }) as any
    const facets = useQuery({
        queryKey: [KB_KEY, 'facets', query, labels],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchFacets(query!, labels, signal),
        enabled: !!query && o.enabled !== false,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    }) as any
    const data: ArticlePage | undefined = results.data
    return {
        articles: data ? data.articles : [],
        total: data ? data.total : 0,
        pages: data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1,
        facets: (facets.data as KbFacets) || { kb: [], category: [], type: [] },
        isLoading: !query || results.isLoading,
        isFetching: results.isFetching || facets.isFetching,
        error: results.error,
    }
}

/** One article (text or wiki) as the user; `data` is null when it doesn't exist or isn't readable. */
export function useKbArticle(sysId: string | undefined) {
    const id = safeId(sysId)
    return useQuery({
        queryKey: [KB_KEY, 'article', id],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchArticle(id, signal),
        enabled: !!id,
        staleTime: 5 * 60_000,
    }) as { data: KbArticle | null | undefined; isLoading: boolean; error: any; refetch: () => void }
}

/** Articles related by content (text index on the title's keywords), same KBs, without the article itself. */
export function useRelatedArticles(article: { id: string; title: string } | null | undefined, options: { limit?: number; knowledgeBases?: string[] | string } = {}) {
    const term = article ? keywords(article.title) : ''
    return useKbArticles({ term, exclude: article ? [article.id] : [], limit: options.limit || 5, knowledgeBases: options.knowledgeBases, enabled: !!term, sort: 'relevance' })
}

/* ---------------- View counting ---------------- */

type ServerHandle = { get: (input?: any, opts?: any) => Promise<any> }

/**
 * Count a view of an article the platform's way. The widget's server script must handle
 * `input.kbAction === 'view'` (app/kb-article does): it calls KBViewModel.increaseKBView (the
 * platform's view counter: incrementViewCount, sys_view_count) and queues `kb.view`, whose script
 * action writes the kb_use row. Resolves with the new view count (or null).
 */
export async function recordArticleView(server: ServerHandle, sysId: string): Promise<number | null> {
    const id = safeId(sysId)
    if (!id || !server) return null
    try {
        const data = await server.get({ kbAction: 'view', article: id }, { toast: false })
        const n = data && data.kbView && parseInt(data.kbView.views, 10)
        return isNaN(n) ? null : n
    } catch (e) {
        return null
    }
}

/** recordArticleView once per article per mount (re-renders and strict-mode double effects don't count twice). */
export function useRecordArticleView(server: ServerHandle | null | undefined, sysId: string | undefined, enabled = true): void {
    const done = useRef('')
    useEffect(() => {
        const id = safeId(sysId)
        if (!enabled || !server || !id || done.current === id) return
        done.current = id
        recordArticleView(server, id)
    }, [server, sysId, enabled])
}
