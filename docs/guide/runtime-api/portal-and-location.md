---
title: Portal and location
description: usePortal, usePortalLocation, Link, useNavigate and the standard URL params (table, sys_id, view, query, q).
section: Runtime API
order: 3
tags: [usePortal, usePortalLocation, Link, navigate, url-params]
---

# Portal and location

These hooks tell a widget which portal and page it's on, read the URL's record params, and move between pages. The platform owns the URL, so navigation always goes through `<Link>` or `useNavigate()`.

## `usePortal()`

```ts
usePortal(): {
    portal: { id, slug, name, homeRoute, settings, navigation }
    pages: { id, route, title }[]           // pages the user can open
    theme: ThemeRef | null
    release: { id, version } | null
    navigate: (to, opts?) => void
    readonly page: { id, route, title, params, contentWidth } | null
    readonly path: string                   // current portal-relative path
    readonly location: NormalizedLocation   // same as usePortalLocation()
} | null
```

`page`, `path` and `location` are **tracked getters**: your component subscribes to page or location changes only once it reads them. A header that never reads them doesn't re-render on navigation.

## `usePortalLocation()`

The normalized location, re-rendering on every change:

| Field | Meaning |
|---|---|
| `portalSlug` | Current portal |
| `page` | Portal-relative page path (`''` = home); `isHome` |
| `recordId` | The `id` URL param |
| `table`, `sysId`, `view`, `query` | The standard record params (below); `sysId` falls back to `recordId` |
| `q` | The query string (`q` param plus a direct link's `?query`) |
| `qParams` | The keys inside `q` as an object (repeated keys become arrays) |
| `params` | `qParams` plus explicit `table` / `sys_id` / `view` / `query` (explicit win) |
| `mode` | `portal` or `studio` |
| `raw` | The raw host properties (diagnostics) |

> **Note:** `query` is the encoded-query **string** (since 1.10.0). The old object of `q` keys is `qParams`.

## Navigation

### `<Link>`

```tsx
import { Link } from '@portal/runtime'
import { Button } from 'components:button'

<Link to="orders/42">Order 42</Link>
<Link to="list" table="incident" query="active=true^priority=1">P1 incidents</Link>
<Link to="form" table="incident" sysId={id} view="ess">Open</Link>
<Link to="" portalSlug="crm">CRM home</Link>
<Link to="orders" q={{ tab: 'open' }} render={<Button variant="outline" />}>Open orders</Link>
```

| Prop | Meaning |
|---|---|
| `to` (or `page`) | Portal-relative page path; `''` = home |
| `recordId` | The `id` param |
| `table`, `sysId`, `view`, `query` | Standard record params, each sent as its own field |
| `q` | Object, query string or `URLSearchParams` |
| `portalSlug` | Navigate to another portal (explicit cross-portal) |
| `replace` | Replace the current history entry instead of pushing one (state on the same page: filters, tabs, refinements) |
| `title` | Label for the new history entry ("Back to <title>"); widgets usually set it with `useEntryTitle` instead |
| `render` | Render any element as the clickable element (Base UI style), e.g. a `Button` |
| other props | Passed to the `<a>` (`className`, `onClick`; `preventDefault()` in your `onClick` cancels navigation) |

The rendered anchor has a real `href` in the UI Builder URL format (`…/site/sp/params/page-id/form/table/incident/sys-id/<id>`) and `data-portal-page`. A plain click dispatches `PORTAL_NAVIGATE`; ctrl / cmd / shift / middle click and `target="_blank"` are left to the browser, so they open a new tab or window.

### `useNavigate()`

```ts
const navigate = useNavigate()
navigate('orders/42')
navigate('form', { table: 'incident', sysId, view: 'ess' })
navigate({ to: 'orders', q: { tab: 'open' } })
navigate('', { portalSlug: 'sp' })
```

`navigate(to, { recordId?, q?, table?, sysId?, view?, query?, portalSlug?, replace?, title?, skipGuard? })`. Also available as `usePortal().navigate`. It returns a `Promise<boolean>`: `false` when a navigation guard (an unsaved form) cancelled it. `replace` and `title` are as on `<Link>`; `skipGuard` skips the guards when your widget has already asked. See [History and Back](history-and-back.md).

### How navigation works

The platform owns the URL. `navigate()` dispatches the host's `PORTAL_NAVIGATE` action; the page's **Link to destination** handler maps the payload onto the `site` page's URL params; UI Builder updates the URL and hands the new values back as host properties; the host normalizes them and moves its router. The host never writes `window.history` (the shell pushes, or replaces when the payload's `replace` is set), and only dispatches for user-initiated navigation, never in response to a property change. Back is the one read: `history.go(-n)` to the target entry ([History and Back](history-and-back.md)).

## URL parameters

The `site` page has optional params `table`, `sys_id`, `view`, `query` (an encoded query) and `q` (a query string), next to `page-id` and `id`. They reach the host as the properties `table`, `sysId`, `view`, `query`, `q` and `recordId`.

- Any of `table`, `sys_id`, `view`, `query` can also be **packed inside `q`** (`…/params/q/table%3Dincident%26sys_id%3D…`). An explicit param wins over the same key inside `q`. Older links that pack them into `q` keep working.
- `<Link>` / `navigate()` send `table`, `sysId`, `view`, `query` as separate payload fields.
- Every server call sends `context: { params, recordId }`. The server validates it and exposes it as `context.client` / `context.query`; `$sp.getParameter(name)` looks in `input`, then route params, then URL params. `$sp.getRecord()` with no arguments therefore reads `table` + `sys_id` from the URL.

URLs look like:

```text
…/site/sp/params/page-id/form/table/incident/sys-id/<sys_id>/q/<q>
```

UI Builder doesn't deliver an absent optional param, and a binding on `sys_id` stays empty because the URL says `sys-id`. The host reads the URL's `/params/` pairs itself on every property change, on `popstate` and after its own navigations: a value the URL has but the property lacks is used, and an optional param the URL lacks is treated as `''` unless its property changed in the last 1.5 s.

### Precedence in widgets

Primitives such as the record form and the list view read their target in this order: explicit widget **options**, then **route params**, then **URL params**.

## Related

- [UI Builder setup](../getting-started/ui-builder-setup.md)
- [History and Back](history-and-back.md)
- [Pages and routes](../concepts/pages-and-routes.md)
- [`$sp.getParameter`](../server-api/sp-api.md#parameters)
