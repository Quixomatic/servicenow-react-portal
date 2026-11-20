import { useEffect, useRef, useState } from 'react';
import { useEditability, baseType } from 'utilities:app/list-data';
import type { ListColumn, ListRow, WriteResult } from 'utilities:app/list-data';
import { useFieldMeta, useRecordValues } from 'utilities:app/graphql';
import { FieldControl } from 'components:app/field-control';
import { Spinner, IconAlert, cx, textareaClass } from 'components:app/field';
import { HtmlField } from 'components:app/html-field';
import { ListField } from 'components:app/list-field';
import { ConditionsField } from 'components:app/conditions-field';
import { RecordSlushbucket } from 'components:app/slushbucket';
import { Button } from 'components:button';

const HTML_TYPES = ['html', 'translated_html'];
const JOURNAL_TYPES = ['journal', 'journal_input'];

/** Where a cell's value really lives (a dot-walked column writes the referenced record). */
export type CellTarget = { table: string; sysId: string; column: string };

export type CellEditorProps = {
    table: string;
    row: ListRow;
    column: ListColumn;
    /** Writes the value to `target` (the verified record and column); resolves with the platform's result. */
    write: (value: string, displayValue: string, target: CellTarget) => Promise<WriteResult>;
    onDone: (saved: boolean) => void;
    /** glide_list: start in the list collector (slushbucket) instead of the chip picker. */
    listCollector?: boolean;
};

/**
 * Inline cell editor: first asks the platform whether this user may list-edit the cell
 * (getPreFetch: list_edit and field write ACLs, and for a dot-walked column the record and field
 * that really get written), then renders the field primitive for the type:
 *   most types       commit on Enter / blur / pick;
 *   html             rich-text popover, Save or Ctrl/⌘+Enter;
 *   glide_list       chips picker or list collector (app/slushbucket), staged, Save;
 *   journal          append-only: a new entry (comments / work notes), Post or Ctrl/⌘+Enter;
 *   conditions       the condition builder on the record's dependent table, staged, Save.
 * Escape cancels. Errors from business rules / data policies stay in the editor.
 */
