import { useMemo, useRef, useState } from 'react';
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
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation } from 'components:charts/chart-kit';
import {
    TRIM,
    FADE,
    LineSwatch,
    MetaRow,
    RangeTabs,
    DRAW_X,
    useIntro,
    fmtDay,
    fmtDate,
    fmtWeekDay,
    addDays,
    usdK,
    zeroTicks,
} from 'components:charts/line-kit';
import { DAILY, MONTHLY, RANGES, TODAY_FRACTION, TODAY_LABEL } from './data';
import type { DailyRow, MonthRow, RevenueRange } from './data';

/**
 * components:charts/revenue-trend: net revenue with its subscription and one-time parts as three
 * lines, and a dashed comparison line (the previous period or the same days last year). The day (or
 * month) in progress is drawn as a dotted tail ending in a hollow dot. Ranges 7D / 30D / 90D / 12M,
 * series toggles, a Daily / Cumulative (running total) switch, KPI tiles with deltas against the
 * comparison, a refresh that redraws, and CSV / summary exports.
 *
 *   <RevenueTrend />                                   sample data
 *   <RevenueTrend daily={[['2026-10-16', 7360, 7699, 38, 8423, 8416], …]} monthly={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type RevenueTrendProps = {
    title?: string;
    descriptionPrefix?: string;
    daily?: DailyRow[];
    monthly?: MonthRow[];
    ranges?: RevenueRange[];
    defaultRange?: string;
    todayFraction?: number;
    todayLabel?: string;
    updatedLabel?: string;
    currencyNote?: string;
    className?: string;
};

type Key = 'net' | 'subscriptions' | 'oneTime' | 'compare';
const LINE_KEYS: Key[] = ['net', 'subscriptions', 'oneTime', 'compare'];
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

function compactUsd(v: number): string {
    const a = Math.abs(v);
    const fix = (x: number) => String(Number(x.toFixed(1)));
    const s = a >= 1e6 ? `${fix(a / 1e6)}M` : a >= 1e3 ? `${fix(a / 1e3)}K` : `${Math.round(a)}`;
    return `${v < 0 ? '-' : ''}$${s}`;
}

/** Tooltip money: full dollars below $100K, compact above. */
function cash(v: number): string {
    if (Math.abs(v) >= 1e5) return compactUsd(v);
    return `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
}

function signed(n: number): string {
    const r = Number(Math.abs(n).toFixed(1));
    return `${n < 0 && r !== 0 ? '-' : r !== 0 ? '+' : ''}${Math.abs(n).toFixed(1)}%`;
}

function monthLong(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return `${MONTHS_LONG[m - 1]} ${y}`;
}

function monthShort(ym: string): string {
    return MONTHS[Number(ym.split('-')[1]) - 1];
}

function DeltaBadge({ value }: { value: number }) {
    const up = value >= 0;
    return (
        <span
            data-slot="badge"
            className={`inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:size-3 ${
                up
                    ? 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success'
                    : 'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive'
            }`}
        >
            <Icon name={up ? 'arrow-up' : 'arrow-down'} />
            <span className={TRIM}>{signed(value)}</span>
        </span>
    );
}

function SeriesToggle({
    pressed,
    onPressedChange,
    children,
}: {
    pressed: boolean;
    onPressedChange: (v: boolean) => void;
    children?: any;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={() => onPressedChange(!pressed)}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-muted aria-pressed:text-foreground dark:border-input [&_svg]:pointer-events-none [&_svg]:shrink-0"
        >
            {children}
        </button>
    );
}

type Built = {
    rows: any[];
    monthly: boolean;
    compareLabel: string;
    compareSpan: Record<string, string>;
    compareTotal: Record<string, number>;
};

/** Rows for a range: values, comparison values (today's prorated), and the comparison date labels. */
function buildRows(daily: DailyRow[], monthly: MonthRow[], range: RevenueRange, frac: number): Built {
    if (!range.days) {
        const last = monthly.length - 1;
        const rows = monthly.map((m, i) => {
            const y = Number(m[0].slice(0, 4));
            return {
                key: m[0],
                label: monthLong(m[0]),
                partial: i === last,
                subscriptions: m[1],
                oneTime: m[2],
                orders: m[3],
                net: m[1] + m[2],
                previous: m[4],
                previousOn: String(y - 1),
                lastYear: m[4],
                lastYearOn: String(y - 1),
            };
        });
        const total = rows.reduce((t, r) => t + r.previous, 0);
        const span = `${monthShort(monthly[0][0])} ${Number(monthly[0][0].slice(0, 4)) - 1} to ${monthShort(
            monthly[last][0]
        )} ${Number(monthly[last][0].slice(0, 4)) - 1}`;
        return {
            rows,
            monthly: true,
            compareLabel: 'Previous period',
            compareSpan: { previous: span },
            compareTotal: { previous: total },
        };
    }
    const n = daily.length;
    const days = Math.min(range.days, n);
    const rows: any[] = [];
    for (let g = n - days; g < n; g++) {
        const d = daily[g];
        const partial = g === n - 1;
        // Shorter ranges compare with the days before them (today's value prorated); the longest uses d[4].
        const j = days < n ? daily[g - days] : null;
        const prev = j ? (partial ? Math.round((j[1] + j[2]) * frac) : j[1] + j[2]) : d[4];
        rows.push({
            key: d[0],
            label: fmtWeekDay(d[0]),
            partial,
            subscriptions: d[1],
            oneTime: d[2],
            orders: d[3],
            net: d[1] + d[2],
            previous: prev,
            previousOn: fmtDay(addDays(d[0], -days)),
            lastYear: d[5],
            lastYearOn: fmtDay(addDays(d[0], -364)),
        });
    }
    const first = rows[0].key;
    const lastKey = rows[rows.length - 1].key;
    const lyFirst = addDays(first, -364);
    const lyLast = addDays(lastKey, -364);
    return {
        rows,
        monthly: false,
        compareLabel: '',
        compareSpan: {
            previous: `${fmtDay(addDays(first, -days))} to ${fmtDay(addDays(lastKey, -days))}`,
            lastYear: `${fmtDay(lyFirst)} to ${fmtDay(lyLast)}, ${lyLast.slice(0, 4)}`,
        },
        compareTotal: {
            previous: rows.reduce((t, r) => t + r.previous, 0),
            lastYear: rows.reduce((t, r) => t + r.lastYear, 0),
        },
    };
}

function ComparePicker({
    value,
    onValueChange,
    options,
}: {
    value: string;
    onValueChange: (v: string) => void;
    options: {
        value: string;
        label: string;
        span?: string;
        total?: string;
        disabled?: boolean;
    }[];
}) {
    const current = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" aria-label="Compare with" className="bg-background @max-md:flex-1" />}
            >
                <Icon name="history" />
                <span className="flex h-5 items-center gap-1.5">
                    <span className={`${TRIM} text-muted-foreground @max-md:sr-only`}>vs</span>
                    <span className={TRIM}>{current.label}</span>
                </span>
                <Icon name="chevron-down" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-64">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Compare with</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                        {options.map((o) => (
                            <DropdownMenuRadioItem key={o.value} value={o.value} disabled={o.disabled}>
                                <span className="flex w-full items-center gap-3">
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span>{o.label}</span>
                                        {o.span ? (
                                            <small className="text-xs text-muted-foreground tabular-nums">
                                                {o.span}
                                            </small>
                                        ) : null}
                                    </span>
                                    {o.total ? (
                                        <span className="text-xs text-muted-foreground tabular-nums">{o.total}</span>
                                    ) : null}
                                </span>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function RevenueTrend({
    title = 'Revenue Trend',
    descriptionPrefix = 'All plans',
    daily = DAILY,
    monthly = MONTHLY,
    ranges = RANGES,
    defaultRange = '30D',
    todayFraction = TODAY_FRACTION,
    todayLabel = TODAY_LABEL,
    updatedLabel = 'Updated 2 min ago',
    currencyNote = 'USD, net of refunds',
    className,
}: RevenueTrendProps) {
    const initialRange = ranges.some((r) => r.key === defaultRange) ? defaultRange : ranges[0].key;
    const [rangeKey, setRangeKey] = useState(initialRange);
    const [compareWith, setCompareWith] = useState<'previous' | 'lastYear'>('previous');
    const [shown, setShown] = useState<Record<Key, boolean>>({
        net: true,
        subscriptions: true,
        oneTime: true,
        compare: true,
    });
    const [mode, setMode] = useState<'daily' | 'cumulative'>('daily');
    const [replay, setReplay] = useState(0);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];

    const built = useMemo(
        () => buildRows(daily, monthly, range, todayFraction),
        [daily, monthly, range, todayFraction]
    );
    const isMonthly = built.monthly;
    const cmpKey = isMonthly ? 'previous' : compareWith;
    const cmpLabel = cmpKey === 'lastYear' ? 'Last year' : 'Previous period';

    const config = useMemo(
        () => ({
            net: series('violet-500', 'violet-500', 'Net revenue'),
            subscriptions: series('teal-600', 'teal-600', 'Subscriptions'),
            oneTime: series('orange-600', 'orange-600', 'One-time'),
            compare: series('neutral-500', 'neutral-400', cmpLabel),
        }),
        [cmpLabel]
    );

    const chartRows = useMemo(() => {
        const src = built.rows;
        const acc = { net: 0, subscriptions: 0, oneTime: 0, orders: 0, compare: 0 };
        const n = src.length;
        return src.map((r, i) => {
            const cmp = r[cmpKey];
            let v = {
                net: r.net,
                subscriptions: r.subscriptions,
                oneTime: r.oneTime,
                orders: r.orders,
                compare: cmp,
            };
            if (mode === 'cumulative') {
                acc.net += r.net;
                acc.subscriptions += r.subscriptions;
                acc.oneTime += r.oneTime;
                acc.orders += r.orders;
                acc.compare += cmp;
                v = { ...acc };
            }
            const tail = i >= n - 2;
            return {
                ...r,
                ...v,
                compareOn: r[`${cmpKey}On`],
                netMain: r.partial ? null : v.net,
                subscriptionsMain: r.partial ? null : v.subscriptions,
                oneTimeMain: r.partial ? null : v.oneTime,
                netTail: tail ? v.net : null,
                subscriptionsTail: tail ? v.subscriptions : null,
                oneTimeTail: tail ? v.oneTime : null,
            };
        });
    }, [built, cmpKey, mode]);

    const totals = useMemo(() => {
        const rows = built.rows;
        const sum = (k: string) => rows.reduce((t, r) => t + r[k], 0);
        const net = sum('net');
        const subs = sum('subscriptions');
        const one = sum('oneTime');
        const orders = sum('orders');
        let peak = rows[0];
        rows.forEach((r) => {
            if (r.oneTime > peak.oneTime) peak = r;
        });
        const cmpNet = built.compareTotal[cmpKey] || 0;
        const d = (range.deltas && range.deltas[cmpKey]) || [0, 0, 0];
        return {
            net,
            subs,
            one,
            orders,
            peak,
            cmpNet,
            netDelta: cmpNet ? (net / cmpNet - 1) * 100 : 0,
            d,
        };
    }, [built, cmpKey, range]);

    const n = chartRows.length;
    const yTicks = useMemo(() => {
        const lastDay = daily[daily.length - 1][0];
        const dom = Number(lastDay.slice(8, 10));
        const dim = new Date(Date.UTC(Number(lastDay.slice(0, 4)), Number(lastDay.slice(5, 7)), 0)).getUTCDate();
        const f = isMonthly ? (dom - 1 + todayFraction) / dim : todayFraction;
        let max = 0;
        chartRows.forEach((r, i) => {
            LINE_KEYS.forEach((k) => {
                if (!shown[k]) return;
                let v = r[k];
                if (i === chartRows.length - 1 && r.partial && k !== 'compare' && f > 0) {
                    const own = mode === 'cumulative' ? built.rows[i][k] : v;
                    v = v + own / f - own;
                }
                if (v > max) max = v;
            });
        });
        return zeroTicks(max, 4);
    }, [chartRows, shown, mode, isMonthly, daily, todayFraction, built]);
    const xTicks: string[] = [];
    for (let i = n - 1; i >= 0; i -= range.tickEvery || 1) xTicks.unshift(chartRows[i].key);
    const lastKey = chartRows[n - 1].key;
    const tickLabel = (k: string) => {
        if (isMonthly) return monthShort(k);
        if (k === lastKey) return 'Today';
        if (range.days && range.days <= 7) return fmtWeekDay(k).slice(0, 3);
        return fmtDay(k);
    };

    const rootRef = useRef<HTMLDivElement>(null);
    const intro = useIntro([rangeKey, replay, mode, cmpKey], 480);
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '.recharts-line',
                keyframes: DRAW_X,
                duration: 0.45,
                delay: 0,
                ease: [0.42, 0, 0.58, 1],
            },
        ],
        [rangeKey, replay, mode, cmpKey]
    );

    const refresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setReplay((v) => v + 1);
        }, 450);
    };
    const allShown = LINE_KEYS.every((k) => shown[k]);
    const changed = rangeKey !== initialRange || compareWith !== 'previous' || !allShown || mode !== 'daily';
    const reset = () => {
        setRangeKey(initialRange);
        setCompareWith('previous');
        setShown({ net: true, subscriptions: true, oneTime: true, compare: true });
        setMode('daily');
    };

    const unit = isMonthly ? 'month' : 'day';
    const summary = `Revenue per ${unit}, ${range.phrase}${mode === 'cumulative' ? ', as a running total' : ''}. Net ${compactUsd(
        totals.net
    )}, ${signed(totals.netDelta)} vs ${cmpLabel.toLowerCase()}.`;
    const copySummary = `${title}, ${range.phrase}: net ${compactUsd(totals.net)} (${signed(totals.netDelta)} vs ${cmpLabel.toLowerCase()}, from ${compactUsd(
        totals.cmpNet
    )}). Subscriptions ${compactUsd(totals.subs)}, one-time ${compactUsd(totals.one)}, ${totals.orders.toLocaleString(
        'en-US'
    )} orders.`;
    const columns = [
        { key: 'label', label: isMonthly ? 'Month' : 'Date' },
        { key: 'net', label: 'Net revenue' },
        { key: 'subscriptions', label: 'Subscriptions' },
        { key: 'oneTime', label: 'One-time' },
        { key: 'orders', label: 'Orders' },
        { key: 'compare', label: cmpLabel },
    ];

    const toggles: { key: Key; label: string; dashed?: boolean }[] = [
        { key: 'net', label: 'Net revenue' },
        { key: 'subscriptions', label: 'Subscriptions' },
        { key: 'oneTime', label: 'One-time' },
        { key: 'compare', label: cmpLabel, dashed: true },
    ];

    const tiles = [
        {
            key: 'net',
            label: 'Net Revenue',
            swatch: 'text-(--color-net)',
            value: compactUsd(totals.net),
            delta: totals.netDelta,
            note: `from ${compactUsd(totals.cmpNet)}`,
            big: true,
        },
        {
            key: 'subscriptions',
            label: 'Subscriptions',
            swatch: 'text-(--color-subscriptions)',
            value: compactUsd(totals.subs),
            delta: totals.d[0],
            note: `${Math.round((totals.subs / (totals.net || 1)) * 100)}% of net`,
        },
        {
            key: 'oneTime',
            label: 'One-Time',
            swatch: 'text-(--color-oneTime)',
            value: compactUsd(totals.one),
            delta: totals.d[1],
            note: `Peak ${compactUsd(totals.peak.oneTime)} ${
                isMonthly ? `in ${monthShort(totals.peak.key)}` : `on ${fmtDay(totals.peak.key)}`
            }`,
        },
        {
            key: 'orders',
            label: 'Orders',
            value: totals.orders.toLocaleString('en-US'),
            delta: totals.d[2],
            note: `${cash(Math.round(totals.net / (totals.orders || 1)))} per order`,
        },
    ];

    const line = (key: 'net' | 'subscriptions' | 'oneTime', R: any) => {
        if (!shown[key]) return null;
        const width = key === 'net' ? 2 : 1.5;
        const color = `var(--color-${key})`;
        return [
            <R.Line
                key={`${key}-main`}
                dataKey={`${key}Main`}
                name={key}
                type="monotone"
                stroke={color}
                strokeWidth={width}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: 'var(--card)', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
            />,
            <R.Line
                key={`${key}-tail`}
                dataKey={`${key}Tail`}
                name={`${key} (in progress)`}
                type="linear"
                className={`${FADE} group-data-[intro=drawing]/rt:opacity-0`}
                stroke={color}
                strokeWidth={width}
                strokeDasharray="0.5 4"
                strokeLinecap="round"
                activeDot={{ r: 4, fill: color, stroke: 'var(--card)', strokeWidth: 2 }}
                dot={(p: any) =>
                    p.index === n - 1 && p.cx != null && p.cy != null ? (
                        <circle
                            key={`${key}-today`}
                            cx={p.cx}
                            cy={p.cy}
                            r={3.5}
                            fill="var(--card)"
                            stroke={color}
                            strokeWidth={2}
                        />
                    ) : (
                        <g key={`${key}-d${p.index}`} />
                    )
                }
                isAnimationActive={false}
            />,
        ];
    };

    return (
        <SeriesScope config={config} className={className}>
            <Frame stacked className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle role="heading">{title}</FrameTitle>
                        <FrameDescription>{`${descriptionPrefix}, ${range.phrase}`}</FrameDescription>
                    </div>
                    <ChartToolbar className="w-full @md:w-auto!">
                        <RangeTabs
                            size="default"
                            options={ranges.map((r) => ({ value: r.key, label: r.label }))}
                            value={rangeKey}
                            onValueChange={setRangeKey}
                        />
                        <ComparePicker
                            value={cmpKey}
                            onValueChange={(v) => setCompareWith(v as any)}
                            options={
                                isMonthly
                                    ? [
                                          {
                                              value: 'previous',
                                              label: 'Previous period',
                                              span: built.compareSpan.previous,
                                              total: compactUsd(built.compareTotal.previous),
                                          },
                                          { value: 'lastYear', label: 'Last year', disabled: true },
                                      ]
                                    : [
                                          {
                                              value: 'previous',
                                              label: 'Previous period',
                                              span: built.compareSpan.previous,
                                              total: compactUsd(built.compareTotal.previous),
                                          },
                                          {
                                              value: 'lastYear',
                                              label: 'Last year',
                                              span: built.compareSpan.lastYear,
                                              total: compactUsd(built.compareTotal.lastYear),
                                          },
                                      ]
                            }
                        />
                        <ToolbarGroup aria-label="Chart actions">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Refresh revenue"
                                title="Refresh revenue"
                                className="bg-background"
                                onClick={refresh}
                                disabled={loading}
                            >
                                <Icon
                                    name={loading ? 'loader-circle' : 'refresh-cw'}
                                    className={loading ? 'animate-spin' : ''}
                                />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
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
                                        <DropdownMenuLabel>Data</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                downloadText(
                                                    `revenue-${range.key.toLowerCase()}.csv`,
                                                    rowsToCsv(chartRows, columns)
                                                )
                                            }
                                        >
                                            <Icon name="download" />
                                            Export CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                copyText(copySummary);
                                            }}
                                        >
                                            <Icon name="copy" />
                                            Copy summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>View</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'chart-line' : 'table'} />
                                            {view === 'table' ? 'View as chart' : 'View as table'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={reset} disabled={!changed}>
                                            <Icon name="rotate-ccw" />
                                            Reset view
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel>
                    <dl className="-mx-(--frame-panel-px) -my-(--frame-panel-py) grid grid-cols-2 @3xl:grid-cols-4!">
                        {tiles.map((t) => (
                            <div
                                key={t.key}
                                className="flex min-w-0 flex-col gap-1 px-(--frame-panel-px) py-(--frame-panel-py) even:border-s nth-[n+3]:border-t @3xl:not-first:border-s! @3xl:nth-[n+3]:border-t-0!"
                            >
                                <dt className="flex h-5 min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        {t.label}
                                    </span>
                                    {t.swatch ? <LineSwatch className={`h-0.5 w-3 ${t.swatch}`} /> : null}
                                </dt>
                                <dd className="flex min-w-0 flex-col gap-3">
                                    <span className="flex h-8 items-end">
                                        <span
                                            className={`${TRIM} font-semibold tracking-tight tabular-nums ${t.big ? 'text-3xl @3xl:text-4xl!' : 'text-2xl'}`}
                                        >
                                            {t.value}
                                        </span>
                                    </span>
                                    <span className="flex min-w-0 flex-col items-start gap-1 text-xs text-muted-foreground tabular-nums @md:h-5! @md:flex-row! @md:items-center! @md:gap-1.5!">
                                        <DeltaBadge value={t.delta} />
                                        <span className="flex h-4 max-w-full min-w-0 items-center">
                                            <span className={`${TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                                {t.note}
                                            </span>
                                        </span>
                                    </span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </FramePanel>
                <FramePanel className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div
                            role="group"
                            aria-label="Series in the chart"
                            className="flex flex-wrap items-center gap-1"
                        >
                            {toggles.map((t) => (
                                <SeriesToggle
                                    key={t.key}
                                    pressed={shown[t.key]}
                                    onPressedChange={(v) => setShown({ ...shown, [t.key]: v })}
                                >
                                    <LineSwatch
                                        inset
                                        dash={t.dashed ? '2 3' : undefined}
                                        className={t.dashed ? 'text-muted-foreground' : `text-(--color-${t.key})`}
                                    />
                                    <span className={TRIM}>{t.label}</span>
                                </SeriesToggle>
                            ))}
                        </div>
                        <RangeTabs
                            size="default"
                            label="Values"
                            options={[
                                { value: 'daily', label: isMonthly ? 'Monthly' : 'Daily' },
                                { value: 'cumulative', label: 'Cumulative' },
                            ]}
                            value={mode}
                            onValueChange={(v) => setMode(v as any)}
                            tone="muted"
                        />
                    </div>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={chartRows}
                                index="label"
                                indexLabel={isMonthly ? 'Month' : 'Date'}
                                series={[
                                    { key: 'net', label: 'Net revenue' },
                                    { key: 'subscriptions', label: 'Subscriptions' },
                                    { key: 'oneTime', label: 'One-time' },
                                    { key: 'compare', label: cmpLabel },
                                ]}
                                valueFormatter={(v: number) => cash(v)}
                                caption={`${title}, ${range.phrase}`}
                            />
                        }
                    >
                        <div ref={rootRef} className="group/rt h-72 w-full" data-intro={intro}>
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.LineChart
                                        key={`${rangeKey}-${replay}-${mode}-${cmpKey}`}
                                        data={chartRows}
                                        margin={{ top: 8, right: 6, bottom: 0, left: 0 }}
                                        accessibilityLayer
                                    >
                                        <R.CartesianGrid vertical={false} />
                                        <R.XAxis
                                            dataKey="key"
                                            ticks={xTicks}
                                            interval={0}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            tick={(p: any) => (
                                                <text
                                                    x={p.x}
                                                    y={p.y}
                                                    textAnchor={p.payload.value === lastKey ? 'end' : 'middle'}
                                                    fill="var(--muted-foreground)"
                                                    className="recharts-text recharts-cartesian-axis-tick-value"
                                                >
                                                    <tspan x={p.x} dy="0.71em">
                                                        {tickLabel(p.payload.value)}
                                                    </tspan>
                                                </text>
                                            )}
                                        />
                                        <R.YAxis
                                            width={44}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={4}
                                            domain={[0, yTicks[yTicks.length - 1]]}
                                            ticks={yTicks}
                                            tickFormatter={usdK}
                                        />
                                        <R.Tooltip
                                            isAnimationActive={false}
                                            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const r = payload[0].payload;
                                                const cum = mode === 'cumulative';
                                                const delta = r.compare ? (r.net / r.compare - 1) * 100 : 0;
                                                const share = (v: number) => `${Math.round((v / (r.net || 1)) * 100)}%`;
                                                const row = (
                                                    icon: any,
                                                    label: string,
                                                    value: string,
                                                    extra: string
                                                ) => (
                                                    <span className="flex h-4 items-center gap-2 text-muted-foreground">
                                                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                                            {icon}
                                                            <span
                                                                className={`${TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                            >
                                                                {label}
                                                            </span>
                                                        </span>
                                                        <span
                                                            className={`${TRIM} font-mono font-medium text-foreground tabular-nums`}
                                                        >
                                                            {value}
                                                        </span>
                                                        <span className={`${TRIM} w-14 text-end tabular-nums`}>
                                                            {extra}
                                                        </span>
                                                    </span>
                                                );
                                                return (
                                                    <div className="grid w-64 min-w-32 items-start rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                        <div className="flex flex-1 flex-col gap-2">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="flex h-4 items-center justify-between gap-3">
                                                                    <span
                                                                        className={`${TRIM} font-medium tabular-nums`}
                                                                    >
                                                                        {cum ? `Through ${r.label}` : r.label}
                                                                    </span>
                                                                    {r.partial ? (
                                                                        <span
                                                                            className={`${TRIM} text-muted-foreground tabular-nums`}
                                                                        >
                                                                            To {todayLabel}
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                                <span className="flex h-5 items-center gap-1.5">
                                                                    <span
                                                                        className={`${TRIM} text-sm font-semibold tabular-nums`}
                                                                    >
                                                                        {cash(r.net)}
                                                                    </span>
                                                                    <span className={`${TRIM} text-muted-foreground`}>
                                                                        {cum ? 'net to date' : 'net revenue'}
                                                                    </span>
                                                                    <span className="ms-auto">
                                                                        <DeltaBadge value={delta} />
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div
                                                                role="separator"
                                                                className="h-px w-full shrink-0 bg-border"
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                {row(
                                                                    <LineSwatch className="h-0.5 w-3 text-(--color-subscriptions)" />,
                                                                    'Subscriptions',
                                                                    cash(r.subscriptions),
                                                                    share(r.subscriptions)
                                                                )}
                                                                {row(
                                                                    <LineSwatch className="h-0.5 w-3 text-(--color-oneTime)" />,
                                                                    'One-time',
                                                                    cash(r.oneTime),
                                                                    share(r.oneTime)
                                                                )}
                                                            </div>
                                                            <div
                                                                role="separator"
                                                                className="h-px w-full shrink-0 bg-border"
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                {row(
                                                                    <LineSwatch
                                                                        dashed
                                                                        className="h-0.5 w-3 text-muted-foreground"
                                                                    />,
                                                                    cmpLabel,
                                                                    cash(r.compare),
                                                                    r.compareOn
                                                                )}
                                                                {row(
                                                                    null,
                                                                    cum ? 'Orders to date' : 'Orders',
                                                                    r.orders.toLocaleString('en-US'),
                                                                    `${cash(Math.round(r.net / (r.orders || 1)))} avg`
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        {shown.compare ? (
                                            <R.Line
                                                dataKey="compare"
                                                name={cmpLabel}
                                                type="monotone"
                                                stroke="var(--color-compare)"
                                                strokeOpacity={0.8}
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                dot={false}
                                                activeDot={{
                                                    r: 3,
                                                    fill: 'var(--color-compare)',
                                                    stroke: 'var(--card)',
                                                    strokeWidth: 2,
                                                }}
                                                isAnimationActive={false}
                                            />
                                        ) : null}
                                        {line('oneTime', R)}
                                        {line('subscriptions', R)}
                                        {line('net', R)}
                                    </R.LineChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center gap-2">
                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
                        <span className={TRIM}>{updatedLabel}</span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className={`${TRIM} tabular-nums`}>Today counts to {todayLabel}</span>
                    </span>
                    <MetaRow items={[currencyNote]} />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default RevenueTrend;
