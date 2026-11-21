import { useEffect, useMemo, useRef, useState } from 'react';
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
    ChartMoreMenu,
} from 'components:chart-frame';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation, useElementWidth } from 'components:charts/chart-kit';
import {
    TEXT_TRIM,
    usd,
    usdTick,
    TipRow,
    TipSection,
    StatusBadge,
    MetaDot,
    RollingValue,
    copyCsv,
    BelowBars,
} from 'components:charts/composed-kit';
import { MONTHS, LAST_YEAR, LATEST, FEED } from './data';
import type { MarginMonth, LedgerEntry } from './data';

/**
 * components:charts/operating-margin: revenue and operating expense columns per month (or quarter) with
 * the operating margin as a line in a lane above them, a dashed margin target, hatched columns for the
 * open month's projection and the forecast months, rolling KPI tiles (FY outlook, the open month's
 * margin, YTD income / revenue / expenses vs last year), a live ledger feed that posts to the open
 * month (pause / sync), Month / Quarter grouping, Show menu (forecast, target) and CSV / copy exports.
 *
 *   <OperatingMargin />                                  sample data
 *   <OperatingMargin data={[{ month, label, quarter, status, revenue, expenses, revenuePosted?, expensesPosted? }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type OperatingMarginProps = {
    title?: string;
    description?: string;
    data?: MarginMonth[];
    lastYear?: { revenue: number; expenses: number };
    latest?: LedgerEntry[];
    feed?: { label: string; kind: 'revenue' | 'expenses'; amount: number }[];
    target?: number;
    /** Share of the open month's remaining revenue expected to go to expenses. */
    costRatio?: number;
    liveInterval?: number;
    currency?: string;
    asOfLabel?: string;
    className?: string;
};

type Row = {
    key: string;
    label: string;
    quarter: string;
    title: string;
    status: 'closed' | 'open' | 'forecast';
    revenue: number;
    expenses: number;
    revenuePosted?: number;
    expensesPosted?: number;
    income: number;
    margin: number;
    projected: number;
    marginActual: number | null;
    marginForecast: number | null;
};

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';
const LANE_TOP = 0.09;
const LANE_BOTTOM = 0.308;
const KEYFRAMES = `
@keyframes rp-c36-ping { 0% { transform: scale(1); opacity: 0; } 12% { opacity: 0.5; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes rp-c36-flash { 0% { opacity: 0; transform: translateY(2px); } 25% { opacity: 1; transform: none; } 70% { opacity: 1; } 100% { opacity: 0; } }
`;

function niceStep(raw: number) {
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 5 ? 5 : 10) * mag;
}

