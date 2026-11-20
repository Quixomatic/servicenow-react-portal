import { gs, GlideDigest } from '@servicenow/glide';
import { GR, newGR, getById, each, str, int, bool } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { badRequest, notFound, rpError } from '../lib/errors.ts';
import { parseJson, isPlainObject } from '../lib/util.ts';
import { requireStudio } from '../security/access.ts';
import { buildDocRow, docHash } from './docs-text.ts';
import type { DocHeading, DocRow } from './docs-text.ts';

/**
 * RPDocsService: Portal Studio's Docs activity (x_312987_portal_doc).
 *
 * Every write recomputes the derived fields (source_path, headings_json, search_text,
 * content_hash) with src/server/docs/docs-text.ts, the same code the docs seed runs on the repo, so a
 * page saved here hashes exactly as the same content seeded from docs/guide.
 *
 * Ordering is normalised on every move: active pages of a section get order (i + 1) * 100 and
 * sections section_order (si + 1) * 100, the numbers the seed derives from _nav.json positions,
 * so `npm run docs:pull` can reproduce them exactly.
 *
 * Source of truth (.plans/docs-editor.md): `origin` (repo | studio) and `seed_hash` (the hash the
 * seed last wrote) are written only when the fields exist on the instance (they are proposed, not
 * yet installed). "Edited in Studio" = content_hash ≠ seed_hash. No deletes: pages are deactivated.
 */

const DOC = 'x_312987_portal_doc';
const PATH_RE = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export interface DocDto {
    id: string;
    path: string;
    title: string;
    description: string;
    section: string;
    sectionSlug: string;
    sectionOrder: number;
    order: number;
    tags: string;
    icon: string;
    sourcePath: string;
    active: boolean;
    origin: string;
    contentHash: string;
    seedHash: string;
    /** content_hash differs from what the seed last wrote (null: the seed_hash field isn't installed). */
    studioEdited: boolean | null;
    headings: DocHeading[];
    updatedOn: string;
    updatedBy: string;
    markdown?: string;
}

function sha256Hex(text: string): string {
    return new GlideDigest().getSHA256Hex(text || '').toLowerCase();
}

function hasField(gr: GR, field: string): boolean {
    return !!gr.isValidField(field);
}

function dto(gr: GR, withMarkdown: boolean): DocDto {
    const trackSeed = hasField(gr, 'seed_hash');
    const seedHash = trackSeed ? str(gr, 'seed_hash') : '';
    const origin = hasField(gr, 'origin') ? str(gr, 'origin') || 'repo' : 'repo';
    const contentHash = str(gr, 'content_hash');
    const out: DocDto = {
        id: gr.getUniqueValue(),
        path: str(gr, 'path'),
        title: str(gr, 'title'),
        description: str(gr, 'description'),
        section: str(gr, 'section'),
        sectionSlug: str(gr, 'section_slug'),
        sectionOrder: int(gr, 'section_order', 100),
        order: int(gr, 'order', 100),
        tags: str(gr, 'tags'),
        icon: str(gr, 'icon'),
        sourcePath: str(gr, 'source_path'),
        active: bool(gr, 'active'),
        origin,
        contentHash,
        seedHash,
        // Legacy rows (no seed_hash yet, seeded from the repo) count as clean.
        studioEdited: trackSeed ? (origin === 'studio' ? true : !!seedHash && seedHash !== contentHash) : null,
        headings: parseJson<DocHeading[]>(str(gr, 'headings_json'), []),
        updatedOn: str(gr, 'sys_updated_on'),
        updatedBy: str(gr, 'sys_updated_by'),
    };
    if (withMarkdown) out.markdown = str(gr, 'markdown');
    return out;
}

/** The row's content inputs as stored (the fields the hash covers, before derivation). */
function inputsOf(gr: GR) {
    return {
        path: str(gr, 'path'),
        title: str(gr, 'title'),
        description: str(gr, 'description'),
        section: str(gr, 'section'),
        section_slug: str(gr, 'section_slug'),
        section_order: int(gr, 'section_order', 100),
        order: int(gr, 'order', 100),
        tags: str(gr, 'tags'),
        icon: str(gr, 'icon'),
        markdown: str(gr, 'markdown'),
        active: bool(gr, 'active'),
    };
}

