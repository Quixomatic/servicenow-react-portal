import { useMemo } from 'react';
import { Chart, formatNumber, formatDuration } from 'components:chart';
import { useAggregate, useTimeSeries } from 'utilities:charts/analytics';
import type { AggregateFn, Interval } from 'utilities:charts/analytics';

/**
 * components:charts/data-chart: a chart bound to platform data (now-uxf-visualization-connected's
 * role): a table + filter, aggregated as the user by utilities:charts/analytics, drawn by the
 * components:chart blocks.
 *
 *   <DataChart table="incident" query="active=true" groupBy="priority" type="bar" />
 *   <DataChart table="incident" groupBy="state" type="donut" limit={5} />
 *   <DataChart table="incident" groupBy="priority" stackBy="state" type="bar-stacked" />
 *   <DataChart table="incident" dateField="opened_at" interval="week" periods={12} type="area" />
 *   <DataChart table="incident" query="resolved_atISNOTEMPTY" groupBy="priority"
 *              aggregate="avg" field="calendar_stc" format="duration" />
 *
 * Modes: with dateField it is a time series (one point per bucket; groupBy → one series per
 * value), else an aggregate grouped by groupBy (stackBy → one series per second-field value).
 * onSelect({ query, label, row }) gets the encoded filter of the clicked bar / slice / point (and of
 * the "View as table" rows), for a click-through to a list page.
 *
 * Reusable: useDataChart(props) → { rows, series, index, loading, error, timeSeries, total }, and
 * valueFormatterFor(format).
 */

export type ChartType =
    | 'bar'
    | 'bar-horizontal'
    | 'bar-stacked'
    | 'line'
    | 'area'
    | 'area-stacked'
    | 'pie'
    | 'donut'
    | 'radial';

export type ValueFormat = 'number' | 'compact' | 'duration' | 'percent';

export type DataChartSelection = { query: string; label: string; row: Record<string, any> };

export type DataChartProps = {
    table: string;
    query?: string;
    type?: ChartType;
    groupBy?: string;
    stackBy?: string;
    aggregate?: AggregateFn;
    field?: string;
    sort?: 'value' | 'value-asc' | 'label' | 'group';
    limit?: number;
    otherLabel?: string | false;
    dateField?: string;
    interval?: Interval;
    periods?: number;
    seriesLimit?: number;
    format?: ValueFormat;
    /** Series label for a single-series chart (default: "Count", "Average <field>"…). */
    valueLabel?: string;
    height?: number;
    title?: string;
    summary?: string;
    showSummary?: boolean;
    view?: 'chart' | 'table';
    variant?: 'default' | 'gradient' | 'hatched';
    showLegend?: boolean;
    showLabels?: boolean;
    glow?: boolean;
    onSelect?: (selection: DataChartSelection) => void;
    live?: boolean;
    refreshInterval?: number;
    className?: string;
};

/** Value formatter for a format name. */
export function valueFormatterFor(format?: ValueFormat): ((v: any) => string) | undefined {
    if (format === 'duration') return (v: any) => formatDuration(v);
    if (format === 'compact') return (v: any) => formatNumber(v, { compact: true });
    if (format === 'percent') return (v: any) => formatNumber(v, { percent: true, decimals: 1 });
    return (v: any) => formatNumber(v);
}

const AGG_LABEL: Record<string, string> = {
    count: 'Count',
    sum: 'Total',
    avg: 'Average',
    min: 'Minimum',
    max: 'Maximum',
    countDistinct: 'Distinct',
};

function fieldLabel(field?: string) {
    if (!field) return '';
    const last = field.split('.').pop() || field;
    return last.replace(/_/g, ' ');
}

