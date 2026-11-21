import { useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ChartToolbar,
    ToolbarGroup,
    ChartMoreMenu,
    FooterMeta,
} from 'components:chart-frame';
import { Icon } from 'components:icon';
import {
    series,
    SeriesScope,
    useEnterAnimation,
    useReplayKey,
    AccentPicker,
    ACCENTS,
    signedPercent,
} from 'components:charts/chart-kit';
import {
    TEXT_TRIM,
    DeltaChip,
    TipRow,
    TipCard,
    TipSeparator,
    LegendDots,
    MenuSelect,
    MenuChecklist,
    RefreshButton,
    useBusy,
    niceTicks,
    kilo,
    int,
    wholeShares,
    HatchLines,
} from 'components:charts/bar-kit';
import { CATEGORIES, WAREHOUSES, PERIODS } from './data';
import type { Category, Warehouse, Period } from './data';

/**
 * components:charts/inventory-velocity: units sold per day by category as pill bars over hatched tracks,
 * coloured by stock health (days of supply: healthy under 30, watch under 45, slow after that), a units
 * per day KPI with the change vs the prior period, a stock health summary bar, a period menu, a
 * warehouse filter that re-sums the bars, a sort menu, an accent picker for the healthy bars, a refresh
 * button, per-warehouse splits and a supply gauge in the tooltip, and CSV / copy exports.
 *
 *   <InventoryVelocity />                                    sample data
 *   <InventoryVelocity categories={[…]} warehouses={[…]} periods={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type InventoryVelocityProps = {
    title?: string;
    description?: string;
    categories?: Category[];
    warehouses?: Warehouse[];
    periods?: Period[];
    defaultPeriod?: string;
    /** Days of supply under which stock is healthy, and under which it is on watch. */
    healthyDays?: number;
    watchDays?: number;
    syncedLabel?: string;
    className?: string;
};

type Health = 'healthy' | 'watch' | 'slow';

type Row = {
    key: string;
    label: string;
    units: number;
    prior: number;
    change: number;
    onHand: number;
    days: number;
    health: Health;
    rank: number;
    split: { key: string; label: string; units: number; share: number }[];
    catalog: number;
};

const SORTS = [
    { value: 'catalog', label: 'Catalog order', icon: 'list', aria: 'catalog order' },
    { value: 'velocity', label: 'Velocity', icon: 'chart-column', aria: 'velocity' },
    { value: 'change', label: 'Change', icon: 'trending-up', aria: 'change' },
    { value: 'days', label: 'Days of supply', icon: 'package', aria: 'days of supply' },
    { value: 'name', label: 'Name', icon: 'type', aria: 'name' },
];

const HEALTH_LABEL: Record<Health, string> = { healthy: 'Healthy', watch: 'Watch', slow: 'Slow' };
const HEALTH_VAR: Record<Health, string> = {
    healthy: 'var(--color-velocity)',
    watch: 'var(--color-watch)',
    slow: 'var(--color-slow)',
};
const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

