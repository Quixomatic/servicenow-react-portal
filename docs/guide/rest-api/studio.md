---
title: Studio REST API
description: The /rp_studio endpoints behind Portal Studio — catalogs, projects, saves and checks, builds, the page designer, menus, context and icons.
section: REST APIs
order: 3
tags: [rest, studio, design, menus]
---

# Studio REST API

Base path `/api/x_312987_portal/rp_studio`. The REST ACL `x_312987_portal.rp_studio` admits the developer, designer and publisher roles (admin inherits them). Each handler re-checks the specific **capability**:

| Capability | Granted to |
|---|---|
| `author` | developer (and admin) |
| `design` | designer or developer (and admin) |
| `publish` | publisher (and admin) |
| `any` | any studio role |

**Scope guard:** every write first checks the user's current application. If the platform's application picker is on another app, the write is rejected with `409 wrong_scope` (new records would land in the wrong scope and update set). Reads are always allowed. An unknown picker state is allowed.

Conventions (envelope, errors) are in [REST conventions](conventions.md).

## Catalogs and context

| Method | Path | Cap. | Returns |
|---|---|---|---|
| GET | `/components` | any | `[{ id, uniqueId, name, kind, placeable, active, serverMode, revision, build }]` (metadata, never source) |
| GET | `/themes` | any | `[{ id, key, name, active, revision, build }]` |
| GET | `/portals` | any | `[{ id, slug, name, active, isDefault, theme, defaultLayout, release }]` |
| GET | `/context` | any | `{ app, currentApp, inScope, updateSet }`: React Portal's app, the picker's current app, whether they match, and the current update set |
| GET | `/design/{id}` | any | What a record id is: `{ kind: 'portal' \| 'page' \| 'component' \| 'theme' \| 'menu' \| 'menuItem' \| 'unknown', portalId, pageId, menuId?, itemId? }` |
| GET | `/icons?q=&limit=200` | any | `{ version, names, total }`: Lucide names ranked exact, prefix, then alphabetical |

## Components and themes

| Method | Path | Cap. | Purpose |
|---|---|---|---|
| GET | `/components/{id}/project` | author | `ProjectData`: owner, meta, revision, files (virtual first, then extra files), latest build |
| POST | `/components/{id}/save` | author | Revision-checked save; compiles and returns the result |
| POST | `/components/{id}/check` | author | Dry-run compile of unsaved buffers; nothing written |
| POST | `/components` | author | Create a component with a starter, compiled on create (`201`) |
| GET | `/themes/{id}/project` | design | Theme project (`theme.css`, `tokens.json`) |
| POST | `/themes/{id}/save` | design | Revision-checked theme save |

### Save

```json
{
    "expectedRevision": 3,
    "files": [
        { "path": "main.tsx", "content": "…" },
        { "path": "parts/Row.tsx", "content": "…", "target": "client" },
        { "path": "old.ts", "deleted": true }
    ],
    "meta": { "serverMode": "on-load", "description": "…" }
}
```

- `expectedRevision` must equal the owner's `source_revision`, else `409 conflict` with `{ expectedRevision, currentRevision }` (Studio shows a reload/overwrite banner).
- Virtual files write record fields; other paths write `source_file` rows (`deleted: true` removes one). Virtual files can't be deleted (save them empty). JSON files are validated; saving an unchanged placeholder (`{}` / `[]`) is a no-op.
- Everything is validated before anything is written; at most 200 files.
- The compile-on-save rules stand down during the save, so it compiles once at the end.

→ `SaveData`: `{ revision, build: BuildSummary, files, registry: { runtimeAbiVersion } }`. Compile errors are in `build.diagnostics`, not an HTTP error.

`meta` (component) accepts `name`, `namespace`, `key`, `kind`, `description`, `placeable`, `active`, `tailwind`, `clientScript`, `css`, `script`, `serverMode`, `exports`, `optionsSchema`, `defaultOptions`, `regions`, `dependencySpec`. Theme `meta`: `name`, `key`, `description`, `active`, `tokens`, `stylesheet`.

### Check

`{ "files": [{ "path": "main.tsx", "content": "…" }] }` → `CheckData`: `{ ok, diagnostics: { errors, warnings }, ms }`. Buffers are merged over the saved project; JSON files are syntax-checked; `server.js` is ignored. Drives Studio's live Problems panel.

