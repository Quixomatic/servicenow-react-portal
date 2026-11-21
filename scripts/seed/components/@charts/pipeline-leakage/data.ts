/** Sample data for components:charts/pipeline-leakage: deals per lead source through six pipeline stages. */

export type LeakStage = { key: string; label: string; short: string };
export type LeakSource = { key: string; label: string; light: string; dark: string; dot: string };
export type LeakPeriod = {
    key: string;
    label: string;
    long: string;
    /** Deals per source per stage. */
    deals: Record<string, number[]>;
    /** The prior period's leads and won deals per source (for the KPI deltas). */
    prior: Record<string, { leads: number; won: number }>;
};

export const STAGES: LeakStage[] = [
    { key: 'leads', label: 'New Leads', short: 'Leads' },
    { key: 'mql', label: 'Marketing Qualified', short: 'MQL' },
    { key: 'sql', label: 'Sales Qualified', short: 'SQL' },
    { key: 'demo', label: 'Demo Held', short: 'Demo' },
    { key: 'proposal', label: 'Proposal Sent', short: 'Proposal' },
    { key: 'won', label: 'Closed Won', short: 'Won' },
];

/** Bottom to top in the ribbon. `dot` is the literal swatch class. */
export const SOURCES: LeakSource[] = [
    { key: 'partner', label: 'Partner', light: 'emerald-700', dark: 'emerald-700', dot: 'bg-emerald-700' },
    { key: 'outbound', label: 'Outbound', light: 'emerald-500', dark: 'emerald-500', dot: 'bg-emerald-500' },
    { key: 'inbound', label: 'Inbound', light: 'emerald-300', dark: 'emerald-300', dot: 'bg-emerald-300' },
];

export const PERIODS: LeakPeriod[] = [
    {
        key: '30d',
        label: '30D',
        long: 'last 30 days',
        deals: {
            partner: [190, 139, 99, 69, 32, 17],
            outbound: [498, 154, 86, 56, 34, 14],
            inbound: [560, 342, 195, 135, 85, 31],
        },
        prior: {
            partner: { leads: 182, won: 15 },
            outbound: { leads: 470, won: 12 },
            inbound: { leads: 530, won: 27 },
        },
    },
    {
        key: '90d',
        label: '90D',
        long: 'last 90 days',
        deals: {
            partner: [560, 414, 290, 209, 96, 50],
            outbound: [1420, 426, 234, 154, 95, 39],
            inbound: [1640, 984, 571, 388, 248, 87],
        },
        prior: {
            partner: { leads: 540, won: 41 },
            outbound: { leads: 1511, won: 36 },
            inbound: { leads: 1509, won: 74 },
        },
    },
    {
        key: '12m',
        label: '12M',
        long: 'last 12 months',
        deals: {
            partner: [2110, 1519, 1048, 744, 335, 171],
            outbound: [5920, 1717, 910, 582, 349, 136],
            inbound: [6480, 3758, 2142, 1435, 890, 294],
        },
        prior: {
            partner: { leads: 1890, won: 168 },
            outbound: { leads: 5410, won: 133 },
            inbound: { leads: 5770, won: 289 },
        },
    },
];
