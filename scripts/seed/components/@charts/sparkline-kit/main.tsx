import { useRef } from 'react';
import { ChartContainer } from 'components:chart';
import { Icon } from 'components:icon';
import { Tabs, TabsList, TabsTrigger } from 'components:tabs';
import { Frame, FramePanel, FrameHeader, FrameTitle, FrameDescription, FrameFooter } from 'components:chart-frame';
import { useEnterAnimation } from 'components:charts/chart-kit';

/**
 * components:charts/sparkline-kit: shared pieces for the sparkline family (KPI cards and strips with
 * small charts) of the chart gallery.
 *
 * - SparkLine: a tiny Recharts line (no axes) with a draw-in animation, an optional hover tooltip and
 *   a hollow active dot. Sized by its className (e.g. "h-8 w-[76px]").
 * - useLineDraw(rootRef, deps): draws `.recharts-line-curve` paths in along their length (Recharts'
 *   own 1.5 s ease line animation, done with Motion so it starts before paint).
 * - TrendBadge: the small tinted trend chip (trending-up / trending-down icon + text).
 * - SparkTip: the compact tooltip card (uppercase muted label + label / value rows).
 * - ValueSuffix: a KPI value with a faded unit suffix ("$89.3" + "k").
 * - TRIM: text-box trimming class.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TRIM = '[text-box:trim-both_cap_alphabetic]';

/** Keyframes: a path drawing in along its length (dash grows from 0 to the full length, gap shrinks). */
export function drawKeyframes(el: Element) {
    const len = typeof (el as any).getTotalLength === 'function' ? (el as any).getTotalLength() : 0;
    return { strokeDasharray: [`0px ${len}px`, `${len}px 0px`] };
}

/** Draws the root's line paths in (1.5 s ease, like Recharts' line animation). Reduced motion: no-op. */
export function useLineDraw(
    rootRef: { current: Element | null },
    deps: any[] = [],
    opts: { selector?: string; duration?: number; delay?: number; ease?: any } = {}
) {
    useEnterAnimation(
        rootRef,
        [
            {
                selector: opts.selector || '.recharts-line-curve',
                keyframes: (el) => drawKeyframes(el),
                duration: opts.duration != null ? opts.duration : 1.5,
                delay: opts.delay || 0,
                ease: opts.ease || [0.25, 0.1, 0.25, 1],
            },
        ],
        deps
    );
}

export type SparkLineProps = {
    data: any[];
    dataKey: string;
    /** Stroke colour (CSS), e.g. var(--color-value). */
    color: string;
    config?: Record<string, any>;
    className?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    type?: string;
    margin?: { top: number; right: number; bottom: number; left: number };
    domain?: any[];
    /** Tooltip body for a hovered row; omit for no tooltip. */
    tooltip?: (row: any, index: number) => any;
    tooltipPosition?: { x?: number; y?: number };
    /** Active dot radius (hollow, background fill); 0 hides it. */
    activeDotRadius?: number;
    /** Extra Recharts children rendered before the line (gradients, reference lines…). */
    before?: (R: any) => any;
    animate?: boolean;
    label?: string;
    /** Extra props for the Recharts Line (strokeLinecap…). */
    lineProps?: Record<string, any>;
    /** Extra props for the Recharts Tooltip (cursor, allowEscapeViewBox, wrapperStyle…). */
    tooltipProps?: Record<string, any>;
};

