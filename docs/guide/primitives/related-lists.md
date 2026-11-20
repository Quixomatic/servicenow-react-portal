---
title: Related lists
description: app/related-list (one related list of any record), app/related-lists (all of a record's lists as tabs, sections or one list), the record form integration, g_form.show/hideRelatedList, and the app/related-lists-card widget.
section: Primitives and utilities
order: 6
tags: [related-lists, m2m, relationships, forms, lists]
---

# Related lists

A record's related lists are the ones its form view lists (`sys_ui_related_list`). React Portal reads them, and their rows, through the same platform calls Workspace uses. It covers all three relationship kinds:

| Kind | Example name | Rows | Actions |
|---|---|---|---|
| Reference | `task_sla.task`, `incident.parent_incident` | Rows whose field points at the parent | **New**: a new child with the parent reference preset |
| Many-to-many | `sys_user_grmember.group`, `task_ci.task` | Rows of the m2m table | **Add**, **Edit…** (the linked records as one list), **Remove** (unlink selected rows) |
| Scripted (`sys_relationship`) | `REL:<sys_id>` | The relationship's query, run by the server | None (the script decides the rows) |

## Platform calls

| Step | Call |
|---|---|
| The record's lists | `GlideLayout_Query.formLayout.relatedLists(includeEmptyOmittedRelatedLists: true) { groupByField sourceTable targetTable count filter displayLabel label value relatedField omitIfEmpty }` plus `relatedListMetadata { hasRelatedLists }`, inside `GlideViewQuery_Query.uiView` so the form view resolves as on the form. This is Workspace's fragment, and it rides in the form bootstrap (`FORM_QUERY`), so a form makes no extra request |
| A list's rows | `GlideListLayout_Query.getListLayout(table, relatedListName, parentTable, parentRecordSysId, fixedQuery = filter)`: the relationship's own list layout (the parent column is dropped), `metadata.m2MData { isM2M sourceField targetTable targetField }` and `metadata { canCreate canDelete }` |
| m2m Add / Edit… / Remove | Table API rows on the m2m table (`POST` / `DELETE /api/now/table/<m2m>`): ACLs, business rules and audit apply |

What the platform does (verified on a live instance):

- `filter` is the server-resolved query for every kind. For a scripted relationship it is the script's result, e.g. `parent_id=<id>^parent_table=kb_knowledge_base`, or `sys_idIN-1` when it matches nothing.
- `relatedListName` + parent alone do **not** filter reference lists: `getListLayout` returns the whole table. So the list always passes `filter` as the fixed query, as Workspace does.
- Scripted relationships have no `displayLabel`, so the label falls back to `label`.
- A new record (`sys_id = -1`) has no related lists.

## `components:app/related-list`

```tsx
import { RelatedList } from 'components:app/related-list'

<RelatedList parentTable="incident" parentSysId={id} name="task_sla.task" />
<RelatedList list={info} parentSysId={id} title={false} onCount={setCount} onOpenRecord={form.openRecord} />
```

One related list, on `app/data-table`'s `RecordList` in related mode, with count, search, sort, paging, filters and column personalisation. Personalisation is stored per list name (`x_312987_portal.list.related:<name>`), not per record. It also has live refresh (AMB on the relationship's query) and an empty state.

