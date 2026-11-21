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
import { spawn, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { here, loadComponents, loadTemplate, templateHash, renderSeed, newRunId, bytes } from './seed-lib.mjs';
// --dry-run with a portals step: simulate it locally against the instance's rows (seed-plan.mjs).
import { planPortals } from './seed-plan.mjs';
// Docs step (docs/guide → x_312987_portal_doc): diff by content_hash, before the component parts.
// Skipped with --no-docs, and on --only runs unless --docs is given; --docs adds it (diff-based) to an --only run; --docs-all rewrites every page.
// Pages edited in Studio (content_hash ≠ seed_hash) are never overwritten unless --docs-force: classifyDocs in docs-lib.mjs.
import { loadDocs, renderDocsSeed, classifyDocs, planDocsExtras, DOCS_REMOTE } from './docs-lib.mjs';
// Terminal progress (status line / heartbeat lines, --progress, --quiet): scripts/lib/progress.mjs.
import {
    createProgress,
    estimateRemaining,
    formatBytes,
    formatDuration,
    renderBar,
    renderTable,
} from '../lib/progress.mjs';

const repoRoot = join(here, '..', '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const valueOf = (name) => {
    const a = argv.find((x) => x === name || x.startsWith(name + '='));
    if (!a) return null;
    return a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[argv.indexOf(a) + 1] || '';
};
// Unknown flags must never fall through to a real seed (a stray --help once ran one).
const KNOWN_FLAGS = [
    '--dry-run',
    '--all',
    '--portals',
    '--reprocess',
    '--keep',
    '--only',
    '--max-kb',
    '--max-per-exec',
    '--parts',
    '--wait-minutes',
    '--docs',
    '--docs-all',
    '--docs-force',
    '--no-docs',
    '--quiet',
    '--progress',
];
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
  --max-per-exec N   at most N components per exec (default 30; the instance rejects one script
                     that defines too much with "Program too complex", whatever its size)
  --parts N          split the components into at least N execs
                     (an exec that still fails with "Program too complex" is halved and retried
                     automatically: nothing ran, so the retry is safe)
  --wait-minutes N   how long to wait on a run that didn't answer (default 30)
  --keep             keep the generated part files
  --progress=MODE    tty (animated status line), lines (a plain line on change / every ~10 s) or off;
                     default: tty in a terminal, lines when the output is captured
  --quiet            no status line or step chatter: warnings, errors and the summary only`);
    process.exit(0);
}
const unknownFlags = argv.filter((a) => a.startsWith('-') && !KNOWN_FLAGS.includes(a.split('=')[0]));
if (unknownFlags.length) {
    console.error('Unknown flag(s): ' + unknownFlags.join(', ') + ' (see --help). Nothing was run.');
    process.exit(1);
}
const DRY = flag('--dry-run');
const ALL = flag('--all');
const FORCE_PORTALS = flag('--portals') || ALL;
const FORCE_REPROCESS = flag('--reprocess');
const KEEP = flag('--keep');
const onlyKeys =
    valueOf('--only') === null
        ? null
        : valueOf('--only')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
const MAX_BYTES = Number(valueOf('--max-kb') || 1300) * 1024;
// The instance's script engine has a second limit besides payload size: one script that defines too
// much fails to compile ("Program too complex (out of locals)"). It tracks the component count, not
// bytes (a 1.26 MB exec of 63 components failed; 31 and 32 passed), so execs are capped by count too.
const MAX_PER_EXEC = Math.max(1, Number(valueOf('--max-per-exec') || 30));
const MIN_PARTS = Math.max(1, Number(valueOf('--parts') || 1));
for (const [name, v] of [
    ['--max-kb', MAX_BYTES],
    ['--max-per-exec', MAX_PER_EXEC],
    ['--parts', MIN_PARTS],
]) {
    if (!Number.isFinite(v)) {
        console.error(`${name} needs a number. Nothing was run.`);
        process.exit(1);
    }
}
const WAIT_MS = Number(valueOf('--wait-minutes') || 30) * 60000;
const PROPERTY = 'x_312987_portal.seed.template_hash';
const T = 'x_312987_portal_';

let P;
try {
    // Lines mode: a new line per real change at most every 5 s (syslog is polled every 4 s).
    P = createProgress({ argv, minGapMs: 5000 });
} catch (e) {
    console.error(e.message + '. Nothing was run.');
    process.exit(1);
}
const t0 = Date.now();
const secs = (ms) => (ms / 1000).toFixed(1) + 's';
const log = (...a) => P.log(...a);
// Syslog poll interval while a step runs: 4 s with a status line, the old 10 s with --progress=off.
const POLL_MS = P.mode === 'off' ? 10000 : 4000;
/** Run `fn` with a timed status line ("Reading … · 3.2s"); the line is cleared when it settles. */
async function withStatus(label, fn) {
    const task = P.task(label);
    try {
        return await fn(task);
    } finally {
        P.clear();
    }
}

/* ---------------- now-sdk (spawned via node, no shell: encoded queries carry ^) ---------------- */

function sdkEntry() {
    const rel = join('node_modules', '@servicenow', 'sdk', 'bin', 'index.js');
    const candidates = [join(dirname(process.execPath), rel), join(dirname(process.execPath), '..', 'lib', rel)];
    try {
        candidates.push(
            join(execSync('npm root -g', { encoding: 'utf8' }).trim(), '@servicenow', 'sdk', 'bin', 'index.js')
        );
    } catch (e) {}
    const found = candidates.find((p) => existsSync(p));
    if (!found) throw new Error('Global now-sdk not found (looked in ' + candidates.join(', ') + ')');
    return found;
}
const SDK = sdkEntry();

function sdk(args, { echo = false } = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [SDK, ...args], { cwd: repoRoot, windowsHide: true });
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => {
            out += d;
            if (echo) process.stdout.write(d);
        });
        child.stderr.on('data', (d) => {
            err += d;
            if (echo) process.stderr.write(d);
        });
        child.on('close', (code) => resolve({ code, out, err }));
    });
}

/** All records of a read-only query, paged (ordered by sys_id so offsets are stable). */
async function query(table, q, fields, pageSize = 100) {
    const records = [];
    let offset = 0;
    for (;;) {
        const r = await sdk([
            'query',
            table,
            '-q',
            q + '^ORDERBYsys_id',
            ...(fields ? ['-f', fields.join(',')] : []),
            '--limit',
            String(pageSize),
            '--offset',
            String(offset),
            '--no-count',
            '--timeout',
            '120000',
            '-o',
            'json',
        ]);
        let j;
        try {
            j = JSON.parse(r.out);
        } catch (e) {
            throw new Error(`now-sdk query ${table} failed (exit ${r.code}): ${(r.err || r.out).slice(0, 800)}`);
        }
        if (!j.ok) throw new Error(`now-sdk query ${table} failed: ${JSON.stringify(j).slice(0, 800)}`);
        records.push(...j.records);
        if (!j.hasMore || !j.records.length) return records;
        offset = j.nextOffset != null ? j.nextOffset : offset + j.records.length;
    }
}

/* ---------------- Normalisation (mirrors upsert/sameValue in seed-template.js) ---------------- */

function canonical(x) {
    if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
    if (x && typeof x === 'object')
        return (
            '{' +
            Object.keys(x)
                .sort()
                .map((k) => JSON.stringify(k) + ':' + canonical(x[k]))
                .join(',') +
            '}'
        );
    return JSON.stringify(x);
}
const lf = (s) => s.replace(/\r\n/g, '\n');
// The wanted value as upsert writes it, reduced to the form sameValue compares.
function normWanted(v) {
    if (typeof v === 'boolean') return 'b:' + v;
    if (v !== null && typeof v === 'object') return 'j:' + canonical(v);
    return 't:' + lf(v === null || v === undefined ? '' : String(v));
}
// The stored value, read the way sameValue reads it against that wanted value.
function normStored(stored, wanted) {
    const cur = stored === null || stored === undefined ? '' : String(stored);
    if (typeof wanted === 'boolean') return 'b:' + (cur === '1' || cur === 'true');
    if (wanted !== null && typeof wanted === 'object') {
        try {
            return 'j:' + canonical(JSON.parse(cur || 'null'));
        } catch (e) {
            return 't:' + lf(cur);
        }
    }
    return 't:' + lf(cur);
}

// The component fields the seed upserts (keep in step with the "Components" block of the template).
function wantedFields(key, c) {
    return {
        name: c.meta.name,
        namespace: c.namespace || 'app',
        key: c.key || key,
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
    };
}
const FIELDS = Object.keys(wantedFields('x', { meta: {} }));
const sha = (s) => createHash('sha256').update(s).digest('hex');

function sideHashes(key, c, rec, files) {
    const want = wantedFields(key, c);
    const local = { fields: {}, files: {} };
    const remote = { fields: {}, files: {} };
    for (const f of FIELDS) {
        local.fields[f] = normWanted(want[f]);
        remote.fields[f] = rec ? normStored(rec[f], want[f]) : null;
    }
    for (const f of c.extraFiles) local.files[f.path] = normWanted(f.target) + '\u0000' + normWanted(f.content);
    for (const f of files) remote.files[f.path] = normStored(f.target, '') + '\u0000' + normStored(f.content_text, '');
    return { local, remote, localHash: sha(canonical(local)), remoteHash: sha(canonical(remote)) };
}

/* ---------------- Diff ---------------- */

// Map key of a component record: "<key>" for app/*, "<ns>/<key>" for other namespaces (seed-lib folders).
const mapKey = (r) => (r.namespace === 'app' ? r.key : `${r.namespace}/${r.key}`);

async function readInstance(namespaces = ['app']) {
    const ns = 'namespaceIN' + namespaces.join(',');
    return withStatus('Reading components, source files and builds from the instance', async (task) => {
        let settled = 0;
        const track = (name, p) =>
            p.then((rows) => {
                settled++;
                task.update(`${settled}/4 tables (${name}: ${rows.length} rows)`, String(settled));
                return rows;
            });
        task.update('0/4 tables', '0');
        const [comps, files, builds, props] = await Promise.all([
            track('components', query(T + 'component', ns, ['sys_id', 'unique_id'].concat(FIELDS))),
            track(
                'source files',
                query(
                    T + 'source_file',
                    'component.' + ns,
                    ['sys_id', 'component', 'path', 'target', 'content_text'],
                    200
                )
            ),
            track(
                'builds',
                query(
                    T + 'build',
                    'component.' + ns,
                    ['sys_id', 'component', 'state', 'last_error', 'compiler_version'],
                    200
                )
            ),
            track('marker', query('sys_properties', 'name=' + PROPERTY, ['name', 'value'])),
        ]);
        return { comps, files, builds, markerHash: props.length ? props[0].value : '' };
    });
}

function diffComponents(ordered, inst) {
    const byKey = {};
    for (const r of inst.comps) byKey[mapKey(r)] = r;
    const filesById = {};
    for (const f of inst.files) (filesById[f.component] = filesById[f.component] || []).push(f);
    const buildById = {};
    for (const b of inst.builds) buildById[b.component] = b;
    const changed = [];
    const warnings = [];
    for (const key of Object.keys(ordered)) {
        const rec = byKey[key];
        const files = rec ? filesById[rec.sys_id] || [] : [];
        const h = sideHashes(key, ordered[key], rec, files);
        const reasons = [];
        if (!rec) reasons.push('new');
        else if (h.localHash !== h.remoteHash) {
            const fields = FIELDS.filter((f) => h.local.fields[f] !== h.remote.fields[f]);
            if (fields.length) reasons.push('fields: ' + fields.join(', '));
            const fileNotes = [];
            for (const p of Object.keys(h.local.files))
                if (!(p in h.remote.files)) fileNotes.push('+' + p);
                else if (h.local.files[p] !== h.remote.files[p]) fileNotes.push('~' + p);
            for (const p of Object.keys(h.remote.files)) if (!(p in h.local.files)) fileNotes.push('-' + p);
            if (fileNotes.length) reasons.push('files: ' + fileNotes.join(' '));
        }
        const build = rec && buildById[rec.sys_id];
        if (rec && !build) reasons.push('no build');
        else if (build && build.state === 'failed')
            warnings.push(
                `${key}: build failed (${(build.last_error || '').slice(0, 120)}) — not reseeded automatically; fix it or --only ${key}`
            );
        if (reasons.length) changed.push({ key, reasons });
    }
    const stale = inst.comps
        .filter((r) => !ordered[mapKey(r)])
        .map((r) => r.unique_id + (r.active === 'true' || r.active === '1' ? '' : ' (inactive)'));
    return { changed, warnings, stale };
}

/* ---------------- Plan ---------------- */

function splitParts(keys, ordered, template) {
    const runId = 'x'.repeat(40);
    const base = bytes(renderSeed({ mode: 'components', components: {}, reprocess: true, runId, template }));
    // Count cap: the smaller of --max-per-exec and an even share for --parts.
    const perExec = Math.min(MAX_PER_EXEC, Math.max(1, Math.ceil(keys.length / MIN_PARTS)));
    const parts = [];
    let cur = [];
    let size = base;
    for (const key of keys) {
        const s = bytes(JSON.stringify({ [key]: ordered[key] }, null, 1)) + 64;
        if (base + s > MAX_BYTES)
            throw new Error(`${key} alone is ${(s / 1024).toFixed(0)} KB, over the ${MAX_BYTES / 1024} KB budget`);
        if (cur.length && (size + s > MAX_BYTES || cur.length >= perExec)) {
            parts.push(cur);
            cur = [];
            size = base;
        }
        cur.push(key);
        size += s;
    }
    if (cur.length) parts.push(cur);
    return parts;
}

/* ---------------- Exec + wait ---------------- */

async function syslogFor(runId, sinceMs) {
    const minutes = Math.ceil((Date.now() - sinceMs) / 60000) + 3;
    return query('syslog', `sys_created_on>=javascript:gs.minutesAgoStart(${minutes})^messageLIKE${runId}`, [
        'sys_created_on',
        'level',
        'message',
    ]);
}

/* ---------------- Progress (status line while a step runs) ---------------- */

// "[seed] progress run=<id> <text>" lines (seed-template.js seedProgress): the furthest one wins.
const PHASE_RANK = { writing: 1, portals: 2, compiling: 3, css: 4, reprocess: 5 };
function parseProgress(lines) {
    let best = null;
    for (const l of lines) {
        const m = /^\[seed\] progress run=\S+ (.*)$/.exec(l.message || '');
        if (!m) continue;
        const text = m[1];
        const counted = /^(writing|compiling|compiled) (\d+)\/(\d+)(?: (.*))?$/.exec(text);
        let p;
        if (counted)
            p = {
                phase: counted[1] === 'writing' ? 'writing' : 'compiling',
                n: Number(counted[2]),
                total: Number(counted[3]),
                item: counted[4] || '',
            };
        else if (/^writing portals/.test(text)) p = { phase: 'portals', n: 0, total: 0, item: '' };
        else if (/^instance css/.test(text)) p = { phase: 'css', n: 0, total: 0, item: text.slice(13) };
        else if (/^reprocessing/.test(text)) p = { phase: 'reprocess', n: 0, total: 0, item: '' };
        else continue;
        p.rank = PHASE_RANK[p.phase];
        if (!best || p.rank > best.rank || (p.rank === best.rank && p.n > best.n)) best = p;
    }
    return best;
}
// Share of a step done at a progress line (records ~25 %, compiles ~55 %, css + reprocess the rest).
function stepFraction(p) {
    if (!p) return 0.02;
    const f = p.total ? p.n / p.total : 0;
    if (p.phase === 'writing') return 0.25 * f;
    if (p.phase === 'portals') return 0.3;
    if (p.phase === 'compiling') return 0.35 + 0.55 * f;
    if (p.phase === 'css') return 0.92;
    return 0.96;
}
function phaseText(p, execDone) {
    if (!p) return execDone ? 'waiting for the done line' : 'running the exec';
    if (p.phase === 'writing')
        return `writing records ${p.n}/${p.total}${p.item ? ' ' + P.sym.dot + ' ' + p.item : ''}`;
    if (p.phase === 'portals') return 'writing portals, pages and menus';
    if (p.phase === 'compiling') return `compiled ${p.n}/${p.total}${p.item ? ' ' + P.sym.dot + ' ' + p.item : ''}`;
    if (p.phase === 'css') return `instance css (${p.item})`;
    return 'reprocessing portals';
}
// ETA weights: a components step ~ its component count, a portals step ~8, a docs step ~3.
const unitsOf = (s) => (s.mode === 'components' ? s.keys.length + 2 : s.mode === 'portals' ? 8 : 3);
const stepName = (s) =>
    s.mode === 'components' ? `components (${s.keys.length})` : s.mode === 'portals' ? 'portals' : s.mode;
// Set by main before the step loop: { steps, index (0-based), started }.
let RUN = null;

async function runStep(step, index, total) {
    const label = `step ${index}/${total} (${step.mode}${step.keys.length ? ', ' + step.keys.length + ' components' : ''}${step.reprocess ? ', reprocess' : ''})`;
    const file = join(tmpdir(), 'react-portal-seed', step.runId + '.js');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, step.script);
    log(
        `\n${P.sym.run} ${P.c.bold(`[${index}/${total}] ${stepName(step)}`)}${step.reprocess ? ', reprocess' : ''} ${P.sym.dot} run ${step.runId} ${P.sym.dot} ${(bytes(step.script) / 1024).toFixed(0)} KB`
    );
    const started = Date.now();
    // Status line: overall bar, this step's phase (from the run's "[seed] progress" syslog lines),
    // elapsed and an ETA from the throughput so far. Polled while the exec runs, too (read-only).
    const prog = { p: null, execDone: false };
    const show = () => {
        if (P.mode === 'off' || !RUN) return;
        const doneUnits =
            RUN.steps.slice(0, RUN.index).reduce((n, s) => n + unitsOf(s), 0) + stepFraction(prog.p) * unitsOf(step);
        const totalUnits = RUN.steps.reduce((n, s) => n + unitsOf(s), 0);
        P.status(
            () => {
                const elapsed = Date.now() - RUN.started;
                const left = estimateRemaining(doneUnits, totalUnits, elapsed, 15000);
                return `[${index}/${total}] ${P.c.cyan(renderBar(doneUnits / totalUnits, 16))} ${stepName(step)} ${P.sym.dot} ${phaseText(prog.p, prog.execDone)} ${P.sym.dot} ${formatDuration(elapsed)} elapsed${left != null ? ' ' + P.sym.dot + ' ~' + formatDuration(left) + ' left' : ''}`;
            },
            { key: prog.p ? prog.p.phase + ' ' + prog.p.n : String(prog.execDone) }
        );
    };
    show();
    const execP = sdk(['exec', '--file', file, '--reason', `npm run seed ${step.runId} (${step.mode})`], {
        echo: false,
    }).then((res) => {
        prog.execDone = true;
        return res;
    });
    if (P.mode !== 'off') {
        for (;;) {
            const settled = await Promise.race([execP.then(() => true), sleep(POLL_MS).then(() => false)]);
            if (settled || prog.execDone) break;
            try {
                prog.p = parseProgress(await syslogFor(step.runId, started)) || prog.p;
            } catch (e) {}
            show();
        }
    }
    const r = await execP;
    show();
    const text = (r.out + '\n' + r.err).trim();
    const noResponse =
        /did not return a script execution response|timed?\s*out|timeout|ETIMEDOUT|ECONNRESET|socket hang up/i.test(
            text
        );
    // The script failed to COMPILE (too many definitions for the engine): nothing ran, so the caller
    // may split the step and retry.
    if (r.code !== 0 && /Program too complex|out of locals/i.test(text)) {
        if (!KEEP) unlinkSync(file);
        const err = new Error(`${label}: the instance rejected the script as too complex (nothing ran)`);
        err.tooComplex = true;
        throw err;
    }
    if (r.code === 0) log(`   exec returned after ${secs(Date.now() - started)}`);
    else
        log(
            `   exec exit ${r.code} after ${secs(Date.now() - started)}${noResponse ? ' (no response: may still be running, polling)' : ''}:\n   ${text.split('\n').slice(-6).join('\n   ')}`
        );
    // Exec returned cleanly: the done line is already (or about to be) in syslog. No response: the
    // script may still be running server-side. Other errors: give it a short grace, then fail.
    const budget = r.code === 0 ? 3 * 60000 : noResponse ? WAIT_MS : 2 * 60000;
    let lastNote = 0;
    for (;;) {
        const lines = await syslogFor(step.runId, started);
        prog.p = parseProgress(lines) || prog.p;
        show();
        const done = lines.find((l) => l.message.startsWith('[seed] done'));
        const failed = lines.find((l) => /^\[seed\] (final reprocess failed|failed)/.test(l.message));
        if (failed) {
            if (!KEEP) unlinkSync(file);
            throw new Error(`${label} failed: ${failed.message.slice(0, 1500)}`);
        }
        if (done) {
            if (!KEEP) unlinkSync(file);
            return { label, ms: Date.now() - started, message: done.message };
        }
        if (Date.now() - started > budget)
            throw new Error(
                `${label}: no "[seed] done run=${step.runId}" in syslog after ${secs(Date.now() - started)}. Not re-running; check syslog / Script Execution History. Seed file: ${file}`
            );
        // The status line shows the wait; without one (--progress=off), the old minute notes.
        if (P.mode === 'off' && Date.now() - lastNote > 60000) {
            log(`   waiting for [seed] done run=${step.runId} … ${secs(Date.now() - started)}`);
            lastNote = Date.now();
        }
        await sleep(POLL_MS);
    }
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function printDone(message) {
    // "[seed] done (mode) run=<id>: <counts> | <portal revisions> | <timings>"
    const body = message.slice(message.indexOf(': ') + 2);
    const [counts, revs, times] = body.split(' | ');
    log('   ' + counts);
    if (revs) log('   portals: ' + revs);
    if (times) log('   timings: ' + times);
    const m = counts.match(/(\d+) failed/);
    if (m && Number(m[1]) > 0) P.warn('   WARNING: compiles failed; see the "[seed] compiles" syslog line');
}

/** Final table: one row per exec, counts from its "[seed] done" line. */
function printSummary(steps, results) {
    const num = (msg, re) => {
        const m = re.exec(msg || '');
        return m ? m[1] : '';
    };
    const rows = [['#', 'step', 'time', 'written', 'compiled', 'up to date', 'failed', 'portals']];
    results.forEach((res, i) => {
        const msg = res.message;
        rows.push([
            String(i + 1),
            stepName(steps[i]),
            formatDuration(res.ms),
            num(msg, /(\d+) records written/) || num(msg, /(\d+) docs written/),
            num(msg, /(\d+) compiled/),
            num(msg, /(\d+) up to date/),
            num(msg, /(\d+) failed/),
            num(msg, /(\d+) portals reprocessed/),
        ]);
    });
    P.out('\n' + P.c.bold('Summary'));
    P.out(renderTable(rows));
}

/* ---------------- Docs ---------------- */

/**
 * Docs steps: rows of docs/guide whose content_hash differs from the instance (or are missing or
 * inactive there), and instance pages that left the guide (deactivated, never deleted). Split under
 * the exec budget. Returns [] when skipped, unchanged, or the doc table isn't installed yet.
 */
async function planDocs() {
    if (flag('--no-docs') || (onlyKeys && !flag('--docs') && !flag('--docs-all') && !flag('--docs-force'))) return [];
    // Never fatal for the rest of the seed: a broken docs tree only skips the docs step.
    let loaded;
    try {
        loaded = loadDocs();
    } catch (e) {
        log(`\nDocs: skipped, docs/guide couldn't be loaded: ${String(e.message).slice(0, 200)}`);
        return [];
    }
    const { docs, unlisted, missing } = loaded;
    if (missing.length) log(`\nDocs: _nav.json lists missing files (skipped): ${missing.join(', ')}`);
    let remote;
    let remoteSections;
    try {
        // Collection react-portal only (plus rows from before doc collections, which belong to it).
        await withStatus('Reading doc pages and sections from the instance', async (task) => {
            task.update('pages');
            remote = await query(T + 'doc', DOCS_REMOTE.pagesQuery, DOCS_REMOTE.pageFields, 200);
            task.update(`sections (${remote.length} pages read)`);
            remoteSections = await query(T + 'doc_section', DOCS_REMOTE.sectionsQuery, DOCS_REMOTE.sectionFields, 200);
        });
    } catch (e) {
        log(
            `\nDocs: skipped, x_312987_portal_doc isn't readable (install the app first?): ${String(e.message).slice(0, 160)}`
        );
        return [];
    }
    const plan = classifyDocs(docs, remote, { all: flag('--docs-all'), force: flag('--docs-force') });
    const changed = plan.write;
    const deactivate = plan.deactivate;
    const adopt = plan.adopt;
    const extras = planDocsExtras(loaded, remote, remoteSections, {
        all: flag('--docs-all'),
        force: flag('--docs-force'),
    });
    log(`
Docs: ${Object.keys(docs).length} pages in docs/guide, ${remote.length} on the instance → ${changed.length} to write, ${adopt.length} to adopt, ${deactivate.length} to deactivate`);
    extras.lines.forEach((l) => log(l));
    if (unlisted.length) log(`  Not in _nav.json (not seeded): ${unlisted.join(', ')}`);
    if (changed.length && changed.length <= 12) log(`  ${changed.join(', ')}`);
    if (adopt.length && adopt.length <= 12)
        log(`  adopt (already matches the repo, stamp only): ${adopt.map((a) => a.path).join(', ')}`);
    if (plan.forced.length) log(`  --docs-force OVERWRITES Studio edits: ${plan.forced.join(', ')}`);
    if (plan.studioEdited.length)
        log(`  Edited in Studio, kept (run npm run docs:pull, then commit): ${plan.studioEdited.join(', ')}`);
    if (plan.conflicts.length)
        log(
            `  CONFLICT, kept: changed in the repo AND in Studio (docs:pull to compare, or --docs-force to overwrite): ${plan.conflicts.join(', ')}`
        );
    if (plan.studioOnly.length)
        log(`  Studio pages not in the repo, kept (run npm run docs:pull): ${plan.studioOnly.join(', ')}`);
    if (!changed.length && !deactivate.length && !adopt.length && !extras.changed) return [];
    const base = bytes(
        renderDocsSeed({
            rows: [],
            deactivate,
            adopt,
            runId: 'x'.repeat(40),
            collection: extras.collection,
            sections: extras.sections,
        })
    );
    const parts = [];
    let cur = [];
    let size = base;
    for (const p of changed) {
        const s = bytes(JSON.stringify(docs[p])) + 8;
        if (cur.length && size + s > MAX_BYTES) {
            parts.push(cur);
            cur = [];
            size = base;
        }
        cur.push(p);
        size += s;
    }
    if (cur.length || !parts.length) parts.push(cur);
    return parts.map((paths, i) => {
        const runId = newRunId('rs-docs') + (i ? '-' + (i + 1) : '');
        const dea = i === 0 ? deactivate : [];
        const ado = i === 0 ? adopt : [];
        return {
            mode: `docs ${paths.length} pages${ado.length ? ', ' + ado.length + ' adopted' : ''}${dea.length ? ', ' + dea.length + ' deactivated' : ''}`,
            keys: [],
            reprocess: false,
            runId,
            script: renderDocsSeed({
                rows: paths.map((p) => docs[p]),
                deactivate: dea,
                adopt: ado,
                runId,
                collection: extras.collection,
                // Sections and the migration go with the first part; later parts only look sections up.
                sections: i === 0 ? extras.sections : null,
            }),
        };
    });
}

