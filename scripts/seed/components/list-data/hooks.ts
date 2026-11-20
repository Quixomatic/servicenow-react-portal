import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient, keepPreviousData } from 'utilities:react-query';
import { useUser } from '@portal/runtime';
import {
    fetchCrumbs,
    fetchEditability,
    fetchFilterFields,
    fetchList,
    fetchPreference,
    savePreference,
    writeCells,
    columnsParam,
    effectiveQuery,
} from './documents';
import { fetchSavedFilters, createSavedFilter, updateSavedFilter, deleteSavedFilter } from './filters';
import { restGet } from 'utilities:app/graphql';
import type { ListArgs, ListPage, ListPreferences, ListRow, SavedFilter, WriteResult } from './types';

/** Everything this utility caches lives under ['rp-list', …]. */
export const listKeys = {
    all: ['rp-list'] as const,
    table: (table: string) => ['rp-list', 'page', table] as const,
    page: (a: ListArgs) =>
        [
            'rp-list',
            'page',
            a.table,
            columnsParam(a.columns),
            effectiveQuery(a),
            a.fixedQuery || '',
            a.view || '',
            a.relatedListName || '',
            a.parentTable || '',
            a.parentRecordSysId || '',
            a.limit || 20,
            a.offset || 0,
        ] as const,
    infinite: (a: ListArgs) =>
        [
            'rp-list',
            'page',
            a.table,
            'infinite',
            columnsParam(a.columns),
            effectiveQuery(a),
            a.fixedQuery || '',
            a.view || '',
            a.relatedListName || '',
            a.parentTable || '',
            a.parentRecordSysId || '',
            a.limit || 100,
        ] as const,
    crumbs: (table: string, filter: string) => ['rp-list', 'crumbs', table, filter] as const,
    fields: (table: string) => ['rp-list', 'fields', table] as const,
    edit: (table: string, column: string, ids: string) => ['rp-list', 'edit', table, column, ids] as const,
    pref: (user: string, key: string) => ['rp-list', 'pref', user, key] as const,
    filters: (user: string, table: string) => ['rp-list', 'filters', user, table] as const,
    groups: (user: string) => ['rp-list', 'my-groups', user] as const,
};

const MINUTE = 60_000;

/** One server-side page (sorting, filtering, search and paging all run on the platform). */
export function useList(args: ListArgs, options: { enabled?: boolean; staleTime?: number } = {}) {
    const q = useQuery<ListPage>({
        queryKey: listKeys.page(args),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchList(args, signal),
        enabled: !!args.table && options.enabled !== false,
        staleTime: options.staleTime ?? 15_000,
        placeholderData: keepPreviousData,
    });
    return {
        data: q.data,
        rows: (q.data && q.data.rows) || EMPTY_ROWS,
        columns: (q.data && q.data.columns) || EMPTY_COLS,
        count: q.data ? q.data.count : 0,
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        isPlaceholderData: q.isPlaceholderData,
        error: (q.error as Error | null) || null,
        refetch: q.refetch,
    };
}

const EMPTY_ROWS: ListRow[] = [];
const EMPTY_COLS: ListPage['columns'] = [];

/** Pages loaded as you scroll (virtualized lists): rows accumulate, one request per page. */
export function useInfiniteList(args: ListArgs, options: { enabled?: boolean } = {}) {
    const pageSize = args.limit || 100;
    const q = useInfiniteQuery({
        queryKey: listKeys.infinite({ ...args, limit: pageSize }),
        queryFn: ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) =>
            fetchList({ ...args, limit: pageSize, offset: pageParam }, signal),
        initialPageParam: 0,
        getNextPageParam: (last: ListPage) =>
            last.offset + last.rows.length < last.count && last.rows.length > 0
                ? last.offset + last.rows.length
                : undefined,
        enabled: !!args.table && options.enabled !== false,
        staleTime: 15_000,
        placeholderData: keepPreviousData,
    });
    const pages: ListPage[] = (q.data && q.data.pages) || [];
    const rows = useMemo(() => pages.flatMap((p) => p.rows), [q.data]);
    const first = pages[0];
    return {
        data: first,
        rows,
        columns: first ? first.columns : EMPTY_COLS,
        count: first ? first.count : 0,
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        isFetchingNextPage: q.isFetchingNextPage,
        hasNextPage: !!q.hasNextPage,
        fetchNextPage: q.fetchNextPage,
        error: (q.error as Error | null) || null,
        refetch: q.refetch,
    };
}

/** Breadcrumbs for a filter (labels from the platform's parser; cached per filter). */
export function useCrumbs(table: string | undefined, filter: string) {
    return useQuery({
        queryKey: listKeys.crumbs(table || '', filter),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCrumbs(table as string, filter, signal),
        enabled: !!table && !!filter,
        staleTime: 5 * MINUTE,
        placeholderData: keepPreviousData,
    });
}

