---
title: Release workflow and seed
description: Repository layout, building and installing the three deliverables, version bumps, the changelog, and the demo seed.
section: Platform internals
order: 6
tags: [internals, release, versioning, seed, tooling]
---

# Release workflow and seed

## Repository layout

| Path | What | Built with |
|---|---|---|
| `src/fluent/` | Tables, ACLs, roles, REST APIs, business rules, properties, menus (Fluent `.now.ts`) | `now-sdk build` / `install` |
| `src/server/` | Server modules (TypeScript): runtime, compiler, build, release, design, security | installed as `sys_module` records with the app |
| `src/shared/contracts.ts` | Wire types shared by server and host | |
| `src/client/` | A leftover template UI page (`x_312987_portal_incident_manager.do`), unrelated to React Portal | |
| `packages/portal-host/` | The host component and Studio | `pnpm run deploy` (ui-component CLI) |
| `packages/global-helpers/` | The global helper app | `now-sdk build` / `install` in its folder |
| `scripts/seed/` | Demo components, template and builder | `node scripts/seed/build-seed.mjs` |
| `docs/` | This guide and the primitives catalog | |

> **Note:** Use the globally installed `now-sdk` binary for every SDK command, not `npx @servicenow/sdk`.

## Deliverables and commands

| Deliverable | Command |
|---|---|
| Main app (`x_312987_portal`) | `npm run build && now-sdk install` |
| Host component | `cd packages/portal-host && pnpm run deploy` |
| Global helper app | `cd packages/global-helpers && now-sdk build && now-sdk install` |
| Compiler vendor bundles (after upgrading sucrase / tailwindcss) | `npm run vendor:compiler` |

## Server module paths and versions

The Fluent SDK installs every server module at

```text
x_312987_portal/x-312987-react-portal/<package.json version>/src/server/...
```

Generated business rules and REST routes pick up the new path on build, but two hand-written callers hardcode it: the `ReactPortal` Script Include (`MODULE_ROOT`) and the seed template. So **every version bump must be followed by a build and install**, or classic callers break.

Server modules import each other with explicit `.ts` extensions (`import { x } from '../lib/gr.ts'`): extensionless imports type-check but fail at runtime, because the instance's module resolver looks up the exact `sys_module` path.

## Version bump

```bash
npm run version:bump -- <patch|minor|major|X.Y.Z> [--dry-run]
```

`scripts/bump-version.mjs` sets every version file **in lockstep** with targeted edits, refuses to run if they're out of sync, then regenerates the seed:

| File | What |
|---|---|
| `package.json` | The app version (and the module path) |
| `packages/portal-host/package.json` | The host component |
| `packages/global-helpers/package.json` | The global helper app (then `npm install --package-lock-only` there) |
| `src/fluent/script-includes/ReactPortal.server.js` | `MODULE_ROOT` |
| `scripts/seed/seed-template.js` | The seed's module root |

Three segments only. The flow around it (`.claude/skills/version-bump`): write the `CHANGELOG.md` entry, build and install, smoke test, commit `<type>: vX.Y.Z — <narrative>` with the changelog entry as the body, push. Patch for fixes, minor for features, major for breaking changes. No git tags unless asked.

After a **manifest version** change, reprocess every portal once: `new x_312987_portal.ReactPortal().reprocessAll()`.

## The demo seed

```bash
node scripts/seed/build-seed.mjs          # writes scripts/seed-demo.js
now-sdk exec --file scripts/seed-demo.js  # creates / updates the demo on the instance
```

Each folder in `scripts/seed/components/<key>/` is one component:

| File | Becomes |
|---|---|
| `component.json` | `name`, `kind`, `tailwind`, `serverMode`, `regions`, `defaults` (→ `default_options_json`) |
| `main.tsx` / `main.jsx` | `client_script` (required) |
| `styles.css` | `css` |
| `server.js` | `script` |
| `options.schema.json` | `options_schema_json` |
| anything else | extra `source_file` rows (`.css` → style, else client) |

`scripts/seed/assets/<file>` is inlined as a data URI wherever the template says `__ASSET_DATA_URI:<file>__`.

The builder scans each folder's client sources for record imports (`components:app/<key>`, `utilities:app/<key>`) and **orders components by dependency**, because a compile rejects an import whose target has no successful build. Cycles and missing folders fail the build. The template (`seed-template.js`) upserts themes, components, portals, pages, placements and menus by key, deactivates (never deletes) menu items and placements it no longer defines, recompiles the import graph in dependency order and reprocesses each portal.

> **Warning:** Keep every component folder buildable (`main.tsx` + `component.json`) at all times: `npm run version:bump` regenerates the seed and fails on a half-built folder.

## Smoke checks

- The **Runtime Tests** page (`/site/sp/params/page-id/tests`) runs a live checklist of every runtime hook and `$sp` helper.
- `globalThis.__REACT_PORTAL__` in the browser shows which host build is served; redeploy if it's stale.

## Related

- [Compiler pipeline](compiler.md)
- [Global helper app](global-helper-app.md)
- [ReactPortal Script Include](../server-api/script-include.md)
