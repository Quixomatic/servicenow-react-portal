---
title: Charts and dashboards
description: components:chart (shadcn charts on Recharts 3, lazily loaded), the chart building blocks, utilities:charts/analytics (aggregates as the user), charts/data-chart, charts/score-tile and the Chart Card / Score Card widgets.
section: Primitives and utilities
order: 30
tags: [charts, recharts, dashboards, analytics, kpi, accessibility]
---

# Charts and dashboards

Charts come in three layers:

1. **Host kit, `components:chart`.** shadcn's chart, the building blocks and the accessibility pieces. It is generic and knows nothing about tables.
2. **Data.** `utilities:charts/analytics` runs aggregates as the user. `components:charts/data-chart` and `components:charts/score-tile` bind the blocks to a table.
3. **Widgets.** `charts/chart-card` and `charts/score-card` configure everything from options.

The Dashboard portal's **Dashboards** page (`app` portal, route `dashboards`) uses all of them.

## The engine: Recharts in a lazy chunk

The chart engine is [Recharts](https://recharts.org) **3.10.1** (MIT), pinned. It is the version line shadcn's chart now targets (Recharts 3); Recharts 3 also lets you wrap chart children in your own components, and its peer range includes React 19.

Recharts is not in the main host bundle. It ships as the `portal-charts` chunk (~600 KB minified, ~167 KB gzipped), which `import()` fetches the first time any chart mounts, once per page. A page without charts pays nothing for it. The kit pieces in the main bundle add about 28 KB minified (~9 KB gzipped).

While the chunk loads, every chart shows a same-sized pulse, so the layout doesn't move. If the chunk fails to load, the chart shows a message with **Retry**.

The chunk is pre-bundled by `pnpm run vendor:charts`, which writes `packages/portal-host/src/vendor/recharts.js`. Inside it, `react` and `react-dom` resolve to the host's own React 19, read from the module registry when the chunk loads. Recharts therefore renders with the same React as the page, and the chunk holds no React copy. Run `vendor:charts` again after changing the `recharts` or `react-is` devDependencies.

## components:chart

### shadcn's chart

| Export | Notes |
|---|---|
| `ChartContainer` | `config` (ChartConfig), `className` (size: default `aspect-video`; `h-64`, `aspect-square`, …), `initialDimension`. Children: Recharts elements, or `(R) => elements`, where `R` is the Recharts module |
| `ChartTooltip`, `ChartTooltipContent` | shadcn's tooltip (`indicator` dot / line / dashed, `hideLabel`, `hideIndicator`, `nameKey`, `labelKey`, `labelFormatter`, `formatter`), plus `valueFormatter(value, item)`, which formats the value and keeps the row layout |
| `ChartLegend`, `ChartLegendContent` | shadcn's legend (`nameKey`, `hideIcon`, `verticalAlign`); it wraps on narrow screens |
| `ChartStyle` | The config as `--color-<key>` CSS variables, for light and for `:host(.dark)` (`theme: { light, dark }` or `color`) |
| `useChart()` | `{ config, engine, id }` of the nearest container |
| `useRecharts()`, `useChartEngine()`, `loadChartEngine()`, `isChartEngineLoaded()` | The Recharts module (`null` while it loads); `{ engine, status, error, retry }` |

Writing your own Recharts chart:

```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from 'components:chart';

const config = { opened: { label: 'Opened', color: 'var(--chart-1)' } };

<ChartContainer config={config} className="h-64">
    {(R) => (
        <R.BarChart data={rows} accessibilityLayer>
            <R.CartesianGrid vertical={false} />
            <R.XAxis dataKey="week" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <R.Bar dataKey="opened" fill="var(--color-opened)" radius={6} />
        </R.BarChart>
    )}
</ChartContainer>
```

You can't `import … from 'recharts'` in a widget, because the engine loads lazily. Take it from the container's function child, or from `useRecharts()`.

### Building blocks

They take data plus series and produce an accessible, themed chart:

| Block | Key props |
|---|---|
| `BarChart` | `orientation` vertical (columns) / horizontal, `stacked` (grouped otherwise), `variant` default / gradient / hatched, `radius`, `showLabels`, `hoverHighlight` (dims the other bars), `maxBarSize`, `categoryWidth` |
| `LineChart` | `curve` (monotone, linear, step, natural), `dots`, `glow`, `strokeWidth` |
| `AreaChart` | `gradient` (default on), `stacked`, `curve`, `glow` |
| `PieChart` | `valueKey`, `donut`, `innerRadius`, `centerLabel` (`{ value, label }`; the total by default; `false` hides it), `showLabels` |
| `RadialChart` | Gauge: `value`, `max` (100), `label`, `color`. Rings: `data`, `index`, `valueKey` |
| `Sparkline` | `data` (numbers or rows + `valueKey`), `type` line / area / bar, `color`, `height` (36), `showLastDot`, `showTooltip` |
| `Chart` | One component for every type: `type` = bar, bar-horizontal, bar-stacked, line, area, area-stacked, pie, donut, radial |

Shared props:
- data: `data`, `index` (the category or x key), `indexLabel`, `series` (keys, or `{ key, label, color }`), `config`;
- display: `valueFormatter`, `height` (px), `className`, `showTooltip`, `showLegend` (on with more than one series), `showGrid`, `animate`;
- interaction: `onValueClick({ row, index, key })`;
- accessibility: `title`, `summary`, `showSummary`, `view`, `tableProps`.

Colours cycle through the theme's `--chart-1…5` unless a series sets its own. Themes define these colours for light and dark (`tokensDark`). The host falls back to shadcn's palette when a theme sets none.

```tsx
import { BarChart, PieChart, Sparkline } from 'components:chart';

<BarChart data={rows} index="label" series={[{ key: 'value', label: 'Open' }]} variant="gradient" />
<BarChart data={rows} index="label" series={['new', 'in_progress']} stacked orientation="horizontal" />
<PieChart data={rows} index="label" valueKey="value" donut />
<Sparkline data={[3, 5, 4, 8, 6]} type="area" />
```

The look follows shadcn's charts, with touches in the spirit of [EvilCharts](https://github.com/legions-developer/evilcharts) (MIT): gradient and hatched fills, glowing strokes, and a hover highlight that dims the other bars or slices. These were reimplemented here; no EvilCharts code was copied.

### Accessibility

Every block:
- renders inside a `<figure>` labelled by its `title`;
- is described by a text summary, generated by `describeChart` unless you pass `summary`. For one series it gives the total, highest and lowest; for a time series, first → last plus peak and low; for several series, per-series totals. The summary is visually hidden unless `showSummary` is set.
- turns on Recharts' `accessibilityLayer`, for keyboard focus and arrow keys between data points.

`view="table"` swaps the chart for `ChartDataTable`, a real `<table>` with a caption and row headers. With `onValueClick`, its row labels become buttons, so keyboard and screen-reader users get the click-through too. `ChartViewToggle` is the "View as table / View as chart" button (`aria-pressed`). Chart Card puts it in the card header.

Animations are skipped when the user prefers reduced motion.

Helpers: `ChartFigure`, `ChartDataTable`, `ChartViewToggle`, `describeChart`, `normalizeSeries`, `configFromSeries`, `chartColor(n)`, `chartKey`, `formatNumber(v, { compact, decimals, percent })`, `formatDuration(seconds)`, `prefersReducedMotion()`.

## utilities:charts/analytics

`utilities:charts/analytics` runs aggregates as the session user, through the platform's aggregate GraphQL (`GlideAggregateRecord_Query`, which UI Builder's aggregate data resources also use). It supports `count`, `sum`, `avg`, `min`, `max` and `countDistinct`, grouped by up to two fields.

