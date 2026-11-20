// Navigation history (.plans/back-navigation.md): the store and the hooks widgets use.
//
// The browser's history is the real history; the host only OBSERVES it. Every settled location is
// applied to a per-tab store keyed by the shell's history.state.position (nav-history-core.js), kept in
// sessionStorage under x_312987_portal.nav.v1. Back is `history.go(-n)` to the target entry, so the
// browser buttons, the shell and this store stay in step; the host never writes window.history.
//
//   useBackTarget({ parent?, fallbackHome? }) → { available, label, title, source, go }
//   goBack(opts?)                         imperative Back for the active portal
//   useEntryTitle(title)                  label the current entry ("INC0010023")
//   useHistoryState(key, initial)         per-entry widget state, restored on back / forward
//   useScrollRestoration(ref | 'main', key?)  per-entry scroll, restored on back / forward
//   markEntries({ table, sysId }, { gone: true })  after a delete
//   useNavigationGuard(when, confirm)     navigate() / Link / goBack() await confirm() while `when`
//   useNavHistory()                       { entries, cursor } (diagnostics)
//
// Studio's page designer gets a memory-mode history (NavHistoryContext): no storage, no browser;
// Back there re-navigates the preview to the previous entry.
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { LocationStoreContext, PortalContext } from './contexts';
import { NavigationContext } from './navigation';
import { readWindowPath } from './location';
import {
    STORAGE_KEY,
    applyLocation,
    applyMemory,
    backLabel,
    emptyState,
    entryTitle,
    fieldsFromUrl,
    fieldsOf,
    fieldsOfTarget,
    flagEntries,
    identityOf,
    keyOf,
    patchCurrent,
    resolveBackTarget,
} from './nav-history-core';

function readStorage() {
    try {
        const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object' || !data.entries) return null;
        return { ...emptyState(data.epoch), ...data };
    } catch (error) {
        return null;
    }
}

function writeStorage(state) {
    try {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        /* quota or no storage */
    }
}

function shellPosition() {
    try {
        const s = typeof history !== 'undefined' ? history.state : null;
        return s && typeof s.position === 'number' ? s.position : null;
    } catch (error) {
        return null;
    }
}

function navigationType() {
    try {
        const nav = performance.getEntriesByType('navigation')[0];
        return (nav && nav.type) || 'navigate';
    } catch (error) {
        return 'navigate';
    }
}

/**
 * createNavHistory({ mode: 'browser' | 'memory' }): one store. 'browser' persists and reads the shell's
 * positions; 'memory' (previews) is a plain stack.
 */
