// npm run docs:pull: writes doc pages edited in Portal Studio back into docs/guide, so they can be
// committed (.plans/docs-editor.md). Read-only on the instance (now-sdk query).
//
// Selection: pages edited in Studio (origin = studio, or content_hash ≠ seed_hash), including
// pages deactivated in Studio. --all pulls every page, --only a/b,c/d just those paths.
// Writes:
//   docs/guide/<path>.md          frontmatter (title, description, section, order, tags; other keys
//                                  kept) + the stored markdown, byte for byte
//   docs/guide/_nav.json          only the sections a pulled page is in (or left) are rebuilt, in
//                                  the instance's order; repo-only pages keep their relative spot
//   scripts/seed/docs-icons.json  a pages entry when the icon isn't the section's default
// Deactivated pages leave _nav.json; their .md file stays (never deleted) and is reported.
// Then it checks that loadDocs() reproduces each pulled page's content_hash exactly, so the next
// `npm run seed` adopts the pages as clean. Flags: --dry-run, --all, --only, --help.
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { here } from './seed-lib.mjs'
import { DOCS_ROOT, loadDocs, parseFrontmatter } from './docs-lib.mjs'
import { frontmatterValue } from '../../src/server/docs/docs-text.ts'

const repoRoot = join(here, '..', '..')
const NAV_FILE = join(DOCS_ROOT, '_nav.json')
const ICONS_FILE = join(here, 'docs-icons.json')
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const valueOf = (n) => {
    const a = argv.find((x) => x === n || x.startsWith(n + '='))
    if (!a) return null
    return a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[argv.indexOf(a) + 1] || ''
}
const KNOWN = ['--dry-run', '--all', '--only', '--help', '-h']
if (flag('--help') || flag('-h')) {
    console.log(`npm run docs:pull -- [flags]
  (no flags)     pull every page edited in Studio (and Studio-created / deactivated pages)
  --all          pull every page on the instance
  --only a,b     just these doc paths (e.g. concepts/layouts)
  --dry-run      show what would be written, write nothing`)
    process.exit(0)
}
const unknown = argv.filter((a) => a.startsWith('-') && !KNOWN.includes(a.split('=')[0]))
if (unknown.length) {
    console.error('Unknown flag(s): ' + unknown.join(', ') + ' (see --help). Nothing was written.')
    process.exit(1)
}
const DRY = flag('--dry-run')
const ONLY = valueOf('--only') === null ? null : valueOf('--only').split(',').map((s) => s.trim().replace(/\.md$/, '')).filter(Boolean)
const log = (...a) => console.log(...a)

/* ---------------- now-sdk query (as run-seed.mjs: spawned via node, no shell) ---------------- */

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

function sdk(args) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [SDK, ...args], { cwd: repoRoot, windowsHide: true })
        let out = ''
        let err = ''
        child.stdout.on('data', (d) => (out += d))
        child.stderr.on('data', (d) => (err += d))
        child.on('close', (code) => resolve({ code, out, err }))
    })
}

