/**
 * components:app/calendar-view: records of any table on a calendar (Next Experience's now-calendar):
 * month, week, day and agenda views, event popovers (app/record-card), drag to reschedule.
 *
 *   <CalendarView table="change_request" startField="start_date" endField="end_date"
 *                 titleField="short_description" colorField="type" reschedule onOpen={open} />
 *   const cal = useCalendarEvents({ table, query, startField, endField, titleField, colorField, range })
 *   model (./model): rangeFor, stepAnchor, overlapQuery, andInto, toEvents, eventsOnDay, layoutDay,
 *                    movedTimes, dayOf, instantAt, dayStart, glideValueOf, PALETTE, colorIndex
 *
 * - Data: utilities:app/list-data (one server request per range: records that start in it, or with an
 *   end field, started before it and end in / after it; read as the user, ACLs apply). Live: the
 *   record watch on the table + query refetches.
 * - Days and times are the user's ServiceNow time zone and time format (utilities:app/datetime); the
 *   first day of the week follows the user's locale.
 * - Reschedule (`reschedule`): drag an event to another day (keeps the time) or time slot (week / day),
 *   or pick it up with Space, move with the arrow keys and drop with Space (Escape cancels). The write
 *   goes through app/record-update (the record's form save: UI policies, client scripts, business
 *   rules, ACLs) with an Undo toast; a failure rolls the event back.
 * - Keyboard: t today · j / n next · k / p previous · m / w / d / a switch view (when focus is in the
 *   calendar, not in a field). Every event is a button; Enter opens its card.
 * - Narrow containers (under 640 px, e.g. phones) get the agenda by default and offer agenda / day.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecordWatch } from '@portal/runtime';
import { useList } from 'utilities:app/list-data';
import { useTableMeta } from 'utilities:app/graphql';
import {
    useUserTimeZone,
    useUserFormats,
    useLocale,
    todayIn,
    addDays,
    weekStartFor,
    formatTime,
    formatDate,
    zoneLabel,
} from 'utilities:app/datetime';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    closestCenter,
} from 'utilities:dnd-kit';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { RecordCard } from 'components:app/record-card';
import { toneFor } from 'components:app/highlighted-value';
import type { HighlightTone } from 'components:app/highlighted-value';
import { useRecordUpdate, updateWithUndo } from 'components:app/record-update';
import type { UpdateValue } from 'components:app/record-update';
import { cx, Spinner } from 'components:app/field';
import {
    VIEW_LABELS,
    rangeFor,
    stepAnchor,
    overlapQuery,
    andInto,
    toEvents,
    eventsOnDay,
    layoutDay,
    movedTimes,
    dayOf,
    dayStart,
    secondsOf,
    glideValueOf,
    PALETTE,
    NEUTRAL_COLOR,
    colorIndex,
} from './model';
import type { CalendarEvent, CalendarRange, CalendarViewName } from './model';

export * from './model';

const STATUS_FIELDS = ['state', 'stage', 'approval', 'priority', 'risk', 'impact', 'urgency', 'severity', 'type'];
const TONE_CHIP: Record<HighlightTone, { chip: string; dot: string }> = {
    neutral: NEUTRAL_COLOR,
    info: { chip: 'border-l-primary bg-primary/10 text-foreground', dot: 'bg-primary' },
    progress: PALETTE[0],
    warning: PALETTE[3],
    high: PALETTE[7],
    success: PALETTE[2],
    danger: { chip: 'border-l-destructive bg-destructive/10 text-foreground', dot: 'bg-destructive' },
};

const DAY_MS = 86_400_000;
const SLOT_SECONDS = 1800;
const HOUR_PX = 48;

export type UseCalendarEventsOptions = {
    table: string;
    /** Encoded query ANDed into the range query (no ^NQ). */
    query?: string;
    startField: string;
    endField?: string;
    titleField?: string;
    colorField?: string;
    range: CalendarRange;
    timeZone?: string;
    /** Most records per range (default 500). */
    limit?: number;
    /** Record watch (default true). */
    live?: boolean;
    enabled?: boolean;
};

