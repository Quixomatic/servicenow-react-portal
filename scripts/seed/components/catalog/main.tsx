/**
 * utilities:app/catalog: Service Catalog data for app/variable, app/mrvs and app/catalog-item.
 *
 * Fetchers: fetchCatalogItem, fetchItemPrice, submitCatalogItem, fetchMrvsRowForm,
 *           validateVariableRegex, checkDelegation, uploadVariableAttachment (see api.ts for the
 *           platform call behind each).
 * Hooks:    useCatalogItem(sysId, table?)   cached per item (a fresh draft record each mount)
 *           useItemPrice(itemId, variables, quantity, enabled)   debounced, keyed by values
 *           useMrvsRowForm(setId, itemId, row?)
 */
import { useQuery, keepPreviousData } from 'utilities:react-query'
import { useDebouncedValue, stableChanges } from 'utilities:app/graphql'
import { fetchCatalogItem, fetchItemPrice, fetchMrvsRowForm } from './api'
import type { CatalogItem, MrvsRowForm, PriceResult } from './types'

export {
    ITEM_LAYOUT_QUERY,
    fetchCatalogItem,
    fetchItemPrice,
    submitCatalogItem,
    fetchMrvsRowForm,
    validateVariableRegex,
    checkDelegation,
    uploadVariableAttachment,
} from './api'
export type { CatalogItem, CatalogVariable, CatalogLayoutNode, PriceResult, SubmitResult, MrvsRowField, MrvsRowForm } from './types'

export function useCatalogItem(sysId: string | undefined, table = 'sc_cat_item') {
    return useQuery<CatalogItem>({
        queryKey: ['rp-catalog', 'item', table, sysId || ''],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCatalogItem(sysId as string, table, signal),
        enabled: !!sysId,
        // Each load reserves a draft record for attachments: keep the one we have.
        staleTime: Infinity,
        gcTime: 5 * 60_000,
        refetchOnMount: false,
    })
}

export function useItemPrice(itemId: string | undefined, variables: Record<string, string>, quantity: string, enabled: boolean) {
    const key = useDebouncedValue(stableChanges(variables) + '|' + quantity, 400)
    return useQuery<PriceResult>({
        queryKey: ['rp-catalog', 'price', itemId || '', key],
        queryFn: () => {
            const [vars, qty] = [JSON.parse(key.slice(0, key.lastIndexOf('|')) || '{}'), key.slice(key.lastIndexOf('|') + 1)]
            return fetchItemPrice(itemId as string, vars, qty)
        },
        enabled: !!itemId && enabled,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    })
}

export function useMrvsRowForm(setId: string | undefined, itemId: string | undefined, sourceTable = 'sc_cat_item', enabled = true) {
    return useQuery<MrvsRowForm>({
        queryKey: ['rp-catalog', 'mrvs-row', setId || '', itemId || ''],
        queryFn: () => fetchMrvsRowForm({ setId: setId as string, itemId: itemId as string, sourceTable }),
        enabled: !!setId && !!itemId && enabled,
        staleTime: 10 * 60_000,
    })
}
