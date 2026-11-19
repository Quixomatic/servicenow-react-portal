import { useMemo } from 'react'
import { usePortal, usePortalLocation, useNavigate, useComponent } from '@portal/runtime'
import { RecordList } from 'components:app/data-table'
import type { ListState, RecordListFeatures } from 'components:app/data-table'
import type { ListRow } from 'utilities:app/list-data'
import { HeaderSlot, useHeaderSlot } from 'utilities:app/header-slots'

type Options = {
    table?: string
    title?: string
    description?: string
    query?: string
    fixedQuery?: string
    columns?: string
    orderBy?: string
    view?: string
    pageSize?: number
    pagination?: 'pages' | 'scroll'
    density?: 'compact' | 'normal' | 'comfortable'
    searchMode?: 'keywords' | 'contains'
    /** Portal page that opens a record (gets table + sys_id); '' = classic form in a new tab. */
    recordPage?: string
    /**
     * Where the title and toolbar go: 'header' = the page header's slots (title + count → left,
     * search and buttons → right; e.g. app/app-subheader), 'inline' = above the table, 'auto'
     * (default) = header when the layout has those slots.
     */
    toolbarPlacement?: 'auto' | 'inline' | 'header'
    /** Mirror filter / search / sort / page into the URL (shareable, back/forward). */
    syncUrl?: boolean
    showTitle?: boolean
    showSearch?: boolean
    showBreadcrumbs?: boolean
    showFilter?: boolean
    showColumns?: boolean
    showPagination?: boolean
    inlineEdit?: boolean
    contextMenu?: boolean
    selection?: boolean
    actions?: boolean
    showExport?: boolean
    showRefresh?: boolean
    /** Live updates (AMB): refetch the current page when matching records change. */
    liveUpdates?: boolean
}

const NAME = /^[a-z0-9_]+$/

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v)
    return ''
}

/**
 * List View: a page-level record list (toolbar, breadcrumbs, condition builder, a table that fills
 * the page height). Made for pages with content width "Full bleed".
 *
 * table / query / view come from the widget options, else the route params, else the URL params
 * (table, query, view; also accepted packed inside q). With syncUrl (default) the filter, search,
 * sort and page live in the URL: query=<encoded filter>&kw=<search>&sort=-number&page=2.
 * Rows open the portal's `form` page (recordPage) with table + sys_id. On a layout with header slots
 * (app/app-subheader) the title and toolbar move into the header (toolbarPlacement).
 */
export default function ListView({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {}
    const portal = usePortal() as any
    const navigate = useNavigate()
    const { instanceId } = useComponent() as { instanceId?: string }
    const route = (portal && portal.page && portal.page.params) || {}
    const qp = useMemo(() => new URLSearchParams(typeof loc.q === 'string' ? loc.q : ''), [loc.q])
    // q keys + explicit URL params (location.query is the encoded-query param, a string).
    const urlObj = loc.params && typeof loc.params === 'object' ? loc.params : loc.query && typeof loc.query === 'object' ? loc.query : {}
    const urlQuery = typeof loc.query === 'string' ? loc.query : pick(urlObj.query, qp.get('query'))

    const rawTable = pick(options.table, route.table, loc.table, urlObj.table, qp.get('table'), 'incident')
    const table = NAME.test(rawTable) ? rawTable : 'incident'
    const view = pick(options.view, route.view, loc.mode === 'studio' ? '' : loc.view,urlObj.view, qp.get('view'))
    const sync = options.syncUrl !== false
    const page = String(loc.page || '')

    // URL → list state (the URL wins once it has a value; options give the defaults).
    const state: Partial<ListState> | undefined = sync
        ? {
              filter: urlQuery || qp.has('query') ? urlQuery : options.query || '',
              keywords: pick(urlObj.kw, qp.get('kw')),
              orderBy: pick(urlObj.sort, qp.get('sort')) || options.orderBy || '',
              page: Math.max(0, (parseInt(pick(urlObj.page, qp.get('page')), 10) || 1) - 1),
          }
        : undefined

    const writeUrl = (s: ListState) => {
        const next = new URLSearchParams(typeof loc.q === 'string' ? loc.q : '')
        const set = (k: string, v: string, dflt = '') => (v && v !== dflt ? next.set(k, v) : next.delete(k))
        if (!options.table && table) next.set('table', table)
        // An explicitly empty filter is kept (query=) when the widget has a default filter.
        if (s.filter) next.set('query', s.filter)
        else if (options.query) next.set('query', '')
        else next.delete('query')
        set('kw', s.keywords)
        set('sort', s.orderBy, options.orderBy || '')
        set('page', s.page ? String(s.page + 1) : '')
        navigate(page, { q: next.toString() })
    }

    const hasFormPage = useMemo(() => {
        const target = options.recordPage === undefined ? 'form' : options.recordPage
        if (!target) return ''
        const pages: any[] = (portal && portal.pages) || []
        return pages.some((p) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(target) >= 0) ? target : ''
    }, [portal && portal.pages, options.recordPage])

    const openRow = (row: ListRow, t: string) => {
        if (hasFormPage) {
            const q = new URLSearchParams({ table: row.className || t, sys_id: row.sysId })
            navigate(hasFormPage, { q: q.toString() })
        } else window.open(`/${row.className || t}.do?sys_id=${row.sysId}`, '_blank', 'noopener')
    }

    // Header slots exist on this layout (app-shell sub-header)? 'header' and 'auto' use them.
    const leftSlot = useHeaderSlot('left')
    const rightSlot = useHeaderSlot('right')
    const placement = options.toolbarPlacement || 'auto'
    const toHeader = placement !== 'inline' && !!(leftSlot && rightSlot)
    const toolbarSlots = toHeader
        ? {
              left: (node: any) => (
                  <HeaderSlot name="left">
                      <div className="flex min-w-0 items-baseline gap-2">{node}</div>
                  </HeaderSlot>
              ),
              right: (node: any) => (
                  <HeaderSlot name="right">
                      <div className="flex min-w-0 items-center justify-end gap-1.5">{node}</div>
                  </HeaderSlot>
              ),
          }
        : undefined

    const features: Partial<RecordListFeatures> = {
        title: options.showTitle !== false,
        search: options.showSearch !== false,
        breadcrumbs: options.showBreadcrumbs !== false,
        filter: options.showFilter !== false,
        columnChooser: options.showColumns !== false,
        pagination: options.showPagination !== false,
        inlineEdit: options.inlineEdit !== false,
        contextMenu: options.contextMenu !== false,
        selection: options.selection !== false,
        actions: options.actions !== false,
        export: options.showExport !== false,
        refresh: options.showRefresh !== false,
    }

    return (
        <div className="rpl-view min-w-0" data-rp-list-view={table}>
            <RecordList
                key={`${table}|${view}`}
                table={table}
                title={options.title}
                columns={options.columns}
                query={options.query}
                fixedQuery={options.fixedQuery}
                orderBy={options.orderBy}
                view={view || undefined}
                pageSize={options.pageSize}
                pagination={options.pagination}
                density={options.density}
                searchMode={options.searchMode}
                features={features}
                variant="page"
                height="fill"
                state={state}
                onStateChange={sync ? writeUrl : undefined}
                onRowOpen={openRow}
                toolbarSlots={toolbarSlots}
                prefKey={`${instanceId || 'list-view'}:${table}`}
                live={!!options.liveUpdates}
            />
        </div>
    )
}
