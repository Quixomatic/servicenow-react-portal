/**
 * components:app/datetime-field: glide_date_time / due_date.
 *
 * The value is the platform's UTC string 'YYYY-MM-DD HH:mm:ss'. The control edits wall time in
 * the user's ServiceNow time zone (useUser().timeZone, not the browser's), converting both ways
 * with DST handled, and names the zone so there's no doubt which clock is meant.
 *
 * Typed entry in the user's date-time format ('2026-11-19 15:30', '19/11/2026 3:30 pm', a date
 * alone keeps the current time), plus a popover with the calendar (`components:calendar`), a time
 * box and Now / Done. Seconds show only when the value has them or `seconds` is set; an untouched
 * value is never rewritten. min/max are 'YYYY-MM-DD' (or 'today') date bounds.
 */
import { useState } from 'react'
import { useUser } from '@portal/runtime'
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, adornmentButtonClass, IconX, IconClock } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import {
    localInputToUtc,
    formatGlideDateTime,
    formatDate,
    patternHint,
    rangeError,
    resolveBound,
    todayIn,
    validZone,
    zoneLabel,
    zonedParts,
    useUserFormats,
    useLocale,
    formatTime,
    parseTime,
    hms,
    wallOf,
    parseDateTime,
} from 'utilities:app/datetime'
import { DatePopover } from 'components:app/date-field'

