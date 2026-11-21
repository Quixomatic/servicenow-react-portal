/**
 * Sample data for components:charts/fund-inflows: net new capital (USD) per fund per year. The last
 * year is partial (`ytd`), booked through `bookedThrough`, and gets a run-rate estimate
 * (year to date ÷ elapsed fraction of the year).
 */

export type Fund = { key: string; label: string; color: string; icon: string };
export type InflowYear = { year: number; ytd?: boolean; values: Record<string, number> };

/** `color` is a Tailwind palette name (used as var(--color-<name>)). */
export const FUNDS: Fund[] = [
    { key: 'wavemark', label: 'WaveMark Capital', color: 'teal-500', icon: 'gem' },
    { key: 'envato', label: 'Envato Finances', color: 'amber-400', icon: 'leaf' },
    { key: 'qbridge', label: 'QBridge Tech', color: 'violet-500', icon: 'cpu' },
    { key: 'neon', label: 'Neon Liquidity', color: 'sky-500', icon: 'droplets' },
    { key: 'stripe', label: 'Stripe Treasury', color: 'rose-400', icon: 'landmark' },
    { key: 'eth', label: 'ETH Reserve Pool', color: 'slate-400', icon: 'hexagon' },
];

export const BOOKED_THROUGH = 'Sep 30, 2026';
/** Elapsed fraction of the partial year (Sep 30 = 9 of 12 months). */
export const ELAPSED = 0.75;

export const YEARS: InflowYear[] = [
    {
        year: 2021,
        values: {
            wavemark: 3862100,
            envato: 1512600,
            qbridge: 842300,
            neon: 698400,
            stripe: 402700,
            eth: 286500,
        },
    },
    {
        year: 2022,
        values: {
            wavemark: 3214800,
            envato: 1398200,
            qbridge: 701900,
            neon: 612300,
            stripe: 455100,
            eth: 318700,
        },
    },
    {
        year: 2023,
        values: {
            wavemark: 4705300,
            envato: 1846900,
            qbridge: 954600,
            neon: 735800,
            stripe: 506200,
            eth: 352900,
        },
    },
    {
        year: 2024,
        values: {
            wavemark: 6318900,
            envato: 2537400,
            qbridge: 1108200,
            neon: 816700,
            stripe: 571800,
            eth: 389600,
        },
    },
    {
        year: 2025,
        values: {
            wavemark: 7928400,
            envato: 3214900,
            qbridge: 1246300,
            neon: 892450,
            stripe: 634200,
            eth: 418975,
        },
    },
    {
        year: 2026,
        ytd: true,
        values: {
            wavemark: 6618300,
            envato: 2688300,
            qbridge: 1104600,
            neon: 581200,
            stripe: 529400,
            eth: 377800,
        },
    },
];
