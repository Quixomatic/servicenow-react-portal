import * as React from 'react';
import { cva } from 'class-variance-authority';
import { toast } from 'sonner';
import {
    CalendarIcon,
    CheckIcon,
    ChevronDownIcon,
    ClipboardIcon,
    DownloadIcon,
    EllipsisIcon,
    Maximize2Icon,
    RefreshCwIcon,
    TrendingDownIcon,
    TrendingUpIcon,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from './button';
import { ButtonGroup } from './split-button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from './dialog';

// components:chart-frame: the card shell for dashboard charts (the chart gallery's blocks use it),
// plus the toolbar, KPI, legend, footer and export pieces that sit in it. Generic: no data, no Recharts.
//
//   <ChartCard title="Orders" description="Sep 30 vs Sep 29"
//              actions={<><PeriodSelect …/><ChartMoreMenu csv={{ rows, columns }} summary={text} /></>}
//              footer={<FooterMeta items={[{ dot: 'success', label: 'Updated 5 min ago' }]} end="Per 2 hours" />}>
//       <KpiStrip items={[{ label: 'Orders', value: '543', delta: 6.5 }]} />
//       <FramePanelSection>…chart…</FramePanelSection>
//   </ChartCard>
//
// Frame, FramePanel, FrameHeader, FrameTitle, FrameDescription and FrameFooter are ported from
// ReUI's Frame primitive (https://github.com/keenthemes/reui, registry-reui/bases/base/reui/frame.tsx):
//   MIT License. Copyright (c) 2025 Keenthemes Inc.
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
//   associated documentation files (the "Software"), to deal in the Software without restriction,
//   including without limitation the rights to use, copy, modify, merge, publish, distribute,
//   sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions: The above copyright notice and this
//   permission notice shall be included in all copies or substantial portions of the Software.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
// Changes: the per-style (vega / nova / luma …) radius rungs are reduced to the nova values the
// portal theme uses. Everything below FrameFooter (ChartCard and the toolbar / KPI / export pieces)
// is our own.

const frameVariants = cva(
    [
        'relative flex flex-col bg-muted/50 gap-(--frame-gap) px-(--frame-px) py-(--frame-py) rounded-(--frame-radius)',
        '[--frame-radius:var(--radius-xl)]',
        '[--frame-gap:--spacing(0.75)] [--frame-px:--spacing(0.75)] [--frame-py:--spacing(0.75)] [--frame-panel-header-gap:0rem] [--frame-panel-footer-gap:--spacing(1)]',
        '[--frame-panel-px-adjust:0px] [--frame-panel-py-adjust:0px] [--frame-panel-header-px-adjust:0px] [--frame-panel-header-py-adjust:0px] [--frame-panel-footer-px-adjust:0px] [--frame-panel-footer-py-adjust:0px]',
        '[--frame-panel-px:calc(var(--frame-panel-px-base)+var(--frame-panel-px-adjust))] [--frame-panel-py:calc(var(--frame-panel-py-base)+var(--frame-panel-py-adjust))] [--frame-panel-header-px:calc(var(--frame-panel-header-px-base)+var(--frame-panel-header-px-adjust))] [--frame-panel-header-py:calc(var(--frame-panel-header-py-base)+var(--frame-panel-header-py-adjust))] [--frame-panel-footer-px:calc(var(--frame-panel-footer-px-base)+var(--frame-panel-footer-px-adjust))] [--frame-panel-footer-py:calc(var(--frame-panel-footer-py-base)+var(--frame-panel-footer-py-adjust))]',
        '[--frame-panel-bg:var(--color-card)] [--frame-panel-border-color:var(--color-border)] [--frame-border-color:var(--color-border)]',
        '[--frame-panel-radius:calc(var(--frame-radius)-var(--frame-px)-1px)]',
    ],
    {
        variants: {
            variant: {
                default: 'border border-[var(--frame-border-color)] bg-clip-padding',
                inverse:
                    '[--frame-panel-bg:color-mix(in_oklch,var(--color-muted)_40%,transparent)] border border-[var(--frame-border-color)] bg-background bg-clip-padding',
                ghost: '[--frame-panel-radius:calc(var(--frame-radius)-var(--frame-px))]',
            },
            spacing: {
                xs: '[--frame-panel-px-base:--spacing(2)] [--frame-panel-py-base:--spacing(2)] [--frame-panel-header-px-base:--spacing(2)] [--frame-panel-header-py-base:--spacing(0.5)] [--frame-panel-footer-px-base:--spacing(2)] [--frame-panel-footer-py-base:--spacing(0.5)]',
                sm: '[--frame-panel-px-base:--spacing(3)] [--frame-panel-py-base:--spacing(3.5)] [--frame-panel-header-px-base:--spacing(3)] [--frame-panel-header-py-base:--spacing(1.5)] [--frame-panel-footer-px-base:--spacing(3)] [--frame-panel-footer-py-base:--spacing(1.5)]',
                default:
                    '[--frame-panel-px-base:--spacing(4)] [--frame-panel-py-base:--spacing(4)] [--frame-panel-header-px-base:--spacing(4)] [--frame-panel-header-py-base:--spacing(2)] [--frame-panel-footer-px-base:--spacing(4)] [--frame-panel-footer-py-base:--spacing(2)]',
                lg: '[--frame-panel-px-base:--spacing(5)] [--frame-panel-py-base:--spacing(5)] [--frame-panel-header-px-base:--spacing(5)] [--frame-panel-header-py-base:--spacing(2.5)] [--frame-panel-footer-px-base:--spacing(5)] [--frame-panel-footer-py-base:--spacing(2.5)]',
            },
            stacked: {
                // "A panel followed by a panel" as "a panel that isn't the last panel" (panels sit next
                // to each other): no :has(+…) for the browser to re-evaluate on every DOM change.
                true: [
                    'gap-0 *:[[data-slot=frame-panel]:not(:nth-last-child(1_of_[data-slot=frame-panel]))]:rounded-b-none',
                    '*:[[data-slot=frame-panel]:not(:nth-last-child(1_of_[data-slot=frame-panel]))]:before:hidden',
                    '*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:rounded-t-none',
                    '*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:border-t-0',
                ],
                false: [
                    'data-[spacing=sm]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-0.5',
                    'data-[spacing=default]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-1',
                    'data-[spacing=lg]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-2',
                ],
            },
            // dense: the first panel overlaps the frame border when it is the first child (a FrameHeader,
            // when present, is the first child), which replaces a :not(:has(header)) rule.
            dense: {
                true: 'p-0 gap-0 border-[var(--frame-border-color)] [--frame-panel-radius:var(--frame-radius)] [&_[data-slot=frame-panel]]:-mx-px [&_[data-slot=frame-panel]]:before:hidden [&_[data-slot=frame-panel]:last-child]:-mb-px [&_[data-slot=frame-panel]:first-child]:-mt-px',
                false: '',
            },
        },
        defaultVariants: { variant: 'default', spacing: 'default', stacked: false, dense: false },
    }
);

function Frame({ className, variant, spacing, stacked, dense, ...props }) {
    return (
        <div
            className={cn(frameVariants({ variant, spacing, stacked, dense }), className)}
            data-slot="frame"
            data-spacing={spacing || 'default'}
            {...props}
        />
    );
}

function FramePanel({ className, fit, ...props }) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-(--frame-panel-radius) border border-(--frame-panel-border-color) bg-(--frame-panel-bg) bg-clip-padding shadow-xs',
                !fit && 'grow',
                'before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--frame-panel-radius)-1px)] before:shadow-black/5',
                'dark:bg-clip-border dark:before:shadow-white/5',
                'px-(--frame-panel-px) py-(--frame-panel-py)',
                className
            )}
            data-slot="frame-panel"
            {...props}
        />
    );
}

