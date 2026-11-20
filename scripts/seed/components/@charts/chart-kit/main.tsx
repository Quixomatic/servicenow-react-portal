import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartStyle, chartKey, prefersReducedMotion, useRecharts } from 'components:chart';
import { Button } from 'components:button';
import { Popover, PopoverContent, PopoverTrigger } from 'components:popover';
import { PALETTE } from './palette';

/**
 * components:charts/chart-kit: shared pieces for the chart gallery blocks (components:charts/*).
 *
 * - Colours: PALETTE (Tailwind v4 palette values), tw('indigo-500'), series(light, dark) → a ChartConfig
 *   entry with light / dark values, and SeriesScope: puts the config's --color-<key> variables on a
 *   wrapper, so legends, KPI dots and tooltips outside the plot use the same colours.
 * - Motion: useMotion() (Motion v12 from the lazy chart chunk), EASE_OUT (cubic-bezier(0.22, 1, 0.36, 1)),
 *   useEnterAnimation(rootRef, steps, deps): Motion keyframe animations on the plot's elements as soon as
 *   Recharts draws them (before paint, so nothing flashes), skipped under reduced motion.
 * - Marks: PingDot (the pulsing last point), HaloDot (the three-ring hover dot).
 * - Formatters: compact (1.4M / 477K), money, percent, signedPercent, shortDate.
 *
 * Visual design of the blocks inspired by ReUI's chart blocks (reui.io); independent implementation.
 */

export { PALETTE };

/** A Tailwind palette colour by name ('indigo-500'); unknown names pass through as CSS. */
export function tw(name: string): string {
    return PALETTE[name] || name;
}

export type SeriesColor = { label?: string; theme: { light: string; dark: string } };

/** A ChartConfig entry with light / dark colours: series('indigo-500', 'indigo-400', 'This period'). */
export function series(light: string, dark?: string, label?: string): SeriesColor {
    return { label, theme: { light: tw(light), dark: tw(dark || light) } };
}

/**
 * Wraps children in an element carrying the config's --color-<key> variables (light and dark), so
 * everything inside (plot, legend, tooltip, KPI dots) can use var(--color-<key>).
 */
export function SeriesScope({
    config,
    className,
    children,
    as = 'div',
    ...props
}: {
    config: Record<string, any>;
    className?: string;
    children?: any;
    as?: any;
    [k: string]: any;
}) {
    const uid = useId();
    const id = `rp-series-${chartKey(uid)}`;
    const Tag = as;
    return (
        <Tag data-chart={id} className={className} {...props}>
            <ChartStyle id={id} config={config} />
            {children}
        </Tag>
    );
}

/* ---------------- Motion ---------------- */

/** cubic-bezier(0.22, 1, 0.36, 1): the gallery's enter easing. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Motion v12 (motion/react) from the lazily loaded chart chunk; null until it loads. */
export function useMotion(): any {
    const R = useRecharts();
    return R ? R.Motion : null;
}

export type EnterContext = {
    /** Plot area of the surface (the clip rect Recharts draws for the grid). */
    plot: { x: number; y: number; width: number; height: number };
    /** Bottom of the plot (the baseline area layers grow from). */
    baseline: number;
    surface: SVGSVGElement;
};

export type EnterStep = {
    /** Elements to animate, inside the root (e.g. '.recharts-area', '.recharts-area-dots > *'). */
    selector: string;
    /** Keyframes ({ transform: [from, to], opacity: [0, 1] }) or a function of (element, index, context). */
    keyframes: Record<string, any[]> | ((el: Element, i: number, ctx: EnterContext) => Record<string, any[]>);
    /** Seconds. */
    duration?: number;
    /** Seconds, or a function of the element index (stagger). */
    delay?: number | ((i: number, el: Element) => number);
    ease?: any;
    /** Inline styles set before animating (e.g. transform-origin at the baseline). */
    style?: Record<string, string> | ((el: Element, ctx: EnterContext) => Record<string, string>);
};

