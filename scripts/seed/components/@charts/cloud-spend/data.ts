// Sample data for components:charts/cloud-spend: cloud spend vs budget by category (USD thousands) per
// period, with each category's services for the drill-in.

export type SpendCategory = {
    key: string;
    label: string;
    /** Tailwind palette name. */
    color: string;
    /** Services and their share of the category's spend (%). Spend per service = category spend × share. */
    services: { label: string; share: number }[];
};

export type SpendPeriod = {
    label: string;
    since: string;
    dates: string;
    /** Total spend change vs the period before (%). */
    change: number;
    /** Per category: spent and budget (USD thousands) and change vs the period before (%). */
    values: Record<string, { spent: number; budget: number; change: number }>;
};

export const CATEGORIES: SpendCategory[] = [
    {
        key: 'compute',
        label: 'Compute',
        color: 'indigo-500',
        services: [
            { label: 'Kubernetes Nodes', share: 62.1 },
            { label: 'Virtual Machines', share: 22.3 },
            { label: 'Spot Instances', share: 9.0 },
            { label: 'Serverless', share: 4.7 },
            { label: 'Container Registry', share: 1.9 },
        ],
    },
    {
        key: 'database',
        label: 'Databases',
        color: 'teal-500',
        services: [
            { label: 'Managed Postgres', share: 45.3 },
            { label: 'Data Warehouse', share: 36.7 },
            { label: 'Cache Clusters', share: 9.9 },
            { label: 'Search Clusters', share: 8.0 },
        ],
    },
    {
        key: 'storage',
        label: 'Storage',
        color: 'sky-500',
        services: [
            { label: 'Object Storage', share: 44.4 },
            { label: 'Block Volumes', share: 34.1 },
            { label: 'Backups', share: 12.1 },
            { label: 'File Shares', share: 9.4 },
        ],
    },
    {
        key: 'ai',
        label: 'AI and ML',
        color: 'pink-500',
        services: [
            { label: 'GPU Training', share: 56.6 },
            { label: 'Model Inference', share: 30.2 },
            { label: 'Vector Search', share: 8.9 },
            { label: 'Notebooks', share: 4.3 },
        ],
    },
    {
        key: 'network',
        label: 'Networking',
        color: 'amber-500',
        services: [
            { label: 'Data Transfer', share: 52.5 },
            { label: 'CDN', share: 22.1 },
            { label: 'Load Balancers', share: 15.9 },
            { label: 'NAT Gateways', share: 9.4 },
        ],
    },
    {
        key: 'observability',
        label: 'Observability',
        color: 'violet-500',
        services: [
            { label: 'Logs', share: 52.1 },
            { label: 'Metrics and Traces', share: 25.8 },
            { label: 'APM', share: 16.1 },
            { label: 'Synthetic Checks', share: 5.9 },
        ],
    },
];

export const PERIODS: Record<string, SpendPeriod> = {
    '30d': {
        label: 'Last 30 days',
        since: 'Since Sep 16',
        dates: 'Sep 16 to Oct 15, 2026',
        change: 1.8,
        values: {
            compute: { spent: 206.9, budget: 240, change: 1.7 },
            database: { spent: 84.9, budget: 92, change: 2.0 },
            storage: { spent: 55.4, budget: 78, change: -1.5 },
            ai: { spent: 48.4, budget: 40, change: 5.8 },
            network: { spent: 43.4, budget: 40, change: 1.6 },
            observability: { spent: 23.6, budget: 38, change: 2.6 },
        },
    },
    '90d': {
        label: 'Last 90 days',
        since: 'Since Jul 18',
        dates: 'Jul 18 to Oct 15, 2026',
        change: 4.6,
        values: {
            compute: { spent: 612.9, budget: 720, change: 4.4 },
            database: { spent: 250.6, budget: 276, change: 5.1 },
            storage: { spent: 168.1, budget: 234, change: -0.8 },
            ai: { spent: 136.3, budget: 120, change: 9.6 },
            network: { spent: 128.7, budget: 120, change: 4.2 },
            observability: { spent: 68.7, budget: 114, change: 3.9 },
        },
    },
    '6m': {
        label: 'Last 6 months',
        since: 'Since Apr 16',
        dates: 'Apr 16 to Oct 15, 2026',
        change: 8.3,
        values: {
            compute: { spent: 1208.4, budget: 1440, change: 8.0 },
            database: { spent: 488, budget: 552, change: 9.2 },
            storage: { spent: 342, budget: 468, change: 1.1 },
            ai: { spent: 248.7, budget: 240, change: 15.4 },
            network: { spent: 251.6, budget: 240, change: 9.8 },
            observability: { spent: 131.5, budget: 228, change: 6.7 },
        },
    },
    ytd: {
        label: 'Year to date',
        since: 'Since Jan 1',
        dates: 'Jan 1 to Oct 15, 2026',
        change: 12.3,
        values: {
            compute: { spent: 1976.4, budget: 2400, change: 11.8 },
            database: { spent: 790.2, budget: 920, change: 13.5 },
            storage: { spent: 583.6, budget: 780, change: 3.2 },
            ai: { spent: 368.9, budget: 400, change: 21.7 },
            network: { spent: 408.2, budget: 400, change: 14.9 },
            observability: { spent: 206.6, budget: 380, change: 9.4 },
        },
    },
    '12m': {
        label: 'Last 12 months',
        since: 'Since Oct 16, 2025',
        dates: 'Oct 16, 2025 to Oct 15, 2026',
        change: 14.0,
        values: {
            compute: { spent: 2350.7, budget: 2880, change: 13.2 },
            database: { spent: 933.4, budget: 1104, change: 15.6 },
            storage: { spent: 709.2, budget: 936, change: 4.0 },
            ai: { spent: 418.5, budget: 480, change: 24.8 },
            network: { spent: 483.4, budget: 480, change: 17.1 },
            observability: { spent: 240.9, budget: 456, change: 10.5 },
        },
    },
};
