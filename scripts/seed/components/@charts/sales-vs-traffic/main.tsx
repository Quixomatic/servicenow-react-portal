import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, useRecharts } from 'components:chart';
import { ToolbarGroup, rowsToCsv, downloadText, copyText } from 'components:chart-frame';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from 'components:card';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation, AccentPicker, ACCENTS } from 'components:charts/chart-kit';
import { TRIM, FADE, LineSwatch, RangeTabs, ToggleChip, DRAW_X, useIntro } from 'components:charts/line-kit';
import { RANGES } from './data';
import type { TrafficRange } from './data';

/**
 * components:charts/sales-vs-traffic: a store's sales (left axis, £) and product views (right axis,
 * dashed) on two y axes, with KPI tiles (sales, views, conversion, average order), ranges 30D daily /
 * 90D weekly / 12M monthly, a Compare toggle that fades in the previous period's lines and deltas, a
 * colour picker per line, a Display menu (series, line style, gridlines, data points, sales average,
 * peak marker), legend hover spotlighting, an expanded view and CSV / JSON / summary exports.
 *
 *   <SalesVsTraffic />                                    sample data
 *   <SalesVsTraffic ranges={[{ key: '30D', unit: 'day', rows: [['2026-09-01', 7650, 4358, 118, …]], … }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SalesVsTrafficProps = {
    title?: string;
    ranges?: TrafficRange[];
    defaultRange?: string;
    currency?: string;
    className?: string;
};

const SALES_COLORS = [{ key: 'indigo', light: 'indigo-600', dark: 'indigo-400' }].concat(
    ACCENTS.filter((a) => a.key !== 'indigo')
);
const VIEWS_COLORS = [{ key: 'orange', light: 'orange-600', dark: 'orange-400' }].concat(
    ACCENTS.filter((a) => a.key !== 'orange')
);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(at: string) {
    const [y, m, d] = at.split('-').map(Number);
    return { y, m, d: d || 1, dow: new Date(Date.UTC(y, m - 1, d || 1)).getUTCDay() };
}

function addDays(iso: string, n: number): string {
    const p = parts(iso);
    return new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10);
}

function int(v: number): string {
    return Math.round(v).toLocaleString('en-US');
}

function compact(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e6) return `${Number((v / 1e6).toFixed(1))}M`;
    if (a >= 1e3) return `${Number((v / 1e3).toFixed(1))}K`;
    return String(Math.round(v));
}

function signed(n: number, digits = 1, unit = '%'): string {
    const r = Number(Math.abs(n).toFixed(digits));
    return `${n < 0 && r !== 0 ? '-' : r !== 0 ? '+' : ''}${Math.abs(n).toFixed(digits)}${unit}`;
}

/**
 * Five aligned ticks (4 intervals) for one axis: the values' range padded by 5% of its span, a step of
 * 1 / 2 / 3 / 4 / 5 / 6 / 8 × 10^k, starting at a multiple of the step. Both axes get 5 ticks, so the
 * grid lines line up.
 */
function axisTicks(values: number[]): number[] {
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    const pad = (hi - lo) * 0.05 || Math.abs(hi) * 0.05 || 1;
    lo -= pad;
    hi += pad;
    const base = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)) - 1);
    for (let k = 0; k < 4; k++) {
        for (const m of [1, 2, 3, 4, 5, 6, 8]) {
            const step = m * base * Math.pow(10, k);
            const start = Math.floor(lo / step) * step;
            if (start + step * 4 >= hi - 1e-9) return [0, 1, 2, 3, 4].map((i) => Number((start + step * i).toFixed(6)));
        }
    }
    return [lo, hi];
}

function pctChange(cur: number, prev: number): number {
    return prev ? (cur / prev - 1) * 100 : 0;
}

function TrendBadge({ value, text }: { value: number; text: string }) {
    const up = value >= 0;
    return (
        <span
            data-slot="badge"
            className={`inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 ${
                up
                    ? 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success'
                    : 'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive'
            }`}
        >
            <Icon name={up ? 'trending-up' : 'trending-down'} />
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            <span className={`${TRIM} tabular-nums`}>{text}</span>
        </span>
    );
}

