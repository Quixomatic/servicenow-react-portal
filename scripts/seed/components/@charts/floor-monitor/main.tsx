import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, useRecharts } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
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
} from 'components:dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation } from 'components:charts/chart-kit';
import {
    TRIM,
    FADE,
    LineSwatch,
    IconTile,
    TipShell,
    TipHeader,
    TipRow,
    TipValue,
    StatGrid,
    MetaRow,
    RangeTabs,
    DRAW_X,
    useIntro,
    fmtDay,
    fmtDate,
    fmtLong,
    fmtMonth,
    pct,
} from 'components:charts/line-kit';
import { DAYS, RANGES } from './data';
import type { FloorRow, FloorRange } from './data';

/**
 * components:charts/floor-monitor: an NFT collection's floor price (lowest ask) against the top bid,
 * with the spread between them as a shaded band and a floor alert level: closes below the alert turn
 * the floor line red. Ranges 7D / 30D / 90D / 1Y, an alert popover (level + notify switch), the
 * alert as a labelled reference line on the price axis, KPI tiles (volume, sales, average spread, off
 * high) and CSV / copy exports.
 *
 *   <FloorMonitor />                                                    sample data
 *   <FloorMonitor data={[['2026-10-16', 2.418, 2.355, 3248.4, 24, 65], …]} defaultAlert={2.3} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type FloorMonitorProps = {
    title?: string;
    description?: string;
    icon?: string;
    data?: FloorRow[];
    ranges?: FloorRange[];
    defaultRange?: string;
    defaultAlert?: number;
    unit?: string;
    sourceNote?: string[];
    className?: string;
};

const PLOT_TOP = 16;
const PLOT_HEIGHT = 288 - 30 - PLOT_TOP;

function eth(v: number, unit: string, digits = 3): string {
    return `${v.toFixed(digits)} ${unit}`;
}

function usd(v: number): string {
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function usdM(v: number): string {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return usd(v);
}

function signedEth(v: number, unit: string): string {
    const r = Number(Math.abs(v).toFixed(3));
    return `${v < 0 && r !== 0 ? '-' : r !== 0 ? '+' : ''}${Math.abs(v).toFixed(3)} ${unit}`;
}

/**
 * Price axis ticks: the smallest step of 1 / 2.5 / 5 × 10^k whose step-aligned span covers [lo, hi] in
 * at most 5 intervals (2.00 to 2.75 by 0.25, 1.00 to 3.50 by 0.50, 2.10 to 2.50 by 0.10).
 */
function priceTicks(lo: number, hi: number): number[] {
    const span = hi - lo || Math.abs(hi) || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(span / 5)));
    for (const m of [1, 2.5, 5, 10, 25, 50]) {
        const step = m * mag;
        const a = Math.floor(lo / step + 1e-9) * step;
        const b = Math.ceil(hi / step - 1e-9) * step;
        const n = Math.round((b - a) / step);
        if (n <= 5) {
            const out: number[] = [];
            for (let i = 0; i <= n; i++) out.push(Number((a + step * i).toFixed(6)));
            return out;
        }
    }
    return [lo, hi];
}

/** The alert level as a pill on the price axis (right). */
function AlertPill({ value, domain, active }: { value: number; domain: number[]; active: boolean }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot || !active || value < domain[0] || value > domain[1]) return null;
    const y = plot.y + ((domain[1] - value) / (domain[1] - domain[0])) * plot.height;
    const x = plot.x + plot.width + 2;
    return (
        <g className="pointer-events-none">
            <rect fill="var(--card)" rx={9} x={x} y={y - 9} width={40} height={18} />
            <rect fill="var(--muted)" stroke="var(--border)" rx={8.5} x={x + 0.5} y={y - 8.5} width={39} height={17} />
            <text
                className="fill-foreground text-xs font-medium tabular-nums"
                x={x + 20}
                y={y}
                dy="0.35em"
                textAnchor="middle"
            >
                {value.toFixed(2)}
            </text>
        </g>
    );
}

/** The last close's halo dot. */
function LastDot({ rows, domain }: { rows: any[]; domain: number[] }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot || !rows.length) return null;
    const last = rows[rows.length - 1];
    const cx = plot.x + plot.width;
    const cy = plot.y + ((domain[1] - last.floor) / (domain[1] - domain[0])) * plot.height;
    return (
        <g className={`pointer-events-none ${FADE} group-data-[intro=drawing]/c26:opacity-0`}>
            <circle fill="var(--color-floor)" fillOpacity={0.16} cx={cx} cy={cy} r={7} />
            <circle fill="var(--color-floor)" stroke="var(--card)" strokeWidth={1.5} cx={cx} cy={cy} r={3.5} />
        </g>
    );
}

