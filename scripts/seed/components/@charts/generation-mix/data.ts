// Sample data for components:charts/generation-mix: hourly output (GW) by source for one day, 00:00 to 24:00.

export type Source = { key: string; label: string; light: string; dark: string; values: number[] };

export const SOURCES: Source[] = [
    {
        key: 'solar',
        label: 'Solar',
        light: 'amber-500',
        dark: 'amber-400',
        values: [
            0, 0, 0, 0, 0, 0, 0.3, 1.6, 4.2, 7.6, 10.8, 13.4, 15.1, 15.8, 15.2, 13.6, 11, 7.4, 3.6, 0.9, 0.1, 0, 0, 0,
            0,
        ],
    },
    {
        key: 'wind',
        label: 'Wind',
        light: 'sky-500',
        dark: 'sky-400',
        values: [
            10.6, 11.4, 12.3, 11.8, 10.9, 10.4, 9.8, 8.6, 7.2, 6.3, 5.6, 4.9, 4.4, 4.8, 5.7, 6.1, 6.9, 8.4, 9.6, 9.2,
            8.7, 9.9, 11.1, 11.8, 12,
        ],
    },
    {
        key: 'nuclear',
        label: 'Nuclear',
        light: 'violet-500',
        dark: 'violet-400',
        values: [
            6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.3, 6.1, 5.7, 5.2, 4.8, 4.6, 4.5, 4.7, 5.1, 5.6, 6.1, 6.4, 6.4, 6.4,
            6.4, 6.4, 6.4, 6.4,
        ],
    },
    {
        key: 'gas',
        label: 'Gas',
        light: 'rose-500',
        dark: 'rose-400',
        values: [
            4.8, 4.2, 3.8, 3.6, 3.7, 4.3, 5.6, 6.8, 6.2, 4.9, 3.6, 2.7, 2.2, 2, 2.3, 3.1, 4.6, 7.2, 9.6, 10.8, 10.2,
            8.9, 7.4, 6.1, 5.2,
        ],
    },
    {
        key: 'hydro',
        label: 'Hydro',
        light: 'blue-600',
        dark: 'blue-500',
        values: [
            2.4, 2.1, 1.9, 1.8, 1.9, 2.6, 3.8, 4.9, 5.1, 4.2, 3.1, 2.4, 2, 1.9, 2, 2.4, 3.3, 4.6, 5.6, 5.9, 5.4, 4.4,
            3.4, 2.8, 2.5,
        ],
    },
    {
        key: 'battery',
        label: 'Battery',
        light: 'emerald-500',
        dark: 'emerald-400',
        values: [
            0.4, 0.2, 0, 0, 0, 0.3, 1.1, 1.6, 0.9, 0.2, 0, 0, 0, 0, 0, 0, 0.4, 1.6, 2.9, 3.6, 3.2, 2.1, 1, 0.5, 0.3,
        ],
    },
];

/** Source presets (Display options → Sources). */
export const PRESETS: { key: string; label: string; icon: string; sources: string[] }[] = [
    {
        key: 'all',
        label: 'All Sources',
        icon: 'layers',
        sources: ['solar', 'wind', 'nuclear', 'gas', 'hydro', 'battery'],
    },
    { key: 'renewables', label: 'Renewables', icon: 'leaf', sources: ['solar', 'wind', 'hydro'] },
    { key: 'variable', label: 'Variable Supply', icon: 'sun', sources: ['solar', 'wind'] },
    { key: 'firm', label: 'Firm Supply', icon: 'zap', sources: ['nuclear', 'gas', 'hydro', 'battery'] },
];

/** Comparison baselines (Compare against): the day's total vs each. */
export const BASELINES: { key: string; label: string; icon: string; note: string; delta: number }[] = [
    { key: 'forecast', label: 'Day-Ahead Forecast', icon: 'target', note: 'vs forecast', delta: -0.7 },
    { key: 'week', label: 'Same Day Last Week', icon: 'calendar-days', note: 'vs last Saturday', delta: 1.6 },
    { key: 'avg30', label: '30-Day Average', icon: 'history', note: 'vs 30-day avg', delta: 4.3 },
];

/** Sources counted as renewable in the header. */
export const RENEWABLE = ['solar', 'wind', 'hydro'];
