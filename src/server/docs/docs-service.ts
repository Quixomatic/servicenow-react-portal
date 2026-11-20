import { gs, GlideDigest } from '@servicenow/glide';
import { GR, newGR, getById, findOne, each, count, str, int, bool } from '../lib/gr.ts';
import { badRequest, notFound, rpError } from '../lib/errors.ts';
import { parseJson, isPlainObject } from '../lib/util.ts';
import { requireStudio } from '../security/access.ts';
import { buildDocRow, docHash, sectionHash } from './docs-text.ts';
import type { DocHeading, DocRow, DocRowInput } from './docs-text.ts';

/**
 * RPDocsService: Portal Studio's Docs activity.
 *   x_312987_portal_doc_collection  a docs collection (react-portal = the repo's docs/guide)
 *   x_312987_portal_doc_section     a sidebar section of a collection
 *   x_312987_portal_doc             a page, in a section (doc_section; collection is denormalized)
 *
 * Every page write recomputes the derived fields (source_path, headings_json, search_text,
 * content_hash) with src/server/docs/docs-text.ts, the same code the docs seed runs on the repo, so a
 * page saved here hashes exactly as the same content seeded from docs/guide.
 *
 * Section strings on pages (section, section_slug, section_order) are part of the page hash, so they
 * mean "the section as of the page's last content write". Every Studio write of a page refreshes
 * them from its section record. A section rename / reorder writes the section row only, plus the
 * section's pages that are already edited in Studio (so their pending edit still hashes like the repo
 * after `npm run docs:pull`). Clean pages are re-synced by the next seed after the pull.
 *
 * Ordering is normalised: active sections get order (i + 1) * 100, active pages of a section
 * (i + 1) * 100, the numbers the seed derives from _nav.json positions. Only rows whose numbers
 * change are written.
 *
 * Source of truth (.plans/docs-editor.md): origin (repo | studio) and seed_hash on pages and sections.
 * "Edited in Studio" = origin studio, or content_hash ≠ seed_hash. No deletes: rows are deactivated.
 */

const DOC = 'x_312987_portal_doc';
const SEC = 'x_312987_portal_doc_section';
const COL = 'x_312987_portal_doc_collection';
const PORTAL = 'x_312987_portal_portal';
export const DEFAULT_COLLECTION = 'react-portal';
const PATH_RE = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export interface DocDto {
    id: string;
    path: string;
    collection: string;
    sectionId: string;
    title: string;
    description: string;
    /** The section record's title, slug and order (not the page's legacy strings). */
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
    /** content_hash differs from what the seed last wrote (or created in Studio). */
    studioEdited: boolean;
    headings: DocHeading[];
    updatedOn: string;
    updatedBy: string;
    markdown?: string;
}

export interface SectionDto {
    id: string;
    collection: string;
    slug: string;
    title: string;
    order: number;
    icon: string;
    active: boolean;
    origin: string;
    contentHash: string;
    seedHash: string;
    studioEdited: boolean;
}

export interface CollectionDto {
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    active: boolean;
    pageCount: number;
    sectionCount: number;
    /** Portals whose settings.docsCollections list it (slugs; the first entry = their default). */
    portals: { slug: string; name: string; isDefault: boolean }[];
}

function sha256Hex(text: string): string {
    return new GlideDigest().getSHA256Hex(text || '').toLowerCase();
}

