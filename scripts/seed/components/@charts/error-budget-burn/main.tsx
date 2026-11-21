import { useMemo, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
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
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { useElementWidth } from 'components:charts/chart-kit';
import {
    TEXT_TRIM,
    IconTile,
    ToneBadge,
    SelectMenu,
    useFadeIn,
    addDays,
    fmtDay,
    pct,
} from 'components:charts/bar-more-kit';
import { SLOS, TODAY } from './data';
import type { Slo } from './data';

/**
 * components:charts/error-budget-burn: an SLO's daily error-budget burn-down as lollipops (stem from 0%,
 * an even-burn tick per day, a dot toned by what is left), a forecast of hollow dots, a warn line, an
 * over-budget ribbon, incident / event markers and date pills; KPI tiles (budget, attained, burn, daily
 * pace, runs out), an SLO picker, burn-alert toggles with mute, deploy freeze, CSV / JSON exports.
 * Hover a day for its spend, click to pin it, drag across days to sum spend (Arrow keys / Enter /
 * Shift+Enter / Escape on the keyboard).
 *
 *   <ErrorBudgetBurn />                       sample data
 *   <ErrorBudgetBurn slos={[{ key, name, status, target, windowDays, remaining: [...], forecast: [...], ... }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type ErrorBudgetBurnProps = {
    title?: string;
    slos?: Slo[];
    defaultSlo?: string;
    /** Last day of every window (ISO date). */
    today?: string;
    /** Warn line, % of budget left. */
    warnAt?: number;
    className?: string;
};

const ALERTS = [
    { key: 'fast', label: 'Fast Burn', icon: 'zap', note: '14.4× over 1h, page' },
    { key: 'medium', label: 'Medium Burn', icon: 'flame', note: '6× over 6h, page' },
    { key: 'slow', label: 'Slow Burn', icon: 'clock', note: '1× over 3d, ticket' },
];

const STATUS_LABEL: Record<string, string> = { exhausted: 'Exhausted', 'at-risk': 'At Risk', healthy: 'Healthy' };
const STATUS_TONE: Record<string, 'destructive' | 'warning' | 'success'> = {
    exhausted: 'destructive',
    'at-risk': 'warning',
    healthy: 'success',
};

/** Chart margins (plot inset inside the surface). */
const M = { top: 10, right: 12, bottom: 4, left: 12 };

type Day = {
    i: number;
    key: string;
    date: Date;
    label: string;
    value: number;
    spent: number;
    even: number | null;
    forecast: boolean;
    today: boolean;
    event?: { id: string; title: string };
    span: [number, number];
    state: string;
};

function toneOf(v: number, warnAt: number): string {
    return v < 0 ? 'destructive' : v < warnAt ? 'warning' : 'success';
}

/** One day: stem from 0%, dotted gap up to the even-burn tick, the tick, and the dot. */
function Lollipop(props: any) {
    const { R, payload: d, x, width, warnAt } = props;
    const yScale = R.useYAxisScale ? R.useYAxisScale() : null;
    if (!yScale || !d) return null;
    const cx = x + width / 2;
    const zero = yScale(0);
    const cy = yScale(d.value);
    const tone = `var(--${toneOf(d.value, warnAt)})`;
    const active = d.state === 'active';
    const neg = d.value < 0;
    const parts: any[] = [];
    if (d.forecast) {
        const end = neg ? cy - 6.5 : cy + 6.5;
        if (neg ? end > zero : end < zero)
            parts.push(
                <line
                    key="s"
                    x1={cx}
                    x2={cx}
                    y1={zero}
                    y2={end}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray="1.5 3.5"
                />
            );
        parts.push(
            <circle key="d" cx={cx} cy={cy} r={active ? 4.5 : 3.5} fill="var(--card)" stroke={tone} strokeWidth={1.5} />
        );
        return <g aria-hidden="true">{parts}</g>;
    }
    const gap = (active ? 5 : 4) + 3;
    const end = neg ? cy - gap : cy + gap;
    if (neg ? end > zero : end < zero)
        parts.push(
            <line
                key="s"
                x1={cx}
                x2={cx}
                y1={zero}
                y2={end}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.32}
                strokeWidth={1.5}
                strokeLinecap="round"
            />
        );
    if (d.even != null) {
        const ty = yScale(d.even);
        const from = neg ? zero : cy - 5;
        if (d.value < d.even && from > ty)
            parts.push(
                <line
                    key="g"
                    x1={cx}
                    x2={cx}
                    y1={from}
                    y2={ty}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.35}
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeDasharray="1 2"
                />
            );
        parts.push(
            <line
                key="t"
                x1={cx - 3.5}
                x2={cx + 3.5}
                y1={ty}
                y2={ty}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeLinecap="round"
            />
        );
    }
    if (active) {
        parts.push(<circle key="h" cx={cx} cy={cy} r={10} fill={tone} fillOpacity={0.18} />);
        parts.push(<circle key="c" cx={cx} cy={cy} r={7} fill="var(--card)" />);
        parts.push(<circle key="d" cx={cx} cy={cy} r={5} fill={tone} />);
    } else {
        if (d.event)
            parts.push(
                <circle
                    key="e"
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill="none"
                    stroke={d.value < warnAt ? 'var(--destructive)' : 'var(--muted-foreground)'}
                    strokeOpacity={0.35}
                    strokeWidth={1.5}
                />
            );
        parts.push(
            <circle
                key="d"
                cx={cx}
                cy={cy}
                r={4}
                fill={tone}
                opacity={toneOf(d.value, warnAt) === 'success' ? 0.7 : undefined}
            />
        );
    }
    return <g aria-hidden="true">{parts}</g>;
}

