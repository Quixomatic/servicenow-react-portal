import { useQuery, useMutation, useQueryClient } from 'utilities:react-query'
import { useRecordWatch } from '@portal/runtime'
import { authHeaders } from 'utilities:app/graphql'
import { canRequestFor, REQUESTED_FOR_NOT_ELIGIBLE } from './api'
import type { DelegationResult } from './types'

/**
 * Cart and checkout on the platform's own Service Catalog REST API (sn_sc.CartJS behind each):
 *
 *   fetchCart              GET    /api/sn_sc/servicecatalog/cart                      (the user's default cart: lines grouped by
 *                                                                                      recurring frequency, subtotals)
 *   addToCart              POST   /api/sn_sc/servicecatalog/items/{id}/add_to_cart     (same body as order_now)
 *   updateCartItem         PATCH  /api/now/table/sc_cart_item/{cart_item_id}        (quantity only, as SP's cart widget; the REST
 *                                                                                      PUT replaces the line's variables), then GET /cart
 *   removeCartItem         DELETE /api/sn_sc/servicecatalog/cart/{cart_item_id}
 *   emptyCart              DELETE /api/sn_sc/servicecatalog/cart/{cart_id}/empty
 *   checkoutCart           POST   /api/sn_sc/servicecatalog/cart/checkout             (one-step: orders, answers the request;
 *                                                                                      glide.sc.checkout.twostep: answers a summary)
 *   submitCartOrder        POST   /api/sn_sc/servicecatalog/cart/submit_order         (two-step: places the reviewed order)
 *   fetchCartRequestedFor  GET    /api/now/table/sc_cart/{cart_id}                    (requested_for, delivery_address)
 *   setCartRequestedFor    PATCH  /api/now/table/sc_cart/{cart_id}                    (what CartJS.setRequestedFor writes; the
 *                                                                                      REST API has no call for it)
 *   fetchItemOrderOptions  GET    /api/now/table/sc_cat_item/{id}                     (no_cart / no_cart_v2 / no_order_now /
 *                                                                                      no_order: which buttons the item allows)
 *
 * Every hook shares CART_KEY, so a badge, a popover and the cart page stay in step; useCart({ live })
 * also watches the cart's sc_cart_item rows over AMB (another tab, the classic UI).
 */

export type CartVariable = { label: string; value: string }

export type CartLine = {
    /** sc_cart_item sys_id. */
    id: string
    /** The catalog item. */
    itemId: string
    name: string
    shortDescription: string
    picture: string
    quantity: string
    showQuantity: boolean
    quantityReadOnly: boolean
    showPrice: boolean
    /** Unit price (display). */
    price: string
    /** Price × quantity (display) and as a number. */
    subtotal: string
    subtotalValue: number
    /** '' or e.g. "$100.00 Annually". */
    recurringPrice: string
    recurringSubtotal: string
    deliveryTime: string
    /** Line-level requested for (order guides); usually '' (the cart's applies). */
    requestedFor: string
    /** The item's variables as label → display value (the platform's own summary). */
    variables: CartVariable[]
    canOrder: boolean
    orderGuide: string
    sysClassName: string
}

export type CartData = {
    cartId: string
    lines: CartLine[]
    /** Number of lines (the badge). */
    count: number
    /** Sum of the lines' quantities. */
    totalQuantity: number
    showSubtotal: boolean
    subtotal: string
    subtotalTitle: string
    totalTitle: string
    /** One entry per recurring frequency, e.g. { frequency: 'Annually', subtotal: '$200.00' }. */
    recurring: { frequency: string; subtotal: string }[]
    raw: Record<string, unknown>
}

export type CheckoutResult =
    | { kind: 'ordered'; requestId: string; requestNumber: string; table: string; raw: Record<string, unknown> }
    | { kind: 'review'; summary: Record<string, unknown> }

export type ItemOrderOptions = { addToCart: boolean; orderNow: boolean; saveAsDraft: boolean; known: boolean }

/** Shared cache key for the default cart (every cart hook reads or invalidates it). */
export const CART_KEY = ['rp-catalog', 'cart'] as const

// ---- REST ----------------------------------------------------------------------------------------

