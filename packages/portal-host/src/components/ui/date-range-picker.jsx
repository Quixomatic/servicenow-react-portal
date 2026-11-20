import * as React from 'react';
import { CalendarRangeIcon, XIcon } from 'lucide-react';
import { cn } from 'cn';
import { Calendar, parseYmd, toYmd } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

// components:date-range-picker: pick a start and an end day on components:calendar, with
// presets (Next Experience's now-date-range-picker). Pure UI: 'YYYY-MM-DD' strings, no time
// zones, no glide values (app/date-range-field binds it to a record's two date fields).
//
//   const [range, setRange] = useState({ start: '', end: '' });
//   <DateRangePicker value={range} onChange={setRange} presets={defaultRangePresets()} />
//   <DateRangeCalendar value={range} onChange={setRange} />      the panel without a trigger
//
// Picking: the first click sets the start, the second the end (an earlier day swaps them);
// hovering or focusing previews the range. Presets are buttons beside the calendar
// ([{ label, range: () => ({ start, end }) }]). Keyboard: the calendar's date-grid keys;
// Escape closes the popover and focus returns to the trigger.

/** A range with start <= end; '' for missing ends. */
function normalizeRange(range) {
    const start = (range && range.start) || '';
    const end = (range && range.end) || '';
    if (start && end && start > end) return { start: end, end: start };
    return { start, end };
}

