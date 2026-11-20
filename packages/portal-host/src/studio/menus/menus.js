// Studio "Menus" activity: build a portal's menus while seeing them render.
//   left    the portal's menus (+ New menu)
//   centre  a live preview: the portal's real header / sidebar / footer widgets and theme,
//           rendered by the host runtime (PortalPreview) with this menu injected; Sidebar
//           (expanded / icon rail), Header (groups as dropdowns) or Footer; "View as" a role;
//           clicking an item in the preview selects it
//   right   the item tree (dnd-kit: drag to reorder and to nest into groups; keyboard too) with
//           quick-add, and the selected item's form (or the menu's settings)
// Every edit saves immediately (the server validates); Ctrl+Z / Ctrl+Shift+Z undo and redo.
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Allotment, LayoutPriority } from 'allotment';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
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
    ArrowDown,
    ArrowLeftToLine,
    ArrowRightToLine,
    ArrowUp,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    FileText,
    Folder,
    GripVertical,
    Link2,
    ListPlus,
    Loader2,
    Lock,
    Menu as MenuIcon,
    Minus,
    PanelBottom,
    PanelLeft,
    PanelLeftClose,
    PanelTop,
    Plus,
    Redo2,
    RefreshCw,
    Trash2,
    Undo2,
    Code2,
} from 'lucide-react';
import { Icon } from '#/components/ui/icon';
import { useHostTextStyle } from '../host-text';
import { ask } from '../dialogs';
import { IconPicker } from './icon-picker';
import { ViewAsUserPicker, useViewAsUser, hiddenSets, viewAsUser } from '../view-as-user';
import { findItem } from './menus-store';
import { conditionCount, previewNav, rolesOf } from './preview-nav';
import { useScope } from '../scope';

export function useMenus(store) {
    return useSyncExternalStore(store.subscribe, store.get, store.get);
}

const INDENT = 18;
const TYPE_LABEL = {
    page: 'Page',
    route: 'Route',
    url: 'URL',
    group: 'Group',
    separator: 'Separator',
    dynamic: 'Dynamic',
};

function internals() {
    const r = globalThis.__REACT_PORTAL__ || {};
    return {
        ...(r.internals || {}),
        ReactDOMClient: r.modules && r.modules['react-dom/client'],
        React: r.modules && r.modules.react,
    };
}

function samplePath(route) {
    return String(route || '')
        .split('/')
        .map((seg) => (seg.charAt(0) === ':' || seg === '*' ? 'sample' : seg))
        .join('/');
}

/** The menu key a region's widget reads: its options.menu, else its component default, else a guess. */
function regionMenuKeys(design, region) {
    const list = (design && design.portalPlacements && design.portalPlacements[region]) || [];
    const palette = (design && design.palette) || [];
    return list.map((p) => {
        const own = p.options && typeof p.options.menu === 'string' && p.options.menu;
        const comp = palette.find((c) => c.id === (p.component && p.component.id));
        const def =
            comp && comp.defaultOptions && typeof comp.defaultOptions.menu === 'string' && comp.defaultOptions.menu;
        return { placement: p, key: own || def || (region === 'footer' ? 'footer' : 'primary') };
    });
}

/** Default preview for a menu: the region whose widget reads it, else sidebar / header. */
function defaultPreview(design, menu) {
    if (!design || !menu) return 'sidebar';
    const regions = ['sidebar', 'header', 'footer'];
    const hit = regions.find((r) => regionMenuKeys(design, r).some((x) => x.key === menu.key));
    if (hit) return hit;
    if (menu.key === 'account') return 'sidebar';
    return regions.find((r) => regionMenuKeys(design, r).length) || 'sidebar';
}

export default function Menus({ store, studio, root }) {
    const state = useMenus(store);
    const scope = useScope();
    const readOnly = !!(scope.context && scope.context.inScope === false);
    const asUser = useViewAsUser(state.portalId);

    // Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y), Delete, Escape — not while typing in a field.
    const onKeyDown = (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        if (mod && key === 'z' && !e.shiftKey) store.undo();
        else if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) store.redo();
        else if (
            (e.key === 'Delete' || e.key === 'Backspace') &&
            state.selection &&
            !readOnly &&
            e.target &&
            e.target.closest &&
            e.target.closest('[data-rpm-tree]')
        )
            confirmDelete(store, studio, state.selection);
        else if (e.key === 'Escape' && state.selection) store.select(null);
        else return;
        e.preventDefault();
    };

    return (
        <div
            className={'rpd rpm' + (readOnly ? ' rpm-readonly' : '')}
            onKeyDown={onKeyDown}
            tabIndex={-1}
            data-rpm-root=""
        >
            <Allotment proportionalLayout={false}>
                <Allotment.Pane preferredSize={230} minSize={180} maxSize={420} priority={LayoutPriority.Low}>
                    <MenuList store={store} studio={studio} state={state} readOnly={readOnly} />
                </Allotment.Pane>
                <Allotment.Pane minSize={360} priority={LayoutPriority.High}>
                    <div className="rpd-center">
                        <PreviewToolbar store={store} state={state} asUser={asUser} />
                        {state.design && state.menus ? (
                            <PreviewStage store={store} state={state} root={root} asUser={asUser} />
                        ) : (
                            <div className="rps-welcome">
                                {state.loading
                                    ? 'Loading…'
                                    : state.error
                                      ? String(state.error.message || state.error)
                                      : 'Pick a portal on the left.'}
                            </div>
                        )}
                    </div>
                </Allotment.Pane>
                <Allotment.Pane preferredSize={360} minSize={280} maxSize={620} priority={LayoutPriority.Low}>
                    <Allotment vertical>
                        <Allotment.Pane preferredSize={330} minSize={150}>
                            <TreePanel store={store} studio={studio} state={state} readOnly={readOnly} />
                        </Allotment.Pane>
                        <Allotment.Pane minSize={160}>
                            <Inspector store={store} studio={studio} state={state} readOnly={readOnly} />
                        </Allotment.Pane>
                    </Allotment>
                </Allotment.Pane>
            </Allotment>
        </div>
    );
}

