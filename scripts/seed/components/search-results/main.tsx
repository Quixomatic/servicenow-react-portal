import { usePortalLocation, useNavigate, Link } from '@portal/runtime'
import { Card } from 'components:card'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { Tabs, TabsList, TabsTrigger } from 'components:tabs'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from 'components:empty'
import { cx } from 'components:app/field'
import { SearchBox, SearchHitRow } from 'components:app/search-box'
import { useSearch, useSearchSource, normalizeSources, hitLinkProps, SEARCH_SOURCES } from 'utilities:app/search'
import type { SearchHit, SearchSourceId, SearchTargets } from 'utilities:app/search'

type Options = {
    /** This page's route (tab and term links stay on it). */
    resultsPage?: string
    sources?: string[] | string
    catalogPage?: string
    kbPage?: string
    recordPage?: string
    /** Results per page in a source tab ("Load more" adds as many). */
    pageSize?: number
    /** Hits per source on the "All" tab. */
    perSource?: number
    suggestions?: string[]
}

function HitLink({ hit, term }: { hit: SearchHit; term: string }) {
    const cls = 'flex min-w-0 items-center gap-3 px-4 py-3 no-underline outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-inset'
    if (hit.link.href) {
        return (
            <a href={hit.link.href} target="_blank" rel="noopener noreferrer" className={cls}>
                <SearchHitRow hit={hit} term={term} />
            </a>
        )
    }
    return (
        <Link {...hitLinkProps(hit.link)} className={cls}>
            <SearchHitRow hit={hit} term={term} />
            <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground/60" />
        </Link>
    )
}

function RowsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="divide-y divide-border" aria-hidden>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-2/5" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    )
}

function SourceTab({ source, term, pageSize, targets }: { source: SearchSourceId; term: string; pageSize: number; targets: SearchTargets }) {
    const q = useSearchSource(source, term, { pageSize, targets }) as any
    const pages = (q.data && q.data.pages) || []
    const hits: SearchHit[] = pages.reduce((acc: SearchHit[], p: any) => acc.concat(p.hits), [])
    const total = pages.length ? pages[pages.length - 1].total : 0
    if (q.isLoading) return <Card className="gap-0 py-0"><RowsSkeleton rows={5} /></Card>
    if (q.error) return <p className="text-sm text-destructive">Couldn't search {SEARCH_SOURCES[source].label.toLowerCase()}: {String(q.error.message || q.error)}</p>
    if (!hits.length) return <NoResults term={term} label={SEARCH_SOURCES[source].label} />
    return (
        <div className="flex flex-col gap-3">
            <Card className="gap-0 py-0">
                <div className="divide-y divide-border">
                    {hits.map((h) => (
                        <HitLink key={h.source + h.id} hit={h} term={term} />
                    ))}
                </div>
            </Card>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    Showing {hits.length.toLocaleString()} of {Math.max(total, hits.length).toLocaleString()}
                </span>
                {q.hasNextPage ? (
                    <Button variant="outline" size="sm" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                        {q.isFetchingNextPage ? <Icon name="loader-circle" className="animate-spin" /> : null}
                        Load more
                    </Button>
                ) : null}
            </div>
        </div>
    )
}

function NoResults({ term, label }: { term: string; label?: string }) {
    return (
        <Card className="py-0">
            <Empty className="py-12">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Icon name="search-x" />
                    </EmptyMedia>
                    <EmptyTitle>No {label ? label.toLowerCase() : 'results'} for “{term}”</EmptyTitle>
                    <EmptyDescription>Check the spelling, try fewer or more general words, or browse instead.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row justify-center">
                    <Button variant="outline" size="sm" render={<Link to="catalog" />}>
                        <Icon name="store" />
                        Browse the catalog
                    </Button>
                    <Button variant="outline" size="sm" render={<Link to="kb" />}>
                        <Icon name="book-open" />
                        Knowledge
                    </Button>
                </EmptyContent>
            </Empty>
        </Card>
    )
}

/**
 * Search Results: the portal search page. Reads the term (and the active tab) from the page's q
 * (term=…&source=…), shows a search box, one tab per source with its total, an "All" tab with the
 * top hits of each source, and paged results ("Load more") per source. Uses utilities:app/search,
 * so the results are the platform's own search (catalog search API, text index), as the user.
 */
