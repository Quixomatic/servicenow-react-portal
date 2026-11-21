import { useId, useState } from 'react';
import { ChartFigure, chartKey } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { Icon } from 'components:icon';
import { PeriodTabs, sparkPoints, linePath, areaPath } from 'components:charts/sparkline-kit';
import { PERIODS, MAX_LEVEL } from './data';
import type { DistancePeriod } from './data';

/**
 * components:charts/distance-tracker: a distance card. A glossy icon tile and the period total (with a
 * faded unit) sit over a full-bleed line sparkline whose area is filled with a dotted pattern.
 * Week / Month / Year tabs swap the total and the series. Plain SVG (no axes, no tooltip).
 *
 *   <DistanceTracker />                                         sample data
 *   <DistanceTracker periods={[{ key, label, total, series }]} unit="mi" color="oklch(…)" />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type DistanceTrackerProps = {
    title?: string;
    periods?: DistancePeriod[];
    defaultPeriod?: string;
    unit?: string;
    icon?: string;
    /** Line / dot colour (CSS) and the icon tile colour. */
    color?: string;
    tileColor?: string;
    /** Series maximum (the top of the plot). */
    max?: number;
    className?: string;
};

const W = 552;
const H = 118;

export function DistanceTracker({
    title = 'Distance',
    periods = PERIODS,
    defaultPeriod = 'week',
    unit = 'km',
    icon = 'bike',
    color = 'oklch(0.57 0.15 181)',
    tileColor = 'oklch(0.62 0.15 181)',
    max = MAX_LEVEL,
    className,
}: DistanceTrackerProps) {
    const [period, setPeriod] = useState(periods.some((x) => x.key === defaultPeriod) ? defaultPeriod : periods[0].key);
    const p = periods.find((x) => x.key === period) || periods[0];
    const pid = `rp-dt-${chartKey(useId())}`;
    const pts = sparkPoints(p.series, { width: W, height: H, min: 0, max });
    const summary = `${title} this ${p.label.toLowerCase()}: ${p.total.toLocaleString('en-US')} ${unit}. Activity ${
        p.series[p.series.length - 1] >= p.series[0] ? 'rose' : 'fell'
    } from ${p.series[0]} to ${p.series[p.series.length - 1]} (peak ${Math.max(...p.series)}).`;

    return (
        <div className={`@container w-full min-w-0 ${className || ''}`}>
            <Frame>
                <FramePanel
                    className="h-[220px] overflow-hidden bg-card p-0! text-card-foreground"
                    style={{ '--chart-distance': color } as any}
                >
                    <div className="relative flex h-full flex-col gap-0">
                        <div className="relative z-10 flex flex-col gap-4 px-6 pt-6 @xl:flex-row @xl:items-start @xl:justify-between">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div
                                    className="relative isolate flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md shadow-[0_1px_3px_0_rgba(0,0,0,0.16)]"
                                    style={{ background: tileColor }}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_65%_at_36%_18%,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0)_72%)]"
                                    />
                                    <Icon name={icon} className="relative z-10 size-6 text-white" aria-hidden="true" />
                                </div>
                                <div className="flex min-w-0 items-baseline gap-1.5">
                                    <span className="text-2xl font-medium">{p.total.toLocaleString('en-US')}</span>
                                    <span className="text-2xl font-medium text-muted-foreground/45">{unit}</span>
                                </div>
                            </div>
                            <PeriodTabs
                                options={periods.map((x) => ({ value: x.key, label: x.label }))}
                                value={period}
                                onValueChange={setPeriod}
                                listClassName="h-8 w-full @min-[520px]:w-[184px]"
                            />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-[134px]">
                            <ChartFigure title={title} summary={summary} className="h-full">
                                <svg
                                    viewBox={`0 0 ${W} ${H}`}
                                    preserveAspectRatio="none"
                                    className="size-full"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <defs>
                                        <pattern id={pid} width="5" height="5" patternUnits="userSpaceOnUse">
                                            <circle
                                                cx="1"
                                                cy="1"
                                                r="0.55"
                                                fill="var(--chart-distance)"
                                                fillOpacity="0.18"
                                            />
                                        </pattern>
                                    </defs>
                                    <path d={areaPath(pts, H)} fill={`url(#${pid})`} />
                                    <path
                                        d={linePath(pts)}
                                        fill="none"
                                        stroke="var(--chart-distance)"
                                        strokeLinecap="butt"
                                        strokeLinejoin="miter"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                            </ChartFigure>
                        </div>
                    </div>
                </FramePanel>
            </Frame>
        </div>
    );
}

export default DistanceTracker;
