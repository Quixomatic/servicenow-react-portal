import { useId, useMemo, useRef } from 'react';
import { ChartContainer, ChartFigure, chartKey } from 'components:chart';
import { Icon } from 'components:icon';
import { series, SeriesScope } from 'components:charts/chart-kit';
import { StripCard, LegendTick, TrendBadge, TONE_BG, useAreaReveal } from 'components:charts/sparkline-kit';
import { SAMPLE } from './data';
import type { CronHealthData } from './data';

/**
 * components:charts/cron-job-health: a four-card health strip for scheduled jobs.
 * - Active Jobs: one tick per job coloured by state (healthy / failing / paused) with a legend.
 * - Success Rate: an hourly SLO area sparkline (24 h) with a dashed SLO line, warning dots on the hours
 *   below SLO and an hour / rate tooltip. Rates are drawn on a square-root distance-from-100% scale so
 *   small dips stay visible next to large ones.
 * - Failed Runs: the failed / timed-out split bar and the worst job.
 * - Next Run: the next job, its status and an interval progress track with the last run's result.
 *
 *   <CronJobHealth />                    sample data
 *   <CronJobHealth data={{ jobs, hourly, runs, slo, failed, next }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CronJobHealthProps = {
    title?: string;
    data?: CronHealthData;
    className?: string;
};

const CONFIG = { rate: series('emerald-500', 'emerald-500', 'Success rate') };

/** Plot transform: distance below 100% on a square-root scale, negated (100% at the top). */
function toPlot(rate: number): number {
    return -Math.sqrt(Math.max(0, 100 - rate));
}

function SuccessSpark({ data }: { data: CronHealthData }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const gid = `rp-cjh-${chartKey(useId())}`;
    const rows = useMemo(() => data.hourly.map((h) => ({ ...h, y: toPlot(h.rate) })), [data.hourly]);
    const lowest = Math.min(...rows.map((r) => r.y));
    const domain = [lowest * 1.1 || -1, 0];
    useAreaReveal(rootRef, [rows]);
    return (
        <div ref={rootRef} className="min-w-0">
            <ChartContainer config={CONFIG} className="aspect-auto h-[46px] w-full">
                {(R: any) => (
                    <R.AreaChart data={rows} margin={{ top: 4, right: 3, bottom: 3, left: 3 }} accessibilityLayer>
                        <defs>
                            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-rate)" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="var(--color-rate)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <R.YAxis hide domain={domain} />
                        <R.XAxis hide dataKey="hour" />
                        <R.Tooltip
                            cursor={false}
                            content={({ active, payload }: any) =>
                                active && payload && payload.length ? (
                                    <div className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                        <div className="flex flex-1 items-center justify-between gap-4">
                                            <span className="text-muted-foreground">{payload[0].payload.hour}</span>
                                            <span className="font-mono font-medium tabular-nums">
                                                {payload[0].payload.rate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ) : null
                            }
                        />
                        <R.ReferenceLine
                            y={toPlot(data.slo)}
                            stroke="var(--muted-foreground)"
                            strokeDasharray="3 3"
                            strokeOpacity={0.6}
                            label={(l: any) =>
                                l && l.viewBox ? (
                                    <text
                                        x={l.viewBox.x + 5}
                                        y={l.viewBox.y + 5}
                                        dy="0.71em"
                                        fill="var(--muted-foreground)"
                                        fontSize={10}
                                        textAnchor="start"
                                    >
                                        SLO {data.slo}%
                                    </text>
                                ) : null
                            }
                        />
                        <R.Area
                            dataKey="y"
                            type="monotone"
                            stroke="var(--color-rate)"
                            strokeWidth={1.5}
                            fill={`url(#${gid})`}
                            fillOpacity={0.6}
                            isAnimationActive={false}
                            dot={(d: any) =>
                                d.payload && d.payload.rate < data.slo ? (
                                    <circle
                                        key={`d${d.index}`}
                                        cx={d.cx}
                                        cy={d.cy}
                                        r={2.5}
                                        fill="var(--warning)"
                                        stroke="var(--card)"
                                        strokeWidth={1}
                                    />
                                ) : (
                                    <g key={`d${d.index}`} />
                                )
                            }
                            activeDot={{ r: 3, fill: 'var(--color-rate)', stroke: 'var(--card)', strokeWidth: 1 }}
                        />
                    </R.AreaChart>
                )}
            </ChartContainer>
        </div>
    );
}

