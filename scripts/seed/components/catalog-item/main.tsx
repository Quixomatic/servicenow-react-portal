import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePortal, usePortalLocation, useNavigate, useRecord, useEntryTitle, Link, toast } from '@portal/runtime';
import { useQueryClient } from 'utilities:react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card';
import { Button } from 'components:button';
import {
    useCatalogItem,
    useItemPrice,
    submitCatalogItem,
    useAddToCart,
    useItemOrderOptions,
    setCartRequestedFor,
    fetchCartRequestedFor,
    cartErrorMessage,
} from 'utilities:app/catalog';
import type { CatalogItem as CatalogItemData, SubmitResult } from 'utilities:app/catalog';
import { useCatalogForm, CatalogFormProvider, sanitizeHtml } from 'components:app/variable';
import { useClientScripts } from 'utilities:app/gform';
import { DialogOutlet } from 'components:app/confirm-dialog';
import type { CatalogForm, VariableSpec } from 'components:app/variable';
import { VariableLayout } from 'components:app/variable-container';
import { cx, Spinner, IconAlert, IconCheck, useFormMeta, controlClass } from 'components:app/field';
import { Select } from 'components:app/combobox';
import { RequestedForField, useRequestedFor } from 'components:app/requested-for-field';
import type { FieldLayout } from 'components:app/field';

/**
 * components:app/catalog-item: a catalog item or record producer, end to end.
 *
 * One GraphQL request loads the item (header, pricing, variables, layout, defaults); variables
 * render through app/variable-container on the shared field primitives; price follows variables
 * with price implications; Order now / Submit runs client validation (with an error summary that
 * links to each field), then the platform's own submit (order_now / submit_producer), and shows
 * the created request or record with a link.
 *
 * Requested for (items, not producers): a "Requested for" picker defaults to the current user and
 * is delegation-checked (app/requested-for-field); its value is the order's requested_for. Items
 * with a Requested For variable (type 31) use that variable instead, as the platform does.
 * `requestedFor: 'hidden'` turns the item-level picker off.
 *
 * Add to cart (items, beside Order now): the same validation, onSubmit scripts and variables, then
 * the platform's add_to_cart; a toast offers "View cart" (option `cartPage`, default 'cart') and the
 * form starts over with a fresh draft. The item's own settings hide either button (no_cart /
 * no_cart_v2 → no Add to cart, no_order_now → no Order now, no_order → neither); option
 * `cart: false` hides Add to cart everywhere. The first line in an empty cart sets the cart's
 * requested for to the item-level person.
 *
 * Success lives in the URL (James's decision 2): after Order now / Submit the widget replaces its history
 * entry with the same page plus q `ordered=<sys_id>` (and `ordered_table=<table>` unless it's sc_request),
 * so a reload, or Back from the request opened here, shows the confirmation again rather than a blank
 * form. The created record opens on the portal's `recordPage` (default 'form') when the portal has it.
 *
 * Widget options: { itemId, table, fieldLayout, requestedFor, cart, cartPage, recordPage } (or the page query: ?item=<sys_id>).
 * Also exported as <CatalogItem itemId /> for other widgets.
 */
export type CatalogItemProps = {
    itemId: string;
    table?: string;
    fieldLayout?: FieldLayout;
    renderCustom?: (spec: VariableSpec) => any;
    onSubmitted?: (result: SubmitResult) => void;
    /** Link for the created record (default: the platform form). */
    recordHref?: (table: string, sysId: string) => string;
    /** Item-level requested-for picker: 'auto' (default: unless the item has a Requested For variable) or 'hidden'. */
    requestedFor?: 'auto' | 'hidden';
    /** Offer Add to cart (default true; the item's own no_cart settings still apply). */
    cart?: boolean;
    /** Portal page of the cart, for the "View cart" toast action ('' = no action). Default 'cart'. */
    cartPage?: string;
};

type Props = {
    options?: {
        itemId?: string;
        table?: string;
        fieldLayout?: FieldLayout;
        requestedFor?: 'auto' | 'hidden';
        cart?: boolean;
        cartPage?: string;
        /** Portal page that opens the created record (gets table + sys_id); '' = the platform form. Default 'form'. */
        recordPage?: string;
    };
};

