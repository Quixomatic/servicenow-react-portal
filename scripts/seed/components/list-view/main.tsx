import { useMemo, useRef } from 'react';
import {
    usePortal,
    usePortalLocation,
    useNavigate,
    useComponent,
    useEntryTitle,
    useScrollRestoration,
} from '@portal/runtime';
import { RecordList } from 'components:app/data-table';
import type { ListState, RecordListFeatures } from 'components:app/data-table';
import type { ListRow } from 'utilities:app/list-data';
import { HeaderSlot, useHeaderSlot } from 'utilities:app/header-slots';
import { useViewRuleResolution, useViewRulesContext } from 'utilities:app/graphql';
// Platform list actions (wave 3b): toolbar, bulk (selection bar) and row context menu.
import { useListActionSlots } from 'components:app/action-bar';

type Options = {
    table?: string;
    title?: string;
    description?: string;
    query?: string;
    fixedQuery?: string;
    columns?: string;
    orderBy?: string;
    view?: string;
    pageSize?: number;
    pagination?: 'pages' | 'scroll';
    density?: 'compact' | 'normal' | 'comfortable';
    searchMode?: 'keywords' | 'contains';
    /** Portal page that opens a record (gets table + sys_id); '' = classic form in a new tab. */
    recordPage?: string;
    /**
     * Where the title and toolbar go: 'header' = the page header's slots (title + count → left,
     * search and buttons → right; e.g. app/app-subheader), 'inline' = above the table, 'auto'
     * (default) = header when the layout has those slots.
     */
    toolbarPlacement?: 'auto' | 'inline' | 'header';
    /** Mirror filter / search / sort / page / group / quick filters into the URL (shareable; replaces the history entry). */
    syncUrl?: boolean;
    showTitle?: boolean;
    showSearch?: boolean;
    showBreadcrumbs?: boolean;
    showFilter?: boolean;
    showColumns?: boolean;
    showPagination?: boolean;
    inlineEdit?: boolean;
    contextMenu?: boolean;
    selection?: boolean;
    actions?: boolean;
    /** Platform list actions (declarative list actions): only these names (comma-separated). */
    actionsInclude?: string;
    /** Platform list actions never shown (comma-separated names). */
    actionsExclude?: string;
    /** sys_ux_action_config sys_id; default: the portal's settings.actionConfigId. */
    actionConfigId?: string;
    /** Classic server-side list UI actions (context menu / list choice), checked per row by the platform. */
    classicActions?: boolean;
    showExport?: boolean;
    showRefresh?: boolean;
    /** Live updates (AMB): refetch the current page when matching records change. */
    liveUpdates?: boolean;
    /** Initial group-by column (^GROUPBY). */
    groupBy?: string;
    /** Rows shown per group (default 10). */
    groupRowLimit?: number;
    /** Quick filter chips: preset ids (active, mine, myGroups, unassigned, createdByMe, updatedToday) or 'Label=encoded query'. */
    quickFilters?: string[];
    /** Quick filters on at first. */
    defaultQuickFilters?: string[];
    showGroupBy?: boolean;
    showSavedFilters?: boolean;
    showColumnFilters?: boolean;
    /** Table / cards toggle. */
    displayToggle?: boolean;
    /** Append journal entries (comments, work notes) inline. */
    journalEdit?: boolean;
    /** glide_list cells edit in the list collector (slushbucket). */
    listCollector?: boolean;
};

const NAME = /^[a-z0-9_]+$/;

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v);
    return '';
}

/**
 * List View: a page-level record list (toolbar, breadcrumbs, condition builder, a table that fills
 * the page height). Made for pages with content width "Full bleed".
 *
 * table / query / view come from the widget options, else the route params, else the URL params
 * (table, query, view; older links that packed them inside q still work). With syncUrl (default) the
 * filter, search, sort and page live in the URL: the filter as the explicit `query` param (with `table`
 * when the widget has no fixed table), search / sort / page / group-by / quick filters inside q
 * (kw=…&sort=-number&page=2&group=priority&quick=active,mine). State writes replace history entries.
 * Rows open the portal's `form` page (recordPage) with explicit table + sys_id params. On a layout with header slots
 * (app/app-subheader) the title and toolbar move into the header (toolbarPlacement).
 */
