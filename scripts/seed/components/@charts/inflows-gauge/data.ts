/** Sample data for components:charts/inflows-gauge: daily (weekly / monthly) inflows by source per period. */

export type InflowSourceDef = {
    key: string;
    label: string;
    icon: string;
    /** Literal Tailwind classes: spoke / ring colour and legend stroke. */
    text: string;
    stroke: string;
};

/** One spoke: [prior-period value, then one value per source]; just [prior] for spokes still to come. Relative units. */
export type Spoke = number[];

export type GaugePeriod = {
    key: string;
    label: string;
    /** The second line in the period menu. */
    detail: string;
    scopeLabel: string;
    /** Ring labels: [spoke index, text]. */
    marks: [number, string][];
    spokes: Spoke[];
    target: number;
    /** Per source: total (settled + in transit), in transit, change vs the prior period in percent, note when nothing is in transit. */
    sources: { total: number; transit: number; delta: number; note?: string }[];
    totalDelta: number;
    priorLabel: string;
    vsLabel: string;
    closed?: boolean;
    pace?: number;
    forecast: number;
    perDay?: number;
    soFar?: number;
    footnote: string;
    /** ISO date of the first spoke and the days between spokes, for the hover readout. */
    start: string;
    step: number;
};

export const SOURCES: InflowSourceDef[] = [
    {
        key: 'card',
        label: 'Card payments',
        icon: 'credit-card',
        text: 'text-teal-600 dark:text-teal-500',
        stroke: 'stroke-teal-600 dark:stroke-teal-500',
    },
    {
        key: 'transfer',
        label: 'Bank transfers',
        icon: 'banknote',
        text: 'text-indigo-500 dark:text-indigo-400',
        stroke: 'stroke-indigo-500 dark:stroke-indigo-400',
    },
    {
        key: 'payout',
        label: 'Marketplace payouts',
        icon: 'store',
        text: 'text-amber-500 dark:text-amber-400',
        stroke: 'stroke-amber-500 dark:stroke-amber-400',
    },
    {
        key: 'yield',
        label: 'Treasury yield',
        icon: 'trending-up',
        text: 'text-rose-500 dark:text-rose-400',
        stroke: 'stroke-rose-500 dark:stroke-rose-400',
    },
];

const MONTH_MARKS: [number, string][] = [
    [0, '1'],
    [7, '8'],
    [14, '15'],
    [21, '22'],
    [28, '29'],
];

