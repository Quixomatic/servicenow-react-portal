import { useLayoutEffect } from 'react';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuGroup,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { useMotion } from 'components:charts/chart-kit';

/**
 * components:charts/bar-more-kit: small pieces shared by the second half of the bar family blocks
 * (error-budget-burn, data-sync-activity, sync-run-history, slo-burn-rate, audit-log-volume, firewall-traffic).
 *
 * - TEXT_TRIM: the cap-height text box trim put on small labels.
 * - IconTile: the bordered header icon tile (32px, inset card).
 * - ToneBadge: the small tinted status badge (destructive / warning / success / info / outline).
 * - SelectMenu: a select-styled dropdown (role combobox) whose options carry a status dot and a muted note.
 * - CheckMenu: a toolbar checklist menu (icon + label + "n / total" trigger; items with an icon and a muted
 *   count, at least one stays on; a "show all" item).
 * - niceStep(max, intervals, integer): a 1 / 2 / 2.5 / 5 / 10 step and the top tick.
 * - useFadeIn(ref, deps, ms): fades an element in (opacity 0 → 1, ease-out) on mount and when deps change.
 * - prefersReducedMotion().
 * - addDays / fmtDay: UTC date helpers ("Sep 1", "Sep 1, 2026").
 * - short(n): 231.7K / 1.4M / 950 (one decimal for K and M, trailing .0 dropped).
 * - pct(n): "0.9%" under 10, "11%" above.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';

export function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        !!window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/** Fades `ref` in (opacity 0 → 1) on mount and whenever `deps` change; no-op under reduced motion. */
export function useFadeIn(ref: { current: Element | null }, deps: any[] = [], ms = 200) {
    const Motion = useMotion();
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || !Motion || prefersReducedMotion()) return undefined;
        const c = Motion.animate(el, { opacity: [0, 1] }, { duration: ms / 1000, ease: 'easeOut' });
        return () => c && c.stop && c.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Motion].concat(deps));
}

/** The bordered header icon tile: a 32px muted square with an inset card face. */
export function IconTile({ icon, className = '' }: { icon: string; className?: string }) {
    return (
        <span
            data-slot="icon-tile"
            className={`relative isolate inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 p-0.5 align-middle after:absolute after:inset-0.5 after:-z-10 after:rounded-[calc(var(--radius-md)-2px)] after:border after:border-border after:bg-card after:shadow-xs [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${className}`}
        >
            <Icon name={icon} />
        </span>
    );
}

const BADGE_TONES: Record<string, string> = {
    destructive:
        'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive',
    warning:
        'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
    success:
        'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
    info: 'border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info',
    outline: 'border-border bg-transparent dark:bg-input/32',
};