async function confirmDelete(store, studio, id) {
    const hit = findItem(store.currentMenu(), id);
    if (!hit) return;
    const item = hit.item;
    const kids = (item.children || []).length;
    if (kids) {
        const mode = await ask(studio, {
            type: 'confirm',
            title: 'Delete group',
            message: `"${item.label}" contains ${kids} item(s). Move them out to where the group is (undoable), or delete everything (can't be undone)?`,
            buttons: [
                { label: 'Move them out', value: 'lift', primary: true },
                { label: 'Delete everything', value: 'cascade' },
                { label: 'Cancel', value: null },
            ],
        });
        if (mode) store.deleteItem(id, mode);
        return;
    }
    store.deleteItem(id);
}

// ---- left: menus -----------------------------------------------------------------------------

function countItems(items) {
    return (items || []).reduce((n, it) => n + 1 + countItems(it.children), 0);
}

function MenuList({ store, studio, state, readOnly }) {
    const design = state.design;
    const newMenu = async () => {
        const name = await ask(studio, {
            type: 'prompt',
            title: 'New menu',
            label: 'Name (e.g. Footer, Account, Help)',
            value: '',
            okLabel: 'Next',
            validate: (v) => (!v.trim() ? 'Enter a name' : null),
        });
        if (!name) return;
        const slug = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const taken = (state.menus || []).map((m) => m.key);
        const key = await ask(studio, {
            type: 'prompt',
            title: 'New menu',
            label: 'Key (widgets read menus by key: primary, footer, account…)',
            value: slug,
            okLabel: 'Create',
            validate: (v) =>
                !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.trim())
                    ? 'Lower-case letters, digits and dashes'
                    : taken.indexOf(v.trim()) >= 0
                      ? 'This portal already has that key'
                      : null,
        });
        if (!key) return;
        store.createMenu({ key: key.trim(), name: name.trim() });
    };
    return (
        <div className="rps-sidebar" data-rpm-menus="">
            <div className="rps-sidebar-title">Menus</div>
            <div className="rpd-pad">
                <select
                    value={state.portalId || ''}
                    onChange={(e) => e.target.value && store.openPortal(e.target.value)}
                    style={{ width: '100%' }}
                    aria-label="Portal"
                    data-rpm-portal-select=""
                >
                    <option value="">{state.portals ? 'Choose a portal…' : 'Loading portals…'}</option>
                    {(state.portals || []).map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.slug})
                        </option>
                    ))}
                </select>
            </div>
            {design && state.menus ? (
                <div className="rps-tree" style={{ flex: 1 }} role="listbox" aria-label="Menus">
                    <div className="rps-section-head" style={{ cursor: 'default' }}>
                        <span style={{ paddingLeft: 6 }}>{design.portal.name}</span>
                        <span className="actions" style={{ display: 'flex', marginLeft: 'auto' }}>
                            <button
                                className="rps-icon-btn"
                                title="New menu"
                                onClick={newMenu}
                                disabled={readOnly}
                                data-rpm-new-menu=""
                            >
                                <Plus size={14} />
                            </button>
                        </span>
                    </div>
                    {state.menus.map((m) => (
                        <div
                            key={m.id}
                            role="option"
                            aria-selected={state.menuId === m.id}
                            tabIndex={0}
                            className={'rps-row' + (state.menuId === m.id ? ' selected focused' : '')}
                            style={{ paddingLeft: 12, opacity: m.active === false ? 0.55 : 1 }}
                            onClick={() => store.openMenu(m.id)}
                            onKeyDown={(e) =>
                                (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), store.openMenu(m.id))
                            }
                            title={`${m.name} · key "${m.key}"`}
                            data-rpm-menu={m.key}
                        >
                            <MenuIcon size={13} />
                            <span className="label">{m.name}</span>
                            <span className="desc">
                                {m.key} · {countItems(m.items)}
                            </span>
                        </div>
                    ))}
                    {!state.menus.length ? (
                        <div className="rps-empty">No menus yet. The portal falls back to its legacy navigation.</div>
                    ) : null}
                    <div className="rpd-pad" style={{ paddingTop: 10 }}>
                        <button className="rps-tbtn rpm-wide" onClick={newMenu} disabled={readOnly}>
                            <Plus size={13} /> New menu
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// ---- centre: preview -----------------------------------------------------------------------

function PreviewToolbar({ store, state, asUser }) {
    const menu = store.currentMenu();
    const roles = rolesOf(menu);
    const modes = [
        ['sidebar', PanelLeft, 'Sidebar'],
        ['header', PanelTop, 'Header'],
        ['footer', PanelBottom, 'Footer'],
    ];
    const conditions = conditionCount(menu);
    return (
        <div className="rpd-toolbar" data-rpm-toolbar="">
            <div className="rpm-seg" role="radiogroup" aria-label="Preview">
                {modes.map(([id, I, label]) => (
                    <button
                        key={id}
                        role="radio"
                        aria-checked={state.preview === id}
                        className="rps-tbtn"
                        title={`Preview in the ${label.toLowerCase()}`}
                        onClick={() => store.set({ preview: id })}
                        data-rpm-preview={id}
                    >
                        <I size={14} /> {label}
                    </button>
                ))}
            </div>
            {state.preview === 'sidebar' ? (
                <button
                    className="rps-tbtn"
                    aria-pressed={state.rail}
                    title={state.rail ? 'Expand the sidebar' : 'Collapse to the icon rail'}
                    onClick={() => store.set((s) => ({ rail: !s.rail }))}
                    data-rpm-rail=""
                >
                    <PanelLeftClose size={14} /> {state.rail ? 'Icon rail' : 'Expanded'}
                </button>
            ) : null}
            <span className="rpd-sep" />
            <label
                className="rpm-viewas"
                title="Preview what a user sees (client-side: item roles; condition scripts aren't run)"
            >
                <span>View as</span>
                <select value={state.viewAs} onChange={(e) => store.set({ viewAs: e.target.value })} data-rpm-viewas="">
                    <option value="all">Everything (editor)</option>
                    <option value="none">A user with no roles</option>
                    {roles.map((r) => (
                        <option key={r} value={r}>
                            Role: {r}
                        </option>
                    ))}
                </select>
            </label>
            {conditions && state.viewAs !== 'all' ? (
                <span className="rpd-hint" title="Condition scripts run on the server only">
                    {conditions} condition(s) not evaluated
                </span>
            ) : null}
            <span className="rpd-sep" />
            <ViewAsUserPicker portalId={state.portalId} state={asUser} />
            <span style={{ flex: 1 }} />
            {state.busy ? (
                <span className="rps-badge busy" data-rpm-saving="">
                    <Loader2 size={12} className="rps-spin" /> saving…
                </span>
            ) : null}
            <button
                className="rps-tbtn"
                disabled={!state.undo.length || !!state.busy}
                title={
                    state.undo.length ? `Undo: ${state.undo[state.undo.length - 1].label} (Ctrl+Z)` : 'Undo (Ctrl+Z)'
                }
                onClick={() => store.undo()}
                data-rpm-undo=""
            >
                <Undo2 size={14} />
            </button>
            <button
                className="rps-tbtn"
                disabled={!state.redo.length || !!state.busy}
                title="Redo (Ctrl+Shift+Z)"
                onClick={() => store.redo()}
                data-rpm-redo=""
            >
                <Redo2 size={14} />
            </button>
            <button
                className="rps-tbtn"
                title="Reload the preview"
                onClick={() => (store.set((s) => ({ version: (s.version || 0) + 1 })), viewAsUser.refresh())}
            >
                <RefreshCw size={14} />
            </button>
        </div>
    );
}

/** Mounts the host runtime's PortalPreview with this menu injected. */
function PreviewStage({ store, state, root, asUser }) {
    const [stageEl, setStageEl] = useState(null);
    const [mountEl, setMountEl] = useState(null);
    const [stageHeight, setStageHeight] = useState(600);
    const hostText = useHostTextStyle(root);
    const rootRef = useRef(null);
    const menu = store.currentMenu();
    const design = state.design;
    const slug = design ? design.portal.slug : '';
    const region = state.preview;
    const regionKeys = regionMenuKeys(design, region);

    // Page: the selected item's page (so it shows as active), else the home page.
    const selected = menu ? findItem(menu, state.selection) : null;
    let page = '';
    if (selected && selected.item.type === 'page' && selected.item.page) page = samplePath(selected.item.page.route);
    else if (selected && selected.item.type === 'route' && !(selected.item.params && selected.item.params.portal))
        page = String(selected.item.route || '').split('?')[0];

    const nav = useMemo(() => {
        if (!menu) return null;
        const draft = state.iconDraft;
        const withDraft = draft
            ? {
                  ...menu,
                  items: (function patch(items) {
                      return items.map((it) => ({
                          ...it,
                          icon: it.id === draft.id ? draft.icon : it.icon,
                          children: patch(it.children || []),
                      }));
                  })(menu.items),
              }
            : menu;
        return previewNav(withDraft, {
            viewAs: state.viewAs,
            portalSlug: slug,
            hidden: hiddenSets(asUser && asUser.audience),
        });
    }, [menu, state.viewAs, slug, state.iconDraft, asUser && asUser.audience]);

    const menusOverride = useMemo(() => {
        if (!menu || !nav) return null;
        const out = { [menu.key]: nav };
        regionKeys.forEach((r) => (out[r.key] = nav));
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nav, menu && menu.key, regionKeys.map((r) => r.key).join(',')]);

    useEffect(() => {
        if (!stageEl) return undefined;
        const update = () => setStageHeight(Math.max(320, stageEl.clientHeight - 2));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(stageEl);
        return () => ro.disconnect();
    }, [stageEl]);

    useEffect(() => {
        const { ReactDOMClient } = internals();
        if (!mountEl || !ReactDOMClient) return undefined;
        rootRef.current = ReactDOMClient.createRoot(mountEl);
        return () => {
            const r = rootRef.current;
            rootRef.current = null;
            setTimeout(() => r && r.unmount(), 0);
        };
    }, [mountEl]);

    const selectRef = useRef(store.select);
    selectRef.current = store.select;
    useEffect(() => {
        const { React: H, PortalPreview } = internals();
        if (!rootRef.current || !H || !PortalPreview || !slug) return;
        rootRef.current.render(
            H.createElement(PortalPreview, {
                slug,
                page,
                version: state.version || 0,
                target: root,
                height: `${stageHeight}px`,
                menus: menusOverride,
                sidebarOpen: region === 'sidebar' ? !state.rail : true,
                onNavigate: () => {}, // links select items here (see the click handler)
            })
        );
    });

    // Clicking a menu item in the preview selects it (links don't navigate; group buttons still toggle).
    useEffect(() => {
        if (!stageEl) return undefined;
        const onClick = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            const el = path.find((n) => n && n.nodeType === 1 && n.hasAttribute('data-rp-nav-item'));
            if (!el) return;
            const id = el.getAttribute('data-rp-nav-item');
            const current = store.currentMenu();
            if (!findItem(current, id)) return;
            const link = path.find((n) => n && n.nodeType === 1 && n.tagName === 'A');
            if (link) {
                e.preventDefault();
                e.stopPropagation();
            }
            selectRef.current(id);
        };
        stageEl.addEventListener('click', onClick, true);
        return () => stageEl.removeEventListener('click', onClick, true);
    }, [stageEl, store]);

    // Bring the previewed region into view (the footer sits below the page).
    useEffect(() => {
        if (!mountEl) return undefined;
        const t = setTimeout(() => {
            const el = mountEl.querySelector(`[data-rp-region="${region}"]`);
            if (el && region === 'footer') el.scrollIntoView({ block: 'end' });
            else if (stageEl && region !== 'footer') stageEl.scrollTop = 0;
        }, 400);
        return () => clearTimeout(t);
    }, [mountEl, stageEl, region, slug]);

    const missing = !regionKeys.length;
    const selCss = state.selection
        ? `.rpm-mount [data-rp-nav-item="${String(state.selection).replace(/"/g, '')}"] { outline: 2px solid var(--rps-accent) !important; outline-offset: 2px; border-radius: 4px; }`
        : '';
    return (
        <div ref={setStageEl} className="rpd-stage rpm-stage" data-rpm-stage="">
            <style>{selCss}</style>
            {missing ? (
                <div className="rpm-note" data-rpm-missing={region}>
                    This portal's layout has no {region} widget, so this preview shows the menu nowhere in the {region}.
                    Widgets read menus with useNavigation('{menu ? menu.key : 'key'}').
                </div>
            ) : (
                <div className="rpm-note subtle">
                    {region} widget{regionKeys.length > 1 ? 's' : ''}:{' '}
                    {regionKeys.map((r) => `${r.placement.component.name} (reads "${r.key}")`).join(', ')}
                    {menu && regionKeys.every((r) => r.key !== menu.key)
                        ? ` · previewing "${menu.key}" in its place`
                        : ''}
                </div>
            )}
            <div className="rpd-frame rps-host-content" style={hostText} data-rpm-frame="">
                <div
                    ref={setMountEl}
                    className="rpd-mount rpm-mount"
                    data-rpm-focus={missing ? '' : region}
                    data-rpm-mount=""
                />
            </div>
        </div>
    );
}

