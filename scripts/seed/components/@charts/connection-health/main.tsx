import { useId } from 'react';
import { ChartContainer, ChartFigure, chartKey } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { Icon } from 'components:icon';
import { SAMPLE } from './data';
import type { ConnectionHealthData, SyncDay } from './data';

/**
 * components:charts/connection-health: a four-card data connection strip.
 * - Connection Health: healthy of total vs yesterday, a health segment bar and a legend grid.
 * - Linked Datasets: linked of total vs last week, a sync-state segment bar and a legend grid.
 * - Rows Synced: today's rows vs yesterday and a 14-day area trend (gradient fill, dashed "today" line,
 *   end dot) with a pinned tooltip (vs previous day, vs 14-day average).
 * - Failed Syncs: today's failures vs yesterday and 14 daily pill bars on muted tracks (today solid), with
 *   a tooltip listing the failing sources.
 * Segment bars grow in from the left and the charts rise from the bottom, staggered 60 ms per card.
 *
 *   <ConnectionHealth />            sample data
 *   <ConnectionHealth data={...} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type ConnectionHealthProps = {
    title?: string;
    data?: ConnectionHealthData;
    className?: string;
};

const TRIM = '[text-box:trim-both_cap_alphabetic]';

const ROWS_CONFIG = { rows: { label: 'Rows synced', color: 'var(--success)' } };
const FAILED_CONFIG = { failed: { label: 'Failed runs', color: 'var(--destructive)' } };

/** Enter motion: segment bars scale in from the left, chart surfaces rise from the bottom. */
const MOTION_CSS = `
@keyframes rp-ch-rise-x { from { transform: scaleX(0); } }
@keyframes rp-ch-rise-y { from { transform: scaleY(0); } }
@keyframes rp-ch-fade { from { opacity: 0; } }
[data-rp-ch-rise="x"] { transform-origin: left; animation: rp-ch-rise-x 480ms cubic-bezier(0.23, 1, 0.32, 1) var(--rp-ch-delay, 0ms) backwards; }
[data-rp-ch-rise="x"]:dir(rtl) { transform-origin: right; }
[data-rp-ch-rise="y"] .recharts-surface { transform-origin: bottom; animation: rp-ch-rise-y 480ms cubic-bezier(0.23, 1, 0.32, 1) var(--rp-ch-delay, 0ms) backwards; }
@media (prefers-reduced-motion: reduce) {
  [data-rp-ch-rise="x"], [data-rp-ch-rise="y"] .recharts-surface { animation-name: rp-ch-fade; animation-duration: 200ms; }
}`;

function compactRows(v: number): string {
    if (v >= 1e6) return `${parseFloat((v / 1e6).toFixed(1))}M`;
    if (v >= 1e3) return `${parseFloat((v / 1e3).toFixed(1))}K`;
    return String(v);
}

