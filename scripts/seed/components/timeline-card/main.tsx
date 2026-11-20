import { useNavigate, usePortal, usePortalLocation } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { Timeline, useHistoryTimeline, useRecordsTimeline } from 'components:app/timeline';
import type { ActivityKind } from 'utilities:app/activity';

/**
 * components:app/timeline-card: a placeable vertical timeline (app/timeline).
 *
 * mode 'history': a record's history (journal, field changes, attachments, emails); the record comes
 *   from the options, else the route / URL params (table, sys_id). Options: kinds (comma list), limit.
 * mode 'records': records of a table placed by a date field (milestones, changes, …). Options:
 *   table, query, dateField, titleField, descriptionField, toneField, icon, order, limit, recordPage.
 */
type Options = {
    title?: string;
    mode?: 'history' | 'records';
    table?: string;
    sysId?: string;
    kinds?: string;
    query?: string;
    dateField?: string;
    titleField?: string;
    descriptionField?: string;
    toneField?: string;
    icon?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    dense?: boolean;
    recordPage?: string;
};

const NAME = /^[a-z0-9_]+$/i;
const REAL_ID = /^[0-9a-f]{32}$/i;
const KINDS = ['journal', 'audit', 'attachment', 'email', 'relation', 'other'];

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v);
    return '';
}
function name(v: unknown): string | undefined {
    const s = String(v || '').trim();
    return NAME.test(s) ? s : undefined;
}

function History(props: { table: string; sysId: string; options: Options }) {
    const kinds = String(props.options.kinds || '')
        .split(',')
        .map((s) => s.trim())
        .filter((k) => KINDS.indexOf(k) >= 0) as ActivityKind[];
    const h = useHistoryTimeline(props.table, props.sysId, { kinds, limit: props.options.limit || 50 });
    return (
        <Timeline
            items={h.items}
            isLoading={h.isLoading}
            error={h.error}
            dense={!!props.options.dense}
            label="History"
            emptyText="No history yet."
        />
    );
}

function Records(props: { options: Options; onOpen?: (t: string, id: string) => void }) {
    const o = props.options;
    const r = useRecordsTimeline({
        table: name(o.table) || 'change_request',
        query: o.query || '',
        dateField: name(o.dateField) || 'start_date',
        titleField: name(o.titleField),
        descriptionField: name(o.descriptionField),
        toneField: name(o.toneField),
        icon: o.icon || undefined,
        order: o.order === 'asc' ? 'asc' : 'desc',
        limit: o.limit || 30,
        onOpen: props.onOpen,
    });
    return (
        <Timeline
            items={r.items}
            isLoading={r.isLoading}
            error={r.error}
            order={o.order === 'asc' ? 'asc' : 'desc'}
            dense={!!o.dense}
            label="Timeline"
        />
    );
}

export default function TimelineCard({ options = {} }: { options?: Options }) {
    const navigate = useNavigate();
    const location = (usePortalLocation() as any) || {};
    const portal = usePortal() as any;
    const query = location.params && typeof location.params === 'object' ? location.params : {};
    const route = (portal && portal.page && portal.page.params) || {};
    const recordPage = options.recordPage === undefined ? 'form' : options.recordPage;
    const onOpen = recordPage ? (t: string, sysId: string) => navigate(recordPage, { table: t, sysId }) : undefined;
    const mode = options.mode === 'records' ? 'records' : 'history';
    const table = name(pick(options.table, route.table, location.table, query.table)) || 'incident';
    const sysId = pick(options.sysId, route.sys_id, route.sysId, location.sysId, query.sys_id);
    const title = options.title === undefined ? (mode === 'history' ? 'History' : 'Timeline') : options.title;
    return (
        <Card data-rp-timeline-card={mode}>
            {title ? (
                <CardHeader>
                    <h2 className="m-0 text-base font-semibold">{title}</h2>
                </CardHeader>
            ) : null}
            <CardContent>
                {mode === 'records' ? (
                    <Records options={options} onOpen={onOpen} />
                ) : REAL_ID.test(sysId) ? (
                    <History table={table} sysId={sysId} options={options} />
                ) : (
                    <p className="m-0 text-sm text-muted-foreground">Open a record to see its history.</p>
                )}
            </CardContent>
        </Card>
    );
}
