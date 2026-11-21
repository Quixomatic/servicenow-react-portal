import { useEffect, useRef, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
} from 'components:dropdown-menu';
import { Button } from 'components:button';
import { Icon } from 'components:icon';

/**
 * components:charts/bar-kit: small pieces shared by the bar family blocks (components:charts/*).
 *
 * - TEXT_TRIM: the cap-height text trim class used on every label.
 * - DeltaChip: the tinted trend chip (success / destructive) next to a KPI value.
 * - TipRow: one muted tooltip row (label, mono value, w-8 note).
 * - LegendDots: the small dot legend above a plot.
 * - MenuSelect: a toolbar menu button with a radio list (icons, shortcuts or a muted right-hand note, a group label); `iconOnly`
 *   renders a square icon trigger (e.g. a sort menu).
 * - MenuChecklist: a toolbar menu with checkbox items, a right-hand note per item and a "show all" item.
 * - RefreshButton: the outline icon button that spins a loader while `busy`.
 * - useBusy(ms): [busy, start] for a fake refresh.
 * - niceTicks(max, count): 0-based ticks on a 1 / 2 / 2.5 / 5 step; kilo(n): 175.3K / 115K / 950.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';

/** 0, step, 2·step … ≥ max on a 1 / 2 / 2.5 / 5 / 10 step, `count` intervals as a target. */
export function niceTicks(max: number, count = 4): { ticks: number[]; top: number; step: number } {
    const raw = (max || 1) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    const top = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { ticks, top, step };
}

/** 175300 → "175.3K", 115000 → "115K", 6400 → "6.4K", 950 → "950". */
export function kilo(n: number): string {
    const v = Number(n) || 0;
    const a = Math.abs(v);
    const fix = (x: number) => x.toFixed(1).replace(/\.0$/, '');
    if (a >= 1e6) return `${fix(v / 1e6)}M`;
    if (a >= 1e3) return `${fix(v / 1e3)}K`;
    return String(Math.round(v));
}

/** Integers with thousands separators: 7170 → "7,170". */
export function int(n: number): string {
    return Math.round(Number(n) || 0).toLocaleString('en-US');
}

/** Rounds shares to whole percents that add up to 100 (largest remainder). */
export function wholeShares(values: number[]): number[] {
    const total = values.reduce((s, v) => s + v, 0) || 1;
    const exact = values.map((v) => (v / total) * 100);
    const floor = exact.map((v) => Math.floor(v));
    let left = 100 - floor.reduce((s, v) => s + v, 0);
    const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
    for (let k = 0; k < order.length && left > 0; k += 1) {
        floor[order[k].i] += 1;
        left -= 1;
    }
    return floor;
}

