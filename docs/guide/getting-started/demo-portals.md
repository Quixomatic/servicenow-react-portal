---
title: Demo portals
description: The three demo portals the seed creates, their pages, and what each one demonstrates.
section: Getting started
order: 2
tags: [seed, demo]
---

# Demo portals

The demo seed (`scripts/seed-demo.js`, generated from `scripts/seed/`) creates three portals plus every demo component, theme and menu. Each portal is a live worked example: open its components in Studio to see how they're built.

> **Note:** Generate and run the seed with `node scripts/seed/build-seed.mjs` then `now-sdk exec --file scripts/seed-demo.js`. The seed upserts by key. It deactivates (never deletes) menu items and portal placements it no longer defines, and recompiles every component in dependency order. See [Release workflow and seed](../internals/release-workflow.md).

## `sp`: Service Portal (default portal)

Layout `app/app-shell` (plain texture), theme `sp-light`, content width `6xl`, no footer. The sidebar (`app/app-sidebar`, icon-collapsible, inset) holds the `primary` menu in three groups with icons; the account menu sits in the sidebar footer. `app/app-header` shows breadcrumbs and the sidebar trigger. `app/app-subheader` holds page titles and toolbars through [header slots](../primitives/header-slots.md).

| Route | Page | Shows |
|---|---|---|
| `home` | Home | Banner sub-header ("How can we help?") |
| `incidents` | Incidents | `app/incident-list`: an on-load widget with `$sp`, `GlideRecordSecure`, `useServer` |
| `orders`, `orders/:id` | Orders, Order | Route params, `app/record-detail` with a `RegionPortal` contribution |
| `lists` | Lists | `app/list-card` lists |
| `list` | Record list | `app/list-view` full bleed: any table via URL params, toolbar in the sub-header |
| `form` | Record form | `app/record-form`: the platform's form view, UI policies, client scripts, UI actions |
| `fields` | Fields | `app/field-demo`: every field primitive standalone and bound to a record |
| `catalog` | Catalog | `app/catalog-picker` + `app/catalog-item` in a ⅓ + ⅔ Columns block |
| `layouts` | Layouts | Blocks: sections, grids (with subgrid), columns, stack, split |
| `embeds` | Embedded Widgets | `app/embed-demo`: import-based embeds, `$sp.getWidget`, `useEmbeddedWidget` |
| `tests` | Runtime Tests | `app/runtime-tests`: a live checklist of every runtime hook and `$sp` helper (sub-header hidden) |
| `about` | About | A page-level layout override (`app/centered-layout`) |

## `crm`: CRM

Default layout `app/standard-layout`, theme `crm-dark`. Classic shell widgets: `app/site-header` (with the light/dark/system mode toggle), `app/nav-sidebar` (offcanvas), `app/site-footer`. Pages: `dashboard` (home), `accounts`, `accounts/:id`. Its `footer` menu links across portals.

## `app`: Dashboard

Layout `app/app-shell` (noise texture), theme `app-neutral`, content width `6xl`. It's a ChannelGuide-style dashboard: an inset icon-collapsible sidebar with grouped, tinted menu items, a transparent header with breadcrumbs, and an inset main card. Pages: `overview` (home), `incidents`, `incidents-list` (full bleed), `form`, `fields`, `catalog`, `layouts`.

## Themes

| Key | Used by | Notes |
|---|---|---|
| `sp-light` | sp | Light and dark palettes, `sidebar-*` and `chart-1…5` tokens |
| `crm-dark` | crm | Light and dark palettes |
| `app-neutral` | app | Neutral palette with noise textures (inlined as data URIs by the seed builder) |

## Demo data the seed adds

- The property `x_312987_portal.public.welcome` (declared in Fluent), readable from widgets with `useProperty`.
- Six catalog demo items used by the `catalog` page (existing platform items).

> **Note:** **In progress:** user-criteria demo data. The working tree adds an "Agents only" page and an "Agent handbook" menu item restricted to a user criterion. See [User criteria](../concepts/user-criteria.md).

## Related

- [Your first widget](first-widget.md)
- [Primitives overview](../primitives/overview.md)
