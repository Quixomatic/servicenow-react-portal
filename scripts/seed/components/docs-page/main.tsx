/**
 * app/docs-page — one documentation page (fumadocs DocsPage): breadcrumb, title, description, the
 * Markdown body (components:app/docs-content), previous / next cards, and the table of contents,
 * which it contributes to the layout's `toc` (xl) and `tocbar` (below xl) regions.
 *
 * The doc path comes from the route: the docs portal has a home page ('' → index) and a '*' page
 * (concepts/layouts → /site/docs/params/page-id/concepts%2Flayouts). A heading travels as the q
 * param h (…/q/h%3Dregions): the page scrolls to it once the content is in.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, RegionPortal, usePortalLocation } from '@portal/runtime'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from 'components:empty'
import { cn } from 'utilities:cn'
import { parseMarkdown } from 'utilities:app/markdown'
import { useDoc, useDocsNav, docPathOf, docRoute, neighbours, scrollToHeading, getDocsScroller, useHeadingRequests, usePrefetchDoc } from 'utilities:app/docs'
import type { DocMeta } from 'utilities:app/docs'
import DocsContent from 'components:app/docs-content'
import DocsToc, { DocsTocBar } from 'components:app/docs-toc'

type Options = { path?: string; breadcrumb?: boolean; tocDepth?: number; prevNext?: boolean; editUrl?: string; editLabel?: string }

export default function DocsPage({ options = {} }: { options?: Options }) {
    const loc = usePortalLocation()
    const path = options.path ? docPathOf(options.path) : docPathOf(loc ? loc.page : '')
    const wantedHeading = (loc && loc.qParams && (loc.qParams as any).h) || ''
    const { doc, isLoading, error, notFound } = useDoc(path)
    const nav = useDocsNav()
    const parsed = useMemo(() => (doc ? parseMarkdown(doc.markdown) : null), [doc])
    const articleRef = useRef<HTMLElement | null>(null)
    const depth = Math.min(4, Math.max(2, Number(options.tocDepth) || 3))
    const toc = useMemo(() => (parsed ? parsed.headings.filter((h) => h.depth >= 2 && h.depth <= depth) : []), [parsed, depth])

    // New page: start at the top, or at the requested heading once the content has rendered.
    const goTo = useCallback((id: string) => {
        const el = articleRef.current
        if (!el) return
        if (!id || !scrollToHeading(id, { root: el, behavior: 'auto', offset: offsetFor(el) })) {
            const scroller = getDocsScroller(el)
            if (scroller) scroller.scrollTop = 0
        }
    }, [])
    useEffect(() => {
        if (parsed) requestAnimationFrame(() => goTo(wantedHeading))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed, wantedHeading])
    useHeadingRequests(path, useCallback((id: string) => parsed && requestAnimationFrame(() => goTo(id)), [parsed, goTo]))

    const pages = nav.pages
    const { previous, next } = neighbours(pages, path)
    const meta: DocMeta | null = doc || nav.byPath[path] || null
    const edit = options.editUrl && doc ? options.editUrl.replace('{source}', doc.sourcePath).replace('{path}', doc.path) : ''

    return (
        <div className="rp-docs-page">
            <article ref={articleRef as any} className="rp-docs-page__article" data-doc-path={path}>
                {notFound ? (
                    <NotFound path={path} />
                ) : error ? (
                    <Empty className="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon name="triangle-alert" />
                            </EmptyMedia>
                            <EmptyTitle>Couldn't load this page</EmptyTitle>
                            <EmptyDescription>{error.message}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <>
                        {options.breadcrumb !== false && meta && meta.section && meta.path !== 'index' ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="truncate">{meta.section}</span>
                                <Icon name="chevron-right" className="size-3.5 shrink-0" />
                                <span className="truncate font-medium text-primary">{meta.title}</span>
                            </div>
                        ) : null}
                        {meta ? <h1 className="rp-docs-page__title">{meta.title}</h1> : <Skeleton className="h-9 w-64" />}
                        {meta ? meta.description ? <p className="rp-docs-page__description">{meta.description}</p> : null : <Skeleton className="mb-8 h-6 w-full max-w-xl" />}
                        {edit ? (
                            <div className="-mt-4 mb-2 flex flex-wrap gap-2">
                                <a href={edit} target="_blank" rel="noreferrer noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent">
                                    <Icon name="square-pen" className="size-3.5" />
                                    {options.editLabel || 'Edit on GitHub'}
                                </a>
                            </div>
                        ) : null}
                        {parsed ? (
                            <DocsContent doc={parsed} path={path} skipTitle className="flex-1" />
                        ) : isLoading ? (
                            <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-11/12" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="mt-6 h-6 w-48" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : null}
                        {options.prevNext !== false && parsed && (previous || next) ? <PrevNext previous={previous} next={next} /> : null}
                    </>
                )}
            </article>
            {parsed ? (
                <>
                    <RegionPortal region="toc">
                        <DocsToc items={toc} />
                    </RegionPortal>
                    <RegionPortal region="tocbar">
                        <DocsTocBar items={toc} title={meta ? meta.title : undefined} />
                    </RegionPortal>
                </>
            ) : null}
        </div>
    )
}

/** Sticky bars above the content: the mobile header + tocbar, else a little air. */
function offsetFor(el: Element) {
    const scroller = getDocsScroller(el)
    if (!scroller) return 72
    const header = scroller.querySelector('.rp-docs__header') as HTMLElement | null
    const bar = scroller.querySelector('.rp-docs__tocbar') as HTMLElement | null
    const h = (header && header.offsetParent ? header.offsetHeight : 0) + (bar && bar.offsetParent ? bar.offsetHeight : 0)
    return h + 24
}

function PrevNext({ previous, next }: { previous: DocMeta | null; next: DocMeta | null }) {
    const prefetch = usePrefetchDoc()
    const card = (item: DocMeta, dir: 'prev' | 'next') => (
        <Link
            to={docRoute(item.path)}
            onMouseEnter={() => prefetch(item.path)}
            onFocus={() => prefetch(item.path)}
            className={cn('flex flex-col gap-2 rounded-lg border p-4 text-sm no-underline transition-colors hover:bg-accent/80 hover:text-accent-foreground', dir === 'next' && 'text-end', !(previous && next) && 'col-span-full', 'rp-docs-page__navcard')}
        >
            <div className={cn('inline-flex items-center gap-1.5 font-medium text-foreground', dir === 'next' && 'flex-row-reverse')}>
                <Icon name={dir === 'prev' ? 'chevron-left' : 'chevron-right'} className="-mx-1 size-4 shrink-0" />
                <p className="m-0">{item.title}</p>
            </div>
            <p className="m-0 truncate text-muted-foreground">{dir === 'prev' ? 'Previous Page' : 'Next Page'}</p>
        </Link>
    )
    return (
        <nav aria-label="Previous and next page" className={cn('rp-docs-page__prevnext mt-8 grid gap-4', previous && next ? 'grid-cols-2' : 'grid-cols-1')}>
            {previous ? card(previous, 'prev') : null}
            {next ? card(next, 'next') : null}
        </nav>
    )
}

function NotFound({ path }: { path: string }) {
    return (
        <Empty className="mt-8 border">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon name="file-question" />
                </EmptyMedia>
                <EmptyTitle>Page not found</EmptyTitle>
                <EmptyDescription>
                    There's no doc at <code>{path}</code>. It may have moved; try the search.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Link to="" className="text-sm font-medium text-primary underline underline-offset-4">
                    Back to the introduction
                </Link>
            </EmptyContent>
        </Empty>
    )
}
