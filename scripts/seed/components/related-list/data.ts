import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from 'utilities:react-query'
import { graphql, restGet, authHeaders, safeName, RELATED_LISTS_FIELDS, normalizeRelatedLists } from 'utilities:app/graphql'
import type { RelatedListInfo } from 'utilities:app/graphql'
import { listKeys } from 'utilities:app/list-data'
import type { ListPage } from 'utilities:app/list-data'

/**
 * Related-list data on the platform's own calls:
 *
 *   fetchRelatedLists(table, sysId, view?)  GlideViewQuery_Query.uiView → GlideLayout_Query.formLayout
 *       .relatedLists(includeEmptyOmittedRelatedLists: true): the record's related lists for the
 *       form view the platform resolves (forcedViewName = view), each with its count and the
 *       server-resolved filter (scripted 'REL:' relationships included). The same fragment rides in
 *       the form bootstrap (FORM_QUERY), so a form needs no second request.
 *   The rows: GlideListLayout_Query.getListLayout(table, relatedListName, parentTable,
 *       parentRecordSysId, fixedQuery = filter) through app/data-table's RecordList: the related
 *       list's own columns (sys_ui_list for the relationship), m2MData, canCreate / canDelete.
 *   Many-to-many Add / Edit / Remove: Table API rows on the m2m table (ACLs and business rules apply).
 */

export const RELATED_LISTS_QUERY = `query rpRelatedLists($table: String!, $sysId: String!, $forcedViewName: String) {
  GlideViewQuery_Query {
    uiView(table: $table, views: "", sysId: $sysId, query: "", forcedViewName: $forcedViewName) {
      view
      glideLayoutItem(table: $table, sysId: $sysId, query: "") {
        _query {
          GlideLayout_Query {
            formLayout(table: $table, view: "$$parent.viewName$$", sysId: $sysId, query: "") {
              isValidRecord canReadRecord lastErrorMessage
              ${RELATED_LISTS_FIELDS}
            }
          }
        }
      }
    }
  }
}`

export type RelatedListsResult = { view: string; lists: RelatedListInfo[]; hasRelatedLists: boolean }

/** A record's related lists (its form view's sys_ui_related_list), with counts and resolved filters. */
export async function fetchRelatedLists(table: string, sysId: string, view = '', signal?: AbortSignal): Promise<RelatedListsResult> {
    safeName(table, 'table')
    if (!sysId || sysId === '-1') return { view, lists: [], hasRelatedLists: false }
    const data = await graphql(RELATED_LISTS_QUERY, { table, sysId, forcedViewName: view || '' }, { signal, allowPartial: true })
    const U = data && data.GlideViewQuery_Query && data.GlideViewQuery_Query.uiView
    const L = U && U.glideLayoutItem && U.glideLayoutItem._query && U.glideLayoutItem._query.GlideLayout_Query && U.glideLayoutItem._query.GlideLayout_Query.formLayout
    if (!L) throw new Error(`No related lists for ${table}`)
    if (L.isValidRecord === false || L.canReadRecord === false) throw new Error(L.lastErrorMessage || `Record ${table}/${sysId} not found or not readable`)
    return { view: (U && U.view) || view, lists: normalizeRelatedLists(L.relatedLists), hasRelatedLists: !!(L.relatedListMetadata && L.relatedListMetadata.hasRelatedLists) }
}

/** Everything this primitive caches lives under ['rp-related', …]. */
export const relatedKeys = {
    all: ['rp-related'] as const,
    record: (table: string, sysId: string) => ['rp-related', 'lists', table, sysId] as const,
    lists: (table: string, sysId: string, view: string) => ['rp-related', 'lists', table, sysId, view] as const,
}

export type UseRelatedListsOptions = {
    enabled?: boolean
    /** Lists already loaded (e.g. the form bootstrap's relatedLists): no first request; refreshes still refetch. */
    initial?: RelatedListInfo[]
    staleTime?: number
}

/**
 * A record's related lists (cached per record + view). With `initial` (a form bootstrap's lists)
 * nothing is fetched until something invalidates the counts (an Add / Remove, useRelatedListsRefresh).
 */
export function useRelatedLists(table: string | undefined, sysId: string | undefined, view = '', options: UseRelatedListsOptions = {}) {
    const qc = useQueryClient()
    const key = relatedKeys.lists(table || '', sysId || '', view || '')
    const initial = options.initial
    const q = useQuery<RelatedListsResult>({
        queryKey: key,
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchRelatedLists(table as string, sysId as string, view, signal),
        enabled: !!table && !!sysId && sysId !== '-1' && options.enabled !== false,
        staleTime: options.staleTime ?? (initial ? 60_000 : 15_000),
        initialData: initial ? { view, lists: initial, hasRelatedLists: initial.length > 0 } : undefined,
    })
    // A fresh bootstrap (after a save) brings fresh counts: adopt them.
    const lastInitial = useRef(initial)
    useEffect(() => {
        if (!initial || initial === lastInitial.current) return
        lastInitial.current = initial
        qc.setQueryData(key, { view, lists: initial, hasRelatedLists: initial.length > 0 })
    }, [initial])
    return {
        lists: (q.data && q.data.lists) || EMPTY,
        view: (q.data && q.data.view) || view,
        hasRelatedLists: !!(q.data && q.data.hasRelatedLists),
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        error: (q.error as Error | null) || null,
        refetch: q.refetch,
    }
}

const EMPTY: RelatedListInfo[] = []

/**
 * One related list of a record by name ('task_sla.task', 'REL:<sys_id>'). When the list isn't on
 * the record's form view, a '<table>.<field>' name still works (rows whose field is the record);
 * a scripted relationship needs to be on the view (the server resolves its query there).
 */
