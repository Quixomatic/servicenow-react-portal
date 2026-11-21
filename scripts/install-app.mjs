// npm run install:app: `now-sdk build && now-sdk install` with phase progress, using the GLOBAL now-sdk
// (the project-local one can't read the stored credentials). Parses now-sdk's own output: type check,
// prebuild bundles, the build artifact, then the install ("App install pending: 26% complete, …",
// printed every ~30 s) up to done. Full output in .install.log; its tail is printed on failure.
//
//   npm run install:app -- [--skip-build | --build-only] [--cwd packages/global-helpers] [--progress=tty|lines|off]
//                          [--quiet] [any other flag goes to `now-sdk install`, e.g. --reinstall]
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { createProgress, formatDuration, renderBar, runCommand, startLog } from './lib/progress.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`npm run install:app -- [flags]
  --skip-build       install the existing build artifact only
  --build-only       build with progress, don't install
  --cwd DIR          the app to build + install (default: this repo; e.g. packages/global-helpers)
  --progress=MODE    tty | lines | off (off streams now-sdk's raw output)
  --quiet            phase results and errors only
  anything else      passed to \`now-sdk install\` (e.g. --reinstall)`);
    process.exit(0);
}
let P;
try {
    P = createProgress({ argv });
} catch (e) {
    console.error(e.message + '. Nothing was run.');
    process.exit(1);
}
const valueOf = (name) => {
    const a = argv.find((x) => x === name || x.startsWith(name + '='));
    if (!a) return null;
    return a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[argv.indexOf(a) + 1] || '';
};
const cwd = resolve(valueOf('--cwd') || process.cwd());
if (!existsSync(join(cwd, 'now.config.json'))) {
    console.error(`${cwd} has no now.config.json. Nothing was run.`);
    process.exit(1);
}
const SKIP_BUILD = argv.includes('--skip-build');
const BUILD_ONLY = argv.includes('--build-only');
const installArgs = [];
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (
        a === '--skip-build' ||
        a === '--build-only' ||
        a === '--quiet' ||
        a.startsWith('--progress=') ||
        a.startsWith('--cwd=')
    )
        continue;
    if (a === '--progress' || a === '--cwd') {
        i++;
        continue;
    }
    installArgs.push(a);
}

// The global now-sdk's entry (as run-seed.mjs): npm scripts put node_modules/.bin first on PATH, where
// `now-sdk` is the project-local copy.
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

const LOG = join(cwd, '.install.log');
const logRel = relative(process.cwd(), LOG) || LOG;

// One now-sdk line → { text, key } for the status line, or null to keep the current one.
function buildDetail(line, s) {
    if (/Initiating the build/.test(line)) return { text: 'starting', key: 'start' };
    if (/Building project/.test(line)) return { text: 'type checking', key: 'tsc' };
    if (/Type check completed/.test(line)) return { text: 'type check passed', key: 'tsc-ok' };
    if (/Running script "(\w+)"/.test(line)) return { text: `running ${/"(\w+)"/.exec(line)[1]}`, key: 'script' };
    // After the prebuild bundles, the Fluent metadata builds silently until the artifacts are written.
    if (/Script "\w+" completed successfully/.test(line)) return { text: 'building Fluent metadata', key: 'meta' };
    if (/Bundled (chunk|asset)/.test(line)) {
        s.bundled++;
        return { text: `bundling (${s.bundled} files)`, key: 'bundle' };
    }
    if (/Built source artifact/.test(line)) return { text: 'writing artifacts', key: 'artifact' };
    if (/Build completed successfully/.test(line)) return { text: 'done', key: 'done' };
    return null;
}
function installDetail(line, s) {
    let m;
    if ((m = /App install pending(?::\s*(?:(\d+)% complete)?,?\s*(.*))?/.exec(line))) {
        if (m[1]) s.pct = Number(m[1]);
        const pct = s.pct != null ? `${renderBar(s.pct / 100, 16)} ${s.pct}%` : 'pending';
        return {
            text: `installing ${pct}${m[2] ? ' ' + P.sym.dot + ' ' + m[2].slice(0, 50) : ''}`,
            key: 'pct' + s.pct,
        };
    }
    if ((m = /Rollback \(undo installation\):\s*(\S+)/.exec(line))) {
        s.rollback = m[1];
        return null;
    }
    if (/pack/i.test(line) && !s.pct) return { text: 'packaging', key: 'pack' };
    if (/upload/i.test(line) && !s.pct) return { text: 'uploading the package', key: 'upload' };
    return null;
}

async function phase(label, args, detailFn) {
    const task = P.mode === 'off' ? null : P.task(label);
    const state = { bundled: 0, pct: null, rollback: '', last: '' };
    if (P.mode === 'off') P.log(`> now-sdk ${args.join(' ')}`);
    const res = await runCommand(process.execPath, [sdkEntry(), ...args], {
        cwd,
        logFile: LOG,
        passthrough: P.mode === 'off' && !P.quiet,
        onLine: (raw) => {
            if (!task) return;
            const line = raw.replace(/^\[now-sdk\]\s*/, '').trim();
            const d = detailFn(line, state);
            if (d) {
                state.last = d.key;
                task.update(d.text, d.key);
            } else if (line && !state.pct) task.update(line.length > 70 ? line.slice(0, 69) + '…' : line, state.last);
        },
    });
    // now-sdk's exit code decides, as it did for `now-sdk build && now-sdk install`.
    if (res.code !== 0) {
        if (task) task.fail(`exit ${res.code}`);
        else P.error(`${P.sym.fail} ${label} failed (exit ${res.code})`);
        P.error(`\nLast lines of ${logRel}:`);
        P.error(
            res.tail
                .filter((l) => l.trim())
                .slice(-30)
                .map((l) => '  ' + l)
                .join('\n')
        );
        return { ok: false, code: res.code, state };
    }
    if (task) task.succeed(state.bundled ? `${state.bundled} files bundled` : '');
    return { ok: true, state };
}

async function main() {
    const t0 = Date.now();
    startLog(LOG, `npm run install:app (${cwd})`);
    P.log(
        `${SKIP_BUILD ? 'Install' : BUILD_ONLY ? 'Build' : 'Build + install'} ${relative(process.cwd(), cwd) || '.'} with the global now-sdk ${P.sym.dot} full log in ${logRel}`
    );
    const steps = [];
    if (!SKIP_BUILD) steps.push(['build', ['build'], buildDetail]);
    if (!BUILD_ONLY) steps.push(['install', ['install', ...installArgs], installDetail]);
    let rollback = '';
    for (let i = 0; i < steps.length; i++) {
        const [name, args, fn] = steps[i];
        const r = await phase(`[${i + 1}/${steps.length}] ${name}`, args, fn);
        if (!r.ok) {
            P.error(`\n${name} FAILED after ${formatDuration(Date.now() - t0)}. Full log: ${LOG}`);
            process.exitCode = r.code;
            return;
        }
        if (r.state.rollback) rollback = r.state.rollback;
    }
    if (rollback) P.log(`  rollback: ${rollback}`);
    P.out(
        `${P.sym.ok} ${BUILD_ONLY ? 'Built' : 'Installed'} in ${formatDuration(Date.now() - t0)} ${P.sym.dot} log: ${logRel}`
    );
}

main().catch((e) => {
    P.clear();
    console.error(e.stack || String(e));
    process.exitCode = 1;
});
