import { useState } from 'react';
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
import { OutlineBadge } from 'components:charts/slope-kit';
import { TRIM, SepDot, PickMenu, Swatch, duration, ago, utc } from 'components:charts/status-kit';
import { JOBS, AS_OF } from './data';
import type { CronJob, CronRun, RunStatus } from './data';

/**
 * components:charts/cron-run-history: a status tracker with one row per cron job: name + command, the last run
 * (status, when, how long), the last 10 / 20 runs as capsules whose height is the run's duration (scaled per job),
 * and the job's success rate + p95. Fleet stats (success rate vs the older half of the window, runs by status,
 * failing jobs + longest failure streak, slowest p95), a hover card per run (time, status, duration, job p95, exit
 * code, trigger), a job filter (all / failing / healthy / paused), display options (run window, sort) and CSV /
 * copy-summary exports.
 *
 * Data (records later: one job row per sys_trigger / scheduled job, runs from its execution history):
 *   <CronRunHistory jobs={[{ key, name, command, paused?, runs: [{ at: ISO, status: 'succeeded' | 'failed' |
 *       'timed-out' | 'skipped', duration: seconds | null, exit: number | null, trigger: 'schedule' | 'manual' }] }]}
 *       asOf="2026-09-29T14:20Z" />
 *   Runs are oldest first; the block keeps the newest `window` (10 or 20) of them.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CronRunHistoryProps = {
    title?: string;
    jobs?: CronJob[];
    asOf?: string;
    defaultWindow?: 10 | 20;
    className?: string;
};

type JobRow = CronJob & {
    shown: CronRun[];
    last: CronRun | null;
    rate: number;
    p95: number | null;
    failing: boolean;
    streak: number;
    scale: number;
    index: number;
};

const TONE_BG: Record<RunStatus, string> = {
    succeeded: 'bg-success/45',
    failed: 'bg-destructive/85',
    'timed-out': 'bg-warning/90',
    skipped: 'bg-info/45 dark:bg-info/70',
};
const BADGE_TONE: Record<RunStatus, string> = {
    succeeded: 'success',
    failed: 'destructive',
    'timed-out': 'warning',
    skipped: 'info',
};
const LABEL: Record<RunStatus, string> = {
    succeeded: 'Succeeded',
    failed: 'Failed',
    'timed-out': 'Timed Out',
    skipped: 'Skipped',
};
const STATUSES: RunStatus[] = ['succeeded', 'failed', 'timed-out', 'skipped'];
const SORTS = [
    { value: 'attention', label: 'Needs Attention', icon: 'triangle-alert' },
    { value: 'rate', label: 'Success Rate', icon: 'circle-check' },
    { value: 'last', label: 'Last Run', icon: 'clock' },
    { value: 'name', label: 'Name', icon: 'arrow-down-a-z' },
];

const ran = (r: CronRun) => r.status !== 'skipped';
const pct1 = (f: number) => `${(Math.round(f * 1000) / 10).toFixed(1)}%`;
const pct0 = (f: number) => `${Math.round(f * 100)}%`;

function rateOf(runs: CronRun[]) {
    const done = runs.filter(ran);
    return done.length ? done.filter((r) => r.status === 'succeeded').length / done.length : 1;
}

/** Nearest-rank p95 of the run durations. */
function p95Of(runs: CronRun[]) {
    const ds = runs
        .map((r) => r.duration)
        .filter((d) => d != null)
        .sort((a, b) => (a as number) - (b as number)) as number[];
    if (!ds.length) return null;
    return ds[Math.max(0, Math.ceil(ds.length * 0.95) - 1)];
}