/** A label over a reference line (left aligned, card halo). */
function RefLabel({
    viewBox,
    dy,
    className,
    children,
}: {
    viewBox: any;
    dy: number;
    className: string;
    children?: any;
}) {
    if (!viewBox) return null;
    return (
        <text
            x={viewBox.x}
            y={viewBox.y + dy}
            textAnchor="start"
            stroke="var(--card)"
            strokeWidth={4}
            paintOrder="stroke"
            className={`pointer-events-none text-xs font-medium ${className}`}
        >
            {children}
        </text>
    );
}

const PILL =
    'absolute top-0 left-0 flex h-6 min-w-6 items-center justify-center rounded-full text-xs whitespace-nowrap tabular-nums';

export function ErrorBudgetBurn({
    title = 'Error Budget',
    slos = SLOS,
    defaultSlo,
    today = TODAY,
    warnAt = 25,
    className,
}: ErrorBudgetBurnProps) {
    const [sloKey, setSloKey] = useState(defaultSlo || (slos[0] && slos[0].key));
    const slo = slos.find((s) => s.key === sloKey) || slos[0];
    const [hover, setHover] = useState<number | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [range, setRange] = useState<[number, number] | null>(null);
    const [cursor, setCursor] = useState<number | null>(null);
    const [alerts, setAlerts] = useState<Record<string, boolean>>({ fast: true, medium: true, slow: true });
    const [muted, setMuted] = useState(false);
    const [lifted, setLifted] = useState<Record<string, boolean>>({});
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const drag = useRef<{ start: number; moved: boolean } | null>(null);
    const plotRef = useRef<HTMLDivElement>(null);
    const fadeRef = useRef<HTMLDivElement>(null);
    useFadeIn(fadeRef, [slo.key, view]);

    const n = slo.remaining.length;
    const todayIdx = n - 1;
    const total = n + slo.forecast.length;
    const sel = selected == null ? todayIdx : selected;

    const days: Day[] = useMemo(() => {
        const out: Day[] = [];
        const all = slo.remaining.concat(slo.forecast);
        const evs: Record<number, { id: string; title: string }> = {};
        slo.events.forEach((e) => {
            evs[e.day] = { id: e.id, title: e.title };
        });
        all.forEach((v, i) => {
            const date = addDays(today, i - todayIdx);
            const prev = i === 0 ? 100 : all[i - 1];
            out.push({
                i,
                key: `d${i}`,
                date,
                label: fmtDay(date),
                value: v,
                spent: prev - v,
                even: i < n ? 100 * (1 - (i + 1) / n) : null,
                forecast: i >= n,
                today: i === todayIdx,
                event: evs[i],
                span: [Math.min(0, v), Math.max(0, v)],
                state: '',
            });
        });
        return out;
    }, [slo, today, n, todayIdx]);

    const shownHover = hover != null ? hover : cursor;
    const activeSet: Record<number, boolean> = {};
    if (range) {
        activeSet[range[0]] = true;
        activeSet[range[1]] = true;
    } else activeSet[sel] = true;
    if (shownHover != null) activeSet[shownHover] = true;
    const rows = days.map((d) => ({ ...d, state: activeSet[d.i] ? 'active' : '' }));

    const values = slo.remaining.concat(slo.forecast);
    const lo = Math.min(-6, Math.floor(Math.min(...values) / 20) * 20);
    const now = slo.remaining[todayIdx];
    const over = now < 0;
    const hasIncident = slo.events.some((e) => slo.remaining.concat(slo.forecast)[e.day] < warnAt);

    // x geometry of the plot (matches the bar band centres)
    const plotW = useElementWidth(plotRef);
    const step = plotW ? (plotW - M.left - M.right) / total : 0;
    const xOf = (i: number) => M.left + (i + 0.5) * step;
    const indexAt = (clientX: number) => {
        const el = plotRef.current;
        if (!el || !step) return null;
        const r = el.getBoundingClientRect();
        const i = Math.floor((clientX - r.left - M.left) / step);
        return Math.max(0, Math.min(total - 1, i));
    };

    const onDown = (e: any) => {
        const i = indexAt(e.clientX);
        if (i == null) return;
        drag.current = { start: Math.min(i, todayIdx), moved: false };
        if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onMove = (e: any) => {
        const i = indexAt(e.clientX);
        if (i == null) return;
        const dr = drag.current;
        if (dr) {
            const j = Math.min(i, todayIdx);
            if (j !== dr.start || dr.moved) {
                dr.moved = true;
                setRange([Math.min(dr.start, j), Math.max(dr.start, j)]);
                setHover(null);
                return;
            }
        }
        setHover(i);
    };
    const onUp = (e: any) => {
        const dr = drag.current;
        drag.current = null;
        if (!dr) return;
        if (!dr.moved) {
            const i = indexAt(e.clientX);
            if (i == null) return;
            setRange(null);
            setSelected(i === sel && selected != null ? null : i);
        } else setHover(null);
    };
    const onLeave = () => {
        if (!drag.current) setHover(null);
    };
    const onKey = (e: any) => {
        const c = cursor == null ? sel : cursor;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setCursor(Math.max(0, Math.min(total - 1, c + (e.key === 'ArrowLeft' ? -1 : 1))));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                const a = Math.min(sel, Math.min(c, todayIdx));
                const b = Math.max(sel, Math.min(c, todayIdx));
                setRange(a === b ? null : [a, b]);
            } else {
                setRange(null);
                setSelected(c);
            }
        } else if (e.key === 'Escape') {
            setRange(null);
            setSelected(null);
            setCursor(null);
        }
    };

    const changeSlo = (k: string) => {
        setSloKey(k);
        setSelected(null);
        setRange(null);
        setHover(null);
        setCursor(null);
    };

    const dayPill = (d: Day) => `${pct(d.value)} ${d.value < 0 ? 'over' : 'left'}`;
    const focus = shownHover != null ? days[shownHover] : range ? null : days[sel];
    const rangeSpent = range ? (range[0] === 0 ? 100 : days[range[0] - 1].value) - days[range[1]].value : 0;
    const rangeEvents = range ? slo.events.filter((e) => e.day >= range[0] && e.day <= range[1]) : [];

    // axis pills: weekly from today, events, first label with the month, active days, the forecast end
    const labelled: Record<number, boolean> = {};
    for (let i = todayIdx; i >= 0; i -= n <= 7 ? 1 : 7) labelled[i] = true;
    slo.events.forEach((e) => {
        labelled[e.day] = true;
    });
    Object.keys(activeSet).forEach((k) => {
        labelled[Number(k)] = true;
    });
    labelled[total - 1] = true;
    const firstLabelled = Object.keys(labelled)
        .map(Number)
        .sort((a, b) => a - b)[0];
    const pillText = (d: Day) =>
        d.i === firstLabelled || d.i === total - 1 || d.date.getUTCDate() === 1 ? d.label : String(d.date.getUTCDate());
    const pillClass = (d: Day) => {
        const long = pillText(d).length > 2 ? 'px-2' : 'px-1';
        if (activeSet[d.i]) return `${PILL} ${long} bg-foreground font-semibold text-background`;
        if (d.today) return `${PILL} ${long} font-medium bg-card text-foreground ring-1 ring-foreground/20 ring-inset`;
        if (d.event)
            return d.value < warnAt
                ? `${PILL} ${long} font-medium bg-destructive/10 text-destructive ring-1 ring-destructive/25 ring-inset`
                : `${PILL} ${long} font-medium bg-muted text-foreground ring-1 ring-muted-foreground/30 ring-inset`;
        if (d.i === total - 1) return `${PILL} ${long} font-medium text-muted-foreground ring-1 ring-border ring-inset`;
        return `${PILL} ${long} font-medium bg-muted text-muted-foreground`;
    };

    // band behind the focused day / range
    let band: { x: number; w: number } | null = null;
    if (step) {
        if (focus) band = { x: xOf(focus.i) - 14, w: 28 };
        else if (range) band = { x: xOf(range[0]) - 14, w: xOf(range[1]) - xOf(range[0]) + 28 };
    }
    const topX = focus ? xOf(focus.i) : range ? (xOf(range[0]) + xOf(range[1])) / 2 : 0;

    const frozen = slo.frozen && !lifted[slo.key];
    const onCount = ALERTS.filter((a) => alerts[a.key]).length;
    const alertLabel = muted
        ? 'All Muted'
        : onCount === 3
          ? 'Alerts On'
          : onCount === 0
            ? 'Alerts Off'
            : `${onCount} of 3 On`;

    const burn1h = parseFloat(slo.burn1h);
    const burnTone =
        burn1h >= 14.4
            ? ' text-destructive'
            : burn1h >= 6
              ? ' text-warning-foreground dark:text-warning'
              : ' text-foreground';
    const paceTone =
        parseFloat(slo.dailyPace) > parseFloat(slo.evenPace.replace(/[^\d.]/g, ''))
            ? ' text-warning-foreground dark:text-warning'
            : '';
    const runsTone =
        slo.runsOut.label === 'Ran out'
            ? ' text-destructive'
            : slo.runsOut.value === 'Holds'
              ? ' text-muted-foreground'
              : /in [1-7] days?,/.test(slo.runsOut.note)
                ? ' text-warning-foreground dark:text-warning'
                : '';

    const tableRows = days.map((d) => ({
        label: `${d.label}${d.forecast ? ' (forecast)' : ''}`,
        remaining: Math.round(d.value * 10) / 10,
        spent: Math.round(d.spent * 10) / 10,
    }));
    const summary = `${slo.name} error budget, last ${n} days: ${pct(now)} ${over ? 'over budget' : 'left'}, target ${slo.target}%. ${slo.budgetNote}${slo.events.length ? ` Events: ${slo.events.map((e) => `${days[e.day].label} ${e.id} ${e.title}`).join('; ')}.` : ''}`;
    const csvText = () =>
        rowsToCsv(
            days.map((d) => ({
                date: d.date.toISOString().slice(0, 10),
                remaining: d.value,
                spent: Math.round(d.spent * 100) / 100,
                even: d.even == null ? '' : Math.round(d.even * 100) / 100,
                forecast: d.forecast ? 'yes' : 'no',
                event: d.event ? `${d.event.id} ${d.event.title}` : '',
            })),
            [
                { key: 'date', label: 'Date' },
                { key: 'remaining', label: 'Budget left %' },
                { key: 'spent', label: 'Spent %' },
                { key: 'even', label: 'Even burn %' },
                { key: 'forecast', label: 'Forecast' },
                { key: 'event', label: 'Event' },
            ]
        );
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };

    const footerLegend = (
        <div className="flex items-center gap-4 max-sm:hidden">
            <span className="flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                    <line
                        x1="2.5"
                        x2="9.5"
                        y1="6"
                        y2="6"
                        stroke="currentColor"
                        strokeOpacity={0.55}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
                Even burn
            </span>
            <span className="flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                    <circle cx="6" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Forecast
            </span>
            <span className="flex items-center gap-1.5">
                <span
                    className={`size-3 shrink-0 rounded-full ring-1 ring-inset ${hasIncident ? 'bg-destructive/10 ring-destructive/25' : 'bg-muted ring-muted-foreground/30'}`}
                />
                {hasIncident ? 'Incident' : 'Event'}
            </span>
        </div>
    );

    let footerEnd: any = <span>Drag across days to sum spend</span>;
    const footFocus = shownHover != null ? days[shownHover] : !range && selected != null ? days[sel] : null;
    if (footFocus)
        footerEnd = (
            <>
                <span className="shrink-0 font-medium text-foreground">{footFocus.label}</span>
                <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="shrink-0">
                    {footFocus.forecast ? 'Forecast, ' : ''}
                    {pct(footFocus.spent)} spent
                </span>
                {footFocus.event ? (
                    <>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="truncate">{footFocus.event.title}</span>
                    </>
                ) : null}
            </>
        );
    else if (range)
        footerEnd = (
            <>
                <span className="shrink-0 font-medium text-foreground">{pct(rangeSpent)} spent</span>
                <span className="truncate">
                    {days[range[0]].label} to {days[range[1]].label}
                </span>
                <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="shrink-0">
                    {rangeEvents.length
                        ? `${rangeEvents.length} ${rangeEvents.length === 1 ? 'event' : 'events'}`
                        : 'No events'}
                </span>
                <Button variant="ghost" size="icon-xs" aria-label="Clear range" onClick={() => setRange(null)}>
                    <Icon name="x" />
                </Button>
            </>
        );

    return (
        <Frame className={`w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <IconTile icon="trending-down" />
                    <div className="flex min-w-0 flex-col gap-px">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <FrameTitle role="heading" className="truncate">
                                {title}
                            </FrameTitle>
                            <ToneBadge tone={STATUS_TONE[slo.status]}>{STATUS_LABEL[slo.status]}</ToneBadge>
                            {frozen ? (
                                <ToneBadge tone="outline" icon="octagon-x">
                                    Deploys Frozen
                                </ToneBadge>
                            ) : null}
                        </div>
                        <FrameDescription className="truncate">
                            <span className="tabular-nums">
                                {slo.target}% over {slo.windowDays} days
                            </span>
                        </FrameDescription>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
                    <SelectMenu
                        label="SLO"
                        value={slo.key}
                        onValueChange={changeSlo}
                        className="max-sm:flex-1 sm:w-56"
                        options={slos.map((s) => ({
                            value: s.key,
                            label: s.name,
                            tone: STATUS_TONE[s.status],
                            note: STATUS_LABEL[s.status],
                        }))}
                    />
                    <ToolbarGroup aria-label="SLO actions">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-background"
                                        aria-label={`Burn alerts: ${alertLabel}`}
                                    />
                                }
                            >
                                <Icon name={muted || onCount === 0 ? 'bell-off' : 'bell'} />
                                <span className={TEXT_TRIM}>{alertLabel}</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Burn Alerts</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {ALERTS.map((a) => (
                                        <DropdownMenuCheckboxItem
                                            key={a.key}
                                            checked={!muted && !!alerts[a.key]}
                                            closeOnClick={false}
                                            onCheckedChange={(c: boolean) => {
                                                setMuted(false);
                                                setAlerts({ ...alerts, [a.key]: c });
                                            }}
                                        >
                                            <Icon name={a.icon} />
                                            {a.label}
                                            <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                                {a.note}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setMuted(!muted);
                                        toast.success(muted ? 'Burn alerts unmuted' : 'Burn alerts muted', {
                                            description: slo.name,
                                        });
                                    }}
                                >
                                    <Icon name={muted ? 'bell' : 'bell-off'} />
                                    {muted ? 'Unmute All' : 'Mute All'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="bg-background"
                                        aria-label="SLO actions"
                                        title="SLO actions"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto min-w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>
                                        <span className="block text-foreground">{slo.name}</span>
                                        <span className="block font-normal text-muted-foreground tabular-nums">
                                            {slo.target}% over {slo.windowDays} days
                                        </span>
                                    </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Deploy Policy</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setLifted({ ...lifted, [slo.key]: frozen });
                                            toast.success(frozen ? 'Deploy freeze lifted' : 'Deploys frozen', {
                                                description: slo.name,
                                            });
                                        }}
                                    >
                                        <Icon name={frozen ? 'rocket' : 'octagon-x'} />
                                        {frozen ? 'Lift Freeze' : 'Freeze Deploys'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => toast.success('Incident declared', { description: slo.name })}
                                    >
                                        <Icon name="triangle-alert" />
                                        Declare Incident
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText(`${slo.key}-burn-down.csv`, csvText());
                                            toast.success('CSV downloaded', {
                                                description: `${slo.key}-burn-down.csv`,
                                            });
                                        }}
                                    >
                                        <Icon name="download" />
                                        Burn-down CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText(
                                                `${slo.key}.json`,
                                                JSON.stringify(slo, null, 2),
                                                'application/json'
                                            );
                                            toast.success('JSON downloaded', { description: `${slo.key}.json` });
                                        }}
                                    >
                                        <Icon name="file-json-2" />
                                        SLO JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-column' : 'table'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Share</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            copy(
                                                typeof window !== 'undefined'
                                                    ? `${window.location.href.split('#')[0]}#slo=${slo.key}`
                                                    : slo.key,
                                                'Link'
                                            )
                                        }
                                    >
                                        <Icon name="link" />
                                        Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => copy(`slo_${slo.key.replace(/-/g, '_')}`, 'SLO ID')}
                                    >
                                        <Icon name="copy" />
                                        Copy SLO ID
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                </div>
            </FrameHeader>
            <FramePanel className="p-0">
                <dl className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4! lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]!">
                    <div className="col-span-2 flex min-w-0 flex-col gap-1 bg-card px-4 py-3 sm:col-span-4! lg:col-span-1!">
                        <dt className="truncate text-xs text-muted-foreground">Budget</dt>
                        <dd className="flex min-w-0 items-baseline gap-1.5 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                            {pct(now)}
                            <span
                                className={`text-sm font-medium tracking-normal ${over ? 'text-destructive' : 'text-muted-foreground'}`}
                            >
                                {over ? 'over' : 'left'}
                            </span>
                        </dd>
                        <dd className="truncate text-xs text-muted-foreground">{slo.budgetNote}</dd>
                    </div>
                    {[
                        { label: 'Attained', value: slo.attained, note: `Target ${slo.target}%`, tone: '' },
                        { label: 'Burn 1h', value: slo.burn1h, note: slo.burn6h, tone: burnTone },
                        { label: 'Daily pace', value: slo.dailyPace, note: slo.evenPace, tone: paceTone },
                        { label: slo.runsOut.label, value: slo.runsOut.value, note: slo.runsOut.note, tone: runsTone },
                    ].map((k) => (
                        <div key={k.label} className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3">
                            <dt className="truncate text-xs text-muted-foreground">{k.label}</dt>
                            <dd
                                className={`flex min-w-0 items-baseline gap-1.5 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums${k.tone}`}
                            >
                                {k.value}
                            </dd>
                            <dd className="truncate text-xs text-muted-foreground">{k.note}</dd>
                        </div>
                    ))}
                </dl>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                    <ChartFigure
                        title={`${slo.name} error budget`}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={tableRows}
                                index="label"
                                indexLabel="Day"
                                series={[
                                    { key: 'remaining', label: 'Budget left %' },
                                    { key: 'spent', label: 'Spent %' },
                                ]}
                                valueFormatter={(v: number) => `${v}%`}
                                caption={`${slo.name} error budget`}
                            />
                        }
                    >
                        <div
                            ref={fadeRef}
                            role="group"
                            tabIndex={0}
                            aria-label={`${slo.name} error budget, last ${n} days: ${pct(now)} ${over ? 'over budget' : 'left'}. Arrow keys move, Enter selects a day, Shift+Enter extends the range, Escape clears.`}
                            className="flex min-h-0 min-w-0 flex-1 cursor-crosshair touch-pan-y flex-col rounded-md outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            onPointerDown={onDown}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            onPointerLeave={onLeave}
                            onKeyDown={onKey}
                            onBlur={() => setCursor(null)}
                        >
                            <div className="relative flex min-w-0 flex-col">
                                {band ? (
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute top-3.5 -bottom-1.5 left-0 bg-linear-to-b from-foreground/2 to-foreground/8"
                                        style={{
                                            width: band.w,
                                            borderRadius: 14,
                                            transform: `translateX(${band.x}px)`,
                                        }}
                                    />
                                ) : null}
                                <div className="h-8 shrink-0" />
                                <div ref={plotRef} className="relative h-44 min-h-0 sm:h-48!">
                                    <ChartContainer config={{}} className="aspect-auto h-full w-full">
                                        {(R: any) => (
                                            <R.BarChart data={rows} margin={M} barCategoryGap={0}>
                                                <defs>
                                                    <linearGradient id="rp-ebb-overspend" x1="0" y1="0" x2="0" y2="1">
                                                        <stop
                                                            offset="0"
                                                            stopColor="var(--destructive)"
                                                            stopOpacity={0.07}
                                                        />
                                                        <stop
                                                            offset="1"
                                                            stopColor="var(--destructive)"
                                                            stopOpacity={0}
                                                        />
                                                    </linearGradient>
                                                </defs>
                                                <R.XAxis dataKey="key" hide />
                                                <R.YAxis hide domain={[lo, 100]} />
                                                {lo < -6 ? (
                                                    <R.ReferenceArea
                                                        y1={lo}
                                                        y2={0}
                                                        fill="url(#rp-ebb-overspend)"
                                                        fillOpacity={1}
                                                        stroke="none"
                                                        ifOverflow="hidden"
                                                    />
                                                ) : null}
                                                <R.ReferenceLine
                                                    y={warnAt}
                                                    stroke="var(--warning)"
                                                    strokeWidth={1}
                                                    strokeDasharray="4 4"
                                                    label={(lp: any) => (
                                                        <RefLabel
                                                            viewBox={lp.viewBox}
                                                            dy={-6}
                                                            className="fill-warning-foreground dark:fill-warning"
                                                        >
                                                            Warn {warnAt}%
                                                        </RefLabel>
                                                    )}
                                                />
                                                <R.ReferenceLine
                                                    y={0}
                                                    stroke="var(--foreground)"
                                                    strokeOpacity={0.22}
                                                    strokeWidth={1}
                                                    label={(lp: any) => (
                                                        <g>
                                                            <RefLabel
                                                                viewBox={lp.viewBox}
                                                                dy={-6}
                                                                className="fill-muted-foreground"
                                                            >
                                                                0%
                                                            </RefLabel>
                                                            {over ? (
                                                                <RefLabel
                                                                    viewBox={lp.viewBox}
                                                                    dy={15}
                                                                    className="fill-destructive"
                                                                >
                                                                    Over budget
                                                                </RefLabel>
                                                            ) : null}
                                                        </g>
                                                    )}
                                                />
                                                <R.Bar
                                                    dataKey="span"
                                                    isAnimationActive={false}
                                                    shape={(p: any) => <Lollipop {...p} R={R} warnAt={warnAt} />}
                                                    activeBar={false}
                                                />
                                            </R.BarChart>
                                        )}
                                    </ChartContainer>
                                </div>
                                <div className="@container relative mt-2 h-6 shrink-0">
                                    {step
                                        ? days.map((d) =>
                                              labelled[d.i] ? (
                                                  <span
                                                      key={d.key}
                                                      className={pillClass(d)}
                                                      style={{
                                                          transform: `translateX(clamp(0px, -50% + ${xOf(d.i)}px, -100% + 100cqw))`,
                                                      }}
                                                  >
                                                      {pillText(d)}
                                                  </span>
                                              ) : (
                                                  <span
                                                      key={d.key}
                                                      aria-hidden="true"
                                                      className="absolute top-1/2 h-1.5 w-px -translate-1/2 rounded-full bg-muted-foreground/25"
                                                      style={{ left: xOf(d.i) }}
                                                  />
                                              )
                                          )
                                        : null}
                                </div>
                                {step && (focus || range) ? (
                                    <div
                                        aria-hidden="true"
                                        className="@container pointer-events-none absolute inset-x-0 top-1 h-7"
                                    >
                                        <div
                                            className="absolute top-0 left-0 flex"
                                            style={{
                                                transform: `translateX(clamp(0px, -50% + ${topX}px, -100% + 100cqw))`,
                                            }}
                                        >
                                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold whitespace-nowrap text-background tabular-nums">
                                                {focus ? dayPill(focus) : `${pct(rangeSpent)} spent`}
                                                <span className="size-1 rounded-full bg-background/40" />
                                                <span className="font-medium text-background/65">
                                                    {focus
                                                        ? focus.today
                                                            ? 'Today'
                                                            : focus.forecast
                                                              ? `${focus.label}, forecast`
                                                              : focus.label
                                                        : `${range![1] - range![0] + 1} days`}
                                                </span>
                                                {focus && focus.event ? (
                                                    <>
                                                        <span className="size-1 rounded-full bg-background/40" />
                                                        <span className="font-medium text-background/65">
                                                            {focus.event.id}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </ChartFigure>
                </div>
            </FramePanel>
            <FrameFooter className="min-h-10 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                {footerLegend}
                <div aria-live={range ? 'polite' : 'off'} className="flex min-w-0 items-center gap-1.5 sm:ms-auto">
                    {footerEnd}
                </div>
            </FrameFooter>
        </Frame>
    );
}

export default ErrorBudgetBurn;
