import * as React from 'react';
import { ChevronRightIcon, LoaderCircleIcon } from 'lucide-react';
import { cn } from 'cn';

// components:tree: an expandable, keyboard-navigable tree (Next Experience's now-content-tree),
// the WAI-ARIA tree view pattern.
//
//   <Tree aria-label="Categories" items={[
//       { id: 'hw', label: 'Hardware', icon: <Icon name="cpu" />, children: [{ id: 'lap', label: 'Laptops' }] },
//       { id: 'sw', label: 'Software', hasChildren: true },           // lazy: children arrive later
//   ]} defaultExpanded={['hw']} selected={id} onSelect={(id, item) => …}
//      onExpandedChange={(ids, { id, expanded }) => expanded && load(id)} />
//
// Keyboard: Up / Down move between visible items, Right opens a closed item or moves to its first
// child, Left closes an open item or moves to its parent, Home / End, Enter / Space select, `*`
// opens every sibling, and typing a letter jumps to the next item starting with it. One Tab stop
// (roving tabindex). role="tree" / "treeitem" / "group", aria-expanded, aria-selected,
// aria-level / -setsize / -posinset. Item: { id, label, icon?, children?, hasChildren?,
// loading?, disabled?, badge?, title? }. `renderLabel(item)` customises the row's content.
// flattenTree / useTreeState are exported for custom trees.

/** Visible rows in order: [{ item, level, parentId, index, setSize, expandable }]. */
function flattenTree(items, expandedSet, level = 1, parentId = null, out = []) {
    const list = items || [];
    list.forEach((item, index) => {
        const expandable = !!((item.children && item.children.length) || item.hasChildren);
        out.push({ item, level, parentId, index, setSize: list.length, expandable });
        if (expandable && expandedSet.has(item.id) && item.children)
            flattenTree(item.children, expandedSet, level + 1, item.id, out);
    });
    return out;
}

/** Controlled-or-uncontrolled expanded / selected state for a tree. */
function useTreeState({ expanded, defaultExpanded, onExpandedChange, selected, defaultSelected, onSelect } = {}) {
    const [expandedState, setExpandedState] = React.useState(() => defaultExpanded || []);
    const [selectedState, setSelectedState] = React.useState(defaultSelected === undefined ? null : defaultSelected);
    const expandedList = expanded === undefined ? expandedState : expanded;
    const expandedSet = React.useMemo(() => new Set(expandedList), [expandedList]);
    const current = selected === undefined ? selectedState : selected;
    const setExpanded = (id, open) => {
        if (expandedSet.has(id) === open) return;
        const next = open ? expandedList.concat([id]) : expandedList.filter((x) => x !== id);
        if (expanded === undefined) setExpandedState(next);
        if (onExpandedChange) onExpandedChange(next, { id, expanded: open });
    };
    const expandMany = (ids) => {
        const add = ids.filter((id) => !expandedSet.has(id));
        if (!add.length) return;
        const next = expandedList.concat(add);
        if (expanded === undefined) setExpandedState(next);
        if (onExpandedChange) add.forEach((id) => onExpandedChange(next, { id, expanded: true }));
    };
    const select = (id, item) => {
        if (selected === undefined) setSelectedState(id);
        if (onSelect) onSelect(id, item);
    };
    return { expandedSet, setExpanded, expandMany, selected: current, select };
}

