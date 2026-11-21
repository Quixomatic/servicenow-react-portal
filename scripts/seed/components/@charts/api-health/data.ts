/** Sample data for components:charts/api-health: four gateway SLOs per region and window. */

export type HealthMetric = {
    key: string;
    label: string;
    unit: string;
    /** How the gauge fill is computed: 'budget' = (100 - value) / (100 - target), 'ratio' = value / target. */
    mode: 'budget' | 'ratio';
    target: number;
    /** The line under the delta, e.g. "SLO 300 ms". */
    targetLabel: string;
    /** Footer labels: the extreme row ("Lowest" / "Peak") and the breach row ("Below SLO"). */
    extremeLabel: string;
    breachLabel: string;
    /** Whether a rising value is good (true), bad (false) or neutral (null) for the trend colour. */
    upIsGood: boolean | null;
    decimals: number;
    /** Format values as 4.1K. */
    compact?: boolean;
};

/** [value, delta vs prior (percent; points for availability), latest, extreme time, extreme value, hours in breach]. */
export type MetricReading = [number, number, number, string, number, number];

export type HealthWindow = { key: string; label: string };
export type HealthRegion = { key: string; label: string; readings: Record<string, Record<string, MetricReading>> };

export const METRICS: HealthMetric[] = [
    {
        key: 'availability',
        label: 'Availability',
        unit: '%',
        mode: 'budget',
        target: 99.9,
        targetLabel: 'SLO 99.9% budget',
        extremeLabel: 'Lowest',
        breachLabel: 'Below SLO',
        upIsGood: true,
        decimals: 2,
    },
    {
        key: 'latency',
        label: 'p95 Latency',
        unit: 'ms',
        mode: 'ratio',
        target: 300,
        targetLabel: 'SLO 300 ms',
        extremeLabel: 'Peak',
        breachLabel: 'Over SLO',
        upIsGood: false,
        decimals: 0,
    },
    {
        key: 'errors',
        label: 'Error Rate',
        unit: '%',
        mode: 'ratio',
        target: 1,
        targetLabel: 'SLO 1%',
        extremeLabel: 'Peak',
        breachLabel: 'Over SLO',
        upIsGood: false,
        decimals: 2,
    },
    {
        key: 'throughput',
        label: 'Throughput',
        unit: 'req/s',
        mode: 'ratio',
        target: 8000,
        targetLabel: 'Capacity 8K',
        extremeLabel: 'Peak',
        breachLabel: 'Over Capacity',
        upIsGood: null,
        decimals: 1,
        compact: true,
    },
];

export const WINDOWS: HealthWindow[] = [
    { key: '1h', label: '1H' },
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
];

export const REGIONS: HealthRegion[] = [
    {
        key: 'us-east',
        label: 'US East',
        readings: {
            '1h': {
                availability: [99.9849, 0.01, 99.99, '11:35', 99.98, 0],
                latency: [171, 8, 127, '11:35', 171, 0],
                errors: [0.21, -14, 0.24, '11:45', 0.26, 0],
                throughput: [4500, -3, 4400, '11:40', 4800, 0],
            },
            '24h': {
                availability: [99.97, -0.01, 99.98, '23:00', 99.86, 1],
                latency: [252, 9, 121, '22:00', 286, 0],
                errors: [0.33, -7, 0.27, '23:00', 1.38, 1],
                throughput: [4100, 6, 2600, '22:00', 5500, 0],
            },
            '7d': {
                availability: [99.901, -0.06, 99.97, 'Sun 18:00', 98.96, 18],
                latency: [264, 12, 145, 'Sun 18:00', 331, 6],
                errors: [0.41, 34, 0.36, 'Sun 18:00', 2.46, 12],
                throughput: [3900, 5, 3100, 'Tue 00:00', 5200, 0],
            },
        },
    },
    {
        key: 'eu-west',
        label: 'EU West',
        readings: {
            '1h': {
                availability: [99.995, 0, 99.99, '11:00', 99.99, 0],
                latency: [137, 9, 102, '11:35', 137, 0],
                errors: [0.12, -6, 0.15, '11:05', 0.15, 0],
                throughput: [3000, -2, 2900, '11:30', 3100, 0],
            },
            '24h': {
                availability: [99.988, 0, 99.99, '23:00', 99.94, 0],
                latency: [202, 9, 105, '22:00', 229, 0],
                errors: [0.18, -10, 0.11, '23:00', 0.76, 0],
                throughput: [2600, 5, 1900, '00:00', 3500, 0],
            },
            '7d': {
                availability: [99.961, -0.02, 99.99, 'Sun 18:00', 99.58, 18],
                latency: [211, 12, 95, 'Sun 18:00', 265, 0],
                errors: [0.23, 36, 0.16, 'Sun 18:00', 1.35, 6],
                throughput: [2600, 8, 1700, 'Mon 18:00', 3400, 0],
            },
        },
    },
    {
        key: 'apac',
        label: 'Asia Pacific',
        readings: {
            '1h': {
                availability: [99.981, 0.01, 99.99, '11:00', 99.97, 0],
                latency: [195, 8, 138, '11:35', 195, 0],
                errors: [0.29, -5, 0.25, '11:40', 0.36, 0],
                throughput: [2300, -1, 2400, '11:10', 2400, 0],
            },
            '24h': {
                availability: [99.9549, -0.02, 99.96, '23:00', 99.79, 2],
                latency: [287, 9, 149, '22:00', 326, 1],
                errors: [0.41, -13, 0.23, '23:00', 1.79, 2],
                throughput: [2000, 4, 1300, '23:00', 2800, 0],
            },
            '7d': {
                availability: [99.863, -0.08, 99.96, 'Sun 18:00', 98.49, 18],
                latency: [301, 12, 139, 'Sun 18:00', 377, 12],
                errors: [0.51, 28, 0.47, 'Sun 18:00', 3.2, 18],
                throughput: [2000, 7, 1300, 'Mon 12:00', 2600, 0],
            },
        },
    },
];
