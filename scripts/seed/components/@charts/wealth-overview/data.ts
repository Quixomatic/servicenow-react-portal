// Sample data for components:charts/wealth-overview: four finance KPIs with a delta badge, a corner note
// (period label or a stack of small marks) and a 24-point trend for the mini area.

/** A corner mark; `bg` draws it as a filled coin (icon in `color` on a `bg` circle). */
export type WealthMark = { icon: string; color: string; label: string; bg?: string };

export type WealthCard = {
    key: string;
    title: string;
    value: string;
    delta: string;
    tone: 'success' | 'destructive' | 'warning';
    /** Badge icon (lucide); defaults to trending-up / trending-down by tone. */
    deltaIcon?: string;
    /** Corner: a short period label, or a row of marks. */
    period?: string;
    marks?: WealthMark[];
    /** Tailwind palette colours, light / dark. */
    light: string;
    dark: string;
    data: number[];
};

export const CARDS: WealthCard[] = [
    {
        key: 'netWorth',
        title: 'Net worth',
        value: '$6.8M',
        delta: '+$185k',
        tone: 'success',
        period: '1w',
        light: 'emerald-500',
        dark: 'emerald-500',
        data: [32, 34, 34, 37, 42, 38, 40, 36, 46, 50, 48, 48, 46, 46, 39, 45, 48, 53, 50, 54, 61, 64, 58, 47],
    },
    {
        key: 'portfolio',
        title: 'Portfolio',
        value: '$4.2M',
        delta: '-$96k',
        tone: 'destructive',
        marks: [
            { icon: 'search', color: '#4285f4', label: 'Search holdings' },
            { icon: 'hash', color: '#e01e5a', label: 'Messaging holdings' },
            { icon: 'square', color: '#5e6ad2', label: 'Software holdings' },
        ],
        light: 'rose-500',
        dark: 'rose-500',
        data: [70, 61, 61, 56, 59, 50, 50, 50, 50, 54, 56, 61, 61, 58, 58, 58, 51, 64, 64, 64, 60, 56, 56, 60],
    },
    {
        key: 'investments',
        title: 'Investments',
        value: '+0.14%',
        delta: '+$89k',
        tone: 'warning',
        deltaIcon: 'circle-dollar-sign',
        marks: [
            { icon: 'atom', color: 'currentColor', label: 'Research fund' },
            { icon: 'bitcoin', color: '#ffffff', bg: '#f7931a', label: 'Bitcoin' },
            { icon: 'hexagon', color: '#f0b90b', bg: '#0a0a0a', label: 'Exchange token' },
        ],
        light: 'amber-500',
        dark: 'amber-500',
        data: [35, 35, 31, 36, 38, 39, 34, 37, 45, 45, 40, 38, 36, 36, 33, 33, 35, 41, 36, 36, 42, 42, 39, 44],
    },
    {
        key: 'cashflow',
        title: 'Cashflow',
        value: '$320k',
        delta: '+$73k',
        tone: 'success',
        period: '1w',
        light: 'emerald-500',
        dark: 'emerald-500',
        data: [52, 48, 54, 54, 43, 43, 39, 39, 43, 46, 46, 45, 48, 52, 55, 43, 42, 38, 49, 48, 52, 52, 52, 56],
    },
];