/** The KPI trend chip: arrow + percent, tinted success / destructive. */
/** `signed` prints the sign (+22.1%), as some ReUI blocks do; the arrow alone shows it otherwise. */
export function DeltaChip({
    value,
    positive,
    decimals = 1,
    signed = false,
}: {
    value: number;
    positive?: boolean;
    decimals?: number;
    signed?: boolean;
}) {
    const up = value >= 0;
    const good = positive == null ? up : positive;
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border-none px-1.25 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:size-3.5 ${
                good
                    ? 'bg-success/10 text-success-foreground dark:bg-success/15 dark:text-success'
                    : 'bg-destructive/10 text-destructive-foreground dark:bg-destructive/15 dark:text-destructive'
            }`}
        >
            <Icon name={up ? 'trending-up' : 'trending-down'} />
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            <span
                className={TEXT_TRIM}
            >{`${signed ? (up ? '+' : '-') : ''}${Math.abs(value).toFixed(decimals)}%`}</span>
        </span>
    );
}

/** One muted tooltip row: optional dot, label, mono value, a w-8 note on the right. */
export function TipRow({ label, value, note, color }: { label: any; value: any; note?: any; color?: string }) {
    return (
        <span className="flex h-4 items-center gap-2 text-muted-foreground">
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {color ? (
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: color }} />
                ) : null}
                <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>{label}</span>
            </span>
            <span className={`font-mono font-medium text-foreground tabular-nums ${TEXT_TRIM}`}>{value}</span>
            <span className={`w-8 text-end tabular-nums ${TEXT_TRIM}`}>{note}</span>
        </span>
    );
}

/** The tooltip card shell (w-60 by default). */
export function TipCard({ className = 'w-60', children }: { className?: string; children?: any }) {
    return (
        <div
            className={`grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl ${className}`}
        >
            <div className="flex flex-1 flex-col gap-2">{children}</div>
        </div>
    );
}

export function TipSeparator() {
    return <div role="separator" className="h-px w-full shrink-0 bg-border" />;
}

/** The small dot legend above a plot (right-aligned). items: { key, label, color }. */
export function LegendDots({
    items,
    className = 'justify-end',
}: {
    items: { key: string; label: any; color: string; swatch?: any }[];
    className?: string;
}) {
    return (
        <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground ${className}`}>
            {items.map((it) => (
                <li key={it.key} className="flex h-4 items-center gap-1.5">
                    {it.swatch || (
                        <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: it.color }}
                        />
                    )}
                    <span className={TEXT_TRIM}>{it.label}</span>
                </li>
            ))}
        </ul>
    );
}

export type MenuOption = { value: string; label: string; icon?: string; shortcut?: string; note?: string };

/**
 * A toolbar menu button with a radio list. The trigger shows `icon` + the current label (sr-only on
 * narrow cards) + a chevron, or only the icon with `iconOnly`.
 */