export function createNavHistory({ mode } = {}) {
    const memory = mode === 'memory';
    let state = (!memory && readStorage()) || emptyState();
    const listeners = new Set();
    // Widget titles by identity (useEntryTitle), for entries applied after the widget set them.
    const titles = {};
    let hint = null;
    let pop = null; // memory mode: the entry a Back is going to
    let popped = false;
    let booted = false;
    let saveTimer = null;
    const guards = new Map(); // slug → Set<{ confirm }>
    const hosts = new Map(); // slug → navigate

    const emit = () => listeners.forEach((l) => l());
    const save = () => {
        if (memory) return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => writeStorage(state), 150);
    };
    const set = (next) => {
        if (next === state) return;
        state = next;
        save();
        emit();
    };

    if (!memory && typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            popped = true;
        });
        window.addEventListener('pagehide', () => writeStorage(state));
    }

    const api = {
        mode: memory ? 'memory' : 'browser',
        getState: () => state,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        /** Browser mode: apply the URL if it is a site URL of `slug` (the active host). */
        syncFromBrowser(slug) {
            if (memory || !slug) return;
            const fields = fieldsFromUrl(readWindowPath(), slug);
            if (!fields) return;
            const position = shellPosition();
            let boot = null;
            if (!booted) {
                booted = true;
                boot = navigationType() === 'navigate' && position === null ? 'fresh' : 'restore';
            }
            const next = applyLocation(state, {
                pos: position === null ? 0 : position,
                fields,
                popped,
                boot,
                hint,
                titles,
                now: Date.now(),
            });
            popped = false;
            if (hint && next.entries[next.cursor] && next.entries[next.cursor].key === hint.key) hint = null;
            set(next);
        },

        /** Memory mode: apply a location (the preview's location store). */
        applyLocation(location) {
            if (!memory) return;
            const next = applyMemory(state, { fields: fieldsOf(location), pop, hint, titles, now: Date.now() });
            pop = null;
            set(next);
        },

        /** navigate() announces where it is going: the title / kind for the new entry. */
        setHint(target, currentSlug) {
            const fields = fieldsOfTarget(target, currentSlug);
            hint = {
                key: keyOf(fields),
                identity: identityOf(fields),
                title: target && target.title ? String(target.title) : '',
                kind: target && target.kind ? String(target.kind) : '',
                at: Date.now(),
            };
        },

        setEntryTitle(identity, title) {
            const text = title ? String(title) : '';
            if (text) titles[identity] = text;
            else delete titles[identity];
            set(patchCurrent(state, identity, (e) => (e.title === text ? e : { ...e, title: text })));
        },

        setPageTitle(slug, page, title) {
            if (!title) return;
            const k = slug + '|' + (page || '');
            if (state.pageTitles && state.pageTitles[k] === title) return;
            set({ ...state, pageTitles: { ...(state.pageTitles || {}), [k]: String(title) } });
        },

        setPageTitles(slug, map) {
            const pageTitles = { ...(state.pageTitles || {}) };
            let changed = false;
            Object.keys(map || {}).forEach((page) => {
                const k = slug + '|' + page;
                if (map[page] && pageTitles[k] !== map[page]) {
                    pageTitles[k] = map[page];
                    changed = true;
                }
            });
            if (changed) set({ ...state, pageTitles });
        },

        setEntryState(identity, key, value) {
            set(
                patchCurrent(state, identity, (e) =>
                    e.state && e.state[key] === value ? e : { ...e, state: { ...(e.state || {}), [key]: value } }
                )
            );
        },

        setEntryScroll(identity, key, top) {
            // No emit: scroll positions are only read when an entry becomes current.
            const next = patchCurrent(state, identity, (e) =>
                e.scroll && e.scroll[key] === top ? e : { ...e, scroll: { ...(e.scroll || {}), [key]: top } }
            );
            if (next !== state) {
                state = next;
                save();
            }
        },

        markEntries(match, flags) {
            set(flagEntries(state, match, flags || { gone: true }));
        },

        // ---- guards ----
        addGuard(slug, guard) {
            const k = slug || '';
            if (!guards.has(k)) guards.set(k, new Set());
            guards.get(k).add(guard);
            return () => guards.get(k) && guards.get(k).delete(guard);
        },
        hasGuards(slug) {
            const set1 = guards.get(slug || '');
            return !!set1 && set1.size > 0;
        },
        /** Resolves true when every active guard of `slug` agrees. */
        async runGuards(slug) {
            const list = Array.from(guards.get(slug || '') || []);
            for (const g of list) {
                try {
                    if (!(await g.confirm())) return false;
                } catch (error) {
                    return false;
                }
            }
            return true;
        },

        // ---- hosts (imperative goBack) ----
        attachHost(slug, navigate) {
            hosts.set(slug, navigate);
            return () => hosts.get(slug) === navigate && hosts.delete(slug);
        },
        hostNavigate(slug) {
            return hosts.get(slug) || null;
        },

        /** Go to a resolved back target. Guards are run by the caller (goTarget). */
        travel(target, navigate) {
            if (!target || !target.available) return false;
            if (target.source === 'history') {
                if (memory) {
                    pop = { key: target.entry.key, pos: target.entry.pos };
                    if (navigate) navigate(entryTarget(target.entry), { skipGuard: true });
                    return true;
                }
                history.go(target.delta);
                return true;
            }
            if (target.source === 'parent') {
                if (navigate) navigate(parentTarget(target.parent), { skipGuard: true });
                return true;
            }
            if (target.source === 'browser') {
                if (memory) return false;
                history.back();
                return true;
            }
            if (target.source === 'home') {
                if (navigate) navigate('', { skipGuard: true });
                return true;
            }
            return false;
        },
    };
    return api;
}

/** A navigate() target for an entry. */
function entryTarget(entry) {
    const p = entry.params || {};
    return {
        to: entry.page,
        portalSlug: entry.portalSlug,
        recordId: p.recordId || undefined,
        table: p.table || undefined,
        sysId: p.sysId && p.sysId !== p.recordId ? p.sysId : undefined,
        view: p.view || undefined,
        query: p.query || undefined,
        q: p.q || undefined,
    };
}

