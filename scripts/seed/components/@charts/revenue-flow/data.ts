/** Sample data for components:charts/revenue-flow: a quarterly income statement as a flow (USD millions). */

export type FlowKind = 'revenue' | 'cost' | 'profit';
export type FlowNode = { name: string; kind: FlowKind };
export type FlowEdge = { source: number; target: number };
export type Quarter = {
    key: string;
    label: string;
    short: string;
    /** Value of each edge (same order as EDGES). */
    values: number[];
};

export const KINDS: { key: FlowKind; label: string; light: string; dark: string }[] = [
    { key: 'revenue', label: 'Revenue', light: 'neutral-900', dark: 'neutral-200' },
    { key: 'cost', label: 'Costs', light: 'red-600', dark: 'red-400' },
    { key: 'profit', label: 'Profit', light: 'emerald-500', dark: 'emerald-500' },
];

export const NODES: FlowNode[] = [
    { name: 'Subscriptions', kind: 'revenue' },
    { name: 'Usage', kind: 'revenue' },
    { name: 'Services', kind: 'revenue' },
    { name: 'Revenue', kind: 'revenue' },
    { name: 'Gross Profit', kind: 'profit' },
    { name: 'Cost of Revenue', kind: 'cost' },
    { name: 'Operating Income', kind: 'profit' },
    { name: 'Operating Expenses', kind: 'cost' },
    { name: 'Net Income', kind: 'profit' },
    { name: 'Income Tax', kind: 'cost' },
    { name: 'R&D', kind: 'cost' },
    { name: 'Sales & Marketing', kind: 'cost' },
    { name: 'G&A', kind: 'cost' },
];

export const EDGES: FlowEdge[] = [
    { source: 0, target: 3 },
    { source: 1, target: 3 },
    { source: 2, target: 3 },
    { source: 3, target: 4 },
    { source: 3, target: 5 },
    { source: 4, target: 6 },
    { source: 4, target: 7 },
    { source: 6, target: 8 },
    { source: 6, target: 9 },
    { source: 7, target: 10 },
    { source: 7, target: 11 },
    { source: 7, target: 12 },
];

/** Newest first; each quarter is compared with the next one in the list. */
export const QUARTERS: Quarter[] = [
    {
        key: 'q3-fy26',
        label: 'Q3 FY2026',
        short: 'Q3 FY26',
        values: [446, 151, 52, 474, 175, 142, 332, 111, 31, 133, 149, 50],
    },
    {
        key: 'q2-fy26',
        label: 'Q2 FY2026',
        short: 'Q2 FY26',
        values: [412, 138, 46, 438, 158, 136, 302, 107, 29, 124, 131, 47],
    },
    {
        key: 'q1-fy26',
        label: 'Q1 FY2026',
        short: 'Q1 FY26',
        values: [381, 119, 44, 394, 150, 103, 291, 81, 22, 118, 128, 45],
    },
    {
        key: 'q4-fy25',
        label: 'Q4 FY2025',
        short: 'Q4 FY25',
        values: [352, 104, 41, 356, 141, 76, 280, 60, 16, 112, 124, 44],
    },
    {
        key: 'q3-fy25',
        label: 'Q3 FY2025',
        short: 'Q3 FY25',
        values: [318, 94, 37, 317, 132, 48, 269, 38, 10, 108, 119, 42],
    },
];

/** How many of QUARTERS the picker offers (the last one only serves as the comparison base). */
export const PICKABLE = 4;