function topRounded(x: number, y: number, w: number, h: number, r: number) {
    if (h <= 0) return '';
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h}L${x},${y + rr}A${rr},${rr},0,0,1,${x + rr},${y}L${x + w - rr},${y}A${rr},${rr},0,0,1,${x + w},${y + rr}L${x + w},${y + h}Z`;
}

function buildMonths(data: MarginMonth[], posted: { revenue: number; expenses: number } | null, ratio: number): Row[] {
    return data.map((m) => {
        let revenue = m.revenue;
        let expenses = m.expenses;
        let revenuePosted = m.revenuePosted;
        let expensesPosted = m.expensesPosted;
        if (m.status === 'open' && posted) {
            revenuePosted = posted.revenue;
            expensesPosted = posted.expenses;
            revenue = Math.max(m.revenue, revenuePosted);
            expenses = expensesPosted + (revenue - revenuePosted) * ratio;
        }
        const projected = revenue ? ((revenue - expenses) / revenue) * 100 : 0;
        const margin =
            m.status === 'open' && revenuePosted
                ? ((revenuePosted - (expensesPosted || 0)) / revenuePosted) * 100
                : projected;
        return {
            key: m.label,
            label: m.label,
            quarter: m.quarter,
            title: m.month,
            status: m.status,
            revenue,
            expenses,
            revenuePosted,
            expensesPosted,
            income: m.status === 'open' ? (revenuePosted || 0) - (expensesPosted || 0) : revenue - expenses,
            margin,
            projected,
            marginActual: null,
            marginForecast: null,
        };
    });
}

function toQuarters(months: Row[]): Row[] {
    const out: Row[] = [];
    const year = months[0] ? months[0].title.split(' ').pop() : '';
    const keys: string[] = [];
    months.forEach((m) => {
        if (keys.indexOf(m.quarter) < 0) keys.push(m.quarter);
    });
    keys.forEach((q) => {
        const ms = months.filter((m) => m.quarter === q);
        const open = ms.some((m) => m.status === 'open');
        const forecast = ms.every((m) => m.status === 'forecast');
        const revenue = ms.reduce((s, m) => s + m.revenue, 0);
        const expenses = ms.reduce((s, m) => s + m.expenses, 0);
        const done = ms.filter((m) => m.status === 'closed');
        const revenuePosted =
            done.reduce((s, m) => s + m.revenue, 0) +
            ms.reduce((s, m) => s + (m.status === 'open' ? m.revenuePosted || 0 : 0), 0);
        const expensesPosted =
            done.reduce((s, m) => s + m.expenses, 0) +
            ms.reduce((s, m) => s + (m.status === 'open' ? m.expensesPosted || 0 : 0), 0);
        const projected = revenue ? ((revenue - expenses) / revenue) * 100 : 0;
        const status = open ? 'open' : forecast ? 'forecast' : 'closed';
        out.push({
            key: q,
            label: q,
            quarter: q,
            title: `${q} ${year}`,
            status,
            revenue,
            expenses,
            revenuePosted: open ? revenuePosted : undefined,
            expensesPosted: open ? expensesPosted : undefined,
            income: open ? revenuePosted - expensesPosted : revenue - expenses,
            margin: open && revenuePosted ? ((revenuePosted - expensesPosted) / revenuePosted) * 100 : projected,
            projected,
            marginActual: null,
            marginForecast: null,
        });
    });
    return out;
}

function FlashArrow({ value }: { value: number }) {
    const prev = useRef(value);
    const [flash, setFlash] = useState<{ dir: 'up' | 'down'; n: number } | null>(null);
    useEffect(() => {
        if (value !== prev.current) {
            const dir = value > prev.current ? 'up' : 'down';
            prev.current = value;
            setFlash((f) => ({ dir, n: f ? f.n + 1 : 1 }));
        }
    }, [value]);
    return (
        <span className="pointer-events-none absolute start-full top-0 ms-1.5 flex h-full items-center">
            {flash ? (
                <span
                    key={flash.n}
                    className={`absolute opacity-0 [animation:rp-c36-flash_420ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:[animation:none] ${flash.dir === 'up' ? 'text-success' : 'text-destructive'}`}
                >
                    <Icon name={flash.dir === 'up' ? 'arrow-up' : 'arrow-down'} className="size-4" />
                </span>
            ) : null}
        </span>
    );
}

function Kpi({
    label,
    text,
    value,
    big,
    note,
    tone,
    delay,
}: {
    label: string;
    text: string;
    value: number;
    big?: boolean;
    note: string;
    tone: 'up' | 'down' | 'neutral';
    delay: number;
}) {
    return (
        <div
            data-c36-enter=""
            data-delay={delay}
            className="flex min-w-0 flex-col gap-2 first:col-span-2 @2xl:px-(--frame-panel-px) @2xl:py-(--frame-panel-py) @2xl:not-first:border-s @2xl:first:col-span-1"
        >
            <dt className="truncate text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
                <span className="relative flex h-6 items-center self-start">
                    <RollingValue
                        text={text}
                        className={`font-semibold tracking-tight ${big ? 'text-2xl' : 'text-xl'}`}
                    />
                    <FlashArrow value={value} />
                </span>
                <span className="flex h-4 min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <span
                        className={`flex shrink-0 ${tone === 'up' ? 'text-success' : tone === 'down' ? 'text-destructive' : 'text-foreground'}`}
                    >
                        <Icon name={tone === 'down' ? 'trending-down' : 'trending-up'} className="size-4" />
                    </span>
                    <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap tabular-nums`}>
                        {note}
                    </span>
                </span>
            </dd>
        </div>
    );
}

function MarginSwatch() {
    return (
        <span aria-hidden="true" className="flex shrink-0 items-center">
            <span className="h-0.5 w-2.5 rounded-full bg-(--color-margin)" />
            <span className="-ms-0.5 size-1.5 rounded-full bg-(--color-margin)" />
        </span>
    );
}

