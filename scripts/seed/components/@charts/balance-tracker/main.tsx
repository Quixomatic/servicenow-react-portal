import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, useRecharts } from 'components:chart';
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
} from 'components:chart-frame';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation, AccentPicker, ACCENTS } from 'components:charts/chart-kit';
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
    ToggleChip,
    BlockMenu,
    exportActions,
    DRAW_X,
    useIntro,
    fmtDay,
    fmtDate,
    fmtLong,
    fmtMonth,
    usd,
    pct,
    usdK,
    niceTicks,
} from 'components:charts/line-kit';
import { BALANCES, RANGES } from './data';
import type { BalanceRow, BalanceRange } from './data';

/**
 * components:charts/balance-tracker: a daily account balance line with high / low markers, the last
 * close as a halo dot, an optional average line and a benchmark index rebased to the range's first
 * close (Compare). Range tabs (1M / 3M / YTD / 1Y), a line colour picker, a refresh that redraws the
 * line, KPI tiles (max drawdown, vs benchmark, average, best day) and CSV / copy exports.
 *
 *   <BalanceTracker />                                             sample data
 *   <BalanceTracker data={[['2026-10-16', 24847.83, 23802.07], …]} ranges={[…]} />
 *
 * data rows: [ISO date, balance, benchmark] in date order (trading days).
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type BalanceTrackerProps = {
    title?: string;
    description?: string;
    icon?: string;
    data?: BalanceRow[];
    ranges?: BalanceRange[];
    defaultRange?: string;
    valueLabel?: string;
    seriesLabel?: string;
    benchmarkLabel?: string;
    footerStart?: string[];
    syncedLabel?: string;
    className?: string;
};

const PLOT_TOP = 28;
const COLORS = [{ key: 'violet', light: 'violet-600', dark: 'violet-400' }].concat(
    ACCENTS.filter((a) => a.key !== 'violet')
);

function sliceRange(data: BalanceRow[], r: BalanceRange): BalanceRow[] {
    if (r.ytd) {
        const year = data[data.length - 1][0].slice(0, 4);
        return data.filter((d) => d[0] >= `${year}-01-01`);
    }
    return data.slice(-(r.days || data.length));
}

function tickDates(rows: { date: string }[], r: BalanceRange): string[] {
    const n = rows.length;
    if (n <= 70) {
        const k = n <= 25 ? 5 : 10;
        const out: string[] = [];
        for (let i = n - 1; i >= 0; i -= k) out.unshift(rows[i].date);
        return out;
    }
    const out: string[] = [];
    for (let i = 1; i < n; i++) if (rows[i].date.slice(0, 7) !== rows[i - 1].date.slice(0, 7)) out.push(rows[i].date);
    return r.ytd || out.length ? out : [rows[n - 1].date];
}

function UpDownBadge({ value }: { value: number }) {
    const up = value >= 0;
    return (
        <span
            data-slot="badge"
            className={`inline-flex h-5 min-w-5 w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 ${
                up
                    ? 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success'
                    : 'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive'
            }`}
        >
            <Icon name={up ? 'trending-up' : 'trending-down'} />
            <span className={`${TRIM} tabular-nums`}>{pct(value)}</span>
        </span>
    );
}

/** Marks drawn over the lines: average label, high / low markers, the last close's halo dot. */
function Marks({
    rows,
    domain,
    hiIdx,
    loIdx,
    avg,
}: {
    rows: any[];
    domain: number[];
    hiIdx: number;
    loIdx: number;
    avg: number;
}) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    if (!plot) return null;
    const n = rows.length;
    const x = (i: number) => plot.x + (n > 1 ? (i / (n - 1)) * plot.width : plot.width / 2);
    const y = (v: number) => plot.y + ((domain[1] - v) / (domain[1] - domain[0])) * plot.height;
    const anchor = (i: number) => (x(i) - plot.x < 60 ? 'start' : plot.x + plot.width - x(i) < 60 ? 'end' : 'middle');
    const marker = (i: number, kind: 'High' | 'Low') => {
        const cx = x(i);
        const cy = y(rows[i].balance);
        return (
            <g
                key={kind}
                className={`${FADE} group-data-[intro=drawing]/bt:opacity-0 group-data-[markers=off]/bt:opacity-0`}
            >
                <circle cx={cx} cy={cy} r={3.5} fill="var(--card)" stroke="var(--color-balance)" strokeWidth={2} />
                <text
                    x={cx}
                    y={kind === 'High' ? cy - 12 : cy + 20}
                    textAnchor={anchor(i)}
                    stroke="var(--card)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    className="text-xs tabular-nums"
                >
                    <tspan className="fill-muted-foreground">{kind} </tspan>
                    <tspan className="fill-foreground font-medium">{usd(rows[i].balance)}</tspan>
                </text>
            </g>
        );
    };
    const last = n - 1;
    return (
        <g>
            <text
                aria-hidden="true"
                x={plot.x + 4}
                y={y(avg) + 16}
                stroke="var(--card)"
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
                className={`fill-muted-foreground text-xs tabular-nums ${FADE} group-data-[intro=drawing]/bt:opacity-0 group-data-[average=off]/bt:opacity-0`}
            >
                Avg {usdK(avg)}
            </text>
            <g className={`${FADE} group-data-[intro=drawing]/bt:opacity-0`}>
                <circle cx={x(last)} cy={y(rows[last].balance)} r={7} fill="var(--color-balance)" fillOpacity={0.16} />
                <circle
                    cx={x(last)}
                    cy={y(rows[last].balance)}
                    r={3.5}
                    fill="var(--color-balance)"
                    stroke="var(--card)"
                    strokeWidth={1.5}
                />
            </g>
            {loIdx !== hiIdx ? marker(loIdx, 'Low') : null}
            {marker(hiIdx, 'High')}
        </g>
    );
}