function editedRow(gr: GR): boolean {
    if (str(gr, 'origin') === 'studio') return true;
    const seed = str(gr, 'seed_hash');
    // Legacy rows (no seed_hash yet, seeded from the repo) count as clean.
    return !!seed && seed !== str(gr, 'content_hash');
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

function cleanTags(v: unknown): string {
    const list = Array.isArray(v) ? v : String(v == null ? '' : v).split(',');
    return list
        .map((s) => String(s).trim())
        .filter(Boolean)
        .join(', ');
}

function save(gr: GR, isNew: boolean, what: string): string {
    const id = isNew ? gr.insert() : gr.update();
    if (!id)
        throw rpError(
            500,
            'write_failed',
            'Could not save the ' + what + ': ' + (gs.getErrorMessages() || 'unknown error')
        );
    return isNew ? String(id) : gr.getUniqueValue();
}

/* ---------------- Collections ---------------- */

/** A collection by key or sys_id ('' = react-portal). */
function collectionGR(ref: unknown): GR {
    const r = String(ref || DEFAULT_COLLECTION);
    const gr = /^[0-9a-f]{32}$/.test(r) ? getById(COL, r) : findOne(COL, 'key=' + r);
    if (!gr) throw notFound('No doc collection ' + r);
    return gr;
}

/**
 * The encoded query for a collection's pages. Rows written before doc collections (no collection
 * yet, until the docs seed migrates them) count as react-portal.
 */
function inCollection(col: GR): string {
    const q = 'collection=' + col.getUniqueValue();
    return str(col, 'key') === DEFAULT_COLLECTION ? q + '^ORcollectionISEMPTY' : q;
}

/** The page's collection sys_id (empty = react-portal's). */
function collectionOf(gr: GR): string {
    const id = str(gr, 'collection');
    if (id) return id;
    const def = findOne(COL, 'key=' + DEFAULT_COLLECTION);
    return def ? def.getUniqueValue() : '';
}

/** A collection's key by sys_id ('' = react-portal, for rows from before doc collections). */
function keyOf(collectionId: string): string {
    if (!collectionId) return DEFAULT_COLLECTION;
    const c = getById(COL, collectionId);
    return c ? str(c, 'key') : '';
}

function portalsUsing(): Record<string, { slug: string; name: string; isDefault: boolean }[]> {
    const out: Record<string, { slug: string; name: string; isDefault: boolean }[]> = {};
    each(PORTAL, 'active=true', (p) => {
        const settings = parseJson<any>(str(p, 'settings_json'), {});
        const keys = settings && Array.isArray(settings.docsCollections) ? settings.docsCollections : [];
        keys.forEach((k: unknown, i: number) => {
            const key = String(k || '');
            if (!key) return;
            (out[key] = out[key] || []).push({ slug: str(p, 'slug'), name: str(p, 'name'), isDefault: i === 0 });
        });
    });
    return out;
}

function collectionDto(gr: GR, usedBy?: Record<string, { slug: string; name: string; isDefault: boolean }[]>) {
    const id = gr.getUniqueValue();
    const key = str(gr, 'key');
    const out: CollectionDto = {
        id,
        key,
        title: str(gr, 'title'),
        description: str(gr, 'description'),
        icon: str(gr, 'icon'),
        active: bool(gr, 'active'),
        pageCount: count(DOC, 'active=true^' + inCollection(gr)),
        sectionCount: count(SEC, 'collection=' + id + '^active=true'),
        portals: (usedBy || portalsUsing())[key] || [],
    };
    return out;
}

/** GET /doc-collections: every collection (inactive included) with counts and the portals using it. */
export function listCollections(): CollectionDto[] {
    requireStudio('author');
    const usedBy = portalsUsing();
    const out: CollectionDto[] = [];
    each(COL, '', (gr) => out.push(collectionDto(gr, usedBy)), ['title']);
    return out;
}

export interface CollectionBody {
    key?: string;
    title?: string;
    description?: string;
    icon?: string;
    active?: boolean;
}

/** POST /doc-collections { key, title, description?, icon? }: an empty collection. */
export function createCollection(body: CollectionBody): CollectionDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const title = text(body.title, 120);
    if (!title) throw badRequest('A title is required');
    const key = String(body.key || slugify(title));
    if (!SLUG_RE.test(key)) throw badRequest('Key must be lower-case letters, digits and dashes (e.g. my-guide)');
    if (findOne(COL, 'key=' + key))
        throw rpError(409, 'collection_exists', 'A collection with the key ' + key + ' exists');
    const gr = newGR(COL);
    gr.initialize();
    gr.setValue('key', key);
    gr.setValue('title', title);
    gr.setValue('description', text(body.description, 500));
    gr.setValue('icon', text(body.icon, 80));
    gr.setValue('active', 'true');
    const id = save(gr, true, 'doc collection');
    return collectionDto(getById(COL, id));
}