export function FloorMonitor({
    title = 'Floor Price',
    description = 'Lumen Keys, 8,888 items',
    icon = 'image',
    data = DAYS,
    ranges = RANGES,
    defaultRange = '90D',
    defaultAlert = 2.3,
    unit = 'ETH',
    sourceNote = ['Lowest ask', '6 marketplaces'],
    className,
}: FloorMonitorProps) {
    const initialRange = ranges.some((r) => r.key === defaultRange) ? defaultRange : ranges[0].key;
    const [rangeKey, setRangeKey] = useState(initialRange);
    const [alert, setAlert] = useState(defaultAlert);
    const [armed, setArmed] = useState(true);
    const [draft, setDraft] = useState(defaultAlert.toFixed(2));
    const [draftArmed, setDraftArmed] = useState(true);
    const [alertOpen, setAlertOpen] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];

    const config = useMemo(
        () => ({
            floor: series('sky-600', 'sky-400', 'Floor'),
            bid: series('slate-400', 'slate-500', 'Top Bid'),
            breach: series('red-600', 'red-400', 'Below Alert'),
        }),
        []
    );

    const model = useMemo(() => {
        const slice = data.slice(-Math.min(range.days, data.length));
        const rows = slice.map((d) => ({
            date: d[0],
            floor: d[1],
            bid: d[2],
            band: [d[2], d[1]],
            price: d[3],
            sales: d[4],
            volume: d[5],
            spread: d[1] - d[2],
            spreadPct: d[1] ? ((d[1] - d[2]) / d[1]) * 100 : 0,
        }));
        const first = rows[0];
        const last = rows[rows.length - 1];
        let hi = 0;
        rows.forEach((r, i) => {
            if (r.floor > rows[hi].floor) hi = i;
        });
        const volume = rows.reduce((t, r) => t + r.volume, 0);
        const volumeUsd = rows.reduce((t, r) => t + r.volume * r.price, 0);
        const sales = rows.reduce((t, r) => t + r.sales, 0);
        const avgSpread = rows.reduce((t, r) => t + r.spreadPct, 0) / (rows.length || 1);
        return { rows, first, last, hi, volume, volumeUsd, sales, avgSpread };
    }, [data, range.days]);
    const { rows, first, last, hi } = model;

    const values = rows.flatMap((r) => [r.floor, r.bid]).concat(armed ? [alert] : []);
    const ticks = priceTicks(Math.min(...values), Math.max(...values));
    const domain = [ticks[0], ticks[ticks.length - 1]];
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    const shownTicks = armed ? ticks.filter((t) => Math.abs(t - alert) > step * 0.3) : ticks;
    const split = Math.min(1, Math.max(0, (domain[1] - alert) / (domain[1] - domain[0] || 1)));
    const below = armed && rows.some((r) => r.floor < alert);

    const xTicks: string[] = [];
    if (range.tickEvery > 0) {
        for (let i = rows.length - 1; i >= 0; i -= range.tickEvery) xTicks.unshift(rows[i].date);
    } else {
        for (let i = 1; i < rows.length; i++)
            if (rows[i].date.slice(0, 7) !== rows[i - 1].date.slice(0, 7)) xTicks.push(rows[i].date);
    }

    const rootRef = useRef<HTMLDivElement>(null);
    const intro = useIntro([rangeKey, view], 480);
    useEnterAnimation(
        rootRef,
        [
            { selector: '.recharts-line', keyframes: DRAW_X, duration: 0.45, delay: 0, ease: [0.42, 0, 0.58, 1] },
            { selector: '.recharts-area', keyframes: DRAW_X, duration: 0.45, delay: 0, ease: [0.42, 0, 0.58, 1] },
        ],
        [rangeKey, view]
    );

    const change = last.floor - first.floor;
    const changePct = first.floor ? (change / first.floor) * 100 : 0;
    const offHigh = rows[hi].floor ? (last.floor / rows[hi].floor - 1) * 100 : 0;
    const summary = `Daily floor price ${range.phrase}, from ${eth(first.floor, unit)} to ${eth(
        last.floor,
        unit
    )}, with the top bid as a dashed line${armed ? ` and an alert at ${alert.toFixed(2)} ${unit}` : ''}.`;
    const copySummary = `${title} (${description}): ${eth(last.floor, unit)} (${pct(changePct)}) ${range.phrase}. Top bid ${eth(
        last.bid,
        unit
    )}, ${last.spreadPct.toFixed(2)}% spread. Volume ${model.volume.toFixed(1)} ${unit}, ${model.sales.toLocaleString(
        'en-US'
    )} sales.${armed ? ` Alert at ${alert.toFixed(2)} ${unit}.` : ''}`;
    const exportRows = rows.map((r) => ({
        date: r.date,
        floor: r.floor,
        bid: r.bid,
        spread: Number(r.spread.toFixed(3)),
        sales: r.sales,
        volume: r.volume,
    }));
    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'floor', label: `Floor (${unit})` },
        { key: 'bid', label: `Top bid (${unit})` },
        { key: 'spread', label: `Spread (${unit})` },
        { key: 'sales', label: 'Sales' },
        { key: 'volume', label: `Volume (${unit})` },
    ];
    const draftValue = parseFloat(draft);
    const draftValid = !isNaN(draftValue) && draftValue > 0;
    const openAlert = (open: boolean) => {
        if (open) {
            setDraft(alert.toFixed(2));
            setDraftArmed(armed);
        }
        setAlertOpen(open);
    };
    const saveAlert = (e?: any) => {
        if (e) e.preventDefault();
        if (!draftValid) return;
        setAlert(draftValue);
        setArmed(draftArmed);
        setAlertOpen(false);
    };

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                        <IconTile icon={icon} />
                        <div className="flex min-w-0 flex-col gap-px">
                            <div className="flex min-w-0 items-center gap-2">
                                <FrameTitle role="heading" className="truncate">
                                    {title}
                                </FrameTitle>
                                {armed ? (
                                    <span
                                        data-slot="badge"
                                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border border-border bg-transparent px-1.25 py-0.5 text-xs font-medium whitespace-nowrap dark:bg-input/32 [&_svg]:size-3"
                                    >
                                        <Icon name="bell" />
                                        <span className={`${TRIM} tabular-nums`}>
                                            Alert {alert.toFixed(2)} {unit}
                                        </span>
                                    </span>
                                ) : null}
                            </div>
                            <FrameDescription className="truncate">{description}</FrameDescription>
                        </div>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-between gap-2 @3xl:w-auto!">
                        <RangeTabs
                            size="default"
                            options={ranges.map((r) => ({ value: r.key, label: r.label }))}
                            value={rangeKey}
                            onValueChange={setRangeKey}
                        />
                        <ToolbarGroup aria-label="Chart actions">
                            <Popover open={alertOpen} onOpenChange={openAlert}>
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            aria-label={`Floor alert, ${armed ? 'armed' : 'off'}`}
                                            className="bg-background"
                                        />
                                    }
                                >
                                    <Icon name={armed ? 'bell' : 'bell-off'} />
                                    <span className={TRIM}>Alert</span>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-72">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-sm font-medium">Floor Alert</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Notify when the floor closes below a level.
                                        </p>
                                    </div>
                                    <form noValidate onSubmit={saveAlert} className="mt-3 flex flex-col gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="floor-alert-level" className="text-sm font-medium">
                                                Alert Level
                                            </label>
                                            <div className="flex h-8 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                                                <input
                                                    id="floor-alert-level"
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    aria-invalid={!draftValid}
                                                    aria-describedby="floor-alert-help"
                                                    value={draft}
                                                    onChange={(e) => setDraft(e.target.value)}
                                                    className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm tabular-nums outline-none"
                                                />
                                                <span className="pe-2.5 text-sm text-muted-foreground">{unit}</span>
                                            </div>
                                            <p id="floor-alert-help" className="text-xs text-muted-foreground">
                                                The floor is {eth(last.floor, unit)} now.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span id="floor-alert-notify" className="text-sm font-medium">
                                                Notify Me
                                            </span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={draftArmed}
                                                aria-labelledby="floor-alert-notify"
                                                onClick={() => setDraftArmed(!draftArmed)}
                                                className="relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:bg-primary"
                                            >
                                                <span
                                                    className={`block size-4 rounded-full bg-background shadow-sm transition-transform ${draftArmed ? 'translate-x-[14px]' : 'translate-x-0'}`}
                                                />
                                            </button>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setAlertOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" size="sm" disabled={!draftValid}>
                                                Save
                                            </Button>
                                        </div>
                                    </form>
                                </PopoverContent>
                            </Popover>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            aria-label="Export"
                                            title="Export"
                                            className="bg-background"
                                        />
                                    }
                                >
                                    <Icon name="ellipsis" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Export Range</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                downloadText(
                                                    `floor-${range.key.toLowerCase()}.csv`,
                                                    rowsToCsv(exportRows, columns)
                                                )
                                            }
                                        >
                                            <Icon name="download" />
                                            Download CSV
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
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'chart-line' : 'table'} />
                                            {view === 'table' ? 'View as Chart' : 'View as Table'}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </div>
                </FrameHeader>
                <FramePanel className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                        <div className="flex min-w-0 flex-col gap-2.5">
                            <span className="text-sm text-muted-foreground">Lowest Ask</span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="flex items-baseline gap-1.5">
                                    <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                                        {last.floor.toFixed(3)}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground">{unit}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                    <span
                                        data-slot="badge"
                                        className={`inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 ${
                                            changePct >= 0
                                                ? 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success'
                                                : 'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive'
                                        }`}
                                    >
                                        <Icon name={changePct >= 0 ? 'trending-up' : 'trending-down'} />
                                        <span className={`${TRIM} tabular-nums`}>{pct(changePct)}</span>
                                    </span>
                                    <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                        <span className={TRIM}>
                                            {signedEth(change, unit)} {range.phrase}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <MetaRow
                                className="flex-wrap text-xs text-muted-foreground"
                                items={[
                                    usd(last.floor * last.price),
                                    `Top bid ${eth(last.bid, unit)}`,
                                    `${last.spreadPct.toFixed(2)}% spread`,
                                ]}
                            />
                        </div>
                        <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                <LineSwatch className="text-sky-600 dark:text-sky-400" />
                                <span className={TRIM}>Floor</span>
                            </li>
                            <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                <LineSwatch dashed className="text-slate-400 dark:text-slate-500" />
                                <span className={TRIM}>Top Bid</span>
                            </li>
                            <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                <span
                                    aria-hidden="true"
                                    className="h-2 w-3 shrink-0 rounded-[2px] bg-sky-600/20 dark:bg-sky-400/25"
                                />
                                <span className={TRIM}>Spread</span>
                            </li>
                            {below ? (
                                <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                    <LineSwatch className="text-red-600 dark:text-red-400" />
                                    <span className={TRIM}>Below Alert</span>
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
                                data={exportRows}
                                index="date"
                                indexLabel="Date"
                                series={[
                                    { key: 'floor', label: 'Floor' },
                                    { key: 'bid', label: 'Top bid' },
                                    { key: 'spread', label: 'Spread' },
                                ]}
                                valueFormatter={(v: number) => eth(v, unit)}
                                caption={`${title}, ${range.phrase}`}
                            />
                        }
                    >
                        <div
                            ref={rootRef}
                            className="group/c26 h-72 w-full [--chart-26-band:0.14] dark:[--chart-26-band:0.2]"
                            data-intro={intro}
                        >
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.ComposedChart
                                        key={rangeKey}
                                        data={rows}
                                        margin={{ top: PLOT_TOP, right: 0, bottom: 0, left: 4 }}
                                        accessibilityLayer
                                    >
                                        <defs>
                                            <linearGradient
                                                id="fm-floor-stroke"
                                                x1="0"
                                                y1={PLOT_TOP}
                                                x2="0"
                                                y2={PLOT_TOP + PLOT_HEIGHT}
                                                gradientUnits="userSpaceOnUse"
                                            >
                                                <stop offset={armed ? split : 1} stopColor="var(--color-floor)" />
                                                <stop offset={armed ? split : 1} stopColor="var(--color-breach)" />
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
                                            tickFormatter={(d: string) =>
                                                range.tickEvery > 0 ? fmtDay(d) : fmtMonth(d)
                                            }
                                        />
                                        <R.YAxis
                                            orientation="right"
                                            width={48}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={6}
                                            domain={domain}
                                            ticks={shownTicks}
                                            tickFormatter={(v: number) => v.toFixed(2)}
                                        />
                                        <R.Tooltip
                                            isAnimationActive={false}
                                            cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const r = payload[0].payload;
                                                return (
                                                    <TipShell>
                                                        <TipHeader
                                                            title={fmtLong(r.date)}
                                                            badge={armed && r.floor < alert ? 'Below Alert' : null}
                                                        />
                                                        <div className="flex flex-col gap-1.5">
                                                            <TipRow
                                                                icon={
                                                                    <LineSwatch
                                                                        className={
                                                                            armed && r.floor < alert
                                                                                ? 'text-(--color-breach)'
                                                                                : 'text-(--color-floor)'
                                                                        }
                                                                    />
                                                                }
                                                                label="Floor"
                                                            >
                                                                <TipValue
                                                                    value={eth(r.floor, unit)}
                                                                    extra={usd(r.floor * r.price)}
                                                                />
                                                            </TipRow>
                                                            <TipRow
                                                                icon={
                                                                    <LineSwatch dashed className="text-(--color-bid)" />
                                                                }
                                                                label="Top Bid"
                                                            >
                                                                <TipValue value={eth(r.bid, unit)} />
                                                            </TipRow>
                                                            <TipRow icon="chevrons-up-down" label="Spread">
                                                                <TipValue
                                                                    value={eth(r.spread, unit)}
                                                                    extra={`${r.spreadPct.toFixed(2)}%`}
                                                                />
                                                            </TipRow>
                                                            <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                                                <TipRow icon="shopping-cart" label="Sales">
                                                                    <TipValue value={r.sales.toLocaleString('en-US')} />
                                                                </TipRow>
                                                                <TipRow icon="chart-column" label="Volume">
                                                                    <TipValue
                                                                        value={`${r.volume.toFixed(1)} ${unit}`}
                                                                    />
                                                                </TipRow>
                                                            </div>
                                                        </div>
                                                    </TipShell>
                                                );
                                            }}
                                        />
                                        <R.Area
                                            dataKey="band"
                                            name="Spread"
                                            type="linear"
                                            fill="var(--color-floor)"
                                            fillOpacity="var(--chart-26-band)"
                                            stroke="none"
                                            activeDot={false}
                                            isAnimationActive={false}
                                        />
                                        <R.Line
                                            dataKey="bid"
                                            name="Top Bid"
                                            type="linear"
                                            stroke="var(--color-bid)"
                                            strokeWidth={1.5}
                                            strokeDasharray="4 4"
                                            dot={false}
                                            activeDot={{
                                                r: 3,
                                                fill: 'var(--color-bid)',
                                                stroke: 'var(--card)',
                                                strokeWidth: 2,
                                            }}
                                            isAnimationActive={false}
                                        />
                                        {armed ? (
                                            <R.ReferenceLine
                                                y={alert}
                                                stroke="var(--muted-foreground)"
                                                strokeDasharray="2 3"
                                                strokeOpacity={0.5}
                                                ifOverflow="hidden"
                                            />
                                        ) : null}
                                        <R.Line
                                            dataKey="floor"
                                            name="Floor"
                                            type="linear"
                                            stroke="url(#fm-floor-stroke)"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{
                                                r: 4,
                                                fill: 'var(--color-floor)',
                                                stroke: 'var(--card)',
                                                strokeWidth: 2,
                                            }}
                                            isAnimationActive={false}
                                        />
                                        <R.Customized component={<LastDot rows={rows} domain={domain} />} />
                                        <R.Customized
                                            component={<AlertPill value={alert} domain={domain} active={armed} />}
                                        />
                                    </R.ComposedChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FramePanel>
                    <StatGrid
                        items={[
                            {
                                label: 'Volume',
                                value: `${model.volume.toLocaleString('en-US', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1,
                                })} ${unit}`,
                                note: usdM(model.volumeUsd),
                            },
                            {
                                label: 'Sales',
                                value: model.sales.toLocaleString('en-US'),
                                note: `Avg ${eth(model.sales ? model.volume / model.sales : 0, unit)}`,
                            },
                            { label: 'Avg Spread', value: `${model.avgSpread.toFixed(2)}%`, note: 'Floor to top bid' },
                            {
                                label: 'Off High',
                                value: pct(offHigh).replace('+', ''),
                                note:
                                    hi === rows.length - 1
                                        ? 'Closing at the high'
                                        : `High ${eth(rows[hi].floor, unit)} on ${fmtDay(rows[hi].date)}`,
                            },
                        ]}
                    />
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <MetaRow items={sourceNote} />
                    <MetaRow items={[`As of ${fmtDate(last.date)}`, `${unit} ${usd(last.price)}`]} />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default FloorMonitor;
