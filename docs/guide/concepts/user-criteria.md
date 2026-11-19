---
title: User criteria
description: Audience control with the platform's user criteria on portals, pages and menu items (in progress).
section: Concepts
order: 11
tags: [security, audience, user-criteria, in-progress]
---

# User criteria

> **Note:** **In progress.** User criteria are being built right now. This page describes the design as it stands in the working tree. Roles (portal `roles`, page `access_config_json.roles`, menu item `roles`) are the committed audience model today. See [Access model](../security/access-model.md).

User criteria bring the Service Portal, Knowledge and Employee Center audience model to React Portal. Portals, pages and menu items get **Available for** and **Not available for** lists of `user_criteria` records.

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
| Portal | `404 portal_not_found` for bootstrap, resolve, execute and assets |
| Page | Left out of bootstrap's pages and menus; resolves as 404; its placements can't execute |
| Menu item | Dropped during per-user menu resolution |

Studio gets a "View as user" mode that evaluates criteria for another user (read-only).

## Related

- [Access model](../security/access-model.md)
- [Menus](menus.md)
- [Pages and routes](pages-and-routes.md)
