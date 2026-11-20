import { Sparkline, formatNumber } from 'components:chart';
import { Icon } from 'components:icon';
import { useScore } from 'utilities:app/analytics';
import type { AggregateFn, Interval, ScoreResult } from 'utilities:app/analytics';
import { valueFormatterFor } from 'components:app/data-chart';
import type { ValueFormat } from 'components:app/data-chart';

/**
 * components:app/score-tile: KPI tiles (now-score-basic / -advanced): value, trend arrow, delta %,
 * period comparison, sparkline and target.
 *
 *   <ScoreTile label="Open P1" value={17} deltaPercent={12.5} trend="up" positive={false}
 *              sparkline={[3, 5, 4, 8]} target={10} />                       (presentational)
 *   <DataScore table="incident" query="active=true^priority=1" label="Open P1"
 *              dateField="opened_at" period={7} lowerIsBetter />            (bound, via useScore)
 *
 * onClick (ScoreTile) / onSelect({ query }) (DataScore) makes the tile a button: the click-through
 * gets the current period's encoded filter.
 */

export type ScoreTileProps = {
    label: string;
    value: number | string | null | undefined;
    format?: ValueFormat;
    /** Unit after the value ("tickets"). */
    unit?: string;
    delta?: number | null;
    deltaPercent?: number | null;
    trend?: 'up' | 'down' | 'flat' | null;
    /** The change is good (green) or bad (red); null = neutral. */
    positive?: boolean | null;
    /** "vs previous 7 days". */
    comparisonLabel?: string;
    sparkline?: number[];
    sparklineType?: 'line' | 'area' | 'bar';
    target?: number;
    targetMet?: boolean;
    icon?: string;
    color?: string;
    loading?: boolean;
    error?: Error | null;
    onClick?: () => void;
    className?: string;
};

/** Trend arrow (inline SVG: no icon sprite load for a non-curated name). */
function TrendArrow({ trend }: { trend?: string | null }) {
    const common = {
        className: 'size-3.5',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };
    if (trend === 'up')
        return (
            <svg {...common}>
                <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
                <path d="M16 7h6v6" />
            </svg>
        );
    if (trend === 'down')
        return (
            <svg {...common}>
                <path d="M22 17 13.5 8.5 8.5 13.5 2 7" />
                <path d="M16 17h6v-6" />
            </svg>
        );
    return (
        <svg {...common}>
            <path d="M5 12h14" />
        </svg>
    );
}

function toneClass(positive?: boolean | null) {
    if (positive === true) return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
    if (positive === false) return 'bg-red-500/12 text-red-700 dark:text-red-300';
    return 'bg-muted text-muted-foreground';
}

