import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, chartKey, useRecharts } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    ChartMoreMenu,
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
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from 'components:sheet';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import {
    series,
    SeriesScope,
    useEnterAnimation,
    useReplayKey,
    AccentPicker,
    ACCENTS,
} from 'components:charts/chart-kit';
import { TEXT_TRIM, RefreshButton, useBusy } from 'components:charts/bar-kit';
import { RUNS, PREVIOUS, JOB, DEPLOYS } from './data';
import type { CronRun, RunStatus, Job } from './data';

/**
 * components:charts/cron-run-durations: the last 20 runs of a scheduled job as stacked columns (queue
 * wait dots, execute diagonals, teardown lines) coloured by status, a rolling p50 to p95 band with the
 * p95 as a dashed line, the job's timeout as a dashed warning line, outlier markers, deploy markers,
 * KPI tiles with sparklines (success rate, p50, p95, timeout budget vs the previous 20 runs), a status
 * filter, display options, an accent picker, refresh, Run now (adds a running run that completes), a
 * run details sheet on click, and CSV / JSON / copy exports.
 *
 *   <CronRunDurations />                                    sample data
 *   <CronRunDurations job={{ name, schedule, timeout }} runs={[…]} previous={[…]} />
 *
 * Phase durations are seconds.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CronRunDurationsProps = {
    title?: string;
    job?: Job;
    runs?: CronRun[];
    previous?: CronRun[];
    deploys?: { before: string; label: string }[];
    className?: string;
};

const STATUSES: {
    key: RunStatus;
    label: string;
    icon: string;
    color: string;
}[] = [
    {
        key: 'succeeded',
        label: 'Succeeded',
        icon: 'circle-check',
        color: 'var(--runs-current)',
    },
    {
        key: 'failed',
        label: 'Failed',
        icon: 'circle-x',
        color: 'var(--destructive)',
    },
    {
        key: 'timedOut',
        label: 'Timed Out',
        icon: 'alarm-clock',
        color: 'var(--warning)',
    },
    {
        key: 'skipped',
        label: 'Skipped',
        icon: 'circle-slash',
        color: 'var(--muted-foreground)',
    },
    {
        key: 'running',
        label: 'Running',
        icon: 'loader-circle',
        color: 'var(--primary)',
    },
];
const STATUS = (k: RunStatus) => STATUSES.find((x) => x.key === k) || STATUSES[0];
const PHASES: { key: 'queue' | 'execute' | 'teardown'; label: string }[] = [
    { key: 'queue', label: 'Queue wait' },
    { key: 'execute', label: 'Execute' },
    { key: 'teardown', label: 'Teardown' },
];
const LAYERS = [
    { key: 'band', label: 'p50 to p95 band' },
    { key: 'outliers', label: 'Outliers' },
    { key: 'deploys', label: 'Deploys' },
    { key: 'timeout', label: 'Timeout line' },
];

function dur(sec: number): string {
    const v = Math.round(Math.abs(sec));
    if (v < 60) return `${v}s`;
    const m = Math.floor(v / 60);
    const r = v % 60;
    return `${m}m ${r < 10 ? `0${r}` : r}s`;
}

const total = (r: CronRun) => r.queue + r.execute + r.teardown;

function quantile(values: number[], q: number): number {
    if (!values.length) return 0;
    const v = values.slice().sort((a, b) => a - b);
    const at = (v.length - 1) * q;
    const lo = Math.floor(at);
    const hi = Math.ceil(at);
    return v[lo] + (v[hi] - v[lo]) * (at - lo);
}

type Stats = { success: number; p50: number; p95: number; budget: number };

function stats(list: CronRun[], timeout: number): Stats {
    const done = list.filter((r) => r.status !== 'running' && r.status !== 'skipped');
    const ok = done.filter((r) => r.status === 'succeeded').length;
    const d = done.map(total);
    const p95 = quantile(d, 0.95);
    return {
        success: done.length ? (ok / done.length) * 100 : 0,
        p50: quantile(d, 0.5),
        p95,
        budget: timeout ? (p95 / timeout) * 100 : 0,
    };
}

/** One phase pattern (6px tile) in a status colour. */
function PhasePattern({ id, phase, color }: { id: string; phase: string; color: string }) {
    return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={`color-mix(in oklab, ${color} 18%, var(--card))`} />
            {phase === 'queue' ? (
                <g fill={color} fillOpacity={0.72}>
                    <circle cx="1.5" cy="1.5" r="0.8" />
                    <circle cx="4.5" cy="4.5" r="0.8" />
                </g>
            ) : (
                <path
                    d={phase === 'execute' ? 'M-1 1 1-1M0 6 6 0M5 7 7 5' : 'M0 1.5H6M0 4.5H6'}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.62}
                    strokeWidth="1"
                />
            )}
        </pattern>
    );
}

