---
title: Catalog variables
description: Catalog items and record producers on the platform's catalog GraphQL — app/variable, MRVS with row g_form scopes, requested for, custom variables, the variable editor and the catalog widgets.
section: Service Catalog
order: 1
tags: [catalog, variables, mrvs, record-producer, requested-for, custom-variables, variable-editor]
---

# Catalog variables

Catalog items and record producers render from the platform's own catalog GraphQL, reuse the [field primitives](fields.md) for their variables, and submit through the platform's order-now and submit-producer APIs.

## `utilities:app/catalog`

| Fetcher | Platform call |
|---|---|
| `fetchCatalogItem(sysId, table?)` | One GraphQL query, `AppCatalogView_Query.itemViewLayout`: header, pricing, variables, the layout tree, defaults, catalog UI policies and client scripts, and a draft record for attachments |
| `fetchItemPrice(...)` | `POST /api/sn_sc/servicecatalog/items/{id}/price` (counts MRVS rows: each row's variable prices are added) |
| `submitCatalogItem(...)` | `order_now` (with `sysparm_requested_for`) or `submit_producer` |
| `fetchMrvsRowForm(...)` | The platform's MRVS row-form call (`POST /api/now/sp/widget/sc-multi-row-active-row`, as Workspace's row modal): row fields with per-choice prices, plus the set's catalog client scripts and UI policies |
| `canRequestFor(itemId, userId)` / `checkDelegation` | `GET /api/sn_sc/v1/servicecatalog/items/{id}/delegation/{user}` → `{ ok, message }` |
| `fetchVariableEditor(table, sysId)` | `GlideLayout_Query.formLayout`: the `variables` element (`GlideLayout_VariablesElementType._elements`), `variablesLayout`, `recordValues`; the record's catalog policies and scripts; its Save action |
| `saveRecordVariables({ data, changes })` | The record's Save UI action with the changed `variables.<name>` fields |
| `validateVariableRegex`, `uploadVariableAttachment` | Validation regex, attachment upload |
| `spClientScripts`, `spPolicy` | Normalise Service Portal model scripts and policies (row forms) |

The cart fetchers and hooks live here too; see [Cart and checkout](cart.md).

| Hook | Signature |
|---|---|
| `useCatalogItem(sysId, table = 'sc_cat_item')` | Cached per item (a fresh draft record each mount) |
| `useItemPrice(itemId, variables, quantity, enabled)` | Debounced, keyed by values |
| `useMrvsRowForm(setId, itemId, sourceTable?, enabled?)` | Row form metadata, scripts and policies for a multi-row variable set |
| `useVariableEditor(table, sysId, { enabled? })` | A record's variables |
| `useCanRequestFor(itemId, userId, { enabled? })` | The delegation check, cached per item and user |

## `components:app/variable`

| Export | What |
|---|---|
| `variableSpec(variable, { table })` | Maps all 32 `item_option_new` types onto a render kind + field metadata, rendered through `app/field-control` |
| `createCatalogForm(item, table = 'sc_cat_item')` / `useCatalogForm(item, table?)` / `<CatalogFormProvider form>` / `useCatalogFormContext()` | A form store with fields named `variables.<name>`. Any method accepts `<name>`, `IO:<sys_id>` or the sys_id, so `g_form`-style catalog scripts plug in |
| `catalogResolver(specs)`, `catalogItemIdOf(form)` | The `g_form` name aliases for any set of variables; the catalog item a form belongs to |
| `<Variable spec />` | One variable: fields via `field-control`; labels, sanitized rich-text labels, breaks, attachments, requested for and custom variables here |
| `form.serializeVariables()` | On the catalog form: the variables as the platform expects them. The form also carries `item`, `specs`, `specByName`, `resolve(nameOrAlias)`, `getVariable`, `priceAffecting` and the bound catalog `policies` |
| `VariableLabel`, `RichTextLabel`, `VariableBreak` | The label, rich-text label and break pieces `<Variable>` uses |
| `registerCustomVariable`, `resolveCustomVariable`, `customVariableKeys`, `CustomVariableHost`, `CustomVariableNotice`, `customVariableConfig`, `parseVariableAttributes` | The custom-variable contract (below) |
| `sanitizeHtml`, `QUESTION_TYPES`, `validateIp` | Helpers |

