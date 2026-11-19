/**
 * components:app/mrvs: multi-row variable sets.
 *
 * A grid of rows (columns = the set's variables not hidden on the grid) with Add, Edit and Remove.
 * Rows are edited in a modal dialog (native <dialog>: top layer, inert background, Escape closes,
 * focus returns to the button that opened it). Each row editor is its own form store, with the
 * row form metadata the platform evaluates for the set (fetched once per set and cached), so the
 * same field primitives render the row's variables.
 *
 * Value: the platform's MRVS format, a JSON array of rows keyed by the set's variable names,
 * stored on the parent form's 'variables.<set>' field; display values ride along in the display
 * value. maxRows disables Add; unique columns are enforced on save.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useField, FieldShell, FormProvider, createFormStore, cx, adornmentButtonClass, IconPlus, IconX, Spinner } from 'components:app/field'
import type { FieldLayout } from 'components:app/field'
import { FieldControl } from 'components:app/field-control'
import { Button } from 'components:button'
import { useMrvsRowForm } from 'utilities:app/catalog'
import type { CatalogVariable, MrvsRowField } from 'utilities:app/catalog'
import { variableSpec } from 'components:app/variable'

export type MrvsProps = {
    /** Parent form field ('variables.<set name>'). */
    name: string
    variable: CatalogVariable
    itemId: string
    sourceTable?: string
    layout?: FieldLayout
}

type Row = { value: Record<string, string>; display: Record<string, string> }

function parseRows(value: string, displayValue: string): Row[] {
    let values: Record<string, string>[] = []
    let displays: Record<string, string>[] = []
    try {
        values = JSON.parse(value || '[]') || []
    } catch (e) {
        values = []
    }
    try {
        displays = JSON.parse(displayValue || '[]') || []
    } catch (e) {
        displays = []
    }
    return values.map((v, i) => ({ value: v || {}, display: (Array.isArray(displays) && displays[i]) || {} }))
}

/** Row form field → a catalog variable for app/variable's mapping. */
function rowVariable(f: MrvsRowField, itemId: string, setId: string): CatalogVariable {
    const isChoice = !!(f.choices && f.choices.length)
    return {
        __typename: isChoice ? 'AppCatalog_ChoiceQuestionElementType' : f.reference ? 'AppCatalog_ReferenceQuestionElementType' : 'AppCatalog_StandardQuestionElementType',
        type: f.type,
        id: f.sysId,
        name: `variables.${f.name}`,
        variableName: f.name,
        label: f.label,
        mandatory: f.mandatory,
        readOnly: f.readOnly,
        visible: f.visible,
        variableAttributes: f.attributes,
        defaultValue: f.value,
        showHelp: !!f.helpText,
        helpText: f.helpText,
        exampleText: f.placeholder,
        choices: isChoice ? (f.choices || []).map((c) => ({ value: c.value, displayValue: c.label })) : undefined,
        includeNone: isChoice && (f.choices || []).some((c) => c.value === ''),
        reference: f.reference,
        referenceQual: f.referenceQual,
        referringTable: 'sc_cat_item',
        referringRecordId: `${itemId}$${setId}`,
    }
}

