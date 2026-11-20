// Docs activity store: one docs collection at a time (x_312987_portal_doc_collection), its sections
// (x_312987_portal_doc_section: real rows, so a rename or reorder edits the section, not every page)
// and its pages (x_312987_portal_doc). Lives outside React so deep links can open a page before the
// activity mounts (docs/location.js). One open page at a time, with a draft (frontmatter fields +
// markdown) compared against the saved row for the dirty marker.
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { docsApi } from './docs-api';

export const DRAFT_FIELDS = ['title', 'description', 'tags', 'icon', 'markdown'];

// The editor mode the user last chose (our own namespace; never a platform preference). Visual
// when nothing is stored: a first-time user or a fresh state opens in the visual editor.
const MODE_KEY = 'x_312987_portal.docs.mode';
// The collection last opened (same namespace).
const COLLECTION_KEY = 'x_312987_portal.docs.collection';
export const DEFAULT_COLLECTION = 'react-portal';

function storedCollection() {
    try {
        return window.localStorage.getItem(COLLECTION_KEY) || DEFAULT_COLLECTION;
    } catch (e) {
        return DEFAULT_COLLECTION;
    }
}

function rememberCollection(key) {
    try {
        window.localStorage.setItem(COLLECTION_KEY, key || DEFAULT_COLLECTION);
    } catch (e) {
        /* storage unavailable */
    }
}

function storedMode() {
    try {
        return window.localStorage.getItem(MODE_KEY) === 'markdown' ? 'markdown' : 'visual';
    } catch (e) {
        return 'visual';
    }
}

/** Remember the editor mode for next time. */
export function rememberMode(mode) {
    try {
        window.localStorage.setItem(MODE_KEY, mode === 'markdown' ? 'markdown' : 'visual');
    } catch (e) {
        /* storage unavailable */
    }
}

function draftOf(doc) {
    return {
        title: doc.title || '',
        description: doc.description || '',
        tags: doc.tags || '',
        icon: doc.icon || '',
        markdown: doc.markdown || '',
    };
}

function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Sections of the collection in nav order, from the section rows: [{ id, slug, title, order, icon,
 * active, studioEdited, origin, pages, activeCount }] (inactive pages kept, flagged). Pages without a
 * section row (pre-migration) are grouped by their legacy section slug.
 */
export function groupSections(list, sectionRows) {
    const out = [];
    const by = {};
    (sectionRows || []).forEach((r) => {
        by[r.id] = { ...r, pages: [], activeCount: 0 };
        out.push(by[r.id]);
    });
    (list || []).forEach((d) => {
        let key = d.sectionId;
        if (!key || !by[key]) {
            key = 'slug:' + (d.sectionSlug || slugify(d.section) || 'docs');
            if (!by[key]) {
                by[key] = {
                    id: '',
                    slug: key.slice(5),
                    title: d.section || key.slice(5),
                    order: d.sectionOrder,
                    active: true,
                    pages: [],
                    activeCount: 0,
                };
                out.push(by[key]);
            }
        }
        if (d.active) by[key].activeCount++;
        by[key].pages.push(d);
    });
    out.sort((a, b) => (a.active ? 0 : 1) - (b.active ? 0 : 1) || a.order - b.order);
    out.forEach((s) =>
        s.pages.sort(
            (a, b) => (a.active ? 0 : 1) - (b.active ? 0 : 1) || a.order - b.order || a.title.localeCompare(b.title)
        )
    );
    return out;
}

