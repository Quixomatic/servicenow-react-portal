import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable, prefersReducedMotion } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    ChartMoreMenu,
} from 'components:chart-frame';
import { Toggle, ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { series, SeriesScope, useMotion, EASE_OUT } from 'components:charts/chart-kit';
import { BROWSERS, ENGINES, VERSIONS, RANGES, SUPPORT_LINES } from './data';
import type { Browser, Version, RangeData } from './data';

/**
 * components:charts/browser-usage: a hatched donut of visitors by browser with an optional outer ring for
 * the previous period, a breakdown table (visitors, share bar, change in points) that hovers in sync with
 * the ring, a 7D / 30D / 90D switch, a Display menu (view by browser or rendering engine, support line,
 * show "Other") and a drill-down into each browser's versions, flagging versions under the support line.
 *
 *   <BrowserUsage />                                         sample data
 *   <BrowserUsage ranges={{ '30d': { label, span, previous, dates, visitors, prior, change } }} browsers={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type BrowserUsageProps = {
    title?: string;
    browsers?: Browser[];
    engines?: { key: string; label: string; color: string }[];
    versions?: Record<string, Version[]>;
    ranges?: Record<string, RangeData>;
    defaultRange?: string;
    supportLines?: number[];
    defaultSupportLine?: number;
    className?: string;
};

type Row = {
    key: string;
    label: string;
    short?: string;
    color: string;
    visitors: number;
    share: number;
    change: number | null;
    prior: number;
    ofAll?: number;
    under?: boolean;
    drill?: boolean;
};

const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';
const EDGE_PAD = 'first:ps-(--frame-panel-px) last:pe-(--frame-panel-px)';
const TH = 'h-10 px-2 align-middle font-medium whitespace-nowrap text-muted-foreground';
const TD = 'p-2 align-middle whitespace-nowrap';
const BADGE =
    'relative inline-flex h-5 min-w-5 w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3';
const UP =
    'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success';
const DOWN =
    'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive';
const WARN =
    'border-warning/20 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning';
const FRAME_OUTLINE = 'gap-1 data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted';
const SHADES = [100, 72, 48, 28, 18, 12];

const pct1 = (v: number) => `${v.toFixed(1)}%`;
const num = (v: number) => Math.round(v).toLocaleString('en-US');
const pts = (v: number) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(1)} pts`;
const lineLabel = (v: number) => `${v}%`;
/** 205400 → "205.4K", 1240000 → "1.2M" (one decimal, as the centre readout shows). */
const kilo = (v: number) =>
    v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(Math.round(v));

export function BrowserUsage({
    title = 'Browser Usage',
    browsers = BROWSERS,
    engines = ENGINES,
    versions = VERSIONS,
    ranges = RANGES,
    defaultRange = '30d',
    supportLines = SUPPORT_LINES,
    defaultSupportLine = 1,
    className,
}: BrowserUsageProps) {
    const keys = Object.keys(ranges);
    const firstRange = keys.indexOf(defaultRange) >= 0 ? defaultRange : keys[0];
    const [range, setRange] = useState(firstRange);
    const [compare, setCompare] = useState(false);
    const [by, setBy] = useState<'browser' | 'engine'>('browser');
    const [line, setLine] = useState(defaultSupportLine);
    const [showOther, setShowOther] = useState(true);
    const [drill, setDrill] = useState<string | null>(null);
    const [active, setActive] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const chartRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const lastDrill = useRef<string | null>(null);
    const Motion = useMotion();
    const r = ranges[range];
    const config = useMemo(() => {
        const cfg: Record<string, any> = {};
        engines.forEach((e) => {
            cfg[e.key] = series(e.color, e.color, e.label);
        });
        browsers.forEach((b) => {
            cfg[b.key] = series(b.color, b.color, b.label);
        });
        return cfg;
    }, [browsers, engines]);

    // Browser (or engine) rows: share of the shown total, change in points vs the previous period's share.
    const mainRows: Row[] = useMemo(() => {
        const list = browsers.filter((b) => showOther || !b.other);
        const total = list.reduce((a, b) => a + (r.visitors[b.key] || 0), 0) || 1;
        // Prior shares are % of the full previous period; hiding "Other" re-bases them on the rest.
        const priorTotal =
            100 - browsers.filter((b) => !list.includes(b)).reduce((a, b) => a + (r.prior[b.key] || 0), 0) || 1;
        if (by === 'engine') {
            return engines
                .map((e) => {
                    const members = list.filter((b) => b.engine === e.key);
                    const v = members.reduce((a, b) => a + (r.visitors[b.key] || 0), 0);
                    const p = members.reduce((a, b) => a + (r.prior[b.key] || 0), 0);
                    const share = (v / total) * 100;
                    const prior = (p / priorTotal) * 100;
                    return {
                        key: e.key,
                        label: e.label,
                        color: `var(--color-${e.key})`,
                        visitors: v,
                        share,
                        prior,
                        change: share - prior,
                    };
                })
                .filter((x) => x.visitors > 0);
        }
        return list.map((b) => {
            const v = r.visitors[b.key] || 0;
            const share = (v / total) * 100;
            const prior = ((r.prior[b.key] || 0) / priorTotal) * 100;
            return {
                key: b.key,
                label: b.label,
                short: b.short,
                color: `var(--color-${b.key})`,
                visitors: v,
                share,
                prior,
                change: share - prior,
                drill: !b.other && !!(versions[b.key] && versions[b.key].length),
            };
        });
    }, [browsers, engines, versions, r, by, showOther]);

    const allVisitors = browsers.reduce((a, b) => a + (r.visitors[b.key] || 0), 0);
    const drillBrowser = drill ? browsers.find((b) => b.key === drill) || null : null;
    const versionRows: Row[] = useMemo(() => {
        if (!drillBrowser) return [];
        const list = (r.versions && r.versions[drillBrowser.key]) || versions[drillBrowser.key] || [];
        const total = r.visitors[drillBrowser.key] || 0;
        let used = 0;
        return list.map((v, i) => {
            const count = i === list.length - 1 ? total - used : Math.round((total * v.share) / 100);
            used += count;
            const ofAll = allVisitors ? (count / allVisitors) * 100 : 0;
            return {
                key: `${drillBrowser.key}-${i}`,
                label: v.label,
                color: `color-mix(in oklab, var(--color-${drillBrowser.key}) ${SHADES[Math.min(i, SHADES.length - 1)]}%, var(--card))`,
                visitors: count,
                share: total ? (count / total) * 100 : 0,
                prior: 0,
                change: null,
                ofAll,
                under: ofAll < line,
            };
        });
    }, [drillBrowser, r, versions, allVisitors, line]);

    const rows = drillBrowser ? versionRows : mainRows;
    const total = rows.reduce((a, x) => a + x.visitors, 0);
    const activeRow = rows.find((x) => x.key === active) || null;
    const padRows = Math.max(0, mainRows.length - rows.length);

    // Drill in / out: the ring scales in from 0.9, the table slides in from the side it came from.
    useLayoutEffect(() => {
        const prev = lastDrill.current;
        lastDrill.current = drill;
        if (prev === drill || !Motion || prefersReducedMotion()) return undefined;
        const dir = drill ? 1 : -1;
        const c: any[] = [];
        if (chartRef.current)
            c.push(
                Motion.animate(
                    chartRef.current,
                    { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] },
                    { duration: 0.2, ease: EASE_OUT }
                )
            );
        if (tableRef.current)
            c.push(
                Motion.animate(
                    tableRef.current,
                    { transform: [`translateX(${dir * 100}%)`, 'translateX(0%)'] },
                    { duration: 0.22, ease: EASE_OUT }
                )
            );
        return () => c.forEach((x) => x && x.stop && x.stop());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drill, Motion]);

    const openBrowser = (key: string) => {
        setActive(null);
        setCompare(false);
        setDrill(key);
    };
    const back = () => {
        setActive(null);
        setDrill(null);
    };
    const reset = () => {
        setRange(firstRange);
        setCompare(false);
        setBy('browser');
        setLine(defaultSupportLine);
        setShowOther(true);
        setDrill(null);
        setActive(null);
        setView('chart');
    };

    const noun = by === 'engine' ? 'engine' : 'browser';
    const description = drillBrowser
        ? `${drillBrowser.label} visitors by version`
        : by === 'engine'
          ? 'Unique visitors by rendering engine'
          : 'Unique visitors by browser';
    const aria = drillBrowser
        ? `${drillBrowser.label} visitors by version, ${r.span}: ${rows.map((x) => `${x.label} ${pct1(x.share)}`).join(', ')}`
        : `Visitors by ${noun}, ${r.span}: ${rows.map((x) => `${x.label} ${pct1(x.share)}`).join(', ')}`;
    const caption = drillBrowser
        ? `Version breakdown, ${r.span}`
        : `${by === 'engine' ? 'Engine' : 'Browser'} breakdown, ${r.span}`;
    const summary = `${title}, ${r.span}: ${num(allVisitors)} visitors, ${r.change >= 0 ? '+' : ''}${r.change.toFixed(1)}% vs before. ${aria}.`;
    const csv = {
        filename: `browser-usage-${drill || by}-${range}.csv`,
        rows,
        columns: [
            { key: 'label', label: drillBrowser ? 'Version' : by === 'engine' ? 'Engine' : 'Browser' },
            { key: 'visitors', label: 'Visitors' },
            { key: 'share', label: 'Share (%)', value: (x: Row) => x.share.toFixed(1) },
            drillBrowser
                ? { key: 'ofAll', label: 'Of all (%)', value: (x: Row) => (x.ofAll || 0).toFixed(1) }
                : { key: 'change', label: 'Change (pts)', value: (x: Row) => (x.change || 0).toFixed(1) },
        ],
    };

    const patternId = (i: number) => `${uid}-p-${i}`;
    const rangeToggle = useSingleToggle(range, (v: string) => {
        setRange(v);
        setActive(null);
    });

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container/bu w-full min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
                        <span
                            data-slot="icon-tile"
                            className="relative isolate inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 p-0.75 align-middle after:absolute after:inset-0.75 after:-z-10 after:rounded-[calc(var(--radius-md)-3px)] after:border after:border-border after:bg-card after:shadow-xs [&_svg]:pointer-events-none [&_svg]:size-4.5 [&_svg]:shrink-0"
                        >
                            <Icon name="globe" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-px">
                            <FrameTitle role="heading" className="truncate">
                                {title}
                            </FrameTitle>
                            <FrameDescription className="truncate">{description}</FrameDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ToggleGroup variant="outline" aria-label="Range" {...rangeToggle}>
                            {keys.map((k) => (
                                <ToggleGroupItem key={k} value={k} className={`px-2 ${FRAME_OUTLINE}`}>
                                    <span className={TEXT_TRIM}>{ranges[k].label}</span>
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <Toggle
                            variant="outline"
                            pressed={compare}
                            disabled={!!drillBrowser}
                            onPressedChange={(p: boolean) => setCompare(p)}
                            className={`shadow-none ${FRAME_OUTLINE}`}
                        >
                            <Icon name="history" />
                            <span className={TEXT_TRIM}>Compare</span>
                        </Toggle>
                        <ToolbarGroup aria-label="Chart menus">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="bg-background"
                                            aria-label="Display options"
                                            title="Display options"
                                        />
                                    }
                                >
                                    <Icon name="settings-2" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>View By</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={by}
                                            onValueChange={(v: any) => {
                                                setBy(v);
                                                setDrill(null);
                                                setActive(null);
                                            }}
                                        >
                                            <DropdownMenuRadioItem value="browser">
                                                <Icon name="globe" />
                                                Browser
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="engine">
                                                <Icon name="cpu" />
                                                Engine
                                            </DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Support Line</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={String(line)}
                                            onValueChange={(v: any) => setLine(Number(v))}
                                        >
                                            {supportLines.map((s) => (
                                                <DropdownMenuRadioItem key={s} value={String(s)}>
                                                    <span aria-hidden="true" className="size-4 shrink-0" />
                                                    Under {lineLabel(s)}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Show</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={showOther}
                                            onCheckedChange={(c: boolean) => {
                                                setShowOther(c);
                                                setActive(null);
                                            }}
                                            closeOnClick={false}
                                        >
                                            <Icon name="eye" />
                                            Other Browsers
                                        </DropdownMenuCheckboxItem>
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
                                    { label: 'Reset View', icon: <Icon name="rotate-ccw" />, onSelect: reset },
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
                            data={rows}
                            index="label"
                            indexLabel={drillBrowser ? 'Version' : by === 'engine' ? 'Engine' : 'Browser'}
                            series={[
                                { key: 'visitors', label: 'Visitors' },
                                { key: 'share', label: 'Share' },
                            ]}
                            valueFormatter={(v: number, ctx: any) =>
                                ctx && ctx.dataKey === 'share' ? pct1(v) : num(v)
                            }
                            caption={caption}
                        />
                    }
                >
                    <div className="grid gap-0.75 @2xl/bu:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        <FramePanel className="relative min-h-72 p-0 @2xl/bu:min-h-0">
                            <div className="absolute inset-0 flex items-center justify-center p-(--frame-panel-py)">
                                <div className="relative aspect-square h-full max-h-80 max-w-full">
                                    <div ref={chartRef} className="absolute inset-0">
                                        <ChartContainer
                                            config={config}
                                            className="aspect-auto size-full"
                                            role="img"
                                            aria-label={aria}
                                        >
                                            {(R: any) => (
                                                <R.PieChart>
                                                    <defs>
                                                        {rows.map((x, i) => (
                                                            <pattern
                                                                key={x.key}
                                                                id={patternId(i)}
                                                                width="6"
                                                                height="6"
                                                                patternUnits="userSpaceOnUse"
                                                                patternTransform="rotate(45)"
                                                            >
                                                                <rect width="6" height="6" fill={x.color} />
                                                                <rect
                                                                    width="1.5"
                                                                    height="6"
                                                                    fill="var(--card)"
                                                                    fillOpacity="0.2"
                                                                />
                                                            </pattern>
                                                        ))}
                                                    </defs>
                                                    {compare && !drillBrowser ? (
                                                        <R.Pie
                                                            data={rows}
                                                            dataKey="prior"
                                                            nameKey="label"
                                                            innerRadius="92%"
                                                            outerRadius="96%"
                                                            startAngle={90}
                                                            endAngle={-270}
                                                            paddingAngle={1}
                                                            stroke="none"
                                                            isAnimationActive={false}
                                                            legendType="none"
                                                        >
                                                            {rows.map((x) => (
                                                                <R.Cell key={x.key} fill={x.color} fillOpacity={0.45} />
                                                            ))}
                                                        </R.Pie>
                                                    ) : null}
                                                    <R.Pie
                                                        data={rows}
                                                        dataKey="visitors"
                                                        nameKey="label"
                                                        innerRadius="64%"
                                                        outerRadius="88%"
                                                        startAngle={90}
                                                        endAngle={-270}
                                                        paddingAngle={1}
                                                        cornerRadius={4}
                                                        stroke="var(--card)"
                                                        strokeWidth={2}
                                                        isAnimationActive={false}
                                                        onMouseEnter={(_d: any, i: number) =>
                                                            rows[i] && setActive(rows[i].key)
                                                        }
                                                        onMouseLeave={() => setActive(null)}
                                                        onClick={(_d: any, i: number) =>
                                                            rows[i] && rows[i].drill && openBrowser(rows[i].key)
                                                        }
                                                        shape={(p: any) => {
                                                            const i =
                                                                p.index != null
                                                                    ? p.index
                                                                    : rows.findIndex((x) => x.label === p.name);
                                                            const x = rows[i];
                                                            const on = !!x && x.key === active;
                                                            const dim = !!active && !on;
                                                            return (
                                                                <g
                                                                    className={`transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${on ? 'motion-safe:scale-[1.04]' : ''} ${dim ? 'opacity-30' : ''}`}
                                                                    style={{ transformOrigin: `${p.cx}px ${p.cy}px` }}
                                                                >
                                                                    <R.Sector
                                                                        {...p}
                                                                        fill={`url(#${patternId(i)})`}
                                                                        stroke="var(--card)"
                                                                        strokeWidth={2}
                                                                        fillOpacity={1}
                                                                    />
                                                                </g>
                                                            );
                                                        }}
                                                    >
                                                        {rows.map((x) => (
                                                            <R.Cell key={x.key} fill={x.color} />
                                                        ))}
                                                    </R.Pie>
                                                </R.PieChart>
                                            )}
                                        </ChartContainer>
                                    </div>
                                    <svg
                                        viewBox="0 0 100 100"
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 size-full text-border"
                                    >
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="28.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="0.6"
                                            strokeDasharray="0.6 1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center">
                                        {activeRow ? (
                                            <>
                                                <span className="max-w-36 truncate text-sm text-muted-foreground">
                                                    {drillBrowser
                                                        ? `${drillBrowser.label} ${activeRow.label}`
                                                        : activeRow.label}
                                                </span>
                                                <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                                                    {pct1(activeRow.share)}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {num(activeRow.visitors)} visitors
                                                </span>
                                            </>
                                        ) : drillBrowser ? (
                                            <>
                                                <span className="max-w-36 truncate text-sm text-muted-foreground">
                                                    {drillBrowser.label}
                                                </span>
                                                <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                                                    {kilo(total)}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {rows.length} versions
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="max-w-36 truncate text-sm text-muted-foreground">
                                                    Visitors
                                                </span>
                                                <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                                                    {kilo(total)}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    <span
                                                        className={`font-medium ${r.change >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}`}
                                                    >
                                                        {r.change >= 0 ? '+' : ''}
                                                        {r.change.toFixed(1)}%
                                                    </span>{' '}
                                                    vs before
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </FramePanel>
                        <FramePanel className="relative grid p-0">
                            <div ref={tableRef} className="col-start-1 row-start-1 min-w-0">
                                <div className="relative w-full overflow-x-auto">
                                    <table className="w-full caption-bottom text-sm">
                                        <caption className="sr-only">{caption}</caption>
                                        <thead className="[&_tr]:border-b">
                                            <tr className="border-b">
                                                <th className={`${TH} text-start ${EDGE_PAD}`}>
                                                    {drillBrowser ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ms-1.5"
                                                            aria-label={`${drillBrowser.label} versions, back to all browsers`}
                                                            onClick={back}
                                                        >
                                                            <Icon name="chevron-left" />
                                                            <span className={TEXT_TRIM}>{drillBrowser.label}</span>
                                                        </Button>
                                                    ) : by === 'engine' ? (
                                                        'Engine'
                                                    ) : (
                                                        'Browser'
                                                    )}
                                                </th>
                                                <th className={`${TH} text-end`}>Visitors</th>
                                                <th className={`${TH} w-36 text-start @max-md/bu:hidden`}>Share</th>
                                                <th className={`${TH} text-end`}>
                                                    {drillBrowser ? 'Of All' : 'Change'}
                                                </th>
                                                <th className={`${TH} w-8 text-start ${EDGE_PAD}`}>
                                                    <span className="sr-only">Open</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="[&_tr:last-child]:border-0">
                                            {rows.map((x) => {
                                                const on = x.key === active;
                                                return (
                                                    <tr
                                                        key={x.key}
                                                        data-focus={on ? '' : undefined}
                                                        onMouseEnter={() => setActive(x.key)}
                                                        onMouseLeave={() => setActive(null)}
                                                        onClick={x.drill ? () => openBrowser(x.key) : undefined}
                                                        className={`border-b transition-colors data-focus:bg-muted/50 ${x.drill ? 'cursor-pointer' : ''}`}
                                                    >
                                                        <td className={`${TD} ${EDGE_PAD}`}>
                                                            <span className="flex h-5 min-w-0 items-center gap-2">
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="size-2.5 shrink-0 rounded-full"
                                                                    style={{ background: x.color }}
                                                                />
                                                                <span
                                                                    className={`font-medium ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                                >
                                                                    <span className="@md/bu:hidden">
                                                                        {x.short || x.label}
                                                                    </span>
                                                                    <span className="hidden @md/bu:inline">
                                                                        {x.label}
                                                                    </span>
                                                                </span>
                                                                {x.under ? (
                                                                    <span className={`${BADGE} ${WARN}`}>
                                                                        <span className={TEXT_TRIM}>
                                                                            Under {lineLabel(line)}
                                                                        </span>
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        </td>
                                                        <td className={`${TD} text-end tabular-nums`}>
                                                            {num(x.visitors)}
                                                        </td>
                                                        <td className={`${TD} @max-md/bu:hidden`}>
                                                            <span className="flex h-5 items-center gap-2.5">
                                                                <span
                                                                    role="progressbar"
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={100}
                                                                    aria-valuenow={x.share}
                                                                    aria-label={`${drillBrowser ? `${drillBrowser.label} ` : ''}${x.label}, ${pct1(x.share)}`}
                                                                    className="relative flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted-foreground/15"
                                                                >
                                                                    <span
                                                                        className="h-full rounded-full transition-all"
                                                                        style={{
                                                                            width: `${x.share}%`,
                                                                            background: x.color,
                                                                        }}
                                                                    />
                                                                </span>
                                                                <span
                                                                    className={`w-11 text-end tabular-nums ${TEXT_TRIM}`}
                                                                >
                                                                    {pct1(x.share)}
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td className={`${TD} text-end`}>
                                                            {x.change == null ? (
                                                                <span className="text-muted-foreground tabular-nums">
                                                                    {pct1(x.ofAll || 0)}
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    data-slot="badge"
                                                                    className={`${BADGE} ${x.change < 0 ? DOWN : UP}`}
                                                                >
                                                                    <Icon
                                                                        name={
                                                                            x.change < 0
                                                                                ? 'trending-down'
                                                                                : 'trending-up'
                                                                        }
                                                                    />
                                                                    <span className="sr-only">
                                                                        {x.change < 0 ? 'Down' : 'Up'}
                                                                    </span>
                                                                    <span className={`${TEXT_TRIM} tabular-nums`}>
                                                                        {pts(x.change)}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className={`${TD} ${EDGE_PAD}`}>
                                                            {x.drill ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        render={
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon-xs"
                                                                                aria-label={`Open ${x.label} versions`}
                                                                                onClick={(e: any) => {
                                                                                    e.stopPropagation();
                                                                                    openBrowser(x.key);
                                                                                }}
                                                                            />
                                                                        }
                                                                    >
                                                                        <Icon name="chevron-right" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{x.label} versions</TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span aria-hidden="true" className="block size-6" />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {Array.from({ length: padRows }, (_v, i) => (
                                                <tr key={`pad-${i}`} aria-hidden="true" className="border-b">
                                                    <td colSpan={5} className={`${TD} h-10.25`} />
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t bg-muted/50 font-medium">
                                            <tr>
                                                <td className={`${TD} font-medium ${EDGE_PAD}`}>Total</td>
                                                <td className={`${TD} text-end font-medium tabular-nums`}>
                                                    {num(total)}
                                                </td>
                                                <td className={`${TD} @max-md/bu:hidden`} />
                                                <td className={TD} />
                                                <td className={`${TD} ${EDGE_PAD}`} />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </FramePanel>
                    </div>
                </ChartFigure>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center tabular-nums">
                        <span className={TEXT_TRIM}>{r.dates}</span>
                    </span>
                    <span className="ms-auto flex min-w-0 shrink-0 items-center gap-1.5">
                        <span className="flex h-4 items-center">
                            <span className={TEXT_TRIM}>Support line {lineLabel(line)}</span>
                        </span>
                        {compare && !drillBrowser ? (
                            <>
                                <span
                                    aria-hidden="true"
                                    className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
                                />
                                <span className="flex h-4 items-center">
                                    <span className={TEXT_TRIM}>Outer ring: {r.previous}</span>
                                </span>
                            </>
                        ) : null}
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default BrowserUsage;
