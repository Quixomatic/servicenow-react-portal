// Generates scripts/seed-demo.js from scripts/seed/seed-template.js and the component folders in
// scripts/seed/components/<key>/:
//   component.json   name, kind, tailwind, serverMode, regions, defaults
//   main.tsx|jsx     → client_script (compiled as main.tsx)
//   styles.css       → css
//   server.js        → script (server)
//   options.schema.json → options_schema_json (drives the page designer's options form)
//   anything else    → extra source_file rows (path relative to the folder)
// scripts/seed/assets/<file> → inlined as a data URI wherever the template says __ASSET_DATA_URI:<file>__
// Run:  node scripts/seed/build-seed.mjs   then   now-sdk exec --file scripts/seed-demo.js
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, 'components')
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))

const components = {}
for (const key of readdirSync(root).sort()) {
    const dir = join(root, key)
    const c = { meta: JSON.parse(readFileSync(join(dir, 'component.json'), 'utf8')), clientScript: '', css: '', serverScript: '', extraFiles: [] }
    for (const f of walk(dir).sort()) {
        const rel = relative(dir, f).split(sep).join('/')
        const content = readFileSync(f, 'utf8')
        if (rel === 'component.json') continue
        else if (rel === 'main.tsx' || rel === 'main.jsx') c.clientScript = content
        else if (rel === 'styles.css') c.css = content
        else if (rel === 'server.js') c.serverScript = content
        else if (rel === 'options.schema.json') c.optionsSchema = JSON.parse(content)
        else c.extraFiles.push({ path: rel, target: rel.endsWith('.css') ? 'style' : 'client', content })
    }
    if (!c.clientScript) throw new Error(`${key}: missing main.tsx/main.jsx`)
    // Record imports (components:app/<key>, utilities:app/<key>) found in the client sources.
    const imports = new Set()
    for (const src of [c.clientScript].concat(c.extraFiles.filter((f) => f.target === 'client').map((f) => f.content))) {
        for (const m of src.matchAll(/^\s*import\s+(?!type\s)[^'"]*['"](?:components|utilities):app\/([a-z][a-z0-9-]*)['"]/gm)) if (m[1] !== key) imports.add(m[1])
    }
    c.imports = Array.from(imports).sort()
    components[key] = c
}

// Seed in dependency order: a record import must compile before its importers (the compile
// rejects an import whose target has no successful build yet). Alphabetical within a level.
const ordered = {}
const visiting = new Set()
const visit = (key, trail) => {
    if (ordered[key]) return
    if (visiting.has(key)) throw new Error(`Record import cycle: ${trail.concat(key).join(' -> ')}`)
    if (!components[key]) throw new Error(`${trail[trail.length - 1]} imports app/${key}, which has no seed folder`)
    visiting.add(key)
    for (const dep of components[key].imports) visit(dep, trail.concat(key))
    visiting.delete(key)
    ordered[key] = components[key]
}
for (const key of Object.keys(components)) visit(key, [])

// Binary assets (scripts/seed/assets/<file>) inlined as data URIs where the template says
// __ASSET_DATA_URI:<file>__ (e.g. the app-neutral theme's noise textures).
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' }
const assetUri = (_, file) => {
    const ext = file.split('.').pop().toLowerCase()
    return `data:${MIME[ext] || 'application/octet-stream'};base64,${readFileSync(join(here, 'assets', file)).toString('base64')}`
}
const template = readFileSync(join(here, 'seed-template.js'), 'utf8').replace(/__ASSET_DATA_URI:([\w.-]+)__/g, assetUri)
const out = template.replace('__COMPONENTS_JSON__', JSON.stringify(ordered, null, 1))
writeFileSync(join(here, '..', 'seed-demo.js'), out)
console.log(`seed-demo.js: ${Object.keys(components).length} components, ${(out.length / 1024).toFixed(0)} KB`)