/** A Service Catalog / Table API failure, with the platform's message and the HTTP status. */
export class CartError extends Error {
    status: number
    platformMessage: string
    constructor(message: string, status: number, platformMessage: string) {
        super(message)
        this.name = 'CartError'
        this.status = status
        this.platformMessage = platformMessage
    }
}

const MESSAGES: [RegExp, string][] = [
    [/cart is empty|empty cart/i, 'Your cart is empty.'],
    [/mandatory variables/i, 'Some required details are missing. Open the item, fill them in and try again.'],
    [/invalid quantity/i, 'Choose a quantity between 1 and 10.'],
    [/security constraints|not authorized/i, "You can't order this item, or it's no longer available to you."],
    [/invalid cart item|cart item id/i, 'That line is no longer in your cart. The cart has been refreshed.'],
    [/doesn't match|does not match/i, 'That line no longer matches its item. The cart has been refreshed.'],
    [/error during (checkout|submit)/i, "The order couldn't be placed. Nothing was ordered; try again in a moment."],
]

/** A user-facing message for a cart call's failure (platform messages mapped to plain language). */
export function cartErrorMessage(e: unknown): string {
    if (!e) return ''
    const err = e as CartError
    if (err.status === 401) return 'Your session has expired. Reload the page and try again.'
    if (err.status === 0 || (err instanceof TypeError && /fetch/i.test(String(err.message)))) return "Couldn't reach the server. Check your connection and try again."
    const text = String((err && (err.platformMessage || err.message)) || '')
    for (const [re, msg] of MESSAGES) if (re.test(text)) return msg
    return text || 'Something went wrong with your cart. Try again.'
}

async function scRest(method: string, url: string, body?: unknown): Promise<any> {
    let response: Response
    try {
        response = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: authHeaders(body !== undefined),
            body: body === undefined ? undefined : JSON.stringify(body),
        })
    } catch (e) {
        throw new CartError("Couldn't reach the server.", 0, String((e as Error).message || e))
    }
    if (response.status === 204) return null
    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    const result = json ? json.result : null
    // Cart exceptions come back as 400 with { result: { errMsg } }; sn_ws_err as { error: { message } }.
    const errMsg = (result && typeof result === 'object' && result.errMsg) || (json && json.error && (json.error.message || json.error.detail))
    if (!response.ok || (result && typeof result === 'object' && result.errMsg)) {
        const platform = typeof errMsg === 'string' ? errMsg : errMsg ? JSON.stringify(errMsg) : `HTTP ${response.status}`
        const err = new CartError('', response.ok ? 400 : response.status, platform)
        err.message = cartErrorMessage(err)
        throw err
    }
    return result
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))
const truthy = (v: unknown) => v === true || v === 'true'

function parseLine(i: any): CartLine {
    const vars: CartVariable[] = []
    const v = i.variables && typeof i.variables === 'object' ? i.variables : {}
    for (const label of Object.keys(v)) vars.push({ label, value: str(v[label]) })
    return {
        id: str(i.cart_item_id || i.sys_id),
        itemId: str(i.catalog_item_id || i.item_id),
        name: str(i.item_name || i.name),
        shortDescription: str(i.short_description),
        picture: str(i.picture),
        quantity: str(i.quantity || '1'),
        showQuantity: i.show_quantity !== false,
        quantityReadOnly: truthy(i.read_only_quantity),
        showPrice: i.show_price !== false,
        price: str(i.price_display || i.localized_price || i.price),
        subtotal: str(i.subtotal_price_display || i.subtotal_price),
        subtotalValue: Number(i.subtotal || 0) || 0,
        recurringPrice: truthy(i.show_recurring_price) && i.recurring_frequency ? `${str(i.recurring_price_display || i.localized_recurring_price || i.recurring_price)} ${str(i.recurring_frequency)}` : '',
        recurringSubtotal: truthy(i.show_recurring_price) && i.recurring_frequency ? `${str(i.recurring_subtotal_price_display || i.recurring_subtotal_price)} ${str(i.recurring_frequency)}` : '',
        deliveryTime: truthy(i.no_delivery_time) ? '' : str(i.delivery_time),
        requestedFor: str(i.requested_for),
        variables: vars,
        canOrder: i.can_order !== false,
        orderGuide: str(i.order_guide),
        sysClassName: str(i.sys_class_name),
    }
}

