import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, chartKey, useRecharts } from 'components:chart';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from 'components:card';
import { ToolbarGroup, SegmentedControl, ChartMoreMenu, ChartExpandDialog, copyText } from 'components:chart-frame';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation, useReplayKey, signedPercent } from 'components:charts/chart-kit';
import { TEXT_TRIM, RefreshButton, useBusy } from 'components:charts/bar-kit';
import { WEEKS, BLOCK_RANGE } from './data';
import type { TrainingWeek } from './data';

/**
 * components:charts/training-volume: weekly training volume for a 12-week block as patterned columns
 * (diagonal / dots / crosshatch), the hovered week (or the latest) highlighted in the accent with a
 * marching pattern and a glint, the last block as hatched ghost lanes that slide in behind each column,
 * or the training plan as checkered finish tapes (snapped when the week beat the plan), a running-track
 * floor, a Time / Distance toggle, display options (pattern, gridlines), a compare menu, refresh, expand
 * and CSV / JSON / copy exports.
 *
 *   <TrainingVolume />                                    sample data
 *   <TrainingVolume weeks={[{ week, range, time: { current, last, plan }, distance: {…} }]} />
 *
 * Time values are minutes, distance values km.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type TrainingVolumeProps = {
    title?: string;
    weeks?: TrainingWeek[];
    blockRange?: string;
    defaultMetric?: 'time' | 'distance';
    defaultCompare?: Compare;
    className?: string;
};

type Metric = 'time' | 'distance';
type Compare = 'last' | 'plan' | 'none';
type Fill = 'diagonal' | 'dots' | 'crosshatch';

const RISE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const MUTED_BG = 'color-mix(in oklab, var(--muted-foreground) 12%, var(--card))';
const DIAG = 'M-1 1 1-1M0 6 6 0M5 7 7 5';
const CROSS = 'M-1 1 1-1M0 6 6 0M5 7 7 5M-1 5 1 7M0 0 6 6M5 -1 7 1';

function hm(min: number, pad = true): string {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${pad && m < 10 ? `0${m}` : m}m`;
}

function fmt(metric: Metric, v: number): string {
    return metric === 'time' ? hm(v) : `${v.toFixed(1)} km`;
}

/** One fill pattern (accent or muted), 6px tiles. */
function FillPattern({ id, fill, tone, scale }: { id: string; fill: Fill; tone: 'accent' | 'muted'; scale?: number }) {
    const accent = tone === 'accent';
    const bg = accent ? 'var(--volume-accent)' : MUTED_BG;
    const ink = accent ? 'var(--card)' : 'var(--muted-foreground)';
    return (
        <pattern
            id={id}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform={scale ? `scale(${scale})` : undefined}
        >
            <rect width="6" height="6" fill={bg} />
            {fill === 'dots' ? (
                <circle cx="3" cy="3" r="1.2" fill={ink} fillOpacity={accent ? 0.48 : 0.42} />
            ) : (
                <path
                    d={fill === 'crosshatch' ? CROSS : DIAG}
                    fill="none"
                    stroke={ink}
                    strokeOpacity={accent ? 0.38 : 0.32}
                    strokeWidth="1"
                />
            )}
        </pattern>
    );
}

function LanesPattern({ id, scale }: { id: string; scale?: number }) {
    return (
        <pattern
            id={id}
            width="4"
            height="3"
            patternUnits="userSpaceOnUse"
            patternTransform={scale ? `scale(${scale})` : undefined}
        >
            <rect width="4" height="3" fill={MUTED_BG} />
            <rect width="4" height="1" fill="var(--muted-foreground)" fillOpacity={0.3} />
        </pattern>
    );
}

/** 12px legend / header swatch. */
function Swatch({ kind, fill }: { kind: 'accent' | 'muted' | 'lanes' | 'tape'; fill: Fill }) {
    const id = `rp-tv-sw-${chartKey(useId())}`;
    if (kind === 'tape') {
        return (
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0 text-foreground">
                <line
                    x1="0"
                    x2="12"
                    y1="5.25"
                    y2="5.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="1.5 1.5"
                />
                <line
                    x1="0"
                    x2="12"
                    y1="6.75"
                    y2="6.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="1.5 1.5"
                    strokeDashoffset="1.5"
                />
            </svg>
        );
    }
    return (
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
            <defs>
                {kind === 'lanes' ? (
                    <LanesPattern id={id} scale={0.75} />
                ) : (
                    <FillPattern id={id} fill={fill} tone={kind} scale={0.75} />
                )}
            </defs>
            <rect width="12" height="12" rx="2.5" fill={`url(#${id})`} opacity={kind === 'lanes' ? 0.6 : undefined} />
        </svg>
    );
}