export type DateTimeFieldProps = FieldProps & {
    /** Time zone override (IANA); defaults to the user's. */
    timeZone?: string
    /** Always show seconds. */
    seconds?: boolean
    /** 'YYYY-MM-DD' (or 'today') bounds for the date part. */
    min?: string
    max?: string
    /** Date-time pattern override ('dd/MM/yyyy HH:mm'); defaults to the user's. */
    format?: string
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

export { wallOf, parseDateTime }

function nowSec(timeZone?: string): number {
    const p = zonedParts(Date.now(), timeZone)
    return p.h * 3600 + p.mi * 60
}

export function DateTimeField(props: DateTimeFieldProps) {
    const user = useUser() as any
    const tz = validZone(props.timeZone || (user && user.timeZone))
    const locale = useLocale()
    const formats = useUserFormats()
    const split = props.format ? props.format.split(/\s+(?=[Hhk])/) : [formats.date, formats.time]
    const datePattern = split[0] || formats.date
    const timePattern = split[1] || formats.time
    const [text, setText] = useState<string | null>(null)
    const [timeText, setTimeText] = useState<string | null>(null)
    const [typedError, setTypedError] = useState<string | undefined>(undefined)
    const [open, setOpen] = useState(false)
    const field = useField({ ...props, error: props.error || typedError })
    const today = todayIn(tz)
    const attrs = field.meta.attributes || {}
    const min = resolveBound(props.min || attrs.min, tz)
    const max = resolveBound(props.max || attrs.max, tz)
    const wall = wallOf(field.value, tz)
    const withSeconds = !!props.seconds || (!!wall && wall.sec % 60 !== 0)
    const fmtWall = (w: { ymd: string; sec: number }, secs = withSeconds) => `${formatDate(w.ymd, datePattern, locale)} ${formatTime(w.sec, timePattern, { seconds: secs, locale })}`
    const formatted = wall ? fmtWall(wall) : ''
    const shown = text !== null ? text : formatted
    const zone = zoneLabel(tz)
    const hint = `${patternHint(datePattern)} ${patternHint(timePattern.replace(/[:.]s+/, ''))}`

    const commitWall = (ymd: string, sec: number) => {
        setText(null)
        setTimeText(null)
        setTypedError(undefined)
        const utc = localInputToUtc(`${ymd}T${hms(sec)}`, tz)
        if (utc !== field.value) field.setValue(utc, fmtWall({ ymd, sec }, withSeconds || sec % 60 !== 0))
    }
    const clear = () => {
        setText(null)
        setTimeText(null)
        setTypedError(undefined)
        if (field.value) field.setValue('', '')
    }
    const commitText = (raw: string) => {
        if (raw === formatted) return setText(null)
        if (!raw.trim()) return clear()
        const parsed = parseDateTime(raw, datePattern, locale, today)
        if (!parsed) return setTypedError(`Enter a date and time like ${fmtWall({ ymd: today, sec: 9 * 3600 + 30 * 60 }, false)}`)
        const range = rangeError(parsed.ymd, min, max, datePattern, locale)
        if (range) return setTypedError(range)
        commitWall(parsed.ymd, parsed.sec !== null ? parsed.sec : wall ? wall.sec : 0)
    }
    const commitTimeText = (raw: string) => {
        const sec = parseTime(raw)
        if (sec === null) return setTimeText(null)
        commitWall(wall ? wall.ymd : today, sec)
    }
    const nowButton = (
        <button
            type="button"
            className={adornmentButtonClass}
            aria-label={`Set ${field.label} to now`}
            title="Now"
            onClick={() => {
                const now = new Date()
                now.setUTCSeconds(0, 0)
                const w = wallOf(formatGlideDateTime(now.getTime()), tz)
                if (w) commitWall(w.ymd, w.sec)
            }}
        >
            <IconClock size={14} />
        </button>
    )
    const timeBox = wall ? formatTime(wall.sec, timePattern, { seconds: withSeconds, locale }) : ''

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
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-1 pr-1' })}>
                <input
                    {...controlA11y(field)}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={field.placeholder || hint}
                    value={shown}
                    className={bareInputClass + ' tabular-nums'}
                    onChange={(e: any) => {
                        setText(e.target.value)
                        if (typedError) setTypedError(undefined)
                    }}
                    onBlur={(e: any) => {
                        commitText(e.target.value)
                        field.blur()
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') commitText(e.currentTarget.value)
                        else if (e.key === 'ArrowDown' && e.altKey) {
                            e.preventDefault()
                            setOpen(true)
                        } else if (e.key === 'Escape' && text !== null) {
                            e.preventDefault()
                            setText(null)
                            setTypedError(undefined)
                        }
                    }}
                />
                <span className="sr-only">Time zone {tz || zone}</span>
                {!field.state.disabled ? nowButton : null}
                {field.value && !field.state.disabled ? (
                    <button type="button" className={adornmentButtonClass} aria-label={`Clear ${field.label}`} onClick={clear}>
                        <IconX size={14} />
                    </button>
                ) : null}
                <DatePopover
                    label={field.label}
                    value={wall ? wall.ymd : ''}
                    min={min}
                    max={max}
                    today={today}
                    locale={locale}
                    disabled={field.state.disabled}
                    open={open}
                    onOpenChange={(o) => {
                        setOpen(o)
                        if (!o) setTimeText(null)
                    }}
                    closeOnSelect={false}
                    onSelect={(ymd) => commitWall(ymd, wall ? wall.sec : nowSec(tz))}
                    footer={
                        <>
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Time</span>
                                <input
                                    type="text"
                                    autoComplete="off"
                                    aria-label={`${field.label}, time (${zone})`}
                                    placeholder={formatTime(9 * 3600, timePattern, { locale })}
                                    value={timeText !== null ? timeText : timeBox}
                                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    onChange={(e: any) => setTimeText(e.target.value)}
                                    onBlur={(e: any) => commitTimeText(e.target.value)}
                                    onKeyDown={(e: any) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            commitTimeText(e.currentTarget.value)
                                        }
                                    }}
                                />
                                <span>{zone}</span>
                            </label>
                            <button
                                type="button"
                                className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                onClick={() => {
                                    if (timeText !== null) commitTimeText(timeText)
                                    setOpen(false)
                                }}
                            >
                                Done
                            </button>
                        </>
                    }
                />
            </div>
        </FieldShell>
    )
}

export default function DateTimeFieldPreview() {
    return (
        <div className="max-w-sm p-4">
            <DateTimeField name="opened_at" label="Opened" defaultValue="2026-11-19 15:30:00" />
        </div>
    )
}
