/**
 * components:app/mrvs: multi-row variable sets.
 *
 * A grid of rows (columns = the set's variables not hidden on the grid) with Add, inline Edit,
 * Edit in a dialog, Remove and Remove all. Every row editor (inline or dialog) is its own g_form
 * scope (createRowScope): the platform's row form metadata, the set's catalog UI policies and
 * client scripts (onLoad / onChange / onSubmit; onSubmit can block the row save), and
 * g_service_catalog.parent for the item form. Row prices (the row form's per-choice prices) show
 * in a Price column; the item total comes from the platform's price call, which counts the rows.
 *
 * Keyboard: Edit turns the row into inputs (Tab between them, Enter saves, Escape cancels, focus
 * returns to the row's Edit button); "Edit in dialog" opens the full row form (focus trap, Escape
 * closes, focus returns). Remove all asks first (app/confirm-dialog).
 *
 * Value: the platform's MRVS format, a JSON array of rows keyed by the set's variable names,
 * stored on the parent form's 'variables.<set>' field; display values ride along in the display
 * value. maxRows disables Add; unique columns are enforced on save.
 *
 * Exports: Mrvs, createRowScope / useRowScope (a row's g_form scope), rowVariable, rowPrice, parseRows.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    useField,
    FieldShell,
    FormProvider,
    useFormMeta,
    cx,
    adornmentButtonClass,
    IconPlus,
    IconX,
    Spinner,
    IconAlert,
} from 'components:app/field';
import type { FieldLayout } from 'components:app/field';
import { FieldControl } from 'components:app/field-control';
import { Button } from 'components:button';
import { Dialog, DialogContent, DialogTitle } from 'components:dialog';
import { confirmDialog } from 'components:app/confirm-dialog';
import { useMrvsRowForm } from 'utilities:app/catalog';
import type { CatalogVariable, MrvsRowForm } from 'utilities:app/catalog';
import { useCatalogFormContext } from 'components:app/variable';
import type { CatalogForm } from 'components:app/variable';
import { useRowScope, rowPrice } from './row-scope';
import type { Row, RowScope } from './row-scope';

export { createRowScope, useRowScope, rowVariable, rowPrice } from './row-scope';
export type { Row, RowScope } from './row-scope';

export type MrvsProps = {
    /** Parent form field ('variables.<set name>'). */
    name: string;
    variable: CatalogVariable;
    itemId: string;
    sourceTable?: string;
    layout?: FieldLayout;
    /** Inline row editing in the grid (default true). */
    inlineEdit?: boolean;
};

export function parseRows(value: string, displayValue: string): Row[] {
    let values: Record<string, string>[] = [];
    let displays: Record<string, string>[] = [];
    try {
        values = JSON.parse(value || '[]') || [];
    } catch (e) {
        values = [];
    }
    try {
        displays = JSON.parse(displayValue || '[]') || [];
    } catch (e) {
        displays = [];
    }
    return values.map((v, i) => ({ value: v || {}, display: (Array.isArray(displays) && displays[i]) || {} }));
}

function money(amount: number, parent: CatalogForm | null): string {
    const p = parent && parent.item && parent.item.pricing;
    const code = (p && p.currencyCode) || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
    } catch (e) {
        return `${(p && p.currencySymbol) || ''}${amount.toFixed(2)}`;
    }
}

