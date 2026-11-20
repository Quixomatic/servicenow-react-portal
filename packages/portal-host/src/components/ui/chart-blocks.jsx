import * as React from 'react';
import { cn } from 'cn';
import {
    ChartContainer,
    ChartTooltipContent,
    ChartLegendContent,
    ChartFigure,
    ChartDataTable,
    describeChart,
    normalizeSeries,
    configFromSeries,
    chartColor,
    chartKey,
    formatNumber,
    prefersReducedMotion,
} from './chart';

// Chart building blocks (part of components:chart): data + config in, an accessible, themed chart
// out. Generic (no record or table logic; app/data-chart binds them to platform data).
//
//   <BarChart data={rows} index="priority" series={['count']} />
//   <BarChart data={rows} index="month" series={['open', 'closed']} stacked orientation="horizontal" />
//   <LineChart data={rows} index="week" series={[{ key: 'opened', label: 'Opened' }]} glow />
//   <AreaChart data={rows} index="week" series={['p1', 'p2']} stacked />
//   <PieChart data={rows} index="state" valueKey="count" donut centerLabel={{ label: 'Open' }} />
//   <RadialChart value={72} max={100} label="SLA met" />          (gauge)
//   <RadialChart data={rows} index="team" valueKey="score" />      (one ring per row)
//   <Sparkline data={[3, 5, 4, 8, 6]} type="area" />
//
// Shared props: data, index (category / x key), series (keys, or { key, label, color }; default
// colours cycle --chart-1…5), config (shadcn ChartConfig, optional), valueFormatter(v), height (px;
// default: the container's aspect-video), className, title + summary (accessible name and text
// summary; a summary is generated when omitted), showSummary, view ('chart' | 'table') with
// tableProps, onValueClick({ row, index, key }), animate, showTooltip, showLegend, showGrid.
//
// The look follows shadcn's charts with touches in the spirit of EvilCharts (gradient and hatched
// fills, glow, hover highlight that dims the other bars or slices); reimplemented here, no code
// copied.

const AXIS = { tickLine: false, axisLine: false, tickMargin: 8 };

function useSvgId(prefix) {
    return `${prefix}-${chartKey(React.useId())}`;
}

function truncate(value, max) {
    const s = value == null ? '' : String(value);
    return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;
}

function axisNumber(v) {
    return formatNumber(v, { compact: Math.abs(Number(v)) >= 10000 });
}

function useBlockSeries(series, config, fallbackKey) {
    return React.useMemo(() => {
        const list = normalizeSeries(series && series.length ? series : config ? null : [fallbackKey], config);
        return { list, cfg: config || configFromSeries(list) };
    }, [JSON.stringify(series || null), config, fallbackKey]);
}

function animationOn(animate) {
    return animate !== false && !prefersReducedMotion();
}

function sizeProps(height, className, extra) {
    return {
        className: cn(height ? 'aspect-auto' : '', extra, className),
        style: height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined,
    };
}

/** Shared frame: figure + summary + table fallback around a ChartContainer. */
function BlockFrame({
    type,
    title,
    summary,
    showSummary,
    view,
    data,
    index,
    indexLabel,
    list,
    cfg,
    valueFormatter,
    onValueClick,
    tableProps,
    timeSeries,
    summaryTotal,
    frameClassName,
    children,
}) {
    const text =
        summary != null
            ? summary
            : describeChart({
                  type,
                  title,
                  data,
                  index,
                  series: list,
                  valueFormatter,
                  timeSeries,
                  total: summaryTotal !== false,
              });
    const table =
        view === 'table' ? (
            <ChartDataTable
                data={data}
                index={index}
                indexLabel={indexLabel}
                series={list}
                config={cfg}
                valueFormatter={valueFormatter}
                caption={typeof title === 'string' ? title : undefined}
                onRowClick={
                    onValueClick ? (row, i) => onValueClick({ row, index: i, key: list[0] && list[0].key }) : undefined
                }
                {...tableProps}
            />
        ) : null;
    return (
        <ChartFigure
            title={title}
            summary={text}
            showSummary={showSummary}
            view={view}
            table={table}
            className={frameClassName}
        >
            {children}
        </ChartFigure>
    );
}

