---
title: Embedded widgets
description: Rendering one widget inside another by importing it, $sp.getWidget, getWidget, Embed, .Raw, identity, options and trust.
section: Authoring components
order: 6
tags: [embeds, widgets, getWidget, security]
---

# Embedded widgets

A widget can render other widgets as **embedded instances**, Service Portal's `<sp-widget>` / `$sp.getWidget` equivalent. An embedded instance is a full widget instance: its own id, options, server script, on-load data, error boundary and error toasts. It just has no placement record.

## Three ways to embed

```tsx
import ServerClock from 'components:app/server-clock'
import { Embed, useEmbeddedWidget, useServer } from '@portal/runtime'

export default function Dashboard() {
    const { data } = useServer()
    const fetched = useEmbeddedWidget(ServerClock, { format: 'date' }, { key: 'fetched' })
    return (
        <>
            {/* 1. Import and render: client-declared */}
            <ServerClock embedKey="utc" options={{ title: 'UTC' }} onRefresh={() => console.log('tick')}>
                child content
            </ServerClock>

            {/* 2. A model built by THIS widget's server script: data.clock = $sp.getWidget(...) */}
            {data?.clock ? <ServerClock model={data.clock} /> : null}

            {/* 3. A model fetched from the client (spUtils.get equivalent) */}
            {fetched.model ? <Embed model={fetched.model} /> : null}

            {/* Not an embed: the raw component, running in THIS instance */}
            <ServerClock.Raw />
        </>
    )
}
```

### 1. Import and render

Importing a **widget** record (`components:<ns>/<key>`) gives you an embeddable component: only the **default export** is wrapped. Named exports, primitives, utilities and blocks are untouched.

| Prop | Meaning |
|---|---|
| `options` | Widget options (JSON). The server merges them over the child build's defaults and **filters** them against its schema. Configuration, not authority |
| `embedKey` | `[A-Za-z0-9_-]{1,64}`, stable within the parent instance. Optional for a single embed; give one per row in lists |
| `model` | An `EmbedModel` from `$sp.getWidget` / `getWidget()`: seeds the instance with no request, and keeps its signed options on later calls |
| `fallback` | `(error, retry) => ReactNode` instead of the default crash placeholder |
| anything else | Client-only React props (callbacks, `children`, refs), passed to the child and **never sent to the server** |

Repeats without a key get `key-2`, `key-3`… in mount order (with a console warning). A duplicate explicit key renders a placeholder.

### 2. `$sp.getWidget` in the parent's server script

```js
(function () {
    data.clock = $sp.getWidget('app/server-clock', { title: 'UTC', zone: 'UTC' }, { key: 'utc' })
})()
```

It runs the child's server script **now**, nested, with server-chosen options, and returns an `EmbedModel`. The options are **signed**, so options the client may not set (`"x-embed": "server"`) survive later calls. See [`$sp.getWidget`](../server-api/sp-api.md#getwidget).

### 3. `useEmbeddedWidget` / `getWidget` from the client

| Export | Signature |
|---|---|
| `useEmbeddedWidget` | `(component \| 'app/x', options?, { key?, enabled? }) => { model, pending, error, refetch }`: fetches a model on mount and when the inputs change |
| `useGetWidget` | `() => (component \| 'app/x', options?, { key? }) => Promise<EmbedModel>`, also `usePortalUtils().getWidget`. For modals and event handlers |
| `Embed` | `<Embed model={…} />`: renders the widget a model names. It must be a widget this component imports |

### `.Raw`

`<X.Raw />` is the unwrapped component: presentational, rendered inside the **parent's** instance (its `useServer()`, its options). Use it, or a named export, when you only want the UI.

## What the child receives

`{ instanceId, options, region, embedded: true, ...passThroughProps }`. Its `useComponent()` / `useServer()` work unchanged: server calls go to `POST /instances/<root placement>/execute` with an `embed` body.

Its server script sees `component.embedded = true`, `component.key`, `component.path`, `component.parentInstanceId`, and `context.embed = { root, path, keys }`.

## Identity

An embed's id is `<placement>~<key>[~<key>…]`: the root is always a placement sys_id, followed by one key per nesting level. At most **4** levels below a placement.

Client-declared on-load embeds initialize in **one batched request per render wave** (deduped by id + options, up to 50 descriptors per request). Server-built models arrive with the parent's data and need no request.

Embeds render inside `<div style="display:contents" data-rp-embed data-rp-component data-rp-embed-root data-rp-embed-depth>`, with no `data-rp-placement`: the page designer treats them as part of their placement (read-only markers on the canvas, rows in the outline, an Embeds section in the properties panel). Live embeds are listed on `globalThis.__REACT_PORTAL__.embeds` (with an `rp-embeds-change` window event).

## Options and trust

The server never trusts the client to choose what an embed may do:

| Source | Effective options |
|---|---|
| Client (`options` prop, `useEmbeddedWidget`, `getWidget`) | `{ ...childDefaults, ...filtered(options) }`. With a schema: known keys only, type-checked (`type`, `enum`, `minimum`/`maximum`, `maxLength`); `"x-embed": "server"` keys are always dropped; invalid values fall back to the default. Without a schema: any JSON value |
| Server (`$sp.getWidget`) | `{ ...childDefaults, ...options }`, unfiltered, plus a token |
| Client call carrying a valid token | The signed options exactly as signed |

Defaults and schema come from the **child's build** (`options_snapshot`). Options are at most 16 KB of JSON.

The token is bound to (root placement, embed path, options, user, expiry), lasts **12 hours**, and is HMAC-style signed with a private, runtime-generated secret. An expired or invalid token silently falls back to filtering, so a stale tab degrades gracefully. See [Embed security](../security/embeds.md).

## Authorization

The server only runs widgets the placed component's build **really imports**, checked step by step along the import chain against the sealed manifest's direct import edges. Anything else is a **404** (indistinguishable from a missing placement). Limits per request: depth 4, 50 embed descriptors per initialize, 20 `$sp.getWidget` calls per instance run.

## Where embeds don't have a server

- Studio's single-component **Preview** (no placement): server calls reject with `no_server`.
- Widgets rendered by a **layout** (the layout has no placement id).

> **Note:** **In progress:** embeds under layouts (a `layout:<component sys_id>` root authorized against the page's effective layout), lazy embeds (a `lazy` prop that defers initialize until the embed nears the viewport), and a Studio Dependencies panel.

## Related

- [Options](options.md)
- [`$sp.getWidget`](../server-api/sp-api.md#getwidget)
- [Embed security](../security/embeds.md)
