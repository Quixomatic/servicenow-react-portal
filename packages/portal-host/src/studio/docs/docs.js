// Portal Studio "Docs" activity: write docs collections (x_312987_portal_doc_collection), their
// sections (x_312987_portal_doc_section) and pages (x_312987_portal_doc).
//   collection picker (+ new collection) | page tree (sections → pages: create, move / reorder,
//   rename / deactivate sections, deactivate pages)
//   | editor: frontmatter form, Markdown (CodeMirror) or Visual (TipTap) mode, problems strip
//   | live preview (components:app/docs-content, the real renderer)
// Source of truth (.plans/docs-editor.md): the repo's docs/guide stays canonical; Studio edits are
// kept by the seed and written back with `npm run docs:pull`.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Allotment, LayoutPriority } from 'allotment';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    BetweenHorizontalEnd,
    BetweenVerticalEnd,
    Bold,
    BookOpen,
    ChevronDown,
    ChevronUp,
    Code,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    FolderPlus,
    GripVertical,
    Library,
    Heading1,
    Heading2,
    Heading3,
    Image,
    Italic,
    Link,
    List,
    ListOrdered,
    MessageSquareWarning,
    Minus,
    Pencil,
    Pilcrow,
    Plus,
    Quote,
    Redo2,
    RotateCcw,
    Save,
    SquareCode,
    Strikethrough,
    Table,
    Trash2,
    Undo2,
} from 'lucide-react';
import { isMock } from '#/runtime/api';
import { Icon } from '#/components/ui/icon';
import { useScope } from '../scope';
import { useStudioTheme } from '../theme';
import { ask } from '../dialogs';
import { IconPicker } from '../menus/icon-picker';
import { host, loadDocsRenderer } from './host-modules';
import { docsStore, flushDocs, setDocsFlush, setDocsLogger, setDocsSaveHandler } from './location';
import { DEFAULT_COLLECTION, groupSections, rememberMode, useDocs } from './docs-store';
import { DOCS_CSS } from './docs-css';
import { brokenLinks, headingsOf, relativeDocLink } from './links';
import { CALLOUT_KINDS } from './md-convert';
import MarkdownEditor from './md-editor';
import VisualEditor from './visual-editor';
import DocsPreview from './preview';

const store = docsStore;
const CALLOUT_CHOICES = ['Note', 'Tip', 'Important', 'Warning', 'Caution', 'Danger', 'Info', 'Success'];

function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * The page on a portal that serves the collection: the first portal whose settings.docsCollections
 * lists it (`c` in q when it isn't that portal's default), else /site/docs.
 */
function portalUrl(path, collectionKey) {
    const key = collectionKey || store.get().collection || DEFAULT_COLLECTION;
    const row = store.collectionRow(key);
    const portals = (row && row.portals) || [];
    const portal = portals.find((p) => p.isDefault) || portals[0] || null;
    const slug = portal ? portal.slug : 'docs';
    const pairs = [];
    if (path && path !== 'index') pairs.push('page-id', encodeURIComponent(path));
    const isDefault = portal ? portal.isDefault : key === DEFAULT_COLLECTION;
    if (!isDefault) pairs.push('q', encodeURIComponent('c=' + key));
    return '/x/312987/portal/site/' + slug + (pairs.length ? '/params/' + pairs.join('/') : '');
}

/** Section rows of the store (null while loading). */
const useSectionRows = () => useDocs(store, (s) => s.sections);

