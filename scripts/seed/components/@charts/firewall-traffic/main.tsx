import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    ToolbarGroup,
    rowsToCsv,
    downloadText,
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
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { Icon } from 'components:icon';
import { TEXT_TRIM, ToneBadge, prefersReducedMotion, short } from 'components:charts/bar-more-kit';
import { HOURS, RANGES } from './data';
import type { TrafficHour } from './data';

/**
 * components:charts/firewall-traffic: requests per hour as columns of 14 pills (blocked at the bottom, then
 * challenged, then allowed, empty slots on top) with incident markers over the hours they hit; KPIs (requests,
 * blocked, challenged); hour tooltips; 6 / 12 / 24 hour range, traffic filter (all, threats, blocked), layer
 * toggles (incident markers, hourly average line, empty slots), pin an hour (click, or Pin Peak Hour), CSV.
 * Plain HTML (no Recharts), as in ReUI.
 *
 *   <FirewallTraffic />                          sample data
 *   <FirewallTraffic hours={[{ hour: 15, requests, blocked, challenged, incident? }, ...]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type FirewallTrafficProps = {
    title?: string;
    /** Hourly buckets, oldest first; the last one is the current, partial hour. */
    hours?: TrafficHour[];
    ranges?: number[];
    defaultRange?: number;
    /** Pills per column. */
    slots?: number;
    className?: string;
};

type Filter = 'all' | 'threats' | 'blocked';
const FILTERS: { key: Filter; label: string; note: string }[] = [
    { key: 'all', label: 'All Traffic', note: 'Every request' },
    { key: 'threats', label: 'Threats Only', note: 'Blocked and challenged' },
    { key: 'blocked', label: 'Blocked Only', note: 'Blocked at the edge' },
];
const KINDS = [
    { key: 'blocked', label: 'Blocked', bg: 'bg-destructive' },
    { key: 'challenged', label: 'Challenged', bg: 'bg-warning' },
    { key: 'allowed', label: 'Allowed', bg: 'bg-success/45' },
];
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const hh = (h: number) => `${pad2(((h % 24) + 24) % 24)}:00`;
const num = (n: number) => n.toLocaleString('en-US');
const pct1 = (a: number, b: number) => `${b ? ((a / b) * 100).toFixed(1) : '0.0'}%`;

function Swatch({ bg }: { bg: string }) {
    return (
        <span aria-hidden="true" className="h-2 w-3 shrink-0 rounded-full bg-card">
            <span className={`block size-full rounded-full ${bg}`} />
        </span>
    );
}
function Mark() {
    return (
        <span
            aria-hidden="true"
            className="flex size-3 shrink-0 items-center justify-center text-destructive [&_svg]:size-3"
        >
            <Icon name="octagon-alert" />
        </span>
    );
}