/** A tiny line chart: no axes or grid, data-min to data-max domain, draw-in animation. */
export function SparkLine({
    data,
    dataKey,
    color,
    config = {},
    className,
    strokeWidth = 2,
    strokeOpacity = 1,
    type = 'linear',
    margin = { top: 2, right: 2, bottom: 2, left: 2 },
    domain = ['dataMin', 'dataMax'],
    tooltip,
    tooltipPosition,
    activeDotRadius = 2.5,
    before,
    animate = true,
    label,
    lineProps,
    tooltipProps,
}: SparkLineProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    useLineDraw(animate ? rootRef : { current: null }, [data]);
    return (
        <ChartContainer ref={rootRef} config={config} className={className} aria-label={label}>
            {(R: any) => (
                <R.LineChart data={data} margin={margin} accessibilityLayer={!!tooltip}>
                    <R.YAxis hide domain={domain} />
                    {before ? before(R) : null}
                    {tooltip ? (
                        <R.Tooltip
                            cursor={false}
                            position={tooltipPosition}
                            {...tooltipProps}
                            content={({ active, payload }: any) =>
                                active && payload && payload.length
                                    ? tooltip(payload[0].payload, data.indexOf(payload[0].payload))
                                    : null
                            }
                        />
                    ) : null}
                    <R.Line
                        dataKey={dataKey}
                        type={type}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeOpacity={strokeOpacity}
                        dot={false}
                        activeDot={
                            tooltip && activeDotRadius
                                ? {
                                      r: activeDotRadius,
                                      fill: 'var(--background)',
                                      strokeWidth: 1.5,
                                      stroke: color,
                                  }
                                : false
                        }
                        isAnimationActive={false}
                        {...lineProps}
                    />
                </R.LineChart>
            )}
        </ChartContainer>
    );
}

const BADGE_BORDERS: Record<string, string> = {
    success: 'border border-success/15 dark:border-success/25',
    destructive: 'border border-destructive/15 dark:border-destructive/25',
    warning: 'border border-warning/15 dark:border-warning/25',
    muted: 'border border-border',
    outline: 'border border-border',
};

const BADGE_TONES: Record<string, string> = {
    success: 'bg-success/10 text-success-foreground dark:bg-success/15 dark:text-success',
    destructive: 'bg-destructive/10 text-destructive-foreground dark:bg-destructive/15 dark:text-destructive',
    warning: 'bg-warning/10 text-warning-foreground dark:bg-warning/15 dark:text-warning',
    muted: 'bg-muted text-muted-foreground',
    outline: 'bg-transparent text-foreground dark:bg-input/32',
};