/* ---------------- Portals plan (dry run) ---------------- */

/** What the portals step would write, simulated from the instance's current rows (read-only). */
async function printPortalsPlan(script) {
    log('\nPortals step plan (simulated locally against the instance; nothing is written):');
    let plan;
    try {
        plan = await withStatus('Simulating the portals step against the instance rows', () =>
            planPortals({ script, query: (t, q, f) => query(t, q, f, 200) })
        );
    } catch (e) {
        log(`  plan unavailable: ${String(e.message || e).slice(0, 600)}`);
        return;
    }
    const placements = plan.db[T + 'placement'] || [];
    if (placements.length && !placements.some((r) => 'seed_slot' in r))
        log('  NOTE: placement.seed_slot is not on the instance yet (install the app before the portals step).');
    const tables = Object.keys(plan.report.counts);
    if (!tables.length) log('  no changes');
    for (const t of tables) {
        const c = plan.report.counts[t];
        const parts = [];
        if (c.insert) parts.push(c.insert + ' insert');
        if (c.update) parts.push(c.update + ' update');
        if (c.deactivate) parts.push(c.deactivate + ' deactivate');
        if (c.delete) parts.push(c.delete + ' delete');
        if (c.adopt) parts.push(c.adopt + ' adopt (seed_slot stamp only)');
        log(`  ${t}: ${parts.join(', ')}`);
    }
    plan.report.lines.slice(0, 200).forEach((l) => log(l));
    if (plan.report.lines.length > 200) log(`  … ${plan.report.lines.length - 200} more`);
}