function FrameHeader({ className, ...props }) {
    return (
        <header
            className={cn(
                'flex flex-col gap-(--frame-panel-header-gap) px-(--frame-panel-header-px) py-(--frame-panel-header-py)',
                className
            )}
            data-slot="frame-panel-header"
            {...props}
        />
    );
}

function FrameTitle({ className, ...props }) {
    return <div className={cn('text-sm font-semibold', className)} data-slot="frame-panel-title" {...props} />;
}

function FrameDescription({ className, ...props }) {
    return (
        <div
            className={cn('text-sm text-muted-foreground', className)}
            data-slot="frame-panel-description"
            {...props}
        />
    );
}

function FrameFooter({ className, ...props }) {
    return (
        <footer
            className={cn(
                'flex flex-col gap-(--frame-panel-footer-gap) px-(--frame-panel-footer-px) py-(--frame-panel-footer-py)',
                className
            )}
            data-slot="frame-panel-footer"
            {...props}
        />
    );
}

// ---------------------------------------------------------------------------------------------
// Our pieces on top of the Frame.

/**
 * The dashboard chart card: Frame + a header row (title, description or a custom `subtitle` node,
 * `actions` on the right, wrapping under the title on narrow cards) + children (FramePanel
 * sections) + an optional footer row. `panel` (default true) wraps children in one FramePanel;
 * pass false to lay out your own panels. `expanded` renders the card for the expand dialog.
 */
