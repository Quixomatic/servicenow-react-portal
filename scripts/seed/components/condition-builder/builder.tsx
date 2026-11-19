import { useEffect, useId, useMemo, useState } from 'react'
import { parseQuery, serializeQuery, operatorsFor, findOperator, useFieldPath } from 'utilities:app/list-data'
import type { QueryModel, Term, Group } from 'utilities:app/list-data'
import { Select } from 'components:app/combobox'
import { cx, IconPlus, IconX, Spinner } from 'components:app/field'
import { FieldPicker } from './field-picker'
import type { PickedField } from './field-picker'
import { ValueEditor } from './value-editor'

export type ConditionBuilderProps = {
    table: string
    /** Encoded query in (filter part; ORDERBY / keywords are kept and passed through). */
    value: string
    /** Every edit (live). */
    onChange?: (encoded: string) => void
    /** "Run" button (the list applies the filter). Without it the builder is live-only. */
    onApply?: (encoded: string) => void
    onCancel?: () => void
    /** Allow dot-walking in the field picker. */
    dotWalk?: boolean
    /** Allow OR conditions and new criteria (^NQ groups). */
    allowOr?: boolean
    allowNewQuery?: boolean
    /** Only these fields at the top level of the picker. */
    fields?: string[]
    className?: string
    applyLabel?: string
}

const blankTerm = (): Term => ({ field: '', op: '', value: '' })

/**
 * Condition builder: AND/OR conditions in groups (^NQ "new criteria"), a dot-walking field
 * picker, operators per field type and value editors built on the field primitives. Encoded
 * query in, encoded query out.
 */
export function ConditionBuilder(props: ConditionBuilderProps) {
    const { table, allowOr = true, allowNewQuery = true } = props
    const [model, setModel] = useState<QueryModel>(() => withRow(parseQuery(props.value)))
    const [incoming, setIncoming] = useState(props.value)
    if (incoming !== props.value) {
        setIncoming(props.value)
        setModel(withRow(parseQuery(props.value)))
    }
    const encoded = (m: QueryModel) => serializeQuery({ ...m, groups: complete(m.groups) })
    const update = (fn: (m: QueryModel) => QueryModel) => {
        setModel((m) => {
            const next = fn(m)
            if (props.onChange) props.onChange(encoded(next))
            return next
        })
    }
    const setTerm = (gi: number, ci: number, ti: number, patch: Partial<Term>) =>
        update((m) => ({
            ...m,
            groups: m.groups.map((g, i) =>
                i !== gi ? g : { clauses: g.clauses.map((c, j) => (j !== ci ? c : c.map((t, k) => (k !== ti ? t : { ...t, ...patch })))) },
            ),
        }))
    const addAnd = (gi: number, ci: number) =>
        update((m) => ({ ...m, groups: m.groups.map((g, i) => (i !== gi ? g : { clauses: g.clauses.slice(0, ci + 1).concat([[blankTerm()]], g.clauses.slice(ci + 1)) })) }))
    const addOr = (gi: number, ci: number, ti: number) =>
        update((m) => ({
            ...m,
            groups: m.groups.map((g, i) => (i !== gi ? g : { clauses: g.clauses.map((c, j) => (j !== ci ? c : c.slice(0, ti + 1).concat([blankTerm()], c.slice(ti + 1)))) })),
        }))
    const remove = (gi: number, ci: number, ti: number) =>
        update((m) =>
            withRow({
                ...m,
                groups: m.groups
                    .map((g, i) => (i !== gi ? g : { clauses: g.clauses.map((c, j) => (j !== ci ? c : c.filter((_, k) => k !== ti))).filter((c) => c.length) }))
                    .filter((g) => g.clauses.length),
            }),
        )
    const addGroup = () => update((m) => ({ ...m, groups: m.groups.concat([{ clauses: [[blankTerm()]] }]) }))
    const clearAll = () => update((m) => ({ ...m, groups: [{ clauses: [[blankTerm()]] }] }))

    const incompleteCount = useMemo(() => model.groups.reduce((n, g) => n + g.clauses.reduce((k, c) => k + c.filter((t) => !t.field || !t.op).length, 0), 0), [model])
    const termCount = useMemo(() => model.groups.reduce((n, g) => n + g.clauses.reduce((k, c) => k + c.length, 0), 0), [model])

    return (
        <div className={cx('rpl-cb flex flex-col gap-3', props.className)} role="group" aria-label="Filter conditions">
            {model.groups.map((g, gi) => (
                <section key={gi} className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3" aria-label={gi === 0 ? 'Conditions' : `Or, criteria set ${gi + 1}`}>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{gi === 0 ? 'All of these conditions must be met' : 'or all of these conditions must be met'}</span>
                    </div>
                    {g.clauses.map((c, ci) =>
                        c.map((t, ti) => (
                            <ConditionRow
                                key={`${gi}-${ci}-${ti}`}
                                table={table}
                                term={t}
                                join={ti > 0 ? 'or' : ci > 0 ? 'and' : ''}
                                position={`condition ${countBefore(model.groups, gi, ci, ti) + 1} of ${termCount}`}
                                dotWalk={props.dotWalk !== false}
                                fields={props.fields}
                                allowOr={allowOr}
                                onChange={(patch) => setTerm(gi, ci, ti, patch)}
                                onAnd={() => addAnd(gi, ci)}
                                onOr={() => addOr(gi, ci, ti)}
                                onRemove={() => remove(gi, ci, ti)}
                                canRemove={termCount > 1 || !!t.field}
                            />
                        )),
                    )}
                </section>
            ))}
            <div className="flex flex-wrap items-center gap-2">
                {allowNewQuery ? (
                    <button type="button" className={btn('outline')} onClick={addGroup}>
                        <IconPlus size={14} /> New criteria
                    </button>
                ) : null}
                <button type="button" className={btn('ghost')} onClick={clearAll}>
                    Clear all
                </button>
                <span className="ml-auto flex items-center gap-2">
                    {incompleteCount ? <span className="text-xs text-muted-foreground">{incompleteCount} incomplete condition{incompleteCount === 1 ? '' : 's'} ignored</span> : null}
                    {props.onCancel ? (
                        <button type="button" className={btn('ghost')} onClick={props.onCancel}>
                            Cancel
                        </button>
                    ) : null}
                    {props.onApply ? (
                        <button type="button" className={btn('primary')} onClick={() => props.onApply!(encoded(model))}>
                            {props.applyLabel || 'Run'}
                        </button>
                    ) : null}
                </span>
            </div>
        </div>
    )
}

