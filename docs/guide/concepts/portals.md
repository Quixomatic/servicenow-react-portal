---
title: Portals
description: The portal record, its settings, audience, default layout, theme and home page.
section: Concepts
order: 1
tags: [portal, settings]
---

# Portals

A **portal** is one site: `sp`, `crm`, `app`. It's a record in `x_312987_portal_portal`, addressed by its **slug** in the URL (`/site/<slug>`). Everything else hangs off it: its pages, its portal-wide placements (header, sidebar, footer), its menus, and its one [release](builds-and-releases.md).

## Fields

| Field | Meaning |
|---|---|
| `name` | Display name |
| `slug` | URL segment, unique. Lower-case letters, digits and dashes, up to 63 characters (`^[a-z0-9][a-z0-9-]{0,62}$`) |
| `description` | Free text |
| `active` | Inactive portals are invisible to everyone except Studio users |
| `is_default` | The default portal. Only one can be the default: a business rule clears the flag on the others |
| `theme` | Reference to a [theme](themes.md) |
| `default_layout` | The layout every page uses unless it has a `layout_override` (must be `kind = layout`) |
| `home_page` | The page served at the portal root (`''`); must belong to this portal |
| `roles` | Audience roles. Empty means every authenticated user |
| `settings_json` | Portal settings (below) |
| `navigation_json` | Deprecated navigation tree; used only when the portal has no `primary` [menu](menus.md) |

## Settings (`settings_json`)

| Key | Type | Meaning |
|---|---|---|
| `contentWidth` | `full` \| `7xl` \| `6xl` \| `5xl` \| `4xl` \| `3xl` | Default [content width](content-width.md) for pages set to "Portal default". Unset means `7xl` |
| `layoutOptions` | object | Portal-wide [layout options](layouts.md#layout-options), applied when a page uses the portal's default layout |
| `exposedProperties` | string[] | System property names widgets may read with `useProperty` (besides `x_312987_portal.public.*`). See [Data access](../security/data-access.md#system-properties) |

The whole `settings` object reaches widgets as `usePortal().portal.settings` and server scripts as `$sp.getPortal().settings`. `$sp.getValue(name)` falls back to a portal setting when the widget has no option of that name, as in Service Portal. Custom keys are allowed.

## Audience and access

A user can open a portal when they're logged in, the portal is active, and they hold one of its `roles` (or `roles` is empty). Users with any React Portal studio role (developer, designer, publisher, admin) bypass these checks. A portal the user can't open answers `404 portal_not_found`, so its existence doesn't leak.

> **Note:** **In progress:** [user criteria](user-criteria.md) ("Available for" / "Not available for") on portals, pages and menu items, ANDed with the role checks.

## Portal-wide placements

A placement whose `page` is empty belongs to the portal itself. Portal-level placements render in every page's layout regions and **stay mounted across navigation** (header, sidebar, footer). See [Placements and blocks](placements-and-blocks.md).

## Validation rules

The `RP: Normalize portal` business rule lower-cases and checks the slug, validates the JSON fields, checks that `default_layout` is a layout and that `home_page` belongs to the portal. `RP: Single default portal` keeps only one default.

## Related

- [Pages and routes](pages-and-routes.md)
- [Layouts](layouts.md)
- [Builds, releases and manifests](builds-and-releases.md)