// ---- right: tree ---------------------------------------------------------------------------

/** Flatten the visible tree: [{ id, item, parentId, depth }]. */
function flatten(items, collapsed, parentId, depth, out) {
    (items || []).forEach((item) => {
        out.push({ id: item.id, item, parentId, depth });
        if (item.type === 'group' && !collapsed[item.id]) flatten(item.children, collapsed, item.id, depth + 1, out);
    });
    return out;
}

function descendantIds(item, out) {
    (item.children || []).forEach((c) => {
        out.push(c.id);
        descendantIds(c, out);
    });
    return out;
}

/** Where a dragged row lands: depth from the horizontal offset, parent = nearest group above. */
function projection(rows, activeId, overId, offsetX) {
    const activeIndex = rows.findIndex((r) => r.id === activeId);
    const overIndex = rows.findIndex((r) => r.id === overId);
    if (activeIndex < 0 || overIndex < 0) return null;
    const moved = arrayMove(rows, activeIndex, overIndex);
    const prev = moved[overIndex - 1];
    const next = moved[overIndex + 1];
    const active = rows[activeIndex];
    const wanted = active.depth + Math.round(offsetX / INDENT);
    const maxDepth = prev ? (prev.item.type === 'group' ? prev.depth + 1 : prev.depth) : 0;
    const minDepth = next ? next.depth : 0;
    const depth = Math.max(minDepth, Math.min(maxDepth, Math.max(0, wanted)));
    let parentId = null;
    if (depth > 0 && prev) {
        if (depth === prev.depth + 1) parentId = prev.id;
        else {
            for (let i = overIndex - 1; i >= 0; i -= 1) {
                if (moved[i].depth === depth - 1) {
                    parentId = moved[i].id;
                    break;
                }
                if (moved[i].depth < depth - 1) break;
            }
            if (parentId === null && depth === prev.depth) parentId = prev.parentId;
        }
    }
    // Index among the new siblings (the moving item excluded).
    let index = 0;
    for (let i = 0; i < overIndex; i += 1)
        if (moved[i].parentId === parentId && moved[i].depth === depth && moved[i].id !== activeId) index += 1;
    return { depth, parentId, index };
}