/** A column path with rounded top corners (r) from the baseline up to y. */
function colPath(x: number, y: number, w: number, base: number, r = 6): string {
    const rr = Math.max(0, Math.min(r, w / 2, (base - y) / 1));
    return `M${x},${base}V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${base}Z`;
}

/** The checkered finish tape at the plan height: whole when missed, snapped (ends hanging) when beaten. */
function FinishTape({ x, w, y, beaten }: { x: number; w: number; y: number; beaten: boolean }) {
    const piece = (x1: number, x2: number) => (
        <>
            <line x1={x1} x2={x2} y1={y} y2={y} stroke="var(--card)" strokeWidth="5" />
            <line
                x1={x1}
                x2={x2}
                y1={y - 0.75}
                y2={y - 0.75}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="1.5 1.5"
            />
            <line
                x1={x1}
                x2={x2}
                y1={y + 0.75}
                y2={y + 0.75}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="1.5 1.5"
                strokeDashoffset="1.5"
            />
        </>
    );
    if (!beaten) return piece(x - 3, x + w + 3);
    const len = w * 0.34;
    return (
        <>
            <g transform={`rotate(28 ${x - 3} ${y})`}>{piece(x - 3, x - 3 + len)}</g>
            <g transform={`rotate(-28 ${x + w + 3} ${y})`}>{piece(x + w + 3 - len, x + w + 3)}</g>
        </>
    );
}

/** The running-track floor under the plot (solid, dashed, solid) and the floor clip the columns rise through. */
function TrackLayer({ floorId }: { floorId: string }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot) return null;
    const left = plot.x;
    const w = plot.width;
    const base = plot.y + plot.height;
    return (
        <g>
            <defs>
                <clipPath id={floorId}>
                    <rect x={0} y={0} width={left + w + 48} height={base} />
                </clipPath>
            </defs>
            <g data-track="" aria-hidden="true" className="text-border">
                <line x1={left} x2={left + w} y1={base + 0.5} y2={base + 0.5} stroke="currentColor" />
                <line x1={left} x2={left + w} y1={base + 4} y2={base + 4} stroke="currentColor" strokeDasharray="6 6" />
                <line x1={left} x2={left + w} y1={base + 7.5} y2={base + 7.5} stroke="currentColor" />
            </g>
        </g>
    );
}

/** Reports the Recharts tooltip's active index (mouse or keyboard) without rendering anything. */
function ActiveSync({
    active,
    index,
    onChange,
}: {
    active: boolean;
    index: any;
    onChange: (i: number | null) => void;
}) {
    const v = active && index != null ? Number(index) : null;
    useEffect(() => {
        onChange(v);
    }, [v, onChange]);
    return null;
}

type Row = { label: string; week: number; range: string; value: number; last: number; plan: number };

