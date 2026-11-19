# Changelog

All notable changes to React Portal are documented here.

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
