---
title: Server scripts
description: How component server scripts are executed and contained — pinned builds, the scoped evaluator, untrusted input, budgets and logging.
section: Security
order: 2
tags: [security, executor, server-script]
---

# Server scripts

Component server scripts run on the instance for any user who can open the portal, so the executor decides what may run, runs it in a contained way, and treats everything the client sends as untrusted. This page covers those rules; for writing scripts see [Server script](../authoring/server-script.md).

## What runs

The executor (`src/server/runtime/component-executor.ts`) only runs a script that is:

1. part of the portal's **release manifest** (a placement of this portal, the effective layout of the request's page through a `layout:<sys_id>` root, or an embed authorized along the import chain);
2. on a page the user can access, by roles and [user criteria](../concepts/user-criteria.md) (portal-level placements are on every page);
3. from a **usable build**: the server script copied into the build at compile time, never the live `script` field. Client and server versions always match, and an edit takes effect only after a successful compile.

A placement not in the manifest, on an inaccessible page, or an unimported embed answers `404`.

## How it runs

- Through `GlideScopedEvaluator` in the **`x_312987_portal` scope**, with that scope's rights (`putVariable` for `input`, `data`, `options`, `component`, `context`, `$sp`, `$rp`; `getVariable('data')` afterwards).
- The compiled script wraps the author's code in `try/catch` into `__rpError`, because the evaluator swallows errors. Failures surface as `500 script_error`: with the message and line for authors (admin, React Portal admin, developer, designer), and as a generic "The server script failed" plus the correlation id for everyone else. Messages the script added (`gs.addErrorMessage` & co.) still reach every user.
- `data` starts **empty on every action** and the client's data is ignored, so a client can't smuggle state into a script through `data`.
- After the script, `data` is round-tripped through JSON: only plain data leaves the server.

## Untrusted inputs

Treat everything from the client as untrusted:

| Input | Validation |
|---|---|
| `input` | Plain object (else `{}`); no further checks: validate in your script |
| `context.client` / URL params | Strings only, ≤ 50 keys (`[A-Za-z0-9_.:-]{1,64}`), ≤ 4000 characters a value, ≤ 20 values a list, ≤ 16 KB in all |
| Embed options | Filtered against the child's schema unless signed (see [Embeds](embeds.md)) |

> **Warning:** Scripts run with the **scope's** rights, not the user's. Use `GlideRecordSecure`, `$sp.getRecord` or `$sp.canReadRecord` for any record a user shouldn't see, and check `$sp.hasRole` before privileged actions. `input.sys_id` is whatever the client sent.

## Secrets

- `$sp.getProperty('x_312987_portal.embed_secret')` always returns the fallback; the runtime properties endpoint refuses it by name.
- Don't put secrets in `data` or options: both reach the browser.

## Budgets and limits

| Limit | Value |
|---|---|
| Instances per initialize | 100 |
| Embed descriptors per initialize | 50 |
| Embed depth below a placement or layout root | 4 |
| `$sp.getWidget` calls per run | 20 |
| Embed options | 16 KB JSON |

There's no CPU or time limit beyond the platform's transaction limits.

## Logging

Every error and denial is written to `x_312987_portal_execution_log` with a correlation id, never input, data or source; successes too when `x_312987_portal.log_executions` is on. Errors are sanitized (no script locations, ≤ 500 characters).

## Menu conditions

Menu-item conditions run through the same evaluator, per user, with a portal-scoped `$sp` (no `getWidget`). Errors hide the item and are logged. They're syntax-checked when saved.

## Related

- [Server script](../authoring/server-script.md)
- [Access model](access-model.md)
