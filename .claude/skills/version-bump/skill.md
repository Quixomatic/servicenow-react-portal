---
name: version-bump
description: Cut a new React Portal release — bump every version file in lockstep (npm run version:bump), write a CHANGELOG.md entry, build + install so the instance matches, commit with the changelog entry as the commit body, and push. Patch bump after every completed task by default.
---

# Version Bump

Cuts a new release of React Portal: bumps every version file in lockstep, writes a `CHANGELOG.md`
entry, commits with the changelog entry as the message body, and pushes. Ported from the
ChannelGuide / Airwave golden-standard flow.

## Usage

```
/version-bump <patch|minor|major> <short-narrative>
```

Examples:
```
/version-bump patch fix asset URL 404 on .js segments
/version-bump minor add light/dark/system theme mode
/version-bump major change the component build record format
```

If the user just says "do a version bump" with no tier, infer it from the diff:

- **patch** (x.y.Z) — bug fix, copy tweak, dep bump, narrow refactor.
- **minor** (x.Y.0) — new feature, new table/API/surface, additive schema change.
- **major** (X.0.0) — breaking change, removed surface, incompatible schema or runtime contract.

**Exactly three segments. Never a fourth** (no `1.1.0.1`). If a patch grows too big, ship the full
scope under its `x.y.z`, or roll the leftover into the NEXT `x.y.z` — never a sub-version.

## The bump command (use this — don't hand-edit)

```
npm run version:bump -- <patch|minor|major|X.Y.Z> [--dry-run]
```

`scripts/bump-version.mjs` sets every version file in lockstep with TARGETED edits and refuses to run if
they're out of sync (it surfaces the mismatch instead of normalizing). `--dry-run` previews.

### Version files (what the script touches)

| File | What |
| --- | --- |
| `package.json` | The Fluent app version. **It is part of every server module path** on the instance: `x_312987_portal/x-312987-react-portal/<version>/src/server/...` |
| `packages/portal-host/package.json` | The Next Experience host component (ui-component CLI) |
| `src/fluent/script-includes/ReactPortal.server.js` | `ReactPortal.MODULE_ROOT` hardcodes the module path above |
| `scripts/seed/seed-template.js` | The seed's `ROOT` module path (the script also regenerates `scripts/seed-demo.js`) |

Generated business rules and REST routes pick up the new module path automatically on build. Because the
paths move, **build and install after every bump** so the instance matches the commit:

```
npm run build && now-sdk install
```

If the host package changed in the same task, also deploy it: `cd packages/portal-host && pnpm run deploy`.

The script edits version files ONLY. **You still** write the CHANGELOG entry, build/install, commit, and
push (and never `git tag` unless James says so).

## Instructions

1. **Read `CHANGELOG.md`** to find the most recent version (top entry).
2. **Determine the new version** from the requested tier and the previous version.
3. **Confirm sync** with `npm run version:bump -- <tier> --dry-run`. If it reports a mismatch, STOP and tell
   James — it may be intentional or a botched prior bump. Do not silently normalize.
4. **Inspect the staged + unstaged diff** (`git status`, `git diff`, `git diff --staged`) to understand
   what's actually shipping. Do not write the entry from the narrative alone.
5. **Draft the `## [X.Y.Z] - YYYY-MM-DD` entry** in the established format:

   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   <one short paragraph framing what this release is about>

   ### Added | Changed | Fixed | Internal | Breaking / Migration
   - **<Bold lead-in.>** <concrete change — name files / tables / endpoints / components>
   ```

   Use only the sections that apply. Insert the new entry at the top, above the previous top entry.
6. **Show James the proposed entry** before writing it, unless told to proceed autonomously (the
   per-task cadence below counts as autonomous).
7. **Apply:** `npm run version:bump -- <tier|X.Y.Z>`, then write the `CHANGELOG.md` entry.
8. **Build + install:** `npm run build && now-sdk install` (global `now-sdk`, never `npx`). Fix any
   failure before committing.
9. **Commit and push:**
   - Stage the intended files (never `.claude/settings.local.json`, `.docs/`, `.plans/`, secrets).
   - Subject: `<type>: vX.Y.Z — <short narrative>` — `feat` (minor), `fix` (patch),
     `chore`/`refactor`/`docs`/`revert` as appropriate. Lowercase after the colon, imperative, ≤72 chars,
     em dash between version and narrative.
   - The changelog entry as the message body, via HEREDOC. **No commit trailers** (no
     `Co-Authored-By`, no session links).
   - `git push` to the current branch's tracked remote.
10. **Confirm** the new version, commit hash, and remote link.

## Cadence

During multi-task work, do a **patch bump + commit + push after EACH completed task** — not batched at the
end. Once cadence is established in a session, run it autonomously per task; show the CHANGELOG entry
only if non-trivial or risky.

## Do not

- Do NOT `git commit --amend` a bump into a prior commit unless asked.
- Do NOT hand-edit version files when the script can do it. Never global-replace a version string.
- Do NOT `--no-verify`. Fix the underlying issue instead.
- Do NOT push to `main` with `--force` under any circumstance.
- Do NOT propose a fourth version segment.
- Do NOT `git tag` on your own initiative — tags are James's explicit call every time.
