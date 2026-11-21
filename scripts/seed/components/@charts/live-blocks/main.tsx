/**
 * components:charts/live-blocks: thin adapters that feed existing chart gallery blocks with live records
 * (utilities:charts/analytics, aggregates as the user). Each adapter only builds the block's own data props;
 * the block itself is unchanged.
 *
 *   LiveIncidentImpressions  charts/campaign-impressions: records opened per bucket this period vs the prior
 *                            one, split by groupBy (priority) as the "channels". 7 / 30 / 90 day periods, 54
 *                            grouped counts in one aggregate request.
 *                            <LiveIncidentImpressions query="active=true" live />
 *   LiveIncidentKpis         charts/kpi-strip: useScore tiles (opened, resolved, critical opened, breached SLA
 *                            over the last 7 days vs the 7 before, daily sparkline).
 *                            <LiveIncidentKpis period={14} kpis={[{ key, label, query?, dateField?, seriesLabel? }]} />
 *   LiveIncidentTrends       charts/order-metrics: one row per priority, resolved per day over 30 days and the
 *                            change vs the prior 30 (one useTimeSeries request).
 *                            <LiveIncidentTrends dateField="opened_at" verb="opened" days={14} />
 *
 * Common props: table (default 'incident'), query, dateField, groupBy / groups (raw value, label, light / dark
 * Tailwind palette colours), live (record watch refetch), refreshInterval (seconds), title, className.
 * Skipped: inventory-velocity (on-hand stock, days of supply and warehouses have no incident meaning).
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */
export { LiveIncidentImpressions, useIncidentImpressionPeriods } from './impressions';
export type { LiveIncidentImpressionsProps } from './impressions';
export { LiveIncidentKpis, DEFAULT_KPIS } from './kpis';
export type { LiveIncidentKpisProps, LiveKpiSpec } from './kpis';
export { LiveIncidentTrends } from './trends';
export type { LiveIncidentTrendsProps } from './trends';
export { PRIORITY_GROUPS, groupKey } from './shared';
export type { LiveGroup } from './shared';
import { LiveIncidentImpressions } from './impressions';

export default LiveIncidentImpressions;
