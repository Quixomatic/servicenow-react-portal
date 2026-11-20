/**
 * Aggregates on the platform GraphQL API (GlideAggregateRecord_Query, what UI Builder's aggregate
 * data resources use), as the session user. Several aggregates go in ONE request as aliases, so a
 * 12-bucket time series or a score with its previous period and sparkline is one round trip.
 *
 * Verified on the instance (2026-11-20):
 *   - tableName / queryConditions / groupBy / groupPagination { offset, limit } take variables;
 *   - aggregate field arguments (avg(field: …)) must be inline literals: a variable passes
 *     validation but fails with "Invalid argument for aggregate operation". Field names are
 *     checked against /^[a-z0-9_.]+$/ before they go in the document;
 *   - totalCount fails without groupBy ("getTargetED() is null"): ungrouped parts read count;
 *   - groupBy gives raw value + displayValue per group; aggregateQuery is null, so the
 *     click-through query is built here (base filter AND field=value / fieldISEMPTY).
 */
import { graphql } from 'utilities:app/graphql';
import { andQueries, groupCondition } from 'utilities:app/list-data';
import { timeBuckets, scorePeriods, rangeCondition, periodDays } from './buckets';
import type {
    AggregateArgs,
    AggregateFn,
    AggregateGroup,
    AggregateResult,
    AggregateSeries,
    Interval,
    ScoreArgs,
    ScoreResult,
    TimeSeriesArgs,
    TimeSeriesPoint,
    TimeSeriesResult,
} from './types';

const NAME = /^[a-z0-9_]+$/i;
const FIELD = /^[a-z0-9_.]+$/i;
const FNS: AggregateFn[] = ['count', 'sum', 'avg', 'min', 'max', 'countDistinct'];

function checkTable(table: string): string {
    if (!NAME.test(String(table || ''))) throw new Error(`Invalid table "${table}"`);
    return table;
}

function checkField(field: string | undefined, what = 'field'): string {
    if (!FIELD.test(String(field || ''))) throw new Error(`Invalid ${what} "${field}"`);
    return String(field);
}

function fnOf(aggregate?: AggregateFn, field?: string): AggregateFn {
    const fn = (aggregate || 'count') as AggregateFn;
    if (FNS.indexOf(fn) < 0) throw new Error(`Unknown aggregate "${aggregate}"`);
    if (fn !== 'count' && !field) throw new Error(`Aggregate "${fn}" needs a field`);
    return fn;
}

function num(v: unknown): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v));
    return Number.isFinite(n) ? n : 0;
}

/** One aliased aggregate in a batched document. */
export type AggregatePart = {
    alias: string;
    table: string;
    query?: string;
    groupBy?: string[];
    aggregate?: AggregateFn;
    field?: string;
    groupLimit?: number;
};

/** The raw result of one part: groups (or one ungrouped row) with count and the aggregate value. */
export type RawAggregate = {
    totalCount: number | null;
    totalGroups: number | null;
    groupLabel: string;
    rows: { count: number; value: number; groupBy: { field: string; value: string; displayValue: string }[] }[];
};

/** Build one GraphQL document for several aggregates (aliases a0, a1, …) with its variables. */
export function buildAggregateDocument(parts: AggregatePart[]): { query: string; variables: Record<string, unknown> } {
    const decls: string[] = [];
    const fields: string[] = [];
    const variables: Record<string, unknown> = {};
    parts.forEach((p, i) => {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.alias)) throw new Error(`Invalid alias "${p.alias}"`);
        const fn = fnOf(p.aggregate, p.field);
        const grouped = !!(p.groupBy && p.groupBy.length);
        decls.push(`$t${i}: String!`, `$q${i}: String`);
        variables[`t${i}`] = checkTable(p.table);
        variables[`q${i}`] = p.query || '';
        let args = `tableName: $t${i}, queryConditions: $q${i}`;
        if (grouped) {
            decls.push(`$g${i}: [String]`, `$p${i}: Glide_PaginationInputType`);
            variables[`g${i}`] = p.groupBy!.map((g) => checkField(g, 'group by field'));
            variables[`p${i}`] = { offset: 0, limit: Math.max(1, Math.min(1000, p.groupLimit || 200)) };
            args += `, groupBy: $g${i}, groupPagination: $p${i}`;
        }
        const agg = fn === 'count' ? '' : ` ${fn}(field: "${checkField(p.field)}")`;
        const head = grouped ? 'totalCount totalGroupsCount groupColumnLabel ' : '';
        const gb = grouped ? ' groupBy { field value displayValue }' : '';
        fields.push(`${p.alias}: GlideAggregateRecord_Query(${args}) { ${head}aggregates { count${agg}${gb} } }`);
    });
    return { query: `query RpAnalytics(${decls.join(', ')}) { ${fields.join(' ')} }`, variables };
}

