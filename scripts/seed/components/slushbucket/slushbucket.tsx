import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cx, IconSearch, IconChevronDown, IconChevronLeft, IconChevronRight, Spinner } from 'components:app/field';

export type TransferItem = { id: string; label: string; description?: string; disabled?: boolean };

export type SlushbucketProps = {
    /** Items that can be added (already-selected ids are hidden from this side). */
    available: TransferItem[];
    /** Selected items, in order. */
    selected: TransferItem[];
    /** The new selection (ids in order, with their items). */
    onChange: (ids: string[], items: TransferItem[]) => void;
    /** Search box over the available side; controlled text for server-side search (onSearchChange). */
    searchable?: boolean;
    search?: string;
    onSearchChange?: (text: string) => void;
    /** Up / down buttons (Alt+↑/↓) on the selected side. */
    reorderable?: boolean;
    availableLabel?: string;
    selectedLabel?: string;
    /** The whole control's accessible name. */
    label?: string;
    loading?: boolean;
    emptyAvailable?: string;
    emptySelected?: string;
    /** Listbox height (px). */
    height?: number;
    disabled?: boolean;
    className?: string;
};

/**
 * Slushbucket (transfer list): Available and Selected listboxes with Add / Remove / Add all /
 * Remove all and optional reordering. Each list is a multi-select WAI-ARIA listbox (↑/↓, Home/End,
 * Space marks, Shift+↑/↓ extends, Ctrl/⌘+A marks all, Enter or double-click moves the marked
 * items); search filters the Available side (or drives a server search). Stacks vertically on
 * narrow widths. Domain-free: `app/record-slushbucket` (below) feeds it records.
 */
