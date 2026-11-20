import { useState } from 'react'
import { Link } from '@portal/runtime'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { RichText } from 'components:rich-text'
import { Dialog, DialogContent, DialogTitle } from 'components:dialog'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from 'components:empty'
import { cx } from 'components:app/field'
import { formatKbDate, readingMinutes } from 'utilities:app/knowledge'
import type { KbArticle, KbCategoryNode, KnowledgeBase } from 'utilities:app/knowledge'

/**
 * components:app/kb-article-view: the reading view of a knowledge article, in parts.
 *
 *   <KbBreadcrumb items={[{ label, link? }]} />
 *   <KbArticleHeader article kb path links actions />     breadcrumb, title, metadata line
 *   <KbArticleBody html={prepared.html} contentRef wiki />   the body in reading typography (rp-kb-prose);
 *                                                           pass HTML from useArticleToc (sanitised + heading ids)
 *   <KbArticleMeta article minutes />                       author · published · updated · reading time · views · number
 *   <KbArticleSkeleton />, <KbArticleUnavailable homeLink />, <KbAuthorAvatar name />
 *
 * Images in the body open in a zoom dialog. Data comes from utilities:app/knowledge.
 */

export type KbCrumb = { label: string; link?: { to: string; q?: Record<string, string>; sysId?: string } }