function median(values: number[]) {
    if (!values.length) return 0;
    const s = values.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function exitText(r: CronRun) {
    if (r.status === 'skipped') return 'None';
    if (r.exit == null) return r.status === 'timed-out' ? 'Killed at limit' : '-';
    return String(r.exit);
}

function RunCapsule({
    job,
    run,
    i,
    count,
    asOf,
    onKey,
}: {
    job: JobRow;
    run: CronRun;
    i: number;
    count: number;
    asOf: string;
    onKey: (e: any, i: number) => void;
}) {
    const h = run.duration == null ? 0 : Math.min(1, run.duration / (job.scale || 1));
    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                delay={120}
                closeDelay={60}
                render={
                    <button
                        type="button"
                        tabIndex={i === count - 1 ? 0 : -1}
                        data-run-index={i}
                        aria-label={`${utc(run.at)}, ${LABEL[run.status]}`}
                        onKeyDown={(e) => onKey(e, i)}
                        className="flex h-full min-w-0 cursor-default justify-center rounded-full px-0.5 transition-opacity duration-150 ease-out group-hover/strip:opacity-40 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring/50 motion-reduce:transition-none"
                    />
                }
            >
                {run.status === 'skipped' ? (
                    <span
                        aria-hidden="true"
                        className={`mt-auto mb-0.5 block size-1.5 rounded-full ${TONE_BG.skipped}`}
                    />
                ) : (
                    <span
                        aria-hidden="true"
                        className={`block h-full w-full max-w-2.5 rounded-full ${TONE_BG[run.status]}`}
                        style={{ clipPath: `inset(${((1 - h) * 100).toFixed(4)}% 0px 0px round 999px)` }}
                    />
                )}
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="flex h-4 items-center text-sm font-medium tabular-nums">
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {utc(run.at)}
                            </span>
                        </span>
                        <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {ago(run.at, asOf)}
                            </span>
                        </span>
                    </div>
                    <StatusBadge tone={BADGE_TONE[run.status]}>
                        <span className={TRIM}>{LABEL[run.status]}</span>
                    </StatusBadge>
                </div>
                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                <dl className="m-0 flex flex-col gap-2 text-xs">
                    {[
                        ['Duration', run.duration == null ? 'Did not run' : duration(run.duration)],
                        ['Job p95', duration(job.p95)],
                        ['Exit code', exitText(run)],
                        ['Trigger', run.trigger === 'manual' ? 'Manual' : 'Schedule'],
                    ].map(([k, v]) => (
                        <div key={k} className="flex h-4 items-center justify-between gap-4">
                            <dt className={`shrink-0 text-muted-foreground ${TRIM}`}>{k}</dt>
                            <dd
                                className={`m-0 truncate font-medium tabular-nums ${TRIM} ${k === 'Exit code' && /^\d+$/.test(v) ? 'font-mono' : ''}`}
                            >
                                {v}
                            </dd>
                        </div>
                    ))}
                </dl>
            </PopoverContent>
        </Popover>
    );
}

