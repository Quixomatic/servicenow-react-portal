import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { series, tw, SeriesScope, useEnterAnimation, useElementWidth, useReplayKey } from 'components:charts/chart-kit';
import {
    TEXT_TRIM,
    StatusBadge,
    TipRow,
    TipSection,
    MetaDot,
    copyCsv,
    BelowBars,
} from 'components:charts/composed-kit';
import { ASSETS, DAYS, TVL_CLOSE, RANGES } from './data';
import type { Asset, FlowDay, FlowRange } from './data';

/**
 * components:charts/liquidity-flows: a lending pool's flows. Supply stacked by asset above zero, withdrawals
 * below, and the pool's TVL as a lane above the columns (a soft gradient line ending in a labelled dot). Range
 * toggle (30D daily / 90D weekly / 1Y monthly), an asset filter with presets, a Show menu (withdrawals, TVL
 * line, gridlines), CSV / copy exports, KPI tiles (supplied, withdrawn, net flow, peak day) and a sync footer.
 *
 *   <LiquidityFlows />                                                      sample data
 *   <LiquidityFlows assets={[{ key, label, light, dark, stable }]} days={[{ date, supply: {..}, out: {..} }]}
 *       tvlClose={{ usdc: 1.09e9, .. }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type LiquidityFlowsProps = {
    title?: string;
    description?: string;
    assets?: Asset[];
    /** Daily rows, oldest first; the last one is the "as of" day. */
    days?: FlowDay[];
    /** TVL by asset at the close of the last day. */
    tvlClose?: Record<string, number>;
    ranges?: FlowRange[];
    defaultRange?: string;
    /** Footer note on the left, after the asset count. */
    basis?: string;
    className?: string;
};

type Row = {
    key: string;
    label: string;
    title: string;
    withdrawn: number;
    supplied: number;
    net: number;
    tvl: number;
    [asset: string]: any;
};

const CHART_H = 288;
const TOP = 8;
const AXIS_W = 60;
const RIGHT = 4;
const X_AXIS_H = 30;
const PLOT_H = CHART_H - TOP - X_AXIS_H;
const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const TIP_W = 176;
const SHOW = ['withdrawals', 'tvl', 'grid'];
const TIP_KEYFRAMES = '@keyframes rp-lf-tip { from { opacity: 0; transform: scale(0.97); } }';

/** $6.2M / -$46.2M / $2.48B. */
function usdM(n: number, signed = false) {
    const a = Math.abs(n);
    const big = a >= 1e9;
    const body = big ? `$${(a / 1e9).toFixed(2)}B` : `$${(a / 1e6).toFixed(1)}M`;
    const shown = big ? Math.round(a / 1e7) : Math.round(a / 1e5);
    if (!shown) return body;
    return `${n < 0 ? '-' : signed ? '+' : ''}${body}`;
}

/** Axis ticks: 0 / $50M / -$750M / $1.5B. */
function tick(n: number) {
    if (!n) return '0';
    const a = Math.abs(n);
    const trim = (v: number) => String(Math.round(v * 100) / 100);
    return `${n < 0 ? '-' : ''}$${a >= 1e9 ? `${trim(a / 1e9)}B` : `${trim(a / 1e6)}M`}`;
}

