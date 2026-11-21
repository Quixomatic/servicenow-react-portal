import { useId, useMemo, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    ToolbarGroup,
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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { useEnterAnimation } from 'components:charts/chart-kit';
import { TEXT_TRIM, ToneBadge, short } from 'components:charts/bar-more-kit';
import { CONNECTION, HOURS, RUNS } from './data';
import type { RunHour, Run } from './data';

/**
 * components:charts/sync-run-history: one connection's last 24 hours as hatched outcome columns (rows synced
 * or runs; succeeded / partial / failed, paused hours as a hatched track, failed markers under the column)
 * above its most recent runs. Success-rate headline, a stats list (rows, p50, freshness, next sync), hour
 * tooltips with the run split, the comparison (same hour yesterday or the 24h average), duration and error
 * code; All / Issues run filter, per-run actions, Sync Now (a live run that lands), pause and exports.
 *
 *   <SyncRunHistory />                                   sample data
 *   <SyncRunHistory connection={{ name, id, source, … }} hours={[…]} runs={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SyncRunHistoryProps = {
    connection?: typeof CONNECTION;
    hours?: RunHour[];
    runs?: Run[];
    /** Runs listed under the chart. */
    listSize?: number;
    className?: string;
};

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const pad = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

function dur(s: number, pad0 = false): string {
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    if (!m) return `${r}s`;
    return `${m}m ${pad0 ? String(r).padStart(2, '0') : r}s`;
}
function ago(min: number): string {
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
}

/** 4 intervals on a 1 / 2 / 4 / 5 / 10 step. */
function quarterTicks(max: number) {
    const raw = Math.max(max, 1) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    const step = Math.max(1, (r <= 1 ? 1 : r <= 2 ? 2 : r <= 4 ? 4 : r <= 5 ? 5 : 10) * mag);
    return { top: step * 4, ticks: [0, step, step * 2, step * 3, step * 4] };
}

const STATUS: Record<
    string,
    {
        label: string;
        tone: 'success' | 'warning' | 'destructive' | 'info' | 'outline';
        icon: string;
        text: string;
    }
> = {
    succeeded: {
        label: 'Succeeded',
        tone: 'success',
        icon: 'circle-check',
        text: 'text-success',
    },
    partial: {
        label: 'Partial',
        tone: 'warning',
        icon: 'triangle-alert',
        text: 'text-warning',
    },
    failed: {
        label: 'Failed',
        tone: 'destructive',
        icon: 'circle-x',
        text: 'text-destructive',
    },
    running: {
        label: 'Running',
        tone: 'info',
        icon: 'loader-2',
        text: 'text-primary',
    },
    paused: {
        label: 'Paused',
        tone: 'outline',
        icon: 'circle-pause',
        text: 'text-muted-foreground',
    },
};

const hourStatus = (h: RunHour) =>
    h.paused ? 'paused' : (h.f || 0) > 0 ? 'failed' : (h.p || 0) > 0 ? 'partial' : 'succeeded';

/** The hatched fills (tinted base + 45° strokes). */
function Hatch({ id, color, base }: { id: string; color: string; base: string }) {
    return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={base} />
            <path d="M-1 1 1-1M0 6 6 0M5 7 7 5" fill="none" stroke={color} strokeOpacity={0.62} strokeWidth="1" />
        </pattern>
    );
}
const tint = (v: string) => `color-mix(in oklab, var(${v}) 18%, var(--card))`;

function LegendSwatch({ kind }: { kind: string }) {
    const id = `rp-srh-lg-${kind}-${useId().replace(/:/g, '')}`;
    if (kind === 'failed')
        return (
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                <rect x="0" y="4.5" width="12" height="3" rx="1.5" fill="var(--destructive)" />
            </svg>
        );
    const color = kind === 'succeeded' ? '--success' : kind === 'partial' ? '--warning' : '';
    return (
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
            <defs>
                {color ? (
                    <Hatch id={id} color={`var(${color})`} base={tint(color)} />
                ) : (
                    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
                        <rect width="6" height="6" fill="var(--muted)" />
                        <path
                            d="M-1 1 1-1M0 6 6 0M5 7 7 5"
                            fill="none"
                            stroke="var(--muted-foreground)"
                            strokeOpacity={0.3}
                            strokeWidth="1"
                        />
                    </pattern>
                )}
            </defs>
            <rect width="12" height="12" rx="3" fill={`url(#${id})`} />
        </svg>
    );
}