function joinNames(names: string[]): string {
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function SupplyGauge({ row, healthyDays, watchDays }: { row: Row; healthyDays: number; watchDays: number }) {
    const span = watchDays + (watchDays - healthyDays);
    const zones: { key: Health; grow: number }[] = [
        { key: 'healthy', grow: healthyDays },
        { key: 'watch', grow: watchDays - healthyDays },
        { key: 'slow', grow: span - watchDays },
    ];
    const at = Math.max(0, Math.min(100, (row.days / span) * 100));
    return (
        <span aria-hidden="true" className="relative mt-1.5 flex h-1.5 gap-0.5">
            {zones.map((z) => (
                <span
                    key={z.key}
                    className={`basis-0 rounded-full ${z.key === row.health ? '' : 'opacity-30'}`}
                    style={{ flexGrow: z.grow, background: HEALTH_VAR[z.key] }}
                />
            ))}
            <span className="absolute inset-x-0.5 inset-y-0">
                <span
                    className="absolute top-1/2 h-3 w-1 -translate-1/2 rounded-full bg-foreground ring-2 ring-background"
                    style={{ left: `${at}%` }}
                />
            </span>
        </span>
    );
}

function TooltipBody({
    row,
    count,
    healthyDays,
    watchDays,
}: {
    row: Row;
    count: number;
    healthyDays: number;
    watchDays: number;
}) {
    return (
        <TipCard>
            <div className="flex flex-col gap-0.5">
                <span className="flex h-4 items-center justify-between gap-3">
                    <span className={`font-medium ${TEXT_TRIM}`}>{row.label}</span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: HEALTH_VAR[row.health] }} />
                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>{HEALTH_LABEL[row.health]}</span>
                    </span>
                </span>
                <span className="flex h-5 items-center gap-1.5">
                    <span className={`text-sm font-semibold tabular-nums ${TEXT_TRIM}`}>{int(row.units)}</span>
                    <span className={`text-muted-foreground ${TEXT_TRIM}`}>units a day</span>
                    <span
                        className={`ms-auto tabular-nums ${TEXT_TRIM} ${row.change >= 0 ? 'text-success' : 'text-destructive'}`}
                    >
                        {signedPercent(row.change)}
                    </span>
                </span>
            </div>
            <TipSeparator />
            <div className="flex flex-col gap-1">
                {row.split.map((s) => (
                    <TipRow key={s.key} label={s.label} value={int(s.units)} note={`${s.share}%`} />
                ))}
            </div>
            <TipSeparator />
            <div className="flex flex-col gap-1">
                <TipRow label="Pace rank" value={`#${row.rank}`} note={`of ${count}`} />
                <TipRow label="Prior period" value={int(row.prior)} />
                <TipRow label="On hand" value={kilo(row.onHand)} />
                <TipRow label="Days of supply" value={Math.round(row.days)} note="days" />
                <SupplyGauge row={row} healthyDays={healthyDays} watchDays={watchDays} />
            </div>
        </TipCard>
    );
}

