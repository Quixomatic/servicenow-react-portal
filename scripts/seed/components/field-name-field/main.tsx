/**
 * components:app/field-name-field: the `field_name` dictionary type: pick a column of a table.
 *
 *   <FieldNameField name="fieldname" />                              bound: the table is the dependent field's value
 *   <FieldNameField name="f" label="Field" fieldTable="incident" />  standalone
 *
 * Reuses app/condition-builder's FieldPicker (searchable by label or name). The table comes from
 * `fieldTable`, else the dictionary attribute `table`, else the dictionary dependent field's value
 * (e.g. sys_translated_text.fieldname depends on `tablename`); until there is one, the field says
 * so. The attribute `tree_picker=true` (or `dotWalk`) allows dot-walked paths ('caller_id.email');
 * `types` limits the offered columns. The value is the column name (or path), the display value
 * its label.
 */
import { useFieldPath } from 'utilities:app/list-data'
import { useField, FieldShell, adornmentButtonClass, IconX, Spinner } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { FieldPicker } from 'components:app/condition-builder'
import type { PickedField } from 'components:app/condition-builder'

export type FieldNameFieldProps = FieldProps & {
    /** Table whose columns are offered (overrides the dictionary). */
    fieldTable?: string
    /** Allow dot-walked paths. */
    dotWalk?: boolean
    /** Only columns of these glide types. */
    types?: string[]
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

const TABLE_NAME = /^[a-z0-9_]+$/i

/** The table a field_name field lists (explicit, attribute `table`, then the dependent value). */
export function fieldNameTableOf(opts: { explicit?: string; attributes?: Record<string, string>; dependentValue?: string }): string | undefined {
    const a = opts.attributes || {}
    for (const c of [opts.explicit, a.table, opts.dependentValue]) if (c && TABLE_NAME.test(String(c).trim())) return String(c).trim()
    return undefined
}

export function FieldNameField(props: FieldNameFieldProps) {
    const field = useField(props)
    const attrs = field.meta.attributes || {}
    const table = fieldNameTableOf({ explicit: props.fieldTable, attributes: attrs, dependentValue: field.dependentValue })
    const dotWalk = props.dotWalk ?? attrs.tree_picker === 'true'
    const resolved = useFieldPath(table, field.value || undefined)
    const label = resolved.data ? resolved.data.label : field.displayValue && field.displayValue !== field.value ? field.displayValue : field.value

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={
                field.value ? (
                    <span>
                        {resolved.isLoading ? <Spinner label="Reading field" /> : label} <span className="font-mono text-xs text-muted-foreground">{field.value}</span>
                    </span>
                ) : undefined
            }
        >
            {table ? (
                <FieldPicker
                    key={table}
                    table={table}
                    value={field.value}
                    dotWalk={dotWalk}
                    types={props.types}
                    id={field.ids.input}
                    name={field.name}
                    aria-labelledby={field.ids.label}
                    aria-describedby={field.describedBy}
                    invalid={field.invalid}
                    required={field.state.mandatory}
                    disabled={field.state.disabled}
                    autoFocus={field.autoFocus}
                    size={props.size || 'md'}
                    placeholder={field.placeholder || 'Choose a field'}
                    onBlur={field.blur}
                    onChange={(f: PickedField) => {
                        if (f.path !== field.value) field.setValue(f.path, f.label)
                    }}
                    endAdornment={
                        field.value && !field.state.disabled ? (
                            <button type="button" className={adornmentButtonClass} aria-label={`Clear ${field.label}`} onPointerDown={(e: any) => e.preventDefault()} onClick={() => field.setValue('', '')}>
                                <IconX size={14} />
                            </button>
                        ) : null
                    }
                />
            ) : (
                <p id={field.ids.input} className="flex min-h-9 items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
                    {field.value ? `${field.value} (choose a table to change it)` : 'Choose a table first'}
                </p>
            )}
        </FieldShell>
    )
}

export default function FieldNameFieldPreview() {
    return (
        <div className="flex max-w-sm flex-col gap-4 p-4">
            <FieldNameField name="field" label="Field" fieldTable="incident" defaultValue="priority" />
            <FieldNameField name="path" label="Field (dot-walk)" fieldTable="incident" dotWalk />
        </div>
    )
}