/** Arrow + value delta mark (mono). `good` decides the tone of an increase. */
function DeltaMark({
    delta,
    text,
    against,
    upIsGood = true,
    size = 'md',
}: {
    delta: number;
    text: string;
    against: string;
    upIsGood?: boolean;
    size?: 'md' | 'sm';
}) {
    const flat = delta === 0;
    const up = delta > 0;
    const tone = flat ? 'text-muted-foreground' : up === upIsGood ? 'text-success' : 'text-destructive';
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-0.5 font-mono font-medium tabular-nums ${size === 'md' ? 'h-5 text-sm [&_svg]:size-3.5' : 'h-4 text-xs [&_svg]:size-3'} ${tone}`}
        >
            {flat ? null : (
                <span aria-hidden="true" className="flex">
                    <Icon name={up ? 'arrow-up' : 'arrow-down'} aria-hidden="true" />
                </span>
            )}
            <span className={TRIM}>{text}</span>
            <span className="sr-only">
                {flat ? 'no change against' : up ? 'up against' : 'down against'} {against}
            </span>
        </span>
    );
}

function StatCard({
    icon,
    title,
    period,
    value,
    delta,
    note,
    children,
}: {
    icon: string;
    title: string;
    period: string;
    value: any;
    delta: any;
    note: string;
    children?: any;
}) {
    return (
        <Frame className="h-full min-w-0">
            <FramePanel className="flex flex-col gap-3 overflow-visible">
                <div className="flex h-5 min-w-0 items-center gap-2 text-muted-foreground [&_svg]:size-4">
                    <Icon name={icon} aria-hidden="true" />
                    <span
                        className={`min-w-0 overflow-x-clip text-sm font-medium text-ellipsis whitespace-nowrap text-foreground ${TRIM}`}
                    >
                        {title}
                    </span>
                    <span className={`ms-auto shrink-0 text-xs ${TRIM}`}>{period}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex h-8 min-w-0 items-center gap-2.5">
                        <span className={`text-2xl font-semibold tracking-tight tabular-nums ${TRIM}`}>{value}</span>
                        {delta}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{note}</span>
                </div>
                {children}
            </FramePanel>
        </Frame>
    );
}

function OfTotal({ value, total }: { value: number; total: number }) {
    return (
        <>
            {value}
            <span className="text-base font-normal text-muted-foreground">
                <span aria-hidden="true">/</span>
                <span className="sr-only"> of </span>
                {total}
            </span>
        </>
    );
}

/** Segment bar (grows in) + two-column legend grid. Tones are literal class names. */
function SegmentBlock({
    label,
    step,
    parts,
}: {
    label: string;
    step: number;
    parts: { label: string; value: number; bg: string }[];
}) {
    return (
        <div className="mt-auto flex flex-col gap-2.5">
            <div
                role="img"
                aria-label={label}
                data-rp-ch-rise="x"
                style={{ ['--rp-ch-delay' as any]: `${step * 60}ms` }}
                className="flex h-2 w-full gap-1"
            >
                {parts.map((p) => (
                    <span
                        key={p.label}
                        className={`h-full min-w-1 rounded-full ${p.bg}`}
                        style={{ flexGrow: p.value }}
                    />
                ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                {parts.map((p) => (
                    <div key={p.label} className="flex h-4 min-w-0 items-center gap-1.5 text-xs">
                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${p.bg}`} />
                        <dt
                            className={`min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap text-muted-foreground ${TRIM}`}
                        >
                            {p.label}
                        </dt>
                        <dd className={`ms-auto font-medium tabular-nums ${TRIM}`}>{p.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function TipRow({ dot, label, children }: { dot?: string; label: string; children?: any }) {
    return (
        <div className="flex h-4 min-w-0 items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                {dot ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} /> : null}
                <span className={`min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap ${TRIM}`}>{label}</span>
            </span>
            {children}
        </div>
    );
}

/** The pinned tooltip card (sits above the plot, full width). */
function TipCard({ day, today, children }: { day: SyncDay; today: boolean; children?: any }) {
    return (
        <div className="-translate-y-full">
            <div className="grid w-full min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <div className="font-medium">
                    <span className="flex h-4 items-center justify-between gap-4">
                        <span className={TRIM}>{day.label}</span>
                        {today ? <span className={`font-normal text-muted-foreground ${TRIM}`}>Today</span> : null}
                    </span>
                </div>
                <div className="grid gap-1.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
                </div>
            </div>
        </div>
    );
}

function pctText(v: number): string {
    return `${Math.abs(v * 100).toFixed(1)}%`;
}

export function ConnectionHealth({ title = 'Connection Health', data = SAMPLE, className }: ConnectionHealthProps) {
    const gid = `rp-ch-fill-${chartKey(useId())}`;
    const { connections: c, datasets: d, days } = data;
    const n = days.length;
    const totalConn = c.healthy + c.degraded + c.failing + c.paused;
    const totalSets = d.inSync + d.drifted + d.unlinked;
    const linked = d.inSync + d.drifted;
    const today = days[n - 1];
    const yesterday = days[n - 2] || today;
    const avg = days.reduce((a, x) => a + x.rows, 0) / Math.max(1, n);
    const rowsDelta = yesterday.rows ? (today.rows - yesterday.rows) / yesterday.rows : 0;
    const failedOf = (x: SyncDay) => x.failures.reduce((a, f) => a + f.count, 0);
    const failedToday = failedOf(today);
    const failedYesterday = failedOf(yesterday);
    const failedTotal = days.reduce((a, x) => a + failedOf(x), 0);
    const maxFailed = Math.max(1, ...days.map(failedOf));
    const rows = days.map((x, i) => ({ ...x, i, failed: failedOf(x), cap: maxFailed }));
    const rowsSummary = `Rows synced per day, last ${n} days: ${days.map((x) => `${x.label}: ${compactRows(x.rows)}`).join(', ')}`;
    const failSummary = `Failed runs per day, last ${n} days: ${days.map((x) => `${x.label}: ${failedOf(x)}`).join(', ')}`;

    return (
        <div className={`@container w-full min-w-0 ${className || ''}`} role="group" aria-label={title}>
            <style>{MOTION_CSS}</style>
            <div className="grid w-full gap-2 @xl:grid-cols-2 @5xl:grid-cols-4 @6xl:gap-3">
                <StatCard
                    icon="plug-zap"
                    title={title}
                    period="Now"
                    value={<OfTotal value={c.healthy} total={totalConn} />}
                    delta={
                        c.healthy !== data.healthyYesterday ? (
                            <DeltaMark
                                delta={c.healthy - data.healthyYesterday}
                                text={String(Math.abs(c.healthy - data.healthyYesterday))}
                                against="yesterday"
                            />
                        ) : null
                    }
                    note={`${data.healthyYesterday} healthy yesterday`}
                >
                    <SegmentBlock
                        step={0}
                        label={`Connections by health: ${c.healthy} healthy, ${c.degraded} degraded, ${c.failing} failing, ${c.paused} paused`}
                        parts={[
                            { label: 'Healthy', value: c.healthy, bg: 'bg-success' },
                            { label: 'Degraded', value: c.degraded, bg: 'bg-warning' },
                            { label: 'Failing', value: c.failing, bg: 'bg-destructive' },
                            { label: 'Paused', value: c.paused, bg: 'bg-muted-foreground/40' },
                        ]}
                    />
                </StatCard>

                <StatCard
                    icon="link"
                    title="Linked Datasets"
                    period="Now"
                    value={<OfTotal value={linked} total={totalSets} />}
                    delta={
                        linked !== data.linkedLastWeek ? (
                            <DeltaMark
                                delta={linked - data.linkedLastWeek}
                                text={String(Math.abs(linked - data.linkedLastWeek))}
                                against="last week"
                            />
                        ) : null
                    }
                    note={`${data.linkedLastWeek} linked last week`}
                >
                    <SegmentBlock
                        step={1}
                        label={`Datasets by sync state: ${d.inSync} in sync, ${d.drifted} drifted, ${d.unlinked} unlinked`}
                        parts={[
                            { label: 'In sync', value: d.inSync, bg: 'bg-info' },
                            { label: 'Drifted', value: d.drifted, bg: 'bg-warning' },
                            { label: 'Unlinked', value: d.unlinked, bg: 'bg-muted-foreground/30' },
                        ]}
                    />
                </StatCard>

                <StatCard
                    icon="arrow-left-right"
                    title="Rows Synced"
                    period={`${n} days`}
                    value={compactRows(today.rows)}
                    delta={<DeltaMark delta={rowsDelta} text={pctText(rowsDelta)} against="yesterday" />}
                    note={`${compactRows(yesterday.rows)} yesterday`}
                >
                    <div
                        data-rp-ch-rise="y"
                        style={{ ['--rp-ch-delay' as any]: '120ms' }}
                        className="mt-auto h-14 w-full outline-offset-2 has-focus-visible:outline-2 has-focus-visible:outline-ring/50"
                    >
                        <ChartFigure title="Rows synced per day" summary={`${rowsSummary}.`}>
                            <ChartContainer config={ROWS_CONFIG} className="aspect-auto h-14 w-full">
                                {(R: any) => (
                                    <R.AreaChart
                                        data={rows}
                                        margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
                                        accessibilityLayer
                                    >
                                        <defs>
                                            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--color-rows)" stopOpacity={0.24} />
                                                <stop offset="100%" stopColor="var(--color-rows)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <R.XAxis hide dataKey="date" />
                                        <R.YAxis hide domain={[(min: number) => min * 0.45, 'dataMax']} />
                                        <R.Tooltip
                                            cursor={false}
                                            position={{ x: 0, y: -6 }}
                                            allowEscapeViewBox={{ x: false, y: true }}
                                            wrapperStyle={{ width: '100%', zIndex: 50 }}
                                            isAnimationActive={false}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const x = payload[0].payload;
                                                const prev = x.i > 0 ? days[x.i - 1] : null;
                                                const dPrev = prev && prev.rows ? (x.rows - prev.rows) / prev.rows : 0;
                                                const dAvg = avg ? (x.rows - avg) / avg : 0;
                                                return (
                                                    <TipCard day={x} today={x.i === n - 1}>
                                                        <TipRow dot="bg-success" label="Rows synced">
                                                            <span
                                                                className={`shrink-0 font-mono font-medium text-foreground tabular-nums ${TRIM}`}
                                                            >
                                                                {x.rows.toLocaleString('en-US')}
                                                            </span>
                                                        </TipRow>
                                                        <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                                            {prev ? (
                                                                <TipRow label={`vs ${prev.date}`}>
                                                                    <DeltaMark
                                                                        size="sm"
                                                                        delta={dPrev}
                                                                        text={pctText(dPrev)}
                                                                        against={prev.date}
                                                                    />
                                                                </TipRow>
                                                            ) : null}
                                                            <TipRow label={`vs ${n} day avg`}>
                                                                <DeltaMark
                                                                    size="sm"
                                                                    delta={dAvg}
                                                                    text={pctText(dAvg)}
                                                                    against={`the ${n} day average`}
                                                                />
                                                            </TipRow>
                                                        </div>
                                                    </TipCard>
                                                );
                                            }}
                                        />
                                        <R.Area
                                            dataKey="rows"
                                            type="monotone"
                                            stroke="var(--color-rows)"
                                            strokeWidth={1.5}
                                            fill={`url(#${gid})`}
                                            fillOpacity={1}
                                            isAnimationActive={false}
                                            activeDot={{
                                                r: 3.5,
                                                fill: 'var(--color-rows)',
                                                stroke: 'var(--card)',
                                                strokeWidth: 2,
                                            }}
                                        />
                                        <R.ReferenceLine
                                            x={today.date}
                                            stroke="var(--color-rows)"
                                            strokeOpacity={0.5}
                                            strokeDasharray="2 3"
                                        />
                                        <R.ReferenceDot
                                            x={today.date}
                                            y={today.rows}
                                            r={4}
                                            fill="var(--color-rows)"
                                            stroke="var(--card)"
                                            strokeWidth={2}
                                            ifOverflow="visible"
                                        />
                                    </R.AreaChart>
                                )}
                            </ChartContainer>
                        </ChartFigure>
                    </div>
                </StatCard>

                <StatCard
                    icon="triangle-alert"
                    title="Failed Syncs"
                    period={`${n} days`}
                    value={failedToday}
                    delta={
                        <DeltaMark
                            delta={failedToday - failedYesterday}
                            text={String(Math.abs(failedToday - failedYesterday))}
                            against="yesterday"
                            upIsGood={false}
                        />
                    }
                    note={`${failedYesterday} yesterday, ${failedTotal} in ${n} days`}
                >
                    <div
                        data-rp-ch-rise="y"
                        style={{ ['--rp-ch-delay' as any]: '180ms' }}
                        className="mt-auto h-14 w-full outline-offset-2 has-focus-visible:outline-2 has-focus-visible:outline-ring/50"
                    >
                        <ChartFigure title="Failed runs per day" summary={`${failSummary}.`}>
                            <ChartContainer config={FAILED_CONFIG} className="aspect-auto h-14 w-full">
                                {(R: any) => (
                                    <R.BarChart
                                        data={rows}
                                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                                        accessibilityLayer
                                    >
                                        <R.XAxis hide dataKey="date" />
                                        <R.YAxis hide domain={[0, maxFailed]} />
                                        <R.Tooltip
                                            cursor={false}
                                            position={{ x: 0, y: -6 }}
                                            allowEscapeViewBox={{ x: false, y: true }}
                                            wrapperStyle={{ width: '100%', zIndex: 50 }}
                                            isAnimationActive={false}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const x = payload[0].payload;
                                                const prev = x.i > 0 ? days[x.i - 1] : null;
                                                const dv = prev ? x.failed - failedOf(prev) : 0;
                                                return (
                                                    <TipCard day={x} today={x.i === n - 1}>
                                                        <TipRow dot="bg-destructive" label="Failed runs">
                                                            <span
                                                                className={`shrink-0 font-mono font-medium text-foreground tabular-nums ${TRIM}`}
                                                            >
                                                                {x.failed}
                                                            </span>
                                                        </TipRow>
                                                        {prev ? (
                                                            <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                                                <TipRow label={`vs ${prev.date}`}>
                                                                    <DeltaMark
                                                                        size="sm"
                                                                        delta={dv}
                                                                        text={String(Math.abs(dv))}
                                                                        against={prev.date}
                                                                        upIsGood={false}
                                                                    />
                                                                </TipRow>
                                                            </div>
                                                        ) : null}
                                                        {x.failures.length ? (
                                                            <div className="flex flex-col gap-1.5 border-t pt-1.5">
                                                                {x.failures.map((f: any) => (
                                                                    <TipRow key={f.source} label={f.source}>
                                                                        <span
                                                                            className={`shrink-0 font-mono font-medium text-foreground tabular-nums ${TRIM}`}
                                                                        >
                                                                            {f.count}
                                                                        </span>
                                                                    </TipRow>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </TipCard>
                                                );
                                            }}
                                        />
                                        <R.Bar
                                            dataKey="cap"
                                            barSize={12}
                                            isAnimationActive={false}
                                            activeBar={false}
                                            shape={(p: any) => {
                                                const x = rows[p.index];
                                                if (!x) return <g />;
                                                const top = Math.min(p.y, p.y + p.height);
                                                const h = Math.abs(p.height);
                                                const vh = (h * x.failed) / maxFailed;
                                                return (
                                                    <g>
                                                        <rect
                                                            x={p.x}
                                                            y={top}
                                                            width={p.width}
                                                            height={h}
                                                            rx={Math.min(6, p.width / 2)}
                                                            className="fill-muted"
                                                        />
                                                        {vh > 0 ? (
                                                            <rect
                                                                x={p.x}
                                                                y={top + h - vh}
                                                                width={p.width}
                                                                height={vh}
                                                                rx={Math.min(6, vh / 2, p.width / 2)}
                                                                className={
                                                                    x.i === n - 1
                                                                        ? 'fill-destructive'
                                                                        : 'fill-destructive/40'
                                                                }
                                                            />
                                                        ) : null}
                                                    </g>
                                                );
                                            }}
                                        />
                                    </R.BarChart>
                                )}
                            </ChartContainer>
                        </ChartFigure>
                    </div>
                </StatCard>
            </div>
        </div>
    );
}

export default ConnectionHealth;