/** PATCH /doc-collections/{id} { title?, description?, icon?, active? } (the key is fixed). */
export function updateCollection(id: string, body: CollectionBody): CollectionDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const gr = getById(COL, id);
    if (!gr) throw notFound('No doc collection ' + id);
    if (body.title !== undefined) {
        const title = text(body.title, 120);
        if (!title) throw badRequest('A title is required');
        gr.setValue('title', title);
    }
    if (body.description !== undefined) gr.setValue('description', text(body.description, 500));
    if (body.icon !== undefined) gr.setValue('icon', text(body.icon, 80));
    if (body.active !== undefined) gr.setValue('active', body.active ? 'true' : 'false');
    save(gr, false, 'doc collection');
    return collectionDto(getById(COL, id));
}

/* ---------------- Sections ---------------- */

function sectionDto(gr: GR, collectionKey?: string): SectionDto {
    return {
        id: gr.getUniqueValue(),
        collection: collectionKey !== undefined ? collectionKey : keyOf(str(gr, 'collection')),
        slug: str(gr, 'slug'),
        title: str(gr, 'title'),
        order: int(gr, 'order', 100),
        icon: str(gr, 'icon'),
        active: bool(gr, 'active'),
        origin: str(gr, 'origin') || 'repo',
        contentHash: str(gr, 'content_hash'),
        seedHash: str(gr, 'seed_hash'),
        studioEdited: editedRow(gr),
    };
}

/** GET /doc-sections?collection=key: every section of the collection (inactive included), in order. */
export function listSections(collection: string): SectionDto[] {
    requireStudio('author');
    const col = collectionGR(collection);
    const key = str(col, 'key');
    const out: SectionDto[] = [];
    each(SEC, 'collection=' + col.getUniqueValue(), (gr) => out.push(sectionDto(gr, key)), ['order', 'title']);
    return out;
}

/**
 * Write a section's fields (not saved) and its hash. Returns true when anything the hash covers
 * changed. A legacy row (no seed_hash, not created in Studio) is stamped before its first change.
 */
function applySection(gr: GR, fields: { slug: string; title: string; order: number; icon: string; active: boolean }) {
    const hash = sectionHash(fields, sha256Hex);
    const before = str(gr, 'content_hash');
    if (gr.isNewRecord()) {
        gr.setValue('slug', fields.slug);
    } else {
        if (hash === before) return false;
        if (!str(gr, 'seed_hash') && str(gr, 'origin') !== 'studio' && before) gr.setValue('seed_hash', before);
    }
    gr.setValue('title', fields.title);
    gr.setValue('order', String(fields.order));
    gr.setValue('icon', fields.icon);
    gr.setValue('active', fields.active ? 'true' : 'false');
    gr.setValue('content_hash', hash);
    return true;
}

function sectionFields(gr: GR) {
    return {
        slug: str(gr, 'slug'),
        title: str(gr, 'title'),
        order: int(gr, 'order', 100),
        icon: str(gr, 'icon'),
        active: bool(gr, 'active'),
    };
}

/** Save a section change, then refresh the section's pages that are already edited in Studio. */
function saveSection(gr: GR): void {
    save(gr, false, 'doc section');
    const sec = getById(SEC, gr.getUniqueValue());
    each(DOC, 'doc_section=' + gr.getUniqueValue(), (page) => {
        if (!editedRow(page)) return;
        if (applyRow(page, buildDocRow(withSection(inputsOf(page), sec)), false)) save(page, false, 'doc page');
    });
}

export interface SectionBody {
    collection?: string;
    title?: string;
    slug?: string;
    icon?: string;
    active?: boolean;
}

/** POST /doc-sections { collection, title, slug?, icon? }: a new section at the end (origin studio). */
export function createSection(body: SectionBody): SectionDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const col = collectionGR(body.collection);
    const title = text(body.title, 100);
    if (!title) throw badRequest('A title is required');
    const slug = String(body.slug || slugify(title));
    if (!SLUG_RE.test(slug)) throw badRequest('Section slug must be lower-case letters, digits and dashes');
    const colId = col.getUniqueValue();
    const existing = findOne(SEC, 'collection=' + colId + '^slug=' + slug);
    if (existing)
        throw rpError(
            409,
            'section_exists',
            bool(existing, 'active')
                ? 'A section with the slug ' + slug + ' exists'
                : 'An inactive section has the slug ' + slug + ': reactivate it instead',
            { id: existing.getUniqueValue() }
        );
    let last = 0;
    each(SEC, 'collection=' + colId + '^active=true', (s) => {
        last = Math.max(last, int(s, 'order', 0));
    });
    const gr = newGR(SEC);
    gr.initialize();
    gr.setValue('collection', colId);
    gr.setValue('origin', 'studio');
    applySection(gr, { slug, title, order: last + 100, icon: text(body.icon, 80), active: true });
    const id = save(gr, true, 'doc section');
    renumberSections(colId);
    return sectionDto(getById(SEC, id));
}

