/**
 * utilities:app/search: portal search over the platform's own search APIs, as the user.
 *
 * Sources (sources.ts): catalog (the catalog search API), knowledge (kb_knowledge text index),
 * requests and incidents (the user's own records, text index or number), pages (portal pages and
 * menu items, local). See SEARCH_SOURCES / DEFAULT_SOURCES.
 *
 * Hooks
 *   useSearch(term, { sources?, limit?, targets?, enabled?, menus? })
 *       → { groups: SearchGroup[], hits (flattened, group order), isFetching, ready }
 *       Debounce the term yourself (useDebouncedValue from utilities:app/graphql). Remote sources
 *       need 2+ characters; every source is cached per (term, limit) in the page query cache.
 *   useSearchSource(source, term, { pageSize?, targets?, enabled? })
 *       → TanStack infinite query of SearchPage ({ hits, total }), for results pages ("Load more")
 *   usePageEntries(menus = ['primary', 'account'])  → PageEntry[]: menu items, then pages no menu lists
 *   useRecentSearches(max = 6)  → { items, add(term), remove(term), clear() }  (localStorage
 *       x_312987_portal.search.recent.<user>, synced across tabs)
 *
 * Helpers
 *   hitLinkProps(link)               → <Link {...}> props ({ to, q, table, sysId, query })
 *   openHit(navigate, hit)           → navigate (or open href in a new tab)
 *   resultsLinkProps(page, term, source?)  → <Link> props for the results page (q term=…&source=…)
 *   Highlight({ text, term })        → text with the term's words in <mark>
 *   searchSource, searchPages, cleanText, textCondition, queryTerm, catalogHit, knowledgeHit,
 *   requestHit, incidentHit, catalogIcon, pictureUrl, getWithTotal, ME_DYNAMIC
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueries, useInfiniteQuery, keepPreviousData } from 'utilities:react-query'
import { usePortal, useNavigation, useUser } from '@portal/runtime'
import { SEARCH_SOURCES, DEFAULT_SOURCES, searchSource, searchPages } from './sources'
import type { SearchHit, SearchLink, SearchPage, SearchSourceId, SearchTargets, PageEntry, SearchSourceDef } from './sources'

export {
    SEARCH_SOURCES,
    DEFAULT_SOURCES,
    ME_DYNAMIC,
    searchSource,
    searchPages,
    cleanText,
    textCondition,
    queryTerm,
    catalogHit,
    knowledgeHit,
    requestHit,
    incidentHit,
    catalogIcon,
    pictureUrl,
    getWithTotal,
} from './sources'
export type { SearchHit, SearchLink, SearchPage, SearchSourceId, SearchTargets, PageEntry, SearchSourceDef } from './sources'

export type SearchGroup = SearchSourceDef & { hits: SearchHit[]; total: number; isLoading: boolean; isFetching: boolean; error: unknown }

export const SEARCH_KEY = 'rp-search'

/** Valid source ids from an option value (array or comma list); defaults when empty. */
export function normalizeSources(value: unknown): SearchSourceId[] {
    const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
    const out = list.map((s) => String(s).trim()).filter((s) => !!(SEARCH_SOURCES as any)[s]) as SearchSourceId[]
    return out.length ? out : DEFAULT_SOURCES.slice()
}

function flatten(items: any[], group: string, out: PageEntry[]) {
    for (const it of items || []) {
        if (!it || it.type === 'separator') continue
        if (it.type === 'group') {
            flatten(it.children || [], it.label || group, out)
            continue
        }
        if (it.type === 'url' || it.portalSlug || it.to === undefined) continue
        out.push({ label: String(it.label || ''), to: it.to, icon: it.icon, q: it.q, table: it.table, sysId: it.sysId, query: it.query, group })
    }
}

