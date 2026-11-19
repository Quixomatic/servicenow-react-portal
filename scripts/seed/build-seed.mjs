// Generates scripts/seed-demo.js from scripts/seed/seed-template.js and the component folders in
// scripts/seed/components/<key>/:
//   component.json   name, kind, tailwind, serverMode, regions, defaults
//   main.tsx|jsx     → client_script (compiled as main.tsx)
//   styles.css       → css
//   server.js        → script (server)
//   options.schema.json → options_schema_json (drives the page designer's options form)
//   anything else    → extra source_file rows (path relative to the folder)
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
    components[key] = c
}

const template = readFileSync(join(here, 'seed-template.js'), 'utf8')
const out = template.replace('__COMPONENTS_JSON__', JSON.stringify(components, null, 1))
writeFileSync(join(here, '..', 'seed-demo.js'), out)
console.log(`seed-demo.js: ${Object.keys(components).length} components, ${(out.length / 1024).toFixed(0)} KB`)
