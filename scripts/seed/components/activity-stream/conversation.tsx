import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@portal/runtime';
import { RichText } from 'components:rich-text';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { cx, Spinner } from 'components:app/field';
import { useActivity, groupByDay, relativeTime, useNow } from 'utilities:app/activity';
import type { ActivityEntry, ActivityKind } from 'utilities:app/activity';
import { useUserTimeZone, useLocale } from 'utilities:app/datetime';
import { JournalComposer } from 'components:app/journal-composer';
import { isInternalJournalField } from 'components:app/journal-field';
import { ActivityAvatar, AttachmentBody, FieldChanges, entryLabel } from './entry';

export type ActivityConversationProps = {
    table: string;
    sysId: string;
    /** Entry kinds shown (default journal + attachment: a requester's view). */
    kinds?: ActivityKind[];
    /** Journal fields shown and offered (default: comments only). */
    journalFields?: string[];
    /** Show the composer at the bottom (default true). */
    composer?: boolean;
    /** Messages shown before "Show earlier" (default 20). */
    pageSize?: number;
    /** Height of the scrolling log (CSS length, default 28rem). */
    maxHeight?: string;
    className?: string;
};

/**
 * A record's activity as a chat-style conversation (Service Portal "Ticket conversations"):
 * oldest first, your own messages on the right, others on the left with avatars, field changes
 * as quiet system lines, the composer at the bottom. role="log" (new messages are announced by
 * the log; the region scrolls with the keyboard).
 */
export function ActivityConversation(props: ActivityConversationProps) {
    const { table, sysId } = props;
    const kinds = props.kinds || (['journal', 'attachment'] as ActivityKind[]);
    const journalFields = props.journalFields || ['comments'];
    const filters = useMemo(() => ({ kinds, journalFields }), [kinds.join(','), journalFields.join(',')]);
    const activity = useActivity(table, sysId, { filters });
    const user = useUser() as any;
    const me = (user && user.userName) || '';
    const now = useNow(60_000);
    const tz = useUserTimeZone();
    const locale = useLocale();
    const pageSize = props.pageSize || 20;
    const [shown, setShown] = useState(pageSize);
    const log = useRef<HTMLDivElement | null>(null);
    const stick = useRef(true);
    // Newest last: the latest `shown` entries, chronological.
    const ordered = activity.entries.slice(0, shown).slice().reverse();
    // groupByDay groups consecutive entries, so chronological order works as well.
    const groups = groupByDay(ordered, { now, timeZone: tz, locale });
    const last = ordered.length ? ordered[ordered.length - 1].key : '';
    // Keep the view at the bottom when new messages arrive (unless the user scrolled up).
    useLayoutEffect(() => {
        const el = log.current;
        if (el && stick.current) el.scrollTop = el.scrollHeight;
    }, [last, activity.loading]);
    useEffect(() => setShown(pageSize), [pageSize]);

    return (
        <div
            className={cx('flex min-w-0 flex-col gap-3', props.className)}
            data-rp-activity-conversation={`${table}:${sysId}`}
        >
            <div
                ref={log}
                role="log"
                aria-label="Conversation"
                aria-busy={activity.fetching}
                tabIndex={0}
                onScroll={(e) => {
                    const el = e.currentTarget;
                    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                }}
                className="flex flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                style={{ maxHeight: props.maxHeight || '28rem', minHeight: '10rem' }}
            >
                {activity.loading ? (
                    <div className="flex flex-1 items-center justify-center py-8 text-muted-foreground">
                        <Spinner label="Loading the conversation" />
                    </div>
                ) : activity.error ? (
                    <p role="alert" className="text-sm text-destructive">
                        The conversation could not be loaded.
                    </p>
                ) : !ordered.length ? (
                    <p className="m-auto py-8 text-center text-sm text-muted-foreground" data-rp-activity-empty="">
                        No messages yet. Start the conversation below.
                    </p>
                ) : (
                    <>
                        {shown < activity.entries.length ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="self-center"
                                onClick={() => setShown(shown + pageSize)}
                                data-rp-activity-earlier=""
                            >
                                Show earlier messages
                            </Button>
                        ) : null}
                        {groups.map((g) => (
                            <Fragment key={g.key}>
                                <div
                                    aria-hidden="true"
                                    className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground"
                                >
                                    <span className="h-px flex-1 bg-border" />
                                    {g.label}
                                    <span className="h-px flex-1 bg-border" />
                                </div>
                                {g.entries.map((e) => (
                                    <Message
                                        key={e.key}
                                        entry={e}
                                        mine={!!me && e.createdBy === me}
                                        now={now}
                                        locale={locale}
                                        fresh={activity.arrived.indexOf(e.key) >= 0}
                                    />
                                ))}
                            </Fragment>
                        ))}
                    </>
                )}
            </div>
            {props.composer !== false ? (
                <JournalComposer
                    table={table}
                    sysId={sysId}
                    fields={journalFields}
                    rows={2}
                    label="Reply"
                    placeholder="Write a reply…"
                    onPosted={() => {
                        stick.current = true;
                    }}
                />
            ) : null}
        </div>
    );
}

