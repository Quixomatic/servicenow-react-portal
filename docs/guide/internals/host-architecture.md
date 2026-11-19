---
title: Host architecture
description: How the x-312987-portal-host component works — renderer, shadow DOM, property adapter, router, loader and Blob imports, styles, query cache, diagnostics and local development.
section: Platform internals
order: 4
tags: [internals, host, react, router, shadow-dom]
---

# Host architecture

`packages/portal-host` is a Next Experience UI component built with the ServiceNow ui-component CLI (`snc`). It renders a portal (`mode = portal`) or Portal Studio (`mode = studio`).

## Layers

```text
x-312987-portal-host (createCustomElement, @servicenow/ui-core)
 └─ renderer: @quixomatic/ui-renderer-react-simple (React 19 via react-shim, not the platform's React 16)
     └─ view.js           normalize properties → location store; navigate() → PORTAL_NAVIGATE
         ├─ PortalApp      full-height frame, rp-page container, diagnostics pill
         │   └─ PortalBoot → bootstrap query → PortalRouterHost (TanStack Router, memory history)
         │        root route  = portal shell: theme, sidebar store, layout, portal-level regions
         │        page routes = one per page (+ "/" and a catch-all); loader = pages/resolve
         │        LayoutHost → layout component → <Region> → WidgetSlot → widget (error boundary each)
         └─ Studio         import('portal-studio') → its own React root
```

`src/runtime/registry.js` publishes `globalThis.__REACT_PORTAL__` (modules, internals, `register`) **before** any widget can load. `react` and `react-dom` resolve to the renderer's bundled React 19 through `react-shim`.

## Properties in, actions out

- **Property adapter** (`runtime/location.js`): UI Builder hands raw properties; the host normalizes them once (decoding, `''`/`'true'` as absent, standard params packed in `q`, URL fallbacks for undelivered params, staleness of absent optional params). The normalized location lives in a per-instance store: only readers of the location re-render.
- **Outgoing navigation** dispatches `PORTAL_NAVIGATE`; the host never touches `window.history`, and never dispatches in response to a property change (loop safety). After its own navigation it re-reads the URL shortly, because optional params UI Builder drops never arrive as property changes.
- **Incoming navigation** (`syncRouter`): property changes move the router with `replace`; updates matching the current location are ignored.

## Router and data

- **TanStack Router** with memory history. The root route's loader is bootstrap (never re-runs on navigation); each page route's loader resolves the page. A portal switch builds a new router; a change in the page list or default layout rebuilds it.
- **TanStack Query**: one `QueryClient` per browser page load, at module level, so data stays warm across host remounts (`staleTime` 30 s by default; bootstrap 5 min, page 60 s; no refetch on focus; mutations never retry).
- **Instance init store** (`runtime/instance-init.js`): the page's on-load placements initialize in one batch; each widget subscribes to its own entry only. Embedded on-load instances queue into one initialize per microtask (deduped by id + options hash, chunked by 50).
- **Re-render discipline**: `Region`, `WidgetSlot` and `LayoutHost` are memoized; layout options live in a separate context; `usePortal()` getters subscribe lazily. Navigation re-renders the router outlet and readers of the location, not the shell.

## Loading builds

A component build is `{ id, js, css }`. The asset API is scripted REST, which rejects session-cookie requests without `X-UserToken`, and `import()` / `<link>` can't send headers. So the loader:

1. fetches the JS source with the token (`prefetchSource`, so imports download in parallel);
2. imports it from a **Blob URL** (`URL.createObjectURL`; the instance CSP allows `blob:` imports), then revokes the URL;
3. fetches CSS as text and injects it into the shadow root.

Modules and CSS are cached per URL for the page load; failures are evicted so a retry works. Record imports load in parallel but register **in manifest order**, each under its specifier, before the dependent module evaluates. Widget-kind imports get the embed wrapper.

## Styles in the shadow root

Every sheet is a `<style data-rp="<key>" data-rp-slot="<slot>">`, kept in slot order:

| Slot | What |
|---|---|
| `theme` | Theme stylesheet(s) |
| `framework` | The host's Tailwind + shadcn CSS (a `<style>`, never an adopted sheet: adopted sheets sort after everything) |
| `widget` | One per component build |
| `instance` | One per placement (reference-counted) |
| `tokens` | Theme token variables, last |

The renderer mirrors `<style>` elements and the host's classes (`dark`) into the **overlay layer**, so floating UI is styled and themed. Layer order across all Tailwind sheets: `theme, base, components, utilities, rp-variants`.

## Framing

The root fills the visible viewport below the host's top edge (`useAvailableHeight`, min 320px). Inside, a one-cell grid frame (`data-rp-layout-frame`) is the `rp-page` size container, so the layout stretches to full size and instance CSS container queries match the frame (and the designer's device widths). A `display: contents` wrapper carries `--rp-content-max`.

## Error isolation

Each placement and the layout get their own error boundary. A crashing widget shows a placeholder with Retry; a failing layout shows a fallback that stacks the regions. Failed on-load scripts show a banner above the widget; failed actions toast.

## Studio chunk

`src/portal-studio.js` sits at the source root on purpose: the CLI names chunk assets after the module path, and on Windows a nested path produced an unresolvable `/uxasset` URL. The chunk has its own React copy and mounts its own root; previews and the designer canvas render through the host's React via `registry.internals` (`PortalPreview`, `loadComponent`, contexts, `queryClient`…).

## Diagnostics

A pinned pill opens a diagnostics drawer. `window.__RP_DIAG__()` returns a JSON snapshot (mounts, renders, navigation, query cache, router, style and load events); `.mark(label)`, `.since(label)` and `.reset()` measure what changed. Check `globalThis.__REACT_PORTAL__` in the page to confirm which host build is served (a deploy can be served stale).

## Local development

```bash
cd packages/portal-host
pnpm run dev                                   # build:css, then snc ui-component develop (port 8081)
snc ui-component develop --port 8095           # or any port
```

- `?rpmock=1` uses in-browser mock data (`runtime/mock`), including a mock AMB bus and a mock Studio API. Without it, the dev server proxies `/api` to the instance. `?rpmock=0` / `localStorage.rpmock` persist the choice.
- `pnpm run deploy` = `build:css` (Tailwind CLI + variant layer) → `patch-servicenow-babel --verify` → `snc ui-component deploy`.

## Related

- [Runtime API overview](../runtime-api/overview.md)
- [Compiler pipeline](compiler.md)
- [Instance gotchas](instance-gotchas.md)
