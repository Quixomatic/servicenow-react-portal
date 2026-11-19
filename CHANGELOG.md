# Changelog

All notable changes to React Portal are documented here.

## [1.10.0] - 2026-11-19

A large feature release: lists, full record forms with the platform's form runtime, embedded widgets,
menus in Studio, standard URL params, and live record updates.

### Added: lists (primitives wave 3)
- **`utilities:app/list-data`:** list data through the platform's own calls, plus encoded queries as data.
  - `GlideListLayout_Query.getListLayout` returns rows, count and column metadata in one call.
  - `GlideConditionBuilder_Query` provides breadcrumbs and dot-walking.
  - `GlideListLayoutInline_Query` handles inline-edit ACLs and multi-row writes.
  - Personalization is saved as user preferences.
  - Encoded queries can be parsed and serialized: AND/OR, `^NQ`, ORDERBY, keywords, relative dates.
- **`components:app/condition-builder`:**
  - AND/OR and new-criteria groups, with operators per type;
  - a dot-walk field picker, 4 levels deep;
  - value editors from the field primitives;
  - breadcrumbs labelled by the platform's parser.
- **`components:app/data-table`:** built on TanStack Table and TanStack Virtual.
  - **Grid:** a real `role="grid"` with full keyboard support and aria-sort/rowcount/rowindex. Columns resize, and there are skeleton and empty states.
  - **Data:** server-side paging, sort, filter and search.
  - **Editing:** a right-click Show matching / Filter out menu, and inline edit gated by `list_edit` ACLs.
  - **Personalization:** a column chooser (order, visibility, widths, dot-walked columns), persisted per user.
  - **Options:** every feature can be switched off; `page`/`card`/`plain` variants; pagination or infinite scroll; related lists; bulk actions.
- **Widgets:**
  - `app/list-view`, a full-bleed page list. Its state lives in the URL and rows open the form page; `toolbarPlacement` can put the toolbar in the header.
  - `app/list-card`, a list you can drop in anywhere.
- **Host modules:** `utilities:react-table` and `utilities:react-virtual`.
- **`utilities:app/header-slots`:** `HeaderSlot` / `HeaderSlotOutlet` / `useHeaderSlot`. `app/app-subheader` has left/center/right outlets, and the full-bleed list puts its title, count and actions in them.

### Added: record forms and the form runtime (primitives wave 4)
- **`components:app/form` and the `app/record-form` widget:**
  - It renders the record's real form view through Workspace's `GlideViewQuery_Query.uiView` (layout, policies, scripts, UI actions, scratchpad).
  - Header, view switcher, sections and columns, an error summary, a sticky save bar (Ctrl/⌘+S), and a guard for unsaved changes.
  - Save and create go through the platform's Save UI action (`/api/now/ui/ui_action`), sending only the changed fields.
  - It reads `table` / `sys_id` / `view` from options, then the route, then the URL.
- **UI policies** on record forms and catalog items. They're evaluated in the browser, using the server's pre-evaluated terms; reverse-if-false, onLoad=false, run-scripts, and last-writer-wins precedence with scripts are all handled.
- **`utilities:app/gform`, a `g_form` compatibility layer** that runs existing client scripts unchanged:
  - onLoad/onChange/onSubmit in a sandbox with no window or document;
  - `g_user` and `g_scratchpad`;
  - GlideAjax through `/xmlhttp.do` and async GlideRecord;
  - `getMessage`, a basic `g_modal`, and `g_aw.openRecord`.
- **UI action bar:** client actions run through the shim and server actions through the platform; redirects stay in the portal.
- **Conflict check:** a "Changed by someone else" prompt (Reload / Overwrite).
- **Catalog:** catalog client scripts and UI policies run, and onSubmit can block an order.

### Added: embedded widgets
- **Embedding by import:** importing a widget record and rendering it in TSX (`<ServerClock embedKey options/>`) creates a real embedded instance with its own server script, options, on-load data and error boundary. `.Raw` opts out.
- **`$sp.getWidget(id, options, { key })`** builds a child model server-side, running the child's script nested.
- **Client APIs:** `useEmbeddedWidget`, `useGetWidget` / `usePortalUtils().getWidget` and `<Embed model>`.
- **Security:**
  - Only widgets the placed widget actually imports can run, authorized step by step; anything else returns 404.
  - Client options are filtered by the child's schema.
  - Server-only options need an HMAC-style signed token, bound to placement, path, options and user, with a 12-hour lifetime and a runtime-generated private secret.
  - Limits: depth 4, 50 embeds per initialize, 20 `getWidget` calls per instance.
- **Designer:** read-only embed markers on the canvas, rows in the outline, and an Embeds section in the properties panel.
- **Manifest version 4.**

### Added: menus in Studio
- **Seeded menu records:** sp, crm and app now use primary/footer/account menu records, including cross-portal route items (`params_json.portal`). `navigation_json` is kept only as a fallback.
- **Any Lucide icon renders:** `components:icon` loads the full sprite on demand (cached).
- **The Studio Menus activity:**
  - a live preview through the portal's real widgets, in sidebar, rail, header and footer modes;
  - "View as" by role;
  - a drag-and-drop tree, quick-add (including "All pages"), the item form with a Lucide icon picker, and the server's script errors shown inline;
  - undo/redo.
