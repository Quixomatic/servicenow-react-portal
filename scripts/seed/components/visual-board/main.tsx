/**
 * components:app/visual-board: records as a kanban board (Next Experience's now-visual-board), one
 * lane per value of a choice or reference field (state, assignment group, priority…).
 *
 *   <VisualBoard table="incident" field="state" query="active=true" onOpen={open} />
 *   <VisualBoard table="incident" field="assignment_group" laneQuery="type=..." wip={{ [groupId]: 10 }} />
 *   const { lanes, meta, isLoading } = useBoardLanes({ table, field, query, lanes?, laneQuery?, hideEmpty? })
 *   const lane = useLaneCards({ table, field, query, lane, columns, orderBy, perLane, keywords })
 *   laneCondition(field, value)        the encoded condition of one lane ('state=2', 'assigned_toISEMPTY')
 *   parseWip('2:10,3:5')               { '2': 10, '3': 5 }
 *
 * - Lanes: a choice field's choices in their order (empty lanes too, unless hideEmpty); a reference
 *   field's values that have records (the platform's group-by), or the records of `laneQuery` on the
 *   referenced table; `lanes` restricts and orders them by value ('' = the empty lane).
 * - Each lane loads its own cards (utilities:app/list-data, read as the user) with a server count and
 *   Show more; `keywords` searches every lane. Live: the record watch on table + query refetches.
 * - Cards: title / subtitle and key fields from the list row, rendered like app/record-card
 *   (SummaryValue: references preview, statuses highlight); the title opens the full RecordCard.
 * - Moves: drag a card to another lane, or focus its title and press Space, the arrow keys, Space
 *   (Escape cancels), or use its "Move to" menu. The write goes through app/record-update (the
 *   record's form save: UI policies, client scripts, business rules, data policies, ACLs). When the
 *   form needs more (e.g. Resolved needs resolution notes) a dialog asks; a failure or Cancel rolls
 *   the card back with a toast; success toasts with Undo.
 * - WIP limits (`wip`): the lane header shows count / limit and turns red over the limit; moving a
 *   card into a full lane still works but warns.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast, useRecordWatch } from '@portal/runtime';
import { useQueryClient } from 'utilities:react-query';
import { useInfiniteList, useList, listKeys } from 'utilities:app/list-data';
import type { ListRow } from 'utilities:app/list-data';
import { useTableMeta } from 'utilities:app/graphql';
import type { FieldMeta } from 'utilities:app/graphql';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    pointerWithin,
    closestCenter,
} from 'utilities:dnd-kit';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuGroup,
} from 'components:dropdown-menu';
import { RecordCard, SummaryValue, summaryFieldsFor, titleFieldFor } from 'components:app/record-card';
import type { SummaryItem } from 'components:app/record-card';
import { HighlightedValue } from 'components:app/highlighted-value';
import { useRecordUpdate, updateWithUndo } from 'components:app/record-update';
import { cx, Spinner } from 'components:app/field';

export type BoardLane = {
    /** Field value ('' = empty). */
    value: string;
    label: string;
    /** Encoded condition selecting the lane's records. */
    condition: string;
};

const STATUS_FIELDS = [
    'state',
    'stage',
    'approval',
    'priority',
    'risk',
    'impact',
    'urgency',
    'severity',
    'incident_state',
];

/** The encoded condition of one lane. */
export function laneCondition(field: string, value: string): string {
    return value ? `${field}=${value}` : `${field}ISEMPTY`;
}

/** 'value:limit' comma list → { value: limit }. */
export function parseWip(text: string | Record<string, number> | undefined): Record<string, number> {
    if (!text) return {};
    if (typeof text === 'object') return text;
    const out: Record<string, number> = {};
    for (const part of String(text).split(',')) {
        const i = part.lastIndexOf(':');
        if (i <= 0) continue;
        const n = Number(part.slice(i + 1));
        if (n > 0) out[part.slice(0, i).trim()] = n;
    }
    return out;
}

function and(a: string, b: string): string {
    return [a, b].filter((x) => x && x.trim()).join('^');
}

