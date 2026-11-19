import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast, useRecordWatch } from '@portal/runtime'
import {
    useList,
    useInfiniteList,
    useCellWrite,
    useListPreferences,
    useListInvalidate,
    fetchEditability,
    parseQuery,
    serializeQuery,
    andTerm,
    baseType,
    specificDay,
} from 'utilities:app/list-data'
import type { ListColumn, ListRow, Term } from 'utilities:app/list-data'
import { useTableMeta } from 'utilities:app/graphql'
import { ConditionBuilder, FilterBreadcrumbs } from 'components:app/condition-builder'
import { Popup, Select } from 'components:app/combobox'
import { FieldControl } from 'components:app/field-control'
import { cx, IconSearch, IconX, Spinner, IconExternal } from 'components:app/field'
import { DataTable } from './table'
import type { DataTableColumn, Density, SortState, CellContext } from './table'
import { Pagination } from './pagination'
import { ColumnChooser } from './column-chooser'
import { CellEditor } from './cell-editor'
import type { MenuItem } from './menu'

export type RecordListFeatures = {
    title: boolean
    search: boolean
    breadcrumbs: boolean
    filter: boolean
    columnChooser: boolean
    pagination: boolean
    inlineEdit: boolean
    contextMenu: boolean
    selection: boolean
    actions: boolean
    refresh: boolean
    export: boolean
}

export type ListActionContext = { table: string; rows: ListRow[]; sysIds: string[]; refresh: () => void; clearSelection: () => void }
export type ListAction = {
    id: string
    label: string
    /** Needs at least one selected row (default true). */
    requiresSelection?: boolean
    destructive?: boolean
    run: (ctx: ListActionContext) => void | Promise<void>
}

/** The user-facing query state (what a page can mirror into the URL). */
export type ListState = { filter: string; keywords: string; orderBy: string; page: number }

export type RecordListProps = {
    table: string
    title?: string
    description?: string
    /** Columns ('number,short_description,caller_id.department'); default: the view's list layout. */
    columns?: string | string[]
    /** Initial filter (encoded; the user can change it). */
    query?: string
    /** Always applied, never shown or removable (e.g. a related list's parent condition). */
    fixedQuery?: string
    /** Default sort: 'number' or '-number' (descending). */
    orderBy?: string
    view?: string
    relatedListName?: string
    parentTable?: string
    parentRecordSysId?: string
    pageSize?: number
    pageSizes?: number[]
    /** 'pages' (default) or 'scroll' (infinite, virtualized). */
    pagination?: 'pages' | 'scroll'
    density?: Density
    wrap?: boolean
    /** Turn parts off: { search: false, filter: false, … } (everything defaults on). */
    features?: Partial<RecordListFeatures>
    /** 'keywords' (the platform's text search) or 'contains' (LIKE over visible text columns). */
    searchMode?: 'keywords' | 'contains'
    variant?: 'page' | 'card' | 'plain'
    /** Scroll-area height: 'fill' (to the bottom of the page), 'auto', or a CSS length / px. */
    height?: number | string
    /** Personalization key (default: table + view + columns + fixed query; widgets pass their instance id); false = don't remember. */
    prefKey?: string | false
    persist?: 'user' | 'local' | 'none'
    actions?: ListAction[]
    /** Open a record (default: classic form in a new tab). */
    onRowOpen?: (row: ListRow, table: string) => void
    /** Controlled query state (e.g. from the URL). Changes from outside re-sync the list. */
    state?: Partial<ListState>
    onStateChange?: (state: ListState) => void
    emptyText?: string
    /**
     * Live updates (AMB record watch, off by default): when a record matching the list's filter
     * changes, the current page refetches (throttled, `throttleMs` default 1000) and changed rows
     * glow briefly. Off in Studio's designer unless its live data is on.
     */
    live?: boolean | { throttleMs?: number }
    className?: string
    /**
     * Render the toolbar elsewhere: `left` gets the title + count, `right` the search and buttons
     * (e.g. wrap each in <HeaderSlot name="left|right"> from utilities:app/header-slots). The
     * breadcrumbs, filter panel, selection bar and table stay in the list.
     */
    toolbarSlots?: { left: (node: any) => any; right: (node: any) => any }
}

const ALL_ON: RecordListFeatures = {
    title: true,
    search: true,
    breadcrumbs: true,
    filter: true,
    columnChooser: true,
    pagination: true,
    inlineEdit: true,
    contextMenu: true,
    selection: true,
    actions: true,
    refresh: true,
    export: true,
}

/** Types the field primitives can edit inline. */
const EDITABLE_BASE = ['string', 'choice', 'reference', 'boolean', 'number', 'date', 'datetime']
const NOT_EDITABLE_TYPES = ['journal', 'journal_input', 'journal_list', 'script', 'script_plain', 'conditions', 'sys_class_name', 'document_id', 'GUID', 'domain_id', 'glide_list', 'password', 'password2']