function plotOf(surface: SVGSVGElement) {
    const rect = surface.querySelector('clipPath rect');
    if (rect) {
        const x = Number(rect.getAttribute('x')) || 0;
        const y = Number(rect.getAttribute('y')) || 0;
        const width = Number(rect.getAttribute('width')) || 0;
        const height = Number(rect.getAttribute('height')) || 0;
        return { x, y, width, height };
    }
    const w = Number(surface.getAttribute('width')) || 0;
    const h = Number(surface.getAttribute('height')) || 0;
    return { x: 0, y: 0, width: w, height: h };
}

/**
 * Runs Motion keyframe animations on a chart's elements once Recharts has drawn them. A MutationObserver
 * starts them in the same task as the DOM change, before the browser paints, so the final frame never
 * flashes first. Re-runs when `deps` change (pass a replay key / the data). No-op under reduced motion.
 */
export function useEnterAnimation(rootRef: { current: Element | null }, steps: EnterStep[], deps: any[] = []) {
    const Motion = useMotion();
    const stepsRef = useRef(steps);
    stepsRef.current = steps;
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || !Motion || prefersReducedMotion()) return undefined;
        const controls: any[] = [];
        let done = false;
        const tryStart = () => {
            if (done) return false;
            const surface = root.querySelector('svg.recharts-surface') as SVGSVGElement | null;
            if (!surface) return false;
            const first = stepsRef.current.find((s) => root.querySelector(s.selector));
            if (!first) return false;
            done = true;
            const plot = plotOf(surface);
            const ctx: EnterContext = { plot, baseline: plot.y + plot.height, surface };
            for (const step of stepsRef.current) {
                const els = Array.prototype.slice.call(root.querySelectorAll(step.selector)) as Element[];
                els.forEach((el, i) => {
                    const st = typeof step.style === 'function' ? step.style(el, ctx) : step.style;
                    if (st) for (const k in st) (el as HTMLElement).style.setProperty(k, st[k]);
                    const kf = typeof step.keyframes === 'function' ? step.keyframes(el, i, ctx) : step.keyframes;
                    const delay = typeof step.delay === 'function' ? step.delay(i, el) : step.delay || 0;
                    controls.push(
                        Motion.animate(el, kf, {
                            duration: step.duration != null ? step.duration : 0.78,
                            delay,
                            ease: step.ease || EASE_OUT,
                        })
                    );
                });
            }
            return true;
        };
        if (tryStart()) return () => controls.forEach((c) => c && c.stop && c.stop());
        const mo = new MutationObserver(() => {
            if (tryStart()) mo.disconnect();
        });
        mo.observe(root, { childList: true, subtree: true });
        return () => {
            mo.disconnect();
            controls.forEach((c) => c && c.stop && c.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Motion].concat(deps));
}

/** [replayKey, replay]: bump to replay a chart's enter animation (the Refresh button). */
export function useReplayKey(): [number, () => void] {
    const [k, setK] = useState(0);
    return [k, useCallback(() => setK((v) => v + 1), [])];
}

/** Keyframes: an area layer growing from the baseline (scaleY + fade). Pair with baselineOrigin. */
export const GROW_Y = { transform: ['scaleY(0)', 'scaleY(1)'], opacity: [0, 1] };

/** Style for GROW_Y: transform-origin at the plot baseline, in view-box coordinates. */
export function baselineOrigin(_el: Element, ctx: EnterContext) {
    return { 'transform-box': 'view-box', 'transform-origin': `0px ${ctx.baseline}px` };
}

/** Keyframes: a dot / mark rising from the baseline to its place (reads cy from the element). */
export function riseFromBaseline(el: Element, _i: number, ctx: EnterContext) {
    const c = el.tagName.toLowerCase() === 'circle' ? el : el.querySelector('circle');
    const cy = c ? Number(c.getAttribute('cy')) || 0 : 0;
    return { transform: [`translateY(${ctx.baseline - cy}px)`, 'translateY(0px)'], opacity: [0, 1] };
}

/* ---------------- Marks ---------------- */

/**
 * The last point's dot with a pulsing ring (Tailwind's ping, 2.4 s): ring r=6 at 30% opacity under a
 * solid dot (r, card-coloured stroke). Stops under reduced motion.
 */
