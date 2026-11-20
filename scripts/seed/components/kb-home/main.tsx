import { useEffect } from 'react'
import { usePortalLocation, useNavigate, Link } from '@portal/runtime'
import { Card } from 'components:card'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { Button } from 'components:button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from 'components:empty'
import { cx } from 'components:app/field'
import { SearchBox } from 'components:app/search-box'
import { useKnowledgeBases, useKbCategories, useKbArticles, kbLinks, safeId } from 'utilities:app/knowledge'
import type { KnowledgeBase, KbArticleSummary, KbCategoryNode } from 'utilities:app/knowledge'
import { KbArticleList, KbArticleListSkeleton } from 'components:app/kb-article-list'
import { KbCategoryTree } from 'components:app/kb-category-tree'

type Options = {
    /** Restrict to these knowledge bases (sys_ids); empty = every KB the user can read. */
    knowledgeBases?: string[] | string
    showSearch?: boolean
    searchPlaceholder?: string
    suggestions?: string[]
    showBases?: boolean
    showFeatured?: boolean
    showPopular?: boolean
    showRecent?: boolean
    showCategories?: boolean
    /** Articles per list. */
    limit?: number
    articlePage?: string
    categoryPage?: string
    searchPage?: string
    /** The portal search page (the no-access state links to it). */
    portalSearchPage?: string
}

const KB_TINTS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']
const TINT_CLS: Record<string, string> = {
    'chart-1': 'bg-chart-1/12 text-chart-1 ring-chart-1/20',
    'chart-2': 'bg-chart-2/12 text-chart-2 ring-chart-2/20',
    'chart-3': 'bg-chart-3/12 text-chart-3 ring-chart-3/20',
    'chart-4': 'bg-chart-4/12 text-chart-4 ring-chart-4/20',
    'chart-5': 'bg-chart-5/12 text-chart-5 ring-chart-5/20',
}

/** A knowledge base's tile icon: its picture, else a tinted book. */
export function KbIcon({ kb, index = 0, size = 'md' }: { kb: KnowledgeBase; index?: number; size?: 'sm' | 'md' }) {
    const box = size === 'sm' ? 'size-8 rounded-lg' : 'size-11 rounded-xl'
    if (kb.icon) return <img src={kb.icon} alt="" className={cx(box, 'shrink-0 bg-muted object-cover ring-1 ring-border')} />
    return (
        <span className={cx(box, 'flex shrink-0 items-center justify-center ring-1 ring-inset', TINT_CLS[KB_TINTS[index % KB_TINTS.length]])}>
            <Icon name="library" className={size === 'sm' ? 'size-4' : 'size-5'} />
        </span>
    )
}