export function FirewallTraffic({
    title = 'Firewall Traffic',
    hours = HOURS,
    ranges = RANGES,
    defaultRange = 24,
    slots = 14,
    className,
}: FirewallTrafficProps) {
    const [range, setRange] = useState(defaultRange);
    const [filter, setFilter] = useState<Filter>('all');
    const [markers, setMarkers] = useState(true);
    const [average, setAverage] = useState(false);
    const [empty, setEmpty] = useState(true);
    const [pin, setPin] = useState<number | null>(null);
    const [hover, setHover] = useState<number | null>(null);
    const [replay, setReplay] = useState(0);
    const [spin, setSpin] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const plotRef = useRef<HTMLDivElement>(null);
    const marksRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const list = hours.slice(Math.max(0, hours.length - range));
    const n = list.length;
    const last = n - 1;
    const label = (i: number) => `${hh(list[i].hour)} to ${i === last ? 'now' : hh(list[i].hour + 1)}`;

    const shownOf = (h: TrafficHour) => {
        const allowed = Math.max(0, h.requests - h.blocked - h.challenged);
        return {
            blocked: h.blocked,
            challenged: filter === 'blocked' ? 0 : h.challenged,
            allowed: filter === 'all' ? allowed : 0,
        };
    };
    const totalShown = (h: TrafficHour) => {
        const s = shownOf(h);
        return s.blocked + s.challenged + s.allowed;
    };
    const max = Math.max(1, ...list.map(totalShown));
    const pillsOf = (h: TrafficHour) => {
        const s = shownOf(h);
        const total = Math.min(slots, Math.round((totalShown(h) / max) * slots));
        const b = Math.min(total, Math.round((s.blocked / max) * slots));
        const c = Math.min(total - b, Math.round((s.challenged / max) * slots));
        const out: string[] = [];
        for (let k = 0; k < slots; k++)
            out.push(k < b ? 'blocked' : k < b + c ? 'challenged' : k < total ? 'allowed' : 'track');
        return out;
    };

    const sum = (k: 'requests' | 'blocked' | 'challenged') => list.reduce((s, h) => s + h[k], 0);
    const total = sum('requests');
    const pinned = pin != null && pin < n ? list[pin] : null;
    const peak = list.reduce((m, h, i) => (h.requests > list[m].requests ? i : m), 0);
    const avgSlots = Math.round((list.reduce((s, h) => s + totalShown(h), 0) / n / max) * slots);
    const emptyAbove = slots - avgSlots;

    // enter animation: lit pills fade up from the track colour column by column; markers drop in
    useLayoutEffect(() => {
        const root = plotRef.current;
        if (!root || prefersReducedMotion()) return;
        const track = getComputedStyle(root).getPropertyValue('--muted').trim() || 'transparent';
        root.querySelectorAll('[data-lit]').forEach((el: any) => {
            const col = Number(el.getAttribute('data-col')) || 0;
            const to = getComputedStyle(el).backgroundColor;
            if (el.animate)
                el.animate([{ backgroundColor: track }, { backgroundColor: to }], {
                    duration: 180,
                    delay: 6 + col * 13,
                    easing: EASE,
                    fill: 'backwards',
                });
        });
        const marks = marksRef.current;
        if (marks)
            marks.querySelectorAll('[data-mark]').forEach((el: any) => {
                if (el.animate)
                    el.animate(
                        [
                            { transform: 'translateY(-100%)', opacity: 0 },
                            { transform: 'none', opacity: 1 },
                        ],
                        { duration: 200, delay: 240, easing: EASE, fill: 'backwards' }
                    );
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, filter, replay, view, markers]);

    const focusIdx = hover != null ? hover : pin;
    const onKey = (e: any, i: number) => {
        const moves: Record<string, number> = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: last };
        if (e.key in moves) {
            e.preventDefault();
            const j = Math.max(0, Math.min(last, moves[e.key]));
            const el = btnRefs.current[j];
            if (el) el.focus();
        } else if (e.key === 'Escape') setPin(null);
    };

    const step = range <= 6 ? 2 : Math.round(range / 4);
    const axis: { col: number; text: string; justify: string }[] = [
        { col: 0, text: `${n}h ago`, justify: 'justify-start' },
    ];
    for (let c = step; c < n; c += step) axis.push({ col: c - 1, text: `${n - c}h`, justify: 'justify-center' });
    axis.push({ col: last, text: 'Now', justify: 'justify-end' });

    const kpiHour = pinned;
    const kTotal = kpiHour ? kpiHour.requests : total;
    const kBlocked = kpiHour ? kpiHour.blocked : sum('blocked');
    const kChallenged = kpiHour ? kpiHour.challenged : sum('challenged');

    const csvText = () =>
        rowsToCsv(
            list.map((h, i) => ({
                hour: label(i),
                requests: h.requests,
                blocked: h.blocked,
                challenged: h.challenged,
                allowed: h.requests - h.blocked - h.challenged,
                incident: h.incident || '',
            })),
            [
                { key: 'hour', label: 'Hour (UTC)' },
                { key: 'requests', label: 'Requests' },
                { key: 'blocked', label: 'Blocked' },
                { key: 'challenged', label: 'Challenged' },
                { key: 'allowed', label: 'Allowed' },
                { key: 'incident', label: 'Incident' },
            ]
        );
    const incidents = list.map((h, i) => (h.incident ? `${label(i)} UTC: ${h.incident}` : '')).filter(Boolean);
    const summary = `${title}, last ${n} hours: ${num(total)} requests (${short(total / n)} an hour), ${num(sum('blocked'))} blocked (${pct1(sum('blocked'), total)}), ${num(sum('challenged'))} challenged (${pct1(sum('challenged'), total)}). Peak ${label(peak)} with ${num(list[peak].requests)}.${incidents.length ? ` Incidents: ${incidents.join('; ')}.` : ''}`;
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };
    const filterInfo = FILTERS.find((f) => f.key === filter) || FILTERS[0];

    return (
        <Frame className={`w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-px">
                    <FrameTitle>{title}</FrameTitle>
                    <FrameDescription>Requests per hour, last {n} hours</FrameDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ToolbarGroup aria-label="Traffic scope">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-background"
                                        aria-label={`Time range: Last ${range} Hours`}
                                    />
                                }
                            >
                                <Icon name="history" />
                                <span className={TEXT_TRIM}>{range} Hours</span>
                                <Icon name="chevron-down" className="text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-auto">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Time Range</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={String(range)}
                                        onValueChange={(v: string) => {
                                            setRange(Number(v));
                                            setPin(null);
                                            setHover(null);
                                        }}
                                    >
                                        {ranges.map((r) => {
                                            const first = hours[Math.max(0, hours.length - r)];
                                            return (
                                                <DropdownMenuRadioItem key={r} value={String(r)}>
                                                    Last {r} Hours
                                                    <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                                        {first ? hh(first.hour) : ''} to now
                                                    </span>
                                                </DropdownMenuRadioItem>
                                            );
                                        })}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-background"
                                        aria-label={`Traffic shown: ${filterInfo.label}`}
                                    />
                                }
                            >
                                <Icon name="activity" />
                                <span className={TEXT_TRIM}>{filterInfo.label}</span>
                                <Icon name="chevron-down" className="text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Traffic Shown</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={filter} onValueChange={(v: any) => setFilter(v)}>
                                        {FILTERS.map((f) => (
                                            <DropdownMenuRadioItem key={f.key} value={f.key}>
                                                {f.label}
                                                <span className="ms-auto ps-6 text-xs text-muted-foreground">
                                                    {f.note}
                                                </span>
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                    <ToolbarGroup aria-label="Chart actions">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            aria-label="Refresh traffic"
                            title="Refresh traffic"
                            onClick={() => {
                                setReplay((r) => r + 1);
                                setSpin(true);
                                setTimeout(() => setSpin(false), 600);
                            }}
                        >
                            <Icon name="refresh-cw" className={spin ? 'animate-spin' : ''} />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="bg-background"
                                        aria-label="Display options"
                                        title="Display options"
                                    />
                                }
                            >
                                <Icon name="settings-2" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem
                                        checked={markers}
                                        closeOnClick={false}
                                        onCheckedChange={(v: boolean) => setMarkers(v)}
                                    >
                                        <Icon name="flag" />
                                        Incident Markers
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={average}
                                        closeOnClick={false}
                                        onCheckedChange={(v: boolean) => setAverage(v)}
                                    >
                                        <Icon name="minus" />
                                        Hourly Average
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={empty}
                                        closeOnClick={false}
                                        onCheckedChange={(v: boolean) => setEmpty(v)}
                                    >
                                        <Icon name="grid-2x2" />
                                        Empty Slots
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="bg-background"
                                        aria-label="More actions"
                                        title="More actions"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText(`firewall-traffic-${n}h.csv`, csvText());
                                            toast.success('CSV downloaded', {
                                                description: `firewall-traffic-${n}h.csv`,
                                            });
                                        }}
                                    >
                                        <Icon name="download" />
                                        Download CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copy(summary, 'Summary')}>
                                        <Icon name="copy" />
                                        Copy Summary
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        disabled={!incidents.length}
                                        onClick={() => copy(incidents.join('\n'), 'Incidents')}
                                    >
                                        <Icon name="octagon-alert" />
                                        Copy Incidents
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>View</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setPin(peak)}>
                                        <Icon name="pin" />
                                        Pin Peak Hour
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={pin == null} onClick={() => setPin(null)}>
                                        <Icon name="pin-off" />
                                        Clear Pin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setRange(defaultRange);
                                            setFilter('all');
                                            setMarkers(true);
                                            setAverage(false);
                                            setEmpty(true);
                                            setPin(null);
                                        }}
                                    >
                                        <Icon name="rotate-ccw" />
                                        Reset View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-column' : 'table'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                </div>
            </FrameHeader>
            <FramePanel className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row! sm:items-start sm:justify-between sm:gap-6">
                    <div className="grid min-w-0 grid-cols-3 gap-4 sm:max-w-md sm:flex-1 sm:gap-6">
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Requests</span>
                            <span className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
                                {short(kTotal)}
                            </span>
                            <span className="truncate text-xs text-muted-foreground tabular-nums">
                                {kpiHour ? label(pin as number) : `${short(total / n)} an hour`}
                            </span>
                        </div>
                        {[
                            { label: 'Blocked', value: kBlocked },
                            { label: 'Challenged', value: kChallenged },
                        ].map((k) => (
                            <div key={k.label} className="flex min-w-0 flex-col gap-1">
                                <span className="text-xs text-muted-foreground">{k.label}</span>
                                <span className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
                                    {short(k.value)}
                                </span>
                                <span className="truncate text-xs text-muted-foreground tabular-nums">
                                    {pct1(k.value, kTotal)} <span className="max-sm:sr-only">of requests</span>
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex min-h-5 min-w-0 items-center sm:justify-end">
                        {pinned && pinned.incident ? (
                            <ToneBadge tone="destructive" icon="octagon-alert" className="max-w-full">
                                <span className="truncate">{pinned.incident}</span>
                            </ToneBadge>
                        ) : (
                            <ul
                                aria-label="Legend"
                                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                            >
                                {KINDS.map((k) => (
                                    <li key={k.key} className="flex h-4 items-center gap-1.5">
                                        <Swatch bg={k.bg} />
                                        <span className={TEXT_TRIM}>{k.label}</span>
                                    </li>
                                ))}
                                {markers ? (
                                    <li className="flex h-4 items-center gap-1.5">
                                        <Mark />
                                        <span className={TEXT_TRIM}>Incident</span>
                                    </li>
                                ) : null}
                            </ul>
                        )}
                    </div>
                </div>
                <ChartFigure
                    title={`${title}, last ${n} hours`}
                    summary={summary}
                    view={view}
                    table={
                        <ChartDataTable
                            data={list.map((h, i) => ({
                                label: label(i),
                                requests: h.requests,
                                blocked: h.blocked,
                                challenged: h.challenged,
                            }))}
                            index="label"
                            indexLabel="Hour (UTC)"
                            series={[
                                { key: 'requests', label: 'Requests' },
                                { key: 'blocked', label: 'Blocked' },
                                { key: 'challenged', label: 'Challenged' },
                            ]}
                            valueFormatter={(v: number) => num(v)}
                            caption={`${title}, last ${n} hours`}
                        />
                    }
                >
                    <div className="flex min-h-0 flex-1 flex-col gap-2">
                        <div
                            ref={marksRef}
                            className={`grid h-3 gap-1 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] sm:gap-1.5 ${markers ? '' : 'opacity-0'}`}
                            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                        >
                            {list.map((h, i) =>
                                h.incident ? (
                                    <span
                                        key={i}
                                        data-mark=""
                                        className="row-start-1 justify-self-center"
                                        style={{ gridColumnStart: i + 1 }}
                                        title={h.incident}
                                    >
                                        <Mark />
                                    </span>
                                ) : null
                            )}
                        </div>
                        <div className="relative flex min-h-40 flex-1 sm:min-h-58!">
                            <div
                                ref={plotRef}
                                role="group"
                                aria-label="Requests per hour"
                                className="group/plot grid flex-1 gap-1 sm:gap-1.5"
                                style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                                onPointerLeave={() => setHover(null)}
                            >
                                {list.map((h, i) => {
                                    const pills = pillsOf(h);
                                    const allowed = h.requests - h.blocked - h.challenged;
                                    // Dimming as an inline opacity (an attribute change), not a class swap: on
                                    // Next Experience pages class changes restyle the whole document.
                                    const dim =
                                        focusIdx != null && focusIdx !== i
                                            ? 0.4
                                            : i === last && focusIdx !== i
                                              ? 0.7
                                              : 1;
                                    return (
                                        <Tooltip key={`${range}-${i}`}>
                                            <TooltipTrigger
                                                render={
                                                    <button
                                                        ref={(el) => {
                                                            btnRefs.current[i] = el;
                                                        }}
                                                        type="button"
                                                        aria-pressed={pin === i}
                                                        aria-label={`${label(i)}: ${num(h.requests)} requests, ${num(h.blocked)} blocked, ${num(h.challenged)} challenged${h.incident ? `. ${h.incident}` : ''}`}
                                                        className={`group/hour relative flex w-full max-w-12 min-w-0 origin-bottom cursor-pointer flex-col-reverse gap-1 justify-self-center rounded-full transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:transition-opacity motion-reduce:active:scale-100`}
                                                        style={{ opacity: dim }}
                                                        onPointerEnter={() => setHover(i)}
                                                        onFocus={() => setHover(i)}
                                                        onBlur={() => setHover(null)}
                                                        onClick={() => setPin(pin === i ? null : i)}
                                                        onKeyDown={(e) => onKey(e, i)}
                                                    />
                                                }
                                            >
                                                {pills.map((p, k) =>
                                                    p === 'track' ? (
                                                        <span
                                                            key={k}
                                                            aria-hidden="true"
                                                            className={`min-h-1.5 w-full flex-1 rounded-full transition-colors duration-150 ${empty ? 'bg-muted' : 'bg-transparent'}`}
                                                        />
                                                    ) : (
                                                        <span
                                                            key={k}
                                                            aria-hidden="true"
                                                            data-lit=""
                                                            data-col={i}
                                                            className={`min-h-1.5 w-full flex-1 rounded-full transition-colors duration-150 ${p === 'blocked' ? 'bg-destructive' : p === 'challenged' ? 'bg-warning' : 'bg-success/45'}`}
                                                        />
                                                    )
                                                )}
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute inset-x-1 -bottom-1.25 h-0.5 rounded-full bg-foreground opacity-0 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-aria-pressed/hour:opacity-100"
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="right"
                                                align="start"
                                                className="max-w-xs bg-foreground text-background"
                                            >
                                                <div className="flex w-52 flex-col gap-2.5 py-1 tabular-nums">
                                                    <div className="flex h-4 items-center justify-between gap-3">
                                                        <span className={`font-medium ${TEXT_TRIM}`}>{label(i)}</span>
                                                        <span className={`text-background/70 ${TEXT_TRIM}`}>UTC</span>
                                                    </div>
                                                    <div className="flex h-4 items-center justify-between gap-3">
                                                        <span className={TEXT_TRIM}>Requests</span>
                                                        <span className={`font-medium ${TEXT_TRIM}`}>
                                                            {num(h.requests)}
                                                        </span>
                                                    </div>
                                                    <ul className="flex flex-col gap-2">
                                                        {[
                                                            { k: KINDS[0], v: h.blocked },
                                                            { k: KINDS[1], v: h.challenged },
                                                            { k: KINDS[2], v: allowed },
                                                        ].map((r) => (
                                                            <li key={r.k.key} className="flex h-4 items-center gap-2">
                                                                <Swatch bg={r.k.bg} />
                                                                <span className={TEXT_TRIM}>{r.k.label}</span>
                                                                <span className={`ms-auto ${TEXT_TRIM}`}>
                                                                    {num(r.v)}
                                                                </span>
                                                                <span
                                                                    className={`w-11 text-end text-background/70 ${TEXT_TRIM}`}
                                                                >
                                                                    {pct1(r.v, h.requests)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {h.incident ? (
                                                        <div className="flex items-start gap-2 border-t border-background/15 pt-2.5">
                                                            <span className="flex h-4 items-center">
                                                                <Mark />
                                                            </span>
                                                            <span className="leading-4">{h.incident}</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                                <div
                                    data-average=""
                                    className={`absolute inset-0 border-t border-dashed border-foreground/50 transition-[opacity,translate] duration-150 ${average ? 'opacity-100' : 'opacity-0'}`}
                                    style={{
                                        translate: `0px calc(${(emptyAbove / slots) * 100}% + ${emptyAbove * (4 - ((slots - 1) * 4) / slots) - 2}px)`,
                                    }}
                                />
                            </div>
                        </div>
                        <div
                            className="grid gap-1 text-xs text-muted-foreground sm:gap-1.5"
                            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                        >
                            {axis.map((a) => (
                                <span
                                    key={a.col}
                                    className={`row-start-1 flex w-full max-w-12 justify-self-center whitespace-nowrap ${a.justify}`}
                                    style={{ gridColumnStart: a.col + 1 }}
                                >
                                    <span>{a.text}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </ChartFigure>
            </FramePanel>
        </Frame>
    );
}

export default FirewallTraffic;
