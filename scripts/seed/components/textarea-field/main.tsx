/**
 * components:app/textarea-field: multi-line text (long strings, multi_two_lines, journal input).
 * Grows with its content between `rows` and `maxRows`; commits on blur or Ctrl/⌘+Enter.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { useField, FieldShell, controlA11y, textareaClass } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'

export type TextareaFieldProps = FieldProps & {
    rows?: number
    maxRows?: number
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

export function TextareaField(props: TextareaFieldProps) {
    const field = useField(props)
    const { rows = 3, maxRows = 12 } = props
    const ref = useRef<HTMLTextAreaElement | null>(null)
    const [focused, setFocused] = useState(false)
    const current = field.staged ?? field.value

    // Auto-grow: measure scrollHeight within [rows, maxRows] lines.
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const line = parseFloat(getComputedStyle(el).lineHeight) || 20
        const pad = el.offsetHeight - el.clientHeight + parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom)
        el.style.height = 'auto'
        const h = Math.min(Math.max(el.scrollHeight, rows * line + pad), maxRows * line + pad)
        el.style.height = `${h}px`
        el.style.overflowY = el.scrollHeight > h ? 'auto' : 'hidden'
    }, [current, rows, maxRows])

    const max = field.maxLength
    const len = String(current || '').length
    const counter =
        max && max > 0 && !field.state.readOnly && (focused || len >= max * 0.8) ? (
            <span className={len > max ? 'text-destructive' : ''}>
                {len}/{max}
                <span className="sr-only"> characters</span>
            </span>
        ) : null

    const commit = (text: string) => {
        if (text !== field.value || field.staged !== undefined) field.setValue(text)
    }
    return (
        <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} labelAside={counter} className={props.className}>
            <textarea
                ref={ref}
                {...controlA11y(field)}
                rows={rows}
                placeholder={field.placeholder}
                value={current}
                className={textareaClass({ invalid: field.invalid, className: 'resize-y' })}
                onFocus={() => setFocused(true)}
                onChange={(e: any) => field.stage(e.target.value)}
                onBlur={(e: any) => {
                    setFocused(false)
                    commit(e.target.value)
                    field.blur()
                }}
                onKeyDown={(e: any) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(e.currentTarget.value)
                }}
            />
        </FieldShell>
    )
}

export default function TextareaFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <TextareaField name="description" label="Description" hint="Grows as you type" maxLength={500} />
        </div>
    )
}
