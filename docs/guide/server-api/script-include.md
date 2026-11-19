---
title: ReactPortal Script Include
description: The x_312987_portal.ReactPortal bridge from classic server scripts to React Portal's server modules.
section: Server API
order: 2
tags: [script-include, server, background-script]
---

# ReactPortal Script Include

`x_312987_portal.ReactPortal` is a thin bridge from classic server code (background scripts, `now-sdk exec` scripts, other scopes) to React Portal's server modules. All logic lives in the modules under `src/server`; the class only delegates.

```js
var rp = new x_312987_portal.ReactPortal()
gs.info(JSON.stringify(rp.bootstrap('sp').portal))
```

| Method | Returns |
|---|---|
| `bootstrap(slug)` | The bootstrap payload for a portal slug, access-checked for the current user |
| `resolvePage(slug, path?)` | The page manifest for a portal-relative path |
| `assembleManifest(portalId)` | The live-assembled manifest for a portal sys_id (what a reprocess would store), or `null` |
| `execute(slug, instanceId, action?, input?, data?)` | Runs a placement's server script (`action`: `initialize`, `get` (default), `update`). Returns `{ data, options, buildId, release, durationMs, messages }` |
| `process(portalId)` | Force-reprocess one portal's release; returns its summary |
| `reprocessAll()` | Reprocess every portal (run once after a manifest version bump). Returns the count |
| `compile(type, id, force?)` | Compile a component or theme now (`type`: `component` \| `theme`). Returns a **Promise** of the build summary |
| `runMaintenance()` | The nightly maintenance (abandoned compiles, execution-log trim). Returns `{ abandonedCompiles, trimmedLogs }` |

## Promises settle at the end of the script

Compiles are asynchronous (Tailwind's `compile()` is). In scoped scripts, Promise callbacks run when the **outermost** script finishes, so log inside `then()`:

```js
new x_312987_portal.ReactPortal().compile('component', '<sys_id>').then(function (b) {
    gs.info(JSON.stringify(b))
})
```

## Module paths

The class `require()`s modules from a path that includes the application version:

```js
ReactPortal.MODULE_ROOT = 'x_312987_portal/x-312987-react-portal/<version>/src/server/'
```

The Fluent SDK installs every server module under the `package.json` version, so this path must change with every version bump. `npm run version:bump` rewrites it (and the seed template's copy). See [Release workflow](../internals/release-workflow.md).

## Access

The Script Include is `accessibleFrom: 'public'` with caller tracking. The methods run with the caller's session: `bootstrap`, `resolvePage` and `execute` apply the same portal and page access checks as the REST API.

## Related

- [`$sp` / `$rp`](sp-api.md)
- [Builds, releases and manifests](../concepts/builds-and-releases.md)
