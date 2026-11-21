import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import { rowsToCsv, downloadText, copyText } from 'components:chart-frame';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from 'components:card';
import { Separator } from 'components:separator';
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
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { series, SeriesScope, useReplayKey, EASE_OUT } from 'components:charts/chart-kit';
import { TEXT_TRIM, Pill, MetaDot } from 'components:charts/radial-kit';
import { reducedMotion, FloatTip } from 'components:charts/sankey-kit';
import { STAGES, SOURCES, PERIODS } from './data';
import type { LeakStage, LeakSource, LeakPeriod } from './data';

/**
 * components:charts/pipeline-leakage: deals from three lead sources narrowing through six pipeline stages as a
 * centred ribbon (Recharts areas stacked with the silhouette offset, bump curves, white stage separators).
 * Red drops leak off the ribbon at each stage boundary, more where the loss rate is higher; the leakiest
 * step gets a red marker and a red loss label. KPI tiles (lead to won, leads, deals won, biggest leak), a
 * 30D / 90D / 12M switch, a lead-source focus switch, a stage tooltip with per-source losses, replay / pause
 * of the motion, CSV and copy summary.
 *
 *   <PipelineLeakage />                                          sample data
 *   <PipelineLeakage stages={[…]} sources={[…]} periods={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type PipelineLeakageProps = {
    title?: string;
    description?: string;
    stages?: LeakStage[];
    sources?: LeakSource[];
    periods?: LeakPeriod[];
    defaultPeriod?: string;
    throughLabel?: string;
    className?: string;
};

const H = 224;
const PAD = 12;
const DURS = [3.1, 2.3, 2.9, 3.4, 2.7, 2.6];

const num = (v: number) => Math.round(v).toLocaleString('en-US');
const share = (v: number) => (v >= 10 || v === 100 ? `${Math.round(v)}%` : `${v.toFixed(1)}%`);
const growth = (v: number) => `${v >= 0 ? '+' : ''}${Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)}%`;

function noise(a: number, b: number): number {
    const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

/** One leaking drop: drifts off the ribbon edge and fades (WAAPI, infinite, negative delay). */
function Drop({
    left,
    top,
    dx,
    dy,
    dur,
    delay,
    big,
    still,
}: {
    left: number;
    top: number;
    dx: number;
    dy: number;
    dur: number;
    delay: number;
    big: boolean;
    still: boolean;
}) {
    const ref = useRef<HTMLSpanElement | null>(null);
    useLayoutEffect(() => {
        const el = ref.current as any;
        if (!el || !el.animate || still) return undefined;
        const a = el.animate(
            [
                { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0, offset: 0 },
                { opacity: 0.9, offset: 0.16 },
                { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 0, offset: 1 },
            ],
            { duration: dur * 1000, delay: delay * 1000, iterations: Infinity, easing: 'linear' }
        );
        return () => a.cancel();
    }, [dx, dy, dur, delay, still]);
    return (
        <span
            ref={ref}
            className={`absolute rounded-full bg-destructive ${big ? 'size-1.5' : 'size-1'}`}
            style={{ left: `${left}%`, top, transform: 'translate(-50%, -50%)', opacity: still ? 0.5 : 0 }}
        />
    );
}

