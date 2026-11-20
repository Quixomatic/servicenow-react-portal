import { useEffect, useRef, useState } from 'react'
import { Link, useProperty, useUser, toast } from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from 'components:card'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import {
    useCart,
    useUpdateCartItem,
    useRemoveCartItem,
    useEmptyCart,
    useCheckout,
    useCartRequestedFor,
    useSetCartRequestedFor,
    canRequestForAll,
    cartErrorMessage,
} from 'utilities:app/catalog'
import type { CartData, CartLine, CheckoutResult } from 'utilities:app/catalog'
import { RequestedForField, useRequestedFor } from 'components:app/requested-for-field'
import { DialogOutlet, useConfirm } from 'components:app/confirm-dialog'
import { Select } from 'components:app/combobox'
import { cx, Spinner, IconCheck, controlClass } from 'components:app/field'

/**
 * components:app/cart: the user's Service Catalog cart, and checkout.
 *
 * Lines (picture, name linking back to the item, the platform's variable summary, delivery time),
 * quantity (our combobox Select), remove, price per line and the subtotal (with recurring
 * subtotals), the cart's "Requested for" (app/requested-for-field, delegation-checked against every
 * item in the cart, saved on the cart), Empty cart (app/confirm-dialog), then Checkout.
 *
 * Checkout follows the platform: one-step (the default) places the order at once and shows the
 * request number with a link (option recordPage, default the 'form' page; '' = the platform form).
 * With glide.sc.checkout.twostep (exposed to the portal as a property), or option review: 'always',
 * a review step comes first; if the platform answers a checkout with a summary instead of a request,
 * the review step shows and "Place order" submits it (submit_order). Errors map to plain messages.
 *
 * All data comes from utilities:app/catalog's cart hooks (one shared cache key), so the header
 * app/cart-button follows every change. Exported for other widgets: <Cart />, <CartLineItem />,
 * <CartTotals />, <CartVariables />, <CheckoutDone />, formatCartValue.
 *
 * Options: { title ('Your cart'), catalogPage ('catalog'), recordPage ('form'), review ('auto' | 'always') }.
 */
export type CartProps = {
    title?: string
    /** Portal page for item links and "Continue shopping" (default 'catalog'; '' = no links). */
    catalogPage?: string
    /** Portal page that opens the request (record form with table / sys_id); '' = the platform form. Default 'form'. */
    recordPage?: string
    /** 'auto' (default): review first only with two-step checkout; 'always': always review first. */
    review?: 'auto' | 'always'
}

type Options = CartProps

export default function CartWidget({ options = {} }: { options?: Options }) {
    return <Cart {...options} />
}

const QUANTITIES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

/** A variable's display value as the cart summary shows it (booleans as Yes / No, row sets as a count). */
export function formatCartValue(value: string): string {
    const v = String(value == null ? '' : value).trim()
    if (v === 'true') return 'Yes'
    if (v === 'false') return 'No'
    if (v.charAt(0) === '[') {
        try {
            const rows = JSON.parse(v)
            if (Array.isArray(rows)) return `${rows.length} row${rows.length === 1 ? '' : 's'}`
        } catch (e) {
            /* plain text */
        }
    }
    return v
}

type Step = 'cart' | 'review'

