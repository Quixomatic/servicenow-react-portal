---
name: release-notes
description: Cut a React Portal release — read every CHANGELOG entry since the last tag IN FULL, write an exhaustive categorized catalog into .release/patch-notes/vX.Y.Z.md as the starting draft, iterate on that file with James, distill the highlights last, then tag and publish on his explicit say-so.
---

# Release notes

Turns the granular running `CHANGELOG.md` into a polished, categorized GitHub Release body, then cuts the
tag. `CHANGELOG.md` stays the source of truth (per-task, written by `/version-bump`); this skill only
curates a per-release announcement from it. Ported from ChannelGuide / Airwave.

The release body lives in a file: `.release/patch-notes/vX.Y.Z.md`. (This repo has no release workflow
yet; on James's say-so the release is created from that file with `gh release create`. If a
`release-notes.yml` workflow is added later, it owns publishing instead.)

## The shape of the work

Catalog first, distill last, and **the draft file is the working surface from step one** — not chat.
Write the exhaustive catalog into the file immediately, let James review and request tweaks against
that file, and only pare it down to the headline highlights at the very end.

## Usage

```
/release-notes
```

Also triggered when James says "tag a release", "cut the release", or "draft release notes".

## Process

1. **Pin the version and the range.**
   - **Target version** = the top entry in `CHANGELOG.md`. Confirm the version files agree
     (`npm run version:bump -- patch --dry-run` shows the current version, or fails on a mismatch).
   - **From-tag** = the latest existing tag (`git tag --sort=-v:refname | head -1`), or the first commit
     if there are no tags yet. Show James the range and let him name a different start.
2. **Read the range IN FULL** — every `## [x.y.z]` block between the from-tag and the target, the actual
   bullets, not just the summaries.
3. **Write the exhaustive catalog straight to** `.release/patch-notes/v<target>.md`:
   - A top `<!-- WORKING DRAFT ... -->` comment.
   - `## Highlights` with a `_(TBD, distill last.)_` placeholder.
   - The full catalog under the taxonomy below, grouping multi-version arcs into one bullet each.
     Version refs like `(1.1.3)` are fine in the draft; strip them at finalize.
   - `**Full changelog:** https://github.com/Quixomatic/servicenow-react-portal/compare/<from>...v<target>`.
   - Em-dash-free from the start (it becomes user-facing copy).
4. **Iterate on the file with James.** Edit the FILE in place; keep the conversation about what to change.
5. **Distill the highlights LAST** — a 1–2 sentence intro plus the headline items.
6. **Finalize + commit** just that file: `docs: release notes for v<target>`. It must be committed before
   the tag so it exists at the tag.
7. **On James's explicit say-so:** `git tag v<target> <notes commit>`, `git push origin v<target>`, then
   `gh release create v<target> --notes-file .release/patch-notes/v<target>.md --title v<target>`.

## Format

- A 1–2 sentence **highlights** intro — written LAST.
- Categorized sections, omit any that are empty: `## New Features`, `## Improvements`, `## Fixes`,
  `## Under the hood` (optional), `## Platform` (ServiceNow release/plugin requirements),
  `## Breaking / Migration`. No emoji on headings.
- Tight, user-facing bullets. Dedupe items that repeated across patch versions; group related ones.
- End with the compare link.

## Rules

- **Catalog first, distill last.**
- **Only reorganize what is already in `CHANGELOG.md`.** Never invent features, fixes, or claims.
- **Never edit `CHANGELOG.md`** here — it is the source of truth.
- **No em dashes** in the notes (user-facing copy).
- **No commit trailers** (`Co-Authored-By`, session links).
- **Tag and publish only on explicit say-so.**
- **Trim internal churn** for the final pass: pure bump/chore plumbing goes under "Under the hood" or is dropped.

## Do not

- Do NOT draft the notes only in chat — the draft file is the working surface from step one.
- Do NOT create the tag before the notes file is written, finalized, and committed.
- Do NOT push to `main` with `--force`, and do NOT `--no-verify`.