function niceCeil(v: number) {
    if (!(v > 0)) return 1e6;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    const steps = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
    return (steps.find((s) => s >= n - 1e-9) || 10) * mag;
}

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => utc(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
const monthDay = (d: string) => fmt(d, { month: 'short', day: 'numeric' });

function roundedPath(x: number, y: number, w: number, h: number, r: number, top: boolean, bottom: boolean) {
    if (h <= 0 || w <= 0) return '';
    const rr = Math.min(r, w / 2, h / 2);
    const rt = top ? rr : 0;
    const rb = bottom ? rr : 0;
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

/** A monotone-in-x cubic through the points (the same shape as Recharts' "monotone" curve). */
function monotonePath(pts: { x: number; y: number }[]) {
    const n = pts.length;
    if (!n) return '';
    if (n === 1) return `M${pts[0].x},${pts[0].y}`;
    const dx: number[] = [];
    const m: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx.push(pts[i + 1].x - pts[i].x);
        m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
    }
    const t: number[] = [m[0]];
    for (let i = 1; i < n - 1; i++) {
        if (m[i - 1] * m[i] <= 0) t.push(0);
        else {
            const a = (dx[i - 1] + 2 * dx[i]) / (3 * (dx[i - 1] + dx[i]));
            t.push(1 / (a / m[i - 1] + (1 - a) / m[i]));
        }
    }
    t.push(m[n - 2]);
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += `C${pts[i].x + h},${pts[i].y + t[i] * h},${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h},${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
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
    const band = p.width / Math.max(1, p.count || 1);
    return (
        <BelowBars lib={p.lib}>
            <path
                d={roundedPath(p.points[0].x - band / 2, TOP, band, PLOT_H, 4, true, true)}
                className="pointer-events-none fill-muted"
            />
        </BelowBars>
    );
}

function LineDotSwatch() {
    return (
        <span aria-hidden="true" className="flex shrink-0 items-center">
            <span className="h-0.5 w-2.5 rounded-full bg-(--color-tvl)" />
            <span className="-ms-0.5 size-1.5 rounded-full bg-(--color-tvl)" />
        </span>
    );
}

function Swatch({ k }: { k: string }) {
    return (
        <span className="flex size-4 shrink-0 items-center justify-center">
            <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--color-${k})` }}
            />
        </span>
    );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
    return (
        <div className="flex min-w-0 flex-col gap-2 @2xl:px-(--frame-panel-px) @2xl:py-(--frame-panel-py) @2xl:not-first:border-s">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
                <span className="flex h-5 min-w-0 items-center text-xs text-muted-foreground">
                    <span className="flex h-4 items-center tabular-nums">
                        <span className={TEXT_TRIM}>{note}</span>
                    </span>
                </span>
            </dd>
        </div>
    );
}

