import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { Button } from 'components:button'
import { useGraphQL } from 'utilities:app/graphql'
import { FormProvider, useForm, useFormMeta, useFormValue } from 'components:app/field'
import type { Form, FieldLayout } from 'components:app/field'
import { FieldControl } from 'components:app/field-control'
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

type Props = { options?: { table?: string; sysId?: string; query?: string } }

type BoundField = { name: string; props?: Record<string, unknown>; wide?: boolean }

const PRIORITY = [
    { value: '1', label: '1 - Critical' },
    { value: '2', label: '2 - High' },
    { value: '3', label: '3 - Moderate' },
    { value: '4', label: '4 - Low' },
]

/** Fields of the bound form, rendered through the factory (app/field-control). */
const BOUND_FIELDS: BoundField[] = [
    { name: 'number' },
    { name: 'state' },
    { name: 'caller_id' },
    { name: 'opened_at' },
    { name: 'category' },
    { name: 'subcategory' },
    { name: 'impact', props: { variant: 'radio', direction: 'horizontal' } },
    { name: 'urgency', props: { variant: 'scale' } },
    { name: 'assignment_group' },
    { name: 'assigned_to' },
    { name: 'active', props: { variant: 'switch' } },
    { name: 'reopen_count' },
    { name: 'business_duration' },
    { name: 'watch_list' },
    { name: 'short_description', wide: true },
    { name: 'description', wide: true },
]

/** Records with the field types incident doesn't have (time, E.164 phone, table / field names, conditions). */
const MORE_TYPES: { key: string; label: string; table: string; query: string; fields: BoundField[]; note: string }[] = [
    {
        key: 'conditions',
        label: 'Table + conditions',
        table: 'sys_ui_policy',
        query: 'table=incident^conditionsISNOTEMPTY^ORDERBYDESCsys_updated_on',
        fields: [{ name: 'short_description', wide: true }, { name: 'table', props: { readOnly: false } }, { name: 'conditions', wide: true, props: { readOnly: false } }],
        note: 'A UI policy: Conditions depends on Table (table_name), so the builder lists the chosen table\'s fields. Platform UI policies are read-only from this app\'s scope, so the demo unlocks Table and Conditions.',
    },
    {
        key: 'field_name',
        label: 'Table + field name',
        table: 'sys_translated_text',
        query: 'ORDERBYDESCsys_updated_on',
        fields: [{ name: 'tablename' }, { name: 'fieldname' }, { name: 'language' }, { name: 'value' }],
        note: 'A translated text: Field name (field_name) depends on Table name, and follows it when it changes.',
    },
    {
        key: 'time',
        label: 'Time',
        table: 'sysauto_script',
        query: 'run_type=daily^ORDERBYname',
        fields: [{ name: 'name', wide: true }, { name: 'run_type' }, { name: 'run_time', props: { visible: true } }],
        note: 'A daily scheduled job: Time (glide_time) is shown and edited in your time zone. The form hides it for some jobs; the demo forces it visible.',
    },
    {
        key: 'e164',
        label: 'Phone (E.164)',
        table: 'sn_employee_profile',
        query: 'work_phoneISNOTEMPTY^ORDERBYDESCsys_updated_on',
        fields: [{ name: 'user', wide: true }, { name: 'work_phone' }, { name: 'work_mobile' }],
        note: 'An employee profile: phone_number_e164 with the country codes from the form layout.',
    },
    {
        key: 'html',
        label: 'HTML (KB article)',
        table: 'kb_knowledge',
        query: 'textISNOTEMPTY^ORDERBYDESCsys_updated_on',
        fields: [{ name: 'short_description', wide: true }, { name: 'text', wide: true, props: { imageUpload: false, maxHeight: '24rem' } }],
        note: 'A knowledge article: Article body (html) in the rich-text editor; read-only views render it through components:rich-text. Image uploads are off here so nothing is attached to the article.',
    },
]

/**
 * Field primitives demo: every primitive standalone (local state), then a real record bound in a
 * form context (one GraphQL bootstrap; fields bind by name through the type factory), then more
 * records for the types incident doesn't have.
 */
export default function FieldDemo({ options = {} }: Props) {
    const table = options.table || 'incident'
    const pick = useGraphQL(
        `query rpDemoPick($q: String) { GlideRecord_Query { ${/^[a-z0-9_]+$/.test(table) ? table : 'incident'}(queryConditions: $q, pagination: { limit: 1 }) { _results { sys_id { value } } } } }`,
        { q: options.query || 'active=true^ORDERBYDESCsys_updated_on' },
        { enabled: !options.sysId, staleTime: 5 * 60_000 },
    )
    const sysId = options.sysId || (pick.data && pick.data.GlideRecord_Query[table]._results[0] && pick.data.GlideRecord_Query[table]._results[0].sys_id.value) || ''
    return (
        <div className="rp-field-demo flex flex-col gap-6">
            <Standalone />
            {sysId ? <Bound table={table} sysId={sysId} fields={BOUND_FIELDS} /> : <Card><CardContent className="text-sm text-muted-foreground">{pick.isLoading ? 'Finding a record…' : 'No record to bind.'}</CardContent></Card>}
            <MoreTypes />
        </div>
    )
}

