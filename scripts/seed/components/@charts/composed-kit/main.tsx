import { Fragment, useState } from 'react';
import { ChartExpandDialog, ToolbarButton, copyText, rowsToCsv } from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';

/**
 * components:charts/composed-kit: small pieces shared by the composed chart blocks (sales-vs-goal,
 * operating-margin, cashflow-trend, liquidity-flows, canary-rollback, revenue-map).
 *
 * - usd / signedUsd: "$352.4K", "$4.12M", "+$13.9K"; usdTick: "$200K", "$1.2M".
 * - TEXT_TRIM: the cap-height text box trim the blocks put on every label.
 * - TipRow / TipSection: tooltip rows (swatch + muted label, mono value) and bordered sections.
 * - StatusBadge: the tinted success / destructive / warning / muted pill.
 * - DotSwatch / DashSwatch / MetaDot: legend and footer marks.
 * - ExpandButton + useExpand, copyCsv: the toolbar's expand dialog and "Copy data".
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TEXT_TRIM = '[text-box:trim-both_cap_alphabetic]';

/** $352.4K / $4.12M / $950 (sign kept). */
export function usd(n: number, opts: { decimals?: number; mDecimals?: number } = {}): string {
    const v = Number(n) || 0;
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(opts.mDecimals != null ? opts.mDecimals : 2)}M`;
    if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(opts.decimals != null ? opts.decimals : 1)}K`;
    return `${sign}$${Math.round(a)}`;
}

/** +$13.9K / -$27.6K. */
export function signedUsd(n: number, opts: { decimals?: number; mDecimals?: number } = {}): string {
    return `${n > 0 ? '+' : ''}${usd(n, opts)}`;
}

/** Axis ticks: $0 / $200K / $1.2M (no trailing zeros). */
export function usdTick(n: number): string {
    const v = Number(n) || 0;
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const fix = (x: number) => String(Math.round(x * 10) / 10);
    if (a >= 1e9) return `${sign}$${fix(a / 1e9)}B`;
    if (a >= 1e6) return `${sign}$${fix(a / 1e6)}M`;
    if (a >= 1e3) return `${sign}$${fix(a / 1e3)}K`;
    return `${sign}$${Math.round(a)}`;
}

/** A tooltip row: optional swatch + muted label on the left, mono value on the right. */
export function TipRow({
    swatch,
    label,
    value,
    valueClassName = 'text-foreground',
}: {
    swatch?: any;
    label: any;
    value: any;
    valueClassName?: string;
}) {
    return (
        <div className="flex h-4 items-center justify-between gap-4 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {swatch}
                <span className={TEXT_TRIM}>{label}</span>
            </span>
            <span className={`font-mono font-medium tabular-nums ${TEXT_TRIM} ${valueClassName}`}>{value}</span>
        </div>
    );
}

/** A bordered group of tooltip rows. */
export function TipSection({ children }: { children?: any }) {
    return <div className="flex flex-col gap-1.5 border-t pt-1.5">{children}</div>;
}

/** Signed money delta + a muted percent, e.g. "-$13.3K  97.1%". */
export function DeltaPair({ delta, pct, good }: { delta: string; pct: string; good: boolean }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span className={good ? 'text-success' : 'text-destructive'}>{delta}</span>
            {pct}
        </span>
    );
}

const BADGE_TONES: Record<string, string> = {
    success:
        'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
    destructive:
        'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive',
    warning:
        'border-warning/20 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
    info: 'border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info',
    muted: 'border-border bg-muted text-muted-foreground',
};

/** The small tinted status pill (h-5, text-xs, rounded-sm). */
export function StatusBadge({
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
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3 ${BADGE_TONES[tone] || BADGE_TONES.muted} ${className}`}
        >
            {children}
        </span>
    );
}

/** An 8px round swatch (CSS colour or a bg-* class). */
export function DotSwatch({ color, className = '' }: { color?: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${className}`}
            style={color ? { background: color } : undefined}
        />
    );
}

/** A 12x2 dashed line swatch. */
export function DashSwatch({ color, dash = '3 2' }: { color: string; dash?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 12 2" className="h-0.5 w-3 shrink-0" style={{ color }}>
            <line x1="0" x2="12" y1="1" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray={dash} />
        </svg>
    );
}

/** The 4px muted separator dot between header / footer meta items. */
export function MetaDot() {
    return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />;
}

/** [open, setOpen] + the toolbar button and dialog for "Expand chart". */
export function useExpand(): [boolean, (v: boolean) => void] {
    const [open, setOpen] = useState(false);
    return [open, setOpen];
}