/** The cart summary (GET /cart, or an update's answer) → CartData. Lines come grouped by frequency. */
export function parseCart(r: any): CartData {
    const result = r && typeof r === 'object' ? r : {}
    const lines: CartLine[] = []
    const recurring: { frequency: string; subtotal: string }[] = []
    for (const key of Object.keys(result)) {
        const g = result[key]
        if (!g || typeof g !== 'object' || !Array.isArray(g.items)) continue
        for (const i of g.items) lines.push(parseLine(i))
        if (key !== 'none' && g.frequency_label && g.items.some((i: any) => truthy(i.show_recurring_price))) recurring.push({ frequency: str(g.frequency_label), subtotal: str(g.subtotal_recurring_price) })
    }
    return {
        cartId: str(result.cart_id),
        lines,
        count: lines.length,
        totalQuantity: lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0),
        showSubtotal: truthy(result.show_subtotal_price),
        subtotal: result.subtotal_price && result.subtotal_price !== '-' ? str(result.subtotal_price) : '',
        subtotalTitle: str(result.subtotal_title || 'Subtotal'),
        totalTitle: str(result.total_title || 'Total'),
        recurring,
        raw: result,
    }
}

export async function fetchCart(): Promise<CartData> {
    return parseCart(await scRest('GET', '/api/sn_sc/servicecatalog/cart'))
}

/** Add an item to the cart: same variables / quantity / draft guid as order_now. */
export async function addToCart(args: { itemId: string; variables: Record<string, string>; quantity?: string; requestedFor?: string; itemGuid?: string }) {
    const body: Record<string, unknown> = { sysparm_quantity: args.quantity || '1', variables: args.variables }
    if (args.itemGuid) body.sysparm_item_guid = args.itemGuid
    if (args.requestedFor) body.sysparm_requested_for = args.requestedFor
    const r = (await scRest('POST', `/api/sn_sc/servicecatalog/items/${encodeURIComponent(args.itemId)}/add_to_cart`, body)) || {}
    return { cartId: str(r.cart_id), subtotal: str(r.subtotal), items: (Array.isArray(r.items) ? r.items : []) as any[], raw: r }
}

/**
 * Change a line's quantity. Not the REST API's PUT /cart/{id}: it REPLACES the line's variables with
 * the body's (a quantity-only body wipes them, MRVS rows included). Like Service Portal's cart widget,
 * write sc_cart_item.quantity alone (Table API), then re-read the cart for the new prices.
 */
export async function updateCartItem(args: { lineId: string; quantity: string }): Promise<CartData> {
    const quantity = String(args.quantity)
    if (!/^[1-9][0-9]*$/.test(quantity)) throw new CartError(cartErrorMessage({ platformMessage: 'Invalid Quantity value' }), 400, 'Invalid Quantity value')
    await scRest('PATCH', `/api/now/table/sc_cart_item/${encodeURIComponent(args.lineId)}?sysparm_fields=quantity`, { quantity })
    return fetchCart()
}

export async function removeCartItem(lineId: string): Promise<void> {
    await scRest('DELETE', `/api/sn_sc/servicecatalog/cart/${encodeURIComponent(lineId)}`)
}

export async function emptyCart(cartId: string): Promise<void> {
    await scRest('DELETE', `/api/sn_sc/servicecatalog/cart/${encodeURIComponent(cartId)}/empty`)
}

function orderedResult(r: any): CheckoutResult | null {
    if (!r || typeof r !== 'object') return null
    const id = str(r.request_id || r.sys_id)
    const number = str(r.request_number || r.number)
    if (!id && !number) return null
    return { kind: 'ordered', requestId: id, requestNumber: number, table: str(r.table || 'sc_request'), raw: r }
}

/**
 * Check out the cart. One-step (the platform default) orders it and answers the request; with
 * glide.sc.checkout.twostep the platform answers the order summary instead (kind 'review'), and
 * submitCartOrder() places it. The platform decides, so callers handle both.
 */
