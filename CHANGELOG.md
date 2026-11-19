# Changelog

All notable changes to React Portal are documented here.

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
