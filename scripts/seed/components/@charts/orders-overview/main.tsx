import { useId, useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, chartKey, prefersReducedMotion } from 'components:chart';
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
    ToolbarSelect,
    ChartMoreMenu,
    ChartExpandDialog,
    FooterMeta,
} from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import {
    series,
    SeriesScope,
    useEnterAnimation,
    useMotion,
    useReplayKey,
    useElementWidth,
    baselineOrigin,
    EASE_OUT,
    compact,
    signedPercent,
} from 'components:charts/chart-kit';
import { RANGES } from './data';
import type { OrdersRange } from './data';

/**
 * components:charts/orders-overview: orders, revenue and average order value for a day / week / month /
 * year against the prior period. Metric tabs with deltas, a hatched sky → indigo → rose gradient area, a
 * Display menu (curve: smooth / linear / step; layers: area fill, gridlines, axis labels, latest marker;
 * tooltip comparison row), refresh (replays the entry), expand and CSV / summary exports.
 *
 *   <OrdersOverview />                                       sample data
 *   <OrdersOverview ranges={{ day: { label, icon, description, priorLabel, bucket, data } }} />
 *
 * data rows: { label, revenue, orders, priorRevenue, priorOrders }; the average order is revenue / orders.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

type Metric = 'orders' | 'revenue' | 'avg';
type Curve = 'natural' | 'linear' | 'stepAfter';

export type OrdersOverviewProps = {
    title?: string;
    ranges?: Record<string, OrdersRange>;
    defaultRange?: string;
    defaultMetric?: Metric;
    updatedLabel?: string;
    className?: string;
    /** Internal: hides the expand button inside the expand dialog. */
    expandable?: boolean;
};

const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';
const HEIGHT = 320;
const TOP = 48;
const AXIS = 28;
const PLOT_H = HEIGHT - TOP - AXIS;

const METRICS: { key: Metric; label: string }[] = [
    { key: 'orders', label: 'Orders' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'avg', label: 'Avg. Order' },
];

const CURVES: { value: Curve; label: string; icon: string }[] = [
    { value: 'natural', label: 'Smooth', icon: 'route' },
    { value: 'linear', label: 'Linear', icon: 'activity' },
    { value: 'stepAfter', label: 'Step', icon: 'chart-column' },
];

const sum = (list: number[]) => list.reduce((s, v) => s + v, 0);

function money2(v: number) {
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Point / tooltip value. */
function fmtValue(metric: Metric, v: number) {
    if (metric === 'orders') return Math.round(v).toLocaleString('en-US');
    if (metric === 'avg') return money2(v);
    return `$${Math.round(v).toLocaleString('en-US')}`;
}

/** KPI value: revenue past a million goes compact ($9.49M). */
function fmtTotal(metric: Metric, v: number) {
    if (metric === 'revenue' && v >= 1e6) return `$${compact(v, 2)}`;
    return fmtValue(metric, v);
}

/** Y tick: $2K / 25 / $25. */
function fmtTick(metric: Metric, v: number) {
    if (!v) return '';
    const s = Math.abs(v) >= 1e6 ? compact(v, 1) : compact(v);
    return metric === 'orders' ? s : `$${s}`;
}

/** 0 … a nice step above the max, in 3 steps (1 / 2 / 2.5 / 5 / 10 × 10^n). */
function niceTicks(max: number) {
    const raw = max / 3 || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    const hi = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= hi + step / 1000; v += step) ticks.push(v);
    return ticks;
}

function MetricDelta({ value }: { value: number }) {
    const up = value >= 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums [&_svg]:size-3.5 ${up ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}
        >
            <Icon name={up ? 'trending-up' : 'trending-down'} />
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            {Math.abs(value).toFixed(1)}%
        </span>
    );
}

/** The hover column: a 40px muted bar that glides between points and rises in. */
function HoverColumn(props: any) {
    const Motion = useMotion();
    const pts = props.points || [];
    const x = pts.length ? pts[0].x : props.left || 0;
    const top = props.top != null ? props.top : TOP;
    const h = props.height != null ? props.height : PLOT_H;
    const R = Motion && !prefersReducedMotion() ? Motion.motion.rect : 'rect';
    const anim =
        R === 'rect'
            ? {}
            : {
                  initial: { opacity: 0, y: 16 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.3, ease: EASE_OUT },
              };
    return (
        <g
            className="pointer-events-none transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(${x - 20}px)` }}
        >
            <R className="fill-muted" rx={6} x={0} y={top - 4} width={40} height={h + 8} {...anim} />
        </g>
    );
}