/** Filterable fields of a table (one dot-walk level), cached 10 minutes. */
export function useFilterFields(table: string | undefined, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: listKeys.fields(table || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchFilterFields(table as string, signal),
        enabled: !!table && options.enabled !== false,
        staleTime: 10 * MINUTE,
        gcTime: 30 * MINUTE,
    });
}

/** canListEdit for `column` on some records (fetched on demand, cached briefly). */
export function useEditability(
    table: string | undefined,
    column: string | undefined,
    sysIds: string[],
    options: { enabled?: boolean; fieldType?: string; staleTime?: number } = {}
) {
    const ids = sysIds.slice().sort().join(',');
    return useQuery({
        queryKey: listKeys.edit(table || '', column || '', ids),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchEditability(
                { table: table as string, column: column as string, sysIds, fieldType: options.fieldType },
                signal
            ),
        enabled: !!(table && column && sysIds.length) && options.enabled !== false,
        staleTime: options.staleTime ?? 30_000,
    });
}

/**
 * Inline / bulk writes. Successful cells are patched into every cached page of the table at once
 * (optimistic display), then the table's pages are refetched for server-computed values.
 */
export function useCellWrite() {
    const qc = useQueryClient();
    const [pending, setPending] = useState(0);
    const write = useCallback(
        async (args: {
            table: string;
            sysIds: string[];
            values: { column: string; value: string; displayValue?: string }[];
        }): Promise<WriteResult> => {
            setPending((n) => n + 1);
            try {
                const res = await writeCells({
                    table: args.table,
                    sysIds: args.sysIds,
                    values: args.values.map((v) => ({ column: v.column, value: v.value })),
                });
                if (res.written.length) {
                    const ok = new Set(res.written);
                    const patch = (page: ListPage): ListPage => ({
                        ...page,
                        rows: page.rows.map((r) => {
                            if (!ok.has(r.sysId)) return r;
                            const cells = { ...r.cells };
                            for (const v of args.values)
                                cells[v.column] = { value: v.value, displayValue: v.displayValue ?? v.value };
                            return { ...r, cells };
                        }),
                    });
                    qc.setQueriesData({ queryKey: listKeys.table(args.table) }, (old: any) => {
                        if (!old) return old;
                        if (Array.isArray(old.pages)) return { ...old, pages: old.pages.map(patch) };
                        if (Array.isArray(old.rows)) return patch(old);
                        return old;
                    });
                }
                qc.invalidateQueries({ queryKey: listKeys.table(args.table) });
                // Edit prefetches carry current values (dot-walked cells compare against them): refetch them all.
                qc.invalidateQueries({ queryKey: ['rp-list', 'edit'] });
                return res;
            } finally {
                setPending((n) => n - 1);
            }
        },
        [qc]
    );
    return { write, isPending: pending > 0 };
}

/** Refetch every list of a table (after an action elsewhere). */
export function useListInvalidate() {
    const qc = useQueryClient();
    return useCallback(
        (table?: string) => qc.invalidateQueries({ queryKey: table ? listKeys.table(table) : listKeys.all }),
        [qc]
    );
}

/**
 * Per-user list personalization (column order/visibility, widths, density, page size, wrap).
 *
 * persist 'user'  (default) the platform user preference x_312987_portal.list.<key>, mirrored in
 *                 localStorage so the first paint already has it;
 * persist 'local' localStorage only;  persist 'none' memory only.
 */
export function useListPreferences(
    key: string | undefined,
    options: { persist?: 'user' | 'local' | 'none'; defaults?: ListPreferences } = {}
) {
    const persist = key ? options.persist || 'user' : 'none';
    const user = useUser() as { sysId?: string };
    const userId = (user && user.sysId) || '';
    const storageKey = key ? `rp-list:${userId}:${key}` : '';
    const read = (): ListPreferences => {
        if (persist === 'none' || typeof localStorage === 'undefined') return {};
        try {
            return JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
        } catch (e) {
            return {};
        }
    };
    const [prefs, setPrefs] = useState<ListPreferences>(read);
    const touched = useRef(false);
    const remote = useQuery({
        queryKey: listKeys.pref(userId, key || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchPreference(userId, key as string, signal),
        enabled: persist === 'user' && !!userId && !!key,
        staleTime: 10 * MINUTE,
        retry: false,
    });
    // The server copy wins until the user changes something here.
    useEffect(() => {
        if (remote.data && !touched.current) {
            setPrefs(remote.data);
            try {
                localStorage.setItem(storageKey, JSON.stringify(remote.data));
            } catch (e) {
                /* storage full / blocked */
            }
        }
    }, [remote.data, storageKey]);

    const timer = useRef<any>(0);
    const update = useCallback(
        (next: ListPreferences | ((p: ListPreferences) => ListPreferences)) => {
            touched.current = true;
            setPrefs((prev) => {
                const value = typeof next === 'function' ? (next as any)(prev) : next;
                if (persist !== 'none') {
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(value));
                    } catch (e) {
                        /* ignore */
                    }
                }
                if (persist === 'user' && key) {
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => {
                        savePreference(key, value).catch(() => {
                            /* local copy still applies */
                        });
                    }, 600);
                }
                return value;
            });
        },
        [persist, storageKey, key]
    );
    const reset = useCallback(() => update({}), [update]);
    return { prefs: { ...(options.defaults || {}), ...prefs }, setPrefs: update, reset, isLoading: remote.isLoading };
}

