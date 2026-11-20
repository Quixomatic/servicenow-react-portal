---
title: Layouts
description: Layout components, regions (slots), contributions, and layout options at portal and page level.
section: Concepts
order: 4
tags: [layout, regions, slots, options]
---

# Layouts

A **layout** is a component (`kind = layout`) that renders a page's frame. It only places **regions** (slots). The widgets in those regions (header, sidebar, footer) own their own height, borders, background, width and collapse behaviour.

Every page has one effective layout: its `layout_override`, else the portal's `default_layout`.

## Regions

A layout declares its regions in `regions.json` (the `regions_json` field):

```json
[
    { "name": "sidebar", "acceptsContributions": true },
    { "name": "header", "acceptsContributions": true },
    { "name": "subheader", "acceptsContributions": true },
    { "name": "main", "acceptsContributions": false },
    { "name": "footer", "acceptsContributions": true }
]
```

- Names are lower-case (`^[a-z][a-z0-9_-]*$`). Plain strings (`["header", "main"]`) and `{ "regions": [...] }` are accepted too.
- A layout without regions gets the defaults: `header`, `sidebar`, `main`, `footer`.
- `acceptsContributions` decides whether a page or widget may push content into the region with `<RegionPortal>`.
- The **main region** hosts the matched page: `main` if declared, else the first region.

The layout renders each region with `<Region name="…" />`:

```tsx
import { Region } from '@portal/runtime'

export default function Layout({ options }: { options: { contentPadding?: string } }) {
    return (
        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]" data-padding={options.contentPadding}>
            <Region name="header" />
            <Region name="main" className="min-h-0 overflow-auto" />
            <Region name="footer" />
        </div>
    )
}
```

A `<Region>` renders, in order: the region's **portal-level** placements (stable keys, so they stay mounted across navigation), then the **page's** placements (the main region through the router's outlet, other regions from the current page's data), then an outlet that `RegionPortal` contributions render into.

> **Note:** Layouts get `{ regions, options }` as props, not `instanceId`. They have no server script and aren't executed.

## Layout options

Layouts are configured like widgets: an `options.schema.json` and `options.defaults.json`. The effective options are merged in this order (later wins):

1. the layout's defaults (`default_options_json`);
2. the portal's `settings.layoutOptions`, **only** when the page uses the portal's default layout;
3. the page's own `layout_options_json`.

Bootstrap returns the default layout's effective options and `resolve` returns the page's. Layouts receive them as the `options` prop and through `useLayout().options`.

> **Note:** Layout options should switch CSS (data attributes, classes), never the element tree. An option change re-renders the layout, but never remounts it or its widgets.

The page designer edits the portal default in portal settings, and a "Portal default / Custom" override per page.

### Seed layouts

| Layout | Regions | Options |
|---|---|---|
| `app/app-shell` | sidebar, header, subheader, main, footer | `texture` (noise, plain); `contentPadding` (none, sm, md, lg); `subheader` (bar, banner, hidden); `subheaderTitle`, `subheaderSubtitle`, `subheaderIcon` (Lucide name), `subheaderTint` (primary, chart-1…5, none) |
| `app/standard-layout` | header, sidebar, main, footer | `header` (full, beside-sidebar); `contentPadding` |
| `app/centered-layout` | header, main, footer | `canvas` (muted, background) |

In `app/app-shell`, `subheader: banner` turns the sub-header into a hero band (its title defaults to the page title). The banner has a full-width **`below`** [header slot](../primitives/header-slots.md) under the title, where `app/hero-search` puts the portal search. `hidden` gives the space back to main, and [header slot](../primitives/header-slots.md) users fall back to rendering inline.

## Contributions (`RegionPortal`)

```tsx
import { RegionPortal } from '@portal/runtime'

<RegionPortal region="header">
    <span className="text-sm">Order {id}</span>
</RegionPortal>
```

The contribution is a React portal into the region's outlet: state, context and events stay with the contributing widget, and it unmounts with it. If the layout declares the region with `acceptsContributions: false` (or doesn't declare it), nothing renders and a warning is logged once.

For slots *inside* a header widget's own markup (left / center / right of a bar), use the [header slots](../primitives/header-slots.md) utility instead.

## Full-height framing

The host fills the visible viewport below its top edge. The layout sits in a one-cell grid frame, so its root stretches to full width and height, and the main region gets whatever space the other regions leave. The frame is also the `rp-page` size container used by instance CSS container queries. The effective [content width](content-width.md) is exposed as `--rp-content-max` around the layout.

## When a layout fails

If a layout can't load or crashes, the host shows a placeholder and stacks the regions (`header`, main, `sidebar`, `footer`) so widgets still render.

## Related

- [Placements and blocks](placements-and-blocks.md)
- [Layout and navigation hooks](../runtime-api/layout-and-navigation.md)
- [Regions (`regions.json`)](../authoring/regions.md)
