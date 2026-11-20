---
title: Record imports
description: Importing other component records with components: and utilities:, host modules, and the host-kit versus record-primitive layering rule.
section: Concepts
order: 7
tags: [imports, primitives, host-kit, dependencies]
---

# Record imports

A component's code can import exactly three kinds of things:

| Specifier | Resolves to |
|---|---|
| `./relative/path` | An extra file of the same component (bundled into its build) |
| `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `@portal/runtime` | Host built-ins from the registry |
| `components:<name>` / `utilities:<name>` | Either a **host-kit** module (`components:button`, `utilities:react-query`) or another **component record** (`components:app/field`, `utilities:app/graphql`) |

Anything else (`lodash`, `@tanstack/react-query`, an npm package) is a compile error: `Unknown import "…"`.

## Host kit versus record imports

The two look alike, but they're resolved differently:

- **Host kit**: no slash after the prefix (`components:card`, `components:tabs`, `utilities:cn`, `utilities:react-table`). They ship inside the host bundle and are always available. See [Host kit](../runtime-api/host-kit.md).
- **Record imports**: `<namespace>/<key>` after the prefix, matching `^(components|utilities):[a-z][a-z0-9-]{0,39}/[a-z][a-z0-9-]{0,79}$`. They're other rows of the component table.

| Prefix | May reach |
|---|---|
| `components:` | `primitive`, `widget`, `block` records |
| `utilities:` | `utility` records |

```tsx
import { useServer } from '@portal/runtime'
import { Button } from 'components:button'                    // host kit
import { useField, FieldShell } from 'components:app/field'   // primitive record
import { useTableMeta } from 'utilities:app/graphql'          // utility record
import ServerClock from 'components:app/server-clock'         // widget record → embedded instance
```

## How it works

At compile time the build service resolves each record import and records it as a `build_dep` edge (`kind = component`) to the imported component's build. The compile **fails** with a clear message when:

- no component has that unique id;
- the component imports itself;
- the target is the wrong kind for the prefix (e.g. `utilities:` pointing at a primitive);
- the target hasn't compiled successfully yet.

The manifest lists each component's imports **transitively, dependencies first** (`ComponentRef.imports`). Before evaluating a component, the host loads every import in parallel, registers each one's module under its specifier in `globalThis.__REACT_PORTAL__.modules`, evaluating in manifest order, and injects their CSS before the component's own. Builds are cached per page load and shared between every component that imports them.

Compiled modules expose every named export (`__rpExports`) as well as the default, so `import { useField } from 'components:app/field'` works.

## Rebuilds and reprocessing

- Recompiling a component flags every build that imports it `needs_rebuild`. The importers' current output keeps running; the flag is a prompt to recompile.
- A new build has a new asset URL, so every portal that uses the component **directly or through imports** is reprocessed and serves the new URL.

Studio's **Dependencies** panel shows a component's direct imports and its importers (`GET /rp_studio/components/{id}/dependencies`). See [Code editor](../studio/code-editor.md).

## Widget imports are embeds

Importing a **widget** record is special: its default export is wrapped so each render is its own [embedded instance](../authoring/embedded-widgets.md) with its own options, server script and on-load data. Use `<X.Raw />` or a named export for presentational reuse. The compiler warns when you import a widget that has a server script. Layouts can import widgets too: those embeds are rooted at `layout:<sys_id>` and authorized against the page's effective layout. See [Layouts](layouts.md#layout-server-scripts).

## The layering rule

UI is built in two layers, always:

1. **Generic building blocks** (tabs, dialog, collapsible, dropdown menu, popover, calendar…) live in the **host kit** as `components:<name>`. They're shadcn/ui on Base UI and have **no domain logic**.
2. **Every domain-aware piece** built on top of them is its **own record primitive** (`components:app/<key>`, `kind = primitive`). Examples: `app/reference-field` on `app/combobox`, `app/form-tabs` on `components:tabs`, `app/form-section` on `components:collapsible`.

Consumers such as `app/form` import the record primitive (`components:app/form-tabs`), never the host-kit piece directly. That keeps domain behaviour editable as records (versioned, in update sets, recompiled on save) while the generic UI ships once with the host.

> **Warning:** Our UI state (form collapse state, stacked/tabs mode, list personalization) is stored only under our own preference namespace, `x_312987_portal.*`. Primitives never read or write the platform's own preferences (`tabbed.forms`, `workspace.layout.*`, `<table>.view`).

## Related

- [Component kinds](component-kinds.md)
- [Builds, releases and manifests](builds-and-releases.md)
- [Embedded widgets](../authoring/embedded-widgets.md)
- [Compiler pipeline](../internals/compiler.md)
