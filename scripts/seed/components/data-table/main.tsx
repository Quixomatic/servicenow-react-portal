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
 *       Group-by (groupBy / features.groupBy): ^GROUPBY on getListLayout, collapsible group rows with
 *       counts, "Show all" opens a group as a filter, 20 groups per page. Column header filters
 *       (features.columnFilters), quick filter chips (quickFilters, defaultQuickFilters), saved
 *       filters on sys_filter (features.savedFilters), table / card grid (display, features.displayToggle).
 *       Inline edit: dot-walked cells write the referenced record; glide_list (chips or list collector),
 *       conditions, journal append (features.journalEdit), HTML.
 *       Extension points: toolbarActions (node or (controller) => node), selectionActions,
 *       rowActions, contextMenuItems, onSelectionChange, controllerRef; useListController() inside.
 *   <DataTable columns rows getRowId getValue label … />   the presentational grid (any rows):
 *       role="grid", roving focus, aria-sort, resizable columns, virtualization, selection,
 *       context menu and editor slots, group rows, header extras, a row actions cell.
 *   <CardGrid />, <ColumnFilter />, <QuickFilterBar />, <GroupByMenu />, <SavedFiltersMenu />,
 *   <Pagination />, <ColumnChooser />, <CellEditor />, <PointMenu />
 */
import { RecordList } from './record-list';

export { RecordList } from './record-list';
export type {
    RecordListProps,
    RecordListFeatures,
    ListAction,
    ListActionContext,
    ListState,
    ListGroupRow,
} from './record-list';
export { isGroupRow, GROUPS_PER_PAGE } from './record-list';
export { useListController, ListControllerContext } from './controller';
export type { ListController } from './controller';
export { CardGrid } from './card-grid';
export type { CardGridProps } from './card-grid';
export { ColumnFilter } from './column-filter';
export type { ColumnFilterProps } from './column-filter';
export { QuickFilterBar, resolveQuickFilters } from './quick-filters';
export type { QuickFilterBarProps } from './quick-filters';
export { GroupByMenu } from './group-by';
export type { GroupByMenuProps } from './group-by';
export { SavedFiltersMenu, encodeSavedFilter, decodeSavedFilter } from './saved-filters';
export type { SavedFiltersMenuProps, ListQueryState } from './saved-filters';
export { DataTable, ROW_HEIGHT } from './table';
export type { DataTableProps, DataTableColumn, SortState, CellRef, CellContext, Density } from './table';
export { Pagination } from './pagination';
export type { PaginationProps } from './pagination';
export { ColumnChooser } from './column-chooser';
export type { ColumnChooserProps, ColumnOption } from './column-chooser';
export { CellEditor, hasInlineEditor } from './cell-editor';
export type { CellEditorProps, CellTarget } from './cell-editor';
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
