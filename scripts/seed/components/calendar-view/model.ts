/**
 * app/calendar-view model: ranges, the record query, events from list rows, and the overlap layout.
 * No UI. Days are 'YYYY-MM-DD' in the user's ServiceNow time zone; instants are epoch ms; glide
 * date-time values are UTC ('YYYY-MM-DD HH:mm:ss').
 */
import {
    addDays,
    addMonths,
    weekdayOf,
    zonedParts,
    localInputToUtc,
    parseGlideDateTime,
    formatGlideDateTime,
} from 'utilities:app/datetime';
import type { ListRow } from 'utilities:app/list-data';

export type CalendarViewName = 'month' | 'week' | 'day' | 'agenda';

export const VIEW_LABELS: Record<CalendarViewName, string> = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
};

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export type CalendarEvent = {
    /** sys_id (one event per record). */
    id: string;
    table: string;
    /** The record's class (an extended table opens as itself). */
    className: string;
    title: string;
    /** The record's display value (number) when the title is another field. */
    display: string;
    /** Epoch ms. */
    start: number;
    /** Epoch ms, exclusive; start + 1 h when the record has no end. */
    end: number;
    /** Date fields, or spans of 24 h or more: shown in the all-day row. */
    allDay: boolean;
    /** The record had no end value (dragging moves only the start). */
    noEnd: boolean;
    /** Colour-by value and label. */
    colorValue: string;
    colorLabel: string;
    row: ListRow;
};

export type CalendarRange = {
    /** First day shown, inclusive. */
    first: string;
    /** Day after the last day shown. */
    after: string;
    days: string[];
};

