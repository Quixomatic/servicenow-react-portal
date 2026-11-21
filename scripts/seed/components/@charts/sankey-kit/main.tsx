import { useEffect, useState } from 'react';
import { useMotion } from 'components:charts/chart-kit';

/**
 * components:charts/sankey-kit: pieces shared by the sankey chart blocks (revenue-flow, trial-journey,
 * pipeline-leakage).
 *
 * - lineageOfNode / lineageOfLink: every link and node upstream and downstream of a node or a link, for
 *   "hover highlights the full lineage".
 * - RollingNumber: an odometer value; each digit is a 0-9 column that rolls to its place (staggered 40 ms).
 * - WipeReveal: a card-coloured gradient that slides off the plot once, revealing it left to right.
 * - linkPath: the cubic ribbon centre-line path Recharts draws for a sankey link.
 * - reducedMotion(): prefers-reduced-motion check.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type FlowLink = { source: number; target: number; value: number };
export type Lineage = { links: Set<number>; nodes: Set<number> };

export function reducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        !!window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function walk(links: FlowLink[], start: number, dir: 'up' | 'down', out: Lineage) {
    const stack = [start];
    while (stack.length) {
        const n = stack.pop() as number;
        out.nodes.add(n);
        links.forEach((l, i) => {
            const from = dir === 'down' ? l.source : l.target;
            const to = dir === 'down' ? l.target : l.source;
            if (from === n && !out.links.has(i)) {
                out.links.add(i);
                stack.push(to);
            }
        });
    }
}

/** All links / nodes feeding into and flowing out of node `n`. */
export function lineageOfNode(links: FlowLink[], n: number): Lineage {
    const out: Lineage = { links: new Set(), nodes: new Set([n]) };
    walk(links, n, 'up', out);
    walk(links, n, 'down', out);
    return out;
}

/** Link `i`, everything upstream of its source and everything downstream of its target. */
export function lineageOfLink(links: FlowLink[], i: number): Lineage {
    const l = links[i];
    const out: Lineage = { links: new Set([i]), nodes: new Set([l.source, l.target]) };
    walk(links, l.source, 'up', out);
    walk(links, l.target, 'down', out);
    return out;
}

/** The centre line of a sankey ribbon from (x0, y0) to (x1, y1), curvature 0.5. */
export function linkPath(x0: number, y0: number, x1: number, y1: number, curvature = 0.5): string {
    const xi = x0 + (x1 - x0) * curvature;
    const xj = x1 - (x1 - x0) * curvature;
    return `M${x0},${y0} C${xi},${y0} ${xj},${y1} ${x1},${y1}`;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * An odometer number: digits roll from 0 on mount and to their new place on change (700 ms, staggered
 * 40 ms per digit); other characters ($ . % M) render as is. The full text is in an sr-only span.
 */
export function RollingNumber({ text, className = '' }: { text: string; className?: string }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);
    const chars = text.split('');
    let digit = 0;
    return (
        <span className={`inline-flex ${className}`}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true" className="inline-flex">
                {chars.map((c, i) => {
                    if (c < '0' || c > '9') return <span key={i}>{c}</span>;
                    const d = Number(c);
                    const delay = digit * 40;
                    digit += 1;
                    return (
                        <span key={i} className="inline-block h-[1em] overflow-hidden">
                            <span
                                className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                                style={{
                                    transform: `translateY(-${(ready ? d : 0) * 10}%)`,
                                    transitionDelay: `${delay}ms`,
                                }}
                            >
                                {DIGITS.map((n) => (
                                    <span key={n} className="h-[1em] leading-none">
                                        {n}
                                    </span>
                                ))}
                            </span>
                        </span>
                    );
                })}
            </span>
        </span>
    );
}

/**
 * Slides a gradient (transparent to the panel colour over 8rem) off to the right once, revealing what is
 * under it (1.3 s, 100 ms delay, cubic-bezier(0.65, 0, 0.35, 1)). Renders nothing under reduced motion.
 */
export function WipeReveal({
    replay = 0,
    duration = 1.3,
    delay = 0.1,
}: {
    replay?: any;
    duration?: number;
    delay?: number;
}) {
    const M = useMotion();
    const [done, setDone] = useState(false);
    useEffect(() => setDone(false), [replay]);
    if (!M || done || reducedMotion()) return null;
    return (
        <M.motion.div
            key={String(replay)}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-32 w-[calc(100%+8rem)]"
            style={{
                background: 'linear-gradient(to right, transparent, var(--frame-panel-bg, var(--background)) 8rem)',
            }}
            initial={{ x: '0%' }}
            animate={{ x: '100%' }}
            transition={{ duration, delay, ease: [0.65, 0, 0.35, 1] }}
            onAnimationComplete={() => setDone(true)}
        />
    );
}

