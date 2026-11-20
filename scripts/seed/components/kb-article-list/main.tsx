import { Link } from '@portal/runtime'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { cx } from 'components:app/field'
import { Highlight } from 'utilities:app/search'
import { formatKbDate, KB_SORTS } from 'utilities:app/knowledge'
import type { KbArticleSummary, KbSort } from 'utilities:app/knowledge'

/**
 * components:app/kb-article-list: knowledge article lists.
 *
 *   <KbArticleList articles link={(a) => links.article(a.id)} term variant="rows" | "compact" />
 *   <KbArticleRow article link term variant showKb showCategory />
 *   <KbPager page pages link={(n) => …} />            numbered paging (links, so Back works)
 *   <KbSortSelect value onChange sorts />              native select over KB_SORTS
 *   <KbArticleListSkeleton rows variant />
 *
 * rows: icon tile, title (search terms highlighted), excerpt, KB · category · views · updated.
 * compact: title + one meta line, for side panels.
 */
export type KbArticleRowProps = {
    article: KbArticleSummary
    link: (a: KbArticleSummary) => any
    term?: string
    variant?: 'rows' | 'compact'
    showKb?: boolean
    showCategory?: boolean
    showViews?: boolean
    showSnippet?: boolean
}

export function KbArticleRow({ article: a, link, term = '', variant = 'rows', showKb = true, showCategory = true, showViews = true, showSnippet = true }: KbArticleRowProps) {
    const compact = variant === 'compact'
    const updated = formatKbDate(a.updatedValue, { relative: true })
    const meta: any[] = []
    if (showKb && a.kb && !compact) meta.push(<span key="kb">{a.kb}</span>)
    if (showCategory && a.category) meta.push(<span key="cat" className="truncate">{a.category}</span>)
    if (showViews && a.views) meta.push(<span key="v" className="tabular-nums">{a.views.toLocaleString()} {a.views === 1 ? 'view' : 'views'}</span>)
    if (updated && !compact) meta.push(<span key="u">Updated {updated}</span>)
    return (
        <Link
            {...link(a)}
            className={cx(
                'group/kbrow flex min-w-0 items-start no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-inset',
                compact ? 'gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/60' : 'gap-3.5 px-4 py-3.5 hover:bg-accent/40 max-sm:px-3!',
            )}
        >
            <span className={cx('flex shrink-0 items-center justify-center rounded-lg bg-chart-1/12 text-chart-1 ring-1 ring-chart-1/20 ring-inset', compact ? 'mt-0.5 size-7' : 'mt-0.5 size-9')}>
                <Icon name="file-text" className={compact ? 'size-3.5' : 'size-4'} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cx('font-medium text-foreground group-hover/kbrow:text-primary', compact ? 'line-clamp-2 text-sm leading-snug' : 'text-[15px] leading-snug')}>
                    <Highlight text={a.title} term={term} />
                </span>
                {showSnippet && !compact && a.snippet ? (
                    <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                        <Highlight text={a.snippet} term={term} />
                    </span>
                ) : null}
                {meta.length ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {meta.map((m, i) => (
                            <span key={i} className="flex min-w-0 items-center gap-2">
                                {i ? <span aria-hidden className="text-muted-foreground/50">·</span> : null}
                                {m}
                            </span>
                        ))}
                    </span>
                ) : null}
            </span>
            {!compact ? <span className="mt-1 shrink-0 font-mono text-[11px] text-muted-foreground/70 max-sm:hidden!">{a.number}</span> : null}
        </Link>
    )
}

export function KbArticleList({ articles, className, ...row }: Omit<KbArticleRowProps, 'article'> & { articles: KbArticleSummary[]; className?: string }) {
    const compact = row.variant === 'compact'
    return (
        <ul className={cx('m-0 flex list-none flex-col p-0', compact ? 'gap-0.5' : 'divide-y divide-border', className)}>
            {articles.map((a) => (
                <li key={a.id} className="min-w-0">
                    <KbArticleRow article={a} {...row} />
                </li>
            ))}
        </ul>
    )
}

