/**
 * components:app/date-field: glide_date (value 'YYYY-MM-DD').
 *
 * Uses the native date input (the browser's accessible picker and keyboard entry, themed through
 * color-scheme), with the value shown at rest in the user's locale. Also exports the date/time
 * helpers app/datetime-field uses (UTC glide values ↔ the user's time zone).
 */
import { useUser } from '@portal/runtime'
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, adornmentButtonClass, IconX } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'

export type DateFieldProps = FieldProps & {
    /** 'YYYY-MM-DD' bounds. */
    min?: string
    max?: string
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Wall-clock parts of a UTC instant in a time zone. */
export function zonedParts(utcMs: number, timeZone?: string) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const p: Record<string, string> = {}
    for (const part of f.formatToParts(new Date(utcMs))) p[part.type] = part.value
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second }
}

/** Glide UTC 'YYYY-MM-DD HH:mm:ss' → epoch ms (NaN when invalid). */
export function parseGlideDateTime(value: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value || ''))
    if (!m) return NaN
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
}

export function formatGlideDateTime(utcMs: number): string {
    const d = new Date(utcMs)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** UTC glide value → 'YYYY-MM-DDTHH:mm' wall time in the zone (datetime-local value). */
export function utcToLocalInput(value: string, timeZone?: string): string {
    const ms = parseGlideDateTime(value)
    if (Number.isNaN(ms)) return ''
    const p = zonedParts(ms, timeZone)
    return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`
}

/** 'YYYY-MM-DDTHH:mm' wall time in the zone → UTC glide value (handles DST by iterating). */
export function localInputToUtc(local: string, timeZone?: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(local || ''))
    if (!m) return ''
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
    let guess = wall
    for (let i = 0; i < 3; i++) {
        const p = zonedParts(guess, timeZone)
        const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s)
        guess += wall - asUtc
    }
    return formatGlideDateTime(guess)
}

export function formatDateForUser(value: string, locale?: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').slice(0, 10))
    if (!m) return value || ''
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])))
}

export function formatDateTimeForUser(value: string, timeZone?: string, locale?: string): string {
    const ms = parseGlideDateTime(value)
    if (Number.isNaN(ms)) return value || ''
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone || undefined }).format(new Date(ms))
}

export function todayIn(timeZone?: string): string {
    const p = zonedParts(Date.now(), timeZone)
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

export function DateField(props: DateFieldProps) {
    const user = useUser() as any
    const locale = user && user.language ? user.language : undefined
    const field = useField(props)
    const value = String(field.value || '').slice(0, 10)
    const display = value ? formatDateForUser(value, locale) : ''
    return (
        <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} className={props.className} readOnlyValue={display || undefined}>
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-1 pr-1' })}>
                <input
                    {...controlA11y(field)}
                    type="date"
                    min={props.min}
                    max={props.max}
                    value={value}
                    className={bareInputClass + ' tabular-nums'}
                    onChange={(e: any) => {
                        const v = e.target.value
                        field.setValue(v, v ? formatDateForUser(v, locale) : '')
                    }}
                    onBlur={field.blur}
                />
                {value && !field.state.disabled ? (
                    <button type="button" className={adornmentButtonClass} aria-label={`Clear ${field.label}`} onClick={() => field.setValue('', '')}>
                        <IconX size={14} />
                    </button>
                ) : null}
            </div>
        </FieldShell>
    )
}

export default function DateFieldPreview() {
    return (
        <div className="max-w-xs p-4">
            <DateField name="due" label="Due date" defaultValue="2026-12-01" />
        </div>
    )
}
