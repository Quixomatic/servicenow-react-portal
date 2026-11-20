// Chart engine chunk (Recharts 3), loaded with import() only when a components:chart piece mounts,
// so portal pages without a chart never download it.
//
// Like portal-code.js and portal-rte.js, the CLI deploys this dynamic import as a standalone ES
// module (".../portal-host/portal-charts.jsdbx") that shares nothing with the main bundle. Recharts
// is React components, so it must render with the host's React, not a copy: the pre-bundled
// src/vendor/recharts.js (`pnpm run vendor:charts`) reads react / react-dom from the module registry
// (globalThis.__REACT_PORTAL__.modules) when the chunk loads. The React wrappers (ChartContainer,
// tooltip / legend content, the chart building blocks) live in the main bundle
// (components/ui/chart.jsx, chart-blocks.jsx) and render the components this returns.
//
// It sits at the src root for the same reason as portal-studio.js: the CLI names chunk assets after
// the module path, and a nested path gives an unresolvable /uxasset URL on Windows.
export * from './vendor/recharts';
export { RECHARTS_VERSION as ENGINE_VERSION } from './vendor/recharts';

export const ENGINE = 'recharts';
