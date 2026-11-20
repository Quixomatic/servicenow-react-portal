import { Link, useUser, useRecordWatch, useHistoryState } from '@portal/runtime';
import { useQuery, keepPreviousData } from 'utilities:react-query';
import { Card } from 'components:card';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { Skeleton } from 'components:skeleton';
import { Tabs, TabsList, TabsTrigger } from 'components:tabs';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from 'components:empty';
import { cx } from 'components:app/field';
import { HighlightedValue } from 'components:app/highlighted-value';
import { getWithTotal, cleanText, catalogIcon, ME_DYNAMIC } from 'utilities:app/search';

export type MyItemKind = 'requests' | 'incidents' | 'approvals';

export type MyItem = {
    id: string;
    kind: MyItemKind;
    table: string;
    title: string;
    number: string;
    subtitle: string;
    state: string;
    updated: string;
    icon: string;
};

type KindDef = {
    label: string;
    /** Singular noun for empty states. */
    noun: string;
    icon: string;
    table: string;
    /** The list page's query (platform dynamic filter "Me", so list URLs and menus share it). */
    listQuery: string;
    listTitle: string;
    /** The widget's own query for a user sys_id (AMB watches need a literal value). */
    query: (uid: string) => string;
    fields: string;
    order: string;
    map: (r: any) => MyItem;
    empty: {
        title: string;
        body: string;
        action?: { label: string; to: string; icon: string; q?: Record<string, string> };
    };
};

const dv = (f: any) => (f && typeof f === 'object' ? String(f.display_value || '') : String(f || ''));
const v = (f: any) => (f && typeof f === 'object' ? String(f.value || '') : String(f || ''));

/** The three kinds: the user's open requested items, open incidents and pending approvals. */
export const MY_ITEM_KINDS: Record<MyItemKind, KindDef> = {
    requests: {
        label: 'Requests',
        noun: 'request',
        icon: 'package',
        table: 'sc_req_item',
        listQuery: `active=true^requested_for${ME_DYNAMIC}^ORopened_by${ME_DYNAMIC}`,
        listTitle: 'My requests',
        query: (uid) => `active=true^requested_for=${uid}^ORopened_by=${uid}`,
        fields: 'sys_id,number,cat_item,short_description,stage,state,sys_updated_on',
        order: 'ORDERBYDESCsys_updated_on',
        map: (r) => {
            const item = dv(r.cat_item);
            return {
                id: v(r.sys_id),
                kind: 'requests',
                table: 'sc_req_item',
                title: cleanText(item || dv(r.short_description) || v(r.number)),
                number: v(r.number),
                subtitle: '',
                state: dv(r.stage) || dv(r.state),
                updated: v(r.sys_updated_on),
                icon: catalogIcon(item),
            };
        },
        empty: {
            title: 'No open requests',
            body: 'Things you order from the catalog show up here until they are delivered.',
            action: { label: 'Request something', to: 'catalog', icon: 'store' },
        },
    },
    incidents: {
        label: 'Incidents',
        noun: 'incident',
        icon: 'life-buoy',
        table: 'incident',
        listQuery: `active=true^caller_id${ME_DYNAMIC}^ORopened_by${ME_DYNAMIC}`,
        listTitle: 'My incidents',
        query: (uid) => `active=true^caller_id=${uid}^ORopened_by=${uid}`,
        fields: 'sys_id,number,short_description,state,priority,sys_updated_on',
        order: 'ORDERBYDESCsys_updated_on',
        map: (r) => ({
            id: v(r.sys_id),
            kind: 'incidents',
            table: 'incident',
            title: cleanText(dv(r.short_description) || v(r.number)),
            number: v(r.number),
            subtitle: '',
            state: dv(r.state),
            updated: v(r.sys_updated_on),
            icon: 'life-buoy',
        }),
        empty: {
            title: 'No open incidents',
            body: 'Issues you report stay here while the service desk works on them.',
            action: {
                label: 'Report an issue',
                to: 'catalog',
                icon: 'triangle-alert',
                q: { item: '38c1fc840a0a0b2700285921c2bf5fc8' },
            },
        },
    },
    approvals: {
        label: 'Approvals',
        noun: 'approval',
        icon: 'stamp',
        table: 'sysapproval_approver',
        listQuery: `approver${ME_DYNAMIC}^state=requested`,
        listTitle: 'My approvals',
        query: (uid) => `approver=${uid}^state=requested`,
        fields: 'sys_id,state,document_id,source_table,sysapproval,sysapproval.short_description,sys_created_on,sys_updated_on',
        order: 'ORDERBYDESCsys_created_on',
        map: (r) => {
            const doc = dv(r.document_id) || dv(r.sysapproval);
            return {
                id: v(r.sys_id),
                kind: 'approvals',
                table: 'sysapproval_approver',
                title: cleanText(dv(r['sysapproval.short_description']) || doc),
                number: dv(r.sysapproval),
                subtitle: doc.indexOf(':') > 0 ? doc.slice(0, doc.indexOf(':')) : '',
                state: dv(r.state) || 'Requested',
                updated: v(r.sys_created_on),
                icon: 'stamp',
            };
        },
        empty: { title: "You're all caught up", body: 'Nothing is waiting for your approval right now.' },
    },
};

