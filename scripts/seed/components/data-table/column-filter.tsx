import { useEffect, useMemo, useRef, useState } from 'react';
import {
    useFieldPath,
    parseQuery,
    serializeQuery,
    operatorsFor,
    columnTerms,
    setColumnTerm,
    baseType,
} from 'utilities:app/list-data';
import type { ListColumn, Operator } from 'utilities:app/list-data';
import { ValueEditor } from 'components:app/condition-builder';
import { Popup, Select } from 'components:app/combobox';
import { cx, Spinner } from 'components:app/field';
import { Button } from 'components:button';

export type ColumnFilterProps = {
    table: string;
    column: ListColumn;
    /** The list's filter (encoded); the column filter owns this column's single-term AND clauses. */
    query: string;
    onChange: (encoded: string) => void;
};

/** Default operator per field family: text contains, choices "is one of", dates "on", the rest "is". */
const DEFAULT_OP: Record<string, string> = {
    string: 'LIKE',
    choice: 'IN',
    reference: '=',
    boolean: '=',
    number: '=',
    date: 'ON',
    datetime: 'ON',
    list: 'LIKE',
    other: '=',
};

/**
 * Column header filter (`sn-record-list-column-filter-value-input`): a funnel in the header opens a
 * small dialog with the column's operators and the condition builder's value editors (text, choice
 * listbox with "is one of", reference search, date presets and ranges). Apply writes one term into
 * the list's encoded query (so the breadcrumbs, URL and saved filters see it); Clear removes it.
 * Alt+↓ on the header opens it from the keyboard.
 */
export function ColumnFilter({ table, column, query, onChange }: ColumnFilterProps) {
    const btn = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const model = useMemo(() => parseQuery(query), [query]);
    const current = columnTerms(model, column.name);
    const active = current.length > 0;
    const path = useFieldPath(open ? table : undefined, column.name);
    const kind = baseType(column.type, column.isChoice);
    const ops: Operator[] = useMemo(
        () => operatorsFor(column.type, column.isChoice, column.excludedOperators),
        [column.type, column.isChoice, column.excludedOperators]
    );
    const [op, setOp] = useState('');
    const [value, setValue] = useState('');
    useEffect(() => {
        if (!open) return;
        const t = current[0];
        const preferred = ops.find((o) => o.op === DEFAULT_OP[kind]) || ops[0];
        setOp(t ? t.op : preferred ? preferred.op : '=');
        setValue(t ? t.value : '');
    }, [open]);
    const operator = ops.find((o) => o.op === op) || ops[0];
    const needsValue = operator && operator.editor !== 'none';
    const close = () => {
        setOpen(false);
        if (btn.current) btn.current.focus();
    };
    const apply = () => {
        if (!operator) return;
        if (needsValue && !value) return;
        onChange(
            serializeQuery(setColumnTerm(model, column.name, { field: column.name, op: operator.op, value }), {
                orderBy: false,
            })
        );
        close();
    };
    const clear = () => {
        onChange(serializeQuery(setColumnTerm(model, column.name, null), { orderBy: false }));
        close();
    };
    if (!column.isFilterable) return null;
    const resolved = path.data;
    return (
        <>
            <button
                ref={btn}
                type="button"
                tabIndex={-1}
                data-rpl-header-extra=""
                data-active={active ? '' : undefined}
                className="rpl-th-extra"
                aria-label={active ? `Filter ${column.label} (filtered)` : `Filter ${column.label}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                title={active ? `${column.label}: filtered` : `Filter ${column.label} (Alt+↓)`}
                onClick={(e: any) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                onMouseDown={(e: any) => e.stopPropagation()}
            >
                <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill={active ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
            </button>
            <Popup
                anchor={btn}
                open={open}
                onDismiss={() => setOpen(false)}
                matchWidth={false}
                minWidth={320}
                maxHeight={460}
                role="dialog"
                aria-label={`Filter ${column.label}`}
                className="p-3"
            >
                <div
                    data-rpl-editor=""
                    className="rpl-bare flex w-full min-w-0 flex-col gap-2.5 text-left text-sm font-normal whitespace-normal text-foreground normal-case select-text"
                    onKeyDown={(e: any) => {
                        if (e.key === 'Escape' && !e.defaultPrevented) {
                            e.preventDefault();
                            e.stopPropagation();
                            close();
                        }
                        if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && !e.defaultPrevented) {
                            e.preventDefault();
                            apply();
                        }
                    }}
                >
                    <span className="text-sm font-medium text-foreground">Filter: {column.label}</span>
                    <Select
                        aria-label={`Operator for ${column.label}`}
                        size="sm"
                        value={op}
                        items={ops.map((o) => ({ value: o.op, label: o.label }))}
                        onChange={(i) => {
                            setOp(i.value);
                            const next = ops.find((o) => o.op === i.value);
                            if (next && operator && next.editor !== operator.editor) setValue('');
                        }}
                    />
                    {needsValue ? (
                        path.isLoading ? (
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner label="Loading field" /> Loading…
                            </span>
                        ) : (
                            <ValueEditor
                                editor={operator.editor}
                                table={resolved ? resolved.table : column.tableName || table}
                                field={resolved ? resolved.field : column.name}
                                fieldLabel={column.label}
                                referenceTable={resolved ? resolved.referenceTable : undefined}
                                value={value}
                                onChange={setValue}
                                size="sm"
                            />
                        )
                    ) : null}
                    <div className={cx('flex items-center gap-2 pt-1', active ? 'justify-between' : 'justify-end')}>
                        {active ? (
                            <Button type="button" size="sm" variant="ghost" onClick={clear}>
                                Clear
                            </Button>
                        ) : null}
                        <span className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={close}>
                                Cancel
                            </Button>
                            <Button type="button" size="sm" onClick={apply} disabled={!!needsValue && !value}>
                                Apply
                            </Button>
                        </span>
                    </div>
                </div>
            </Popup>
        </>
    );
}
