import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable, prefersReducedMotion } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    ToolbarSelect,
    ChartMoreMenu,
} from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { series, SeriesScope, useMotion, EASE_OUT } from 'components:charts/chart-kit';
import { CATEGORIES, PERIODS } from './data';
import type { SpendCategory, SpendPeriod } from './data';

/**
 * components:charts/cloud-spend: a "budget rose" in plain SVG. Each wedge's width is the category's share
 * of the budget and its length is budget use (spent / budget) out to a dashed budget ring; overspend breaks
 * through the ring as a hatched band, and categories from 90% use get an amber at-risk arc. Hover a wedge
 * or row to read it in the centre; click to drill into the category's services (the rose turns the wedge
 * to face the panel). Period select, sort menu (budget use, headroom, cost) and exports.
 *
 *   <CloudSpend />                                           sample data
 *   <CloudSpend categories={[…]} periods={{ '30d': { label, since, dates, change, values } }} />
 *
 * Amounts are USD thousands. Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type CloudSpendProps = {
    title?: string;
    description?: string;
    categories?: SpendCategory[];
    periods?: Record<string, SpendPeriod>;
    defaultPeriod?: string;
    /** Budget use (0–1) from which a category is "at risk". */
    atRisk?: number;
    className?: string;
};

type Sort = 'use' | 'headroom' | 'cost';

const C = 200;
const R_IN = 80;
const R_BUDGET = 150;
const BAND_IN = 153;
const BAND_MAX = 164;
const PAD = 0.7;
const CORNER = 5;
const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';
const TINY_BADGE =
    'relative inline-flex h-4.5 min-w-4.5 w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-1 py-0.25 text-[0.625rem] leading-none font-medium whitespace-nowrap';
const OVER_BADGE =
    'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive';
const RISK_BADGE =
    'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning';
const SERVICE_SHADES = [86, 70, 56, 44, 34, 26];

const r2 = (v: number) => Math.round(v * 100) / 100;
function pt(r: number, a: number): [number, number] {
    const t = (a * Math.PI) / 180;
    return [r2(C + r * Math.sin(t)), r2(C - r * Math.cos(t))];
}

/** Annular sector from angle a0 to a1 (degrees clockwise from 12 o'clock) with rounded corners. */
function sector(rIn: number, rOut: number, a0: number, a1: number, corner = CORNER): string {
    if (a1 <= a0 || rOut <= rIn) return '';
    const c = Math.max(0, Math.min(corner, (rOut - rIn) / 2));
    const deg = (x: number) => (x * 180) / Math.PI;
    const tO = deg(Math.asin(c / (rOut - c)));
    const tI = deg(Math.asin(c / (rIn + c)));
    const dO = Math.sqrt((rOut - c) * (rOut - c) - c * c);
    const dI = Math.sqrt((rIn + c) * (rIn + c) - c * c);
    const p = (x: [number, number]) => `${x[0]} ${x[1]}`;
    const largeO = a1 - a0 - 2 * tO > 180 ? 1 : 0;
    const largeI = a1 - a0 - 2 * tI > 180 ? 1 : 0;
    return [
        `M ${p(pt(dI, a0))}`,
        `L ${p(pt(dO, a0))}`,
        `A ${c} ${c} 0 0 1 ${p(pt(rOut, a0 + tO))}`,
        `A ${rOut} ${rOut} 0 ${largeO} 1 ${p(pt(rOut, a1 - tO))}`,
        `A ${c} ${c} 0 0 1 ${p(pt(dO, a1))}`,
        `L ${p(pt(dI, a1))}`,
        `A ${c} ${c} 0 0 1 ${p(pt(rIn, a1 - tI))}`,
        `A ${rIn} ${rIn} 0 ${largeI} 0 ${p(pt(rIn, a0 + tI))}`,
        `A ${c} ${c} 0 0 1 ${p(pt(dI, a0))}`,
        'Z',
    ].join(' ');
}

