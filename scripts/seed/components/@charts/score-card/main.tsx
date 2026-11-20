import { useNavigate } from '@portal/runtime';
import { DataScore } from 'components:charts/score-tile';
import type { ValueFormat } from 'components:charts/data-chart';
import type { AggregateFn, Interval } from 'utilities:charts/analytics';

type Options = {
    table?: string;
    query?: string;
    label?: string;
    aggregate?: AggregateFn;
    field?: string;
    /** Date field for the period comparison and sparkline (empty = the whole filter, no trend). */
    dateField?: string;
    /** Rolling days (7) or 'week' | 'month' | 'quarter' | 'year' (so far, vs the same span before). */
    period?: number | Interval;
    sparkline?: boolean;
    sparklineInterval?: Interval;
    sparklinePeriods?: number;
    sparklineType?: 'line' | 'area' | 'bar';
    target?: number;
    lowerIsBetter?: boolean;
    format?: ValueFormat;
    unit?: string;
    icon?: string;
    /** Sparkline colour: chart-1 … chart-5 or any CSS colour. */
    color?: string;
    /** Click-through: the list page opened with the current period's filter. */
    listPage?: string;
    live?: boolean;
    refreshInterval?: number;
};

function colorOf(c?: string) {
    if (!c) return undefined;
    return /^chart-[1-5]$/.test(c) ? `var(--${c})` : c;
}

/**
 * Score Card: a KPI tile (charts/score-tile's DataScore): value, trend arrow, delta % vs the previous
 * period, sparkline, target; click-through to `listPage` with the current period's filter.
 */
export default function ScoreCard({ options = {} }: { options?: Options }) {
    const navigate = useNavigate();
    const table = options.table || 'incident';
    const period =
        options.period != null && /^\d+$/.test(String(options.period)) ? Number(options.period) : options.period;
    return (
        <DataScore
            table={table}
            query={options.query}
            label={options.label || 'Score'}
            aggregate={options.aggregate}
            field={options.field}
            dateField={options.dateField}
            period={period}
            sparkline={options.sparkline}
            sparklineInterval={options.sparklineInterval}
            sparklinePeriods={options.sparklinePeriods}
            sparklineType={options.sparklineType}
            target={options.target}
            lowerIsBetter={options.lowerIsBetter}
            format={options.format}
            unit={options.unit}
            icon={options.icon}
            color={colorOf(options.color)}
            live={options.live}
            refreshInterval={options.refreshInterval}
            onSelect={
                options.listPage ? ({ query }) => navigate(options.listPage as string, { table, query }) : undefined
            }
        />
    );
}