/* ---------------- Main ---------------- */

async function main() {
    const ordered = loadComponents();
    const template = loadTemplate();
    const tHash = templateHash(template);
    if (onlyKeys) {
        const unknown = onlyKeys.filter((k) => !ordered[k]);
        if (unknown.length) throw new Error(`--only: no seed folder for ${unknown.join(', ')}`);
    }

    if (P.mode === 'off') log(`Reading app/* components, source files and builds from the instance…`);
    const inst = await readInstance(Array.from(new Set(Object.values(ordered).map((c) => c.namespace || 'app'))));
    const diff = diffComponents(ordered, inst);
    log(
        `  ${inst.comps.length} components, ${inst.files.length} source files, ${inst.builds.length} builds on the instance; ${Object.keys(ordered).length} local folders (${secs(Date.now() - t0)})`
    );

    if (diff.changed.length) {
        log(`\nChanged components (${diff.changed.length}):`);
        for (const c of diff.changed) log(`  ${c.key.padEnd(24)} ${c.reasons.join('; ')}`);
    } else log('\nComponents: instance matches every local folder.');
    for (const w of diff.warnings) P.warn('  WARNING ' + w);
    if (diff.stale.length) log(`  Instance-only (no seed folder; never deleted): ${diff.stale.join(', ')}`);

    const templateChanged = inst.markerHash !== tHash;
    log(
        `\nTemplate: ${tHash} vs instance marker ${inst.markerHash || '(none)'} → ${templateChanged ? 'changed' : 'unchanged'}`
    );

    // Selection.
    let keys = ALL
        ? Object.keys(ordered)
        : onlyKeys
          ? Object.keys(ordered).filter((k) => onlyKeys.includes(k))
          : diff.changed.map((c) => c.key);
    keys = Object.keys(ordered).filter((k) => keys.includes(k)); // dependency order
    const portals = FORCE_PORTALS || (!onlyKeys && templateChanged);

    const parts = splitParts(keys, ordered, template);
    const steps = parts.map((p) => ({ mode: 'components', keys: p }));
    if (portals) steps.push({ mode: 'portals', keys: [] });
    if (!steps.length && FORCE_REPROCESS) steps.push({ mode: 'components', keys: [] });
    // Docs: their own exec(s), first, never reprocessing (docs aren't in any manifest).
    const docSteps = await planDocs();
    const render = (s, i) => {
        s.runId = newRunId('rs');
        if (i > 0) s.runId += '-' + (i + 1);
        const comps = {};
        for (const k of s.keys) comps[k] = ordered[k];
        s.script = renderSeed({ mode: s.mode, components: comps, reprocess: s.reprocess, runId: s.runId, template });
        if (bytes(s.script) > MAX_BYTES + 100 * 1024)
            throw new Error(`step ${i + 1} renders to ${(bytes(s.script) / 1024).toFixed(0)} KB, over budget`);
    };
    steps.forEach((s, i) => {
        s.reprocess = i === steps.length - 1;
        render(s, i);
    });
    steps.unshift(...docSteps);

    if (!steps.length) {
        log('\nnothing to seed');
        return;
    }
    const planBytes = steps.reduce((n, s) => n + bytes(s.script), 0);
    log(
        `\n${P.c.bold('Plan')} (${steps.length} exec${steps.length > 1 ? 's' : ''}, one reprocess at the end) ${P.sym.dot} ${keys.length} component${keys.length === 1 ? '' : 's'}${portals ? ' + portals' : ''} ${P.sym.dot} ${formatBytes(planBytes)}`
    );
    const nameWidth = Math.max(...steps.map((s) => stepName(s).length));
    const listWidth = Math.max(60, (process.stdout.columns || 120) - 8);
    steps.forEach((s, i) => {
        log(
            `  ${String(i + 1).padStart(String(steps.length).length)}. ${stepName(s).padEnd(nameWidth)}  ${formatBytes(bytes(s.script)).padStart(7)}${s.reprocess ? '  ' + P.c.yellow('reprocess') : ''}`
        );
        // The component keys, wrapped under the step.
        let line = '';
        for (const k of s.keys) {
            const piece = (line ? ', ' : '') + k;
            if (line && line.length + piece.length > listWidth) {
                log(P.c.dim('       ' + line + ','));
                line = k;
            } else line += piece;
        }
        if (line) log(P.c.dim('       ' + line));
    });
    if (DRY) {
        const portalStep = steps.find((s) => s.mode === 'portals');
        if (portalStep) await printPortalsPlan(portalStep.script);
        log('\n--dry-run: nothing run.');
        return;
    }

    const results = [];
    RUN = { steps, index: 0, started: Date.now() };
    for (let i = 0; i < steps.length; i++) {
        RUN.index = i;
        try {
            const res = await runStep(steps[i], i + 1, steps.length);
            P.clear();
            results.push(res);
            log(`${P.sym.ok} [${i + 1}/${steps.length}] ${stepName(steps[i])} done in ${secs(res.ms)}`);
            printDone(res.message);
        } catch (e) {
            P.clear();
            // Too complex to compile: halve the step and retry it (only the second half keeps the
            // step's reprocess flag, so the final reprocess still runs once, last).
            if (e.tooComplex && steps[i].mode === 'components' && steps[i].keys.length > 1) {
                const s = steps[i];
                const mid = Math.ceil(s.keys.length / 2);
                const a = { mode: s.mode, keys: s.keys.slice(0, mid), reprocess: false };
                const b = { mode: s.mode, keys: s.keys.slice(mid), reprocess: s.reprocess };
                render(a, i);
                render(b, i + 1);
                steps.splice(i, 1, a, b);
                log(
                    `   ${e.message}: splitting it into ${a.keys.length} + ${b.keys.length} components and retrying (lower --max-per-exec to avoid this)`
                );
                i--;
                continue;
            }
            if (results.length) printSummary(steps, results);
            P.warn(`\n${P.sym.fail} STOPPED: ${e.message}`);
            if (i > 0 || !steps[i].reprocess)
                P.warn(
                    'Earlier parts wrote records but portals were NOT reprocessed: fix the cause, then `npm run seed` (add --reprocess if nothing else is left to seed).'
                );
            process.exitCode = 1;
            return;
        }
    }
    printSummary(steps, results);
    P.out(
        `\n${P.sym.ok} Seeded ${keys.length} component(s)${portals ? ' + portals' : ''} in ${steps.length} exec(s), ${secs(Date.now() - t0)} total.`
    );
}

main().catch((e) => {
    P.clear();
    console.error(e.stack || String(e));
    process.exitCode = 1;
});
