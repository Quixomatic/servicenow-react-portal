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
| `Link` | `<Link to="orders/42" recordId? q? table? sysId? view? query? className?>…</Link>`: portal-relative link (`''` = home) |
| `useNavigate` | `() => (to, { recordId?, q?, table?, sysId?, view?, query?, portalSlug? }?) => void` |
| `useLayout` | `() => { layout, options, mainRegion, regions: RegionDef[] }`: the effective layout and its options (layout defaults → portal `settings.layoutOptions` → the page's own). Layout components also get `options` as a prop; an options change re-renders the layout, never remounts it or its widgets |
| `useNavigation` | `(key = 'primary') => { items: NavItem[], activePath: NavItem[], active, menu: { key, name } \| null, path, source: 'menu'\|'navigation'\|'pages'\|'none' }`. `NavItem = { id, type: 'page'\|'route'\|'url'\|'group'\|'separator', label, icon?, badge?, tooltip?, tint?, to?, href?, target?, match?, portalSlug?, active, open?, children, link?, attrs }`; spread `item.link` on `<Link>` and `item.attrs` (`data-rp-nav-item`) on any other element that renders an item (url anchors, group triggers) so Studio's Menus preview can select it. Source: bootstrap `menus[key]` (menu records, resolved per user); for `primary` only, then the legacy `portal.navigation`, then the pages without parameters; other keys without a menu are empty (`source: 'none'`). One leaf is active (exact path, else the longest prefix; `match: 'exact'` items only on their own path); its groups are active and open. Leaves without a `tint` get `chart-1`…`chart-5` by position. Route items with another portal's slug (`params_json.portal`) carry `portalSlug` (in-app cross-portal link) |
| `useSidebar` | `() => { state: 'expanded'\|'collapsed', open, setOpen, toggleSidebar, isMobile, openMobile, setOpenMobile, available }`: the portal shell's sidebar state (shadcn's `useSidebar`, hoisted so a header trigger and a sidebar widget share it). `open` persists per portal (`localStorage['rp-sidebar:<slug>']`); `isMobile` = portal frame narrower than 768px; Ctrl/⌘+B toggles while a collapsible sidebar is mounted; `available` = one is mounted |
| `usePortalContainer` | `() => Element`: the overlay layer; pass it to every Base UI `.Portal` (`container={usePortalContainer()}`) |

Layouts only place slots: regions are bare and stretch their widgets; the header / sidebar / footer widgets own height, borders, background, width and collapse. Layout options are authored like widget options (`options.schema.json` + `defaults`) and switch CSS (data attributes), never the element tree.

Blocks (`kind = 'block'`) are page-structure components (section, grid, columns, …). Each instance gets compiled instance CSS (style tokens, grid layout, `x-css-var` options, tablet/mobile via `@container rp-page`), injected once per placement; the page frame is the `rp-page` size container.

### Portal, page and component

| Export | Signature |
| --- | --- |
| `usePortal` | `() => { portal, pages, theme, page, release, path, location, navigate }` |
| `usePortalLocation` | `() => { portalSlug, page, recordId, table, sysId, view, query, q, qParams, params, … }` (re-renders on every location change). `query` is the encoded-query URL param (a string); `qParams` the keys inside `q`; `params` = `qParams` plus the explicit `table` / `sys_id` / `view` / `query` (explicit win). See "URL parameters" |
| `useComponent` | `() => { instanceId, options, data, pending, error, server: { get(input), update(data?), refresh() } }` |
| `useServer` | `(options?) =>` the `useComponent()` result, named for Service Portal authors. `options`: `{ pinned?: { k: value }, toastErrors?: boolean }`. Every call sends `input` = pinned ← staged ← the call's own input (later wins); the widget's data is never sent back to the server. `server.get(input?, opts?)`, `server.update(input?, opts?)`, `server.refresh(opts?)`; `server.setInputs(obj \| prev => obj)` / `server.setInput(k, v)` stage inputs for the next call (then cleared); `server.pinInputs(obj)` sends values with every call until `server.unpinInputs(keys?)` (function values are read at call time); `server.inputs` → `{ pinned, staged }`. Failed actions toast automatically (detail by role); opt out with `useServer({ toastErrors: false })` or per call `{ toast: false }`. The promise still rejects |

