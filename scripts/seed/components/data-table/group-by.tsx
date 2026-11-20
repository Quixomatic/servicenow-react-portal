import { useRef, useState } from 'react';
import type { ListColumn } from 'utilities:app/list-data';
import { Popup } from 'components:app/combobox';
import { cx, IconCheck } from 'components:app/field';

export type GroupByMenuProps = {
    /** Columns that can be grouped (the list layout's isGroupable). */
    columns: ListColumn[];
    value: string;
    onChange: (column: string) => void;
    /** Grouped: collapse / expand every group. */
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
    buttonClassName: string;
    compact?: boolean;
};

/** Toolbar "Group" button: pick a column to group by (^GROUPBY) or none; collapse / expand all. */
export function GroupByMenu(props: GroupByMenuProps) {
    const btn = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const current = props.columns.find((c) => c.name === props.value);
    const pick = (name: string) => {
        props.onChange(name);
        setOpen(false);
        if (btn.current) btn.current.focus();
    };
    const items = [{ name: '', label: 'No grouping' }].concat(
        props.columns.map((c) => ({ name: c.name, label: c.label }))
    );
    const option = (name: string, label: string) => {
        const on = name === props.value;
        return (
            <button
                key={name || '__none'}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                className={cx(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent',
                    on ? 'font-medium' : ''
                )}
                onClick={() => pick(name)}
            >
                <span className="flex size-4 shrink-0 items-center justify-center text-primary">
                    {on ? <IconCheck size={14} /> : null}
                </span>
                <span className="truncate">{label}</span>
            </button>
        );
    };
    return (
        <>
            <button
                ref={btn}
                type="button"
                className={props.buttonClassName}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                title={current ? `Grouped by ${current.label}` : 'Group by a column'}
            >
                <GroupIcon />
                <span className={props.compact ? 'sr-only 2xl:not-sr-only!' : 'max-sm:sr-only!'}>
                    {current ? `Group: ${current.label}` : 'Group'}
                </span>
            </button>
            <Popup
                anchor={btn}
                open={open}
                onDismiss={() => setOpen(false)}
                matchWidth={false}
                minWidth={220}
                maxHeight={420}
                className="p-1"
            >
                <div
                    role="menu"
                    aria-label="Group by"
                    className="flex flex-col"
                    onKeyDown={(e: any) => {
                        const all = Array.from(
                            (e.currentTarget as HTMLElement).querySelectorAll('[role^="menuitem"]')
                        ) as HTMLElement[];
                        const i = all.indexOf(e.target);
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            const n = all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length];
                            if (n) n.focus();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setOpen(false);
                            if (btn.current) btn.current.focus();
                        }
                    }}
                    ref={(el: HTMLDivElement | null) => {
                        if (el && open) {
                            const first = el.querySelector('[aria-checked="true"]') as HTMLElement | null;
                            requestAnimationFrame(() => first && first.focus());
                        }
                    }}
                >
                    <span className="px-2 py-1 text-xs font-medium text-muted-foreground">Group by</span>
                    {items.map((i) => option(i.name, i.label))}
                    {props.columns.length ? null : (
                        <span className="px-2 py-1.5 text-sm text-muted-foreground">No groupable columns shown</span>
                    )}
                    {props.value && (props.onCollapseAll || props.onExpandAll) ? (
                        <>
                            <span role="separator" className="my-1 h-px bg-border" />
                            {props.onCollapseAll ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="rounded-sm px-2 py-1.5 pl-8 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                                    onClick={() => {
                                        props.onCollapseAll!();
                                        setOpen(false);
                                    }}
                                >
                                    Collapse all groups
                                </button>
                            ) : null}
                            {props.onExpandAll ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="rounded-sm px-2 py-1.5 pl-8 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                                    onClick={() => {
                                        props.onExpandAll!();
                                        setOpen(false);
                                    }}
                                >
                                    Expand all groups
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </Popup>
        </>
    );
}

export function GroupIcon() {
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
            <path d="M3 5h18M3 12h12M3 19h8M17 15l3 3-3 3" />
        </svg>
    );
}