HTML variables (type 23) render `app/html-field` through `app/field-control`'s registry.

## Requested for

- **`components:app/requested-for-field`**: `RequestedForField`, a `sys_user` reference on `app/reference-field` that runs the platform's delegation check on every pick. A person the user may not request for gets "This person isn't eligible for this request." The field then clears (variables, as Workspace does) or keeps the previous person (`onIneligible="revert"`, item level).
- **Variable type 31 (Requested For)** renders it, bound to the catalog form.
- **Item level:** `app/catalog-item` shows a "Requested for" picker that defaults to the current user. Its value is the order's `requested_for`. An item with a Requested For variable uses that variable instead (the platform's rule), and record producers have none. Widget option `requestedFor: 'hidden'` turns it off.
- **Several items:** `itemId` also takes a list of item ids (a cart). Every item is checked, and `itemNames` (id → name) lets the message name the items that fail.
- **Reusable:** `useRequestedFor({ itemId, itemNames?, initial? })` (`value`, `displayValue`, `set`, `reset`, `error`, `pending`, `valid`, `isSelf`, `fieldProps`) and `useDelegationCheck(itemId, itemNames?)`.

## Custom variables

Custom variables (types 14 and 17, and UI page variables) render one of **our** components when the variable's attributes name it:

```text
rp_component=app/star-rating-variable,rp_options={"max":5,"labels":["Nice to have","Helpful","Important","Very important","Blocking my work"]}
```

| Attribute | Meaning |
|---|---|
| `rp_component=app/<key>` | The component record that renders the variable |
| `rp_options={…}` | Optional JSON object passed as `options` (commas inside the JSON are fine) |

The component is a real input. It receives `CustomVariableProps`:

| Prop | What |
|---|---|
| `value`, `displayValue`, `onChange(value, displayValue?)` | The variable's glide-string value |
| `field` | The bound `useField` result: label, hint, states, messages, ids. Wrap the control in `<FieldShell field={field}>` for the standard label and errors |
| `options` | Parsed `rp_options` (`{}` when absent) |
| `showLabel` | True for "custom with label" (17) and UI page variables |
| `readOnly`, `layout`, `name`, `variable`, `spec` | State and metadata |
| `form` | The catalog form: other variables and `g_form`-style methods |

Values submit like any variable; mandatory, UI policies and `g_form` apply.

**Which component renders** (first hit):
1. `registerCustomVariable('app/<key>', Component)`: registration from code.
2. `utilities:app/custom-variables`: its `CUSTOM_VARIABLES` map. `app/variable` imports this record, so the components it lists load wherever variables render. To add one, import the component record there and add it under `'app/<key>'`. The component must not import `components:app/variable` (that would be an import cycle).
3. A component record already loaded on the page as `components:app/<key>` (its default export, or a named `CustomVariable` export).

Instance data never makes a component load on its own: only components the page's import graph already allows can render, the same rule as for [embeds](../authoring/embedded-widgets.md). Anything else shows a notice that names the missing component.

The demo is `components:app/star-rating-variable` (a radio group of stars).

## Containers, MRVS and attachments

