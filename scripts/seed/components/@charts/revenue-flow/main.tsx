import { useId, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
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
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { series, SeriesScope, useMotion, useElementWidth } from 'components:charts/chart-kit';
import { TEXT_TRIM, Pill, MetaDot, ServiceSelect } from 'components:charts/radial-kit';
import {
    lineageOfNode,
    lineageOfLink,
    RollingNumber,
    WipeReveal,
    linkPath,
    layoutSankey,
    SankeyPlot,
} from 'components:charts/sankey-kit';
import type { Lineage } from 'components:charts/sankey-kit';
import { KINDS, NODES, EDGES, QUARTERS, PICKABLE } from './data';
import type { FlowNode, FlowEdge, Quarter } from './data';

/**
 * components:charts/revenue-flow: a quarterly income statement as a sankey. Three revenue lines merge into
 * revenue, which splits into gross profit and cost of revenue, then operating income / expenses, down to
 * net income, tax and the expense lines. Hovering a node or a ribbon highlights its full lineage, clicking
 * a node pins it (dashed marching outline); an All / Revenue / Costs / Profit switch highlights one kind.
 * KPI tiles (revenue, gross margin, operating margin, net income) roll to their value with deltas vs the
 * prior quarter; a quarter picker, label toggles (values / share / quarter change), CSV and copy summary.
 *
 *   <RevenueFlow />                                          sample data
 *   <RevenueFlow nodes={[…]} edges={[…]} quarters={[…]} company="Acme" />
 *
 * Node kinds colour the bars; ribbons fade from the source colour to the target colour.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type RevenueFlowProps = {
    title?: string;
    company?: string;
    nodes?: FlowNode[];
    edges?: FlowEdge[];
    quarters?: Quarter[];
    /** How many quarters the picker offers (later ones only serve as comparison bases). */
    pickable?: number;
    defaultQuarter?: string;
    unitLabel?: string;
    noteLabel?: string;
    updatedLabel?: string;
    /** Node indexes behind the KPI tiles. */
    kpiNodes?: { revenue: number; gross: number; operating: number; net: number };
    className?: string;
};

type Hover = { type: 'node' | 'link'; i: number } | null;

const H = 384;
const MARGIN = { top: 12, right: 148, bottom: 12, left: 112 };
const FADE = 'transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
const DOT: Record<string, string> = { revenue: 'bg-foreground', cost: 'bg-destructive', profit: 'bg-success' };

