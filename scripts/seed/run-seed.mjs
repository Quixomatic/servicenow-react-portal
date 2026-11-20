// npm run seed: diff-based demo seed. The instance is the source of truth (several agents seed it),
// so nothing is cached locally:
//   1. Read every app/* component, its source_file rows and builds with read-only `now-sdk query`
//      calls, normalise both sides exactly like the seed's upsert/sameValue (canonical JSON, booleans
//      as 1/true, CRLF → LF), hash them, and select the components that differ, are missing, have
//      different/extra/missing source files, or have no build record yet.
//   2. Render a 'components' seed with just those (dependency order), split into parts under the
//      exec payload limit (~1.5 MB hard; default budget 1300 KB). Intermediate parts don't reprocess.
//   3. Run the --portals step when x_312987_portal.seed.template_hash (written by the seed at the end
//      of a portals/full run) differs from the template's hash, or when forced.
//   4. Exactly one reprocess: the last exec does it. Nothing changed → nothing runs.
//   5. After each exec, poll syslog for that run's "[seed] done ... run=<id>" line before the next
//      one; an exec that times out or "did not return a script execution response" may still be
//      running, so it is polled, never re-run.
// Flags: --dry-run  --all  --only a,b  --portals  --reprocess  --max-kb N  --wait-minutes N  --keep
import { spawn, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { here, loadComponents, loadTemplate, templateHash, renderSeed, newRunId, bytes } from './seed-lib.mjs'
// Docs step (docs/guide → x_312987_portal_doc): diff by content_hash, before the component parts.
// Skipped with --no-docs, and on --only runs unless --docs is given; --docs adds it (diff-based) to an --only run; --docs-all rewrites every page.
// Pages edited in Studio (content_hash ≠ seed_hash) are never overwritten unless --docs-force: classifyDocs in docs-lib.mjs.
import { loadDocs, renderDocsSeed, classifyDocs } from './docs-lib.mjs'

const repoRoot = join(here, '..', '..')
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const valueOf = (name) => {
    const a = argv.find((x) => x === name || x.startsWith(name + '='))
    if (!a) return null
    return a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[argv.indexOf(a) + 1] || ''
}
// Unknown flags must never fall through to a real seed (a stray --help once ran one).
const KNOWN_FLAGS = ['--dry-run', '--all', '--portals', '--reprocess', '--keep', '--only', '--max-kb', '--wait-minutes', '--docs', '--docs-all', '--docs-force', '--no-docs']
if (flag('--help') || flag('-h')) {
    console.log(`npm run seed -- [flags]
  --dry-run          show the diff and the plan, run nothing
  --all              every component + portals (auto-split)
  --only a,b         just these components (skips the template check unless --portals)
  --portals          force the portals step (pages, menus, placements, themes)
  --reprocess        force a final reprocess even when nothing else runs
  --docs / --docs-all / --no-docs   docs step: diff-based / rewrite all / skip
  --docs-force       docs step that also overwrites pages edited in Studio (see npm run docs:pull)
  --max-kb N         payload budget per exec (default 1300)
  --wait-minutes N   how long to wait on a run that didn't answer (default 30)
  --keep             keep the generated part files`)
    process.exit(0)
}
const unknownFlags = argv.filter((a) => a.startsWith('-') && !KNOWN_FLAGS.includes(a.split('=')[0]))
if (unknownFlags.length) {
    console.error('Unknown flag(s): ' + unknownFlags.join(', ') + ' (see --help). Nothing was run.')
    process.exit(1)
}
const DRY = flag('--dry-run')
const ALL = flag('--all')
const FORCE_PORTALS = flag('--portals') || ALL
const FORCE_REPROCESS = flag('--reprocess')
const KEEP = flag('--keep')
const onlyKeys = valueOf('--only') === null ? null : valueOf('--only').split(',').map((s) => s.trim()).filter(Boolean)
const MAX_BYTES = Number(valueOf('--max-kb') || 1300) * 1024
const WAIT_MS = Number(valueOf('--wait-minutes') || 30) * 60000
const PROPERTY = 'x_312987_portal.seed.template_hash'
const T = 'x_312987_portal_'

const t0 = Date.now()
const secs = (ms) => (ms / 1000).toFixed(1) + 's'
const log = (...a) => console.log(...a)

/* ---------------- now-sdk (spawned via node, no shell: encoded queries carry ^) ---------------- */

function sdkEntry() {
    const rel = join('node_modules', '@servicenow', 'sdk', 'bin', 'index.js')
    const candidates = [join(dirname(process.execPath), rel), join(dirname(process.execPath), '..', 'lib', rel)]
    try {
        candidates.push(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), '@servicenow', 'sdk', 'bin', 'index.js'))
    } catch (e) {}
    const found = candidates.find((p) => existsSync(p))
    if (!found) throw new Error('Global now-sdk not found (looked in ' + candidates.join(', ') + ')')
    return found
}
const SDK = sdkEntry()