export type UseBoardLanesOptions = {
    table: string;
    field: string;
    query?: string;
    /** Values to show, in order ('' = the empty lane); default all. */
    lanes?: string[];
    /** Reference fields: lanes are the referenced records matching this query. */
    laneQuery?: string;
    /** Hide choice lanes with no records. */
    hideEmpty?: boolean;
    /** The empty lane's label (default "None"). */
    emptyLabel?: string;
};

/** The board's lanes (see the file comment). */
export function useBoardLanes(o: UseBoardLanesOptions) {
    const meta = useTableMeta(o.table, { enabled: !!o.table });
    const fm: FieldMeta | undefined = meta.data ? meta.data[o.field] : undefined;
    const refTable = fm && fm.reference ? fm.reference.table : '';
    const choices = fm && fm.choices && fm.choices.length ? fm.choices : null;
    // Which values have records (group-by: counts per value, up to 20 groups a page).
    const grouped = useList(
        { table: o.table, columns: o.field, query: o.query || '', groupBy: o.field, limit: 1 },
        { enabled: !!fm && (!choices || !!o.hideEmpty) && !o.laneQuery }
    );
    const refs = useList(
        { table: refTable, query: o.laneQuery || '', limit: 30 },
        { enabled: !!refTable && !!o.laneQuery }
    );
    const emptyLabel = o.emptyLabel || 'None';
    const lanes = useMemo<BoardLane[]>(() => {
        if (!fm) return [];
        let list: BoardLane[] = [];
        if (o.laneQuery && refTable) {
            list = refs.rows.map((r) => ({
                value: r.sysId,
                label: r.display || r.sysId,
                condition: laneCondition(o.field, r.sysId),
            }));
        } else if (choices) {
            const present = new Set(
                (grouped.data && grouped.data.groups ? grouped.data.groups : []).map((g) => g.value)
            );
            list = choices
                .filter((c) => c.value !== '')
                .filter((c) => !o.hideEmpty || present.has(c.value))
                .map((c) => ({ value: c.value, label: c.label, condition: laneCondition(o.field, c.value) }));
        } else {
            const groups = (grouped.data && grouped.data.groups) || [];
            list = groups.map((g) => ({
                value: g.value,
                label: g.value ? g.displayValue || g.value : emptyLabel,
                condition: g.aggregateQuery || laneCondition(o.field, g.value),
            }));
            // Empty lane last.
            list.sort((a, b) => (a.value ? 0 : 1) - (b.value ? 0 : 1));
        }
        if (o.lanes && o.lanes.length) {
            const order = o.lanes;
            const byValue = new Map(list.map((l) => [l.value, l]));
            list = order
                .map(
                    (v) =>
                        byValue.get(v) ||
                        (v === '' ? { value: '', label: emptyLabel, condition: laneCondition(o.field, '') } : undefined)
                )
                .filter(Boolean) as BoardLane[];
        }
        return list;
    }, [
        fm,
        choices,
        refTable,
        o.laneQuery,
        refs.rows,
        grouped.data,
        (o.lanes || []).join(','),
        o.hideEmpty,
        emptyLabel,
        o.field,
    ]);
    return {
        lanes,
        meta: meta.data || undefined,
        fieldMeta: fm,
        isLoading: meta.isLoading || grouped.isLoading || refs.isLoading,
        error: (meta.error as Error | null) || grouped.error || refs.error,
    };
}

export type UseLaneCardsOptions = {
    table: string;
    query?: string;
    lane: BoardLane;
    columns: string[];
    orderBy?: { field: string; desc: boolean }[];
    perLane?: number;
    keywords?: string;
};

/** One lane's cards: pages of `perLane` with the server count. */
export function useLaneCards(o: UseLaneCardsOptions) {
    return useInfiniteList({
        table: o.table,
        columns: o.columns.join(','),
        query: and(o.query || '', o.lane.condition),
        orderBy: o.orderBy,
        keywords: o.keywords || undefined,
        limit: o.perLane || 20,
    });
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
    let node: any = el.parentNode;
    while (node) {
        if (node.nodeType === 11) node = node.host; // shadow root → host
        if (!node || node === document.documentElement || node === document.body) return null;
        if (node.nodeType === 1) {
            const st = getComputedStyle(node);
            if (/(auto|scroll)/.test(st.overflowY) && node.clientHeight > 0) return node;
        }
        node = node.parentNode;
    }
    return null;
}

