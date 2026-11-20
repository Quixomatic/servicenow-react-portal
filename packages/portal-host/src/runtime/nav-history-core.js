// Navigation history, pure part (.plans/back-navigation.md §3–4). No React, no window: everything here
// takes plain values, so it is unit-tested with node --test (scripts/nav-history.test.mjs).
//
// One history per browser tab, mirroring the browser's own: entries are keyed by the shell's
// history.state.position, so they line up 1:1 with the back and forward buttons. Each entry carries the
// portal, page and record params, a title, a kind, flags and per-entry scroll / widget state.
//
//   state = { epoch, cursor, entries: { [pos]: NavEntry }, pageTitles: { 'slug|page': title } }
//   NavEntry = { pos, key, identity, portalSlug, page, params: { table, sysId, recordId, view, query, q },
//                title, hintTitle, kind: 'page' | 'record' | 'new-record' | 'success', flags: { gone?, skip? },
//                scroll: { [key]: number }, state: { [key]: unknown }, at, epoch }
import { normalizeLocation, urlParamsOf, toSearchParams } from './location';

export const STORAGE_KEY = 'x_312987_portal.nav.v1';
/** Positions kept (the newest; the lowest are dropped). */
export const CAP = 50;
/** How long a navigate() hint (title, kind) waits for its entry. */
export const HINT_MS = 2500;
/** q keys that mark a success screen (catalog order, cart checkout). */
export const SUCCESS_KEYS = ['ordered', 'done'];

export function emptyState(epoch) {
    return { epoch: epoch || newEpoch(), cursor: -1, entries: {}, pageTitles: {} };
}

let epochSeq = 0;
export function newEpoch() {
    epochSeq += 1;
    return Date.now().toString(36) + '.' + epochSeq;
}

const str = (v) => (v === undefined || v === null ? '' : String(v));

/** q as a canonical string: keys (then values) sorted, so key order never makes two entries differ. */
export function sortedQ(q) {
    const params = toSearchParams(q || '');
    const pairs = [];
    params.forEach((value, key) => pairs.push([key, value]));
    pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    const out = new URLSearchParams();
    pairs.forEach((p) => out.append(p[0], p[1]));
    return out.toString();
}

/**
 * The canonical fields of a normalized location (location.js): { portalSlug, page, table, sysId,
 * recordId, view, query, q }. q excludes the standard record keys (they're explicit fields).
 */
export function fieldsOf(location) {
    const loc = location || {};
    const q = toSearchParams(loc.q || '');
    ['table', 'sys_id', 'view', 'query'].forEach((k) => q.delete(k));
    return {
        portalSlug: str(loc.portalSlug),
        page: str(loc.page),
        table: str(loc.table),
        sysId: str(loc.sysId),
        recordId: str(loc.recordId),
        view: str(loc.view),
        query: str(loc.query),
        q: sortedQ(q),
    };
}

/** Fields for a UIB site URL path of `slug`, or null when the path isn't one. */
export function fieldsFromUrl(pathname, slug) {
    const params = urlParamsOf(pathname, slug);
    if (!params) return null;
    const first = (names) => {
        for (const n of names) if (params[n]) return params[n];
        return '';
    };
    const location = normalizeLocation(
        {
            mode: 'portal',
            portalSlug: slug,
            page: first(['page-id', 'pageId', 'page_id']),
            recordId: first(['id']),
            q: first(['q']),
            view: first(['view']),
            table: first(['table']),
            sysId: first(['sys-id', 'sys_id', 'sysId']),
            query: first(['query']),
        },
        ''
    );
    return fieldsOf(location);
}

/** Fields for a navigate() target ({ page, portalSlug, recordId, q, table, sysId, view, query }). */
export function fieldsOfTarget(target, currentSlug) {
    const t = target || {};
    const location = normalizeLocation(
        {
            mode: 'portal',
            portalSlug: t.portalSlug || currentSlug || '',
            page: t.page || '',
            recordId: str(t.recordId),
            q: toSearchParams(t.q).toString(),
            view: str(t.view),
            table: str(t.table),
            sysId: str(t.sysId !== undefined ? t.sysId : t.sys_id),
            query: str(t.query),
        },
        ''
    );
    return fieldsOf(location);
}

/** Everything that tells two entries apart (state included). */
export function keyOf(f) {
    return [f.portalSlug, f.page, f.table, f.sysId, f.recordId, f.view, f.query, f.q].join('|');
}

/** Where the entry is, without its state (q / query / view ignored). */
export function identityOf(f) {
    return [f.portalSlug, f.page, f.table, f.sysId, f.recordId].join('|');
}

export function kindOf(f) {
    if (f.sysId === '-1') return 'new-record';
    const q = toSearchParams(f.q || '');
    if (SUCCESS_KEYS.some((k) => q.get(k))) return 'success';
    if (f.sysId || f.recordId) return 'record';
    return 'page';
}

