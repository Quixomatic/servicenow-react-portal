import { useRef, useState } from 'react';
import { toast, useUser } from '@portal/runtime';
import {
    useSavedFilters,
    useSavedFilterActions,
    useMyGroups,
    groupByOf,
    stripListTokens,
} from 'utilities:app/list-data';
import type { SavedFilter } from 'utilities:app/list-data';
import { Popup, Select } from 'components:app/combobox';
import { cx, controlClass, IconX, IconCheck, Spinner } from 'components:app/field';
import { Button } from 'components:button';

export type ListQueryState = { filter: string; orderBy: string; groupBy: string };

export type SavedFiltersMenuProps = {
    table: string;
    /** What "Save" stores (filter ^ GROUPBY ^ ORDERBY, as the classic list does). */
    current: ListQueryState;
    onApply: (state: ListQueryState, filter: SavedFilter) => void;
    buttonClassName: string;
    compact?: boolean;
};

/** Encoded sys_filter value for a list state. */
export function encodeSavedFilter(s: ListQueryState): string {
    const order = String(s.orderBy || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => (x.startsWith('-') ? 'ORDERBYDESC' + x.slice(1) : 'ORDERBY' + x));
    return [s.filter, s.groupBy ? 'GROUPBY' + s.groupBy : ''].concat(order).filter(Boolean).join('^');
}

/** A stored sys_filter value → list state (filter, sort, group). */
export function decodeSavedFilter(encoded: string): ListQueryState {
    const tokens = String(encoded || '').split('^');
    const order = tokens
        .filter((t) => t.indexOf('ORDERBY') === 0)
        .map((t) => (t.indexOf('ORDERBYDESC') === 0 ? '-' + t.slice(11) : t.slice(7)));
    return { filter: stripListTokens(encoded), orderBy: order.join(','), groupBy: groupByOf(encoded) };
}

/**
 * The list menu's saved filters (`now-record-list-menu-connected`, on the platform's sys_filter):
 * save the current filter for yourself or (with filter_group) a group you're in, apply any filter
 * you can read (yours, your groups', global), rename, update to the current filter, delete your
 * own. Everything runs as the user; ACL refusals show as toasts.
 */
