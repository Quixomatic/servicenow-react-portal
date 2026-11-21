import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, prefersReducedMotion } from 'components:chart';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from 'components:card';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { ToolbarGroup, ToolbarButton, ChartMoreMenu, ChartExpandDialog } from 'components:chart-frame';
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
    AccentPicker,
    ACCENTS,
    EASE_OUT,
    signedPercent,
} from 'components:charts/chart-kit';
import { MONTHLY, PARTICLES } from './data';
import type { LeadsPoint, Particle } from './data';

/**
 * components:charts/inbound-leads: leads this year against last year (grey) by month or quarter, as a
 * soft area with particles drifting down through the fill, a dashed linear / 3-point moving-average trend,
 * a Display menu (compare previous year, smooth / straight curve, data points, area fill, gridlines), an
 * accent colour picker, refresh / expand / exports and footer totals.
 *
 *   <InboundLeads />                                         sample data
 *   <InboundLeads data={[{ label: 'Jan', name: 'January', current, prior }, …]} year={2025} />
 *
 * Quarters are summed from the monthly rows (12 rows → Q1…Q4).
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

type Grain = 'month' | 'quarter';
type Trend = 'none' | 'linear' | 'average';

export type InboundLeadsProps = {
    title?: string;
    data?: LeadsPoint[];
    year?: number;
    updatedLabel?: string;
    particles?: Particle[];
    defaultAccent?: string;
    className?: string;
    /** Internal: hides the expand button inside the expand dialog. */
    expandable?: boolean;
};

const TOP = 20;
const HEIGHT = 288;
const AXIS = 30;
const PLOT_H = HEIGHT - TOP - AXIS;
const PAD = 16;

const TRENDS: { value: Trend; label: string; icon: string }[] = [
    { value: 'none', label: 'No Trend', icon: 'minus' },
    { value: 'linear', label: 'Linear Trend', icon: 'trending-up' },
    { value: 'average', label: 'Moving Average', icon: 'chart-line' },
];

const PARTICLE_CSS =
    '@keyframes rp-leads-particle-fall{0%{transform:translateY(0);opacity:0}20%{opacity:var(--leads-particle-peak)}75%{opacity:var(--leads-particle-peak)}100%{transform:translateY(var(--leads-particle-fall));opacity:0}}' +
    '.rp-leads-particle{animation:rp-leads-particle-fall var(--leads-particle-duration) linear var(--leads-particle-delay) infinite}' +
    '@media (prefers-reduced-motion: reduce){.rp-leads-particle{animation:none;opacity:0}}';

function tickNumber(v: number) {
    if (Math.abs(v) >= 1000) return `${+(v / 1000).toFixed(1)}k`;
    return String(v);
}

/** 0 … a nice step above the max, in 4 steps (1 / 2 / 2.5 / 5 / 10 × 10^n). */
function niceTicks(max: number) {
    const raw = max / 4 || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    const top = Math.ceil(max / step) * step;
    const out: number[] = [];
    for (let v = 0; v <= top + step / 1000; v += step) out.push(v);
    return out;
}

/** Least-squares line over the values: [slope, intercept]. */
function linearFit(values: number[]): [number, number] {
    const n = values.length;
    const mx = (n - 1) / 2;
    const my = values.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let den = 0;
    values.forEach((v, i) => {
        num += (i - mx) * (v - my);
        den += (i - mx) * (i - mx);
    });
    const b = den ? num / den : 0;
    return [b, my - b * mx];
}

/** Centred 3-point moving average (2 points at the ends). */
function movingAverage(values: number[]): number[] {
    return values.map((_v, i) => {
        const w = values.slice(Math.max(0, i - 1), Math.min(values.length, i + 2));
        return w.reduce((s, v) => s + v, 0) / w.length;
    });
}