export function PingDot({
    cx,
    cy,
    color,
    r = 3.5,
    ring = 6,
    strokeWidth = 1.5,
    className,
}: {
    cx?: number;
    cy?: number;
    color: string;
    r?: number;
    ring?: number;
    strokeWidth?: number;
    className?: string;
}) {
    if (cx == null || cy == null) return null;
    return (
        <g className={className}>
            <circle
                cx={cx}
                cy={cy}
                r={ring}
                fill={color}
                fillOpacity={0.3}
                className="origin-center animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] [transform-box:fill-box] motion-reduce:animate-none"
            />
            <circle cx={cx} cy={cy} r={r} fill={color} stroke="var(--color-card)" strokeWidth={strokeWidth} />
        </g>
    );
}

/** The hover dot: soft halo (r 13, 16%), card ring (r 8), solid dot (r 4); zooms in over 200 ms. */
export function HaloDot({ cx, cy, color }: { cx?: number; cy?: number; color: string }) {
    const Motion = useMotion();
    if (cx == null || cy == null) return null;
    const G = Motion && !prefersReducedMotion() ? Motion.motion.g : 'g';
    const anim =
        G === 'g'
            ? {}
            : {
                  initial: { opacity: 0, scale: 0.5 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.2, ease: EASE_OUT },
              };
    return (
        <G className="pointer-events-none origin-center [transform-box:fill-box]" {...anim}>
            <circle cx={cx} cy={cy} r={13} fill={color} fillOpacity={0.16} />
            <circle
                cx={cx}
                cy={cy}
                r={8}
                fill="var(--color-card)"
                fillOpacity={0.65}
                stroke={color}
                strokeOpacity={0.45}
            />
            <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--color-card)" strokeWidth={1.5} />
        </G>
    );
}

/**
 * The hover anchor: a 1.5px rounded bar from the active point down to the plot baseline, filled with a
 * vertical gradient (solid at the point, 8% at the baseline). It glides between points (transform /
 * y / height transitions, 220 ms, EASE_OUT). Render it in a series' activeDot, before the dot.
 */
export function AnchorLine({ cx, cy, color, id }: { cx?: number; cy?: number; color: string; id?: string }) {
    const R = useRecharts();
    const plot = R && R.usePlotArea ? R.usePlotArea() : null;
    const uid = useId();
    const gid = id || `rp-anchor-${chartKey(uid)}`;
    if (cx == null || cy == null || !plot) return null;
    const bottom = plot.y + plot.height;
    const t = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
    const tr = 'y 220ms cubic-bezier(0.22, 1, 0.36, 1), height 220ms cubic-bezier(0.22, 1, 0.36, 1)';
    return (
        <g className="pointer-events-none" style={{ transform: `translateX(${cx}px)`, transition: t }}>
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.08} />
                </linearGradient>
            </defs>
            <g className="origin-bottom [transform-box:fill-box]">
                <rect
                    x={-0.75}
                    width={1.5}
                    rx={0.75}
                    fill={`url(#${gid})`}
                    style={{ y: `${cy}px`, height: `${Math.max(0, bottom - cy)}px`, transition: tr } as any}
                />
            </g>
        </g>
    );
}

/* ---------------- Accent picker ---------------- */

/** Accent choices: Tailwind hue → [light shade, dark shade]. */
export const ACCENTS: { key: string; light: string; dark: string }[] = [
    { key: 'indigo', light: 'indigo-500', dark: 'indigo-400' },
    { key: 'violet', light: 'violet-500', dark: 'violet-400' },
    { key: 'blue', light: 'blue-500', dark: 'blue-400' },
    { key: 'sky', light: 'sky-500', dark: 'sky-400' },
    { key: 'teal', light: 'teal-600', dark: 'teal-400' },
    { key: 'emerald', light: 'emerald-500', dark: 'emerald-400' },
    { key: 'amber', light: 'amber-500', dark: 'amber-400' },
    { key: 'orange', light: 'orange-500', dark: 'orange-400' },
    { key: 'rose', light: 'rose-500', dark: 'rose-400' },
    { key: 'pink', light: 'pink-500', dark: 'pink-400' },
];

