---
title: Troubleshooting and FAQ
description: Symptoms, causes and fixes for common React Portal problems.
section: Reference
order: 3
tags: [reference, troubleshooting, faq]
---

# Troubleshooting and FAQ

Common symptoms, grouped by area, with the cause and the fix. Error codes are listed in [REST conventions](../rest-api/conventions.md#codes).

## Widgets

**"Widget app/x failed: No build: nothing compiled for this component yet"**
The component has never compiled successfully. Open it in Studio and check the Problems panel or the build's `diagnostics_json` / `last_error`. The release's `problems_json` lists every uncompiled component.

**My change doesn't show up.**
- A failed recompile keeps serving the last good build: check the build badge in Studio.
- Imported primitives: the importer's manifest updates when the primitive compiles; reload the page.
- Server script edits take effect only after a successful compile (the script runs from the build).
- The host itself may be served stale after a deploy: check `globalThis.__REACT_PORTAL__` and redeploy.

**`Unknown import "…"`**
Only relative files, `react`, `@portal/runtime` and `components:` / `utilities:` specifiers can be imported. npm packages can't. See [Record imports](../concepts/record-imports.md).

**`Import "components:app/x": … hasn't compiled successfully yet`**
Compile the imported component first. The seed orders components by their imports for this reason.

**A responsive class doesn't apply (`hidden sm:block`).**
Since compiler v5, variants live in `rp-variants` and beat base utilities from any sheet. A variant can still lose to a conflicting *variant* in a later sheet (`md:hidden` in another widget). Recompile old builds (they recompile on their next compile after the compiler upgrade). As a last resort use an important variant (`sm:block!`).

**Dropdowns or popovers don't open, or open unstyled.**
Use the host kit (`components:dropdown-menu`…) or pass `usePortalContainer()` to custom portals; floating UI must render in the overlay layer.

**A class built at runtime has no CSS.**
The Tailwind extractor only sees full class names in source. Write `bg-primary`, not `'bg-' + tone`.

## Server calls

**`500 script_error … (line N)`**
The server script threw at line N. Developers, designers and admins see the message in the toast; everyone else sees "Something went wrong" with a reference id (the server sends them only `The server script failed`). Look the reference up in the Execution Log by correlation id.

**`400 This component has no server script`**
The component's server mode is `none`. Set `on-load` or `on-demand`.

**`409 no_build`**
The placement's component has no usable build.

**`404 Component instance not found in this portal`**
The placement isn't in this portal's manifest, its page isn't accessible to the user, or (embeds) the widget isn't imported by the component that renders it.

**My `data` changes are lost on `server.update()`.**
The client's `data` is never sent; the script starts from empty `data`. Send what it needs as `input`.

**`gs.addInfoMessage` shows only once.**
Without the global helper app the session ignores a message identical to one still queued. Install the helper (it drains and flushes), or use `$sp.addInfoMessage`.

**`no_server` in Studio's Preview.**
The preview has no placement, so server calls and embeds have no server there. Test on a page.

## Navigation and URLs

**Back doesn't restore the previous state / a param sticks.**
UI Builder doesn't deliver absent optional params; the host reads the URL itself. Make sure the param is optional on the `site` page and your widget reads `usePortalLocation()`.

**`sys_id` is always empty.**
UI Builder dash-cases it to `sys-id` and the binding never delivers. Read `usePortalLocation().sysId`, which falls back to the URL.

**Every page change remounts the portal.**
A required UIB param other than `portalSlug` creates a new host instance per value. Make it optional.

**`Cannot read properties of undefined (reading '0')` on navigation.**
The Link to destination handler has `pageId` under required params. Move it to optional.

## Studio

**Saving fails with `409 wrong_scope`.**
The platform's application picker isn't on React Portal. Use the banner's **Switch to React Portal**.

**`409 conflict` on save.**
Someone else saved since you loaded. Reload, or overwrite from the conflict banner.

**API calls return 401 in a tab that used to work.**
The tab's `g_ck` is stale (session expired or re-login). Reload the tab.

## Platform

**Classic callers fail after a version bump.**
Module paths include the version. Build and install the app after every bump (`npm run build && now-sdk install`).

**Portals serve slowly after an upgrade.**
A manifest version bump makes every portal assemble its manifest live until reprocessed. Run `new x_312987_portal.ReactPortal().reprocessAll()` once.

**Menu item missing for some users.**
Check its roles, its condition (errors hide the item and log a warning), its page's access, and whether its group has any other visible item.

## Related

- [Instance gotchas](../internals/instance-gotchas.md)
- [REST conventions: error codes](../rest-api/conventions.md#codes)