### Embedded widgets

Importing a **widget** record gives you an embeddable component: each render is its own
instance (own id, options, server script, on-load data, error boundary and error toasts). Only
the default export is wrapped; named exports, primitives, utilities and blocks are untouched.

```tsx
import ServerClock from 'components:app/server-clock'
import { Embed, useEmbeddedWidget, useGetWidget, useServer } from '@portal/runtime'

export default function Dashboard() {
  const { data } = useServer()
  const fetched = useEmbeddedWidget(ServerClock, { format: 'date' }, { key: 'fetched' })
  return (
    <>
      <ServerClock embedKey="utc" options={{ title: 'UTC' }} onRefresh={…}>child content</ServerClock>
      {data?.clock ? <ServerClock model={data.clock} /> : null}   {/* $sp.getWidget in this widget's server script */}
      {fetched.model ? <Embed model={fetched.model} /> : null}
      <ServerClock.Raw />                                          {/* presentational: runs in THIS instance */}
    </>
  )
}
```

| Prop / export | Meaning |
| --- | --- |
| `options` | Widget options (JSON). The server merges them over the child build's defaults and filters them against its options schema (unknown keys, wrong types and `"x-embed": "server"` properties are dropped). Configuration, not authority |
| `embedKey` | `[A-Za-z0-9_-]{1,64}`, stable within the parent instance. Optional for one embed; give one per row in lists. Repeats without a key get `key-2`, `key-3`… (mount order, warned); a duplicate explicit key renders a placeholder |
| `model` | An `EmbedModel` from `$sp.getWidget` / `getWidget()`: seeds the instance (no request); its signed options are kept on later calls |
| `fallback` | `(error, retry) => ReactNode` instead of the default crash placeholder |
| `lazy` | `true` or `{ rootMargin?, height? }`: render a placeholder (`height`, default `10rem`) and skip initialize until it comes within `rootMargin` (default `200px`) of the viewport. Embeds that scroll into view together still share one batched initialize. Ignored with `model` (nothing to fetch) |
| other props | Client-only React props (callbacks, `children`, refs): never sent to the server |
| `.Raw` | The unwrapped component (today's presentational behaviour) |
| `Embed` | `<Embed model={…} />`: renders the widget a model names (must be a widget this component imports) |
| `useEmbeddedWidget` | `(component \| 'app/x', options?, { key?, enabled? }) => { model, pending, error, refetch }`: fetches a model on mount and when the inputs change |
| `useGetWidget` | `() => (component \| 'app/x', options?, { key? }) => Promise<EmbedModel>` (also `usePortalUtils().getWidget`): the `spUtils.get` equivalent for modals and handlers |
| `useInViewOnce` | `({ rootMargin?, disabled? }) => [ref, inView]`: the hook behind `lazy`, for any component that defers work until it's scrolled into view. `inView` turns true once; one shared IntersectionObserver per `rootMargin` |

The child receives `{ instanceId, options, region, embedded: true, ...passThroughProps }`; its
`useComponent()` / `useServer()` work unchanged. Ids are `<placement>~<key>[~<key>…]`, at most 4
levels below a placement. Client-declared on-load embeds initialize in one batched request per
render wave (deduped by id + options); server-built models (`$sp.getWidget(id, options?, { key? })`
in the parent's server script) arrive with the parent's data and carry a signed token, so options
the client can't set (`"x-embed": "server"`) survive later calls. The server only runs widgets the
placed component's build really imports, step by step along the import chain; anything else is a
404. Embeds render inside `<div style="display:contents" data-rp-embed data-rp-component
data-rp-embed-root data-rp-embed-depth>` (no `data-rp-placement`: the designer treats them as
part of their placement); live embeds are listed on `globalThis.__REACT_PORTAL__.embeds`
(`rp-embeds-change` event; a lazy embed not yet in view has status `deferred`). No server in
Studio's single-component preview.

**Under layouts.** A layout can import widgets and embed them the same way (for example a header
layout with a user menu that has a server script). Embeds under a layout are rooted at
`layout:<layout sys_id>` instead of a placement: `layout:<id>~<key>[~<key>…]`. The server
authorizes that root against the request page's **effective** layout (the page's layout override,
else the portal's default layout; a page the user can't open, or any other layout, is a 404), then
walks the import chain exactly as for placements. A layout with `serverMode: 'on-load'` gets its
own server script too: it initializes once when the layout mounts (in the same batched request),
runs with the effective layout options, can call `$sp.getWidget`, and `useServer()` /
`useComponent()` inside the layout read it. It isn't re-initialized on navigation between pages
that share the layout.

### URL parameters

The UIB `site` page has optional params `table`, `sys_id`, `view`, `query` (an encoded query) and
`q` (a query string), next to `page-id` and `id` (recordId). They reach the host as the properties
`table`, `sysId`, `view`, `query`, `q` (and `recordId`). Any of `table`, `sys_id`, `view`, `query`
can also be packed inside `q` (`…/params/q/table%3Dincident%26sys_id%3D…`); an explicit param wins
over the same key inside `q`. `sysId` falls back to `recordId`.

- `usePortalLocation()` → `{ table, sysId, view, query, q, qParams, params, recordId, … }`.
- `<Link>` / `navigate()` accept `table`, `sysId`, `view`, `query` (and `q`) and send them as separate
  PORTAL_NAVIGATE payload fields (`table`, `sysId`, `view`, `query`), which the page's "Link to
  destination" handler maps onto the site params.
- Every server call sends `context: { params, recordId }` (params = the location's `params`). The
  server validates it (strings only, ≤ 50 keys, ≤ 16 KB) and exposes it as `context.client` /
  `context.query`. `$sp.getParameter(name)` looks in `input`, then route params (`orders/:id`), then
  the URL params (explicit, then `q` keys); `$sp.getParameters()` returns all of them merged in that
  order. `$sp.getRecord()` with no arguments therefore reads `table` + `sys_id` from the URL.
- URLs look like `…/site/sp/params/page-id/form/table/incident/sys-id/<id>/q/<q>`: one `params`
  segment, then name/value pairs, with UIB dash-casing names (`sys_id` → `sys-id`, `pageId` →
  `page-id`).
- UIB doesn't deliver an absent optional param (Back from a URL with `q` to the same page without it
  keeps the old property value), and a binding on `sys_id` stays empty because the URL says
  `sys-id`. So the host also reads the URL's params (on every property change, on popstate and
  after its own navigations): a value the URL has but the property lacks is used, and an optional
  param the URL lacks is treated as `''` unless its property value changed in the last 1.5 s.
