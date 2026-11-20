---
title: Component kinds
description: Widgets, layouts, blocks, primitives and utilities, and what each kind can have and do.
section: Concepts
order: 6
tags: [component, widget, layout, block, primitive, utility]
---

# Component kinds

Every piece of code lives in one table, `x_312987_portal_component`. The `kind` field decides what a component is for.

| Kind | Purpose | Placed on pages? | Server script? | Imported as |
|---|---|---|---|---|
| `widget` | Placeable content | yes (placement) | yes (`server_mode`) | `components:<ns>/<key>` (renders as an [embedded instance](../authoring/embedded-widgets.md)) |
| `layout` | A page's frame: places regions | no: chosen on the portal or page | yes, optional (runs as `layout:<sys_id>`, see [Layouts](layouts.md#layout-server-scripts)) | not importable |
| `block` | Page structure with drop zones | yes, and nests | not by default (`server.js` isn't a block baseline file) | `components:<ns>/<key>` |
| `primitive` | Reusable UI building block (fields, lists, forms) | never | no | `components:<ns>/<key>` |
| `utility` | Shared code (hooks, fetchers, helpers) | never | no | `utilities:<ns>/<key>` |

## What each kind receives

| Kind | Props / context |
|---|---|
| widget | `{ instanceId, options, region }`; `useServer()` / `useComponent()` for data and server calls; when embedded, `{ embedded: true, …passThroughProps }` too |
| layout | `{ regions, options }`; renders `<Region name>` per region; `useLayout()`; `useServer()` when it has a server script |
| block | `useBlock()` → `{ placementId, options, regions, rootProps }`; renders `<Region name>` per drop zone |
| primitive / utility | whatever the importer passes; they run in the importing widget's instance (its `useServer()`, its context) |

## Shared fields

| Field | Studio file | Notes |
|---|---|---|
| `name` | | Display name |
| `description` | | Free text |
| `namespace` | | Default `app`. `^[a-z][a-z0-9-]{0,39}$` |
| `key` | | Derived from the name when empty (`Order List` → `order-list`). `^[a-z][a-z0-9-]{0,79}$` |
| `unique_id` | | `<namespace>/<key>`, read-only, unique (e.g. `app/order-list`) |
| `kind` | | widget, layout, block, primitive, utility |
| `placeable` | | Forced to `false` for every kind except widget |
| `active` | | Inactive components aren't rendered |
| `client_script` | `main.tsx` | The React component (default export), compiled as `main.tsx` |
| `css` | `styles.css` | Author CSS, appended after Tailwind's output (unlayered) |
| `tailwind` | | Default true: generate utilities for the classes used |
| `script` | `server.js` | Server script (widgets and layouts by default) |
| `server_mode` | | `none`, `on-load`, `on-demand` |
| `options_schema_json` | `options.schema.json` | JSON Schema for options (drives the designer's form, embed filtering) |
| `default_options_json` | `options.defaults.json` | Default options (a JSON object) |
| `regions_json` | `regions.json` | Layouts: regions. Blocks: drop zone spec |
| `exports_json`, `dependency_spec_json` | | Stored and snapshotted into builds; not used by the runtime yet |
| `source_revision` | | Advances when a build-relevant field changes |

Extra files (`source_file` rows) can belong to any kind. See [Client script](../authoring/client-script.md#extra-files).

## Baseline files per kind

Which of the fixed Studio files a kind has comes from the system property `x_312987_portal.studio.kind_files` (JSON, kind → file names). Its default:

| Kind | Files |
|---|---|
| widget | `main.tsx`, `styles.css`, `server.js`, `options.schema.json`, `options.defaults.json` |
| layout | `main.tsx`, `styles.css`, `server.js`, `regions.json`, `options.schema.json`, `options.defaults.json` |
| block | `main.tsx`, `styles.css`, `regions.json`, `options.schema.json`, `options.defaults.json` |
| primitive | `main.tsx`, `styles.css` |
| utility | `main.tsx` |

- `main.tsx` is always included. Unknown names are ignored, a kind the property leaves out keeps its default, and invalid JSON falls back to the defaults with a log warning.
- The rule applies to Studio, saves, the compiler's check and builds. Adding `server.js` to `block`, for example, gives blocks a server script.
- A file a kind doesn't list stays visible and editable, flagged as not used by the kind, while its field still has content.
- Extra source files aren't affected. Themes always have `theme.css` and `tokens.json`.

## Server mode

| Mode | When the script runs |
|---|---|
| `none` | Never: UI only. Server calls fail with `400` (`This component has no server script`) |
| `on-load` | In the page's batch `POST /instances/initialize` before the widget renders, and on every `server.get/update/refresh` |
| `on-demand` | Only when the client calls `server.get()`, `server.update()` or `server.refresh()` |

## Choosing a kind

- Something an admin drops on a page: **widget**.
- Page structure (columns, a grid, a section) with drop zones that admins fill: **block**.
- A building block other components compose (a field, a list, a dialog): **primitive**. It's a record, so it compiles once, caches once, and every widget that imports it shares it.
- Code with no UI of its own (data hooks, fetchers, formatting): **utility**.
- The frame around pages: **layout**.

See [Record imports](record-imports.md) for how components use each other, and the layering rule for host-kit pieces versus record primitives.

## Related

- [Record imports](record-imports.md)
- [Placements and blocks](placements-and-blocks.md)
- [Layouts](layouts.md)
- [Code editor](../studio/code-editor.md)
