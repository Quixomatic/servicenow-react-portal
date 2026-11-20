import { useEffect, useState } from 'react'
import { usePortalLocation, useNavigate, Link } from '@portal/runtime'
import { Button } from 'components:button'
import { Card } from 'components:card'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from 'components:empty'
import { cx } from 'components:app/field'
import { useKbSearch, useKnowledgeBases, kbLinks, safeId } from 'utilities:app/knowledge'
import type { KbFacetValue, KbSort, KbArticleSummary } from 'utilities:app/knowledge'
import { KbBreadcrumb } from 'components:app/kb-article-view'
import { KbArticleList, KbArticleListSkeleton, KbPager, KbSortSelect } from 'components:app/kb-article-list'

type Options = {
    knowledgeBases?: string[] | string
    pageSize?: number
    /** Category values shown before "Show more". */
    categoryLimit?: number
    homePage?: string
    articlePage?: string
    categoryPage?: string
    suggestions?: string[]
}

const SORTS: KbSort[] = ['relevance', 'views', 'updated']

type State = { term: string; kb: string; category: string; type: string; sort: KbSort; page: number }

function FacetGroup({ title, values, selected, link, limit = 0, loading }: { title: string; values: KbFacetValue[]; selected: string; link: (v: string) => any; limit?: number; loading?: boolean }) {
    const [all, setAll] = useState(false)
    if (!loading && !values.length) return null
    const shown = limit && !all ? values.slice(0, limit) : values
    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="mb-1.5 p-0 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
            {loading && !values.length ? (
                <div className="flex flex-col gap-2 px-2 py-1" aria-hidden>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ) : (
                <ul className="m-0 flex list-none flex-col gap-px p-0">
                    {shown.map((v) => {
                        const on = v.value === selected
                        return (
                            <li key={v.value} className="min-w-0">
                                <Link
                                    {...link(on ? '' : v.value)}
                                    role="checkbox"
                                    aria-checked={on}
                                    className={cx(
                                        'flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-sm no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40',
                                        on ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-accent',
                                    )}
                                >
                                    <span className={cx('flex size-4 shrink-0 items-center justify-center rounded-[4px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background')} aria-hidden>
                                        {on ? <Icon name="check" className="size-3" /> : null}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{v.label}</span>
                                    <span className={cx('shrink-0 text-xs tabular-nums', on ? 'text-primary/80' : 'text-muted-foreground')}>{v.count}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
            {limit && values.length > limit ? (
                <button type="button" onClick={() => setAll(!all)} className="mt-0.5 w-fit rounded-md px-2 py-1 text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40">
                    {all ? 'Show fewer' : `Show ${values.length - limit} more`}
                </button>
            ) : null}
        </fieldset>
    )
}

/**
 * Knowledge Search: KB search page (q term, kb, category, type, sort, page). The platform text index
 * (123TEXTQUERY321, relevance-ranked) as the user, only published, unexpired articles in readable
 * knowledge bases. Facets for knowledge base, category and article type with counts (each facet
 * counted without its own filter), highlighted terms in titles and excerpts, sort (relevance, most
 * viewed, recently updated) and numbered paging. Without a term it lists every article. Built on
 * utilities:app/knowledge (useKbSearch).
 */
export default function KbSearchPage({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {}
    const navigate = useNavigate()
    const qp = (loc.qParams || {}) as Record<string, string>
    const here = String(loc.page || 'kb/search')
    const links = kbLinks({ home: options.homePage, article: options.articlePage, category: options.categoryPage, search: here })
    const s: State = {
        term: String(qp.term || qp.q || '').trim(),
        kb: safeId(qp.kb),
        category: safeId(qp.category),
        type: /^[a-z_]+$/.test(String(qp.type || '')) ? String(qp.type) : '',
        sort: SORTS.indexOf(qp.sort as KbSort) >= 0 ? (qp.sort as KbSort) : 'relevance',
        page: Math.max(1, parseInt(qp.page || '1', 10) || 1),
    }
    const sort: KbSort = !s.term && s.sort === 'relevance' ? 'views' : s.sort
    const pageSize = Math.max(5, Math.min(50, options.pageSize || 10))
    const r = useKbSearch({ term: s.term, kb: s.kb, category: s.category, deep: false, types: s.type ? [s.type] : [], sort, page: s.page, pageSize, knowledgeBases: options.knowledgeBases })
    const kbs = useKnowledgeBases({ ids: options.knowledgeBases, includeEmpty: true })
    const [text, setText] = useState(s.term)
    const [filtersOpen, setFiltersOpen] = useState(false)
    useEffect(() => setText(s.term), [s.term])
    const link = (patch: Partial<State>) => {
        const n = { ...s, page: 1, ...patch }
        return links.search({ term: n.term, kb: n.kb, category: n.category, type: n.type, sort: n.sort === 'relevance' ? '' : n.sort, page: n.page })
    }
    const go = (patch: Partial<State>) => {
        const l = link(patch)
        navigate(l.to, { q: l.q })
    }
    const active = [s.kb, s.category, s.type].filter(Boolean).length
    const articles: KbArticleSummary[] = r.articles
    const from = (s.page - 1) * pageSize + 1
    const kbTitle = s.kb && kbs.byId[s.kb] ? kbs.byId[s.kb].title : ''

    const facets = (
        <div className="flex min-w-0 flex-col gap-5">
            <FacetGroup title="Knowledge base" values={r.facets.kb} selected={s.kb} link={(v) => link({ kb: v, category: v ? s.category : '' })} loading={r.isLoading} />
            <FacetGroup title="Category" values={r.facets.category} selected={s.category} link={(v) => link({ category: v })} limit={options.categoryLimit || 8} loading={r.isLoading} />
            {r.facets.type.length > 1 || s.type ? <FacetGroup title="Type" values={r.facets.type} selected={s.type} link={(v) => link({ type: v })} /> : null}
            {active ? (
                <Link {...link({ kb: '', category: '', type: '' })} className="w-fit rounded-md px-2 text-xs font-medium text-primary no-underline hover:underline">
                    Clear filters
                </Link>
            ) : null}
        </div>
    )

    return (
        <div className="rp-kbs flex min-w-0 flex-col gap-6" data-rp-kb-search="">
            <header className="flex min-w-0 flex-col gap-3">
                <KbBreadcrumb items={[{ label: 'Knowledge', link: links.home() }, { label: 'Search' }]} />
                <form
                    role="search"
                    className="flex min-w-0 items-center gap-2"
                    onSubmit={(e) => {
                        e.preventDefault()
                        go({ term: text.trim() })
                    }}
                >
                    <div className="relative min-w-0 flex-1">
                        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <input
                            type="search"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={kbTitle ? `Search ${kbTitle}` : 'Search knowledge articles'}
                            aria-label="Search knowledge articles"
                            className="h-12 w-full rounded-xl border border-input bg-background pr-4 pl-11 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                        />
                    </div>
                    <Button type="submit" className="h-12 rounded-xl px-5">
                        Search
                    </Button>
                </form>
            </header>

            <div className="rp-kbs-grid">
                <aside className="rp-kbs-facets min-w-0" aria-label="Filters">
                    {facets}
                </aside>
                <section className="flex min-w-0 flex-col gap-3" aria-labelledby="rp-kbs-h">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <h1 id="rp-kbs-h" className="m-0 text-base font-semibold tracking-tight" aria-live="polite">
                            {r.isLoading ? (
                                <Skeleton className="h-5 w-48" />
                            ) : s.term ? (
                                <>
                                    {r.total.toLocaleString()} {r.total === 1 ? 'result' : 'results'} for <span className="text-primary">“{s.term}”</span>
                                </>
                            ) : (
                                <>
                                    All articles <span className="font-normal text-muted-foreground tabular-nums">{r.total.toLocaleString()}</span>
                                </>
                            )}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="rp-kbs-filters">
                                <Button variant="outline" size="sm" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
                                    <Icon name="sliders-horizontal" />
                                    Filters{active ? ` (${active})` : ''}
                                </Button>
                            </span>
                            <KbSortSelect value={sort} sorts={s.term ? SORTS : SORTS.filter((x) => x !== 'relevance')} onChange={(v) => go({ sort: v })} />
                        </div>
                    </div>
                    {filtersOpen ? (
                        <div className="rp-kbs-filters">
                            <Card className="gap-0 px-2 py-3">{facets}</Card>
                        </div>
                    ) : null}
                    <Card className={cx('gap-0 py-0 transition-opacity', r.isFetching && !r.isLoading ? 'opacity-70' : '')} aria-busy={r.isFetching || undefined}>
                        {r.isLoading ? (
                            <KbArticleListSkeleton rows={6} />
                        ) : r.error ? (
                            <p className="m-0 px-4 py-6 text-sm text-destructive">Couldn't search: {String((r.error && r.error.message) || r.error)}</p>
                        ) : articles.length ? (
                            <KbArticleList articles={articles} term={s.term} link={(a) => links.article(a.id)} />
                        ) : (
                            <Empty className="py-14">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Icon name="search-x" />
                                    </EmptyMedia>
                                    <EmptyTitle>{s.term ? `No articles match “${s.term}”` : 'No articles'}</EmptyTitle>
                                    <EmptyDescription>{active ? 'Remove a filter, or try fewer or more general words.' : 'Check the spelling, or try fewer or more general words.'}</EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent className="flex-row flex-wrap justify-center gap-2">
                                    {active ? (
                                        <Button variant="outline" size="sm" render={<Link {...link({ kb: '', category: '', type: '' })} />}>
                                            Clear filters
                                        </Button>
                                    ) : null}
                                    {(options.suggestions || []).map((t) => (
                                        <Button key={t} variant="outline" size="sm" className="rounded-full" render={<Link {...link({ term: t, kb: '', category: '', type: '' })} />}>
                                            {t}
                                        </Button>
                                    ))}
                                    <Button variant="ghost" size="sm" render={<Link {...links.home()} />}>
                                        <Icon name="book-open" />
                                        Browse knowledge
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        )}
                    </Card>
                    {r.total ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {from.toLocaleString()}–{Math.min(r.total, from + articles.length - 1).toLocaleString()} of {r.total.toLocaleString()}
                            </span>
                            <KbPager page={s.page} pages={r.pages} link={(n) => link({ page: n })} />
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    )
}
