import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from 'utilities:react-query';
import { useRecordWatch } from '@portal/runtime';
import { fetchAggregate, fetchScore, fetchTimeSeries } from './documents';
import type { AggregateArgs, AggregateResult, ScoreArgs, ScoreResult, TimeSeriesArgs, TimeSeriesResult } from './types';

/** Everything this utility caches lives under ['rp-analytics', table, …]. */
export const analyticsKeys = {
    all: ['rp-analytics'] as const,
    table: (table: string) => ['rp-analytics', table] as const,
    aggregate: (a: AggregateArgs) => ['rp-analytics', a.table, 'aggregate', JSON.stringify(a)] as const,
    timeSeries: (a: TimeSeriesArgs, day: string) =>
        ['rp-analytics', a.table, 'series', JSON.stringify(a), day] as const,
    score: (a: ScoreArgs, day: string) => ['rp-analytics', a.table, 'score', JSON.stringify(a), day] as const,
};

export type AnalyticsOptions = {
    enabled?: boolean;
    /** Poll every N seconds (0 / undefined = off). */
    refreshInterval?: number;
    /** Live: refetch (debounced) when records of the table change (record watch on the filter). */
    live?: boolean;
    /** Debounce for live refetches, ms (default 2000: aggregates over busy tables change often). */
    liveDebounceMs?: number;
    staleTime?: number;
};

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Live refresh: watch the table (filter) and invalidate this utility's cache for it, debounced. */
export function useAnalyticsLive(table: string | undefined, query: string | undefined, options: AnalyticsOptions = {}) {
    const client = useQueryClient();
    const timer = useRef<any>(null);
    useEffect(() => () => clearTimeout(timer.current), []);
    return useRecordWatch(
        table || '',
        query || '',
        () => {
            if (!table || timer.current) return;
            timer.current = setTimeout(() => {
                timer.current = null;
                client.invalidateQueries({ queryKey: analyticsKeys.table(table) });
            }, options.liveDebounceMs ?? 2000);
        },
        { enabled: !!table && !!options.live && options.enabled !== false, invalidate: false }
    );
}

function queryOptions(options: AnalyticsOptions, enabled: boolean) {
    return {
        enabled: enabled && options.enabled !== false,
        staleTime: options.staleTime ?? 30_000,
        refetchInterval:
            options.refreshInterval && options.refreshInterval > 0 ? options.refreshInterval * 1000 : false,
        placeholderData: keepPreviousData,
    };
}

/**
 * useAggregate({ table, query?, groupBy?, aggregate?, field?, sort?, limit?, otherLabel? }, options?)
 * → { data, rows, groups, series, value, total, isLoading, isFetching, error, refetch }.
 */
export function useAggregate(args: AggregateArgs, options: AnalyticsOptions = {}) {
    useAnalyticsLive(args.table, args.query, options);
    const q = useQuery<AggregateResult>({
        queryKey: analyticsKeys.aggregate(args),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchAggregate(args, signal),
        ...queryOptions(options, !!args.table),
    });
    const d = q.data;
    return {
        data: d,
        rows: (d && d.rows) || EMPTY,
        groups: (d && d.groups) || EMPTY,
        series: (d && d.series) || EMPTY,
        value: d ? d.value : null,
        total: d ? d.total : null,
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        error: (q.error as Error | null) || null,
        refetch: q.refetch,
    };
}

/**
 * useTimeSeries({ table, dateField, interval?, periods?, query?, aggregate?, field?, groupBy? }, options?)
 * → { data, rows, points, series, total, isLoading, isFetching, error, refetch }.
 */
export function useTimeSeries(args: TimeSeriesArgs, options: AnalyticsOptions = {}) {
    useAnalyticsLive(args.table, args.query, options);
    const q = useQuery<TimeSeriesResult>({
        // The day is part of the key: buckets roll over at midnight.
        queryKey: analyticsKeys.timeSeries(args, today()),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchTimeSeries(args, signal),
        ...queryOptions(options, !!args.table && !!args.dateField),
    });
    const d = q.data;
    return {
        data: d,
        rows: (d && d.rows) || EMPTY,
        points: (d && d.points) || EMPTY,
        series: (d && d.series) || EMPTY,
        total: d ? d.total : null,
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        error: (q.error as Error | null) || null,
        refetch: q.refetch,
    };
}

/**
 * useScore({ table, query?, aggregate?, field?, dateField?, period?, sparkline?, target?, lowerIsBetter? }, options?)
 * → { data (value, previous, delta, deltaPercent, trend, positive, target…, sparkline), isLoading, error, refetch }.
 */
export function useScore(args: ScoreArgs, options: AnalyticsOptions = {}) {
    useAnalyticsLive(args.table, args.query, options);
    const q = useQuery<ScoreResult>({
        queryKey: analyticsKeys.score(args, today()),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchScore(args, signal),
        ...queryOptions(options, !!args.table),
    });
    return {
        data: q.data,
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        error: (q.error as Error | null) || null,
        refetch: q.refetch,
    };
}

const EMPTY: any[] = [];
