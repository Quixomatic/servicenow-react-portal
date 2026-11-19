/**
 * components:app/currency-field: currency / price amounts with a currency code.
 *
 * Value format: 'CODE;amount' (e.g. 'USD;1234.50'), the platform's form format for currency
 * fields; a bare amount is accepted on input and takes the default code. The code list comes
 * from the form layout's currencyCodes, else the `currencies` prop.
 */
import { useMemo } from 'react'
import { useUser } from '@portal/runtime'
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, cx } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { parseNumberInput } from 'components:app/number-field'

export type CurrencyFieldProps = FieldProps & {
    currencies?: string[]
    defaultCurrency?: string
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
}

export function splitCurrency(value: string, fallbackCode: string): { code: string; amount: string } {
    const v = String(value || '')
    const i = v.indexOf(';')
    if (i >= 0) return { code: v.slice(0, i) || fallbackCode, amount: v.slice(i + 1) }
    return { code: fallbackCode, amount: v }
}

export function CurrencyField(props: CurrencyFieldProps) {
    const user = useUser() as any
    const locale = (user && user.language) || undefined
    const field = useField(props)
    const codes = useMemo(() => {
        const fromMeta = (field.meta.currencyCodes || []).map((c) => c.code)
        return fromMeta.length ? fromMeta : props.currencies || ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    }, [field.meta.currencyCodes, props.currencies])
    const fallback = props.defaultCurrency || codes[0] || 'USD'
    const current = field.staged ?? field.value
    const { code, amount } = splitCurrency(current, fallback)
    const committed = splitCurrency(field.value, fallback)

    const format = (c: string, a: string) => {
        if (a === '') return ''
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(Number(a))
        } catch (e) {
            return `${c} ${a}`
        }
    }
    const commit = (c: string, text: string) => {
        const parsed = parseNumberInput(text, locale)
        if (parsed === null) return field.stage(`${c};${text}`)
        field.setValue(parsed === '' ? '' : `${c};${parsed}`, format(c, parsed || ''))
    }

    return (
        <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} className={props.className} readOnlyValue={committed.amount ? format(committed.code, committed.amount) : undefined}>
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-2 pl-1' })}>
                <select
                    aria-label={`${field.label} currency`}
                    value={code}
                    disabled={field.state.disabled}
                    className={cx('h-7 rounded-sm bg-transparent px-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60')}
                    onChange={(e: any) => commit(e.target.value, amount)}
                >
                    {codes.indexOf(code) < 0 ? <option value={code}>{code}</option> : null}
                    {codes.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <span aria-hidden="true" className="h-5 w-px bg-border" />
                <input
                    {...controlA11y(field)}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={field.placeholder || '0.00'}
                    value={amount}
                    className={bareInputClass + ' tabular-nums'}
                    onChange={(e: any) => field.stage(`${code};${e.target.value}`)}
                    onBlur={(e: any) => {
                        commit(code, e.target.value)
                        field.blur()
                    }}
                    onKeyDown={(e: any) => e.key === 'Enter' && commit(code, e.currentTarget.value)}
                />
            </div>
        </FieldShell>
    )
}

export default function CurrencyFieldPreview() {
    return (
        <div className="max-w-xs p-4">
            <CurrencyField name="cost" label="Cost" defaultValue="USD;1250.00" />
        </div>
    )
}
