// Sample data for components:charts/inflows-by-source: settled inflows (USD millions) by source per period.

export type InflowSource = { key: string; label: string; light: string; dark: string };
export type InflowPeriod = {
    label: string;
    /** "last 7 days" (description) and "the 7 days before" (comparison note). */
    range: string;
    before: string;
    total: number;
    prior: number;
    /** Per source: value and change vs the period before (%). */
    values: Record<string, { value: number; delta: number }>;
};

export const SOURCES: InflowSource[] = [
    { key: 'lead', label: 'Northline Capital', light: 'violet-700', dark: 'violet-500' },
    { key: 'second', label: 'Copper Market', light: 'violet-500', dark: 'violet-400' },
    { key: 'third', label: 'Bridgewell Fund', light: 'violet-300', dark: 'violet-300' },
];

export const PERIODS: Record<string, InflowPeriod> = {
    week: {
        label: 'Week',
        range: 'last 7 days',
        before: 'the 7 days before',
        total: 12.4,
        prior: 11.6,
        values: {
            lead: { value: 4.6, delta: 12.2 },
            second: { value: 4.1, delta: -6.8 },
            third: { value: 1.9, delta: 18.7 },
        },
    },
    month: {
        label: 'Month',
        range: 'last 30 days',
        before: 'the 30 days before',
        total: 48.2,
        prior: 45.1,
        values: {
            lead: { value: 18.8, delta: 11.2 },
            second: { value: 14.9, delta: -2.0 },
            third: { value: 8.7, delta: 10.1 },
        },
    },
    year: {
        label: 'Year',
        range: 'last 12 months',
        before: 'the 12 months before',
        total: 186.7,
        prior: 158.3,
        values: {
            lead: { value: 69.1, delta: 19.6 },
            second: { value: 61.6, delta: 12.0 },
            third: { value: 29.9, delta: 23.0 },
        },
    },
};