function Standalone() {
    const [values, setValues] = useState<Record<string, { value: string; displayValue: string }>>({})
    const [layout, setLayout] = useState<FieldLayout>('vertical')
    const [readOnly, setReadOnly] = useState(false)
    const on = (name: string) => (value: string, displayValue: string) => setValues((v) => ({ ...v, [name]: { value, displayValue } }))
    const common = (name: string) => ({ name, layout, onChange: on(name), readOnly: readOnly || undefined })
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle>Standalone fields</CardTitle>
                        <CardDescription>Each primitive on its own, with typed props and local state. Metadata for references and lists comes from the incident dictionary.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Display options">
                        <Button variant="outline" size="sm" aria-pressed={layout === 'horizontal'} onClick={() => setLayout(layout === 'vertical' ? 'horizontal' : 'vertical')}>
                            {layout === 'vertical' ? 'Horizontal labels' : 'Vertical labels'}
                        </Button>
                        <Button variant="outline" size="sm" aria-pressed={readOnly} onClick={() => setReadOnly(!readOnly)}>
                            {readOnly ? 'Editable' : 'Read only'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    <StringField {...common('title')} label="String" placeholder="Type, then Tab" hint="Commits on blur or Enter" maxLength={40} mandatory />
                    <NumberField {...common('count')} label="Integer" integer defaultValue="3" min={0} />
                    <NumberField {...common('ratio')} label="Decimal" type="decimal" defaultValue="1234.5" />
                    <CurrencyField {...common('cost')} label="Currency" defaultValue="USD;1250" />
                    <ChoiceField {...common('priority')} label="Choice (select)" choices={PRIORITY} includeNone />
                    <ChoiceField {...common('priority_r')} label="Choice (radio)" variant="radio" choices={PRIORITY} defaultValue="3" />
                    <ChoiceField {...common('priority_s')} label="Choice (scale)" variant="scale" choices={PRIORITY} defaultValue="2" />
                    <BooleanField {...common('agree')} label="Checkbox" description="Native checkbox, Space toggles" />
                    <BooleanField {...common('notify')} label="Switch" variant="switch" description="role=switch" defaultValue="true" />
                    <ReferenceField {...common('caller_id')} table="incident" label="Reference (caller)" hint="Live search with the field's qualifier" />
                    <ListField {...common('watch_list')} table="incident" label="List (watch list)" />
                    <DateField {...common('due')} label="Date" defaultValue="2026-12-01" />
                    <DateTimeField {...common('when')} label="Date/time" defaultValue="2026-11-19 15:30:00" />
                    <TimeField {...common('at')} label="Time" defaultValue="09:30:00" hint="Typed (9, 930, 9:30 pm) or picked; your time zone" />
                    <DurationField {...common('effort')} label="Duration" defaultValue="1970-01-02 03:30:00" />
                    <EmailField {...common('email')} label="Email" defaultValue="abel.tuter@example.com" />
                    <UrlField {...common('site')} label="URL" placeholder="servicenow.com" />
                    <PhoneField {...common('phone')} label="Phone" defaultValue="+1 555 0100" />
                    <PhoneField {...common('phone_e164')} label="Phone (E.164)" e164 defaultValue="+442079460958" hint="Country code + number; stored as E.164" />
                    <TableNameField {...common('std_table')} label="Table name" defaultValue="incident" />
                    <FieldNameField {...common('std_field')} label="Field name" fieldTable={(values.std_table && values.std_table.value) || 'incident'} defaultValue="priority" hint="Columns of the table above" />
                    <PasswordField {...common('secret')} label="Password" confirm />
                    <div className="md:col-span-2">
                        <TextareaField {...common('notes')} label="Textarea" hint="Grows with its content; Ctrl+Enter commits" maxLength={500} />
                    </div>
                    <div className="md:col-span-2">
                        <HtmlField
                            {...common('html')}
                            label="HTML"
                            hint="Toolbar: Alt+F10 · link: Ctrl+K · images by URL (standalone)"
                            defaultValue="<h3>Rich text</h3><p>Formatting with <strong>bold</strong>, <em>italic</em>, <u>underline</u> and <a href='https://www.servicenow.com'>links</a>.</p><ul><li>Lists</li><li>Quotes and code</li></ul>"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <ConditionsField {...common('std_conditions')} label="Conditions" conditionsTable={(values.std_table && values.std_table.value) || 'incident'} defaultValue="active=true^priority=1" hint="On the table chosen above" />
                    </div>
                </div>
                <ValuesTable values={values} />
            </CardContent>
        </Card>
    )
}

