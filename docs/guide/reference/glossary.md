---
title: Glossary
description: React Portal terms and their Service Portal equivalents.
section: Reference
order: 1
tags: [reference, glossary]
---

# Glossary

| Term | Meaning | Service Portal equivalent |
|---|---|---|
| **Block** | A component (`kind = block`) with drop zones that structures a page: grid, columns, section | Container / row / column |
| **Bootstrap** | The first runtime call for a portal: portal, user, theme, default layout, portal-level placements, pages, menus | |
| **Build** | The one compiled record of a component or theme: assets, server script, dependencies, snapshots | |
| **Capability** | A Studio duty checked per request: `author`, `design`, `publish`, `any` | |
| **Component** | A record of `x_312987_portal_component`: widget, layout, block, primitive or utility | Widget |
| **Content width** | A page's max main-content width, exposed as `--rp-content-max` | |
| **Drop zone** | A block's region, declared in `regions.json`, possibly option-driven | |
| **Embed / embedded instance** | A widget rendered inside another widget as its own instance, with a composite id `<placement>~<key>` | `<sp-widget>`, `$sp.getWidget` |
| **EmbedModel** | What `$sp.getWidget` / `getWidget()` return and `<Embed model>` renders | Widget model |
| **Host** | The `x-312987-portal-host` Next Experience component that renders portals and Studio | `/sp` UI page |
| **Host kit** | Generic shadcn/ui components and libraries shipped in the host (`components:button`, `utilities:react-query`) | |
| **Instance CSS** | A placement's compiled CSS from its classes, style tokens, grid layout and `x-css-var` options | |
| **Layout** | A component (`kind = layout`) that places regions around a page | Page layout / theme header-footer |
| **Layout options** | A layout's options, set portal-wide and per page | |
| **Live mode** | Serving a manifest assembled from records when a portal has no (current) release | |
| **Manifest** | The compiled description of a portal stored on its release | |
| **Menu / menu item** | Navigation records per portal, resolved per user | Menu (`sp_instance_menu`, `sp_rectangle_menu_item`) |
| **Placement** | A widget or block placed in a region of a page (or portal-wide) | Widget instance (`sp_instance`) |
| **Portal** | A site with a slug, theme, default layout, pages and menus | Portal (`sp_portal`) |
| **Portal-level placement** | A placement with no page: rendered on every page, mounted across navigation | Header / footer widget |
| **Primitive** | A reusable record component (`kind = primitive`) that widgets import, never placed | Angular provider / directive |
| **Record import** | `components:<ns>/<key>` or `utilities:<ns>/<key>`: importing another component record | Dependencies |
| **Region** | A named slot of a layout | |
| **Release** | The one record per portal holding its manifest; reprocessed automatically | |
| **Reprocess** | Re-assembling a portal's manifest and writing it if it changed | |
| **Route pattern** | A page's portal-relative path: `orders`, `orders/:id`, `docs/*` | Page id |
| **rp-variants** | The cascade layer Tailwind variant rules move into so variants beat base utilities across sheets | |
| **Server mode** | When a widget's server script runs: `none`, `on-load`, `on-demand` | |
| **Studio** | Portal Studio: code editor, page designer, menus editor | Widget editor, Designer, Page editor |
| **Theme** | Tokens plus a stylesheet, light and dark | Theme (`sp_theme`) |
| **Token (theme)** | A CSS custom property such as `primary`, `radius`, `sidebar` | SCSS variable |
| **Token (embed)** | A signature over server-chosen embed options | |
| **Unique id** | A component's `<namespace>/<key>` (`app/record-form`) | Widget id |
| **Utility** | A code-only record component (`kind = utility`), imported as `utilities:<ns>/<key>` | Script include (client side) |
| **Virtual file** | A record field shown as a file in Studio: `main.tsx`, `styles.css`, `server.js`… | |
| **Widget** | A placeable component with an optional server script | Widget |
