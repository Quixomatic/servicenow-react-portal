---
title: Cart and checkout
description: Add to cart, the cart widget, the header cart button and one-step (or two-step) checkout on the platform's Service Catalog cart API — utilities:app/catalog cart hooks, app/cart, app/cart-button.
section: Primitives and utilities
order: 4
tags: [catalog, cart, checkout, add-to-cart, requested-for, header-slots]
---

# Cart and checkout

The cart uses the platform's own **Service Catalog REST API** (`/api/sn_sc/servicecatalog/...`, backed by `sn_sc.CartJS`). It's the same cart as Service Portal and Employee Center, so a line added here shows in their carts and the other way round.

## Data: `utilities:app/catalog` (cart.ts)

| Fetcher | Platform call |
|---|---|
| `fetchCart()` | `GET /cart`: the user's default cart. The platform groups lines by recurring frequency (`none`, `yearly`, …); `parseCart` flattens them |
| `addToCart({ itemId, variables, quantity, requestedFor?, itemGuid? })` | `POST /items/{id}/add_to_cart`, with the same body as `order_now` |
| `updateCartItem({ lineId, quantity })` | Table API `PATCH sc_cart_item.quantity`, then `GET /cart`. This is what Service Portal's cart widget writes. The REST `PUT /cart/{cart_item_id}` **replaces** the line's variables with the body's, so a quantity-only PUT wipes them, multi-row set rows included |
| `removeCartItem(lineId)` | `DELETE /cart/{cart_item_id}` |
| `emptyCart(cartId)` | `DELETE /cart/{cart_id}/empty` |
| `checkoutCart()` | `POST /cart/checkout`. One-step orders the cart and answers `{ kind: 'ordered', requestId, requestNumber }`. With `glide.sc.checkout.twostep` the platform answers its summary instead: `{ kind: 'review' }` |
| `submitCartOrder()` | `POST /cart/submit_order`: places a reviewed order (two-step) |
| `fetchCartRequestedFor(cartId)` / `setCartRequestedFor(cartId, userId)` | Table API on `sc_cart.requested_for`, which is what `CartJS.setRequestedFor` writes. The REST API has no call for it |
| `canRequestForAll(itemIds, userId, names?)` | The delegation check for every item in the cart; the message names the items that fail |
| `fetchItemOrderOptions(itemId)` | Table API `sc_cat_item`: `no_cart` / `no_cart_v2` (hide Add to cart), `no_order_now`, `no_order` (hide both), `no_save_as_draft` |
| `cartErrorMessage(error)` | Turns platform errors into plain messages (empty cart, missing mandatory details, invalid quantity, security constraints, stale line, expired session, network) |

| Hook | What |
|---|---|
| `useCart({ live? })` | The cart (`CartData`: `lines`, `count`, `totalQuantity`, `subtotal`, `recurring`, `cartId`). `live` also watches the cart's `sc_cart_item` rows over AMB (`useRecordWatch`) |
| `useCartCount({ live? })` | Number of lines |
| `useAddToCart()`, `useUpdateCartItem()`, `useRemoveCartItem()` (optimistic), `useEmptyCart()` | Mutations; each refreshes the shared cart |
| `useCheckout()` | `{ checkout, submit, pending }` |
| `useCartRequestedFor(cartId)`, `useSetCartRequestedFor()` | The cart's requested for |
| `useItemOrderOptions(itemId)` | Which order buttons an item allows |

Every cart hook shares one query key (`CART_KEY`), so the header badge, the popover and the cart page change together after any mutation. Mount one `live` cart per page; the header button does.

## Add to cart (`app/catalog-item`)

- **Add to cart** sits beside Order now. It uses the same validation and error summary, and the same onSubmit catalog client scripts, which run with the action name `add_to_cart`. The variables are serialised the same way.
- On success, a toast offers **View cart** (option `cartPage`, default `cart`; `''` for no action). The form then starts over with a fresh draft record.
- **Item settings are honoured:**
  - `no_cart` or `no_cart_v2` hides Add to cart;
  - `no_order_now` hides Order now;
  - `no_order` hides both.

  Option `cart: false` hides Add to cart on every item. Record producers have no cart.
- **Requested for:** the first line added to an empty cart sets the cart's requested for to the item-level person. Later lines keep the cart's person, and the toast says so when it differs. The person is changed on the cart page.

## `components:app/cart` (widget)

- **Lines:**
  - picture, name (links back to the item on `catalogPage`) and short description;
  - the platform's own variable summary (`CartVariables`: the first three, then "Show all N details"; booleans show as Yes / No, multi-row sets as a row count);
  - delivery time;
  - quantity (our combobox Select, 1–10), remove, and the line price ("$X each" when the quantity is more than 1, plus any recurring price).
- **Totals:** the subtotal plus one line per recurring frequency.
- **Requested for:** `app/requested-for-field` given every item in the cart (`itemId` accepts a list). It runs the delegation check for each item, and saves an accepted pick on the cart. Checkout runs the check again in case lines have arrived since.
- **Empty cart** asks first (`app/confirm-dialog`).
- **Checkout:**
  - **One-step (default):** the order is placed, then a confirmation shows the request number. The number links to the `recordPage` (default `form`, the generic record form with `table=sc_request`); with `recordPage: ''` it links to the platform form.
  - **Review step:** with `glide.sc.checkout.twostep` (exposed to the portal in `settings.exposedProperties`) or option `review: 'always'`, Checkout becomes **Review order**. The lines become read-only, then **Place order**.
  - If the platform answers a checkout with a summary (two-step on, property not exposed), the review step shows and Place order calls `submit_order`.
- **Exports:** `Cart`, `CartLineItem`, `CartVariables`, `CartTotals`, `CheckoutDone`, `formatCartValue`.

Options: `title`, `catalogPage`, `recordPage`, `review` (`auto` | `always`).

## `components:app/cart-button` (widget)

The header cart icon:
- a count badge with the number of lines;
- a popover listing the first lines (quantity and price), the subtotal and **View cart**, or **Browse the catalog** when the cart is empty;
- count changes are announced politely to screen readers.

Placed portal-level in the `header` region, it renders into `app/app-header`'s **`header-actions`** [header slot](header-slots.md), beside the theme toggle. `placement: 'inline'` renders it where it's placed instead, for other headers. `<CartButton />` is exported for any toolbar.

Options: `cartPage`, `catalogPage`, `maxLines`, `live`, `placement`.

## Demo

The `sp` and `app` portals have a `cart` page and the header cart button. Add items from the `catalog` page.

## Not built

- **Save as draft:** the platform has `POST /items/{id}/save_catalog_item` (lines go to the `draft_items` cart), but there's no REST call to list or resume drafts. Building it needs a drafts list and editing an item from its cart line.
- **Editing a line's variables** (Service Portal's "edit=cart"), delivery address and special instructions.
- Wishlists and order guides (`.plans/backlog.md` G3).

## Related

- [Catalog variables](catalog-variables.md)
- [Header slots](header-slots.md)
- [Live updates](../runtime-api/live-updates.md)
