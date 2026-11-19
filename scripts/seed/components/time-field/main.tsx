/**
 * components:app/time-field: glide_time (a time of day in the user's time zone).
 *
 *   <TimeField name="run_time" />                              bound (form layouts send 'HH:mm:ss')
 *   <TimeField name="t" label="Start" step={15} onChange />     standalone
 *
 * Values come in two shapes and the field keeps whichever it was given:
 * - 'HH:mm:ss': wall time in the user's zone (what GlideLayout formLayout returns for glide_time);
 * - '1970-01-01 HH:mm:ss': the platform's stored UTC value (Table API), converted to and from the
 *   user's ServiceNow time zone with the 1970-01-01 offset, as the platform does.
 * `valueFormat` picks the shape for an empty field (default 'local').
 *
 * Typed entry in the user's time pattern (HH:mm or h:mm a), parsed leniently: '9', '930',
 * '9:30 pm', '21:30', '9p', 'noon', 'midnight'. A suggestion list (every `step` minutes, opening
 * at the current value) is an editable combobox (app/combobox): ↓ / Alt+↓ open it, Enter takes the
 * typed time or the active suggestion, Escape closes. Seconds show only when the value has them or
 * `seconds` is set. The label row names the zone.
 */
import { useMemo, useState } from 'react'
import { useUser } from '@portal/runtime'
import { useField, FieldShell, adornmentButtonClass, IconX, IconClock } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { Combobox } from 'components:app/combobox'
import type { ComboItem } from 'components:app/combobox'
import { useUserFormats, useLocale, validZone, zoneLabel, parseTime, formatTime, timeValueToSeconds, secondsToTimeValue, isUtcTimeValue } from 'utilities:app/datetime'
import type { TimeOfDay } from 'utilities:app/datetime'

