/**
 * components:app/number-field: integer, longint, decimal, float and numeric fields.
 *
 * The value is the glide string ("42", "12.5"); typed props give the parsed number (onNumber).
 * While editing the raw number shows; at rest it is formatted for the user's locale. ↑/↓ step
 * (Shift = ×10), the − / + buttons step too, and invalid input reports an error instead of being
 * silently dropped.
 */
import { useState } from 'react';
import { useUser } from '@portal/runtime';
import {
    useField,
    FieldShell,
    controlA11y,
    controlClass,
    bareInputClass,
    adornmentButtonClass,
    IconMinus,
    IconPlus,
} from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';

export type NumberFieldProps = FieldProps & {
    /** Integer types reject fractions; inferred from the dictionary type when omitted. */
    integer?: boolean;
    /** Decimal places shown at rest (decimal default 2, float as typed). */
    scale?: number;
    min?: number;
    max?: number;
    step?: number;
    /** Hide the − / + buttons. */
    hideStepper?: boolean;
    onNumber?: (value: number | null) => void;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
    /** Text before the number inside the control (e.g. a currency symbol). */
    prefix?: any;
};

const INTEGER_TYPES = ['integer', 'longint'];

/** Accept the user's locale separators and plain dots; return the glide string or null. */
export function parseNumberInput(text: string, locale?: string): string | null {
    const t = String(text || '').trim();
    if (!t) return '';
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    const group = (parts.find((p) => p.type === 'group') || { value: ',' }).value;
    const decimal = (parts.find((p) => p.type === 'decimal') || { value: '.' }).value;
    let s = t.split(group).join('').replace(/\s/g, '');
    if (decimal !== '.') s = s.split(decimal).join('.');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? String(n) : null;
}

export function NumberField(props: NumberFieldProps) {
    const user = useUser() as any;
    const locale = (user && user.language) || undefined;
    const [error, setError] = useState<string | null>(null);
    const field = useField({ ...props, error: props.error || error || undefined });
    const integer = props.integer ?? INTEGER_TYPES.indexOf(field.meta.internalType || field.meta.type) >= 0;
    const scale = props.scale ?? (integer ? 0 : field.meta.type === 'decimal' ? 2 : undefined);
    const [editing, setEditing] = useState(false);
    const step = props.step ?? 1;

    const format = (v: string) => {
        if (v === '' || v == null) return '';
        const n = Number(v);
        if (!Number.isFinite(n)) return v;
        return new Intl.NumberFormat(
            locale,
            scale === undefined
                ? { maximumFractionDigits: 20 }
                : { minimumFractionDigits: scale, maximumFractionDigits: scale }
        ).format(n);
    };
    const shown = editing ? (field.staged ?? field.value) : format(field.value);

    const commit = (text: string) => {
        const parsed = parseNumberInput(text, locale);
        if (parsed === null) {
            setError('Enter a number');
            return;
        }
        if (parsed !== '' && integer && !Number.isInteger(Number(parsed))) {
            setError('Enter a whole number');
            return;
        }
        if (parsed !== '' && props.min !== undefined && Number(parsed) < props.min) {
            setError(`Use ${props.min} or more`);
            return;
        }
        if (parsed !== '' && props.max !== undefined && Number(parsed) > props.max) {
            setError(`Use ${props.max} or less`);
            return;
        }
        setError(null);
        if (parsed !== field.value || field.staged !== undefined) {
            field.setValue(parsed, parsed === '' ? '' : format(parsed));
            if (props.onNumber) props.onNumber(parsed === '' ? null : Number(parsed));
        }
    };
    const bump = (dir: 1 | -1, mult = 1) => {
        const base = Number(parseNumberInput(String(field.staged ?? field.value), locale) || 0);
        let next = base + dir * step * mult;
        if (props.min !== undefined) next = Math.max(props.min, next);
        if (props.max !== undefined) next = Math.min(props.max, next);
        const text = integer ? String(Math.round(next)) : String(Number(next.toFixed(10)));
        setError(null);
        field.setValue(text, format(text));
        if (props.onNumber) props.onNumber(Number(text));
    };

    const canEdit = !field.state.disabled && !field.state.readOnly;
    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
        >
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-1 pr-1' })}>
                {props.prefix ? <span className="text-muted-foreground">{props.prefix}</span> : null}
                <input
                    {...controlA11y(field)}
                    type="text"
                    inputMode={integer ? 'numeric' : 'decimal'}
                    autoComplete="off"
                    placeholder={field.placeholder}
                    value={shown}
                    className={bareInputClass + ' tabular-nums'}
                    onFocus={() => setEditing(true)}
                    onChange={(e: any) => field.stage(e.target.value)}
                    onBlur={(e: any) => {
                        setEditing(false);
                        commit(e.target.value);
                        field.blur();
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') commit(e.currentTarget.value);
                        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            bump(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey ? 10 : 1);
                        }
                    }}
                />
                {/* Steppers are pointer conveniences: keyboard users step with ↑/↓ (Shift = ×10). */}
                {props.hideStepper || !canEdit ? null : (
                    <span className="flex items-center">
                        <button
                            type="button"
                            tabIndex={-1}
                            className={adornmentButtonClass}
                            aria-label={`Decrease ${field.label}`}
                            aria-controls={field.ids.input}
                            onPointerDown={(e: any) => e.preventDefault()}
                            onClick={() => bump(-1)}
                        >
                            <IconMinus size={14} />
                        </button>
                        <button
                            type="button"
                            tabIndex={-1}
                            className={adornmentButtonClass}
                            aria-label={`Increase ${field.label}`}
                            aria-controls={field.ids.input}
                            onPointerDown={(e: any) => e.preventDefault()}
                            onClick={() => bump(1)}
                        >
                            <IconPlus size={14} />
                        </button>
                    </span>
                )}
            </div>
        </FieldShell>
    );
}

export default function NumberFieldPreview() {
    return (
        <div className="flex max-w-xs flex-col gap-4 p-4">
            <NumberField name="qty" label="Quantity" integer defaultValue="3" min={0} />
            <NumberField name="ratio" label="Ratio" type="decimal" defaultValue="1234.5" />
        </div>
    );
}
