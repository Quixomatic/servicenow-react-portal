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
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { useElementWidth } from 'components:charts/chart-kit';
import { OutlineBadge, ToneDot, TONE_VAR, slopePath, useTween, useInterval } from 'components:charts/slope-kit';
import { CHANNELS, DAYS, STAGES, DEFAULT_DAY } from './data';
import type { Channel } from './data';

/**
 * components:charts/retention-crossover: a slope chart joining acquisition channels ranked by signups (left) to their
 * rank by the share of users still active (right) on a chosen day. A Day 1 … Day 90 ruler you can scrub (slider,
 * keyboard) or play as a tour; hover a line to trace it, click to pin it while the others dim; rings mark where the
 * traced line passes or is passed by another; a footer inspector (insight line when nothing is traced) and a header
 * menu (CSV, copy insight, reset to Day 30).
 *
 *   <RetentionCrossover />                                                        sample data
 *   <RetentionCrossover channels={[{ key, label, signups, kept: [pct per ruler day] }]} days={[1, 2, .., 90]}
 *       stages={[{ label: 'Activation', from: 1 }]} defaultDay={30} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type RetentionCrossoverProps = {
    title?: string;
    description?: string;
    channels?: Channel[];
    days?: number[];
    stages?: { label: string; from: number }[];
    defaultDay?: number;
    playMs?: number;
    className?: string;
};

type Tone = 'climbs' | 'falls' | 'holds';
type Row = Channel & { kept1: number; signupRank: number; keptRank: number; places: number; tone: Tone };

const LEFT = 232;
const RIGHT = 156;
const PAD = 6;
const ROW_H = 36.7272727;
const BAR_W = 56;
const TONE_LABEL: Record<Tone, string> = { climbs: 'Climbs', falls: 'Falls', holds: 'Holds' };
const TONE_COLOR: Record<Tone, string> = {
    climbs: TONE_VAR.healthy,
    falls: TONE_VAR.critical,
    holds: 'var(--muted-foreground)',
};
const TONE_DOT: Record<Tone, string> = { climbs: 'healthy', falls: 'critical', holds: 'muted' };
const TONE_TEXT: Record<Tone, string> = {
    climbs: 'fill-success',
    falls: 'fill-destructive',
    holds: 'fill-muted-foreground',
};
const TONE_BAR: Record<Tone, string> = {
    climbs: 'fill-success',
    falls: 'fill-destructive',
    holds: 'fill-muted-foreground',
};
const TONE_ICON: Record<Tone, string> = { climbs: 'trending-up', falls: 'trending-down', holds: 'minus' };
const TONE_ICON_CLASS: Record<Tone, string> = {
    climbs: 'text-success',
    falls: 'text-destructive',
    holds: 'text-muted-foreground',
};

const KEYFRAMES = `
@keyframes rp-c51-settle { from { transform: translateY(3px); opacity: 0.3; } }
.rp-c51-settle { display: inline-block; animation: rp-c51-settle 360ms cubic-bezier(0.22, 1, 0.36, 1); }
@keyframes rp-c51-fade { from { transform: translateY(2px); opacity: 0; } }
.rp-c51-fade { animation: rp-c51-fade 200ms cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: reduce) {
    .rp-c51-settle, .rp-c51-fade { animation: none; }
}
`;

const whole = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n)}%`;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Where along the shared x scale two slopes cross: t solves 3t² - 2t³ = b (monotonic, bisection). */
function crossT(b: number) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
        const t = (lo + hi) / 2;
        if (3 * t * t - 2 * t * t * t < b) lo = t;
        else hi = t;
    }
    return (lo + hi) / 2;
}

/** x on the cubic part of slopePath (control xs a, m, m, b). */
function bezierX(t: number, a: number, m: number, b: number) {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * m + 3 * u * t * t * m + t * t * t * b;
}