/**
 * The toolbar's series colour button: a 16px round swatch (var(--color-<swatchVar>)) that opens a grid
 * of accent swatches. Joins a ToolbarGroup like any outline icon button.
 */
export function AccentPicker({
    value,
    onChange,
    swatch,
    options = ACCENTS,
    label = 'Series color',
}: {
    value: string;
    onChange: (key: string) => void;
    swatch: string;
    options?: { key: string; light: string; dark: string }[];
    label?: string;
}) {
    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={label}
                        title={label}
                        data-slot="color-picker-trigger"
                        className="bg-background"
                    />
                }
            >
                <span
                    className="relative inline-flex size-4 shrink-0 rounded-full after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:inset-ring after:inset-ring-foreground/10"
                    style={{ background: swatch }}
                />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-2">
                <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
                    {options.map((o) => (
                        <button
                            key={o.key}
                            type="button"
                            role="radio"
                            aria-checked={o.key === value}
                            aria-label={o.key}
                            title={o.key}
                            onClick={() => onChange(o.key)}
                            className="relative size-6 rounded-full outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:inset-ring after:inset-ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:ring-2 aria-checked:ring-foreground aria-checked:ring-offset-2 aria-checked:ring-offset-popover"
                            style={{ background: tw(o.light) }}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/* ---------------- Formatters ---------------- */

/** 1249000 → "1.2M", 477000 → "477K", 950 → "950". */
export function compact(n: number, decimals = 1): string {
    const v = Number(n) || 0;
    const a = Math.abs(v);
    const fix = (x: number) => {
        const s = x.toFixed(decimals);
        return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
    };
    if (a >= 1e9) return `${fix(v / 1e9)}B`;
    if (a >= 1e6) return `${fix(v / 1e6)}M`;
    if (a >= 1e3) return `${Math.round(v / 1e3)}K`;
    return String(Math.round(v));
}

/** Money: $33,770 (or compact $6K with { compact: true }). */
export function money(n: number, opts: { compact?: boolean; decimals?: number; currency?: string } = {}): string {
    const sym = opts.currency || '$';
    if (opts.compact) return `${n < 0 ? '-' : ''}${sym}${compact(Math.abs(n))}`;
    const d = opts.decimals || 0;
    return `${n < 0 ? '-' : ''}${sym}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** 0.385 → "38.5%" (fraction in), or percent(38.5, { raw: true }). */
export function percent(n: number, opts: { decimals?: number; raw?: boolean } = {}): string {
    const v = opts.raw ? n : n * 100;
    return `${v.toFixed(opts.decimals != null ? opts.decimals : 1)}%`;
}

/** 5.9 → "+5.9%", -3.4 → "-3.4%". */
export function signedPercent(n: number, decimals = 1): string {
    return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(decimals)}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date → "Sep 12". */
export function shortDate(d: Date): string {
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Rows hook: keeps the latest value of a prop in a ref (for event handlers in memoised renderers). */
export function useLatest<T>(value: T) {
    const r = useRef(value);
    r.current = value;
    return r;
}

/** Media query hook (e.g. '(max-width: 640px)'). */
export function useMedia(query: string): boolean {
    const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const m = window.matchMedia(query);
        const f = () => setOn(m.matches);
        m.addEventListener('change', f);
        f();
        return () => m.removeEventListener('change', f);
    }, [query]);
    return on;
}

/** Width of an element (ResizeObserver); 0 until measured. */
export function useElementWidth(ref: { current: Element | null }): number {
    const [w, setW] = useState(0);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        setW(el.getBoundingClientRect().width);
        const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return w;
}

/**
 * Which category ticks get a label: every `step`-th counting back from the last one (so the latest
 * point is always labelled), e.g. step 2 → 9, 7, 5, 3, 1.
 */
export function labelEvery(index: number, count: number, step: number): boolean {
    return (count - 1 - index) % step === 0;
}

/** Stable memo of an object built from primitive deps. */
export function useConfig<T>(build: () => T, deps: any[]): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(build, deps);
}
