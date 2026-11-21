import { useMemo } from 'react';
import { OrderMetrics } from 'components:charts/order-metrics';
import { useTimeSeries } from 'utilities:charts/analytics';
import { PRIORITY_GROUPS, change } from './shared';
import type { LiveGroup } from './shared';

export type LiveIncidentTrendsProps = {
    title?: string;
    table?: string;
    query?: string;
    /** Date field counted per day (default 'resolved_at': resolutions, where up is good). */
    dateField?: string;
    /** One row per value of this field (default 'priority'). */
    groupBy?: string;
    groups?: LiveGroup[];
    /** Days per period (default 30); the request covers two periods (this one and the prior one). */
    days?: number;
    /** Label after each group's name (default 'resolved'). */
    verb?: string;
    live?: boolean;
    refreshInterval?: number;
    className?: string;
};

/**
 * LiveIncidentTrends: charts/order-metrics fed with live records, one row per group (incident priority by
 * default): records per day on dateField over the last `days` days (sum as the value, daily counts as the
 * sparkline) and the change vs the prior `days` days. One useTimeSeries request (2 × days day buckets).
 * OrderMetrics colours rows by sign (up = green), which reads right for resolutions, the default.
 */
export function LiveIncidentTrends({
    title = 'Resolved by Priority',
    table = 'incident',
    query = '',
    dateField = 'resolved_at',
    groupBy = 'priority',
    groups = PRIORITY_GROUPS,
    days = 30,
    verb = 'resolved',
    live = false,
    refreshInterval,
    className,
}: LiveIncidentTrendsProps) {
    const n = Math.max(2, Math.min(60, Math.floor(days)));
    const ts = useTimeSeries(
        { table, query, dateField, interval: 'day', periods: n * 2, groupBy, seriesLimit: 50 },
        { live, refreshInterval }
    );
    const { metrics, domain } = useMemo(() => {
        let max = 1;
        const list = groups.map((g) => {
            const daily = ts.points.map((p: any) => (p.values ? Number(p.values[g.value]) || 0 : 0));
            const prior = daily.slice(0, n).reduce((s: number, v: number) => s + v, 0);
            const trend = daily.length ? daily.slice(-n) : new Array(n).fill(0);
            const cur = trend.reduce((s: number, v: number) => s + v, 0);
            max = Math.max(max, ...trend);
            return {
                key: g.value,
                label: `${g.label} ${verb}, last ${n} days`,
                value: ts.isLoading ? '-' : cur.toLocaleString('en-US'),
                change: change(cur, prior),
                trend,
            };
        });
        return { metrics: list, domain: [0, Math.ceil(max * 1.15)] as [number, number] };
    }, [ts.points, ts.isLoading, groups, n, verb]);
    if (ts.error) {
        return (
            <div className="flex min-h-32 w-full items-center justify-center rounded-xl border border-border p-6 text-sm text-destructive">
                {`Couldn't load the trends: ${ts.error.message}`}
            </div>
        );
    }
    return <OrderMetrics title={title} metrics={metrics} domain={domain} className={className} />;
}

export default LiveIncidentTrends;