**Why GraphQL rather than `/api/now/stats`.** Both run as the user and both return the raw value and the display value per group. The stats REST API, though, takes one HTTP request per time bucket (or the Batch API's base64 envelopes). One GraphQL document carries every bucket as an alias. A 12-week series, or a score with its previous period and a 14-point sparkline, is therefore **one round trip** (~100 ms on the dev instance).

| Export | Returns |
|---|---|
| `useAggregate({ table, query?, groupBy?, aggregate?, field?, sort?, limit?, otherLabel? }, options?)` | `{ rows, groups, series, value, total, isLoading, isFetching, error, refetch }` |
| `useTimeSeries({ table, dateField, interval?, periods?, query?, aggregate?, field?, groupBy?, weekStart?, end? }, options?)` | `{ rows, points, series, total, … }` |
| `useScore({ table, query?, aggregate?, field?, dateField?, period?, sparkline?, target?, lowerIsBetter? }, options?)` | `{ data: { value, previous, delta, deltaPercent, trend, positive, targetProgress, targetMet, query, sparkline, period } }` |
| `fetchAggregate`, `fetchTimeSeries`, `fetchScore` | The same as plain async functions |
| `fetchAggregates(parts)`, `buildAggregateDocument(parts)` | The batching primitive: aliases → raw results |
| `timeBuckets`, `scorePeriods`, `rangeCondition`, `startOf`, `addInterval`, `bucketLabel`, `ymd`, `parseYmd`, `periodDays` | Date buckets |
| `useAnalyticsLive(table, query, options)`, `analyticsKeys` | Live refresh and query keys (`['rp-analytics', table, …]`) |

Options:
- `enabled`;
- `refreshInterval` (seconds);
- `live`: a record watch on the filter that refetches, debounced to 2 s;
- `staleTime`.

How the results are built:
- **Groups.** Results are sorted largest first by default (`sort`: value, value-asc, label, group). `limit` keeps the top N and folds the rest into an "Other" group. With two group-by fields you get one series per value of the second field.
- **Time buckets.** Buckets are day, week (Monday start by default), month, quarter or year, ending with the current one. Bucket edges are `gs.dateGenerate('YYYY-MM-DD','00:00:00')` dates from the browser's calendar, which the platform reads in the user's time zone.
- **Scores.** A number period means rolling days (7 = today and the 6 days before, compared with the 7 days before those). An interval name means "so far this interval" compared with the same span of the previous one. `lowerIsBetter` flips which direction counts as good.
- **Click-through.** Every group, bucket and score carries `query`: the base filter AND the group's condition (`field=value` / `fieldISEMPTY`, or the bucket's date range). Pass it to a list page as `navigate(page, { table, query })`. It travels as a UI Builder page parameter, never `?query=`.

