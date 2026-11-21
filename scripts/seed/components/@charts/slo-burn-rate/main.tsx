import { useId, useMemo, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    SegmentedControl,
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
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components:dialog';
import { Icon } from 'components:icon';
import { useElementWidth } from 'components:charts/chart-kit';
import { IconTile, ToneBadge, useFadeIn } from 'components:charts/bar-more-kit';
import { SLO } from './data';
import type { BurnSlo, BurnRule, BurnWindow } from './data';

/**
 * components:charts/slo-burn-rate: an SLO's error-budget burn rate per hour on a log scale (muted dots under
 * the 1× pace line, stems and dots over it, a dashed page line), the multi-window burn rates as lollipops on a
 * 0.1× to 100× log track, the multi-window alert rules (Firing / Clear / Silenced), the last hour's rate,
 * budget left and run-out time. 24h / 72h range, mute (with a confirm dialog), CSV / JSON export.
 * Hover an hour (or use the Arrow keys) for its rate, incident and share of the budget.
 *
 *   <SloBurnRate />                 sample data
 *   <SloBurnRate slo={{ name, target, windowDays, hourly: [...], windows: [...], rules: [...], ... }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SloBurnRateProps = {
    slo?: BurnSlo;
    /** Burn rate that pages (the dashed line). */
    pageAt?: number;
    defaultRange?: '24h' | '72h';
    className?: string;
};

/** Chart margins (plot inset inside the surface). */
const M = { top: 4, right: 12, bottom: 4, left: 12 };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 18× / 3.4× / 0.70×. */
export function rate(v: number): string {
    const a = Math.abs(v);
    return `${a >= 10 ? Math.round(v) : a >= 1 ? v.toFixed(1) : v.toFixed(2)}×`;
}

/** A threshold as written: 14.4× / 6× / 1×. */
const times = (v: number) => `${Math.round(v * 100) / 100}×`;

