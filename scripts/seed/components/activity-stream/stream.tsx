import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@portal/runtime'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from 'components:dropdown-menu'
import { cx, Spinner } from 'components:app/field'
import { useActivity, useActivityFilters, groupByDay, useNow } from 'utilities:app/activity'
import type { ActivityFilters, ActivityFilterState, ActivityKind } from 'utilities:app/activity'
import { useUserTimeZone, useLocale } from 'utilities:app/datetime'
import { ActivityEntryView, entryLabel } from './entry'
import type { AttachmentRenderer } from './entry'

export type ActivityStreamProps = {
    table: string
    sysId: string
    /** Form view scoping the platform's filter configuration ('' = default). */
    view?: string
    /** Heading text ('' hides it). Default "Activity". */
    title?: string
    /** Heading level of the title (default 3). */
    headingLevel?: 2 | 3 | 4
    /** Show the filter chips (default true). */
    showFilters?: boolean
    /** Filters applied first (e.g. only comments for a requester-facing card). */
    initialFilters?: ActivityFilters
    /** Kinds offered at all (others never show). Default: everything. */
    kinds?: ActivityKind[]
    /** Entries per page before "Show more" (default 20). */
    pageSize?: number
    /** Group entries under day headings (default true). */
    groupByDay?: boolean
    /** Live updates over AMB (default true). */
    live?: boolean
    compact?: boolean
    emptyText?: string
    renderAttachment?: AttachmentRenderer
    className?: string
}

const KIND_ICON: Record<string, string> = { audit: 'pencil-line', attachment: 'paperclip', email: 'mail', relation: 'link', other: 'circle-dot' }

