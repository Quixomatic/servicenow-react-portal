import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from 'utilities:react-table';
import { useVirtualizer } from 'utilities:react-virtual';
import { cx, IconChevronDown, IconMinus, IconCheck } from 'components:app/field';
import { Popup } from 'components:app/combobox';
import type { CellValue } from 'utilities:app/list-data';
import { DefaultCell, isNumeric } from './cells';
import { PointMenu } from './menu';
import type { MenuItem } from './menu';

export type Density = 'compact' | 'normal' | 'comfortable';
export const ROW_HEIGHT: Record<Density, number> = { compact: 32, normal: 40, comfortable: 48 };

export type DataTableColumn = {
    id: string;
    header: string;
    /** Glide type: picks the default renderer and alignment. */
    type?: string;
    isChoice?: boolean;
    /** The record's display column (rendered as the "open" link). */
    isDisplay?: boolean;
    sortable?: boolean;
    width?: number;
    minWidth?: number;
    align?: 'start' | 'end' | 'center';
    /** Custom cell content. */
    cell?: (ctx: { row: any; value: CellValue | undefined; column: DataTableColumn }) => any;
};

export type SortState = { id: string; desc: boolean }[];
export type CellRef = { rowId: string; colId: string };
export type CellContext<Row> = {
    row: Row;
    rowId: string;
    rowIndex: number;
    column: DataTableColumn;
    value: CellValue | undefined;
};

export type DataTableProps<Row = any> = {
    columns: DataTableColumn[];
    rows: Row[];
    getRowId: (row: Row) => string;
    getValue: (row: Row, columnId: string) => CellValue | undefined;
    /** Accessible name of the grid. */
    label: string;
    /** Server-side sorting (controlled). Shift+click / Shift+Enter adds a secondary sort. */
    sorting?: SortState;
    onSortingChange?: (s: SortState) => void;
    /** Row selection (controlled), keyed by row id. */
    selectable?: boolean;
    selection?: Record<string, boolean>;
    onSelectionChange?: (s: Record<string, boolean>) => void;
    /** Column order / visibility are given by `columns`; sizing is controlled here. */
    columnSizing?: Record<string, number>;
    onColumnSizingChange?: (s: Record<string, number>) => void;
    onColumnResizeEnd?: (s: Record<string, number>) => void;
    density?: Density;
    wrap?: boolean;
    /** Height of the scroll area ('100%', 480, …). Virtualization needs a bounded height. */
    height?: number | string;
    maxHeight?: number | string;
    /** Virtualize rows: true, false, or 'auto' (over 60 rows). */
    virtualize?: boolean | 'auto';
    /** Infinite scroll: called when the last rows come into view. */
    onEndReached?: () => void;
    /** Total rows across pages (aria-rowcount) and the first row's index (aria-rowindex). */
    totalRows?: number;
    rowIndexOffset?: number;
    loading?: boolean;
    fetching?: boolean;
    skeletonRows?: number;
    empty?: any;
    /** Row open (display column click, Enter on the display column, double-click on a read-only cell). */
    onRowOpen?: (row: Row) => void;
    /** Items for the cell context menu (right-click, Shift+F10, Menu key). */
    contextMenu?: (ctx: CellContext<Row>) => MenuItem[];
    /** Inline edit: whether a cell may be edited, the request, and the editor for the cell being edited. */
    canEditCell?: (ctx: CellContext<Row>) => boolean;
    onEditRequest?: (ctx: CellContext<Row>) => void;
    editing?: CellRef | null;
    renderEditor?: (ctx: CellContext<Row>) => any;
    /** Minimum editor popup width for a cell (px; capped to the viewport). Default 260. */
    editorWidth?: (ctx: CellContext<Row>) => number | undefined;
    onEditorDismiss?: () => void;
    /** Content after the last row (e.g. "Loading more…"). */
    footer?: any;
    /** Rows to mark as just updated (live updates): a brief, subtle highlight; keyed by row id. */
    highlighted?: Record<string, boolean>;
    /** Extra header content per column (e.g. a column filter button); Alt+Down on a header activates it. */
    renderHeaderExtra?: (column: DataTableColumn) => any;
    /** A trailing actions cell per row (not resizable); Enter / F2 on it focuses its first control. */
    rowActions?: (row: Row) => any;
    rowActionsLabel?: string;
    /** Group header rows (grouped lists): a full-width row with a toggle; Enter / Space toggle it. */
    isGroupRow?: (row: Row) => boolean;
    renderGroupRow?: (row: Row) => any;
    onGroupToggle?: (row: Row) => void;
    /** aria-expanded of a group row. */
    isGroupExpanded?: (row: Row) => boolean;
    className?: string;
};

