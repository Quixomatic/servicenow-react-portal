/**
 * components:app/reference-field: a reference as a searchable combobox.
 *
 * Search runs on the platform with the field's own rules: referenceDataRetriever applies the
 * reference qualifier (simple, dynamic or advanced) and dependent field against the form's
 * unsaved values (serializedChanges) and encodedRecord, exactly as a Workspace form does. Opening
 * with an empty input lists recent picks plus the first matches; typing narrows (debounced,
 * cached per term). Extra display columns (ref_ac_columns) show under each result.
 *
 * The value is the sys_id, the display value the record's display field. A value that arrives
 * without a display value (standalone use) is resolved once and cached.
 *
 * Preview (sn-interactive-decoration): with a value, an info button (in the control; in the label row
 * when read-only) opens app/record-card's preview: the referenced record's key fields (a user gets a
 * contact card) and "Open record", which uses the surrounding form's openRecord (app/form) when there
 * is one, else getRecordHref, else the classic form in a new tab. `preview={false}` turns it off.
 */
import { useMemo, useState } from 'react';
import { useReferenceSearch, useReferenceDisplay } from 'utilities:app/graphql';
import { useField, useFormContext, FieldShell, adornmentButtonClass, IconX, IconExternal } from 'components:app/field';
import { RecordPreview } from 'components:app/record-card';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { Combobox } from 'components:app/combobox';
import type { ComboItem } from 'components:app/combobox';

export type ReferenceFieldProps = FieldProps & {
    /** Referenced table (defaults to the dictionary's). */
    reference?: string;
    /** Href for the read-only link / open button (e.g. a portal record page). */
    getRecordHref?: (table: string, sysId: string) => string | undefined;
    /** Max results per search. */
    limit?: number;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
    /** The referenced record's preview card (info button). Default true. */
    preview?: boolean;
};