function orderToSort(orderBy: string | undefined): SortState {
    return String(orderBy || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.startsWith('-') ? { id: s.slice(1), desc: true } : { id: s, desc: false }))
}
function sortToOrder(s: SortState): string {
    return s.map((x) => (x.desc ? '-' : '') + x.id).join(',')
}

/** Height from this element to the bottom of its scroll container (the page content area). */
function useFillHeight(ref: { current: HTMLElement | null }, enabled: boolean, min = 240) {
    const [height, setHeight] = useState<number | undefined>(undefined)
    useLayoutEffect(() => {
        if (!enabled) return undefined
        const el = ref.current
        if (!el) return undefined
        // Resolved on every measure: at mount the widget may not be attached to the layout yet.
        let scrollParent: HTMLElement | null = null
        let observed: HTMLElement | null = null
        let frame = 0
        const measure = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
                scrollParent = el.isConnected ? findScrollParent(el) : null
                if (scrollParent && scrollParent !== observed && ro) {
                    ro.observe(scrollParent)
                    observed = scrollParent
                }
                const r = el.getBoundingClientRect()
                let h: number
                const scroller = el.querySelector('.rpl-scroll') as HTMLElement | null
                if (scrollParent && scroller) {
                    // Exact fit: grow or shrink the table's scroller by however much the page content
                    // under the scroll container is short of / over its height (paddings, borders,
                    // gaps, breadcrumbs, filter panel, pagination all included), so the table body is
                    // the only scroller.
                    let content = 0
                    for (const child of Array.from(scrollParent.children) as HTMLElement[]) {
                        const cs = getComputedStyle(child)
                        if (cs.position === 'absolute' || cs.position === 'fixed') continue
                        content += child.getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0)
                    }
                    h = scroller.getBoundingClientRect().height + (scrollParent.clientHeight - content)
                } else if (scrollParent) {
                    const sp = scrollParent.getBoundingClientRect()
                    const top = r.top - sp.top + scrollParent.scrollTop
                    h = scrollParent.clientHeight - top
                } else {
                    const section = el.parentElement
                    const footer = section ? Math.max(0, section.getBoundingClientRect().bottom - r.bottom) : 0
                    h = window.innerHeight - (r.top + window.scrollY) - 16 - footer
                }
                setHeight(Math.max(min, Math.floor(h)))
            })
        }
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
        if (ro) {
            ro.observe(document.documentElement)
            if (el.parentElement) ro.observe(el.parentElement)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => {
            cancelAnimationFrame(frame)
            if (ro) ro.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [enabled, min])
    return height
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
    let node: any = el.parentNode
    while (node) {
        if (node.nodeType === 11) node = node.host // shadow root → host
        if (!node || node === document.documentElement || node === document.body) return null
        if (node.nodeType === 1) {
            const s = getComputedStyle(node)
            if (/(auto|scroll)/.test(s.overflowY) && node.clientHeight > 0) return node
        }
        node = node.parentNode
    }
    return null
}

