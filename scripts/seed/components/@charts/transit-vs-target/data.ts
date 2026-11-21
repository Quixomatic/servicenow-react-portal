/**
 * Sample data for components:charts/transit-vs-target: door-to-door transit days per region and freight
 * mode for Q3 2026, as the median and the 90th percentile, against a target per mode and statistic.
 * `prior` holds the prior quarter's gap to target (days, + = behind).
 */

export type ModeKey = 'road' | 'rail';
export type Stat = 'median' | 'p90';
export type TransitRegion = {
    region: string;
    /** Short label shown when the card is narrow (AFR, LATAM…). */
    short?: string;
    shipments: number;
    onTime: number;
    median: Record<ModeKey, number>;
    p90: Record<ModeKey, number>;
    prior: Record<Stat, Record<ModeKey, number>>;
};

export const PERIOD = 'Q3 2026';

export const MODES: { key: ModeKey; label: string }[] = [
    { key: 'road', label: 'Road Freight' },
    { key: 'rail', label: 'Rail Freight' },
];

/** Target days per statistic and mode. */
export const TARGETS: Record<Stat, Record<ModeKey, number>> = {
    median: { road: 4.5, rail: 7.0 },
    p90: { road: 7.0, rail: 11.0 },
};

/** Change in transit days against the prior quarter (negative = faster). */
export const CHANGE: Record<Stat, { value: number; label: string }> = {
    median: { value: -3.5, label: 'vs Q2' },
    p90: { value: -2.5, label: 'vs Q2' },
};

export const REGIONS: TransitRegion[] = [
    {
        region: 'Africa',
        short: 'AFR',
        shipments: 1590,
        onTime: 77,
        median: { road: 6.9, rail: 10.4 },
        p90: { road: 10.6, rail: 15.2 },
        prior: { median: { road: 2.8, rail: 3.9 }, p90: { road: 4.2, rail: 4.9 } },
    },
    {
        region: 'Latin America',
        short: 'LATAM',
        shipments: 3000,
        onTime: 82,
        median: { road: 5.8, rail: 8.9 },
        p90: { road: 8.9, rail: 12.8 },
        prior: { median: { road: 1.8, rail: 2.6 }, p90: { road: 2.8, rail: 3.1 } },
    },
    {
        region: 'Asia Pacific',
        short: 'APAC',
        shipments: 9790,
        onTime: 84,
        median: { road: 4.4, rail: 7.4 },
        p90: { road: 8.3, rail: 13.3 },
        prior: { median: { road: -0.3, rail: 0 }, p90: { road: 0.6, rail: 1.4 } },
    },
    {
        region: 'Middle East',
        short: 'ME',
        shipments: 2370,
        onTime: 89,
        median: { road: 4.1, rail: 6.7 },
        p90: { road: 6.2, rail: 11.3 },
        prior: { median: { road: 0, rail: 0.2 }, p90: { road: -0.1, rail: 0.8 } },
    },
    {
        region: 'North America',
        short: 'NAM',
        shipments: 7080,
        onTime: 92,
        median: { road: 3.4, rail: 5.6 },
        p90: { road: 5.6, rail: 8.4 },
        prior: { median: { road: -0.8, rail: -0.9 }, p90: { road: -0.9, rail: -1.8 } },
    },
    {
        region: 'Europe',
        short: 'EUR',
        shipments: 8900,
        onTime: 95,
        median: { road: 2.9, rail: 4.8 },
        p90: { road: 4.4, rail: 7.1 },
        prior: { median: { road: -1.4, rail: -1.8 }, p90: { road: -2.2, rail: -3.2 } },
    },
];
