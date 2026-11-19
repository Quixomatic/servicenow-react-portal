/**
 * components:app/choice-field: choice lists as a select (default), radio group or a horizontal
 * scale (numeric scale / segmented).
 *
 * Choices: explicit `choices` → server-evaluated dependent choices (choiceDataRetriever with the
 * dependent field's unsaved value, when the field has a dictionary dependent field) → cached
 * table metadata (filtered locally by `dependentValue`). When the dependent value changes and the
 * current value is no longer offered, the value is cleared, as the platform does.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useChoices } from 'utilities:app/graphql'
import type { Choice } from 'utilities:app/graphql'
import { useField, FieldShell, cx } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { Select } from 'components:app/combobox'

export type ChoiceFieldProps = FieldProps & {
    variant?: 'select' | 'radio' | 'scale'
    choices?: Choice[]
    /** Add a "-- None --" option when the list has none (select only). */
    includeNone?: boolean
    /** Radio direction. */
    direction?: 'vertical' | 'horizontal'
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

export function ChoiceField(props: ChoiceFieldProps) {
    const field = useField(props)
    const { variant = 'select' } = props
    const dependsOn = field.meta.dependsOn
    const { choices: loaded, isLoading, isFetching } = useChoices({
        table: field.table,
        field: field.name,
        sysId: field.lookup.sysId,
        dependsOn: field.bound ? dependsOn : undefined,
        dependentValue: field.dependentValue,
        staticChoices: props.choices || (field.meta.source === 'props' ? field.meta.choices : undefined),
        encodedRecord: field.lookup.encodedRecord,
        enabled: !field.state.readOnly || !field.displayValue,
    })
    const choices = useMemo(() => {
        const list = loaded.length ? loaded : field.meta.choices || []
        if (props.includeNone && variant === 'select' && !list.some((c) => c.value === '')) return [{ value: '', label: '-- None --' }].concat(list)
        return list
    }, [loaded, field.meta.choices, props.includeNone, variant])

    // Dependent value changed and the current value is no longer offered: clear it.
    const prevDep = useRef(field.dependentValue)
    useEffect(() => {
        if (prevDep.current === field.dependentValue) return
        if (isFetching || isLoading) return
        prevDep.current = field.dependentValue
        if (field.value && !choices.some((c) => c.value === field.value)) field.setValue('', '')
    }, [field.dependentValue, isFetching, isLoading, choices])

    const labelOf = (v: string) => {
        const c = choices.find((x) => x.value === v)
        return c ? c.label : field.displayValue || v
    }
    const readOnlyText = field.value ? labelOf(field.value) : ''

    if (variant === 'select') {
        return (
            <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} className={props.className} readOnlyValue={readOnlyText || undefined}>
                <Select
                    id={field.ids.input}
                    value={field.value}
                    items={choices.map((c) => ({ value: c.value, label: c.label }))}
                    fallbackLabel={field.displayValue}
                    onChange={(item) => {
                        field.setValue(item.value, item.value === '' ? '' : item.label)
                        field.blur()
                    }}
                    aria-labelledby={field.ids.label}
                    aria-describedby={field.describedBy}
                    invalid={field.invalid}
                    required={field.state.mandatory}
                    disabled={field.state.disabled}
                    loading={isLoading || isFetching}
                    placeholder={field.placeholder || '-- None --'}
                    size={props.size}
                    onBlur={field.blur}
                    autoFocus={field.autoFocus}
                />
            </FieldShell>
        )
    }

    // Radio group / scale: native radios in a fieldset (arrow keys move between options).
    const options = choices.filter((c) => variant === 'scale' || c.value !== '' || props.includeNone)
    const horizontal = variant === 'scale' || props.direction === 'horizontal'
    return (
        <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} className={props.className} group readOnlyValue={readOnlyText || undefined}>
            <div
                role="radiogroup"
                aria-labelledby={field.ids.label}
                aria-describedby={field.describedBy}
                aria-required={field.state.mandatory || undefined}
                aria-invalid={field.invalid || undefined}
                id={field.ids.input}
                className={cx(
                    variant === 'scale' ? 'inline-flex w-fit overflow-hidden rounded-md border border-input shadow-xs' : horizontal ? 'flex flex-wrap gap-x-5 gap-y-2' : 'flex flex-col gap-2',
                    field.invalid && variant === 'scale' ? 'border-destructive' : '',
                )}
            >
                {options.map((c, i) => {
                    const checked = field.value === c.value
                    const optId = `${field.ids.input}-${i}`
                    if (variant === 'scale')
                        return (
                            <label
                                key={c.value || '_none'}
                                htmlFor={optId}
                                className={cx(
                                    'relative cursor-pointer px-3 py-1.5 text-sm transition-colors select-none has-[:focus-visible]:z-10 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                                    i > 0 ? 'border-l border-input' : '',
                                    checked ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
                                    field.state.disabled ? 'pointer-events-none opacity-50' : '',
                                )}
                            >
                                <input
                                    id={optId}
                                    type="radio"
                                    name={field.ids.input}
                                    value={c.value}
                                    checked={checked}
                                    disabled={field.state.disabled}
                                    className="sr-only"
                                    onChange={() => field.setValue(c.value, c.label)}
                                    onBlur={field.blur}
                                />
                                {c.label}
                            </label>
                        )
                    return (
                        <label key={c.value || '_none'} htmlFor={optId} className={cx('inline-flex w-fit cursor-pointer items-center gap-2 text-sm', field.state.disabled ? 'cursor-not-allowed opacity-50' : '')}>
                            <input
                                id={optId}
                                type="radio"
                                name={field.ids.input}
                                value={c.value}
                                checked={checked}
                                disabled={field.state.disabled}
                                className={cx(
                                    'size-4 shrink-0 cursor-[inherit] appearance-none rounded-full border border-input bg-background shadow-xs outline-none',
                                    'checked:border-[5px] checked:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                    field.invalid ? 'border-destructive' : '',
                                )}
                                onChange={() => field.setValue(c.value, c.label)}
                                onBlur={field.blur}
                            />
                            {c.label}
                        </label>
                    )
                })}
            </div>
        </FieldShell>
    )
}

const SAMPLE: Choice[] = [
    { value: '1', label: '1 - High' },
    { value: '2', label: '2 - Medium' },
    { value: '3', label: '3 - Low' },
]

export default function ChoiceFieldPreview() {
    return (
        <div className="flex max-w-md flex-col gap-4 p-4">
            <ChoiceField name="impact" label="Impact" choices={SAMPLE} includeNone />
            <ChoiceField name="impact_r" label="Impact (radio)" variant="radio" choices={SAMPLE} defaultValue="2" />
            <ChoiceField name="impact_s" label="Impact (scale)" variant="scale" choices={SAMPLE} defaultValue="3" />
        </div>
    )
}