export async function checkoutCart(): Promise<CheckoutResult> {
    const r = await scRest('POST', '/api/sn_sc/servicecatalog/cart/checkout', {})
    return orderedResult(r) || { kind: 'review', summary: (r || {}) as Record<string, unknown> }
}

/** Place the reviewed order (two-step checkout). */
export async function submitCartOrder(): Promise<CheckoutResult> {
    const r = await scRest('POST', '/api/sn_sc/servicecatalog/cart/submit_order', {})
    const done = orderedResult(r)
    if (!done) throw new CartError("The order couldn't be confirmed. Check your requests before trying again.", 500, 'submit_order answered no request')
    return done
}

/** The cart's requested for (the person the order is for) and delivery address. */
export async function fetchCartRequestedFor(cartId: string): Promise<{ value: string; displayValue: string; deliveryAddress: string }> {
    const r = await scRest('GET', `/api/now/table/sc_cart/${encodeURIComponent(cartId)}?sysparm_fields=requested_for,delivery_address&sysparm_display_value=all&sysparm_exclude_reference_link=true`)
    const rf = (r && r.requested_for) || {}
    return { value: str(rf.value), displayValue: str(rf.display_value), deliveryAddress: str(r && r.delivery_address && (r.delivery_address.value ?? r.delivery_address)) }
}

/** Set the cart's requested for (sc_cart.requested_for, what CartJS.setRequestedFor writes). */
export async function setCartRequestedFor(cartId: string, userId: string): Promise<void> {
    await scRest('PATCH', `/api/now/table/sc_cart/${encodeURIComponent(cartId)}?sysparm_fields=requested_for`, { requested_for: userId })
}

/**
 * Can the current user request every one of these items for `userId`? One delegation check per
 * distinct item (the platform's per-item rule); the first failures are named in the message.
 */
export async function canRequestForAll(itemIds: string[], userId: string, names: Record<string, string> = {}): Promise<DelegationResult & { failed: string[] }> {
    const ids = Array.from(new Set(itemIds.filter(Boolean)))
    if (!userId || !ids.length) return { ok: true, message: '', failed: [] }
    const answers = await Promise.all(ids.map((id) => canRequestFor(id, userId).then((r) => ({ id, r }))))
    const failed = answers.filter((a) => !a.r.ok).map((a) => a.id)
    if (!failed.length) return { ok: true, message: '', failed }
    if (ids.length === 1) return { ok: false, message: answers[0].r.message || REQUESTED_FOR_NOT_ELIGIBLE, failed }
    const labels = failed.map((id) => names[id] || 'an item').join(', ')
    return { ok: false, message: `This person isn't eligible for: ${labels}.`, failed }
}

/** Which order buttons an item allows (sc_cat_item no_cart / no_cart_v2 / no_order_now / no_order / no_save_as_draft). */
export async function fetchItemOrderOptions(itemId: string): Promise<ItemOrderOptions> {
    try {
        const r = await scRest('GET', `/api/now/table/sc_cat_item/${encodeURIComponent(itemId)}?sysparm_fields=no_cart,no_cart_v2,no_order_now,no_order,no_save_as_draft,sys_class_name`)
        if (!r) return { addToCart: true, orderNow: true, saveAsDraft: true, known: false }
        const noOrder = truthy(r.no_order)
        return {
            addToCart: !noOrder && !truthy(r.no_cart) && !truthy(r.no_cart_v2),
            orderNow: !noOrder && !truthy(r.no_order_now),
            saveAsDraft: !truthy(r.no_save_as_draft),
            known: true,
        }
    } catch (e) {
        // No read access to the item record: offer both, the platform still enforces its rules.
        return { addToCart: true, orderNow: true, saveAsDraft: true, known: false }
    }
}

// ---- hooks ---------------------------------------------------------------------------------------

/**
 * The current user's cart. `live`: also watch its sc_cart_item rows over AMB (changes from another
 * tab or the classic UI refetch it). Mount `live` once per page, e.g. in the header cart button.
 */
