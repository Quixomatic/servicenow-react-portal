import { useRef, useState } from 'react';
import { ChartContainer, ChartFigure } from 'components:chart';
import { useElementWidth } from 'components:charts/chart-kit';
import {
    Chip,
    StackedStripCard,
    StripFooter,
    MiniLegend,
    MiniLegendItem,
    HighlightColumn,
    bandCenter,
    stemEnd,
    barEnds,
} from 'components:charts/sparkline-kit';
import { SAMPLE } from './data';
import type { SloFleetData, SloBudget, BurnHour, BudgetEvent } from './data';

/**
 * components:charts/slo-fleet-health: a four-card SLO health strip with lollipop minis.
 * - Meeting Objective: budget left per SLO (lowest first) as pins from a zero line, a dashed 25% at-risk
 *   line, success / warning / destructive dots and warning rings on SLOs that are burning now.
 * - Median Budget Left: the fleet median over 28 days as pins from the value 7 days ago (earlier days faded,
 *   the comparison day hollow, today in success).
 * - Burning Now: hourly peak burn (log scale) against a dashed 14.4× page line.
 * - Budget Events: stacked event dots per day (incidents in destructive, an ongoing one haloed).
 * Hovering (or arrowing through) a mini moves its highlight column and reference dot and shows the point
 * in the card footer.
 *
 *   <SloFleetHealth />            sample data
 *   <SloFleetHealth data={...} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SloFleetHealthProps = {
    title?: string;
    data?: SloFleetData;
    className?: string;
};

const TONE_VAR: Record<string, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    destructive: 'var(--destructive)',
    muted: 'var(--muted-foreground)',
};

const PIN_CONFIG = { v: { label: 'Value' } };
const MARGIN = { top: 4, right: 6, bottom: 4, left: 6 };

type PinRow = { key: string; v: number; i: number };

/** One h-10 lollipop mini: highlight column, reference lines, custom-shaped bars and a reference dot. */
function MiniPins({
    rows,
    domain,
    refLines = [],
    shape,
    focus,
    hover,
    onHover,
    refDot,
    label,
}: {
    rows: PinRow[];
    domain: [number, number];
    refLines?: { y: number; stroke: string; opacity: number; dash?: string }[];
    shape: (p: any, focused: boolean) => any;
    /** Index the column (and reference dot) sit on when nothing is hovered. */
    focus: number;
    hover: number | null;
    onHover: (i: number | null) => void;
    /** Reference-dot colour for an index, or null for no reference dot. */
    refDot?: (i: number) => string | null;
    label: string;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const w = useElementWidth(wrapRef);
    const at = hover != null ? hover : focus;
    const x = w ? bandCenter(at, rows.length, w, MARGIN.left, MARGIN.right) : null;
    const dotFill = refDot ? refDot(at) : null;
    const move = (d: number) => onHover(Math.max(0, Math.min(rows.length - 1, (hover != null ? hover : focus) + d)));
    return (
        <div
            role="group"
            aria-label={label}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    move(e.key === 'ArrowLeft' ? -1 : 1);
                } else if (e.key === 'Home' || e.key === 'End') {
                    e.preventDefault();
                    onHover(e.key === 'Home' ? 0 : rows.length - 1);
                } else if (e.key === 'Escape') onHover(null);
            }}
            onBlur={() => onHover(null)}
            className="mt-auto min-w-0 outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50 [&_[class*=recharts-zIndex-layer]]:outline-hidden"
        >
            <div ref={wrapRef} className="relative flex h-10 min-w-0 flex-col">
                <HighlightColumn x={x} />
                <div className="relative min-h-0 flex-1">
                    <ChartContainer config={PIN_CONFIG} className="aspect-auto h-full w-full">
                        {(R: any) => (
                            <R.BarChart
                                data={rows}
                                margin={MARGIN}
                                onMouseMove={(st: any) =>
                                    onHover(st && st.activeTooltipIndex != null ? Number(st.activeTooltipIndex) : null)
                                }
                                onMouseLeave={() => onHover(null)}
                            >
                                <R.XAxis hide dataKey="key" />
                                <R.YAxis hide domain={domain} />
                                <R.Tooltip cursor={false} content={() => null} />
                                {refLines.map((l, k) => (
                                    <R.ReferenceLine
                                        key={`l${k}`}
                                        y={l.y}
                                        stroke={l.stroke}
                                        strokeWidth={1}
                                        strokeOpacity={l.opacity}
                                        strokeDasharray={l.dash}
                                    />
                                ))}
                                <R.Bar
                                    dataKey="v"
                                    isAnimationActive={false}
                                    activeBar={false}
                                    shape={(p: any) => shape(p, p.index === at)}
                                />
                                {dotFill ? (
                                    <R.ReferenceDot
                                        x={rows[at].key}
                                        y={rows[at].v}
                                        r={3.5}
                                        fill={dotFill}
                                        stroke="var(--card)"
                                        strokeWidth={2}
                                        ifOverflow="visible"
                                    />
                                ) : null}
                            </R.BarChart>
                        )}
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
}