export function InventoryVelocity({
    title = 'Inventory Velocity',
    description = 'Units sold per day by category',
    categories = CATEGORIES,
    warehouses = WAREHOUSES,
    periods = PERIODS,
    defaultPeriod = '30d',
    healthyDays = 30,
    watchDays = 45,
    syncedLabel = 'Synced 12 min ago',
    className,
}: InventoryVelocityProps) {
    const [period, setPeriod] = useState(periods.some((x) => x.key === defaultPeriod) ? defaultPeriod : periods[0].key);
    const allDc = warehouses.map((w) => w.key);
    const [dcs, setDcs] = useState<string[]>(allDc);
    const [sort, setSort] = useState('catalog');
    const [accent, setAccent] = useState('blue');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [active, setActive] = useState<number | null>(null);
    const [replay, bump] = useReplayKey();
    const [busy, refresh] = useBusy(700, bump);
    const per = periods.find((x) => x.key === period) || periods[0];
    const acc = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];

    const config = useMemo(
        () => ({
            velocity: series(acc.light, acc.dark, 'Healthy'),
            watch: series('amber-400', 'amber-300', 'Watch'),
            slow: series('zinc-400', 'zinc-500', 'Slow'),
        }),
        [acc.light, acc.dark]
    );

    const rows: Row[] = useMemo(() => {
        const base = categories.map((c, i) => {
            const cp = c.periods[period];
            const all = allDc.reduce((s, k) => s + (cp.units[k] || 0), 0) || 1;
            const units = dcs.reduce((s, k) => s + (cp.units[k] || 0), 0);
            const f = units / all;
            const onHand = c.onHand * f;
            const prior = cp.prior * f;
            const days = units ? onHand / units : 0;
            const health: Health = days < healthyDays ? 'healthy' : days < watchDays ? 'watch' : 'slow';
            const picked = warehouses.filter((w) => dcs.indexOf(w.key) >= 0);
            const shares = wholeShares(picked.map((w) => cp.units[w.key] || 0));
            return {
                key: c.key,
                label: c.label,
                units,
                prior,
                change: prior ? (units / prior - 1) * 100 : 0,
                onHand,
                days,
                health,
                rank: 0,
                split: picked.map((w, j) => ({
                    key: w.key,
                    label: w.label,
                    units: cp.units[w.key] || 0,
                    share: shares[j],
                })),
                catalog: i,
            };
        });
        const byPace = base.slice().sort((a, b) => b.units - a.units);
        byPace.forEach((r, i) => {
            r.rank = i + 1;
        });
        const sorted = base.slice();
        if (sort === 'velocity') sorted.sort((a, b) => b.units - a.units);
        else if (sort === 'change') sorted.sort((a, b) => b.change - a.change);
        else if (sort === 'days') sorted.sort((a, b) => b.days - a.days);
        else if (sort === 'name') sorted.sort((a, b) => a.label.localeCompare(b.label));
        return sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, period, dcs, sort, healthyDays, watchDays, warehouses]);

    const total = rows.reduce((s, r) => s + r.units, 0);
    const priorTotal = rows.reduce((s, r) => s + r.prior, 0);
    const onHand = rows.reduce((s, r) => s + r.onHand, 0);
    const delta = priorTotal ? (total / priorTotal - 1) * 100 : 0;
    const supply = total ? onHand / total : 0;
    const groups = (['healthy', 'watch', 'slow'] as Health[]).map((h) => {
        const list = rows.filter((r) => r.health === h).sort((a, b) => b.days - a.days);
        return {
            key: h,
            count: list.length,
            note:
                h === 'healthy'
                    ? `under ${healthyDays} days`
                    : list.length
                      ? joinNames(list.map((r) => r.label))
                      : 'none',
        };
    });
    const dcShares = wholeShares(
        warehouses.map((w) =>
            categories.reduce((s, c) => s + ((c.periods[period] && c.periods[period].units[w.key]) || 0), 0)
        )
    );

    const { ticks, top } = niceTicks(Math.max(1, ...rows.map((r) => r.units)), 4);
    const rootRef = useRef<HTMLDivElement>(null);
    useEnterAnimation(
        rootRef,
        [
            {
                selector: '[data-iv-bar]',
                keyframes: {
                    clipPath: ['inset(100% 0px 0px round 999px)', 'inset(0px round 999px)'],
                },
                duration: 0.4,
                delay: (i) => i * 0.03,
                ease: [0.23, 1, 0.32, 1],
            },
        ],
        [period, view, replay]
    );

    const sortOpt = SORTS.find((s) => s.value === sort) || SORTS[0];
    const summary = `${title}, ${per.label.toLowerCase()}: ${int(total)} units a day, ${signedPercent(delta)} vs ${int(priorTotal)} in the prior period. ${supply.toFixed(1)} days of supply, ${kilo(onHand)} on hand. ${groups
        .map((g) => `${g.count} ${HEALTH_LABEL[g.key as Health].toLowerCase()}`)
        .join(', ')}.`;
    const csv = {
        filename: 'inventory-velocity.csv',
        rows,
        columns: [
            { key: 'label', label: 'Category' },
            { key: 'units', label: 'Units a day' },
            { key: 'prior', label: 'Prior period', value: (r: Row) => Math.round(r.prior) },
            { key: 'onHand', label: 'On hand', value: (r: Row) => Math.round(r.onHand) },
            { key: 'days', label: 'Days of supply', value: (r: Row) => Math.round(r.days) },
            { key: 'health', label: 'Stock health', value: (r: Row) => HEALTH_LABEL[r.health] },
        ],
    };
    const n = rows.length;

    return (
        <SeriesScope config={config} className={`w-full min-w-0 ${className || ''}`}>
            <Frame stacked className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription className="truncate">{description}</FrameDescription>
                    </div>
                    <ChartToolbar>
                        <MenuSelect
                            size="default"
                            label="Period"
                            menuLabel="Period"
                            icon="calendar"
                            value={period}
                            onValueChange={setPeriod}
                            options={periods.map((x) => ({ value: x.key, label: x.label, shortcut: x.shortcut }))}
                        />
                        <MenuChecklist
                            label="Warehouses"
                            menuLabel="Warehouses in the chart"
                            allLabel="Show all warehouses"
                            icon="building-2"
                            value={dcs}
                            onValueChange={setDcs}
                            options={warehouses.map((w, i) => ({
                                value: w.key,
                                label: w.label,
                                note: `${dcShares[i]}%`,
                            }))}
                        />
                        {/* ReUI's chart-29 uses the 32px default controls; [&>button]:size-8 sizes the
                            kit's colour picker and more menu to match. */}
                        <ToolbarGroup aria-label="Chart actions" className="[&>button]:size-8">
                            <MenuSelect
                                size="default"
                                iconOnly
                                icon="arrow-up-down"
                                label="Sort by"
                                menuLabel="Sort by"
                                triggerLabel={`Sort by ${sortOpt.aria}`}
                                value={sort}
                                onValueChange={setSort}
                                options={SORTS}
                            />
                            <AccentPicker
                                value={accent}
                                onChange={setAccent}
                                swatch="var(--color-velocity)"
                                label="Bar color"
                            />
                            <RefreshButton size="default" busy={busy} onClick={refresh} />
                            <ChartMoreMenu
                                title={title}
                                csv={csv}
                                summary={summary}
                                items={[
                                    { type: 'separator' },
                                    {
                                        label: view === 'table' ? 'View as chart' : 'View as table',
                                        icon: <Icon name={view === 'table' ? 'chart-column' : 'table'} />,
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                    {
                                        label: 'Reset view',
                                        icon: <Icon name="rotate-ccw" />,
                                        onSelect: () => {
                                            setSort('catalog');
                                            setDcs(allDc);
                                            setAccent('blue');
                                        },
                                    },
                                ]}
                            />
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="p-0">
                    <div className="grid @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                        <div className="flex min-w-0 flex-col justify-between gap-3 border-b px-(--frame-panel-px) py-(--frame-panel-py) @3xl:border-e @3xl:border-b-0">
                            <span className="flex h-5 items-center text-sm text-muted-foreground">
                                <span className={TEXT_TRIM}>Units per Day</span>
                            </span>
                            <span className="flex h-9 items-center gap-3">
                                <span className={`text-4xl font-semibold tracking-tight tabular-nums ${TEXT_TRIM}`}>
                                    {int(total)}
                                </span>
                                <DeltaChip value={delta} />
                            </span>
                            <span className="flex h-5 min-w-0 items-center text-xs text-muted-foreground tabular-nums">
                                <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    {`vs ${int(priorTotal)} a day in the prior ${per.days} days`}
                                </span>
                            </span>
                        </div>
                        <div className="flex min-w-0 flex-col justify-between gap-3 px-(--frame-panel-px) py-(--frame-panel-py)">
                            <span className="flex h-5 items-center justify-between gap-3">
                                <span
                                    className={`shrink-0 text-sm whitespace-nowrap text-muted-foreground ${TEXT_TRIM}`}
                                >
                                    Stock Health
                                </span>
                                <span
                                    className={`min-w-0 text-xs text-muted-foreground tabular-nums ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                >
                                    {`${supply.toFixed(1)} days of supply`}
                                    <span className="@max-md:hidden">{`, ${kilo(onHand)} on hand`}</span>
                                </span>
                            </span>
                            <span aria-hidden="true" className="flex h-1.5 gap-1">
                                {groups
                                    .filter((g) => g.count)
                                    .map((g) => (
                                        <span
                                            key={g.key}
                                            className="basis-0 rounded-full transition-[flex-grow] duration-300"
                                            style={{ flexGrow: g.count, background: HEALTH_VAR[g.key as Health] }}
                                        />
                                    ))}
                            </span>
                            <ul className="flex flex-wrap gap-x-5 gap-y-2">
                                {groups.map((g) => (
                                    <li key={g.key} className="flex h-5 min-w-0 items-center gap-2">
                                        <span
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ background: HEALTH_VAR[g.key as Health] }}
                                        />
                                        <span className={`text-sm font-medium tabular-nums ${TEXT_TRIM}`}>
                                            {g.count}
                                        </span>
                                        <span className={`text-sm ${TEXT_TRIM}`}>{HEALTH_LABEL[g.key as Health]}</span>
                                        <span
                                            className={`text-xs text-muted-foreground ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                        >
                                            {g.note}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </FramePanel>
                <FramePanel>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows.map((r) => ({ ...r, days: Math.round(r.days) }))}
                                index="label"
                                indexLabel="Category"
                                series={[
                                    { key: 'units', label: 'Units a day' },
                                    { key: 'days', label: 'Days of supply' },
                                ]}
                                valueFormatter={(v: number) => int(v)}
                                caption={title}
                            />
                        }
                    >
                        <div ref={rootRef} className="group/c29 flex flex-col gap-6">
                            <LegendDots
                                items={(['healthy', 'watch', 'slow'] as Health[]).map((h) => ({
                                    key: h,
                                    label: HEALTH_LABEL[h],
                                    color: HEALTH_VAR[h],
                                }))}
                            />
                            <div className="h-72 w-full" onMouseLeave={() => setActive(null)}>
                                <ChartContainer config={config} className="aspect-auto h-full w-full">
                                    {(R: any) => (
                                        <R.BarChart
                                            data={rows}
                                            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
                                            barCategoryGap="30%"
                                            accessibilityLayer
                                            onMouseMove={(s: any) =>
                                                setActive(
                                                    s && s.activeTooltipIndex != null
                                                        ? Number(s.activeTooltipIndex)
                                                        : null
                                                )
                                            }
                                            onMouseLeave={() => setActive(null)}
                                        >
                                            <defs>
                                                <HatchLines id="rp-iv-track-lines" />
                                            </defs>
                                            <R.XAxis
                                                dataKey="label"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={10}
                                                interval={n > 8 ? 'preserveStartEnd' : 0}
                                                minTickGap={4}
                                            />
                                            <R.YAxis
                                                width={52}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                domain={[0, top]}
                                                ticks={ticks}
                                                tickFormatter={(v: number) => int(v)}
                                            />
                                            <R.Tooltip
                                                cursor={false}
                                                position={{ y: 0 }}
                                                isAnimationActive={false}
                                                content={({ active: on, payload }: any) =>
                                                    on && payload && payload.length ? (
                                                        <TooltipBody
                                                            row={payload[0].payload}
                                                            count={n}
                                                            healthyDays={healthyDays}
                                                            watchDays={watchDays}
                                                        />
                                                    ) : null
                                                }
                                            />
                                            <R.Bar
                                                dataKey="units"
                                                isAnimationActive={false}
                                                background={(b: any) => (
                                                    <g
                                                        key={`t${b.index}`}
                                                        data-on={active === b.index ? 'true' : 'false'}
                                                        className="group/t"
                                                    >
                                                        <R.Rectangle
                                                            x={b.x}
                                                            y={b.y}
                                                            width={b.width}
                                                            height={b.height}
                                                            radius={b.width / 2}
                                                            className={`fill-muted transition-[fill] duration-150 ${EASE} group-has-[:focus-visible]/c29:transition-none group-data-[on=true]/t:fill-muted-foreground/20 dark:group-data-[on=true]/t:fill-muted-foreground/30`}
                                                        />
                                                        <R.Rectangle
                                                            x={b.x}
                                                            y={b.y}
                                                            width={b.width}
                                                            height={b.height}
                                                            radius={b.width / 2}
                                                            fill="url(#rp-iv-track-lines)"
                                                        />
                                                    </g>
                                                )}
                                                shape={(b: any) => (
                                                    <g
                                                        key={`b${b.index}`}
                                                        data-iv-bar=""
                                                        style={{ clipPath: 'inset(0px round 999px)' }}
                                                    >
                                                        <R.Rectangle
                                                            x={b.x}
                                                            y={b.y}
                                                            width={b.width}
                                                            height={b.height}
                                                            radius={b.width / 2}
                                                            fill={HEALTH_VAR[(b.payload as Row).health]}
                                                            className={`transition-opacity duration-150 ${EASE} group-has-[:focus-visible]/c29:transition-none ${
                                                                active != null && active !== b.index ? 'opacity-40' : ''
                                                            }`}
                                                        />
                                                    </g>
                                                )}
                                            />
                                        </R.BarChart>
                                    )}
                                </ChartContainer>
                            </div>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <FooterMeta
                        items={[
                            { dot: 'success', label: syncedLabel },
                            { label: `${dcs.length} of ${warehouses.length} warehouses` },
                        ]}
                        end={<span className="tabular-nums">{per.range}</span>}
                    />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default InventoryVelocity;
