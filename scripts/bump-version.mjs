#!/usr/bin/env node
/**
 * bump-version: set every React Portal version file in lockstep, safely.
 *
 *   npm run version:bump -- <patch|minor|major|X.Y.Z> [--dry-run]
 *
 * Writes ONLY version files (never the changelog, never git). The /version-bump flow still owns the
 * CHANGELOG entry, commit and push; this does the mechanical, error-prone edits.
 *
 * Why the module paths matter: the Fluent SDK installs every server module at
 *   x_312987_portal/x-312987-react-portal/<package.json version>/src/server/...
 * Generated business rules / REST routes pick the new path up on build, but hand-written callers
 * (the ReactPortal Script Include, the seed template) hardcode it, so they bump here too.
 *
 * Every edit is TARGETED (a JSON "version" key, or the exact `x-312987-react-portal/<version>/`
 * path segment). Refuses to run if the files are out of sync (surfaces the mismatch rather than
 * silently normalizing). Three segments only, never a fourth.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run') || process.argv.includes('--check');
const ARG = process.argv.slice(2).find((a) => !a.startsWith('-'));
const PKG = 'x-312987-react-portal';

const die = (msg) => {
    console.error(`\n\u2716 ${msg}\n`);
    process.exit(1);
};

/** kind: json = a package.json-style "version" key; modulePath = every `${PKG}/<ver>/` segment. */
const TARGETS = [
    { path: 'package.json', kind: 'json' },
    { path: 'packages/portal-host/package.json', kind: 'json' },
    { path: 'packages/global-helpers/package.json', kind: 'json' },
    { path: 'src/fluent/script-includes/ReactPortal.server.js', kind: 'modulePath' },
    { path: 'scripts/seed/seed-template.js', kind: 'modulePath' },
];

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const modulePathRe = new RegExp(`${PKG.replace(/[-]/g, '\\-')}/(\\d+\\.\\d+\\.\\d+)/`, 'g');

function readVersion(t) {
    const text = readFileSync(join(ROOT, t.path), 'utf8');
    if (t.kind === 'json') return JSON.parse(text).version;
    const found = [...text.matchAll(modulePathRe)].map((m) => m[1]);
    const unique = [...new Set(found)];
    if (!unique.length) die(`${t.path}: no "${PKG}/<version>/" module path found`);
    if (unique.length > 1) die(`${t.path}: mixed module path versions ${unique.join(', ')}`);
    return unique[0];
}

function writeVersion(t, next) {
    const file = join(ROOT, t.path);
    const text = readFileSync(file, 'utf8');
    let out;
    if (t.kind === 'json') {
        // Replace only the first top-level "version" value, preserving formatting.
        out = text.replace(/("version"\s*:\s*")(\d+\.\d+\.\d+)(")/, `$1${next}$3`);
    } else {
        out = text.replace(modulePathRe, `${PKG}/${next}/`);
    }
    if (out === text) die(`${t.path}: nothing changed (unexpected)`);
    if (!DRY) writeFileSync(file, out);
}

for (const t of TARGETS) if (!existsSync(join(ROOT, t.path))) die(`missing version file ${t.path}`);
const current = TARGETS.map((t) => ({ ...t, version: readVersion(t) }));
const versions = [...new Set(current.map((t) => t.version))];
if (versions.length !== 1) {
    die(
        `version files are out of sync:\n${current.map((t) => `  ${t.version.padEnd(10)} ${t.path}`).join('\n')}\nFix the mismatch deliberately; this script won't normalize it.`
    );
}
const from = versions[0];
if (!SEMVER.test(from)) die(`current version "${from}" is not X.Y.Z`);

if (!ARG) die('usage: npm run version:bump -- <patch|minor|major|X.Y.Z> [--dry-run]');
let next;
if (SEMVER.test(ARG)) next = ARG;
else {
    const [, ma, mi, pa] = SEMVER.exec(from).map(Number);
    if (ARG === 'patch') next = `${ma}.${mi}.${pa + 1}`;
    else if (ARG === 'minor') next = `${ma}.${mi + 1}.0`;
    else if (ARG === 'major') next = `${ma + 1}.0.0`;
    else die(`unknown bump "${ARG}" (patch | minor | major | X.Y.Z)`);
}
if (next === from) die(`already at ${from}`);

console.log(`${DRY ? '[dry run] ' : ''}${from} \u2192 ${next}`);
for (const t of current) {
    writeVersion(t, next);
    console.log(`  ${DRY ? 'would set' : 'set'} ${t.path}`);
}

// The seed script is generated from the template; regenerate so it carries the new module path.
if (!DRY) {
    execSync('node scripts/seed/build-seed.mjs', { stdio: 'inherit' });
    console.log('  regenerated scripts/seed-demo.js');
}
console.log(
    DRY
        ? '\nNothing written.'
        : `\nDone. Now write the CHANGELOG entry, build + install (module paths moved to ${next}), commit and push.`
);
