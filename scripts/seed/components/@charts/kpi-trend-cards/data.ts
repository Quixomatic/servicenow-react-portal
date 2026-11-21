// Sample data for components:charts/kpi-trend-cards: three KPIs with 15 sampled points over the last 28
// days for the sparkline area.

export type TrendCard = {
    key: string;
    title: string;
    /** lucide icon name. */
    icon: string;
    /** Tailwind palette colours, light / dark. */
    light: string;
    dark: string;
    caption: string;
    value: string;
    /** Unit appended in the tooltip ("US$"). */
    unit?: string;
    data: number[];
};

const K = 1000;

function k(values: number[]): number[] {
    return values.map((v) => v * K);
}

export const CARDS: TrendCard[] = [
    {
        key: 'revenue',
        title: 'Revenue',
        icon: 'circle-dollar-sign',
        light: 'emerald-500',
        dark: 'emerald-500',
        caption: 'Last 28 days',
        value: '6.238$',
        unit: 'US$',
        data: k([1.0, 4.5, 2.0, 5.2, 1.5, 6.1, 3.0, 6.8, 2.0, 1.0, 4.0, 2.0, 3.0, 2.0, 6.2]),
    },
    {
        key: 'customers',
        title: 'New Customers',
        icon: 'user-plus',
        light: 'blue-500',
        dark: 'blue-500',
        caption: 'Last 28 days',
        value: '6.202',
        data: k([2.0, 4.5, 2.0, 5.2, 1.5, 5.1, 2.5, 6.8, 1.8, 1.0, 3.0, 2.0, 2.7, 2.0, 4.2]),
    },
    {
        key: 'users',
        title: 'Active Users',
        icon: 'trending-up',
        light: 'violet-500',
        dark: 'violet-500',
        caption: 'Last 28 days',
        value: '18.945',
        data: k([2.0, 3.5, 2.0, 5.2, 1.2, 4.1, 3.5, 5.8, 2.0, 0.8, 3.0, 1.0, 4.0, 2.0, 4.2]),
    },
];
