import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUser, useInViewOnce } from '@portal/runtime'
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components:tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from 'components:collapsible'
import { cx, IconChevronDown, Spinner } from 'components:app/field'
import { RelatedList, useRelatedLists } from 'components:app/related-list'
import type { RelatedListActions, OpenRecord, RelatedListInfo } from 'components:app/related-list'
import { fetchUserPreferenceValue, saveUserPreferenceValue } from 'utilities:app/list-data'

export type RelatedListsLayout = 'tabs' | 'stacked' | 'single'

export type RelatedListsOptions = {
    table: string
    sysId: string
    /** The parent's form view ('' = the default / the platform's resolution). */
    view?: string
    /** Lists already loaded (a form bootstrap's relatedLists): no first metadata request. */
    lists?: RelatedListInfo[]
    /** Only these lists (names), in this order. */
    include?: string[]
    /** Leave these lists out (names). */
    exclude?: string[]
    /** Display filter, e.g. g_form.hideRelatedList state (isRelatedListShown from utilities:app/gform). */
    isShown?: (name: string) => boolean
    enabled?: boolean
}

export type VisibleRelatedList = { list: RelatedListInfo; count: number }

/**
 * The record's related lists to show: from the metadata (or `lists`), filtered by include / exclude /
 * isShown, omit-if-empty honoured against the freshest count (the list's own, once it loaded).
 * `setCount(name, n)` takes a list's live count; `refresh()` refetches the counts.
 */
export function useVisibleRelatedLists(o: RelatedListsOptions) {
    const meta = useRelatedLists(o.table, o.sysId, o.view || '', { initial: o.lists, enabled: o.enabled })
    const [counts, setCounts] = useState<Record<string, number>>({})
    // New metadata (a refetch after Add / Remove / a save) is the truth again.
    useEffect(() => setCounts({}), [meta.lists])
    const setCount = useCallback((name: string, n: number) => setCounts((c) => (c[name] === n ? c : { ...c, [name]: n })), [])
    const include = o.include && o.include.length ? o.include.map((n) => n.toLowerCase()) : null
    const exclude = (o.exclude || []).map((n) => n.toLowerCase())
    const visible: VisibleRelatedList[] = useMemo(() => {
        let lists = meta.lists.slice()
        if (include) lists = include.map((n) => lists.find((l) => l.name.toLowerCase() === n)).filter(Boolean) as RelatedListInfo[]
        return lists
            .filter((l) => exclude.indexOf(l.name.toLowerCase()) < 0)
            .filter((l) => !o.isShown || o.isShown(l.name))
            .map((l) => ({ list: l, count: counts[l.name] !== undefined ? counts[l.name] : l.count }))
            .filter((v) => !(v.list.omitIfEmpty && v.count === 0))
    }, [meta.lists, counts, (include || []).join(','), exclude.join(','), o.isShown])
    return { visible, all: meta.lists, setCount, refresh: meta.refetch, isLoading: meta.isLoading, error: meta.error, view: meta.view }
}

/** A count pill (tabs, headings); unknown counts (-1) show nothing. */
export function RelatedCount({ count, className }: { count: number; className?: string }) {
    if (count < 0) return null
    return (
        <span className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums', className)} data-rp-related-count={count}>
            {new Intl.NumberFormat().format(count)}
            <span className="sr-only"> record{count === 1 ? '' : 's'}</span>
        </span>
    )
}

export type RelatedListsProps = RelatedListsOptions & {
    /** 'tabs' (default): one tab per list; 'stacked': collapsible sections; 'single': one list (`name`, else the first). */
    layout?: RelatedListsLayout
    /** For layout 'single': the list to show. */
    name?: string
    /** A heading over the group ('Related lists'); omit for none. */
    heading?: string
    recordPage?: string
    onOpenRecord?: OpenRecord
    actions?: boolean | RelatedListActions
    readOnly?: boolean
    live?: boolean
    pageSize?: number
    /** Tabs: the selected list (controlled) and its change. */
    value?: string
    onValueChange?: (name: string) => void
    /** Text when the record has no related lists to show (default: nothing is rendered). */
    emptyText?: string
    className?: string
}

/** Tab value of a related list (also used by app/form-tabs' extra tabs and `tab=` in q). */
export function relatedTabValue(name: string): string {
    return 'rl:' + name
}

/**
 * RelatedLists: every related list of a record, as tabs (one per list, counts on the tabs), stacked
 * collapsible sections, or a single list. Lazy: a list's rows load only once its tab is selected or
 * its section is open and on screen. Omit-if-empty is honoured; counts follow each list's own count
 * once it loaded, and refetch after New / Add / Remove.
 */
