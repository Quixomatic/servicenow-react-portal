---
title: Menus activity
description: Building portal menus in Studio with a live preview through the portal's real widgets, View as, drag-and-drop and the icon picker.
section: Studio
order: 4
tags: [studio, menus, navigation, preview]
---

# Menus activity

The **Menus** activity builds a portal's [menus](../concepts/menus.md) while showing them render.

| Column | Contents |
|---|---|
| Left | The portal's menus, **+ New menu** |
| Centre | A live preview: the portal's real header, sidebar and footer widgets and theme, rendered by the host runtime with this menu injected |
| Right | The item tree, quick-add, and the selected item's form (or the menu's settings) |

## Preview

- Modes: **Sidebar** (expanded or icon rail), **Header** (groups as dropdowns) and **Footer**.
- **View as**: `all` (every active item; empty groups stay visible while building), `none` (a user with no roles), or a specific role. Role-filtered views drop empty groups and tidy separators like the server.
- Clicking an item in the preview selects it in the tree (widgets mark items with `item.attrs`, `data-rp-nav-item`).
- The preview resolves items client-side, mirroring the server's resolution, with one approximation: **condition scripts aren't run**. Page items with route params get sample values.

## Tree and form

- Drag to reorder and to nest into groups (dnd-kit; keyboard works too).
- **Quick-add**: a page, a route, a URL, a group, a separator, or **All pages**.
- The item form covers every field: type, label, page and params, route, URL, icon (a searchable Lucide **icon picker**: type to search, arrow keys to move, Enter to pick, with live preview), target, match, tooltip, badge, collapsed, roles and condition.
- The server's validation and script syntax errors show inline on the form.

Every edit saves immediately; **Ctrl+Z** / **Ctrl+Shift+Z** undo and redo.

## Classic alternative

The React Portal application menu has **Menus** and **Menu Items** lists. The classic menu-item form includes the same Lucide icon picker as a formatter.

## Related

- [Menus](../concepts/menus.md)
- [Studio REST API: menus](../rest-api/studio.md#menus)
- [`useNavigation`](../runtime-api/layout-and-navigation.md#usenavigation)
