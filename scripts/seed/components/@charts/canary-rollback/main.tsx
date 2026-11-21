import { useEffect, useId, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ChartToolbar,
    ToolbarGroup,
    ToolbarButton,
    SegmentedControl,
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
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { useElementWidth, useReplayKey } from 'components:charts/chart-kit';
import { TEXT_TRIM, StatusBadge, MetaDot, copyCsv, BelowBars } from 'components:charts/composed-kit';
import { PERCENTILES, STAGES, DEPLOY } from './data';
import type { Percentile, Stage } from './data';

/**
 * components:charts/canary-rollback: a canary's latency per sample as stacked columns (the baseline version's
 * latency, the regression on top of it up to the limit, the excess over the limit) under a dashed limit line,
 * with a rollout stage track ending at the rollback. Percentile toggle (p50 / p95 / p99), a Layers menu (over-limit
 * colour, limit line, stage track, gridlines), replay, CSV / copy exports and breach KPIs (peak, baseline, first
 * breach, time over the limit).
 *
 *   <CanaryRollback />                                                       sample data
 *   <CanaryRollback percentiles={[{ key, label, limit, points: [[canaryMs, baselineMs], ..] }]}
 *       stages={[{ label: 'Canary 25%', from: 0 }]} deploy={{ service, candidate, baseline, id, env, interval, outcome, at }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CanaryRollbackProps = {
    title?: string;
    percentiles?: Percentile[];
    stages?: Stage[];
    deploy?: typeof DEPLOY;
    defaultPercentile?: string;
    className?: string;
};

type Row = {
    i: number;
    t: number;
    label: string;
    title: string;
    canary: number;
    baseline: number;
    regression: number;
    over: number;
    stage: string;
};

const CHART_H = 256;
const TOP = 40;
const AXIS_W = 36;
const RIGHT = 4;
const X_AXIS_H = 30;
const PLOT_H = CHART_H - TOP - X_AXIS_H;
const BAR = 18;
const TIP_W = 192;
const LAYERS = ['breach', 'limit', 'steps', 'grid'];

const KEYFRAMES = `
@keyframes rp-c37-rise { from { transform: scaleY(0); } }
@keyframes rp-c37-land { from { opacity: 0; transform: scale(0.6); } }
@keyframes rp-c37-swap { from { opacity: 0.3; } }
@keyframes rp-c37-fade { from { opacity: 0; } }
@keyframes rp-c37-tip { from { opacity: 0; transform: scale(0.97); } }
[data-c37-tip] { animation: rp-c37-tip 150ms cubic-bezier(0.23, 1, 0.32, 1); }
[data-c37-rise] { animation: rp-c37-rise 360ms cubic-bezier(0.23, 1, 0.32, 1) var(--c37-delay, 0ms) backwards; transform-box: fill-box; transform-origin: bottom; }
[data-c37-land] { animation: rp-c37-land 180ms cubic-bezier(0.23, 1, 0.32, 1) var(--c37-delay, 0ms) backwards; transform-box: fill-box; transform-origin: center; }
[data-c37-intro="swap"] [data-c37-rise] { animation: none; }
[data-c37-intro="swap"] :is([data-c37-column], [data-c37-land]) { animation: rp-c37-swap 200ms cubic-bezier(0.23, 1, 0.32, 1) backwards; }
@media (prefers-reduced-motion: reduce) {
  [data-c37-rise], [data-c37-tip] { animation: none; }
  [data-c37-column], [data-c37-land] { animation: rp-c37-fade 200ms cubic-bezier(0.23, 1, 0.32, 1) backwards; }
}
`;

const FILL = {
    baseline: 'fill-slate-500/35 dark:fill-slate-400/40',
    regression: 'fill-sky-500/80 dark:fill-sky-500',
    over: 'fill-destructive/80 dark:fill-destructive group-data-[breach=off]/c37:fill-sky-500/80 dark:group-data-[breach=off]/c37:fill-sky-500',
};
const BG = {
    baseline: 'bg-slate-500/35 dark:bg-slate-400/40',
    regression: 'bg-sky-500/80 dark:bg-sky-500',
    over: 'bg-destructive/80 dark:bg-destructive',
};

const ms = (v: number) => `${Math.round(v)} ms`;
const signedMs = (v: number) => `${v < 0 ? '-' : '+'}${Math.abs(Math.round(v))} ms`;
/** 0:00 / 1:20 */
const clock = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
/** 50s / 1m 0s / 2m 10s */
const span = (t: number) => (t < 60 ? `${t}s` : `${Math.floor(t / 60)}m ${t % 60}s`);

function topRounded(x: number, y: number, w: number, h: number, r: number) {
    if (h <= 0 || w <= 0) return '';
    const rt = Math.min(r, w / 2, h / 2);
    if (!rt) return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
    return (
        `M${x},${y + rt}A${rt},${rt},0,0,1,${x + rt},${y}L${x + w - rt},${y}A${rt},${rt},0,0,1,${x + w},${y + rt}` +
        `L${x + w},${y + h}L${x},${y + h}Z`
    );
}

/** Reports the tooltip's active index to the block (mouse and keyboard alike). */
function ActiveSync({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
    useEffect(() => {
        onChange(index);
    }, [index, onChange]);
    return null;
}

/** The hover band: a full-height muted column (radius 4) under the bars. */
// ComposedChart hands a custom cursor the line `points` + the plot offset (not a band rectangle): the band is the
// plot width / category count, centred on the active category.
function BandCursor(p: any) {
    if (!p || !p.points || !p.points.length || !p.width) return null;
    const r = 4;
    const w = p.width / Math.max(1, p.count || 1);
    const x = p.points[0].x - w / 2;
    const y = TOP;
    const h = PLOT_H;
    return (
        <BelowBars lib={p.lib}>
            <path
                d={`M${x},${y + r}A${r},${r},0,0,1,${x + r},${y}L${x + w - r},${y}A${r},${r},0,0,1,${x + w},${y + r}L${x + w},${y + h - r}A${r},${r},0,0,1,${x + w - r},${y + h}L${x + r},${y + h}A${r},${r},0,0,1,${x},${y + h - r}Z`}
                className="pointer-events-none fill-muted"
            />
        </BelowBars>
    );
}

function TipLine({
    swatch,
    icon,
    label,
    value,
    className = '',
}: {
    swatch?: string;
    icon?: string;
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={`flex h-4 items-center justify-between gap-4 ${className}`}>
            <span className="inline-flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center">
                    {icon ? (
                        <Icon name={icon} className="size-4" />
                    ) : (
                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${swatch}`} />
                    )}
                </span>
                <span className={TEXT_TRIM}>{label}</span>
            </span>
            <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{value}</span>
        </div>
    );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: any }) {
    return (
        <div className="flex min-w-0 flex-col gap-2 @2xl:px-(--frame-panel-px) @2xl:py-(--frame-panel-py) @2xl:not-first:border-s">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
                <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{children}</span>
            </dd>
        </div>
    );
}

function Note({ children }: { children?: any }) {
    return (
        <span className="flex h-4 items-center truncate">
            <span className={TEXT_TRIM}>{children}</span>
        </span>
    );
}

export function CanaryRollback({
    title = 'Canary Latency',
    percentiles = PERCENTILES,
    stages = STAGES,
    deploy = DEPLOY,
    defaultPercentile = 'p95',
    className = '',
}: CanaryRollbackProps) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const [pct, setPct] = useState(defaultPercentile);
    const [layers, setLayers] = useState<string[]>(LAYERS);
    const [intro, setIntro] = useState<'draw' | 'swap'>('draw');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [active, setActive] = useState<number | null>(null);
    const [replay, doReplay] = useReplayKey();
    const plotRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(plotRef);
    const on = (k: string) => layers.indexOf(k) >= 0;

    const p = percentiles.find((x) => x.key === pct) || percentiles[0];
    const limit = p.limit;
    const stageAt = (i: number) => {
        let s = stages[0];
        stages.forEach((st) => {
            if (i >= st.from) s = st;
        });
        return s ? s.label : '';
    };
    const rows: Row[] = p.points.map(([c, b], i) => {
        const t = i * deploy.interval;
        return {
            i,
            t,
            label: clock(t),
            title: `${stageAt(i)}, ${span(t)} in`,
            canary: c,
            baseline: b,
            regression: c - b,
            over: c - limit,
            stage: stageAt(i),
        };
    });
    const n = rows.length;

    // KPIs.
    const mean = n ? rows.reduce((s, r) => s + r.baseline, 0) / n : 0;
    const peak = rows.reduce((a, r) => (!a || r.canary > a.canary ? r : a), null as Row | null);
    const peakDelta = peak && mean ? (peak.canary / mean - 1) * 100 : 0;
    const breaches = rows.filter((r) => r.canary > limit);
    const first = breaches[0];

    // Scale.
    const raw = Math.max(0, ...rows.map((r) => r.canary)) * 1.1;
    const step = raw > 300 ? 100 : 50;
    const yMax = Math.max(step, Math.ceil(raw / step) * step);
    const ticks: number[] = [];
    for (let v = 0; v <= yMax; v += step) ticks.push(v);
    const yOf = (v: number) => TOP + PLOT_H * (1 - v / yMax);
    const zeroY = yOf(0);
    const limitY = yOf(limit);
    const plotW = Math.max(0, (width || 0) - AXIS_W - RIGHT);
    const band = n ? plotW / n : 0;
    const cx = (i: number) => AXIS_W + band * (i + 0.5);

    const toggle = (k: string, v: boolean) => setLayers((cur) => (v ? cur.concat(k) : cur.filter((x) => x !== k)));
    const choose = (v: string) => {
        if (v === pct) return;
        setIntro('swap');
        setPct(v);
    };
    const replayRollout = () => {
        setIntro('draw');
        doReplay();
    };
    const reset = () => {
        setPct(defaultPercentile);
        setLayers(LAYERS);
        setView('chart');
    };

    const csvColumns = [
        { key: 'label', label: 'Time' },
        { key: 'stage', label: 'Stage' },
        { key: 'canary', label: `${deploy.candidate} ${p.label} ms`, value: (r: Row) => Math.round(r.canary) },
        { key: 'baseline', label: `${deploy.baseline} ${p.label} ms`, value: (r: Row) => Math.round(r.baseline) },
        { key: 'regression', label: 'Regression ms', value: (r: Row) => Math.round(r.regression) },
        { key: 'over', label: 'Over limit ms', value: (r: Row) => (r.over > 0 ? Math.round(r.over) : 0) },
    ];
    const summary =
        `${title}: ${deploy.service} ${deploy.candidate} vs ${deploy.baseline}, ${p.label}. ` +
        `Peak ${peak ? ms(peak.canary) : '-'} (+${Math.round(peakDelta)}% vs the ${ms(mean)} baseline mean). ` +
        (first
            ? `First breach at ${clock(first.t)} (${ms(first.canary)} vs the ${ms(limit)} limit); over the limit for ${span(breaches.length * deploy.interval)}, ${breaches.length} of ${n} samples. `
            : `No sample over the ${ms(limit)} limit. `) +
        `${deploy.outcome} ${deploy.at}.`;

    const tipContent = (tp: any) => {
        const idx = tp && tp.active && tp.payload && tp.payload.length ? tp.payload[0].payload.i : null;
        const r: Row | null = idx != null ? rows[idx] : null;
        let left = 0;
        let flip = false;
        if (r) {
            left = AXIS_W + band * (idx + 1) + 6;
            if (left + TIP_W > (width || 0) - RIGHT) {
                left = AXIS_W + band * idx - 6;
                flip = true;
            }
        }
        const tone = r ? (r.over > 0 && on('breach') ? BG.over : r.regression > 0 ? BG.regression : BG.baseline) : '';
        return (
            <>
                <ActiveSync index={idx} onChange={setActive} />
                {r ? (
                    <div style={{ transform: `translateX(${left}px)${flip ? ' translateX(-100%)' : ''}` }}>
                        <div data-c37-tip="" className={`${flip ? 'origin-top-right' : 'origin-top-left'}`}>
                            <div className="grid w-auto max-w-60 min-w-48 items-start gap-1.5 rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl">
                                <div className="font-medium">{r.title}</div>
                                <div className="flex flex-col gap-1.5">
                                    <TipLine swatch={tone} label={deploy.candidate} value={ms(r.canary)} />
                                    <TipLine
                                        swatch={BG.baseline}
                                        label={deploy.baseline}
                                        value={ms(r.baseline)}
                                        className="text-muted-foreground"
                                    />
                                    <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                        <TipLine
                                            icon={r.regression < 0 ? 'trending-down' : 'trending-up'}
                                            label="Regression"
                                            value={signedMs(r.regression)}
                                        />
                                        {r.over > 0 ? (
                                            <TipLine
                                                icon="circle-alert"
                                                label="Over limit"
                                                value={signedMs(r.over)}
                                                className="text-destructive"
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </>
        );
    };

    const columnShape = (sp: any) => {
        const r: Row = sp.payload;
        if (!r || !(sp.width > 0)) return <g />;
        const x = sp.x;
        const w = sp.width;
        const segs: { key: 'baseline' | 'regression' | 'over'; lo: number; hi: number }[] = [
            { key: 'baseline', lo: 0, hi: Math.min(r.baseline, r.canary) },
            { key: 'regression', lo: r.baseline, hi: Math.min(r.canary, limit) },
            { key: 'over', lo: limit, hi: r.canary },
        ].filter((s) => yOf(s.lo) - yOf(s.hi) - 2 >= 1) as any;
        const top = yOf(r.canary);
        const dim = active != null && active !== r.i;
        return (
            <g
                data-c37-column=""
                clipPath={`url(#${uid}c${r.i})`}
                className={`transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${dim ? 'opacity-30' : ''}`}
            >
                <clipPath id={`${uid}c${r.i}`}>
                    <rect
                        data-c37-rise=""
                        x={x - 1}
                        y={top - 1}
                        width={w + 2}
                        height={zeroY - top + 1}
                        style={{ '--c37-delay': `${r.i * 25}ms` } as any}
                    />
                </clipPath>
                {segs.map((s, si) => {
                    const yTop = yOf(s.hi);
                    const h = yOf(s.lo) - yTop - 2;
                    return (
                        <path
                            key={s.key}
                            d={topRounded(x, yTop, w, h, si === segs.length - 1 ? 3 : 0)}
                            className={`${FILL[s.key]} transition-[fill] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]`}
                        />
                    );
                })}
            </g>
        );
    };

    const xTick = (t: any) => (
        <text x={t.x} y={t.y} dy="0.71em" textAnchor="middle" className="fill-muted-foreground">
            {clock(Number(t.payload.value))}
        </text>
    );

    // Stage track: one segment per stage, ending at the rollback.
    const trackY = 26.5;
    const segX = (i: number) => cx(i) - 11;
    const endX = n ? cx(n - 1) + 11 : 0;
    const stageSegs = stages
        .filter((s) => s.from < n)
        .map((s, si, list) => ({
            label: s.label,
            x1: segX(s.from),
            x2: si < list.length - 1 ? segX(list[si + 1].from) : endX,
        }));

    const chart = (
        <div
            ref={plotRef}
            data-limit={on('limit') ? 'on' : 'off'}
            data-steps={on('steps') ? 'on' : 'off'}
            data-breach={on('breach') ? 'on' : 'off'}
            data-grid={on('grid') ? 'on' : 'off'}
            data-c37-intro={intro}
            className="group/c37 relative h-64 w-full min-w-0 [&_.recharts-cartesian-grid]:transition-opacity [&_.recharts-cartesian-grid]:duration-200 data-[grid=off]:[&_.recharts-cartesian-grid]:opacity-0"
        >
            <div key={`${pct}-${replay}`} className="h-full w-full">
                <ChartContainer config={{}} className="aspect-auto h-full w-full text-xs">
                    {(R: any) => (
                        <R.ComposedChart
                            data={rows}
                            margin={{ top: TOP, right: RIGHT, bottom: 0, left: 0 }}
                            accessibilityLayer
                            onMouseLeave={() => setActive(null)}
                        >
                            <R.CartesianGrid vertical={false} />
                            <R.XAxis
                                dataKey="t"
                                ticks={rows.filter((r) => r.i % 2 === 0).map((r) => r.t)}
                                interval={0}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={xTick}
                            />
                            <R.YAxis
                                width={AXIS_W}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={6}
                                domain={[0, yMax]}
                                ticks={ticks}
                                allowDataOverflow
                            />
                            <R.Tooltip
                                isAnimationActive={false}
                                cursor={<BandCursor lib={R} count={rows.length} />}
                                content={tipContent}
                                position={{ x: 0, y: TOP }}
                                wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
                            />
                            <R.Bar
                                dataKey="canary"
                                name={deploy.candidate}
                                barSize={BAR}
                                isAnimationActive={false}
                                shape={columnShape}
                            />
                        </R.ComposedChart>
                    )}
                </ChartContainer>
            </div>
            {width ? (
                <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-visible text-xs"
                    width={width}
                    height={CHART_H}
                >
                    <g className="transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[limit=off]/c37:opacity-0">
                        <line
                            stroke="var(--destructive)"
                            strokeDasharray="4 4"
                            strokeOpacity={0.7}
                            x1={AXIS_W}
                            y1={limitY}
                            x2={(width || 0) - RIGHT}
                            y2={limitY}
                        />
                        <text
                            x={AXIS_W + 4}
                            y={limitY - 6}
                            stroke="var(--card)"
                            strokeWidth={3}
                            paintOrder="stroke"
                            className="fill-destructive font-medium tabular-nums"
                        >
                            {`Limit ${ms(limit)}`}
                        </text>
                    </g>
                    <g
                        key={`track-${pct}-${replay}`}
                        className="transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[steps=off]/c37:opacity-0"
                    >
                        {stageSegs.map((s) => (
                            <g key={s.label}>
                                <line
                                    stroke="var(--success)"
                                    strokeWidth={1}
                                    x1={s.x1}
                                    y1={trackY}
                                    x2={s.x2}
                                    y2={trackY}
                                />
                                <text x={s.x1} y={18} className="fill-muted-foreground">
                                    {s.label}
                                </text>
                            </g>
                        ))}
                        <g data-c37-land="" style={{ '--c37-delay': '600ms' } as any}>
                            <text x={endX} y={18} textAnchor="end" className="fill-foreground font-medium">
                                {deploy.outcome}
                            </text>
                            <circle
                                fill="var(--destructive)"
                                stroke="var(--card)"
                                strokeWidth={1.5}
                                cx={endX}
                                cy={trackY}
                                r={3}
                            />
                        </g>
                    </g>
                </svg>
            ) : null}
        </div>
    );

    return (
        <div className={`w-full min-w-0 ${className}`}>
            <style>{KEYFRAMES}</style>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                        <span
                            data-slot="icon-tile"
                            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 [&_svg]:size-4"
                        >
                            <Icon name="activity" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-px">
                            <div className="flex min-w-0 items-center gap-2">
                                <FrameTitle role="heading" className="truncate">
                                    {title}
                                </FrameTitle>
                                <StatusBadge tone="destructive">{deploy.outcome}</StatusBadge>
                            </div>
                            <FrameDescription className="truncate">{`${deploy.service} ${deploy.candidate} vs ${deploy.baseline}`}</FrameDescription>
                        </div>
                    </div>
                    <ChartToolbar>
                        <SegmentedControl
                            label="Percentile"
                            value={pct}
                            onValueChange={choose}
                            options={percentiles.map((x) => ({ value: x.key, label: x.label }))}
                            className="bg-muted"
                        />
                        <ToolbarGroup aria-label="Chart actions">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-background"
                                            aria-label={`Layers, ${layers.length} of ${LAYERS.length} shown`}
                                        />
                                    }
                                >
                                    <Icon name="layers" />
                                    <span className={TEXT_TRIM}>Layers</span>
                                    <Icon name="chevron-down" className="text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Show</DropdownMenuLabel>
                                        {[
                                            { key: 'breach', label: 'Over Limit', icon: 'trending-up' },
                                            { key: 'limit', label: 'Limit Line', icon: 'circle-alert' },
                                            { key: 'steps', label: 'Stage Track', icon: 'timer' },
                                            { key: 'grid', label: 'Gridlines', icon: 'grid-2x2' },
                                        ].map((it) => (
                                            <DropdownMenuCheckboxItem
                                                key={it.key}
                                                checked={on(it.key)}
                                                onCheckedChange={(c: boolean) => toggle(it.key, c)}
                                                closeOnClick={false}
                                            >
                                                <Icon name={it.icon} />
                                                {it.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <ToolbarButton icon={<Icon name="play" />} label="Replay rollout" onClick={replayRollout} />
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
                                            onClick={() =>
                                                downloadText(
                                                    `${deploy.id.toLowerCase()}-${p.key}.csv`,
                                                    rowsToCsv(rows, csvColumns)
                                                )
                                            }
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copyCsv(rows, csvColumns)}>
                                            <Icon name="table" />
                                            Copy Data
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copyText(summary)}>
                                            <Icon name="file-text" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Deploy</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => copyText(deploy.id)}>
                                            <Icon name="copy" />
                                            Copy Deploy ID
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'chart-column' : 'sheet'} />
                                            {view === 'table' ? 'View as Chart' : 'View as Table'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={reset}>
                                            <Icon name="rotate-ccw" />
                                            Reset View
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="@container">
                    <dl className="grid grid-cols-2 gap-5 @2xl:-mx-(--frame-panel-px) @2xl:-my-(--frame-panel-py) @2xl:grid-cols-4! @2xl:gap-0!">
                        <Kpi label={`Peak ${p.label}`} value={peak ? ms(peak.canary) : '-'}>
                            <StatusBadge tone={peakDelta > 0 ? 'destructive' : 'success'}>
                                <Icon name={peakDelta > 0 ? 'trending-up' : 'trending-down'} />
                                <span className={`${TEXT_TRIM} tabular-nums`}>
                                    {`${peakDelta >= 0 ? '+' : '-'}${Math.abs(Math.round(peakDelta))}%`}
                                </span>
                            </StatusBadge>
                            <Note>vs baseline</Note>
                        </Kpi>
                        <Kpi label="Baseline" value={ms(mean)}>
                            <Note>{`${deploy.baseline} mean`}</Note>
                        </Kpi>
                        <Kpi label="First Breach" value={first ? clock(first.t) : 'None'}>
                            <Note>
                                {first ? `${ms(first.canary)} vs ${ms(limit)} limit` : `Under the ${ms(limit)} limit`}
                            </Note>
                        </Kpi>
                        <Kpi label="Over Limit" value={span(breaches.length * deploy.interval)}>
                            <Note>{`${breaches.length} of ${n} samples`}</Note>
                        </Kpi>
                    </dl>
                </FramePanel>
                <FramePanel>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                            <span className="flex h-4 items-center text-muted-foreground">
                                <span className={TEXT_TRIM}>{`${p.label} latency in milliseconds`}</span>
                            </span>
                            <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                    <span
                                        aria-hidden="true"
                                        className={`size-2 shrink-0 rounded-full ${BG.baseline}`}
                                    />
                                    <span className={TEXT_TRIM}>{`${deploy.baseline} baseline`}</span>
                                </li>
                                <li className="flex h-4 items-center gap-1.5">
                                    <span
                                        aria-hidden="true"
                                        className={`size-2 shrink-0 rounded-full ${BG.regression}`}
                                    />
                                    <span className={TEXT_TRIM}>Regression</span>
                                </li>
                                <li
                                    className={`flex h-4 items-center gap-1.5 ${on('breach') ? '' : 'text-muted-foreground'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`size-2 shrink-0 rounded-full ${on('breach') ? BG.over : 'border border-muted-foreground/60'}`}
                                    />
                                    <span className={TEXT_TRIM}>
                                        Over limit
                                        {on('breach') ? null : <span className="sr-only">, hidden</span>}
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            table={
                                <ChartDataTable
                                    data={rows}
                                    index="label"
                                    indexLabel="Time"
                                    series={[
                                        { key: 'canary', label: deploy.candidate },
                                        { key: 'baseline', label: deploy.baseline },
                                        { key: 'regression', label: 'Regression' },
                                    ]}
                                    valueFormatter={(v: number) => ms(v)}
                                    caption={`${title}, ${p.label}, ${deploy.candidate} vs ${deploy.baseline}`}
                                />
                            }
                        >
                            {chart}
                        </ChartFigure>
                    </div>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-4 items-center font-mono">
                            <span className={TEXT_TRIM}>{deploy.id}</span>
                        </span>
                        <MetaDot />
                        <span className="flex h-4 items-center font-mono">
                            <span className={TEXT_TRIM}>{deploy.env}</span>
                        </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>{`${deploy.interval}s samples`}</span>
                        </span>
                        <MetaDot />
                        <span className="flex h-4 items-center tabular-nums">
                            <span className={TEXT_TRIM}>{`${deploy.outcome} ${deploy.at}`}</span>
                        </span>
                    </span>
                </FrameFooter>
            </Frame>
        </div>
    );
}

export default CanaryRollback;