/** Particles clipped to the current-year area: falls and fades on a loop (CSS keyframes). */
function Particles({ R, rows, curve, list }: { R: any; rows: any[]; curve: string; list: Particle[] }) {
    const x = R.useXAxisScale ? R.useXAxisScale() : null;
    const y = R.useYAxisScale ? R.useYAxisScale() : null;
    const plot = R.usePlotArea ? R.usePlotArea() : null;
    if (!x || !y || !plot) return null;
    const points = rows.map((r) => ({ x: x(r.label), y: y(r.current) }));
    const base = plot.y + plot.height;
    const clipId = 'rt-particles';
    return (
        <g>
            <clipPath id={clipId}>
                <R.Curve type={curve} points={points} baseLine={base} />
            </clipPath>
            <g
                className="pointer-events-none transition-opacity duration-300 group-data-[fill=off]/plot:opacity-0"
                clipPath={`url(#${clipId})`}
            >
                {list.map((p, i) => (
                    <circle
                        key={i}
                        className="rp-leads-particle"
                        fill="var(--color-current)"
                        cx={plot.x + p.x * plot.width}
                        cy={plot.y + p.y * plot.height}
                        r={p.r}
                        style={
                            {
                                '--leads-particle-fall': `${p.fall * plot.height}px`,
                                '--leads-particle-duration': `${p.duration}s`,
                                '--leads-particle-delay': `${p.delay}s`,
                                '--leads-particle-peak': p.peak,
                            } as any
                        }
                    />
                ))}
            </g>
        </g>
    );
}

/** The hover mark: a stem to the baseline, a soft halo and the dot (zooms in over 200 ms). */
function ActiveMark({ cx, cy }: { cx?: number; cy?: number }) {
    const Motion = useMotion();
    if (cx == null || cy == null) return null;
    const G = Motion && !prefersReducedMotion() ? Motion.motion.g : 'g';
    const anim =
        G === 'g'
            ? {}
            : {
                  initial: { opacity: 0, scale: 0.5 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.2, ease: EASE_OUT },
              };
    return (
        <g className="pointer-events-none">
            <line x1={cx} x2={cx} y1={cy + 7} y2={HEIGHT - AXIS} stroke="var(--color-current)" strokeOpacity={0.55} />
            <G className="origin-center [transform-box:fill-box]" {...anim}>
                <circle cx={cx} cy={cy} r={11} fill="var(--color-current)" fillOpacity={0.14} />
                <circle cx={cx} cy={cy} r={5} fill="var(--color-current)" stroke="var(--card)" strokeWidth={2.5} />
            </G>
        </g>
    );
}

