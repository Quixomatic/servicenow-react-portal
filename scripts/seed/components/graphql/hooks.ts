import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from 'utilities:react-query'
import { graphql } from './client'
import type { GraphQLOptions } from './client'
import { checkFormViews, fetchChoices, fetchDisplayValue, fetchFormBootstrap, fetchFormViews, fetchRecordValues, fetchTableMeta, searchReference, stableChanges } from './documents'
import type { Choice, FieldMeta, FormBootstrap, FormChanges, FormView, FormViewResolution, FieldValue, ReferenceSearchResult } from './types'

/** Query keys: everything this utility caches lives under ['rp-gql', …]. */
export const gqlKeys = {
    all: ['rp-gql'] as const,
    raw: (query: string, variables: unknown) => ['rp-gql', 'raw', query, variables] as const,
    tableMeta: (table: string) => ['rp-gql', 'table-meta', table] as const,
    form: (table: string, sysId: string, view: string, query = '') => (query ? (['rp-gql', 'form', table, sysId, view, query] as const) : (['rp-gql', 'form', table, sysId, view] as const)),
    formViews: (table: string) => ['rp-gql', 'form-views', table] as const,
    viewCheck: (table: string, names: string) => ['rp-gql', 'view-check', table, names] as const,
    choices: (table: string, field: string, sysId: string, changes: string) => ['rp-gql', 'choices', table, field, sysId, changes] as const,
    reference: (table: string, field: string, sysId: string, term: string, changes: string, limit: number) =>
        ['rp-gql', 'reference', table, field, sysId, term, changes, limit] as const,
    record: (table: string, sysId: string, fields: string) => ['rp-gql', 'record', table, sysId, fields] as const,
    display: (table: string, sysId: string, field: string) => ['rp-gql', 'display', table, sysId, field] as const,
}

const MINUTE = 60_000

export type UseGraphQLOptions<T, R = T> = GraphQLOptions & {
    enabled?: boolean
    staleTime?: number
    select?: (data: T) => R
    /** Keep showing the previous result while new variables load. */
    keepPrevious?: boolean
}

/** Any GraphQL document through the page's query cache. Keyed by document + variables. */
export function useGraphQL<T = any, R = T>(query: string, variables: Record<string, unknown> = {}, options: UseGraphQLOptions<T, R> = {}) {
    const { enabled = true, staleTime, select, keepPrevious, ...gqlOptions } = options
    return useQuery({
        queryKey: gqlKeys.raw(query, variables),
        queryFn: ({ signal }: { signal: AbortSignal }) => graphql<T>(query, variables, { ...gqlOptions, signal }),
        enabled,
        staleTime,
        select,
        placeholderData: keepPrevious ? keepPreviousData : undefined,
    })
}

/** Value that settles `ms` after its last change (search-as-you-type). */
export function useDebouncedValue<T>(value: T, ms = 200): T {
    const [settled, setSettled] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => setSettled(value), ms)
        return () => clearTimeout(id)
    }, [value, ms])
    return settled
}

/** Every column's metadata for a table (cached 10 minutes, shared by all fields of the table). */
export function useTableMeta(table: string | undefined, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: gqlKeys.tableMeta(table || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchTableMeta(table as string, signal),
        enabled: !!table && options.enabled !== false,
        staleTime: 10 * MINUTE,
        gcTime: 30 * MINUTE,
    })
}

/** One field's metadata (selected from the table's cached metadata). */
export function useFieldMeta(table: string | undefined, field: string | undefined, options: { enabled?: boolean } = {}) {
    const q = useTableMeta(table, { enabled: !!field && options.enabled !== false })
    const meta: FieldMeta | undefined = field && q.data ? q.data[field] : undefined
    return { meta, isLoading: q.isLoading, error: q.error as Error | null }
}

