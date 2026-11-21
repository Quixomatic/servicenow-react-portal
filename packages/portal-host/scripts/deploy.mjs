// pnpm run deploy: the host deploy with phase progress. Runs the commands of package.json's
// "deploy:raw" script in order ("pnpm build:css" expands into the commands of "build:css", so every
// sub-step gets its own phase), shows a spinner / status per phase (snc's output is parsed: webpack
// build, packaging, upload), keeps the full output in .deploy.log and prints its tail on failure.
//
//   pnpm run deploy [-- extra snc args]  [--progress=tty|lines|off] [--quiet] [--dry-run]
//
// --progress=off streams the raw output like the old chain did. Extra arguments go to the last
// command (snc ui-component deploy), as they did when "deploy" was the chain itself.
// `pnpm run deploy:raw` is the plain chain, without this wrapper.
import { readFileSync } from 'node:fs';
import { delimiter, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProgress, formatDuration, renderBar, runCommand, startLog } from '../../../scripts/lib/progress.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = join(pkgDir, '.deploy.log');
const argv = process.argv.slice(2);
let P;
try {
    P = createProgress({ argv });
} catch (e) {
    console.error(e.message + '. Nothing was run.');
    process.exit(1);
}
// Our flags; everything else is passed to the last command.
const extra = [];
for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--quiet' || argv[i] === '--dry-run' || argv[i].startsWith('--progress=')) continue;
    if (argv[i] === '--progress') {
        i++;
        continue;
    }
    if (argv[i] === '--') continue;
    extra.push(argv[i]);
}

const scripts = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).scripts;
const split = (cmd) => cmd.split(/\s*&&\s*/).filter(Boolean);
const commands = [];
for (const cmd of split(scripts['deploy:raw'])) {
    const m = /^pnpm (?:run )?([\w:-]+)$/.exec(cmd);
    if (m && scripts[m[1]]) commands.push(...split(scripts[m[1]]));
    else commands.push(cmd);
}
if (extra.length) commands[commands.length - 1] += ' ' + extra.join(' ');

function labelOf(cmd) {
    if (/^tailwindcss\b/.test(cmd)) return 'build:css (tailwind)';
    if (/patch-servicenow-babel/.test(cmd)) return 'babel verify';
    if (/^snc ui-component deploy/.test(cmd)) return 'snc deploy';
    const node = /^node (?:\S*\/)?([\w.-]+?)\.m?js\b/.exec(cmd);
    if (node) return node[1].replace(/-/g, ' ');
    return cmd.split(' ')[0];
}

// snc ui-component deploy: webpack builds each entry ("Building <pkg> <file>"), zips the output
// ("deploy-zip: …"), then "Deploying plugin to <instance>...", "Uploading scoped app file: …",
// "Finished deploying plugin.".
// Real output (snc 30.x, 2026-11): "<s> [webpack.Progress] 63% building …" (thousands of lines),
// "<i> [ServicenowDependencyCompiler] Building <pkg> <file>", then "Deploying component to <url>...",
// "Updating|Creating <id> in <table>", "Table Operation [CREATE ]Failure: Response code 403 …",
// "Finished deploying!". Returns { text, key } for the status line, or { skip: true } for a line that
// must never become the status text, or null (the caller shows short unknown lines as a hint).
function sncDetail(line, state) {
    let m;
    if ((m = /\[webpack\.Progress\]\s+(\d{1,3})%\s*(\S+)?/.exec(line))) {
        const pct = Math.min(100, Number(m[1]));
        // Phase word: building / sealing / emitting / setup / done / cache …
        if (m[2] && !/^\d/.test(m[2])) state.wpPhase = m[2];
        // "64% building 0/1 entries 5350/5436 dependencies 36/2358 modules …": webpack sits at 64% for
        // most of the build, so the module count is what visibly moves.
        const mods = /(\d+)\/(\d+) modules/.exec(line);
        if (state.wpPhase === 'building' && mods) state.wpModules = `${mods[1]}/${mods[2]} modules`;
        else if (state.wpPhase !== 'building') state.wpModules = '';
        return {
            text: `webpack ${renderBar(pct / 100, 16)} ${String(pct).padStart(3)}%${state.wpPhase ? ' ' + state.wpPhase : ''}${state.wpModules ? ' ' + P.sym.dot + ' ' + state.wpModules : ''}`,
            key: 'wp' + (state.wpPhase || '') + Math.floor(pct / 10),
        };
    }
    if ((m = /\bBuilding (\S+) (.+)$/.exec(line))) {
        state.built++;
        return { text: `webpack: building ${m[2]} (${state.built})`, key: 'build' };
    }
    if (/deploy-zip/.test(line)) return { text: 'packaging the zip', key: 'zip' };
    if ((m = /Deploying (?:plugin|component) to (\S+?)(?:\.\.\.)?$/.exec(line)))
        return { text: `deploying to ${m[1].replace(/^https?:\/\//, '')}`, key: 'deploy' };
    if (/Uploading scoped app file/.test(line)) return { text: 'uploading the package', key: 'upload' };
    if (/^Table Operation (?:\w+ )?Failure/.test(line)) {
        // Known noise: source maps, attachment uploads and the tile icon image are refused (403/400) on
        // every deploy. Anything else refused is counted separately, so it doesn't hide in the noise.
        const known = /\.map\b|attachment|db_image|tile_icon/i.test(line + ' ' + state.lastOp);
        if (known) state.knownRefused++;
        else state.otherRefused.push(line.replace(/^.*?: /, ''));
        return { skip: true };
    }
    if ((m = /^(Updating|Creating|Deleting) .* in (\w+)$/.exec(line))) {
        state.lastOp = line;
        if (m[1] === 'Updating') state.updated++;
        const table = m[2];
        return {
            text: `uploading assets ${P.sym.dot} ${state.updated} updated ${P.sym.dot} ${table}`,
            key: 'upload-assets',
        };
    }
    if (/^Uploading attachment/.test(line)) {
        state.lastOp = line;
        return { skip: true };
    }
    if (/^Found existing scope/.test(line)) return { text: 'uploading assets', key: 'upload-assets' };
    if (/Finished deploying/.test(line)) return { text: 'finished', key: 'done' };
    return null;
}

