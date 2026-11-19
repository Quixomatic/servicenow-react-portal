import { useMemo, useRef, useState } from 'react'
import { useUser } from '@portal/runtime'
import { useChoices } from 'utilities:app/graphql'
import { DATE_PRESETS, RELATIVE_UNITS, specificDay, dateGenerate, dateOf, parseRelative, formatRelative } from 'utilities:app/list-data'
import type { Editor } from 'utilities:app/list-data'
import { controlClass, cx, optionClass, IconCheck, IconChevronDown } from 'components:app/field'
import { Select, Popup } from 'components:app/combobox'
import { ChoiceField } from 'components:app/choice-field'
import { ReferenceField } from 'components:app/reference-field'
import { DateField } from 'components:app/date-field'

export type ValueEditorProps = {
    editor: Editor
    /** Table that owns the field (the end of a dot-walk). */
    table: string
    field: string
    fieldLabel: string
    referenceTable?: string
    value: string
    onChange: (value: string) => void
    size?: 'sm' | 'md'
}

const ME = 'javascript:gs.getUserID()'

/**
 * The value part of a condition, by operator editor. Reference, choice and date values reuse the
 * field primitives (standalone, label visually hidden) so search, choices and date entry behave
 * exactly like forms.
 */
export function ValueEditor(props: ValueEditorProps) {
    const { editor, table, field, value, onChange, fieldLabel } = props
    const label = `Value for ${fieldLabel}`
    const inputCls = controlClass({ size: 'sm' })
    switch (editor) {
        case 'none':
            return null
        case 'string':
        case 'list':
            return (
                <input
                    aria-label={label}
                    className={inputCls}
                    value={value}
                    placeholder={editor === 'list' ? 'a, b, c' : ''}
                    onChange={(e: any) => onChange(editor === 'list' ? e.target.value.replace(/\s*,\s*/g, ',') : e.target.value)}
                />
            )
        case 'number':
            return <input aria-label={label} className={inputCls} type="number" inputMode="decimal" value={value} onChange={(e: any) => onChange(e.target.value)} />
        case 'number-range': {
            const [a, b] = value.split('@')
            return (
                <span className="flex min-w-0 items-center gap-2">
                    <input aria-label={`${label}, from`} className={inputCls} type="number" value={a || ''} onChange={(e: any) => onChange(`${e.target.value}@${b || ''}`)} />
                    <span className="text-xs text-muted-foreground">and</span>
                    <input aria-label={`${label}, to`} className={inputCls} type="number" value={b || ''} onChange={(e: any) => onChange(`${a || ''}@${e.target.value}`)} />
                </span>
            )
        }
        case 'boolean':
            return (
                <Select
                    aria-label={label}
                    size="sm"
                    value={value}
                    items={[
                        { value: 'true', label: 'true' },
                        { value: 'false', label: 'false' },
                    ]}
                    onChange={(i) => onChange(i.value)}
                />
            )
        case 'choice':
            return (
                <span className="rpl-bare min-w-0">
                    <ChoiceField name={field} table={table} label={label} standalone value={value} onChange={(v: string) => onChange(v)} size="sm" />
                </span>
            )
        case 'choice-multi':
            return <MultiChoice table={table} field={field} label={label} value={value} onChange={onChange} />
        case 'reference':
            return <ReferenceValue {...props} label={label} />
        case 'date-preset':
            return <DatePreset label={label} value={value} onChange={onChange} />
        case 'date': {
            return (
                <span className="rpl-bare min-w-0">
                    <DateField name={`${field}-value`} type="glide_date" label={label} standalone value={dateOf(value)} onChange={(v: string) => onChange(v ? dateGenerate(v, 'start') : '')} size="sm" />
                </span>
            )
        }
        case 'date-range': {
            const [a, b] = value.split('@')
            return (
                <span className="flex min-w-0 items-center gap-2">
                    <span className="rpl-bare min-w-0 flex-1">
                        <DateField name={`${field}-from`} type="glide_date" label={`${label}, from`} standalone value={dateOf(a || '')} onChange={(v: string) => onChange(`${v ? dateGenerate(v, 'start') : ''}@${b || ''}`)} size="sm" />
                    </span>
                    <span className="text-xs text-muted-foreground">and</span>
                    <span className="rpl-bare min-w-0 flex-1">
                        <DateField name={`${field}-to`} type="glide_date" label={`${label}, to`} standalone value={dateOf(b || '')} onChange={(v: string) => onChange(`${a || ''}@${v ? dateGenerate(v, 'end') : ''}`)} size="sm" />
                    </span>
                </span>
            )
        }
        case 'relative': {
            const r = parseRelative(value)
            return (
                <span className="flex min-w-0 items-center gap-2">
                    <input aria-label={`${label}, amount`} className={cx(inputCls, 'w-20')} type="number" min={0} value={r.n} onChange={(e: any) => onChange(formatRelative({ ...r, n: e.target.value }))} />
                    <Select aria-label={`${label}, unit`} size="sm" value={r.unit} items={RELATIVE_UNITS} onChange={(i) => onChange(formatRelative({ ...r, unit: i.value }))} />
                    <Select
                        aria-label={`${label}, direction`}
                        size="sm"
                        value={r.dir}
                        items={[
                            { value: 'ago', label: 'ago' },
                            { value: 'ahead', label: 'from now' },
                        ]}
                        onChange={(i) => onChange(formatRelative({ ...r, dir: i.value }))}
                    />
                </span>
            )
        }
        default:
            return <input aria-label={label} className={inputCls} value={value} onChange={(e: any) => onChange(e.target.value)} />
    }
}

