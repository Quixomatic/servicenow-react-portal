import { useState } from 'react'
import { Link } from '@portal/runtime'
import { useQuery, keepPreviousData } from 'utilities:react-query'
import { Card } from 'components:card'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { Tabs, TabsList, TabsTrigger } from 'components:tabs'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from 'components:empty'
import { restGet } from 'utilities:app/graphql'
import { getWithTotal, knowledgeHit } from 'utilities:app/search'
import type { SearchHit } from 'utilities:app/search'

export type KbMode = 'popular' | 'recent' | 'featured'

const KB_FIELDS = 'sys_id,number,short_description,kb_category,kb_knowledge_base,sys_view_count,sys_updated_on,published'
const PUBLISHED = 'workflow_state=published^active=true'

function scope(kb?: string, category?: string) {
    const safe = (s?: string) => (s && /^[0-9a-f]{32}$/.test(s) ? s : '')
    return PUBLISHED + (safe(kb) ? `^kb_knowledge_base=${safe(kb)}` : '') + (safe(category) ? `^kb_category=${safe(category)}` : '')
}

const ORDER: Record<KbMode, string> = {
    popular: '^ORDERBYDESCsys_view_count',
    recent: '^ORDERBYDESCpublished^ORDERBYDESCsys_updated_on',
    featured: '^featured=true^ORDERBYDESCsys_view_count',
}

/**
 * Published articles the user can read (kb_knowledge read ACLs and KB user criteria apply), as
 * search hits: popular (most viewed), recent (newest published) or featured.
 */
export function useKbArticles(mode: KbMode, options: { limit?: number; knowledgeBase?: string; category?: string; kbPage?: string; offset?: number } = {}) {
    const limit = Math.max(1, Math.min(50, options.limit || 6))
    const offset = Math.max(0, options.offset || 0)
    return useQuery({
        queryKey: ['rp-kb', 'articles', mode, options.knowledgeBase || '', options.category || '', limit, offset, options.kbPage || 'kb'],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const q = scope(options.knowledgeBase, options.category) + (ORDER[mode] || ORDER.popular)
            const r = await getWithTotal(
                `/api/now/table/kb_knowledge?sysparm_query=${encodeURIComponent(q)}&sysparm_fields=${KB_FIELDS}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}&sysparm_offset=${offset}`,
                signal,
            )
            return { hits: r.result.map((row) => knowledgeHit(row, { kbPage: options.kbPage || 'kb' })) as SearchHit[], total: r.total }
        },
        staleTime: 5 * 60_000,
        placeholderData: keepPreviousData,
    }) as any
}

export type KbCategory = { id: string; label: string; count: number; kb: string }

/** Categories that have published articles, with their counts (Aggregate API), most articles first. */
export function useKbCategories(options: { knowledgeBase?: string; limit?: number } = {}) {
    return useQuery({
        queryKey: ['rp-kb', 'categories', options.knowledgeBase || '', options.limit || 0],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const q = encodeURIComponent(scope(options.knowledgeBase) + '^kb_categoryISNOTEMPTY')
            const [stats, cats] = await Promise.all([
                restGet(`/api/now/stats/kb_knowledge?sysparm_count=true&sysparm_group_by=kb_category&sysparm_query=${q}`, signal),
                restGet(`/api/now/table/kb_category?sysparm_query=active=true&sysparm_fields=sys_id,label,parent_id&sysparm_limit=500`, signal),
            ])
            const labels: Record<string, { label: string; kb: string }> = {}
            ;(cats || []).forEach((c: any) => (labels[c.sys_id] = { label: c.label, kb: (c.parent_id && c.parent_id.value) || '' }))
            const out: KbCategory[] = (Array.isArray(stats) ? stats : [])
                .map((s: any) => {
                    const id = String((s.groupby_fields && s.groupby_fields[0] && s.groupby_fields[0].value) || '')
                    return { id, label: (labels[id] && labels[id].label) || '', count: parseInt((s.stats && s.stats.count) || '0', 10) || 0, kb: (labels[id] && labels[id].kb) || '' }
                })
                .filter((c: KbCategory) => c.id && c.label && c.count > 0)
                .sort((a: KbCategory, b: KbCategory) => b.count - a.count || a.label.localeCompare(b.label))
            return options.limit ? out.slice(0, options.limit) : out
        },
        staleTime: 10 * 60_000,
    }) as any
}

