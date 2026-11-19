---
title: Options
description: Options schema and defaults, how effective options merge, the designer form, x-css-var and x-embed annotations.
section: Authoring components
order: 4
tags: [options, schema, designer, embeds]
---

# Options

Options are a component's per-instance configuration, like Service Portal widget options. They're declared with two JSON files:

| Studio file | Field | What |
|---|---|---|
| `options.schema.json` | `options_schema_json` | A JSON Schema (`type: object`, `properties`) |
| `options.defaults.json` | `default_options_json` | Default values (must be a JSON object) |

```json
{
    "type": "object",
    "properties": {
        "title": { "type": "string", "title": "Title" },
        "pageSize": { "type": "integer", "title": "Rows per page", "minimum": 1, "maximum": 200 },
        "density": { "type": "string", "title": "Density", "enum": ["compact", "normal", "comfortable"] },
        "showSearch": { "type": "boolean", "title": "Search" }
    }
}
```

## Effective options

| Instance | Effective options |
|---|---|
| Placement | `{ ...defaults, ...placement.options_json }` (shallow) |
| Layout | defaults → portal `settings.layoutOptions` (default layout only) → page `layout_options_json` |
| Embedded widget | `{ ...childBuildDefaults, ...filtered(clientOptions) }`, or the signed server options as they are. See [Embedded widgets](embedded-widgets.md#options-and-trust) |

Widgets get the effective options as the `options` prop (and from `useServer().options`); server scripts as `options`; layouts as the `options` prop and `useLayout().options`. `$sp.getValue(name)` reads an option, then falls back to a portal setting of the same name.

> **Note:** Defaults are part of the component record, and a change reprocesses every portal that uses it. Options of embedded children come from the child **build's** snapshot, so a child's schema change applies without touching the parent.

## The designer's options form

The page designer generates a form from the schema (the subset it supports):

| Schema | Control |
|---|---|
| `string` | text input; `enum` → select; `format: "textarea"` → textarea (Ctrl+Enter applies); `format: "color"` / `"url"` → colour / URL input |
| `number`, `integer` | number input |
| `boolean` | checkbox |
| `array` of objects | repeatable rows |
| `object` / anything else | JSON editor |
| no schema | a raw JSON editor for the whole options object |

`title` labels the control and `description` adds help text. Edits apply on blur or Enter (checkboxes and selects at once).

## `x-css-var`: options as CSS custom properties

On a **block**, a schema property annotated with `"x-css-var"` becomes a custom property in the instance CSS, including the `tablet` / `mobile` variants of the option:

```json
{
    "properties": {
        "columns": { "type": "string", "x-css-var": "--rp-grid-cols" },
        "tracks": { "type": "array", "x-css-var": "--rp-cols" }
    }
}
```

```css
.rp-grid { display: grid; grid-template-columns: var(--rp-grid-cols); }
```

- The name must match `^--[a-z][a-z0-9-]*$`.
- Arrays join with spaces; objects in an array contribute their `size` (so `tracks: [{ "size": "1fr" }, { "size": "2fr" }]` → `1fr 2fr`).
- Responsive values go in `tablet` / `mobile` sub-objects of the options (`{ "itemSpan": 4, "tablet": { "itemSpan": 6 } }`), compiled into `@container rp-page` queries.

## `x-embed: server`: options only the server can set

When a widget is embedded, client-supplied options are filtered against its schema. A property annotated `"x-embed": "server"` can't be set by a client at all, only by a parent's server script through `$sp.getWidget()` (whose options are signed):

```json
{ "properties": { "recordTable": { "type": "string", "x-embed": "server" } } }
```

Use it for anything that grants authority (a table to read, a query to run). See [Embedded widgets](embedded-widgets.md#options-and-trust).

## Validation used for embed filtering

For client-originated embed options, each key is checked against its schema property: `type` (string with `maxLength`, number/integer with `minimum`/`maximum`, boolean, array, object, null), and `enum`. Unknown keys, wrong types and `x-embed: server` keys are dropped. Without a schema, any JSON value is accepted.

## Related

- [Embedded widgets](embedded-widgets.md)
- [Placements and blocks](../concepts/placements-and-blocks.md)
- [Page designer](../studio/page-designer.md)