function ReferenceValue(props: ValueEditorProps & { label: string }) {
    const { table, field, value, onChange, referenceTable, label } = props
    const user = useUser() as { sysId?: string }
    const isUserRef = referenceTable === 'sys_user'
    const isMe = value === ME || (!!user.sysId && value === ME)
    if (isMe)
        return (
            <span className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-md border border-input bg-muted px-2.5 text-sm">Me (the current user)</span>
                <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => onChange('')}>
                    Pick a user
                </button>
            </span>
        )
    return (
        <span className="flex min-w-0 items-center gap-2">
            <span className="rpl-bare min-w-0 flex-1">
                <ReferenceField name={field} table={table} type="reference" reference={referenceTable} label={label} standalone value={value} onChange={(v: string) => onChange(v)} size="sm" />
            </span>
            {isUserRef ? (
                <button type="button" className="shrink-0 text-xs text-primary underline-offset-2 hover:underline" onClick={() => onChange(ME)}>
                    Me
                </button>
            ) : null}
        </span>
    )
}

function DatePreset({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const preset = DATE_PRESETS.find((p) => p.value === value)
    const specific = !preset && !!value
    const items = DATE_PRESETS.map((p) => ({ value: p.value, label: p.label })).concat([{ value: '__specific', label: 'A specific date…' }])
    return (
        <span className="flex min-w-0 items-center gap-2">
            <Select
                aria-label={label}
                size="sm"
                value={specific ? '__specific' : value}
                items={items}
                placeholder="Pick a date range"
                onChange={(i) => onChange(i.value === '__specific' ? specificDay(new Date().toISOString().slice(0, 10)) : i.value)}
            />
            {specific ? (
                <span className="rpl-bare min-w-0">
                    <DateField name="date-specific" type="glide_date" label={`${label}, date`} standalone value={dateOf(value)} onChange={(v: string) => onChange(v ? specificDay(v) : '')} size="sm" />
                </span>
            ) : null}
        </span>
    )
}

/** "is one of": a checkbox listbox over the field's choices; value = comma-separated. */
function MultiChoice({ table, field, label, value, onChange }: { table: string; field: string; label: string; value: string; onChange: (v: string) => void }) {
    const { choices, isLoading } = useChoices({ table, field })
    const selected = useMemo(() => new Set(value ? value.split(',') : []), [value])
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const anchor = useRef<HTMLButtonElement | null>(null)
    const list = choices.filter((c) => c.value !== '')
    const toggle = (v: string) => {
        const next = new Set(selected)
        if (next.has(v)) next.delete(v)
        else next.add(v)
        onChange(list.map((c) => c.value).filter((x) => next.has(x)).join(','))
    }
    const summary = list.filter((c) => selected.has(c.value)).map((c) => c.label)
    const listId = `rpl-mc-${table}-${field}`
    return (
        <span className="min-w-0">
            <button
                ref={anchor}
                type="button"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                className={cx(controlClass({ size: 'sm' }), 'justify-between gap-2 pr-2 text-left')}
                onClick={() => setOpen(!open)}
                onKeyDown={(e: any) => {
                    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        setOpen(true)
                        return
                    }
                    if (!open) return
                    if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setActive((i) => Math.min(list.length - 1, i + 1))
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActive((i) => Math.max(0, i - 1))
                    } else if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        if (list[active]) toggle(list[active].value)
                    } else if (e.key === 'Escape') {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpen(false)
                    }
                }}
                aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
            >
                <span className={cx('truncate', summary.length ? '' : 'text-muted-foreground')}>{summary.length ? summary.join(', ') : isLoading ? 'Loading…' : 'Choose values'}</span>
                <IconChevronDown size={14} className="text-muted-foreground" />
            </button>
            <Popup anchor={anchor} open={open} onDismiss={() => setOpen(false)} id={listId} role="listbox" aria-multiselectable aria-label={label} minWidth={200}>
                {list.map((c, i) => (
                    <div
                        key={c.value}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={selected.has(c.value)}
                        className={optionClass(i === active, selected.has(c.value))}
                        onPointerDown={(e: any) => e.preventDefault()}
                        onPointerMove={() => setActive(i)}
                        onClick={() => toggle(c.value)}
                    >
                        <span className={cx('flex size-4 items-center justify-center rounded-sm border', selected.has(c.value) ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                            {selected.has(c.value) ? <IconCheck size={12} /> : null}
                        </span>
                        {c.label}
                    </div>
                ))}
            </Popup>
        </span>
    )
}
