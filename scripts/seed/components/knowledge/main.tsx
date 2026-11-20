import { usePortalLocation, useNavigate, Link } from '@portal/runtime'
import { useQuery } from 'utilities:react-query'
import { Card } from 'components:card'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { RichText } from 'components:rich-text'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from 'components:empty'
import { cx } from 'components:app/field'
import { restGet } from 'utilities:app/graphql'
import { cleanText } from 'utilities:app/search'
import { SearchBox } from 'components:app/search-box'
import { useKbArticles, useKbCategories, ArticleRow } from 'components:app/kb-articles'
import type { KbCategory } from 'components:app/kb-articles'
import type { SearchHit } from 'utilities:app/search'

export type KbArticle = {
    sysId: string
    number: string
    title: string
    html: string
    wiki: boolean
    knowledgeBase: string
    category: string
    categoryId: string
    author: string
    updated: string
    published: string
    views: number
}

const dv = (f: any) => (f && typeof f === 'object' ? String(f.display_value || '') : String(f || ''))
const v = (f: any) => (f && typeof f === 'object' ? String(f.value === null || f.value === undefined ? '' : f.value) : String(f || ''))

/** One article (text or wiki), as the user: null when it doesn't exist or isn't readable. */
export function useKbArticle(sysId: string | undefined) {
    const ok = !!sysId && /^[0-9a-f]{32}$/.test(sysId)
    return useQuery({
        queryKey: ['rp-kb', 'article', sysId || ''],
        queryFn: async ({ signal }: { signal: AbortSignal }): Promise<KbArticle | null> => {
            const rows = await restGet(
                `/api/now/table/kb_knowledge?sysparm_query=sys_id=${sysId}&sysparm_fields=sys_id,number,short_description,text,wiki,article_type,kb_knowledge_base,kb_category,author,sys_updated_on,published,sys_view_count&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=1`,
                signal,
            )
            const r = Array.isArray(rows) ? rows[0] : null
            if (!r) return null
            const wiki = v(r.article_type) === 'wiki'
            return {
                sysId: v(r.sys_id),
                number: v(r.number),
                title: cleanText(dv(r.short_description)),
                html: wiki ? v(r.wiki) : v(r.text),
                wiki,
                knowledgeBase: dv(r.kb_knowledge_base),
                category: dv(r.kb_category),
                categoryId: v(r.kb_category),
                author: dv(r.author),
                updated: dv(r.sys_updated_on),
                published: dv(r.published),
                views: parseInt(v(r.sys_view_count), 10) || 0,
            }
        },
        enabled: ok,
        staleTime: 5 * 60_000,
    }) as any
}

type Options = {
    knowledgeBase?: string
    /** Articles per page when browsing. */
    listLimit?: number
    /** "More in this topic" beside an article. */
    showRelated?: boolean
    /** The search results page (knowledge tab). */
    resultsPage?: string
}

function Meta({ icon, children }: { icon: string; children: any }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <Icon name={icon} className="size-3.5" />
            {children}
        </span>
    )
}

function ArticleView({ sysId, page, options }: { sysId: string; page: string; options: Options }) {
    const a = useKbArticle(sysId)
    const art: KbArticle | null | undefined = a.data
    const related = useKbArticles('popular', { limit: 6, category: art ? art.categoryId : undefined, kbPage: page })
    const more: SearchHit[] = ((related.data && related.data.hits) || []).filter((h: SearchHit) => h.id !== sysId).slice(0, 5)
    if (a.isLoading) {
        return (
            <Card className="gap-4 px-6 py-6" aria-busy="true">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
                <div className="mt-2 flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className={cx('h-3.5', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
                    ))}
                </div>
            </Card>
        )
    }
    if (!art) {
        return (
            <Card className="py-0">
                <Empty className="py-14">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Icon name="file-question" />
                        </EmptyMedia>
                        <EmptyTitle>Article not available</EmptyTitle>
                        <EmptyDescription>It may have been retired, or you may not have access to it.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button variant="outline" size="sm" render={<Link to={page} />}>
                            <Icon name="arrow-left" />
                            Back to knowledge
                        </Button>
                    </EmptyContent>
                </Empty>
            </Card>
        )
    }
    const side = options.showRelated !== false && more.length > 0
    return (
        <div className={cx('grid min-w-0 items-start gap-6', side ? 'grid-cols-[minmax(0,1fr)_18rem] max-lg:grid-cols-1' : 'grid-cols-1')}>
            <Card className="gap-0 py-0" data-rp-kb-article={art.number}>
                <header className="flex flex-col gap-3 border-b border-border px-6 pt-5 pb-5 max-sm:px-4">
                    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Link to={page} className="text-muted-foreground no-underline hover:text-foreground">
                            Knowledge
                        </Link>
                        {art.knowledgeBase ? (
                            <>
                                <Icon name="chevron-right" className="size-3" />
                                <span>{art.knowledgeBase}</span>
                            </>
                        ) : null}
                        {art.category ? (
                            <>
                                <Icon name="chevron-right" className="size-3" />
                                <Link to={page} q={{ category: art.categoryId }} className="text-muted-foreground no-underline hover:text-foreground">
                                    {art.category}
                                </Link>
                            </>
                        ) : null}
                    </nav>
                    <h1 className="m-0 text-2xl leading-tight font-semibold tracking-tight text-balance max-sm:text-xl">{art.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <Meta icon="hash">{art.number}</Meta>
                        {art.author ? <Meta icon="user-round">{art.author}</Meta> : null}
                        <Meta icon="calendar">Updated {art.updated.split(' ')[0]}</Meta>
                        {art.views ? <Meta icon="eye">{art.views.toLocaleString()} views</Meta> : null}
                    </div>
                </header>
                <div className="px-6 py-6 max-sm:px-4">
                    {art.wiki ? <pre className="m-0 text-sm whitespace-pre-wrap">{art.html}</pre> : <RichText html={art.html} className="max-w-[72ch]" />}
                </div>
            </Card>
            {side ? (
                <aside className="flex flex-col gap-2 max-lg:order-last" aria-label="Related articles">
                    <h2 className="m-0 px-2 text-sm font-semibold">More in {art.category || 'Knowledge'}</h2>
                    <Card className="gap-0 p-1.5">
                        {more.map((h) => (
                            <ArticleRow key={h.id} hit={h} />
                        ))}
                    </Card>
                </aside>
            ) : null}
        </div>
    )
}