/** The small trend chip: icon + text, tinted success (up) / destructive (down) unless `tone` is given. */
export function TrendBadge({
    up,
    tone,
    icon,
    size = 'xs',
    bordered = false,
    children,
    className = '',
}: {
    up: boolean;
    tone?: 'success' | 'destructive' | 'warning' | 'muted' | 'outline';
    icon?: string | false;
    /** xs: 18px chip, 10px text, 14px icon. sm: 20px chip, 12px text, 12px icon. */
    size?: 'xs' | 'sm';
    /** A faint tone-coloured 1px border. */
    bordered?: boolean;
    children?: any;
    className?: string;
}) {
    const t = tone || (up ? 'success' : 'destructive');
    const ic = icon === false ? null : icon || (up ? 'trending-up' : 'trending-down');
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-sm font-medium whitespace-nowrap ${size === 'sm' ? 'h-5 min-w-5 px-1.25 py-0.5 text-xs' : 'h-4.5 min-w-4.5 px-1 py-0.25 text-[0.625rem] leading-none'} ${BADGE_TONES[t]} ${bordered ? BADGE_BORDERS[t] : ''} ${className}`}
        >
            {ic ? (
                <Icon name={ic} className={`shrink-0 ${size === 'sm' ? 'size-3' : 'size-3.5'}`} aria-hidden="true" />
            ) : null}
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            <span>{children}</span>
        </span>
    );
}

/** The compact tooltip card: an uppercase muted label, then label / value rows. */
export function SparkTip({
    label,
    rows,
    className = 'w-[108px]',
}: {
    label: any;
    rows: { label: any; value: any; color?: string }[];
    className?: string;
}) {
    return (
        <div className={`rounded-lg border bg-popover px-2 py-1.5 shadow-sm ${className}`}>
            <div className="mb-1 text-[10px] leading-none font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </div>
            {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-[11px] leading-none not-last:mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        {r.color ? (
                            <span
                                aria-hidden="true"
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: r.color }}
                            />
                        ) : null}
                        {r.label}
                    </span>
                    <span className="font-semibold text-popover-foreground tabular-nums">{r.value}</span>
                </div>
            ))}
        </div>
    );
}

/** A KPI value with a faded unit suffix: <ValueSuffix value="$89.3" suffix="k" />. */
export function ValueSuffix({
    value,
    suffix,
    className = 'text-xl font-semibold',
}: {
    value: any;
    suffix?: any;
    className?: string;
}) {
    return (
        <div className={className}>
            {value}
            <span className="ps-0.5 text-muted-foreground/40">{suffix}</span>
        </div>
    );
}

/** Keyframes: a layer revealed left to right (clip-path inset), like Recharts' area / bar entrance. */
export const REVEAL_X = { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] };

/**
 * Reveals the root's area layers left to right (1.5 s ease, like Recharts 3's area animation).
 * Pass another selector for other layers. Reduced motion: no-op.
 */
export function useAreaReveal(
    rootRef: { current: Element | null },
    deps: any[] = [],
    opts: { selector?: string; duration?: number; delay?: number; ease?: any } = {}
) {
    useEnterAnimation(
        rootRef,
        [
            {
                selector: opts.selector || '.recharts-area',
                keyframes: REVEAL_X,
                duration: opts.duration != null ? opts.duration : 1.5,
                delay: opts.delay || 0,
                ease: opts.ease || [0.25, 0.1, 0.25, 1],
            },
        ],
        deps
    );
}

/** "1.0k" style: thousands with one decimal. */
export function kOne(v: number): string {
    return `${(v / 1000).toFixed(1)}k`;
}

/** Segmented period tabs (Week / Month / Year) on the host Tabs: a muted track, the active tab raised. */
export function PeriodTabs({
    options,
    value,
    onValueChange,
    label = 'Period',
    className = '',
    listClassName = '',
    triggerClassName = '',
}: {
    options: { value: string; label: any }[];
    value: string;
    onValueChange: (v: string) => void;
    label?: string;
    className?: string;
    listClassName?: string;
    triggerClassName?: string;
}) {
    return (
        <Tabs value={value} onValueChange={(v: any) => onValueChange(String(v))} className={className}>
            <TabsList aria-label={label} className={listClassName}>
                {options.map((o) => (
                    <TabsTrigger key={o.value} value={o.value} className={triggerClassName}>
                        {o.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}

/* ---------------- Plain-SVG sparkline geometry ---------------- */

/** Evenly spaced [x, y] points for values in a width × height box (y grows down). */
export function sparkPoints(
    values: number[],
    opts: { width: number; height: number; min?: number; max?: number; top?: number; bottom?: number }
): [number, number][] {
    const lo = opts.min != null ? opts.min : Math.min(...values);
    const hi = opts.max != null ? opts.max : Math.max(...values);
    const top = opts.top || 0;
    const bottom = opts.bottom || 0;
    const span = hi - lo || 1;
    const n = values.length;
    return values.map((v, i) => [
        n > 1 ? Number(((i * opts.width) / (n - 1)).toFixed(2)) : 0,
        Number((top + (1 - (v - lo) / span) * (opts.height - top - bottom)).toFixed(2)),
    ]);
}

/** "M x y L x y …" through the points. */
export function linePath(points: [number, number][]): string {
    return points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
}

/** The line path closed down to baseY (an area under the line). */
export function areaPath(points: [number, number][], baseY: number): string {
    if (!points.length) return '';
    const last = points[points.length - 1];
    return `${linePath(points)} L${last[0]} ${baseY} L${points[0][0]} ${baseY} Z`;
}

/* ---------------- Health strip cards ---------------- */

/** Status background classes (literal, so the compiler sees them). */
export const TONE_BG: Record<string, string> = {
    success: 'bg-success',
    destructive: 'bg-destructive',
    warning: 'bg-warning',
    info: 'bg-info',
    muted: 'bg-muted-foreground/40',
};

/** The 32px raised icon tile (muted fill, background-coloured ring, soft shadow). */
export function IconTile({ icon, className = '' }: { icon: string; className?: string }) {
    return (
        <span
            data-slot="icon-tile"
            className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-background bg-muted align-middle text-accent-foreground shadow-[0_1px_3px_0_rgb(0_0_0/0.14)] dark:border [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${className}`}
        >
            <Icon name={icon} aria-hidden="true" />
        </span>
    );
}