/** Peak marker, last-point halos and the sales average label, drawn from the axis scales. */
function Marks({
    rows,
    peak,
    avg,
    currency,
    showSales,
    showViews,
    left,
    right,
}: {
    rows: any[];
    peak: number;
    avg: number;
    currency: string;
    showSales: boolean;
    showViews: boolean;
    left: number[];
    right: number[];
}) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot) return null;
    const n = rows.length;
    const x = (i: number) => plot.x + (n > 1 ? (i / (n - 1)) * plot.width : plot.width / 2);
    const y = (v: number, d: number[]) =>
        plot.y + ((d[d.length - 1] - v) / (d[d.length - 1] - d[0] || 1)) * plot.height;
    const last = n - 1;
    const halo = (cy: number, color: string) => (
        <g className={`${FADE} group-data-[intro=drawing]/c24p:opacity-0`}>
            <circle fill={color} fillOpacity={0.16} cx={x(last)} cy={cy} r={7} />
            <circle fill={color} stroke="var(--card)" strokeWidth={1.5} cx={x(last)} cy={cy} r={3.5} />
        </g>
    );
    const px = x(peak);
    const py = y(rows[peak].sales, left);
    const anchor = px - plot.x < 50 ? 'start' : plot.x + plot.width - px < 50 ? 'end' : 'middle';
    return (
        <g className="pointer-events-none">
            <g className={`${FADE} opacity-0 group-data-[average=on]/c24p:opacity-100`}>
                <text
                    x={plot.x + 4}
                    y={y(avg, left) - 6}
                    stroke="var(--card)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    className={`fill-muted-foreground text-xs tabular-nums ${FADE} group-data-[intro=drawing]/c24p:opacity-0`}
                >
                    Avg {currency}
                    {compact(avg)}
                </text>
            </g>
            {showViews ? halo(y(rows[last].views, right), 'var(--color-views)') : null}
            {showSales ? (
                <g className={`${FADE} opacity-0 group-data-[peak=on]/c24p:opacity-100`}>
                    <g className={`${FADE} group-data-[intro=drawing]/c24p:opacity-0`}>
                        <circle
                            fill="var(--card)"
                            stroke="var(--color-sales)"
                            strokeWidth={2}
                            cx={px}
                            cy={py}
                            r={3.5}
                        />
                        <text
                            x={px}
                            y={py - 12}
                            textAnchor={anchor}
                            stroke="var(--card)"
                            strokeWidth={3}
                            strokeLinejoin="round"
                            paintOrder="stroke"
                            className="fill-foreground text-xs tabular-nums"
                        >
                            Peak {currency}
                            {int(rows[peak].sales)}
                        </text>
                    </g>
                </g>
            ) : null}
            {showSales ? halo(y(rows[last].sales, left), 'var(--color-sales)') : null}
        </g>
    );
}

