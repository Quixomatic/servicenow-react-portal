---
name: session-summary
description: Before a compaction (or at the end of a big arc), write an extreme-detail dated session summary to .docs/summaries/ and refresh ONLY the "Where we are" block of .docs/RESUME_PROMPT.md, so a fresh context can pick up exactly where this one left off. Invoke with /session-summary.
---

# Session summary

Captures everything a fresh context needs after compaction. Two outputs:

1. A **new dated summary** in `.docs/summaries/` (never edit old ones; add a new file per session or big arc).
2. The **"Where we are" block** of `.docs/RESUME_PROMPT.md` — only the text between
   `<!-- STATE:BEGIN … -->` and `<!-- STATE:END -->`. Everything outside the markers is stable; leave it alone
   unless a standing rule or the read list genuinely changed (then say so to James).

`.docs/` is gitignored (local only). Nothing here is committed; no version bump.

## Usage

```
/session-summary [optional focus or slug hint]
```

Also run it unprompted when the context is getting long or right after finishing a big arc (a release,
a new subsystem), before James asks.

## Step 1 — Gather facts (don't write from memory alone)

Run these and use the output; the summary must match reality:

- `git log --oneline -15`, `git status --short`, `git diff --stat` (what's uncommitted = in flight).
- `CHANGELOG.md` entries since the previous summary (versions + what each shipped).
- Current version (`package.json`), and whether the instance matches (last `now-sdk install`).
- `ls .docs/summaries` — find the previous summary to state what this one continues from.
- `ListAgents` — which helper agents exist and what they're doing (name them by role; note they can be
  resumed with SendMessage).
- Anything verified live this session (browser checks, exec smoke tests) vs only locally/mock.
- New gotchas learned on the instance, new decisions James made, preferences he expressed, ids/sys_ids,
  URLs, file paths, scripts created (and where they live, e.g. scratchpad).

## Step 2 — Write the summary

Path: `.docs/summaries/YYYY-MM-DD-<kebab-slug-of-main-topics>-v<first>-<last>.md` (date = session start; slug names
the 3–6 main arcs; version range shipped, e.g. `v1_3_1-1_4_2`). If one session already has a summary and work
continued, write a new file for the new arc rather than rewriting the old one.

Required sections, in this order (omit a section only if truly empty):

```markdown
# Session summary — <start date> → <end date>

<2–5 sentence framing: what this session continued from (link previous summary), the arc of the work,
and the one-line state at the end — including anything IN FLIGHT and uncommitted.>

---

## Versions shipped this session
| Version | Commit | What |   ← every bump, plus "(next) vX.Y.Z — in flight" rows

## Environment / identities           ← only what changed or is needed to act: instance, app ids, UI Builder
                                         page setups + params/bindings, portal/page sys_ids, ports, helper
                                         scripts + paths, dev servers left running, credentials notes (no secrets)

## Architecture / design changes      ← what was built or changed and WHY (decisions + who decided, alternatives
                                         rejected), new tables/fields/endpoints/modules/components with paths

## Gotchas discovered                 ← numbered; symptom → cause → fix; anything that bit us on the instance or
                                         in tooling (also save durable ones as memories)

## Workstream log (chronological)     ← numbered arcs; what James asked (quote short phrases when they define
                                         intent), what was done, what broke, how it was verified (live vs mock)

## State at end / NEXT STEPS          ← exact uncommitted files/areas, what's deployed vs not, the precise next
                                         action, open offers awaiting James's answer, known gaps/tech debt

## James's preferences observed       ← working-style notes worth carrying forward (keep it factual)
```

Style: extreme detail but scannable — tables and short bullets, exact paths/ids/commands, numbers with units.
Write what a capable engineer with ZERO context needs to continue without asking James anything. Don't pad,
don't editorialize, don't paste large code (point to files).

## Step 3 — Refresh the resume prompt's state block

In `.docs/RESUME_PROMPT.md`, replace only the content between the STATE markers with:

```markdown
_Updated YYYY-MM-DD._
- **Latest summary:** `.docs\summaries\<new file>.md`
- **Last shipped:** vX.Y.Z (`<hash>`, pushed?; tags?). Instance runs <version + any uncommitted installs>.
- **In flight:** <what's mid-way, who's doing it (agent role), what's done vs not>
- **Next step:** <the single next concrete action, then what follows>
- **Open offers to James:** <questions/offers awaiting his answer>
```

Keep it to these bullets (≤ ~12 lines). Use the Edit tool on the exact marker block; verify both markers survive.

## Step 4 — Durable rules

If the session produced a durable rule, preference or instance gotcha, save it as a **memory** (one fact per file,
indexed in MEMORY.md; update an existing memory rather than duplicating). James doesn't use CLAUDE.md — never
create one.

## Step 5 — Confirm

Tell James in 2–3 lines: the summary path, that the resume prompt state block is updated, and that he can
compact and paste `.docs/RESUME_PROMPT.md` (everything below its `---`) to resume.

## Do not

- Do NOT rewrite older summaries or the stable parts of the resume prompt.
- Do NOT commit `.docs/` (it's gitignored) or bump the version for this skill alone.
- Do NOT record secrets (passwords, tokens, credential file contents).
- Do NOT write the summary from memory without running Step 1.
