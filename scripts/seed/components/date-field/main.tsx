/**
 * components:app/date-field: glide_date (value 'YYYY-MM-DD').
 *
 * Typed entry in the user's ServiceNow date format (sys_user.date_format, else the system
 * format: `g_date_time_format` from the platform's scripting globals), parsed leniently (any
 * separator, 2-digit years, month names, ISO, "today"/"tomorrow"/"yesterday"), plus a calendar
 * popover (host kit `components:calendar` in `components:popover`): Alt+↓ or the button opens it,
 * the grid takes focus, Escape closes it and focus returns to the button. min/max come from props,
 * else the dictionary attributes `min` / `max` ('YYYY-MM-DD' or 'today').
 *
 * The logic (zones, the user's formats, format / parse, bounds) is utilities:app/datetime, which
 * this module re-exports; DatePopover (button + calendar popover) is exported for other fields.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@portal/runtime'
import { zonedParts, parseGlideDateTime, formatGlideDateTime, utcToLocalInput, localInputToUtc, todayIn, validZone, zoneLabel, useUserFormats, splitDateTimeFormat, useLocale, formatDate, parseDate, patternHint, formatDateForUser, formatDateTimeForUser, resolveBound, rangeError } from 'utilities:app/datetime'
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover'
import { Calendar } from 'components:calendar'
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, adornmentButtonClass, IconX, IconCalendar } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'

export type DateFieldProps = FieldProps & {
    /** 'YYYY-MM-DD' (or 'today') bounds. */
    min?: string
    max?: string
    /** Date format override (SimpleDateFormat, e.g. 'dd/MM/yyyy'); defaults to the user's. */
    format?: string
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

// The date logic lives in utilities:app/datetime; re-exported here for existing importers.
export { zonedParts, parseGlideDateTime, formatGlideDateTime, utcToLocalInput, localInputToUtc, todayIn, validZone, zoneLabel, useUserFormats, splitDateTimeFormat, useLocale, formatDate, parseDate, patternHint, formatDateForUser, formatDateTimeForUser, resolveBound, rangeError }
export type { UserFormats } from 'utilities:app/datetime'

// ---- the calendar popover (shared with app/datetime-field) ------------------------------------

export type DatePopoverProps = {
    label: string
    value: string
    onSelect: (ymd: string) => void
    min?: string
    max?: string
    today?: string
    locale?: string
    disabled?: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Extra controls under the grid (datetime's time input). */
    footer?: any
    /** Close after a day is picked (date fields; datetime keeps it open for the time). */
    closeOnSelect?: boolean
}

/** Calendar button + popover. Base UI handles Escape, outside clicks and focus return. */
export function DatePopover(props: DatePopoverProps) {
    const popup = useRef<HTMLDivElement | null>(null)
    const trigger = useRef<HTMLButtonElement | null>(null)
    // Closed from our side (a day picked, Done): if focus was left in the vanished popup, hand it
    // back to the button. Escape / outside clicks are Base UI's and already return focus.
    const wasOpen = useRef(props.open)
    useEffect(() => {
        if (wasOpen.current && !props.open) {
            const t = setTimeout(() => {
                const btn = trigger.current
                if (!btn) return
                const root = btn.getRootNode() as Document | ShadowRoot
                const active = root && (root as any).activeElement
                if (!active || active === document.body || (popup.current && popup.current.contains(active))) btn.focus()
            }, 0)
            wasOpen.current = props.open
            return () => clearTimeout(t)
        }
        wasOpen.current = props.open
        return undefined
    }, [props.open])
    return (
        <Popover open={props.open} onOpenChange={(o: boolean) => props.onOpenChange(o)}>
            <PopoverTrigger
                render={<button ref={trigger} type="button" className={adornmentButtonClass} aria-label={`Choose ${props.label}`} title="Choose a date" disabled={props.disabled} />}
            >
                <IconCalendar size={14} />
            </PopoverTrigger>
            <PopoverContent
                ref={popup}
                align="end"
                sideOffset={8}
                className="w-auto max-w-[calc(100vw-1rem)] gap-0 p-3"
                aria-label={`Choose ${props.label}`}
                initialFocus={() => (popup.current ? (popup.current.querySelector('[data-focus-target="true"]') as HTMLElement | null) : null) || true}
            >
                <Calendar
                    value={props.value || undefined}
                    min={props.min}
                    max={props.max}
                    today={props.today}
                    locale={props.locale}
                    autoFocus
                    onSelect={(ymd: string) => {
                        props.onSelect(ymd)
                        if (props.closeOnSelect !== false) props.onOpenChange(false)
                    }}
                    footer={props.footer}
                />
            </PopoverContent>
        </Popover>
    )
}

// ---- the field --------------------------------------------------------------------------------

export function DateField(props: DateFieldProps) {
    const user = useUser() as any
    const tz = validZone(user && user.timeZone)
    const locale = useLocale()
    const formats = useUserFormats()
    const pattern = props.format || formats.date
    const [text, setText] = useState<string | null>(null)
    const [typedError, setTypedError] = useState<string | undefined>(undefined)
    const [open, setOpen] = useState(false)
    const field = useField({ ...props, error: props.error || typedError })
    const value = String(field.value || '').slice(0, 10)
    const today = todayIn(tz)
    const attrs = field.meta.attributes || {}
    const min = resolveBound(props.min || attrs.min, tz)
    const max = resolveBound(props.max || attrs.max, tz)
    const formatted = value ? formatDate(value, pattern, locale) : ''
    const shown = text !== null ? text : formatted
    const hint = useMemo(() => patternHint(pattern), [pattern])

    const commit = (ymd: string) => {
        setText(null)
        setTypedError(undefined)
        if (ymd !== value) field.setValue(ymd, ymd ? formatDate(ymd, pattern, locale) : '')
    }
    const commitText = (raw: string) => {
        if (raw === formatted) return setText(null)
        if (!raw.trim()) return commit('')
        const ymd = parseDate(raw, pattern, locale, today)
        if (!ymd) return setTypedError(`Enter a date like ${formatDate(today, pattern, locale)}`)
        const range = rangeError(ymd, min, max, pattern, locale)
        if (range) return setTypedError(range)
        commit(ymd)
    }

    return (
        <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} className={props.className} readOnlyValue={formatted || undefined}>
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-1 pr-1' })}>
                <input
                    {...controlA11y(field)}
                    type="text"
                    inputMode="text"
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
                {value && !field.state.disabled ? (
                    <button type="button" className={adornmentButtonClass} aria-label={`Clear ${field.label}`} onClick={() => commit('')}>
                        <IconX size={14} />
                    </button>
                ) : null}
                <DatePopover
                    label={field.label}
                    value={value}
                    min={min}
                    max={max}
                    today={today}
                    locale={locale}
                    disabled={field.state.disabled}
                    open={open}
                    onOpenChange={setOpen}
                    onSelect={commit}
                    footer={
                        <>
                            <button
                                type="button"
                                className="h-8 rounded-md px-2 text-sm font-medium text-primary outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40"
                                disabled={!!rangeError(today, min, max, pattern, locale)}
                                onClick={() => {
                                    commit(today)
                                    setOpen(false)
                                }}
                            >
                                Today
                            </button>
                            <span className="text-xs text-muted-foreground">{hint}</span>
                        </>
                    }
                />
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