export function SalesVsTraffic({
    title = 'Sales vs Traffic',
    ranges = RANGES,
    defaultRange = '30D',
    currency = '£',
    className,
}: SalesVsTrafficProps) {
    const initialRange = ranges.some((r) => r.key === defaultRange) ? defaultRange : ranges[0].key;
    const [rangeKey, setRangeKey] = useState(initialRange);
    const [compare, setCompare] = useState(false);
    const [showSales, setShowSales] = useState(true);
    const [showViews, setShowViews] = useState(true);
    const [curve, setCurve] = useState<'monotone' | 'linear' | 'step'>('monotone');
    const [grid, setGrid] = useState(true);
    const [points, setPoints] = useState(false);
    const [average, setAverage] = useState(false);
    const [peakOn, setPeakOn] = useState(true);
    const [salesColor, setSalesColor] = useState(SALES_COLORS[0].key);
    const [viewsColor, setViewsColor] = useState(VIEWS_COLORS[0].key);
    const [spot, setSpot] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replay, setReplay] = useState(0);
    const [loading, setLoading] = useState(false);
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];
    const sc = SALES_COLORS.find((c) => c.key === salesColor) || SALES_COLORS[0];
    const vc = VIEWS_COLORS.find((c) => c.key === viewsColor) || VIEWS_COLORS[0];

    const config = useMemo(
        () => ({
            sales: series(sc.light, sc.dark, 'Sales'),
            views: series(vc.light, vc.dark, 'Views'),
            prevSales: series(sc.light, sc.dark, 'Previous sales'),
            prevViews: series(vc.light, vc.dark, 'Previous views'),
            averageSales: series('neutral-500', 'neutral-400', 'Sales average'),
        }),
        [sc.light, sc.dark, vc.light, vc.dark]
    );

    const model = useMemo(() => {
        const rows = range.rows.map((r) => ({
            at: r[0],
            sales: r[1],
            views: r[2],
            orders: r[3],
            prevSales: r[4],
            prevViews: r[5],
            prevOrders: r[6],
            conversion: r[2] ? (r[3] / r[2]) * 100 : 0,
        }));
        const sum = (k: string) => rows.reduce((t, r: any) => t + r[k], 0);
        const sales = sum('sales');
        const views = sum('views');
        const orders = sum('orders');
        const [ps, pv, po] = range.previous;
        let peak = 0;
        rows.forEach((r, i) => {
            if (r.sales > rows[peak].sales) peak = i;
        });
        const avg = sales / (rows.length || 1);
        return {
            rows: rows.map((r) => ({ ...r, averageSales: avg })),
            peak,
            avg,
            sales,
            views,
            orders,
            ps,
            pv,
            po,
            conv: views ? (orders / views) * 100 : 0,
            pconv: pv ? (po / pv) * 100 : 0,
            aov: orders ? sales / orders : 0,
            paov: po ? ps / po : 0,
        };
    }, [range]);
    const { rows, peak, avg } = model;
    // Domains cover the previous period too (its lines fade in with Compare), like the source.
    const salesTicks = useMemo(() => axisTicks(rows.flatMap((r) => [r.sales, r.prevSales])), [rows]);
    const viewsTicks = useMemo(() => axisTicks(rows.flatMap((r) => [r.views, r.prevViews])), [rows]);

    const label = (at: string, long = true): string => {
        const p = parts(at);
        if (range.unit === 'month') return long ? `${MONTHS_LONG[p.m - 1]} ${p.y}` : MONTHS[p.m - 1];
        if (range.unit === 'week') {
            if (!long) return `${MONTHS[p.m - 1]} ${p.d}`;
            const e = parts(addDays(at, 6));
            return `${MONTHS[p.m - 1]} ${p.d} to ${MONTHS[e.m - 1]} ${e.d}`;
        }
        return long ? `${DAYS[p.dow]}, ${MONTHS[p.m - 1]} ${p.d}` : `${MONTHS[p.m - 1]} ${p.d}`;
    };
    const first = parts(rows[0].at);
    const lastRow = rows[rows.length - 1];
    const endIso =
        range.unit === 'month'
            ? new Date(Date.UTC(parts(lastRow.at).y, parts(lastRow.at).m, 0)).toISOString().slice(0, 10)
            : range.unit === 'week'
              ? addDays(lastRow.at, 6)
              : lastRow.at;
    const end = parts(endIso);
    const span = `${MONTHS[first.m - 1]} ${first.d} to ${MONTHS[end.m - 1]} ${end.d}, ${end.y}`;
    const unitWord = range.unit === 'month' ? 'Monthly' : range.unit === 'week' ? 'Weekly' : 'Daily';

    const rootRef = useRef<HTMLDivElement>(null);
    const intro = useIntro([rangeKey, replay, view, expanded], 480);
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '.recharts-line:not(.svt-fade)',
                keyframes: DRAW_X,
                duration: 0.45,
                delay: 0,
                ease: [0.42, 0, 0.58, 1],
            },
        ],
        [rangeKey, replay, view, expanded]
    );

    const refresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setReplay((v) => v + 1);
        }, 450);
    };
    const changed =
        rangeKey !== initialRange ||
        compare ||
        !showSales ||
        !showViews ||
        curve !== 'monotone' ||
        !grid ||
        points ||
        average ||
        !peakOn ||
        salesColor !== SALES_COLORS[0].key ||
        viewsColor !== VIEWS_COLORS[0].key;
    const reset = () => {
        setRangeKey(initialRange);
        setCompare(false);
        setShowSales(true);
        setShowViews(true);
        setCurve('monotone');
        setGrid(true);
        setPoints(false);
        setAverage(false);
        setPeakOn(true);
        setSalesColor(SALES_COLORS[0].key);
        setViewsColor(VIEWS_COLORS[0].key);
    };

    const salesDelta = pctChange(model.sales, model.ps);
    const summary = `${unitWord} sales and views, ${span}: ${currency}${int(model.sales)} from ${int(
        model.views
    )} views. Arrow keys move between points.`;
    const copySummary = `${title}, ${span}: sales ${currency}${int(model.sales)} (${signed(salesDelta)} vs ${
        range.phrase
    }), ${int(model.views)} views (${signed(pctChange(model.views, model.pv))}), conversion ${model.conv.toFixed(
        2
    )}%, average order ${currency}${model.aov.toFixed(2)}.`;
    const exportRows = rows.map((r) => ({
        period: label(r.at),
        sales: r.sales,
        views: r.views,
        orders: r.orders,
        conversion: `${r.conversion.toFixed(2)}%`,
    }));
    const columns = [
        { key: 'period', label: 'Period' },
        { key: 'sales', label: 'Sales' },
        { key: 'views', label: 'Views' },
        { key: 'orders', label: 'Orders' },
        { key: 'conversion', label: 'Conversion' },
    ];

    const tiles = [
        {
            label: 'Sales',
            value: `${currency}${int(model.sales)}`,
            delta: salesDelta,
            text: signed(salesDelta),
            note: `vs ${currency}${int(model.ps)}`,
        },
        {
            label: 'Views',
            value: int(model.views),
            delta: pctChange(model.views, model.pv),
            text: signed(pctChange(model.views, model.pv)),
            note: `vs ${int(model.pv)}`,
        },
        {
            label: 'Conversion',
            value: `${model.conv.toFixed(2)}%`,
            delta: model.conv - model.pconv,
            text: signed(model.conv - model.pconv, 2, ' pts'),
            note: `vs ${model.pconv.toFixed(2)}%`,
        },
        {
            label: 'Avg Order',
            value: `${currency}${model.aov.toFixed(2)}`,
            delta: pctChange(model.aov, model.paov),
            text: signed(pctChange(model.aov, model.paov)),
            note: `vs ${currency}${model.paov.toFixed(2)}`,
        },
    ];
    const dim = (key: string) => (spot && spot !== key ? 0.25 : 1);
    const legendItem = (key: string, name: string, value: string, dashed?: boolean) => (
        <li
            key={key}
            data-legend={key}
            onMouseEnter={() => setSpot(key)}
            onMouseLeave={() => setSpot(null)}
            className="flex h-4 animate-in items-center gap-1.5 duration-200 fade-in-0 motion-reduce:animate-none"
        >
            <LineSwatch dashed={dashed} color={`var(--color-${key})`} />
            <span className={`${TRIM} text-muted-foreground`}>{name}</span>
            {value ? <span className={`${TRIM} font-medium text-foreground tabular-nums`}>{value}</span> : null}
        </li>
    );

    return (
        <SeriesScope config={config} className={className}>
            <Card className="@container/c24 h-full w-full min-w-0">
                <CardHeader className="@container/card-header">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="col-start-1">
                        <span className="flex h-5 items-center gap-1.5">
                            <span
                                className={`inline-flex items-center gap-1 font-medium tabular-nums [&_svg]:size-3.5 ${salesDelta >= 0 ? 'text-success' : 'text-destructive'}`}
                            >
                                <Icon name={salesDelta >= 0 ? 'trending-up' : 'trending-down'} />
                                <span className="sr-only">{salesDelta >= 0 ? 'Up' : 'Down'}</span>
                                <span className={TRIM}>{Math.abs(salesDelta).toFixed(1)}%</span>
                            </span>
                            <span className={TRIM}>sales vs {range.phrase}</span>
                        </span>
                    </CardDescription>
                    <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 justify-self-start @2xl/card-header:col-start-2! @2xl/card-header:row-span-2! @2xl/card-header:row-start-1! @2xl/card-header:mt-0! @2xl/card-header:justify-self-end!">
                        <div className="flex flex-wrap items-center gap-2">
                            <RangeTabs
                                options={ranges.map((r) => ({ value: r.key, label: r.label }))}
                                value={rangeKey}
                                onValueChange={setRangeKey}
                                tone="accent"
                            />
                            <ToggleChip pressed={compare} onPressedChange={setCompare} tone="accent">
                                <Icon name="history" className="size-3.5" />
                                <span className={TRIM}>Compare</span>
                            </ToggleChip>
                            <ToolbarGroup aria-label="Chart settings">
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                aria-label="Display options"
                                                title="Display options"
                                                className="bg-background"
                                            />
                                        }
                                    >
                                        <Icon name="settings-2" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-auto min-w-48">
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>Series</DropdownMenuLabel>
                                            <DropdownMenuCheckboxItem
                                                checked={showSales}
                                                onCheckedChange={(v: boolean) => (v || showViews) && setShowSales(!!v)}
                                            >
                                                <LineSwatch className="text-(--color-sales)" />
                                                Sales
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem
                                                checked={showViews}
                                                onCheckedChange={(v: boolean) => (v || showSales) && setShowViews(!!v)}
                                            >
                                                <LineSwatch dashed className="text-(--color-views)" />
                                                Views
                                            </DropdownMenuCheckboxItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>Line Style</DropdownMenuLabel>
                                            <DropdownMenuRadioGroup
                                                value={curve}
                                                onValueChange={(v: any) => setCurve(v)}
                                            >
                                                <DropdownMenuRadioItem value="monotone">Smooth</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="linear">Linear</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="step">Stepped</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                            <DropdownMenuCheckboxItem
                                                checked={grid}
                                                onCheckedChange={(v: boolean) => setGrid(!!v)}
                                            >
                                                <Icon name="grid-2x2" />
                                                Gridlines
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem
                                                checked={points}
                                                onCheckedChange={(v: boolean) => setPoints(!!v)}
                                            >
                                                <Icon name="circle-dot" />
                                                Data Points
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem
                                                checked={average}
                                                onCheckedChange={(v: boolean) => setAverage(!!v)}
                                            >
                                                <Icon name="minus" />
                                                Sales Average
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem
                                                checked={peakOn}
                                                onCheckedChange={(v: boolean) => setPeakOn(!!v)}
                                            >
                                                <Icon name="flag" />
                                                Peak Marker
                                            </DropdownMenuCheckboxItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AccentPicker
                                    value={salesColor}
                                    onChange={setSalesColor}
                                    swatch="var(--color-sales)"
                                    options={SALES_COLORS}
                                    label="Sales line color"
                                />
                                <AccentPicker
                                    value={viewsColor}
                                    onChange={setViewsColor}
                                    swatch="var(--color-views)"
                                    options={VIEWS_COLORS}
                                    label="Views line color"
                                />
                            </ToolbarGroup>
                            <ToolbarGroup aria-label="Chart actions">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    aria-label="Refresh data"
                                    title="Refresh data"
                                    className="bg-background"
                                    onClick={refresh}
                                    disabled={loading}
                                >
                                    <Icon
                                        name={loading ? 'loader-circle' : 'refresh-cw'}
                                        className={loading ? 'animate-spin' : ''}
                                    />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    aria-label={expanded ? 'Collapse chart' : 'Expand chart'}
                                    title={expanded ? 'Collapse chart' : 'Expand chart'}
                                    aria-pressed={expanded}
                                    className="bg-background"
                                    onClick={() => setExpanded(!expanded)}
                                >
                                    <Icon name={expanded ? 'minimize-2' : 'maximize-2'} />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                aria-label="More actions"
                                                title="More actions"
                                                className="bg-background"
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
                                                        `sales-vs-traffic-${range.key}.csv`,
                                                        rowsToCsv(exportRows, columns)
                                                    )
                                                }
                                            >
                                                <Icon name="download" />
                                                Download CSV
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    downloadText(
                                                        `sales-vs-traffic-${range.key}.json`,
                                                        JSON.stringify(exportRows, null, 2)
                                                    )
                                                }
                                            >
                                                <Icon name="file-json" />
                                                Download JSON
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    copyText(rowsToCsv(exportRows, columns));
                                                }}
                                            >
                                                <Icon name="table" />
                                                Copy Data
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    copyText(copySummary);
                                                }}
                                            >
                                                <Icon name="file-text" />
                                                Copy Summary
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>View</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                                                <Icon name={expanded ? 'minimize-2' : 'maximize-2'} />
                                                {expanded ? 'Collapse Chart' : 'Expand Chart'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setView(view === 'table' ? 'chart' : 'table')}
                                            >
                                                <Icon name={view === 'table' ? 'chart-line' : 'table'} />
                                                {view === 'table' ? 'View as Chart' : 'View as Table'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={reset} disabled={!changed}>
                                                <Icon name="rotate-ccw" />
                                                Reset View
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </ToolbarGroup>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col">
                    <div className="mt-1 mb-2 flex min-h-0 flex-1 flex-col gap-6">
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 @3xl/c24:grid-cols-4! @3xl/c24:gap-0!">
                            {tiles.map((t) => (
                                <div
                                    key={t.label}
                                    className="flex min-w-0 flex-col gap-2.5 @3xl/c24:px-5! @3xl/c24:not-first:border-s! @3xl/c24:first:ps-0! @3xl/c24:last:pe-0!"
                                >
                                    <dt className="flex h-4 items-center text-sm text-muted-foreground">
                                        <span className={TRIM}>{t.label}</span>
                                    </dt>
                                    <dd className="flex min-w-0 flex-col gap-2.5">
                                        <span
                                            className={`${TRIM} text-2xl leading-none font-semibold tracking-tight tabular-nums`}
                                        >
                                            {t.value}
                                        </span>
                                        <span className="flex h-5 min-w-0 items-center gap-1.5">
                                            <TrendBadge value={t.delta} text={t.text} />
                                            <span className="hidden h-4 items-center text-xs text-muted-foreground tabular-nums @lg/c24:flex!">
                                                <span className={TRIM}>{t.note}</span>
                                            </span>
                                        </span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <div role="separator" className="h-px w-full shrink-0 bg-border" />
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            table={
                                <ChartDataTable
                                    data={exportRows}
                                    index="period"
                                    indexLabel="Period"
                                    series={[
                                        { key: 'sales', label: 'Sales' },
                                        { key: 'views', label: 'Views' },
                                        { key: 'orders', label: 'Orders' },
                                    ]}
                                    valueFormatter={(v: number) => int(v)}
                                    caption={`${unitWord} sales and views, ${span}`}
                                />
                            }
                        >
                            <div
                                ref={rootRef}
                                className={`group/c24p relative w-full min-w-0 transition-[height] duration-300 [&_.recharts-cartesian-grid]:transition-opacity [&_.recharts-cartesian-grid]:duration-200 data-[grid=off]:[&_.recharts-cartesian-grid]:opacity-0 ${expanded ? 'h-112' : 'h-72'}`}
                                data-intro={intro}
                                data-grid={grid ? 'on' : 'off'}
                                data-average={average && showSales ? 'on' : 'off'}
                                data-peak={peakOn ? 'on' : 'off'}
                            >
                                <ChartContainer config={config} className="aspect-auto h-full w-full">
                                    {(R: any) => (
                                        <R.LineChart
                                            key={`${rangeKey}-${replay}-${expanded}`}
                                            data={rows}
                                            margin={{ top: 28, right: 4, bottom: 0, left: 4 }}
                                            accessibilityLayer
                                        >
                                            <R.CartesianGrid vertical={false} yAxisId="sales" />
                                            <R.XAxis
                                                dataKey="at"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={10}
                                                minTickGap={28}
                                                interval="preserveStartEnd"
                                                tickFormatter={(v: string) => label(v, false)}
                                            />
                                            <R.YAxis
                                                yAxisId="sales"
                                                width={48}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={6}
                                                domain={[salesTicks[0], salesTicks[4]]}
                                                ticks={salesTicks}
                                                hide={!showSales}
                                                tickFormatter={(v: number) => `${currency}${compact(v)}`}
                                            />
                                            <R.YAxis
                                                yAxisId="views"
                                                orientation="right"
                                                width={48}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={6}
                                                domain={[viewsTicks[0], viewsTicks[4]]}
                                                ticks={viewsTicks}
                                                hide={!showViews}
                                                tickFormatter={compact}
                                            />
                                            <R.Tooltip
                                                isAnimationActive={false}
                                                cursor={{
                                                    stroke: 'var(--border)',
                                                    strokeWidth: 1,
                                                    strokeDasharray: '3 3',
                                                }}
                                                content={({ active, payload }: any) => {
                                                    if (!active || !payload || !payload.length) return null;
                                                    const r = payload[0].payload;
                                                    const isPeak = rows.indexOf(r) === peak;
                                                    const row = (
                                                        icon: any,
                                                        name: string,
                                                        value: string,
                                                        d?: number
                                                    ) => (
                                                        <div className="flex h-4 items-center justify-between gap-6">
                                                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                                                <span className="flex size-4 shrink-0 items-center justify-center">
                                                                    {icon}
                                                                </span>
                                                                <span className={TRIM}>{name}</span>
                                                            </span>
                                                            <span className="flex items-center gap-1.5 tabular-nums">
                                                                <span className={`${TRIM} font-medium text-foreground`}>
                                                                    {value}
                                                                </span>
                                                                {compare && d != null ? (
                                                                    <span
                                                                        className={`${TRIM} ${d >= 0 ? 'text-success' : 'text-destructive'}`}
                                                                    >
                                                                        {signed(d)}
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                    );
                                                    return (
                                                        <div className="grid w-auto min-w-56 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                            <div className="font-medium">
                                                                <span className="flex h-5 items-center justify-between gap-3">
                                                                    <span className={TRIM}>{label(r.at)}</span>
                                                                    {isPeak && peakOn ? (
                                                                        <span
                                                                            data-slot="badge"
                                                                            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border border-border bg-transparent px-1.25 py-0.5 text-xs font-medium whitespace-nowrap dark:bg-input/32"
                                                                        >
                                                                            Peak
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-1 flex-col gap-1.5">
                                                                {showSales
                                                                    ? row(
                                                                          <LineSwatch className="text-(--color-sales)" />,
                                                                          'Sales',
                                                                          `${currency}${int(r.sales)}`,
                                                                          pctChange(r.sales, r.prevSales)
                                                                      )
                                                                    : null}
                                                                {showViews
                                                                    ? row(
                                                                          <LineSwatch
                                                                              dashed
                                                                              className="text-(--color-views)"
                                                                          />,
                                                                          'Views',
                                                                          int(r.views),
                                                                          pctChange(r.views, r.prevViews)
                                                                      )
                                                                    : null}
                                                                <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                                                    {row(
                                                                        <Icon name="shopping-bag" className="size-4" />,
                                                                        'Orders',
                                                                        int(r.orders),
                                                                        pctChange(r.orders, r.prevOrders)
                                                                    )}
                                                                    {row(
                                                                        <Icon name="target" className="size-4" />,
                                                                        'Conversion',
                                                                        `${r.conversion.toFixed(2)}%`
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <R.Line
                                                yAxisId="sales"
                                                dataKey="averageSales"
                                                type="linear"
                                                className={`svt-fade ${FADE} ${average && showSales ? '' : 'opacity-0'}`}
                                                stroke="var(--color-averageSales)"
                                                strokeWidth={1}
                                                strokeDasharray="4 4"
                                                strokeOpacity={0.7}
                                                dot={false}
                                                activeDot={false}
                                                isAnimationActive={false}
                                            />
                                            <R.Line
                                                yAxisId="views"
                                                dataKey="prevViews"
                                                type={curve}
                                                className={`svt-fade ${FADE} ${compare && showViews ? '' : 'opacity-0'}`}
                                                stroke="var(--color-prevViews)"
                                                strokeWidth={1.5}
                                                strokeDasharray="6 4"
                                                strokeOpacity={0.4}
                                                dot={false}
                                                activeDot={false}
                                                isAnimationActive={false}
                                            />
                                            <R.Line
                                                yAxisId="sales"
                                                dataKey="prevSales"
                                                type={curve}
                                                className={`svt-fade ${FADE} ${compare && showSales ? '' : 'opacity-0'}`}
                                                stroke="var(--color-prevSales)"
                                                strokeWidth={1.5}
                                                strokeDasharray="6 4"
                                                strokeOpacity={0.4}
                                                dot={false}
                                                activeDot={false}
                                                isAnimationActive={false}
                                            />
                                            {showViews ? (
                                                <R.Line
                                                    yAxisId="views"
                                                    dataKey="views"
                                                    name="Views"
                                                    type={curve}
                                                    className="transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                    style={{ opacity: dim('views') }}
                                                    stroke="var(--color-views)"
                                                    strokeWidth={2}
                                                    strokeDasharray="6 4"
                                                    dot={
                                                        points
                                                            ? {
                                                                  r: 2.5,
                                                                  fill: 'var(--card)',
                                                                  stroke: 'var(--color-views)',
                                                                  strokeWidth: 1.5,
                                                              }
                                                            : false
                                                    }
                                                    activeDot={{
                                                        r: 4,
                                                        fill: 'var(--color-views)',
                                                        stroke: 'var(--card)',
                                                        strokeWidth: 2,
                                                    }}
                                                    isAnimationActive={false}
                                                />
                                            ) : null}
                                            {showSales ? (
                                                <R.Line
                                                    yAxisId="sales"
                                                    dataKey="sales"
                                                    name="Sales"
                                                    type={curve}
                                                    className="transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                    style={{ opacity: dim('sales') }}
                                                    stroke="var(--color-sales)"
                                                    strokeWidth={2}
                                                    dot={
                                                        points
                                                            ? {
                                                                  r: 2.5,
                                                                  fill: 'var(--card)',
                                                                  stroke: 'var(--color-sales)',
                                                                  strokeWidth: 1.5,
                                                              }
                                                            : false
                                                    }
                                                    activeDot={{
                                                        r: 4,
                                                        fill: 'var(--color-sales)',
                                                        stroke: 'var(--card)',
                                                        strokeWidth: 2,
                                                    }}
                                                    isAnimationActive={false}
                                                />
                                            ) : null}
                                            <R.Customized
                                                component={
                                                    <Marks
                                                        rows={rows}
                                                        left={salesTicks}
                                                        right={viewsTicks}
                                                        peak={peak}
                                                        avg={avg}
                                                        currency={currency}
                                                        showSales={showSales}
                                                        showViews={showViews}
                                                    />
                                                }
                                            />
                                        </R.LineChart>
                                    )}
                                </ChartContainer>
                            </div>
                        </ChartFigure>
                    </div>
                </CardContent>
                <CardFooter className="flex-wrap justify-between gap-x-4 gap-y-2 border-t bg-transparent">
                    <ul
                        aria-label="Legend"
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs @md/c24:gap-x-5!"
                    >
                        {showSales ? legendItem('sales', 'Sales', `${currency}${int(model.sales)}`) : null}
                        {showViews ? legendItem('views', 'Views', int(model.views), true) : null}
                        {compare ? (
                            <li className="flex h-4 animate-in items-center gap-1.5 duration-200 fade-in-0 motion-reduce:animate-none">
                                <LineSwatch dashed className="text-muted-foreground" />
                                <span className={`${TRIM} text-muted-foreground`}>Previous</span>
                            </li>
                        ) : null}
                    </ul>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="flex h-4 items-center">
                            <span className={TRIM}>{unitWord}</span>
                        </span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="flex h-4 items-center tabular-nums">
                            <span className={TRIM}>{span}</span>
                        </span>
                    </span>
                </CardFooter>
            </Card>
        </SeriesScope>
    );
}

export default SalesVsTraffic;
