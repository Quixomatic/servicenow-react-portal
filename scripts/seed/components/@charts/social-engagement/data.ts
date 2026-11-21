// Sample data for components:charts/social-engagement: per-channel daily impressions, engagements,
// link clicks and posts for 371 closed days (to Oct 15, 2026) and 48 closed hours (to Oct 16, 1 PM UTC).
// The last 14 days are fixed sample values; older days and the hours come from a seeded generator so
// every range has a believable, repeatable history.

export type Channel = { key: string; label: string; light: string; dark: string };
/** [impressions, engagements, link clicks, posts] for one channel in one day or hour. */
export type Cell = [number, number, number, number];
/** One day or hour: a Cell per channel (in CHANNELS order). */
export type Bucket = { at: string; cells: Cell[] };
export type Format = { key: string; label: string; share: number[] };
export type SocialRange = {
    key: string;
    label: string;
    group: 'Hourly' | 'Daily' | 'Weekly';
    unit: 'hour' | 'day' | 'week';
    count: number;
    phrase: string;
    tickEvery: number;
};

export const CHANNELS: Channel[] = [
    { key: 'facebook', label: 'Facebook', light: 'blue-600', dark: 'blue-500' },
    { key: 'instagram', label: 'Instagram', light: 'orange-500', dark: 'orange-500' },
    { key: 'linkedin', label: 'LinkedIn', light: 'slate-600', dark: 'slate-400' },
];

/** Share of each channel's activity per content format (All content = 1). */
export const FORMATS: Format[] = [
    { key: 'all', label: 'All content', share: [1, 1, 1] },
    { key: 'video', label: 'Video', share: [0.36, 0.46, 0.22] },
    { key: 'images', label: 'Images', share: [0.38, 0.4, 0.28] },
    { key: 'text', label: 'Text and links', share: [0.2, 0.08, 0.44] },
];

export const RANGES: SocialRange[] = [
    {
        key: '24h',
        label: 'Last 24 hours',
        group: 'Hourly',
        unit: 'hour',
        count: 24,
        phrase: 'last 24 hours',
        tickEvery: 4,
    },
    { key: '7d', label: 'Last 7 days', group: 'Daily', unit: 'day', count: 7, phrase: 'last 7 days', tickEvery: 1 },
    { key: '14d', label: 'Last 14 days', group: 'Daily', unit: 'day', count: 14, phrase: 'last 14 days', tickEvery: 2 },
    { key: '30d', label: 'Last 30 days', group: 'Daily', unit: 'day', count: 30, phrase: 'last 30 days', tickEvery: 5 },
    {
        key: '90d',
        label: 'Last 90 days',
        group: 'Daily',
        unit: 'day',
        count: 90,
        phrase: 'last 90 days',
        tickEvery: 14,
    },
    {
        key: '6m',
        label: 'Last 6 months',
        group: 'Weekly',
        unit: 'week',
        count: 26,
        phrase: 'last 6 months',
        tickEvery: 4,
    },
];

export const LAST_DAY = '2026-10-15';
/** The last closed hour: Oct 16, 1 PM UTC (ISO, hour precision). */
export const LAST_HOUR = '2026-10-16T13';