function sdk(args, { echo = false } = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [SDK, ...args], { cwd: repoRoot, windowsHide: true })
        let out = ''
        let err = ''
        child.stdout.on('data', (d) => {
            out += d
            if (echo) process.stdout.write(d)
        })
        child.stderr.on('data', (d) => {
            err += d
            if (echo) process.stderr.write(d)
        })
        child.on('close', (code) => resolve({ code, out, err }))
    })
}

/** All records of a read-only query, paged (ordered by sys_id so offsets are stable). */
async function query(table, q, fields, pageSize = 100) {
    const records = []
    let offset = 0
    for (;;) {
        const r = await sdk(['query', table, '-q', q + '^ORDERBYsys_id', '-f', fields.join(','), '--limit', String(pageSize), '--offset', String(offset), '--no-count', '--timeout', '120000', '-o', 'json'])
        let j
        try {
            j = JSON.parse(r.out)
        } catch (e) {
            throw new Error(`now-sdk query ${table} failed (exit ${r.code}): ${(r.err || r.out).slice(0, 800)}`)
        }
        if (!j.ok) throw new Error(`now-sdk query ${table} failed: ${JSON.stringify(j).slice(0, 800)}`)
        records.push(...j.records)
        if (!j.hasMore || !j.records.length) return records
        offset = j.nextOffset != null ? j.nextOffset : offset + j.records.length
    }
}

/* ---------------- Normalisation (mirrors upsert/sameValue in seed-template.js) ---------------- */

function canonical(x) {
    if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']'
    if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}'
    return JSON.stringify(x)
}
const lf = (s) => s.replace(/\r\n/g, '\n')
// The wanted value as upsert writes it, reduced to the form sameValue compares.
function normWanted(v) {
    if (typeof v === 'boolean') return 'b:' + v
    if (v !== null && typeof v === 'object') return 'j:' + canonical(v)
    return 't:' + lf(v === null || v === undefined ? '' : String(v))
}
// The stored value, read the way sameValue reads it against that wanted value.
function normStored(stored, wanted) {
    const cur = stored === null || stored === undefined ? '' : String(stored)
    if (typeof wanted === 'boolean') return 'b:' + (cur === '1' || cur === 'true')
    if (wanted !== null && typeof wanted === 'object') {
        try {
            return 'j:' + canonical(JSON.parse(cur || 'null'))
        } catch (e) {
            return 't:' + lf(cur)
        }
    }
    return 't:' + lf(cur)
}

// The component fields the seed upserts (keep in step with the "Components" block of the template).
function wantedFields(key, c) {
    return {
        name: c.meta.name,
        namespace: 'app',
        key,
        kind: c.meta.kind,
        active: true,
        placeable: c.meta.kind === 'widget',
        server_mode: c.meta.serverMode || 'none',
        tailwind: c.meta.tailwind !== false,
        client_script: c.clientScript,
        css: c.css || '',
        script: c.serverScript || '',
        regions_json: c.meta.regions || '',
        default_options_json: c.meta.defaults || {},
        options_schema_json: c.optionsSchema || '',
    }
}
const FIELDS = Object.keys(wantedFields('x', { meta: {} }))
const sha = (s) => createHash('sha256').update(s).digest('hex')