export function CronRunHistory({
    title = 'Run History',
    jobs = JOBS,
    asOf = AS_OF,
    defaultWindow = 20,
    className = '',
}: CronRunHistoryProps) {
    const [win, setWin] = useState<number>(defaultWindow);
    const [sort, setSort] = useState('attention');
    const [filter, setFilter] = useState('all');
    const [view, setView] = useState<'chart' | 'table'>('chart');

    const all: JobRow[] = jobs.map((j, index) => {
        const shown = j.runs.slice(-win);
        const done = shown.filter(ran);
        const last = done.length ? done[done.length - 1] : null;
        let streak = 0;
        for (let k = done.length - 1; k >= 0 && done[k].status !== 'succeeded'; k--) streak++;
        const ds = shown.map((r) => r.duration).filter((d) => d != null) as number[];
        return {
            ...j,
            shown,
            last,
            rate: rateOf(shown),
            p95: p95Of(shown),
            failing: !j.paused && !!last && last.status !== 'succeeded',
            streak,
            scale: Math.max(Math.max(0, ...ds), median(ds) * 1.25),
            index,
        };
    });
    const counts = {
        all: all.length,
        failing: all.filter((j) => j.failing).length,
        healthy: all.filter((j) => !j.paused && !j.failing).length,
        paused: all.filter((j) => j.paused).length,
    };
    const visible = all.filter((j) =>
        filter === 'failing'
            ? j.failing
            : filter === 'healthy'
              ? !j.paused && !j.failing
              : filter === 'paused'
                ? !!j.paused
                : true
    );
    const rank = (j: JobRow) => (j.paused ? 2 : j.failing ? 0 : 1);
    const sorted = visible.slice().sort((a, b) => {
        if (sort === 'rate') return a.rate - b.rate || a.index - b.index;
        if (sort === 'last') {
            const ta = a.last ? new Date(a.last.at).getTime() : 0;
            const tb = b.last ? new Date(b.last.at).getTime() : 0;
            return tb - ta;
        }
        if (sort === 'name') return a.name.localeCompare(b.name);
        return rank(a) - rank(b) || (rank(a) === 0 ? a.rate - b.rate : 0) || a.index - b.index;
    });

    // Fleet stats over the visible jobs.
    const runs = visible.reduce((acc: CronRun[], j) => acc.concat(j.shown), []);
    const byStatus: Record<string, number> = {};
    STATUSES.forEach((s) => {
        byStatus[s] = runs.filter((r) => r.status === s).length;
    });
    const rate = rateOf(runs);
    const half = Math.floor(win / 2);
    const older = visible.reduce((acc: CronRun[], j) => acc.concat(j.shown.slice(0, j.shown.length - half)), []);
    const newer = visible.reduce((acc: CronRun[], j) => acc.concat(j.shown.slice(-half)), []);
    const deltaPts = (rateOf(newer) - rateOf(older)) * 100;
    const failingJobs = visible.filter((j) => j.failing);
    const streak = Math.max(0, ...visible.map((j) => j.streak));
    const slowest = visible.filter((j) => j.p95 != null).sort((a, b) => (b.p95 as number) - (a.p95 as number))[0];
    const failed = byStatus.failed + byStatus['timed-out'];

    const summary =
        `${visible.length} cron jobs, last ${win} runs each, as of ${utc(asOf)}: ${pct1(rate)} succeeded ` +
        `(${deltaPts >= 0 ? 'up' : 'down'} ${Math.abs(deltaPts).toFixed(1)} pts vs older runs), ${runs.length} runs, ${failed} failed. ` +
        `${failingJobs.length} failing: ${failingJobs.map((j) => `${j.name} (${pct0(j.rate)})`).join(', ') || 'none'}.` +
        (slowest ? ` Slowest p95 ${duration(slowest.p95)} (${slowest.name}).` : '');
    const csvRows = visible.reduce(
        (acc: any[], j) =>
            acc.concat(
                j.shown.map((r) => ({
                    job: j.name,
                    command: j.command,
                    at: r.at,
                    status: LABEL[r.status],
                    duration: r.duration == null ? '' : r.duration,
                    exit: r.exit == null ? '' : r.exit,
                    trigger: r.trigger,
                }))
            ),
        []
    );
    const csvColumns = [
        { key: 'job', label: 'Job' },
        { key: 'command', label: 'Command' },
        { key: 'at', label: 'Started (UTC)' },
        { key: 'status', label: 'Status' },
        { key: 'duration', label: 'Duration (s)' },
        { key: 'exit', label: 'Exit code' },
        { key: 'trigger', label: 'Trigger' },
    ];
    const isDefault = win === defaultWindow && sort === 'attention' && filter === 'all' && view === 'chart';
    const reset = () => {
        setWin(defaultWindow);
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
        const next = strip && strip.querySelector(`[data-run-index="${Math.max(0, Math.min(count - 1, i + step))}"]`);
        if (next) next.focus();
    };

    const list = (
        <div>
            <div className="hidden h-10 items-center gap-x-6 px-(--frame-panel-px) text-xs text-muted-foreground @3xl/runs:flex!">
                <span className={`${TRIM} min-w-0 flex-1 @3xl/runs:w-64! @3xl/runs:flex-none!`}>Job</span>
                <span className={`${TRIM} w-36 shrink-0`}>Last Run</span>
                <span className="flex min-w-0 flex-1 basis-0 justify-between gap-3">
                    <span className={TRIM}>{`Last ${win} Runs`}</span>
                    <span className={TRIM}>Oldest to newest</span>
                </span>
                <span className={`${TRIM} ms-auto w-20 shrink-0 text-end`}>Success</span>
            </div>
            <div role="separator" className="hidden h-px w-full bg-border @3xl/runs:block!" />
            <div role="list" aria-label="Cron jobs" className="flex w-full flex-col divide-y divide-border">
                {sorted.length ? (
                    sorted.map((j) => (
                        <div
                            key={j.key}
                            role="listitem"
                            className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-(--frame-panel-px) py-2.5 transition-colors duration-100 @3xl/runs:min-h-16"
                        >
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @3xl/runs:w-64! @3xl/runs:flex-none!">
                                <span className="flex h-5 min-w-0 items-center gap-2 text-sm font-medium">
                                    <span
                                        className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap ${j.paused ? 'text-muted-foreground' : 'text-foreground'}`}
                                    >
                                        {j.name}
                                    </span>
                                    {j.paused ? <OutlineBadge className="font-normal">Paused</OutlineBadge> : null}
                                </span>
                                <span className="flex h-4 min-w-0 items-center font-mono text-xs text-muted-foreground">
                                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        {j.command}
                                    </span>
                                </span>
                            </div>
                            <div className="hidden w-36 shrink-0 @md/runs:block!">
                                {j.last ? (
                                    <div className="flex min-w-0 flex-col items-start gap-1.5">
                                        <StatusBadge tone={BADGE_TONE[j.last.status]}>
                                            <span className={TRIM}>{LABEL[j.last.status]}</span>
                                        </StatusBadge>
                                        <span className="flex h-4 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                            <span className={TRIM}>{ago(j.last.at, asOf)}</span>
                                            <SepDot />
                                            <span className={TRIM}>{duration(j.last.duration)}</span>
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                            <div
                                role="group"
                                aria-label={`${j.name}, last ${j.shown.length} runs, oldest first: ${pct0(j.rate)} succeeded`}
                                className={`group/strip order-last grid h-10 min-w-0 basis-full @3xl/runs:order-none! @3xl/runs:flex-1! @3xl/runs:basis-0! ${j.paused ? 'opacity-50' : ''}`}
                                style={{ gridTemplateColumns: `repeat(${win}, minmax(0px, 1fr))` }}
                            >
                                {j.shown.map((r, i) => (
                                    <RunCapsule
                                        key={r.at + i}
                                        job={j}
                                        run={r}
                                        i={i}
                                        count={j.shown.length}
                                        asOf={asOf}
                                        onKey={(e, k) => onStripKey(e, k, j.shown.length)}
                                    />
                                ))}
                            </div>
                            <div className="ms-auto w-20 shrink-0 text-end">
                                <div className="flex flex-col items-end gap-1.5 tabular-nums">
                                    <span className="flex h-5 items-center text-sm font-medium">
                                        <span className={TRIM}>{pct0(j.rate)}</span>
                                    </span>
                                    <span className="flex h-4 items-center text-xs whitespace-nowrap text-muted-foreground">
                                        <span className={TRIM}>{`p95 ${duration(j.p95)}`}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                        No jobs match this filter.
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
            <span className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums">{v}</span>
            {suffix ? <span className="text-sm text-muted-foreground tabular-nums">{suffix}</span> : null}
        </span>
    );
    const sub = 'flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground';

    return (
        <div className={`@container/c34 w-full min-w-0 ${className}`}>
            <Frame dense className="min-w-0">
                <FrameHeader className="min-w-0 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-72! flex-col gap-px">
                        <FrameTitle role="heading" className="truncate">
                            {title}
                        </FrameTitle>
                        <FrameDescription className="flex items-center gap-1.5 truncate tabular-nums">
                            <span>{`${jobs.length} cron jobs`}</span>
                            <SepDot />
                            <span>{`As of ${utc(asOf)}`}</span>
                        </FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <PickMenu
                            label="Show jobs"
                            menuLabel="Show"
                            value={filter}
                            onValueChange={setFilter}
                            className="w-40"
                            options={[
                                { value: 'all', label: 'All Jobs', icon: <Icon name="funnel" />, count: counts.all },
                                {
                                    value: 'failing',
                                    label: 'Failing',
                                    icon: <Swatch className="bg-destructive/85" />,
                                    count: counts.failing,
                                },
                                {
                                    value: 'healthy',
                                    label: 'Healthy',
                                    icon: <Swatch className="bg-success/45" />,
                                    count: counts.healthy,
                                },
                                {
                                    value: 'paused',
                                    label: 'Paused',
                                    icon: <Swatch className="bg-muted-foreground/40" />,
                                    count: counts.paused,
                                },
                            ]}
                        />
                        <div role="group" aria-label="List menus" className="flex w-fit items-stretch">
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
                                        <DropdownMenuLabel>Run Window</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={String(win)}
                                            onValueChange={(v: string) => setWin(Number(v))}
                                        >
                                            <DropdownMenuRadioItem value="10">
                                                <Icon name="chart-column" />
                                                Last 10 Runs
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="20">
                                                <Icon name="chart-column" />
                                                Last 20 Runs
                                            </DropdownMenuRadioItem>
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
                                            onClick={() => {
                                                downloadText('cron-run-history.csv', rowsToCsv(csvRows, csvColumns));
                                                toast.success('Run history downloaded as CSV');
                                            }}
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
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
                <FramePanel className="grid grid-cols-2 p-0 @3xl/c34:grid-cols-4!">
                    <div className={tile}>
                        {label('Success Rate')}
                        {value(pct1(rate))}
                        <span className={sub}>
                            <span
                                className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap tabular-nums [&_svg]:size-3.5 ${deltaPts < 0 ? 'text-destructive' : 'text-success'}`}
                            >
                                <Icon name={deltaPts < 0 ? 'trending-down' : 'trending-up'} />
                                <span className="sr-only">{deltaPts < 0 ? 'Down' : 'Up'}</span>
                                <span className={TRIM}>{`${Math.abs(deltaPts).toFixed(1)} pts`}</span>
                            </span>
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                vs older runs
                            </span>
                        </span>
                    </div>
                    <div className={`${tile} border-s`}>
                        {label('Runs')}
                        {value(String(runs.length))}
                        <span className={sub}>
                            <span className="flex h-1.5 min-w-0 flex-1 gap-0.5">
                                <span className="sr-only">
                                    {STATUSES.map((s) => `${byStatus[s]} ${LABEL[s]}`).join(', ')}
                                </span>
                                {STATUSES.filter((s) => byStatus[s]).map((s) => (
                                    <span
                                        key={s}
                                        className={`min-w-1.5 basis-0 rounded-full ${TONE_BG[s]}`}
                                        style={{ flexGrow: byStatus[s] }}
                                    />
                                ))}
                            </span>
                            <span className={`${TRIM} shrink-0 tabular-nums`}>{`${failed} failed`}</span>
                        </span>
                    </div>
                    <div className={`${tile} border-t @3xl/c34:border-s! @3xl/c34:border-t-0!`}>
                        {label('Failing Jobs')}
                        {value(String(failingJobs.length), `of ${visible.length}`)}
                        <span className={sub}>
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {streak
                                    ? `Longest streak ${streak} run${streak === 1 ? '' : 's'}`
                                    : 'No failure streaks'}
                            </span>
                        </span>
                    </div>
                    <div className={`${tile} border-s border-t @3xl/c34:border-t-0!`}>
                        {label('Slowest p95')}
                        {value(slowest ? duration(slowest.p95) : '-')}
                        <span className={sub}>
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {slowest ? slowest.name : ''}
                            </span>
                        </span>
                    </div>
                </FramePanel>
                <FramePanel className="@container/runs min-w-0 p-0">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <div className="p-(--frame-panel-px)">
                                <ChartDataTable
                                    data={sorted.map((j) => ({
                                        label: j.name,
                                        rate: j.rate * 100,
                                        runs: j.shown.length,
                                        p95: j.p95 || 0,
                                    }))}
                                    index="label"
                                    indexLabel="Job"
                                    series={[
                                        { key: 'rate', label: 'Success' },
                                        { key: 'runs', label: 'Runs' },
                                        { key: 'p95', label: 'p95' },
                                    ]}
                                    valueFormatter={(v: number, item: any) =>
                                        item && item.dataKey === 'rate'
                                            ? `${Math.round(v)}%`
                                            : item && item.dataKey === 'p95'
                                              ? duration(v)
                                              : String(v)
                                    }
                                    caption={`Cron jobs, last ${win} runs`}
                                />
                            </div>
                        }
                    >
                        {list}
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="min-h-10 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    <ul
                        aria-label="Bar tones"
                        className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0"
                    >
                        {STATUSES.map((s) => (
                            <li key={s} className="flex h-4 items-center gap-1.5">
                                <Swatch className={TONE_BG[s]} />
                                <span className={TRIM}>{LABEL[s]}</span>
                            </li>
                        ))}
                    </ul>
                    <span className={TRIM}>Bar height is run duration</span>
                </FrameFooter>
            </Frame>
        </div>
    );
}

export default CronRunHistory;