/** <defs> for a series: vertical / horizontal gradient, hatch pattern, glow filter. */
function SeriesDefs({ id, list, horizontal, gradient, hatched, glow, area }) {
    return (
        <defs>
            {list.map((s) => {
                const k = chartKey(s.key);
                return (
                    <React.Fragment key={s.key}>
                        {gradient ? (
                            <linearGradient
                                id={`${id}-grad-${k}`}
                                x1="0"
                                y1="0"
                                x2={horizontal ? '1' : '0'}
                                y2={horizontal ? '0' : '1'}
                            >
                                <stop
                                    offset="0%"
                                    stopColor={s.color}
                                    stopOpacity={area ? 0.45 : horizontal ? 0.45 : 0.95}
                                />
                                <stop
                                    offset="100%"
                                    stopColor={s.color}
                                    stopOpacity={area ? 0.02 : horizontal ? 0.95 : 0.35}
                                />
                            </linearGradient>
                        ) : null}
                        {hatched ? (
                            <pattern
                                id={`${id}-hatch-${k}`}
                                width="6"
                                height="6"
                                patternUnits="userSpaceOnUse"
                                patternTransform="rotate(45)"
                            >
                                <rect width="6" height="6" fill={s.color} fillOpacity="0.22" />
                                <line x1="0" y1="0" x2="0" y2="6" stroke={s.color} strokeWidth="3" />
                            </pattern>
                        ) : null}
                    </React.Fragment>
                );
            })}
            {glow ? (
                <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            ) : null}
        </defs>
    );
}

function rowFromEvent(data, d, i) {
    if (d && d.payload && typeof d.payload === 'object') return d.payload;
    return Array.isArray(data) ? data[i] : undefined;
}

/** Index of the active point from a chart-level mouse / click state (Recharts 3). */
function activeIndexOf(state) {
    if (!state) return -1;
    const raw = state.activeTooltipIndex != null ? state.activeTooltipIndex : state.activeIndex;
    const n = Number(raw);
    return Number.isFinite(n) ? n : -1;
}

const HOVER_BARS =
    '[&_.recharts-bar-rectangle]:transition-opacity [&:has(.recharts-bar-rectangle:hover)_.recharts-bar-rectangle:not(:hover)]:opacity-40';
const CLICK_BARS = '[&_.recharts-bar-rectangle]:cursor-pointer';
const HOVER_SECTORS =
    '[&_.recharts-pie-sector]:transition-opacity [&:has(.recharts-pie-sector:hover)_.recharts-pie-sector:not(:hover)]:opacity-45';
const CLICK_SECTORS = '[&_.recharts-pie-sector]:cursor-pointer';

/**
 * Bar chart: vertical columns (default) or horizontal bars (orientation="horizontal"); grouped
 * (several series side by side) or stacked; variant 'default' | 'gradient' | 'hatched'.
 */
