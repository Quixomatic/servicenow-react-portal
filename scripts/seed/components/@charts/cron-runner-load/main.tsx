import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, useRecharts } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    rowsToCsv,
    downloadText,
    copyText,
} from 'components:chart-frame';
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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from 'components:dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { series, SeriesScope, useEnterAnimation, useReplayKey, baselineOrigin } from 'components:charts/chart-kit';
import { TEXT_TRIM, MenuSelect, RefreshButton, useBusy, int } from 'components:charts/bar-kit';
import { HOURS, JOBS, PRIOR_DAY, PARTIAL_MINUTES } from './data';
import type { Outcome, RunnerJob } from './data';

/**
 * components:charts/cron-runner-load: hourly runner time of a scheduler's jobs, stacked by outcome
 * (succeeded, timed out, failed) as soft columns with a solid cap on the top segment. Time window menu
 * (24 / 12 / 6 hours), a searchable job picker, outcome toggles with presets, a Display menu (runner
 * time or run count, timeout marker, gridlines), a "Timeout burn" callout on the worst timeout hour,
 * KPI tiles, hover tooltips with the slowest job, refresh with auto-refresh, and CSV / TSV / summary
 * exports.
 *
 *   <CronRunnerLoad />                                sample data
 *   <CronRunnerLoad hours={[…]} jobs={[…]} />          see ./data for the shapes
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CronRunnerLoadProps = {
    title?: string;
    description?: string;
    hours?: string[];
    jobs?: RunnerJob[];
    priorDay?: { seconds: number; runs: number };
    partialMinutes?: number;
    asOf?: string;
    className?: string;
};

type Measure = 'time' | 'runs';
type Win = '24' | '12' | '6';

const OUTCOMES: {
    key: Outcome;
    label: string;
    soft: string;
    solid: string;
    dot: string;
}[] = [
    {
        key: 'succeeded',
        label: 'Succeeded',
        soft: 'color-mix(in oklab, var(--success) 20%, var(--card))',
        solid: 'var(--success)',
        dot: 'bg-success',
    },
    {
        key: 'timedOut',
        label: 'Timed Out',
        soft: 'color-mix(in oklab, var(--warning) 20%, var(--card))',
        solid: 'var(--warning)',
        dot: 'bg-warning',
    },
    {
        key: 'failed',
        label: 'Failed',
        soft: 'color-mix(in oklab, var(--destructive) 20%, var(--card))',
        solid: 'var(--destructive)',
        dot: 'bg-destructive',
    },
];
const ALL: Outcome[] = ['succeeded', 'timedOut', 'failed'];
const WINDOWS: { value: Win; label: string; icon: string; step: number }[] = [
    { value: '24', label: 'Last 24 Hours', icon: 'history', step: 3 },
    { value: '12', label: 'Last 12 Hours', icon: 'clock', step: 2 },
    { value: '6', label: 'Last 6 Hours', icon: 'clock-3', step: 1 },
];
const AUTO: { value: string; label: string; icon: string; ms: number }[] = [
    { value: 'off', label: 'Off', icon: 'pause', ms: 0 },
    { value: '1m', label: 'Every Minute', icon: 'timer', ms: 60000 },
    { value: '5m', label: 'Every 5 Minutes', icon: 'clock', ms: 300000 },
];
const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

/** 1973 → "32m 53s", 3900 → "1h 05m", 58 → "58s". */
function dur(sec: number): string {
    const s = Math.round(sec);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${pad(s % 60)}s`;
    return `${s}s`;
}

function pct(part: number, whole: number, digits = 0): string {
    return `${whole ? ((part / whole) * 100).toFixed(digits) : (0).toFixed(digits)}%`;
}

type Cell = { runs: number; sec: number; slow: number; slowJob: string };
type Bucket = { label: string; range: string; index: number } & Record<Outcome, Cell>;

/** Hourly buckets for the chosen jobs: runs, seconds and the slowest run (seconds per run) per outcome. */
function buildBuckets(hours: string[], jobs: RunnerJob[], partial: number): Bucket[] {
    const blank = (): Cell => ({ runs: 0, sec: 0, slow: 0, slowJob: '' });
    const list: Bucket[] = hours.map((h, i) => {
        const last = i === hours.length - 1;
        const next = hours[i + 1] || `${String((Number(h.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`;
        const end = last && partial < 60 ? `${h.slice(0, 2)}:${String(partial).padStart(2, '0')}` : next;
        return {
            label: h,
            range: `${h} to ${end} UTC`,
            index: i,
            succeeded: blank(),
            timedOut: blank(),
            failed: blank(),
        };
    });
    jobs.forEach((job) => {
        job.hours.forEach((r) => {
            const b = list[r[0]];
            if (!b) return;
            ALL.forEach((k, j) => {
                const runs = r[1 + j * 2];
                const sec = r[2 + j * 2];
                if (!runs) return;
                const c = b[k];
                c.runs += runs;
                c.sec += sec;
                if (sec / runs > c.slow) {
                    c.slow = sec / runs;
                    c.slowJob = job.name;
                }
            });
        });
    });
    return list;
}

const total = (b: Bucket, keys: Outcome[], m: Measure) =>
    keys.reduce((s, k) => s + (m === 'time' ? b[k].sec : b[k].runs), 0);

/** Axis top (8 % headroom) and ticks on a minute / count step giving at most four intervals. */
function axis(max: number, m: Measure): { top: number; ticks: number[] } {
    const top = (max || (m === 'time' ? 600 : 10)) * 1.08;
    const steps =
        m === 'time'
            ? [1, 2, 5, 10, 15, 20, 30, 60, 120, 240, 480].map((v) => v * 60)
            : [1, 2, 5, 10, 20, 50, 100, 200, 500];
    const step = steps.find((s) => top / s <= 4) || steps[steps.length - 1];
    const ticks: number[] = [];
    for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v);
    return { top, ticks };
}

/** The muted outline delta chip ("-5%"). */
function DeltaChip({ value }: { value: number }) {
    const up = value >= 0;
    return (
        <span
            data-slot="badge"
            className="relative inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-md border border-border bg-background px-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground [&_svg]:size-3"
        >
            <Icon name={up ? 'trending-up' : 'trending-down'} />
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            <span className={`${TEXT_TRIM} tabular-nums`}>{`${up ? '+' : '-'}${Math.abs(Math.round(value))}%`}</span>
        </span>
    );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: any }) {
    return (
        <div className="flex min-w-0 flex-col gap-2 @3xl:py-(--frame-panel-py) @3xl:not-first:border-s @3xl:not-first:ps-6 @3xl:not-last:pe-6">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-2">
                <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
                <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{children}</span>
            </dd>
        </div>
    );
}

function Sub({ children }: { children?: any }) {
    return (
        <span className="flex h-4 items-center tabular-nums">
            <span className={TEXT_TRIM}>{children}</span>
        </span>
    );
}

/** Full-height hover bands behind the columns (fill-muted, faded in on the hovered hour). */
function HoverBands({ count, active }: { count: number; active: number | null }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot || !count) return null;
    const band = plot.width / count;
    return (
        <g className="pointer-events-none">
            {Array.from({ length: count }).map((_v, i) => {
                const x = plot.x + band * i;
                const r = 4;
                const d = `M${x},${plot.y + plot.height}V${plot.y + r}A${r},${r},0,0,1,${x + r},${plot.y}H${x + band - r}A${r},${r},0,0,1,${x + band},${plot.y + r}V${plot.y + plot.height}Z`;
                return (
                    <path
                        key={i}
                        d={d}
                        className={`fill-muted transition-opacity duration-150 ${EASE}`}
                        style={{ opacity: active === i ? 1 : 0 }}
                    />
                );
            })}
        </g>
    );
}

/** "Timeout burn": a dotted leader and a warning dot above the hour with the most timed-out time. */
function TimeoutCallout({ index, value, count }: { index: number; value: number; count: number }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    const y = R && R.useYAxisScale ? R.useYAxisScale() : null;
    if (!plot || !y || index < 0) return null;
    const band = plot.width / count;
    const cx = plot.x + band * (index + 0.5);
    const cy = y(value) - 7;
    return (
        <g data-callout="" className="pointer-events-none">
            <line
                x1={cx}
                x2={cx}
                y1={plot.y - 5}
                y2={cy - 5}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
            />
            <circle cx={cx} cy={cy} r={2.5} fill="var(--warning)" stroke="var(--card)" strokeWidth={1.5} />
            <text
                x={cx}
                y={plot.y - 10}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                stroke="var(--card)"
                strokeWidth={3}
                paintOrder="stroke"
            >
                Timeout burn
            </text>
        </g>
    );
}

function TipLine({ label, value, mono = true }: { label: string; value: any; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className={`${mono ? 'font-mono' : ''} font-medium tabular-nums`}>{value}</span>
        </div>
    );
}

function RunnerTooltip({ bucket, shown, measure }: { bucket: Bucket | null; shown: Outcome[]; measure: Measure }) {
    if (!bucket) return null;
    const rows = OUTCOMES.filter((o) => shown.indexOf(o.key) >= 0 && bucket[o.key].runs > 0);
    if (!rows.length) return null;
    const val = (k: Outcome) => (measure === 'time' ? bucket[k].sec : bucket[k].runs);
    const sum = rows.reduce((s, o) => s + val(o.key), 0);
    const secs = rows.reduce((s, o) => s + bucket[o.key].sec, 0);
    const runs = rows.reduce((s, o) => s + bucket[o.key].runs, 0);
    const slow = rows.reduce((a, o) => (bucket[o.key].slow > a.slow ? bucket[o.key] : a), bucket[rows[0].key]);
    const many = rows.length > 1;
    return (
        <div className="grid w-auto max-w-56 min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">{bucket.range}</div>
            <div className="grid gap-1.5">
                {rows.map((o, i) => (
                    <div key={o.key} className="flex w-full flex-wrap items-center gap-2">
                        <div className="flex flex-1 flex-col gap-2">
                            <div className="flex h-4 items-center justify-between gap-4">
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${o.dot}`} />
                                    <span className={TEXT_TRIM}>{o.label}</span>
                                </span>
                                <span className="inline-flex items-center gap-2 tabular-nums">
                                    <span className={`font-mono font-medium ${TEXT_TRIM}`}>
                                        {measure === 'time' ? dur(val(o.key)) : int(val(o.key))}
                                    </span>
                                    {many ? (
                                        <span
                                            className={`w-8 text-end text-muted-foreground @max-md:hidden ${TEXT_TRIM}`}
                                        >
                                            {pct(val(o.key), sum)}
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                            {i === rows.length - 1 ? (
                                <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                    {many || measure === 'runs' ? (
                                        <TipLine label="Runner time" value={dur(secs)} />
                                    ) : null}
                                    {many || measure === 'time' ? <TipLine label="Runs" value={int(runs)} /> : null}
                                    <div className="flex min-w-0 flex-col gap-0.5 text-muted-foreground">
                                        <span className="flex items-center justify-between gap-4">
                                            Slowest
                                            <span className="font-mono tabular-nums">{dur(slow.slow)}</span>
                                        </span>
                                        <span className="line-clamp-2 w-0 min-w-full">{slow.slowJob}</span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** The searchable job picker (a combobox-style popover list with each job's runner time). */
function JobPicker({
    jobs,
    value,
    onValueChange,
    totals,
    allTotal,
}: {
    jobs: RunnerJob[];
    value: string;
    onValueChange: (v: string) => void;
    totals: Record<string, number>;
    allTotal: number;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const current = jobs.find((j) => j.id === value);
    const needle = q.trim().toLowerCase();
    const list = jobs
        .filter((j) => !needle || `${j.name} ${j.id} ${j.schedule}`.toLowerCase().indexOf(needle) >= 0)
        .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0));
    const pick = (v: string) => {
        onValueChange(v);
        setOpen(false);
        setQ('');
    };
    const Item = ({
        id,
        icon,
        name,
        sub,
        amount,
    }: {
        id: string;
        icon: string;
        name: string;
        sub: any;
        amount: number;
    }) => (
        <button
            type="button"
            role="option"
            aria-selected={value === id}
            onClick={() => pick(id)}
            className="relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent [&_svg]:size-4 [&_svg]:shrink-0"
        >
            <Icon name={icon} className="text-muted-foreground" />
            <span className="flex min-w-0 flex-col">
                <span className="truncate">{name}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{sub}</span>
            </span>
            <span className="ms-auto shrink-0 ps-3 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {dur(amount)}
            </span>
            <Icon name="check" className={value === id ? '' : 'invisible'} />
        </button>
    );
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-expanded={open}
                        aria-label={`Jobs: ${current ? current.name : 'all jobs'}`}
                        className="bg-background"
                    />
                }
            >
                <Icon name="square-terminal" />
                <span
                    className={`max-w-40 overflow-x-clip text-ellipsis whitespace-nowrap @max-md:sr-only ${TEXT_TRIM}`}
                >
                    {current ? current.name : 'All Jobs'}
                </span>
                <Icon name="chevron-down" className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 gap-1 p-1">
                <div className="flex h-8 items-center gap-2 border-b px-2 text-muted-foreground [&_svg]:size-4">
                    <Icon name="search" />
                    <input
                        value={q}
                        onChange={(e: any) => setQ(e.target.value)}
                        placeholder="Search jobs…"
                        aria-label="Search jobs"
                        className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                </div>
                <div role="listbox" aria-label="Jobs" className="max-h-72 overflow-y-auto overscroll-contain">
                    {!needle ? (
                        <Item
                            id="all"
                            icon="layers"
                            name="All Jobs"
                            sub={<span className="font-mono">{`${jobs.length} jobs`}</span>}
                            amount={allTotal}
                        />
                    ) : null}
                    {list.map((j) => (
                        <Item
                            key={j.id}
                            id={j.id}
                            icon="square-terminal"
                            name={j.name}
                            sub={
                                <>
                                    <span className="font-mono">{j.id}</span>
                                    <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                                    <span className="truncate font-mono">{j.schedule}</span>
                                </>
                            }
                            amount={totals[j.id] || 0}
                        />
                    ))}
                    {!list.length ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No jobs found.</div>
                    ) : null}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function CronRunnerLoad({
    title = 'Run Time',
    description = 'Runner time by start hour, UTC',
    hours = HOURS,
    jobs = JOBS,
    priorDay = PRIOR_DAY,
    partialMinutes = PARTIAL_MINUTES,
    asOf = '14:20 UTC',
    className,
}: CronRunnerLoadProps) {
    const [win, setWin] = useState<Win>('24');
    const [jobId, setJobId] = useState('all');
    const [shown, setShown] = useState<Outcome[]>(ALL);
    const [measure, setMeasure] = useState<Measure>('time');
    const [layers, setLayers] = useState({ timeout: true, grid: true });
    const [auto, setAuto] = useState('off');
    const [hover, setHover] = useState<number | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [synced, setSynced] = useState('Synced 4m ago');
    const [loaded, setLoaded] = useState(false);
    const [replay, bump] = useReplayKey();
    const [busy, refresh] = useBusy(450, () => {
        setLoaded(true);
        bump();
        if (loaded) setSynced('Synced just now');
    });
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    useEffect(() => {
        refreshRef.current();
    }, []);
    useEffect(() => {
        const a = AUTO.find((x) => x.value === auto);
        if (!a || !a.ms) return undefined;
        const t = setInterval(() => refreshRef.current(), a.ms);
        return () => clearInterval(t);
    }, [auto]);

    const config = useMemo(
        () => ({
            succeeded: series('emerald-500', 'emerald-500', 'Succeeded'),
            timedOut: series('yellow-500', 'yellow-500', 'Timed Out'),
            failed: series('red-600', 'red-400', 'Failed'),
        }),
        []
    );

    const n = Number(win);
    const job = jobs.find((j) => j.id === jobId) || null;
    const allBuckets = useMemo(
        () => buildBuckets(hours, job ? [job] : jobs, partialMinutes),
        [hours, jobs, job, partialMinutes]
    );
    const buckets = allBuckets.slice(Math.max(0, allBuckets.length - n));
    const prior = allBuckets.slice(Math.max(0, allBuckets.length - 2 * n), Math.max(0, allBuckets.length - n));
    const sumOf = (list: Bucket[], k: Outcome, f: 'sec' | 'runs') => list.reduce((s, b) => s + b[k][f], 0);
    const secAll = ALL.reduce((s, k) => s + sumOf(buckets, k, 'sec'), 0);
    const runsAll = ALL.reduce((s, k) => s + sumOf(buckets, k, 'runs'), 0);
    const failSec = sumOf(buckets, 'timedOut', 'sec') + sumOf(buckets, 'failed', 'sec');
    const failRuns = sumOf(buckets, 'timedOut', 'runs') + sumOf(buckets, 'failed', 'runs');
    const fullPrior = prior.length === n;
    const priorSec = fullPrior ? ALL.reduce((s, k) => s + sumOf(prior, k, 'sec'), 0) : !job ? priorDay.seconds : 0;
    const priorRuns = fullPrior ? ALL.reduce((s, k) => s + sumOf(prior, k, 'runs'), 0) : !job ? priorDay.runs : 0;
    const peak = buckets.reduce(
        (a, b) => (total(b, ALL, measure) > total(a, ALL, measure) ? b : a),
        buckets[0] || allBuckets[0]
    );

    const totals = useMemo(() => {
        const out: Record<string, number> = {};
        const first = hours.length - n;
        jobs.forEach((j) => {
            out[j.id] = j.hours.filter((r) => r[0] >= first).reduce((s, r) => s + r[2] + r[4] + r[6], 0);
        });
        return out;
    }, [hours, jobs, n]);
    const allTotal = Object.keys(totals).reduce((s, k) => s + totals[k], 0);

    const unit = (b: Bucket, k: Outcome) => (shown.indexOf(k) >= 0 ? (measure === 'time' ? b[k].sec : b[k].runs) : 0);
    const rows = buckets.map((b, i) => ({
        label: b.label,
        i,
        succeeded: unit(b, 'succeeded'),
        timedOut: unit(b, 'timedOut'),
        failed: unit(b, 'failed'),
    }));
    const max = rows.reduce((m, r) => Math.max(m, r.succeeded + r.timedOut + r.failed), 0);
    const { top, ticks } = axis(max, measure);
    const topKey = rows.map((r) => {
        const on = ALL.filter((k) => r[k] > 0);
        return on.length ? on[on.length - 1] : null;
    });
    const burnIndex = (() => {
        if (shown.indexOf('timedOut') < 0 || !layers.timeout) return -1;
        let best = -1;
        let bestSec = 0;
        buckets.forEach((b, i) => {
            if (b.timedOut.sec > bestSec) {
                bestSec = b.timedOut.sec;
                best = i;
            }
        });
        return best;
    })();
    const step = (WINDOWS.find((w) => w.value === win) || WINDOWS[0]).step;

    const rootRef = useRef<HTMLDivElement>(null);
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '[data-rise]',
                keyframes: { transform: ['scaleY(0)', 'scaleY(1)'] },
                style: baselineOrigin,
                duration: 0.4,
                delay: (_i, el) => (Number(el.getAttribute('data-i')) || 0) * (0.36 / Math.max(1, n - 1)),
                ease: [0.23, 1, 0.32, 1],
            },
            {
                selector: '[data-callout]',
                keyframes: { opacity: [0, 1] },
                duration: 0.2,
                delay: 0.56,
                ease: 'linear',
            },
        ],
        [replay, view, win, measure, jobId]
    );

    const scopeLabel = job ? job.name : `All ${jobs.length} jobs`;
    const winLabel = (WINDOWS.find((w) => w.value === win) || WINDOWS[0]).label.toLowerCase();
    const summary = `${title}, ${scopeLabel}, ${winLabel}: ${dur(secAll)} of runner time over ${int(runsAll)} runs; failures ${dur(
        failSec
    )} (${pct(failSec, secAll, 1)}); peak hour ${peak ? peak.label : ''} with ${peak ? dur(total(peak, ALL, 'time')) : ''}.`;
    const tableRows = buckets.map((b) => ({
        hour: b.label,
        succeededRuns: b.succeeded.runs,
        succeededSec: b.succeeded.sec,
        timedOutRuns: b.timedOut.runs,
        timedOutSec: b.timedOut.sec,
        failedRuns: b.failed.runs,
        failedSec: b.failed.sec,
        succeeded: measure === 'time' ? b.succeeded.sec : b.succeeded.runs,
        timedOut: measure === 'time' ? b.timedOut.sec : b.timedOut.runs,
        failed: measure === 'time' ? b.failed.sec : b.failed.runs,
    }));
    const columns = [
        { key: 'hour', label: 'Hour (UTC)' },
        { key: 'succeededRuns', label: 'Succeeded runs' },
        { key: 'succeededSec', label: 'Succeeded seconds' },
        { key: 'timedOutRuns', label: 'Timed Out runs' },
        { key: 'timedOutSec', label: 'Timed Out seconds' },
        { key: 'failedRuns', label: 'Failed runs' },
        { key: 'failedSec', label: 'Failed seconds' },
    ];
    const tsv = [columns.map((c) => c.label).join('\t')]
        .concat(tableRows.map((r: any) => columns.map((c) => r[c.key]).join('\t')))
        .join('\n');
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };
    const reset = () => {
        setWin('24');
        setJobId('all');
        setShown(ALL);
        setMeasure('time');
        setLayers({ timeout: true, grid: true });
        setView('chart');
    };
    const outcomeLabel =
        shown.length === ALL.length
            ? 'All Outcomes'
            : shown.length === 1
              ? (OUTCOMES.find((o) => o.key === shown[0]) || OUTCOMES[0]).label
              : `${shown.length} Outcomes`;
    const legendValue = (k: Outcome) =>
        measure === 'time' ? dur(sumOf(buckets, k, 'sec')) : int(sumOf(buckets, k, 'runs'));
    const delta = (cur: number, before: number) => (before ? ((cur - before) / before) * 100 : null);
    const timeDelta = delta(secAll, priorSec);
    const runsDelta = delta(runsAll, priorRuns);
    const vs = `vs prior ${n}h`;

    return (
        <SeriesScope config={config} className={`w-full min-w-0 ${className || ''}`}>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription>{description}</FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ToolbarGroup aria-label="Data scope">
                            <MenuSelect
                                options={WINDOWS.map((w) => ({
                                    value: w.value,
                                    label: w.label,
                                    icon: w.icon,
                                    note: `Since ${hours[Math.max(0, hours.length - Number(w.value))]}${w.value === '24' ? ' yesterday' : ''}`,
                                }))}
                                value={win}
                                onValueChange={(v) => setWin(v as Win)}
                                icon="clock"
                                label="Time window"
                                menuLabel="Time Window"
                            />
                            <JobPicker
                                jobs={jobs}
                                value={jobId}
                                onValueChange={setJobId}
                                totals={totals}
                                allTotal={allTotal}
                            />
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Chart view">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-background"
                                            aria-label={`Outcomes shown: ${outcomeLabel}`}
                                        />
                                    }
                                >
                                    <Icon name="list-filter" />
                                    <span className={`@max-md:sr-only ${TEXT_TRIM}`}>{outcomeLabel}</span>
                                    <Icon name="chevron-down" className="text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Outcomes</DropdownMenuLabel>
                                        {OUTCOMES.map((o) => (
                                            <DropdownMenuCheckboxItem
                                                key={o.key}
                                                checked={shown.indexOf(o.key) >= 0}
                                                closeOnClick={false}
                                                onCheckedChange={(c: boolean) => {
                                                    const next = ALL.filter((k) =>
                                                        k === o.key ? c : shown.indexOf(k) >= 0
                                                    );
                                                    if (next.length) setShown(next);
                                                }}
                                            >
                                                {o.label}
                                                <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                                                    {legendValue(o.key)}
                                                </span>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Presets</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setShown(ALL)}>
                                            <Icon name="eye" />
                                            Show All
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShown(['timedOut', 'failed'])}>
                                            <Icon name="triangle-alert" />
                                            Failures Only
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" size="sm" className="bg-background" />}
                                >
                                    <Icon name="settings-2" />
                                    <span className={`@max-md:sr-only ${TEXT_TRIM}`}>Display</span>
                                    <Icon name="chevron-down" className="text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Measure</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={measure}
                                            onValueChange={(v: string) => setMeasure(v as Measure)}
                                        >
                                            <DropdownMenuRadioItem value="time">
                                                <Icon name="timer" />
                                                Runner Time
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="runs">
                                                <Icon name="hash" />
                                                Run Count
                                            </DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={layers.timeout}
                                            closeOnClick={false}
                                            onCheckedChange={(c: boolean) => setLayers((v) => ({ ...v, timeout: !!c }))}
                                        >
                                            <Icon name="target" />
                                            Timeout Marker
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={layers.grid}
                                            closeOnClick={false}
                                            onCheckedChange={(c: boolean) => setLayers((v) => ({ ...v, grid: !!c }))}
                                        >
                                            <Icon name="grid-2x2" />
                                            Gridlines
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Chart actions">
                            <RefreshButton
                                busy={busy}
                                onClick={refresh}
                                label="Refresh runs"
                                busyLabel="Refreshing runs"
                            />
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
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Export</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                downloadText('runner-time.csv', rowsToCsv(tableRows, columns));
                                                toast.success('CSV downloaded', {
                                                    description: 'runner-time.csv',
                                                });
                                            }}
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copy(tsv, 'Data')}>
                                            <Icon name="table" />
                                            Copy Data
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copy(summary, 'Summary')}>
                                            <Icon name="file-text" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Icon name="repeat" />
                                            Auto-refresh
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-auto min-w-44">
                                            <DropdownMenuRadioGroup
                                                value={auto}
                                                onValueChange={(v: string) => setAuto(v)}
                                            >
                                                {AUTO.map((a) => (
                                                    <DropdownMenuRadioItem key={a.value} value={a.value}>
                                                        <Icon name={a.icon} />
                                                        {a.label}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-column' : 'rows-3'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={reset}>
                                        <Icon name="rotate-ccw" />
                                        Reset View
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </div>
                </FrameHeader>
                <FramePanel className="@container/kpi">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 @3xl:-my-(--frame-panel-py) @3xl:grid-cols-4 @3xl:gap-0">
                        {measure === 'time' ? (
                            <>
                                <Kpi label="Runner Time" value={dur(secAll)}>
                                    {timeDelta != null ? (
                                        <>
                                            <DeltaChip value={timeDelta} />
                                            <Sub>{vs}</Sub>
                                        </>
                                    ) : (
                                        <Sub>{`${n}h window`}</Sub>
                                    )}
                                </Kpi>
                                <Kpi label="Runs" value={int(runsAll)}>
                                    <Sub>{`${Math.round(runsAll / n)} per hour`}</Sub>
                                </Kpi>
                                <Kpi label="Failure Time" value={dur(failSec)}>
                                    <Sub>{`${pct(failSec, secAll, 1)} of runner time`}</Sub>
                                </Kpi>
                                <Kpi label="Peak Hour" value={peak ? peak.label : '—'}>
                                    <Sub>{`${peak ? dur(total(peak, ALL, 'time')) : '0s'} runner time`}</Sub>
                                </Kpi>
                            </>
                        ) : (
                            <>
                                <Kpi label="Runs" value={int(runsAll)}>
                                    {runsDelta != null ? (
                                        <>
                                            <DeltaChip value={runsDelta} />
                                            <Sub>{vs}</Sub>
                                        </>
                                    ) : (
                                        <Sub>{`${n}h window`}</Sub>
                                    )}
                                </Kpi>
                                <Kpi label="Runner Time" value={dur(secAll)}>
                                    <Sub>{`${dur(secAll / n)} per hour`}</Sub>
                                </Kpi>
                                <Kpi label="Failed Runs" value={int(failRuns)}>
                                    <Sub>{`${pct(failRuns, runsAll, 1)} of runs`}</Sub>
                                </Kpi>
                                <Kpi label="Peak Hour" value={peak ? peak.label : '—'}>
                                    <Sub>{`${peak ? int(total(peak, ALL, 'runs')) : 0} runs`}</Sub>
                                </Kpi>
                            </>
                        )}
                    </dl>
                </FramePanel>
                <FramePanel className="flex flex-col gap-4">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={tableRows}
                                index="hour"
                                indexLabel="Hour (UTC)"
                                series={OUTCOMES.map((o) => ({ key: o.key, label: o.label }))}
                                valueFormatter={(v: number) => (measure === 'time' ? dur(v) : int(v))}
                                caption={`${measure === 'time' ? 'Runner time' : 'Runs'} per hour by outcome, ${winLabel}, ${scopeLabel}`}
                            />
                        }
                    >
                        <div
                            ref={rootRef}
                            data-busy={busy || !loaded ? 'true' : 'false'}
                            className="group/c32 relative h-72 w-full min-w-0 [&_g]:outline-hidden data-[busy=true]:[&_[data-rise]]:opacity-0"
                            onMouseLeave={() => setHover(null)}
                        >
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.BarChart
                                        data={rows}
                                        margin={{ top: 28, right: 8, bottom: 0, left: 0 }}
                                        barSize={20}
                                        accessibilityLayer
                                        onMouseMove={(st: any) =>
                                            setHover(
                                                st && st.activeTooltipIndex != null
                                                    ? Number(st.activeTooltipIndex)
                                                    : null
                                            )
                                        }
                                        onMouseLeave={() => setHover(null)}
                                    >
                                        {layers.grid ? (
                                            <R.CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        ) : null}
                                        <R.XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            interval={0}
                                            tickFormatter={(v: string) => (Number(v.slice(0, 2)) % step === 0 ? v : '')}
                                        />
                                        <R.YAxis
                                            width={36}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={6}
                                            domain={[0, top]}
                                            ticks={ticks}
                                            allowDataOverflow
                                            tickFormatter={(v: number) =>
                                                measure === 'time' ? `${Math.round(v / 60)}m` : `${v}`
                                            }
                                        />
                                        {R.ZIndexLayer ? (
                                            <R.ZIndexLayer zIndex={200}>
                                                <HoverBands count={rows.length} active={hover} />
                                            </R.ZIndexLayer>
                                        ) : null}
                                        <R.Tooltip
                                            cursor={false}
                                            isAnimationActive={false}
                                            position={{ y: 28 }}
                                            content={(tp: any) =>
                                                tp && tp.active && tp.label != null ? (
                                                    <RunnerTooltip
                                                        bucket={buckets.find((b) => b.label === tp.label) || null}
                                                        shown={shown}
                                                        measure={measure}
                                                    />
                                                ) : null
                                            }
                                        />
                                        {OUTCOMES.map((o) => (
                                            <R.Bar
                                                key={o.key}
                                                dataKey={o.key}
                                                stackId="runner"
                                                isAnimationActive={false}
                                                shape={(b: any) => {
                                                    const i = b.index;
                                                    if (!rows[i] || !(rows[i][o.key] > 0) || !(b.height > 0))
                                                        return <g />;
                                                    const isTop = topKey[i] === o.key;
                                                    const r = isTop ? 1.5 : 0;
                                                    const x = b.x;
                                                    const w = b.width;
                                                    const y = b.y;
                                                    const h = b.height;
                                                    const shapeOf = (hh: number) =>
                                                        r
                                                            ? `M${x},${y + r}A${r},${r},0,0,1,${x + r},${y}H${x + w - r}A${r},${r},0,0,1,${x + w},${y + r}V${y + hh}H${x}Z`
                                                            : `M${x},${y}h${w}v${hh}h${-w}Z`;
                                                    return (
                                                        <g
                                                            data-rise=""
                                                            data-i={i}
                                                            className={`transition-opacity duration-150 ${EASE} group-has-[:focus-visible]/c32:transition-none`}
                                                            style={{
                                                                opacity: hover != null && hover !== i ? 0.3 : 1,
                                                            }}
                                                        >
                                                            <path
                                                                className="recharts-rectangle"
                                                                d={shapeOf(h)}
                                                                fill={o.soft}
                                                            />
                                                            {isTop ? (
                                                                <path
                                                                    className="recharts-rectangle"
                                                                    d={shapeOf(Math.min(3, h))}
                                                                    fill={o.solid}
                                                                />
                                                            ) : null}
                                                        </g>
                                                    );
                                                }}
                                            />
                                        ))}
                                        {R.ZIndexLayer && burnIndex >= 0 ? (
                                            <R.ZIndexLayer zIndex={400}>
                                                <TimeoutCallout
                                                    index={burnIndex}
                                                    count={rows.length}
                                                    value={
                                                        rows[burnIndex].succeeded +
                                                        rows[burnIndex].timedOut +
                                                        rows[burnIndex].failed
                                                    }
                                                />
                                            </R.ZIndexLayer>
                                        ) : null}
                                    </R.BarChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                    <ul
                        aria-label="Legend"
                        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ps-9 pe-2"
                    >
                        {OUTCOMES.map((o) => {
                            const on = shown.indexOf(o.key) >= 0;
                            return (
                                <li
                                    key={o.key}
                                    className={`flex h-4 items-center gap-1.5 text-xs ${on ? '' : 'text-muted-foreground'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`size-2 shrink-0 rounded-full ${on ? o.dot : 'border border-muted-foreground/60'}`}
                                    />
                                    <span className={TEXT_TRIM}>{o.label}</span>
                                    <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                                        {legendValue(o.key)}
                                    </span>
                                    {on ? null : <span className="sr-only">(hidden)</span>}
                                </li>
                            );
                        })}
                    </ul>
                </FramePanel>
                <FrameFooter className="flex-row! flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-4 min-w-0 items-center">
                            <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {job ? `${job.name} · ${job.id}` : scopeLabel}
                            </span>
                        </span>
                        <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="flex h-4 items-center tabular-nums">
                            <span className={TEXT_TRIM}>{`As of ${asOf}`}</span>
                        </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-4 items-center tabular-nums">
                            <span className={TEXT_TRIM}>{busy && loaded ? 'Syncing…' : synced}</span>
                        </span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default CronRunnerLoad;