/** A new entry for fields at a position. */
export function makeEntry(f, pos, now, epoch) {
    return {
        pos,
        key: keyOf(f),
        identity: identityOf(f),
        portalSlug: f.portalSlug,
        page: f.page,
        params: { table: f.table, sysId: f.sysId, recordId: f.recordId, view: f.view, query: f.query, q: f.q },
        title: '',
        hintTitle: '',
        kind: kindOf(f),
        flags: {},
        scroll: {},
        state: {},
        at: now || 0,
        epoch: epoch || '',
    };
}

/** Keep the `cap` highest positions. */
export function capEntries(entries, cap) {
    const positions = Object.keys(entries)
        .map(Number)
        .sort((a, b) => a - b);
    const limit = cap || CAP;
    if (positions.length <= limit) return entries;
    const out = {};
    positions.slice(positions.length - limit).forEach((p) => (out[p] = entries[p]));
    return out;
}

function withHint(entry, hint, now, titles) {
    const out = entry;
    if (hint && now - hint.at < HINT_MS && (hint.key === entry.key || hint.identity === entry.identity)) {
        if (hint.title) out.hintTitle = String(hint.title);
        if (hint.kind) out.kind = hint.kind;
    }
    if (!out.title && titles && titles[entry.identity]) out.title = titles[entry.identity];
    return out;
}

/**
 * Apply a settled location (§3.2). input:
 *   pos      the shell's history.state.position (0 when absent)
 *   fields   the location's canonical fields (fieldsFromUrl)
 *   popped   a popstate happened since the last apply
 *   boot     'fresh' (a new document on a new entry: reset), 'restore' (first apply after a reload or
 *            a cross-document back / forward: keep when pos + key match, else reset) or null
 *   hint     the pending navigate() hint { key, identity, title, kind, at } or null
 *   titles   widget titles by identity (useEntryTitle), for entries that have none yet
 *   now      Date.now()
 * Returns the next state (a new object; the input isn't mutated).
 */
export function applyLocation(state, input) {
    const now = input.now || 0;
    const pos = typeof input.pos === 'number' && input.pos >= 0 ? input.pos : 0;
    const prev = state || emptyState();
    const fresh = makeEntry(input.fields, pos, now, prev.epoch);
    const existing = prev.entries[pos];

    if (input.boot === 'fresh' || (input.boot === 'restore' && (!existing || existing.key !== fresh.key))) {
        const epoch = newEpoch();
        fresh.epoch = epoch;
        return {
            epoch,
            cursor: pos,
            entries: { [pos]: withHint(fresh, input.hint, now, input.titles) },
            pageTitles: prev.pageTitles || {},
        };
    }

    // 1. Same entry: a pop, a reload or a no-op.
    if (existing && existing.key === fresh.key) {
        if (prev.cursor === pos) return prev;
        return { ...prev, cursor: pos };
    }

    const entries = { ...prev.entries };
    const cursor = prev.cursor;
    if (!input.popped && pos === cursor && existing) {
        // 3. Replace: the entry becomes the new location; same identity keeps its scroll, state, title.
        if (existing.identity === fresh.identity) {
            fresh.scroll = existing.scroll || {};
            fresh.state = existing.state || {};
            fresh.title = existing.title || '';
            fresh.flags = existing.flags || {};
        }
        entries[pos] = withHint(fresh, input.hint, now, input.titles);
    } else if (!input.popped && pos === cursor + 1) {
        // 4. Push: drop everything above.
        Object.keys(entries).forEach((p) => {
            if (Number(p) > pos) delete entries[p];
        });
        entries[pos] = withHint(fresh, input.hint, now, input.titles);
    } else {
        // 2 / 5. A pop to an entry we didn't know, or positions out of step: insert, keep the rest.
        entries[pos] = withHint(fresh, input.popped ? null : input.hint, now, input.titles);
    }
    return { ...prev, cursor: pos, entries: capEntries(entries, CAP) };
}

/** Memory mode (Studio preview): no positions, a plain stack driven by locations. */
export function applyMemory(state, input) {
    const now = input.now || 0;
    const prev = state || emptyState();
    const fresh = makeEntry(input.fields, 0, now, prev.epoch);
    const current = prev.entries[prev.cursor];
    if (current && current.key === fresh.key) return prev;
    const pop = input.pop;
    if (pop && pop.key === fresh.key && prev.entries[pop.pos] && prev.entries[pop.pos].key === fresh.key)
        return { ...prev, cursor: pop.pos };
    const pos = prev.cursor < 0 ? 0 : prev.cursor + 1;
    fresh.pos = pos;
    const entries = {};
    Object.keys(prev.entries).forEach((p) => {
        if (Number(p) < pos) entries[p] = prev.entries[p];
    });
    entries[pos] = withHint(fresh, input.hint, now, input.titles);
    return { ...prev, cursor: pos, entries: capEntries(entries, CAP) };
}