export function useRelatedList(table: string | undefined, sysId: string | undefined, name: string | undefined, view = '', options: UseRelatedListsOptions = {}) {
    const all = useRelatedLists(table, sysId, view, { ...options, enabled: !!name && options.enabled !== false })
    const list = useMemo(() => {
        if (!name || !table || !sysId) return undefined
        const found = all.lists.find((l) => l.name.toLowerCase() === name.toLowerCase())
        if (found) return found
        if (all.isLoading) return undefined
        return syntheticList(table, sysId, name)
    }, [all.lists, all.isLoading, name, table, sysId])
    return { ...all, list }
}

/** A reference relationship described by its name alone ('<table>.<field>'): the rows whose field is the parent. */
export function syntheticList(parentTable: string, parentSysId: string, name: string): RelatedListInfo | undefined {
    const m = /^([a-z0-9_]+)\.([a-z0-9_]+)$/i.exec(String(name || ''))
    if (!m) return undefined
    return { name, table: m[1], parentTable, label: m[1], count: -1, filter: `${m[2]}=${parentSysId}`, relatedField: m[2], omitIfEmpty: false, groupByField: '', kind: 'reference' }
}

/** Refetch a record's related-list counts (and its lists' rows) after a change elsewhere. */
export function useRelatedListsRefresh() {
    const qc = useQueryClient()
    return useCallback(
        (table?: string, sysId?: string, listTable?: string) => {
            qc.invalidateQueries({ queryKey: table && sysId ? relatedKeys.record(table, sysId) : relatedKeys.all })
            if (listTable) qc.invalidateQueries({ queryKey: listKeys.table(listTable) })
        },
        [qc],
    )
}

// ---- kinds and actions -----------------------------------------------------------------------

export type RelatedListKind = 'reference' | 'many-to-many' | 'scripted'

/** The list's kind: m2m is known once the list call answered (metadata.m2MData). */
export function relatedListKind(list: Pick<RelatedListInfo, 'kind'>, page?: Pick<ListPage, 'm2m'> | null): RelatedListKind {
    if (page && page.m2m) return 'many-to-many'
    return list.kind === 'scripted' ? 'scripted' : 'reference'
}

/** Preset query for a new child of a reference relationship ('parent_incident=<sys_id>'). */
export function newRecordQuery(list: Pick<RelatedListInfo, 'relatedField' | 'kind'>, parentSysId: string): string {
    if (list.kind !== 'reference' || !/^[a-z0-9_]+$/i.test(list.relatedField)) return ''
    return `${list.relatedField}=${parentSysId}`
}

export type M2M = { table: string; sourceField: string; targetField: string; targetTable: string }

async function restJson(method: string, url: string, body?: unknown): Promise<any> {
    const r = await fetch(url, { method, credentials: 'same-origin', headers: authHeaders(body !== undefined), body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await r.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    if (!r.ok) {
        const msg = (json && json.error && (json.error.message || json.error.detail)) || `${method} ${url.split('?')[0]} failed (${r.status})`
        throw new Error(String(msg))
    }
    return json
}

/** The records linked to the parent through an m2m table: { rowSysId, value (target sys_id), displayValue }. */
export async function fetchM2MLinks(m2m: M2M, parentSysId: string, limit = 500): Promise<{ rowSysId: string; value: string; displayValue: string }[]> {
    const t = safeName(m2m.table, 'table')
    const q = encodeURIComponent(`${safeName(m2m.sourceField, 'field')}=${parentSysId}`)
    const rows = await restGet<any[]>(`/api/now/table/${t}?sysparm_query=${q}&sysparm_fields=sys_id,${safeName(m2m.targetField, 'field')}&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=${limit}`)
    return (rows || []).map((r: any) => {
        const f = r[m2m.targetField] || {}
        const id = r.sys_id && typeof r.sys_id === 'object' ? r.sys_id.value : r.sys_id
        return { rowSysId: String(id || ''), value: String(f.value || ''), displayValue: String(f.display_value || f.value || '') }
    })
}

/** Link targets to the parent (one m2m row each; already-linked targets are skipped). */
export async function addM2MLinks(m2m: M2M, parentSysId: string, targetIds: string[]): Promise<{ added: string[]; skipped: string[]; errors: string[] }> {
    const t = safeName(m2m.table, 'table')
    const existing = new Set((await fetchM2MLinks(m2m, parentSysId)).map((l) => l.value))
    const out = { added: [] as string[], skipped: [] as string[], errors: [] as string[] }
    for (const id of targetIds) {
        if (!id || existing.has(id)) {
            out.skipped.push(id)
            continue
        }
        try {
            await restJson('POST', `/api/now/table/${t}?sysparm_fields=sys_id`, { [m2m.sourceField]: parentSysId, [m2m.targetField]: id })
            out.added.push(id)
            existing.add(id)
        } catch (e) {
            out.errors.push((e as Error).message)
        }
    }
    return out
}

/** Remove m2m rows (unlinks the records; the records themselves stay). */
export async function removeM2MRows(table: string, rowSysIds: string[]): Promise<{ removed: string[]; errors: string[] }> {
    const t = safeName(table, 'table')
    const out = { removed: [] as string[], errors: [] as string[] }
    for (const id of rowSysIds) {
        try {
            await restJson('DELETE', `/api/now/table/${t}/${encodeURIComponent(id)}`)
            out.removed.push(id)
        } catch (e) {
            out.errors.push((e as Error).message)
        }
    }
    return out
}