/** The footer while a point is hovered: tone dot, label parts, value at the end. */
function HoverFooter({ color, parts, value }: { color: string; parts: any[]; value: any }) {
    return (
        <>
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
            <span className="flex min-w-0 items-center gap-1.5 [&>span:last-child]:truncate">
                {parts.map((p, k) =>
                    k < parts.length - 1 ? (
                        <span key={k} className="flex shrink-0 items-center gap-1.5">
                            <span>{p}</span>
                            <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        </span>
                    ) : (
                        <span key={k}>{p}</span>
                    )
                )}
            </span>
            <span className="ms-auto shrink-0 font-medium text-foreground tabular-nums">{value}</span>
        </>
    );
}

function Stem({
    cx,
    y1,
    y2,
    opacity,
    width = 1.5,
}: {
    cx: number;
    y1: number;
    y2: number;
    opacity: number;
    width?: number;
}) {
    return (
        <line
            stroke="var(--muted-foreground)"
            strokeWidth={width}
            x1={cx}
            y1={y1}
            x2={cx}
            y2={y2}
            strokeOpacity={opacity}
        />
    );
}

function sloTone(s: SloBudget): string {
    if (s.left < 0) return 'destructive';
    if (s.left < 0.25) return 'warning';
    return 'success';
}

function burnTone(h: BurnHour, page: number): string {
    if (h.burn >= page) return 'destructive';
    if (h.burn >= 1) return 'warning';
    return 'muted';
}

function burnText(b: number): string {
    if (b >= 10) return `${Math.round(b)}×`;
    if (b >= 1) return `${b.toFixed(1)}×`;
    return `${b.toFixed(2)}×`;
}

function pct(v: number): string {
    return `${Math.round(v * 100)}%`;
}

function eventsText(n: number): string {
    return `${n} ${n === 1 ? 'event' : 'events'}`;
}

function eventDot(e: BudgetEvent, cx: number, cy: number, r: number, k: number) {
    if (e.kind === 'change') {
        return (
            <circle
                key={k}
                cx={cx}
                cy={cy}
                r={r}
                fill="var(--card)"
                stroke="var(--muted-foreground)"
                strokeWidth={1.2}
            />
        );
    }
    return (
        <circle
            key={k}
            cx={cx}
            cy={cy}
            r={r}
            fill={e.kind === 'incident' ? 'var(--destructive)' : 'var(--muted-foreground)'}
        />
    );
}