export function BalanceTracker({
    title = 'Portfolio Balance',
    description = 'Individual brokerage account',
    icon = 'wallet',
    data = BALANCES,
    ranges = RANGES,
    defaultRange = '3M',
    valueLabel = 'Market Value',
    seriesLabel = 'Portfolio',
    benchmarkLabel = 'Benchmark',
    footerStart = ['Daily close', 'USD'],
    syncedLabel = 'Synced 2 min ago',
    className,
}: BalanceTrackerProps) {
    const initialRange = ranges.some((r) => r.key === defaultRange) ? defaultRange : ranges[0].key;
    const [rangeKey, setRangeKey] = useState(initialRange);
    const [compare, setCompare] = useState(false);
    const [markers, setMarkers] = useState(true);
    const [average, setAverage] = useState(false);
    const [color, setColor] = useState(COLORS[0].key);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replay, setReplay] = useState(0);
    const [loading, setLoading] = useState(false);
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];
    const acc = COLORS.find((c) => c.key === color) || COLORS[0];

    const config = useMemo(
        () => ({
            balance: series(acc.light, acc.dark, 'Balance'),
            benchmark: series('slate-400', 'slate-500', benchmarkLabel),
            average: series('neutral-500', 'neutral-400', 'Average'),
        }),
        [acc.light, acc.dark, benchmarkLabel]
    );

    const model = useMemo(() => {
        const slice = sliceRange(data, range);
        const startIndex = data.length - slice.length;
        const b0 = slice[0][1];
        const k = b0 / slice[0][2];
        const total = slice.reduce((s, d) => s + d[1], 0);
        const avg = total / slice.length;
        const rows = slice.map((d, i) => {
            const prev = data[startIndex + i - 1];
            return {
                date: d[0],
                balance: d[1],
                benchmark: Math.round(d[2] * k * 100) / 100,
                average: avg,
                change: prev ? d[1] - prev[1] : null,
                changePct: prev ? (d[1] / prev[1] - 1) * 100 : null,
                since: d[1] - b0,
                sincePct: (d[1] / b0 - 1) * 100,
            };
        });
        let hiIdx = 0;
        let loIdx = 0;
        rows.forEach((r, i) => {
            if (r.balance > rows[hiIdx].balance) hiIdx = i;
            if (r.balance < rows[loIdx].balance) loIdx = i;
        });
        let peak = 0;
        let dd = 0;
        let ddPeak = 0;
        let ddTrough = 0;
        rows.forEach((r, i) => {
            if (r.balance > rows[peak].balance) peak = i;
            const v = r.balance / rows[peak].balance - 1;
            if (v < dd) {
                dd = v;
                ddPeak = peak;
                ddTrough = i;
            }
        });
        let best = -1;
        rows.forEach((r, i) => {
            if (r.change != null && (best < 0 || r.change > (rows[best].change as number))) best = i;
        });
        const last = rows[rows.length - 1];
        const ret = last.sincePct;
        const bret = (last.benchmark / rows[0].benchmark - 1) * 100;
        return { rows, avg, hiIdx, loIdx, dd, ddPeak, ddTrough, best, last, ret, bret };
    }, [data, range]);

    const { rows, avg, hiIdx, loIdx, last, ret, bret } = model;
    const values = rows.map((r) => r.balance).concat(compare ? rows.map((r) => r.benchmark) : []);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const domain = [ticks[0], ticks[ticks.length - 1]];
    const xTicks = tickDates(rows, range);
    const startLabel = fmtDay(rows[0].date);

    const rootRef = useRef<HTMLDivElement>(null);
    const intro = useIntro([rangeKey, replay, view]);
    useEnterAnimation(
        rootRef,
        [{ selector: '.recharts-line-curve', keyframes: DRAW_X, duration: 0.45, delay: 0 }],
        [rangeKey, replay, view]
    );

    const refresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setReplay((v) => v + 1);
        }, 450);
    };
    const changed = rangeKey !== initialRange || compare || !markers || average || color !== COLORS[0].key;
    const reset = () => {
        setRangeKey(initialRange);
        setCompare(false);
        setMarkers(true);
        setAverage(false);
        setColor(COLORS[0].key);
    };

    const summary = `Daily closing balance ${range.phrase}, from ${usd(rows[0].balance)} to ${usd(last.balance)}. Arrow keys move between days.`;
    const copySummary = `${title}: ${usd(last.balance)}, ${pct(ret)} (${usd(last.since, { signed: true })}) ${range.phrase}. High ${usd(
        rows[hiIdx].balance
    )} on ${fmtDate(rows[hiIdx].date)}, low ${usd(rows[loIdx].balance)} on ${fmtDate(rows[loIdx].date)}. ${benchmarkLabel} ${pct(bret)}.`;
    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'balance', label: 'Balance' },
        { key: 'benchmark', label: benchmarkLabel },
    ];

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                        <IconTile icon={icon} />
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
                            value={rangeKey}
                            onValueChange={setRangeKey}
                            options={ranges.map((r) => ({ value: r.key, label: r.label }))}
                        />
                        <ToggleChip pressed={compare} onPressedChange={setCompare}>
                            <LineSwatch dashed className="text-slate-400 dark:text-slate-500" />
                            <span className={TRIM}>Compare</span>
                        </ToggleChip>
                        <ToolbarGroup aria-label="Chart actions">
                            <AccentPicker
                                value={color}
                                onChange={setColor}
                                swatch="var(--color-balance)"
                                options={COLORS}
                                label="Line color"
                            />
                            <ToolbarButton
                                icon={
                                    <Icon
                                        name={loading ? 'loader-circle' : 'refresh-cw'}
                                        className={loading ? 'animate-spin' : ''}
                                    />
                                }
                                label="Refresh balance"
                                onClick={refresh}
                                disabled={loading}
                            />
                            <BlockMenu
                                show={[
                                    {
                                        label: 'High and Low',
                                        icon: 'arrow-up-down',
                                        checked: markers,
                                        onChange: setMarkers,
                                    },
                                    { label: 'Average Line', icon: 'minus', checked: average, onChange: setAverage },
                                ]}
                                exportItems={exportActions({
                                    filename: 'portfolio-balance.csv',
                                    rows,
                                    columns,
                                    summary: copySummary,
                                }).concat([
                                    {
                                        label: view === 'table' ? 'View as Chart' : 'View as Table',
                                        icon: view === 'table' ? 'chart-line' : 'table',
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                ])}
                                actions={[
                                    { label: 'Reset View', icon: 'rotate-ccw', onSelect: reset, disabled: !changed },
                                ]}
                            />
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                        <div className="flex min-w-0 flex-col gap-2.5">
                            <span className="text-sm text-muted-foreground">{valueLabel}</span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                                    {usd(last.balance)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <UpDownBadge value={ret} />
                                    <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                        <span className={TRIM}>
                                            {usd(last.since, { signed: true })} {range.phrase}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ul
                            aria-label="Legend"
                            aria-hidden={!compare}
                            className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs max-sm:hidden${compare ? '' : ' invisible'}`}
                        >
                            <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                <LineSwatch className="text-(--color-balance)" />
                                <span className={TRIM}>{seriesLabel}</span>
                            </li>
                            {compare ? (
                                <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                    <LineSwatch dashed className="text-slate-400 dark:text-slate-500" />
                                    <span className={TRIM}>
                                        {benchmarkLabel} {pct(bret)}
                                    </span>
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
                                index="date"
                                indexLabel="Date"
                                series={[
                                    { key: 'balance', label: 'Balance' },
                                    { key: 'benchmark', label: benchmarkLabel },
                                ]}
                                valueFormatter={(v: number) => usd(v)}
                                caption={title}
                            />
                        }
                    >
                        <div
                            ref={rootRef}
                            className="group/bt h-72 w-full"
                            data-intro={intro}
                            data-markers={markers ? 'on' : 'off'}
                            data-average={average ? 'on' : 'off'}
                            data-benchmark={compare ? 'on' : 'off'}
                        >
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.LineChart
                                        key={`${rangeKey}-${replay}`}
                                        data={rows}
                                        margin={{ top: PLOT_TOP, right: 4, bottom: 0, left: 4 }}
                                        accessibilityLayer
                                    >
                                        <R.CartesianGrid vertical={false} />
                                        <R.XAxis
                                            dataKey="date"
                                            ticks={xTicks}
                                            interval={0}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            tickFormatter={(d: string) => (rows.length > 70 ? fmtMonth(d) : fmtDay(d))}
                                        />
                                        <R.YAxis
                                            orientation="right"
                                            width={52}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={6}
                                            domain={domain}
                                            ticks={ticks}
                                            tickFormatter={usdK}
                                        />
                                        <R.Tooltip
                                            isAnimationActive={false}
                                            cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const r = payload[0].payload;
                                                const i = rows.indexOf(r);
                                                const ahead = (r.balance / r.benchmark - 1) * 100;
                                                return (
                                                    <TipShell>
                                                        <TipHeader
                                                            title={fmtLong(r.date)}
                                                            badge={i === hiIdx ? 'High' : i === loIdx ? 'Low' : null}
                                                        />
                                                        <div className="grid gap-1.5">
                                                            <div className="flex w-full flex-wrap items-center gap-2">
                                                                <div className="flex flex-1 flex-col gap-1.5">
                                                                    <TipRow
                                                                        icon={
                                                                            <LineSwatch className="text-(--color-balance)" />
                                                                        }
                                                                        label="Balance"
                                                                    >
                                                                        <TipValue value={usd(r.balance)} />
                                                                    </TipRow>
                                                                    {r.change != null ? (
                                                                        <TipRow
                                                                            icon={
                                                                                r.change >= 0
                                                                                    ? 'trending-up'
                                                                                    : 'trending-down'
                                                                            }
                                                                            label="Day change"
                                                                        >
                                                                            <TipValue
                                                                                value={usd(r.change, { signed: true })}
                                                                                tone={
                                                                                    r.change > 0
                                                                                        ? 'up'
                                                                                        : r.change < 0
                                                                                          ? 'down'
                                                                                          : null
                                                                                }
                                                                                extra={pct(r.changePct)}
                                                                            />
                                                                        </TipRow>
                                                                    ) : null}
                                                                    <TipRow
                                                                        icon="history"
                                                                        label={`Since ${startLabel}`}
                                                                    >
                                                                        <TipValue
                                                                            value={usd(r.since, { signed: true })}
                                                                            tone={
                                                                                r.since > 0.004
                                                                                    ? 'up'
                                                                                    : r.since < -0.004
                                                                                      ? 'down'
                                                                                      : null
                                                                            }
                                                                            extra={pct(r.sincePct)}
                                                                        />
                                                                    </TipRow>
                                                                    {compare ? (
                                                                        <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                                                            <TipRow
                                                                                icon={
                                                                                    <LineSwatch
                                                                                        dashed
                                                                                        className="text-slate-400 dark:text-slate-500"
                                                                                    />
                                                                                }
                                                                                label={benchmarkLabel}
                                                                            >
                                                                                <TipValue value={usd(r.benchmark)} />
                                                                            </TipRow>
                                                                            <TipRow
                                                                                icon={
                                                                                    ahead >= 0
                                                                                        ? 'trending-up'
                                                                                        : 'trending-down'
                                                                                }
                                                                                label={
                                                                                    ahead >= 0
                                                                                        ? 'Ahead by'
                                                                                        : 'Behind by'
                                                                                }
                                                                            >
                                                                                <TipValue
                                                                                    value={pct(
                                                                                        Math.abs(ahead),
                                                                                        2,
                                                                                        false
                                                                                    )}
                                                                                />
                                                                            </TipRow>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TipShell>
                                                );
                                            }}
                                        />
                                        <R.Line
                                            dataKey="average"
                                            type="linear"
                                            className={`${FADE} group-data-[average=off]/bt:opacity-0`}
                                            stroke="var(--color-average)"
                                            strokeWidth={1}
                                            strokeDasharray="4 4"
                                            strokeOpacity={0.7}
                                            dot={false}
                                            activeDot={false}
                                            isAnimationActive={false}
                                        />
                                        <R.Line
                                            dataKey="benchmark"
                                            type="linear"
                                            className={`${FADE} group-data-[benchmark=off]/bt:opacity-0`}
                                            stroke="var(--color-benchmark)"
                                            strokeWidth={1.5}
                                            strokeDasharray="4 4"
                                            dot={false}
                                            activeDot={false}
                                            isAnimationActive={false}
                                        />
                                        <R.Line
                                            dataKey="balance"
                                            type="linear"
                                            stroke="var(--color-balance)"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{
                                                r: 4,
                                                fill: 'var(--color-balance)',
                                                stroke: 'var(--card)',
                                                strokeWidth: 2,
                                            }}
                                            isAnimationActive={false}
                                        />
                                        <R.Customized
                                            component={
                                                <Marks
                                                    rows={rows}
                                                    domain={domain}
                                                    hiIdx={hiIdx}
                                                    loIdx={loIdx}
                                                    avg={avg}
                                                />
                                            }
                                        />
                                    </R.LineChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FramePanel>
                    <StatGrid
                        items={[
                            {
                                label: 'Max Drawdown',
                                value: pct(model.dd * 100),
                                note:
                                    model.dd < 0
                                        ? `${fmtDay(rows[model.ddPeak].date)} to ${fmtDay(rows[model.ddTrough].date)}`
                                        : 'No drawdown',
                            },
                            {
                                label: 'Vs Benchmark',
                                value: `${pct(ret - bret).replace('%', '')} pts`,
                                note: `${benchmarkLabel} ${pct(bret)}`,
                            },
                            { label: 'Average', value: usd(avg), note: `${rows.length} trading days` },
                            {
                                label: 'Best Day',
                                value: model.best >= 0 ? usd(rows[model.best].change as number, { signed: true }) : '–',
                                note: model.best >= 0 ? fmtDate(rows[model.best].date) : '',
                            },
                        ]}
                    />
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <MetaRow items={footerStart} />
                    <MetaRow items={[`As of ${fmtDate(last.date)}`, syncedLabel]} />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default BalanceTracker;
