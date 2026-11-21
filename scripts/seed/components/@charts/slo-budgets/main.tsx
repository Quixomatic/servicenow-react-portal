import { Fragment, useId, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure, ChartDataTable } from 'components:chart';
import { Frame, FramePanel, FrameHeader, FrameTitle, FrameDescription, ChartMoreMenu } from 'components:chart-frame';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from 'components:dropdown-menu';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from 'components:dialog';
import { FrameIconTile } from 'components:charts/sparkline-kit';
import { SAMPLE } from './data';
import type { SloBudgetsData, SloRow, SloService } from './data';

/**
 * components:charts/slo-budgets: an SLO error-budget list.
 * - Each row: name, service + objective, a diverging lollipop pin on a -50% … 100% budget track (zero and
 *   25% at-risk ticks), the budget left / over, and a 28-day dot sparkline with a hover card (rolling
 *   budget, 7 days ago, lowest, counted events).
 * - Header: All / Needs attention filter, a sort select (budget left, name, objective), a New SLO dialog
 *   (name, service, indicator, objective, rolling window, with a live budget estimate) and a more menu
 *   (copy summary, CSV / JSON, view as table).
 *
 *   <SloBudgets />              sample data
 *   <SloBudgets data={...} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type SloBudgetsProps = {
    title?: string;
    data?: SloBudgetsData;
    className?: string;
};

type Sort = 'budget' | 'name' | 'objective';

const SORTS: { value: Sort; label: string }[] = [
    { value: 'budget', label: 'Budget left' },
    { value: 'name', label: 'Name' },
    { value: 'objective', label: 'Objective' },
];

const OBJECTIVES = [0.99, 0.995, 0.999, 0.9995, 0.9999];
const WINDOWS = [7, 28, 30];

const TONE_VAR: Record<string, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    destructive: 'var(--destructive)',
};

const VALUE_TEXT: Record<string, string> = {
    success: 'text-foreground',
    warning: 'text-warning-foreground dark:text-warning',
    destructive: 'text-destructive',
};

function toneOf(left: number): string {
    if (left < 0) return 'destructive';
    if (left < 0.25) return 'warning';
    return 'success';
}

function pct(v: number): string {
    return `${Math.round(v * 100)}%`;
}

/** Signed budget for the hover card: one decimal under 10%, whole percent otherwise. */
function budgetPct(v: number): string {
    const p = v * 100;
    if (Math.abs(p) < 10 && Math.round(p) !== p) return `${p.toFixed(1)}%`;
    return `${Math.round(p)}%`;
}

function objectiveText(o: number): string {
    return `${parseFloat((o * 100).toFixed(2))}%`;
}

function dayLabel(data: SloBudgetsData, i: number, n: number): string {
    return `${data.today.month} ${data.today.day - (n - 1 - i)}`;
}

/** Track position (0..1) of a budget on the -50% … 100% scale. */
function trackPos(v: number): number {
    return Math.max(0, Math.min(1, (v + 0.5) / 1.5));
}

/** The diverging lollipop: track, zero tick, 25% warning tick, masked stem and the tone dot. */
function BudgetPin({ left, maskId }: { left: number; maskId: string }) {
    const zero = `${trackPos(0) * 100}%`;
    const at = `${trackPos(left) * 100}%`;
    const tone = toneOf(left);
    return (
        <svg width="100%" className="block h-4 w-20 shrink-0 overflow-visible" aria-hidden="true">
            <line
                x1="0"
                x2="100%"
                y1="50%"
                y2="50%"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.12}
                strokeWidth={2}
                strokeLinecap="round"
            />
            <svg x={zero} y="50%" overflow="visible">
                <line y1={-5} y2={5} stroke="var(--foreground)" strokeOpacity={0.3} strokeWidth={1.25} />
            </svg>
            <svg x={`${trackPos(0.25) * 100}%`} y="50%" overflow="visible">
                <line y1={-3} y2={3} stroke="var(--warning)" strokeOpacity={1} strokeWidth={1.25} />
            </svg>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                <rect x="-50%" y="-50%" width="200%" height="200%" fill="white" />
                <circle cx={at} cy="50%" r={6} fill="black" />
            </mask>
            <line
                x1={zero}
                x2={at}
                y1="50%"
                y2="50%"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.4}
                strokeWidth={2}
                mask={`url(#${maskId})`}
            />
            <g className="origin-center transition-transform duration-150 [transform-box:fill-box] group-hover/item:scale-125 group-focus-visible/item:scale-125 motion-reduce:transition-none">
                <circle
                    cx={at}
                    cy="50%"
                    r={4}
                    fill={TONE_VAR[tone]}
                    stroke="var(--card)"
                    strokeWidth={2}
                    paintOrder="stroke"
                />
            </g>
        </svg>
    );
}