/** "2.1%" under 10, "11%" from 10. */
function share(v: number): string {
    return `${v < 10 ? (Math.round(v * 10) / 10).toString() : Math.round(v).toString()}%`;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

type Hour = {
    i: number;
    key: string;
    date: Date;
    time: string;
    day: string;
    value: number;
    log: number;
    span: [number, number];
    spend: number;
    incident?: { id: string; title: string };
    now: boolean;
    active: boolean;
};

/** One hour: a muted dot on the pace line, or a stem from the pace line and a toned dot. */
function HourMark(props: any) {
    const { R, payload: h, x, width, pageAt } = props;
    const yScale = R.useYAxisScale ? R.useYAxisScale() : null;
    if (!yScale || !h) return null;
    const cx = x + width / 2;
    const pace = yScale(0);
    if (h.value < 1) {
        if (h.active)
            return (
                <g aria-hidden="true">
                    <circle cx={cx} cy={pace} r={10} fill="var(--muted-foreground)" fillOpacity={0.18} />
                    <circle cx={cx} cy={pace} r={7} fill="var(--card)" />
                    <circle cx={cx} cy={pace} r={5} fill="var(--muted-foreground)" />
                </g>
            );
        return <circle aria-hidden="true" cx={cx} cy={pace} r={1.5} fill="var(--muted-foreground)" fillOpacity={0.5} />;
    }
    const cy = yScale(h.log);
    const tone = h.value >= pageAt ? 'var(--destructive)' : 'var(--warning)';
    const end = cy + (h.active ? 8 : 7);
    return (
        <g aria-hidden="true">
            {end < pace ? (
                <line
                    x1={cx}
                    x2={cx}
                    y1={pace}
                    y2={end}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                />
            ) : null}
            {h.active ? (
                <>
                    <circle cx={cx} cy={cy} r={10} fill={tone} fillOpacity={0.18} />
                    <circle cx={cx} cy={cy} r={7} fill="var(--card)" />
                    <circle cx={cx} cy={cy} r={5} fill={tone} />
                </>
            ) : (
                <circle cx={cx} cy={cy} r={4} fill={tone} />
            )}
        </g>
    );
}

/** A label over a reference line (left aligned, card halo). */
function RefLabel({ viewBox, className, children }: { viewBox: any; className: string; children?: any }) {
    if (!viewBox) return null;
    return (
        <text
            x={viewBox.x}
            y={viewBox.y - 6}
            textAnchor="start"
            stroke="var(--card)"
            strokeWidth={4}
            paintOrder="stroke"
            className={`pointer-events-none text-xs font-medium ${className}`}
        >
            {children}
        </text>
    );
}

/** Position on the 0.1× to 100× log track, in %. */
const trackPos = (v: number) => ((Math.log10(Math.min(100, Math.max(0.1, v))) + 1) / 3) * 100;

/** One window: track, pace and threshold ticks, a masked stem from the pace tick and the dot. */
function WindowTrack({ w, threshold, uid }: { w: BurnWindow; threshold: number; uid: string }) {
    const pos = trackPos(w.value);
    const pace = trackPos(1);
    const fill =
        threshold > 1 && w.value >= threshold
            ? 'var(--destructive)'
            : w.value >= 1
              ? 'var(--warning)'
              : 'var(--muted-foreground)';
    const versus = threshold > 1 && w.value >= threshold ? threshold : 1;
    const mask = `rp-sbr-m-${uid}-${w.key}`;
    return (
        <svg
            width="100%"
            className="block h-3.5 overflow-visible"
            role="img"
            aria-label={`${w.name}: ${rate(w.value)}, ${w.value >= versus ? 'over' : 'under'} ${times(versus)}`}
        >
            <line
                x1="0"
                x2="100%"
                y1="50%"
                y2="50%"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.12}
                strokeWidth={2}
                strokeLinecap="round"
            />
            <svg x={`${pace}%`} y="50%" overflow="visible">
                <line
                    y1={-5}
                    y2={5}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.45}
                    strokeWidth={1.25}
                    strokeDasharray="2 2"
                />
            </svg>
            {threshold > 1 ? (
                <svg x={`${trackPos(threshold)}%`} y="50%" overflow="visible">
                    <line
                        y1={-5}
                        y2={5}
                        stroke="var(--destructive)"
                        strokeOpacity={0.6}
                        strokeWidth={1.25}
                        strokeDasharray="2 2"
                    />
                </svg>
            ) : null}
            {w.value > 1 ? (
                <>
                    <mask id={mask} maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                        <rect x="-50%" y="-50%" width="200%" height="200%" fill="white" />
                        <circle cx={`${pos}%`} cy="50%" r={6.25} fill="black" />
                    </mask>
                    <line
                        x1={`${pace}%`}
                        x2={`${pos}%`}
                        y1="50%"
                        y2="50%"
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.4}
                        strokeWidth={2}
                        mask={`url(#${mask})`}
                    />
                </>
            ) : null}
            <g className="origin-center transition-transform duration-150 [transform-box:fill-box] group-hover/item:scale-125 group-focus-visible/item:scale-125 motion-reduce:transition-none">
                <circle
                    cx={`${pos}%`}
                    cy="50%"
                    r={4.25}
                    fill={fill}
                    stroke="var(--card)"
                    strokeWidth={2}
                    paintOrder="stroke"
                />
            </g>
        </svg>
    );
}

function SectionHead({ title, children }: { title: string; children?: any }) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-3">
            <h4 className="shrink-0 text-xs font-medium text-muted-foreground">{title}</h4>
            {children ? (
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground tabular-nums">
                    {children}
                </span>
            ) : null}
        </div>
    );
}

const Sep = () => <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />;

const PILL =
    'absolute top-0 left-0 flex h-6 min-w-6 items-center justify-center rounded-full text-xs whitespace-nowrap tabular-nums';

