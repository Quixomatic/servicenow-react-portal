/**
 * components:app/password-field: masked text (password, password2, masked variables) with a
 * show/hide toggle (aria-pressed) and an optional confirmation input that must match. Read-only
 * never reveals the value.
 */
import { useState } from 'react'
import { useField, adornmentButtonClass, IconEye, IconEyeOff } from 'components:app/field'
import { StringInput } from 'components:app/string-field'
import type { StringFieldProps } from 'components:app/string-field'

export type PasswordFieldProps = StringFieldProps & { confirm?: boolean; confirmLabel?: string }

export function PasswordField(props: PasswordFieldProps) {
    const [visible, setVisible] = useState(false)
    const [confirmValue, setConfirmValue] = useState('')
    const field = useField(props)
    const mismatch = !!props.confirm && confirmValue !== '' && confirmValue !== (field.staged ?? field.value)
    const toggle = (
        <button
            type="button"
            className={adornmentButtonClass}
            aria-label={visible ? `Hide ${field.label}` : `Show ${field.label}`}
            aria-pressed={visible}
            aria-controls={field.ids.input}
            onPointerDown={(e: any) => e.preventDefault()}
            onClick={() => setVisible(!visible)}
        >
            {visible ? <IconEyeOff size={14} /> : <IconEye size={14} />}
        </button>
    )
    return (
        <div className="flex flex-col gap-3">
            <StringInput
                {...props}
                field={field}
                inputType={visible ? 'text' : 'password'}
                autoComplete={props.autoComplete || 'new-password'}
                endAdornment={toggle}
                counterFrom={1}
                readOnlyValue={(f) => (f.value ? <span aria-label="Value hidden">••••••••</span> : undefined)}
            />
            {props.confirm && !field.state.readOnly ? (
                <ConfirmInput
                    name={`${props.name}__confirm`}
                    label={props.confirmLabel || `Confirm ${field.label.toLowerCase()}`}
                    visible={visible}
                    value={confirmValue}
                    onChange={setConfirmValue}
                    error={mismatch ? 'The values do not match' : undefined}
                />
            ) : null}
        </div>
    )
}

function ConfirmInput(p: { name: string; label: string; visible: boolean; value: string; onChange: (v: string) => void; error?: string }) {
    const field = useField({ name: p.name, label: p.label, value: p.value, onChange: p.onChange, error: p.error, standalone: true })
    // Staging updates the confirm value immediately so the match check is live.
    return <StringInput name={p.name} field={{ ...field, stage: (v: string) => p.onChange(v) }} inputType={p.visible ? 'text' : 'password'} autoComplete="new-password" />
}

export default function PasswordFieldPreview() {
    return (
        <div className="max-w-md p-4">
            <PasswordField name="secret" label="Password" confirm />
        </div>
    )
}