/** A legend entry: a 3 × 8 px tick (or a 6 px dot) in a status tone, then a muted label. */
export function LegendTick({
    tone,
    shape = 'bar',
    color,
    children,
}: {
    tone?: string;
    shape?: 'bar' | 'dot';
    color?: string;
    children?: any;
}) {
    return (
        <span className="flex items-center gap-1">
            <span
                aria-hidden="true"
                className={`shrink-0 rounded-full ${shape === 'dot' ? 'size-1.5' : 'h-2 w-0.75'} ${tone ? TONE_BG[tone] : ''}`}
                style={color ? { background: color } : undefined}
            />
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{children}</span>
        </span>
    );
}

/** One strip card: a Frame with one panel; icon tile + title + subtitle header, then children. */
export function StripCard({
    icon,
    title,
    subtitle,
    children,
    className = '',
}: {
    icon: string;
    title: any;
    subtitle?: any;
    children?: any;
    className?: string;
}) {
    return (
        <Frame className={className}>
            <FramePanel className="flex flex-col gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <IconTile icon={icon} />
                    <div className="min-w-0 pt-0.5">
                        <span className="block truncate text-sm font-medium">{title}</span>
                        {subtitle != null ? (
                            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
                        ) : null}
                    </div>
                </div>
                {children}
            </FramePanel>
        </Frame>
    );
}

/**
 * A plain 20px chip (no trend semantics): outline (border-border, transparent) or a tinted status tone.
 * `icon` renders a leading lucide icon; `iconClassName` tints it (e.g. "[&_svg]:text-destructive").
 */
export function Chip({
    tone = 'outline',
    icon,
    className = '',
    children,
}: {
    tone?: 'outline' | 'success' | 'destructive' | 'warning' | 'muted';
    icon?: string;
    className?: string;
    children?: any;
}) {
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm px-1.25 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0 ${BADGE_TONES[tone]} ${BADGE_BORDERS[tone]} ${className}`}
        >
            {icon ? <Icon name={icon} aria-hidden="true" /> : null}
            {children}
        </span>
    );
}

/** The framed icon tile (ReUI's "frame" variant): a muted 32px shell with a raised card-coloured inset. */
export function FrameIconTile({ icon, className = '' }: { icon: string; className?: string }) {
    return (
        <span
            data-slot="icon-tile"
            aria-hidden="true"
            className={`relative isolate inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 p-0.5 align-middle after:absolute after:inset-0.5 after:-z-10 after:rounded-[calc(var(--radius-md)-2px)] after:border after:border-border after:bg-card after:shadow-xs [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${className}`}
        >
            <Icon name={icon} aria-hidden="true" />
        </span>
    );
}

/**
 * A stacked strip card: a muted header strip (framed icon tile, title, description), one white panel
 * (`flex flex-col gap-3`) and a footer line (min-h-10, xs muted text; pass the footer's children).
 */
export function StackedStripCard({
    icon,
    title,
    description,
    footer,
    footerLive = false,
    children,
    className = '',
}: {
    icon: string;
    title: any;
    description?: any;
    footer?: any;
    /** Announce footer changes politely (e.g. when it follows the hovered point). */
    footerLive?: boolean;
    children?: any;
    className?: string;
}) {
    return (
        <Frame stacked className={`min-w-0 ${className}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FrameIconTile icon={icon} />
                    <div className="flex min-w-0 flex-col gap-px">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <FrameTitle className="truncate" role="heading" aria-level={3}>
                                {title}
                            </FrameTitle>
                        </div>
                        {description != null ? (
                            <FrameDescription className="truncate text-xs">{description}</FrameDescription>
                        ) : null}
                    </div>
                </div>
            </FrameHeader>
            <FramePanel className="flex flex-col gap-3">{children}</FramePanel>
            {footer != null ? (
                <FrameFooter
                    aria-live={footerLive ? 'polite' : 'off'}
                    className="min-h-10 flex-row flex-nowrap items-center justify-start gap-2 text-xs text-muted-foreground tabular-nums"
                >
                    {footer}
                </FrameFooter>
            ) : null}
        </Frame>
    );
}