/** The records of a range as events, read as the user, live. */
export function useCalendarEvents(o: UseCalendarEventsOptions) {
    const meta = useTableMeta(o.table, { enabled: !!o.table });
    const m = meta.data || undefined;
    const startType = (m && m[o.startField] && m[o.startField].type) || 'glide_date_time';
    const endType = (o.endField && m && m[o.endField] && m[o.endField].type) || 'glide_date_time';
    const from = dayStart(o.range.first, o.timeZone);
    const to = dayStart(o.range.after, o.timeZone);
    const query = andInto(
        o.query || '',
        overlapQuery({ startField: o.startField, endField: o.endField, from, to, startType, endType })
    );
    const columns = [o.startField, o.endField, o.titleField, o.colorField].filter(Boolean) as string[];
    const list = useList(
        {
            table: o.table,
            columns: Array.from(new Set(columns)).join(','),
            query,
            orderBy: [{ field: o.startField, desc: false }],
            limit: o.limit || 500,
        },
        { enabled: o.enabled !== false && !!o.table && !!o.startField && !!m }
    );
    useRecordWatch(o.table, o.query || '', undefined, { enabled: o.live !== false && !!o.table });
    const events = useMemo(
        () =>
            toEvents(
                list.rows,
                {
                    table: o.table,
                    startField: o.startField,
                    endField: o.endField,
                    titleField: o.titleField,
                    colorField: o.colorField,
                    startType,
                    endType,
                },
                o.timeZone
            ),
        [list.rows, o.table, o.startField, o.endField, o.titleField, o.colorField, startType, endType, o.timeZone]
    );
    return {
        events,
        count: list.count,
        truncated: list.count > list.rows.length,
        isLoading: meta.isLoading || list.isLoading,
        isFetching: list.isFetching,
        error: (meta.error as Error | null) || list.error,
        meta: m,
        startType,
        endType,
        canWrite: !!(m && m[o.startField] && m[o.startField].canWrite !== false),
    };
}

/** Width of an element (ResizeObserver). */
function useWidth(ref: { current: HTMLElement | null }): number {
    const [w, setW] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
        ro.observe(el);
        setW(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);
    return w;
}

function ymdDate(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12));
}

function fmtDay(ymd: string, locale: string | undefined, opts: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(ymdDate(ymd));
}

function daysDiff(a: string, b: string): number {
    return Math.round((ymdDate(b).getTime() - ymdDate(a).getTime()) / DAY_MS);
}

/** The toolbar title for a view and range. */
export function rangeTitle(view: CalendarViewName, anchor: string, range: CalendarRange, locale?: string): string {
    if (view === 'month') return fmtDay(anchor, locale, { month: 'long', year: 'numeric' });
    if (view === 'day')
        return fmtDay(anchor, locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const last = addDays(range.after, -1);
    try {
        return new (Intl.DateTimeFormat as any)(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        }).formatRange(ymdDate(range.first), ymdDate(last));
    } catch (e) {
        return `${fmtDay(range.first, locale, { month: 'short', day: 'numeric' })} – ${fmtDay(last, locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })}`;
    }
}

export type CalendarViewProps = {
    table: string;
    query?: string;
    startField: string;
    endField?: string;
    titleField?: string;
    colorField?: string;
    /** Controlled view, or the starting one (default month; agenda when narrow). */
    view?: CalendarViewName;
    defaultView?: CalendarViewName;
    onViewChange?: (view: CalendarViewName) => void;
    /** Views offered (default all four). */
    views?: CalendarViewName[];
    /** Controlled anchor day ('YYYY-MM-DD'), or the starting one (default today). */
    date?: string;
    defaultDate?: string;
    onDateChange?: (ymd: string) => void;
    /** Drag (and keyboard drag) to reschedule; writes as the user. */
    reschedule?: boolean;
    /** "Open record" and double click; default the classic form in a new tab. */
    onOpen?: (table: string, sysId: string) => void;
    /** Most records per range (default 500). */
    limit?: number;
    live?: boolean;
    /** Days the agenda shows (default 30). */
    agendaDays?: number;
    /** Height of the week / day time grid in px (default 600). */
    height?: number;
    /** 0 = Sunday … 6 = Saturday (default: the user's locale). */
    weekStart?: number;
    /** Key fields in the event cards (default app/record-card's). */
    cardFields?: string[];
    className?: string;
};

type DragData = { event: CalendarEvent; fromDay: string };

