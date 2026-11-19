---
title: Primitives overview
description: The record primitives and utilities that ship with the seed — fields, catalog variables, lists, forms, GraphQL — and how they relate.
section: Primitives and utilities
order: 1
tags: [primitives, utilities, catalog]
---

# Primitives overview

Primitives are reusable building blocks that widgets import: fields, lists, forms, dialogs. They're ordinary component records (`kind = primitive`, imported as `components:app/<key>`) and utilities (`kind = utility`, imported as `utilities:app/<key>`), so they compile once, cache once, travel in update sets and are editable in Studio.

They bind to **live platform metadata** through the platform's own APIs, mostly the GraphQL schemas Workspace uses, so dictionary, choices, reference qualifiers, ACLs, UI policies, client scripts and UI actions behave as they do on the platform.

> **Note:** The coverage map against Next Experience's ~365 components (what matches, what's partial, what's missing) is in [`docs/primitives/catalog.md`](../../primitives/catalog.md) and [`catalog.json`](../../primitives/catalog.json).

## The stack

```text
widgets          app/record-form   app/list-view   app/list-card   app/catalog-item   app/catalog-picker   app/field-demo
                        │                │                                 │
primitives       app/form ─ app/form-section ─ app/form-tabs      app/data-table ─ app/condition-builder     app/variable ─ app/mrvs ─ app/variable-container ─ app/attachment-variable
                        │                                                │                                   │
                 app/field-control → app/string-field, app/reference-field, app/date-field … (15 field primitives) → app/combobox
                        │
                 app/field  (useField, FieldShell, FormProvider, form store, field registry, UI policy engine)
                        │
utilities        app/graphql (transport + data hooks)   app/list-data (lists + encoded queries)   app/catalog   app/gform (g_form shim)   app/header-slots
                        │
host kit         components:tabs, components:collapsible, components:popover, utilities:react-query, utilities:react-table, utilities:react-virtual …
```

## Catalogue

| Area | Records | Page |
|---|---|---|
| Fields | `app/field`, `app/field-control`, `app/combobox`, `app/string-field`, `app/textarea-field`, `app/number-field`, `app/boolean-field`, `app/choice-field`, `app/reference-field`, `app/list-field`, `app/date-field`, `app/datetime-field`, `app/email-field`, `app/url-field`, `app/phone-field`, `app/password-field`, `app/currency-field`, `app/duration-field` | [Fields](fields.md) |
| Catalog | `utilities:app/catalog`, `app/variable`, `app/variable-container`, `app/mrvs`, `app/attachment-variable`; widgets `app/catalog-item`, `app/catalog-picker` | [Catalog variables](catalog-variables.md) |
| Lists | `utilities:app/list-data`, `app/data-table`, `app/condition-builder`; widgets `app/list-view`, `app/list-card` | [Lists](lists.md) |
| Forms | `app/form`, `app/form-section`, `app/form-tabs`; widget `app/record-form` | [Forms](forms.md) |
| Form runtime | UI policies (in `app/field`), `utilities:app/gform` | [Form runtime](form-runtime.md) |
| Data | `utilities:app/graphql` | [GraphQL utility](graphql.md) |
| Page chrome | `utilities:app/header-slots` | [Header slots](header-slots.md) |

> **Note:** **In progress:** `app/confirm-dialog`, `app/field-dialog` (`g_modal.showFields`), `app/form-annotation`, `app/time-field`, and condition / table-name / field-name field primitives. They're being built in the working tree.

## Design principles

- **Typed props and hooks**, not string attributes.
- **Small composable parts plus one convenience widget** (`DataTable`, `Pagination`, `ColumnChooser`… plus `RecordList`).
- **One request per screen**: a form loads with one GraphQL bootstrap; metadata is cached across forms.
- **Declarative runtime**: mandatory, read-only and visible are derived state; UI policies are computed, not imperative DOM toggling.
- **Accessibility in the base**: `app/field` owns label, hint, message and error wiring; lists and comboboxes follow WAI-ARIA patterns with full keyboard support.
- **Theme tokens everywhere**, light and dark.
- **Compatibility in a separate layer**: the `g_form` shim lets existing client scripts run unchanged; new code uses the typed form API.
- **Own preferences only**: UI state lives under `x_312987_portal.*` user preferences, never the platform's.

## Related

- [Record imports and the layering rule](../concepts/record-imports.md)
- [Demo portals](../getting-started/demo-portals.md)
