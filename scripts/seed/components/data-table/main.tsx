/**
 * components:app/data-table: record lists on TanStack Table + TanStack Virtual.
 *
 *   <RecordList table query? columns? orderBy? features? … />   the connected list (server-side
 *       paging, sorting, filtering and search on the platform's list GraphQL): toolbar, search,
 *       condition builder, filter breadcrumbs, column chooser + personalization (per user),
 *       right-click cell menu (show matching / filter out / copy / open), inline edit (list_edit
 *       ACLs), selection with bulk edit and custom actions, CSV export, pagination or infinite
 *       virtualized scroll, skeletons, empty state. Turn parts off with
 *       features={{ search: false, filter: false, breadcrumbs: false, columnChooser: false,
 *       pagination: false, inlineEdit: false, contextMenu: false, selection: false, actions: false,
 *       refresh: false, export: false, title: false }}.
 *       Related list: fixedQuery="task=<sys_id>" (or relatedListName + parentTable + parentRecordSysId).
 *       URL/state sync: state={{ filter, keywords, orderBy, page }} + onStateChange.
 *       Live updates: live (or live={{ throttleMs }}) refetches the current page when records
 *       matching the filter change (AMB record watch) and briefly highlights the changed rows.
 *   <DataTable columns rows getRowId getValue label … />   the presentational grid (any rows):
 *       role="grid", roving focus, aria-sort, resizable columns, virtualization, selection,
 *       context menu and editor slots.
 *   <Pagination />, <ColumnChooser />, <CellEditor />, <PointMenu />
 */
import { RecordList } from './record-list';

export { RecordList } from './record-list';
export type { RecordListProps, RecordListFeatures, ListAction, ListActionContext, ListState } from './record-list';
export { DataTable, ROW_HEIGHT } from './table';
export type { DataTableProps, DataTableColumn, SortState, CellRef, CellContext, Density } from './table';
export { Pagination } from './pagination';
export type { PaginationProps } from './pagination';
export { ColumnChooser } from './column-chooser';
export type { ColumnChooserProps, ColumnOption } from './column-chooser';
export { CellEditor } from './cell-editor';
export { PointMenu } from './menu';
export type { MenuItem } from './menu';
export { DefaultCell } from './cells';

/** Preview (Studio): active incidents. */
export default function DataTablePreview() {
    return (
        <div className="p-4">
            <RecordList
                table="incident"
                query="active=true"
                orderBy="-number"
                pageSize={10}
                prefKey="preview:incident"
            />
        </div>
    );
}