/** Humanized page path: 'my-requests' → 'My requests'. */
export function humanize(page) {
    const last = String(page || '')
        .split('/')
        .filter(Boolean)
        .pop();
    if (!last) return 'Home';
    const text = last.replace(/[-_]+/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** An entry's label: widget title → navigate() title → q title → page title → 'Home' / the page path. */
export function entryTitle(entry, pageTitles) {
    if (!entry) return '';
    if (entry.title) return entry.title;
    if (entry.hintTitle) return entry.hintTitle;
    const qTitle = toSearchParams((entry.params && entry.params.q) || '').get('title');
    if (qTitle) return qTitle;
    if (entry.page === '') return 'Home';
    const titles = pageTitles || {};
    const pageTitle = titles[entry.portalSlug + '|' + entry.page];
    return pageTitle || humanize(entry.page);
}

/**
 * Where Back goes (§4.2, James's decision 4: never into another portal).
 * opts:
 *   identity    the current location's identity (entries like it are skipped)
 *   portalSlug  the current portal (entries of other portals are skipped)
 *   isHome      the current page is the portal home
 *   parent      the declared parent { to, table?, sysId?, recordId?, query?, q?, view?, label?, title? } or null
 *   parentIdentity  identityOf(fields of the parent), so a parent equal to here is ignored
 *   position    the shell's position (browser fallback only when > 0 and the previous entry is unknown)
 *   fallbackHome   default true
 * Returns { available, source: 'history' | 'parent' | 'browser' | 'home' | 'none', entry?, delta?, title }.
 */
export function resolveBackTarget(state, opts) {
    const o = opts || {};
    const s = state || emptyState();
    const cursor = s.cursor;
    const titles = s.pageTitles || {};
    if (cursor >= 0 && s.entries[cursor]) {
        for (let p = cursor - 1; p >= 0 && s.entries[p]; p -= 1) {
            const e = s.entries[p];
            if (e.flags && (e.flags.gone || e.flags.skip)) continue;
            if (e.kind === 'new-record') continue;
            if (o.portalSlug && e.portalSlug !== o.portalSlug) continue;
            if (o.identity && e.identity === o.identity) continue;
            return { available: true, source: 'history', entry: e, delta: p - cursor, title: entryTitle(e, titles) };
        }
    }
    if (o.parent && o.parent.to !== undefined && o.parent.to !== null && o.parentIdentity !== o.identity) {
        const title = o.parent.label || o.parent.title || humanize(o.parent.to);
        return { available: true, source: 'parent', parent: o.parent, title };
    }
    const previousUnknown = cursor < 1 || !s.entries[cursor - 1];
    if (typeof o.position === 'number' && o.position > 0 && previousUnknown && s.entries[cursor]) {
        // The shell pushed the previous entry in this experience, but we lost it: plain browser back.
        return { available: true, source: 'browser', title: '' };
    }
    if (o.fallbackHome !== false && !o.isHome) return { available: true, source: 'home', title: 'Home' };
    return { available: false, source: 'none', title: '' };
}

/** "Back to My incidents" (or "Back"). */
export function backLabel(target) {
    if (!target || !target.available) return '';
    return target.title ? `Back to ${target.title}` : 'Back';
}

/** Flags on every entry for a record (markEntries after a delete). */
export function flagEntries(state, match, flags) {
    const m = match || {};
    let changed = false;
    const entries = { ...state.entries };
    Object.keys(entries).forEach((p) => {
        const e = entries[p];
        const params = e.params || {};
        if (m.table && params.table !== m.table) return;
        if (m.sysId && params.sysId !== m.sysId && params.recordId !== m.sysId) return;
        if (m.identity && e.identity !== m.identity) return;
        if (!m.table && !m.sysId && !m.identity) return;
        entries[p] = { ...e, flags: { ...(e.flags || {}), ...flags } };
        changed = true;
    });
    return changed ? { ...state, entries } : state;
}

/** Patch the current entry when it has `identity` (titles, scroll, widget state). */
export function patchCurrent(state, identity, patch) {
    const e = state.entries[state.cursor];
    if (!e || (identity && e.identity !== identity)) return state;
    const next = typeof patch === 'function' ? patch(e) : { ...e, ...patch };
    if (next === e) return state;
    return { ...state, entries: { ...state.entries, [state.cursor]: next } };
}

/** The UIB URL for a target (James's decision 6: real hrefs). Optional params use one /params/ segment. */
export function buildSiteHref(base, f) {
    const pairs = [];
    const add = (name, value) => {
        if (value) pairs.push(name, encodeURIComponent(value));
    };
    add('page-id', f.page);
    add('id', f.recordId);
    add('table', f.table);
    add('sys-id', f.sysId && f.sysId !== f.recordId ? f.sysId : f.recordId ? '' : f.sysId);
    add('view', f.view);
    add('query', f.query);
    add('q', f.q);
    const root = String(base || '/x/312987/portal/site').replace(/\/+$/, '') + '/' + encodeURIComponent(f.portalSlug);
    return pairs.length ? root + '/params/' + pairs.join('/') : root;
}

/** The site route base of a path ('/x/312987/portal/site/sp/params/…' → '/x/312987/portal/site'), or ''. */
export function siteBaseOf(pathname, slug) {
    const path = String(pathname || '');
    if (!slug) return '';
    const marker = '/' + slug;
    let i = path.indexOf(marker + '/');
    if (i < 0 && path.endsWith(marker)) i = path.length - marker.length;
    return i > 0 ? path.slice(0, i) : '';
}