export function Slushbucket(props: SlushbucketProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const selectedIds = useMemo(() => new Set(props.selected.map((i) => i.id)), [props.selected]);
    const [localSearch, setLocalSearch] = useState('');
    const text = props.search !== undefined ? props.search : localSearch;
    const setText = (t: string) => (props.onSearchChange ? props.onSearchChange(t) : setLocalSearch(t));
    const availableShown = useMemo(() => {
        const base = props.available.filter((i) => !selectedIds.has(i.id));
        if (props.onSearchChange || !text.trim()) return base;
        const q = text.trim().toLowerCase();
        return base.filter((i) => (i.label + ' ' + (i.description || '')).toLowerCase().indexOf(q) >= 0);
    }, [props.available, selectedIds, text, props.onSearchChange]);
    const [markA, setMarkA] = useState<Set<string>>(new Set());
    const [markS, setMarkS] = useState<Set<string>>(new Set());
    const [announce, setAnnounce] = useState('');
    const height = props.height || 240;

    const emit = (items: TransferItem[]) =>
        props.onChange(
            items.map((i) => i.id),
            items
        );
    const add = (ids: string[]) => {
        const adding = availableShown.filter((i) => ids.indexOf(i.id) >= 0 && !i.disabled);
        if (!adding.length) return;
        emit(props.selected.concat(adding));
        setMarkA(new Set());
        setAnnounce(`${adding.length} added. ${props.selected.length + adding.length} selected.`);
    };
    const remove = (ids: string[]) => {
        const next = props.selected.filter((i) => ids.indexOf(i.id) < 0);
        if (next.length === props.selected.length) return;
        emit(next);
        setMarkS(new Set());
        setAnnounce(`${props.selected.length - next.length} removed. ${next.length} selected.`);
    };
    const move = (dir: -1 | 1) => {
        const ids = Array.from(markS);
        if (!ids.length) return;
        const list = props.selected.slice();
        const idx = ids.map((id) => list.findIndex((i) => i.id === id)).sort((a, b) => (dir < 0 ? a - b : b - a));
        for (const i of idx) {
            const j = i + dir;
            if (j < 0 || j >= list.length || ids.indexOf(list[j].id) >= 0) continue;
            const [x] = list.splice(i, 1);
            list.splice(j, 0, x);
        }
        emit(list);
        setAnnounce(`Moved ${dir < 0 ? 'up' : 'down'}`);
    };

    const btn =
        'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40';
    const dis = !!props.disabled;
    return (
        <div
            role="group"
            aria-label={props.label}
            className={cx(
                'rp-slush grid min-w-0 grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]!',
                props.className
            )}
        >
            <div className="flex min-w-0 flex-col gap-1.5">
                <span id={`${uid}-al`} className="text-xs font-medium text-muted-foreground">
                    {props.availableLabel || 'Available'}
                </span>
                {props.searchable !== false ? (
                    <label className="relative flex h-8 items-center">
                        <span className="sr-only">Search {props.availableLabel || 'available'}</span>
                        <IconSearch size={14} className="pointer-events-none absolute left-2.5 text-muted-foreground" />
                        <input
                            type="search"
                            value={text}
                            disabled={dis}
                            onChange={(e: any) => setText(e.target.value)}
                            placeholder="Search"
                            className="h-full w-full rounded-md border border-input bg-background pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        {props.loading ? (
                            <Spinner className="absolute right-2 text-muted-foreground" label="Searching" />
                        ) : null}
                    </label>
                ) : null}
                <TransferList
                    id={`${uid}-a`}
                    labelledBy={`${uid}-al`}
                    items={availableShown}
                    marked={markA}
                    onMark={setMarkA}
                    onActivate={(ids) => add(ids)}
                    empty={props.loading ? 'Loading…' : props.emptyAvailable || 'Nothing to add'}
                    height={height}
                    disabled={dis}
                />
            </div>
            <div className="flex flex-row items-center justify-center gap-1.5 sm:flex-col!">
                <button
                    type="button"
                    className={btn}
                    disabled={dis || !markA.size}
                    onClick={() => add(Array.from(markA))}
                    aria-label="Add the marked items"
                    title="Add"
                >
                    <IconChevronRight size={14} className="max-sm:rotate-90!" />
                    <span className="sm:sr-only!">Add</span>
                </button>
                <button
                    type="button"
                    className={btn}
                    disabled={dis || !markS.size}
                    onClick={() => remove(Array.from(markS))}
                    aria-label="Remove the marked items"
                    title="Remove"
                >
                    <IconChevronLeft size={14} className="max-sm:rotate-90!" />
                    <span className="sm:sr-only!">Remove</span>
                </button>
                <button
                    type="button"
                    className={cx(btn, 'text-xs')}
                    disabled={dis || !availableShown.length}
                    onClick={() => add(availableShown.map((i) => i.id))}
                    title="Add every item shown"
                >
                    Add all
                </button>
                <button
                    type="button"
                    className={cx(btn, 'text-xs')}
                    disabled={dis || !props.selected.length}
                    onClick={() => remove(props.selected.map((i) => i.id))}
                    title="Remove every selected item"
                >
                    Remove all
                </button>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
                <span
                    id={`${uid}-sl`}
                    className="flex items-center justify-between text-xs font-medium text-muted-foreground"
                >
                    <span>
                        {props.selectedLabel || 'Selected'}{' '}
                        <span className="tabular-nums">({props.selected.length})</span>
                    </span>
                    {props.reorderable ? (
                        <span className="flex items-center gap-1">
                            <button
                                type="button"
                                className={cx(btn, 'h-6 min-w-6 px-1')}
                                disabled={dis || !markS.size}
                                onClick={() => move(-1)}
                                aria-label="Move the marked items up"
                            >
                                <IconChevronDown size={12} className="rotate-180" />
                            </button>
                            <button
                                type="button"
                                className={cx(btn, 'h-6 min-w-6 px-1')}
                                disabled={dis || !markS.size}
                                onClick={() => move(1)}
                                aria-label="Move the marked items down"
                            >
                                <IconChevronDown size={12} />
                            </button>
                        </span>
                    ) : null}
                </span>
                <TransferList
                    id={`${uid}-s`}
                    labelledBy={`${uid}-sl`}
                    items={props.selected}
                    marked={markS}
                    onMark={setMarkS}
                    onActivate={(ids) => remove(ids)}
                    onMove={props.reorderable ? move : undefined}
                    empty={props.emptySelected || 'Nothing selected'}
                    height={height + (props.searchable !== false ? 38 : 0)}
                    disabled={dis}
                />
            </div>
            <span className="sr-only" aria-live="polite">
                {announce}
            </span>
        </div>
    );
}