/** Searchable portal destinations: menu items (with their group), then pages that no menu item opens. */
export function usePageEntries(menus: string[] = ['primary', 'account']): PageEntry[] {
    const portal = usePortal() as any
    const primary = useNavigation(menus[0] || 'primary') as any
    const second = useNavigation(menus[1] || menus[0] || 'primary') as any
    const pages: any[] = (portal && portal.pages) || []
    return useMemo(() => {
        const out: PageEntry[] = []
        flatten(primary.items, '', out)
        if (menus[1]) flatten(second.items, '', out)
        const covered: Record<string, boolean> = {}
        out.forEach((e) => (covered[e.to] = true))
        for (const p of pages) {
            const route = String(p.route || p.routePattern || '')
            if (!route && route !== '') continue
            if (route.indexOf(':') >= 0 || route.indexOf('*') >= 0 || covered[route]) continue
            out.push({ label: String(p.title || p.name || route), to: route, icon: 'file', group: 'Pages' })
        }
        return out.filter((e) => e.label)
    }, [primary.items, second.items, pages, menus.join(',')])
}

/** Typeahead search across sources. Each group keeps its previous hits while the next term loads. */
export function useSearch(
    term: string,
    options: { sources?: SearchSourceId[]; limit?: number; targets?: SearchTargets; enabled?: boolean; menus?: string[] } = {},
) {
    const sources = options.sources && options.sources.length ? options.sources : DEFAULT_SOURCES
    const limit = options.limit || 4
    const t = String(term || '').trim()
    const enabled = options.enabled !== false
    const remote = sources.filter((s) => SEARCH_SOURCES[s] && SEARCH_SOURCES[s].remote)
    const targets = options.targets || {}
    const targetsKey = JSON.stringify(targets)
    const results = useQueries({
        queries: remote.map((source) => ({
            queryKey: [SEARCH_KEY, source, t.toLowerCase(), limit, 0, targetsKey],
            queryFn: ({ signal }: { signal: AbortSignal }) => searchSource(source, t, { limit, targets, signal }),
            enabled: enabled && t.length >= 2,
            staleTime: 60_000,
            placeholderData: keepPreviousData,
            retry: false,
        })),
    }) as any[]
    const entries = usePageEntries(options.menus)
    const local = useMemo(() => (sources.indexOf('pages') >= 0 && t ? searchPages(entries, t, limit) : { hits: [], total: 0 }), [entries, t, limit, sources.join(',')])

    const groups: SearchGroup[] = sources
        .filter((s) => !!SEARCH_SOURCES[s])
        .map((s) => {
            if (s === 'pages') return { ...SEARCH_SOURCES.pages, hits: local.hits, total: local.total, isLoading: false, isFetching: false, error: null }
            const r = results[remote.indexOf(s)] || {}
            const page: SearchPage | undefined = t.length >= 2 ? r.data : undefined
            return {
                ...SEARCH_SOURCES[s],
                hits: page ? page.hits : [],
                total: page ? page.total : 0,
                isLoading: t.length >= 2 && !!r.isLoading,
                isFetching: t.length >= 2 && !!r.isFetching,
                error: r.error || null,
            }
        })
    const isFetching = groups.some((g) => g.isFetching)
    const hits = groups.reduce((acc: SearchHit[], g) => acc.concat(g.hits), [])
    // Ready: every remote source answered for this term at least once (placeholders count).
    const ready = t.length < 2 || results.every((r) => r && (r.data || r.error))
    return { groups, hits, isFetching, ready, term: t }
}

/** One source with paging ("Load more"), for a results page. */
export function useSearchSource(source: SearchSourceId, term: string, options: { pageSize?: number; targets?: SearchTargets; enabled?: boolean; menus?: string[] } = {}) {
    const t = String(term || '').trim()
    const pageSize = options.pageSize || 10
    const targets = options.targets || {}
    const entries = usePageEntries(options.menus)
    const isPages = source === 'pages'
    return useInfiniteQuery({
        queryKey: [SEARCH_KEY, 'paged', source, t.toLowerCase(), pageSize, JSON.stringify(targets), isPages ? entries.length : 0],
        queryFn: ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) =>
            isPages ? Promise.resolve(searchPages(entries, t, 50)) : searchSource(source, t, { limit: pageSize, offset: pageParam, targets, signal }),
        initialPageParam: 0,
        getNextPageParam: (last: SearchPage, all: SearchPage[]) => {
            if (isPages) return undefined
            const loaded = all.reduce((n, p) => n + p.hits.length, 0)
            return last.hits.length >= pageSize && loaded < last.total ? loaded : undefined
        },
        enabled: options.enabled !== false && (isPages ? t.length >= 1 : t.length >= 2),
        staleTime: 60_000,
        retry: false,
    })
}

