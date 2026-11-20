/**
 * components:app/duration-field: glide_duration / timer.
 *
 * The platform stores a duration as a date-time offset from the epoch ('1970-01-03 04:05:00' =
 * 2 days 4 hours 5 minutes). The control edits days, hours, minutes and seconds as a labelled
 * group of number inputs and normalises overflow (90 minutes → 1 h 30 min).
 */
import { useField, FieldShell, cx } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';

export type DurationFieldProps = FieldProps & {
    /** Hide the seconds input (default: hidden unless the value has seconds). */
    showSeconds?: boolean;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
};

export type DurationParts = { days: number; hours: number; minutes: number; seconds: number };

export function durationToMs(value: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(value || ''));
    if (!m) return 0;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

export function msToDuration(ms: number): string {
    const d = new Date(Math.max(0, ms));
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function splitDuration(ms: number): DurationParts {
    const total = Math.max(0, Math.floor(ms / 1000));
    return {
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
    };
}

export function formatDuration(parts: DurationParts): string {
    const out: string[] = [];
    if (parts.days) out.push(`${parts.days} day${parts.days === 1 ? '' : 's'}`);
    if (parts.hours) out.push(`${parts.hours} hour${parts.hours === 1 ? '' : 's'}`);
    if (parts.minutes) out.push(`${parts.minutes} minute${parts.minutes === 1 ? '' : 's'}`);
    if (parts.seconds) out.push(`${parts.seconds} second${parts.seconds === 1 ? '' : 's'}`);
    return out.join(' ') || '0 minutes';
}

const UNITS: { key: keyof DurationParts; label: string; short: string; ms: number }[] = [
    { key: 'days', label: 'Days', short: 'd', ms: 86400000 },
    { key: 'hours', label: 'Hours', short: 'h', ms: 3600000 },
    { key: 'minutes', label: 'Minutes', short: 'min', ms: 60000 },
    { key: 'seconds', label: 'Seconds', short: 's', ms: 1000 },
];

export function DurationField(props: DurationFieldProps) {
    const field = useField(props);
    const ms = field.value ? durationToMs(field.value) : 0;
    const parts = splitDuration(ms);
    const showSeconds = props.showSeconds ?? parts.seconds > 0;
    const units = UNITS.filter((u) => u.key !== 'seconds' || showSeconds);

    const set = (key: keyof DurationParts, raw: string) => {
        const n = Math.max(0, Math.floor(Number(raw) || 0));
        const next = { ...parts, [key]: n };
        const total = next.days * 86400000 + next.hours * 3600000 + next.minutes * 60000 + next.seconds * 1000;
        field.setValue(total ? msToDuration(total) : '', total ? formatDuration(splitDuration(total)) : '');
    };

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            group
            readOnlyValue={field.value ? formatDuration(parts) : undefined}
        >
            <div className="flex flex-wrap items-center gap-2" id={field.ids.input}>
                {units.map((u) => (
                    <label
                        key={u.key}
                        className={cx(
                            'rpf-control flex h-9 items-center gap-1 rounded-md border bg-background pr-2 pl-1 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
                            field.invalid ? 'border-destructive' : 'border-input'
                        )}
                    >
                        <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            aria-label={`${field.label}: ${u.label}`}
                            aria-describedby={field.describedBy}
                            aria-invalid={field.invalid || undefined}
                            disabled={field.state.disabled}
                            value={field.value ? String(parts[u.key]) : ''}
                            placeholder="0"
                            className="rpf-bare h-full w-14 bg-transparent px-1 text-right text-sm text-foreground tabular-nums outline-none"
                            onChange={(e: any) => set(u.key, e.target.value)}
                            onBlur={field.blur}
                        />
                        <span className="text-xs text-muted-foreground" aria-hidden="true">
                            {u.short}
                        </span>
                    </label>
                ))}
            </div>
        </FieldShell>
    );
}

export default function DurationFieldPreview() {
    return (
        <div className="p-4">
            <DurationField name="business_duration" label="Business duration" defaultValue="1970-01-03 04:05:00" />
        </div>
    );
}