function ChartCard({
    title,
    description,
    subtitle,
    actions,
    footer,
    panel = true,
    panelClassName,
    className,
    children,
    ...props
}) {
    const id = React.useId();
    return (
        <Frame
            className={cn('@container min-w-0', className)}
            stacked={false}
            aria-labelledby={title ? `${id}-t` : undefined}
            role="group"
            {...props}
        >
            {title || actions ? (
                <FrameHeader className="flex-row flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        {title ? <FrameTitle id={`${id}-t`}>{title}</FrameTitle> : null}
                        {subtitle != null ? (
                            subtitle
                        ) : description ? (
                            <FrameDescription>{description}</FrameDescription>
                        ) : null}
                    </div>
                    {actions ? <ChartToolbar>{actions}</ChartToolbar> : null}
                </FrameHeader>
            ) : null}
            {panel ? <FramePanel className={cn('p-0', panelClassName)}>{children}</FramePanel> : children}
            {footer ? (
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {footer}
                </FrameFooter>
            ) : null}
        </Frame>
    );
}

/** A padded section inside a ChartCard panel; sections after the first get a top border. */
function ChartSection({ className, ...props }) {
    return (
        <div
            data-slot="chart-section"
            className={cn('p-4 [[data-slot=chart-section]+&]:border-t', className)}
            {...props}
        />
    );
}

/** Toolbar row: groups and buttons, 8px apart, wrapping on narrow cards. */
function ChartToolbar({ className, ...props }) {
    return <div data-slot="chart-toolbar" className={cn('flex flex-wrap items-center gap-2', className)} {...props} />;
}

/** Joined toolbar buttons (shared borders). */
function ToolbarGroup({ className, ...props }) {
    return <ButtonGroup className={className} {...props} />;
}

/** A 28px outline toolbar button; `icon` renders a square icon button (pass `label` for its name). */
function ToolbarButton({ icon, label, className, children, ...props }) {
    if (icon && !children) {
        return (
            <Button
                variant="outline"
                size="icon-sm"
                aria-label={label}
                title={label}
                className={cn('bg-background', className)}
                {...props}
            >
                {icon}
            </Button>
        );
    }
    return (
        <Button variant="outline" size="sm" className={cn('bg-background', className)} {...props}>
            {icon}
            {children}
        </Button>
    );
}

/**
 * Joined segmented buttons (3D / 2D, Month / Quarter, Time / Distance): the pressed one is filled
 * (background), the others transparent with muted text. Single choice, radio semantics.
 */
