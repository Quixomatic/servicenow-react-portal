---
title: Live updates
description: useRecordWatch, useAmbChannel and useAmbStatus over the shell's AMB connection — record watch, caveats and cost.
section: Runtime API
order: 8
tags: [amb, record-watch, live, websocket]
---

# Live updates

React Portal reuses the Next Experience shell's **AMB** (Asynchronous Message Bus) client to watch records. Three hooks are exported.

## `useRecordWatch(table, query, onChange?, options?)`

```ts
useRecordWatch(
    table: string,
    query: string | null,             // encoded query; '' / null = the whole table
    onChange?: (event: RecordWatchEvent) => void,
    options?: { enabled?: boolean; invalidate?: boolean /* true */; debounceMs?: number /* 250 */ },
): { status, error?, connection, channel, lastEvent }
```

- `ORDERBY` / `ORDERBYDESC` / `GROUPBY` terms are dropped (they change the channel name, not the filter). An empty filter is watched as `sys_idISNOTEMPTY`.
- `onChange` runs once per message.
- With `invalidate` (the default), the page cache for the table refetches, throttled: the [Table API hooks](table-data.md), `utilities:app/list-data` lists and `utilities:app/graphql` record reads.

```ts
type RecordWatchEvent = {
    table: string
    sysId: string
    action: 'entry' | 'change' | 'exit'          // relative to the filter
    operation: 'insert' | 'update' | 'delete'
    changes: string[]                            // changed field names
    modCount: number                             // sys_mod_count
    updatedOn: string
    fromUser: string
    displayValue: string
    record: unknown                              // raw server payload
    raw: unknown
}
```

`status` is `'idle' | 'subscribing' | 'subscribed' | 'denied' | 'error'`. `denied` means the platform answered 403. In practice record-watch subscriptions are accepted for any table and query, even ones the user can't read (see the rules below).

## `useAmbChannel(channel, onMessage, options?)`

```ts
useAmbChannel(channel: string, onMessage: (msg) => void, options?: { enabled?: boolean; graphQLSubscription?: string }): { status, error?, connection }
```

Any AMB channel, e.g. a GraphQL subscription's `/rw/graphql/…`. For a GraphQL subscription, pass the serialized subscription as `graphQLSubscription`; it's sent with the subscribe request.

## `useAmbStatus()`

```ts
useAmbStatus(): { connection: 'connecting' | 'open' | 'broken' | 'closed' | 'unavailable'; resumedAt: number | null }
```

## Rules of thumb

- **A message is a signal, not data.** Re-read through the Table API or GraphQL (ACL-enforced) and render that. Never render `event.displayValue`, `event.fromUser`, `event.record` or `event.raw`: a user watching a record it can't read still receives the record's display value (e.g. its number), the changed field names and who changed it, though no field values.
- **One connection.** The hooks use `window.amb.getClient()`, else `window.g_ambClient`: no second WebSocket and no bundled client. Without one, `connection` is `'unavailable'` and the hooks do nothing.
- **Shared channels.** Identical watches share one subscription (reference-counted). A channel is released about 1 s after its last hook unmounts, so StrictMode double mounts and route changes don't churn subscriptions. Non-403 subscribe failures retry at 2, 8 and 32 s.
- **Reconnects.** Reconnect and short-gap redelivery are the client's job. After a reconnect every watched table is refreshed once.
- **Own writes echo back.** Compare `modCount` with what you loaded to ignore your own saves.
- **Cost.** The server evaluates every watch on every write to that table. Avoid broad watches on hot tables.
- **Studio.** The designer canvas runs with live updates off.

> **Warning:** Tested with a roleless user (2026-11-20): field values are filtered per ACL, but metadata (display value, sys_id, changed field names, `from_user`) reaches any subscriber, even for records it can't read. Treat watch events as hints and always re-read through ACL-enforced APIs.

## Where it's used

- `useRecord` / `useTableQuery` with `live: true`.
- `app/list-view` and `app/list-card` with the `liveUpdates` option (changed rows highlight).
- `app/record-form`: a clean form refreshes silently; a dirty one shows a "Changed by someone else" banner.
- `utilities:app/attachments` (`useAttachments`): watches `sys_attachment` for `table_name=<table>^table_sys_id=<sys_id>` and refetches that record's attachments, so another tab's uploads, renames and deletes appear.
- `utilities:app/activity` (`useActivity`): the activity stream's own channel `/activity/events/<sys_id>` (via `useAmbChannel`), whose messages carry the event itself; it's applied to the cache in place.

## Mock mode

With `?rpmock=1` an in-memory bus replaces AMB: `window.__rpAmb.emit(table, sysId, patch)` and `.remove(table, sysId)` write a mock row and publish; `window.__rpAmb.diagnostics()` lists channels, listeners and counters.

## Related

- [Table data](table-data.md)
- [Data access security](../security/data-access.md#amb)