- **Precedence for widgets** (forms, lists): explicit widget options, then route params, then URL
  params.

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
| `usePortalUtils` | `() => { addInfoMessage(msg), addErrorMessage(msg), addTrivialMessage(msg), toast, format(template, values), getMessage(key) → Promise, scrollTo(selectorOrElement), fetchJson(url, init) → Promise, refresh() → Promise, getHeaders(), getWidget(component, options?, { key? }) → Promise<EmbedModel> }` |
| `toast` | Sonner's `toast` (`toast.success(…)`, `toast.promise(…)`, …); toasts render in the overlay layer |
| `format` | `(template, values)` or `(template, ...args)`: fills `{0}` / `{name}` placeholders |

### Table API

| Export | Signature |
| --- | --- |
| `useRecord` | `(table, sysId, { fields?, displayValue?, live?, liveThrottleMs? }?) => { data, isLoading, error, refetch, deleted }`; `live: true` refetches the record when it changes (record watch, throttled 250 ms) and sets `deleted` after a delete |
| `useTableQuery` | `(table, { query?, fields?, limit?, orderBy?, displayValue?, live?, liveThrottleMs? }) => { data: rows, isLoading, error, refetch }`; `orderBy: 'field'` or `'-field'`; `live: true` refetches the list when records matching `query` change (throttled, default 1000 ms) |

