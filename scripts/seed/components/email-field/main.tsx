/**
 * components:app/email-field: an email address (type email). Validates the address shape;
 * read-only renders a mailto: link.
 */
import { useField, IconMail } from 'components:app/field'
import { StringInput } from 'components:app/string-field'
import type { StringFieldProps } from 'components:app/string-field'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(v: string): string | undefined {
    return EMAIL_RE.test(String(v).trim()) ? undefined : 'Enter an email address like name@example.com'
}

export function EmailField(props: StringFieldProps) {
    const field = useField({ ...props, validate: props.validate || validateEmail })
    return (
        <StringInput
            {...props}
            field={field}
            inputType="email"
            inputMode="email"
            autoComplete={props.autoComplete || 'email'}
            startAdornment={props.startAdornment ?? <IconMail size={14} />}
            readOnlyValue={(f) =>
                f.value ? (
                    <a href={`mailto:${f.value.trim()}`} className="text-primary underline-offset-4 hover:underline">
                        {f.value}
                    </a>
                ) : undefined
            }
        />
    )
}

export default function EmailFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <EmailField name="email" label="Email" defaultValue="abel.tuter@example.com" />
        </div>
    )
}