const usd = (v: number) => `$${Math.round(v)}M`;
const signed = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`;

function nodeValues(nodes: FlowNode[], edges: FlowEdge[], values: number[]): number[] {
    return nodes.map((_n, i) => {
        const inflow = edges.reduce((a, e, k) => a + (e.target === i ? values[k] || 0 : 0), 0);
        const outflow = edges.reduce((a, e, k) => a + (e.source === i ? values[k] || 0 : 0), 0);
        return Math.max(inflow, outflow);
    });
}

function DeltaChip({ value, unit }: { value: number; unit: string }) {
    return (
        <Pill tone={value < 0 ? 'destructive' : 'success'}>
            <Icon name={value < 0 ? 'trending-down' : 'trending-up'} />
            <span className="tabular-nums">
                {signed(value)}
                {unit}
            </span>
        </Pill>
    );
}

function Ants({ x, y, width, height, color }: { x: number; y: number; width: number; height: number; color: string }) {
    const M = useMotion();
    const props = {
        x: x - 3,
        y: y - 3,
        width: width + 6,
        height: height + 6,
        rx: 3,
        fill: 'none',
        stroke: color,
        strokeWidth: 1,
        strokeDasharray: '2 2',
    };
    if (!M) return <rect {...props} />;
    return (
        <M.motion.rect
            {...props}
            animate={{ strokeDashoffset: [0, -4] }}
            transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
        />
    );
}

export function RevenueFlow({
    title = 'Revenue Flow',
    company = 'Fieldline',
    nodes = NODES,
    edges = EDGES,
    quarters = QUARTERS,
    pickable = PICKABLE,
    defaultQuarter,
    unitLabel = 'USD millions',
    noteLabel = 'Demo figures, unaudited',
    updatedLabel = 'Updated Oct 9, 2026',
    kpiNodes = { revenue: 3, gross: 4, operating: 6, net: 8 },
    className,
}: RevenueFlowProps) {
    const offered = quarters.slice(0, Math.max(1, Math.min(pickable, quarters.length)));
    const first = defaultQuarter && offered.some((q) => q.key === defaultQuarter) ? defaultQuarter : offered[0].key;
    const [qKey, setQKey] = useState(first);
    const [kind, setKind] = useState('all');
    const [hover, setHover] = useState<Hover>(null);
    const [pinned, setPinned] = useState<number | null>(null);
    const [showValues, setShowValues] = useState(true);
    const [showShare, setShowShare] = useState(true);
    const [showChange, setShowChange] = useState(false);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
    const plotRef = useRef<HTMLDivElement | null>(null);
    const plotW = useElementWidth(plotRef);
    const uid = 'rf' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

    const qi = Math.max(
        0,
        quarters.findIndex((q) => q.key === qKey)
    );
    const q = quarters[qi];
    const prev = quarters[qi + 1] || null;

    const config = useMemo(() => {
        const cfg: Record<string, any> = {};
        KINDS.forEach((k) => {
            cfg[k.key] = series(k.light, k.dark, k.label);
        });
        return cfg;
    }, []);

    const vals = useMemo(() => nodeValues(nodes, edges, q.values), [nodes, edges, q]);
    const prevVals = useMemo(() => (prev ? nodeValues(nodes, edges, prev.values) : null), [nodes, edges, prev]);
    const total = vals[kpiNodes.revenue] || Math.max.apply(null, vals);
    const totalIdx = vals.indexOf(total);
    const links = edges.map((e, k) => ({ source: e.source, target: e.target, value: q.values[k] || 0 }));
    const layout = useMemo(
        () =>
            layoutSankey({
                count: nodes.length,
                links,
                width: plotW,
                height: H,
                margin: MARGIN,
                nodeWidth: 10,
                nodePadding: 28,
                iterations: 32,
                relaxOrder: 'recharts',
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nodes, edges, q, plotW]
    );

    const kpi = (v: number[]) => ({
        revenue: v[kpiNodes.revenue],
        gm: (v[kpiNodes.gross] / v[kpiNodes.revenue]) * 100,
        om: (v[kpiNodes.operating] / v[kpiNodes.revenue]) * 100,
        ni: v[kpiNodes.net],
    });
    const now = kpi(vals);
    const before = prevVals ? kpi(prevVals) : null;
    const kpis = [
        {
            key: 'revenue',
            label: 'Revenue',
            dot: 'bg-foreground',
            text: usd(now.revenue),
            delta: before ? (now.revenue / before.revenue - 1) * 100 : null,
            unit: '%',
        },
        {
            key: 'gm',
            label: 'Gross Margin',
            dot: 'bg-success',
            text: `${now.gm.toFixed(1)}%`,
            delta: before ? now.gm - before.gm : null,
            unit: ' pts',
        },
        {
            key: 'om',
            label: 'Operating Margin',
            dot: 'bg-success',
            text: `${now.om.toFixed(1)}%`,
            delta: before ? now.om - before.om : null,
            unit: ' pts',
        },
        {
            key: 'ni',
            label: 'Net Income',
            dot: 'bg-success',
            text: usd(now.ni),
            delta: before ? (now.ni / before.ni - 1) * 100 : null,
            unit: '%',
        },
    ];

    const lineage: Lineage | null = hover
        ? hover.type === 'node'
            ? lineageOfNode(links, hover.i)
            : lineageOfLink(links, hover.i)
        : pinned != null
          ? lineageOfNode(links, pinned)
          : null;
    const linkOpacity = (k: number) => {
        if (lineage) return lineage.links.has(k) ? 0.5 : 0.07;
        if (kind !== 'all') return nodes[edges[k].target].kind === kind ? 0.5 : 0.07;
        return 0.26;
    };
    const nodeOpacity = (i: number) => (lineage && !lineage.nodes.has(i) ? 0.35 : 1);
    const share = (v: number) => (total ? (v / total) * 100 : 0);

    const rows = edges.map((e, k) => ({
        flow: `${nodes[e.source].name} to ${nodes[e.target].name}`,
        source: nodes[e.source].name,
        target: nodes[e.target].name,
        value: q.values[k] || 0,
        share: Math.round(share(q.values[k] || 0) * 10) / 10,
    }));
    const aria = `Income statement flow from ${usd(total)} revenue to ${usd(now.ni)} net income`;
    const summary = `${title}, ${q.short}: revenue ${usd(now.revenue)}${
        kpis[0].delta != null ? ` (${signed(kpis[0].delta)}% vs ${prev ? prev.short : ''})` : ''
    }, gross margin ${now.gm.toFixed(1)}%, operating margin ${now.om.toFixed(1)}%, net income ${usd(now.ni)}. ${rows
        .map((r) => `${r.flow}: ${usd(r.value)}`)
        .join('; ')}.`;
    const columns = [
        { key: 'source', label: 'Source' },
        { key: 'target', label: 'Target' },
        { key: 'value', label: 'Amount (USD M)' },
        { key: 'share', label: 'Share of revenue (%)' },
    ];
    const kindToggle = useSingleToggle(kind, (v: string) => setKind(v));
    const reset = () => {
        setQKey(first);
        setKind('all');
        setPinned(null);
        setHover(null);
        setShowValues(true);
        setShowShare(true);
        setShowChange(false);
        setView('chart');
    };
    const track = (e: any) => {
        const box = plotRef.current ? plotRef.current.getBoundingClientRect() : null;
        if (box) setTip({ x: e.clientX - box.left, y: e.clientY - box.top });
    };
    const colorOf = (i: number) => `var(--color-${nodes[i].kind})`;
    const kindLabel = (k: string) => (KINDS.find((x) => x.key === k) || { label: k }).label;

    const tipBody = () => {
        if (!hover) return null;
        if (hover.type === 'node') {
            const n = nodes[hover.i];
            const v = vals[hover.i];
            const p = prevVals ? prevVals[hover.i] : null;
            return (
                <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{n.name}</span>
                        <span className="text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[n.kind]}`} />
                                {n.kind === 'cost' ? 'Cost' : kindLabel(n.kind)}
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center justify-between gap-4 text-muted-foreground">
                            Amount<span className="font-mono font-medium text-foreground tabular-nums">{usd(v)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-4 text-muted-foreground">
                            Share of revenue
                            <span className="font-mono font-medium text-foreground tabular-nums">
                                {share(v).toFixed(1)}%
                            </span>
                        </span>
                        {p ? (
                            <span className="flex items-center justify-between gap-4 text-muted-foreground">
                                vs {prev ? prev.short : ''}
                                <span className="font-mono font-medium text-foreground tabular-nums">
                                    {signed((v / p - 1) * 100)}%
                                </span>
                            </span>
                        ) : null}
                    </div>
                </div>
            );
        }
        const e = edges[hover.i];
        const v = q.values[hover.i] || 0;
        return (
            <div className="flex flex-1 flex-col gap-1.5">
                <span className="flex items-center gap-1.5 font-medium [&_svg:not([class*=size-])]:size-3.5">
                    {nodes[e.source].name}
                    <span className="text-muted-foreground">
                        <Icon name="arrow-right" />
                    </span>
                    {nodes[e.target].name}
                </span>
                <div className="flex flex-col gap-1">
                    <span className="flex items-center justify-between gap-4 text-muted-foreground">
                        Flow<span className="font-mono font-medium text-foreground tabular-nums">{usd(v)}</span>
                    </span>
                    {vals[e.source] !== total ? (
                        <span className="flex items-center justify-between gap-4 text-muted-foreground">
                            Of {nodes[e.source].name}
                            <span className="font-mono font-medium text-foreground tabular-nums">
                                {((v / vals[e.source]) * 100).toFixed(1)}%
                            </span>
                        </span>
                    ) : null}
                    <span className="flex items-center justify-between gap-4 text-muted-foreground">
                        Of revenue
                        <span className="font-mono font-medium text-foreground tabular-nums">
                            {share(v).toFixed(1)}%
                        </span>
                    </span>
                </div>
            </div>
        );
    };

    return (
        <SeriesScope config={config} className={className}>
            <Frame dense stacked className="@container w-full min-w-0">
                <FrameHeader className="min-w-0 flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <FrameTitle className="truncate">{title}</FrameTitle>
                            <Pill tone="outline">{q.short}</Pill>
                        </div>
                        <FrameDescription className="truncate">
                            Where each dollar of {company} revenue goes
                        </FrameDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <ServiceSelect
                            label="Quarter"
                            value={qKey}
                            align="end"
                            onValueChange={(v) => {
                                setQKey(v);
                                setPinned(null);
                            }}
                            options={offered.map((o) => ({ value: o.key, label: o.label }))}
                            className="h-7 w-32"
                        />
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
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Labels</DropdownMenuLabel>
                                    <DropdownMenuCheckboxItem
                                        checked={showValues}
                                        onCheckedChange={(v: boolean) => setShowValues(!!v)}
                                    >
                                        Values
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={showShare}
                                        onCheckedChange={(v: boolean) => setShowShare(!!v)}
                                    >
                                        Share of Revenue
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={showChange}
                                        disabled={!prev}
                                        onCheckedChange={(v: boolean) => setShowChange(!!v)}
                                    >
                                        Quarter Change
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const name = `revenue-flow-${q.key}.csv`;
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
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                    <Icon name={view === 'table' ? 'workflow' : 'table'} />
                                    {view === 'table' ? 'View as Chart' : 'View as Table'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={reset}>
                                    <Icon name="rotate-ccw" />
                                    Reset View
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </FrameHeader>
                <FramePanel>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 @2xl:grid-cols-4">
                        {kpis.map((k) => (
                            <div
                                key={k.key}
                                className="flex min-w-0 flex-col gap-1.5 @2xl:not-first:border-s @2xl:not-first:ps-6"
                            >
                                <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${k.dot}`} />
                                    {k.label}
                                </dt>
                                <dd className="flex min-w-0 flex-col gap-1.5">
                                    <span className="inline-flex text-xl leading-none font-semibold tracking-tight tabular-nums">
                                        <RollingNumber text={k.text} />
                                    </span>
                                    {k.delta != null ? (
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <DeltaChip value={k.delta} unit={k.unit} />
                                            <span className="hidden truncate text-xs text-muted-foreground @3xl:inline">
                                                vs {prev ? prev.short : ''}
                                            </span>
                                        </span>
                                    ) : null}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </FramePanel>
                <FramePanel className="flex flex-col gap-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <ToggleGroup variant="outline" size="sm" aria-label="Highlight flows" {...kindToggle}>
                            <ToggleGroupItem
                                value="all"
                                className="data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted"
                            >
                                <span className={TEXT_TRIM}>All</span>
                            </ToggleGroupItem>
                            {KINDS.map((k) => (
                                <ToggleGroupItem
                                    key={k.key}
                                    value={k.key}
                                    className="data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted"
                                >
                                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[k.key]}`} />
                                    <span className={TEXT_TRIM}>{k.label}</span>
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <span className="hidden text-xs text-muted-foreground @lg:inline">
                            {pinned != null
                                ? `Tracing ${nodes[pinned].name}, click it again to clear`
                                : 'Click a node to trace its flow'}
                        </span>
                    </div>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="flow"
                                indexLabel="Flow"
                                series={[
                                    { key: 'value', label: 'Amount' },
                                    { key: 'share', label: 'Share of revenue' },
                                ]}
                                valueFormatter={(v: number, ctx: any) =>
                                    ctx && ctx.dataKey === 'share' ? `${v}%` : usd(v)
                                }
                                caption={aria}
                            />
                        }
                    >
                        <div className="-mx-1 overflow-x-auto px-1">
                            <div
                                ref={plotRef}
                                className="relative min-w-3xl overflow-hidden"
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
                                        const v = vals[i];
                                        const left = p.depth === 0;
                                        const tx = left ? p.x - 8 : p.x + p.width + 8;
                                        const cy = p.y + p.height / 2;
                                        const pv = prevVals ? prevVals[i] : null;
                                        const second =
                                            showValues || (showShare && i !== totalIdx) || (showChange && pv);
                                        return (
                                            <g
                                                className={`cursor-pointer ${FADE}`}
                                                opacity={nodeOpacity(i)}
                                                onMouseEnter={() => setHover({ type: 'node', i })}
                                                onMouseLeave={() => setHover(null)}
                                                onClick={() => setPinned(pinned === i ? null : i)}
                                            >
                                                <rect
                                                    x={p.x}
                                                    y={p.y}
                                                    width={p.width}
                                                    height={p.height}
                                                    rx={1.5}
                                                    fill={colorOf(i)}
                                                />
                                                {pinned === i ? (
                                                    <Ants
                                                        x={p.x}
                                                        y={p.y}
                                                        width={p.width}
                                                        height={p.height}
                                                        color={colorOf(i)}
                                                    />
                                                ) : null}
                                                <text
                                                    x={tx}
                                                    y={second ? cy - 7 : cy}
                                                    textAnchor={left ? 'end' : 'start'}
                                                    dominantBaseline="middle"
                                                    stroke="var(--frame-panel-bg, var(--background))"
                                                    strokeWidth={4}
                                                    strokeLinejoin="round"
                                                    paintOrder="stroke"
                                                    className="pointer-events-none text-xs"
                                                >
                                                    <tspan className="fill-foreground font-medium">{n.name}</tspan>
                                                    {second ? (
                                                        <tspan x={tx} dy={15} className="tabular-nums">
                                                            {showValues ? (
                                                                <tspan className="fill-foreground">{usd(v)}</tspan>
                                                            ) : null}
                                                            {showShare && i !== totalIdx ? (
                                                                <tspan
                                                                    dx={showValues ? 5 : 0}
                                                                    className="fill-muted-foreground"
                                                                >
                                                                    {Math.round(share(v))}%
                                                                </tspan>
                                                            ) : null}
                                                            {showChange && pv ? (
                                                                <tspan
                                                                    dx={5}
                                                                    className={
                                                                        v >= pv ? 'fill-success' : 'fill-destructive'
                                                                    }
                                                                >
                                                                    {signed((v / pv - 1) * 100)}%
                                                                </tspan>
                                                            ) : null}
                                                        </tspan>
                                                    ) : null}
                                                </text>
                                            </g>
                                        );
                                    }}
                                    link={(p: any) => {
                                        const k = p.index;
                                        const e = edges[k];
                                        if (!e) return <g />;
                                        const gid = `${uid}-link-${k}`;
                                        return (
                                            <g>
                                                <defs>
                                                    <linearGradient
                                                        id={gid}
                                                        x1={p.sourceX}
                                                        y1="0"
                                                        x2={p.targetX}
                                                        y2="0"
                                                        gradientUnits="userSpaceOnUse"
                                                    >
                                                        <stop offset="0%" stopColor={colorOf(e.source)} />
                                                        <stop offset="100%" stopColor={colorOf(e.target)} />
                                                    </linearGradient>
                                                </defs>
                                                <g className={FADE} opacity={linkOpacity(k)}>
                                                    <path
                                                        className="cursor-pointer"
                                                        fill="none"
                                                        stroke={`url(#${gid})`}
                                                        strokeWidth={Math.max(1, p.linkWidth)}
                                                        d={linkPath(p.sourceX, p.sourceY, p.targetX, p.targetY)}
                                                        onMouseEnter={() => setHover({ type: 'link', i: k })}
                                                        onMouseLeave={() => setHover(null)}
                                                    />
                                                </g>
                                            </g>
                                        );
                                    }}
                                />
                                {hover && tip ? (
                                    <div
                                        className="pointer-events-none absolute z-10 grid w-56 min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
                                        style={{
                                            left: Math.min(
                                                tip.x + 12,
                                                (plotRef.current ? plotRef.current.clientWidth : 9999) - 232
                                            ),
                                            top: Math.max(4, tip.y + 12),
                                        }}
                                    >
                                        <div className="flex w-full flex-wrap items-center gap-2">{tipBody()}</div>
                                    </div>
                                ) : null}
                                <WipeReveal />
                            </div>
                        </div>
                    </ChartFigure>
                    <ul className="sr-only">
                        {rows.map((r) => (
                            <li key={r.flow}>
                                {r.flow}: {usd(r.value)}
                            </li>
                        ))}
                    </ul>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        {unitLabel}
                        <MetaDot />
                        {noteLabel}
                    </span>
                    <span className="text-muted-foreground">{updatedLabel}</span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default RevenueFlow;
