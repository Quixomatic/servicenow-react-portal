import { useEffect, useMemo, useState } from 'react'
import { Link } from '@portal/runtime'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { cx } from 'components:app/field'
import { categoryPath } from 'utilities:app/knowledge'
import type { KbCategoryNode, KbCategoryTree as Tree } from 'utilities:app/knowledge'

/**
 * components:app/kb-category-tree: a knowledge base's categories as a navigable tree with article
 * counts (own + subcategories). Parents expand and collapse (the active category's ancestors start
 * open); each label is a link. Empty categories are hidden unless `showEmpty`.
 *
 *   <KbCategoryTree tree={tree} kb={kbId} activeId={category} link={(c) => links.category(kb, c.id)} allLink={links.kb(kb)} />
 *
 * Data: useKbCategories() from utilities:app/knowledge.
 */
export type KbCategoryTreeProps = {
    tree: Tree | undefined
    kb: string
    activeId?: string
    link: (c: KbCategoryNode) => any
    /** An "All articles" entry at the top (the KB itself). */
    allLink?: any
    allLabel?: string
    allCount?: number
    showEmpty?: boolean
    /** Depth shown (0 = only top level). */
    maxDepth?: number
    loading?: boolean
    className?: string
    'aria-label'?: string
}

function rowCls(active: boolean) {
    return cx(
        'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-1.5 pr-2 text-sm no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40',
        active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-accent',
    )
}

export function KbCategoryTree(props: KbCategoryTreeProps) {
    const { tree, kb, activeId = '' } = props
    const roots = (tree && tree.byKb[kb]) || []
    const maxDepth = props.maxDepth === undefined ? 4 : props.maxDepth
    const openPath = useMemo(() => categoryPath(tree, activeId).map((c) => c.id), [tree, activeId])
    const [open, setOpen] = useState<Record<string, boolean>>({})
    useEffect(() => {
        if (!openPath.length) return
        setOpen((o) => {
            const next = { ...o }
            openPath.forEach((id) => (next[id] = true))
            return next
        })
    }, [openPath.join('|')])
    if (props.loading && !tree) {
        return (
            <div className={cx('flex flex-col gap-2.5 px-2 py-1', props.className)} aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className={cx('h-4', i % 3 === 1 ? 'w-1/2' : 'w-3/4')} />
                ))}
            </div>
        )
    }
    const counts = !tree || tree.countsKnown !== false
    const visible = (c: KbCategoryNode) => props.showEmpty || !counts || c.count > 0
    const render = (nodes: KbCategoryNode[], depth: number): any => (
        <ul role={depth ? 'group' : undefined} className="m-0 flex list-none flex-col gap-px p-0">
            {nodes.filter(visible).map((c) => {
                const kids = depth < maxDepth ? c.children.filter(visible) : []
                const isOpen = !!open[c.id]
                const active = c.id === activeId
                return (
                    <li key={c.id} className="min-w-0">
                        <div className="flex min-w-0 items-center" style={{ paddingLeft: depth * 14 }}>
                            {kids.length ? (
                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    aria-label={(isOpen ? 'Collapse ' : 'Expand ') + c.label}
                                    onClick={() => setOpen({ ...open, [c.id]: !isOpen })}
                                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
                                >
                                    <Icon name="chevron-right" className={cx('size-3.5 transition-transform', isOpen ? 'rotate-90' : '')} />
                                </button>
                            ) : (
                                <span className="size-6 shrink-0" aria-hidden />
                            )}
                            <Link {...props.link(c)} aria-current={active ? 'page' : undefined} className={cx(rowCls(active), 'pl-1')}>
                                <span className="truncate">{c.label}</span>
                                {counts ? <span className={cx('shrink-0 text-xs tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground')}>{c.count}</span> : null}
                            </Link>
                        </div>
                        {kids.length && isOpen ? render(kids, depth + 1) : null}
                    </li>
                )
            })}
        </ul>
    )
    return (
        <nav aria-label={props['aria-label'] || 'Categories'} className={cx('min-w-0', props.className)} data-rp-kb-category-tree="">
            {props.allLink ? (
                <div className="mb-px flex min-w-0 items-center">
                    <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
                        <Icon name="library" className="size-3.5" />
                    </span>
                    <Link {...props.allLink} aria-current={!activeId ? 'page' : undefined} className={cx(rowCls(!activeId), 'pl-1')}>
                        <span className="truncate">{props.allLabel || 'All articles'}</span>
                        {props.allCount !== undefined ? <span className={cx('shrink-0 text-xs tabular-nums', !activeId ? 'text-primary/80' : 'text-muted-foreground')}>{props.allCount}</span> : null}
                    </Link>
                </div>
            ) : null}
            {roots.filter(visible).length ? render(roots, 0) : <p className="m-0 px-2 py-2 text-sm text-muted-foreground">No categories yet.</p>}
        </nav>
    )
}

/** Subcategories of a category (or the KB's top level) as tiles with counts. */
export function KbSubcategoryGrid({ nodes, link, className, countsKnown = true }: { nodes: KbCategoryNode[]; link: (c: KbCategoryNode) => any; className?: string; countsKnown?: boolean }) {
    const list = countsKnown ? nodes.filter((c) => c.count > 0) : nodes
    if (!list.length) return null
    return (
        <ul className={cx('m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2 p-0', className)}>
            {list.map((c) => (
                <li key={c.id} className="min-w-0">
                    <Link
                        {...link(c)}
                        className="group/sub flex h-full min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 no-underline outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover/sub:bg-primary/10 group-hover/sub:text-primary">
                            <Icon name={c.children.length ? 'folder-tree' : 'folder'} className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">{c.label}</span>
                            {countsKnown ? (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {c.count} {c.count === 1 ? 'article' : 'articles'}
                                </span>
                            ) : c.children.length ? (
                                <span className="text-xs text-muted-foreground">{c.children.length} subcategories</span>
                            ) : null}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    )
}

export default function KbCategoryTreePreview() {
    return null
}