export function MenuSelect({
    options,
    value,
    onValueChange,
    icon,
    label,
    menuLabel,
    iconOnly,
    triggerLabel,
    className = '',
    contentClassName = 'w-auto min-w-40',
    size = 'sm',
}: {
    options: MenuOption[];
    value: string;
    onValueChange: (v: string) => void;
    icon?: string;
    label: string;
    menuLabel?: string;
    iconOnly?: boolean;
    triggerLabel?: string;
    className?: string;
    contentClassName?: string;
    /** Trigger size: 'sm' (28px, default) or 'default' (32px). */
    size?: 'sm' | 'default';
}) {
    const current = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    iconOnly ? (
                        <Button
                            variant="outline"
                            size={size === 'default' ? 'icon' : 'icon-sm'}
                            aria-label={triggerLabel || label}
                            title={triggerLabel || label}
                            className={`bg-background ${className}`}
                        />
                    ) : (
                        <Button
                            variant="outline"
                            size={size}
                            aria-label={`${label}: ${current ? current.label : ''}`}
                            className={`bg-background ${className}`}
                        />
                    )
                }
            >
                {icon ? <Icon name={icon} /> : null}
                {iconOnly ? null : (
                    <>
                        <span className={`@max-md:sr-only ${TEXT_TRIM}`}>{current ? current.label : label}</span>
                        <Icon name="chevron-down" className="text-muted-foreground" />
                    </>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={contentClassName}>
                <DropdownMenuGroup>
                    {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
                    <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                        {options.map((o) => (
                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                {o.icon ? <Icon name={o.icon} /> : null}
                                {o.label}
                                {o.note ? (
                                    <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                        {o.note}
                                    </span>
                                ) : null}
                                {o.shortcut ? <DropdownMenuShortcut>{o.shortcut}</DropdownMenuShortcut> : null}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * A toolbar menu with checkbox items (at least one stays on), a muted note per item (e.g. a share)
 * and a "show all" item that turns every option back on. Trigger (32px, ReUI's default size): icon + label + "n/total".
 */
export function MenuChecklist({
    options,
    value,
    onValueChange,
    icon,
    label,
    menuLabel,
    allLabel = 'Show all',
}: {
    options: { value: string; label: string; note?: string }[];
    value: string[];
    onValueChange: (v: string[]) => void;
    icon?: string;
    label: string;
    menuLabel?: string;
    allLabel?: string;
}) {
    const on = value;
    const toggle = (v: string, checked: boolean) => {
        const next = options.map((o) => o.value).filter((k) => (k === v ? checked : on.indexOf(k) >= 0));
        if (next.length) onValueChange(next);
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="default" className="bg-background" />}>
                {icon ? <Icon name={icon} /> : null}
                <span className={`@max-md:sr-only ${TEXT_TRIM}`}>{label}</span>
                <span className={`font-normal text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                    {`${on.length}/${options.length}`}
                </span>
                <Icon name="chevron-down" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                    {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
                    {options.map((o) => (
                        <DropdownMenuCheckboxItem
                            key={o.value}
                            checked={on.indexOf(o.value) >= 0}
                            onCheckedChange={(c: boolean) => toggle(o.value, c)}
                            closeOnClick={false}
                        >
                            {o.label}
                            {o.note ? (
                                <span className="ms-auto text-muted-foreground tabular-nums">{o.note}</span>
                            ) : null}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    disabled={on.length === options.length}
                    onClick={() => onValueChange(options.map((o) => o.value))}
                >
                    {allLabel}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Is the element on screen and the tab visible? Live feeds use it to stop ticking off screen: on Next
 * Experience pages every text / class change restyles the whole document, so an off-screen ticker
 * still costs a long task per tick.
 */
export function useOnScreen(ref: { current: Element | null }, rootMargin = '100px'): boolean {
    const [seen, setSeen] = useState(true);
    const [shown, setShown] = useState(typeof document === 'undefined' || document.visibilityState !== 'hidden');
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') return undefined;
        const io = new IntersectionObserver((entries) => setSeen(entries[entries.length - 1].isIntersecting), {
            rootMargin,
        });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, rootMargin]);
    useEffect(() => {
        const onVis = () => setShown(document.visibilityState !== 'hidden');
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);
    return seen && shown;
}

/** [busy, start]: start() sets busy for `ms`, then calls `done` (e.g. replay an animation). */
export function useBusy(ms = 700, done?: () => void): [boolean, () => void] {
    const [busy, setBusy] = useState(false);
    const t = useRef<any>(null);
    const doneRef = useRef(done);
    doneRef.current = done;
    useEffect(() => () => clearTimeout(t.current), []);
    const start = () => {
        if (busy) return;
        setBusy(true);
        t.current = setTimeout(() => {
            setBusy(false);
            if (doneRef.current) doneRef.current();
        }, ms);
    };
    return [busy, start];
}

/** The outline refresh icon button; spins a loader and disables itself while busy. */
export function RefreshButton({
    busy,
    onClick,
    label = 'Refresh data',
    busyLabel = 'Refreshing data',
    size = 'sm',
}: {
    busy: boolean;
    onClick: () => void;
    label?: string;
    busyLabel?: string;
    /** 'sm' (28px, default) or 'default' (32px). */
    size?: 'sm' | 'default';
}) {
    return (
        <Button
            variant="outline"
            size={size === 'default' ? 'icon' : 'icon-sm'}
            className="bg-background"
            aria-label={busy ? busyLabel : label}
            title={busy ? busyLabel : label}
            disabled={busy}
            onClick={onClick}
        >
            <Icon name={busy ? 'loader-circle' : 'refresh-cw'} className={busy ? 'animate-spin' : ''} />
        </Button>
    );
}

/** A rotate(45) hatch pattern of thin lines (`className` colours the line rect, e.g. fill-muted-foreground/25). */
export function HatchLines({
    id,
    size = 4,
    width = 0.75,
    className = 'fill-muted-foreground/25',
    color,
}: {
    id: string;
    size?: number;
    width?: number;
    className?: string;
    color?: string;
}) {
    return (
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect className={color ? undefined : className} fill={color} width={width} height={size} />
        </pattern>
    );
}

export default TipRow;