/** Run aggregate parts in one request. Resolves with each alias's raw result. */
export async function fetchAggregates(
    parts: AggregatePart[],
    signal?: AbortSignal
): Promise<Record<string, RawAggregate>> {
    if (!parts.length) return {};
    const { query, variables } = buildAggregateDocument(parts);
    const data: any = await graphql(query, variables, { signal, operationName: 'RpAnalytics' });
    const out: Record<string, RawAggregate> = {};
    parts.forEach((p) => {
        const fn = fnOf(p.aggregate, p.field);
        const node = data && data[p.alias];
        const list: any[] = (node && node.aggregates) || [];
        out[p.alias] = {
            totalCount: node && node.totalCount != null ? num(node.totalCount) : null,
            totalGroups: node && node.totalGroupsCount != null ? num(node.totalGroupsCount) : null,
            groupLabel: (node && node.groupColumnLabel) || '',
            rows: list.map((a) => ({
                count: num(a.count),
                value: fn === 'count' ? num(a.count) : num(a[fn]),
                groupBy: (a.groupBy || []).map((g: any) => ({
                    field: String(g.field || ''),
                    value: g.value == null ? '' : String(g.value),
                    displayValue: g.displayValue == null || g.displayValue === '' ? '' : String(g.displayValue),
                })),
            })),
        };
    });
    return out;
}

/** Combine values the way the aggregate does (count / sum add up; min / max; avg is count-weighted). */
function combine(fn: AggregateFn, items: { value: number; count: number }[]): number {
    if (!items.length) return 0;
    if (fn === 'min') return Math.min(...items.map((x) => x.value));
    if (fn === 'max') return Math.max(...items.map((x) => x.value));
    if (fn === 'avg') {
        const c = items.reduce((a, x) => a + x.count, 0);
        return c ? items.reduce((a, x) => a + x.value * x.count, 0) / c : 0;
    }
    return items.reduce((a, x) => a + x.value, 0);
}

function emptyLabel(v: string, label: string): string {
    return label || v || '(empty)';
}

/**
 * Aggregate a table, optionally grouped by one or two fields, with top N + "Other", sorted, as
 * chart-ready rows. One request.
 */