export function KbBreadcrumb({ items, className }: { items: KbCrumb[]; className?: string }) {
    return (
        <nav aria-label="Breadcrumb" className={cx('min-w-0', className)}>
            <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-[13px] text-muted-foreground">
                {items.map((c, i) => {
                    const last = i === items.length - 1
                    return (
                        <li key={i} className="flex min-w-0 items-center gap-1.5">
                            {i ? <Icon name="chevron-right" className="size-3.5 shrink-0 opacity-60" aria-hidden /> : null}
                            {c.link && !last ? (
                                <Link {...(c.link as any)} className="truncate rounded-sm text-muted-foreground no-underline outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40">
                                    {c.label}
                                </Link>
                            ) : (
                                <span className={cx('truncate', last ? 'font-medium text-foreground' : '')} aria-current={last ? 'page' : undefined}>
                                    {c.label}
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

function initials(name: string) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
    return ((parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase() || '?'
}

export function KbAuthorAvatar({ name, className }: { name: string; className?: string }) {
    return (
        <span aria-hidden className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary ring-1 ring-primary/20 ring-inset', className)}>
            {initials(name)}
        </span>
    )
}

function Dot() {
    return (
        <span aria-hidden className="text-muted-foreground/50">
            ·
        </span>
    )
}

/** Author, dates, reading time, views, number (and version when the platform has versioning). */
export function KbArticleMeta({ article, minutes, showViews = true, className }: { article: KbArticle; minutes?: number; showViews?: boolean; className?: string }) {
    const published = formatKbDate(article.publishedValue)
    const updated = formatKbDate(article.updatedValue)
    const mins = minutes || readingMinutes(article.html)
    return (
        <div className={cx('flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted-foreground', className)}>
            {article.author ? (
                <span className="flex items-center gap-2 text-foreground">
                    <KbAuthorAvatar name={article.author} />
                    <span className="font-medium">{article.author}</span>
                </span>
            ) : null}
            {published ? (
                <>
                    {article.author ? <Dot /> : null}
                    <span>
                        Published <time dateTime={article.publishedValue}>{published}</time>
                    </span>
                </>
            ) : null}
            {updated && updated !== published ? (
                <>
                    <Dot />
                    <span title={article.updated}>
                        Updated <time dateTime={article.updatedValue}>{formatKbDate(article.updatedValue, { relative: true })}</time>
                    </span>
                </>
            ) : null}
            <Dot />
            <span className="inline-flex items-center gap-1">
                <Icon name="clock" className="size-3.5" aria-hidden />
                {mins} min read
            </span>
            {showViews && article.views ? (
                <>
                    <Dot />
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <Icon name="eye" className="size-3.5" aria-hidden />
                        {article.views.toLocaleString()} {article.views === 1 ? 'view' : 'views'}
                    </span>
                </>
            ) : null}
        </div>
    )
}

type Links = { home: () => any; kb: (kb: string) => any; category: (kb: string, category?: string) => any }

/** Breadcrumb (Knowledge › KB › category path), title, chips (number, version, state) and metadata. */
export function KbArticleHeader(props: { article: KbArticle; kb?: KnowledgeBase | null; path?: KbCategoryNode[]; links: Links; actions?: any; minutes?: number; className?: string; titleId?: string }) {
    const { article: a, links } = props
    const crumbs: KbCrumb[] = [{ label: 'Knowledge', link: links.home() }]
    if (a.kbId) crumbs.push({ label: a.kb || (props.kb && props.kb.title) || 'Knowledge base', link: links.kb(a.kbId) })
    const path = props.path && props.path.length ? props.path : a.categoryId ? [{ id: a.categoryId, label: a.category } as KbCategoryNode] : []
    path.forEach((c) => crumbs.push({ label: c.label, link: links.category(a.kbId, c.id) }))
    return (
        <header className={cx('flex min-w-0 flex-col gap-4', props.className)}>
            <KbBreadcrumb items={crumbs.concat([{ label: a.number }])} />
            <div className="flex min-w-0 flex-col gap-3">
                <h1 id={props.titleId} className="m-0 text-[1.75rem] leading-[1.2] font-semibold tracking-tight text-balance text-foreground max-sm:text-[1.45rem]!">
                    {a.title}
                </h1>
                {!a.live ? (
                    <p className="m-0 inline-flex w-fit items-center gap-1.5 rounded-md bg-amber-500/12 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/25 ring-inset dark:text-amber-300">
                        <Icon name="eye-off" className="size-3.5" />
                        {a.state !== 'published' ? `${a.stateLabel || a.state}: not visible to readers` : 'Expired: not visible to readers'}
                    </p>
                ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <KbArticleMeta article={a} minutes={props.minutes} />
                {props.actions ? <div className="flex shrink-0 items-center gap-1">{props.actions}</div> : null}
            </div>
        </header>
    )
}

/** The article body in reading typography. `html` must already be sanitised (useArticleToc does it). */
export function KbArticleBody({ html, wiki = false, contentRef, className, labelledBy }: { html: string; wiki?: boolean; contentRef?: any; className?: string; labelledBy?: string }) {
    const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)
    if (wiki) {
        return (
            <div ref={contentRef} className={className}>
                <pre className="rp-kb-wiki">{html}</pre>
            </div>
        )
    }
    return (
        <>
            <RichText
                ref={contentRef}
                html={html}
                sanitize={false}
                as="article"
                aria-labelledby={labelledBy}
                className={cx('rp-kb-prose', className)}
                onClick={(e: any) => {
                    const t = e.target as HTMLElement
                    if (t && t.tagName === 'IMG' && !t.closest('a')) setZoom({ src: (t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src, alt: (t as HTMLImageElement).alt || '' })
                }}
            />
            <Dialog open={!!zoom} onOpenChange={(o: boolean) => !o && setZoom(null)}>
                <DialogContent className="w-auto max-w-[min(92vw,1200px)] gap-3 p-3 sm:max-w-[min(92vw,1200px)]">
                    <DialogTitle className="sr-only">{zoom && zoom.alt ? zoom.alt : 'Image'}</DialogTitle>
                    {zoom ? <img src={zoom.src} alt={zoom.alt} className="block max-h-[82vh] w-auto max-w-full rounded-md object-contain" /> : null}
                    {zoom && zoom.alt ? <p className="m-0 px-1 text-xs text-muted-foreground">{zoom.alt}</p> : null}
                </DialogContent>
            </Dialog>
        </>
    )
}

export function KbArticleSkeleton({ className }: { className?: string }) {
    return (
        <div className={cx('flex flex-col gap-4', className)} aria-busy="true" aria-label="Loading article">
            <Skeleton className="h-3.5 w-56" />
            <Skeleton className="h-8 w-4/5" />
            <div className="flex items-center gap-2">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3.5 w-64" />
            </div>
            <div className="mt-4 flex max-w-[72ch] flex-col gap-2.5">
                {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className={cx('h-4', i % 4 === 3 ? 'w-2/3' : 'w-full', i === 4 ? 'mt-4 h-6 w-1/3' : '')} />
                ))}
            </div>
        </div>
    )
}

export function KbArticleUnavailable({ homeLink, searchLink }: { homeLink: any; searchLink?: any }) {
    return (
        <Empty className="py-16">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon name="file-question" />
                </EmptyMedia>
                <EmptyTitle>Article not available</EmptyTitle>
                <EmptyDescription>It may have been retired or moved, or you may not have access to it.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
                <Button variant="outline" size="sm" render={<Link {...homeLink} />}>
                    <Icon name="book-open" />
                    Knowledge home
                </Button>
                {searchLink ? (
                    <Button variant="ghost" size="sm" render={<Link {...searchLink} />}>
                        <Icon name="search" />
                        Search articles
                    </Button>
                ) : null}
            </EmptyContent>
        </Empty>
    )
}

export default function KbArticleViewPreview() {
    return <KbArticleSkeleton />
}
