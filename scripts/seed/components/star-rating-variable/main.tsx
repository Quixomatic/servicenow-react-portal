/**
 * components:app/star-rating-variable: a demo custom variable (catalog types 14 / 17 / UI page),
 * rendered for `rp_component=app/star-rating-variable`. A real input: a radio group of stars.
 *
 *   rp_options={"max":5,"labels":["Nice to have", …]}   max stars (default 5), a label per value
 *
 * Contract (CustomVariableProps from components:app/variable): value / onChange (glide string:
 * '1'…'max', '' = none), field (the bound useField result, for FieldShell), options, showLabel,
 * readOnly. Keys: arrows move and pick (native radios), Space picks, Clear empties.
 */
import { useId } from 'react'
import { useField, FieldShell, cx } from 'components:app/field'

type Props = {
    value: string
    onChange: (value: string, displayValue?: string) => void
    field: any
    options: { max?: number; labels?: string[] }
    showLabel: boolean
    readOnly: boolean
    layout?: any
}

function Star({ filled }: { filled: boolean }) {
    return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={cx('transition-colors', filled ? 'fill-chart-4 text-chart-4' : 'fill-transparent text-muted-foreground')}>
            <path
                d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function StarRatingVariable(props: Props) {
    const { field, options } = props
    const max = Math.max(1, Math.min(10, Number(options && options.max) || 5))
    const labels = (options && Array.isArray(options.labels) ? options.labels : []).map(String)
    const current = Number(props.value) || 0
    const group = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const labelOf = (n: number) => labels[n - 1] || `${n} of ${max}`
    const pick = (n: number) => props.onChange(n ? String(n) : '', n ? labelOf(n) : '')
    const readOnlyText = current ? `${'★'.repeat(current)}${'☆'.repeat(Math.max(0, max - current))} ${labelOf(current)}` : undefined
    return (
        <FieldShell field={field} layout={props.layout} group hideLabel={!props.showLabel} readOnlyValue={readOnlyText}>
            <div className="flex flex-wrap items-center gap-3" data-rp-star-rating="">
                <div role="radiogroup" aria-labelledby={field.ids.label} aria-describedby={field.describedBy} aria-required={field.state.mandatory || undefined} className="flex items-center gap-0.5">
                    {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                        <label key={n} className="relative cursor-pointer rounded-sm p-0.5 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50" title={labelOf(n)}>
                            <input
                                type="radio"
                                name={`rp-stars-${group}`}
                                value={String(n)}
                                checked={current === n}
                                disabled={props.readOnly}
                                onChange={() => pick(n)}
                                className="sr-only"
                                aria-label={labelOf(n)}
                            />
                            <Star filled={n <= current} />
                        </label>
                    ))}
                </div>
                <span className="text-sm text-muted-foreground" aria-hidden="true">
                    {current ? labelOf(current) : 'Not rated'}
                </span>
                {current && !field.state.mandatory && !props.readOnly ? (
                    <button type="button" className="text-xs text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none" onClick={() => pick(0)}>
                        Clear
                    </button>
                ) : null}
            </div>
        </FieldShell>
    )
}

/** The custom-variable entry point app/variable looks for. */
export const CustomVariable = StarRatingVariable

/** Preview (Studio): standalone, with labels. */
export default function StarRatingPreview() {
    const field = useField({ name: 'preview_rating', label: 'How important is this?', defaultValue: '3' })
    return (
        <div className="max-w-md p-4">
            <StarRatingVariable
                field={field}
                value={field.value}
                onChange={(v, d) => field.setValue(v, d)}
                options={{ max: 5, labels: ['Nice to have', 'Helpful', 'Important', 'Very important', 'Blocking my work'] }}
                showLabel
                readOnly={false}
            />
        </div>
    )
}
