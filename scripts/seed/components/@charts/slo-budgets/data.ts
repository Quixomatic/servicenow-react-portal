// Sample data for components:charts/slo-budgets: SLOs with their rolling error budget left and 28 days of
// daily budget history, plus the services and indicators offered by the New SLO dialog.

export type SloService = {
    id: string;
    icon: string;
    /** Requests per day, for the budget estimate. */ perDay: number;
};

export type SloIndicator = { id: string; label: string; icon: string };

export type SloRow = {
    id: string;
    name: string;
    service: string;
    /** Objective as a fraction (0.999 = 99.9%). */
    objective: number;
    /** Rolling window in days. */
    window: number;
    /** Error budget left now (1 = untouched, below 0 = over budget). */
    left: number;
    /** Daily budget left, oldest first, ending today. */
    history: number[];
    /** Budget-burning events counted in the window. */
    events: number;
};

export type SloBudgetsData = {
    slos: SloRow[];
    services: SloService[];
    indicators: SloIndicator[];
    /** Date label of the last history point; earlier points count back one day each. */
    today: { month: string; day: number };
};

export const SERVICES: SloService[] = [
    { id: 'payments-api', icon: 'banknote', perDay: 4200000 },
    { id: 'ledger-worker', icon: 'database', perDay: 1800000 },
    { id: 'notifications', icon: 'bell', perDay: 2600000 },
    { id: 'search-indexer', icon: 'search', perDay: 950000 },
    { id: 'payouts-scheduler', icon: 'wallet', perDay: 120000 },
];

export const INDICATORS: SloIndicator[] = [
    { id: 'availability', label: 'Availability', icon: 'activity' },
    { id: 'latency', label: 'Latency', icon: 'timer' },
    { id: 'freshness', label: 'Freshness', icon: 'clock' },
    { id: 'correctness', label: 'Correctness', icon: 'circle-check' },
];

export const SAMPLE: SloBudgetsData = {
    today: { month: 'Sep', day: 29 },
    services: SERVICES,
    indicators: INDICATORS,
    slos: [
        {
            id: 'ledger-write',
            name: 'Ledger write success',
            service: 'ledger-worker',
            objective: 0.9999,
            window: 30,
            left: -0.423,
            events: 2,
            history: [
                0.686, 0.683, 0.69, 0.685, 0.688, 0.694, 0.699, 0.704, 0.702, 0.701, 0.701, 0.703, 0.702, 0.701, 0.701,
                0.704, 0.698, 0.699, 0.698, -0.047, -0.033, -0.045, -0.042, -0.041, -0.418, -0.427, -0.417, -0.425,
            ],
        },
        {
            id: 'sms-availability',
            name: 'SMS provider availability',
            service: 'notifications',
            objective: 0.995,
            window: 28,
            left: -0.196,
            events: 1,
            history: [
                0.757, 0.756, 0.756, 0.759, 0.761, 0.759, 0.76, 0.757, 0.761, 0.756, 0.752, 0.754, 0.754, 0.752, 0.752,
                0.753, 0.753, 0.756, 0.75, 0.757, 0.759, -0.179, -0.177, -0.182, -0.183, -0.185, -0.189, -0.203,
            ],
        },
        {
            id: 'index-freshness',
            name: 'Index freshness',
            service: 'search-indexer',
            objective: 0.99,
            window: 7,
            left: 0.147,
            events: 1,
            history: [
                0.659, 0.659, 0.619, 0.588, 0.568, 0.588, 0.609, 0.568, 0.568, 0.599, 0.639, 0.649, 0.609, 0.579, 0.609,
                0.579, 0.559, 0.539, 0.519, 0.539, 0.568, 0.539, 0.548, 0.559, 0.539, 0.157, 0.167, 0.147,
            ],
        },
        {
            id: 'payout-on-time',
            name: 'Payout batch on time',
            service: 'payouts-scheduler',
            objective: 0.995,
            window: 30,
            left: 0.151,
            events: 2,
            history: [
                0.518, 0.527, 0.522, 0.522, 0.522, 0.532, 0.527, 0.522, 0.302, 0.307, 0.307, 0.312, 0.312, 0.307, 0.312,
                0.317, 0.317, 0.317, 0.312, 0.317, 0.331, 0.326, 0.321, 0.317, 0.317, 0.317, 0.149, 0.151,
            ],
        },
        {
            id: 'charge-availability',
            name: 'Charge API availability',
            service: 'payments-api',
            objective: 0.9995,
            window: 28,
            left: 0.4849,
            events: 1,
            history: [
                0.8, 0.8, 0.799, 0.798, 0.799, 0.799, 0.798, 0.799, 0.799, 0.796, 0.795, 0.797, 0.798, 0.794, 0.796,
                0.796, 0.791, 0.79, 0.792, 0.792, 0.79, 0.789, 0.483, 0.483, 0.486, 0.481, 0.485, 0.479,
            ],
        },
        {
            id: 'push-latency',
            name: 'Push delivery latency',
            service: 'notifications',
            objective: 0.99,
            window: 7,
            left: 0.703,
            events: 0,
            history: [
                0.71, 0.717, 0.694, 0.699, 0.718, 0.722, 0.732, 0.732, 0.75, 0.755, 0.746, 0.746, 0.733, 0.717, 0.71,
                0.697, 0.701, 0.692, 0.684, 0.674, 0.68, 0.668, 0.678, 0.67, 0.69, 0.69, 0.703, 0.703,
            ],
        },
        {
            id: 'refund-availability',
            name: 'Refund API availability',
            service: 'payments-api',
            objective: 0.999,
            window: 28,
            left: 0.883,
            events: 0,
            history: [
                0.876, 0.875, 0.876, 0.876, 0.877, 0.879, 0.879, 0.88, 0.88, 0.881, 0.881, 0.88, 0.881, 0.881, 0.884,
                0.881, 0.881, 0.881, 0.883, 0.885, 0.884, 0.884, 0.886, 0.886, 0.886, 0.884, 0.881, 0.883,
            ],
        },
    ],
};
