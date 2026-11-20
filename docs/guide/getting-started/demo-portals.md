---
title: Demo portals
description: The three demo portals the seed creates, their pages and menus, and what each one demonstrates.
section: Getting started
order: 2
tags: [seed, demo]
---

# Demo portals

The demo seed (`scripts/seed-demo.js`, generated from `scripts/seed/seed-template.js` and the component folders in `scripts/seed/components/`) creates three portals plus every demo component, theme and menu. Each portal is a live worked example: open its components in Studio to see how they're built.

> **Note:** `npm run seed` is the usual way to run it. It's diff-based: it seeds only the components that differ from the instance, and reruns the portals step only when the template changed. The manual route is `node scripts/seed/build-seed.mjs` then `now-sdk exec --file scripts/seed-demo.js`. The seed upserts by key. It deactivates (never deletes) menu items and portal placements it no longer defines, compiles every changed component once in dependency order, and reprocesses each portal once at the end. See [Release workflow and seed](../internals/release-workflow.md).

## `sp`: Service Portal (default portal)

Layout `app/app-shell` (plain texture, medium padding), theme `sp-light`, content width `6xl`, no footer. The portal-level widgets are:

- `app/app-sidebar` (icon-collapsible, inset, brand "Service Portal"), with the `primary` menu and the `account` menu in its footer;
- `app/app-header`, with the sidebar trigger and breadcrumbs;
- `app/cart-button`, rendered into the app header's `header-actions` slot;
- `app/app-subheader`, which holds page titles and toolbars through [header slots](../primitives/header-slots.md).

The portal exposes `glide.sc.checkout.twostep`, `com.glide.attachment.max_size` and `glide.attachment.extensions` to widgets (`settings.exposedProperties`).

| Route | Page | Shows |
|---|---|---|
| `home` (home page) | Home | Banner sub-header ("How can we help?") with `app/hero-search` in its `below` slot, `app/announcements`, `app/quick-links` tiles with a live approvals count, `app/my-items` beside `app/kb-articles` in a Grid, popular `app/catalog-tiles`, and a "Can't find what you need?" band |
| `search` | Search | `app/search-results`: the portal search with a tab per source |
| `kb` | Knowledge | `app/knowledge`: topics and most-viewed articles, or one article |
| `orders`, `orders/:id` | Orders, Order | Route params, `app/record-detail` with a `RegionPortal` contribution |
| `incidents` | Incidents | `app/incident-list`: an on-load widget with `$sp`, `GlideRecordSecure`, `useServer` |
| `lists` | Lists | `app/list-card` lists (one a related list by parent condition) and `app/related-lists-card` as tabs and stacked |
| `tests` | Runtime Tests | `app/runtime-tests`: a live checklist of every runtime hook and `$sp` helper (sub-header hidden) |
| `embeds` | Embedded Widgets | `app/embed-demo`: import-based embeds, `$sp.getWidget`, `useEmbeddedWidget` |
| `embeds/layout` | Layout embeds | A page-level override with `app/embed-test-layout`: embeds rooted at the layout. Not in the menus; Runtime Tests use it |
| `layouts` | Layouts | Blocks: a Section, Columns, a 12-track Grid and a nested subgrid |
| `fields` | Fields | `app/field-demo`: every field primitive standalone and bound to a record |
| `list` | Record list | `app/list-view` full bleed: any table via URL params, toolbar in the sub-header. The Service desk menu items open it |
| `form` | Record form | `app/record-form` with a banner sub-header: the platform's form view, UI policies, client scripts, UI actions |
| `catalog` | Catalog | `app/catalog-picker` + `app/catalog-item` in a Columns block |
| `attachments` | Attachments | `app/attachments-card` as a list, chips and a grid, plus `app/record-form` with its attachments option |
| `variable-editor` | Variable editor | `app/variable-editor-demo`: a request item's variables, read-only or editable |
| `activity` | Activity | `app/activity-card` as a timeline, a side panel and a conversation, plus `app/record-form` with its activity option |
| `cart` | Cart | `app/cart`: cart lines, requested for, checkout |
| `about` | About | A page-level layout override (`app/centered-layout`) |
| `agents` | Agents only | Available only for the user criterion "Users with 'itil' role" |