| Prop | Meaning |
|---|---|
| `list` | A `RelatedListInfo` (from `useRelatedLists` or a bootstrap); else `parentTable` + `parentSysId` + `name` look it up |
| `view` | The parent's form view (its related-list layouts) |
| `title` | Heading (default: the list's label); `false` = none |
| `actions` | `true` (default), `false`, or `{ new, add, edit, remove }` |
| `readOnly` | No actions, no inline edit |
| `recordPage` | Page that opens rows and New (`table` / `sys-id` / `query` params); default `form` when the portal has it, else the classic form |
| `onOpenRecord(table, sysId, params?)` | Open records yourself (a form passes its own, which guards unsaved changes) |
| `onCount(n)`, `onChanged()` | The unfiltered count once loaded; after an action changed the relationship |
| `live`, `pageSize` (10), `density` (compact), `variant` (plain), `height`, `features`, `emptyText` | List options |

**New** opens the record page with `sys_id=-1` and `query=<relatedField>=<parent>`, so the platform presets the parent reference (as `g_aw.openRecord(table, '-1', { query })` does). **Add** and **Edit…** open a dialog with the records linked to the parent (`app/field-dialog`, a `glide_list` on the m2m table's target field, so its reference qualifier applies). **Remove** asks first and only unlinks the rows: the linked records stay.

### Data exports

| Export | What |
|---|---|
| `fetchRelatedLists(table, sysId, view?)` | The record's lists (`{ view, lists, hasRelatedLists }`) |
| `useRelatedLists(table, sysId, view?, { initial?, enabled?, staleTime? })` | Cached per record + view; `initial` (a bootstrap's lists) skips the first request |
| `useRelatedList(table, sysId, name, view?, options?)` | One list; a `<table>.<field>` name works even when the list isn't on the view (`syntheticList(parentTable, parentSysId, name)` builds it) |
| `useRelatedListsRefresh()` | `(table?, sysId?, listTable?)`: refetch counts (and rows) |
| `useRelatedListActions({ list, parentSysId, page, open, enabled?, readOnly?, onChanged? })` | `canNew` / `newRecord`, `canAdd` / `add`, `canEdit` / `edit`, `canRemove` / `remove(rows)` |
| `useRecordOpener(recordPage?, onOpenRecord?)` | How widgets open records |
| `relatedListKind(list, page?)`, `newRecordQuery(list, parentSysId)` | `reference` / `many-to-many` / `scripted`; the New preset |
| `fetchM2MLinks`, `addM2MLinks`, `removeM2MRows` | m2m rows through the Table API |
| `relatedKeys`, `RELATED_LISTS_QUERY` | The query keys and the GraphQL document |

`RelatedListInfo` (from `utilities:app/graphql`): `{ name, table, parentTable, label, count, filter, relatedField, omitIfEmpty, groupByField, kind: 'reference' | 'scripted' }`. Many-to-many is known only once the list call answers (`ListPage.m2m`).

## `components:app/related-lists`

```tsx
import { RelatedLists } from 'components:app/related-lists'

<RelatedLists table="incident" sysId={id} layout="tabs" />
<RelatedLists table="sys_user_group" sysId={id} layout="stacked" />
<RelatedLists table="incident" sysId={id} layout="single" name="task_sla.task" />
```

- **Tabs** (default): one tab per list, with a count on each. Only the selected tab's list exists, so its query runs when the tab is chosen. The strip scrolls sideways on phones.
- **Stacked**: collapsible sections with counts, closed by default. A list loads once its section is open **and** on screen. Open sections are remembered per user and table in `x_312987_portal.related.<table>.open`.
- **Single**: one list (`name`, else the first).
- `omitIfEmpty` is honoured against the freshest count. Counts follow each list's own count once it loads, and refetch after New / Add / Remove.
- Filters: `include` (names, in that order) / `exclude` (names), `isShown(name)` (e.g. the `g_form` state below).
- Other props: `view`, `lists` (lists already loaded, such as a form bootstrap's: no first request), `heading`, `recordPage`, `onOpenRecord`, `actions`, `readOnly`, `live`, `pageSize`, `value` / `onValueChange` (the selected tab, controlled), `emptyText` (default: render nothing when there are no lists).

Exports: `RelatedLists`, `useVisibleRelatedLists(options)`, `useRelatedListTabs(options)` (tab descriptors with lazy `render()` for a strip you own), `useOpenRelatedLists(table)`, `RelatedCount`, `relatedTabValue(name)` (`rl:<name>`).

## In record forms

`RecordForm` shows the record's related lists from the bootstrap's copy, so no extra request:

- **Tabs presentation:** extra tabs after the sections (`app/form-tabs`' `extraTabs`), with counts. They are lazy, and the chosen tab is kept in `q` (`tab=rl:task_sla.task`).
- **Stacked:** collapsible sections under the form, headed "Related lists".
- `relatedLists` prop / widget option: `auto` (default, as above), `tabs` (a tab strip below a stacked form), `stacked`, or `off`.
- They render outside the `<form>` (or guard Enter), so typing in a list's search never submits the record.
- Rows and New go through the form's `openRecord`, so the "Discard your unsaved changes?" guard applies.

### `g_form`

`showRelatedList(name)`, `hideRelatedList(name)`, `showRelatedLists()`, `hideRelatedLists()` and `getRelatedListNames()` work.

- A name matches the list name (`task_sla.task`), its table (`task_sla`), or a relationship's `REL:<sys_id>` / bare sys_id.
- Flags live on the form store next to the section flags (`rl:<name>`, `rl:*`). They reset when the scripts restart (after a save).
- Helpers for any form store, in `utilities:app/gform`: `isRelatedListShown(store, name)`, `setRelatedListDisplay`, `setAllRelatedListsDisplay`, `matchRelatedLists`.

## `app/related-lists-card` widget

A record's related lists anywhere on a page. The record comes from the options, else the route params, else the URL params (`table`, `sys_id`).

| Option | Meaning |
|---|---|
| `table`, `sysId`, `view` | The parent record and its form view |
| `layout` | `tabs` (default), `stacked`, `single` |
| `name` | The list for `single` |
| `include`, `exclude` | Comma-separated list names |
| `title` | Card heading (default "Related lists") |
| `recordPage` | Page that opens records (default `form`) |
| `actions` (default true), `liveUpdates` (default false), `pageSize` (default 10) | Behaviour |

On sp, the **Lists** page shows INC0000060's lists as tabs and the Service Desk group's lists stacked.

## Not built yet

- **Platform related-list UI actions** (classic list buttons, declarative related-list actions). `getListDeclarativeActionsLayout` returns nothing without a workspace action config, so they wait for the list-actions wave (E1).
- **New** for scripted relationships and many-to-many (create the target, then link it).
- UI policy related-list actions (`sys_ui_policy_rl_action`).
- Live count updates for lists that aren't shown.
- `groupByField`.

## Related

- [Lists](lists.md)
- [Forms](forms.md)
- [Form runtime](form-runtime.md)
