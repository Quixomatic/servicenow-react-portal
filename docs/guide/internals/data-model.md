---
title: Data model
description: Every React Portal table and field, how they relate, and which are authored versus generated.
section: Platform internals
order: 1
tags: [internals, tables, schema]
---

# Data model

All tables live in the `x_312987_portal` scope (prefix `x_312987_portal_`), defined in `src/fluent/tables/`. Every table except `execution_log` **extends `sys_metadata`**, so authored content *and* its compiled output are application files: they travel in update sets and the app.

```text
portal ─┬─ theme
        ├─ default_layout ─────────────▶ component (kind=layout)
        ├─ home_page ──▶ page ─┬─ layout_override ─▶ component
        │                      └─ placement* ─┬─ component (widget|block)
        ├─ placement* (portal-level)          └─ parent ─▶ placement (block)
        ├─ menu* ── menu_item* ─┬─ parent ─▶ menu_item (group)
        │                       └─ page ─▶ page
        └─ release (1) ── release_entry*  ──▶ build / component / theme / placement

component ─┬─ source_file*         theme ─┬─ source_file*
           └─ build (1) ─┬─ build_asset*  └─ build (1)
                         └─ build_dep* ─▶ target_build
execution_log (not sys_metadata)
```

## Authored tables

### `portal`

`name`, `slug` (unique), `description`, `active`, `is_default`, `theme` → theme (restrict), `default_layout` → component (kind=layout, restrict), `home_page` → page (clear), `navigation_json` (deprecated), `settings_json`, `roles` (audience). Audited. See [Portals](../concepts/portals.md).

### `theme`

`name`, `key` (unique, derived from name), `description`, `active`, `tokens_json`, `stylesheet` (≤ 1 MB), `source_revision` (read-only).

### `component`

`name`, `namespace` (default `app`), `key`, `unique_id` (`<namespace>/<key>`, unique, read-only), `kind` (widget, layout, utility, block, primitive), `description`, `placeable`, `active`, `client_script`, `css`, `tailwind` (default true), `script`, `server_mode` (none, on-load, on-demand), `exports_json`, `options_schema_json`, `default_options_json`, `regions_json`, `dependency_spec_json`, `source_revision`. Audited.

### `source_file`

Extra files of a component **or** theme (exactly one owner). `component` / `theme` (cascade), `owner_key` (`component:<id>` / `theme:<id>`), `path`, `target` (client, server, style, asset), `content_text` (≤ 1 MB), `encoding` (utf8, base64), `mime_type`, `content_hash`, `byte_length`, `revision`. Unique index (`owner_key`, `path`).

### `page`

`portal` (mandatory, cascade), `name`, `route_pattern`, `title`, `layout_override` → component (restrict), `access_config_json`, `content_width` (inherit, full, 7xl…3xl), `layout_options_json`, `order`, `active`. Unique index (`portal`, `route_pattern`). Audited.

### `placement`

The spec's "widget instance" (shortened for the 30-character name limit). `portal` (cascade), `page` (cascade; empty = portal-level), `owner_key` (`page:<id>` / `portal:<id>`), `region`, `component` → component (widget+placeable or block; restrict), `parent` → placement (cascade), `order`, `active`, `options_json`, `style_tokens_json`, `visibility_config_json` (validated, unused), `layout_json`, `classes`, `instance_css` (read-only, compiled). Index (`owner_key`, `region`, `order`). Audited.

### `menu`

`portal` (cascade), `key`, `name`, `description`, `active`. Unique index (`portal`, `key`).

### `menu_item`

`menu` (cascade), `parent` → menu_item (group of the same menu; cascade), `order`, `label`, `active`, `type` (page, route, url, group, separator, dynamic), `page` (cascade), `params_json`, `route`, `url`, `icon`, `target`, `match` (prefix, exact), `tooltip`, `collapsed`, `roles`, `condition`, `badge`, `badge_script`, `script`. Index (`menu`, `parent`, `order`). The form includes the Lucide icon-picker UI macro / formatter.

## Generated tables

Written only by server services (and admins). Their scope follows the owner's application (business rules), so generated records land in the same app as their source.

### `build`

One per component or theme. `component` / `theme` (cascade), `owner_key` (unique), `state` (pending, ready, failed), `built_revision`, `pending_revision`, `needs_rebuild`, `input_hash`, `compiler_version`, `runtime_abi_version`, `server_script`, `options_snapshot`, `exports_snapshot`, `source_snapshot_json`, `diagnostics_json`, `last_error`, `requested_at`, `completed_at`.

### `build_asset`

`build` (cascade), `path` (flat file name), `kind` (js, css, map, wasm, other), `mime_type`, `hash`, `byte_length`, `content` (≤ 5 MB). Unique index (`build`, `path`).

### `build_dep`

The spec's "build dependency". `build` (cascade), `specifier`, `kind` (component, host, package, relative), `target_build` → build (clear), `host_export`, `package_version`, `resolved_entry`.

### `release`

One per portal. `portal` (unique, cascade), `revision`, `manifest_json` (≤ 4 MB), `manifest_hash`, `host_abi`, `problems_json`, `processed_at`, `processed_by`, `notes`.

### `release_entry`

`release` (cascade), `stable_key` (`placement:<id>`, `layout:<id>`, `theme:<id>`), `entry_type`, `component`, `theme`, `placement` (delete), `build` (clear), `server_mode`. Unique (`release`, `stable_key`); index on `build` (asset authorization).

### `execution_log`

Not `sys_metadata`. `correlation_id`, `portal`, `release`, `build`, `placement`, `component`, `instance` (placement id or embed composite id), `action`, `duration_ms`, `outcome` (success, error, denied), `sanitized_error`. Trimmed nightly.

## In progress

> **Note:** **In progress:** six user-criteria m2m tables (`portal_uc`, `portal_uc_no`, `page_uc`, `page_uc_no`, `item_uc`, `item_uc_no`), each `sys_metadata` with a record reference and a `user_criteria` reference. See [User criteria](../concepts/user-criteria.md).

## Source sync exclusions

`now.config.json` lists every React Portal content table (and the UX tables of the UI Builder experience) in `ignoreTransformTableList`, so a Fluent sync never pulls portal content or the host's UX records into source. Content is created by the seed or by authors on the instance.

## Fluent rules for these files

- `.now.ts` files are statically analyzed: no loops, no shorthand properties, no shared variables as property values. That's why every ACL is written out.
- `Table({ readRoles … })` only sets legacy dictionary roles; real access needs explicit `Acl()` records.
- Deleting a `Table()`, `BusinessRule()` or `Record()` propagates through `src/fluent/generated/keys.ts`; never-installed deletions must also be removed from `keys.ts`.

## Related

- [Business rules](business-rules.md)
- [Builds, releases and manifests](../concepts/builds-and-releases.md)
