import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, useRecharts } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ChartToolbar,
    ToolbarGroup,
    rowsToCsv,
    downloadText,
    copyText,
} from 'components:chart-frame';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation } from 'components:charts/chart-kit';
import {
    TRIM,
    FADE,
    IconTile,
    MetaRow,
    BlockMenu,
    RangeTabs,
    DeltaPill,
    DashSwatch,
    DRAW_X,
    useIntro,
    fmtDay,
    fmtDate,
    fmtWeekDay,
    addDays,
    fixedZeroTicks,
} from 'components:charts/line-kit';
import { METRICS, RANGES, ANNOTATIONS, START_DATE, SERIES } from './data';
import type { Metric, MetricRange, Annotation } from './data';

/**
 * components:charts/metric-switcher: four KPI tiles (orders, revenue, active users, p95 latency) that
 * switch one area chart. The selected metric draws as a gradient area over the previous period's
 * dashed ghost line, with release / sale annotations, an optional average line and the last value
 * labelled. Range tabs (7D / 30D / 90D), a Display menu (previous period, annotations, average,
 * gridlines), CSV / copy exports and a table view.
 *
 *   <MetricSwitcher />                                              sample data
 *   <MetricSwitcher metrics={[…]} series={{ orders: [...] }} startDate="2026-01-02" />
 *
 * series: one value per day per metric key, starting at startDate. Each range compares its last N
 * days with the N days before (the series needs at least 2 × the longest range).
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type MetricSwitcherProps = {
    title?: string;
    description?: string;
    icon?: string;
    metrics?: Metric[];
    series?: Record<string, number[]>;
    startDate?: string;
    ranges?: MetricRange[];
    defaultRange?: string;
    defaultMetric?: string;
    annotations?: Annotation[];
    footerStart?: string[];
    syncedLabel?: string;
    className?: string;
};

const PLOT_TOP = 28;
const X_PAD = 8;

function formatValue(m: Metric, v: number, compactMoney = false): string {
    const r = Math.round(v);
    if (m.format === 'money') {
        if (compactMoney && Math.abs(v) >= 1000) {
            const a = Math.abs(v);
            const s = a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : `${(a / 1e3).toFixed(1)}K`;
            return `${v < 0 ? '-' : ''}$${s}`;
        }
        return `${r < 0 ? '-' : ''}$${Math.abs(r).toLocaleString('en-US')}`;
    }
    if (m.format === 'ms') return `${r.toLocaleString('en-US')} ms`;
    return r.toLocaleString('en-US');
}

function axisLabel(m: Metric, v: number): string {
    const a = Math.abs(v);
    const s = a >= 1e6 ? `${Number((a / 1e6).toFixed(1))}M` : a >= 1e3 ? `${Number((a / 1e3).toFixed(1))}K` : `${a}`;
    return `${v < 0 ? '-' : ''}${m.format === 'money' ? '$' : ''}${s}`;
}

function changePct(cur: number, prev: number): number {
    return prev ? (cur / prev - 1) * 100 : 0;
}

function signed1(n: number): string {
    const r = Number(Math.abs(n).toFixed(1));
    return `${n < 0 && r !== 0 ? '-' : n > 0 && r !== 0 ? '+' : ''}${Math.abs(n).toFixed(1)}%`;
}

/** Good / bad from the metric's direction; a small move the wrong way is a warning. */
function toneOf(m: Metric, delta: number): 'success' | 'warning' | 'destructive' {
    const good = m.lowerIsBetter ? delta <= 0 : delta >= 0;
    if (good) return 'success';
    return Math.abs(delta) < 5 ? 'warning' : 'destructive';
}