/** Form bootstrap (formLayout): values, display values, server states, metadata, encodedRecord. */
export function useFormBootstrap(table: string | undefined, sysId: string | undefined, options: { view?: string; enabled?: boolean; query?: string } & FormViewResolution = {}) {
    const view = options.view || ''
    const query = options.query || ''
    const isNew = !sysId || sysId === '-1'
    // View resolution (no forced view): the candidate list and the Workspace view-rule config are part
    // of the key; a forced view ignores both. useForm and useRecordForm must pass the same options.
    const views = view ? '' : options.views || ''
    const viewRuleConfigId = view ? '' : options.viewRuleConfigId || ''
    const viewKey = views || viewRuleConfigId ? `${view}|${views}|${viewRuleConfigId}` : view
    return useQuery<FormBootstrap>({
        queryKey: gqlKeys.form(table || '', sysId || '-1', viewKey, query),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchFormBootstrap(table as string, sysId || '-1', view, signal, query, { views, viewRuleConfigId }),
        enabled: !!table && options.enabled !== false,
        // A new record's bootstrap reserves a number: never refetch it behind the user's back
        // (no staleness, no mount / focus / reconnect refetch).
        staleTime: isNew ? Infinity : 30_000,
        refetchOnMount: isNew ? false : undefined,
        refetchOnWindowFocus: isNew ? false : undefined,
        refetchOnReconnect: isNew ? false : undefined,
        // …and forget it once unmounted: the next new record must reserve its own number.
        gcTime: isNew ? 0 : undefined,
    })
}

/**
 * The form views of a table (cached 10 minutes per table; loads no layout, reserves nothing).
 * The platform lists views only for an existing record: pass any sys_id of the table.
 */