/** "3m ago", "5h ago", "2d ago", or a date: from a UTC 'YYYY-MM-DD HH:mm:ss' value. */
export function relativeTime(utc: string, now = Date.now()): string {
    if (!utc) return '';
    const t = Date.parse(utc.replace(' ', 'T') + 'Z');
    if (isNaN(t)) return '';
    const s = Math.round((now - t) / 1000);
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(t).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d > 300 ? 'numeric' : undefined,
    });
}

/**
 * The current user's items of one kind, with the total (X-Total-Count), as the user (ACLs apply).
 * live: an AMB watch on the same filter refetches when a matching record changes.
 */
export function useMyItems(kind: MyItemKind, options: { limit?: number; live?: boolean; enabled?: boolean } = {}) {
    const user = useUser() as any;
    const uid = String((user && user.sysId) || '');
    const def = MY_ITEM_KINDS[kind];
    const limit = Math.max(1, Math.min(50, options.limit || 5));
    const filter = uid ? def.query(uid) : '';
    const enabled = options.enabled !== false && !!uid;
    const q = useQuery({
        queryKey: ['rp-my-items', kind, uid, limit],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const url = `/api/now/table/${def.table}?sysparm_query=${encodeURIComponent(filter + '^' + def.order)}&sysparm_fields=${def.fields}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}`;
            const r = await getWithTotal(url, signal);
            return { items: r.result.map(def.map), total: r.total };
        },
        enabled,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    }) as any;
    const watch = useRecordWatch(def.table, filter, () => q.refetch(), {
        enabled: enabled && options.live !== false,
        invalidate: false,
    }) as any;
    return {
        items: (q.data && q.data.items) || [],
        total: (q.data && q.data.total) || 0,
        isLoading: q.isLoading,
        error: q.error,
        refetch: q.refetch,
        live: watch && watch.status === 'subscribed',
    };
}

type Options = {
    title?: string;
    description?: string;
    /** Tabs, in order: requests, incidents, approvals. */
    sources?: MyItemKind[];
    limit?: number;
    recordPage?: string;
    /** List page for "View all" (opened with table + query + title). '' = no link. */
    listPage?: string;
    catalogPage?: string;
    live?: boolean;
};

function ItemRow({ item, recordPage }: { item: MyItem; recordPage: string }) {
    const second = [item.number, item.subtitle, relativeTime(item.updated)].filter(Boolean).join(' · ');
    return (
        <Link
            to={recordPage}
            table={item.table}
            sysId={item.id}
            className="group/row flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 no-underline outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border ring-inset">
                <Icon name={item.icon} className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                <span className="truncate text-xs text-muted-foreground">{second}</span>
            </span>
            {item.state ? <HighlightedValue label={item.state} size="sm" className="max-w-44 max-sm:hidden" /> : null}
            <Icon
                name="chevron-right"
                className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover/row:translate-x-0.5"
            />
        </Link>
    );
}

function KindCount({ kind, limit, live, active }: { kind: MyItemKind; limit: number; live: boolean; active: boolean }) {
    const r = useMyItems(kind, { limit, live });
    if (r.isLoading) return <Skeleton className="h-4 w-5 rounded-full" />;
    return (
        <span
            className={cx(
                'min-w-5 rounded-full px-1.5 text-center text-[11px] leading-4 font-semibold tabular-nums',
                r.total
                    ? kind === 'approvals'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                    : 'text-muted-foreground'
            )}
        >
            {r.total}
        </span>
    );
}

/**
 * My Items: the user's open requests, incidents and pending approvals as tabs of compact rows with
 * state pills, live (AMB) and ACL-aware. Rows open the record form page; "View all" opens the list
 * page with the same "Me" query the portal menu uses. Hooks for other widgets: useMyItems(kind),
 * MY_ITEM_KINDS, relativeTime.
 */
