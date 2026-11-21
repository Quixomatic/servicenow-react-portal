import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    ToolbarGroup,
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
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from 'components:toggle-group';
import { AvatarGroup, UserAvatar } from 'components:avatar';
import { Icon } from 'components:icon';
import { useElementWidth } from 'components:charts/chart-kit';
import { TEXT_TRIM, ToneBadge, prefersReducedMotion } from 'components:charts/bar-more-kit';
import { NOW, CATEGORIES, ACTORS, RANGES } from './data';
import type { AuditRange, AuditActor, AuditCategory, Outcome } from './data';

/**
 * components:charts/audit-log-volume: audit events per bucket as stacked, hatched outcome pills (success,
 * denied, failed) over a full-height column, from 5-minute buckets (1 hour) to daily buckets (30 days);
 * faces of denials awaiting review over their buckets; outcome toggles; category / actor filters and presets;
 * KPIs (success rate, denied, failed, actors with the top actor). Hover a bucket for its numbers, click to
 * select it, drag to select a span (Arrow keys / Enter / Shift+Enter / Escape on the keyboard).
 * Generic initials avatars only (no photos).
 *
 *   <AuditLogVolume />                                   sample data
 *   <AuditLogVolume ranges={[...]} actors={[...]} categories={[...]} now="2026-09-29T14:20:00Z" />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type AuditLogVolumeProps = {
    title?: string;
    ranges?: AuditRange[];
    actors?: AuditActor[];
    categories?: AuditCategory[];
    /** End of every range (ISO, UTC). */
    now?: string;
    defaultRange?: string;
    className?: string;
};

const OUTCOMES: { key: Outcome; label: string; dot: string; color: string; fill: number; line: number }[] = [
    { key: 'success', label: 'Success', dot: 'bg-success', color: 'var(--success)', fill: 18, line: 62 },
    { key: 'denied', label: 'Denied', dot: 'bg-warning', color: 'var(--warning)', fill: 30, line: 92 },
    { key: 'failed', label: 'Failed', dot: 'bg-destructive', color: 'var(--destructive)', fill: 24, line: 84 },
];

/** Chart margins; the y axis takes 24px on the left, avatars the 28px on top. */
const M = { top: 28, right: 0, bottom: 0, left: 0 };
const AXIS_W = 24;
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const hm = (d: Date) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
const md = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const num = (n: number) => n.toLocaleString('en-US');
const pctOf = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '0%');