/** History y: 0 at 17.5; 0 … 100% over 14.5px up, 0 … -70% over 10.5px down. */
function histY(v: number): number {
    const c = Math.max(-0.7, Math.min(1, v));
    return c >= 0 ? 17.5 - c * 14.5 : 17.5 - c * 15;
}

/** The 96 × 28 dot sparkline of daily budget left; the last point is a tone pin from the zero line. */
function HistoryDots({ history, left }: { history: number[]; left: number }) {
    const n = history.length;
    const step = n > 1 ? 92 / (n - 1) : 0;
    const lastY = histY(history[n - 1]);
    const d = lastY - 17.5;
    const stem = Math.abs(d) - 4.25 > 1 ? (d > 0 ? lastY - 4.25 : lastY + 4.25) : null;
    return (
        <svg aria-hidden="true" width="96" height="28" viewBox="0 0 96 28" className="block overflow-visible">
            <line x1="0" x2="96" y1="17.5" y2="17.5" stroke="var(--border)" strokeWidth={1} />
            {history.slice(0, n - 1).map((v, i) => (
                <circle
                    key={i}
                    cx={2 + i * step}
                    cy={histY(v)}
                    r={1.5}
                    fill={v < 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}
                    fillOpacity={v < 0 ? 0.7 : 0.35 + (i * 0.4) / Math.max(1, n - 2)}
                />
            ))}
            {stem != null ? (
                <line
                    x1={94}
                    x2={94}
                    y1={17.5}
                    y2={stem}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.45}
                    strokeWidth={1.25}
                />
            ) : null}
            <circle
                cx={94}
                cy={lastY}
                r={2.75}
                fill={TONE_VAR[toneOf(left)]}
                stroke="var(--card)"
                strokeWidth={1.5}
                paintOrder="stroke"
            />
        </svg>
    );
}

function HistoryCard({ row, data }: { row: SloRow; data: SloBudgetsData }) {
    const n = row.history.length;
    const week = row.history[Math.max(0, n - 8)];
    let lowI = 0;
    row.history.forEach((v, i) => {
        if (v <= row.history[lowI]) lowI = i;
    });
    const delta = Math.round((row.left - week) * 100);
    const state = row.left < 0 ? `${pct(-row.left)} over budget` : `${pct(row.left)} left`;
    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                delay={150}
                closeDelay={80}
                render={
                    <button
                        type="button"
                        aria-label={`Rolling budget ${state}, ${delta > 0 ? '+' : ''}${delta} pts over 7 days`}
                        className="flex rounded-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring/50"
                    />
                }
            >
                <span aria-hidden="true" className="flex h-7 w-24">
                    <HistoryDots history={row.history} left={row.left} />
                </span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-56 gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">Rolling Budget</span>
                    <span
                        className={`shrink-0 font-semibold whitespace-nowrap tabular-nums ${VALUE_TEXT[toneOf(row.left)]}`}
                    >
                        {pct(row.left)}
                    </span>
                </div>
                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                <dl className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-muted-foreground">7 days ago</dt>
                        <dd className="flex min-w-0 justify-end text-right tabular-nums">{budgetPct(week)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-muted-foreground">Lowest</dt>
                        <dd className="flex min-w-0 justify-end text-right tabular-nums">
                            {pct(row.history[lowI])} on {dayLabel(data, lowI, n)}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-muted-foreground">Counted events</dt>
                        <dd className="flex min-w-0 justify-end text-right tabular-nums">{row.events}</dd>
                    </div>
                </dl>
            </PopoverContent>
        </Popover>
    );
}

