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

The gallery has 54 blocks in ten families, plus the **Live data** family (blocks bound to records, below).

| Family | Block | What it shows | Record |
|---|---|---|---|
| Area | Campaign Impressions | This period vs the prior one as dashed area fills; KPI tiles, channel filter, period menu, accent colour, per-channel tooltip | `charts/campaign-impressions` |
| Area | Orders Overview | Orders, revenue and average order value vs the prior period; metric tabs, hatched gradient area, curve and layer menu | `charts/orders-overview` |
| Area | Inbound Leads | Leads this year vs last year by month or quarter; drifting particles, moving-average trend, display menu | `charts/inbound-leads` |
| Area | Generation Mix | Hourly output by source as gradient ridges in 3D depth; 3D / 2D toggle, baseline compare, hour readout | `charts/generation-mix` |
| Bar | Inventory Velocity | Units sold per day by category as pill bars coloured by days of supply; warehouse filter, sort, period menu | `charts/inventory-velocity` |
| Bar | Training Volume | Weekly volume for a 12-week block as patterned columns; the last block as ghost lanes or the plan as a checker | `charts/training-volume` |
| Bar | Cron Run Durations | A job's last 20 runs as stacked phase columns by status; p50 to p95 band, timeout line, outlier and deploy markers | `charts/cron-run-durations` |
| Bar | Cron Runner Load | Hourly runner time stacked by outcome; time window, job picker, outcome toggles, runner time or run count | `charts/cron-runner-load` |
| Bar | Transit vs Target | Diverging lanes of transit days vs target per region and freight mode; median / P90 switch, sort | `charts/transit-vs-target` |
| Bar | Yearly Fund Inflows | Yearly inflows as pseudo-3D prisms stacked by fund; run-rate estimate, a year picker that drives the KPI tiles | `charts/fund-inflows` |
| Bar | Error Budget Burn | An SLO's daily budget burn-down as lollipops; forecast dots, warn line, over-budget ribbon, event markers | `charts/error-budget-burn` |
| Bar | Data Sync Activity | Hourly sync runs (succeeded / slow / failed) or rows synced on a hatched track; source filter, KPI tiles | `charts/data-sync-activity` |
| Bar | Sync Run History | One connection's last 24 hours as outcome columns above its recent runs; success rate, freshness, next sync | `charts/sync-run-history` |
| Bar | SLO Burn Rate | Hourly burn rate on a log scale with a page line; multi-window burn lollipops and alert rules | `charts/slo-burn-rate` |
| Bar | Audit Log Volume | Audit events as stacked outcome pills from 5-minute to daily buckets; denials awaiting review, filters | `charts/audit-log-volume` |
| Bar | Firewall Traffic | Requests per hour as columns of pills (blocked, challenged, allowed) with incident markers; range and filters | `charts/firewall-traffic` |
| Composed | Sales vs Goal | Monthly sales as area + line vs a dashed goal and last year; range menu, display menu, accent picker | `charts/sales-vs-goal` |
| Composed | Operating Margin | Revenue and opex columns with the margin as a line above; target, projected and forecast months, KPI tiles | `charts/operating-margin` |
| Composed | Cashflow Trend | The cash balance over in / out columns with a reserve floor, or a waterfall of net changes | `charts/cashflow-trend` |
| Composed | Liquidity Flows | A lending pool's supply and withdrawals by asset, TVL as a lane above; range toggle, asset filter | `charts/liquidity-flows` |
| Composed | Canary Rollback | Canary latency as stacked baseline / regression / excess columns under a limit line, with a rollout stage track | `charts/canary-rollback` |
| Composed | Revenue Map | Revenue by region on a dotted world map (plain SVG); hover or pin a region, top hot spots, segment and period selects | `charts/revenue-map` |
| Line | Balance Tracker | Daily balance with high / low markers and a halo on the last close; average line, rebased benchmark, range tabs | `charts/balance-tracker` |
| Line | Metric Switcher | Four KPI tiles switching one gradient area over the previous period's ghost line; annotations, range tabs | `charts/metric-switcher` |
| Line | Revenue Trend | Net revenue and its subscription / one-time parts with a comparison line and a dotted in-progress tail | `charts/revenue-trend` |
| Line | Social Engagement | One line per channel for the chosen metric, optional previous-period ghosts; range, metric and format pickers | `charts/social-engagement` |
| Line | Sales vs Traffic | Sales and product views on two y axes; KPI tiles, compare toggle, a colour per line | `charts/sales-vs-traffic` |
| Line | Floor Monitor | Floor price vs top bid with the spread as a band and an alert level that turns the line red | `charts/floor-monitor` |
| Pie | Inflows by Source | Donut of the top three sources plus a hatched rest; period total, per-source rows, week / month / year switch | `charts/inflows-by-source` |
| Pie | Browser Usage | Hatched donut of visitors by browser with a previous-period ring and a breakdown table that hovers in sync | `charts/browser-usage` |
| Pie | Cloud Spend | A budget rose (plain SVG): wedge width = budget share, length = budget use, overspend breaks a dashed ring | `charts/cloud-spend` |
| Radial | Error Budgets | Budget left on four SLOs as concentric striped rings beside a table; service select, window switch | `charts/error-budgets` |
| Radial | API Health | Four gateway SLO gauges as rings of ticks in green / amber / red with watch and redline bands | `charts/api-health` |
| Radial | Inflows Gauge | A day clock of inflows: spokes stacked by source, ghost prior spokes, a target ring and a pace bead | `charts/inflows-gauge` |
| Sankey | Revenue Flow | A quarterly income statement as a sankey; hover a node or ribbon for its lineage, click to pin | `charts/revenue-flow` |
| Sankey | Trial Journey | A trial funnel as a sankey with named drop-off nodes and pulses travelling along the ribbons | `charts/trial-journey` |
| Sankey | Pipeline Leakage | Deals narrowing through six stages as a centred ribbon, red drops leaking at each stage boundary | `charts/pipeline-leakage` |
| Slope | Error Budget Runway | Services ranked by traffic joined to their days of budget left; thickness = traffic, colour = status | `charts/error-budget-runway` |
| Slope | Retention Crossover | Channels ranked by signups joined to their retention rank on a chosen day; a scrubbable Day 1 to Day 90 ruler | `charts/retention-crossover` |
| Sparkline | KPI Strip | A row of KPI tiles with a corner line sparkline, trend badge and day-by-day tooltip | `charts/kpi-strip` |
| Sparkline | KPI Trend Cards | Three KPI cards, each with a monotone gradient sparkline area and a hover value | `charts/kpi-trend-cards` |
| Sparkline | Order Metrics | A list of metrics with value, trend badge and a thin sparkline on a faint grid, green up / red down | `charts/order-metrics` |
| Sparkline | Inventory Health | Four catalog metrics with change badges and sparklines; week / month / year tabs | `charts/inventory-health` |
| Sparkline | Distance Tracker | A period total over a full-bleed dotted-area sparkline; week / month / year tabs (plain SVG) | `charts/distance-tracker` |
| Sparkline | Wallet Balances | Balance cards with an icon tile, the change and a bottom-anchored line over a dotted bed | `charts/wallet-balances` |
| Sparkline | Wealth Overview | A 2 × 2 grid of finance KPIs with delta badges and mini area sparklines | `charts/wealth-overview` |
| Sparkline | Cron Job Health | Four cards for scheduled jobs: job state ticks, hourly success vs SLO and more | `charts/cron-job-health` |
| Sparkline | SLO Fleet Health | Four SLO cards with lollipop minis: budget left per SLO, the fleet median, SLOs burning now | `charts/slo-fleet-health` |
| Sparkline | SLO Budgets | An SLO list with diverging budget pins and a 28-day dot sparkline per row | `charts/slo-budgets` |
| Sparkline | Connection Health | Four data-connection cards: health and sync-state segment bars, a rows-synced trend | `charts/connection-health` |
| Status tracker | Cron Run History | One row per cron job, its last 10 / 20 runs as capsules (height = duration); fleet stats, filter, sort | `charts/cron-run-history` |
| Status tracker | Deploy History | Pipeline runs with a segmented 6-stage meter and a per-stage hover card; environment filter | `charts/deploy-history` |
| Status tracker | Release Lanes | Staging / Sandbox / Production lanes: health, latest deploy, live stage meter, service version matrix | `charts/release-lanes` |
| Status tracker | Working Agreements | 26 weekly tiles per team practice shaded by share of target, team score and area rings, week cards to pause or retarget a practice | `charts/working-agreements` |
| Live data | Incident Status Tracker | Records per group (priority) over the last N days as SLA-coloured day capsules (below) | `charts/incident-status-tracker` |
| Live data | Live blocks | Campaign Impressions, KPI Strip and Order Metrics fed with live incident counts (below) | `charts/live-blocks` |

