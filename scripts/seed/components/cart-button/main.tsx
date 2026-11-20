import { useEffect, useRef, useState } from 'react'
import { Link } from '@portal/runtime'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from 'components:popover'
import { HeaderSlot } from 'utilities:app/header-slots'
import { useCart } from 'utilities:app/catalog'
import type { CartData } from 'utilities:app/catalog'
import { Spinner } from 'components:app/field'

/**
 * components:app/cart-button: the header cart icon. A count badge (lines in the user's cart) and a
 * popover summary: the first lines with quantity and price, the subtotal, and View cart.
 *
 *   Widget (portal-level, region header): renders into app/app-header's "header-actions" slot
 *   (utilities:app/header-slots), so it sits beside the theme toggle in the shell's own bar. With no
 *   such slot (another header), option placement: 'inline' renders it where it's placed.
 *   <CartButton cartPage="cart" />   the button alone, for any header or toolbar.
 *
 * The count is live: every cart hook shares one query (utilities:app/catalog CART_KEY), so Add to
 * cart and the cart page update it at once, and the button watches the cart's sc_cart_item rows
 * over AMB (another tab, the classic UI). Count changes are announced politely.
 *
 * Options: { cartPage ('cart'), catalogPage ('catalog'), maxLines (4), live (true), placement ('slot' | 'inline') }.
 */
export type CartButtonProps = {
    /** Portal page of the full cart (default 'cart'). */
    cartPage?: string
    /** Portal page offered when the cart is empty (default 'catalog'; '' = none). */
    catalogPage?: string
    /** Lines shown in the popover before "and N more" (default 4). */
    maxLines?: number
    /** Watch the cart over AMB (default true). Mount one live cart hook per page. */
    live?: boolean
    className?: string
}

type Options = { cartPage?: string; catalogPage?: string; maxLines?: number; live?: boolean; placement?: 'slot' | 'inline' }

export default function CartButtonWidget({ options = {} }: { options?: Options }) {
    const button = <CartButton cartPage={options.cartPage} catalogPage={options.catalogPage} maxLines={options.maxLines} live={options.live} />
    if (options.placement === 'inline') return button
    // In the shell's header bar; nothing (not a stray inline button) when the header has no slot.
    return (
        <HeaderSlot name="header-actions" fallback="none">
            {button}
        </HeaderSlot>
    )
}

const countLabel = (n: number) => `${n} item${n === 1 ? '' : 's'}`

export function CartButton(props: CartButtonProps) {
    const cartPage = props.cartPage || 'cart'
    const catalogPage = props.catalogPage === undefined ? 'catalog' : props.catalogPage
    const cart = useCart({ live: props.live !== false })
    const [open, setOpen] = useState(false)
    const count = cart.data ? cart.data.count : 0
    const announce = useCountAnnouncement(cart.data)
    return (
        <>
            <Popover open={open} onOpenChange={(o: boolean) => setOpen(o)}>
                <PopoverTrigger
                    render={<Button variant="ghost" size="icon-sm" className={'relative ' + (props.className || '')} />}
                    aria-label={cart.data ? `Cart, ${countLabel(count)}` : 'Cart'}
                    data-rp-cart-button=""
                >
                    <Icon name="shopping-cart" className="size-4" />
                    {count > 0 ? (
                        <span
                            aria-hidden="true"
                            data-rp-cart-count={count}
                            className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background"
                        >
                            {count > 99 ? '99+' : count}
                        </span>
                    ) : null}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] gap-0 p-0" data-rp-cart-popover="">
                    <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                        <PopoverTitle className="text-sm">Cart</PopoverTitle>
                        <span className="text-xs text-muted-foreground">{cart.data ? countLabel(count) : ''}</span>
                    </div>
                    <CartSummaryBody cart={cart.data} loading={cart.isLoading} error={cart.error as Error | null} maxLines={props.maxLines || 4} />
                    <div className="flex flex-col gap-2 border-t px-3 py-2.5">
                        {cart.data && cart.data.subtotal && cart.data.showSubtotal && count > 0 ? (
                            <div className="flex items-baseline justify-between text-sm">
                                <span className="text-muted-foreground">{cart.data.subtotalTitle}</span>
                                <span className="font-semibold tabular-nums">{cart.data.subtotal}</span>
                            </div>
                        ) : null}
                        {count > 0 || !catalogPage ? (
                            <Button size="sm" className="w-full" render={<Link to={cartPage} onClick={() => setOpen(false)} />} data-rp-view-cart="">
                                View cart
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" className="w-full" render={<Link to={catalogPage} onClick={() => setOpen(false)} />}>
                                Browse the catalog
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            <span role="status" aria-live="polite" className="sr-only">
                {announce}
            </span>
        </>
    )
}

/** "Cart: 3 items" after the count changes (not on first load). */
function useCountAnnouncement(data: CartData | undefined) {
    const last = useRef<number | null>(null)
    const [text, setText] = useState('')
    const count = data ? data.count : null
    useEffect(() => {
        if (count === null) return
        if (last.current !== null && last.current !== count) setText(`Cart: ${countLabel(count)}`)
        last.current = count
    }, [count])
    return text
}

function CartSummaryBody(props: { cart: CartData | undefined; loading: boolean; error: Error | null; maxLines: number }) {
    if (props.loading)
        return (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Spinner label="Loading your cart" /> Loading…
            </div>
        )
    if (props.error || !props.cart)
        return (
            <p role="alert" className="m-0 px-3 py-4 text-sm text-destructive">
                {(props.error && props.error.message) || "Your cart couldn't be loaded."}
            </p>
        )
    const lines = props.cart.lines
    if (!lines.length) return <p className="m-0 px-3 py-4 text-sm text-muted-foreground">Your cart is empty.</p>
    const shown = lines.slice(0, props.maxLines)
    return (
        <div className="px-3 py-2">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {shown.map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3 text-sm" data-rp-cart-popover-line={l.id}>
                        <div className="min-w-0">
                            <div className="truncate font-medium">{l.name}</div>
                            {l.showQuantity ? <div className="text-xs text-muted-foreground tabular-nums">Qty {l.quantity}</div> : null}
                        </div>
                        {l.showPrice && l.subtotal ? <div className="shrink-0 text-right tabular-nums">{l.subtotal}</div> : null}
                    </li>
                ))}
            </ul>
            {lines.length > shown.length ? <p className="m-0 mt-2 text-xs text-muted-foreground">and {lines.length - shown.length} more</p> : null}
        </div>
    )
}
