---
title: Studio overview
description: Portal Studio's activities, deep links and URL params, the scope banner, and how it loads.
section: Studio
order: 1
tags: [studio, ide, deep-links, scope]
---

# Studio overview

**Portal Studio** is React Portal's workbench, rendered by the same host component in `mode = studio` on the UI Builder `studio` page. It has three **activities** on the left activity bar:

| Activity | `view` param | What |
|---|---|---|
| **Components** | `code` | A VS Code-style editor for components and themes. See [Code editor](code-editor.md) |
| **Pages** | `pages` | A drag-and-drop page designer on a live canvas. See [Page designer](page-designer.md) |
| **Menus** | `menus` | Menus with a live preview through the portal's real widgets. See [Menus activity](menus.md) |

Studio needs a React Portal role: developer to author code, designer to design pages and menus (developers can too), admin for everything.

## How it loads

Studio is a **separate chunk** (`portal-studio.jsdbx`, about 1 MB, with CodeMirror, allotment and dnd-kit). Portal pages never download it. The chunk carries its own React copy and mounts its own root, so widget previews and the designer canvas render back through the **host's** React and runtime (registry `internals`): they look exactly like the portal.

## Deep links

Studio's URL has two optional params: `id` (a record sys_id, the host's `recordId`) and `view` (the activity).

```text
/x/312987/portal/studio                                   last activity
/x/312987/portal/studio/params/id/<component sys_id>      open a component (or theme) in the editor
/x/312987/portal/studio/params/id/<portal or page sys_id> open the page designer on it
/x/312987/portal/studio/params/view/menus/id/<menu or item sys_id>   open the Menus activity on it
```

Studio resolves an `id` itself (`GET /rp_studio/design/{id}`): a component or theme opens the editor, a portal or page opens the designer, a menu or menu item opens Menus. With `view=menus`, a portal id opens its menus. An unknown id shows "Nothing in React Portal has the id …". Every Studio navigation carries the current activity as `view`, so the URL follows.

> **Note:** URL sync depends on the `studio` page's Link to destination handler mapping the payload's `recordId` → `id` and `view` → `view`. See [UI Builder setup](../getting-started/ui-builder-setup.md#the-studio-page).

## Scope banner

New records take the session's **current application**. A Studio edit made while the platform's application picker is on another app (Global, say) would land in the wrong scope and update set. So:

- `GET /rp_studio/context` reports React Portal's app, the picker's current app (read from the `apps.current_app` user preference), whether they match, and the current update set.
- **Out of scope**, every activity shows a banner with **Switch to React Portal**, and editing is disabled. Switching uses the platform picker's own API (`PUT /api/now/ui/concoursepicker/application`), then reloads.
- The status bar shows the current app and update set.
- The server also rejects writes with `409 wrong_scope`, whatever the client does.

For local testing, `localStorage['rp-studio-scope'] = 'out'` (or `?rpscope=out`) simulates being out of scope without switching anything.

## Light and dark

Studio's title bar has the same Light / Dark / System toggle as the portals and shares the preference (`rp-theme`). CodeMirror switches between the VS Code light and dark themes.

## Related

- [Code editor](code-editor.md)
- [Page designer](page-designer.md)
- [Menus activity](menus.md)
- [Studio REST API](../rest-api/studio.md)
