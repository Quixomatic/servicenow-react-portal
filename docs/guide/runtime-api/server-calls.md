---
title: Server calls (useServer)
description: useServer and useComponent — instance data, get/update/refresh, staged and pinned inputs, errors and toasts.
section: Runtime API
order: 2
tags: [useServer, useComponent, server, input, data]
---

# Server calls (`useServer`)

`useServer()` is the widget's handle on its own instance: its options, its data, and its server script. It's the same hook as `useComponent()`, named for Service Portal authors (`c.data`, `c.server.get()`).

```tsx
import { useServer } from '@portal/runtime'

export default function Search() {
    const { data, pending, error, server } = useServer({ pinned: { tab: 'open' } })
    return (
        <div>
            <input onChange={(e) => server.setInput('q', e.target.value)} />
            <button onClick={() => server.update()}>Search</button>
            {pending ? 'Loading…' : (data?.rows as unknown[])?.length}
        </div>
    )
}
```

## Signature

```ts
useServer(options?: { pinned?: Record<string, unknown>; toastErrors?: boolean }): {
    instanceId: string
    options: Record<string, unknown>
    data: Record<string, unknown> | undefined
    pending: boolean
    error: Error | null
    server: {
        get(input?, opts?: { toast?: boolean }): Promise<data>
        update(input?, opts?): Promise<data>
        refresh(opts?): Promise<data>
        setInputs(obj | (prev) => obj): void
        setInput(key, value): void
        pinInputs(obj): void
        unpinInputs(keys?: string | string[]): void
        readonly inputs: { pinned: object; staged: object }
    }
}
```

| Field | Meaning |
|---|---|
| `instanceId` | The placement sys_id, or `<placement>~<key>…` for an embedded instance |
| `options` | Effective options (from the initialize result when present, else the placement's) |
| `data` | `on-load`: the batch initialize result, then whatever the last `update`/`refresh` returned. `on-demand`: `undefined` until an `update`/`refresh` |
| `pending` | `on-load` only: true until the page's initialize result arrives |
| `error` | The last failed `update`/`refresh`, or the initialize error |

## Actions

| Method | Server `action` | Effect on `data` |
|---|---|---|
| `server.get(input?)` | `get` | None: the promise resolves with the server's data |
| `server.update(input?)` | `update` | The server's data **replaces** local data |
| `server.refresh()` | `initialize` | Re-runs the initialize path and replaces local data |

> **Warning:** The widget's `data` is **never sent** to the server; the script always starts from an empty `data`. Put what it needs in `input`.

Every call also sends the portal slug, the current page path and `context: { params, recordId }` (the URL params; see [Portal and location](portal-and-location.md#url-parameters)), read at call time, so calling the server never subscribes your widget to navigation.

## Inputs: pinned, staged and per call

Each call's `input` is merged, later winning:

1. **pinned** from the hook (`useServer({ pinned })`): the latest render's values;
2. **pinned** imperatively (`server.pinInputs(obj)`): sent with every call until `server.unpinInputs(keys?)` (no keys = all);
3. **staged** (`server.setInputs(obj | prev => obj)`, `server.setInput(k, v)`): sent with the **next** call, then cleared;
4. the call's own `input` argument.

Pinned **function** values are read at call time, so you can pin a getter:

```ts
server.pinInputs({ filter: () => filterRef.current })
```

`server.inputs` returns `{ pinned, staged }` (resolved) for debugging.

## Errors and toasts

A failed action **toasts automatically** and the promise still rejects.

- Developers, designers and admins (`admin`, `x_312987_portal.admin`, `.developer`, `.designer`) see `<widget>: <message>` and `<code> · line N · Reference <correlation id>`.
- Everyone else sees "Something went wrong" and the reference.
- Opt out per widget with `useServer({ toastErrors: false })`, or per call with `server.get(input, { toast: false })`.

On-load failures (the page's initialize) show a **banner above the widget** instead, toasted once per placement and message.

The error object carries `status`, `code`, `details` (for `script_error`: `{ component, instance, line, messages }`) and `correlationId`.

## Server messages

Messages the server script raised (`$sp.addInfoMessage`, `gs.addErrorMessage`…) are shown as toasts coloured by type for every call, successful or not. See [Server script](../authoring/server-script.md#messages-become-toasts).

## On-load batching

The page loads every `on-load` placement's data in **one** `POST /instances/initialize` (placements nested in blocks included). Each instance succeeds or fails independently. The result is cached per page; a widget only re-renders when its own entry changes.

## In embedded instances

Inside an embedded widget the hook works unchanged; calls go to the root placement with an `embed` body. Where an embed has no server (Studio preview, under a layout), calls reject with `400 no_server`.

## Related

- [Server script](../authoring/server-script.md)
- [`$sp` reference](../server-api/sp-api.md)
- [Runtime REST API: execute](../rest-api/runtime.md#execute)