export function Mrvs(props: MrvsProps) {
    const { variable } = props;
    const parent = useCatalogFormContext();
    const field = useField({ name: props.name, label: variable.label });
    const rows = useMemo(() => parseRows(field.value, field.displayValue), [field.value, field.displayValue]);
    const columns = (variable.fields || []).filter((f) => !f.hideOnGrid);
    const max = variable.maxRows || 0;
    const full = max > 0 && rows.length >= max;
    const readOnly = field.state.readOnly || field.state.disabled;
    const rowForm = useMrvsRowForm(variable.id, props.itemId, props.sourceTable, !!props.itemId);
    const [dialog, setDialog] = useState<{ index: number; opener: HTMLElement | null } | null>(null);
    const [inline, setInline] = useState<number>(-1);
    const editButtons = useRef<Record<number, HTMLButtonElement | null>>({});
    const addButton = useRef<HTMLButtonElement | null>(null);
    const removeAllButton = useRef<HTMLButtonElement | null>(null);
    const captionId = `${field.ids.input}-caption`;
    const uniqueColumns = (variable.fields || []).filter((f) => f.unique).map((f) => f.name);
    const showPrices = !!(
        rowForm.data &&
        rowForm.data.hasPricing &&
        parent &&
        parent.item &&
        parent.item.pricing &&
        parent.item.pricing.showPrices
    );
    const canInline = props.inlineEdit !== false && !!rowForm.data && columns.length > 0;
    const actionCols = readOnly ? 0 : 1;

    const write = (next: Row[]) => {
        field.setValue(JSON.stringify(next.map((r) => r.value)), JSON.stringify(next.map((r) => r.display)));
        field.blur();
    };
    // Focus after React commits (the row's Edit button is re-created when inline editing ends).
    const focusLater = (target: HTMLElement | null | undefined | (() => HTMLElement | null | undefined)) => {
        setTimeout(() => {
            const el = typeof target === 'function' ? target() : target;
            if (el && el.isConnected) el.focus();
        }, 0);
    };
    const duplicates = (row: Row, index: number) =>
        uniqueColumns.filter((c) => row.value[c] && rows.some((r, j) => j !== index && r.value[c] === row.value[c]));

    const removeAll = async () => {
        const ok = await confirmDialog({
            title: `Remove all ${rows.length} row${rows.length === 1 ? '' : 's'}?`,
            description: `Every row of ${variable.label} is removed. You can't undo this.`,
            confirmLabel: 'Remove all',
            destructive: true,
        });
        if (ok) {
            setInline(-1);
            write([]);
            focusLater(() => addButton.current);
        } else focusLater(() => removeAllButton.current);
    };

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            keepControlWhenReadOnly
            group
            labelAside={max ? `${rows.length} of ${max} rows` : `${rows.length} row${rows.length === 1 ? '' : 's'}`}
        >
            <div className="flex flex-col gap-2" data-rpv-mrvs={variable.variableName || ''}>
                <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-left text-sm" aria-describedby={field.describedBy}>
                        <caption id={captionId} className="sr-only">
                            {field.label}
                        </caption>
                        <thead className="bg-muted text-xs text-muted-foreground">
                            <tr>
                                {columns.map((c) => (
                                    <th key={c.name} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                                        {c.label}
                                    </th>
                                ))}
                                {showPrices ? (
                                    <th scope="col" className="px-3 py-2 text-right font-medium">
                                        Price
                                    </th>
                                ) : null}
                                {actionCols ? (
                                    <th scope="col" className="w-28 px-3 py-2 text-right font-medium">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                ) : null}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length ? (
                                rows.map((r, i) =>
                                    inline === i && canInline && !readOnly ? (
                                        <InlineRow
                                            key={`edit-${i}`}
                                            index={i}
                                            row={r}
                                            rowForm={rowForm.data as MrvsRowForm}
                                            columns={columns.map((c) => c.name)}
                                            showPrices={showPrices}
                                            itemId={props.itemId}
                                            setId={variable.id}
                                            parent={parent}
                                            duplicates={(row) => duplicates(row, i)}
                                            onCancel={() => {
                                                setInline(-1);
                                                focusLater(() => editButtons.current[i]);
                                            }}
                                            onSave={(row) => {
                                                const next = rows.slice();
                                                next[i] = row;
                                                write(next);
                                                setInline(-1);
                                                focusLater(() => editButtons.current[i]);
                                            }}
                                            onOpenDialog={(row) => {
                                                setInline(-1);
                                                const next = rows.slice();
                                                next[i] = row;
                                                write(next);
                                                setDialog({ index: i, opener: editButtons.current[i] || null });
                                            }}
                                        />
                                    ) : (
                                        <tr key={i} className="border-t border-border" data-rpv-row={i}>
                                            {columns.map((c) => (
                                                <td key={c.name} className="px-3 py-2">
                                                    {r.display[c.name] || r.value[c.name] || (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                            ))}
                                            {showPrices ? (
                                                <td className="px-3 py-2 text-right tabular-nums" data-rpv-row-price="">
                                                    {money(rowPrice(rowForm.data, r).price, parent)}
                                                </td>
                                            ) : null}
                                            {actionCols ? (
                                                <td className="px-2 py-1 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <button
                                                            type="button"
                                                            ref={(el) => {
                                                                editButtons.current[i] = el;
                                                            }}
                                                            className="rounded-sm px-2 py-1 text-xs text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                                                            aria-label={`Edit row ${i + 1}`}
                                                            data-rpv-row-edit=""
                                                            onClick={(e: any) => {
                                                                if (canInline) setInline(i);
                                                                else setDialog({ index: i, opener: e.currentTarget });
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        {canInline ? (
                                                            <button
                                                                type="button"
                                                                className={adornmentButtonClass}
                                                                aria-label={`Edit row ${i + 1} in a dialog`}
                                                                title="Edit in a dialog"
                                                                data-rpv-row-dialog=""
                                                                onClick={(e: any) =>
                                                                    setDialog({ index: i, opener: e.currentTarget })
                                                                }
                                                            >
                                                                <ExpandIcon />
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            className={adornmentButtonClass}
                                                            aria-label={`Remove row ${i + 1}`}
                                                            data-rpv-row-remove=""
                                                            onClick={() => {
                                                                write(rows.filter((_, j) => j !== i));
                                                                focusLater(
                                                                    () =>
                                                                        editButtons.current[
                                                                            Math.min(i, rows.length - 2)
                                                                        ] || addButton.current
                                                                );
                                                            }}
                                                        >
                                                            <IconX size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            ) : null}
                                        </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length + actionCols + (showPrices ? 1 : 0)}
                                        className="px-3 py-4 text-center text-sm text-muted-foreground"
                                    >
                                        No rows yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {showPrices && rows.length ? (
                            <tfoot>
                                <tr className="border-t border-border bg-muted/40 text-xs">
                                    <th
                                        scope="row"
                                        colSpan={columns.length}
                                        className="px-3 py-2 text-right font-medium text-muted-foreground"
                                    >
                                        Rows total
                                    </th>
                                    <td
                                        className="px-3 py-2 text-right font-medium tabular-nums"
                                        data-rpv-rows-total=""
                                    >
                                        {money(
                                            rows.reduce((sum, r) => sum + rowPrice(rowForm.data, r).price, 0),
                                            parent
                                        )}
                                    </td>
                                    {actionCols ? <td /> : null}
                                </tr>
                            </tfoot>
                        ) : null}
                    </table>
                </div>
                {!readOnly ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            ref={addButton}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={full}
                            data-rpv-mrvs-add=""
                            onClick={(e: any) => setDialog({ index: -1, opener: e.currentTarget })}
                        >
                            <IconPlus size={14} /> Add row
                        </Button>
                        {rows.length ? (
                            <Button
                                ref={removeAllButton}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-rpv-mrvs-remove-all={variable.id}
                                onClick={removeAll}
                            >
                                Remove all
                            </Button>
                        ) : null}
                        {full ? (
                            <span className="text-xs text-muted-foreground">Maximum of {max} rows reached</span>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {dialog ? (
                <RowDialog
                    title={`${dialog.index < 0 ? 'Add' : 'Edit'} ${variable.label} row`}
                    rowForm={rowForm}
                    itemId={props.itemId}
                    setId={variable.id}
                    parent={parent}
                    row={dialog.index >= 0 ? rows[dialog.index] : undefined}
                    duplicates={(row) => duplicates(row, dialog.index)}
                    onCancel={() => {
                        const opener = dialog.opener;
                        setDialog(null);
                        focusLater(opener);
                    }}
                    onSave={(row) => {
                        const next = rows.slice();
                        if (dialog.index < 0) next.push(row);
                        else next[dialog.index] = row;
                        write(next);
                        const opener = dialog.opener;
                        setDialog(null);
                        focusLater(opener);
                    }}
                />
            ) : null}
        </FieldShell>
    );
}

function ExpandIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
    );
}

/** Form messages of a row scope (g_form.addErrorMessage / addInfoMessage from row scripts). */
function RowMessages({ scope, extra }: { scope: RowScope; extra?: string }) {
    const meta = useFormMeta(scope.form as any);
    const list = meta.messages.map((m: any) => ({ id: m.id, kind: m.kind, text: String(m.text || '') }));
    if (extra) list.push({ id: 'extra', kind: 'error', text: extra });
    if (!list.length) return null;
    return (
        <div className="flex flex-col gap-1" data-rpv-row-messages="">
            {list.map((m: any) => (
                <p
                    key={m.id}
                    role={m.kind === 'error' ? 'alert' : 'status'}
                    className={cx(
                        'flex items-start gap-1.5 text-sm',
                        m.kind === 'error' ? 'text-destructive' : 'text-muted-foreground'
                    )}
                >
                    {m.kind === 'error' ? <IconAlert size={14} className="mt-0.5 shrink-0" /> : null}
                    {m.text.replace(/<[^>]+>/g, '')}
                </p>
            ))}
        </div>
    );
}

/** Field validation → onSubmit scripts → unique columns. Returns the row or null (stay open). */
function trySave(scope: RowScope, duplicates: (row: Row) => string[], setError: (e: string) => void): Row | null {
    setError('');
    const r = scope.submit();
    if (!r.ok) {
        if (!r.blockedByScript) setError(r.validation.errors.map((e: any) => e.message).join(' · '));
        return null;
    }
    const row = scope.collect();
    const dupes = duplicates(row);
    if (dupes.length) {
        setError(`These values must be unique across rows: ${dupes.join(', ')}`);
        return null;
    }
    return row;
}

function InlineRow(props: {
    index: number;
    row: Row;
    rowForm: MrvsRowForm;
    columns: string[];
    showPrices: boolean;
    itemId: string;
    setId: string;
    parent: CatalogForm | null;
    duplicates: (row: Row) => string[];
    onCancel: () => void;
    onSave: (row: Row) => void;
    onOpenDialog: (row: Row) => void;
}) {
    const scope = useRowScope({
        rowForm: props.rowForm,
        row: props.row,
        itemId: props.itemId,
        setId: props.setId,
        parent: props.parent,
    });
    const [error, setError] = useState('');
    const tr = useRef<HTMLTableRowElement | null>(null);
    // Focus the first input (select-only comboboxes ignore React's autoFocus).
    useEffect(() => {
        const t = setTimeout(() => {
            const el =
                tr.current &&
                (tr.current.querySelector(
                    'input:not([type=hidden]):not([disabled]), textarea, [role=combobox][tabindex]:not([aria-disabled=true]), button'
                ) as HTMLElement | null);
            if (el) el.focus();
        }, 0);
        return () => clearTimeout(t);
    }, [scope]);
    if (!scope) return null;
    const byCol: Record<string, any> = {};
    for (const s of scope.specs) byCol[s.variable.variableName as string] = s;
    const save = () => {
        const row = trySave(scope, props.duplicates, setError);
        if (row) props.onSave(row);
    };
    const onKeyDown = (e: any) => {
        if (e.defaultPrevented) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            props.onCancel();
        } else if (
            e.key === 'Enter' &&
            e.target &&
            e.target.tagName === 'INPUT' &&
            e.target.getAttribute('role') !== 'combobox'
        ) {
            e.preventDefault();
            save();
        }
    };
    const span = props.columns.length + (props.showPrices ? 1 : 0) + 1;
    return (
        <>
            <tr
                ref={tr}
                className="border-t border-border bg-accent/40 align-top"
                data-rpv-row={props.index}
                data-rpv-row-editing=""
                onKeyDown={onKeyDown}
            >
                <FormProvider form={scope.form as any}>
                    {props.columns.map((col, ci) => {
                        const s = byCol[col];
                        return (
                            <td key={col} className="min-w-32 px-2 py-2" data-rpv-inline-cell="">
                                {s && s.kind === 'field' ? (
                                    <FieldControl
                                        name={s.name}
                                        type={s.fieldType}
                                        size="sm"
                                        autoFocus={ci === 0}
                                        {...(s.fieldProps || {})}
                                    />
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </td>
                        );
                    })}
                </FormProvider>
                {props.showPrices ? (
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                        <LivePrice scope={scope} rowForm={props.rowForm} parent={props.parent} />
                    </td>
                ) : null}
                <td aria-hidden="true" />
            </tr>
            {/* Actions and messages on their own line, so the inputs keep the row's width. */}
            <tr className="bg-accent/40" data-rpv-row-editing-actions="" onKeyDown={onKeyDown}>
                <td colSpan={span} className="px-2 pb-2">
                    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                        <Button type="button" size="sm" data-rpv-row-save="" onClick={save}>
                            Save row
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            data-rpv-row-cancel=""
                            onClick={props.onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => props.onOpenDialog(scope.collect())}
                        >
                            All fields…
                        </Button>
                        <div className="min-w-0 flex-1">
                            <RowMessages scope={scope} extra={error} />
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
}

function LivePrice({ scope, rowForm, parent }: { scope: RowScope; rowForm: MrvsRowForm; parent: CatalogForm | null }) {
    useFormMeta(scope.form as any);
    return <>{money(rowPrice(rowForm, scope.collect()).price, parent)}</>;
}

function RowDialog(props: {
    title: string;
    rowForm: { data?: MrvsRowForm; error: unknown };
    itemId: string;
    setId: string;
    parent: CatalogForm | null;
    row?: Row;
    duplicates: (row: Row) => string[];
    onCancel: () => void;
    onSave: (row: Row) => void;
}) {
    const scope = useRowScope({
        rowForm: props.rowForm.data,
        row: props.row,
        itemId: props.itemId,
        setId: props.setId,
        parent: props.parent,
    });
    const [error, setError] = useState('');
    const save = () => {
        if (!scope) return;
        const row = trySave(scope, props.duplicates, setError);
        if (row) props.onSave(row);
    };

    return (
        <Dialog open onOpenChange={(open: boolean) => !open && props.onCancel()}>
            <DialogContent
                showCloseButton={false}
                className="flex max-h-[85vh] w-[min(40rem,calc(100vw-2rem))] max-w-none flex-col gap-0 p-0 sm:max-w-none"
                data-rp-mrvs-dialog=""
            >
                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(e: any) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <DialogTitle className="text-base font-semibold">{props.title}</DialogTitle>
                        <button
                            type="button"
                            className={adornmentButtonClass}
                            aria-label="Close"
                            onClick={props.onCancel}
                        >
                            <IconX size={16} />
                        </button>
                    </div>
                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
                        {props.rowForm.error ? (
                            <p role="alert" className="text-sm text-destructive">
                                {(props.rowForm.error as Error).message}
                            </p>
                        ) : !scope ? (
                            <Spinner label="Loading the row form" />
                        ) : (
                            <>
                                <FormProvider form={scope.form as any}>
                                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                                        {scope.specs.map((s: any, i: number) =>
                                            s.kind === 'field' ? (
                                                <FieldControl
                                                    key={s.name}
                                                    name={s.name}
                                                    type={s.fieldType}
                                                    autoFocus={i === 0}
                                                    {...(s.fieldProps || {})}
                                                />
                                            ) : null
                                        )}
                                    </div>
                                </FormProvider>
                                <RowMessages scope={scope} extra={error} />
                            </>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                        <Button type="button" variant="outline" onClick={props.onCancel}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={!scope} data-rp-mrvs-save="" onClick={save}>
                            {props.row ? 'Save row' : 'Add row'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function MrvsPreview() {
    return (
        <div className="p-4 text-sm text-muted-foreground">MRVS renders inside a catalog form (app/catalog-item).</div>
    );
}
