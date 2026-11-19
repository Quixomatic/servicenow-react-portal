# React Portal Global Helpers

A small **global-scope** Fluent application. It ships one Script Include, `global.ReactPortalGlobal`, which the scoped React Portal app (`x_312987_portal`) calls for the session APIs that ServiceNow fences away from scoped code:

| Scoped code can't… | because… |
|---|---|
| `gs.flushMessages()` | `MethodNotAllowedException` in `x_312987_portal` |
| `gs.getImpersonatingUserName()` | blocked in scoped apps |
| `gs.getPreference()` | blocked in scoped apps |
| `GlideSession.clearClientData()` | missing from the scoped `GlideSession` |
| read the app picker | scoped `gs.getCurrentApplicationId()` isn't a reliable read of the session's current application |

## What it is on the instance

| Record | sys_id |
|---|---|
| `sys_app` "React Portal Global Helpers" (scope `global`, package_resolver_version 2.0.0) | `e4be8f1e4dc34cd2af5c421050ecce8b` |
| `sys_script_include` `ReactPortalGlobal` (api_name `global.ReactPortalGlobal`) | `fc3a4657354e4897bbb9bfd18ead59b2` |
| `sys_module` `/global/x-312987-react-portal-global/<ver>/package.json` and `bom.json` | `8f15a97bf35f439da3868ce7a37e2d2c`, `4391b78850184a1dae9db676d159a970` |

It's a *global application*: a `sys_app` whose scope is `global`. Its records get `sys_scope` = the app's sys_id, and they live in the global namespace (`global.ReactPortalGlobal`).

## Build and install

Use the **global** `now-sdk` binary (never `npx`). Run it from this folder:

```bash
cd packages/global-helpers
npm install          # once (Fluent type packages)
now-sdk build
now-sdk install      # installs/updates sys_app e4be8f1e… on the authenticated instance
```

This project is independent of the root app: it has its own `now.config.json`, `package.json` and `keys.ts`. Building or installing the root app doesn't touch it, and the reverse is also true.

### How the project was created (SDK notes)

- `now-sdk init --appName "React Portal Global Helpers" --packageName x-312987-react-portal-global --scopeName global --template base` creates a global app without prompting. The SDK special-cases `--scopeName global`: it skips the vendor-prefix check and generates a random 32-hex `scopeId`, which becomes the `sys_app` sys_id. The instance must be Australia or later (dev189813 runs Brazil).
- `now.config.json`: `"scope": "global"`, `"scopeId": "<sys_app id>"`. Global apps need `"packageResolverVersion": "2.0.0"`. The SDK defaults to it for `scope: global` and errors if you set `1.0.0`. It's set explicitly here.
- `now-sdk install` installs it like any app package. No update set is involved.
- Don't use `"scopeId": "global"` with `"type": "configuration"` (an undocumented SDK project type that uploads XML into the current global update set). That's a different route, not this one.

## Versioning

Lockstep with the root app. The version lives in **`packages/global-helpers/package.json`** (`"version"`). It flows into `sys_app.version` and the `sys_module` paths. Nothing in the code depends on it.

`package-lock.json` in this folder also carries the version in two places, the root `version` and `packages[""].version`. After bumping, run `npm install --package-lock-only` here. Or have `scripts/bump-version.mjs` update both fields.

`ReactPortalGlobal.VERSION` (returned by `version()`) is the **API** version, separate from the app version. Bump it only when the method surface changes, so callers can feature-detect.

## API: `new global.ReactPortalGlobal()`

Every method acts only on the **current** user's own session or preferences. Each one catches its own errors and returns a neutral value.

| Method | Returns | Notes |
|---|---|---|
| `version()` | `'1.0.0'` | API version for feature detection |
| `drainSessionMessages()` | `{ info: string[], error: string[], warning: string[] }` | Reads the session's queued messages, then `gs.flushMessages()`. Strings come back as queued (they may contain HTML). |
| `getImpersonatingUserName()` | `string \| null` | The impersonator's user name, or null |
| `getPreference(name)` | `string \| null` | Only `apps.current_app`, `updateSetForScope*` and `x_312987_portal.*`. Anything else returns null. |
| `clearClientData(key)` | `boolean` | Only keys starting `x_312987_portal.`. Anything else returns false. |
| `currentApplication()` | `{ id, scope, name } \| null` | The session's current application (app picker), read from global |

It's not client-callable, sandbox-callable or mobile-callable, and nothing in it evaluates script or acts on other users. See the header comment in `src/fluent/script-includes/ReactPortalGlobal.server.js` for the security rationale.

## Cross-scope access

- The SI is `accessibleFrom: 'public'` with **no** `callerAccess`. With `callerAccess: 'tracking'` (or `'restriction'`), every call from `x_312987_portal` was refused. `typeof global.ReactPortalGlobal` was `undefined`, and the session log said `Security restricted: When targeting a global resource, only ServiceNow authored scopes are allowed as sources`. OOB global SIs such as `ArrayUtil` also have an empty caller access.
- The calling app needs an **execute** `sys_scope_privilege` on the SI: source `x_312987_portal`, target_scope `global`, target_type `sys_script_include`, target_name `ReactPortalGlobal`, status `allowed`. React Portal's runtime access tracking is `permissive`, so the platform created one on the first call (`03bbad5f83205310e8fbc9a6feaad3e8`, in the React Portal package). Declare it in the root app's Fluent with `CrossScopePrivilege` so it's versioned and still works under `enforcing`.

## Calling it from a scoped module

Server modules don't get the `global` namespace object injected. Import it instead:

```ts
import { global } from '@servicenow/glide/global'
const helper = new global.ReactPortalGlobal()
```

This needs a type declaration for the class, either from `now-sdk dependencies` or a hand-written `.d.ts`. Plain script includes and classic server scripts can use `new global.ReactPortalGlobal()` directly. Always feature-detect (`typeof global.ReactPortalGlobal === 'function'`) and fall back, because the helper app is a separate install.