/** PATCH /doc-sections/{id} { title?, icon?, active? }: edits this row (+ its pages edited in Studio). */
export function updateSection(id: string, body: SectionBody): SectionDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const gr = getById(SEC, id);
    if (!gr) throw notFound('No doc section ' + id);
    const f = sectionFields(gr);
    if (body.title !== undefined) {
        f.title = text(body.title, 100);
        if (!f.title) throw badRequest('A title is required');
    }
    if (body.icon !== undefined) f.icon = text(body.icon, 80);
    let reorder = false;
    if (body.active !== undefined && !!body.active !== f.active) {
        f.active = !!body.active;
        if (f.active) {
            let last = 0;
            each(SEC, 'collection=' + str(gr, 'collection') + '^active=true', (s) => {
                last = Math.max(last, int(s, 'order', 0));
            });
            f.order = last + 100;
        }
        reorder = true;
    }
    if (applySection(gr, f)) saveSection(gr);
    if (reorder) renumberSections(str(gr, 'collection'));
    return sectionDto(getById(SEC, id));
}

/** Active sections of a collection get order (i + 1) * 100; changed rows are written. */
function renumberSections(collectionId: string): void {
    let i = 0;
    each(
        SEC,
        'collection=' + collectionId + '^active=true',
        (gr) => {
            const f = sectionFields(gr);
            f.order = (i + 1) * 100;
            i++;
            if (applySection(gr, f)) saveSection(gr);
        },
        ['order', 'title']
    );
}

/* ---------------- Pages ---------------- */

function dto(gr: GR, withMarkdown: boolean, sec?: GR | null, collectionKey?: string): DocDto {
    const s = sec !== undefined ? sec : getById(SEC, str(gr, 'doc_section'));
    const out: DocDto = {
        id: gr.getUniqueValue(),
        path: str(gr, 'path'),
        collection: collectionKey !== undefined ? collectionKey : keyOf(str(gr, 'collection')),
        sectionId: s ? s.getUniqueValue() : '',
        title: str(gr, 'title'),
        description: str(gr, 'description'),
        section: s ? str(s, 'title') : str(gr, 'section'),
        sectionSlug: s ? str(s, 'slug') : str(gr, 'section_slug'),
        sectionOrder: s ? int(s, 'order', 100) : int(gr, 'section_order', 100),
        order: int(gr, 'order', 100),
        tags: str(gr, 'tags'),
        icon: str(gr, 'icon'),
        sourcePath: str(gr, 'source_path'),
        active: bool(gr, 'active'),
        origin: str(gr, 'origin') || 'repo',
        contentHash: str(gr, 'content_hash'),
        seedHash: str(gr, 'seed_hash'),
        studioEdited: editedRow(gr),
        headings: parseJson<DocHeading[]>(str(gr, 'headings_json'), []),
        updatedOn: str(gr, 'sys_updated_on'),
        updatedBy: str(gr, 'sys_updated_by'),
    };
    if (withMarkdown) out.markdown = str(gr, 'markdown');
    return out;
}

