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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation } from 'components:charts/chart-kit';
import { TRIM, LineSwatch, MetaRow, ToggleChip, DRAW_X, zeroTicks } from 'components:charts/line-kit';
import { CHANNELS, FORMATS, RANGES, DAILY, HOURLY } from './data';
import type { Channel, Format, SocialRange, Bucket } from './data';

/**
 * components:charts/social-engagement: one line per channel (Facebook / Instagram / LinkedIn) for the
 * chosen metric (engagement rate, engagements, impressions, link clicks), with optional dashed ghost
 * lines for the previous period. Range (24 hours hourly, 7 to 90 days daily, 6 months weekly), metric
 * and content-format pickers, channel toggles, a Display menu (channels, line style, previous period,
 * data points, gridlines), a per-channel breakdown table with share bars and changes, and hovering a
 * channel (toggle or table row) spotlights its line.
 *
 *   <SocialEngagement />                                        sample data
 *   <SocialEngagement channels={[…]} daily={[{ at: '2026-10-15', cells: [[imp, eng, clicks, posts], …] }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SocialEngagementProps = {
    title?: string;
    channels?: Channel[];
    formats?: Format[];
    ranges?: SocialRange[];
    daily?: Bucket[];
    hourly?: Bucket[];
    defaultRange?: string;
    defaultMetric?: MetricKey;
    updatedLabel?: string;
    className?: string;
};

type MetricKey = 'rate' | 'engagements' | 'impressions' | 'clicks';
const METRICS: { key: MetricKey; label: string; share: string }[] = [
    { key: 'rate', label: 'Engagement rate', share: 'Engagements' },
    { key: 'engagements', label: 'Engagements', share: 'Engagements' },
    { key: 'impressions', label: 'Impressions', share: 'Impressions' },
    { key: 'clicks', label: 'Link clicks', share: 'Link clicks' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Totals = { posts: number; impressions: number; engagements: number; clicks: number };

function count(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e6) return `${Number((v / 1e6).toFixed(1))}M`;
    if (a >= 1e5) return `${Number((v / 1e3).toFixed(1))}K`;
    return Math.round(v).toLocaleString('en-US');
}

function axisCount(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e6) return `${Number((v / 1e6).toFixed(1))}M`;
    if (a >= 1e3) return `${Number((v / 1e3).toFixed(1))}K`;
    return String(v);
}

function metricOf(t: Totals, m: MetricKey): number {
    if (m === 'rate') return t.impressions ? (t.engagements / t.impressions) * 100 : 0;
    return t[m];
}

function fmtMetric(v: number, m: MetricKey): string {
    return m === 'rate' ? `${v.toFixed(2)}%` : count(v);
}

/** Change: points for the rate, percent for counts. */
function change(cur: number, prev: number, m: MetricKey): number {
    if (m === 'rate') return cur - prev;
    return prev ? (cur / prev - 1) * 100 : 0;
}

function fmtChange(d: number, m: MetricKey): string {
    const digits = m === 'rate' ? 2 : 1;
    const r = Number(Math.abs(d).toFixed(digits));
    const sign = d < 0 && r !== 0 ? '-' : r !== 0 ? '+' : '';
    return `${sign}${Math.abs(d).toFixed(digits)}${m === 'rate' ? ' pts' : '%'}`;
}

function parseAt(at: string) {
    const [day, h] = at.split('T');
    const [y, mo, d] = day.split('-').map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d, h ? Number(h) : 0));
    return { y, mo, d, h: h ? Number(h) : null, dow: date.getUTCDay() };
}

