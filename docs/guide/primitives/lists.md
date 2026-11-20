---
title: Lists
description: list-data (the platform's list GraphQL and encoded queries as data), data-table (RecordList, DataTable), condition-builder, and the list widgets.
section: Primitives and utilities
order: 9
tags: [lists, data-table, condition-builder, encoded-query]
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

Hooks (page cache): `useList`, `useInfiniteList`, `useCrumbs`, `useFilterFields`, `useFieldPath`, `useEditability`, `useCellWrite`, `useListInvalidate`, `useListPreferences`, `listKeys`.

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
- URL/state sync: `state={{ filter, keywords, orderBy, page }}` + `onStateChange`.
- `live` (or `live={{ throttleMs }}`) refetches the current page when matching records change and briefly highlights changed rows.

### `<DataTable>`

The presentational grid for any rows: a real `role="grid"` with roving focus, full keyboard support, `aria-sort` / `aria-rowcount` / `aria-rowindex`, resizable columns, virtualization, selection, and context-menu and editor slots. Also exported: `Pagination`, `ColumnChooser`, `CellEditor`, `PointMenu`, `DefaultCell`, `ROW_HEIGHT`.

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

### `app/list-card`

A list you can drop anywhere: `table` (default `incident`), `title`, `query`, `columns`, `orderBy`, `pageSize` (default 10), `height`, `pagination`, `density` (default `compact`), `parentField` + `parentSysId` (related list), `recordPage`, `liveUpdates`, `hide` (features to turn off).

## Not built yet

List UI actions and declarative actions. (Related lists: see [Related lists](related-lists.md).)

## Related

- [Live updates](../runtime-api/live-updates.md)
- [Header slots](header-slots.md)
