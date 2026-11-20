import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAmbChannel, useAmbStatus } from '@portal/runtime'
import { useMutation, useQuery, useQueryClient } from 'utilities:react-query'
import { useTableMeta } from 'utilities:app/graphql'
import { applyActivityMessage, fetchActivity, fetchEmailBody, fetchFullJournalEntry, fetchJournalAccess, postJournal } from './documents'
import { ACTIVITY_KINDS, applyActivityFilters, countActivity, defaultFiltersFrom, kindOfFilterField } from './filters'
import type { ActivityData, ActivityEntry, ActivityFilterField, ActivityFilters, ActivityKind, JournalFieldInfo } from './types'

/** Query keys: everything this utility caches lives under ['rp-activity', …]. */
export const activityKeys = {
    all: ['rp-activity'] as const,
    stream: (table: string, sysId: string) => ['rp-activity', 'stream', table, sysId] as const,
    access: (table: string, sysId: string, fields: string) => ['rp-activity', 'access', table, sysId, fields] as const,
    email: (sysId: string) => ['rp-activity', 'email', sysId] as const,
    full: (sysId: string) => ['rp-activity', 'full', sysId] as const,
}

const REAL_ID = /^[0-9a-f]{32}$/i

function useActivityQuery(table: string | undefined, sysId: string | undefined, options: { view?: string; enabled?: boolean } = {}) {
    const ok = !!table && !!sysId && REAL_ID.test(sysId) && options.enabled !== false
    return useQuery<ActivityData>({
        queryKey: activityKeys.stream(table || '', sysId || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchActivity(table as string, sysId as string, options.view || '', signal),
        enabled: ok,
        staleTime: 30_000,
    })
}

export type UseActivityOptions = {
    filters?: ActivityFilters
    /** Form view scoping the platform's filter configuration ('' = default). */
    view?: string
    /** Live updates over the stream's AMB channels (default true). */
    live?: boolean
    enabled?: boolean
}

export type ActivityResult = {
    /** Filtered, newest first. */
    entries: ActivityEntry[]
    /** Unfiltered, newest first. */
    allEntries: ActivityEntry[]
    data: ActivityData | undefined
    filterFields: ActivityFilterField[]
    loading: boolean
    fetching: boolean
    error: Error | null
    refetch: () => void
    /** AMB subscription status of /activity/events/<sys_id>. */
    liveStatus: string
    /** Keys of entries that arrived live since mount (newest last), for highlights and announcements. */
    arrived: string[]
}

/**
 * A record's activity stream: journal entries, field changes, attachments, emails, relationship
 * changes (GlideActivity getEvents, the query Workspace's activity stream runs). Live: the
 * stream's own AMB channel /activity/events/<sys_id> carries each new or changed event, applied to
 * the cache in place; after an AMB reconnect the stream is re-read once.
 */
export function useActivity(table: string | undefined, sysId: string | undefined, options: UseActivityOptions = {}): ActivityResult {
    const qc = useQueryClient()
    const q = useActivityQuery(table, sysId, { view: options.view, enabled: options.enabled })
    const key = activityKeys.stream(table || '', sysId || '')
    const [arrived, setArrived] = useState<string[]>([])
    const live = options.live !== false && options.enabled !== false && !!sysId && REAL_ID.test(sysId || '')
    const onMessage = useCallback(
        (message: any) => {
            const d = message && message.data
            if (!d || d.operation === 'supplemental_update') return
            let event: any = null
            try {
                event = typeof d.data === 'string' ? JSON.parse(d.data) : d.data
            } catch (e) {
                event = null
            }
            let users: any[] = []
            try {
                users = typeof d.userReferences === 'string' ? JSON.parse(d.userReferences) : d.userReferences || []
            } catch (e) {
                users = []
            }
            const current = qc.getQueryData(key) as ActivityData | undefined
            if (!event || !current) {
                qc.invalidateQueries({ queryKey: key })
                return
            }
            const next = applyActivityMessage(current, event, users, String(d.operation || 'update'))
            if (next !== current) {
                qc.setQueryData(key, next)
                const k = `${event.eventTable}:${event.eventSysId}`
                if (!(d.operation === 'delete' || event.forRemoval)) setArrived((list) => (list.indexOf(k) >= 0 ? list : list.concat(k).slice(-50)))
            }
        },
        [qc, table, sysId],
    )
    const channel = live ? `/activity/events/${sysId}` : ''
    const amb = useAmbChannel(channel, onMessage, { enabled: live })
    // Missed messages during a connection gap: re-read once after a resume.
    const status = useAmbStatus() as { resumedAt: number | null }
    const resumed = useRef(status.resumedAt)
    useEffect(() => {
        if (live && status.resumedAt && status.resumedAt !== resumed.current) qc.invalidateQueries({ queryKey: key })
        resumed.current = status.resumedAt
    }, [status.resumedAt])
    const all = q.data ? q.data.entries : EMPTY
    const entries = useMemo(() => applyActivityFilters(all, options.filters), [all, options.filters])
    return {
        entries,
        allEntries: all,
        data: q.data,
        filterFields: q.data ? q.data.filterFields : NO_FIELDS,
        loading: q.isLoading,
        fetching: q.isFetching,
        error: (q.error as Error) || null,
        refetch: () => {
            q.refetch()
        },
        liveStatus: amb.status,
        arrived,
    }
}

const EMPTY: ActivityEntry[] = []
const NO_FIELDS: ActivityFilterField[] = []

export type ActivityFilterOption = { value: string; label: string; count: number }

export type ActivityFilterState = {
    /** Pass to useActivity({ filters }). */
    filters: ActivityFilters
    /** Kinds present in the stream (with counts), in display order. */
    kinds: (ActivityFilterOption & { kind: ActivityKind; selected: boolean })[]
    /** Journal fields (work notes, comments…) with counts. */
    journalFields: (ActivityFilterOption & { selected: boolean })[]
    /** Audited fields the platform shows for this table (the activity filter configuration). */
    fields: (ActivityFilterOption & { selected: boolean })[]
    search: string
    setSearch: (text: string) => void
    toggleKind: (kind: ActivityKind) => void
    /** Show only this kind (or everything again when it is the only one shown). */
    onlyKind: (kind: ActivityKind | null) => void
    toggleJournalField: (name: string) => void
    toggleField: (name: string) => void
    reset: () => void
    /** True while nothing is filtered out (beyond the platform's defaults). */
    isDefault: boolean
}

/**
 * Filter state for a record's stream, seeded from the platform's activity filter configuration
 * (getEvents filterFields: which fields and specials the table shows, and which are selected by
 * default). Shares useActivity's request (same cache entry). Local state only: nothing is saved.
 */
export function useActivityFilters(table: string | undefined, sysId: string | undefined, options: { view?: string; initial?: ActivityFilters } = {}): ActivityFilterState {
    const q = useActivityQuery(table, sysId, { view: options.view })
    const filterFields = q.data ? q.data.filterFields : NO_FIELDS
    const entries = q.data ? q.data.entries : EMPTY
    const defaults = useMemo(() => ({ ...defaultFiltersFrom(filterFields, table), ...(options.initial || {}) }), [filterFields, table])
    const [state, setState] = useState<ActivityFilters | null>(null)
    const [search, setSearch] = useState('')
    const current = state || defaults
    const counts = useMemo(() => countActivity(entries), [entries])

    const presentKinds = ACTIVITY_KINDS.filter((k) => (counts.kinds[k.kind] || 0) > 0)
    const kindOn = (k: ActivityKind) => !current.kinds || current.kinds.indexOf(k) >= 0
    const journalDefs = filterFields.filter((f) => kindOfFilterField(f, table) === 'journal')
    // Journal fields: the configured ones, plus any that have entries but aren't configured.
    const journalNames = journalDefs.map((f) => f.name)
    Object.keys(counts.journal).forEach((n) => journalNames.indexOf(n) < 0 && journalNames.push(n))
    const journalLabel = (n: string) => {
        const def = journalDefs.find((f) => f.name === n)
        if (def) return def.label
        const e = entries.find((x) => x.kind === 'journal' && x.field === n)
        return (e && e.title) || n
    }
    const journalOn = (n: string) => !current.journalFields || current.journalFields.indexOf(n) >= 0
    const auditDefs = filterFields.filter((f) => kindOfFilterField(f, table) === 'audit')
    const fieldOn = (n: string) => !current.fields || current.fields.indexOf(n) >= 0
    const fieldCounts: Record<string, number> = {}
    entries.forEach((e) => e.changes && e.changes.forEach((c) => (fieldCounts[c.field] = (fieldCounts[c.field] || 0) + 1)))

    const update = (patch: Partial<ActivityFilters>) => setState({ ...current, ...patch })
    const toggleIn = (list: string[] | undefined, all: string[], value: string): string[] | undefined => {
        const base = list ? list.slice() : all.slice()
        const i = base.indexOf(value)
        if (i >= 0) base.splice(i, 1)
        else base.push(value)
        return all.every((v) => base.indexOf(v) >= 0) ? undefined : base
    }
    const allKinds = ACTIVITY_KINDS.map((k) => k.kind)
    const filters = useMemo<ActivityFilters>(() => ({ ...current, search: search || undefined }), [current, search])
    return {
        filters,
        kinds: presentKinds.map((k) => ({ kind: k.kind, value: k.kind, label: k.label, count: counts.kinds[k.kind] || 0, selected: kindOn(k.kind) })),
        journalFields: journalNames.map((n) => ({ value: n, label: journalLabel(n), count: counts.journal[n] || 0, selected: journalOn(n) })),
        fields: auditDefs.map((f) => ({ value: f.name, label: f.label, count: fieldCounts[f.name] || 0, selected: fieldOn(f.name) })),
        search,
        setSearch,
        toggleKind: (k) => update({ kinds: toggleIn(current.kinds as string[] | undefined, allKinds, k) as ActivityKind[] | undefined }),
        onlyKind: (k) => update({ kinds: k === null || (current.kinds && current.kinds.length === 1 && current.kinds[0] === k) ? undefined : [k] }),
        toggleJournalField: (n) => update({ journalFields: toggleIn(current.journalFields, journalNames, n) }),
        toggleField: (n) =>
            update({
                fields: toggleIn(
                    current.fields,
                    auditDefs.map((f) => f.name),
                    n,
                ),
            }),
        reset: () => {
            setState(null)
            setSearch('')
        },
        isDefault: !state && !search,
    }
}

/** Refetch a record's stream (e.g. after a form save, when AMB is unavailable). */
export function useInvalidateActivity() {
    const qc = useQueryClient()
    return useCallback((table: string, sysId: string) => qc.invalidateQueries({ queryKey: activityKeys.stream(table, sysId) }), [qc])
}

export type PostJournalState = {
    post: (field: string, value: string) => Promise<void>
    posting: boolean
    error: Error | null
    reset: () => void
}

/**
 * Post work notes / comments (GlideActivity_Mutation.putJournal, as Workspace's compose box). The
 * stream refreshes from AMB; it is also refetched after the post so it updates without AMB.
 */
export function usePostJournal(table: string | undefined, sysId: string | undefined): PostJournalState {
    const qc = useQueryClient()
    const m = useMutation({
        mutationFn: (v: { field: string; value: string }) => postJournal({ table: table as string, sysId: sysId as string, field: v.field, value: v.value }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: activityKeys.stream(table || '', sysId || '') })
        },
    })
    return {
        post: (field: string, value: string) => m.mutateAsync({ field, value }),
        posting: m.isPending,
        error: (m.error as Error) || null,
        reset: () => m.reset(),
    }
}

