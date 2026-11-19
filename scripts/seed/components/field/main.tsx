/**
 * components:app/field: the field base every field primitive builds on.
 *
 *   useField(name | props)        value/displayValue, states, messages, a11y ids, setValue/stage/blur
 *   <FieldShell field={f}>        label, required/optional markers, hint, messages, read-only view
 *   <FormProvider table sysId>    minimal form store; fields bind by name (one GraphQL bootstrap)
 *   useForm / useFormContext / useFormValue / useFormMeta / createFormStore
 *   registerFieldType / resolveFieldComponent   the type → component registry (app/field-control)
 *   attachPolicies(store, policies) / evaluatePolicy / computePolicyLayer   UI policy engine (forms + catalog)
 *   controlClass / textareaClass / popupClass / icons / cx   shared look for controls
 */
import { useField } from './use-field'
import { FieldShell, controlA11y } from './shell'
import { controlClass } from './ui'

export { useField } from './use-field'
export { FieldShell, FieldMessages, ReadOnlyValue, controlA11y, FieldDecorationIcon } from './shell'
export type { FieldShellProps } from './shell'
export { FormProvider, useForm, useFormContext, useFormValue, useFormMeta } from './form'
export type { Form, UseFormOptions, FormProviderProps } from './form'
export { createFormStore, isFieldVisible, isFieldMissing, applyRemoteValues } from './store'
export { attachPolicies, evaluatePolicy, evaluateTerm, computePolicyLayer } from './policies'
export type { AttachedPolicies, PolicyEvaluation } from './policies'
export type { FormStore, FormState, ValidationResult, ValueInput } from './store'
export { registerFieldType, registerFieldAttribute, resolveFieldComponent, registeredFieldTypes, fieldRegistry } from './registry'
export {
    cx,
    controlClass,
    bareInputClass,
    textareaClass,
    adornmentButtonClass,
    popupClass,
    optionClass,
    Spinner,
    VisuallyHidden,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconCheck,
    IconX,
    IconSearch,
    IconCalendar,
    IconClock,
    IconExternal,
    IconEye,
    IconEyeOff,
    IconMail,
    IconPhone,
    IconLink,
    IconMinus,
    IconPlus,
    IconAlert,
    IconInfo,
} from './ui'
export type { FieldProps, FieldMessage, FieldMessageKind, FieldOverrides, PolicyState, FieldDecoration, FieldState, FieldLayout, FieldSize, UseFieldResult, FieldMeta, GlideType } from './types'

/** Preview (Studio): the base contract with a plain input. */
export default function FieldPreview() {
    const field = useField({ name: 'preview', label: 'Field base', hint: 'useField + FieldShell with a plain input', mandatory: true })
    return (
        <div className="max-w-md p-4">
            <FieldShell field={field}>
                <input
                    {...controlA11y(field)}
                    className={controlClass({ invalid: field.invalid })}
                    value={field.staged ?? field.value}
                    onChange={(e: any) => field.stage(e.target.value)}
                    onBlur={(e: any) => {
                        field.setValue(e.target.value)
                        field.blur()
                    }}
                />
            </FieldShell>
        </div>
    )
}
