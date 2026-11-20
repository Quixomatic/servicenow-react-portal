import { useState } from 'react';
import { useNavigate } from '@portal/runtime';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from 'components:card';
import { ChartViewToggle } from 'components:chart';
import { DataChart } from 'components:charts/data-chart';
import type { ChartType, ValueFormat } from 'components:charts/data-chart';
import type { AggregateFn, Interval } from 'utilities:charts/analytics';

type Options = {
    table?: string;
    query?: string;
    title?: string;
    description?: string;
    type?: ChartType;
    groupBy?: string;
    stackBy?: string;
    aggregate?: AggregateFn;
    field?: string;
    sort?: 'value' | 'value-asc' | 'label' | 'group';
    limit?: number;
    dateField?: string;
    interval?: Interval;
    periods?: number;
    format?: ValueFormat;
    valueLabel?: string;
    height?: number;
    variant?: 'default' | 'gradient' | 'hatched';
    showLegend?: boolean;
    showLabels?: boolean;
    glow?: boolean;
    /** Click-through: the list page (route) opened with the clicked group's filter. */
    listPage?: string;
    /** View as table toggle in the header (default on). */
    tableToggle?: boolean;
    /** Visible text summary under the chart. */
    showSummary?: boolean;
    live?: boolean;
    refreshInterval?: number;
};

/**
 * Chart Card: a charts/data-chart in a card, configured by options (table, filter, group by,
 * aggregate, chart type, time field + interval, top N). Clicking a bar / slice / point (or a row of
 * "View as table") opens `listPage` with that group's filter as the `table` and `query` page params.
 */
export default function ChartCard({ options = {} }: { options?: Options }) {
    const navigate = useNavigate();
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const table = options.table || 'incident';
    const onSelect = options.listPage
        ? ({ query }: { query: string }) => navigate(options.listPage as string, { table, query })
        : undefined;
    return (
        <Card className="h-full">
            {options.title || options.tableToggle !== false ? (
                <CardHeader>
                    {options.title ? <CardTitle>{options.title}</CardTitle> : null}
                    {options.description ? <CardDescription>{options.description}</CardDescription> : null}
                    {options.tableToggle !== false ? (
                        <CardAction>
                            <ChartViewToggle view={view} onViewChange={setView} />
                        </CardAction>
                    ) : null}
                </CardHeader>
            ) : null}
            <CardContent className="flex-1">
                <DataChart
                    table={table}
                    query={options.query}
                    type={options.type}
                    groupBy={options.groupBy}
                    stackBy={options.stackBy}
                    aggregate={options.aggregate}
                    field={options.field}
                    sort={options.sort}
                    limit={options.limit}
                    dateField={options.dateField}
                    interval={options.interval}
                    periods={options.periods}
                    format={options.format}
                    valueLabel={options.valueLabel}
                    height={options.height}
                    variant={options.variant}
                    showLegend={options.showLegend}
                    showLabels={options.showLabels}
                    glow={options.glow}
                    title={options.title}
                    showSummary={options.showSummary}
                    view={view}
                    onSelect={onSelect}
                    live={options.live}
                    refreshInterval={options.refreshInterval}
                />
            </CardContent>
        </Card>
    );
}