function MarginTooltip({ row }: { row: Row }) {
    const head = (
        <div className="font-medium">
            <span className="flex h-5 items-center justify-between gap-3">
                <span className={TEXT_TRIM}>{row.title}</span>
                {row.status === 'open' ? <StatusBadge tone="info">Open</StatusBadge> : null}
                {row.status === 'forecast' ? <StatusBadge tone="muted">Forecast</StatusBadge> : null}
            </span>
        </div>
    );
    const sw = (cls: string) => (
        <span className="flex size-4 shrink-0 items-center justify-center">
            <span className={`size-2 shrink-0 rounded-full ${cls}`} />
        </span>
    );
    const open = row.status === 'open';
    return (
        <div className="grid w-auto min-w-52 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            {head}
            <div className="grid gap-1.5">
                <TipRow
                    mono={false}
                    swatch={sw('bg-(--color-revenue)')}
                    label={open ? 'Revenue posted' : 'Revenue'}
                    value={usd(open ? row.revenuePosted || 0 : row.revenue)}
                    valueClassName="font-sans"
                />
                <div className="flex flex-col gap-1.5">
                    <TipRow
                        mono={false}
                        swatch={sw('bg-(--color-expenses)')}
                        label={open ? 'Expenses posted' : 'Expenses'}
                        value={usd(open ? row.expensesPosted || 0 : row.expenses)}
                        valueClassName="font-sans"
                    />
                    <TipSection>
                        <TipRow
                            mono={false}
                            swatch={
                                <span className="flex size-4 shrink-0 items-center justify-center">
                                    <Icon name="trending-up" className="size-4" />
                                </span>
                            }
                            label={open ? 'Income to date' : 'Operating income'}
                            value={usd(row.income, { decimals: 0 })}
                            valueClassName="font-sans"
                        />
                        <TipRow
                            mono={false}
                            swatch={
                                <span className="flex size-4 shrink-0 items-center justify-center">
                                    <MarginSwatch />
                                </span>
                            }
                            label={open ? 'Margin to date' : 'Operating margin'}
                            value={`${row.margin.toFixed(1)}%`}
                            valueClassName="font-sans"
                        />
                        {open ? (
                            <TipRow
                                mono={false}
                                label="Projected margin"
                                value={`${row.projected.toFixed(1)}%`}
                                valueClassName="font-sans"
                            />
                        ) : null}
                    </TipSection>
                </div>
            </div>
        </div>
    );
}

// ComposedChart hands a custom cursor the line `points` (plus the plot offset), not a band rectangle: build the
// band from the category centre and the plot width / category count.
function CursorBand({ points, width, count = 1, lib }: any) {
    if (!points || points.length < 2 || !width) return null;
    const band = width / Math.max(1, count);
    return (
        <BelowBars lib={lib}>
            <rect
                x={points[0].x - band / 2}
                y={points[0].y}
                width={band}
                height={points[1].y - points[0].y}
                rx={4}
                ry={4}
                className="pointer-events-none fill-muted"
            />
        </BelowBars>
    );
}