const childEnv = { ...process.env };
// Same PATH pnpm gives its scripts (tailwindcss etc.), so this also works as `node scripts/deploy.mjs`.
const pathKey = Object.keys(childEnv).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
childEnv[pathKey] = join(pkgDir, 'node_modules', '.bin') + delimiter + (childEnv[pathKey] || '');

let deployNotes = null;

async function main() {
    const t0 = Date.now();
    if (argv.includes('--dry-run')) {
        P.out('Host deploy steps (--dry-run, nothing run):');
        commands.forEach((c, i) => P.out(`  ${i + 1}. ${labelOf(c).padEnd(22)} ${P.c.dim(c)}`));
        return;
    }
    startLog(LOG, 'pnpm run deploy: ' + commands.join(' && '));
    const logRel = relative(process.cwd(), LOG) || LOG;
    P.log(`Host deploy: ${commands.length} steps ${P.sym.dot} full log in ${logRel}`);
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const label = `[${i + 1}/${commands.length}] ${labelOf(cmd)}`;
        const task = P.mode === 'off' ? null : P.task(label);
        const state = {
            built: 0,
            last: '',
            wpPhase: '',
            wpModules: '',
            updated: 0,
            knownRefused: 0,
            otherRefused: [],
            lastOp: '',
        };
        const isSnc = labelOf(cmd) === 'snc deploy';
        if (P.mode === 'off') P.log(`> ${cmd}`);
        const res = await runCommand(cmd, [], {
            cwd: pkgDir,
            env: childEnv,
            shell: true,
            logFile: LOG,
            passthrough: P.mode === 'off' && !P.quiet,
            onLine: (line) => {
                const t = line.trim();
                // Parsed even with --progress=off: the refused-create counts go in the final line.
                const d = isSnc ? sncDetail(t, state) : null;
                if (!task || (d && d.skip)) return;
                if (d) {
                    state.last = d.key;
                    task.update(d.text, d.key);
                }
                // Anything else (not webpack noise): the latest line as a hint, no new line in lines mode.
                else if (t && !(isSnc && state.wpPhase && state.wpPhase !== 'done'))
                    task.update(t.length > 70 ? t.slice(0, 69) + '…' : t, state.last);
            },
            onPrompt: (text) => {
                P.clear();
                P.out(text);
            },
        });
        if (res.code !== 0) {
            if (task) task.fail(`exit ${res.code}`);
            else P.error(`${P.sym.fail} ${label} exit ${res.code}`);
            P.error(`\nLast lines of ${logRel}:`);
            P.error(
                res.tail
                    .filter((l) => l.trim())
                    .slice(-30)
                    .map((l) => '  ' + l)
                    .join('\n')
            );
            P.error(
                `\nHost deploy FAILED at ${labelOf(cmd)} after ${formatDuration(Date.now() - t0)}. Full log: ${LOG}`
            );
            process.exitCode = res.code || 1;
            return;
        }
        if (isSnc) {
            const notes = [];
            if (state.built) notes.push(`${state.built} entries built`);
            if (state.updated) notes.push(`${state.updated} records updated`);
            if (state.knownRefused) notes.push(`${state.knownRefused} attachment uploads refused (known, harmless)`);
            if (task) task.succeed(notes.join(` ${P.sym.dot} `));
            deployNotes = state;
        } else if (task) task.succeed('');
    }
    P.out(`${P.sym.ok} Host deployed in ${formatDuration(Date.now() - t0)} ${P.sym.dot} log: ${logRel}`);
    // Refusals outside the known noise: shown (not fatal; snc itself exits 0), so they can be checked.
    if (deployNotes && deployNotes.otherRefused.length) {
        P.warn(
            `${P.sym.warn} ${deployNotes.otherRefused.length} other record creates refused by the instance (see ${logRel}):`
        );
        deployNotes.otherRefused.slice(0, 12).forEach((l) => P.warn('    ' + l));
        if (deployNotes.otherRefused.length > 12) P.warn(`    … ${deployNotes.otherRefused.length - 12} more`);
    }
}

main().catch((e) => {
    P.clear();
    console.error(e.stack || String(e));
    process.exitCode = 1;
});