export function CronJobHealth({ title = 'Cron Job Health', data = SAMPLE, className }: CronJobHealthProps) {
    const { jobs, runs, failed, next, slo, hourly } = data;
    const total = jobs.healthy + jobs.failing + jobs.paused;
    const states: string[] = [];
    for (let i = 0; i < jobs.healthy; i++) states.push('success');
    for (let i = 0; i < jobs.failing; i++) states.push('destructive');
    for (let i = 0; i < jobs.paused; i++) states.push('info');
    const rate = (runs.ok / runs.total) * 100;
    const inSlo = hourly.filter((h) => h.rate >= slo).length;
    const low = hourly.reduce((a, h) => (h.rate < a.rate ? h : a), hourly[0]);
    const failedTotal = failed.failed + failed.timedOut;
    const sparkLabel = `Success rate by hour, last ${hourly.length} hours: ${inSlo} of ${hourly.length} hours in SLO, lowest ${low.rate}% at ${low.hour}`;

    return (
        <SeriesScope
            config={CONFIG}
            className={`@container w-full min-w-0 ${className || ''}`}
            role="group"
            aria-label={title}
        >
            <div className="grid w-full gap-2 @xl:grid-cols-2 @5xl:grid-cols-4 @6xl:gap-3">
                <StripCard icon="layers" title="Active Jobs" subtitle={`${jobs.paused} paused`}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="text-xl font-semibold tracking-tight tabular-nums">
                            {jobs.healthy + jobs.failing}
                            <span className="text-sm font-normal text-muted-foreground"> of {total}</span>
                        </div>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <div
                            role="img"
                            aria-label={`${total} jobs: ${jobs.healthy} healthy, ${jobs.failing} failing, ${jobs.paused} paused`}
                            className="flex h-3.5 w-full items-center justify-between"
                        >
                            {states.map((t, i) => (
                                <span key={i} className={`h-3.5 w-0.75 rounded-full ${TONE_BG[t]}`} />
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <LegendTick tone="success">{jobs.healthy} Healthy</LegendTick>
                            <LegendTick tone="destructive">{jobs.failing} Failing</LegendTick>
                            <LegendTick tone="info">{jobs.paused} Paused</LegendTick>
                        </div>
                    </div>
                </StripCard>

                <StripCard
                    icon="activity"
                    title="Success Rate"
                    subtitle={`${runs.ok.toLocaleString('en-US')} of ${runs.total.toLocaleString('en-US')} runs`}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="text-xl font-semibold tracking-tight tabular-nums">{rate.toFixed(1)}%</div>
                        {rate < slo ? (
                            <TrendBadge up={false} tone="warning" icon={false} size="sm" bordered>
                                Below SLO
                            </TrendBadge>
                        ) : null}
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <ChartFigure title="Success rate by hour" summary={`${sparkLabel}.`}>
                            <SuccessSpark data={data} />
                        </ChartFigure>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <LegendTick tone="success">
                                {inSlo} of {hourly.length} hours in SLO
                            </LegendTick>
                            <LegendTick tone="warning" shape="dot">
                                {hourly.length - inSlo} below
                            </LegendTick>
                        </div>
                    </div>
                </StripCard>

                <StripCard icon="circle-x" title="Failed Runs" subtitle={`across ${failed.jobs} jobs`}>
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="text-xl font-semibold tracking-tight tabular-nums">{failedTotal}</div>
                    </div>
                    <div className="flex h-5 min-w-0 items-center gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">Worst</span>
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                            <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
                                <Icon name={failed.worst.icon} aria-hidden="true" />
                            </span>
                            <span className="truncate">{failed.worst.name}</span>
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                            {failed.worst.count} of {failedTotal}
                        </span>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <div
                            role="img"
                            aria-label={`${failedTotal} failed runs: ${failed.failed} failed, ${failed.timedOut} timed out`}
                            className="flex h-3.5 w-full items-center gap-0.5"
                        >
                            <span
                                className="h-1.5 min-w-1.5 basis-0 rounded-full bg-destructive"
                                style={{ flexGrow: failed.failed }}
                            />
                            <span
                                className="h-1.5 min-w-1.5 basis-0 rounded-full bg-warning"
                                style={{ flexGrow: failed.timedOut }}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <LegendTick tone="destructive">{failed.failed} Failed</LegendTick>
                            <LegendTick tone="warning">{failed.timedOut} Timed Out</LegendTick>
                        </div>
                    </div>
                </StripCard>

                <StripCard
                    icon="calendar-clock"
                    title="Next Run"
                    subtitle={`${next.runsNextHour} runs in the next hour`}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="text-xl font-semibold tracking-tight tabular-nums">
                            {next.in}
                            <span className="text-sm font-normal text-muted-foreground"> {next.at}</span>
                        </div>
                    </div>
                    <div className="flex h-5 min-w-0 items-center gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                            <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
                                <Icon name={next.icon} aria-hidden="true" />
                            </span>
                            <span className="truncate">{next.job}</span>
                        </span>
                        <TrendBadge
                            up={next.status !== 'Failing'}
                            tone={
                                next.status === 'Failing'
                                    ? 'destructive'
                                    : next.status === 'Paused'
                                      ? 'muted'
                                      : 'success'
                            }
                            icon={false}
                            size="sm"
                            bordered
                        >
                            {next.status}
                        </TrendBadge>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <div className="flex h-3.5 items-center">
                            <div
                                role="progressbar"
                                aria-label={`${next.job} run interval`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(next.progress * 100)}
                                className="relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted-foreground/15"
                            >
                                <div
                                    className="h-full rounded-full bg-muted-foreground/40 transition-all"
                                    style={{ width: `${next.progress * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-2 text-xs font-medium text-muted-foreground tabular-nums">
                            <span className="flex min-w-0 items-center gap-1">
                                <span
                                    className={`flex shrink-0 [&_svg]:size-4 ${next.last.ok ? 'text-success' : 'text-destructive'}`}
                                >
                                    <Icon name={next.last.ok ? 'circle-check' : 'circle-x'} aria-hidden="true" />
                                </span>
                                <span className="shrink-0">{next.last.at}</span>
                                <span className={`truncate ${next.last.ok ? 'text-success' : 'text-destructive'}`}>
                                    {next.last.ok ? 'Succeeded' : 'Failed'}
                                </span>
                            </span>
                            <span className="shrink-0">{next.at.replace(' UTC', '')}</span>
                        </div>
                    </div>
                </StripCard>
            </div>
        </SeriesScope>
    );
}

export default CronJobHealth;
