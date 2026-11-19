import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePortalLocation } from '@portal/runtime'
import { useQueryClient } from 'utilities:react-query'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { Button } from 'components:button'
import { useCatalogItem, useItemPrice, submitCatalogItem } from 'utilities:app/catalog'
import type { CatalogItem as CatalogItemData, SubmitResult } from 'utilities:app/catalog'
import { useCatalogForm, CatalogFormProvider, sanitizeHtml } from 'components:app/variable'
import { useClientScripts } from 'utilities:app/gform'
import { DialogOutlet } from 'components:app/confirm-dialog'
import type { CatalogForm, VariableSpec } from 'components:app/variable'
import { VariableLayout } from 'components:app/variable-container'
import { cx, Spinner, IconAlert, IconCheck, useFormMeta } from 'components:app/field'
import type { FieldLayout } from 'components:app/field'

/**
 * components:app/catalog-item: a catalog item or record producer, end to end.
 *
 * One GraphQL request loads the item (header, pricing, variables, layout, defaults); variables
 * render through app/variable-container on the shared field primitives; price follows variables
 * with price implications; Order now / Submit runs client validation (with an error summary that
 * links to each field), then the platform's own submit (order_now / submit_producer), and shows
 * the created request or record with a link.
 *
 * Widget options: { itemId, table } (or the page query: ?item=<sys_id>). Also exported as
 * <CatalogItem itemId /> for other widgets.
 */
export type CatalogItemProps = {
    itemId: string
    table?: string
    fieldLayout?: FieldLayout
    renderCustom?: (spec: VariableSpec) => any
    onSubmitted?: (result: SubmitResult) => void
    /** Link for the created record (default: the platform form). */
    recordHref?: (table: string, sysId: string) => string
}

type Props = { options?: { itemId?: string; table?: string; fieldLayout?: FieldLayout } }

export default function CatalogItemWidget({ options = {} }: Props) {
    const location = usePortalLocation() as any
    // q keys + explicit URL params (location.query is the encoded-query param now).
    const query = (location && (location.params || location.qParams)) || {}
    const itemId = String(query.item || options.itemId || '')
    const table = String(query.table || options.table || 'sc_cat_item')
    if (!itemId)
        return (
            <Card>
                <CardContent className="text-sm text-muted-foreground">Choose a catalog item.</CardContent>
            </Card>
        )
    return <CatalogItem key={itemId} itemId={itemId} table={table} fieldLayout={options.fieldLayout} />
}

export function CatalogItem(props: CatalogItemProps) {
    const [round, setRound] = useState(0)
    return <CatalogItemRound key={round} {...props} onRestart={() => setRound((r) => r + 1)} />
}

function CatalogItemRound(props: CatalogItemProps & { onRestart: () => void }) {
    const qc = useQueryClient()
    const item = useCatalogItem(props.itemId, props.table || 'sc_cat_item')
    const form = useCatalogForm(item.data, props.table || 'sc_cat_item')
    const [result, setResult] = useState<SubmitResult | null>(null)
    const restart = () => {
        // A new round gets a fresh draft record from the platform.
        qc.removeQueries({ queryKey: ['rp-catalog', 'item', props.table || 'sc_cat_item', props.itemId] })
        props.onRestart()
    }
    if (item.isLoading)
        return (
            <Card aria-busy="true">
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner label="Loading the item" /> Loading the item…
                </CardContent>
            </Card>
        )
    if (item.error || !item.data || !form)
        return (
            <Card>
                <CardContent role="alert" className="text-sm text-destructive">
                    {(item.error as Error | null)?.message || 'This item is not available.'}
                </CardContent>
            </Card>
        )
    if (result) return <Submitted item={item.data} result={result} href={props.recordHref} onAgain={restart} />
    return (
        <CatalogFormProvider form={form}>
            {/* g_modal dialogs from catalog client scripts. */}
            <DialogOutlet />
            <ItemForm
                item={item.data}
                form={form}
                fieldLayout={props.fieldLayout}
                renderCustom={props.renderCustom}
                onSubmitted={(r) => {
                    setResult(r)
                    if (props.onSubmitted) props.onSubmitted(r)
                }}
            />
        </CatalogFormProvider>
    )
}