export function useCart(options: { enabled?: boolean; live?: boolean } = {}) {
    const qc = useQueryClient()
    const query = useQuery<CartData>({
        queryKey: CART_KEY,
        queryFn: fetchCart,
        enabled: options.enabled !== false,
        staleTime: 30_000,
    })
    const cartId = query.data ? query.data.cartId : ''
    useRecordWatch('sc_cart_item', cartId ? 'cart=' + cartId : 'sys_id=-1', () => qc.invalidateQueries({ queryKey: CART_KEY }), {
        enabled: !!options.live && !!cartId,
        invalidate: false,
        debounceMs: 400,
    })
    return query
}

/** Number of lines in the cart (0 while loading). */
export function useCartCount(options: { live?: boolean } = {}): number {
    const cart = useCart(options)
    return cart.data ? cart.data.count : 0
}

export function useAddToCart() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: addToCart,
        onSettled: () => qc.invalidateQueries({ queryKey: CART_KEY }),
    })
}

/** Change a line's quantity. The platform answers the updated cart, which replaces the cache. */
export function useUpdateCartItem() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: updateCartItem,
        onSuccess: (cart: CartData) => qc.setQueryData(CART_KEY, cart),
        onError: () => qc.invalidateQueries({ queryKey: CART_KEY }),
    })
}

/** Remove a line (optimistic: it leaves the cache at once, and comes back if the call fails). */
export function useRemoveCartItem() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: removeCartItem,
        onMutate: async (lineId: string) => {
            await qc.cancelQueries({ queryKey: CART_KEY })
            const previous = qc.getQueryData<CartData>(CART_KEY)
            if (previous) {
                const lines = previous.lines.filter((l) => l.id !== lineId)
                qc.setQueryData(CART_KEY, { ...previous, lines, count: lines.length, totalQuantity: lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0) })
            }
            return { previous }
        },
        onError: (_e: unknown, _id: string, ctx: any) => ctx && ctx.previous && qc.setQueryData(CART_KEY, ctx.previous),
        onSettled: () => qc.invalidateQueries({ queryKey: CART_KEY }),
    })
}

export function useEmptyCart() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: emptyCart,
        onSettled: () => qc.invalidateQueries({ queryKey: CART_KEY }),
    })
}

/**
 * Checkout: `checkout()` (one-step orders; two-step answers kind 'review'), then `submit()` for a
 * reviewed order. The cart refetches after either (an ordered cart is empty).
 */
export function useCheckout() {
    const qc = useQueryClient()
    const refresh = () => {
        qc.invalidateQueries({ queryKey: CART_KEY })
        // An ordered cart is replaced by a new one: drop the old cart's requested-for (a refetch would 404).
        qc.removeQueries({ queryKey: ['rp-catalog', 'cart-requested-for'] })
    }
    const checkout = useMutation({ mutationFn: checkoutCart, onSettled: refresh })
    const submit = useMutation({ mutationFn: submitCartOrder, onSettled: refresh })
    return { checkout, submit, pending: checkout.isPending || submit.isPending }
}

export function useCartRequestedFor(cartId: string | undefined) {
    return useQuery({
        queryKey: ['rp-catalog', 'cart-requested-for', cartId || ''],
        queryFn: () => fetchCartRequestedFor(cartId as string),
        enabled: !!cartId,
        staleTime: 30_000,
    })
}

export function useSetCartRequestedFor() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (args: { cartId: string; userId: string; displayValue?: string }) => setCartRequestedFor(args.cartId, args.userId),
        onSuccess: (_r: unknown, args: { cartId: string; userId: string; displayValue?: string }) =>
            qc.setQueryData(['rp-catalog', 'cart-requested-for', args.cartId], (old: any) => ({ ...(old || {}), value: args.userId, displayValue: args.displayValue || (old && old.displayValue) || '' })),
        onSettled: (_r: unknown, _e: unknown, args: { cartId: string }) => qc.invalidateQueries({ queryKey: ['rp-catalog', 'cart-requested-for', args.cartId] }),
    })
}

/** Which order buttons the item allows (cached per item). */
export function useItemOrderOptions(itemId: string | undefined, options: { enabled?: boolean } = {}) {
    return useQuery<ItemOrderOptions>({
        queryKey: ['rp-catalog', 'order-options', itemId || ''],
        queryFn: () => fetchItemOrderOptions(itemId as string),
        enabled: !!itemId && options.enabled !== false,
        staleTime: 10 * 60_000,
    })
}
