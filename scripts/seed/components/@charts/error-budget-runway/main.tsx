import { useId, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    downloadText,
    rowsToCsv,
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
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { useElementWidth } from 'components:charts/chart-kit';
import {
    OutlineBadge,
    ToneDot,
    LiveDot,
    PillToggle,
    TONE_FILL,
    TONE_VAR,
    slopePath,
    useTween,
    useInterval,
    seeded,
} from 'components:charts/slope-kit';
import { SERVICES, WINDOW_DAYS, THRESHOLDS } from './data';
import type { RunwayService } from './data';

/**
 * components:charts/error-budget-runway: a slope chart joining services ranked by traffic (left) to their days of
 * error budget left (right). Line thickness = traffic, colour = status (Critical / Watch / Healthy); beads run along
 * the at-risk lines. Current / Baseline burn switch, four fleet stats, hover to trace a line, click to pin it while
 * the others dim, a footer inspector for the traced service, a header menu (live updates, CSV, copy summary) with
 * toasts and a simulated live tick every 5 seconds that drifts each service's burn and re-sorts the runway.
 *
 *   <ErrorBudgetRunway />                                                         sample data
 *   <ErrorBudgetRunway services={[{ key, team, traffic, left, burn, baselineBurn }]} windowDays={30}
 *       thresholds={{ critical: 5, watch: 14 }} live={false} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type ErrorBudgetRunwayProps = {
    title?: string;
    description?: string;
    services?: RunwayService[];
    windowDays?: number;
    thresholds?: { critical: number; watch: number };
    live?: boolean;
    tickMs?: number;
    className?: string;
};

type Status = 'critical' | 'watch' | 'healthy';
type Row = RunwayService & { runway: number; baseline: number; status: Status };

const LEFT = 156;
const RIGHT = 184;
const PAD = 4;
const ROW = 464 / 14;
const BAR_W = 96;
const STATUS_LABEL: Record<Status, string> = { critical: 'Critical', watch: 'Watch', healthy: 'Healthy' };
const BASE_OPACITY: Record<Status, number> = { critical: 1, watch: 0.9, healthy: 0.35 };
const BEADS: Record<Status, { n: number; dur: number }> = {
    critical: { n: 3, dur: 5.2 },
    watch: { n: 2, dur: 7.6 },
    healthy: { n: 0, dur: 0 },
};

const KEYFRAMES = `
@keyframes rp-c50-settle { from { transform: translateY(3px); opacity: 0.35; } }
.rp-c50-settle { display: inline-block; animation: rp-c50-settle 420ms cubic-bezier(0.22, 1, 0.36, 1); }
@keyframes rp-c50-bead {
    0% { offset-distance: 0%; opacity: 0; }
    12%, 88% { opacity: 1; }
    100% { offset-distance: 100%; opacity: 0; }
}
.rp-c50-bead { offset-rotate: 0deg; animation: rp-c50-bead var(--rp-dur) linear var(--rp-delay) infinite; }
@media (prefers-reduced-motion: reduce) {
    .rp-c50-settle { animation: none; }
    .rp-c50-bead { display: none; }
}
`;

const days = (d: number, cap: number) => (d >= cap ? `${cap}d+` : d >= 10 ? `${Math.round(d)}d` : `${d.toFixed(1)}d`);
const signedDays = (d: number) => `${d > 0 ? '+' : '-'}${Math.abs(d).toFixed(1)}d`;
const pct = (f: number) => `${Math.round(f * 100)}%`;
const whole = (n: number) => Math.round(n).toLocaleString('en-US');

function statusOf(runway: number, t: { critical: number; watch: number }): Status {
    return runway < t.critical ? 'critical' : runway < t.watch ? 'watch' : 'healthy';
}

/** The fleet numbers shown in the stat strip. */
function fleetOf(rows: Row[]) {
    const traffic = rows.reduce((s, r) => s + r.traffic, 0) || 1;
    const critical = rows.filter((r) => r.status === 'critical');
    const first = rows.slice().sort((a, b) => a.runway - b.runway)[0];
    return {
        traffic,
        critical: critical.length,
        watch: rows.filter((r) => r.status === 'watch').length,
        healthy: rows.filter((r) => r.status === 'healthy').length,
        first,
        trafficAtRisk: critical.reduce((s, r) => s + r.traffic, 0) / traffic,
        budgetLeft: rows.reduce((s, r) => s + r.traffic * r.left, 0) / traffic,
    };
}

function Settle({ value, className = '' }: { value: string; className?: string }) {
    return (
        <span key={value} className={`rp-c50-settle ${className}`}>
            {value}
        </span>
    );
}

function Stat({
    label,
    badge,
    value,
    suffix,
    children,
}: {
    label: string;
    badge: string;
    value: string;
    suffix?: string;
    children?: any;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2 @3xl/c50:not-first:border-s @3xl/c50:not-first:ps-6">
            <div className="flex min-h-5 items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
                <OutlineBadge className="tabular-nums">{badge}</OutlineBadge>
            </div>
            <div className="flex items-baseline gap-1">
                <Settle
                    value={value}
                    className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums"
                />
                {suffix ? <span className="text-sm text-muted-foreground tabular-nums">{suffix}</span> : null}
            </div>
            <div className="flex h-5 min-w-0 items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {children}
            </div>
        </div>
    );
}

export function ErrorBudgetRunway({
    title = 'Error Budget Runway',
    description,
    services = SERVICES,
    windowDays = WINDOW_DAYS,
    thresholds = THRESHOLDS,
    live: liveDefault = true,
    tickMs = 5000,
    className = '',
}: ErrorBudgetRunwayProps) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const plotRef = useRef<HTMLDivElement | null>(null);
    const width = useElementWidth(plotRef);
    const [mode, setMode] = useState<'current' | 'baseline'>('current');
    const [live, setLive] = useState(liveDefault);
    const [list, setList] = useState(services);
    const [prev, setPrev] = useState<ReturnType<typeof fleetOf> | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const rand = useRef(seeded(50));

    const rows: Row[] = list.map((s) => {
        const runway = (s.left * windowDays) / s.burn;
        return {
            ...s,
            runway,
            baseline: (s.left * windowDays) / s.baselineBurn,
            status: statusOf(runway, thresholds),
        };
    });
    const fleet = fleetOf(rows);

    useInterval(
        () => {
            setPrev(fleet);
            setList((cur) =>
                cur.map((s) => {
                    const drift = 1 + (rand.current() - 0.5) * 0.16;
                    return { ...s, burn: Math.min(6, Math.max(0.3, s.burn * drift)) };
                })
            );
        },
        live ? tickMs : null
    );

    // Geometry: rows ranked by traffic on the left, by runway (current or baseline burn) on the right.
    const W = Math.max(768, width || 1118);
    const x0 = LEFT;
    const x1 = W - RIGHT;
    const H = PAD * 2 + rows.length * ROW;
    const yAt = (i: number) => PAD + (i + 0.5) * ROW;
    const byTraffic = rows.slice().sort((a, b) => b.traffic - a.traffic);
    const runwayOf = (r: Row) => Math.min(windowDays, mode === 'current' ? r.runway : r.baseline);
    const byRunway = rows.slice().sort((a, b) => runwayOf(a) - runwayOf(b) || b.traffic - a.traffic);
    const leftY: Record<string, number> = {};
    const rightTarget: Record<string, number> = {};
    byTraffic.forEach((r, i) => {
        leftY[r.key] = yAt(i);
    });
    byRunway.forEach((r, i) => {
        rightTarget[r.key] = yAt(i);
    });
    const rightY = useTween(rightTarget, 600);
    const maxTraffic = Math.max(...rows.map((r) => r.traffic), 1);
    const strokeOf = (r: Row) => 1.5 + (7 * r.traffic) / maxTraffic;
    const beadR = (r: Row) => Math.min(4, 2.25 + (3.5 * r.traffic) / maxTraffic);

    const trace = hover || pinned;
    const focus = rows.find((r) => r.key === (trace || (fleet.first && fleet.first.key))) || null;
    const pin = (k: string) => setPinned((cur) => (cur === k ? null : k));
    const order = ['healthy', 'watch', 'critical'];
    const drawn = rows
        .slice()
        .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.traffic - a.traffic);
    if (trace) {
        const i = drawn.findIndex((r) => r.key === trace);
        if (i >= 0) drawn.push(drawn.splice(i, 1)[0]);
    }

    const delta = (now: number, before: number | undefined, fmt: (d: number) => string, eps: number) =>
        before == null || Math.abs(now - before) < eps ? 'Steady' : fmt(now - before);
    const first = fleet.first;

    const csvColumns = [
        { key: 'key', label: 'Service' },
        { key: 'team', label: 'Team' },
        { key: 'traffic', label: 'Traffic (M req/day)' },
        { key: 'status', label: 'Status' },
        { key: 'burn', label: 'Burn rate' },
        { key: 'runwayDays', label: 'Runway, current burn (days)' },
        { key: 'baselineDays', label: 'Runway, baseline burn (days)' },
    ];
    const csvRows = byTraffic.map((r) => ({
        ...r,
        status: STATUS_LABEL[r.status],
        burn: r.burn.toFixed(2),
        runwayDays: r.runway.toFixed(1),
        baselineDays: r.baseline.toFixed(1),
    }));
    const summary =
        `Error budget runway for ${rows.length} services: ${fleet.critical} critical, ${fleet.watch} watch, ${fleet.healthy} healthy. ` +
        (first
            ? `${first.key} runs out first, in ${days(first.runway, windowDays)} at ${first.burn.toFixed(1)}× burn. `
            : '') +
        `${pct(fleet.trafficAtRisk)} of ${whole(fleet.traffic)}M req/day is at risk; ${pct(fleet.budgetLeft)} of the traffic-weighted budget is left.`;
    const reset = () => {
        setMode('current');
        setPinned(null);
        setHover(null);
        setView('chart');
    };

    const onLabelKey = (e: any, key: string) => {
        const i = byTraffic.findIndex((r) => r.key === key);
        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (step) {
            e.preventDefault();
            const next = byTraffic[(i + step + byTraffic.length) % byTraffic.length];
            const el = document.getElementById(`${uid}-l-${next.key}`) as any;
            if (el && el.focus) el.focus();
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pin(key);
        }
        if (e.key === 'Escape') setPinned(null);
    };

    const chart = (
        <div className="overflow-x-auto">
            <div className="min-w-3xl" ref={plotRef}>
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span className="w-36 text-end">Service, by traffic</span>
                    <span className="flex items-center gap-3">
                        {(['critical', 'watch', 'healthy'] as Status[]).map((s) => (
                            <span key={s} className="inline-flex items-center gap-1.5">
                                <ToneDot tone={s} />
                                {STATUS_LABEL[s]}
                            </span>
                        ))}
                    </span>
                    <span className="w-40">
                        {mode === 'current' ? 'Runway, current burn' : 'Runway, baseline burn'}
                    </span>
                </div>
                <svg
                    width={W}
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    role="group"
                    aria-label={`Error budget runway for ${rows.length} services: traffic order on the left, runway order on the right`}
                    className="block h-auto w-full text-xs"
                    onMouseLeave={() => setHover(null)}
                >
                    <defs>
                        {rows.map((r) => (
                            <linearGradient
                                key={r.key}
                                id={`${uid}-${r.key}-trail`}
                                x1={x0}
                                y1={0}
                                x2={x1}
                                y2={0}
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop offset="0%" stopColor={TONE_VAR[r.status]} stopOpacity={0.3} />
                                <stop offset="55%" stopColor={TONE_VAR[r.status]} stopOpacity={0.7} />
                                <stop offset="100%" stopColor={TONE_VAR[r.status]} />
                            </linearGradient>
                        ))}
                    </defs>
                    <g>
                        {drawn.map((r) => {
                            const d = slopePath(
                                x0,
                                x1,
                                leftY[r.key],
                                rightY[r.key] == null ? leftY[r.key] : rightY[r.key]
                            );
                            const traced = trace === r.key;
                            const w = strokeOf(r);
                            const stroke = `url(#${uid}-${r.key}-trail)`;
                            const beads = !trace || traced ? BEADS[r.status] : BEADS.healthy;
                            return (
                                <g key={r.key} data-service={r.key}>
                                    {traced ? (
                                        <path
                                            d={d}
                                            fill="none"
                                            stroke={stroke}
                                            strokeWidth={w + 10}
                                            strokeOpacity={0.12}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="pointer-events-none"
                                        />
                                    ) : null}
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke={stroke}
                                        strokeWidth={w}
                                        strokeOpacity={traced ? 1 : trace ? 0.06 : BASE_OPACITY[r.status]}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="transition-[stroke-opacity] duration-300 motion-reduce:transition-none"
                                    />
                                    {Array.from({ length: beads.n }).map((_, b) => (
                                        <circle
                                            key={b}
                                            cx={0}
                                            cy={0}
                                            r={beadR(r)}
                                            stroke="var(--background)"
                                            strokeWidth={1.5}
                                            className={`rp-c50-bead pointer-events-none ${TONE_FILL[r.status]}`}
                                            style={
                                                {
                                                    offsetPath: `path("${d}")`,
                                                    '--rp-dur': `${beads.dur}s`,
                                                    '--rp-delay': `${(-beads.dur * b) / beads.n}s`,
                                                } as any
                                            }
                                        />
                                    ))}
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth={18}
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHover(r.key)}
                                        onClick={() => pin(r.key)}
                                    />
                                </g>
                            );
                        })}
                    </g>
                    <g>
                        {byTraffic.map((r) => {
                            const dim = trace != null && trace !== r.key ? 'opacity-25' : '';
                            const ly = leftY[r.key];
                            const ry = rightY[r.key] == null ? ly : rightY[r.key];
                            const shown = mode === 'current' ? r.runway : r.baseline;
                            const fullW = (v: number) => Math.round((Math.min(windowDays, v) / windowDays) * BAR_W);
                            return (
                                <g key={r.key}>
                                    <g
                                        id={`${uid}-l-${r.key}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={pinned === r.key}
                                        aria-label={`${r.key}, ${STATUS_LABEL[r.status]}: ${days(r.runway, windowDays)} of error budget left at current burn, ${days(r.baseline, windowDays)} at baseline`}
                                        className={`cursor-pointer outline-none transition-opacity duration-200 motion-reduce:transition-none ${dim}`}
                                        onMouseEnter={() => setHover(r.key)}
                                        onFocus={() => setHover(r.key)}
                                        onBlur={() => setHover(null)}
                                        onClick={() => pin(r.key)}
                                        onKeyDown={(e) => onLabelKey(e, r.key)}
                                    >
                                        <rect x={0} y={ly - 16} width={LEFT} height={32} fill="transparent" />
                                        <text
                                            x={LEFT - 10}
                                            y={ly}
                                            textAnchor="end"
                                            dominantBaseline="central"
                                            className="text-xs"
                                        >
                                            <tspan className="fill-foreground font-mono">{r.key}</tspan>
                                            <tspan dx={6} className="fill-muted-foreground tabular-nums">
                                                {`${whole(r.traffic)}M`}
                                            </tspan>
                                        </text>
                                    </g>
                                    <g
                                        className={`cursor-pointer transition-opacity duration-200 motion-reduce:transition-none ${dim}`}
                                        onMouseEnter={() => setHover(r.key)}
                                        onClick={() => pin(r.key)}
                                    >
                                        <rect x={x1} y={ry - 16} width={RIGHT} height={32} fill="transparent" />
                                        <text
                                            x={x1 + 10}
                                            y={ry}
                                            dominantBaseline="central"
                                            className="fill-foreground text-xs font-medium tabular-nums"
                                        >
                                            {days(shown, windowDays)}
                                        </text>
                                        <rect
                                            x={x1 + 54}
                                            y={ry - 3}
                                            width={BAR_W}
                                            height={6}
                                            rx={3}
                                            className="fill-muted"
                                        />
                                        <rect
                                            x={x1 + 54}
                                            y={ry - 3}
                                            width={fullW(r.baseline)}
                                            height={6}
                                            rx={3}
                                            fillOpacity={0.25}
                                            className={TONE_FILL[r.status]}
                                        />
                                        <rect
                                            x={x1 + 54}
                                            y={ry - 3}
                                            width={fullW(r.runway)}
                                            height={6}
                                            rx={3}
                                            fillOpacity={r.status === 'healthy' ? 0.4 : 1}
                                            className={TONE_FILL[r.status]}
                                        />
                                    </g>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );

    return (
        <div className={`w-full min-w-0 ${className}`}>
            <style>{KEYFRAMES}</style>
            <Frame stacked className="@container/c50 min-w-0">
                <FrameHeader className="min-w-0 flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <FrameTitle role="heading" className="flex items-center gap-2">
                            {title}
                            <OutlineBadge className="gap-1.5">
                                <LiveDot paused={!live} />
                                {live ? 'Live' : 'Paused'}
                            </OutlineBadge>
                        </FrameTitle>
                        <FrameDescription>
                            {description || `Days until each service breaks its ${windowDays}-day SLO`}
                        </FrameDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <PillToggle
                            label="Runway at"
                            value={mode}
                            onValueChange={(v) => setMode(v as any)}
                            options={[
                                { value: 'current', label: 'Current' },
                                { value: 'baseline', label: 'Baseline' },
                            ]}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-7 bg-background"
                                        aria-label="Runway options"
                                        title="Runway options"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Updates</DropdownMenuLabel>
                                    <DropdownMenuCheckboxItem
                                        checked={live}
                                        onCheckedChange={(v: boolean) => setLive(!!v)}
                                    >
                                        Live Updates
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Share</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText('error-budget-runway.csv', rowsToCsv(csvRows, csvColumns));
                                            toast.success('Runway exported as CSV');
                                        }}
                                    >
                                        <Icon name="download" />
                                        Export CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            copyText(summary);
                                            toast.success('Summary copied to clipboard');
                                        }}
                                    >
                                        <Icon name="copy" />
                                        Copy Summary
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>View</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-spline' : 'sheet'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={reset}>
                                        <Icon name="rotate-ccw" />
                                        Reset View
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </FrameHeader>
                <FramePanel>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5 @3xl/c50:grid-cols-4">
                        <Stat
                            label="At Risk"
                            badge={delta(
                                fleet.critical,
                                prev ? prev.critical : undefined,
                                (d) => (d > 0 ? `+${d}` : `${d}`),
                                0.5
                            )}
                            value={String(fleet.critical)}
                            suffix={`/ ${rows.length}`}
                        >
                            <ToneDot tone="watch" />
                            <span>{`${fleet.watch} watch`}</span>
                            <ToneDot tone="healthy" className="ms-1.5" />
                            <span>{`${fleet.healthy} healthy`}</span>
                        </Stat>
                        <Stat
                            label="Runs Out First"
                            badge={delta(
                                first ? first.runway : 0,
                                prev && prev.first ? prev.first.runway : undefined,
                                signedDays,
                                0.05
                            )}
                            value={first ? days(first.runway, windowDays) : '-'}
                        >
                            <span className="truncate font-mono text-foreground">{first ? first.key : ''}</span>
                            <span className="shrink-0">{first ? `at ${first.burn.toFixed(1)}×` : ''}</span>
                        </Stat>
                        <Stat
                            label="Traffic at Risk"
                            badge={delta(
                                Math.round(fleet.trafficAtRisk * 100),
                                prev ? Math.round(prev.trafficAtRisk * 100) : undefined,
                                (d) => `${d > 0 ? '+' : ''}${d} pts`,
                                0.5
                            )}
                            value={pct(fleet.trafficAtRisk)}
                        >
                            <span>{`of ${whole(fleet.traffic)}M req/day`}</span>
                        </Stat>
                        <Stat
                            label="Budget Left"
                            badge={delta(
                                Math.round(fleet.budgetLeft * 100),
                                prev ? Math.round(prev.budgetLeft * 100) : undefined,
                                (d) => `${d > 0 ? '+' : ''}${d} pts`,
                                0.5
                            )}
                            value={pct(fleet.budgetLeft)}
                        >
                            <div className="relative h-1.5 w-full overflow-hidden rounded-full">
                                <svg aria-hidden="true" className="absolute inset-0 size-full text-muted-foreground/25">
                                    <defs>
                                        <pattern
                                            id={`${uid}-hatch`}
                                            width="4"
                                            height="4"
                                            patternUnits="userSpaceOnUse"
                                            patternTransform="rotate(45)"
                                        >
                                            <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1.5" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill={`url(#${uid}-hatch)`} />
                                </svg>
                                <div
                                    role="progressbar"
                                    aria-label="Traffic weighted error budget left"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(fleet.budgetLeft * 100)}
                                    aria-valuetext={pct(fleet.budgetLeft)}
                                    className="relative h-1.5 w-full"
                                >
                                    <div
                                        className="h-full rounded-full bg-success transition-all"
                                        style={{ width: `${fleet.budgetLeft * 100}%` }}
                                    />
                                </div>
                            </div>
                        </Stat>
                    </div>
                </FramePanel>
                <FramePanel className="min-w-0">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={csvRows.map((r) => ({
                                    label: r.key,
                                    traffic: r.traffic,
                                    runway: r.runway,
                                    baseline: r.baseline,
                                }))}
                                index="label"
                                indexLabel="Service"
                                series={[
                                    { key: 'traffic', label: 'Traffic (M req/day)' },
                                    { key: 'runway', label: 'Runway, current burn' },
                                    { key: 'baseline', label: 'Runway, baseline burn' },
                                ]}
                                valueFormatter={(v: number, item: any) =>
                                    item && item.dataKey === 'traffic' ? `${whole(v)}M` : days(v, windowDays)
                                }
                                caption="Error budget runway by service"
                            />
                        }
                    >
                        {chart}
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="min-w-0 flex-row items-center justify-between gap-4">
                    {focus ? (
                        <>
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-mono text-xs font-medium text-foreground">
                                    {focus.key}
                                </span>
                                <OutlineBadge>
                                    <span className="inline-flex items-center gap-1.5">
                                        <ToneDot tone={focus.status} />
                                        {STATUS_LABEL[focus.status]}
                                    </span>
                                </OutlineBadge>
                            </div>
                            <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground tabular-nums">
                                <span className="hidden @2xl/c50:inline">{focus.team}</span>
                                <span className="hidden @xl/c50:inline">
                                    {'Burning '}
                                    <span className="font-medium text-foreground">{`${focus.burn.toFixed(1)}×`}</span>
                                </span>
                                <span>
                                    {'Out in '}
                                    <span className="font-medium text-foreground">
                                        {days(focus.runway, windowDays)}
                                    </span>
                                </span>
                                {pinned ? (
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        className="text-muted-foreground"
                                        onClick={() => setPinned(null)}
                                    >
                                        <Icon name="x" />
                                        Clear
                                    </Button>
                                ) : null}
                            </div>
                        </>
                    ) : null}
                </FrameFooter>
            </Frame>
        </div>
    );
}

export default ErrorBudgetRunway;