function Tree({
    className,
    items,
    expanded,
    defaultExpanded,
    onExpandedChange,
    selected,
    defaultSelected,
    onSelect,
    renderLabel,
    size = 'default',
    ...props
}) {
    const state = useTreeState({ expanded, defaultExpanded, onExpandedChange, selected, defaultSelected, onSelect });
    const rows = flattenTree(items, state.expandedSet);
    const rowById = new Map(rows.map((r) => [r.item.id, r]));
    const [focusId, setFocusId] = React.useState(null);
    const refs = React.useRef(new Map());
    const typeahead = React.useRef({ text: '', at: 0 });
    const ids = rows.map((r) => r.item.id);
    const activeId =
        focusId !== null && ids.indexOf(focusId) >= 0
            ? focusId
            : state.selected !== null && ids.indexOf(state.selected) >= 0
              ? state.selected
              : ids[0];
    const focus = (id) => {
        setFocusId(id);
        const el = refs.current.get(id);
        if (el) el.focus();
    };
    const onKeyDown = (event, row) => {
        const i = ids.indexOf(row.item.id);
        const id = row.item.id;
        const open = state.expandedSet.has(id);
        let handled = true;
        switch (event.key) {
            case 'ArrowDown':
                if (i < ids.length - 1) focus(ids[i + 1]);
                break;
            case 'ArrowUp':
                if (i > 0) focus(ids[i - 1]);
                break;
            case 'ArrowRight':
                if (row.expandable && !open) state.setExpanded(id, true);
                else if (row.expandable && open && rows[i + 1] && rows[i + 1].parentId === id) focus(ids[i + 1]);
                break;
            case 'ArrowLeft':
                if (row.expandable && open) state.setExpanded(id, false);
                else if (row.parentId !== null) focus(row.parentId);
                break;
            case 'Home':
                focus(ids[0]);
                break;
            case 'End':
                focus(ids[ids.length - 1]);
                break;
            case 'Enter':
            case ' ':
                if (!row.item.disabled) {
                    state.select(id, row.item);
                    if (row.expandable && event.key === 'Enter' && !open) state.setExpanded(id, true);
                }
                break;
            case '*':
                state.expandMany(rows.filter((r) => r.parentId === row.parentId && r.expandable).map((r) => r.item.id));
                break;
            default:
                handled = false;
                if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    const now = Date.now();
                    const t = typeahead.current;
                    t.text = now - t.at > 600 ? event.key.toLowerCase() : t.text + event.key.toLowerCase();
                    t.at = now;
                    const order = ids.slice(i + 1).concat(ids.slice(0, i + 1));
                    const match = order.find((x) => {
                        const r = rowById.get(x);
                        return (
                            String(r.item.label || '')
                                .toLowerCase()
                                .indexOf(t.text) === 0
                        );
                    });
                    if (match !== undefined) {
                        focus(match);
                        handled = true;
                    }
                }
        }
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    // Rows render flat (aria-level carries the nesting); groups wrap each open item's children.
    const renderLevel = (list, level, parentId) =>
        (list || []).map((item, index) => {
            const row = rowById.get(item.id);
            if (!row) return null;
            const open = state.expandedSet.has(item.id);
            const isSelected = state.selected === item.id;
            const indent = size === 'sm' ? 12 : 16;
            return (
                <li
                    key={item.id}
                    role="treeitem"
                    ref={(el) => {
                        if (el) refs.current.set(item.id, el);
                        else refs.current.delete(item.id);
                    }}
                    tabIndex={item.id === activeId ? 0 : -1}
                    aria-level={level}
                    aria-setsize={list.length}
                    aria-posinset={index + 1}
                    aria-expanded={row.expandable ? open : undefined}
                    aria-selected={isSelected}
                    aria-disabled={item.disabled || undefined}
                    aria-busy={item.loading || undefined}
                    title={item.title}
                    data-slot="tree-item"
                    onKeyDown={(e) => {
                        if (e.target === e.currentTarget) onKeyDown(e, row);
                    }}
                    onFocus={(e) => {
                        if (e.target === e.currentTarget) setFocusId(item.id);
                    }}
                    className="outline-none [&:focus-visible>[data-slot=tree-row]]:ring-[3px] [&:focus-visible>[data-slot=tree-row]]:ring-ring/50"
                >
                    <div
                        data-slot="tree-row"
                        data-selected={isSelected || undefined}
                        onClick={() => {
                            focus(item.id);
                            if (item.disabled) return;
                            state.select(item.id, item);
                        }}
                        style={{ paddingLeft: (level - 1) * indent + 4 }}
                        className={cn(
                            'flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md pr-2 text-sm text-foreground select-none hover:bg-muted',
                            size === 'sm' ? 'h-7' : 'h-8',
                            isSelected && 'bg-accent font-medium text-accent-foreground hover:bg-accent',
                            item.disabled && 'cursor-not-allowed opacity-50'
                        )}
                    >
                        <span
                            aria-hidden="true"
                            onClick={(e) => {
                                if (!row.expandable) return;
                                e.stopPropagation();
                                focus(item.id);
                                state.setExpanded(item.id, !open);
                            }}
                            className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground',
                                row.expandable && 'hover:bg-foreground/10'
                            )}
                        >
                            {item.loading ? (
                                <LoaderCircleIcon className="size-3.5 animate-spin" />
                            ) : row.expandable ? (
                                <ChevronRightIcon
                                    className={cn('size-3.5 transition-transform', open && 'rotate-90')}
                                />
                            ) : null}
                        </span>
                        {item.icon ? (
                            <span aria-hidden="true" className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
                                {item.icon}
                            </span>
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">{renderLabel ? renderLabel(item) : item.label}</span>
                        {item.badge !== undefined && item.badge !== null ? (
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.badge}</span>
                        ) : null}
                    </div>
                    {row.expandable && open && item.children && item.children.length ? (
                        <ul role="group" className="m-0 list-none p-0">
                            {renderLevel(item.children, level + 1, item.id)}
                        </ul>
                    ) : null}
                </li>
            );
        });
    return (
        <ul role="tree" data-slot="tree" className={cn('m-0 flex list-none flex-col p-0', className)} {...props}>
            {renderLevel(items, 1, null)}
        </ul>
    );
}

export { Tree, flattenTree, useTreeState };
