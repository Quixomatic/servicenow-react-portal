/**
 * components:app/datetime-field: glide_date_time / due_date.
 *
 * The value is the platform's UTC string 'YYYY-MM-DD HH:mm:ss'. The control edits wall time in
 * the user's ServiceNow time zone (useUser().timeZone, not the browser's), converting both ways
 * with DST handled, and shows the zone so there's no doubt which clock is meant. "Now" fills the
 * current time.
 */
import { useUser } from '@portal/runtime'
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, adornmentButtonClass, IconX, IconClock } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { utcToLocalInput, localInputToUtc, formatDateTimeForUser, formatGlideDateTime } from 'components:app/date-field'

export type DateTimeFieldProps = FieldProps & {
    /** Time zone override (IANA); defaults to the user's. */
    timeZone?: string
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

function zoneLabel(timeZone?: string): string {
    try {
        const p = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, timeZoneName: 'short' }).formatToParts(new Date())
        const z = p.find((x) => x.type === 'timeZoneName')
        return z ? z.value : timeZone || ''
    } catch (e) {
        return timeZone || ''
    }
}

function validZone(tz?: string): string | undefined {
    if (!tz) return undefined
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        return tz
    } catch (e) {
        return undefined
    }
}

export function DateTimeField(props: DateTimeFieldProps) {
    const user = useUser() as any
    const tz = validZone(props.timeZone || (user && user.timeZone))
    const locale = user && user.language ? user.language : undefined
    const field = useField(props)
    const local = utcToLocalInput(field.value, tz)
    const display = field.value ? formatDateTimeForUser(field.value, tz, locale) : ''
    const zone = zoneLabel(tz)
    const commit = (utc: string) => field.setValue(utc, utc ? formatDateTimeForUser(utc, tz, locale) : '')
    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            labelAside={zone ? <span title={tz || 'Browser time zone'}>{zone}</span> : null}
            readOnlyValue={display ? `${display} ${zone}` : undefined}
        >
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-1 pr-1' })}>
                <input
                    {...controlA11y(field)}
                    type="datetime-local"
                    value={local}
                    className={bareInputClass + ' tabular-nums'}
                    onChange={(e: any) => commit(e.target.value ? localInputToUtc(e.target.value, tz) : '')}
                    onBlur={field.blur}
                />
                <span className="sr-only">Time zone {tz || zone}</span>
                {!field.state.disabled ? (
                    <button
                        type="button"
                        className={adornmentButtonClass}
                        aria-label={`Set ${field.label} to now`}
                        title="Now"
                        onClick={() => {
                            const now = new Date()
                            now.setUTCSeconds(0, 0)
                            commit(formatGlideDateTime(now.getTime()))
                        }}
                    >
                        <IconClock size={14} />
                    </button>
                ) : null}
                {field.value && !field.state.disabled ? (
                    <button type="button" className={adornmentButtonClass} aria-label={`Clear ${field.label}`} onClick={() => commit('')}>
                        <IconX size={14} />
                    </button>
                ) : null}
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