export function LiquidityFlows({
    title = 'Liquidity Flows',
    description = 'Pool supply and withdrawals',
    assets = ASSETS,
    days = DAYS,
    tvlClose = TVL_CLOSE,
    ranges = RANGES,
    defaultRange = '30d',
    basis = 'USD at daily close',
    className = '',
}: LiquidityFlowsProps) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const [range, setRange] = useState(defaultRange);
    const [selected, setSelected] = useState<string[]>(() => assets.map((a) => a.key));
    const [show, setShow] = useState<string[]>(SHOW);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [active, setActive] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [synced, setSynced] = useState('Synced 2 min ago');
    const [replay, doReplay] = useReplayKey();
    const plotRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(plotRef);
    const on = (k: string) => show.indexOf(k) >= 0;

    const config = useMemo(() => {
        const c: Record<string, any> = {};
        assets.forEach((a) => {
            c[a.key] = series(a.light, a.dark, a.label);
        });
        c.withdrawn = {
            label: 'Withdrawn',
            theme: {
                light: `color-mix(in oklab, ${tw('rose-500')} 60%, var(--background))`,
                dark: `color-mix(in oklab, ${tw('rose-400')} 70%, var(--background))`,
            },
        };
        c.tvl = series('neutral-900', 'neutral-200', 'TVL');
        return c;
    }, [assets]);

    const rng = ranges.find((r) => r.value === range) || ranges[0];
    const sel = assets.filter((a) => selected.indexOf(a.key) >= 0);
    const selKeys = sel.map((a) => a.key);

    // Daily totals for the selection, with TVL rolled back from the close.
    const daily = useMemo(() => {
        const list = days.map((d) => {
            let supplied = 0;
            let withdrawn = 0;
            selKeys.forEach((k) => {
                supplied += d.supply[k] || 0;
                withdrawn += d.out[k] || 0;
            });
            return { day: d, supplied, withdrawn, net: supplied - withdrawn, tvl: 0 };
        });
        let tvl = selKeys.reduce((s, k) => s + (tvlClose[k] || 0), 0);
        for (let i = list.length - 1; i >= 0; i--) {
            list[i].tvl = tvl;
            tvl -= list[i].net;
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days, tvlClose, selKeys.join(',')]);

    const span = useMemo(() => daily.slice(Math.max(0, daily.length - rng.days)), [daily, rng.days]);
    const rows: Row[] = useMemo(() => {
        const groups: (typeof span)[] = [];
        span.forEach((d, i) => {
            const key =
                rng.bucket === 'day'
                    ? String(i)
                    : rng.bucket === 'week'
                      ? String(Math.floor(i / 7))
                      : d.day.date.slice(0, 7);
            const last = groups[groups.length - 1];
            if (last && (last as any).key === key) last.push(d);
            else {
                const g: any = [d];
                g.key = key;
                groups.push(g);
            }
        });
        return groups.map((g, i) => {
            const first = g[0].day.date;
            const lastD = g[g.length - 1].day.date;
            const row: Row = {
                key: `${first}`,
                label: rng.bucket === 'month' ? fmt(first, { month: 'short' }) : monthDay(first),
                title:
                    rng.bucket === 'day'
                        ? fmt(first, { weekday: 'short', month: 'short', day: 'numeric' })
                        : rng.bucket === 'week'
                          ? `${monthDay(first)} to ${monthDay(lastD)}`
                          : fmt(first, { month: 'long', year: 'numeric' }),
                withdrawn: 0,
                supplied: 0,
                net: 0,
                tvl: g[g.length - 1].tvl,
                i,
            };
            assets.forEach((a) => {
                row[a.key] = 0;
            });
            g.forEach((d) => {
                selKeys.forEach((k) => {
                    row[k] += d.day.supply[k] || 0;
                });
                row.withdrawn -= d.withdrawn;
                row.supplied += d.supplied;
                row.net += d.net;
            });
            return row;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [span, rng.bucket, assets]);

    // Header + KPIs.
    const n = rows.length;
    const tvlEnd = span.length ? span[span.length - 1].tvl : 0;
    const totalNet = span.reduce((s, d) => s + d.net, 0);
    const tvlOpen = tvlEnd - totalNet;
    const tvlDelta = tvlOpen ? (tvlEnd / tvlOpen - 1) * 100 : 0;
    const supplied = span.reduce((s, d) => s + d.supplied, 0);
    const withdrawn = span.reduce((s, d) => s + d.withdrawn, 0);
    const upDays = span.filter((d) => d.net > 0).length;
    const peak = span.reduce((a, d) => (!a || d.net > a.net ? d : a), null as any);
    const since = span.length ? monthDay(span[0].day.date) : '';
    const allSupply = days.slice(Math.max(0, days.length - rng.days));
    const shareTotal = allSupply.reduce((s, d) => s + assets.reduce((t, a) => t + (d.supply[a.key] || 0), 0), 0);
    const share = (k: string) =>
        shareTotal ? (allSupply.reduce((s, d) => s + (d.supply[k] || 0), 0) / shareTotal) * 100 : 0;
    const asOf = days.length
        ? fmt(days[days.length - 1].date, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '';

    // Scales (fixed pixel layout: the TVL lane takes the 65px above the top tick).
    const maxUp = Math.max(0, ...rows.map((r) => selKeys.reduce((s, k) => s + r[k], 0)));
    const maxDown = on('withdrawals') ? Math.max(0, ...rows.map((r) => -r.withdrawn)) : 0;
    const M = niceCeil(Math.max(maxUp, maxDown));
    const yTop = M * (1 + 130 / 185);
    const ticks = [-M, -M / 2, 0, M / 2, M];
    const yOf = (v: number) => TOP + (PLOT_H * (yTop - v)) / (yTop + M);
    const zeroY = yOf(0);
    const plotW = Math.max(0, (width || 0) - AXIS_W - RIGHT);
    const band = n ? plotW / n : 0;
    const cx = (i: number) => AXIS_W + band * (i + 0.5);
    const tickKeys = rows
        .filter((_, i) => (rng.bucket === 'day' ? i % 7 === 1 : rng.bucket === 'week' ? i % 3 === 0 : true))
        .map((r) => r.key);

    // TVL lane.
    const laneTop = TOP + 7.5;
    const laneBottom = yOf(M) - 20;
    const tvls = rows.map((r) => r.tvl);
    const tLo = Math.min(...tvls);
    const tHi = Math.max(...tvls);
    const laneY = (v: number) =>
        tHi > tLo ? laneBottom - ((v - tLo) / (tHi - tLo)) * (laneBottom - laneTop) : laneTop;
    const pts = rows.map((r, i) => ({ x: cx(i), y: laneY(r.tvl) }));
    const line = monotonePath(pts);
    const fillBase = laneBottom + 7.5;
    const area = pts.length ? `${line}L${pts[pts.length - 1].x},${fillBase}L${pts[0].x},${fillBase}Z` : '';
    const endPt = pts[pts.length - 1];

    useEnterAnimation(
        plotRef,
        [
            {
                selector: '.lf-rise',
                keyframes: { transform: ['scaleY(0)', 'scaleY(1)'] },
                duration: 0.42,
                delay: (_i, el) => Number(el.getAttribute('data-i')) * (n > 1 ? 0.36 / (n - 1) : 0),
                ease: EASE,
            },
            {
                selector: '.lf-draw',
                keyframes: { clipPath: ['inset(0px 100% 0px 0px)', 'inset(0px 0% 0px 0px)'] },
                duration: 0.44,
                ease: 'linear',
            },
            {
                selector: '.lf-land',
                keyframes: { opacity: [0, 1], transform: ['scale(0.5)', 'scale(1)'] },
                duration: 0.2,
                delay: 0.36,
                ease: EASE,
                style: { 'transform-box': 'fill-box', 'transform-origin': 'center' },
            },
        ],
        [range, replay]
    );

    const toggleAsset = (k: string, v: boolean) =>
        setSelected((cur) => {
            const next = v
                ? assets.filter((a) => a.key === k || cur.indexOf(a.key) >= 0).map((a) => a.key)
                : cur.filter((x) => x !== k);
            return next.length ? next : cur;
        });
    const toggleShow = (k: string, v: boolean) => setShow((cur) => (v ? cur.concat(k) : cur.filter((x) => x !== k)));
    const refresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        window.setTimeout(() => {
            setRefreshing(false);
            setSynced('Synced just now');
            doReplay();
        }, 700);
    };
    const reset = () => {
        setRange(defaultRange);
        setSelected(assets.map((a) => a.key));
        setShow(SHOW);
        setView('chart');
    };

    const assetLabel =
        sel.length === assets.length ? 'All Assets' : `${sel.length} Asset${sel.length === 1 ? '' : 's'}`;
    const csvColumns = [
        { key: 'title', label: rng.bucket === 'day' ? 'Date' : 'Period' },
        ...sel.map((a) => ({
            key: a.key,
            label: `${a.label} supplied`,
            value: (r: Row) => Math.round(r[a.key]),
        })),
        {
            key: 'withdrawn',
            label: 'Withdrawn',
            value: (r: Row) => Math.round(r.withdrawn),
        },
        { key: 'net', label: 'Net flow', value: (r: Row) => Math.round(r.net) },
        { key: 'tvl', label: 'TVL at close', value: (r: Row) => Math.round(r.tvl) },
    ];
    const summary =
        `${title}, last ${rng.label}: TVL ${usdM(tvlEnd)} (${tvlDelta >= 0 ? '+' : '-'}${Math.abs(tvlDelta).toFixed(1)}% since ${since}) ` +
        `across ${sel.map((a) => a.label).join(', ')}. Supplied ${usdM(supplied)}, withdrawn ${usdM(withdrawn)}, ` +
        `net flow ${usdM(totalNet, true)}; up on ${upDays} of ${span.length} days. ` +
        (peak ? `Peak day ${monthDay(peak.day.date)} at ${usdM(peak.net, true)} net.` : '');

    const tipContent = (p: any) => {
        const idx = p && p.active && p.payload && p.payload.length ? p.payload[0].payload.i : null;
        const r: Row | null = idx != null ? rows[idx] : null;
        let left = 0;
        if (r) {
            left = AXIS_W + band * (idx + 1) + 6;
            if (left + TIP_W > (width || 0)) left = AXIS_W + band * idx - 6 - TIP_W;
        }
        return (
            <>
                <ActiveSync index={idx} onChange={setActive} />
                {r ? (
                    <div style={{ transform: `translateX(${Math.max(0, left)}px)` }}>
                        <div className="origin-top-left [animation:rp-lf-tip_150ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:[animation:none]">
                            <div className="grid w-44 items-start gap-1.5 rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl">
                                <div className="font-medium">{r.title}</div>
                                <div className="flex flex-col gap-1.5">
                                    {sel
                                        .slice()
                                        .reverse()
                                        .map((a) => (
                                            <TipRow
                                                key={a.key}
                                                swatch={<Swatch k={a.key} />}
                                                label={a.label}
                                                value={usdM(r[a.key])}
                                            />
                                        ))}
                                    {on('withdrawals') ? (
                                        <TipRow
                                            swatch={<Swatch k="withdrawn" />}
                                            label="Withdrawn"
                                            value={usdM(r.withdrawn)}
                                        />
                                    ) : null}
                                    <TipSection>
                                        <TipRow
                                            swatch={
                                                <span className="flex size-4 shrink-0 items-center justify-center">
                                                    <Icon
                                                        name={r.net < 0 ? 'trending-down' : 'trending-up'}
                                                        className="size-4"
                                                    />
                                                </span>
                                            }
                                            label="Net flow"
                                            value={usdM(r.net, true)}
                                        />
                                        <TipRow
                                            swatch={
                                                <span className="flex size-4 shrink-0 items-center justify-center">
                                                    <LineDotSwatch />
                                                </span>
                                            }
                                            label="TVL at close"
                                            value={usdM(r.tvl)}
                                        />
                                    </TipSection>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </>
        );
    };

    const barShape = (key: string, kind: 'top' | 'mid' | 'down') => (p: any) => {
        const y0 = Math.min(p.y, p.y + p.height);
        const h = Math.abs(p.height);
        if (!(h > 2) || !(p.width > 0)) return <g />;
        const i = p.index;
        const d =
            kind === 'down'
                ? roundedPath(p.x, y0 + 2, p.width, h - 2, 3, false, true)
                : roundedPath(p.x, y0, p.width, h - 2, 3, kind === 'top', false);
        return (
            <g
                className="lf-rise"
                data-i={i}
                style={{ transformBox: 'view-box', transformOrigin: `0px ${zeroY}px` } as any}
            >
                {/* Dimming as an inline opacity (an attribute change), not a class swap: on Next Experience
                    pages class changes restyle the whole document, and every bar of every series flips here. */}
                <path
                    d={d}
                    fill={`var(--color-${key})`}
                    className="transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                    style={{ opacity: active != null && active !== i ? 0.3 : 1 }}
                />
            </g>
        );
    };

    const xTick = (t: any) => {
        const r = rows.find((x) => x.key === t.payload.value);
        const right = (width || 0) - RIGHT - 16;
        return (
            <text x={Math.min(t.x, right)} y={t.y} dy="0.71em" textAnchor="middle" className="fill-muted-foreground">
                {r ? r.label : ''}
            </text>
        );
    };

    const chart = (
        <div ref={plotRef} className="relative h-72 w-full">
            <ChartContainer config={config} className="aspect-auto h-full w-full text-xs">
                {(R: any) => (
                    <R.ComposedChart
                        data={rows}
                        stackOffset="sign"
                        margin={{ top: TOP, right: RIGHT, bottom: 0, left: 0 }}
                        accessibilityLayer
                        onMouseLeave={() => setActive(null)}
                    >
                        {on('grid') ? <R.CartesianGrid vertical={true} /> : null}
                        <R.XAxis
                            dataKey="key"
                            ticks={tickKeys}
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
                            domain={[-M, yTop]}
                            ticks={ticks}
                            tickFormatter={tick}
                            allowDataOverflow
                        />
                        <R.Tooltip
                            isAnimationActive={false}
                            cursor={<BandCursor lib={R} count={rows.length} />}
                            content={tipContent}
                            position={{ x: 0, y: TOP }}
                            wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
                        />
                        {sel.map((a, ai) => (
                            <R.Bar
                                key={a.key}
                                dataKey={a.key}
                                name={a.label}
                                stackId="flow"
                                barSize={rng.barSize}
                                isAnimationActive={false}
                                shape={barShape(a.key, ai === sel.length - 1 ? 'top' : 'mid')}
                            />
                        ))}
                        {on('withdrawals') ? (
                            <R.Bar
                                dataKey="withdrawn"
                                name="Withdrawn"
                                stackId="flow"
                                barSize={rng.barSize}
                                isAnimationActive={false}
                                shape={barShape('withdrawn', 'down')}
                            />
                        ) : null}
                        <R.ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.35} />
                    </R.ComposedChart>
                )}
            </ChartContainer>
            {on('tvl') && width && pts.length ? (
                <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-visible text-xs"
                    width={width}
                    height={CHART_H}
                >
                    <defs>
                        <linearGradient
                            id={`${uid}-fill`}
                            x1="0"
                            y1={TOP}
                            x2="0"
                            y2={fillBase}
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset="0%" stopColor="var(--color-tvl)" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="var(--color-tvl)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient
                            id={`${uid}-stroke`}
                            x1={pts[0].x}
                            y1="0"
                            x2={endPt.x}
                            y2="0"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset="0%" stopColor="var(--color-tvl)" stopOpacity={0.2} />
                            <stop offset="30%" stopColor="var(--color-tvl)" stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <g className="lf-draw">
                        <path d={area} fill={`url(#${uid}-fill)`} stroke="none" />
                        <path
                            d={line}
                            fill="none"
                            stroke={`url(#${uid}-stroke)`}
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    </g>
                    <g className="lf-land">
                        <circle cx={endPt.x} cy={endPt.y} r={7} fill="var(--color-tvl)" fillOpacity={0.16} />
                        <circle
                            cx={endPt.x}
                            cy={endPt.y}
                            r={3}
                            fill="var(--color-tvl)"
                            stroke="var(--card)"
                            strokeWidth={1.5}
                        />
                        <text
                            x={endPt.x - 8}
                            y={endPt.y + 18}
                            textAnchor="end"
                            stroke="var(--card)"
                            strokeWidth={3}
                            paintOrder="stroke"
                            className="fill-foreground font-medium tabular-nums"
                        >
                            {usdM(tvlEnd)}
                        </text>
                    </g>
                    {/* Always mounted (moved / hidden with attributes): inserting and removing it would
                        restyle the whole page on each hover change. */}
                    <circle
                        cx={active != null && pts[active] ? pts[active].x : 0}
                        cy={active != null && pts[active] ? pts[active].y : 0}
                        r={3.5}
                        fill="var(--color-tvl)"
                        stroke="var(--card)"
                        strokeWidth={2}
                        visibility={active != null && pts[active] ? 'visible' : 'hidden'}
                    />
                </svg>
            ) : null}
        </div>
    );

    return (
        <SeriesScope config={config} className={`w-full min-w-0 ${className}`}>
            <style>{TIP_KEYFRAMES}</style>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                        <span
                            data-slot="icon-tile"
                            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 [&_svg]:size-4"
                        >
                            <Icon name="landmark" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-px">
                            <FrameTitle role="heading" className="truncate">
                                {title}
                            </FrameTitle>
                            <FrameDescription className="truncate">{description}</FrameDescription>
                        </div>
                    </div>
                    <ChartToolbar>
                        <SegmentedControl
                            label="Range"
                            value={range}
                            onValueChange={setRange}
                            options={ranges.map((r) => ({ value: r.value, label: r.label }))}
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
                                            aria-label={`Assets shown: ${assetLabel}`}
                                        />
                                    }
                                >
                                    <Icon name="funnel" />
                                    <span className={TEXT_TRIM}>{assetLabel}</span>
                                    <Icon name="chevron-down" className="text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Assets</DropdownMenuLabel>
                                        {assets.map((a) => (
                                            <DropdownMenuCheckboxItem
                                                key={a.key}
                                                checked={selected.indexOf(a.key) >= 0}
                                                disabled={selected.length === 1 && selected[0] === a.key}
                                                onCheckedChange={(c: boolean) => toggleAsset(a.key, c)}
                                                closeOnClick={false}
                                            >
                                                <Swatch k={a.key} />
                                                {a.label}
                                                <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                                    {share(a.key).toFixed(1)}%
                                                </span>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Presets</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setSelected(assets.map((a) => a.key))}>
                                            <Icon name="eye" />
                                            Show All
                                        </DropdownMenuItem>
                                        {assets.some((a) => a.stable) ? (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setSelected(assets.filter((a) => a.stable).map((a) => a.key))
                                                }
                                            >
                                                <Icon name="circle-dollar-sign" />
                                                Stablecoins
                                            </DropdownMenuItem>
                                        ) : null}
                                        {assets.some((a) => !a.stable) ? (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setSelected(assets.filter((a) => !a.stable).map((a) => a.key))
                                                }
                                            >
                                                <Icon name="activity" />
                                                Volatile Assets
                                            </DropdownMenuItem>
                                        ) : null}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {refreshing ? (
                                <ToolbarButton
                                    icon={<Icon name="loader-circle" className="size-4 animate-spin" />}
                                    label="Refreshing flows"
                                    aria-busy="true"
                                    aria-disabled="true"
                                    className="pointer-events-none opacity-50"
                                />
                            ) : (
                                <ToolbarButton
                                    icon={<Icon name="refresh-cw" />}
                                    label="Refresh flows"
                                    onClick={refresh}
                                />
                            )}
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
                                        <DropdownMenuLabel>Show</DropdownMenuLabel>
                                        {[
                                            {
                                                key: 'withdrawals',
                                                label: 'Withdrawals',
                                                icon: 'trending-down',
                                            },
                                            { key: 'tvl', label: 'TVL Line', icon: 'chart-line' },
                                            { key: 'grid', label: 'Gridlines', icon: 'grid-2x2' },
                                        ].map((it) => (
                                            <DropdownMenuCheckboxItem
                                                key={it.key}
                                                checked={on(it.key)}
                                                onCheckedChange={(c: boolean) => toggleShow(it.key, c)}
                                                closeOnClick={false}
                                            >
                                                <Icon name={it.icon} />
                                                {it.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Export</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                downloadText(
                                                    `liquidity-flows-${range}.csv`,
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
                <FramePanel>
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col items-start gap-4">
                            <div className="flex min-w-0 flex-col gap-2.5">
                                <span className="text-sm text-muted-foreground">Total Value Locked</span>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                                        {usdM(tvlEnd)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge tone={tvlDelta >= 0 ? 'success' : 'destructive'}>
                                            <Icon name={tvlDelta >= 0 ? 'trending-up' : 'trending-down'} />
                                            <span className={`${TEXT_TRIM} tabular-nums`}>
                                                {`${tvlDelta >= 0 ? '+' : '-'}${Math.abs(tvlDelta).toFixed(1)}%`}
                                            </span>
                                        </StatusBadge>
                                        <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                            <span className={TEXT_TRIM}>{`since ${since}`}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                {assets.map((a) => {
                                    const visible = selected.indexOf(a.key) >= 0;
                                    return (
                                        <li
                                            key={a.key}
                                            className={`flex h-4 items-center gap-1.5 ${visible ? '' : 'text-muted-foreground'}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`size-2 shrink-0 rounded-full ${visible ? '' : 'border border-muted-foreground/60'}`}
                                                style={visible ? { background: `var(--color-${a.key})` } : undefined}
                                            />
                                            <span className={TEXT_TRIM}>{a.label}</span>
                                            <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                                                {share(a.key).toFixed(1)}%
                                                <span className="sr-only">
                                                    {visible ? ' of supply' : ' of supply, hidden'}
                                                </span>
                                            </span>
                                        </li>
                                    );
                                })}
                                {on('withdrawals') ? (
                                    <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                        <span
                                            aria-hidden="true"
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ background: 'var(--color-withdrawn)' }}
                                        />
                                        <span className={TEXT_TRIM}>Withdrawn</span>
                                    </li>
                                ) : null}
                                {on('tvl') ? (
                                    <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                        <LineDotSwatch />
                                        <span className={TEXT_TRIM}>TVL</span>
                                    </li>
                                ) : null}
                            </ul>
                        </div>
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            table={
                                <ChartDataTable
                                    data={rows}
                                    index="title"
                                    indexLabel={rng.bucket === 'day' ? 'Date' : 'Period'}
                                    series={sel
                                        .map((a) => ({ key: a.key, label: a.label }))
                                        .concat([
                                            { key: 'withdrawn', label: 'Withdrawn' },
                                            { key: 'net', label: 'Net flow' },
                                            { key: 'tvl', label: 'TVL at close' },
                                        ])}
                                    valueFormatter={(v: number) => usdM(v)}
                                    caption={`${title}, last ${rng.label}`}
                                />
                            }
                        >
                            {chart}
                        </ChartFigure>
                    </div>
                </FramePanel>
                <FramePanel className="@container">
                    <dl className="grid grid-cols-2 gap-5 @2xl:-mx-(--frame-panel-px) @2xl:-my-(--frame-panel-py) @2xl:grid-cols-4! @2xl:gap-0!">
                        <Kpi
                            label="Supplied"
                            value={usdM(supplied)}
                            note={`${usdM(supplied / (span.length || 1))} per day`}
                        />
                        <Kpi
                            label="Withdrawn"
                            value={usdM(withdrawn)}
                            note={`${supplied ? ((withdrawn / supplied) * 100).toFixed(1) : '0.0'}% of supplied`}
                        />
                        <Kpi
                            label="Net Flow"
                            value={usdM(totalNet, true)}
                            note={`Up on ${upDays} of ${span.length} days`}
                        />
                        <Kpi
                            label="Peak Day"
                            value={peak ? monthDay(peak.day.date) : '-'}
                            note={peak ? `${usdM(peak.net, true)} net` : ''}
                        />
                    </dl>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>{`${sel.length} of ${assets.length} assets`}</span>
                        </span>
                        <MetaDot />
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>{basis}</span>
                        </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-4 items-center tabular-nums">
                            <span className={TEXT_TRIM}>{`As of ${asOf}`}</span>
                        </span>
                        <MetaDot />
                        <span className="flex h-4 items-center" aria-live="polite">
                            <span className={TEXT_TRIM}>{synced}</span>
                        </span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default LiquidityFlows;