export function SloBurnRate({ slo = SLO, pageAt = 14.4, defaultRange = '72h', className }: SloBurnRateProps) {
    const [range, setRange] = useState<'24h' | '72h'>(defaultRange);
    const [hover, setHover] = useState<number | null>(null);
    const [cursor, setCursor] = useState<number | null>(null);
    const [muted, setMuted] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const plotRef = useRef<HTMLDivElement>(null);
    const fadeRef = useRef<HTMLDivElement>(null);
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    useFadeIn(fadeRef, [range, view]);

    const hoursBack = range === '24h' ? 24 : 72;
    const all = slo.hourly;
    const start = Math.max(0, all.length - hoursBack);
    const n = all.length - start;
    const last = n - 1;
    const budgetPerHour = 100 / (slo.windowDays * 24);

    const nowDate = useMemo(() => {
        const m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/.exec(slo.now) || [];
        return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    }, [slo.now]);

    const focusIdx = hover != null ? hover : cursor != null ? cursor : last;

    const hours: Hour[] = useMemo(() => {
        const out: Hour[] = [];
        for (let k = start; k < all.length; k++) {
            const i = k - start;
            const date = new Date(nowDate.getTime() - (all.length - 1 - k) * 3600000);
            const inc = slo.incidents.find((x) => k >= x.from && k <= x.to);
            const v = all[k];
            const log = Math.log10(Math.max(v, 0.01));
            out.push({
                i,
                key: `h${i}`,
                date,
                time: `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`,
                day: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`,
                value: v,
                log,
                span: [0, 0],
                spend: v * budgetPerHour,
                incident: inc ? { id: inc.id, title: inc.title } : undefined,
                now: k === all.length - 1,
                active: false,
            });
        }
        return out;
    }, [all, start, nowDate, slo.incidents, budgetPerHour]);

    // log domain: the pace line sits a tenth above the bottom, the peak ~25% under the top
    const peak = Math.max(pageAt, ...all.slice(start));
    const hi = Math.log10(peak * 1.25);
    const lo = -hi / 9;
    const rows = hours.map((h) => ({
        ...h,
        span: [lo, Math.max(h.log, 0)],
        active: h.i === focusIdx,
    }));

    const overPage = hours.filter((h) => h.value >= pageAt).length;
    const current = all[all.length - 1];
    const winOf = (k: string) => slo.windows.find((w) => w.key === k);
    const firing = (r: BurnRule) => {
        const a = winOf(r.long);
        const b = winOf(r.short);
        return !!a && !!b && a.value >= r.threshold && b.value >= r.threshold;
    };
    const thresholdOf = (k: string) =>
        slo.rules.reduce((m, r) => (r.long === k || r.short === k ? Math.max(m, r.threshold) : m), 1);
    const paging = slo.rules.some((r) => r.action === 'page' && firing(r));
    const ticketing = slo.rules.some((r) => r.action === 'ticket' && firing(r));
    const runHours = current > 0 ? Math.floor(slo.budgetLeft / (current * budgetPerHour)) : Infinity;
    const runsOut =
        runHours === Infinity || runHours > 24 * 365
            ? 'Never'
            : runHours >= 24
              ? `${Math.floor(runHours / 24)}d ${runHours % 24}h`
              : `${runHours}h`;
    const nowTone =
        current >= pageAt ? ' text-destructive' : current >= 1 ? ' text-warning-foreground dark:text-warning' : '';
    const nowNote =
        current >= pageAt
            ? 'Over the page line this hour.'
            : current >= 1
              ? 'Over pace, under the page line.'
              : 'Under pace this hour.';

    // x geometry (matches the bar band centres)
    const plotW = useElementWidth(plotRef);
    const step = plotW ? (plotW - M.left - M.right) / n : 0;
    const xOf = (i: number) => M.left + (i + 0.5) * step;
    const indexAt = (clientX: number) => {
        const el = plotRef.current;
        if (!el || !step) return null;
        const r = el.getBoundingClientRect();
        return Math.max(0, Math.min(n - 1, Math.floor((clientX - r.left - M.left) / step)));
    };
    const onKey = (e: any) => {
        const c = cursor == null ? last : cursor;
        const moves: Record<string, number> = {
            ArrowLeft: c - 1,
            ArrowRight: c + 1,
            Home: 0,
            End: last,
        };
        if (e.key in moves) {
            e.preventDefault();
            setCursor(Math.max(0, Math.min(last, moves[e.key])));
        } else if (e.key === 'Escape') setCursor(null);
    };

    const focus = hours[focusIdx];
    const labelled: Record<number, boolean> = {};
    let firstMidnight = -1;
    hours.forEach((h) => {
        if (h.date.getUTCHours() === 0) {
            labelled[h.i] = true;
            if (firstMidnight < 0) firstMidnight = h.i;
        }
    });
    const pillFor = (h: Hour) => {
        if (h.i === focusIdx) {
            if (h.now)
                return (
                    <span
                        key={h.key}
                        className={`${PILL} bg-foreground px-1 font-semibold text-background`}
                        style={tx(h)}
                    >
                        <span className="size-1.5 rounded-full bg-background" />
                        <span className="sr-only">Now</span>
                    </span>
                );
            return (
                <span key={h.key} className={`${PILL} bg-foreground px-2 font-semibold text-background`} style={tx(h)}>
                    {h.time}
                </span>
            );
        }
        if (labelled[h.i]) {
            const text = h.i === firstMidnight ? h.day : String(h.date.getUTCDate());
            return (
                <span
                    key={h.key}
                    className={`${PILL} ${text.length > 2 ? 'px-2' : 'px-1'} bg-muted font-medium text-muted-foreground`}
                    style={tx(h)}
                >
                    {text}
                </span>
            );
        }
        if (h.date.getUTCHours() % 6 === 0 && h.i !== last)
            return (
                <span
                    key={h.key}
                    aria-hidden="true"
                    className="absolute top-1/2 h-1.5 w-px -translate-1/2 rounded-full bg-muted-foreground/25"
                    style={{ left: xOf(h.i) }}
                />
            );
        return null;
    };
    function tx(h: Hour) {
        return {
            transform: `translateX(clamp(0px, -50% + ${xOf(h.i)}px, -100% + 100cqw))`,
        };
    }

    const rangeLabel = `Last ${n} hours`;
    const overLabel = overPage
        ? `${overPage} ${overPage === 1 ? 'hour' : 'hours'} over the page line`
        : 'No hours over the page line';
    const summary = `${slo.name} burn rate by hour, last ${n} hours: peak ${rate(Math.max(...all.slice(start)))}, ${overPage} ${overPage === 1 ? 'hour' : 'hours'} over the ${times(pageAt)} page line.`;

    const csvText = () =>
        rowsToCsv(
            hours.map((h) => ({
                hour: `${h.date.toISOString().slice(0, 16)}`,
                burn: h.value,
                spend: Math.round(h.spend * 1000) / 1000,
                incident: h.incident ? `${h.incident.id} ${h.incident.title}` : '',
            })),
            [
                { key: 'hour', label: 'Hour' },
                { key: 'burn', label: 'Burn rate' },
                { key: 'spend', label: 'Budget spent %' },
                { key: 'incident', label: 'Incident' },
            ]
        );
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };

    const badge = muted ? (
        <ToneBadge tone="outline" icon="bell-off">
            Muted
        </ToneBadge>
    ) : paging ? (
        <ToneBadge tone="destructive">Paging</ToneBadge>
    ) : ticketing ? (
        <ToneBadge tone="warning">Ticketing</ToneBadge>
    ) : (
        <ToneBadge tone="success">Healthy</ToneBadge>
    );

    return (
        <Frame className={`w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 grow basis-60 items-center gap-3">
                    <IconTile icon="activity" />
                    <div className="flex min-w-0 flex-col gap-px">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <FrameTitle role="heading" aria-level={3} className="truncate">
                                {slo.name}
                            </FrameTitle>
                            {badge}
                        </div>
                        <FrameDescription className="truncate">
                            {slo.target}% target over {slo.windowDays} days
                        </FrameDescription>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <SegmentedControl
                        label="Chart range"
                        value={range}
                        onValueChange={(v: string) => {
                            setRange(v as '24h' | '72h');
                            setHover(null);
                            setCursor(null);
                        }}
                        options={[
                            { value: '24h', label: '24h', title: 'Last 24h' },
                            { value: '72h', label: '72h', title: 'Last 72h' },
                        ]}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-background"
                        onClick={() => {
                            if (muted) {
                                setMuted(false);
                                toast.success('Alerts unmuted', { description: slo.name });
                            } else setConfirm(true);
                        }}
                    >
                        <Icon name={muted ? 'bell' : 'bell-off'} />
                        {muted ? 'Unmute' : 'Mute'}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}
                        >
                            <Icon name="ellipsis" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-auto min-w-40">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Objective</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => copy(`slo_${slo.key.replace(/-/g, '_')}`, 'SLO ID')}>
                                    <Icon name="copy" />
                                    Copy SLO ID
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Hourly Burn</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        downloadText(`${slo.key}-burn-${range}.csv`, csvText());
                                        toast.success('CSV downloaded', {
                                            description: `${slo.key}-burn-${range}.csv`,
                                        });
                                    }}
                                >
                                    <Icon name="download" />
                                    Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        downloadText(
                                            `${slo.key}-burn.json`,
                                            JSON.stringify(slo, null, 2),
                                            'application/json'
                                        );
                                        toast.success('JSON downloaded', {
                                            description: `${slo.key}-burn.json`,
                                        });
                                    }}
                                >
                                    <Icon name="download" />
                                    Export JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                    <Icon name={view === 'table' ? 'chart-column' : 'table'} />
                                    {view === 'table' ? 'View as Chart' : 'View as Table'}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </FrameHeader>
            <FramePanel className="@container/summary">
                <div className="grid gap-6 @2xl/summary:grid-cols-2 @4xl/summary:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1.3fr)] @4xl/summary:gap-0 @4xl/summary:divide-x">
                    <section className="flex min-w-0 flex-col gap-3 @4xl/summary:pe-6">
                        <SectionHead title="Last Hour" />
                        <div className="flex flex-col gap-1">
                            <p className={`text-4xl font-semibold tracking-tight tabular-nums${nowTone}`}>
                                {rate(current)}
                            </p>
                            <p className="text-sm text-pretty text-muted-foreground">{nowNote}</p>
                        </div>
                        <dl className="mt-auto grid grid-cols-2 gap-3 border-t pt-3">
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <dt className="text-xs text-muted-foreground">Budget left</dt>
                                <dd className="text-sm font-medium tabular-nums">{share(slo.budgetLeft)}</dd>
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <dt className="text-xs text-muted-foreground">Runs out in</dt>
                                <dd className="text-sm font-medium tabular-nums">{runsOut}</dd>
                            </div>
                        </dl>
                    </section>
                    <section className="flex min-w-0 flex-col gap-3 @4xl/summary:px-6">
                        <SectionHead title="Windows">Log scale, 0.1× to 100×</SectionHead>
                        <ul className="flex flex-col gap-2.5 @4xl/summary:flex-1 @4xl/summary:justify-between">
                            {slo.windows.map((w) => (
                                <li
                                    key={w.key}
                                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
                                >
                                    <span aria-hidden="true" className="text-muted-foreground">
                                        {w.label}
                                    </span>
                                    <WindowTrack w={w} threshold={thresholdOf(w.key)} uid={uid} />
                                    <span aria-hidden="true" className="text-right font-medium tabular-nums">
                                        {rate(w.value)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className="@container/rules flex min-w-0 flex-col gap-3 @2xl/summary:col-span-2 @4xl/summary:col-span-1 @4xl/summary:ps-6">
                        <SectionHead title="Alert Rules">Notifies {slo.channel}</SectionHead>
                        <div role="list" className="flex w-full flex-col gap-2">
                            {slo.rules.map((r) => {
                                const on = firing(r);
                                const long = winOf(r.long);
                                return (
                                    <div
                                        key={r.key}
                                        role="listitem"
                                        className="group/item flex w-full flex-wrap items-center gap-2.5 rounded-md border border-border px-2.5 py-2"
                                    >
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <div className="flex w-fit max-w-full min-w-0 items-center gap-2 text-sm leading-snug font-medium">
                                                <span className="min-w-0 truncate">{r.name}</span>
                                            </div>
                                            <p className="flex min-w-0 items-center gap-1.5 text-xs/relaxed text-muted-foreground tabular-nums">
                                                <span className="min-w-0 truncate @md/rules:shrink-0">
                                                    {r.action === 'page' ? 'Pages' : 'Tickets'} when {r.long} and{' '}
                                                    {r.short} pass {times(r.threshold)}
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className="hidden size-1 shrink-0 rounded-full bg-muted-foreground/40 @md/rules:block"
                                                />
                                                <span className="hidden min-w-0 truncate @md/rules:inline">
                                                    spends{' '}
                                                    {share(
                                                        r.threshold * budgetPerHour * (long ? windowHours(long.key) : 1)
                                                    )}{' '}
                                                    in {r.long}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {on && muted ? (
                                                <ToneBadge tone="warning">Silenced</ToneBadge>
                                            ) : on ? (
                                                <ToneBadge tone="destructive">Firing</ToneBadge>
                                            ) : (
                                                <ToneBadge tone="success">Clear</ToneBadge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </FramePanel>
            <FramePanel>
                <section className="flex min-w-0 flex-col gap-3">
                    <SectionHead title="Hourly Burn">
                        <span className="shrink-0">{rangeLabel}</span>
                        <Sep />
                        <span className="truncate">{overLabel}</span>
                    </SectionHead>
                    <ChartFigure
                        title={`${slo.name} burn rate`}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={hours.map((h) => ({
                                    label: `${h.day}, ${h.time}`,
                                    burn: h.value,
                                    spend: Math.round(h.spend * 100) / 100,
                                }))}
                                index="label"
                                indexLabel="Hour"
                                series={[
                                    { key: 'burn', label: 'Burn rate' },
                                    { key: 'spend', label: 'Budget spent %' },
                                ]}
                                caption={`${slo.name} burn rate by hour`}
                            />
                        }
                    >
                        <div ref={fadeRef} className="min-w-0">
                            <div
                                className="relative flex h-60 min-w-0 touch-pan-y flex-col select-none"
                                onPointerMove={(e: any) => setHover(indexAt(e.clientX))}
                                onPointerLeave={() => setHover(null)}
                            >
                                {step && focus ? (
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute top-3.5 -bottom-1.5 left-0 bg-linear-to-b from-foreground/2 to-foreground/8"
                                        style={{
                                            width: 28,
                                            borderRadius: 14,
                                            transform: `translateX(${xOf(focus.i) - 14}px)`,
                                        }}
                                    />
                                ) : null}
                                <div className="h-8 shrink-0" />
                                <div
                                    ref={plotRef}
                                    role="group"
                                    tabIndex={0}
                                    aria-label={`${summary} Arrow keys move by hour.`}
                                    className="relative min-h-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                    onKeyDown={onKey}
                                    onBlur={() => setCursor(null)}
                                >
                                    <ChartContainer config={{}} className="aspect-auto h-full w-full">
                                        {(R: any) => (
                                            <R.BarChart data={rows} margin={M} barCategoryGap={0}>
                                                <R.XAxis dataKey="key" hide />
                                                <R.YAxis hide domain={[lo, hi]} allowDataOverflow />
                                                <R.ReferenceLine
                                                    y={Math.log10(pageAt)}
                                                    stroke="var(--destructive)"
                                                    strokeOpacity={0.6}
                                                    strokeWidth={1}
                                                    strokeDasharray="4 4"
                                                    label={(lp: any) => (
                                                        <RefLabel viewBox={lp.viewBox} className="fill-destructive">
                                                            Page {times(pageAt)}
                                                        </RefLabel>
                                                    )}
                                                />
                                                <R.ReferenceLine
                                                    y={0}
                                                    stroke="var(--foreground)"
                                                    strokeOpacity={0.2}
                                                    strokeWidth={1}
                                                    label={(lp: any) => (
                                                        <RefLabel
                                                            viewBox={lp.viewBox}
                                                            className="fill-muted-foreground"
                                                        >
                                                            Pace 1×
                                                        </RefLabel>
                                                    )}
                                                />
                                                <R.Bar
                                                    dataKey="span"
                                                    isAnimationActive={false}
                                                    activeBar={false}
                                                    shape={(p: any) => <HourMark {...p} R={R} pageAt={pageAt} />}
                                                />
                                            </R.BarChart>
                                        )}
                                    </ChartContainer>
                                </div>
                                <div className="@container relative mt-2 h-6 shrink-0">
                                    {step ? hours.map((h) => pillFor(h)) : null}
                                </div>
                                {step && focus ? (
                                    <div
                                        aria-hidden="true"
                                        className="@container pointer-events-none absolute inset-x-0 top-1 h-7"
                                    >
                                        <div className="absolute top-0 left-0 flex" style={tx(focus)}>
                                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold whitespace-nowrap text-background tabular-nums">
                                                {rate(focus.value)}
                                                <span className="size-1 rounded-full bg-background/40" />
                                                <span className="font-medium text-background/65">
                                                    {focus.now ? 'Now' : focus.time}
                                                </span>
                                                {!focus.now ? (
                                                    <>
                                                        <span className="size-1 rounded-full bg-background/40" />
                                                        <span className="font-medium text-background/65">
                                                            {focus.day}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </ChartFigure>
                </section>
            </FramePanel>
            <FrameFooter className="min-h-10 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                <div aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {[
                        { label: 'Over page', fill: 'var(--destructive)' },
                        { label: 'Over pace', fill: 'var(--warning)' },
                        { label: 'Under pace', fill: 'var(--muted-foreground)' },
                    ].map((l) => (
                        <span key={l.label} className="flex items-center gap-1.5">
                            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                                <circle cx="6" cy="6" r="3" fill={l.fill} />
                            </svg>
                            {l.label}
                        </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                            <line
                                x1="0"
                                x2="12"
                                y1="6"
                                y2="6"
                                stroke="var(--destructive)"
                                strokeWidth="1.5"
                                strokeDasharray="3 1.5"
                            />
                        </svg>
                        Page line
                    </span>
                </div>
                {focus ? (
                    <div aria-live="polite" className="flex min-w-0 items-center gap-1.5 sm:ms-auto">
                        <span className="shrink-0 font-medium text-foreground">
                            {focus.day}, {focus.time}
                        </span>
                        <Sep />
                        {focus.incident ? (
                            <>
                                <span className="min-w-0 truncate">
                                    <span className="font-mono text-foreground">{focus.incident.id}</span>{' '}
                                    {focus.incident.title}
                                </span>
                                <Sep />
                            </>
                        ) : null}
                        <span className="shrink-0">{focus.spend < 0.1 ? '<0.1%' : share(focus.spend)} of budget</span>
                    </div>
                ) : null}
            </FrameFooter>
            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent showCloseButton={false} className="sm:max-w-xs">
                    <DialogHeader className="items-center pr-0 text-center">
                        <DialogTitle>Mute Alerts?</DialogTitle>
                        <DialogDescription className="text-center">
                            <span className="font-medium text-foreground">{slo.name}</span> stops paging and ticketing{' '}
                            {slo.channel} until you unmute it.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid! grid-cols-2">
                        <Button variant="outline" onClick={() => setConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setConfirm(false);
                                setMuted(true);
                                toast.success('Alerts muted', { description: slo.name });
                            }}
                        >
                            Mute
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Frame>
    );
}

/** Window key ("5m", "6h", "3d") in hours. */
function windowHours(k: string): number {
    const m = /^(\d+(?:\.\d+)?)([mhd])$/.exec(k);
    if (!m) return 1;
    const v = parseFloat(m[1]);
    return m[2] === 'm' ? v / 60 : m[2] === 'd' ? v * 24 : v;
}

export default SloBurnRate;
