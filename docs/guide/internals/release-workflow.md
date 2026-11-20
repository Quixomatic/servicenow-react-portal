---
title: Release workflow and seed
description: Repository layout, building and installing the three deliverables, version bumps, the changelog, seeding the demo (npm run seed, batch mode) and the reprocess cache.
section: Platform internals
order: 6
tags: [internals, release, versioning, seed, tooling]
---

# Release workflow and seed

React Portal ships three deliverables from one repository: the main scoped app, the host component and the global helper app. This page covers how they're built and installed, how a version bump keeps them in lockstep, and how the demo seed puts the demo components, portals and pages on an instance.

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
| Rich-text editor vendor bundle (after upgrading TipTap; the CLI's babel rejects its `@jsxImportSource` pragmas) | `cd packages/portal-host && pnpm run vendor:rte` |
| Host local dev server | `cd packages/portal-host && pnpm run dev` |
| Demo data | `npm run seed` (see [Seeding](#seeding)) |

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

## Seeding

The demo lives in `scripts/seed/`: one folder per component in `components/<key>/`, plus `seed-template.js`, which defines the themes, portals, pages, placements and menus. Two tools turn it into `now-sdk exec` runs:

| Tool | Use it for |
|---|---|
| `npm run seed` (`run-seed.mjs`) | Everyday seeding: diff against the instance, send only what changed |
| `node scripts/seed/build-seed.mjs` | Writing `scripts/seed-demo.js` for a manual `now-sdk exec` run; `npm run version:bump` uses it too |

Both share `scripts/seed/seed-lib.mjs` (loading, dependency ordering, rendering, the template hash).

### Component folders

Each folder in `scripts/seed/components/<key>/` becomes one `app/<key>` component:

| File | Becomes |
|---|---|
| `component.json` | `name`, `kind`, `tailwind`, `serverMode`, `regions`, `defaults` (→ `default_options_json`) |
| `main.tsx` / `main.jsx` | `client_script` (required) |
| `styles.css` | `css` |
| `server.js` | `script` |
| `options.schema.json` | `options_schema_json` |
| anything else | extra `source_file` rows (`.css` → style, else client) |

`scripts/seed/assets/<file>` is inlined as a data URI wherever the template says `__ASSET_DATA_URI:<file>__`.

The tools scan each folder's client sources for record imports (`components:app/<key>`, `utilities:app/<key>`) and **order components by dependency**, because a compile rejects an import whose target has no successful build. Cycles and missing folders fail the build. The template upserts themes, components, portals, pages, placements and menus by key. It deactivates (never deletes) menu items and placements it no longer defines.

> **Warning:** Keep every component folder buildable (`main.tsx` + `component.json`) at all times: `npm run version:bump` regenerates the seed and fails on a half-built folder.

### `npm run seed`

`scripts/seed/run-seed.mjs` treats the **instance as the source of truth**, so it keeps no local cache:

1. **Diff.** Read-only `now-sdk query` calls read every `app/*` component (the fields the seed writes), its `source_file` rows and its build. Both sides are normalised the way the seed's upsert compares them (canonical JSON, booleans as `1` / `true`, CRLF → LF) and hashed. A component is selected when it's missing, a field differs, a source file was added, changed or removed, or it has no build record yet.
2. **Components.** One `components` seed with just those components, in dependency order, split automatically into parts under the exec payload limit (default budget 1300 KB; the instance rejects payloads over about 1.5 MB). Intermediate parts don't reprocess.
3. **Portals.** The portals step (themes, portals, pages, menus, placements) runs only when the template changed. A portals or full run stores the template's hash in the property `x_312987_portal.seed.template_hash` when it finishes, and the runner compares it with the local template. The module-root line is ignored, so a version bump alone doesn't count.
4. **One reprocess.** Only the last exec reprocesses the portals. When nothing changed, the runner prints `nothing to seed` and runs nothing.
5. **Waiting.** Every exec carries a run id, which the seed writes into its `[seed] done (<mode>) run=<id>` syslog line (or `[seed] failed run=<id>` / `[seed] final reprocess failed run=<id>`). The runner polls syslog for that line before starting the next part, so runs never stack. An exec that times out, or reports "did not return a script execution response", may still be running: it's polled, never re-run.

| Flag | Effect |
|---|---|
| (none) | Seed what differs, then print counts and timings |
| `--dry-run` | Show the diff and the plan; run nothing |
| `--only a,b` | Just these component keys (no template check unless `--portals` is also given) |
| `--portals` | Force the portals step |
| `--all` | Every component plus the portals step (the old full seed), auto-split |
| `--reprocess` | Force the final reprocess even when nothing else runs |
| `--max-kb N` | Payload budget per exec (default `1300`) |
| `--wait-minutes N` | How long to poll for each run's done line (default `30`) |
| `--keep` | Keep the generated exec files instead of deleting them |
| `--docs` / `--no-docs` | Add the docs step to an `--only` run / skip it |
| `--docs-all` | Rewrite every doc page that isn't edited in Studio |
| `--docs-force` | Also overwrite pages edited in Studio (see [Docs pages](#docs-pages)) |

```bash
npm run seed -- --dry-run
npm run seed -- --only cart,cart-button
```

Builds in state `failed` are reported, not reseeded automatically (a broken component would otherwise rerun the seed every time). Instance components with no seed folder are listed as instance-only, never deleted. If a part fails, the earlier parts' records are written but the portals weren't reprocessed: fix the cause and rerun (add `--reprocess` if the diff is now empty).

### Docs pages

The docs step loads `docs/guide/` (Markdown with frontmatter, `_nav.json`, and the sidebar icons in `scripts/seed/docs-icons.json`) into the docs collection **`react-portal`** (see [Docs and collections](../studio/docs.md)):

- the collection row (`x_312987_portal_doc_collection`): created when it's missing, never updated, because its title, description and icon belong to the instance;
- one section row per `_nav.json` section (`x_312987_portal_doc_section`: title, slug, position × 100, and the section icon from `docs-icons.json`);
- one page row per listed file (`x_312987_portal_doc`), linked to its section.

The step reads and writes only this collection. Other collections are instance-only, and the seed never touches or deactivates them. (A repository folder per collection, such as `docs/<key>/` with its own `_nav.json`, could map to more collections later.)

The repository is canonical, but pages and sections can also be edited in Portal Studio's Docs activity. So that the seed never clobbers that work, every page and section row tracks what the seed last wrote:

- `content_hash`: a hash of the row's content. Studio saves and the seed compute it with the same code (`src/server/docs/docs-text.ts`; the seed imports it directly through Node's type stripping): `docHash` for pages, `sectionHash` for sections (slug, title, order, icon, active).
- `seed_hash`: the `content_hash` the seed last wrote or adopted.
- `origin`: `repo`, or `studio` for a page created in Studio that hasn't been pulled yet.

A page is **edited in Studio** when `origin = studio` or `content_hash ≠ seed_hash`. For each page, with L the repo's hash:

| Instance row | Seed action |
|---|---|
| `content_hash` = L | In sync. Adopt: stamp `seed_hash` only, when it differs |
| Not edited in Studio, L differs | Write (the repo changed) |
| Edited in Studio, L = `seed_hash` | Keep, and report "edited in Studio: run `npm run docs:pull`" |
| Edited in Studio, L ≠ `seed_hash` | **Conflict**: keep, and report. `--docs-force` overwrites it |
| No row | Insert |

Sections follow the same table, by slug. Rows that aren't in the repo are deactivated, never deleted, unless they were edited in Studio. Those are kept and reported.

A section rename or reorder in Studio edits only the section row. The page rows keep their legacy section strings ("as of the page's last content write"), so their hashes don't move. Pages already edited in Studio are refreshed with the section, so their pending edit still hashes like the repo after the pull. After the pull and commit, the next seed rewrites the other pages of that section, because their repo hash now carries the new title or position.

**Migration.** Rows from before doc collections have no section reference. The docs step links them to the section of their legacy `section_slug`, which also sets their collection, without touching content or hashes. A slug that no section has becomes a Studio section. The step is idempotent.

**`npm run docs:pull`** (`scripts/seed/docs-pull.mjs`) writes pages edited in Studio back into the repo:

- the `.md` file: the frontmatter (title, description, section, order and tags, other keys kept) and the stored Markdown byte for byte;
- the sections of `_nav.json` the pages are in or left, plus every section edited in Studio (title and position from the section rows);
- `docs-icons.json`, including an edited section's icon. That section's pages without their own entry keep the icon they show.

Pages deactivated in Studio leave `_nav.json`, and so do the pages of a section deactivated in Studio, but their files stay. The pull then checks that the repo hashes exactly like the instance. Commit, and the next seed adopts the pages.

```bash
npm run docs:pull -- --dry-run         # what would be written
npm run docs:pull                      # every page edited in Studio
npm run docs:pull -- --only concepts/layouts
npm run seed -- --only hello-card --docs --dry-run   # the docs plan alone
```

> **Note:** Studio normalises positions (page `order` and section `order` = position × 100, the numbers the seed derives from `_nav.json`), writing only the rows whose number changes. Moving a page marks the pages that shift in its sections as edited. Moving a section marks only the section rows.

### `build-seed.mjs`

```bash
node scripts/seed/build-seed.mjs                 # full seed → scripts/seed-demo.js
node scripts/seed/build-seed.mjs --only a,b      # just these components (still reprocesses once)
node scripts/seed/build-seed.mjs --part 1/3      # the 1st of 3 slices of the dependency order, no reprocess
node scripts/seed/build-seed.mjs --portals       # themes, portals, pages, menus and one reprocess
now-sdk exec --file scripts/seed-demo.js
```

A full seed is too big for one exec, so run it by hand as `--part 1/3`, `2/3`, `3/3`, then `--portals`. The builder warns when its output is over about 1.4 MB.

### Batch mode

Every seed runs as one batch. At the top of the script it sets two session flags, which the business rules read:

| Session flag | Suppresses |
|---|---|
| `x_312987_portal.skip_compile` | The compile-on-save rules |
| `x_312987_portal.skip_reprocess` | Per-write portal reprocessing (placement, page, menu and component rules, and `reprocessForOwner`) |

Which rule reads which flag is listed in [Business rules](business-rules.md#batch-mode-session-flags).

Inside the batch, each changed component compiles **once**, in dependency order. Placement instance CSS still compiles: the placement rule only defers the reprocess, and the seed also refreshes the CSS of every placement it wrote. Then the flags are cleared and each active portal reprocesses once, writing a new release only when the manifest hash changed. Upserts compare values ignoring platform formatting (booleans, JSON key order, CRLF), so unchanged records aren't rewritten.

The `[seed] done` line reports records written, components compiled, up to date and failed, portals reprocessed, per-table write counts, each portal's release revision and problems, and per-phase timings. The same flags serve other multi-record writes: a Studio save sets `skip_compile` and compiles once at the end, and a page-designer write sets `skip_reprocess` and reprocesses once at the end.

> **Warning:** When you add a business rule that runs during a seed, check whether it should honour the batch flags. An instance-CSS rule was once gated on `skip_reprocess` and silently stopped compiling.

### The reprocess cache

Assembling a portal's manifest looks up the same components, builds, entry assets and import edges many times. `assembleManifest` wraps the work in `withRegistryCache` (`src/server/registry/registry.ts`), which memoizes those registry lookups for one call and drops them at the end. It holds registry records only, nothing user-specific, and nested calls share the outer cache.

This made reprocessing about 40 times faster (sp went from about 60 s and 55,662 queries to about 1.4 s and 546 queries) with byte-identical manifests. Every seed, Studio save and designer save benefits.

> **Note:** Use it only around read-only work: a build written inside the callback isn't seen by later lookups.

## Smoke checks

- The **Runtime Tests** page (`/site/sp/params/page-id/tests`) runs a live checklist of every runtime hook and `$sp` helper.
- `globalThis.__REACT_PORTAL__` in the browser shows which host build is served; redeploy if it's stale.

## Related

- [Compiler pipeline](compiler.md)
- [Global helper app](global-helper-app.md)
- [ReactPortal Script Include](../server-api/script-include.md)
