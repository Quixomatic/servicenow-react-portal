---
title: Lists
description: list-data (the platform's list GraphQL, encoded queries as data, saved filters), data-table (RecordList, DataTable, CardGrid, group-by, column and quick filters), slushbucket, condition-builder, and the list widgets.
section: Primitives and utilities
order: 9
tags: [lists, data-table, condition-builder, encoded-query, group-by, saved-filters, slushbucket]
---

# Lists

Record lists use the platform's own list GraphQL (what Workspace's record list uses), TanStack Table and TanStack Virtual.

## `utilities:app/list-data`

| Fetcher | Platform call |
|---|---|
| `fetchList(args)` | `GlideListLayout_Query.getListLayout`: columns, rows (value + display) and count in one call |
| `fetchListCount(args)` | `GlideListCount_Query.getListCount` |
| `fetchCrumbs(table, filter)` | `GlideConditionBuilder_Query.parse`: breadcrumb labels |
| `fetchFilterFields(table)` | `GlideConditionBuilder_Query.dotwalkTableData`: fields, dot-walked one level at a time |
| `fetchEditability(args)` | `GlideListLayoutInline_Query.getPreFetch`: `canListEdit` per record |
| `writeCells(args)` | `GlideListLayoutInline_Query.writeMultiRow` (+ notifications) |
| `fetchPreference` / `savePreference` / `preferenceName(key)` | Per-user list personalization, stored as `x_312987_portal.list.<key>` |
| `fetchUserPreferenceValue(user, name)` / `saveUserPreferenceValue(name, value)` | Generic preference read/write, refused for any name outside `x_312987_portal.*` |
| `fetchSavedFilters(table, user)` / `createSavedFilter` / `updateSavedFilter` / `deleteSavedFilter` | The platform's saved filters (`sys_filter`) through the Table API, **as the user** |

Hooks (page cache): `useList`, `useInfiniteList`, `useCrumbs`, `useFilterFields`, `useFieldPath`, `useEditability`, `useCellWrite`, `useListInvalidate`, `useListPreferences`, `useSavedFilters(table)`, `useSavedFilterActions(table)` (`save(title, filter, group?)`, `update(id, { title?, filter? })`, `remove(id)`), `useMyGroups()`, `listKeys`.

### Group-by

`ListArgs.groupBy` adds `^GROUPBY<column>` to the query `getListLayout` runs. The platform then answers with one row per group (`GlideListLayout_GroupedQueryRowType`: value, display value, count, `aggregateQuery`) and each group's first rows. `fetchList` returns them as `page.groups` (`ListGroup[]`), with `page.groupBy`, `page.groupLabel` and `page.groupCount`; `page.rows` is every group's rows.

Paging is the platform's own (verified 2026-11-20): **`offset` counts groups** and the server returns up to 20 groups per request; **`limit` is the number of rows per group**. Dot-walked columns group too (`GROUPBYcaller_id.department`).

### Saved filters (`sys_filter`)

Saved filters use the classic list's table, read and written as the user, so the baseline ACLs decide (checked on dev189813):

| Filter | Read | Create / write | Delete |
|---|---|---|---|
| Yours (`user` = you) | yes | yes | yes |
| A group's (`group` set) | `filter_group` and membership | `filter_group` and membership | same |
| Global (no user, no group) | `filter_global` | `filter_global` | `filter_global` |

`filter_admin` manages all of them. Setting `sys_filter.user` is a `filter_admin` field ACL, so `createSavedFilter` checks that the saved row really has you as owner and reports an error otherwise. Saved values carry `^GROUPBY` and `^ORDERBY` like the classic list's; `decodeSavedFilter` / `encodeSavedFilter` (data-table) convert.

```ts
type ListArgs = {
    table: string
    columns?: string | string[] // comma-separated or an array; empty = the view's list layout
    query?: string            // the user's filter
    fixedQuery?: string       // always applied, hidden
    orderBy?: { field: string; desc: boolean }[]
    keywords?: string
    limit?: number
    offset?: number
    view?: string
    relatedListName?: string  // e.g. 'task_sla.task', with its parent:
    parentTable?: string
    parentRecordSysId?: string
}
```

### Encoded queries as data

