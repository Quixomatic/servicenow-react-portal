import { useMemo } from 'react';
import { usePortal, usePortalLocation, Link } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { Icon } from 'components:icon';
import { useRecordValues, useTableMeta } from 'utilities:app/graphql';
import { RecordActivity, ActivityConversation } from 'components:app/activity-stream';
import type { ActivityKind } from 'utilities:app/activity';

/**
 * components:app/activity-card: a record's conversation as a placeable card (Service Portal's
 * "Ticket conversations"): the journal composer and the activity stream, stacked.
 *
 * The record comes from the options, else the route params, else the URL params (table, sys_id),
 * so a ticket page can place it next to app/record-form. Options:
 *   { table, sysId, title, showRecord, composer, journalFields, defaultJournalField, kinds,
 *     showFilters, pageSize, recordPage }
 * journalFields / kinds are comma lists ('comments' gives a requester-style conversation).
 *
 * variant (presentation, James is comparing them; nothing decided):
 *   timeline      composer on top, filter chips, day headings, full entries (default)
 *   conversation  chat bubbles, oldest first, composer at the bottom (Ticket conversations);
 *                 defaults to comments + attachments
 *   compact       a narrow side-panel: small entries, no day headings or filters, 2-line composer
 */
type Options = {
    variant?: 'timeline' | 'conversation' | 'compact';
    table?: string;
    sysId?: string;
    title?: string;
    showRecord?: boolean;
    composer?: boolean;
    journalFields?: string;
    defaultJournalField?: string;
    kinds?: string;
    showFilters?: boolean;
    pageSize?: number;
    recordPage?: string;
};

const NAME = /^[a-z0-9_]+$/i;
const REAL_ID = /^[0-9a-f]{32}$/i;
const KINDS = ['journal', 'audit', 'attachment', 'email', 'relation', 'other'];

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v);
    return '';
}
function list(v: unknown): string[] {
    return String(v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function ActivityCard({ options = {} }: { options?: Options }) {
    const location = usePortalLocation() as any;
    const portal = usePortal() as any;
    const loc = location || {};
    const query = loc.params && typeof loc.params === 'object' ? loc.params : {};
    const route = (portal && portal.page && portal.page.params) || {};
    const rawTable = pick(options.table, route.table, loc.table, query.table, 'incident');
    const table = NAME.test(rawTable) ? rawTable : 'incident';
    const sysId = pick(options.sysId, route.sys_id, route.sysId, loc.sysId, query.sys_id);
    const journalFields = list(options.journalFields).filter((f) => NAME.test(f));
    const kinds = list(options.kinds).filter((k) => KINDS.indexOf(k) >= 0) as ActivityKind[];
    const title = options.title === undefined ? 'Activity' : options.title;
    const variant = options.variant === 'conversation' || options.variant === 'compact' ? options.variant : 'timeline';
    const meta = useTableMeta(table);
    const headerFields = useMemo(
        () => (meta.data ? ['number', 'short_description', 'name'].filter((f) => !!meta.data![f]) : []),
        [meta.data]
    );
    const record = useRecordValues(table, REAL_ID.test(sysId) ? sysId : undefined, headerFields, {
        enabled: options.showRecord !== false && headerFields.length > 0,
    });
    const v = record.data || {};
    const number = (v.number && v.number.displayValue) || '';
    const summary = (v.short_description && v.short_description.displayValue) || (v.name && v.name.displayValue) || '';
    const recordPage = options.recordPage === undefined ? 'form' : options.recordPage;
    const hasPage =
        !!recordPage &&
        !!(
            portal &&
            portal.pages &&
            portal.pages.some((p: any) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(recordPage) >= 0)
        );

    if (!REAL_ID.test(sysId)) {
        return (
            <Card data-rp-activity-card="">
                <CardContent className="text-sm text-muted-foreground">Open a record to see its activity.</CardContent>
            </Card>
        );
    }
    const recordLine =
        options.showRecord !== false && (number || summary) ? (
            <p className="m-0 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                <Icon name="ticket" className="size-3.5 shrink-0" aria-hidden="true" />
                {hasPage ? (
                    <Link
                        to={recordPage}
                        table={table}
                        sysId={sysId}
                        className="truncate font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        {number || summary}
                    </Link>
                ) : (
                    <span className="truncate font-medium text-foreground">{number || summary}</span>
                )}
                {number && summary ? <span className="truncate">· {summary}</span> : null}
            </p>
        ) : null;
    return (
        <Card data-rp-activity-card={`${table}:${sysId}`}>
            {title || recordLine ? (
                <CardHeader className="gap-1">
                    {title ? <h2 className="m-0 text-base font-semibold text-foreground">{title}</h2> : null}
                    {recordLine}
                </CardHeader>
            ) : null}
            <CardContent>
                {variant === 'conversation' ? (
                    <ActivityConversation
                        table={table}
                        sysId={sysId}
                        composer={options.composer !== false}
                        journalFields={journalFields.length ? journalFields : undefined}
                        kinds={kinds.length ? kinds : undefined}
                        pageSize={options.pageSize || 20}
                    />
                ) : (
                    <RecordActivity
                        table={table}
                        sysId={sysId}
                        composer={options.composer !== false}
                        journalFields={journalFields.length ? journalFields : undefined}
                        defaultJournalField={options.defaultJournalField || undefined}
                        kinds={kinds.length ? kinds : undefined}
                        showFilters={
                            options.showFilters === undefined ? variant !== 'compact' : options.showFilters !== false
                        }
                        pageSize={options.pageSize || 10}
                        title={title ? '' : 'Activity'}
                        headingLevel={3}
                        compact={variant === 'compact'}
                        groupByDay={variant !== 'compact'}
                        composerRows={variant === 'compact' ? 2 : undefined}
                    />
                )}
            </CardContent>
        </Card>
    );
}