function sideHashes(key, c, rec, files) {
    const want = wantedFields(key, c)
    const local = { fields: {}, files: {} }
    const remote = { fields: {}, files: {} }
    for (const f of FIELDS) {
        local.fields[f] = normWanted(want[f])
        remote.fields[f] = rec ? normStored(rec[f], want[f]) : null
    }
    for (const f of c.extraFiles) local.files[f.path] = normWanted(f.target) + '\u0000' + normWanted(f.content)
    for (const f of files) remote.files[f.path] = normStored(f.target, '') + '\u0000' + normStored(f.content_text, '')
    return { local, remote, localHash: sha(canonical(local)), remoteHash: sha(canonical(remote)) }
}

/* ---------------- Diff ---------------- */

async function readInstance() {
    const [comps, files, builds, props] = await Promise.all([
        query(T + 'component', 'namespace=app', ['sys_id', 'unique_id'].concat(FIELDS)),
        query(T + 'source_file', 'component.namespace=app', ['sys_id', 'component', 'path', 'target', 'content_text'], 200),
        query(T + 'build', 'component.namespace=app', ['sys_id', 'component', 'state', 'last_error', 'compiler_version'], 200),
        query('sys_properties', 'name=' + PROPERTY, ['name', 'value']),
    ])
    return { comps, files, builds, markerHash: props.length ? props[0].value : '' }
}

function diffComponents(ordered, inst) {
    const byKey = {}
    for (const r of inst.comps) byKey[r.key] = r
    const filesById = {}
    for (const f of inst.files) (filesById[f.component] = filesById[f.component] || []).push(f)
    const buildById = {}
    for (const b of inst.builds) buildById[b.component] = b
    const changed = []
    const warnings = []
    for (const key of Object.keys(ordered)) {
        const rec = byKey[key]
        const files = rec ? filesById[rec.sys_id] || [] : []
        const h = sideHashes(key, ordered[key], rec, files)
        const reasons = []
        if (!rec) reasons.push('new')
        else if (h.localHash !== h.remoteHash) {
            const fields = FIELDS.filter((f) => h.local.fields[f] !== h.remote.fields[f])
            if (fields.length) reasons.push('fields: ' + fields.join(', '))
            const fileNotes = []
            for (const p of Object.keys(h.local.files)) if (!(p in h.remote.files)) fileNotes.push('+' + p)
            else if (h.local.files[p] !== h.remote.files[p]) fileNotes.push('~' + p)
            for (const p of Object.keys(h.remote.files)) if (!(p in h.local.files)) fileNotes.push('-' + p)
            if (fileNotes.length) reasons.push('files: ' + fileNotes.join(' '))
        }
        const build = rec && buildById[rec.sys_id]
        if (rec && !build) reasons.push('no build')
        else if (build && build.state === 'failed') warnings.push(`${key}: build failed (${(build.last_error || '').slice(0, 120)}) — not reseeded automatically; fix it or --only ${key}`)
        if (reasons.length) changed.push({ key, reasons })
    }
    const stale = inst.comps.filter((r) => !ordered[r.key]).map((r) => r.unique_id + (r.active === 'true' || r.active === '1' ? '' : ' (inactive)'))
    return { changed, warnings, stale }
}

/* ---------------- Plan ---------------- */

function splitParts(keys, ordered, template) {
    const runId = 'x'.repeat(40)
    const base = bytes(renderSeed({ mode: 'components', components: {}, reprocess: true, runId, template }))
    const parts = []
    let cur = []
    let size = base
    for (const key of keys) {
        const s = bytes(JSON.stringify({ [key]: ordered[key] }, null, 1)) + 64
        if (base + s > MAX_BYTES) throw new Error(`${key} alone is ${(s / 1024).toFixed(0)} KB, over the ${MAX_BYTES / 1024} KB budget`)
        if (cur.length && size + s > MAX_BYTES) {
            parts.push(cur)
            cur = []
            size = base
        }
        cur.push(key)
        size += s
    }
    if (cur.length) parts.push(cur)
    return parts
}