Both call `/api/now/table/…` with the session (the platform's ACLs apply) and cache through the
page-level TanStack Query client. `live` is off by default.

### Live updates (record watch, AMB)

| Export | Signature |
| --- | --- |
| `useRecordWatch` | `(table, query, onChange?, { enabled?, invalidate? = true, debounceMs? = 250 }?) => { status, error?, connection, channel, lastEvent }`. `query` is an encoded query (`ORDERBY` terms dropped; `''` / `null` = the whole table, watched as `sys_idISNOTEMPTY`). `onChange(event)` runs per message; with `invalidate` the page cache for the table (Table API hooks, `utilities:app/list-data` lists, `utilities:app/graphql` record reads) refetches, throttled |
| `useAmbChannel` | `(channel, onMessage, { enabled?, graphQLSubscription? }?) => { status, error?, connection }`: any AMB channel (e.g. a GraphQL subscription's `/rw/graphql/…`) |
| `useAmbStatus` | `() => { connection: 'connecting'\|'open'\|'broken'\|'closed'\|'unavailable', resumedAt }` |

`status`: `'idle'|'subscribing'|'subscribed'|'denied'|'error'` (`denied` = 403, the user may not watch that
table). `RecordWatchEvent = { table, sysId, action: 'entry'|'change'|'exit' (relative to the filter),
operation: 'insert'|'update'|'delete', changes: string[], modCount, updatedOn, fromUser, displayValue,
record, raw }`.

- **A message is a signal, not data.** Re-read through the Table API / GraphQL (ACL-enforced) and render that;
  `event.record` is the raw server payload (whether the platform filters it per user ACL is unverified).
- **One connection.** The hooks reuse the Next Experience shell's AMB client (`window.amb.getClient()`, else
  `window.g_ambClient`): no second socket. Without one, `connection` is `'unavailable'` and the hooks do nothing.
- **Shared channels.** Identical watches share one subscription (reference-counted); a channel is released about
  1 s after its last hook unmounts. Reconnects and short-gap redelivery are the client's; after a reconnect
  every watched table is refreshed once.
- **Own writes echo back.** Compare `modCount` (`sys_mod_count`) with what you loaded to ignore your own saves.
- **Cost.** The server evaluates every watch on every write to that table: avoid broad watches on hot tables.
- **Studio.** The designer canvas runs with live updates off (`PortalPreview liveData`).
- **Mock** (`?rpmock=1`): an in-memory bus; `window.__rpAmb.emit(table, sysId, patch)` / `.remove(table, sysId)`
  write a mock row and publish. `window.__rpAmb.diagnostics()` lists channels, listeners and counters.

### Shipped UI

`components:badge`, `components:button`, `components:card`, `components:dropdown-menu`,
`components:popover`, `components:separator`, `components:sheet`, `components:tooltip`,
`components:collapsible`, `components:tabs` (shadcn/ui on Base UI), `components:rich-text` / `components:rich-text-editor` (below) and `utilities:cn`.

`components:rich-text`: `RichText` (`html`, `size`, `as`; sanitised, `.rp-prose` styles), `sanitizeHtml(html, { allowImages?, allowDataImages?, allowTables?, linkTarget? })`, `safeUrl(url, 'href'|'src')`, `htmlToText(html, { newlines? })`, `isHtmlEmpty(html)`, `findUnsupportedHtml(html)`.

`components:rich-text-editor`: `RichTextEditor` (`value` / `onChange(html)` / `onBlur(html, { changed })`, `readOnly`, `disabled`, `placeholder`, `invalid`, `required`, `id` / `aria-*`, `minHeight` / `maxHeight`, `onUploadImage(file)`, `toolbarHide`, `notice`), `RichTextToolbar`, `useRichTextEditor`, `loadRichTextEngine`, `isRichTextEngineLoaded`. TipTap is the lazily loaded `portal-rte.jsdbx` chunk (`src/portal-rte.js`, vendored by `pnpm run vendor:rte`).

`components:tabs`: `Tabs` (`value` / `defaultValue` / `onValueChange`, `orientation`), `TabsList`
(`variant` default|line), `TabsTrigger` (`value`, `disabled`), `TabsContent` / `TabsPanel` (`value`,
`keepMounted`). Base UI supplies roving focus with arrow keys, Home / End, `aria-selected`,
`aria-controls` / `aria-labelledby` and `data-active` on the selected tab.

`components:dialog`: `Dialog` (`open` / `defaultOpen` / `onOpenChange`), `DialogTrigger`, `DialogContent`
(`showCloseButton`, renders into the overlay layer), `DialogHeader`, `DialogTitle`, `DialogDescription`,
`DialogFooter` (`showCloseButton`), `DialogClose`, `DialogOverlay`, `DialogPortal`. Base UI supplies the modal
focus trap, Escape / outside-click dismissal and focus return to the trigger.

`components:calendar`: `Calendar` (`value` / `onSelect` as `'YYYY-MM-DD'`, `min`, `max`, `isDisabled(ymd)`, `locale`,
`weekStartsOn` (default from `Intl.Locale` weekInfo), `today`, `defaultMonth`, `onMonthChange`, `autoFocus`, `footer`),
plus `weekStartFor(locale)`, `parseYmd`, `toYmd`. No date library: UTC day math, Intl names. A WAI-ARIA date grid with a
roving tabindex: arrows, Home / End, PageUp / PageDown (Shift = year), Enter / Space; the caption opens month and year grids.
Pure UI: time zones and glide values belong to the field primitives (`app/date-field`).

`components:sidebar` is shadcn's Sidebar wired to `useSidebar()` (no provider to render):
`Sidebar` (`variant` sidebar|floating|inset, `collapsible` offcanvas|icon|none, `width`), `SidebarTrigger`
(hidden while no collapsible sidebar is mounted), `SidebarRail`, `SidebarHeader|Content|Footer|Group|GroupLabel|Menu|MenuItem|MenuButton|MenuBadge|MenuSub*`.
It fills the layout's sidebar slot (in flow, not fixed) and is a Sheet in the overlay layer on mobile.
`SidebarMenuButton isActive tooltip render={<Link {...item.link} />}`: the tooltip shows on the icon rail only.
Style rail states with the value-free `group-data-rail:` variant (`data-rail` is set while icon-collapsed).

### Data libraries

| Module | What |
| --- | --- |
| `utilities:react-query` | TanStack Query v5 (the host's copy: hooks share the page `QueryClient`) |
| `utilities:react-table` | TanStack Table v8 (headless table state: `useReactTable`, `getCoreRowModel`, `flexRender`, `createColumnHelper`, sorting / selection / visibility / ordering / sizing / pinning state). Use `manualSorting` / `manualPagination` / `manualFiltering` for server-side lists |
| `utilities:react-virtual` | TanStack Virtual v3 (`useVirtualizer`, `useWindowVirtualizer`): row virtualization for long lists |

`components:app/data-table` (a primitive record) builds the record list on these: see its header comment.

`components:icon`: every lucide icon by name, `<Icon name="layout-dashboard" />` (kebab or Pascal case;
lucide's aliases and a few of ours such as `home`, `dashboard`). A curated set is bundled and renders
instantly; any other name loads the full lucide sprite once (`GET /api/x_312987_portal/rp/icons/lucide`,
~420 KB, cached in memory, in `localStorage` per lucide version and by the browser via ETag) and renders
from it, holding an empty same-size box meanwhile. Unknown names (or a failed load) render `fallback`:
a neutral circle by default, `fallback={false}` for nothing, or any element. Exports `Icon`,
`getIcon(name)` (component or null; a sprite-backed component for non-curated names), `hasIcon(name)`
(`true`/`false`, or `undefined` until the sprite has loaded), `loadIcons()` (Promise), `allIconNames()`,
`icons`, `iconNames` (the curated names).
