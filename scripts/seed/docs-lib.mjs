// The docs step of `npm run seed`: loads docs/guide/ (Markdown with frontmatter + _nav.json) into the
// docs collection `react-portal` (x_312987_portal_doc_collection), its sections
// (x_312987_portal_doc_section, from _nav.json) and its pages (x_312987_portal_doc), and renders the
// docs seed script (scripts/seed/docs-template.js).
//   loadDocs()          → { docs: { path: row }, sections: { slug: row }, unlisted: [file], nav }
//   docHash(row)        → the content hash stored in content_hash (diff key for run-seed.mjs)
//   classifyDocs / classifySections → what to write, adopt, keep (Studio edits) or deactivate
//   planMigration(...)  → links pre-collection rows to their collection and section (no content change)
//   renderDocsSeed(...) → an exec script that upserts the given rows and deactivates the given paths
// Only the react-portal collection is touched: other collections are instance-only for now. (A repo
// folder per collection, docs/<key>/ with its own _nav.json, could map to more collections later.)
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
    sectionHash as sharedSectionHash,
} from '../../src/server/docs/docs-text.ts';

export { parseFrontmatter, inlineText, createSlugger, analyse };

export const DOCS_ROOT = join(here, '..', '..', 'docs', 'guide');
/** The collection docs/guide is seeded into. */
export const DOCS_COLLECTION = 'react-portal';
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
    // Sections: _nav.json order and titles, docs-icons.json section icons (the pages' default icon).
    const sections = {};
    nav.sections.forEach((section, si) => {
        sections[section.slug] = {
            slug: section.slug,
            title: section.title,
            order: (si + 1) * 100,
            icon: (icons.sections && icons.sections[section.slug]) || '',
            active: true,
        };
        sections[section.slug].content_hash = sectionHash(sections[section.slug]);
    });
    const unlisted = walk(DOCS_ROOT)
        .map((f) => relative(DOCS_ROOT, f).split(sep).join('/'))
        .filter((f) => f.endsWith('.md') && !listed.has(f));
    return { docs, sections, unlisted, missing, nav, icons };
}