function BarChart({
    data,
    index,
    indexLabel,
    series,
    config,
    orientation = 'vertical',
    stacked = false,
    variant = 'default',
    radius = 6,
    hoverHighlight = true,
    showGrid = true,
    showValueAxis = true,
    showCategoryAxis = true,
    showLegend,
    showTooltip = true,
    showLabels = false,
    maxBarSize = 56,
    categoryWidth,
    valueFormatter,
    valueTickFormatter,
    tickFormatter,
    onValueClick,
    summaryTotal,
    timeSeries = false,
    animate = true,
    height,
    className,
    title,
    summary,
    showSummary,
    view = 'chart',
    tableProps,
    frameClassName,
    children,
}) {
    const rows = Array.isArray(data) ? data : [];
    const { list, cfg } = useBlockSeries(series, config, 'value');
    const id = useSvgId('bar');
    const horizontal = orientation === 'horizontal';
    const legend = showLegend != null ? showLegend : list.length > 1;
    const catTick = tickFormatter || ((v) => truncate(v, horizontal ? 18 : 14));
    const anim = animationOn(animate);
    const fillOf = (s) =>
        variant === 'gradient'
            ? `url(#${id}-grad-${chartKey(s.key)})`
            : variant === 'hatched'
              ? `url(#${id}-hatch-${chartKey(s.key)})`
              : s.color;
    const topRadius = horizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0];
    // Stacked: the top segment of each stack gets the rounded end (the last series with a value in that row).
    const topOf = stacked
        ? rows.map((r) => {
              let top = -1;
              list.forEach((s, i) => {
                  if (Number(r[s.key]) > 0) top = i;
              });
              return top;
          })
        : null;
    const size = sizeProps(height, className, cn(hoverHighlight && HOVER_BARS, onValueClick && CLICK_BARS));
    return (
        <BlockFrame
            type="Bar"
            title={title}
            summary={summary}
            showSummary={showSummary}
            view={view}
            data={rows}
            index={index}
            indexLabel={indexLabel}
            list={list}
            cfg={cfg}
            valueFormatter={valueFormatter}
            onValueClick={onValueClick}
            tableProps={tableProps}
            summaryTotal={summaryTotal}
            timeSeries={timeSeries}
            frameClassName={frameClassName}
        >
            <ChartContainer config={cfg} {...size}>
                {(R) => (
                    <R.BarChart
                        data={rows}
                        layout={horizontal ? 'vertical' : 'horizontal'}
                        accessibilityLayer
                        margin={{
                            top: showLabels ? 18 : 6,
                            right: horizontal && showLabels ? 64 : 8,
                            bottom: 0,
                            left: 0,
                        }}
                        barCategoryGap="22%"
                        barGap={3}
                    >
                        <SeriesDefs
                            id={id}
                            list={list}
                            horizontal={horizontal}
                            gradient={variant === 'gradient'}
                            hatched={variant === 'hatched'}
                        />
                        {showGrid ? (
                            <R.CartesianGrid vertical={horizontal} horizontal={!horizontal} strokeDasharray="3 3" />
                        ) : null}
                        {horizontal ? (
                            <R.XAxis
                                type="number"
                                {...AXIS}
                                hide={!showValueAxis}
                                tickFormatter={valueTickFormatter || axisNumber}
                            />
                        ) : (
                            <R.XAxis
                                dataKey={index}
                                {...AXIS}
                                hide={!showCategoryAxis}
                                tickFormatter={catTick}
                                minTickGap={8}
                            />
                        )}
                        {horizontal ? (
                            <R.YAxis
                                type="category"
                                dataKey={index}
                                {...AXIS}
                                hide={!showCategoryAxis}
                                width={categoryWidth || 'auto'}
                                tickFormatter={catTick}
                                interval={0}
                            />
                        ) : (
                            <R.YAxis
                                {...AXIS}
                                width="auto"
                                hide={!showValueAxis}
                                tickFormatter={valueTickFormatter || axisNumber}
                                allowDecimals={false}
                            />
                        )}
                        {showTooltip ? (
                            <R.Tooltip
                                cursor={{ fillOpacity: 0.6 }}
                                content={<ChartTooltipContent valueFormatter={valueFormatter} />}
                            />
                        ) : null}
                        {legend ? <R.Legend content={<ChartLegendContent />} /> : null}
                        {list.map((s, i) => (
                            <R.Bar
                                key={s.key}
                                dataKey={s.key}
                                fill={fillOf(s)}
                                stroke={variant === 'hatched' ? s.color : undefined}
                                strokeWidth={variant === 'hatched' ? 1 : 0}
                                stackId={stacked ? 'stack' : undefined}
                                radius={stacked ? 0 : radius}
                                maxBarSize={maxBarSize}
                                isAnimationActive={anim}
                                onClick={
                                    onValueClick
                                        ? (d, j) =>
                                              onValueClick({ row: rowFromEvent(rows, d, j), index: j, key: s.key })
                                        : undefined
                                }
                            >
                                {stacked
                                    ? rows.map((r, j) => (
                                          <R.Cell key={j} fill={fillOf(s)} radius={topOf[j] === i ? topRadius : 0} />
                                      ))
                                    : null}
                                {showLabels && (!stacked || i === list.length - 1) ? (
                                    <R.LabelList
                                        dataKey={s.key}
                                        position={horizontal ? 'right' : 'top'}
                                        offset={6}
                                        className="fill-foreground"
                                        fontSize={11}
                                        formatter={valueFormatter || ((v) => formatNumber(v))}
                                    />
                                ) : null}
                            </R.Bar>
                        ))}
                        {typeof children === 'function' ? children(R) : children}
                    </R.BarChart>
                )}
            </ChartContainer>
        </BlockFrame>
    );
}