export default function CatalogItemWidget({ options = {} }: Props) {
    const location = usePortalLocation() as any;
    // q keys + explicit URL params (location.query is the encoded-query param now).
    const query = (location && (location.params || location.qParams)) || {};
    const itemId = String(query.item || options.itemId || '');
    const table = String(query.table || options.table || 'sc_cat_item');
    const navigate = useNavigate();
    const portal = usePortal() as any;
    const qParams: Record<string, any> = (location && location.qParams) || {};
    // The success state, from the URL.
    const orderedId = String(qParams.ordered || '');
    const orderedTable = String(qParams.ordered_table || '') || 'sc_request';
    const recordPage = useMemo(() => {
        const target = options.recordPage === undefined ? 'form' : options.recordPage;
        if (!target) return '';
        const pages: any[] = (portal && portal.pages) || [];
        return pages.some((p) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(target) >= 0) ? target : '';
    }, [portal && portal.pages, options.recordPage]);
    /** The same page with these q changes (other q keys and the record params kept), as a replace. */
    const goSelf = (changes: Record<string, string>, title?: string) => {
        const q: Record<string, string> = {};
        Object.keys(qParams).forEach((k) => {
            if (['table', 'sys_id', 'view', 'query'].indexOf(k) < 0) q[k] = String(qParams[k]);
        });
        Object.keys(changes).forEach((k) => {
            if (changes[k]) q[k] = changes[k];
            else delete q[k];
        });
        navigate(String((location && location.page) || ''), {
            q,
            table: location && location.table ? location.table : undefined,
            replace: true,
            title,
        } as any);
    };
    if (!itemId)
        return (
            <Card>
                <CardContent className="text-sm text-muted-foreground">Choose a catalog item.</CardContent>
            </Card>
        );
    return (
        <CatalogItem
            key={itemId}
            itemId={itemId}
            table={table}
            fieldLayout={options.fieldLayout}
            requestedFor={options.requestedFor}
            cart={options.cart}
            cartPage={options.cartPage}
            ordered={orderedId ? { table: orderedTable, sysId: orderedId } : null}
            recordPage={recordPage}
            onSubmitted={(r) =>
                // The form entry becomes the success entry (replace): Back from here leaves the item.
                goSelf(
                    {
                        ordered: r.sysId,
                        ordered_table: r.table && r.table !== 'sc_request' ? r.table : '',
                    },
                    r.number ? `Submitted ${r.number}` : 'Submitted'
                )
            }
            onAgain={() => goSelf({ ordered: '', ordered_table: '' })}
        />
    );
}

type RoundProps = CatalogItemProps & {
    /** A submission shown from the URL (q ordered=…); the widget owns the URL. */
    ordered?: { table: string; sysId: string } | null;
    /** Portal page for the created record (an in-portal link instead of the platform form). */
    recordPage?: string;
    /** "Start another" when the success state comes from the URL. */
    onAgain?: () => void;
};

export function CatalogItem(props: RoundProps) {
    const [round, setRound] = useState(0);
    return <CatalogItemRound key={round} {...props} onRestart={() => setRound((r) => r + 1)} />;
}

function CatalogItemRound(props: RoundProps & { onRestart: () => void }) {
    const qc = useQueryClient();
    const item = useCatalogItem(props.itemId, props.table || 'sc_cat_item');
    const form = useCatalogForm(item.data, props.table || 'sc_cat_item');
    const [result, setResult] = useState<SubmitResult | null>(null);
    const restart = () => {
        // A new round gets a fresh draft record from the platform.
        qc.removeQueries({ queryKey: ['rp-catalog', 'item', props.table || 'sc_cat_item', props.itemId] });
        props.onRestart();
    };
    if (item.isLoading)
        return (
            <Card aria-busy="true">
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner label="Loading the item" /> Loading the item…
                </CardContent>
            </Card>
        );
    if (item.error || !item.data || !form)
        return (
            <Card>
                <CardContent role="alert" className="text-sm text-destructive">
                    {(item.error as Error | null)?.message || 'This item is not available.'}
                </CardContent>
            </Card>
        );
    if (props.ordered)
        return (
            <SubmittedFromUrl
                item={item.data}
                ordered={props.ordered}
                recordPage={props.recordPage}
                href={props.recordHref}
                onAgain={() => {
                    if (props.onAgain) props.onAgain();
                    restart();
                }}
            />
        );
    if (result)
        return (
            <Submitted
                item={item.data}
                result={result}
                href={props.recordHref}
                recordPage={props.recordPage}
                onAgain={restart}
            />
        );
    return (
        <CatalogFormProvider form={form}>
            {/* g_modal dialogs from catalog client scripts. */}
            <DialogOutlet />
            <ItemForm
                item={item.data}
                form={form}
                fieldLayout={props.fieldLayout}
                renderCustom={props.renderCustom}
                requestedFor={props.requestedFor}
                cart={props.cart}
                cartPage={props.cartPage}
                onAdded={restart}
                onSubmitted={(r) => {
                    setResult(r);
                    if (props.onSubmitted) props.onSubmitted(r);
                }}
            />
        </CatalogFormProvider>
    );
}

