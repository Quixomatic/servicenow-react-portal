---
title: Forms
description: Record forms on the platform's form runtime — app/form (useRecordForm, RecordForm, FormLayout), sections, tabs, preferences, and the app/record-form widget.
section: Primitives and utilities
order: 3
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
useRecordForm({ table, sysId, view?, views?, viewRuleConfigId?, onSaved?, onOpenRecord? }): RecordFormModel
```

A [form store](fields.md#the-form-store) plus the bootstrap, UI policies, the client-script environment and `save()`. `SAVE_ACTIONS` lists the action names treated as Save (`sysverb_ws_save`, `sysverb_update`, `sysverb_insert`, `sysverb_ws_insert`).

- **Conflict check:** if the record changed since it loaded, a "Changed by someone else" prompt offers Reload or Overwrite.
- **Live:** a clean form refreshes silently when the record changes; a dirty one shows a banner.
- **Unsaved changes:** a guard warns before leaving.
- **View:** `view` is forced (it beats view rules). With no `view`, the platform resolves it: the Workspace view rules of `viewRuleConfigId`, then the candidate list `views`, then Default. Both default to the portal's settings (`settings.viewRuleConfigId`, `settings.formViews`). See [Form view resolution](#form-view-resolution).

## Form view resolution

Which view a form shows. The first step that applies wins:

1. **Portal view rules** (`x_312987_portal_view_rule`): page rules of the current page, then portal rules (this portal's, or another portal's via `settings.viewRulesFrom`). A matching rule **forces** the view: the URL, the option and the remembered view can't override it, and the view switcher shows it locked with the rule's name. See [View rules](../concepts/view-rules.md).
2. the URL `view` param (user intent: deep links and the view switcher write it);
3. the widget / page option `view` (author intent). With the widget option `lockView: true`, the option comes before the URL and the view switcher is hidden;
4. the user's remembered view for the table (`x_312987_portal.form.<table>.view`, set by the switcher);
5. the **Workspace rules fallback**: Workspace view rules (`sysrule_view_workspace`) linked to the portal's `settings.viewRuleConfigId` (a `sys_ux_view_rules_configuration`);
6. the portal's candidate list `settings.formViews` (e.g. `"sp,ess"`; the first view that exists for the table);
7. the Default view.

How it works:
- Steps 1–4 run on the server **in the form's own GraphQL request**. The remote table `x_312987_portal_view_answer` returns the resolution as one row, and `uiView` takes it through `_query` / `$$parent` (`views: "$$parent.views$$", viewRuleConfigId: "$$parent.rule_config$$"`). Steps 5–7 are `uiView`'s own resolution in the same call. A form loads with **one request**, including forms with a URL view (v1.17 needed a `checkFormViews` pre-request).
- Named views count only when they exist for the table. An unknown URL or option view falls through to the next step and shows a small notice: "View `x` not found, showing <view>".
- `useRecordForm` applies portal rules by default inside a portal. Its `view` option is the author's view (step 3); `viewRules: { urlView, lockView, remember, remembered }` carries the rest; `forceView: true` or `viewRules: false` forces `view` without rules (the old behaviour). `form.resolution` says how the view was chosen: `{ view, source: 'rule' | 'url' | 'option' | 'remembered' | 'auto', ruleId, ruleName, missing, reason, via: 'answer' | 'api' }`.
- **Fallback:** without an answer row (e.g. the table isn't installed), the form switches to two calls for the page load: `x312987Portal.viewRules.resolve`, then the form.
- `default` / `Default view` name the Default view explicitly.
- The switcher (cog ▸ View) lists the table's views plus **Automatic**. Picking a view writes the URL `view` param and the remembered view; Automatic clears both. Its label shows "(auto)" when the platform chose the view. When a rule forced the view, the switcher shows **View** locked, and its tooltip names the rule.
- The form card carries `data-rp-form-view` (the view shown), `data-rp-view-pinned` (explicit or not), `data-rp-view-source` (`rule`, `url`, `option`, `remembered`, `auto`) and `data-rp-view-rule` (the rule's sys_id).
- Rules are edited in Studio ▸ View rules. Workspace rules for the fallback are managed in the platform's own UI (the View Rules related list of the `sys_ux_view_rules_configuration`; set **Experience restricted** so a rule applies only through its configuration).

Reusable exports:
- `useViewRulesContext()` → `{ portal, page }`;
- `usePortalViewSettings()` → `{ viewRuleConfigId, formViews }`;
- `utilities:app/graphql`: `resolveViewRules`, `explainViewRules`, `useViewRuleResolution`, `useViewRuleExplain`, `FORM_RULES_QUERY`, `viewAnswerConditions`, `checkFormViews`, `useFormViewCheck`, `isDefaultViewName`.

`useResolvedFormView({ table, urlView, optionView, lockView, remember? })` is the v1.17 client-side resolution without portal rules, kept for widgets that resolve a view themselves.

**Lists:** `getListLayout` has no rules argument, and Workspace has no list rules. Portal view rules that apply to lists force the list view (`app/list-view` asks `resolve(kind: 'list')` once per portal, page and table). Otherwise a list uses the view it is given (`app/list-view`: option, route, then URL), and an unknown list view silently gives the Default list layout. Related lists on a form use the form's resolved view.

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
| `viewPinned`, `missingView` | View resolution: `viewPinned` (true or false) adds **Automatic** to the switcher (`onViewChange('')`; Default → `'default'`); `missingView` shows the not-found notice |
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

### Layout details

- **Split rows:** `.begin_split` / `.split` / `.end_split` arrive resolved as columns, so rows can have 2, 3 or 4 columns.
- **Annotations** (`sys_ui_annotation`) render with `app/form-annotation`: info, warning and success callouts, plain text, line separators and line breaks, from the annotation type. HTML is sanitised unless the annotation is plain text.
- **Changed by someone else:** when the record changes while the form is open, fields with no unsaved edit take the new value silently; a field you're editing shows a marker with **Use theirs** / **Keep mine** (`applyRemoteValues(store, values)` in `components:app/field`).
- **Decorations:** `g_form.addDecoration(name, icon, title, color?)` / `removeDecoration` show icons after the label (platform icon names map to Lucide).

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

`FormLayout` (`bootstrap`, `readOnly`), `FormSection`, `FormElement`, `SectionRows`, `useVisibleSections`, `sectionName`, `sectionElements`, `sectionOfField`, `isFormatter`, `isSplitMarker`; preferences `useOwnPreference`, `useCollapsedSections(table)`, `usePresentationPreference()`, `useRememberedView(table)`, `formPreferenceName`; `useFormTabState` (from `components:app/form-tabs`); `notify(notifications)`.

## `app/record-form` widget

A form page widget, like Service Portal's form widget: one generic `form` page serves any table.

| Option | Meaning |
|---|---|
| `table`, `sysId` | The record; each falls back to the route params, then the URL params (`sys_id=-1` = new) |
| `view` | The page's view. The URL `view` param beats it, unless `lockView` is set ([Form view resolution](#form-view-resolution)) |
| `lockView` | The `view` option beats the URL; hides the view switcher |
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

Classic view rules (`sysrule_view`; by design: use [portal view rules](../concepts/view-rules.md)), formatters other than activity (attached knowledge, process flow…; the platform lists formatters without a position in the rows), highlighted values and form personalization.

## Related

- [Form runtime](form-runtime.md)
- [Related lists](related-lists.md)
- [Fields](fields.md)
- [Header slots](header-slots.md)
