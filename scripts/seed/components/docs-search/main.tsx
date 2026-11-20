/**
 * components:app/docs-search — the docs search dialog (fumadocs' search dialog look) and its triggers.
 *
 *   import DocsSearchDialog, { DocsSearchTrigger, DocsSearchButton } from 'components:app/docs-search'
 *   <DocsSearchDialog />            mount ONCE per page (app/docs-sidebar does): the dialog + hotkeys
 *   <DocsSearchTrigger />           the sidebar's full-width "Search  Ctrl K" button
 *   <DocsSearchButton />            an icon button (mobile top bar)
 *
 * Any widget opens it with openDocsSearch() from utilities:app/docs. Hotkeys: Ctrl/⌘+K anywhere,
 * "/" outside text fields. Results come from useDocsSearch (client-side over every page's title,
 * headings and text; the index loads the first time the dialog opens). ↑/↓ move, Enter opens,
 * Esc closes. It searches the current docs collection; when the portal has several, an "All
 * collections" toggle widens it to every collection of the portal (results name their collection).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@portal/runtime';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from 'components:dialog';
import { Icon } from 'components:icon';
import { cn } from 'utilities:cn';
import {
    useDocsSearch,
    useDocsSearchOpen,
    useDocsCollections,
    collectionQ,
    openDocsSearch,
    docRoute,
    requestHeading,
    usePrefetchDoc,
} from 'utilities:app/docs';
import type { SearchResult } from 'utilities:app/docs';

const isMac = () =>
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const hotKeyLabel = () => (isMac() ? ['⌘', 'K'] : ['Ctrl', 'K']);

function isEditable(el: any) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

/** Ctrl/⌘+K and "/" open the docs search. */
export function useDocsSearchHotkeys(enabled = true) {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            const target = (e.composedPath && e.composedPath()[0]) || e.target;
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) {
                e.preventDefault();
                openDocsSearch();
            } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(target)) {
                e.preventDefault();
                openDocsSearch();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [enabled]);
}

function Highlighted({ text, match }: { text: string; match?: [number, number][] }) {
    if (!match || !match.length) return <>{text}</>;
    const out: React.ReactNode[] = [];
    let at = 0;
    match.forEach(([s, e], i) => {
        if (s < at) return;
        if (s > at) out.push(text.slice(at, s));
        out.push(
            <mark key={i} className="bg-transparent font-medium text-primary underline underline-offset-2">
                {text.slice(s, e)}
            </mark>
        );
        at = e;
    });
    out.push(text.slice(at));
    return <>{out}</>;
}

function ResultItem({
    item,
    active,
    onPick,
    onHover,
    collectionTitle,
}: {
    item: SearchResult;
    active: boolean;
    onPick: () => void;
    onHover: () => void;
    collectionTitle?: string;
}) {
    return (
        <button
            type="button"
            role="option"
            aria-selected={active}
            data-active={active ? 'true' : undefined}
            onClick={onPick}
            onMouseMove={onHover}
            className={cn(
                'relative w-full shrink-0 select-none overflow-hidden rounded-lg px-2.5 py-2 text-start text-sm',
                active && 'bg-accent text-accent-foreground'
            )}
        >
            {item.type !== 'page' ? <div role="none" className="absolute inset-y-0 start-3 w-px bg-border" /> : null}
            {item.type === 'page' ? (
                <>
                    {item.section || collectionTitle ? (
                        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {collectionTitle ? (
                                <span className="font-medium text-foreground/70">{collectionTitle}</span>
                            ) : null}
                            {collectionTitle && item.section ? <span aria-hidden="true">·</span> : null}
                            {item.section}
                        </div>
                    ) : null}
                    <p className="m-0 min-w-0 truncate font-medium">{item.title}</p>
                </>
            ) : item.type === 'heading' ? (
                <>
                    <Icon name="hash" className="absolute start-6 top-2.5 size-4 text-muted-foreground" />
                    <p className="m-0 min-w-0 truncate ps-8 font-medium">{item.heading}</p>
                </>
            ) : (
                <p className="m-0 min-w-0 ps-4 text-popover-foreground/80 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                    {item.heading ? <span className="me-1.5 text-muted-foreground">{item.heading} ·</span> : null}
                    <Highlighted text={item.snippet || ''} match={item.match} />
                </p>
            )}
        </button>
    );
}

