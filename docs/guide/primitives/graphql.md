---
title: GraphQL utility
description: utilities:app/graphql — the GraphQL transport, fetchers and TanStack Query hooks for metadata, forms, choices, references and record values.
section: Primitives and utilities
order: 10
tags: [graphql, data, hooks, metadata]
---

# GraphQL utility

`utilities:app/graphql` is the shared data surface for primitives and widgets. It talks to the platform's own GraphQL endpoint (`POST /api/now/graphql`) and UI REST APIs with the user's session, so every read is ACL-enforced.

## Transport

| Export | Signature |
|---|---|
| `graphql(query, variables?, { operationName?, signal?, allowPartial? })` | `POST /api/now/graphql` with `X-UserToken`. Throws `GraphQLError` on errors (unless `allowPartial`) |
| `restGet(url, signal?)` | Same-origin JSON GET (Table / UI APIs) |
| `gql` | Identity template tag for documents |
| `authHeaders(json = true)`, `safeName(name, what?)` (throws on anything but a plain table or field name), `GRAPHQL_ENDPOINT`, `GraphQLError` | Helpers |

```ts
import { graphql, gql } from 'utilities:app/graphql'

const data = await graphql(gql`
    query rpRecent { GlideRecord_Query { incident(queryConditions: "active=true^ORDERBYDESCsys_updated_on", pagination: { limit: 5 }) {
        _results { sys_id { value } number { displayValue } }
    } } }
`)
```

## Fetchers

| Fetcher | Platform call |
|---|---|
| `fetchTableMeta(table, signal?)` | `GET /api/now/ui/meta/{table}`: every column's metadata (label, type, choices, reference, max length…) |
| `fetchFormBootstrap(table, sysId, view?, signal?, query?)` | `GlideViewQuery_Query.uiView` → `GlideLayout_Query.formLayout`: form layout, values, states, UI policies, UI actions, client scripts and related lists. `query` presets a new record's values |
| `fetchFormViews(table, sysId = '-1')` | `GlideViewQuery_Query.uiView.availableViews`: `{ current, views }` |
| `executeUiAction({ actionSysId, table, sysId, encodedRecord, fields })` | `POST /api/now/ui/ui_action/{id}` (the form Save) |
| `fetchChoices({ table, field, changes })` | `GlideLayout_Query.choiceDataRetriever` (dependent choices from unsaved values) |
| `searchReference({ table, field, term, changes, encodedRecord })` | `GlideLayout_Query.referenceDataRetriever` (the server applies the reference qualifier against the unsaved form) |
| `fetchRecordValues(table, { sysId }, fields)` | `GlideRecord_Query.<table>` |
| `fetchDisplayValue(table, sysId, displayField = 'name')` | One display value |

Also exported: `normalizePolicy`, `normalizeClientScripts`, `normalizeRelatedLists`, `CLIENT_SCRIPT_FIELDS`, `UiActionError`, `parseAttributes`, `stableChanges`, and the documents (`FORM_LAYOUT_QUERY`, `RELATED_LISTS_FIELDS`, `FORM_QUERY`, `FORM_VIEWS_QUERY`, `UI_POLICY_FIELDS`, `CHOICES_QUERY`, `REFERENCE_QUERY`).

## Hooks

TanStack Query hooks on the host's page cache:

| Hook | What |
|---|---|
| `useGraphQL(query, variables?, { enabled?, staleTime?, select?, keepPrevious?, …graphql options })` | Any query, keyed by document + variables |
| `useTableMeta(table, { enabled? })` / `useFieldMeta(table, field, { enabled? })` | Dictionary metadata, cached 10 minutes |
| `useFormBootstrap(table, sysId, { view?, query?, enabled? })` | The form bootstrap |
| `useFormViews(table, sysId, { enabled? })` | Form views |
| `useChoices({ table, field, sysId, dependsOn, dependentValue, changes, encodedRecord, staticChoices, serverEvaluated, enabled })` | Choices with unsaved dependent values |
| `useReferenceSearch({ table, field, term, sysId, changes, encodedRecord, limit, debounceMs, enabled })` | Reference search |
| `useRecordValues(table, sysId, fields, { enabled? })` / `useReferenceDisplay(table, sysId, displayField = 'name', { enabled? })` | Record values / a reference's display value |
| `useDebouncedValue(value, ms = 200)` | Debounce |
| `useGraphQLClient()` | The client for imperative calls |
| `gqlKeys` | Query-key factory (for invalidation); everything lives under `['rp-gql', …]` |

Record reads through these hooks are invalidated by [record watches](../runtime-api/live-updates.md) on the same table.

## Why GraphQL

The platform already loads a Workspace form with one GraphQL bootstrap. Reusing those queries gives React Portal the same layout, policies, ACLs and reference qualifiers, with one request per screen, and no custom REST wrapper to maintain.

## Related

- [Fields](fields.md)
- [Forms](forms.md)
- [Data access security](../security/data-access.md)