/* ---------------- Exec + wait ---------------- */

async function syslogFor(runId, sinceMs) {
    const minutes = Math.ceil((Date.now() - sinceMs) / 60000) + 3
    return query('syslog', `sys_created_on>=javascript:gs.minutesAgoStart(${minutes})^messageLIKE${runId}`, ['sys_created_on', 'level', 'message'])
}

async function runStep(step, index, total) {
    const label = `step ${index}/${total} (${step.mode}${step.keys.length ? ', ' + step.keys.length + ' components' : ''}${step.reprocess ? ', reprocess' : ''})`
    const file = join(tmpdir(), 'react-portal-seed', step.runId + '.js')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, step.script)
    log(`\n>> ${label}: run ${step.runId}, ${(bytes(step.script) / 1024).toFixed(0)} KB`)
    const started = Date.now()
    const r = await sdk(['exec', '--file', file, '--reason', `npm run seed ${step.runId} (${step.mode})`], { echo: false })
    const text = (r.out + '\n' + r.err).trim()
    const noResponse = /did not return a script execution response|timed?\s*out|timeout|ETIMEDOUT|ECONNRESET|socket hang up/i.test(text)
    if (r.code === 0) log(`   exec returned after ${secs(Date.now() - started)}`)
    else log(`   exec exit ${r.code} after ${secs(Date.now() - started)}${noResponse ? ' (no response: may still be running, polling)' : ''}:\n   ${text.split('\n').slice(-6).join('\n   ')}`)
    // Exec returned cleanly: the done line is already (or about to be) in syslog. No response: the
    // script may still be running server-side. Other errors: give it a short grace, then fail.
    const budget = r.code === 0 ? 3 * 60000 : noResponse ? WAIT_MS : 2 * 60000
    let lastNote = 0
    for (;;) {
        const lines = await syslogFor(step.runId, started)
        const done = lines.find((l) => l.message.startsWith('[seed] done'))
        const failed = lines.find((l) => /^\[seed\] (final reprocess failed|failed)/.test(l.message))
        if (failed) {
            if (!KEEP) unlinkSync(file)
            throw new Error(`${label} failed: ${failed.message.slice(0, 1500)}`)
        }
        if (done) {
            if (!KEEP) unlinkSync(file)
            return { label, ms: Date.now() - started, message: done.message }
        }
        if (Date.now() - started > budget) throw new Error(`${label}: no "[seed] done run=${step.runId}" in syslog after ${secs(Date.now() - started)}. Not re-running; check syslog / Script Execution History. Seed file: ${file}`)
        if (Date.now() - lastNote > 60000) {
            log(`   waiting for [seed] done run=${step.runId} … ${secs(Date.now() - started)}`)
            lastNote = Date.now()
        }
        await new Promise((res) => setTimeout(res, 10000))
    }
}

function printDone(message) {
    // "[seed] done (mode) run=<id>: <counts> | <portal revisions> | <timings>"
    const body = message.slice(message.indexOf(': ') + 2)
    const [counts, revs, times] = body.split(' | ')
    log('   ' + counts)
    if (revs) log('   portals: ' + revs)
    if (times) log('   timings: ' + times)
    const m = counts.match(/(\d+) failed/)
    if (m && Number(m[1]) > 0) log('   WARNING: compiles failed; see the "[seed] compiles" syslog line')
}

/* ---------------- Docs ---------------- */

/**
 * Docs steps: rows of docs/guide whose content_hash differs from the instance (or are missing or
 * inactive there), and instance pages that left the guide (deactivated, never deleted). Split under
 * the exec budget. Returns [] when skipped, unchanged, or the doc table isn't installed yet.
 */