- **`components:app/variable-container`**: `<VariableLayout>` renders containers as titled column sections, checkbox groups as named fieldsets, variable sets, and MRVS.
- **`components:app/mrvs`**: a multi-row variable set grid.
  - **Row g_form scope:** every row editor (inline or dialog) is its own form store with the platform's row form metadata, the set's catalog UI policies and its client scripts (onLoad, onChange, onSubmit; an onSubmit returning false blocks the row save). `g_service_catalog.parent` reads and writes the item form (`getValue`, `getDisplayValue`, `setValue`, `hasField`). Exported as `createRowScope` / `useRowScope`, with `rowVariable`, `rowPrice` and `parseRows`.
  - **Inline editing:** Edit turns the row into inputs. Tab moves between them, Enter saves, Escape cancels, and focus returns to the row's Edit button. "All fields…" or the expand button opens the full row form in a dialog (`components:dialog`). Prop `inlineEdit={false}` turns inline editing off.
  - **Prices:** when the set has price-implying variables and the item shows prices, a Price column and a rows total show the row form's per-choice prices (`rowPrice`). The item price comes from the platform's price call, which adds the rows.
  - **Remove all** asks first (`app/confirm-dialog`).
  - Max-row and unique-column rules apply; the value is the platform's MRVS JSON.
- **`components:app/attachment-variable`**: an accessible drop zone with extension and size checks (`draftTable`, `draftSysId`, `allowedExtensions`, `maxBytes`). Uploads go through [`utilities:app/attachments`](attachments.md).

## Variable editor

**`components:app/variable-editor`** renders a record's variables (a submitted RITM, a record producer's target record) read-only or editable:

```tsx
import { VariableEditor } from 'components:app/variable-editor'

<VariableEditor table="sc_req_item" sysId={ritmSysId} readOnly />
```

- Data comes from the platform the way Workspace's form gets it: `GlideLayout_Query.formLayout`'s `variables` element and variables layout. Rendering reuses `app/variable` and `app/variable-container`, so every variable type, MRVS and custom variables work.
- **Editable** (the default when the user may write the variables): the record's catalog UI policies and client scripts run, and Save sends only the changed variables through the record's Save UI action, shaped as Workspace sends them: `variables.<name>` fields flagged `is_variable` with the question `id` and `type`. An MRVS goes as its rows' JSON with `containerType` and its column `fields`. Without the columns the platform deletes every row, so `saveRecordVariables` refuses to send an MRVS that lacks them.
- Props: `table`, `sysId`, `readOnly`, `fieldLayout`, `renderCustom`, `hideActions` (when a host form saves), `onSaved`, `className`.
- Also exported: `useVariableEditorForm(data, { readOnly })` and `variableChanges(form)`.
- Wiring it into record forms as a formatter comes later. The sp `variable-editor` page demos it (`app/variable-editor-demo`).

## Widgets

- **`app/catalog-item`**: header (picture, description, price), the requested-for picker, variables, and quantity (our combobox Select). Submitting validates first (an error summary takes focus and links to each field), then orders or submits the producer, shows the resulting number with a link and offers "Start another". **Add to cart** sits beside Order now (same validation; the item's `no_cart` / `no_order_now` settings apply); see [Cart and checkout](cart.md). The item comes from the URL's `item` param, else the `itemId` option; `table` defaults to `sc_cat_item`. Options: `itemId`, `table`, `fieldLayout`, `requestedFor` (`auto`, `hidden`), `cart`, `cartPage`.
- **`app/catalog-picker`**: featured items and live search.

The `sp` portal's `catalog` page puts both in a ⅓ + ⅔ Columns block. The picker lists the demo item "React Portal demo: Team equipment" (an MRVS with set-level policies and scripts, a Requested For variable and a custom variable) when it exists. The seed only looks it up by name: the catalog tables refuse writes from the app scope, so `scripts/seed/catalog-demo-global.js` creates it, run once in the global scope.

## Catalog client scripts and UI policies

Catalog client scripts and catalog UI policies run through the [form runtime](form-runtime.md) (`g_form` shim with catalog names). onSubmit scripts can block an order. A variable set's own policies and scripts run in its MRVS rows.

## Not built yet

Save as draft and order guides. Dependent variable choices inside MRVS rows are untested. Cart, Add to cart and checkout: see [Cart and checkout](cart.md).

## Related

- [Fields](fields.md)
- [Form runtime](form-runtime.md)
- [Cart and checkout](cart.md)
- [Dialogs](dialogs.md)