function ActiveDot({ cx, cy }: { cx?: number; cy?: number }) {
    const Motion = useMotion();
    if (cx == null || cy == null) return null;
    const C = Motion && !prefersReducedMotion() ? Motion.motion.circle : 'circle';
    const anim =
        C === 'circle'
            ? {}
            : {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.2, ease: EASE_OUT },
              };
    return (
        <C
            className="pointer-events-none transition-[cx,cy] duration-200 ease-out motion-reduce:transition-none"
            cx={cx}
            cy={cy}
            r={5}
            fill="var(--color-card)"
            stroke="var(--color-mid)"
            strokeWidth={2.5}
            {...anim}
        />
    );
}

function LatestMarker({ cx, cy }: { cx: number; cy: number }) {
    const Motion = useMotion();
    const G = Motion && !prefersReducedMotion() ? Motion.motion.g : 'g';
    const anim = G === 'g' ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } };
    return (
        <G className="pointer-events-none" {...anim}>
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="var(--color-end)"
                className="origin-center animate-ping opacity-40 [animation-duration:2s] [transform-box:fill-box] motion-reduce:hidden"
            />
            <circle
                cx={cx}
                cy={cy}
                r={7}
                fill="var(--color-end)"
                fillOpacity={0.3}
                stroke="var(--color-end)"
                strokeWidth={1.5}
            />
            <circle cx={cx} cy={cy} r={3.5} fill="var(--color-end)" />
            <circle cx={cx - 1.25} cy={cy - 1.5} r={1.25} fill="white" fillOpacity={0.85} />
        </G>
    );
}

function TooltipBody({
    row,
    x,
    width,
    hi,
    metric,
    priorLabel,
    comparison,
}: {
    row: any;
    x: number;
    width: number;
    hi: number;
    metric: Metric;
    priorLabel: string;
    comparison: boolean;
}) {
    const Motion = useMotion();
    const cy = TOP + (1 - row.value / hi) * PLOT_H;
    const D = Motion && !prefersReducedMotion() ? Motion.motion.div : 'div';
    const anim =
        D === 'div'
            ? {}
            : {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.3, ease: EASE_OUT },
              };
    return (
        <div
            className="w-max transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{
                transform: `translate(clamp(0px, -50% + ${x}px, -100% + ${width}px), calc(-100% + ${cy - 14}px))`,
            }}
        >
            <D {...anim}>
                <div className="grid min-w-0 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <div className="grid gap-1.5">
                        <div className="flex w-full flex-wrap items-center gap-2">
                            <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-1">
                                <span className="text-muted-foreground">{row.label}</span>
                                <span className="text-right font-mono font-medium text-foreground tabular-nums">
                                    {fmtValue(metric, row.value)}
                                </span>
                                {comparison ? (
                                    <>
                                        <span className="text-muted-foreground">{priorLabel}</span>
                                        <span className="text-right font-mono text-muted-foreground tabular-nums">
                                            {fmtValue(metric, row.prior)}
                                        </span>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </D>
        </div>
    );
}