export function KbArticleListSkeleton({ rows = 5, variant = 'rows' }: { rows?: number; variant?: 'rows' | 'compact' }) {
    const compact = variant === 'compact'
    return (
        <div className={compact ? 'flex flex-col gap-0.5' : 'divide-y divide-border'} aria-hidden>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className={cx('flex items-start', compact ? 'gap-2.5 px-2 py-2' : 'gap-3.5 px-4 py-3.5')}>
                    <Skeleton className={compact ? 'size-7 rounded-lg' : 'size-9 rounded-lg'} />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className={cx('h-4', i % 2 ? 'w-1/2' : 'w-3/5')} />
                        {!compact ? <Skeleton className="h-3 w-11/12" /> : null}
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    )
}

/** Page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20. */
export function pageWindow(page: number, pages: number): (number | '…')[] {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const out: (number | '…')[] = [1]
    const from = Math.max(2, page - 1)
    const to = Math.min(pages - 1, page + 1)
    if (from > 2) out.push('…')
    for (let i = from; i <= to; i++) out.push(i)
    if (to < pages - 1) out.push('…')
    out.push(pages)
    return out
}

const pagerBtn =
    'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-sm no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40'

export function KbPager({ page, pages, link, className, label = 'Pages' }: { page: number; pages: number; link: (n: number) => any; className?: string; label?: string }) {
    if (pages <= 1) return null
    const nav = (n: number, children: any, aria: string, disabled: boolean) =>
        disabled ? (
            <span className={cx(pagerBtn, 'text-muted-foreground/50')} aria-disabled="true">
                {children}
            </span>
        ) : (
            <Link {...link(n)} aria-label={aria} className={cx(pagerBtn, 'text-foreground hover:bg-accent')}>
                {children}
            </Link>
        )
    return (
        <nav aria-label={label} className={cx('flex items-center justify-center gap-1', className)}>
            {nav(page - 1, <><Icon name="chevron-left" className="size-4" /><span className="max-sm:sr-only!">Previous</span></>, 'Previous page', page <= 1)}
            <span className="flex items-center gap-1 max-sm:hidden!">
                {pageWindow(page, pages).map((n, i) =>
                    n === '…' ? (
                        <span key={'e' + i} className="px-1 text-sm text-muted-foreground" aria-hidden>
                            …
                        </span>
                    ) : (
                        <Link
                            key={n}
                            {...link(n)}
                            aria-label={`Page ${n}`}
                            aria-current={n === page ? 'page' : undefined}
                            className={cx(pagerBtn, 'tabular-nums', n === page ? 'border-border bg-card font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                        >
                            {n}
                        </Link>
                    ),
                )}
            </span>
            <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden!">
                {page} / {pages}
            </span>
            {nav(page + 1, <><span className="max-sm:sr-only!">Next</span><Icon name="chevron-right" className="size-4" /></>, 'Next page', page >= pages)}
        </nav>
    )
}

export function KbSortSelect({ value, onChange, sorts = ['relevance', 'views', 'updated'], id, className }: { value: KbSort; onChange: (s: KbSort) => void; sorts?: KbSort[]; id?: string; className?: string }) {
    return (
        <span className={cx('relative inline-flex items-center', className)}>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value as KbSort)}
                aria-label="Sort by"
                className="h-8 appearance-none rounded-lg border border-input bg-background py-0 pr-8 pl-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            >
                {sorts.filter((s) => KB_SORTS[s]).map((s) => (
                    <option key={s} value={s}>
                        {KB_SORTS[s].label}
                    </option>
                ))}
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute right-2 size-4 text-muted-foreground" aria-hidden />
        </span>
    )
}

export default function KbArticleListPreview() {
    return <KbArticleListSkeleton rows={3} />
}
