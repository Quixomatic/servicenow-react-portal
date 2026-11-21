import { useId, useMemo, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ChartMoreMenu,
} from 'components:chart-frame';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, signedPercent } from 'components:charts/chart-kit';
import { SOURCES, PERIODS } from './data';
import type { InflowSource, InflowPeriod } from './data';

/**
 * components:charts/inflows-by-source: a donut of the top three inflow sources plus a hatched "rest"
 * segment, the period total with its change, per-source rows (value, share, change badge), a Week /
 * Month / Year switch, an info tooltip and CSV / summary exports.
 *
 *   <InflowsBySource />                                      sample data
 *   <InflowsBySource periods={{ week: { label, range, before, total, prior, values } }} sources={[…]} />
 *
 * The rest segment is the period total minus the listed sources.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type InflowsBySourceProps = {
    title?: string;
    info?: string;
    sources?: InflowSource[];
    periods?: Record<string, InflowPeriod>;
    defaultPeriod?: string;
    restLabel?: string;
    currency?: string;
    unitLabel?: string;
    updatedLabel?: string;
    noteLabel?: string;
    className?: string;
};

const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';
const BADGE =
    'relative inline-flex h-5 min-w-5 w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3';
const UP =
    'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success';
const DOWN =
    'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive';

function DeltaPill({ value }: { value: number }) {
    return (
        <span data-slot="badge" className={`${BADGE} ${value < 0 ? DOWN : UP}`}>
            <Icon name={value < 0 ? 'arrow-down' : 'arrow-up'} />
            <span className={TEXT_TRIM}>{signedPercent(value)}</span>
        </span>
    );
}

export function InflowsBySource({
    title = 'Capital Inflows',
    info = 'Settled capital received from tracked sources.',
    sources = SOURCES,
    periods = PERIODS,
    defaultPeriod = 'week',
    restLabel = 'Other Sources',
    currency = '$',
    unitLabel = 'USD, millions',
    updatedLabel = 'Updated 2 min ago',
    noteLabel = 'Settled transfers',
    className,
}: InflowsBySourceProps) {
    const keys = Object.keys(periods);
    const [period, setPeriod] = useState(keys.indexOf(defaultPeriod) >= 0 ? defaultPeriod : keys[0]);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const hatchId = `rp-inflows-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const p = periods[period];
    const fmt = (v: number) => `${currency}${v.toFixed(1)}M`;

    const config = useMemo(() => {
        const cfg: Record<string, any> = {
            rest: series('zinc-100', 'zinc-800', restLabel),
            hatch: series('zinc-300', 'zinc-600', 'Hatch'),
        };
        sources.forEach((s) => {
            cfg[s.key] = series(s.light, s.dark, s.label);
        });
        return cfg;
    }, [sources, restLabel]);

    const rows = useMemo(() => {
        const listed = sources.map((s) => ({
            key: s.key,
            label: s.label,
            value: (p.values[s.key] && p.values[s.key].value) || 0,
            delta: (p.values[s.key] && p.values[s.key].delta) || 0,
        }));
        const used = listed.reduce((a, r) => a + r.value, 0);
        const rest = {
            key: 'rest',
            label: restLabel,
            value: Math.max(0, Math.round((p.total - used) * 10) / 10),
            delta: 0,
        };
        return listed.concat([rest]).map((r) => ({ ...r, share: p.total ? Math.round((r.value / p.total) * 100) : 0 }));
    }, [p, sources, restLabel]);
    const top = rows.slice(0, sources.length);
    const topShare = top.reduce((a, r) => a + r.share, 0);
    const delta = p.prior ? (p.total / p.prior - 1) * 100 : 0;

    const aria = `${title} by source, ${p.range}: ${rows.map((r) => `${r.label} ${r.share}%`).join(', ')}`;
    const summary = `${title}, ${p.range}: ${fmt(p.total)}, ${signedPercent(delta)} vs ${fmt(p.prior)} ${p.before}. ${top
        .map((r) => `${r.label} ${fmt(r.value)} (${r.share}%, ${signedPercent(r.delta)})`)
        .join(', ')}; ${restLabel} ${fmt(rows[rows.length - 1].value)}.`;
    const csv = {
        filename: `capital-inflows-${period}.csv`,
        rows,
        columns: [
            { key: 'label', label: 'Source' },
            { key: 'value', label: 'Inflows (USD M)' },
            { key: 'share', label: 'Share (%)' },
            { key: 'delta', label: 'Change (%)', value: (r: any) => (r.key === 'rest' ? '' : r.delta) },
        ],
    };
    const periodToggle = useSingleToggle(period, (v: string) => setPeriod(v));
    const fillOf = (key: string) => (key === 'rest' ? `url(#${hatchId})` : `var(--color-${key})`);

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container w-full min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <span className="flex h-5 min-w-0 items-center gap-1">
                            <FrameTitle className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {title}
                            </FrameTitle>
                            {info ? (
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`About ${title}`}
                                                className="text-muted-foreground hover:text-foreground"
                                            />
                                        }
                                    >
                                        <Icon name="info" />
                                    </TooltipTrigger>
                                    <TooltipContent>{info}</TooltipContent>
                                </Tooltip>
                            ) : null}
                        </span>
                        <FrameDescription>All sources, {p.range}</FrameDescription>
                    </div>
                    <div className="flex w-full items-center gap-2 @md:w-auto">
                        <ToggleGroup variant="outline" aria-label="Period" className="@max-md:flex-1" {...periodToggle}>
                            {keys.map((k) => (
                                <ToggleGroupItem
                                    key={k}
                                    value={k}
                                    className="gap-1 px-2 data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted @max-md:flex-1"
                                >
                                    <span className={TEXT_TRIM}>{periods[k].label}</span>
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <ChartMoreMenu
                            title={title}
                            className="size-8"
                            csv={csv}
                            summary={summary}
                            items={[
                                { type: 'separator' },
                                {
                                    label: view === 'table' ? 'View as chart' : 'View as table',
                                    icon: <Icon name={view === 'table' ? 'chart-pie' : 'table'} />,
                                    onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                },
                                {
                                    label: 'Reset view',
                                    icon: <Icon name="rotate-ccw" />,
                                    onSelect: () => {
                                        setPeriod(keys.indexOf(defaultPeriod) >= 0 ? defaultPeriod : keys[0]);
                                        setView('chart');
                                    },
                                },
                            ]}
                        />
                    </div>
                </FrameHeader>
                <FramePanel className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <span className="flex h-5 items-center text-sm text-muted-foreground">
                            <span className={TEXT_TRIM}>Total inflows</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                            <span className={`text-3xl font-semibold tracking-tight tabular-nums ${TEXT_TRIM}`}>
                                {fmt(p.total)}
                            </span>
                            <DeltaPill value={delta} />
                            <span className="flex h-4 min-w-0 items-center text-xs text-muted-foreground tabular-nums">
                                <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    vs {fmt(p.prior)} {p.before}
                                </span>
                            </span>
                        </span>
                    </div>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="label"
                                indexLabel="Source"
                                series={[
                                    { key: 'value', label: 'Inflows' },
                                    { key: 'share', label: 'Share' },
                                ]}
                                valueFormatter={(v: number, ctx: any) =>
                                    ctx && ctx.dataKey === 'share' ? `${v}%` : fmt(v)
                                }
                                caption={aria}
                            />
                        }
                    >
                        <div className="grid gap-6 @lg:grid-cols-[10rem_minmax(0,1fr)] @lg:items-center">
                            <div className="relative size-40 shrink-0 justify-self-center @lg:justify-self-auto">
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                                    <span className="text-xl font-semibold tracking-tight tabular-nums">
                                        {topShare}%
                                    </span>
                                    <span className="text-xs text-muted-foreground">Top {top.length} sources</span>
                                </div>
                                <ChartContainer
                                    config={config}
                                    className="aspect-auto size-full"
                                    role="img"
                                    aria-label={aria}
                                >
                                    {(R: any) => (
                                        <R.PieChart accessibilityLayer>
                                            <defs>
                                                <pattern
                                                    id={hatchId}
                                                    width="6"
                                                    height="6"
                                                    patternUnits="userSpaceOnUse"
                                                    patternTransform="rotate(45)"
                                                >
                                                    <rect fill="var(--color-rest)" width="6" height="6" />
                                                    <line
                                                        stroke="var(--color-hatch)"
                                                        strokeWidth="1"
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="6"
                                                    />
                                                </pattern>
                                            </defs>
                                            <R.Tooltip
                                                cursor={false}
                                                isAnimationActive={false}
                                                content={({ active, payload }: any) => {
                                                    if (!active || !payload || !payload.length) return null;
                                                    const r = payload[0].payload;
                                                    return (
                                                        <div className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                            <div className="grid gap-1.5">
                                                                <div className="flex w-full flex-wrap items-center gap-2">
                                                                    <div className="flex min-w-48 items-center gap-2">
                                                                        <span
                                                                            aria-hidden="true"
                                                                            className="size-2.5 shrink-0 rounded-full"
                                                                            style={{
                                                                                background:
                                                                                    r.key === 'rest'
                                                                                        ? 'var(--color-hatch)'
                                                                                        : `var(--color-${r.key})`,
                                                                            }}
                                                                        />
                                                                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                                                            {r.label}
                                                                        </span>
                                                                        <span className="font-medium text-foreground tabular-nums">
                                                                            {fmt(r.value)}
                                                                        </span>
                                                                        <span className="w-8 text-end text-muted-foreground tabular-nums">
                                                                            {r.share}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <R.Pie
                                                data={rows}
                                                dataKey="value"
                                                nameKey="label"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={56}
                                                outerRadius={76}
                                                startAngle={90}
                                                endAngle={-270}
                                                paddingAngle={3}
                                                cornerRadius={6}
                                                stroke="none"
                                                isAnimationActive={false}
                                                activeShape={(props: any) => (
                                                    <R.Sector {...props} outerRadius={(props.outerRadius || 76) + 4} />
                                                )}
                                            >
                                                {rows.map((r) => (
                                                    <R.Cell key={r.key} fill={fillOf(r.key)} stroke="none" />
                                                ))}
                                            </R.Pie>
                                        </R.PieChart>
                                    )}
                                </ChartContainer>
                            </div>
                            <ul
                                aria-label="Inflows by source"
                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center divide-y gap-x-3 @max-sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                            >
                                {top.map((r) => (
                                    <li key={r.key} className="col-span-full grid h-11 grid-cols-subgrid items-center">
                                        <span className="flex min-w-0 items-center gap-2.5">
                                            <span
                                                aria-hidden="true"
                                                className="size-2.5 shrink-0 rounded-full"
                                                style={{ background: `var(--color-${r.key})` }}
                                            />
                                            <span
                                                className={`min-w-0 text-sm font-medium ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                            >
                                                {r.label}
                                            </span>
                                        </span>
                                        <span className={`text-end text-sm font-medium tabular-nums ${TEXT_TRIM}`}>
                                            {fmt(r.value)}
                                        </span>
                                        <span
                                            className={`w-8 text-end text-xs text-muted-foreground tabular-nums @max-sm:hidden ${TEXT_TRIM}`}
                                        >
                                            {r.share}%
                                        </span>
                                        <span className="flex justify-end">
                                            <DeltaPill value={r.delta} />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center gap-2">
                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
                        <span className={TEXT_TRIM}>{updatedLabel}</span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className={TEXT_TRIM}>{noteLabel}</span>
                    </span>
                    <span className="flex h-4 items-center">
                        <span className={TEXT_TRIM}>{unitLabel}</span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default InflowsBySource;