function Message({
    entry,
    mine,
    now,
    locale,
    fresh,
}: {
    entry: ActivityEntry;
    mine: boolean;
    now: number;
    locale?: string;
    fresh: boolean;
}) {
    const when = relativeTime(entry.createdAt, now, locale);
    if (entry.kind === 'audit' || entry.kind === 'relation' || entry.kind === 'other') {
        return (
            <article
                aria-label={`${entryLabel(entry)} by ${entry.author.displayName}, ${when}`}
                className="mx-auto flex max-w-[90%] flex-col items-center gap-1 text-center text-xs text-muted-foreground"
                data-rp-activity-entry={entry.kind}
            >
                <span>
                    <span className="font-medium text-foreground">{entry.author.displayName}</span> ·{' '}
                    {entryLabel(entry).toLowerCase()} · <time title={entry.createdAtDisplay}>{when}</time>
                </span>
                {entry.kind === 'audit' ? <FieldChanges entry={entry} /> : null}
            </article>
        );
    }
    const internal = entry.kind === 'journal' && isInternalJournalField(entry.field || '');
    return (
        <article
            aria-label={`${mine ? 'You' : entry.author.displayName}, ${entryLabel(entry)}, ${when}`}
            className={cx('flex max-w-[88%] items-end gap-2', mine ? 'flex-row-reverse self-end' : 'self-start')}
            data-rp-activity-entry={entry.kind}
            data-rp-activity-field={entry.field || undefined}
            data-rp-mine={mine ? '' : undefined}
        >
            {!mine ? <ActivityAvatar user={entry.author} size="sm" /> : null}
            <div className={cx('flex min-w-0 flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                    {!mine ? <span className="font-medium text-foreground">{entry.author.displayName}</span> : null}
                    {internal ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-300">
                            <Icon name="lock" className="size-3" aria-hidden="true" /> Work note
                        </span>
                    ) : null}
                    <time title={entry.createdAtDisplay}>{when}</time>
                </div>
                <div
                    className={cx(
                        'min-w-0 rounded-2xl px-3 py-2 text-sm shadow-xs transition-shadow duration-700',
                        internal
                            ? 'border border-amber-500/40 bg-amber-500/10 text-foreground'
                            : mine
                              ? 'rounded-br-md bg-primary text-primary-foreground'
                              : 'rounded-bl-md border border-border bg-card text-foreground',
                        mine && !internal
                            ? '[&_a]:text-primary-foreground [&_a]:underline [&_.text-muted-foreground]:text-primary-foreground/80'
                            : '',
                        fresh ? 'ring-2 ring-primary/40' : ''
                    )}
                >
                    {entry.kind === 'journal' ? (
                        <RichText
                            html={entry.content || ''}
                            size="sm"
                            className={cx(
                                'break-words whitespace-pre-wrap',
                                mine && !internal ? 'text-primary-foreground' : ''
                            )}
                        />
                    ) : null}
                    {entry.kind === 'attachment' ? <AttachmentBody entry={entry} /> : null}
                    {entry.kind === 'email' ? <span>{entry.email ? entry.email.subject || '(email)' : ''}</span> : null}
                </div>
            </div>
        </article>
    );
}
