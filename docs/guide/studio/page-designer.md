---
title: Page designer
description: The Pages activity — portal settings, pages, outline, a live canvas, View as user, palette, properties, blocks, styling, drag and drop, undo.
section: Studio
order: 3
tags: [studio, designer, drag-and-drop, blocks]
---

# Page designer

The **Pages** activity lays out pages on a live canvas that renders the **real portal**: the same router, layout, regions, blocks, loader, theme and light/dark mode.

```text
┌ portal picker ─────┐┌──────────── canvas ─────────────┐┌ palette ───────────┐
│ portal settings    ││  Desktop · Tablet · Mobile       ││ search, Widgets,   │
│ pages (home, +, ×) ││  interact / design toggle        ││ Blocks (presets)   │
│ outline (regions,  ││  drop zones, outlines, handles   │├ properties ────────┤
│  blocks, embeds)   ││                                  ││ options, styling,  │
└────────────────────┘└──────────────────────────────────┘│ grid, classes      │
                                                          └────────────────────┘
```

## Left column

- **Portal picker** and **portal settings**: name, theme, default layout, home page, default content width, and the layout-options form for the portal default (`settings.layoutOptions`).
- **Pages**: create, delete, set as home page. The page panel edits name, title, route, layout override, content width and layout options ("Portal default / Custom").
- **Outline**: every region and its placements as a tree, including block drop zones and read-only rows for embedded widgets.

## Canvas

- Renders the page through the host runtime (`PortalPreview`) with live updates off.
- Device widths: desktop, **tablet (820px)** and **mobile (390px)**. Instance CSS uses container queries on the page frame, so responsive styling renders exactly.
- A design overlay measures the runtime's markers (`data-rp-region`, `data-rp-placement`, `data-rp-zone`, `data-rp-embed`) and draws drop zones, outlines, labels and drag handles. It shields the live widgets from clicks unless **interact** mode is on.
- Embedded widgets show as read-only markers: never selectable or draggable.

## View as user

The canvas toolbar's **View as user** picker previews what the portal's [user criteria](../concepts/user-criteria.md) hide from a chosen user. Pick a user (search by name, user name or email) and Studio asks the server for its verdicts (`GET /rp_studio/portals/{id}/audience?user=<sys_id>`, which evaluates the criteria with `UserCriteriaLoader`):

- the toolbar shows a summary: how many pages and menu items are hidden, "nothing hidden", "can't open this portal", or "bypasses criteria" for admins and studio users;
- hidden pages are marked in the Pages list;
- on a hidden page, a banner above the canvas says the user can't see it (the page answers page-not-found and its menu items drop).

Only the user-criteria layer is simulated; role checks aren't. The chosen user is shared with the [Menus activity](menus.md) for the Studio session and isn't saved. The canvas itself still renders as you.

## Palette and properties

- The **palette** lists placeable widgets and blocks (with presets such as Columns ½+½, ⅓+⅔, ⅔+⅓, ⅓×3, ¼×4 and sidebar + main), with search. Drag onto a region or press **+**.
- The **properties** panel for the selected placement:
  - region, move up / down, scope (this page ↔ portal-wide), delete;
  - an **options form** generated from the component's schema (raw JSON without one). See [Options](../authoring/options.md#the-designers-options-form);
  - **Styling** (style tokens), **Grid** (position in the parent block) and **Classes** (Tailwind), each with **Base / Tablet / Mobile** editing;
  - an **Embeds** section listing the instance's live embedded widgets.

## Drag and drop

dnd-kit powers it:

- palette → region (or a block's drop zone) creates a placement;
- placements move within and between regions and drop zones, and between page and portal-wide scope;
- blocks move with their whole subtree;
- keyboard: focus a handle, Space to lift, arrow keys to move, Space to drop.

Deleting a non-empty block asks whether to move its contents out (`lift`) or delete everything (`cascade`).

## Undo and redo

Every write the designer issues goes on an undo stack: **Ctrl+Z** undoes (by sending the inverse write), **Ctrl+Shift+Z** or **Ctrl+Y** redoes. **Delete** removes the selection, **Escape** deselects.

## How writes work

Each change is a [Studio API](../rest-api/studio.md#page-designer) call (`/placements`, `/pages`, `/portals/{id}`). The server validates against the layout or the parent block's drop zones, renumbers siblings, recompiles the placement's instance CSS when styling changed, and reprocesses the portal's release **once** per operation. The designer then refetches the designs and re-renders the canvas from the freshly published data.

## Related

- [Placements and blocks](../concepts/placements-and-blocks.md)
- [Layouts](../concepts/layouts.md)
- [Content width](../concepts/content-width.md)
