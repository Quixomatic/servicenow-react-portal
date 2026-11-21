import { useMemo, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    downloadText,
    rowsToCsv,
    copyText,
} from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { Icon } from 'components:icon';
import { StatusBadge } from 'components:charts/composed-kit';
import { LiveDot } from 'components:charts/slope-kit';
import { TRIM, SepDot, PickMenu, Swatch } from 'components:charts/status-kit';
import { useTimeSeries, ymd, parseYmd, addInterval } from 'utilities:charts/analytics';
import { andQueries, groupCondition } from 'utilities:app/list-data';
import { PRIORITY_GROUPS } from './data';
import type { StatusDay, StatusRow, StatusGroup } from './data';

/**
 * components:charts/incident-status-tracker: a status tracker fed by records. One row per group (incident
 * priority 1 to 4 by default, or any `groupBy` field) with the last N days (default 30) as day capsules: the
 * capsule's colour is the day's SLA status, its height the records opened that day (scaled per row). A hover
 * card per day (opened, resolved, breached, within SLA), a per-row within-SLA rate, fleet tiles (within SLA vs
 * the older half of the window, opened by day status, breach days, breaches), a group filter, display options
 * (window, sort) and CSV / copy-summary exports. Same visual language as charts/cron-run-history.
 *
 * Live data (utilities:charts/analytics, as the user; three useTimeSeries requests, one alias per day):
 *   opened    records with dateField (opened_at) on the day, AND query, split by groupBy;
 *   breached  the same AND breachQuery (default `${slaField}=false`, i.e. made_sla=false);
 *   resolved  records with resolvedField (resolved_at) on the day (resolvedField={false} skips it).
 * Day status (counts of records opened that day):
 *   no records             nothing opened (a small muted dot);
 *   green "No breaches"    breached < amberAt (default 1, so zero breaches);
 *   red "Many breaches"    breached >= redAt (default 3) or breached / opened >= redShare (default 0.5);
 *   amber "Some breaches"  anything in between.
 * Row within-SLA rate = (opened - breached) / opened over the window.
 *
 *   <IncidentStatusTracker />                                            incident by priority, last 30 days
 *   <IncidentStatusTracker groupBy="assignment_group" query="active=true" days={14} live />
 *   <IncidentStatusTracker table="sc_req_item" breachQuery="made_sla=false^ORescalation>0" />
 *   <IncidentStatusTracker rows={[{ key, label, description?, days: [{ date, opened, breached, resolved? }] }]} />
 *   useIncidentStatusRows(props) → { rows, loading, error } (the live rows without the card).
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type DayTone = 'ok' | 'warn' | 'breach' | 'quiet';

export type ToneRules = { amberAt?: number; redAt?: number; redShare?: number };

export type IncidentStatusSource = {
    table?: string;
    query?: string;
    /** Field whose values become rows (default 'priority'). */
    groupBy?: string;
    /** Fixed rows (key = raw value) and their order; default priorities 1 to 4 when groupBy is 'priority'. */
    groups?: StatusGroup[];
    /** Date field a record's day comes from (default 'opened_at'). */
    dateField?: string;
    /** Date field for the resolved count (default 'resolved_at'; false = don't count resolutions). */
    resolvedField?: string | false;
    /** Days shown (default 30, max 90). */
    days?: number;
    /** Boolean SLA field; breachQuery defaults to `${slaField}=false` (default 'made_sla'). */
    slaField?: string;
    /** Encoded query that marks a record as breached (overrides slaField). */
    breachQuery?: string;
    live?: boolean;
    refreshInterval?: number;
};

export type IncidentStatusTrackerProps = IncidentStatusSource &
    ToneRules & {
        title?: string;
        description?: string;
        /** Static rows: no records are read. */
        rows?: StatusRow[];
        /** Column heading for the rows (default 'Priority' for priority, else 'Group'). */
        groupLabel?: string;
        /** Plural noun for the records ('incidents'). */
        noun?: string;
        /** Click a day: its records' query (e.g. navigate(listPage, { table, query })). */
        onSelectDay?: (e: { row: StatusRow; day: StatusDay; query: string }) => void;
        className?: string;
    };

