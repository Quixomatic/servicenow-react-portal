---
title: Table data
description: useRecord and useTableQuery over the platform Table API, with ACLs, caching and optional live refresh.
section: Runtime API
order: 7
tags: [useRecord, useTableQuery, table-api]
---

# Table data

Two hooks read records through the platform's **Table API** (`/api/now/table/…`) with the user's session, so the platform's ACLs apply. Results are cached in the page-level TanStack Query client.

For richer data (dictionary metadata, form layouts, choices, reference search), use the GraphQL hooks in [`utilities:app/graphql`](../primitives/graphql.md).

## `useRecord(table, sysId, options?)`

```ts
useRecord(table: string, sysId: string, options?: {
    fields?: string | string[]
    displayValue?: boolean | 'all'
    live?: boolean
    liveThrottleMs?: number          // default 250
}): { data, isLoading, error, refetch, deleted }
```

```tsx
const { data, isLoading } = useRecord('incident', sysId, { fields: ['number', 'short_description', 'state'], displayValue: 'all', live: true })
```

With `live: true` the record is watched (AMB) and refetched when it changes, throttled. `deleted` becomes true after a delete.

## `useTableQuery(table, options)`

```ts
useTableQuery(table: string, options?: {
    query?: string                   // encoded query
    fields?: string | string[]
    limit?: number
    orderBy?: string | string[]      // 'field' or '-field' (descending)
    displayValue?: boolean | 'all'
    live?: boolean
    liveThrottleMs?: number          // default 1000
}): { data: rows[], isLoading, error, refetch }
```

```tsx
const { data: rows = [] } = useTableQuery('incident', {
    query: 'active=true^caller_id=javascript:gs.getUserID()',
    fields: 'sys_id,number,short_description',
    orderBy: '-sys_created_on',
    limit: 20,
    live: true,
})
```

`orderBy` terms are appended to the query as `ORDERBY` / `ORDERBYDESC`. With `live: true` the hook watches the query's filter and refetches the list when matching records change.

`live` is off by default for both hooks. See [Live updates](live-updates.md) for the costs.

## Caching

Query keys are `['rp', 'table', table, …]`. Record watches and the list primitives invalidate by table, so a `useRecordWatch` on a table refreshes these hooks too.

## Related

- [Live updates](live-updates.md)
- [GraphQL utility](../primitives/graphql.md)
- [Data access security](../security/data-access.md)