- **Studio scope banner:** "Switch to React Portal", with editing disabled while out of scope, and the current app and update set shown in the status bar.
- **Deep links:** `view=menus` and `id=<menu or item>` open the activity.

### Added: standard URL params
- **Host properties** `table`, `sysId`, `view` and `query`, matching optional `site` page params. They can also be packed inside `q`, and an explicit param wins.
- **`usePortalLocation()`** returns `table`, `sysId`, `view`, `query`, `qParams` and `params`; `<Link>` and `navigate()` accept them.
- **Server scripts get the URL context:** `$sp.getParameter` checks input, then route params, then URL params; new `$sp.getParameters()`.
- **UIB URL format:** one `params` segment with dash-cased names (`sys-id`), read directly from the URL. Optional params missing from the URL reset, which fixes stale state on Back.

### Added: live record updates (AMB)
- **Runtime:** `useRecordWatch`, `useAmbChannel` and `useAmbStatus` reuse the shell's AMB client (one socket), with shared, reference-counted subscriptions, reconnect refresh and a mock bus.
- **`live` option on `useRecord` and `useTableQuery`.**
- **Lists:** optional live refresh with a highlight on changed rows.
- **Forms:** a clean form refreshes silently; a dirty one shows a "Changed by someone else" banner.

### Changed
- **Breaking: `usePortalLocation().query`** is now the encoded-query string; the old q-keys object is `qParams`.
- **Overlay container:** dropdowns, popovers and tooltips now open inside host-created roots, such as the designer canvas and the menus preview.
- **`build-seed.mjs`** inserts sources with a function replacement, so `$'` in component code no longer corrupts the seed.

### Fixed
- Default imports of component records resolved to the namespace object (React #130).
- Incident list: a double scroll bar, the sub-header right slot rendering left-aligned, and an empty middle breadcrumb.

### Notes
- Runtime Tests: 28/28 live.
- Test records left on the instance: INC0020825 and INC0020831 ("safe to delete"; INC0020831 is the Runtime Tests watch target).
- Known follow-ups:
  - re-initialize on-load widgets when URL params change;
  - lists and form navigation should use explicit params instead of `q`;
  - the recurring `hidden sm:block` cascade problem inside widgets;
  - a Studio dependencies panel, lazy embeds, and embeds in layouts;
  - AMB non-admin filtering is untested;
  - the Studio URL sync depends on James's studio navigate mapping.

## [1.9.2] - 2026-11-19

A global helper app gets past scope fencing: server messages now behave exactly like Service Portal's.

### Added
- **React Portal Global Helpers** (`packages/global-helpers/`): a separate global-scope Fluent application
  (`sys_app` `e4be8f1e…`, built and installed from its own folder) with the Script Include
  `global.ReactPortalGlobal`:
  - `drainSessionMessages()`, `getImpersonatingUserName()`, `currentApplication()`, `version()`;
  - `getPreference()` (allowlisted) and `clearClientData()` (our keys only).

  It acts only on the current user's own session and preferences. Caller access is left unset (caller tracking blocks
  scoped callers); access is through a cross-scope privilege.
- **Cross-scope privilege** in the main app's Fluent (`src/fluent/security/cross-scope.now.ts`, adopting record
  `03bbad5f…`), so other instances get the grant on install.
- **`src/server/lib/global-helpers.ts`:** a bridge that imports `global` from `@servicenow/glide/global` (types in
  `@types/`) and returns null when the helper app isn't installed.

### Changed
- **Server messages are drained after every widget call, like Service Portal:** read, toasted and flushed. Repeated
  identical messages always show, and nothing is left as a banner on the next classic page. Without the helper
  app, the previous read-only behaviour remains.
- **Impersonation:** `useUser()` / `$sp.getUser()` gain `impersonatedBy`.
- **Designer and menu rejection messages** are drained instead of leaking as banners.
- **Session flags** are cleared through the helper, else blanked.
- **The version bump** includes `packages/global-helpers/package.json` (lockstep).

### Notes
- Inside scripted REST, global `gs.getInfoMessages()` reads empty while scoped reads see the queue, so the drain is
  a scoped read followed by the helper's flush.
- Release flow: also run `cd packages/global-helpers && now-sdk build && now-sdk install`.

## [1.9.1] - 2026-11-19

Server-script messages reach the portal.

### Added
- **Server messages become toasts.**
  - Any `gs.addInfoMessage` / `gs.addErrorMessage` a component's server script raises is read back after the
    script runs and returned to the client, as `meta.messages` on execute, `instances[id].messages` on
    initialize, or in the error details when the script fails. The portal shows each as a toast coloured by
    type.
  - New `$sp.addInfoMessage`, `addErrorMessage`, `addWarningMessage` and `addSuccessMessage`.
  - `gs` messages also stay queued for the next classic UI page, as usual: `gs.flushMessages()` is blocked in scope.
  - **Known limitation:** the session ignores a `gs` message identical to one still queued, so a repeated
    identical `gs.addInfoMessage` (e.g. from a business rule on every save) toasts only the first time until a
    classic page clears the queue. `$sp.add*Message` is unaffected (it never touches the session).
- **Runtime Tests:** "Server messages" and "Server error" buttons, which exercise server-raised toasts without
  breaking anything.

## [1.9.0] - 2026-11-19