export function useFormViews(table: string | undefined, sysId: string | undefined, options: { enabled?: boolean } = {}) {
    const real = !!sysId && sysId !== '-1'
    return useQuery<{ current: string; views: FormView[] }>({
        queryKey: gqlKeys.formViews(table || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchFormViews(table as string, sysId as string, signal),
        enabled: !!table && real && options.enabled !== false,
        staleTime: 10 * MINUTE,
    })
}

/**
 * Which of these view names exist for a table: { [name]: exists } (cached 10 minutes; one request;
 * no layout, reserves nothing, works for new records too). Default spellings ('', 'default',
 * 'Default view') always exist.
 */
export function useFormViewCheck(table: string | undefined, names: string[], options: { enabled?: boolean } = {}) {
    const list = Array.from(new Set(names.map((n) => String(n || '').trim()).filter(Boolean))).sort()
    return useQuery<Record<string, boolean>>({
        queryKey: gqlKeys.viewCheck(table || '', list.join(',')),
        queryFn: ({ signal }: { signal: AbortSignal }) => checkFormViews(table as string, list, signal),
        enabled: !!table && list.length > 0 && options.enabled !== false,
        staleTime: 10 * MINUTE,
    })
}

/**
 * Choices for a field.
 * - With `dependsOn` (or `serverEvaluated`), the server evaluates them against the unsaved values
 *   (choiceDataRetriever, keyed by the dependent value only, so typing elsewhere never refetches).
 * - Otherwise they come from cached table metadata, filtered by `dependentValue` locally.
 * `staticChoices` (explicit props) win over both.
 */
export function useChoices(args: {
    table?: string
    field?: string
    sysId?: string
    dependsOn?: string
    dependentValue?: string
    changes?: FormChanges
    encodedRecord?: string
    staticChoices?: Choice[]
    serverEvaluated?: boolean
    enabled?: boolean
}) {
    const { table, field, sysId = '-1', dependsOn, dependentValue, staticChoices, enabled = true } = args
    const server = !!(table && field && !staticChoices && (dependsOn || args.serverEvaluated))
    const relevant: FormChanges = useMemo(() => {
        if (!server) return {}
        if (dependsOn) return { [dependsOn]: dependentValue == null ? '' : String(dependentValue) }
        return args.changes || {}
    }, [server, dependsOn, dependentValue, args.changes])
    const changesKey = stableChanges(relevant)
    const meta = useFieldMeta(table, field, { enabled: enabled && !staticChoices && !server })
    const q = useQuery<Choice[]>({
        queryKey: gqlKeys.choices(table || '', field || '', sysId, changesKey),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchChoices({ table: table as string, field: field as string, sysId, changes: relevant, encodedRecord: args.encodedRecord }, signal),
        enabled: enabled && server,
        staleTime: 5 * MINUTE,
        placeholderData: keepPreviousData,
    })
    const choices = useMemo<Choice[]>(() => {
        if (staticChoices) return staticChoices
        if (server) return q.data || []
        const all = (meta.meta && meta.meta.choices) || []
        const hasDeps = all.some((c) => c.dependentValues && c.dependentValues.some((v) => v !== ''))
        if (!hasDeps || dependentValue === undefined) return all
        return all.filter((c) => !c.value || !c.dependentValues || c.dependentValues.indexOf(String(dependentValue)) >= 0)
    }, [staticChoices, server, q.data, meta.meta, dependentValue])
    return {
        choices,
        isLoading: server ? q.isLoading : meta.isLoading,
        isFetching: server ? q.isFetching : false,
        error: ((server ? q.error : meta.error) as Error | null) || null,
    }
}

/**
 * Reference search for a field: debounced, cached per term + relevant unsaved values. The server
 * applies the field's qualifier and dependent field. term '' → recent picks; '*' → everything.
 */
export function useReferenceSearch(args: {
    table?: string
    field?: string
    term: string
    sysId?: string
    changes?: FormChanges
    encodedRecord?: string
    limit?: number
    debounceMs?: number
    enabled?: boolean
}) {
    const { table, field, sysId = '-1', limit = 20, enabled = true } = args
    const term = useDebouncedValue(args.term, args.debounceMs ?? 200)
    const changesKey = stableChanges(args.changes)
    const q = useQuery<ReferenceSearchResult>({
        queryKey: gqlKeys.reference(table || '', field || '', sysId, term, changesKey, limit),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            searchReference({ table: table as string, field: field as string, term, sysId, changes: args.changes, encodedRecord: args.encodedRecord, limit }, signal),
        enabled: !!(table && field) && enabled,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    })
    return {
        data: q.data,
        recent: (q.data && q.data.recent) || [],
        matches: (q.data && q.data.matches) || [],
        total: q.data ? q.data.total : null,
        isLoading: q.isLoading,
        isFetching: q.isFetching || term !== args.term,
        error: (q.error as Error | null) || null,
    }
}

/** Values + display values of some fields of one record (GlideRecord_Query). */
export function useRecordValues(table: string | undefined, sysId: string | undefined, fields: string[], options: { enabled?: boolean } = {}) {
    const key = fields.slice().sort().join(',')
    return useQuery<Record<string, FieldValue> | null>({
        queryKey: gqlKeys.record(table || '', sysId || '', key),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchRecordValues(table as string, { sysId }, fields, signal),
        enabled: !!(table && sysId && sysId !== '-1' && fields.length) && options.enabled !== false,
        staleTime: 30_000,
    })
}

/** Display value of a referenced record, for a value that arrived without one. */
export function useReferenceDisplay(table: string | undefined, sysId: string | undefined, displayField = 'name', options: { enabled?: boolean } = {}) {
    return useQuery<string>({
        queryKey: gqlKeys.display(table || '', sysId || '', displayField),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchDisplayValue(table as string, sysId as string, displayField, signal),
        enabled: !!(table && sysId) && options.enabled !== false,
        staleTime: 5 * MINUTE,
    })
}

/** Imperative access for prefetching and invalidation: prefetchTableMeta, invalidateForm, … */
export function useGraphQLClient() {
    const qc = useQueryClient()
    return useMemo(
        () => ({
            graphql,
            prefetchTableMeta: (table: string) => qc.prefetchQuery({ queryKey: gqlKeys.tableMeta(table), queryFn: () => fetchTableMeta(table), staleTime: 10 * MINUTE }),
            invalidateForm: (table: string, sysId?: string) => qc.invalidateQueries({ queryKey: sysId ? ['rp-gql', 'form', table, sysId] : ['rp-gql', 'form', table] }),
            invalidateAll: () => qc.invalidateQueries({ queryKey: gqlKeys.all }),
        }),
        [qc],
    )
}