/** A floating tooltip panel at (x, y) inside a relative plot box, kept inside `maxX`. */
export function FloatTip({
    x,
    y,
    width = 224,
    maxX = 9999,
    className = 'w-56',
    children,
}: {
    x: number;
    y: number;
    width?: number;
    maxX?: number;
    className?: string;
    children?: any;
}) {
    return (
        <div
            className={`pointer-events-none absolute z-10 grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl ${className}`}
            style={{ left: Math.max(4, Math.min(x + 12, maxX - width - 8)), top: Math.max(4, y + 12) }}
        >
            <div className="flex w-full flex-wrap items-center gap-2">
                <div className="flex flex-1 flex-col gap-1.5">{children}</div>
            </div>
        </div>
    );
}

/** A tooltip row: muted label, mono value on the right. */
export function TipLine({ label, value }: { label: any; value: any }) {
    return (
        <span className="flex items-center justify-between gap-4 text-muted-foreground">
            {label}
            <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
        </span>
    );
}

export type SankeyNodeBox = {
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number;
    value: number;
};
export type SankeyLinkBox = {
    index: number;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourceControlX: number;
    targetControlX: number;
    linkWidth: number;
};

/**
 * A small sankey layout with fixed node order: each node sits at its depth (longest path from a source,
 * left aligned, so a drop-off stays beside the stage it leaves), columns stack top-down in the given
 * order with `nodePadding`, and `iterations` > 0 relaxes each column toward its neighbours (keeping the
 * order). Returns boxes shaped like the props Recharts passes to custom sankey node / link renderers.
 */
