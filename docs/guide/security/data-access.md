---
title: Data access
description: How browser-side data access relies on platform ACLs (Table API, GraphQL, UI APIs), system properties exposure, preferences and AMB caveats.
section: Security
order: 4
tags: [security, acl, graphql, properties, amb]
---

# Data access

React Portal reads and writes business data only through the platform's own APIs, as the signed-in user. This page lists those APIs and the few places where React Portal itself decides what the browser may see: system properties, user preferences, live updates and compiled assets.

## Browser data uses the platform's APIs

Widgets and primitives read and write business data with the user's own session, through:

| API | Used by |
|---|---|
| Table API (`/api/now/table`) | `useRecord`, `useTableQuery`, `fetchJson` |
| GraphQL (`/api/now/graphql`) | `utilities:app/graphql`, `app/list-data`, forms, related lists, catalog, the activity stream (`GlideActivity` `getEvents` / `putJournal`) |
| UI APIs (`/api/now/ui/meta`, `/api/now/ui/ui_action`, `/api/now/ui/stream_entry`) | Field metadata, form Save and UI actions, full journal entries |
| Attachment API (`/api/now/attachment`) | `utilities:app/attachments`: uploads, downloads, rename, delete |
| Service Catalog APIs (`/api/sn_sc/…`) | Price, order now, submit producer, cart and checkout, catalog search |
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

Primitives store UI state (list personalization `x_312987_portal.list.<key>`, form collapse `x_312987_portal.form.<table>.collapsed`, the chosen form view `x_312987_portal.form.<table>.view`, presentation `x_312987_portal.form.presentation`) as the user's own preferences. The generic helpers in `utilities:app/list-data` refuse to read or write any name outside `x_312987_portal.*`, so a widget can't change a platform preference through them.

## AMB

[Live updates](../runtime-api/live-updates.md) reuse the shell's AMB connection.

- **Record-watch subscriptions are not refused.** A roleless user can subscribe to `/rw/default/<table>/…` for any table and query, including records it can't read and table-wide filters (`sys_idISNOTEMPTY`). `status: 'denied'` only appears when the platform answers 403, which it didn't for record watch in testing.
- **What a user receives for a record it can't read** (tested 2026-11-20 with a roleless user): no field values (`record` is only `{ sys_id, table }`), but the message still carries **metadata**: `metadata.display_value` (e.g. the incident number), `sys_id`, the changed field names, `changes_with_users` and `ext.from_user` (the user name of whoever made the change).
- **For records it can read**, the field values are filtered by field ACLs: a work note added to the caller's own incident arrived with `changes: ["work_notes"]` but no work-note text.
- **So messages are signals, not data.** Re-read changed records through ACL-enforced APIs and render that. Never render `display_value`, `changes_with_users`, `from_user` or `record` from a message.

## Assets

Compiled JS and CSS are served only to users who can access a portal whose release includes the build (or, before a portal is first processed, for active components and themes). Source maps are studio-only. Build code is not secret from portal users, though: don't embed secrets in client code.

## Related

- [Access model](access-model.md)
- [GraphQL utility](../primitives/graphql.md)
