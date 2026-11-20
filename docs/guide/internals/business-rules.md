---
title: Business rules and automation
description: Every business rule, the scheduled maintenance job, system properties and session flags that keep records valid, compiled and released.
section: Platform internals
order: 2
tags: [internals, business-rules, properties, automation]
---

# Business rules and automation

Rules are declared in `src/fluent/automation/*.now.ts`; their logic lives in `src/server/automation/*.ts`. Order bands: **100** validate/normalize (before), **500** compile (after), **900** instance CSS (after), **1000** reprocess (after).

## Validation and normalization (before, order 100–110)

| Rule | Table | Does |
|---|---|---|
| RP: Normalize portal | portal | Slug format, JSON fields, default layout is a layout, home page belongs to the portal |
| RP: Normalize theme | theme | Key, tokens shape; advances `source_revision` when tokens or stylesheet change |
| RP: Normalize component definition | component | Namespace/key → `unique_id`, kind, `placeable` false for non-widgets, server mode, JSON fields, layout regions normalized, block region spec parsed; advances `source_revision` on build-relevant changes |
| RP: Validate page | page | Route pattern format and uniqueness per portal, layout override kind, access and layout-options JSON; title defaults to name |
| RP: Validate placement | placement | One owner, region on the effective layout or parent's drop zones, widget or block, parent in the same owner, no cycles, depth ≤ 6, classes sanitized |
| RP: Validate source file | source_file | Exactly one owner, safe relative path (reserved names refused), unique per owner, size limit, hash and per-file revision |
| RP: Validate menu | menu | Portal, key slug unique per portal, name; page-item menus can't change portal |
| RP: Validate menu item | menu_item | Parent is a group of the same menu (no cycles, bounded depth), per-type fields, page of the same portal, route/URL format, Lucide icon name |
| RP: Syntax-check menu item scripts | menu_item | Parses `condition`, `badge_script`, `script` with Sucrase when they change (order 110) |
| RP: Normalize build / release; build asset, build dependency, release entry scope | generated tables | One record per owner / portal; generated records inherit their owner's application scope |

Build-relevant component fields (advance `source_revision`): `client_script`, `css`, `tailwind`, `script`, `exports_json`, `options_schema_json`, `default_options_json`, `dependency_spec_json`.

## After rules

| Rule | Table | Order | Does |
|---|---|---|---|
| RP: Single default portal | portal | 100 | Clears `is_default` on the other portals |
| RP: Track source changes | source_file | 100 | Advances the owner's `source_revision` |
| RP: Compile component on save | component | 500 | Compiles into the build |
| RP: Compile theme on save | theme | 500 | Writes `theme.css` |
| RP: Compile owner on source file change | source_file | 500 | Recompiles the owner (insert, update, delete) |
| RP: Compile placement instance CSS | placement | 900 | Compiles `instance_css` when its inputs change (`classes`, `style_tokens_json`, `layout_json`, `options_json`, `component`), then reprocesses the portal if the CSS changed |
| RP: Reprocess release (portal / page / placement / theme / component / menu / menu item) | each | 1000 | Reprocesses the affected portal(s); the component rule fires only when name, kind, active, server mode, regions, default options or placeable change |

A successful compile also flags importers `needs_rebuild` and reprocesses every portal using the component directly, as a layout, or through imports. A reprocess writes the release only when the manifest hash changed.

## Batch mode (session flags)

Two session client-data flags let a multi-record write compile and reprocess once instead of once per record:

| Flag | Read by | Set by |
|---|---|---|
| `x_312987_portal.skip_compile` | The three compile-on-save rules | A Studio save (it compiles once itself at the end), the seed |
| `x_312987_portal.skip_reprocess` | Every reprocess rule, `reprocessForOwner` (so a compile inside the batch doesn't rebuild every portal that uses the component), and the instance CSS rule's reprocess step | The page designer and Menus editor (one reprocess per operation), the seed |

The instance CSS rule always compiles the placement's CSS, even inside a batch; only its portal reprocess is deferred. The seed sets both flags, compiles each changed component once in dependency order, and reprocesses each portal once at the end (see [Release workflow](release-workflow.md#seeding)).

Flags are cleared through the global helper app, else blanked (scoped `GlideSession` has no `clearClientData`).

## Scheduled job

**React Portal: maintenance** runs daily at 03:15 (`ReactPortal().runMaintenance()`):

1. clears compile requests nobody completed within `build.abandon_minutes` (60);
2. deletes execution-log rows older than `execution_log.retention_days` (14).

## System properties

| Property | Default | Meaning |
|---|---|---|
| `x_312987_portal.runtime_abi_version` | `1` | Host runtime ABI new builds target (part of the input hash) |
| `x_312987_portal.log_executions` | `false` | Log successful executions too |
| `x_312987_portal.execution_log.retention_days` | `14` | Execution-log retention |
| `x_312987_portal.build.abandon_minutes` | `60` | When a pending compile counts as abandoned |
| `x_312987_portal.build.retention_days` | `30` | Declared; not used by maintenance today |
| `x_312987_portal.build.max_bytes` | `5242880` | Max total size of one build's assets |
| `x_312987_portal.source.max_file_bytes` | `1048576` | Max size of one source file |
| `x_312987_portal.max_files_per_owner` | `200` | Max files in one save |
| `x_312987_portal.studio.kind_files` | JSON (kind → files) | Which baseline files each component kind has; applies to Studio, saves, checks, the compiler and server scripts. See [Code editor](../studio/code-editor.md#virtual-files) |
| `x_312987_portal.public.welcome` | demo text | Demo public property |
| `x_312987_portal.embed_secret` | generated | Embed signing secret; created at runtime, not in Fluent |
| `x_312987_portal.seed.template_hash` | written by the seed | Hash of the last seeded portal template; `npm run seed` skips the portals step while it matches. Not in Fluent. See [Release workflow](release-workflow.md#seeding) |

All but the demo property, the secret and the seed marker are admin read/write.

## Script Include and application menu

- `ReactPortal` (Script Include, public): the classic bridge. See [ReactPortal Script Include](../server-api/script-include.md).
- The **React Portal** application menu: Portals, Pages, Placements, Menus, Menu Items, Themes; Widgets, Layouts, Blocks, Primitives, Utilities (filtered lists), All Components, Source Files; Builds, Releases, Execution Log; Administration (admin).

## Related

- [Data model](data-model.md)
- [Builds, releases and manifests](../concepts/builds-and-releases.md)
