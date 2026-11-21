// Sample data for components:charts/distance-tracker: total distance per period and an activity level
// series (0 to 118, the plot's height) drawn as the sparkline.

export type DistancePeriod = {
    key: string;
    label: string;
    total: number;
    series: number[];
};

export const MAX_LEVEL = 118;

export const PERIODS: DistancePeriod[] = [
    {
        key: 'week',
        label: 'Week',
        total: 1562,
        series: [
            42, 42, 32, 45, 51, 52, 42, 47, 58, 58, 48, 48, 44, 43, 38, 38, 46, 36, 36, 48, 48, 44, 44, 58, 46, 46, 68,
            58, 60, 69, 81, 81, 92, 71, 71, 60, 68, 68, 79, 70, 47, 58, 58, 92, 70, 70, 59,
        ],
    },
    {
        key: 'month',
        label: 'Month',
        total: 6248,
        series: [
            40, 42, 37, 44, 48, 45, 53, 49, 60, 57, 63, 60, 67, 64, 71, 66, 74, 70, 79, 75, 83, 78, 86, 81, 88, 84, 91,
            86, 93, 87, 95, 90, 98, 92, 100, 95, 102, 96, 104, 99, 106, 100, 108, 101, 106, 98,
        ],
    },
    {
        key: 'year',
        label: 'Year',
        total: 74891,
        series: [
            35, 38, 42, 39, 48, 45, 55, 50, 60, 57, 66, 63, 71, 68, 77, 71, 79, 73, 83, 77, 86, 79, 89, 83, 93, 86, 95,
            88, 98, 90, 100, 92, 102, 94, 104, 97, 106, 98, 108, 100, 110, 102, 111, 104, 112, 105, 109,
        ],
    },
];
