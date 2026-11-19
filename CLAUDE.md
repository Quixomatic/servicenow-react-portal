# React Portal — working notes for Claude

Service Portal successor on Next Experience: a Fluent / ServiceNow SDK app (repo root) plus a React 19
host component built with the ui-component CLI (`packages/portal-host`), both in scope `x_312987_portal`
on `dev189813`. The design spec lives in `.docs/React-Portal-Technical-Spec.md` (local, gitignored).

## Versioning and commits (standing rules)

- Follow `.claude/skills/version-bump` — **patch bump + CHANGELOG entry + commit + push after every
  completed task** (minor for new features, major for breaking). `npm run version:bump -- <tier>` edits
  the version files; you write the `CHANGELOG.md` entry.
- Commit subject `<type>: vX.Y.Z — <narrative>`, changelog entry as the body, **no commit trailers**.
- Never `git tag`, `--force`, or `--no-verify` without James saying so. Release notes: `.claude/skills/release-notes`.
- The app version is part of every server module path on the instance, so **build + install after each
  bump**: `npm run build && now-sdk install`.

## Tooling

- Use the **global `now-sdk`** (never `npx @servicenow/sdk`). Run the SDK orientation (`now-sdk explain …`)
  before touching Fluent code, per the now-sdk skill.
- Host component: `cd packages/portal-host && pnpm run deploy` (build:css, babel verify, `snc ui-component deploy`).
- Server compiler vendor bundles: `npm run vendor:compiler` after upgrading sucrase / tailwindcss.
- Demo data: edit `scripts/seed/components/<key>/`, then `node scripts/seed/build-seed.mjs` and
  `now-sdk exec --file scripts/seed-demo.js` (ask before running `exec` on the instance).

## Gotchas learned on the instance

- Server modules import each other with explicit `.ts` extensions (the platform resolver needs exact paths).
- Fluent `.now.ts` files: no loops, no shorthand properties, no shared variables in property values.
- `/api/...` URLs whose last segment has a file extension get the platform's 404 page — assets are served
  at `/assets/{build}/{file}/raw`.
- Scripted REST needs `X-UserToken`; browser `import()` can't send it, so the host fetches assets and
  imports them from Blob URLs.
- GlideScopedEvaluator: pass variables with `putVariable`, read results with `getVariable` (TurboForge pattern).
- `globalThis` is sealed in scoped scripts; Promise callbacks run when the outermost script finishes.
- Never delete a `Table()` / `BusinessRule()` / `Record()` from `.now.ts` without confirming with James
  (deletions propagate through `keys.ts`).