function quickPages(state, menu) {
    const used = {};
    const walk = (items) => (items || []).forEach((it) => (it.pageId && (used[it.pageId] = true), walk(it.children)));
    if (menu) walk(menu.items);
    return ((state.design && state.design.pages) || []).filter(
        (p) => p.route.indexOf(':') === -1 && p.route.indexOf('*') === -1 && !used[p.id]
    );
}

function QuickAdd({ store, studio, state, readOnly: locked }) {
    const menu = store.currentMenu();
    // One write at a time keeps positions predictable (each save reprocesses the portal).
    const readOnly = locked || !!state.busy;
    const pages = (state.design && state.design.pages) || [];
    const [pick, setPick] = useState('');
    const addPage = (pageId) => {
        const p = pages.find((x) => x.id === pageId);
        if (p) store.addItem({ type: 'page', page: p.id, label: p.title || p.name });
        setPick('');
    };
    const addGroup = async () => {
        const label = await ask(studio, {
            type: 'prompt',
            title: 'New group',
            label: 'Label',
            value: '',
            okLabel: 'Add',
            validate: (v) => (!v.trim() ? 'Enter a label' : null),
        });
        if (label) store.addItem({ type: 'group', label: label.trim() });
    };
    const addLink = async () => {
        const url = await ask(studio, {
            type: 'prompt',
            title: 'External link',
            label: 'URL (https://… or mailto:…)',
            value: 'https://',
            okLabel: 'Next',
            validate: (v) =>
                !/^(https?:\/\/\S+|mailto:\S+)$/i.test(v.trim()) ? 'Starts with http://, https:// or mailto:' : null,
        });
        if (!url) return;
        let host = url;
        try {
            host = new URL(url.trim()).hostname.replace(/^www\./, '') || url;
        } catch (e) {
            /* mailto */
        }
        const label = await ask(studio, {
            type: 'prompt',
            title: 'External link',
            label: 'Label',
            value: host,
            okLabel: 'Add',
            validate: (v) => (!v.trim() ? 'Enter a label' : null),
        });
        if (label)
            store.addItem({
                type: 'url',
                url: url.trim(),
                label: label.trim(),
                target: '_blank',
                icon: 'external-link',
            });
    };
    const addAll = () => {
        const list = quickPages(state, menu);
        if (!list.length) return;
        store.addItems(
            list.map((p) => ({ type: 'page', page: p.id, label: p.title || p.name })),
            null
        );
    };
    const missing = quickPages(state, menu).length;
    return (
        <div className="rpm-quick" data-rpm-quick="">
            <select
                value={pick}
                onChange={(e) => addPage(e.target.value)}
                disabled={readOnly || !menu}
                aria-label="Add a page link"
                data-rpm-add-page=""
            >
                <option value="">+ Page link…</option>
                {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.title || p.name} (/{p.route})
                    </option>
                ))}
            </select>
            <button
                className="rps-tbtn"
                onClick={addGroup}
                disabled={readOnly || !menu}
                title="Add a group"
                data-rpm-add-group=""
            >
                <Folder size={13} /> Group
            </button>
            <button
                className="rps-tbtn"
                onClick={() => store.addItem({ type: 'separator' })}
                disabled={readOnly || !menu}
                title="Add a separator"
                data-rpm-add-separator=""
            >
                <Minus size={13} /> Separator
            </button>
            <button
                className="rps-tbtn"
                onClick={addLink}
                disabled={readOnly || !menu}
                title="Add an external link"
                data-rpm-add-link=""
            >
                <ExternalLink size={13} /> Link
            </button>
            <button
                className="rps-tbtn"
                onClick={addAll}
                disabled={readOnly || !menu || !missing}
                title={
                    missing
                        ? `Add the ${missing} page(s) without route parameters that aren't in this menu yet`
                        : 'Every page is already in this menu'
                }
                data-rpm-add-all=""
            >
                <ListPlus size={13} /> All pages{missing ? ` (${missing})` : ''}
            </button>
        </div>
    );
}

