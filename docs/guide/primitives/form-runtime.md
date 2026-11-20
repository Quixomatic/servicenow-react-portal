---
title: Form runtime
description: UI policies evaluated in the browser, and the g_form compatibility layer that runs existing client scripts unchanged.
section: Primitives and utilities
order: 6
tags: [ui-policies, g_form, client-scripts, glideajax]
---

# Form runtime

Record forms and catalog items run the platform's **UI policies** and **client scripts**. Policies are evaluated by a declarative engine; client scripts run unchanged on a `g_form` compatibility layer.

## UI policies

The engine lives in `components:app/field` (`attachPolicies`, `evaluatePolicy`, `evaluateTerm`, `computePolicyLayer`) and is shared by record forms and catalog items.

- The platform ships each policy with its conditions (encoded-query terms) and actions. Terms the server already evaluated (dot-walks, fields not on the form) arrive with `preEvaluatedTerm` / `preEvaluatedTermResult`; everything else is evaluated in the browser, against the form's committed values, on load and after every change.
- Results go into the store's **policy layer**, recomputed as a whole. A policy that turns false without "reverse if false" simply stops contributing, so whatever was below it (server state, dictionary) shows again. With reverse, its actions apply inverted.
- Later policies (higher order) win over earlier ones. Script overrides (`g_form.setMandatory`…) sit above the policy layer (last writer wins with scripts).
- **On load = false** policies are respected.
- Side effects run only on a false → true transition: "clear value" actions and catalog "set value".
- **Run scripts** execute through the `g_form` environment.
- Catalog UI policies can show a field message while their condition is true.

## `utilities:app/gform`

Only legacy scripts receive it: client scripts (onLoad, onChange, onSubmit), UI policy run scripts, and UI action onclick scripts. New widgets use the typed form API instead.

| Export | What |
|---|---|
| `startScriptEnvironment({ host, scripts, scratchpad, user, policies, onError, catalog? })` | Binds onChange scripts, runs onLoad (then onChange with `isLoading`), hooks UI policy run scripts. Returns `{ env, stop }` |
| `useClientScripts({ …, enabled?, runKey? })` | The same as a React hook (re-runs when `runKey` changes) |
| `createScriptEnvironment(options)` | The environment alone (`g_form`, `g_user`, `runOnSubmit`…) |
| `compileScript(script, exports)` | The sandbox |
| `createGlideAjaxClass`, `createGlideRecordClass` | The `GlideAjax` / `GlideRecord` shims |
| `scriptUserFrom(user)` | A `g_user` from the runtime's user |
| `catalogParent(store, resolve?)` | A `g_service_catalog.parent` over any form store (pass it as `serviceCatalog.parent` to `attachGForm` / `createGForm`) |

Order follows the classic form: onLoad client scripts, then UI policies (their scripts replay for the current results).

### The sandbox

Like Workspace, every script is compiled with `new Function` in a scope where `window`, `document`, `jQuery`, `$`, `$j` and `angular` are `null` and `this` is an empty object. Available globals:

| Global | Notes |
|---|---|
| `g_form` | The form API (below) |
| `g_user` | `userName`, `userID`, `firstName`, `lastName`, `getFullName()`, `hasRole`, `hasRoleExactly`, `hasRoleFromList`, `hasRoles`, `getClientData` |
| `g_scratchpad` | From the form bootstrap |
| `GlideAjax` | Through `/xmlhttp.do` |
| `GlideRecord` | Async only (callback queries) |
| `getMessage`, `getMessages`, `g_i18n` | Translated messages |
| `g_modal` | `alert(title, message?)`, `confirm(title, message?)` (Promise); `showFields` rejects (not supported yet) |
| `g_aw` | `openRecord` opens the record in the portal; `closeRecord`, `setTabLabel` are no-ops |
| `g_service_catalog` | `openCatalogItem`, `isOrderGuide()`; in MRVS rows, `parent` (the item form: `getValue`, `getDisplayValue`, `setValue`, `hasField`) |
| `g_navigation`, `gsftSubmit`, `NOW` | Compatibility shims |

> **Note:** **In progress:** `g_modal.showFields` on a real dialog (`app/field-dialog`).

### `g_form` methods

Values: `getValue`, `setValue`, `clearValue`, `getDisplayValue`, `getDisplayBox`, `getBooleanValue`, `getIntValue`, `getDecimalValue`, `getReference` (callback only: synchronous lookups aren't supported), `getUniqueValue`, `getSysId`, `getTableName`, `getViewName`, `getEncodedRecord`, `serialize`, `isNewRecord`, `isDirty`, `modified`.

Field state: `setMandatory`, `isMandatory`, `setReadOnly` / `setReadonly`, `isReadOnly`, `setDisabled`, `isDisabled`, `setDisplay`, `setVisible`, `isVisible`, `setLabel`, `setLabelOf`, `getLabel`, `getLabelOf`, `setFieldPlaceholder`, `hasField`, `getFieldNames`, `getEditableFields`, `getElement`, `getControl`, `getFormElement`, `getOption`, `addOption`, `removeOption`, `clearOptions`, `addDecoration`, `removeDecoration`, `flash`.

Messages: `addInfoMessage`, `addErrorMessage`, `addWarningMessage`, `addFormMessage`, `clearMessages`, `showFieldMsg`, `hideFieldMsg`, `hideAllFieldMsgs`, `showErrorBox`, `hideErrorBox`.

Sections and lists: `setSectionDisplay`, `isSectionVisible`, `getSectionNames`, `getRelatedListNames`, `showRelatedList(s)`, `hideRelatedList(s)`. A name matches the list (`task_sla.task`), its table or a `REL:<sys_id>`; see [Related lists](related-lists.md#g_form).

Submit: `save`, `submit`, `gsftSubmit`, `getActionName`, `currentAction`, `isLiveUpdating`.

Attachments: `enableAttachments`, `disableAttachments`. Disabling stops new files from being added (files already attached stay listed); `app/attachment-panel` follows it. See [Attachments](attachments.md).

Catalog forms accept `<name>`, `IO:<sys_id>` or the variable sys_id for every field argument. onSubmit scripts returning `false` block the save or the order.

Script errors are reported through `onError` (shown to developers) and never break the form.

## Related

- [Forms](forms.md)
- [Catalog variables](catalog-variables.md)
- [Fields: the form store](fields.md#the-form-store)