export async function fetchAggregate(args: AggregateArgs, signal?: AbortSignal): Promise<AggregateResult> {
    const fn = fnOf(args.aggregate, args.field);
    const groupBy = (Array.isArray(args.groupBy) ? args.groupBy : args.groupBy ? [args.groupBy] : [])
        .filter(Boolean)
        .slice(0, 2);
    const base = args.query || '';
    const parts: AggregatePart[] = [
        {
            alias: 'a0',
            table: args.table,
            query: base,
            groupBy,
            aggregate: fn,
            field: args.field,
            groupLimit: args.groupLimit,
        },
    ];
    // Grouped: also the ungrouped total for the record count and the overall value.
    if (groupBy.length) parts.push({ alias: 'a1', table: args.table, query: base, aggregate: fn, field: args.field });
    const raw = await fetchAggregates(parts, signal);
    const main = raw.a0;
    const overall = raw.a1 || main;
    const overallRow = overall.rows[0] || { count: 0, value: 0 };
    const result: AggregateResult = {
        table: args.table,
        aggregate: fn,
        field: args.field,
        value: overallRow.value,
        total: overallRow.count,
        groupField: groupBy[0],
        groupLabel: main.groupLabel,
        groups: [],
        series: [],
        rows: [],
        totalGroups: main.totalGroups != null ? main.totalGroups : main.rows.length,
    };
    if (!groupBy.length) {
        result.rows = [{ key: '', label: 'All', value: overallRow.value, count: overallRow.count, query: base }];
        return result;
    }
    const [g1, g2] = groupBy;
    const byKey = new Map<string, AggregateGroup & { parts: { value: number; count: number }[] }>();
    const seriesMap = new Map<string, AggregateSeries & { total: number }>();
    main.rows.forEach((r) => {
        const a = r.groupBy[0] || { field: g1, value: '', displayValue: '' };
        let g = byKey.get(a.value);
        if (!g) {
            g = {
                key: a.value,
                label: emptyLabel(a.value, a.displayValue),
                value: 0,
                count: 0,
                query: andQueries(base, [groupCondition(g1, a.value)]),
                parts: [],
            };
            byKey.set(a.value, g);
        }
        g.parts.push({ value: r.value, count: r.count });
        g.count += r.count;
        if (g2) {
            const b = r.groupBy[1] || { field: g2, value: '', displayValue: '' };
            const sk = b.value || '__empty';
            g.values = g.values || {};
            g.values[sk] = r.value;
            const s = seriesMap.get(sk) || {
                key: sk,
                label: emptyLabel(b.value, b.displayValue),
                value: b.value,
                total: 0,
            };
            s.total += r.value;
            seriesMap.set(sk, s);
        }
    });
    let groups: AggregateGroup[] = Array.from(byKey.values()).map((g) => {
        const { parts: p, ...rest } = g;
        return { ...rest, value: combine(fn, p) };
    });
    const sort = args.sort || 'value';
    if (sort === 'value') groups.sort((a, b) => b.value - a.value);
    else if (sort === 'value-asc') groups.sort((a, b) => a.value - b.value);
    else if (sort === 'label') groups.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    const limit = args.limit && args.limit > 0 ? Math.floor(args.limit) : 0;
    if (limit && groups.length > limit) {
        const keep = groups.slice(0, limit);
        const rest = groups.slice(limit);
        if (args.otherLabel !== false) {
            const otherValues: Record<string, number> = {};
            rest.forEach((g) => {
                Object.keys(g.values || {}).forEach((k) => {
                    otherValues[k] = (otherValues[k] || 0) + (g.values as Record<string, number>)[k];
                });
            });
            keep.push({
                key: '__other',
                label: args.otherLabel || 'Other',
                value: combine(fn, rest),
                count: rest.reduce((a, g) => a + g.count, 0),
                // Everything not in the kept groups.
                query: andQueries(
                    base,
                    keep.map((g) => (g.key ? `${g1}!=${g.key}` : `${g1}ISNOTEMPTY`))
                ),
                other: true,
                values: g2 ? otherValues : undefined,
            });
        }
        groups = keep;
    }
    const series = Array.from(seriesMap.values())
        .sort((a, b) => b.total - a.total)
        .map(({ total, ...s }) => s);
    result.groups = groups;
    result.series = series;
    result.rows = groups.map((g) => {
        const row: Record<string, any> = { key: g.key, label: g.label, value: g.value, count: g.count, query: g.query };
        if (g2) series.forEach((s) => (row[s.key] = (g.values && g.values[s.key]) || 0));
        return row;
    });
    if (fn === 'count' || fn === 'sum') result.value = overallRow.value;
    return result;
}

/**
 * A time series: the aggregate per bucket (day / week / month / quarter / year) on a date field,
 * the last `periods` buckets ending with the current one; optional groupBy → one series per value.
 * One request (one alias per bucket).
 */
