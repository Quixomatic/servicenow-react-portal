// Sample data for components:charts/inventory-velocity (units sold per day by category and warehouse).

export type Warehouse = { key: string; label: string };

/** units: units a day per warehouse key; prior: units a day in the prior period (all warehouses). */
export type CategoryPeriod = { units: Record<string, number>; prior: number };

export type Category = {
    key: string;
    label: string;
    /** Units on hand across all warehouses. */
    onHand: number;
    periods: Record<string, CategoryPeriod>;
};

export type Period = { key: string; label: string; shortcut: string; days: number; range: string };

export const WAREHOUSES: Warehouse[] = [
    { key: 'reno', label: 'Reno DC' },
    { key: 'columbus', label: 'Columbus DC' },
    { key: 'savannah', label: 'Savannah DC' },
];

export const PERIODS: Period[] = [
    { key: '7d', label: 'Last 7 days', shortcut: '7D', days: 7, range: 'Oct 5 to Oct 11' },
    { key: '30d', label: 'Last 30 days', shortcut: '30D', days: 30, range: 'Sep 12 to Oct 11' },
    { key: '90d', label: 'Last 90 days', shortcut: '90D', days: 90, range: 'Jul 14 to Oct 11' },
];

const p = (reno: number, columbus: number, savannah: number, prior: number): CategoryPeriod => ({
    units: { reno, columbus, savannah },
    prior,
});

export const CATEGORIES: Category[] = [
    {
        key: 'electronics',
        label: 'Electronics',
        onHand: 17830,
        periods: { '7d': p(108, 141, 107, 391), '30d': p(103, 135, 104, 364), '90d': p(94, 112, 98, 310) },
    },
    {
        key: 'apparel',
        label: 'Apparel',
        onHand: 15800,
        periods: { '7d': p(411, 298, 219, 773), '30d': p(379, 294, 203, 718), '90d': p(373, 266, 200, 749) },
    },
    {
        key: 'home',
        label: 'Home',
        onHand: 13800,
        periods: { '7d': p(181, 155, 147, 443), '30d': p(189, 171, 152, 470), '90d': p(185, 154, 152, 486) },
    },
    {
        key: 'beauty',
        label: 'Beauty',
        onHand: 13800,
        periods: { '7d': p(244, 266, 205, 601), '30d': p(220, 236, 173, 538), '90d': p(194, 197, 154, 495) },
    },
    {
        key: 'health',
        label: 'Health',
        onHand: 14200,
        periods: { '7d': p(173, 129, 123, 438), '30d': p(189, 140, 129, 440), '90d': p(169, 126, 128, 423) },
    },
    {
        key: 'sports',
        label: 'Sports',
        onHand: 15600,
        periods: { '7d': p(268, 239, 320, 667), '30d': p(244, 230, 307, 620), '90d': p(226, 219, 284, 651) },
    },
    {
        key: 'toys',
        label: 'Toys',
        onHand: 16900,
        periods: { '7d': p(113, 102, 143, 369), '30d': p(127, 116, 151, 406), '90d': p(113, 99, 146, 358) },
    },
    {
        key: 'automotive',
        label: 'Automotive',
        onHand: 14800,
        periods: { '7d': p(320, 283, 231, 689), '30d': p(344, 308, 273, 777), '90d': p(309, 258, 242, 710) },
    },
    {
        key: 'garden',
        label: 'Garden',
        onHand: 15500,
        periods: { '7d': p(285, 237, 226, 554), '30d': p(235, 203, 209, 494), '90d': p(235, 178, 192, 504) },
    },
    {
        key: 'grocery',
        label: 'Grocery',
        onHand: 6400,
        periods: { '7d': p(203, 228, 179, 570), '30d': p(164, 215, 153, 493), '90d': p(145, 178, 134, 444) },
    },
    {
        key: 'books',
        label: 'Books',
        onHand: 15300,
        periods: { '7d': p(249, 332, 237, 705), '30d': p(252, 309, 242, 698), '90d': p(218, 273, 213, 634) },
    },
    {
        key: 'office',
        label: 'Office',
        onHand: 15400,
        periods: { '7d': p(76, 100, 74, 260), '30d': p(88, 107, 76, 298), '90d': p(79, 100, 69, 267) },
    },
];