function cartesianClick(rows, onValueClick, key) {
    if (!onValueClick) return undefined;
    return (state) => {
        const i = activeIndexOf(state);
        if (i >= 0 && rows[i]) onValueClick({ row: rows[i], index: i, key });
    };
}

/** Line chart: one line per series; curve 'monotone' | 'linear' | 'step' | 'natural'; dots; glow. */
function LineChart({
    data,
    index,
    indexLabel,
    series,
    config,
    curve = 'monotone',
    dots = false,
    glow = false,
    strokeWidth = 2,
    showGrid = true,
    showXAxis = true,
    showYAxis = true,
    showLegend,
    showTooltip = true,
    valueFormatter,
    valueTickFormatter,
    tickFormatter,
    onValueClick,
    animate = true,
    timeSeries = true,
    height,
    className,
    title,
    summary,
    showSummary,
    view = 'chart',
    tableProps,
    frameClassName,
    children,
}) {
    const rows = Array.isArray(data) ? data : [];
    const { list, cfg } = useBlockSeries(series, config, 'value');
    const id = useSvgId('line');
    const legend = showLegend != null ? showLegend : list.length > 1;
    const anim = animationOn(animate);
    const size = sizeProps(height, className, onValueClick ? '[&_.recharts-surface]:cursor-pointer' : '');
    return (
        <BlockFrame
            type="Line"
            title={title}
            summary={summary}
            showSummary={showSummary}
            view={view}
            data={rows}
            index={index}
            indexLabel={indexLabel}
            list={list}
            cfg={cfg}
            valueFormatter={valueFormatter}
            onValueClick={onValueClick}
            tableProps={tableProps}
            timeSeries={timeSeries}
            frameClassName={frameClassName}
        >
            <ChartContainer config={cfg} {...size}>
                {(R) => (
                    <R.LineChart
                        data={rows}
                        accessibilityLayer
                        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                        onClick={cartesianClick(rows, onValueClick, list[0] && list[0].key)}
                    >
                        <SeriesDefs id={id} list={list} glow={glow} />
                        {showGrid ? <R.CartesianGrid vertical={false} strokeDasharray="3 3" /> : null}
                        <R.XAxis
                            dataKey={index}
                            {...AXIS}
                            hide={!showXAxis}
                            tickFormatter={tickFormatter || ((v) => truncate(v, 12))}
                            minTickGap={16}
                        />
                        <R.YAxis
                            {...AXIS}
                            width="auto"
                            hide={!showYAxis}
                            tickFormatter={valueTickFormatter || axisNumber}
                        />
                        {showTooltip ? (
                            <R.Tooltip
                                cursor={{ strokeDasharray: '4 4' }}
                                content={<ChartTooltipContent valueFormatter={valueFormatter} />}
                            />
                        ) : null}
                        {legend ? <R.Legend content={<ChartLegendContent />} /> : null}
                        {list.map((s) => (
                            <R.Line
                                key={s.key}
                                dataKey={s.key}
                                type={curve}
                                stroke={s.color}
                                strokeWidth={strokeWidth}
                                dot={dots ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
                                activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--background)' }}
                                filter={glow ? `url(#${id}-glow)` : undefined}
                                isAnimationActive={anim}
                            />
                        ))}
                        {typeof children === 'function' ? children(R) : children}
                    </R.LineChart>
                )}
            </ChartContainer>
        </BlockFrame>
    );
}

