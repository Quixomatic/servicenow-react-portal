/** Sample data for components:charts/error-budgets: four SLOs per service, attainment per rolling window. */

export type Objective = { key: string; label: string; short: string; light: string; dark: string };

export type ServiceSlos = {
    key: string;
    label: string;
    /** Target per objective, percent. */
    targets: Record<string, number>;
    /** Burn rate over the last 24 hours per objective (1 = spending the budget exactly on pace). */
    burn: Record<string, number>;
    /** Attained percent per window per objective. */
    attained: Record<string, Record<string, number>>;
};

export type BudgetWindow = { key: string; label: string; long: string };

export const OBJECTIVES: Objective[] = [
    { key: 'availability', label: 'Availability', short: 'Avail.', light: 'indigo-500', dark: 'indigo-500' },
    { key: 'latency', label: 'Latency', short: 'Latency', light: 'sky-500', dark: 'sky-500' },
    { key: 'errors', label: 'Error rate', short: 'Errors', light: 'teal-500', dark: 'teal-500' },
    { key: 'freshness', label: 'Freshness', short: 'Fresh', light: 'orange-500', dark: 'orange-500' },
];

export const WINDOWS: BudgetWindow[] = [
    { key: '7d', label: '7D', long: 'rolling 7 days' },
    { key: '28d', label: '28D', long: 'rolling 28 days' },
    { key: '90d', label: '90D', long: 'rolling 90 days' },
];

export const SERVICES: ServiceSlos[] = [
    {
        key: 'checkout',
        label: 'Checkout API',
        targets: { availability: 99.9, latency: 99, errors: 99.5, freshness: 99 },
        burn: { availability: 0.3, latency: 1.4, errors: 1.6, freshness: 0.1 },
        attained: {
            '7d': { availability: 99.97, latency: 99.12, errors: 99.71, freshness: 99.86 },
            '28d': { availability: 99.94, latency: 99.31, errors: 99.62, freshness: 99.82 },
            '90d': { availability: 99.93, latency: 99.44, errors: 99.58, freshness: 99.79 },
        },
    },
    {
        key: 'payments',
        label: 'Payments',
        targets: { availability: 99.95, latency: 99.5, errors: 99.9, freshness: 99.5 },
        burn: { availability: 0.2, latency: 0.6, errors: 0.4, freshness: 1.2 },
        attained: {
            '7d': { availability: 99.99, latency: 99.81, errors: 99.95, freshness: 99.71 },
            '28d': { availability: 99.97, latency: 99.74, errors: 99.93, freshness: 99.66 },
            '90d': { availability: 99.96, latency: 99.69, errors: 99.91, freshness: 99.62 },
        },
    },
    {
        key: 'search',
        label: 'Search',
        targets: { availability: 99.5, latency: 95, errors: 99, freshness: 98 },
        burn: { availability: 1.6, latency: 0.9, errors: 0.9, freshness: 0.9 },
        attained: {
            '7d': { availability: 99.41, latency: 96.2, errors: 99.35, freshness: 98.9 },
            '28d': { availability: 99.58, latency: 96.8, errors: 99.44, freshness: 99.1 },
            '90d': { availability: 99.71, latency: 97.1, errors: 99.52, freshness: 99.3 },
        },
    },
];