function TreePanel({ store, studio, state, readOnly }) {
    const menu = store.currentMenu();
    const [collapsed, setCollapsed] = useState({});
    const [drag, setDrag] = useState(null); // { id, offsetX, overId }
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const allRows = useMemo(() => (menu ? flatten(menu.items, collapsed, null, 0, []) : []), [menu, collapsed]);
    // While dragging a group, its descendants travel with it (hidden from the list).
    const rows = useMemo(() => {
        if (!drag) return allRows;
        const active = allRows.find((r) => r.id === drag.id);
        if (!active) return allRows;
        const hide = descendantIds(active.item, []);
        return allRows.filter((r) => hide.indexOf(r.id) === -1);
    }, [allRows, drag && drag.id]);
    const proj = drag && drag.overId ? projection(rows, drag.id, drag.overId, drag.offsetX) : null;

    const onDragEnd = (e) => {
        const d = drag;
        setDrag(null);
        if (!d || !e.over) return;
        const p = projection(rows, d.id, e.over.id, e.delta.x);
        if (!p) return;
        store.moveItem(d.id, p.parentId, p.index);
    };

    if (!menu)
        return (
            <div className="rps-sidebar">
                <div className="rps-sidebar-title">Items</div>
                <div className="rps-empty">
                    {state.menus && !state.menus.length ? 'Create a menu on the left.' : 'Pick a menu.'}
                </div>
            </div>
        );
    const activeRow = drag ? rows.find((r) => r.id === drag.id) : null;
    return (
        <div className="rps-sidebar" data-rpm-tree-panel="">
            <div className="rps-sidebar-title">
                Items · {menu.name}
                <span style={{ flex: 1 }} />
            </div>
            <QuickAdd store={store} studio={studio} state={state} readOnly={readOnly} />
            <div
                className="rps-tree rpm-tree"
                style={{ flex: 1 }}
                role="tree"
                aria-label={`${menu.name} items`}
                data-rpm-tree=""
            >
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setDrag({ id: e.active.id, offsetX: 0, overId: e.active.id })}
                    onDragMove={(e) =>
                        setDrag((d) => (d ? { ...d, offsetX: e.delta.x, overId: e.over ? e.over.id : d.overId } : d))
                    }
                    onDragOver={(e) => setDrag((d) => (d ? { ...d, overId: e.over ? e.over.id : d.overId } : d))}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => setDrag(null)}
                >
                    <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                        {rows.map((r) => (
                            <TreeRow
                                key={r.id}
                                row={r}
                                depth={drag && drag.id === r.id && proj ? proj.depth : r.depth}
                                store={store}
                                studio={studio}
                                selected={state.selection === r.id}
                                collapsed={!!collapsed[r.id]}
                                toggle={() => setCollapsed((c) => ({ ...c, [r.id]: !c[r.id] }))}
                                readOnly={readOnly}
                                error={state.fieldErrors[r.id]}
                            />
                        ))}
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                        {activeRow ? (
                            <div className="rpd-drag-chip">
                                {activeRow.item.label || TYPE_LABEL[activeRow.item.type]}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
                {!rows.length ? (
                    <div className="rps-empty">This menu is empty. Add pages, groups or links above.</div>
                ) : null}
            </div>
            <div className="rpd-hint" style={{ padding: '4px 12px 6px' }}>
                Drag to reorder; drag right onto a group's level to nest. Keyboard: focus a handle, Space, ↑/↓, Space.
                Indent / outdent in the form.
            </div>
        </div>
    );
}

function ItemGlyph({ item }) {
    if (item.icon) return <Icon name={item.icon} size={14} />;
    if (item.type === 'group') return <Folder size={14} />;
    if (item.type === 'url') return <ExternalLink size={14} />;
    if (item.type === 'route') return <Link2 size={14} />;
    if (item.type === 'separator') return <Minus size={14} />;
    if (item.type === 'dynamic') return <Code2 size={14} />;
    return <FileText size={14} />;
}