function TipRow({ label, children }: { label: string; children?: any }) {
    return (
        <div className="flex h-4 items-center justify-between gap-4">
            <span className={`text-muted-foreground ${TEXT_TRIM}`}>{label}</span>
            <span className="flex items-center gap-1.5 tabular-nums">{children}</span>
        </div>
    );
}
const V = ({ children }: { children?: any }) => (
    <span className={`${TEXT_TRIM} font-medium text-foreground`}>{children}</span>
);

function HourTip({ h, compare, avg, now }: { h: RunHour; compare: string; avg: number; now: string }) {
    const st = STATUS[hourStatus(h)];
    const range = `${pad(h.hour)} to ${h.open ? 'now' : pad(h.hour + 1)}`;
    const total = (h.s || 0) + (h.p || 0) + (h.f || 0);
    let delta: number | null = null;
    if (!h.open) {
        if (compare === 'yesterday') delta = h.vsYesterday == null ? 0 : h.vsYesterday;
        else delta = avg ? Math.round(((h.rows || 0) / avg - 1) * 100) : 0;
    }
    return (
        <div className="grid w-64 min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="flex w-full flex-col gap-2">
                <div className="flex h-5 items-center justify-between gap-3">
                    <span className={`font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>{range}</span>
                    <ToneBadge tone={st.tone} icon={st.icon}>
                        <span className={TEXT_TRIM}>{st.label}</span>
                    </ToneBadge>
                </div>
                {h.paused ? (
                    <span className="text-pretty text-muted-foreground">{h.paused}</span>
                ) : (
                    <>
                        <div role="separator" className="h-px w-full shrink-0 bg-border" />
                        <div className="flex flex-col gap-1.5">
                            <TipRow label="Runs">
                                {[
                                    {
                                        k: 's',
                                        v: h.s,
                                        icon: 'circle-check',
                                        c: 'text-success',
                                        l: 'Succeeded',
                                    },
                                    {
                                        k: 'p',
                                        v: h.p,
                                        icon: 'triangle-alert',
                                        c: 'text-warning',
                                        l: 'Partial',
                                    },
                                    {
                                        k: 'f',
                                        v: h.f,
                                        icon: 'circle-x',
                                        c: 'text-destructive',
                                        l: 'Failed',
                                    },
                                ]
                                    .filter((x) => x.v)
                                    .map((x) => (
                                        <span key={x.k} className={`flex items-center gap-0.5 [&_svg]:size-3 ${x.c}`}>
                                            <Icon name={x.icon} />
                                            <V>{x.v}</V>
                                            <span className="sr-only">{x.l}</span>
                                        </span>
                                    ))}
                                {!total ? <V>0</V> : null}
                            </TipRow>
                            <TipRow label="Rows Synced">
                                <V>{short(h.rows || 0)}</V>
                            </TipRow>
                            <TipRow label={compare === 'yesterday' ? 'vs Yesterday' : 'vs 24h Avg'}>
                                <span className="flex items-center gap-1 text-foreground [&_svg]:size-3.5">
                                    {delta != null ? (
                                        <span className="flex text-muted-foreground">
                                            <Icon
                                                name={delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'minus'}
                                            />
                                        </span>
                                    ) : null}
                                    <V>
                                        {delta == null
                                            ? 'In progress'
                                            : delta === 0
                                              ? 'Level'
                                              : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}%`}
                                    </V>
                                </span>
                            </TipRow>
                            <TipRow label="Duration p50 / Max">
                                <V>{dur(h.p50 || 0, true)}</V>
                                <span className={`${TEXT_TRIM} text-muted-foreground`}>/</span>
                                <V>{dur(h.max || 0, true)}</V>
                            </TipRow>
                            <TipRow label="Error Rate">
                                <V>{total ? (((h.f || 0) / total) * 100).toFixed(1) : '0.0'}%</V>
                            </TipRow>
                        </div>
                        {h.issue ? (
                            <>
                                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                                <div className="flex flex-col gap-1">
                                    <span className="flex h-4 items-center justify-between gap-3">
                                        <span className={`font-mono font-medium text-foreground ${TEXT_TRIM}`}>
                                            {h.issue.code}
                                        </span>
                                        <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                                            {h.issue.runs} {h.issue.runs === 1 ? 'run' : 'runs'}
                                        </span>
                                    </span>
                                    <span className="text-pretty text-muted-foreground">{h.issue.message}</span>
                                </div>
                            </>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

/** One hour: track, hover wash, rising outcome segments clipped at the floor, failed marker. */
function HourColumn(props: any) {
    const { x, width, payload: h, background, measure, ids, top, lit } = props;
    if (!h || !background) return null;
    const bottom = background.y + background.height;
    const px = (v: number) => (v / top) * background.height;
    const segs: { key: string; v: number; fill: string; solid: string }[] = [];
    if (!h.paused) {
        if (measure === 'rows') {
            const part = h.partialRows || 0;
            segs.push({
                key: 's',
                v: (h.rows || 0) - part,
                fill: `url(#${ids.s})`,
                solid: 'var(--success)',
            });
            if (part)
                segs.push({
                    key: 'p',
                    v: part,
                    fill: `url(#${ids.p})`,
                    solid: 'var(--warning)',
                });
        } else {
            segs.push({
                key: 's',
                v: h.s || 0,
                fill: `url(#${ids.s})`,
                solid: 'var(--success)',
            });
            segs.push({
                key: 'p',
                v: h.p || 0,
                fill: `url(#${ids.p})`,
                solid: 'var(--warning)',
            });
            segs.push({
                key: 'f',
                v: h.f || 0,
                fill: `url(#${ids.f})`,
                solid: 'var(--destructive)',
            });
        }
    }
    let y = bottom;
    const placed = segs
        .filter((s) => s.v > 0)
        .map((s) => {
            const hgt = Math.round(px(s.v));
            y -= hgt;
            return { ...s, y, h: hgt };
        });
    const seg = (s: any, solid: boolean) => (
        <rect
            key={s.key}
            x={x}
            y={s.y}
            width={width}
            height={s.h}
            rx={4}
            fill={solid ? s.solid : s.fill}
            stroke="var(--card)"
            strokeWidth={4}
            paintOrder="stroke"
            vectorEffect="non-scaling-stroke"
        />
    );
    const fade = 'transition-opacity duration-150 ease-out motion-reduce:transition-none';
    return (
        <g data-hour={pad(h.hour)} data-lit={lit ? '' : undefined}>
            <rect
                data-fade=""
                x={x}
                y={background.y}
                width={width}
                height={background.height}
                rx={4}
                fill={h.paused ? `url(#${ids.m})` : 'var(--muted)'}
            />
            <rect
                x={x}
                y={background.y}
                width={width}
                height={background.height}
                rx={4}
                className={`fill-foreground/[0.06] ${fade}`}
                style={{ opacity: lit ? 1 : 0 }}
            />
            <g clipPath={`url(#${ids.floor})`}>
                <g data-rise={h.i} className="[transform-box:fill-box]">
                    {placed.map((s) => seg(s, false))}
                    <g className={fade} style={{ opacity: lit ? 1 : 0 }}>
                        {placed.map((s) => seg(s, true))}
                    </g>
                </g>
            </g>
            {measure === 'rows' && (h.f || 0) > 0 ? (
                <rect data-fade="" x={x} y={bottom + 3} width={width} height={3} rx={1.5} fill="var(--destructive)" />
            ) : null}
        </g>
    );
}

export function SyncRunHistory({
    connection = CONNECTION,
    hours = HOURS,
    runs = RUNS,
    listSize = 5,
    className,
}: SyncRunHistoryProps) {
    const uid = useId().replace(/:/g, '');
    const ids = {
        s: `${uid}-s`,
        p: `${uid}-p`,
        f: `${uid}-f`,
        m: `${uid}-m`,
        floor: `${uid}-floor`,
    };
    const [measure, setMeasure] = useState<'rows' | 'runs'>('rows');
    const [compare, setCompare] = useState('yesterday');
    const [filter, setFilter] = useState<'all' | 'issues'>('all');
    const [lit, setLit] = useState<number | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [paused, setPaused] = useState(false);
    const [live, setLive] = useState<Run[]>([]);
    const [shift, setShift] = useState(0);
    const [replay, setReplay] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);

    const syncing = live.some((r) => r.status === 'running');
    const landed = live.filter((r) => r.status === 'succeeded');
    const data = useMemo(
        () =>
            hours.map((h, i) => {
                const last = i === hours.length - 1;
                const extraRows = last ? landed.reduce((a, r) => a + (r.rows || 0), 0) : 0;
                const extraRuns = last ? landed.length : 0;
                const s = (h.s || 0) + extraRuns;
                const rows = (h.rows || 0) + extraRows;
                return {
                    ...h,
                    i,
                    s,
                    rows,
                    label: last && h.open ? 'Now' : pad(h.hour),
                    runs: s + (h.p || 0) + (h.f || 0),
                };
            }),
        [hours, landed.length]
    );
    const n = data.length;
    const totalRuns = data.reduce((a, h) => a + h.runs, 0);
    const completed = data.reduce((a, h) => a + (h.s || 0) + (h.p || 0), 0);
    const totalRows = data.reduce((a, h) => a + (h.rows || 0), 0);
    const complete = data.filter((h) => !h.paused && !h.open);
    const avgRows = complete.length ? complete.reduce((a, h) => a + (h.rows || 0), 0) / complete.length : 0;
    const rate = totalRuns ? (completed / totalRuns) * 100 : 0;
    const deltaPts = Math.round((rate - connection.priorSuccessRate) * 10) / 10;

    const axis = quarterTicks(Math.max(...data.map((h) => (measure === 'rows' ? h.rows || 0 : h.runs))));

    useEnterAnimation(
        rootRef,
        [
            {
                selector: '[data-fade]',
                keyframes: { opacity: [0, 1] },
                duration: 0.32,
                ease: EASE,
            },
            {
                selector: '[data-rise]',
                keyframes: {
                    transform: ['translateY(calc(100% + 2px))', 'translateY(0px)'],
                },
                duration: 0.52,
                delay: (_i, el) => 0.14 + 0.03 * (Number(el.getAttribute('data-rise')) || 0),
                ease: EASE,
            },
        ],
        [measure, replay, view]
    );

    const allRuns = live
        .map((r) => ({ ...r, ago: r.ago }))
        .concat(runs.map((r) => ({ ...r, ago: r.ago + shift })))
        .sort((a, b) => a.ago - b.ago);
    const listed = (
        filter === 'all' ? allRuns : allRuns.filter((r) => r.status === 'partial' || r.status === 'failed')
    ).slice(0, listSize);

    const syncNow = () => {
        if (syncing || paused) return;
        const num = Math.max(...allRuns.map((r) => Number(r.id.replace(/\D/g, '')) || 0)) + 1;
        const id = `RUN-${num}`;
        setLive((l) => [
            {
                id,
                status: 'running',
                trigger: 'Manual',
                ago: 0,
                started: connection.now + ':05',
                seconds: 0,
            },
            ...l,
        ]);
        setShift((s) => s + 1);
        toast.success('Sync started', { description: `${connection.name}, ${id}` });
        setTimeout(() => {
            setLive((l) => l.map((r) => (r.id === id ? { ...r, status: 'succeeded', rows: 912, seconds: 24 } : r)));
            setReplay((v) => v + 1);
        }, 2600);
    };

    const badge = syncing
        ? { tone: 'info' as const, label: 'Syncing' }
        : paused
          ? { tone: 'outline' as const, label: 'Paused' }
          : rate >= 95
            ? { tone: 'success' as const, label: 'Healthy' }
            : rate >= 85
              ? { tone: 'warning' as const, label: 'Degraded' }
              : { tone: 'destructive' as const, label: 'Failing' };

    const [nh, nm] = connection.nextSync.split(':').map(Number);
    const [th, tm] = connection.now.split(':').map(Number);
    const nextIn = Math.max(0, nh * 60 + nm - (th * 60 + tm) - shift);
    const stats = [
        { label: 'Rows Synced', value: short(totalRows) },
        { label: 'p50 Duration', value: dur(connection.p50) },
        {
            label: 'Freshness',
            value: landed.length ? '<1m' : '1m',
            note: `within ${connection.freshnessSlo} SLO`,
        },
        paused
            ? { label: 'Next Sync', value: 'Paused' }
            : {
                  label: 'Next Sync',
                  value: connection.nextSync,
                  note: `in ${nextIn}m`,
              },
    ];

    const summary = `${connection.name}, last 24 hours: ${rate.toFixed(1)}% success (${completed} of ${totalRuns} runs completed), ${short(totalRows)} rows synced.${data
        .filter((h) => h.issue)
        .map((h) => ` ${pad(h.hour)} ${h.issue!.code}: ${h.issue!.message}`)
        .join('')}`;
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };

    const runMeta = (r: Run) =>
        r.status === 'running'
            ? null
            : r.status === 'failed'
              ? { strong: '', rest: `Failed after ${dur(r.seconds, true)}` }
              : { strong: int(r.rows || 0), rest: `rows in ${dur(r.seconds)}` };

    return (
        <Frame className={`@container w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        data-slot="icon-tile"
                        className="relative isolate inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 p-0.75 align-middle after:absolute after:inset-0.75 after:-z-10 after:rounded-[calc(var(--radius-md)-3px)] after:border after:border-border after:bg-card after:shadow-xs [&_svg]:pointer-events-none [&_svg]:size-4.5 [&_svg]:shrink-0"
                    >
                        <Icon name={connection.icon} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-px">
                        <div className="flex h-5 min-w-0 items-center gap-2">
                            <FrameTitle className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {connection.name}
                            </FrameTitle>
                            <ToneBadge tone={badge.tone}>
                                <span className={TEXT_TRIM}>{badge.label}</span>
                            </ToneBadge>
                        </div>
                        <FrameDescription className="flex h-5 min-w-0 items-center gap-1.5">
                            <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {connection.source}
                            </span>
                            <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                            <span className={`whitespace-nowrap ${TEXT_TRIM}`}>{connection.env}</span>
                        </FrameDescription>
                    </div>
                </div>
                <ToolbarGroup aria-label="Connection actions">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-background"
                        disabled={syncing || paused}
                        onClick={syncNow}
                    >
                        <Icon name={syncing ? 'loader-2' : 'refresh-cw'} className={syncing ? 'animate-spin' : ''} />
                        <span className={TEXT_TRIM}>Sync Now</span>
                    </Button>
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
                        <DropdownMenuContent align="end" className="w-auto min-w-48">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                    <span className="block text-foreground">{connection.name}</span>
                                    <span className="block font-normal text-muted-foreground">
                                        {connection.id}, {connection.every}
                                    </span>
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Schedule</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setPaused(!paused);
                                        toast.success(paused ? 'Syncing resumed' : 'Syncing paused', {
                                            description: connection.name,
                                        });
                                    }}
                                >
                                    <Icon name={paused ? 'play' : 'pause'} />
                                    {paused ? 'Resume Syncing' : 'Pause Syncing'}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Export</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        const f = `${connection.name}-hourly.csv`;
                                        downloadText(
                                            f,
                                            rowsToCsv(
                                                data.map((h) => ({
                                                    ...h,
                                                    hourLabel: pad(h.hour),
                                                    status: STATUS[hourStatus(h)].label,
                                                })),
                                                [
                                                    { key: 'hourLabel', label: 'Hour (UTC)' },
                                                    { key: 'status', label: 'Status' },
                                                    { key: 's', label: 'Succeeded' },
                                                    { key: 'p', label: 'Partial' },
                                                    { key: 'f', label: 'Failed' },
                                                    { key: 'rows', label: 'Rows synced' },
                                                    { key: 'p50', label: 'p50 seconds' },
                                                    { key: 'max', label: 'Max seconds' },
                                                ]
                                            )
                                        );
                                        toast.success('CSV downloaded', { description: f });
                                    }}
                                >
                                    <Icon name="download" />
                                    Hourly CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        const f = `${connection.name}-runs.json`;
                                        downloadText(f, JSON.stringify(allRuns, null, 2), 'application/json');
                                        toast.success('JSON downloaded', { description: f });
                                    }}
                                >
                                    <Icon name="file-json-2" />
                                    Runs JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                    <Icon name={view === 'table' ? 'chart-column' : 'table'} />
                                    {view === 'table' ? 'View as Chart' : 'View as Table'}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Share</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => copy(connection.id, 'Connection ID')}>
                                    <Icon name="copy" />
                                    Copy Connection ID
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>
            </FrameHeader>
            <FramePanel className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 @lg:flex-row! @lg:items-end @lg:justify-between @lg:gap-8">
                    <div className="flex min-w-0 flex-col gap-2">
                        <span className="flex h-4 items-center text-xs text-muted-foreground">
                            <span className={TEXT_TRIM}>Success Rate</span>
                        </span>
                        <span className="flex h-7 items-center gap-3">
                            <span className={`text-xl font-semibold text-foreground tabular-nums ${TEXT_TRIM}`}>
                                {rate.toFixed(1)}%
                            </span>
                            <span
                                className={`flex h-4 items-center gap-1 text-xs font-medium tabular-nums [&_svg]:size-3.5 ${deltaPts >= 0 ? 'text-success' : 'text-destructive'}`}
                            >
                                <Icon name={deltaPts >= 0 ? 'trending-up' : 'trending-down'} />
                                <span className={TEXT_TRIM}>
                                    {deltaPts >= 0 ? '+' : '−'}
                                    {Math.abs(deltaPts).toFixed(1)} pts
                                </span>
                                <span className={`font-normal text-muted-foreground ${TEXT_TRIM}`}>vs prior 24h</span>
                                <span className="sr-only">, {deltaPts >= 0 ? 'better' : 'worse'}</span>
                            </span>
                        </span>
                        <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                            <span className={TEXT_TRIM}>
                                {completed} of {totalRuns} runs in 24h completed
                            </span>
                        </span>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-xs @lg:w-64">
                        {stats.map((s) => (
                            <div key={s.label} className="contents">
                                <dt className="flex h-4 items-center text-muted-foreground">
                                    <span className={TEXT_TRIM}>{s.label}</span>
                                </dt>
                                <dd className="flex h-4 items-center justify-end gap-1.5 font-medium text-foreground tabular-nums">
                                    <span className={TEXT_TRIM}>{s.value}</span>
                                    {s.note ? (
                                        <span className={`font-normal text-muted-foreground ${TEXT_TRIM}`}>
                                            {s.note}
                                        </span>
                                    ) : null}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <section className="flex min-w-0 flex-col gap-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <h3 className="flex h-5 items-center text-sm font-medium">
                            <span className={TEXT_TRIM}>Last 24 Hours</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            {/* ReUI: the pressed item is muted, the others stay foreground. */}
                            <SegmentedControl
                                className="[&>[aria-checked=true]]:bg-muted [&>button]:text-foreground"
                                label="Plotted metric"
                                value={measure}
                                onValueChange={(v: any) => setMeasure(v)}
                                options={[
                                    { value: 'rows', label: 'Rows' },
                                    { value: 'runs', label: 'Runs' },
                                ]}
                            />
                            <ToolbarGroup aria-label="Chart settings">
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                className="bg-background"
                                                aria-label="Compare against"
                                                title="Compare against"
                                            />
                                        }
                                    >
                                        <Icon name="scale" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-auto">
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>Compare Each Hour To</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuRadioGroup value={compare} onValueChange={setCompare}>
                                                <DropdownMenuRadioItem value="yesterday">
                                                    Same Hour Yesterday
                                                </DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="average">
                                                    24h Hourly Average
                                                </DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </ToolbarGroup>
                        </div>
                    </div>
                    <ChartFigure
                        title={`${connection.name}, last 24 hours`}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={data.map((h) => ({ ...h, hourLabel: pad(h.hour) }))}
                                index="hourLabel"
                                indexLabel="Hour (UTC)"
                                series={[
                                    { key: 'rows', label: 'Rows synced' },
                                    { key: 's', label: 'Succeeded' },
                                    { key: 'p', label: 'Partial' },
                                    { key: 'f', label: 'Failed' },
                                ]}
                                valueFormatter={(v: number) => (v == null ? '' : int(v))}
                                caption={`${connection.name}, last 24 hours`}
                            />
                        }
                    >
                        <div ref={rootRef} className="flex flex-col gap-3">
                            <div className="relative h-52 w-full">
                                <ChartContainer config={{}} className="aspect-auto h-full w-full">
                                    {(R: any) => (
                                        <R.BarChart
                                            data={data}
                                            margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
                                            barSize={16}
                                            accessibilityLayer
                                            onMouseMove={(s: any) =>
                                                setLit(
                                                    s && s.activeTooltipIndex != null
                                                        ? Number(s.activeTooltipIndex)
                                                        : null
                                                )
                                            }
                                            onMouseLeave={() => setLit(null)}
                                        >
                                            <defs>
                                                <Hatch id={ids.s} color="var(--success)" base={tint('--success')} />
                                                <Hatch id={ids.p} color="var(--warning)" base={tint('--warning')} />
                                                <Hatch
                                                    id={ids.f}
                                                    color="var(--destructive)"
                                                    base={tint('--destructive')}
                                                />
                                                <pattern id={ids.m} width="6" height="6" patternUnits="userSpaceOnUse">
                                                    <rect width="6" height="6" fill="var(--muted)" />
                                                    <path
                                                        d="M-1 1 1-1M0 6 6 0M5 7 7 5"
                                                        fill="none"
                                                        stroke="var(--muted-foreground)"
                                                        strokeOpacity={0.3}
                                                        strokeWidth="1"
                                                    />
                                                </pattern>
                                                <clipPath id={ids.floor}>
                                                    <rect x="0" y="0" width="100%" height="178" />
                                                </clipPath>
                                            </defs>
                                            <R.XAxis
                                                dataKey="label"
                                                height={30}
                                                tickLine={false}
                                                axisLine={false}
                                                interval={0}
                                                tick={(t: any) =>
                                                    t.index === n - 1 || t.index % 4 === 3 ? (
                                                        <text
                                                            x={t.x}
                                                            y={t.y + 14}
                                                            textAnchor="middle"
                                                            className="fill-muted-foreground text-xs tabular-nums"
                                                        >
                                                            {t.payload.value}
                                                        </text>
                                                    ) : (
                                                        <g />
                                                    )
                                                }
                                            />
                                            <R.YAxis
                                                width={36}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={[0, axis.top]}
                                                ticks={axis.ticks}
                                                tick={(t: any) => (
                                                    <text
                                                        x={24}
                                                        y={Math.max(t.y, 9)}
                                                        dy="0.355em"
                                                        textAnchor="end"
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        {measure === 'rows' && t.payload.value >= 1000
                                                            ? `${t.payload.value / 1000}K`
                                                            : t.payload.value}
                                                    </text>
                                                )}
                                            />
                                            <R.Tooltip
                                                cursor={false}
                                                position={{ y: 0 }}
                                                isAnimationActive={false}
                                                content={({ active, payload }: any) =>
                                                    active && payload && payload.length ? (
                                                        <HourTip
                                                            h={payload[0].payload}
                                                            compare={compare}
                                                            avg={avgRows}
                                                            now={connection.now}
                                                        />
                                                    ) : null
                                                }
                                            />
                                            <R.Bar
                                                dataKey={measure === 'rows' ? 'rows' : 'runs'}
                                                isAnimationActive={false}
                                                background={false}
                                                activeBar={false}
                                                minPointSize={0}
                                                shape={(p: any) => (
                                                    <HourColumn
                                                        {...p}
                                                        background={{ y: 2, height: 176 }}
                                                        measure={measure}
                                                        ids={ids}
                                                        top={axis.top}
                                                        lit={lit === p.index}
                                                    />
                                                )}
                                            />
                                        </R.BarChart>
                                    )}
                                </ChartContainer>
                            </div>
                            <ul aria-label="Legend" className="flex items-center gap-x-3 text-xs text-muted-foreground">
                                {['succeeded', 'partial', 'failed', 'paused'].map((k) => (
                                    <li key={k} className="flex h-4 items-center gap-1.5">
                                        <LegendSwatch kind={k} />
                                        <span className={TEXT_TRIM}>{STATUS[k].label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </ChartFigure>
                </section>
            </FramePanel>
            <FramePanel>
                <section className="flex min-w-0 flex-col gap-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <h3 className="flex h-5 items-center text-sm font-medium">
                            <span className={TEXT_TRIM}>Recent Runs</span>
                        </h3>
                        <SegmentedControl
                            className="[&>[aria-checked=true]]:bg-muted [&>button]:text-foreground"
                            label="Runs shown"
                            value={filter}
                            onValueChange={(v: any) => setFilter(v)}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'issues', label: 'Issues' },
                            ]}
                        />
                    </div>
                    <ul className="-my-2 flex min-w-0 flex-col divide-y divide-border">
                        {listed.map((r) => {
                            const st = STATUS[r.status];
                            const meta = runMeta(r);
                            return (
                                <li key={r.id} className="group/run relative flex min-w-0 items-start gap-2.5 py-2">
                                    <span className="flex h-5 items-center">
                                        <span
                                            className={`flex size-4 shrink-0 items-center justify-center [&_svg:not([class*=size-])]:size-4 ${st.text}`}
                                        >
                                            <Icon
                                                name={st.icon}
                                                className={r.status === 'running' ? 'animate-spin' : ''}
                                            />
                                            <span className="sr-only">{st.label}</span>
                                        </span>
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                        <div className="flex h-5 min-w-0 items-center gap-3 text-xs tabular-nums">
                                            <span className="flex min-w-0 flex-1 items-center gap-2.5">
                                                <span className={`shrink-0 text-[13px] font-medium ${TEXT_TRIM}`}>
                                                    {r.id}
                                                </span>
                                                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                                    <span className="flex h-4 items-center gap-1 text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
                                                        <Icon
                                                            name={r.trigger === 'Manual' ? 'user' : 'calendar-clock'}
                                                        />
                                                        <span className={TEXT_TRIM}>{r.trigger}</span>
                                                    </span>
                                                    <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                                                    <span
                                                        className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                    >
                                                        {ago(r.ago)}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="hidden w-36 shrink-0 items-center justify-end gap-1 transition-[opacity,filter] duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] @lg:flex! pointer-fine:group-hover/run:opacity-0 pointer-fine:group-hover/run:blur-[2px]">
                                                {meta ? (
                                                    <>
                                                        {meta.strong ? (
                                                            <span className={`font-medium ${TEXT_TRIM}`}>
                                                                {meta.strong}
                                                            </span>
                                                        ) : null}
                                                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>
                                                            {meta.rest}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>
                                                        Syncing
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        {r.issue ? (
                                            <div className="flex min-w-0 items-center gap-1.5 text-xs">
                                                <span className="shrink-0 font-mono text-[11px] text-foreground">
                                                    {r.issue.code}
                                                </span>
                                                <span className="truncate text-muted-foreground">
                                                    {r.issue.message}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="absolute end-0 top-2 flex h-5 items-center opacity-0 transition-[opacity,scale,filter] duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:opacity-100 motion-safe:scale-95 motion-safe:blur-[2px] pointer-fine:group-hover/run:scale-100 pointer-fine:group-hover/run:opacity-100 pointer-fine:group-hover/run:blur-none pointer-coarse:opacity-100">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="size-6.75"
                                                        aria-label={`Actions for ${r.id}`}
                                                    />
                                                }
                                            >
                                                <Icon name="ellipsis" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-auto min-w-48">
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>
                                                        <span className="block text-foreground">{r.id}</span>
                                                        <span className="block font-normal text-muted-foreground">
                                                            {r.trigger}, started {r.started}
                                                        </span>
                                                        {meta ? (
                                                            <span className="block font-normal text-muted-foreground tabular-nums">
                                                                {meta.strong ? `${meta.strong} ` : ''}
                                                                {meta.rest}
                                                            </span>
                                                        ) : null}
                                                    </DropdownMenuLabel>
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Sync</DropdownMenuLabel>
                                                    <DropdownMenuItem disabled={syncing || paused} onClick={syncNow}>
                                                        <Icon name="refresh-cw" />
                                                        Sync Again
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Share</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => copy(r.id, 'Run ID')}>
                                                        <Icon name="copy" />
                                                        Copy Run ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            const f = `${r.id.toLowerCase()}.log`;
                                                            downloadText(
                                                                f,
                                                                [
                                                                    `${r.started} ${r.id} ${r.trigger.toLowerCase()} sync started (${connection.name})`,
                                                                    r.issue ? `${r.issue.code} ${r.issue.message}` : '',
                                                                    meta
                                                                        ? `${meta.strong ? meta.strong + ' ' : ''}${meta.rest}`
                                                                        : 'running',
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join('\n'),
                                                                'text/plain'
                                                            );
                                                            toast.success('Log downloaded', {
                                                                description: f,
                                                            });
                                                        }}
                                                    >
                                                        <Icon name="file-down" />
                                                        Download Log
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </FramePanel>
        </Frame>
    );
}

export default SyncRunHistory;