function parentTarget(parent) {
    return {
        to: parent.to || '',
        portalSlug: parent.portalSlug || undefined,
        recordId: parent.recordId || undefined,
        table: parent.table || undefined,
        sysId: parent.sysId || undefined,
        view: parent.view || undefined,
        query: parent.query || undefined,
        q: parent.q || undefined,
        title: parent.label || parent.title || undefined,
    };
}

/** The page's (tab's) history: one per page load, shared by every host instance on the page. */
export const browserNavHistory = createNavHistory({ mode: 'browser' });

export const NavHistoryContext = createContext(browserNavHistory);

export function useNavHistoryStore() {
    return useContext(NavHistoryContext);
}

function useNavState(nav) {
    return useSyncExternalStore(nav.subscribe, nav.getState, nav.getState);
}

function useLocationValue() {
    const store = useContext(LocationStoreContext);
    return useSyncExternalStore(
        store ? store.subscribe : noopSubscribe,
        () => (store ? store.get() : null),
        () => null
    );
}

function noopSubscribe() {
    return () => {};
}

/** The current location's identity ('' outside a portal). */
function useIdentity() {
    const location = useLocationValue();
    return location ? identityOf(fieldsOf(location)) : '';
}

/** Page title lookup from the portal's pages ({ route, title }). */
function pageTitleOf(pages, to) {
    const list = Array.isArray(pages) ? pages : [];
    const route = String(to || '').replace(/^\/+|\/+$/g, '');
    const page = list.find((p) => p && (p.route === route || p.path === route));
    return page ? page.title || page.name || '' : '';
}

/** Resolve and go, guards first. Resolves true when it went. */
async function goTarget(nav, target, slug, navigate) {
    if (!target || !target.available) return false;
    if (nav.hasGuards(slug) && !(await nav.runGuards(slug))) return false;
    return nav.travel(target, navigate);
}

/**
 * useBackTarget({ parent?, fallbackHome? }) → { available, label, title, source, go }.
 *   parent  the declared parent: { to, table?, sysId?, recordId?, query?, q?, view?, label? } (used when
 *           this tab has no history in this portal: deep links, a new tab)
 * go() runs the navigation guards first; resolves false when cancelled or unavailable.
 */
