import type { CellValue } from 'utilities:app/list-data';
import { cx, IconCheck } from 'components:app/field';
import { DefaultCell } from './cells';
import type { DataTableColumn } from './table';

export type CardGridProps<Row = any> = {
    columns: DataTableColumn[];
    rows: Row[];
    getRowId: (row: Row) => string;
    getValue: (row: Row, columnId: string) => CellValue | undefined;
    /** Accessible name of the collection. */
    label: string;
    /** Fields shown under the title (default 5; the display column is the title). */
    maxFields?: number;
    onRowOpen?: (row: Row) => void;
    selectable?: boolean;
    selection?: Record<string, boolean>;
    onSelectionChange?: (s: Record<string, boolean>) => void;
    rowActions?: (row: Row) => any;
    loading?: boolean;
    skeletonCards?: number;
    empty?: any;
    highlighted?: Record<string, boolean>;
    /** Group headings (grouped lists) span the grid. */
    isGroupRow?: (row: Row) => boolean;
    renderGroupRow?: (row: Row) => any;
    onGroupToggle?: (row: Row) => void;
    isGroupExpanded?: (row: Row) => boolean;
    className?: string;
};

/**
 * CardGrid (`now-data-set` grid mode): the same rows as cards in a responsive grid. The display
 * column is each card's title (a link that opens the record); the next columns read as label /
 * value pairs with the table's cell renderers. Selection, row actions and group headings carry
 * over, so a list can switch between table and grid without losing state.
 */
export function CardGrid<Row = any>(props: CardGridProps<Row>) {
    const { columns, rows, getRowId, getValue } = props;
    const selection = props.selection || {};
    const titleCol = columns.find((c) => c.isDisplay) || columns[0];
    const fields = columns.filter((c) => c !== titleCol).slice(0, props.maxFields ?? 5);
    const toggle = (id: string) => {
        if (!props.onSelectionChange) return;
        const next = { ...selection };
        if (next[id]) delete next[id];
        else next[id] = true;
        props.onSelectionChange(next);
    };
    if (props.loading && !rows.length)
        return (
            <div className={cx('rpl-cards p-3', props.className)} aria-busy="true" aria-label={props.label}>
                {Array.from({ length: props.skeletonCards || 6 }).map((_, i) => (
                    <div key={i} className="rpl-card" aria-hidden="true">
                        <span className="block h-4 w-1/2 animate-pulse rounded bg-muted" />
                        {[0, 1, 2].map((j) => (
                            <span
                                key={j}
                                className="block h-3 animate-pulse rounded bg-muted"
                                style={{ width: `${55 + ((i * 7 + j * 13) % 35)}%` }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    if (!rows.length) return <div className={props.className}>{props.empty || 'No records to display'}</div>;
    return (
        <ul className={cx('rpl-cards p-3', props.className)} aria-label={props.label}>
            {rows.map((row) => {
                const id = getRowId(row);
                if (props.isGroupRow && props.isGroupRow(row))
                    return (
                        <li key={id} className="col-span-full">
                            <button
                                type="button"
                                className="rpl-group-td flex w-full items-center rounded-md py-1.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                aria-expanded={props.isGroupExpanded ? props.isGroupExpanded(row) : undefined}
                                onClick={(e: any) => {
                                    const t = e.target;
                                    if (t && t.closest && t.closest('[data-rpl-group-link]')) return;
                                    if (props.onGroupToggle) props.onGroupToggle(row);
                                }}
                            >
                                {props.renderGroupRow ? props.renderGroupRow(row) : null}
                            </button>
                        </li>
                    );
                const selected = !!selection[id];
                const title = titleCol ? getValue(row, titleCol.id) : undefined;
                const titleText = title ? title.displayValue || title.value : '';
                return (
                    <li
                        key={id}
                        className="rpl-card"
                        data-selected={selected ? '' : undefined}
                        data-updated={props.highlighted && props.highlighted[id] ? '' : undefined}
                    >
                        <div className="flex min-w-0 items-start gap-2">
                            {props.selectable ? (
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={selected}
                                    aria-label={`Select ${titleText || 'record'}`}
                                    className="-ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    onClick={() => toggle(id)}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cx(
                                            'flex size-4 items-center justify-center rounded-[4px] border',
                                            selected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input bg-background'
                                        )}
                                    >
                                        {selected ? <IconCheck size={12} /> : null}
                                    </span>
                                </button>
                            ) : null}
                            <h3 className="min-w-0 flex-1 truncate text-sm leading-6 font-semibold">
                                {props.onRowOpen ? (
                                    <a
                                        href="#"
                                        className="rpl-open"
                                        onClick={(e: any) => {
                                            e.preventDefault();
                                            props.onRowOpen!(row);
                                        }}
                                    >
                                        {titleText || '(empty)'}
                                    </a>
                                ) : (
                                    titleText || '(empty)'
                                )}
                            </h3>
                            {props.rowActions ? <div className="shrink-0">{props.rowActions(row)}</div> : null}
                        </div>
                        {fields.length ? (
                            <dl className="grid min-w-0 grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                                {fields.map((c) => (
                                    <div key={c.id} className="contents">
                                        <dt className="truncate text-xs leading-5 text-muted-foreground">{c.header}</dt>
                                        <dd className="rpl-cell min-w-0">
                                            <DefaultCell
                                                name={c.id}
                                                type={c.type}
                                                isChoice={c.isChoice}
                                                cell={getValue(row, c.id)}
                                            />
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}
