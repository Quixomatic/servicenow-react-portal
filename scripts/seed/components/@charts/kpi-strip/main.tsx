import { useMemo } from 'react';
import { ChartFigure } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { series, SeriesScope } from 'components:charts/chart-kit';
import { SparkLine, SparkTip, TrendBadge, ValueSuffix } from 'components:charts/sparkline-kit';
import { KPIS } from './data';
import type { Kpi } from './data';

/**
 * components:charts/kpi-strip: a row of KPI tiles (value with a faded unit, label, trend badge and
 * caption), each with a small line sparkline in its top-right corner and a day-by-day hover tooltip.
 * One column on narrow cards, two from @2xl, then one row of four from @4xl.
 *
 *   <KpiStrip />                         sample data
 *   <KpiStrip kpis={[{ key, label, value, suffix, trend, trendLabel, seriesLabel, format, data }]} />
 *
 * data rows: { day, value }.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type KpiStripProps = {
    title?: string;
    kpis?: Kpi[];
    /** Sparkline colour (Tailwind palette names), light / dark. */
    color?: [string, string];
    className?: string;
};

function formatPoint(k: Kpi, v: number): string {
    if (k.format === 'moneyK') return `$${Number((v / 1000).toFixed(1))}k`;
    if (k.format === 'money') return `$${v.toLocaleString('en-US')}`;
    return v.toLocaleString('en-US');
}

/** Border classes per tile so the rules sit between tiles at 1, 2 and 4 columns (literal strings only). */
function cellBorders(i: number, n: number): string {
    const out: string[] = [];
    if (i < n - 1) out.push('border-b');
    const lastRow2 = i >= n - (n % 2 || 2);
    if (i % 2 === 0 && i < n - 1) out.push('@2xl:border-r!');
    if (lastRow2) out.push('@2xl:border-b-0!');
    else if (i < n - 1) out.push('@2xl:border-b!');
    const lastRow4 = i >= n - (n % 4 || 4);
    out.push(i % 4 !== 3 && i < n - 1 ? '@4xl:border-r!' : '@4xl:border-r-0!');
    out.push(lastRow4 ? '@4xl:border-b-0!' : '@4xl:border-b!');
    return out.join(' ');
}

export function KpiStrip({
    title = 'KPI Strip',
    kpis = KPIS,
    color = ['neutral-500', 'neutral-400'],
    className,
}: KpiStripProps) {
    const config = useMemo(() => ({ value: series(color[0], color[1], 'Value') }), [color[0], color[1]]);
    const summary = kpis
        .map(
            (k) =>
                `${k.label} ${k.value}${k.suffix || ''}, ${k.trend >= 0 ? 'up' : 'down'} ${Math.abs(k.trend)}% (${k.trendLabel.toLowerCase()}). ${k.seriesLabel}: ${k.data.map((d) => `${d.day} ${formatPoint(k, d.value)}`).join(', ')}.`
        )
        .join(' ');

    return (
        <SeriesScope config={config} className={`@container w-full min-w-0 ${className || ''}`}>
            <Frame>
                <FramePanel className="p-0!">
                    <ChartFigure title={title} summary={summary}>
                        <div className="grid overflow-hidden @2xl:grid-cols-2 @4xl:grid-cols-4">
                            {kpis.map((k, i) => (
                                <div
                                    key={k.key}
                                    className={`relative min-h-[102px] overflow-hidden border-border/60 p-4 ${cellBorders(i, kpis.length)}`}
                                >
                                    <SparkLine
                                        data={k.data}
                                        dataKey="value"
                                        color="var(--color-value)"
                                        strokeOpacity={0.45}
                                        className="absolute top-5 right-4 z-10 aspect-auto h-8 w-[76px]"
                                        tooltipPosition={{ y: 32 }}
                                        label={`${k.label} trend`}
                                        tooltip={(row) => (
                                            <SparkTip
                                                label={row.day}
                                                rows={[{ label: k.seriesLabel, value: formatPoint(k, row.value) }]}
                                            />
                                        )}
                                    />
                                    <div className="flex min-h-[70px] flex-col justify-between gap-5">
                                        <div className="flex flex-col gap-0.5 pr-24">
                                            <ValueSuffix value={k.value} suffix={k.suffix} />
                                            <h3 className="text-xs leading-none text-muted-foreground">{k.label}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendBadge up={k.trend >= 0}>{Math.abs(k.trend).toFixed(2)}%</TrendBadge>
                                            <span className="text-xs text-muted-foreground">{k.trendLabel}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartFigure>
                </FramePanel>
            </Frame>
        </SeriesScope>
    );
}

export default KpiStrip;