function TransferList(props: {
    id: string;
    labelledBy: string;
    items: TransferItem[];
    marked: Set<string>;
    onMark: (s: Set<string>) => void;
    onActivate: (ids: string[]) => void;
    onMove?: (dir: -1 | 1) => void;
    empty: string;
    height: number;
    disabled?: boolean;
}) {
    const { items, marked } = props;
    const [active, setActive] = useState(0);
    const anchorIdx = useRef(0);
    const listRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (active >= items.length) setActive(Math.max(0, items.length - 1));
    }, [items.length]);
    useEffect(() => {
        const el = listRef.current && (listRef.current.querySelector(`[data-i="${active}"]`) as HTMLElement | null);
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
    }, [active]);
    const range = (a: number, b: number) => {
        const s = new Set<string>();
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (items[i]) s.add(items[i].id);
        return s;
    };
    const toggle = (i: number) => {
        const it = items[i];
        if (!it || it.disabled) return;
        const s = new Set(marked);
        if (s.has(it.id)) s.delete(it.id);
        else s.add(it.id);
        anchorIdx.current = i;
        props.onMark(s);
    };
    const onKeyDown = (e: any) => {
        if (props.disabled || !items.length) return;
        let handled = true;
        const go = (i: number) => {
            const n = Math.max(0, Math.min(items.length - 1, i));
            setActive(n);
            if (e.shiftKey) props.onMark(range(anchorIdx.current, n));
        };
        if (e.altKey && props.onMove && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            props.onMove(e.key === 'ArrowUp' ? -1 : 1);
            setActive((a) => Math.max(0, Math.min(items.length - 1, a + (e.key === 'ArrowUp' ? -1 : 1))));
        } else if (e.key === 'ArrowDown') go(active + 1);
        else if (e.key === 'ArrowUp') go(active - 1);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(items.length - 1);
        else if (e.key === ' ') toggle(active);
        else if (e.key === 'Enter') {
            const ids = marked.size ? Array.from(marked) : items[active] ? [items[active].id] : [];
            props.onActivate(ids);
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A'))
            props.onMark(new Set(items.filter((i) => !i.disabled).map((i) => i.id)));
        else handled = false;
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    return (
        <div
            ref={listRef}
            id={props.id}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={props.labelledBy}
            aria-activedescendant={items[active] ? `${props.id}-${active}` : undefined}
            aria-disabled={props.disabled || undefined}
            tabIndex={props.disabled ? -1 : 0}
            onKeyDown={onKeyDown}
            className="min-h-0 overflow-auto rounded-md border border-input bg-background p-1 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            style={{ height: props.height }}
        >
            {items.length ? (
                items.map((it, i) => {
                    const on = marked.has(it.id);
                    return (
                        <div
                            key={it.id}
                            id={`${props.id}-${i}`}
                            data-i={i}
                            role="option"
                            aria-selected={on}
                            aria-disabled={it.disabled || undefined}
                            className={cx(
                                'flex cursor-default flex-col rounded-sm px-2 py-1 text-sm select-none',
                                on ? 'bg-primary/15 text-foreground' : 'hover:bg-accent/70',
                                i === active ? 'ring-1 ring-ring/60 ring-inset' : '',
                                it.disabled ? 'opacity-50' : ''
                            )}
                            onClick={(e: any) => {
                                setActive(i);
                                if (e.shiftKey) props.onMark(range(anchorIdx.current, i));
                                else if (e.ctrlKey || e.metaKey) toggle(i);
                                else {
                                    anchorIdx.current = i;
                                    props.onMark(it.disabled ? new Set() : new Set([it.id]));
                                }
                            }}
                            onDoubleClick={() => !it.disabled && props.onActivate([it.id])}
                        >
                            <span className="truncate">{it.label}</span>
                            {it.description ? (
                                <span className="truncate text-xs text-muted-foreground">{it.description}</span>
                            ) : null}
                        </div>
                    );
                })
            ) : (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">{props.empty}</div>
            )}
        </div>
    );
}
