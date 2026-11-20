import * as React from 'react';
import { cn } from 'cn';
import { ChartColumn, RotateCw, Table2 } from 'lucide-react';

// components:chart: shadcn's chart (ChartContainer, ChartTooltip(Content), ChartLegend(Content),
// ChartStyle and the chart config → CSS variables) on Recharts 3, plus the chart engine loader and
// the accessibility pieces every chart uses (text summary, data table fallback, view toggle). The
// chart building blocks (BarChart, LineChart, AreaChart, PieChart, RadialChart, Sparkline) are in
// chart-blocks.jsx and ship under the same module.
//
//   const config = { open: { label: 'Open', color: 'var(--chart-1)' } };
//   <ChartContainer config={config} className="h-64">
//       {(R) => (
//           <R.BarChart data={rows} accessibilityLayer>
//               <R.XAxis dataKey="month" tickLine={false} axisLine={false} />
//               <ChartTooltip content={<ChartTooltipContent />} />
//               <R.Bar dataKey="open" fill="var(--color-open)" radius={4} />
//           </R.BarChart>
//       )}
//   </ChartContainer>
//
// Recharts is NOT in the main host bundle: it lives in the portal-charts chunk, fetched with
// import() the first time a chart mounts (cached for the page). Until it arrives the container shows
// a same-sized skeleton; if it fails, a message with Retry. `R` is the Recharts module (every export:
// R.BarChart, R.Bar, R.Cell, …); useRecharts() returns it (or null while loading) anywhere.
//
// The shadcn parts follow ui.shadcn.com's chart (MIT, the Recharts 3 version), adapted to the
// lazily loaded engine and the shadow root (dark mode keys off :host(.dark)).

let enginePromise = null;
let engineModule = null;
const engineListeners = new Set();

/** Load the Recharts chunk once per page (retries after a failure). Resolves with the Recharts module. */
function loadChartEngine() {
    if (engineModule) return Promise.resolve(engineModule);
    if (!enginePromise) {
        enginePromise = import(/* webpackChunkName: "portal-charts" */ '../../portal-charts')
            .then((mod) => {
                engineModule = mod;
                engineListeners.forEach((fn) => fn());
                return mod;
            })
            .catch((error) => {
                enginePromise = null;
                throw error;
            });
    }
    return enginePromise;
}

/** True once the Recharts chunk has loaded on this page. */
function isChartEngineLoaded() {
    return !!engineModule;
}

/**
 * The chart engine for a component: { engine (the Recharts module, or null), status
 * ('loading' | 'ready' | 'error'), error, retry }. Starts the load on mount.
 */
function useChartEngine() {
    const [state, setState] = React.useState(() =>
        engineModule ? { status: 'ready', error: null } : { status: 'loading', error: null }
    );
    const load = React.useCallback(() => {
        if (engineModule) {
            setState({ status: 'ready', error: null });
            return;
        }
        setState({ status: 'loading', error: null });
        loadChartEngine().then(
            () => setState({ status: 'ready', error: null }),
            (error) => setState({ status: 'error', error })
        );
    }, []);
    React.useEffect(() => {
        if (!engineModule) load();
        const onLoaded = () => setState({ status: 'ready', error: null });
        engineListeners.add(onLoaded);
        return () => {
            engineListeners.delete(onLoaded);
        };
    }, [load]);
    return {
        engine: state.status === 'ready' ? engineModule : null,
        status: state.status,
        error: state.error,
        retry: load,
    };
}

/** The Recharts module (R.BarChart, R.Bar, …), or null while the chunk loads. */
function useRecharts() {
    return useChartEngine().engine;
}

// Format: { THEME_NAME: CSS selector prefix }. The chart renders in the host's shadow root, where
// dark mode is the host's .dark class (Studio previews and the overlay layer use a .dark ancestor).
const THEMES = { light: [''], dark: [':host(.dark) ', '.dark '] };

const INITIAL_DIMENSION = { width: 320, height: 200 };

const ChartContext = React.createContext(null);

/** { config, engine, id } of the nearest ChartContainer. */
function useChart() {
    const context = React.useContext(ChartContext);
    if (!context) throw new Error('useChart must be used within a <ChartContainer />');
    return context;
}

