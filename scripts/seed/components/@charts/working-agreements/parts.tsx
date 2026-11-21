// Presentational pieces for components:charts/working-agreements: tiles, rings, sparkline, legend, badges.
import { Icon } from 'components:icon';
import type { TileState } from './model.ts';

export const TRIM = '[text-box:trim-both_cap_alphabetic]';

/** Tile palette as CSS variables (light + dark), set once on the block root. */
export const TILE_VARS =
    '[--tile-missed:#f3c0cc] [--tile-partly:color-mix(in_oklab,#f4d98a_40%,transparent)] [--tile-partly-strong:#f4d98a] [--tile-paused:#f3f4f6] [--tile-kept:#0f9d91] [--tile-done:#35cdbb] [--tile-on-track:#a6ddd7] [--tile-behind:#9acfe5] [--accent-blue:oklch(0.704_0.04_256.788)] [--band-blue:#38a8e8] [--band-violet:#9747ff] [--edge-behind:color-mix(in_oklab,#9acfe5_80%,var(--foreground))] dark:[--tile-missed:color-mix(in_oklab,#f3c0cc_38%,transparent)] dark:[--tile-partly:color-mix(in_oklab,#f4d98a_22%,transparent)] dark:[--tile-partly-strong:color-mix(in_oklab,#f4d98a_62%,transparent)] dark:[--tile-paused:color-mix(in_oklab,var(--foreground)_6%,transparent)] dark:[--tile-kept:color-mix(in_oklab,#35cdbb_52%,transparent)] dark:[--tile-done:#35cdbb] dark:[--tile-on-track:color-mix(in_oklab,#a6ddd7_45%,transparent)] dark:[--tile-behind:color-mix(in_oklab,#9acfe5_50%,transparent)] dark:[--accent-blue:color-mix(in_oklab,oklch(0.704_0.04_256.788)_70%,transparent)] dark:[--band-blue:#5fbdf0] dark:[--band-violet:#ab7dff] dark:[--edge-behind:#9acfe5]';

const FILL: Record<TileState, string> = {
    done: 'fill-(--tile-done)',
    kept: 'fill-(--tile-kept)',
    'partly-strong': 'fill-(--tile-partly-strong)',
    partly: 'fill-(--tile-partly)',
    missed: 'fill-(--tile-missed)',
    paused: 'fill-(--tile-paused)',
    'not-adopted': 'fill-border',
    'on-track': 'fill-(--tile-on-track)',
    behind: 'fill-(--tile-behind)',
};

/** One shared hatch pattern; tiles reference it by id. */
export function HatchDefs({ id }: { id: string }) {
    return (
        <svg aria-hidden="true" width="0" height="0" className="absolute">
            <defs>
                <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="1.5" height="4" className="fill-muted-foreground/30" />
                </pattern>
            </defs>
        </svg>
    );
}

/** The rounded tile mark (absolute, fills its parent). */
export function TileMark({
    state,
    hatch,
    rx = 4,
    focusRing = false,
}: {
    state: TileState;
    hatch: string;
    rx?: number;
    focusRing?: boolean;
}) {
    return (
        <>
            <svg className="absolute inset-0 size-full overflow-visible">
                <rect width="100%" height="100%" rx={rx} className={FILL[state]} />
                {state === 'paused' ? <rect width="100%" height="100%" rx={rx} fill={`url(#${hatch})`} /> : null}
            </svg>
            {state === 'behind' ? (
                <span className="absolute inset-[0.5px]">
                    <svg className="absolute inset-0 size-full overflow-visible">
                        <rect
                            width="100%"
                            height="100%"
                            rx={rx - 0.5}
                            strokeWidth="0.5"
                            strokeDasharray="2 1.5"
                            className="fill-none stroke-(--edge-behind)"
                        />
                    </svg>
                </span>
            ) : null}
            {focusRing ? (
                <span className="absolute -inset-px">
                    <svg className="absolute inset-0 size-full overflow-visible">
                        <rect
                            width="100%"
                            height="100%"
                            rx={rx + 1}
                            className="fill-none stroke-ring stroke-2 opacity-0 group-focus-visible/week:opacity-100"
                        />
                    </svg>
                </span>
            ) : null}
        </>
    );
}

const BADGE =
    'relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap';
const BADGE_TONE: Record<TileState, string> = {
    done: 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
    kept: 'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
    'partly-strong':
        'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
    partly: 'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
    missed: 'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive',
    paused: 'border-border bg-transparent text-foreground dark:bg-input/32',
    'not-adopted': 'border-border bg-transparent text-foreground dark:bg-input/32',
    'on-track': 'border-border bg-background text-success-foreground dark:bg-input/30',
    behind: 'border-border bg-background text-warning-foreground dark:bg-input/30',
};

export function StateBadge({ state, children }: { state: TileState; children: any }) {
    return (
        <span data-slot="badge" className={`${BADGE} ${BADGE_TONE[state]}`}>
            <span className={TRIM}>{children}</span>
        </span>
    );
}

export function OutlineCount({ children }: { children: any }) {
    return (
        <span data-slot="badge" className={`${BADGE} border-border bg-transparent tabular-nums dark:bg-input/32`}>
            <span className={TRIM}>{children}</span>
        </span>
    );
}

export function TrendIcon({ trend, className = '' }: { trend: 'up' | 'down' | 'level'; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`flex size-3.5 shrink-0 items-center justify-center [&_svg]:size-3.5 ${trend === 'level' ? 'text-muted-foreground' : 'text-foreground'} ${className}`}
        >
            <Icon name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus'} />
        </span>
    );
}

/** Progress ring: arc = share of the circumference minus the stroke (round caps), starting at 12 o'clock. */
export function Ring({
    r,
    c,
    share,
    sw,
    track,
    arc,
}: {
    r: number;
    c: number;
    share: number;
    sw: number;
    track: string;
    arc: string;
}) {
    const circ = 2 * Math.PI * r;
    const len = Math.max(0, share * circ - sw);
    return (
        <>
            <circle cx={c} cy={c} r={r} strokeWidth={sw} className={`fill-none ${track}`} />
            {share > 0 ? (
                <circle
                    cx={c}
                    cy={c}
                    r={r}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    strokeDasharray={`${len} ${circ}`}
                    strokeDashoffset={-sw / 2}
                    transform={`rotate(-90 ${c} ${c})`}
                    className={`fill-none ${arc}`}
                />
            ) : null}
        </>
    );
}

/** Monotone-x cubic path through points (same tangents as the common monotone interpolation). */
export function monotonePath(pts: [number, number][]): string {
    const n = pts.length;
    if (!n) return '';
    if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
    const f = (v: number) => String(Math.round(v * 100) / 100);
    const dx: number[] = [];
    const sl: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        dx.push(pts[i + 1][0] - pts[i][0]);
        sl.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
    }
    const t: number[] = [];
    for (let i = 0; i < n; i++) {
        if (i === 0 || i === n - 1) {
            t.push(0);
            continue;
        }
        const s0 = sl[i - 1];
        const s1 = sl[i];
        const h0 = dx[i - 1];
        const h1 = dx[i];
        const p = (s0 * h1 + s1 * h0) / (h0 + h1);
        t.push((Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0);
    }
    t[0] = n > 1 ? (3 * sl[0] - t[1]) / 2 : 0;
    t[n - 1] = (3 * sl[n - 2] - t[n - 2]) / 2;
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += `C${f(pts[i][0] + h)},${f(pts[i][1] + h * t[i])} ${f(pts[i + 1][0] - h)},${f(pts[i + 1][1] - h * t[i + 1])} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
    }
    return d;
}