/** The dialog. Mount once; it opens on openDocsSearch() and the hotkeys. */
export default function DocsSearchDialog({
    hotkeys = true,
    placeholder = 'Search',
    collection,
}: {
    hotkeys?: boolean;
    placeholder?: string;
    /** Force the current collection (a widget's `collection` option). */
    collection?: string;
}) {
    const [open, setOpen] = useDocsSearchOpen();
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const [everywhere, setEverywhere] = useState(false);
    const navigate = useNavigate();
    const colls = useDocsCollections(collection);
    const several = colls.keys.length > 1 && !collection;
    const scope = several && everywhere ? colls.keys : [colls.currentKey];
    const titleOf = (key: string) => (colls.collections.find((c) => c.key === key) || { title: key }).title;
    const listRef = useRef<HTMLDivElement | null>(null);
    useDocsSearchHotkeys(hotkeys);
    // The index loads the first time the dialog opens, then stays cached.
    const [everOpened, setEverOpened] = useState(false);
    useEffect(() => {
        if (open) setEverOpened(true);
    }, [open]);
    const { results, isLoading, error } = useDocsSearch(query, { enabled: everOpened, collections: scope });
    useEffect(() => setCursor(0), [query]);
    useEffect(() => {
        const el = listRef.current && (listRef.current.querySelector('[data-active="true"]') as HTMLElement | null);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [cursor]);
    useEffect(() => setCursor(0), [everywhere]);
    const current = results[cursor];
    const prefetch = usePrefetchDoc(current ? current.collection : colls.currentKey);
    useEffect(() => {
        if (current) prefetch(current.path);
    }, [current && current.collection, current && current.path]);

    const pick = (item: SearchResult | undefined) => {
        if (!item) return;
        setOpen(false);
        const route = docRoute(item.path);
        const q: Record<string, string> = { ...collectionQ(item.collection || colls.currentKey, colls.defaultKey) };
        if (item.hash) q.h = item.hash;
        navigate(route, Object.keys(q).length ? { q } : undefined);
        // The page scrolls to it (also when it's already showing and the URL doesn't change).
        requestHeading(item.path, item.hash || '');
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor((c) => (results.length ? (c + 1) % results.length : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(current);
        }
    };
    const empty = query.trim() && !isLoading && !results.length;
    return (
        <Dialog
            open={open}
            onOpenChange={(v: boolean) => {
                setOpen(v);
                if (!v) setQuery('');
            }}
        >
            <DialogContent
                showCloseButton={false}
                className="top-4 max-w-[calc(100%-1rem)] translate-y-0 gap-0 overflow-hidden rounded-xl border bg-popover p-0 text-popover-foreground shadow-2xl shadow-black/50 ring-0 sm:max-w-screen-sm md:top-[calc(50%-250px)]"
            >
                <DialogTitle className="sr-only">Search the docs</DialogTitle>
                <DialogDescription className="sr-only">
                    Type to search page titles, headings and text. Use the arrow keys and Enter to open a result.
                </DialogDescription>
                <div className="flex flex-row items-center gap-2 border-b p-3">
                    <Icon name="search" className={cn('size-5 text-muted-foreground', isLoading && 'animate-pulse')} />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        aria-label="Search the docs"
                        role="combobox"
                        aria-expanded={results.length > 0}
                        aria-controls="rp-docs-search-results"
                        className="w-0 flex-1 bg-transparent text-lg placeholder:text-muted-foreground focus-visible:outline-none"
                    />
                    {several ? (
                        <button
                            type="button"
                            aria-pressed={everywhere}
                            // Keep the typing focus in the search box.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setEverywhere((v) => !v)}
                            title={everywhere ? 'Search only ' + titleOf(colls.currentKey) : 'Search every collection'}
                            data-docs-search-all=""
                            className={cn(
                                'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors hover:bg-accent',
                                everywhere ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground'
                            )}
                        >
                            <Icon name="library" className="size-3.5" />
                            All collections
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-7 items-center rounded-md border px-1.5 font-mono text-xs text-muted-foreground hover:bg-accent"
                    >
                        ESC
                    </button>
                </div>
                <div
                    id="rp-docs-search-results"
                    role="listbox"
                    ref={listRef}
                    className={cn(
                        'flex max-h-[460px] w-full flex-col overflow-y-auto p-1',
                        !results.length && !empty && !error && 'hidden'
                    )}
                >
                    {error ? (
                        <div className="py-12 text-center text-sm text-destructive">
                            Search is unavailable: {String((error as any).message || error)}
                        </div>
                    ) : null}
                    {empty ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">No results found</div>
                    ) : null}
                    {results.map((r, i) => (
                        <ResultItem
                            key={r.id}
                            item={r}
                            collectionTitle={several && everywhere ? titleOf(r.collection) : undefined}
                            active={i === cursor}
                            onPick={() => pick(r)}
                            onHover={() => setCursor(i)}
                        />
                    ))}
                </div>
                {!query.trim() ? (
                    <div className="flex items-center gap-3 bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                        <span>
                            {several
                                ? everywhere
                                    ? 'Searching every collection'
                                    : 'Searching ' + titleOf(colls.currentKey)
                                : 'Search titles, headings and text'}
                        </span>
                        <span className="ms-auto inline-flex items-center gap-1">
                            <kbd className="rounded-md border bg-background px-1.5">↑</kbd>
                            <kbd className="rounded-md border bg-background px-1.5">↓</kbd> to move
                            <kbd className="ms-2 rounded-md border bg-background px-1.5">↵</kbd> to open
                        </span>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

/** Sidebar trigger: "Search" with the hotkey (fumadocs FullSearchTrigger). */
export function DocsSearchTrigger({ className, label = 'Search' }: { className?: string; label?: string }) {
    const keys = useMemo(hotKeyLabel, []);
    return (
        <button
            type="button"
            data-search-full=""
            onClick={() => openDocsSearch()}
            className={cn(
                'inline-flex h-9 w-full items-center gap-2 rounded-lg border bg-secondary/50 p-1.5 ps-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                className
            )}
        >
            <Icon name="search" className="size-4" />
            {label}
            <div className="ms-auto inline-flex gap-0.5">
                {keys.map((k) => (
                    <kbd key={k} className="rounded-md border bg-background px-1.5 font-sans text-xs leading-5">
                        {k}
                    </kbd>
                ))}
            </div>
        </button>
    );
}

/** Icon-only trigger (mobile top bar, collapsed sidebar panel). */
export function DocsSearchButton({ className }: { className?: string }) {
    return (
        <button
            type="button"
            aria-label="Open search"
            onClick={() => openDocsSearch()}
            className={cn(
                'inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                className
            )}
        >
            <Icon name="search" className="size-4.5" />
        </button>
    );
}
