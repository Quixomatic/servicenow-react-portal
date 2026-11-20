---
title: Instance gotchas
description: Platform behaviours that shaped React Portal's design, and what to do about each.
section: Platform internals
order: 7
tags: [internals, gotchas, servicenow, troubleshooting]
---

# Instance gotchas

ServiceNow behaviours that shaped React Portal. Each one has bitten at least once.

## Scripted REST

| Gotcha | Consequence / fix |
|---|---|
| Session-cookie requests without `X-UserToken` (`window.g_ck`) get `401` | Always send the token. Assets are **fetched** with it and imported from Blob URLs, because `import()` and `<link>` can't send headers |
| `/api/...` URLs whose last segment has a file extension (`.js`, `.css`, `.txt`, `.jsx`) get the platform's HTML 404 before scripted REST runs | Assets are served at `/assets/{build}/{file}/raw`; the icon sprite at `/icons/lucide` |
| A tab loaded before a re-login keeps a stale `g_ck` | `401` until the tab reloads |
| A handler may return a Promise | It settles before the request's script ends; `http.ts` writes the body then |

## Scoped scripts

| Gotcha | Consequence / fix |
|---|---|
| `GlideScopedEvaluator` swallows script errors (the script just stops) | The compiled server script wraps the author code in `try/catch` into `__rpError`; the executor reports `script_error` with the line minus 1 |
| Variables passed through `evaluateScript`'s third argument arrive as `null` | Use `putVariable` / `getVariable` |
| The evaluator only runs scripts of a stored record | Menu conditions load the item record and evaluate the manifest's condition text on it in memory |
| `globalThis` is sealed | Bundles must expose exports as locals |
| Promise callbacks run when the **outermost** script finishes | Compiles triggered inside an exec or seed script finish at its end; log inside `then()` |
| Every record write fires its business rules: a seed of many records compiled and reprocessed once per write | Batch mode: the seed sets `x_312987_portal.skip_compile` and `skip_reprocess`, compiles once per component and reprocesses each portal once. See [Business rules](business-rules.md#batch-mode-session-flags) |
| `GlideSession.clearClientData` doesn't exist in scope | `putClientData(key, '')`, or the global helper |
| `gs.getImpersonatingUserName()`, `gs.print`, `gs.flushMessages()`, `gs.getPreference()` are blocked | The [global helper app](global-helper-app.md) proxies what's needed |
| Inside scripted REST, global `gs.getInfoMessages()` reads empty; the scoped read sees the queue | Drain = scoped read, then the helper's flush |
| `GlideCertificateEncryption` (HMAC) is blocked in scope | Embed tokens use HMAC-style nested SHA-256 with `GlideDigest` |
| Scoped `gs.getCurrentApplicationId()` reports the script's scope | Studio reads the picker from the `apps.current_app` user preference |

## Fluent SDK

| Gotcha | Consequence / fix |
|---|---|
| Server modules need explicit `.ts` import extensions | Extensionless imports build but fail at runtime |
| The app version is part of every module path | Build and install after every bump; `ReactPortal.MODULE_ROOT` and the seed template are rewritten by the bump script |
| `.now.ts` files reject loops, shorthand properties and shared variables | Every ACL is written out |
| `Table({ readRoles })` doesn't create ACLs | Explicit `Acl()` records |
| Deleting Fluent records propagates through `keys.ts` | Ask before deleting; strip never-installed deletions from `keys.ts` |
| A global Script Include with `callerAccess: 'tracking'` refuses scoped callers | Leave caller access unset; adopt the cross-scope privilege in Fluent |
| Global apps need `packageResolverVersion: "2.0.0"` | Set explicitly in the helper app's `now.config.json` |
| The project-local SDK couldn't decrypt the stored credentials | Use the global `now-sdk` binary |
| `now-sdk exec` payloads over about 1.5 MB fail | `npm run seed` splits component payloads into parts (default budget 1300 KB, `--max-kb`) |
| An exec that times out or returns no script execution response may still be running | The seed polls the syslog for each run's `[seed] done … run=<id>` line and never re-runs, so runs don't stack |

## UI Builder and Next Experience

| Gotcha | Consequence / fix |
|---|---|
| Each combination of **required** page params is a new screen (new host instance; the shell keeps old ones hidden) | Only `portalSlug` is required; everything else is optional |
| Link to destination with `pageId` under required params throws `Cannot read properties of undefined (reading '0')` | Put it under optional params |
| URLs use one `/params/` segment then dash-cased pairs (`page-id`, `sys-id`); repeated `params` segments are ignored | The host builds and parses that format |
| A param named `sys_id` never delivers its binding | The host reads the URL itself |
| Absent optional params aren't delivered (Back keeps old values) | The host treats URL-absent optional params as `''` |
| A host property named `id` collides with the element's HTML id | The record id is `recordId` |
| The CLI names chunk assets after the module path; on Windows a nested path gave an unresolvable `/uxasset` URL | `portal-studio.js` sits at the source root |
| A deploy can be served stale | Check `globalThis.__REACT_PORTAL__`, redeploy |

## CSS in shadow DOM

| Gotcha | Consequence / fix |
|---|---|
| Same-named cascade layers merge across `<style>` sheets; a later sheet's `.hidden` beat an earlier `sm:block` | Variants move to `@layer rp-variants` (compiler v5) |
| Adopted stylesheets sort after every `<style>` | The framework CSS is a `<style>` in the framework slot |
| Unlayered CSS beats every layered utility | `styles.css` and the instance rules (style tokens, grid, `x-css-var`) are unlayered on purpose; a placement's extra Tailwind classes are layered like any other utilities |
| next-themes and Sonner target `<html>` / `<head>` | `useTheme` puts `.dark` on the host; Sonner's CSS ships in the framework CSS |

## Related

- [Host architecture](host-architecture.md)
- [Troubleshooting](../reference/troubleshooting.md)