function csvEscape(v: string): string {
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * RecordList: a full record list on server-side data. Toolbar (title + count, search, filter,
 * columns, refresh), filter breadcrumbs, the condition builder, the DataTable (sorting, selection,
 * cell menu, inline edit, virtualized rows), pagination and a bulk-action bar. Every part can be
 * turned off with `features`.
 */
export function RecordList(props: RecordListProps) {
    const f: RecordListFeatures = { ...ALL_ON, ...(props.features || {}) }
    const { table, variant = 'card' } = props
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const titleId = `rpl-title-${uid}`
    const filterPanelId = `rpl-filter-${uid}`
    const infinite = props.pagination === 'scroll'

    // ---- query state (internal, optionally mirrored from props.state) -----------------------------
    const initial: ListState = {
        filter: props.state && props.state.filter !== undefined ? props.state.filter : props.query || '',
        keywords: (props.state && props.state.keywords) || '',
        orderBy: props.state && props.state.orderBy !== undefined ? props.state.orderBy : props.orderBy || '',
        page: (props.state && props.state.page) || 0,
    }
    const [state, setState] = useState<ListState>(initial)
    const external = JSON.stringify(props.state || null)
    const lastExternal = useRef(external)
    useEffect(() => {
        if (external === lastExternal.current) return
        lastExternal.current = external
        if (!props.state) return
        setState((s) => {
            const next = {
                filter: props.state!.filter !== undefined ? props.state!.filter : s.filter,
                keywords: props.state!.keywords !== undefined ? props.state!.keywords : s.keywords,
                orderBy: props.state!.orderBy !== undefined ? props.state!.orderBy : s.orderBy,
                page: props.state!.page !== undefined ? props.state!.page : s.page,
            }
            return JSON.stringify(next) === JSON.stringify(s) ? s : next
        })
    }, [external])
    const onStateChange = useRef(props.onStateChange)
    onStateChange.current = props.onStateChange
    const patchState = useCallback((patch: Partial<ListState>) => {
        setState((s) => {
            const next = { ...s, ...patch }
            if (JSON.stringify(next) === JSON.stringify(s)) return s
            if (onStateChange.current) onStateChange.current(next)
            return next
        })
    }, [])

    const [searchText, setSearchText] = useState(state.keywords)
    useEffect(() => setSearchText(state.keywords), [state.keywords])
    useEffect(() => {
        if (searchText === state.keywords) return undefined
        const id = setTimeout(() => patchState({ keywords: searchText, page: 0 }), 350)
        return () => clearTimeout(id)
    }, [searchText])

    // ---- personalization ---------------------------------------------------------------------
    const prefKey = props.prefKey === false ? undefined : props.prefKey || [table, props.view, props.relatedListName, props.fixedQuery, Array.isArray(props.columns) ? props.columns.join(',') : props.columns].filter(Boolean).join(':')
    const { prefs, setPrefs, reset } = useListPreferences(prefKey, { persist: props.persist })
    const pageSize = prefs.pageSize || props.pageSize || (infinite ? 100 : 20)
    const density: Density = prefs.density || props.density || 'normal'
    const wrap = prefs.wrap ?? props.wrap ?? false
    const columnsParam = prefs.columns && prefs.columns.length ? prefs.columns.join(',') : props.columns

    // ---- data ----------------------------------------------------------------------------------
    const sorting = useMemo(() => orderToSort(state.orderBy), [state.orderBy])
    const args = {
        table,
        columns: columnsParam,
        query: state.filter,
        fixedQuery: props.fixedQuery,
        orderBy: sorting.map((s) => ({ field: s.id, desc: s.desc })),
        keywords: (props.searchMode || 'keywords') === 'keywords' ? state.keywords : undefined,
        view: props.view,
        relatedListName: props.relatedListName,
        parentTable: props.parentTable,
        parentRecordSysId: props.parentRecordSysId,
        limit: pageSize,
        offset: infinite ? 0 : state.page * pageSize,
    }
    const paged = useList(args, { enabled: !infinite })
    const scrolled = useInfiniteList(args, { enabled: infinite })
    const list: any = infinite ? scrolled : paged
    const page = list.data
    const columns: ListColumn[] = list.columns

    // 'contains' search needs the visible columns: rebuild once columns are known.
    const containsQuery = useMemo(() => {
        if (!state.keywords || props.searchMode !== 'contains' || !columns.length) return ''
        const text = columns.filter((c) => ['string', 'choice', 'reference'].indexOf(baseType(c.type, c.isChoice)) >= 0)
        return text.map((c, i) => (i ? 'OR' : '') + c.name + 'LIKE' + state.keywords).join('^')
    }, [state.keywords, props.searchMode, columns])
    const containsArgs = { ...args, query: [state.filter, containsQuery].filter(Boolean).join('^') }
    const containsPaged = useList(containsArgs, { enabled: !infinite && !!containsQuery })
    const effective: any = containsQuery && !infinite ? containsPaged : list
    const rows: ListRow[] = effective.rows
    const count: number = effective.count

    // Remember rows by id (selection spans pages; export and bulk edit need them).
    const seen = useRef<Map<string, ListRow>>(new Map())
    for (const r of rows) seen.current.set(r.sysId, r)

    const meta = useTableMeta(f.inlineEdit ? table : undefined)
    const invalidate = useListInvalidate()
    const refresh = () => invalidate(table)

    // ---- live updates (AMB) -------------------------------------------------------------------
    const liveThrottle = (props.live && typeof props.live === 'object' && props.live.throttleMs) || 1000
    const liveIds = useRef<Set<string>>(new Set())
    const liveTimer = useRef<any>(0)
    const [updated, setUpdated] = useState<Record<string, boolean>>({})
    const updatedTimer = useRef<any>(0)
    const live = useRecordWatch(
        table,
        [props.fixedQuery, state.filter].filter(Boolean).join('^'),
        (e: { sysId: string }) => {
            if (e.sysId) liveIds.current.add(e.sysId)
            if (liveTimer.current) return
            liveTimer.current = setTimeout(() => {
                liveTimer.current = 0
                const ids = Array.from(liveIds.current)
                liveIds.current.clear()
                invalidate(table)
                setUpdated(Object.fromEntries(ids.map((id) => [id, true])))
                clearTimeout(updatedTimer.current)
                updatedTimer.current = setTimeout(() => setUpdated({}), 2600)
            }, liveThrottle)
        },
        { enabled: !!props.live && !!table, invalidate: false },
    )
    useEffect(() => () => {
        clearTimeout(liveTimer.current)
        clearTimeout(updatedTimer.current)
    }, [])
    const liveOn = !!props.live && live.status === 'subscribed'
    const justUpdated = Object.keys(updated).length > 0

    // ---- selection ------------------------------------------------------------------------------
    const [selection, setSelection] = useState<Record<string, boolean>>({})
    const selectedIds = Object.keys(selection)
    useEffect(() => setSelection({}), [state.filter, state.keywords, table])

    // ---- columns for the grid ---------------------------------------------------------------
    const ordered = useMemo(() => {
        if (!prefs.columns || !prefs.columns.length) return columns
        const by = new Map(columns.map((c) => [c.name, c]))
        const out = prefs.columns.map((n) => by.get(n)).filter(Boolean) as ListColumn[]
        for (const c of columns) if (out.indexOf(c) < 0) out.push(c)
        return out
    }, [columns, prefs.columns])

    const isEditableColumn = useCallback(
        (c: ListColumn) => {
            if (!f.inlineEdit || !page || !page.inlineEditingEnabled || c.isDotWalk) return false
            if (c.name.startsWith('sys_') || NOT_EDITABLE_TYPES.indexOf(c.type) >= 0) return false
            if (EDITABLE_BASE.indexOf(baseType(c.type, c.isChoice)) < 0) return false
            const m = meta.data && meta.data[c.name]
            if (m && (m.readOnly || m.canWrite === false)) return false
            return true
        },
        [f.inlineEdit, page, meta.data],
    )

    const gridColumns: DataTableColumn[] = useMemo(
        () =>
            ordered.map((c) => ({
                id: c.name,
                header: c.label,
                type: c.type,
                isChoice: c.isChoice,
                isDisplay: c.isDisplay,
                sortable: c.isSortable,
                width: prefs.widths ? prefs.widths[c.name] : undefined,
            })),
        [ordered, prefs.widths],
    )
    const colByName = useMemo(() => new Map(ordered.map((c) => [c.name, c])), [ordered])

    // ---- opening records ------------------------------------------------------------------------
    const openRecord = (row: ListRow) => {
        if (props.onRowOpen) return props.onRowOpen(row, table)
        window.open(`/${row.className || table}.do?sys_id=${row.sysId}`, '_blank', 'noopener')
    }

    // ---- inline edit ----------------------------------------------------------------------------
    const [editing, setEditing] = useState<{ rowId: string; colId: string } | null>(null)
    const { write } = useCellWrite()
    const canEditCell = (ctx: CellContext<ListRow>) => {
        const c = colByName.get(ctx.column.id)
        return !!c && isEditableColumn(c)
    }

    // ---- context menu ---------------------------------------------------------------------------
    const filterBy = (term: Term) => patchState({ filter: serializeQuery(andTerm(parseQuery(state.filter), term), { orderBy: false }), page: 0 })
    const contextMenu = (ctx: CellContext<ListRow>): MenuItem[] => {
        const c = colByName.get(ctx.column.id)
        if (!c) return []
        const v = ctx.value || { value: '', displayValue: '' }
        const kind = baseType(c.type, c.isChoice)
        const shown = v.displayValue || v.value
        const day = /^\d{4}-\d{2}-\d{2}/.test(v.displayValue) ? v.displayValue.slice(0, 10) : ''
        const match: Term = !v.value ? { field: c.name, op: 'ISEMPTY', value: '' } : (kind === 'date' || kind === 'datetime') && day ? { field: c.name, op: 'ON', value: specificDay(day) } : { field: c.name, op: '=', value: v.value }
        const out: Term = !v.value ? { field: c.name, op: 'ISNOTEMPTY', value: '' } : (kind === 'date' || kind === 'datetime') && day ? { field: c.name, op: 'NOTON', value: specificDay(day) } : { field: c.name, op: '!=', value: v.value }
        const short = shown.length > 32 ? shown.slice(0, 31) + '…' : shown || 'empty'
        const items: MenuItem[] = [{ type: 'label', id: 'l', label: c.label }]
        if (f.filter || f.breadcrumbs) {
            items.push({ id: 'match', label: `Show matching “${short}”`, onSelect: () => filterBy(match), disabled: !c.isFilterable })
            items.push({ id: 'out', label: `Filter out “${short}”`, onSelect: () => filterBy(out), disabled: !c.isFilterable })
            items.push({ type: 'separator', id: 's1' })
        }
        items.push({ id: 'copy', label: 'Copy value', hint: 'display', onSelect: () => copy(shown) })
        if (v.value && v.value !== shown) items.push({ id: 'copy-raw', label: 'Copy raw value', hint: kind === 'reference' ? 'sys_id' : 'stored', onSelect: () => copy(v.value) })
        items.push({ type: 'separator', id: 's2' })
        items.push({ id: 'open', label: `Open ${ctx.row.display || 'record'}`, icon: <IconExternal size={14} />, onSelect: () => openRecord(ctx.row) })
        if (kind === 'reference' && v.value && ctx.row.refClass[c.name] && !c.isDotWalk)
            items.push({ id: 'open-ref', label: `Open ${shown}`, hint: ctx.row.refClass[c.name], onSelect: () => window.open(`/${ctx.row.refClass[c.name]}.do?sys_id=${v.value}`, '_blank', 'noopener') })
        if (canEditCell(ctx)) items.push({ id: 'edit', label: `Edit ${c.label}`, hint: 'F2', onSelect: () => setEditing({ rowId: ctx.rowId, colId: c.name }) })
        if (c.isSortable) {
            items.push({ type: 'separator', id: 's3' })
            items.push({ id: 'asc', label: 'Sort ascending', onSelect: () => patchState({ orderBy: c.name, page: 0 }) })
            items.push({ id: 'desc', label: 'Sort descending', onSelect: () => patchState({ orderBy: '-' + c.name, page: 0 }) })
        }
        if (f.selection) {
            const on = !!selection[ctx.rowId]
            items.push({ type: 'separator', id: 's4' })
            items.push({
                id: 'select',
                label: on ? 'Deselect row' : 'Select row',
                hint: 'Space',
                onSelect: () =>
                    setSelection((s) => {
                        const n = { ...s }
                        if (on) delete n[ctx.rowId]
                        else n[ctx.rowId] = true
                        return n
                    }),
            })
        }
        return items
    }

    // ---- toolbar popups -----------------------------------------------------------------------
    const [filterOpen, setFilterOpen] = useState(false)
    const [chooserOpen, setChooserOpen] = useState(false)
    const chooserBtn = useRef<HTMLButtonElement | null>(null)
    const defaults = useList({ table, columns: props.columns, view: props.view, query: 'sys_id=-1', limit: 1 }, { enabled: chooserOpen })
    const visibleOpts = ordered.map((c) => ({ id: c.name, label: c.label }))
    const hiddenOpts = (defaults.columns || []).filter((c: ListColumn) => !colByName.has(c.name)).map((c: ListColumn) => ({ id: c.name, label: c.label }))

    // ---- height -------------------------------------------------------------------------------
    const rootRef = useRef<HTMLDivElement | null>(null)
    const tableWrap = useRef<HTMLDivElement | null>(null)
    const wantFill = props.height === 'fill' || (props.height === undefined && variant === 'page')
    const fill = useFillHeight(tableWrap, wantFill)
    const scrollHeight = wantFill ? fill : typeof props.height === 'number' || (typeof props.height === 'string' && props.height !== 'auto') ? props.height : undefined
    const maxHeight = !wantFill && scrollHeight === undefined ? (infinite ? 600 : undefined) : undefined

    const filterCount = useMemo(() => parseQuery(state.filter).groups.reduce((n, g) => n + g.clauses.reduce((k, c) => k + c.length, 0), 0), [state.filter])
    const title = props.title || (page ? page.tableLabel : table)
    const nf = new Intl.NumberFormat()

    const selectedRows = selectedIds.map((id) => seen.current.get(id)).filter(Boolean) as ListRow[]
    const exportCsv = () => {
        const target = selectedRows.length ? selectedRows : rows
        const head = ordered.map((c) => csvEscape(c.label)).join(',')
        const body = target.map((r) => ordered.map((c) => csvEscape((r.cells[c.name] && (r.cells[c.name].displayValue || r.cells[c.name].value)) || '')).join(','))
        const blob = new Blob([[head].concat(body).join('\r\n')], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${table}.csv`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }

    const shell = cx(
        'rpl-list flex min-w-0 flex-col [contain:inline-size]',
        variant === 'card' ? 'overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm' : '',
        props.className,
    )
    const pad = variant === 'card' ? 'px-4' : variant === 'page' ? 'px-0' : 'px-0'
    const toolbarSlots = props.toolbarSlots
    const inHeader = !!toolbarSlots

    return (
        <section ref={rootRef} className={shell} aria-labelledby={f.title ? titleId : undefined} aria-label={f.title ? undefined : title} data-variant={variant}>
            {/* Toolbar: inline, or the title / actions portalled into a page header's slots (toolbarSlots). */}
            {(() => {
                const titleGroup = (
                    <>
                {f.title ? (
                    <div className="mr-auto flex min-w-0 items-baseline gap-2">
                        <h2 id={titleId} className={cx('truncate font-semibold tracking-tight', inHeader ? 'text-sm' : variant === 'page' ? 'text-xl' : 'text-base')}>
                            {title}
                        </h2>
                        <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                            {page ? `${nf.format(count)} record${count === 1 ? '' : 's'}` : ''}
                        </span>
                        {effective.isFetching && page ? <Spinner className="text-muted-foreground" label="Refreshing" /> : null}
                        {liveOn ? (
                            <span
                                className={cx('inline-flex items-center gap-1 self-center text-xs transition-colors', justUpdated ? 'text-primary' : 'text-muted-foreground')}
                                title="Live: this list refreshes when records change"
                                data-rp-live={justUpdated ? 'updated' : 'on'}
                            >
                                <span className={cx('size-1.5 rounded-full', justUpdated ? 'bg-primary' : 'bg-emerald-500/70')} aria-hidden="true" />
                                <span aria-live="polite">{justUpdated ? 'Updated' : 'Live'}</span>
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <span className="mr-auto" />
                )}
                    </>
                )
                const actionGroup = (
                    <>
                {f.search ? (
                    <label className={cx('relative flex items-center', inHeader ? 'h-7 w-40 min-w-0 lg:w-56' : 'h-8 w-full sm:w-64')}>
                        <span className="sr-only">Search {title}</span>
                        <IconSearch size={14} className="pointer-events-none absolute left-2.5 text-muted-foreground" />
                        <input
                            type="search"
                            value={searchText}
                            onChange={(e: any) => setSearchText(e.target.value)}
                            onKeyDown={(e: any) => {
                                if (e.key === 'Enter') patchState({ keywords: searchText, page: 0 })
                                if (e.key === 'Escape' && searchText) {
                                    e.preventDefault()
                                    setSearchText('')
                                }
                            }}
                            placeholder="Search"
                            className="h-full w-full rounded-md border border-input bg-background pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                    </label>
                ) : null}
                {f.filter ? (
                    <button type="button" className={tbBtn(filterOpen, inHeader)} aria-expanded={filterOpen} aria-controls={filterPanelId} onClick={() => setFilterOpen(!filterOpen)}>
                        <FilterIcon /> Filter
                        {filterCount ? <span className="rounded-full bg-primary px-1.5 text-[11px] leading-4 font-medium text-primary-foreground">{filterCount}</span> : null}
                    </button>
                ) : null}
                {f.columnChooser ? (
                    <>
                        <button ref={chooserBtn} type="button" className={tbBtn(chooserOpen, inHeader)} aria-expanded={chooserOpen} aria-haspopup="dialog" onClick={() => setChooserOpen(!chooserOpen)}>
                            <ColumnsIcon /> <span className={inHeader ? 'sr-only xl:not-sr-only' : ''}>Columns</span>
                        </button>
                        <Popup anchor={chooserBtn} open={chooserOpen} onDismiss={() => setChooserOpen(false)} matchWidth={false} minWidth={320} maxHeight={560} role="dialog" aria-label="Personalize list" className="p-2">
                            <div
                                onKeyDown={(e: any) => {
                                    if (e.key === 'Escape' && !e.defaultPrevented) {
                                        setChooserOpen(false)
                                        if (chooserBtn.current) chooserBtn.current.focus()
                                    }
                                }}
                            >
                                <ColumnChooser
                                    table={table}
                                    visible={visibleOpts}
                                    hidden={hiddenOpts}
                                    onChange={(ids) => setPrefs((p) => ({ ...p, columns: ids }))}
                                    density={density}
                                    onDensityChange={(d) => setPrefs((p) => ({ ...p, density: d }))}
                                    wrap={wrap}
                                    onWrapChange={(w) => setPrefs((p) => ({ ...p, wrap: w }))}
                                    onReset={reset}
                                />
                            </div>
                        </Popup>
                    </>
                ) : null}
                {f.export ? (
                    <button type="button" className={tbBtn(false, inHeader)} onClick={exportCsv} title={selectedRows.length ? 'Export the selected rows' : 'Export this page'}>
                        <DownloadIcon /> <span className={inHeader ? 'sr-only xl:not-sr-only' : 'sr-only sm:not-sr-only'}>Export</span>
                    </button>
                ) : null}
                {f.refresh ? (
                    <button type="button" className={cx(tbBtn(false, inHeader), 'px-2')} onClick={refresh} aria-label="Refresh">
                        <RefreshIcon spinning={effective.isFetching} />
                    </button>
                ) : null}
                    </>
                )
                if (toolbarSlots)
                    return (
                        <>
                            {toolbarSlots.left(titleGroup)}
                            {toolbarSlots.right(actionGroup)}
                        </>
                    )
                return (
                    <div className={cx('flex flex-wrap items-center gap-2', pad, variant === 'card' ? 'pt-4 pb-3' : 'pb-3')}>
                        {titleGroup}
                        {actionGroup}
                    </div>
                )
            })()}

            {f.breadcrumbs && (state.filter || state.keywords) ? (
                <div className={cx(pad, 'pb-2')}>
                    <FilterBreadcrumbs
                        table={table}
                        query={state.filter}
                        onChange={(q) => patchState({ filter: q, page: 0 })}
                        keywords={state.keywords}
                        onClearKeywords={() => {
                            setSearchText('')
                            patchState({ keywords: '', page: 0 })
                        }}
                        onEdit={f.filter ? () => setFilterOpen(true) : undefined}
                    />
                </div>
            ) : null}

            {f.filter && filterOpen ? (
                <div id={filterPanelId} className={cx(pad, 'pb-3')}>
                    <ConditionBuilder
                        table={table}
                        value={state.filter}
                        onApply={(q) => {
                            patchState({ filter: q, page: 0 })
                            setFilterOpen(false)
                        }}
                        onCancel={() => setFilterOpen(false)}
                    />
                </div>
            ) : null}

            {f.selection && f.actions && selectedIds.length ? (
                <SelectionBar
                    table={table}
                    count={selectedIds.length}
                    rows={selectedRows}
                    columns={ordered.filter(isEditableColumn)}
                    actions={props.actions || []}
                    onClear={() => setSelection({})}
                    refresh={refresh}
                    className={pad}
                />
            ) : null}

            <div ref={tableWrap} className={cx('min-h-0', variant === 'card' ? 'border-t border-border' : 'overflow-hidden rounded-lg border border-border bg-card')}>
                {effective.error ? (
                    <div role="alert" className="p-6 text-sm text-destructive">
                        {(effective.error as Error).message}
                    </div>
                ) : (
                    <DataTable<ListRow>
                        label={title}
                        columns={gridColumns}
                        rows={rows}
                        getRowId={getRowId}
                        getValue={getCell}
                        sorting={sorting.length ? sorting : page && page.orderBy ? [{ id: page.orderBy.field, desc: page.orderBy.desc }] : []}
                        onSortingChange={(s) => patchState({ orderBy: sortToOrder(s), page: 0 })}
                        selectable={f.selection}
                        selection={selection}
                        onSelectionChange={setSelection}
                        columnSizing={prefs.widths}
                        onColumnResizeEnd={(w) => setPrefs((p) => ({ ...p, widths: w }))}
                        density={density}
                        wrap={wrap}
                        height={scrollHeight}
                        maxHeight={maxHeight}
                        virtualize={infinite ? true : 'auto'}
                        onEndReached={infinite ? () => scrolled.hasNextPage && !scrolled.isFetchingNextPage && scrolled.fetchNextPage() : undefined}
                        totalRows={count}
                        rowIndexOffset={infinite ? 0 : state.page * pageSize}
                        loading={effective.isLoading}
                        fetching={effective.isFetching}
                        skeletonRows={Math.min(pageSize, 10)}
                        empty={<EmptyState text={props.emptyText} filtered={!!(state.filter || state.keywords)} onClear={() => patchState({ filter: '', keywords: '', page: 0 })} />}
                        onRowOpen={openRecord}
                        contextMenu={f.contextMenu ? contextMenu : undefined}
                        canEditCell={f.inlineEdit ? canEditCell : undefined}
                        onEditRequest={f.inlineEdit ? (ctx) => setEditing({ rowId: ctx.rowId, colId: ctx.column.id }) : undefined}
                        editing={editing}
                        onEditorDismiss={() => setEditing(null)}
                        highlighted={updated}
                        renderEditor={(ctx) => {
                            const c = colByName.get(ctx.column.id)
                            if (!c) return null
                            return (
                                <CellEditor
                                    table={table}
                                    row={ctx.row}
                                    column={c}
                                    write={async (value, displayValue) => {
                                        const res = await write({ table, sysIds: [ctx.row.sysId], values: [{ column: c.name, value, displayValue }] })
                                        if (res.ok) toast.success(`${c.label} updated on ${ctx.row.display || 'the record'}`)
                                        for (const m of res.info) toast(m)
                                        return res
                                    }}
                                    onDone={() => setEditing(null)}
                                />
                            )
                        }}
                        footer={
                            infinite && scrolled.isFetchingNextPage ? (
                                <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                                    <Spinner label="Loading more" /> Loading more…
                                </div>
                            ) : null
                        }
                    />
                )}
            </div>

            {f.pagination && !infinite ? (
                <div className={cx(pad, variant === 'card' ? 'border-t border-border py-2' : 'pt-3')}>
                    <Pagination
                        page={state.page}
                        pageSize={pageSize}
                        total={count}
                        onPageChange={(p) => patchState({ page: p })}
                        pageSizes={props.pageSizes || [10, 20, 50, 100, 500]}
                        onPageSizeChange={(n) => {
                            setPrefs((p) => ({ ...p, pageSize: n }))
                            patchState({ page: 0 })
                        }}
                    />
                </div>
            ) : infinite && f.pagination ? (
                <div className={cx(pad, 'py-2 text-xs text-muted-foreground tabular-nums')} aria-live="polite">
                    {nf.format(rows.length)} of {nf.format(count)} loaded
                </div>
            ) : null}
        </section>
    )
}

const getRowId = (r: ListRow) => r.sysId
const getCell = (r: ListRow, col: string) => r.cells[col]

function copy(text: string) {
    try {
        navigator.clipboard.writeText(text).then(() => toast.success('Copied'))
    } catch (e) {
        toast.error('Copy is not available here')
    }
}

function tbBtn(active: boolean, compact?: boolean) {
    return cx(
        compact ? 'h-7 px-2' : 'h-8 px-2.5',
        'inline-flex items-center gap-1.5 rounded-md border text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
    )
}

function EmptyState({ text, filtered, onClear }: { text?: string; filtered: boolean; onClear: () => void }) {
    return (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <IconSearch size={18} />
            </span>
            <span className="text-sm font-medium">{text || (filtered ? 'No records match this filter' : 'No records yet')}</span>
            {filtered ? (
                <button type="button" className="text-sm text-primary underline-offset-2 hover:underline" onClick={onClear}>
                    Clear the filter
                </button>
            ) : null}
        </div>
    )
}

/** Bulk bar: count, clear, "Edit field…" (writeMultiRow over the editable records), custom actions. */
function SelectionBar(props: { table: string; count: number; rows: ListRow[]; columns: ListColumn[]; actions: ListAction[]; onClear: () => void; refresh: () => void; className?: string }) {
    const [editOpen, setEditOpen] = useState(false)
    const [column, setColumn] = useState('')
    const [value, setValue] = useState<{ v: string; d: string } | null>(null)
    const [busy, setBusy] = useState(false)
    const btnRef = useRef<HTMLButtonElement | null>(null)
    const { write } = useCellWrite()
    const col = props.columns.find((c) => c.name === column)
    const sysIds = props.rows.map((r) => r.sysId)
    const apply = async () => {
        if (!col || !value) return
        setBusy(true)
        try {
            const perms = await fetchEditability({ table: props.table, column: col.name, sysIds, fieldType: col.type })
            const ok = sysIds.filter((id) => perms[id] && perms[id].canEdit)
            if (!ok.length) {
                toast.error(`You can’t edit ${col.label} on the selected records`)
                return
            }
            const res = await write({ table: props.table, sysIds: ok, values: [{ column: col.name, value: value.v, displayValue: value.d }] })
            const skipped = sysIds.length - ok.length + res.failed.length
            if (res.written.length) toast.success(`${col.label} updated on ${res.written.length} record${res.written.length === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}`)
            for (const m of res.errors) toast.error(m)
            setEditOpen(false)
            setValue(null)
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setBusy(false)
        }
    }
    return (
        <div className={cx('flex flex-wrap items-center gap-2 pb-2', props.className)} role="region" aria-label="Selected records">
            <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-foreground tabular-nums" aria-live="polite">
                {props.count} selected
            </span>
            <button type="button" className={tbBtn(false)} onClick={props.onClear}>
                <IconX size={14} /> Clear
            </button>
            {props.columns.length ? (
                <>
                    <button ref={btnRef} type="button" className={tbBtn(editOpen)} aria-expanded={editOpen} aria-haspopup="dialog" onClick={() => setEditOpen(!editOpen)}>
                        Edit field…
                    </button>
                    <Popup anchor={btnRef} open={editOpen} onDismiss={() => !busy && setEditOpen(false)} matchWidth={false} minWidth={300} maxHeight={480} role="dialog" aria-label="Edit the selected records" className="p-3">
                        <div className="rpl-bare flex flex-col gap-3" onKeyDown={(e: any) => e.key === 'Escape' && !e.defaultPrevented && setEditOpen(false)}>
                            <span className="text-sm font-medium">Set a field on {props.rows.length} record{props.rows.length === 1 ? '' : 's'}</span>
                            <Select aria-label="Field to set" size="sm" value={column} placeholder="Choose a field" items={props.columns.map((c) => ({ value: c.name, label: c.label }))} onChange={(i) => { setColumn(i.value); setValue(null) }} />
                            {col ? <FieldControl key={col.name} name={col.name} table={props.table} label={`New ${col.label}`} standalone value={value ? value.v : ''} displayValue={value ? value.d : ''} size="sm" onChange={(v: string, d: string) => setValue({ v, d })} /> : null}
                            <div className="flex justify-end gap-2">
                                <button type="button" className={tbBtn(false)} onClick={() => setEditOpen(false)} disabled={busy}>
                                    Cancel
                                </button>
                                <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={!col || !value || busy} onClick={apply}>
                                    {busy ? <Spinner label="Saving" /> : null} Apply
                                </button>
                            </div>
                        </div>
                    </Popup>
                </>
            ) : null}
            {props.actions.map((a) => (
                <button
                    key={a.id}
                    type="button"
                    className={cx(tbBtn(false), a.destructive ? 'text-destructive' : '')}
                    onClick={() => a.run({ table: props.table, rows: props.rows, sysIds, refresh: props.refresh, clearSelection: props.onClear })}
                >
                    {a.label}
                </button>
            ))}
        </div>
    )
}

function FilterIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
    )
}
function ColumnsIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18" />
        </svg>
    )
}
function DownloadIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
    )
}
function RefreshIcon({ spinning }: { spinning?: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={spinning ? 'rpf-spin' : ''}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5" />
        </svg>
    )
}