/** Area chart: gradient fills (default) or solid; stacked; curve; optional glow on the strokes. */
function AreaChart({
    data,
    index,
    indexLabel,
    series,
    config,
    curve = 'monotone',
    gradient = true,
    stacked = false,
    glow = false,
    strokeWidth = 2,
    showGrid = true,
    showXAxis = true,
    showYAxis = true,
    showLegend,
    showTooltip = true,
    valueFormatter,
    valueTickFormatter,
    tickFormatter,
    onValueClick,
    animate = true,
    timeSeries = true,
    height,
    className,
    title,
    summary,
    showSummary,
    view = 'chart',
    tableProps,
    frameClassName,
    children,
}) {
    const rows = Array.isArray(data) ? data : [];
    const { list, cfg } = useBlockSeries(series, config, 'value');
    const id = useSvgId('area');
    const legend = showLegend != null ? showLegend : list.length > 1;
    const anim = animationOn(animate);
    const size = sizeProps(height, className, onValueClick ? '[&_.recharts-surface]:cursor-pointer' : '');
    return (
        <BlockFrame
            type="Area"
            title={title}
            summary={summary}
            showSummary={showSummary}
            view={view}
            data={rows}
            index={index}
            indexLabel={indexLabel}
            list={list}
            cfg={cfg}
            valueFormatter={valueFormatter}
            onValueClick={onValueClick}
            tableProps={tableProps}
            timeSeries={timeSeries}
            frameClassName={frameClassName}
        >
            <ChartContainer config={cfg} {...size}>
                {(R) => (
                    <R.AreaChart
                        data={rows}
                        accessibilityLayer
                        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                        onClick={cartesianClick(rows, onValueClick, list[0] && list[0].key)}
                    >
                        <SeriesDefs id={id} list={list} gradient={gradient} glow={glow} area />
                        {showGrid ? <R.CartesianGrid vertical={false} strokeDasharray="3 3" /> : null}
                        <R.XAxis
                            dataKey={index}
                            {...AXIS}
                            hide={!showXAxis}
                            tickFormatter={tickFormatter || ((v) => truncate(v, 12))}
                            minTickGap={16}
                        />
                        <R.YAxis
                            {...AXIS}
                            width="auto"
                            hide={!showYAxis}
                            tickFormatter={valueTickFormatter || axisNumber}
                        />
                        {showTooltip ? (
                            <R.Tooltip
                                cursor={{ strokeDasharray: '4 4' }}
                                content={<ChartTooltipContent valueFormatter={valueFormatter} />}
                            />
                        ) : null}
                        {legend ? <R.Legend content={<ChartLegendContent />} /> : null}
                        {list.map((s) => (
                            <R.Area
                                key={s.key}
                                dataKey={s.key}
                                type={curve}
                                stroke={s.color}
                                strokeWidth={strokeWidth}
                                fill={gradient ? `url(#${id}-grad-${chartKey(s.key)})` : s.color}
                                fillOpacity={gradient ? 1 : 0.25}
                                stackId={stacked ? 'stack' : undefined}
                                dot={false}
                                activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--background)' }}
                                filter={glow ? `url(#${id}-glow)` : undefined}
                                isAnimationActive={anim}
                            />
                        ))}
                        {typeof children === 'function' ? children(R) : children}
                    </R.AreaChart>
                )}
            </ChartContainer>
        </BlockFrame>
    );
}

/** Slice colours: row.fill / row.color, else the palette by position. */
function sliceColor(row, i) {
    return (row && (row.fill || row.color)) || chartColor(i + 1);
}

/** Config for per-row charts (pie, radial): one entry per category, keyed by its label. */
function rowConfig(rows, index, valueKey, config, valueLabel) {
    if (config) return config;
    const out = { [valueKey]: { label: valueLabel || valueKey } };
    rows.forEach((r, i) => {
        const k = String(r[index]);
        out[k] = { label: k, color: sliceColor(r, i) };
    });
    return out;
}

