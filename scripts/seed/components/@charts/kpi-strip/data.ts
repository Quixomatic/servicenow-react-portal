// Sample data for components:charts/kpi-strip: four KPIs, each with a week of daily values (Mon to Sun,
// then "Now") for the corner sparkline.

export type KpiPoint = { day: string; value: number };

export type Kpi = {
    key: string;
    label: string;
    /** Value shown large, and an optional faded suffix ("k"). */
    value: string;
    suffix?: string;
    /** Trend percent (sign sets the badge tone) and its caption. */
    trend: number;
    trendLabel: string;
    /** Series name in the tooltip and how values print there. */
    seriesLabel: string;
    format: 'number' | 'money' | 'moneyK';
    data: KpiPoint[];
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Now'];

function week(values: number[]): KpiPoint[] {
    return values.map((value, i) => ({ day: DAYS[i], value }));
}

export const KPIS: Kpi[] = [
    {
        key: 'orders',
        label: 'Total Orders',
        value: '1,246',
        trend: 23.08,
        trendLabel: 'Annual trend',
        seriesLabel: 'Orders',
        format: 'number',
        data: week([1120, 1120, 1185, 1246, 1188, 1188, 1232, 1197]),
    },
    {
        key: 'spend',
        label: 'Cumulative Spend',
        value: '$89.3',
        suffix: 'k',
        trend: 3.82,
        trendLabel: 'Monthly trend',
        seriesLabel: 'Spend',
        format: 'moneyK',
        data: week([91200, 87500, 83100, 86900, 87400, 91800, 90500, 92300]),
    },
    {
        key: 'aov',
        label: 'Avg. Order Value',
        value: '$68',
        trend: -0.39,
        trendLabel: 'Weekly trend',
        seriesLabel: 'AOV',
        format: 'number',
        data: week([72, 72, 68, 68, 70, 66, 68, 65]),
    },
    {
        key: 'balance',
        label: 'Account Balance',
        value: '$2.3',
        suffix: 'k',
        trend: 1.04,
        trendLabel: 'Daily trend',
        seriesLabel: 'Balance',
        format: 'moneyK',
        data: week([2100, 1900, 1800, 1800, 2000, 2300, 2200, 2300]),
    },
];
