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
    ToolbarSelect,
    ToolbarMultiSelect,
    ChartMoreMenu,
    KpiStrip,
    FooterMeta,
} from 'components:chart-frame';
import { Icon } from 'components:icon';
import {
    series,
    SeriesScope,
    useEnterAnimation,
    GROW_Y,
    baselineOrigin,
    riseFromBaseline,
    PingDot,
    HaloDot,
    AnchorLine,
    useElementWidth,
    labelEvery,
    AccentPicker,
    ACCENTS,
    compact,
    signedPercent,
} from 'components:charts/chart-kit';
import { CHANNELS, PERIODS } from './data';
import type { Channel, ImpressionBucket } from './data';

/**
 * components:charts/campaign-impressions: impressions this period vs the prior period as dashed area
 * fills, with KPI tiles (total, daily average, peak, top channel), a channel filter that re-sums the
 * series, a period menu, an accent colour picker, a per-channel split in the tooltip and CSV / copy
 * exports.
 *
 *   <CampaignImpressions />                                  sample data
 *   <CampaignImpressions periods={{ '30d': { label, days, data, range } }} channels={[…]} />
 *
 * data rows: { start, end, days, prior, <channel key>: value … }.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

type Period = { label: string; days: number; data: ImpressionBucket[]; range: string };

export type CampaignImpressionsProps = {
    title?: string;
    description?: string;
    periods?: Record<string, Period>;
    defaultPeriod?: string;
    channels?: Channel[];
    unit?: string;
    updatedLabel?: string;
    className?: string;
};

const SUM = (r: ImpressionBucket, keys: string[]) => keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';

function TooltipBody({ row, keys, channels, unit }: { row: any; keys: string[]; channels: Channel[]; unit: string }) {
    const delta = row.prior ? (row.current / row.prior - 1) * 100 : 0;
    const shown = channels.filter((c) => keys.indexOf(c.key) >= 0);
    return (
        <div className="grid w-60 min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                    <span className="flex h-4 items-center justify-between gap-3">
                        <span className={`font-medium ${TEXT_TRIM}`}>
                            {row.start === row.end ? row.start : `${row.start} to ${row.end}`}
                        </span>
                        <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                            {row.days} {row.days === 1 ? 'day' : 'days'}
                        </span>
                    </span>
                    <span className="flex h-5 items-center gap-1.5">
                        <span className={`text-sm font-semibold tabular-nums ${TEXT_TRIM}`}>
                            {compact(row.current)}
                        </span>
                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>{unit}</span>
                        <span
                            className={`ms-auto tabular-nums ${TEXT_TRIM} ${delta >= 0 ? 'text-success' : 'text-destructive'}`}
                        >
                            {signedPercent(delta)}
                        </span>
                    </span>
                </div>
                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                <span aria-hidden="true" className="flex h-1.5 gap-0.5">
                    {shown.map((c) => (
                        <span
                            key={c.key}
                            className="basis-0 rounded-full"
                            style={{
                                flexGrow: Math.round(((Number(row[c.key]) || 0) / (row.current || 1)) * 100),
                                background: `var(--color-${c.key})`,
                            }}
                        />
                    ))}
                </span>
                <div className="flex flex-col gap-1">
                    {shown.map((c) => (
                        <span key={c.key} className="flex h-4 items-center gap-2 text-muted-foreground">
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ background: `var(--color-${c.key})` }}
                                />
                                <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    {c.label}
                                </span>
                            </span>
                            <span className={`font-mono font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>
                                {compact(Number(row[c.key]) || 0)}
                            </span>
                            <span className={`w-8 text-end tabular-nums ${TEXT_TRIM}`}>
                                {Math.round(((Number(row[c.key]) || 0) / (row.current || 1)) * 100)}%
                            </span>
                        </span>
                    ))}
                </div>
                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                <div className="flex flex-col gap-1">
                    {[
                        { key: 'prior', label: 'Prior period', value: compact(row.prior) },
                        { key: 'current', label: 'Daily average', value: compact(row.current / (row.days || 1)) },
                    ].map((x) => (
                        <span key={x.key} className="flex h-4 items-center gap-2 text-muted-foreground">
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ background: `var(--color-${x.key})` }}
                                />
                                <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    {x.label}
                                </span>
                            </span>
                            <span className={`font-mono font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>
                                {x.value}
                            </span>
                            <span className={`w-8 text-end tabular-nums ${TEXT_TRIM}`} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function LegendSwatch({ color }: { color: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 18 8" className="h-2 w-4.5 shrink-0">
            <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="9" cy="4" r="2.5" fill={color} />
        </svg>
    );
}

export function CampaignImpressions({
    title = 'Campaign Impressions',
    description = 'Delivery by channel through Oct 11',
    periods = PERIODS,
    defaultPeriod = '30d',
    channels = CHANNELS,
    unit = 'impressions',
    updatedLabel = 'Updated hourly',
    className,
}: CampaignImpressionsProps) {
    const [period, setPeriod] = useState(defaultPeriod in periods ? defaultPeriod : Object.keys(periods)[0]);
    const [keys, setKeys] = useState(channels.map((c) => c.key));
    const [accent, setAccent] = useState('indigo');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const p = periods[period];
    const acc = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];

    const config = useMemo(() => {
        const cfg: Record<string, any> = {
            current: series(acc.light, acc.dark, 'This period'),
            prior: series('zinc-400', 'zinc-500', 'Prior period'),
        };
        channels.forEach((c) => {
            cfg[c.key] = series(c.light, c.dark, c.label);
        });
        return cfg;
    }, [acc.light, acc.dark, channels]);

    const rows = useMemo(
        () =>
            p.data.map((r) => {
                const all = SUM(
                    r,
                    channels.map((c) => c.key)
                );
                const current = SUM(r, keys);
                return { ...r, current, prior: all ? (r.prior * current) / all : r.prior, label: r.start };
            }),
        [p, keys, channels]
    );

    const total = rows.reduce((s, r) => s + r.current, 0);
    const priorTotal = rows.reduce((s, r) => s + r.prior, 0);
    const peak = rows.reduce((a, r) => (r.current > a.current ? r : a), rows[0]);
    const byChannel = channels
        .filter((c) => keys.indexOf(c.key) >= 0)
        .map((c) => ({ c, v: rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) }))
        .sort((a, b) => b.v - a.v);
    const top = byChannel[0];

    const n = rows.length;
    const lastIndex = n - 1;
    const values = rows.map((r) => r.current).concat(rows.map((r) => r.prior));
    const step = 200000;
    const niceStep = (() => {
        const span = Math.max(...values) - Math.min(...values);
        const raw = span / 3 || 1;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = raw / mag;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag || step;
    })();
    const lo = Math.floor(Math.min(...values) / niceStep) * niceStep;
    const hi = Math.ceil(Math.max(...values) / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + 1; v += niceStep) ticks.push(v);

    const rootRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(frameRef);
    const tickStep = n <= 7 ? 1 : width && width < 640 ? 3 : 2;
    useEnterAnimation(
        rootRef,
        [
            { selector: '.recharts-area', keyframes: GROW_Y, style: baselineOrigin, delay: (i) => 0.24 + i * 0.12 },
            {
                selector: '.recharts-area-dots > *',
                keyframes: riseFromBaseline,
                delay: (_i, el) => (el.getAttribute('data-series') === 'prior' ? 0.24 : 0.36),
            },
        ],
        [period, view]
    );

    const csv = {
        filename: 'campaign-impressions.csv',
        rows,
        columns: [
            { key: 'start', label: 'Start' },
            { key: 'end', label: 'End' },
            { key: 'current', label: 'Impressions' },
            { key: 'prior', label: 'Prior period', value: (r: any) => Math.round(r.prior) },
        ].concat(channels.filter((c) => keys.indexOf(c.key) >= 0).map((c) => ({ key: c.key, label: c.label }) as any)),
    };
    const delta = priorTotal ? (total / priorTotal - 1) * 100 : 0;
    const summary = `${title}, ${p.label.toLowerCase()}: ${compact(total)} ${unit}, ${signedPercent(delta)} vs ${compact(priorTotal)} the prior period. Peak ${compact(peak.current)} from ${peak.start} to ${peak.end}.${top ? ` Top channel ${top.c.label}, ${Math.round((top.v / total) * 100)}%.` : ''}`;

    return (
        <SeriesScope config={config} className={className}>
            <Frame ref={frameRef} stacked className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription className="truncate">{description}</FrameDescription>
                    </div>
                    <ChartToolbar>
                        <ToolbarSelect
                            label="Period"
                            value={period}
                            onValueChange={setPeriod}
                            options={Object.keys(periods).map((k) => ({ value: k, label: periods[k].label }))}
                        />
                        <ToolbarMultiSelect
                            label={<span className="@max-md:sr-only">Channels</span>}
                            icon={<Icon name="columns-2" />}
                            value={keys}
                            onValueChange={setKeys}
                            options={channels.map((c) => ({
                                value: c.key,
                                label: c.label,
                                color: `var(--color-${c.key})`,
                            }))}
                        />
                        <ToolbarGroup aria-label="Chart actions">
                            <AccentPicker value={accent} onChange={setAccent} swatch="var(--color-current)" />
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
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="p-0">
                    <KpiStrip
                        items={[
                            {
                                label: 'Impressions',
                                value: compact(total),
                                delta,
                                note: (
                                    <>
                                        vs {compact(priorTotal)}
                                        <span className="@max-sm:hidden"> prior</span>
                                    </>
                                ),
                            },
                            {
                                label: 'Daily Average',
                                value: compact(total / p.days),
                                note: `vs ${compact(priorTotal / p.days)} prior`,
                            },
                            { label: 'Peak', value: compact(peak.current), note: `${peak.start} to ${peak.end}` },
                            top
                                ? {
                                      label: 'Top Channel',
                                      value: `${Math.round((top.v / total) * 100)}%`,
                                      dot: `var(--color-${top.c.key})`,
                                      note: `${top.c.label}, ${compact(top.v)}`,
                                  }
                                : { label: 'Top Channel', value: '–' },
                        ]}
                    />
                </FramePanel>
                <FramePanel>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="label"
                                indexLabel="Period"
                                series={[
                                    { key: 'current', label: 'This period' },
                                    { key: 'prior', label: 'Prior period' },
                                ]}
                                valueFormatter={(v: number) => compact(v)}
                                caption={title}
                            />
                        }
                    >
                        <div ref={rootRef} className="flex flex-col gap-6">
                            <div className="flex justify-end text-xs">
                                <ul className="flex items-center gap-4">
                                    <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                        <LegendSwatch color="var(--color-current)" />
                                        <span className={TEXT_TRIM}>This period</span>
                                    </li>
                                    <li className="flex h-4 items-center gap-1.5 text-muted-foreground">
                                        <LegendSwatch color="var(--color-prior)" />
                                        <span className={TEXT_TRIM}>Prior period</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="h-80 w-full">
                                <ChartContainer config={config} className="aspect-auto h-full w-full">
                                    {(R: any) => (
                                        <R.AreaChart
                                            data={rows}
                                            margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
                                            accessibilityLayer
                                        >
                                            <defs>
                                                <linearGradient id="rp-ci-fill-prior" x1="0" y1="0" x2="0" y2="1">
                                                    <stop
                                                        offset="0%"
                                                        stopColor="var(--color-prior)"
                                                        stopOpacity={0.1}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="var(--color-prior)"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                                <linearGradient id="rp-ci-fill-current" x1="0" y1="0" x2="0" y2="1">
                                                    <stop
                                                        offset="0%"
                                                        stopColor="var(--color-current)"
                                                        stopOpacity={0.16}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="var(--color-current)"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <R.CartesianGrid vertical={false} />
                                            <R.XAxis
                                                dataKey="label"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={12}
                                                interval={0}
                                                tick={(t: any) => (
                                                    <text
                                                        x={t.x}
                                                        y={t.y}
                                                        dy="0.71em"
                                                        className="fill-muted-foreground"
                                                        textAnchor={
                                                            t.index === 0
                                                                ? 'start'
                                                                : t.index === lastIndex
                                                                  ? 'end'
                                                                  : 'middle'
                                                        }
                                                    >
                                                        {labelEvery(t.index, n, tickStep) ? t.payload.value : ''}
                                                    </text>
                                                )}
                                            />
                                            <R.YAxis
                                                width={44}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                domain={[lo, hi]}
                                                ticks={ticks}
                                                tickFormatter={(v: number) =>
                                                    Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : compact(v)
                                                }
                                            />
                                            <R.Tooltip
                                                cursor={false}
                                                position={{ y: 12 }}
                                                isAnimationActive={false}
                                                content={({ active, payload }: any) =>
                                                    active && payload && payload.length ? (
                                                        <TooltipBody
                                                            row={payload[0].payload}
                                                            keys={keys}
                                                            channels={channels}
                                                            unit={unit}
                                                        />
                                                    ) : null
                                                }
                                            />
                                            <R.Area
                                                dataKey="prior"
                                                type="linear"
                                                className="impressions-fill"
                                                stroke="var(--color-prior)"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 3"
                                                fill="url(#rp-ci-fill-prior)"
                                                isAnimationActive={false}
                                                dot={(d: any) => (
                                                    <circle
                                                        key={`p${d.index}`}
                                                        data-series="prior"
                                                        className="pointer-events-none"
                                                        cx={d.cx}
                                                        cy={d.cy}
                                                        r={3}
                                                        fill="var(--color-prior)"
                                                        stroke="var(--card)"
                                                        strokeWidth={1.5}
                                                    />
                                                )}
                                                activeDot={(d: any) => (
                                                    <circle
                                                        cx={d.cx}
                                                        cy={d.cy}
                                                        r={4}
                                                        fill="var(--color-prior)"
                                                        stroke="var(--card)"
                                                        strokeWidth={2}
                                                        className="pointer-events-none"
                                                    />
                                                )}
                                            />
                                            <R.Area
                                                dataKey="current"
                                                type="linear"
                                                className="impressions-fill"
                                                stroke="var(--color-current)"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 3"
                                                fill="url(#rp-ci-fill-current)"
                                                isAnimationActive={false}
                                                dot={(d: any) => (
                                                    <g
                                                        key={`c${d.index}`}
                                                        data-series="current"
                                                        className="pointer-events-none"
                                                    >
                                                        {d.index === lastIndex ? (
                                                            <PingDot cx={d.cx} cy={d.cy} color="var(--color-current)" />
                                                        ) : (
                                                            <circle
                                                                cx={d.cx}
                                                                cy={d.cy}
                                                                r={3.5}
                                                                fill="var(--color-current)"
                                                                stroke="var(--card)"
                                                                strokeWidth={1.5}
                                                            />
                                                        )}
                                                    </g>
                                                )}
                                                activeDot={(d: any) => (
                                                    <g>
                                                        <AnchorLine cx={d.cx} cy={d.cy} color="var(--color-current)" />
                                                        <HaloDot cx={d.cx} cy={d.cy} color="var(--color-current)" />
                                                    </g>
                                                )}
                                            />
                                        </R.AreaChart>
                                    )}
                                </ChartContainer>
                            </div>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <FooterMeta
                        items={[
                            { dot: 'success', label: updatedLabel },
                            { label: `${keys.length} of ${channels.length} channels` },
                        ]}
                        end={<span className="tabular-nums">{p.range}</span>}
                    />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default CampaignImpressions;