/** The small status badge (h-5, text-xs, rounded-sm) in a tinted tone. */
export function ToneBadge({
    tone = 'outline',
    icon,
    className = '',
    children,
}: {
    tone?: 'destructive' | 'warning' | 'success' | 'info' | 'outline';
    icon?: string;
    className?: string;
    children?: any;
}) {
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0 ${BADGE_TONES[tone] || BADGE_TONES.outline} ${className}`}
        >
            {icon ? <Icon name={icon} /> : null}
            {children}
        </span>
    );
}

const DOT_BG: Record<string, string> = {
    destructive: 'bg-destructive',
    warning: 'bg-warning',
    success: 'bg-success',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
};

export type SelectOption = { value: string; label: string; tone?: string; note?: string };

/**
 * A select-styled dropdown: outline trigger (role combobox) with the current option's dot + label and a
 * chevron; radio items with a status dot, the label and an sr-only / muted note.
 */
export function SelectMenu({
    label,
    value,
    options,
    onValueChange,
    className = '',
    menuLabel,
    align = 'end',
}: {
    label: string;
    value: string;
    options: SelectOption[];
    onValueChange: (v: string) => void;
    className?: string;
    menuLabel?: string;
    align?: 'start' | 'end';
}) {
    const current = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-label={label}
                        className={`min-w-0 justify-between gap-1.5 bg-background px-2.5 text-sm font-normal ${className}`}
                    />
                }
            >
                <span className="flex min-w-0 items-center gap-2">
                    {current && current.tone ? (
                        <span className={`size-2 shrink-0 rounded-full ${DOT_BG[current.tone] || DOT_BG.muted}`} />
                    ) : null}
                    <span className="truncate">{current ? current.label : ''}</span>
                </span>
                <Icon name="chevron-down" className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="max-h-80 w-auto min-w-(--anchor-width)">
                {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
                <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                    {options.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.tone ? (
                                <span
                                    aria-hidden="true"
                                    className={`size-1.5 shrink-0 self-center rounded-full ${DOT_BG[o.tone] || DOT_BG.muted}`}
                                />
                            ) : null}
                            <span className="truncate">{o.label}</span>
                            {o.note ? <span className="sr-only">, {o.note}</span> : null}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export type CheckOption = { value: string; label: string; icon?: string; note?: any };

/** A toolbar checklist menu: icon + label + "n / total"; checkbox items (icon, label, muted note); "show all". */
export function CheckMenu({
    label,
    icon,
    options,
    value,
    onValueChange,
    menuLabel,
    allLabel = 'Show all',
    align = 'end',
}: {
    label: string;
    icon?: string;
    options: CheckOption[];
    value: string[];
    onValueChange: (v: string[]) => void;
    menuLabel?: string;
    allLabel?: string;
    align?: 'start' | 'end';
}) {
    const toggle = (v: string, checked: boolean) => {
        const next = options.map((o) => o.value).filter((k) => (k === v ? checked : value.indexOf(k) >= 0));
        if (next.length) onValueChange(next);
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="default" className="bg-background" />}>
                {icon ? <Icon name={icon} /> : null}
                <span className={`@max-md:sr-only ${TEXT_TRIM}`}>{label}</span>
                <span className={`font-normal text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                    {`${value.length}/${options.length}`}
                </span>
                <Icon name="chevron-down" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-56">
                <DropdownMenuGroup>
                    {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
                    {options.map((o) => (
                        <DropdownMenuCheckboxItem
                            key={o.value}
                            checked={value.indexOf(o.value) >= 0}
                            onCheckedChange={(c: boolean) => toggle(o.value, c)}
                            closeOnClick={false}
                        >
                            {o.icon ? <Icon name={o.icon} /> : null}
                            {o.label}
                            {o.note != null ? (
                                <span className="ms-auto text-muted-foreground tabular-nums">{o.note}</span>
                            ) : null}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    disabled={value.length === options.length}
                    onClick={() => onValueChange(options.map((o) => o.value))}
                >
                    <Icon name="rotate-ccw" />
                    {allLabel}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** A 1 / 2 / 2.5 / 5 / 10 step ≥ max / intervals (whole numbers with `integer`) and the top tick. */
export function niceStep(max: number, intervals = 4, integer = false): { step: number; top: number; ticks: number[] } {
    const raw = Math.max(max, integer ? 1 : 1e-9) / intervals;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    let step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
    if (integer) step = Math.max(1, Math.round(step));
    const top = Math.max(step, Math.ceil(max / step) * step);
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { step, top, ticks };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO date (YYYY-MM-DD) plus n days (UTC). */
export function addDays(iso: string, n: number): Date {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d;
}

/** "Sep 1" (or "Sep 1, 2026" with year). */
export function fmtDay(d: Date, year = false): string {
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${year ? `, ${d.getUTCFullYear()}` : ''}`;
}

/** 231.7K / 1.4M / 950: one decimal for K and M (trailing .0 dropped). */
export function short(n: number): string {
    const v = Number(n) || 0;
    const a = Math.abs(v);
    const fix = (x: number) => x.toFixed(1).replace(/\.0$/, '');
    if (a >= 1e9) return `${fix(v / 1e9)}B`;
    if (a >= 1e6) return `${fix(v / 1e6)}M`;
    if (a >= 1e3) return `${fix(v / 1e3)}K`;
    return String(Math.round(v));
}

/** "0.9%" under 10, "11%" from 10. */
export function pct(n: number): string {
    const a = Math.abs(n);
    return `${a < 10 ? (Math.round(a * 10) / 10).toString() : Math.round(a).toString()}%`;
}

export default IconTile;
