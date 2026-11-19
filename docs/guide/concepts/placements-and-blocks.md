---
title: Placements and blocks
description: Placing widgets and blocks on pages, nesting in drop zones, per-instance options, styling, grid layout and classes.
section: Concepts
order: 5
tags: [placement, block, styling, grid]
---

# Placements and blocks

A **placement** (`x_312987_portal_placement`, Service Portal's widget instance) puts one widget or block into a region. It carries that instance's options and styling.

## Owner and region

| Field | Meaning |
|---|---|
| `portal` | Owning portal |
| `page` | Owning page. **Empty = portal-level** (rendered on every page, mounted across navigation) |
| `region` | A region of the effective layout, or a drop zone of the parent block (default `main`) |
| `parent` | Parent block placement (blocks only); empty for top-level placements |
| `order` | Position within the region (default 100) |
| `component` | The widget or block to render. Layouts can't be placed |
| `active` | Inactive placements (and every child of an inactive block) aren't rendered |
| `owner_key` | `page:<id>` or `portal:<id>` (maintained by business rules) |

`RP: Validate placement` checks, on every insert and update:

- exactly one owner: a page (its portal is filled in), or the portal itself;
- the component is a widget or block;
- a top-level region exists on the effective layout, and a nested region is one of the parent block's resolved drop zones;
- the parent belongs to the same owner, there's no cycle, and nesting is at most **6** levels;
- the JSON fields parse; `classes` is normalized to safe tokens.

## Options

`options_json` holds this instance's options. The effective options are the component's `default_options_json` overlaid by the placement's options (a shallow merge). Widgets get them as the `options` prop and from `useServer().options`; server scripts get them as `options`.

## Blocks

A **block** (`kind = block`) is a page-structure component with **drop zones**: section, container, grid, columns, stack, split. Blocks are placed like widgets, and other placements nest inside them through `parent` + `region`.

A block declares its drop zones as data in `regions.json`:

```json
[
    "items",
    { "name": "aside", "label": "Aside" },
    { "repeat": "tracks", "name": "col-{n}", "label": "Column {n}" }
]
```

- A plain string or `{ name, label? }` is a static zone.
- `{ repeat, name, label? }` makes one zone per element of the instance's option named by `repeat` (an array), or `n` zones when that option is a number. `{n}` is the 1-based index; `{field}` reads a field from an object element (e.g. `"name": "{area}"` for named grid areas).
- Zones are resolved against each instance's effective options, so changing a Columns block's `tracks` changes its drop zones. At most 24 zones per block.

A block renders its zones with `<Region name>` and spreads `useBlock().rootProps` on its root element:

```tsx
import { Region, useBlock } from '@portal/runtime'

export default function Stack() {
    const { rootProps, regions } = useBlock()
    return (
        <div {...rootProps} className={`flex flex-col gap-4 ${rootProps.className || ''}`}>
            {regions.map((r) => (
                <Region key={r.name} name={r.name} contents />
            ))}
        </div>
    )
}
```

`contents` renders no element of its own for the zone, so the children are direct grid or flex items of the block root (needed for CSS grid and `subgrid`). A block has no wrapper element: its root carries `data-rp-placement`, so a nested Grid is a direct grid child of its parent Grid.

### Seed blocks

| Block | Drop zones | Notable options |
|---|---|---|
| `app/section` | `content` | `paddingY`, `maxWidth`, `gap` |
| `app/container` | | width and padding |
| `app/grid` | `items` | `columns`, `rows`, `gap`, `itemSpan` (tablet 6, mobile 12), `alignItems`, `justifyItems`, `autoFlow`, `subgrid` (none, columns, rows, both) |
| `app/columns` | `col-1`…`col-n` from `tracks` | `tracks` (`[{ size: "minmax(0, 1fr)" }, …]`), `gap`, `align`; presets ½+½, ⅓+⅔, ⅔+⅓, ⅓×3, ¼×4, sidebar + main |
| `app/stack` | | |
| `app/split` | | |

## Instance styling

Every placement can be styled without touching the component's code. Four fields feed it:

| Field | What |
|---|---|
| `style_tokens_json` | Style tokens: `padding`, `paddingX`, `paddingY`, `margin`, `marginX`, `marginY`, `background`, `color`, `border`, `borderColor`, `radius`, `shadow`, `minHeight`, `maxWidth`, `width`, `gap`, `opacity`, `textAlign`, `overflow` (an allowlist; anything else is ignored). Bare theme colour names (`muted`, `primary`) resolve to `var(--muted)` |
| `layout_json` | Position in the parent block's grid: `colSpan` (number or `full`), `rowSpan`, `colStart`, `rowStart`, `order`, `alignSelf`, `justifySelf` (spans 1–48) |
| `classes` | Tailwind classes, compiled on the server |
| `options_json` | Block options whose schema property has `"x-css-var": "--name"` become custom properties (arrays of `{size}` join with spaces), so block CSS like `grid-template-columns: var(--rp-cols)` is responsive |

Each group accepts `tablet` and `mobile` sub-objects:

```json
{ "padding": "2rem", "background": "muted", "tablet": { "padding": "1rem" }, "mobile": { "padding": "0.5rem" } }
```

They compile into container queries against the page frame (`@container rp-page (max-width: 1023px)` and `(max-width: 639px)`), so the designer's tablet (820px) and mobile (390px) canvas widths render exactly.

The result is stored in the read-only `instance_css` field, scoped to `[data-rp-placement="<id>"][data-rp-placement]` (the doubled attribute beats a block's own class rules). These rules are unlayered, so they win over Tailwind utilities. The `classes` utilities come first, as a Tailwind sheet with its variants in `rp-variants`. Instance CSS recompiles from the designer, and from the `RP: Compile placement instance CSS` business rule when a placement is edited directly. The host injects it once per placement and removes it when the last instance unmounts.

> **Warning:** Style values are filtered (`lib/css-safe.ts`): anything that looks like it could break out of a declaration is dropped. Classes are reduced to safe tokens before compiling.

## Visibility

`visibility_config_json` exists on the table and is validated as JSON, but nothing evaluates it yet.

## Deleting a block with children

The designer's delete (`DELETE /rp_studio/placements/{id}?mode=lift|cascade`) refuses with `409 has_children` unless you choose: `lift` moves the children out to where the block was, `cascade` deletes them too.

## Related

- [Page designer](../studio/page-designer.md)
- [Options (`x-css-var`)](../authoring/options.md)
- [Layout and navigation hooks (`useBlock`)](../runtime-api/layout-and-navigation.md#useblock)