/**
 * Write the derived row onto gr (not saved). Returns true when anything the hash covers changed.
 * Legacy rows get seed_hash = their current content_hash before the first Studio change, so the
 * seed can still tell the edit apart from a repo change.
 */
function applyRow(gr: GR, row: DocRow, isNew: boolean): boolean {
    const hash = docHash(row as any, sha256Hex);
    const before = str(gr, 'content_hash');
    if (!isNew && hash === before) return false;
    if (
        !isNew &&
        hasField(gr, 'seed_hash') &&
        !str(gr, 'seed_hash') &&
        (!hasField(gr, 'origin') || str(gr, 'origin') !== 'studio')
    ) {
        gr.setValue('seed_hash', before);
    }
    gr.setValue('path', row.path);
    gr.setValue('title', row.title);
    gr.setValue('description', row.description);
    gr.setValue('section', row.section);
    gr.setValue('section_slug', row.section_slug);
    gr.setValue('section_order', String(row.section_order));
    gr.setValue('order', String(row.order));
    gr.setValue('tags', row.tags);
    gr.setValue('icon', row.icon);
    gr.setValue('source_path', row.source_path);
    gr.setValue('markdown', row.markdown);
    gr.setValue('headings_json', JSON.stringify(row.headings_json));
    gr.setValue('search_text', row.search_text);
    gr.setValue('active', row.active ? 'true' : 'false');
    gr.setValue('content_hash', hash);
    return true;
}

function save(gr: GR, isNew: boolean): string {
    const id = isNew ? gr.insert() : gr.update();
    if (!id)
        throw rpError(
            500,
            'write_failed',
            'Could not save the doc page: ' + (gs.getErrorMessages() || 'unknown error')
        );
    return isNew ? String(id) : gr.getUniqueValue();
}

function cleanTags(v: unknown): string {
    const list = Array.isArray(v) ? v : String(v == null ? '' : v).split(',');
    return list
        .map((s) => String(s).trim())
        .filter(Boolean)
        .join(', ');
}

function text(v: unknown, max: number): string {
    return String(v == null ? '' : v)
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .substring(0, max);
}