```tsx
import { CampaignImpressions } from 'components:charts/campaign-impressions';

<CampaignImpressions />                                     // sample data
<CampaignImpressions title="Ad impressions" periods={{ '30d': { label: 'Last 30 days', days: 30, data: rows, range: '…' } }} />
```

Every block keeps the accessibility pattern of the other charts: a labelled `<figure>`, a text summary, a **View as table** item in its **…** menu, and Recharts' keyboard layer.

### Incident status tracker

`components:charts/incident-status-tracker` (`IncidentStatusTracker`, `useIncidentStatusRows`, `dayTone`) is a status tracker fed by records, in the visual language of Cron Run History. Each row is a group (incident priorities 1 to 4 by default, or any `groupBy` field). Each of the last `days` days is a capsule: its colour is the day's SLA status and its height is the number of records opened that day, scaled per row. A hover card shows the day's opened, resolved and breached counts and the within-SLA share. Each row ends with its within-SLA rate. Fleet tiles, a filter (all / breaching / healthy), a window and sort menu, CSV and copy-summary exports complete the card.

| Prop | Default | Meaning |
|---|---|---|
| `table`, `query` | `incident`, none | Records to read, as the user |
| `groupBy`, `groups` | `priority`, priorities 1 to 4 | Field for the rows; `groups` fixes the rows and their order (`{ key, label, description? }`, key = raw value) |
| `dateField` | `opened_at` | The day a record counts on |
| `resolvedField` | `resolved_at` | Day of the resolved count; `false` skips it |
| `days` | 30 | Days shown (max 90); the window menu offers 7 / 14 / 30 within that |
| `slaField`, `breachQuery` | `made_sla`, `made_sla=false` | What makes a record breached; `breachQuery` overrides `slaField` |
| `amberAt`, `redAt`, `redShare` | 1, 3, 0.5 | Day status thresholds |
| `rows` | none | Static rows `{ key, label, description?, days: [{ date, opened, breached, resolved? }] }`; nothing is read |
| `live`, `refreshInterval` | off | Record-watch refetch; polling in seconds |
| `title`, `description`, `groupLabel`, `noun` | | Text; `noun` is the plural used in labels (`incidents`) |
| `onSelectDay({ row, day, query })` | none | Click a capsule: the day's records as an encoded query |

