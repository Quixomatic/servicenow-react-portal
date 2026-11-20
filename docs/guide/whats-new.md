---
title: What's new
description: A summary of React Portal releases 1.12 to 1.16, with links to the pages that cover each feature.
section: Introduction
order: 2
tags: [overview, releases, changelog]
---

# What's new

This page summarises releases 1.12 to 1.16 and links to the guide pages that cover each feature. The full list of changes, fixes and notes for every release is in `CHANGELOG.md` at the repository root.

## Next: quick utilities

- **`$sp.quick`:** a port of TurboForge's `tfQuickUtils` for component server scripts. It includes `getUniqueValues` (one `GlideAggregate` query, many times faster than a record loop), field and template helpers (`getField`, `compileText`, `compileMeta`), schema helpers, role and group checks, and `markdownToHtml`. Record data is ACL-checked for the user; `getUniqueValuesUnchecked` is the documented exception. Classic scripts in the scope use `new QuickUtils()`. See [Quick utilities](server-api/sp-api.md#quick-utilities).

## 1.16: related lists, attachments, activity, home and search

- **Related lists** on every record: `app/related-list` and `app/related-lists` (tabs, stacked or single), on the platform's own form layout and list layout calls. They cover reference, many-to-many and scripted relationships, with counts, lazy loading, personalisation and live refresh. Record forms show them as extra tabs or as sections below the form (option `relatedLists`), and `g_form.showRelatedList` and its siblings work. See [Related lists](primitives/related-lists.md).
- **Attachments:** `utilities:app/attachments` (uploads with progress, cancel and retry, rename, delete, live updates), the dropzone, list, panel and `app/attachment-field` primitives, and the RecordForm option `attachments`. See [Attachments](primitives/attachments.md).
- **Activity and journals:** `utilities:app/activity` on `GlideActivity`, `app/activity-stream`, `app/journal-composer` and `app/journal-field`, and the RecordForm option `activity`. See [Activity and journals](primitives/activity.md).
- **Service Portal home and search:** the sp home rebuilt from reusable widgets (hero search, announcements, quick links, my items, knowledge, catalog tiles), search on the platform's own search APIs (`utilities:app/search`, `app/search-box`, `app/search-results`), and the `app/knowledge` page. See [Home page and search](primitives/home-and-search.md).
- **Host kit:** `components:skeleton`, `components:empty` and `components:kbd`. See [Host kit](runtime-api/host-kit.md).
- **Menu items carry list parameters** (`params_json.record`: table, sys_id, view, query), and the active item is matched on them. See [Menus](concepts/menus.md).
- **Seeding and reprocessing:** portal reprocess is about 40 times faster (`withRegistryCache`), and `npm run seed` seeds only what differs from the instance, in batch mode. See [Seeding](internals/release-workflow.md#seeding).

## 1.15: cart and checkout

- **Cart and checkout** on the platform's Service Catalog cart: cart hooks in `utilities:app/catalog`, the `app/cart` page, and the `app/cart-button` header button in the new `header-actions` slot. See [Cart and checkout](primitives/cart.md).
- **`app/catalog-item`** gains Add to cart beside Order now.
- **The variable editor saves** through the record's Save UI action, with a guard that refuses a multi-row save without column data. See [Catalog variables](primitives/catalog-variables.md).

## 1.14: catalog wave 2 and rich text

- **Multi-row variable set rows run real form logic:** each row editor is its own `g_form` scope, with the set's UI policies and client scripts. Inline keyboard editing, per-row prices and Remove all.
- **Requested for:** `app/requested-for-field` with a delegation check, and an item-level "Requested for" on `app/catalog-item`.
- **Custom variables:** the attribute `rp_component=app/<key>` renders one of your components as a variable input.
- **`app/variable-editor`:** a record's variables, read-only or editable.

  See [Catalog variables](primitives/catalog-variables.md) for all four.
- **Rich text:** the host kit's `components:rich-text-editor` (TipTap 3, lazy-loaded) and `components:rich-text` (sanitised renderer, `sanitizeHtml`), and `app/html-field` for HTML fields and variables. See [Host kit](runtime-api/host-kit.md) and [Fields](primitives/fields.md#html-fields).

## 1.13: user criteria, dialogs, fields and embeds

- **User criteria** ("Available for" / "Not available for") on portals, pages and menu items, ANDed with the role checks, with a "View as user" preview in Studio. See [User criteria](concepts/user-criteria.md).
- **Related lists on every classic form** of the React Portal tables. See [Data model](internals/data-model.md).
- **Dialogs:** the host kit's `components:dialog`, `app/confirm-dialog` (`useConfirm`) and `app/field-dialog`; `g_modal.showFields` works. See [Dialogs](primitives/dialogs.md).
- **Forms:** annotations, split rows, "Changed by someone else" markers, a remembered view per table and `g_form.addDecoration`. See [Forms](primitives/forms.md).
- **Fields:** `components:calendar`, typed date and date-time entry with a calendar popover, `app/time-field`, `app/conditions-field`, `app/table-name-field`, `app/field-name-field`, E.164 phone numbers and `utilities:app/datetime`. See [Fields](primitives/fields.md#dates-and-times).
- **Embeds:** lazy embeds (the `lazy` prop and `useInViewOnce`) and embeds under layouts. See [Embedded widgets](authoring/embedded-widgets.md).
- **Studio:** a Dependencies panel, and baseline files per component kind (`x_312987_portal.studio.kind_files`). See [Code editor](studio/code-editor.md).
- **This guide** was added.

## 1.12: collapsible and tabbed forms

- **Forms:** collapsible sections (`app/form-section`), a tabbed mode (`app/form-tabs`), a form settings menu with View and Layout, and the record header in the page header. See [Forms](primitives/forms.md#sections-and-tabs).
- **App-shell sub-header variants:** the layout option `subheader` (`bar`, `banner`, `hidden`), set portal-wide or per page. See [Layouts](concepts/layouts.md).
- **Tailwind variants** no longer lose to other components' base utilities: variant rules move into an `rp-variants` layer after `utilities`. See [Styling](authoring/styling.md) and [Compiler pipeline](internals/compiler.md).

## Related

- [Introduction](index.md)
- [Primitives overview](primitives/overview.md)
- [Release workflow and seed](internals/release-workflow.md)
