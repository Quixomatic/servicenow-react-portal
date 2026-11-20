---
title: $sp / $rp server API
description: Every method of the server helper injected into component server scripts, modeled on Service Portal's $sp.
section: Server API
order: 1
tags: [sp, rp, server, api, reference]
---

# `$sp` / `$rp` server API

Every component server script gets a helper object under two names, **`$rp`** and **`$sp`** (the same object; `$sp` lets Service Portal scripts port over). Menu-item condition scripts get a portal-scoped copy without `getWidget`.

```js
(function () {
    data.title = $sp.getValue('title')              // option → portal setting
    var gr = $sp.getRecord('incident', input.id)     // ACL-checked
    data.number = gr ? gr.getDisplayValue('number') : null
    data.me = $sp.getUser().name
    data.nav = $sp.getMenu('primary')                // the user's resolved menu tree
})()
```

## Options and portal

| Method | Returns |
|---|---|
| `getValue(name)` | The option `name` (unless `undefined` or `''`), else the portal setting `name`, else `null` |
| `getDisplayValue(name)` | `getValue(name)` as a string (`''` for null) |
| `getPortal()` | `{ id, slug, name, settings }` |
| `getPage()` | `{ route, params }` (route = the matched pattern, e.g. `orders/:id`), or `null` |
| `getComponent()` | The `component` variable: `{ id, uniqueId, instanceId, region, build, embedded, parentInstanceId, key, path }` |

## Parameters

| Method | Returns |
|---|---|
| `getParameter(name)` | The first hit in: `input[name]`, the page's route params (`orders/:id` → `id`), the portal URL's params (explicit `table` / `sys_id` / `view` / `query`, then the keys inside `q`). `null` if none |
| `getParameters()` | All of them merged in the same order (later wins): URL params ← route params ← input |