export async function fetchTimeSeries(args: TimeSeriesArgs, signal?: AbortSignal): Promise<TimeSeriesResult> {
    const fn = fnOf(args.aggregate, args.field);
    const interval: Interval = args.interval || 'week';
    const dateField = checkField(args.dateField, 'date field');
    const buckets = timeBuckets(dateField, interval, args.periods || 12, { end: args.end, weekStart: args.weekStart });
    const base = args.query || '';
    const groupBy = args.groupBy ? [checkField(args.groupBy, 'group by field')] : undefined;
    const parts: AggregatePart[] = buckets.map((b, i) => ({
        alias: `b${i}`,
        table: args.table,
        query: andQueries(base, [b.condition]),
        groupBy,
        aggregate: fn,
        field: args.field,
    }));
    const raw = await fetchAggregates(parts, signal);
    const seriesMap = new Map<string, AggregateSeries & { total: number }>();
    const points: TimeSeriesPoint[] = buckets.map((b, i) => {
        const r = raw[`b${i}`];
        const rows = (r && r.rows) || [];
        const p: TimeSeriesPoint = {
            start: b.start,
            end: b.end,
            label: b.label,
            value: groupBy ? combine(fn, rows) : rows[0] ? rows[0].value : 0,
            count: rows.reduce((a, x) => a + x.count, 0),
            query: parts[i].query || '',
        };
        if (groupBy) {
            p.values = {};
            rows.forEach((x) => {
                const g = x.groupBy[0] || { field: '', value: '', displayValue: '' };
                const sk = g.value || '__empty';
                (p.values as Record<string, number>)[sk] = x.value;
                const s = seriesMap.get(sk) || {
                    key: sk,
                    label: emptyLabel(g.value, g.displayValue),
                    value: g.value,
                    total: 0,
                };
                s.total += x.value;
                seriesMap.set(sk, s);
            });
        }
        return p;
    });
    const limit = args.seriesLimit || 6;
    const series = Array.from(seriesMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
        .map(({ total, ...s }) => s);
    const rows = points.map((p) => {
        const row: Record<string, any> = {
            label: p.label,
            start: p.start,
            end: p.end,
            value: p.value,
            count: p.count,
            query: p.query,
        };
        series.forEach((s) => (row[s.key] = (p.values && p.values[s.key]) || 0));
        return row;
    });
    const total =
        fn === 'count' || fn === 'sum' || fn === 'countDistinct'
            ? points.reduce((a, p) => a + p.value, 0)
            : points.length
              ? points[points.length - 1].value
              : 0;
    return { table: args.table, dateField, interval, aggregate: fn, field: args.field, points, series, rows, total };
}

/**
 * A score: the aggregate for the current period vs the previous one (delta, %, trend), a sparkline
 * and a target. Without dateField the score is the whole filter (no comparison). One request.
 */
export async function fetchScore(args: ScoreArgs, signal?: AbortSignal): Promise<ScoreResult> {
    const fn = fnOf(args.aggregate, args.field);
    const base = args.query || '';
    const parts: AggregatePart[] = [];
    let period: ScoreResult['period'] = null;
    let currentQuery = base;
    if (args.dateField) {
        const dateField = checkField(args.dateField, 'date field');
        period = scorePeriods(args.period != null ? args.period : 7);
        currentQuery = andQueries(base, [rangeCondition(dateField, period.current.start, period.current.end)]);
        parts.push({ alias: 'cur', table: args.table, query: currentQuery, aggregate: fn, field: args.field });
        parts.push({
            alias: 'prev',
            table: args.table,
            query: andQueries(base, [rangeCondition(dateField, period.previous.start, period.previous.end)]),
            aggregate: fn,
            field: args.field,
        });
    } else {
        parts.push({ alias: 'cur', table: args.table, query: base, aggregate: fn, field: args.field });
    }
    const spark = args.sparkline === false || !args.dateField ? null : args.sparkline || {};
    const sparkInterval: Interval = (spark && spark.interval) || (periodDays(args.period) <= 31 ? 'day' : 'week');
    const buckets = spark ? timeBuckets(args.dateField as string, sparkInterval, spark.periods || 12) : [];
    buckets.forEach((b, i) =>
        parts.push({
            alias: `s${i}`,
            table: args.table,
            query: andQueries(base, [b.condition]),
            aggregate: fn,
            field: args.field,
        })
    );
    const raw = await fetchAggregates(parts, signal);
    const first = (alias: string) => {
        const r = raw[alias];
        return r && r.rows[0] ? r.rows[0].value : 0;
    };
    const value = first('cur');
    const previous = raw.prev ? first('prev') : null;
    const delta = previous == null ? null : value - previous;
    const deltaPercent = previous ? (delta! / Math.abs(previous)) * 100 : null;
    const trend = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const positive = trend == null || trend === 'flat' ? null : (trend === 'up') !== !!args.lowerIsBetter;
    const sparkline: TimeSeriesPoint[] = buckets.map((b, i) => {
        const r = raw[`s${i}`];
        const row = r && r.rows[0];
        return {
            start: b.start,
            end: b.end,
            label: b.label,
            value: row ? row.value : 0,
            count: row ? row.count : 0,
            query: parts.find((p) => p.alias === `s${i}`)!.query || '',
        };
    });
    const out: ScoreResult = {
        value,
        previous,
        delta,
        deltaPercent,
        trend,
        positive,
        query: currentQuery,
        sparkline,
        period,
    };
    if (args.target != null && Number.isFinite(Number(args.target))) {
        const t = Number(args.target);
        out.target = t;
        out.targetProgress = t ? value / t : 0;
        out.targetMet = args.lowerIsBetter ? value <= t : value >= t;
    }
    return out;
}