function hour12(h: number): string {
    return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

function sumCells(buckets: Bucket[], ch: number, share: number): Totals {
    const t = { posts: 0, impressions: 0, engagements: 0, clicks: 0 };
    buckets.forEach((b) => {
        const c = b.cells[ch];
        t.impressions += c[0] * share;
        t.engagements += c[1] * share;
        t.clicks += c[2] * share;
        t.posts += Math.round(c[3] * share);
    });
    t.impressions = Math.round(t.impressions);
    t.engagements = Math.round(t.engagements);
    t.clicks = Math.round(t.clicks);
    return t;
}

function addTotals(list: Totals[]): Totals {
    return list.reduce(
        (a, t) => ({
            posts: a.posts + t.posts,
            impressions: a.impressions + t.impressions,
            engagements: a.engagements + t.engagements,
            clicks: a.clicks + t.clicks,
        }),
        { posts: 0, impressions: 0, engagements: 0, clicks: 0 }
    );
}

/** Closed Monday-to-Sunday weeks from the daily buckets, labelled by their Monday. */
function toWeeks(daily: Bucket[]): Bucket[] {
    const out: Bucket[] = [];
    let i = daily.findIndex((b) => parseAt(b.at).dow === 1);
    while (i >= 0 && i + 7 <= daily.length) {
        const days = daily.slice(i, i + 7);
        out.push({
            at: days[0].at,
            cells: days[0].cells.map((_, ch) =>
                [0, 1, 2, 3].map((k) => days.reduce((t, d) => t + d.cells[ch][k], 0))
            ) as any,
        });
        i += 7;
    }
    return out;
}

function Picker({
    label,
    icon,
    value,
    onValueChange,
    groups,
}: {
    label: string;
    icon: string;
    value: string;
    onValueChange: (v: string) => void;
    groups: { label?: string; items: { value: string; label: string; detail?: string }[] }[];
}) {
    const all = groups.flatMap((g) => g.items);
    const current = all.find((o) => o.value === value) || all[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" aria-label={label} className="min-w-0 bg-background" />}
            >
                <span className="flex h-5 min-w-0 items-center gap-2">
                    <span className="flex shrink-0 text-muted-foreground @max-md:hidden [&_svg]:size-4">
                        <Icon name={icon} />
                    </span>
                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                        {current.label}
                    </span>
                </span>
                <Icon name="chevron-down" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto min-w-52">
                <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                    {groups.map((g, gi) => (
                        <DropdownMenuGroup key={g.label || gi}>
                            {gi > 0 ? <DropdownMenuSeparator /> : null}
                            {g.label ? <DropdownMenuLabel>{g.label}</DropdownMenuLabel> : null}
                            {g.items.map((o) => (
                                <DropdownMenuRadioItem key={o.value} value={o.value}>
                                    <span className="flex w-full items-center justify-between gap-4">
                                        <span>{o.label}</span>
                                        {o.detail ? (
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {o.detail}
                                            </span>
                                        ) : null}
                                    </span>
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuGroup>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ChangeBadge({ value, metric }: { value: number; metric: MetricKey }) {
    const up = value >= 0;
    return (
        <span
            data-slot="badge"
            className={`inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:size-3 ${
                up
                    ? 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success'
                    : 'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive'
            }`}
        >
            <Icon name={up ? 'arrow-up' : 'arrow-down'} />
            <span className={TRIM}>{fmtChange(value, metric)}</span>
        </span>
    );
}

export function SocialEngagement({
    title = 'Social Engagement',
    channels = CHANNELS,
    formats = FORMATS,
    ranges = RANGES,
    daily = DAILY,
    hourly = HOURLY,
    defaultRange = '7d',
    defaultMetric = 'rate',
    updatedLabel = 'Updated 2 min ago',
    className,
}: SocialEngagementProps) {
    const initialRange = ranges.some((r) => r.key === defaultRange) ? defaultRange : ranges[0].key;
    const allOn = () => Object.fromEntries(channels.map((c) => [c.key, true])) as Record<string, boolean>;
    const [rangeKey, setRangeKey] = useState(initialRange);
    const [metric, setMetric] = useState<MetricKey>(defaultMetric);
    const [formatKey, setFormatKey] = useState(formats[0].key);
    const [shown, setShown] = useState<Record<string, boolean>>(allOn);
    const [curve, setCurve] = useState<'monotone' | 'linear' | 'step'>('monotone');
    const [previous, setPrevious] = useState(false);
    const [points, setPoints] = useState(false);
    const [grid, setGrid] = useState(true);
    const [spot, setSpot] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replay, setReplay] = useState(0);
    const [loading, setLoading] = useState(false);
    const range = ranges.find((r) => r.key === rangeKey) || ranges[0];
    const format = formats.find((f) => f.key === formatKey) || formats[0];
    const metricInfo = METRICS.find((m) => m.key === metric) || METRICS[0];

    const config = useMemo(
        () => Object.fromEntries(channels.map((c) => [c.key, series(c.light, c.dark, c.label)])),
        [channels]
    );

    const source = useMemo(() => {
        if (range.unit === 'hour') return hourly;
        if (range.unit === 'week') return toWeeks(daily);
        return daily;
    }, [range.unit, daily, hourly]);

    const slices = (r: SocialRange) => {
        const src = r.unit === 'hour' ? hourly : r.unit === 'week' ? toWeeks(daily) : daily;
        const n = Math.min(r.count, Math.floor(src.length / 2));
        return { cur: src.slice(src.length - n), prev: src.slice(src.length - n * 2, src.length - n) };
    };

    const model = useMemo(() => {
        const n = Math.min(range.count, Math.floor(source.length / 2));
        const cur = source.slice(source.length - n);
        const prev = source.slice(source.length - n * 2, source.length - n);
        const rows = cur.map((b, i) => {
            const p = prev[i];
            const row: any = { at: b.at, prevAt: p ? p.at : null };
            const curTotals: Totals[] = [];
            const prevTotals: Totals[] = [];
            channels.forEach((c, ch) => {
                const t = sumCells([b], ch, format.share[ch] != null ? format.share[ch] : 1);
                const pt = p ? sumCells([p], ch, format.share[ch] != null ? format.share[ch] : 1) : t;
                curTotals.push(t);
                prevTotals.push(pt);
                row[c.key] = metricOf(t, metric);
                row[`${c.key}Prev`] = metricOf(pt, metric);
            });
            row.all = metricOf(addTotals(curTotals), metric);
            row.allPrev = metricOf(addTotals(prevTotals), metric);
            return row;
        });
        const table = channels.map((c, ch) => {
            const s = format.share[ch] != null ? format.share[ch] : 1;
            return { channel: c, cur: sumCells(cur, ch, s), prev: sumCells(prev, ch, s) };
        });
        const total = { cur: addTotals(table.map((t) => t.cur)), prev: addTotals(table.map((t) => t.prev)) };
        return { rows, table, total };
    }, [source, range.count, channels, format, metric]);

    const { rows, table, total } = model;
    const visible = channels.filter((c) => shown[c.key]);
    const headline = metricOf(total.cur, metric);
    const headlinePrev = metricOf(total.prev, metric);

    let max = 0;
    rows.forEach((r) =>
        visible.forEach((c) => {
            max = Math.max(max, r[c.key], previous ? r[`${c.key}Prev`] : 0);
        })
    );
    const ticks = zeroTicks(max, 4);

    const label = (at: string, long = true): string => {
        const p = parseAt(at);
        if (range.unit === 'hour')
            return long ? `${DAYS[p.dow]}, ${MONTHS[p.mo - 1]} ${p.d}, ${hour12(p.h || 0)}` : hour12(p.h || 0);
        if (range.unit === 'week') return long ? `Week of ${MONTHS[p.mo - 1]} ${p.d}` : `${MONTHS[p.mo - 1]} ${p.d}`;
        if (!long && range.count <= 7) return DAYS[p.dow];
        return long ? `${DAYS[p.dow]}, ${MONTHS[p.mo - 1]} ${p.d}` : `${MONTHS[p.mo - 1]} ${p.d}`;
    };
    const vsLabel = (at: string | null, ref: string): string => {
        if (!at) return '';
        const p = parseAt(at);
        const year = p.y !== parseAt(ref).y ? `, ${p.y}` : '';
        if (range.unit === 'hour') return `vs ${MONTHS[p.mo - 1]} ${p.d}, ${hour12(p.h || 0)}`;
        return `vs ${MONTHS[p.mo - 1]} ${p.d}${year}`;
    };
    const from = (r: SocialRange): string => {
        const { cur } = slices(r);
        if (!cur.length) return '';
        const p = parseAt(cur[0].at);
        return r.unit === 'hour'
            ? `From ${MONTHS[p.mo - 1]} ${p.d}, ${hour12(p.h || 0)}`
            : `From ${MONTHS[p.mo - 1]} ${p.d}`;
    };
    const metricDetail = (m: MetricKey) => {
        const t = addTotals(
            channels.map((_, ch) => sumCells(slices(range).cur, ch, format.share[ch] != null ? format.share[ch] : 1))
        );
        return fmtMetric(metricOf(t, m), m);
    };
    const formatPosts = (f: Format) => {
        const cur = slices(range).cur;
        const posts = channels.reduce(
            (t, _, ch) => t + sumCells(cur, ch, f.share[ch] != null ? f.share[ch] : 1).posts,
            0
        );
        return `${posts} posts`;
    };

    const xTicks: string[] = [];
    for (let i = rows.length - 1; i >= 0; i -= range.tickEvery || 1) xTicks.unshift(rows[i].at);
    const firstAt = rows.length ? rows[0].at : '';
    const lastAt = rows.length ? rows[rows.length - 1].at : '';

    const rootRef = useRef<HTMLDivElement>(null);
    useEnterAnimation(
        rootRef,
        [{ selector: '.recharts-line', keyframes: DRAW_X, duration: 0.45, delay: 0, ease: [0.42, 0, 0.58, 1] }],
        [rangeKey, metric, formatKey, replay, view]
    );

    const refresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setReplay((v) => v + 1);
        }, 450);
    };
    const everyOn = channels.every((c) => shown[c.key]);
    const changed =
        rangeKey !== initialRange ||
        metric !== defaultMetric ||
        formatKey !== formats[0].key ||
        !everyOn ||
        curve !== 'monotone' ||
        previous ||
        points ||
        !grid;
    const reset = () => {
        setRangeKey(initialRange);
        setMetric(defaultMetric);
        setFormatKey(formats[0].key);
        setShown(allOn());
        setCurve('monotone');
        setPrevious(false);
        setPoints(false);
        setGrid(true);
    };
    const toggleChannel = (key: string, on: boolean) => {
        const next = { ...shown, [key]: on };
        if (channels.some((c) => next[c.key])) setShown(next);
    };

    const before = range.phrase.replace(/^last /, 'the ') + ' before';
    const description = `${format.label}, ${range.phrase}`;
    const summary = `${metricInfo.label} per ${range.unit} for ${visible.map((c) => c.label).join(', ')}, ${range.phrase}. All channels ${fmtMetric(
        headline,
        metric
    )}, ${fmtChange(change(headline, headlinePrev, metric), metric)} vs ${before}.`;
    const columns = [{ key: 'label', label: range.unit === 'hour' ? 'Hour' : range.unit === 'week' ? 'Week' : 'Date' }]
        .concat(channels.map((c) => ({ key: c.key, label: c.label })))
        .concat([{ key: 'all', label: 'All channels' }]);
    const exportRows = rows.map((r) => {
        const o: any = { label: label(r.at) };
        channels.forEach((c) => (o[c.key] = Number(r[c.key].toFixed(metric === 'rate' ? 2 : 0))));
        o.all = Number(r.all.toFixed(metric === 'rate' ? 2 : 0));
        return o;
    });
    const copySummary = `${title} (${description}): ${metricInfo.label} ${fmtMetric(headline, metric)} (${fmtChange(
        change(headline, headlinePrev, metric),
        metric
    )} vs ${before}). ${table
        .map((t) => `${t.channel.label} ${fmtMetric(metricOf(t.cur, metric), metric)}`)
        .join(', ')}.`;

    const shareKey: keyof Totals = metric === 'rate' ? 'engagements' : (metric as keyof Totals);
    const shareTotal = total.cur[shareKey] || 1;
    const dim = (key: string) => (spot && spot !== key ? 0.15 : 1);
    const spotProps = (key: string) => ({
        'data-spotlight': key,
        onMouseEnter: () => setSpot(key),
        onMouseLeave: () => setSpot(null),
        onFocus: () => setSpot(key),
        onBlur: () => setSpot(null),
    });
    const highlight = (col: MetricKey) => (metric === col ? 'text-foreground font-medium' : '');
    const th = 'h-10 px-2 align-middle font-medium whitespace-nowrap';
    /** Header text colour: the active metric's column is foreground, the rest muted. */
    const thc = (col?: MetricKey) => (col && metric === col ? 'text-foreground!' : 'text-muted-foreground');
    const td = 'p-2 align-middle whitespace-nowrap';

    return (
        <SeriesScope config={config} className={className}>
            <Frame className="@container min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle role="heading">{title}</FrameTitle>
                        <FrameDescription>{description}</FrameDescription>
                    </div>
                    <ChartToolbar className="w-full @3xl:w-auto!">
                        <Picker
                            label="Range"
                            icon="calendar-days"
                            value={rangeKey}
                            onValueChange={setRangeKey}
                            groups={['Hourly', 'Daily', 'Weekly']
                                .map((g) => ({
                                    label: g,
                                    items: ranges
                                        .filter((r) => r.group === g)
                                        .map((r) => ({ value: r.key, label: r.label, detail: from(r) })),
                                }))
                                .filter((g) => g.items.length)}
                        />
                        <div className="flex min-w-0 items-center gap-2 @max-md:order-last @max-md:w-full">
                            <Picker
                                label="Metric"
                                icon="activity"
                                value={metric}
                                onValueChange={(v) => setMetric(v as MetricKey)}
                                groups={[
                                    {
                                        label: 'Metric',
                                        items: METRICS.map((m) => ({
                                            value: m.key,
                                            label: m.label,
                                            detail: metricDetail(m.key),
                                        })),
                                    },
                                ]}
                            />
                            <Picker
                                label="Content"
                                icon="layers"
                                value={formatKey}
                                onValueChange={setFormatKey}
                                groups={[
                                    {
                                        label: 'Format',
                                        items: formats.map((f) => ({
                                            value: f.key,
                                            label: f.label,
                                            detail: formatPosts(f),
                                        })),
                                    },
                                ]}
                            />
                        </div>
                        <ToolbarGroup aria-label="Chart actions">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            aria-label="Display options"
                                            title="Display options"
                                            className="bg-background"
                                        />
                                    }
                                >
                                    <Icon name="settings-2" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-48">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Channels</DropdownMenuLabel>
                                        {channels.map((c) => (
                                            <DropdownMenuCheckboxItem
                                                key={c.key}
                                                checked={!!shown[c.key]}
                                                onCheckedChange={(v: boolean) => toggleChannel(c.key, !!v)}
                                            >
                                                <LineSwatch className="h-0.5 w-3" color={`var(--color-${c.key})`} />
                                                {c.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Line Style</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={curve} onValueChange={(v: any) => setCurve(v)}>
                                            <DropdownMenuRadioItem value="monotone">Smooth</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="linear">Linear</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="step">Stepped</DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={previous}
                                            onCheckedChange={(v: boolean) => setPrevious(!!v)}
                                        >
                                            <Icon name="history" />
                                            Previous Period
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={points}
                                            onCheckedChange={(v: boolean) => setPoints(!!v)}
                                        >
                                            <Icon name="circle-dot" />
                                            Data Points
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={grid}
                                            onCheckedChange={(v: boolean) => setGrid(!!v)}
                                        >
                                            <Icon name="grid-2x2" />
                                            Gridlines
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Refresh engagement"
                                title="Refresh engagement"
                                className="bg-background"
                                onClick={refresh}
                                disabled={loading}
                            >
                                <Icon
                                    name={loading ? 'loader-circle' : 'refresh-cw'}
                                    className={loading ? 'animate-spin' : ''}
                                />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            aria-label="More actions"
                                            title="More actions"
                                            className="bg-background"
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
                                                    `social-${metric}-${range.key}.csv`,
                                                    rowsToCsv(exportRows, columns)
                                                )
                                            }
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                downloadText(
                                                    `social-${metric}-${range.key}.json`,
                                                    JSON.stringify(exportRows, null, 2)
                                                )
                                            }
                                        >
                                            <Icon name="file-braces" />
                                            Download JSON
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                copyText(rowsToCsv(exportRows, columns));
                                            }}
                                        >
                                            <Icon name="table" />
                                            Copy Data
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                copyText(copySummary);
                                            }}
                                        >
                                            <Icon name="file-text" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>View</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'chart-line' : 'table'} />
                                            {view === 'table' ? 'View as Chart' : 'View as Table'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={reset} disabled={!changed}>
                                            <Icon name="rotate-ccw" />
                                            Reset View
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                        <div className="flex min-w-0 flex-col gap-3">
                            <span className="flex h-5 min-w-0 items-center text-sm text-muted-foreground">
                                <span className={`${TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    {metricInfo.label}, all channels
                                </span>
                            </span>
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
                                <span className={`${TRIM} text-3xl font-semibold tracking-tight tabular-nums`}>
                                    {fmtMetric(headline, metric)}
                                </span>
                                <ChangeBadge value={change(headline, headlinePrev, metric)} metric={metric} />
                                <span className="flex h-4 min-w-0 items-center text-xs text-muted-foreground tabular-nums">
                                    <span className={`${TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        vs {fmtMetric(metric === 'rate' ? headlinePrev : total.prev[metric], metric)}{' '}
                                        {before}
                                    </span>
                                </span>
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div
                                role="group"
                                aria-label="Channels in the chart"
                                className="flex flex-wrap items-center gap-1"
                            >
                                {channels.map((c) => (
                                    <span key={c.key} className="inline-flex" {...spotProps(c.key)}>
                                        <ToggleChip
                                            pressed={!!shown[c.key]}
                                            onPressedChange={(v) => toggleChannel(c.key, v)}
                                            tone="muted"
                                        >
                                            <LineSwatch className="h-0.5 w-3" color={`var(--color-${c.key})`} />
                                            <span className={TRIM}>{c.label}</span>
                                        </ToggleChip>
                                    </span>
                                ))}
                            </div>
                            <ToggleChip pressed={previous} onPressedChange={setPrevious} tone="muted">
                                <Icon name="history" className="size-3.5" />
                                <span className={TRIM}>Previous period</span>
                            </ToggleChip>
                        </div>
                    </div>
                    <ChartFigure
                        title={`${title}: ${metricInfo.label}`}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={exportRows}
                                index="label"
                                indexLabel={columns[0].label}
                                series={channels
                                    .map((c) => ({ key: c.key, label: c.label }))
                                    .concat([{ key: 'all', label: 'All channels' }])}
                                valueFormatter={(v: number) => fmtMetric(v, metric)}
                                caption={`${metricInfo.label}, ${description}`}
                            />
                        }
                    >
                        <div
                            ref={rootRef}
                            className="h-72 w-full [&_.recharts-cartesian-grid]:transition-opacity [&_.recharts-cartesian-grid]:duration-200 data-[grid=off]:[&_.recharts-cartesian-grid]:opacity-0"
                            data-grid={grid ? 'on' : 'off'}
                        >
                            <ChartContainer config={config} className="aspect-auto h-full w-full">
                                {(R: any) => (
                                    <R.LineChart
                                        key={`${rangeKey}-${metric}-${formatKey}-${replay}`}
                                        data={rows}
                                        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                                        accessibilityLayer
                                    >
                                        <R.CartesianGrid vertical={false} />
                                        <R.XAxis
                                            dataKey="at"
                                            ticks={xTicks}
                                            interval={0}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            tick={(p: any) => (
                                                <text
                                                    x={p.x}
                                                    y={p.y}
                                                    textAnchor={
                                                        p.payload.value === firstAt
                                                            ? 'start'
                                                            : p.payload.value === lastAt
                                                              ? 'end'
                                                              : 'middle'
                                                    }
                                                    fill="var(--muted-foreground)"
                                                    className="recharts-text recharts-cartesian-axis-tick-value"
                                                >
                                                    <tspan x={p.x} dy="0.71em">
                                                        {label(p.payload.value, false)}
                                                    </tspan>
                                                </text>
                                            )}
                                        />
                                        <R.YAxis
                                            width={metric === 'rate' ? 30 : 40}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={4}
                                            domain={[0, ticks[ticks.length - 1]]}
                                            ticks={ticks}
                                            tickFormatter={(v: number) => (metric === 'rate' ? `${v}%` : axisCount(v))}
                                        />
                                        <R.Tooltip
                                            isAnimationActive={false}
                                            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const r = payload[0].payload;
                                                const line = (sw: any, name: string, v: number, pv: number) => {
                                                    const d = change(v, pv, metric);
                                                    return (
                                                        <span className="flex h-4 items-center gap-2 text-muted-foreground">
                                                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                                                {sw}
                                                                <span
                                                                    className={`${TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                                >
                                                                    {name}
                                                                </span>
                                                            </span>
                                                            <span
                                                                className={`${TRIM} font-mono font-medium text-foreground tabular-nums`}
                                                            >
                                                                {fmtMetric(v, metric)}
                                                            </span>
                                                            <span
                                                                className={`${TRIM} w-16 text-end tabular-nums ${d >= 0 ? 'text-success' : 'text-destructive'}`}
                                                            >
                                                                {fmtChange(d, metric)}
                                                            </span>
                                                        </span>
                                                    );
                                                };
                                                return (
                                                    <div className="grid w-64 min-w-32 items-start rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                        <div className="flex flex-1 flex-col gap-2">
                                                            <span className="flex h-4 items-center justify-between gap-3">
                                                                <span className={`${TRIM} font-medium tabular-nums`}>
                                                                    {label(r.at)}
                                                                </span>
                                                                <span
                                                                    className={`${TRIM} text-muted-foreground tabular-nums`}
                                                                >
                                                                    {vsLabel(r.prevAt, r.at)}
                                                                </span>
                                                            </span>
                                                            <div
                                                                role="separator"
                                                                className="h-px w-full shrink-0 bg-border"
                                                            />
                                                            <div className="flex flex-col gap-1.5">
                                                                {visible.map((c) => (
                                                                    <span key={c.key} className="contents">
                                                                        {line(
                                                                            <LineSwatch
                                                                                className="h-0.5 w-3"
                                                                                color={`var(--color-${c.key})`}
                                                                            />,
                                                                            c.label,
                                                                            r[c.key],
                                                                            r[`${c.key}Prev`]
                                                                        )}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div
                                                                role="separator"
                                                                className="h-px w-full shrink-0 bg-border"
                                                            />
                                                            {line(null, 'All channels', r.all, r.allPrev)}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        {visible.map((c) => (
                                            <R.Line
                                                key={c.key}
                                                dataKey={c.key}
                                                name={c.label}
                                                type={curve}
                                                className="transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                style={{ opacity: dim(c.key) }}
                                                stroke={`var(--color-${c.key})`}
                                                strokeWidth={2}
                                                dot={
                                                    points
                                                        ? { r: 2.5, fill: `var(--color-${c.key})`, strokeWidth: 0 }
                                                        : false
                                                }
                                                activeDot={{
                                                    r: 4,
                                                    fill: `var(--color-${c.key})`,
                                                    stroke: 'var(--card)',
                                                    strokeWidth: 2,
                                                }}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                        {previous
                                            ? visible.map((c) => (
                                                  <R.Line
                                                      key={`${c.key}-prev`}
                                                      dataKey={`${c.key}Prev`}
                                                      name={`${c.label}, previous period`}
                                                      type={curve}
                                                      className="transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                      style={{ opacity: dim(c.key) }}
                                                      stroke={`var(--color-${c.key})`}
                                                      strokeOpacity={0.5}
                                                      strokeWidth={1.5}
                                                      strokeDasharray="4 4"
                                                      dot={false}
                                                      activeDot={false}
                                                      isAnimationActive={false}
                                                  />
                                              ))
                                            : null}
                                    </R.LineChart>
                                )}
                            </ChartContainer>
                        </div>
                    </ChartFigure>
                    <div className="-mx-(--frame-panel-px) -mb-(--frame-panel-py) overflow-x-auto border-t">
                        <table className="w-full caption-bottom text-sm">
                            <caption className="sr-only">
                                Totals by channel, {format.label.toLowerCase()}, {range.phrase}
                            </caption>
                            <thead>
                                <tr className="border-b">
                                    <th className={`${th} ${thc()} ps-4 text-start`}>Channel</th>
                                    <th className={`${th} ${thc()} text-end @max-2xl:hidden`}>Posts</th>
                                    <th className={`${th} ${thc('impressions')} text-end @max-2xl:hidden`}>
                                        Impressions
                                    </th>
                                    <th className={`${th} ${thc('engagements')} text-end @max-2xl:hidden`}>
                                        Engagements
                                    </th>
                                    <th className={`${th} ${thc('rate')} text-end`}>Eng. Rate</th>
                                    <th className={`${th} ${thc('clicks')} text-end @max-2xl:hidden`}>Link Clicks</th>
                                    <th className={`${th} ${thc()} w-44 text-start @max-md:hidden`}>
                                        Share of {metricInfo.share}
                                    </th>
                                    <th className={`${th} ${thc()} pe-4! text-end`}>Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {table.map((t) => {
                                    const share = (t.cur[shareKey] / shareTotal) * 100;
                                    const cell = (col: MetricKey, v: string, hide = true) => (
                                        <td
                                            className={`${td} text-end tabular-nums ${hide ? '@max-2xl:hidden' : ''} ${highlight(col)}`}
                                        >
                                            {v}
                                        </td>
                                    );
                                    return (
                                        <tr
                                            key={t.channel.key}
                                            tabIndex={0}
                                            className="border-b transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                                            {...spotProps(t.channel.key)}
                                        >
                                            <td className={`${td} ps-4`}>
                                                <span className="flex h-5 min-w-0 items-center gap-2">
                                                    <LineSwatch
                                                        className="h-0.5 w-3"
                                                        color={`var(--color-${t.channel.key})`}
                                                    />
                                                    <span
                                                        className={`${TRIM} overflow-x-clip font-medium text-ellipsis whitespace-nowrap`}
                                                    >
                                                        {t.channel.label}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={`${td} text-end tabular-nums @max-2xl:hidden`}>
                                                {t.cur.posts}
                                            </td>
                                            {cell('impressions', count(t.cur.impressions))}
                                            {cell('engagements', count(t.cur.engagements))}
                                            {cell('rate', fmtMetric(metricOf(t.cur, 'rate'), 'rate'), false)}
                                            {cell('clicks', count(t.cur.clicks))}
                                            <td className={`${td} @max-md:hidden`}>
                                                <span className="flex h-5 items-center gap-3">
                                                    <span
                                                        role="progressbar"
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={share}
                                                        aria-label={`${t.channel.label}, ${Math.round(share)}% of ${metricInfo.share.toLowerCase()}`}
                                                        className="relative flex h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
                                                    >
                                                        <span
                                                            className="h-full rounded-full bg-(--color-current) transition-all"
                                                            style={
                                                                {
                                                                    width: `${share}%`,
                                                                    '--color-current': `var(--color-${t.channel.key})`,
                                                                } as any
                                                            }
                                                        />
                                                    </span>
                                                    <span
                                                        className={`${TRIM} w-8 text-end text-xs text-muted-foreground tabular-nums`}
                                                    >
                                                        {Math.round(share)}%
                                                    </span>
                                                </span>
                                            </td>
                                            <td className={`${td} text-end pe-4!`}>
                                                <ChangeBadge
                                                    value={change(
                                                        metricOf(t.cur, metric),
                                                        metricOf(t.prev, metric),
                                                        metric
                                                    )}
                                                    metric={metric}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-muted/30 font-medium">
                                    <td className={`${td} ps-4`}>
                                        <span className="flex h-5 items-center">
                                            <span className={TRIM}>All channels</span>
                                        </span>
                                    </td>
                                    <td className={`${td} text-end tabular-nums @max-2xl:hidden`}>{total.cur.posts}</td>
                                    <td
                                        className={`${td} text-end tabular-nums @max-2xl:hidden ${highlight('impressions')}`}
                                    >
                                        {count(total.cur.impressions)}
                                    </td>
                                    <td
                                        className={`${td} text-end tabular-nums @max-2xl:hidden ${highlight('engagements')}`}
                                    >
                                        {count(total.cur.engagements)}
                                    </td>
                                    <td className={`${td} text-end tabular-nums ${highlight('rate')}`}>
                                        {fmtMetric(metricOf(total.cur, 'rate'), 'rate')}
                                    </td>
                                    <td
                                        className={`${td} text-end tabular-nums @max-2xl:hidden ${highlight('clicks')}`}
                                    >
                                        {count(total.cur.clicks)}
                                    </td>
                                    <td className={`${td} @max-md:hidden`}>
                                        <span className="flex h-5 items-center gap-3">
                                            <span
                                                role="img"
                                                aria-label={`Share of ${metricInfo.share.toLowerCase()}: ${table
                                                    .map(
                                                        (t) =>
                                                            `${t.channel.label} ${Math.round((t.cur[shareKey] / shareTotal) * 100)}%`
                                                    )
                                                    .join(', ')}`}
                                                className="flex min-w-16 flex-1 items-center gap-0.5"
                                            >
                                                {table.map((t) => (
                                                    <span
                                                        key={t.channel.key}
                                                        className="h-1.5 min-w-1 basis-0 rounded-full bg-(--color-current)"
                                                        style={
                                                            {
                                                                flexGrow: (t.cur[shareKey] / shareTotal) * 100,
                                                                '--color-current': `var(--color-${t.channel.key})`,
                                                            } as any
                                                        }
                                                    />
                                                ))}
                                            </span>
                                            <span aria-hidden="true" className="w-8" />
                                        </span>
                                    </td>
                                    <td className={`${td} text-end pe-4!`}>
                                        <ChangeBadge value={change(headline, headlinePrev, metric)} metric={metric} />
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center gap-2">
                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
                        <span className={TRIM}>{updatedLabel}</span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className={TRIM}>
                            Closed {range.unit === 'hour' ? 'hours' : range.unit === 'week' ? 'weeks' : 'days'}, UTC
                        </span>
                    </span>
                    <MetaRow items={['Rate is engagements per impression']} />
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default SocialEngagement;