/** Presentational KPI tile. */
export function ScoreTile(props: ScoreTileProps) {
    const fmt = valueFormatterFor(props.format) || ((v: any) => formatNumber(v));
    const shown =
        props.value == null || props.value === ''
            ? '—'
            : typeof props.value === 'number'
              ? fmt(props.value)
              : props.value;
    const hasDelta = props.deltaPercent != null || props.delta != null;
    const deltaText =
        props.deltaPercent != null
            ? `${props.deltaPercent > 0 ? '+' : ''}${formatNumber(props.deltaPercent, { decimals: 1 })}%`
            : props.delta != null
              ? `${props.delta > 0 ? '+' : ''}${fmt(props.delta)}`
              : '';
    const progress =
        props.target && typeof props.value === 'number' ? Math.max(0, Math.min(1, props.value / props.target)) : null;
    const spoken = [
        `${props.label}: ${shown}${props.unit ? ` ${props.unit}` : ''}`,
        hasDelta ? `${deltaText} ${props.comparisonLabel || 'vs previous period'}` : '',
        props.target != null
            ? `target ${fmt(props.target)}${props.targetMet != null ? (props.targetMet ? ', met' : ', not met') : ''}`
            : '',
    ]
        .filter(Boolean)
        .join(', ');
    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{props.label}</span>
                {props.icon ? (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon name={props.icon} className="size-4" aria-hidden="true" />
                    </span>
                ) : null}
            </div>
            {props.loading ? (
                <div className="mt-2 h-9 w-24 animate-pulse rounded-md bg-muted" />
            ) : props.error ? (
                <div className="mt-2 text-sm text-muted-foreground" role="alert">
                    Couldn't load: {props.error.message}
                </div>
            ) : (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">{shown}</span>
                    {props.unit ? <span className="text-sm text-muted-foreground">{props.unit}</span> : null}
                </div>
            )}
            {!props.loading && !props.error && hasDelta ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums ${toneClass(props.positive)}`}
                    >
                        <TrendArrow trend={props.trend} />
                        {deltaText}
                    </span>
                    <span className="text-muted-foreground">{props.comparisonLabel || 'vs previous period'}</span>
                </div>
            ) : null}
            {props.sparkline && props.sparkline.length > 1 ? (
                <div className="mt-3">
                    <Sparkline
                        data={props.sparkline}
                        type={props.sparklineType || 'area'}
                        color={props.color || 'var(--chart-1)'}
                        height={40}
                        valueFormatter={fmt}
                    />
                </div>
            ) : null}
            {progress != null ? (
                <div className="mt-3 grid gap-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Target {fmt(props.target)}</span>
                        <span className="tabular-nums">
                            {Math.round(((props.value as number) / (props.target as number)) * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full ${props.targetMet === false ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>
            ) : null}
        </>
    );
    const base = `flex h-full w-full flex-col rounded-xl bg-card p-4 text-left text-card-foreground ring-1 ring-foreground/10 ${props.className || ''}`;
    if (props.onClick) {
        return (
            <button
                type="button"
                onClick={props.onClick}
                aria-label={spoken}
                className={`${base} cursor-pointer outline-none transition-shadow hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring`}
            >
                {body}
            </button>
        );
    }
    return (
        <div role="group" aria-label={spoken} className={base}>
            {body}
        </div>
    );
}

export type DataScoreProps = {
    table: string;
    query?: string;
    label: string;
    aggregate?: AggregateFn;
    field?: string;
    dateField?: string;
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
    color?: string;
    onSelect?: (selection: { query: string; result: ScoreResult }) => void;
    live?: boolean;
    refreshInterval?: number;
    className?: string;
};

/** "vs previous 7 days", "vs same days last month". */
export function comparisonLabel(period?: number | Interval): string {
    if (period == null || typeof period === 'number' || /^\d+$/.test(String(period))) {
        const n = Number(period == null ? 7 : period);
        return n === 1 ? 'vs yesterday' : `vs previous ${n} days`;
    }
    return `vs same days last ${period}`;
}

/** A KPI tile bound to a table (useScore). */
export function DataScore(props: DataScoreProps) {
    const s = useScore(
        {
            table: props.table,
            query: props.query,
            aggregate: props.aggregate,
            field: props.field,
            dateField: props.dateField,
            period: props.period,
            sparkline:
                props.sparkline === false
                    ? false
                    : { interval: props.sparklineInterval, periods: props.sparklinePeriods },
            target: props.target,
            lowerIsBetter: props.lowerIsBetter,
        },
        { live: props.live, refreshInterval: props.refreshInterval }
    );
    const d = s.data;
    return (
        <ScoreTile
            label={props.label}
            value={d ? d.value : null}
            format={props.format}
            unit={props.unit}
            delta={d ? d.delta : null}
            deltaPercent={d ? d.deltaPercent : null}
            trend={d ? d.trend : null}
            positive={d ? d.positive : null}
            comparisonLabel={props.dateField ? comparisonLabel(props.period) : undefined}
            sparkline={d && d.sparkline.length ? d.sparkline.map((p) => p.value) : undefined}
            sparklineType={props.sparklineType}
            target={props.target}
            targetMet={d ? d.targetMet : undefined}
            icon={props.icon}
            color={props.color}
            loading={s.isLoading}
            error={s.error}
            onClick={props.onSelect && d ? () => props.onSelect!({ query: d.query, result: d }) : undefined}
            className={props.className}
        />
    );
}

export default ScoreTile;
