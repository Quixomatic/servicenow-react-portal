import { useMemo } from 'react';
import { useQuery, keepPreviousData } from 'utilities:react-query';
import { CampaignImpressions } from 'components:charts/campaign-impressions';
import { fetchAggregates, useAnalyticsLive, analyticsKeys, rangeCondition } from 'utilities:charts/analytics';
import type { AggregatePart, RawAggregate } from 'utilities:charts/analytics';
import { andQueries } from 'utilities:app/list-data';
import { PRIORITY_GROUPS, groupKey, shortDay, dayOffset, todayKey } from './shared';
import type { LiveGroup } from './shared';

export type LiveIncidentImpressionsProps = {
    title?: string;
    description?: string;
    table?: string;
    query?: string;
    /** Date field a record's bucket comes from (default 'opened_at'). */
    dateField?: string;
    /** Field whose values become the block's channels (default 'priority'). */
    groupBy?: string;
    /** Channels: raw values of groupBy with labels and colours (default incident priorities 1 to 4). */
    groups?: LiveGroup[];
    defaultPeriod?: '7d' | '30d' | '90d';
    unit?: string;
    live?: boolean;
    refreshInterval?: number;
    className?: string;
};

/** The block's three periods: buckets × bucket size in days (the same shapes as its sample data). */
const SPECS = [
    { key: '7d', label: 'Last 7 days', days: 7, buckets: 7, size: 1 },
    { key: '30d', label: 'Last 30 days', days: 30, buckets: 10, size: 3 },
    { key: '90d', label: 'Last 90 days', days: 90, buckets: 10, size: 9 },
];

type Bucket = { period: string; index: number; start: string; end: string; prevStart: string; prevEnd: string };

function buckets(): Bucket[] {
    const out: Bucket[] = [];
    SPECS.forEach((s) => {
        for (let b = 0; b < s.buckets; b++) {
            const from = -s.days + 1 + b * s.size;
            out.push({
                period: s.key,
                index: b,
                start: dayOffset(from),
                end: dayOffset(from + s.size),
                prevStart: dayOffset(from - s.days),
                prevEnd: dayOffset(from + s.size - s.days),
            });
        }
    });
    return out;
}

/**
 * Incidents per bucket split by groupBy, this period and the prior one, for the block's 7 / 30 / 90 day
 * periods: 54 grouped counts in ONE aggregate request (utilities:charts/analytics fetchAggregates).
 */
export function useIncidentImpressionPeriods({
    table = 'incident',
    query = '',
    dateField = 'opened_at',
    groupBy = 'priority',
    groups = PRIORITY_GROUPS,
    live = false,
    refreshInterval,
}: LiveIncidentImpressionsProps) {
    useAnalyticsLive(table, query, { live, refreshInterval });
    const day = todayKey();
    const list = useMemo(() => buckets(), [day]);
    const q = useQuery<Record<string, RawAggregate>>({
        queryKey: analyticsKeys
            .table(table)
            .concat(['live-impressions', JSON.stringify([query, dateField, groupBy]), day]),
        queryFn: ({ signal }: { signal: AbortSignal }) => {
            const parts: AggregatePart[] = [];
            list.forEach((b) => {
                parts.push({
                    alias: `c_${b.period}_${b.index}`,
                    table,
                    query: andQueries(query, [rangeCondition(dateField, b.start, b.end)]),
                    groupBy: [groupBy],
                });
                parts.push({
                    alias: `p_${b.period}_${b.index}`,
                    table,
                    query: andQueries(query, [rangeCondition(dateField, b.prevStart, b.prevEnd)]),
                    groupBy: [groupBy],
                });
            });
            return fetchAggregates(parts, signal);
        },
        staleTime: 30000,
        refetchInterval: refreshInterval && refreshInterval > 0 ? refreshInterval * 1000 : false,
        placeholderData: keepPreviousData,
    });

    const periods = useMemo(() => {
        const raw = q.data || {};
        const byGroup = (alias: string) => {
            const out: Record<string, number> = {};
            const r = raw[alias];
            ((r && r.rows) || []).forEach((x) => {
                const g = x.groupBy[0];
                out[g ? g.value : ''] = x.count;
            });
            return out;
        };
        const result: Record<string, any> = {};
        SPECS.forEach((s) => {
            const mine = list.filter((b) => b.period === s.key);
            const data = mine.map((b) => {
                const cur = byGroup(`c_${s.key}_${b.index}`);
                const prev = byGroup(`p_${s.key}_${b.index}`);
                const row: Record<string, any> = {
                    start: shortDay(b.start),
                    end: shortDay(dayOffset(-s.days + (b.index + 1) * s.size)),
                    days: s.size,
                    prior: groups.reduce((sum, g) => sum + (prev[g.value] || 0), 0),
                };
                groups.forEach((g) => {
                    row[groupKey(g.value)] = cur[g.value] || 0;
                });
                return row;
            });
            const first = mine[0];
            result[s.key] = {
                label: s.label,
                days: s.days,
                data,
                range: `${shortDay(first.start)} to ${shortDay(dayOffset(0))} vs ${shortDay(first.prevStart)} to ${shortDay(dayOffset(-s.days))}`,
            };
        });
        return result;
    }, [q.data, list, groups]);

    return { periods, loading: q.isLoading, error: (q.error as Error | null) || null };
}

/**
 * LiveIncidentImpressions: charts/campaign-impressions fed with live records. "Impressions" become records
 * opened per bucket (this period as the area, the prior period dashed), "channels" become the groupBy values
 * (incident priorities by default). Only the block's own props are used: periods, channels, unit, title.
 */
export function LiveIncidentImpressions(props: LiveIncidentImpressionsProps) {
    const {
        title = 'Incidents Opened',
        description,
        groups = PRIORITY_GROUPS,
        defaultPeriod = '30d',
        unit = 'incidents',
        live = false,
        className,
    } = props;
    const { periods, error } = useIncidentImpressionPeriods(props);
    const channels = useMemo(
        () => groups.map((g) => ({ key: groupKey(g.value), label: g.label, light: g.light, dark: g.dark })),
        [groups]
    );
    if (error) {
        return (
            <div className="flex min-h-32 w-full items-center justify-center rounded-xl border border-border p-6 text-sm text-destructive">
                {`Couldn't load ${unit}: ${error.message}`}
            </div>
        );
    }
    return (
        <CampaignImpressions
            title={title}
            description={description || `Opened by ${props.groupBy || 'priority'} through ${shortDay(dayOffset(0))}`}
            periods={periods}
            defaultPeriod={defaultPeriod}
            channels={channels}
            unit={unit}
            updatedLabel={live ? 'Live' : 'Updated on load'}
            className={className}
        />
    );
}

export default LiveIncidentImpressions;