export function createDocsStore({ navigate, log } = {}) {
    let state = {
        collections: null,
        collectionsError: null,
        collection: storedCollection(),
        sections: null,
        list: null,
        listError: null,
        currentId: null,
        current: null,
        draft: null,
        loadingDoc: false,
        docError: null,
        saving: false,
        mode: storedMode(),
        anchor: null,
        filter: '',
        pendingPath: null,
        // Bumped whenever the draft is (re)loaded from the server or reverted: editors remount on it, and a
        // visual-editor flush made for an older load is ignored (it belongs to another page / version).
        loadSeq: 0,
    };
    const listeners = new Set();
    const emit = () => listeners.forEach((l) => l());
    const set = (partial) => {
        state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
        emit();
    };
    const say = (level, text) => log && log(level, text);

    const store = {
        get: () => state,
        set,
        subscribe(l) {
            listeners.add(l);
            return () => listeners.delete(l);
        },

        isDirty() {
            const s = state;
            if (!s.current || !s.draft) return false;
            const saved = draftOf(s.current);
            return DRAFT_FIELDS.some((k) => s.draft[k] !== saved[k]);
        },

        byPath(path) {
            return (state.list || []).find((d) => d.path === path) || null;
        },

        async loadCollections() {
            try {
                const rows = await docsApi.collections();
                set({ collections: Array.isArray(rows) ? rows : [], collectionsError: null });
                if (!state.collections.some((c) => c.key === state.collection) && state.collections.length) {
                    const def = state.collections.find((c) => c.key === DEFAULT_COLLECTION) || state.collections[0];
                    set({ collection: def.key, list: null, sections: null });
                }
                return state.collections;
            } catch (error) {
                set({ collectionsError: error, collections: [] });
                return null;
            }
        },

        collectionRow(key) {
            return (state.collections || []).find((c) => c.key === (key || state.collection)) || null;
        },

        /** Switch collection (the caller checks unsaved changes first). Closes the open page. */
        async setCollection(key) {
            const next = key || DEFAULT_COLLECTION;
            if (next === state.collection && state.list) return state.list;
            rememberCollection(next);
            set({
                collection: next,
                list: null,
                sections: null,
                listError: null,
                currentId: null,
                current: null,
                draft: null,
                anchor: null,
            });
            return store.loadList();
        },

        async loadList() {
            const key = state.collection;
            try {
                const [list, sections] = await Promise.all([docsApi.list(key), docsApi.sections(key)]);
                if (state.collection !== key) return null;
                set({
                    list: Array.isArray(list) ? list : [],
                    sections: Array.isArray(sections) ? sections : [],
                    listError: null,
                });
                return state.list;
            } catch (error) {
                if (state.collection === key) set({ listError: error });
                return null;
            }
        },

        async createCollection(body) {
            try {
                const row = await docsApi.createCollection(body);
                await store.loadCollections();
                await store.setCollection(row.key);
                toast.success(`Created collection ${row.title}`);
                return row;
            } catch (error) {
                toast.error(error.message);
                return null;
            }
        },

        async updateCollection(id, body, label) {
            try {
                const row = await docsApi.updateCollection(id, body);
                await store.loadCollections();
                if (label) toast.success(label);
                return row;
            } catch (error) {
                toast.error(error.message);
                return null;
            }
        },

        /** Replace one row of the list with a fresh DTO (markdown stripped). */
        mergeRow(dto) {
            if (!dto) return;
            const row = { ...dto };
            delete row.markdown;
            set((s) => {
                const list = (s.list || []).slice();
                const i = list.findIndex((d) => d.id === row.id);
                if (i >= 0) list[i] = row;
                else list.push(row);
                return { list };
            });
        },

        /** Open a page by sys_id (opts.anchor scrolls the preview / editor there). */
        async open(id, opts = {}) {
            if (!id) {
                set({ currentId: null, current: null, draft: null, anchor: null });
                return null;
            }
            set({ currentId: id, loadingDoc: true, docError: null, anchor: opts.anchor || null });
            try {
                const doc = await docsApi.get(id);
                if (state.currentId !== id) return null;
                set((st) => ({ current: doc, draft: draftOf(doc), loadingDoc: false, loadSeq: st.loadSeq + 1 }));
                if (opts.navigate !== false && navigate) navigate('', { recordId: id });
                return doc;
            } catch (error) {
                if (state.currentId === id) set({ loadingDoc: false, docError: error, current: null, draft: null });
                return null;
            }
        },

        async openPath(path, opts = {}) {
            if (!state.list) await store.loadList();
            const row = store.byPath(path);
            if (!row) return null;
            return store.open(row.id, opts);
        },

        setDraft(partial) {
            if (!state.draft) return;
            set((s) => ({ draft: { ...s.draft, ...partial } }));
        },

        revert() {
            if (state.current) set((st) => ({ draft: draftOf(st.current), loadSeq: st.loadSeq + 1 }));
        },

        /**
         * Save the draft. A 409 doc_conflict (the row changed since it was opened) asks the caller:
         * force = true saves over it.
         */
        async save({ force = false } = {}) {
            const s = state;
            if (!s.current || !s.draft || s.saving) return null;
            if (!store.isDirty()) return s.current;
            const body = { ...s.draft, collection: s.collection };
            if (!force) body.baseHash = s.current.contentHash;
            set({ saving: true });
            try {
                const doc = await docsApi.update(s.current.id, body);
                // Keep edits typed while the save was in flight.
                const typed = state.draft;
                set({ current: doc, saving: false, draft: { ...draftOf(doc), ...diffFrom(body, typed) } });
                store.mergeRow(doc);
                say('info', `Docs: saved ${doc.path} (hash ${doc.contentHash.slice(0, 8)})`);
                toast.success(`Saved ${doc.title}`);
                return doc;
            } catch (error) {
                set({ saving: false });
                if (error && error.code === 'doc_conflict') {
                    error.conflict = true;
                    throw error;
                }
                toast.error(`Save failed: ${error.message}`);
                say('error', `Docs: save failed: ${error.message}`);
                throw error;
            }
        },

        /** Field changes that save immediately (section move, (de)activate): fields + current draft untouched. */
        async patch(id, fields, label) {
            try {
                const doc = await docsApi.update(id, { ...fields, collection: state.collection });
                await store.loadList();
                if (state.current && state.current.id === id) {
                    const keep = state.draft;
                    const saved = draftOf(state.current);
                    set({ current: { ...doc, markdown: state.current.markdown } });
                    // Only fields the patch touched are refreshed in the draft.
                    const next = { ...keep };
                    DRAFT_FIELDS.forEach((k) => {
                        if (fields[k] !== undefined || keep[k] === saved[k])
                            next[k] = k === 'markdown' ? keep.markdown : draftOf(doc)[k];
                    });
                    set({ draft: next });
                }
                if (label) toast.success(label);
                return doc;
            } catch (error) {
                toast.error(error.message);
                return null;
            }
        },

        async create(body) {
            try {
                const doc = await docsApi.create({ ...body, collection: state.collection });
                await store.loadList();
                await store.open(doc.id);
                toast.success(`Created ${doc.path}`);
                return doc;
            } catch (error) {
                toast.error(error.message);
                return null;
            }
        },

        /** POST /docs/order with the given sections ([{ id, pages: [id] }]). */
        async order(sections, label) {
            try {
                const list = await docsApi.order({
                    collection: state.collection,
                    sections: sections.map((s) => ({ id: s.id, pages: s.pages })),
                });
                set({ list: Array.isArray(list) ? list : state.list });
                const rows = await docsApi.sections(state.collection).catch(() => null);
                if (Array.isArray(rows)) set({ sections: rows });
                if (state.current) {
                    const row = (state.list || []).find((d) => d.id === state.current.id);
                    if (row) set({ current: { ...state.current, ...row, markdown: state.current.markdown } });
                }
                if (label) toast.success(label);
                return true;
            } catch (error) {
                toast.error(error.message);
                return false;
            }
        },

        /** Active sections (with a row) as the order endpoint wants them. */
        activeSections() {
            return groupSections(state.list, state.sections)
                .filter((s) => s.id && s.active)
                .map((s) => ({
                    id: s.id,
                    slug: s.slug,
                    title: s.title,
                    pages: s.pages.filter((p) => p.active).map((p) => p.id),
                }));
        },

        sectionRow(id) {
            return (state.sections || []).find((s) => s.id === id) || null;
        },

        /** A new (empty) section at the end of the collection. */
        async createSection(body, label) {
            try {
                const row = await docsApi.createSection({ ...body, collection: state.collection });
                const rows = await docsApi.sections(state.collection);
                set({ sections: Array.isArray(rows) ? rows : state.sections });
                if (label !== false) toast.success(label || `Created section ${row.title}`);
                return row;
            } catch (error) {
                toast.error(error.message);
                return null;
            }
        },

        /** One section row: { title?, icon?, active? }. Its pages already edited in Studio follow. */
        async updateSection(id, body, label) {
            try {
                await docsApi.updateSection(id, body);
                await store.loadList();
                if (state.current) {
                    const row = (state.list || []).find((d) => d.id === state.current.id);
                    if (row) set({ current: { ...state.current, ...row, markdown: state.current.markdown } });
                }
                if (label) toast.success(label);
                return true;
            } catch (error) {
                toast.error(error.message);
                return false;
            }
        },

        /** Move a page up (-1) or down (+1) within its section. */
        movePage(id, delta) {
            const sections = store.activeSections();
            const sec = sections.find((s) => s.pages.indexOf(id) >= 0);
            if (!sec) return;
            const i = sec.pages.indexOf(id);
            const j = i + delta;
            if (j < 0 || j >= sec.pages.length) return;
            sec.pages.splice(i, 1);
            sec.pages.splice(j, 0, id);
            return store.order(sections);
        },

        /** Put a page at `index` of section `sectionId` (another section: a move). */
        placePage(id, sectionId, index) {
            const sections = store.activeSections();
            sections.forEach((s) => {
                const k = s.pages.indexOf(id);
                if (k >= 0) s.pages.splice(k, 1);
            });
            const target = sections.find((s) => s.id === sectionId);
            if (!target) return;
            target.pages.splice(Math.max(0, Math.min(index, target.pages.length)), 0, id);
            return store.order(sections);
        },

        /** Swap a section with its neighbour: section rows only (their order), no page rows. */
        moveSection(sectionId, delta) {
            const sections = store.activeSections();
            const i = sections.findIndex((s) => s.id === sectionId);
            const j = i + delta;
            if (i < 0 || j < 0 || j >= sections.length) return;
            const [s] = sections.splice(i, 1);
            sections.splice(j, 0, s);
            return store.order(
                sections.map((x) => ({ id: x.id, pages: [] })),
                `Moved section ${s.title}`
            );
        },

        renameSection(sectionId, title) {
            const s = store.sectionRow(sectionId);
            if (!s || !title || title === s.title) return;
            return store.updateSection(sectionId, { title }, `Section renamed to ${title}`);
        },
    };
    return store;
}

function diffFrom(sent, typed) {
    const out = {};
    if (!typed) return out;
    DRAFT_FIELDS.forEach((k) => {
        if (typed[k] !== sent[k]) out[k] = typed[k];
    });
    return out;
}

export function useDocs(store, selector) {
    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.get()),
        () => selector(store.get())
    );
}
