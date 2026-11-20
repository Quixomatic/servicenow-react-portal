import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from 'components:card';
import { ChartToolbar, ToolbarGroup, ToolbarSelect, ChartMoreMenu } from 'components:chart-frame';
import { Icon } from 'components:icon';
import {
    series,
    SeriesScope,
    useEnterAnimation,
    useReplayKey,
    useElementWidth,
    AccentPicker,
    ACCENTS,
} from 'components:charts/chart-kit';
import {
    TEXT_TRIM,
    usd,
    signedUsd,
    usdTick,
    TipRow,
    TipSection,
    DeltaPair,
    StatusBadge,
    DotSwatch,
    DashSwatch,
    MetaDot,
    ToggleMenu,
    RefreshButton,
    ExpandButton,
    ExpandDialog,
    copyCsv,
} from 'components:charts/composed-kit';
import { MONTHS, OPENING, RANGES } from './data';
import type { SalesMonth, RangeKey } from './data';

/**
 * components:charts/sales-vs-goal: closed sales per month (area + line with points) against a dashed
 * goal line and last year's line, a dashed marker at the last quarter close, a range menu (full year,
 * year to date, last 6 months), a Display menu (goal / prior year / fill / points / grid / marker),
 * an accent picker, refresh / expand, CSV / copy exports and a tooltip with attainment, the change vs
 * the month before and the running YTD totals.
 *
 *   <SalesVsGoal />                                   sample data
 *   <SalesVsGoal data={[{ month, label, sales, goal, prior }]} marker={{ label: 'Q3 Close', at: 'Sep' }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SalesVsGoalProps = {
    title?: string;
    data?: SalesMonth[];
    opening?: { label: string; sales: number };
    priorLabel?: string;
    marker?: { label: string; at: string } | null;
    defaultRange?: RangeKey;
    updatedLabel?: string;
    caption?: string;
    className?: string;
};

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';
const LAYERS = ['goal', 'prior', 'fill', 'points', 'grid', 'marker'];
const sum = (rows: SalesMonth[], k: 'sales' | 'goal' | 'prior') => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

function SalesTooltip({ row, data, opening, priorLabel, on }: any) {
    const idx = data.findIndex((r: SalesMonth) => r.label === row.label);
    const closed = data.filter((r: SalesMonth) => r.sales != null);
    const upto = data.slice(0, idx + 1);
    const ytdSales = sum(
        upto.filter((r: SalesMonth) => r.sales != null),
        'sales'
    );
    const show = (k: string) => on.indexOf(k) >= 0;
    if (row.sales == null) {
        const goalBy = sum(upto, 'goal');
        return (
            <TipShell month={row.month} badge={<StatusBadge tone="muted">Upcoming</StatusBadge>}>
                {show('goal') ? (
                    <TipRow swatch={<DashSwatch color="var(--color-goal)" />} label="Goal" value={usd(row.goal)} />
                ) : null}
                <div className="flex w-full flex-wrap items-center gap-2">
                    <div className="flex flex-1 flex-col gap-2">
                        {show('prior') ? (
                            <TipRow
                                swatch={<DotSwatch className="bg-muted-foreground/50" />}
                                label={priorLabel}
                                value={usd(row.prior)}
                            />
                        ) : null}
                        <TipSection>
                            <TipRow label="YTD Sales" value={usd(sum(closed, 'sales'))} valueClassName="" />
                            <TipRow label={`Goal by ${row.label}`} value={usd(goalBy)} valueClassName="" />
                            <TipRow
                                label="Still Needed"
                                value={usd(Math.max(0, goalBy - ytdSales))}
                                valueClassName=""
                            />
                        </TipSection>
                    </div>
                </div>
            </TipShell>
        );
    }
    const prev = idx > 0 ? data[idx - 1] : { label: opening.label, sales: opening.sales };
    const diff = row.sales - row.goal;
    const change = row.sales - (prev.sales || 0);
    const ytdGoal = sum(upto, 'goal');
    const ytdDiff = ytdSales - ytdGoal;
    return (
        <TipShell
            month={row.month}
            badge={
                <StatusBadge tone={diff >= 0 ? 'success' : 'destructive'}>
                    {diff >= 0 ? 'Above Goal' : 'Below Goal'}
                </StatusBadge>
            }
        >
            <TipRow swatch={<DotSwatch color="var(--color-sales)" />} label="Sales" value={usd(row.sales)} />
            {show('goal') ? (
                <TipRow swatch={<DashSwatch color="var(--color-goal)" />} label="Goal" value={usd(row.goal)} />
            ) : null}
            <div className="flex w-full flex-wrap items-center gap-2">
                <div className="flex flex-1 flex-col gap-2">
                    {show('prior') ? (
                        <TipRow
                            swatch={<DotSwatch className="bg-muted-foreground/50" />}
                            label={priorLabel}
                            value={usd(row.prior)}
                        />
                    ) : null}
                    <div className="flex flex-col gap-1.5">
                        <TipSection>
                            <TipRow
                                label="Attainment"
                                value={
                                    <DeltaPair
                                        delta={signedUsd(diff)}
                                        pct={`${((row.sales / row.goal) * 100).toFixed(1)}%`}
                                        good={diff >= 0}
                                    />
                                }
                                valueClassName=""
                            />
                            <TipRow
                                label={`vs ${prev.label}`}
                                value={signedUsd(change)}
                                valueClassName={change >= 0 ? 'text-success' : 'text-destructive'}
                            />
                        </TipSection>
                        <TipSection>
                            <TipRow label="YTD Sales" value={usd(ytdSales)} valueClassName="" />
                            <TipRow
                                label="YTD Attainment"
                                value={
                                    <DeltaPair
                                        delta={signedUsd(ytdDiff)}
                                        pct={`${((ytdSales / ytdGoal) * 100).toFixed(1)}%`}
                                        good={ytdDiff >= 0}
                                    />
                                }
                                valueClassName=""
                            />
                        </TipSection>
                    </div>
                </div>
            </div>
        </TipShell>
    );
}

/** The hover cursor: a full-height muted rule at the active month. */
export function CursorLine({ points }: { points?: { x: number; y: number }[] }) {
    if (!points || points.length < 2) return null;
    return (
        <line
            x1={points[0].x}
            x2={points[1].x}
            y1={points[0].y}
            y2={points[1].y}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.4}
            className="pointer-events-none"
        />
    );
}

