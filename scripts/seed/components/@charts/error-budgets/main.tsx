import { useId, useMemo, useState } from 'react';
import { ChartContainer, ChartFigure } from 'components:chart';
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
import { Icon } from 'components:icon';
import { series, SeriesScope, useMotion } from 'components:charts/chart-kit';
import {
    TEXT_TRIM,
    EASE_SWIFT,
    Pill,
    MetaDot,
    LiveDot,
    ServiceSelect,
    BarMeter,
    T,
} from 'components:charts/radial-kit';
import { OBJECTIVES, WINDOWS, SERVICES } from './data';
import type { Objective, ServiceSlos, BudgetWindow } from './data';

/**
 * components:charts/error-budgets: the error budget left on four SLOs of one service as concentric striped
 * rings (Recharts RadialBar over a 270 degree track), a table beside them (target, attainment, budget left,
 * burn rate, status), a service select, a 7D / 28D / 90D window switch and CSV / summary exports.
 * Hovering a ring or a row spotlights that objective (the others fade, the centre shows its budget);
 * clicking an objective's name pins it.
 *
 *   <ErrorBudgets />                                     sample data
 *   <ErrorBudgets services={[…]} objectives={[…]} windows={[…]} defaultService="payments" />
 *
 * Budget left = 1 - (100 - attained) / (100 - target). Status: Exhausted at 0, At risk at 35% or less
 * or when burning faster than 1x, otherwise Healthy.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type ErrorBudgetsProps = {
    title?: string;
    services?: ServiceSlos[];
    objectives?: Objective[];
    windows?: BudgetWindow[];
    defaultService?: string;
    defaultWindow?: string;
    updatedLabel?: string;
    burnLabel?: string;
    noteLabel?: string;
    className?: string;
};

type Row = {
    key: string;
    label: string;
    short: string;
    target: number;
    attained: number;
    left: number;
    burn: number;
    status: 'Healthy' | 'At risk' | 'Exhausted';
};

const SIZE = 240;
const C = SIZE / 2;
const INNER = 62;
const OUTER = 118;
const BAR = 10;
const SWAP = 'transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]';
const TONE: Record<string, string> = { Healthy: 'success', 'At risk': 'warning', Exhausted: 'destructive' };

function pct(v: number): string {
    return `${Number(v.toFixed(2))}%`;
}

function statusOf(left: number, burn: number): Row['status'] {
    if (left <= 0) return 'Exhausted';
    if (left <= 35 || burn > 1) return 'At risk';
    return 'Healthy';
}

function reduced(): boolean {
    return (
        typeof window !== 'undefined' &&
        !!window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/** The centre readout; re-keyed on change so it fades and rises 4px (200 ms). */
function Center({ top, value, bottom }: { top: string; value: string; bottom: string }) {
    const M = useMotion();
    const cls = 'flex w-24 flex-col items-center gap-2 text-center';
    const body = (
        <>
            <span className="text-xs text-muted-foreground">{top}</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{bottom}</span>
        </>
    );
    if (!M || reduced()) return <div className={cls}>{body}</div>;
    return (
        <M.motion.div
            key={`${top}|${value}`}
            className={cls}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE_SWIFT }}
        >
            {body}
        </M.motion.div>
    );
}

