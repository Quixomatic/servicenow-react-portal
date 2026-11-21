// Sample data for components:charts/wallet-balances: three balances with their change and a 25-point
// balance trend (relative values on a 0 to 74 scale, the line's fixed domain).

export type Wallet = {
    key: string;
    title: string;
    /** lucide icon name. */
    icon: string;
    /** Icon tile look: 'ink' (near-black with a dot texture), 'indigo' or 'amber'. */
    tile: 'ink' | 'indigo' | 'amber';
    balance: string;
    change: string;
    changeAmount: string;
    up: boolean;
    trend: number[];
};

export const TREND_DOMAIN: [number, number] = [0, 74];

export const WALLETS: Wallet[] = [
    {
        key: 'main',
        title: 'Main Wallet (USD)',
        icon: 'wallet',
        tile: 'ink',
        balance: '$2,435,900',
        change: '+18%',
        changeAmount: '$214,356',
        up: true,
        trend: [
            8.38, 12.57, 12.57, 18.15, 30.72, 25.13, 29.32, 19.55, 37.7, 44.68, 40.49, 40.49, 36.3, 34.91, 27.92, 18.15,
            29.32, 34.91, 46.08, 40.49, 48.87, 57.25, 65.62, 60.04, 46.08,
        ],
    },
    {
        key: 'reserve',
        title: 'Reserve Fund (USD)',
        icon: 'briefcase-business',
        tile: 'indigo',
        balance: '$1,980,000',
        change: '-3%',
        changeAmount: '$58,000',
        up: false,
        trend: [
            65.78, 41.11, 41.11, 24.67, 35.63, 8.22, 8.22, 8.22, 8.22, 16.44, 20.56, 35.63, 35.63, 24.67, 24.67, 24.67,
            12.33, 46.59, 46.59, 46.59, 30.15, 30.15, 16.44, 16.44, 26.04,
        ],
    },
    {
        key: 'growth',
        title: 'Growth Portfolio (USD)',
        icon: 'chart-column',
        tile: 'amber',
        balance: '$3,245,500',
        change: '+10%',
        changeAmount: '$295,000',
        up: true,
        trend: [
            50.98, 50.98, 34.53, 57.56, 57.56, 21.38, 21.38, 9.87, 9.87, 21.38, 26.31, 26.31, 19.73, 27.96, 41.11,
            41.11, 64.13, 21.38, 21.38, 11.51, 39.47, 39.47, 50.98, 50.98, 50.98,
        ],
    },
];