async function query(table, q, fields, pageSize) {
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

/* ---------------- Helpers ---------------- */

const isTrue = (v) => v === true || v === 'true' || v === '1'
const num = (v, d) => (v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : d)
const lf = (s) => String(s || '').replace(/\r\n/g, '\n')

function edited(r) {
    if (r.origin === 'studio') return true
    const S = r.seed_hash || r.content_hash
    return r.content_hash !== S
}

/** The .md file text: existing frontmatter lines kept (managed keys updated in place), then the body. */
function fileText(row, position, existing) {
    const managed = {
        title: frontmatterValue(row.title),
        description: row.description ? frontmatterValue(row.description) : null,
        section: frontmatterValue(row.section),
        order: String(position),
        tags: row.tags ? frontmatterValue(String(row.tags).split(',').map((s) => s.trim()).filter(Boolean)) : null,
    }
    const lines = []
    const done = new Set()
    const fm = existing ? lf(existing).match(/^---\n([\s\S]*?)\n---\n?/) : null
    if (fm) {
        for (const line of fm[1].split('\n')) {
            const kv = line.match(/^([A-Za-z0-9_-]+):/)
            if (kv && Object.prototype.hasOwnProperty.call(managed, kv[1])) {
                done.add(kv[1])
                if (managed[kv[1]] !== null) lines.push(kv[1] + ': ' + managed[kv[1]])
            } else lines.push(line)
        }
    }
    for (const k of Object.keys(managed)) if (!done.has(k) && managed[k] !== null) lines.push(k + ': ' + managed[k])
    return '---\n' + lines.join('\n') + '\n---\n' + lf(row.markdown)
}

/* ---------------- Main ---------------- */

async function main() {
    log('Reading doc pages from the instance…')
    const fields = ['path', 'title', 'description', 'section', 'section_slug', 'section_order', 'order', 'tags', 'icon', 'markdown', 'content_hash', 'active', 'seed_hash', 'origin']
    const rows = await query('x_312987_portal_doc', 'pathISNOTEMPTY', fields, 40)
    const byPath = {}
    rows.forEach((r) => (byPath[r.path] = r))
    if (rows.length && rows.every((r) => r.seed_hash === undefined)) log('  (seed_hash / origin are not installed yet: nothing counts as edited; use --only or --all)')

    let pick = rows.filter((r) => edited(r))
    if (flag('--all')) pick = rows.slice()
    if (ONLY) {
        const missing = ONLY.filter((p) => !byPath[p])
        if (missing.length) throw new Error('--only: no doc page ' + missing.join(', '))
        pick = ONLY.map((p) => byPath[p])
    }
    // Inactive pages only matter when they were deactivated in Studio (still listed in _nav.json).
    const navText = readFileSync(NAV_FILE, 'utf8')
    const nav = JSON.parse(navText)
    const navPaths = new Set()
    nav.sections.forEach((s) => s.pages.forEach((p) => navPaths.add(p.path.replace(/\.md$/, ''))))
    pick = pick.filter((r) => isTrue(r.active) || navPaths.has(r.path))
    if (!pick.length) {
        log('Nothing edited in Studio: docs/guide already matches the instance.')
        return
    }
    const repo = loadDocs()

    // Active instance rows by section, in order.
    const active = rows.filter((r) => isTrue(r.active))
    const sectionsByslug = {}
    active.forEach((r) => {
        const slug = r.section_slug
        if (!sectionsByslug[slug]) sectionsByslug[slug] = { slug, title: r.section, order: num(r.section_order, 100), rows: [] }
        const s = sectionsByslug[slug]
        if (num(r.section_order, 100) < s.order) s.order = num(r.section_order, 100)
        s.rows.push(r)
    })
    Object.values(sectionsByslug).forEach((s) => s.rows.sort((a, b) => num(a.order, 100) - num(b.order, 100) || String(a.title).localeCompare(String(b.title))))

    // Sections touched: where a pulled page is now, and where it was in the repo nav.
    const touched = new Set()
    pick.forEach((r) => {
        if (isTrue(r.active)) touched.add(r.section_slug)
        nav.sections.forEach((s) => {
            if (s.pages.some((p) => p.path.replace(/\.md$/, '') === r.path)) touched.add(s.slug)
        })
    })

    // Rebuild touched sections from the instance; repo-only pages (no active row) keep their spot.
    const pickedPaths = new Set(pick.map((r) => r.path))
    const repoOnly = []
    const newSections = []
    nav.sections.forEach((s) => {
        if (!touched.has(s.slug)) return
        const inst = sectionsByslug[s.slug]
        const pages = inst ? inst.rows.map((r) => ({ title: r.title, path: r.path + '.md' })) : []
        if (inst) s.title = inst.title
        // Repo pages without an active instance row that weren't pulled (e.g. not seeded yet).
        s.pages.forEach((p, i) => {
            const path = p.path.replace(/\.md$/, '')
            const row = byPath[path]
            if ((row && isTrue(row.active)) || pickedPaths.has(path)) return
            repoOnly.push(p.path)
            const prev = i > 0 ? s.pages[i - 1].path : null
            const at = prev ? pages.findIndex((x) => x.path === prev) + 1 : 0
            pages.splice(at > 0 ? at : 0, 0, p)
        })
        // Keep existing nav titles' objects untouched when equal (byte-identical output).
        s.pages = pages.map((p) => {
            const old = s.pages.find((x) => x.path === p.path)
            return old && old.title === p.title ? old : p
        })
    })
    // Sections that exist only on the instance.
    Object.values(sectionsByslug).forEach((s) => {
        if (!touched.has(s.slug) || nav.sections.some((x) => x.slug === s.slug)) return
        const sec = { title: s.title, slug: s.slug, pages: s.rows.map((r) => ({ title: r.title, path: r.path + '.md' })) }
        newSections.push({ sec, order: s.order })
    })
    // Section order: the instance's for sections it has, others keep their relative position.
    const orderOf = (s) => (sectionsByslug[s.slug] && sectionsByslug[s.slug].rows.length ? sectionsByslug[s.slug].order : null)
    let all = nav.sections.slice()
    newSections.forEach(({ sec, order }) => {
        const at = all.findIndex((x) => orderOf(x) !== null && orderOf(x) > order)
        all.splice(at < 0 ? all.length : at, 0, sec)
    })
    const placed = all.filter((s) => orderOf(s) !== null).sort((a, b) => orderOf(a) - orderOf(b))
    let k = 0
    all = all.map((s) => (orderOf(s) !== null ? placed[k++] : s))
    nav.sections = all.filter((s) => s.pages.length)

    // Icons.
    const iconsText = existsSync(ICONS_FILE) ? readFileSync(ICONS_FILE, 'utf8') : ''
    const icons = iconsText ? JSON.parse(iconsText) : { sections: {}, pages: {} }
    icons.pages = icons.pages || {}
    pick.forEach((r) => {
        if (!isTrue(r.active)) return
        const def = (icons.sections && icons.sections[r.section_slug]) || ''
        const has = Object.prototype.hasOwnProperty.call(icons.pages, r.path)
        const effective = has ? String(icons.pages[r.path] || '') : def
        if (effective === (r.icon || '')) return // already right (redundant entries stay as written)
        if ((r.icon || '') === def) delete icons.pages[r.path]
        else icons.pages[r.path] = r.icon || ''
    })

    // Files.
    const writes = []
    const removed = []
    pick.forEach((r) => {
        if (!isTrue(r.active)) {
            removed.push(r.path)
            return
        }
        const sec = nav.sections.find((s) => s.slug === r.section_slug)
        const position = sec ? sec.pages.findIndex((p) => p.path === r.path + '.md') + 1 : 1
        const file = join(DOCS_ROOT, r.path + '.md')
        const existing = existsSync(file) ? readFileSync(file, 'utf8') : null
        const text = fileText(r, position, existing)
        const repoRow = repo.docs[r.path]
        const conflict = repoRow && r.seed_hash && repoRow.content_hash !== r.seed_hash && repoRow.content_hash !== r.content_hash
        writes.push({ file, text, path: r.path, changed: lf(existing) !== text, isNew: !existing, conflict })
    })

    const navOut = JSON.stringify(nav, null, 4) + '\n'
    const iconsOut = JSON.stringify(icons, null, 4) + '\n'
    const navChanged = lf(navText) !== navOut
    const iconsChanged = lf(iconsText) !== iconsOut
    log(`\nPull (${pick.length} page${pick.length > 1 ? 's' : ''}):`)
    writes.forEach((w) => log(`  ${w.isNew ? 'new     ' : w.changed ? 'update  ' : 'same    '} docs/guide/${w.path}.md${w.conflict ? '   (CONFLICT: the repo changed too; review git diff before committing)' : ''}`))
    removed.forEach((p) => log(`  removed from _nav.json (deactivated in Studio; the .md file is kept): docs/guide/${p}.md`))
    log(`  _nav.json: ${navChanged ? 'updated (sections: ' + Array.from(touched).join(', ') + ')' : 'unchanged'}`)
    log(`  docs-icons.json: ${iconsChanged ? 'updated' : 'unchanged'}`)
    if (repoOnly.length) log(`  Kept repo-only pages in touched sections (not on the instance yet): ${repoOnly.join(', ')}`)
    if (DRY) {
        log('\n--dry-run: nothing written.')
        return
    }
    writes.forEach((w) => {
        if (!w.changed) return
        mkdirSync(dirname(w.file), { recursive: true })
        writeFileSync(w.file, w.text)
    })
    if (navChanged) writeFileSync(NAV_FILE, navOut)
    if (iconsChanged) writeFileSync(ICONS_FILE, iconsOut)

    // Verify: the repo now hashes exactly like the instance rows.
    const after = loadDocs()
    const bad = writes.filter((w) => !after.docs[w.path] || after.docs[w.path].content_hash !== byPath[w.path].content_hash)
    if (bad.length) {
        log('\nVERIFY FAILED: these pages do not hash like the instance after the pull (the next seed would report them as conflicts):')
        bad.forEach((w) => {
            const a = after.docs[w.path]
            const r = byPath[w.path]
            const diffs = !a ? ['not in _nav.json'] : ['title', 'description', 'section', 'section_slug', 'section_order', 'order', 'tags', 'icon', 'markdown'].filter((f) => String(a[f]) !== String(r[f] == null ? '' : r[f]))
            log(`  ${w.path}: ${diffs.join(', ') || 'derived fields'}`)
        })
        process.exitCode = 1
        return
    }
    log(`\nVerified: ${writes.length} page(s) hash exactly like the instance. Review \`git diff docs/guide scripts/seed/docs-icons.json\`, commit, then \`npm run seed\` adopts them.`)
}

main().catch((e) => {
    console.error(e.stack || String(e))
    process.exitCode = 1
})