/** Pie / donut chart: one slice per row; centre label (donut) shows the total unless given. */
function PieChart({
    data,
    index,
    indexLabel,
    valueKey = 'value',
    valueLabel,
    config,
    donut = false,
    innerRadius,
    centerLabel,
    showLabels = false,
    showLegend = true,
    showTooltip = true,
    hoverHighlight = true,
    valueFormatter,
    onValueClick,
    animate = true,
    height,
    className,
    title,
    summary,
    showSummary,
    view = 'chart',
    tableProps,
    frameClassName,
}) {
    const rows = Array.isArray(data) ? data : [];
    const cfg = React.useMemo(
        () => rowConfig(rows, index, valueKey, config, valueLabel),
        [rows, index, valueKey, config, valueLabel]
    );
    const list = React.useMemo(
        () => [{ key: valueKey, label: valueLabel || valueKey, color: chartColor(1) }],
        [valueKey, valueLabel]
    );
    const anim = animationOn(animate);
    const fmt = valueFormatter || ((v) => formatNumber(v));
    const total = rows.reduce((a, r) => a + (Number(r[valueKey]) || 0), 0);
    const center = donut
        ? centerLabel === false
            ? null
            : {
                  value: centerLabel && centerLabel.value != null ? centerLabel.value : fmt(total),
                  label: (centerLabel && centerLabel.label) || 'Total',
              }
        : null;
    const size = sizeProps(
        height,
        className,
        cn('mx-auto aspect-square w-full max-h-[300px]', hoverHighlight && HOVER_SECTORS, onValueClick && CLICK_SECTORS)
    );
    return (
        <BlockFrame
            type={donut ? 'Donut' : 'Pie'}
            title={title}
            summary={summary}
            showSummary={showSummary}
            view={view}
            data={rows}
            index={index}
            indexLabel={indexLabel}
            list={list}
            cfg={cfg}
            valueFormatter={valueFormatter}
            onValueClick={onValueClick}
            tableProps={tableProps}
            frameClassName={frameClassName}
        >
            <ChartContainer config={cfg} {...size}>
                {(R) => (
                    <R.PieChart accessibilityLayer>
                        {showTooltip ? (
                            <R.Tooltip
                                content={
                                    <ChartTooltipContent nameKey={index} hideLabel valueFormatter={valueFormatter} />
                                }
                            />
                        ) : null}
                        <R.Pie
                            data={rows}
                            dataKey={valueKey}
                            nameKey={index}
                            innerRadius={donut ? innerRadius || '58%' : 0}
                            outerRadius="88%"
                            paddingAngle={donut ? 2 : 0}
                            cornerRadius={donut ? 5 : 0}
                            stroke="var(--background)"
                            strokeWidth={donut ? 0 : 2}
                            label={showLabels ? (p) => fmt(p.value) : undefined}
                            labelLine={false}
                            isAnimationActive={anim}
                            onClick={
                                onValueClick
                                    ? (d, j) => onValueClick({ row: rowFromEvent(rows, d, j), index: j, key: valueKey })
                                    : undefined
                            }
                        >
                            {rows.map((r, i) => (
                                <R.Cell key={i} fill={sliceColor(r, i)} />
                            ))}
                            {center ? (
                                <R.Label
                                    position="center"
                                    content={({ viewBox }) => {
                                        if (!viewBox || viewBox.cx == null) return null;
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-2xl font-semibold"
                                                >
                                                    {center.value}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy + 22}
                                                    className="fill-muted-foreground text-xs"
                                                >
                                                    {center.label}
                                                </tspan>
                                            </text>
                                        );
                                    }}
                                />
                            ) : null}
                        </R.Pie>
                        {showLegend ? (
                            <R.Legend content={<ChartLegendContent nameKey={index} />} verticalAlign="bottom" />
                        ) : null}
                    </R.PieChart>
                )}
            </ChartContainer>
        </BlockFrame>
    );
}

/**
 * Radial chart. Gauge: value (+ max, default 100), label, color → one ring filled to value / max.
 * Rings: data + index + valueKey → one ring per row (max = largest value unless given).
 */