function SloItem({ row, data, service }: { row: SloRow; data: SloBudgetsData; service?: SloService }) {
    const maskId = `rp-slob-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const tone = toneOf(row.left);
    return (
        <div
            role="listitem"
            data-slot="item"
            className="group/item flex w-full flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 transition-colors duration-100 outline-none"
        >
            <div className="flex min-w-0 flex-1 basis-full flex-col gap-0.5 @lg/slos:basis-0">
                <div className="flex w-fit max-w-full min-w-0 items-center text-sm leading-snug font-medium">
                    <span className="min-w-0 truncate">{row.name}</span>
                </div>
                <p className="line-clamp-2 text-xs font-normal text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex min-w-0 items-center gap-1 [&_svg]:size-3">
                            <span className="flex shrink-0 text-muted-foreground">
                                <Icon name={service ? service.icon : 'server'} aria-hidden="true" />
                            </span>
                            <span className="truncate">{row.service}</span>
                        </span>
                        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="shrink-0 tabular-nums">
                            {objectiveText(row.objective)} over {row.window}d
                        </span>
                    </span>
                </p>
            </div>
            <div className="flex w-full items-center justify-between gap-4 @lg/slos:w-auto">
                <div className="w-40">
                    <div className="flex items-center gap-3">
                        <BudgetPin left={row.left} maskId={maskId} />
                        <span className="flex items-baseline gap-1 tabular-nums">
                            <span className={`text-sm font-medium ${VALUE_TEXT[tone]}`}>{pct(Math.abs(row.left))}</span>
                            <span className="text-xs text-muted-foreground">{row.left < 0 ? 'over' : 'left'}</span>
                        </span>
                    </div>
                </div>
                <HistoryCard row={row} data={data} />
            </div>
        </div>
    );
}

/** A DropdownMenu styled as a select trigger (no host select): icon + label + chevron, radio items. */
function SelectMenu({
    id,
    value,
    options,
    onChange,
    icon,
    label,
    className = '',
    size = 'sm',
}: {
    id?: string;
    value: string;
    options: { value: string; label: string; icon?: string }[];
    onChange: (v: string) => void;
    icon?: string;
    label?: string;
    className?: string;
    size?: 'sm' | 'default';
}) {
    const current = options.find((o) => o.value === value) || options[0];
    const ic = current && current.icon ? current.icon : icon;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        size={size}
                        aria-label={label ? `${label}: ${current ? current.label : ''}` : undefined}
                        className={`justify-between bg-background font-normal ${className}`}
                    />
                }
            >
                <span className="flex min-w-0 items-center gap-2">
                    {ic ? (
                        <span
                            className={`flex shrink-0 text-muted-foreground ${size === 'sm' ? '[&_svg]:size-3.5' : '[&_svg]:size-4'}`}
                        >
                            <Icon name={ic} aria-hidden="true" />
                        </span>
                    ) : null}
                    <span className="truncate">{current ? current.label : ''}</span>
                </span>
                <Icon name="chevron-down" className="text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-(--anchor-width) min-w-36">
                <DropdownMenuRadioGroup value={value} onValueChange={(v: string) => onChange(v)}>
                    {options.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.icon ? <Icon name={o.icon} aria-hidden="true" /> : null}
                            {o.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function duration(minutes: number): string {
    const total = Math.round(minutes * 60);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
}

function compactCount(n: number): string {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return `${Math.round(n)}`;
}

/** Backfill estimate: stricter objectives spend more of the same 90-day error history. */
function backfill(objective: number, service: string): number {
    const base = service === 'payments-api' ? 0.15 : service === 'notifications' ? 0.22 : 0.18;
    return Math.max(-0.5, Math.min(1, 1 - (base * 0.001) / (1 - objective)));
}

const INPUT =
    'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30';

const SEG_ITEM = 'flex-1 tabular-nums data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted';

function NewSloDialog({ data, onCreate }: { data: SloBudgetsData; onCreate: (row: SloRow) => void }) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [touched, setTouched] = useState(false);
    const [service, setService] = useState(data.services[0] ? data.services[0].id : '');
    const [indicator, setIndicator] = useState(data.indicators[0] ? data.indicators[0].id : '');
    const [objective, setObjective] = useState('0.999');
    const [win, setWin] = useState('28');
    const obj = Number(objective);
    const days = Number(win);
    const svc = data.services.find((s) => s.id === service);
    const outage = days * 24 * 60 * (1 - obj);
    const failing = (svc ? svc.perDay : 0) * days * (1 - obj);
    const est = backfill(obj, service);
    const invalid = touched && !name.trim();
    const objToggle = useSingleToggle(objective, setObjective);
    const winToggle = useSingleToggle(win, setWin);

    const reset = () => {
        setName('');
        setTouched(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o: boolean) => {
                setOpen(o);
                if (!o) reset();
            }}
        >
            <DialogTrigger render={<Button size="sm" />}>
                <Icon name="plus" aria-hidden="true" />
                New SLO
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <form
                    noValidate
                    className="flex flex-col gap-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setTouched(true);
                        if (!name.trim()) return;
                        const history: number[] = [];
                        for (let i = 0; i < 28; i++) history.push(est);
                        onCreate({
                            id: `new-${Date.now()}`,
                            name: name.trim(),
                            service,
                            objective: obj,
                            window: days,
                            left: est,
                            history,
                            events: 0,
                        });
                        toast.success('SLO created', {
                            description: `${name.trim()} · ${objectiveText(obj)} over ${days}d`,
                        });
                        setOpen(false);
                        reset();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>New SLO</DialogTitle>
                        <DialogDescription>Budget backfills from 90 days of metrics.</DialogDescription>
                    </DialogHeader>
                    <div className="flex w-full flex-col gap-5">
                        <div role="group" className="flex w-full flex-col gap-2">
                            <label
                                htmlFor={`${uid}-name`}
                                className="flex w-fit items-center text-sm font-medium select-none"
                            >
                                Name
                            </label>
                            <input
                                id={`${uid}-name`}
                                required
                                placeholder="Checkout API availability"
                                autoComplete="off"
                                className={INPUT}
                                value={name}
                                aria-invalid={invalid || undefined}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={() => setTouched(true)}
                            />
                            {invalid ? <p className="text-sm text-destructive">Give the SLO a name.</p> : null}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div role="group" className="flex w-full flex-col gap-2">
                                <label
                                    htmlFor={`${uid}-service`}
                                    className="flex w-fit text-sm font-medium select-none"
                                >
                                    Service
                                </label>
                                <SelectMenu
                                    id={`${uid}-service`}
                                    size="default"
                                    className="w-full"
                                    value={service}
                                    onChange={setService}
                                    options={data.services.map((s) => ({
                                        value: s.id,
                                        label: s.id,
                                        icon: s.icon,
                                    }))}
                                />
                            </div>
                            <div role="group" className="flex w-full flex-col gap-2">
                                <label htmlFor={`${uid}-sli`} className="flex w-fit text-sm font-medium select-none">
                                    Indicator
                                </label>
                                <SelectMenu
                                    id={`${uid}-sli`}
                                    size="default"
                                    className="w-full"
                                    value={indicator}
                                    onChange={setIndicator}
                                    options={data.indicators.map((s) => ({
                                        value: s.id,
                                        label: s.label,
                                        icon: s.icon,
                                    }))}
                                />
                            </div>
                        </div>
                        <div role="group" aria-labelledby={`${uid}-obj`} className="flex w-full flex-col gap-2">
                            <span id={`${uid}-obj`} className="flex w-fit text-sm font-medium select-none">
                                Objective
                            </span>
                            <ToggleGroup variant="outline" size="sm" className="w-full" {...objToggle}>
                                {OBJECTIVES.map((o) => (
                                    <ToggleGroupItem key={o} value={String(o)} className={SEG_ITEM}>
                                        {objectiveText(o)}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                        <div role="group" aria-labelledby={`${uid}-win`} className="flex w-full flex-col gap-2">
                            <span id={`${uid}-win`} className="flex w-fit text-sm font-medium select-none">
                                Rolling Window
                            </span>
                            <ToggleGroup variant="outline" size="sm" className="w-full" {...winToggle}>
                                {WINDOWS.map((w) => (
                                    <ToggleGroupItem key={w} value={String(w)} className={SEG_ITEM}>
                                        {w} days
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                        <p className="text-sm leading-relaxed text-pretty text-muted-foreground" aria-live="polite">
                            Allows <span className="font-medium text-foreground tabular-nums">{duration(outage)}</span>{' '}
                            of full outage, or about{' '}
                            <span className="font-medium text-foreground tabular-nums">
                                {compactCount(failing)} requests
                            </span>{' '}
                            failing, every {days} days. Backfill estimate:{' '}
                            <span className={`font-medium tabular-nums ${VALUE_TEXT[toneOf(est)]}`}>
                                {est < 0 ? `${pct(-est)} over` : `${pct(est)} left`}
                            </span>
                            .
                        </p>
                    </div>
                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                        <Button type="submit">Create SLO</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function SloBudgets({ title = 'Objectives', data = SAMPLE, className }: SloBudgetsProps) {
    const [extra, setExtra] = useState<SloRow[]>([]);
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState<Sort>('budget');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const all = data.slos.concat(extra);
    const attention = all.filter((s) => s.left < 0.25);
    const shown = (filter === 'attention' ? attention : all).slice().sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'objective') return b.objective - a.objective || a.left - b.left;
        return a.left - b.left;
    });
    const filterToggle = useSingleToggle(filter, setFilter);
    const summary = `${all.length} SLOs, ${attention.length} need attention. ${all
        .slice()
        .sort((a, b) => a.left - b.left)
        .map((s) => `${s.name}: ${s.left < 0 ? `${pct(-s.left)} over budget` : `${pct(s.left)} left`}`)
        .join('; ')}.`;
    const tableRows = shown.map((s) => ({
        name: s.name,
        service: s.service,
        objective: objectiveText(s.objective),
        window: `${s.window}d`,
        budget: s.left < 0 ? `${pct(-s.left)} over` : `${pct(s.left)} left`,
        events: s.events,
    }));

    return (
        <Frame dense className={`w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="@container/head flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 grow basis-48 items-center gap-3">
                    <FrameIconTile icon="list-checks" />
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle className="truncate" role="heading" aria-level={3}>
                            {title}
                        </FrameTitle>
                        <FrameDescription className="truncate">
                            <span className="flex min-w-0 items-center gap-1.5 tabular-nums">
                                <span className="shrink-0">
                                    {filter === 'attention'
                                        ? `${shown.length} of ${all.length} SLOs`
                                        : `${all.length} SLOs`}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
                                />
                                <span className="truncate">
                                    {filter === 'attention' ? 'At risk or over' : `${attention.length} need attention`}
                                </span>
                            </span>
                        </FrameDescription>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 @max-lg/head:w-full">
                    <ToggleGroup
                        variant="outline"
                        size="sm"
                        aria-label="Filter SLOs"
                        className="@max-lg/head:w-full"
                        {...filterToggle}
                    >
                        <ToggleGroupItem
                            value="all"
                            className="gap-1.5 text-[0.8rem] data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted @max-lg/head:flex-1"
                        >
                            <span className="[text-box:trim-both_cap_alphabetic]">All</span>
                            <span className="text-muted-foreground tabular-nums [text-box:trim-both_cap_alphabetic]">
                                {all.length}
                            </span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="attention"
                            className="gap-1.5 text-[0.8rem] data-pressed:bg-card data-pressed:text-foreground dark:data-pressed:bg-muted @max-lg/head:flex-1"
                        >
                            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
                            <span className="[text-box:trim-both_cap_alphabetic]">Needs attention</span>
                            <span className="text-muted-foreground tabular-nums [text-box:trim-both_cap_alphabetic]">
                                {attention.length}
                            </span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <div className="flex min-w-0 items-center gap-2 @max-lg/head:w-full">
                        <SelectMenu
                            value={sort}
                            onChange={(v) => setSort(v as Sort)}
                            options={SORTS}
                            icon="arrow-up-down"
                            label="Sort SLOs"
                            className="w-36 text-sm @max-lg/head:flex-1"
                        />
                        <NewSloDialog data={data} onCreate={(row) => setExtra((x) => x.concat([row]))} />
                        <ChartMoreMenu
                            title={title}
                            className="border-transparent bg-transparent shadow-none hover:bg-muted"
                            summary={() => summary}
                            csv={() => ({ rows: tableRows })}
                            json={() => ({ data: shown })}
                            items={[
                                { type: 'separator' },
                                {
                                    label: view === 'table' ? 'View as list' : 'View as table',
                                    icon: <Icon name={view === 'table' ? 'list' : 'table'} />,
                                    onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                },
                            ]}
                        />
                    </div>
                </div>
            </FrameHeader>
            <FramePanel className="@container/slos p-0">
                <ChartFigure
                    title={`${title}: error budget left by SLO`}
                    summary={summary}
                    view={view}
                    table={
                        <ChartDataTable
                            data={tableRows}
                            index="name"
                            indexLabel="SLO"
                            series={[
                                { key: 'service', label: 'Service' },
                                { key: 'objective', label: 'Objective' },
                                { key: 'window', label: 'Window' },
                                { key: 'budget', label: 'Budget' },
                                { key: 'events', label: 'Events' },
                            ]}
                            caption={title}
                        />
                    }
                >
                    <div role="list" data-slot="item-group" className="flex w-full flex-col gap-0">
                        {shown.map((row, i) => (
                            <Fragment key={row.id}>
                                {i > 0 ? (
                                    <div role="separator" className="my-0 h-px w-full shrink-0 bg-border" />
                                ) : null}
                                <SloItem
                                    row={row}
                                    data={data}
                                    service={data.services.find((s) => s.id === row.service)}
                                />
                            </Fragment>
                        ))}
                        {!shown.length ? (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No SLOs to show.</div>
                        ) : null}
                    </div>
                </ChartFigure>
            </FramePanel>
        </Frame>
    );
}

export default SloBudgets;