export function SloFleetHealth({ title = 'SLO Fleet Health', data = SAMPLE, className }: SloFleetHealthProps) {
    const { slos, median, baseIndex, burn, events, pageBurn } = data;
    const [h1, setH1] = useState<number | null>(null);
    const [h2, setH2] = useState<number | null>(null);
    const [h3, setH3] = useState<number | null>(null);
    const [h4, setH4] = useState<number | null>(null);

    // Card 1: budget left per SLO.
    const tones = slos.map(sloTone);
    const exhausted = tones.filter((t) => t === 'destructive').length;
    const atRisk = slos.filter((s, i) => tones[i] === 'warning' || (tones[i] === 'success' && s.burning)).length;
    const healthy = slos.length - exhausted - atRisk;
    const meeting = slos.length - exhausted;
    const missIndex = Math.max(
        0,
        slos.findIndex((s) => s.name === data.newestMiss.name)
    );
    const rows1 = slos.map((s, i) => ({ key: s.name, v: s.left, i }));

    // Card 2: fleet median, as pins from the comparison day.
    const base = median[baseIndex] ? median[baseIndex].value : median[0].value;
    const today = median[median.length - 1].value;
    const deltas = median.map((m) => m.value - base);
    const lo = Math.min(...deltas);
    const hi = Math.max(...deltas);
    const pad = (hi - lo || 0.1) * 0.15;
    const rows2 = median.map((m, i) => ({
        key: m.date,
        v: deltas[i] || 1e-9,
        i,
    }));
    const lowDay = median.reduce((a, m) => (m.value < a.value ? m : a), median[0]);
    const lastIdx2 = median.length - 1;

    // Card 3: hourly peak burn on a log scale.
    const rows3 = burn.map((h, i) => ({
        key: `${h.time}`,
        v: Math.log10(Math.max(0.1, h.burn)),
        i,
    }));
    const overPage = burn.filter((h) => h.burn >= pageBurn).length;
    const overPace = burn.filter((h) => h.burn >= 1 && h.burn < pageBurn).length;
    const peak = burn.reduce((a, h) => (h.burn > a.burn ? h : a), burn[0]);
    const hottest = burn[burn.length - 1];

    // Card 4: budget events per day.
    const rows4 = events.map((d, i) => ({ key: d.date, v: 1, i }));
    const allEvents = events.flatMap((d) => d.events);
    const incidents = allEvents.filter((e) => e.kind === 'incident').length;
    const lastWithEvent = events.reduce((a, d, i) => (d.events.length ? i : a), events.length - 1);
    const latest = events[lastWithEvent].events[0];

    const label1 = `Budget left by SLO, lowest first: ${healthy} healthy, ${atRisk} at risk, ${exhausted} exhausted. Newest miss ${data.newestMiss.name}, ${data.newestMiss.date}`;
    const label2 = `Median budget left, last ${median.length} days: low ${pct(lowDay.value)} on ${lowDay.date}. Lowest ${data.lowest.name}, ${pct(data.lowest.over)} over budget`;
    const label3 = `Peak burn by hour, last ${burn.length} hours: ${overPage} hours over the ${pageBurn}× page line. Peak ${peak.slo} at ${burnText(peak.burn)}, ${peak.time}. Hottest now ${hottest.slo} at ${burnText(hottest.burn)}`;
    const label4 = `${allEvents.length} events in ${events.length} days, ${incidents} incidents.${latest ? ` Latest ${latest.name}, ${latest.ongoing ? 'ongoing' : 'resolved'}` : ''}`;

    const s1 = h1 != null ? slos[h1] : null;
    const m2 = h2 != null ? median[h2] : null;
    const b3 = h3 != null ? burn[h3] : null;
    const d4 = h4 != null ? events[h4] : null;

    return (
        <div className={`@container w-full min-w-0 ${className || ''}`} role="group" aria-label={title}>
            <div className="grid w-full grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
                <StackedStripCard
                    icon="target"
                    title="Meeting Objective"
                    description="SLOs with budget left"
                    footer={
                        s1 ? (
                            <HoverFooter
                                color={TONE_VAR[tones[h1 as number]]}
                                parts={[s1.name]}
                                value={s1.left < 0 ? `${pct(-s1.left)} over budget` : `${pct(s1.left)} left`}
                            />
                        ) : (
                            <StripFooter lead="Newest miss" name={data.newestMiss.name} end={data.newestMiss.date} />
                        )
                    }
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                            {meeting}
                            <span className="ms-1 text-sm font-normal text-muted-foreground">of {slos.length}</span>
                        </span>
                        {data.meetingDelta ? (
                            <Chip
                                icon={data.meetingDelta < 0 ? 'arrow-down' : 'arrow-up'}
                                className={data.meetingDelta < 0 ? '[&_svg]:text-destructive' : '[&_svg]:text-success'}
                            >
                                <span className="sr-only">{data.meetingDelta < 0 ? 'Down ' : 'Up '}</span>
                                {Math.abs(data.meetingDelta)}
                                <span className="sr-only"> vs 7 days ago</span>
                            </Chip>
                        ) : null}
                    </div>
                    <ChartFigure title="Budget left by SLO" summary={`${label1}.`}>
                        <MiniPins
                            rows={rows1}
                            domain={[-0.5, 1]}
                            refLines={[
                                { y: 0, stroke: 'var(--foreground)', opacity: 0.25 },
                                {
                                    y: 0.25,
                                    stroke: 'var(--warning)',
                                    opacity: 0.5,
                                    dash: '2 3',
                                },
                            ]}
                            focus={missIndex}
                            hover={h1}
                            onHover={setH1}
                            refDot={(i) => TONE_VAR[tones[i]]}
                            label={label1}
                            shape={(p: any) => {
                                const s = slos[p.index];
                                if (!s) return <g />;
                                const cx = p.x + p.width / 2;
                                const { valueY, baseY } = barEnds(p, s.left);
                                const end = stemEnd(baseY, valueY);
                                return (
                                    <g>
                                        {end != null ? <Stem cx={cx} y1={baseY} y2={end} opacity={0.32} /> : null}
                                        {s.burning ? (
                                            <circle
                                                cx={cx}
                                                cy={valueY}
                                                r={5.5}
                                                fill="none"
                                                stroke="var(--warning)"
                                                strokeWidth={1.5}
                                                strokeOpacity={0.35}
                                            />
                                        ) : null}
                                        <circle cx={cx} cy={valueY} r={2.5} fill={TONE_VAR[tones[p.index]]} />
                                    </g>
                                );
                            }}
                        />
                    </ChartFigure>
                    <MiniLegend>
                        <MiniLegendItem
                            tone="success"
                            value={healthy}
                            label="Healthy"
                            labelClassName=""
                            className="@max-[15.5rem]:sr-only"
                        />
                        <MiniLegendItem tone="warning" value={atRisk} label="At Risk" labelClassName="" />
                        <MiniLegendItem tone="destructive" value={exhausted} label="Exhausted" labelClassName="" />
                    </MiniLegend>
                </StackedStripCard>

                <StackedStripCard
                    icon="wallet"
                    title="Median Budget Left"
                    description={`Fleet median, last ${median.length} days`}
                    footer={
                        m2 ? (
                            <HoverFooter
                                color={h2 === lastIdx2 ? 'var(--success)' : 'var(--muted-foreground)'}
                                parts={h2 === baseIndex ? [m2.date, '7 days ago'] : [m2.date]}
                                value={pct(m2.value)}
                            />
                        ) : (
                            <StripFooter
                                lead="Lowest"
                                name={data.lowest.name}
                                end={
                                    <>
                                        <span className="font-medium text-destructive">{pct(data.lowest.over)}</span>{' '}
                                        over
                                    </>
                                }
                            />
                        )
                    }
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-2xl font-semibold tracking-tight whitespace-nowrap text-foreground tabular-nums">
                            {pct(today)}
                        </span>
                        {Math.round((today - base) * 100) !== 0 ? (
                            <Chip
                                icon={today < base ? 'arrow-down' : 'arrow-up'}
                                className={today < base ? '[&_svg]:text-destructive' : '[&_svg]:text-success'}
                            >
                                <span className="sr-only">{today < base ? 'Down ' : 'Up '}</span>
                                {Math.abs(Math.round((today - base) * 100))} pts
                                <span className="sr-only"> vs 7 days ago</span>
                            </Chip>
                        ) : null}
                    </div>
                    <ChartFigure title="Median budget left" summary={`${label2}.`}>
                        <MiniPins
                            rows={rows2}
                            domain={[lo - pad, hi + pad]}
                            refLines={[
                                {
                                    y: 0,
                                    stroke: 'var(--foreground)',
                                    opacity: 0.25,
                                    dash: '2 3',
                                },
                            ]}
                            focus={lastIdx2}
                            hover={h2}
                            onHover={setH2}
                            refDot={(i) => (i === lastIdx2 ? 'var(--success)' : 'var(--muted-foreground)')}
                            label={label2}
                            shape={(p: any) => {
                                const i = p.index;
                                const cx = p.x + p.width / 2;
                                const { valueY, baseY } = barEnds(p, deltas[i] || 0);
                                if (i === baseIndex) {
                                    return (
                                        <g>
                                            <circle
                                                cx={cx}
                                                cy={baseY}
                                                r={3.5}
                                                fill="var(--card)"
                                                stroke="var(--muted-foreground)"
                                                strokeWidth={1.5}
                                                opacity={0.45}
                                            />
                                        </g>
                                    );
                                }
                                const faded = i < baseIndex;
                                const end = stemEnd(baseY, valueY);
                                return (
                                    <g>
                                        {end != null ? (
                                            <Stem cx={cx} y1={baseY} y2={end} opacity={faded ? 0.16 : 0.32} />
                                        ) : null}
                                        <circle
                                            cx={cx}
                                            cy={valueY}
                                            r={2.5}
                                            fill={i === lastIdx2 ? 'var(--success)' : 'var(--muted-foreground)'}
                                            opacity={faded ? 0.45 : undefined}
                                        />
                                    </g>
                                );
                            }}
                        />
                    </ChartFigure>
                    <MiniLegend>
                        <MiniLegendItem
                            dot={
                                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                                    <line
                                        x1="0"
                                        x2="12"
                                        y1="6"
                                        y2="6"
                                        stroke="var(--muted-foreground)"
                                        strokeWidth="1.5"
                                        strokeDasharray="3 1.5"
                                    />
                                </svg>
                            }
                            value={pct(base)}
                            label={`on ${median[baseIndex] ? median[baseIndex].date : median[0].date}`}
                        />
                        <MiniLegendItem color="var(--success)" value={pct(today)} label="today" />
                    </MiniLegend>
                </StackedStripCard>

                <StackedStripCard
                    icon="flame"
                    title="Burning Now"
                    description={`Hourly fleet peak, last ${burn.length}h`}
                    footer={
                        b3 ? (
                            <HoverFooter
                                color={TONE_VAR[burnTone(b3, pageBurn)]}
                                parts={[b3.time, b3.slo]}
                                value={burnText(b3.burn)}
                            />
                        ) : (
                            <StripFooter
                                lead="Hottest"
                                name={hottest.slo}
                                end={
                                    <span
                                        className={`font-medium ${hottest.burn >= pageBurn ? 'text-destructive' : hottest.burn >= 1 ? 'text-warning-foreground dark:text-warning' : 'text-foreground'}`}
                                    >
                                        {burnText(hottest.burn)}
                                    </span>
                                }
                            />
                        )
                    }
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                            {data.alerting.paging + data.alerting.ticket}
                            <span className="ms-1 text-sm font-normal text-muted-foreground">alerting</span>
                        </span>
                        {data.alerting.paging ? <Chip tone="destructive">{data.alerting.paging} Paging</Chip> : null}
                        {data.alerting.ticket ? <Chip tone="warning">{data.alerting.ticket} Ticket</Chip> : null}
                    </div>
                    <ChartFigure title="Peak burn by hour" summary={`${label3}.`}>
                        <MiniPins
                            rows={rows3}
                            domain={[-1, 2]}
                            refLines={[
                                { y: 0, stroke: 'var(--foreground)', opacity: 0.2 },
                                {
                                    y: Math.log10(pageBurn),
                                    stroke: 'var(--destructive)',
                                    opacity: 0.5,
                                    dash: '3 3',
                                },
                            ]}
                            focus={burn.length - 1}
                            hover={h3}
                            onHover={setH3}
                            refDot={(i) => TONE_VAR[burnTone(burn[i], pageBurn)]}
                            label={label3}
                            shape={(p: any) => {
                                const hr = burn[p.index];
                                if (!hr) return <g />;
                                const cx = p.x + p.width / 2;
                                const v = rows3[p.index].v;
                                const { valueY, baseY } = barEnds(p, v);
                                if (hr.burn < 1) {
                                    return (
                                        <g>
                                            <circle
                                                cx={cx}
                                                cy={valueY}
                                                r={1.5}
                                                fill="var(--muted-foreground)"
                                                fillOpacity={0.5}
                                            />
                                        </g>
                                    );
                                }
                                const end = stemEnd(baseY, valueY);
                                return (
                                    <g>
                                        {end != null ? <Stem cx={cx} y1={baseY} y2={end} opacity={0.3} /> : null}
                                        <circle cx={cx} cy={valueY} r={2.5} fill={TONE_VAR[burnTone(hr, pageBurn)]} />
                                    </g>
                                );
                            }}
                        />
                    </ChartFigure>
                    <MiniLegend>
                        <MiniLegendItem tone="destructive" value={`${overPage}h`} label="over page" />
                        <MiniLegendItem tone="warning" value={`${overPace}h`} label="over pace" />
                    </MiniLegend>
                </StackedStripCard>

                <StackedStripCard
                    icon="calendar-clock"
                    title="Budget Events"
                    description={`Incidents and changes, ${events.length} days`}
                    footer={
                        d4 ? (
                            <HoverFooter
                                color={
                                    d4.events.some((e) => e.kind === 'incident')
                                        ? 'var(--destructive)'
                                        : 'var(--muted-foreground)'
                                }
                                parts={[d4.date]}
                                value={eventsText(d4.events.length)}
                            />
                        ) : latest ? (
                            <StripFooter
                                lead="Latest"
                                name={latest.name}
                                end={
                                    latest.ongoing ? (
                                        <span className="text-warning-foreground dark:text-warning">Ongoing</span>
                                    ) : (
                                        events[lastWithEvent].date
                                    )
                                }
                            />
                        ) : null
                    }
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                            {allEvents.length}
                        </span>
                        <Chip>MTTR {data.mttr}</Chip>
                    </div>
                    <ChartFigure title="Budget events by day" summary={`${label4}.`}>
                        <MiniPins
                            rows={rows4}
                            domain={[0, 1]}
                            focus={events.length - 1}
                            hover={h4}
                            onHover={setH4}
                            label={label4}
                            shape={(p: any, focused: boolean) => {
                                const d = events[p.index];
                                if (!d) return <g />;
                                const cx = p.x + p.width / 2;
                                const { baseY: bottom } = barEnds(p, 1);
                                const baseY = bottom - 3;
                                if (!d.events.length) {
                                    return (
                                        <g>
                                            <circle
                                                cx={cx}
                                                cy={baseY}
                                                r={1}
                                                fill="var(--muted-foreground)"
                                                fillOpacity={0.3}
                                            />
                                        </g>
                                    );
                                }
                                const n = d.events.length;
                                const topY = baseY - 4 - 7 * (n - 1);
                                return (
                                    <g>
                                        <Stem cx={cx} y1={baseY} y2={topY} opacity={0.3} width={1} />
                                        {d.events.map((e, k) => {
                                            const cy = baseY - 4 - 7 * k;
                                            const r = focused && k === n - 1 && n > 1 ? 3 : 2.5;
                                            return (
                                                <g key={k}>
                                                    {e.ongoing ? (
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r={5.5}
                                                            fill="var(--destructive)"
                                                            fillOpacity={0.1}
                                                        />
                                                    ) : null}
                                                    {eventDot(e, cx, cy, r, k)}
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            }}
                        />
                    </ChartFigure>
                    <MiniLegend>
                        <MiniLegendItem tone="destructive" value={incidents} label="Incidents" />
                        <MiniLegendItem
                            dot={
                                <span
                                    aria-hidden="true"
                                    className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
                                />
                            }
                            value={allEvents.length - incidents}
                            label="Other"
                        />
                    </MiniLegend>
                </StackedStripCard>
            </div>
        </div>
    );
}

export default SloFleetHealth;
