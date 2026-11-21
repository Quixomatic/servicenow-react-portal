import { useId, useMemo, useRef } from 'react';
import { ChartContainer, ChartFigure, chartKey } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { Icon } from 'components:icon';
import { series, SeriesScope } from 'components:charts/chart-kit';
import { useAreaReveal, kOne } from 'components:charts/sparkline-kit';
import { CARDS } from './data';
import type { TrendCard } from './data';

/**
 * components:charts/kpi-trend-cards: three KPI cards (icon + title, caption, big value) each with a
 * monotone sparkline area on a soft vertical gradient. Hovering a sparkline shows a dashed cursor, a
 * solid active dot and the point's value. One column, then three from @3xl.
 *
 *   <KpiTrendCards />                     sample data
 *   <KpiTrendCards cards={[{ key, title, icon, light, dark, caption, value, unit, data: [..] }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type KpiTrendCardsProps = {
    title?: string;
    cards?: TrendCard[];
    className?: string;
};

function CardView({ card }: { card: TrendCard }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const gid = `rp-ktc-${chartKey(useId())}`;
    const rows = useMemo(() => card.data.map((value, i) => ({ i, value })), [card.data]);
    const color = `var(--color-${card.key})`;
    useAreaReveal(rootRef, [rows]);
    const fmt = (v: number) => `${kOne(v)}${card.unit ? ` ${card.unit}` : ''}`;
    const summary = `${card.title}: ${card.value} (${card.caption.toLowerCase()}). Trend points: ${card.data.map(fmt).join(', ')}.`;
    return (
        <Frame>
            <FramePanel className="space-y-5">
                <div className="flex items-center gap-2">
                    <span className="[&_svg]:size-5" style={{ color }}>
                        <Icon name={card.icon} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold">{card.title}</span>
                </div>
                <div className="flex items-end justify-between gap-2.5">
                    <div className="flex flex-col gap-px pb-2">
                        <div className="text-xs whitespace-nowrap text-muted-foreground">{card.caption}</div>
                        <div className="text-xl font-semibold tracking-tight text-foreground">{card.value}</div>
                    </div>
                    <ChartFigure title={`${card.title} trend`} summary={summary} className="w-full max-w-40 gap-0">
                        <div ref={rootRef} className="relative h-16 w-full">
                            <ChartContainer className="aspect-auto h-full w-full text-base">
                                {(R: any) => (
                                    <R.AreaChart
                                        data={rows}
                                        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                                        accessibilityLayer
                                    >
                                        <defs>
                                            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <R.YAxis hide />
                                        <R.Tooltip
                                            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '2 2' }}
                                            content={({ active, payload }: any) =>
                                                active && payload && payload.length ? (
                                                    <div className="pointer-events-none rounded-md border border-border bg-popover p-2 shadow-lg backdrop-blur-sm">
                                                        <p className="text-sm font-semibold text-popover-foreground">
                                                            {fmt(payload[0].value)}
                                                        </p>
                                                    </div>
                                                ) : null
                                            }
                                        />
                                        <R.Area
                                            dataKey="value"
                                            type="monotone"
                                            stroke={color}
                                            strokeWidth={2}
                                            fill={`url(#${gid})`}
                                            fillOpacity={0.6}
                                            dot={false}
                                            activeDot={{
                                                r: 4,
                                                fill: color,
                                                stroke: 'var(--card)',
                                                strokeWidth: 2,
                                            }}
                                            isAnimationActive={false}
                                        />
                                    </R.AreaChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                </div>
            </FramePanel>
        </Frame>
    );
}

export function KpiTrendCards({ title = 'KPI Trend Cards', cards = CARDS, className }: KpiTrendCardsProps) {
    const config = useMemo(() => {
        const cfg: Record<string, any> = {};
        cards.forEach((c) => {
            cfg[c.key] = series(c.light, c.dark, c.title);
        });
        return cfg;
    }, [cards]);
    return (
        <SeriesScope
            config={config}
            className={`@container w-full min-w-0 ${className || ''}`}
            role="group"
            aria-label={title}
        >
            <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
                {cards.map((c) => (
                    <CardView key={c.key} card={c} />
                ))}
            </div>
        </SeriesScope>
    );
}

export default KpiTrendCards;
