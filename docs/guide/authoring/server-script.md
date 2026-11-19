---
title: Server script (server.js)
description: The Service Portal-style server script, its variables, actions, input and data, messages, errors and scope limits.
section: Authoring components
order: 3
tags: [server, script, sp, input, data]
---

# Server script (`server.js`)

A widget's server script is its `script` field (virtual file **`server.js`**). It's written like a Service Portal server script: an IIFE that fills `data`.

```js
(function () {
    /* populate the 'data' object */
    data.title = $sp.getValue('title')
    if (input && input.action === 'assign') {
        var gr = $sp.getRecord('incident', input.sys_id)
        if (gr && gr.canWrite()) {
            gr.setValue('assigned_to', gs.getUserID())
            gr.update()
            $sp.addSuccessMessage('Assigned to you')
        }
    }
    data.me = $sp.getUser().name
})()
```

An empty `server.js` opens in Studio as exactly that template.

## When it runs

The component's `server_mode` decides (see [Component kinds](../concepts/component-kinds.md#server-mode)):

| Client call | `action` | Response replaces `data`? |
|---|---|---|
| Page load (`on-load` only), batched per page | `initialize` | yes (initial data) |
| `server.get(input)` | `get` | no: the promise resolves with the new data |
| `server.update(input)` | `update` | yes |
| `server.refresh()` | `initialize` | yes |

The script always runs from the **build**, not the component record: a compile copies the server script into the build together with the client output, so the client and server versions always match.

## Variables

| Variable | Contents |
|---|---|
| `input` | The call's input: pinned ← staged ← the call's own input (see [`useServer`](../runtime-api/server-calls.md)); `{}` on page load |
| `data` | **Empty on every action.** Fill it; it's returned to the client |
| `options` | The instance's effective options: component defaults overlaid by the placement's (or the embed's) options |
| `component` | `{ id, uniqueId, instanceId, region, build, embedded, parentInstanceId, key, path }` |
| `context` | `{ portal, portalId, page, params, action, release, user: { id, name }, client: { params, recordId }, query, embed }` |
| `$sp`, `$rp` | The [server API](../server-api/sp-api.md) (the same object under both names) |
| `gs`, `GlideRecord`… | The normal scoped server APIs |

- `context.page` is the matched page route (`orders/:id`) and `context.params` its route params.
- `context.client.params` (also `context.query`) holds the portal URL's params: `table`, `sys_id`, `view`, `query` and the keys inside `q`. They're validated (strings only, ≤ 50 keys, ≤ 4000 characters a value, ≤ 16 KB in all) but **untrusted**, like `input`.
- `context.embed` is `{ root, path, keys }` for an [embedded instance](embedded-widgets.md), else `null`.

> **Warning:** The widget's `data` is **never sent back** to the server, and the server ignores client data: every action starts from an empty `data`. Send what the script needs in `input`. (This differs from Service Portal, where `c.server.update()` posts `c.data`.)

`data` must be **mutated**: the script's return value is ignored. After the script runs, `data` is normalized to plain JSON (Java strings and native objects become strings), so store `gr.getValue(...)`, not GlideElements.

## Messages become toasts

Anything the script queues reaches the user as a toast coloured by type:

- `$sp.addInfoMessage(msg)`, `addErrorMessage`, `addWarningMessage`, `addSuccessMessage`;
- `gs.addInfoMessage(msg)` / `gs.addErrorMessage(msg)` (and warnings), read back from the session after the script runs.

With the [global helper app](../internals/global-helper-app.md) installed, the session queue is **drained and flushed** after every call, as in Service Portal: anything queued (including by a business rule the script triggered) toasts once, repeated identical messages always show, and nothing resurfaces as a banner on the next classic page. Without it, only the messages the script added are returned, the queue can't be flushed, and the session ignores a `gs` message identical to one still queued.

Messages travel in `meta.messages` (execute), `instances[id].messages` (initialize) or `error.details.messages` (failures).

## Errors

The executor runs the script through `GlideScopedEvaluator`, which **swallows** script errors (the script just stops). So the compiled server script wraps your code in `try { … } catch` and the executor reports the error:

- The call fails with `500 script_error`: `Server script error (line 4): …`. The line is your script's line.
- `error.details` carries `{ component, instance, line, messages }`.
- The error is always written to the execution log, with a correlation id.
- **Action errors** (`server.get/update/refresh`) toast automatically. **On-load errors** show a banner above the widget. Developers, designers and admins see the message, line and reference id; other users see "Something went wrong" plus the reference.

Opt out of the automatic toast per widget (`useServer({ toastErrors: false })`) or per call (`server.get(input, { toast: false })`). The promise still rejects.

## Scope and runtime limits

Scripts run in the `x_312987_portal` scope, with that scope's rights.

- `gs.print` and `gs.getImpersonatingUserName()` are blocked in scoped code. Use `$sp.getUser().impersonatedBy` for the impersonator.
- `globalThis` is sealed.
- Promise callbacks settle when the **outermost** script finishes, not inside your script.
- Use `GlideRecordSecure` (or `$sp.getRecord`, `$sp.canReadRecord`) to apply the user's ACLs. A plain `GlideRecord` reads with the scope's rights.

## Logging

`$sp.log(value)` writes `[React Portal <uniqueId>] …` to the system log. Executions are logged to `x_312987_portal_execution_log`: errors and denials always, successes only when `x_312987_portal.log_executions` is `true`. The log stores correlation id, action, outcome, duration, portal, release, build, placement, component and instance id, plus a sanitized error. It never stores input, data or source. Rows older than `x_312987_portal.execution_log.retention_days` (14) are trimmed nightly.

## Related

- [`$sp` reference](../server-api/sp-api.md)
- [Server calls (`useServer`)](../runtime-api/server-calls.md)
- [Server-script security](../security/server-scripts.md)