export function OrdersOverview({
    title = 'Orders Overview',
    ranges = RANGES,
    defaultRange = 'day',
    defaultMetric = 'revenue',
    updatedLabel = 'Updated 5 min ago',
    className,
    expandable = true,
}: OrdersOverviewProps) {
    const keys = Object.keys(ranges);
    const [range, setRange] = useState(defaultRange in ranges ? defaultRange : keys[0]);
    const [metric, setMetric] = useState<Metric>(defaultMetric);
    const [curve, setCurve] = useState<Curve>('natural');
    const [layers, setLayers] = useState({ fill: true, grid: true, axis: true, latest: true });
    const [comparison, setComparison] = useState(true);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [replay, doReplay] = useReplayKey();
    const r = ranges[range];
    const uid = chartKey(useId());
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const config = useMemo(
        () => ({
            start: series('sky-500', 'sky-400'),
            mid: series('indigo-500', 'indigo-400'),
            end: series('rose-500', 'rose-400'),
        }),
        []
    );

    const totals = useMemo(() => {
        const rev = sum(r.data.map((d) => d.revenue));
        const ord = sum(r.data.map((d) => d.orders));
        const pRev = sum(r.data.map((d) => d.priorRevenue));
        const pOrd = sum(r.data.map((d) => d.priorOrders));
        const avg = ord ? rev / ord : 0;
        const pAvg = pOrd ? pRev / pOrd : 0;
        const pct = (a: number, b: number) => (b ? (a / b - 1) * 100 : 0);
        return {
            orders: { value: ord, delta: pct(ord, pOrd) },
            revenue: { value: rev, delta: pct(rev, pRev) },
            avg: { value: avg, delta: pct(avg, pAvg) },
        } as Record<Metric, { value: number; delta: number }>;
    }, [r]);

    const rows = useMemo(
        () =>
            r.data.map((d) => {
                const value =
                    metric === 'orders'
                        ? d.orders
                        : metric === 'revenue'
                          ? d.revenue
                          : d.orders
                            ? d.revenue / d.orders
                            : 0;
                const prior =
                    metric === 'orders'
                        ? d.priorOrders
                        : metric === 'revenue'
                          ? d.priorRevenue
                          : d.priorOrders
                            ? d.priorRevenue / d.priorOrders
                            : 0;
                return { label: d.label, value, prior };
            }),
        [r, metric]
    );

    const ticks = niceTicks(Math.max(...rows.map((d) => d.value)));
    const hi = ticks[ticks.length - 1];
    const n = rows.length;
    const every = r.tickEvery || 1;
    const last = rows[n - 1];
    const metricLabel = METRICS.find((m) => m.key === metric)!.label;

    const rootRef = useRef<HTMLDivElement>(null);
    const plotWidth = useElementWidth(rootRef);
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '.recharts-area path',
                keyframes: { transform: ['scaleY(0)', 'scaleY(1)'], opacity: [1, 1] },
                duration: 0.6,
                style: baselineOrigin,
            },
        ],
        [range, metric, replay, view]
    );

    const t = totals[metric];
    const summary = `${title}, ${r.description}: ${metricLabel.toLowerCase()} ${fmtTotal(metric, t.value)}, ${signedPercent(t.delta)}. Latest ${last.label}: ${fmtValue(metric, last.value)} (${r.priorLabel}: ${fmtValue(metric, last.prior)}).`;
    const csv = {
        filename: `orders-overview-${range}.csv`,
        rows: r.data,
        columns: [
            { key: 'label', label: 'Bucket' },
            { key: 'orders', label: 'Orders' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'avg', label: 'Avg. order', value: (d: any) => (d.orders ? (d.revenue / d.orders).toFixed(2) : '') },
            { key: 'priorOrders', label: 'Prior orders' },
            { key: 'priorRevenue', label: 'Prior revenue' },
        ],
    };

    const onTabKey = (e: any, i: number) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (i + step + METRICS.length) % METRICS.length;
        setMetric(METRICS[next].key);
        const el = tabRefs.current[next];
        if (el) el.focus();
    };

    const toggleLayer = (k: keyof typeof layers) => (c: boolean) => setLayers((s) => ({ ...s, [k]: c }));

    return (
        <SeriesScope config={config} className={className}>
            <Frame stacked className="@container/orders min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription className="truncate text-xs">{r.description}</FrameDescription>
                    </div>
                    <ChartToolbar className="w-full @2xl/orders:w-auto">
                        <ToolbarGroup aria-label="Period">
                            <ToolbarSelect
                                label="Period"
                                menuLabel="Period"
                                align="start"
                                icon={<Icon name="calendar-clock" />}
                                value={range}
                                onValueChange={setRange}
                                options={keys.map((k) => ({
                                    value: k,
                                    label: ranges[k].label,
                                    icon: <Icon name={ranges[k].icon} />,
                                }))}
                            />
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Display">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" size="sm" className="bg-background" />}
                                >
                                    <Icon name="sliders-horizontal" />
                                    <span className={`@max-md/orders:sr-only ${TEXT_TRIM}`}>Display</span>
                                    <Icon name="chevron-down" className="text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Curve</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={curve} onValueChange={(v: any) => setCurve(v)}>
                                            {CURVES.map((c) => (
                                                <DropdownMenuRadioItem key={c.value} value={c.value}>
                                                    <Icon name={c.icon} />
                                                    {c.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                        {[
                                            { k: 'fill', label: 'Area Fill', icon: 'layers' },
                                            { k: 'grid', label: 'Gridlines', icon: 'grid-2x2' },
                                            { k: 'axis', label: 'Axis Labels', icon: 'type' },
                                            { k: 'latest', label: 'Latest Marker', icon: 'circle-dot' },
                                        ].map((o) => (
                                            <DropdownMenuCheckboxItem
                                                key={o.k}
                                                checked={(layers as any)[o.k]}
                                                onCheckedChange={toggleLayer(o.k as keyof typeof layers)}
                                                closeOnClick={false}
                                            >
                                                <Icon name={o.icon} />
                                                {o.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Tooltip</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={comparison}
                                            onCheckedChange={(c: boolean) => setComparison(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="history" />
                                            Comparison Row
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Chart actions">
                            <ToolbarButton icon={<Icon name="refresh-cw" />} label="Refresh data" onClick={doReplay} />
                            {expandable ? (
                                <ToolbarButton
                                    icon={<Icon name="maximize-2" />}
                                    label="Expand chart"
                                    onClick={() => setExpanded(true)}
                                />
                            ) : null}
                            <ChartMoreMenu
                                title={title}
                                csv={csv}
                                summary={summary}
                                items={[
                                    { type: 'separator' },
                                    {
                                        label: view === 'table' ? 'View as chart' : 'View as table',
                                        icon: <Icon name={view === 'table' ? 'chart-area' : 'table'} />,
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                ]}
                            />
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="p-0">
                    <div
                        role="tablist"
                        aria-label="Metric"
                        className="inline-flex w-full items-center justify-start gap-4 bg-transparent px-4 py-0 text-muted-foreground sm:gap-10"
                    >
                        {METRICS.map((m, i) => {
                            const on = m.key === metric;
                            return (
                                <button
                                    key={m.key}
                                    ref={(el) => {
                                        tabRefs.current[i] = el;
                                    }}
                                    type="button"
                                    role="tab"
                                    aria-selected={on}
                                    tabIndex={on ? 0 : -1}
                                    data-active={on ? '' : undefined}
                                    onClick={() => setMetric(m.key)}
                                    onKeyDown={(e) => onTabKey(e, i)}
                                    className="relative inline-flex min-w-0 flex-1 flex-col items-start justify-start gap-1.5 px-0 py-3 text-left whitespace-nowrap text-foreground/60 transition-all outline-none after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-active:text-foreground data-active:after:opacity-100 sm:flex-none dark:text-muted-foreground dark:hover:text-foreground dark:data-active:text-foreground"
                                >
                                    <span className="w-full truncate text-xs font-medium text-muted-foreground">
                                        {m.label}
                                    </span>
                                    <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                                        <span className="text-lg leading-none font-semibold tabular-nums">
                                            {fmtTotal(m.key, totals[m.key].value)}
                                        </span>
                                        <MetricDelta value={totals[m.key].delta} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </FramePanel>
                <FramePanel>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="label"
                                indexLabel={r.label}
                                series={[
                                    { key: 'value', label: metricLabel },
                                    { key: 'prior', label: r.priorLabel },
                                ]}
                                valueFormatter={(v: number) => fmtValue(metric, v)}
                                caption={title}
                            />
                        }
                    >
                        <div ref={rootRef} className="h-80 w-full">
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.AreaChart
                                        data={rows}
                                        margin={{ top: TOP, right: 0, bottom: 0, left: 0 }}
                                        accessibilityLayer
                                    >
                                        <defs>
                                            <linearGradient id={`orders-stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="var(--color-start)" />
                                                <stop offset="55%" stopColor="var(--color-mid)" />
                                                <stop offset="100%" stopColor="var(--color-end)" />
                                            </linearGradient>
                                            <linearGradient id={`orders-hue-${uid}`} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="var(--color-start)" />
                                                <stop offset="55%" stopColor="var(--color-mid)" />
                                                <stop offset="100%" stopColor="var(--color-end)" />
                                            </linearGradient>
                                            <pattern
                                                id={`orders-hatch-${uid}`}
                                                width="4"
                                                height="4"
                                                patternUnits="userSpaceOnUse"
                                                patternTransform="rotate(45)"
                                            >
                                                <line x1="0" y1="0" x2="0" y2="4" stroke="white" />
                                            </pattern>
                                            <mask id={`orders-hatch-mask-${uid}`}>
                                                <rect width="100%" height="100%" fill={`url(#orders-hatch-${uid})`} />
                                            </mask>
                                        </defs>
                                        {layers.grid ? (
                                            <R.CartesianGrid vertical={false} strokeDasharray="4 4" />
                                        ) : null}
                                        <R.XAxis
                                            dataKey="label"
                                            height={AXIS}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            interval={0}
                                            tick={(tk: any) => {
                                                if (!layers.axis || tk.index % every !== 0) return <g />;
                                                return (
                                                    <text
                                                        x={tk.x}
                                                        y={tk.y}
                                                        dy="0.71em"
                                                        className="fill-muted-foreground"
                                                        textAnchor={
                                                            tk.index === 0
                                                                ? 'start'
                                                                : tk.index === n - 1
                                                                  ? 'end'
                                                                  : 'middle'
                                                        }
                                                    >
                                                        {tk.payload.value}
                                                    </text>
                                                );
                                            }}
                                        />
                                        <R.YAxis
                                            width={0}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={[0, hi]}
                                            ticks={ticks}
                                            tick={(tk: any) =>
                                                layers.axis ? (
                                                    <text
                                                        x={0}
                                                        y={tk.y}
                                                        dy={-6}
                                                        stroke="var(--color-card)"
                                                        strokeWidth={4}
                                                        strokeLinejoin="round"
                                                        paintOrder="stroke"
                                                        className="fill-muted-foreground tabular-nums"
                                                    >
                                                        {fmtTick(metric, tk.payload.value)}
                                                    </text>
                                                ) : (
                                                    <g />
                                                )
                                            }
                                        />
                                        <R.Tooltip
                                            cursor={<HoverColumn />}
                                            position={{ x: 0, y: 0 }}
                                            isAnimationActive={false}
                                            content={({ active, payload, coordinate }: any) =>
                                                active && payload && payload.length ? (
                                                    <TooltipBody
                                                        row={payload[0].payload}
                                                        x={coordinate ? coordinate.x : 0}
                                                        width={plotWidth}
                                                        hi={hi}
                                                        metric={metric}
                                                        priorLabel={r.priorLabel}
                                                        comparison={comparison}
                                                    />
                                                ) : null
                                            }
                                        />
                                        {layers.fill ? (
                                            <R.Area
                                                dataKey="value"
                                                type={curve}
                                                fill={`url(#orders-hue-${uid})`}
                                                fillOpacity={0.7}
                                                stroke="none"
                                                mask={`url(#orders-hatch-mask-${uid})`}
                                                activeDot={false}
                                                isAnimationActive={false}
                                            />
                                        ) : null}
                                        <R.Area
                                            dataKey="value"
                                            type={curve}
                                            fill="none"
                                            stroke={`url(#orders-stroke-${uid})`}
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            vectorEffect="non-scaling-stroke"
                                            isAnimationActive={false}
                                            dot={(d: any) =>
                                                layers.latest && d.index === n - 1 && d.cx != null ? (
                                                    <LatestMarker key="latest" cx={d.cx} cy={d.cy} />
                                                ) : (
                                                    <g key={`d${d.index}`} />
                                                )
                                            }
                                            activeDot={(d: any) => <ActiveDot cx={d.cx} cy={d.cy} />}
                                        />
                                    </R.AreaChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <FooterMeta
                        items={[{ dot: 'success', label: updatedLabel }]}
                        end={<span className={TEXT_TRIM}>{`${metricLabel} per ${r.bucket}`}</span>}
                    />
                </FrameFooter>
            </Frame>
            {expandable ? (
                <ChartExpandDialog open={expanded} onOpenChange={setExpanded} title={title}>
                    <OrdersOverview
                        title={title}
                        ranges={ranges}
                        defaultRange={range}
                        defaultMetric={metric}
                        updatedLabel={updatedLabel}
                        expandable={false}
                    />
                </ChartExpandDialog>
            ) : null}
        </SeriesScope>
    );
}

export default OrdersOverview;
