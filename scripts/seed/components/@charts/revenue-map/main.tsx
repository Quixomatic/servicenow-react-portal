import { useId, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ChartToolbar,
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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { TEXT_TRIM, MetaDot } from 'components:charts/composed-kit';
import { REGIONS, SEGMENTS, PERIODS, REVENUE, DOTS, GRID, AS_OF } from './data';
import type { Region, Segment, Period, RevenueCut } from './data';

/**
 * components:charts/revenue-map: revenue by sales region on a dotted world map (plain SVG): each region's dots
 * shaded by its share of revenue, with a summary that follows the hovered / pinned region, the top three hot
 * spots (click to pin), revenue per paying account, segment and period selects, CSV / copy exports.
 *
 *   <RevenueMap />                                                                sample data
 *   <RevenueMap regions={[{ key, label }]} dots={{ [key]: 'y:x1-x2 ..', none: '..' }}
 *       revenue={{ [segment]: { [period]: { month, regions: [[revenue, sharePct, accounts], ..] } } }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type RevenueMapProps = {
    title?: string;
    regions?: Region[];
    segments?: Segment[];
    periods?: Period[];
    revenue?: Record<string, Record<string, RevenueCut>>;
    dots?: Record<string, string>;
    grid?: { width: number; height: number };
    asOf?: string;
    defaultSegment?: string;
    defaultPeriod?: string;
    className?: string;
};

type RegionRow = { key: string; label: string; revenue: number; share: number; accounts: number; index: number };

/** Share buckets: [max rounded %, stroke classes, bg classes, label]. */
const BUCKETS: [number, string, string, string][] = [
    [2, 'stroke-teal-500', 'bg-teal-500', '<2%'],
    [4, 'stroke-sky-500', 'bg-sky-500', '2%-4%'],
    [8, 'stroke-violet-600 dark:stroke-violet-500', 'bg-violet-600 dark:bg-violet-500', '4%-8%'],
    [12, 'stroke-fuchsia-600 dark:stroke-fuchsia-400', 'bg-fuchsia-600 dark:bg-fuchsia-400', '8%-12%'],
    [25, 'stroke-rose-600 dark:stroke-rose-500', 'bg-rose-600 dark:bg-rose-500', '12%-25%'],
    [Infinity, 'stroke-amber-500 dark:stroke-amber-400', 'bg-amber-500 dark:bg-amber-400', '25%+'],
];
const NONE_STROKE = 'stroke-muted-foreground/30 dark:stroke-muted-foreground/35';
const DOT_W = '[stroke-width:0.55] @max-3xl/c56:[stroke-width:0.7] @max-lg/c56:[stroke-width:1.05]';
const bucket = (share: number) => BUCKETS.find((b) => share < b[0]) || BUCKETS[BUCKETS.length - 1];

/** $2.24M / $922K / $6.10K / $0 (three significant digits). */
function usd3(n: number) {
    const a = Math.abs(n);
    if (!a) return '$0';
    if (a >= 1e9) return `$${(a / 1e9).toPrecision(3)}B`;
    if (a >= 1e6) return `$${(a / 1e6).toPrecision(3)}M`;
    if (a >= 1e3) return `$${(a / 1e3).toPrecision(3)}K`;
    return `$${Math.round(a)}`;
}
const whole = (n: number) => Math.round(n).toLocaleString('en-US');
const sharePct = (s: number) => (s ? `${s}%` : '<1%');

/** Run-length rows ("y:x1-x2,x3 y:..") to a path of zero-length segments, one per dot. */
function dotsPath(rle: string) {
    let d = '';
    (rle || '')
        .split(' ')
        .filter(Boolean)
        .forEach((row) => {
            const [y, runs] = row.split(':');
            runs.split(',').forEach((run) => {
                const [a, b] = run.split('-').map(Number);
                const end = b == null || isNaN(b) ? a : b;
                for (let x = a; x <= end; x++) d += `M${x} ${y}h0`;
            });
        });
    return d;
}

function SelectMenu({
    label,
    value,
    options,
    onValueChange,
    className = '',
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (v: string) => void;
    className?: string;
}) {
    const current = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-label={label}
                        className={`h-8 justify-between bg-background px-2.5 text-sm font-normal ${className}`}
                    />
                }
            >
                <span className={TEXT_TRIM}>{current ? current.label : ''}</span>
                <Icon name="chevron-down" className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
                <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                    {options.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Line({ label, value, strong, border }: { label: string; value: string; strong?: boolean; border?: boolean }) {
    return (
        <span className={`flex h-8 items-center gap-2 ${border ? 'border-t border-border' : ''}`}>
            <span
                className={`${TEXT_TRIM} min-w-0 flex-1 overflow-x-clip text-sm text-ellipsis whitespace-nowrap text-muted-foreground`}
            >
                {label}
            </span>
            <span
                className={`${TEXT_TRIM} text-end text-sm text-foreground tabular-nums ${strong ? 'font-semibold' : 'font-medium'}`}
            >
                {value}
            </span>
        </span>
    );
}

export function RevenueMap({
    title = 'Revenue Map',
    regions = REGIONS,
    segments = SEGMENTS,
    periods = PERIODS,
    revenue = REVENUE,
    dots = DOTS,
    grid = GRID,
    asOf = AS_OF,
    defaultSegment = 'all',
    defaultPeriod = 'q3',
    className = '',
}: RevenueMapProps) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const [segment, setSegment] = useState(defaultSegment);
    const [period, setPeriod] = useState(defaultPeriod);
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const [focusIdx, setFocusIdx] = useState(0);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const regionRefs = useRef<(SVGGElement | null)[]>([]);

    const seg = segments.find((s) => s.value === segment) || segments[0];
    const per = periods.find((p) => p.value === period) || periods[0];
    const cutOf = (s: string, p: string): RevenueCut | null => (revenue[s] && revenue[s][p]) || null;
    const cut = cutOf(seg.value, per.value);

    const paths = useMemo(() => {
        const out: Record<string, string> = {};
        Object.keys(dots).forEach((k) => {
            out[k] = dotsPath(dots[k]);
        });
        return out;
    }, [dots]);

    const rows: RegionRow[] = regions.map((r, i) => {
        const v = cut && cut.regions[i] ? cut.regions[i] : [0, 0, 0];
        return { key: r.key, label: r.label, revenue: v[0], share: v[1], accounts: v[2], index: i };
    });
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    const accounts = rows.reduce((s, r) => s + r.accounts, 0);
    const month = cut ? cut.month : 0;
    const hot = rows
        .filter((r) => r.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
    const shown = hover || pinned;
    const focus = shown ? rows.find((r) => r.key === shown) || null : null;

    // The nearest period with revenue, for the empty state.
    const pIdx = periods.findIndex((p) => p.value === per.value);
    const order = periods
        .map((p, i) => ({ p, d: i < pIdx ? pIdx - i : i > pIdx ? i - pIdx + 0.5 : 99 }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.p);
    const fallback = order.find((p) => {
        const c = cutOf(seg.value, p.value);
        return p.value !== per.value && c && c.regions.some((r) => r[0] > 0);
    });

    const pin = (k: string) => setPinned((cur) => (cur === k ? null : k));
    const onRegionKey = (e: any, i: number) => {
        const step =
            e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (step) {
            e.preventDefault();
            const next = (i + step + regions.length) % regions.length;
            setFocusIdx(next);
            const el = regionRefs.current[next];
            if (el) el.focus();
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pin(regions[i].key);
        }
        if (e.key === 'Escape') setPinned(null);
    };
    const reset = () => {
        setSegment(defaultSegment);
        setPeriod(defaultPeriod);
        setPinned(null);
        setHover(null);
        setView('chart');
    };

    const mapLabel = `Revenue by region, ${seg.label}, ${per.label}`;
    const summary =
        `${mapLabel}: ${usd3(total)} from ${whole(accounts)} paying accounts` +
        (hot.length
            ? `. Hot spots: ${hot.map((r) => `${r.label} ${usd3(r.revenue)} (${sharePct(r.share)})`).join(', ')}.`
            : '. No revenue in this period.') +
        (accounts
            ? ` ${per.month} revenue ${'$' + whole(month)}, ${'$' + whole(month / accounts)} per account a month.`
            : '');
    const csvColumns = [
        { key: 'label', label: 'Region' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'share', label: 'Share of revenue %' },
        { key: 'accounts', label: 'Paying accounts' },
    ];

    const map = (
        <div className="relative flex flex-col gap-4">
            <div className="@min-[50rem]/c56:absolute @min-[50rem]/c56:start-0 @min-[50rem]/c56:bottom-0">
                <div className="flex min-w-0 flex-col gap-2">
                    <span className="flex h-4 min-w-0 items-center text-sm font-medium text-foreground">
                        <span className={`${TEXT_TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                            {focus ? focus.label : `All ${regions.length} Regions`}
                        </span>
                    </span>
                    <span className="text-xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
                        {usd3(focus ? focus.revenue : total)}
                    </span>
                    <div className="flex h-4 min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                        {(focus ? focus.revenue : total) > 0 ? (
                            <>
                                <span className={TEXT_TRIM}>
                                    {focus ? `${sharePct(focus.share)} of revenue` : 'Revenue'}
                                </span>
                                <MetaDot />
                                <span
                                    className={TEXT_TRIM}
                                >{`${whole(focus ? focus.accounts : accounts)} accounts`}</span>
                            </>
                        ) : (
                            <span className={TEXT_TRIM}>No revenue yet</span>
                        )}
                    </div>
                </div>
            </div>
            <svg aria-hidden="true" className="absolute size-0 overflow-hidden">
                <defs>
                    {Object.keys(paths).map((k) => (
                        <path key={k} id={`${uid}-${k}`} d={paths[k]} />
                    ))}
                </defs>
            </svg>
            <svg
                viewBox={`-0.5 -0.5 ${grid.width} ${grid.height}`}
                role="group"
                aria-label={mapLabel}
                className="group/map h-auto w-full overflow-visible"
                onMouseLeave={() => setHover(null)}
            >
                {paths.none ? (
                    <use href={`#${uid}-none`} strokeLinecap="round" className={`${NONE_STROKE} ${DOT_W}`} />
                ) : null}
                {rows.map((r, i) => {
                    const has = r.revenue > 0;
                    const dim = shown != null && shown !== r.key;
                    return (
                        <g
                            key={r.key}
                            ref={(el) => {
                                regionRefs.current[i] = el;
                            }}
                            data-region={r.key}
                            role="button"
                            tabIndex={i === focusIdx ? 0 : -1}
                            aria-label={
                                has
                                    ? `${r.label}: ${usd3(r.revenue)}, ${sharePct(r.share)} of revenue, ${whole(r.accounts)} accounts`
                                    : `${r.label}: no revenue`
                            }
                            aria-pressed={pinned === r.key}
                            className="cursor-pointer outline-none"
                            onMouseEnter={() => setHover(r.key)}
                            onFocus={() => {
                                setFocusIdx(i);
                                setHover(r.key);
                            }}
                            onBlur={() => setHover(null)}
                            onClick={() => pin(r.key)}
                            onKeyDown={(e) => onRegionKey(e, i)}
                        >
                            <use
                                href={`#${uid}-${r.key}`}
                                strokeWidth={1}
                                strokeLinecap="square"
                                stroke="transparent"
                                pointerEvents="stroke"
                            />
                            <use
                                href={`#${uid}-${r.key}`}
                                strokeLinecap="round"
                                className={`${has ? bucket(r.share)[1] : NONE_STROKE} ${DOT_W} transition-[stroke,opacity] duration-[400ms,150ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-has-[:focus-visible]/map:transition-[stroke] motion-reduce:duration-150 ${dim ? 'opacity-35' : ''}`}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );

    return (
        <div className={`w-full min-w-0 ${className}`}>
            <Frame className="@container/c56 min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 flex-col gap-px">
                        <FrameTitle role="heading" className="truncate">
                            {title}
                        </FrameTitle>
                        <FrameDescription className="truncate">{`Revenue by sales region, ${seg.noun}`}</FrameDescription>
                    </div>
                    <ChartToolbar>
                        <SelectMenu
                            label="Segment"
                            value={seg.value}
                            onValueChange={(v) => {
                                setSegment(v);
                                setPinned(null);
                            }}
                            options={segments}
                            className="w-36"
                        />
                        <SelectMenu
                            label="Period"
                            value={per.value}
                            onValueChange={setPeriod}
                            options={periods}
                            className="w-40"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-8 bg-background"
                                        aria-label="More actions"
                                        title="More actions"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto min-w-44">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            downloadText(
                                                `revenue-map-${seg.value}-${per.value}.csv`,
                                                rowsToCsv(rows, csvColumns)
                                            )
                                        }
                                    >
                                        <Icon name="download" />
                                        Download CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copyText(summary)}>
                                        <Icon name="file-text" />
                                        Copy Summary
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>View</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'map' : 'sheet'} />
                                        {view === 'table' ? 'View as Map' : 'View as Table'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={reset}>
                                        <Icon name="rotate-ccw" />
                                        Reset View
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel>
                    <div className="flex flex-col gap-6">
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            table={
                                <ChartDataTable
                                    data={rows}
                                    index="label"
                                    indexLabel="Region"
                                    series={[
                                        { key: 'revenue', label: 'Revenue' },
                                        { key: 'accounts', label: 'Paying accounts' },
                                    ]}
                                    valueFormatter={(v: number, item: any) =>
                                        item && item.dataKey === 'accounts' ? whole(v) : usd3(v)
                                    }
                                    caption={mapLabel}
                                />
                            }
                        >
                            {map}
                        </ChartFigure>
                        <div className="grid gap-6 @2xl/c56:grid-cols-2">
                            <section aria-labelledby={`${uid}-hot`} className="flex min-w-0 flex-col gap-2">
                                <span className="flex h-4 items-center text-xs text-muted-foreground">
                                    <span id={`${uid}-hot`} role="heading" aria-level={4} className={TEXT_TRIM}>
                                        Hot Spots
                                    </span>
                                </span>
                                {hot.length ? (
                                    <div className="-mx-2.5 flex min-h-24 flex-col">
                                        {hot.map((r) => (
                                            <button
                                                key={r.key}
                                                type="button"
                                                data-hot-spot=""
                                                aria-pressed={pinned === r.key}
                                                onClick={() => pin(r.key)}
                                                onMouseEnter={() => setHover(r.key)}
                                                onMouseLeave={() => setHover(null)}
                                                className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors duration-100 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-muted"
                                            >
                                                <span
                                                    className={`size-3 shrink-0 rounded-full ${bucket(r.share)[2]}`}
                                                />
                                                <span
                                                    className={`${TEXT_TRIM} min-w-0 flex-1 overflow-x-clip text-sm text-ellipsis whitespace-nowrap`}
                                                >
                                                    {r.label}
                                                </span>
                                                <span
                                                    className={`${TEXT_TRIM} text-end text-sm font-medium text-foreground tabular-nums`}
                                                >
                                                    {usd3(r.revenue)}
                                                </span>
                                                <span
                                                    className={`${TEXT_TRIM} w-8 shrink-0 text-end text-xs text-muted-foreground tabular-nums`}
                                                >
                                                    {sharePct(r.share)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex min-h-24 w-full min-w-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-3 text-center text-balance">
                                        <div className="text-sm text-muted-foreground">
                                            {seg.since
                                                ? `${seg.label} started billing in ${seg.since}.`
                                                : `No ${seg.noun} revenue in ${per.label}.`}
                                        </div>
                                        {fallback ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-background"
                                                onClick={() => setPeriod(fallback.value)}
                                            >
                                                <Icon name="calendar" />
                                                {`Show ${fallback.label}`}
                                            </Button>
                                        ) : null}
                                    </div>
                                )}
                            </section>
                            <section aria-labelledby={`${uid}-rpa`} className="flex min-w-0 flex-col gap-2">
                                <span className="flex h-4 items-center text-xs text-muted-foreground">
                                    <span id={`${uid}-rpa`} role="heading" aria-level={4} className={TEXT_TRIM}>
                                        Revenue per Account
                                    </span>
                                </span>
                                <div className="flex min-h-24 flex-col">
                                    <Line label={`${per.month} revenue`} value={`$${whole(month)}`} />
                                    <Line label="Paying accounts" value={whole(accounts)} />
                                    <Line
                                        label="Per account, monthly"
                                        value={accounts ? `$${whole(month / accounts)}` : 'None'}
                                        strong
                                        border
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center">
                        <span className={TEXT_TRIM}>{`As of ${asOf}`}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2 @2xl/c56:flex-nowrap!">
                        <span className="flex h-4 basis-full items-center @2xl/c56:basis-auto!">
                            <span className={TEXT_TRIM}>Share of revenue</span>
                        </span>
                        <span className="flex h-4 items-center gap-1.5">
                            <span className="size-3 shrink-0 rounded-full border border-muted-foreground" />
                            <span className={`${TEXT_TRIM} whitespace-nowrap tabular-nums`}>No revenue</span>
                        </span>
                        {BUCKETS.map((b) => (
                            <span key={b[3]} className="flex h-4 items-center gap-1.5">
                                <span className={`size-3 shrink-0 rounded-full ${b[2]}`} />
                                <span className={`${TEXT_TRIM} whitespace-nowrap tabular-nums`}>{b[3]}</span>
                            </span>
                        ))}
                    </span>
                </FrameFooter>
            </Frame>
        </div>
    );
}

export default RevenueMap;
