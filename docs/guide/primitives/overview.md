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
widgets      record-form  list-view  list-card  related-lists-card  attachments-card  activity-card
             catalog-item  catalog-picker  cart  cart-button  variable-editor-demo
             hero-search  search-results  my-items  quick-links  catalog-tiles  kb-articles  knowledge
                  │
primitives   form ─ form-section ─ form-tabs ─ form-annotation      related-list(s)   attachment-*   activity-stream
             confirm-dialog ─ field-dialog                          data-table ─ condition-builder
             variable ─ mrvs ─ variable-container ─ requested-for-field ─ variable-editor
             search-box  highlighted-value
                  │
             field-control → string-field, reference-field, date-field, code-field … (24 field primitives) → combobox
             date-range-field
                  │
             field  (useField, FieldShell, FormProvider, form store, field registry, UI policy engine)
                  │
utilities    graphql  list-data  catalog  gform  attachments  activity  search  datetime  header-slots
                  │
host kit     components:dialog, tabs, collapsible, popover, calendar, rich-text(-editor) …
             avatar, pill, alert, accordion, breadcrumb, checkbox, label-value, stepper, progress, split-button,
             toggle-group, resizable, tree, heading, image, date-range-picker, code-editor (lazy chunk)
             utilities:react-query, react-table, react-virtual …
```

Every name above `host kit` is a record under the `app` namespace (`components:app/<key>` or `utilities:app/<key>`).

## Catalogue

| Area | Records | Page |
|---|---|---|
| Fields | `app/field`, `app/field-control`, `app/combobox`, `app/string-field`, `app/textarea-field`, `app/number-field`, `app/boolean-field`, `app/choice-field`, `app/reference-field`, `app/list-field`, `app/date-field`, `app/datetime-field`, `app/time-field`, `app/email-field`, `app/url-field`, `app/phone-field`, `app/password-field`, `app/currency-field`, `app/duration-field`, `app/conditions-field`, `app/table-name-field`, `app/field-name-field`, `app/html-field`; `utilities:app/datetime` | [Fields](fields.md) |
| Catalog | `utilities:app/catalog`, `utilities:app/custom-variables`, `app/variable`, `app/variable-container`, `app/mrvs`, `app/attachment-variable`, `app/requested-for-field`, `app/variable-editor`, `app/star-rating-variable` (demo custom variable); widgets `app/catalog-item`, `app/catalog-picker`, `app/variable-editor-demo` | [Catalog variables](catalog-variables.md) |
| Cart | cart hooks in `utilities:app/catalog` (`useCart`, `useAddToCart`, `useCheckout`…); widgets `app/cart`, `app/cart-button` | [Cart and checkout](cart.md) |
| Lists | `utilities:app/list-data`, `app/data-table`, `app/condition-builder`; widgets `app/list-view`, `app/list-card` | [Lists](lists.md) |
| Forms | `app/form`, `app/form-section`, `app/form-tabs`, `app/form-annotation`; widget `app/record-form` | [Forms](forms.md) |
| Form runtime | UI policies (in `app/field`), `utilities:app/gform` | [Form runtime](form-runtime.md) |
| Dialogs | `app/confirm-dialog`, `app/field-dialog` | [Dialogs](dialogs.md) |
| Activity | `utilities:app/activity`, `app/activity-stream`, `app/journal-composer`, `app/journal-field`; widget `app/activity-card` | [Activity and journals](activity.md) |
| Related lists | `app/related-list`, `app/related-lists`; widget `app/related-lists-card` | [Related lists](related-lists.md) |
| Attachments | `utilities:app/attachments`, `app/attachment-dropzone`, `app/attachment-list`, `app/attachment-panel`, `app/attachment-field`; widget `app/attachments-card` | [Attachments](attachments.md) |
| Data | `utilities:app/graphql` | [GraphQL utility](graphql.md) |
| Charts | `components:chart` (host kit), `utilities:app/analytics`, `app/data-chart`, `app/score-tile`; widgets `app/chart-card`, `app/score-card` | [Charts and dashboards](charts.md) |
| Page chrome | `utilities:app/header-slots` | [Header slots](header-slots.md) |
| Home and search | `utilities:app/search`, `app/search-box`, `app/highlighted-value`; widgets `app/hero-search`, `app/search-results`, `app/my-items`, `app/kb-articles`, `app/knowledge`, `app/catalog-tiles`, `app/quick-links`, `app/announcements` | [Home page and search](home-and-search.md) |

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
- [Host kit](../runtime-api/host-kit.md)
