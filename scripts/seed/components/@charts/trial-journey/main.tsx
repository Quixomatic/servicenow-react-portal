import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import { Frame, FrameHeader, FrameTitle, FrameDescription, FramePanel, FrameFooter } from 'components:chart-frame';
import { Button } from 'components:button';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Icon } from 'components:icon';
import { series, SeriesScope, useReplayKey, useElementWidth } from 'components:charts/chart-kit';
import { Pill } from 'components:charts/radial-kit';
import {
    lineageOfNode,
    lineageOfLink,
    reducedMotion,
    FloatTip,
    TipLine,
    layoutSankey,
    SankeyPlot,
} from 'components:charts/sankey-kit';
import type { Lineage } from 'components:charts/sankey-kit';
import { CHANNELS, SIGNUP_LABEL, STAGES, PERIODS } from './data';
import type { JourneyStage, JourneyPeriod } from './data';

/**
 * components:charts/trial-journey: a trial funnel as a sankey. Four channels merge into signups; each stage
 * splits into the trials that continue and a named drop-off node. Pulses travel along every ribbon, more
 * of them on busier ribbons (drop-off pulses fade out part way); hovering a node or ribbon highlights its
 * full lineage. Column headers carry the stage totals and step rates, the last one the conversion rate.
 * 7D / 30D / 90D switch, replay and pause buttons.
 *
 *   <TrialJourney />                                          sample data
 *   <TrialJourney channels={[…]} stages={[…]} periods={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type TrialJourneyProps = {
    title?: string;
    description?: string;
    channels?: string[];
    signupLabel?: string;
    stages?: JourneyStage[];
    periods?: JourneyPeriod[];
    defaultPeriod?: string;
    /** Pulses on the busiest ribbon; others scale with their volume (at least one). */
    maxPulses?: number;
    footnote?: string;
    className?: string;
};

type Kind = 'journey' | 'upgraded' | 'dropped';
type Node = { name: string; kind: Kind; value: number; col: number; parent: number | null };
type Hover = { type: 'node' | 'link'; i: number } | null;

const H = 416;
const MARGIN = { top: 64, right: 132, bottom: 8, left: 108 };
const FADE = 'transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
const KIND_LABEL: Record<Kind, string> = { journey: 'In Journey', upgraded: 'Upgraded', dropped: 'Dropped Off' };
const KIND_DOT: Record<Kind, string> = { journey: 'bg-foreground', upgraded: 'bg-success', dropped: 'bg-destructive' };
const DURS = [4.3, 5.1, 4.7, 3.9, 5.6, 4.1, 4.3, 5.1, 4.7, 4.1];

const num = (v: number) => Math.round(v).toLocaleString('en-US');
const pct = (v: number) => `${v.toFixed(1)}%`;