function Plot({
    rows,
    metric,
    compare,
    fill,
    grid,
    hover,
    onHover,
    replay,
    uid,
    height = 'h-72',
}: {
    rows: Row[];
    metric: Metric;
    compare: Compare;
    fill: Fill;
    grid: boolean;
    hover: number | null;
    onHover: (i: number | null) => void;
    replay: any;
    uid: string;
    height?: string;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const n = rows.length;
    const focus = hover != null ? hover : n - 1;
    const max = Math.max(
        1,
        ...rows.map((r) => Math.max(r.value, compare === 'last' ? r.last : 0, compare === 'plan' ? r.plan : 0))
    );
    const unit = metric === 'time' ? 60 : 10;
    const step = Math.ceil(max / 3 / unit) * unit;
    const ticks = [0, step, step * 2, step * 3];
    const id = (k: string) => `rp-tv-${uid}-${k}`;

    useEnterAnimation(
        rootRef,
        [
            { selector: '[data-track]', keyframes: { opacity: [0, 1] }, duration: 0.48, ease: 'easeOut' },
            {
                selector: '.recharts-cartesian-grid',
                keyframes: { opacity: [0, 1] },
                duration: 0.48,
                delay: 0.06,
                ease: 'easeOut',
            },
            {
                selector: '.recharts-cartesian-axis-tick-labels',
                keyframes: { opacity: [0, 1] },
                duration: 0.36,
                ease: 'easeOut',
            },
            {
                selector: '[data-bar-rise]',
                keyframes: (el) => ({
                    transform: [`translateY(${Number(el.getAttribute('data-rise')) || 0}px)`, 'translateY(0px)'],
                }),
                duration: 0.76,
                delay: (i) => 0.14 + i * 0.045,
                ease: RISE_EASE,
            },
            {
                selector: '[data-tape]',
                keyframes: { transform: ['translateY(-6px)', 'translateY(0px)'], opacity: [0, 1] },
                duration: 0.42,
                delay: (i) => 0.55 + i * 0.045,
                ease: [0.34, 1.56, 0.64, 1],
            },
        ],
        [replay, metric]
    );

    return (
        <div
            ref={rootRef}
            data-compare={compare}
            data-grid={grid ? 'on' : 'off'}
            data-glint={hover != null ? 'on' : 'off'}
            className={`group/plot w-full ${height} outline-offset-4 outline-ring/50 has-[.recharts-surface:focus-visible]:outline-2 [&_.recharts-cartesian-grid-horizontal]:transition-opacity [&_.recharts-cartesian-grid-horizontal]:duration-300 data-[grid=off]:[&_.recharts-cartesian-grid-horizontal]:opacity-0 [&_g]:outline-hidden`}
            onMouseLeave={() => onHover(null)}
        >
            <style>{`@keyframes rp-tv-march{from{transform:translateY(0px)}to{transform:translateY(-6px)}}`}</style>
            <ChartContainer config={{}} className="aspect-auto h-full w-full">
                {(R: any) => (
                    <R.BarChart
                        data={rows}
                        margin={{ top: 12, right: 4, bottom: 0, left: 0 }}
                        barCategoryGap="24%"
                        maxBarSize={40}
                        accessibilityLayer
                    >
                        <defs>
                            <FillPattern id={id('accent')} fill={fill} tone="accent" />
                            <FillPattern id={id('muted')} fill={fill} tone="muted" />
                            <LanesPattern id={id('lanes')} />
                            <radialGradient id={id('glint')}>
                                <stop
                                    offset="0%"
                                    stopColor="color-mix(in oklab, var(--volume-accent), white 70%)"
                                    stopOpacity={0.55}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="color-mix(in oklab, var(--volume-accent), white 70%)"
                                    stopOpacity={0}
                                />
                            </radialGradient>
                        </defs>
                        <R.CartesianGrid vertical={false} />
                        <R.XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={16}
                            interval={0}
                            tick={(t: any) => (
                                // Narrow cards label every other week (W1, W3 …), as ReUI does.
                                <text
                                    x={t.x}
                                    y={t.y}
                                    textAnchor="middle"
                                    className={`fill-muted-foreground ${t.index % 2 ? '@max-md/volume:hidden' : ''}`}
                                >
                                    {t.payload.value}
                                </text>
                            )}
                        />
                        <R.YAxis
                            width={48}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            domain={[0, ticks[3]]}
                            ticks={ticks}
                            tickFormatter={(v: number) => (metric === 'time' ? `${Math.round(v / 60)}h` : `${v} km`)}
                        />
                        <R.Tooltip
                            cursor={false}
                            isAnimationActive={false}
                            content={({ active, activeIndex }: any) => (
                                <ActiveSync active={active} index={activeIndex} onChange={onHover} />
                            )}
                        />
                        <R.Bar
                            dataKey="value"
                            isAnimationActive={false}
                            shape={(b: any) => {
                                const r: Row = b.payload;
                                const base = b.y + b.height;
                                const per = r.value ? b.height / r.value : 0;
                                const ghostY = base - r.last * per;
                                const planY = base - r.plan * per;
                                const d = colPath(b.x, b.y, b.width, base);
                                const on = b.index === focus;
                                const clip = id(`bar-${b.index}`);
                                return (
                                    <g key={`b${b.index}`}>
                                        <clipPath id={id(`floor-${b.index}`)}>
                                            <rect x={b.x - 24} y={0} width={b.width + 48} height={base} />
                                        </clipPath>
                                        <g clipPath={`url(#${id(`floor-${b.index}`)})`}>
                                            <g data-bar-rise={b.index} data-rise={base - b.y + 2}>
                                                <g className="opacity-0 transition-opacity duration-300 group-data-[compare=last]/plot:opacity-100">
                                                    <path
                                                        d={colPath(b.x, ghostY, b.width, base)}
                                                        fill={`url(#${id('lanes')})`}
                                                        opacity={0.6}
                                                        className="transition-transform duration-300 ease-out"
                                                        style={{
                                                            transform: `translateX(${hover === b.index ? 0 : -10}px)`,
                                                        }}
                                                    />
                                                </g>
                                                <path
                                                    d={d}
                                                    fill={`url(#${id('muted')})`}
                                                    stroke="var(--card)"
                                                    strokeWidth={4}
                                                    paintOrder="stroke"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                                <clipPath id={clip}>
                                                    <path d={d} />
                                                </clipPath>
                                                {on ? (
                                                    <g clipPath={`url(#${clip})`} className="pointer-events-none">
                                                        <rect
                                                            x={b.x - 6}
                                                            y={b.y - 6}
                                                            width={b.width + 12}
                                                            height={b.height + 18}
                                                            fill={`url(#${id('accent')})`}
                                                            className="animate-[rp-tv-march_1.4s_linear_infinite] motion-reduce:animate-none"
                                                        />
                                                    </g>
                                                ) : null}
                                                <g
                                                    clipPath={`url(#${clip})`}
                                                    className={`pointer-events-none transition-opacity duration-300 motion-reduce:hidden ${
                                                        hover === b.index ? 'opacity-100' : 'opacity-0'
                                                    }`}
                                                >
                                                    <ellipse
                                                        cx={b.x + b.width / 2}
                                                        cy={base - (base - 12) / 2}
                                                        rx={56}
                                                        ry={(base - 12) * 0.7}
                                                        fill={`url(#${id('glint')})`}
                                                    />
                                                </g>
                                            </g>
                                        </g>
                                        {per ? (
                                            <g className="pointer-events-none">
                                                <g data-tape="">
                                                    <g className="text-foreground opacity-0 transition-opacity duration-300 group-data-[compare=plan]/plot:opacity-100">
                                                        <FinishTape
                                                            x={b.x}
                                                            w={b.width}
                                                            y={planY}
                                                            beaten={r.value >= r.plan}
                                                        />
                                                    </g>
                                                </g>
                                            </g>
                                        ) : null}
                                    </g>
                                );
                            }}
                        />
                        <TrackLayer floorId={id('floor')} />
                    </R.BarChart>
                )}
            </ChartContainer>
        </div>
    );
}

export function TrainingVolume({
    title = 'Training Volume',
    weeks = WEEKS,
    blockRange = BLOCK_RANGE,
    defaultMetric = 'time',
    defaultCompare = 'last',
    className,
}: TrainingVolumeProps) {
    const [metric, setMetric] = useState<Metric>(defaultMetric);
    const [compare, setCompare] = useState<Compare>(defaultCompare);
    const [fill, setFill] = useState<Fill>('diagonal');
    const [grid, setGrid] = useState(true);
    const [hover, setHover] = useState<number | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [replay, bump] = useReplayKey();
    const [busy, refresh] = useBusy(700, bump);
    const uid = chartKey(useId());

    const config = useMemo(
        () => ({
            volume: series('violet-600', 'violet-400', 'This block'),
            prior: series('neutral-500', 'neutral-400', 'Last block'),
            plan: series('neutral-950', 'zinc-50', 'Plan'),
        }),
        []
    );

    const rows: Row[] = useMemo(
        () =>
            weeks.map((w) => ({
                label: `W${w.week}`,
                week: w.week,
                range: w.range,
                value: w[metric].current,
                last: w[metric].last,
                plan: w[metric].plan,
            })),
        [weeks, metric]
    );
    const n = rows.length;
    const focus = rows[hover != null && hover < n ? hover : n - 1];
    const total = rows.reduce((s, r) => s + r.value, 0);
    const lastTotal = rows.reduce((s, r) => s + r.last, 0);
    const planTotal = rows.reduce((s, r) => s + r.plan, 0);
    const vsPlan = compare === 'plan';
    const ref = vsPlan ? planTotal : lastTotal;
    const blockDelta = ref ? (total / ref - 1) * 100 : 0;
    const refOf = (r: Row) => (vsPlan ? r.plan : r.last);
    const weekDelta = refOf(focus) ? (focus.value / refOf(focus) - 1) * 100 : 0;
    const vsLabel = vsPlan ? 'vs plan' : 'vs last block';
    const unitWord = metric === 'time' ? 'time' : 'distance';

    const summary = `${title}, weekly ${unitWord} ${blockRange}: ${fmt(metric, total)} this block, ${signedPercent(
        (total / (lastTotal || 1) - 1) * 100
    )} vs ${fmt(metric, lastTotal)} last block (plan ${fmt(metric, planTotal)}). Latest week ${fmt(metric, rows[n - 1].value)}.`;
    const tableRows = rows.map((r) => ({
        label: `Week ${r.week}, ${r.range}`,
        value: r.value,
        last: r.last,
        plan: r.plan,
    }));
    const csv = {
        filename: `training-volume-${metric}.csv`,
        rows: tableRows,
        columns: [
            { key: 'label', label: 'Week' },
            { key: 'value', label: 'This Block' },
            { key: 'last', label: 'Last Block' },
            { key: 'plan', label: 'Plan' },
        ],
    };
    const copyData = () =>
        copyText(
            ['Week\tThis Block\tLast Block\tPlan']
                .concat(
                    tableRows.map(
                        (r) => `${r.label}\t${fmt(metric, r.value)}\t${fmt(metric, r.last)}\t${fmt(metric, r.plan)}`
                    )
                )
                .join('\n')
        );

    const plotProps = { rows, metric, compare, fill, grid, hover, onHover: setHover, replay, uid };

    const settings = (
        <ToolbarGroup aria-label="Chart settings">
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            aria-label="Display options"
                            title="Display options"
                        />
                    }
                >
                    <Icon name="settings-2" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Fill Pattern</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={fill} onValueChange={(v: any) => setFill(v)}>
                            <DropdownMenuRadioItem value="diagonal">Diagonal</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="dots">Dots</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="crosshatch">Crosshatch</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Layers</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={grid}
                            onCheckedChange={(c: boolean) => setGrid(!!c)}
                            closeOnClick={false}
                        >
                            Gridlines
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
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
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Compare Against</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={compare} onValueChange={(v: any) => setCompare(v)}>
                            <DropdownMenuRadioItem value="last">Last Block</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="plan">Training Plan</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="none">No Comparison</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </ToolbarGroup>
    );

    return (
        <SeriesScope
            config={config}
            className={`w-full min-w-0 [--volume-accent:var(--color-volume)] ${className || ''}`}
        >
            <Card className="@container/volume w-full min-w-0">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="col-start-1">
                        <span className="flex h-5 items-center gap-1.5">
                            {compare !== 'none' ? (
                                <span
                                    className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                                        blockDelta >= 0 ? 'text-success' : 'text-destructive'
                                    }`}
                                >
                                    <Icon name={blockDelta >= 0 ? 'trending-up' : 'trending-down'} />
                                    <span className="sr-only">{blockDelta >= 0 ? 'Up' : 'Down'}</span>
                                    <span className={TEXT_TRIM}>{`${Math.abs(blockDelta).toFixed(1)}%`}</span>
                                </span>
                            ) : null}
                            <span className={TEXT_TRIM}>
                                {compare !== 'none' ? vsLabel : `${fmt(metric, total)} this block`}
                            </span>
                        </span>
                    </CardDescription>
                    <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 justify-self-start @2xl/card-header:col-start-2 @2xl/card-header:row-span-2 @2xl/card-header:row-start-1 @2xl/card-header:mt-0 @2xl/card-header:justify-self-end">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* ReUI: the pressed item is muted, the others stay foreground. */}
                            <SegmentedControl
                                className="[&>[aria-checked=true]]:bg-muted [&>button]:text-foreground"
                                label="Metric"
                                value={metric}
                                onValueChange={(v: any) => setMetric(v)}
                                options={[
                                    { value: 'time', label: 'Time' },
                                    { value: 'distance', label: 'Distance' },
                                ]}
                            />
                            {settings}
                            <ToolbarGroup aria-label="Chart actions">
                                <RefreshButton busy={busy} onClick={refresh} />
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    className="bg-background"
                                    aria-label="Expand chart"
                                    title="Expand chart"
                                    onClick={() => setExpanded(true)}
                                >
                                    <Icon name="maximize-2" />
                                </Button>
                                <ChartMoreMenu
                                    title={title}
                                    csv={csv}
                                    json={{ filename: `training-volume-${metric}.json`, data: tableRows }}
                                    summary={summary}
                                    items={[
                                        {
                                            label: 'Copy data',
                                            icon: <Icon name="copy" />,
                                            onSelect: copyData,
                                        },
                                        { type: 'separator' },
                                        {
                                            label: view === 'table' ? 'View as chart' : 'View as table',
                                            icon: <Icon name={view === 'table' ? 'chart-column' : 'table'} />,
                                            onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                        },
                                        {
                                            label: 'Expand chart',
                                            icon: <Icon name="maximize-2" />,
                                            onSelect: () => setExpanded(true),
                                        },
                                        {
                                            label: 'Reset view',
                                            icon: <Icon name="rotate-ccw" />,
                                            onSelect: () => {
                                                setMetric(defaultMetric);
                                                setCompare(defaultCompare);
                                                setFill('diagonal');
                                                setGrid(true);
                                            },
                                        },
                                    ]}
                                />
                            </ToolbarGroup>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <div className="mt-1 mb-2 flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs">
                            <span className="flex h-5 min-w-0 items-center gap-2">
                                <Swatch kind="accent" fill={fill} />
                                <span
                                    className={`font-medium text-foreground ${TEXT_TRIM}`}
                                >{`Week ${focus.week}`}</span>
                                <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                                <span className={`text-muted-foreground ${TEXT_TRIM}`}>{focus.range}</span>
                            </span>
                            <span className="flex h-5 items-center gap-2.5">
                                <span className={`text-sm font-semibold text-foreground tabular-nums ${TEXT_TRIM}`}>
                                    {fmt(metric, focus.value)}
                                </span>
                                {compare !== 'none' ? (
                                    <span
                                        className={`font-medium tabular-nums ${weekDelta >= 0 ? 'text-success' : 'text-destructive'} ${TEXT_TRIM}`}
                                    >
                                        {signedPercent(weekDelta)}
                                        <span className="font-normal text-muted-foreground">{` ${vsLabel}`}</span>
                                    </span>
                                ) : null}
                            </span>
                        </div>
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            table={
                                <ChartDataTable
                                    data={tableRows}
                                    index="label"
                                    indexLabel="Week"
                                    series={[
                                        { key: 'value', label: 'This Block' },
                                        { key: 'last', label: 'Last Block' },
                                        { key: 'plan', label: 'Plan' },
                                    ]}
                                    valueFormatter={(v: number) => fmt(metric, v)}
                                    caption={`Weekly ${unitWord}, ${blockRange}`}
                                />
                            }
                        >
                            <Plot {...plotProps} />
                        </ChartFigure>
                    </div>
                </CardContent>
                <CardFooter>
                    <ul
                        aria-label="Legend"
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs @md/volume:gap-x-5"
                    >
                        <li className="flex h-4 items-center gap-1.5">
                            <Swatch kind="muted" fill={fill} />
                            <span className={`text-muted-foreground ${TEXT_TRIM}`}>
                                <span className="hidden @md/volume:inline">This Block</span>
                                <span className="@md/volume:hidden">Block</span>
                            </span>
                            <span className={`font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>
                                {fmt(metric, total)}
                            </span>
                        </li>
                        {compare !== 'none' ? (
                            <li key={compare} className="flex h-4 items-center gap-1.5">
                                <Swatch kind={vsPlan ? 'tape' : 'lanes'} fill={fill} />
                                <span className={`text-muted-foreground ${TEXT_TRIM}`}>
                                    <span className="hidden @md/volume:inline">{vsPlan ? 'Plan' : 'Last Block'}</span>
                                    <span className="@md/volume:hidden">{vsPlan ? 'Plan' : 'Last'}</span>
                                </span>
                                <span className={`font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>
                                    {fmt(metric, vsPlan ? planTotal : lastTotal)}
                                </span>
                            </li>
                        ) : null}
                    </ul>
                </CardFooter>
            </Card>
            <ChartExpandDialog open={expanded} onOpenChange={setExpanded} title={title}>
                <SeriesScope config={config} className="flex flex-col gap-3 p-2 [--volume-accent:var(--color-volume)]">
                    <div className="text-base font-medium">{title}</div>
                    <Plot {...plotProps} uid={`${uid}x`} height="h-[28rem]" />
                </SeriesScope>
            </ChartExpandDialog>
        </SeriesScope>
    );
}

export default TrainingVolume;