function RadialChart({
    value,
    max,
    label,
    color,
    data,
    index = 'name',
    indexLabel,
    valueKey = 'value',
    valueLabel,
    config,
    showLegend,
    showTooltip,
    valueFormatter,
    onValueClick,
    animate = true,
    height,
    className,
    title,
    summary,
    showSummary,
    view = 'chart',
    tableProps,
    frameClassName,
}) {
    const gauge = value != null && !data;
    const fmt = valueFormatter || ((v) => formatNumber(v));
    const rows = React.useMemo(() => {
        if (gauge) return [{ [index]: label || 'Value', [valueKey]: Number(value) || 0, fill: color || chartColor(1) }];
        return (Array.isArray(data) ? data : []).map((r, i) => ({ ...r, fill: sliceColor(r, i) }));
    }, [gauge, value, label, color, data, index, valueKey]);
    const top = max != null ? Number(max) : gauge ? 100 : Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
    const cfg = React.useMemo(
        () => rowConfig(rows, index, valueKey, config, valueLabel),
        [rows, index, valueKey, config, valueLabel]
    );
    const list = [{ key: valueKey, label: valueLabel || valueKey, color: chartColor(1) }];
    const anim = animationOn(animate);
    const legend = showLegend != null ? showLegend : !gauge;
    const tooltip = showTooltip != null ? showTooltip : !gauge;
    const pct = gauge && top ? Math.round(((Number(value) || 0) / top) * 100) : null;
    const text =
        summary != null
            ? summary
            : gauge
              ? `${title ? `${title}: ` : ''}${label || 'Value'} ${fmt(value)} of ${fmt(top)} (${pct}%).`
              : undefined;
    const size = sizeProps(height, className, 'mx-auto aspect-square w-full max-h-[260px]');
    return (
        <BlockFrame
            type="Radial"
            title={title}
            summary={text}
            showSummary={showSummary}
            view={view}
            data={rows}
            index={index}
            indexLabel={indexLabel}
            list={list}
            cfg={cfg}
            valueFormatter={valueFormatter}
            onValueClick={onValueClick}
            tableProps={tableProps}
            frameClassName={frameClassName}
        >
            <ChartContainer config={cfg} {...size}>
                {(R) => (
                    <R.RadialBarChart
                        data={rows}
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={gauge ? '72%' : '28%'}
                        outerRadius={gauge ? '96%' : '100%'}
                        barSize={gauge ? undefined : 12}
                        accessibilityLayer
                    >
                        <R.PolarAngleAxis type="number" domain={[0, top]} tick={false} axisLine={false} />
                        {tooltip ? (
                            <R.Tooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent nameKey={index} hideLabel valueFormatter={valueFormatter} />
                                }
                            />
                        ) : null}
                        <R.RadialBar
                            dataKey={valueKey}
                            background
                            cornerRadius={gauge ? 12 : 8}
                            isAnimationActive={anim}
                            onClick={
                                onValueClick
                                    ? (d, j) => onValueClick({ row: rowFromEvent(rows, d, j), index: j, key: valueKey })
                                    : undefined
                            }
                        />
                        {gauge ? (
                            <R.PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                <R.Label
                                    content={({ viewBox }) => {
                                        if (!viewBox || viewBox.cx == null) return null;
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy - 4}
                                                    className="fill-foreground text-3xl font-semibold"
                                                >
                                                    {fmt(value)}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy + 20}
                                                    className="fill-muted-foreground text-xs"
                                                >
                                                    {label || `${pct}% of ${fmt(top)}`}
                                                </tspan>
                                            </text>
                                        );
                                    }}
                                />
                            </R.PolarRadiusAxis>
                        ) : null}
                        {legend ? (
                            <R.Legend content={<ChartLegendContent nameKey={index} />} verticalAlign="bottom" />
                        ) : null}
                    </R.RadialBarChart>
                )}
            </ChartContainer>
        </BlockFrame>
    );
}

/**
 * Sparkline: a tiny trend line / area / bar with no axes. data: numbers or rows (valueKey).
 * Accessible as an image with a text label (first → last, min, max) unless ariaLabel is given.
 */