function countBefore(groups: Group[], gi: number, ci: number, ti: number): number {
    let n = 0
    for (let i = 0; i < groups.length; i++)
        for (let j = 0; j < groups[i].clauses.length; j++)
            for (let k = 0; k < groups[i].clauses[j].length; k++) {
                if (i === gi && j === ci && k === ti) return n
                n++
            }
    return n
}

/** Drop incomplete terms (no field or operator) before serializing. */
function complete(groups: Group[]): Group[] {
    return groups.map((g) => ({ clauses: g.clauses.map((c) => c.filter((t) => t.field && t.op)).filter((c) => c.length) })).filter((g) => g.clauses.length)
}

/** Always show at least one (blank) row. */
function withRow(m: QueryModel): QueryModel {
    return m.groups.length ? m : { ...m, groups: [{ clauses: [[blankTerm()]] }] }
}

export function btn(kind: 'primary' | 'outline' | 'ghost' | 'icon' = 'outline'): string {
    return cx(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        kind === 'primary' ? 'bg-primary px-3 text-primary-foreground hover:bg-primary/90' : '',
        kind === 'outline' ? 'border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground' : '',
        kind === 'ghost' ? 'px-3 hover:bg-accent hover:text-accent-foreground' : '',
        kind === 'icon' ? 'size-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground' : '',
    )
}

function ConditionRow(props: {
    table: string
    term: Term
    join: '' | 'and' | 'or'
    position: string
    dotWalk: boolean
    fields?: string[]
    allowOr: boolean
    canRemove: boolean
    onChange: (patch: Partial<Term>) => void
    onAnd: () => void
    onOr: () => void
    onRemove: () => void
}) {
    const { table, term } = props
    const uid = useId()
    const resolved = useFieldPath(table, term.field || undefined)
    const info = resolved.data
    const isChoiceHint = false
    const ops = useMemo(() => (info ? operatorsFor(info.type, isChoiceHint) : []), [info])
    const op = info && term.op ? findOperator(info.type, isChoiceHint, term.op) : null
    // A newly picked field gets its type's first operator.
    useEffect(() => {
        if (info && ops.length && (!term.op || !ops.some((o) => o.op === term.op))) props.onChange({ op: ops[0].op, value: term.op ? term.value : '' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [info && info.path, ops])
    const label = info ? info.label : term.field || 'new condition'
    return (
        <div className="rpl-cb-row grid items-start gap-2 sm:grid-cols-[3rem_minmax(10rem,1.2fr)_minmax(9rem,0.9fr)_minmax(10rem,1.6fr)_auto]" role="group" aria-label={`${props.position}: ${label}`} id={uid}>
            <span className={cx('pt-1.5 text-xs font-medium uppercase', props.join === 'or' ? 'text-primary' : 'text-muted-foreground')}>{props.join || ''}</span>
            <FieldPicker
                table={table}
                value={term.field}
                dotWalk={props.dotWalk}
                fields={props.fields}
                aria-label={`Field, ${props.position}`}
                onChange={(f: PickedField) => props.onChange({ field: f.path, op: '', value: '' })}
            />
            {info ? (
                <Select aria-label={`Operator for ${label}`} size="sm" value={term.op} items={ops.map((o) => ({ value: o.op, label: o.label }))} onChange={(i) => props.onChange({ op: i.value, value: findOperator(info.type, false, i.value).editor === (op && op.editor) ? term.value : '' })} />
            ) : (
                <span className="flex h-8 items-center px-1 text-xs text-muted-foreground">{term.field && resolved.isLoading ? <Spinner label="Loading field" /> : '—'}</span>
            )}
            <span className="min-w-0">
                {info && op ? (
                    <ValueEditor
                        editor={op.editor}
                        table={info.table}
                        field={info.field}
                        fieldLabel={label}
                        referenceTable={info.referenceTable}
                        value={term.value}
                        onChange={(v) => props.onChange({ value: v })}
                    />
                ) : null}
            </span>
            <span className="flex items-center gap-1">
                <button type="button" className={cx(btn('ghost'), 'h-8 px-2 text-xs')} onClick={props.onAnd} aria-label={`Add an AND condition after ${label}`}>
                    AND
                </button>
                {props.allowOr ? (
                    <button type="button" className={cx(btn('ghost'), 'h-8 px-2 text-xs')} onClick={props.onOr} aria-label={`Add an OR condition to ${label}`}>
                        OR
                    </button>
                ) : null}
                <button type="button" className={btn('icon')} onClick={props.onRemove} disabled={!props.canRemove} aria-label={`Remove condition ${label}`}>
                    <IconX size={14} />
                </button>
            </span>
        </div>
    )
}