const SELECT_ID = '__select';
const ACTIONS_ID = '__actions';

/**
 * DataTable: TanStack Table for state (manual sorting, selection, sizing) and TanStack Virtual
 * for rows. A real <table> with role="grid": one tab stop, arrow-key cell navigation (roving
 * tabindex), Home/End, Ctrl+Home/End, PageUp/PageDown, Space selects, Enter opens or edits, F2
 * edits, Shift+F10 / Menu opens the cell menu. Sortable headers expose aria-sort.
 */
export function DataTable<Row = any>(props: DataTableProps<Row>) {
    const { columns, rows, getRowId, getValue, selectable, density = 'normal' } = props;
    const hasActions = !!props.rowActions;
    const isGroup = (row: Row | undefined) => !!row && !!props.isGroupRow && props.isGroupRow(row);
    const rowHeight = ROW_HEIGHT[density];
    const scroller = useRef<HTMLDivElement | null>(null);
    const tableRef = useRef<HTMLTableElement | null>(null);
    const selection = props.selection || EMPTY_SEL;
    const sorting = props.sorting || EMPTY_SORT;
    const [sizing, setSizing] = useState<Record<string, number>>(props.columnSizing || {});
    useEffect(() => {
        if (props.columnSizing) setSizing(props.columnSizing);
    }, [props.columnSizing]);

    // ---- TanStack Table -----------------------------------------------------------------------
    const defs = useMemo(() => {
        const list: any[] = [];
        if (selectable)
            list.push({
                id: SELECT_ID,
                size: 44,
                minSize: 44,
                maxSize: 44,
                enableResizing: false,
                enableSorting: false,
                header: '',
                meta: { select: true },
            });
        for (const c of columns)
            list.push({
                id: c.id,
                accessorFn: (row: Row) => getValue(row, c.id),
                header: c.header,
                size: c.width || defaultWidth(c),
                minSize: c.minWidth || 72,
                maxSize: 1200,
                enableSorting: c.sortable !== false,
                meta: { column: c },
            });
        if (hasActions)
            list.push({
                id: ACTIONS_ID,
                size: 56,
                minSize: 56,
                maxSize: 56,
                enableResizing: false,
                enableSorting: false,
                header: '',
                meta: { actions: true },
            });
        return list;
    }, [columns, selectable, getValue, hasActions]);

    const table = useReactTable({
        data: rows,
        columns: defs,
        getRowId: (r: Row) => getRowId(r),
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
        manualPagination: true,
        enableMultiSort: true,
        enableRowSelection: !!selectable,
        columnResizeMode: 'onChange',
        state: { sorting, rowSelection: selection, columnSizing: sizing },
        onSortingChange: (u: any) =>
            props.onSortingChange && props.onSortingChange(typeof u === 'function' ? u(sorting) : u),
        onRowSelectionChange: (u: any) =>
            props.onSelectionChange && props.onSelectionChange(typeof u === 'function' ? u(selection) : u),
        onColumnSizingChange: (u: any) =>
            setSizing((prev) => {
                const next = typeof u === 'function' ? u(prev) : u;
                if (props.onColumnSizingChange) props.onColumnSizingChange(next);
                return next;
            }),
    });
    const resizing = table.getState().columnSizingInfo.isResizingColumn;
    const wasResizing = useRef<any>(false);
    useEffect(() => {
        if (wasResizing.current && !resizing && props.onColumnResizeEnd) props.onColumnResizeEnd(sizing);
        wasResizing.current = resizing;
    }, [resizing]);

    const leafs = table.getVisibleLeafColumns();
    const headerGroups = table.getHeaderGroups();
    const headerById: Record<string, any> = {};
    for (const h of headerGroups.length ? headerGroups[headerGroups.length - 1].headers : [])
        headerById[h.column.id] = h;
    const modelRows = table.getRowModel().rows;
    const totalWidth = table.getTotalSize();

    // ---- virtualization -------------------------------------------------------------------------
    const virtualOn = props.virtualize === true || (props.virtualize !== false && rows.length > 60);
    const virtualizer = useVirtualizer({
        count: modelRows.length,
        getScrollElement: () => scroller.current,
        estimateSize: () => rowHeight,
        overscan: 12,
        enabled: virtualOn,
    });
    useEffect(() => {
        virtualizer.measure();
    }, [rowHeight, props.wrap]);
    const items = virtualOn ? virtualizer.getVirtualItems() : [];
    const padTop = virtualOn && items.length ? items[0].start : 0;
    const padBottom = virtualOn && items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
    const visibleIdx: number[] = virtualOn ? items.map((v: any) => v.index) : modelRows.map((_: any, i: number) => i);

    // Infinite scroll trigger.
    const lastVisible = visibleIdx.length ? visibleIdx[visibleIdx.length - 1] : -1;
    useEffect(() => {
        if (props.onEndReached && rows.length && lastVisible >= rows.length - 8) props.onEndReached();
    }, [lastVisible, rows.length]);
    useEffect(() => {
        if (!props.onEndReached || virtualOn) return undefined;
        const el = scroller.current;
        if (!el) return undefined;
        const onScroll = () => {
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - rowHeight * 4) props.onEndReached!();
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [props.onEndReached, virtualOn, rowHeight]);

    // ---- keyboard grid (roving tabindex) ------------------------------------------------------
    // r = -1 is the header row; c indexes visible leaf columns (the select column included).
    const [active, setActive] = useState<{ r: number; c: number }>({ r: -1, c: selectable ? 1 : 0 });
    const focusWanted = useRef(false);
    const rowCount = modelRows.length;
    const colCount = leafs.length;
    useEffect(() => {
        setActive((a) => ({
            r: Math.min(a.r, rowCount - 1),
            c: Math.min(Math.max(0, a.c), Math.max(0, colCount - 1)),
        }));
    }, [rowCount, colCount]);

    const focusCell = useCallback(
        (r: number, c: number) => {
            focusWanted.current = true;
            setActive({ r, c });
            if (r >= 0 && virtualOn) virtualizer.scrollToIndex(r, { align: 'auto' });
        },
        [virtualOn, virtualizer]
    );
    useLayoutEffect(() => {
        if (!focusWanted.current) return;
        const el =
            tableRef.current &&
            ((tableRef.current.querySelector(`[data-cell="${active.r}:${active.c}"]`) ||
                tableRef.current.querySelector(`[data-cell^="${active.r}:"]`)) as HTMLElement | null);
        if (el) {
            focusWanted.current = false;
            el.focus({ preventScroll: false });
        }
    });

    const ctxFor = (r: number, c: number): CellContext<Row> | null => {
        const row = modelRows[r];
        const leaf = leafs[c];
        if (!row || !leaf || leaf.id === SELECT_ID || leaf.id === ACTIONS_ID || isGroup(row.original)) return null;
        const column = (leaf.columnDef.meta as any).column as DataTableColumn;
        return { row: row.original, rowId: row.id, rowIndex: r, column, value: getValue(row.original, column.id) };
    };

    // Context menu state.
    const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[]; label: string } | null>(null);
    const openMenuAt = (r: number, c: number, x: number, y: number) => {
        const ctx = ctxFor(r, c);
        if (!ctx || !props.contextMenu) return false;
        const list = props.contextMenu(ctx);
        if (!list.length) return false;
        setActive({ r, c });
        setMenu({ x, y, items: list, label: `Actions for ${ctx.column.header}` });
        return true;
    };

    const toggleRow = (rowId: string, on?: boolean) => {
        if (!props.onSelectionChange) return;
        const next = { ...selection };
        const value = on === undefined ? !next[rowId] : on;
        if (value) next[rowId] = true;
        else delete next[rowId];
        props.onSelectionChange(next);
    };
    const pageIds = modelRows.filter((r: any) => !isGroup(r.original)).map((r: any) => r.id);
    const pageSelected = pageIds.filter((id: string) => selection[id]).length;
    const togglePage = () => {
        if (!props.onSelectionChange) return;
        const next = { ...selection };
        if (pageSelected === pageIds.length) pageIds.forEach((id: string) => delete next[id]);
        else pageIds.forEach((id: string) => (next[id] = true));
        props.onSelectionChange(next);
    };

    const sortHeader = (colId: string, multi: boolean) => {
        const col = table.getColumn(colId);
        if (!col || !col.getCanSort()) return;
        const cur = sorting.find((s) => s.id === colId);
        const nextDir = !cur ? { id: colId, desc: false } : !cur.desc ? { id: colId, desc: true } : null;
        let next: SortState;
        if (multi) next = sorting.filter((s) => s.id !== colId).concat(nextDir ? [nextDir] : []);
        else next = nextDir ? [nextDir] : [];
        if (props.onSortingChange) props.onSortingChange(next);
    };

    const onKeyDown = (e: any) => {
        if (e.target && e.target.closest && e.target.closest('[data-rpl-editor],[data-rpl-actions-inner]')) return;
        const { r, c } = active;
        const groupRow = r >= 0 && modelRows[r] && isGroup(modelRows[r].original) ? modelRows[r].original : null;
        if (groupRow && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            const cellEl = tableRef.current && tableRef.current.querySelector(`[data-cell="${r}:0"]`);
            const link = cellEl && (cellEl.querySelector('[data-rpl-group-link]') as HTMLElement | null);
            if (e.key === 'Enter' && e.shiftKey && link) link.click();
            else if (props.onGroupToggle) props.onGroupToggle(groupRow);
            return;
        }
        if (r >= 0 && leafs[c] && leafs[c].id === ACTIONS_ID && (e.key === 'Enter' || e.key === 'F2')) {
            const cellEl = tableRef.current && tableRef.current.querySelector(`[data-cell="${r}:${c}"]`);
            const first = cellEl && (cellEl.querySelector('button,a[href],[tabindex]') as HTMLElement | null);
            if (first) {
                e.preventDefault();
                e.stopPropagation();
                first.focus();
                return;
            }
        }
        if (r === -1 && e.altKey && e.key === 'ArrowDown') {
            const th = tableRef.current && tableRef.current.querySelector(`[data-cell="-1:${c}"]`);
            const host = th && (th.closest('th') as HTMLElement | null);
            const extra = host && (host.querySelector('[data-rpl-header-extra]') as HTMLElement | null);
            if (extra) {
                e.preventDefault();
                e.stopPropagation();
                extra.click();
                return;
            }
        }
        const page = Math.max(1, Math.floor((scroller.current ? scroller.current.clientHeight : 400) / rowHeight) - 1);
        let handled = true;
        switch (e.key) {
            case 'ArrowDown':
                focusCell(Math.min(rowCount - 1, r + 1), c);
                break;
            case 'ArrowUp':
                focusCell(Math.max(-1, r - 1), c);
                break;
            case 'ArrowRight':
                focusCell(r, Math.min(colCount - 1, c + 1));
                break;
            case 'ArrowLeft':
                focusCell(r, Math.max(0, c - 1));
                break;
            case 'Home':
                focusCell(e.ctrlKey ? 0 : r, 0);
                break;
            case 'End':
                focusCell(e.ctrlKey ? rowCount - 1 : r, colCount - 1);
                break;
            case 'PageDown':
                focusCell(Math.min(rowCount - 1, r + page), c);
                break;
            case 'PageUp':
                focusCell(Math.max(0, r - page), c);
                break;
            case ' ':
                if (r === -1) {
                    if (leafs[c] && leafs[c].id === SELECT_ID) togglePage();
                    else if (leafs[c]) sortHeader(leafs[c].id, e.shiftKey);
                } else if (selectable && modelRows[r]) toggleRow(modelRows[r].id);
                else handled = false;
                break;
            case 'Enter': {
                if (r === -1) {
                    if (leafs[c] && leafs[c].id === SELECT_ID) togglePage();
                    else if (leafs[c]) sortHeader(leafs[c].id, e.shiftKey);
                    break;
                }
                const ctx = ctxFor(r, c);
                if (!ctx) {
                    if (selectable && modelRows[r]) toggleRow(modelRows[r].id);
                    break;
                }
                if (ctx.column.isDisplay && props.onRowOpen) props.onRowOpen(ctx.row);
                else if (props.onEditRequest && (!props.canEditCell || props.canEditCell(ctx)))
                    props.onEditRequest(ctx);
                else if (props.onRowOpen) props.onRowOpen(ctx.row);
                break;
            }
            case 'F2': {
                const ctx = ctxFor(r, c);
                if (ctx && props.onEditRequest && (!props.canEditCell || props.canEditCell(ctx)))
                    props.onEditRequest(ctx);
                break;
            }
            case 'ContextMenu':
            case 'F10': {
                if (e.key === 'F10' && !e.shiftKey) {
                    handled = false;
                    break;
                }
                const el =
                    tableRef.current &&
                    (tableRef.current.querySelector(`[data-cell="${r}:${c}"]`) as HTMLElement | null);
                const rect = el ? el.getBoundingClientRect() : { left: 0, bottom: 0 };
                if (!openMenuAt(r, c, rect.left + 8, rect.bottom - 4)) handled = false;
                break;
            }
            case 'a':
                if ((e.ctrlKey || e.metaKey) && selectable) togglePage();
                else handled = false;
                break;
            default:
                handled = false;
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const sortIndex = (id: string) => sorting.findIndex((s) => s.id === id);
    const editingCtx = props.editing ? findCtx(props.editing) : null;
    function findCtx(ref: CellRef): (CellContext<Row> & { r: number; c: number }) | null {
        const r = modelRows.findIndex((x: any) => x.id === ref.rowId);
        const c = leafs.findIndex((l: any) => l.id === ref.colId);
        const ctx = r >= 0 && c >= 0 ? ctxFor(r, c) : null;
        return ctx ? { ...ctx, r, c } : null;
    }
    const editorAnchor = useRef<HTMLElement | null>(null);
    editorAnchor.current =
        editingCtx && tableRef.current
            ? (tableRef.current.querySelector(`[data-cell="${editingCtx.r}:${editingCtx.c}"]`) as HTMLElement | null)
            : null;

    const loadingSkeleton = props.loading && !rows.length;
    const skeletonCount = Math.min(props.skeletonRows || 8, 12);
    const offset = props.rowIndexOffset || 0;
    // The editor closes when its row scrolls out of the rendered window.
    const editingVisible = !!editingCtx && visibleIdx.indexOf(editingCtx.r) >= 0;

    return (
        <div
            className={cx('rpl-table relative flex min-h-0 flex-col', props.className)}
            data-density={density}
            data-wrap={props.wrap ? '' : undefined}
        >
            <div
                ref={scroller}
                className="rpl-scroll relative min-h-0 overflow-auto overscroll-contain"
                style={{ height: props.height, maxHeight: props.maxHeight }}
            >
                <table
                    ref={tableRef}
                    role="grid"
                    aria-label={props.label}
                    aria-rowcount={(props.totalRows ?? rows.length) + 1}
                    aria-colcount={colCount}
                    aria-multiselectable={selectable || undefined}
                    aria-busy={props.fetching || props.loading || undefined}
                    className="w-full border-separate border-spacing-0 text-sm"
                    style={{ tableLayout: 'fixed', minWidth: totalWidth }}
                    onKeyDown={onKeyDown}
                    onFocus={(e: any) => {
                        // Keep the roving tab stop on whatever cell or header got focus (click, Tab, script).
                        const cell = e.target && e.target.closest ? e.target.closest('[data-cell]') : null;
                        const key = cell ? cell.getAttribute('data-cell') : '';
                        if (!key) return;
                        const [r, c] = key.split(':').map(Number);
                        if (r !== active.r || c !== active.c) setActive({ r, c });
                    }}
                >
                    <colgroup>
                        {leafs.map((l: any) => (
                            <col key={l.id} style={{ width: l.getSize() }} />
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-10">
                        <tr role="row" aria-rowindex={1}>
                            {leafs.map((leaf: any, c: number) => {
                                const isActive = active.r === -1 && active.c === c;
                                if (leaf.id === SELECT_ID)
                                    return (
                                        <th key={leaf.id} role="columnheader" className="rpl-th" aria-colindex={c + 1}>
                                            <span
                                                role="checkbox"
                                                aria-checked={
                                                    pageSelected === 0
                                                        ? 'false'
                                                        : pageSelected === pageIds.length
                                                          ? 'true'
                                                          : 'mixed'
                                                }
                                                aria-label="Select all rows on this page"
                                                tabIndex={isActive ? 0 : -1}
                                                data-cell={`-1:${c}`}
                                                className="rpl-check-wrap"
                                                onClick={() => {
                                                    setActive({ r: -1, c });
                                                    togglePage();
                                                }}
                                            >
                                                <Check
                                                    state={
                                                        pageSelected === 0
                                                            ? 'off'
                                                            : pageSelected === pageIds.length
                                                              ? 'on'
                                                              : 'mixed'
                                                    }
                                                />
                                            </span>
                                        </th>
                                    );
                                if (leaf.id === ACTIONS_ID)
                                    return (
                                        <th
                                            key={leaf.id}
                                            role="columnheader"
                                            className="rpl-th rpl-actions-cell"
                                            aria-colindex={c + 1}
                                        >
                                            <span
                                                tabIndex={isActive ? 0 : -1}
                                                data-cell={`-1:${c}`}
                                                className="rpl-th-btn"
                                            >
                                                <span className="sr-only">{props.rowActionsLabel || 'Actions'}</span>
                                            </span>
                                        </th>
                                    );
                                const col = (leaf.columnDef.meta as any).column as DataTableColumn;
                                const si = sortIndex(leaf.id);
                                const dir = si >= 0 ? (sorting[si].desc ? 'descending' : 'ascending') : undefined;
                                const canSort = leaf.getCanSort();
                                return (
                                    <th
                                        key={leaf.id}
                                        role="columnheader"
                                        aria-sort={dir || (canSort ? 'none' : undefined)}
                                        aria-colindex={c + 1}
                                        className={cx('rpl-th group/th relative', alignClass(col))}
                                    >
                                        <span className="rpl-th-row">
                                            <span
                                                role={canSort ? 'button' : undefined}
                                                tabIndex={isActive ? 0 : -1}
                                                data-cell={`-1:${c}`}
                                                className={cx('rpl-th-btn', canSort ? 'cursor-pointer' : '')}
                                                onClick={(e: any) => {
                                                    setActive({ r: -1, c });
                                                    if (canSort) sortHeader(leaf.id, e.shiftKey);
                                                }}
                                                title={
                                                    canSort
                                                        ? `Sort by ${col.header} (Shift+click adds a secondary sort)`
                                                        : col.header
                                                }
                                            >
                                                <span className="truncate">
                                                    {flexRender(leaf.columnDef.header, {})}
                                                </span>
                                                {canSort ? (
                                                    <span
                                                        aria-hidden="true"
                                                        className={cx(
                                                            'rpl-sort shrink-0',
                                                            si >= 0
                                                                ? 'text-foreground'
                                                                : 'text-transparent group-hover/th:text-muted-foreground'
                                                        )}
                                                    >
                                                        <IconChevronDown
                                                            size={14}
                                                            className={si >= 0 && !sorting[si].desc ? 'rotate-180' : ''}
                                                        />
                                                    </span>
                                                ) : null}
                                                {si >= 0 && sorting.length > 1 ? (
                                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                                        {si + 1}
                                                    </span>
                                                ) : null}
                                            </span>
                                            {props.renderHeaderExtra ? props.renderHeaderExtra(col) : null}
                                        </span>
                                        {leaf.getCanResize() ? (
                                            <span
                                                role="separator"
                                                aria-orientation="vertical"
                                                aria-label={`Resize ${col.header}`}
                                                aria-valuenow={Math.round(leaf.getSize())}
                                                aria-valuemin={72}
                                                aria-valuemax={1200}
                                                tabIndex={-1}
                                                className={cx('rpl-resize', leaf.getIsResizing() ? 'is-resizing' : '')}
                                                onPointerDown={(e: any) => {
                                                    e.stopPropagation();
                                                    headerById[leaf.id].getResizeHandler()(e);
                                                }}
                                                onTouchStart={(e: any) => headerById[leaf.id].getResizeHandler()(e)}
                                                onDoubleClick={() => leaf.resetSize()}
                                                onKeyDown={(e: any) => {
                                                    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const next = {
                                                        ...sizing,
                                                        [leaf.id]: Math.max(
                                                            72,
                                                            leaf.getSize() + (e.key === 'ArrowRight' ? 16 : -16)
                                                        ),
                                                    };
                                                    setSizing(next);
                                                    if (props.onColumnSizingChange) props.onColumnSizingChange(next);
                                                    if (props.onColumnResizeEnd) props.onColumnResizeEnd(next);
                                                }}
                                            />
                                        ) : null}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {padTop > 0 ? (
                            <tr aria-hidden="true">
                                <td colSpan={colCount} style={{ height: padTop, padding: 0, border: 0 }} />
                            </tr>
                        ) : null}
                        {loadingSkeleton
                            ? Array.from({ length: skeletonCount }).map((_, i) => (
                                  <tr key={`sk${i}`} aria-hidden="true" style={{ height: rowHeight }}>
                                      {leafs.map((l: any, c: number) => (
                                          <td key={l.id} className="rpl-td">
                                              <span
                                                  className="block h-3 animate-pulse rounded bg-muted"
                                                  style={{
                                                      width:
                                                          l.id === SELECT_ID ? 16 : `${50 + ((i * 7 + c * 13) % 40)}%`,
                                                  }}
                                              />
                                          </td>
                                      ))}
                                  </tr>
                              ))
                            : visibleIdx.map((r) => {
                                  const row = modelRows[r];
                                  if (!row) return null;
                                  if (isGroup(row.original)) {
                                      const groupActive = active.r === r;
                                      return (
                                          <tr
                                              key={row.id}
                                              role="row"
                                              aria-rowindex={offset + r + 2}
                                              data-index={r}
                                              data-group=""
                                              className="rpl-tr rpl-group-tr"
                                              style={{ height: rowHeight }}
                                          >
                                              <td
                                                  role="gridcell"
                                                  colSpan={colCount}
                                                  aria-colindex={1}
                                                  aria-expanded={
                                                      props.isGroupExpanded
                                                          ? props.isGroupExpanded(row.original)
                                                          : undefined
                                                  }
                                                  tabIndex={groupActive ? 0 : -1}
                                                  data-cell={`${r}:0`}
                                                  className="rpl-td rpl-group-td"
                                                  onMouseDown={() => setActive({ r, c: 0 })}
                                                  onClick={(e: any) => {
                                                      const t = e.target;
                                                      if (t && t.closest && t.closest('[data-rpl-group-link]')) return;
                                                      if (props.onGroupToggle) props.onGroupToggle(row.original);
                                                  }}
                                              >
                                                  {props.renderGroupRow ? props.renderGroupRow(row.original) : null}
                                              </td>
                                          </tr>
                                      );
                                  }
                                  const selected = !!selection[row.id];
                                  return (
                                      <tr
                                          key={row.id}
                                          role="row"
                                          aria-rowindex={offset + r + 2}
                                          aria-selected={selectable ? selected : undefined}
                                          data-index={r}
                                          data-selected={selected ? '' : undefined}
                                          data-updated={props.highlighted && props.highlighted[row.id] ? '' : undefined}
                                          className="rpl-tr"
                                          style={props.wrap ? { minHeight: rowHeight } : { height: rowHeight }}
                                      >
                                          {row.getVisibleCells().map((cell: any, c: number) => {
                                              const isActive = active.r === r && active.c === c;
                                              if (cell.column.id === SELECT_ID)
                                                  return (
                                                      <td
                                                          key={cell.id}
                                                          role="gridcell"
                                                          className="rpl-td"
                                                          aria-colindex={c + 1}
                                                      >
                                                          <span
                                                              role="checkbox"
                                                              aria-checked={selected}
                                                              aria-label={`Select row ${offset + r + 1}`}
                                                              tabIndex={isActive ? 0 : -1}
                                                              data-cell={`${r}:${c}`}
                                                              className="rpl-check-wrap"
                                                              onClick={(e: any) => {
                                                                  setActive({ r, c });
                                                                  toggleRow(row.id);
                                                                  e.stopPropagation();
                                                              }}
                                                          >
                                                              <Check state={selected ? 'on' : 'off'} />
                                                          </span>
                                                      </td>
                                                  );
                                              if (cell.column.id === ACTIONS_ID)
                                                  return (
                                                      <td
                                                          key={cell.id}
                                                          role="gridcell"
                                                          aria-colindex={c + 1}
                                                          tabIndex={isActive ? 0 : -1}
                                                          data-cell={`${r}:${c}`}
                                                          className="rpl-td rpl-actions-cell"
                                                          onMouseDown={() => setActive({ r, c })}
                                                      >
                                                          <div
                                                              className="rpl-cell justify-center"
                                                              data-rpl-actions-inner=""
                                                          >
                                                              {props.rowActions!(row.original)}
                                                          </div>
                                                      </td>
                                                  );
                                              const col = (cell.column.columnDef.meta as any).column as DataTableColumn;
                                              const value = cell.getValue() as CellValue | undefined;
                                              const ctx: CellContext<Row> = {
                                                  row: row.original,
                                                  rowId: row.id,
                                                  rowIndex: r,
                                                  column: col,
                                                  value,
                                              };
                                              const editable =
                                                  !!props.onEditRequest &&
                                                  (!props.canEditCell || props.canEditCell(ctx));
                                              const isEditing =
                                                  !!editingCtx && editingCtx.r === r && editingCtx.c === c;
                                              return (
                                                  <td
                                                      key={cell.id}
                                                      role="gridcell"
                                                      aria-colindex={c + 1}
                                                      tabIndex={isActive ? 0 : -1}
                                                      data-cell={`${r}:${c}`}
                                                      data-editable={editable ? '' : undefined}
                                                      data-editing={isEditing ? '' : undefined}
                                                      aria-readonly={props.onEditRequest ? !editable : undefined}
                                                      className={cx('rpl-td', alignClass(col))}
                                                      onMouseDown={() => setActive({ r, c })}
                                                      onDoubleClick={() => {
                                                          if (editable && props.onEditRequest) props.onEditRequest(ctx);
                                                          else if (props.onRowOpen) props.onRowOpen(row.original);
                                                      }}
                                                      onContextMenu={(e: any) => {
                                                          if (openMenuAt(r, c, e.clientX, e.clientY))
                                                              e.preventDefault();
                                                      }}
                                                  >
                                                      <div className="rpl-cell">
                                                          {col.cell ? (
                                                              col.cell({ row: row.original, value, column: col })
                                                          ) : col.isDisplay && props.onRowOpen ? (
                                                              <a
                                                                  href="#"
                                                                  tabIndex={-1}
                                                                  className="rpl-open truncate"
                                                                  onClick={(e: any) => {
                                                                      e.preventDefault();
                                                                      props.onRowOpen!(row.original);
                                                                  }}
                                                              >
                                                                  {value && (value.displayValue || value.value)
                                                                      ? value.displayValue || value.value
                                                                      : '(empty)'}
                                                              </a>
                                                          ) : (
                                                              <DefaultCell
                                                                  name={col.id}
                                                                  type={col.type}
                                                                  isChoice={col.isChoice}
                                                                  cell={value}
                                                                  isDisplay={col.isDisplay}
                                                              />
                                                          )}
                                                      </div>
                                                  </td>
                                              );
                                          })}
                                      </tr>
                                  );
                              })}
                        {padBottom > 0 ? (
                            <tr aria-hidden="true">
                                <td colSpan={colCount} style={{ height: padBottom, padding: 0, border: 0 }} />
                            </tr>
                        ) : null}
                        {!props.loading && !rows.length ? (
                            <tr role="row">
                                <td role="gridcell" colSpan={colCount} className="rpl-empty">
                                    {props.empty || 'No records to display'}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
                {props.footer}
            </div>
            {props.fetching && rows.length ? <div className="rpl-progress" role="presentation" /> : null}
            {menu ? (
                <PointMenu
                    open
                    x={menu.x}
                    y={menu.y}
                    items={menu.items}
                    label={menu.label}
                    onClose={(refocus) => {
                        setMenu(null);
                        if (refocus || true) focusCell(active.r, active.c);
                    }}
                />
            ) : null}
            {editingCtx && editingVisible && props.renderEditor ? (
                <Popup
                    anchor={editorAnchor}
                    open
                    onDismiss={props.onEditorDismiss}
                    matchWidth
                    minWidth={Math.min(
                        (props.editorWidth && props.editorWidth(editingCtx)) || 260,
                        typeof window !== 'undefined' ? window.innerWidth - 16 : 9999
                    )}
                    maxHeight={480}
                    className="p-2"
                    aria-label={`Edit ${editingCtx.column.header}`}
                    role="dialog"
                >
                    <div
                        data-rpl-editor=""
                        onKeyDown={(e: any) => {
                            if (e.key === 'Escape' && !e.defaultPrevented) {
                                e.preventDefault();
                                if (props.onEditorDismiss) props.onEditorDismiss();
                                focusCell(editingCtx.r, editingCtx.c);
                            }
                        }}
                    >
                        {props.renderEditor(editingCtx)}
                    </div>
                </Popup>
            ) : null}
        </div>
    );
}

const EMPTY_SEL: Record<string, boolean> = {};
const EMPTY_SORT: SortState = [];

function defaultWidth(c: DataTableColumn): number {
    const t = String(c.type || '');
    if (t === 'boolean') return 96;
    if (c.isDisplay) return 140;
    if (t === 'glide_date_time' || t === 'due_date') return 176;
    if (t === 'glide_date') return 124;
    if (c.isChoice || t === 'choice') return 150;
    if (isNumeric(t)) return 112;
    if (c.id === 'short_description' || c.id === 'description' || t === 'multi_two_lines') return 320;
    return 168;
}

function alignClass(col: DataTableColumn): string {
    const a = col.align || (isNumeric(col.type) && !col.isChoice ? 'end' : 'start');
    return a === 'end' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
}

function Check({ state }: { state: 'on' | 'off' | 'mixed' }) {
    return (
        <span
            aria-hidden="true"
            className={cx(
                'flex size-4 items-center justify-center rounded-[4px] border transition-colors',
                state === 'off' ? 'border-input bg-background' : 'border-primary bg-primary text-primary-foreground'
            )}
        >
            {state === 'on' ? <IconCheck size={12} /> : state === 'mixed' ? <IconMinus size={12} /> : null}
        </span>
    );
}