function Dot({ className }: { className?: string }) {
    return <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${className || ''}`} />;
}

/** Annotation marks (release line, sale band) at the plot top, plus the last value's halo dot. */
function Overlay({
    rows,
    annotations,
    domainMax,
    metric,
    avg,
}: {
    rows: any[];
    annotations: Annotation[];
    domainMax: number;
    metric: Metric;
    avg: number;
}) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot) return null;
    const n = rows.length;
    const w = plot.width - X_PAD * 2;
    const step = n > 1 ? w / (n - 1) : w;
    const x = (i: number) => plot.x + X_PAD + (n > 1 ? i * step : w / 2);
    const y = (v: number) => plot.y + ((domainMax - v) / (domainMax || 1)) * plot.height;
    const indexOf = (iso: string) => rows.findIndex((r) => r.date === iso);
    const first = rows[0].date;
    const last = rows[n - 1].date;
    const left = plot.x;
    const right = plot.x + plot.width;
    const marks = annotations
        .map((a, k) => {
            if (a.type === 'line') {
                const i = indexOf(a.date);
                if (i < 0) return null;
                const cx = x(i);
                return (
                    <g key={k}>
                        <line
                            className="transition-[translate,scale] duration-400 ease-out"
                            stroke="var(--muted-foreground)"
                            strokeDasharray="2 3"
                            strokeOpacity={0.5}
                            x1={0}
                            x2={0}
                            y1={plot.y}
                            y2={plot.y + plot.height}
                            style={{ translate: `${cx}px` }}
                        />
                        <text
                            className="fill-muted-foreground text-xs transition-[translate,scale] duration-400 ease-out"
                            x={0}
                            y={plot.y - 10}
                            textAnchor="middle"
                            style={{ translate: `${cx}px` }}
                        >
                            {a.label}
                        </text>
                    </g>
                );
            }
            if (a.to < first || a.from > last) return null;
            const i0 = indexOf(a.from < first ? first : a.from);
            const i1 = indexOf(a.to > last ? last : a.to);
            if (i0 < 0 || i1 < 0) return null;
            const x0 = Math.max(left, x(i0) - step / 2);
            const x1 = Math.min(right, x(i1) + step / 2);
            const bw = Math.max(1, x1 - x0);
            return (
                <g key={k}>
                    <rect
                        className="transition-[translate,scale] duration-400 ease-out"
                        fill="var(--muted-foreground)"
                        fillOpacity={0.08}
                        x={0}
                        y={plot.y}
                        width={1}
                        height={plot.height}
                        style={{ translate: `${x0}px`, scale: `${bw} 1`, transformOrigin: '0 0' }}
                    />
                    <text
                        className="fill-muted-foreground text-xs transition-[translate,scale] duration-400 ease-out"
                        x={0}
                        y={plot.y - 10}
                        textAnchor="middle"
                        style={{ translate: `${x0 + bw / 2}px` }}
                    >
                        {a.label}
                    </text>
                </g>
            );
        })
        .filter(Boolean);
    const li = n - 1;
    const lx = x(li);
    const ly = y(rows[li].current);
    return (
        <g>
            <g className={`pointer-events-none ${FADE} group-data-[annotations=off]/c6:opacity-0`}>{marks}</g>
            <g
                className="pointer-events-none transition-[translate,scale] duration-400 ease-out"
                style={{ translate: `0px ${y(avg)}px` }}
            >
                <line
                    className={`${FADE} opacity-0 group-data-[average=on]/c6:opacity-100`}
                    stroke="var(--foreground)"
                    strokeDasharray="1 3"
                    strokeLinecap="round"
                    strokeOpacity={0.45}
                    x1={plot.x}
                    x2={plot.x + plot.width}
                    y1={0}
                    y2={0}
                />
            </g>
            <g className={`pointer-events-none text-(--color-current) ${FADE} group-data-[intro=drawing]/c6:opacity-0`}>
                <circle fill="currentColor" fillOpacity={0.16} cx={lx} cy={ly} r={7} />
                <circle fill="currentColor" stroke="var(--card)" strokeWidth={1.5} cx={lx} cy={ly} r={3.5} />
                <text
                    className="fill-foreground text-xs font-medium tabular-nums"
                    stroke="var(--card)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    x={lx - 10}
                    y={ly - 10}
                    textAnchor="end"
                >
                    {formatValue(metric, rows[li].current)}
                </text>
            </g>
        </g>
    );
}

export function MetricSwitcher({
    title = 'Platform Metrics',
    description = 'Storefront health, period over period',
    icon = 'chart-line',
    metrics = METRICS,
    series: values = SERIES,
    startDate = START_DATE,
    ranges = RANGES,
    defaultRange = '30D',
    defaultMetric,
    annotations = ANNOTATIONS,
    footerStart = ['Production', 'UTC'],
    syncedLabel = 'Synced 2 min ago',
    className,
}: MetricSwitcherProps) {
    const initialRange = ranges.some((r) => r.key === defaultRange) ? defaultRange : ranges[0].key;
    const initialMetric = metrics.some((m) => m.key === defaultMetric) ? (defaultMetric as string) : metrics[0].key;
    const [rangeKey, setRangeKey] = useState(initialRange);
    const [metricKey, setMetricKey] = useState(initialMetric);
    const [previous, setPrevious] = useState(true);
    const [notes, setNotes] = useState(true);
    const [average, setAverage] = useState(false);
    const [grid, setGrid] = useState(true);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];
    const metricIndex = Math.max(
        0,
        metrics.findIndex((m) => m.key === metricKey)
    );
    const metric = metrics[metricIndex];

    const config = useMemo(
        () => ({
            current: series(metric.light, metric.dark, metric.label),
            previous: series('neutral-500', 'neutral-400', 'Previous period'),
        }),
        [metric.light, metric.dark, metric.label]
    );

    /** Tile totals / averages for every metric over the range and the period before it. */
    const tiles = useMemo(
        () =>
            metrics.map((m) => {
                const all = values[m.key] || [];
                const cur = all.slice(-range.days);
                const prev = all.slice(-range.days * 2, -range.days);
                const agg = (a: number[]) => {
                    const s = a.reduce((t, v) => t + v, 0);
                    return m.agg === 'avg' ? (a.length ? s / a.length : 0) : s;
                };
                const c = agg(cur);
                const p = agg(prev);
                return { metric: m, value: c, prev: p, delta: changePct(c, p) };
            }),
        [metrics, values, range.days]
    );

    const model = useMemo(() => {
        const all = values[metric.key] || [];
        const total = all.length;
        const days = Math.min(range.days, Math.floor(total / 2));
        const rows = [];
        for (let i = 0; i < days; i++) {
            const ci = total - days + i;
            const pi = ci - days;
            const cur = all[ci];
            const prev = all[pi];
            rows.push({
                date: addDays(startDate, ci),
                prevDate: addDays(startDate, pi),
                current: cur,
                previous: prev,
                change: changePct(cur, prev),
            });
        }
        const avg = rows.reduce((t, r) => t + r.current, 0) / (rows.length || 1);
        const max = Math.max(...rows.map((r) => Math.max(r.current, r.previous)));
        const ticks = fixedZeroTicks(max, 5);
        const xTicks: string[] = [];
        for (let i = rows.length - 1; i >= 0; i -= range.tickEvery || 1) xTicks.unshift(rows[i].date);
        return { rows, avg, ticks, xTicks };
    }, [values, metric.key, range.days, range.tickEvery, startDate]);

    const { rows, avg, ticks, xTicks } = model;
    const domainMax = ticks[ticks.length - 1];
    const curSpan = `${fmtDay(rows[0].date)} to ${fmtDay(rows[rows.length - 1].date)}`;
    const prevSpan = `${fmtDay(rows[0].prevDate)} to ${fmtDay(rows[rows.length - 1].prevDate)}`;
    const noteFor = (iso: string) => {
        const a = annotations.find((n) =>
            n.type === 'line' ? n.date === iso : iso >= (n as any).from && iso <= (n as any).to
        );
        return a ? a.label : null;
    };

    const rootRef = useRef<HTMLDivElement>(null);
    const intro = useIntro([rangeKey, metricKey, view], 480);
    useEnterAnimation(
        rootRef,
        [{ selector: '.recharts-area', keyframes: DRAW_X, duration: 0.45, delay: 0, ease: [0.42, 0, 0.58, 1] }],
        [rangeKey, metricKey, view]
    );

    const layersOn = [previous, notes, average, grid].filter(Boolean).length;
    const changed = rangeKey !== initialRange || metricKey !== initialMetric || !previous || !notes || average || !grid;
    const reset = () => {
        setRangeKey(initialRange);
        setMetricKey(initialMetric);
        setPrevious(true);
        setNotes(true);
        setAverage(false);
        setGrid(true);
    };

    const summary = `${metric.caption} over the last ${rows.length} days, with the ${rows.length} days before as a dashed line. Arrow keys move between days.`;
    const copySummary = `${title} (${range.label}): ${tiles
        .map((t) => `${t.metric.label} ${formatValue(t.metric, t.value, true)} (${signed1(t.delta)})`)
        .join(', ')}.`;
    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'current', label: metric.label },
        { key: 'prevDate', label: 'Previous date' },
        { key: 'previous', label: 'Previous' },
    ];

    return (
        <SeriesScope config={config} className={className}>
            <Frame stacked className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                        <IconTile icon={icon} />
                        <div className="flex min-w-0 flex-col gap-px">
                            <FrameTitle role="heading" className="truncate">
                                {title}
                            </FrameTitle>
                            <FrameDescription className="truncate">{description}</FrameDescription>
                        </div>
                    </div>
                    <ChartToolbar>
                        <RangeTabs
                            size="default"
                            options={ranges.map((r) => ({ value: r.key, label: r.label }))}
                            value={rangeKey}
                            onValueChange={setRangeKey}
                        />
                        <ToolbarGroup aria-label="Chart actions">
                            <BlockMenu
                                size="default"
                                label={`Display, ${layersOn} of 4 layers shown`}
                                trigger={{ icon: 'settings-2', text: 'Display' }}
                                show={[
                                    {
                                        label: 'Previous Period',
                                        icon: 'history',
                                        checked: previous,
                                        onChange: setPrevious,
                                    },
                                    { label: 'Annotations', icon: 'tag', checked: notes, onChange: setNotes },
                                    { label: 'Average Line', icon: 'minus', checked: average, onChange: setAverage },
                                    { label: 'Gridlines', icon: 'grid-2x2', checked: grid, onChange: setGrid },
                                ]}
                            />
                            <BlockMenu
                                size="default"
                                exports={[
                                    {
                                        label: 'Download CSV',
                                        icon: 'download',
                                        onSelect: () =>
                                            downloadText(`${metric.key}-${range.key}.csv`, rowsToCsv(rows, columns)),
                                    },
                                    {
                                        label: 'Copy Data',
                                        icon: 'table',
                                        onSelect: () => {
                                            copyText(rowsToCsv(rows, columns));
                                        },
                                    },
                                    {
                                        label: 'Copy Summary',
                                        icon: 'file-text',
                                        onSelect: () => {
                                            copyText(copySummary);
                                        },
                                    },
                                    {
                                        label: view === 'table' ? 'View as Chart' : 'View as Table',
                                        icon: view === 'table' ? 'chart-line' : 'table',
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                ]}
                                actions={[
                                    { label: 'Reset View', icon: 'rotate-ccw', onSelect: reset, disabled: !changed },
                                ]}
                            />
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel>
                    <div
                        role="group"
                        aria-label="Metric"
                        className="relative -mx-(--frame-panel-px) -my-(--frame-panel-py) grid auto-rows-fr grid-cols-2 @xl:grid-cols-4!"
                    >
                        {tiles.map((t, i) => {
                            const on = i === metricIndex;
                            const border =
                                i === 0
                                    ? ''
                                    : i === 1
                                      ? ' border-s'
                                      : i === 2
                                        ? ' border-t @xl:border-s! @xl:border-t-0!'
                                        : ' border-s border-t @xl:border-t-0!';
                            return (
                                <button
                                    key={t.metric.key}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setMetricKey(t.metric.key)}
                                    className={`flex min-w-0 flex-col items-start gap-2.5 px-(--frame-panel-px) py-(--frame-panel-py) text-start transition-colors outline-none hover:bg-muted/40 focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset${border}`}
                                >
                                    <span className="flex h-5 w-full min-w-0 items-center">
                                        <span
                                            className={`${TRIM} min-w-0 overflow-x-clip text-sm text-ellipsis whitespace-nowrap transition-colors ${on ? 'text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            {t.metric.label}
                                        </span>
                                    </span>
                                    <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
                                        {formatValue(t.metric, t.value, true)}
                                    </span>
                                    <span className="flex h-5 min-w-0 items-center gap-1.5">
                                        <DeltaPill up={t.delta >= 0} tone={toneOf(t.metric, t.delta)}>
                                            {signed1(t.delta)}
                                        </DeltaPill>
                                        <span className="flex h-4 min-w-0 items-center text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                            <span className={TRIM}>
                                                vs {formatValue(t.metric, t.prev, true)}
                                                <span className="sr-only"> in the prior period</span>
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute start-0 top-0 h-1/2 w-1/2 translate-x-(--ms-x2) translate-y-(--ms-y2) transition-[translate] duration-300 ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none @xl:h-full! @xl:w-1/4! @xl:translate-x-(--ms-x4)! @xl:translate-y-0!"
                            style={
                                {
                                    '--ms-x2': `${(metricIndex % 2) * 100}%`,
                                    '--ms-y2': `${Math.floor(metricIndex / 2) * 100}%`,
                                    '--ms-x4': `${metricIndex * 100}%`,
                                } as any
                            }
                        >
                            <span className="absolute inset-x-(--frame-panel-px) bottom-0 h-0.5 rounded-full bg-(--color-current) transition-colors duration-300" />
                        </span>
                    </div>
                </FramePanel>
                <FramePanel className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                        <span className="flex h-4 items-center text-muted-foreground">
                            <span className={TRIM}>{metric.caption}</span>
                        </span>
                        <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <li className="flex h-4 items-center gap-1.5">
                                <Dot className="bg-(--color-current)" />
                                <span className={`${TRIM} tabular-nums`}>{curSpan}</span>
                            </li>
                            <li
                                className={`flex h-4 items-center gap-1.5 text-muted-foreground ${FADE}${previous ? '' : ' opacity-0'}`}
                                aria-hidden={!previous}
                            >
                                <DashSwatch />
                                <span className={`${TRIM} tabular-nums`}>{prevSpan}</span>
                            </li>
                        </ul>
                    </div>
                    <ChartFigure
                        title={`${title}: ${metric.label}`}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="date"
                                indexLabel="Date"
                                series={[
                                    { key: 'current', label: metric.label },
                                    { key: 'previous', label: `Previous (${prevSpan})` },
                                ]}
                                valueFormatter={(v: number) => formatValue(metric, v)}
                                caption={`${metric.caption}, ${curSpan}`}
                            />
                        }
                    >
                        <div
                            ref={rootRef}
                            className="group/c6 h-72 w-full min-w-0 [&_.recharts-cartesian-grid]:transition-opacity [&_.recharts-cartesian-grid]:duration-200 data-[grid=off]:[&_.recharts-cartesian-grid]:opacity-0"
                            data-intro={intro}
                            data-grid={grid ? 'on' : 'off'}
                            data-previous={previous ? 'on' : 'off'}
                            data-annotations={notes ? 'on' : 'off'}
                            data-average={average ? 'on' : 'off'}
                        >
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.ComposedChart
                                        key={`${rangeKey}-${metricKey}`}
                                        data={rows}
                                        margin={{ top: PLOT_TOP, right: 12, bottom: 0, left: 0 }}
                                        accessibilityLayer
                                    >
                                        <defs>
                                            <linearGradient id="ms-fill" x1="0" y1="0" x2="0" y2="1">
                                                <stop
                                                    className="transition-[color,stop-color] duration-400 ease-out"
                                                    offset="0%"
                                                    stopColor="var(--color-current)"
                                                    stopOpacity={0.22}
                                                />
                                                <stop
                                                    className="transition-[color,stop-color] duration-400 ease-out"
                                                    offset="100%"
                                                    stopColor="var(--color-current)"
                                                    stopOpacity={0}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <R.CartesianGrid vertical={false} />
                                        <R.XAxis
                                            dataKey="date"
                                            ticks={xTicks}
                                            interval={0}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            padding={{ left: X_PAD, right: X_PAD }}
                                            tickFormatter={fmtDay}
                                        />
                                        <R.YAxis
                                            width={48}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={6}
                                            domain={[0, domainMax]}
                                            ticks={ticks}
                                            tickFormatter={(v: number) => axisLabel(metric, v)}
                                        />
                                        <R.Tooltip
                                            isAnimationActive={false}
                                            cursor={{ stroke: 'var(--border)' }}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const r = payload[0].payload;
                                                const note = noteFor(r.date);
                                                const good = metric.lowerIsBetter ? r.change <= 0 : r.change >= 0;
                                                const flat = Math.abs(r.change) < 0.05;
                                                return (
                                                    <div className="grid min-w-52 items-start gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                        <div className="font-medium">
                                                            <span className="flex h-5 items-center justify-between gap-4">
                                                                <span className={TRIM}>{fmtWeekDay(r.date)}</span>
                                                                {note ? (
                                                                    <span
                                                                        data-slot="badge"
                                                                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border border-border bg-transparent px-1.25 py-0.5 text-xs font-medium whitespace-nowrap dark:bg-input/32"
                                                                    >
                                                                        {note}
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <div className="flex w-full flex-1 flex-col gap-1.5">
                                                                <div className="flex h-4 items-center justify-between gap-6">
                                                                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                                                        <span className="flex size-4 shrink-0 items-center justify-center">
                                                                            <Dot className="bg-(--color-current)" />
                                                                        </span>
                                                                        <span className={TRIM}>{metric.label}</span>
                                                                    </span>
                                                                    <span
                                                                        className={`${TRIM} font-medium tabular-nums`}
                                                                    >
                                                                        {formatValue(metric, r.current)}
                                                                    </span>
                                                                </div>
                                                                {previous ? (
                                                                    <div className="flex h-4 items-center justify-between gap-6">
                                                                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                                                            <span className="flex size-4 shrink-0 items-center justify-center">
                                                                                <DashSwatch />
                                                                            </span>
                                                                            <span className={TRIM}>
                                                                                {fmtDay(r.prevDate)}
                                                                            </span>
                                                                        </span>
                                                                        <span
                                                                            className={`${TRIM} font-medium tabular-nums`}
                                                                        >
                                                                            {formatValue(metric, r.previous)}
                                                                        </span>
                                                                    </div>
                                                                ) : null}
                                                                <div className="border-t pt-1.5">
                                                                    <div
                                                                        className={`flex h-4 items-center justify-between gap-6${flat ? '' : good ? ' text-success' : ' text-destructive'}`}
                                                                    >
                                                                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                                                            <span className="flex size-4 shrink-0 items-center justify-center">
                                                                                <Icon
                                                                                    name={
                                                                                        r.change >= 0
                                                                                            ? 'trending-up'
                                                                                            : 'trending-down'
                                                                                    }
                                                                                    className="size-4"
                                                                                />
                                                                            </span>
                                                                            <span className={TRIM}>Change</span>
                                                                        </span>
                                                                        <span
                                                                            className={`${TRIM} font-medium tabular-nums`}
                                                                        >
                                                                            {signed1(r.change)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <R.Area
                                            dataKey="previous"
                                            type="monotone"
                                            className={`${FADE} group-data-[previous=off]/c6:opacity-0`}
                                            fill="none"
                                            stroke="var(--color-previous)"
                                            strokeWidth={1.25}
                                            strokeDasharray="4 4"
                                            strokeOpacity={0.7}
                                            dot={false}
                                            activeDot={
                                                previous
                                                    ? {
                                                          r: 3,
                                                          fill: 'var(--color-previous)',
                                                          stroke: 'var(--card)',
                                                          strokeWidth: 1.5,
                                                      }
                                                    : false
                                            }
                                            isAnimationActive={false}
                                        />
                                        <R.Area
                                            dataKey="current"
                                            type="monotone"
                                            className="text-(--color-current) transition-[color,stop-color] duration-400 ease-out"
                                            fill="url(#ms-fill)"
                                            fillOpacity={1}
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{
                                                r: 4,
                                                fill: 'var(--color-current)',
                                                stroke: 'var(--card)',
                                                strokeWidth: 2,
                                            }}
                                            isAnimationActive={false}
                                        />
                                        <R.Customized
                                            component={
                                                <Overlay
                                                    rows={rows}
                                                    annotations={annotations}
                                                    domainMax={domainMax}
                                                    metric={metric}
                                                    avg={avg}
                                                />
                                            }
                                        />
                                    </R.ComposedChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <MetaRow items={footerStart} />
                    <MetaRow items={[`As of ${fmtDate(rows[rows.length - 1].date)}`, syncedLabel]} />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default MetricSwitcher;