### Create

`{ "name": "Account Summary", "kind": "widget", "namespace"?: "app", "key"?: "…" }` → the new component's `ProjectData`. Kinds: widget (default), layout, block, primitive, utility. Layouts start with `header` / `main` / `footer` regions, blocks with one `content` zone.

## Builds and portals

| Method | Path | Cap. | Purpose |
|---|---|---|---|
| POST | `/builds/{id}/preview` | any | Preview context: `{ build, owner, component, theme, options }` as the runtime sees this build |
| POST | `/builds/{id}/complete` | author (theme: design) | Accept compiled output from a browser compiler: `{ revision, success, compilerVersion?, runtimeAbiVersion?, assets?, dependencies?, diagnostics? }`. A stale `revision` is `409` |
| POST | `/portals/{id}/process` | publish | Force-reprocess the portal's release → `ReleaseSummary` |

> **Note:** `/builds/{id}/complete` exists for a browser-side compiler. Compiles run on the server today; Studio doesn't call it.

## Page designer

| Method | Path | Cap. | Body / purpose |
|---|---|---|---|
| GET | `/portals/{id}/design` | design | Portal, pages, palette, layouts (regions, options schema, defaults), themes, portal-wide placements |
| GET | `/pages/{id}/design` | design | Page, effective layout, placements by region (blocks with children) |
| POST | `/placements` | design | `{ portal, page?, parent?, region, component, index?, options?, styleTokens?, layout?, classes? }` (`201`) |
| PATCH | `/placements/{id}` | design | `{ region?, index?, page?, parent?, options?, active?, styleTokens?, layout?, classes? }`: move, reorder, re-scope (page ↔ portal-wide), set options or styling |
| DELETE | `/placements/{id}?mode=lift\|cascade` | design | `mode` is required when the block has children (`409 has_children` otherwise) |
| POST | `/pages` | design | `{ portal, name, title?, route, layoutOverride?, contentWidth?, layoutOptions?, order?, active?, access? }` (`201`) |
| PATCH | `/pages/{id}` | design | Same fields |
| DELETE | `/pages/{id}` | design | Its placements cascade |
| PATCH | `/portals/{id}` | design | `{ name?, theme?, defaultLayout?, homePage?, navigation?, settings?, active? }` |

Placement DTOs carry `{ id, region, order, active, scope, pageId, parentId, component, options, effectiveOptions, styleTokens, layout, classes, regions?, children? }`. Target regions are validated against the layout (or the parent block's drop zones) before any write; siblings are renumbered on move. Writes that change styling recompile the placement's instance CSS before returning. Every write runs with reprocessing suspended and reprocesses the portal once at the end.

## Menus

| Method | Path | Cap. | Body / purpose |
|---|---|---|---|
| GET | `/portals/{id}/menus` | design | `MenuDto[]`: every menu with its full, unfiltered item tree (scripts included) |
| POST | `/menus` | design | `{ portal, key, name?, description?, active? }` (`201`) |
| PATCH | `/menus/{id}` | design | `{ key?, name?, description?, active? }` |
| DELETE | `/menus/{id}` | design | Items cascade |
| POST | `/menu-items` | design | `{ menu, parent?, index?, type, label?, active?, page?, params?, route?, url?, icon?, target?, match?, tooltip?, collapsed?, roles?, condition?, badge?, badgeScript?, script? }` (`201`) |
| PATCH | `/menu-items/{id}` | design | The same fields, plus `{ parent, index }` to move (siblings renumbered) and `menu` to move between menus of the same portal |
| DELETE | `/menu-items/{id}?mode=lift\|cascade` | design | Groups with children need a mode |

Business rules validate every write; their rejection message comes back as `400 invalid` (and is drained, so it doesn't leak as a banner on a classic page).

## In progress

> **Note:** **In progress:** `GET /components/{id}/dependencies` (direct record imports and importers, for a Studio Dependencies panel), "View as user" for user criteria, and per-kind baseline files (`kindFiles` in `ProjectData`, driven by the property `x_312987_portal.studio.kind_files`).

## Related

- [Studio overview](../studio/overview.md)
- [REST conventions](conventions.md)
- [Contracts](../reference/contracts.md)
