import { useMemo } from 'react';
import { ChartFigure } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { series } from 'components:charts/chart-kit';
import { SparkLine, TrendBadge } from 'components:charts/sparkline-kit';
import { METRICS, TREND_DOMAIN } from './data';
import type { OrderMetric } from './data';

/**
 * components:charts/order-metrics: a vertical list of order metrics. Each row shows the value (with a
 * faded unit), a trend badge and the label, and a thin line sparkline on a faint masked grid, green
 * when the metric is up and red when it is down.
 *
 *   <OrderMetrics />                                  sample data
 *   <OrderMetrics metrics={[{ key, label, value, suffix, change, trend: [..] }]} domain={[0, 36]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type OrderMetricsProps = {
    title?: string;
    metrics?: OrderMetric[];
    /** Sparkline value domain shared by every row. */
    domain?: [number, number];
    className?: string;
};

const UP = series('emerald-500', 'emerald-400', 'Up');
const DOWN = series('red-600', 'red-400', 'Down');

function Row({ m, domain }: { m: OrderMetric; domain: [number, number] }) {
    const up = m.change >= 0;
    const config = useMemo(() => ({ value: up ? UP : DOWN }), [up]);
    const data = useMemo(() => m.trend.map((value, i) => ({ i, value })), [m.trend]);
    return (
        <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-4 @sm:px-5">
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">
                        {m.value}
                        {m.suffix ? <span className="text-muted-foreground/45">{m.suffix}</span> : null}
                    </span>
                    <TrendBadge up={up} size="sm">
                        {Math.abs(m.change).toFixed(2)}%
                    </TrendBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.label}</p>
            </div>
            <div className="relative h-11 w-32 shrink-0 @sm:w-40">
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] [background-size:12px_12px] opacity-30"
                />
                <SparkLine
                    data={data}
                    dataKey="value"
                    color="var(--color-value)"
                    config={config}
                    className="aspect-auto h-full w-full"
                    strokeWidth={1.25}
                    margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
                    domain={domain}
                    animate={false}
                    lineProps={{ strokeLinecap: 'round' }}
                    label={`${m.label} trend`}
                />
            </div>
        </div>
    );
}

export function OrderMetrics({
    title = 'Order Metrics',
    metrics = METRICS,
    domain = TREND_DOMAIN,
    className,
}: OrderMetricsProps) {
    const summary = metrics
        .map(
            (m) =>
                `${m.label} ${m.value}${m.suffix || ''}, ${m.change >= 0 ? 'up' : 'down'} ${Math.abs(m.change).toFixed(2)}%.`
        )
        .join(' ');
    return (
        <div className={`@container w-full min-w-0 ${className || ''}`}>
            <Frame>
                <FramePanel className="p-0!">
                    <ChartFigure title={title} summary={summary}>
                        <ul className="flex flex-col">
                            {metrics.map((m, i) => (
                                <li key={m.key}>
                                    <Row m={m} domain={domain} />
                                    {i < metrics.length - 1 ? (
                                        <div role="separator" className="h-px w-full shrink-0 bg-border" />
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </ChartFigure>
                </FramePanel>
            </Frame>
        </div>
    );
}

export default OrderMetrics;
