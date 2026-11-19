---
title: Global helper app
description: ReactPortalGlobal, the global-scope Script Include that proxies session APIs scoped code can't call, and how it's installed and called.
section: Platform internals
order: 5
tags: [internals, global, script-include, cross-scope]
---

# Global helper app

`packages/global-helpers/` is a separate, small Fluent application with **`scope: "global"`** ("React Portal Global Helpers"). It ships one Script Include, **`global.ReactPortalGlobal`**, which the scoped app calls for the session APIs ServiceNow fences away from scoped code. Proxying through a global Script Include is the standard practice for this.

| Scoped code can't… | because… |
|---|---|
| `gs.flushMessages()` | `MethodNotAllowedException` in `x_312987_portal` |
| `gs.getImpersonatingUserName()` | Blocked in scoped apps |
| `gs.getPreference()` | Blocked in scoped apps |
| `GlideSession.clearClientData()` | Missing from the scoped `GlideSession` |
| Read the application picker | Scoped `gs.getCurrentApplicationId()` reports the script's own scope |

## API

Every method acts only on the **current** user's own session or preferences, catches its own errors and returns a neutral value. Nothing evaluates script or acts on other users; it isn't client-, sandbox- or mobile-callable.

| Method | Returns | Notes |
|---|---|---|
| `version()` | `'1.0.0'` | API version for feature detection (separate from the app version) |
| `drainSessionMessages()` | `{ info, error, warning }` (string arrays) | Reads the queued messages, then `gs.flushMessages()` |
| `getImpersonatingUserName()` | `string \| null` | |
| `getPreference(name)` | `string \| null` | Only `apps.current_app`, `updateSetForScope*` and `x_312987_portal.*` |
| `clearClientData(key)` | `boolean` | Only keys starting `x_312987_portal.` |
| `currentApplication()` | `{ id, scope, name } \| null` | The session's current application |

## How the main app uses it

`src/server/lib/global-helpers.ts` imports `global` from `@servicenow/glide/global` (types in `@types/glide-global.modules.d.ts`) and feature-detects every call: when the helper app isn't installed, each wrapper returns `null` / `false` and callers keep a scoped fallback.

| Feature | With the helper | Without |
|---|---|---|
| Server messages | Drain and flush after every call (Service Portal behaviour) | Only messages added by the script; the queue isn't flushed |
| `impersonatedBy` | The impersonator's user name | `null` (falls back to `session.isImpersonating()`) |
| Session flags | Removed | Blanked with `putClientData(key, '')` |

> **Note:** Inside a scripted REST transaction, global `gs.getInfoMessages()` reads empty while the scoped read sees the queue. So the drain reads the queue from the scoped side first, then calls the helper to flush, appending anything only the helper saw.

## Cross-scope access

- The Script Include is `accessibleFrom: 'public'` with **no** `callerAccess`. With `callerAccess: 'tracking'` (or `'restriction'`) every call from `x_312987_portal` was refused ("When targeting a global resource, only ServiceNow authored scopes are allowed as sources") and `global.ReactPortalGlobal` resolved to `undefined`.
- The caller needs an **execute** cross-scope privilege on the Script Include. The platform created one on first call under permissive runtime tracking; the main app adopts it in Fluent (`src/fluent/security/cross-scope.now.ts`, `CrossScopePrivilege`), so it's versioned and still works under enforcing tracking.

## Build and install

```bash
cd packages/global-helpers
npm install          # once
now-sdk build
now-sdk install
```

It's independent of the root app (own `now.config.json` with `"scope": "global"`, `"packageResolverVersion": "2.0.0"`, own `package.json` and `keys.ts`). Its version moves in lockstep with the root app (`npm run version:bump` updates its `package.json`; then run `npm install --package-lock-only` there). Every release builds and installs it.

## Gotchas

- `now-sdk exec` runs a snapshot session (messages go to the log), so session-message behaviour can only be tested in the browser.
- Deleting global records needs `now-sdk exec --scope global --record-for-rollback`; a scoped `deleteRecord` silently returns false.

## Related

- [Server script: messages](../authoring/server-script.md#messages-become-toasts)
- [Instance gotchas](instance-gotchas.md)
