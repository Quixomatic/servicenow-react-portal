/**
 * components:app/date-range-field: a start / end date pair as one control (Next Experience's
 * now-date-range-picker), on the host kit's components:date-range-picker.
 *
 *   Bound to two fields of the surrounding form (date or date-time):
 *   <DateRangeField startName="start_date" endName="end_date" label="Planned dates" />
 *
 *   Standalone ('YYYY-MM-DD' strings):
 *   <DateRangeField name="period" label="Period" value={range} onRangeChange={setRange} />
 *
 * Field behaviour on top of the generic picker:
 * - bound mode writes each end into its own field: glide_date gets 'YYYY-MM-DD'; glide_date_time
 *   keeps the field's current time of day, else the start of the start day and the end of the end
 *   day in the user's time zone (stored in UTC, as the platform does);
 * - presets relative to today in the user's zone (Today … This year; pass `presets` to replace);
 * - read-only text in the user's date format ("01/11/2026 – 20/11/2026");
 * - label, hint, mandatory and messages come from app/field (the start field's shell; an error on
 *   the end field shows there too). min / max: props, else the start field's `min` / `max`
 *   dictionary attributes.
 * The value logic is exported: toRangeValue(fieldValue, type, tz) and fromRangeValue(…).
 */
import { useState } from 'react';
import { useUser } from '@portal/runtime';
import { useField, FieldShell } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { DateRangePicker, defaultRangePresets, normalizeRange } from 'components:date-range-picker';
import {
    validZone,
    useLocale,
    useUserFormats,
    formatDate,
    todayIn,
    resolveBound,
    utcToLocalInput,
    localInputToUtc,
} from 'utilities:app/datetime';

export type DateRange = { start: string; end: string };

const DATE_TIME_TYPES = ['glide_date_time', 'due_date', 'calendar_date_time'];

/** A field value ('YYYY-MM-DD' or a UTC 'YYYY-MM-DD HH:mm:ss') → the day it falls on for the user. */
export function toRangeValue(value: string, type: string, timeZone?: string): string {
    const v = String(value || '');
    if (!v) return '';
    if (DATE_TIME_TYPES.indexOf(type) >= 0 && v.length > 10) return utcToLocalInput(v, timeZone).slice(0, 10);
    return v.slice(0, 10);
}

/**
 * A picked day → the field value. Date-time fields keep `current`'s time of day (in the user's
 * zone); otherwise `edge` decides: 'start' = 00:00:00, 'end' = 23:59:59.
 */
export function fromRangeValue(ymd: string, type: string, edge: 'start' | 'end', current: string, timeZone?: string) {
    if (!ymd) return '';
    if (DATE_TIME_TYPES.indexOf(type) < 0) return ymd;
    const local = current ? utcToLocalInput(current, timeZone, true) : '';
    const time = local ? local.slice(11) : edge === 'start' ? '00:00:00' : '23:59:59';
    return localInputToUtc(`${ymd}T${time.length === 5 ? time + ':00' : time}`, timeZone);
}

export type DateRangeFieldProps = Omit<FieldProps, 'name' | 'value' | 'onChange'> & {
    /** Standalone name (also the shell's field name when unbound). */
    name?: string;
    /** Bound mode: the start and end fields of the surrounding form. */
    startName?: string;
    endName?: string;
    /** Standalone value and change handler. */
    value?: DateRange;
    onRangeChange?: (range: DateRange) => void;
    presets?: { key?: string; label: string; range: () => DateRange }[] | false;
    min?: string;
    max?: string;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
};

export function DateRangeField(props: DateRangeFieldProps) {
    const { startName, endName, value: rangeValue, onRangeChange, presets, min, max, ...rest } = props;
    const user = useUser() as any;
    const tz = validZone(user && user.timeZone);
    const locale = useLocale();
    const formats = useUserFormats();
    const bound = !!(startName && endName);
    const start = useField({
        ...(rest as any),
        name: bound ? startName : rest.name || 'date_range',
        standalone: bound ? rest.standalone : true,
        value: bound ? undefined : '',
    });
    const end = useField({
        name: bound ? endName : (rest.name || 'date_range') + '_end',
        table: rest.table,
        standalone: bound ? rest.standalone : true,
        value: bound ? undefined : '',
        readOnly: rest.readOnly,
        disabled: rest.disabled,
    } as any);
    const startType = (start.meta && start.meta.type) || 'glide_date';
    const endType = (end.meta && end.meta.type) || 'glide_date';
    const range: DateRange = bound
        ? { start: toRangeValue(start.value, startType, tz), end: toRangeValue(end.value, endType, tz) }
        : normalizeRange(rangeValue || { start: '', end: '' });
    const attrs = (start.meta && start.meta.attributes) || {};
    const lo = resolveBound(min || attrs.min, tz);
    const hi = resolveBound(max || attrs.max, tz);
    const pattern = formats.date;
    const text =
        range.start || range.end
            ? `${range.start ? formatDate(range.start, pattern, locale) : '…'} – ${range.end ? formatDate(range.end, pattern, locale) : '…'}`
            : '';
    const onChange = (next: DateRange) => {
        const r = normalizeRange(next);
        if (!bound) {
            if (onRangeChange) onRangeChange(r);
            return;
        }
        // A half-picked range (start only) waits for the end before writing anything.
        if (r.start && !r.end) return;
        const s = fromRangeValue(r.start, startType, 'start', start.value, tz);
        const e = fromRangeValue(r.end, endType, 'end', end.value, tz);
        if (s !== start.value) start.setValue(s);
        if (e !== end.value) end.setValue(e);
        start.blur();
        end.blur();
    };
    const shellField = end.error && !start.error ? { ...start, error: end.error, invalid: true } : start;
    return (
        <FieldShell
            field={shellField as any}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={text || undefined}
        >
            <PartialRange
                range={range}
                bound={bound}
                onChange={onChange}
                picker={(value: DateRange, change: (r: DateRange) => void) => (
                    <DateRangePicker
                        id={start.ids.input}
                        aria-labelledby={start.ids.label}
                        aria-describedby={start.describedBy}
                        value={value}
                        onChange={change}
                        presets={presets === false ? undefined : presets || defaultRangePresets(todayIn(tz))}
                        disabled={start.state.disabled}
                        invalid={shellField.invalid}
                        locale={locale}
                        min={lo}
                        max={hi}
                        className="max-w-none"
                    />
                )}
            />
        </FieldShell>
    );
}

/** Holds a start-only selection locally (bound fields only take complete ranges). */
function PartialRange({
    range,
    bound,
    onChange,
    picker,
}: {
    range: DateRange;
    bound: boolean;
    onChange: (r: DateRange) => void;
    picker: (value: DateRange, change: (r: DateRange) => void) => any;
}) {
    const [partial, setPartial] = useState<DateRange | null>(null);
    const shown = bound && partial ? partial : range;
    return picker(shown, (next: DateRange) => {
        const r = normalizeRange(next);
        if (bound && r.start && !r.end) setPartial(r);
        else setPartial(null);
        onChange(r);
    });
}

export default function DateRangeFieldPreview() {
    const [range, setRange] = useState<DateRange>({ start: '', end: '' });
    return (
        <div className="flex max-w-md flex-col gap-4 p-4">
            <DateRangeField name="period" label="Reporting period" value={range} onRangeChange={setRange} />
        </div>
    );
}