export type TimeFieldProps = FieldProps & {
    /** Minutes between suggestions (default 30). */
    step?: number
    /** Always show and keep seconds. */
    seconds?: boolean
    /** Shape of the value when the field is empty: 'local' 'HH:mm:ss' (default) or 'utc' '1970-01-01 HH:mm:ss'. */
    valueFormat?: 'local' | 'utc'
    /** Time pattern override ('HH:mm', 'h:mm a'); defaults to the user's. */
    format?: string
    /** Time zone override (IANA); defaults to the user's. */
    timeZone?: string
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

// The time logic lives in utilities:app/datetime; re-exported here for existing importers.
export { parseTime, formatTime, timeValueToSeconds, secondsToTimeValue, isUtcTimeValue }
export type { TimeOfDay } from 'utilities:app/datetime'

export function TimeField(props: TimeFieldProps) {
    const user = useUser() as any
    const tz = validZone(props.timeZone || (user && user.timeZone))
    const locale = useLocale()
    const formats = useUserFormats()
    const pattern = props.format || formats.time
    const [text, setText] = useState<string | null>(null)
    const [typedError, setTypedError] = useState<string | undefined>(undefined)
    const [open, setOpen] = useState(false)
    const field = useField({ ...props, error: props.error || typedError })
    const step = Math.max(1, Math.min(720, props.step || 30))
    const shape: 'local' | 'utc' = field.value ? (isUtcTimeValue(field.value) ? 'utc' : 'local') : props.valueFormat || 'local'
    const current = timeValueToSeconds(field.value, tz)
    const withSeconds = !!props.seconds || (current !== null && current % 60 !== 0)
    const formatted = current === null ? (field.value ? field.value : '') : formatTime(current, pattern, { seconds: withSeconds, locale })
    const shown = text !== null ? text : formatted
    const zone = zoneLabel(tz)

    const all = useMemo<ComboItem[]>(() => {
        const out: ComboItem[] = []
        for (let m = 0; m < 24 * 60; m += step) out.push({ value: String(m * 60), label: formatTime(m * 60, pattern, { locale }) })
        return out
    }, [step, pattern, locale])
    const items = useMemo(() => {
        const q = (text || '').trim().toLowerCase()
        if (!q || text === formatted) return all
        const bare = q.replace(/^0/, '')
        return all.filter((i) => {
            const l = i.label.toLowerCase()
            return l.startsWith(q) || l.replace(/^0/, '').startsWith(bare)
        })
    }, [all, text, formatted])
    // Open the list at the current value (or the slot before it), else at 9:00.
    const anchorSlot = String(Math.floor((current === null ? 9 * 3600 : current) / (step * 60)) * step * 60)

    const commitSeconds = (sec: TimeOfDay | null) => {
        setText(null)
        setTypedError(undefined)
        if (sec === null) {
            if (field.value) field.setValue('', '')
            return
        }
        const v = secondsToTimeValue(sec, shape, tz)
        if (v !== field.value) field.setValue(v, formatTime(sec, pattern, { seconds: withSeconds || sec % 60 !== 0, locale }))
    }
    const commitText = (raw: string): boolean => {
        if (raw === formatted) {
            setText(null)
            return true
        }
        if (!raw.trim()) {
            commitSeconds(null)
            return true
        }
        const sec = parseTime(raw)
        if (sec === null) {
            setTypedError(`Enter a time like ${formatTime(9 * 3600 + 30 * 60, pattern, { locale })}`)
            return false
        }
        commitSeconds(sec)
        return true
    }

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            labelAside={zone ? <span title={tz || 'Browser time zone'}>{zone}</span> : null}
            readOnlyValue={formatted ? `${formatted} ${zone}` : undefined}
        >
            <Combobox
                id={field.ids.input}
                name={field.name}
                aria-labelledby={field.ids.label}
                aria-describedby={field.describedBy}
                invalid={field.invalid}
                required={field.state.mandatory}
                disabled={field.state.disabled}
                autoFocus={field.autoFocus}
                size={props.size}
                placeholder={field.placeholder || formatTime(9 * 3600, pattern, { locale })}
                inputValue={shown}
                onInputChange={(t) => {
                    setText(t)
                    if (typedError) setTypedError(undefined)
                }}
                items={items}
                activeValue={text === null || text === formatted ? anchorSlot : undefined}
                emptyText={parseTime(text || '') !== null ? 'Press Enter to use this time' : 'No matching times'}
                open={open}
                onOpenChange={setOpen}
                startAdornment={
                    <span className="flex items-center pl-0.5 text-muted-foreground">
                        <IconClock size={14} />
                    </span>
                }
                endAdornment={
                    field.value && !field.state.disabled ? (
                        <button type="button" className={adornmentButtonClass} aria-label={`Clear ${field.label}`} onPointerDown={(e: any) => e.preventDefault()} onClick={() => commitSeconds(null)}>
                            <IconX size={14} />
                        </button>
                    ) : null
                }
                onSelect={(item) => {
                    commitSeconds(+item.value)
                    setOpen(false)
                }}
                onKeyDown={(e: any) => {
                    if (e.key === 'Enter' && text !== null && parseTime(text) !== null) {
                        // A typed time wins over the active suggestion.
                        e.preventDefault()
                        if (commitText(text)) setOpen(false)
                    } else if (e.key === 'Escape' && text !== null) {
                        setText(null)
                        setTypedError(undefined)
                    }
                }}
                onBlur={() => {
                    if (text !== null) commitText(text)
                    field.blur()
                }}
            />
            <span className="sr-only">Time zone {tz || zone}</span>
        </FieldShell>
    )
}

export default function TimeFieldPreview() {
    return (
        <div className="flex max-w-xs flex-col gap-4 p-4">
            <TimeField name="start" label="Start time" defaultValue="09:30:00" />
            <TimeField name="run" label="Run time (UTC value)" defaultValue="1970-01-01 17:00:00" />
        </div>
    )
}