Instance findings (2026-11-20):
- Aggregate field arguments must be inline literals: a GraphQL variable fails with "Invalid argument for aggregate operation". Field names are checked against `/^[a-z0-9_.]+$/` before they go into the document.
- `totalCount` fails without a group by, so ungrouped parts read `count` instead.

## Data-bound primitives

**`components:charts/data-chart`**: `DataChart` (and `useDataChart`, `valueFormatterFor`).

```tsx
<DataChart table="incident" query="active=true" groupBy="priority" type="bar" />
<DataChart table="incident" groupBy="priority" stackBy="state" type="bar-stacked" />
<DataChart table="incident" dateField="opened_at" interval="week" periods={12} type="area" />
<DataChart table="incident" query="resolved_atISNOTEMPTY" groupBy="priority"
           aggregate="avg" field="calendar_stc" format="duration" type="bar-horizontal" />
```

- **Modes.** With `dateField` it draws a time series; `groupBy` then splits it into series. Without one it aggregates grouped by `groupBy`.
- **Formatting.** `format` is number, compact, duration (seconds) or percent.
- **Click-through.** `onSelect({ query, label, row })` fires for a bar, slice, point or table row.
- **States.** Loading, error and empty states keep the chart's height.

**`components:charts/score-tile`**:
- `ScoreTile`, the presentational tile: value, trend arrow, delta %, comparison label, sparkline, target progress, icon. It renders as a button with a spoken summary when `onClick` is set.
- `DataScore`, the same tile bound to `useScore`.
- `comparisonLabel`.

## Widgets

**Chart Card** (`charts/chart-card`) puts a DataChart in a card. Its options:
- data: `table`, `query`, `groupBy`, `stackBy`, `aggregate`, `field`, `sort`, `limit` (top N), `dateField` + `interval` + `periods`;
- display: `title`, `description`, `type`, `format`, `valueLabel`, `height`, `variant`, `showLegend`, `showLabels`, `glow`, `tableToggle` (on), `showSummary`;
- behaviour: `listPage` (click-through), `live`, `refreshInterval`.

