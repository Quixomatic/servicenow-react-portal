import { useMemo, useState } from 'react';
import { useFilterFields, useFieldPath } from 'utilities:app/list-data';
import type { FilterField } from 'utilities:app/list-data';
import { Combobox } from 'components:app/combobox';
import type { ComboItem } from 'components:app/combobox';
import { cx, IconChevronRight, IconChevronLeft } from 'components:app/field';

export type PickedField = {
    path: string;
    label: string;
    table: string;
    field: string;
    type: string;
    referenceTable?: string;
};

export type FieldPickerProps = {
    table: string;
    /** Selected field path ('caller_id.department'). */
    value: string;
    onChange: (field: PickedField) => void;
    /** Allow walking into reference fields (default true). */
    dotWalk?: boolean;
    /** Only offer these fields at the top level (names). */
    fields?: string[];
    'aria-label'?: string;
    autoFocus?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    /** Field-primitive wiring (app/field-name-field): input id, label / description ids, states. */
    id?: string;
    name?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    invalid?: boolean;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    /** Emitted on blur (the field's touched state). */
    onBlur?: () => void;
    /** Only offer fields of these types (e.g. ['reference']). */
    types?: string[];
    /** Inside the frame, after the input (a clear button). */
    endAdornment?: any;
};

const WALK = '__walk:';
const BACK = '__back';

/**
 * Field picker with dot-walking: a searchable list of the table's fields. Reference fields also
 * offer "Caller ›", which walks into the referenced table (its fields replace the list; "‹ Back"
 * walks out). Selecting a field emits its full path, type and owning table.
 */
export function FieldPicker(props: FieldPickerProps) {
    const { table, value, dotWalk = true } = props;
    const resolved = useFieldPath(table, value || undefined);
    const [open, setOpen] = useState(false);
    const [text, setText] = useState<string | null>(null);
    // The walk while the list is open: steps from the root table.
    const [walk, setWalk] = useState<{ table: string; field: string; label: string }[]>([]);
    const currentTable = walk.length ? (walk[walk.length - 1] as any).target : table;
    const fieldsQ = useFilterFields(currentTable, { enabled: open || !value });

    const items = useMemo<ComboItem[]>(() => {
        const all: FilterField[] = (fieldsQ.data && fieldsQ.data.fields) || [];
        const byName =
            !walk.length && props.fields && props.fields.length
                ? all.filter((f) => props.fields!.indexOf(f.name) >= 0)
                : all;
        const allowed =
            props.types && props.types.length
                ? byName.filter((f) => props.types!.indexOf(f.type) >= 0 || (dotWalk && !!f.referenceTable))
                : byName;
        const q = (text || '').trim().toLowerCase();
        const match = (f: FilterField) =>
            !q || f.label.toLowerCase().indexOf(q) >= 0 || f.name.toLowerCase().indexOf(q) >= 0;
        const out: ComboItem[] = [];
        if (walk.length)
            out.push({
                value: BACK,
                label: `‹ Back to ${walk.length > 1 ? walk[walk.length - 2].label : 'all fields'}`,
                group: walk.map((w) => w.label).join(' › '),
            });
        for (const f of allowed.filter(match)) {
            if (!props.types || !props.types.length || props.types.indexOf(f.type) >= 0)
                out.push({
                    value: f.name,
                    label: f.label,
                    description: f.name,
                    data: f,
                    group: walk.length ? walk.map((w) => w.label).join(' › ') : undefined,
                });
            if (dotWalk && f.referenceTable && f.type === 'reference' && walk.length < 4)
                out.push({
                    value: WALK + f.name,
                    label: `${f.label} ›`,
                    description: `Fields of ${f.referenceTable}`,
                    data: f,
                    group: walk.length ? walk.map((w) => w.label).join(' › ') : undefined,
                });
        }
        return out;
    }, [fieldsQ.data, text, walk, dotWalk, props.fields, props.types]);

    const shown = text !== null ? text : resolved.data ? resolved.data.label : value || '';

    const onSelect = (item: ComboItem) => {
        if (item.value === BACK) {
            setWalk((w) => w.slice(0, -1));
            setText('');
            return;
        }
        const f = item.data as FilterField;
        if (item.value.startsWith(WALK)) {
            setWalk((w) =>
                w.concat([{ table: currentTable, field: f.name, label: f.label, target: f.referenceTable } as any])
            );
            setText('');
            return;
        }
        const path = walk
            .map((w) => w.field)
            .concat(f.name)
            .join('.');
        const label = walk
            .map((w) => w.label)
            .concat(f.label)
            .join(' › ');
        props.onChange({
            path,
            label,
            table: currentTable,
            field: f.name,
            type: f.type,
            referenceTable: f.referenceTable,
        });
        setText(null);
        setWalk([]);
        setOpen(false);
    };

    return (
        <Combobox
            id={props.id}
            name={props.name}
            aria-labelledby={props['aria-labelledby']}
            aria-describedby={props['aria-describedby']}
            invalid={props.invalid}
            required={props.required}
            disabled={props.disabled}
            onBlur={props.onBlur}
            endAdornment={props.endAdornment}
            aria-label={props['aria-labelledby'] ? undefined : props['aria-label'] || 'Field'}
            inputValue={shown}
            onInputChange={(t) => setText(t)}
            items={items}
            onSelect={onSelect}
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) {
                    setText(null);
                    setWalk([]);
                } else setText((t) => (t === null ? '' : t));
            }}
            loading={fieldsQ.isLoading}
            emptyText={fieldsQ.isLoading ? 'Loading fields…' : 'No matching fields'}
            placeholder={props.placeholder || 'Choose field'}
            size={props.size || 'sm'}
            autoFocus={props.autoFocus}
            className={cx('min-w-0', props.className)}
            renderItem={(item) => (
                <span className="flex min-w-0 flex-1 items-center gap-2">
                    {item.value === BACK ? <IconChevronLeft size={14} className="text-muted-foreground" /> : null}
                    <span className="truncate">
                        {item.value.startsWith(WALK) ? item.label.replace(/ ›$/, '') : item.label}
                    </span>
                    {item.value.startsWith(WALK) ? (
                        <IconChevronRight size={14} className="ml-auto text-muted-foreground" />
                    ) : null}
                </span>
            )}
        />
    );
}