type RowView = StatusRow & {
    shown: StatusDay[];
    tones: DayTone[];
    opened: number;
    breached: number;
    resolved: number | null;
    rate: number | null;
    scale: number;
    recent: DayTone;
    lastBreach: string | null;
    index: number;
};

const TONE_BG: Record<DayTone, string> = {
    ok: 'bg-success/45',
    warn: 'bg-warning/90',
    breach: 'bg-destructive/85',
    quiet: 'bg-muted-foreground/30',
};
const BADGE_TONE: Record<DayTone, string> = { ok: 'success', warn: 'warning', breach: 'destructive', quiet: 'muted' };
const LABEL: Record<DayTone, string> = {
    ok: 'No Breaches',
    warn: 'Some Breaches',
    breach: 'Many Breaches',
    quiet: 'No Records',
};
const TONES: DayTone[] = ['ok', 'warn', 'breach', 'quiet'];
const RANK: Record<DayTone, number> = { breach: 0, warn: 1, ok: 2, quiet: 3 };
const SORTS = [
    { value: 'attention', label: 'Needs Attention', icon: 'triangle-alert' },
    { value: 'rate', label: 'Within SLA', icon: 'circle-check' },
    { value: 'volume', label: 'Volume', icon: 'chart-column' },
    { value: 'name', label: 'Name', icon: 'arrow-down-a-z' },
];

const pct1 = (f: number | null) => (f == null ? '-' : `${(Math.round(f * 1000) / 10).toFixed(1)}%`);
const pct0 = (f: number | null) => (f == null ? '-' : `${Math.round(f * 100)}%`);
const DAY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const SHORT_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const dayLabel = (date: string) => DAY_FMT.format(parseYmd(date));
const shortLabel = (date: string) => SHORT_FMT.format(parseYmd(date));

function daysBetween(from: string, to: string) {
    return Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86400000);
}

