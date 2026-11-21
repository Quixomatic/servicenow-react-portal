import { useEffect, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    rowsToCsv,
    downloadText,
    copyText,
} from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { useReplayKey } from 'components:charts/chart-kit';
import { TEXT_TRIM, Pill, MetaDot, ServiceSelect, polar } from 'components:charts/radial-kit';
import { METRICS, WINDOWS, REGIONS } from './data';
import type { HealthMetric, HealthWindow, HealthRegion, MetricReading } from './data';

/**
 * components:charts/api-health: four gateway SLO gauges (availability budget used, p95 latency, error rate,
 * throughput vs capacity) for one region. Each gauge is a ring of 24 SVG line ticks, filled clockwise in
 * green / amber / red with a static amber watch band and red redline band behind it; the percentage sits in
 * the middle. Beside it the value, a trend arrow vs the prior window (coloured by whether the move is good)
 * and the target; below, latest, lowest / peak with its time and the hours in breach. Region select,
 * 1H / 24H / 7D switch, refresh, auto refresh (off / 30 s / 1 min / 5 min), copy snapshot and CSV.
 *
 *   <ApiHealth />                                         sample data
 *   <ApiHealth metrics={[…]} regions={[…]} windows={[…]} />
 *
 * Status per gauge: Watch from 70% of the target, At Risk from 90%.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type ApiHealthProps = {
    title?: string;
    scopeLabel?: string;
    updatedLabel?: string;
    metrics?: HealthMetric[];
    windows?: HealthWindow[];
    regions?: HealthRegion[];
    defaultRegion?: string;
    defaultWindow?: string;
    watchAt?: number;
    riskAt?: number;
    className?: string;
};

const TICKS = 24;
const SIZE = 80;
const C = SIZE / 2;
const R_IN = 29;
const R_OUT = 37;
const TONE_TEXT: Record<string, string> = { ok: 'text-success', watch: 'text-warning', risk: 'text-destructive' };
const REFRESH = [
    { value: 'off', label: 'Off', ms: 0 },
    { value: '30s', label: 'Every 30 Seconds', ms: 30000 },
    { value: '1m', label: 'Every Minute', ms: 60000 },
    { value: '5m', label: 'Every 5 Minutes', ms: 300000 },
];

function fmt(m: HealthMetric, v: number): string {
    if (m.compact) return v >= 1000 ? `${(v / 1000).toFixed(m.decimals)}K` : `${Math.round(v)}`;
    return v.toFixed(m.decimals);
}

function withUnit(m: HealthMetric, v: number): string {
    const s = fmt(m, v);
    return m.unit === '%' ? `${s}%` : `${s} ${m.unit}`;
}

function ratioOf(m: HealthMetric, v: number): number {
    if (m.mode === 'budget') return (100 - v) / (100 - m.target);
    return v / m.target;
}

/** A ring of 24 ticks: static track (grey, amber watch band, red redline band) and the filled share on top. */
function TickGauge({ pct, tone, replay }: { pct: number; tone: string; replay: number }) {
    const on = Math.max(0, Math.min(TICKS, Math.round((pct / 100) * TICKS)));
    const tick = (i: number) => {
        const [x1, y1] = polar(C, C, R_IN, (360 / TICKS) * i);
        const [x2, y2] = polar(C, C, R_OUT, (360 / TICKS) * i);
        return { x1, y1, x2, y2 };
    };
    const band = (i: number) =>
        i >= 22 ? 'stroke-destructive/30' : i >= 17 ? 'stroke-warning/35' : 'stroke-muted-foreground/20';
    const idx = Array.from({ length: TICKS }, (_v, i) => i);
    return (
        <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="shrink-0 overflow-visible"
            aria-hidden="true"
        >
            {idx.map((i) => (
                <line key={i} className={band(i)} strokeWidth={3.5} strokeLinecap="round" {...tick(i)} />
            ))}
            <g key={replay} className={`${TONE_TEXT[tone]} transition-colors motion-reduce:transition-none`}>
                {idx.map((i) => (
                    <line
                        key={i}
                        className={`stroke-current [transition:opacity_220ms_cubic-bezier(0.23,1,0.32,1)_var(--segment-delay)] starting:opacity-0 motion-reduce:transition-none ${
                            i < on ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ ['--segment-delay' as any]: `${i * 24}ms` }}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        {...tick(i)}
                    />
                ))}
            </g>
            <text
                x={C}
                y={C}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground text-sm font-semibold tabular-nums transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:opacity-0 motion-reduce:transition-none"
            >
                {Math.round(pct)}%
            </text>
        </svg>
    );
}

export function ApiHealth({
    title = 'API Health',
    scopeLabel = 'Production Gateway',
    updatedLabel = 'Updated 12:00 UTC',
    metrics = METRICS,
    windows = WINDOWS,
    regions = REGIONS,
    defaultRegion = 'us-east',
    defaultWindow = '24h',
    watchAt = 0.7,
    riskAt = 0.9,
    className,
}: ApiHealthProps) {
    const firstRegion = regions.some((r) => r.key === defaultRegion) ? defaultRegion : regions[0].key;
    const firstWindow = windows.some((w) => w.key === defaultWindow) ? defaultWindow : windows[0].key;
    const [regionKey, setRegionKey] = useState(firstRegion);
    const [windowKey, setWindowKey] = useState(firstWindow);
    const [auto, setAuto] = useState('off');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replayKey, replay] = useReplayKey();
    const region = regions.find((r) => r.key === regionKey) || regions[0];
    const win = windows.find((w) => w.key === windowKey) || windows[0];

    useEffect(() => {
        const opt = REFRESH.find((o) => o.value === auto);
        if (!opt || !opt.ms) return undefined;
        const id = setInterval(replay, opt.ms);
        return () => clearInterval(id);
    }, [auto, replay]);

    const cells = metrics.map((m) => {
        const r: MetricReading = (region.readings[win.key] || {})[m.key] || [0, 0, 0, '', 0, 0];
        const ratio = ratioOf(m, r[0]);
        const tone = ratio >= riskAt ? 'risk' : ratio >= watchAt ? 'watch' : 'ok';
        const delta = r[1];
        const good = m.upIsGood == null || delta === 0 ? null : delta > 0 === m.upIsGood;
        return { m, r, pct: ratio * 100, tone, delta, good };
    });
    const atRisk = cells.filter((c) => c.tone === 'risk').length;
    const watch = cells.filter((c) => c.tone === 'watch').length;
    const badge = atRisk
        ? { tone: 'destructive', text: `${atRisk} at Risk` }
        : watch
          ? { tone: 'warning', text: `${watch} to Watch` }
          : { tone: 'success', text: 'Healthy' };

    const rows = cells.map((c) => ({
        metric: c.m.label,
        value: withUnit(c.m, c.r[0]),
        used: Math.round(c.pct),
        delta: c.delta,
        target: c.m.targetLabel,
        latest: withUnit(c.m, c.r[2]),
        extreme: `${c.r[3]} ${withUnit(c.m, c.r[4])}`,
        breach: c.r[5] ? `${c.r[5]} h` : 'None',
        status: c.tone === 'risk' ? 'At Risk' : c.tone === 'watch' ? 'Watch' : 'Healthy',
    }));
    const summary = `${title}, ${region.label}, last ${win.label}: ${badge.text}. ${rows
        .map(
            (r) =>
                `${r.metric} ${r.value} (${r.used}% of target, ${r.delta >= 0 ? '+' : ''}${r.delta}% vs prior, ${r.status})`
        )
        .join('; ')}.`;
    const columns = [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'used', label: 'Of target (%)' },
        { key: 'delta', label: 'Change vs prior (%)' },
        { key: 'target', label: 'Target' },
        { key: 'latest', label: 'Latest' },
        { key: 'extreme', label: 'Lowest / peak' },
        { key: 'breach', label: 'Time in breach' },
        { key: 'status', label: 'Status' },
    ];
    const windowToggle = useSingleToggle(windowKey, (v: string) => setWindowKey(v));

    return (
        <Frame className={`@container w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <FrameTitle role="heading" className="truncate">
                            {title}
                        </FrameTitle>
                        <Pill tone={badge.tone}>{badge.text}</Pill>
                    </div>
                    <FrameDescription className="flex min-w-0 items-center gap-1.5">
                        <span className={`${TEXT_TRIM} shrink-0 whitespace-nowrap`}>{scopeLabel}</span>
                        <MetaDot />
                        <span
                            className={`${TEXT_TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap tabular-nums`}
                        >
                            {updatedLabel}
                        </span>
                    </FrameDescription>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 @3xl:w-auto">
                    <ServiceSelect
                        label="Region"
                        icon="globe"
                        value={regionKey}
                        onValueChange={setRegionKey}
                        options={regions.map((r) => ({ value: r.key, label: r.label }))}
                    />
                    <ToggleGroup variant="outline" aria-label="Window" className="@max-md:flex-1" {...windowToggle}>
                        {windows.map((w) => (
                            <ToggleGroupItem
                                key={w.key}
                                value={w.key}
                                className="data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted @max-md:flex-1"
                            >
                                <span className={TEXT_TRIM}>{w.label}</span>
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <div role="group" aria-label="Panel actions" className="flex w-fit items-stretch">
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Refresh metrics"
                                        className="size-8 rounded-e-none"
                                        onClick={replay}
                                    />
                                }
                            >
                                <Icon name="refresh-cw" />
                            </TooltipTrigger>
                            <TooltipContent>Refresh metrics</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="More actions"
                                        className="size-8 rounded-s-none border-s-0"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Auto Refresh</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={auto} onValueChange={setAuto}>
                                        {REFRESH.map((o) => (
                                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                                {o.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={async () => {
                                            if (await copyText(summary)) toast.success('Snapshot copied');
                                        }}
                                    >
                                        <Icon name="copy" />
                                        Copy Snapshot
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const name = `api-health-${region.key}-${win.key}.csv`;
                                            downloadText(name, rowsToCsv(rows, columns));
                                            toast.success('CSV downloaded', { description: name });
                                        }}
                                    >
                                        <Icon name="download" />
                                        Download CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'gauge' : 'table'} />
                                        {view === 'table' ? 'View as Gauges' : 'View as Table'}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </FrameHeader>
            <FramePanel>
                <ChartFigure
                    title={title}
                    summary={summary}
                    view={view}
                    table={
                        <ChartDataTable
                            data={rows}
                            index="metric"
                            indexLabel="Metric"
                            series={[
                                { key: 'used', label: 'Of target' },
                                { key: 'delta', label: 'Change vs prior' },
                            ]}
                            valueFormatter={(v: number) => `${v}%`}
                            caption={summary}
                        />
                    }
                >
                    <div
                        key={replayKey}
                        className="-mx-(--frame-panel-px) -my-(--frame-panel-py) grid @lg:grid-cols-2 @4xl:grid-cols-4"
                    >
                        {cells.map((c, ci) => {
                            const ease =
                                'transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [transition-delay:var(--cell-delay)] starting:opacity-0 starting:blur-[2px] motion-reduce:transition-none';
                            const trendCls =
                                c.good == null
                                    ? 'text-muted-foreground'
                                    : c.good
                                      ? 'text-success-foreground'
                                      : 'text-destructive';
                            return (
                                <div
                                    key={c.m.key}
                                    style={{ ['--cell-delay' as any]: `${ci * 30}ms` }}
                                    className="flex min-w-0 flex-col gap-4 px-(--frame-panel-px) py-(--frame-panel-py) not-first:border-t @lg:even:border-s @lg:nth-2:border-t-0 @4xl:not-first:border-s @4xl:not-first:border-t-0"
                                >
                                    <div className="flex h-5 items-center justify-between gap-2">
                                        <h4
                                            className={`${TEXT_TRIM} min-w-0 overflow-x-clip text-sm font-medium text-ellipsis whitespace-nowrap text-muted-foreground`}
                                        >
                                            {c.m.label}
                                        </h4>
                                        {c.tone !== 'ok' ? (
                                            <Pill tone={c.tone === 'risk' ? 'destructive' : 'warning'}>
                                                {c.tone === 'risk' ? 'At Risk' : 'Watch'}
                                            </Pill>
                                        ) : null}
                                    </div>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <TickGauge pct={c.pct} tone={c.tone} replay={replayKey} />
                                        <div className={`flex min-w-0 flex-col gap-2 ${ease}`}>
                                            <span className="flex items-baseline gap-px">
                                                <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
                                                    {fmt(c.m, c.r[0])}
                                                </span>
                                                <span
                                                    className={`text-sm text-muted-foreground ${c.m.unit === '%' ? '' : 'ms-0.5'}`}
                                                >
                                                    {c.m.unit}
                                                </span>
                                            </span>
                                            <span className="flex h-4 min-w-0 items-center gap-1 text-xs tabular-nums">
                                                <span
                                                    className={`flex shrink-0 items-center gap-0.5 font-medium [&>svg]:size-3.5 ${trendCls}`}
                                                >
                                                    {c.delta === 0 ? (
                                                        <span className={TEXT_TRIM}>No change</span>
                                                    ) : (
                                                        <>
                                                            <Icon
                                                                name={c.delta > 0 ? 'trending-up' : 'trending-down'}
                                                            />
                                                            <span className="sr-only">
                                                                {c.delta > 0 ? 'Up' : 'Down'}
                                                            </span>
                                                            <span className={TEXT_TRIM}>{Math.abs(c.delta)}%</span>
                                                        </>
                                                    )}
                                                </span>
                                                <span
                                                    className={`${TEXT_TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap text-muted-foreground`}
                                                >
                                                    vs prior
                                                </span>
                                            </span>
                                            <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                                <span className={TEXT_TRIM}>{c.m.targetLabel}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <dl className={`flex flex-col gap-1.5 border-t pt-3.5 ${ease}`}>
                                        {[
                                            { k: 'Latest', v: withUnit(c.m, c.r[2]) },
                                            { k: c.m.extremeLabel, v: withUnit(c.m, c.r[4]), t: c.r[3] },
                                            { k: c.m.breachLabel, v: c.r[5] ? `${c.r[5]} h` : 'None', bad: c.r[5] > 0 },
                                        ].map((row) => (
                                            <div
                                                key={row.k}
                                                className="flex h-4 min-w-0 items-center justify-between gap-3 text-xs"
                                            >
                                                <dt
                                                    className={`${TEXT_TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap text-muted-foreground`}
                                                >
                                                    {row.k}
                                                </dt>
                                                <dd className="flex shrink-0 items-center gap-1.5 tabular-nums">
                                                    {row.t ? (
                                                        <>
                                                            <span className={`${TEXT_TRIM} text-muted-foreground`}>
                                                                {row.t}
                                                            </span>
                                                            <MetaDot />
                                                        </>
                                                    ) : null}
                                                    <span
                                                        className={`${TEXT_TRIM} font-medium ${row.bad ? 'text-destructive' : ''}`}
                                                    >
                                                        {row.v}
                                                    </span>
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            );
                        })}
                    </div>
                </ChartFigure>
            </FramePanel>
        </Frame>
    );
}

export default ApiHealth;