async function planDocs() {
    if (flag('--no-docs') || (onlyKeys && !flag('--docs') && !flag('--docs-all') && !flag('--docs-force'))) return []
    // Never fatal for the rest of the seed: a broken docs tree only skips the docs step.
    let loaded
    try {
        loaded = loadDocs()
    } catch (e) {
        log(`\nDocs: skipped, docs/guide couldn't be loaded: ${String(e.message).slice(0, 200)}`)
        return []
    }
    const { docs, unlisted, missing } = loaded
    if (missing.length) log(`\nDocs: _nav.json lists missing files (skipped): ${missing.join(', ')}`)
    let remote
    try {
        remote = await query(T + 'doc', 'pathISNOTEMPTY', ['path', 'content_hash', 'active', 'seed_hash', 'origin'], 200)
    } catch (e) {
        log(`\nDocs: skipped, x_312987_portal_doc isn't readable (install the app first?): ${String(e.message).slice(0, 160)}`)
        return []
    }
    const plan = classifyDocs(docs, remote, { all: flag('--docs-all'), force: flag('--docs-force') })
    const changed = plan.write
    const deactivate = plan.deactivate
    const adopt = plan.adopt
    log(`
Docs: ${Object.keys(docs).length} pages in docs/guide, ${remote.length} on the instance → ${changed.length} to write, ${adopt.length} to adopt, ${deactivate.length} to deactivate`)
    if (unlisted.length) log(`  Not in _nav.json (not seeded): ${unlisted.join(', ')}`)
    if (changed.length && changed.length <= 12) log(`  ${changed.join(', ')}`)
    if (adopt.length && adopt.length <= 12) log(`  adopt (already matches the repo, stamp only): ${adopt.map((a) => a.path).join(', ')}`)
    if (plan.forced.length) log(`  --docs-force OVERWRITES Studio edits: ${plan.forced.join(', ')}`)
    if (plan.studioEdited.length) log(`  Edited in Studio, kept (run npm run docs:pull, then commit): ${plan.studioEdited.join(', ')}`)
    if (plan.conflicts.length) log(`  CONFLICT, kept: changed in the repo AND in Studio (docs:pull to compare, or --docs-force to overwrite): ${plan.conflicts.join(', ')}`)
    if (plan.studioOnly.length) log(`  Studio pages not in the repo, kept (run npm run docs:pull): ${plan.studioOnly.join(', ')}`)
    if (!changed.length && !deactivate.length && !adopt.length) return []
    const base = bytes(renderDocsSeed({ rows: [], deactivate, adopt, runId: 'x'.repeat(40) }))
    const parts = []
    let cur = []
    let size = base
    for (const p of changed) {
        const s = bytes(JSON.stringify(docs[p])) + 8
        if (cur.length && size + s > MAX_BYTES) {
            parts.push(cur)
            cur = []
            size = base
        }
        cur.push(p)
        size += s
    }
    if (cur.length || !parts.length) parts.push(cur)
    return parts.map((paths, i) => {
        const runId = newRunId('rs-docs') + (i ? '-' + (i + 1) : '')
        const dea = i === 0 ? deactivate : []
        const ado = i === 0 ? adopt : []
        return {
            mode: `docs ${paths.length} pages${ado.length ? ', ' + ado.length + ' adopted' : ''}${dea.length ? ', ' + dea.length + ' deactivated' : ''}`,
            keys: [],
            reprocess: false,
            runId,
            script: renderDocsSeed({ rows: paths.map((p) => docs[p]), deactivate: dea, adopt: ado, runId }),
        }
    })
}

/* ---------------- Main ---------------- */

