/**
 * components:app/timeline: a vertical timeline (Next Experience's sn-component-timeline, as a list):
 * dated items with an icon, title, description and actions, grouped by the user's calendar day.
 *
 *   <Timeline items={items} groupBy="day" order="desc" />
 *   const t = useRecordsTimeline({ table: 'pm_project_task', query, dateField: 'end_date',
 *                                  titleField: 'short_description', descriptionField: 'description' })
 *   const h = useHistoryTimeline('incident', sysId)         a record's history (utilities:app/activity:
 *                                                            journal, field changes, attachments, emails)
 *   activityToTimelineItem(entry)                           one activity entry → TimelineItem
 *   groupTimeline(items, { order, timeZone, locale })       [{ key, label, items }] by day
 *
 * TimelineItem: { id, at (epoch ms), title, description?, icon? (lucide name), tone? (highlighted-value
 * tone), meta? (author, number…), actions? (nodes), onSelect? (makes the title a button) }.
 * Times are in the user's time zone and time format; day headings say Today / Yesterday / weekday /
 * date. The list is an <ol> with headings per day, so screen readers get the structure; dots are
 * decorative. Records and history are read as the user and live (record watch / activity AMB).
 */
import { useMemo } from 'react';
import { useRecordWatch } from '@portal/runtime';
import { useList } from 'utilities:app/list-data';
import { useActivity, dayKey, dayLabel, relativeTime, useNow } from 'utilities:app/activity';
import type { ActivityEntry, ActivityKind } from 'utilities:app/activity';
import {
    useUserTimeZone,
    useUserFormats,
    useLocale,
    formatTime,
    zonedParts,
    parseGlideDateTime,
} from 'utilities:app/datetime';
import { htmlToText } from 'components:rich-text';
import { Icon } from 'components:icon';
import type { HighlightTone } from 'components:app/highlighted-value';
import { toneFor } from 'components:app/highlighted-value';
import { cx, Spinner } from 'components:app/field';

export type TimelineItem = {
    id: string;
    /** Epoch ms. */
    at: number;
    title: any;
    description?: any;
    /** A lucide icon name (components:icon). */
    icon?: string;
    tone?: HighlightTone;
    /** Small text after the time (author, record number). */
    meta?: string;
    actions?: any;
    /** Makes the title a button. */
    onSelect?: () => void;
};

export type TimelineGroup = { key: string; label: string; items: TimelineItem[] };

const DOT: Record<HighlightTone, string> = {
    neutral: 'bg-muted text-muted-foreground ring-border',
    info: 'bg-primary/10 text-primary ring-primary/30',
    progress: 'bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-300',
    warning: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
    high: 'bg-orange-500/12 text-orange-700 ring-orange-500/30 dark:text-orange-300',
    success: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
    danger: 'bg-destructive/10 text-destructive ring-destructive/30',
};

/** Items grouped by the user's day (order 'desc' = newest first). */
export function groupTimeline(
    items: TimelineItem[],
    o: { order?: 'asc' | 'desc'; timeZone?: string; locale?: string; now?: number } = {}
): TimelineGroup[] {
    const sorted = items
        .filter((i) => Number.isFinite(i.at))
        .slice()
        .sort((a, b) => (o.order === 'asc' ? a.at - b.at : b.at - a.at));
    const now = o.now || Date.now();
    const out: TimelineGroup[] = [];
    for (const it of sorted) {
        const key = dayKey(it.at, o.timeZone);
        let g = out.length ? out[out.length - 1] : null;
        if (!g || g.key !== key) {
            g = { key, label: dayLabel(key, now, o.timeZone, o.locale), items: [] };
            out.push(g);
        }
        g.items.push(it);
    }
    return out;
}

export type TimelineProps = {
    items: TimelineItem[];
    /** Day headings (default) or one flat list. */
    groupBy?: 'day' | 'none';
    order?: 'asc' | 'desc';
    /** Smaller items, no descriptions. */
    dense?: boolean;
    /** Show "3 hours ago" next to the time. */
    relative?: boolean;
    isLoading?: boolean;
    error?: Error | null;
    emptyText?: string;
    /** Accessible name of the list. */
    label?: string;
    className?: string;
};