/** The user's calendar day of an instant. */
export function dayOf(ms: number, timeZone?: string): string {
    const p = zonedParts(ms, timeZone);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Seconds since the day's midnight (wall clock) of an instant. */
export function secondsOf(ms: number, timeZone?: string): number {
    const p = zonedParts(ms, timeZone);
    return p.h * 3600 + p.mi * 60 + p.s;
}

/** The instant a wall-clock time on a day happens in the zone. */
export function instantAt(ymd: string, seconds: number, timeZone?: string): number {
    const s = Math.max(0, Math.min(86_399, Math.round(seconds)));
    const hh = pad(Math.floor(s / 3600));
    const mm = pad(Math.floor(s / 60) % 60);
    const ss = pad(s % 60);
    return parseGlideDateTime(localInputToUtc(`${ymd}T${hh}:${mm}:${ss}`, timeZone));
}

/** Midnight of a day in the zone. */
export function dayStart(ymd: string, timeZone?: string): number {
    return instantAt(ymd, 0, timeZone);
}

function daysBetween(first: string, after: string): string[] {
    const out: string[] = [];
    for (let d = first; d < after && out.length < 62; d = addDays(d, 1)) out.push(d);
    return out;
}

/** First day of the week that contains `ymd`. */
export function startOfWeek(ymd: string, weekStart: number): string {
    const diff = (weekdayOf(ymd) - weekStart + 7) % 7;
    return addDays(ymd, -diff);
}

/** The days a view shows around the anchor day. Month = whole weeks covering the month. */
export function rangeFor(view: CalendarViewName, anchor: string, weekStart: number, agendaDays = 30): CalendarRange {
    if (view === 'day') return { first: anchor, after: addDays(anchor, 1), days: [anchor] };
    if (view === 'week') {
        const first = startOfWeek(anchor, weekStart);
        const after = addDays(first, 7);
        return { first, after, days: daysBetween(first, after) };
    }
    if (view === 'agenda') {
        const after = addDays(anchor, agendaDays);
        return { first: anchor, after, days: daysBetween(anchor, after) };
    }
    const monthFirst = anchor.slice(0, 8) + '01';
    const first = startOfWeek(monthFirst, weekStart);
    const nextMonth = addMonths(monthFirst, 1);
    const lastWeekStart = startOfWeek(addDays(nextMonth, -1), weekStart);
    const after = addDays(lastWeekStart, 7);
    return { first, after, days: daysBetween(first, after) };
}

/** The anchor after Previous / Next. */
export function stepAnchor(view: CalendarViewName, anchor: string, dir: 1 | -1, agendaDays = 30): string {
    if (view === 'month') return addMonths(anchor.slice(0, 8) + '01', dir);
    if (view === 'week') return addDays(anchor, 7 * dir);
    if (view === 'agenda') return addDays(anchor, agendaDays * dir);
    return addDays(anchor, dir);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A glide date or date-time value as an instant (dates: midnight in the zone). */
export function instantOf(value: string, timeZone?: string): number {
    const v = String(value || '').trim();
    if (!v) return NaN;
    if (DATE_ONLY.test(v)) return dayStart(v, timeZone);
    return parseGlideDateTime(v);
}

/** UTC value for a glide date-time column, or 'YYYY-MM-DD' for a date column. */
export function glideValueOf(ms: number, type: string, timeZone?: string): string {
    if (type === 'glide_date') return dayOf(ms, timeZone);
    return formatGlideDateTime(ms);
}

/**
 * The encoded query for records that overlap [from, to): starts inside the range, or (with an end
 * field) started before it and end inside / after it. Glide date-time values compare in UTC.
 */
export function overlapQuery(opts: {
    startField: string;
    endField?: string;
    from: number;
    to: number;
    startType?: string;
    endType?: string;
    timeZone?: string;
}): string {
    const v = (ms: number, type?: string) => glideValueOf(ms, type || 'glide_date_time', opts.timeZone);
    const s = opts.startField;
    const inside = `${s}>=${v(opts.from, opts.startType)}^${s}<${v(opts.to, opts.startType)}`;
    if (!opts.endField) return inside;
    const e = opts.endField;
    return `${inside}^NQ${s}<${v(opts.from, opts.startType)}^${e}>=${v(opts.from, opts.endType)}`;
}

/** AND a base query into every ^NQ set of another (keeps OR-sets correct). */
export function andInto(base: string, query: string): string {
    const b = String(base || '').trim();
    if (!b) return query;
    return query
        .split('^NQ')
        .map((set) => `${b}^${set}`)
        .join('^NQ');
}

export type EventFields = {
    table: string;
    startField: string;
    endField?: string;
    titleField?: string;
    colorField?: string;
    startType?: string;
    endType?: string;
};

/** List rows → events (rows without a start are skipped). */
export function toEvents(rows: ListRow[], f: EventFields, timeZone?: string): CalendarEvent[] {
    const out: CalendarEvent[] = [];
    for (const row of rows) {
        const sv = row.cells[f.startField] ? row.cells[f.startField].value : '';
        const start = instantOf(sv, timeZone);
        if (!Number.isFinite(start)) continue;
        const ev = f.endField && row.cells[f.endField] ? row.cells[f.endField].value : '';
        let end = instantOf(ev, timeZone);
        const noEnd = !Number.isFinite(end);
        const dateOnly = f.startType === 'glide_date' || DATE_ONLY.test(sv);
        if (noEnd || end <= start) end = start + (dateOnly ? DAY_MS : 3_600_000);
        if (dateOnly && f.endType === 'glide_date' && !noEnd) end += DAY_MS; // inclusive end day
        const title =
            (f.titleField && row.cells[f.titleField] && row.cells[f.titleField].displayValue) ||
            row.display ||
            row.sysId;
        const c = f.colorField && row.cells[f.colorField];
        out.push({
            id: row.sysId,
            table: f.table,
            className: row.className || f.table,
            title: String(title).trim(),
            display: row.display && row.display !== title ? row.display : '',
            start,
            end,
            allDay: dateOnly || end - start >= DAY_MS,
            noEnd,
            colorValue: c ? c.value : '',
            colorLabel: c ? c.displayValue || c.value : '',
            row,
        });
    }
    return out.sort((a, b) => a.start - b.start || b.end - a.end);
}

/** Events touching a day (in the zone). */
export function eventsOnDay(events: CalendarEvent[], ymd: string, timeZone?: string): CalendarEvent[] {
    const from = dayStart(ymd, timeZone);
    const to = dayStart(addDays(ymd, 1), timeZone);
    return events.filter((e) => e.start < to && e.end > from);
}

export type PlacedEvent = { event: CalendarEvent; top: number; height: number; col: number; cols: number };

/**
 * Timed events of one day, positioned in minutes from midnight with side-by-side columns for
 * overlaps (each cluster of overlapping events shares its column count).
 */
export function layoutDay(events: CalendarEvent[], ymd: string, timeZone?: string): PlacedEvent[] {
    const from = dayStart(ymd, timeZone);
    const to = dayStart(addDays(ymd, 1), timeZone);
    const span = (to - from) / 60_000;
    const items = events
        .filter((e) => !e.allDay && e.start < to && e.end > from)
        .map((e) => {
            const top = Math.max(0, (e.start - from) / 60_000);
            const bottom = Math.min(span, (e.end - from) / 60_000);
            return { event: e, top, height: Math.max(20, bottom - top), col: 0, cols: 1 };
        })
        .sort((a, b) => a.top - b.top || b.height - a.height);
    let cluster: PlacedEvent[] = [];
    let clusterEnd = -1;
    const colEnds: number[] = [];
    const flush = () => {
        const n = Math.max(1, colEnds.length);
        for (const p of cluster) p.cols = n;
        cluster = [];
        colEnds.length = 0;
    };
    for (const it of items) {
        if (it.top >= clusterEnd) flush();
        let col = colEnds.findIndex((end) => end <= it.top);
        if (col < 0) {
            col = colEnds.length;
            colEnds.push(0);
        }
        colEnds[col] = it.top + it.height;
        it.col = col;
        cluster.push(it);
        clusterEnd = Math.max(clusterEnd, it.top + it.height);
    }
    flush();
    return items;
}

/**
 * Where a dropped event lands. A day target keeps the wall-clock start time (and the duration); a
 * time slot moves the start to the slot. Returns new start / end instants.
 */
export function movedTimes(
    event: CalendarEvent,
    target: { day: string; seconds?: number },
    timeZone?: string
): { start: number; end: number } {
    const duration = event.end - event.start;
    const seconds = target.seconds !== undefined ? target.seconds : secondsOf(event.start, timeZone);
    const start = instantAt(target.day, seconds, timeZone);
    return { start, end: start + duration };
}

/** Categorical colours for colour-by values without a status meaning (literal classes for Tailwind). */
export const PALETTE = [
    {
        chip: 'border-l-sky-500 bg-sky-500/12 text-sky-900 dark:text-sky-100',
        dot: 'bg-sky-500',
    },
    {
        chip: 'border-l-violet-500 bg-violet-500/12 text-violet-900 dark:text-violet-100',
        dot: 'bg-violet-500',
    },
    {
        chip: 'border-l-emerald-500 bg-emerald-500/12 text-emerald-900 dark:text-emerald-100',
        dot: 'bg-emerald-500',
    },
    {
        chip: 'border-l-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-100',
        dot: 'bg-amber-500',
    },
    {
        chip: 'border-l-rose-500 bg-rose-500/12 text-rose-900 dark:text-rose-100',
        dot: 'bg-rose-500',
    },
    {
        chip: 'border-l-teal-500 bg-teal-500/12 text-teal-900 dark:text-teal-100',
        dot: 'bg-teal-500',
    },
    {
        chip: 'border-l-indigo-500 bg-indigo-500/12 text-indigo-900 dark:text-indigo-100',
        dot: 'bg-indigo-500',
    },
    {
        chip: 'border-l-orange-500 bg-orange-500/12 text-orange-900 dark:text-orange-100',
        dot: 'bg-orange-500',
    },
];

export const NEUTRAL_COLOR = {
    chip: 'border-l-muted-foreground/60 bg-muted text-foreground',
    dot: 'bg-muted-foreground/60',
};

/** A stable palette slot per value, in first-seen order of the sorted distinct values. */
export function colorIndex(values: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    Array.from(new Set(values.filter(Boolean)))
        .sort()
        .forEach((v, i) => {
            out[v] = i % PALETTE.length;
        });
    return out;
}
