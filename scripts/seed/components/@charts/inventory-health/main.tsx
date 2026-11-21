import { useMemo, useState } from 'react';
import { ChartFigure } from 'components:chart';
import { Frame, FramePanel, FrameFooter } from 'components:chart-frame';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope } from 'components:charts/chart-kit';
import { SparkLine, TrendBadge, PeriodTabs } from 'components:charts/sparkline-kit';
import { METRICS, PERIODS } from './data';
import type { HealthMetricDef, HealthPeriod } from './data';

/**
 * components:charts/inventory-health: a catalog health summary card. Four metrics (in stock, out of
 * stock, pending restock, slow movers) each show a value, a change badge, a caption and a natural-curve
 * sparkline with a point tooltip. Week / Month / Year tabs swap every value, series and the footer note.
 * A dotted texture fades down the top of the card; the footer has an analytics link.
 *
 *   <InventoryHealth />                                         sample data
 *   <InventoryHealth metrics={[…]} periods={[{ key, label, pointPrefix, footer, stats }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type InventoryHealthProps = {
    title?: string;
    description?: string;
    metrics?: HealthMetricDef[];
    periods?: HealthPeriod[];
    defaultPeriod?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
};

const CONFIG = { trend: series('neutral-500', 'neutral-400', 'Trend') };

/* Literal class sets per tile position (1 column, 2 from @xl, 4 from @4xl). */
const CELL = [
    'pe-2 @xl:pe-5',
    'pe-2 @xl:pe-5 border-t @xl:border-t-0!',
    'pe-2 @xl:pe-5 border-t @4xl:border-t-0!',
    'pr-2 border-t @4xl:border-t-0!',
];
const RULE = ['', '@xl:block!', '@4xl:block!', '@xl:block!'];
const INNER = ['', '@xl:ps-5!', '@4xl:ps-5!', '@xl:ps-5!'];

function Tile({ m, p, index }: { m: HealthMetricDef; p: HealthPeriod; index: number }) {
    const s = p.stats[m.key];
    const data = useMemo(() => s.trend.map((value, i) => ({ label: `${p.pointPrefix}${i + 1}`, value })), [s, p]);
    const pos = index % 4;
    return (
        <div className={`flex h-full min-h-0 w-full min-w-0 border-border/70 py-4 @4xl:py-0! ${CELL[pos]}`}>
            {index > 0 ? (
                <div className={`mb-2 hidden h-18 w-px shrink-0 self-center bg-border/70 ${RULE[pos]}`} />
            ) : null}
            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ps-1.5 ${INNER[pos]}`}>
                <div className="mb-2 flex min-w-0 items-center gap-2">
                    <Icon name={m.icon} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-medium whitespace-nowrap">{m.label}</span>
                </div>
                <div className="flex min-h-0 items-stretch gap-0">
                    <div className="flex min-w-0 flex-1 basis-0 flex-col justify-center gap-1.5 pr-5">
                        <span className="text-xl font-semibold">{s.value}</span>
                        <div className="flex min-w-0 items-center gap-1.5">
                            <TrendBadge up={s.change.charAt(0) !== '-'} tone={s.tone} icon={false} bordered>
                                {s.change}
                            </TrendBadge>
                            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{s.note}</span>
                        </div>
                    </div>
                    <div className="flex w-24 shrink-0 items-end justify-center pt-2">
                        <SparkLine
                            data={data}
                            dataKey="value"
                            color="var(--color-trend)"
                            className="aspect-auto h-12 w-24"
                            type="natural"
                            strokeWidth={1.5}
                            margin={{ top: 6, right: 2, bottom: 6, left: 2 }}
                            domain={[0, 'auto']}
                            animate={false}
                            label={`${m.label} trend`}
                            lineProps={{ strokeLinecap: 'round' }}
                            tooltipProps={{
                                cursor: true,
                                allowEscapeViewBox: { x: true, y: true },
                                wrapperStyle: { zIndex: 50 },
                            }}
                            tooltip={(row) => (
                                <div className="min-w-28 rounded-lg border bg-popover p-2.5 shadow-sm">
                                    <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                                        {m.label} / {row.label}
                                    </div>
                                    <div className="text-sm font-semibold text-popover-foreground tabular-nums">
                                        {row.value} {m.unit}
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function InventoryHealth({
    title = 'Catalog Health',
    description = 'SKU coverage, replenishment pressure, and aging stock in one pass.',
    metrics = METRICS,
    periods = PERIODS,
    defaultPeriod = 'week',
    actionLabel = 'Show full analytics',
    onAction,
    className,
}: InventoryHealthProps) {
    const [period, setPeriod] = useState(periods.some((x) => x.key === defaultPeriod) ? defaultPeriod : periods[0].key);
    const p = periods.find((x) => x.key === period) || periods[0];
    const summary = `${title}, ${p.label.toLowerCase()}: ${metrics
        .map((m) => {
            const s = p.stats[m.key];
            return `${m.label} ${s.value} (${s.change}, ${s.note.toLowerCase()}), trend ${s.trend.join(', ')} ${m.unit}`;
        })
        .join('; ')}. ${p.footer}`;

    return (
        <SeriesScope config={CONFIG} className={`@container w-full min-w-0 ${className || ''}`}>
            <Frame>
                <FramePanel className="isolate overflow-visible [&::before]:z-0">
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full rounded-[calc(var(--frame-radius)-1px)] text-muted-foreground opacity-35 [background-image:radial-gradient(currentColor_0.6px,transparent_0.7px)] [background-size:3px_3px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
                    />
                    <div className="relative z-10">
                        <div className="flex flex-col gap-4 px-1.5 pt-1 pb-1 @xl:flex-row @xl:items-start @xl:justify-between">
                            <div className="mb-5 flex min-w-0 flex-col gap-1">
                                <h2 className="text-sm font-semibold">{title}</h2>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                            <PeriodTabs
                                options={periods.map((x) => ({ value: x.key, label: x.label }))}
                                value={period}
                                onValueChange={setPeriod}
                                className="w-full shrink-0 @xl:w-auto"
                                listClassName="grid h-9 w-full grid-cols-3 @xl:w-auto"
                                triggerClassName="text-xs @xl:min-w-16"
                            />
                        </div>
                        <ChartFigure title={title} summary={summary}>
                            <div className="grid items-stretch @xl:grid-cols-2 @4xl:grid-cols-4">
                                {metrics.map((m, i) => (
                                    <Tile key={m.key} m={m} p={p} index={i} />
                                ))}
                            </div>
                        </ChartFigure>
                    </div>
                </FramePanel>
                <FrameFooter className="px-4 py-1.5! @xl:flex-row @xl:items-center @xl:justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon name="circle-question-mark" className="size-3.5 shrink-0" aria-hidden="true" />
                        {p.footer}
                    </div>
                    <Button variant="ghost" size="sm" className="-me-2 shrink-0 hover:text-primary" onClick={onAction}>
                        {actionLabel}
                        <Icon name="arrow-right" aria-hidden="true" />
                    </Button>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default InventoryHealth;
