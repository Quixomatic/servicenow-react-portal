---
title: Studio overview
description: Portal Studio's activities, deep links and URL params, the scope banner, and how it loads.
section: Studio
order: 1
tags: [studio, ide, deep-links, scope]
---

# Studio overview

**Portal Studio** is React Portal's workbench, rendered by the same host component in `mode = studio` on the UI Builder `studio` page. It has four **activities** on the left activity bar:

| Activity | `view` param | What |
|---|---|---|
| **Components** | `code` | A VS Code-style editor for components and themes. See [Code editor](code-editor.md) |
| **Pages** | `pages` | A drag-and-drop page designer on a live canvas. See [Page designer](page-designer.md) |
| **Menus** | `menus` | Menus with a live preview through the portal's real widgets. See [Menus activity](menus.md) |
| **View rules** | `view-rules` | Portal view rules (form and list views per portal, page, condition and audience) with a test panel. See [View rules](../concepts/view-rules.md#studio) |

Studio needs a React Portal role: developer to author code, designer to design pages and menus (developers can too), admin for everything.

## How it loads

Studio is a **separate chunk** (`portal-studio.jsdbx`, about 1 MB, with CodeMirror, allotment and dnd-kit). Portal pages never download it. The chunk carries its own React copy and mounts its own root, so widget previews and the designer canvas render back through the **host's** React and runtime (registry `internals`): they look exactly like the portal.

## Deep links

Every Studio location has a URL, and the URL follows what you open. It uses the UI Builder params path (one `/params/` segment, then name/value pairs; never a `?query` string):

```text
/x/312987/portal/studio/params/view/<activity>/id/<target>/q/<url-encoded k=v&k=v>
```

- **`view`** is the activity: `code`, `pages`, `menus`, `view-rules` or `docs` (`components` also works).
- **`id`** is what to open. It takes a sys_id or a friendly form (below).
- **`q`** packs everything else as an encoded query string: `file=server.js&line=42` is written `file%3Dserver.js%26line%3D42`.

| Opens | URL (after `/x/312987/portal/studio`) |
|---|---|
| The last activity and state | *(nothing)* |
| A component in the editor | `/params/view/code/id/app%2Fform` (unique id `app/form`) or `/params/view/code/id/<sys_id>` |
| A file of it, at a line | `/params/view/code/id/app%2Fform/q/file%3Dserver.js%26line%3D42` (`col` too) |
| A theme | `/params/view/code/id/theme%3Adefault` (`theme:<key>`) or its sys_id |
| The Problems / Output panel | `…/q/panel%3Dproblems`, `…/q/panel%3Doutput` |
| The Properties panel (with Dependencies) | `…/q/props%3D1` |
| A page in the designer | `/params/view/pages/id/sp%3A%2Fhome` (`sp:/home`; `sp/home` works too) or the page sys_id. `sp:/` is the home page |
| A placement selected, at a device width | `/params/view/pages/id/sp%3A%2Fhome/q/placement%3D<sys_id>%26device%3Dmobile` (`desktop`, `tablet`, `mobile`) |
| Portal settings | `/params/view/pages/id/sp` (the slug) or the portal sys_id |
| A menu | `/params/view/menus/id/sp%3Aprimary` (`<portal slug>:<menu key>`) or the menu sys_id |
| A menu item, a preview placement | `/params/view/menus/id/sp%3Aprimary/q/item%3D<sys_id>%26preview%3Dheader`. An item sys_id as `id` works too |
| A portal's view rules / one rule | `/params/view/view-rules/id/sp/q/rule%3D<sys_id>` |
| A docs page | `/params/view/docs/id/studio%2Foverview` |
| A docs page of another collection | `/params/view/docs/id/test-guide%3Asetup` (`<collection>:<path>`; a bare path is `react-portal`, see [Docs and collections](docs.md)) |
| Any record, by sys_id | `/params/id/<sys_id>`: Studio asks the server what it is (`GET /rp_studio/design/{id}`) and opens the matching activity |

**What happens:**
- **Unknown targets** show an error ("No page "/nope" in portal sp"). Studio opens that activity's default, and the URL is corrected to what actually opened.
- **Friendly forms in generated links.** Links use the unique id, `slug:/route` and `slug:key` forms, falling back to the sys_id when a friendly form isn't unique.
- **Push or replace.** Switching activity, component, page, portal or menu adds a browser history entry, so Back and Forward walk them. Opening a file, selecting a placement or menu item, or changing the device or preview replaces the current entry.
- **Unsaved changes.** Back or Forward to another component asks Save / Discard / Cancel. Cancel keeps you where you are (the URL is put back).
- **Copy link.** Use the link button in the title bar or **Ctrl+Alt+L** to copy the current location. In the code editor, the link adds the cursor's file and line. An editor tab's context menu has **Copy Link to File** and **Copy Link to Line**, and the explorer's has **Copy Link to File**.

> **Note:** URL writes go through the studio page's Portal navigate handler (a script-mode Link to destination: `view`, `id`, `q`, redirect ← `replace`). See [UI Builder setup](../getting-started/ui-builder-setup.md#the-studio-page). Without the handler, Studio writes the history entries itself, so links and Back / Forward work either way.

### For activity authors: the location registry

Each activity declares its URL state in `studio/deep-link/registry.js`; the controller does the rest (load, sync, Back / Forward, Copy link):

```js
import { registerStudioLocation, createActivityState } from '../deep-link/registry';

export const rulesState = createActivityState({ portalId: null, ruleId: null });

registerStudioLocation({
	activity: 'viewRules',              // studio.get().view
	param: 'view-rules',                // the URL `view` value
	qKeys: ['rule'],                    // q keys this activity owns, in URL order
	pushKeys: ['id'],                   // a change here pushes history; other keys replace (default ['id'])
	serialize: (ctx) => ({ id: slugOf(rulesState.get().portalId), rule: rulesState.get().ruleId }),
	async apply(params, ctx) {          // params = { id, rule } ('' when absent)
		const portal = (await ctx.portals()).find((p) => p.slug === params.id || p.id === params.id);
		if (!portal) return ctx.notFound(`No portal "${params.id}"`);
		rulesState.set({ portalId: portal.id, ruleId: params.rule || null });
	},
	subscribe: (ctx, onChange) => rulesState.subscribe(onChange),
	label: () => 'View rules'           // the Copy link toast
});
```

- `apply()` runs before the activity's component mounts. That's why its state lives in a `createActivityState` store (read it in the component with `useActivityState(store, selector)`) rather than in `useState`.
- `apply()` can return `{ view: 'pages' }` to hand the params to another activity, or `{ cancelled: true }`.
- `ctx` has `studio`, `designer`, `menus`, `toast`, `notFound(message)`, `isSysId(value)` and `portals()`.

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
