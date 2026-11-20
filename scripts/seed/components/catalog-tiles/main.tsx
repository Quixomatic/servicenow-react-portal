import { useServer, Link } from '@portal/runtime'
import { useQueries, useQuery } from 'utilities:react-query'
import { Card } from 'components:card'
import { Icon } from 'components:icon'
import { Skeleton } from 'components:skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from 'components:empty'
import { restGet } from 'utilities:app/graphql'
import { catalogHit, getWithTotal } from 'utilities:app/search'
import type { SearchHit } from 'utilities:app/search'
import { HitMedia } from 'components:app/search-box'

type Options = {
    title?: string
    description?: string
    /** popular: most requested (server aggregate), then `items` to fill; items: exactly `items`; category: a catalog category. */
    mode?: 'popular' | 'items' | 'category'
    items?: string[]
    exclude?: string[]
    category?: string
    limit?: number
    days?: number
    catalogPage?: string
    /** Grid columns at full width (tiles never get narrower than 14rem). */
    columns?: number
}

const SYS_ID = /^[0-9a-f]{32}$/

/** One catalog item through the catalog API (user criteria apply): null when not available to the user. */
export function useCatalogItemsById(ids: string[], options: { catalogPage?: string } = {}) {
    const results = useQueries({
        queries: ids.map((id) => ({
            queryKey: ['rp-catalog', 'summary', id],
            queryFn: async ({ signal }: { signal: AbortSignal }) => {
                try {
                    const r = await restGet(`/api/sn_sc/servicecatalog/items/${id}`, signal)
                    if (!r || r.hide_sp === true || r.visible_standalone === false) return null
                    return r
                } catch (e) {
                    return null
                }
            },
            staleTime: 10 * 60_000,
        })),
    }) as any[]
    const loading = results.some((r) => r.isLoading)
    const hits: SearchHit[] = results.map((r) => r.data).filter(Boolean).map((i: any) => catalogHit(i, { catalogPage: options.catalogPage || 'catalog' }))
    return { hits, loading }
}

/** A category's items through the catalog API. */
export function useCategoryItems(category: string | undefined, options: { limit?: number; catalogPage?: string } = {}) {
    return useQuery({
        queryKey: ['rp-catalog', 'category-items', category || '', options.limit || 8],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const r = await getWithTotal(`/api/sn_sc/servicecatalog/items?sysparm_category=${category}&sysparm_limit=${options.limit || 8}`, signal)
            return r.result.map((i) => catalogHit(i, { catalogPage: options.catalogPage || 'catalog' })) as SearchHit[]
        },
        enabled: !!category && SYS_ID.test(category),
        staleTime: 10 * 60_000,
    }) as any
}

/** One tile: picture or icon, name, description, price and a "Request" affordance. */
export function CatalogTile({ hit }: { hit: SearchHit }) {
    return (
        <Link
            {...({ to: hit.link.to, q: hit.link.q } as any)}
            className="group/tile flex h-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground no-underline shadow-xs outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary/35 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <div className="flex items-start justify-between gap-3">
                <HitMedia hit={hit} size="lg" />
                {hit.number ? <span className="mt-0.5 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{hit.number}</span> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="line-clamp-2 text-sm leading-snug font-semibold text-foreground">{hit.title}</span>
                {hit.subtitle ? <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{hit.subtitle}</span> : null}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-sm font-semibold text-foreground tabular-nums">{hit.meta || <span className="font-normal text-muted-foreground">No charge</span>}</span>
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    Request
                    <Icon name="arrow-right" className="size-3.5 transition-transform group-hover/tile:translate-x-0.5" />
                </span>
            </div>
        </Link>
    )
}

/**
 * Catalog Tiles: popular (most requested in the last `days` days, server-side counts) or chosen
 * catalog items as tiles with picture or icon, price and a Request link into the catalog page
 * (q item=<sys_id>). Items are loaded through the catalog API as the user, so user criteria decide
 * what shows. Hooks: useCatalogItemsById, useCategoryItems; tile: CatalogTile.
 */
export default function CatalogTiles({ options = {} }: { options?: Options }) {
    const { data, pending } = useServer() as any
    const mode = options.mode || 'popular'
    const limit = Math.max(1, Math.min(24, options.limit || 8))
    const catalogPage = options.catalogPage || 'catalog'
    const exclude = (options.exclude || []).filter((s) => SYS_ID.test(s))
    const fill = (options.items || []).filter((s) => SYS_ID.test(s))
    const popular: string[] = mode === 'popular' && data && Array.isArray(data.popular) ? data.popular.map((p: any) => p.id) : []
    const ids: string[] = []
    // Popular candidates (a few spares: unavailable items drop out), then the fill items.
    ;(mode === 'popular' ? popular.filter((id) => exclude.indexOf(id) < 0).slice(0, limit + 4).concat(fill) : fill).forEach((id) => {
        if (SYS_ID.test(id) && exclude.indexOf(id) < 0 && ids.indexOf(id) < 0) ids.push(id)
    })
    const byId = useCatalogItemsById(mode === 'category' ? [] : ids, { catalogPage })
    const byCat = useCategoryItems(mode === 'category' ? options.category : undefined, { limit, catalogPage })
    const hits: SearchHit[] = (mode === 'category' ? byCat.data || [] : byId.hits).slice(0, limit)
    const loading = mode === 'category' ? byCat.isLoading : (mode === 'popular' && pending) || byId.loading
    const cols = Math.max(2, Math.min(6, options.columns || 4))

    return (
        <section className="rp-ct flex min-w-0 flex-col gap-3" aria-labelledby="rp-ct-h" data-rp-catalog-tiles="">
            <div className="flex items-end justify-between gap-3 px-0.5">
                <div className="min-w-0">
                    <h2 id="rp-ct-h" className="m-0 text-base font-semibold tracking-tight">
                        {options.title || 'Popular requests'}
                    </h2>
                    {options.description ? <p className="m-0 mt-0.5 text-sm text-muted-foreground">{options.description}</p> : null}
                </div>
                <Link to={catalogPage} className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary no-underline hover:underline">
                    Browse catalog
                    <Icon name="arrow-right" className="size-3.5" />
                </Link>
            </div>
            {loading ? (
                <div className="rp-ct-grid grid gap-4" style={{ ['--rp-ct-cols' as any]: cols }}>
                    {Array.from({ length: Math.min(limit, cols) }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-3 rounded-xl border border-border p-4" aria-hidden>
                            <Skeleton className="size-11 rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : hits.length ? (
                <div className="rp-ct-grid grid gap-4" style={{ ['--rp-ct-cols' as any]: cols }}>
                    {hits.map((h) => (
                        <CatalogTile key={h.id} hit={h} />
                    ))}
                </div>
            ) : (
                <Card className="py-0">
                    <Empty className="py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon name="store" />
                            </EmptyMedia>
                            <EmptyTitle>Nothing to show yet</EmptyTitle>
                            <EmptyDescription>Browse the catalog to find what you need.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            )}
        </section>
    )
}