`parseQuery` / `serializeQuery` / `serializeFilter` / `serializeOrder` turn encoded queries into a model and back: AND/OR, `^NQ` (new query), `ORDERBY`, keywords and relative dates. Helpers: `andTerm`, `removeTerm`, `flattenTerms`, `termToString`, `baseType`, `operatorsFor(type, isChoice, excluded)`, `findOperator`, `OPERATORS_BY_TYPE`, `DATE_PRESETS`, `specificDay`, `dateGenerate`, `parseRelative`, `formatRelative`, `describeTerm`, `emptyQuery`, `parseTerm`, `KEYWORD_FIELD`.

Composing queries:
- `andQueries(filter, extras)` ANDs conditions into **every** `^NQ` set, the way the platform's lists do: `^NQ` ORs whole sets, so a term appended only at the end would leak records from the other sets. Quick filters and group drill-downs use it.
- `groupCondition(field, value)` gives `field=value`, or `fieldISEMPTY` for the empty group.
- `groupByOf(encoded)` and `stripListTokens(encoded)` (the query without `GROUPBY`, `ORDERBY` and `EQ`).
- `columnTerms(model, field)` and `setColumnTerm(model, field, term | null)`: a column filter owns that field's single-term AND clauses in every set and leaves OR'd clauses alone.
- `QUICK_FILTER_PRESETS`: `active`, `mine`, `myGroups` (the "One of My Groups" dynamic filter), `unassigned`, `createdByMe`, `updatedToday`.

## `components:app/data-table`

### `<RecordList>`

The connected list:

```tsx
import { RecordList } from 'components:app/data-table'

<RecordList table="incident" query="active=true" orderBy="-number" pageSize={20} prefKey="my-widget:incident" live />
```