const JOURNAL_HELP: Record<string, string> = {
    work_notes: 'Only internal users can see work notes',
    comments: 'Everyone with access to the record can see this comment',
}

/** Internal-only journal fields (work notes and their variants). */
export function isInternalJournal(name: string): boolean {
    return /work_notes/.test(name)
}

/**
 * The journal_input fields of a table and whether this user may write each on this record
 * (dictionary metadata + GlideRecord_Query canWrite). `only` limits and orders them.
 */
export function useJournalFields(table: string | undefined, sysId: string | undefined, options: { only?: string[]; enabled?: boolean } = {}): { fields: JournalFieldInfo[]; loading: boolean } {
    const meta = useTableMeta(table, { enabled: options.enabled !== false })
    const names = useMemo(() => {
        if (!meta.data) return [] as string[]
        const all = Object.keys(meta.data).filter((n) => {
            // journal_input only (what the compose box offers); history-style 'journal' fields such as
            // approval_history are written by the platform, not by people.
            const t = meta.data![n].internalType || meta.data![n].type
            return t === 'journal_input'
        })
        if (options.only && options.only.length) return options.only.filter((n) => all.indexOf(n) >= 0)
        // Platform order: comments, then work notes, then the rest alphabetically.
        const rank = (n: string) => (n === 'comments' ? 0 : n === 'work_notes' ? 1 : 2)
        return all.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1))
    }, [meta.data, (options.only || []).join(',')])
    const real = !!sysId && REAL_ID.test(sysId)
    const access = useQuery({
        queryKey: activityKeys.access(table || '', sysId || '', names.join(',')),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchJournalAccess(table as string, sysId as string, names, signal),
        enabled: real && names.length > 0 && options.enabled !== false,
        staleTime: 60_000,
    })
    const fields = names.map(
        (n): JournalFieldInfo => ({
            name: n,
            label: (meta.data && meta.data[n] && meta.data[n].label) || n,
            writable: !!(access.data && access.data[n]) && !(meta.data && meta.data[n] && meta.data[n].readOnly),
            maxLength: meta.data && meta.data[n] ? meta.data[n].maxLength : undefined,
            internal: isInternalJournal(n),
            help: JOURNAL_HELP[n] || (meta.data && meta.data[n] && meta.data[n].hint) || '',
        }),
    )
    return { fields, loading: meta.isLoading || (real && names.length > 0 && access.isLoading) }
}

/** An email entry's body, fetched when `enabled` (an expanded tile). */
export function useEmailBody(emailSysId: string | undefined, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: activityKeys.email(emailSysId || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchEmailBody(emailSysId as string, signal),
        enabled: !!emailSysId && options.enabled !== false,
        staleTime: 10 * 60_000,
    })
}

/** A truncated journal entry's full content, fetched when `enabled`. */
export function useFullJournalEntry(eventSysId: string | undefined, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: activityKeys.full(eventSysId || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchFullJournalEntry(eventSysId as string, signal),
        enabled: !!eventSysId && options.enabled !== false,
        staleTime: 10 * 60_000,
    })
}
