---
title: Forms
description: Record forms on the platform's form runtime — app/form (useRecordForm, RecordForm, FormLayout), sections, tabs, preferences, and the app/record-form widget.
section: Primitives and utilities
order: 5
tags: [forms, record-form, sections, tabs, save]
---

# Forms

`components:app/form` renders a record's **real form view**: the platform's layout, values, field states, UI policies, client scripts and UI actions, from one GraphQL request. Saving goes through the form's own Save UI action, so business rules, data policies and ACLs run as on any platform save.

## Platform calls

| Step | Call |
|---|---|
| Load | GraphQL `GlideViewQuery_Query.uiView` (layout, values, display values, field states, sections, UI policies, client scripts, form UI actions, scratchpad), the same query Workspace uses |
| Save / create | The form's Save UI action, `POST /api/now/ui/ui_action/{id}`, sending only the changed fields |
| Other UI actions | Client actions run through the [`g_form` shim](form-runtime.md); server actions through the platform. Redirects stay in the portal |

## `useRecordForm(options)`

```ts
useRecordForm({ table, sysId, view?, onSaved?, onOpenRecord? }): RecordFormModel
```

A [form store](fields.md#the-form-store) plus the bootstrap, UI policies, the client-script environment and `save()`. `SAVE_ACTIONS` lists the action names treated as Save (`sysverb_ws_save`, `sysverb_update`, `sysverb_insert`, `sysverb_ws_insert`).

- **Conflict check:** if the record changed since it loaded, a "Changed by someone else" prompt offers Reload or Overwrite.
- **Live:** a clean form refreshes silently when the record changes; a dirty one shows a banner.
- **Unsaved changes:** a guard warns before leaving.

## `<RecordForm>`

```tsx
import { RecordForm } from 'components:app/form'

<RecordForm table="incident" sysId={sysId} showViews presentation="tabs" onSaved={(outcome) => …} />
```

| Prop | Meaning |
|---|---|
| `form` | A model from `useRecordForm` (else `table` / `sysId` / `view` build one) |
| `table`, `sysId`, `view` | The record and form view (`sysId = -1` = new record) |
| `onSaved`, `onOpenRecord` | Callbacks |
| `showViews`, `onViewChange` | The form-view switcher |
| `fieldLayout` | `vertical` or `horizontal` |
| `hideFormatters`, `hideActions` | Hide formatter placeholders / the UI action bar |
| `headerActions` | Extra header content on the right (e.g. a "New" button) |
| `headerSlots` | `{ left?, right? }`: render the header into a page header's slots (see [Header slots](header-slots.md)) |
| `presentation` | `stacked` (default) or `tabs`: a **default only**; the user's own choice wins |
| `attachments` | `off` (default), `below` (a panel under the sections) or `header` (a paperclip + count that shows / hides the panel). See [Attachments](attachments.md) |
| `renderElement(name, ctx)` | Custom element rendering |
| `relatedLists` | `auto` (default: extra tabs in tabs mode, collapsible sections below a stacked form), `tabs`, `stacked`, `off`. See [Related lists](related-lists.md) |

What it renders: the header (unsaved indicator, table label, number, state badges), the UI action bar, Discard and Save (**Ctrl/⌘+S**), the form settings (cog) menu, an error summary that focuses and links to each invalid field, sections and columns.

### Sections and tabs

- **Stacked** (default): collapsible sections (`app/form-section`, on `components:collapsible`) with headings and dividers. Collapse state is remembered per user and table in `x_312987_portal.form.<table>.collapsed`. A collapsed section opens when a save finds fields to fix in it.
- **Tabs**: one tab per section (`app/form-tabs`, on `components:tabs`). Tabs show error and required badges, validation and error-summary links switch to the right tab, `tab=` is kept in `q` for Back and deep links, and the tab strip scrolls on phones.
- An untitled first section (e.g. incident's main fields) always stays on top: never collapsible, never a tab.
- A section hidden by `g_form.setSectionDisplay`, or whose fields are all hidden, disappears in both modes.
- The cog menu has **View ▸** and **Layout ▸** (Stacked / Tabs). The user's layout choice is stored in `x_312987_portal.form.presentation`. Platform preferences (`tabbed.forms`, `workspace.layout.*`) are never read or written.

### Related lists

The bootstrap also carries the view's related lists (`formLayout.relatedLists`, with counts), so they show without another request:

- in tabs presentation, as tabs after the sections, with counts;
- when stacked, as collapsible sections under the form.

Both are lazy: a list loads only when shown. `g_form.showRelatedList` / `hideRelatedList` apply. Rows and **New** open through the form's `openRecord`, so the unsaved-changes guard applies. Details: [Related lists](related-lists.md).

### Activity (opt-in)

`activity`: `off` (default; journal fields render as `app/journal-field`), `notes` (the composer and stream in the view's Notes section, at its first journal input) or `below` (under the sections). The presentation isn't decided yet. Details: [Activity and journals](activity.md).

### Header placement

- In a **banner** sub-header (`app/app-shell` with `subheader: banner`): the full record header (back, table, large title, badges, short description) and actions go into the header.
- In a **bar** sub-header: a compact header.
- Without header slots, or with `headerPlacement: 'inline'`: the card's own header row.
- On phones the UI actions move into a More menu; Save stays visible.

## Lower-level exports

`FormLayout` (`bootstrap`, `readOnly`), `FormSection`, `FormElement`, `SectionRows`, `useVisibleSections`, `sectionName`, `sectionElements`, `sectionOfField`, `isFormatter`, `isSplitMarker`; preferences `useOwnPreference`, `useCollapsedSections(table)`, `usePresentationPreference()`, `formPreferenceName`; `notify(notifications)`.

## `app/record-form` widget

A form page widget, like Service Portal's form widget: one generic `form` page serves any table.

| Option | Meaning |
|---|---|
| `table`, `sysId`, `view` | The record; each falls back to the route params, then the URL params (`sys_id=-1` = new) |
| `picker` | Demo convenience: search the table's records and a "New" button (shown only when no record is open) |
| `pickerQuery` | Filter for the picker |
| `showViews` | The form-view switcher |
| `headerPlacement` | `auto`, `header`, `inline` |
| `listPage` | A portal page with the list: adds a back button that carries the table |
| `presentation` | `stacked` or `tabs` (default only; the user's choice wins) |
| `attachments` | `off`, `below`, `header` (the record's attachments; default off) |
| `relatedLists` | `auto`, `tabs`, `stacked`, `off` |
| `activity` | `off` (default), `notes`, `below`: the opt-in composer + activity stream |

It navigates with explicit `table` / `sys-id` / `view` URL params.

## Not built yet

View rules (classic and Workspace view rules are ignored), annotations (**in progress**), formatters other than activity (attached knowledge, process flow…; the platform lists formatters without a position in the rows), highlighted values and form personalization.

## Related

- [Form runtime](form-runtime.md)
- [Related lists](related-lists.md)
- [Fields](fields.md)
- [Header slots](header-slots.md)
