---
title: Introduction
description: What React Portal is, how it differs from Service Portal, and the mental model behind it.
section: Introduction
order: 1
tags: [overview, architecture]
---

# Introduction

React Portal is a successor to ServiceNow Service Portal that runs on **Next Experience**. Portals, pages, layouts, widgets and themes are records in the scoped application `x_312987_portal`. Widgets are written in TSX or JSX. The instance compiles them when they're saved, and one React 19 host component renders a whole portal inside a single UI Builder page.

It keeps the Service Portal mental model (portals, pages, widgets with a client part and a server script, `$sp`, options) and swaps the technology underneath:

| Service Portal | React Portal |
|---|---|
| AngularJS 1.x widgets, `c.data` / `c.server.get()` | React 19 function components, `useServer()` (`data`, `server.get()`) |
| Widget HTML template + client controller + CSS/SCSS | One `main.tsx` (plus extra files), `styles.css`, Tailwind v4 classes |
| Bootstrap 3 | shadcn/ui on Base UI, Tailwind v4, theme tokens, light/dark mode |
| Server script with `input`, `data`, `options`, `$sp` | The same IIFE shape: `input`, `data`, `options`, `$sp` (also `$rp`) |
| Pages built from containers / rows / columns | Pages built from **layouts** (regions) and **blocks** (grids, columns, sections) |
| Widgets embedded with `<sp-widget>` / `$sp.getWidget` | Widgets embedded by **importing** the widget record, or with `$sp.getWidget` |
| `sp_portal`, `sp_page`, `sp_widget`, `sp_instance` | `portal`, `page`, `component`, `placement` tables (prefix `x_312987_portal_`) |
| Rendered by `/sp` (a classic UI page) | Rendered by the `x-312987-portal-host` custom element on a UI Builder page |

## The mental model

Everything flows one way: **records → compile → release manifest → host renders**.

1. **Records.** Authors and admins edit records: a portal, its pages, the placements on each page, components (widgets, layouts, blocks, primitives, utilities), themes and menus. Studio edits them through the [Studio REST API](rest-api/studio.md). The platform's own forms and lists work too.
2. **Compile.** Saving a component or theme compiles it **on the instance**. The [server-side compiler](internals/compiler.md) uses Sucrase, a small linker and Tailwind v4, with no WebAssembly. The result is one **build** record per component or theme: `index.js` (an ES module) and `index.css`, plus a copy of the server script.
3. **Release manifest.** Each portal has one **release** record. It holds the portal's compiled manifest: theme, layouts, pages, placements (with their options and instance CSS), menus, and the asset URL of every build. Business rules reprocess it automatically whenever one of its inputs changes. See [Builds, releases and manifests](concepts/builds-and-releases.md).
4. **Host renders.** The host component bootstraps the portal (`GET /portals/{slug}/bootstrap`), resolves the current page (`POST /pages/resolve`), downloads each build's JS and CSS through the [runtime REST API](rest-api/runtime.md), and renders the layout, regions and widgets in a shadow root. On-load server scripts run in one batch (`POST /instances/initialize`). Later calls go to `POST /instances/{id}/execute`.

```text
 Studio / forms                     instance                                   browser
┌──────────────┐  save   ┌──────────────────────────────┐  bootstrap/resolve  ┌───────────────────────┐
│ component    │────────▶│ compiler → build (js, css,   │────────────────────▶│ x-312987-portal-host  │
│ theme, page  │         │            server script)    │  assets (Blob URL)  │  router → layout →    │
│ placement    │         │ release (manifest per portal)│◀────────────────────│  regions → widgets    │
│ menu         │         │ executor ($sp, input, data)  │  initialize/execute │  useServer, $sp calls │
└──────────────┘         └──────────────────────────────┘                     └───────────────────────┘
```

## What's in the box

- **Backend** (`src/fluent`, `src/server`): 20 tables (14 for content and builds, 6 for user criteria), ACLs and roles, two scripted REST APIs (`rp` runtime, `rp_studio` authoring), business rules for validation, compiling and reprocessing, the compiler, the component executor (`$sp`), embeds, menus and security.
- **Host** (`packages/portal-host`): the `x-312987-portal-host` Next Experience component. It holds the portal runtime (`@portal/runtime`), the host kit (shadcn/ui components such as `components:button`), and Portal Studio (code editor, page designer, menus editor) as a separate chunk.
- **Global helper app** (`packages/global-helpers`): a small global-scope app that proxies the session APIs scoped code can't call. See [Global helper app](internals/global-helper-app.md).
- **Primitives** (seed records): fields, forms with the platform's form runtime, dialogs, related lists, attachments, activity, lists, catalog variables, cart and checkout, search, and GraphQL data hooks, all built as `kind = primitive` or `utility` component records. See [Primitives overview](primitives/overview.md).

## Where to go next

- Coming from an earlier release: [What's new](whats-new.md).
- New to React Portal: [UI Builder setup](getting-started/ui-builder-setup.md), then [Your first widget](getting-started/first-widget.md).
- Writing widgets: [Authoring components](authoring/client-script.md) and the [Runtime API](runtime-api/overview.md).
- Building portals: [Portals](concepts/portals.md), [Pages and routes](concepts/pages-and-routes.md), [Page designer](studio/page-designer.md).
- Changing the platform: [Platform internals](internals/data-model.md).

> **Note:** This guide documents the code in the repository. For what changed in each release, see [What's new](whats-new.md).