function SegmentedControl({ options, value, onValueChange, label, className, size = 'sm' }) {
    const list = (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const refs = React.useRef([]);
    const onKeyDown = (e, i) => {
        const step =
            e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (i + step + list.length) % list.length;
        onValueChange && onValueChange(list[next].value);
        const el = refs.current[next];
        if (el) el.focus();
    };
    return (
        <div
            role="radiogroup"
            aria-label={label}
            data-slot="segmented-control"
            className={cn('flex rounded-lg', className)}
        >
            {list.map((o, i) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        title={o.title}
                        onClick={() => onValueChange && onValueChange(o.value)}
                        onKeyDown={(e) => onKeyDown(e, i)}
                        className={cn(
                            'inline-flex items-center justify-center gap-1 border border-border font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input [&_svg]:size-3.5 [&_svg]:shrink-0',
                            size === 'xs' ? 'h-6 px-1.5 text-xs' : 'h-7 px-2 text-[0.8rem]',
                            'not-first:-ml-px first:rounded-l-lg last:rounded-r-lg',
                            on
                                ? 'bg-background text-foreground dark:bg-input/30'
                                : 'bg-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {o.icon}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * A toolbar menu button that picks one option (period, range, scope): icon + current label (+ an
 * optional muted `count`, e.g. "3 / 3") + chevron. `options`: strings or { value, label, icon }.
 */
function ToolbarSelect({ options, value, onValueChange, icon, label, count, align = 'end', className, menuLabel }) {
    const list = (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const current = list.find((o) => o.value === value) || list[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn('bg-background', className)}
                        aria-label={label ? `${label}: ${current ? current.label : ''}` : undefined}
                    />
                }
            >
                {icon === undefined ? <CalendarIcon /> : icon}
                <span>{current ? current.label : label}</span>
                {count != null ? <span className="font-normal text-muted-foreground">{count}</span> : null}
                <ChevronDownIcon className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-auto min-w-40">
                {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
                <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                    {list.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.icon}
                            {o.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** A toolbar menu that toggles several options on / off (channels, sources): shows "n / total". */
function ToolbarMultiSelect({ options, value, onValueChange, icon, label, align = 'end', className }) {
    const list = (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const on = new Set(value || []);
    const toggle = (v, checked) => {
        const next = list.map((o) => o.value).filter((k) => (k === v ? checked : on.has(k)));
        if (next.length && onValueChange) onValueChange(next);
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" className={cn('bg-background', className)} />}
            >
                {icon}
                <span>{label}</span>
                <span className="font-normal text-muted-foreground tabular-nums">{`${on.size}/${list.length}`}</span>
                <ChevronDownIcon className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-auto min-w-44">
                {list.map((o) => (
                    <DropdownMenuCheckboxItem
                        key={o.value}
                        checked={on.has(o.value)}
                        onCheckedChange={(c) => toggle(o.value, c)}
                        closeOnClick={false}
                    >
                        {o.color ? (
                            <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ background: o.color }}
                                aria-hidden
                            />
                        ) : null}
                        {o.icon}
                        {o.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// --- export helpers ---------------------------------------------------------------------------

function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Rows → CSV text. `columns`: keys, or { key, label, value(row) }; default: the first row's keys.
 */
function rowsToCsv(rows, columns) {
    const list = rows || [];
    const cols = (columns && columns.length ? columns : Object.keys(list[0] || {})).map((c) =>
        typeof c === 'string' ? { key: c, label: c } : { label: c.key, ...c }
    );
    const head = cols.map((c) => csvCell(c.label)).join(',');
    const body = list.map((r) => cols.map((c) => csvCell(c.value ? c.value(r) : r[c.key])).join(','));
    return [head].concat(body).join('\r\n');
}

/** Download text as a file (CSV by default). */
function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 0);
}

/** Copy text to the clipboard; resolves true / false. */
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        try {
            const t = document.createElement('textarea');
            t.value = text;
            t.style.position = 'fixed';
            t.style.opacity = '0';
            document.body.appendChild(t);
            t.select();
            const ok = document.execCommand('copy');
            t.remove();
            return ok;
        } catch (e2) {
            return false;
        }
    }
}

function slug(s) {
    return (
        String(s || 'chart')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'chart'
    );
}

/**
 * The "…" menu: Export CSV (`csv`: { rows, columns, filename }), Copy summary (`summary`: text or
 * () => text), then any extra `items` ({ label, icon, onSelect } | { type: 'separator' }). Each
 * action confirms with a toast.
 */
function ChartMoreMenu({ title, csv, json, summary, items, label = 'More actions', align = 'end', className }) {
    const name = slug(title);
    const doCsv = () => {
        const c = typeof csv === 'function' ? csv() : csv;
        downloadText(c.filename || `${name}.csv`, rowsToCsv(c.rows, c.columns));
        toast.success('CSV downloaded', { description: c.filename || `${name}.csv` });
    };
    const doJson = () => {
        const j = typeof json === 'function' ? json() : json;
        downloadText(j.filename || `${name}.json`, JSON.stringify(j.data, null, 2), 'application/json');
        toast.success('JSON downloaded', { description: j.filename || `${name}.json` });
    };
    const doCopy = async () => {
        const text = typeof summary === 'function' ? summary() : summary;
        const ok = await copyText(text);
        if (ok) toast.success('Summary copied');
        else toast.error('Could not copy to the clipboard');
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={label}
                        title={label}
                        className={cn('bg-background', className)}
                    />
                }
            >
                <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-auto min-w-44">
                {csv ? (
                    <DropdownMenuItem onClick={doCsv}>
                        <DownloadIcon />
                        Export CSV
                    </DropdownMenuItem>
                ) : null}
                {json ? (
                    <DropdownMenuItem onClick={doJson}>
                        <DownloadIcon />
                        Export JSON
                    </DropdownMenuItem>
                ) : null}
                {summary ? (
                    <DropdownMenuItem onClick={doCopy}>
                        <ClipboardIcon />
                        Copy summary
                    </DropdownMenuItem>
                ) : null}
                {(items || []).map((it, i) =>
                    it.type === 'separator' ? (
                        <DropdownMenuSeparator key={`s${i}`} />
                    ) : (
                        <DropdownMenuItem
                            key={it.label}
                            onClick={it.onSelect}
                            variant={it.variant}
                            disabled={it.disabled}
                        >
                            {it.checked != null ? <CheckIcon className={it.checked ? '' : 'invisible'} /> : it.icon}
                            {it.label}
                        </DropdownMenuItem>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** [replayKey, replay]: bump the key on a chart to replay its entry animation (the Refresh button). */
function useReplay() {
    const [key, setKey] = React.useState(0);
    return [key, React.useCallback(() => setKey((k) => k + 1), [])];
}

/** Refresh + expand + more, joined (the right end of most chart toolbars). */
function ChartActions({ onRefresh, onExpand, more, children }) {
    return (
        <ToolbarGroup aria-label="Chart actions">
            {children}
            {onRefresh ? <ToolbarButton icon={<RefreshCwIcon />} label="Refresh" onClick={onRefresh} /> : null}
            {onExpand ? <ToolbarButton icon={<Maximize2Icon />} label="Expand" onClick={onExpand} /> : null}
            {more}
        </ToolbarGroup>
    );
}

/** Renders `children` in a large dialog when `open` (the Expand button). */
function ChartExpandDialog({ open, onOpenChange, title, children }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[min(96vw,1200px)] max-w-none sm:max-w-none p-3">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                {open ? children : null}
            </DialogContent>
        </Dialog>
    );
}

// --- KPI, deltas, legend, footer --------------------------------------------------------------

/** Signed percent text: 6.5 → "+6.5%", -3.4 → "-3.4%"; `signed: false` drops the plus. */
function formatDelta(value, { decimals = 1, signed = true, suffix = '%' } = {}) {
    const n = Number(value);
    if (!isFinite(n)) return '';
    const s = Math.abs(n).toFixed(decimals);
    return `${n < 0 ? '-' : signed && n > 0 ? '+' : ''}${s}${suffix}`;
}

/**
 * Trend delta: an arrow + percent. `variant` pill (tinted chip), plain (coloured text) or muted.
 * `positive` overrides the colour (lower-is-better metrics); default: value >= 0.
 */
function DeltaBadge({ value, positive, variant = 'plain', decimals = 1, signed, className, children }) {
    const n = Number(value);
    const up = n >= 0;
    const good = positive == null ? up : positive;
    const Icon = up ? TrendingUpIcon : TrendingDownIcon;
    return (
        <span
            data-slot="delta-badge"
            className={cn(
                'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                variant === 'pill' && 'rounded-md px-1.25 py-0.5',
                variant === 'pill' &&
                    (good ? 'bg-success/10 text-success-foreground' : 'bg-destructive/10 text-destructive-foreground'),
                variant === 'plain' && (good ? 'text-success' : 'text-destructive'),
                variant === 'muted' && 'text-foreground',
                className
            )}
        >
            <Icon className="size-3" aria-hidden />
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            <span className="[text-box:trim-both_cap_alphabetic]">
                {children != null ? children : formatDelta(n, { decimals, signed: signed === true })}
            </span>
        </span>
    );
}

/**
 * A row of KPI tiles separated by vertical rules (a <dl>), 1 column on narrow cards, then 2, then
 * `columns` (default: the item count). items: { label, value, delta, positive, note, dot, extra }.
 */
function KpiStrip({ items, columns, className }) {
    const n = columns || (items || []).length || 1;
    return (
        <dl
            data-slot="kpi-strip"
            className={cn(
                'grid grid-cols-2 *:even:border-s *:nth-[n+3]:border-t @3xl:*:not-first:border-s @3xl:*:nth-[n+3]:border-t-0',
                n >= 3 && '@3xl:grid-cols-(--kpi-cols)',
                className
            )}
            style={{ '--kpi-cols': `repeat(${n}, minmax(0, 1fr))` }}
        >
            {(items || []).map((it) => (
                <KpiStat key={typeof it.label === 'string' ? it.label : undefined} {...it} />
            ))}
        </dl>
    );
}

/** One KPI: muted label, 24px semibold value, then delta pill + muted note (or a coloured dot + note). */
function KpiStat({ label, value, delta, positive, note, dot, extra, className }) {
    return (
        <div
            data-slot="kpi-stat"
            className={cn('flex min-w-0 flex-col gap-2 px-(--frame-panel-px) py-(--frame-panel-py)', className)}
        >
            <dt className="truncate text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-2">
                <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
                {delta != null || note || dot ? (
                    <span className="flex h-6 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        {delta != null ? <DeltaBadge value={delta} positive={positive} variant="pill" /> : null}
                        {dot ? (
                            <span className="size-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
                        ) : null}
                        {note ? (
                            <span className="overflow-x-clip text-ellipsis whitespace-nowrap [text-box:trim-both_cap_alphabetic]">
                                {note}
                            </span>
                        ) : null}
                    </span>
                ) : null}
                {extra}
            </dd>
        </div>
    );
}

/** Status dot colours for the footer / legends. */
const DOT_TONES = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    info: 'bg-info',
    muted: 'bg-muted-foreground/40',
};

/** A small round dot: `tone` (success / warning / danger / info / muted) or `color` (CSS). */
function Dot({ tone, color, size = 6, className }) {
    return (
        <span
            aria-hidden
            className={cn('inline-block shrink-0 rounded-full', tone ? DOT_TONES[tone] : '', className)}
            style={{ width: size, height: size, background: color }}
        />
    );
}

/**
 * Footer meta: items joined by 4px muted dots on the left ({ label, dot: tone, color }), `end` on
 * the right. Render inside ChartCard's `footer`.
 */
function FooterMeta({ items, end }) {
    return (
        <>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
                {(items || []).filter(Boolean).map((it, i) => (
                    <React.Fragment key={i}>
                        {i > 0 ? <Dot tone="muted" size={4} /> : null}
                        <span className="inline-flex items-center gap-2">
                            {it.dot || it.color ? <Dot tone={it.dot} color={it.color} /> : null}
                            <span>{it.label}</span>
                        </span>
                    </React.Fragment>
                ))}
            </span>
            {end != null ? <span className="flex items-center gap-2">{end}</span> : null}
        </>
    );
}

/**
 * Inline legend: dot / line / dashed swatch + label (+ bold value). `onToggle(key)` makes items
 * buttons (aria-pressed) that hide / show a series; hidden items are dimmed.
 */
function LegendList({ items, onToggle, hidden, className, swatch = 'dot', chip = false }) {
    const off = new Set(hidden || []);
    return (
        <ul data-slot="legend-list" className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs', className)}>
            {(items || []).map((it) => {
                const isOff = off.has(it.key);
                const kind = it.swatch || swatch;
                const sw =
                    kind === 'line' || kind === 'dashed' ? (
                        <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden className="shrink-0">
                            <line
                                x1="1"
                                y1="4"
                                x2="17"
                                y2="4"
                                stroke={it.color}
                                strokeWidth="1.5"
                                strokeDasharray={kind === 'dashed' ? '3 2' : undefined}
                                strokeLinecap="round"
                            />
                            {it.marker ? <circle cx="9" cy="4" r="2" fill={it.color} /> : null}
                        </svg>
                    ) : kind === 'square' ? (
                        <span
                            className="size-2.5 shrink-0 rounded-[3px]"
                            style={{ background: it.color }}
                            aria-hidden
                        />
                    ) : (
                        <Dot color={it.color} size={8} />
                    );
                const body = (
                    <>
                        {sw}
                        <span className={cn(chip ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                            {it.label}
                        </span>
                        {it.value != null ? (
                            <span
                                className={cn(
                                    'tabular-nums',
                                    chip ? 'text-muted-foreground' : 'font-semibold text-foreground'
                                )}
                            >
                                {it.value}
                            </span>
                        ) : null}
                    </>
                );
                const base = cn(
                    'inline-flex items-center gap-1.5',
                    chip &&
                        'h-7 rounded-lg border bg-background px-2.5 text-[0.8rem] dark:border-input dark:bg-input/30',
                    isOff && 'opacity-40'
                );
                return (
                    <li key={it.key || it.label}>
                        {onToggle ? (
                            <button
                                type="button"
                                aria-pressed={!isOff}
                                onClick={() => onToggle(it.key)}
                                className={cn(
                                    base,
                                    'rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
                                )}
                            >
                                {body}
                            </button>
                        ) : (
                            <span className={base}>{body}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/** The card's tooltip surface (for custom Recharts tooltips that match ChartTooltipContent). */
function ChartTooltipPanel({ className, ...props }) {
    return (
        <div
            data-slot="chart-tooltip-panel"
            className={cn(
                'grid min-w-32 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
                className
            )}
            {...props}
        />
    );
}

/** One tooltip row: swatch, label, value (right-aligned, tabular). */
function ChartTooltipRow({ color, label, value, swatch = 'dot', muted, className }) {
    return (
        <div className={cn('flex items-center gap-2', muted && 'text-muted-foreground', className)}>
            {color ? (
                swatch === 'line' ? (
                    <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                ) : (
                    <span className="size-2 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden />
                )
            ) : null}
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto pl-3 font-mono font-medium text-foreground tabular-nums">{value}</span>
        </div>
    );
}

export {
    Frame,
    FramePanel,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FrameFooter,
    frameVariants,
    ChartCard,
    ChartSection,
    ChartToolbar,
    ToolbarGroup,
    ToolbarButton,
    SegmentedControl,
    ToolbarSelect,
    ToolbarMultiSelect,
    ChartMoreMenu,
    ChartActions,
    ChartExpandDialog,
    useReplay,
    rowsToCsv,
    downloadText,
    copyText,
    formatDelta,
    DeltaBadge,
    KpiStrip,
    KpiStat,
    Dot,
    DOT_TONES,
    FooterMeta,
    LegendList,
    ChartTooltipPanel,
    ChartTooltipRow,
};
