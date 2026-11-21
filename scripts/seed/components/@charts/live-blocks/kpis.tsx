import { KpiStrip } from 'components:charts/kpi-strip';
import { useScore } from 'utilities:charts/analytics';
import { andQueries } from 'utilities:app/list-data';
import { weekday } from './shared';

/** One live KPI: a count of table records matching query, by dateField, this period vs the previous one. */
export type LiveKpiSpec = {
    key: string;
    label: string;
    /** Extra filter ANDed with the adapter's query. */
    query?: string;
    /** Date field for the period and sparkline (default the adapter's dateField). */
    dateField?: string;
    /** Series name in the sparkline tooltip. */
    seriesLabel?: string;
};

export type LiveIncidentKpisProps = {
    title?: string;
    table?: string;
    query?: string;
    dateField?: string;
    /** Rolling period in days (default 7); the sparkline shows one point per day of it plus today. */
    period?: number;
    /** Up to four tiles read best; default opened, resolved, critical opened, breached SLA. */
    kpis?: LiveKpiSpec[];
    color?: [string, string];
    live?: boolean;
    refreshInterval?: number;
    className?: string;
};

export const DEFAULT_KPIS: LiveKpiSpec[] = [
    { key: 'opened', label: 'Incidents Opened', seriesLabel: 'Opened' },
    { key: 'resolved', label: 'Incidents Resolved', dateField: 'resolved_at', seriesLabel: 'Resolved' },
    { key: 'critical', label: 'Critical Opened', query: 'priority=1', seriesLabel: 'Critical' },
    { key: 'breached', label: 'Breached SLA', query: 'made_sla=false', seriesLabel: 'Breached' },
];

const MAX_KPIS = 6;

/** One tile's score (a hook per slot keeps the hook order stable). */
function useKpi(spec: LiveKpiSpec | undefined, p: LiveIncidentKpisProps) {
    const period = p.period || 7;
    const s = useScore(
        {
            table: p.table || 'incident',
            query: andQueries(p.query || '', spec && spec.query ? [spec.query] : []),
            dateField: (spec && spec.dateField) || p.dateField || 'opened_at',
            period,
            sparkline: { interval: 'day', periods: period + 1 },
        },
        { enabled: !!spec, live: !!p.live, refreshInterval: p.refreshInterval }
    );
    if (!spec) return null;
    const d = s.data;
    const points = d ? d.sparkline : [];
    return {
        key: spec.key,
        label: spec.label,
        value: d ? d.value.toLocaleString('en-US') : '-',
        trend: d && d.deltaPercent != null ? Math.round(d.deltaPercent * 100) / 100 : 0,
        trendLabel: `vs prior ${period} days`,
        seriesLabel: spec.seriesLabel || spec.label,
        format: 'number' as const,
        data: points.length
            ? points.map((x, i) => ({ day: i === points.length - 1 ? 'Today' : weekday(x.start), value: x.value }))
            : [
                  { day: '', value: 0 },
                  { day: '', value: 0 },
              ],
    };
}

/**
 * LiveIncidentKpis: charts/kpi-strip fed with live records. Each tile is a useScore count over the last
 * `period` days vs the `period` days before (trend %), with a daily sparkline. KpiStrip colours the badge
 * by sign (up = green), so for counts where up is bad (opened, breached) green means "more".
 */
export function LiveIncidentKpis(props: LiveIncidentKpisProps) {
    const specs = (props.kpis || DEFAULT_KPIS).slice(0, MAX_KPIS);
    const k0 = useKpi(specs[0], props);
    const k1 = useKpi(specs[1], props);
    const k2 = useKpi(specs[2], props);
    const k3 = useKpi(specs[3], props);
    const k4 = useKpi(specs[4], props);
    const k5 = useKpi(specs[5], props);
    const kpis = [k0, k1, k2, k3, k4, k5].filter(Boolean) as any[];
    return (
        <KpiStrip title={props.title || 'Incident KPIs'} kpis={kpis} color={props.color} className={props.className} />
    );
}

export default LiveIncidentKpis;