export function ErrorBudgets({
    title = 'Error Budgets',
    services = SERVICES,
    objectives = OBJECTIVES,
    windows = WINDOWS,
    defaultService = 'checkout',
    defaultWindow = '28d',
    updatedLabel = 'Updated 1 min ago',
    burnLabel = 'Burn over the last 24 hours',
    noteLabel = 'Budget is 100% minus the target',
    className,
}: ErrorBudgetsProps) {
    const firstService = services.some((s) => s.key === defaultService) ? defaultService : services[0].key;
    const firstWindow = windows.some((w) => w.key === defaultWindow) ? defaultWindow : windows[0].key;
    const [serviceKey, setServiceKey] = useState(firstService);
    const [windowKey, setWindowKey] = useState(firstWindow);
    const [spot, setSpot] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

    const svc = services.find((s) => s.key === serviceKey) || services[0];
    const win = windows.find((w) => w.key === windowKey) || windows[0];
    const scope = `${svc.label}, ${win.long}`;

    const config = useMemo(() => {
        const cfg: Record<string, any> = { track: series('zinc-100', 'zinc-800', 'Track') };
        objectives.forEach((o) => {
            cfg[o.key] = series(o.light, o.dark, o.label);
        });
        return cfg;
    }, [objectives]);

    const rows: Row[] = useMemo(
        () =>
            objectives.map((o) => {
                const target = svc.targets[o.key];
                const attained = (svc.attained[win.key] || {})[o.key];
                const budget = 100 - target;
                const left = budget > 0 ? Math.max(0, Math.min(100, (1 - (100 - attained) / budget) * 100)) : 0;
                const burn = svc.burn[o.key] || 0;
                return {
                    key: o.key,
                    label: o.label,
                    short: o.short,
                    target,
                    attained,
                    left: Math.round(left),
                    burn,
                    status: statusOf(Math.round(left), burn),
                };
            }),
        [objectives, svc, win]
    );
    const onTrack = rows.filter((r) => r.status === 'Healthy').length;
    const lowest = rows.reduce((a, r) => Math.min(a, r.left), 100);
    const peak = rows.reduce((a, r) => Math.max(a, r.burn), 0);
    /** Innermost ring first (Recharts stacks radial bars outward in data order). */
    const rings = rows.slice().reverse();
    const band = (OUTER - INNER) / Math.max(1, rows.length);
    const outerOf = (i: number) => INNER + band * i + (band + BAR) / 2;

    const active = spot || pinned;
    const activeRow = active ? rows.find((r) => r.key === active) : null;
    const dim = (key: string) => (spot && spot !== key ? 0.3 : 1);

    const aria = `Error budget left, ${scope}: ${rows.map((r) => `${r.label} ${r.left}%, ${r.status}`).join('; ')}`;
    const summary = `${title}, ${scope}: ${onTrack}/${rows.length} objectives on track. ${rows
        .map(
            (r) =>
                `${r.label} ${r.left}% left (target ${pct(r.target)}, attained ${pct(r.attained)}, burn ${r.burn}x, ${r.status})`
        )
        .join('; ')}. Lowest ${lowest}%, peak burn ${peak}x.`;
    const csv = {
        filename: `error-budgets-${svc.key}-${win.key}.csv`,
        rows,
        columns: [
            { key: 'label', label: 'Objective' },
            { key: 'target', label: 'Target (%)' },
            { key: 'attained', label: 'Attained (%)' },
            { key: 'left', label: 'Budget left (%)' },
            { key: 'burn', label: 'Burn rate (x)' },
            { key: 'status', label: 'Status' },
        ],
    };
    const windowToggle = useSingleToggle(windowKey, (v: string) => setWindowKey(v));
    const reset = () => {
        setServiceKey(firstService);
        setWindowKey(firstWindow);
        setPinned(null);
        setSpot(null);
    };

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container w-full min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                            {title}
                        </FrameTitle>
                        <FrameDescription>{scope}</FrameDescription>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 @2xl:w-auto">
                        <ServiceSelect
                            label="Service"
                            icon="layers"
                            value={serviceKey}
                            onValueChange={(v) => {
                                setServiceKey(v);
                                setPinned(null);
                            }}
                            options={services.map((s) => ({ value: s.key, label: s.label }))}
                            className="w-40 @max-2xl:w-full"
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-2 @2xl:flex-none">
                            <ToggleGroup
                                variant="outline"
                                aria-label="Window"
                                className="@max-2xl:flex-1"
                                {...windowToggle}
                            >
                                {windows.map((w) => (
                                    <ToggleGroupItem
                                        key={w.key}
                                        value={w.key}
                                        className="data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted @max-2xl:flex-1"
                                    >
                                        <span className={TEXT_TRIM}>{w.label}</span>
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
                                    { label: 'Reset view', icon: <Icon name="rotate-ccw" />, onSelect: reset },
                                ]}
                            />
                        </div>
                    </div>
                </FrameHeader>
                <div
                    className="grid gap-(--frame-gap) @3xl:grid-cols-[minmax(18rem,1fr)_minmax(0,2fr)]"
                    onMouseLeave={() => setSpot(null)}
                >
                    <FramePanel className="flex items-center justify-center">
                        <ChartFigure title={title} summary={summary}>
                            <div className="relative size-60 shrink-0">
                                <svg
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 size-full text-border"
                                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                                >
                                    <circle
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeDasharray="1.5 4"
                                        strokeLinecap="round"
                                        cx={C}
                                        cy={C}
                                        r="54"
                                    />
                                </svg>
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    {activeRow ? (
                                        <Center
                                            top={activeRow.label}
                                            value={`${activeRow.left}%`}
                                            bottom="budget left"
                                        />
                                    ) : (
                                        <Center
                                            top="On track"
                                            value={`${onTrack}/${rows.length}`}
                                            bottom="objectives"
                                        />
                                    )}
                                </div>
                                <ChartContainer
                                    config={config}
                                    className="aspect-auto size-full"
                                    role="img"
                                    aria-label={aria}
                                >
                                    {(R: any) => (
                                        <R.RadialBarChart
                                            data={rings}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={INNER}
                                            outerRadius={OUTER}
                                            barSize={BAR}
                                            startAngle={90}
                                            endAngle={-180}
                                        >
                                            <defs>
                                                {rows.map((r) => (
                                                    <pattern
                                                        key={r.key}
                                                        id={`${uid}-rd-${r.key}`}
                                                        width="6"
                                                        height="6"
                                                        patternUnits="userSpaceOnUse"
                                                        patternTransform="rotate(45)"
                                                    >
                                                        <rect fill={`var(--color-${r.key})`} width="6" height="6" />
                                                        <rect
                                                            fill="var(--card)"
                                                            fillOpacity="0.2"
                                                            width="1.5"
                                                            height="6"
                                                        />
                                                    </pattern>
                                                ))}
                                            </defs>
                                            <R.PolarAngleAxis
                                                type="number"
                                                domain={[0, 100]}
                                                tick={false}
                                                axisLine={false}
                                            />
                                            <R.RadialBar
                                                dataKey="left"
                                                cornerRadius={5}
                                                isAnimationActive={false}
                                                background={{ fill: 'var(--color-track)' }}
                                                shape={(props: any) => {
                                                    const key = props.payload && props.payload.key;
                                                    return (
                                                        <g
                                                            className={`cursor-pointer ${SWAP}`}
                                                            style={{ opacity: dim(key) }}
                                                            onMouseEnter={() => setSpot(key)}
                                                            onMouseLeave={() => setSpot(null)}
                                                            onClick={() => setPinned(pinned === key ? null : key)}
                                                        >
                                                            <R.Sector
                                                                {...props}
                                                                fill={`url(#${uid}-rd-${key})`}
                                                                className="recharts-radial-bar-sector"
                                                            />
                                                        </g>
                                                    );
                                                }}
                                            />
                                        </R.RadialBarChart>
                                    )}
                                </ChartContainer>
                                <div className="pointer-events-none absolute inset-0">
                                    {rings.map((r, i) => (
                                        <span
                                            key={r.key}
                                            className={`absolute flex h-3 -translate-y-1/2 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground ${SWAP}`}
                                            style={{
                                                top: C - (outerOf(i) - BAR / 2),
                                                right: C + 8,
                                                opacity: dim(r.key),
                                            }}
                                        >
                                            <span className={TEXT_TRIM}>{r.short}</span>
                                            <span
                                                className="size-1.5 rounded-full"
                                                style={{ background: `var(--color-${r.key})` }}
                                            />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </ChartFigure>
                    </FramePanel>
                    <FramePanel className="p-0">
                        <div className="relative min-w-0">
                            <svg
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-muted-foreground/8"
                            >
                                <defs>
                                    <pattern id={`${uid}-hatch`} width="4" height="4" patternUnits="userSpaceOnUse">
                                        <path stroke="currentColor" strokeWidth="1" d="M0 4L4 0" />
                                    </pattern>
                                </defs>
                                <rect fill={`url(#${uid}-hatch)`} width="100%" height="100%" />
                            </svg>
                            <div className={T.container}>
                                <table className={T.table} aria-label={`Error budgets, ${scope}`}>
                                    <thead className={T.thead}>
                                        <tr className={T.tr}>
                                            <th className={`${T.th} text-start`}>Objective</th>
                                            <th className={`${T.th} text-end @max-4xl:hidden`}>Target</th>
                                            <th className={`${T.th} text-end @max-xl:hidden`}>Attained</th>
                                            <th className={`${T.th} w-32 text-start @max-md:w-auto`}>Budget left</th>
                                            <th className={`${T.th} text-end @max-2xl:hidden`}>Burn</th>
                                            <th className={`${T.th} text-end`}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={T.tbody}>
                                        {rows.map((r) => (
                                            <tr
                                                key={r.key}
                                                className={`${T.tr} h-12 cursor-pointer ${SWAP}`}
                                                style={{ opacity: dim(r.key) }}
                                                onMouseEnter={() => setSpot(r.key)}
                                                onMouseLeave={() => setSpot(null)}
                                                onClick={() => setPinned(pinned === r.key ? null : r.key)}
                                            >
                                                <td className={T.td}>
                                                    <button
                                                        type="button"
                                                        aria-pressed={pinned === r.key}
                                                        onFocus={() => setSpot(r.key)}
                                                        onBlur={() => setSpot(null)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPinned(pinned === r.key ? null : r.key);
                                                        }}
                                                        className="flex h-5 max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-full text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="size-2 shrink-0 rounded-full"
                                                            style={{ background: `var(--color-${r.key})` }}
                                                        />
                                                        <span
                                                            className={`min-w-0 font-medium ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                        >
                                                            {r.label}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td
                                                    className={`${T.td} text-end text-muted-foreground tabular-nums @max-4xl:hidden`}
                                                >
                                                    {pct(r.target)}
                                                </td>
                                                <td className={`${T.td} text-end tabular-nums @max-xl:hidden`}>
                                                    {r.attained.toFixed(2)}%
                                                </td>
                                                <td className={T.td}>
                                                    <span className="flex h-5 items-center gap-2.5">
                                                        <BarMeter
                                                            value={r.left}
                                                            color={`var(--color-${r.key})`}
                                                            label={`${r.label}, ${r.left}% budget left`}
                                                            className="@max-md:hidden"
                                                        />
                                                        <span
                                                            className={`w-9 text-end font-medium tabular-nums @max-md:w-auto ${TEXT_TRIM}`}
                                                        >
                                                            {r.left}%
                                                        </span>
                                                    </span>
                                                </td>
                                                <td
                                                    className={`${T.td} text-end tabular-nums @max-2xl:hidden ${
                                                        r.burn > 1
                                                            ? 'font-medium text-foreground'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {r.burn}x
                                                </td>
                                                <td className={`${T.td} text-end`}>
                                                    <Pill tone={TONE[r.status]}>{r.status}</Pill>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className={T.tfoot}>
                                        <tr className={`${T.tr} h-10`}>
                                            <td className={T.td}>
                                                <span className="flex h-5 items-center gap-1.5">
                                                    <span className={`font-semibold ${TEXT_TRIM}`}>Overall</span>
                                                    <span
                                                        className={`font-normal text-muted-foreground tabular-nums @max-md:hidden ${TEXT_TRIM}`}
                                                    >
                                                        {rows.length} objectives
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={`${T.td} @max-4xl:hidden`} />
                                            <td className={`${T.td} @max-xl:hidden`} />
                                            <td className={T.td}>
                                                <span className="flex h-5 items-center gap-1.5">
                                                    <span className={`font-normal text-muted-foreground ${TEXT_TRIM}`}>
                                                        Lowest
                                                    </span>
                                                    <span className={`font-semibold tabular-nums ${TEXT_TRIM}`}>
                                                        {lowest}%
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={`${T.td} @max-2xl:hidden`}>
                                                <span className="flex justify-end">
                                                    <span className="flex h-5 items-center gap-1.5">
                                                        <span
                                                            className={`font-normal text-muted-foreground ${TEXT_TRIM}`}
                                                        >
                                                            Peak
                                                        </span>
                                                        <span className={`font-semibold tabular-nums ${TEXT_TRIM}`}>
                                                            {peak}x
                                                        </span>
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={`${T.td} text-end`}>
                                                <Pill tone="outline">{`${onTrack}/${rows.length} on track`}</Pill>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </FramePanel>
                </div>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center gap-2">
                        <LiveDot />
                        <span className={TEXT_TRIM}>{updatedLabel}</span>
                        <MetaDot />
                        <span className={TEXT_TRIM}>{burnLabel}</span>
                    </span>
                    <span className="flex h-4 items-center">
                        <span className={TEXT_TRIM}>{noteLabel}</span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default ErrorBudgets;