export function PipelineLeakage({
    title = 'Pipeline Leakage',
    description = 'Deals lost at each stage, by source',
    stages = STAGES,
    sources = SOURCES,
    periods = PERIODS,
    defaultPeriod = '90d',
    throughLabel = 'Through Oct 12, 2026',
    className,
}: PipelineLeakageProps) {
    const first = periods.some((p) => p.key === defaultPeriod) ? defaultPeriod : periods[0].key;
    const [periodKey, setPeriodKey] = useState(first);
    const [focus, setFocus] = useState('');
    const [hoverStage, setHoverStage] = useState<number | null>(null);
    const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
    const [paused, setPaused] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replayKey, replay] = useReplayKey();
    const plotRef = useRef<HTMLDivElement | null>(null);
    const drainRef = useRef<HTMLDivElement | null>(null);
    const dropsRef = useRef<HTMLDivElement | null>(null);
    const still = reducedMotion();

    const period = periods.find((p) => p.key === periodKey) || periods[0];
    const n = stages.length;

    const config = useMemo(() => {
        const cfg: Record<string, any> = {};
        sources.forEach((s) => {
            cfg[s.key] = series(s.light, s.dark, s.label);
        });
        return cfg;
    }, [sources]);

    const totals = stages.map((_s, i) => sources.reduce((a, s) => a + ((period.deals[s.key] || [])[i] || 0), 0));
    const maxTotal = totals[0] || 1;
    /** The figures the KPIs, headers and losses use: one source when focused, otherwise all. */
    const focusRow = focus ? period.deals[focus] || [] : null;
    const counts = focusRow ? stages.map((_s, i) => focusRow[i] || 0) : totals;
    const leads = counts[0] || 0;
    const won = counts[n - 1] || 0;
    const losses = counts.slice(1).map((v, i) => (counts[i] ? (1 - v / counts[i]) * 100 : 0));
    const worst = losses.reduce((a, v, i) => (v > losses[a] ? i : a), 0);
    const priorOf = (key: 'leads' | 'won') =>
        focus
            ? (period.prior[focus] || { leads: 0, won: 0 })[key]
            : sources.reduce((a, s) => a + (period.prior[s.key] || { leads: 0, won: 0 })[key], 0);
    const priorLeads = priorOf('leads');
    const priorWon = priorOf('won');
    const l2w = leads ? (won / leads) * 100 : 0;
    const priorL2w = priorLeads ? (priorWon / priorLeads) * 100 : 0;

    const data = useMemo(() => {
        const row = (x: number, i: number) => {
            const r: Record<string, number> = { x };
            sources.forEach((s) => {
                r[s.key] = (period.deals[s.key] || [])[i] || 0;
            });
            return r;
        };
        const out = [row(0, 0)];
        stages.forEach((_s, i) => out.push(row(i + 0.5, i)));
        out.push(row(n, n - 1));
        return out;
    }, [period, sources, stages, n]);

    // Drain: the ribbon is revealed left to right on mount and on "Replay drain".
    useLayoutEffect(() => {
        const el = drainRef.current as any;
        if (!el || !el.animate || still) return undefined;
        const a = el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], {
            duration: 1200,
            easing: `cubic-bezier(${EASE_OUT.join(',')})`,
        });
        const d = dropsRef.current as any;
        const b =
            d && d.animate
                ? d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 900, fill: 'backwards' })
                : null;
        return () => {
            a.cancel();
            if (b) b.cancel();
        };
    }, [replayKey, still]);

    // Pause / resume the leaking drops.
    useEffect(() => {
        const d = dropsRef.current as any;
        if (!d || !d.getAnimations) return;
        d.getAnimations({ subtree: true }).forEach((a: any) => (paused ? a.pause() : a.play()));
    });

    const halfPx = (v: number) => (v / maxTotal) * ((H - PAD * 2) / 2);
    const drops = useMemo(() => {
        const out: any[] = [];
        for (let b = 1; b < n; b++) {
            const loss = losses[b - 1] || 0;
            const count = Math.max(2, Math.round((loss / 100) * 24));
            const edge = halfPx((totals[b - 1] + totals[b]) / 2);
            for (let j = 0; j < count; j++) {
                const up = j % 2 === 0;
                const r1 = noise(b * 7 + j, 3);
                const r2 = noise(j + 11, b * 5);
                const dur = DURS[(b + j) % DURS.length];
                out.push({
                    key: `${b}-${j}`,
                    left: (b / n) * 100 + (r1 - 0.4) * 10,
                    top: H / 2 + (up ? -1 : 1) * (edge * (0.8 + r2 * 0.5) + r1 * 4),
                    dx: (r2 - 0.3) * 16,
                    dy: (up ? -1 : 1) * (16 + r1 * 24),
                    dur,
                    delay: -((dur * j) / count),
                    big: noise(j, b) > 0.6,
                });
            }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, focus, n]);

    const rows = stages.map((s, i) => {
        const r: Record<string, any> = {
            stage: s.label,
            deals: counts[i],
            ofLeads: leads ? Math.round((counts[i] / leads) * 1000) / 10 : 0,
        };
        sources.forEach((src) => {
            r[src.key] = (period.deals[src.key] || [])[i] || 0;
        });
        r.lost = i > 0 ? counts[i - 1] - counts[i] : 0;
        r.lossRate = i > 0 ? Math.round(losses[i - 1]) : 0;
        return r;
    });
    const scope = focus ? (sources.find((s) => s.key === focus) || { label: focus }).label : 'All sources';
    const worstLabel = `${stages[worst].short} to ${stages[worst + 1].short}`;
    const summary = `${title}, ${period.long} (${scope}): ${num(leads)} leads, ${num(won)} won, lead to won ${l2w.toFixed(
        1
    )}%. ${stages
        .slice(1)
        .map((s, i) => `${stages[i].short} to ${s.short} -${Math.round(losses[i])}%`)
        .join(', ')}. Biggest leak ${Math.round(losses[worst])}% at ${worstLabel}.`;
    const columns = [{ key: 'stage', label: 'Stage' }]
        .concat(sources.map((s) => ({ key: s.key, label: s.label })))
        .concat([
            { key: 'deals', label: focus ? `${scope} deals` : 'Deals' },
            { key: 'ofLeads', label: 'Of leads (%)' },
            { key: 'lost', label: 'Lost' },
            { key: 'lossRate', label: 'Loss rate (%)' },
        ]);

    const periodToggle = useSingleToggle(periodKey, (v: string) => setPeriodKey(v));
    const focusToggle = useSingleToggle(focus, (v: string) => setFocus(v || ''));
    const track = (e: any) => {
        const el = plotRef.current;
        if (!el) return;
        const box = el.getBoundingClientRect();
        const x = e.clientX - box.left;
        setTip({ x, y: e.clientY - box.top });
        setHoverStage(Math.max(0, Math.min(n - 1, Math.floor((x / box.width) * n))));
    };

    const kpis = [
        {
            key: 'l2w',
            label: 'Lead to Won',
            value: `${l2w.toFixed(1)}%`,
            delta: l2w - priorL2w,
            deltaText: `${l2w - priorL2w >= 0 ? '+' : ''}${(l2w - priorL2w).toFixed(1)} pts`,
            note: `vs prior ${period.label}`,
        },
        { key: 'leads', label: 'Leads', value: num(leads), delta: priorLeads ? (leads / priorLeads - 1) * 100 : 0 },
        { key: 'won', label: 'Deals Won', value: num(won), delta: priorWon ? (won / priorWon - 1) * 100 : 0 },
    ];

    const tipBody = () => {
        if (hoverStage == null) return null;
        const i = hoverStage;
        return (
            <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <span className="flex items-center justify-between gap-4">
                        <span className="font-medium">{stages[i].label}</span>
                        <span className="text-muted-foreground tabular-nums">
                            {share(leads ? (counts[i] / leads) * 100 : 0)} of leads
                        </span>
                    </span>
                    <span className="flex items-baseline gap-1.5">
                        <span className="text-sm font-semibold tabular-nums">{num(counts[i])}</span>
                        <span className="text-muted-foreground">deals</span>
                    </span>
                </div>
                <Separator />
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">Source</span>
                        <span className="tabular-nums">Deals</span>
                        {i > 0 ? <span className="w-9 text-end tabular-nums">Lost</span> : null}
                    </span>
                    {sources
                        .slice()
                        .reverse()
                        .map((s) => {
                            const row = period.deals[s.key] || [];
                            const lost = i > 0 && row[i - 1] ? Math.round((1 - row[i] / row[i - 1]) * 100) : 0;
                            return (
                                <span
                                    key={s.key}
                                    className={`flex items-center gap-2 text-muted-foreground ${focus && focus !== s.key ? 'opacity-50' : ''}`}
                                >
                                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${s.dot}`} />
                                        <span className="truncate">{s.label}</span>
                                    </span>
                                    <span className="font-medium text-foreground tabular-nums">{num(row[i] || 0)}</span>
                                    {i > 0 ? <span className="w-9 text-end tabular-nums">{lost}%</span> : null}
                                </span>
                            );
                        })}
                    {i > 0 ? (
                        <span className="flex items-center gap-2 border-t pt-1 text-muted-foreground">
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-destructive" />
                                Lost from {stages[i - 1].short}
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                                {num(counts[i - 1] - counts[i])}
                            </span>
                            <span className="w-9 text-end text-destructive tabular-nums">
                                {Math.round(losses[i - 1])}%
                            </span>
                        </span>
                    ) : null}
                </div>
            </div>
        );
    };

    return (
        <SeriesScope config={config} className={className}>
            <Card className="@container w-full min-w-0">
                <CardHeader className="border-b">
                    <CardTitle className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{title}</span>
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                    <CardAction>
                        <div className="flex items-center gap-2">
                            <ToggleGroup variant="outline" size="sm" aria-label="Date range" {...periodToggle}>
                                {periods.map((p) => (
                                    <ToggleGroupItem
                                        key={p.key}
                                        value={p.key}
                                        aria-label={`${p.label}, ${p.long}`}
                                        className="data-pressed:bg-muted data-pressed:text-foreground"
                                    >
                                        {p.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            className="size-7"
                                            aria-label="Chart options"
                                        />
                                    }
                                >
                                    <Icon name="ellipsis" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Motion</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={replay}>
                                            <Icon name="rotate-ccw" />
                                            Replay Drain
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setPaused(!paused)}>
                                            <Icon name={paused ? 'play' : 'pause'} />
                                            {paused ? 'Resume Leaks' : 'Pause Leaks'}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Export</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                const name = `pipeline-leakage-${period.key}.csv`;
                                                downloadText(name, rowsToCsv(rows, columns));
                                                toast.success('CSV downloaded', { description: name });
                                            }}
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={async () => {
                                                if (await copyText(summary)) toast.success('Summary copied');
                                            }}
                                        >
                                            <Icon name="copy" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'chart-area' : 'table'} />
                                            {view === 'table' ? 'View as Chart' : 'View as Table'}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 @2xl:grid-cols-4">
                        {kpis.map((k) => (
                            <div
                                key={k.key}
                                className="flex min-w-0 flex-col gap-2.5 @2xl:not-first:border-s @2xl:not-first:ps-6"
                            >
                                <dt className="flex h-4 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <span
                                        className={`min-w-0 ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                    >
                                        {k.label}
                                    </span>
                                </dt>
                                <dd className="flex min-w-0 flex-col gap-2.5">
                                    <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
                                        {k.value}
                                    </span>
                                    <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs">
                                        <Pill tone={k.delta < 0 ? 'destructive' : 'success'}>
                                            <Icon name={k.delta < 0 ? 'trending-down' : 'trending-up'} />
                                            <span className={`tabular-nums ${TEXT_TRIM}`}>
                                                {k.deltaText || growth(k.delta)}
                                            </span>
                                        </Pill>
                                        {k.note ? (
                                            <span
                                                className={`min-w-0 text-muted-foreground ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap @max-sm:sr-only`}
                                            >
                                                {k.note}
                                            </span>
                                        ) : null}
                                    </span>
                                </dd>
                            </div>
                        ))}
                        <div className="flex min-w-0 flex-col gap-2.5 @2xl:not-first:border-s @2xl:not-first:ps-6">
                            <dt className="flex h-4 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <span aria-hidden="true" className="h-3 w-0.5 shrink-0 rounded-full bg-destructive" />
                                <span
                                    className={`min-w-0 ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                >
                                    Biggest Leak
                                </span>
                            </dt>
                            <dd className="flex min-w-0 flex-col gap-2.5">
                                <span className="text-2xl leading-none font-semibold tracking-tight text-destructive tabular-nums">
                                    {Math.round(losses[worst])}%
                                </span>
                                <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs">
                                    <span
                                        className={`min-w-0 text-muted-foreground ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                    >
                                        {worstLabel}
                                    </span>
                                </span>
                            </dd>
                        </div>
                    </dl>
                </CardContent>
                <Separator />
                <CardContent>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="stage"
                                indexLabel="Stage"
                                series={sources
                                    .map((s) => ({ key: s.key, label: s.label }))
                                    .concat([
                                        { key: 'deals', label: 'Deals' },
                                        { key: 'lossRate', label: 'Loss rate' },
                                    ])}
                                valueFormatter={(v: number, ctx: any) =>
                                    ctx && ctx.dataKey === 'lossRate' ? `${v}%` : num(v)
                                }
                                caption={summary}
                            />
                        }
                    >
                        <div className="flex flex-col gap-2">
                            <ol className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0px, 1fr))` }}>
                                {stages.map((s, i) => (
                                    <li key={s.key} className="flex flex-col items-center gap-0.5">
                                        <span className="text-xs whitespace-nowrap text-muted-foreground transition-colors duration-200">
                                            {s.short}
                                        </span>
                                        <span
                                            className={`text-sm font-medium tabular-nums transition-[opacity,translate,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                                                hoverStage != null && hoverStage !== i ? 'text-muted-foreground' : ''
                                            }`}
                                        >
                                            {share(leads ? (counts[i] / leads) * 100 : 0)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                            <div
                                ref={plotRef}
                                className="relative"
                                style={{ height: H }}
                                onMouseMove={track}
                                onMouseLeave={() => {
                                    setHoverStage(null);
                                    setTip(null);
                                }}
                            >
                                <div
                                    ref={dropsRef}
                                    key={`d${replayKey}`}
                                    className="pointer-events-none absolute inset-0"
                                >
                                    {drops.map((d) => (
                                        <Drop key={d.key} {...d} still={still} />
                                    ))}
                                </div>
                                <div ref={drainRef} className="size-full">
                                    <ChartContainer
                                        config={config}
                                        className="aspect-auto size-full"
                                        role="img"
                                        aria-label={`${title}: ${num(leads)} leads to ${num(won)} won`}
                                    >
                                        {(R: any) => (
                                            <R.AreaChart
                                                data={data}
                                                stackOffset="silhouette"
                                                margin={{ top: PAD, right: 0, bottom: PAD, left: 0 }}
                                            >
                                                <R.XAxis dataKey="x" type="number" domain={[0, n]} hide />
                                                <R.YAxis
                                                    type="number"
                                                    domain={[-maxTotal / 2, maxTotal / 2]}
                                                    hide
                                                    allowDataOverflow
                                                />
                                                {sources.map((s) => (
                                                    <R.Area
                                                        key={s.key}
                                                        dataKey={s.key}
                                                        stackId="a"
                                                        type="bumpX"
                                                        fill={`var(--color-${s.key})`}
                                                        fillOpacity={1}
                                                        stroke="none"
                                                        isAnimationActive={false}
                                                        activeDot={false}
                                                        className="transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                                                        style={{ opacity: focus && focus !== s.key ? 0.25 : 1 }}
                                                    />
                                                ))}
                                                {stages.slice(1).map((s, b) => (
                                                    <R.ReferenceLine
                                                        key={s.key}
                                                        x={b + 1}
                                                        stroke="var(--card)"
                                                        strokeWidth={3}
                                                    />
                                                ))}
                                                <R.ReferenceLine
                                                    segment={[
                                                        {
                                                            x: worst + 1,
                                                            y: (-(totals[worst] + totals[worst + 1]) / 4) * 1,
                                                        },
                                                        { x: worst + 1, y: (totals[worst] + totals[worst + 1]) / 4 },
                                                    ]}
                                                    stroke="var(--destructive)"
                                                    strokeWidth={2}
                                                />
                                                {hoverStage != null && hoverStage > 0 ? (
                                                    <R.ReferenceArea
                                                        x1={0}
                                                        x2={hoverStage}
                                                        fill="var(--card)"
                                                        fillOpacity={0.6}
                                                        stroke="none"
                                                    />
                                                ) : null}
                                                {hoverStage != null && hoverStage < n - 1 ? (
                                                    <R.ReferenceArea
                                                        x1={hoverStage + 1}
                                                        x2={n}
                                                        fill="var(--card)"
                                                        fillOpacity={0.6}
                                                        stroke="none"
                                                    />
                                                ) : null}
                                            </R.AreaChart>
                                        )}
                                    </ChartContainer>
                                </div>
                                {hoverStage != null && tip ? (
                                    <FloatTip
                                        x={tip.x}
                                        y={tip.y}
                                        width={256}
                                        className="w-64"
                                        maxX={plotRef.current ? plotRef.current.clientWidth : 9999}
                                    >
                                        {tipBody()}
                                    </FloatTip>
                                ) : null}
                            </div>
                            <div className="relative h-4">
                                {losses.map((l, b) => (
                                    <span
                                        key={b}
                                        className={`absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap tabular-nums transition-opacity duration-200 motion-reduce:transition-none ${
                                            b === worst ? 'font-medium text-destructive' : 'text-muted-foreground'
                                        }`}
                                        style={{ left: `${((b + 1) / n) * 100}%` }}
                                    >
                                        -{Math.round(l)}%
                                    </span>
                                ))}
                            </div>
                            <ol aria-label="Deals by stage" className="sr-only">
                                {stages.map((s, i) => (
                                    <li key={s.key}>
                                        {s.label}: {num(counts[i])} deals,{' '}
                                        {share(leads ? (counts[i] / leads) * 100 : 0)} of leads
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </ChartFigure>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <ToggleGroup
                        variant="default"
                        size="sm"
                        className="gap-2"
                        aria-label="Focus a lead source"
                        {...focusToggle}
                    >
                        {sources
                            .slice()
                            .reverse()
                            .map((s) => (
                                <ToggleGroupItem
                                    key={s.key}
                                    value={s.key}
                                    className="gap-1 rounded-lg px-2.5 text-[0.8rem] text-muted-foreground data-pressed:bg-muted data-pressed:text-foreground"
                                >
                                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${s.dot}`} />
                                    {s.label}
                                </ToggleGroupItem>
                            ))}
                    </ToggleGroup>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-destructive" />
                            Lost deals
                        </span>
                        <MetaDot />
                        {throughLabel}
                    </span>
                </CardFooter>
            </Card>
        </SeriesScope>
    );
}

export default PipelineLeakage;