/** A config key as a CSS custom-property-safe name (keys come from data: "1 - Critical"). */
function chartKey(key) {
    return String(key == null ? '' : key).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Theme palette colour n (1-based, cycles through --chart-1…5). */
function chartColor(n) {
    const i = ((Math.max(1, Math.floor(n || 1)) - 1) % 5) + 1;
    return `var(--chart-${i})`;
}

const CONTAINER_CLASSES =
    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden [&_.recharts-wrapper]:outline-hidden";

/** Same-sized placeholder while the engine loads (or the message when it fails). */
function ChartPlaceholder({ status, error, retry }) {
    if (status === 'error') {
        return (
            <div
                role="alert"
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center text-muted-foreground"
            >
                <span>Chart could not load{error && error.message ? `: ${error.message}` : ''}</span>
                <button
                    type="button"
                    onClick={retry}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                    <RotateCw className="size-3.5" aria-hidden="true" />
                    Retry
                </button>
            </div>
        );
    }
    return (
        <div
            data-slot="chart-loading"
            aria-busy="true"
            aria-label="Loading chart"
            className="h-full w-full animate-pulse rounded-lg bg-muted/60"
        />
    );
}

/**
 * shadcn's ChartContainer: the chart config as CSS variables (--color-<key>), the Recharts theme
 * classes and a ResponsiveContainer. Children: Recharts elements, or a function (R) => elements
 * that receives the Recharts module. Size it with a class (default aspect-video): h-64, aspect-square…
 */
function ChartContainer({ id, className, children, config, initialDimension = INITIAL_DIMENSION, ...props }) {
    const uniqueId = React.useId();
    const chartId = `chart-${chartKey(id != null ? id : uniqueId)}`;
    const { engine, status, error, retry } = useChartEngine();
    const value = React.useMemo(() => ({ config: config || {}, engine, id: chartId }), [config, engine, chartId]);
    let body = null;
    if (engine) {
        const content = typeof children === 'function' ? children(engine) : children;
        body = <engine.ResponsiveContainer initialDimension={initialDimension}>{content}</engine.ResponsiveContainer>;
    } else {
        body = <ChartPlaceholder status={status} error={error} retry={retry} />;
    }
    return (
        <ChartContext.Provider value={value}>
            <div data-slot="chart" data-chart={chartId} className={cn(CONTAINER_CLASSES, className)} {...props}>
                <ChartStyle id={chartId} config={config || {}} />
                {body}
            </div>
        </ChartContext.Provider>
    );
}

/** The <style> with --color-<key> for each config entry, per theme (light and :host(.dark)). */
function ChartStyle({ id, config }) {
    const colorConfig = Object.entries(config || {}).filter(([, c]) => c && (c.theme || c.color));
    if (!colorConfig.length) return null;
    const css = Object.entries(THEMES)
        .map(([theme, prefixes]) => {
            const lines = colorConfig
                .map(([key, c]) => {
                    const color = (c.theme && c.theme[theme]) || c.color;
                    return color ? `  --color-${chartKey(key)}: ${String(color).replace(/[;{}<>]/g, '')};` : null;
                })
                .filter(Boolean)
                .join('\n');
            const selector = prefixes.map((p) => `${p}[data-chart=${id}]`).join(', ');
            return `${selector} {\n${lines}\n}`;
        })
        .join('\n');
    return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/** Recharts' Tooltip (from the loaded engine). Use inside a ChartContainer. */
function ChartTooltip(props) {
    const { engine } = useChart();
    if (!engine) return null;
    return <engine.Tooltip {...props} />;
}

/** Recharts' Legend (from the loaded engine). Use inside a ChartContainer. */
function ChartLegend(props) {
    const { engine } = useChart();
    if (!engine) return null;
    return <engine.Legend {...props} />;
}

/** The config entry for a tooltip / legend payload item. */
function getPayloadConfigFromPayload(config, payload, key) {
    if (typeof payload !== 'object' || payload === null) return undefined;
    const payloadPayload =
        'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
            ? payload.payload
            : undefined;
    let configLabelKey = key;
    if (key in payload && typeof payload[key] === 'string') configLabelKey = payload[key];
    else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === 'string')
        configLabelKey = payloadPayload[key];
    return configLabelKey in config ? config[configLabelKey] : config[key];
}

function defaultValue(value) {
    return typeof value === 'number' ? value.toLocaleString() : String(value);
}

/**
 * shadcn's tooltip content. Extra (ours): valueFormatter(value, item) formats each value and keeps
 * the row layout (shadcn's `formatter` replaces the whole row).
 */
function ChartTooltipContent({
    active,
    payload,
    className,
    indicator = 'dot',
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    valueFormatter,
    color,
    nameKey,
    labelKey,
}) {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
        if (hideLabel || !payload || !payload.length) return null;
        const item = payload[0];
        const key = `${labelKey || (item && item.dataKey) || (item && item.name) || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const value =
            !labelKey && typeof label === 'string'
                ? (config[label] && config[label].label) || label
                : itemConfig && itemConfig.label;
        if (labelFormatter) {
            return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
        }
        if (!value) return null;
        return <div className={cn('font-medium', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload || !payload.length) return null;

    const nestLabel = payload.length === 1 && indicator !== 'dot';
    const format = valueFormatter || defaultValue;

    return (
        <div
            className={cn(
                'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
                className
            )}
        >
            {!nestLabel ? tooltipLabel : null}
            <div className="grid gap-1.5">
                {payload
                    .filter((item) => item.type !== 'none')
                    .map((item, index) => {
                        const key = `${nameKey || item.name || item.dataKey || 'value'}`;
                        const itemConfig = getPayloadConfigFromPayload(config, item, key);
                        const indicatorColor = color || (item.payload && item.payload.fill) || item.color;
                        return (
                            <div
                                key={index}
                                className={cn(
                                    'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                                    indicator === 'dot' && 'items-center'
                                )}
                            >
                                {formatter && item.value !== undefined && item.name ? (
                                    formatter(item.value, item.name, item, index, item.payload)
                                ) : (
                                    <>
                                        {itemConfig && itemConfig.icon ? (
                                            <itemConfig.icon />
                                        ) : (
                                            !hideIndicator && (
                                                <div
                                                    className={cn(
                                                        'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                                                        {
                                                            'h-2.5 w-2.5': indicator === 'dot',
                                                            'w-1': indicator === 'line',
                                                            'w-0 border-[1.5px] border-dashed bg-transparent':
                                                                indicator === 'dashed',
                                                            'my-0.5': nestLabel && indicator === 'dashed',
                                                        }
                                                    )}
                                                    style={{
                                                        '--color-bg': indicatorColor,
                                                        '--color-border': indicatorColor,
                                                    }}
                                                />
                                            )
                                        )}
                                        <div
                                            className={cn(
                                                'flex flex-1 justify-between gap-4 leading-none',
                                                nestLabel ? 'items-end' : 'items-center'
                                            )}
                                        >
                                            <div className="grid gap-1.5">
                                                {nestLabel ? tooltipLabel : null}
                                                <span className="text-muted-foreground">
                                                    {(itemConfig && itemConfig.label) || item.name}
                                                </span>
                                            </div>
                                            {item.value != null && (
                                                <span className="font-mono font-medium text-foreground tabular-nums">
                                                    {format(item.value, item)}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

/** shadcn's legend content (wraps on narrow screens). */
function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }) {
    const { config } = useChart();
    if (!payload || !payload.length) return null;
    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5',
                verticalAlign === 'top' ? 'pb-3' : 'pt-3',
                className
            )}
        >
            {payload
                .filter((item) => item.type !== 'none')
                .map((item, index) => {
                    const key = `${nameKey || item.dataKey || 'value'}`;
                    const itemConfig = getPayloadConfigFromPayload(config, item, key);
                    return (
                        <div
                            key={index}
                            className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
                        >
                            {itemConfig && itemConfig.icon && !hideIcon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 rounded-[2px]"
                                    style={{ backgroundColor: item.color }}
                                />
                            )}
                            {(itemConfig && itemConfig.label) || item.value}
                        </div>
                    );
                })}
        </div>
    );
}

// ---------------------------------------------------------------------------------------------
// Accessibility: text summary, data table fallback, chart / table toggle.
// ---------------------------------------------------------------------------------------------

/** Series as [{ key, label, color }] from strings, objects or a chart config. */
function normalizeSeries(series, config) {
    const list = Array.isArray(series) && series.length ? series : Object.keys(config || {});
    return list.map((s, i) => {
        const o = typeof s === 'string' ? { key: s } : s || {};
        const c = (config && config[o.key]) || {};
        return {
            key: String(o.key),
            label: o.label != null ? o.label : c.label != null ? c.label : String(o.key),
            color: o.color || c.color || chartColor(i + 1),
        };
    });
}

/** Chart config ({ key: { label, color } }) from normalized series. */
function configFromSeries(series) {
    const out = {};
    series.forEach((s) => {
        out[s.key] = { label: s.label, color: s.color };
    });
    return out;
}

function toNumber(v) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
}

function labelText(label) {
    return typeof label === 'string' || typeof label === 'number' ? String(label) : '';
}

/**
 * A plain-language summary of a chart for screen readers (and the visible caption, if wanted):
 * describeChart({ type: 'bar', title, data, index, series, valueFormatter }).
 * Single series: total (unless total: false, e.g. for averages), highest and lowest. Several: per-series totals. Time series: first → last.
 */
function describeChart({
    type = 'chart',
    title,
    data,
    index,
    series,
    config,
    valueFormatter,
    timeSeries,
    total: withTotal = true,
} = {}) {
    const rows = Array.isArray(data) ? data : [];
    const list = normalizeSeries(series, config);
    const fmt = valueFormatter || ((v) => (typeof v === 'number' ? v.toLocaleString() : String(v)));
    const name = title ? `${title}: ` : '';
    const kind = `${type} chart`;
    if (!rows.length || !list.length) return `${name}${kind} with no data.`;
    const cat = (r) => labelText(r[index]);
    if (list.length === 1) {
        const k = list[0].key;
        const vals = rows.map((r) => ({ label: cat(r), value: toNumber(r[k]) })).filter((x) => x.value != null);
        if (!vals.length) return `${name}${kind} with no data.`;
        const total = vals.reduce((a, b) => a + b.value, 0);
        const max = vals.reduce((a, b) => (b.value > a.value ? b : a));
        const min = vals.reduce((a, b) => (b.value < a.value ? b : a));
        if (timeSeries) {
            const first = vals[0];
            const last = vals[vals.length - 1];
            return `${name}${kind} of ${labelText(list[0].label)} over ${vals.length} periods, from ${first.label} (${fmt(first.value)}) to ${last.label} (${fmt(last.value)}). Peak ${fmt(max.value)} in ${max.label}; low ${fmt(min.value)} in ${min.label}.`;
        }
        return `${name}${kind} of ${labelText(list[0].label)} across ${vals.length} groups${withTotal ? `, total ${fmt(total)}` : ''}. Highest: ${max.label} (${fmt(max.value)}). Lowest: ${min.label} (${fmt(min.value)}).`;
    }
    const totals = list
        .map((s) => {
            const t = rows.reduce((a, r) => a + (toNumber(r[s.key]) || 0), 0);
            return `${labelText(s.label)} ${fmt(t)}`;
        })
        .join(', ');
    return `${name}${kind} of ${list.length} series across ${rows.length} ${timeSeries ? 'periods' : 'groups'}. Totals: ${totals}.`;
}

/**
 * The chart's data as a table (the "View as table" fallback). Rows can be buttons when
 * onRowClick is given, so keyboard and screen reader users get the click-through too.
 */
function ChartDataTable({
    data,
    index,
    indexLabel,
    series,
    config,
    valueFormatter,
    caption,
    onRowClick,
    className,
    maxHeight = 320,
}) {
    const rows = Array.isArray(data) ? data : [];
    const list = normalizeSeries(series, config);
    const fmt = valueFormatter || ((v) => (typeof v === 'number' ? v.toLocaleString() : v == null ? '' : String(v)));
    return (
        <div
            data-slot="chart-table"
            className={cn('w-full overflow-auto rounded-lg border', className)}
            style={maxHeight ? { maxHeight } : undefined}
        >
            <table className="w-full border-collapse text-left text-sm">
                {caption ? <caption className="sr-only">{caption}</caption> : null}
                <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
                    <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                            {indexLabel || index}
                        </th>
                        {list.map((s) => (
                            <th key={s.key} scope="col" className="px-3 py-2 text-right font-medium">
                                {s.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-t">
                            <th scope="row" className="px-3 py-1.5 font-normal">
                                {onRowClick ? (
                                    <button
                                        type="button"
                                        onClick={() => onRowClick(r, i)}
                                        className="text-left underline-offset-4 hover:underline focus-visible:underline"
                                    >
                                        {labelText(r[index]) || '(empty)'}
                                    </button>
                                ) : (
                                    labelText(r[index]) || '(empty)'
                                )}
                            </th>
                            {list.map((s) => (
                                <td key={s.key} className="px-3 py-1.5 text-right font-mono tabular-nums">
                                    {r[s.key] == null ? '' : fmt(r[s.key], { dataKey: s.key, payload: r })}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** "View as table" / "View as chart" button (aria-pressed), for a card header or toolbar. */
function ChartViewToggle({ view = 'chart', onViewChange, className }) {
    const table = view === 'table';
    return (
        <button
            type="button"
            aria-pressed={table}
            onClick={() => onViewChange && onViewChange(table ? 'chart' : 'table')}
            title={table ? 'View as chart' : 'View as table'}
            className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                className
            )}
        >
            {table ? (
                <ChartColumn className="size-3.5" aria-hidden="true" />
            ) : (
                <Table2 className="size-3.5" aria-hidden="true" />
            )}
            <span>{table ? 'View as chart' : 'View as table'}</span>
        </button>
    );
}

/**
 * A chart's accessible frame: <figure> labelled by the title, described by the text summary (a
 * visually hidden caption unless showSummary), with the chart or its data table. Controlled
 * `view` ('chart' | 'table'), or uncontrolled with defaultView + the built-in toggle (toggle).
 */
function ChartFigure({
    title,
    summary,
    showSummary = false,
    view: viewProp,
    defaultView = 'chart',
    onViewChange,
    toggle = false,
    table,
    className,
    children,
}) {
    const [inner, setInner] = React.useState(defaultView);
    const view = viewProp || inner;
    const setView = (v) => {
        if (!viewProp) setInner(v);
        if (onViewChange) onViewChange(v);
    };
    const summaryId = React.useId();
    return (
        <figure
            data-slot="chart-figure"
            role="group"
            aria-label={labelText(title) || undefined}
            aria-describedby={summary ? summaryId : undefined}
            className={cn('m-0 flex min-w-0 flex-col gap-2', className)}
        >
            {toggle ? (
                <div className="flex justify-end">
                    <ChartViewToggle view={view} onViewChange={setView} />
                </div>
            ) : null}
            {view === 'table' && table ? table : children}
            {summary ? (
                <figcaption id={summaryId} className={showSummary ? 'text-xs text-muted-foreground' : 'sr-only'}>
                    {summary}
                </figcaption>
            ) : null}
        </figure>
    );
}

// ---------------------------------------------------------------------------------------------
// Formatting helpers (shared by the blocks, the data-bound primitives and widgets).
// ---------------------------------------------------------------------------------------------

/** Number formatter: formatNumber(1234.5) → "1,234.5"; { compact: true } → "1.2K"; { decimals }. */
function formatNumber(value, options) {
    const n = toNumber(value);
    if (n == null) return value == null ? '' : String(value);
    const o = options || {};
    const opts = {};
    if (o.compact) {
        opts.notation = 'compact';
        opts.maximumFractionDigits = o.decimals != null ? o.decimals : 1;
    } else {
        opts.maximumFractionDigits = o.decimals != null ? o.decimals : Math.abs(n) < 10 && n % 1 ? 2 : n % 1 ? 1 : 0;
    }
    if (o.percent) {
        opts.style = 'percent';
        return new Intl.NumberFormat(o.locale, opts).format(n / 100);
    }
    return new Intl.NumberFormat(o.locale, opts).format(n);
}

/**
 * Seconds → "3d 4h", "5h 12m", "42m", "30s": the largest unit plus the next one when it isn't zero
 * (maxUnits = 2); formatDuration(v, 1) → "3d" (axis ticks).
 */
function formatDuration(seconds, maxUnits = 2) {
    const s = toNumber(seconds);
    if (s == null) return '';
    const units = [
        ['d', 86400],
        ['h', 3600],
        ['m', 60],
        ['s', 1],
    ];
    const abs = Math.round(Math.abs(s));
    let first = units.findIndex(([, size]) => abs >= size);
    if (first < 0) first = units.length - 1;
    const parts = [];
    let rest = abs;
    units.slice(first, first + Math.max(1, maxUnits)).forEach(([u, size], i) => {
        const q = Math.floor(rest / size);
        rest -= q * size;
        if (i === 0 || q > 0) parts.push(`${q}${u}`);
    });
    return (s < 0 ? '-' : '') + parts.join(' ');
}

/** True when the user asked for reduced motion (charts skip their animations). */
function prefersReducedMotion() {
    try {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
        return false;
    }
}

export {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    ChartStyle,
    ChartFigure,
    ChartDataTable,
    ChartViewToggle,
    ChartPlaceholder,
    useChart,
    useChartEngine,
    useRecharts,
    loadChartEngine,
    isChartEngineLoaded,
    describeChart,
    normalizeSeries,
    configFromSeries,
    chartColor,
    chartKey,
    formatNumber,
    formatDuration,
    prefersReducedMotion,
    getPayloadConfigFromPayload,
};
