import { useId, useMemo, useRef } from 'react';
import { ChartContainer, ChartFigure, chartKey } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { Icon } from 'components:icon';
import { series } from 'components:charts/chart-kit';
import { TrendBadge, useAreaReveal } from 'components:charts/sparkline-kit';
import { CARDS } from './data';
import type { WealthCard } from './data';

/**
 * components:charts/wealth-overview: a 2 × 2 grid of finance KPIs. Each card has a title, a corner note
 * (period label or a stack of small marks), a big value with a tinted delta badge and a full-width mini
 * area sparkline (gradient fill, revealed left to right) with a line-indicator tooltip.
 *
 *   <WealthOverview />                                  sample data
 *   <WealthOverview cards={[{ key, title, value, delta, tone, period | marks, light, dark, data }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type WealthOverviewProps = {
    title?: string;
    cards?: WealthCard[];
    className?: string;
};

function Card({ c }: { c: WealthCard }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const gid = `rp-wo-${chartKey(useId())}`;
    const config = useMemo(() => ({ value: series(c.light, c.dark, c.title) }), [c.light, c.dark, c.title]);
    const rows = useMemo(() => c.data.map((value, i) => ({ i, value })), [c.data]);
    useAreaReveal(rootRef, [rows]);
    const summary = `${c.title}: ${c.value}, ${c.delta}. Trend from ${c.data[0]} to ${c.data[c.data.length - 1]} (low ${Math.min(...c.data)}, high ${Math.max(...c.data)}).`;
    return (
        <FramePanel className="flex flex-col overflow-hidden p-0!">
            <div className="p-5">
                <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                    <h3 className="text-sm text-muted-foreground">{c.title}</h3>
                    {c.marks ? (
                        <div className="flex shrink-0 items-center gap-1">
                            {c.marks.map((m) => (
                                <span key={m.label} title={m.label} style={{ color: m.color }}>
                                    {m.bg ? (
                                        <span
                                            className="flex size-3.5 shrink-0 items-center justify-center rounded-full"
                                            style={{ background: m.bg }}
                                        >
                                            <Icon
                                                name={m.icon}
                                                className="size-2.5"
                                                strokeWidth={2.5}
                                                aria-label={m.label}
                                            />
                                        </span>
                                    ) : (
                                        <Icon name={m.icon} className="size-3.5 shrink-0" aria-label={m.label} />
                                    )}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs leading-none text-muted-foreground">{c.period}</span>
                    )}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                    <span className="text-2xl font-semibold text-foreground">{c.value}</span>
                    <TrendBadge up={c.tone !== 'destructive'} tone={c.tone} icon={c.deltaIcon} size="sm" bordered>
                        {c.delta}
                    </TrendBadge>
                </div>
            </div>
            <div className="mt-auto w-full">
                <ChartFigure title={`${c.title} trend`} summary={summary}>
                    <div ref={rootRef}>
                        <ChartContainer config={config} className="aspect-auto h-16 w-full">
                            {(R: any) => (
                                <R.AreaChart
                                    data={rows}
                                    margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                                    accessibilityLayer
                                >
                                    <defs>
                                        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.18} />
                                            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <R.YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                                    <R.Tooltip
                                        cursor={false}
                                        content={({ active, payload }: any) =>
                                            active && payload && payload.length ? (
                                                <div className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                    <div className="flex w-full flex-wrap items-stretch gap-2">
                                                        <div
                                                            className="w-1 shrink-0 rounded-[2px]"
                                                            style={{ background: 'var(--color-value)' }}
                                                        />
                                                        <div className="flex flex-1 items-end justify-between leading-none">
                                                            <span className="text-muted-foreground">{c.title}</span>
                                                            <span className="font-mono font-medium text-foreground tabular-nums">
                                                                {payload[0].value}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null
                                        }
                                    />
                                    <R.Area
                                        dataKey="value"
                                        type="linear"
                                        stroke="var(--color-value)"
                                        strokeWidth={1}
                                        fill={`url(#${gid})`}
                                        fillOpacity={0.6}
                                        dot={false}
                                        activeDot={{
                                            r: 2.5,
                                            fill: 'var(--background)',
                                            stroke: 'var(--color-value)',
                                            strokeWidth: 1.5,
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
    );
}

export function WealthOverview({ title = 'Wealth Overview', cards = CARDS, className }: WealthOverviewProps) {
    return (
        <div className={`@container w-full min-w-0 ${className || ''}`} role="group" aria-label={title}>
            <Frame>
                <div className="grid gap-1 @sm:grid-cols-2">
                    {cards.map((c) => (
                        <Card key={c.key} c={c} />
                    ))}
                </div>
            </Frame>
        </div>
    );
}

export default WealthOverview;