export default function ListView({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {};
    const portal = usePortal() as any;
    const navigate = useNavigate();
    const { instanceId } = useComponent() as { instanceId?: string };
    const route = (portal && portal.page && portal.page.params) || {};
    const qp = useMemo(() => new URLSearchParams(typeof loc.q === 'string' ? loc.q : ''), [loc.q]);
    // Explicit URL params (table / query / view) win; location.params also carries the q keys
    // (kw / sort / page, and older links that packed table / query into q).
    const urlObj = loc.params && typeof loc.params === 'object' ? loc.params : {};
    const urlQuery = pick(typeof loc.query === 'string' ? loc.query : '', urlObj.query, qp.get('query'));

    const rawTable = pick(options.table, route.table, loc.table, urlObj.table, qp.get('table'), 'incident');
    const table = NAME.test(rawTable) ? rawTable : 'incident';
    const urlView = loc.mode === 'studio' ? '' : pick(loc.view, urlObj.view, qp.get('view'));
    const askedView = pick(options.view, route.view, urlView);
    // Portal view rules (applies to lists / both) force the list view; otherwise the option, the
    // route, then the URL, as before. Resolved once per portal, page and table (cached 5 minutes).
    const rulesCtx = useViewRulesContext();
    const listRule = useViewRuleResolution(
        'list',
        table,
        rulesCtx.portal ? { portal: rulesCtx.portal, page: rulesCtx.page, remember: false } : undefined
    );
    const rulesPending = !!rulesCtx.portal && listRule.isLoading;
    const ruleView = listRule.data && listRule.data.source === 'rule' ? listRule.data.view : '';
    const view = ruleView || askedView;
    const sync = options.syncUrl !== false;
    const page = String(loc.page || '');

    // URL → list state (the URL wins once it has a value; options give the defaults).
    const state: Partial<ListState> | undefined = sync
        ? {
              filter: urlQuery || qp.has('query') ? urlQuery : options.query || '',
              keywords: pick(urlObj.kw, qp.get('kw')),
              orderBy: pick(urlObj.sort, qp.get('sort')) || options.orderBy || '',
              page: Math.max(0, (parseInt(pick(urlObj.page, qp.get('page')), 10) || 1) - 1),
              // group= in q ('' / absent → the option; 'none' → explicitly ungrouped).
              groupBy: qp.has('group')
                  ? qp.get('group') === 'none'
                      ? ''
                      : qp.get('group') || ''
                  : options.groupBy || '',
              quick: qp.has('quick')
                  ? (qp.get('quick') || '').split(',').filter(Boolean)
                  : options.defaultQuickFilters || [],
          }
        : undefined;

    // List state → URL: table / query / view as explicit params; search, sort and page in q.
    const writeUrl = (s: ListState) => {
        const next = new URLSearchParams(typeof loc.q === 'string' ? loc.q : '');
        const set = (k: string, v: string, dflt = '') => (v && v !== dflt ? next.set(k, v) : next.delete(k));
        // Older links packed these into q; they now travel as explicit params.
        next.delete('table');
        next.delete('view');
        next.delete('query');
        // An explicitly cleared filter is kept as q's query= when the widget has a default filter
        // (an empty explicit param is dropped from the URL).
        if (!s.filter && options.query) next.set('query', '');
        set('kw', s.keywords);
        set('sort', s.orderBy, options.orderBy || '');
        set('page', s.page ? String(s.page + 1) : '');
        if (s.groupBy !== (options.groupBy || '')) next.set('group', s.groupBy || 'none');
        else next.delete('group');
        const dq = (options.defaultQuickFilters || []).join(',');
        if (s.quick.join(',') !== dq) next.set('quick', s.quick.join(','));
        else next.delete('quick');
        navigate(page, {
            table: options.table ? undefined : table,
            view: options.view ? undefined : urlView || undefined,
            query: s.filter || undefined,
            q: next.toString(),
            // List state changes replace the history entry (Back leaves the list, not each filter step).
            replace: true,
        });
    };

    const hasFormPage = useMemo(() => {
        const target = options.recordPage === undefined ? 'form' : options.recordPage;
        if (!target) return '';
        const pages: any[] = (portal && portal.pages) || [];
        return pages.some((p) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(target) >= 0) ? target : '';
    }, [portal && portal.pages, options.recordPage]);

    const openRow = (row: ListRow, t: string) => {
        if (hasFormPage) {
            navigate(hasFormPage, { table: row.className || t, sysId: row.sysId });
        } else window.open(`/${row.className || t}.do?sys_id=${row.sysId}`, '_blank', 'noopener');
    };

    // Platform actions: New / Export… in the toolbar, bulk actions on the selection, row context menu.
    const platformActions = useListActionSlots({
        table,
        view: view || undefined,
        fixedQuery: options.fixedQuery,
        listTitle: options.title,
        actions: options.actions !== false,
        include: options.actionsInclude || undefined,
        exclude: options.actionsExclude || undefined,
        actionConfigId: options.actionConfigId || undefined,
        classic: !!options.classicActions,
        openRecord: (t, id, params) => {
            const query = params && params.query ? String(params.query) : undefined;
            if (hasFormPage) navigate(hasFormPage, { table: t, sysId: id, query });
            else
                window.open(
                    `/${t}.do?sys_id=${id}${query ? '&sysparm_query=' + encodeURIComponent(query) : ''}`,
                    '_blank',
                    'noopener'
                );
        },
    });

    // Header slots exist on this layout (app-shell sub-header)? 'header' and 'auto' use them.
    const leftSlot = useHeaderSlot('left');
    const rightSlot = useHeaderSlot('right');
    const placement = options.toolbarPlacement || 'auto';
    const toHeader = placement !== 'inline' && !!(leftSlot && rightSlot);
    const toolbarSlots = toHeader
        ? {
              left: (node: any) => (
                  <HeaderSlot name="left">
                      <div className="flex min-w-0 items-baseline gap-2">{node}</div>
                  </HeaderSlot>
              ),
              right: (node: any) => (
                  <HeaderSlot name="right">
                      <div className="flex min-w-0 items-center justify-end gap-1.5">{node}</div>
                  </HeaderSlot>
              ),
          }
        : undefined;

    const features: Partial<RecordListFeatures> = {
        title: options.showTitle !== false,
        search: options.showSearch !== false,
        breadcrumbs: options.showBreadcrumbs !== false,
        filter: options.showFilter !== false,
        columnChooser: options.showColumns !== false,
        pagination: options.showPagination !== false,
        inlineEdit: options.inlineEdit !== false,
        contextMenu: options.contextMenu !== false,
        selection: options.selection !== false,
        actions: options.actions !== false,
        export: options.showExport !== false,
        refresh: options.showRefresh !== false,
        groupBy: options.showGroupBy !== false,
        savedFilters: options.showSavedFilters !== false,
        columnFilters: options.showColumnFilters !== false,
        displayToggle: !!options.displayToggle,
        journalEdit: !!options.journalEdit,
    };

    // Back to this list: its title labels the entry, and the table's scroll comes back (filters, sort and
    // page are already in the URL, written with replace).
    useEntryTitle(options.title || qp.get('title') || '');
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const scroller = useMemo(
        () => ({
            get current() {
                return wrapRef.current ? (wrapRef.current.querySelector('.rpl-scroll') as HTMLElement | null) : null;
            },
        }),
        []
    );
    useScrollRestoration(scroller, 'list');

    return (
        <div
            ref={wrapRef}
            className="rpl-view min-w-0"
            data-rp-list-view={table}
            data-rp-list-view-rule={ruleView ? listRule.data!.ruleId : undefined}
        >
            {rulesPending ? null : (
                <RecordList
                    key={`${table}|${view}`}
                    table={table}
                    title={options.title || qp.get('title') || undefined}
                    columns={options.columns}
                    query={options.query}
                    fixedQuery={options.fixedQuery}
                    orderBy={options.orderBy}
                    view={view || undefined}
                    pageSize={options.pageSize}
                    pagination={options.pagination}
                    density={options.density}
                    searchMode={options.searchMode}
                    features={features}
                    variant="page"
                    height="fill"
                    state={state}
                    onStateChange={sync ? writeUrl : undefined}
                    onRowOpen={openRow}
                    toolbarSlots={toolbarSlots}
                    prefKey={`${instanceId || 'list-view'}:${table}`}
                    live={!!options.liveUpdates}
                    groupBy={options.groupBy}
                    groupRowLimit={options.groupRowLimit}
                    quickFilters={options.quickFilters}
                    defaultQuickFilters={options.defaultQuickFilters}
                    listCollector={options.listCollector}
                    {...platformActions.props}
                />
            )}
        </div>
    );
}
