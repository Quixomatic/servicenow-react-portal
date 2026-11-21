// Sample data for components:charts/browser-usage: unique visitors by browser per range, with the
// previous period's share, version splits for drill-down and the engine each browser runs on.

export type Browser = {
    key: string;
    label: string;
    /** Narrow-card table label (falls back to label), e.g. "Samsung". */
    short?: string;
    /** Tailwind palette name for the swatch / ring. */
    color: string;
    engine: string;
    /** True for the catch-all row ("Other"); it has no versions and can be hidden. */
    other?: boolean;
};

export type Version = { label: string; share: number };

export type RangeData = {
    label: string;
    /** "last 30 days". */
    span: string;
    /** "previous 30 days" (compare ring note). */
    previous: string;
    dates: string;
    /** Visitors this period, per browser key. */
    visitors: Record<string, number>;
    /** Share of all visitors in the previous period (%), per browser key. */
    prior: Record<string, number>;
    /** Visitor change vs the previous period (%). */
    change: number;
    /** Version splits (% of the browser) for this range; falls back to VERSIONS. */
    versions?: Record<string, Version[]>;
};

export const BROWSERS: Browser[] = [
    { key: 'chrome', label: 'Chrome', color: 'indigo-500', engine: 'blink' },
    { key: 'safari', label: 'Safari', color: 'sky-500', engine: 'webkit' },
    { key: 'edge', label: 'Edge', color: 'teal-500', engine: 'blink' },
    { key: 'firefox', label: 'Firefox', color: 'orange-500', engine: 'gecko' },
    { key: 'samsung', label: 'Samsung Internet', short: 'Samsung', color: 'pink-500', engine: 'blink' },
    { key: 'other', label: 'Other', color: 'zinc-400', engine: 'other', other: true },
];

export const ENGINES: { key: string; label: string; color: string }[] = [
    { key: 'blink', label: 'Blink', color: 'indigo-500' },
    { key: 'webkit', label: 'WebKit', color: 'sky-500' },
    { key: 'gecko', label: 'Gecko', color: 'orange-500' },
    { key: 'other', label: 'Other', color: 'zinc-400' },
];

/** Version splits (% of each browser's visitors); the last entry takes the remainder. */
export const VERSIONS: Record<string, Version[]> = {
    chrome: [
        { label: '156', share: 52 },
        { label: '155', share: 31 },
        { label: '154', share: 10 },
        { label: 'Older', share: 7 },
    ],
    safari: [
        { label: '27.0', share: 40 },
        { label: '26.6', share: 38 },
        { label: '26.5', share: 13 },
        { label: 'Older', share: 9 },
    ],
    edge: [
        { label: '156', share: 55 },
        { label: '155', share: 33 },
        { label: 'Older', share: 12 },
    ],
    firefox: [
        { label: '157', share: 45 },
        { label: '156', share: 29 },
        { label: '153 ESR', share: 17 },
        { label: 'Older', share: 9 },
    ],
    samsung: [
        { label: '30', share: 50 },
        { label: '29', share: 36 },
        { label: 'Older', share: 14 },
    ],
};

export const RANGES: Record<string, RangeData> = {
    '7d': {
        label: '7D',
        span: 'last 7 days',
        previous: 'previous 7 days',
        dates: 'Oct 9 to Oct 15, 2026',
        visitors: { chrome: 28540, safari: 10170, edge: 4290, firefox: 2505, samsung: 1157, other: 1542 },
        prior: { chrome: 58.5, safari: 20.5, edge: 9.4, firefox: 5.8, samsung: 2.3, other: 3.5 },
        change: 4.6,
        versions: {
            chrome: [
                { label: '156', share: 66 },
                { label: '155', share: 22 },
                { label: '154', share: 6 },
                { label: 'Older', share: 6 },
            ],
        },
    },
    '30d': {
        label: '30D',
        span: 'last 30 days',
        previous: 'previous 30 days',
        dates: 'Sep 16 to Oct 15, 2026',
        visitors: { chrome: 121380, safari: 42960, edge: 18720, firefox: 10940, samsung: 4890, other: 6510 },
        prior: { chrome: 58.22, safari: 20.25, edge: 9.77, firefox: 5.97, samsung: 2.25, other: 3.47 },
        change: 3.5,
    },
    '90d': {
        label: '90D',
        span: 'last 90 days',
        previous: 'previous 90 days',
        dates: 'Jul 18 to Oct 15, 2026',
        visitors: { chrome: 358900, safari: 126300, edge: 57100, firefox: 33800, samsung: 14200, other: 19600 },
        prior: { chrome: 57.3, safari: 20.4, edge: 10.1, firefox: 6.3, samsung: 2.2, other: 3.6 },
        change: 5.4,
    },
};

export const SUPPORT_LINES = [0.5, 1, 2];
