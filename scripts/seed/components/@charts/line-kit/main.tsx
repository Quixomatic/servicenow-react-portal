import { useEffect, useState } from 'react';
import { prefersReducedMotion } from 'components:chart';
import { rowsToCsv, downloadText, copyText } from 'components:chart-frame';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Button } from 'components:button';
import { Icon } from 'components:icon';

/**
 * components:charts/line-kit: pieces shared by the line chart gallery blocks (balance-tracker,
 * metric-switcher, revenue-trend, social-engagement, sales-vs-traffic, floor-monitor).
 *
 * - TRIM (cap-height text box), LineSwatch (12x2 line / dashed swatch), IconTile (header icon tile).
 * - Tooltip: TipShell / TipHeader / TipRow / TipValue (the chart tooltip surface and its rows).
 * - StatGrid (2 → 4 column KPI <dl> under the plot), MetaRow (footer items joined by 4px dots).
 * - ToggleChip (outline toggle button with a swatch, e.g. Compare), BlockMenu ("…" menu: Show
 *   checkboxes, Export items, Reset View).
 * - useIntro(deps): 'drawing' then 'done' (markers fade in after the lines draw); DRAW_X keyframes.
 * - paddedDomain, fmtDay / fmtLong / fmtMonth (ISO dates), usd (money with cents), signed helpers.
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export const TRIM = '[text-box:trim-both_cap_alphabetic]';
export const FADE = 'transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]';

/* ---------------- Swatches / tiles ---------------- */

export function LineSwatch({
    className,
    color,
    dashed,
    width = 12,
}: {
    className?: string;
    color?: string;
    dashed?: boolean;
    width?: number;
}) {
    return (
        <svg
            aria-hidden="true"
            width={width}
            height="2"
            viewBox={`0 0 ${width} 2`}
            className={`shrink-0 overflow-visible ${className || ''}`}
            style={color ? { color } : undefined}
        >
            <line
                x1="0"
                x2={width}
                y1="1"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={dashed ? '3 2' : undefined}
                strokeLinecap={dashed ? 'butt' : 'round'}
            />
        </svg>
    );
}

export function IconTile({ icon }: { icon: string }) {
    return (
        <span
            data-slot="icon-tile"
            className="relative isolate inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 align-middle [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
        >
            <Icon name={icon} />
        </span>
    );
}

/* ---------------- Tooltip ---------------- */

export function TipShell({ children, className }: { children?: any; className?: string }) {
    return (
        <div
            className={`grid w-auto min-w-60 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl ${className || ''}`}
        >
            {children}
        </div>
    );
}

export function TipHeader({ title, badge }: { title: any; badge?: any }) {
    return (
        <div className="font-medium">
            <span className="flex h-5 items-center justify-between gap-3">
                <span className={TRIM}>{title}</span>
                {badge ? (
                    <span
                        data-slot="badge"
                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border border-border bg-transparent px-1.25 py-0.5 text-xs font-medium whitespace-nowrap dark:bg-input/32"
                    >
                        {badge}
                    </span>
                ) : null}
            </span>
        </div>
    );
}

/** One tooltip row: 16px icon slot (swatch or lucide icon), muted label, value on the right. */
export function TipRow({ icon, label, children }: { icon?: any; label: any; children?: any }) {
    return (
        <div className="flex h-4 items-center justify-between gap-6">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="flex size-4 shrink-0 items-center justify-center [&_svg:not([class*=size-])]:size-4">
                    {typeof icon === 'string' ? <Icon name={icon} /> : icon}
                </span>
                <span className={TRIM}>{label}</span>
            </span>
            {children}
        </div>
    );
}

/** A tooltip value: bold tabular text, optionally tinted, with a muted secondary value. */
export function TipValue({ value, tone, extra }: { value: any; tone?: 'up' | 'down' | null; extra?: any }) {
    const cls = tone === 'up' ? ' text-success' : tone === 'down' ? ' text-destructive' : '';
    if (extra == null) return <span className={`${TRIM} font-medium tabular-nums${cls}`}>{value}</span>;
    return (
        <span className="flex items-center gap-1.5 tabular-nums">
            <span className={`${TRIM} font-medium${cls}`}>{value}</span>
            <span className={`${TRIM} text-muted-foreground`}>{extra}</span>
        </span>
    );
}

/* ---------------- KPI grid / footer ---------------- */

export type Stat = { label: any; value: any; note?: any; key?: string };