function relDay(date: string, asOf: string) {
    const n = daysBetween(date, asOf);
    return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n}d ago`;
}

/** The day's status from its counts (see the header comment for the rules). */
export function dayTone(d: StatusDay, rules: ToneRules = {}): DayTone {
    const amberAt = rules.amberAt ?? 1;
    const redAt = rules.redAt ?? 3;
    const redShare = rules.redShare ?? 0.5;
    if (!d.opened && !d.breached) return 'quiet';
    if (d.breached < amberAt) return 'ok';
    if (d.breached >= redAt || (d.opened > 0 && d.breached / d.opened >= redShare)) return 'breach';
    return 'warn';
}

function lastDays(n: number): string[] {
    const today = parseYmd();
    const out: string[] = [];
    for (let i = n - 1; i >= 0; i--) out.push(ymd(addInterval(today, 'day', -i)));
    return out;
}

/** Live rows from records (three useTimeSeries requests). Pass enabled: false to skip reading. */
export function useIncidentStatusRows(src: IncidentStatusSource & { enabled?: boolean }) {
    const table = src.table || 'incident';
    const query = src.query || '';
    const groupBy = src.groupBy || 'priority';
    const dateField = src.dateField || 'opened_at';
    const resolvedField = src.resolvedField === false ? '' : src.resolvedField || 'resolved_at';
    const n = Math.max(1, Math.min(90, Math.floor(src.days || 30)));
    const breach = src.breachQuery != null ? src.breachQuery : `${src.slaField || 'made_sla'}=false`;
    const enabled = src.enabled !== false;
    const opts = { enabled, live: !!src.live, refreshInterval: src.refreshInterval };
    const base = { table, dateField, interval: 'day' as const, periods: n, groupBy, seriesLimit: 50 };
    const opened = useTimeSeries({ ...base, query }, opts);
    const breached = useTimeSeries({ ...base, query: andQueries(query, [breach]) }, opts);
    const resolved = useTimeSeries(
        { ...base, dateField: resolvedField || dateField, query },
        { ...opts, enabled: enabled && !!resolvedField }
    );

    const rows: StatusRow[] = useMemo(() => {
        const fixed = src.groups || (groupBy === 'priority' ? PRIORITY_GROUPS : null);
        let groups: StatusGroup[];
        if (fixed) {
            groups = fixed;
        } else {
            const seen = new Map<string, StatusGroup>();
            opened.series.concat(breached.series).forEach((s: any) => {
                if (!seen.has(s.key)) seen.set(s.key, { key: s.key, label: s.label });
            });
            groups = Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
        }
        const dates = opened.points.length ? opened.points.map((p: any) => p.start) : lastDays(n);
        const at = (pts: any[], i: number, key: string) => {
            const p = pts[i];
            return p && p.values ? Number(p.values[key]) || 0 : 0;
        };
        return groups.map((g) => {
            const cond = groupCondition(groupBy, g.key === '__empty' ? '' : g.key);
            return {
                key: g.key,
                label: g.label,
                description: g.description,
                query: andQueries(query, [cond]),
                days: dates.map((date: string, i: number) => {
                    const p = opened.points[i];
                    return {
                        date,
                        opened: at(opened.points, i, g.key),
                        breached: at(breached.points, i, g.key),
                        resolved: resolvedField ? at(resolved.points, i, g.key) : null,
                        query: andQueries(p ? p.query : query, [cond]),
                    };
                }),
            };
        });
    }, [
        opened.points,
        opened.series,
        breached.points,
        breached.series,
        resolved.points,
        src.groups,
        groupBy,
        query,
        n,
        resolvedField,
    ]);

    return {
        rows,
        loading: enabled && (opened.isLoading || breached.isLoading),
        fetching: opened.isFetching || breached.isFetching || resolved.isFetching,
        error: opened.error || breached.error || resolved.error,
    };
}

function DayCapsule({
    row,
    day,
    tone,
    i,
    count,
    asOf,
    noun,
    loading,
    onKey,
    onSelect,
}: {
    row: RowView;
    day: StatusDay;
    tone: DayTone;
    i: number;
    count: number;
    asOf: string;
    noun: string;
    loading: boolean;
    onKey: (e: any, i: number) => void;
    onSelect?: () => void;
}) {
    const h = day.opened ? Math.max(0.3, Math.min(1, day.opened / (row.scale || 1))) : 0;
    const within = day.opened ? (day.opened - day.breached) / day.opened : null;
    const trigger = (
        <button
            type="button"
            tabIndex={i === count - 1 ? 0 : -1}
            data-day-index={i}
            aria-label={`${dayLabel(day.date)}, ${day.opened} opened, ${day.breached} breached, ${LABEL[tone]}`}
            onKeyDown={(e) => onKey(e, i)}
            onClick={onSelect}
            className={`flex h-full min-w-0 justify-center rounded-full px-0.5 transition-opacity duration-150 ease-out group-hover/strip:opacity-40 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring/50 motion-reduce:transition-none ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
        />
    );
    if (loading) {
        return (
            <span className="flex h-full min-w-0 justify-center px-0.5" aria-hidden="true">
                <span className="block h-full w-full max-w-2.5 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            </span>
        );
    }
    return (
        <Popover>
            <PopoverTrigger openOnHover delay={120} closeDelay={60} render={trigger}>
                {tone === 'quiet' ? (
                    <span
                        aria-hidden="true"
                        className={`mt-auto mb-0.5 block size-1.5 rounded-full ${TONE_BG.quiet}`}
                    />
                ) : (
                    <span
                        aria-hidden="true"
                        className={`block h-full w-full max-w-2.5 rounded-full ${TONE_BG[tone]}`}
                        style={{ clipPath: `inset(${((1 - h) * 100).toFixed(4)}% 0px 0px round 999px)` }}
                    />
                )}
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="flex h-4 items-center text-sm font-medium tabular-nums">
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {dayLabel(day.date)}
                            </span>
                        </span>
                        <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {`${row.label}, ${relDay(day.date, asOf).toLowerCase()}`}
                            </span>
                        </span>
                    </div>
                    <StatusBadge tone={BADGE_TONE[tone]}>
                        <span className={TRIM}>{LABEL[tone]}</span>
                    </StatusBadge>
                </div>
                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                <dl className="m-0 flex flex-col gap-2 text-xs">
                    {[
                        ['Opened', String(day.opened)],
                        ['Resolved', day.resolved == null ? '-' : String(day.resolved)],
                        ['Breached SLA', String(day.breached)],
                        ['Within SLA', within == null ? '-' : pct0(within)],
                    ].map(([k, v]) => (
                        <div key={k} className="flex h-4 items-center justify-between gap-4">
                            <dt className={`shrink-0 text-muted-foreground ${TRIM}`}>{k}</dt>
                            <dd className={`m-0 truncate font-medium tabular-nums ${TRIM}`}>{v}</dd>
                        </div>
                    ))}
                </dl>
                {onSelect && day.opened ? (
                    <span className="flex h-4 items-center text-xs text-muted-foreground">
                        <span className={TRIM}>{`Click to open the day's ${noun}`}</span>
                    </span>
                ) : null}
            </PopoverContent>
        </Popover>
    );
}

