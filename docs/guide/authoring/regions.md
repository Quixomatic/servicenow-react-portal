---
title: Regions (regions.json)
description: Declaring layout regions and block drop zones, static and option-driven.
section: Authoring components
order: 5
tags: [regions, layout, block, drop-zones]
---

# Regions (`regions.json`)

`regions.json` (the `regions_json` field) appears in Studio for **layouts** and **blocks** (the default of `x_312987_portal.studio.kind_files`; see [Code editor](../studio/code-editor.md#virtual-files)). It declares where placements can go.

## Layouts

An array of region definitions:

```json
[
    { "name": "header", "acceptsContributions": true },
    { "name": "main", "acceptsContributions": false },
    { "name": "footer", "acceptsContributions": true }
]
```

| Rule | Detail |
|---|---|
| Name | Lower-case, `^[a-z][a-z0-9_-]*$`; duplicates dropped |
| Shorthand | `["header", "main"]` (contributions allowed) or `{ "regions": [...] }` |
| `acceptsContributions` | Default `true`. Whether `<RegionPortal region>` may render into it |
| Empty | The layout gets `header`, `sidebar`, `main`, `footer` |
| Main region | `main` if declared, else the first region: it hosts the matched page |

The `RP: Normalize component definition` business rule stores the normalized list. Placement validation rejects a top-level placement whose region the effective layout doesn't declare.

> **Warning:** Renaming or removing a region a page uses makes those placements invalid on their next save. Move them first.

## Blocks

A drop zone spec, resolved per instance against its effective options:

```json
[
    "content",
    { "name": "aside", "label": "Aside" },
    { "repeat": "tracks", "name": "col-{n}", "label": "Column {n}" },
    { "repeat": "areas", "name": "{name}", "label": "{label}" }
]
```

| Entry | Meaning |
|---|---|
| `"name"` / `{ name, label? }` | A static zone. Name `^[a-z][a-z0-9_-]{0,39}$` |
| `{ repeat, name, label? }` | One zone per element of the option `repeat` (an array), or `n` zones when it's a number. `{n}` = 1-based index; `{field}` = a field of an object element |

- At most **24** zones per block instance. Invalid or duplicate resolved names are skipped.
- Changing an instance's options (e.g. adding a column to `tracks`) changes its zones immediately; the release manifest carries each block instance's resolved zones.
- A malformed spec is rejected on save with a message (`"repeat" must name an option, e.g. "tracks"`).

Render each zone with `<Region name={…} />` inside the block (see [`useBlock`](../runtime-api/layout-and-navigation.md#useblock)).

## Related

- [Layouts](../concepts/layouts.md)
- [Placements and blocks](../concepts/placements-and-blocks.md)
