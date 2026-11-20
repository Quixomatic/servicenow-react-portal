// Docs activity: the store singleton and its deep-link entry (studio/deep-link/registry.js).
//   /x/312987/portal/studio/params/view/docs/id/<doc path>/q/anchor%3D<heading id>
//   /x/312987/portal/studio/params/view/docs/id/<collection>:<doc path>   (another docs collection)
// A bare path is the react-portal collection, so links from before doc collections keep working.
// Doc paths can't contain ':', so the prefix is unambiguous (like theme:<key> and sp:/kb).
// The open page lives in the store (not component state), so a link opens it before the activity
// mounts. Ctrl/⌘+S and the beforeunload guard reach the store through requestDocsSave / docsDirty.
import { registerStudioLocation } from '../deep-link/registry';
import { createDocsStore, DEFAULT_COLLECTION } from './docs-store';
import { ask } from '../dialogs';

let logger = null;
export const docsStore = createDocsStore({ log: (level, text) => logger && logger(level, text) });

/** Studio's output log for the store's messages. */
export function setDocsLogger(fn) {
    logger = fn;
}

let saveHandler = null;
/** The mounted Docs activity handles saves (it owns the conflict dialog). */
export function setDocsSaveHandler(fn) {
    saveHandler = fn;
    return () => {
        if (saveHandler === fn) saveHandler = null;
    };
}
export function requestDocsSave() {
    if (saveHandler) saveHandler();
    else docsStore.save().catch(() => {});
}
let flushHandler = null;
/** The visual editor's pending (debounced) edits → the draft, for the page it was opened on. */
export function setDocsFlush(fn) {
    flushHandler = fn;
    return () => {
        if (flushHandler === fn) flushHandler = null;
    };
}
export function flushDocs() {
    if (flushHandler) flushHandler();
}
export function docsDirty() {
    flushDocs();
    return docsStore.isDirty();
}

registerStudioLocation({
    activity: 'docs',
    param: 'docs',
    aliases: ['doc'],
    qKeys: ['anchor'],
    serialize() {
        const s = docsStore.get();
        const row = s.current || (s.currentId && (s.list || []).find((d) => d.id === s.currentId));
        const prefix = s.collection && s.collection !== DEFAULT_COLLECTION ? s.collection + ':' : '';
        return { id: row ? prefix + row.path : prefix, anchor: s.anchor || '' };
    },
    async apply(params, ctx) {
        const raw = String(params.id || '');
        const colon = raw.indexOf(':');
        const collection = colon >= 0 ? raw.slice(0, colon) || DEFAULT_COLLECTION : DEFAULT_COLLECTION;
        const path = (colon >= 0 ? raw.slice(colon + 1) : raw).replace(/^\/+|\/+$/g, '').replace(/\.md$/, '');
        const anchor = params.anchor || '';
        if (!docsStore.get().collections) await docsStore.loadCollections();
        // Another collection: switch (unsaved changes ask first).
        if (collection !== docsStore.get().collection) {
            if (!docsStore.collectionRow(collection)) {
                ctx.notFound(`No docs collection "${collection}"`);
                return undefined;
            }
            flushDocs();
            if (docsStore.isDirty() && ctx.studio) {
                const cur = docsStore.get().current;
                const choice = await ask(ctx.studio, {
                    type: 'confirm',
                    title: 'Unsaved changes',
                    message: `Save your changes to "${cur.title}" before opening the ${collection} collection?`,
                    buttons: [
                        { label: 'Save', value: 'save', primary: true },
                        { label: "Don't save", value: 'discard' },
                        { label: 'Cancel', value: null },
                    ],
                });
                if (choice === null) return { cancelled: true };
                if (choice === 'save') {
                    try {
                        await docsStore.save();
                    } catch (error) {
                        return { cancelled: true };
                    }
                }
            }
            await docsStore.setCollection(collection);
        }
        if (!docsStore.get().list) await docsStore.loadList();
        if (!path) return undefined;
        const s = docsStore.get();
        if (s.current && s.current.path === path) {
            if (anchor !== (s.anchor || '')) docsStore.set({ anchor: anchor || null });
            return undefined;
        }
        const row = docsStore.byPath(path);
        if (!row) {
            ctx.notFound(`No doc page "${path}" in ${collection}`);
            return undefined;
        }
        flushDocs();
        if (docsStore.isDirty() && ctx.studio) {
            const choice = await ask(ctx.studio, {
                type: 'confirm',
                title: 'Unsaved changes',
                message: `Save your changes to "${s.current.title}" before opening "${row.title}"?`,
                buttons: [
                    { label: 'Save', value: 'save', primary: true },
                    { label: "Don't save", value: 'discard' },
                    { label: 'Cancel', value: null },
                ],
            });
            if (choice === null) return { cancelled: true };
            if (choice === 'save') {
                try {
                    await docsStore.save();
                } catch (error) {
                    return { cancelled: true };
                }
            }
        }
        await docsStore.open(row.id, { anchor: anchor || null, navigate: false });
        return undefined;
    },
    subscribe(ctx, onChange) {
        let last = '';
        return docsStore.subscribe(() => {
            const s = docsStore.get();
            const key = s.collection + ':' + (s.current ? s.current.path : '') + '#' + (s.anchor || '');
            if (key === last) return;
            last = key;
            onChange();
        });
    },
    label() {
        const s = docsStore.get();
        const col = s.collection && s.collection !== DEFAULT_COLLECTION ? ' · ' + s.collection : '';
        return 'Docs' + col + (s.current ? ' · ' + s.current.path : '');
    },
});