function todayYmd() {
    const d = new Date();
    return toYmd(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function shift(ymd, days) {
    return toYmd(parseYmd(ymd) + days * 86400000);
}

/**
 * Common presets relative to `today` ('YYYY-MM-DD', default the local today): Today, Yesterday,
 * Last 7 days, Last 30 days, This month, Last month, This year.
 */
function defaultRangePresets(today) {
    const t = today || todayYmd();
    const y = +t.slice(0, 4);
    const m = +t.slice(5, 7);
    const pad = (n) => String(n).padStart(2, '0');
    const monthEnd = (yy, mm) => toYmd(Date.UTC(yy, mm, 0));
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;
    return [
        { key: 'today', label: 'Today', range: () => ({ start: t, end: t }) },
        { key: 'yesterday', label: 'Yesterday', range: () => ({ start: shift(t, -1), end: shift(t, -1) }) },
        { key: 'last7', label: 'Last 7 days', range: () => ({ start: shift(t, -6), end: t }) },
        { key: 'last30', label: 'Last 30 days', range: () => ({ start: shift(t, -29), end: t }) },
        { key: 'thisMonth', label: 'This month', range: () => ({ start: `${y}-${pad(m)}-01`, end: monthEnd(y, m) }) },
        {
            key: 'lastMonth',
            label: 'Last month',
            range: () => ({ start: `${prevY}-${pad(prevM)}-01`, end: monthEnd(prevY, prevM) }),
        },
        { key: 'thisYear', label: 'This year', range: () => ({ start: `${y}-01-01`, end: `${y}-12-31` }) },
    ];
}

/** 'Nov 1 – 20, 2026' style text (Intl formatRange), '' when empty. */
function formatRange(range, locale, options) {
    const r = normalizeRange(range);
    if (!r.start && !r.end) return '';
    const fmt = new Intl.DateTimeFormat(locale || undefined, {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(options || {}),
    });
    const a = r.start ? new Date(parseYmd(r.start)) : null;
    const b = r.end ? new Date(parseYmd(r.end)) : null;
    if (a && b && typeof fmt.formatRange === 'function') return fmt.formatRange(a, b);
    if (a && b) return `${fmt.format(a)} – ${fmt.format(b)}`;
    return a ? `${fmt.format(a)} – …` : `… – ${fmt.format(b)}`;
}

/** Number of days in the range, inclusive (0 when incomplete). */
function rangeLength(range) {
    const r = normalizeRange(range);
    if (!r.start || !r.end) return 0;
    return Math.round((parseYmd(r.end) - parseYmd(r.start)) / 86400000) + 1;
}

/**
 * The picker panel: presets + calendar. Props: value, onChange(range), onComplete(range) (both
 * ends picked), presets, min, max, isDisabled, locale, weekStartsOn, autoFocus.
 */
function DateRangeCalendar({
    className,
    value,
    onChange,
    onComplete,
    presets,
    min,
    max,
    isDisabled,
    locale,
    weekStartsOn,
    autoFocus,
    footer,
}) {
    const r = normalizeRange(value);
    const [hover, setHover] = React.useState('');
    // Picking the end once a start exists; a complete range starts over.
    const picking = !!r.start && !r.end;
    const pick = (ymd) => {
        if (!picking) {
            onChange && onChange({ start: ymd, end: '' });
            return;
        }
        const next = normalizeRange({ start: r.start, end: ymd });
        onChange && onChange(next);
        onComplete && onComplete(next);
    };
    const presetActive = (p) => {
        const pr = normalizeRange(p.range());
        return pr.start === r.start && pr.end === r.end;
    };
    return (
        <div data-slot="date-range-calendar" className={cn('flex flex-col gap-3 sm:flex-row', className)}>
            {presets && presets.length ? (
                <div
                    role="group"
                    aria-label="Presets"
                    className="flex flex-wrap gap-1 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-r sm:border-border sm:pr-3"
                >
                    {presets.map((p) => {
                        const active = presetActive(p);
                        return (
                            <button
                                key={p.key || p.label}
                                type="button"
                                aria-pressed={active}
                                onClick={() => {
                                    const next = normalizeRange(p.range());
                                    onChange && onChange(next);
                                    onComplete && onComplete(next);
                                }}
                                className={cn(
                                    'rounded-md px-2 py-1 text-left text-sm whitespace-nowrap outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                    active && 'bg-accent font-medium text-accent-foreground'
                                )}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            ) : null}
            <Calendar
                value=""
                rangeStart={r.start}
                rangeEnd={picking ? hover || '' : r.end}
                onDayHover={picking ? setHover : undefined}
                onSelect={pick}
                min={min}
                max={max}
                isDisabled={isDisabled}
                locale={locale}
                weekStartsOn={weekStartsOn}
                autoFocus={autoFocus}
                defaultMonth={r.start ? r.start.slice(0, 7) : undefined}
                footer={
                    footer || (
                        <span className="text-xs text-muted-foreground" aria-live="polite">
                            {picking ? 'Pick the end date' : r.start ? `${rangeLength(r)} days` : 'Pick the start date'}
                        </span>
                    )
                }
            />
        </div>
    );
}

/**
 * DateRangePicker props: value ({ start, end }), onChange(range), presets, placeholder
 * ('Pick a date range'), clearable (true), disabled, invalid, locale, min, max, isDisabled,
 * weekStartsOn, align, id, aria-label / aria-labelledby / aria-describedby (on the trigger),
 * formatOptions (Intl options for the trigger text), className.
 */
function DateRangePicker({
    className,
    value,
    onChange,
    presets,
    placeholder = 'Pick a date range',
    clearable = true,
    disabled = false,
    invalid = false,
    locale,
    min,
    max,
    isDisabled,
    weekStartsOn,
    align = 'start',
    formatOptions,
    id,
    ...aria
}) {
    const [open, setOpen] = React.useState(false);
    const r = normalizeRange(value);
    const text = formatRange(r, locale, formatOptions);
    const empty = !r.start && !r.end;
    return (
        <div data-slot="date-range-picker" className={cn('relative inline-flex w-full max-w-sm', className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    id={id}
                    disabled={disabled}
                    aria-invalid={invalid || undefined}
                    {...aria}
                    render={
                        <button
                            type="button"
                            className={cn(
                                'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30',
                                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                                'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
                                clearable && !empty && 'pr-9'
                            )}
                        />
                    }
                >
                    <CalendarRangeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className={cn('min-w-0 flex-1 truncate', empty && 'text-muted-foreground')}>
                        {empty ? placeholder : text}
                    </span>
                </PopoverTrigger>
                <PopoverContent align={align} className="w-auto max-w-[calc(100vw-1rem)] p-3">
                    <DateRangeCalendar
                        value={r}
                        onChange={onChange}
                        onComplete={() => setOpen(false)}
                        presets={presets}
                        min={min}
                        max={max}
                        isDisabled={isDisabled}
                        locale={locale}
                        weekStartsOn={weekStartsOn}
                        autoFocus
                    />
                </PopoverContent>
            </Popover>
            {clearable && !empty && !disabled ? (
                <button
                    type="button"
                    aria-label="Clear date range"
                    onClick={() => onChange && onChange({ start: '', end: '' })}
                    className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <XIcon className="size-3.5" aria-hidden="true" />
                </button>
            ) : null}
        </div>
    );
}

export { DateRangePicker, DateRangeCalendar, defaultRangePresets, formatRange, normalizeRange, rangeLength };
