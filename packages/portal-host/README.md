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
| `Region` | `<Region name="main" className? contents? />`: in a layout, renders that layout region; inside a block, renders the block instance's children in that drop zone (`contents`: no element of its own, so children are direct grid/flex items of the block root) |
| `useBlock` | `() => { placementId, options, regions: RegionDef[], rootProps }` (blocks only): spread `rootProps` (`data-rp-placement`, `className` = the instance's classes) on the block's root element, merging your own `className`; `regions` are the instance's resolved drop zones |
| `RegionPortal` | `<RegionPortal region="header">…</RegionPortal>`: contribute into a layout region |
| `Link` | `<Link to="orders/42" recordId? q? className?>…</Link>`: portal-relative link (`''` = home) |
| `useNavigate` | `() => (to, { recordId?, q?, portalSlug? }?) => void` |
| `useLayout` | `() => { layout, options, mainRegion, regions: RegionDef[] }`: the effective layout and its options (layout defaults → portal `settings.layoutOptions` → the page's own). Layout components also get `options` as a prop; an options change re-renders the layout, never remounts it or its widgets |
| `useNavigation` | `(key = 'primary') => { items: NavItem[], activePath: NavItem[], active, menu: { key, name } \| null, path }`. `NavItem = { id, type: 'page'\|'route'\|'url'\|'group'\|'separator', label, icon?, badge?, tooltip?, tint?, to?, href?, target?, active, open?, children, link? }`; spread `item.link` on `<Link>`. Source: bootstrap `menus[key]`, else `portal.navigation`, else the pages without parameters. One leaf is active (exact path, else the longest prefix); its groups are active and open |
| `useSidebar` | `() => { state: 'expanded'\|'collapsed', open, setOpen, toggleSidebar, isMobile, openMobile, setOpenMobile, available }`: the portal shell's sidebar state (shadcn's `useSidebar`, hoisted so a header trigger and a sidebar widget share it). `open` persists per portal (`localStorage['rp-sidebar:<slug>']`); `isMobile` = portal frame narrower than 768px; Ctrl/⌘+B toggles while a collapsible sidebar is mounted; `available` = one is mounted |
| `usePortalContainer` | `() => Element`: the overlay layer; pass it to every Base UI `.Portal` (`container={usePortalContainer()}`) |

Layouts only place slots: regions are bare and stretch their widgets; the header / sidebar / footer widgets own height, borders, background, width and collapse. Layout options are authored like widget options (`options.schema.json` + `defaults`) and switch CSS (data attributes), never the element tree.

Blocks (`kind = 'block'`) are page-structure components (section, grid, columns, …). Each instance gets compiled instance CSS (style tokens, grid layout, `x-css-var` options, tablet/mobile via `@container rp-page`), injected once per placement; the page frame is the `rp-page` size container.

### Portal, page and component

| Export | Signature |
| --- | --- |
| `usePortal` | `() => { portal, pages, theme, page, release, path, location, navigate }` |
| `usePortalLocation` | `() => { portalSlug, page, recordId, q, query, … }` (re-renders on every location change) |
| `useComponent` | `() => { instanceId, options, data, pending, error, server: { get(input), update(data?), refresh() } }` |
| `useServer` | `(options?) =>` the `useComponent()` result, named for Service Portal authors. `options`: `{ pinned?: { k: value }, toastErrors?: boolean }`. Every call sends `input` = pinned ← staged ← the call's own input (later wins); the widget's data is never sent back to the server. `server.get(input?, opts?)`, `server.update(input?, opts?)`, `server.refresh(opts?)`; `server.setInputs(obj \| prev => obj)` / `server.setInput(k, v)` stage inputs for the next call (then cleared); `server.pinInputs(obj)` sends values with every call until `server.unpinInputs(keys?)` (function values are read at call time); `server.inputs` → `{ pinned, staged }`. Failed actions toast automatically (detail by role); opt out with `useServer({ toastErrors: false })` or per call `{ toast: false }`. The promise still rejects |

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
`components:popover`, `components:separator`, `components:sheet`, `components:tooltip`,
`components:collapsible` (shadcn/ui on Base UI) and `utilities:cn`.

`components:sidebar` is shadcn's Sidebar wired to `useSidebar()` (no provider to render):
`Sidebar` (`variant` sidebar|floating|inset, `collapsible` offcanvas|icon|none, `width`), `SidebarTrigger`
(hidden while no collapsible sidebar is mounted), `SidebarRail`, `SidebarHeader|Content|Footer|Group|GroupLabel|Menu|MenuItem|MenuButton|MenuBadge|MenuSub*`.
It fills the layout's sidebar slot (in flow, not fixed) and is a Sheet in the overlay layer on mobile.
`SidebarMenuButton isActive tooltip render={<Link {...item.link} />}`: the tooltip shows on the icon rail only.
Style rail states with the value-free `group-data-rail:` variant (`data-rail` is set while icon-collapsed).

`components:icon`: a curated lucide set by name, `<Icon name="layout-dashboard" />` (kebab or Pascal
case, aliases such as `home`, `dashboard`; unknown names render a neutral circle). Exports `Icon`,
`getIcon(name)`, `icons`, `iconNames`.