The app shell. Layouts only place slots; header, sidebar and footer widgets own their look. Adds a
collapsible shadcn-style sidebar, layout options, navigation menus as records (backend), a
ChannelGuide-style Dashboard portal, server-error toasts, and staged/pinned server inputs.

### Added
- **Layout options:**
  - Layouts declare an options schema and defaults; the portal default lives in `settings.layoutOptions`, and pages
    override it with a new `layout_options_json`.
  - Bootstrap and resolve return the effective `layoutOptions`. Layouts receive an `options` prop and
    `useLayout()`, and option changes don't remount widgets.
  - The designer has a layout-options form in portal settings and a page-level "Portal default / Custom" override.
- **Slot-only layouts:**
  - Standard Layout (option `header: full | beside-sidebar`, `contentPadding`) and Centered Layout only place
    regions.
  - `site-header`, `nav-sidebar` and `site-footer` own their height, borders, width and styling.
- **Collapsible sidebar:**
  - `useSidebar()`: expanded/collapsed, persisted per portal, Ctrl/⌘+B, an overlay sheet on mobile (by frame
    width), and an `available` flag.
  - New registry modules `components:sidebar|sheet|tooltip|collapsible|icon`.
- **`useNavigation(key = 'primary')`:** items, `activePath` (breadcrumbs) and the active item. It reads menu records
  first, then the legacy `portal.navigation`.
- **Dashboard portal (`/site/app`)** in the style of the ChannelGuide dashboard:
  - new `app/app-shell` layout (inset main card, textured background, one shared header-band height);
  - `app/app-sidebar` (collapsible groups, icon rail, user menu), `app/app-header` (breadcrumbs, sidebar trigger)
    and `app/app-subheader`;
  - `app-neutral` theme.
- **Navigation menus (backend):**
  - `x_312987_portal_menu` (per portal, unique key) and `x_312987_portal_menu_item` (page / route / url / group /
    separator / dynamic; parent groups, icon, target, match, tooltip, roles, condition), with validation, a
    syntax check on scripts at save, and reprocessing.
  - Bootstrap `menus` is resolved per user: roles, conditions, page access, empty groups dropped.
  - `$sp.getMenu(key)`, `getMenus()`, `getMenuItem(id)`. Manifest version 3.
  - Studio APIs for menus, items (move, reorder, delete with lift/cascade) and icon search.
  - A Lucide icon-picker formatter on the classic menu-item form, using the full Lucide set served from
    `/rp/icons/lucide`.
- **Scope awareness:** `GET /rp_studio/context` returns the current application, whether it's in scope, and the
  update set. Studio writes reject with 409 `wrong_scope` when the current application isn't React Portal. (The
  rejection itself is not yet exercised live.)
- **Server errors reach the user:**
  - Action errors (`server.get/update/refresh`) toast automatically; opt out per call (`{ toast: false }`) or per
    widget (`useServer({ toastErrors: false })`).
  - On-load script errors show a banner above the widget.
  - Developers and admins see the message, script line and a reference ID; other users see a generic message
    plus the reference.
- **Staged and pinned server inputs:**
  - `server.setInputs()` / `setInput()` are sent with the next call, then cleared.
  - `server.pinInputs()` / `unpinInputs()` are sent with every call (function values are read at call time), and
    `useServer({ pinned })` pins reactive values.
  - Merge order: pinned → staged → the call's own input. `server.inputs`.
- **Studio `view` URL parameter** (`code` | `pages`), via a new `view` host property.
- **Runtime Tests:** two new checks (staged/pinned inputs; `update` sends no data), 18 in total.

### Changed
- **`server.update(input?)` sends inputs only.** The widget's data is never sent back to the server, and the server
  ignores client data: every action starts from empty `data`.
- **Toasts:** bottom-centre, with colours by type (success / error / warning / info) tinted from theme tokens in
  light and dark.
- **The seed** sets per-portal settings, layout and portal widgets (it no longer resets `settings_json`), and
  recompiles every component.
- **Compiler `rp-server-compiler/4`.**

### Fixed
- **Widget responsive utilities lost to the host's Tailwind** (`hidden md:block` stayed hidden). The host's
  framework CSS was an adopted stylesheet, which sorts after every widget `<style>`. It's now injected in the
  framework slot, before widget CSS.
- **Tailwind classes with `=` inside brackets were dropped** (`group-data-[collapsible=icon]:hidden`,
  `data-[side=left]:…`). The class extractor now splits only outside square brackets.
- **Menu condition evaluation** produced a trailing "SyntaxError" at the end of transactions for scripts that
  throw.

### Known gaps
- No Studio Menus editor yet; the designer's legacy navigation editor only understands `{label, page}`.
- Each portal's `navigation_json` hasn't been migrated to `primary` menu records yet.
- `components:icon` resolves a curated set, not every Lucide name.

## [1.8.0] - 2026-11-19

Content width: pages no longer stretch edge to edge. Each page picks a max width for its main
content, or full bleed, with a portal-wide default.

### Added
- **Page setting `content_width`:** Portal default (the default) / Full bleed / 7xl (80rem) / 6xl (72rem) /
  5xl (64rem) / 4xl (56rem) / 3xl (48rem). It's on the page form and in the page designer's page panel.
- **Portal default `settings.contentWidth`,** set under "Default content width" in the designer's portal
  settings. If it's unset, 7xl.