/** Seeded PRNG (mulberry32). */
function rng(seed: number) {
    let t = seed >>> 0;
    return () => {
        t = (t + 0x6d2b79f5) >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
function pick<T extends { weight: number }>(list: T[], r: number): T {
    const total = list.reduce((s, x) => s + x.weight, 0);
    let acc = 0;
    for (const x of list) {
        acc += x.weight / total;
        if (r < acc) return x;
    }
    return list[list.length - 1];
}

type Ev = { cat: string; actor: string; outcome: Outcome };
type Bucket = { i: number; key: string; start: Date; end: Date; full: boolean; events: Ev[] };

/** Buckets aligned to the bucket size (UTC); the first one starts mid-bucket at now − span. */
function buildBuckets(range: AuditRange, now: Date, actors: AuditActor[], cats: AuditCategory[]): Bucket[] {
    const size = range.sizeMin * 60000;
    const from = now.getTime() - range.spanMin * 60000;
    const out: Bucket[] = [];
    let t = from;
    let i = 0;
    const rand = rng(range.key.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
    const denyCats = cats.filter((c) => c.key === 'secrets' || c.key === 'access');
    const failCats = cats.filter((c) => c.key !== 'secrets' && c.key !== 'access');
    while (t < now.getTime() && i < range.counts.length) {
        const end = Math.min(now.getTime(), (Math.floor(t / size) + 1) * size);
        const c = range.counts[i];
        const events: Ev[] = [];
        const add = (n: number, outcome: Outcome, pool: AuditCategory[]) => {
            for (let k = 0; k < n; k++)
                events.push({
                    outcome,
                    cat: pick(pool.length ? pool : cats, rand()).key,
                    actor: pick(actors, rand()).key,
                });
        };
        add(c[0], 'success', cats);
        add(c[1], 'denied', denyCats);
        add(c[2], 'failed', failCats);
        out.push({
            i,
            key: `b${i}`,
            start: new Date(t),
            end: new Date(end),
            full: end - t === size,
            events,
        });
        t = end;
        i++;
    }
    return out;
}

function bucketLabel(b: Bucket, daily: boolean): string {
    if (daily && b.full) return `${DAYS[b.start.getUTCDay()]}, ${md(b.start)} UTC`;
    return `${md(b.start)}, ${hm(b.start)} to ${hm(b.end)} UTC`;
}
function spanLabel(a: Bucket, b: Bucket, daily: boolean): string {
    if (daily) return `${md(a.start)} to ${md(new Date(b.end.getTime() - 1))} UTC`;
    return `${md(a.start)}, ${hm(a.start)} to ${md(b.end)}, ${hm(b.end)} UTC`;
}

/** 1 / 2 / 3 … × 10^n step over three intervals, about 10% headroom. */
function yStep(max: number) {
    const raw = Math.max(1, max * 1.1) / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = Math.max(1, Math.ceil(raw / mag) * mag);
    return { step, top: step * 3, ticks: [0, step, step * 2, step * 3] };
}

type Totals = { total: number; success: number; denied: number; failed: number; actors: Record<string, number> };
function totalsOf(list: Ev[][]): Totals {
    const t: Totals = { total: 0, success: 0, denied: 0, failed: 0, actors: {} };
    list.forEach((evs) =>
        evs.forEach((e) => {
            t.total++;
            t[e.outcome]++;
            t.actors[e.actor] = (t.actors[e.actor] || 0) + 1;
        })
    );
    return t;
}

/** Runs `el.animate` with backwards fill; reduced motion turns every entry into a 200ms fade. */
function enter(el: Element, frames: Keyframe[], ms: number, delay = 0) {
    if (!el || !(el as any).animate) return;
    const reduce = prefersReducedMotion();
    (el as any).animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : frames, {
        duration: reduce ? 200 : ms,
        delay: reduce ? 0 : delay,
        easing: EASE,
        fill: 'backwards',
    });
}

/** A fragment that fades in (200ms) whenever its key changes. */
function FadeIn({ className, children }: { className?: string; children?: any }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (ref.current) enter(ref.current, [{ opacity: 0 }, { opacity: 1 }], 200);
    }, []);
    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/** Full-height column behind each bucket: muted, darker when hovered or selected. */
function Columns({ R, rows, n, hover, sel }: { R: any; rows: any[]; n: number; hover: number | null; sel: any }) {
    const area = R.usePlotArea ? R.usePlotArea() : null;
    if (!area || !n) return null;
    const step = area.width / n;
    return (
        <g aria-hidden="true">
            {rows.map((r: any) => {
                const on = sel && r.i >= sel[0] && r.i <= sel[1];
                // State as a data attribute (an attribute change), not a class swap: on Next Experience
                // pages class changes restyle the whole document.
                const state = hover === r.i ? 'hover' : on ? 'sel' : 'off';
                return (
                    <rect
                        key={r.key}
                        x={area.x + (r.i + 0.5) * step - 7}
                        y={area.y}
                        width={14}
                        height={area.height}
                        rx={4}
                        data-state={state}
                        className="fill-muted data-[state=hover]:fill-muted-foreground/20 data-[state=sel]:fill-muted-foreground/35 dark:data-[state=hover]:fill-muted-foreground/30 dark:data-[state=sel]:fill-muted-foreground/45"
                    />
                );
            })}
        </g>
    );
}

/** One outcome pill of a stacked bar; internal edges give up 1px so stacked pills sit 2px apart. */
function Segment(props: any) {
    const { x, y, width, height, payload, dataKey, order, fillId, base } = props;
    if (!payload || !height || height <= 0) return null;
    const present = order.filter((k: string) => payload[k] > 0);
    const lowest = present[0] === dataKey;
    const topmost = present[present.length - 1] === dataKey;
    const top = y + (topmost ? 0 : 1);
    const bottom = y + height - (lowest ? 0 : 1);
    const h = Math.max(0, bottom - top);
    if (!h) return null;
    return (
        <g data-alv-rise={payload.i} style={{ transformBox: 'view-box', transformOrigin: `0px ${base}px` }}>
            <rect x={x} y={top} width={width} height={h} rx={Math.min(4, h / 2)} fill={`url(#${fillId}-${dataKey})`} />
        </g>
    );
}

export function AuditLogVolume({
    title = 'Event Volume',
    ranges = RANGES,
    actors = ACTORS,
    categories = CATEGORIES,
    now = NOW,
    defaultRange = '7d',
    className,
}: AuditLogVolumeProps) {
    const [rangeKey, setRangeKey] = useState(defaultRange);
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];
    const daily = range.sizeMin >= 24 * 60;
    const [cats, setCats] = useState<string[]>(categories.map((c) => c.key));
    const [kind, setKind] = useState<'all' | 'person' | 'service'>('all');
    const [shown, setShown] = useState<string[]>(OUTCOMES.map((o) => o.key));
    const [hover, setHover] = useState<number | null>(null);
    const [sel, setSel] = useState<[number, number] | null>(null);
    const [cursor, setCursor] = useState<number | null>(null);
    const [faces, setFaces] = useState(true);
    const [auto, setAuto] = useState(false);
    const [replay, setReplay] = useState(0);
    const [spin, setSpin] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const drag = useRef<{ start: number; moved: boolean } | null>(null);
    const plotRef = useRef<HTMLDivElement>(null);
    const uid = 'rp-alv-' + useId().replace(/[^a-zA-Z0-9]/g, '');
    const nowDate = useMemo(() => new Date(now), [now]);

    const buckets = useMemo(
        () => buildBuckets(range, nowDate, actors, categories),
        [range, nowDate, actors, categories]
    );
    const actorKind: Record<string, string> = {};
    actors.forEach((a) => {
        actorKind[a.key] = a.kind;
    });
    const keep = (e: Ev) => cats.indexOf(e.cat) >= 0 && (kind === 'all' || actorKind[e.actor] === kind);
    const filtered = buckets.map((b) => b.events.filter(keep));
    const n = buckets.length;
    const rows = buckets.map((b, i) => {
        const t = totalsOf([filtered[i]]);
        return {
            i,
            key: b.key,
            label: daily ? md(b.start) : hm(b.start),
            success: shown.indexOf('success') >= 0 ? t.success : 0,
            denied: shown.indexOf('denied') >= 0 ? t.denied : 0,
            failed: shown.indexOf('failed') >= 0 ? t.failed : 0,
        };
    });
    const maxStack = Math.max(0, ...rows.map((r) => r.success + r.denied + r.failed));
    const y = yStep(maxStack);
    const order = OUTCOMES.map((o) => o.key).filter((k) => shown.indexOf(k) >= 0);

    // reviews: denials awaiting review, with the denier (a matching denied event in that bucket)
    const reviews = range.reviews
        .filter((bi) => bi < n)
        .map((bi, k) => {
            const people = actors.filter((a) => a.kind === 'person');
            const denied = buckets[bi].events.filter((e) => e.outcome === 'denied' && actorKind[e.actor] === 'person');
            const ev = denied[k % Math.max(1, denied.length)];
            return { bucket: bi, actor: ev ? ev.actor : (people[k % Math.max(1, people.length)] || actors[0]).key };
        });
    const showFaces = faces && shown.indexOf('denied') >= 0;
    const facesByBucket: Record<number, string[]> = {};
    reviews.forEach((r) => {
        (facesByBucket[r.bucket] = facesByBucket[r.bucket] || []).push(r.actor);
    });
    const actorOf = (k: string) => actors.find((a) => a.key === k) || { key: k, name: k, kind: 'person', weight: 0 };

    // geometry
    const width = useElementWidth(plotRef);
    const step = width ? (width - AXIS_W - M.left - M.right) / n : 0;
    const xOf = (i: number) => AXIS_W + M.left + (i + 0.5) * step;
    const indexAt = (clientX: number) => {
        const el = plotRef.current;
        if (!el || !step) return null;
        const r = el.getBoundingClientRect();
        return Math.max(0, Math.min(n - 1, Math.floor((clientX - r.left - AXIS_W - M.left) / step)));
    };

    // enter animations: bars rise (280ms, 6ms stagger), faces pop (200ms)
    const surfaceRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const root = surfaceRef.current;
        if (!root) return;
        root.querySelectorAll('[data-alv-rise]').forEach((el) => {
            const i = Number(el.getAttribute('data-alv-rise')) || 0;
            enter(el, [{ transform: 'scaleY(0)' }, { transform: 'none' }], 280, i * 6);
        });
        root.querySelectorAll('[data-alv-pop]').forEach((el) =>
            enter(
                el,
                [
                    { opacity: 0, transform: 'scale(0.9)' },
                    { opacity: 1, transform: 'none' },
                ],
                200
            )
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeKey, cats.join(), kind, shown.join(), replay, view, width > 0]);

    useEffect(() => {
        if (!auto) return undefined;
        const t = setInterval(() => setReplay((r) => r + 1), 30000);
        return () => clearInterval(t);
    }, [auto]);

    const resetFocus = () => {
        setHover(null);
        setSel(null);
        setCursor(null);
    };
    const refresh = () => {
        setReplay((r) => r + 1);
        setSpin(true);
        setTimeout(() => setSpin(false), 600);
    };

    // pointer: hover, click to select a bucket, drag to select a span
    const onDown = (e: any) => {
        const i = indexAt(e.clientX);
        if (i == null) return;
        drag.current = { start: i, moved: false };
        if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onMove = (e: any) => {
        const i = indexAt(e.clientX);
        if (i == null) return;
        const dr = drag.current;
        if (dr && (i !== dr.start || dr.moved)) {
            dr.moved = true;
            setSel([Math.min(dr.start, i), Math.max(dr.start, i)]);
        }
        setHover(i);
    };
    const onUp = (e: any) => {
        const dr = drag.current;
        drag.current = null;
        if (!dr || dr.moved) return;
        const i = indexAt(e.clientX);
        if (i == null) return;
        setSel(sel && sel[0] === i && sel[1] === i ? null : [i, i]);
    };
    const onKey = (e: any) => {
        const c = cursor == null ? (sel ? sel[1] : n - 1) : cursor;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setCursor(Math.max(0, Math.min(n - 1, c + (e.key === 'ArrowLeft' ? -1 : 1))));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey && sel) setSel([Math.min(sel[0], c), Math.max(sel[1], c)]);
            else setSel([c, c]);
        } else if (e.key === 'Escape') resetFocus();
    };

    const focusIdx = hover != null ? hover : cursor;
    const scope: Ev[][] = focusIdx != null ? [filtered[focusIdx]] : sel ? filtered.slice(sel[0], sel[1] + 1) : filtered;
    const t = totalsOf(scope);
    const all = totalsOf(filtered);
    const filteredAll = cats.length === categories.length && kind === 'all';
    const focusLabel =
        focusIdx != null
            ? bucketLabel(buckets[focusIdx], daily)
            : sel
              ? sel[0] === sel[1]
                  ? bucketLabel(buckets[sel[0]], daily)
                  : spanLabel(buckets[sel[0]], buckets[sel[1]], daily)
              : null;
    const selLabel = sel
        ? sel[0] === sel[1]
            ? bucketLabel(buckets[sel[0]], daily)
            : spanLabel(buckets[sel[0]], buckets[sel[1]], daily)
        : null;

    let compare: any = null;
    if (range.prior == null) compare = <span className={TEXT_TRIM}>No prior {range.short} to compare</span>;
    else {
        const rangeTotal = buckets.reduce((s, b) => s + b.events.length, 0);
        const base = filteredAll ? range.prior : (range.prior * all.total) / Math.max(1, rangeTotal);
        const ratio = base ? all.total / base : 0;
        const text =
            ratio >= 2
                ? `${(Math.round(ratio * 10) / 10).toString()}x`
                : Math.abs(ratio - 1) < 0.05
                  ? 'Level'
                  : `${ratio > 1 ? '+' : '−'}${Math.round(Math.abs(ratio - 1) * 100)}%`;
        compare = (
            <>
                <ToneBadge tone="outline" className="text-muted-foreground">
                    <span className={`tabular-nums ${TEXT_TRIM}`}>{text}</span>
                </ToneBadge>
                <span className="flex h-5 shrink-0 items-center">
                    <span className={TEXT_TRIM}>vs prior {range.short}</span>
                </span>
            </>
        );
    }

    const actorRank = Object.keys(t.actors).sort((a, b) => t.actors[b] - t.actors[a]);
    const top = actorRank[0];
    const topCount = top ? t.actors[top] : 0;

    const catCount = (k: string) =>
        buckets.reduce(
            (s, b) => s + b.events.filter((e) => e.cat === k && (kind === 'all' || actorKind[e.actor] === kind)).length,
            0
        );
    const filterParts: string[] =
        cats.length === categories.length ? [] : categories.filter((c) => cats.indexOf(c.key) >= 0).map((c) => c.label);
    if (kind !== 'all') filterParts.push(kind === 'person' ? 'People' : 'Service Accounts');
    const filterLabel = filteredAll ? 'All Events' : filterParts.join(', ');

    const xTicks =
        range.sizeMin === 360
            ? buckets.filter((b) => b.full && b.start.getUTCHours() === 0).map((b) => b.key)
            : range.sizeMin <= 5
              ? buckets.map((b) => b.key)
              : undefined;

    const csvText = () =>
        rowsToCsv(
            buckets.map((b, i) => {
                const tt = totalsOf([filtered[i]]);
                return {
                    start: b.start.toISOString(),
                    end: b.end.toISOString(),
                    success: tt.success,
                    denied: tt.denied,
                    failed: tt.failed,
                    total: tt.total,
                };
            }),
            [
                { key: 'start', label: 'Start' },
                { key: 'end', label: 'End' },
                { key: 'success', label: 'Success' },
                { key: 'denied', label: 'Denied' },
                { key: 'failed', label: 'Failed' },
                { key: 'total', label: 'Total' },
            ]
        );
    const summaryText = `${title}, last ${range.label.toLowerCase()} (${range.buckets.toLowerCase()}): ${num(all.total)} events, ${num(all.success)} success, ${num(all.denied)} denied, ${num(all.failed)} failed${reviews.length ? `; ${reviews.length} denials awaiting review` : ''}.`;
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };

    const kpis = [
        {
            label: 'Success Rate',
            value: pctOf(t.success, t.total),
            note: `${num(t.success)} of ${num(t.total)}`,
        },
        { label: 'Denied', value: num(t.denied), note: `${pctOf(t.denied, t.total)} of all` },
        { label: 'Failed', value: num(t.failed), note: `${pctOf(t.failed, t.total)} of all` },
    ];

    return (
        <Frame stacked className={`@container w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 grow basis-40 flex-col gap-px">
                    <FrameTitle>{title}</FrameTitle>
                    <FrameDescription className="truncate text-xs">
                        {selLabel ? `${selLabel.replace(/ UTC$/, '')} UTC selected` : `${range.buckets}, UTC`}
                    </FrameDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ToolbarGroup aria-label="Data scope">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-background"
                                        aria-label={`Time range: Last ${range.label.toLowerCase()}`}
                                    />
                                }
                            >
                                <Icon name="clock" />
                                <span className={TEXT_TRIM}>{range.label}</span>
                                <Icon name="chevron-down" className="text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-auto">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Time Range</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={range.key}
                                        onValueChange={(v: string) => {
                                            setRangeKey(v);
                                            resetFocus();
                                        }}
                                    >
                                        {ranges.map((r) => (
                                            <DropdownMenuRadioItem key={r.key} value={r.key}>
                                                <Icon name="clock" />
                                                {r.label}
                                                <span className="ms-auto ps-6 text-xs text-muted-foreground">
                                                    {r.buckets}
                                                </span>
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="max-w-56 bg-background"
                                        aria-label={`Events shown: ${filterLabel}`}
                                    />
                                }
                            >
                                <Icon name="list-filter" />
                                <span className={`overflow-x-clip text-ellipsis whitespace-nowrap ${TEXT_TRIM}`}>
                                    {filterLabel}
                                </span>
                                <Icon name="chevron-down" className="text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Categories</DropdownMenuLabel>
                                    {categories.map((c) => (
                                        <DropdownMenuCheckboxItem
                                            key={c.key}
                                            checked={cats.indexOf(c.key) >= 0}
                                            closeOnClick={false}
                                            onCheckedChange={(on: boolean) => {
                                                const next = categories
                                                    .map((x) => x.key)
                                                    .filter((k) => (k === c.key ? on : cats.indexOf(k) >= 0));
                                                if (next.length) {
                                                    setCats(next);
                                                    resetFocus();
                                                }
                                            }}
                                        >
                                            <Icon name={c.icon} />
                                            {c.label}
                                            <span className="ms-auto text-muted-foreground tabular-nums">
                                                {num(catCount(c.key))}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Actors</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={kind}
                                        onValueChange={(v: any) => {
                                            setKind(v);
                                            resetFocus();
                                        }}
                                    >
                                        <DropdownMenuRadioItem value="all" closeOnClick={false}>
                                            <Icon name="users" />
                                            All Actors
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="person" closeOnClick={false}>
                                            <Icon name="user" />
                                            People
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="service" closeOnClick={false}>
                                            <Icon name="bot" />
                                            Service Accounts
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Presets</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        disabled={filteredAll}
                                        onClick={() => {
                                            setCats(categories.map((c) => c.key));
                                            setKind('all');
                                            resetFocus();
                                        }}
                                    >
                                        <Icon name="rotate-ccw" />
                                        Show All
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCats(
                                                ['secrets', 'access'].filter((k) => categories.some((c) => c.key === k))
                                            );
                                            resetFocus();
                                        }}
                                    >
                                        <Icon name="shield-alert" />
                                        Secrets and Access
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                    <ToolbarGroup aria-label="Chart actions">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            aria-label="Refresh events"
                            title="Refresh events"
                            onClick={refresh}
                        >
                            <Icon name="refresh-cw" className={spin ? 'animate-spin' : ''} />
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
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export Range</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText(`audit-events-${range.key}.csv`, csvText());
                                            toast.success('CSV downloaded', {
                                                description: `audit-events-${range.key}.csv`,
                                            });
                                        }}
                                    >
                                        <Icon name="download" />
                                        Download CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText(
                                                `audit-events-${range.key}.json`,
                                                JSON.stringify(
                                                    {
                                                        range: range.key,
                                                        buckets: rows.map((r, i) => ({
                                                            start: buckets[i].start,
                                                            ...r,
                                                        })),
                                                    },
                                                    null,
                                                    2
                                                ),
                                                'application/json'
                                            );
                                            toast.success('JSON downloaded', {
                                                description: `audit-events-${range.key}.json`,
                                            });
                                        }}
                                    >
                                        <Icon name="file-json-2" />
                                        Export JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copy(csvText(), 'Data')}>
                                        <Icon name="copy" />
                                        Copy Data
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copy(summaryText, 'Summary')}>
                                        <Icon name="text" />
                                        Copy Summary
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Display</DropdownMenuLabel>
                                    <DropdownMenuCheckboxItem
                                        checked={faces}
                                        closeOnClick={false}
                                        onCheckedChange={(v: boolean) => setFaces(v)}
                                    >
                                        Denial Faces
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={auto}
                                        closeOnClick={false}
                                        onCheckedChange={(v: boolean) => {
                                            setAuto(v);
                                            toast.success(v ? 'Auto-refresh on' : 'Auto-refresh off', {
                                                description: v ? 'Every 30 seconds' : undefined,
                                            });
                                        }}
                                    >
                                        Auto-refresh
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>View</DropdownMenuLabel>
                                    <DropdownMenuItem disabled={!sel} onClick={() => setSel(null)}>
                                        <Icon name="x" />
                                        Clear Selection
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setRangeKey(defaultRange);
                                            setCats(categories.map((c) => c.key));
                                            setKind('all');
                                            setShown(OUTCOMES.map((o) => o.key));
                                            setFaces(true);
                                            resetFocus();
                                        }}
                                    >
                                        <Icon name="rotate-ccw" />
                                        Reset View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-column' : 'table'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                </div>
            </FrameHeader>
            <FramePanel className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex h-7 items-baseline gap-1.5">
                        <span className="text-2xl leading-7 font-semibold tracking-tight tabular-nums">
                            {num(t.total)}
                        </span>
                        <span className="text-sm text-muted-foreground">{t.total === 1 ? 'event' : 'events'}</span>
                    </div>
                    <FadeIn
                        key={focusLabel || 'range'}
                        className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
                    >
                        {focusLabel ? (
                            <span className={`truncate text-foreground ${TEXT_TRIM}`}>{focusLabel}</span>
                        ) : (
                            compare
                        )}
                    </FadeIn>
                    <span className="sr-only">
                        {t.success} success, {t.denied} denied, {t.failed} failed
                    </span>
                </div>
                <div className="flex flex-col gap-1.5 @md:items-end">
                    <ToggleGroup
                        multiple
                        variant="outline"
                        size="sm"
                        aria-label="Outcomes in the chart"
                        value={shown}
                        onValueChange={(v: string[]) => {
                            if (v.length) setShown(OUTCOMES.map((o) => o.key).filter((k) => v.indexOf(k) >= 0));
                        }}
                    >
                        {OUTCOMES.map((o) => (
                            <ToggleGroupItem
                                key={o.key}
                                value={o.key}
                                className="gap-1.5 px-2 text-[0.8rem] data-pressed:bg-background data-pressed:text-foreground"
                            >
                                <span
                                    className={`size-2 shrink-0 rounded-full ${o.dot} ${shown.indexOf(o.key) >= 0 ? '' : 'opacity-40'}`}
                                />
                                <span className={TEXT_TRIM}>{o.label}</span>
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    {showFaces && reviews.length ? (
                        <div className="flex h-5 items-center gap-2 text-xs text-muted-foreground">
                            <AvatarGroup size="xs" aria-hidden="true">
                                {reviews.slice(0, 3).map((r, k) => (
                                    <UserAvatar key={k} name={actorOf(r.actor).name} />
                                ))}
                            </AvatarGroup>
                            <span className={`tabular-nums ${TEXT_TRIM}`}>
                                <span className="font-medium text-foreground">{reviews.length}</span> awaiting review
                            </span>
                        </div>
                    ) : null}
                </div>
            </FramePanel>
            <FramePanel>
                <ChartFigure
                    title={`${title}, last ${range.label.toLowerCase()}`}
                    summary={summaryText}
                    view={view}
                    table={
                        <ChartDataTable
                            data={buckets.map((b, i) => {
                                const tt = totalsOf([filtered[i]]);
                                return {
                                    label: bucketLabel(b, daily),
                                    success: tt.success,
                                    denied: tt.denied,
                                    failed: tt.failed,
                                };
                            })}
                            index="label"
                            indexLabel="Bucket"
                            series={OUTCOMES.map((o) => ({ key: o.key, label: o.label }))}
                            caption={`${title}, last ${range.label.toLowerCase()}`}
                        />
                    }
                >
                    <div ref={surfaceRef} className="relative min-w-0">
                        <div
                            ref={plotRef}
                            role="group"
                            tabIndex={0}
                            aria-label="Events per bucket: Success, Denied, and Failed. Arrow keys move, Enter selects, Shift+Enter extends, Escape clears."
                            className="h-60 min-w-0 cursor-crosshair touch-pan-y rounded-md outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            onPointerDown={onDown}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            onPointerLeave={() => {
                                if (!drag.current) setHover(null);
                            }}
                            onKeyDown={onKey}
                            onBlur={() => setCursor(null)}
                        >
                            <ChartContainer config={{}} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.BarChart data={rows} margin={M} barSize={14}>
                                        <defs>
                                            {OUTCOMES.map((o) => (
                                                <pattern
                                                    key={o.key}
                                                    id={`${uid}-${o.key}`}
                                                    width="4"
                                                    height="4"
                                                    patternUnits="userSpaceOnUse"
                                                    patternTransform="rotate(45)"
                                                >
                                                    <rect
                                                        width="4"
                                                        height="4"
                                                        style={{
                                                            fill: `color-mix(in oklab, ${o.color} ${o.fill}%, var(--card))`,
                                                        }}
                                                    />
                                                    <line
                                                        x1="0.5"
                                                        x2="0.5"
                                                        y2="4"
                                                        strokeWidth="1"
                                                        style={{
                                                            stroke: `color-mix(in oklab, ${o.color} ${o.line}%, var(--card))`,
                                                        }}
                                                    />
                                                </pattern>
                                            ))}
                                        </defs>
                                        <Columns R={R} rows={rows} n={n} hover={focusIdx} sel={sel} />
                                        <R.XAxis
                                            dataKey="key"
                                            ticks={xTicks}
                                            interval={xTicks ? 0 : 'preserveEnd'}
                                            minTickGap={16}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            height={30}
                                            tickFormatter={(k: string) => {
                                                const b = buckets[Number(String(k).slice(1))];
                                                if (!b) return '';
                                                if (range.sizeMin === 360) return md(b.start);
                                                return daily ? md(b.start) : hm(b.start);
                                            }}
                                        />
                                        <R.YAxis
                                            width={AXIS_W}
                                            domain={[0, y.top]}
                                            ticks={y.ticks}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={2}
                                        />
                                        {order.map((k) => (
                                            <R.Bar
                                                key={k}
                                                dataKey={k}
                                                stackId="a"
                                                isAnimationActive={false}
                                                activeBar={false}
                                                shape={(p: any) => (
                                                    <Segment {...p} order={order} fillId={uid} base={240 - 30} />
                                                )}
                                            />
                                        ))}
                                    </R.BarChart>
                                )}
                            </ChartContainer>
                        </div>
                        {showFaces && step ? (
                            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                                {Object.keys(facesByBucket).map((k) => {
                                    const bi = Number(k);
                                    const list = facesByBucket[bi];
                                    return (
                                        <span
                                            key={`${rangeKey}-${k}`}
                                            data-alv-pop=""
                                            className="absolute flex h-5 items-center justify-center"
                                            style={{ left: xOf(bi) - 10, top: 0 }}
                                        >
                                            <AvatarGroup size="xs">
                                                {list.slice(0, 1).map((a, j) => (
                                                    <UserAvatar key={j} name={actorOf(a).name} />
                                                ))}
                                            </AvatarGroup>
                                        </span>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </ChartFigure>
            </FramePanel>
            <FramePanel className="p-0">
                <dl className="grid grid-cols-2 @xl:grid-cols-4!">
                    {kpis.map((k) => (
                        <div
                            key={k.label}
                            className="flex min-w-0 flex-col gap-1.5 px-(--frame-panel-px) py-(--frame-panel-py) even:border-s nth-[n+3]:border-t @xl:not-first:border-s @xl:nth-[n+3]:border-t-0!"
                        >
                            <dt className="flex h-4 items-center text-xs text-muted-foreground">
                                <span className={`overflow-x-clip text-ellipsis whitespace-nowrap ${TEXT_TRIM}`}>
                                    {k.label}
                                </span>
                            </dt>
                            <dd className="flex min-w-0 flex-col @xl:flex-row! @xl:items-center @xl:gap-2">
                                <span className="flex h-6 shrink-0 items-center">
                                    <span
                                        className={`text-base font-semibold whitespace-nowrap tabular-nums ${TEXT_TRIM}`}
                                    >
                                        {k.value}
                                    </span>
                                </span>
                                <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                                    <span
                                        className={`min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap ${TEXT_TRIM}`}
                                    >
                                        {k.note}
                                    </span>
                                </span>
                            </dd>
                        </div>
                    ))}
                    <div className="flex min-w-0 flex-col gap-1.5 border-t border-s px-(--frame-panel-px) py-(--frame-panel-py) @xl:border-t-0!">
                        <dt className="flex h-4 items-center text-xs text-muted-foreground">
                            <span className={TEXT_TRIM}>Actors</span>
                        </dt>
                        <dd className="flex min-w-0 flex-col @xl:flex-row! @xl:items-center @xl:gap-2">
                            <span className="flex h-6 shrink-0 items-center">
                                <span className={`text-base font-semibold whitespace-nowrap tabular-nums ${TEXT_TRIM}`}>
                                    {actorRank.length}
                                </span>
                            </span>
                            <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                                {!top ? (
                                    <span className={TEXT_TRIM}>No events</span>
                                ) : topCount === 1 && actorRank.length > 1 ? (
                                    <span className={`truncate ${TEXT_TRIM}`}>One event each</span>
                                ) : (
                                    <>
                                        <span className="sr-only">Top actor</span>
                                        <UserAvatar name={actorOf(top).name} size="xs" />
                                        <span className={`min-w-0 truncate ${TEXT_TRIM}`}>{actorOf(top).name}</span>
                                        {topCount > 1 ? (
                                            <span className={`shrink-0 ${TEXT_TRIM}`}>({num(topCount)})</span>
                                        ) : null}
                                    </>
                                )}
                            </span>
                        </dd>
                    </div>
                </dl>
            </FramePanel>
        </Frame>
    );
}

export default AuditLogVolume;