export default function SearchResults({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {}
    const navigate = useNavigate()
    const qp = (loc.qParams || {}) as Record<string, string>
    const term = String(qp.term || '').trim()
    const sources = normalizeSources(options.sources)
    const tab = sources.indexOf(qp.source as SearchSourceId) >= 0 ? (qp.source as SearchSourceId) : 'all'
    const page = options.resultsPage || String(loc.page || 'search')
    const targets: SearchTargets = { catalogPage: options.catalogPage || 'catalog', kbPage: options.kbPage || 'kb', recordPage: options.recordPage || 'form' }
    const all = useSearch(term, { sources, limit: options.perSource || 4, targets })
    const go = (t: string, source?: string) => navigate(page, { q: source && source !== 'all' ? { term: t, source } : { term: t } })
    const totalAll = all.groups.reduce((n, g) => n + g.total, 0)
    const withHits = all.groups.filter((g) => g.hits.length)

    return (
        <div className="flex min-w-0 flex-col gap-5" data-rp-search-results="">
            <SearchBox size="lg" defaultValue={term} sources={sources} targets={targets} resultsPage={page} onSubmit={(t) => go(t, tab)} shortcut={false} suggestions={options.suggestions} aria-label="Search the portal" />

            {!term ? (
                <Card className="py-0">
                    <Empty className="py-14">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon name="search" />
                            </EmptyMedia>
                            <EmptyTitle>Search the portal</EmptyTitle>
                            <EmptyDescription>Find catalog items, knowledge articles, your requests and incidents, and portal pages.</EmptyDescription>
                        </EmptyHeader>
                        {options.suggestions && options.suggestions.length ? (
                            <EmptyContent className="flex-row flex-wrap justify-center gap-2">
                                {options.suggestions.map((s) => (
                                    <Button key={s} variant="outline" size="sm" className="rounded-full" onClick={() => go(s)}>
                                        {s}
                                    </Button>
                                ))}
                            </EmptyContent>
                        ) : null}
                    </Empty>
                </Card>
            ) : (
                <>
                    <Tabs value={tab} onValueChange={(v: string) => go(term, v)}>
                        <div className="-mx-1 overflow-x-auto px-1 pb-1">
                            <TabsList variant="line" className="h-9 border-b-0">
                                <TabsTrigger value="all" className="px-3">
                                    All
                                    <Count n={totalAll} loading={!all.ready} />
                                </TabsTrigger>
                                {all.groups.map((g) => (
                                    <TabsTrigger key={g.id} value={g.id} className="px-3">
                                        <Icon name={g.icon} className="size-4" />
                                        {g.label}
                                        <Count n={g.total} loading={g.isLoading} />
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </Tabs>

                    {tab === 'all' ? (
                        !all.ready && !withHits.length ? (
                            <Card className="gap-0 py-0"><RowsSkeleton rows={5} /></Card>
                        ) : !withHits.length ? (
                            <NoResults term={term} />
                        ) : (
                            <div className="flex flex-col gap-5">
                                {withHits.map((g) => (
                                    <section key={g.id} aria-labelledby={`rp-sr-${g.id}`} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <h2 id={`rp-sr-${g.id}`} className="m-0 flex items-center gap-2 text-sm font-semibold">
                                                <Icon name={g.icon} className="size-4 text-muted-foreground" />
                                                {g.label}
                                                <span className="font-normal text-muted-foreground tabular-nums">{g.total.toLocaleString()}</span>
                                            </h2>
                                            {g.total > g.hits.length ? (
                                                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => go(term, g.id)}>
                                                    See all
                                                    <Icon name="arrow-right" />
                                                </Button>
                                            ) : null}
                                        </div>
                                        <Card className="gap-0 py-0">
                                            <div className="divide-y divide-border">
                                                {g.hits.map((h) => (
                                                    <HitLink key={h.source + h.id} hit={h} term={term} />
                                                ))}
                                            </div>
                                        </Card>
                                    </section>
                                ))}
                            </div>
                        )
                    ) : (
                        <SourceTab key={tab + '|' + term} source={tab} term={term} pageSize={options.pageSize || 10} targets={targets} />
                    )}
                </>
            )}
        </div>
    )
}

function Count({ n, loading }: { n: number; loading?: boolean }) {
    if (loading) return <Skeleton className="h-4 w-5 rounded-full" />
    return <span className={cx('rounded-full px-1.5 text-[11px] leading-4 font-medium tabular-nums', n ? 'bg-muted text-foreground' : 'text-muted-foreground')}>{n.toLocaleString()}</span>
}
