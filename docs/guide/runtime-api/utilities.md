---
title: User, properties and utilities
description: useUser, useProperty(ies), useMessage(s), usePortalUtils (the spUtils equivalent), toast and format.
section: Runtime API
order: 6
tags: [useUser, useProperty, useMessage, usePortalUtils, toast, format, spUtils]
---

# User, properties and utilities

Service Portal-style helpers. Data goes through the page-level query cache, so widgets share it.

## `useUser()`

```ts
useUser(): {
    sysId, userName, name, firstName, lastName, email, title,
    avatar: string | null,             // '/<attachment>.iix' or null
    roles: string[],
    timeZone, language,
    isImpersonating: boolean,
    impersonatedBy?: string | null,    // impersonator's user name (needs the global helper app)
    signedIn: boolean,
    hasRole(name: string): boolean,
    hasAnyRole(names: string[]): boolean,
}
```

The user comes from bootstrap. `hasRole` / `hasAnyRole` are true for `admin`, like `gs.hasRole`.

> **Warning:** Client-side role checks are for UI only (showing or hiding a button). Enforce authority on the server (`$sp.hasRole`, `GlideRecordSecure`, ACLs).

## `useProperty(name)` / `useProperties(names)`

```ts
useProperty(name: string): { value: string | null; isLoading: boolean; error: unknown }
useProperties(names: string[]): { values: Record<string, string | null>; isLoading: boolean; error: unknown }
```

Reads system properties through `GET /properties`. Only properties the portal exposes are returned: names under `x_312987_portal.public.`, or listed in the portal's `settings.exposedProperties`. Anything else comes back `null`. Cached per portal for 5 minutes.

```tsx
const { value: welcome } = useProperty('x_312987_portal.public.welcome')
```

## `useMessage(key, fallback?)` / `useMessages(keys)`

```ts
useMessage(key: string, fallback?: string): string
useMessages(keys: string[]): { messages: Record<string, string>; isLoading: boolean; error: unknown }
```

Translated UI messages (`gs.getMessage` in the user's language) via `POST /messages`. Every key requested in the same tick goes out in **one** request; results are cached per language for the page's life. While loading, `useMessage` returns the fallback, then the key.

## `usePortalUtils()`

The `spUtils` equivalent:

| Member | Signature |
|---|---|
| `addInfoMessage(msg, opts?)` | Info toast |
| `addErrorMessage(msg, opts?)` | Error toast |
| `addTrivialMessage(msg, opts?)` | Neutral toast, 2.5 s |
| `toast` | Sonner's `toast` |
| `format(template, values)` | See below |
| `getMessage(key)` | `Promise<string>`, batched like `useMessage` |
| `scrollTo(selectorOrElement, options?)` | Smooth-scroll an element (or the first match in the portal's shadow root) into view |
| `fetchJson(url, init?)` | Same-origin JSON fetch with the session and `X-UserToken`; throws an `ApiError` with the ServiceNow message on non-2xx |
| `refresh()` | `Promise`: refetch the current page manifest and all on-load data (the page stays on screen until the new data is in) |
| `getHeaders()` | `{ Accept, 'X-UserToken', 'Content-Type' }` for your own `fetch` |
| `getWidget(component, options?, { key? })` | `Promise<EmbedModel>`. See [Embedded widgets](../authoring/embedded-widgets.md) |

`fetchJson` refuses cross-origin URLs. A non-string body (other than `FormData`) is JSON-encoded.

## `toast`

Sonner's `toast`: `toast('…')`, `toast.success`, `toast.error`, `toast.warning`, `toast.info`, `toast.promise(…)`. Toasts render bottom-centre in the overlay layer, tinted by type from the theme tokens in light and dark mode.

## `format(template, …values)`

```ts
format('Hello {0}', ['Ada'])            // 'Hello Ada'
format('Hello {name}', { name: 'Ada' }) // 'Hello Ada'
format('{0} of {1}', 3, 10)             // '3 of 10'
```

Placeholders without a value are left as they are.

## Related

- [Table data](table-data.md)
- [Data access security](../security/data-access.md)