/** The row's content inputs as stored (the fields the hash covers, before derivation). */
function inputsOf(gr: GR): DocRowInput {
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

/** The page's section strings refreshed from its section record (what the repo derives from _nav.json). */
function withSection(inputs: DocRowInput, sec: GR | null): DocRowInput {
    if (!sec) return inputs;
    inputs.section = str(sec, 'title');
    inputs.section_slug = str(sec, 'slug');
    inputs.section_order = int(sec, 'order', 100);
    return inputs;
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
    if (!isNew && !str(gr, 'seed_hash') && str(gr, 'origin') !== 'studio') gr.setValue('seed_hash', before);
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

/** Active pages of a section get order (i + 1) * 100; only rows whose number changes are written. */
function renumberPages(sectionId: string): void {
    const sec = getById(SEC, sectionId);
    if (!sec) return;
    let i = 0;
    each(
        DOC,
        'doc_section=' + sectionId + '^active=true',
        (gr) => {
            const order = (i + 1) * 100;
            i++;
            if (int(gr, 'order', 100) === order) return;
            const inputs = withSection(inputsOf(gr), sec);
            inputs.order = order;
            if (applyRow(gr, buildDocRow(inputs), false)) save(gr, false, 'doc page');
        },
        ['order', 'title']
    );
}

function lastOrderIn(sectionId: string): number {
    let max = 0;
    each(DOC, 'doc_section=' + sectionId + '^active=true', (gr) => {
        max = Math.max(max, int(gr, 'order', 0));
    });
    return max;
}

/** GET /docs?collection=key: every page of the collection (inactive included), nav order, no markdown. */
export function listDocs(collection?: string): DocDto[] {
    requireStudio('author');
    const col = collectionGR(collection);
    const sections: Record<string, GR> = {};
    each(SEC, 'collection=' + col.getUniqueValue(), (s) => {
        const copy = getById(SEC, s.getUniqueValue());
        if (copy) sections[s.getUniqueValue()] = copy;
    });
    const out: DocDto[] = [];
    each(
        DOC,
        'pathISNOTEMPTY^' + inCollection(col),
        (gr) => out.push(dto(gr, false, sections[str(gr, 'doc_section')] || null, str(col, 'key'))),
        ['order', 'title']
    );
    out.sort((a, b) => a.sectionOrder - b.sectionOrder || a.order - b.order || a.title.localeCompare(b.title));
    return out;
}

export function getDoc(id: string): DocDto {
    requireStudio('author');
    const gr = getById(DOC, id);
    if (!gr) throw notFound('No doc page ' + id);
    return dto(gr, true);
}

function pathTaken(col: GR, path: string, exceptId?: string): GR | null {
    return findOne(DOC, 'path=' + path + (exceptId ? '^sys_id!=' + exceptId : '') + '^' + inCollection(col));
}

function sectionIn(collectionId: string, sectionId: string): GR {
    const sec = getById(SEC, sectionId);
    if (!sec || str(sec, 'collection') !== collectionId)
        throw badRequest('No section ' + sectionId + ' in this collection');
    return sec;
}

export interface CreateDocBody {
    collection?: string;
    /** The section's sys_id. */
    section?: string;
    path?: string;
    title?: string;
    description?: string;
    tags?: string | string[];
    icon?: string;
    markdown?: string;
}

/** POST /docs: a new page at the end of its section (origin = studio). */
export function createDoc(body: CreateDocBody): DocDto {
    requireStudio('author');
    if (!isPlainObject(body)) throw badRequest('Expected a JSON object');
    const col = collectionGR(body.collection);
    const colId = col.getUniqueValue();
    const title = text(body.title, 200);
    if (!title) throw badRequest('A title is required');
    if (!body.section) throw badRequest('A section is required');
    const sec = sectionIn(colId, String(body.section));
    const path = String(body.path || str(sec, 'slug') + '/' + slugify(title))
        .replace(/^\/+|\/+$/g, '')
        .replace(/\.md$/, '');
    if (!PATH_RE.test(path))
        throw badRequest('Path must be lower-case segments of letters, digits, - and _ (e.g. concepts/my-page)');
    const existing = pathTaken(col, path);
    if (existing) {
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
    const row = buildDocRow(
        withSection(
            {
                path,
                title,
                description: text(body.description, 1000),
                section: '',
                section_slug: '',
                section_order: 100,
                order: lastOrderIn(sec.getUniqueValue()) + 100,
                tags: cleanTags(body.tags),
                icon: text(body.icon, 80) || str(sec, 'icon'),
                markdown: typeof body.markdown === 'string' ? body.markdown : '# ' + title + '\n\n',
                active: true,
            },
            sec
        )
    );
    applyRow(gr, row, true);
    gr.setValue('doc_section', sec.getUniqueValue());
    gr.setValue('collection', colId);
    gr.setValue('origin', 'studio');
    const id = save(gr, true, 'doc page');
    renumberPages(sec.getUniqueValue());
    return getDoc(id);
}

export interface UpdateDocBody {
    baseHash?: string;
    path?: string;
    title?: string;
    description?: string;
    /** Move to this section (sys_id, same collection): the end of it. */
    section?: string;
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
    const colId = collectionOf(gr);
    const colGR = getById(COL, colId);
    if (!colGR) throw notFound('The page has no collection');
    const fromSection = str(gr, 'doc_section');
    let sec = getById(SEC, fromSection);
    const inputs = inputsOf(gr);
    if (body.path !== undefined) {
        const path = String(body.path)
            .replace(/^\/+|\/+$/g, '')
            .replace(/\.md$/, '');
        if (path !== inputs.path) {
            if (str(gr, 'origin') !== 'studio')
                throw badRequest(
                    'Only pages created in Studio (not yet in the repo) can change their path. Create a new page and deactivate this one instead.'
                );
            if (!PATH_RE.test(path)) throw badRequest('Path must be lower-case segments of letters, digits, - and _');
            if (pathTaken(colGR, path, id))
                throw rpError(409, 'doc_exists', 'A page with the path ' + path + ' already exists');
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
    if (body.section !== undefined && String(body.section) !== fromSection) {
        sec = sectionIn(colId, String(body.section));
        inputs.order = lastOrderIn(sec.getUniqueValue()) + 100;
        gr.setValue('doc_section', sec.getUniqueValue());
        moved = true;
    }
    if (body.active !== undefined && !!body.active !== inputs.active) {
        inputs.active = !!body.active;
        if (inputs.active && sec) inputs.order = lastOrderIn(sec.getUniqueValue()) + 100;
        moved = true;
    }
    const changedRow = applyRow(gr, buildDocRow(withSection(inputs, sec)), false);
    if (changedRow || moved) save(gr, false, 'doc page');
    if (moved) {
        if (fromSection) renumberPages(fromSection);
        if (sec && sec.getUniqueValue() !== fromSection) renumberPages(sec.getUniqueValue());
    }
    return getDoc(id);
}

export interface OrderBody {
    collection?: string;
    sections?: { id?: string; pages?: string[] }[];
}

/**
 * POST /docs/order { collection, sections: [{ id, pages: [id…] }] }: the desired order of (some or
 * all) active sections and their pages. Listed sections take their listed position (unlisted ones
 * follow in their current order); listed pages take the listed section and position. Section rows
 * and page rows are written only when their numbers change.
 */
export function orderDocs(body: OrderBody): DocDto[] {
    requireStudio('author');
    const list = isPlainObject(body) && Array.isArray(body.sections) ? body.sections : null;
    if (!list) throw badRequest('Expected { collection, sections: [{ id, pages: [id…] }] }');
    const col = collectionGR(body.collection);
    const colId = col.getUniqueValue();
    const listed: GR[] = list.map((s) => sectionIn(colId, String((s && s.id) || '')));
    const listedIds = listed.map((s) => s.getUniqueValue());
    const rest: GR[] = [];
    each(
        SEC,
        'collection=' + colId + '^active=true',
        (s) => {
            if (listedIds.indexOf(s.getUniqueValue()) < 0) rest.push(getById(SEC, s.getUniqueValue()));
        },
        ['order', 'title']
    );
    // 1. Section order.
    listed.concat(rest).forEach((s, si) => {
        const f = sectionFields(s);
        if (!f.active) return;
        f.order = (si + 1) * 100;
        if (applySection(s, f)) saveSection(s);
    });
    // 2. Pages: listed position and section (strings refreshed from the section record).
    const touched: Record<string, boolean> = {};
    list.forEach((s, si) => {
        const sec = getById(SEC, listedIds[si]);
        const pages = Array.isArray(s.pages) ? s.pages : [];
        pages.forEach((pageId, pi) => {
            const gr = getById(DOC, String(pageId));
            if (!gr || collectionOf(gr) !== colId) throw notFound('No doc page ' + pageId + ' in this collection');
            const from = str(gr, 'doc_section');
            const order = (pi + 1) * 100;
            if (from === listedIds[si] && int(gr, 'order', 100) === order) return;
            touched[from] = true;
            const inputs = withSection(inputsOf(gr), sec);
            inputs.order = order;
            gr.setValue('doc_section', listedIds[si]);
            applyRow(gr, buildDocRow(inputs), false);
            save(gr, false, 'doc page');
        });
        touched[listedIds[si]] = true;
    });
    Object.keys(touched).forEach((sid) => sid && renumberPages(sid));
    return listDocs(str(col, 'key'));
}