function arc(r: number, a0: number, a1: number): string {
    const s = pt(r, a0);
    const e = pt(r, a1);
    return `M ${s[0]} ${s[1]} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${e[0]} ${e[1]}`;
}

/** USD thousands → "$206.9K", "$1.2M", "$488K". */
function usd(k: number): string {
    const a = Math.abs(k);
    const s = a >= 1000 ? `${(a / 1000).toFixed(1).replace(/\.0$/, '')}M` : `${a.toFixed(1).replace(/\.0$/, '')}K`;
    return `${k < 0 ? '-' : ''}$${s}`;
}
function usdParts(k: number): [string, string] {
    const s = usd(k);
    return [s.slice(0, -1), s.slice(-1)];
}

export function CloudSpend({
    title = 'Cloud Spend',
    description = 'Wedge width is budget, length is use',
    categories = CATEGORIES,
    periods = PERIODS,
    defaultPeriod = '30d',
    atRisk = 0.9,
    className,
}: CloudSpendProps) {
    const keys = Object.keys(periods);
    const firstPeriod = keys.indexOf(defaultPeriod) >= 0 ? defaultPeriod : keys[0];
    const [period, setPeriod] = useState(firstPeriod);
    const [sort, setSort] = useState<Sort>('use');
    const [hover, setHover] = useState<string | null>(null);
    const [hoverService, setHoverService] = useState<number | null>(null);
    const [drill, setDrill] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const panelRef = useRef<HTMLDivElement>(null);
    const lastDrill = useRef<string | null>(null);
    const Motion = useMotion();
    const p = periods[period];

    const config = useMemo(() => {
        const cfg: Record<string, any> = {};
        categories.forEach((c) => {
            cfg[c.key] = series(c.color, c.color, c.label);
        });
        return cfg;
    }, [categories]);

    const cats = useMemo(() => {
        const budgetTotal = categories.reduce((a, c) => a + ((p.values[c.key] && p.values[c.key].budget) || 0), 0) || 1;
        let angle = 0;
        return categories.map((c) => {
            const v = p.values[c.key] || { spent: 0, budget: 0, change: 0 };
            const span = (v.budget / budgetTotal) * 360;
            const a0 = angle + PAD;
            const a1 = angle + span - PAD;
            angle += span;
            const use = v.budget ? v.spent / v.budget : 0;
            const status = use >= 1 ? 'over' : use >= atRisk ? 'risk' : 'ok';
            const rUse = R_IN + (R_BUDGET - R_IN) * Math.min(use, 1);
            const bandOut = Math.min(BAND_MAX, R_BUDGET + (use - 1) * (R_BUDGET - R_IN));
            const labelR = 176 + Math.max(0, bandOut - BAND_IN);
            return {
                ...c,
                ...v,
                use,
                status,
                a0,
                a1,
                mid: (a0 + a1) / 2,
                rUse,
                bandOut,
                labelR,
                left: v.budget - v.spent,
            };
        });
    }, [categories, p, atRisk]);

    const spent = cats.reduce((a, c) => a + c.spent, 0);
    const budget = cats.reduce((a, c) => a + c.budget, 0);
    const sorted = cats
        .slice()
        .sort((a, b) => (sort === 'use' ? b.use - a.use : sort === 'cost' ? b.spent - a.spent : b.left - a.left));
    const drilled = drill ? cats.find((c) => c.key === drill) || null : null;
    const services = drilled
        ? drilled.services.map((s, i) => ({
              key: `${drilled.key}-${i}`,
              label: s.label,
              share: s.share,
              spent: (drilled.spent * s.share) / 100,
              color: `color-mix(in oklab, var(--color-${drilled.key}) ${SERVICE_SHADES[Math.min(i, SERVICE_SHADES.length - 1)]}%, var(--card))`,
          }))
        : [];
    const hovered = hover ? cats.find((c) => c.key === hover) || null : null;
    const focusKey = drilled ? drilled.key : hovered ? hovered.key : null;

    // Turn the drilled wedge to face the detail panel (3 o'clock), by the shortest way round.
    let rotation = 0;
    if (drilled) {
        rotation = 90 - drilled.mid;
        while (rotation > 180) rotation -= 360;
        while (rotation <= -180) rotation += 360;
    }

    useLayoutEffect(() => {
        const prev = lastDrill.current;
        lastDrill.current = drill;
        if (prev === drill || !panelRef.current || !Motion || prefersReducedMotion()) return undefined;
        const dir = drill ? 1 : -1;
        const a = Motion.animate(
            panelRef.current,
            { transform: [`translateX(${dir * 100}%)`, 'translateX(0%)'] },
            { duration: 0.24, ease: EASE_OUT }
        );
        return () => a && a.stop && a.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drill, Motion]);

    const open = (key: string) => {
        setHover(null);
        setHoverService(null);
        setDrill(drill === key ? null : key);
    };
    const back = () => {
        setHoverService(null);
        setDrill(null);
    };

    const aria = `Budget use by category, ${p.label.toLowerCase()}: ${cats
        .map(
            (c) =>
                `${c.label} ${Math.round(c.use * 100)}%${c.status === 'over' ? ', over budget' : c.status === 'risk' ? ', at risk' : ''}`
        )
        .join('; ')}`;
    const summary = `${title}, ${p.label.toLowerCase()}: ${usd(spent)} of ${usd(budget)} budget (${Math.round((spent / budget) * 100)}% used, ${usd(budget - spent)} left), ${p.change >= 0 ? '+' : ''}${p.change.toFixed(1)}% vs the period before. ${aria}.`;
    const tableRows = cats.map((c) => ({
        label: c.label,
        spent: c.spent,
        budget: c.budget,
        left: Math.round(c.left * 10) / 10,
        use: Math.round(c.use * 100),
    }));
    const csv = {
        filename: `cloud-spend-${period}.csv`,
        rows: tableRows,
        columns: [
            { key: 'label', label: 'Category' },
            { key: 'spent', label: 'Spent (USD K)' },
            { key: 'budget', label: 'Budget (USD K)' },
            { key: 'left', label: 'Left (USD K)' },
            { key: 'use', label: 'Budget use (%)' },
        ],
    };

    // Centre readout.
    const service = drilled && hoverService != null ? services[hoverService] : null;
    let centre: { label: string; big: string; unit: string; note: string };
    if (service) {
        const [v, u] = usdParts(service.spent);
        centre = { label: service.label, big: v, unit: u, note: `${service.share.toFixed(1)}% share` };
    } else {
        const c = hovered || drilled;
        if (c)
            centre = {
                label: c.label,
                big: String(Math.round(c.use * 100)),
                unit: '%',
                note: c.left < 0 ? `${usd(-c.left)} over` : `${usd(c.left)} left`,
            };
        else
            centre = {
                label: 'Budget Use',
                big: String(Math.round((spent / budget) * 100)),
                unit: '%',
                note: `${usd(budget - spent)} left`,
            };
    }

    const head = drilled || null;
    const headSpent = head ? head.spent : spent;
    const headBudget = head ? head.budget : budget;
    const headChange = head ? head.change : p.change;
    const headUse = headBudget ? headSpent / headBudget : 0;

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container/c54 w-full min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-60 flex-col gap-px">
                        <FrameTitle role="heading" aria-level={3} className="truncate">
                            {title}
                        </FrameTitle>
                        <FrameDescription className="truncate">
                            {drilled ? `${drilled.label} cost by service` : description}
                        </FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ToolbarSelect
                            label="Period"
                            className="h-8 w-44 justify-start gap-1.5 ps-2.5 pe-2 text-sm font-normal [&>svg:first-child]:text-muted-foreground [&>svg:last-child]:ms-auto"
                            value={period}
                            onValueChange={(v: string) => {
                                setPeriod(v);
                                setHover(null);
                                setHoverService(null);
                            }}
                            options={keys.map((k) => ({
                                value: k,
                                label: periods[k].label,
                            }))}
                        />
                        <ToolbarGroup aria-label="Chart menus">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="bg-background"
                                            aria-label="Sort categories"
                                            title="Sort categories"
                                        />
                                    }
                                >
                                    <Icon name="settings-2" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-48">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Sort Categories By</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={sort} onValueChange={(v: any) => setSort(v)}>
                                            <DropdownMenuRadioItem value="use">
                                                <Icon name="wallet" />
                                                Budget Use
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="headroom">
                                                <Icon name="target" />
                                                Headroom
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="cost">
                                                <Icon name="circle-dollar-sign" />
                                                Cost
                                            </DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                                        label: 'Reset View',
                                        icon: <Icon name="rotate-ccw" />,
                                        onSelect: () => {
                                            setPeriod(firstPeriod);
                                            setSort('use');
                                            setDrill(null);
                                            setHover(null);
                                            setHoverService(null);
                                            setView('chart');
                                        },
                                    },
                                ]}
                            />
                        </ToolbarGroup>
                    </div>
                </FrameHeader>
                <ChartFigure
                    title={title}
                    summary={summary}
                    view={view}
                    table={
                        <ChartDataTable
                            data={tableRows}
                            index="label"
                            indexLabel="Category"
                            series={[
                                { key: 'spent', label: 'Spent' },
                                { key: 'budget', label: 'Budget' },
                                { key: 'left', label: 'Left' },
                                { key: 'use', label: 'Budget use' },
                            ]}
                            valueFormatter={(v: number, ctx: any) => (ctx && ctx.dataKey === 'use' ? `${v}%` : usd(v))}
                            caption={aria}
                        />
                    }
                >
                    <div className="grid gap-0.75 @2xl/c54:grid-cols-[minmax(0,4fr)_minmax(0,3fr)]">
                        <FramePanel className="aspect-square @2xl/c54:aspect-auto">
                            <div className="absolute inset-0 flex items-center justify-center p-(--frame-panel-py)">
                                <div className="relative aspect-square h-full max-w-full">
                                    <div
                                        className="@container absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                    >
                                        <svg
                                            viewBox="0 0 400 400"
                                            role="img"
                                            aria-label={aria}
                                            className="size-full overflow-visible"
                                        >
                                            <defs>
                                                {cats.map((c) => (
                                                    <radialGradient
                                                        key={c.key}
                                                        id={`${uid}-tone-${c.key}`}
                                                        gradientUnits="userSpaceOnUse"
                                                        cx={C}
                                                        cy={C}
                                                        r={BAND_MAX}
                                                    >
                                                        <stop
                                                            offset={R_IN / BAND_MAX}
                                                            style={{
                                                                stopColor: `var(--color-${c.key})`,
                                                                stopOpacity: 0.5,
                                                            }}
                                                        />
                                                        <stop
                                                            offset={R_BUDGET / BAND_MAX}
                                                            style={{
                                                                stopColor: `var(--color-${c.key})`,
                                                                stopOpacity: 0.92,
                                                            }}
                                                        />
                                                    </radialGradient>
                                                ))}
                                                <pattern
                                                    id={`${uid}-over`}
                                                    width="6"
                                                    height="6"
                                                    patternUnits="userSpaceOnUse"
                                                    patternTransform="rotate(45)"
                                                >
                                                    <rect width="6" height="6" fill="var(--destructive)" />
                                                    <rect width="2.5" height="6" fill="var(--card)" fillOpacity="0.3" />
                                                </pattern>
                                            </defs>
                                            <circle
                                                cx={C}
                                                cy={C}
                                                r={73}
                                                fill="none"
                                                stroke="var(--border)"
                                                strokeOpacity={0.6}
                                                strokeWidth={1}
                                            />
                                            {cats.map((c) => {
                                                const on = focusKey === c.key;
                                                const dim = !!focusKey && !on;
                                                const out = drilled && on ? pt(7, c.mid) : null;
                                                return (
                                                    <g
                                                        key={c.key}
                                                        role="button"
                                                        tabIndex={-1}
                                                        aria-label={`Open ${c.label}`}
                                                        onMouseEnter={() => !drilled && setHover(c.key)}
                                                        onMouseLeave={() => setHover(null)}
                                                        onClick={() => open(c.key)}
                                                        className={`cursor-pointer transition-[translate,scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity ${on && !drilled ? 'motion-safe:scale-[1.03]' : ''} ${dim ? 'opacity-35' : ''}`}
                                                        style={{
                                                            transformOrigin: `${C}px ${C}px`,
                                                            translate: out
                                                                ? `${r2(out[0] - C)}px ${r2(out[1] - C)}px`
                                                                : '0px',
                                                        }}
                                                    >
                                                        <path
                                                            d={sector(R_IN, R_BUDGET, c.a0, c.a1)}
                                                            fill="var(--muted)"
                                                            fillOpacity={0.7}
                                                        />
                                                        <path
                                                            fill={`url(#${uid}-tone-${c.key})`}
                                                            d={sector(R_IN, c.rUse, c.a0, c.a1)}
                                                        />
                                                        <path
                                                            fill={`url(#${uid}-over)`}
                                                            d={
                                                                c.bandOut > BAND_IN
                                                                    ? sector(BAND_IN, c.bandOut, c.a0, c.a1)
                                                                    : ''
                                                            }
                                                        />
                                                        {c.status === 'risk' ? (
                                                            <path
                                                                fill="none"
                                                                stroke="var(--warning)"
                                                                strokeWidth={3}
                                                                strokeLinecap="round"
                                                                d={arc(c.rUse + 5, c.a0 + 1.5, c.a1 - 1.5)}
                                                            />
                                                        ) : null}
                                                    </g>
                                                );
                                            })}
                                            <circle
                                                cx={C}
                                                cy={C}
                                                r={R_BUDGET}
                                                fill="none"
                                                stroke="var(--foreground)"
                                                strokeOpacity={0.18}
                                                strokeWidth={1}
                                                strokeDasharray="2.5 3.5"
                                                className="pointer-events-none"
                                            />
                                        </svg>
                                        {cats.map((c) => {
                                            const [x, y] = pt(c.labelR, c.mid);
                                            const dim = !!focusKey && focusKey !== c.key;
                                            const tone = dim
                                                ? 'text-muted-foreground opacity-35'
                                                : c.status === 'over'
                                                  ? 'text-destructive'
                                                  : c.status === 'risk'
                                                    ? 'text-warning-foreground dark:text-warning'
                                                    : 'text-muted-foreground';
                                            return (
                                                <span
                                                    key={c.key}
                                                    aria-hidden="true"
                                                    className={`absolute top-1/2 left-1/2 text-xs font-medium tabular-nums transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${tone}`}
                                                    style={{
                                                        transform: `translate(${r2((x - C) / 4)}cqw, ${r2((y - C) / 4)}cqw) translate(-50%, -50%) rotate(${-rotation}deg)`,
                                                    }}
                                                >
                                                    {Math.round(c.use * 100)}%
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                                    >
                                        <span className="max-w-28 truncate text-xs font-medium text-muted-foreground @max-md/c54:max-w-20">
                                            {centre.label}
                                        </span>
                                        <span className="mt-2 mb-2.5 @max-md/c54:my-1">
                                            <span className="flex items-baseline justify-center leading-none">
                                                <span className="text-4xl font-semibold tracking-tighter tabular-nums @max-md/c54:text-2xl">
                                                    {centre.big}
                                                </span>
                                                <span className="ms-0.5 text-lg font-medium text-muted-foreground @max-md/c54:text-sm">
                                                    {centre.unit}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="mb-2 h-px w-8 bg-border @max-md/c54:hidden" />
                                        <span className="max-w-28 truncate text-xs text-muted-foreground tabular-nums @max-md/c54:max-w-20">
                                            <span className={TEXT_TRIM}>{centre.note}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </FramePanel>
                        <FramePanel className="grid overflow-hidden p-0!">
                            <div
                                ref={panelRef}
                                className="col-start-1 row-start-1 min-w-0 px-(--frame-panel-px) py-(--frame-panel-py)"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex h-8 items-center justify-between gap-3">
                                            {head ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="-ms-2.5"
                                                    aria-label={`${head.label}, back to all categories`}
                                                    onClick={back}
                                                >
                                                    <Icon name="chevron-left" />
                                                    <span className={TEXT_TRIM}>{head.label}</span>
                                                </Button>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    <span className={TEXT_TRIM}>Total Spend</span>
                                                </span>
                                            )}
                                            <span className="inline-flex h-5 items-center justify-end gap-1 text-foreground tabular-nums [&_svg]:size-3.5">
                                                <Icon name={headChange < 0 ? 'trending-down' : 'trending-up'} />
                                                <span className="sr-only">{headChange < 0 ? 'Down' : 'Up'}</span>
                                                <span className={TEXT_TRIM}>
                                                    {headChange >= 0 ? '+' : ''}
                                                    {headChange.toFixed(1)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
                                                {usd(headSpent)}
                                            </span>
                                            <span className="text-sm text-muted-foreground tabular-nums">
                                                of {usd(headBudget)} budget
                                            </span>
                                        </div>
                                        <div
                                            role="img"
                                            aria-label={`${usd(headSpent)} of ${usd(headBudget)} budget`}
                                            className="relative flex h-4 items-center"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="absolute inset-x-0 h-1.5 rounded-full bg-border"
                                            />
                                            <span
                                                aria-hidden="true"
                                                className={`absolute start-0 h-1.5 rounded-s-full ${headUse > 1 ? 'bg-destructive/70' : 'bg-muted-foreground/40'}`}
                                                style={{ width: `${Math.min(100, headUse * 100)}%` }}
                                            />
                                            <span
                                                aria-hidden="true"
                                                className="absolute h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
                                                style={{ left: '100%' }}
                                            />
                                        </div>
                                        <div className="flex h-4 items-center justify-between gap-3 text-xs text-muted-foreground">
                                            <span className={`tabular-nums ${TEXT_TRIM}`}>
                                                <span className="font-medium text-foreground">
                                                    {Math.round(headUse * 100)}%
                                                </span>{' '}
                                                used
                                            </span>
                                            <span className={`text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                                                {headBudget - headSpent < 0
                                                    ? `${usd(headSpent - headBudget)} over`
                                                    : `${usd(headBudget - headSpent)} left`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="-mx-2.5 flex h-8 items-center gap-3 px-2.5 text-xs text-muted-foreground">
                                            <span className={`flex-1 ${TEXT_TRIM}`}>
                                                {drilled ? 'Service' : 'Category'}
                                            </span>
                                            <span className={`w-16 shrink-0 text-end tabular-nums ${TEXT_TRIM}`}>
                                                Spent
                                            </span>
                                            <span
                                                className={`w-16 shrink-0 text-end tabular-nums @max-md/c54:hidden ${TEXT_TRIM}`}
                                            >
                                                {drilled ? 'Share' : 'Left'}
                                            </span>
                                            <span aria-hidden="true" className="w-4 shrink-0" />
                                        </div>
                                        <div className="-mx-2.5 flex min-h-60 flex-col">
                                            {drilled
                                                ? services.map((s, i) => (
                                                      <div
                                                          key={s.key}
                                                          data-focus={hoverService === i ? '' : undefined}
                                                          onMouseEnter={() => setHoverService(i)}
                                                          onMouseLeave={() => setHoverService(null)}
                                                          className="flex h-10 w-full items-center gap-3 rounded-md px-2.5 transition-colors duration-100 data-focus:bg-muted/50"
                                                      >
                                                          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                                                              <span
                                                                  aria-hidden="true"
                                                                  className="size-2.5 shrink-0 rounded-full"
                                                                  style={{ background: s.color }}
                                                              />
                                                              <span
                                                                  className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                              >
                                                                  {s.label}
                                                              </span>
                                                          </span>
                                                          <span
                                                              className={`w-16 shrink-0 text-end text-sm font-medium tabular-nums ${TEXT_TRIM}`}
                                                          >
                                                              {usd(s.spent)}
                                                          </span>
                                                          <span
                                                              className={`w-16 shrink-0 text-end text-sm text-muted-foreground tabular-nums @max-md/c54:hidden ${TEXT_TRIM}`}
                                                          >
                                                              {s.share.toFixed(1)}%
                                                          </span>
                                                          <span aria-hidden="true" className="w-4 shrink-0" />
                                                      </div>
                                                  ))
                                                : sorted.map((c) => (
                                                      <button
                                                          key={c.key}
                                                          type="button"
                                                          data-focus={hover === c.key ? '' : undefined}
                                                          onMouseEnter={() => setHover(c.key)}
                                                          onMouseLeave={() => setHover(null)}
                                                          onFocus={() => setHover(c.key)}
                                                          onBlur={() => setHover(null)}
                                                          onClick={() => open(c.key)}
                                                          className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-2.5 text-left transition-colors duration-100 outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 data-focus:bg-muted/50"
                                                      >
                                                          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                                                              <span
                                                                  aria-hidden="true"
                                                                  className="size-2.5 shrink-0 rounded-full"
                                                                  style={{ background: `var(--color-${c.key})` }}
                                                              />
                                                              <span
                                                                  className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                              >
                                                                  <span className="sr-only">Open </span>
                                                                  {c.label}
                                                              </span>
                                                              {c.status === 'over' ? (
                                                                  <span
                                                                      data-slot="badge"
                                                                      className={`${TINY_BADGE} ${OVER_BADGE}`}
                                                                  >
                                                                      <span className={TEXT_TRIM}>Over</span>
                                                                  </span>
                                                              ) : c.status === 'risk' ? (
                                                                  <span
                                                                      data-slot="badge"
                                                                      className={`${TINY_BADGE} ${RISK_BADGE}`}
                                                                  >
                                                                      <span className={TEXT_TRIM}>At Risk</span>
                                                                  </span>
                                                              ) : null}
                                                          </span>
                                                          <span
                                                              className={`w-16 shrink-0 text-end text-sm font-medium tabular-nums ${TEXT_TRIM}`}
                                                          >
                                                              {usd(c.spent)}
                                                          </span>
                                                          <span
                                                              className={`w-16 shrink-0 text-end text-sm tabular-nums @max-md/c54:hidden ${c.left < 0 ? 'text-destructive' : 'text-muted-foreground'} ${TEXT_TRIM}`}
                                                          >
                                                              {usd(c.left)}
                                                          </span>
                                                          <span
                                                              aria-hidden="true"
                                                              className="flex w-4 shrink-0 text-muted-foreground/70 [&_svg]:size-4"
                                                          >
                                                              <Icon name="chevron-right" />
                                                          </span>
                                                      </button>
                                                  ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FramePanel>
                    </div>
                </ChartFigure>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center tabular-nums">
                        <span className={TEXT_TRIM}>{p.dates}</span>
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <svg aria-hidden="true" viewBox="0 0 12 4" className="h-1 w-3 shrink-0">
                            <path d="M0 2h12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2" />
                        </svg>
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>Budget</span>
                        </span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span aria-hidden="true" className="h-1.5 w-3 shrink-0 rounded-full bg-warning" />
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>At Risk</span>
                        </span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span aria-hidden="true" className="h-1.5 w-3 shrink-0 rounded-full bg-destructive" />
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>Over Budget</span>
                        </span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default CloudSpend;
