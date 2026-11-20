// The docs step of `npm run seed`: loads docs/guide/ (Markdown with frontmatter + _nav.json) into the
// rows of x_312987_portal_doc and renders the docs seed script (scripts/seed/docs-template.js).
//   loadDocs()          → { docs: { path: row }, unlisted: [file], nav }
//   docHash(row)        → the content hash stored in content_hash (diff key for run-seed.mjs)
//   renderDocsSeed(...) → an exec script that upserts the given rows and deactivates the given paths
// Heading slugs follow GitHub's algorithm (lower-case, punctuation dropped, spaces → '-', duplicates
// suffixed -1, -2 …), the same as utilities:app/markdown's createSlugger on the client.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { here } from './seed-lib.mjs';
// The analysis (frontmatter, headings, search text, hash input) is shared with the server's Studio
// saves, so a page saved in Studio hashes exactly as the same content seeded from the repo.
import {
    parseFrontmatter,
    inlineText,
    createSlugger,
    analyse,
    docHash as sharedDocHash,
} from '../../src/server/docs/docs-text.ts';

export { parseFrontmatter, inlineText, createSlugger, analyse };

export const DOCS_ROOT = join(here, '..', '..', 'docs', 'guide');
const ICONS_FILE = join(here, 'docs-icons.json');

const walk = (d) =>
    readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** Every page listed in docs/guide/_nav.json as a doc row, keyed by path (no .md). */
export function loadDocs() {
    const nav = JSON.parse(readFileSync(join(DOCS_ROOT, '_nav.json'), 'utf8'));
    const icons = existsSync(ICONS_FILE) ? JSON.parse(readFileSync(ICONS_FILE, 'utf8')) : { sections: {}, pages: {} };
    const docs = {};
    const listed = new Set();
    const missing = [];
    nav.sections.forEach((section, si) => {
        section.pages.forEach((page, pi) => {
            const file = join(DOCS_ROOT, page.path);
            listed.add(page.path);
            // Listed but not written yet (another agent mid-edit): skipped, reported, never fatal.
            if (!existsSync(file)) return void missing.push(page.path);
            const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
            const path = page.path.replace(/\.md$/, '');
            const { headings, search } = analyse(body);
            docs[path] = {
                path,
                title: String(data.title || page.title || path),
                description: String(data.description || ''),
                section: section.title,
                section_slug: section.slug,
                section_order: (si + 1) * 100,
                order: (pi + 1) * 100,
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : String(data.tags || ''),
                // A pages entry wins, even "" (no icon); else the section's icon (docs:pull writes these).
                icon:
                    icons.pages && Object.prototype.hasOwnProperty.call(icons.pages, path)
                        ? String(icons.pages[path] || '')
                        : (icons.sections && icons.sections[section.slug]) || '',
                source_path: 'docs/guide/' + page.path,
                markdown: body,
                headings_json: headings,
                search_text: JSON.stringify(search),
                active: true,
            };
            docs[path].content_hash = docHash(docs[path]);
        });
    });
    const unlisted = walk(DOCS_ROOT)
        .map((f) => relative(DOCS_ROOT, f).split(sep).join('/'))
        .filter((f) => f.endsWith('.md') && !listed.has(f));
    return { docs, unlisted, missing, nav };
}

/** Hash of every field the seed writes except the hash itself (src/server/docs/docs-text.ts). */
export function docHash(row) {
    return sharedDocHash(row, (text) => createHash('sha256').update(text).digest('hex'));
}

/**
 * Render a docs seed (docs-template.js): upsert `rows` (each stamped seed_hash = its content_hash,
 * origin = repo), adopt `adopt` ([{ path, seed_hash }]: content already matches, only the stamp),
 * deactivate `deactivate` (paths).
 */
export function renderDocsSeed({ rows, deactivate = [], adopt = [], runId }) {
    const template = readFileSync(join(here, 'docs-template.js'), 'utf8');
    const json = JSON.stringify(rows.map((r) => ({ ...r, seed_hash: r.content_hash, origin: 'repo' })));
    return template
        .replace('__DOCS_JSON__', () => json)
        .replace('__DOCS_DEACTIVATE__', () => JSON.stringify(deactivate))
        .replace('__DOCS_ADOPT__', () => JSON.stringify(adopt))
        .replace('__SEED_RUN_ID__', runId);
}

const isTrue = (v) => v === true || v === 'true' || v === '1';

/**
 * The source-of-truth rule (.plans/docs-editor.md) for every page: L = repo hash, C = instance
 * content_hash, S = instance seed_hash (legacy rows with no seed_hash and origin repo: S = C).
 * Edited in Studio = origin studio, or C ≠ S.
 *   C = L                  in sync → adopt when S ≠ L or origin studio (stamp only)
 *   not edited, L ≠ C      repo changed → write
 *   edited, L = S          only Studio changed → skip ("run npm run docs:pull")
 *   edited, L ≠ S          both changed → conflict, skip
 *   no row                 new page → write
 * force (--docs-force) writes edited and conflicting pages too; all (--docs-all) rewrites every
 * page that isn't edited in Studio. Instance-only active rows are deactivated unless edited in
 * Studio (then kept and reported as studioOnly).
 * remote: [{ path, content_hash, active, seed_hash, origin }]
 */
export function classifyDocs(docs, remote, { all = false, force = false } = {}) {
    const byPath = {};
    for (const r of remote) byPath[r.path] = r;
    const out = { write: [], adopt: [], deactivate: [], studioOnly: [], studioEdited: [], conflicts: [], forced: [] };
    const editedRow = (r) => {
        const S = r.seed_hash || (r.origin === 'studio' ? '' : r.content_hash);
        return r.origin === 'studio' || r.content_hash !== S ? { S } : null;
    };
    for (const p of Object.keys(docs)) {
        const L = docs[p].content_hash;
        const r = byPath[p];
        if (!r) {
            out.write.push(p);
            continue;
        }
        const edited = editedRow(r);
        if (r.content_hash === L && isTrue(r.active)) {
            if (all && !edited) out.write.push(p);
            else if ((r.seed_hash || '') !== L || r.origin === 'studio') out.adopt.push({ path: p, seed_hash: L });
            continue;
        }
        if (!edited) {
            out.write.push(p);
            continue;
        }
        const kind = edited.S === L ? 'studioEdited' : 'conflicts';
        if (force) {
            out.write.push(p);
            out.forced.push(p);
        } else out[kind].push(p);
    }
    for (const r of remote) {
        if (docs[r.path] || !isTrue(r.active)) continue;
        if (editedRow(r) && !force) out.studioOnly.push(r.path);
        else out.deactivate.push(r.path);
    }
    return out;
}
