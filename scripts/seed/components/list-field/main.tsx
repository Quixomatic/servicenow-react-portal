/**
 * components:app/list-field: glide_list (and list collectors): several references as chips plus
 * a search combobox. The value is comma-separated sys_ids, the display value comma-separated
 * display values (the platform's format). Search uses the field's reference rules, like
 * app/reference-field. Backspace in an empty input removes the last chip; each chip has a
 * labelled remove button.
 */
import { useMemo, useState } from 'react';
import { useReferenceSearch } from 'utilities:app/graphql';
import { useField, FieldShell, cx, IconX } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { Combobox } from 'components:app/combobox';
import type { ComboItem } from 'components:app/combobox';

export type ListFieldProps = FieldProps & {
    limit?: number;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
};

export type ListEntry = { value: string; label: string };

export function parseList(value: string, displayValue: string): ListEntry[] {
    const values = String(value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const labels = String(displayValue || '')
        .split(',')
        .map((s) => s.trim());
    return values.map((v, i) => ({ value: v, label: labels.length === values.length ? labels[i] || v : v }));
}

export function ListField(props: ListFieldProps) {
    const field = useField(props);
    const entries = useMemo(() => parseList(field.value, field.displayValue), [field.value, field.displayValue]);
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [changes, setChanges] = useState<Record<string, string>>({});

    const search = useReferenceSearch({
        table: field.table,
        field: field.name,
        term: text.trim() || '*',
        sysId: field.lookup.sysId,
        changes,
        encodedRecord: field.lookup.encodedRecord,
        limit: props.limit || 20,
        enabled: open && !!field.table,
    });
    const chosen = useMemo(() => new Set(entries.map((e) => e.value)), [entries]);
    const items: ComboItem[] = useMemo(
        () =>
            search.recent
                .concat(search.matches)
                .filter((r, i, all) => all.findIndex((x) => x.value === r.value) === i)
                .map((r) => ({
                    value: r.value,
                    label: r.displayValue,
                    description: r.columns
                        .slice(1)
                        .map((c) => c.value)
                        .filter(Boolean)
                        .join(' · '),
                })),
        [search.recent, search.matches]
    );

    const write = (list: ListEntry[]) =>
        field.setValue(list.map((e) => e.value).join(','), list.map((e) => e.label).join(', '));
    const toggle = (item: ComboItem) => {
        write(
            chosen.has(item.value)
                ? entries.filter((e) => e.value !== item.value)
                : entries.concat({ value: item.value, label: item.label })
        );
        setText('');
    };
    const remove = (value: string) => write(entries.filter((e) => e.value !== value));

    const chips = entries.map((e) => (
        <span
            key={e.value}
            className="inline-flex max-w-full items-center gap-1 rounded-sm bg-secondary py-0.5 pr-0.5 pl-2 text-xs text-secondary-foreground"
        >
            <span className="truncate">{e.label}</span>
            {!field.state.disabled ? (
                <button
                    type="button"
                    className="inline-flex size-4 items-center justify-center rounded-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60"
                    aria-label={`Remove ${e.label}`}
                    onPointerDown={(ev: any) => ev.preventDefault()}
                    onClick={(ev: any) => {
                        ev.stopPropagation();
                        remove(e.value);
                    }}
                >
                    <IconX size={12} />
                </button>
            ) : null}
        </span>
    ));

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={
                entries.length ? (
                    <span className="flex flex-wrap gap-1">
                        {entries.map((e) => (
                            <span
                                key={e.value}
                                className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                            >
                                {e.label}
                            </span>
                        ))}
                    </span>
                ) : undefined
            }
        >
            <Combobox
                id={field.ids.input}
                inputValue={text}
                onInputChange={setText}
                items={items}
                onSelect={toggle}
                open={open}
                onOpenChange={(o: boolean) => {
                    // Snapshot the unsaved values as the list opens: qualifiers see what the user typed.
                    if (o) setChanges(field.lookup.getChanges());
                    setOpen(o);
                }}
                selectedValues={entries.map((e) => e.value)}
                loading={open && search.isFetching}
                emptyText={search.error ? `Search failed: ${search.error.message}` : 'No matches'}
                placeholder={entries.length ? 'Add…' : field.placeholder || 'Search…'}
                disabled={field.state.disabled}
                invalid={field.invalid}
                required={field.state.mandatory}
                aria-labelledby={field.ids.label}
                aria-describedby={[field.describedBy, `${field.ids.input}-count`].filter(Boolean).join(' ')}
                startAdornment={
                    <>
                        {chips}
                        <span id={`${field.ids.input}-count`} className="sr-only">
                            {entries.length} selected
                            {entries.length ? `: ${entries.map((e) => e.label).join(', ')}` : ''}
                        </span>
                    </>
                }
                onKeyDown={(e: any) => {
                    if (e.key === 'Backspace' && !text && entries.length) {
                        e.preventDefault();
                        remove(entries[entries.length - 1].value);
                    }
                }}
                onBlur={() => {
                    setText('');
                    field.blur();
                }}
                className={cx(entries.length ? '' : '')}
            />
        </FieldShell>
    );
}

export default function ListFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <ListField name="watch_list" table="incident" label="Watch list" />
        </div>
    );
}