export function ReferenceField(props: ReferenceFieldProps) {
    const field = useField(props);
    const refTable = props.reference || (field.meta.reference && field.meta.reference.table) || '';
    const displayField = (field.meta.reference && field.meta.reference.displayField) || 'name';
    const [open, setOpen] = useState(false);
    const [text, setText] = useState<string | null>(null); // null = not editing
    const [changes, setChanges] = useState<Record<string, string>>({});

    // Resolve a missing display value (standalone value without displayValue).
    const needsDisplay = !!field.value && (!field.displayValue || field.displayValue === field.value) && !!refTable;
    const display = useReferenceDisplay(refTable, field.value, displayField, { enabled: needsDisplay });
    const shownDisplay = needsDisplay ? display.data || '' : field.displayValue;

    const term = text === null || text === shownDisplay ? '*' : text.trim() || '*';
    const search = useReferenceSearch({
        table: field.table,
        field: field.name,
        term,
        sysId: field.lookup.sysId,
        changes,
        encodedRecord: field.lookup.encodedRecord,
        limit: props.limit || 20,
        enabled: open && !!field.table,
    });

    const items: ComboItem[] = useMemo(() => {
        const describe = (cols: { key: string; value: string }[]) =>
            cols
                .slice(1)
                .map((c) => c.value)
                .filter(Boolean)
                .join(' · ');
        // The server filters recents by the typed text too, and leaves them out of the matches.
        const recent = search.recent.map((r) => ({
            value: r.value,
            label: r.displayValue,
            description: describe(r.columns),
            group: 'Recent',
        }));
        const matches = search.matches.map((r) => ({
            value: r.value,
            label: r.displayValue,
            description: describe(r.columns),
            group: recent.length ? (term === '*' ? 'All' : 'Matches') : undefined,
        }));
        return recent.concat(matches);
    }, [search.recent, search.matches, term]);

    const select = (item: ComboItem) => {
        field.setValue(item.value, item.label);
        setText(null);
        setOpen(false);
    };
    const clear = () => {
        field.setValue('', '');
        setText(null);
    };
    const href =
        field.value && refTable && props.getRecordHref ? props.getRecordHref(refTable, field.value) : undefined;
    // Preview "Open record": the form's own openRecord (guards unsaved changes), else the href, else classic.
    const ctx = useFormContext() as any;
    const openRecord =
        ctx && typeof ctx.openRecord === 'function'
            ? (t: string, id: string) => ctx.openRecord(t, id)
            : props.getRecordHref
              ? (t: string, id: string) => {
                    const h = props.getRecordHref!(t, id);
                    if (h) window.location.assign(h);
                }
              : undefined;
    const preview =
        props.preview !== false && field.value && refTable ? (
            <RecordPreview
                table={refTable}
                sysId={field.value}
                label={shownDisplay || field.value}
                onOpen={openRecord}
                trigger="icon"
            />
        ) : null;
    const total = search.total;
    const status = open
        ? search.isLoading
            ? 'Searching…'
            : `${items.length} result${items.length === 1 ? '' : 's'}${total && total > items.length ? ` of ${total}` : ''} available`
        : '';

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={
                field.value ? (
                    href ? (
                        <a href={href} className="text-primary underline-offset-4 hover:underline">
                            {shownDisplay || field.value}
                        </a>
                    ) : (
                        shownDisplay || field.value
                    )
                ) : undefined
            }
            // Read-only: the preview sits in the label row (FieldShell's adornment slot).
            adornment={field.state.readOnly ? preview : undefined}
        >
            <Combobox
                id={field.ids.input}
                name={field.name}
                inputValue={text ?? shownDisplay ?? ''}
                onInputChange={(t) => {
                    setText(t);
                    field.stage(t);
                }}
                items={items}
                onSelect={select}
                open={open}
                onOpenChange={(o: boolean) => {
                    // Snapshot the unsaved values as the list opens: qualifiers see what the user typed.
                    if (o) setChanges(field.lookup.getChanges());
                    setOpen(o);
                }}
                selectedValues={field.value ? [field.value] : []}
                loading={open && search.isFetching}
                emptyText={
                    search.error
                        ? `Search failed: ${search.error.message}`
                        : text
                          ? `No matches for "${text}"`
                          : 'No records'
                }
                placeholder={field.placeholder || 'Search…'}
                disabled={field.state.disabled}
                invalid={field.invalid}
                required={field.state.mandatory}
                aria-labelledby={field.ids.label}
                aria-describedby={field.describedBy}
                autoFocus={field.autoFocus}
                size={props.size}
                status={status}
                onFocus={(e?: any) => {
                    // Select the display text so typing replaces it.
                    const el = (typeof document !== 'undefined' && e && e.target) || null;
                    if (el && el.select) el.select();
                }}
                onBlur={() => {
                    // Leaving with edited text: empty clears, anything else reverts to the value.
                    if (text !== null) {
                        if (!text.trim()) field.setValue('', '');
                        else field.stage(field.value);
                    }
                    setText(null);
                    field.blur();
                }}
                endAdornment={
                    <>
                        {preview ? (
                            <span className="inline-flex" onPointerDown={(e: any) => e.stopPropagation()}>
                                {preview}
                            </span>
                        ) : null}
                        {href ? (
                            <a
                                href={href}
                                className={adornmentButtonClass}
                                aria-label={`Open ${shownDisplay || 'record'}`}
                                onPointerDown={(e: any) => e.stopPropagation()}
                            >
                                <IconExternal size={14} />
                            </a>
                        ) : null}
                        {field.value && !field.state.disabled ? (
                            <button
                                type="button"
                                className={adornmentButtonClass}
                                aria-label={`Clear ${field.label}`}
                                onPointerDown={(e: any) => e.preventDefault()}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    clear();
                                }}
                            >
                                <IconX size={14} />
                            </button>
                        ) : null}
                    </>
                }
            />
        </FieldShell>
    );
}

export default function ReferenceFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <ReferenceField
                name="caller_id"
                table="incident"
                label="Caller"
                hint="Searches sys_user with the field's qualifier"
            />
        </div>
    );
}
