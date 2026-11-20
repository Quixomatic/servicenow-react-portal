import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    ChartToolbar,
    ToolbarGroup,
    ChartMoreMenu,
} from 'components:chart-frame';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation, useElementWidth } from 'components:charts/chart-kit';
import { TEXT_TRIM, StatusBadge, ToggleMenu, MenuSelect, copyCsv } from 'components:charts/composed-kit';
import { MONTHS, OPENING, PRIOR, RESERVE, CASH_IN, CASH_OUT, RANGES } from './data';
import type { CashMonth } from './data';

/**
 * components:charts/cashflow-trend: cash flow over a range in two views. Flows: the cash balance as an
 * area above a dashed reserve floor (low point and closing value marked) over in / out columns around
 * zero with net-flow dots, sharing one hover band. Waterfall: each period's net change floating from
 * the opening balance to a closing column. KPI tiles (closing cash, net flow, gross burn, low point),
 * range / granularity / view menus, a layers menu, a Cash In / Cash Out breakdown and CSV / copy exports.
 *
 *   <CashflowTrend />                                         sample data
 *   <CashflowTrend data={[{ key, label, title, quarter, inflow, outflow }]} opening={{ balance, date }} reserve={1500000} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CashflowTrendProps = {
    title?: string;
    data?: CashMonth[];
    opening?: { balance: number; date: string };
    reserve?: number;
    prior?: { net: number; burn: number };
    cashIn?: { key: string; label: string; share: number }[];
    cashOut?: { key: string; label: string; share: number }[];
    defaultRange?: string;
    defaultView?: 'flows' | 'waterfall';
    className?: string;
};

type Row = {
    key: string;
    label: string;
    title: string;
    inflow: number;
    outflow: number;
    out: number;
    net: number;
    balance: number;
    start: number;
    zero: number;
};

const MINUS = '−';
const LAYERS = ['inflow', 'outflow', 'net', 'balance', 'reserve'];
const IN_SHADES = ['bg-(--color-inflow)', 'bg-(--color-inflow)/60', 'bg-(--color-inflow)/35'];
const OUT_SHADES = ['bg-(--color-outflow)', 'bg-(--color-outflow)/60', 'bg-(--color-outflow)/35'];

/** $538K / $1.66M with a true minus sign. */
function cash(n: number, signed = false) {
    const a = Math.abs(n);
    const body = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}K` : `$${Math.round(a)}`;
    return `${n < 0 ? MINUS : signed && n > 0 ? '+' : ''}${body}`;
}

function cashTick(n: number) {
    const a = Math.abs(n);
    const body =
        a >= 1e6 ? `$${String(Math.round((a / 1e6) * 10) / 10)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}K` : `$${a}`;
    return `${n < 0 ? MINUS : ''}${body}`;
}

function niceStep(raw: number) {
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function roundedPath(x: number, y: number, w: number, h: number, r: number, top: boolean, bottom: boolean) {
    if (h <= 0 || w <= 0) return '';
    const rt = top ? Math.min(r, w / 2, h / (bottom ? 2 : 1)) : 0;
    const rb = bottom ? Math.min(r, w / 2, h / (top ? 2 : 1)) : 0;
    return (
        `M${x},${y + rt}` +
        (rt ? `A${rt},${rt},0,0,1,${x + rt},${y}` : '') +
        `L${x + w - rt},${y}` +
        (rt ? `A${rt},${rt},0,0,1,${x + w},${y + rt}` : '') +
        `L${x + w},${y + h - rb}` +
        (rb ? `A${rb},${rb},0,0,1,${x + w - rb},${y + h}` : '') +
        `L${x + rb},${y + h}` +
        (rb ? `A${rb},${rb},0,0,1,${x},${y + h - rb}` : '') +
        'Z'
    );
}

/** The shared hover band: a full-height muted column (covers the chart margins too). */
function CursorBand({ x, y, width, height, top = 0, bottom = 0 }: any) {
    if (x == null) return null;
    return (
        <rect
            x={x}
            y={y - top}
            width={width}
            height={height + top + bottom}
            className="pointer-events-none fill-muted"
        />
    );
}

function LineSwatch({ cls }: { cls: string }) {
    return <span className={`h-0.5 w-3 shrink-0 rounded-full ${cls}`} />;
}

function Tip({
    title,
    items,
}: {
    title: string;
    items: { key: string; swatch: string; label: string; value: string }[];
}) {
    return (
        <div className="grid w-56 min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="flex w-full flex-col gap-2.5">
                <span className="flex h-6 items-center border-b border-border/50 pb-2 text-xs font-medium">
                    <span className={TEXT_TRIM}>{title}</span>
                </span>
                <ul className="flex flex-col gap-2">
                    {items.map((it) => (
                        <li key={it.key} className="flex h-4 items-center justify-between gap-6">
                            <span className="flex items-center gap-2">
                                <LineSwatch cls={it.swatch} />
                                <span className={`text-muted-foreground ${TEXT_TRIM}`}>{it.label}</span>
                            </span>
                            <span className={`font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>{it.value}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function Kpi({
    label,
    value,
    suffix,
    big,
    badge,
    note,
    className,
}: {
    label: string;
    value: string;
    suffix?: string;
    big?: boolean;
    badge?: { text: string; up: boolean; good: boolean } | null;
    note: string;
    className: string;
}) {
    return (
        <div className={`flex min-w-0 flex-col gap-3 px-(--frame-panel-px) py-(--frame-panel-py) ${className}`}>
            <span className="flex h-5 items-center text-sm text-muted-foreground">
                <span className={TEXT_TRIM}>{label}</span>
            </span>
            <span className={`flex items-center gap-2.5 ${big ? 'h-8' : 'h-7'}`}>
                <span
                    className={`font-semibold tracking-tight tabular-nums ${big ? 'text-3xl' : 'text-xl'} ${TEXT_TRIM}`}
                >
                    {value}
                    {suffix ? (
                        <span className="text-sm font-normal tracking-normal text-muted-foreground">{suffix}</span>
                    ) : null}
                </span>
                {badge ? (
                    <StatusBadge tone={badge.good ? 'success' : 'destructive'}>
                        <Icon name={badge.up ? 'trending-up' : 'trending-down'} />
                        <span className="sr-only">{badge.up ? 'Up' : 'Down'}</span>
                        <span className={TEXT_TRIM}>{badge.text}</span>
                    </StatusBadge>
                ) : null}
            </span>
            <span className="flex h-4 min-w-0 items-center text-xs text-muted-foreground tabular-nums">
                <span className={`${TEXT_TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>{note}</span>
            </span>
        </div>
    );
}

function Breakdown({
    label,
    total,
    items,
    shades,
}: {
    label: string;
    total: number;
    items: { key: string; label: string; share: number }[];
    shades: string[];
}) {
    return (
        <section aria-label={label} className="flex min-w-0 flex-col gap-3">
            <span className="flex h-5 items-center justify-between gap-3 text-sm">
                <span className={`text-muted-foreground ${TEXT_TRIM}`}>{label}</span>
                <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{cash(total)}</span>
            </span>
            <span aria-hidden="true" className="flex h-1.5 gap-1">
                {items.map((it, i) => (
                    <span
                        key={it.key}
                        className={`basis-0 rounded-full ${shades[i] || shades[shades.length - 1]}`}
                        style={{ flexGrow: it.share * total }}
                    />
                ))}
            </span>
            <ul className="flex flex-col gap-2">
                {items.map((it, i) => (
                    <li key={it.key} className="flex h-5 items-center gap-2 text-sm">
                        <span className={`size-2 shrink-0 rounded-full ${shades[i] || shades[shades.length - 1]}`} />
                        <span className={`flex-1 ${TEXT_TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                            {it.label}
                        </span>
                        <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{cash(total * it.share)}</span>
                        <span className={`w-9 text-end text-xs text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                            {Math.round(it.share * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function CashflowTrend({
    title = 'Cash Flow',
    data = MONTHS,
    opening = OPENING,
    reserve = RESERVE,
    prior = PRIOR,
    cashIn = CASH_IN,
    cashOut = CASH_OUT,
    defaultRange = '12m',
    defaultView = 'flows',
    className,
}: CashflowTrendProps) {
    const [range, setRange] = useState(defaultRange);
    const [grain, setGrain] = useState<'monthly' | 'quarterly'>('monthly');
    const [chartView, setChartView] = useState<'flows' | 'waterfall'>(defaultView);
    const [on, setOn] = useState<string[]>(LAYERS);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const show = (k: string) => on.indexOf(k) >= 0;

    const config = useMemo(
        () => ({
            inflow: series('teal-500', 'teal-600', 'Cash In'),
            outflow: series('rose-400', 'rose-500', 'Cash Out'),
            net: series('var(--foreground)', 'var(--foreground)', 'Net Flow'),
            balance: series('violet-500', 'violet-500', 'Cash Balance'),
            rise: series('teal-500', 'teal-600', 'Increase'),
            fall: series('rose-400', 'rose-500', 'Decrease'),
        }),
        []
    );

    // Months with running balances, then the range, then the granularity.
    const all = useMemo(() => {
        let bal = opening.balance;
        return data.map((m) => {
            const start = bal;
            bal += m.inflow - m.outflow;
            return { ...m, start, balance: bal };
        });
    }, [data, opening.balance]);
    const ranged = useMemo(() => {
        const r = RANGES.find((x) => x.value === range) || RANGES[RANGES.length - 1];
        if (r.value === 'ytd') {
            const lastYear = all.length ? all[all.length - 1].key.slice(0, 4) : '';
            return all.filter((m) => m.key.slice(0, 4) === lastYear);
        }
        return all.slice(Math.max(0, all.length - r.months));
    }, [all, range]);
    const rows: Row[] = useMemo(() => {
        const base =
            grain === 'monthly'
                ? ranged.map((m) => ({
                      key: m.key,
                      label: m.label,
                      title: m.title,
                      inflow: m.inflow,
                      outflow: m.outflow,
                      start: m.start,
                      balance: m.balance,
                  }))
                : ranged.reduce((acc: any[], m) => {
                      const last = acc[acc.length - 1];
                      if (last && last.title === m.quarter) {
                          last.inflow += m.inflow;
                          last.outflow += m.outflow;
                          last.balance = m.balance;
                      } else {
                          acc.push({
                              key: m.quarter,
                              label: m.quarter.split(' ')[0],
                              title: m.quarter,
                              inflow: m.inflow,
                              outflow: m.outflow,
                              start: m.start,
                              balance: m.balance,
                          });
                      }
                      return acc;
                  }, []);
        return base.map((r) => ({ ...r, out: -r.outflow, net: r.inflow - r.outflow, zero: 0 }));
    }, [ranged, grain]);

    const n = rows.length;
    const open = rows.length ? rows[0].start : opening.balance;
    const closing = rows.length ? rows[n - 1].balance : opening.balance;
    const totalIn = rows.reduce((s, r) => s + r.inflow, 0);
    const totalOut = rows.reduce((s, r) => s + r.outflow, 0);
    const net = totalIn - totalOut;
    const monthsCount = ranged.length || 1;
    const burn = totalOut / monthsCount;
    const low = ranged.reduce((a, m) => (m.balance < a.balance ? m : a), ranged[0] || { balance: open, title: '' });
    const isFull = range === '12m';
    const firstTitle = ranged.length ? ranged[0].title : '';
    const lastTitle = ranged.length ? ranged[ranged.length - 1].title : '';
    const rangeText =
        firstTitle.split(' ')[1] === lastTitle.split(' ')[1]
            ? `${firstTitle.split(' ')[0]} to ${lastTitle}`
            : `${firstTitle} to ${lastTitle}`;
    const openDate =
        ranged.length && ranged[0].key === data[0].key
            ? opening.date
            : `${firstTitle.split(' ')[0]} 1, ${firstTitle.split(' ')[1]}`;

    // Flows scales.
    const balances = rows.map((r) => r.balance);
    const bLo = Math.min(reserve, ...balances);
    const bHi = Math.max(...balances);
    const bSpan = bHi - bLo || 1;
    const bDomain = [bLo - bSpan * 0.18, bHi + bSpan * 0.31];
    const t1 = Math.round((reserve + bSpan * 0.6) / 1e5) * 1e5;
    const t2 = Math.round((t1 + bSpan * 0.6) / 1e5) * 1e5;
    const bTicks = [t1, t2].filter((t) => t <= bDomain[1]);
    const fMax = Math.max(...rows.map((r) => Math.max(r.inflow, r.outflow)));
    const fStep = niceStep(fMax / 2);
    const fTicks = [-2 * fStep, -fStep, 0, fStep, 2 * fStep];
    const lowIdx = rows.reduce((a, r, i) => (r.balance < rows[a].balance ? i : a), 0);

    // Waterfall rows (relative to the range's opening balance) + the closing column.
    const wf = rows
        .map((r) => ({ ...r, wf: [r.start - open, r.balance - open], kind: r.net >= 0 ? 'rise' : 'fall' }))
        .concat([
            {
                key: 'close',
                label: 'Close',
                title: `Closing, ${lastTitle}`,
                inflow: totalIn,
                outflow: totalOut,
                out: -totalOut,
                net,
                balance: closing,
                start: open,
                zero: 0,
                wf: [0, closing - open],
                kind: 'close',
            } as any,
        ]);
    const wMax = Math.max(Math.abs(reserve - open), ...wf.map((r) => Math.max(Math.abs(r.wf[0]), Math.abs(r.wf[1]))));
    const wStep = niceStep(wMax / 2);
    const wTicks = [-2 * wStep, -wStep, 0, wStep, 2 * wStep];
    const minIdx = rows.reduce((a, r, i) => (r.net < rows[a].net ? i : a), 0);
    const maxIdx = rows.reduce((a, r, i) => (r.net > rows[a].net ? i : a), 0);

    const topRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const wfRef = useRef<HTMLDivElement>(null);
    const plotRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(plotRef);
    const plotW = Math.max(0, (width || 0) - 64 - 8);
    const deps = [range, grain, chartView, view];
    useEnterAnimation(
        topRef,
        [
            {
                selector: '.c21-wipe',
                keyframes: { clipPath: ['inset(0px 100% 0px 0px)', 'inset(0px 0px 0px 0px)'] },
                duration: 0.288,
                delay: 0.08,
            },
            { selector: '.c21-fade', keyframes: { opacity: [0, 1] }, duration: 0.2, delay: 0.456 },
        ],
        deps
    );
    useEnterAnimation(
        bottomRef,
        [
            {
                selector: '.c21-in',
                keyframes: { clipPath: ['inset(100% 0px 0px 0px)', 'inset(0px 0px 0px 0px)'] },
                duration: 0.32,
                delay: (i) => i * 0.024,
            },
            {
                selector: '.c21-out',
                keyframes: { clipPath: ['inset(0px 0px 100% 0px)', 'inset(0px 0px 0px 0px)'] },
                duration: 0.32,
                delay: (i) => i * 0.024,
            },
            { selector: '.c21-fade', keyframes: { opacity: [0, 1] }, duration: 0.2, delay: 0.456 },
        ],
        deps
    );
    useEnterAnimation(
        wfRef,
        [
            {
                selector: '.c21-wf',
                keyframes: { clipPath: ['inset(100% 0px 0px 0px)', 'inset(0px 0px 0px 0px)'] },
                duration: 0.32,
                delay: (i) => i * 0.024,
            },
            { selector: '.c21-fade', keyframes: { opacity: [0, 1] }, duration: 0.2, delay: 0.456 },
        ],
        deps
    );

    const toggle = (k: string, v: boolean) => setOn((cur) => (v ? cur.concat(k) : cur.filter((x) => x !== k)));
    const reset = () => {
        setRange(defaultRange);
        setGrain('monthly');
        setChartView(defaultView);
        setOn(LAYERS);
        setView('chart');
    };
    const csvColumns = [
        { key: 'title', label: 'Period' },
        { key: 'inflow', label: 'Cash in' },
        { key: 'outflow', label: 'Cash out' },
        { key: 'net', label: 'Net flow' },
        { key: 'balance', label: 'Cash balance' },
    ];
    const summary = `${title}, ${rangeText}: closing cash ${cash(closing)} from ${cash(open)}, net flow ${cash(net, true)} (${cash(totalIn)} in, ${cash(totalOut)} out). Gross burn ${cash(burn)} a month, ${(closing / (burn || 1)).toFixed(1)} months of cash cover. Low point ${cash(low.balance)} in ${low.title}, ${cash(low.balance - reserve)} over the ${cashTick(reserve)} reserve.`;
    const tickLabel = (t: any) => (
        <text
            x={t.x}
            y={t.y}
            dy="0.71em"
            textAnchor="middle"
            className={
                t.index === (chartView === 'waterfall' ? n : n - 1)
                    ? 'fill-foreground font-medium'
                    : 'fill-muted-foreground'
            }
        >
            {t.payload.value}
        </text>
    );
    const reserveLabel = (dy: number) => (p: any) =>
        p && p.viewBox ? (
            <text
                x={p.viewBox.x + p.viewBox.width - 5}
                y={p.viewBox.y + dy}
                textAnchor="end"
                fill="var(--muted-foreground)"
            >
                {`Reserve ${cashTick(reserve)}`}
            </text>
        ) : null;

    const legend =
        chartView === 'flows'
            ? [
                  show('inflow') && {
                      key: 'inflow',
                      sw: <span className="size-2 shrink-0 bg-(--color-inflow)" />,
                      label: 'Cash In',
                  },
                  show('outflow') && {
                      key: 'outflow',
                      sw: <span className="size-2 shrink-0 bg-(--color-outflow)" />,
                      label: 'Cash Out',
                  },
                  show('net') && {
                      key: 'net',
                      sw: <span className="size-2 shrink-0 rounded-full bg-(--color-net)" />,
                      label: 'Net Flow',
                  },
                  show('balance') && {
                      key: 'balance',
                      sw: <LineSwatch cls="bg-(--color-balance)" />,
                      label: 'Cash Balance',
                  },
                  show('reserve') && {
                      key: 'reserve',
                      sw: <span className="w-3 shrink-0 border-t border-dashed border-muted-foreground" />,
                      label: `Reserve ${cashTick(reserve)}`,
                  },
              ]
            : [
                  { key: 'rise', sw: <span className="size-2 shrink-0 bg-(--color-rise)" />, label: 'Increase' },
                  { key: 'fall', sw: <span className="size-2 shrink-0 bg-(--color-fall)" />, label: 'Decrease' },
                  { key: 'close', sw: <span className="size-2 shrink-0 bg-(--color-balance)" />, label: 'Net Change' },
                  { key: 'open', sw: <LineSwatch cls="bg-muted-foreground" />, label: `Opening ${cash(open)}` },
                  show('reserve') && {
                      key: 'reserve',
                      sw: <span className="w-3 shrink-0 border-t border-dashed border-muted-foreground" />,
                      label: `Reserve ${cashTick(reserve)}`,
                  },
              ];

    const flowTip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const r: Row = payload[0].payload;
        return (
            <Tip
                title={r.title}
                items={[
                    { key: 'in', swatch: 'bg-(--color-inflow)', label: 'Cash In', value: cash(r.inflow) },
                    { key: 'out', swatch: 'bg-(--color-outflow)', label: 'Cash Out', value: cash(-r.outflow) },
                    { key: 'net', swatch: 'bg-(--color-net)', label: 'Net Flow', value: cash(r.net, true) },
                    { key: 'bal', swatch: 'bg-(--color-balance)', label: 'Cash Balance', value: cash(r.balance) },
                ]}
            />
        );
    };
    const wfTip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const r: any = payload[0].payload;
        return (
            <Tip
                title={r.title}
                items={[
                    { key: 'open', swatch: 'bg-(--color-balance)', label: 'Opening', value: cash(r.start) },
                    {
                        key: 'net',
                        swatch: r.net >= 0 ? 'bg-(--color-rise)' : 'bg-(--color-fall)',
                        label: 'Net Change',
                        value: cash(r.net, true),
                    },
                    { key: 'close', swatch: 'bg-(--color-balance)', label: 'Closing', value: cash(r.balance) },
                ]}
            />
        );
    };

    const flows = (
        <div className="flex h-76 w-full flex-col">
            <div ref={topRef} className={`h-24 w-full ${show('balance') || show('reserve') ? '' : 'hidden'}`}>
                <ChartContainer config={config} className="aspect-auto h-full w-full">
                    {(R: any) => (
                        <R.ComposedChart data={rows} syncId="rp-c21" margin={{ top: 8, right: 8, bottom: 12, left: 0 }}>
                            <R.CartesianGrid vertical={false} stroke="var(--border)" />
                            <R.XAxis dataKey="label" hide />
                            <R.YAxis
                                width={64}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={14}
                                domain={bDomain}
                                ticks={bTicks}
                                tickFormatter={cashTick}
                                allowDataOverflow
                            />
                            <R.Tooltip
                                isAnimationActive={false}
                                cursor={<CursorBand top={8} bottom={12} />}
                                content={() => null}
                            />
                            <R.Bar dataKey="zero" fill="none" isAnimationActive={false} legendType="none" />
                            {show('balance') ? (
                                <R.Area
                                    dataKey="balance"
                                    type="monotone"
                                    baseValue={reserve}
                                    className="c21-wipe c21-balance"
                                    stroke="var(--color-balance)"
                                    strokeWidth={2}
                                    fill="var(--color-balance)"
                                    fillOpacity={0.1}
                                    isAnimationActive={false}
                                    activeDot={false}
                                    dot={(d: any) =>
                                        d.index === lowIdx || d.index === n - 1 ? (
                                            <g key={`b${d.index}`} className="c21-fade pointer-events-none">
                                                <circle
                                                    cx={d.cx}
                                                    cy={d.cy}
                                                    r={5}
                                                    fill="var(--color-balance)"
                                                    stroke="var(--frame-panel-bg)"
                                                    strokeWidth={2}
                                                />
                                                {d.index === n - 1 ? (
                                                    <text
                                                        x={d.cx - 10}
                                                        y={d.cy - 9}
                                                        textAnchor="end"
                                                        className="fill-foreground font-medium tabular-nums"
                                                    >
                                                        {cash(closing)}
                                                    </text>
                                                ) : (
                                                    <text
                                                        x={d.cx}
                                                        y={d.cy - 11}
                                                        textAnchor="middle"
                                                        className="fill-muted-foreground tabular-nums"
                                                    >
                                                        Low
                                                    </text>
                                                )}
                                            </g>
                                        ) : (
                                            <g key={`b${d.index}`} />
                                        )
                                    }
                                />
                            ) : null}
                            {show('reserve') ? (
                                <R.ReferenceLine
                                    y={reserve}
                                    stroke="var(--muted-foreground)"
                                    strokeDasharray="4 4"
                                    label={reserveLabel(-5)}
                                />
                            ) : null}
                        </R.ComposedChart>
                    )}
                </ChartContainer>
            </div>
            <div ref={bottomRef} className="min-h-0 w-full flex-1">
                <ChartContainer config={config} className="aspect-auto h-full w-full">
                    {(R: any) => (
                        <R.ComposedChart
                            data={rows}
                            syncId="rp-c21"
                            stackOffset="sign"
                            margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
                            accessibilityLayer
                        >
                            <R.CartesianGrid vertical={false} stroke="var(--border)" />
                            <R.XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                                interval={0}
                                tick={tickLabel}
                            />
                            <R.YAxis
                                width={64}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={14}
                                domain={[fTicks[0], fTicks[4]]}
                                ticks={fTicks}
                                tickFormatter={cashTick}
                            />
                            <R.Tooltip
                                isAnimationActive={false}
                                cursor={<CursorBand top={12} bottom={30} />}
                                content={flowTip}
                            />
                            <R.ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
                            <R.Bar
                                dataKey={show('inflow') ? 'inflow' : 'zero'}
                                stackId="flow"
                                barSize={16}
                                isAnimationActive={false}
                                shape={(p: any) =>
                                    p.height > 1 ? (
                                        <g className="c21-in">
                                            <path
                                                d={roundedPath(p.x, p.y, p.width, p.height - 1, 4, true, false)}
                                                fill="var(--color-inflow)"
                                            />
                                        </g>
                                    ) : (
                                        <g />
                                    )
                                }
                            />
                            <R.Bar
                                dataKey={show('outflow') ? 'out' : 'zero'}
                                stackId="flow"
                                barSize={16}
                                isAnimationActive={false}
                                shape={(p: any) => {
                                    const y = Math.min(p.y, p.y + p.height);
                                    const h = Math.abs(p.height);
                                    return h > 1 ? (
                                        <g className="c21-out">
                                            <path
                                                d={roundedPath(p.x, y + 1, p.width, h - 1, 4, false, true)}
                                                fill="var(--color-outflow)"
                                            />
                                        </g>
                                    ) : (
                                        <g />
                                    );
                                }}
                            />
                            {show('net') ? (
                                <R.Line
                                    dataKey="net"
                                    stroke="none"
                                    isAnimationActive={false}
                                    activeDot={false}
                                    dot={(d: any) => (
                                        <g key={`n${d.index}`} className="c21-fade c21-net pointer-events-none">
                                            <circle
                                                cx={d.cx}
                                                cy={d.cy}
                                                r={5}
                                                fill="var(--color-net)"
                                                stroke="var(--frame-panel-bg)"
                                                strokeWidth={2}
                                            />
                                        </g>
                                    )}
                                />
                            ) : null}
                        </R.ComposedChart>
                    )}
                </ChartContainer>
            </div>
        </div>
    );

    const band = wf.length ? plotW / wf.length : 0;
    const waterfall = (
        <div ref={wfRef} className="h-76 w-full">
            <ChartContainer config={config} className="aspect-auto h-full w-full">
                {(R: any) => (
                    <R.ComposedChart data={wf} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
                        <R.CartesianGrid vertical={false} stroke="var(--border)" />
                        <R.XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tickMargin={10}
                            interval={0}
                            tick={tickLabel}
                        />
                        <R.YAxis
                            width={64}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={14}
                            domain={[wTicks[0], wTicks[4]]}
                            ticks={wTicks}
                            tick={(t: any) => (
                                <text
                                    x={t.x}
                                    y={t.y}
                                    dy="0.355em"
                                    textAnchor="end"
                                    className={
                                        t.payload.value === 0 ? 'fill-foreground font-medium' : 'fill-muted-foreground'
                                    }
                                >
                                    {t.payload.value === 0 ? cash(open) : cash(t.payload.value, true)}
                                </text>
                            )}
                        />
                        <R.Tooltip
                            isAnimationActive={false}
                            cursor={<CursorBand top={12} bottom={30} />}
                            content={wfTip}
                        />
                        <R.ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.7} />
                        {show('reserve') ? (
                            <R.ReferenceLine
                                y={reserve - open}
                                stroke="var(--muted-foreground)"
                                strokeDasharray="4 4"
                                label={reserveLabel(-5)}
                            />
                        ) : null}
                        <R.Bar
                            dataKey="wf"
                            barSize={24}
                            isAnimationActive={false}
                            shape={(p: any) => {
                                const r: any = p.payload;
                                const y = Math.min(p.y, p.y + p.height);
                                const h = Math.max(2, Math.abs(p.height));
                                const fill =
                                    r.kind === 'close'
                                        ? 'var(--color-balance)'
                                        : r.kind === 'rise'
                                          ? 'var(--color-rise)'
                                          : 'var(--color-fall)';
                                const endY = r.kind === 'fall' ? y + h : y;
                                const i = p.index;
                                return (
                                    <g>
                                        {r.kind !== 'close' && band ? (
                                            <line
                                                x1={p.x + p.width}
                                                x2={p.x + band}
                                                y1={endY}
                                                y2={endY}
                                                stroke="var(--muted-foreground)"
                                                strokeOpacity={0.5}
                                                className="c21-fade"
                                            />
                                        ) : null}
                                        <g className="c21-wf">
                                            <path d={roundedPath(p.x, y, p.width, h, 3, true, true)} fill={fill} />
                                        </g>
                                        {r.kind === 'close' ? (
                                            <text
                                                x={p.x + p.width / 2}
                                                y={y - 8}
                                                textAnchor="middle"
                                                className="c21-fade fill-foreground font-medium tabular-nums"
                                            >
                                                {cash(closing)}
                                            </text>
                                        ) : null}
                                        {r.kind !== 'close' && i === minIdx && r.net < 0 ? (
                                            <text
                                                x={p.x + p.width / 2}
                                                y={y + h + 16}
                                                textAnchor="middle"
                                                className="c21-fade fill-muted-foreground tabular-nums"
                                            >
                                                {cash(r.net, true)}
                                            </text>
                                        ) : null}
                                        {r.kind !== 'close' && i === maxIdx && r.net > 0 ? (
                                            <text
                                                x={p.x + p.width / 2}
                                                y={y - 8}
                                                textAnchor="middle"
                                                className="c21-fade fill-muted-foreground tabular-nums"
                                            >
                                                {cash(r.net, true)}
                                            </text>
                                        ) : null}
                                    </g>
                                );
                            }}
                        />
                    </R.ComposedChart>
                )}
            </ChartContainer>
        </div>
    );

    const netDelta = net - prior.net;
    const burnDelta = prior.burn ? (burn / prior.burn - 1) * 100 : 0;
    const openDelta = open ? (closing / open - 1) * 100 : 0;

    return (
        <SeriesScope config={config} className={className}>
            <Frame stacked className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription className="truncate tabular-nums">{rangeText}</FrameDescription>
                    </div>
                    <ChartToolbar>
                        <ToolbarGroup aria-label="Cash flow scope">
                            <MenuSelect
                                label="Range"
                                value={range}
                                onValueChange={setRange}
                                icon={<Icon name="history" />}
                                options={RANGES.map((r) => {
                                    const months =
                                        r.value === 'ytd'
                                            ? all.filter(
                                                  (m) => m.key.slice(0, 4) === all[all.length - 1].key.slice(0, 4)
                                              )
                                            : all.slice(Math.max(0, all.length - r.months));
                                    const a = months.length ? months[0].title : '';
                                    const b = months.length ? months[months.length - 1].title : '';
                                    return {
                                        value: r.value,
                                        label: r.label,
                                        short: r.short,
                                        description:
                                            a.split(' ')[1] === b.split(' ')[1]
                                                ? `${a.split(' ')[0]} to ${b}`
                                                : `${a} to ${b}`,
                                    };
                                })}
                            />
                            <MenuSelect
                                label="Granularity"
                                value={grain}
                                onValueChange={(v) => setGrain(v as any)}
                                icon={<Icon name="columns-3" />}
                                options={[
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'quarterly', label: 'Quarterly' },
                                ]}
                            />
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Chart view">
                            <MenuSelect
                                label="Chart View"
                                value={chartView}
                                onValueChange={(v) => setChartView(v as any)}
                                icon={<Icon name={chartView === 'flows' ? 'arrow-up-down' : 'chart-column'} />}
                                options={[
                                    { value: 'flows', label: 'Flows', description: 'In, out and balance' },
                                    { value: 'waterfall', label: 'Waterfall', description: 'Opening to closing' },
                                ]}
                            />
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Chart actions">
                            <ToggleMenu
                                label="Display options"
                                icon={<Icon name="settings-2" />}
                                groups={[
                                    {
                                        label: 'Layers',
                                        items: [
                                            { key: 'inflow', label: 'Cash In' },
                                            { key: 'outflow', label: 'Cash Out' },
                                            { key: 'net', label: 'Net Flow' },
                                            { key: 'balance', label: 'Cash Balance' },
                                            { key: 'reserve', label: 'Reserve Floor' },
                                        ],
                                    },
                                ]}
                                value={on}
                                onToggle={toggle}
                            />
                            <ChartMoreMenu
                                title={title}
                                csv={{ filename: 'cash-flow.csv', rows, columns: csvColumns }}
                                summary={summary}
                                items={[
                                    {
                                        label: 'Copy as table',
                                        icon: <Icon name="copy" />,
                                        onSelect: () => copyCsv(rows, csvColumns),
                                    },
                                    { type: 'separator' },
                                    {
                                        label: view === 'table' ? 'View as chart' : 'View as table',
                                        icon: <Icon name={view === 'table' ? 'chart-column' : 'table'} />,
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                    { label: 'Reset view', icon: <Icon name="rotate-ccw" />, onSelect: reset },
                                ]}
                            />
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="p-0">
                    <div className="grid @xl:grid-cols-3 @4xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
                        <Kpi
                            label="Closing Cash"
                            value={cash(closing)}
                            big
                            badge={{
                                text: `${openDelta >= 0 ? '+' : MINUS}${Math.abs(openDelta).toFixed(1)}%`,
                                up: openDelta >= 0,
                                good: openDelta >= 0,
                            }}
                            note={`From ${cash(open)} on ${openDate}`}
                            className="border-b @xl:col-span-3 @4xl:col-span-1 @4xl:border-e @4xl:border-b-0"
                        />
                        <Kpi
                            label="Net Cash Flow"
                            value={cash(net, true)}
                            badge={
                                isFull ? { text: cash(netDelta, true), up: netDelta >= 0, good: netDelta >= 0 } : null
                            }
                            note={
                                isFull
                                    ? `${cash(prior.net)} in the prior 12 months`
                                    : `${cash(totalIn)} in, ${cash(totalOut)} out`
                            }
                            className="border-b @xl:border-e @xl:border-b-0"
                        />
                        <Kpi
                            label="Gross Burn"
                            value={cash(burn)}
                            suffix="/mo"
                            badge={
                                isFull
                                    ? {
                                          text: `${burnDelta >= 0 ? '+' : MINUS}${Math.abs(burnDelta).toFixed(1)}%`,
                                          up: burnDelta >= 0,
                                          good: burnDelta <= 0,
                                      }
                                    : null
                            }
                            note={`${(closing / (burn || 1)).toFixed(1)} months of cash cover`}
                            className="border-b @xl:border-e @xl:border-b-0"
                        />
                        <Kpi
                            label="Low Point"
                            value={cash(low.balance)}
                            note={`${low.title}, ${cash(low.balance - reserve)} ${low.balance >= reserve ? 'over' : 'under'} reserve`}
                            className=""
                        />
                    </div>
                </FramePanel>
                <FramePanel>
                    <div ref={plotRef} className="flex flex-col gap-4">
                        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            {legend.filter(Boolean).map((it: any) => (
                                <li key={it.key} className="flex h-4 items-center gap-1.5">
                                    {it.sw}
                                    <span className={TEXT_TRIM}>{it.label}</span>
                                </li>
                            ))}
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
                                        { key: 'inflow', label: 'Cash in' },
                                        { key: 'outflow', label: 'Cash out' },
                                        { key: 'net', label: 'Net flow' },
                                        { key: 'balance', label: 'Cash balance' },
                                    ]}
                                    valueFormatter={(v: number) => cash(v)}
                                    caption={`${title}, ${rangeText}`}
                                />
                            }
                        >
                            {chartView === 'flows' ? flows : waterfall}
                        </ChartFigure>
                    </div>
                </FramePanel>
                <FramePanel>
                    <div className="grid gap-x-10 gap-y-6 @3xl:grid-cols-2">
                        <Breakdown label="Cash In" total={totalIn} items={cashIn} shades={IN_SHADES} />
                        <Breakdown label="Cash Out" total={totalOut} items={cashOut} shades={OUT_SHADES} />
                    </div>
                </FramePanel>
            </Frame>
        </SeriesScope>
    );
}

export default CashflowTrend;