function TipShell({ month, badge, children }: { month: string; badge: any; children?: any }) {
    return (
        <div className="grid w-60 min-w-32 items-start gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">
                <span className="flex h-5 items-center justify-between gap-3">
                    <span className={TEXT_TRIM}>{month}</span>
                    {badge}
                </span>
            </div>
            <div className="grid gap-1.5">{children}</div>
        </div>
    );
}

export function SalesVsGoal({
    title = 'Sales vs Goal',
    data = MONTHS,
    opening = OPENING,
    priorLabel = '2025',
    marker = { label: 'Q3 Close', at: 'Sep' },
    defaultRange = 'full',
    updatedLabel = 'Updated Oct 1, 09:30',
    caption = 'Sales against goal per month',
    className,
}: SalesVsGoalProps) {
    const [range, setRange] = useState<RangeKey>(defaultRange);
    const [on, setOn] = useState<string[]>(LAYERS);
    const [accent, setAccent] = useState('teal');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [replay, doReplay] = useReplayKey();
    const acc = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];

    const config = useMemo(
        () => ({
            sales: series(acc.light, acc.dark, 'Sales'),
            goal: series('pink-500', 'pink-400', 'Goal'),
            prior: series(
                'color-mix(in oklab, var(--muted-foreground) 50%, var(--card))',
                'color-mix(in oklab, var(--muted-foreground) 50%, var(--card))',
                priorLabel
            ),
        }),
        [acc.light, acc.dark, priorLabel]
    );

    const closedAll = data.filter((r) => r.sales != null);
    const rows = useMemo(() => {
        if (range === 'full') return data;
        const lastClosed = data.reduce((a, r, i) => (r.sales != null ? i : a), -1);
        const end = lastClosed + 1;
        return data.slice(range === '6m' ? Math.max(0, end - 6) : 0, end);
    }, [data, range]);
    const closed = rows.filter((r) => r.sales != null);
    const salesTotal = sum(closed, 'sales');
    const goalTotal = sum(closed, 'goal');
    const priorTotal = sum(closed, 'prior');
    const vsGoal = goalTotal ? (salesTotal / goalTotal - 1) * 100 : 0;
    const annualGoal = sum(data, 'goal');
    const ytd = sum(closedAll, 'sales');

    const max = Math.max(...data.map((r) => Math.max(r.sales || 0, r.goal, r.prior)));
    const hi = Math.ceil(max / 200000) * 200000 || 200000;
    const ticks: number[] = [];
    for (let v = 0; v <= hi; v += hi / 4) ticks.push(v);

    const show = (k: string) => on.indexOf(k) >= 0;
    const toggle = (k: string, v: boolean) => setOn((cur) => (v ? cur.concat(k) : cur.filter((x) => x !== k)));
    const firstLabel = rows[0] ? rows[0].label : '';
    const lastLabel = rows.length ? rows[rows.length - 1].label : '';
    const year = rows[0] ? rows[0].month.split(' ').pop() : '';
    const tableCaption = `${caption}, ${firstLabel} to ${lastLabel} ${year}`;
    const summary = `${title}: ${usd(salesTotal)} closed, ${Math.abs(vsGoal).toFixed(1)}% ${vsGoal >= 0 ? 'above' : 'below'} the ${usd(goalTotal)} goal for ${firstLabel} to ${closed.length ? closed[closed.length - 1].label : lastLabel}; ${priorLabel} ${usd(priorTotal)}. ${Math.round((ytd / annualGoal) * 100)}% of the ${usd(annualGoal)} annual goal.`;
    const csvColumns = [
        { key: 'month', label: 'Period' },
        { key: 'sales', label: 'Sales', value: (r: SalesMonth) => (r.sales == null ? '' : r.sales) },
        { key: 'goal', label: 'Goal' },
        { key: 'prior', label: priorLabel },
    ];
    const reset = () => {
        setRange(defaultRange);
        setOn(LAYERS);
        setAccent('teal');
        setView('chart');
    };

    const plot = (height: string, animate: boolean) => (
        <SalesPlot
            key={`${range}-${replay}-${animate ? 'a' : 'b'}`}
            rows={rows}
            data={data}
            opening={opening}
            priorLabel={priorLabel}
            marker={marker && rows.some((r) => r.label === marker.at) ? marker : null}
            on={on}
            hi={hi}
            ticks={ticks}
            config={config}
            height={height}
        />
    );

    return (
        <SeriesScope config={config} className={className}>
            <Card className="@container/sales w-full max-w-4xl min-w-0">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="col-start-1">
                        <span className="flex h-5 items-center gap-1.5">
                            <span
                                className={`inline-flex items-center gap-1 font-medium tabular-nums ${vsGoal >= 0 ? 'text-success' : 'text-destructive'}`}
                            >
                                <Icon name={vsGoal >= 0 ? 'trending-up' : 'trending-down'} />
                                <span className={TEXT_TRIM}>{Math.abs(vsGoal).toFixed(1)}%</span>
                            </span>
                            <span className={TEXT_TRIM}>{vsGoal >= 0 ? 'above goal' : 'below goal'}</span>
                            <MetaDot />
                            <span className={`tabular-nums ${TEXT_TRIM}`}>{usd(salesTotal)} closed</span>
                        </span>
                    </CardDescription>
                    <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 justify-self-start @2xl/card-header:col-start-2 @2xl/card-header:row-span-2 @2xl/card-header:row-start-1 @2xl/card-header:mt-0 @2xl/card-header:justify-self-end">
                        <ChartToolbar>
                            <ToolbarSelect
                                label="Range"
                                menuLabel="Range"
                                icon={null}
                                value={range}
                                onValueChange={(v: RangeKey) => setRange(v)}
                                options={RANGES.map((r) => ({
                                    value: r.value,
                                    label: r.label,
                                    icon: <Icon name={r.icon} />,
                                }))}
                            />
                            <ToggleMenu
                                groups={[
                                    {
                                        label: 'Compare',
                                        items: [
                                            {
                                                key: 'goal',
                                                label: 'Goal Line',
                                                icon: (
                                                    <span className="flex size-4 items-center justify-center">
                                                        <DashSwatch color="var(--color-goal)" />
                                                    </span>
                                                ),
                                            },
                                            {
                                                key: 'prior',
                                                label: 'Prior Year',
                                                icon: (
                                                    <span className="flex size-4 items-center justify-center">
                                                        <DotSwatch className="bg-muted-foreground/50" />
                                                    </span>
                                                ),
                                            },
                                        ],
                                    },
                                    {
                                        label: 'Layers',
                                        items: [
                                            { key: 'fill', label: 'Area Fill', icon: <Icon name="layers" /> },
                                            { key: 'points', label: 'Data Points', icon: <Icon name="circle-dot" /> },
                                            { key: 'grid', label: 'Gridlines', icon: <Icon name="grid-2x2" /> },
                                            { key: 'marker', label: 'Quarter Close', icon: <Icon name="flag" /> },
                                        ],
                                    },
                                ]}
                                value={on}
                                onToggle={toggle}
                            />
                            <ToolbarGroup aria-label="Chart actions">
                                <AccentPicker
                                    value={accent}
                                    onChange={setAccent}
                                    swatch="var(--color-sales)"
                                    label="Sales color"
                                />
                                <RefreshButton onClick={doReplay} />
                                <ExpandButton onClick={() => setExpanded(true)} />
                                <ChartMoreMenu
                                    title={title}
                                    csv={{ filename: 'sales-vs-goal.csv', rows, columns: csvColumns }}
                                    summary={summary}
                                    items={[
                                        {
                                            label: 'Copy data',
                                            icon: <Icon name="copy" />,
                                            onSelect: () => copyCsv(rows, csvColumns),
                                        },
                                        { type: 'separator' },
                                        {
                                            label: view === 'table' ? 'View as chart' : 'View as table',
                                            icon: <Icon name={view === 'table' ? 'chart-area' : 'table'} />,
                                            onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                        },
                                        {
                                            label: 'Expand chart',
                                            icon: <Icon name="maximize-2" />,
                                            onSelect: () => setExpanded(true),
                                        },
                                        { label: 'Reset view', icon: <Icon name="rotate-ccw" />, onSelect: reset },
                                    ]}
                                />
                            </ToolbarGroup>
                        </ChartToolbar>
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
                                    index="month"
                                    indexLabel="Period"
                                    series={[
                                        { key: 'sales', label: 'Sales' },
                                        { key: 'goal', label: 'Goal' },
                                        { key: 'prior', label: priorLabel },
                                    ]}
                                    valueFormatter={(v: number) => (v == null ? 'Not closed' : usd(v))}
                                    caption={tableCaption}
                                />
                            }
                        >
                            {plot('h-72', true)}
                        </ChartFigure>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full flex-col items-start gap-3 @md/sales:flex-row @md/sales:items-center @md/sales:justify-between">
                        <ul aria-label="Series" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                            <li className="flex h-4 items-center gap-1.5 transition-colors duration-200">
                                <DotSwatch color="var(--color-sales)" />
                                <span className={`text-muted-foreground ${TEXT_TRIM}`}>Sales</span>
                                <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{usd(salesTotal)}</span>
                            </li>
                            {show('goal') ? (
                                <li className="flex h-4 items-center gap-1.5 transition-colors duration-200">
                                    <DashSwatch color="var(--color-goal)" />
                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>Goal</span>
                                    <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{usd(goalTotal)}</span>
                                </li>
                            ) : null}
                            {show('prior') ? (
                                <li className="flex h-4 items-center gap-1.5 transition-colors duration-200">
                                    <DotSwatch className="bg-muted-foreground/50" />
                                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>{priorLabel}</span>
                                    <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{usd(priorTotal)}</span>
                                </li>
                            ) : null}
                        </ul>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                            <span className="flex h-4 items-center tabular-nums">
                                <span className={TEXT_TRIM}>
                                    {Math.round((ytd / annualGoal) * 100)}% of {usd(annualGoal)} annual goal
                                </span>
                            </span>
                            <MetaDot />
                            <span className="flex h-4 items-center tabular-nums">
                                <span className={TEXT_TRIM}>{updatedLabel}</span>
                            </span>
                        </div>
                    </div>
                </CardFooter>
            </Card>
            <ExpandDialog open={expanded} onOpenChange={setExpanded} title={title}>
                <SeriesScope config={config} className="p-2">
                    {plot('h-[60vh]', false)}
                </SeriesScope>
            </ExpandDialog>
        </SeriesScope>
    );
}