function PhaseSwatch({ phase, color }: { phase: string; color: string }) {
    const id = `rp-crd-sw-${chartKey(useId())}`;
    return (
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
            <defs>
                <PhasePattern id={id} phase={phase} color={color} />
            </defs>
            <rect width="12" height="12" rx="2.5" fill={`url(#${id})`} />
        </svg>
    );
}

function StatusBadge({ status }: { status: RunStatus }) {
    const st = STATUS(status);
    return (
        <span
            data-slot="badge"
            className="relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border border-border bg-transparent px-1.25 py-0.5 text-xs font-medium whitespace-nowrap dark:bg-input/32 [&_svg]:size-3"
        >
            <span className="flex" style={{ color: st.color }}>
                <Icon name={st.icon} className={status === 'running' ? 'animate-spin' : ''} />
            </span>
            <span className={TEXT_TRIM}>{st.label}</span>
        </span>
    );
}

function Sparkline({ values, split }: { values: number[]; split: number }) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const n = values.length;
    const pt = (v: number, i: number) =>
        `${((i / Math.max(1, n - 1)) * 100).toFixed(2)},${(hi === lo ? 10 : 18 - ((v - lo) / (hi - lo)) * 16).toFixed(2)}`;
    const all = values.map(pt);
    return (
        <svg
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="h-5 min-w-0 flex-1 overflow-visible text-muted-foreground"
        >
            <polyline
                points={all.slice(0, split + 1).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity={0.35}
                vectorEffect="non-scaling-stroke"
            />
            <polyline
                points={all.slice(split).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

function Kpi({
    label,
    value,
    delta,
    good,
    spark,
    split,
}: {
    label: string;
    value: string;
    delta: string;
    good: boolean;
    up: boolean;
    spark: number[];
    split: number;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2 @xl/slo:px-5 @xl/slo:first:ps-0 @xl/slo:last:pe-0">
            <dt className="flex h-4 items-center text-xs text-muted-foreground">
                <span className={TEXT_TRIM}>{label}</span>
            </dt>
            <dd className="flex min-w-0 flex-col gap-2">
                <span className="flex h-6 items-center">
                    <span
                        className={`text-base font-semibold whitespace-nowrap text-foreground tabular-nums ${TEXT_TRIM}`}
                    >
                        {value}
                    </span>
                </span>
                <span className="flex h-5 min-w-0 items-center gap-3">
                    <span
                        className={`flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums [&_svg]:size-3.5 ${good ? 'text-success' : 'text-destructive'}`}
                    >
                        <Icon name={delta.charAt(0) === '-' ? 'trending-down' : 'trending-up'} />
                        <span className={TEXT_TRIM}>{delta}</span>
                        <span className="sr-only">{`, ${good ? 'better' : 'worse'} than the previous 20 runs`}</span>
                    </span>
                    <Sparkline values={spark} split={split} />
                </span>
            </dd>
        </div>
    );
}

/** Outlier markers: a small filled down-triangle above each outlier column (above the bars). */
function OutlierLayer({ rows }: { rows: { outlier?: boolean; total: number }[] }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    const y = R && R.useYAxisScale ? R.useYAxisScale() : null;
    if (!plot || !y || !rows.length) return null;
    const band = plot.width / rows.length;
    return (
        <g className="pointer-events-none transition-[opacity,visibility] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[outliers=off]/plot:invisible group-data-[outliers=off]/plot:opacity-0">
            {rows.map((r, i) => {
                if (!r.outlier) return null;
                const cx = plot.x + band * (i + 0.5);
                const top = y(r.total) - 3;
                return (
                    <g key={i} data-pop="" style={{ transformBox: 'view-box', transformOrigin: `${cx}px ${top}px` }}>
                        <path
                            d={`M${cx - 3.5} ${top - 5}H${cx + 3.5}L${cx} ${top}Z`}
                            fill="var(--foreground)"
                            stroke="var(--card)"
                            strokeWidth={2}
                            paintOrder="stroke"
                        />
                    </g>
                );
            })}
        </g>
    );
}

/** Deploy markers: a dotted line between two runs with the release label (band = plot width / run count). */
function DeployLayer({ deploys, count }: { deploys: { label: string; i: number }[]; count: number }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot || !deploys.length) return null;
    const band = plot.width / Math.max(1, count);
    return (
        <g className="pointer-events-none transition-[opacity,visibility] duration-200 group-data-[deploys=off]/plot:invisible group-data-[deploys=off]/plot:opacity-0">
            {deploys.map((dp) => {
                const x = Math.round(plot.x + band * dp.i) + 0.5;
                return (
                    <g key={dp.label} data-deploy="">
                        <line
                            x1={x}
                            x2={x}
                            y1={plot.y}
                            y2={plot.y + plot.height}
                            stroke="var(--foreground)"
                            strokeDasharray="2 2"
                            strokeOpacity={0.55}
                        />
                        <text
                            x={x + 6}
                            y={plot.y + 2}
                            dy="0.71em"
                            textAnchor="start"
                            className="fill-foreground font-medium tabular-nums"
                            stroke="var(--card)"
                            strokeWidth={4}
                            paintOrder="stroke"
                        >
                            {dp.label}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

function logTail(r: CronRun, job: Job): string[] {
    const [hh] = r.started.split(', ')[1].split(':');
    const at = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${hh}:${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
    };
    const lines = [
        `${at(0)} INFO  queued on ${job.queue}, attempt 1 of 3`,
        `${at(r.queue)} INFO  slot acquired, image features:${r.release}`,
        `${at(r.queue + 2)} INFO  reading transactions since last cut`,
    ];
    if (r.status === 'running') lines.push(`${at(r.queue + r.execute)} INFO  writing feature tables`);
    else if (r.status === 'timedOut')
        lines.push(`${at(total(r))} ERROR timed out after ${dur(job.timeout)}, run killed`);
    else if (r.status === 'failed') lines.push(`${at(total(r))} ERROR task failed, exit 1`);
    else {
        lines.push(`${at(r.queue + r.execute)} INFO  wrote 48 feature tables, lock released`);
        lines.push(`${at(total(r))} INFO  succeeded in ${dur(total(r))}, exit 0`);
    }
    return lines;
}

function RunSheet({
    run,
    job,
    onOpenChange,
    onRetry,
    config,
}: {
    config: Record<string, any>;
    run: CronRun | null;
    job: Job;
    onOpenChange: (open: boolean) => void;
    onRetry: () => void;
}) {
    const r = run;
    const t = r ? total(r) : 0;
    return (
        <Sheet open={!!r} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col gap-0 p-0">
                {r ? (
                    <SeriesScope config={config} className="contents [--runs-current:var(--color-runs)]">
                        <SheetHeader className="flex flex-row items-start gap-3 border-b">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex h-6 min-w-0 items-center gap-2">
                                    <SheetTitle className={TEXT_TRIM}>
                                        <span className="font-mono">{r.id}</span>
                                    </SheetTitle>
                                    <StatusBadge status={r.status} />
                                </div>
                                <SheetDescription className="truncate">{job.name}</SheetDescription>
                            </div>
                        </SheetHeader>
                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
                            <section className="flex flex-col gap-3">
                                <h3 className="text-xs font-medium text-muted-foreground">Summary</h3>
                                <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-sm">
                                    {[
                                        ['Started', r.started],
                                        ['Trigger', r.status === 'running' ? 'Manual' : 'Schedule'],
                                        [
                                            'Exit code',
                                            r.status === 'succeeded'
                                                ? '0'
                                                : r.status === 'running'
                                                  ? '–'
                                                  : r.status === 'timedOut'
                                                    ? '137'
                                                    : '1',
                                        ],
                                        ['Attempt', '1 of 3'],
                                        ['Duration', r.status === 'running' ? `${dur(t)} so far` : dur(t)],
                                        ['Release', r.release],
                                    ].map(([k, v]) => (
                                        <div key={k} className="contents">
                                            <dt className="text-muted-foreground">{k}</dt>
                                            <dd className="tabular-nums">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                            <section className="flex flex-col gap-3">
                                <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                    <span>Phases</span>
                                    <span className="text-foreground tabular-nums">{dur(t)}</span>
                                </h3>
                                <span aria-hidden="true" className="flex h-1.5 gap-0.5">
                                    {PHASES.filter((p) => r[p.key] > 0).map((p) => (
                                        <span
                                            key={p.key}
                                            className="basis-0 rounded-full"
                                            style={{
                                                flexGrow: r[p.key],
                                                background: STATUS(r.status).color,
                                                opacity: p.key === 'execute' ? 1 : 0.45,
                                            }}
                                        />
                                    ))}
                                </span>
                                <ul className="flex flex-col gap-2 text-sm">
                                    {PHASES.map((p) => (
                                        <li key={p.key} className="flex items-center gap-2">
                                            <PhaseSwatch phase={p.key} color={STATUS(r.status).color} />
                                            <span className="flex-1">{p.label}</span>
                                            <span className="w-12 text-end text-muted-foreground tabular-nums">
                                                {t ? `${((r[p.key] / t) * 100).toFixed(1)}%` : '–'}
                                            </span>
                                            <span className="w-16 text-end font-mono tabular-nums">
                                                {dur(r[p.key])}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            <section className="flex flex-col gap-3">
                                <h3 className="text-xs font-medium text-muted-foreground">Log Tail</h3>
                                <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-5">
                                    {logTail(r, job).join('\n')}
                                </pre>
                            </section>
                        </div>
                        <SheetFooter className="flex-row justify-end gap-2 border-t">
                            <Button variant="outline" size="sm" onClick={() => copyText(r.id)}>
                                <Icon name="copy" />
                                Copy ID
                            </Button>
                            <Button size="sm" onClick={onRetry} disabled={r.status === 'running'}>
                                <Icon name="rotate-cw" />
                                Retry
                            </Button>
                        </SheetFooter>
                    </SeriesScope>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

export function CronRunDurations({
    title = 'Run Durations',
    job = JOB,
    runs: initialRuns = RUNS,
    previous = PREVIOUS,
    deploys = DEPLOYS,
    className,
}: CronRunDurationsProps) {
    const [runs, setRuns] = useState<CronRun[]>(initialRuns);
    const [shown, setShown] = useState<RunStatus[]>(STATUSES.map((s) => s.key));
    const [layers, setLayers] = useState<Record<string, boolean>>({
        band: true,
        outliers: true,
        deploys: true,
        timeout: true,
    });
    const [accent, setAccent] = useState('teal');
    const [hover, setHover] = useState<number | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replay, bump] = useReplayKey();
    const [busy, refresh] = useBusy(700, bump);
    const timer = useRef<any>(null);
    useEffect(() => () => clearTimeout(timer.current), []);
    const acc = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];
    const uid = chartKey(useId());
    const id = (k: string) => `rp-crd-${uid}-${k}`;

    const config = useMemo(
        () => ({
            runs: series(acc.light, acc.dark, 'Runs'),
            band: series('neutral-500', 'neutral-400', 'p50 to p95'),
            total: series('neutral-900', 'neutral-200', 'Duration'),
        }),
        [acc.light, acc.dark]
    );

    const running = runs.some((r) => r.status === 'running');
    const runNow = () => {
        if (running) return;
        const last = runs[runs.length - 1];
        const n = Number(last.id.replace('RUN-', '')) + 1;
        const hh = last.hour < 10 ? `0${last.hour}` : `${last.hour}`;
        const next: CronRun = {
            id: `RUN-${n}`,
            started: `${last.day}, ${hh}:24 UTC`,
            hour: last.hour,
            day: last.day,
            status: 'running',
            queue: 22,
            execute: 141,
            teardown: 0,
            release: last.release,
        };
        setRuns((list) => list.slice(1).concat(next));
        timer.current = setTimeout(() => {
            setRuns((list) =>
                list.map((r) => (r.id === next.id ? { ...r, status: 'succeeded', execute: 428, teardown: 41 } : r))
            );
        }, 10000);
    };

    const all = previous.concat(runs);
    const cur = stats(runs, job.timeout);
    const prev = stats(previous, job.timeout);
    const rolling = (k: keyof Stats) =>
        all.map((_r, i) => stats(all.slice(Math.max(0, i - 19), i + 1), job.timeout)[k]);
    const split = previous.length - 1;

    const rows = useMemo(
        () =>
            runs.map((r, i) => {
                const window = runs
                    .slice(Math.max(0, i - 7), i + 1)
                    .concat(i < 7 ? previous.slice(previous.length - (7 - i)) : [])
                    .filter((x) => !x.outlier && x.status !== 'running' && x.status !== 'skipped')
                    .map(total);
                const p50 = quantile(window, 0.5) / 60;
                const p95 = quantile(window, 0.95) / 60;
                return { ...r, total: total(r) / 60, band: [p50, p95], p95, index: i };
            }),
        [runs, previous]
    );
    const focus = rows[hover != null && hover < rows.length ? hover : rows.length - 1];
    const timeoutMin = job.timeout / 60;
    const top = Math.ceil(timeoutMin * 1.1 * 2) / 2;
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += 5) ticks.push(v);
    const counts = (k: RunStatus) => runs.filter((r) => r.status === k).length;
    const allShown = shown.length === STATUSES.length;
    const nRows = rows.length;

    const rootRef = useRef<HTMLDivElement>(null);
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '[data-rise]',
                keyframes: { transform: ['translateY(100%)', 'translateY(0%)'] },
                style: { 'transform-box': 'fill-box' },
                duration: 0.28,
                delay: (i) => i * 0.0084,
                ease: [0.23, 1, 0.32, 1],
            },
            {
                selector: '.recharts-area, .recharts-line, .recharts-reference-line, [data-deploy]',
                keyframes: { opacity: [0, 1] },
                duration: 0.2,
                delay: 0.16,
                ease: 'linear',
            },
            {
                selector: '[data-pop]',
                keyframes: { transform: ['scale(0)', 'scale(1)'], opacity: [0, 1] },
                duration: 0.2,
                delay: 0.2,
                ease: [0.23, 1, 0.32, 1],
            },
        ],
        [replay, view]
    );

    const summary = `${title}, ${job.name}: last ${runs.length} runs, success rate ${cur.success.toFixed(1)}%, p50 ${dur(
        cur.p50
    )}, p95 ${dur(cur.p95)}, ${cur.budget.toFixed(1)}% of the ${dur(job.timeout)} timeout. Latest ${focus.id} ${STATUS(
        focus.status
    ).label.toLowerCase()} in ${dur(total(focus))}.`;
    const tableRows = runs.map((r) => ({
        id: r.id,
        started: r.started,
        status: STATUS(r.status).label,
        duration: dur(total(r)),
        queue: dur(r.queue),
        execute: dur(r.execute),
        teardown: dur(r.teardown),
        outlier: r.outlier ? 'Yes' : 'No',
        minutes: total(r) / 60,
    }));
    // Delta of the shown (1-decimal) values, as ReUI does: 77.0% vs 53.5% reads +23.5 pts.
    const pts = (a: number, b: number) => {
        const d = Math.round(a * 10) / 10 - Math.round(b * 10) / 10;
        return `${d >= 0 ? '+' : '-'}${Math.abs(d).toFixed(1)} pts`;
    };
    const secs = (a: number, b: number) => `${a - b >= 0 ? '+' : '-'}${dur(a - b)}`;
    const opened = runs.find((r) => r.id === openId) || null;
    const deployAt = deploys.map((d) => ({ ...d, i: runs.findIndex((r) => r.id === d.before) })).filter((d) => d.i > 0);

    return (
        <SeriesScope config={config} className={`w-full min-w-0 [--runs-current:var(--color-runs)] ${className || ''}`}>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span
                            role="img"
                            aria-label="Scheduler"
                            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs [&_svg]:size-4.5"
                        >
                            <Icon name="calendar-clock" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-px">
                            <div className="flex h-5 min-w-0 items-center gap-2">
                                <FrameTitle className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    {title}
                                </FrameTitle>
                            </div>
                            <FrameDescription>
                                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 max-sm:flex-col max-sm:items-start">
                                    <span className="flex h-5 min-w-0 items-center">
                                        <span
                                            className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                        >
                                            {job.name}
                                        </span>
                                    </span>
                                    <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40 max-sm:hidden" />
                                    <span className="flex h-5 items-center">
                                        <span className={TEXT_TRIM}>{job.schedule}</span>
                                    </span>
                                </span>
                            </FrameDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ToolbarGroup aria-label="View">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-background [&_svg]:size-3.5"
                                            aria-label={`Statuses shown: ${allShown ? 'All Statuses' : `${shown.length} of ${STATUSES.length}`}`}
                                        />
                                    }
                                >
                                    <Icon name="funnel" />
                                    <span className={`${TEXT_TRIM} tabular-nums`}>
                                        {allShown
                                            ? 'All Statuses'
                                            : shown.length === 1
                                              ? STATUS(shown[0]).label
                                              : `${shown.length} Statuses`}
                                    </span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                                        {STATUSES.map((s) => (
                                            <DropdownMenuCheckboxItem
                                                key={s.key}
                                                checked={shown.indexOf(s.key) >= 0}
                                                closeOnClick={false}
                                                onCheckedChange={(c: boolean) => {
                                                    const next = STATUSES.map((x) => x.key).filter((k) =>
                                                        k === s.key ? c : shown.indexOf(k) >= 0
                                                    );
                                                    if (next.length) setShown(next);
                                                }}
                                            >
                                                {s.label}
                                                <span className="ms-auto text-muted-foreground tabular-nums">
                                                    {counts(s.key)}
                                                </span>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        disabled={allShown}
                                        onClick={() => setShown(STATUSES.map((s) => s.key))}
                                    >
                                        Show all
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                                        {LAYERS.map((l) => (
                                            <DropdownMenuCheckboxItem
                                                key={l.key}
                                                checked={layers[l.key]}
                                                closeOnClick={false}
                                                onCheckedChange={(c: boolean) =>
                                                    setLayers((v) => ({ ...v, [l.key]: !!c }))
                                                }
                                            >
                                                {l.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AccentPicker
                                value={accent}
                                onChange={setAccent}
                                swatch="var(--runs-current)"
                                label="Chart color"
                            />
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Job actions">
                            <RefreshButton busy={busy} onClick={refresh} label="Refresh" busyLabel="Refreshing" />
                            <Button
                                variant="outline"
                                size="icon-sm"
                                className="bg-background"
                                aria-label={running ? 'Run in progress' : 'Run now'}
                                title={running ? 'Run in progress' : 'Run now'}
                                disabled={running}
                                onClick={runNow}
                            >
                                <Icon
                                    name={running ? 'loader-circle' : 'play'}
                                    className={running ? 'animate-spin' : ''}
                                />
                            </Button>
                            <ChartMoreMenu
                                title={title}
                                csv={{
                                    filename: 'run-durations.csv',
                                    rows: tableRows,
                                    columns: [
                                        { key: 'id', label: 'Run' },
                                        { key: 'started', label: 'Started' },
                                        { key: 'status', label: 'Status' },
                                        { key: 'duration', label: 'Duration' },
                                        { key: 'queue', label: 'Queue wait' },
                                        { key: 'execute', label: 'Execute' },
                                        { key: 'teardown', label: 'Teardown' },
                                        { key: 'outlier', label: 'Outlier' },
                                    ],
                                }}
                                json={{ filename: 'run-durations.json', data: runs }}
                                summary={summary}
                                items={[
                                    { type: 'separator' },
                                    {
                                        label: 'Open latest run',
                                        icon: <Icon name="square-arrow-out-up-right" />,
                                        onSelect: () => setOpenId(runs[runs.length - 1].id),
                                    },
                                    {
                                        label: 'Copy last run ID',
                                        icon: <Icon name="copy" />,
                                        onSelect: () => copyText(runs[runs.length - 1].id),
                                    },
                                    {
                                        label: view === 'table' ? 'View as chart' : 'View as table',
                                        icon: <Icon name={view === 'table' ? 'chart-column' : 'table'} />,
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                ]}
                            />
                        </ToolbarGroup>
                    </div>
                </FrameHeader>
                <FramePanel className="@container/slo">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 @xl/slo:grid-cols-4 @xl/slo:gap-0 @xl/slo:divide-x">
                        <Kpi
                            label="Success Rate"
                            value={`${cur.success.toFixed(1)}%`}
                            delta={pts(cur.success, prev.success)}
                            good={cur.success >= prev.success}
                            up={cur.success >= prev.success}
                            spark={rolling('success')}
                            split={split}
                        />
                        <Kpi
                            label="p50 Duration"
                            value={dur(cur.p50)}
                            delta={secs(cur.p50, prev.p50)}
                            good={cur.p50 <= prev.p50}
                            up={cur.p50 >= prev.p50}
                            spark={rolling('p50')}
                            split={split}
                        />
                        <Kpi
                            label="p95 Duration"
                            value={dur(cur.p95)}
                            delta={secs(cur.p95, prev.p95)}
                            good={cur.p95 <= prev.p95}
                            up={cur.p95 >= prev.p95}
                            spark={rolling('p95')}
                            split={split}
                        />
                        <Kpi
                            label="Timeout Budget"
                            value={`${cur.budget.toFixed(1)}%`}
                            delta={pts(cur.budget, prev.budget)}
                            good={cur.budget <= prev.budget}
                            up={cur.budget >= prev.budget}
                            spark={rolling('budget')}
                            split={split}
                        />
                    </dl>
                </FramePanel>
                <FramePanel className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                        <span className="flex h-5 min-w-0 items-center gap-2">
                            <StatusBadge status={focus.status} />
                            <span className={`font-mono font-medium text-foreground ${TEXT_TRIM}`}>{focus.id}</span>
                            <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                            <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>{focus.started}</span>
                        </span>
                        <span className="flex h-5 items-center gap-3">
                            {PHASES.filter((p) => focus[p.key] > 0 || focus.status !== 'running').map((p) =>
                                focus[p.key] > 0 || p.key !== 'teardown' ? (
                                    <span key={p.key} className="flex items-center gap-1.5">
                                        <PhaseSwatch phase={p.key} color={STATUS(focus.status).color} />
                                        <span className="sr-only">{p.label}</span>
                                        <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                                            {dur(focus[p.key])}
                                        </span>
                                    </span>
                                ) : null
                            )}
                            <span className={`text-sm font-semibold text-foreground tabular-nums ${TEXT_TRIM}`}>
                                {dur(total(focus))}
                                {focus.status === 'running' ? (
                                    <span className="font-normal text-muted-foreground"> so far</span>
                                ) : null}
                            </span>
                        </span>
                    </div>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={tableRows}
                                index="id"
                                indexLabel="Run"
                                series={[{ key: 'minutes', label: 'Duration' }]}
                                valueFormatter={(v: number) => dur(v * 60)}
                                caption={`The last ${runs.length} runs of ${job.name}, oldest first`}
                            />
                        }
                    >
                        <div
                            ref={rootRef}
                            data-outliers={layers.outliers ? 'on' : 'off'}
                            data-deploys={layers.deploys ? 'on' : 'off'}
                            data-band={layers.band ? 'on' : 'off'}
                            data-timeout={layers.timeout ? 'on' : 'off'}
                            className="group/plot h-60 w-full outline-offset-4 outline-ring/50 has-[.recharts-surface:focus-visible]:outline-2 [&_.recharts-area,&_.recharts-line]:transition-[opacity,visibility] [&_.recharts-area,&_.recharts-line]:duration-200 [&_.recharts-surface]:cursor-pointer [&_g]:outline-hidden data-[band=off]:[&_.recharts-area,&_.recharts-line]:invisible data-[band=off]:[&_.recharts-area,&_.recharts-line]:opacity-0 data-[timeout=off]:[&_.recharts-reference-line]:invisible"
                            onMouseLeave={() => setHover(null)}
                        >
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.ComposedChart
                                        data={rows}
                                        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                                        barCategoryGap="22%"
                                        accessibilityLayer
                                        onMouseMove={(st: any) =>
                                            setHover(
                                                st && st.activeTooltipIndex != null
                                                    ? Number(st.activeTooltipIndex)
                                                    : null
                                            )
                                        }
                                        onMouseLeave={() => setHover(null)}
                                        onClick={(st: any) => {
                                            const i =
                                                st && st.activeTooltipIndex != null
                                                    ? Number(st.activeTooltipIndex)
                                                    : -1;
                                            if (rows[i] && shown.indexOf(rows[i].status) >= 0) setOpenId(rows[i].id);
                                        }}
                                    >
                                        <defs>
                                            {STATUSES.map((s) =>
                                                PHASES.map((p) => (
                                                    <PhasePattern
                                                        key={`${p.key}-${s.key}`}
                                                        id={id(`${p.key}-${s.key}`)}
                                                        phase={p.key}
                                                        color={s.color}
                                                    />
                                                ))
                                            )}
                                        </defs>
                                        <R.CartesianGrid vertical={false} />
                                        <R.XAxis
                                            dataKey="id"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            interval={0}
                                            tick={(t: any) => {
                                                const r = rows[t.index];
                                                const show = r && (nRows - 2 - t.index) % 4 === 0;
                                                return (
                                                    <text
                                                        x={t.x}
                                                        y={t.y}
                                                        dy="0.71em"
                                                        textAnchor="middle"
                                                        className="fill-muted-foreground tabular-nums"
                                                    >
                                                        {show
                                                            ? r.hour === 0
                                                                ? r.day
                                                                : `${r.hour < 10 ? '0' : ''}${r.hour}:00`
                                                            : ''}
                                                    </text>
                                                );
                                            }}
                                        />
                                        <R.YAxis
                                            width={32}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={2}
                                            domain={[0, top]}
                                            ticks={ticks}
                                            tickFormatter={(v: number) => (v ? `${v}m` : '0')}
                                        />
                                        <R.Tooltip cursor={false} isAnimationActive={false} content={() => null} />
                                        <R.Area
                                            dataKey="band"
                                            type="monotone"
                                            fill="var(--muted-foreground)"
                                            fillOpacity={0.16}
                                            stroke="none"
                                            isAnimationActive={false}
                                            activeDot={false}
                                        />
                                        <R.Bar
                                            dataKey="total"
                                            isAnimationActive={false}
                                            shape={(b: any) => {
                                                const r = rows[b.index];
                                                if (!r) return <g />;
                                                const base = b.y + b.height;
                                                const per = r.total ? b.height / (r.total * 60) : 0;
                                                const rr = Math.min(4, b.width / 2);
                                                const d = `M${b.x},${base}V${b.y + rr}A${rr},${rr} 0 0 1 ${b.x + rr},${b.y}H${b.x + b.width - rr}A${rr},${rr} 0 0 1 ${b.x + b.width},${b.y + rr}V${base}Z`;
                                                const visible = shown.indexOf(r.status) >= 0;
                                                const op = !visible
                                                    ? 0.12
                                                    : hover != null && hover !== b.index
                                                      ? 0.35
                                                      : 1;
                                                const clip = id(`clip-${r.id}`);
                                                let y0 = base;
                                                return (
                                                    <g
                                                        key={r.id}
                                                        style={{ opacity: op }}
                                                        className="transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                    >
                                                        <g data-status={r.status}>
                                                            <clipPath id={clip}>
                                                                <path d={d} />
                                                            </clipPath>
                                                            <g clipPath={`url(#${clip})`}>
                                                                <g data-rise="">
                                                                    {PHASES.filter((p) => r[p.key] > 0).map((p) => {
                                                                        const h = r[p.key] * per;
                                                                        const y1 = y0 - h;
                                                                        const seg = `M${b.x},${y0}V${y1}H${b.x + b.width}V${y0}Z`;
                                                                        y0 = y1;
                                                                        return (
                                                                            <path
                                                                                key={p.key}
                                                                                d={seg}
                                                                                fill={`url(#${id(`${p.key}-${r.status}`)})`}
                                                                                stroke="var(--card)"
                                                                                strokeWidth={4}
                                                                                paintOrder="stroke"
                                                                                vectorEffect="non-scaling-stroke"
                                                                            />
                                                                        );
                                                                    })}
                                                                </g>
                                                            </g>
                                                        </g>
                                                    </g>
                                                );
                                            }}
                                        />
                                        <R.Line
                                            dataKey="p95"
                                            type="monotone"
                                            stroke="color-mix(in oklab, var(--muted-foreground) 70%, transparent)"
                                            strokeWidth={1}
                                            strokeDasharray="3 3"
                                            dot={false}
                                            activeDot={false}
                                            isAnimationActive={false}
                                        />
                                        <R.ReferenceLine
                                            y={timeoutMin}
                                            stroke="var(--warning)"
                                            strokeDasharray="4 4"
                                            ifOverflow="extendDomain"
                                        />

                                        {R.ZIndexLayer ? (
                                            <R.ZIndexLayer zIndex={450}>
                                                <OutlierLayer rows={rows} />
                                            </R.ZIndexLayer>
                                        ) : (
                                            <OutlierLayer rows={rows} />
                                        )}
                                        <DeployLayer deploys={deployAt} count={nRows} />
                                    </R.ComposedChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter>
                    <div className="@container/legend w-full">
                        <div className="flex items-center justify-between gap-x-6 text-xs">
                            <ul aria-label="Phases" className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                                {PHASES.map((p) => (
                                    <li key={p.key} className="flex h-4 items-center gap-1.5">
                                        <PhaseSwatch phase={p.key} color="var(--muted-foreground)" />
                                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>{p.label}</span>
                                    </li>
                                ))}
                            </ul>
                            <ul aria-label="Layers" className="hidden items-center gap-x-4 @2xl/legend:flex">
                                <li className="flex h-4 items-center gap-1.5">
                                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                                        <rect
                                            y="3"
                                            width="12"
                                            height="6"
                                            rx="1.5"
                                            fill="var(--muted-foreground)"
                                            fillOpacity={0.24}
                                        />
                                    </svg>
                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>p50 to p95</span>
                                </li>
                                <li className="flex h-4 items-center gap-1.5">
                                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                                        <path d="M2.5 3.5H9.5L6 8.5Z" fill="var(--foreground)" />
                                    </svg>
                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>Outlier</span>
                                </li>
                                <li className="flex h-4 items-center gap-1.5">
                                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                                        <line
                                            x1="6"
                                            x2="6"
                                            y1="0"
                                            y2="12"
                                            stroke="var(--foreground)"
                                            strokeDasharray="2 2"
                                            strokeOpacity={0.55}
                                        />
                                    </svg>
                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>Deploy</span>
                                </li>
                                <li className="flex h-4 items-center gap-1.5">
                                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                                        <line
                                            x1="0"
                                            x2="12"
                                            y1="6"
                                            y2="6"
                                            stroke="var(--warning)"
                                            strokeWidth="1.5"
                                            strokeDasharray="2 2"
                                        />
                                    </svg>
                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>Timeout</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </FrameFooter>
            </Frame>
            <RunSheet
                config={config}
                run={opened}
                job={job}
                onOpenChange={(o) => {
                    if (!o) setOpenId(null);
                }}
                onRetry={() => {
                    setOpenId(null);
                    runNow();
                }}
            />
        </SeriesScope>
    );
}

export default CronRunDurations;
