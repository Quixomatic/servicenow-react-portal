/**
 * components:app/phone-field: a phone number (type tel, phone keypad on mobile). Validates
 * loosely (digits, spaces, + ( ) . - and an optional extension, at least 3 digits); read-only
 * renders a tel: link.
 */
import { useField, IconPhone } from 'components:app/field'
import { StringInput } from 'components:app/string-field'
import type { StringFieldProps } from 'components:app/string-field'

export function validatePhone(v: string): string | undefined {
    const t = String(v).trim()
    const digits = t.replace(/\D/g, '')
    return /^[+]?[\d\s().-]+(\s*(x|ext\.?)\s*\d+)?$/i.test(t) && digits.length >= 3 ? undefined : 'Enter a phone number, e.g. +1 555 0100'
}

export function PhoneField(props: StringFieldProps) {
    const field = useField({ ...props, validate: props.validate || validatePhone })
    return (
        <StringInput
            {...props}
            field={field}
            inputType="tel"
            inputMode="tel"
            autoComplete={props.autoComplete || 'tel'}
            startAdornment={props.startAdornment ?? <IconPhone size={14} />}
            readOnlyValue={(f) =>
                f.value ? (
                    <a href={`tel:${f.value.replace(/[^\d+]/g, '')}`} className="text-primary underline-offset-4 hover:underline">
                        {f.value}
                    </a>
                ) : undefined
            }
        />
    )
}

export default function PhoneFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <PhoneField name="phone" label="Business phone" defaultValue="+1 555 0100" />
        </div>
    )
}