export function IncidentStatusTracker({
    title = 'SLA Status by Priority',
    description,
    rows,
    table = 'incident',
    query = '',
    groupBy = 'priority',
    groups,
    dateField = 'opened_at',
    resolvedField = 'resolved_at',
    days = 30,
    slaField = 'made_sla',
    breachQuery,
    live = false,
    refreshInterval,
    amberAt = 1,
    redAt = 3,
    redShare = 0.5,
    groupLabel,
    noun = 'incidents',
    onSelectDay,
    className = '',
}: IncidentStatusTrackerProps) {
    const isStatic = !!rows;
    const src = useIncidentStatusRows({
        table,
        query,
        groupBy,
        groups,
        dateField,
        resolvedField,
        days,
        slaField,
        breachQuery,
        live,
        refreshInterval,
        enabled: !isStatic,
    });
    const data: StatusRow[] = rows || src.rows;
    const loading = !isStatic && src.loading;
    const error = isStatic ? null : src.error;
    const rules = { amberAt, redAt, redShare };
    const span = Math.max(1, ...data.map((r) => r.days.length));
    const windows = [7, 14, 30, span].filter((w, i, a) => w <= span && a.indexOf(w) === i).sort((a, b) => a - b);

    const [win, setWin] = useState<number>(span);
    const [sort, setSort] = useState('attention');
    const [filter, setFilter] = useState('all');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const w = Math.min(win, span);
    const heading = groupLabel || (groupBy === 'priority' && !isStatic ? 'Priority' : 'Group');

    const asOf =
        data.reduce((m, r) => {
            const d = r.days.length ? r.days[r.days.length - 1].date : '';
            return d > m ? d : m;
        }, '') || ymd(new Date());

    const all: RowView[] = data.map((r, index) => {
        const shown = r.days.slice(-w);
        const tones = shown.map((d) => dayTone(d, rules));
        const opened = shown.reduce((s, d) => s + d.opened, 0);
        const breached = shown.reduce((s, d) => s + d.breached, 0);
        const tracked = shown.filter((d) => d.resolved != null);
        const recentTones = tones.slice(-7);
        const recent = recentTones.reduce((a: DayTone, t) => (RANK[t] < RANK[a] ? t : a), 'quiet' as DayTone);
        let lastBreach: string | null = null;
        for (let k = shown.length - 1; k >= 0 && !lastBreach; k--) if (shown[k].breached) lastBreach = shown[k].date;
        return {
            ...r,
            shown,
            tones,
            opened,
            breached,
            resolved: tracked.length ? tracked.reduce((s, d) => s + (d.resolved as number), 0) : null,
            rate: opened ? (opened - breached) / opened : null,
            scale: Math.max(1, ...shown.map((d) => d.opened)),
            recent,
            lastBreach,
            index,
        };
    });
    const breaching = (r: RowView) => r.recent === 'breach' || r.recent === 'warn';
    const counts = {
        all: all.length,
        breaching: all.filter(breaching).length,
        healthy: all.filter((r) => !breaching(r)).length,
    };
    const visible = all.filter((r) =>
        filter === 'breaching' ? breaching(r) : filter === 'healthy' ? !breaching(r) : true
    );
    const sorted = visible.slice().sort((a, b) => {
        if (sort === 'rate') return (a.rate ?? 1) - (b.rate ?? 1) || a.index - b.index;
        if (sort === 'volume') return b.opened - a.opened || a.index - b.index;
        if (sort === 'name') return a.label.localeCompare(b.label);
        return RANK[a.recent] - RANK[b.recent] || (a.rate ?? 1) - (b.rate ?? 1) || a.index - b.index;
    });

    // Fleet stats over the visible rows.
    const opened = visible.reduce((s, r) => s + r.opened, 0);
    const breached = visible.reduce((s, r) => s + r.breached, 0);
    const resolvedRows = visible.filter((r) => r.resolved != null);
    const resolved = resolvedRows.length ? resolvedRows.reduce((s, r) => s + (r.resolved as number), 0) : null;
    const rate = opened ? (opened - breached) / opened : null;
    const half = Math.floor(w / 2);
    const rateOf = (list: StatusDay[]) => {
        const o = list.reduce((s, d) => s + d.opened, 0);
        return o ? (o - list.reduce((s, d) => s + d.breached, 0)) / o : null;
    };
    const older = rateOf(
        visible.reduce((acc: StatusDay[], r) => acc.concat(r.shown.slice(0, r.shown.length - half)), [])
    );
    const newer = rateOf(visible.reduce((acc: StatusDay[], r) => acc.concat(r.shown.slice(-half)), []));
    const deltaPts = older != null && newer != null ? (newer - older) * 100 : null;
    const byTone: Record<string, number> = {};
    TONES.forEach((t) => {
        byTone[t] = visible.reduce((s, r) => s + r.tones.filter((x) => x === t).length, 0);
    });
    const breachDays = byTone.warn + byTone.breach;
    const worst = visible.filter((r) => r.breached).sort((a, b) => b.breached - a.breached)[0];
    const lastBreach = visible.reduce((m: string, r) => (r.lastBreach && r.lastBreach > m ? r.lastBreach : m), '');

    const summary =
        `${title}: ${visible.length} ${heading.toLowerCase()} rows, last ${w} days to ${shortLabel(asOf)}. ` +
        `${opened} ${noun} opened, ${breached} breached SLA, ${pct1(rate)} within SLA` +
        (deltaPts != null
            ? ` (${deltaPts >= 0 ? 'up' : 'down'} ${Math.abs(deltaPts).toFixed(1)} pts vs the older half)`
            : '') +
        `. ${byTone.breach} days with many breaches, ${byTone.warn} with some. ` +
        sorted
            .map((r) => `${r.label}: ${r.opened} opened, ${r.breached} breached, ${pct0(r.rate)} within SLA.`)
            .join(' ');
    const csvRows = visible.reduce(
        (acc: any[], r) =>
            acc.concat(
                r.shown.map((d, i) => ({
                    group: r.label,
                    date: d.date,
                    opened: d.opened,
                    resolved: d.resolved == null ? '' : d.resolved,
                    breached: d.breached,
                    status: LABEL[r.tones[i]],
                }))
            ),
        []
    );
    const csvColumns = [
        { key: 'group', label: heading },
        { key: 'date', label: 'Date' },
        { key: 'opened', label: 'Opened' },
        { key: 'resolved', label: 'Resolved' },
        { key: 'breached', label: 'Breached SLA' },
        { key: 'status', label: 'Status' },
    ];
    const isDefault = w === span && sort === 'attention' && filter === 'all' && view === 'chart';
    const reset = () => {
        setWin(span);
        setSort('attention');
        setFilter('all');
        setView('chart');
    };

    const onStripKey = (e: any, i: number, count: number) => {
        const step =
            e.key === 'ArrowRight'
                ? 1
                : e.key === 'ArrowLeft'
                  ? -1
                  : e.key === 'Home'
                    ? -i
                    : e.key === 'End'
                      ? count - 1 - i
                      : 0;
        if (!step) return;
        e.preventDefault();
        const strip = e.currentTarget.parentElement;
        const next = strip && strip.querySelector(`[data-day-index="${Math.max(0, Math.min(count - 1, i + step))}"]`);
        if (next) next.focus();
    };

    const list = (
        <div>
            <div className="hidden h-10 items-center gap-x-6 px-(--frame-panel-px) text-xs text-muted-foreground @3xl/istrows:flex!">
                <span className={`${TRIM} min-w-0 flex-1 @3xl/istrows:w-56! @3xl/istrows:flex-none!`}>{heading}</span>
                <span className={`${TRIM} w-36 shrink-0`}>Last 7 Days</span>
                <span className="flex min-w-0 flex-1 basis-0 justify-between gap-3">
                    <span className={TRIM}>{`Last ${w} Days`}</span>
                    <span className={TRIM}>Oldest to newest</span>
                </span>
                <span className={`${TRIM} ms-auto w-24 shrink-0 text-end`}>Within SLA</span>
            </div>
            <div role="separator" className="hidden h-px w-full bg-border @3xl/istrows:block!" />
            <div role="list" aria-label={`${heading} rows`} className="flex w-full flex-col divide-y divide-border">
                {error ? (
                    <div className="flex min-h-32 items-center justify-center px-(--frame-panel-px) text-sm text-destructive">
                        {`Couldn't load the ${noun}: ${error.message}`}
                    </div>
                ) : sorted.length ? (
                    sorted.map((r) => (
                        <div
                            key={r.key}
                            role="listitem"
                            className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-(--frame-panel-px) py-3 transition-colors duration-100 @3xl/istrows:min-h-16"
                        >
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @3xl/istrows:w-56! @3xl/istrows:flex-none!">
                                <span className="flex h-5 min-w-0 items-center gap-2 text-sm font-medium">
                                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        {r.label}
                                    </span>
                                </span>
                                <span className="flex h-4 min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        {r.description || `${r.opened} opened`}
                                    </span>
                                    {r.description ? null : (
                                        <>
                                            <SepDot />
                                            <span
                                                className={`${TRIM} whitespace-nowrap`}
                                            >{`${r.breached} breached`}</span>
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="hidden w-36 shrink-0 @md/istrows:block!">
                                {loading ? null : (
                                    <div className="flex min-w-0 flex-col items-start gap-1.5">
                                        <StatusBadge tone={BADGE_TONE[r.recent]}>
                                            <span className={TRIM}>{LABEL[r.recent]}</span>
                                        </StatusBadge>
                                        <span className="flex h-4 items-center text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                            <span className={TRIM}>
                                                {r.lastBreach
                                                    ? `Last breach ${relDay(r.lastBreach, asOf).toLowerCase()}`
                                                    : 'No breaches in window'}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div
                                role="group"
                                aria-label={`${r.label}, last ${r.shown.length} days, oldest first: ${pct0(r.rate)} within SLA`}
                                className="group/strip order-last grid h-10 min-w-0 basis-full @3xl/istrows:order-none! @3xl/istrows:flex-1! @3xl/istrows:basis-0!"
                                style={{ gridTemplateColumns: `repeat(${w}, minmax(0px, 1fr))` }}
                            >
                                {r.shown.map((d, i) => (
                                    <DayCapsule
                                        key={d.date}
                                        row={r}
                                        day={d}
                                        tone={r.tones[i]}
                                        i={i}
                                        count={r.shown.length}
                                        asOf={asOf}
                                        noun={noun}
                                        loading={loading}
                                        onKey={(e, k) => onStripKey(e, k, r.shown.length)}
                                        onSelect={
                                            onSelectDay && d.opened
                                                ? () => onSelectDay({ row: r, day: d, query: d.query || '' })
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                            <div className="ms-auto w-24 shrink-0 text-end">
                                <div className="flex flex-col items-end gap-1.5 tabular-nums">
                                    <span className="flex h-5 items-center text-sm font-medium">
                                        <span className={TRIM}>{loading ? '-' : pct0(r.rate)}</span>
                                    </span>
                                    <span className="flex h-4 items-center text-xs whitespace-nowrap text-muted-foreground">
                                        <span className={TRIM}>{loading ? '' : `of ${r.opened} opened`}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                        No rows match this filter.
                    </div>
                )}
            </div>
        </div>
    );

    const tile = 'flex min-w-0 flex-col gap-2.5 border-border px-(--frame-panel-px) py-(--frame-panel-py)';
    const label = (t: string) => (
        <span className="flex h-4 items-center text-xs text-muted-foreground">
            <span className={TRIM}>{t}</span>
        </span>
    );
    const value = (v: string, suffix?: string) => (
        <span className="flex items-baseline gap-1.5">
            <span className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
                {loading ? '-' : v}
            </span>
            {suffix && !loading ? <span className="text-sm text-muted-foreground tabular-nums">{suffix}</span> : null}
        </span>
    );
    const sub = 'flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground';

    return (
        <div className={`@container/ist w-full min-w-0 ${className}`}>
            <Frame className="min-w-0">
                <FrameHeader className="min-w-0 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-72 flex-col gap-px">
                        <FrameTitle role="heading" className="truncate">
                            {title}
                        </FrameTitle>
                        <FrameDescription className="flex items-center gap-1.5 truncate tabular-nums">
                            {description ? (
                                <span>{description}</span>
                            ) : (
                                <>
                                    <span>{`${data.length} ${heading === 'Priority' ? 'priorities' : 'groups'}`}</span>
                                    <SepDot />
                                    <span>{`As of ${shortLabel(asOf)}`}</span>
                                </>
                            )}
                            {live && !isStatic ? (
                                <>
                                    <SepDot />
                                    <span className="flex items-center gap-1.5">
                                        <LiveDot />
                                        Live
                                    </span>
                                </>
                            ) : null}
                        </FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <PickMenu
                            label={`Show ${heading.toLowerCase()} rows`}
                            menuLabel="Show"
                            value={filter}
                            onValueChange={setFilter}
                            className="w-40"
                            options={[
                                { value: 'all', label: 'All Rows', icon: <Icon name="funnel" />, count: counts.all },
                                {
                                    value: 'breaching',
                                    label: 'Breaching',
                                    icon: <Swatch className="bg-destructive/85" />,
                                    count: counts.breaching,
                                },
                                {
                                    value: 'healthy',
                                    label: 'Healthy',
                                    icon: <Swatch className="bg-success/45" />,
                                    count: counts.healthy,
                                },
                            ]}
                        />
                        <div role="group" aria-label="Tracker menus" className="flex w-fit items-stretch">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-r-none bg-background"
                                            aria-label="Display options"
                                            title="Display options"
                                        />
                                    }
                                >
                                    <Icon name="settings-2" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Window</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={String(w)}
                                            onValueChange={(v: string) => setWin(Number(v))}
                                        >
                                            {windows.map((n) => (
                                                <DropdownMenuRadioItem key={n} value={String(n)}>
                                                    <Icon name="calendar-days" />
                                                    {`Last ${n} Days`}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                                            {SORTS.map((s) => (
                                                <DropdownMenuRadioItem key={s.value} value={s.value}>
                                                    <Icon name={s.icon} />
                                                    {s.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-l-none border-l-0 bg-background"
                                            aria-label="More actions"
                                            title="More actions"
                                        />
                                    }
                                >
                                    <Icon name="ellipsis" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Export</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            disabled={loading}
                                            onClick={() => {
                                                downloadText('sla-status.csv', rowsToCsv(csvRows, csvColumns));
                                                toast.success('SLA status downloaded as CSV');
                                            }}
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            disabled={loading}
                                            onClick={() => {
                                                copyText(summary);
                                                toast.success('Summary copied to clipboard');
                                            }}
                                        >
                                            <Icon name="file-text" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>View</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'list' : 'sheet'} />
                                            {view === 'table' ? 'View as List' : 'View as Table'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled={isDefault} onClick={reset}>
                                            <Icon name="rotate-ccw" />
                                            Reset View
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </FrameHeader>
                <FramePanel className="grid grid-cols-2 p-0 @3xl/ist:grid-cols-4!">
                    <div className={tile}>
                        {label('Within SLA')}
                        {value(pct1(rate))}
                        <span className={sub}>
                            {deltaPts == null || loading ? (
                                <span className={TRIM}>{loading ? '' : 'No comparison'}</span>
                            ) : (
                                <>
                                    <span
                                        className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap tabular-nums [&_svg]:size-3.5 ${deltaPts < 0 ? 'text-destructive' : 'text-success'}`}
                                    >
                                        <Icon name={deltaPts < 0 ? 'trending-down' : 'trending-up'} />
                                        <span className="sr-only">{deltaPts < 0 ? 'Down' : 'Up'}</span>
                                        <span className={TRIM}>{`${Math.abs(deltaPts).toFixed(1)} pts`}</span>
                                    </span>
                                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        vs older half
                                    </span>
                                </>
                            )}
                        </span>
                    </div>
                    <div className={`${tile} border-s`}>
                        {label('Opened')}
                        {value(String(opened))}
                        <span className={sub}>
                            <span className="flex h-1.5 min-w-0 flex-1 gap-0.5">
                                <span className="sr-only">
                                    {TONES.map((t) => `${byTone[t]} days ${LABEL[t]}`).join(', ')}
                                </span>
                                {loading
                                    ? null
                                    : TONES.filter((t) => byTone[t]).map((t) => (
                                          <span
                                              key={t}
                                              className={`min-w-1.5 basis-0 rounded-full ${TONE_BG[t]}`}
                                              style={{ flexGrow: byTone[t] }}
                                          />
                                      ))}
                            </span>
                            <span className={`${TRIM} shrink-0 tabular-nums`}>
                                {loading ? '' : resolved == null ? `${breached} breached` : `${resolved} resolved`}
                            </span>
                        </span>
                    </div>
                    <div className={`${tile} border-t @3xl/ist:border-s! @3xl/ist:border-t-0!`}>
                        {label('Breach Days')}
                        {value(String(breachDays), `of ${visible.length * w}`)}
                        <span className={sub}>
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {loading ? '' : `${byTone.breach} with many breaches`}
                            </span>
                        </span>
                    </div>
                    <div className={`${tile} border-s border-t @3xl/ist:border-t-0!`}>
                        {label('Breached SLA')}
                        {value(String(breached))}
                        <span className={sub}>
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {loading
                                    ? ''
                                    : worst
                                      ? `Most in ${worst.label}, last ${relDay(lastBreach, asOf).toLowerCase()}`
                                      : 'No breaches in window'}
                            </span>
                        </span>
                    </div>
                </FramePanel>
                <FramePanel className="@container/istrows min-w-0 p-0">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <div className="p-(--frame-panel-px)">
                                <ChartDataTable
                                    data={sorted.map((r) => ({
                                        label: r.label,
                                        rate: r.rate == null ? 0 : r.rate * 100,
                                        opened: r.opened,
                                        breached: r.breached,
                                    }))}
                                    index="label"
                                    indexLabel={heading}
                                    series={[
                                        { key: 'rate', label: 'Within SLA' },
                                        { key: 'opened', label: 'Opened' },
                                        { key: 'breached', label: 'Breached' },
                                    ]}
                                    valueFormatter={(v: number, item: any) =>
                                        item && item.dataKey === 'rate' ? `${Math.round(v)}%` : String(v)
                                    }
                                    caption={`${title}, last ${w} days`}
                                />
                            </div>
                        }
                    >
                        {list}
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="min-h-10 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    <ul
                        aria-label="Day status"
                        className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0"
                    >
                        {TONES.map((t) => (
                            <li key={t} className="flex h-4 items-center gap-1.5">
                                <Swatch className={TONE_BG[t]} />
                                <span className={TRIM}>{LABEL[t]}</span>
                            </li>
                        ))}
                    </ul>
                    <span className={TRIM}>{`Bar height is ${noun} opened`}</span>
                </FrameFooter>
            </Frame>
        </div>
    );
}

export default IncidentStatusTracker;