function Browse({ page, category, options }: { page: string; category: string; options: Options }) {
    const navigate = useNavigate()
    const cats = useKbCategories({ knowledgeBase: options.knowledgeBase })
    const list: KbCategory[] = (cats.data as KbCategory[]) || []
    const current = list.find((c) => c.id === category)
    const limit = Math.max(5, Math.min(50, options.listLimit || 20))
    const articles = useKbArticles(category ? 'popular' : 'popular', { limit, knowledgeBase: options.knowledgeBase, category: category || undefined, kbPage: page })
    const hits: SearchHit[] = (articles.data && articles.data.hits) || []
    const total = (articles.data && articles.data.total) || 0
    const results = options.resultsPage || 'search'
    const catLink = (c: KbCategory | null) => {
        const active = c ? c.id === category : !category
        return (
            <li key={c ? c.id : 'all'}>
                <Link
                    to={page}
                    q={c ? { category: c.id } : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                        'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40',
                        active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-accent',
                    )}
                >
                    <span className="truncate">{c ? c.label : 'All articles'}</span>
                    {c ? <span className="text-xs text-muted-foreground tabular-nums">{c.count}</span> : null}
                </Link>
            </li>
        )
    }
    return (
        <div className="flex min-w-0 flex-col gap-5">
            <SearchBox
                size="lg"
                sources={['knowledge']}
                limit={6}
                targets={{ kbPage: page }}
                placeholder="Search knowledge articles"
                resultsPage={results}
                onSubmit={(t) => navigate(results, { q: { term: t, source: 'knowledge' } })}
                shortcut={false}
                aria-label="Search knowledge"
            />
            <div className="grid min-w-0 grid-cols-[15rem_minmax(0,1fr)] items-start gap-6 max-md:grid-cols-1">
                <nav aria-label="Topics" className="flex flex-col gap-2 max-md:hidden">
                    <h2 className="m-0 px-2.5 text-xs font-medium text-muted-foreground">Topics</h2>
                    {cats.isLoading ? (
                        <div className="flex flex-col gap-2 px-2.5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-3/4" />
                            ))}
                        </div>
                    ) : (
                        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                            {catLink(null)}
                            {list.map((c) => catLink(c))}
                        </ul>
                    )}
                </nav>
                <section className="flex min-w-0 flex-col gap-2" aria-labelledby="rp-kb-list-h">
                    <div className="flex items-baseline justify-between gap-3 px-1">
                        <h2 id="rp-kb-list-h" className="m-0 text-base font-semibold tracking-tight">
                            {current ? current.label : 'Most viewed articles'}
                        </h2>
                        {total ? <span className="text-xs text-muted-foreground tabular-nums">{total.toLocaleString()} articles</span> : null}
                    </div>
                    {list.length ? (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden">
                            {[null as KbCategory | null].concat(list).map((c) => (
                                <Link
                                    key={c ? c.id : 'all'}
                                    to={page}
                                    q={c ? { category: c.id } : undefined}
                                    className={cx(
                                        'inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-xs font-medium no-underline',
                                        (c ? c.id === category : !category) ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-foreground',
                                    )}
                                >
                                    {c ? c.label : 'All'}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                    <Card className="gap-0 p-1.5">
                        {articles.isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-start gap-3 px-2 py-2" aria-hidden>
                                    <Skeleton className="size-8 rounded-lg" />
                                    <div className="flex flex-1 flex-col gap-1.5">
                                        <Skeleton className="h-3.5 w-3/5" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            ))
                        ) : hits.length ? (
                            hits.map((h) => <ArticleRow key={h.id} hit={h} />)
                        ) : (
                            <Empty className="py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Icon name="book-open" />
                                    </EmptyMedia>
                                    <EmptyTitle>No articles here yet</EmptyTitle>
                                    <EmptyDescription>Try another topic, or search all knowledge.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </Card>
                </section>
            </div>
        </div>
    )
}

/**
 * Knowledge: the portal's knowledge page. With a sys_id URL param it shows that article (rendered
 * through components:rich-text, sanitised) with its breadcrumb, metadata and "More in <topic>";
 * without one it browses: knowledge search, topics with article counts (q category=<sys_id>) and
 * the most viewed articles. Reads as the user (kb_knowledge ACLs, KB user criteria). Hook:
 * useKbArticle(sysId).
 */
export default function Knowledge({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {}
    const page = String(loc.page || 'kb')
    const sysId = String(loc.sysId || '')
    const qp = (loc.qParams || {}) as Record<string, string>
    const category = /^[0-9a-f]{32}$/.test(String(qp.category || '')) ? String(qp.category) : ''
    return sysId ? <ArticleView sysId={sysId} page={page} options={options} /> : <Browse page={page} category={category} options={options} />
}