/* ---------------- Recent searches ---------------- */

const RECENT_EVENT = 'rp-search-recent'

function recentKey(userId: string) {
    return 'x_312987_portal.search.recent.' + (userId || 'anon')
}

function readRecent(key: string): string[] {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
        const list = raw ? JSON.parse(raw) : []
        return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s.trim()) : []
    } catch (e) {
        return []
    }
}

/** The user's recent search terms (newest first), in localStorage under our own namespace. */
export function useRecentSearches(max = 6) {
    const user = useUser() as any
    const key = recentKey(user && user.sysId)
    const [items, setItems] = useState<string[]>(() => readRecent(key).slice(0, max))
    useEffect(() => {
        const sync = () => setItems(readRecent(key).slice(0, max))
        sync()
        const onStorage = (e: StorageEvent) => e.key === key && sync()
        window.addEventListener('storage', onStorage)
        window.addEventListener(RECENT_EVENT, sync)
        return () => {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener(RECENT_EVENT, sync)
        }
    }, [key, max])
    const write = useCallback(
        (next: string[]) => {
            try {
                localStorage.setItem(key, JSON.stringify(next.slice(0, 20)))
            } catch (e) {
                /* storage full or blocked */
            }
            window.dispatchEvent(new Event(RECENT_EVENT))
        },
        [key],
    )
    const add = useCallback(
        (term: string) => {
            const t = String(term || '').trim()
            if (t.length < 2) return
            write([t].concat(readRecent(key).filter((s) => s.toLowerCase() !== t.toLowerCase())))
        },
        [key, write],
    )
    const remove = useCallback((term: string) => write(readRecent(key).filter((s) => s !== term)), [key, write])
    const clear = useCallback(() => write([]), [write])
    return { items, add, remove, clear }
}

/* ---------------- Links and highlighting ---------------- */

/** <Link> props for a hit's link (href links are handled by the caller). */
export function hitLinkProps(link: SearchLink): { to: string; q?: Record<string, string>; table?: string; sysId?: string; query?: string } {
    const out: any = { to: link.to }
    if (link.q) out.q = link.q
    if (link.table) out.table = link.table
    if (link.sysId) out.sysId = link.sysId
    if (link.query) out.query = link.query
    return out
}

/** Go to a hit: portal navigation, or an external href in a new tab. */
export function openHit(navigate: (to: string, opts?: any) => void, hit: SearchHit) {
    if (hit.link.href) {
        window.open(hit.link.href, '_blank', 'noopener')
        return
    }
    const p = hitLinkProps(hit.link)
    navigate(p.to, { q: p.q, table: p.table, sysId: p.sysId, query: p.query })
}

/** <Link> props for the results page. */
export function resultsLinkProps(page: string, term: string, source?: string) {
    const q: Record<string, string> = { term: String(term || '').trim() }
    if (source && source !== 'all') q.source = source
    return { to: page || 'search', q }
}

function escapeRe(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The text with every word of the term wrapped in <mark> (case-insensitive). */
export function Highlight({ text, term, className }: { text: string; term: string; className?: string }) {
    const words = String(term || '')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .map(escapeRe)
    if (!words.length || !text) return <>{text}</>
    const re = new RegExp('(' + words.join('|') + ')', 'ig')
    const parts = String(text).split(re)
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark key={i} className={className || 'rounded-[3px] bg-primary/15 px-px text-inherit'}>
                        {part}
                    </mark>
                ) : (
                    part
                ),
            )}
        </>
    )
}

export default function SearchUtility() {
    return null
}
