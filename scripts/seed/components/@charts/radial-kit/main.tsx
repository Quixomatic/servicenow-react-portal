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
 * components:charts/radial-kit: small pieces shared by the radial and sankey chart blocks (error-budgets,
 * api-health, inflows-gauge, revenue-flow, trial-journey, pipeline-leakage).
 *
 * - TEXT_TRIM: the cap-height text box trim the blocks put on every label.
 * - Pill: the tinted status badge (success / warning / destructive / info / muted / outline).
 * - ServiceSelect: a DropdownMenu styled like a select trigger (icon + value + chevron, grouped label).
 * - MetaDot / LiveDot: footer marks.
 * - BarMeter: the thin progress bar used in tables (track + indicator).
 * - polar(): a point on a circle for plain SVG gauges (0 deg = 12 o'clock, clockwise).
 * - arcPath(): an SVG arc path between two angles.
 * - T / TABLE: shadcn table classes for hand-written tables.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';

/** cubic-bezier(0.23, 1, 0.32, 1), the hover / swap easing these blocks use. */
export const EASE_SWIFT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const PILL_TONES: Record<string, string> = {
    success:
        'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
    warning:
        'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
    destructive:
        'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive',
    info: 'border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info',
    muted: 'border-transparent bg-muted text-muted-foreground',
    outline: 'border-border bg-background text-foreground',
};

/** The small status badge (h-5, text-xs, rounded-sm) in a tone. */
export function Pill({
    tone = 'muted',
    className = '',
    children,
}: {
    tone?: string;
    className?: string;
    children?: any;
}) {
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3 ${PILL_TONES[tone] || PILL_TONES.muted} ${className}`}
        >
            {typeof children === 'string' ? <span className={TEXT_TRIM}>{children}</span> : children}
        </span>
    );
}

export function MetaDot() {
    return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />;
}

export function LiveDot({ className = 'bg-success' }: { className?: string }) {
    return <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${className}`} />;
}

export type SelectOption = { value: string; label: string; description?: string };

/** A select-looking menu: outline trigger with a leading icon, the value and a chevron. */
export function ServiceSelect({
    label,
    value,
    options,
    onValueChange,
    icon,
    className = '',
    align = 'start',
}: {
    label: string;
    value: string;
    options: SelectOption[];
    onValueChange: (v: string) => void;
    icon?: string;
    className?: string;
    align?: 'start' | 'center' | 'end';
}) {
    const current = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-label={label}
                        className={`h-8 min-w-0 justify-start gap-1.5 bg-background px-2.5 text-sm font-normal ${className}`}
                    />
                }
            >
                {icon ? <Icon name={icon} className="size-4" /> : null}
                <span className="flex h-5 min-w-0 items-center">
                    <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                        {current ? current.label : ''}
                    </span>
                </span>
                <Icon name="chevron-down" className="ms-auto size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="min-w-(--anchor-width)">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                        {options.map((o) => (
                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                {o.description ? (
                                    <span className="flex flex-col gap-0.5">
                                        <span>{o.label}</span>
                                        <span className="text-xs text-muted-foreground">{o.description}</span>
                                    </span>
                                ) : (
                                    o.label
                                )}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** A thin meter (track + coloured indicator). `color` is any CSS colour. */
export function BarMeter({
    value,
    color,
    label,
    className = '',
}: {
    value: number;
    color: string;
    label?: string;
    className?: string;
}) {
    const v = Math.max(0, Math.min(100, value));
    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(v)}
            aria-label={label}
            data-slot="progress"
            className={`flex flex-1 ${className}`}
        >
            <div
                data-slot="progress-track"
                className="relative flex h-1.5 w-full items-center overflow-x-hidden bg-muted-foreground/15"
            >
                <div
                    data-slot="progress-indicator"
                    className="h-full transition-all"
                    style={{ width: `${v}%`, background: color }}
                />
            </div>
        </div>
    );
}

/** Point at `deg` (0 = 12 o'clock, clockwise) on a circle of radius r around (cx, cy). */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** An arc path from angle a0 to a1 (degrees, clockwise from 12 o'clock). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
    const [x0, y0] = polar(cx, cy, r, a0);
    const [x1, y1] = polar(cx, cy, r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const sweep = a1 >= a0 ? 1 : 0;
    return `M${x0} ${y0}A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

/** shadcn table classes for hand-written tables. */
export const T = {
    container: 'relative w-full overflow-x-auto',
    table: 'w-full caption-bottom text-sm',
    thead: '[&_tr]:border-b',
    tbody: '[&_tr:last-child]:border-0',
    tfoot: 'border-t font-medium [&>tr]:last:border-b-0',
    tr: 'border-b transition-colors',
    th: 'h-10 px-2 align-middle font-medium whitespace-nowrap text-muted-foreground first:ps-(--frame-panel-px) last:pe-(--frame-panel-px)',
    td: 'p-2 align-middle whitespace-nowrap first:ps-(--frame-panel-px) last:pe-(--frame-panel-px)',
};

export default Pill;