export function RetentionCrossover({
    title = 'Retention Crossover',
    description = 'Which channels keep the users they bring',
    channels = CHANNELS,
    days = DAYS,
    stages = STAGES,
    defaultDay = DEFAULT_DAY,
    playMs = 700,
    className = '',
}: RetentionCrossoverProps) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const plotRef = useRef<HTMLDivElement | null>(null);
    const width = useElementWidth(plotRef);
    const defaultIdx = Math.max(0, days.indexOf(defaultDay));
    const [idx, setIdx] = useState(defaultIdx);
    const [playing, setPlaying] = useState(false);
    const [hover, setHover] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');

    const day = days[idx];
    const stage = stages.filter((s) => s.from <= day).pop() || stages[0];
    const last = days.length - 1;

    useInterval(
        () => {
            if (idx >= last) setPlaying(false);
            else setIdx(idx + 1);
        },
        playing ? playMs : null
    );
    const togglePlay = () => {
        if (playing) {
            setPlaying(false);
            return;
        }
        if (idx >= last) setIdx(0);
        setPlaying(true);
    };

    const bySignups = channels.slice().sort((a, b) => b.signups - a.signups);
    const keptOf = (c: Channel) => (c.kept[idx] == null ? 0 : c.kept[idx]);
    const byKept = channels.slice().sort((a, b) => keptOf(b) - keptOf(a));
    const rows: Row[] = bySignups.map((c, i) => {
        const keptRank = byKept.indexOf(c);
        const places = i - keptRank;
        return {
            ...c,
            kept1: keptOf(c),
            signupRank: i + 1,
            keptRank: keptRank + 1,
            places,
            tone: places > 0 ? 'climbs' : places < 0 ? 'falls' : 'holds',
        };
    });
    const rowOf = (k: string | null) => rows.find((r) => r.key === k) || null;
    const totalSignups = rows.reduce((s, r) => s + r.signups, 0);
    const maxSignups = Math.max(...rows.map((r) => r.signups), 1);
    const maxKept = Math.max(...channels.map((c) => Math.max(...c.kept)), 1);
    const moved = rows.filter((r) => r.places !== 0).length;

    // Geometry.
    const W = Math.max(768, width || 1118);
    const x0 = LEFT;
    const x1 = W - RIGHT;
    const H = PAD * 2 + rows.length * ROW_H;
    const yAt = (i: number) => PAD + (i + 0.5) * ROW_H;
    const leftY: Record<string, number> = {};
    const rightTarget: Record<string, number> = {};
    rows.forEach((r) => {
        leftY[r.key] = yAt(r.signupRank - 1);
        rightTarget[r.key] = yAt(r.keptRank - 1);
    });
    const rightY = useTween(rightTarget, 500);
    const ry = (k: string) => (rightY[k] == null ? rightTarget[k] : rightY[k]);
    const strokeOf = (r: Row) => 1.5 + (7 * r.signups) / maxSignups;
    const endR = (r: Row) => Math.max(3.5, strokeOf(r) / 2 + 1.5);

    const trace = hover || pinned;
    const traced = rowOf(trace);
    const pin = (k: string) => setPinned((cur) => (cur === k ? null : k));

    // Crossings of the traced line with every other line.
    const a = x0 + (x1 - x0) * 0.06;
    const b = x1 - (x1 - x0) * 0.06;
    const m = (x0 + x1) / 2;
    const rings: { key: string; x: number; y: number; passes: boolean }[] = [];
    if (traced) {
        const tl = leftY[traced.key];
        const tr = ry(traced.key);
        rows.forEach((o) => {
            if (o.key === traced.key) return;
            const d0 = tl - leftY[o.key];
            const d1 = tr - ry(o.key);
            if (d0 * d1 >= 0) return;
            const t = crossT(d0 / (d0 - d1));
            const bt = 3 * t * t - 2 * t * t * t;
            rings.push({ key: o.key, x: bezierX(t, a, m, b), y: tl + (tr - tl) * bt, passes: d0 > 0 });
        });
    }
    const passes = rings.filter((r) => r.passes).length;
    const passedBy = rings.length - passes;

    const drawn = rows.slice().sort((p, q) => (p.tone === 'holds' ? 0 : 1) - (q.tone === 'holds' ? 0 : 1));
    if (traced) {
        const i = drawn.findIndex((r) => r.key === traced.key);
        if (i >= 0) drawn.push(drawn.splice(i, 1)[0]);
    }

    const topKept = rows.slice().sort((p, q) => p.keptRank - q.keptRank)[0];
    const topSignups = rows[0];
    const insight = topKept
        ? `${topKept.label} keeps ${pct(topKept.kept1)} of its users at Day ${day}` +
          (topSignups && topSignups.key !== topKept.key ? `, ${topSignups.label} keeps ${pct(topSignups.kept1)}` : '')
        : '';
    const summary =
        `${rows.length} acquisition channels, ${whole(totalSignups)} signups. At Day ${day} (${stage.label}): ${insight}. ` +
        `${moved} of ${rows.length} channels moved between signup rank and retention rank.`;
    const csvColumns = [
        { key: 'label', label: 'Channel' },
        { key: 'signups', label: 'Signups' },
        { key: 'signupRank', label: 'Signup rank' },
        { key: 'keptPct', label: `Kept at Day ${day} %` },
        { key: 'keptRank', label: 'Retention rank' },
        { key: 'places', label: 'Places' },
    ];
    const csvRows = rows.map((r) => ({ ...r, keptPct: Math.round(r.kept1), places: signed(r.places) }));
    const reset = () => {
        setPlaying(false);
        setIdx(defaultIdx);
        setPinned(null);
        setHover(null);
        setView('chart');
    };

    const onLabelKey = (e: any, key: string) => {
        const i = rows.findIndex((r) => r.key === key);
        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (step) {
            e.preventDefault();
            const next = rows[(i + step + rows.length) % rows.length];
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

    const ticks = days.length;
    const ruler = (
        <div className="flex min-w-0 flex-1 items-center gap-3 @3xl/c51:w-sm @3xl/c51:flex-none @5xl/c51:w-md">
            <div className="flex w-18 shrink-0 flex-col">
                <span className="flex items-baseline gap-1 text-sm leading-5">
                    <span className="text-muted-foreground">Day</span>
                    <span key={day} className="rp-c51-settle font-medium text-foreground tabular-nums">
                        {day}
                    </span>
                </span>
                <span className="text-xs leading-4 text-muted-foreground">{stage.label}</span>
            </div>
            <div className="relative h-5 min-w-0 flex-1 rounded-full has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
                <div className="absolute inset-y-0" style={{ left: 6, right: 6 }}>
                    {days.map((d, i) => {
                        const dist = Math.abs(i - idx);
                        const bump = 0.4 + 0.45 * Math.exp(-(dist * dist) / 1.6);
                        const scale = Math.max(i % 6 === 0 ? 0.7 : 0.4, bump);
                        return (
                            <span
                                key={d}
                                className="absolute inset-y-0 flex w-px -translate-x-1/2 items-center"
                                style={{ left: `${(i / (ticks - 1)) * 100}%` }}
                            >
                                <span
                                    className={`h-full w-full rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${i <= idx ? 'bg-muted-foreground' : 'bg-muted-foreground/30'}`}
                                    style={{ transform: `scaleY(${scale})` }}
                                />
                            </span>
                        );
                    })}
                    <span
                        className="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                        style={{ left: `${(idx / (ticks - 1)) * 100}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={0}
                    max={last}
                    step={1}
                    value={idx}
                    aria-label="Days since signup"
                    aria-valuetext={`Day ${day}, ${stage.label}`}
                    onChange={(e) => {
                        setPlaying(false);
                        setIdx(Number(e.target.value));
                    }}
                    className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                />
                <output className="sr-only">{`Retention at day ${day}, ${stage.label} stage`}</output>
            </div>
        </div>
    );

    const chart = (
        <div className="overflow-x-auto">
            <div className="flex min-w-3xl flex-col gap-3 py-3" ref={plotRef}>
                <div className="flex items-center text-xs text-muted-foreground">
                    <span className="shrink-0 pe-2.5 text-end" style={{ width: LEFT }}>
                        Signups
                    </span>
                    <span className="flex flex-1 items-center justify-center gap-3">
                        {(['climbs', 'falls', 'holds'] as Tone[]).map((t) => (
                            <span key={t} className="inline-flex items-center gap-1.5">
                                <ToneDot
                                    tone={t === 'holds' ? 'muted' : TONE_DOT[t]}
                                    className={t === 'holds' ? 'bg-muted-foreground!' : ''}
                                />
                                {TONE_LABEL[t]}
                            </span>
                        ))}
                    </span>
                    <span className="flex shrink-0 justify-between ps-2.5" style={{ width: RIGHT }}>
                        <span>{`Kept at Day ${day}`}</span>
                        <span>Places</span>
                    </span>
                </div>
                <svg
                    width={W}
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    role="group"
                    aria-label={`${rows.length} acquisition channels: signup order on the left, retention order on the right`}
                    className="block h-auto w-full text-xs"
                    onMouseLeave={() => setHover(null)}
                >
                    <defs>
                        {rows.map((r) => (
                            <linearGradient
                                key={r.key}
                                id={`${uid}-${r.key}-ribbon`}
                                x1={x0}
                                y1={0}
                                x2={x1}
                                y2={0}
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.35} />
                                <stop offset="60%" stopColor={TONE_COLOR[r.tone]} stopOpacity={0.75} />
                                <stop offset="100%" stopColor={TONE_COLOR[r.tone]} />
                            </linearGradient>
                        ))}
                    </defs>
                    <line x1={x0} y1={PAD} x2={x0} y2={H - PAD} stroke="var(--border)" />
                    <line x1={x1} y1={PAD} x2={x1} y2={H - PAD} stroke="var(--border)" />
                    <g>
                        {drawn.map((r) => {
                            const d = slopePath(x0, x1, leftY[r.key], ry(r.key));
                            const on = trace === r.key;
                            const w = strokeOf(r);
                            const stroke = `url(#${uid}-${r.key}-ribbon)`;
                            return (
                                <g key={r.key} data-channel={r.key}>
                                    {on ? (
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
                                        strokeOpacity={on ? 1 : trace ? 0.06 : r.tone === 'holds' ? 0.35 : 0.75}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="transition-[stroke-opacity] duration-300 motion-reduce:transition-none"
                                    />
                                    {on
                                        ? rings.map((g) => (
                                              <circle
                                                  key={g.key}
                                                  cx={g.x}
                                                  cy={g.y}
                                                  r={endR(r)}
                                                  fill="var(--background)"
                                                  stroke={g.passes ? TONE_VAR.healthy : TONE_VAR.critical}
                                                  strokeWidth={2}
                                                  className="pointer-events-none"
                                              />
                                          ))
                                        : null}
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
                        {rows.map((r) => {
                            const dim = trace != null && trace !== r.key ? 'opacity-25' : '';
                            const ly = leftY[r.key];
                            const y = ry(r.key);
                            const sw = Math.round((r.signups / maxSignups) * BAR_W);
                            const kw = Math.max(1, Math.round((r.kept1 / maxKept) * BAR_W));
                            const on = trace === r.key;
                            return (
                                <g key={r.key}>
                                    <g
                                        id={`${uid}-l-${r.key}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={pinned === r.key}
                                        aria-label={`${r.label}: ${whole(r.signups)} signups, rank ${r.signupRank}; ${pct(r.kept1)} kept at day ${day}, rank ${r.keptRank}`}
                                        className={`cursor-pointer outline-none transition-opacity duration-200 motion-reduce:transition-none ${dim}`}
                                        onMouseEnter={() => setHover(r.key)}
                                        onFocus={() => setHover(r.key)}
                                        onBlur={() => setHover(null)}
                                        onClick={() => pin(r.key)}
                                        onKeyDown={(e) => onLabelKey(e, r.key)}
                                    >
                                        <rect x={0} y={ly - 18} width={LEFT} height={36} fill="transparent" />
                                        <text
                                            x={LEFT - 76}
                                            y={ly}
                                            textAnchor="end"
                                            dominantBaseline="central"
                                            className="text-[13px]"
                                        >
                                            <tspan className="fill-foreground">{r.label}</tspan>
                                            <tspan dx={5} className="fill-muted-foreground text-xs tabular-nums">
                                                {whole(r.signups)}
                                            </tspan>
                                        </text>
                                        <rect
                                            x={LEFT - 66}
                                            y={ly - 3}
                                            width={BAR_W}
                                            height={6}
                                            rx={3}
                                            className="fill-muted"
                                        />
                                        <rect
                                            x={LEFT - 10 - sw}
                                            y={ly - 3}
                                            width={sw}
                                            height={6}
                                            rx={3}
                                            fillOpacity={0.45}
                                            className="fill-muted-foreground"
                                        />
                                        <circle
                                            cx={x0}
                                            cy={ly}
                                            r={endR(r)}
                                            fill="var(--background)"
                                            stroke="var(--muted-foreground)"
                                            strokeOpacity={0.6}
                                            strokeWidth={1.5}
                                        />
                                    </g>
                                    <g
                                        className={`cursor-pointer transition-opacity duration-200 motion-reduce:transition-none ${dim}`}
                                        onMouseEnter={() => setHover(r.key)}
                                        onClick={() => pin(r.key)}
                                    >
                                        <rect x={x1} y={y - 18} width={RIGHT} height={36} fill="transparent" />
                                        <rect
                                            x={x1 + 10}
                                            y={y - 3}
                                            width={BAR_W}
                                            height={6}
                                            rx={3}
                                            className="fill-muted"
                                        />
                                        <rect
                                            x={x1 + 10}
                                            y={y - 3}
                                            width={kw}
                                            height={6}
                                            rx={3}
                                            fillOpacity={r.tone === 'holds' ? 0.45 : 0.85}
                                            className={TONE_BAR[r.tone]}
                                        />
                                        <text
                                            x={x1 + 76}
                                            y={y}
                                            dominantBaseline="central"
                                            className="fill-foreground text-xs font-medium tabular-nums"
                                        >
                                            {pct(r.kept1)}
                                        </text>
                                        <text
                                            x={x1 + 154}
                                            y={y}
                                            textAnchor="end"
                                            dominantBaseline="central"
                                            className={`text-xs font-medium tabular-nums ${TONE_TEXT[r.tone]}`}
                                        >
                                            {signed(r.places)}
                                        </text>
                                        <circle
                                            cx={x1}
                                            cy={y}
                                            r={endR(r)}
                                            fill={on ? TONE_COLOR[r.tone] : 'var(--background)'}
                                            stroke={TONE_COLOR[r.tone]}
                                            strokeWidth={1.5}
                                            className="transition-[fill] duration-200 motion-reduce:transition-none"
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
            <Frame className="@container/c51 min-w-0">
                <FrameHeader className="min-w-0 flex-row flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex min-w-0 grow basis-full flex-col gap-0.5 @3xl/c51:basis-0">
                        <FrameTitle role="heading" className="flex items-center gap-2">
                            {title}
                            <OutlineBadge className="tabular-nums">{`${whole(totalSignups)} signups`}</OutlineBadge>
                        </FrameTitle>
                        <FrameDescription>{description}</FrameDescription>
                    </div>
                    {ruler}
                    <div role="group" data-slot="button-group" className="flex w-fit shrink-0 items-stretch">
                        <Button
                            variant="outline"
                            size="sm"
                            aria-pressed={playing}
                            className="rounded-r-none bg-background"
                            onClick={togglePlay}
                        >
                            <Icon name={playing ? 'pause' : 'play'} />
                            {playing ? 'Pause' : 'Play'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="rounded-l-none border-l-0 bg-background"
                                        aria-label="Crossover options"
                                        title="Crossover options"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Share</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            downloadText(
                                                `retention-crossover-day-${day}.csv`,
                                                rowsToCsv(csvRows, csvColumns)
                                            );
                                            toast.success(`Day ${day} exported as CSV`);
                                        }}
                                    >
                                        <Icon name="download" />
                                        Export CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            copyText(`${insight}.`);
                                            toast.success('Insight copied to clipboard');
                                        }}
                                    >
                                        <Icon name="copy" />
                                        Copy Insight
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={reset}>
                                        <Icon name="rotate-ccw" />
                                        {`Reset to Day ${defaultDay}`}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>View</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-spline' : 'sheet'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </FrameHeader>
                <FramePanel className="min-w-0">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows.map((r) => ({
                                    label: r.label,
                                    signups: r.signups,
                                    kept: r.kept1,
                                    places: r.places,
                                }))}
                                index="label"
                                indexLabel="Channel"
                                series={[
                                    { key: 'signups', label: 'Signups' },
                                    { key: 'kept', label: `Kept at Day ${day}` },
                                    { key: 'places', label: 'Places' },
                                ]}
                                valueFormatter={(v: number, item: any) =>
                                    item && item.dataKey === 'kept'
                                        ? pct(v)
                                        : item && item.dataKey === 'places'
                                          ? signed(v)
                                          : whole(v)
                                }
                                caption={`Signups and retention at Day ${day} by channel`}
                            />
                        }
                    >
                        {chart}
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="min-w-0 flex-col gap-1">
                    {traced ? (
                        <div
                            key={`t-${traced.key}`}
                            className="rp-c51-fade flex min-h-6 w-full min-w-0 items-center justify-between gap-4"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-[13px] leading-5 font-medium text-foreground">
                                    {traced.label}
                                </span>
                                <OutlineBadge className="tabular-nums">
                                    <Icon name={TONE_ICON[traced.tone]} className={TONE_ICON_CLASS[traced.tone]} />
                                    {traced.tone === 'holds'
                                        ? 'Holds'
                                        : `${TONE_LABEL[traced.tone]} ${Math.abs(traced.places)}`}
                                </OutlineBadge>
                            </div>
                            <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground tabular-nums">
                                <span className="hidden @3xl/c51:inline">{`${whole(traced.signups)} signups`}</span>
                                <span className="hidden @xl/c51:inline">
                                    {'Passes '}
                                    <span className="font-medium text-foreground">{passes}</span>
                                    {', passed by '}
                                    <span className="font-medium text-foreground">{passedBy}</span>
                                </span>
                                <span>
                                    <span className="font-medium text-foreground">{pct(traced.kept1)}</span>
                                    {` kept at Day ${day}`}
                                </span>
                                {pinned ? (
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        className="text-muted-foreground"
                                        onClick={() => setPinned(null)}
                                    >
                                        Clear
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div
                            key="insight"
                            className="rp-c51-fade flex min-h-6 w-full min-w-0 items-center justify-between gap-4"
                        >
                            <p className="m-0 flex min-w-0 items-center gap-2 text-[13px] leading-5 text-muted-foreground">
                                <Icon name="lightbulb" className="size-4 shrink-0 text-muted-foreground" />
                                {topKept ? (
                                    <span className="truncate tabular-nums">
                                        <span className="font-medium text-foreground">{topKept.label}</span>
                                        {` keeps ${pct(topKept.kept1)} of its users at Day ${day}`}
                                        {topSignups && topSignups.key !== topKept.key ? (
                                            <span className="hidden @2xl/c51:inline">{`, ${topSignups.label} keeps ${pct(topSignups.kept1)}`}</span>
                                        ) : null}
                                    </span>
                                ) : null}
                            </p>
                            <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums @xl/c51:inline">
                                {`${moved} of ${rows.length} channels moved`}
                            </span>
                        </div>
                    )}
                </FrameFooter>
            </Frame>
        </div>
    );
}

export default RetentionCrossover;
