---
title: REST conventions
description: Base paths, authentication with X-UserToken, the response envelope, error bodies and codes, correlation ids.
section: REST APIs
order: 1
tags: [rest, api, errors, auth]
---

# REST conventions

React Portal has two scripted REST APIs in the `x_312987_portal` scope:

| API | Base path | Who |
|---|---|---|
| Runtime | `/api/x_312987_portal/rp` | Any authenticated user; each handler checks portal and page access. See [Runtime REST API](runtime.md) |
| Studio | `/api/x_312987_portal/rp_studio` | React Portal studio roles (developer, designer, publisher; admin inherits). See [Studio REST API](studio.md) |

Both are version 1 (the default), so there's no version segment.

## Authentication

Requests use the browser session cookie **plus** the `X-UserToken` header (`window.g_ck`). Scripted REST rejects session-cookie requests without it (`401`).

```js
await fetch('/api/x_312987_portal/rp/pages/resolve', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-UserToken': window.g_ck },
    body: JSON.stringify({ portal: 'sp', page: 'orders/42' }),
})
```

Because `import()` and `<link>` can't send headers, the host **fetches** build assets with the token and imports JS from Blob URLs. See [Host architecture](../internals/host-architecture.md#loading-builds).

> **Note:** A browser tab loaded before a re-login keeps a stale `g_ck` and gets `401`. Reload the tab.

## Envelope

Every JSON response is an envelope, which the platform wraps as `{ "result": … }`:

```json
{
    "result": {
        "data": { },
        "options": { },
        "meta": { "correlationId": "…", "durationMs": 12, "release": { "id": "…", "version": 7 }, "build": "…", "messages": [] }
    }
}
```

| Field | Meaning |
|---|---|
| `data` | The payload |
| `options` | Execute only: the instance's effective options |
| `meta.correlationId` | From the `X-Correlation-Id` request header (≤ 64 characters), else generated. Also in the execution log |
| `meta.durationMs` | Server time |
| `meta.release` | The release served (`null` = live-assembled) |
| `meta.build` | Execute: the build whose script ran |
| `meta.messages` | Execute: messages the server script raised (`{ type, message }`) |
| `meta.embed` | Execute with `embed`: `{ id, token, dropped? }` |

Responses carry `Cache-Control: no-store`, except assets (immutable).

## Errors

A failure returns the matching HTTP status and:

```json
{ "result": { "error": { "status": 404, "code": "page_not_found", "message": "No page matches \"orders/99x\"", "details": {} }, "meta": { "correlationId": "…", "durationMs": 3 } } }
```

Unexpected exceptions become `500 internal_error` with a generic message; the real error goes to the system log with the correlation id. Messages are sanitized (no stack traces, no script locations, ≤ 500 characters).

### Codes

| Status | Code | When |
|---|---|---|
| 400 | `bad_request` | Missing or malformed parameter |
| 400 | `invalid` | A business rule rejected a Studio write (its message is passed through) |
| 400 | `embed_too_deep`, `embed_options_invalid`, `embed_budget` | Embed limits (depth 4, options ≤ 16 KB, 50 descriptors) |
| 401 | `unauthenticated` | Not logged in |
| 403 | `forbidden` | Missing studio capability (`Requires React Portal <author\|design\|publish> access`) |
| 404 | `portal_not_found` | Unknown portal, or the user isn't in its audience |
| 404 | `page_not_found` | No page matches the path |
| 404 | `not_found` | Unknown record, inaccessible page, missing or unauthorized instance (embeds that aren't imported answer this too) |
| 409 | `conflict` | Revision mismatch on save (`details: { expectedRevision, currentRevision }`), stale compile completion |
| 409 | `no_build` | The component has no usable build |
| 409 | `wrong_scope` | Studio write while the application picker isn't on React Portal (`details: { currentApp, app }`) |
| 409 | `has_children` | Deleting a block or menu group with children without `?mode=lift\|cascade` |
| 500 | `script_error` | A server script threw (`details: { component, instance, line, messages }`) |
| 500 | `internal_error` | Anything unexpected |

## The `/api` file-extension rule

The platform serves its own HTML 404 for `/api/...` URLs whose **last** segment looks like a file (`.js`, `.css`, `.txt`), before scripted REST runs. That's why assets are served at `/assets/{build}/{file}/raw`, with the file name followed by a fixed `raw` segment.

## Related

- [Runtime REST API](runtime.md)
- [Studio REST API](studio.md)
- [Contracts](../reference/contracts.md)