function SalesPlot({ rows, data, opening, priorLabel, marker, on, hi, ticks, config, height }: any) {
    const rootRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(rootRef);
    const show = (k: string) => on.indexOf(k) >= 0;
    const closedCount = rows.filter((r: SalesMonth) => r.sales != null).length;
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '.c20-sales .recharts-line-curve',
                keyframes: { clipPath: ['inset(-8px 100% -8px -8px)', 'inset(-8px -8px -8px -8px)'] },
                duration: 0.36,
            },
            {
                selector: '.c20-fill',
                keyframes: { transform: ['translateY(8px)', 'translateY(0px)'], opacity: [0, 1] },
                duration: 0.32,
                delay: 0.08,
            },
            {
                selector: '.c20-dot',
                keyframes: { transform: ['scale(0.6)', 'scale(1)'], opacity: [0, 1] },
                style: { 'transform-box': 'fill-box', 'transform-origin': 'center' },
                duration: 0.16,
                delay: (i) => (closedCount > 1 ? (0.32 * i) / (closedCount - 1) : 0),
            },
            {
                selector: '.c20-marker',
                keyframes: { transform: ['translateY(-4px)', 'translateY(0px)'], opacity: [0, 1] },
                duration: 0.16,
                delay: 0.36,
            },
        ],
        []
    );
    return (
        <div
            ref={rootRef}
            data-goal={show('goal') ? 'on' : 'off'}
            data-prior={show('prior') ? 'on' : 'off'}
            data-fill={show('fill') ? 'on' : 'off'}
            data-points={show('points') ? 'on' : 'off'}
            data-grid={show('grid') ? 'on' : 'off'}
            data-marker={show('marker') ? 'on' : 'off'}
            className={`group/c20 w-full outline-offset-4 outline-ring/50 [-webkit-tap-highlight-color:transparent] has-[.recharts-surface:focus-visible]:outline-2 [&_g]:outline-hidden [&_.recharts-cartesian-grid]:transition-opacity [&_.recharts-cartesian-grid]:duration-200 data-[grid=off]:[&_.recharts-cartesian-grid]:opacity-0 ${height}`}
        >
            <ChartContainer config={config} className="aspect-auto h-full w-full">
                {(R: any) => (
                    <R.ComposedChart data={rows} margin={{ top: 28, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
                        <defs>
                            <linearGradient id="rp-c20-fill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-sales)" stopOpacity={0.22} />
                                <stop offset="100%" stopColor="var(--color-sales)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <R.CartesianGrid vertical={false} />
                        <R.XAxis
                            dataKey="label"
                            axisLine={{ stroke: 'var(--border)' }}
                            tickLine={false}
                            tickMargin={10}
                            interval={0}
                            padding={{ left: 16, right: 16 }}
                            tick={(t: any) => (
                                <text x={t.x} y={t.y} dy="0.71em" textAnchor="middle" className="fill-muted-foreground">
                                    {t.payload.value}
                                </text>
                            )}
                        />
                        <R.YAxis
                            width={54}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            domain={[0, hi]}
                            ticks={ticks}
                            tickFormatter={usdTick}
                        />
                        <R.Tooltip
                            isAnimationActive={false}
                            position={{ y: 28 }}
                            offset={12}
                            cursor={<CursorLine />}
                            content={({ active, payload }: any) =>
                                active && payload && payload.length ? (
                                    <SalesTooltip
                                        row={payload[0].payload}
                                        data={data}
                                        opening={opening}
                                        priorLabel={priorLabel}
                                        on={on}
                                    />
                                ) : null
                            }
                        />
                        <R.Area
                            dataKey="sales"
                            type="monotone"
                            stroke="none"
                            fill="url(#rp-c20-fill)"
                            className={`c20-fill pointer-events-none transition-opacity duration-200 ${EASE} group-data-[fill=off]/c20:opacity-0`}
                            isAnimationActive={false}
                            activeDot={false}
                            dot={false}
                            legendType="none"
                            tooltipType="none"
                        />
                        {marker ? (
                            <R.ReferenceLine
                                x={marker.at}
                                ifOverflow="visible"
                                shape={(p: any) => {
                                    const x = p.x1 != null ? p.x1 : 0;
                                    const top = Math.min(p.y1, p.y2);
                                    const bottom = Math.max(p.y1, p.y2);
                                    const tx = width ? Math.min(Math.max(x, 30), width - 30) : x;
                                    return (
                                        <g
                                            aria-hidden="true"
                                            className={`pointer-events-none transition-opacity duration-200 ${EASE} group-data-[marker=off]/c20:opacity-0`}
                                        >
                                            <g className="c20-marker">
                                                <line
                                                    x1={x}
                                                    x2={x}
                                                    y1={top - 6}
                                                    y2={bottom}
                                                    stroke="var(--muted-foreground)"
                                                    strokeOpacity={0.55}
                                                    strokeDasharray="3 3"
                                                />
                                                <text
                                                    x={tx}
                                                    y={top - 12}
                                                    textAnchor="middle"
                                                    className="fill-muted-foreground font-medium"
                                                >
                                                    {marker.label}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                }}
                            />
                        ) : null}
                        <R.Line
                            dataKey="prior"
                            type="monotone"
                            stroke="var(--color-prior)"
                            strokeWidth={1.5}
                            dot={false}
                            className={`transition-opacity duration-200 ${EASE} group-data-[prior=off]/c20:opacity-0`}
                            isAnimationActive={false}
                            activeDot={(d: any) =>
                                show('prior') ? (
                                    <circle
                                        cx={d.cx}
                                        cy={d.cy}
                                        r={3.5}
                                        fill="var(--color-prior)"
                                        stroke="var(--card)"
                                        strokeWidth={1.5}
                                    />
                                ) : (
                                    <g />
                                )
                            }
                        />
                        <R.Line
                            dataKey="goal"
                            type="monotone"
                            stroke="var(--color-goal)"
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            dot={false}
                            className={`transition-opacity duration-200 ${EASE} group-data-[goal=off]/c20:opacity-0`}
                            isAnimationActive={false}
                            activeDot={(d: any) =>
                                show('goal') ? (
                                    <circle
                                        cx={d.cx}
                                        cy={d.cy}
                                        r={4}
                                        fill="var(--card)"
                                        stroke="var(--color-goal)"
                                        strokeWidth={2}
                                    />
                                ) : (
                                    <g />
                                )
                            }
                        />
                        <R.Line
                            dataKey="sales"
                            type="monotone"
                            stroke="var(--color-sales)"
                            strokeWidth={2.5}
                            className="c20-sales"
                            isAnimationActive={false}
                            dot={(d: any) =>
                                d.value == null ? (
                                    <g key={`d${d.index}`} />
                                ) : (
                                    <g key={`d${d.index}`} className="c20-dot pointer-events-none">
                                        <circle
                                            cx={d.cx}
                                            cy={d.cy}
                                            r={3}
                                            fill="var(--color-sales)"
                                            className={`origin-center transition-[opacity,scale] duration-200 ${EASE} [transform-box:fill-box] group-data-[points=off]/c20:scale-50 group-data-[points=off]/c20:opacity-0 motion-reduce:transition-opacity`}
                                        />
                                    </g>
                                )
                            }
                            activeDot={(d: any) => (
                                <g className="pointer-events-none">
                                    <circle cx={d.cx} cy={d.cy} r={11} fill="var(--color-sales)" fillOpacity={0.14} />
                                    <circle
                                        cx={d.cx}
                                        cy={d.cy}
                                        r={5}
                                        fill="var(--color-sales)"
                                        stroke="var(--card)"
                                        strokeWidth={2.5}
                                    />
                                </g>
                            )}
                        />
                    </R.ComposedChart>
                )}
            </ChartContainer>
        </div>
    );
}

export default SalesVsGoal;
