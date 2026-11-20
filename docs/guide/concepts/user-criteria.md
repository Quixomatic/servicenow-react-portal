---
title: User criteria
description: Audience control with the platform's user criteria on portals, pages and menu items.
section: Concepts
order: 11
tags: [security, audience, user-criteria]
---

# User criteria

User criteria bring the Service Portal, Knowledge and Employee Center audience model to React Portal. Portals, pages and menu items get **Available for** and **Not available for** lists of `user_criteria` records, edited as related lists on their forms. They sit on top of the role checks (portal `roles`, page `access_config_json.roles`, menu item `roles`), which are unchanged. See [Access model](../security/access-model.md).

## Semantics

For one portal, page or menu item:

```text
allowed = (no "Available for" rows, or the user matches any of them)
          AND the user matches none of the "Not available for" rows
```

This is the same rule as catalog items and knowledge bases. User criteria are a second, independent layer, **ANDed** with the existing role checks. Studio users and admins bypass both, as they always have for roles.

## Tables

Six many-to-many tables, following the platform's `sc_cat_item_user_criteria_mtom` / `_no_mtom` pattern:

| Table | Links |
|---|---|
| `x_312987_portal_portal_uc` / `_portal_uc_no` | portal ↔ user criteria (Available / Not available for) |
| `x_312987_portal_page_uc` / `_page_uc_no` | page ↔ user criteria |
| `x_312987_portal_item_uc` / `_item_uc_no` | menu item ↔ user criteria |

Like the records they point at, they extend `sys_metadata`, so rows travel with the application. They're listed in `now.config.json` `ignoreTransformTableList`.

## Evaluation

- The rows are read **live per request** and are never stored in the release manifest, which stays user-independent. Changing them needs no reprocess.
- Per request, the rows of one portal (its own, its pages', its menu items') are read in six queries. The criteria they name are then evaluated for the user in **one** `sn_uc.UserCriteriaLoader.getMatchingCriteria(user, ids)` call; every check after that is a lookup. A portal with no rows costs six empty queries and no loader call.
- Only the referenced criteria are evaluated (`getAllUserCriteria` would run every scripted criterion on the instance).
- The cache resets at the start of every REST request and is keyed by the session user.
- If evaluation fails, every pending criterion counts as unmatched: "Available for" then denies and "Not available for" doesn't.

## Where it applies

| Record | Effect when denied |
|---|---|
| Portal | `404 portal_not_found` for bootstrap, resolve, execute, properties and assets |
| Page | Left out of bootstrap's pages and menus; resolves as 404; its placements can't execute |
| Menu item | Dropped during per-user menu resolution |

There are no widget-level (placement) criteria. Placements, embeds and layout roots on a hidden page are refused along with the page.

## View as user in Studio

The page designer and the Menus activity have a **View as user** picker. It evaluates the portal's criteria for another user, read-only, and marks the pages and menu items they would not see. Only the criteria layer is simulated; roles keep their "View as role" preview. A subject with admin or a studio role bypasses, as at runtime. The endpoints are `GET /rp_studio/users?q=&limit=` and `GET /rp_studio/portals/{id}/audience?user=<sys_id>`. See [Studio REST API](../rest-api/studio.md).

## Demo

The sp portal has an **Agents only** page (route `agents`) and an **Agent handbook** URL menu item, both available for the existing criterion "Users with 'itil' role". The **Agents only** menu item has no criteria of its own: it drops because its page is hidden. See [Demo portals](../getting-started/demo-portals.md).

## Related

- [Access model](../security/access-model.md)
- [Menus](menus.md)
- [Pages and routes](pages-and-routes.md)
- [Portals](portals.md#audience-and-access)