export default function MyItems({ options = {} }: { options?: Options }) {
    const kinds = (
        Array.isArray(options.sources) && options.sources.length
            ? options.sources
            : (['requests', 'incidents', 'approvals'] as MyItemKind[])
    ).filter((k) => !!MY_ITEM_KINDS[k]);
    // The active tab belongs to the history entry: Back from a record opened here shows the same tab.
    const [storedTab, setTab] = useHistoryState('my-items.tab', kinds[0] || 'requests') as [
        MyItemKind,
        (v: MyItemKind) => void,
    ];
    const tab: MyItemKind = kinds.indexOf(storedTab) >= 0 ? storedTab : kinds[0] || 'requests';
    const limit = Math.max(1, Math.min(10, options.limit || 5));
    const live = options.live !== false;
    const recordPage = options.recordPage || 'form';
    const listPage = options.listPage === undefined ? 'list' : options.listPage;
    const def = MY_ITEM_KINDS[tab];
    const data = useMyItems(tab, { limit, live });
    const catalogPage = options.catalogPage || 'catalog';
    // One row is 52px + 2px gap: the list keeps the height of a full page, so tabs never jump.
    const minH = limit * 54;

    return (
        <Card className="rp-mi h-full gap-0 py-0" data-rp-my-items="">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-4 pb-1">
                <div className="flex min-w-0 items-center gap-2">
                    <h2 className="m-0 text-base font-semibold tracking-tight">{options.title || 'My active items'}</h2>
                    {data.live ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Updates live">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Live
                        </span>
                    ) : null}
                </div>
                {options.description ? (
                    <p className="m-0 w-full text-sm text-muted-foreground">{options.description}</p>
                ) : null}
            </div>
            <Tabs value={tab} onValueChange={(v: string) => setTab(v as MyItemKind)} className="gap-0">
                <div className="rp-mi-tabs border-b border-border px-3">
                    <TabsList variant="line" className="h-10">
                        {kinds.map((k) => (
                            <TabsTrigger key={k} value={k} className="px-2">
                                <Icon name={MY_ITEM_KINDS[k].icon} className="rp-mi-tabicon size-4" />
                                {MY_ITEM_KINDS[k].label}
                                <KindCount kind={k} limit={limit} live={live} active={k === tab} />
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </Tabs>
            <div
                className="flex flex-1 flex-col gap-0.5 p-2"
                style={{ minHeight: minH + 16 }}
                role="tabpanel"
                aria-label={def.label}
            >
                {data.isLoading ? (
                    Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2" aria-hidden>
                            <Skeleton className="size-9 rounded-lg" />
                            <div className="flex flex-1 flex-col gap-1.5">
                                <Skeleton className="h-3.5 w-1/2" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                    ))
                ) : data.error ? (
                    <p className="m-0 px-2 py-3 text-sm text-destructive">
                        Couldn't load your {def.label.toLowerCase()}: {String(data.error.message || data.error)}
                    </p>
                ) : data.items.length ? (
                    data.items.map((it: MyItem) => <ItemRow key={it.id} item={it} recordPage={recordPage} />)
                ) : (
                    <Empty className="py-6">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Icon name={tab === 'approvals' ? 'circle-check' : def.icon} />
                            </EmptyMedia>
                            <EmptyTitle>{def.empty.title}</EmptyTitle>
                            <EmptyDescription>{def.empty.body}</EmptyDescription>
                        </EmptyHeader>
                        {def.empty.action ? (
                            <Button
                                variant="outline"
                                size="sm"
                                render={
                                    <Link
                                        to={def.empty.action.to === 'catalog' ? catalogPage : def.empty.action.to}
                                        q={def.empty.action.q}
                                    />
                                }
                            >
                                <Icon name={def.empty.action.icon} />
                                {def.empty.action.label}
                            </Button>
                        ) : null}
                    </Empty>
                )}
            </div>
            {listPage && data.total > 0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                    <span>
                        {Math.min(data.items.length, data.total)} of {data.total} open {def.noun}
                        {data.total === 1 ? '' : 's'}
                    </span>
                    <Link
                        to={listPage}
                        table={def.table}
                        query={def.listQuery}
                        q={{ title: def.listTitle }}
                        className="flex items-center gap-1 font-medium text-primary no-underline hover:underline"
                    >
                        View all
                        <Icon name="arrow-right" className="size-3.5" />
                    </Link>
                </div>
            ) : null}
        </Card>
    );
}