function TreeRow({ row, depth, store, studio, selected, collapsed, toggle, readOnly, error }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: row.id,
        disabled: readOnly,
    });
    const item = row.item;
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: 6 + depth * INDENT,
        opacity: isDragging ? 0.5 : item.active === false ? 0.55 : 1,
    };
    const desc =
        item.type === 'page'
            ? item.page
                ? `/${item.page.route}`
                : 'no page'
            : item.type === 'route'
              ? `/${item.route}${item.params && item.params.portal ? ` @${item.params.portal}` : ''}`
              : item.type === 'url'
                ? item.url
                : item.type === 'group'
                  ? `${(item.children || []).length} item(s)`
                  : '';
    return (
        <div
            ref={setNodeRef}
            style={style}
            role="treeitem"
            aria-selected={selected}
            aria-level={depth + 1}
            aria-expanded={item.type === 'group' ? !collapsed : undefined}
            className={
                'rps-row rpm-row' +
                (selected ? ' selected focused' : '') +
                (error ? ' err' : '') +
                (item.type === 'separator' ? ' rpm-sep-row' : '')
            }
            onClick={() => store.select(item.id)}
            data-rpm-item={item.id}
            data-rpm-depth={depth}
        >
            <span
                className="rpm-handle"
                {...attributes}
                {...listeners}
                aria-label={`Move ${item.label || item.type}`}
                title="Drag to move (or Space, arrows, Space)"
                onClick={(e) => e.stopPropagation()}
                data-rpm-handle=""
            >
                <GripVertical size={13} />
            </span>
            {item.type === 'group' ? (
                <button
                    className="rpm-twisty"
                    onClick={(e) => (e.stopPropagation(), toggle())}
                    aria-label={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
            ) : (
                <span className="rpm-twisty" />
            )}
            <ItemGlyph item={item} />
            <span className="label">
                {item.type === 'separator' ? '———' : item.label || (item.page && item.page.title) || '(no label)'}
            </span>
            {item.roles && item.roles.length ? <Lock size={11} title={`Roles: ${item.roles.join(', ')}`} /> : null}
            <span className="desc">{desc}</span>
            {!readOnly ? (
                <span className="rpd-row-actions">
                    <button
                        className="rps-icon-btn"
                        title="Delete"
                        onClick={(e) => (e.stopPropagation(), confirmDelete(store, studio, item.id))}
                        data-rpm-delete={item.id}
                    >
                        <Trash2 size={12} />
                    </button>
                </span>
            ) : null}
        </div>
    );
}

// ---- right: inspector ----------------------------------------------------------------------

/** A text input that saves on blur / Enter (Escape reverts). */
function Field({ label, value, onSave, onRevert, disabled, placeholder, mono, multiline, rows, hint, error, name }) {
    const [draft, setDraft] = useState(value || '');
    useEffect(() => setDraft(value || ''), [value]);
    const commit = () => {
        if ((draft || '') !== (value || '')) onSave(draft);
        else if (error && onRevert) onRevert(); // back to the saved value: the failed edit is moot
    };
    const props = {
        value: draft,
        onChange: (e) => setDraft(e.target.value),
        onBlur: commit,
        onKeyDown: (e) => {
            if (e.key === 'Escape') {
                setDraft(value || '');
                e.stopPropagation();
            } else if (e.key === 'Enter' && !multiline) e.target.blur();
        },
        disabled,
        placeholder,
        className: mono ? 'rpd-mono' : undefined,
        'data-rpm-field': name,
        'aria-invalid': error ? true : undefined,
    };
    return (
        <label className="rpd-field">
            <span className="rpd-label">{label}</span>
            {multiline ? <textarea rows={rows || 4} spellCheck={false} {...props} /> : <input {...props} />}
            {error ? (
                <span className="rpd-error" role="alert" data-rpm-error={name}>
                    {error}
                </span>
            ) : hint ? (
                <span className="rpd-hint">{hint}</span>
            ) : null}
        </label>
    );
}

function Inspector({ store, studio, state, readOnly }) {
    const menu = store.currentMenu();
    const hit = menu && state.selection ? findItem(menu, state.selection) : null;
    return (
        <div className="rps-sidebar" data-rpm-inspector="">
            <div className="rps-sidebar-title">
                {hit
                    ? `${TYPE_LABEL[hit.item.type] || 'Item'} · ${hit.item.label || ''}`
                    : menu
                      ? 'Menu settings'
                      : 'Properties'}
            </div>
            <div className="rpd-inspector rpm-edit">
                {hit ? (
                    <ItemForm
                        key={hit.item.id}
                        store={store}
                        studio={studio}
                        state={state}
                        hit={hit}
                        menu={menu}
                        readOnly={readOnly}
                    />
                ) : menu ? (
                    <MenuForm key={menu.id} store={store} studio={studio} menu={menu} readOnly={readOnly} />
                ) : null}
            </div>
        </div>
    );
}

function MenuForm({ store, studio, menu, readOnly }) {
    const del = async () => {
        const ok = await ask(studio, {
            type: 'confirm',
            title: 'Delete menu',
            message: `Delete "${menu.name}" and its ${countItems(menu.items)} item(s)? This can't be undone here.`,
            buttons: [
                { label: 'Delete', value: true, primary: true },
                { label: 'Cancel', value: null },
            ],
        });
        if (ok) store.deleteMenu(menu.id);
    };
    return (
        <div className="rpd-form" data-rpm-menu-form={menu.id}>
            <Field
                label="Name"
                name="menu-name"
                value={menu.name}
                onSave={(v) => store.updateMenu(menu.id, { name: v })}
                disabled={readOnly}
            />
            <Field
                label="Key"
                name="menu-key"
                value={menu.key}
                mono
                onSave={(v) => store.updateMenu(menu.id, { key: v })}
                disabled={readOnly}
                hint={`Widgets read it with useNavigation('${menu.key}'). primary = the main navigation; footer = Site Footer; account = the App Sidebar's user menu.`}
            />
            <Field
                label="Description"
                name="menu-description"
                value={menu.description}
                multiline
                rows={2}
                onSave={(v) => store.updateMenu(menu.id, { description: v })}
                disabled={readOnly}
            />
            <label className="rpd-field rpd-check">
                <input
                    type="checkbox"
                    checked={menu.active !== false}
                    onChange={(e) => store.updateMenu(menu.id, { active: e.target.checked })}
                    disabled={readOnly}
                />
                <span className="rpd-label">Active</span>
            </label>
            <div className="rpd-hint">Select an item in the tree or the preview to edit it.</div>
            <div className="rpd-buttons">
                <button className="rps-tbtn" onClick={del} disabled={readOnly} data-rpm-delete-menu="">
                    <Trash2 size={13} /> Delete menu
                </button>
            </div>
        </div>
    );
}

