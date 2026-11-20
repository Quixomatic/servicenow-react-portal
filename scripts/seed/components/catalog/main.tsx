/**
 * utilities:app/catalog: Service Catalog data for app/variable, app/mrvs, app/catalog-item and
 * app/variable-editor.
 *
 * Fetchers: fetchCatalogItem, fetchItemPrice, submitCatalogItem, fetchMrvsRowForm (row form +
 *           the set's client scripts / UI policies), validateVariableRegex, canRequestFor /
 *           checkDelegation, uploadVariableAttachment, fetchVariableEditor, saveRecordVariables
 *           (see api.ts for the platform call behind each); spClientScripts / spPolicy normalise
 *           Service Portal model scripts and policies.
 * Hooks:    useCatalogItem(sysId, table?)   cached per item (a fresh draft record each mount)
 *           useItemPrice(itemId, variables, quantity, enabled)   debounced, keyed by values
 *           useMrvsRowForm(setId, itemId, sourceTable?, enabled?)
 *           useVariableEditor(table, sysId)  a record's variables (Workspace's variable editor data)
 *           useCanRequestFor(itemId, userId)  delegation check, cached per item + user
 * Cart:     (cart.ts) fetchCart, addToCart, updateCartItem, removeCartItem, emptyCart, checkoutCart,
 *           submitCartOrder, fetchCartRequestedFor / setCartRequestedFor, canRequestForAll,
 *           fetchItemOrderOptions, cartErrorMessage; hooks useCart({ live }), useCartCount,
 *           useAddToCart, useUpdateCartItem, useRemoveCartItem, useEmptyCart, useCheckout,
 *           useCartRequestedFor, useSetCartRequestedFor, useItemOrderOptions (all share CART_KEY).
 */
import { useQuery, keepPreviousData } from 'utilities:react-query';
import { useDebouncedValue, stableChanges } from 'utilities:app/graphql';
import { fetchCatalogItem, fetchItemPrice, fetchMrvsRowForm, fetchVariableEditor, canRequestFor } from './api';
import type { CatalogItem, DelegationResult, MrvsRowForm, PriceResult, VariableEditorData } from './types';

export {
    ITEM_LAYOUT_QUERY,
    VARIABLE_EDITOR_QUERY,
    REQUESTED_FOR_NOT_ELIGIBLE,
    fetchCatalogItem,
    fetchItemPrice,
    submitCatalogItem,
    fetchMrvsRowForm,
    fetchVariableEditor,
    saveRecordVariables,
    validateVariableRegex,
    canRequestFor,
    checkDelegation,
    uploadVariableAttachment,
    spClientScripts,
    spPolicy,
} from './api';
// Cart and checkout (cart.ts): the platform's Service Catalog cart REST calls and their hooks.
export {
    CART_KEY,
    CartError,
    cartErrorMessage,
    parseCart,
    fetchCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    emptyCart,
    checkoutCart,
    submitCartOrder,
    fetchCartRequestedFor,
    setCartRequestedFor,
    canRequestForAll,
    fetchItemOrderOptions,
    useCart,
    useCartCount,
    useAddToCart,
    useUpdateCartItem,
    useRemoveCartItem,
    useEmptyCart,
    useCheckout,
    useCartRequestedFor,
    useSetCartRequestedFor,
    useItemOrderOptions,
} from './cart';
export type { CartData, CartLine, CartVariable, CheckoutResult, ItemOrderOptions } from './cart';
export type {
    CatalogItem,
    CatalogVariable,
    CatalogLayoutNode,
    PriceResult,
    SubmitResult,
    MrvsRowField,
    MrvsRowForm,
    VariableEditorData,
    DelegationResult,
} from './types';

export function useCatalogItem(sysId: string | undefined, table = 'sc_cat_item') {
    return useQuery<CatalogItem>({
        queryKey: ['rp-catalog', 'item', table, sysId || ''],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCatalogItem(sysId as string, table, signal),
        enabled: !!sysId,
        // Each load reserves a draft record for attachments: keep the one we have.
        staleTime: Infinity,
        gcTime: 5 * 60_000,
        refetchOnMount: false,
    });
}

export function useItemPrice(
    itemId: string | undefined,
    variables: Record<string, string>,
    quantity: string,
    enabled: boolean
) {
    const key = useDebouncedValue(stableChanges(variables) + '|' + quantity, 400);
    return useQuery<PriceResult>({
        queryKey: ['rp-catalog', 'price', itemId || '', key],
        queryFn: () => {
            const [vars, qty] = [
                JSON.parse(key.slice(0, key.lastIndexOf('|')) || '{}'),
                key.slice(key.lastIndexOf('|') + 1),
            ];
            return fetchItemPrice(itemId as string, vars, qty);
        },
        enabled: !!itemId && enabled,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    });
}

export function useMrvsRowForm(
    setId: string | undefined,
    itemId: string | undefined,
    sourceTable = 'sc_cat_item',
    enabled = true
) {
    return useQuery<MrvsRowForm>({
        queryKey: ['rp-catalog', 'mrvs-row', setId || '', itemId || ''],
        queryFn: () => fetchMrvsRowForm({ setId: setId as string, itemId: itemId as string, sourceTable }),
        enabled: !!setId && !!itemId && enabled,
        staleTime: 10 * 60_000,
    });
}

/** A record's catalog variables (sc_req_item, a record producer's target, …). Refetch after a save. */
export function useVariableEditor(
    table: string | undefined,
    sysId: string | undefined,
    options: { enabled?: boolean } = {}
) {
    return useQuery<VariableEditorData>({
        queryKey: ['rp-catalog', 'variable-editor', table || '', sysId || ''],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchVariableEditor(table as string, sysId as string, signal),
        enabled: !!table && !!sysId && sysId !== '-1' && options.enabled !== false,
        staleTime: 30_000,
    });
}

/** Delegation check for (item, user), cached: { ok, message } once answered. */
export function useCanRequestFor(
    itemId: string | undefined,
    userId: string | undefined,
    options: { enabled?: boolean } = {}
) {
    return useQuery<DelegationResult>({
        queryKey: ['rp-catalog', 'delegation', itemId || '', userId || ''],
        queryFn: () => canRequestFor(itemId as string, userId as string),
        enabled: !!itemId && !!userId && options.enabled !== false,
        staleTime: 5 * 60_000,
    });
}