/** The data behind a DataChart (both modes), chart-ready. */
export function useDataChart(props: DataChartProps) {
    const timeSeries = !!props.dateField;
    const options = { live: props.live, refreshInterval: props.refreshInterval };
    const agg = useAggregate(
        {
            table: props.table,
            query: props.query,
            groupBy: props.stackBy ? [props.groupBy || '', props.stackBy].filter(Boolean) : props.groupBy,
            aggregate: props.aggregate,
            field: props.field,
            sort: props.sort,
            limit: props.limit,
            otherLabel: props.otherLabel,
        },
        { ...options, enabled: !timeSeries && !!props.table }
    );
    const ts = useTimeSeries(
        {
            table: props.table,
            query: props.query,
            dateField: props.dateField || '',
            interval: props.interval,
            periods: props.periods,
            aggregate: props.aggregate,
            field: props.field,
            groupBy: props.groupBy,
            seriesLimit: props.seriesLimit,
        },
        { ...options, enabled: timeSeries && !!props.table }
    );
    const src = timeSeries ? ts : agg;
    const valueLabel =
        props.valueLabel ||
        (props.aggregate && props.aggregate !== 'count'
            ? `${AGG_LABEL[props.aggregate] || props.aggregate} ${fieldLabel(props.field)}`.trim()
            : 'Count');
    const series = useMemo(() => {
        const multi = timeSeries ? !!props.groupBy : !!props.stackBy;
        if (multi && src.series.length) return src.series.map((s: any) => ({ key: s.key, label: s.label }));
        return [{ key: 'value', label: valueLabel }];
    }, [src.series, timeSeries, props.groupBy, props.stackBy, valueLabel]);
    return {
        rows: src.rows as Record<string, any>[],
        series,
        index: 'label',
        valueLabel,
        timeSeries,
        loading: src.isLoading,
        fetching: src.isFetching,
        error: src.error,
        refetch: src.refetch,
        total: timeSeries ? ts.total : agg.total,
        /** The group-by field's label from the platform ('Assignment group'). */
        groupLabel: (!timeSeries && agg.data && agg.data.groupLabel) || '',
    };
}

/** A chart bound to a table (see above). */
export function DataChart(props: DataChartProps) {
    const d = useDataChart(props);
    const type = props.type || (d.timeSeries ? 'area' : 'bar');
    const format = valueFormatterFor(props.format);
    const height = props.height || 260;
    if (d.loading) {
        return (
            <div
                aria-busy="true"
                aria-label="Loading chart data"
                className="w-full animate-pulse rounded-lg bg-muted/60"
                style={{ height }}
            />
        );
    }
    if (d.error) {
        return (
            <div
                role="alert"
                className="flex w-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
                style={{ height }}
            >
                Couldn't load the chart data: {d.error.message}
            </div>
        );
    }
    if (!d.rows.length || d.rows.every((r) => !r.value && !r.count)) {
        return (
            <div
                className="flex w-full items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                style={{ height }}
            >
                No data for this filter.
            </div>
        );
    }
    const onValueClick = props.onSelect
        ? ({ row }: { row: Record<string, any> }) => {
              if (row && row.query != null)
                  props.onSelect!({ query: String(row.query), label: String(row.label), row });
          }
        : undefined;
    const pieLike = type === 'pie' || type === 'donut' || type === 'radial';
    return (
        <Chart
            type={type}
            data={d.rows}
            index={d.index}
            indexLabel={d.timeSeries ? 'Period' : d.groupLabel || fieldLabel(props.groupBy) || 'Group'}
            series={d.series}
            valueKey={pieLike ? 'value' : undefined}
            valueLabel={d.valueLabel}
            valueFormatter={format}
            valueTickFormatter={props.format === 'duration' ? (v: any) => formatDuration(v, 1) : undefined}
            height={pieLike ? undefined : height}
            title={props.title}
            summary={props.summary}
            showSummary={props.showSummary}
            view={props.view}
            variant={props.variant}
            showLegend={props.showLegend}
            showLabels={props.showLabels}
            glow={props.glow}
            timeSeries={d.timeSeries}
            summaryTotal={!props.aggregate || ['count', 'sum', 'countDistinct'].indexOf(props.aggregate) >= 0}
            onValueClick={onValueClick}
            frameClassName={props.className}
        />
    );
}

export default DataChart;