export function SavedFiltersMenu(props: SavedFiltersMenuProps) {
    const btn = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const user = useUser() as { sysId?: string; hasRole?: (r: string) => boolean };
    const list = useSavedFilters(props.table, { enabled: open });
    const actions = useSavedFilterActions(props.table);
    const canShare = !!(user.hasRole && user.hasRole('filter_group'));
    const groups = useMyGroups({ enabled: open && canShare });
    const [title, setTitle] = useState('');
    const [share, setShare] = useState('');
    const [busy, setBusy] = useState('');
    const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState('');
    const encoded = encodeSavedFilter(props.current);
    const filters = list.data || [];
    const run = async (key: string, fn: () => Promise<any>, ok: string) => {
        setBusy(key);
        try {
            await fn();
            toast.success(ok);
            return true;
        } catch (e) {
            toast.error((e as Error).message);
            return false;
        } finally {
            setBusy('');
        }
    };
    const save = async () => {
        const t = title.trim();
        if (!t) return;
        if (await run('save', () => actions.save(t, encoded, share || undefined), `Saved “${t}”`)) setTitle('');
    };
    const sections: { key: SavedFilter['scope']; label: string }[] = [
        { key: 'mine', label: 'My filters' },
        { key: 'group', label: 'Shared with my groups' },
        { key: 'global', label: 'Everyone' },
    ];
    const small =
        'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40';
    const canEdit = (f: SavedFilter) => f.scope === 'mine' || (f.scope === 'group' && canShare);
    return (
        <>
            <button
                ref={btn}
                type="button"
                className={props.buttonClassName}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                title="Saved filters"
            >
                <BookmarkIcon />
                <span className={props.compact ? 'sr-only 2xl:not-sr-only!' : 'max-sm:sr-only!'}>Saved</span>
            </button>
            <Popup
                anchor={btn}
                open={open}
                onDismiss={() => !busy && setOpen(false)}
                matchWidth={false}
                minWidth={380}
                maxHeight={520}
                role="dialog"
                aria-label="Saved filters"
                className="p-3"
            >
                <div
                    className="rpl-bare flex w-full min-w-0 flex-col gap-3"
                    onKeyDown={(e: any) => {
                        if (e.key === 'Escape' && !e.defaultPrevented && !renaming) {
                            e.preventDefault();
                            setOpen(false);
                            if (btn.current) btn.current.focus();
                        }
                    }}
                >
                    <form
                        className="flex flex-col gap-2"
                        onSubmit={(e: any) => {
                            e.preventDefault();
                            save();
                        }}
                    >
                        <label className="flex flex-col gap-1 text-sm font-medium">
                            Save the current filter
                            <input
                                className={controlClass({ size: 'sm' })}
                                value={title}
                                maxLength={80}
                                placeholder="Name, e.g. My P1s this week"
                                onChange={(e: any) => setTitle(e.target.value)}
                            />
                        </label>
                        {canShare ? (
                            <Select
                                aria-label="Who sees it"
                                size="sm"
                                value={share}
                                items={[{ value: '', label: 'Only me' }].concat(
                                    (groups.data || []).map((g) => ({ value: g.value, label: `Group: ${g.label}` }))
                                )}
                                onChange={(i) => setShare(i.value)}
                            />
                        ) : null}
                        <div className="flex items-center justify-between gap-2">
                            <code className="min-w-0 truncate text-xs text-muted-foreground" title={encoded}>
                                {encoded || 'All records (no conditions)'}
                            </code>
                            <Button type="submit" size="sm" disabled={!title.trim() || busy === 'save'}>
                                {busy === 'save' ? <Spinner label="Saving" /> : null} Save
                            </Button>
                        </div>
                    </form>
                    <div className="flex max-h-72 flex-col gap-2 overflow-auto border-t border-border pt-2">
                        {list.isLoading ? (
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner label="Loading saved filters" /> Loading…
                            </span>
                        ) : list.error ? (
                            <span role="alert" className="text-sm text-destructive">
                                {(list.error as Error).message}
                            </span>
                        ) : !filters.length ? (
                            <span className="text-sm text-muted-foreground">No saved filters for this table yet.</span>
                        ) : (
                            sections.map((sec) => {
                                const items = filters.filter((f) => f.scope === sec.key);
                                if (!items.length) return null;
                                return (
                                    <section key={sec.key} aria-label={sec.label} className="flex flex-col gap-0.5">
                                        <span className="text-xs font-medium text-muted-foreground">{sec.label}</span>
                                        <ul className="flex flex-col">
                                            {items.map((f) => (
                                                <li
                                                    key={f.sysId}
                                                    className="group flex min-w-0 items-center gap-1 rounded-md hover:bg-accent/60"
                                                >
                                                    {renaming && renaming.id === f.sysId ? (
                                                        <form
                                                            className="flex min-w-0 flex-1 items-center gap-1 py-0.5 pl-1"
                                                            onSubmit={async (e: any) => {
                                                                e.preventDefault();
                                                                const t = renaming.title.trim();
                                                                if (!t) return;
                                                                if (
                                                                    await run(
                                                                        'rename' + f.sysId,
                                                                        () => actions.update(f.sysId, { title: t }),
                                                                        'Renamed'
                                                                    )
                                                                )
                                                                    setRenaming(null);
                                                            }}
                                                            onKeyDown={(e: any) => {
                                                                if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setRenaming(null);
                                                                }
                                                            }}
                                                        >
                                                            <input
                                                                autoFocus
                                                                aria-label={`New name for ${f.title}`}
                                                                className={cx(
                                                                    controlClass({ size: 'sm' }),
                                                                    'min-w-0 flex-1'
                                                                )}
                                                                value={renaming.title}
                                                                onChange={(e: any) =>
                                                                    setRenaming({ id: f.sysId, title: e.target.value })
                                                                }
                                                            />
                                                            <button
                                                                type="submit"
                                                                className={small}
                                                                aria-label="Save name"
                                                            >
                                                                <IconCheck size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={small}
                                                                aria-label="Cancel renaming"
                                                                onClick={() => setRenaming(null)}
                                                            >
                                                                <IconX size={14} />
                                                            </button>
                                                        </form>
                                                    ) : confirmDelete === f.sysId ? (
                                                        <span className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-2 text-sm">
                                                            <span className="min-w-0 flex-1 truncate">
                                                                Delete “{f.title}”?
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={busy === 'del' + f.sysId}
                                                                onClick={async () => {
                                                                    if (
                                                                        await run(
                                                                            'del' + f.sysId,
                                                                            () => actions.remove(f.sysId),
                                                                            `Deleted “${f.title}”`
                                                                        )
                                                                    )
                                                                        setConfirmDelete('');
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setConfirmDelete('')}
                                                            >
                                                                Keep
                                                            </Button>
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                                title={f.filter || 'All records'}
                                                                onClick={() => {
                                                                    props.onApply(decodeSavedFilter(f.filter), f);
                                                                    setOpen(false);
                                                                    if (btn.current) btn.current.focus();
                                                                }}
                                                            >
                                                                {f.title}
                                                                {f.scope === 'group' && f.groupName ? (
                                                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                                                        {f.groupName}
                                                                    </span>
                                                                ) : null}
                                                            </button>
                                                            {canEdit(f) ? (
                                                                <span className="flex shrink-0 items-center">
                                                                    <button
                                                                        type="button"
                                                                        className={cx(small, 'w-auto px-1.5 text-xs')}
                                                                        title="Replace with the current filter"
                                                                        disabled={busy === 'upd' + f.sysId}
                                                                        onClick={() =>
                                                                            run(
                                                                                'upd' + f.sysId,
                                                                                () =>
                                                                                    actions.update(f.sysId, {
                                                                                        filter: encoded,
                                                                                    }),
                                                                                `“${f.title}” now uses the current filter`
                                                                            )
                                                                        }
                                                                    >
                                                                        Update
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={small}
                                                                        aria-label={`Rename ${f.title}`}
                                                                        onClick={() =>
                                                                            setRenaming({ id: f.sysId, title: f.title })
                                                                        }
                                                                    >
                                                                        <PencilIcon />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={cx(small, 'hover:text-destructive')}
                                                                        aria-label={`Delete ${f.title}`}
                                                                        onClick={() => setConfirmDelete(f.sysId)}
                                                                    >
                                                                        <TrashIcon />
                                                                    </button>
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                );
                            })
                        )}
                    </div>
                </div>
            </Popup>
        </>
    );
}

function svg(d: string) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={d} />
        </svg>
    );
}
export function BookmarkIcon() {
    return svg('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z');
}
function PencilIcon() {
    return svg('M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z');
}
function TrashIcon() {
    return svg('M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6');
}
