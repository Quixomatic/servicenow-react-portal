// Docs activity store (x_312987_portal_doc). Lives outside React so deep links can open a page
// before the activity mounts (docs/location.js). One open page at a time, with a draft
// (frontmatter fields + markdown) compared against the saved row for the dirty marker.
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { docsApi } from './docs-api';

export const DRAFT_FIELDS = ['title', 'description', 'tags', 'icon', 'markdown'];

// The editor mode the user last chose (our own namespace; never a platform preference). Visual
// when nothing is stored: a first-time user or a fresh state opens in the visual editor.
const MODE_KEY = 'x_312987_portal.docs.mode';

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
	return { title: doc.title || '', description: doc.description || '', tags: doc.tags || '', icon: doc.icon || '', markdown: doc.markdown || '' };
}

function slugify(s) {
	return String(s || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Sections of the page list in nav order: [{ slug, title, order, pages }] (inactive pages kept, flagged). */
export function groupSections(list) {
	const out = [];
	const by = {};
	(list || []).forEach((d) => {
		const slug = d.sectionSlug || slugify(d.section) || 'docs';
		if (!by[slug]) {
			by[slug] = { slug, title: d.section || slug, order: d.sectionOrder, pages: [], activeCount: 0 };
			out.push(by[slug]);
		}
		if (d.active && !by[slug].activeCount) {
			// The first active page decides the section's title and position.
			by[slug].title = d.section || slug;
			by[slug].order = d.sectionOrder;
		}
		if (d.active) by[slug].activeCount++;
		by[slug].pages.push(d);
	});
	out.sort((a, b) => (a.activeCount ? 0 : 1) - (b.activeCount ? 0 : 1) || a.order - b.order);
	out.forEach((s) => s.pages.sort((a, b) => (a.active ? 0 : 1) - (b.active ? 0 : 1) || a.order - b.order || a.title.localeCompare(b.title)));
	return out;
}

export function createDocsStore({ navigate, log } = {}) {
	let state = {
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
		loadSeq: 0
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

		async loadList() {
			try {
				const list = await docsApi.list();
				set({ list: Array.isArray(list) ? list : [], listError: null });
				return state.list;
			} catch (error) {
				set({ listError: error });
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
			const body = { ...s.draft };
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
				const doc = await docsApi.update(id, fields);
				await store.loadList();
				if (state.current && state.current.id === id) {
					const keep = state.draft;
					const saved = draftOf(state.current);
					set({ current: { ...doc, markdown: state.current.markdown } });
					// Only fields the patch touched are refreshed in the draft.
					const next = { ...keep };
					DRAFT_FIELDS.forEach((k) => {
						if (fields[k] !== undefined || keep[k] === saved[k]) next[k] = k === 'markdown' ? keep.markdown : draftOf(doc)[k];
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
				const doc = await docsApi.create(body);
				await store.loadList();
				await store.open(doc.id);
				toast.success(`Created ${doc.path}`);
				return doc;
			} catch (error) {
				toast.error(error.message);
				return null;
			}
		},

		/** POST /docs/order with the given sections ([{ slug, title, pages: [id] }]). */
		async order(sections, label) {
			try {
				const list = await docsApi.order({ sections });
				set({ list: Array.isArray(list) ? list : state.list });
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

		/** Active sections as the order endpoint wants them. */
		activeSections() {
			return groupSections(state.list)
				.filter((s) => s.activeCount)
				.map((s) => ({ slug: s.slug, title: s.title, pages: s.pages.filter((p) => p.active).map((p) => p.id) }));
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

		/** Put a page at `index` of section `slug` (another section: a move). */
		placePage(id, slug, index) {
			const sections = store.activeSections();
			sections.forEach((s) => {
				const k = s.pages.indexOf(id);
				if (k >= 0) s.pages.splice(k, 1);
			});
			const target = sections.find((s) => s.slug === slug);
			if (!target) return;
			target.pages.splice(Math.max(0, Math.min(index, target.pages.length)), 0, id);
			return store.order(sections.filter((s) => s.pages.length || s.slug === slug));
		},

		moveSection(slug, delta) {
			const sections = store.activeSections();
			const i = sections.findIndex((s) => s.slug === slug);
			const j = i + delta;
			if (i < 0 || j < 0 || j >= sections.length) return;
			const [s] = sections.splice(i, 1);
			sections.splice(j, 0, s);
			return store.order(sections);
		},

		renameSection(slug, title) {
			const sections = store.activeSections();
			const s = sections.find((x) => x.slug === slug);
			if (!s || !title || title === s.title) return;
			s.title = title;
			return store.order(sections, `Section renamed to ${title}`);
		}
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
	return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}
