---
title: Catalog variables
description: Catalog items and record producers on the platform's catalog GraphQL — app/variable, MRVS, containers, attachments and the catalog widgets.
section: Primitives and utilities
order: 3
tags: [catalog, variables, mrvs, record-producer]
---

# Catalog variables

Catalog items and record producers render from the platform's own catalog GraphQL, reuse the [field primitives](fields.md) for their variables, and submit through the platform's order-now and submit-producer APIs.

## `utilities:app/catalog`

| Fetcher | Platform call |
|---|---|
| `fetchCatalogItem(sysId, table?)` | One GraphQL query, `AppCatalogView_Query.itemViewLayout`: header, pricing, variables, the layout tree, defaults and a draft record for attachments |
| `fetchItemPrice(...)` | `/api/sn_sc/servicecatalog/items/{id}/price` |
| `submitCatalogItem(...)` | `order_now` or `submit_producer` |
| `fetchMrvsRowForm(...)` | The platform's MRVS row-form call |
| `validateVariableRegex`, `checkDelegation`, `uploadVariableAttachment` | Validation regex, delegation, attachment upload |

| Hook | Signature |
|---|---|
| `useCatalogItem(sysId, table = 'sc_cat_item')` | Cached per item (a fresh draft record each mount) |
| `useItemPrice(itemId, variables, quantity, enabled)` | Debounced, keyed by values |
| `useMrvsRowForm(setId, itemId, sourceTable?, enabled?)` | Row form metadata for a multi-row variable set |

## `components:app/variable`

| Export | What |
|---|---|
| `variableSpec(variable)` | Maps all 32 `item_option_new` types onto a render kind + field metadata, rendered through `app/field-control` |
| `createCatalogForm(item)` / `useCatalogForm(item)` / `<CatalogFormProvider form>` | A form store with fields named `variables.<name>`. Any method accepts `<name>`, `IO:<sys_id>` or the sys_id, so `g_form`-style catalog scripts plug in |
| `<Variable spec />` | One variable: fields via `field-control`; labels, sanitized rich-text labels, breaks, attachment and custom variables here |
| `serializeVariables()` | On the catalog form: the variables as the platform expects them |
| `sanitizeHtml`, `QUESTION_TYPES`, `validateIp` | Helpers |

## Containers, MRVS and attachments

- **`components:app/variable-container`**: `<VariableLayout>` renders containers as titled column sections, checkbox groups as named fieldsets, variable sets, and MRVS.
- **`components:app/mrvs`**: a multi-row variable set grid. Rows are added, edited and removed in a native modal dialog with their own form store per row, using the platform's row form metadata. Max-row and unique-column rules apply; the value is the platform's MRVS JSON.
- **`components:app/attachment-variable`**: an accessible drop zone with extension and size checks.

## Widgets

- **`app/catalog-item`**: header (picture, description, price), variables, quantity. Submitting validates first (an error summary takes focus and links to each field), then orders or submits the producer, shows the resulting number with a link and offers "Start another".
- **`app/catalog-picker`**: featured items and live search.

The `sp` portal's `catalog` page puts both in a ⅓ + ⅔ Columns block.

## Catalog client scripts and UI policies

Catalog client scripts and catalog UI policies run through the [form runtime](form-runtime.md) (`g_form` shim with catalog names). onSubmit scripts can block an order.

## Not built yet

Delegation and requested-for in the UI; inline MRVS editing; MRVS row prices in the total; cart, checkout and order guides. Dependent variable choices and references inside MRVS rows are untested.

## Related

- [Fields](fields.md)
- [Form runtime](form-runtime.md)
