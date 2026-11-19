/**
 * components:app/url-field: a web address. Accepts http(s) URLs (adds https:// on commit when the
 * scheme is missing); read-only renders a safe link (never javascript: or data: URLs).
 */
import { useField, IconLink } from 'components:app/field'
import { StringInput } from 'components:app/string-field'
import type { StringFieldProps } from 'components:app/string-field'

export function safeHref(v: string): string | undefined {
    try {
        const u = new URL(String(v).trim())
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined
    } catch (e) {
        return undefined
    }
}

export function validateUrl(v: string): string | undefined {
    return safeHref(v) ? undefined : 'Enter a web address starting with https://'
}

export function UrlField(props: StringFieldProps) {
    const field = useField({ ...props, validate: props.validate || validateUrl })
    const withScheme = {
        ...field,
        setValue: (v: string) => {
            const t = String(v || '').trim()
            const next = t && !/^[a-z][a-z0-9+.-]*:/i.test(t) && /^[^\s]+\.[^\s]+/.test(t) ? `https://${t}` : t
            field.setValue(next, next)
        },
    }
    return (
        <StringInput
            {...props}
            field={withScheme}
            inputType="url"
            inputMode="url"
            startAdornment={props.startAdornment ?? <IconLink size={14} />}
            readOnlyValue={(f) => {
                const href = f.value ? safeHref(f.value) : undefined
                return href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-4 hover:underline">
                        {f.value}
                        <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                ) : undefined
            }}
        />
    )
}

export default function UrlFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <UrlField name="site" label="Website" defaultValue="https://www.servicenow.com" />
        </div>
    )
}
