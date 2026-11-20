/**
 * utilities:app/docs — headless logic for the docs portal (no markup). Any widget can build its own
 * docs UI on it.
 *
 * Data (x_312987_portal_doc through the Table API, the user's session; TanStack Query, shared cache)
 *   useDocsNav()                 { sections: [{ title, slug, pages }], pages (nav order), byPath, isLoading, error }
 *   useDoc(path)                 { doc, isLoading, error, notFound }   path 'index' = the home page
 *   usePrefetchDoc()             (path) => void   warm a page on hover / focus
 *   useDocsSearchIndex(enabled)  { index, isLoading }   every page's sections (fetched on first use)
 *   useDocsSearch(query, opts)   { results, isLoading }  ranked page / heading / text hits
 *   searchDocs(index, query)     the same ranking as a plain function
 *
 * Routing (the docs portal: page '' = index, page '*' = every other doc path)
 *   docRoute(path) → portal route ('' for index)      docPathOf(routePath) → doc path
 *   resolveDocHref(href, fromPath) → { kind: 'doc', path, hash } | { kind: 'hash', hash } | { kind: 'external', href }
 *     relative .md links (../concepts/layouts.md#regions) become doc paths; README-style index links too
 *   neighbours(pages, path) → { previous, next } in nav order
 *
 * Page state
 *   useToc(ids, { root, offset }) → active heading ids (scroll-spy over the docs scroller)
 *   scrollToHeading(id, { root, behavior })   getDocsScroller(fromElement)
 *   openDocsSearch() / closeDocsSearch() / useDocsSearchOpen() → [open, setOpen]  (one dialog, many triggers)
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from 'utilities:react-query';

export const DOC_TABLE = 'x_312987_portal_doc';
const META_FIELDS = 'path,title,description,section,section_slug,section_order,order,icon,tags';

export type DocMeta = {
    path: string;
    title: string;
    description: string;
    section: string;
    sectionSlug: string;
    sectionOrder: number;
    order: number;
    icon: string;
    tags: string[];
};
export type DocHeading = { depth: number; text: string; slug: string };
export type Doc = DocMeta & { markdown: string; sourcePath: string; headings: DocHeading[] };
export type DocsSection = { title: string; slug: string; order: number; pages: DocMeta[] };
export type SearchSection = { h: string; t: string; x: string };
export type SearchEntry = DocMeta & { sections: SearchSection[] };
export type SearchResult = {
    id: string;
    type: 'page' | 'heading' | 'text';
    path: string;
    title: string;
    section: string;
    heading?: string;
    hash?: string;
    snippet?: string;
    match?: [number, number][];
    score: number;
};

export const docKeys = {
    all: ['rp-docs'] as const,
    nav: ['rp-docs', 'nav'] as const,
    doc: (path: string) => ['rp-docs', 'doc', path] as const,
    search: ['rp-docs', 'search'] as const,
};

/* ---------------- Table API ---------------- */

async function tableGet(query: string, fields: string, limit = 500, signal?: AbortSignal): Promise<any[]> {
    const params = new URLSearchParams({
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_limit: String(limit),
        sysparm_exclude_reference_link: 'true',
    });
    const res = await fetch('/api/now/table/' + DOC_TABLE + '?' + params.toString(), {
        headers: { Accept: 'application/json', 'X-UserToken': (window as any).g_ck || '' },
        credentials: 'same-origin',
        signal,
    });
    if (!res.ok) {
        let message = res.status + ' ' + res.statusText;
        try {
            const body = await res.json();
            message = (body && body.error && (body.error.message || body.error.detail)) || message;
        } catch (e) {}
        throw new Error(message);
    }
    const body = await res.json();
    return (body && body.result) || [];
}

const num = (v: any, d = 100) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);
function toMeta(r: any): DocMeta {
    return {
        path: r.path || '',
        title: r.title || r.path || '',
        description: r.description || '',
        section: r.section || '',
        sectionSlug: r.section_slug || '',
        sectionOrder: num(r.section_order),
        order: num(r.order),
        icon: r.icon || '',
        tags: String(r.tags || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean),
    };
}
function parseJson<T>(s: any, fallback: T): T {
    if (s && typeof s === 'object') return s as T;
    try {
        return s ? (JSON.parse(s) as T) : fallback;
    } catch (e) {
        return fallback;
    }
}
const byNavOrder = (a: DocMeta, b: DocMeta) =>
    a.sectionOrder - b.sectionOrder || a.order - b.order || a.title.localeCompare(b.title);

/* ---------------- Nav ---------------- */

export function fetchDocsNav(signal?: AbortSignal): Promise<DocMeta[]> {
    return tableGet('active=true^ORDERBYsection_order^ORDERBYorder', META_FIELDS, 1000, signal).then((rows) =>
        rows.map(toMeta).sort(byNavOrder)
    );
}

