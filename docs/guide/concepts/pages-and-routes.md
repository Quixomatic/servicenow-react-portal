---
title: Pages and routes
description: Page records, route patterns and matching, route params, page access and per-page settings.
section: Concepts
order: 3
tags: [page, routing]
---

# Pages and routes

A **page** (`x_312987_portal_page`) belongs to exactly one portal. Portal A's `/` and portal B's `/` are different rows. A page has a route pattern, an optional layout override, and placements in its layout's regions.

## Fields

| Field | Meaning |
|---|---|
| `portal` | Owning portal (mandatory; deleting the portal deletes its pages) |
| `name` | Display name |
| `title` | Page title; defaults to `name` |
| `route_pattern` | The route (below). Unique per portal |
| `layout_override` | A layout used instead of the portal's default layout |
| `layout_options_json` | Overrides the [layout options](layouts.md#layout-options) for this page (`{}` = portal default) |
| `content_width` | `inherit` (Portal default), `full`, `7xl`, `6xl`, `5xl`, `4xl`, `3xl`. See [Content width](content-width.md) |
| `access_config_json` | `{"roles": ["itil"]}`; empty means the portal's audience |
| `order` | Sort order (default 100) |
| `active` | Inactive pages don't exist for consumers |

## Route patterns

A route is portal-relative, with no leading or trailing slash:

| Pattern | Matches | Params |
|---|---|---|
| `''` | the portal root (served by the portal's `home_page`) | |
| `orders` | `orders` | |
| `orders/:id` | `orders/42` | `{ id: '42' }` |
| `docs/*` | `docs/a/b/c` | `{ '*': 'a/b/c' }` |

Segments are static (`[A-Za-z0-9._~-]+`), a param (`:name`, `[A-Za-z_][A-Za-z0-9_]*`), or a final `*`. The `RP: Validate page` business rule normalizes the pattern and rejects anything else, and rejects a second page at the same route in the same portal.

### Matching

The server resolves a path against every active page of the release manifest and the most specific route wins. A static segment scores 100, a param 10 and a splat 1, and the home route (`''`) matches only the empty path. An empty path resolves to the portal's home route first. No match answers `404 page_not_found`. The best match is chosen before access is checked, so a page the user can't open answers `404` too; a less specific page never takes its place.

In the browser, the host builds one TanStack Router route per bootstrap page (`orders/:id` → `orders/$id`, `docs/*` → `docs/$`), plus `/` and a catch-all. Each route's loader calls `POST /pages/resolve`, so the server's answer is authoritative.

### Route params at runtime

- `usePortal().page.params` holds the matched params on the client.
- `$sp.getParameter('id')` finds route params after `input` and before URL params. `context.params` in a server script holds them too.

## Page access

A page is visible when it's active and the user holds one of `access_config_json.roles` (or the list is empty). Studio users bypass the check. Inaccessible pages are left out of bootstrap's `pages` list, resolve as `404`, drop out of menus (page items), and their placements can't be executed.

Pages can also carry **Available for** / **Not available for** user criteria, ANDed with the roles. A page the criteria hide behaves exactly like a page the roles hide. See [User criteria](user-criteria.md).

## Navigation between pages

Pages navigate with `<Link to="orders/42">` or `navigate('orders/42')`. The host dispatches `PORTAL_NAVIGATE`, UI Builder updates the URL (`/params/page-id/orders%2F42`), and the new property value drives the router. See [Portal and location](../runtime-api/portal-and-location.md).

Portal-level placements stay mounted while you navigate. Page placements are keyed by page path, so a new path gets fresh widget instances.

## Related

- [Layouts](layouts.md)
- [Placements and blocks](placements-and-blocks.md)
- [Menus](menus.md)
- [Content width](content-width.md)
- [User criteria](user-criteria.md)
