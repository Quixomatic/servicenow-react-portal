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
//
// Day to day, prefer `npm run seed` (scripts/seed/run-seed.mjs): it diffs the component folders
// against the instance, seeds only what changed (auto-split under the exec payload limit), runs the
// portals step only when this template changed, waits for each run's "[seed] done" syslog line and
// reprocesses once at the end. This builder stays for manual runs and `npm run version:bump`.
// Loading, ordering and rendering live in seed-lib.mjs (shared with run-seed.mjs).
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { here, loadComponents, renderSeed, newRunId, bytes } from './seed-lib.mjs'

const ordered = loadComponents()

// --only a,b,c → a targeted seed: just those components (in dependency order), no portals/pages/
// menus. For quick agent iterations; release seeds stay full. The seed still compiles each listed
// component and reprocesses every active portal once at the end.
const onlyArg = process.argv.find((a) => a.startsWith('--only'))
const onlyKeys = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : process.argv[process.argv.indexOf(onlyArg) + 1] || '').split(',').map((s) => s.trim()).filter(Boolean) : null
let seedComponents = ordered
// --part i/n → the i-th of n contiguous slices of the dependency order (components only). The
// instance rejects exec payloads much over ~1.5 MB, so a full seed runs as parts + --portals.
const partArg = process.argv.find((a) => a.startsWith('--part'))
const partSpec = partArg ? (partArg.includes('=') ? partArg.split('=')[1] : process.argv[process.argv.indexOf(partArg) + 1]) : ''
// --portals → portals, pages, menus and themes only (component ids are looked up on the instance).
const portalsOnly = process.argv.includes('--portals')
let seedMode = onlyKeys || partSpec ? 'components' : portalsOnly ? 'portals' : 'full'
if (partSpec) {
    const [i, n] = partSpec.split('/').map(Number)
    if (!(n >= 1 && i >= 1 && i <= n)) throw new Error('--part expects i/n, e.g. --part 1/3')
    const keys = Object.keys(ordered)
    const size = Math.ceil(keys.length / n)
    seedComponents = {}
    for (const key of keys.slice((i - 1) * size, i * size)) seedComponents[key] = ordered[key]
}
if (portalsOnly) seedComponents = {}
if (onlyKeys) {
    const unknown = onlyKeys.filter((k) => !ordered[k])
    if (unknown.length) throw new Error(`--only: no seed folder for ${unknown.join(', ')}`)
    seedComponents = {}
    for (const key of Object.keys(ordered)) if (onlyKeys.includes(key)) seedComponents[key] = ordered[key]
}

const runId = newRunId('manual')
const out = renderSeed({ mode: seedMode, components: seedComponents, reprocess: !partSpec, runId })
writeFileSync(join(here, '..', 'seed-demo.js'), out)
console.log(`seed-demo.js (${seedMode}${partSpec ? ' part ' + partSpec : ''}, run ${runId}): ${Object.keys(seedComponents).length} of ${Object.keys(ordered).length} components, ${(bytes(out) / 1024).toFixed(0)} KB`)
if (bytes(out) > 1400 * 1024) console.warn('WARNING: over ~1.4 MB, the instance may reject this exec. Use `npm run seed` (auto-splits), or --part 1/2 … then --portals.')