**Score Card** (`charts/score-card`) is a KPI tile. Its options:
- data: `table`, `query`, `aggregate`, `field`, `dateField`, `period` (days, or week / month / quarter / year);
- sparkline: `sparkline`, `sparklineInterval`, `sparklinePeriods`, `sparklineType`;
- target: `target`, `lowerIsBetter`;
- display: `label`, `format`, `unit`, `icon`, `color` (chart-1…5 or CSS);
- behaviour: `listPage`, `live`, `refreshInterval`.

Clicking a chart or tile opens `listPage` with the clicked filter as the `table` and `query` page parameters, e.g. `/params/page-id/incidents-list/table/incident/query/priority%3D1`. The list view reads them as its filter.

## Chart gallery

The `charts/` records include a gallery of dashboard chart cards: each block is a whole card (header, toolbar, KPI tiles, chart, legend, tooltip and footer) with sample data, and every one takes its data as props. The **Chart gallery** page of the `app` portal (route `chart-gallery`, widget `charts/chart-gallery`) shows them all, grouped by family.

Visual design inspired by ReUI's chart blocks ([reui.io](https://reui.io/blocks/chart/area-chart)); independent implementation. The card frame (`Frame`, `FramePanel` …) is ported from ReUI's MIT-licensed Frame primitive (Copyright (c) 2025 Keenthemes Inc).

### Layers

| Piece | What it is |
|---|---|
| `components:chart-frame` (host kit) | The card shell and its parts. `Frame` / `FramePanel` / `FrameHeader` / `FrameTitle` / `FrameDescription` / `FrameFooter` (`stacked` joins panels); `ChartCard`; toolbar pieces `ChartToolbar`, `ToolbarGroup`, `ToolbarButton`, `SegmentedControl`, `ToolbarSelect`, `ToolbarMultiSelect`; `ChartMoreMenu` (Export CSV / JSON, Copy summary, extra items, with toasts); `KpiStrip` / `KpiStat`, `DeltaBadge`, `LegendList`, `FooterMeta`, `Dot`; helpers `rowsToCsv`, `downloadText`, `copyText`, `formatDelta`, `useReplay` |
| `components:charts/chart-kit` | Shared chart pieces: Tailwind palette colours (`PALETTE`, `tw`, `series(light, dark)`), `SeriesScope` (series colours as `--color-<key>` on a wrapper), Motion helpers (`useMotion`, `useEnterAnimation`, `GROW_Y`, `baselineOrigin`, `riseFromBaseline`, `EASE_OUT`), marks (`PingDot`, `HaloDot`, `AnchorLine`), `AccentPicker`, formatters (`compact`, `money`, `percent`, `signedPercent`, `shortDate`) and hooks (`useElementWidth`, `labelEvery`, `useMedia`) |
| `components:charts/<block>` | One record per block, e.g. `charts/campaign-impressions` |
| `charts/chart-gallery` (widget) | The gallery; option `family` pins one family |

### Motion

The lazy chart chunk also carries [Motion](https://motion.dev) 12.43.0 (MIT), exposed as `useRecharts().Motion` (`motion`, `AnimatePresence`, `animate`, `useAnimate`, `useInView`, `useReducedMotion`, `useMotionValue`, `useSpring`, `useTransform`, …). The blocks turn Recharts' own animation off and run Motion keyframes instead, e.g. areas grow from the baseline (scaleY 0 → 1 with a fade, 780 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, staggered per series) and dots rise into place. `useEnterAnimation` starts them before the first paint and skips them when the user prefers reduced motion.

### Blocks

| Family | Block | Record |
|---|---|---|
| Area | Campaign Impressions: this period vs the prior one as dashed area fills; KPI tiles; channel filter; period menu; accent colour; per-channel tooltip | `charts/campaign-impressions` |

```tsx
import { CampaignImpressions } from 'components:charts/campaign-impressions';

<CampaignImpressions />                                     // sample data
<CampaignImpressions title="Ad impressions" periods={{ '30d': { label: 'Last 30 days', days: 30, data: rows, range: '…' } }} />
```

Every block keeps the accessibility pattern of the other charts: a labelled `<figure>`, a text summary, a **View as table** item in its **…** menu, and Recharts' keyboard layer.