export function layoutSankey({
    count,
    links,
    width,
    height,
    margin,
    nodeWidth,
    nodePadding,
    iterations = 0,
    relaxOrder = 'forward',
    curvature = 0.5,
}: {
    count: number;
    links: FlowLink[];
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    nodeWidth: number;
    nodePadding: number;
    iterations?: number;
    /** 'recharts' relaxes like Recharts' Sankey (targets first, alpha 0.99^n from the first pass). */
    relaxOrder?: 'forward' | 'recharts';
    curvature?: number;
}): { nodes: SankeyNodeBox[]; links: SankeyLinkBox[] } {
    const depth: number[] = new Array(count).fill(0);
    for (let pass = 0; pass < count; pass++) {
        let moved = false;
        links.forEach((l) => {
            if (depth[l.target] < depth[l.source] + 1) {
                depth[l.target] = depth[l.source] + 1;
                moved = true;
            }
        });
        if (!moved) break;
    }
    const value = new Array(count).fill(0).map((_v, i) => {
        const inflow = links.reduce((a, l) => a + (l.target === i ? l.value : 0), 0);
        const outflow = links.reduce((a, l) => a + (l.source === i ? l.value : 0), 0);
        return Math.max(inflow, outflow);
    });
    const maxDepth = Math.max(0, Math.max.apply(null, depth));
    const innerW = Math.max(1, width - margin.left - margin.right);
    const top = margin.top;
    const bottom = height - margin.bottom;
    const columns: number[][] = [];
    for (let d = 0; d <= maxDepth; d++) columns.push([]);
    depth.forEach((d, i) => columns[d].push(i));
    const ky = Math.min.apply(
        null,
        columns
            .filter((c) => c.length)
            .map(
                (c) =>
                    (bottom - top - (c.length - 1) * nodePadding) /
                    Math.max(
                        1,
                        c.reduce((a, i) => a + value[i], 0)
                    )
            )
    );
    const y: number[] = new Array(count).fill(0);
    const h = value.map((v) => v * ky);
    columns.forEach((c) => {
        let cur = top;
        c.forEach((i) => {
            y[i] = cur;
            cur += h[i] + nodePadding;
        });
    });
    const resolve = (c: number[]) => {
        let cur = top;
        c.forEach((i) => {
            if (y[i] < cur) y[i] = cur;
            cur = y[i] + h[i] + nodePadding;
        });
        let floor = bottom;
        for (let k = c.length - 1; k >= 0; k--) {
            const i = c[k];
            if (y[i] + h[i] > floor) y[i] = floor - h[i];
            floor = y[i] - nodePadding;
        }
    };
    const centre = (i: number) => y[i] + h[i] / 2;
    // perColumn: resolve each column right after moving it; otherwise move every column, then resolve all
    // (Recharts' order).
    const towardSources = (alpha: number, perColumn = true) => {
        for (let d = 1; d <= maxDepth; d++) {
            columns[d].forEach((i) => {
                const ins = links.filter((l) => l.target === i);
                const w = ins.reduce((a, l) => a + l.value, 0);
                if (w) y[i] += (ins.reduce((a, l) => a + centre(l.source) * l.value, 0) / w - centre(i)) * alpha;
            });
            if (perColumn) resolve(columns[d]);
        }
        if (!perColumn) columns.forEach(resolve);
    };
    const towardTargets = (alpha: number, perColumn = true) => {
        for (let d = maxDepth - 1; d >= 0; d--) {
            columns[d].forEach((i) => {
                const outs = links.filter((l) => l.source === i);
                const w = outs.reduce((a, l) => a + l.value, 0);
                if (w) y[i] += (outs.reduce((a, l) => a + centre(l.target) * l.value, 0) / w - centre(i)) * alpha;
            });
            if (perColumn) resolve(columns[d]);
        }
        if (!perColumn) columns.forEach(resolve);
    };
    for (let it = 0; it < iterations; it++) {
        if (relaxOrder === 'recharts') {
            const alpha = Math.pow(0.99, it + 1);
            towardTargets(alpha, false);
            towardSources(alpha, false);
        } else {
            const alpha = Math.pow(0.99, it);
            towardSources(alpha);
            towardTargets(alpha);
        }
    }
    const x = depth.map((d) => margin.left + (maxDepth ? (d * (innerW - nodeWidth)) / maxDepth : 0));
    const nodes: SankeyNodeBox[] = value.map((v, i) => ({
        index: i,
        x: x[i],
        y: y[i],
        width: nodeWidth,
        height: h[i],
        depth: depth[i],
        value: v,
    }));
    const outOffset = new Array(count).fill(0);
    const inOffset = new Array(count).fill(0);
    const sy: number[] = [];
    const ty: number[] = [];
    const order = links.map((_l, k) => k);
    order
        .slice()
        .sort((a, b) => links[a].source - links[b].source || y[links[a].target] - y[links[b].target])
        .forEach((k) => {
            const l = links[k];
            sy[k] = y[l.source] + outOffset[l.source] + (l.value * ky) / 2;
            outOffset[l.source] += l.value * ky;
        });
    order
        .slice()
        .sort((a, b) => links[a].target - links[b].target || y[links[a].source] - y[links[b].source])
        .forEach((k) => {
            const l = links[k];
            ty[k] = y[l.target] + inOffset[l.target] + (l.value * ky) / 2;
            inOffset[l.target] += l.value * ky;
        });
    const boxes: SankeyLinkBox[] = links.map((l, k) => {
        const x0 = x[l.source] + nodeWidth;
        const x1 = x[l.target];
        return {
            index: k,
            sourceX: x0,
            sourceY: sy[k],
            targetX: x1,
            targetY: ty[k],
            sourceControlX: x0 + (x1 - x0) * curvature,
            targetControlX: x1 - (x1 - x0) * curvature,
            linkWidth: l.value * ky,
        };
    });
    return { nodes, links: boxes };
}

/** Draws a layoutSankey() result: links first, then nodes, through the given renderers. */
export function SankeyPlot({
    width,
    height,
    layout,
    node,
    link,
    label,
    className = '',
}: {
    width: number;
    height: number;
    layout: { nodes: SankeyNodeBox[]; links: SankeyLinkBox[] };
    node: (p: SankeyNodeBox) => any;
    link: (p: SankeyLinkBox) => any;
    label?: string;
    className?: string;
}) {
    if (!width) return null;
    return (
        <svg
            role="img"
            aria-label={label}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={`recharts-surface block overflow-visible text-xs ${className}`}
        >
            <g className="recharts-sankey-links">
                {layout.links.map((l) => (
                    <g key={l.index}>{link(l)}</g>
                ))}
            </g>
            <g className="recharts-sankey-nodes">
                {layout.nodes.map((n) => (
                    <g key={n.index}>{node(n)}</g>
                ))}
            </g>
        </svg>
    );
}

export default RollingNumber;