export function RelatedLists(props: RelatedListsProps) {
    const layout = props.layout || 'tabs'
    const data = useVisibleRelatedLists(props)
    const { visible } = data
    const common = {
        parentTable: props.table,
        parentSysId: props.sysId,
        view: data.view,
        recordPage: props.recordPage,
        onOpenRecord: props.onOpenRecord,
        actions: props.actions,
        readOnly: props.readOnly,
        live: props.live,
        pageSize: props.pageSize,
    }
    if (!props.sysId || props.sysId === '-1') return null
    if (data.error) return <div role="alert" className="text-sm text-destructive">{data.error.message}</div>
    if (data.isLoading && !visible.length)
        return (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground" aria-busy="true" data-rp-related-lists="loading">
                <Spinner label="Loading related lists" /> Loading related lists…
            </div>
        )
    if (!visible.length) return props.emptyText ? <p className="m-0 text-sm text-muted-foreground" data-rp-related-lists="empty">{props.emptyText}</p> : null
    const heading = props.heading ? <h3 className="m-0 text-base leading-6 font-semibold tracking-tight">{props.heading}</h3> : null

    if (layout === 'single') {
        const wanted = props.name ? visible.find((v) => v.list.name.toLowerCase() === props.name!.toLowerCase()) : visible[0]
        if (!wanted) return props.emptyText ? <p className="m-0 text-sm text-muted-foreground">{props.emptyText}</p> : null
        return (
            <div className={cx('flex min-w-0 flex-col gap-3', props.className)} data-rp-related-lists="single">
                {heading}
                <RelatedList list={wanted.list} {...common} onCount={(n) => data.setCount(wanted.list.name, n)} onChanged={() => data.refresh()} />
            </div>
        )
    }
    if (layout === 'stacked') return <StackedLists {...props} visible={visible} heading={heading} common={common} setCount={data.setCount} refresh={() => data.refresh()} />
    return <TabbedLists {...props} visible={visible} heading={heading} common={common} setCount={data.setCount} refresh={() => data.refresh()} />
}

type InnerProps = RelatedListsProps & { visible: VisibleRelatedList[]; heading: any; common: any; setCount: (name: string, n: number) => void; refresh: () => void }