- Server-side paging, sorting, filtering and search.
- Toolbar, search, condition builder, filter breadcrumbs.
- Column chooser and personalization (order, visibility, widths, dot-walked columns), persisted per user.
- Right-click cell menu: show matching, filter out, copy, open.
- Inline edit gated by `list_edit` ACLs; selection with bulk edit and custom actions; CSV export.
- HTML columns (`html`, `translated_html`) show their sanitised text on one line (`htmlToText` from `components:rich-text`) and edit inline in a rich-text popover (`app/html-field`; links and images are left to the form; Save or Ctrl/⌘+Enter, Esc cancels).
- Pagination or infinite virtualized scroll; skeleton and empty states; `page` / `card` / `plain` variants.
- Every feature can be turned off: `features={{ search, filter, breadcrumbs, columnChooser, pagination, inlineEdit, contextMenu, selection, actions, refresh, export, title }}`.
- Related lists: `fixedQuery="task=<sys_id>"`, or `relatedListName` + `parentTable` + `parentRecordSysId` **plus** the relationship's `fixedQuery` (the platform doesn't filter on the name alone). Prefer [`app/related-list`](related-lists.md).
- `actions` (`{ id, label, requiresSelection?, destructive?, run(ctx) }[]`), `onRowOpen(row, table)` (default: the classic form in a new tab), `height` (`'fill'`, `'auto'` or a CSS length), `pageSizes`, `wrap`, and `persist` (`user`, `local`, `none`; `prefKey={false}` remembers nothing).
- `toolbarSlots={{ left, right }}` renders the toolbar elsewhere (for example into [header slots](header-slots.md)); `toolbarActions` (extra toolbar content) and `onData(page)` (each page shown: count, `canCreate` / `canWrite` / `canDelete`, `m2m`, server `fixedQuery`).
- URL/state sync: `state={{ filter, keywords, orderBy, page, groupBy, quick }}` + `onStateChange`.
- **Group-by**: `groupBy="priority"` for the initial column. With `features.groupBy` (default on) the user picks from the toolbar's Group menu (groupable columns) or the cell menu ("Group by Priority"). Groups are collapsible header rows with their count (Enter / Space toggles; Collapse all / Expand all in the menu). A group shows `groupRowLimit` rows (default 10); "Show all N" (Shift+Enter) opens the group as a filter. Pagination counts groups, 20 per page.
- **Column header filters** (`features.columnFilters`, default on): a funnel in each filterable header (Alt+↓ from the keyboard) opens the column's operators with the condition builder's value editors (contains text, "is one of" choices, reference search with Me, date presets and ranges). The term goes into the same encoded filter, so breadcrumbs, the URL and saved filters see it.
- **Quick filters**: `quickFilters={['active', 'mine', 'myGroups', 'Critical=priority=1']}` (preset ids, `Label=query` strings or `{ id, label, query }`), `defaultQuickFilters={['active']}`. Toggle chips (`aria-pressed`), ANDed into every `^NQ` set of the filter.
- **Saved filters** (`features.savedFilters`, default on): the toolbar's Saved menu saves the current filter, sort and grouping as a `sys_filter` for you, or with `filter_group` for one of your groups. It applies any filter you can read and lets you rename, update (to the current filter) and delete your own. Errors from ACLs show as toasts.
- **Cards** (`now-data-set`): `display="grid"` shows rows as cards (`CardGrid`). The display column is the title link and the next `gridFields` (default 5) columns read as label / value pairs. With `features.displayToggle` the user switches between table and cards (remembered in the list's personalization). Selection, row actions and group headings carry over.
- **Inline edit**: dot-walked cells (`caller_id.email`) edit and save the referenced record. `getPreFetch` names the record and field, and `writeMultiRow` refuses dot-walked columns on the base table, so the write goes to the target. `glide_list` cells edit in a chips picker or a list collector (`listCollector` starts there; [`app/slushbucket`](#componentsappslushbucket)), staged, with Save. `conditions` cells use the condition builder on the record's dependent table. Journal cells (comments, work notes) are an **append-only** editor (a new entry, Post or Ctrl/⌘+Enter) behind `features.journalEdit` (off by default; Workspace doesn't edit journals from lists).

#### Extension points (list actions, menus)

Every slot gets the list's `ListController`. The controller holds `table`, `view`, `filter`, `fixedQuery`, `quickFilters`, `query` (the effective encoded query the server ran), `keywords`, `orderBy` and `groupBy`. It also holds `rows`, `count` and `page`; `selectedIds` and `selectedRows`; and the methods `setSelection(ids)`, `clearSelection()`, `refresh()`, `setFilter(q)` and `setGroupBy(col)`.

| Prop | Renders |
|---|---|
| `toolbarActions` | A node, or `(c) => node`, after the toolbar buttons |
| `selectionActions` | `(c) => node` in the selection bar while rows are selected |
| `rowActions` | `(row, c) => node`: a trailing sticky actions cell per row (Enter / F2 focuses its first control); also on cards |
| `contextMenuItems` | `(cellCtx, c) => MenuItem[]` appended to the cell menu |
| `onSelectionChange` | `(ids, rows)` |
| `controllerRef` | `{ current: ListController }` for imperative access |

Inside a slot, `useListController()` returns the same object. Group header rows are never part of `c.rows`; to test a row from `DataTable` or `CardGrid`, use `isGroupRow(row)`.
- `live` (or `live={{ throttleMs }}`) refetches the current page when matching records change and briefly highlights changed rows.

### `<DataTable>`

The presentational grid for any rows: a real `role="grid"` with roving focus, full keyboard support, `aria-sort` / `aria-rowcount` / `aria-rowindex`, resizable columns, virtualization, selection, and context-menu and editor slots.

Newer props:
- group header rows: `isGroupRow`, `renderGroupRow`, `onGroupToggle`, `isGroupExpanded`;
- `renderHeaderExtra(column)` for header buttons;
- `rowActions(row)` for a sticky trailing cell.

Also exported:
- `CardGrid`, `ColumnFilter`, `QuickFilterBar`, `resolveQuickFilters`, `GroupByMenu`;
- `SavedFiltersMenu`, `encodeSavedFilter`, `decodeSavedFilter`;
- `Pagination` (with `unit`), `ColumnChooser`, `CellEditor`, `hasInlineEditor`, `PointMenu`, `DefaultCell`, `ROW_HEIGHT`;
- `isGroupRow`, `GROUPS_PER_PAGE`, `useListController`, `ListControllerContext`.

## `components:app/slushbucket`

Transfer lists (`sn-record-list-select`, `sn-list-selector`, the classic slushbucket):

```tsx
import { Slushbucket, RecordSlushbucket } from 'components:app/slushbucket'

<Slushbucket available={items} selected={chosen} onChange={(ids, items) => …} reorderable />
<RecordSlushbucket table="incident" field="watch_list" value={v} displayValue={dv} onChange={(v, dv) => …} />
```

- `Slushbucket` (generic): Available and Selected multi-select listboxes with Add, Remove, Add all and Remove all.
  - Keyboard: ↑/↓, Home/End, Space marks, Shift extends, Ctrl/⌘+A marks all, Enter or double-click moves the marked items, Alt+↑/↓ reorders.
  - Search over Available is local, or server-side via `search` + `onSearchChange`.
  - It stacks vertically under 640 px.
- `RecordSlushbucket` is the list collector for a `glide_list` or reference field. Available records come from the field's own reference search (qualifiers apply, as the user). The value uses the platform's comma format. It is the list-collector mode of the `glide_list` cell editor.

## `components:app/condition-builder`

`<ConditionBuilder>`: AND/OR and new-criteria groups, operators per field type, a dot-walk field picker (4 levels deep), value editors from the field primitives, and breadcrumbs labelled by the platform's parser. Also `FilterBreadcrumbs`, `FieldPicker`, `ValueEditor`.

## Widgets

### `app/list-view`

A full-bleed page list. Its state lives in the URL (filter, sort, page) and rows open the record page. A portal [view rule](../concepts/view-rules.md) that applies to lists forces the list view; otherwise the `view` option, the route, then the URL `view` param apply.

| Option | Meaning |
|---|---|
| `table` | Empty: the page's route param, else the URL's `table` param, else `incident` |
| `title`, `query`, `fixedQuery`, `columns`, `orderBy`, `view` | List definition (`columns`: comma-separated, dot-walks allowed; empty = the list view's layout) |
| `pageSize` (default 50), `pagination` (`pages`, `scroll`), `density` (`compact`, `normal`, `comfortable`), `searchMode` (`keywords`, `contains`) | Behaviour |
| `recordPage` | Portal page opened with `table` + `sys_id` (default `form`); empty = the classic form in a new tab |
| `toolbarPlacement` | `auto`, `header` (into the sub-header's [header slots](header-slots.md)), `inline` |
| `syncUrl` | Keep filter, sort and page in the URL (default true) |
| `showTitle`, `showSearch`, `showBreadcrumbs`, `showFilter`, `showColumns`, `showPagination`, `inlineEdit`, `contextMenu`, `selection`, `actions`, `showExport`, `showRefresh` | Feature switches |
| `liveUpdates` | Refresh the current page when matching records change |
| `groupBy`, `groupRowLimit` | Initial grouping and rows per group |
| `quickFilters`, `defaultQuickFilters` | Quick filter chips (preset ids or `Label=query`) and which start on |
| `showGroupBy`, `showSavedFilters`, `showColumnFilters` | Feature switches (default on) |
| `displayToggle`, `journalEdit`, `listCollector` | Table / cards toggle, journal append, list-collector editor for `glide_list` (default off) |

With `syncUrl`, the group-by and the quick filters ride in `q` (`group=priority`, `group=none` when explicitly ungrouped, `quick=active,mine`). State writes **replace** the history entry.

### `app/list-card`

A list you can drop anywhere:
- `table` (default `incident`), `title`, `query`, `columns`, `orderBy`;
- `pageSize` (default 10), `height`, `pagination`, `density` (default `compact`);
- `parentField` + `parentSysId` (related list), `recordPage`, `liveUpdates`;
- `display` (`table` / `grid`), `displayToggle`, `gridFields`;
- `groupBy`, `groupRowLimit`, `quickFilters`, `defaultQuickFilters`, `journalEdit`, `listCollector`;
- `hide`: features to turn off, `groupBy`, `savedFilters`, `columnFilters` and `quickFilters` included.

The sp **List cards** page demos cards with quick filters and a table / cards toggle, plus a list grouped by priority with list-collector, dot-walk and journal editing.

## Not built yet

`onCellEdit` list client scripts. Platform list UI actions and declarative actions come in through the extension points above (`app/action-bar`). Related lists: see [Related lists](related-lists.md).

## Related

- [Live updates](../runtime-api/live-updates.md)
- [Header slots](header-slots.md)

## Platform list actions

`app/list-view` shows the platform's list actions (declarative list actions; classic server-side list actions as an option) in the toolbar, the selection bar and the row context menu, through `useListActionSlots` from `components:app/action-bar`. See [Actions](actions.md).
