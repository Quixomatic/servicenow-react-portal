---
title: Your first widget
description: Create a widget in Portal Studio, give it a server script and options, and place it on a page.
section: Getting started
order: 3
tags: [tutorial, studio, widget]
---

# Your first widget

This walk-through builds a small widget that lists the current user's open incidents, with a title option and a "refresh" button. It uses Portal Studio, but every step maps onto plain records you can also edit with the platform's forms.

**You need:** the `x_312987_portal.developer` role (to author code) and `x_312987_portal.designer` (to place it), or `x_312987_portal.admin`. Studio only saves while the platform's application picker is on **React Portal**. See [Studio overview](../studio/overview.md#scope-banner).

## 1. Create the component

Open Studio (`/x/312987/portal/studio`) and choose **New component** in the title bar. Give it a name (`My Incidents`) and the kind **Widget**.

The server creates the record with a starter `main.tsx` and compiles it straight away (`POST /rp_studio/components`). The name becomes the key (`my-incidents`) and the unique id is `app/my-incidents` (namespace `app` by default).

## 2. Write the client (`main.tsx`)

Replace the starter with:

```tsx
import { useServer } from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardContent } from 'components:card'
import { Button } from 'components:button'

type Options = { title?: string }

export default function MyIncidents({ options = {} }: { options?: Options }) {
    const { data, pending, server } = useServer()
    const rows = (data?.incidents as { sys_id: string; number: string; short_description: string }[]) || []
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{options.title || 'My incidents'}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => server.refresh()}>
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
                {pending ? <div className="text-muted-foreground">Loading…</div> : null}
                {rows.map((r) => (
                    <div key={r.sys_id} className="flex gap-3">
                        <span className="font-mono text-muted-foreground">{r.number}</span>
                        <span>{r.short_description}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
```

- `react`, `@portal/runtime` and the host kit (`components:card`, `components:button`…) come from the host registry. They're never bundled into your build.
- Tailwind classes such as `text-muted-foreground` compile on the server against the portal's theme tokens.

## 3. Write the server script (`server.js`)

An empty `server.js` opens as Service Portal's IIFE template. Fill it in:

```js
(function () {
    data.incidents = []
    var gr = new GlideRecordSecure('incident')
    gr.addActiveQuery()
    gr.addQuery('caller_id', gs.getUserID())
    gr.orderByDesc('sys_created_on')
    gr.setLimit(options.limit || 10)
    gr.query()
    while (gr.next()) {
        data.incidents.push({
            sys_id: gr.getUniqueValue(),
            number: gr.getValue('number'),
            short_description: gr.getValue('short_description'),
        })
    }
})()
```

Then set **Server mode** to **On load** in the Properties panel, so the page's batch initialize runs the script before the widget renders. `on-demand` runs it only when the client calls `server.get()` / `update()` / `refresh()`. `none` has no server script at all.

> **Note:** `GlideRecordSecure` applies the platform's ACLs for the current user. Use it (or `$sp.getRecord`) for anything a user shouldn't be able to read. See [Server scripts](../authoring/server-script.md).

## 4. Add an option

Open `options.schema.json` and declare the option, then give it a default in `options.defaults.json`:

```json
{
    "type": "object",
    "properties": {
        "title": { "type": "string", "title": "Title" },
        "limit": { "type": "integer", "title": "Rows", "minimum": 1, "maximum": 50 }
    }
}
```

```json
{ "limit": 10 }
```

The page designer builds its options form from the schema. See [Options](../authoring/options.md).

## 5. Save

**Ctrl+S** (⌘S) saves every dirty file in one revision-checked request and compiles synchronously. The Problems panel shows errors with file, line and column. Studio also dry-runs the compiler while you type (`POST /components/{id}/check`), so most errors show up before you save.

## 6. Place it on a page

Switch to the **Pages** activity, pick a portal and a page, find **My Incidents** in the palette and drag it into a region (or press **+**). Select it to edit its title in the Properties panel. Every designer write reprocesses the portal's release once, so the live portal shows it immediately.

## What happened behind the scenes

1. Save wrote `client_script`, `script` and the options fields on the component record and advanced its `source_revision`.
2. The compiler produced the build's `index.js` and `index.css` and copied the server script into the build.
3. The release of every portal that uses the component was reprocessed.
4. On page load the host fetched the build through `/api/x_312987_portal/rp/assets/{build}/index.js/raw?v=<hash>`, imported it from a Blob URL, and ran the on-load script in one `POST /instances/initialize`.

## Next

- [Client script](../authoring/client-script.md) and [Styling](../authoring/styling.md)
- [Server calls (`useServer`)](../runtime-api/server-calls.md)
- [`$sp` reference](../server-api/sp-api.md)
