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
- **Outgoing navigation** dispatches `PORTAL_NAVIGATE`; the host never writes `window.history`, except through the shell: the `site` page's script handler maps the payload's `replace` to the shell's `redirect` (a `replaceState`), and everything else is a shell `pushState`. The host never dispatches in response to a property change (loop safety). After its own navigation it re-reads the URL shortly, because optional params UI Builder drops never arrive as property changes.
- **Navigation history** (`runtime/nav-history.js`, pure part `nav-history-core.js`): the host *observes* the browser's history. Every settled URL is applied to a per-tab store keyed by the shell's `history.state.position` (sessionStorage `x_312987_portal.nav.v1`; push / replace / pop told apart by position). Back (`useBackTarget`, `app/back-button`) is a read plus `history.go(-n)`, never a write. Studio's page designer uses a memory-mode store. See [History and Back](../runtime-api/history-and-back.md).
- **Incoming navigation** (`syncRouter`): property changes move the router with `replace`; updates matching the current location are ignored.

## Router and data

- **TanStack Router** with memory history. The root route's loader is bootstrap (never re-runs on navigation); each page route's loader resolves the page. A portal switch builds a new router; a change in the page list or default layout rebuilds it.
- **TanStack Query**: one `QueryClient` per browser page load, at module level, so data stays warm across host remounts (`staleTime` 30 s by default; bootstrap 5 min, page 60 s; no refetch on focus; mutations never retry).
- **Instance init store** (`runtime/instance-init.js`): the page's on-load placements initialize in one batch; each widget subscribes to its own entry only. Embedded on-load instances queue into one initialize per microtask (deduped by id + options hash, chunked by 50). [Lazy embeds](../authoring/embedded-widgets.md#lazy-embeds) join the queue when they near the viewport (`runtime/in-view.js`: one shared `IntersectionObserver` per `rootMargin`), so embeds that scroll in together share one request.
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
| `framework` | The host's Tailwind + shadcn CSS (a `<style>`, never an adopted sheet: adopted sheets sort after everything). Always injected, so the host never loses its styles |
| `fallback` | The own Tailwind sheet (`utilities.css`) of each build the portal sheet doesn't cover |
| `utilities` | The **portal utilities sheet**: one Tailwind sheet for every component of the portal plus the host's classes, in `@layer rp-portal` |
| `widget` | Author CSS (`styles.css`), one per component build |
| `instance` | One per placement (reference-counted) |
| `tokens` | Theme token variables, last |

The renderer mirrors `<style>` elements and the host's classes (`dark`) into the **overlay layer**, so floating UI is styled and themed. Layer order across all Tailwind sheets: `theme, base, components, utilities, rp-variants, rp-portal, rp-instance, rp-instance-variants` (placement classes in the last two).

### Portal utilities sheet

The bootstrap carries `utilities: { css, hash, covers }` (or null). The root route loader downloads the sheet alongside the theme, and `PortalShell` injects it (`usePortalUtilities`, `runtime/portal-utilities.js`).

**The rule:** a build's own `utilities.css` is skipped exactly when its `utilitiesKey` is in `covers` **and** the portal sheet is loaded into the same shadow root. The key is the first 16 hex characters of the content hash of the build's utilities sheet, so the rule is correct by construction: identical utilities means its classes are already in the union.

- **Covered builds** inject only their author CSS (`widget` slot). Their utilities sheet isn't even downloaded: `loadComponent(ref, covers)` / `prefetchBuilds(refs, covers)` skip it.
- **Fallback.** Everything else injects its own utilities sheet into the `fallback` slot, before the portal sheet. That covers a build compiled after the last reprocess (a Studio save until its reprocess finishes), a model outside the manifest, the designer on a live (unprocessed) manifest, and a pre-v6 build with no `utilitiesKey`. Because fallback sheets sort before the portal sheet, the portal sheet keeps authority over the rest of the page; in that window a fallback build's new class can lose to a conflicting class in the portal sheet.
- **No portal.** Studio preview, docs and view rules call `loadComponent(ref)` without covers and inject the complete `cssText` as before.
- **Failure.** If the sheet is missing or fails to load, covers are null and every build falls back. The framework CSS is untouched in every case.

## Framing

The root fills the visible viewport below the host's top edge (`useAvailableHeight`, min 320px). Inside, a one-cell grid frame (`data-rp-layout-frame`) is the `rp-page` size container, so the layout stretches to full size and instance CSS container queries match the frame (and the designer's device widths). A `display: contents` wrapper carries `--rp-content-max`.

## Error isolation

Each placement and the layout get their own error boundary. A crashing widget shows a placeholder with Retry; a failing layout shows a fallback that stacks the regions. Failed on-load scripts show a banner above the widget; failed actions toast.

## Studio chunk

`src/portal-studio.js` sits at the source root on purpose: the CLI names chunk assets after the module path, and on Windows a nested path produced an unresolvable `/uxasset` URL. The chunk has its own React copy and mounts its own root; previews and the designer canvas render through the host's React via `registry.internals` (`PortalPreview`, `loadComponent`, contexts, `queryClient`…).

## Rich-text chunk

`src/portal-rte.js` is a second lazy chunk (`portal-rte.jsdbx`, about 130 KB gzipped), imported by `components:rich-text-editor` the first time an editor mounts. It holds only TipTap / ProseMirror (no React) and returns an `Editor` the main bundle's React toolbar drives. TipTap is pre-bundled into `src/vendor/tiptap.js` by `pnpm run vendor:rte` (run it after changing the `@tiptap/*` devDependencies), because TipTap's dist files carry `@jsxImportSource` pragmas that the CLI's classic-runtime babel rejects. The vendored file is committed. TipTap's own CSS isn't injected (it would land in `document.head`); the editor styles are in the host stylesheet (`.rp-prose`, `.rp-rte-content`).

## Diagnostics

A pinned pill opens a diagnostics drawer. `window.__RP_DIAG__()` returns a JSON snapshot (mounts, renders, navigation, query cache, router, style and load events); `.mark(label)`, `.since(label)` and `.reset()` measure what changed. Check `globalThis.__REACT_PORTAL__` in the page to confirm which host build is served (a deploy can be served stale).

## Local development

```bash
cd packages/portal-host
pnpm run dev                                   # build:css, then snc ui-component develop (port 8081)
snc ui-component develop --port 8095           # or any port
```

- `?rpmock=1` uses in-browser mock data (`runtime/mock`), including a mock AMB bus and a mock Studio API. Without it, the dev server proxies `/api` to the instance. `?rpmock=0` / `localStorage.rpmock` persist the choice.
- `pnpm run deploy` = `build:css` (Tailwind CLI + variant layer + `host-candidates.mjs`, which regenerates `src/server/compiler/host-candidates.ts` and fails on any host class the server would compile differently) → `patch-servicenow-babel --verify` → `snc ui-component deploy`.

## Related

- [Runtime API overview](../runtime-api/overview.md)
- [Compiler pipeline](compiler.md)
- [Instance gotchas](instance-gotchas.md)