/** The KPI panel content: 2 columns, 4 joined columns (rules between) from @2xl. */
export function StatGrid({ items, className }: { items: Stat[]; className?: string }) {
    return (
        <dl
            className={`grid grid-cols-2 gap-5 @2xl:-mx-(--frame-panel-px) @2xl:-my-(--frame-panel-py) @2xl:grid-cols-4 @2xl:gap-0 ${className || ''}`}
        >
            {items.map((s, i) => (
                <div
                    key={s.key || (typeof s.label === 'string' ? s.label : i)}
                    className="flex min-w-0 flex-col gap-2 @2xl:px-(--frame-panel-px) @2xl:py-(--frame-panel-py) @2xl:not-first:border-s"
                >
                    <dt className="text-sm text-muted-foreground">{s.label}</dt>
                    <dd className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xl leading-none font-semibold tracking-tight tabular-nums">
                            {s.value}
                        </span>
                        {s.note != null ? (
                            <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                <span className={TRIM}>{s.note}</span>
                            </span>
                        ) : null}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Footer items joined by 4px muted dots. */
export function MetaRow({ items, className }: { items: any[]; className?: string }) {
    const list = items.filter((x) => x != null && x !== false);
    return (
        <span className={`flex min-w-0 items-center gap-1.5 ${className || ''}`}>
            {list.map((it, i) => (
                <span key={i} className="contents">
                    {i > 0 ? (
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    ) : null}
                    <span className="flex h-4 items-center tabular-nums">
                        <span className={TRIM}>{it}</span>
                    </span>
                </span>
            ))}
        </span>
    );
}

/* ---------------- Toolbar pieces ---------------- */

/** An outline toggle button (sm): muted until pressed, then card background + foreground text. */
export function ToggleChip({
    pressed,
    onPressedChange,
    children,
    className,
    label,
}: {
    pressed: boolean;
    onPressedChange: (v: boolean) => void;
    children?: any;
    className?: string;
    label?: string;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            aria-label={label}
            data-slot="toggle"
            onClick={() => onPressedChange(!pressed)}
            className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-muted-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground dark:border-input dark:aria-pressed:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 ${className || ''}`}
        >
            {children}
        </button>
    );
}

export type MenuCheck = { label: string; icon?: string; checked: boolean; onChange: (v: boolean) => void };
export type MenuAction = { label: string; icon?: string; onSelect: () => void; disabled?: boolean };

/** The "…" menu: optional Show group (checkboxes), Export group, then extra actions (Reset View). */
export function BlockMenu({
    show,
    exports,
    actions,
    label = 'More actions',
    size = 'sm',
    trigger,
}: {
    show?: MenuCheck[];
    exports?: MenuAction[];
    actions?: MenuAction[];
    label?: string;
    /** 'sm' (28px) or 'default' (32px) trigger. */
    size?: 'sm' | 'default';
    /** A labelled trigger (e.g. Display): icon + text + chevron instead of the "…" icon button. */
    trigger?: { icon?: string; text: string };
}) {
    const groups: any[] = [];
    if (show && show.length)
        groups.push(
            <DropdownMenuGroup key="show">
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                {show.map((s) => (
                    <DropdownMenuCheckboxItem
                        key={s.label}
                        checked={s.checked}
                        onCheckedChange={(v: boolean) => s.onChange(!!v)}
                    >
                        {s.icon ? <Icon name={s.icon} /> : null}
                        {s.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
        );
    if (exports && exports.length)
        groups.push(
            <DropdownMenuGroup key="export">
                <DropdownMenuLabel>Export</DropdownMenuLabel>
                {exports.map((a) => (
                    <DropdownMenuItem key={a.label} onClick={a.onSelect} disabled={a.disabled}>
                        {a.icon ? <Icon name={a.icon} /> : null}
                        {a.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
        );
    if (actions && actions.length)
        groups.push(
            <DropdownMenuGroup key="actions">
                {actions.map((a) => (
                    <DropdownMenuItem key={a.label} onClick={a.onSelect} disabled={a.disabled}>
                        {a.icon ? <Icon name={a.icon} /> : null}
                        {a.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
        );
    return (
        <DropdownMenu>
            {trigger ? (
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="outline"
                            size={size === 'sm' ? 'sm' : 'default'}
                            aria-label={label}
                            className="bg-background"
                        />
                    }
                >
                    {trigger.icon ? <Icon name={trigger.icon} /> : null}
                    <span className={TRIM}>{trigger.text}</span>
                    <Icon name="chevron-down" className="text-muted-foreground" />
                </DropdownMenuTrigger>
            ) : (
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="outline"
                            size={size === 'sm' ? 'icon-sm' : 'icon'}
                            aria-label={label}
                            title={label}
                            className="bg-background"
                        />
                    }
                >
                    <Icon name="ellipsis" />
                </DropdownMenuTrigger>
            )}
            <DropdownMenuContent align="end" className="w-auto min-w-44">
                {groups.map((g, i) => (i > 0 ? [<DropdownMenuSeparator key={`s${i}`} />, g] : g))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Standard export actions: Download CSV, Copy Data (JSON), Copy Summary. */
export function exportActions({
    filename,
    rows,
    columns,
    summary,
}: {
    filename: string;
    rows: any[];
    columns: any[];
    summary: string | (() => string);
}): MenuAction[] {
    return [
        { label: 'Download CSV', icon: 'download', onSelect: () => downloadText(filename, rowsToCsv(rows, columns)) },
        {
            label: 'Copy Data',
            icon: 'clipboard',
            onSelect: () => {
                copyText(rowsToCsv(rows, columns));
            },
        },
        {
            label: 'Copy Summary',
            icon: 'file-text',
            onSelect: () => {
                copyText(typeof summary === 'function' ? summary() : summary);
            },
        },
    ];
}

/**
 * Joined range buttons (7D / 30D / 90D): the pressed one has the card background and foreground text.
 * size 'sm' = 28px, 'default' = 32px with 14px text. Radio semantics with arrow keys.
 */
export function RangeTabs({
    options,
    value,
    onValueChange,
    label = 'Range',
    size = 'sm',
}: {
    options: { value: string; label: string }[];
    value: string;
    onValueChange: (v: string) => void;
    label?: string;
    size?: 'sm' | 'default';
}) {
    const onKey = (e: any, i: number) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = (i + d + options.length) % options.length;
        onValueChange(options[n].value);
        const parent = e.currentTarget.parentElement;
        const btn = parent ? parent.children[n] : null;
        if (btn) btn.focus();
    };
    return (
        <div role="radiogroup" aria-label={label} data-slot="toggle-group" className="flex w-fit items-center">
            {options.map((o, i) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => onValueChange(o.value)}
                        onKeyDown={(e) => onKey(e, i)}
                        className={`inline-flex shrink-0 items-center justify-center border border-border font-medium whitespace-nowrap transition-colors outline-none not-first:-ml-px first:rounded-l-lg last:rounded-r-lg focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input ${
                            size === 'sm' ? 'h-7 px-2 text-[0.8rem]' : 'h-8 px-2.5 text-sm'
                        } ${on ? 'bg-card text-foreground dark:bg-muted' : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <span className={TRIM}>{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** A delta badge: arrow + text, tinted success / warning / destructive. */
export function DeltaPill({
    up,
    tone,
    children,
}: {
    up: boolean;
    tone: 'success' | 'warning' | 'destructive';
    children?: any;
}) {
    const tones = {
        success:
            'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
        warning:
            'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
        destructive:
            'border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive',
    };
    return (
        <span
            data-slot="badge"
            className={`inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 ${tones[tone]}`}
        >
            <Icon name={up ? 'trending-up' : 'trending-down'} />
            <span className={`${TRIM} tabular-nums`}>{children}</span>
        </span>
    );
}

/** Dashed legend swatch made of two 4px dashes (12px wide). */
export function DashSwatch({ className }: { className?: string }) {
    return (
        <span aria-hidden="true" className={`flex w-3 shrink-0 justify-between ${className || ''}`}>
            <span className="h-0.5 w-1 rounded-full bg-muted-foreground" />
            <span className="h-0.5 w-1 rounded-full bg-muted-foreground" />
        </span>
    );
}

/** Zero-based axis ticks: step = the smallest 1 / 2 / 2.5 / 5 × 10^k ≥ max / intervals. */
export function zeroTicks(max: number, intervals = 4): number[] {
    const raw = (max || 1) / intervals;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    const top = Math.ceil(max / step) * step || step;
    const out: number[] = [];
    for (let v = 0; v <= top + step / 2; v += step) out.push(Number(v.toFixed(6)));
    return out;
}

/** Nice axis ticks: the smallest 1 / 2 / 2.5 / 5 step that spans [lo, hi] in at most `maxIntervals`. */
export function niceTicks(lo: number, hi: number, maxIntervals = 4): number[] {
    const span = hi - lo || Math.abs(hi) || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(span / maxIntervals)));
    for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
        const s = m * mag;
        const a = Math.floor(lo / s) * s;
        const b = Math.ceil(hi / s) * s;
        if (Math.round((b - a) / s) <= maxIntervals) {
            const out: number[] = [];
            for (let v = a; v <= b + s / 2; v += s) out.push(Number(v.toFixed(6)));
            return out;
        }
    }
    return [lo, hi];
}

/** x of point i on a point scale over the plot (`pad` px inset at both ends, like XAxis padding). */
export function pointX(plot: { x: number; width: number }, i: number, n: number, pad = 0): number {
    const w = plot.width - pad * 2;
    return plot.x + pad + (n > 1 ? (i / (n - 1)) * w : w / 2);
}

/** y of a value on a linear scale over the plot for the [lo, hi] domain. */
export function valueY(plot: { y: number; height: number }, v: number, domain: number[]): number {
    const hi = domain[domain.length - 1];
    return plot.y + ((hi - v) / (hi - domain[0])) * plot.height;
}

/* ---------------- Motion ---------------- */

/** Keyframes: a line drawing left to right (clip-path reveal). */
export const DRAW_X = { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] };

/**
 * 'drawing' while the lines draw (markers hidden), then 'done' (markers fade in over 200 ms). Restarts
 * when deps change. Reduced motion: always 'done'.
 */
export function useIntro(deps: any[], ms = 500): 'drawing' | 'done' {
    const [state, setState] = useState<'drawing' | 'done'>(() =>
        typeof window !== 'undefined' && prefersReducedMotion() ? 'done' : 'drawing'
    );
    useEffect(() => {
        if (prefersReducedMotion()) {
            setState('done');
            return undefined;
        }
        setState('drawing');
        const t = setTimeout(() => setState('done'), ms);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return state;
}

/* ---------------- Scales / formatting ---------------- */

/** [min - pad, max + pad] of the values (pad = span × ratio); Recharts rounds it to nice ticks. */
export function paddedDomain(values: number[], ratio = 0.1): [number, number] {
    const v = values.filter((x) => x != null && !isNaN(x));
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    const pad = (hi - lo) * ratio || Math.abs(hi) * 0.05 || 1;
    return [lo - pad, hi + pad];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** '2026-09-15' → 'Sep 15'. */
export function fmtDay(iso: string): string {
    const p = parts(iso);
    return `${MONTHS[p.m - 1]} ${p.d}`;
}

/** '2026-09-15' → 'Sep 15, 2026'. */
export function fmtDate(iso: string): string {
    const p = parts(iso);
    return `${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** '2026-09-15' → 'Tue, Sep 15, 2026'. */
export function fmtLong(iso: string): string {
    const p = parts(iso);
    return `${DAYS[p.dow]}, ${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** '2026-09-15' → 'Tue, Sep 15' (weekday, no year). */
export function fmtWeekDay(iso: string): string {
    const p = parts(iso);
    return `${DAYS[p.dow]}, ${MONTHS[p.m - 1]} ${p.d}`;
}

/** ISO date plus n days (UTC): addDays('2026-01-31', 1) → '2026-02-01'. */
export function addDays(iso: string, n: number): string {
    const p = parts(iso);
    return new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10);
}

/** Nice step for `intervals` equal steps from 0 (1 / 2 / 2.5 / 5 × 10^k); ticks = 0..intervals × step. */
export function fixedZeroTicks(max: number, intervals = 5): number[] {
    const raw = (max || 1) / intervals;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw - 1e-9) || raw;
    const out: number[] = [];
    for (let i = 0; i <= intervals; i++) out.push(Number((i * step).toFixed(6)));
    return out;
}

/** '2026-09-15' → 'Sep'. */
export function fmtMonth(iso: string): string {
    return MONTHS[parts(iso).m - 1];
}

/** Money with cents: 24847.83 → '$24,847.83'; signed: '+$1,400.72' / '-$24.54'. */
export function usd(n: number, opts: { signed?: boolean; decimals?: number } = {}): string {
    const d = opts.decimals != null ? opts.decimals : 2;
    const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    const r = Number(Math.abs(n).toFixed(d));
    const sign = n < 0 && r !== 0 ? '-' : opts.signed && r !== 0 ? '+' : '';
    return `${sign}$${s}`;
}

/** Signed percent with 2 decimals: 5.97 → '+5.97%', 0 → '0.00%'. */
export function pct(n: number, decimals = 2, signed = true): string {
    const r = Number(Math.abs(n).toFixed(decimals));
    const sign = n < 0 && r !== 0 ? '-' : signed && r !== 0 ? '+' : '';
    return `${sign}${Math.abs(n).toFixed(decimals)}%`;
}

/** Compact money axis label: 24500 → '$24.5K', 1200000 → '$1.2M'. */
export function usdK(n: number): string {
    const a = Math.abs(n);
    const fix = (x: number) => String(Number(x.toFixed(1)));
    if (a >= 1e6) return `${n < 0 ? '-' : ''}$${fix(a / 1e6)}M`;
    if (a >= 1e3) return `${n < 0 ? '-' : ''}$${fix(a / 1e3)}K`;
    return `${n < 0 ? '-' : ''}$${Math.round(a)}`;
}

export default LineSwatch;
