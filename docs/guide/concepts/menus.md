---
title: Menus
description: Portal menus as records, item types, per-user resolution, conditions, and the legacy navigation fallback.
section: Concepts
order: 10
tags: [menus, navigation]
---

# Menus

Navigation is data. Each portal has any number of **menus** (`primary`, `footer`, `account`…), each a tree of **menu items**. Header, sidebar and footer widgets read them with [`useNavigation(key)`](../runtime-api/layout-and-navigation.md#usenavigation); server scripts with [`$sp.getMenu(key)`](../server-api/sp-api.md#menus).

Menus belong to exactly one portal, like pages, and are never shared between portals.

## Menu (`x_312987_portal_menu`)

| Field | Meaning |
|---|---|
| `portal` | Owning portal |
| `key` | Lower-case slug, unique per portal: `primary`, `footer`, `account`… |
| `name`, `description` | Display |
| `active` | Inactive menus are left out of the manifest |

## Menu item (`x_312987_portal_menu_item`)

| Field | Meaning |
|---|---|
| `menu`, `parent` | Owning menu; parent **group** in the same menu (empty = top level) |
| `order` | Position among siblings |
| `type` | `page`, `route`, `url`, `group`, `separator`, `dynamic` |
| `label`, `icon`, `tooltip`, `badge` | Display. `icon` is a Lucide name in kebab-case (`layout-dashboard`) |
| `page` | Page items: a page of the menu's portal (survives route renames; deleting the page deletes the item) |
| `params_json` | Page items: `{"params": {"id": "42"}, "query": {"tab": "open"}}`. Route items: `{"portal": "<slug>"}` for a cross-portal link |
| `route` | Route items: a portal-relative path, optionally with a query (`orders?tab=open`, `''` = home) |
| `url` | URL items: `http(s)://` or `mailto:` only |
| `target` | `_self` / `_blank` |
| `match` | Active-state matching: `prefix` (default; `orders` is active on `orders/42`) or `exact` |
| `collapsed` | Groups: start collapsed |
| `roles` | Only users with one of these roles see the item (empty = everyone who can see the menu) |
| `condition` | Optional server script (below) |
| `badge_script`, `script` | Stored and syntax-checked, **not evaluated yet** (phase 2: badge text, dynamic children) |

Validation (`RP: Validate menu item`): the parent is a group of the same menu (no cycles, bounded depth), per-type required fields, page of the same portal, route and URL formats, a valid Lucide name. `RP: Syntax-check menu item scripts` parses `condition`, `badge_script` and `script` with Sucrase when they change and rejects a malformed script with its line and column.

The classic menu-item form has a Lucide **icon picker** formatter, using the full icon set served from `/api/x_312987_portal/rp/icons/lucide`.

## Per-user resolution

The release manifest stores active menus and items **unfiltered**. Bootstrap (`menus`) and `$sp.getMenu()` resolve them for the current user:

1. Items the user lacks `roles` for are dropped.
2. `dynamic` items are dropped (phase 2).
3. The `condition` runs; a false result, an error or a syntax error hides the item.
4. Page items whose page the user can't open are dropped; their route is filled from the page's pattern and `params` (an item missing a required route param is dropped).
5. Groups with no visible non-separator children are dropped.
6. Leading, trailing and doubled separators are removed.
7. Nesting stops at depth 4.

The result is a `NavItem[]` tree:

```ts
interface NavItem {
    id: string
    type: 'page' | 'route' | 'url' | 'group' | 'separator' | 'dynamic'
    label: string
    icon?: string; badge?: string; tooltip?: string
    to?: string                       // page / route items: portal-relative path
    q?: Record<string, string>        // query
    portalSlug?: string               // route items to another portal
    href?: string                     // url items
    target?: '_self' | '_blank'
    match?: 'exact' | 'prefix'
    open?: boolean                    // groups
    children: NavItem[]
}
```

The client adds `active` (from the current path), `tint` and Link props. See [`useNavigation`](../runtime-api/layout-and-navigation.md#usenavigation).

## Condition scripts

A condition is server JavaScript evaluated per user on every bootstrap (and every `$sp.getMenu`). It can be:

- a bare expression: `gs.hasRole('itil')`;
- a body that returns: `return gs.getUser().isMemberOf('Service Desk')`;
- a body that sets `answer = false`.

Variables: `$sp` / `$rp` (a portal-scoped [server API](../server-api/sp-api.md), without `getWidget`), `portal` (`{ id, slug, name }`), `item` (`{ id, type, label, pageId, route }`), `user` (`{ id, name }`). Falsy results (`false`, `''`, `0`, `null`, `undefined`) hide the item. Errors are logged (`gs.warn`) and hide the item.

> **Warning:** Conditions run on every bootstrap for every user. Keep them cheap.

## Legacy navigation fallback

For the `primary` key only, when the portal has no `primary` menu record, `useNavigation` falls back to the portal's deprecated `navigation_json`, and then to every page without route params. Other keys without a menu are empty, so a footer or account slot shows nothing rather than repeating the primary navigation.

## Editing menus

- **Studio → Menus** activity: live preview through the portal's real widgets, "View as" a role, drag-and-drop tree, item form with icon picker, undo/redo. See [Menus activity](../studio/menus.md).
- The classic lists and forms (React Portal → Menus / Menu Items).
- Studio API: `/rp_studio/portals/{id}/menus`, `/menus`, `/menu-items`. See [Studio REST API](../rest-api/studio.md#menus).

> **Note:** **In progress:** user criteria on menu items. See [User criteria](user-criteria.md).

## Related

- [Layout and navigation hooks](../runtime-api/layout-and-navigation.md)
- [`$sp` menus](../server-api/sp-api.md#menus)