/**
 * The height that makes `ref` end exactly at the bottom of its scroll container (the page content
 * area): its current height plus whatever the container's content is short of / over its height,
 * so the page itself never scrolls. Re-measured on resize. undefined until measured / when off.
 */
export function useFillHeight(ref: { current: HTMLElement | null }, enabled: boolean, min = 280) {
    const [height, setHeight] = useState<number | undefined>(undefined);
    useLayoutEffect(() => {
        if (!enabled) return undefined;
        const el = ref.current;
        if (!el) return undefined;
        let observed: HTMLElement | null = null;
        let frame = 0;
        const measure = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const sp = el.isConnected ? findScrollParent(el) : null;
                if (sp && sp !== observed && ro) {
                    ro.observe(sp);
                    observed = sp;
                }
                let h: number;
                if (sp) {
                    let content = 0;
                    for (const child of Array.from(sp.children) as HTMLElement[]) {
                        const cs = getComputedStyle(child);
                        if (cs.position === 'absolute' || cs.position === 'fixed') continue;
                        content +=
                            child.getBoundingClientRect().height +
                            (parseFloat(cs.marginTop) || 0) +
                            (parseFloat(cs.marginBottom) || 0);
                    }
                    h = el.getBoundingClientRect().height + (sp.clientHeight - content);
                } else h = window.innerHeight - el.getBoundingClientRect().top - 16;
                setHeight(Math.max(min, Math.floor(h)));
            });
        };
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        if (ro) ro.observe(document.documentElement);
        measure();
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(frame);
            if (ro) ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [enabled, min]);
    return height;
}

export type VisualBoardProps = {
    table: string;
    /** The choice or reference field the lanes group by. */
    field: string;
    query?: string;
    lanes?: string[];
    laneQuery?: string;
    hideEmpty?: boolean;
    emptyLabel?: string;
    /** Key fields on the cards (default app/record-card's, minus the lane field). */
    cardFields?: string[];
    /** Card order (default most recently updated first). */
    orderBy?: { field: string; desc: boolean }[];
    perLane?: number;
    /** WIP limits by lane value ('2:10,3:5' or an object). */
    wip?: string | Record<string, number>;
    /** Drag / Move to (default true; also needs write access to the field). */
    movable?: boolean;
    /** Search box over every lane (default true). */
    search?: boolean;
    /**
     * 'fill': the lane strip takes the height left in the page's scroll container (exact fit, no page
     * scrollbar; only the lanes and the strip scroll). Default: lanes cap at 70vh.
     */
    height?: 'fill' | 'auto';
    /**
     * Where the toolbar (search, "Grouped by …") goes: a function that receives it, e.g. into a
     * utilities:app/header-slots HeaderSlot. Default: above the lanes.
     */
    toolbarSlot?: (toolbar: any) => any;
    live?: boolean;
    /** "Open record" (default: the classic form in a new tab). */
    onOpen?: (table: string, sysId: string) => void;
    className?: string;
};

type Moved = { row: ListRow; from: string; to: string };
type DragData = { row: ListRow; lane: string; title: string };

