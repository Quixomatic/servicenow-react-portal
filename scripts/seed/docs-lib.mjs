// The docs step of `npm run seed`: loads docs/guide/ (Markdown with frontmatter + _nav.json) into the
// rows of x_312987_portal_doc and renders the docs seed script (scripts/seed/docs-template.js).
//   loadDocs()          → { docs: { path: row }, unlisted: [file], nav }
//   docHash(row)        → the content hash stored in content_hash (diff key for run-seed.mjs)
//   renderDocsSeed(...) → an exec script that upserts the given rows and deactivates the given paths
// Heading slugs follow GitHub's algorithm (lower-case, punctuation dropped, spaces → '-', duplicates
// suffixed -1, -2 …), the same as utilities:app/markdown's createSlugger on the client.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { here } from './seed-lib.mjs'

export const DOCS_ROOT = join(here, '..', '..', 'docs', 'guide')
const ICONS_FILE = join(here, 'docs-icons.json')

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))

/** `key: value` frontmatter (strings, numbers, [a, b] lists). Returns { data, body }. */
export function parseFrontmatter(text) {
    const src = text.replace(/\r\n/g, '\n')
    const m = src.match(/^---\n([\s\S]*?)\n---\n?/)
    if (!m) return { data: {}, body: src }
    const data = {}
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
        if (!kv) continue
        let v = kv[2].trim()
        if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
        else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v)
        else v = v.replace(/^['"]|['"]$/g, '')
        data[kv[1]] = v
    }
    return { data, body: src.slice(m[0].length) }
}

/** Inline Markdown → plain text (code spans keep their text, links their label). */
export function inlineText(s) {
    // Code spans are set aside first, so their underscores, asterisks and <tags> stay literal.
    const codes = []
    const out = s
        .replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => '\u0000' + (codes.push(code.trim()) - 1) + '\u0000')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/(^|[^\w])__(.+?)__(?=[^\w]|$)/g, '$1$2')
        .replace(/\*(\S(?:.*?\S)?)\*/g, '$1')
        .replace(/(^|[^\w])_(\S(?:.*?\S)?)_(?=[^\w]|$)/g, '$1$2')
        .replace(/<\/?[a-z][\w-]*(\s[^<>]*)?\/?>/gi, '')
        .replace(/\\([\\`*_{}\[\]()#+\-.!|<>])/g, '$1')
    return out.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]).trim()
}

/** GitHub-style heading slugs, deduplicated per document. */
export function createSlugger() {
    const seen = {}
    return (text) => {
        const base = String(text)
            .toLowerCase()
            .trim()
            .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
            .replace(/\s/g, '-')
        let slug = base
        if (seen[base] !== undefined) {
            seen[base]++
            slug = base + '-' + seen[base]
        } else seen[base] = 0
        return slug
    }
}

/**
 * Headings (depth 2–4) and the search sections of a Markdown body. Fenced code is skipped for
 * headings and kept out of the search text (identifiers in inline code stay searchable).
 */
export function analyse(body) {
    const slug = createSlugger()
    const headings = []
    const sections = [{ h: '', t: '', x: [] }]
    let fence = null
    for (const line of body.split('\n')) {
        const f = line.match(/^\s{0,3}(`{3,}|~{3,})/)
        if (f) {
            if (!fence) fence = f[1]
            else if (line.trim().startsWith(fence)) fence = null
            continue
        }
        if (fence) continue
        const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/)
        if (h) {
            const text = inlineText(h[2])
            const id = slug(text)
            if (h[1].length >= 2 && h[1].length <= 4) headings.push({ depth: h[1].length, text, slug: id })
            if (h[1].length >= 2) sections.push({ h: id, t: text, x: [] })
            continue
        }
        const plain = inlineText(
            line
                .replace(/^\s*>\s?/, '')
                .replace(/^\s*([-*+]|\d+[.)])\s+/, '')
                .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/, '')
                .replace(/\|/g, ' ')
        )
        if (plain) sections[sections.length - 1].x.push(plain)
    }
    const search = sections
        .map((s) => ({ h: s.h, t: s.t, x: s.x.join(' ').replace(/\s+/g, ' ').trim() }))
        .filter((s) => s.h || s.x)
    return { headings, search }
}

/** Every page listed in docs/guide/_nav.json as a doc row, keyed by path (no .md). */
export function loadDocs() {
    const nav = JSON.parse(readFileSync(join(DOCS_ROOT, '_nav.json'), 'utf8'))
    const icons = existsSync(ICONS_FILE) ? JSON.parse(readFileSync(ICONS_FILE, 'utf8')) : { sections: {}, pages: {} }
    const docs = {}
    const listed = new Set()
    const missing = []
    nav.sections.forEach((section, si) => {
        section.pages.forEach((page, pi) => {
            const file = join(DOCS_ROOT, page.path)
            listed.add(page.path)
            // Listed but not written yet (another agent mid-edit): skipped, reported, never fatal.
            if (!existsSync(file)) return void missing.push(page.path)
            const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'))
            const path = page.path.replace(/\.md$/, '')
            const { headings, search } = analyse(body)
            docs[path] = {
                path,
                title: String(data.title || page.title || path),
                description: String(data.description || ''),
                section: section.title,
                section_slug: section.slug,
                section_order: (si + 1) * 100,
                order: (pi + 1) * 100,
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : String(data.tags || ''),
                icon: (icons.pages && icons.pages[path]) || (icons.sections && icons.sections[section.slug]) || '',
                source_path: 'docs/guide/' + page.path,
                markdown: body,
                headings_json: headings,
                search_text: JSON.stringify(search),
                active: true,
            }
            docs[path].content_hash = docHash(docs[path])
        })
    })
    const unlisted = walk(DOCS_ROOT)
        .map((f) => relative(DOCS_ROOT, f).split(sep).join('/'))
        .filter((f) => f.endsWith('.md') && !listed.has(f))
    return { docs, unlisted, missing, nav }
}

const canonical = (x) =>
    Array.isArray(x) ? '[' + x.map(canonical).join(',') + ']' : x && typeof x === 'object' ? '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}' : JSON.stringify(x)

/** Hash of every field the seed writes except the hash itself. */
export function docHash(row) {
    const copy = { ...row }
    delete copy.content_hash
    return createHash('sha256').update(canonical(copy)).digest('hex').slice(0, 32)
}

/** Render a docs seed (docs-template.js): upsert `rows`, deactivate `deactivate` (paths). */
export function renderDocsSeed({ rows, deactivate = [], runId }) {
    const template = readFileSync(join(here, 'docs-template.js'), 'utf8')
    const json = JSON.stringify(rows)
    return template
        .replace('__DOCS_JSON__', () => json)
        .replace('__DOCS_DEACTIVATE__', () => JSON.stringify(deactivate))
        .replace('__SEED_RUN_ID__', runId)
}