async function main() {
    const ordered = loadComponents()
    const template = loadTemplate()
    const tHash = templateHash(template)
    if (onlyKeys) {
        const unknown = onlyKeys.filter((k) => !ordered[k])
        if (unknown.length) throw new Error(`--only: no seed folder for ${unknown.join(', ')}`)
    }

    log(`Reading app/* components, source files and builds from the instance…`)
    const inst = await readInstance()
    const diff = diffComponents(ordered, inst)
    log(`  ${inst.comps.length} components, ${inst.files.length} source files, ${inst.builds.length} builds on the instance; ${Object.keys(ordered).length} local folders (${secs(Date.now() - t0)})`)

    if (diff.changed.length) {
        log(`\nChanged components (${diff.changed.length}):`)
        for (const c of diff.changed) log(`  ${c.key.padEnd(24)} ${c.reasons.join('; ')}`)
    } else log('\nComponents: instance matches every local folder.')
    for (const w of diff.warnings) log('  WARNING ' + w)
    if (diff.stale.length) log(`  Instance-only (no seed folder; never deleted): ${diff.stale.join(', ')}`)

    const templateChanged = inst.markerHash !== tHash
    log(`\nTemplate: ${tHash} vs instance marker ${inst.markerHash || '(none)'} → ${templateChanged ? 'changed' : 'unchanged'}`)

    // Selection.
    let keys = ALL ? Object.keys(ordered) : onlyKeys ? Object.keys(ordered).filter((k) => onlyKeys.includes(k)) : diff.changed.map((c) => c.key)
    keys = Object.keys(ordered).filter((k) => keys.includes(k)) // dependency order
    const portals = FORCE_PORTALS || (!onlyKeys && templateChanged)

    const parts = splitParts(keys, ordered, template)
    const steps = parts.map((p) => ({ mode: 'components', keys: p }))
    if (portals) steps.push({ mode: 'portals', keys: [] })
    if (!steps.length && FORCE_REPROCESS) steps.push({ mode: 'components', keys: [] })
    // Docs: their own exec(s), first, never reprocessing (docs aren't in any manifest).
    const docSteps = await planDocs()
    steps.forEach((s, i) => {
        s.reprocess = i === steps.length - 1
        s.runId = newRunId('rs')
        if (i > 0) s.runId += '-' + (i + 1)
        const comps = {}
        for (const k of s.keys) comps[k] = ordered[k]
        s.script = renderSeed({ mode: s.mode, components: comps, reprocess: s.reprocess, runId: s.runId, template })
        if (bytes(s.script) > MAX_BYTES + 100 * 1024) throw new Error(`step ${i + 1} renders to ${(bytes(s.script) / 1024).toFixed(0)} KB, over budget`)
    })
    steps.unshift(...docSteps)

    if (!steps.length) {
        log('\nnothing to seed')
        return
    }
    log(`\nPlan (${steps.length} exec${steps.length > 1 ? 's' : ''}, one reprocess at the end):`)
    steps.forEach((s, i) =>
        log(`  ${i + 1}. ${s.mode}${s.keys.length ? ' [' + s.keys.join(', ') + ']' : ''}, ${(bytes(s.script) / 1024).toFixed(0)} KB${s.reprocess ? ', reprocess' : ''}`)
    )
    if (DRY) {
        log('\n--dry-run: nothing run.')
        return
    }

    const results = []
    for (let i = 0; i < steps.length; i++) {
        try {
            const res = await runStep(steps[i], i + 1, steps.length)
            results.push(res)
            log(`   done in ${secs(res.ms)}`)
            printDone(res.message)
        } catch (e) {
            log(`\nSTOPPED: ${e.message}`)
            if (i > 0 || !steps[i].reprocess) log('Earlier parts wrote records but portals were NOT reprocessed: fix the cause, then `npm run seed` (add --reprocess if nothing else is left to seed).')
            process.exitCode = 1
            return
        }
    }
    log(`\nSeeded ${keys.length} component(s)${portals ? ' + portals' : ''} in ${steps.length} exec(s), ${secs(Date.now() - t0)} total.`)
}

main().catch((e) => {
    console.error(e.stack || String(e))
    process.exitCode = 1
})
