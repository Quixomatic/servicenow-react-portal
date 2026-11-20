---
title: Runtime API overview
description: Every export of @portal/runtime at a glance, with links to the detailed pages.
section: Runtime API
order: 1
tags: [runtime, api, reference]
---

# Runtime API overview

Widgets, layouts, blocks, primitives and utilities import the runtime from **`@portal/runtime`**. It's resolved through the host registry (`globalThis.__REACT_PORTAL__.modules['@portal/runtime']`), never bundled into a build.

> **Note:** Every export is **additive**: deployed builds depend on every name here, so exports are never removed or renamed incompatibly. The runtime exports `RUNTIME_ABI` (`'0.2.0'`) for feature detection.

## Exports

| Export | Kind | Page |
|---|---|---|
| `useServer`, `useComponent` | hooks | [Server calls](server-calls.md) |
| `usePortal`, `usePortalLocation` | hooks | [Portal and location](portal-and-location.md) |
| `Link`, `useNavigate` | component, hook | [Portal and location](portal-and-location.md#navigation) |
| `Region`, `RegionPortal`, `useBlock`, `useLayout` | components, hooks | [Layout and navigation](layout-and-navigation.md) |
| `useNavigation`, `useSidebar`, `usePortalContainer` | hooks | [Layout and navigation](layout-and-navigation.md) |
| `useTheme` | hook | [Theme](theme.md) |
| `useUser`, `useProperty`, `useProperties`, `useMessage`, `useMessages`, `usePortalUtils`, `toast`, `format` | hooks, functions | [User, properties and utilities](utilities.md) |
| `useRecord`, `useTableQuery` | hooks | [Table data](table-data.md) |
| `useRecordWatch`, `useAmbChannel`, `useAmbStatus` | hooks | [Live updates](live-updates.md) |
| `Embed`, `useEmbeddedWidget`, `useGetWidget` | component, hooks | [Embedded widgets](../authoring/embedded-widgets.md) |
| `useInViewOnce` | hook | [Embedded widgets: lazy embeds](../authoring/embedded-widgets.md#lazy-embeds) |
| `RUNTIME_ABI`, `RUNTIME_EXPORTS` | constants | |

## Beyond `@portal/runtime`

| Module | What | Page |
|---|---|---|
| `components:button`, `components:card`, `components:dialog`… | shadcn/ui on Base UI | [Host kit](host-kit.md) |
| `components:icon` | Every Lucide icon by name | [Host kit](host-kit.md#icons) |
| `utilities:react-query`, `utilities:react-table`, `utilities:react-virtual`, `utilities:dnd-kit`, `utilities:cn` | Data libraries and `cn` | [Host kit](host-kit.md#data-libraries) |
| `utilities:app/graphql`, `components:app/field`, `components:app/form`… | Record primitives and utilities (seed records) | [Primitives overview](../primitives/overview.md) |

## Conventions

- **Hooks only work inside a portal host.** Outside one (Studio's single-component preview stubs the contexts), they return inert values: for example `usePortal()` returns `null` and `useSidebar()` an inert expanded state.
- **Re-render scope is narrow.** `usePortal()` subscribes to page or location changes only once you read `page`, `path` or `location`. Portal-level widgets that don't read them never re-render on navigation. `usePortalLocation()` re-renders on every location change.
- **Data is cached page-wide.** Table, property, message and GraphQL hooks share one TanStack Query client per page, so two widgets asking for the same thing make one request.
- **Server errors toast automatically** for server calls. See [Server calls](server-calls.md#errors-and-toasts).

## Related

- [Client script](../authoring/client-script.md)
- [Host architecture](../internals/host-architecture.md)
