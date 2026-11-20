---
title: Actions
description: utilities:app/actions (one action model for forms and lists, on the platform's own evaluation), components:app/action-bar (the bar, menus and list slots), declarative actions, classic list actions, and the g_list shim.
section: Primitives and utilities
order: 9
tags: [actions, ui-actions, declarative-actions, lists, forms, g_list]
---

# Actions

Forms and lists show the platform's actions: UI actions and **declarative actions** (`sys_declarative_action_assignment`, the UX form action layout). The platform decides which ones a user gets. Conditions, roles and ACLs are evaluated on the server for the session user. Workspace's client conditions (the `{{…}}` model conditions) are applied in the browser. React Portal doesn't evaluate any condition itself.

| Piece | What |
|---|---|
| `utilities:app/actions` | The action model (`RpAction`), fetchers, client evaluation, `runAction`, hooks `useActions` / `useRunAction` |
| `components:app/action-bar` | `ActionBar` (buttons + More menu), `actionMenuItems` (context menus), `useListActionSlots` (a `RecordList`'s toolbar, selection bar and row menu), `mergeFormActions` |
| `utilities:app/gform` | `createGList` / `createListScriptEnvironment`: `g_list` for list scripts |

## Platform calls

| Surface | Fetch | Run |
|---|---|---|
| List, related list | `GlideListLayout_Query.getListDeclarativeActionsLayout(table, view, source: list \| related_list, actionConfigId, parentTable, parentRecordSysId)` | Server script: `POST /api/now/ui/declarative_action/{assignmentId}` with `sysIds`, `selectionQuery`, `query`. Client script: `onClick()` with `g_list`. UXF: mapped (below) |
| List, classic (opt-in) | `sys_ui_action` (server-side `list_context_menu` / `list_choice`), then `POST /xmlhttp.do` `AJAXActionSecurity` for the page's rows: the platform's per-record check, as in UI16's bulk menu | `POST /api/now/ui/ui_action/{id}?sysparm_sys_id=<record>`, once per allowed checked record |
| Form | The bootstrap's `GlideUIAction_Query.uiActions` (no extra request), plus `GlideUxActionLayout_Query.getActionLayout(table, sysId, view, actionConfigId)` for the declarative form actions | UI actions: the form's runner (onclick via `g_form`, or the server). Declarative: as for lists, with `g_form` |
| Related items | `GlideDeclarativeActions_Query…formDeclarativeActions` (`useRelatedItems`) | Seismic components only: listed, not rendered |

Workspace lists show **declarative actions only**. Classic list UI actions don't exist there (`GlideUIAction_Query` has no list variant), so React Portal's classic list support is an option, off by default.

### Classic list actions (opt-in)

Turn them on per list widget with `classicActions: true` (the app portal's incident list does). What you get:

- Only **server-side** actions (`client = false`) marked **List context menu** or **List choice**, from the table, its parents and `global`. A child table's action replaces its parent's action of the same name. List banner buttons, list buttons and client-side classic actions are skipped: their conditions use the classic list's `RP` object, and their scripts drive UI16's page.
- **The platform decides per record.** The page's rows (and the checked ones) go through UI16's own check, `AJAXActionSecurity`, which runs each action's condition and roles as the user. An action shows on a row's context menu only where it's allowed, and in the selection bar's **Actions** menu when it's allowed on at least one checked row. On incidents, for example, *Remove Incident* (related lists only) never shows; *Archive Record*, *Follow on Live Feed* and, for admins, *Add to Update Set* do.
- Running one posts `/api/now/ui/ui_action/{id}` once per allowed checked record (`current` = that record), as the user. Records it may not run on are skipped with a warning; session messages become toasts (repeated ones once, with a count); with no message, a success toast says how many records it ran on. The list refreshes.
- A classic action with the same label as a declarative one on the list (*Assign to me*) is dropped: the declarative one wins. Exclude the declarative one (`actionsExclude`) to get the classic one instead.

### Action configuration

A portal can name a **UX action configuration** (`sys_ux_action_config`) in its settings, `settings_json.actionConfigId`, just as `viewRuleConfigId` names view rules. Pick it in Studio ▸ portal settings ▸ **Actions** ("None" clears it). Widgets can override it with their own `actionConfigId` option.

- **Empty** (default): the platform's unrestricted actions. On forms, the bootstrap's UI actions are followed by the declarative form actions.
- **Set** (e.g. Service Operations Workspace's "SOW Actions"): forms use that configuration's UX form action layout in place of the UI actions, in its order and groups, as Workspace's record page does. Lists pass it to the list query.

### How actions run

| `actionType` | Here |
|---|---|
| `server_script` | `POST /api/now/ui/declarative_action/{assignmentId}`; session notifications become toasts, then the list or form refreshes; a `TABLE` redirect opens the record in the portal |
| `client_script` | `onClick(g_form)` on forms, `onClick()` with `g_list` on lists, in the client-script sandbox (`window`, `document`, jQuery = null) |
| `uxf_client_action` | Mapped where the portal has an equivalent: `CREATE_NEW_RECORD` / `route: 'record'` opens the record page (new records get a related list's parent query), `DA#EDIT_SELECTED` and `DA#EXPORT_MODAL` map to the list's own bulk edit and export when given. Anything else (Workspace modals, routes) is **hidden** unless `showUnsupported` |
| `interaction`, `action_component` | Not supported (Seismic) |

`confirmationRequired` asks first, through `app/confirm-dialog`. Actions that need a selection (`recordSelectionRequired`) go in the selection bar. Labels interpolate the model (`Edit ({{count}})` becomes `Edit (2)`, or plain `Edit` with nothing selected).

## `utilities:app/actions`

```tsx
import { useActions, useRunAction } from 'utilities:app/actions'

const { actions } = useActions({ kind: 'list', table: 'incident', query, selectedIds }, { exclude: 'Export' })
const { run, running } = useRunAction(() => ({ surface: 'list', table: 'incident', sysIds: selectedIds, refresh, openRecord }))
actions.map((a) => <button onClick={() => run(a)}>{a.label}</button>)
```

| Export | What |
|---|---|
| `useActions(context, filter?)` | `context`: `{ kind: 'form', table, sysId, view?, actionConfigId?, model? }` or `{ kind: 'list' \| 'related_list', table, view?, query?, selectedIds?, parentTable?, parentRecordSysId?, classic?, actionConfigId? }`. `filter`: `{ actions?: false, include?, exclude?, showUnsupported? }` (names, comma-separated). Returns `{ actions, all, model, replacesUiActions, isLoading, error }`. Cached per table, view and configuration; selection changes re-evaluate without a request |
| `useRunAction(ctx)` | `{ run(action, overrides?), running, busy }`; one action at a time; `ctx` (or a function returning it) is read at run time |
| `runAction(action, ctx)` | The plain runner (confirm → run → toasts, refresh, redirect). Returns `ActionOutcome` |
| `useActionSecurity(table, actions, sysIds)` | AJAXActionSecurity: `{ actionSysId: allowed sys_ids }` |
| `useRelatedItems({ table, sysId, view })` | The record's related items / side bar entries |
| `usePortalActionConfig()` | The portal's `settings.actionConfigId` |
| `fetchListDeclarativeActions`, `fetchFormActionLayout`, `fetchRelatedItems`, `fetchClassicListActions`, `checkActionSecurity`, `runDeclarativeServerScript` | Plain fetchers |
| `transformActions(actions, model)`, `filterActions(actions, filter)` | Client evaluation; widget allow / deny list |
| `interpolate`, `interpolateDeep`, `evaluateConditions`, `evaluateScriptedCondition`, `applyPayloadMap` | Workspace's declarative-action evaluator, ported |

`RpAction`: `{ id, source: 'ui_action' | 'declarative', name, label, hint, icon, order, placement: 'button' | 'menu', variant, group?, selection: 'none' | 'required', rowMenu?, confirm?, run, supported, raw }`.

## `components:app/action-bar`

```tsx
import { ActionBar, useListActionSlots } from 'components:app/action-bar'

<ActionBar actions={actions} onRun={run} running={running} maxButtons={3} label="Record actions" />

const slots = useListActionSlots({ table, view, openRecord, exclude: 'export' })
<RecordList table={table} {...slots.props} />
```

- `ActionBar`: `role="toolbar"`, the first `maxButtons` button-placed actions as buttons, the rest (and groups, with labels) in a **More** menu (the kit's menu: arrows, Home / End, typeahead, Escape). Destructive actions are styled as such; the running action shows a spinner.
- `useListActionSlots`: toolbar actions (no selection needed), bulk actions in the **selection bar**, and the selection actions plus classic context-menu actions on the **row context menu** (right-click, Shift+F10). It plugs into `RecordList`'s extension points (`toolbarActions`, `selectionActions`, `contextMenuItems`) and doesn't touch the table's internals.
- `mergeFormActions(uiActions, layout, replaces, skip)`: the form's bar (Save stays in the save bar).

## Widget options

| Widget | Options |
|---|---|
| `app/list-view` | `actions` (false hides platform and bulk actions), `actionsInclude`, `actionsExclude`, `actionConfigId`, `classicActions` (default off) |
| `app/record-form` | `actions`, `actionsInclude`, `actionsExclude`, `actionConfigId` |

## `g_list`

`createGList(target)` gives Workspace's list API over any list, and `createListScriptEnvironment({ list, user })` runs list scripts with `g_list`, `g_user`, `GlideAjax`, async `GlideRecord`, `g_modal`, `getMessage` and `g_navigation`. `gListTarget(() => controller)` (action-bar) maps a data-table `ListController` onto it.

| Supported | Warns only (as in Workspace) |
|---|---|
| `tableName`, `query`, `view`, `parentTable`, `fixedQuery`, `selectedSysIds`, `totalRows`, `related`, `getChecked`, `getQuery({ orderBy, groupBy, fixed, all })`, `getTableName`, `getListName`, `getTitle`, `getView`, `getFixedQuery`, `getParentTable`, `getOrderBy`, `getGroupBy`, `addFilter`, `setFilter`, `setFilterAndRefresh`, `setOrderBy`, `setGroupBy`, `sort`, `sortDescending`, `refresh`, `refreshWithOrderBy`, `setRowsPerPage` | `isUserList`, `setFirstRow`, `showHideGroups`, `showHideList`, `toggleList`, `toggleListNoPref` |

`setFilter` and friends stage a query; `refresh()` applies it. `onCellEdit` list client scripts aren't run (Workspace doesn't run them either).