Live data is three `useTimeSeries` requests (one alias per day, grouped by `groupBy`): records opened per day, the same AND `breachQuery`, and records resolved per day. Day status, from the records opened that day:
- **No records** (muted dot): nothing opened.
- **No breaches** (green): breached < `amberAt`, i.e. zero by default.
- **Many breaches** (red): breached ≥ `redAt`, or breached / opened ≥ `redShare`.
- **Some breaches** (amber): anything in between.

```tsx
import { IncidentStatusTracker } from 'components:charts/incident-status-tracker';

<IncidentStatusTracker live />                                                  // incident by priority, 30 days
<IncidentStatusTracker groupBy="assignment_group" query="active=true" days={14} title="SLA by group" />
<IncidentStatusTracker table="sc_req_item" groupBy="cat_item" noun="requests"
                       onSelectDay={({ query }) => navigate('requests-list', { table: 'sc_req_item', query })} />
<IncidentStatusTracker rows={rows} />                                           // static data
```

### Live blocks

`components:charts/live-blocks` holds thin adapters that feed existing gallery blocks with live incident counts. They only build the block's own data props, so the block renders exactly as in the gallery. Each takes `table` (default `incident`), `query`, `dateField`, `live`, `refreshInterval`, `title` and `className`.

| Export | Block | Data |
|---|---|---|
| `LiveIncidentImpressions` | Campaign Impressions | Records opened per bucket, this period (area) vs the prior one (dashed), split by `groupBy` (priority) as the channels. All three periods (7 days daily, 30 days in 3-day buckets, 90 days in 9-day buckets) come from one aggregate request of 54 grouped counts. `groups` sets the channels (`{ value, label, light, dark }`) |
| `LiveIncidentKpis` | KPI Strip | One `useScore` per tile over the last `period` days (7) vs the ones before, with a daily sparkline. Default tiles: opened, resolved, critical opened, breached SLA; `kpis={[{ key, label, query?, dateField?, seriesLabel? }]}` replaces them (up to six) |
| `LiveIncidentTrends` | Order Metrics | One row per priority: records per day on `dateField` (`resolved_at`) over `days` (30), the change vs the prior `days`; one `useTimeSeries` request |

```tsx
import { LiveIncidentImpressions, LiveIncidentKpis, LiveIncidentTrends } from 'components:charts/live-blocks';

<LiveIncidentImpressions query="active=true" live />
<LiveIncidentKpis period={14} />
<LiveIncidentTrends dateField="opened_at" verb="opened" days={14} />
```

Limits:
- KPI Strip and Order Metrics colour trends by sign (up = green). For counts where up is bad (opened, breached), green means more.
- Campaign Impressions' tooltip shows channel shares as `NaN%` for a bucket with no records (it divides by the bucket total).
- Inventory Velocity is not adapted: on-hand stock, days of supply and warehouses have no incident meaning.