function ValuesTable({ values }: { values: Record<string, { value: string; displayValue: string }> }) {
    const names = Object.keys(values)
    if (!names.length) return <p className="mt-6 text-xs text-muted-foreground">Committed values (value / displayValue) appear here.</p>
    return (
        <div className="mt-6 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
                <caption className="sr-only">Committed values</caption>
                <thead className="bg-muted text-muted-foreground">
                    <tr>
                        <th className="px-3 py-1.5 font-medium">Field</th>
                        <th className="px-3 py-1.5 font-medium">value</th>
                        <th className="px-3 py-1.5 font-medium">displayValue</th>
                    </tr>
                </thead>
                <tbody>
                    {names.map((n) => (
                        <tr key={n} className="border-t border-border">
                            <td className="px-3 py-1.5 font-mono">{n}</td>
                            <td className="px-3 py-1.5 font-mono break-all">{values[n].value}</td>
                            <td className="px-3 py-1.5">{values[n].displayValue}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function MoreTypes() {
    const [key, setKey] = useState(MORE_TYPES[0].key)
    const target = MORE_TYPES.find((t) => t.key === key) || MORE_TYPES[0]
    const pick = useGraphQL(
        `query rpDemoPickMore($q: String) { GlideRecord_Query { ${target.table}(queryConditions: $q, pagination: { limit: 1 }) { _results { sys_id { value } } } } }`,
        { q: target.query },
        { staleTime: 5 * 60_000 },
    )
    const rows = pick.data && pick.data.GlideRecord_Query && pick.data.GlideRecord_Query[target.table] ? pick.data.GlideRecord_Query[target.table]._results : []
    const sysId = rows && rows[0] ? rows[0].sys_id.value : ''
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="More field types">
                <span className="mr-1 text-sm font-medium">More types, bound:</span>
                {MORE_TYPES.map((t) => (
                    <Button key={t.key} variant={t.key === key ? 'default' : 'outline'} size="sm" aria-pressed={t.key === key} onClick={() => setKey(t.key)}>
                        {t.label}
                    </Button>
                ))}
            </div>
            {sysId ? (
                <Bound key={`${target.table}:${sysId}`} table={target.table} sysId={sysId} fields={target.fields} description={target.note} />
            ) : (
                <Card>
                    <CardContent className="text-sm text-muted-foreground">{pick.isLoading ? 'Finding a record…' : pick.error ? (pick.error as Error).message : `No ${target.table} record to bind.`}</CardContent>
                </Card>
            )}
        </div>
    )
}

function Bound({ table, sysId, fields, description }: { table: string; sysId: string; fields: BoundField[]; description?: string }) {
    const form = useForm({ table, sysId })
    const [layout, setLayout] = useState<FieldLayout>('vertical')
    return (
        <FormProvider form={form}>
            <Card data-rp-demo-form={sysId}>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <CardTitle>
                                Bound to <RecordNumber /> <span className="font-normal text-muted-foreground">({table})</span>
                            </CardTitle>
                            <CardDescription>
                                {description ? `${description} Nothing is saved.` : 'One GraphQL formLayout request: values, display values, server field states and metadata. Fields bind by name through the type factory. Subcategory and Assigned to depend on Category and Assignment group. Nothing is saved.'}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" aria-pressed={layout === 'horizontal'} onClick={() => setLayout(layout === 'vertical' ? 'horizontal' : 'vertical')}>
                            {layout === 'vertical' ? 'Horizontal labels' : 'Vertical labels'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {form.status.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {form.status.error.message}
                        </p>
                    ) : form.status.isLoading ? (
                        <p className="text-sm text-muted-foreground" aria-busy="true">
                            Loading the record…
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                            {fields.map((f) => (
                                <div key={f.name} className={f.wide ? 'md:col-span-2' : ''}>
                                    <FieldControl name={f.name} layout={layout} {...(f.props || {})} />
                                </div>
                            ))}
                        </div>
                    )}
                    <FormBar form={form} />
                </CardContent>
            </Card>
        </FormProvider>
    )
}

function RecordNumber() {
    const n = useFormValue('number')
    const name = useFormValue('name')
    const short = useFormValue('short_description')
    const label = n || name || short
    return <span>{label ? (String(label).length > 48 ? String(label).slice(0, 47) + '…' : label) : 'a record'}</span>
}

function FormBar({ form }: { form: Form }) {
    const { dirtyFields, isDirty } = useFormMeta(form)
    const [result, setResult] = useState<string>('')
    const changes = useMemo(() => (isDirty ? form.serialize() : {}), [isDirty, dirtyFields.join(','), form])
    return (
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm text-muted-foreground" aria-live="polite">
                    {isDirty ? `${dirtyFields.length} unsaved change${dirtyFields.length === 1 ? '' : 's'}: ${dirtyFields.join(', ')}` : 'No unsaved changes'}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const r = form.validate()
                        setResult(r.valid ? 'Valid: every mandatory field is filled.' : r.errors.map((e) => e.message).join(' · '))
                    }}
                >
                    Validate
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!isDirty}
                    onClick={() => {
                        form.reset()
                        setResult('')
                    }}
                >
                    Reset
                </Button>
            </div>
            {result ? (
                <p role="status" className="text-sm">
                    {result}
                </p>
            ) : null}
            {isDirty ? <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">serialize() → {JSON.stringify(changes, null, 2)}</pre> : null}
        </div>
    )
}