### sp menus

| Menu | Items |
|---|---|
| `primary` | **Service desk**: Home, My requests, My incidents, My approvals, My tasks, My surveys, Knowledge, Catalog. **Components**: Record list, Record form, Incidents, Orders, List cards, Fields, Layouts, Embeds, Variable editor, Activity, Attachments. **More**: Runtime Tests, About, Agents only, Agent handbook |
| `account` | My open incidents, Request something, a separator, Dashboard and CRM (cross-portal), a separator, Documentation and Lucide icons (external) |

The "My …" items open the generic `list` page with [explicit record params](../concepts/menus.md#explicit-record-params): a table, a "Me" query and a `title`. My tasks and My surveys carry a condition, so they show only for users who have some. The **Agent handbook** URL item has its own user criteria; the **Agents only** item drops with its page.

## `crm`: CRM

Default layout `app/standard-layout`, theme `crm-dark`. Classic shell widgets: `app/site-header` (with the sidebar trigger and the light/dark/system mode toggle), `app/nav-sidebar` (offcanvas) and `app/site-footer`.

| Route | Page | Shows |
|---|---|---|
| `dashboard` (home page) | Dashboard | `app/hello-card` and `app/server-clock`: the same widgets as sp in another portal and theme |
| `accounts` | Accounts | Links to two accounts |
| `accounts/:id` | Account | `app/record-detail` with a route param |

Menus: `primary` (Dashboard, Accounts) and `footer` (a cross-portal link to Service Portal and a `mailto:` link).

## `app`: Dashboard

Layout `app/app-shell` (noise texture), theme `app-neutral`, content width `6xl`. It's a ChannelGuide-style dashboard: an inset icon-collapsible sidebar with grouped, tinted menu items, a transparent header with breadcrumbs and the cart button, and an inset main card with a sub-header.

| Route | Page | Shows |
|---|---|---|
| `overview` (home page) | Overview | `app/hello-card` and `app/server-clock` in a Columns block |
| `incidents` | Incidents | `app/incident-list` |
| `incidents-list` | Incident List | `app/list-view` full bleed with live updates |
| `form` | Record form | `app/record-form` with a banner sub-header; Back returns to the incident list |
| `fields` | Fields | `app/field-demo` |
| `catalog` | Catalog | `app/catalog-picker` (three items) + `app/catalog-item` |
| `cart` | Cart | `app/cart` |
| `layouts` | Layouts | A Section and a Grid, with the page's own layout options (large content padding) |

Menus: `primary` in three groups (Workspace, Build, More, with a cross-portal link to sp) and `account` (Service Portal, CRM, Documentation, and a Lucide icons link only for `x_312987_portal.developer`). Leaves get `chart-1`…`chart-5` tile tints by position.

## Themes

| Key | Used by | Notes |
|---|---|---|
| `sp-light` | sp | Light and dark palettes, `sidebar-*` and `chart-1…5` tokens |
| `crm-dark` | crm | Light and dark palettes |
| `app-neutral` | app | Neutral palette, `sidebar-*` and `chart-1…5` tokens, and noise textures (`--rp-noise`, inlined as data URIs by the seed builder) |

## Demo data the seed uses

- The property `x_312987_portal.public.welcome` (declared in Fluent), readable from widgets with `useProperty`.
- Existing platform catalog items for the sp catalog picker (six) and the app picker (three). The sp picker also lists "React Portal demo: Team equipment" when it exists: our scope can't write catalog records, so `scripts/seed/catalog-demo-global.js` creates it once, in global scope.
- Existing records for the Lists, Attachments and Activity pages (INC0000060, the Service Desk group, and two "safe to delete" test incidents).
- The existing user criterion "Users with 'itil' role" for the Agents only page and the Agent handbook item. See [User criteria](../concepts/user-criteria.md).

## Related

- [Your first widget](first-widget.md)
- [Primitives overview](../primitives/overview.md)
- [Menus](../concepts/menus.md)
- [Layouts](../concepts/layouts.md)
