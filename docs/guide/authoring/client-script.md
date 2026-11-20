---
title: Client script (main.tsx)
description: The component's React code, what it can import, the props it receives, and extra source files.
section: Authoring components
order: 1
tags: [authoring, tsx, imports, files]
---

# Client script (`main.tsx`)

A component's client code is its `client_script` field, shown in Studio as the virtual file **`main.tsx`**. It's compiled as TypeScript + JSX regardless of what you write (plain JSX is fine).

## The contract

- **Default export = the component.** A function component (or a `React.memo` / `forwardRef` object). A module without a default-exported component fails to load (`the module has no default-exported component`).
- **Named exports** are available to other components that import this record (`import { useThing } from 'components:app/my-primitive'`).
- An empty `main.tsx` is a compile error: `The client script is empty; it must export default a React component.` (Utilities still need the file; their default export can be anything.)

```tsx
import { useState } from 'react'
import { useServer, useUser, Link } from '@portal/runtime'
import { Button } from 'components:button'

export default function Greeting({ options = {} }: { options?: { greeting?: string } }) {
    const user = useUser()
    const [count, setCount] = useState(0)
    return (
        <div className="flex items-center gap-3">
            <span>{options.greeting || 'Hello'}, {user.firstName}</span>
            <Button size="sm" onClick={() => setCount(count + 1)}>Clicked {count}</Button>
            <Link to="orders">Orders</Link>
        </div>
    )
}
```

## Props by kind

| Kind | Props |
|---|---|
| widget | `instanceId` (placement sys_id, or `<placement>~<key>` when embedded), `options` (effective options), `region` |
| layout | `regions` (`RegionDef[]`), `options` (effective layout options) |
| block | none: use `useBlock()` |
| primitive, utility | whatever the importer passes |

## What you can import

| Specifier | What |
|---|---|
| `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime` | The host's React 19 (never the platform's React 16) |
| `@portal/runtime` | The [runtime API](../runtime-api/overview.md) |
| `components:<name>`, `utilities:<name>` | The [host kit](../runtime-api/host-kit.md) |
| `components:<ns>/<key>`, `utilities:<ns>/<key>` | Other component records ([record imports](../concepts/record-imports.md)) |
| `./path` | Extra files of this component |

npm packages can't be imported. The data libraries the platform needs are in the host kit: TanStack Query (`utilities:react-query`), Table (`utilities:react-table`) and Virtual (`utilities:react-virtual`), dnd-kit drag and drop (`utilities:dnd-kit`), Lucide icons (`components:icon`) and `cn` (`utilities:cn`).

> **Note:** JSX compiles to the classic runtime (`React.createElement`). The compiler injects `React` into every module, so you don't need `import React from 'react'`.

## Extra files

Components can have more source files: `source_file` rows owned by the component, shown in Studio's explorer as a folder tree. Import them with relative paths:

```tsx
import { IncidentRow } from './parts/IncidentRow'
import './parts/row.css'
import labels from './labels.json'
```

| Extension | Target | Handling |
|---|---|---|
| `.tsx`, `.ts`, `.jsx`, `.js`, `.mjs`, `.cjs` | `client` | Transformed and bundled into `index.js` |
| `.json` | `client` | Bundled as a module (`module.exports = …`) |
| `.css` | `style` | Imported from code, it's appended to `index.css` after `styles.css`, in import order |
| `.scss`, `.sass` | `style` | Stored, but there's no Sass compiler: don't import them |
| `*.server.js`, `*.server.ts` | `server` | Never compiled into the client build |
| anything else | `asset` | Stored, not compiled |

Resolution tries the exact path, then the code and style extensions, then `<dir>/index.<ext>`. Paths are relative to the importing file, can't escape the project (`..` past the root is an error), and segments use `[A-Za-z0-9._@+-]`.

> **Warning:** These paths are reserved for record fields and can't be extra files: `main.tsx`, `styles.css`, `server.js`, `options.schema.json`, `options.defaults.json`, `regions.json`, `theme.css`, `tokens.json`.

Only files reachable from `main.tsx` are compiled. Unreachable files don't affect the build.

## Limits

| Limit | Value | Property |
|---|---|---|
| One source file | 1 MiB | `x_312987_portal.source.max_file_bytes` |
| Files in one save | 200 | `x_312987_portal.max_files_per_owner` |
| One build's assets | 5 MiB | `x_312987_portal.build.max_bytes` |

## Errors

Compile errors carry file, line and column (from Sucrase), plus unresolved imports. Runtime errors are caught by the widget's **error boundary**: the widget shows a "Widget … failed" placeholder with a Retry button, and the rest of the page keeps working.

## Related

- [Styling](styling.md)
- [Server script](server-script.md)
- [Compiler pipeline](../internals/compiler.md)