export function groupSections(pages: DocMeta[]): DocsSection[] {
    const sections: DocsSection[] = [];
    const bySlug: Record<string, DocsSection> = {};
    for (const p of pages) {
        const slug = p.sectionSlug || p.section || 'docs';
        if (!bySlug[slug]) {
            bySlug[slug] = { title: p.section, slug, order: p.sectionOrder, pages: [] };
            sections.push(bySlug[slug]);
        }
        bySlug[slug].pages.push(p);
    }
    return sections;
}

export function useDocsNav() {
    const q = useQuery({
        queryKey: docKeys.nav,
        queryFn: ({ signal }: { signal?: AbortSignal }) => fetchDocsNav(signal),
        staleTime: 5 * 60000,
    });
    const pages: DocMeta[] = q.data || EMPTY;
    const value = useMemo(() => {
        const byPath: Record<string, DocMeta> = {};
        for (const p of pages) byPath[p.path] = p;
        return { sections: groupSections(pages), pages, byPath };
    }, [pages]);
    return { ...value, isLoading: q.isPending, error: q.error as Error | null };
}
const EMPTY: any[] = [];

/* ---------------- One doc ---------------- */

export function fetchDoc(path: string, signal?: AbortSignal): Promise<Doc | null> {
    return tableGet('active=true^path=' + path, META_FIELDS + ',markdown,source_path,headings_json', 1, signal).then(
        (rows) => {
            if (!rows.length) return null;
            const r = rows[0];
            return {
                ...toMeta(r),
                markdown: r.markdown || '',
                sourcePath: r.source_path || '',
                headings: parseJson<DocHeading[]>(r.headings_json, []),
            };
        }
    );
}

export function useDoc(path: string) {
    const q = useQuery({
        queryKey: docKeys.doc(path),
        queryFn: ({ signal }: { signal?: AbortSignal }) => fetchDoc(path, signal),
        enabled: !!path,
        staleTime: 5 * 60000,
    });
    return {
        doc: q.data || null,
        isLoading: !!path && q.isPending,
        error: q.error as Error | null,
        notFound: q.isSuccess && !q.data,
    };
}

export function usePrefetchDoc() {
    const qc = useQueryClient();
    return useCallback(
        (path: string) => {
            if (path)
                qc.prefetchQuery({ queryKey: docKeys.doc(path), queryFn: () => fetchDoc(path), staleTime: 5 * 60000 });
        },
        [qc]
    );
}

/* ---------------- Routing ---------------- */

/** Doc path → portal route: 'index' is the portal home (''). */
export const docRoute = (path: string) => (!path || path === 'index' ? '' : path);
/** Portal route ('' or 'concepts/layouts') → doc path. */
export const docPathOf = (route: string) => {
    const p = String(route || '')
        .replace(/^\/+|\/+$/g, '')
        .replace(/\.md$/, '');
    return !p || p === 'index' ? 'index' : p.replace(/\/index$/, '') || 'index';
};

/** A Markdown href relative to the doc at `fromPath`. */
export function resolveDocHref(
    href: string,
    fromPath: string
): { kind: 'doc'; path: string; hash: string } | { kind: 'hash'; hash: string } | { kind: 'external'; href: string } {
    const h = String(href || '');
    if (h.startsWith('#')) return { kind: 'hash', hash: decodeURIComponent(h.slice(1)) };
    if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//') || h.startsWith('/')) return { kind: 'external', href: h };
    const [file, hash = ''] = h.split('#');
    if (!/\.md$/i.test(file)) return { kind: 'external', href: h };
    const base = (fromPath || 'index').split('/').slice(0, -1);
    for (const seg of file.split('/')) {
        if (seg === '..') base.pop();
        else if (seg && seg !== '.') base.push(seg);
    }
    return { kind: 'doc', path: docPathOf(base.join('/')), hash: decodeURIComponent(hash) };
}

/**
 * Shareable URL of a doc (and heading) in the current portal: …/site/<slug>/params/page-id/<route>/q/h%3D<id>.
 * The heading travels as the q param `h` (the platform owns the URL hash).
 */
export function docUrl(path: string, hash?: string): string {
    const m = window.location.pathname.match(/^(.*?\/site\/[^/]+)/);
    const base = window.location.origin + (m ? m[1] : window.location.pathname);
    const route = docRoute(path);
    const pairs: string[] = [];
    if (route) pairs.push('page-id', encodeURIComponent(route));
    if (hash) pairs.push('q', encodeURIComponent('h=' + hash));
    return base + (pairs.length ? '/params/' + pairs.join('/') : '');
}

