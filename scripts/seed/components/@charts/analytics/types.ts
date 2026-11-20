/** Aggregate functions the platform's aggregate API supports. */
export type AggregateFn = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct';

/** Time bucket size for time series and score periods. */
export type Interval = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type AggregateArgs = {
    table: string;
    /** Encoded query (filter). */
    query?: string;
    /** Group by one field ('priority') or two (['priority', 'state'] → one series per second-field value). */
    groupBy?: string | string[];
    /** Default 'count'. */
    aggregate?: AggregateFn;
    /** The field for sum / avg / min / max / countDistinct. */
    field?: string;
    /** Group order: 'value' (descending, default), 'value-asc', 'label', 'group' (the platform's order). */
    sort?: 'value' | 'value-asc' | 'label' | 'group';
    /** Top N groups; the rest fold into one "Other" group (otherLabel; false drops them). */
    limit?: number;
    otherLabel?: string | false;
    /** Max groups the platform returns (default 200). */
    groupLimit?: number;
};

/** One group of an aggregate (first group-by field). */
export type AggregateGroup = {
    /** Raw value ('1'), '' for empty. */
    key: string;
    /** Display value ('1 - Critical'). */
    label: string;
    /** The aggregate (count, or sum / avg / … of field) as a number. */
    value: number;
    count: number;
    /** Encoded query for this group's records (the base filter AND the group condition): click-through. */
    query: string;
    /** Folded "Other" group (top N). */
    other?: boolean;
    /** Two group-by fields: values per series key (the second field's raw value). */
    values?: Record<string, number>;
};

export type AggregateSeries = { key: string; label: string; value: string };

export type AggregateResult = {
    table: string;
    aggregate: AggregateFn;
    field?: string;
    /** Overall aggregate (no groupBy), else the sum of group values for count / sum. */
    value: number;
    /** Records matching the filter. */
    total: number;
    groupField?: string;
    groupLabel?: string;
    groups: AggregateGroup[];
    /** Two group-by fields: the second field's values as series. */
    series: AggregateSeries[];
    /**
     * Chart-ready rows: { key, label, query, value } per group, plus one column per series key with
     * two group-by fields. Use with components:chart: <Chart data={rows} index="label" series={…} />.
     */
    rows: Record<string, any>[];
    /** Groups the platform found (before top N). */
    totalGroups: number;
};

export type TimeSeriesArgs = {
    table: string;
    query?: string;
    /** Date / date-time field the buckets apply to ('opened_at'). */
    dateField: string;
    /** Default 'week'. */
    interval?: Interval;
    /** Number of buckets ending with the current one (default 12). */
    periods?: number;
    aggregate?: AggregateFn;
    field?: string;
    /** One series per value of this field (opened per week by priority). */
    groupBy?: string;
    /** First day of the week: 1 = Monday (default), 0 = Sunday. */
    weekStart?: 0 | 1;
    /** The last bucket ends at this date (YYYY-MM-DD); default today. */
    end?: string;
    /** Max series with groupBy (top by total; default 6). */
    seriesLimit?: number;
};

export type TimeBucket = {
    /** Bucket start 'YYYY-MM-DD' (inclusive). */
    start: string;
    /** Next bucket start 'YYYY-MM-DD' (exclusive). */
    end: string;
    /** Short label ('Nov 16', 'Nov 2026', 'Q4 2026'). */
    label: string;
    /** Encoded condition for the bucket on the date field. */
    condition: string;
};

export type TimeSeriesPoint = {
    start: string;
    end: string;
    label: string;
    value: number;
    count: number;
    /** Click-through query for the bucket (base filter AND the bucket's date range). */
    query: string;
    /** With groupBy: value per series key. */
    values?: Record<string, number>;
};

export type TimeSeriesResult = {
    table: string;
    dateField: string;
    interval: Interval;
    aggregate: AggregateFn;
    field?: string;
    points: TimeSeriesPoint[];
    series: AggregateSeries[];
    /** Chart-ready rows: { label, start, end, query, value, [seriesKey]… }. */
    rows: Record<string, any>[];
    /** Sum of point values (count / sum), or the last value otherwise. */
    total: number;
};

export type ScoreArgs = {
    table: string;
    query?: string;
    aggregate?: AggregateFn;
    field?: string;
    /** Date field for the period comparison and sparkline; without it the score is the whole filter. */
    dateField?: string;
    /** Rolling period: a number of days (7), or a calendar interval ('month' = this month so far). Default 7. */
    period?: number | Interval;
    /** Sparkline: buckets (default 'day' for periods ≤ 31 days, else 'week') and how many (default 12). */
    sparkline?: false | { interval?: Interval; periods?: number };
    /** Target value (shows progress to target and whether it's met). */
    target?: number;
    /** Lower is better (resolve time, backlog): flips the trend colour. */
    lowerIsBetter?: boolean;
};

export type ScoreResult = {
    value: number;
    previous: number | null;
    /** value - previous. */
    delta: number | null;
    /** Percent change vs previous (null when previous is 0 or missing). */
    deltaPercent: number | null;
    trend: 'up' | 'down' | 'flat' | null;
    /** The change is good (up and higher is better, or down and lower is better); null if no trend. */
    positive: boolean | null;
    target?: number;
    /** value / target (0…), when target is set. */
    targetProgress?: number;
    targetMet?: boolean;
    /** Click-through query for the current period. */
    query: string;
    /** The sparkline values (oldest first) with their buckets. */
    sparkline: TimeSeriesPoint[];
    period: { current: { start: string; end: string }; previous: { start: string; end: string } } | null;
};