- **Resolve returns `page.contentWidth`,** the effective width: page, then portal, then 7xl.
- **The host exposes it as `--rp-content-max`** around the layout (a `display: contents` wrapper, so layouts
  don't remount), in the portal and the designer canvas. Any layout can use it.

### Changed
- **Standard Layout** centres its main content and caps it at `--rp-content-max`.
- **Centered Layout** uses it as its column width when one is set, else its own 760px.

## [1.7.0] - 2026-11-19

Primitives, wave 2: catalog variables. Catalog items and record producers render from the
platform's own catalog GraphQL, reuse the field primitives for their variables, and submit through
the platform's order-now and submit-producer APIs.

### Added
- **`utilities:app/catalog`:**
  - Fetchers:
    - `fetchCatalogItem`: one GraphQL query, `AppCatalogView_Query.itemViewLayout`. It returns header, pricing, variables, the layout tree, defaults and a draft record for attachments.
    - `fetchItemPrice`: `/api/sn_sc/servicecatalog/items/{id}/price`.
    - `submitCatalogItem`: `order_now` / `submit_producer`.
    - `fetchMrvsRowForm`: the platform's MRVS row-form call.
    - `validateVariableRegex`, `checkDelegation`, `uploadVariableAttachment`.
  - Hooks: `useCatalogItem`, `useItemPrice`, `useMrvsRowForm`.
- **`components:app/variable`:**
  - `variableSpec()` maps all 32 `item_option_new` types onto field metadata and renders them through
    `app/field-control`, so variables reuse the field primitives.
  - `createCatalogForm` / `useCatalogForm` / `CatalogFormProvider`:
    - built on the form store, with fields named `variables.<name>`;
    - any method accepts `<name>`, `IO:<sys_id>` or the sys_id, so g_form-style catalog scripts can plug in later;
    - `serializeVariables()`.
  - Renders labels, sanitised rich-text labels, breaks, and attachment and macro variables.
- **`components:app/attachment-variable`:** an accessible drop zone with extension and size checks.
- **`components:app/mrvs`:** a multi-row variable set grid.
  - Add, edit and remove rows in a native modal dialog with its own form store per row, using the platform's row
    form metadata.
  - Max-row and unique-column rules; the value is the platform's MRVS JSON.
- **`components:app/variable-container`:** `<VariableLayout>` renders containers as titled column sections,
  checkbox groups as named fieldsets, variable sets, and MRVS.
- **Widgets:**
  - `app/catalog-item`: header with picture, description and price; variables; quantity.
    - Submitting validates first: an error summary takes focus and links to each field.
    - Then order now or submit producer; it shows the number with a link and offers "Start another".
  - `app/catalog-picker`: featured items and live search.
- **The `sp` page `catalog`:** the picker and item in a ⅓ + ⅔ Columns block, with six demo items: zoom webinar,
  bulk mobile devices (MRVS), parking sticker, Standard Laptop, Firewall Rule Change, and Report Outage (record
  producer).

### Changed
- **Required-field errors** now appear after Validate/Submit, or after the user clears a value they changed. They
  no longer appear just from tabbing through an empty field, which shifted the layout under the pointer.

### Notes
- Verified live on dev189813:
  - all six items render;
  - list collector and reference search; the requested-for qualifier is applied by the server;
  - MRVS add/edit/remove; price follows quantity;
  - the error summary; keyboard use; light and dark.
- Two real test submissions were made and kept: **REQ0010002 / RITM0010002** (bulk mobile devices, with one MRVS
  row) and **INC0020811** (Report Outage).
- Not yet built:
  - catalog UI policies and client scripts (e.g. a field that should show only when a checkbox is ticked still
    shows);
  - delegation and requested-for in the UI; inline MRVS editing; MRVS row prices in the total.
  - Dependent variable choices and references inside MRVS rows are untested, because no demo item has them.
  - Cart, checkout and order guides stay in the backlog.

## [1.6.0] - 2026-11-19

Primitives, wave 1: a shared GraphQL utility, the `app/field` base, and 15 field primitives built on
it. They're all real component records that widgets import, and they bind to live ServiceNow
metadata, choices and reference search.

### Added
- **`utilities:app/graphql` (utility).**
  - `graphql()` sends `POST /api/now/graphql` with X-UserToken; also `gql`, `restGet`, `GraphQLError`.
  - TanStack Query hooks:
    - `useTableMeta` / `useFieldMeta`: `/api/now/ui/meta/{table}` (labels, types, choices, references, max lengths; cached 10 min).
    - `useFormBootstrap`: `GlideLayout_Query.formLayout` (values, display values, field states, sections).
    - `useChoices`: `choiceDataRetriever` with the unsaved dependent values.
    - `useReferenceSearch`: `referenceDataRetriever`, so the server applies the field's reference qualifier against the unsaved form state.
    - `useRecordValues` / `useReferenceDisplay`: `GlideRecord_Query`.
    - Plus `useGraphQL`, `useDebouncedValue` and `useGraphQLClient`.
- **`components:app/field` (primitive).**
  - `useField`: value + displayValue, staged/dirty/touched, mandatory/readOnly/visible/disabled, messages and
    validation, ids for accessibility. Precedence: explicit props → form overrides → server state → dictionary.
  - `FieldShell`: label, required marker, hint, polite live-region messages, an unsaved-changes marker, a
    selectable read-only view, horizontal/vertical layouts and a fieldset mode.
  - `FormProvider` / `useForm` and a form store with a `g_form`-style API (getValue/getDisplayValue/setValue,
    setMandatory/setReadOnly/setVisible/setDisabled/setLabel, field and form messages, isDirty, serialize,
    validate, reset, onChange), layered so a `g_form` shim can sit on top later.
  - A field-type registry: `registerFieldType`, `resolveFieldComponent`.
- **Field primitives:**
  - `app/combobox`: an accessible editable combobox plus a select-only Select. Popups render in the top layer,
    so they escape clipped cards.
  - String, textarea, number (integer and decimal, locale-aware, stepping), boolean (checkbox or switch), choice
    (select, radio or scale; dependent values), reference (recent picks, search, extra columns), list (chips).
  - Date and date/time (converted to the user's ServiceNow time zone, daylight-saving aware).
  - Email, URL, phone, password (show/hide, confirm), currency, duration.
  - `app/field-control` picks the right primitive from the dictionary type.
- **`app/field-demo` widget and an `sp` page `fields`:** every primitive standalone, and bound to a real incident
  in a form context.
- **Host:** `utilities:react-query` registered for utilities. Record imports load in parallel and evaluate in
  dependency order.
- **Seed:** `build-seed.mjs` orders component folders by their record imports, and the seed recompiles the
  import graph in dependency order, so one seed run builds everything.

### Notes
- Verified live on dev189813:
  - reference search returns real users;
  - subcategory follows the unsaved category;
  - "Assigned to" search is scoped to the unsaved assignment group;
  - keyboard use, validation with aria wiring, dirty/serialize/reset, read-only, light and dark.
- `useFormBootstrap` for a new record (`sysId = -1`) evaluates defaults, which reserves the next number (e.g. INC);
  it never refetches a new record in the background.
- Not yet built: HTML and journal fields (they fall back to textarea), attachment and time fields, a custom
  calendar popover, and saving from `useForm`.

## [1.5.0] - 2026-11-19

Blocks: page-structure components with drop zones (grids with subgrid, columns, sections and
more), per-instance styling compiled on the server, and the groundwork for primitives: a new
`primitive` kind and imports from one component record into another.

### Added
- **Blocks: a new component kind, `block`.** Page-structure building blocks placed on pages:
  - Each block declares its drop zones as data in `regions_json`: static names, or templates driven by the
    instance's options (`{ "repeat": "tracks", "name": "col-{n}" }`).
  - Instances nest through `placement.parent`, with `region` naming the drop zone, up to 6 levels deep.
  - Six seed blocks: `app/section`, `app/container`, `app/grid` (a real CSS grid; nested grids can use
    subgrid), `app/columns` (presets ½+½, ⅓+⅔, ⅔+⅓, ⅓×3, ¼×4, sidebar + main), `app/stack`, `app/split`.
  - New `sp` page `layouts` demonstrates them.
- **Per-instance styling.** Placements gain `layout_json` (span, start, order and self-alignment in the parent
  grid), `classes` (Tailwind) and a read-only `instance_css`. The server compiles instance CSS from:
  - the classes, through the server-side Tailwind compiler;
  - style tokens (padding, background, radius, shadow…, where theme colour names map to theme variables);
  - the grid layout;
  - block options annotated with `"x-css-var"` in the options schema.

  Every group supports `tablet` / `mobile` overrides, emitted as container queries against the page frame
  (`rp-page`), so the designer's device widths render exactly. The CSS recompiles from the designer, and from a
  business rule (`RP: Compile placement instance CSS`) when a placement is edited directly on the instance.
- **The page designer supports blocks:**
  - a Blocks group in the palette, with presets;
  - nested drop zones and an outline that shows the tree;
  - moving blocks with their subtrees;
  - Styling, Grid and Classes sections with base / tablet / mobile editing;
  - deleting a non-empty block asks whether to move its contents out or delete everything.
- **Runtime:** `useBlock()` returns `{ placementId, options, regions, rootProps }`, and `<Region>` inside a block
  renders that instance's children. Region gains `className` and `contents` (display: contents, so children are
  direct grid or flex items). Instance CSS is injected once per placement.
- **The `primitive` component kind:** reusable building blocks (fields, lists, forms) that widgets import and
  that are never placed on a page. Studio has a starter for new ones.
- **Imports between component records:**
  - `components:<ns>/<key>` reaches a primitive, widget or block; `utilities:<ns>/<key>` reaches a utility.
  - The compiler records these as component dependencies and fails clearly if the target is missing, the wrong
    kind, not compiled yet, or the component itself.
  - Compiled modules export every named export (`__rpExports`).
  - The manifest lists each component's transitive imports, dependencies first. The host loads and registers
    them before evaluating the component. Studio preview uses the same path.
  - Recompiling a primitive reprocesses every portal that uses it, directly or through imports.
- **Navigator:** Blocks, Primitives and Utilities modules.

### Fixed
- **Navigator filters weren't applied.** The Widgets, Layouts and Properties modules used the "List Filter" link
  type, which only pre-fills the condition builder. They're now filtered lists.
- **Widgets nested in blocks got no on-load data.** Batch initialize now includes placements inside blocks.

### Changed
- **Manifest version 2:** top-level region maps hold top-level placements only, and blocks carry their resolved
  drop zones and nested children. Placements carry `layout`, `classes` and `css`.
- **Compiler version `rp-server-compiler/3`:** builds recompile on their next compile.
- **Placement validation** accepts widgets and blocks, and checks a child's region against its parent block's
  resolved drop zones.

### Internal
- Docs: `docs/primitives/catalog.json` and `catalog.md`, a catalog of 333 Next Experience components plus 32
  catalog variable-type mappings with a primitives roadmap, committed separately.
- New server modules: `registry/block-regions.ts`, `design/instance-style.ts`, `lib/css-safe.ts` and
  `lib/session-flags.ts`. `lib/session-flags.ts` is lightweight, so business rules don't load the compiler.

## [1.4.0] - 2026-11-19

A drag-and-drop page designer in Portal Studio: lay out pages on a live canvas that renders the
real portal, backed by a new design API that edits pages and placements in place.

### Added
- **Page designer** (Studio activity bar → Pages; `packages/portal-host/src/studio/designer/`).
  - Left column: the portal picker, portal settings, the page list (create, delete, set as home page) and an
    outline of every region and its widgets.
  - Centre: a live canvas that renders the page through the real portal runtime: same router, layout, loader,
    theme and light/dark mode.
  - Right column: a widget palette with search and "+" to add, plus a properties panel.
  - Drag and drop with dnd-kit:
    - palette → region creates a placement;
    - placements move within and between regions, and between page and portal-wide scope;
    - the keyboard sensor supports Space, the arrow keys and Space again.
  - Undo and redo of every write (Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y), Delete to remove, Escape to deselect.
  - Desktop, tablet (820px) and mobile (390px) canvas widths, plus an interact/preview toggle.
- **Schema-driven widget options.** Components with an `options_schema_json` get a generated form in the
  properties panel (raw JSON as a fallback). The demo widgets now ship `options.schema.json`, which the seed
  generator maps to `options_schema_json`.
- **`PortalPreview`** (`src/portal/portal-preview.js`): the portal runtime driven by props instead of UI
  Builder, exposed through registry internals for the canvas.
- **Design API** (`src/server/design/design-service.ts`, new `rp_studio` routes):
  - `GET /design/{id}` (resolve a portal or page id), `GET /portals/{id}/design`, `GET /pages/{id}/design`;
  - `POST/PATCH/DELETE /placements[/{id}]`, `POST/PATCH/DELETE /pages[/{id}]`, `PATCH /portals/{id}`.
  - Placements are renumbered on move, and target regions are validated against the layout's `regions_json`
    before any write.
- **Session summaries:** `.claude/skills/session-summary` writes a dated summary to `.docs/summaries/` and
  refreshes the resume prompt's state block before a compaction.

### Changed
- **Batched reprocessing.** Designer writes set the `x_312987_portal.skip_reprocess` session flag, so the
  reprocess business rules skip and the portal's release is processed once per batch instead of once per
  record.
- **Standing rules moved from `CLAUDE.md` to Claude memories**; `CLAUDE.md` is removed.

### Fixed
- **Unstyled buttons in Studio previews.** Studio's `<button>` reset sat outside any cascade layer, so it beat
  Tailwind's layered utilities and stripped shadcn Button styling in the canvas and the component Preview tab.
  The resets now live in Tailwind's `base` layer. Previews also take the host's font instead of Studio's 13px
  chrome font (`src/studio/host-text.js`).

### Internal
- dnd-kit (`@dnd-kit/core`, `sortable`, `utilities`) added to the host. The mock runtime gained design data
  for local designer development (`?rpmock=1`).

## [1.3.1] - 2026-11-19

Two demo components that exercise the new runtime end to end, and a Tailwind extraction fix they
exposed.

### Added
- **Incident List** (`scripts/seed/components/incident-list/`): an on-load widget driven by `useServer`.
  Its IIFE server script uses `$sp` and `GlideRecordSecure` (platform ACLs apply) for filtering
  (Active / Assigned to me / Opened by me), search and "Assign to me"; the client uses `useUser`
  (greeting, `hasRole('itil')`), `useMessage`, `usePortalUtils` (toasts, `format`), shadcn Card, Badge,
  Button and DropdownMenu, and an extra file (`parts/IncidentRow.tsx`). New `sp` page `incidents`.
- **Runtime Tests** (`scripts/seed/components/runtime-tests/`): a live checklist for every
  `@portal/runtime` hook and the `$sp` helper (useUser, useTheme, usePortal, useMessage(s),
  useProperty(ies), useRecord, useTableQuery, format, fetchJson, server.get, on-load data) plus toast
  buttons. 16/16 pass on the instance. New `sp` page `tests`.
- **Demo property** `x_312987_portal.public.welcome`, readable from widgets via `useProperty`.

### Fixed
- **Tailwind arbitrary values were dropped.** The compiler's class extraction split on `(` and `,`, so
  classes like `grid-cols-[7rem_minmax(0,1fr)_auto]` or `bg-[rgb(1,2,3)]` never generated CSS. It now
  splits on whitespace and quotes only (plus JSX punctuation).
- **Compiler upgrades now rebuild components**: the compiler version (`rp-server-compiler/2`) is part
  of each build's input hash, so a compiler change marks builds out of date instead of keeping old output.

## [1.3.0] - 2026-11-18

Light/dark/system mode across portals and Studio, Service Portal-style server scripts with a `$sp`
helper, and spUtils-style client hooks.

### Added
- **Light / dark / system mode.** `useTheme()` in `@portal/runtime` with the next-themes API
  (`theme`, `setTheme`, `resolvedTheme`, `systemTheme`, `themes`): defaults to system and follows
  `prefers-color-scheme` live, persists in localStorage (`rp-theme`) and syncs across tabs, and is
  applied as `.dark` on the host before first paint (mirrored to overlays; `color-scheme` set).
  next-themes itself can't be used: it targets `<html>`, which our shadow root never sees.
- **Per-mode theme tokens.** `tokens.json` accepts `{ "light": {…}, "dark": {…} }` (flat objects still
  work); bootstrap returns `tokensDark`, applied on `:host(.dark)`; themes without a dark set fall back
  to the shadcn default dark palette.
- **Mode toggles.** The seeded Site Header has a Light / Dark / System menu (`parts/ModeToggle.tsx`,
  shadcn's ModeToggle pattern), and Studio's title bar has the same toggle sharing one preference
  (CodeMirror switches VS Code light/dark). Both demo portals now ship light and dark palettes.
- **`$sp` / `$rp` in server scripts.** Injected into every component server script, modeled on Service
  Portal: `getValue`, `getDisplayValue`, `getParameter`, `getRecord` (ACL-checked), `getField(s)`,
  `canReadRecord`, `getProperty`, `getUser`, `hasRole`, `getPortal`, `getPage`, `getComponent`,
  `translate`, `log`.
- **Service Portal-style IIFE server scripts.** An empty `server.js` opens as SP's
  `(function () { /* populate the 'data' object */ })()` template; the seed uses it.
- **Current user in bootstrap** (`user`: sys_id, name, email, title, avatar, roles, time zone, language).
- **Runtime endpoints** `GET /properties` (only properties a portal exposes via
  `settings.exposedProperties` or under `x_312987_portal.public.`; everything else is null) and
  `POST /messages` (gs.getMessage in the user's language).
- **spUtils-style hooks** in `@portal/runtime`: `useUser` (`hasRole`, `hasAnyRole`), `useProperty(ies)`,
  `useMessage(s)` (batched per tick), `usePortalUtils` (`addInfoMessage` / `addErrorMessage` /
  `addTrivialMessage` toasts via shadcn Sonner, `format`, `getMessage`, `scrollTo`, `fetchJson`,
  `refresh`, `getHeaders`), `useServer`, `useRecord` and `useTableQuery` (Table API + TanStack Query,
  platform ACLs apply). The host README documents every runtime export.

### Fixed
- **Server-script errors are reported.** GlideScopedEvaluator swallows errors, so a broken script used to
  return partial `data`. The compiled server script now captures the error and execute/initialize
  return `script_error` with the author's line number (also logged to the execution log).
- **Bootstrap 500**: `gs.getImpersonatingUserName()` is blocked in scoped apps; impersonation detection
  now degrades gracefully.

### Internal
- Host bundle ~781 KB (+Sonner); Studio chunk ~1.0 MB.

## [1.2.0] - 2026-11-18

Portal Studio: a VS Code-style editor for components and themes, running in the host on a
`studio` page, with save compiling on the server and live problems while you type.

### Added
- **Portal Studio (host `mode = studio`).** A workbench in `packages/portal-host/src/studio/`:
  - title bar with a searchable component/theme switcher, New component, Save (Ctrl+S) and a
    build badge with compile time
  - an explorer showing each component's virtual files (Client, Styles, Server, Options schema,
    Defaults, Regions) and its extra files as a folder tree, with new file/folder, rename and delete
  - CodeMirror 6 editors in split editor groups (allotment): preview and pinned tabs, drag tabs
    between groups or onto an edge to split, Open to the Side, Ctrl+\ split, quick open (Ctrl+P)
  - VS Code light/dark themes, a Problems panel driven by the server's check endpoint, an
    Output log, properties for component metadata, a status bar
  - a Preview that renders the latest build through the host runtime, unsaved-change guards,
    a 409 conflict banner (reload or overwrite), and per-component tab/layout persistence
  - routing through the host's `recordId` (the studio page's optional `id` URL parameter)
- **Studio ships as its own chunk** (`portal-studio.jsdbx`, ~1 MB): portal pages don't download the
  editor; the portal bundle is unchanged.
- **More virtual files.** Components now expose `options.schema.json`, `options.defaults.json` and
  (layouts) `regions.json`; themes expose `tokens.json`. JSON is pretty-printed for editing,
  validated on save, and an unchanged placeholder (`{}` / `[]`) saves as a no-op.
- **`POST /components/{id}/check`** (Studio API): dry-run compile of unsaved buffers merged over the
  saved project; returns errors with file/line/column (and invalid JSON) without writing anything.
- **`POST /components`** (Studio API): create a widget, layout or utility with a starter client
  script, compiled on create.

### Changed
- **Save compiles synchronously.** `POST /components/{id}/save` (and themes) returns the finished
  compile result, so Studio shows errors straight from the save response. Compile-on-save business
  rules stand down during a Studio save so a multi-file save compiles once.
- **REST handlers may return a Promise** (`src/server/api/http.ts`); it settles before the request's
  script finishes, so the response body is still written.

### Fixed
- **Scoped `GlideSession` has no `clearClientData`**: the compile-suppression flag is cleared with
  `putClientData(key, '')`.

### UI Builder setup
- Page `studio`, no required URL parameters, optional `id`. React Portal Host with Mode = `studio`
  and Record id bound to `@context.props.id`; Portal navigate → Link to destination → `studio` with
  `id` = payload Record id.

## [1.1.0] - 2026-11-18

First working cut of React Portal: a Service Portal successor on Next Experience, where portals,
layouts, widgets and themes are records, widgets are written in TSX/JSX and compiled on the instance
when saved, and a React 19 host component renders them inside a single UI Builder page.

### Added
- **Data model (Fluent, 12 tables).** `portal`, `theme`, `component` (widgets, layouts and utilities in
  one table), `source_file`, `page`, `placement` (the spec's widget_instance), `build`, `build_asset`,
  `build_dep`, `release`, `release_entry` and `execution_log`. All but `execution_log` extend
  `sys_metadata`, so authored content and its compiled output travel in update sets. Default forms,
  unique indexes, choices and cascade rules on every table.
- **Components are one record with baseline fields**, like a Service Portal widget: `client_script`
  (compiled as `main.tsx`), `css`, `tailwind`, `script` (server), options schema/defaults, regions for
  layouts. Optional extra files (`source_file`) are imported with relative paths; `main.tsx`,
  `styles.css`, `server.js` and `theme.css` are reserved virtual names.
- **Server-side compiler (no WebAssembly).** `src/server/compiler/compiler.ts`: Sucrase for TSX/TS/JSX/JS,
  a small linker that bundles relative imports into one ES module and resolves `react`,
  `@portal/runtime`, `components:*` and `utilities:*` from the host registry, and Tailwind v4
  `compile()` for the classes used (shadcn token mapping, `dark:` keyed to the host) with the author's
  CSS appended after it. Vendor bundles in `src/server/compiler/vendor/` (`npm run vendor:compiler`).
- **Compile on save.** Business rules compile a component, theme or extra file when it changes, overwrite
  its single build record (`index.js` + `index.css`), and reprocess affected portals. A failed compile keeps
  serving the last good output and records file/line diagnostics on the build.
- **One build per component/theme and one release per portal.** The release holds the portal's compiled
  manifest (theme, layouts, pages, placements, asset URLs) and is reprocessed automatically when its
  inputs change; it is only written when the manifest actually changes. No release history: reverting an
  input reprocesses it.
- **Runtime REST API** `/api/x_312987_portal/rp`: `GET /portals/{slug}/bootstrap`, `POST /pages/resolve`,
  `POST /instances/initialize` (batch on-load), `POST /instances/{id}/execute`, and
  `GET /assets/{build}/{file}/raw` (immutable caching via a `?v=` content hash).
- **Studio REST API** `/api/x_312987_portal/rp_studio`: component/theme/portal listings, project read,
  revision-checked save, browser compile completion, preview context, and portal reprocess.
- **Component executor.** Runs a build's server script through `GlideScopedEvaluator` with `input`,
  `data`, `options`, `component` and `context` (`putVariable` / `getVariable`, the TurboForge pattern).
- **Security.** Roles `x_312987_portal.developer`, `.designer`, `.publisher`, `.admin` (contains the
  others); 52 table ACLs (consumers never read the tables directly) and REST endpoint ACLs; per-request
  portal and page access checks.
- **Automation.** 23 business rules (normalization, validation, scope inheritance for generated records,
  reprocess, compile), the `ReactPortal` Script Include bridge (`bootstrap`, `resolvePage`, `execute`,
  `compile`, `process`, `runMaintenance`), a nightly maintenance job, 8 system properties, and a
  React Portal application menu.
- **Host component `x-312987-portal-host`** (`packages/portal-host`, ui-component CLI): React 19 via
  `@quixomatic/ui-renderer-react-simple`, shadcn/ui on Base UI with Tailwind v4 in shadow DOM, TanStack
  Router (memory history: portal shell as the root route, pages as child routes) and TanStack Query, a
  module registry on `globalThis.__REACT_PORTAL__` for compiled widgets, layouts with regions and
  `RegionPortal`, per-widget error boundaries, theme token injection, and full-height layout framing.
- **Diagnostics.** A pinned pill that opens a drawer upward, plus `window.__RP_DIAG__()` with
  mark/since counters for mounts, renders, navigation, query cache, router and style events.
- **Demo seed.** `scripts/seed/components/` holds eight real TSX/JSX components (two layouts, header,
  sidebar, footer, a card with an extra file, an on-load server-script widget, a record detail with a
  header contribution); `node scripts/seed/build-seed.mjs` generates `scripts/seed-demo.js`, which
  creates the `sp` and `crm` portals.

### Internal
- **Versioning workflow.** `CHANGELOG.md`, `npm run version:bump` (`scripts/bump-version.mjs`, lockstep
  across the app, the host package, and the module paths in the Script Include and seed template), and
  the `version-bump` / `release-notes` skills ported from ChannelGuide. `CLAUDE.md` records the standing
  rules and instance gotchas.
- **`ignoreTransformTableList`** in `now.config.json` keeps a Fluent sync from pulling the CLI's UX
  records or portal content into source.