/** A strip footer: muted lead, truncating 13px foreground name, then an end slot (ms-auto). */
export function StripFooter({ lead, name, end }: { lead: any; name: any; end?: any }) {
    return (
        <>
            <span className="shrink-0">{lead}</span>
            <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{name}</span>
            {end != null ? <span className="ms-auto shrink-0 tabular-nums">{end}</span> : null}
        </>
    );
}

/** A mini legend entry: 6px dot (status tone or colour), a foreground count, a muted label. */
export function MiniLegendItem({
    tone,
    color,
    value,
    label,
    labelClassName = '@max-[9rem]:sr-only',
    className = '',
    dot,
}: {
    tone?: string;
    color?: string;
    value: any;
    label?: any;
    labelClassName?: string;
    className?: string;
    /** Replaces the dot (e.g. a dashed tick). */
    dot?: any;
}) {
    return (
        <span className={`flex items-center gap-1 whitespace-nowrap tabular-nums ${className}`}>
            {dot != null ? (
                dot
            ) : (
                <span
                    aria-hidden="true"
                    className={`size-1.5 shrink-0 rounded-full ${tone ? TONE_BG[tone] || '' : ''}`}
                    style={color ? { background: color } : undefined}
                />
            )}
            <span className="text-foreground">{value}</span>
            {label != null ? <span className={labelClassName}>{label}</span> : null}
        </span>
    );
}

/** The mini legend row under a strip chart (xs, medium, muted, wrapping), in an @container. */
export function MiniLegend({ children }: { children?: any }) {
    return (
        <div className="@container min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                {children}
            </div>
        </div>
    );
}

/**
 * The soft highlight column behind a strip chart's focused point: 12px wide, fully rounded, a vertical
 * foreground/2 → foreground/8 gradient, slid to `x` (the point's centre, px from the chart's left).
 */
export function HighlightColumn({ x, width = 12 }: { x: number | null; width?: number }) {
    if (x == null || !Number.isFinite(x)) return null;
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 left-0 bg-linear-to-b from-foreground/2 to-foreground/8 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
            style={{ width, borderRadius: width / 2, transform: `translateX(${x - width / 2}px)` }}
        />
    );
}

/** Centre of category `i` of `n` in a band x scale spanning [left, width - right]. */
export function bandCenter(i: number, n: number, width: number, left = 6, right = 6): number {
    const band = (width - left - right) / Math.max(1, n);
    return left + band * (i + 0.5);
}

/**
 * The y of a lollipop's stem end, or null when the stem would be too short to draw. The stem runs from
 * the baseline toward the dot and stops `gap` px short of its centre; stems under `min` px are skipped.
 */
export function stemEnd(baseY: number, dotY: number, gap = 5.5, min = 2): number | null {
    const d = dotY - baseY;
    if (Math.abs(d) - gap <= min) return null;
    return d > 0 ? dotY - gap : dotY + gap;
}

/** Ends of a Recharts bar rectangle: the value end and the baseline end, whatever the sign convention. */
export function barEnds(p: { y: number; height: number }, value: number): { valueY: number; baseY: number } {
    const a = Number(p.y) || 0;
    const b = a + (Number(p.height) || 0);
    const top = Math.min(a, b);
    const bottom = Math.max(a, b);
    return value >= 0 ? { valueY: top, baseY: bottom } : { valueY: bottom, baseY: top };
}

export default SparkLine;
