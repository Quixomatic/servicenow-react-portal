import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    SegmentedControl,
    ChartExpandDialog,
    rowsToCsv,
    downloadText,
    copyText,
} from 'components:chart-frame';
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
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { series, SeriesScope } from 'components:charts/chart-kit';
import { TEXT_TRIM, MenuSelect, RefreshButton, useBusy, useOnScreen, int } from 'components:charts/bar-kit';
import { REGIONS, MODES, TARGETS, CHANGE, PERIOD } from './data';
import type { ModeKey, Stat, TransitRegion } from './data';

/**
 * components:charts/transit-vs-target: diverging HTML lanes of transit days against target per region,
 * one pill per freight mode (road, rail), ahead of target to the left and behind to the right over a
 * tinted late zone. Median / P90 switch (reranks the regions), sort menu, Display menu (modes, value
 * labels, prior-quarter ticks, late zone), hover / keyboard row focus that dims the other rows, a live
 * feed that nudges values and shipment counts, refresh, expand, and CSV / TSV / summary exports.
 *
 *   <TransitVsTarget />                                         sample data
 *   <TransitVsTarget regions={[…]} targets={{ median: {…}, p90: {…} }} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type TransitVsTargetProps = {
    title?: string;
    regions?: TransitRegion[];
    targets?: Record<Stat, Record<ModeKey, number>>;
    change?: Record<Stat, { value: number; label: string }>;
    period?: string;
    live?: boolean;
    className?: string;
};

type Sort = 'behind' | 'ahead' | 'region';

const SORTS = [
    { value: 'behind', label: 'Most Behind', icon: 'arrow-down-wide-narrow' },
    { value: 'ahead', label: 'Most Ahead', icon: 'arrow-up-narrow-wide' },
    { value: 'region', label: 'By Region', icon: 'arrow-down-a-z' },
];
const STATS = [
    { value: 'median', label: 'Median' },
    { value: 'p90', label: 'P90' },
];
const ENTER = 'cubic-bezier(0.23, 1, 0.32, 1)';
const MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';
const BAR_H = 12;

/** 2.4 → "+2.4 d", -0.1 → "−0.1 d" (typographic minus), 0 → "0". */
function gapText(v: number, unit = ' d'): string {
    const r = Math.round(v * 10) / 10;
    if (r === 0) return `0${unit === ' d' ? '' : unit}`;
    return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}${unit}`;
}

function reducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        !!window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/** The pulsing live dot (2.4 s ping drawn with WAAPI; off under reduced motion or when paused). */
function LiveDot({ on }: { on: boolean }) {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || !on || reducedMotion() || !el.animate) return undefined;
        const a = el.animate(
            [
                { transform: 'scale(1)', opacity: 0, offset: 0 },
                { opacity: 0.5, offset: 0.12 },
                { transform: 'scale(2.6)', opacity: 0, offset: 1 },
            ],
            { duration: 2400, iterations: Infinity, easing: 'linear' }
        );
        return () => a.cancel();
    }, [on]);
    return (
        <span className="relative flex size-1.5 shrink-0">
            <span ref={ref} className={`absolute inset-0 rounded-full opacity-0 ${on ? 'bg-success' : ''}`} />
            <span
                className={`relative size-1.5 rounded-full transition-colors duration-200 ease-[ease] ${on ? 'bg-success' : 'bg-muted-foreground/60'}`}
            />
        </span>
    );
}

/** A white sweep over a pill that just changed (700 ms). */
function Flash() {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || reducedMotion() || !el.animate) return;
        el.animate([{ opacity: 0 }, { opacity: 0.45 }, { opacity: 0 }], { duration: 700, easing: 'linear' });
    }, []);
    return <span ref={ref} aria-hidden="true" className="absolute inset-0 bg-white opacity-0" />;
}

export function TransitVsTarget({
    title = 'Transit vs Target',
    regions: initial = REGIONS,
    targets = TARGETS,
    change = CHANGE,
    period = PERIOD,
    live: liveDefault = true,
    className,
}: TransitVsTargetProps) {
    const [stat, setStat] = useState<Stat>('median');
    const [sort, setSort] = useState<Sort>('behind');
    const [modes, setModes] = useState<ModeKey[]>(['road', 'rail']);
    const [overlays, setOverlays] = useState({ labels: true, prior: false, late: true });
    const [data, setData] = useState<TransitRegion[]>(initial);
    const [live, setLive] = useState(liveDefault);
    const [lit, setLit] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [flash, setFlash] = useState<{ key: string; n: number } | null>(null);
    const [entered, setEntered] = useState(false);
    const [entering, setEntering] = useState(true);
    const [busy, refresh] = useBusy(600, () => replay());
    const timers = useRef<any[]>([]);

    const replay = () => {
        timers.current.forEach((t) => clearTimeout(t));
        setEntered(false);
        setEntering(true);
        timers.current = [setTimeout(() => setEntered(true), 30), setTimeout(() => setEntering(false), 1200)];
    };
    useEffect(() => {
        replay();
        return () => timers.current.forEach((t) => clearTimeout(t));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Live feed: every 2.6 s one region / mode moves by 0.1 d (kept within 0.2 d of the sample) and a few
    // shipments arrive.
    // Ticks only while the lanes are on screen and the tab is visible.
    const lanesRef = useRef<HTMLDivElement>(null);
    const onScreen = useOnScreen(lanesRef);
    useEffect(() => {
        if (!live || !onScreen) return undefined;
        const t = setInterval(() => {
            const ri = Math.floor(Math.random() * initial.length);
            const mode: ModeKey = Math.random() < 0.5 ? 'road' : 'rail';
            const st: Stat = Math.random() < 0.5 ? 'median' : 'p90';
            setData((list) =>
                list.map((r, i) => {
                    if (i !== ri) return r;
                    const base = initial[i][st][mode];
                    const cur = r[st][mode];
                    let next = Math.round((cur + (Math.random() < 0.5 ? -0.1 : 0.1)) * 10) / 10;
                    if (Math.abs(next - base) > 0.2) next = Math.round((cur + (base > cur ? 0.1 : -0.1)) * 10) / 10;
                    return {
                        ...r,
                        shipments: r.shipments + 3 + Math.floor(Math.random() * 4),
                        [st]: { ...r[st], [mode]: next },
                    };
                })
            );
            if (st === stat) setFlash((f) => ({ key: `${initial[ri].region}:${mode}`, n: f ? f.n + 1 : 1 }));
        }, 2600);
        return () => clearInterval(t);
    }, [live, onScreen, initial, stat]);

    const config = useMemo(
        () => ({
            road: series('blue-500', 'blue-400', 'Road Freight'),
            rail: series('amber-500', 'amber-400', 'Rail Freight'),
        }),
        []
    );

    const shownModes = MODES.filter((m) => modes.indexOf(m.key) >= 0);
    const gap = (r: TransitRegion, m: ModeKey) => Math.round((r[stat][m] - targets[stat][m]) * 10) / 10;
    const rows = useMemo(() => {
        const list = data.slice();
        const keys = modes.length ? modes : (['road'] as ModeKey[]);
        const hi = (r: TransitRegion) => Math.max(...keys.map((m) => gap(r, m)));
        const lo = (r: TransitRegion) => Math.min(...keys.map((m) => gap(r, m)));
        if (sort === 'behind') list.sort((a, b) => hi(b) - hi(a));
        else if (sort === 'ahead') list.sort((a, b) => lo(a) - lo(b));
        else list.sort((a, b) => a.region.localeCompare(b.region));
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, sort, stat, modes, targets]);

    const maxAbs = rows.reduce(
        (m, r) =>
            Math.max(
                m,
                ...MODES.map((md) => Math.abs(gap(r, md.key))),
                ...(overlays.prior ? MODES.map((md) => Math.abs(r.prior[stat][md.key])) : [0])
            ),
        0
    );
    const domain = Math.max(5, Math.ceil(maxAbs + 0.5));
    const pos = (v: number) => 50 + (Math.max(-domain, Math.min(domain, v)) / domain) * 50;
    const ticks = [-0.8, -0.4, 0, 0.4, 0.8].map((f) => Math.round(f * domain * 10) / 10);

    // FLIP: rows glide to their new rank when the order changes.
    const listRef = useRef<HTMLUListElement>(null);
    const tops = useRef<Record<string, number>>({});
    const order = rows.map((r) => r.region).join('|');
    useLayoutEffect(() => {
        const ul = listRef.current;
        if (!ul) return;
        const items = Array.prototype.slice.call(ul.querySelectorAll('[data-region]')) as HTMLElement[];
        const next: Record<string, number> = {};
        items.forEach((el) => {
            const k = el.getAttribute('data-region') || '';
            next[k] = el.offsetTop;
            const before = tops.current[k];
            if (before != null && before !== next[k] && !reducedMotion() && el.animate) {
                el.animate([{ transform: `translateY(${before - next[k]}px)` }, { transform: 'translateY(0px)' }], {
                    duration: 520,
                    easing: ENTER,
                });
            }
        });
        tops.current = next;
    }, [order]);

    const onTarget = rows.reduce((s, r) => s + MODES.filter((m) => gap(r, m.key) <= 0).length, 0);
    const lanes = rows.length * MODES.length;
    const shipments = data.reduce((s, r) => s + r.shipments, 0);
    const statLabel = stat === 'median' ? 'Median' : 'P90';
    const ch = change[stat];

    const describe = (r: TransitRegion) =>
        `${r.region}: ${shownModes
            .map((m) => {
                const g = gap(r, m.key);
                return `${m.label} ${r[stat][m.key].toFixed(1)} days, ${
                    g === 0 ? 'on target' : `${Math.abs(g).toFixed(1)} days ${g > 0 ? 'behind' : 'ahead of'} target`
                }`;
            })
            .join('; ')}; ${int(r.shipments)} shipments, ${r.onTime}% on time`;
    const summary = `${title}, ${statLabel.toLowerCase()} door-to-door days, ${period}: ${onTarget} of ${lanes} lanes on target. ${rows
        .map(describe)
        .join('. ')}.`;
    const tableRows = rows.map((r) => ({
        region: r.region,
        road: r[stat].road,
        roadGap: gap(r, 'road'),
        rail: r[stat].rail,
        railGap: gap(r, 'rail'),
        shipments: r.shipments,
        onTime: r.onTime,
    }));
    const columns = [
        { key: 'region', label: 'Region' },
        { key: 'road', label: 'Road Freight (d)' },
        { key: 'roadGap', label: 'Road Freight gap to target (d)' },
        { key: 'rail', label: 'Rail Freight (d)' },
        { key: 'railGap', label: 'Rail Freight gap to target (d)' },
        { key: 'shipments', label: 'Shipments' },
        { key: 'onTime', label: 'On time (%)' },
    ];
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };
    const reset = () => {
        setStat('median');
        setSort('behind');
        setModes(['road', 'rail']);
        setOverlays({ labels: true, prior: false, late: true });
        setLive(liveDefault);
        setView('chart');
        setData(initial);
    };
    const move = (step: number) => {
        const i = lit ? rows.findIndex((r) => r.region === lit) : -1;
        const next = rows[Math.max(0, Math.min(rows.length - 1, i < 0 ? (step > 0 ? 0 : rows.length - 1) : i + step))];
        if (next) setLit(next.region);
    };

    const lanesView = (big: boolean) => (
        <div
            ref={big ? undefined : lanesRef}
            className={`relative grid w-full min-w-0 text-xs grid-cols-[var(--label-w)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-y-1 [--label-w:3.75rem] @md/transit:[--label-w:7.5rem] ${
                big ? 'h-[min(70vh,560px)]' : 'h-80'
            }`}
        >
            <div className="relative col-start-2 row-start-1 mb-2">
                <div className="mx-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-muted-foreground">
                    <span className="flex h-4 items-center justify-end gap-1">
                        <Icon name="arrow-left" className="size-4" />
                        <span className={TEXT_TRIM}>Ahead</span>
                    </span>
                    <span
                        data-slot="badge"
                        className="relative inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-md border border-border bg-background px-1.5 text-xs font-medium whitespace-nowrap"
                    >
                        <span className={TEXT_TRIM}>Target</span>
                    </span>
                    <span className="flex h-4 items-center gap-1">
                        <span className={TEXT_TRIM}>Behind</span>
                        <Icon name="arrow-right" className="size-4" />
                    </span>
                </div>
            </div>
            <div className="pointer-events-none relative col-start-2 row-start-2">
                <div
                    className={`absolute inset-y-0 right-0 left-1/2 bg-destructive/[0.035] transition-opacity duration-200 ease-[ease] motion-reduce:transition-none ${
                        overlays.late ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <svg
                    aria-hidden="true"
                    className="absolute inset-x-8 inset-y-0 h-full w-[calc(100%-4rem)] overflow-visible"
                >
                    {ticks.map((t) => (
                        <line
                            key={t}
                            className={t === 0 ? 'stroke-foreground/20' : 'stroke-foreground/[0.06]'}
                            strokeWidth={1}
                            x1={`${pos(t)}%`}
                            x2={`${pos(t)}%`}
                            y1="0"
                            y2="100%"
                        />
                    ))}
                </svg>
            </div>
            <ul
                ref={big ? undefined : listRef}
                tabIndex={0}
                aria-label={`${statLabel} transit against target by region; arrow keys move between regions`}
                className="relative col-span-2 col-start-1 row-start-2 flex min-h-0 flex-col rounded-lg outline-ring/50 focus-visible:outline-2"
                onKeyDown={(e: any) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        move(1);
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        move(-1);
                    } else if (e.key === 'Escape') setLit(null);
                }}
                onBlur={() => setLit(null)}
                onMouseLeave={() => setLit(null)}
            >
                {rows.map((r, ri) => {
                    const on = lit === r.region;
                    const dim = lit != null && !on;
                    return (
                        <li
                            key={r.region}
                            data-region={r.region}
                            data-lit={on ? 'true' : 'false'}
                            className="group/row relative grid min-h-0 flex-1 grid-cols-[var(--label-w)_minmax(0,1fr)] items-center border-b border-dashed border-border/60 last:border-b-0"
                            onMouseEnter={() => setLit(r.region)}
                        >
                            <span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-full bg-muted/70 opacity-0 ring-1 ring-border/80 transition-opacity duration-150 ease-[ease] ring-inset group-data-[lit=true]/row:opacity-100 motion-reduce:transition-none dark:bg-muted/40"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={describe(r)}
                                onClick={() => setLit(on ? null : r.region)}
                                className="absolute inset-0 rounded-full outline-ring/50 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2"
                            />
                            <span className="pointer-events-none relative flex h-4 min-w-0 items-center ps-3 text-muted-foreground transition-colors duration-150 ease-[ease] group-data-[lit=true]/row:text-foreground">
                                <span
                                    className={`hidden @md/transit:block ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                >
                                    {r.region}
                                </span>
                                {/* Narrow cards show the short region code, as ReUI does. */}
                                <span
                                    aria-hidden="true"
                                    className={`@md/transit:hidden ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                >
                                    {r.short || r.region}
                                </span>
                            </span>
                            <div
                                className="pointer-events-none relative self-stretch overflow-x-clip transition-[opacity,filter] duration-150 ease-[ease]"
                                style={dim ? { opacity: 0.35, filter: 'saturate(0.5)' } : { opacity: 1 }}
                            >
                                <div className="absolute inset-x-8 inset-y-0 flex flex-col justify-center gap-1">
                                    {shownModes.map((m, mi) => {
                                        const g = gap(r, m.key);
                                        const end = pos(g);
                                        const left = g < 0 ? Math.min(end, 50) : 50;
                                        const right = g < 0 ? 50 : Math.max(end, 50);
                                        const delay = ri * 40 + mi * 30;
                                        const tr = entering
                                            ? `clip-path 520ms ${ENTER} ${delay}ms, transform 520ms ${ENTER} ${delay}ms`
                                            : `clip-path 360ms ${MOVE}, transform 360ms ${MOVE}`;
                                        const shown = entered;
                                        const fk = `${r.region}:${m.key}`;
                                        const prior = r.prior[stat][m.key];
                                        return (
                                            <div key={m.key} className="relative h-3">
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        backgroundImage: `linear-gradient(to right, var(--color-${m.key}), color-mix(in oklab, var(--color-${m.key}) 72%, transparent) 50%, var(--color-${m.key}))`,
                                                        clipPath: shown
                                                            ? `inset(0% ${100 - right}% 0% ${left}% round 9999px)`
                                                            : 'inset(0% 50% 0% 50% round 9999px)',
                                                        transition: reducedMotion() ? 'none' : tr,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {flash && flash.key === fk ? <Flash key={flash.n} /> : null}
                                                </div>
                                                {Math.abs(right - left) < 1.5 ? (
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute top-0 h-3 rounded-full"
                                                        style={{
                                                            width: BAR_H,
                                                            left: `calc(${g < 0 ? 50 : 50}% - ${g < 0 ? BAR_H : 0}px)`,
                                                            background: `var(--color-${m.key})`,
                                                            opacity: shown ? 1 : 0,
                                                            transition: reducedMotion()
                                                                ? 'none'
                                                                : `opacity 200ms ease ${delay}ms`,
                                                        }}
                                                    />
                                                ) : null}
                                                {overlays.prior ? (
                                                    <div
                                                        aria-hidden="true"
                                                        className="absolute inset-0"
                                                        style={{
                                                            transform: `translateX(${pos(prior)}%)`,
                                                            transition: reducedMotion()
                                                                ? 'none'
                                                                : `transform 360ms ${MOVE}`,
                                                        }}
                                                    >
                                                        <span className="absolute top-1/2 left-0 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50" />
                                                    </div>
                                                ) : null}
                                                <div
                                                    aria-hidden="true"
                                                    className="absolute inset-0"
                                                    style={{
                                                        transform: `translateX(${shown ? (Math.abs(right - left) < 1.5 ? (g < 0 ? 50 - 1.5 : 51.5) : end) : 50}%)`,
                                                        opacity: overlays.labels ? 1 : 0,
                                                        transition: reducedMotion()
                                                            ? 'none'
                                                            : `${tr}, opacity 200ms ease`,
                                                    }}
                                                >
                                                    <span
                                                        className={`absolute top-1/2 flex h-4 -translate-y-1/2 items-center font-medium whitespace-nowrap text-muted-foreground tabular-nums group-data-[lit=true]/row:text-foreground ${
                                                            g < 0 ? 'right-full me-1.5' : 'left-0 ms-1.5'
                                                        }`}
                                                    >
                                                        <span className={TEXT_TRIM}>{gapText(g)}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <div className="relative col-start-2 row-start-3 h-4">
                <div className="absolute inset-x-8 inset-y-0">
                    {ticks.map((t, i) => (
                        <span
                            key={t}
                            className={`absolute flex h-4 -translate-x-1/2 items-center whitespace-nowrap text-muted-foreground tabular-nums ${
                                i === 1 || i === 3 ? '@max-sm/transit:hidden' : ''
                            }`}
                            style={{ left: `${pos(t)}%` }}
                        >
                            <span className={TEXT_TRIM}>
                                {t === 0
                                    ? '0'
                                    : `${t > 0 ? '+' : '−'}${Number.isInteger(t) ? Math.abs(t) : Math.abs(t).toFixed(1)} d`}
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    const header = (
        <FrameHeader className="flex-row! flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
                <div className="flex h-5 items-center gap-2">
                    <FrameTitle className={TEXT_TRIM}>{title}</FrameTitle>
                    <span
                        data-slot="badge"
                        className={`relative inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 ${
                            ch.value <= 0
                                ? 'bg-success/10 text-success-foreground dark:bg-success/15 dark:text-success'
                                : 'bg-destructive/10 text-destructive-foreground dark:bg-destructive/15 dark:text-destructive'
                        }`}
                    >
                        <Icon name={ch.value <= 0 ? 'trending-down' : 'trending-up'} />
                        <span className="sr-only">{ch.value <= 0 ? 'Faster:' : 'Slower:'}</span>
                        <span
                            className={TEXT_TRIM}
                        >{`${ch.value > 0 ? '+' : ''}${ch.value.toFixed(1)}% ${ch.label}`}</span>
                    </span>
                </div>
                <FrameDescription className="truncate">{`${statLabel} door-to-door days against target`}</FrameDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {/* ReUI: the pressed item is muted, the others stay foreground. */}
                <SegmentedControl
                    className="[&>[aria-checked=true]]:bg-muted [&>button]:text-foreground"
                    label="Statistic"
                    options={STATS}
                    value={stat}
                    onValueChange={(v: string) => setStat(v as Stat)}
                />
                <MenuSelect
                    options={SORTS}
                    value={sort}
                    onValueChange={(v) => setSort(v as Sort)}
                    icon="arrow-up-down"
                    label="Sort"
                    menuLabel="Sort Regions"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-background"
                                aria-label="Display options"
                            />
                        }
                    >
                        <Icon name="sliders-horizontal" />
                        <span className={`@max-md/transit:sr-only ${TEXT_TRIM}`}>Display</span>
                        <Icon name="chevron-down" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-44">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Modes</DropdownMenuLabel>
                            {MODES.map((m) => (
                                <DropdownMenuCheckboxItem
                                    key={m.key}
                                    checked={modes.indexOf(m.key) >= 0}
                                    closeOnClick={false}
                                    onCheckedChange={(c: boolean) => {
                                        const next = MODES.map((x) => x.key).filter((k) =>
                                            k === m.key ? c : modes.indexOf(k) >= 0
                                        );
                                        if (next.length) setModes(next);
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="size-2 shrink-0 rounded-full"
                                        style={{ background: `var(--color-${m.key})` }}
                                    />
                                    {m.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Overlays</DropdownMenuLabel>
                            <DropdownMenuCheckboxItem
                                checked={overlays.labels}
                                closeOnClick={false}
                                onCheckedChange={(c: boolean) => setOverlays((o) => ({ ...o, labels: !!c }))}
                            >
                                <Icon name="hash" />
                                Value Labels
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={overlays.prior}
                                closeOnClick={false}
                                onCheckedChange={(c: boolean) => setOverlays((o) => ({ ...o, prior: !!c }))}
                            >
                                <Icon name="history" />
                                Prior Quarter
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={overlays.late}
                                closeOnClick={false}
                                onCheckedChange={(c: boolean) => setOverlays((o) => ({ ...o, late: !!c }))}
                            >
                                <Icon name="timer" />
                                Late Zone
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <ToolbarGroup aria-label="Chart actions">
                    <RefreshButton busy={busy} onClick={refresh} label="Refresh data" busyLabel="Refreshing data" />
                    <Button
                        variant="outline"
                        size="icon-sm"
                        className="bg-background"
                        aria-label="Expand chart"
                        title="Expand chart"
                        onClick={() => setExpanded(true)}
                    >
                        <Icon name="maximize-2" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    className="bg-background"
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
                                    onClick={() => {
                                        downloadText('transit-vs-target.csv', rowsToCsv(tableRows, columns));
                                        toast.success('CSV downloaded', { description: 'transit-vs-target.csv' });
                                    }}
                                >
                                    <Icon name="download" />
                                    Download CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        copy(
                                            [columns.map((c) => c.label).join('\t')]
                                                .concat(
                                                    tableRows.map((r: any) => columns.map((c) => r[c.key]).join('\t'))
                                                )
                                                .join('\n'),
                                            'Data'
                                        )
                                    }
                                >
                                    <Icon name="table" />
                                    Copy Data
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copy(summary, 'Summary')}>
                                    <Icon name="file-text" />
                                    Copy Summary
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>View</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setLive(!live)}>
                                    <Icon name={live ? 'pause' : 'play'} />
                                    {live ? 'Pause Live Feed' : 'Resume Live Feed'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExpanded(true)}>
                                    <Icon name="maximize-2" />
                                    Expand Chart
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                    <Icon name={view === 'table' ? 'chart-bar' : 'rows-3'} />
                                    {view === 'table' ? 'View as Chart' : 'View as Table'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={reset}>
                                    <Icon name="rotate-ccw" />
                                    Reset View
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>
            </div>
        </FrameHeader>
    );

    const legend = (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs">
            <ul aria-label="Modes" className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {shownModes.map((m) => (
                    <li key={m.key} className="flex h-4 items-center gap-1.5">
                        <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: `var(--color-${m.key})` }}
                        />
                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>{m.label}</span>
                        <span className={`font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>
                            {`${targets[stat][m.key].toFixed(1)} d`}
                        </span>
                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>target</span>
                    </li>
                ))}
                {overlays.prior ? (
                    <li className="flex h-4 items-center gap-1.5">
                        <span aria-hidden="true" className="h-3 w-0.5 shrink-0 rounded-full bg-foreground/50" />
                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>Prior quarter</span>
                    </li>
                ) : null}
            </ul>
        </div>
    );

    return (
        <SeriesScope config={config} className={`w-full min-w-0 ${className || ''}`}>
            <Frame dense stacked className="@container/transit min-w-0">
                {header}
                <FramePanel className="flex flex-col gap-4">
                    {legend}
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={tableRows}
                                index="region"
                                indexLabel="Region"
                                series={[
                                    { key: 'road', label: 'Road Freight' },
                                    { key: 'roadGap', label: 'Road Freight gap to target' },
                                    { key: 'rail', label: 'Rail Freight' },
                                    { key: 'railGap', label: 'Rail Freight gap to target' },
                                ]}
                                valueFormatter={(v: number) => `${v.toFixed(1)} d`}
                                caption={`${statLabel} transit days against target by region, ${period}`}
                            />
                        }
                    >
                        {lanesView(false)}
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row! flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center gap-2">
                        <LiveDot on={live} />
                        <span className={`text-foreground ${TEXT_TRIM}`}>{live ? 'Live' : 'Paused'}</span>
                        <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className={`tabular-nums ${TEXT_TRIM}`}>{`${int(shipments)} shipments`}</span>
                    </span>
                    <span className="flex h-4 items-center">
                        <span className={`tabular-nums ${TEXT_TRIM}`}>{`${onTarget} of ${lanes} lanes on target`}</span>
                    </span>
                </FrameFooter>
            </Frame>
            <ChartExpandDialog open={expanded} onOpenChange={setExpanded} title={title}>
                <div className="@container/transit flex flex-col gap-4 p-2">
                    {legend}
                    {lanesView(true)}
                </div>
            </ChartExpandDialog>
        </SeriesScope>
    );
}

export default TransitVsTarget;