export function Cart(props: CartProps) {
    const catalogPage = props.catalogPage === undefined ? 'catalog' : props.catalogPage
    const cart = useCart()
    const twoStep = useProperty('glide.sc.checkout.twostep')
    const reviewFirst = props.review === 'always' || twoStep.value === 'true'
    const { checkout, submit, pending } = useCheckout()
    const user = useUser() as any
    const [step, setStep] = useState<Step>('cart')
    const [done, setDone] = useState<CheckoutResult | null>(null)
    const [failure, setFailure] = useState('')
    // The platform answered a checkout with its summary (two-step): the next Place order submits it.
    const [platformReview, setPlatformReview] = useState(false)
    const [rfState, setRfState] = useState<{ value: string; displayValue: string; valid: boolean }>({ value: '', displayValue: '', valid: false })
    const heading = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (step === 'review' && heading.current) heading.current.focus()
    }, [step])

    if (done && done.kind === 'ordered') return <CheckoutDone result={done} recordPage={props.recordPage} catalogPage={catalogPage} />

    if (cart.isLoading)
        return (
            <Card aria-busy="true">
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner label="Loading your cart" /> Loading your cart…
                </CardContent>
            </Card>
        )
    if (cart.error || !cart.data)
        return (
            <Card>
                <CardContent role="alert" className="text-sm text-destructive">
                    {cartErrorMessage(cart.error) || "Your cart couldn't be loaded."}
                </CardContent>
            </Card>
        )
    const data = cart.data
    const lines = data.lines
    if (!lines.length) return <EmptyCart title={props.title} catalogPage={catalogPage} />

    const blocked = lines.filter((l) => !l.canOrder)
    const placeOrder = async () => {
        setFailure('')
        if (!rfState.valid) {
            setFailure('Choose who this order is for.')
            return
        }
        if (blocked.length) {
            setFailure(`Remove what you can no longer order first: ${blocked.map((l) => l.name).join(', ')}.`)
            return
        }
        try {
            // Delegation for the cart's person against every item (lines may have arrived since the pick).
            if (rfState.value && rfState.value !== String((user && user.sysId) || '')) {
                const names: Record<string, string> = {}
                for (const l of lines) names[l.itemId] = l.name
                const d = await canRequestForAll(lines.map((l) => l.itemId), rfState.value, names)
                if (!d.ok) {
                    setFailure(d.message)
                    return
                }
            }
            const r = platformReview ? await submit.mutateAsync() : await checkout.mutateAsync()
            if (r.kind === 'ordered') {
                setDone(r)
                return
            }
            // Two-step on the platform: review what's in the cart, then submit_order.
            setPlatformReview(true)
            setStep('review')
        } catch (e) {
            setFailure(cartErrorMessage(e))
        }
    }
    const onCheckout = () => {
        if (reviewFirst && step === 'cart') {
            setFailure('')
            if (!rfState.valid) {
                setFailure('Choose who this order is for.')
                return
            }
            setStep('review')
            return
        }
        placeOrder()
    }

    const reviewing = step === 'review'
    return (
        <Card data-rp-cart={data.cartId} data-step={step}>
            <DialogOutlet />
            <CardHeader>
                <CardTitle ref={heading} tabIndex={-1} className="text-lg outline-none" data-rp-cart-heading="">
                    {reviewing ? 'Review your order' : props.title || 'Your cart'}
                </CardTitle>
                <CardDescription>
                    {lines.length} item{lines.length === 1 ? '' : 's'}
                    {data.totalQuantity !== lines.length ? ` · ${data.totalQuantity} in total` : ''}
                </CardDescription>
                {!reviewing ? (
                    <CardAction>
                        <EmptyCartButton cart={data} />
                    </CardAction>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <ul className="m-0 flex list-none flex-col p-0" aria-label="Items in your cart">
                    {lines.map((l) => (
                        <CartLineItem key={l.id} line={l} readOnly={reviewing} catalogPage={catalogPage} />
                    ))}
                </ul>
                <div className="grid gap-6 border-t border-border pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
                    <div className="max-w-md" data-rp-cart-requested-for="">
                        <CartRequestedFor cart={data} readOnly={reviewing} onState={setRfState} />
                    </div>
                    <div className="flex flex-col gap-3">
                        <CartTotals cart={data} />
                        {failure ? (
                            <p role="alert" className="m-0 text-sm text-destructive" data-rp-cart-error="">
                                {failure}
                            </p>
                        ) : null}
                        <div className="flex flex-wrap justify-end gap-2">
                            {reviewing ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() => {
                                        setFailure('')
                                        setStep('cart')
                                    }}
                                    data-rp-cart-back=""
                                >
                                    Back to cart
                                </Button>
                            ) : null}
                            <Button type="button" disabled={pending || !rfState.valid} onClick={onCheckout} data-rp-checkout="">
                                {pending ? <Spinner label="Placing your order" /> : null}
                                {reviewing ? 'Place order' : reviewFirst ? 'Review order' : 'Checkout'}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function EmptyCart(props: { title?: string; catalogPage: string }) {
    return (
        <Card data-rp-cart="" data-empty="">
            <CardHeader>
                <CardTitle className="text-lg">{props.title || 'Your cart'}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
                    <Icon name="shopping-cart" className="size-6" />
                </span>
                <p className="m-0 text-sm text-muted-foreground">Your cart is empty.</p>
                {props.catalogPage ? (
                    <Button variant="outline" size="sm" render={<Link to={props.catalogPage} />}>
                        Browse the catalog
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    )
}

function EmptyCartButton({ cart }: { cart: CartData }) {
    const confirm = useConfirm()
    const empty = useEmptyCart()
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={empty.isPending}
            data-rp-cart-empty=""
            onClick={async () => {
                const ok = await confirm({
                    title: 'Empty your cart?',
                    description: `This removes ${cart.count === 1 ? 'the item' : `all ${cart.count} items`} from your cart.`,
                    confirmLabel: 'Empty cart',
                    destructive: true,
                })
                if (!ok) return
                try {
                    await empty.mutateAsync(cart.cartId)
                    toast.success('Your cart has been emptied')
                } catch (e) {
                    toast.error(cartErrorMessage(e))
                }
            }}
        >
            {empty.isPending ? <Spinner label="Emptying your cart" /> : <Icon name="trash-2" className="size-4" />}
            Empty cart
        </Button>
    )
}

/** One cart line: picture, name, variable summary, quantity, price, remove. */
export function CartLineItem(props: { line: CartLine; readOnly?: boolean; catalogPage?: string }) {
    const { line } = props
    const update = useUpdateCartItem()
    const remove = useRemoveCartItem()
    const qtyLabel = `rp-cart-qty-${line.id}`
    const qtyItems = (QUANTITIES.indexOf(line.quantity) >= 0 ? QUANTITIES : QUANTITIES.concat(line.quantity)).map((q) => ({ value: q, label: q }))
    const picture = line.picture ? (/^(https?:)?\//.test(line.picture) ? line.picture : `/${line.picture}`) : ''
    const name = props.catalogPage ? (
        <Link to={props.catalogPage} q={{ item: line.itemId }} className="font-medium text-foreground no-underline underline-offset-4 hover:underline">
            {line.name}
        </Link>
    ) : (
        <span className="font-medium">{line.name}</span>
    )
    return (
        <li
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-b border-border py-4 first:pt-0 last:border-b-0 max-sm:grid-cols-[auto_minmax(0,1fr)]"
            data-rp-cart-line={line.id}
            aria-busy={update.isPending || remove.isPending || undefined}
        >
            {picture ? (
                <img src={picture} alt="" className="size-12 shrink-0 rounded-md border border-border object-contain" />
            ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground" aria-hidden="true">
                    <Icon name="package" className="size-5" />
                </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
                <div className="text-sm">{name}</div>
                {line.shortDescription ? <div className="text-sm text-muted-foreground">{line.shortDescription}</div> : null}
                <CartVariables variables={line.variables} />
                {line.deliveryTime ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon name="truck" className="size-3.5" aria-hidden="true" /> Delivery in {line.deliveryTime}
                    </div>
                ) : null}
                {!line.canOrder ? (
                    <p role="note" className="m-0 text-xs text-destructive">
                        This item can no longer be ordered. Remove it to check out.
                    </p>
                ) : null}
            </div>
            <div className="flex flex-col items-end gap-2 max-sm:col-span-2 max-sm:flex-row max-sm:items-center max-sm:justify-between">
                <div className="flex items-center gap-2">
                    {line.showQuantity ? (
                        props.readOnly || line.quantityReadOnly ? (
                            <span className="text-sm text-muted-foreground tabular-nums">Qty {line.quantity}</span>
                        ) : (
                            <div className="flex items-center gap-2 text-sm" data-rp-cart-quantity="">
                                <span id={qtyLabel} className="text-muted-foreground">
                                    Qty<span className="sr-only"> for {line.name}</span>
                                </span>
                                <div className={controlClass({ className: 'w-auto min-w-16 pl-1' })}>
                                    <Select
                                        variant="inline"
                                        aria-labelledby={qtyLabel}
                                        value={line.quantity}
                                        items={qtyItems}
                                        popupMinWidth={80}
                                        disabled={update.isPending || remove.isPending}
                                        renderValue={(i) => <span className="tabular-nums">{i.label}</span>}
                                        onChange={(i) => {
                                            if (i.value === line.quantity) return
                                            update.mutate(
                                                { lineId: line.id, quantity: i.value },
                                                { onError: (e: unknown) => toast.error(cartErrorMessage(e)) },
                                            )
                                        }}
                                    />
                                </div>
                                {update.isPending ? <Spinner label="Updating quantity" className="text-muted-foreground" /> : null}
                            </div>
                        )
                    ) : null}
                    {!props.readOnly ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${line.name}`}
                            title="Remove"
                            disabled={remove.isPending}
                            data-rp-cart-remove=""
                            onClick={() =>
                                remove.mutate(line.id, {
                                    onSuccess: () => toast(`${line.name} removed from your cart`),
                                    onError: (e: unknown) => toast.error(cartErrorMessage(e)),
                                })
                            }
                        >
                            <Icon name="trash-2" className="size-4" />
                        </Button>
                    ) : null}
                </div>
                {line.showPrice && (line.subtotal || line.price) ? (
                    <div className="text-right text-sm" aria-live="polite" data-rp-cart-line-price="">
                        <div className="font-semibold tabular-nums">{line.subtotal || line.price}</div>
                        {line.quantity !== '1' && line.price ? <div className="text-xs text-muted-foreground tabular-nums">{line.price} each</div> : null}
                        {line.recurringSubtotal ? <div className="text-xs text-muted-foreground tabular-nums">+ {line.recurringSubtotal}</div> : null}
                    </div>
                ) : null}
            </div>
        </li>
    )
}

/** The platform's variable summary for a line: the first few inline, the rest behind "Show all". */
export function CartVariables(props: { variables: { label: string; value: string }[]; max?: number }) {
    const [open, setOpen] = useState(false)
    const items = props.variables.map((v) => ({ label: v.label, value: formatCartValue(v.value) })).filter((v) => v.value !== '')
    if (!items.length) return null
    const max = props.max || 3
    const shown = open ? items : items.slice(0, max)
    return (
        <div className="text-xs text-muted-foreground" data-rp-cart-variables="">
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                {shown.map((v, i) => (
                    <div key={v.label + i} className="contents">
                        <dt className="font-medium text-foreground/80">{v.label}</dt>
                        <dd className="m-0 truncate" title={v.value}>
                            {v.value}
                        </dd>
                    </div>
                ))}
            </dl>
            {items.length > max ? (
                <button
                    type="button"
                    className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                >
                    {open ? 'Show less' : `Show all ${items.length} details`}
                </button>
            ) : null}
        </div>
    )
}

/** Subtotal and recurring subtotals. */
export function CartTotals({ cart }: { cart: CartData }) {
    if (!cart.showSubtotal || !cart.subtotal) return null
    return (
        <div className="flex flex-col gap-1 text-sm" data-rp-cart-totals="">
            <div className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{cart.subtotalTitle}</span>
                <span className="text-lg font-semibold tabular-nums" aria-live="polite" data-rp-cart-subtotal="">
                    {cart.subtotal}
                </span>
            </div>
            {cart.recurring.map((r) => (
                <div key={r.frequency} className="flex items-baseline justify-between gap-4 text-xs text-muted-foreground">
                    <span>{r.frequency}</span>
                    <span className="tabular-nums">+ {r.subtotal}</span>
                </div>
            ))}
        </div>
    )
}

/** The cart's "Requested for": loads it from the cart, delegation-checks every item, saves picks on the cart. */
function CartRequestedFor(props: { cart: CartData; readOnly?: boolean; onState: (s: { value: string; displayValue: string; valid: boolean }) => void }) {
    const rf = useCartRequestedFor(props.cart.cartId)
    if (rf.isLoading)
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner label="Loading who this order is for" /> Requested for…
            </div>
        )
    return <CartRequestedForField key={props.cart.cartId} cart={props.cart} initial={rf.data && rf.data.value ? rf.data : undefined} readOnly={props.readOnly} onState={props.onState} />
}

function CartRequestedForField(props: {
    cart: CartData
    initial?: { value: string; displayValue: string }
    readOnly?: boolean
    onState: (s: { value: string; displayValue: string; valid: boolean }) => void
}) {
    const names: Record<string, string> = {}
    for (const l of props.cart.lines) names[l.itemId] = l.name
    const itemIds = props.cart.lines.map((l) => l.itemId)
    const rf = useRequestedFor({ itemId: itemIds, itemNames: names, initial: props.initial })
    const save = useSetCartRequestedFor()
    const saved = useRef(props.initial ? props.initial.value : '')
    const valid = rf.valid && !save.isPending
    useEffect(() => {
        props.onState({ value: rf.value, displayValue: rf.displayValue, valid })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rf.value, rf.displayValue, valid])
    // Save an accepted pick on the cart (sc_cart.requested_for): the order is placed for that person.
    useEffect(() => {
        if (!rf.valid || !rf.value || rf.value === saved.current) return
        saved.current = rf.value
        save.mutate(
            { cartId: props.cart.cartId, userId: rf.value, displayValue: rf.displayValue },
            { onError: (e: unknown) => toast.error(cartErrorMessage(e)) },
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rf.valid, rf.value])
    if (props.readOnly)
        return (
            <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Requested for</span>
                <span className="text-muted-foreground">{rf.displayValue || rf.value}</span>
            </div>
        )
    return (
        <RequestedForField
            name="requested_for"
            table="sc_request"
            label="Requested for"
            hint="Who this order is for. Every item is checked."
            readOnly={false}
            mandatory
            standalone
            {...rf.fieldProps}
        />
    )
}

/** After checkout: the request number with a link, and Continue shopping. */
export function CheckoutDone(props: { result: Extract<CheckoutResult, { kind: 'ordered' }>; recordPage?: string; catalogPage?: string }) {
    const { result } = props
    const recordPage = props.recordPage === undefined ? 'form' : props.recordPage
    const heading = useRef<HTMLParagraphElement | null>(null)
    useEffect(() => {
        if (heading.current) heading.current.focus()
    }, [])
    const label = result.requestNumber || result.requestId
    const link = !result.requestId ? (
        <span className="font-medium text-foreground">{label}</span>
    ) : recordPage ? (
        <Link to={recordPage} table={result.table || 'sc_request'} sysId={result.requestId} className="font-medium text-primary underline-offset-4 hover:underline" data-rp-cart-request="">
            {label}
        </Link>
    ) : (
        <a href={`/${result.table || 'sc_request'}.do?sys_id=${encodeURIComponent(result.requestId)}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline" data-rp-cart-request="">
            {label}
            <span className="sr-only"> (opens in a new tab)</span>
        </a>
    )
    return (
        <Card data-rp-cart-done={label}>
            <CardContent className="flex flex-col items-start gap-3">
                <p ref={heading} tabIndex={-1} className="m-0 flex items-center gap-2 text-base font-semibold outline-none" role="status">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <IconCheck size={14} />
                    </span>
                    Thank you, your order has been placed
                </p>
                <p className="m-0 text-sm text-muted-foreground">Request {link}. Track its progress from the request.</p>
                {props.catalogPage ? (
                    <Button variant="outline" size="sm" render={<Link to={props.catalogPage} />} className={cx('')}>
                        Continue shopping
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    )
}