function slugify(title: string): string {
    return String(title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
}

/* ---------------- Reads ---------------- */

/** Every doc row (inactive included), nav order, no markdown. */
export function listDocs(): DocDto[] {
    requireStudio('author');
    const out: DocDto[] = [];
    each(DOC, 'pathISNOTEMPTY', (gr) => out.push(dto(gr, false)), ['section_order', 'order', 'title']);
    return out;
}

export function getDoc(id: string): DocDto {
    requireStudio('author');
    const gr = getById(DOC, id);
    if (!gr) throw notFound('No doc page ' + id);
    return dto(gr, true);
}

/* ---------------- Ordering ---------------- */

interface SectionInfo {
    slug: string;
    title: string;
    order: number;
}

/** Active sections in order (first row's title wins). */
function sections(): SectionInfo[] {
    const out: SectionInfo[] = [];
    const seen: Record<string, boolean> = {};
    each(
        DOC,
        'active=true',
        (gr) => {
            const slug = str(gr, 'section_slug') || slugify(str(gr, 'section')) || 'docs';
            if (seen[slug]) return;
            seen[slug] = true;
            out.push({ slug, title: str(gr, 'section'), order: int(gr, 'section_order', 100) });
        },
        ['section_order', 'order']
    );
    return out;
}

/**
 * Renumber: sections (si + 1) * 100 in their current order, active pages of each section
 * (i + 1) * 100. Only rows whose numbers change are written (and rehashed).
 */
function renumber(): number {
    const list = sections();
    let written = 0;
    list.forEach((s, si) => {
        let pi = 0;
        each(
            DOC,
            'active=true^section_slug=' + s.slug,
            (gr) => {
                const inputs = inputsOf(gr);
                inputs.section_order = (si + 1) * 100;
                inputs.order = (pi + 1) * 100;
                pi++;
                if (applyRow(gr, buildDocRow(inputs), false)) {
                    save(gr, false);
                    written++;
                }
            },
            ['order', 'title']
        );
    });
    return written;
}

function sectionOrderOf(slug: string): number {
    const list = sections();
    for (const s of list) if (s.slug === slug) return s.order;
    return (list.length + 1) * 100;
}

function lastOrderIn(slug: string): number {
    let max = 0;
    each(DOC, 'active=true^section_slug=' + slug, (gr) => {
        max = Math.max(max, int(gr, 'order', 0));
    });
    return max;
}

/* ---------------- Writes ---------------- */

export interface CreateDocBody {
    path?: string;
    title?: string;
    description?: string;
    section?: string;
    sectionSlug?: string;
    tags?: string | string[];
    icon?: string;
    markdown?: string;
}

/** POST /docs: a new page at the end of its section (origin = studio). */
export function createDoc(body: CreateDocBody): DocDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const title = text(body.title, 200);
    if (!title) throw badRequest('A title is required');
    const section = text(body.section, 100) || 'Docs';
    const sectionSlug = String(body.sectionSlug || slugify(section));
    if (!SLUG_RE.test(sectionSlug)) throw badRequest('Section slug must be lower-case letters, digits and dashes');
    const path = String(body.path || sectionSlug + '/' + slugify(title))
        .replace(/^\/+|\/+$/g, '')
        .replace(/\.md$/, '');
    if (!PATH_RE.test(path))
        throw badRequest('Path must be lower-case segments of letters, digits, - and _ (e.g. concepts/my-page)');
    const existing = newGR(DOC);
    existing.addQuery('path', path);
    existing.setLimit(1);
    existing.query();
    if (existing.next()) {
        throw rpError(
            409,
            'doc_exists',
            bool(existing, 'active')
                ? 'A page with the path ' + path + ' already exists'
                : 'An inactive page has the path ' + path + ': reactivate it instead',
            { id: existing.getUniqueValue() }
        );
    }
    const gr = newGR(DOC);
    gr.initialize();
    const row = buildDocRow({
        path,
        title,
        description: text(body.description, 1000),
        section,
        section_slug: sectionSlug,
        section_order: sectionOrderOf(sectionSlug),
        order: lastOrderIn(sectionSlug) + 100,
        tags: cleanTags(body.tags),
        icon: text(body.icon, 80),
        markdown: typeof body.markdown === 'string' ? body.markdown : '# ' + title + '\n\n',
        active: true,
    });
    applyRow(gr, row, true);
    if (hasField(gr, 'origin')) gr.setValue('origin', 'studio');
    const id = save(gr, true);
    renumber();
    return getDoc(id);
}

export interface UpdateDocBody {
    baseHash?: string;
    path?: string;
    title?: string;
    description?: string;
    section?: string;
    sectionSlug?: string;
    tags?: string | string[];
    icon?: string;
    markdown?: string;
    active?: boolean;
}

/**
 * PATCH /docs/{id}: fields and/or markdown. baseHash (the content_hash the editor loaded) guards
 * against overwriting a newer version (a seed, another editor): 409 doc_conflict.
 * A section change moves the page to the end of the new section; active toggles (de)activate.
 */
