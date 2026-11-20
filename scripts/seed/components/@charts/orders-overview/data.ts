// Sample data for components:charts/orders-overview: revenue and orders per bucket, with the prior period.

export type OrdersBucket = {
    label: string;
    revenue: number;
    orders: number;
    priorRevenue: number;
    priorOrders: number;
};

export type OrdersRange = {
    label: string;
    icon: string;
    description: string;
    /** Tooltip label of the comparison row ('Sep 29', 'Prior week' …). */
    priorLabel: string;
    /** Footer: '<metric> per <bucket>'. */
    bucket: string;
    /** Label every n-th x tick (counting from the first). */
    tickEvery?: number;
    data: OrdersBucket[];
};

function rows(
    labels: string[],
    revenue: number[],
    orders: number[],
    priorRevenue: number[],
    priorOrders: number[]
): OrdersBucket[] {
    return labels.map((label, i) => ({
        label,
        revenue: revenue[i],
        orders: orders[i],
        priorRevenue: priorRevenue[i],
        priorOrders: priorOrders[i],
    }));
}

const SEP = Array.from({ length: 30 }, (_v, i) => `Sep ${i + 1}`);

export const RANGES: Record<string, OrdersRange> = {
    day: {
        label: 'Day',
        icon: 'clock',
        description: 'Sep 30, compared with Sep 29',
        priorLabel: 'Sep 29',
        bucket: '2 hours',
        data: rows(
            [
                '00:00',
                '02:00',
                '04:00',
                '06:00',
                '08:00',
                '10:00',
                '12:00',
                '14:00',
                '16:00',
                '18:00',
                '20:00',
                '22:00',
            ],
            [2450, 1850, 1500, 2150, 3050, 2700, 3500, 4120, 3600, 3800, 2950, 2100],
            [39, 30, 24, 35, 49, 44, 56, 66, 58, 61, 47, 34],
            [2250, 1800, 1450, 1900, 2700, 2800, 3200, 3700, 3500, 3350, 2700, 2000],
            [37, 29, 24, 31, 44, 45, 52, 60, 57, 54, 44, 33]
        ),
    },
    week: {
        label: 'Week',
        icon: 'calendar-days',
        description: 'Sep 24 to 30, compared with prior week',
        priorLabel: 'Prior week',
        bucket: 'day',
        data: rows(
            ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
            [30750, 35230, 37780, 35680, 30020, 31350, 33770],
            [484, 541, 567, 538, 476, 510, 543],
            [29400, 33760, 34620, 32480, 28430, 26610, 27560],
            [466, 522, 528, 497, 454, 430, 442]
        ),
    },
    month: {
        label: 'Month',
        icon: 'calendar',
        description: 'September, compared with Aug 1 to 30',
        priorLabel: 'Aug 1 to 30',
        bucket: 'day',
        tickEvery: 3,
        data: rows(
            SEP,
            [
                23940, 24610, 28000, 31450, 34070, 32490, 26810, 24840, 25460, 28700, 34190, 40210, 36050, 28050, 25440,
                28150, 29400, 33760, 34620, 32480, 28430, 26610, 27560, 30750, 35230, 37780, 35680, 30020, 31350, 33770,
            ],
            [
                395, 403, 450, 493, 522, 502, 434, 407, 414, 458, 530, 601, 548, 451, 414, 452, 466, 522, 528, 497, 454,
                430, 442, 484, 541, 567, 538, 476, 510, 543,
            ],
            [
                31070, 28480, 24280, 21850, 23160, 24890, 27270, 32500, 30390, 24400, 22320, 23790, 25290, 29720, 34030,
                29190, 24620, 23570, 23920, 27520, 29340, 32660, 32360, 26050, 24140, 24140, 27470, 30090, 35120, 32810,
            ],
            [
                478, 435, 380, 339, 356, 397, 431, 492, 456, 375, 356, 376, 396, 461, 506, 450, 389, 369, 371, 423, 468,
                499, 490, 404, 371, 385, 434, 471, 527, 488,
            ]
        ),
    },
    year: {
        label: 'Year',
        icon: 'calendar-check',
        description: 'Last 12 months, compared with prior year',
        priorLabel: 'Prior year',
        bucket: 'month',
        data: rows(
            ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            [690400, 842700, 907300, 781500, 702300, 709600, 733400, 761800, 778200, 806200, 851900, 919900],
            [11240, 13510, 14380, 12610, 11420, 11330, 11690, 12090, 12260, 12580, 13180, 14472],
            [550500, 696700, 732300, 653700, 573700, 565800, 606300, 614800, 651000, 658600, 679200, 729400],
            [9153, 11226, 12187, 10373, 9584, 9226, 9713, 10247, 10085, 10557, 10732, 11517]
        ),
    },
};