export function Mrvs(props: MrvsProps) {
    const { variable } = props
    const field = useField({ name: props.name, label: variable.label })
    const rows = useMemo(() => parseRows(field.value, field.displayValue), [field.value, field.displayValue])
    const columns = (variable.fields || []).filter((f) => !f.hideOnGrid)
    const max = variable.maxRows || 0
    const full = max > 0 && rows.length >= max
    const [editing, setEditing] = useState<{ index: number; opener: HTMLElement | null } | null>(null)
    const readOnly = field.state.readOnly || field.state.disabled
    const captionId = `${field.ids.input}-caption`

    const write = (next: Row[]) => {
        field.setValue(JSON.stringify(next.map((r) => r.value)), JSON.stringify(next.map((r) => r.display)))
        field.blur()
    }

    return (
        <FieldShell field={field} layout={props.layout} keepControlWhenReadOnly group labelAside={max ? `${rows.length} of ${max} rows` : `${rows.length} row${rows.length === 1 ? '' : 's'}`}>
            <div className="flex flex-col gap-2" data-rpv-mrvs={variable.variableName || ''}>
                <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-left text-sm" aria-describedby={field.describedBy}>
                        <caption id={captionId} className="sr-only">
                            {field.label}
                        </caption>
                        <thead className="bg-muted text-xs text-muted-foreground">
                            <tr>
                                {columns.map((c) => (
                                    <th key={c.name} scope="col" className="px-3 py-2 font-medium">
                                        {c.label}
                                    </th>
                                ))}
                                {!readOnly ? (
                                    <th scope="col" className="w-24 px-3 py-2 text-right font-medium">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                ) : null}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length ? (
                                rows.map((r, i) => (
                                    <tr key={i} className="border-t border-border" data-rpv-row={i}>
                                        {columns.map((c) => (
                                            <td key={c.name} className="px-3 py-2">
                                                {r.display[c.name] || r.value[c.name] || <span className="text-muted-foreground">—</span>}
                                            </td>
                                        ))}
                                        {!readOnly ? (
                                            <td className="px-2 py-1 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    className="rounded-sm px-2 py-1 text-xs text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                                                    aria-label={`Edit row ${i + 1}`}
                                                    onClick={(e: any) => setEditing({ index: i, opener: e.currentTarget })}
                                                >
                                                    Edit
                                                </button>
                                                <button type="button" className={adornmentButtonClass} aria-label={`Remove row ${i + 1}`} onClick={() => write(rows.filter((_, j) => j !== i))}>
                                                    <IconX size={14} />
                                                </button>
                                            </td>
                                        ) : null}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length + (readOnly ? 0 : 1)} className="px-3 py-4 text-center text-sm text-muted-foreground">
                                        No rows yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!readOnly ? (
                    <div>
                        <Button type="button" variant="outline" size="sm" disabled={full} onClick={(e: any) => setEditing({ index: -1, opener: e.currentTarget })}>
                            <IconPlus size={14} /> Add row
                        </Button>
                        {full ? <span className="ml-2 text-xs text-muted-foreground">Maximum of {max} rows reached</span> : null}
                    </div>
                ) : null}
            </div>
            {editing ? (
                <RowDialog
                    title={`${editing.index < 0 ? 'Add' : 'Edit'} ${variable.label} row`}
                    setId={variable.id}
                    itemId={props.itemId}
                    sourceTable={props.sourceTable}
                    row={editing.index >= 0 ? rows[editing.index] : undefined}
                    uniqueColumns={(variable.fields || []).filter((f) => f.unique).map((f) => f.name)}
                    otherRows={rows.filter((_, j) => j !== editing.index)}
                    onCancel={() => {
                        const opener = editing.opener
                        setEditing(null)
                        if (opener) setTimeout(() => opener.focus(), 0)
                    }}
                    onSave={(row) => {
                        const next = rows.slice()
                        if (editing.index < 0) next.push(row)
                        else next[editing.index] = row
                        write(next)
                        const opener = editing.opener
                        setEditing(null)
                        if (opener) setTimeout(() => opener.focus(), 0)
                    }}
                />
            ) : null}
        </FieldShell>
    )
}

function RowDialog(props: {
    title: string
    setId: string
    itemId: string
    sourceTable?: string
    row?: Row
    uniqueColumns: string[]
    otherRows: Row[]
    onCancel: () => void
    onSave: (row: Row) => void
}) {
    const ref = useRef<HTMLDialogElement | null>(null)
    const meta = useMrvsRowForm(props.setId, props.itemId, props.sourceTable)
    const [error, setError] = useState('')
    const titleId = `rpv-mrvs-${props.setId}-title`

    useEffect(() => {
        const d = ref.current as any
        if (d && !d.open && typeof d.showModal === 'function') d.showModal()
    }, [])

    // One child form store per row editor, loaded with the row form metadata and the row's values.
    const child = useMemo(() => {
        if (!meta.data) return null
        const store = createFormStore({ table: 'sc_cat_item', sysId: props.itemId })
        const specs = meta.data.fields.map((f) => variableSpec(rowVariable(f, props.itemId, props.setId), { table: 'sc_cat_item' }))
        const values: Record<string, { value: string; displayValue: string }> = {}
        const metas: Record<string, any> = {}
        specs.forEach((s, i) => {
            const f = meta.data!.fields[i]
            const col = s.variable.variableName as string
            const v = props.row ? props.row.value[col] : undefined
            values[s.name] = v !== undefined ? { value: v, displayValue: (props.row && props.row.display[col]) || v } : { value: f.value, displayValue: f.displayValue || f.value }
            if (s.meta) metas[s.name] = s.meta
        })
        store.load({ values, meta: metas })
        for (const s of specs) if (s.variable.visible === false) store.setVisible(s.name, false)
        const form = Object.create(store)
        form.status = { isLoading: false, isFetching: false, error: null, loaded: true }
        form.refetch = () => {}
        return { form, specs }
    }, [meta.data])

    const save = () => {
        if (!child) return
        const result = child.form.validate()
        if (!result.valid) {
            setError(result.errors.map((e: any) => e.message).join(' · '))
            return
        }
        const row: Row = { value: {}, display: {} }
        for (const s of child.specs) {
            const col = s.variable.variableName as string
            row.value[col] = child.form.getValue(s.name)
            row.display[col] = child.form.getDisplayValue(s.name) || row.value[col]
        }
        const dupes = props.uniqueColumns.filter((c) => row.value[c] && props.otherRows.some((r) => r.value[c] === row.value[c]))
        if (dupes.length) {
            setError(`These values must be unique across rows: ${dupes.join(', ')}`)
            return
        }
        props.onSave(row)
    }

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            className="rpf-popup m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/50"
            onCancel={(e: any) => {
                e.preventDefault()
                props.onCancel()
            }}
        >
            <form
                method="dialog"
                className="flex max-h-[85vh] flex-col"
                onSubmit={(e: any) => {
                    e.preventDefault()
                    save()
                }}
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h2 id={titleId} className="text-base font-semibold">
                        {props.title}
                    </h2>
                    <button type="button" className={adornmentButtonClass} aria-label="Close" onClick={props.onCancel}>
                        <IconX size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {meta.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {(meta.error as Error).message}
                        </p>
                    ) : !child ? (
                        <Spinner label="Loading the row form" />
                    ) : (
                        <FormProvider form={child.form}>
                            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                                {child.specs.map((s: any, i: number) =>
                                    s.kind === 'field' ? <FieldControl key={s.name} name={s.name} type={s.fieldType} autoFocus={i === 0} {...(s.fieldProps || {})} /> : null,
                                )}
                            </div>
                        </FormProvider>
                    )}
                    {error ? (
                        <p role="alert" className="mt-4 text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                    <Button type="button" variant="outline" onClick={props.onCancel}>
                        Cancel
                    </Button>
                    <Button type="button" disabled={!child} onClick={save}>
                        {props.row ? 'Save row' : 'Add row'}
                    </Button>
                </div>
            </form>
        </dialog>
    )
}

export default function MrvsPreview() {
    return <div className="p-4 text-sm text-muted-foreground">MRVS renders inside a catalog form (app/catalog-item).</div>
}