export default function Docs({ studio, root }) {
    const scope = useScope();
    const readOnly = !!(scope.context && scope.context.inScope === false);
    const { resolvedTheme } = useStudioTheme();
    const dark = resolvedTheme === 'dark';
    const list = useDocs(store, (s) => s.list);
    const listError = useDocs(store, (s) => s.listError);
    const current = useDocs(store, (s) => s.current);
    const [renderer, setRenderer] = useState({ status: 'loading' });

    useLayoutEffect(() => {
        if (root) host().internals.ensureStyle(root, 'studio:docs', DOCS_CSS, 'widget');
    }, [root]);

    useEffect(() => {
        setDocsLogger((level, text) => studio.log(level, text));
        if (isMock()) return;
        if (!store.get().collections) store.loadCollections().then(() => !store.get().list && store.loadList());
        else if (!store.get().list) store.loadList();
        let alive = true;
        loadDocsRenderer(root)
            .then((r) => alive && setRenderer({ status: 'ready', ...r }))
            .catch((error) => alive && setRenderer({ status: 'error', message: error.message }));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ctrl/⌘+S (studio-app routes it here) and the toolbar's Save: conflicts ask first.
    const visualFlush = useRef(null);
    const save = useCallback(async () => {
        if (readOnly) return;
        if (visualFlush.current) visualFlush.current();
        try {
            await store.save();
        } catch (error) {
            if (!error || !error.conflict) return;
            const d = error.details || {};
            const choice = await ask(studio, {
                type: 'confirm',
                title: 'This page changed since you opened it',
                message: `${d.updatedBy || 'Someone'} saved it at ${d.updatedOn || 'an unknown time'} (a seed or another editor). Overwrite their version with yours, or reload theirs (your edits are lost)?`,
                buttons: [
                    { label: 'Overwrite', value: 'overwrite', primary: true },
                    { label: 'Reload theirs', value: 'reload' },
                    { label: 'Cancel', value: null },
                ],
            });
            if (choice === 'overwrite') await store.save({ force: true }).catch(() => {});
            if (choice === 'reload' && store.get().current)
                await store.open(store.get().current.id, { navigate: false });
        }
    }, [readOnly, studio]);
    useEffect(() => setDocsSaveHandler(save), [save]);
    useEffect(() => setDocsFlush(() => visualFlush.current && visualFlush.current()), []);

    if (isMock()) return <div className="rpd-docs-empty">Docs need the instance: the mock data has no doc pages.</div>;

    return (
        <div className="rpd rpd-docs" data-rpd-docs="">
            <Allotment proportionalLayout={false}>
                <Allotment.Pane preferredSize={270} minSize={190} maxSize={460} priority={LayoutPriority.Low}>
                    <Tree studio={studio} list={list} error={listError} current={current} readOnly={readOnly} />
                </Allotment.Pane>
                <Allotment.Pane minSize={380} priority={LayoutPriority.High}>
                    {current ? (
                        <Center
                            studio={studio}
                            root={root}
                            dark={dark}
                            readOnly={readOnly}
                            renderer={renderer}
                            save={save}
                            visualFlush={visualFlush}
                            list={list}
                        />
                    ) : (
                        <Empty studio={studio} list={list} readOnly={readOnly} />
                    )}
                </Allotment.Pane>
                <Allotment.Pane preferredSize={520} minSize={280} priority={LayoutPriority.Low}>
                    <PreviewPane studio={studio} root={root} renderer={renderer} />
                </Allotment.Pane>
            </Allotment>
        </div>
    );
}

/* ---------------- Dirty guard + page actions ---------------- */

async function guardedOpen(studio, id) {
    flushDocs(); // pending visual edits count before the dirty check
    const s = store.get();
    if (s.current && s.current.id === id) return;
    if (store.isDirty()) {
        const choice = await ask(studio, {
            type: 'confirm',
            title: 'Unsaved changes',
            message: `Save your changes to "${s.current.title}" first?`,
            buttons: [
                { label: 'Save', value: 'save', primary: true },
                { label: "Don't save", value: 'discard' },
                { label: 'Cancel', value: null },
            ],
        });
        if (choice === null) return;
        if (choice === 'save') {
            try {
                await store.save();
            } catch (error) {
                return;
            }
        }
    }
    await store.open(id, { navigate: false });
}

async function newPage(studio, section) {
    const st = store.get();
    const sections = groupSections(st.list, st.sections).filter((s) => s.id && s.active);
    let sec = section || null;
    if (!sec) {
        const cur = st.current;
        sec = (cur && sections.find((s) => s.id === cur.sectionId)) || sections[0] || null;
    }
    if (!sec) {
        // An empty collection: its first section comes first.
        sec = await newSection(studio);
        if (!sec) return;
    }
    const title = await ask(studio, {
        type: 'prompt',
        title: 'New doc page',
        label: `Title (in ${sec.title})`,
        value: '',
        validate: (v) => (!String(v).trim() ? 'A title is required' : null),
    });
    if (!title) return;
    const sectionSlug = sec.slug;
    const inRepo = st.collection === DEFAULT_COLLECTION;
    const path = await ask(studio, {
        type: 'prompt',
        title: 'New doc page',
        label: inRepo ? 'Path (its URL and its file, docs/guide/<path>.md)' : 'Path (its URL in the collection)',
        value: sectionSlug + '/' + slugify(title),
        validate: (v) =>
            /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/.test(String(v).trim())
                ? store.byPath(String(v).trim())
                    ? 'That path is taken'
                    : null
                : 'Lower-case segments of letters, digits, - and _ (e.g. concepts/my-page)',
    });
    if (!path) return;
    await store.create({
        title: String(title).trim(),
        path: String(path).trim(),
        section: sec.id,
        markdown: '# ' + String(title).trim() + '\n\n',
    });
}

/** A new section row at the end of the collection (one record; no page needed). */
async function newSection(studio) {
    const title = await ask(studio, {
        type: 'prompt',
        title: 'New section',
        label: 'Section title',
        value: '',
        validate: (v) =>
            !String(v).trim()
                ? 'A title is required'
                : (store.get().sections || []).some((s) => s.slug === slugify(v))
                  ? 'A section with that slug exists'
                  : null,
    });
    if (!title) return null;
    return store.createSection({ title: String(title).trim() });
}

/** A new, empty collection (then opened). Portals list it in Portal settings ▸ Docs collections. */
async function newCollection(studio) {
    const title = await ask(studio, {
        type: 'prompt',
        title: 'New docs collection',
        label: 'Title',
        value: '',
        validate: (v) => (!String(v).trim() ? 'A title is required' : null),
    });
    if (!title) return;
    const key = await ask(studio, {
        type: 'prompt',
        title: 'New docs collection',
        label: 'Key (portal settings and URLs use it; fixed once created)',
        value: slugify(title),
        validate: (v) =>
            !/^[a-z0-9][a-z0-9-]*$/.test(String(v).trim())
                ? 'Lower-case letters, digits and dashes'
                : (store.get().collections || []).some((c) => c.key === String(v).trim())
                  ? 'That key is taken'
                  : null,
    });
    if (!key) return;
    const description = await ask(studio, {
        type: 'prompt',
        title: 'New docs collection',
        label: 'Description (shown in the docs switcher; optional)',
        value: '',
    });
    await store.createCollection({
        title: String(title).trim(),
        key: String(key).trim(),
        description: description ? String(description).trim() : '',
        icon: 'book-open',
    });
}

/** Switch collection, asking first when the open page has unsaved changes. */
async function switchCollection(studio, key) {
    flushDocs();
    const s = store.get();
    if (key === s.collection) return;
    if (store.isDirty()) {
        const choice = await ask(studio, {
            type: 'confirm',
            title: 'Unsaved changes',
            message: `Save your changes to "${s.current.title}" first?`,
            buttons: [
                { label: 'Save', value: 'save', primary: true },
                { label: "Don't save", value: 'discard' },
                { label: 'Cancel', value: null },
            ],
        });
        if (choice === null) return;
        if (choice === 'save') {
            try {
                await store.save();
            } catch (error) {
                return;
            }
        }
    }
    await store.setCollection(key);
}

async function toggleActive(studio, page) {
    if (page.active) {
        const ok = await ask(studio, {
            type: 'confirm',
            title: 'Deactivate page',
            message: `Hide "${page.title}" from the docs portal? Nothing is deleted: reactivate it any time. (On the next docs:pull it leaves _nav.json; its .md file stays.)`,
            buttons: [
                { label: 'Deactivate', value: true, primary: true },
                { label: 'Cancel', value: null },
            ],
        });
        if (!ok) return;
    }
    await store.patch(
        page.id,
        { active: !page.active },
        page.active ? `Deactivated ${page.title}` : `Reactivated ${page.title}`
    );
}

/* ---------------- Collection picker ---------------- */

/** Which docs collection the tree edits, a "new collection" action, and where it is shown. */
function CollectionPicker({ studio, readOnly }) {
    const collections = useDocs(store, (s) => s.collections);
    const key = useDocs(store, (s) => s.collection);
    const row = (collections || []).find((c) => c.key === key) || null;
    const portals = (row && row.portals) || [];
    return (
        <div className="rpd-docs-collection" data-rpd-docs-collection={key}>
            <div className="row">
                <Library size={13} aria-hidden="true" />
                <select
                    value={key}
                    onChange={(e) => switchCollection(studio, e.target.value)}
                    disabled={!collections}
                    aria-label="Docs collection"
                    data-rpd-docs-collection-select=""
                >
                    {!collections ? <option value={key}>{key}</option> : null}
                    {(collections || []).map((c) => (
                        <option key={c.key} value={c.key}>
                            {c.title}
                            {c.active ? '' : ' (inactive)'}
                        </option>
                    ))}
                </select>
                <button
                    className="rps-icon-btn"
                    title="New docs collection"
                    onClick={() => newCollection(studio)}
                    disabled={readOnly || !collections}
                    data-rpd-docs-new-collection=""
                >
                    <Plus size={14} />
                </button>
            </div>
            <div className="hint" title={row ? row.description : ''}>
                {row ? (
                    <>
                        <code>{row.key}</code> · {row.pageCount} page{row.pageCount === 1 ? '' : 's'} ·{' '}
                        {portals.length
                            ? 'on ' + portals.map((p) => p.slug + (p.isDefault ? '' : ' (switcher)')).join(', ')
                            : key === DEFAULT_COLLECTION
                              ? 'on docs'
                              : 'not on a portal yet'}
                    </>
                ) : (
                    'Loading collections…'
                )}
            </div>
        </div>
    );
}

/* ---------------- Tree ---------------- */

function Tree({ studio, list, error, current, readOnly }) {
    const filter = useDocs(store, (s) => s.filter);
    const sectionRows = useSectionRows();
    const [showInactive, setShowInactive] = useState(false);
    const [drag, setDrag] = useState(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const sections = useMemo(() => groupSections(list, sectionRows), [list, sectionRows]);
    const q = filter.trim().toLowerCase();
    const match = (p) => !q || (p.title + ' ' + p.path + ' ' + p.tags).toLowerCase().indexOf(q) >= 0;
    // Active sections, empty ones included (a new section is filled from here); legacy groups only with pages.
    const active = sections.filter((s) => s.active && (s.id || s.activeCount));
    const inactiveSections = sections.filter((s) => s.id && !s.active);
    const inactive = (list || []).filter((p) => !p.active);
    const ids = [];
    active.forEach((s) => {
        s.pages.filter((p) => p.active).forEach((p) => ids.push(p.id));
    });

    const onDragEnd = (e) => {
        setDrag(null);
        if (!e.over || e.active.id === e.over.id || readOnly) return;
        const id = e.active.id;
        const overId = String(e.over.id);
        const secs = store.activeSections();
        const from = secs.find((s) => s.pages.indexOf(id) >= 0);
        if (!from) return;
        if (overId.indexOf('sec:') === 0) {
            store.placePage(id, overId.slice(4), 0);
            return;
        }
        const to = secs.find((s) => s.pages.indexOf(overId) >= 0);
        if (!to) return;
        if (to === from) {
            to.pages = arrayMove(to.pages, to.pages.indexOf(id), to.pages.indexOf(overId));
            store.order(secs);
        } else store.placePage(id, to.id, to.pages.indexOf(overId));
    };

    return (
        <div className="rps-sidebar" data-rpd-docs-tree="">
            <div className="rps-sidebar-title">
                Docs
                <span style={{ flex: 1 }} />
                <button
                    className="rps-icon-btn"
                    title="New page"
                    onClick={() => newPage(studio)}
                    disabled={readOnly || !list}
                    data-rpd-docs-new=""
                >
                    <Plus size={14} />
                </button>
                <button
                    className="rps-icon-btn"
                    title="New section"
                    onClick={() => newSection(studio)}
                    disabled={readOnly || !list}
                >
                    <FolderPlus size={14} />
                </button>
                <a
                    className="rps-icon-btn"
                    title="Open the collection in its docs portal"
                    href={portalUrl('index')}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <ExternalLink size={13} />
                </a>
            </div>
            <CollectionPicker studio={studio} readOnly={readOnly} />
            <div className="rpd-docs-filter">
                <input
                    placeholder="Filter pages"
                    value={filter}
                    onChange={(e) => store.set({ filter: e.target.value })}
                    spellCheck={false}
                    data-rpd-docs-filter=""
                />
            </div>
            <div className="rps-tree" role="tree" aria-label="Doc pages">
                {error ? (
                    <div className="rps-empty" style={{ color: 'var(--rps-error)' }}>
                        {String(error.message || error)}
                    </div>
                ) : null}
                {!list && !error ? <div className="rps-empty">Loading…</div> : null}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setDrag(e.active.id)}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => setDrag(null)}
                >
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                        {active.map((s, si) => {
                            const pages = s.pages.filter((p) => p.active && match(p));
                            if (q && !pages.length) return null;
                            return (
                                <React.Fragment key={s.id || s.slug}>
                                    <SectionRow
                                        section={s}
                                        studio={studio}
                                        first={si === 0}
                                        last={si === active.length - 1}
                                        readOnly={readOnly}
                                    />
                                    {pages.map((p, i) => (
                                        <PageRow
                                            key={p.id}
                                            page={p}
                                            studio={studio}
                                            selected={!!current && current.id === p.id}
                                            first={i === 0}
                                            last={i === pages.length - 1}
                                            readOnly={readOnly || !!q}
                                        />
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                        {drag ? (
                            <div className="rpd-drag-chip">{((list || []).find((p) => p.id === drag) || {}).title}</div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
                {inactive.length || inactiveSections.length ? (
                    <>
                        <div
                            className="rpd-docs-sec"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowInactive((v) => !v)}
                            data-rpd-docs-inactive-toggle=""
                        >
                            {showInactive ? (
                                <ChevronDown size={12} />
                            ) : (
                                <ChevronUp size={12} style={{ transform: 'rotate(90deg)' }} />
                            )}
                            <span className="label">Deactivated ({inactive.length + inactiveSections.length})</span>
                        </div>
                        {showInactive
                            ? inactiveSections.map((s) => (
                                  <SectionRow key={s.id} section={s} studio={studio} readOnly={readOnly} inactive />
                              ))
                            : null}
                        {showInactive
                            ? inactive
                                  .filter(match)
                                  .map((p) => (
                                      <PageRow
                                          key={p.id}
                                          page={p}
                                          studio={studio}
                                          selected={!!current && current.id === p.id}
                                          readOnly={readOnly}
                                          inactive
                                      />
                                  ))
                            : null}
                    </>
                ) : null}
            </div>
            <div className="rpd-hint" style={{ padding: '4px 12px 6px' }}>
                Drag pages to reorder or move them between sections (or use the arrows). Moves and section edits save at
                once; content saves with Ctrl+S.
            </div>
        </div>
    );
}

function SectionRow({ section, studio, first, last, readOnly, inactive }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'sec:' + (section.id || section.slug),
        disabled: readOnly || !section.id || inactive,
    });
    const rename = async (e) => {
        e.stopPropagation();
        const title = await ask(studio, {
            type: 'prompt',
            title: 'Rename section',
            label: 'Section title (the slug stays ' + section.slug + ')',
            value: section.title,
            validate: (v) => (!String(v).trim() ? 'A title is required' : null),
        });
        if (title) store.renameSection(section.id, String(title).trim());
    };
    const toggle = async (e) => {
        e.stopPropagation();
        if (section.active) {
            const ok = await ask(studio, {
                type: 'confirm',
                title: 'Deactivate section',
                message: `Hide the section "${section.title}" and its ${section.activeCount} page(s) from the docs portal? Nothing is deleted: reactivate it any time.`,
                buttons: [
                    { label: 'Deactivate', value: true, primary: true },
                    { label: 'Cancel', value: null },
                ],
            });
            if (!ok) return;
        }
        store.updateSection(
            section.id,
            { active: !section.active },
            section.active ? `Deactivated section ${section.title}` : `Reactivated section ${section.title}`
        );
    };
    if (inactive)
        return (
            <div className="rps-row rpd-docs-row inactive" data-rpd-docs-section={section.slug}>
                <Library size={14} />
                <span className="label">
                    {section.title} <span style={{ color: 'var(--rps-muted)' }}>(section)</span>
                </span>
                {!readOnly ? (
                    <span className="actions" onClick={(e) => e.stopPropagation()}>
                        <button className="rps-icon-btn" title="Reactivate section" onClick={toggle}>
                            <Eye size={12} />
                        </button>
                    </span>
                ) : null}
            </div>
        );
    return (
        <div ref={setNodeRef} className={'rpd-docs-sec' + (isOver ? ' drop' : '')} data-rpd-docs-section={section.slug}>
            <span className="label" title={section.slug}>
                {section.title}
            </span>
            {section.origin === 'studio' ? (
                <span className="rpd-docs-badge studio" title="Section created in Studio, not in the repo yet">
                    new
                </span>
            ) : section.studioEdited ? (
                <span
                    className="rpd-docs-badge edited"
                    title="Section edited in Studio since the last seed (npm run docs:pull writes it back to _nav.json)"
                >
                    edited
                </span>
            ) : null}
            {!readOnly && section.id ? (
                <span className="actions">
                    <button
                        className="rps-icon-btn"
                        title="New page in this section"
                        onClick={() => newPage(studio, section)}
                    >
                        <Plus size={12} />
                    </button>
                    <button className="rps-icon-btn" title="Rename section" onClick={rename}>
                        <Pencil size={11} />
                    </button>
                    <button
                        className="rps-icon-btn"
                        title="Move section up"
                        disabled={first}
                        onClick={() => store.moveSection(section.id, -1)}
                    >
                        <ChevronUp size={12} />
                    </button>
                    <button
                        className="rps-icon-btn"
                        title="Move section down"
                        disabled={last}
                        onClick={() => store.moveSection(section.id, 1)}
                    >
                        <ChevronDown size={12} />
                    </button>
                    <button
                        className="rps-icon-btn"
                        title="Deactivate section (hide it and its pages; nothing is deleted)"
                        onClick={toggle}
                    >
                        <EyeOff size={12} />
                    </button>
                </span>
            ) : null}
        </div>
    );
}

function PageRow({ page, studio, selected, first, last, readOnly, inactive }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: page.id,
        disabled: readOnly || inactive,
    });
    const dirty = useDocs(store, (s) => !!(s.current && s.current.id === page.id && store.isDirty()));
    const style = inactive
        ? undefined
        : { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    return (
        <div
            ref={inactive ? undefined : setNodeRef}
            style={style}
            role="treeitem"
            aria-selected={selected}
            className={'rps-row rpd-docs-row' + (selected ? ' selected focused' : '') + (inactive ? ' inactive' : '')}
            onClick={() => guardedOpen(studio, page.id)}
            title={page.path}
            data-rpd-docs-page={page.path}
        >
            {!inactive && !readOnly ? (
                <span
                    className="handle"
                    {...attributes}
                    {...listeners}
                    aria-label={'Move ' + page.title}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={12} />
                </span>
            ) : null}
            {page.icon ? <Icon name={page.icon} size={14} /> : <FileText size={14} />}
            <span className="label">{page.title}</span>
            {page.origin === 'studio' ? (
                <span
                    className="rpd-docs-badge studio"
                    title="Created in Studio, not in the repo yet (npm run docs:pull)"
                >
                    new
                </span>
            ) : page.studioEdited ? (
                <span
                    className="rpd-docs-badge edited"
                    title="Edited in Studio since the last seed (npm run docs:pull writes it back to docs/guide)"
                >
                    edited
                </span>
            ) : null}
            {dirty ? <span className="dirty" title="Unsaved changes" /> : null}
            {!readOnly ? (
                <span className="actions" onClick={(e) => e.stopPropagation()}>
                    {!inactive ? (
                        <>
                            <button
                                className="rps-icon-btn"
                                title="Move up"
                                disabled={first}
                                onClick={() => store.movePage(page.id, -1)}
                            >
                                <ChevronUp size={12} />
                            </button>
                            <button
                                className="rps-icon-btn"
                                title="Move down"
                                disabled={last}
                                onClick={() => store.movePage(page.id, 1)}
                            >
                                <ChevronDown size={12} />
                            </button>
                        </>
                    ) : null}
                    <button
                        className="rps-icon-btn"
                        title={page.active ? 'Deactivate (hide from the portal; nothing is deleted)' : 'Reactivate'}
                        onClick={() => toggleActive(studio, page)}
                        data-rpd-docs-toggle={page.path}
                    >
                        {page.active ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                </span>
            ) : null}
        </div>
    );
}

function Empty({ studio, list, readOnly }) {
    return (
        <div className="rpd-docs-empty" data-rpd-docs-empty="">
            <BookOpen size={52} strokeWidth={1} color="var(--rps-accent)" />
            <h2>Docs</h2>
            <div>Pick a page on the left to edit it, or create one.</div>
            <div style={{ maxWidth: 440, fontSize: 12 }}>
                {useDocs(store, (s) => s.collection) === DEFAULT_COLLECTION ? (
                    <>
                        The repo's docs/guide stays the source of truth for this collection: the seed keeps pages you
                        edit here, and <code>npm run docs:pull</code> writes them back so they can be committed.
                    </>
                ) : (
                    'This collection lives on the instance only (the seed never touches it). A portal shows it once Portal settings ▸ Docs collections lists it.'
                )}
            </div>
            {!readOnly && list ? (
                <button className="rps-btn rps-btn-icon" onClick={() => newPage(studio)}>
                    <Plus size={13} /> New page
                </button>
            ) : null}
        </div>
    );
}

/* ---------------- Center: frontmatter, editor, problems ---------------- */

function Center({ studio, root, dark, readOnly, renderer, save, visualFlush, list }) {
    const current = useDocs(store, (s) => s.current);
    const draft = useDocs(store, (s) => s.draft);
    const sectionRows = useSectionRows();
    const mode = useDocs(store, (s) => s.mode);
    const saving = useDocs(store, (s) => s.saving);
    const dirty = useDocs(store, () => store.isDirty());
    const [visualKey, setVisualKey] = useState(0);
    const loadSeq = useDocs(store, (s) => s.loadSeq);
    const [visualWarnings, setVisualWarnings] = useState([]);
    const [visualInfo, setVisualInfo] = useState(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const mdApi = useRef(null);
    const [vApi, setVApi] = useState(null);
    const [, setTick] = useState(0);

    // A new page, a reload or a revert (loadSeq) remounts the editors from the loaded markdown.
    useEffect(() => {
        setVisualWarnings([]);
        setVisualInfo(null);
    }, [loadSeq]);

    const pagesByPath = useMemo(() => {
        const m = {};
        (list || []).forEach((p) => (m[p.path] = { active: p.active, headings: p.headings }));
        return m;
    }, [list]);
    const markdown = draft ? draft.markdown : '';
    const problems = useMemo(
        () => (current ? brokenLinks(markdown, current.path, pagesByPath) : []),
        [markdown, current && current.path, pagesByPath]
    );

    if (!current || !draft) return null;
    const sections = groupSections(list, sectionRows).filter((s) => s.id && (s.active || s.id === current.sectionId));
    const pathEditable = current.origin === 'studio' && !readOnly;

    const setMode = (next) => {
        if (next === mode) return;
        if (next === 'visual') setVisualKey((k) => k + 1);
        store.set({ mode: next });
        rememberMode(next);
    };

    const insertLink = (href, text) => {
        setLinkOpen(false);
        if (!href) return;
        if (mode === 'visual' && vApi) vApi.link(href, text);
        else if (mdApi.current) {
            const sel = mdApi.current.selectedText();
            mdApi.current.insert('[' + (sel || text || href) + '](' + href + ')');
        }
    };

    const moveSection = async (sectionId) => {
        if (sectionId === '__new') {
            const sec = await newSection(studio);
            if (sec) await store.patch(current.id, { section: sec.id }, 'Moved to ' + sec.title);
            return;
        }
        const s = sections.find((x) => x.id === sectionId);
        if (s && sectionId !== current.sectionId)
            await store.patch(current.id, { section: s.id }, 'Moved to ' + s.title);
    };

    return (
        <div className="rpd-docs-center" data-rpd-docs-center="">
            <div className="rpd-docs-head">
                {current.icon ? <Icon name={current.icon} size={16} /> : <FileText size={16} />}
                <span className="title">{draft.title || 'Untitled'}</span>
                <span className="path">{current.path}</span>
                {!current.active ? <span className="rpd-docs-badge">deactivated</span> : null}
                {current.origin === 'studio' ? (
                    <span className="rpd-docs-badge studio" title="Created in Studio, not in the repo yet">
                        new in Studio
                    </span>
                ) : current.studioEdited ? (
                    <span
                        className="rpd-docs-badge edited"
                        title="Edited in Studio since the last seed: npm run docs:pull writes it back to docs/guide"
                    >
                        edited in Studio
                    </span>
                ) : null}
                <span style={{ flex: 1 }} />
                <div className="rpd-docs-modes" role="group" aria-label="Editor mode">
                    <button
                        aria-pressed={mode === 'markdown'}
                        onClick={() => setMode('markdown')}
                        data-rpd-docs-mode="markdown"
                    >
                        Markdown
                    </button>
                    <button
                        aria-pressed={mode === 'visual'}
                        onClick={() => setMode('visual')}
                        disabled={renderer.status !== 'ready'}
                        title={renderer.status === 'error' ? renderer.message : 'Visual editor'}
                        data-rpd-docs-mode="visual"
                    >
                        Visual
                    </button>
                </div>
                <button
                    className="rps-icon-btn"
                    title="Revert unsaved changes"
                    disabled={!dirty || saving}
                    onClick={() => store.revert()}
                >
                    <RotateCcw size={14} />
                </button>
                <button
                    className="rps-btn rps-btn-icon"
                    onClick={save}
                    disabled={!dirty || saving || readOnly}
                    title="Save (Ctrl+S)"
                    data-rpd-docs-save=""
                >
                    <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                    {/* The title bar's Save treatment (chrome.js): a white dot on the accent button. */}
                    {dirty ? (
                        <span
                            className="rps-dirty-dot"
                            style={{ background: '#fff' }}
                            title="Unsaved changes"
                            data-rpd-docs-dirty=""
                        />
                    ) : null}
                </button>
            </div>
            <details className="rpd-docs-meta" open data-rpd-docs-meta="">
                <summary>Page</summary>
                <div className="rpd-docs-meta-grid">
                    <label className="rpd-field">
                        <span className="rpd-label">Title</span>
                        <input
                            value={draft.title}
                            onChange={(e) => store.setDraft({ title: e.target.value })}
                            disabled={readOnly}
                            data-rpd-docs-field="title"
                        />
                    </label>
                    <label className="rpd-field">
                        <span className="rpd-label">Section</span>
                        <select
                            value={current.sectionId}
                            onChange={(e) => moveSection(e.target.value)}
                            disabled={readOnly}
                            data-rpd-docs-field="section"
                        >
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.title}
                                </option>
                            ))}
                            <option value="__new">New section…</option>
                        </select>
                    </label>
                    <label className="rpd-field">
                        <span className="rpd-label">Tags (comma-separated)</span>
                        <input
                            value={draft.tags}
                            onChange={(e) => store.setDraft({ tags: e.target.value })}
                            disabled={readOnly}
                            spellCheck={false}
                            data-rpd-docs-field="tags"
                        />
                    </label>
                    <label className="rpd-field">
                        <span className="rpd-label">Path {pathEditable ? '' : '(fixed once in the repo)'}</span>
                        <PathField current={current} editable={pathEditable} />
                    </label>
                    <label className="rpd-field wide">
                        <span className="rpd-label">Description (shown under the title and in search)</span>
                        <input
                            value={draft.description}
                            onChange={(e) => store.setDraft({ description: e.target.value })}
                            disabled={readOnly}
                            data-rpd-docs-field="description"
                        />
                    </label>
                    <div className="rpd-field">
                        <span className="rpd-label">Sidebar icon</span>
                        <IconPicker
                            value={draft.icon}
                            onPick={(name) => store.setDraft({ icon: name || '' })}
                            disabled={readOnly}
                        />
                    </div>
                </div>
            </details>
            {mode === 'markdown' ? (
                <MarkdownToolbar api={mdApi} onLink={() => setLinkOpen(true)} studio={studio} readOnly={readOnly} />
            ) : (
                <VisualToolbar api={vApi} onLink={() => setLinkOpen(true)} studio={studio} readOnly={readOnly} />
            )}
            <div className="rpd-docs-editor">
                {mode === 'markdown' ? (
                    <MarkdownEditor
                        key={'md:' + loadSeq}
                        value={markdown}
                        onChange={(md) => store.setDraft({ markdown: md })}
                        dark={dark}
                        root={root}
                        readOnly={readOnly}
                        problems={problems}
                        onReady={(api) => (mdApi.current = api)}
                        onLink={() => setLinkOpen(true)}
                    />
                ) : renderer.status === 'ready' ? (
                    <VisualEditor
                        key={'v:' + loadSeq + ':' + visualKey}
                        markdown={markdown}
                        lex={renderer.lex}
                        root={root}
                        readOnly={readOnly}
                        onMarkdown={(md, warnings) => {
                            // Only for the load this editor was built from: an editor unmounting after a page
                            // switch, reload or revert must not write its markdown into the new draft.
                            if (store.get().loadSeq !== loadSeq || !store.get().draft) return;
                            if (md !== store.get().draft.markdown) store.setDraft({ markdown: md });
                            setVisualWarnings(warnings || []);
                        }}
                        onInfo={setVisualInfo}
                        onReady={(api, selection) => {
                            visualFlush.current = api ? () => api.editor.__rpFlush && api.editor.__rpFlush() : null;
                            if (selection) setTick((t) => t + 1);
                            else setVApi(api);
                        }}
                        onLink={() => setLinkOpen(true)}
                    />
                ) : (
                    <div className="rps-preview-msg">
                        {renderer.status === 'error' ? renderer.message : 'Loading the docs renderer…'}
                    </div>
                )}
                {linkOpen ? (
                    <LinkPicker
                        list={list}
                        current={current}
                        markdown={markdown}
                        onPick={insertLink}
                        onClose={() => setLinkOpen(false)}
                    />
                ) : null}
            </div>
            <Problems
                problems={problems}
                visualWarnings={mode === 'visual' ? visualWarnings : []}
                visualInfo={mode === 'visual' ? visualInfo : null}
                onReveal={(line) => {
                    if (mode !== 'markdown') store.set({ mode: 'markdown' });
                    setTimeout(() => mdApi.current && mdApi.current.reveal(line), 50);
                }}
            />
        </div>
    );
}

/** Path: editable (saved on blur / Enter) only for pages created in Studio and not yet pulled. */
function PathField({ current, editable }) {
    const [value, setValue] = useState(current.path);
    useEffect(() => setValue(current.path), [current.path]);
    const commit = () => {
        const next = String(value || '')
            .trim()
            .replace(/^\/+|\/+$/g, '')
            .replace(/\.md$/, '');
        if (!next || next === current.path) return setValue(current.path);
        store
            .patch(current.id, { path: next }, 'Path changed to ' + next)
            .then((doc) => !doc && setValue(current.path));
    };
    return (
        <input
            value={value}
            readOnly={!editable}
            disabled={!editable}
            className="rpd-mono"
            title={current.sourcePath}
            spellCheck={false}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') setValue(current.path);
            }}
            data-rpd-docs-field="path"
        />
    );
}

/* ---------------- Toolbars ---------------- */

function Btn({ title, onClick, children, pressed, disabled, name }) {
    return (
        <button
            type="button"
            className="rps-icon-btn"
            title={title}
            aria-label={title}
            aria-pressed={pressed === undefined ? undefined : !!pressed}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            data-rpd-docs-tool={name}
        >
            {children}
        </button>
    );
}

const TABLE_SNIPPET = '| Column | Column |\n| --- | --- |\n| Cell | Cell |';

function MarkdownToolbar({ api, onLink, studio, readOnly }) {
    const a = () => api.current;
    const run = (fn) => () => a() && fn(a());
    const image = async () => {
        const src = await ask(studio, { type: 'prompt', title: 'Insert image', label: 'Image URL', value: 'https://' });
        if (src && a()) a().insert('![' + (a().selectedText() || 'Image') + '](' + src + ')');
    };
    return (
        <div
            className="rpd-docs-toolbar"
            role="toolbar"
            aria-label="Markdown formatting"
            data-rpd-docs-toolbar="markdown"
        >
            <Btn title="Bold (Ctrl+B)" name="bold" disabled={readOnly} onClick={run((x) => x.wrap('**', '**', 'bold'))}>
                <Bold size={14} />
            </Btn>
            <Btn
                title="Italic (Ctrl+I)"
                name="italic"
                disabled={readOnly}
                onClick={run((x) => x.wrap('*', '*', 'italic'))}
            >
                <Italic size={14} />
            </Btn>
            <Btn
                title="Strikethrough"
                name="strike"
                disabled={readOnly}
                onClick={run((x) => x.wrap('~~', '~~', 'text'))}
            >
                <Strikethrough size={14} />
            </Btn>
            <Btn
                title="Inline code (Ctrl+E)"
                name="code"
                disabled={readOnly}
                onClick={run((x) => x.wrap('`', '`', 'code'))}
            >
                <Code size={14} />
            </Btn>
            <Btn title="Link to a page or URL (Ctrl+K)" name="link" disabled={readOnly} onClick={onLink}>
                <Link size={14} />
            </Btn>
            <span className="sep" />
            <Btn
                title="Heading 2"
                name="h2"
                disabled={readOnly}
                onClick={run((x) => x.prefixLines('## ', /^#{1,6}\s+/))}
            >
                <Heading2 size={14} />
            </Btn>
            <Btn
                title="Heading 3"
                name="h3"
                disabled={readOnly}
                onClick={run((x) => x.prefixLines('### ', /^#{1,6}\s+/))}
            >
                <Heading3 size={14} />
            </Btn>
            <Btn
                title="Bulleted list"
                name="ul"
                disabled={readOnly}
                onClick={run((x) => x.prefixLines('- ', /^\s*[-*+]\s+/))}
            >
                <List size={14} />
            </Btn>
            <Btn
                title="Numbered list"
                name="ol"
                disabled={readOnly}
                onClick={run((x) => x.prefixLines('1. ', /^\s*\d+[.)]\s+/))}
            >
                <ListOrdered size={14} />
            </Btn>
            <Btn title="Quote" name="quote" disabled={readOnly} onClick={run((x) => x.prefixLines('> ', /^>\s?/))}>
                <Quote size={14} />
            </Btn>
            <Btn
                title="Callout (> **Note:**)"
                name="callout"
                disabled={readOnly}
                onClick={run((x) => x.insertBlock('> **Note:** ', 12))}
            >
                <MessageSquareWarning size={14} />
            </Btn>
            <Btn
                title="Code block"
                name="codeblock"
                disabled={readOnly}
                onClick={run((x) => x.insertBlock('```ts\n\n```', 6))}
            >
                <SquareCode size={14} />
            </Btn>
            <Btn title="Table" name="table" disabled={readOnly} onClick={run((x) => x.insertBlock(TABLE_SNIPPET, 2))}>
                <Table size={14} />
            </Btn>
            <Btn title="Image by URL" name="image" disabled={readOnly} onClick={image}>
                <Image size={14} />
            </Btn>
            <Btn title="Divider" name="hr" disabled={readOnly} onClick={run((x) => x.insertBlock('---'))}>
                <Minus size={14} />
            </Btn>
        </div>
    );
}

function VisualToolbar({ api, onLink, studio, readOnly }) {
    if (!api) return <div className="rpd-docs-toolbar" />;
    const on = (n, at) => api.isActive(n, at);
    const inCode = on('codeBlock');
    const inCallout = on('callout');
    const inTable = on('table');
    const image = async () => {
        const src = await ask(studio, { type: 'prompt', title: 'Insert image', label: 'Image URL', value: 'https://' });
        if (src) api.image(src, '');
    };
    const dis = readOnly;
    return (
        <div className="rpd-docs-toolbar" role="toolbar" aria-label="Formatting" data-rpd-docs-toolbar="visual">
            <Btn title="Undo (Ctrl+Z)" name="undo" disabled={dis} onClick={api.undo}>
                <Undo2 size={14} />
            </Btn>
            <Btn title="Redo (Ctrl+Shift+Z)" name="redo" disabled={dis} onClick={api.redo}>
                <Redo2 size={14} />
            </Btn>
            <span className="sep" />
            <Btn
                title="Paragraph"
                name="p"
                pressed={on('paragraph') && !inCallout}
                disabled={dis}
                onClick={() => api.heading(0)}
            >
                <Pilcrow size={14} />
            </Btn>
            <Btn
                title="Heading 1"
                name="h1"
                pressed={on('heading', { level: 1 })}
                disabled={dis}
                onClick={() => api.heading(1)}
            >
                <Heading1 size={14} />
            </Btn>
            <Btn
                title="Heading 2"
                name="h2"
                pressed={on('heading', { level: 2 })}
                disabled={dis}
                onClick={() => api.heading(2)}
            >
                <Heading2 size={14} />
            </Btn>
            <Btn
                title="Heading 3"
                name="h3"
                pressed={on('heading', { level: 3 })}
                disabled={dis}
                onClick={() => api.heading(3)}
            >
                <Heading3 size={14} />
            </Btn>
            <span className="sep" />
            <Btn title="Bold (Ctrl+B)" name="bold" pressed={on('bold')} disabled={dis} onClick={api.bold}>
                <Bold size={14} />
            </Btn>
            <Btn title="Italic (Ctrl+I)" name="italic" pressed={on('italic')} disabled={dis} onClick={api.italic}>
                <Italic size={14} />
            </Btn>
            <Btn title="Strikethrough" name="strike" pressed={on('strike')} disabled={dis} onClick={api.strike}>
                <Strikethrough size={14} />
            </Btn>
            <Btn title="Inline code (Ctrl+E)" name="code" pressed={on('code')} disabled={dis} onClick={api.code}>
                <Code size={14} />
            </Btn>
            <Btn title="Link (Ctrl+K)" name="link" pressed={on('link')} disabled={dis} onClick={onLink}>
                <Link size={14} />
            </Btn>
            <span className="sep" />
            <Btn title="Bulleted list" name="ul" pressed={on('bulletList')} disabled={dis} onClick={api.bulletList}>
                <List size={14} />
            </Btn>
            <Btn title="Numbered list" name="ol" pressed={on('orderedList')} disabled={dis} onClick={api.orderedList}>
                <ListOrdered size={14} />
            </Btn>
            <Btn title="Quote" name="quote" pressed={on('blockquote')} disabled={dis} onClick={api.blockquote}>
                <Quote size={14} />
            </Btn>
            <Btn
                title="Callout"
                name="callout"
                pressed={inCallout}
                disabled={dis}
                onClick={() => api.callout('note', 'Note')}
            >
                <MessageSquareWarning size={14} />
            </Btn>
            <Btn
                title="Code block"
                name="codeblock"
                pressed={inCode}
                disabled={dis}
                onClick={() => api.codeBlock('ts')}
            >
                <SquareCode size={14} />
            </Btn>
            <Btn title="Table" name="table" disabled={dis || inTable} onClick={api.table}>
                <Table size={14} />
            </Btn>
            <Btn title="Image by URL" name="image" disabled={dis} onClick={image}>
                <Image size={14} />
            </Btn>
            <Btn title="Divider" name="hr" disabled={dis} onClick={api.hr}>
                <Minus size={14} />
            </Btn>
            {inCode ? (
                <span className="ctx">
                    Language
                    <input
                        style={{ width: 90 }}
                        defaultValue={api.attrs('codeBlock').language || ''}
                        key={'lang:' + (api.attrs('codeBlock').language || '')}
                        onBlur={(e) => api.setCodeLanguage(e.target.value.trim())}
                        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                        spellCheck={false}
                        data-rpd-docs-code-lang=""
                    />
                </span>
            ) : null}
            {inCallout ? (
                <span className="ctx">
                    Callout
                    <select
                        value={api.attrs('callout').label || 'Note'}
                        onChange={(e) => api.setCallout(e.target.value.toLowerCase(), e.target.value)}
                        data-rpd-docs-callout-kind=""
                    >
                        {CALLOUT_CHOICES.filter((c) => CALLOUT_KINDS[c.toLowerCase()]).map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </span>
            ) : null}
            {inTable ? (
                <span className="ctx">
                    Table
                    <Btn title="Add row below" name="row+" onClick={api.addRow}>
                        <BetweenHorizontalEnd size={14} />
                    </Btn>
                    <Btn title="Add column right" name="col+" onClick={api.addColumn}>
                        <BetweenVerticalEnd size={14} />
                    </Btn>
                    <select
                        value={api.attrs('tableCell').align || api.attrs('tableHeader').align || ''}
                        onChange={(e) => api.setAlign(e.target.value)}
                        title="Column alignment (this cell)"
                    >
                        <option value="">Align: none</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                    </select>
                    <button
                        type="button"
                        className="rps-tbtn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={api.deleteRow}
                    >
                        − row
                    </button>
                    <button
                        type="button"
                        className="rps-tbtn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={api.deleteColumn}
                    >
                        − col
                    </button>
                    <Btn title="Delete table" name="table-" onClick={api.deleteTable}>
                        <Trash2 size={13} />
                    </Btn>
                </span>
            ) : null}
        </div>
    );
}

/* ---------------- Problems ---------------- */

function Problems({ problems, visualWarnings, visualInfo, onReveal }) {
    const items = [];
    problems.forEach((p) =>
        items.push({
            kind: p.severity === 'error' ? 'err' : 'warn',
            where: 'line ' + p.line,
            text: p.message,
            line: p.line,
        })
    );
    visualWarnings.forEach((w) => items.push({ kind: 'warn', where: 'visual', text: w.message }));
    if (visualInfo && visualInfo.rawCount)
        items.push({
            kind: 'info',
            where: 'visual',
            text: `${visualInfo.rawCount} block${visualInfo.rawCount > 1 ? 's are' : ' is'} kept as Markdown source (${Array.from(new Set(visualInfo.reasons.map((r) => r.reason))).join(', ')}); edit them in place, they're never converted.`,
        });
    if (!items.length) return null;
    return (
        <div className="rpd-docs-problems" role="list" aria-label="Problems" data-rpd-docs-problems="">
            {items.map((it, i) => (
                <div key={i} className="item" role="listitem" onClick={() => it.line && onReveal(it.line)}>
                    <span className={it.kind}>{it.kind === 'err' ? '●' : it.kind === 'warn' ? '▲' : 'ℹ'}</span>
                    <span className="where">{it.where}</span>
                    <span>{it.text}</span>
                </div>
            ))}
        </div>
    );
}

/* ---------------- Link picker ---------------- */

function LinkPicker({ list, current, markdown, onPick, onClose }) {
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);
    const options = useMemo(() => {
        const out = [];
        const term = q.trim().toLowerCase();
        if (/^(https?:|mailto:|\/|#)/i.test(q.trim()))
            out.push({ key: 'url', label: 'Link to ' + q.trim(), href: q.trim(), text: '' });
        const own = headingsOf(markdown).filter((h) => h.depth >= 2 && h.depth <= 4);
        own.forEach((h) => {
            if (!term || h.text.toLowerCase().indexOf(term) >= 0)
                out.push({
                    key: 'own:' + h.slug,
                    label: h.text,
                    sub: 'this page',
                    heading: true,
                    hash: '#' + h.slug,
                    href: '#' + h.slug,
                    text: h.text,
                });
        });
        (list || [])
            .filter((p) => p.active && p.id !== current.id)
            .forEach((p) => {
                const pageHit = !term || (p.title + ' ' + p.path + ' ' + p.section).toLowerCase().indexOf(term) >= 0;
                const heads = (p.headings || []).filter(
                    (h) => h.depth <= 3 && (!term || pageHit || h.text.toLowerCase().indexOf(term) >= 0)
                );
                if (pageHit || heads.length)
                    out.push({
                        key: p.id,
                        label: p.title,
                        sub: p.section,
                        href: relativeDocLink(current.path, p.path),
                        text: p.title,
                    });
                if (term)
                    heads.forEach((h) => {
                        if (pageHit && h.text.toLowerCase().indexOf(term) < 0) return;
                        out.push({
                            key: p.id + '#' + h.slug,
                            label: h.text,
                            sub: p.title,
                            heading: true,
                            hash: '#' + h.slug,
                            href: relativeDocLink(current.path, p.path, h.slug),
                            text: h.text,
                        });
                    });
            });
        return out.slice(0, 200);
    }, [q, list, current, markdown]);
    const pick = (o) => o && onPick(o.href, o.text);
    return (
        <div className="rps-pop rpd-docs-link-pop" role="dialog" aria-label="Insert link" data-rpd-docs-link-picker="">
            <input
                ref={inputRef}
                className="rps-search"
                placeholder="Search pages and headings, or paste a URL"
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        onClose();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActive((i) => Math.min(options.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((i) => Math.max(0, i - 1));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        pick(options[active]);
                    }
                }}
                spellCheck={false}
                data-rpd-docs-link-search=""
            />
            <div className="rps-list" role="listbox">
                {options.map((o, i) => (
                    <div
                        key={o.key}
                        role="option"
                        aria-selected={i === active}
                        className={'rps-option' + (i === active ? ' active' : '')}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(o)}
                        data-rpd-docs-link-option={o.href}
                    >
                        <span className={o.heading ? 'heading' : ''}>{o.label}</span>
                        {o.hash ? <span className="hash">{o.hash}</span> : <span className="sub">{o.sub}</span>}
                    </div>
                ))}
                {!options.length ? <div className="rps-empty">No page or heading matches.</div> : null}
            </div>
            <div className="tip">
                Inserts a relative .md link (e.g. ../concepts/layouts.md#regions), which the docs portal resolves. Esc
                closes.
            </div>
        </div>
    );
}

/* ---------------- Preview pane ---------------- */

function PreviewPane({ studio, root, renderer }) {
    const current = useDocs(store, (s) => s.current);
    const draft = useDocs(store, (s) => s.draft);
    const anchor = useDocs(store, (s) => s.anchor);
    return (
        <div className="rpd-center" data-rpd-docs-preview-pane="">
            <div className="rps-preview-bar rpd-docs-preview-bar">
                <span>Preview</span>
                <span style={{ color: 'var(--rps-muted)' }}>
                    {renderer.status === 'ready'
                        ? 'components:app/docs-content, live'
                        : renderer.status === 'error'
                          ? ''
                          : 'loading the renderer…'}
                </span>
                <span style={{ flex: 1 }} />
                {current ? (
                    <a
                        className="rps-tbtn"
                        href={portalUrl(current.path, current.collection)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open the saved page in the docs portal"
                        data-rpd-docs-open-portal=""
                    >
                        <ExternalLink size={12} /> Open in portal
                    </a>
                ) : null}
            </div>
            {renderer.status === 'error' ? (
                <div className="rps-preview-msg" style={{ color: 'var(--rps-error)' }}>
                    {renderer.message}
                </div>
            ) : null}
            {renderer.status === 'ready' && current && draft ? (
                <div style={{ flex: 1, minHeight: 0 }}>
                    <DocsPreview
                        renderer={renderer}
                        markdown={draft.markdown}
                        title={draft.title}
                        description={draft.description}
                        path={current.path}
                        anchor={anchor}
                        studio={studio}
                        root={root}
                    />
                </div>
            ) : null}
            {renderer.status === 'ready' && !current ? (
                <div className="rps-preview-msg">Open a page to preview it.</div>
            ) : null}
        </div>
    );
}