export function updateDoc(id: string, body: UpdateDocBody): DocDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const gr = getById(DOC, id);
    if (!gr) throw notFound('No doc page ' + id);
    const current = str(gr, 'content_hash');
    if (body.baseHash && body.baseHash !== current) {
        throw rpError(
            409,
            'doc_conflict',
            'This page changed since you opened it (a seed or another editor saved it). Reload it, or save again to overwrite.',
            { contentHash: current, updatedOn: str(gr, 'sys_updated_on'), updatedBy: str(gr, 'sys_updated_by') }
        );
    }
    const inputs = inputsOf(gr);
    if (body.path !== undefined) {
        const path = String(body.path)
            .replace(/^\/+|\/+$/g, '')
            .replace(/\.md$/, '');
        if (path !== inputs.path) {
            if (hasField(gr, 'origin') && str(gr, 'origin') !== 'studio')
                throw badRequest(
                    'Only pages created in Studio (not yet in the repo) can change their path. Create a new page and deactivate this one instead.'
                );
            if (!PATH_RE.test(path)) throw badRequest('Path must be lower-case segments of letters, digits, - and _');
            const dupe = newGR(DOC);
            dupe.addQuery('path', path);
            dupe.addQuery('sys_id', '!=', id);
            dupe.setLimit(1);
            dupe.query();
            if (dupe.hasNext()) throw rpError(409, 'doc_exists', 'A page with the path ' + path + ' already exists');
            inputs.path = path;
        }
    }
    if (body.title !== undefined) {
        inputs.title = text(body.title, 200);
        if (!inputs.title) throw badRequest('A title is required');
    }
    if (body.description !== undefined) inputs.description = text(body.description, 1000);
    if (body.tags !== undefined) inputs.tags = cleanTags(body.tags);
    if (body.icon !== undefined) inputs.icon = text(body.icon, 80);
    if (typeof body.markdown === 'string') inputs.markdown = body.markdown.replace(/\r\n/g, '\n');
    let moved = false;
    if (body.section !== undefined || body.sectionSlug !== undefined) {
        const section = body.section !== undefined ? text(body.section, 100) : inputs.section;
        const slug = String(
            body.sectionSlug !== undefined ? body.sectionSlug : inputs.section_slug || slugify(section)
        );
        if (!SLUG_RE.test(slug)) throw badRequest('Section slug must be lower-case letters, digits and dashes');
        if (slug !== inputs.section_slug) {
            inputs.section_order = sectionOrderOf(slug);
            inputs.order = lastOrderIn(slug) + 100;
            moved = true;
        }
        inputs.section = section;
        inputs.section_slug = slug;
    }
    if (body.active !== undefined && !!body.active !== inputs.active) {
        inputs.active = !!body.active;
        if (inputs.active) inputs.order = lastOrderIn(inputs.section_slug) + 100;
        moved = true;
    }
    if (applyRow(gr, buildDocRow(inputs), false)) save(gr, false);
    if (moved) renumber();
    return getDoc(id);
}

export interface OrderBody {
    sections?: { slug?: string; title?: string; pages?: string[] }[];
}

/**
 * POST /docs/order: the desired order of (some or all) active sections and their pages. Listed
 * pages take the listed section (title and slug) and position; sections not listed keep their
 * relative order after the listed ones. Then everything is renumbered.
 */
export function orderDocs(body: OrderBody): DocDto[] {
    requireStudio('author');
    const list = isPlainObject(body) && Array.isArray(body.sections) ? body.sections : null;
    if (!list) throw badRequest('Expected { sections: [{ slug, title, pages: [id…] }] }');
    const listedSlugs: string[] = [];
    list.forEach((s) => {
        const slug = String((s && s.slug) || '');
        if (!SLUG_RE.test(slug)) throw badRequest('Bad section slug: ' + slug);
        listedSlugs.push(slug);
    });
    // Unlisted sections go after the listed ones, in their current order.
    const rest = sections().filter((s) => listedSlugs.indexOf(s.slug) < 0);
    list.forEach((s, si) => {
        const slug = String(s.slug);
        const title = text(s.title, 100) || slug;
        const pages = Array.isArray(s.pages) ? s.pages : [];
        pages.forEach((pageId, pi) => {
            const gr = getById(DOC, String(pageId));
            if (!gr) throw notFound('No doc page ' + pageId);
            const inputs = inputsOf(gr);
            inputs.section = title;
            inputs.section_slug = slug;
            inputs.section_order = (si + 1) * 100;
            inputs.order = (pi + 1) * 100;
            if (applyRow(gr, buildDocRow(inputs), false)) save(gr, false);
        });
        // Section renames reach the section's pages that weren't listed (inactive ones too).
        each(DOC, 'section_slug=' + slug, (gr) => {
            if (pages.indexOf(gr.getUniqueValue()) >= 0) return;
            const inputs = inputsOf(gr);
            inputs.section = title;
            inputs.section_order = (si + 1) * 100;
            if (applyRow(gr, buildDocRow(inputs), false)) save(gr, false);
        });
    });
    rest.forEach((s, i) => {
        each(DOC, 'section_slug=' + s.slug, (gr) => {
            const inputs = inputsOf(gr);
            inputs.section_order = (list.length + i + 1) * 100;
            if (applyRow(gr, buildDocRow(inputs), false)) save(gr, false);
        });
    });
    renumber();
    return listDocs();
}