export function CellEditor({ table, row, column, write, onDone, listCollector }: CellEditorProps) {
    // Always fresh: the answer carries the current value (dot-walked cells edit and compare against it).
    const perm = useEditability(table, column.name, [row.sysId], { fieldType: column.type, staleTime: 0 });
    const entry = perm.data ? perm.data[row.sysId] : undefined;
    const target: CellTarget = {
        table: (entry && entry.table) || table,
        sysId: (entry && entry.sysId) || row.sysId,
        column: (entry && entry.column) || column.name,
    };
    const rowCell = row.cells[column.name] || { value: '', displayValue: '' };
    // A dot-walked cell edits the referenced record's own value (the prefetch has it).
    const cell =
        column.isDotWalk && entry
            ? { value: entry.value || '', displayValue: entry.displayValue || entry.value || '' }
            : rowCell;
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const box = useRef<HTMLDivElement | null>(null);
    const type = String(column.type || '');
    const mode: 'html' | 'list' | 'journal' | 'conditions' | 'field' =
        HTML_TYPES.indexOf(type) >= 0
            ? 'html'
            : type === 'glide_list'
              ? 'list'
              : JOURNAL_TYPES.indexOf(type) >= 0
                ? 'journal'
                : type === 'conditions'
                  ? 'conditions'
                  : 'field';
    const staged = useRef<{ v: string; d: string } | null>(null);
    const [, force] = useState(0);
    const [collector, setCollector] = useState(!!listCollector);

    // Conditions: the table they filter comes from the record's dependent field.
    const meta = useFieldMeta(mode === 'conditions' ? target.table : undefined, target.column);
    const dependsOn = meta.meta && meta.meta.dependsOn;
    const dep = useRecordValues(
        mode === 'conditions' && dependsOn ? target.table : undefined,
        target.sysId,
        dependsOn ? [dependsOn] : []
    );

    // Focus the control once it renders (after the grid restores its own focus).
    useEffect(() => {
        if (!entry || !entry.canEdit || mode === 'html' || mode === 'conditions') return undefined;
        const id = requestAnimationFrame(() => {
            const el =
                box.current &&
                (box.current.querySelector(
                    'textarea,input,[role="combobox"],[role="listbox"],[tabindex="0"]'
                ) as HTMLElement | null);
            if (el) el.focus();
        });
        return () => cancelAnimationFrame(id);
    }, [entry && entry.canEdit, collector]);

    const commit = async (value: string, displayValue: string) => {
        if (mode !== 'journal' && value === cell.value) return onDone(false);
        if (mode === 'journal' && !value.trim()) return onDone(false);
        setSaving(true);
        setErrors([]);
        try {
            const res = await write(value, displayValue, target);
            if (res.ok) return onDone(true);
            setErrors(
                res.errors.length
                    ? res.errors
                    : [
                          'The platform did not save this value (a business rule, data policy or ACL may have rejected it).',
                      ]
            );
        } catch (e) {
            setErrors([(e as Error).message || 'Save failed']);
        } finally {
            setSaving(false);
        }
    };
    const saveStaged = () => {
        const s = staged.current;
        if (!s) return onDone(false);
        commit(s.v, s.d);
    };
    const stage = (v: string, d?: string) => {
        staged.current = { v, d: d === undefined ? v : d };
        force((n) => n + 1);
    };

    if (perm.isLoading || (perm.isFetching && column.isDotWalk))
        return (
            <div className="flex items-center gap-2 px-1 py-1.5 text-sm text-muted-foreground">
                <Spinner label="Checking permission" /> Checking permission…
            </div>
        );
    if (perm.error || !entry || !entry.canEdit)
        return (
            <div className="flex items-start gap-2 px-1 py-1.5 text-sm" role="alert">
                <IconAlert size={16} className="mt-0.5 text-muted-foreground" />
                <span>
                    {perm.error
                        ? (perm.error as Error).message
                        : (entry && entry.reason) || 'You can’t edit this field.'}
                    <span className="block text-xs text-muted-foreground">Press Escape to close.</span>
                </span>
            </div>
        );

    const label = `${column.label} for ${row.display || 'this record'}`;
    const errorList = errors.length ? (
        <div role="alert" className="flex flex-col gap-1 text-xs text-destructive">
            {errors.map((m, i) => (
                <span key={i} className="flex items-start gap-1.5">
                    <IconAlert size={14} className="mt-px" />
                    {m}
                </span>
            ))}
        </div>
    ) : null;
    const dotNote =
        column.isDotWalk && target.table !== table ? (
            <span className="text-xs text-muted-foreground">
                Saves on the referenced {target.table} record ({target.column}).
            </span>
        ) : null;
    const footer = (hint: string, action: string, onAction: () => void, disabled?: boolean) => (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{saving ? 'Saving…' : hint}</span>
            <div className="flex items-center gap-1.5">
                {saving ? <Spinner label="Saving" /> : null}
                <Button type="button" size="sm" variant="outline" onClick={() => onDone(false)}>
                    Cancel
                </Button>
                <Button type="button" size="sm" onClick={onAction} disabled={disabled} data-rpl-save="">
                    {action}
                </Button>
            </div>
        </div>
    );
    const shell = (children: any, extraKeys?: (e: any) => void) => (
        <div
            ref={box}
            className={cx('rpl-bare flex flex-col gap-2', saving ? 'pointer-events-none opacity-70' : '')}
            aria-busy={saving || undefined}
            onKeyDown={extraKeys}
        >
            {children}
            {dotNote}
            {errorList}
        </div>
    );
    const ctrlEnter = (fn: () => void) => (e: any) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            fn();
        }
    };

    if (mode === 'html') {
        // No link / image dialogs: they'd count as clicks outside the popup. Enter makes paragraphs,
        // so saving is explicit: the Save button or Ctrl/⌘+Enter.
        return shell(
            <>
                <HtmlField
                    name={target.column}
                    table={target.table}
                    label={label}
                    standalone
                    autoFocus
                    value={cell.value}
                    size="sm"
                    maxHeight="16rem"
                    imageUpload={false}
                    toolbarHide={['link', 'image', 'code', 'blockquote']}
                    onStage={(html: string) => stage(html)}
                />
                {footer('Ctrl+Enter to save · Esc to cancel', 'Save', saveStaged)}
            </>,
            ctrlEnter(saveStaged)
        );
    }

    if (mode === 'list') {
        const current = staged.current || { v: cell.value, d: cell.displayValue };
        return shell(
            <>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{column.label}</span>
                    <div
                        role="radiogroup"
                        aria-label="Editor"
                        className="inline-flex rounded-md border border-input p-0.5"
                    >
                        {[
                            { on: false, label: 'Picker' },
                            { on: true, label: 'List collector' },
                        ].map((o) => (
                            <button
                                key={o.label}
                                type="button"
                                role="radio"
                                aria-checked={collector === o.on}
                                className={cx(
                                    'rounded-[5px] px-2 py-0.5 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                    collector === o.on ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                                )}
                                onClick={() => setCollector(o.on)}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
                {collector ? (
                    <RecordSlushbucket
                        label={label}
                        table={target.table}
                        field={target.column}
                        sysId={target.sysId}
                        value={current.v}
                        displayValue={current.d}
                        onChange={(v, d) => stage(v, d)}
                        height={180}
                    />
                ) : (
                    <ListField
                        name={target.column}
                        table={target.table}
                        label={label}
                        standalone
                        value={current.v}
                        displayValue={current.d}
                        size="sm"
                        onChange={(v: string, d: string) => stage(v, d)}
                    />
                )}
                {footer('Ctrl+Enter to save · Esc to cancel', 'Save', saveStaged, !staged.current)}
            </>,
            ctrlEnter(saveStaged)
        );
    }

    if (mode === 'journal') {
        // Append-only: the platform adds a new entry; the history is never edited from a list.
        const latest = String((entry && entry.displayValue) || '')
            .split(/\n\n/)
            .find((x) => x.trim());
        const text = staged.current ? staged.current.v : '';
        return shell(
            <>
                {latest ? (
                    <div className="max-h-24 overflow-auto rounded-md bg-muted/60 px-2 py-1.5 text-xs whitespace-pre-wrap text-muted-foreground">
                        <span className="sr-only">Latest entry: </span>
                        {latest}
                    </div>
                ) : null}
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    New {column.label.toLowerCase()} entry
                    <textarea
                        className={cx(textareaClass(), 'min-h-20 text-foreground')}
                        value={text}
                        aria-label={`New entry: ${label}`}
                        onChange={(e: any) => stage(e.target.value)}
                    />
                </label>
                {footer('Adds an entry · Ctrl+Enter to post', 'Post', saveStaged, !text.trim())}
            </>,
            ctrlEnter(saveStaged)
        );
    }

    if (mode === 'conditions') {
        const depValue = dependsOn && dep.data && dep.data[dependsOn] ? dep.data[dependsOn].value : undefined;
        if ((meta.isLoading || dep.isLoading) && !depValue)
            return (
                <div className="flex items-center gap-2 px-1 py-1.5 text-sm text-muted-foreground">
                    <Spinner label="Loading" /> Loading…
                </div>
            );
        const current = staged.current ? staged.current.v : cell.value;
        return shell(
            <>
                <div className="max-h-[22rem] min-w-[min(36rem,85vw)] overflow-auto">
                    <ConditionsField
                        name={target.column}
                        table={target.table}
                        label={label}
                        standalone
                        value={current}
                        dependentValue={depValue}
                        size="sm"
                        onChange={(v: string) => stage(v)}
                    />
                </div>
                {footer('Esc to cancel', 'Save', saveStaged, !staged.current)}
            </>
        );
    }

    return shell(
        <>
            <FieldControl
                name={target.column}
                table={target.table}
                label={label}
                standalone
                value={cell.value}
                displayValue={cell.displayValue}
                size="sm"
                onChange={(v: string, dv: string) => commit(v, dv)}
            />
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{saving ? 'Saving…' : 'Enter or pick to save · Esc to cancel'}</span>
                {saving ? <Spinner label="Saving" /> : null}
            </div>
        </>
    );
}

/** Whether a column type has an inline editor at all (permission is still checked per cell). */
export function hasInlineEditor(type: string, isChoice: boolean, opts: { journal?: boolean } = {}): boolean {
    const t = String(type || '');
    if (HTML_TYPES.indexOf(t) >= 0 || t === 'glide_list' || t === 'conditions') return true;
    if (JOURNAL_TYPES.indexOf(t) >= 0) return !!opts.journal;
    return (
        ['string', 'choice', 'reference', 'boolean', 'number', 'date', 'datetime'].indexOf(baseType(t, isChoice)) >= 0
    );
}
