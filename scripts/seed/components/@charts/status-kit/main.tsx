import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';

/**
 * components:charts/status-kit: shared pieces for the status-tracker blocks: duration / relative-time / UTC
 * formatters, the separator dot, a select-styled dropdown with icons and counts, and the trimmed text span.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TRIM = '[text-box:trim-both_cap_alphabetic]';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 4m 12s / 52s / 1h 00m / 47m 28s. */
export function duration(sec: number | null | undefined): string {
    if (sec == null) return '-';
    const s = Math.round(sec);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
    return `${s}s`;
}

/** 50m ago / 10h 50m ago / 1d ago / 134d ago, measured from `now`. */
export function ago(at: string | number | Date, now: string | number | Date): string {
    const ms = new Date(now).getTime() - new Date(at).getTime();
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return m % 60 ? `${h}h ${m % 60}m ago` : `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

/** Single unit: 7m ago / 3h ago / 2d ago (minutes only under an hour), measured from `now`. */
export function agoShort(at: string | number | Date, now: string | number | Date): string {
    const ms = new Date(now).getTime() - new Date(at).getTime();
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

/** Sep 29, 13:30 UTC. */
export function utc(at: string | number | Date, withTime = true): string {
    const d = new Date(at);
    const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
    if (!withTime) return day;
    return `${day}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

/** The 4px separator dot. */
export function SepDot() {
    return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />;
}

export type PickOption = { value: string; label: string; icon?: any; count?: number };

/** A dropdown styled like a select trigger: icon + label + chevron; options with icons and muted counts. */
export function PickMenu({
    label,
    menuLabel,
    value,
    options,
    onValueChange,
    className = '',
    align = 'end',
}: {
    label: string;
    menuLabel?: string;
    value: string;
    options: PickOption[];
    onValueChange: (v: string) => void;
    className?: string;
    align?: 'start' | 'end';
}) {
    const cur = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-label={label}
                        className={`h-8 justify-between gap-2 bg-background px-2.5 font-normal ${className}`}
                    />
                }
            >
                <span className="flex min-w-0 items-center gap-1.5">
                    {cur && cur.icon ? (
                        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                            {cur.icon}
                        </span>
                    ) : null}
                    <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                        {cur ? cur.label : ''}
                    </span>
                </span>
                <Icon name="chevron-down" className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="min-w-(--anchor-width)">
                <DropdownMenuGroup>
                    {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
                    <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                        {options.map((o) => (
                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                <span className="flex w-full items-center gap-2">
                                    {o.icon ? (
                                        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                                            {o.icon}
                                        </span>
                                    ) : null}
                                    {o.label}
                                    {o.count != null ? (
                                        <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                            {o.count}
                                        </span>
                                    ) : null}
                                </span>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** A small round swatch from a literal bg class. */
export function Swatch({ className }: { className: string }) {
    return <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${className}`} />;
}

export default PickMenu;