function BaseCard({ kb, index, categories, links, wide, counts = true }: { kb: KnowledgeBase; index: number; categories: KbCategoryNode[]; links: ReturnType<typeof kbLinks>; wide?: boolean; counts?: boolean }) {
    const top = (counts ? categories.filter((c) => c.count > 0).sort((a, b) => b.count - a.count) : categories).slice(0, wide ? 8 : 4)
    return (
        <Card className={cx('group/kb relative h-full gap-0 py-0 transition-shadow hover:shadow-md', wide ? 'rp-kbh-wide' : '')} data-rp-kb-base={kb.id}>
            <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-4">
                <div className="flex items-start gap-3.5">
                    <KbIcon kb={kb} index={index} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <h3 className="m-0 text-base leading-snug font-semibold tracking-tight">
                            <Link {...links.kb(kb.id)} className="text-foreground no-underline outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/40 group-hover/kb:text-primary">
                                {kb.title}
                            </Link>
                        </h3>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {kb.count.toLocaleString()} {kb.count === 1 ? 'article' : 'articles'}
                        </span>
                    </div>
                </div>
                {kb.description ? <p className="m-0 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{kb.description}</p> : null}
            </div>
            {top.length ? (
                <div className="rp-kbh-chips relative z-10 flex flex-wrap content-center gap-1.5 border-t border-border px-5 py-3">
                    {top.map((c) => (
                        <Link
                            key={c.id}
                            {...links.category(kb.id, c.id)}
                            className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-foreground no-underline outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40"
                        >
                            <span className="truncate">{c.label}</span>
                            {counts ? <span className="text-muted-foreground tabular-nums">{c.count}</span> : null}
                        </Link>
                    ))}
                </div>
            ) : null}
        </Card>
    )
}

function ListCard({ title, icon, articles, loading, link, more, empty }: { title: string; icon: string; articles: KbArticleSummary[]; loading: boolean; link: (a: KbArticleSummary) => any; more?: any; empty: string }) {
    return (
        <Card className="h-full gap-0 py-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="m-0 flex items-center gap-2 text-sm font-semibold">
                    <Icon name={icon} className="size-4 text-muted-foreground" aria-hidden />
                    {title}
                </h2>
                {more}
            </div>
            <div className="flex-1 p-1.5">
                {loading ? (
                    <KbArticleListSkeleton rows={5} variant="compact" />
                ) : articles.length ? (
                    <KbArticleList articles={articles} link={link} variant="compact" />
                ) : (
                    <p className="m-0 px-2.5 py-3 text-sm text-muted-foreground">{empty}</p>
                )}
            </div>
        </Card>
    )
}

function FeaturedCard({ a, link }: { a: KbArticleSummary; link: any }) {
    return (
        <Link
            {...link}
            className="group/f flex h-full min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 no-underline shadow-xs outline-none transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="star" className="size-3.5 text-amber-500" aria-hidden />
                <span className="truncate">{[a.kb, a.category].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="line-clamp-2 text-[15px] leading-snug font-semibold text-foreground group-hover/f:text-primary">{a.title}</span>
            {a.snippet ? <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{a.snippet}</span> : null}
        </Link>
    )
}

/**
 * Knowledge Home: the knowledge base home. A knowledge search (typeahead over articles; Enter opens
 * the KB search page), the knowledge bases the user can read as cards (article counts, top
 * categories), featured articles (the KM portal's rule: meta keyword glide.knowman.default_keyword),
 * most viewed and recently updated, and each KB's category tree with counts. Old links to this page
 * with a sys_id or q category open the article / category page. Built on utilities:app/knowledge.
 */
export default function KbHome({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {}
    const navigate = useNavigate()
    const qp = (loc.qParams || {}) as Record<string, string>
    const links = kbLinks({ home: String(loc.page || 'kb'), article: options.articlePage, category: options.categoryPage, search: options.searchPage })
    // Links from before the KB pages split (kb + sys_id, kb + q category) still land right.
    const legacyArticle = safeId(loc.sysId)
    const legacyCategory = safeId(qp.category)
    useEffect(() => {
        if (legacyArticle) navigate(links.pages.article, { sysId: legacyArticle })
        else if (legacyCategory) navigate(links.pages.category, { q: { category: legacyCategory } })
    }, [legacyArticle, legacyCategory])

    const kbs = useKnowledgeBases({ ids: options.knowledgeBases })
    const cats = useKbCategories({ ids: options.knowledgeBases })
    const limit = Math.max(3, Math.min(12, options.limit || 6))
    const featured = useKbArticles({ featured: true, limit: 6, knowledgeBases: options.knowledgeBases, withText: true, enabled: options.showFeatured !== false })
    const popular = useKbArticles({ sort: 'views', limit, knowledgeBases: options.knowledgeBases, enabled: options.showPopular !== false })
    const recent = useKbArticles({ sort: 'updated', limit, knowledgeBases: options.knowledgeBases, enabled: options.showRecent !== false })
    const articleLink = (a: KbArticleSummary) => links.article(a.id)
    const bases: KnowledgeBase[] = kbs.data
    const total = bases.reduce((n, k) => n + k.count, 0)

    if (kbs.ready && !bases.length) {
        return (
            <Card className="py-0">
                <Empty className="py-16">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Icon name="library" />
                        </EmptyMedia>
                        <EmptyTitle>No articles are available to you</EmptyTitle>
                        <EmptyDescription>None of the knowledge bases you can read has published articles yet. Search the portal, or ask the service desk.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row flex-wrap justify-center gap-2">
                        <Button variant="outline" size="sm" render={<Link to={options.portalSearchPage || 'search'} />}>
                            <Icon name="search" />
                            Search the portal
                        </Button>
                        <Button variant="ghost" size="sm" render={<Link to="" />}>
                            <Icon name="house" />
                            Home
                        </Button>
                    </EmptyContent>
                </Empty>
            </Card>
        )
    }

    return (
        <div className="rp-kbh flex min-w-0 flex-col gap-8" data-rp-kb-home="" style={{ ['--rp-kbh-cols' as any]: Math.min(3, Math.max(1, bases.length || 3)) }}>
            {options.showSearch !== false ? (
                <section aria-label="Search knowledge" className="flex flex-col gap-2">
                    <SearchBox
                        size="lg"
                        sources={['knowledge']}
                        limit={6}
                        targets={{ kbPage: links.pages.article, kbSearchPage: links.pages.search } as any}
                        placeholder={options.searchPlaceholder || 'Search knowledge articles'}
                        onSubmit={(t) => navigate(links.pages.search, { q: { term: t } })}
                        suggestions={options.suggestions}
                        shortcut
                        aria-label="Search knowledge"
                    />
                    <p className="m-0 px-1 text-xs text-muted-foreground">
                        {kbs.ready ? `${total.toLocaleString()} articles in ${bases.length} knowledge ${bases.length === 1 ? 'base' : 'bases'}` : ' '}
                    </p>
                </section>
            ) : null}

            {options.showBases !== false ? (
                <section aria-labelledby="rp-kbh-bases" className="flex flex-col gap-3">
                    <h2 id="rp-kbh-bases" className="m-0 text-lg font-semibold tracking-tight">
                        Knowledge bases
                    </h2>
                    <ul className="rp-kbh-bases m-0 list-none p-0">
                        {!kbs.ready
                            ? Array.from({ length: 3 }).map((_, i) => (
                                  <li key={i}>
                                      <Card className="gap-3 px-5 py-5">
                                          <div className="flex items-center gap-3">
                                              <Skeleton className="size-11 rounded-xl" />
                                              <div className="flex flex-1 flex-col gap-1.5">
                                                  <Skeleton className="h-4 w-1/2" />
                                                  <Skeleton className="h-3 w-1/4" />
                                              </div>
                                          </div>
                                          <Skeleton className="h-3.5 w-full" />
                                      </Card>
                                  </li>
                              ))
                            : bases.map((kb, i) => (
                                  <li key={kb.id} className="min-w-0">
                                      <BaseCard kb={kb} index={i} categories={(cats.tree && cats.tree.byKb[kb.id]) || []} links={links} wide={bases.length === 1} counts={!cats.tree || cats.tree.countsKnown} />
                                  </li>
                              ))}
                    </ul>
                </section>
            ) : null}

            {options.showFeatured !== false && featured.articles.length ? (
                <section aria-labelledby="rp-kbh-feat" className="flex flex-col gap-3">
                    <h2 id="rp-kbh-feat" className="m-0 text-lg font-semibold tracking-tight">
                        Featured
                    </h2>
                    <ul className="rp-kbh-feat m-0 list-none p-0" style={{ ['--rp-kbh-feat-cols' as any]: featured.articles.length === 4 ? 4 : 3 }}>
                        {featured.articles.map((a: KbArticleSummary) => (
                            <li key={a.id} className="min-w-0">
                                <FeaturedCard a={a} link={articleLink(a)} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <div className="rp-kbh-lists">
                {options.showPopular !== false ? (
                    <ListCard
                        title="Most viewed"
                        icon="trending-up"
                        articles={popular.articles}
                        loading={popular.isLoading}
                        link={articleLink}
                        empty="No articles yet."
                        more={
                            <Link {...links.search({ sort: 'views' })} className="text-xs font-medium text-primary no-underline hover:underline">
                                See all
                            </Link>
                        }
                    />
                ) : null}
                {options.showRecent !== false ? (
                    <ListCard
                        title="Recently updated"
                        icon="history"
                        articles={recent.articles}
                        loading={recent.isLoading}
                        link={articleLink}
                        empty="No articles yet."
                        more={
                            <Link {...links.search({ sort: 'updated' })} className="text-xs font-medium text-primary no-underline hover:underline">
                                See all
                            </Link>
                        }
                    />
                ) : null}
                {options.showCategories !== false ? (
                    <Card className="rp-kbh-cats h-full gap-0 py-0">
                        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                            <Icon name="folder-tree" className="size-4 text-muted-foreground" aria-hidden />
                            <h2 className="m-0 text-sm font-semibold">Browse by category</h2>
                        </div>
                        <div className="flex flex-col gap-4 p-2">
                            {!cats.tree
                                ? <KbCategoryTree tree={undefined} kb="" link={() => ({})} loading />
                                : bases.map((kb) => (
                                      <div key={kb.id} className="flex min-w-0 flex-col gap-1">
                                          {bases.length > 1 ? <p className="m-0 px-2 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{kb.title}</p> : null}
                                          <KbCategoryTree tree={cats.tree} kb={kb.id} link={(c) => links.category(kb.id, c.id)} maxDepth={2} aria-label={kb.title + ' categories'} />
                                      </div>
                                  ))}
                        </div>
                    </Card>
                ) : null}
            </div>
        </div>
    )
}