function TooltipBody({ row, year, compare }: { row: any; year: number; compare: boolean }) {
    const delta = row.prior ? (row.current / row.prior - 1) * 100 : 0;
    return (
        <div className="grid w-40 min-w-32 -translate-y-full items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">
                <span className="flex items-center justify-between gap-3">
                    {row.name}
                    {compare ? (
                        <span className={`tabular-nums ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {signedPercent(delta)}
                        </span>
                    ) : null}
                </span>
            </div>
            <div className="grid gap-1.5">
                <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="flex w-full items-center gap-2">
                        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--color-current)" />
                        <span className="flex-1 text-muted-foreground">{year}</span>
                        <span className="font-medium text-foreground tabular-nums">
                            {row.current.toLocaleString('en-US')}
                        </span>
                    </span>
                </div>
                {compare ? (
                    <div className="flex w-full flex-wrap items-center gap-2">
                        <span className="flex w-full items-center gap-2">
                            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span className="flex-1 text-muted-foreground">{year - 1}</span>
                            <span className="font-medium text-foreground tabular-nums">
                                {row.prior.toLocaleString('en-US')}
                            </span>
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function InboundLeads({
    title = 'Inbound Leads',
    data = MONTHLY,
    year = 2025,
    updatedLabel = 'Updated Jan 6, 09:30',
    particles = PARTICLES,
    defaultAccent = 'teal',
    className,
    expandable = true,
}: InboundLeadsProps) {
    const [grain, setGrain] = useState<Grain>('month');
    const [trend, setTrend] = useState<Trend>('linear');
    const [compare, setCompare] = useState(true);
    const [smooth, setSmooth] = useState(true);
    const [points, setPoints] = useState(true);
    const [fill, setFill] = useState(true);
    const [grid, setGrid] = useState(true);
    const [accent, setAccent] = useState(defaultAccent);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [replay, doReplay] = useReplayKey();
    const rootRef = useRef<HTMLDivElement>(null);

    const accents = useMemo(
        () => [{ key: 'teal', light: 'teal-600', dark: 'teal-400' }].concat(ACCENTS.filter((a) => a.key !== 'teal')),
        []
    );
    const acc = accents.find((a) => a.key === accent) || accents[0];
    const config = useMemo(
        () => ({
            current: series(acc.light, acc.dark, String(year)),
            prior: {
                label: String(year - 1),
                theme: {
                    light: 'color-mix(in oklab, var(--muted-foreground) 50%, var(--card))',
                    dark: 'color-mix(in oklab, var(--muted-foreground) 50%, var(--card))',
                },
            },
        }),
        [acc.light, acc.dark, year]
    );

    const rows = useMemo(() => {
        let base: any[] = data;
        if (grain === 'quarter') {
            base = [0, 1, 2, 3].map((q) => {
                const part = data.slice(q * 3, q * 3 + 3);
                return {
                    label: `Q${q + 1}`,
                    name: part.length ? `${part[0].label} to ${part[part.length - 1].label}` : `Q${q + 1}`,
                    current: part.reduce((s, r) => s + r.current, 0),
                    prior: part.reduce((s, r) => s + r.prior, 0),
                };
            });
        }
        const cur = base.map((r) => r.current);
        const [b, a] = linearFit(cur);
        const avg = movingAverage(cur);
        return base.map((r, i) => ({ ...r, linear: a + b * i, average: avg[i] }));
    }, [data, grain]);

    const ticks = niceTicks(Math.max(...rows.map((r) => Math.max(r.current, r.prior))));
    const hi = ticks[ticks.length - 1];
    const slope = linearFit(rows.map((r) => r.current))[0];
    const totalCur = data.reduce((s, r) => s + r.current, 0);
    const totalPrior = data.reduce((s, r) => s + r.prior, 0);
    const delta = totalPrior ? (totalCur / totalPrior - 1) * 100 : 0;
    const unit = grain === 'month' ? 'month' : 'quarter';
    const curveType = smooth ? 'monotone' : 'linear';
    const trendLabel = TRENDS.find((t) => t.value === trend)!.label;

    useEnterAnimation(
        rootRef,
        [
            {
                selector: '.rp-leads-area > .recharts-layer',
                keyframes: { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
                duration: 0.9,
                delay: 0.5,
            },
        ],
        [grain, replay, view, accent]
    );

    const summary = `${title}: ${totalCur.toLocaleString('en-US')} in ${year}, ${signedPercent(delta)} vs ${totalPrior.toLocaleString('en-US')} in ${year - 1}. Linear trend ${slope >= 0 ? '+' : ''}${Math.round(slope)} a ${unit}.`;
    const csv = {
        filename: `inbound-leads-${grain}.csv`,
        rows,
        columns: [
            { key: 'name', label: 'Period' },
            { key: 'current', label: String(year) },
            { key: 'prior', label: String(year - 1) },
        ],
    };

    const grainToggle = useSingleToggle(grain, (v: string) => setGrain(v as Grain));
    const dotClass =
        'pointer-events-none origin-center transition-[opacity,scale] duration-300 ease-out [transform-box:fill-box] group-data-[points=off]/plot:scale-50 group-data-[points=off]/plot:opacity-0';

    return (
        <SeriesScope config={config} className={className}>
            <style>{PARTICLE_CSS}</style>
            <Card className="@container/leads w-full min-w-0">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="col-start-1">
                        <span className="flex items-center gap-1.5">
                            <span
                                className={`inline-flex items-center gap-1 font-medium tabular-nums ${delta >= 0 ? 'text-success' : 'text-destructive'}`}
                            >
                                <Icon name={delta >= 0 ? 'trending-up' : 'trending-down'} className="size-6" />
                                <span className="sr-only">{delta >= 0 ? 'Up' : 'Down'}</span>
                                {Math.abs(delta).toFixed(1)}%
                            </span>
                            vs {year - 1}
                        </span>
                    </CardDescription>
                    <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 justify-self-start @2xl/card-header:col-start-2 @2xl/card-header:row-span-2 @2xl/card-header:row-start-1 @2xl/card-header:mt-0 @2xl/card-header:justify-self-end">
                        <div className="flex flex-wrap items-center gap-2">
                            <ToggleGroup variant="outline" size="sm" aria-label="Granularity" {...grainToggle}>
                                <ToggleGroupItem
                                    value="month"
                                    aria-label="By month"
                                    className="gap-1 text-[0.8rem] text-foreground"
                                >
                                    Month
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="quarter"
                                    aria-label="By quarter"
                                    className="gap-1 text-[0.8rem] text-foreground"
                                >
                                    Quarter
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" size="sm" className="bg-background" />}
                                >
                                    Display
                                    <Icon name="chevron-down" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Compare</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={compare}
                                            onCheckedChange={(c: boolean) => setCompare(c)}
                                            closeOnClick={false}
                                        >
                                            Previous Year
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Curve</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={smooth ? 'smooth' : 'straight'}
                                            onValueChange={(v: any) => setSmooth(v === 'smooth')}
                                        >
                                            <DropdownMenuRadioItem value="smooth">
                                                <Icon name="route" />
                                                Smooth
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="straight">
                                                <Icon name="activity" />
                                                Straight
                                            </DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={points}
                                            onCheckedChange={(c: boolean) => setPoints(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="circle-dot" />
                                            Data Points
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={fill}
                                            onCheckedChange={(c: boolean) => setFill(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="layers" />
                                            Area Fill
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={grid}
                                            onCheckedChange={(c: boolean) => setGrid(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="grid-2x2" />
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
                                            size="sm"
                                            className="bg-background"
                                            aria-label={`Trend line: ${trendLabel}`}
                                        />
                                    }
                                >
                                    {trendLabel}
                                    <Icon name="chevron-down" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Trend Line</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={trend} onValueChange={(v: any) => setTrend(v)}>
                                            {TRENDS.map((t) => (
                                                <DropdownMenuRadioItem key={t.value} value={t.value}>
                                                    <Icon name={t.icon} />
                                                    {t.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <ToolbarGroup aria-label="Chart actions">
                                <AccentPicker
                                    value={accent}
                                    onChange={setAccent}
                                    swatch="var(--color-current)"
                                    options={accents}
                                />
                                <ToolbarButton
                                    icon={<Icon name="refresh-cw" />}
                                    label="Refresh data"
                                    onClick={doReplay}
                                />
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
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <div className="mt-3 mb-2">
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            table={
                                <ChartDataTable
                                    data={rows}
                                    index="name"
                                    indexLabel="Period"
                                    series={[
                                        { key: 'current', label: String(year) },
                                        { key: 'prior', label: String(year - 1) },
                                    ]}
                                    caption={`Inbound leads per ${unit}, ${year} and ${year - 1}`}
                                />
                            }
                        >
                            <div
                                ref={rootRef}
                                data-fill={fill ? 'on' : 'off'}
                                data-grid={grid ? 'on' : 'off'}
                                data-points={points ? 'on' : 'off'}
                                data-compare={compare ? 'on' : 'off'}
                                data-trend={trend}
                                className="group/plot h-72 w-full [&_.recharts-cartesian-grid]:transition-opacity [&_.recharts-cartesian-grid]:duration-300 data-[grid=off]:[&_.recharts-cartesian-grid]:opacity-0"
                            >
                                <ChartContainer config={config} className="aspect-auto h-full w-full">
                                    {(R: any) => (
                                        <R.ComposedChart
                                            data={rows}
                                            margin={{ top: TOP, right: 4, bottom: 0, left: 0 }}
                                            accessibilityLayer
                                        >
                                            <defs>
                                                <linearGradient id="rt-fill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop
                                                        offset="0%"
                                                        stopColor="var(--color-current)"
                                                        stopOpacity={0.2}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="var(--color-current)"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <R.CartesianGrid
                                                horizontal={false}
                                                verticalCoordinatesGenerator={({ offset }: any) => {
                                                    const n = rows.length;
                                                    const left = offset.left + PAD;
                                                    const step = n > 1 ? (offset.width - PAD * 2) / (n - 1) : 0;
                                                    const xs: number[] = [];
                                                    for (let i = 1; i < n - 1; i++) xs.push(left + i * step);
                                                    return xs;
                                                }}
                                            />
                                            <R.XAxis
                                                dataKey="label"
                                                padding={{ left: PAD, right: PAD }}
                                                axisLine={{ stroke: 'var(--border)' }}
                                                tickLine={false}
                                                tickMargin={10}
                                                interval={0}
                                                tick={(t: any) => (
                                                    <text
                                                        x={t.x}
                                                        y={t.y}
                                                        dy="0.71em"
                                                        textAnchor="middle"
                                                        className="fill-muted-foreground"
                                                    >
                                                        {t.payload.value}
                                                    </text>
                                                )}
                                            />
                                            <R.YAxis
                                                width={36}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                domain={[0, hi]}
                                                ticks={ticks}
                                                tickFormatter={tickNumber}
                                            />
                                            <R.Tooltip
                                                cursor={false}
                                                isAnimationActive={false}
                                                position={{ x: 0, y: 0 }}
                                                content={({ active, payload, coordinate }: any) =>
                                                    active && payload && payload.length ? (
                                                        <div
                                                            style={{
                                                                transform: `translate(${(coordinate ? coordinate.x : 0) - 80}px, ${TOP + (1 - payload[0].payload.current / hi) * PLOT_H - 16}px)`,
                                                            }}
                                                        >
                                                            <TooltipBody
                                                                row={payload[0].payload}
                                                                year={year}
                                                                compare={compare}
                                                            />
                                                        </div>
                                                    ) : null
                                                }
                                            />
                                            <R.Area
                                                className="rp-leads-area transition-opacity duration-300 group-data-[fill=off]/plot:opacity-0"
                                                dataKey="current"
                                                type={curveType}
                                                fill="url(#rt-fill)"
                                                fillOpacity={1}
                                                stroke="none"
                                                activeDot={false}
                                                tooltipType="none"
                                                isAnimationActive={false}
                                            />
                                            {R.ZIndexLayer ? (
                                                <R.ZIndexLayer zIndex={150}>
                                                    <Particles R={R} rows={rows} curve={curveType} list={particles} />
                                                </R.ZIndexLayer>
                                            ) : (
                                                <Particles R={R} rows={rows} curve={curveType} list={particles} />
                                            )}
                                            <R.Line
                                                className="transition-opacity duration-300 group-data-[compare=off]/plot:opacity-0"
                                                dataKey="prior"
                                                type={curveType}
                                                stroke="var(--color-prior)"
                                                strokeWidth={1.5}
                                                isAnimationActive={false}
                                                dot={(d: any) => (
                                                    <circle
                                                        key={`p${d.index}`}
                                                        className={dotClass}
                                                        cx={d.cx}
                                                        cy={d.cy}
                                                        r={3.5}
                                                        fill="var(--color-prior)"
                                                        stroke="var(--card)"
                                                        strokeWidth={1.5}
                                                    />
                                                )}
                                                activeDot={(d: any) => (
                                                    <circle
                                                        className="pointer-events-none group-data-[compare=off]/plot:opacity-0"
                                                        cx={d.cx}
                                                        cy={d.cy}
                                                        r={4.5}
                                                        fill="var(--color-prior)"
                                                        stroke="var(--card)"
                                                        strokeWidth={2}
                                                    />
                                                )}
                                            />
                                            <R.Line
                                                className="opacity-0 transition-opacity duration-300 group-data-[trend=linear]/plot:opacity-100"
                                                dataKey="linear"
                                                type="linear"
                                                stroke="var(--color-current)"
                                                strokeWidth={1.5}
                                                strokeDasharray="5 4"
                                                strokeOpacity={0.7}
                                                dot={false}
                                                activeDot={false}
                                                tooltipType="none"
                                                isAnimationActive={false}
                                            />
                                            <R.Line
                                                className="opacity-0 transition-opacity duration-300 group-data-[trend=average]/plot:opacity-100"
                                                dataKey="average"
                                                type="monotone"
                                                stroke="var(--color-current)"
                                                strokeWidth={1.5}
                                                strokeDasharray="5 4"
                                                strokeOpacity={0.7}
                                                dot={false}
                                                activeDot={false}
                                                tooltipType="none"
                                                isAnimationActive={false}
                                            />
                                            <R.Line
                                                dataKey="current"
                                                type={curveType}
                                                stroke="var(--color-current)"
                                                strokeWidth={2}
                                                isAnimationActive={false}
                                                dot={(d: any) => (
                                                    <circle
                                                        key={`c${d.index}`}
                                                        data-dot="current"
                                                        className={dotClass}
                                                        cx={d.cx}
                                                        cy={d.cy}
                                                        r={4}
                                                        fill="var(--color-current)"
                                                        stroke="var(--card)"
                                                        strokeWidth={2}
                                                    />
                                                )}
                                                activeDot={(d: any) => <ActiveMark cx={d.cx} cy={d.cy} />}
                                            />
                                        </R.ComposedChart>
                                    )}
                                </ChartContainer>
                            </div>
                        </ChartFigure>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center border-t">
                    <div className="flex w-full flex-col items-start gap-3 @md/leads:flex-row @md/leads:items-center @md/leads:justify-between">
                        <ul aria-label="Series" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                            <li className="flex items-center gap-1.5">
                                <span className="size-2 shrink-0 rounded-full bg-(--color-current)" />
                                <span className="text-muted-foreground">{year}</span>
                                <span className="font-medium text-foreground tabular-nums">
                                    {totalCur.toLocaleString('en-US')}
                                </span>
                            </li>
                            {compare ? (
                                <li className="flex items-center gap-1.5">
                                    <span className="size-2 shrink-0 rounded-full bg-muted-foreground/50" />
                                    <span className="text-muted-foreground">{year - 1}</span>
                                    <span className="font-medium text-foreground tabular-nums">
                                        {totalPrior.toLocaleString('en-US')}
                                    </span>
                                </li>
                            ) : null}
                        </ul>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                            {trend !== 'none' ? (
                                <>
                                    <ul aria-label="Trend" className="flex items-center text-xs">
                                        <li className="flex items-center gap-1.5">
                                            <svg
                                                aria-hidden="true"
                                                viewBox="0 0 16 2"
                                                className="h-0.5 w-4 shrink-0 text-(--color-current)"
                                            >
                                                <line
                                                    x1="0"
                                                    x2="16"
                                                    y1="1"
                                                    y2="1"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeDasharray="4 2"
                                                />
                                            </svg>
                                            <span className="text-muted-foreground">
                                                {trend === 'linear' ? 'Linear trend' : `3-${unit} average`}
                                            </span>
                                            {trend === 'linear' ? (
                                                <span className="font-medium text-foreground tabular-nums">{`${slope >= 0 ? '+' : '-'}${Math.abs(Math.round(slope))} a ${unit}`}</span>
                                            ) : null}
                                        </li>
                                    </ul>
                                    <span className="size-1 rounded-full bg-muted-foreground/40" />
                                </>
                            ) : null}
                            <span>{updatedLabel}</span>
                        </div>
                    </div>
                </CardFooter>
            </Card>
            {expandable ? (
                <ChartExpandDialog open={expanded} onOpenChange={setExpanded} title={title}>
                    <InboundLeads
                        title={title}
                        data={data}
                        year={year}
                        updatedLabel={updatedLabel}
                        particles={particles}
                        defaultAccent={accent}
                        expandable={false}
                    />
                </ChartExpandDialog>
            ) : null}
        </SeriesScope>
    );
}

export default InboundLeads;
