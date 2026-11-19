@x-312987/portal-host
===============================================
React Portal host component (`x-312987-portal-host`): renders a portal (mode `portal`) or
Portal Studio (mode `studio`) in Next Experience. Deploy with `pnpm run deploy`.

## Runtime API

Widgets import from `@portal/runtime` (resolved through the host registry,
`globalThis.__REACT_PORTAL__.modules['@portal/runtime']`). Every export is additive: deployed
widgets depend on all of them.

### Layout and navigation

| Export | Signature |
| --- | --- |
| `Region` | `<Region name="main" />`: renders a layout region (layouts only) |
| `RegionPortal` | `<RegionPortal region="header">…</RegionPortal>`: contribute into a layout region |
| `Link` | `<Link to="orders/42" recordId? q? className?>…</Link>`: portal-relative link (`''` = home) |
| `useNavigate` | `() => (to, { recordId?, q?, portalSlug? }?) => void` |

### Portal, page and component

| Export | Signature |
| --- | --- |
| `usePortal` | `() => { portal, pages, theme, page, release, path, location, navigate }` |
| `usePortalLocation` | `() => { portalSlug, page, recordId, q, query, … }` (re-renders on every location change) |
| `useComponent` | `() => { instanceId, options, data, pending, error, server: { get(input), update(data?), refresh() } }` |
| `useServer` | Same as `useComponent()`, named for Service Portal authors |

### Theme

| Export | Signature |
| --- | --- |
| `useTheme` | `() => { theme: 'light'\|'dark'\|'system', setTheme, resolvedTheme, systemTheme, themes }` (next-themes API; stored in `localStorage['rp-theme']`) |

### Service Portal-style utilities

| Export | Signature |
| --- | --- |
| `useUser` | `() => { sysId, userName, name, firstName, lastName, email, title, avatar, roles, timeZone, language, isImpersonating, hasRole(name), hasAnyRole(names) }` |
| `useProperty` | `(name) => { value, isLoading, error }`: portal-exposed or `x_312987_portal.public.*` properties |
| `useProperties` | `(names) => { values: { name: value \| null }, isLoading, error }` |
| `useMessage` | `(key, fallback?) => string`: translated (batched per tick, cached per language) |
| `useMessages` | `(keys) => { messages: { key: string }, isLoading, error }` |
| `usePortalUtils` | `() => { addInfoMessage(msg), addErrorMessage(msg), addTrivialMessage(msg), toast, format(template, values), getMessage(key) → Promise, scrollTo(selectorOrElement), fetchJson(url, init) → Promise, refresh() → Promise, getHeaders() }` |
| `toast` | Sonner's `toast` (`toast.success(…)`, `toast.promise(…)`, …); toasts render in the overlay layer |
| `format` | `(template, values)` or `(template, ...args)`: fills `{0}` / `{name}` placeholders |

### Table API

| Export | Signature |
| --- | --- |
| `useRecord` | `(table, sysId, { fields?, displayValue? }?) => { data, isLoading, error, refetch }` |
| `useTableQuery` | `(table, { query?, fields?, limit?, orderBy?, displayValue? }) => { data: rows, isLoading, error, refetch }`; `orderBy: 'field'` or `'-field'` |

Both call `/api/now/table/…` with the session (the platform's ACLs apply) and cache through the
page-level TanStack Query client.

### Shipped UI

`components:badge`, `components:button`, `components:card`, `components:dropdown-menu`,
`components:popover`, `components:separator` (shadcn/ui on Base UI) and `utilities:cn`.