/** The board. See the file comment. */
export function VisualBoard(props: VisualBoardProps) {
    const board = useBoardLanes(props);
    const m = board.meta;
    const fieldLabel = (board.fieldMeta && board.fieldMeta.label) || props.field;
    const titleField = titleFieldFor(m);
    const subField = titleField === 'number' && m && m.short_description ? 'short_description' : '';
    const cardFields = useMemo(() => {
        const base = props.cardFields && props.cardFields.length ? props.cardFields : summaryFieldsFor(props.table, m);
        return base.filter((f) => f !== props.field && f !== titleField && f !== subField && (!m || m[f])).slice(0, 4);
    }, [m, props.table, props.field, (props.cardFields || []).join(',')]);
    const columns = useMemo(
        () => Array.from(new Set([titleField, subField, props.field].concat(cardFields).filter(Boolean))),
        [titleField, subField, props.field, cardFields]
    );
    const orderBy = props.orderBy || [{ field: 'sys_updated_on', desc: true }];
    const wip = useMemo(
        () => parseWip(props.wip),
        [typeof props.wip === 'string' ? props.wip : JSON.stringify(props.wip || {})]
    );
    const canMove = props.movable !== false && !!board.fieldMeta && board.fieldMeta.canWrite !== false;
    const [keywords, setKeywords] = useState('');
    const [typed, setTyped] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setKeywords(typed.trim()), 300);
        return () => clearTimeout(t);
    }, [typed]);
    useRecordWatch(props.table, props.query || '', undefined, { enabled: props.live !== false && !!props.table });

    // Optimistic moves (sys_id → move) until the lanes refetch.
    const [moved, setMoved] = useState<Record<string, Moved>>({});
    const qc = useQueryClient();
    const updater = useRecordUpdate();
    const [a11yEl, setA11yEl] = useState<HTMLDivElement | null>(null);
    const fill = props.height === 'fill';
    const stripRef = useRef<HTMLDivElement | null>(null);
    const fillHeight = useFillHeight(stripRef, fill && board.lanes.length > 0);
    const [dragging, setDragging] = useState<DragData | null>(null);
    const laneLabel = (v: string) => {
        const l = board.lanes.find((x) => x.value === v);
        return l ? l.label : v || props.emptyLabel || 'None';
    };
    const [counts, setCounts] = useState<Record<string, number>>({});
    const reportCount = (v: string, n: number) => setCounts((c) => (c[v] === n ? c : { ...c, [v]: n }));

    const move = async (row: ListRow, from: string, to: string) => {
        if (from === to) return;
        const lane = board.lanes.find((l) => l.value === to);
        if (!lane) return;
        const label = row.display || (row.cells[titleField] && row.cells[titleField].displayValue) || 'Record';
        const limit = wip[to];
        if (limit && (counts[to] || 0) + 1 > limit) toast.warning(`${lane.label} is over its WIP limit (${limit})`);
        setMoved((cur) => ({ ...cur, [row.sysId]: { row, from, to } }));
        const prev = row.cells[props.field] ? row.cells[props.field].value : '';
        const outcome = await updateWithUndo(
            updater,
            {
                table: row.className || props.table,
                sysId: row.sysId,
                values: { [props.field]: { value: to, displayValue: lane.label } },
                label,
                description: `Move to ${lane.label}`,
            },
            { [props.field]: { value: prev, displayValue: laneLabel(prev) } },
            { success: `${label} moved to ${lane.label}` }
        );
        if (outcome.ok) await qc.refetchQueries({ queryKey: listKeys.table(props.table) }).catch(() => {});
        setMoved((cur) => {
            const n = { ...cur };
            delete n[row.sysId];
            return n;
        });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: (event: any, args: any) => {
                // Left / right: the previous / next lane, in the board's order.
                if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return undefined;
                const c = args.context;
                const data = c.active && c.active.data && c.active.data.current;
                const cur = c.over ? String(c.over.id).slice(5) : data ? data.lane : '';
                const i = board.lanes.findIndex((l) => l.value === cur);
                const n = board.lanes[i + (event.code === 'ArrowLeft' ? -1 : 1)];
                const rect = n ? c.droppableRects.get(`lane|${n.value}`) : null;
                if (!rect) return undefined;
                const w = c.collisionRect ? c.collisionRect.width : 0;
                return { x: rect.left + rect.width / 2 - w / 2, y: rect.top + 48 };
            },
            keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
        })
    );
    const ctx: BoardCtx = {
        table: props.table,
        field: props.field,
        meta: m,
        titleField,
        subField,
        cardFields,
        lanes: board.lanes,
        canMove,
        onOpen: props.onOpen,
        move,
    };

    if (board.error)
        return (
            <p role="alert" className="m-0 text-sm text-destructive">
                {board.error.message}
            </p>
        );
    if (board.isLoading && !board.lanes.length)
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
                <Spinner label="Loading the board" /> Loading the board…
            </div>
        );
    if (!board.fieldMeta)
        return (
            <p className="m-0 text-sm text-muted-foreground">{`${props.table}.${props.field} isn't a field you can read.`}</p>
        );

    return (
        <div
            className={cx('flex min-w-0 flex-col gap-3 contain-inline-size', props.className)}
            data-rp-visual-board={`${props.table}.${props.field}`}
        >
            {props.search !== false
                ? (props.toolbarSlot || ((t: any) => t))(
                      <div className="flex min-w-0 flex-wrap items-center gap-2" data-rp-board-toolbar="">
                          <label className="relative flex min-w-0 max-w-xs flex-1 items-center">
                              <span className="sr-only">Search the board</span>
                              <Icon
                                  name="search"
                                  className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
                                  aria-hidden="true"
                              />
                              <input
                                  type="search"
                                  value={typed}
                                  onChange={(e: any) => setTyped(e.target.value)}
                                  placeholder="Search cards"
                                  className="h-8 w-full min-w-0 rounded-md border border-input bg-transparent pr-2.5 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                  data-rp-board-search=""
                              />
                          </label>
                          <span className="text-xs text-muted-foreground">
                              Grouped by {fieldLabel}
                              {canMove && !props.toolbarSlot ? ' · drag cards, or focus one and press Space' : ''}
                          </span>
                      </div>
                  )
                : null}
            <DndContext
                sensors={sensors}
                collisionDetection={(args: any) => {
                    const p = pointerWithin(args);
                    return p.length ? p : closestCenter(args);
                }}
                accessibility={{
                    container: a11yEl || undefined,
                    announcements: {
                        onDragStart: ({ active }: any) =>
                            `Picked up ${active.data.current ? active.data.current.title : 'card'}. Left and right arrows move it between lanes, Space drops it, Escape cancels.`,
                        onDragOver: ({ over }: any) =>
                            over ? `Over ${laneLabel(String(over.id).slice(5))}.` : 'Not over a lane.',
                        onDragEnd: ({ over }: any) =>
                            over ? `Dropped in ${laneLabel(String(over.id).slice(5))}.` : 'Dropped. Nothing changed.',
                        onDragCancel: () => 'Cancelled. Nothing changed.',
                    },
                    screenReaderInstructions: {
                        draggable:
                            'Press Enter to open the record card. To move it to another lane, press Space, use the left and right arrow keys, then press Space again.',
                    },
                }}
                onDragStart={({ active }: any) => setDragging((active.data.current as DragData) || null)}
                onDragCancel={() => setDragging(null)}
                onDragEnd={({ active, over }: any) => {
                    setDragging(null);
                    const d = active.data.current as DragData | undefined;
                    if (d && over) move(d.row, d.lane, String(over.id).slice(5));
                }}
            >
                <div
                    ref={stripRef}
                    className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2"
                    style={fill && fillHeight ? { height: fillHeight } : undefined}
                    role="list"
                    aria-label={`Board by ${fieldLabel}`}
                >
                    {board.lanes.map((lane) => (
                        <Lane
                            key={lane.value || '(empty)'}
                            lane={lane}
                            ctx={ctx}
                            query={props.query}
                            columns={columns}
                            orderBy={orderBy}
                            perLane={props.perLane}
                            keywords={keywords}
                            wip={wip[lane.value]}
                            moved={moved}
                            reportCount={reportCount}
                            fill={fill}
                        />
                    ))}
                    {!board.lanes.length ? (
                        <p className="m-0 text-sm text-muted-foreground">No lanes to show.</p>
                    ) : null}
                </div>
                <DragOverlay dropAnimation={null}>
                    {dragging ? (
                        <div className="pointer-events-none w-64 rounded-lg border border-border bg-card p-3 text-sm font-medium shadow-lg ring-1 ring-foreground/10">
                            {dragging.title}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
            <div ref={setA11yEl} />
            {updater.element}
        </div>
    );
}

type BoardCtx = {
    table: string;
    field: string;
    meta: Record<string, FieldMeta> | undefined;
    titleField: string;
    subField: string;
    cardFields: string[];
    lanes: BoardLane[];
    canMove: boolean;
    onOpen?: (table: string, sysId: string) => void;
    move: (row: ListRow, from: string, to: string) => void;
};

function Lane(props: {
    lane: BoardLane;
    ctx: BoardCtx;
    query?: string;
    columns: string[];
    orderBy: { field: string; desc: boolean }[];
    perLane?: number;
    keywords: string;
    wip?: number;
    moved: Record<string, Moved>;
    reportCount: (value: string, n: number) => void;
    fill?: boolean;
}) {
    const { lane, ctx } = props;
    const cards = useLaneCards({
        table: ctx.table,
        query: props.query,
        lane,
        columns: props.columns,
        orderBy: props.orderBy,
        perLane: props.perLane,
        keywords: props.keywords,
    });
    const drop = useDroppable({ id: `lane|${lane.value}` });
    const movedIn = Object.values(props.moved).filter((x) => x.to === lane.value);
    const movedOut = new Set(
        Object.values(props.moved)
            .filter((x) => x.to !== lane.value)
            .map((x) => x.row.sysId)
    );
    const rows = movedIn
        .map((x) => x.row)
        .concat(cards.rows.filter((r) => !movedOut.has(r.sysId) && !movedIn.some((x) => x.row.sysId === r.sysId)));
    const outCount = cards.rows.filter((r) => movedOut.has(r.sysId)).length;
    const count = Math.max(
        0,
        cards.count + movedIn.filter((x) => !cards.rows.some((r) => r.sysId === x.row.sysId)).length - outCount
    );
    useEffect(() => props.reportCount(lane.value, count), [count]);
    const over = !!props.wip && count > props.wip;
    const status = STATUS_FIELDS.indexOf(ctx.field) >= 0;
    const headingId = `rp-lane-${ctx.field}-${lane.value || 'empty'}`;
    return (
        <section
            ref={drop.setNodeRef}
            role="listitem"
            aria-labelledby={headingId}
            className={cx(
                'flex w-[85%] max-w-80 min-w-64 shrink-0 snap-start flex-col rounded-xl border bg-muted/40',
                props.fill ? 'h-full min-h-0' : 'max-h-[70vh]',
                over ? 'border-destructive/50 bg-destructive/5' : 'border-border',
                drop.isOver ? 'ring-2 ring-primary/50' : ''
            )}
            data-rp-board-lane={lane.value}
        >
            <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                <h3 id={headingId} className="m-0 flex min-w-0 flex-1 items-center text-sm font-semibold">
                    {status ? (
                        <HighlightedValue label={lane.label} field={ctx.field} value={lane.value} size="sm" />
                    ) : (
                        <span className="truncate">{lane.label}</span>
                    )}
                </h3>
                <span
                    className={cx(
                        'shrink-0 rounded-full px-2 text-xs tabular-nums',
                        over
                            ? 'bg-destructive/15 font-semibold text-destructive'
                            : 'bg-background text-muted-foreground'
                    )}
                    title={props.wip ? `WIP limit ${props.wip}` : undefined}
                    data-rp-lane-count=""
                >
                    {cards.isLoading ? '…' : props.wip ? `${count} / ${props.wip}` : count}
                    {over ? <span className="sr-only"> (over the WIP limit)</span> : null}
                </span>
            </header>
            <ol
                className="m-0 flex min-h-16 list-none flex-col gap-2 overflow-y-auto px-2 pb-2"
                aria-label={`${lane.label} cards`}
            >
                {rows.map((row) => (
                    <li key={row.sysId}>
                        <BoardCard row={row} lane={lane.value} ctx={ctx} pending={!!props.moved[row.sysId]} />
                    </li>
                ))}
                {!cards.isLoading && !rows.length ? (
                    <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        No cards
                    </li>
                ) : null}
                {cards.isLoading ? (
                    <li className="flex items-center justify-center py-3">
                        <Spinner label={`Loading ${lane.label}`} />
                    </li>
                ) : null}
            </ol>
            {cards.hasNextPage ? (
                <div className="px-2 pb-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={cards.isFetchingNextPage}
                        onClick={() => cards.fetchNextPage()}
                        data-rp-lane-more=""
                    >
                        {cards.isFetchingNextPage ? <Spinner label="Loading" /> : null}
                        Show more ({Math.max(0, cards.count - cards.rows.length)})
                    </Button>
                </div>
            ) : null}
        </section>
    );
}

function itemOf(row: ListRow, field: string, meta: Record<string, FieldMeta> | undefined): SummaryItem {
    const fm = meta && meta[field];
    const c = row.cells[field] || { value: '', displayValue: '' };
    return {
        field,
        label: (fm && fm.label) || field,
        type: (fm && (fm.type || fm.internalType)) || 'string',
        value: c.value,
        displayValue: c.displayValue,
        refTable: fm && fm.reference ? fm.reference.table : undefined,
    };
}

/** One card: title (opens the record card), subtitle, key fields, Move to. */
function BoardCard({ row, lane, ctx, pending }: { row: ListRow; lane: string; ctx: BoardCtx; pending: boolean }) {
    const title =
        (ctx.titleField && row.cells[ctx.titleField] && row.cells[ctx.titleField].displayValue) ||
        row.display ||
        row.sysId;
    const sub = ctx.subField && row.cells[ctx.subField] ? row.cells[ctx.subField].displayValue : '';
    const [open, setOpen] = useState(false);
    const drag = useDraggable({
        id: `card|${row.sysId}`,
        data: { row, lane, title },
        disabled: !ctx.canMove || pending,
    });
    const [wasDragged, setWasDragged] = useState(false);
    useEffect(() => {
        if (drag.isDragging) setWasDragged(true);
    }, [drag.isDragging]);
    const others = ctx.lanes.filter((l) => l.value !== lane);
    return (
        <article
            ref={drag.setNodeRef}
            {...drag.listeners}
            className={cx(
                'flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xs',
                ctx.canMove ? 'cursor-grab active:cursor-grabbing' : '',
                drag.isDragging ? 'opacity-40' : '',
                pending ? 'animate-pulse' : ''
            )}
            aria-label={`${title}${sub ? ', ' + sub : ''}`}
            data-rp-board-card={row.sysId}
        >
            <div className="flex items-start gap-1">
                <Popover
                    open={open}
                    onOpenChange={(o: boolean) => {
                        if (o && wasDragged) {
                            setWasDragged(false);
                            return;
                        }
                        setOpen(o);
                    }}
                >
                    <PopoverTrigger
                        ref={drag.setActivatorNodeRef}
                        {...drag.attributes}
                        className="min-w-0 flex-1 cursor-pointer rounded-sm text-left text-sm font-semibold outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        onDoubleClick={() => ctx.onOpen && ctx.onOpen(row.className || ctx.table, row.sysId)}
                        data-rp-card-title=""
                    >
                        <span className="block truncate">{title}</span>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-3">
                        <RecordCard
                            table={row.className || ctx.table}
                            sysId={row.sysId}
                            onOpen={ctx.onOpen ? (t: string, id: string) => ctx.onOpen!(t, id) : undefined}
                            variant="plain"
                        />
                    </PopoverContent>
                </Popover>
                {ctx.canMove && others.length ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            aria-label={`Move ${title} to…`}
                            data-rp-card-move=""
                        >
                            <Icon name="arrow-right-left" className="size-3.5" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                                {others.map((l) => (
                                    <DropdownMenuItem
                                        key={l.value || '(empty)'}
                                        onClick={() => ctx.move(row, lane, l.value)}
                                    >
                                        {l.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>
            {sub ? <p className="m-0 line-clamp-2 text-xs text-muted-foreground">{sub}</p> : null}
            {ctx.cardFields.length ? (
                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-xs">
                    {ctx.cardFields.map((f) => (
                        <div key={f} className="contents">
                            <dt className="text-muted-foreground">{itemOf(row, f, ctx.meta).label}</dt>
                            <dd className="m-0 min-w-0">
                                <SummaryValue item={itemOf(row, f, ctx.meta)} onOpen={ctx.onOpen} preview={false} />
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </article>
    );
}

/** Preview (Studio): active incidents by state (read-only). */
export default function VisualBoardPreview() {
    return (
        <div className="p-4">
            <VisualBoard table="incident" field="state" query="active=true" movable={false} perLane={5} />
        </div>
    );
}