export const PERIODS: GaugePeriod[] = [
    {
        key: 'month',
        label: 'This month',
        detail: '16 of 31 days',
        scopeLabel: 'this month',
        marks: MONTH_MARKS,
        spokes: [
            [0.8636, 0.2891, 0.1362, 0, 0.2124],
            [0.5057, 0.2375, 0.2613, 0.4271, 0],
            [0.4285, 0.1736, 0, 0, 0],
            [0.8337, 0.1548, 0, 0, 0],
            [0.1858, 0.2524, 0.0974, 0, 0],
            [0.1383, 0.1951, 0.1472, 0.3198, 0],
            [0.397, 0.214, 0.1804, 0, 0],
            [0.819, 0.2743, 0.1059, 0, 0],
            [0.4784, 0.2347, 0.24, 0.4319, 0],
            [0.392, 0.2019, 0, 0, 0],
            [0.6406, 0.1765, 0, 0, 0],
            [0.1486, 0.2541, 0.2199, 0, 0],
            [0.183, 0.2767, 0.0985, 0.3288, 0],
            [0.3981, 0.2633, 0.241, 0, 0],
            [0.9065, 0.2572, 0.1683, 0, 0],
            [0.5069, 0.1454, 0.0623, 0.259, 0],
            [0.5956],
            [0.7825],
            [0.1436],
            [0.1646],
            [0.5167],
            [0.7862],
            [0.3258],
            [0.4855],
            [0.7412],
            [0.1511],
            [0.1785],
            [1],
            [1],
            [0.549],
            [0.6377],
        ],
        target: 40e6,
        sources: [
            { total: 9.4e6, transit: 379.1e3, delta: -1.4 },
            { total: 5.1e6, transit: 601.4e3, delta: -5.6 },
            { total: 4.6e6, transit: 675.3e3, delta: 5.1 },
            { total: 553.7e3, transit: 0, delta: -3.2, note: '1st business day' },
        ],
        totalDelta: -1.1,
        priorLabel: 'Last month',
        vsLabel: 'last month',
        pace: 20.1336e6,
        forecast: 39e6,
        perDay: 1.32e6,
        soFar: 1.26e6,
        footnote: '16 of 31 days',
        start: '2026-10-01',
        step: 1,
    },
    {
        key: 'last-month',
        label: 'Last month',
        detail: 'Closed',
        scopeLabel: 'last month',
        marks: MONTH_MARKS,
        spokes: [
            [0.1012, 0.1212, 0.0501, 0.1445, 0.1075],
            [0.0912, 0.1317, 0.1162, 0, 0],
            [0.3623, 0.1368, 0.0733, 0, 0],
            [0.3135, 0.125, 0.1143, 0.1694, 0],
            [0.1636, 0.0911, 0, 0, 0],
            [0.1843, 0.0678, 0, 0, 0],
            [0.4763, 0.1147, 0.0798, 0, 0],
            [0.0753, 0.1416, 0.0878, 0.1721, 0],
            [0.0898, 0.1045, 0.13, 0, 0],
            [0.2185, 0.122, 0.0702, 0, 0],
            [0.4528, 0.1227, 0.0712, 0.1201, 0],
            [0.1963, 0.0728, 0, 0, 0],
            [0.1812, 0.0897, 0, 0, 0],
            [0.4086, 0.1415, 0.0537, 0, 0],
            [0.0889, 0.1238, 0.1028, 0.2177, 0],
            [0.0763, 0.1372, 0.1113, 0, 0],
            [0.1824, 0.1234, 0.1685, 0, 0],
            [0.6342, 0.14, 0.0849, 0.1587, 0],
            [0.2241, 0.0704, 0, 0, 0],
            [0.2037, 0.0807, 0, 0, 0],
            [0.3852, 0.1398, 0.1135, 0, 0],
            [0.078, 0.1175, 0.0961, 0.1717, 0],
            [0.0728, 0.0942, 0.0655, 0, 0],
            [0.2274, 0.1345, 0.1035, 0, 0],
            [0.435, 0.1072, 0.076, 0.1801, 0],
            [0.1524, 0.0741, 0, 0, 0],
            [0.4242, 0.0875, 0, 0, 0],
            [0.5643, 0.1132, 0.4064, 0, 0],
            [0.0876, 0.1434, 0.6138, 0.1687, 0],
            [0.0758, 0.1366, 0.1325, 0, 0],
        ],
        target: 38e6,
        sources: [
            { total: 18.1e6, transit: 0, delta: 7.7, note: 'Settles next day' },
            { total: 15.5e6, transit: 0, delta: 17.0, note: 'Settles in 2 days' },
            { total: 8.0e6, transit: 0, delta: 3.1, note: 'Tue and Fri, 3 days' },
            { total: 571.9e3, transit: 0, delta: -2.1, note: '1st business day' },
        ],
        totalDelta: 9.8,
        priorLabel: 'August',
        vsLabel: 'August',
        closed: true,
        forecast: 42.2e6,
        footnote: 'Closed period',
        start: '2026-09-01',
        step: 1,
    },
    {
        key: 'quarter',
        label: 'This quarter',
        detail: '16 of 92 days',
        scopeLabel: 'this quarter',
        marks: [
            [0, 'Oct'],
            [4, 'Nov'],
            [9, 'Dec'],
        ],
        spokes: [
            [0.8651, 0.4195, 0.2275, 0.2066, 0.0587],
            [0.9573, 0.4651, 0.2504, 0.2104, 0],
            [0.8621, 0.1114, 0.0638, 0.0716, 0],
            [0.9011],
            [1],
            [0.937],
            [0.9976],
            [0.9177],
            [1],
            [0.915],
            [0.8705],
            [0.9671],
            [1],
            [0.1518],
        ],
        target: 122e6,
        sources: [
            { total: 9.4e6, transit: 379.1e3, delta: 12.4 },
            { total: 5.1e6, transit: 601.4e3, delta: -20.6 },
            { total: 4.6e6, transit: 675.3e3, delta: 32.8 },
            { total: 553.7e3, transit: 0, delta: -4.3, note: '1st business day' },
        ],
        totalDelta: 4.3,
        priorLabel: 'Last quarter',
        vsLabel: 'last quarter',
        pace: 20.7e6,
        forecast: 115.9e6,
        perDay: 1.34e6,
        soFar: 1.26e6,
        footnote: '16 of 92 days',
        start: '2026-10-01',
        step: 7,
    },
    {
        key: 'ytd',
        label: 'Year to date',
        detail: '289 of 365 days',
        scopeLabel: 'year to date',
        marks: [
            [0, 'J'],
            [1, 'F'],
            [2, 'M'],
            [3, 'A'],
            [4, 'M'],
            [5, 'J'],
            [6, 'J'],
            [7, 'A'],
            [8, 'S'],
            [9, 'O'],
            [10, 'N'],
            [11, 'D'],
        ],
        spokes: [
            [0.6268, 0.3571, 0.2596, 0.1531, 0.0119],
            [0.5969, 0.313, 0.2115, 0.1316, 0.0112],
            [0.6091, 0.3694, 0.2184, 0.1548, 0.0114],
            [0.6536, 0.3469, 0.2768, 0.1354, 0.012],
            [0.684, 0.3777, 0.2569, 0.1376, 0.0118],
            [0.6506, 0.3556, 0.3618, 0.1647, 0.0114],
            [0.7393, 0.3859, 0.2959, 0.1675, 0.0127],
            [0.6928, 0.3844, 0.3228, 0.1701, 0.0128],
            [0.7274, 0.3973, 0.3407, 0.1753, 0.0125],
            [0.6977, 0.2059, 0.112, 0.101, 0.0121],
            [0.6861],
            [0.7791],
        ],
        target: 470e6,
        sources: [
            { total: 159.3e6, transit: 379.1e3, delta: 23.8 },
            { total: 121.1e6, transit: 601.4e3, delta: 19.3 },
            { total: 68e6, transit: 675.3e3, delta: 28.9 },
            { total: 5.5e6, transit: 0, delta: 5.9, note: '1st business day' },
        ],
        totalDelta: 22.8,
        priorLabel: 'Last year',
        vsLabel: 'last year',
        pace: 371.6e6,
        forecast: 447.6e6,
        perDay: 1.52e6,
        soFar: 1.23e6,
        footnote: '289 of 365 days',
        start: '2026-01-01',
        step: 30.4,
    },
];