/** The filter chips: one per journal field (work notes, comments), then field changes, attachments, emails… */
export function ActivityFilterBar({ state, kinds }: { state: ActivityFilterState; kinds?: ActivityKind[] }) {
    const allow = (k: ActivityKind) => !kinds || kinds.indexOf(k) >= 0
    const journalChips = allow('journal') ? state.journalFields.filter((f) => f.count > 0) : []
    const kindChips = state.kinds.filter((k) => k.kind !== 'journal' && allow(k.kind))
    const auditOn = kindChips.some((k) => k.kind === 'audit' && k.selected)
    if (journalChips.length + kindChips.length < 2 && !state.fields.length) return null
    const chip = (key: string, label: string, count: number, on: boolean, icon: string, toggle: () => void, internal?: boolean) => (
        <button
            key={key}
            type="button"
            aria-pressed={on}
            data-rp-activity-filter={key}
            onClick={toggle}
            className={cx(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                on ? (internal ? 'border-amber-500/50 bg-amber-500/15 text-foreground' : 'border-primary/40 bg-primary/10 text-foreground') : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
        >
            <Icon name={on ? 'check' : icon} className="size-3" aria-hidden="true" />
            {label}
            <span className="tabular-nums opacity-70">{count}</span>
        </button>
    )
    return (
        <div role="group" aria-label="Filter activity" className="flex flex-wrap items-center gap-1.5" data-rp-activity-filters="">
            {journalChips.map((f) => chip(`journal:${f.value}`, f.label, f.count, f.selected, /work_notes/.test(f.value) ? 'lock' : 'message-square', () => state.toggleJournalField(f.value), /work_notes/.test(f.value)))}
            {kindChips.map((k) => chip(k.kind, k.label, k.count, k.selected, KIND_ICON[k.kind] || 'circle-dot', () => state.toggleKind(k.kind)))}
            {state.fields.length && auditOn ? (
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="xs" data-rp-activity-fields="" />}>
                        <Icon name="list-filter" aria-hidden="true" /> Fields
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                        <DropdownMenuLabel>Field changes shown</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {state.fields.map((f) => (
                            <DropdownMenuCheckboxItem key={f.value} checked={f.selected} closeOnClick={false} onCheckedChange={() => state.toggleField(f.value)}>
                                <span className="flex-1">{f.label}</span>
                                {f.count ? <span className="text-xs text-muted-foreground tabular-nums">{f.count}</span> : null}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
            {!state.isDefault ? (
                <Button type="button" variant="ghost" size="xs" onClick={state.reset} data-rp-activity-reset="">
                    Reset
                </Button>
            ) : null}
        </div>
    )
}

/** Move focus between feed articles (WAI-ARIA feed: Page Down / Page Up; plus arrows, Home / End on an article). */
function feedKeyDown(e: any, feed: HTMLElement | null, after: HTMLElement | null, before: HTMLElement | null, onEnd: () => void) {
    if (!feed) return
    const target = e.target as HTMLElement
    const article = target.closest ? (target.closest('article[data-rp-activity-entry]') as HTMLElement | null) : null
    if (!article) return
    const onArticle = target === article
    const list = Array.from(feed.querySelectorAll('article[data-rp-activity-entry]')) as HTMLElement[]
    const i = list.indexOf(article)
    const go = (el: HTMLElement | undefined | null) => {
        if (!el) return
        e.preventDefault()
        el.focus()
        if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
    }
    if (e.key === 'PageDown' || (onArticle && e.key === 'ArrowDown')) {
        if (i === list.length - 1) {
            e.preventDefault()
            onEnd()
        } else go(list[i + 1])
    } else if (e.key === 'PageUp' || (onArticle && e.key === 'ArrowUp')) go(list[i - 1])
    else if (onArticle && e.key === 'Home' && !e.ctrlKey) go(list[0])
    else if (onArticle && e.key === 'End' && !e.ctrlKey) go(list[list.length - 1])
    else if (e.ctrlKey && e.key === 'End') go(after)
    else if (e.ctrlKey && e.key === 'Home') go(before)
}

/**
 * A record's activity as an accessible feed: journal entries (work notes tinted), field changes
 * (old → new), attachments, emails; filter chips, day headings, relative times, "Show more"
 * paging, and live arrivals (highlighted and announced).
 */
export function ActivityStream(props: ActivityStreamProps) {
    const { table, sysId } = props
    const pageSize = props.pageSize || 20
    const filterState = useActivityFilters(table, sysId, { view: props.view, initial: props.initialFilters })
    const kindsFilter = props.kinds
    const filters = useMemo<ActivityFilters>(() => {
        const f = { ...filterState.filters }
        if (kindsFilter) f.kinds = (f.kinds || kindsFilter).filter((k) => kindsFilter.indexOf(k) >= 0)
        return f
    }, [filterState.filters, kindsFilter])
    const activity = useActivity(table, sysId, { filters, view: props.view, live: props.live })
    const now = useNow(60_000)
    const tz = useUserTimeZone()
    const locale = useLocale()
    const user = useUser() as any
    const [shown, setShown] = useState(pageSize)
    useEffect(() => setShown(pageSize), [filters, pageSize])
    const feed = useRef<HTMLDivElement | null>(null)
    const before = useRef<HTMLDivElement | null>(null)
    const after = useRef<HTMLDivElement | null>(null)

    // Live arrivals: highlighted for a few seconds and announced politely.
    const [fresh, setFresh] = useState<string[]>([])
    const [announce, setAnnounce] = useState('')
    const seen = useRef(0)
    useEffect(() => {
        const list = activity.arrived
        if (list.length <= seen.current) {
            seen.current = list.length
            return
        }
        const added = list.slice(seen.current)
        seen.current = list.length
        setFresh((f) => f.concat(added))
        const first = activity.allEntries.find((e) => e.key === added[added.length - 1])
        if (first && !(user && user.userName && first.createdBy === user.userName)) setAnnounce(`New activity: ${entryLabel(first)} by ${first.author.displayName}`)
        const t = setTimeout(() => setFresh((f) => f.filter((k) => added.indexOf(k) < 0)), 6000)
        return () => clearTimeout(t)
    }, [activity.arrived])

    const entries = activity.entries
    const visible = entries.slice(0, shown)
    const groups = props.groupByDay === false ? [{ key: 'all', label: '', entries: visible }] : groupByDay(visible, { now, timeZone: tz, locale })
    const Heading: any = `h${props.headingLevel || 3}`
    const title = props.title === undefined ? 'Activity' : props.title
    let position = 0
    const showMore = () => {
        const next = Math.min(entries.length, shown + pageSize)
        const firstNew = shown
        setShown(next)
        // Keep keyboard users in place: focus the first newly shown entry.
        setTimeout(() => {
            const list = feed.current ? (Array.from(feed.current.querySelectorAll('article[data-rp-activity-entry]')) as HTMLElement[]) : []
            if (list[firstNew]) list[firstNew].focus()
        }, 0)
    }
    return (
        <section className={cx('flex min-w-0 flex-col gap-3', props.className)} aria-label={title ? undefined : 'Activity'} aria-labelledby={title ? `${sysId}-activity-title` : undefined} data-rp-activity-stream={`${table}:${sysId}`}>
            <div ref={before} tabIndex={-1} className="flex flex-wrap items-center justify-between gap-2 outline-none">
                {title ? (
                    <Heading id={`${sysId}-activity-title`} className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
                        {title}
                        {activity.data ? <span className="rounded-full bg-muted px-1.5 py-px text-xs font-medium text-muted-foreground tabular-nums">{entries.length}</span> : null}
                        {activity.fetching && !activity.loading ? <Spinner className="text-muted-foreground" label="Refreshing activity" /> : null}
                    </Heading>
                ) : null}
            </div>
            {props.showFilters !== false && activity.data ? <ActivityFilterBar state={filterState} kinds={props.kinds} /> : null}
            {activity.loading ? (
                <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading activity">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex gap-3 p-3">
                            <span className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                            <div className="flex flex-1 flex-col gap-2">
                                <span className="h-3.5 w-40 animate-pulse rounded bg-muted" />
                                <span className="h-3.5 w-full animate-pulse rounded bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : activity.error ? (
                <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    <Icon name="triangle-alert" className="size-4" aria-hidden="true" />
                    The activity could not be loaded.
                    <Button type="button" variant="outline" size="xs" className="ml-auto" onClick={activity.refetch}>
                        Retry
                    </Button>
                </div>
            ) : !entries.length ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground" data-rp-activity-empty="">
                    {activity.allEntries.length ? 'No activity matches the filters.' : props.emptyText || 'No activity yet.'}
                </p>
            ) : (
                <div
                    ref={feed}
                    role="feed"
                    aria-busy={activity.fetching}
                    aria-label={`${title || 'Activity'}, ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
                    className="flex flex-col gap-2"
                    onKeyDown={(e) => feedKeyDown(e, feed.current, after.current, before.current, () => (shown < entries.length ? showMore() : after.current && after.current.focus()))}
                >
                    {groups.map((g) => (
                        <Fragment key={g.key}>
                            {g.label ? (
                                <div aria-hidden="true" className="flex items-center gap-3 pt-2 text-xs font-medium text-muted-foreground first:pt-0" data-rp-activity-day={g.key}>
                                    <span>{g.label}</span>
                                    <span className="h-px flex-1 bg-border" />
                                </div>
                            ) : null}
                            {g.entries.map((e) => {
                                position += 1
                                return (
                                    <ActivityEntryView
                                        key={e.key}
                                        entry={e}
                                        now={now}
                                        locale={locale}
                                        position={position}
                                        setSize={entries.length}
                                        fresh={fresh.indexOf(e.key) >= 0}
                                        compact={props.compact}
                                        renderAttachment={props.renderAttachment}
                                    />
                                )
                            })}
                        </Fragment>
                    ))}
                </div>
            )}
            <div ref={after} tabIndex={-1} className="flex justify-center outline-none">
                {shown < entries.length ? (
                    <Button type="button" variant="outline" size="sm" onClick={showMore} data-rp-activity-more="">
                        Show more <span className="text-muted-foreground tabular-nums">({entries.length - shown} older)</span>
                    </Button>
                ) : null}
            </div>
            <p role="status" aria-live="polite" className="sr-only">
                {announce}
            </p>
        </section>
    )
}