function usePriceVariables(form: CatalogForm): Record<string, string> {
    const key = useSyncExternalStore(
        form.subscribe,
        () => JSON.stringify(form.priceAffecting.map((n) => form.getValue(n))),
        () => ''
    );
    return useMemo(() => (form.priceAffecting.length ? form.serializeVariables() : {}), [key, form]);
}

function actionLabel(item: CatalogItemData) {
    if (item.type === 'record_producer') return 'Submit';
    if (item.requestMethod === 'request') return 'Request';
    if (item.requestMethod === 'submit') return 'Submit';
    return 'Order now';
}

function ItemForm(props: {
    item: CatalogItemData;
    form: CatalogForm;
    fieldLayout?: FieldLayout;
    renderCustom?: (s: VariableSpec) => any;
    requestedFor?: 'auto' | 'hidden';
    cart?: boolean;
    cartPage?: string;
    onAdded: () => void;
    onSubmitted: (r: SubmitResult) => void;
}) {
    const { item, form } = props;
    const isProducer = item.type === 'record_producer';
    // The platform's item-level "Requested for": a Requested For variable, if the item has one, IS it.
    const hasRequestedForVariable = form.specs.some((s) => !!s.meta && s.meta.internalType === 'requested_for');
    const showRequestedFor = !isProducer && props.requestedFor !== 'hidden' && !hasRequestedForVariable;
    const requestedFor = useRequestedFor({ itemId: item.sysId });
    const [quantity, setQuantity] = useState(item.quantity[0] ? item.quantity[0].value : '1');
    const [errors, setErrors] = useState<{ name: string; label: string; message: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [failure, setFailure] = useState('');
    const navigate = useNavigate();
    const addToCart = useAddToCart();
    const orderOptions = useItemOrderOptions(isProducer ? undefined : item.sysId);
    // Add to cart only once the item's settings are known (no button that appears and vanishes).
    const canAddToCart = !isProducer && props.cart !== false && !!orderOptions.data && orderOptions.data.addToCart;
    const canOrderNow = isProducer || !orderOptions.data || orderOptions.data.orderNow;
    const busy = submitting || addToCart.isPending;
    const root = useRef<HTMLDivElement | null>(null);
    const summary = useRef<HTMLDivElement | null>(null);
    const priceVars = usePriceVariables(form);
    const formMeta = useFormMeta(form);
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
    });
    const showPrices = !!(item.pricing && item.pricing.showPrices) && !isProducer;
    const price = useItemPrice(
        item.sysId,
        priceVars,
        quantity,
        showPrices && (form.priceAffecting.length > 0 || quantity !== '1')
    );
    const displayPrice = price.data
        ? price.data.price
        : item.pricing && item.pricing.price
          ? item.pricing.displayPrice
          : '';
    const recurring = price.data
        ? price.data.recurringPrice
        : item.pricing && item.pricing.recurringPrice
          ? `${item.pricing.recurringDisplayPrice} ${item.pricing.recurringFrequencyDisplay || ''}`.trim()
          : '';
    const picture = item.picture ? `/${item.picture}` : '';

    const focusField = (name: string) => {
        const el =
            root.current &&
            (root.current.querySelector(
                `[data-rpf-field="${name}"] input, [data-rpf-field="${name}"] textarea, [data-rpf-field="${name}"] [role=combobox], [data-rpf-field="${name}"] button, [data-rpf-field="${name}"] [tabindex]`
            ) as HTMLElement | null);
        if (el) el.focus();
    };
    /** Client validation, the error summary and onSubmit scripts: true when the order may go ahead. */
    const ready = (action: string) => {
        setFailure('');
        const r = form.validate();
        if (showRequestedFor && !requestedFor.valid)
            r.errors.unshift({
                name: 'rp_requested_for',
                label: 'Requested for',
                message: requestedFor.pending
                    ? 'Requested for: still checking who you can request for'
                    : 'Requested for is required',
            });
        if (!r.valid || r.errors.length) {
            setErrors(r.errors);
            setTimeout(() => summary.current && summary.current.focus(), 0);
            return false;
        }
        // onSubmit catalog client scripts can veto the order (return false).
        if (scripts.env && !scripts.env.runOnSubmit(action)) return false;
        setErrors([]);
        return true;
    };
    const submit = async () => {
        if (!ready('order_now')) return;
        setSubmitting(true);
        try {
            const res = await submitCatalogItem({
                itemId: item.sysId,
                kind: isProducer ? 'submit_producer' : 'order_now',
                variables: form.serializeVariables(),
                quantity,
                requestedFor: showRequestedFor ? requestedFor.value : undefined,
                itemGuid: item.targetRecordSysId,
            });
            props.onSubmitted(res);
        } catch (e) {
            setFailure((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };
    const add = async () => {
        if (!ready('add_to_cart')) return;
        const person = showRequestedFor ? requestedFor.value : '';
        try {
            const res = await addToCart.mutateAsync({
                itemId: item.sysId,
                variables: form.serializeVariables(),
                quantity,
                requestedFor: person || undefined,
                itemGuid: item.targetRecordSysId,
            });
            // The cart's requested for: the first line sets it; later lines keep the cart's (it is changed on the cart page).
            let note = '';
            if (person && res.cartId) {
                if (res.items.length <= 1) await setCartRequestedFor(res.cartId, person).catch(() => undefined);
                else {
                    const current = await fetchCartRequestedFor(res.cartId).catch(() => null);
                    if (current && current.value && current.value !== person)
                        note = `Your cart is requested for ${current.displayValue || 'someone else'}. Change it on the cart page.`;
                }
            }
            const cartPage = props.cartPage === undefined ? 'cart' : props.cartPage;
            toast.success(`${item.name} added to your cart`, {
                description: note || (quantity !== '1' ? `Quantity ${quantity}` : undefined),
                action: cartPage ? { label: 'View cart', onClick: () => navigate(cartPage) } : undefined,
            });
            props.onAdded();
        } catch (e) {
            setFailure(cartErrorMessage(e));
        }
    };

    return (
        <Card ref={root} data-rp-catalog-item={item.sysId}>
            <CardHeader>
                <div className="flex items-start gap-4">
                    {picture ? (
                        <img
                            src={picture}
                            alt=""
                            className="size-14 shrink-0 rounded-md border border-border object-contain"
                        />
                    ) : null}
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
                                    Subtotal ×{quantity}:{' '}
                                    <span className="font-medium text-foreground tabular-nums">
                                        {price.data.subtotal}
                                    </span>
                                    {price.data.recurringSubtotal ? ` + ${price.data.recurringSubtotal}` : ''}
                                </div>
                            ) : null}
                            {price.isFetching ? (
                                <Spinner className="text-muted-foreground" label="Updating price" />
                            ) : null}
                        </div>
                    ) : null}
                </div>
                {item.description ? (
                    <div
                        className="rpv-rich mt-3 text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
                    />
                ) : null}
            </CardHeader>
            <CardContent>
                <form
                    noValidate
                    onSubmit={(e: any) => {
                        e.preventDefault();
                        submit();
                    }}
                    className="flex flex-col gap-6"
                >
                    {errors.length ? (
                        <div
                            ref={summary}
                            tabIndex={-1}
                            role="alert"
                            className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30"
                            data-rp-error-summary=""
                        >
                            <p className="flex items-center gap-2 font-medium text-destructive">
                                <IconAlert size={16} /> Fix {errors.length} field{errors.length === 1 ? '' : 's'} to
                                continue
                            </p>
                            <ul className="mt-2 ml-6 list-disc">
                                {errors.map((e) => (
                                    <li key={e.name + e.message}>
                                        <button
                                            type="button"
                                            className="text-left text-destructive underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                                            onClick={() => focusField(e.name)}
                                        >
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
                                    className={cx(
                                        'rpv-rich rounded-md border p-3 text-sm [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
                                        m.kind === 'error'
                                            ? 'border-destructive/50 bg-destructive/5 text-destructive'
                                            : 'border-border bg-muted/50 text-foreground'
                                    )}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text) }}
                                />
                            ))}
                        </div>
                    ) : null}
                    {showRequestedFor ? (
                        <div className="max-w-md" data-rpf-field="rp_requested_for" data-rp-item-requested-for="">
                            <RequestedForField
                                name="requested_for"
                                table="sc_request"
                                label="Requested for"
                                hint="Who this request is for"
                                readOnly={false}
                                mandatory
                                standalone
                                layout={props.fieldLayout}
                                {...requestedFor.fieldProps}
                            />
                        </div>
                    ) : null}
                    <VariableLayout fieldLayout={props.fieldLayout} renderCustom={props.renderCustom} />
                    {item.mandatoryAttachment ? (
                        <p className="text-sm text-muted-foreground">
                            This item requires an attachment on the request; add it from the platform after submitting.
                        </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                        {failure ? (
                            <p role="alert" className="mr-auto text-sm text-destructive">
                                {failure}
                            </p>
                        ) : null}
                        {!isProducer && !item.hideQuantity && item.quantity.length ? (
                            <div className="flex items-center gap-2 text-sm" data-rp-quantity="">
                                <span id={`rp-qty-${item.sysId}`}>Quantity</span>
                                <div className={controlClass({ className: 'w-auto min-w-20 pl-1' })}>
                                    <Select
                                        variant="inline"
                                        aria-labelledby={`rp-qty-${item.sysId}`}
                                        value={quantity}
                                        items={item.quantity.map((q) => ({
                                            value: String(q.value),
                                            label: String(q.label),
                                        }))}
                                        popupMinWidth={96}
                                        renderValue={(i) => <span className="tabular-nums">{i.label}</span>}
                                        onChange={(i) => setQuantity(i.value)}
                                    />
                                </div>
                            </div>
                        ) : null}
                        {canAddToCart ? (
                            <Button
                                type="button"
                                variant={canOrderNow ? 'outline' : 'default'}
                                disabled={busy}
                                data-rp-add-to-cart=""
                                onClick={add}
                            >
                                {addToCart.isPending ? <Spinner label="Adding to cart" /> : null}
                                Add to cart
                            </Button>
                        ) : null}
                        {canOrderNow ? (
                            <Button type="button" disabled={busy} data-rp-submit="" onClick={submit}>
                                {submitting ? <Spinner label="Submitting" /> : null}
                                {actionLabel(item)}
                            </Button>
                        ) : null}
                        {!canOrderNow && !canAddToCart && orderOptions.data ? (
                            <p className="text-sm text-muted-foreground">This item can't be ordered here.</p>
                        ) : null}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

/** The success view for a submission named in the URL: fetches its number. */
function SubmittedFromUrl(props: {
    item: CatalogItemData;
    ordered: { table: string; sysId: string };
    recordPage?: string;
    href?: (table: string, sysId: string) => string;
    onAgain: () => void;
}) {
    const rec = useRecord(props.ordered.table, props.ordered.sysId, { fields: ['number'] }) as any;
    const number = rec.data && rec.data.number ? String(rec.data.number) : '';
    useEntryTitle(number ? `Submitted ${number}` : '');
    return (
        <Submitted
            item={props.item}
            result={{ table: props.ordered.table, sysId: props.ordered.sysId, number, raw: {} }}
            href={props.href}
            recordPage={props.recordPage}
            onAgain={props.onAgain}
        />
    );
}

function Submitted(props: {
    item: CatalogItemData;
    result: SubmitResult;
    href?: (table: string, sysId: string) => string;
    recordPage?: string;
    onAgain: () => void;
}) {
    const { result } = props;
    const table = result.table || (props.item.type === 'record_producer' ? '' : 'sc_request');
    const label = result.number || result.sysId;
    // In-portal: the record opens on the portal's record page (Back returns here).
    const inPortal = !props.href && !!props.recordPage && !!table && !!result.sysId;
    const link =
        result.sysId && table
            ? props.href
                ? props.href(table, result.sysId)
                : `/${table}.do?sys_id=${encodeURIComponent(result.sysId)}`
            : '';
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
                    {inPortal ? (
                        <Link
                            to={props.recordPage}
                            table={table}
                            sysId={result.sysId}
                            title={label}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {label}
                        </Link>
                    ) : link ? (
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
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
    );
}
