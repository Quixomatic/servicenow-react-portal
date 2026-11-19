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

## Script Include bridge

Classic server code (background scripts, other scopes) reaches the same services through `new x_312987_portal.ReactPortal()`. See [ReactPortal Script Include](script-include.md).

## Related

- [Server script](../authoring/server-script.md)
- [Server-script security](../security/server-scripts.md)