export function useBackTarget(opts) {
    const o = opts || {};
    const nav = useNavHistoryStore();
    const state = useNavState(nav);
    const location = useLocationValue();
    const navigate = useContext(NavigationContext);
    const portal = useContext(PortalContext);
    const pages = portal ? portal.pages : null;
    const parent = o.parent || null;
    const parentKey = parent ? JSON.stringify(parent) : '';
    const fallbackHome = o.fallbackHome;
    const target = useMemo(() => {
        if (!location || location.mode === 'studio') return { available: false, source: 'none', title: '' };
        const fields = fieldsOf(location);
        const identity = identityOf(fields);
        let resolvedParent = null;
        let parentIdentity = '';
        if (parent && parent.to !== undefined && parent.to !== null) {
            const pf = fieldsOfTarget({ ...parent, page: parent.to }, location.portalSlug);
            parentIdentity = identityOf(pf);
            resolvedParent = { ...parent, label: parent.label || pageTitleOf(pages, parent.to) || undefined };
        }
        return resolveBackTarget(state, {
            identity,
            portalSlug: location.portalSlug,
            isHome: location.page === '',
            parent: resolvedParent,
            parentIdentity,
            position: nav.mode === 'memory' ? null : shellPosition(),
            fallbackHome,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, location, parentKey, pages, fallbackHome, nav]);
    const slug = location ? location.portalSlug : '';
    const go = useCallback(() => goTarget(nav, target, slug, navigate), [nav, target, slug, navigate]);
    return {
        available: !!target.available,
        label: backLabel(target),
        title: target.title || '',
        source: target.source,
        go,
    };
}

/** Imperative Back for the active portal (the current entry's). opts: { parent?, fallbackHome? }. */
export function goBack(opts) {
    const nav = browserNavHistory;
    const state = nav.getState();
    const current = state.entries[state.cursor];
    if (!current) {
        if (typeof history !== 'undefined') history.back();
        return Promise.resolve(true);
    }
    const o = opts || {};
    const navigate = nav.hostNavigate(current.portalSlug);
    const parent = o.parent || null;
    const target = resolveBackTarget(state, {
        identity: current.identity,
        portalSlug: current.portalSlug,
        isHome: current.page === '',
        parent,
        parentIdentity: parent ? identityOf(fieldsOfTarget({ ...parent, page: parent.to }, current.portalSlug)) : '',
        position: shellPosition(),
        fallbackHome: o.fallbackHome,
    });
    return goTarget(nav, target, current.portalSlug, navigate);
}

/** useBackTarget's go as a hook-bound function (usePortalUtils().goBack). */
export function useGoBack() {
    const back = useBackTarget();
    return back.go;
}

/** Label the current entry (Back labels, the history menu). '' / null clears it. */
export function useEntryTitle(title) {
    const nav = useNavHistoryStore();
    const identity = useIdentity();
    const text = title === undefined || title === null ? '' : String(title);
    useEffect(() => {
        if (!identity || !text) return;
        nav.setEntryTitle(identity, text);
    }, [nav, identity, text]);
}

/**
 * useHistoryState(key, initial) → [value, setValue]: like useState, but the value belongs to the current
 * history entry, so Back / Forward to it restores it (e.g. my-items' active tab). JSON values only.
 */
export function useHistoryState(key, initial) {
    const nav = useNavHistoryStore();
    const state = useNavState(nav);
    const identity = useIdentity();
    const entry = state.entries[state.cursor];
    const own = !!entry && !!identity && entry.identity === identity;
    const stored =
        own && entry.state && Object.prototype.hasOwnProperty.call(entry.state, key) ? entry.state[key] : undefined;
    const [local, setLocal] = useState(() => (stored !== undefined ? stored : initial));
    const entryId = own ? entry.pos + '|' + entry.key : '';
    const lastEntry = useRef(entryId);
    // Another entry became current (back / forward): take its value.
    useEffect(() => {
        if (lastEntry.current === entryId) return;
        lastEntry.current = entryId;
        if (stored !== undefined) setLocal(stored);
    }, [entryId, stored]);
    const valueRef = useRef(local);
    valueRef.current = local;
    const setValue = useCallback(
        (next) => {
            const value = typeof next === 'function' ? next(valueRef.current) : next;
            valueRef.current = value;
            setLocal(value);
            if (identity) nav.setEntryState(identity, key, value);
        },
        [nav, identity, key]
    );
    return [local, setValue];
}

/** The scrolling ancestor of the main region (or the document's scroller). */
export function findMainScroller(root) {
    const region = root && root.querySelector ? root.querySelector('[data-rp-region="main"]') : null;
    let el = region;
    while (el && el.nodeType === 1) {
        const style = getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return el;
        el = el.parentElement || (el.getRootNode && el.getRootNode().host) || null;
    }
    if (region) {
        // Not scrollable yet (content still loading): the nearest overflow container.
        el = region;
        while (el && el.nodeType === 1) {
            if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) return el;
            el = el.parentElement || null;
        }
    }
    return null;
}

const RESTORE_MS = 1500;

/**
 * useScrollRestoration(ref | 'main', key = 'main' | 'list'): remembers the element's scroll per history
 * entry and restores it when the entry becomes current again (back / forward), retrying while the
 * content loads (up to 1.5 s, stopping as soon as the user scrolls).
 */
export function useScrollRestoration(target, key) {
    const nav = useNavHistoryStore();
    const state = useNavState(nav);
    const identity = useIdentity();
    const portal = useContext(PortalContext);
    const scrollKey = key || (target === 'main' ? 'main' : 'list');
    const entry = state.entries[state.cursor];
    const own = !!entry && !!identity && entry.identity === identity;
    const entryId = own ? entry.pos + '|' + entry.key + '|' + nav.getState().epoch : '';
    const identityRef = useRef(identity);
    identityRef.current = identity;

    const resolve = useCallback(() => {
        if (target === 'main') return findMainScroller(portal && portal.shadowRoot);
        return target && target.current ? target.current : null;
    }, [target, portal]);

    // Save on scroll.
    useEffect(() => {
        let el = null;
        let frame = 0;
        let retry = 0;
        let tries = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (el && identityRef.current)
                    nav.setEntryScroll(identityRef.current, scrollKey, Math.round(el.scrollTop));
            });
        };
        const attach = () => {
            el = resolve();
            if (el) el.addEventListener('scroll', onScroll, { passive: true });
            else if (tries++ < 40) retry = setTimeout(attach, 100);
        };
        attach();
        return () => {
            clearTimeout(retry);
            if (frame) cancelAnimationFrame(frame);
            if (el) el.removeEventListener('scroll', onScroll);
        };
    }, [nav, resolve, scrollKey]);

    // Restore when the entry becomes current.
    useEffect(() => {
        if (!entryId) return undefined;
        const saved = entry.scroll ? entry.scroll[scrollKey] : undefined;
        if (typeof saved !== 'number') return undefined;
        const started = Date.now();
        let stopped = false;
        let timer = 0;
        const stop = () => {
            stopped = true;
        };
        const el0 = resolve();
        const host = el0 || null;
        const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
        if (host) events.forEach((ev) => host.addEventListener(ev, stop, { passive: true }));
        const step = () => {
            if (stopped) return;
            const el = resolve();
            if (el) {
                if (Math.abs(el.scrollTop - saved) > 1) el.scrollTop = saved;
                if (Math.abs(el.scrollTop - saved) <= 1 && Date.now() - started > 300) return;
            }
            if (Date.now() - started < RESTORE_MS) timer = setTimeout(step, 50);
        };
        step();
        return () => {
            stopped = true;
            clearTimeout(timer);
            if (host) events.forEach((ev) => host.removeEventListener(ev, stop));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryId, scrollKey]);
}