/** One article row: icon tile, two-line title, category and views. */
export function ArticleRow({ hit, compact = false }: { hit: SearchHit; compact?: boolean }) {
    const meta = [hit.subtitle ? hit.subtitle.split(' · ').pop() : '', hit.meta].filter(Boolean).join(' · ')
    return (
        <Link
            {...({ to: hit.link.to, sysId: hit.link.sysId } as any)}
            className="group/row flex min-w-0 items-start gap-3 rounded-lg px-2 py-2 no-underline outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-chart-1/12 text-chart-1 ring-1 ring-chart-1/20 ring-inset">
                <Icon name="file-text" className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={compact ? 'truncate text-sm font-medium text-foreground' : 'line-clamp-2 text-sm leading-snug font-medium text-foreground'}>{hit.title}</span>
                {meta ? <span className="truncate text-xs text-muted-foreground">{meta}</span> : null}
            </span>
        </Link>
    )
}

type Options = {
    title?: string
    /** Tabs, in order: popular, recent, featured (default popular + recent). */
    modes?: KbMode[]
    limit?: number
    knowledgeBase?: string
    kbPage?: string
    showCategories?: boolean
    categoriesLimit?: number
    /** One-line titles (truncated) instead of up to two lines. */
    compact?: boolean
}

const MODE_LABEL: Record<KbMode, string> = { popular: 'Popular', recent: 'Latest', featured: 'Featured' }

/**
 * Knowledge Articles: popular / latest articles plus "browse by topic" category chips, opening the
 * knowledge page (app/knowledge). Hooks for other widgets: useKbArticles, useKbCategories; row:
 * ArticleRow.
 */
export default function KbArticles({ options = {} }: { options?: Options }) {
    const modes = (Array.isArray(options.modes) && options.modes.length ? options.modes : (['popular', 'recent'] as KbMode[])).filter((m) => !!MODE_LABEL[m])
    const [mode, setMode] = useState<KbMode>(modes[0] || 'popular')
    const limit = Math.max(1, Math.min(12, options.limit || 6))
    const kbPage = options.kbPage || 'kb'
    const articles = useKbArticles(mode, { limit, knowledgeBase: options.knowledgeBase, kbPage })
    const cats = useKbCategories({ knowledgeBase: options.knowledgeBase, limit: options.categoriesLimit || 8 })
    const hits: SearchHit[] = (articles.data && articles.data.hits) || []
    const showCats = options.showCategories !== false

    return (
        <Card className="h-full gap-0 py-0" data-rp-kb-articles="">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
                <h2 className="m-0 text-base font-semibold tracking-tight">{options.title || 'Knowledge'}</h2>
                <Link to={kbPage} className="flex items-center gap-1 text-xs font-medium text-primary no-underline hover:underline">
                    Browse all
                    <Icon name="arrow-right" className="size-3.5" />
                </Link>
            </div>
            {modes.length > 1 ? (
                <Tabs value={mode} onValueChange={(v: string) => setMode(v as KbMode)} className="gap-0">
                    <div className="border-b border-border px-3">
                        <TabsList variant="line" className="h-10">
                            {modes.map((m) => (
                                <TabsTrigger key={m} value={m} className="px-2">
                                    {MODE_LABEL[m]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>
            ) : (
                <div className="border-b border-border" />
            )}
            <div className="flex flex-1 flex-col gap-0.5 p-2" role="tabpanel" aria-label={MODE_LABEL[mode]}>
                {articles.isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 px-2 py-2" aria-hidden>
                            <Skeleton className="size-8 rounded-lg" />
                            <div className="flex flex-1 flex-col gap-1.5">
                                <Skeleton className="h-3.5 w-4/5" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        </div>
                    ))
                ) : articles.error ? (
                    <p className="m-0 px-2 py-3 text-sm text-destructive">Couldn't load articles: {String(articles.error.message || articles.error)}</p>
                ) : hits.length ? (
                    hits.map((h) => <ArticleRow key={h.id} hit={h} compact={!!options.compact} />)
                ) : (
                    <Empty className="py-6">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon name="book-open" />
                            </EmptyMedia>
                            <EmptyTitle>No articles yet</EmptyTitle>
                            <EmptyDescription>Published articles you can read will show up here.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
            {showCats && cats.data && cats.data.length ? (
                <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">Browse by topic</span>
                    <div className="flex flex-wrap gap-1.5">
                        {cats.data.map((c: KbCategory) => (
                            <Link
                                key={c.id}
                                to={kbPage}
                                q={{ category: c.id }}
                                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-foreground no-underline transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            >
                                {c.label}
                                <span className="text-muted-foreground tabular-nums">{c.count}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            ) : null}
        </Card>
    )
}