/** Deterministic 0..1 noise for pulse lanes. */
function noise(a: number, b: number): number {
    const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

function build(channels: string[], signupLabel: string, stages: JourneyStage[], p: JourneyPeriod) {
    const nodes: Node[] = channels.map((name, i) => ({
        name,
        kind: 'journey',
        value: p.channels[i] || 0,
        col: 0,
        parent: null,
    }));
    const links: { source: number; target: number; value: number }[] = [];
    const signups = nodes.reduce((a, n) => a + n.value, 0);
    const signupIdx = nodes.length;
    nodes.push({ name: signupLabel, kind: 'journey', value: signups, col: 1, parent: null });
    channels.forEach((_c, i) => links.push({ source: i, target: signupIdx, value: nodes[i].value }));
    let prevIdx = signupIdx;
    stages.forEach((s, k) => {
        const parentValue = nodes[prevIdx].value;
        const kept = Math.min(parentValue, p.kept[k] || 0);
        const last = k === stages.length - 1;
        const keptIdx = nodes.length;
        nodes.push({ name: s.name, kind: last ? 'upgraded' : 'journey', value: kept, col: k + 2, parent: prevIdx });
        nodes.push({ name: s.drop, kind: 'dropped', value: parentValue - kept, col: k + 2, parent: prevIdx });
        links.push({ source: prevIdx, target: keptIdx, value: kept });
        links.push({ source: prevIdx, target: keptIdx + 1, value: parentValue - kept });
        prevIdx = keptIdx;
    });
    return { nodes, links, signups, signupIdx, finalIdx: prevIdx };
}

export function TrialJourney({
    title = 'Trial Journey',
    description = 'Where new trials convert or drop off',
    channels = CHANNELS,
    signupLabel = SIGNUP_LABEL,
    stages = STAGES,
    periods = PERIODS,
    defaultPeriod = '30d',
    maxPulses = 8,
    footnote = 'Pulse density follows trial volume',
    className,
}: TrialJourneyProps) {
    const first = periods.some((p) => p.key === defaultPeriod) ? defaultPeriod : periods[0].key;
    const [periodKey, setPeriodKey] = useState(first);
    const [hover, setHover] = useState<Hover>(null);
    const [paused, setPaused] = useState(false);
    const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
    const [replayKey, replay] = useReplayKey();
    const plotRef = useRef<HTMLDivElement | null>(null);
    const plotW = useElementWidth(plotRef);
    const sweepRef = useRef<HTMLDivElement | null>(null);
    const period = periods.find((p) => p.key === periodKey) || periods[0];
    const motionOk = !reducedMotion();

    const config = useMemo(
        () => ({
            journey: series('neutral-950', 'zinc-50', KIND_LABEL.journey),
            upgraded: series('emerald-500', 'emerald-500', KIND_LABEL.upgraded),
            dropped: series('red-600', 'red-400', KIND_LABEL.dropped),
        }),
        []
    );
    const flow = useMemo(() => build(channels, signupLabel, stages, period), [channels, signupLabel, stages, period]);
    const { nodes, links, signups, signupIdx, finalIdx } = flow;
    const layout = useMemo(
        () =>
            layoutSankey({
                count: nodes.length,
                links,
                width: plotW,
                height: H,
                margin: MARGIN,
                nodeWidth: 4,
                nodePadding: 26,
                iterations: 0,
            }),
        [nodes, links, plotW]
    );
    const maxLink = links.reduce((a, l) => Math.max(a, l.value), 0) || 1;
    const conversion = signups ? (nodes[finalIdx].value / signups) * 100 : 0;
    const stepRate = (i: number) => {
        const parent = nodes[i].parent;
        return parent != null && nodes[parent].value ? (nodes[i].value / nodes[parent].value) * 100 : 100;
    };

    /** The column headers sit above the first node of each column. */
    const headerOf: Record<number, { label: string; value: string; rate?: string; final?: boolean; end?: boolean }> = {
        0: { label: 'Channels', value: `${channels.length} sources`, end: true },
        [signupIdx]: { label: signupLabel, value: num(signups) },
    };
    stages.forEach((s, k) => {
        const idx = signupIdx + 1 + k * 2;
        const last = k === stages.length - 1;
        headerOf[idx] = last
            ? { label: s.header, value: pct(conversion), final: true }
            : { label: s.header, value: num(nodes[idx].value), rate: pct(stepRate(idx)) };
    });
    /** Journey nodes that carry a header instead of a side label. */
    const labelled = (i: number) => nodes[i].col === 0 || nodes[i].kind !== 'journey';

    const lineage: Lineage | null = hover
        ? hover.type === 'node'
            ? lineageOfNode(links, hover.i)
            : lineageOfLink(links, hover.i)
        : null;
    const linkOpacity = (k: number) => (lineage ? (lineage.links.has(k) ? 0.28 : 0.04) : 0.12);
    const pulseOpacity = (k: number) => (lineage && !lineage.links.has(k) ? 0.15 : 1);

    // Pause / resume the SMIL pulses of the chart surface.
    useEffect(() => {
        const svg = plotRef.current ? (plotRef.current.querySelector('svg.recharts-surface') as any) : null;
        if (!svg || !svg.pauseAnimations) return;
        if (paused) svg.pauseAnimations();
        else svg.unpauseAnimations();
    });

    // Enter sweep: a mask slides from left to right over 1.4 s.
    useLayoutEffect(() => {
        const el = sweepRef.current as any;
        if (!el || !el.animate || !motionOk) return undefined;
        const mask = 'linear-gradient(to right, #000 48%, transparent 52%)';
        const a = el.animate(
            [
                {
                    maskImage: mask,
                    WebkitMaskImage: mask,
                    maskSize: '300% 100%',
                    WebkitMaskSize: '300% 100%',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: '78% 0',
                    WebkitMaskPosition: '78% 0',
                },
                {
                    maskImage: mask,
                    WebkitMaskImage: mask,
                    maskSize: '300% 100%',
                    WebkitMaskSize: '300% 100%',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: '22% 0',
                    WebkitMaskPosition: '22% 0',
                },
            ],
            { duration: 1400, easing: 'linear' }
        );
        return () => a.cancel();
    }, [replayKey, motionOk]);

    const rows = links.map((l) => ({
        flow: `${nodes[l.source].name} to ${nodes[l.target].name}`,
        value: l.value,
        rate: nodes[l.source].value ? Math.round((l.value / nodes[l.source].value) * 1000) / 10 : 0,
    }));
    const aria = `Trial journey: ${num(signups)} signups, ${num(nodes[finalIdx].value)} upgraded`;
    const summary = `${title}, last ${period.label}: ${num(signups)} signups from ${channels
        .map((c, i) => `${c} ${num(nodes[i].value)}`)
        .join(', ')}. ${stages
        .map((s, k) => {
            const idx = signupIdx + 1 + k * 2;
            return `${s.name} ${num(nodes[idx].value)} (${pct(stepRate(idx))}), ${s.drop} ${num(nodes[idx + 1].value)}`;
        })
        .join('; ')}. Conversion ${pct(conversion)}.`;
    const periodToggle = useSingleToggle(periodKey, (v: string) => setPeriodKey(v));
    const track = (e: any) => {
        const box = plotRef.current ? plotRef.current.getBoundingClientRect() : null;
        if (box) setTip({ x: e.clientX - box.left, y: e.clientY - box.top });
    };

    const tipBody = () => {
        if (!hover) return null;
        if (hover.type === 'node') {
            const n = nodes[hover.i];
            return (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{n.name}</span>
                        <span className="text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className={`size-2 shrink-0 rounded-full ${KIND_DOT[n.kind]}`}
                                />
                                {KIND_LABEL[n.kind]}
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <TipLine label="Trials" value={num(n.value)} />
                        <TipLine label="Of signups" value={pct(signups ? (n.value / signups) * 100 : 0)} />
                        {n.parent != null ? <TipLine label="Step rate" value={pct(stepRate(hover.i))} /> : null}
                    </div>
                </>
            );
        }
        const l = links[hover.i];
        return (
            <>
                <span className="flex items-center gap-1.5 font-medium [&_svg:not([class*=size-])]:size-3.5">
                    {nodes[l.source].name}
                    <span className="text-muted-foreground">
                        <Icon name="arrow-right" />
                    </span>
                    {nodes[l.target].name}
                </span>
                <div className="flex flex-col gap-1">
                    <TipLine label="Trials" value={num(l.value)} />
                    {nodes[l.source].col > 0 ? (
                        <TipLine
                            label={`Of ${nodes[l.source].name}`}
                            value={pct((l.value / nodes[l.source].value) * 100)}
                        />
                    ) : (
                        <TipLine label="Of signups" value={pct(signups ? (l.value / signups) * 100 : 0)} />
                    )}
                </div>
            </>
        );
    };

    return (
        <SeriesScope config={config} className={className}>
            <Frame dense stacked className="@container w-full min-w-0">
                <FrameHeader className="min-w-0 flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <FrameTitle className="truncate">{title}</FrameTitle>
                            <Pill tone="outline">{`${num(signups)} trials`}</Pill>
                        </div>
                        <FrameDescription className="truncate">{description}</FrameDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <ToggleGroup variant="outline" size="sm" aria-label="Date range" {...periodToggle}>
                            {periods.map((p) => (
                                <ToggleGroupItem
                                    key={p.key}
                                    value={p.key}
                                    aria-label={`Last ${p.label}`}
                                    className="data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted"
                                >
                                    {p.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <Button variant="outline" size="icon-sm" aria-label="Replay animation" onClick={replay}>
                            <Icon name="rotate-ccw" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={paused ? 'Resume flow' : 'Pause flow'}
                            aria-pressed={paused}
                            onClick={() => setPaused(!paused)}
                            className="motion-reduce:hidden"
                        >
                            <Icon name={paused ? 'play' : 'pause'} />
                        </Button>
                    </div>
                </FrameHeader>
                <FramePanel>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="flow"
                                indexLabel="Flow"
                                series={[
                                    { key: 'value', label: 'Trials' },
                                    { key: 'rate', label: 'Of source' },
                                ]}
                                valueFormatter={(v: number, ctx: any) =>
                                    ctx && ctx.dataKey === 'rate' ? `${v}%` : num(v)
                                }
                                caption={aria}
                            />
                        }
                    >
                        <div className="overflow-x-auto">
                            <div ref={sweepRef}>
                                <div
                                    ref={plotRef}
                                    className="relative min-w-3xl"
                                    style={{ height: H }}
                                    onMouseMove={track}
                                    onMouseLeave={() => {
                                        setHover(null);
                                        setTip(null);
                                    }}
                                >
                                    <SankeyPlot
                                        width={plotW}
                                        height={H}
                                        layout={layout}
                                        label={aria}
                                        node={(p: any) => {
                                            const i = p.index;
                                            const n = nodes[i];
                                            if (!n) return <g />;
                                            const hd = headerOf[i];
                                            const left = n.col === 0;
                                            const tx = left ? p.x - 10 : p.x + p.width + 10;
                                            const cy = p.y + p.height / 2;
                                            return (
                                                <g className={FADE}>
                                                    {hd ? (
                                                        <text
                                                            x={hd.end ? p.x + p.width : p.x}
                                                            y={16}
                                                            textAnchor={hd.end ? 'end' : 'start'}
                                                            className="pointer-events-none"
                                                        >
                                                            <tspan className="fill-muted-foreground text-xs">
                                                                {hd.label}
                                                            </tspan>
                                                            <tspan
                                                                x={hd.end ? p.x + p.width : p.x}
                                                                dy={22}
                                                                className={`font-semibold tabular-nums ${
                                                                    hd.final
                                                                        ? 'fill-success text-base'
                                                                        : 'fill-foreground text-sm'
                                                                }`}
                                                            >
                                                                {hd.value}
                                                            </tspan>
                                                            {hd.rate ? (
                                                                <tspan
                                                                    dx={6}
                                                                    className="fill-muted-foreground text-xs tabular-nums"
                                                                >
                                                                    {hd.rate}
                                                                </tspan>
                                                            ) : null}
                                                        </text>
                                                    ) : null}
                                                    <rect
                                                        className="cursor-pointer"
                                                        x={p.x}
                                                        y={p.y}
                                                        width={p.width}
                                                        height={p.height}
                                                        rx={2}
                                                        fill={`var(--color-${n.kind})`}
                                                        onMouseEnter={() => setHover({ type: 'node', i })}
                                                        onMouseLeave={() => setHover(null)}
                                                    />
                                                    {labelled(i) ? (
                                                        <text
                                                            x={tx}
                                                            y={cy - 7}
                                                            textAnchor={left ? 'end' : 'start'}
                                                            dominantBaseline="middle"
                                                            stroke="var(--frame-panel-bg, var(--background))"
                                                            strokeWidth={4}
                                                            strokeLinejoin="round"
                                                            paintOrder="stroke"
                                                            className="pointer-events-none text-xs"
                                                        >
                                                            <tspan className="fill-foreground font-medium">
                                                                {n.name}
                                                            </tspan>
                                                            <tspan x={tx} dy={15} className="tabular-nums">
                                                                <tspan className="fill-muted-foreground">
                                                                    {num(n.value)}
                                                                </tspan>
                                                                {n.parent != null ? (
                                                                    <tspan dx={5} className="fill-muted-foreground">
                                                                        {pct(stepRate(i))}
                                                                    </tspan>
                                                                ) : null}
                                                            </tspan>
                                                        </text>
                                                    ) : null}
                                                </g>
                                            );
                                        }}
                                        link={(p: any) => {
                                            const k = p.index;
                                            const l = links[k];
                                            if (!l) return <g />;
                                            const kind = nodes[l.target].kind;
                                            const color = `var(--color-${kind})`;
                                            const d = `M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`;
                                            const count = Math.max(1, Math.round((maxPulses * l.value) / maxLink));
                                            const dur = DURS[k % DURS.length];
                                            const leak = kind === 'dropped';
                                            const w = Math.max(1, p.linkWidth);
                                            const pulses = [];
                                            for (let j = 0; j < count; j++) {
                                                const lane = (noise(k + 1, j + 1) - 0.5) * w * 0.7;
                                                const begin = `${(-(dur * j) / count - noise(j + 3, k) * 0.5).toFixed(2)}s`;
                                                pulses.push(
                                                    <circle
                                                        key={j}
                                                        cx={0}
                                                        cy={lane}
                                                        r={1.75}
                                                        fill={color}
                                                        fillOpacity={leak ? 0.9 : 0.55}
                                                        opacity={0}
                                                    >
                                                        <animateMotion
                                                            path={d}
                                                            dur={`${dur}s`}
                                                            begin={begin}
                                                            repeatCount="indefinite"
                                                            rotate="auto"
                                                            keyPoints={leak ? '0;0.64' : '0;1'}
                                                            keyTimes="0;1"
                                                            calcMode="linear"
                                                        />
                                                        <animate
                                                            attributeName="opacity"
                                                            values={leak ? '0;1;0' : '0;1;1;0'}
                                                            keyTimes={leak ? '0;0.14;1' : '0;0.12;0.88;1'}
                                                            dur={`${dur}s`}
                                                            begin={begin}
                                                            repeatCount="indefinite"
                                                        />
                                                    </circle>
                                                );
                                            }
                                            return (
                                                <g>
                                                    <path
                                                        className={`cursor-pointer ${FADE}`}
                                                        fill="none"
                                                        stroke={color}
                                                        strokeWidth={w}
                                                        opacity={linkOpacity(k)}
                                                        d={d}
                                                        onMouseEnter={() => setHover({ type: 'link', i: k })}
                                                        onMouseLeave={() => setHover(null)}
                                                    />
                                                    {motionOk ? (
                                                        <g
                                                            key={replayKey}
                                                            className={`pointer-events-none transition-opacity duration-200 motion-reduce:transition-none`}
                                                            opacity={pulseOpacity(k)}
                                                        >
                                                            {pulses}
                                                        </g>
                                                    ) : null}
                                                </g>
                                            );
                                        }}
                                    />
                                    {hover && tip ? (
                                        <FloatTip
                                            x={tip.x}
                                            y={tip.y}
                                            width={208}
                                            className="w-52"
                                            maxX={plotRef.current ? plotRef.current.clientWidth : 9999}
                                        >
                                            {tipBody()}
                                        </FloatTip>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </ChartFigure>
                    <ul className="sr-only">
                        {rows.map((r) => (
                            <li key={r.flow}>
                                {r.flow}: {num(r.value)} trials
                            </li>
                        ))}
                    </ul>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                        {(['journey', 'upgraded', 'dropped'] as Kind[]).map((k) => (
                            <span key={k} className="inline-flex items-center gap-1.5">
                                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${KIND_DOT[k]}`} />
                                {KIND_LABEL[k]}
                            </span>
                        ))}
                    </span>
                    <span className="text-muted-foreground">{footnote}</span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default TrialJourney;
