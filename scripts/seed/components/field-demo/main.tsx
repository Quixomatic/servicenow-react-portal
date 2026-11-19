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

type Props = { options?: { table?: string; sysId?: string; query?: string } }

const PRIORITY = [
    { value: '1', label: '1 - Critical' },
    { value: '2', label: '2 - High' },
    { value: '3', label: '3 - Moderate' },
    { value: '4', label: '4 - Low' },
]

/** Fields of the bound form, rendered through the factory (app/field-control). */
const BOUND_FIELDS: { name: string; props?: Record<string, unknown>; wide?: boolean }[] = [
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

/**
 * Field primitives demo: every primitive standalone (local state), then a real record bound in a
 * form context (one GraphQL bootstrap; fields bind by name through the type factory).
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
            {sysId ? <Bound table={table} sysId={sysId} /> : <Card><CardContent className="text-sm text-muted-foreground">{pick.isLoading ? 'Finding a record…' : 'No record to bind.'}</CardContent></Card>}
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
                    <DurationField {...common('effort')} label="Duration" defaultValue="1970-01-02 03:30:00" />
                    <EmailField {...common('email')} label="Email" defaultValue="abel.tuter@example.com" />
                    <UrlField {...common('site')} label="URL" placeholder="servicenow.com" />
                    <PhoneField {...common('phone')} label="Phone" defaultValue="+1 555 0100" />
                    <PasswordField {...common('secret')} label="Password" confirm />
                    <div className="md:col-span-2">
                        <TextareaField {...common('notes')} label="Textarea" hint="Grows with its content; Ctrl+Enter commits" maxLength={500} />
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

function Bound({ table, sysId }: { table: string; sysId: string }) {
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
                                One GraphQL formLayout request: values, display values, server field states and metadata. Fields bind by name through the type factory. Subcategory and Assigned to depend on Category and Assignment group. Nothing is saved.
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
                            {BOUND_FIELDS.map((f) => (
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
    return <span>{n || '…'}</span>
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
