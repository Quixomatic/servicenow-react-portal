import { useEffect, useRef, useState } from 'react';

/**
 * components:charts/slope-kit: shared pieces for the slope (rank-to-rank) chart blocks: the outline badge, status
 * dots, the eased slope path, a rAF tween for re-sorting rows, a muted-on toggle group and an interval hook.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

/** Status tones used by the slope / status blocks: literal class maps (never built dynamically). */
export const TONE_BG: Record<string, string> = {
    critical: 'bg-destructive',
    watch: 'bg-warning',
    healthy: 'bg-success',
    info: 'bg-info',
    muted: 'bg-muted-foreground/40',
};
export const TONE_FILL: Record<string, string> = {
    critical: 'fill-destructive',
    watch: 'fill-warning',
    healthy: 'fill-success',
    info: 'fill-info',
    muted: 'fill-muted-foreground',
};
export const TONE_VAR: Record<string, string> = {
    critical: 'var(--destructive)',
    watch: 'var(--warning)',
    healthy: 'var(--success)',
    info: 'var(--info)',
    muted: 'var(--muted-foreground)',
};

/** The small outline badge (h-5, rounded-sm, border-border, transparent). */
export function OutlineBadge({
    className = '',
    children,
    ...rest
}: {
    className?: string;
    children?: any;
    [k: string]: any;
}) {
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border border-border bg-transparent px-1.25 py-0.5 text-xs font-medium whitespace-nowrap text-foreground dark:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3 ${className}`}
            {...rest}
        >
            {children}
        </span>
    );
}

/** An 8px status dot. */
export function ToneDot({ tone, className = '' }: { tone: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${TONE_BG[tone] || TONE_BG.muted} ${className}`}
        />
    );
}

/** The live badge dot: a pinging success dot. */
export function LiveDot({ paused = false }: { paused?: boolean }) {
    return (
        <span className="relative flex size-1.5">
            {paused ? null : (
                <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
            )}
            <span className={`relative size-1.5 rounded-full ${paused ? 'bg-muted-foreground' : 'bg-success'}`} />
        </span>
    );
}

/** A slope from (x0, y0) to (x1, y1): flat leads at both ends, a symmetric cubic in between. */
export function slopePath(x0: number, x1: number, y0: number, y1: number, lead = 0.06) {
    const w = x1 - x0;
    const a = x0 + w * lead;
    const b = x1 - w * lead;
    const m = (x0 + x1) / 2;
    return `M${x0},${y0} L${a},${y0} C${m},${y0} ${m},${y1} ${b},${y1} L${x1},${y1}`;
}

function reducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
}

/** Eases a map of numbers (row positions) to a new target over `duration` ms (instant with reduced motion). */
export function useTween(target: Record<string, number>, duration = 600): Record<string, number> {
    const [value, setValue] = useState(target);
    const cur = useRef(target);
    const sig = Object.keys(target)
        .map((k) => `${k}:${Math.round(target[k] * 100)}`)
        .join('|');
    useEffect(() => {
        const from = { ...cur.current };
        const to = target;
        if (reducedMotion() || !Object.keys(from).length) {
            cur.current = to;
            setValue(to);
            return undefined;
        }
        let raf = 0;
        const t0 = performance.now();
        const step = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            const e = 1 - Math.pow(1 - p, 3);
            const next: Record<string, number> = {};
            Object.keys(to).forEach((k) => {
                const f = from[k] == null ? to[k] : from[k];
                next[k] = f + (to[k] - f) * e;
            });
            cur.current = next;
            setValue(next);
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig]);
    return value;
}

/** setInterval as a hook; `ms = null` pauses it. */
export function useInterval(fn: () => void, ms: number | null) {
    const ref = useRef(fn);
    ref.current = fn;
    useEffect(() => {
        if (ms == null) return undefined;
        const id = setInterval(() => ref.current(), ms);
        return () => clearInterval(id);
    }, [ms]);
}

/** A joined outline toggle group whose pressed item is muted-filled (aria-pressed buttons). */
export function PillToggle({
    label,
    value,
    options,
    onValueChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (v: string) => void;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            data-slot="toggle-group"
            className="flex w-fit flex-row items-center rounded-lg"
        >
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        data-slot="toggle-group-item"
                        onClick={() => onValueChange(o.value)}
                        className={`inline-flex h-7 shrink-0 items-center justify-center gap-1 border border-border px-2 text-[0.8rem] font-medium whitespace-nowrap transition-colors outline-none select-none not-first:border-l-0 first:rounded-l-lg last:rounded-r-lg focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input ${on ? 'bg-muted text-foreground dark:bg-input/50' : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/** A deterministic pseudo-random generator (mulberry32) for simulated live ticks. */
export function seeded(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export default OutlineBadge;