/** After a delete: flag every entry of the record so Back skips it. */
export function markEntries(match, flags) {
    browserNavHistory.markEntries(match, flags);
}

/** markEntries bound to the context's history (memory previews too). */
export function useMarkEntries() {
    const nav = useNavHistoryStore();
    return useCallback((match, flags) => nav.markEntries(match, flags), [nav]);
}

/**
 * useNavigationGuard(when, confirm): while `when` is true, navigate(), <Link> and Back await `confirm()`
 * (resolve true to leave). The browser's own back button can't be stopped (James's decision 5).
 */
export function useNavigationGuard(when, confirm) {
    const nav = useNavHistoryStore();
    const location = useLocationValue();
    const slug = location ? location.portalSlug : '';
    const confirmRef = useRef(confirm);
    confirmRef.current = confirm;
    useEffect(() => {
        if (!when) return undefined;
        return nav.addGuard(slug, { confirm: () => (confirmRef.current ? confirmRef.current() : true) });
    }, [nav, slug, when]);
}

/** { entries (oldest first, with their labels), cursor } for diagnostics or a "recent" menu. */
export function useNavHistory() {
    const nav = useNavHistoryStore();
    const state = useNavState(nav);
    return useMemo(() => {
        const entries = Object.keys(state.entries)
            .map(Number)
            .sort((a, b) => a - b)
            .map((p) => ({ ...state.entries[p], label: entryTitle(state.entries[p], state.pageTitles) }));
        return { entries, cursor: state.cursor, epoch: state.epoch };
    }, [state]);
}

/**
 * Host wiring: applies the URL to the browser history whenever this host's location, the URL (popstate)
 * or a navigate() URL check changes. Only the host whose portal the URL names applies it.
 */
export function useNavHistorySync(locationStore, navigate) {
    useEffect(() => {
        if (!locationStore || typeof window === 'undefined') return undefined;
        const nav = browserNavHistory;
        let timer = 0;
        const run = () => {
            const loc = locationStore.get();
            if (!loc || loc.mode === 'studio') return;
            nav.syncFromBrowser(loc.portalSlug);
        };
        const later = () => {
            clearTimeout(timer);
            timer = setTimeout(run, 0);
        };
        run();
        const off = locationStore.subscribe(later);
        window.addEventListener('popstate', later);
        window.addEventListener('rp-url-check', later);
        const loc0 = locationStore.get();
        const detach = loc0 && loc0.mode !== 'studio' && navigate ? nav.attachHost(loc0.portalSlug, navigate) : null;
        return () => {
            clearTimeout(timer);
            off();
            window.removeEventListener('popstate', later);
            window.removeEventListener('rp-url-check', later);
            if (detach) detach();
        };
    }, [locationStore, navigate]);
}
