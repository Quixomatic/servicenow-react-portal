import { useState } from 'react'
import { Link, usePortalLocation } from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { useGraphQL, useDebouncedValue } from 'utilities:app/graphql'
import { cx, controlClass, bareInputClass, IconSearch, Spinner } from 'components:app/field'

type PickItem = { sysId: string; label: string; note?: string }
type Props = { options?: { title?: string; items?: PickItem[]; search?: boolean } }

const SEARCH = `query rpCatalogSearch($q: String) {
  GlideRecord_Query { sc_cat_item(queryConditions: $q, pagination: { limit: 8 }) { _results { sys_id { value } name { displayValue } sys_class_name { displayValue } short_description { displayValue } } } }
}`

/**
 * components:app/catalog-picker: picks the item a catalog-item widget on the same page shows
 * (through the page query, ?item=<sys_id>): featured items from options plus a live search of
 * active catalog items and record producers.
 */
export default function CatalogPicker({ options = {} }: Props) {
    const location = usePortalLocation() as any
    const current = String(((location && location.query) || {}).item || '')
    const [text, setText] = useState('')
    const term = useDebouncedValue(text.trim(), 250)
    const search = useGraphQL(SEARCH, { q: `active=true^nameLIKE${term.replace(/\^/g, '')}^ORDERBYname` }, { enabled: options.search !== false && term.length >= 2, keepPrevious: true })
    const results: PickItem[] =
        term.length >= 2 && search.data
            ? search.data.GlideRecord_Query.sc_cat_item._results.map((r: any) => ({ sysId: r.sys_id.value, label: r.name.displayValue, note: r.sys_class_name.displayValue }))
            : []
    const item = (it: PickItem) => {
        const active = it.sysId === current
        return (
            <li key={it.sysId}>
                <Link
                    to={String((location && location.page) || "catalog")}
                    q={`item=${it.sysId}`}
                    aria-current={active ? 'true' : undefined}
                    className={cx('flex flex-col rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}
                >
                    <span className="font-medium">{it.label}</span>
                    {it.note ? <span className={cx('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{it.note}</span> : null}
                </Link>
            </li>
        )
    }
    return (
        <Card data-rp-catalog-picker="">
            <CardHeader>
                <CardTitle>{options.title || 'Catalog'}</CardTitle>
                <CardDescription>Pick an item or search the catalog.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {options.search !== false ? (
                    <div className={controlClass({ className: 'gap-2' })}>
                        <IconSearch size={14} className="text-muted-foreground" />
                        <input type="search" aria-label="Search the catalog" placeholder="Search items…" value={text} className={bareInputClass} onChange={(e: any) => setText(e.target.value)} />
                        {search.isFetching ? <Spinner label="Searching" /> : null}
                    </div>
                ) : null}
                {results.length ? (
                    <nav aria-label="Search results">
                        <ul className="flex flex-col gap-1">{results.map(item)}</ul>
                    </nav>
                ) : term.length >= 2 && !search.isFetching ? (
                    <p className="text-sm text-muted-foreground">No items match.</p>
                ) : null}
                {options.items && options.items.length ? (
                    <nav aria-label="Featured items">
                        <ul className="flex flex-col gap-1">{options.items.map(item)}</ul>
                    </nav>
                ) : null}
            </CardContent>
        </Card>
    )
}