function Sparkline({
    data,
    valueKey = 'value',
    index,
    type = 'line',
    color = 'var(--chart-1)',
    height = 36,
    strokeWidth = 2,
    curve = 'monotone',
    showTooltip = false,
    showLastDot = true,
    valueFormatter,
    animate = true,
    ariaLabel,
    className,
}) {
    const rows = React.useMemo(
        () =>
            (Array.isArray(data) ? data : []).map((d, i) =>
                typeof d === 'object' && d !== null ? d : { [valueKey]: d, __i: i }
            ),
        [data, valueKey]
    );
    const id = useSvgId('spark');
    const anim = animationOn(animate);
    const fmt = valueFormatter || ((v) => formatNumber(v));
    const vals = rows.map((r) => Number(r[valueKey])).filter((n) => Number.isFinite(n));
    const label =
        ariaLabel ||
        (vals.length
            ? `Trend over ${vals.length} points: from ${fmt(vals[0])} to ${fmt(vals[vals.length - 1])}, low ${fmt(Math.min(...vals))}, high ${fmt(Math.max(...vals))}.`
            : 'No trend data.');
    const cfg = React.useMemo(() => ({ [valueKey]: { label: 'Value', color } }), [valueKey, color]);
    const last = rows.length - 1;
    const lastDot = (p) =>
        showLastDot && p.index === last ? (
            <circle key="last" cx={p.cx} cy={p.cy} r={3} fill={color} stroke="var(--background)" strokeWidth={1.5} />
        ) : (
            <g key={p.index} />
        );
    return (
        <div role="img" aria-label={label} className={cn('w-full', className)}>
            <ChartContainer config={cfg} className="aspect-auto" style={{ height: `${height}px` }} aria-hidden="true">
                {(R) => {
                    const common = { data: rows, margin: { top: 4, right: 4, bottom: 2, left: 4 } };
                    const tip = showTooltip ? (
                        <R.Tooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel indicator="line" valueFormatter={valueFormatter} />}
                        />
                    ) : null;
                    if (type === 'bar') {
                        return (
                            <R.BarChart {...common}>
                                {tip}
                                <R.Bar dataKey={valueKey} fill={color} radius={2} isAnimationActive={anim} />
                            </R.BarChart>
                        );
                    }
                    if (type === 'area') {
                        return (
                            <R.AreaChart {...common}>
                                <defs>
                                    <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <R.YAxis hide domain={['dataMin', 'dataMax']} />
                                {tip}
                                <R.Area
                                    dataKey={valueKey}
                                    type={curve}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    fill={`url(#${id}-g)`}
                                    dot={lastDot}
                                    activeDot={false}
                                    isAnimationActive={anim}
                                />
                            </R.AreaChart>
                        );
                    }
                    return (
                        <R.LineChart {...common}>
                            <R.YAxis hide domain={['dataMin', 'dataMax']} />
                            {tip}
                            <R.Line
                                dataKey={valueKey}
                                type={curve}
                                stroke={color}
                                strokeWidth={strokeWidth}
                                dot={lastDot}
                                activeDot={false}
                                isAnimationActive={anim}
                            />
                        </R.LineChart>
                    );
                }}
            </ChartContainer>
        </div>
    );
}

/** The block for a chart type name ('bar', 'bar-horizontal', 'line', 'area', 'pie', 'donut', 'radial'). */
const CHART_TYPES = ['bar', 'bar-horizontal', 'bar-stacked', 'line', 'area', 'area-stacked', 'pie', 'donut', 'radial'];

/**
 * One component for every chart type, for config-driven callers (app/data-chart, chart-card):
 * <Chart type="donut" data={rows} index="state" series={['count']} />.
 */
function Chart({ type = 'bar', series, valueKey, ...props }) {
    const first =
        Array.isArray(series) && series.length
            ? typeof series[0] === 'string'
                ? series[0]
                : series[0].key
            : undefined;
    switch (type) {
        case 'bar-horizontal':
            return <BarChart {...props} series={series} orientation="horizontal" />;
        case 'bar-stacked':
            return <BarChart {...props} series={series} stacked />;
        case 'line':
            return <LineChart {...props} series={series} />;
        case 'area':
            return <AreaChart {...props} series={series} />;
        case 'area-stacked':
            return <AreaChart {...props} series={series} stacked />;
        case 'pie':
            return <PieChart {...props} valueKey={valueKey || first || 'value'} />;
        case 'donut':
            return <PieChart {...props} valueKey={valueKey || first || 'value'} donut />;
        case 'radial':
            return <RadialChart {...props} valueKey={valueKey || first || 'value'} />;
        default:
            return <BarChart {...props} series={series} />;
    }
}

export { BarChart, LineChart, AreaChart, PieChart, RadialChart, Sparkline, Chart, CHART_TYPES };
