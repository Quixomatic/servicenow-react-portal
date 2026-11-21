// Sample data for components:charts/inventory-health: four catalog metrics per period (Week / Month /
// Year), each with a headline value, a change badge, a caption and a sparkline series.

export type HealthMetricDef = {
    key: string;
    label: string;
    /** lucide icon name. */
    icon: string;
    /** Unit printed after tooltip values. */
    unit: string;
};

export type HealthStat = {
    value: string;
    change: string;
    tone: 'success' | 'destructive' | 'warning';
    note: string;
    trend: number[];
};

export type HealthPeriod = {
    key: string;
    label: string;
    /** Prefix of each sparkline point label: D1, W1, M1… */
    pointPrefix: string;
    footer: string;
    stats: Record<string, HealthStat>;
};

export const METRICS: HealthMetricDef[] = [
    { key: 'inStock', label: 'In Stock', icon: 'package', unit: 'units' },
    { key: 'outOfStock', label: 'Out-of-Stock', icon: 'circle-x', unit: 'SKUs' },
    { key: 'pending', label: 'Pending Restock', icon: 'truck', unit: 'orders' },
    { key: 'slow', label: 'Slow Movers', icon: 'clock', unit: 'SKUs' },
];

export const PERIODS: HealthPeriod[] = [
    {
        key: 'week',
        label: 'Week',
        pointPrefix: 'D',
        footer: '12,845 products tracked across categories. 76% currently available in stock.',
        stats: {
            inStock: {
                value: '8,420',
                change: '+3.4%',
                tone: 'success',
                note: 'Rising',
                trend: [43, 51, 47, 55, 52, 59, 49, 64, 58, 57, 72, 50, 76, 79, 57, 69],
            },
            outOfStock: {
                value: '1,245',
                change: '-1.2%',
                tone: 'destructive',
                note: 'Gaps easing',
                trend: [72, 49, 63, 42, 45, 67, 50, 47, 69, 65, 44, 55, 38, 49, 58, 42],
            },
            pending: {
                value: '640',
                change: '+2.1%',
                tone: 'success',
                note: 'Moving',
                trend: [28, 25, 31, 27, 36, 32, 43, 37, 48, 45, 58, 55, 61, 75, 73, 52],
            },
            slow: {
                value: '1,105',
                change: '0.0%',
                tone: 'warning',
                note: 'Stable',
                trend: [46, 54, 38, 63, 47, 59, 43, 57, 49, 62, 45, 64, 48, 67, 52, 60],
            },
        },
    },
    {
        key: 'month',
        label: 'Month',
        pointPrefix: 'W',
        footer: '42,420 reviewed this month; 78% stayed available through demand spikes.',
        stats: {
            inStock: {
                value: '32.8k',
                change: '+6.8%',
                tone: 'success',
                note: 'Ahead',
                trend: [38, 46, 42, 54, 48, 61, 52, 67, 59, 74, 63, 71, 66, 80],
            },
            outOfStock: {
                value: '4,980',
                change: '-3.7%',
                tone: 'destructive',
                note: 'Easing',
                trend: [70, 62, 67, 54, 59, 49, 55, 43, 50, 39, 45, 34, 41, 31],
            },
            pending: {
                value: '2,310',
                change: '+4.5%',
                tone: 'success',
                note: 'Faster',
                trend: [30, 39, 35, 48, 42, 53, 47, 61, 55, 68, 59, 70, 64, 76],
            },
            slow: {
                value: '4,420',
                change: '-0.8%',
                tone: 'warning',
                note: 'Steady',
                trend: [48, 43, 50, 41, 47, 39, 45, 38, 43, 36, 41, 35, 39, 33],
            },
        },
    },
    {
        key: 'year',
        label: 'Year',
        pointPrefix: 'M',
        footer: '478,000 SKU snapshots reconciled this year; availability closed 12 points higher.',
        stats: {
            inStock: {
                value: '392k',
                change: '+11.9%',
                tone: 'success',
                note: 'Ahead',
                trend: [32, 45, 38, 56, 47, 63, 54, 72, 61, 78, 69, 86],
            },
            outOfStock: {
                value: '58.4k',
                change: '-8.4%',
                tone: 'destructive',
                note: 'Improving',
                trend: [74, 64, 70, 57, 63, 50, 56, 43, 49, 38, 44, 33],
            },
            pending: {
                value: '27.6k',
                change: '+7.2%',
                tone: 'success',
                note: 'Faster',
                trend: [34, 43, 39, 51, 45, 59, 52, 66, 58, 73, 64, 79],
            },
            slow: {
                value: '51.9k',
                change: '+1.5%',
                tone: 'warning',
                note: 'Watch',
                trend: [43, 49, 41, 52, 44, 55, 46, 53, 48, 58, 50, 56],
            },
        },
    },
];