export function OperatingMargin({
    title = 'Operating Margin',
    description = 'FY2026 revenue, costs and margin',
    data = MONTHS,
    lastYear = LAST_YEAR,
    latest = LATEST,
    feed = FEED,
    target = 18,
    costRatio = 0.785,
    liveInterval = 3500,
    currency = 'USD',
    asOfLabel = 'As of Oct 14',
    className,
}: OperatingMarginProps) {
    const openMonth = data.find((m) => m.status === 'open');
    const [group, setGroup] = useState<'month' | 'quarter'>('month');
    const [live, setLive] = useState(true);
    const [showForecast, setShowForecast] = useState(true);
    const [showTarget, setShowTarget] = useState(true);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [posted, setPosted] = useState(
        openMonth ? { revenue: openMonth.revenuePosted || 0, expenses: openMonth.expensesPosted || 0 } : null
    );
    const [entries, setEntries] = useState<LedgerEntry[]>(latest);
    const [active, setActive] = useState<number | null>(null);
    const cursor = useRef(0);
    const frameRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(chartRef);

    const post = () => {
        if (!posted || !feed.length) return;
        const f = feed[cursor.current % feed.length];
        cursor.current += 1;
        setPosted((p) => (p ? { ...p, [f.kind]: p[f.kind] + f.amount } : p));
        setEntries((list) => [{ id: Date.now() + cursor.current, ...f }].concat(list).slice(0, 8));
    };
    const postRef = useRef(post);
    postRef.current = post;
    useEffect(() => {
        if (!live || !openMonth) return undefined;
        const t = setInterval(() => postRef.current(), liveInterval);
        return () => clearInterval(t);
    }, [live, liveInterval, openMonth]);

    const config = useMemo(
        () => ({
            revenue: series('indigo-500', 'indigo-400', 'Revenue'),
            expenses: series('slate-300', 'slate-600', 'Expenses'),
            margin: series('emerald-600', 'emerald-400', 'Operating margin'),
        }),
        []
    );

    const months = useMemo(() => buildMonths(data, posted, costRatio), [data, posted, costRatio]);
    const rows = useMemo(() => {
        const base = (group === 'quarter' ? toQuarters(months) : months).filter(
            (r) => showForecast || r.status !== 'forecast'
        );
        const openIdx = base.findIndex((r) => r.status === 'open');
        const hasForecast = base.some((r) => r.status === 'forecast');
        return base.map((r, i) => ({
            ...r,
            marginActual: r.status === 'forecast' ? null : r.margin,
            marginForecast: hasForecast && openIdx >= 0 && i >= openIdx ? r.margin : null,
        }));
    }, [months, group, showForecast]);

    // KPIs (always monthly).
    const done = months.filter((m) => m.status !== 'forecast');
    const ytdRevenue = done.reduce((s, m) => s + (m.status === 'open' ? m.revenuePosted || 0 : m.revenue), 0);
    const ytdExpenses = done.reduce((s, m) => s + (m.status === 'open' ? m.expensesPosted || 0 : m.expenses), 0);
    const ytdIncome = ytdRevenue - ytdExpenses;
    const fyRevenue = months.reduce((s, m) => s + m.revenue, 0);
    const fyIncome = months.reduce((s, m) => s + m.revenue - m.expenses, 0);
    const outlook = fyRevenue ? (fyIncome / fyRevenue) * 100 : 0;
    const openRow = months.find((m) => m.status === 'open') || months[months.length - 1];
    const lyIncome = lastYear.revenue - lastYear.expenses;
    const pct = (a: number, b: number) => (b ? (a / b - 1) * 100 : 0);
    const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}%`;
    const pts = (n: number) => `${Math.abs(n).toFixed(1)} pts ${n >= 0 ? 'above' : 'below'} target`;

    // Scales.
    const maxBar = Math.max(...rows.map((r) => Math.max(r.revenue, r.expenses)));
    const barStep = niceStep(maxBar / 3);
    const barTicks = [0, barStep, barStep * 2, barStep * 3];
    const barMax = barStep * 5;
    const margins = rows.map((r) => r.margin).concat(showTarget ? [target] : []);
    const mn = Math.min(...margins);
    const mx = Math.max(...margins);
    const span = (mx - mn || 1) / (LANE_BOTTOM - LANE_TOP);
    const mMax = mx + LANE_TOP * span;
    const mMin = mMax - span;
    const mStep = mx - mn > 12 ? 10 : 5;
    const mTicks: number[] = [];
    for (let v = Math.ceil(mn / mStep) * mStep; v <= mx; v += mStep) mTicks.push(v);
    const openIdx = rows.findIndex((r) => r.status === 'open');
    const firstForecast = rows.findIndex((r) => r.status === 'forecast');
    const plotW = Math.max(0, (width || 0) - 44 - 4);
    const band = rows.length ? plotW / rows.length : 0;

    useEnterAnimation(
        frameRef,
        [
            {
                selector: '[data-c36-enter]',
                keyframes: { transform: ['translateY(4px)', 'translateY(0px)'], opacity: [0, 1] },
                duration: 0.28,
                delay: (_i, el) => (Number(el.getAttribute('data-delay')) || 0) / 1000,
            },
            {
                selector: '.c36-bar-revenue',
                keyframes: { transform: ['scaleY(0)', 'scaleY(1)'] },
                style: (_el, ctx) => ({ 'transform-box': 'view-box', 'transform-origin': `0px ${ctx.baseline}px` }),
                duration: 0.36,
                delay: (i) => 0.24 + i * 0.0255,
            },
            {
                selector: '.c36-bar-expenses',
                keyframes: { transform: ['scaleY(0)', 'scaleY(1)'] },
                style: (_el, ctx) => ({ 'transform-box': 'view-box', 'transform-origin': `0px ${ctx.baseline}px` }),
                duration: 0.36,
                delay: (i) => 0.275 + i * 0.0255,
            },
            {
                selector: '.c36-margin .recharts-line-curve',
                keyframes: { clipPath: ['inset(-12px 100% -12px -12px)', 'inset(-12px -12px -12px -12px)'] },
                duration: 0.7,
                delay: 0.66,
            },
            {
                selector: '.c36-pop',
                keyframes: { transform: ['scale(0.6)', 'scale(1)'], opacity: [0, 1] },
                style: { 'transform-box': 'fill-box', 'transform-origin': 'center' },
                duration: 0.22,
                delay: (_i, el) => {
                    const f = Number(el.getAttribute('data-f')) || 0;
                    return 0.66 + 0.7 * (1 - Math.cbrt(1 - Math.min(1, f)));
                },
            },
            {
                selector: '.c36-land',
                keyframes: { transform: ['scale(0.6)', 'scale(1)'], opacity: [0, 1] },
                style: { 'transform-box': 'fill-box', 'transform-origin': 'center' },
                duration: 0.25,
                delay: 1.36,
            },
        ],
        [group, showForecast]
    );

    const csvColumns = [
        { key: 'title', label: 'Period' },
        { key: 'status', label: 'Status' },
        { key: 'revenue', label: 'Revenue', value: (r: Row) => Math.round(r.revenue) },
        { key: 'expenses', label: 'Expenses', value: (r: Row) => Math.round(r.expenses) },
        { key: 'income', label: 'Operating income', value: (r: Row) => Math.round(r.income) },
        { key: 'margin', label: 'Operating margin %', value: (r: Row) => r.margin.toFixed(1) },
    ];
    const summary = `${title}: FY outlook ${outlook.toFixed(1)}% operating margin, ${pts(outlook - target)} of ${target.toFixed(1)}%. ${openRow.label} margin to date ${openRow.margin.toFixed(1)}%. Year to date revenue ${usd(ytdRevenue)}, expenses ${usd(ytdExpenses)}, operating income ${usd(ytdIncome)} (${signed(pct(ytdIncome, lyIncome))} vs last year).`;
    const lastActual = openIdx >= 0 ? openIdx : rows.reduce((a, r, i) => (r.status !== 'forecast' ? i : a), -1);
    const dim = (i: number) => active != null && active !== i;

    const barShape = (key: 'revenue' | 'expenses') => (p: any) => {
        const r: Row = p.payload;
        const { x, y, width: w, height: h, index } = p;
        if (x == null || !h) return <g />;
        const hatched = r.status !== 'closed';
        const postedVal = key === 'revenue' ? r.revenuePosted : r.expensesPosted;
        const ph = r.status === 'open' && postedVal != null ? (h * postedVal) / (r[key] || 1) : 0;
        return (
            <g className={`transition-opacity duration-150 ${EASE} ${dim(index) ? 'opacity-30' : ''}`}>
                <g className={`c36-bar-${key}`}>
                    <path
                        d={topRounded(x, y, w, h, 3)}
                        fill={hatched ? `url(#rp-c36-hatch-${key})` : `var(--color-${key})`}
                        stroke={hatched ? `var(--color-${key})` : undefined}
                        strokeWidth={hatched ? 1 : undefined}
                    />
                    {ph > 0 ? <rect x={x} y={y + h - ph} width={w} height={ph} fill={`var(--color-${key})`} /> : null}
                </g>
            </g>
        );
    };

    const marginDot = (forecast: boolean) => (d: any) => {
        const r: Row = d.payload;
        if (d.value == null || d.cx == null) return <g key={`m${forecast ? 'f' : 'a'}${d.index}`} />;
        if (forecast && r.status !== 'forecast') return <g key={`mf${d.index}`} />;
        const f = rows.length > 1 ? d.index / (rows.length - 1) : 0;
        const isOpen = !forecast && d.index === lastActual;
        return (
            <g
                key={`m${forecast ? 'f' : 'a'}${d.index}`}
                transform={`translate(${d.cx},${d.cy})`}
                className="pointer-events-none"
            >
                <circle
                    className="c36-pop"
                    data-f={f}
                    r={2.5}
                    fill={forecast ? 'var(--card)' : 'var(--color-margin)'}
                    stroke={forecast ? 'var(--color-margin)' : 'var(--card)'}
                    strokeWidth={1.5}
                />
                {isOpen ? (
                    <g className="c36-land">
                        <circle r={7} fill="var(--color-margin)" fillOpacity={0.16} />
                        {live ? (
                            <circle
                                r={4}
                                fill="var(--color-margin)"
                                className="[transform-box:fill-box] origin-center [animation:rp-c36-ping_2.4s_linear_infinite] motion-reduce:[animation:none]"
                            />
                        ) : null}
                        <text
                            x={-9}
                            y={-9}
                            textAnchor="end"
                            stroke="var(--card)"
                            strokeWidth={3}
                            strokeLinejoin="round"
                            paintOrder="stroke"
                            className="fill-foreground text-xs font-medium tabular-nums"
                        >
                            {r.margin.toFixed(1)}%
                        </text>
                    </g>
                ) : null}
            </g>
        );
    };

    return (
        <SeriesScope config={config} className={className}>
            <style>{KEYFRAMES}</style>
            <Frame ref={frameRef} stacked className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div data-c36-enter="" data-delay={0} className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                        <span
                            data-slot="icon-tile"
                            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 [&_svg]:size-4"
                        >
                            <Icon name="chart-column" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-px">
                            <FrameTitle role="heading" className="truncate">
                                {title}
                            </FrameTitle>
                            <FrameDescription className="truncate">{description}</FrameDescription>
                        </div>
                    </div>
                    <ChartToolbar>
                        {openMonth ? (
                            <span data-c36-enter="" data-delay={40}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-background"
                                    aria-label={live ? 'Live, pause updates' : 'Paused, resume updates'}
                                    aria-pressed={live}
                                    onClick={() => setLive((v) => !v)}
                                >
                                    <span className="relative flex size-1.5 shrink-0">
                                        {live ? (
                                            <span className="absolute -inset-[5px] rounded-full bg-success [animation:rp-c36-ping_2.4s_linear_infinite] motion-reduce:[animation:none]" />
                                        ) : null}
                                        <span
                                            className={`relative size-1.5 rounded-full transition-colors duration-200 ease-[ease] ${live ? 'bg-success' : 'bg-muted-foreground/50'}`}
                                        />
                                    </span>
                                    <span className="grid">
                                        <span
                                            className={`[grid-area:1/1] ${TEXT_TRIM} ${live ? 'visible' : 'invisible'}`}
                                        >
                                            Live
                                        </span>
                                        <span
                                            className={`[grid-area:1/1] ${TEXT_TRIM} ${live ? 'invisible' : 'visible'}`}
                                        >
                                            Paused
                                        </span>
                                    </span>
                                </Button>
                            </span>
                        ) : null}
                        <span data-c36-enter="" data-delay={80}>
                            <SegmentedControl
                                label="Group by"
                                value={group}
                                onValueChange={(v: 'month' | 'quarter') => setGroup(v)}
                                options={[
                                    { value: 'month', label: 'Month' },
                                    { value: 'quarter', label: 'Quarter' },
                                ]}
                                className="bg-muted"
                            />
                        </span>
                        <span data-c36-enter="" data-delay={120}>
                            <ToolbarGroup aria-label="Chart actions">
                                <ToolbarButton icon={<Icon name="refresh-cw" />} label="Sync now" onClick={post} />
                                <ChartMoreMenu
                                    title={title}
                                    csv={{ filename: 'operating-margin.csv', rows, columns: csvColumns }}
                                    summary={summary}
                                    items={[
                                        {
                                            label: 'Copy data',
                                            icon: <Icon name="copy" />,
                                            onSelect: () => copyCsv(rows, csvColumns),
                                        },
                                        { type: 'separator' },
                                        {
                                            label: 'Forecast',
                                            checked: showForecast,
                                            onSelect: () => setShowForecast((v) => !v),
                                        },
                                        {
                                            label: 'Margin target',
                                            checked: showTarget,
                                            onSelect: () => setShowTarget((v) => !v),
                                        },
                                        { type: 'separator' },
                                        {
                                            label: view === 'table' ? 'View as chart' : 'View as table',
                                            icon: <Icon name={view === 'table' ? 'chart-column' : 'table'} />,
                                            onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                        },
                                    ]}
                                />
                            </ToolbarGroup>
                        </span>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel>
                    <dl className="grid grid-cols-2 gap-5 @2xl:-mx-(--frame-panel-px) @2xl:-my-(--frame-panel-py) @2xl:grid-cols-5 @2xl:gap-0">
                        <Kpi
                            label="FY Outlook"
                            text={`${outlook.toFixed(1)}%`}
                            value={outlook}
                            big
                            note={pts(outlook - target)}
                            tone={outlook >= target ? 'up' : 'down'}
                            delay={100}
                        />
                        <Kpi
                            label={`${openRow.label} Margin`}
                            text={`${openRow.margin.toFixed(1)}%`}
                            value={openRow.margin}
                            note={pts(openRow.margin - target)}
                            tone={openRow.margin >= target ? 'up' : 'down'}
                            delay={155}
                        />
                        <Kpi
                            label="Operating Income"
                            text={usd(ytdIncome)}
                            value={ytdIncome}
                            note={`${signed(pct(ytdIncome, lyIncome))} vs last year`}
                            tone={ytdIncome >= lyIncome ? 'up' : 'down'}
                            delay={210}
                        />
                        <Kpi
                            label="Revenue"
                            text={usd(ytdRevenue)}
                            value={ytdRevenue}
                            note={`${signed(pct(ytdRevenue, lastYear.revenue))} vs last year`}
                            tone={ytdRevenue >= lastYear.revenue ? 'up' : 'down'}
                            delay={265}
                        />
                        <Kpi
                            label="Expenses"
                            text={usd(ytdExpenses)}
                            value={ytdExpenses}
                            note={`${signed(pct(ytdExpenses, lastYear.expenses))} vs last year`}
                            tone="neutral"
                            delay={320}
                        />
                    </dl>
                </FramePanel>
                <FramePanel className="flex flex-col gap-4">
                    <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                            <span className="size-2 shrink-0 rounded-full bg-(--color-revenue)" />
                            <span className={TEXT_TRIM}>Revenue</span>
                        </li>
                        <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                            <span className="size-2 shrink-0 rounded-full bg-(--color-expenses)" />
                            <span className={TEXT_TRIM}>Expenses</span>
                        </li>
                        <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                            <MarginSwatch />
                            <span className={TEXT_TRIM}>Operating margin</span>
                        </li>
                        {showTarget ? (
                            <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                <span className="h-px w-3 shrink-0 bg-muted-foreground/70" />
                                <span className={TEXT_TRIM}>Target</span>
                            </li>
                        ) : null}
                    </ul>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="title"
                                indexLabel="Period"
                                series={[
                                    { key: 'revenue', label: 'Revenue' },
                                    { key: 'expenses', label: 'Expenses' },
                                    { key: 'income', label: 'Operating income' },
                                ]}
                                valueFormatter={(v: number) => usd(v)}
                                caption={`${title}, ${description}`}
                            />
                        }
                    >
                        <div ref={chartRef} className="group/c36 h-72 w-full" onMouseLeave={() => setActive(null)}>
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.ComposedChart
                                        data={rows}
                                        margin={{ top: 16, right: 4, bottom: 0, left: 0 }}
                                        barGap={3}
                                        accessibilityLayer
                                        onMouseMove={(s: any) =>
                                            setActive(
                                                s && s.activeTooltipIndex != null ? Number(s.activeTooltipIndex) : null
                                            )
                                        }
                                        onMouseLeave={() => setActive(null)}
                                    >
                                        <defs>
                                            {['revenue', 'expenses'].map((k) => (
                                                <pattern
                                                    key={k}
                                                    id={`rp-c36-hatch-${k}`}
                                                    width="5"
                                                    height="5"
                                                    patternUnits="userSpaceOnUse"
                                                    patternTransform="rotate(45)"
                                                >
                                                    <rect
                                                        width="5"
                                                        height="5"
                                                        fill={`var(--color-${k})`}
                                                        fillOpacity={0.18}
                                                    />
                                                    <line
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="5"
                                                        stroke={`var(--color-${k})`}
                                                        strokeWidth="2"
                                                    />
                                                </pattern>
                                            ))}
                                        </defs>
                                        <R.CartesianGrid vertical={false} strokeDasharray="2 4" />
                                        <R.XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tickMargin={10}
                                            interval={0}
                                        />
                                        <R.YAxis
                                            yAxisId="bars"
                                            width={44}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={12}
                                            domain={[0, barMax]}
                                            ticks={barTicks}
                                            tickFormatter={usdTick}
                                        />
                                        <R.YAxis yAxisId="m" hide domain={[mMin, mMax]} allowDataOverflow />
                                        <R.Tooltip
                                            isAnimationActive={false}
                                            position={{ y: 19 }}
                                            cursor={<CursorBand lib={R} count={rows.length} />}
                                            content={({ active: on, payload }: any) =>
                                                on && payload && payload.length ? (
                                                    <MarginTooltip row={payload[0].payload} />
                                                ) : null
                                            }
                                        />
                                        <R.Bar
                                            yAxisId="bars"
                                            dataKey="revenue"
                                            barSize={14}
                                            isAnimationActive={false}
                                            shape={barShape('revenue')}
                                        />
                                        <R.Bar
                                            yAxisId="bars"
                                            dataKey="expenses"
                                            barSize={14}
                                            isAnimationActive={false}
                                            shape={barShape('expenses')}
                                        />
                                        {mTicks.map((v) => (
                                            <R.ReferenceLine
                                                key={`mt${v}`}
                                                yAxisId="m"
                                                y={v}
                                                stroke="none"
                                                ifOverflow="visible"
                                                label={(p: any) =>
                                                    p && p.viewBox ? (
                                                        <text
                                                            x={p.viewBox.x - 12}
                                                            y={p.viewBox.y}
                                                            dy="0.355em"
                                                            textAnchor="end"
                                                            className="fill-muted-foreground text-xs tabular-nums"
                                                        >
                                                            {v}%
                                                        </text>
                                                    ) : null
                                                }
                                            />
                                        ))}
                                        {showTarget ? (
                                            <R.ReferenceLine
                                                yAxisId="m"
                                                y={target}
                                                stroke="var(--muted-foreground)"
                                                strokeDasharray="4 4"
                                                strokeOpacity={0.7}
                                                ifOverflow="visible"
                                                label={(p: any) =>
                                                    p && p.viewBox ? (
                                                        <text
                                                            x={p.viewBox.x + p.viewBox.width}
                                                            y={p.viewBox.y + 14}
                                                            dy="0.355em"
                                                            textAnchor="end"
                                                            stroke="var(--card)"
                                                            strokeWidth={3}
                                                            paintOrder="stroke"
                                                            className="fill-muted-foreground text-xs tabular-nums"
                                                        >
                                                            Target {target.toFixed(1)}%
                                                        </text>
                                                    ) : null
                                                }
                                            />
                                        ) : null}
                                        {firstForecast > 0 && band ? (
                                            <R.ReferenceLine
                                                yAxisId="bars"
                                                x={rows[firstForecast].label}
                                                ifOverflow="visible"
                                                shape={(p: any) => {
                                                    const x = (p.x1 != null ? p.x1 : 0) - band / 2;
                                                    const top = Math.min(p.y1, p.y2);
                                                    const bottom = Math.max(p.y1, p.y2);
                                                    const y1 = top + LANE_BOTTOM * (bottom - top) + 6.5;
                                                    return (
                                                        <g className="pointer-events-none">
                                                            <line
                                                                x1={x}
                                                                x2={x}
                                                                y1={y1}
                                                                y2={bottom}
                                                                stroke="var(--muted-foreground)"
                                                                strokeDasharray="2 3"
                                                                strokeOpacity={0.4}
                                                            />
                                                            <text
                                                                x={x + 6}
                                                                y={y1 + 6}
                                                                dy="0.355em"
                                                                className="fill-muted-foreground text-xs"
                                                            >
                                                                Forecast
                                                            </text>
                                                        </g>
                                                    );
                                                }}
                                            />
                                        ) : null}
                                        <R.Line
                                            yAxisId="m"
                                            dataKey="marginForecast"
                                            type="monotone"
                                            stroke="var(--color-margin)"
                                            strokeWidth={2}
                                            strokeDasharray="4 4"
                                            className="c36-margin"
                                            isAnimationActive={false}
                                            dot={marginDot(true)}
                                            activeDot={(d: any) =>
                                                d.payload && d.payload.status === 'forecast' ? (
                                                    <circle
                                                        cx={d.cx}
                                                        cy={d.cy}
                                                        r={4}
                                                        fill="var(--color-margin)"
                                                        stroke="var(--card)"
                                                        strokeWidth={2}
                                                    />
                                                ) : (
                                                    <g />
                                                )
                                            }
                                            legendType="none"
                                        />
                                        <R.Line
                                            yAxisId="m"
                                            dataKey="marginActual"
                                            type="monotone"
                                            stroke="var(--color-margin)"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            className="c36-margin"
                                            isAnimationActive={false}
                                            dot={marginDot(false)}
                                            activeDot={(d: any) => (
                                                <circle
                                                    cx={d.cx}
                                                    cy={d.cy}
                                                    r={4}
                                                    fill="var(--color-margin)"
                                                    stroke="var(--card)"
                                                    strokeWidth={2}
                                                />
                                            )}
                                        />
                                    </R.ComposedChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FramePanel>
                    <div data-c36-enter="" data-delay={1300} className="flex h-5 min-w-0 items-center gap-3 text-xs">
                        <span className={`${TEXT_TRIM} shrink-0 font-medium`}>Latest</span>
                        <div className="h-5 min-w-0 flex-1 overflow-hidden">
                            <ul
                                aria-label="Latest entries"
                                aria-live="polite"
                                className="flex flex-wrap items-center gap-x-5 text-xs"
                            >
                                {entries.map((e) => (
                                    <li key={e.id} className="flex h-5 shrink-0 items-center gap-1.5">
                                        <span className="flex size-4 items-center justify-center text-muted-foreground">
                                            <span
                                                className={`size-2 shrink-0 rounded-full ${e.kind === 'revenue' ? 'bg-(--color-revenue)' : 'bg-(--color-expenses)'}`}
                                            />
                                        </span>
                                        <span className={`${TEXT_TRIM} text-muted-foreground`}>{e.label}</span>
                                        <span className={`${TEXT_TRIM} font-medium tabular-nums`}>
                                            +{usd(e.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2 text-foreground">
                        <span
                            className={`size-1.5 rounded-full ${live && openMonth ? 'bg-success' : 'bg-muted-foreground/50'}`}
                        />
                        {live && openMonth ? 'Live' : 'Paused'}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                        {openMonth ? <span>{openMonth.label} open</span> : null}
                        {openMonth ? <MetaDot /> : null}
                        <span>{currency}</span>
                        <MetaDot />
                        <span>{asOfLabel}</span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default OperatingMargin;