export function ExpandButton({ onClick }: { onClick: () => void }) {
    return <ToolbarButton icon={<Icon name="maximize-2" />} label="Expand chart" onClick={onClick} />;
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
    return <ToolbarButton icon={<Icon name="refresh-cw" />} label="Refresh data" onClick={onClick} />;
}

export function ExpandDialog({
    open,
    onOpenChange,
    title,
    children,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    children?: any;
}) {
    return (
        <ChartExpandDialog open={open} onOpenChange={onOpenChange} title={title}>
            {children}
        </ChartExpandDialog>
    );
}

export type ToggleItem = { key: string; label: string; icon?: any };
export type ToggleGroup = { label?: string; items: ToggleItem[] };

/**
 * A toolbar "Display" menu: labelled groups of checkbox items (layers, compare series) that stay open
 * while toggling. `value`: the keys switched on.
 */
export function ToggleMenu({
    label = 'Display',
    groups,
    value,
    onToggle,
    align = 'end',
    icon,
}: {
    label?: any;
    /** Render an icon-only trigger (label becomes its accessible name). */
    icon?: any;
    groups: ToggleGroup[];
    value: string[];
    onToggle: (key: string, on: boolean) => void;
    align?: 'start' | 'center' | 'end';
}) {
    return (
        <DropdownMenu>
            {icon ? (
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            aria-label={label}
                            title={label}
                        />
                    }
                >
                    {icon}
                </DropdownMenuTrigger>
            ) : (
                <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="bg-background" />}>
                    {label}
                    <Icon name="chevron-down" />
                </DropdownMenuTrigger>
            )}
            <DropdownMenuContent align={align} className="w-auto min-w-44">
                {groups.map((g, gi) => (
                    <Fragment key={g.label || gi}>
                        {gi > 0 ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuGroup>
                            {g.label ? <DropdownMenuLabel>{g.label}</DropdownMenuLabel> : null}
                            {g.items.map((it) => (
                                <DropdownMenuCheckboxItem
                                    key={it.key}
                                    checked={value.indexOf(it.key) >= 0}
                                    onCheckedChange={(c: boolean) => onToggle(it.key, c)}
                                    closeOnClick={false}
                                >
                                    {it.icon}
                                    {it.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuGroup>
                    </Fragment>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export type MenuOption = { value: string; label: string; short?: string; description?: string; icon?: any };

/**
 * A toolbar single-choice menu whose trigger shows a short label (`short` or `label`) with an icon and
 * whose items can carry a muted second line (`description`), e.g. "Last 6 months / Apr to Sep 2026".
 */
export function MenuSelect({
    label,
    value,
    onValueChange,
    options,
    icon,
    align = 'end',
}: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    options: MenuOption[];
    icon?: any;
    align?: 'start' | 'center' | 'end';
}) {
    const current = options.find((o) => o.value === value) || options[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-background"
                        aria-label={`${label}: ${current ? current.label : ''}`}
                    />
                }
            >
                {icon}
                <span className={TEXT_TRIM}>{current ? current.short || current.label : ''}</span>
                <Icon name="chevron-down" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-auto min-w-44">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                        {options.map((o) => (
                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                {o.icon}
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

/**
 * An odometer value: each digit is a 0–9 column that slides to its place (300 ms) when the text changes;
 * other characters ($ . % M) render as is. The full text is in an sr-only span.
 */
export function RollingValue({ text, className = '' }: { text: string; className?: string }) {
    const chars = String(text).split('');
    return (
        <span className={`inline-flex tabular-nums ${className}`}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true" className="inline-flex">
                {chars.map((ch, i) => {
                    const d = ch.charCodeAt(0) - 48;
                    if (d < 0 || d > 9) {
                        return (
                            <span key={`${i}${ch}`} className="whitespace-pre">
                                {ch}
                            </span>
                        );
                    }
                    return (
                        <span key={`d${chars.length - i}`} className="relative inline-block h-[1lh] overflow-hidden">
                            <span
                                className="flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                                style={{ transform: `translateY(-${d * 10}%)` }}
                            >
                                {DIGITS.map((n) => (
                                    <span key={n} className="h-[1lh]">
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

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Copies rows as CSV text (the menu's "Copy data"). */
export async function copyCsv(rows: any[], columns: { key: string; label: string; value?: (r: any) => any }[]) {
    return copyText(rowsToCsv(rows, columns));
}

export default TipRow;