function usePriceVariables(form: CatalogForm): Record<string, string> {
    const key = useSyncExternalStore(
        form.subscribe,
        () => JSON.stringify(form.priceAffecting.map((n) => form.getValue(n))),
        () => '',
    )
    return useMemo(() => (form.priceAffecting.length ? form.serializeVariables() : {}), [key, form])
}

function actionLabel(item: CatalogItemData) {
    if (item.type === 'record_producer') return 'Submit'
    if (item.requestMethod === 'request') return 'Request'
    if (item.requestMethod === 'submit') return 'Submit'
    return 'Order now'
}

function ItemForm(props: { item: CatalogItemData; form: CatalogForm; fieldLayout?: FieldLayout; renderCustom?: (s: VariableSpec) => any; onSubmitted: (r: SubmitResult) => void }) {
    const { item, form } = props
    const isProducer = item.type === 'record_producer'
    const [quantity, setQuantity] = useState(item.quantity[0] ? item.quantity[0].value : '1')
    const [errors, setErrors] = useState<{ name: string; label: string; message: string }[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [failure, setFailure] = useState('')
    const root = useRef<HTMLDivElement | null>(null)
    const summary = useRef<HTMLDivElement | null>(null)
    const priceVars = usePriceVariables(form)
    const formMeta = useFormMeta(form)
    // Catalog client scripts (onLoad / onChange / onSubmit) and catalog UI policy run-scripts,
    // through the g_form compatibility layer (variable names, IO:<sys_id> aliases accepted).
    const scripts = useClientScripts({
        host: {
            store: form,
            resolve: form.resolve,
            table: () => 'sc_cat_item',
            sysId: () => item.sysId,
            isNew: () => true,
            view: () => '',
            encodedRecord: () => '',
            displayValue: () => item.name,
            submit: () => false,
        },
        scripts: item.scripts,
        policies: form.policies,
        catalog: true,
        runKey: form,
    })
    const showPrices = !!(item.pricing && item.pricing.showPrices) && !isProducer
    const price = useItemPrice(item.sysId, priceVars, quantity, showPrices && (form.priceAffecting.length > 0 || quantity !== '1'))
    const displayPrice = price.data ? price.data.price : item.pricing && item.pricing.price ? item.pricing.displayPrice : ''
    const recurring = price.data
        ? price.data.recurringPrice
        : item.pricing && item.pricing.recurringPrice
          ? `${item.pricing.recurringDisplayPrice} ${item.pricing.recurringFrequencyDisplay || ''}`.trim()
          : ''
    const picture = item.picture ? `/${item.picture}` : ''

    const focusField = (name: string) => {
        const el = root.current && (root.current.querySelector(`[data-rpf-field="${name}"] input, [data-rpf-field="${name}"] textarea, [data-rpf-field="${name}"] [role=combobox], [data-rpf-field="${name}"] button, [data-rpf-field="${name}"] [tabindex]`) as HTMLElement | null)
        if (el) el.focus()
    }
    const submit = async () => {
        setFailure('')
        const r = form.validate()
        if (!r.valid) {
            setErrors(r.errors)
            setTimeout(() => summary.current && summary.current.focus(), 0)
            return
        }
        // onSubmit catalog client scripts can veto the order (return false).
        if (scripts.env && !scripts.env.runOnSubmit('order_now')) return
        setErrors([])
        setSubmitting(true)
        try {
            const res = await submitCatalogItem({
                itemId: item.sysId,
                kind: isProducer ? 'submit_producer' : 'order_now',
                variables: form.serializeVariables(),
                quantity,
                itemGuid: item.targetRecordSysId,
            })
            props.onSubmitted(res)
        } catch (e) {
            setFailure((e as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card ref={root} data-rp-catalog-item={item.sysId}>
            <CardHeader>
                <div className="flex items-start gap-4">
                    {picture ? <img src={picture} alt="" className="size-14 shrink-0 rounded-md border border-border object-contain" /> : null}
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {item.shortDescription ? <CardDescription>{item.shortDescription}</CardDescription> : null}
                    </div>
                    {showPrices && displayPrice ? (
                        <div className="text-right" aria-live="polite">
                            <div className="text-lg font-semibold tabular-nums">{displayPrice}</div>
                            {recurring ? <div className="text-xs text-muted-foreground">+ {recurring}</div> : null}
                            {quantity !== '1' && price.data && price.data.subtotal ? (
                                <div className="text-xs text-muted-foreground" data-rp-subtotal="">
                                    Subtotal ×{quantity}: <span className="font-medium text-foreground tabular-nums">{price.data.subtotal}</span>
                                    {price.data.recurringSubtotal ? ` + ${price.data.recurringSubtotal}` : ''}
                                </div>
                            ) : null}
                            {price.isFetching ? <Spinner className="text-muted-foreground" label="Updating price" /> : null}
                        </div>
                    ) : null}
                </div>
                {item.description ? <div className="rpv-rich mt-3 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} /> : null}
            </CardHeader>
            <CardContent>
                <form
                    noValidate
                    onSubmit={(e: any) => {
                        e.preventDefault()
                        submit()
                    }}
                    className="flex flex-col gap-6"
                >
                    {errors.length ? (
                        <div ref={summary} tabIndex={-1} role="alert" className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30" data-rp-error-summary="">
                            <p className="flex items-center gap-2 font-medium text-destructive">
                                <IconAlert size={16} /> Fix {errors.length} field{errors.length === 1 ? '' : 's'} to continue
                            </p>
                            <ul className="mt-2 ml-6 list-disc">
                                {errors.map((e) => (
                                    <li key={e.name + e.message}>
                                        <button type="button" className="text-left text-destructive underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none" onClick={() => focusField(e.name)}>
                                            {e.message}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {formMeta.messages.length ? (
                        <div className="flex flex-col gap-2" data-rp-form-messages="">
                            {formMeta.messages.map((m: any) => (
                                <div
                                    key={m.id}
                                    role={m.kind === 'error' ? 'alert' : 'status'}
                                    className={cx('rpv-rich rounded-md border p-3 text-sm [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline', m.kind === 'error' ? 'border-destructive/50 bg-destructive/5 text-destructive' : 'border-border bg-muted/50 text-foreground')}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text) }}
                                />
                            ))}
                        </div>
                    ) : null}
                    <VariableLayout fieldLayout={props.fieldLayout} renderCustom={props.renderCustom} />
                    {item.mandatoryAttachment ? (
                        <p className="text-sm text-muted-foreground">This item requires an attachment on the request; add it from the platform after submitting.</p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                        {failure ? (
                            <p role="alert" className="mr-auto text-sm text-destructive">
                                {failure}
                            </p>
                        ) : null}
                        {!isProducer && !item.hideQuantity && item.quantity.length ? (
                            <label className="flex items-center gap-2 text-sm">
                                Quantity
                                <select
                                    value={quantity}
                                    onChange={(e: any) => setQuantity(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {item.quantity.map((q) => (
                                        <option key={q.value} value={q.value}>
                                            {q.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                        <Button type="button" disabled={submitting} data-rp-submit="" onClick={submit}>
                            {submitting ? <Spinner label="Submitting" /> : null}
                            {actionLabel(item)}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

function Submitted(props: { item: CatalogItemData; result: SubmitResult; href?: (table: string, sysId: string) => string; onAgain: () => void }) {
    const { result } = props
    const table = result.table || (props.item.type === 'record_producer' ? '' : 'sc_request')
    const link = result.sysId && table ? (props.href ? props.href(table, result.sysId) : `/${table}.do?sys_id=${encodeURIComponent(result.sysId)}`) : ''
    return (
        <Card data-rp-submitted={result.number}>
            <CardContent className="flex flex-col items-start gap-3">
                <p className="flex items-center gap-2 text-base font-semibold" role="status">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <IconCheck size={14} />
                    </span>
                    {props.item.type === 'record_producer' ? 'Submitted' : 'Request submitted'}
                </p>
                <p className="text-sm text-muted-foreground">
                    {props.item.name}:{' '}
                    {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                            {result.number || result.sysId}
                            <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                    ) : (
                        <span className="font-medium text-foreground">{result.number || result.sysId}</span>
                    )}
                </p>
                <Button variant="outline" size="sm" onClick={props.onAgain} className={cx('')}>
                    Start another
                </Button>
            </CardContent>
        </Card>
    )
}
