import { useEffect, useRef, useState } from 'react'
import { useEditability } from 'utilities:app/list-data'
import type { ListColumn, ListRow, WriteResult } from 'utilities:app/list-data'
import { FieldControl } from 'components:app/field-control'
import { Spinner, IconAlert, cx } from 'components:app/field'

export type CellEditorProps = {
    table: string
    row: ListRow
    column: ListColumn
    /** Writes the value; resolves with the platform's result. */
    write: (value: string, displayValue: string) => Promise<WriteResult>
    onDone: (saved: boolean) => void
}

/**
 * Inline cell editor: first asks the platform whether this user may list-edit the cell
 * (getPreFetch: list_edit and field write ACLs), then renders the field primitive for the column's
 * type. A commit (Enter, blur, pick) saves through writeMultiRow; Escape cancels. Errors from
 * business rules / data policies stay in the editor.
 */
export function CellEditor({ table, row, column, write, onDone }: CellEditorProps) {
    const perm = useEditability(table, column.name, [row.sysId], { fieldType: column.type })
    const entry = perm.data ? perm.data[row.sysId] : undefined
    const cell = row.cells[column.name] || { value: '', displayValue: '' }
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const box = useRef<HTMLDivElement | null>(null)

    // Focus the control once it renders (after the grid restores its own focus).
    useEffect(() => {
        if (!entry || !entry.canEdit) return undefined
        const id = requestAnimationFrame(() => {
            const el = box.current && (box.current.querySelector('input,textarea,[role="combobox"],[tabindex="0"]') as HTMLElement | null)
            if (el) el.focus()
        })
        return () => cancelAnimationFrame(id)
    }, [entry && entry.canEdit])

    const commit = async (value: string, displayValue: string) => {
        if (value === cell.value) return onDone(false)
        setSaving(true)
        setErrors([])
        try {
            const res = await write(value, displayValue)
            if (res.ok) return onDone(true)
            setErrors(res.errors.length ? res.errors : ['The platform did not save this value (a business rule, data policy or ACL may have rejected it).'])
        } catch (e) {
            setErrors([(e as Error).message || 'Save failed'])
        } finally {
            setSaving(false)
        }
    }

    if (perm.isLoading)
        return (
            <div className="flex items-center gap-2 px-1 py-1.5 text-sm text-muted-foreground">
                <Spinner label="Checking permission" /> Checking permission…
            </div>
        )
    if (perm.error || !entry || !entry.canEdit)
        return (
            <div className="flex items-start gap-2 px-1 py-1.5 text-sm" role="alert">
                <IconAlert size={16} className="mt-0.5 text-muted-foreground" />
                <span>
                    {perm.error ? (perm.error as Error).message : (entry && entry.reason) || 'You can’t edit this field.'}
                    <span className="block text-xs text-muted-foreground">Press Escape to close.</span>
                </span>
            </div>
        )
    return (
        <div ref={box} className={cx('rpl-bare flex flex-col gap-2', saving ? 'pointer-events-none opacity-70' : '')} aria-busy={saving || undefined}>
            <FieldControl
                name={column.name}
                table={table}
                label={`${column.label} for ${row.display || 'this record'}`}
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
            {errors.length ? (
                <div role="alert" className="flex flex-col gap-1 text-xs text-destructive">
                    {errors.map((m, i) => (
                        <span key={i} className="flex items-start gap-1.5">
                            <IconAlert size={14} className="mt-px" />
                            {m}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