/** Fixed last 14 days: [day][channel] = [impressions, engagements, link clicks]. */
const RECENT: number[][][] = [
    [
        [101184, 3168, 697],
        [134017, 10522, 608],
        [33833, 996, 269],
    ],
    [
        [79320, 3123, 586],
        [134408, 9008, 480],
        [17609, 790, 218],
    ],
    [
        [98671, 2403, 476],
        [200251, 10188, 528],
        [15264, 705, 213],
    ],
    [
        [106689, 3354, 803],
        [122681, 6580, 320],
        [57108, 2332, 723],
    ],
    [
        [93949, 2267, 443],
        [170111, 10283, 442],
        [46218, 2401, 720],
    ],
    [
        [93542, 2476, 494],
        [162486, 11784, 633],
        [51203, 2150, 604],
    ],
    [
        [79894, 2578, 548],
        [177055, 9388, 429],
        [60182, 2471, 662],
    ],
    [
        [128200, 5368, 1007],
        [124100, 7881, 442],
        [49498, 2286, 582],
    ],
    [
        [112000, 2614, 512],
        [191800, 9630, 492],
        [18947, 721, 207],
    ],
    [
        [88113, 2715, 604],
        [159600, 10106, 483],
        [21065, 966, 288],
    ],
    [
        [83751, 2787, 579],
        [121700, 6929, 388],
        [43859, 1565, 418],
    ],
    [
        [183200, 6033, 1324],
        [153100, 6005, 322],
        [38546, 1846, 486],
    ],
    [
        [202800, 7975, 1749],
        [149000, 9227, 391],
        [38505, 1204, 294],
    ],
    [
        [105300, 2911, 604],
        [144300, 10571, 535],
        [42549, 1527, 419],
    ],
];
const RECENT_POSTS = [
    [2, 3, 1],
    [3, 3, 2],
    [2, 3, 1],
    [3, 3, 2],
    [2, 3, 1],
    [3, 3, 1],
    [2, 3, 2],
    [3, 3, 2],
    [2, 3, 1],
    [2, 3, 1],
    [3, 3, 2],
    [2, 3, 1],
    [3, 3, 2],
    [2, 3, 1],
];

function rng(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const BASE = [
    { imp: 118000, rate: 0.031, click: 0.0068, posts: 2.4 },
    { imp: 148000, rate: 0.056, click: 0.003, posts: 3.1 },
    { imp: 34000, rate: 0.041, click: 0.0105, posts: 1.2 },
];

function addDays(iso: string, n: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function buildDaily(): Bucket[] {
    const r = rng(23);
    const out: Bucket[] = [];
    const total = 371;
    for (let i = 0; i < total; i++) {
        const at = addDays(LAST_DAY, i - total + 1);
        const back = total - 1 - i;
        if (back < RECENT.length) {
            const k = RECENT.length - 1 - back;
            out.push({ at, cells: RECENT[k].map((c, ch) => [c[0], c[1], c[2], RECENT_POSTS[k][ch]] as Cell) });
            continue;
        }
        const dow = new Date(at + 'T00:00:00Z').getUTCDay();
        const weekend = dow === 0 || dow === 6 ? 0.78 : 1;
        const trend = 0.82 + (i / total) * 0.22;
        out.push({
            at,
            cells: BASE.map((b, ch) => {
                const imp = Math.round(b.imp * trend * (ch === 2 ? weekend * weekend : weekend) * (0.7 + r() * 0.6));
                const eng = Math.round(imp * b.rate * (0.75 + r() * 0.5));
                const clk = Math.round(imp * b.click * (0.7 + r() * 0.6));
                const posts = Math.max(0, Math.round(b.posts * (0.6 + r() * 0.8)));
                return [imp, eng, clk, posts] as Cell;
            }),
        });
    }
    return out;
}

function buildHourly(): Bucket[] {
    const r = rng(7);
    const out: Bucket[] = [];
    const [day, hh] = LAST_HOUR.split('T');
    const end = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), Number(hh));
    for (let i = 47; i >= 0; i--) {
        const t = new Date(end - i * 3600000);
        const at = t.toISOString().slice(0, 13);
        const h = t.getUTCHours();
        const curve = 0.35 + 0.65 * Math.max(0, Math.sin(((h - 5) / 24) * Math.PI * 2 * 0.5 + 0.2));
        out.push({
            at,
            cells: BASE.map((b, ch) => {
                const imp = Math.round(((b.imp * 1.05) / 24) * 2 * curve * (0.7 + r() * 0.6));
                const eng = Math.round(imp * b.rate * (0.75 + r() * 0.5));
                const clk = Math.round(imp * b.click * (ch === 2 ? 1.6 : 1.4) * (0.7 + r() * 0.6));
                const posts = r() < b.posts / 24 + (ch === 2 ? 0 : 0.02) ? 1 : 0;
                return [imp, eng, clk, posts] as Cell;
            }),
        });
    }
    return out;
}

export const DAILY: Bucket[] = buildDaily();
export const HOURLY: Bucket[] = buildHourly();
