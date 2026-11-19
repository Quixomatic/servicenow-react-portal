---
title: Data access
description: How browser-side data access relies on platform ACLs (Table API, GraphQL, UI APIs), system properties exposure, preferences and AMB caveats.
section: Security
order: 4
tags: [security, acl, graphql, properties, amb]
---

# Data access

## Browser data uses the platform's APIs

Widgets and primitives read and write business data with the user's own session, through:

| API | Used by |
|---|---|
| Table API (`/api/now/table`) | `useRecord`, `useTableQuery`, `fetchJson` |
| GraphQL (`/api/now/graphql`) | `utilities:app/graphql`, `app/list-data`, forms, catalog |
| UI APIs (`/api/now/ui/meta`, `/api/now/ui/ui_action`) | Field metadata, form Save and UI actions |
| Service Catalog APIs (`/api/sn_sc/…`) | Price, order now, submit producer |
| `/xmlhttp.do` | `GlideAjax` in the `g_form` shim |

Each enforces the platform's ACLs for the user; writes run business rules and data policies as on any platform save. React Portal adds **no** privileged data endpoint of its own: anything a widget's browser code can read, the user could read with the same API directly.

> **Note:** Client-side role checks (`useUser().hasRole`) are cosmetic. Enforce authority on the server.

## Server scripts

Component server scripts run in the `x_312987_portal` scope with its rights. Use `GlideRecordSecure` / `$sp.getRecord` for user-scoped reads. See [Server scripts](server-scripts.md).

## System properties

The browser can only read:

- properties named `x_312987_portal.public.*`;
- properties listed in the portal's `settings.exposedProperties`.

Everything else comes back `null`, and the embed signing secret is refused by name whatever a portal lists. Only list properties that are safe for every member of the portal's audience.

## User preferences

Primitives store UI state (list personalization `x_312987_portal.list.<key>`, form collapse `x_312987_portal.form.<table>.collapsed`, presentation `x_312987_portal.form.presentation`) as the user's own preferences. The generic helpers in `utilities:app/list-data` refuse to read or write any name outside `x_312987_portal.*`, so a widget can't change a platform preference through them.

## AMB

[Live updates](../runtime-api/live-updates.md) reuse the shell's AMB connection.

- A watch the user isn't allowed to make is refused (`status: 'denied'`, 403).
- **Messages are signals, not data.** Re-read changed records through ACL-enforced APIs. Whether the platform filters `event.record` per user ACL is unverified, so never render it directly.
- Non-admin AMB filtering hasn't been tested.

## Assets

Compiled JS and CSS are served only to users who can access a portal whose release includes the build (or, before a portal is first processed, for active components and themes). Source maps are studio-only. Build code is not secret from portal users, though: don't embed secrets in client code.

## Related

- [Access model](access-model.md)
- [GraphQL utility](../primitives/graphql.md)