/** The timeline. */
export function Timeline(props: TimelineProps) {
    const tz = useUserTimeZone();
    const locale = useLocale();
    const formats = useUserFormats();
    const now = useNow(60_000);
    const groups = useMemo(() => {
        if (props.groupBy === 'none') {
            const items = props.items.slice().sort((a, b) => (props.order === 'asc' ? a.at - b.at : b.at - a.at));
            return [{ key: 'all', label: '', items }];
        }
        return groupTimeline(props.items, { order: props.order, timeZone: tz, locale, now });
    }, [props.items, props.groupBy, props.order, tz, locale, Math.floor(now / 3_600_000)]);
    const timeOf = (ms: number) => {
        const p = zonedParts(ms, tz);
        return formatTime(p.h * 3600 + p.mi * 60, formats.time || 'HH:mm', { locale });
    };
    if (props.error)
        return (
            <p role="alert" className={cx('m-0 text-sm text-destructive', props.className)}>
                {props.error.message}
            </p>
        );
    if (props.isLoading && !props.items.length)
        return (
            <div
                className={cx('flex items-center gap-2 text-sm text-muted-foreground', props.className)}
                aria-busy="true"
            >
                <Spinner label="Loading" /> Loading…
            </div>
        );
    if (!props.items.length)
        return (
            <p className={cx('m-0 text-sm text-muted-foreground', props.className)} data-rp-timeline-empty="">
                {props.emptyText || 'Nothing to show yet.'}
            </p>
        );
    return (
        <div className={cx('flex min-w-0 flex-col gap-4', props.className)} data-rp-timeline="">
            {groups.map((g) => (
                <section key={g.key} className="flex min-w-0 flex-col gap-2" aria-label={g.label || props.label}>
                    {g.label ? (
                        <h3
                            className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                            data-rp-timeline-day={g.key}
                        >
                            {g.label}
                        </h3>
                    ) : null}
                    <ol
                        className="relative m-0 flex list-none flex-col p-0"
                        aria-label={props.label ? `${props.label}, ${g.label}` : g.label}
                    >
                        {g.items.map((it, i) => {
                            const last = i === g.items.length - 1;
                            const tone = it.tone || 'neutral';
                            return (
                                <li
                                    key={it.id}
                                    className="relative flex min-w-0 gap-3 pb-4 last:pb-0"
                                    data-rp-timeline-item={it.id}
                                >
                                    {!last ? (
                                        <span
                                            className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-border"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    <span
                                        className={cx(
                                            'relative z-[1] flex shrink-0 items-center justify-center rounded-full ring-1',
                                            props.dense ? 'mt-0.5 size-6 left-1' : 'size-8',
                                            DOT[tone]
                                        )}
                                        aria-hidden="true"
                                    >
                                        <Icon
                                            name={it.icon || 'circle-dot'}
                                            className={props.dense ? 'size-3' : 'size-4'}
                                        />
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                                        <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                                            <time dateTime={new Date(it.at).toISOString()} className="tabular-nums">
                                                {timeOf(it.at)}
                                            </time>
                                            {props.relative ? <span>{relativeTime(it.at, now, locale)}</span> : null}
                                            {it.meta ? <span className="truncate">{it.meta}</span> : null}
                                        </p>
                                        {it.onSelect ? (
                                            <button
                                                type="button"
                                                onClick={it.onSelect}
                                                className="m-0 cursor-pointer self-start rounded-sm text-left text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                {it.title}
                                            </button>
                                        ) : (
                                            <p className="m-0 text-sm font-medium text-foreground">{it.title}</p>
                                        )}
                                        {it.description && !props.dense ? (
                                            <div className="m-0 text-sm break-words text-muted-foreground">
                                                {it.description}
                                            </div>
                                        ) : null}
                                        {it.actions ? (
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5">{it.actions}</div>
                                        ) : null}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </div>
    );
}

export type UseRecordsTimelineOptions = {
    table: string;
    query?: string;
    /** The date / date-time field that places each record. */
    dateField: string;
    titleField?: string;
    descriptionField?: string;
    /** Colour each item by this field's value (state, priority…; highlighted-value tones). */
    toneField?: string;
    /** One icon for every item (default 'flag'). */
    icon?: string;
    /** Records shown (default 50), newest dateField first unless order 'asc'. */
    limit?: number;
    order?: 'asc' | 'desc';
    /** Title click. */
    onOpen?: (table: string, sysId: string) => void;
    live?: boolean;
};

/** Records as timeline items (read as the user, live). */
export function useRecordsTimeline(o: UseRecordsTimelineOptions) {
    const cols = [o.dateField, o.titleField, o.descriptionField, o.toneField].filter(Boolean) as string[];
    const list = useList(
        {
            table: o.table,
            columns: Array.from(new Set(cols)).join(','),
            query: [o.query || '', `${o.dateField}ISNOTEMPTY`].filter(Boolean).join('^'),
            orderBy: [{ field: o.dateField, desc: o.order !== 'asc' }],
            limit: o.limit || 50,
        },
        { enabled: !!o.table && !!o.dateField }
    );
    useRecordWatch(o.table, o.query || '', undefined, { enabled: o.live !== false && !!o.table });
    const items = useMemo<TimelineItem[]>(
        () =>
            list.rows.map((r) => {
                const v = r.cells[o.dateField] ? r.cells[o.dateField].value : '';
                const at = /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(v + 'T12:00:00Z') : parseGlideDateTime(v);
                const title =
                    (o.titleField && r.cells[o.titleField] && r.cells[o.titleField].displayValue) || r.display;
                const desc =
                    o.descriptionField && r.cells[o.descriptionField] ? r.cells[o.descriptionField].displayValue : '';
                const t = o.toneField && r.cells[o.toneField];
                return {
                    id: r.sysId,
                    at,
                    title,
                    description: desc ? htmlToText(desc) : undefined,
                    icon: o.icon || 'flag',
                    tone:
                        t && t.value
                            ? toneFor(t.displayValue || t.value, { field: o.toneField, value: t.value })
                            : undefined,
                    meta: r.display && r.display !== title ? r.display : t ? t.displayValue : undefined,
                    onSelect: o.onOpen ? () => o.onOpen!(r.className || o.table, r.sysId) : undefined,
                };
            }),
        [list.rows, o.dateField, o.titleField, o.descriptionField, o.toneField, o.icon]
    );
    return { items, count: list.count, isLoading: list.isLoading, error: list.error };
}

const KIND_ICON: Record<ActivityKind, string> = {
    journal: 'message-square',
    audit: 'pencil',
    attachment: 'paperclip',
    email: 'mail',
    relation: 'link',
    other: 'circle-dot',
};

function changeTone(e: ActivityEntry): HighlightTone {
    if (e.initial) return 'info';
    const state = (e.changes || []).find(
        (c) => c.field === 'state' || c.field === 'incident_state' || c.field === 'stage'
    );
    return state ? toneFor(state.newValue, { field: state.field }) : 'neutral';
}

/** One activity entry (utilities:app/activity) as a timeline item. */
export function activityToTimelineItem(e: ActivityEntry): TimelineItem {
    const who = e.author ? e.author.displayName : e.createdBy;
    let title: any = e.title;
    let description: any;
    if (e.kind === 'audit') {
        const changes = e.changes || [];
        title = e.initial
            ? 'Created'
            : changes.length === 1
              ? `${changes[0].label} changed`
              : `${changes.length} fields changed`;
        description = changes.length ? (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {changes.slice(0, 6).map((c) => (
                    <li key={c.field} className="min-w-0 truncate">
                        <span className="text-foreground">{c.label}</span>
                        {': '}
                        {c.oldValue ? (
                            <>
                                <span className="line-through decoration-muted-foreground/60">{c.oldValue}</span>
                                {' → '}
                            </>
                        ) : null}
                        <span className="text-foreground">{c.newValue || '(empty)'}</span>
                    </li>
                ))}
                {changes.length > 6 ? <li>{`and ${changes.length - 6} more`}</li> : null}
            </ul>
        ) : undefined;
    } else if (e.kind === 'journal') {
        const text = htmlToText(e.content || '');
        description = <p className="m-0 line-clamp-4 whitespace-pre-line">{text}</p>;
    } else if (e.kind === 'attachment' && e.attachment) {
        title = e.attachment.removed ? 'Attachment removed' : 'Attachment added';
        description = e.attachment.fileName;
    } else if (e.kind === 'email' && e.email) {
        title = e.email.type === 'received' ? 'Email received' : 'Email sent';
        description = e.email.subject;
    }
    return {
        id: e.key,
        at: e.createdAt,
        title,
        description,
        icon: e.kind === 'audit' && e.initial ? 'sparkles' : KIND_ICON[e.kind] || 'circle-dot',
        tone: e.kind === 'audit' ? changeTone(e) : e.kind === 'journal' ? 'info' : 'neutral',
        meta: who,
    };
}

/** A record's history as timeline items (activity stream data: journal, changes, attachments, emails). */
export function useHistoryTimeline(
    table: string | undefined,
    sysId: string | undefined,
    o: { kinds?: ActivityKind[]; limit?: number; live?: boolean } = {}
) {
    const a = useActivity(table, sysId, { live: o.live, enabled: !!table && !!sysId });
    const items = useMemo(() => {
        const list = a.allEntries.filter((e) => !o.kinds || !o.kinds.length || o.kinds.indexOf(e.kind) >= 0);
        return list.slice(0, o.limit || 100).map(activityToTimelineItem);
    }, [a.allEntries, (o.kinds || []).join(','), o.limit]);
    return { items, isLoading: a.loading, error: (a as any).error || null };
}

/** Preview (Studio): a static example. */
export default function TimelinePreview() {
    const now = Date.now();
    const items: TimelineItem[] = [
        {
            id: '1',
            at: now - 3_600_000,
            title: 'Moved to In Progress',
            icon: 'pencil',
            tone: 'progress',
            meta: 'Beth Anglin',
        },
        {
            id: '2',
            at: now - 5 * 3_600_000,
            title: 'Work note',
            description: 'Checked the switch logs.',
            icon: 'message-square',
            tone: 'info',
        },
        {
            id: '3',
            at: now - 30 * 3_600_000,
            title: 'Created',
            icon: 'sparkles',
            tone: 'info',
            meta: 'System Administrator',
        },
    ];
    return (
        <div className="max-w-md p-4">
            <Timeline items={items} label="Example" />
        </div>
    );
}