URL params are untrusted client input, validated for shape only. See [Portal and location](../runtime-api/portal-and-location.md#url-parameters).

## Records

| Method | Returns |
|---|---|
| `getRecord(table?, sysId?)` | A `GlideRecordSecure` positioned on the record, or `null` (missing or not readable). Without arguments it uses `getParameter('table')` and `getParameter('sys_id')` (or `id`) |
| `canReadRecord(table, sysId)` / `canReadRecord(gr)` | Whether the user can read it (`GlideRecordSecure.get`, or `gr.canRead()`) |
| `getField(gr, field)` | `{ name, label, type, value, display_value }` or `null` |
| `getFields(gr, 'a,b,c')` | Array of `getField` results (missing fields left out) |

## User and roles

| Method | Returns |
|---|---|
| `getUser()` | `{ sysId, userName, name, firstName, lastName, email, title, avatar, roles, timeZone, language, isImpersonating, impersonatedBy }` (the same object as bootstrap's `user`) |
| `hasRole(role)` | `gs.hasRole(role)` |

`impersonatedBy` needs the [global helper app](../internals/global-helper-app.md) (scoped code can't call `gs.getImpersonatingUserName()`); without it, it's `null`.

## Messages

| Method | Effect |
|---|---|
| `addInfoMessage(msg)` | Info toast for the user |
| `addErrorMessage(msg)` | Error toast |
| `addWarningMessage(msg)` | Warning toast |
| `addSuccessMessage(msg)` | Success toast |

Unlike `gs.addInfoMessage`, these never touch the session queue, so they never show up as a banner on a classic page. `gs` messages are forwarded too. See [Server script](../authoring/server-script.md#messages-become-toasts).

## Properties, translation and logging

| Method | Returns |
|---|---|
| `getProperty(name, fallback?)` | `gs.getProperty(name, fallback)` with the script's scope rights. `x_312987_portal.embed_secret` always returns the fallback (or `null`) |
| `translate(message, args?)` | `gs.getMessage(message[, args])` |
| `log(value)` | `gs.info('[React Portal <uniqueId>] …')`; non-strings are JSON-encoded |

## Menus

| Method | Returns |
|---|---|
| `getMenu(key = 'primary')` | The menu as the current user sees it: `NavItem[]`, the same tree as bootstrap's `menus[key]`; `[]` when it doesn't exist |
| `getMenus()` | Every menu of the portal for the user, by key |
| `getMenuItem(id)` | One resolved item (any menu, any depth) by sys_id, or `null` when hidden or missing |

Menus resolve lazily, once per helper, with this helper as the conditions' `$sp`. See [Menus](../concepts/menus.md#per-user-resolution).

## `getWidget`

```js
data.clock = $sp.getWidget('app/server-clock', { title: 'UTC' }, { key: 'utc' })
```

`getWidget(id, options?, settings?)` runs a widget **this component imports directly**, synchronously, and returns an `EmbedModel`:

```ts
{
    $embed: 1
    component: string        // 'app/server-clock'
    key: string              // embedKey
    ok: boolean
    data?: object            // the child's data (server mode on-load or on-demand)
    options: object          // effective options: child defaults ← your options
    token: string | null     // signs (root, path, options, user, expiry)
    build: string | null
    error?: { status, code, message }
    messages?: ServerMessage[]
}
```

| Argument | Meaning |
|---|---|
| `id` | `'app/server-clock'`, `'components:app/server-clock'`, or a bare key (`'server-clock'`) when exactly one direct widget import ends with it |
| `options` | Trusted options, merged over the child build's defaults **unfiltered** (so `x-embed: server` properties can be set) |
| `settings.key` | The embed key (`[A-Za-z0-9_-]{1,64}`); default: the last segment of the unique id |

- The child's script runs nested with `action = 'initialize'` and empty input. Its messages join the caller's.
- **Author errors throw** and fail the caller with `script_error`: not a widget this component imports (`add: import X from 'components:app/x'`), deeper than 4 levels, or more than 20 calls in one run.
- **The child's own errors don't throw**: the model comes back with `ok: false` and `error`, as in Service Portal.
- A child without a usable build returns `ok: false`, `error.code = 'no_build'`. A child with `server_mode = none` returns `ok: true, data: {}`.

Render the model with `<X model={data.clock} />` or `<Embed model={data.clock} />`. See [Embedded widgets](../authoring/embedded-widgets.md).

## Quick utilities

`$sp.quick` is **QuickUtils**, a port of TurboForge's `tfQuickUtils`. Its functions have the same names and signatures as the original, so ported scripts only change the receiver:

```js
// Service Portal + tfQuickUtils
var qu = new x_312987_turbofo_0.tfQuickUtils()
// React Portal
var qu = $sp.quick

data.categories = qu.getUniqueValues('incident', 'category', 'active=true', { valueOnly: true })
data.fields = qu.getFieldsObject($sp.getRecord(), 'number,priority,caller_id.email')
data.body = qu.markdownToHtml(options.intro)
```

It's a namespace (not mirrored onto `$sp`) because `getField` and `hasRole` already exist on `$sp` with other shapes.

**`$sp.quick` is ACL-checked for the user.** Component scripts run with the scope's rights (see [Server scripts](../security/server-scripts.md)), so every function that returns record data filters it by the user's row and field ACLs. The table below lists the behaviour of each function. Classic scripts get the same library through the [QuickUtils Script Include](script-include.md#quickutils).

### `getUniqueValues`

```js
$sp.quick.getUniqueValues(table, field, encodedQuery?, options?)
// → [{ value, display_value }] | string[] | 'a,b,c'
```

It returns the distinct values of `field` from one `GlideAggregate` `GROUP BY` query, without iterating the rows. The "no value" group is left out.

| Option | Effect |
|---|---|
| `valueOnly` | Return plain values (`['hardware', 'network']`) |
| `displayOnly` | Return plain display values |
| `asString` | With `valueOnly` / `displayOnly`, return a comma-separated string |
| `displayAttribute` | Also group by this field and use it for `display_value`, e.g. `assignment_group` with `assignment_group.name` |
| `sortBy` | `'a,b'` or `['a', { field: 'b', direction: 'desc' }]`. GlideAggregate also groups by each sort field |
| `scanLimit` | ACL probe depth (see below). Default 500, maximum 10000 |

**ACL checks.** Every distinct value must be backed by at least one row that the user can read, and on that row the user must be able to read the grouped, display, sort and query fields. A short `GlideRecordSecure` probe per value checks this and stops at the first row that passes. A value whose first `scanLimit` matching rows are all unreadable is dropped (fail closed). Queries the helper can't vet return `[]`: unknown fields, text search (`123TEXTQUERY321`) and `RLQUERY`. The probes add about one small query per distinct value. With a handful of values the cost is a few milliseconds; with hundreds of values it's noticeable (see [the benchmark](#benchmark)).

`getUniqueValuesUnchecked(...)` takes the same arguments and runs the plain aggregate with **scope rights and no ACL checks**. Use it only for values that aren't sensitive and must cover rows the user can't read, such as totals on a public dashboard. Never pass it a table, field or query that came from the client.

### Every function

| Function | Returns | In `$sp.quick` |
|---|---|---|
| `getUniqueValues(table, field, query?, options?)` | Distinct values (see above) | Row and field ACLs |
| `getUniqueValuesUnchecked(...)` | The same, unchecked | **Scope rights**, no ACLs |
| `getField(gr, 'a.b.c')` | `{ value, display_value, label, field_name, path, table, type }`, plus `numeric` for dates and `currency_*` for currency and price | `null` unless the user can read the record, each dot-walked record and the field |
| `getFieldsArray(gr, 'a,b')` | `getField` for each field | Same (unreadable fields are `null`) |
| `getFieldsObject(gr, 'a,b', obj?)` | `{ a: getField(…), … }`, merged into `obj` | Same |
| `compileText(text, current, record?)` | `{current.field}` / `{record.field}` replaced by display values, and `{current.ref._uri_}` by a link | Unreadable tokens become `''` |
| `compileMeta(text, sources)` | `{name.path}` tokens from `{ name: { type: 'glide' \| 'object' \| 'value', data } }`. For `glide`, add `.getvalue` for the value or `.shortvalue` for a 100-character display | Glide tokens are ACL-checked |
| `getCompiledURI(gr, path)` | `<a href=".../table.do?sys_id=…">display</a>` for `_uri_` (the record) or `ref._uri_` | ACL-checked; the display is HTML-escaped |
| `copyAttachments(fromTable, fromId, toTable, toId)` | `true` when copied | The source must be readable and the target readable and writable |
| `getUserGroups(userId?, { asString? })` | Sys_ids of the user's active groups | Your own groups: always. Another user's: the `sys_user_grmember` ACLs |
| `validGroups(list)` | `true` when at least one group is active and has an active member | **Scope rights** (a boolean about staffing, for approval routing; roleless users can't read memberships) |
| `hasRole(roles, exact?)` | The current user has any of the comma-separated roles (`exact`: no admin override). `''` → `true` | Current user only |
| `hasRoleExactly(role)` | The current user holds the role (inherited counts, admin doesn't) | Current user only |
| `getAllFields(table, refField?, path?, activeList?)` | Field descriptors `{ label, name, type, path, active, id, fields }`, sorted by label. Paths in `activeList` expand into their reference table | Dictionary metadata, no ACLs |
| `getJournalFields(table, types?, allowed?)` | Journal fields, or fields of `types`, or exactly `allowed` | Metadata |
| `getColumnType` / `getColumnLabel` / `getColumnElement` (`table, field`) | `{ value, display_value }` with the type, label or name | Metadata (dot-walks allowed) |
| `getColumnInfo(table, field)` | The label | Metadata |
| `getColumnTableName(table, field)` | For a reference field, the table it references; otherwise the table holding the field | Metadata |
| `getTableColumns(table, 'a,b')` | `[{ column_label, element, type }]` | Metadata |
| `getColumnChoices(table, field, force?)` | `[{ value, label }]` for string, choice and boolean fields (any field type with `force`) | Metadata |
| `markdownToHtml(md, { safe? })` | HTML from headers, fenced code, inline code, bold and italic, lists, links and images | **Safe by default:** HTML is escaped and non-http(s)/mailto/relative link and image targets are dropped |
| `dateDifference(a, b)` | Days between two dates (`yyyy-MM-dd`, date-time strings or GlideDateTime), always ≥ 0, possibly fractional | Pure |
| `createSimpleSet(list)` | Unique items of an array or comma-separated string | Pure |
| `truncateText(text, max)` | `text` cut to `max` characters, with `...` when longer | Pure |
| `convertToUSD(n, prefix = '$')` | `'$1,234.50'`. `null`, objects and non-numbers are returned unchanged | Pure |
| `parseFieldAttributes('a=1,b=2')` | `{ a: '1', b: '2' }` | Pure |
| `getInputVariableByName(name, default?)` | `input[name]`, or the default | This script's `input` |
| `getGlobalVariableByName(name, default?)` | `input[name]`, else `options[name]`, else the default (falsy values fall through) | This script's `input` / `options` |

Metadata functions return dictionary information only (labels, types, choices), never record data, so they don't check ACLs. Validate any table name that comes from the client.

### Changes from tfQuickUtils

- **ACL checks** in `$sp.quick`, as listed above. `new QuickUtils()` in classic scripts keeps the original's scope rights.
- `validGroups` runs one aggregate for the whole list instead of two queries per group.
- `getColumn*` helpers resolve dot-walks through the dictionary, so they work without a record. Unknown fields return `null` instead of throwing.
- `markdownToHtml` converts images before links (the original turned `![a](src)` into `!<a …>`), and escapes HTML when safe.
- `getCompiledURI` uses `glide.servlet.uri` (custom domains work) and HTML-escapes the display value.
- `truncateText` no longer drops the last character of a text exactly `max` long.
- `convertToUSD` returns non-numeric input unchanged, as its doc comment promised (the original returned `'$NaN'`).
- `parseFieldAttributes` keeps values containing `=`.
- `compileMeta` object tokens try the exact-case path first (camelCase keys work), then the lowercased one.
- `dateDifference` accepts date-time strings and GlideDateTime objects (the original appended ` 00:00:00` to them, which didn't parse).
- `getInputVariableByName` / `getGlobalVariableByName` read the component script's own `input` and `options`, not globals.

### Benchmark

These are the best of several runs on a dev instance as admin (read-only, 2026-11-20). They compare the helper with a loop that collects distinct `getValue` results from every row.

| Table.field | Rows | Distinct | GlideRecord loop | GlideRecordSecure loop | `getUniqueValues` (unchecked) | `$sp.quick.getUniqueValues` (ACL) |
|---|---|---|---|---|---|---|
| incident.category | 5,163 | 6 | 758 ms | 1,525 ms | **25 ms** | 103 ms |
| task.sys_class_name | 32,425 | 17 | 3,716 ms | 23,555 ms | **15 ms** | 125 ms |
| sys_documentation.language | 159,929 | 24 | 17,872 ms | — | **3,364 ms** | 3,243 ms |
| sys_dictionary.internal_type | 169,628 | 168 | 24,488 ms | — | **1,951 ms** | 2,787 ms |

The secure results matched the unchecked ones in every case. GlideAggregate groups case-insensitively, so `Hardware` and `hardware` count as one value; a JavaScript loop keeps both.

## Script Include bridge

Classic server code (background scripts, other scopes) reaches the same services through `new x_312987_portal.ReactPortal()`, and the quick utilities through `new QuickUtils()`. See [ReactPortal Script Include](script-include.md).

## Related

- [Server script](../authoring/server-script.md)
- [Server-script security](../security/server-scripts.md)
