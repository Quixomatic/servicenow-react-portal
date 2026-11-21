// Shared by build-seed.mjs (writes scripts/seed-demo.js) and run-seed.mjs (diff-based `npm run seed`):
// loads the component folders, orders them by record-import dependency, and renders a seed script
// from seed-template.js.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, 'components');
const walk = (d) =>
    readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** Every component folder, keyed by folder name, in dependency order (imports before importers). */
export function loadComponents() {
    const components = {};
    // Keys asked for explicitly with --only (build-seed / run-seed): a half-built folder among them
    // stays a hard error; any other half-built folder (another agent mid-edit) is skipped loudly.
    const onlyAt = process.argv.findIndex((a) => a === '--only' || a.startsWith('--only='));
    const onlyArg =
        onlyAt < 0
            ? ''
            : process.argv[onlyAt].includes('=')
              ? process.argv[onlyAt].split('=')[1]
              : process.argv[onlyAt + 1] || '';
    const requested = new Set(
        onlyArg
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    );
    // Folders: components/<key>/ → app/<key> (map key "<key>"); components/@<ns>/<key>/ → <ns>/<key>
    // (map key "<ns>/<key>"), e.g. @charts/orders-overview → components:charts/orders-overview.
    const folders = [];
    for (const name of readdirSync(root).sort()) {
        const dir = join(root, name);
        if (!statSync(dir).isDirectory()) continue;
        if (name.startsWith('@')) {
            for (const sub of readdirSync(dir).sort())
                if (statSync(join(dir, sub)).isDirectory())
                    folders.push({ id: `${name.slice(1)}/${sub}`, ns: name.slice(1), key: sub, dir: join(dir, sub) });
        } else folders.push({ id: name, ns: 'app', key: name, dir });
    }
    const namespaces = new Set(folders.map((f) => f.ns));
    for (const { id: key, ns, key: recordKey, dir } of folders) {
        const missingFile = !existsSync(join(dir, 'component.json'))
            ? 'component.json'
            : !existsSync(join(dir, 'main.tsx')) && !existsSync(join(dir, 'main.jsx'))
              ? 'main.tsx'
              : '';
        if (missingFile) {
            if (requested.has(key)) throw new Error(`${key}: no ${missingFile}`);
            console.warn(`WARNING: skipping ${key}: no ${missingFile}`);
            continue;
        }
        const c = {
            meta: JSON.parse(readFileSync(join(dir, 'component.json'), 'utf8')),
            namespace: ns,
            key: recordKey,
            clientScript: '',
            css: '',
            serverScript: '',
            extraFiles: [],
        };
        for (const f of walk(dir).sort()) {
            const rel = relative(dir, f).split(sep).join('/');
            const content = readFileSync(f, 'utf8');
            if (rel === 'component.json') continue;
            else if (rel === 'main.tsx' || rel === 'main.jsx') c.clientScript = content;
            else if (rel === 'styles.css') c.css = content;
            else if (rel === 'server.js') c.serverScript = content;
            else if (rel === 'options.schema.json') c.optionsSchema = JSON.parse(content);
            else c.extraFiles.push({ path: rel, target: rel.endsWith('.css') ? 'style' : 'client', content });
        }
        if (!c.clientScript) throw new Error(`${key}: missing main.tsx/main.jsx`);
        // Record imports (components:<ns>/<key>, utilities:<ns>/<key>) of seeded namespaces, as map keys.
        const imports = new Set();
        for (const src of [c.clientScript].concat(
            c.extraFiles.filter((f) => f.target === 'client').map((f) => f.content)
        )) {
            for (const m of src.matchAll(
                /^\s*import\s+(?!type\s)[^'"]*['"](?:components|utilities):([a-z][a-z0-9-]*)\/([a-z][a-z0-9-]*)['"]/gm
            )) {
                if (!namespaces.has(m[1])) continue;
                const dep = m[1] === 'app' ? m[2] : `${m[1]}/${m[2]}`;
                if (dep !== key) imports.add(dep);
            }
        }
        c.imports = Array.from(imports).sort();
        components[key] = c;
    }

    // Seed in dependency order: a record import must compile before its importers (the compile
    // rejects an import whose target has no successful build yet). Alphabetical within a level.
    const ordered = {};
    const visiting = new Set();
    const visit = (key, trail) => {
        if (ordered[key]) return;
        if (visiting.has(key)) throw new Error(`Record import cycle: ${trail.concat(key).join(' -> ')}`);
        if (!components[key])
            throw new Error(
                `${trail[trail.length - 1]} imports ${key.includes('/') ? key : 'app/' + key}, which has no seed folder`
            );
        visiting.add(key);
        for (const dep of components[key].imports) visit(dep, trail.concat(key));
        visiting.delete(key);
        ordered[key] = components[key];
    };
    for (const key of Object.keys(components)) visit(key, []);
    return ordered;
}

// Binary assets (scripts/seed/assets/<file>) inlined as data URIs where the template says
// __ASSET_DATA_URI:<file>__ (e.g. the app-neutral theme's noise textures).
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' };
const assetUri = (_, file) => {
    const ext = file.split('.').pop().toLowerCase();
    return `data:${MIME[ext] || 'application/octet-stream'};base64,${readFileSync(join(here, 'assets', file)).toString('base64')}`;
};

/** The template with assets inlined (placeholders for mode, components, run id and hash still in it). */
export function loadTemplate() {
    return readFileSync(join(here, 'seed-template.js'), 'utf8').replace(/__ASSET_DATA_URI:([\w.-]+)__/g, assetUri);
}

/**
 * Hash of the template that the portals step depends on: the whole template (themes, portals, pages,
 * menus, placements and the shared compile/reprocess logic) with assets inlined, minus the module
 * root line (a version bump rewrites it without changing what the seed does) and CRLF noise.
 * A portals or full run writes it to x_312987_portal.seed.template_hash when it finishes.
 */
export function templateHash(template = loadTemplate()) {
    const text = template.replace(/\r\n/g, '\n').replace(/^\s*var ROOT = .*$/m, '');
    return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export const newRunId = (prefix) => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * Render a seed script.
 *   mode       'full' | 'components' | 'portals'
 *   components ordered { key: component } to inject ({} for portals)
 *   reprocess  false → the run skips the final portal reprocess (an intermediate part)
 *   runId      tagged into the "[seed] done" / failure syslog lines
 *   reprocessScope 'all' (default): the final reprocess covers every active portal; 'touched': only
 *              the portals this exec's writes and compiles affect (safe only when one exec does everything)
 */
export function renderSeed({ mode, components, reprocess, runId, template = loadTemplate(), reprocessScope = 'all' }) {
    // A function replacement: a string one would expand $' / $& / $$ found in component sources (e.g. ['$', '$j']).
    const componentsJson = JSON.stringify(components, null, 1);
    return template
        .replace('__COMPONENTS_JSON__', () => componentsJson)
        .replace('__SEED_MODE__', mode)
        .replace('__SEED_REPROCESS__', reprocess ? 'yes' : 'no')
        .replace('__SEED_REPROCESS_SCOPE__', reprocessScope === 'touched' ? 'touched' : 'all')
        .replace('__SEED_RUN_ID__', runId)
        .replace('__SEED_TEMPLATE_HASH__', templateHash(template));
}

export const bytes = (s) => Buffer.byteLength(s, 'utf8');