function TabbedLists(props: InnerProps) {
    const { visible } = props
    const [local, setLocal] = useState('')
    const wanted = props.value !== undefined ? props.value : local
    const value = visible.some((v) => relatedTabValue(v.list.name) === wanted) ? wanted : relatedTabValue(visible[0].list.name)
    const select = (v: string) => {
        setLocal(v)
        if (props.onValueChange) props.onValueChange(v.replace(/^rl:/, ''))
    }
    return (
        <div className={cx('flex min-w-0 flex-col gap-3', props.className)} data-rp-related-lists="tabs">
            {props.heading}
            <Tabs value={value} onValueChange={(v: string) => select(String(v))} className="gap-3">
                {/* w-0 + min-w-full: the strip scrolls sideways on narrow screens instead of widening the page. */}
                <div className="w-0 min-w-full overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                    <TabsList variant="line" aria-label="Related lists" className="h-auto min-w-full justify-start gap-1 border-b border-border p-0">
                        {visible.map(({ list, count }) => (
                            <TabsTrigger key={list.name} value={relatedTabValue(list.name)} className="h-9 flex-none px-3" data-rp-related-tab={list.name}>
                                {list.label}
                                <RelatedCount count={count} />
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {visible.map(({ list }) => (
                    // Not keepMounted: only the selected list exists (its query runs when the tab is chosen).
                    <TabsContent key={list.name} value={relatedTabValue(list.name)} className="min-w-0" data-rp-related-panel={list.name}>
                        <RelatedList list={list} {...props.common} title={false} onCount={(n: number) => props.setCount(list.name, n)} onChanged={props.refresh} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

/** Open sections per user + table (x_312987_portal.related.<table>.open), mirrored in localStorage. */
export function useOpenRelatedLists(table: string) {
    const user = useUser() as { sysId?: string }
    const userId = (user && user.sysId) || ''
    const name = `x_312987_portal.related.${String(table).replace(/[^A-Za-z0-9_]/g, '_')}.open`
    const storageKey = `rp-pref:${userId}:${name}`
    const read = (): string[] => {
        try {
            const v = JSON.parse(localStorage.getItem(storageKey) || '[]')
            return Array.isArray(v) ? v.map(String) : []
        } catch (e) {
            return []
        }
    }
    const [open, setOpen] = useState<string[]>(read)
    const touched = useRef(false)
    useEffect(() => {
        if (!userId) return
        let gone = false
        fetchUserPreferenceValue(userId, name)
            .then((v) => {
                if (gone || touched.current || v === null) return
                try {
                    const list = JSON.parse(v || '[]')
                    if (Array.isArray(list)) setOpen(list.map(String))
                } catch (e) {
                    /* ignore */
                }
            })
            .catch(() => {})
        return () => {
            gone = true
        }
    }, [userId, name])
    const timer = useRef<any>(0)
    const toggle = useCallback(
        (list: string, on: boolean) => {
            touched.current = true
            setOpen((prev) => {
                const next = on ? Array.from(new Set(prev.concat(list))) : prev.filter((n) => n !== list)
                try {
                    localStorage.setItem(storageKey, JSON.stringify(next))
                } catch (e) {
                    /* storage blocked */
                }
                clearTimeout(timer.current)
                timer.current = setTimeout(() => saveUserPreferenceValue(name, JSON.stringify(next)).catch(() => {}), 600)
                return next
            })
        },
        [storageKey, name],
    )
    return { open, isOpen: (n: string) => open.indexOf(n) >= 0, toggle }
}

function StackedLists(props: InnerProps) {
    const prefs = useOpenRelatedLists(props.table)
    return (
        <div className={cx('flex min-w-0 flex-col gap-2', props.className)} data-rp-related-lists="stacked">
            {props.heading}
            {props.visible.map(({ list, count }) => (
                <StackedList key={list.name} list={list} count={count} open={prefs.isOpen(list.name)} onOpenChange={(o) => prefs.toggle(list.name, o)} {...props} />
            ))}
        </div>
    )
}

function StackedList(props: InnerProps & { list: RelatedListInfo; count: number; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { list, count, open } = props
    // Lazy: the rows load once the section is open AND on screen.
    const [ref, inView] = useInViewOnce({ rootMargin: '200px' }) as [any, boolean]
    const uid = list.name.replace(/[^A-Za-z0-9_-]/g, '_')
    return (
        <Collapsible open={open} onOpenChange={(o: boolean) => props.onOpenChange(o)} render={<section aria-labelledby={`rp-rl-${uid}`} className="flex flex-col gap-2 border-t border-border pt-2 first-of-type:border-t-0" data-rp-related-section={list.name} />}>
            <h3 id={`rp-rl-${uid}`} className="m-0 text-base leading-6 font-semibold tracking-tight text-foreground">
                <CollapsibleTrigger
                    className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    data-rp-related-toggle={list.name}
                >
                    <IconChevronDown size={18} aria-hidden="true" className={cx('shrink-0 text-muted-foreground transition-transform', open ? '' : '-rotate-90')} />
                    <span className="min-w-0 flex-1 truncate">{list.label}</span>
                    <RelatedCount count={count} />
                </CollapsibleTrigger>
            </h3>
            <CollapsibleContent className="-mx-1 -mb-1 px-1 pb-1">
                <div ref={ref} className="min-w-0">
                    {open && inView ? <RelatedList list={list} {...props.common} title={false} onCount={(n: number) => props.setCount(list.name, n)} onChanged={props.refresh} /> : <div className="h-24" aria-hidden="true" />}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

export type RelatedListTab = { value: string; name: string; label: string; count: number; list: RelatedListInfo; render: () => any }

/**
 * Related lists as tab descriptors, for a tab strip you own (app/form-tabs' extraTabs in a record
 * form's tabs presentation): each tab renders its RelatedList lazily (call render() only for the
 * selected tab).
 */
export function useRelatedListTabs(o: RelatedListsOptions & Omit<RelatedListsProps, 'layout' | 'heading' | 'value' | 'onValueChange' | 'emptyText' | 'className' | 'name'>) {
    const data = useVisibleRelatedLists(o)
    const tabs: RelatedListTab[] = data.visible.map(({ list, count }) => ({
        value: relatedTabValue(list.name),
        name: list.name,
        label: list.label,
        count,
        list,
        render: () => (
            <RelatedList
                list={list}
                parentTable={o.table}
                parentSysId={o.sysId}
                view={data.view}
                title={false}
                recordPage={o.recordPage}
                onOpenRecord={o.onOpenRecord}
                actions={o.actions}
                readOnly={o.readOnly}
                live={o.live}
                pageSize={o.pageSize}
                onCount={(n) => data.setCount(list.name, n)}
                onChanged={() => data.refresh()}
            />
        ),
    }))
    return { tabs, isLoading: data.isLoading, error: data.error, refresh: data.refresh }
}