/** content_hash of a doc section (src/server/docs/docs-text.ts sectionHash). */
export function sectionHash(row) {
    return sharedSectionHash(row, (text) => createHash('sha256').update(text).digest('hex'));
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
export function renderDocsSeed({ rows, deactivate = [], adopt = [], runId, collection = null, sections = null }) {
    const template = readFileSync(join(here, 'docs-template.js'), 'utf8');
    const json = JSON.stringify(rows.map((r) => ({ ...r, seed_hash: r.content_hash, origin: 'repo' })));
    // collection: { key, title, description, icon } (created only when missing; never updated).
    // sections: { write: [row], adopt: [{ slug, seed_hash }], deactivate: [slug], create: [row], link: [{ id, slug }] }
    const sec = sections || {};
    const secJson = {
        write: (sec.write || []).map((r) => ({ ...r, seed_hash: r.content_hash, origin: 'repo' })),
        adopt: sec.adopt || [],
        deactivate: sec.deactivate || [],
        create: sec.create || [],
        link: sec.link || [],
    };
    return template
        .replace('__DOCS_JSON__', () => json)
        .replace('__DOCS_DEACTIVATE__', () => JSON.stringify(deactivate))
        .replace('__DOCS_ADOPT__', () => JSON.stringify(adopt))
        .replace('__DOCS_COLLECTION__', () => JSON.stringify(collection || { key: DOCS_COLLECTION }))
        .replace('__DOCS_SECTIONS__', () => JSON.stringify(secJson))
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

/**
 * The source-of-truth rule for sections (the same as classifyDocs): L = repo hash (sectionHash of the
 * _nav.json section), C = instance content_hash, S = instance seed_hash. Sections edited in Studio are
 * kept (reported) unless force; instance-only active sections are deactivated unless edited in Studio.
 * remote: [{ slug, content_hash, seed_hash, origin, active }] of the react-portal collection.
 */
export function classifySections(sections, remote, { all = false, force = false } = {}) {
    const bySlug = {};
    for (const r of remote) bySlug[r.slug] = r;
    const out = { write: [], adopt: [], deactivate: [], studioOnly: [], studioEdited: [], conflicts: [], forced: [] };
    const editedRow = (r) => {
        const S = r.seed_hash || (r.origin === 'studio' ? '' : r.content_hash);
        return r.origin === 'studio' || r.content_hash !== S ? { S } : null;
    };
    for (const slug of Object.keys(sections)) {
        const L = sections[slug].content_hash;
        const r = bySlug[slug];
        if (!r) {
            out.write.push(slug);
            continue;
        }
        const edited = editedRow(r);
        if (r.content_hash === L) {
            if (all && !edited) out.write.push(slug);
            else if ((r.seed_hash || '') !== L || r.origin === 'studio') out.adopt.push({ slug, seed_hash: L });
            continue;
        }
        if (!edited) {
            out.write.push(slug);
            continue;
        }
        if (force) {
            out.write.push(slug);
            out.forced.push(slug);
        } else out[edited.S === L ? 'studioEdited' : 'conflicts'].push(slug);
    }
    for (const r of remote) {
        if (sections[r.slug] || !isTrue(r.active)) continue;
        if (editedRow(r) && !force) out.studioOnly.push(r.slug);
        else out.deactivate.push(r.slug);
    }
    return out;
}

/**
 * The one-time migration (idempotent): pages of the react-portal collection (or with no collection
 * yet) that have no section reference are linked to the section of their legacy section_slug. A slug
 * with no section anywhere (an instance-only Studio section) becomes a Studio section built from the
 * page's strings. Only doc_section (and, through its business rule, collection) is set: no content or
 * hash field changes. remote: [{ sys_id, path, doc_section, section, section_slug, section_order, active }]
 */
export function planMigration(sections, remote, remoteSections) {
    const known = new Set([...Object.keys(sections), ...remoteSections.map((r) => r.slug)]);
    const link = [];
    const create = {};
    for (const r of remote) {
        if (r.doc_section) continue;
        const slug = r.section_slug || 'docs';
        link.push({ id: r.sys_id, slug, path: r.path });
        if (!known.has(slug) && !create[slug]) {
            const row = {
                slug,
                title: r.section || slug,
                order: Number(r.section_order) || 100,
                icon: '',
                active: isTrue(r.active),
            };
            create[slug] = { ...row, content_hash: sectionHash(row), origin: 'studio' };
        }
    }
    return { link, create: Object.values(create) };
}

/** The remote queries the docs step needs (run-seed.mjs runs them with now-sdk query). */
export const DOCS_REMOTE = {
    pagesQuery: 'pathISNOTEMPTY^collection.key=' + DOCS_COLLECTION + '^ORcollectionISEMPTY',
    pageFields: [
        'sys_id',
        'path',
        'content_hash',
        'active',
        'seed_hash',
        'origin',
        'doc_section',
        'section',
        'section_slug',
        'section_order',
    ],
    sectionsQuery: 'collection.key=' + DOCS_COLLECTION,
    sectionFields: ['sys_id', 'slug', 'title', 'order', 'content_hash', 'seed_hash', 'origin', 'active'],
};

/**
 * Sections, the collection and the migration for one docs step: { collection, sections (the
 * renderDocsSeed argument), changed (anything to do), lines (the report) }.
 */
export function planDocsExtras(loaded, remote, remoteSections, { all = false, force = false } = {}) {
    const sp = classifySections(loaded.sections, remoteSections, { all, force });
    const mig = planMigration(loaded.sections, remote, remoteSections);
    const sections = {
        write: sp.write.map((slug) => loaded.sections[slug]),
        adopt: sp.adopt,
        deactivate: sp.deactivate,
        create: mig.create,
        link: mig.link.map((l) => ({ id: l.id, slug: l.slug })),
    };
    const collection = {
        key: DOCS_COLLECTION,
        title: (loaded.nav && loaded.nav.title) || 'React Portal',
        description: (loaded.nav && loaded.nav.description) || '',
        icon: 'book-open',
    };
    const lines = [];
    lines.push(
        `  Sections (${DOCS_COLLECTION}): ${Object.keys(loaded.sections).length} in _nav.json, ${remoteSections.length} on the instance → ${sp.write.length} to write, ${sp.adopt.length} to adopt, ${sp.deactivate.length} to deactivate`
    );
    if (sp.write.length && sp.write.length <= 12) lines.push(`    ${sp.write.join(', ')}`);
    if (sp.forced.length) lines.push(`    --docs-force OVERWRITES Studio section edits: ${sp.forced.join(', ')}`);
    if (sp.studioEdited.length)
        lines.push(`    Sections edited in Studio, kept (run npm run docs:pull): ${sp.studioEdited.join(', ')}`);
    if (sp.conflicts.length)
        lines.push(`    Section CONFLICT, kept (changed in the repo AND in Studio): ${sp.conflicts.join(', ')}`);
    if (sp.studioOnly.length) lines.push(`    Studio sections not in the repo, kept: ${sp.studioOnly.join(', ')}`);
    if (mig.link.length)
        lines.push(
            `  Migration: link ${mig.link.length} page(s) to their section (no content change)${mig.create.length ? '; Studio-only sections to create: ' + mig.create.map((c) => c.slug).join(', ') : ''}`
        );
    const changed = !!(
        sp.write.length ||
        sp.adopt.length ||
        sp.deactivate.length ||
        mig.link.length ||
        mig.create.length
    );
    return { collection, sections, changed, lines, plan: sp, migration: mig };
}
