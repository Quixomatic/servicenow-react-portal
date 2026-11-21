// Sample data for components:charts/order-metrics: five order metrics, each with a daily trend series for
// its sparkline. Trend values are on a 0 to 36 index scale (the sparkline's fixed domain).

export type OrderMetric = {
    key: string;
    label: string;
    value: string;
    /** Faded unit suffix after the value ("k"). */
    suffix?: string;
    /** Change in percent; the sign sets the badge and line colour. */
    change: number;
    trend: number[];
};

export const TREND_DOMAIN: [number, number] = [0, 36];

export const METRICS: OrderMetric[] = [
    {
        key: 'orders',
        label: 'Cumulative Orders',
        value: '1,246',
        change: 23.08,
        trend: [
            5.84, 3.89, 8.76, 4.87, 11.68, 9.73, 15.57, 12.65, 19.46, 17.51, 25.3, 23.35, 31.13, 28.22, 32.11, 21.41,
            19.46, 24.32, 8.76, 8.76, 8.76, 9.73, 17.51, 17.51, 6.81, 13.62, 3.89, 4.87, 25.3, 16.54, 14.59, 8.76,
        ],
    },
    {
        key: 'spend',
        label: 'Cumulative Spend',
        value: '$89.3',
        suffix: 'k',
        change: 3.82,
        trend: [
            4.5, 4.5, 4.5, 4.5, 4.5, 15.75, 15.75, 15.75, 15.75, 15.75, 15.75, 15.75, 9, 23.63, 13.5, 13.5, 6.75, 27,
            27, 27, 27, 27, 23.63, 23.63, 31.5, 21.38, 22.5, 22.5, 12.38, 21.38, 21.38,
        ],
    },
    {
        key: 'aov',
        label: 'Avg. Order Value',
        value: '$68.1',
        change: -0.39,
        trend: [
            27.36, 7.2, 14.4, 14.4, 14.4, 14.4, 14.4, 14.4, 14.4, 24.48, 15.84, 18.72, 30.24, 23.04, 5.76, 5.76, 5.76,
            5.76, 5.76, 11.52, 18.72, 18.72, 18.72, 25.92, 7.2, 17.28, 17.28, 24.48, 24.48, 14.4,
        ],
    },
    {
        key: 'balance',
        label: 'Account Balance',
        value: '$2,3',
        suffix: 'k',
        change: 1.04,
        trend: [
            5.73, 3.27, 6.55, 4.91, 8.18, 9.82, 16.36, 12.27, 12.27, 15.55, 13.09, 20.45, 12.27, 22.09, 5.73, 23.73,
            6.55, 30.27, 30.27, 30.27, 30.27, 30.27, 30.27, 25.36, 29.45, 29.45, 24.55, 24.55, 24.55, 32.73,
        ],
    },
    {
        key: 'income',
        label: 'Avg. Monthly Income',
        value: '$271.9',
        suffix: 'k',
        change: -0.39,
        trend: [
            22.07, 31.36, 31.36, 31.36, 31.36, 17.42, 17.42, 17.42, 17.42, 10.45, 12.77, 8.13, 13.93, 6.97, 17.42,
            17.42, 17.42, 17.42, 17.42, 13.93, 6.97, 6.97, 24.39, 4.65, 9.29, 13.93, 10.45,
        ],
    },
];