/** The calendar. See the file comment. */
export function CalendarView(props: CalendarViewProps) {
    const tz = useUserTimeZone();
    const locale = useLocale();
    const formats = useUserFormats();
    const weekStart = props.weekStart ?? weekStartFor(locale);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [a11yEl, setA11yEl] = useState<HTMLDivElement | null>(null);
    const width = useWidth(rootRef);
    const narrow = width > 0 && width < 640;
    const allViews: CalendarViewName[] =
        props.views && props.views.length ? props.views : ['month', 'week', 'day', 'agenda'];
    const offered = narrow ? allViews.filter((v) => v === 'agenda' || v === 'day') : allViews;
    const viewsShown = offered.length ? offered : allViews;
    const [viewState, setViewState] = useState<CalendarViewName | ''>(props.defaultView || '');
    const chosen = props.view || viewState || allViews[0];
    const view: CalendarViewName =
        viewsShown.indexOf(chosen) >= 0 ? chosen : viewsShown.indexOf('agenda') >= 0 ? 'agenda' : viewsShown[0];
    const setView = (v: CalendarViewName) => {
        if (!props.view) setViewState(v);
        if (props.onViewChange) props.onViewChange(v);
    };
    const today = todayIn(tz);
    const [dateState, setDateState] = useState(props.defaultDate || '');
    const anchor = props.date || dateState || today;
    const setAnchor = (d: string) => {
        if (!props.date) setDateState(d);
        if (props.onDateChange) props.onDateChange(d);
    };
    const agendaDays = props.agendaDays || 30;
    const range = useMemo(() => rangeFor(view, anchor, weekStart, agendaDays), [view, anchor, weekStart, agendaDays]);
    const cal = useCalendarEvents({
        table: props.table,
        query: props.query,
        startField: props.startField,
        endField: props.endField,
        titleField: props.titleField,
        colorField: props.colorField,
        range,
        timeZone: tz,
        limit: props.limit,
        live: props.live,
    });

    // Optimistic moves until the server copy catches up (or the write fails).
    const [moves, setMoves] = useState<Record<string, { start: number; end: number }>>({});
    useEffect(() => {
        setMoves((cur) => {
            const keys = Object.keys(cur);
            if (!keys.length) return cur;
            const next = { ...cur };
            for (const k of keys) {
                const e = cal.events.find((x) => x.id === k);
                if (e && Math.abs(e.start - cur[k].start) < 1000) delete next[k];
            }
            return next;
        });
    }, [cal.events]);
    const events = useMemo(
        () =>
            cal.events.map((e) =>
                moves[e.id] ? { ...e, start: moves[e.id].start, end: moves[e.id].end, allDay: e.allDay } : e
            ),
        [cal.events, moves]
    );

    // Colours.
    const colorOf = useMemo(() => {
        const field = props.colorField || '';
        const idx = colorIndex(events.map((e) => e.colorValue));
        const status = STATUS_FIELDS.indexOf(field) >= 0 && field !== 'type';
        return (e: CalendarEvent) => {
            if (!field || !e.colorValue) return NEUTRAL_COLOR;
            if (status) return TONE_CHIP[toneFor(e.colorLabel, { field, value: e.colorValue })];
            return PALETTE[idx[e.colorValue] || 0];
        };
    }, [events, props.colorField]);
    const legend = useMemo(() => {
        const seen = new Map<string, CalendarEvent>();
        for (const e of events) if (e.colorValue && !seen.has(e.colorValue)) seen.set(e.colorValue, e);
        return Array.from(seen.values()).sort((a, b) => a.colorLabel.localeCompare(b.colorLabel));
    }, [events]);

    const secondsText = (sec: number) => formatTime(sec, formats.time || 'HH:mm', { locale });
    const timeText = (ms: number) => secondsText(secondsOf(ms, tz));
    const ctx: Ctx = {
        tz,
        locale,
        today,
        colorOf,
        timeText,
        secondsText,
        onOpen: props.onOpen,
        cardFields: props.cardFields,
        canDrag: !!props.reschedule && cal.canWrite,
    };

    // Rescheduling.
    const updater = useRecordUpdate();
    const [dragging, setDragging] = useState<DragData | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: calendarKeyboardCoordinates,
            keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
        })
    );
    const dropTarget = (id: string): { day: string; seconds?: number } | null => {
        const p = String(id || '').split('|');
        if (p[0] === 'd' && p[1]) return { day: p[1] };
        if (p[0] === 's' && p[1]) return { day: p[1], seconds: Number(p[2]) || 0 };
        return null;
    };
    const describeTarget = (id: string) => {
        const t = dropTarget(id);
        if (!t) return 'nowhere';
        const d = fmtDay(t.day, locale, { weekday: 'long', month: 'long', day: 'numeric' });
        return t.seconds === undefined ? d : `${d}, ${formatTime(t.seconds, formats.time || 'HH:mm', { locale })}`;
    };
    /** A glide display value in the user's date / date-time format and zone. */
    const displayOf = (ms: number, type: string) => {
        const ymd = dayOf(ms, tz);
        const date = formatDate(ymd, formats.date || 'yyyy-MM-dd', locale);
        if (type === 'glide_date') return date;
        return `${date} ${formatTime(secondsOf(ms, tz), formats.time || 'HH:mm:ss', { seconds: true, locale })}`;
    };
    const reschedule = async (data: DragData, overId: string) => {
        const target = dropTarget(overId);
        if (!target) return;
        const e = data.event;
        // A day target moves by whole days from the day it was dragged from (multi-day events).
        const day =
            target.seconds === undefined ? addDays(dayOf(e.start, tz), daysDiff(data.fromDay, target.day)) : target.day;
        const next = movedTimes(e, { day, seconds: target.seconds }, tz);
        if (Math.abs(next.start - e.start) < 1000) return;
        // The form takes the UTC value plus the display value in the user's format and zone.
        const values: Record<string, UpdateValue> = {
            [props.startField]: {
                value: glideValueOf(next.start, cal.startType, tz),
                displayValue: displayOf(next.start, cal.startType),
            },
        };
        const old = (f: string): UpdateValue =>
            e.row.cells[f] ? { value: e.row.cells[f].value, displayValue: e.row.cells[f].displayValue } : '';
        const previous: Record<string, UpdateValue> = { [props.startField]: old(props.startField) };
        if (props.endField && !e.noEnd) {
            const endMs = cal.endType === 'glide_date' ? next.end - DAY_MS : next.end;
            values[props.endField] = {
                value: glideValueOf(endMs, cal.endType, tz),
                displayValue: displayOf(endMs, cal.endType),
            };
            previous[props.endField] = old(props.endField);
        }
        setMoves((cur) => ({ ...cur, [e.id]: next }));
        const label = e.display || e.title;
        const when = `${fmtDay(dayOf(next.start, tz), locale, { weekday: 'short', month: 'short', day: 'numeric' })}${
            e.allDay ? '' : ' ' + timeText(next.start)
        }`;
        const outcome = await updateWithUndo(
            updater,
            { table: e.className || props.table, sysId: e.id, values, label, description: `Reschedule to ${when}` },
            previous,
            { success: `${label} moved to ${when}` }
        );
        if (!outcome.ok)
            setMoves((cur) => {
                const n = { ...cur };
                delete n[e.id];
                return n;
            });
    };

    const onKeyDown = (ev: any) => {
        const t = ev.target as HTMLElement;
        if (dragging || ev.altKey || ev.ctrlKey || ev.metaKey) return;
        if (t && (t.closest('input,textarea,select,[contenteditable="true"]') || t.isContentEditable)) return;
        const k = String(ev.key || '').toLowerCase();
        const map: Record<string, CalendarViewName> = { m: 'month', w: 'week', d: 'day', a: 'agenda' };
        if (k === 't') setAnchor(today);
        else if (k === 'j' || k === 'n') setAnchor(stepAnchor(view, anchor, 1, agendaDays));
        else if (k === 'k' || k === 'p') setAnchor(stepAnchor(view, anchor, -1, agendaDays));
        else if (map[k] && viewsShown.indexOf(map[k]) >= 0) setView(map[k]);
        else return;
        ev.preventDefault();
    };

    const toggle = useSingleToggle(view, (v: string) => setView(v as CalendarViewName));
    const title = rangeTitle(view, anchor, range, locale);
    const body =
        view === 'month' ? (
            <MonthView range={range} anchor={anchor} events={events} ctx={ctx} weekStart={weekStart} />
        ) : view === 'agenda' ? (
            <AgendaView range={range} events={events} ctx={ctx} />
        ) : (
            <TimeGridView range={range} events={events} ctx={ctx} height={props.height || 600} />
        );

    return (
        <div
            ref={rootRef}
            className={cx('flex min-w-0 flex-col gap-3 contain-inline-size', props.className)}
            onKeyDown={onKeyDown}
            data-rp-calendar-view={props.table}
            data-view={view}
        >
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAnchor(today)}
                    aria-keyshortcuts="t"
                >
                    Today
                </Button>
                <div className="flex items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Previous"
                        aria-keyshortcuts="k"
                        onClick={() => setAnchor(stepAnchor(view, anchor, -1, agendaDays))}
                        data-rp-cal-prev=""
                    >
                        <Icon name="chevron-left" aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Next"
                        aria-keyshortcuts="j"
                        onClick={() => setAnchor(stepAnchor(view, anchor, 1, agendaDays))}
                        data-rp-cal-next=""
                    >
                        <Icon name="chevron-right" aria-hidden="true" />
                    </Button>
                </div>
                <h2 className="m-0 min-w-0 truncate text-base font-semibold" aria-live="polite" data-rp-cal-title="">
                    {title}
                </h2>
                {cal.isFetching ? <Spinner label="Loading events" /> : null}
                <div className="ml-auto flex items-center gap-2">
                    {width >= 480 ? (
                        <span className="text-xs text-muted-foreground" title={tz || ''}>
                            {zoneLabel(tz)}
                        </span>
                    ) : null}
                    {viewsShown.length > 1 ? (
                        <ToggleGroup {...toggle} aria-label="Calendar view" size="sm">
                            {viewsShown.map((v) => (
                                <ToggleGroupItem key={v} value={v} aria-keyshortcuts={v[0]} data-rp-cal-view={v}>
                                    {VIEW_LABELS[v]}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    ) : null}
                </div>
            </div>
            {legend.length > 1 ? (
                <ul
                    className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground"
                    aria-label="Colours"
                >
                    {legend.map((e) => (
                        <li key={e.colorValue} className="flex items-center gap-1.5">
                            <span className={cx('size-2.5 rounded-full', colorOf(e).dot)} aria-hidden="true" />
                            {e.colorLabel}
                        </li>
                    ))}
                </ul>
            ) : null}
            {cal.error ? (
                <p role="alert" className="m-0 text-sm text-destructive">
                    {cal.error.message}
                </p>
            ) : null}
            {cal.truncated ? (
                <p className="m-0 text-xs text-muted-foreground" data-rp-cal-truncated="">
                    Showing the first {events.length} of {cal.count} records in this range.
                </p>
            ) : null}
            <DndContext
                sensors={sensors}
                collisionDetection={detectTarget}
                accessibility={{
                    container: a11yEl || undefined,
                    announcements: {
                        onDragStart: ({ active }: any) =>
                            `Picked up ${active.data.current ? active.data.current.event.title : 'event'}. Arrow keys move it, Space drops it, Escape cancels.`,
                        onDragOver: ({ over }: any) =>
                            over ? `Over ${describeTarget(String(over.id))}.` : 'Not over a day.',
                        onDragEnd: ({ over }: any) =>
                            over ? `Dropped on ${describeTarget(String(over.id))}.` : 'Dropped. Nothing changed.',
                        onDragCancel: () => 'Cancelled. Nothing changed.',
                    },
                    screenReaderInstructions: {
                        draggable:
                            'Press Enter to open the record card. To reschedule, press Space, move with the arrow keys and press Space again to drop.',
                    },
                }}
                onDragStart={({ active }: any) => setDragging((active.data.current as DragData) || null)}
                onDragCancel={() => setDragging(null)}
                onDragEnd={({ active, over }: any) => {
                    setDragging(null);
                    const data = active.data.current as DragData | undefined;
                    if (data && over) reschedule(data, String(over.id));
                }}
            >
                <div
                    className={cx('relative min-w-0', cal.isLoading ? 'opacity-60' : '')}
                    aria-busy={cal.isLoading || undefined}
                >
                    {body}
                </div>
                <DragOverlay dropAnimation={null}>
                    {dragging ? (
                        <div
                            className={cx(
                                'pointer-events-none max-w-56 truncate rounded-md border-l-4 px-2 py-1 text-xs font-medium shadow-lg ring-1 ring-foreground/10',
                                colorOf(dragging.event).chip
                            )}
                        >
                            {dragging.event.title}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
            <div ref={setA11yEl} />
            {updater.element}
        </div>
    );
}

/**
 * Keyboard drag: arrows step between drop targets by id, not by geometry. Day cells: left / right a
 * day, up / down a week (month view). Time slots: up / down 30 minutes, left / right a day. Returns
 * the dragged chip's new top-left so detectTarget's probe point lands inside the target.
 */
function calendarKeyboardCoordinates(event: any, args: any) {
    const code = event.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(code) < 0) return undefined;
    const ctx = args.context;
    const data = ctx.active && ctx.active.data && ctx.active.data.current;
    let current = ctx.over ? String(ctx.over.id) : '';
    if (!current && data) current = `d|${data.fromDay}`;
    const p = current.split('|');
    if (!p[1]) return undefined;
    let next = '';
    if (p[0] === 'd') {
        const step = code === 'ArrowLeft' ? -1 : code === 'ArrowRight' ? 1 : code === 'ArrowUp' ? -7 : 7;
        next = `d|${addDays(p[1], step)}`;
    } else if (p[0] === 's') {
        const sec = Number(p[2]) || 0;
        if (code === 'ArrowUp' || code === 'ArrowDown') {
            const n = sec + (code === 'ArrowUp' ? -SLOT_SECONDS : SLOT_SECONDS);
            if (n < 0 || n >= 86_400) return undefined;
            next = `s|${p[1]}|${n}`;
        } else next = `s|${addDays(p[1], code === 'ArrowLeft' ? -1 : 1)}|${sec}`;
    }
    const rect = next ? ctx.droppableRects.get(next) : null;
    if (!rect) return undefined;
    return { x: rect.left + 2, y: rect.top + 2 };
}

/** The droppable under a point near the dragged chip's top edge (falls back to the closest centre). */
function detectTarget(args: any) {
    const r = args.collisionRect;
    if (r) {
        const x = r.left + Math.min(r.width / 2, 24);
        const y = r.top + Math.min(r.height / 2, 8);
        const hits = args.droppableContainers.filter((c: any) => {
            const rect = args.droppableRects.get(c.id);
            return rect && x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height;
        });
        if (hits.length) return [{ id: hits[hits.length - 1].id, data: { droppableContainer: hits[hits.length - 1] } }];
    }
    return closestCenter(args);
}

type Ctx = {
    tz: string | undefined;
    locale: string | undefined;
    today: string;
    colorOf: (e: CalendarEvent) => { chip: string; dot: string };
    timeText: (ms: number) => string;
    /** Seconds since midnight in the user's time format. */
    secondsText: (sec: number) => string;
    onOpen?: (table: string, sysId: string) => void;
    cardFields?: string[];
    canDrag: boolean;
};

function DayDrop(props: { id: string; className?: string; children?: any; label?: string; style?: any }) {
    const { setNodeRef, isOver } = useDroppable({ id: props.id });
    return (
        <div
            ref={setNodeRef}
            style={props.style}
            className={cx(props.className, isOver ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset' : '')}
            role={props.label ? 'group' : undefined}
            aria-label={props.label}
        >
            {props.children}
        </div>
    );
}

/** One event as a button: click / Enter opens its card; drag or Space reschedules. */
function EventChip(props: {
    event: CalendarEvent;
    day: string;
    ctx: Ctx;
    variant: 'chip' | 'block' | 'row';
    style?: any;
    className?: string;
    placement?: string;
}) {
    const { event: e, ctx } = props;
    const [open, setOpen] = useState(false);
    const dragged = useRef(false);
    const drag = useDraggable({
        id: `${e.id}@${props.day}@${props.placement || ''}`,
        data: { event: e, fromDay: props.day },
        disabled: !ctx.canDrag,
    });
    useEffect(() => {
        if (drag.isDragging) dragged.current = true;
    }, [drag.isDragging]);
    const color = ctx.colorOf(e);
    const time = e.allDay ? '' : ctx.timeText(e.start);
    const when = e.allDay
        ? fmtDay(dayOf(e.start, ctx.tz), ctx.locale, { weekday: 'short', month: 'short', day: 'numeric' })
        : `${fmtDay(dayOf(e.start, ctx.tz), ctx.locale, { weekday: 'short', month: 'short', day: 'numeric' })}, ${ctx.timeText(e.start)} – ${ctx.timeText(e.end)}`;
    const name = `${e.title}${e.display ? ` (${e.display})` : ''}, ${when}`;
    const cls =
        props.variant === 'row'
            ? 'flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted'
            : cx(
                  'flex w-full min-w-0 rounded-md border-l-4 text-left text-xs leading-tight',
                  props.variant === 'block'
                      ? 'h-full flex-col gap-0.5 overflow-hidden px-1.5 py-1'
                      : 'items-center gap-1 px-1.5 py-0.5',
                  color.chip
              );
    return (
        <Popover
            open={open}
            onOpenChange={(o: boolean) => {
                if (o && dragged.current) {
                    dragged.current = false;
                    return;
                }
                setOpen(o);
            }}
        >
            <PopoverTrigger
                ref={drag.setNodeRef}
                {...drag.attributes}
                {...drag.listeners}
                style={props.style}
                className={cx(
                    cls,
                    'cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    drag.isDragging ? 'opacity-40' : '',
                    props.className
                )}
                aria-label={name}
                title={name}
                onDoubleClick={() => ctx.onOpen && ctx.onOpen(e.className, e.id)}
                data-rp-cal-event={e.id}
            >
                {props.variant === 'row' ? (
                    <>
                        <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">
                            {e.allDay ? 'All day' : `${ctx.timeText(e.start)} – ${ctx.timeText(e.end)}`}
                        </span>
                        <span className={cx('size-2.5 shrink-0 rounded-full', color.dot)} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                        {e.display ? <span className="shrink-0 text-xs text-muted-foreground">{e.display}</span> : null}
                    </>
                ) : props.variant === 'block' ? (
                    <>
                        <span className="truncate font-medium">{e.title}</span>
                        <span className="truncate opacity-80 tabular-nums">
                            {ctx.timeText(e.start)} – {ctx.timeText(e.end)}
                        </span>
                    </>
                ) : (
                    <>
                        {time ? <span className="shrink-0 opacity-80 tabular-nums">{time}</span> : null}
                        <span className="min-w-0 truncate font-medium">{e.title}</span>
                    </>
                )}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
                <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name="clock" className="size-3.5" aria-hidden="true" />
                    {e.allDay && e.end - e.start > DAY_MS
                        ? `${fmtDay(dayOf(e.start, ctx.tz), ctx.locale, { month: 'short', day: 'numeric' })} – ${fmtDay(
                              dayOf(e.end - 1, ctx.tz),
                              ctx.locale,
                              { month: 'short', day: 'numeric', year: 'numeric' }
                          )}`
                        : when}
                </p>
                <RecordCard
                    table={e.className}
                    sysId={e.id}
                    fields={ctx.cardFields}
                    onOpen={ctx.onOpen ? (t: string, id: string) => ctx.onOpen!(t, id) : undefined}
                    variant="plain"
                />
            </PopoverContent>
        </Popover>
    );
}

function MoreButton({ events, day, ctx }: { events: CalendarEvent[]; day: string; ctx: Ctx }) {
    return (
        <Popover>
            <PopoverTrigger
                className="w-full rounded-sm px-1.5 text-left text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                data-rp-cal-more={day}
            >
                +{events.length} more
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 gap-1 p-2">
                <p className="m-0 px-1 text-xs font-semibold">
                    {fmtDay(day, ctx.locale, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                {events.map((e) => (
                    <EventChip key={e.id} event={e} day={day} ctx={ctx} variant="chip" placement="more" />
                ))}
            </PopoverContent>
        </Popover>
    );
}

function MonthView(props: {
    range: CalendarRange;
    anchor: string;
    events: CalendarEvent[];
    ctx: Ctx;
    weekStart: number;
}) {
    const { range, ctx } = props;
    const month = props.anchor.slice(0, 7);
    const weeks: string[][] = [];
    for (let i = 0; i < range.days.length; i += 7) weeks.push(range.days.slice(i, i + 7));
    const MAX = 3;
    return (
        <div className="overflow-hidden rounded-lg border border-border" aria-label="Month" role="region">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40" aria-hidden="true">
                {weeks[0].map((d) => (
                    <div key={d} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        <abbr title={fmtDay(d, ctx.locale, { weekday: 'long' })} className="no-underline">
                            {fmtDay(d, ctx.locale, { weekday: 'short' })}
                        </abbr>
                    </div>
                ))}
            </div>
            {weeks.map((week) => (
                <div key={week[0]} className="grid grid-cols-7 border-b border-border last:border-b-0">
                    {week.map((d) => {
                        const list = eventsOnDay(props.events, d, ctx.tz);
                        const shown = list.slice(0, list.length > MAX ? MAX - 1 : MAX);
                        const rest = list.slice(shown.length);
                        const out = d.slice(0, 7) !== month;
                        const isToday = d === ctx.today;
                        return (
                            <DayDrop
                                key={d}
                                id={`d|${d}`}
                                className={cx(
                                    'flex min-h-28 min-w-0 flex-col gap-0.5 border-r border-border p-1 last:border-r-0',
                                    out ? 'bg-muted/30' : ''
                                )}
                                label={
                                    fmtDay(d, ctx.locale, { weekday: 'long', month: 'long', day: 'numeric' }) +
                                    (list.length ? `, ${list.length} ${list.length === 1 ? 'event' : 'events'}` : '')
                                }
                            >
                                <span
                                    className={cx(
                                        'mb-0.5 inline-flex size-6 items-center justify-center self-start rounded-full text-xs tabular-nums',
                                        isToday
                                            ? 'bg-primary font-semibold text-primary-foreground'
                                            : out
                                              ? 'text-muted-foreground'
                                              : 'text-foreground'
                                    )}
                                    aria-current={isToday ? 'date' : undefined}
                                >
                                    {Number(d.slice(8))}
                                </span>
                                {shown.map((e) => (
                                    <EventChip key={e.id} event={e} day={d} ctx={ctx} variant="chip" />
                                ))}
                                {rest.length ? <MoreButton events={list} day={d} ctx={ctx} /> : null}
                            </DayDrop>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function TimeGridView(props: { range: CalendarRange; events: CalendarEvent[]; ctx: Ctx; height: number }) {
    const { range, ctx } = props;
    const scroller = useRef<HTMLDivElement | null>(null);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const slots = Array.from({ length: 48 }, (_, i) => i * SLOT_SECONDS);
    // Start scrolled to the earliest event (or 7 am).
    const firstKey = range.first;
    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const timed = props.events.filter((e) => !e.allDay && range.days.indexOf(dayOf(e.start, ctx.tz)) >= 0);
        const earliest = timed.length ? Math.min(...timed.map((e) => secondsOf(e.start, ctx.tz))) : 7 * 3600;
        el.scrollTop = Math.max(0, (Math.min(earliest, 7 * 3600) / 3600) * HOUR_PX - 8);
    }, [firstKey, props.events.length > 0]);
    const cols = `3.5rem repeat(${range.days.length}, minmax(0, 1fr))`;
    const allDay = range.days.map((d) => eventsOnDay(props.events, d, ctx.tz).filter((e) => e.allDay));
    const hasAllDay = allDay.some((l) => l.length);
    const hourLabel = (h: number) => ctx.secondsText(h * 3600).replace(/:00(?=\D*$)/, '');
    return (
        <div
            className="overflow-hidden rounded-lg border border-border"
            role="region"
            aria-label={range.days.length === 1 ? 'Day' : 'Week'}
        >
            <div
                className="grid border-b border-border bg-muted/40"
                style={{ gridTemplateColumns: cols }}
                aria-hidden="true"
            >
                <div />
                {range.days.map((d) => (
                    <div key={d} className="flex items-baseline gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
                        <span>{fmtDay(d, ctx.locale, { weekday: 'short' })}</span>
                        <span
                            className={cx(
                                'inline-flex size-6 items-center justify-center rounded-full text-sm tabular-nums',
                                d === ctx.today ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground'
                            )}
                            aria-current={d === ctx.today ? 'date' : undefined}
                        >
                            {Number(d.slice(8))}
                        </span>
                    </div>
                ))}
            </div>
            <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
                <div className="px-1 py-1 text-right text-[0.65rem] text-muted-foreground">
                    {hasAllDay ? 'All day' : ''}
                </div>
                {range.days.map((d, i) => (
                    <DayDrop
                        key={d}
                        id={`d|${d}`}
                        className="flex min-h-7 min-w-0 flex-col gap-0.5 border-l border-border p-0.5"
                        label={`${fmtDay(d, ctx.locale, { weekday: 'long', month: 'long', day: 'numeric' })}, all day`}
                    >
                        {allDay[i].map((e) => (
                            <EventChip key={e.id} event={e} day={d} ctx={ctx} variant="chip" placement="allday" />
                        ))}
                    </DayDrop>
                ))}
            </div>
            <div ref={scroller} className="overflow-y-auto" style={{ maxHeight: props.height }} data-rp-cal-scroller="">
                <div className="relative grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR_PX }}>
                    <div className="relative">
                        {hours.map((h) => (
                            <span
                                key={h}
                                className="absolute right-1.5 -translate-y-1/2 text-[0.65rem] text-muted-foreground tabular-nums"
                                style={{ top: h * HOUR_PX }}
                                aria-hidden="true"
                            >
                                {h ? hourLabel(h) : ''}
                            </span>
                        ))}
                    </div>
                    {range.days.map((d) => {
                        const placed = layoutDay(props.events, d, ctx.tz);
                        const now = Date.now();
                        const nowTop = d === ctx.today ? (secondsOf(now, ctx.tz) / 3600) * HOUR_PX : -1;
                        return (
                            <div
                                key={d}
                                className="relative border-l border-border"
                                role="group"
                                aria-label={fmtDay(d, ctx.locale, { weekday: 'long', month: 'long', day: 'numeric' })}
                            >
                                {slots.map((s) => (
                                    <DayDrop
                                        key={s}
                                        id={`s|${d}|${s}`}
                                        style={{ top: (s / 3600) * HOUR_PX, height: HOUR_PX / 2 }}
                                        className={cx(
                                            'absolute inset-x-0',
                                            s % 3600 === 0
                                                ? 'border-t border-border'
                                                : 'border-t border-dashed border-border/50'
                                        )}
                                    />
                                ))}
                                {placed.map((p) => (
                                    <div
                                        key={p.event.id}
                                        className="absolute px-0.5"
                                        style={{
                                            top: (p.top / 60) * HOUR_PX,
                                            height: Math.max(20, (p.height / 60) * HOUR_PX - 2),
                                            left: `${(p.col / p.cols) * 100}%`,
                                            width: `${100 / p.cols}%`,
                                        }}
                                    >
                                        <EventChip
                                            event={p.event}
                                            day={d}
                                            ctx={ctx}
                                            variant={p.height >= 45 ? 'block' : 'chip'}
                                            placement="timed"
                                        />
                                    </div>
                                ))}
                                {nowTop >= 0 ? (
                                    <div
                                        className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
                                        style={{ top: nowTop }}
                                        aria-hidden="true"
                                    />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function AgendaView(props: { range: CalendarRange; events: CalendarEvent[]; ctx: Ctx }) {
    const { ctx } = props;
    const days = props.range.days
        .map((d) => ({ day: d, list: eventsOnDay(props.events, d, ctx.tz) }))
        .filter((x) => x.list.length);
    if (!days.length)
        return (
            <p
                className="m-0 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
                data-rp-cal-empty=""
            >
                Nothing scheduled in these {props.range.days.length} days.
            </p>
        );
    return (
        <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Agenda">
            {days.map(({ day, list }) => (
                <li key={day} className="flex flex-col gap-1">
                    <h3
                        className={cx(
                            'sticky top-0 z-10 m-0 bg-background py-1 text-xs font-semibold tracking-wide uppercase',
                            day === ctx.today ? 'text-primary' : 'text-muted-foreground'
                        )}
                    >
                        {day === ctx.today ? 'Today · ' : ''}
                        {fmtDay(day, ctx.locale, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <ul className="m-0 flex list-none flex-col p-0">
                        {list.map((e) => (
                            <li key={e.id}>
                                <EventChip event={e} day={day} ctx={ctx} variant="row" placement="agenda" />
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ol>
    );
}

/** Preview (Studio): the change schedule of the current month (read-only). */
export default function CalendarViewPreview() {
    return (
        <div className="p-4">
            <CalendarView
                table="change_request"
                startField="start_date"
                endField="end_date"
                titleField="short_description"
                colorField="type"
            />
        </div>
    );
}
