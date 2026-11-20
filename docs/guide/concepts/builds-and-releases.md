---
title: Builds, releases and manifests
description: One build per component or theme, one release per portal, the manifest it holds, and automatic reprocessing.
section: Concepts
order: 8
tags: [build, release, manifest, reprocess]
---

# Builds, releases and manifests

React Portal compiles on the instance and serves compiled output only. Two kinds of generated record carry it: **builds** (per component or theme) and **releases** (per portal).

## Builds

There's exactly **one build record per component or theme** (`x_312987_portal_build`, unique `owner_key` = `component:<id>` or `theme:<id>`). Each successful compile overwrites it. It holds:

- the compiled **assets** (`build_asset` rows): `index.js` and `index.css` for a component, `theme.css` for a theme;
- the **server script**, copied from the component at compile time, so client and server always match;
- the **dependency edges** (`build_dep`): host modules, relative files, and record imports pointing at other builds;
- snapshots: options schema and defaults (`options_snapshot`, used for [embed option filtering](../authoring/embedded-widgets.md#options-and-trust)), exports, source file hashes;
- diagnostics of the last compile, and the last error.

### Build state

| Field | Meaning |
|---|---|
| `state` | `pending` (never compiled), `ready` (has compiled output), `failed` (never compiled successfully) |
| `built_revision` | Source revision of the output being served (0 = never compiled) |
| `pending_revision` | Revision awaiting a compile (0 = none) |
| `needs_rebuild` | An imported component changed since this was compiled |
| `input_hash` | Hash of every compile input: sources, options, the runtime ABI, the server-script format and the **compiler version** |

A build is usable once `state = ready` and `built_revision > 0`.

> **Note:** A failed recompile keeps serving the **last good output**. Only a build that never compiled becomes `failed`. Diagnostics (file, line, column) land on the build and in Studio's Problems panel.

### When compiles run

- **On save:** business rules compile a component (`RP: Compile component on save`), a theme, or the owner of an extra file that changed. They run at order 500, after the normalize rules advanced `source_revision`.
- **Studio save** compiles synchronously, once per save, and returns the result. The compile rules stand down during a Studio save (session flag `x_312987_portal.skip_compile`), so a multi-file save compiles once.
- **Skipped** when the inputs hash to the same value as the current output.
- **Forced:** `new x_312987_portal.ReactPortal().compile('component', id, true)` (it returns a Promise).

A compiler upgrade changes the compiler version, so every component build becomes out of date and recompiles on its next compile.

## Releases

There's exactly **one release record per portal** (`x_312987_portal_release`, unique `portal`). It holds the portal's compiled **manifest**:

| Manifest key | Contents |
|---|---|
| `manifestVersion` | Currently **4** |
| `portal` | id, slug, name, `homeRoute`, `settings`, `navigation` |
| `theme` | ThemeRef: id, key, name, `tokens`, `tokensDark`, stylesheet URLs |
| `defaultLayoutId`, `layouts` | Every layout used, as ComponentRefs (regions, default options, build, imports) |
| `regions` | Portal-level placements by region (blocks carry their drop zones and children) |
| `pages` | Every active page: route, title, order, layout, access, content width, layout options, placements by region |
| `menus` | Active menus by key, **unfiltered** (resolved per user at request time) |

Each placement carries its component (with build URLs and transitive imports), effective options, style tokens, grid layout, classes and compiled instance CSS. See `ComponentRef` / `PlacementRef` in [contracts](../reference/contracts.md).

The release also keeps:

- `revision`: increments every time the manifest changes;
- `manifest_hash`: the manifest is only written when this changes, so update sets record real changes only;
- `problems_json`: e.g. `Component "app/x" has not been compiled`, `Portal has no default layout`;
- `release_entry` rows: one per theme, layout and placement, with its build. These authorize **asset downloads** (a consumer may fetch a build that's part of a release of a portal they can access).

There is **no release history**. Reverting an input (version history, update set back-out) reprocesses the release.

> **Note:** The `publisher` role exists ("publish and roll back releases"), but there's no separate publish step today: releases reprocess automatically. A publisher can force a reprocess (`POST /rp_studio/portals/{id}/process`).

## Reprocessing

A portal's release reprocesses when any of its inputs change:

| Trigger (business rule) | Table / event |
|---|---|
| `RP: Reprocess release (portal)` | portal insert / update |
| `RP: Reprocess release (page)` | page insert / update / delete |
| `RP: Reprocess release (placement)` | placement insert / update / delete |
| `RP: Reprocess release (theme)` | theme update / delete |
| `RP: Reprocess release (component)` | component update / delete when name, kind, active, server mode, regions, default options or placeable change |
| `RP: Reprocess release (menu)`, `(menu item)` | menu / item insert / update / delete |
| A successful compile | every portal using the component directly, as a layout, or through imports (transitively) |

The page designer and the menus editor set the session flag `x_312987_portal.skip_reprocess` while a multi-record write runs, then reprocess the portal once at the end. The demo seed sets both `skip_compile` and `skip_reprocess` for its whole run, compiles each changed component once in dependency order, and reprocesses each active portal once at the end. Compile-triggered reprocessing respects the flag too; placement instance CSS still compiles inside a batch.

A reprocess assembles the manifest inside `withRegistryCache` (`registry/registry.ts`): component, build and import-edge lookups are memoized for that one assembly and dropped when it ends. Widgets share primitives, so their import trees would otherwise query the same records many times. The cache holds only registry records, nothing user-specific, and the manifest is the same with or without it.

## What the runtime serves

`bootstrap`, `resolve` and the executor all read the portal's release. If the portal has no release yet, or its manifest has an older `manifestVersion`, the runtime **assembles the manifest live** from the current records. That's correct, just slower. After a manifest version bump, run once:

```js
new x_312987_portal.ReactPortal().reprocessAll()
```

Consumers never write records: live assembly happens in memory.

## Related

- [Compiler pipeline](../internals/compiler.md)
- [Data model](../internals/data-model.md)
- [Business rules](../internals/business-rules.md)
