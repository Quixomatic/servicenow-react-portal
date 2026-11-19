/**
 * components:app/field-control: the type → field factory (one component for every field type).
 *
 *   <FieldControl name="caller_id" />            picks app/reference-field from dictionary metadata
 *   <FieldControl name="x" type="glide_date" />  explicit type
 *
 * Built-in types are registered in app/field's registry on load; portals can override a type or
 * a dictionary attribute with registerFieldType / registerFieldAttribute. Unknown types fall back
 * to a read-only value labelled "field type not supported" (as Workspace does), never a crash.
 */
import { useSyncExternalStore } from 'react'
import { useField, FieldShell, registerFieldType, resolveFieldComponent, fieldRegistry, registeredFieldTypes } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { StringField } from 'components:app/string-field'
import { TextareaField } from 'components:app/textarea-field'
import { NumberField } from 'components:app/number-field'
import { BooleanField } from 'components:app/boolean-field'
import { ChoiceField } from 'components:app/choice-field'
import { ReferenceField } from 'components:app/reference-field'
import { DateField } from 'components:app/date-field'
import { DateTimeField } from 'components:app/datetime-field'
import { EmailField } from 'components:app/email-field'
import { UrlField } from 'components:app/url-field'
import { PhoneField } from 'components:app/phone-field'
import { PasswordField } from 'components:app/password-field'
import { CurrencyField } from 'components:app/currency-field'
import { DurationField } from 'components:app/duration-field'
import { ListField } from 'components:app/list-field'
import { TimeField } from 'components:app/time-field'
import { ConditionsField } from 'components:app/conditions-field'
import { TableNameField } from 'components:app/table-name-field'
import { FieldNameField } from 'components:app/field-name-field'
import { HtmlField } from 'components:app/html-field'

/** Glide types each built-in primitive handles. */
export const BUILT_IN_TYPES: Record<string, string[]> = {
    string: ['string', 'sys_class_name', 'GUID', 'domain_id', 'ip_address', 'color', 'translated_field', 'user_input'],
    textarea: ['multi_two_lines', 'journal', 'journal_input', 'journal_list', 'translated_text', 'script', 'script_plain', 'wiki_text'],
    html: ['html', 'translated_html'],
    number: ['integer', 'longint', 'decimal', 'float', 'numeric', 'percent_complete', 'order_index'],
    boolean: ['boolean'],
    choice: ['choice'],
    reference: ['reference', 'requested_for'],
    date: ['glide_date'],
    datetime: ['glide_date_time', 'due_date', 'calendar_date_time'],
    time: ['glide_time'],
    email: ['email'],
    url: ['url'],
    phone: ['ph_number', 'phone_number_e164'],
    password: ['password', 'password2', 'masked'],
    currency: ['currency', 'price', 'currency2'],
    duration: ['glide_duration', 'timer'],
    list: ['glide_list'],
    conditions: ['conditions'],
    table: ['table_name'],
    fieldname: ['field_name'],
}

const COMPONENTS: Record<string, any> = {
    string: StringField,
    textarea: TextareaField,
    number: NumberField,
    boolean: BooleanField,
    choice: ChoiceField,
    reference: ReferenceField,
    date: DateField,
    datetime: DateTimeField,
    email: EmailField,
    url: UrlField,
    phone: PhoneField,
    password: PasswordField,
    currency: CurrencyField,
    duration: DurationField,
    list: ListField,
    time: TimeField,
    conditions: ConditionsField,
    table: TableNameField,
    fieldname: FieldNameField,
    html: HtmlField,
}

let registered = false
/** Register the built-ins (idempotent; existing overrides for a type are kept). */
export function registerBuiltInFields() {
    if (registered) return
    registered = true
    const taken = new Set(registeredFieldTypes())
    for (const kind of Object.keys(BUILT_IN_TYPES)) {
        const types = BUILT_IN_TYPES[kind].filter((t) => !taken.has(t))
        if (types.length) registerFieldType(types, COMPONENTS[kind])
    }
}
registerBuiltInFields()

export type FieldControlProps = FieldProps & {
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
    /** Passed through to the chosen primitive (variant, choices, rows, …). */
    [extra: string]: any
}

/** Which component renders this metadata (exported for previews and tests). */
export function pickFieldComponent(type: string, meta: { maxLength?: number; choices?: unknown[]; choiceType?: number; attributes?: Record<string, string> }) {
    const override = resolveFieldComponent(type, meta.attributes)
    // Long strings render multi-line, as on platform forms.
    if (type === 'string' && meta.maxLength && meta.maxLength > 255 && override === StringField) return TextareaField
    // Integer/string columns with a choice list are choice fields.
    if (meta.choices && meta.choices.length && (meta.choiceType || 0) > 0 && type !== 'choice' && override !== undefined && ['integer', 'string'].indexOf(type) >= 0) return ChoiceField
    return override
}

export function FieldControl(props: FieldControlProps) {
    useSyncExternalStore(fieldRegistry.subscribe, fieldRegistry.getVersion, fieldRegistry.getVersion)
    const probe = useField(props)
    const type = props.type || probe.meta.type
    if (probe.loading && !props.type) {
        return (
            <div className="flex flex-col gap-1.5" aria-busy="true">
                <span className="h-4 w-28 animate-pulse rounded bg-muted" />
                <span className="h-9 w-full animate-pulse rounded-md bg-muted" />
                <span className="sr-only">Loading {probe.label}</span>
            </div>
        )
    }
    const Component = pickFieldComponent(type, probe.meta)
    if (!Component) return <UnsupportedField {...props} type={type} />
    return <Component {...props} />
}

function UnsupportedField(props: FieldControlProps) {
    const field = useField({ ...props, readOnly: true, hint: `${props.type}: field type not supported` })
    return <FieldShell field={field} layout={props.layout} size={props.size} className={props.className} />
}

export default function FieldControlPreview() {
    return (
        <div className="flex max-w-md flex-col gap-4 p-4">
            <FieldControl name="short_description" table="incident" />
            <FieldControl name="impact" table="incident" />
            <FieldControl name="caller_id" table="incident" />
            <FieldControl name="active" table="incident" />
        </div>
    )
}
