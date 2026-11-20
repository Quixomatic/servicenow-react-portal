import { usePortal, usePortalLocation } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { DialogOutlet } from 'components:app/confirm-dialog';
import { RelatedLists } from 'components:app/related-lists';
import type { RelatedListsLayout } from 'components:app/related-lists';

/**
 * components:app/related-lists-card: a record's related lists anywhere on a page (outside a form).
 *
 * The record comes from the options (table + sysId), else the route params, else the URL params
 * (table, sys_id), like app/record-form, so it can sit next to a form or on its own page.
 *
 * Options
 *   table, sysId, view          the parent record and its form view ('' = default)
 *   layout                      'tabs' (default) | 'stacked' | 'single'
 *   name                        layout 'single': the list ('task_sla.task', 'REL:<sys_id>')
 *   include, exclude            comma-separated list names to keep / drop
 *   title                       card heading ('' = none)
 *   recordPage                  page that opens records (rows, New); default 'form'
 *   actions                     New / Add / Edit… / Remove where allowed (default true)
 *   liveUpdates                 refresh the shown list when its records change (AMB)
 *   pageSize                    rows per page (default 10)
 */
type Options = {
    table?: string;
    sysId?: string;
    view?: string;
    layout?: RelatedListsLayout;
    name?: string;
    include?: string;
    exclude?: string;
    title?: string;
    recordPage?: string;
    actions?: boolean;
    liveUpdates?: boolean;
    pageSize?: number;
};

const NAME = /^[a-z0-9_]+$/i;

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v);
    return '';
}

const names = (s?: string) =>
    String(s || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

export default function RelatedListsCard({ options = {} }: { options?: Options }) {
    const location = (usePortalLocation() as any) || {};
    const portal = usePortal() as any;
    const query = location.params && typeof location.params === 'object' ? location.params : {};
    const route = (portal && portal.page && portal.page.params) || {};
    const rawTable = pick(options.table, route.table, location.table, query.table);
    const table = NAME.test(rawTable) ? rawTable : '';
    const sysId = pick(options.sysId, route.sys_id, route.sysId, location.sysId, query.sys_id);
    const view = pick(options.view, location.mode === 'studio' ? '' : location.view, query.view);
    const title = options.title === undefined ? 'Related lists' : options.title;
    return (
        <Card data-rp-related-lists-card="">
            {/* Add / Edit… / Remove confirmations and pickers (only the page's first outlet renders). */}
            <DialogOutlet />
            {title ? (
                <CardHeader className="border-b border-border">
                    <h2 className="m-0 text-base leading-6 font-semibold tracking-tight">{title}</h2>
                </CardHeader>
            ) : null}
            <CardContent className="min-w-0">
                {table && sysId && sysId !== '-1' ? (
                    <RelatedLists
                        table={table}
                        sysId={sysId}
                        view={view}
                        layout={options.layout === 'stacked' || options.layout === 'single' ? options.layout : 'tabs'}
                        name={options.name || undefined}
                        include={names(options.include)}
                        exclude={names(options.exclude)}
                        recordPage={options.recordPage === undefined ? 'form' : options.recordPage}
                        actions={options.actions !== false}
                        live={!!options.liveUpdates}
                        pageSize={options.pageSize || 10}
                        emptyText="This record has no related lists."
                    />
                ) : (
                    <p className="m-0 text-sm text-muted-foreground">Open a record to see its related lists.</p>
                )}
            </CardContent>
        </Card>
    );
}
