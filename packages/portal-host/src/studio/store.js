// Portal Studio state: one external store (useStudio(selector)) plus a document registry that
// holds the editor buffers outside React. Editors share one buffer per path, so the same file
// open in two groups stays in sync; React only hears about dirty-state flips.
import { useRef, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { isWrongScope, markOutOfScope, readOnly as scopeReadOnly } from './scope';
import { Text } from '@codemirror/state';
import { studioApi } from './studio-api';
import * as L from './layout';

export const PREVIEW_TAB = '@preview';

const VIRTUAL_LABELS = {
    'main.tsx': { label: 'Client', kind: 'client' },
    'styles.css': { label: 'Styles', kind: 'styles' },
    'server.js': { label: 'Server', kind: 'server' },
    'options.schema.json': { label: 'Options schema', kind: 'schema' },
    'options.defaults.json': { label: 'Defaults', kind: 'defaults' },
    'regions.json': { label: 'Regions', kind: 'regions' },
    'theme.css': { label: 'Theme stylesheet', kind: 'styles' },
    'tokens.json': { label: 'Tokens', kind: 'tokens' },
};

export function virtualLabel(path) {
    return VIRTUAL_LABELS[path] || null;
}

export function languageOf(path) {
    if (path === PREVIEW_TAB) return 'Preview';
    if (/\.tsx$/.test(path)) return 'TypeScript JSX';
    if (/\.ts$/.test(path)) return 'TypeScript';
    if (/\.jsx$/.test(path)) return 'JavaScript JSX';
    if (/\.(m?js)$/.test(path)) return 'JavaScript';
    if (/\.css$/.test(path)) return 'CSS';
    if (/\.json$/.test(path)) return 'JSON';
    return 'Plain Text';
}

function targetFor(path) {
    if (/\.css$/.test(path)) return 'style';
    if (/\.(tsx?|jsx?|mjs)$/.test(path)) return 'client';
    return 'asset';
}

const textOf = (content) => Text.of(String(content || '').split(/\r\n|\r|\n/));
const now = () => new Date().toLocaleTimeString();

// ---- persistence ----------------------------------------------------------------------------

const UI_KEY = 'rp-studio:ui';
const layoutKey = (owner) => `rp-studio:layout:${owner.type}:${owner.id}`;

function readJson(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeJson(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        /* quota / private mode */
    }
}

// ---- store ----------------------------------------------------------------------------------

export function createStudio({ navigate }) {
    const ui = readJson(UI_KEY, {});
    let state = {
        catalog: { components: null, themes: null, error: null },
        owner: null,
        loading: false,
        loadError: null,
        revision: 0,
        meta: {},
        savedMeta: {},
        metaDirty: false,
        files: [],
        folders: [],
        dirty: {},
        deleted: [],
        layout: L.group(),
        activeGroup: null,
        problems: { source: null, list: [], at: null },
        output: [],
        build: null,
        busy: null,
        checking: false,
        conflict: null,
        view: ui.view === 'pages' ? 'pages' : 'components',
        panelOpen: ui.panelOpen !== false,
        panelTab: ui.panelTab || 'problems',
        explorerOpen: ui.explorerOpen !== false,
        propertiesOpen: false,
        cursor: { line: 1, col: 1 },
        quickOpen: false,
        dialog: null,
        previewVersion: 0,
        loadVersion: 0,
    };
    state.activeGroup = state.layout.id;

    const listeners = new Set();
    const docs = new Map(); // path -> { text, saved, views:Set }
    let checkTimer = null;
    let checkSeq = 0;
    let layoutTimer = null;

    const get = () => state;
    function set(partial) {
        const next = typeof partial === 'function' ? partial(state) : partial;
        state = { ...state, ...next };
        listeners.forEach((l) => l());
        if ('layout' in next || 'activeGroup' in next) persistLayout();
        if ('panelOpen' in next || 'panelTab' in next || 'explorerOpen' in next || 'view' in next) {
            writeJson(UI_KEY, {
                panelOpen: state.panelOpen,
                panelTab: state.panelTab,
                explorerOpen: state.explorerOpen,
                view: state.view,
            });
        }
    }

    function persistLayout() {
        if (!state.owner) return;
        clearTimeout(layoutTimer);
        const owner = state.owner;
        layoutTimer = setTimeout(
            () => writeJson(layoutKey(owner), { layout: L.serialize(state.layout), activeGroup: state.activeGroup }),
            250
        );
    }

    function log(level, text) {
        const entry = { time: now(), level, text };
        set((s) => ({ output: s.output.concat(entry).slice(-300) }));
    }

    // ---- documents --------------------------------------------------------------------------

    const docApi = {
        get(path) {
            return docs.get(path) || null;
        },
        text(path) {
            const d = docs.get(path);
            return d ? d.text.toString() : '';
        },
        attach(path, view) {
            const d = docs.get(path);
            if (d) d.views.add(view);
        },
        detach(path, view) {
            const d = docs.get(path);
            if (d) d.views.delete(view);
        },
        /** A local edit in `view`: fan it out to the other views of the same document. */
        changed(path, view, tr, syncAnnotation, userEventAnnotation) {
            const d = docs.get(path);
            if (!d) return;
            d.text = view.state.doc;
            d.views.forEach((other) => {
                if (other === view) return;
                const annotations = [syncAnnotation.of(true)];
                const userEvent = tr.annotation(userEventAnnotation);
                if (userEvent) annotations.push(userEventAnnotation.of(userEvent));
                other.dispatch({ changes: tr.changes, annotations });
            });
            const isDirty = d.isNew || !d.text.eq(d.saved);
            if (!!state.dirty[path] !== isDirty) {
                const dirty = { ...state.dirty };
                if (isDirty) dirty[path] = true;
                else delete dirty[path];
                set({ dirty });
            }
            // Editing pins the preview tab of the active group.
            const g = L.findGroup(state.layout, state.activeGroup);
            if (g && g.tabs.some((t) => t.path === path && t.preview))
                set({ layout: L.updateGroup(state.layout, g.id, (x) => L.pinTab(x, path)) });
            scheduleCheck();
        },
    };

    function resetDocs(files) {
        docs.clear();
        files.forEach((f) =>
            docs.set(f.path, { text: textOf(f.content), saved: textOf(f.content), views: new Set(), isNew: false })
        );
    }

    const isDirtyPath = (path) => !!state.dirty[path];
    const anyDirty = () => Object.keys(state.dirty).length > 0 || state.deleted.length > 0 || state.metaDirty;

    // ---- catalog and projects ---------------------------------------------------------------

    async function loadCatalog() {
        try {
            const [components, themes] = await Promise.all([studioApi.listComponents(), studioApi.listThemes()]);
            set({ catalog: { components: components || [], themes: themes || [], error: null } });
            return { components, themes };
        } catch (error) {
            set((s) => ({ catalog: { ...s.catalog, error } }));
            log('error', `Could not load the component list: ${error.message}`);
            return null;
        }
    }

    function ownerFromCatalog(id) {
        const c = (state.catalog.components || []).find((x) => x.id === id);
        if (c) return { type: 'component', id, name: c.name };
        const t = (state.catalog.themes || []).find((x) => x.id === id);
        if (t) return { type: 'theme', id, name: t.name };
        return null;
    }

    function defaultLayout(files, type) {
        const first = files.find((f) => f.path === (type === 'theme' ? 'theme.css' : 'main.tsx')) || files[0];
        const g = L.group(first ? [{ path: first.path, preview: false }] : []);
        return { layout: g, activeGroup: g.id };
    }

    function applyProject(project, owner, keepLayout) {
        // Seed the buffers from the full file list first: sortFiles() drops contents.
        resetDocs(project.files || []);
        const files = sortFiles(project.files || []);
        const saved = readJson(layoutKey(owner), null);
        let layout;
        let activeGroup;
        if (keepLayout) {
            layout = L.pruneTabs(state.layout, (p) => p === PREVIEW_TAB || files.some((f) => f.path === p));
            activeGroup = L.findGroup(layout, state.activeGroup) ? state.activeGroup : L.groups(layout)[0].id;
        } else if (saved && L.isValidTree(saved.layout)) {
            layout = L.pruneTabs(saved.layout, (p) => p === PREVIEW_TAB || files.some((f) => f.path === p));
            const all = L.groups(layout);
            activeGroup = all.some((g) => g.id === saved.activeGroup) ? saved.activeGroup : all[0].id;
            if (!all.some((g) => g.tabs.length)) ({ layout, activeGroup } = defaultLayout(files, owner.type));
        } else ({ layout, activeGroup } = defaultLayout(files, owner.type));
        const meta = { ...(project.meta || {}) };
        set((s) => ({
            owner: {
                ...owner,
                name: (project.owner && project.owner.name) || owner.name,
                uniqueId: project.owner && project.owner.uniqueId,
            },
            loading: false,
            loadError: null,
            revision: project.revision || 0,
            meta,
            savedMeta: meta,
            metaDirty: false,
            files,
            folders: [],
            dirty: {},
            deleted: [],
            layout,
            activeGroup,
            build: project.latestBuild || null,
            kindFiles: project.kindFiles || s.kindFiles || null,
            problems: problemsFromBuild(project.latestBuild, 'build'),
            conflict: null,
            loadVersion: s.loadVersion + 1,
            previewVersion: s.previewVersion + 1,
        }));
    }

    async function openOwner(ownerOrId, opts) {
        const options = opts || {};
        let owner = typeof ownerOrId === 'string' ? ownerFromCatalog(ownerOrId) : ownerOrId;
        if (!owner && typeof ownerOrId === 'string') {
            if (!state.catalog.components) await loadCatalog();
            owner = ownerFromCatalog(ownerOrId) || { type: 'component', id: ownerOrId, name: ownerOrId };
        }
        if (!owner) return;
        set({ loading: true, loadError: null });
        try {
            const project = await studioApi.getProject(owner);
            applyProject(project, owner, options.keepLayout);
            log(
                'info',
                `Opened ${owner.type} ${project.owner ? project.owner.name : owner.id} (revision ${project.revision})`
            );
            if (options.navigate !== false && navigate) navigate('', { recordId: owner.id });
        } catch (error) {
            set({ loading: false, loadError: error });
            log('error', `Could not open ${owner.type} ${owner.id}: ${error.message}`);
        }
    }

    async function reload() {
        if (!state.owner) return;
        await openOwner(state.owner, { keepLayout: true, navigate: false });
    }

    function closeOwner() {
        docs.clear();
        set({
            owner: null,
            files: [],
            dirty: {},
            deleted: [],
            metaDirty: false,
            build: null,
            problems: { source: null, list: [], at: null },
        });
        if (navigate) navigate('', { recordId: '' });
    }

    // ---- problems ---------------------------------------------------------------------------

    function normalizeDiag(d, severity) {
        return {
            file: d.file || '',
            line: d.line && d.line > 0 ? d.line : 1,
            column: d.column && d.column > 0 ? d.column : 1,
            hasPosition: !!d.line,
            message: d.message || String(d),
            severity,
        };
    }

    function problemsFromDiagnostics(diagnostics, source) {
        const d = diagnostics || {};
        const list = (d.errors || [])
            .map((e) => normalizeDiag(e, 'error'))
            .concat((d.warnings || []).map((w) => normalizeDiag(w, 'warning')));
        return { source, list, at: now() };
    }

    function problemsFromBuild(build, source) {
        if (!build || !build.diagnostics) return { source, list: [], at: now() };
        return problemsFromDiagnostics(build.diagnostics, source);
    }

    // ---- check (live problems) --------------------------------------------------------------

    function changedFiles() {
        const out = [];
        state.files.forEach((f) => {
            if (state.dirty[f.path])
                out.push({ path: f.path, content: docApi.text(f.path), target: f.target || targetFor(f.path) });
        });
        return out;
    }

    function scheduleCheck() {
        if (!state.owner || state.owner.type !== 'component') return;
        clearTimeout(checkTimer);
        checkTimer = setTimeout(runCheck, 600);
    }

    async function runCheck() {
        if (!state.owner || state.owner.type !== 'component' || state.busy === 'saving') return;
        const owner = state.owner;
        const files = changedFiles().map((f) => ({ path: f.path, content: f.content }));
        const seqNo = (checkSeq += 1);
        set({ checking: true });
        try {
            const result = await studioApi.check(owner, files);
            if (seqNo !== checkSeq || state.owner !== owner) return;
            set({ checking: false, problems: problemsFromDiagnostics(result.diagnostics, 'check') });
        } catch (error) {
            if (seqNo !== checkSeq) return;
            set({ checking: false });
            log('warn', `Live check failed: ${error.message}`);
        }
    }

    // ---- save -------------------------------------------------------------------------------

    async function save(opts) {
        const options = opts || {};
        if (!state.owner || state.busy === 'saving') return;
        if (scopeReadOnly()) {
            toast.error('Switch to React Portal to save (see the banner).');
            return;
        }
        const owner = state.owner;
        const files = changedFiles()
            .map((f) => ({ path: f.path, content: f.content, target: f.target }))
            .concat(state.deleted.map((path) => ({ path, content: '', deleted: true })));
        const body = {
            expectedRevision: options.expectedRevision !== undefined ? options.expectedRevision : state.revision,
        };
        if (files.length) body.files = files;
        if (state.metaDirty) body.meta = pickMeta(state.meta, owner.type);
        if (!body.files && !body.meta && !options.force) {
            log('info', 'Nothing to save');
            return;
        }
        const sentTexts = new Map(
            files.filter((f) => !f.deleted).map((f) => [f.path, docs.get(f.path) ? docs.get(f.path).text : null])
        );
        const started = Date.now();
        clearTimeout(checkTimer);
        checkSeq += 1;
        set({ busy: 'saving', conflict: null, checking: false });
        log(
            'info',
            `Saving ${files.length} file(s)${body.meta ? ' + properties' : ''} at revision ${body.expectedRevision}…`
        );
        try {
            const result = await studioApi.save(owner, body);
            if (state.owner !== owner) return;
            // Buffers edited during the save stay dirty; everything sent becomes the new baseline.
            sentTexts.forEach((text, path) => {
                const d = docs.get(path);
                if (d && text) {
                    d.saved = text;
                    d.isNew = false;
                }
            });
            const serverFiles = result.files && result.files.length ? result.files : null;
            let files2 = state.files
                .filter((f) => !state.deleted.includes(f.path))
                .map((f) => ({ ...f, isNew: false }));
            if (serverFiles) {
                // Merge in server-side metadata (ids, hashes, virtual flags) and files we don't have yet.
                const byPath = new Map(serverFiles.map((f) => [f.path, f]));
                // Baseline files follow the kind (x_312987_portal.studio.kind_files): drop the ones the
                // server no longer returns (kind changed, or a "Not used" file was emptied).
                const dropped = files2
                    .filter(
                        (f) =>
                            f.virtual &&
                            !byPath.has(f.path) &&
                            !(
                                docs.get(f.path) &&
                                sentTexts.get(f.path) &&
                                !docs.get(f.path).text.eq(sentTexts.get(f.path))
                            )
                    )
                    .map((f) => f.path);
                if (dropped.length) {
                    files2 = files2.filter((f) => !dropped.includes(f.path));
                    dropped.forEach((p) => docs.delete(p));
                    set((s) => ({ layout: L.pruneTabs(s.layout, (p) => !dropped.includes(p)) }));
                }
                files2 = files2.map((f) =>
                    byPath.has(f.path)
                        ? { ...f, ...withoutContent(byPath.get(f.path)), unused: byPath.get(f.path).unused }
                        : f
                );
                serverFiles.forEach((f) => {
                    if (!files2.some((x) => x.path === f.path)) {
                        files2.push(withoutContent(f));
                        docs.set(f.path, {
                            text: textOf(f.content),
                            saved: textOf(f.content),
                            views: new Set(),
                            isNew: false,
                        });
                    }
                });
            }
            const dirty = {};
            files2.forEach((f) => {
                const d = docs.get(f.path);
                if (d && (d.isNew || !d.text.eq(d.saved))) dirty[f.path] = true;
            });
            const build = result.build || null;
            const ms = build && build.diagnostics && build.diagnostics.ms;
            set((s) => ({
                busy: null,
                revision: result.revision,
                files: sortFiles(files2),
                dirty,
                deleted: [],
                savedMeta: s.meta,
                metaDirty: false,
                build,
                problems: problemsFromBuild(build, 'save'),
                previewVersion: build && build.state === 'ready' ? s.previewVersion + 1 : s.previewVersion,
            }));
            const errors = build && build.diagnostics && build.diagnostics.errors ? build.diagnostics.errors.length : 0;
            log(
                build && build.state === 'failed' ? 'error' : 'info',
                `Saved revision ${result.revision} in ${Date.now() - started} ms · build ${build ? build.state : 'n/a'}${ms ? ` (compile ${ms} ms)` : ''}${errors ? ` · ${errors} error(s)` : ''}`
            );
            if (build && build.state === 'failed') set({ panelOpen: true, panelTab: 'problems' });
            refreshCatalogEntry(owner, result);
        } catch (error) {
            set({ busy: null });
            if (isWrongScope(error)) {
                markOutOfScope(error);
                log('error', `Not saved: ${error.message}`);
            } else if (error.status === 409) {
                const current = error.details && error.details.currentRevision;
                set({ conflict: { currentRevision: current, message: error.message } });
                log('warn', `Revision conflict: someone saved revision ${current === undefined ? '?' : current} first`);
            } else {
                log('error', `Save failed: ${error.message}`);
                set({ panelOpen: true, panelTab: 'output' });
            }
        }
    }

    function refreshCatalogEntry(owner, result) {
        set((s) => {
            const key = owner.type === 'theme' ? 'themes' : 'components';
            const list = s.catalog[key];
            if (!list) return {};
            return {
                catalog: {
                    ...s.catalog,
                    [key]: list.map((c) =>
                        c.id === owner.id
                            ? {
                                  ...c,
                                  revision: result.revision,
                                  build: result.build,
                                  name: s.meta.name || c.name,
                                  kind: s.meta.kind || c.kind,
                              }
                            : c
                    ),
                },
            };
        });
    }

    function resolveConflict(choice) {
        const conflict = state.conflict;
        if (!conflict) return;
        if (choice === 'reload') {
            set({ conflict: null });
            reload();
        } else if (choice === 'overwrite') {
            set({ conflict: null });
            save({
                expectedRevision: conflict.currentRevision !== undefined ? conflict.currentRevision : state.revision,
            });
        } else set({ conflict: null });
    }

    // ---- meta -------------------------------------------------------------------------------

    function setMeta(partial) {
        const meta = { ...state.meta, ...partial };
        set({
            meta,
            metaDirty:
                JSON.stringify(pickMeta(meta, state.owner && state.owner.type)) !==
                JSON.stringify(pickMeta(state.savedMeta, state.owner && state.owner.type)),
        });
    }

    // ---- files ------------------------------------------------------------------------------

    function hasPath(path) {
        return state.files.some((f) => f.path === path);
    }

    function createFile(path, content) {
        const clean = cleanPath(path);
        if (!clean) return { error: 'Enter a file name' };
        if (hasPath(clean)) return { error: `${clean} already exists` };
        if (virtualLabel(clean)) {
            const kind = (state.meta && state.meta.kind) || 'widget';
            const listed = state.owner && state.owner.type === 'component' ? kindFilesFor(state.kindFiles, kind) : null;
            if (listed && listed.indexOf(clean) < 0)
                return { error: `${clean} isn't used by ${kind} components (x_312987_portal.studio.kind_files)` };
            return {
                error: `${clean} is reserved for the component's ${virtualLabel(clean).label.toLowerCase()} file`,
            };
        }
        docs.set(clean, { text: textOf(content || ''), saved: textOf(''), views: new Set(), isNew: true });
        set((s) => ({
            files: sortFiles(s.files.concat({ path: clean, target: targetFor(clean), isNew: true })),
            dirty: { ...s.dirty, [clean]: true },
            deleted: s.deleted.filter((p) => p !== clean),
        }));
        openFile(clean, { preview: false });
        return { path: clean };
    }

    function createFolder(prefix) {
        const clean = cleanPath(prefix);
        if (!clean) return { error: 'Enter a folder name' };
        set((s) => ({ folders: s.folders.includes(clean) ? s.folders : s.folders.concat(clean) }));
        return { path: clean };
    }

    /** Rename a file or a folder prefix. Saved files become a delete + create on the next save. */
    function rename(from, to, isFolder) {
        const target = cleanPath(to);
        if (!target) return { error: 'Enter a name' };
        const moves = [];
        state.files.forEach((f) => {
            if (f.virtual) return;
            if (isFolder ? f.path.indexOf(from + '/') === 0 : f.path === from)
                moves.push([f.path, isFolder ? target + f.path.slice(from.length) : target]);
        });
        if (!moves.length && !isFolder) return { error: `${from} not found` };
        for (const [, p] of moves) if (hasPath(p) || virtualLabel(p)) return { error: `${p} already exists` };
        const deleted = state.deleted.slice();
        const dirty = { ...state.dirty };
        const files = state.files.map((f) => {
            const move = moves.find((m) => m[0] === f.path);
            if (!move) return f;
            const d = docs.get(f.path);
            if (!f.isNew && !deleted.includes(f.path)) deleted.push(f.path);
            docs.delete(f.path);
            docs.set(move[1], { text: d ? d.text : textOf(''), saved: textOf(''), views: new Set(), isNew: true });
            delete dirty[f.path];
            dirty[move[1]] = true;
            return { ...f, path: move[1], target: targetFor(move[1]), isNew: true, id: undefined };
        });
        const map = new Map(moves);
        const folders = state.folders.map((p) =>
            isFolder && (p === from || p.indexOf(from + '/') === 0) ? target + p.slice(from.length) : p
        );
        set({
            files: sortFiles(files),
            dirty,
            deleted,
            folders,
            layout: L.renamePaths(state.layout, (p) => map.get(p) || p),
        });
        return { path: target };
    }

    function remove(path, isFolder) {
        const victims = state.files
            .filter((f) => !f.virtual && (isFolder ? f.path.indexOf(path + '/') === 0 : f.path === path))
            .map((f) => f.path);
        const deleted = state.deleted.slice();
        const dirty = { ...state.dirty };
        victims.forEach((p) => {
            const f = state.files.find((x) => x.path === p);
            if (f && !f.isNew && !deleted.includes(p)) deleted.push(p);
            docs.delete(p);
            delete dirty[p];
        });
        const folders = isFolder
            ? state.folders.filter((p) => p !== path && p.indexOf(path + '/') !== 0)
            : state.folders;
        set({
            files: state.files.filter((f) => !victims.includes(f.path)),
            dirty,
            deleted,
            folders,
            layout: L.pruneTabs(state.layout, (p) => !victims.includes(p)),
        });
        log('info', `Deleted ${victims.length ? victims.join(', ') : path} (sent with the next save)`);
    }

    // ---- groups and tabs --------------------------------------------------------------------

    function openFile(path, opts) {
        const options = opts || {};
        if (path !== PREVIEW_TAB && !hasPath(path)) return;
        const groupId =
            options.groupId && L.findGroup(state.layout, options.groupId) ? options.groupId : state.activeGroup;
        const g = L.findGroup(state.layout, groupId) || L.groups(state.layout)[0];
        const layout = L.updateGroup(state.layout, g.id, (x) =>
            L.openTab(x, path, options.preview !== false && path !== PREVIEW_TAB, isDirtyPath)
        );
        set({ layout, activeGroup: g.id });
        if (options.line) revealLine(path, options.line, options.column);
    }

    function pin(groupId, path) {
        set({ layout: L.updateGroup(state.layout, groupId, (g) => L.pinTab(g, path)) });
    }

    function activateTab(groupId, path) {
        set({ layout: L.updateGroup(state.layout, groupId, (g) => ({ ...g, active: path })), activeGroup: groupId });
    }

    function focusGroup(groupId) {
        if (state.activeGroup !== groupId) set({ activeGroup: groupId });
    }

    function closeTab(groupId, path) {
        let layout = L.updateGroup(state.layout, groupId, (g) => L.closeTab(g, path));
        const g = L.findGroup(layout, groupId);
        let activeGroup = state.activeGroup;
        if (g && g.tabs.length === 0 && L.groups(layout).length > 1) {
            layout = L.removeGroup(layout, groupId);
            if (activeGroup === groupId) activeGroup = L.groups(layout)[0].id;
        }
        set({ layout, activeGroup });
    }

    function closeOthers(groupId, path) {
        set({
            layout: L.updateGroup(state.layout, groupId, (g) => ({
                ...g,
                tabs: g.tabs.filter((t) => t.path === path),
                active: path,
            })),
        });
    }

    function closeAll(groupId) {
        let layout = L.updateGroup(state.layout, groupId, (g) => ({ ...g, tabs: [], active: null }));
        let activeGroup = state.activeGroup;
        if (L.groups(layout).length > 1) {
            layout = L.removeGroup(layout, groupId);
            if (activeGroup === groupId) activeGroup = L.groups(layout)[0].id;
        }
        set({ layout, activeGroup });
    }

    /** Split from a tab: duplicate that tab into a new group on `edge` (shared buffer). */
    function splitTab(groupId, path, edge) {
        const ng = L.group([{ path, preview: false }], path);
        set({ layout: L.splitAt(state.layout, groupId, edge || 'right', ng), activeGroup: ng.id });
    }

    function closeActiveTab() {
        const g = L.findGroup(state.layout, state.activeGroup);
        if (g && g.active) closeTab(g.id, g.active);
    }

    function moveTab(fromGroupId, path, toGroupId, index) {
        const from = L.findGroup(state.layout, fromGroupId);
        const tab = (from && from.tabs.find((t) => t.path === path)) || { path, preview: false };
        let layout = state.layout;
        if (fromGroupId !== toGroupId) layout = L.updateGroup(layout, fromGroupId, (g) => L.closeTab(g, path));
        layout = L.updateGroup(layout, toGroupId, (g) => L.insertTab(g, { ...tab, preview: false }, index));
        const src = L.findGroup(layout, fromGroupId);
        if (src && src.tabs.length === 0 && L.groups(layout).length > 1) layout = L.removeGroup(layout, fromGroupId);
        set({ layout, activeGroup: toGroupId });
    }

    /** Drop a tab on a group's edge: a new group on that side holds it. */
    function dropOnEdge(fromGroupId, path, targetGroupId, edge) {
        const from = L.findGroup(state.layout, fromGroupId);
        if (fromGroupId === targetGroupId && from && from.tabs.length === 1) return;
        const ng = L.group([{ path, preview: false }], path);
        let layout = L.splitAt(state.layout, targetGroupId, edge, ng);
        if (from) {
            layout = L.updateGroup(layout, fromGroupId, (g) => L.closeTab(g, path));
            const src = L.findGroup(layout, fromGroupId);
            if (src && src.tabs.length === 0 && L.groups(layout).length > 1)
                layout = L.removeGroup(layout, fromGroupId);
        }
        set({ layout, activeGroup: ng.id });
    }

    /**
     * Open to the Side (Alt+click, Ctrl+Enter, context menu): open `path` in the group to the
     * right of the active one, creating it if needed. The source group is untouched; a preview
     * tab in the target is replaced; a file already open there is just focused.
     */
    function openToSide(path) {
        if (path !== PREVIEW_TAB && !hasPath(path)) return;
        let layout = state.layout;
        let target = L.neighborGroup(layout, state.activeGroup, 'row');
        if (!target) {
            target = L.group([], null);
            layout = L.splitAt(layout, state.activeGroup, 'right', target);
        }
        layout = L.updateGroup(layout, target.id, (g) => L.openTab(g, path, path !== PREVIEW_TAB, isDirtyPath));
        set({ layout, activeGroup: target.id });
    }

    /** Ctrl+\: the active file also opens in a new group to the right (same buffer). */
    function splitActive(edge) {
        const g = L.findGroup(state.layout, state.activeGroup);
        if (!g) return;
        const ng = L.group(g.active ? [{ path: g.active, preview: false }] : [], g.active);
        set({ layout: L.splitAt(state.layout, g.id, edge || 'right', ng), activeGroup: ng.id });
    }

    function cycleTab(delta) {
        const g = L.findGroup(state.layout, state.activeGroup);
        if (!g || g.tabs.length < 2) return;
        const i = g.tabs.findIndex((t) => t.path === g.active);
        const next = g.tabs[(i + delta + g.tabs.length) % g.tabs.length];
        activateTab(g.id, next.path);
    }

    // Editors register a reveal callback so Problems can jump to file:line.
    const revealers = new Map(); // `${groupId}|${path}` -> fn(line, column)
    function registerRevealer(groupId, path, fn) {
        revealers.set(`${groupId}|${path}`, fn);
        return () => revealers.delete(`${groupId}|${path}`);
    }
    function revealLine(path, line, column) {
        // The editor may mount on this render; retry briefly.
        let tries = 0;
        const attempt = () => {
            const fn = revealers.get(`${state.activeGroup}|${path}`);
            if (fn) fn(line, column);
            else if ((tries += 1) < 20) setTimeout(attempt, 30);
        };
        attempt();
    }

    return {
        get,
        set,
        subscribe: (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        docs: docApi,
        log,
        isDirtyPath,
        anyDirty,
        loadCatalog,
        openOwner,
        reload,
        closeOwner,
        save,
        runCheck,
        resolveConflict,
        setMeta,
        createFile,
        createFolder,
        rename,
        remove,
        openFile,
        pin,
        activateTab,
        focusGroup,
        closeTab,
        closeActiveTab,
        closeOthers,
        closeAll,
        splitTab,
        moveTab,
        dropOnEdge,
        splitActive,
        openToSide,
        cycleTab,
        registerRevealer,
        revealLine,
        async createComponent(name, kind) {
            try {
                const project = await studioApi.createComponent({ name, kind });
                log('info', `Created ${kind} ${project.owner ? project.owner.name : name}`);
                await loadCatalog();
                const owner = { type: 'component', id: project.owner.id, name: project.owner.name };
                applyProject(project, owner, false);
                if (navigate) navigate('', { recordId: owner.id });
                return { ok: true };
            } catch (error) {
                log('error', `Create failed: ${error.message}`);
                return { error: error.message };
            }
        },
    };
}

// ---- helpers --------------------------------------------------------------------------------

/** Baseline files of a component kind: the server's map (x_312987_portal.studio.kind_files) or the built-in default. */
const DEFAULT_KIND_FILES = {
    widget: ['main.tsx', 'styles.css', 'server.js', 'options.schema.json', 'options.defaults.json'],
    layout: ['main.tsx', 'styles.css', 'server.js', 'regions.json', 'options.schema.json', 'options.defaults.json'],
    block: ['main.tsx', 'styles.css', 'regions.json', 'options.schema.json', 'options.defaults.json'],
    primitive: ['main.tsx', 'styles.css'],
    utility: ['main.tsx'],
};
export function kindFilesFor(map, kind) {
    const m = map || DEFAULT_KIND_FILES;
    return m[kind] || DEFAULT_KIND_FILES[kind] || m.widget || DEFAULT_KIND_FILES.widget;
}

const VIRTUAL_ORDER = [
    'main.tsx',
    'styles.css',
    'server.js',
    'options.schema.json',
    'options.defaults.json',
    'regions.json',
    'theme.css',
    'tokens.json',
];

function sortFiles(files) {
    return files
        .map((f) => (f.virtual === undefined && virtualLabel(f.path) && !f.isNew ? { ...f, virtual: true } : f))
        .map((f) => withoutContent(f))
        .sort((a, b) => {
            if (a.virtual !== b.virtual) return a.virtual ? -1 : 1;
            if (a.virtual) return VIRTUAL_ORDER.indexOf(a.path) - VIRTUAL_ORDER.indexOf(b.path);
            return a.path.localeCompare(b.path);
        });
}

function withoutContent(f) {
    if (!('content' in f)) return f;
    const copy = { ...f };
    delete copy.content;
    return copy;
}

function cleanPath(path) {
    return String(path || '')
        .replace(/\\/g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter((seg) => seg && seg !== '.' && seg !== '..')
        .join('/');
}

const META_KEYS = {
    component: ['name', 'description', 'kind', 'serverMode', 'tailwind', 'placeable', 'active'],
    theme: ['name'],
};
function pickMeta(meta, type) {
    const out = {};
    (META_KEYS[type] || META_KEYS.component).forEach((k) => {
        if (meta && meta[k] !== undefined) out[k] = meta[k];
    });
    return out;
}

// ---- React binding --------------------------------------------------------------------------

/** Subscribe to a slice of the studio state. Selectors return primitives or stable references. */
export function useStudio(studio, selector) {
    const sel = useRef(selector);
    sel.current = selector;
    return useSyncExternalStore(
        studio.subscribe,
        () => sel.current(studio.get()),
        () => sel.current(studio.get())
    );
}
