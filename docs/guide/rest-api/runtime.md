---
title: Runtime REST API
description: The /rp endpoints the host uses — bootstrap, resolve, initialize, execute, assets, properties, messages and icons.
section: REST APIs
order: 2
tags: [rest, runtime, bootstrap, execute]
---

# Runtime REST API

Base path `/api/x_312987_portal/rp`. Any authenticated user may call it (REST ACL `x_312987_portal.rp_runtime`, `user_is_authenticated`); every handler checks portal and page access itself. Shapes are defined in `src/shared/contracts.ts` (see [Contracts](../reference/contracts.md)).

| Method | Path | Purpose |
|---|---|---|
| GET | `/portals/{slug}/bootstrap` | Portal, user, theme, default layout, portal-level placements, pages, menus |
| POST | `/pages/resolve` | One page: layout, options, placements |
| POST | `/instances/initialize` | Batch-run on-load server scripts (placements and embeds) |
| POST | `/instances/{instance}/execute` | Run one instance's server script |
| GET | `/assets/{build}/{file}/raw` | A compiled build asset |
| GET | `/properties` | Exposed system properties |
| POST | `/messages` | Translated UI messages |
| GET | `/icons/lucide` | The Lucide icon sprite |

## Bootstrap

`GET /portals/{slug}/bootstrap` → `BootstrapData`

```ts
{
    portal: { id, slug, name, homeRoute, settings, navigation }
    user: PortalUser                 // sysId, userName, name, firstName, lastName, email, title, avatar, roles, timeZone, language, isImpersonating, impersonatedBy
    release: { id, version } | null
    theme: ThemeRef | null           // tokens, tokensDark, css[], cssText
    layout: ComponentRef | null      // the portal's default layout
    layoutOptions: object            // layout defaults ← settings.layoutOptions
    regions: RegionMap               // portal-level placements
    pages: { id, route, title }[]    // pages this user can open
    menus: MenuMap                   // resolved for this user
}
```

`404 portal_not_found` when the portal doesn't exist, is inactive, or the user isn't in its audience.

## Resolve

`POST /pages/resolve` with `{ "portal": "sp", "page": "orders/42" }` (portal-relative, URL-decoded, `''` = home) → `ResolvePageData`

```ts
{
    page: { id, route, title, params, contentWidth }
    layout: ComponentRef | null      // the page's effective layout
    layoutOptions: object            // defaults ← portal layoutOptions (default layout only) ← page's own
    regions: RegionMap               // the page's placements
}
```

`404 page_not_found` when no route matches; `404 not_found` when the page isn't accessible.

## Initialize

`POST /instances/initialize`

```json
{
    "portal": "sp",
    "page": "incidents",
    "instances": ["<placement sys_id>", { "id": "<placement>~utc", "placement": "<placement sys_id>", "path": ["app/server-clock"], "keys": ["utc"], "options": { "title": "UTC" }, "token": null }],
    "context": { "params": { "table": "incident" }, "recordId": "" }
}
```

→ `{ instances: { [id]: InstanceResult } }`, where `InstanceResult = { ok, data?, options?, error?, build?, messages?, token? }`.

- Each instance succeeds or fails independently (`ok: false` with `error`).
- At most 100 entries per request, 50 of them embed descriptors.
- `page` gives route params to the scripts; `context` the URL params.
- Embed descriptors are authorized against the root placement's import chain; an unimported widget answers `not_found`. See [Embedded widgets](../authoring/embedded-widgets.md).

## Execute

`POST /instances/{instance}/execute`, where `{instance}` is a placement sys_id (for embeds, the **root** placement):

```json
{ "portal": "sp", "page": "incidents", "action": "get", "input": { "q": "abc" }, "context": { "params": {} }, "embed": { "path": ["app/server-clock"], "keys": ["utc"], "options": {}, "token": null } }
```

| Field | Meaning |
|---|---|
| `action` | `initialize`, `get` (default), `update` |
| `input` | The script's `input` |
| `data` | Accepted for compatibility but **ignored**: scripts start from empty `data` |
| `context` | `{ params, recordId }`, validated (strings, ≤ 50 keys, ≤ 16 KB) |
| `embed` | Run an embedded instance below the root placement |

→ envelope with `data` (the script's data), `options` (effective options) and `meta.build`, `meta.release`, `meta.messages`, `meta.embed`.

Errors: `400` (no server script, bad embed), `404` (instance not in this portal, page not accessible, embed not imported), `409 no_build`, `500 script_error`.

## Assets

`GET /assets/{build}/{file}/raw?v=<hash>` returns the raw asset (`text/javascript` or `text/css`), not an envelope.

- `Cache-Control: private, max-age=31536000, immutable`, an `ETag` of the content hash (`304` on `If-None-Match`), `X-Content-Type-Options: nosniff`.
- `?v=` is the first 16 characters of the content hash: a new compile means a new URL.
- **Studio users** may fetch any asset of a usable build, source maps included.
- **Consumers** may fetch JS and CSS of a build that's part of the release of a portal they can access, or (before a portal's first reprocess) of any active component or theme. Source maps are never served to consumers. Anything else is `404`.

## Properties

`GET /properties?portal=<slug>&names=a,b,c` → `{ values: { name: value | null } }`

Only names under `x_312987_portal.public.` or listed in the portal's `settings.exposedProperties` return values; the rest are `null`. The embed signing secret is refused by name whatever the settings say. At most 100 names.

## Messages

`POST /messages` with `{ "keys": ["Save", "Cancel"] }` → `{ messages: { key: translated } }` (`gs.getMessage` in the user's language, ≤ 300 keys).

## Icons

`GET /icons/lucide` → raw JSON (not an envelope) `{ version, icons: { name: innerSvgMarkup }, aliases: { alias: name } }`, about 420 KB, with `ETag: "lucide-<version>"` and `Cache-Control: private, max-age=86400`. Used by `components:icon` and the classic menu-item icon picker. It's its own module so no other route loads the sprite.

## Related

- [REST conventions](conventions.md)
- [Server calls](../runtime-api/server-calls.md)
- [Security: access model](../security/access-model.md)
