import { useState } from 'react'
import { Link } from '@portal/runtime'
import { Card } from 'components:card'
import { Icon } from 'components:icon'
import { Tabs, TabsList, TabsTrigger } from 'components:tabs'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from 'components:empty'
import { useKbArticles, useKbCategories, kbLinks } from 'utilities:app/knowledge'
import type { KbArticleSummary, KbCategoryNode, KbSort } from 'utilities:app/knowledge'
import { KbArticleList, KbArticleListSkeleton } from 'components:app/kb-article-list'

export type KbMode = 'popular' | 'recent' | 'featured'

type Options = {
    title?: string
    /** Tabs, in order: popular, recent, featured (default popular + recent). */
    modes?: KbMode[]
    limit?: number
    /** Restrict to one knowledge base (sys_id). */
    knowledgeBase?: string
    /** Knowledge home ("Browse all"). */
    kbPage?: string
    articlePage?: string
    categoryPage?: string
    showCategories?: boolean
    categoriesLimit?: number
    /** One-line titles (truncated) instead of up to two lines. */
    compact?: boolean
}

const MODE_LABEL: Record<KbMode, string> = { popular: 'Popular', recent: 'Latest', featured: 'Featured' }
const MODE_SORT: Record<KbMode, KbSort> = { popular: 'views', recent: 'updated', featured: 'views' }

/** The busiest categories (any depth) across the readable KBs, for "Browse by topic". */
export function topCategories(tree: { byId: Record<string, KbCategoryNode>; countsKnown?: boolean } | undefined, limit = 8): KbCategoryNode[] {
    // Without counts (the Aggregate API refuses some roleless users) there's no "busiest": hide the chips.
    if (!tree || tree.countsKnown === false) return []
    return Object.keys(tree.byId)
        .map((id) => tree.byId[id])
        .filter((c) => c.depth === 0 && c.count > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, limit)
}

/**
 * Knowledge Articles: a home-page card of popular / latest / featured articles plus "Browse by topic"
 * category chips, opening the KB pages (app/kb-article, app/kb-category). Data from
 * utilities:app/knowledge (readable KBs only, published and unexpired); rows from app/kb-article-list.
 */
export default function KbArticles({ options = {} }: { options?: Options }) {
    const modes = (Array.isArray(options.modes) && options.modes.length ? options.modes : (['popular', 'recent'] as KbMode[])).filter((m) => !!MODE_LABEL[m])
    const [mode, setMode] = useState<KbMode>(modes[0] || 'popular')
    const limit = Math.max(1, Math.min(12, options.limit || 6))
    const links = kbLinks({ home: options.kbPage, article: options.articlePage, category: options.categoryPage })
    const ids = options.knowledgeBase ? [options.knowledgeBase] : undefined
    const list = useKbArticles({ sort: MODE_SORT[mode], featured: mode === 'featured', limit, knowledgeBases: ids })
    const cats = useKbCategories({ ids })
    const top = topCategories(cats.tree, options.categoriesLimit || 8)
    const articles: KbArticleSummary[] = list.articles
    const showCats = options.showCategories !== false

    return (
        <Card className="h-full gap-0 py-0" data-rp-kb-articles="">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
                <h2 className="m-0 text-base font-semibold tracking-tight">{options.title || 'Knowledge'}</h2>
                <Link {...links.home()} className="flex items-center gap-1 text-xs font-medium text-primary no-underline hover:underline">
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
            <div className="flex flex-1 flex-col p-2" role="tabpanel" aria-label={MODE_LABEL[mode]}>
                {list.isLoading ? (
                    <KbArticleListSkeleton rows={4} variant="compact" />
                ) : list.error ? (
                    <p className="m-0 px-2 py-3 text-sm text-destructive">Couldn't load articles: {String(list.error.message || list.error)}</p>
                ) : articles.length ? (
                    <KbArticleList articles={articles} link={(a) => links.article(a.id)} variant="compact" />
                ) : (
                    <Empty className="py-6">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon name="book-open" />
                            </EmptyMedia>
                            <EmptyTitle>{mode === 'featured' ? 'No featured articles' : 'No articles yet'}</EmptyTitle>
                            <EmptyDescription>Published articles you can read will show up here.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
            {showCats && top.length ? (
                <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">Browse by topic</span>
                    <div className="flex flex-wrap gap-1.5">
                        {top.map((c) => (
                            <Link
                                key={c.id}
                                {...links.category(c.kb, c.id)}
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
