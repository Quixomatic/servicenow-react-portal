import { usePortal, useNavigate, useComponent } from '@portal/runtime';
import { RecordList } from 'components:app/data-table';
import type { RecordListFeatures } from 'components:app/data-table';
import type { ListRow } from 'utilities:app/list-data';

type Options = {
    table?: string;
    title?: string;
    query?: string;
    columns?: string;
    orderBy?: string;
    pageSize?: number;
    height?: number;
    pagination?: 'pages' | 'scroll';
    density?: 'compact' | 'normal' | 'comfortable';
    /** Related list: records whose parentField is parentSysId (fixed, not removable). */
    parentField?: string;
    parentSysId?: string;
    /** Features to turn off, e.g. ["filter", "columnChooser"]. */
    hide?: string[];
    recordPage?: string;
    /** Live updates (AMB): refetch the current page when matching records change. */
    liveUpdates?: boolean;
};

/**
 * List Card: app/data-table's RecordList dropped into a card widget, configured by options. Shows
 * how any widget embeds a full list: `import { RecordList } from 'components:app/data-table'`.
 */
export default function ListCard({ options = {} }: { options?: Options }) {
    const portal = usePortal() as any;
    const navigate = useNavigate();
    const { instanceId } = useComponent() as { instanceId?: string };
    const features: Partial<RecordListFeatures> = {};
    for (const k of options.hide || []) (features as any)[k] = false;
    const fixed =
        options.parentField && options.parentSysId && /^[a-z0-9_.]+$/.test(options.parentField)
            ? `${options.parentField}=${options.parentSysId}`
            : undefined;
    const target = options.recordPage === undefined ? 'form' : options.recordPage;
    const pages: any[] = (portal && portal.pages) || [];
    const hasForm =
        !!target && pages.some((p) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(target) >= 0);
    const open = (row: ListRow, t: string) => {
        if (hasForm) navigate(target, { table: row.className || t, sysId: row.sysId });
        else window.open(`/${row.className || t}.do?sys_id=${row.sysId}`, '_blank', 'noopener');
    };
    return (
        <RecordList
            table={options.table || 'incident'}
            title={options.title}
            query={options.query}
            fixedQuery={fixed}
            columns={options.columns}
            orderBy={options.orderBy}
            pageSize={options.pageSize || 10}
            pageSizes={[5, 10, 25, 50]}
            pagination={options.pagination}
            density={options.density || 'compact'}
            height={options.height}
            features={features}
            variant="card"
            onRowOpen={open}
            prefKey={`${instanceId || 'list-card'}:${options.table || 'incident'}`}
            live={!!options.liveUpdates}
        />
    );
}