export function neighbours(pages: DocMeta[], path: string) {
    const i = pages.findIndex((p) => p.path === path);
    return i < 0 ? { previous: null, next: null } : { previous: pages[i - 1] || null, next: pages[i + 1] || null };
}

/* ---------------- Search ---------------- */

export function fetchSearchIndex(signal?: AbortSignal): Promise<SearchEntry[]> {
    return tableGet('active=true^ORDERBYsection_order^ORDERBYorder', META_FIELDS + ',search_text', 1000, signal).then(
        (rows) =>
            rows
                .map((r) => ({ ...toMeta(r), sections: parseJson<SearchSection[]>(r.search_text, []) }))
                .sort(byNavOrder)
    );
}

export function useDocsSearchIndex(enabled = true) {
    const q = useQuery({
        queryKey: docKeys.search,
        queryFn: ({ signal }: { signal?: AbortSignal }) => fetchSearchIndex(signal),
        enabled,
        staleTime: 10 * 60000,
    });
    return {
        index: (q.data || EMPTY) as SearchEntry[],
        isLoading: enabled && q.isPending,
        error: q.error as Error | null,
    };
}

const norm = (s: string) => s.toLowerCase();
function terms(query: string) {
    return norm(query)
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
}
function snippetOf(text: string, ts: string[], width = 140) {
    const low = norm(text);
    let at = -1;
    for (const t of ts) {
        const i = low.indexOf(t);
        if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    if (at < 0) at = 0;
    const start = Math.max(0, at - 40);
    const raw = (start > 0 ? '…' : '') + text.slice(start, start + width) + (start + width < text.length ? '…' : '');
    const lowRaw = norm(raw);
    const match: [number, number][] = [];
    for (const t of ts) {
        let i = lowRaw.indexOf(t);
        while (i >= 0) {
            match.push([i, i + t.length]);
            i = lowRaw.indexOf(t, i + t.length);
        }
    }
    match.sort((a, b) => a[0] - b[0]);
    return { snippet: raw, match };
}

/**
 * Rank pages and their sections for `query` (every term must appear). Results are grouped like
 * fumadocs: a page hit, then that page's heading / text hits. At most `limit` pages.
 */
export function searchDocs(index: SearchEntry[], query: string, limit = 8): SearchResult[] {
    const ts = terms(query);
    if (!ts.length) return [];
    const all = (s: string) => {
        const l = norm(s);
        return ts.every((t) => l.includes(t));
    };
    const groups: { score: number; items: SearchResult[] }[] = [];
    for (const e of index) {
        const items: SearchResult[] = [];
        const titleHit = all(e.title);
        const metaHit = all(e.title + ' ' + e.description + ' ' + e.tags.join(' ') + ' ' + e.section);
        let best = titleHit ? 100 + (norm(e.title).startsWith(ts[0]) ? 20 : 0) : metaHit ? 40 : 0;
        for (const s of e.sections) {
            if (s.t && all(s.t)) {
                items.push({
                    id: e.path + '#' + s.h,
                    type: 'heading',
                    path: e.path,
                    title: e.title,
                    section: e.section,
                    heading: s.t,
                    hash: s.h,
                    score: 60,
                });
                best = Math.max(best, 60);
            } else if (all(s.t + ' ' + s.x)) {
                const sn = snippetOf(s.x, ts);
                items.push({
                    id: e.path + '#' + (s.h || '') + ':t',
                    type: 'text',
                    path: e.path,
                    title: e.title,
                    section: e.section,
                    heading: s.t || undefined,
                    hash: s.h || undefined,
                    snippet: sn.snippet,
                    match: sn.match,
                    score: 20,
                });
                best = Math.max(best, 20);
            }
        }
        if (!best && !items.length) continue;
        const page: SearchResult = {
            id: e.path,
            type: 'page',
            path: e.path,
            title: e.title,
            section: e.section,
            snippet: e.description || undefined,
            score: best,
        };
        groups.push({ score: best + Math.min(items.length, 5), items: [page].concat(items.slice(0, 4)) });
    }
    groups.sort((a, b) => b.score - a.score);
    return groups.slice(0, limit).flatMap((g) => g.items);
}

export function useDocsSearch(query: string, opts: { enabled?: boolean; limit?: number } = {}) {
    const { index, isLoading, error } = useDocsSearchIndex(opts.enabled !== false);
    const results = useMemo(() => searchDocs(index, query, opts.limit), [index, query, opts.limit]);
    return { results, isLoading, error };
}

/* ---------------- Search dialog open state (one dialog, many triggers) ---------------- */

let searchOpen = false;
const searchListeners = new Set<() => void>();
function setSearchOpen(v: boolean) {
    if (v === searchOpen) return;
    searchOpen = v;
    searchListeners.forEach((l) => l());
}
export const openDocsSearch = () => setSearchOpen(true);
export const closeDocsSearch = () => setSearchOpen(false);
export function useDocsSearchOpen(): [boolean, (open: boolean) => void] {
    const open = useSyncExternalStore(
        (l) => {
            searchListeners.add(l);
            return () => searchListeners.delete(l);
        },
        () => searchOpen,
        () => false
    );
    return [open, setSearchOpen];
}

/* ---------------- Heading requests (search, cross-page links) ---------------- */

// A pending "scroll to heading" for a doc path: the page showing that path consumes it (now if it's
// mounted, or when it mounts after navigation). Covers same-page picks where the URL doesn't change.
let pendingHeading: { path: string; id: string; at: number } | null = null;
const headingListeners = new Set<() => void>();
export function requestHeading(path: string, id: string) {
    pendingHeading = { path, id, at: Date.now() };
    headingListeners.forEach((l) => l());
}
/** Calls `onRequest(id)` for heading requests aimed at `path` (made in the last 10 s). */
export function useHeadingRequests(path: string, onRequest: (id: string) => void) {
    const cb = useCallback(onRequest, [onRequest]);
    useEffect(() => {
        const check = () => {
            const p = pendingHeading;
            if (p && p.path === path && Date.now() - p.at < 10000) {
                pendingHeading = null;
                cb(p.id);
            }
        };
        headingListeners.add(check);
        check();
        return () => {
            headingListeners.delete(check);
        };
    }, [path, cb]);
}

/* ---------------- Scroller, headings, scroll-spy ---------------- */

/** The docs layout's scroll container (data-docs-scroller) around `el`, if any. */
export function getDocsScroller(el?: Element | null): HTMLElement | null {
    return (el && (el.closest('[data-docs-scroller]') as HTMLElement)) || null;
}

/** Scroll heading `id` (inside `root`'s tree) into view below the sticky bars. */
export function scrollToHeading(
    id: string,
    opts: { root?: Element | null; behavior?: ScrollBehavior; offset?: number } = {}
) {
    const scope = (opts.root && (opts.root.getRootNode() as Document | ShadowRoot)) || document;
    const target = id
        ? ((scope as any).getElementById ? (scope as any).getElementById(id) : null) ||
          (scope as ParentNode).querySelector('[id="' + CSS.escape(id) + '"]')
        : null;
    const scroller = opts.root ? getDocsScroller(opts.root) : null;
    if (!target || !scroller) return false;
    const top =
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        (opts.offset ?? 72);
    scroller.scrollTo({ top: Math.max(0, top), behavior: opts.behavior || 'smooth' });
    return true;
}

/**
 * Scroll-spy: the ids of the headings currently "in view" in the docs scroller. Like fumadocs, the
 * active range is every heading whose section is visible; when none is (a long section), the last
 * heading above the viewport stays active.
 */
export function useToc(ids: string[], opts: { root?: Element | null; offset?: number } = {}) {
    const [active, setActive] = useState<string[]>([]);
    const key = ids.join('|');
    useEffect(() => {
        const scroller = opts.root ? getDocsScroller(opts.root) : null;
        if (!scroller || !ids.length) {
            setActive([]);
            return;
        }
        const scope = opts.root!.getRootNode() as ShadowRoot | Document;
        const offset = opts.offset ?? 80;
        let frame = 0;
        const measure = () => {
            frame = 0;
            const box = scroller.getBoundingClientRect();
            const top = box.top + offset;
            const bottom = box.bottom;
            const els = ids.map(
                (id) => (scope as any).getElementById?.(id) || scope.querySelector('[id="' + CSS.escape(id) + '"]')
            );
            const pos = els.map((el: Element | null) => (el ? el.getBoundingClientRect().top : Infinity));
            // The section being read: the last heading at or above the reading line (top band). At the
            // bottom of the page, the last heading on screen wins (short final sections never reach the
            // line). Above the first heading, the first one if it's on screen.
            const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
            let pick = -1;
            for (let i = 0; i < ids.length; i++)
                if (pos[i] !== Infinity && pos[i] <= (atBottom ? bottom - 40 : top + 8)) pick = i;
            if (pick < 0 && pos[0] !== undefined && pos[0] < bottom) pick = 0;
            const next = pick >= 0 ? [ids[pick]] : [];
            setActive((prev) => (prev.join('|') === next.join('|') ? prev : next));
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };
        measure();
        scroller.addEventListener('scroll', schedule, { passive: true });
        const ro = new ResizeObserver(schedule);
        ro.observe(scroller);
        return () => {
            scroller.removeEventListener('scroll', schedule);
            ro.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, opts.root, opts.offset]);
    return active;
}

export default useDocsNav;
