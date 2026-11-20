/**
 * utilities:app/analytics: aggregates as the user, for charts, scores and dashboards, on the
 * platform's aggregate GraphQL (GlideAggregateRecord_Query: count / sum / avg / min / max /
 * countDistinct, group by one or two fields). Many aggregates go in one request as aliases, so a
 * time series (one bucket per alias) or a score (current, previous, sparkline) is one round trip.
 *
 * Why GraphQL over /api/now/stats: both run as the session user, but the stats REST API needs one
 * HTTP request per bucket (or the Batch API's base64 envelopes), while one GraphQL document carries
 * every bucket. Both return raw value + display value per group.
 *
 * Fetchers (plain async)
 *   fetchAggregate(args)       grouped / ungrouped aggregate, top N + "Other", chart-ready rows
 *   fetchTimeSeries(args)      the aggregate per day / week / month / quarter / year bucket
 *   fetchScore(args)           current vs previous period, delta, trend, sparkline, target
 *   fetchAggregates(parts)     the batching primitive (aliases → raw results)
 *   buildAggregateDocument(parts)
 *
 * Hooks (TanStack Query, the page cache; options: enabled, refreshInterval (s), live, staleTime)
 *   useAggregate, useTimeSeries, useScore, useAnalyticsLive, analyticsKeys
 *
 * Time buckets (buckets.ts)
 *   timeBuckets(field, interval, periods, { end, weekStart }), scorePeriods(period), rangeCondition,
 *   startOf, addInterval, bucketLabel, ymd, parseYmd, periodDays
 *
 * Every group / bucket carries `query`: the encoded filter for its records (for click-through to a
 * list page via navigate(page, { table, query })).
 */
export { fetchAggregate, fetchTimeSeries, fetchScore, fetchAggregates, buildAggregateDocument } from './documents';
export type { AggregatePart, RawAggregate } from './documents';
export { useAggregate, useTimeSeries, useScore, useAnalyticsLive, analyticsKeys } from './hooks';
export type { AnalyticsOptions } from './hooks';
export {
    timeBuckets,
    scorePeriods,
    rangeCondition,
    startOf,
    addInterval,
    bucketLabel,
    ymd,
    parseYmd,
    periodDays,
} from './buckets';
export type {
    AggregateFn,
    Interval,
    AggregateArgs,
    AggregateGroup,
    AggregateSeries,
    AggregateResult,
    TimeSeriesArgs,
    TimeBucket,
    TimeSeriesPoint,
    TimeSeriesResult,
    ScoreArgs,
    ScoreResult,
} from './types';