function pageParams(route) {
    return String(route || '')
        .split('/')
        .filter((s) => s.charAt(0) === ':')
        .map((s) => s.substring(1));
}

function queryText(q) {
    return Object.keys(q || {})
        .map((k) => `${k}=${q[k]}`)
        .join('&');
}

function parseQuery(text) {
    const out = {};
    new URLSearchParams(String(text || '').replace(/^\?/, '')).forEach((v, k) => k && (out[k] = v));
    return out;
}

function ItemForm({ store, studio, state, hit, menu, readOnly }) {
    const item = hit.item;
    const id = item.id;
    const design = state.design;
    const pages = (design && design.pages) || [];
    const err = state.fieldErrors[id];
    const errFor = (field) => (err && (err.field === field || (!err.field && field === 'type')) ? err.message : null);
    const save = (fields, field) => store.updateItem(id, fields, field);
    const revert = () => store.set((s) => ({ fieldErrors: { ...s.fieldErrors, [id]: null } }));
    const params = item.params || {};
    const isLink = item.type === 'page' || item.type === 'route';

    // Structure helpers: siblings, indent into the previous group, outdent.
    const siblings = hit.parent ? hit.parent.children : menu.items;
    const prev = siblings[hit.index - 1];
    const parentHit = hit.parent ? findItem(menu, hit.parent.id) : null;
    const setType = (type) => {
        const fields = { type };
        if (type === 'page' && !item.pageId && pages[0]) fields.page = pages[0].id;
        if (type === 'url' && !item.url) fields.url = 'https://';
        if ((type === 'route' || type === 'url' || type === 'group') && !item.label)
            fields.label = (item.page && item.page.title) || 'Link';
        save(fields, 'type');
    };
    const portals = (state.portals || []).filter((p) => p.slug !== (design && design.portal.slug));

    return (
        <div className="rpd-form" data-rpm-item-form={id}>
            <div className="rpd-grid2">
                <label className="rpd-field">
                    <span className="rpd-label">Type</span>
                    <select
                        value={item.type}
                        onChange={(e) => setType(e.target.value)}
                        disabled={readOnly}
                        data-rpm-field="type"
                    >
                        {['page', 'route', 'url', 'group', 'separator'].map((t) => (
                            <option key={t} value={t}>
                                {TYPE_LABEL[t]}
                            </option>
                        ))}
                        {item.type === 'dynamic' ? <option value="dynamic">Dynamic (script)</option> : null}
                    </select>
                </label>
                <label className="rpd-field rpd-check" style={{ alignSelf: 'end' }}>
                    <input
                        type="checkbox"
                        checked={item.active !== false}
                        onChange={(e) => save({ active: e.target.checked }, 'active')}
                        disabled={readOnly}
                        data-rpm-field="active"
                    />
                    <span className="rpd-label">Active</span>
                </label>
            </div>
            {errFor('type') ? (
                <span className="rpd-error" role="alert">
                    {errFor('type')}
                </span>
            ) : null}
            {item.type !== 'separator' ? (
                <Field
                    label={item.type === 'page' ? 'Label (empty = the page title)' : 'Label'}
                    name="label"
                    value={item.label}
                    onSave={(v) => save({ label: v }, 'label')}
                    onRevert={revert}
                    disabled={readOnly}
                    error={errFor('label')}
                />
            ) : null}

            {item.type === 'page' ? (
                <>
                    <label className="rpd-field">
                        <span className="rpd-label">Page</span>
                        <select
                            value={item.pageId || ''}
                            onChange={(e) => save({ page: e.target.value }, 'page')}
                            disabled={readOnly}
                            data-rpm-field="page"
                        >
                            {!item.pageId ? <option value="">Choose a page…</option> : null}
                            {pages.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title || p.name} (/{p.route})
                                </option>
                            ))}
                        </select>
                        {errFor('page') ? (
                            <span className="rpd-error" role="alert">
                                {errFor('page')}
                            </span>
                        ) : null}
                    </label>
                    {item.page && pageParams(item.page.route).length ? (
                        <div className="rpd-grid2">
                            {pageParams(item.page.route).map((name) => (
                                <Field
                                    key={name}
                                    label={`:${name}`}
                                    name={`param-${name}`}
                                    value={(params.params || {})[name] || ''}
                                    onSave={(v) =>
                                        save(
                                            { params: { ...params, params: { ...(params.params || {}), [name]: v } } },
                                            'params'
                                        )
                                    }
                                    disabled={readOnly}
                                />
                            ))}
                        </div>
                    ) : null}
                    <Field
                        label="Query (a=1&b=2)"
                        name="query"
                        value={queryText(params.query)}
                        mono
                        onSave={(v) => save({ params: { ...params, query: parseQuery(v) } }, 'params')}
                        disabled={readOnly}
                        error={errFor('params')}
                    />
                </>
            ) : null}

            {item.type === 'route' ? (
                <>
                    <Field
                        label="Route (portal-relative; empty = home; ?query allowed)"
                        name="route"
                        value={item.route}
                        mono
                        onSave={(v) => save({ route: v }, 'route')}
                        onRevert={revert}
                        disabled={readOnly}
                        error={errFor('route')}
                    />
                    <label className="rpd-field">
                        <span className="rpd-label">Portal</span>
                        <select
                            value={params.portal || ''}
                            onChange={(e) => {
                                const next = { ...params };
                                if (e.target.value) next.portal = e.target.value;
                                else delete next.portal;
                                save({ params: Object.keys(next).length ? next : null }, 'params');
                            }}
                            disabled={readOnly}
                            data-rpm-field="portal"
                        >
                            <option value="">This portal</option>
                            {portals.map((p) => (
                                <option key={p.id} value={p.slug}>
                                    {p.name} (/{p.slug})
                                </option>
                            ))}
                        </select>
                        <span className="rpd-hint">Another portal makes a cross-portal link (in-app navigation).</span>
                    </label>
                </>
            ) : null}

            {item.type === 'url' ? (
                <Field
                    label="URL (https:// or mailto:)"
                    name="url"
                    value={item.url}
                    mono
                    onSave={(v) => save({ url: v }, 'url')}
                    onRevert={revert}
                    disabled={readOnly}
                    error={errFor('url')}
                />
            ) : null}

            {item.type !== 'separator' ? (
                <div className="rpd-field" role="group" aria-label="Icon">
                    <span className="rpd-label">Icon</span>
                    <IconPicker
                        value={item.icon}
                        onPick={(name) => save({ icon: name }, 'icon')}
                        onPreview={(name) => store.set({ iconDraft: name ? { id, icon: name } : null })}
                        disabled={readOnly}
                    />
                    {errFor('icon') ? (
                        <span className="rpd-error" role="alert">
                            {errFor('icon')}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {isLink || item.type === 'url' ? (
                <div className="rpd-grid2">
                    <label className="rpd-field">
                        <span className="rpd-label">Target</span>
                        <select
                            value={item.target || ''}
                            onChange={(e) => save({ target: e.target.value }, 'target')}
                            disabled={readOnly}
                            data-rpm-field="target"
                        >
                            <option value="">{item.type === 'url' ? 'Default (new tab)' : 'Default (same tab)'}</option>
                            <option value="_self">Same tab</option>
                            <option value="_blank">New tab</option>
                        </select>
                    </label>
                    {isLink ? (
                        <label className="rpd-field">
                            <span className="rpd-label">Active match</span>
                            <select
                                value={item.match || 'prefix'}
                                onChange={(e) => save({ match: e.target.value }, 'match')}
                                disabled={readOnly}
                                data-rpm-field="match"
                            >
                                <option value="prefix">Prefix (orders → orders/42)</option>
                                <option value="exact">Exact</option>
                            </select>
                        </label>
                    ) : null}
                </div>
            ) : null}

            {item.type === 'group' ? (
                <label className="rpd-field rpd-check">
                    <input
                        type="checkbox"
                        checked={!!item.collapsed}
                        onChange={(e) => save({ collapsed: e.target.checked }, 'collapsed')}
                        disabled={readOnly}
                        data-rpm-field="collapsed"
                    />
                    <span className="rpd-label">Start collapsed</span>
                </label>
            ) : null}

            {item.type !== 'separator' ? (
                <div className="rpd-grid2">
                    <Field
                        label="Tooltip"
                        name="tooltip"
                        value={item.tooltip}
                        onSave={(v) => save({ tooltip: v }, 'tooltip')}
                        disabled={readOnly}
                    />
                    <Field
                        label="Badge"
                        name="badge"
                        value={item.badge}
                        onSave={(v) => save({ badge: v }, 'badge')}
                        disabled={readOnly}
                    />
                </div>
            ) : null}

            <Field
                label="Roles (comma-separated; empty = everyone)"
                name="roles"
                value={(item.roles || []).join(', ')}
                onSave={(v) =>
                    save(
                        {
                            roles: v
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                        },
                        'roles'
                    )
                }
                disabled={readOnly}
                placeholder="itil, x_312987_portal.developer"
                error={errFor('roles')}
            />
            <Field
                label="Condition (server script; return false to hide)"
                name="condition"
                value={item.condition}
                mono
                multiline
                rows={4}
                onSave={(v) => save({ condition: v }, 'condition')}
                onRevert={revert}
                disabled={readOnly}
                placeholder="gs.hasRole('itil')"
                hint="Runs per user on the server ($sp, portal, item, user). The preview doesn't run it."
                error={errFor('condition')}
            />

            <div className="rpd-label">Position</div>
            <div className="rpd-buttons" data-rpm-move="">
                <button
                    className="rps-tbtn"
                    title="Move up"
                    disabled={readOnly || hit.index === 0}
                    onClick={() => store.moveItem(id, hit.parent ? hit.parent.id : null, hit.index - 1)}
                    data-rpm-up=""
                >
                    <ArrowUp size={13} /> Up
                </button>
                <button
                    className="rps-tbtn"
                    title="Move down"
                    disabled={readOnly || hit.index >= siblings.length - 1}
                    onClick={() => store.moveItem(id, hit.parent ? hit.parent.id : null, hit.index + 1)}
                    data-rpm-down=""
                >
                    <ArrowDown size={13} /> Down
                </button>
                <button
                    className="rps-tbtn"
                    title={
                        prev && prev.type === 'group'
                            ? `Move into "${prev.label}"`
                            : 'Indent: the item above must be a group'
                    }
                    disabled={readOnly || !prev || prev.type !== 'group'}
                    onClick={() => store.moveItem(id, prev.id, (prev.children || []).length)}
                    data-rpm-indent=""
                >
                    <ArrowRightToLine size={13} /> Indent
                </button>
                <button
                    className="rps-tbtn"
                    title="Outdent: move out of its group"
                    disabled={readOnly || !hit.parent}
                    onClick={() =>
                        store.moveItem(
                            id,
                            parentHit && parentHit.parent ? parentHit.parent.id : null,
                            parentHit ? parentHit.index + 1 : 0
                        )
                    }
                    data-rpm-outdent=""
                >
                    <ArrowLeftToLine size={13} /> Outdent
                </button>
                <button
                    className="rps-tbtn"
                    onClick={() => confirmDelete(store, studio, id)}
                    disabled={readOnly}
                    data-rpm-delete-item=""
                >
                    <Trash2 size={13} /> Delete
                </button>
            </div>
        </div>
    );
}