export type ResolvedPath = {
    /** Field path ('caller_id.department.name'). */
    path: string;
    /** Readable label ('Caller › Department › Name'). */
    label: string;
    /** Table that owns the last field. */
    table: string;
    /** The last field's name on that table. */
    field: string;
    type: string;
    referenceTable?: string;
    /** Each step (for the picker's breadcrumb). */
    steps: { table: string; field: string; label: string; referenceTable?: string }[];
};

/** Resolve a dot-walked field path against the dot-walk metadata (each table cached). */
export function useFieldPath(table: string | undefined, path: string | undefined) {
    const qc = useQueryClient();
    return useQuery<ResolvedPath | null>({
        queryKey: ['rp-list', 'path', table || '', path || ''],
        queryFn: async () => {
            if (!table || !path) return null;
            const names = path.split('.');
            let current = table;
            const steps: ResolvedPath['steps'] = [];
            let last: any = null;
            for (let i = 0; i < names.length; i++) {
                const t = current;
                const meta = await qc.fetchQuery({
                    queryKey: listKeys.fields(t),
                    queryFn: ({ signal }: { signal: AbortSignal }) => fetchFilterFields(t, signal),
                    staleTime: 10 * MINUTE,
                });
                const f = meta.fields.find((x) => x.name === names[i]);
                if (!f) return { path, label: names.join(' › '), table: t, field: names[i], type: 'string', steps };
                steps.push({ table: t, field: f.name, label: f.label, referenceTable: f.referenceTable });
                last = f;
                if (i < names.length - 1) {
                    if (!f.referenceTable)
                        return { path, label: names.join(' › '), table: t, field: names[i], type: 'string', steps };
                    current = f.referenceTable;
                }
            }
            return {
                path,
                label: steps.map((s) => s.label).join(' › '),
                table: steps.length ? steps[steps.length - 1].table : table,
                field: names[names.length - 1],
                type: last ? last.type : 'string',
                referenceTable: last ? last.referenceTable : undefined,
                steps,
            };
        },
        enabled: !!table && !!path,
        staleTime: 10 * MINUTE,
    });
}

/** The user's saved filters (sys_filter) for a table: own, group and global ones the ACLs let them read. */
export function useSavedFilters(table: string | undefined, options: { enabled?: boolean } = {}) {
    const user = useUser() as { sysId?: string };
    const userId = (user && user.sysId) || '';
    return useQuery<SavedFilter[]>({
        queryKey: listKeys.filters(userId, table || ''),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchSavedFilters(table as string, userId, signal),
        enabled: !!table && !!userId && options.enabled !== false,
        staleTime: 60_000,
    });
}

/** Save / rename / re-save / delete saved filters (as the user); the table's filter list refetches after each. */
export function useSavedFilterActions(table: string) {
    const qc = useQueryClient();
    const user = useUser() as { sysId?: string };
    const userId = (user && user.sysId) || '';
    const done = () => qc.invalidateQueries({ queryKey: listKeys.filters(userId, table) });
    return {
        save: async (title: string, filter: string, group?: string) => {
            const f = await createSavedFilter({ table, title, filter, userSysId: userId, group });
            await done();
            return f;
        },
        update: async (sysId: string, patch: { title?: string; filter?: string }) => {
            const f = await updateSavedFilter(sysId, patch, userId);
            await done();
            return f;
        },
        remove: async (sysId: string) => {
            await deleteSavedFilter(sysId);
            await done();
        },
    };
}

/** Groups the user belongs to (for sharing a filter with a group); empty when the ACLs refuse. */
export function useMyGroups(options: { enabled?: boolean } = {}) {
    const user = useUser() as { sysId?: string };
    const userId = (user && user.sysId) || '';
    return useQuery<{ value: string; label: string }[]>({
        queryKey: listKeys.groups(userId),
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            try {
                const rows = await restGet<any[]>(
                    `/api/now/table/sys_user_grmember?sysparm_query=${encodeURIComponent(
                        `user=${userId}^group.active=true^ORDERBYgroup.name`
                    )}&sysparm_fields=group&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=100`,
                    signal
                );
                return (rows || [])
                    .map((r) => ({
                        value: String((r.group && r.group.value) || ''),
                        label: String((r.group && r.group.display_value) || ''),
                    }))
                    .filter((g) => g.value);
            } catch (e) {
                return [];
            }
        },
        enabled: !!userId && options.enabled !== false,
        staleTime: 10 * MINUTE,
    });
}
