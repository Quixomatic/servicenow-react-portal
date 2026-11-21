// Sample data for components:charts/liquidity-flows: a lending pool's daily supply by asset and withdrawals ($),
// Oct 1 2025 to Sep 30 2026. September is fixed day by day; earlier days are spread deterministically from
// fixed weekly (Jul to Aug) and monthly (Oct to Aug) totals, so every range shows the same sums.

export type Asset = {
    key: string;
    label: string;
    light: string;
    dark: string;
    stable?: boolean;
};

/** Stack order, bottom to top. */
export const ASSETS: Asset[] = [
    {
        key: 'usdc',
        label: 'USDC',
        light: 'emerald-500',
        dark: 'emerald-400',
        stable: true,
    },
    {
        key: 'usdt',
        label: 'USDT',
        light: 'teal-700',
        dark: 'teal-600',
        stable: true,
    },
    { key: 'eth', label: 'ETH', light: 'sky-500', dark: 'sky-400' },
    { key: 'wbtc', label: 'WBTC', light: 'indigo-500', dark: 'indigo-400' },
];

/** One day: supply by asset and withdrawals by asset, $. */
export type FlowDay = {
    date: string;
    supply: Record<string, number>;
    out: Record<string, number>;
};

/** TVL by asset at the close of the last day, $. */
export const TVL_CLOSE: Record<string, number> = {
    usdc: 1087.9e6,
    usdt: 389.2e6,
    eth: 747.3e6,
    wbtc: 255.6e6,
};

export const START_DATE = '2025-10-01';
export const END_DATE = '2026-09-30';

export type FlowRange = {
    value: string;
    label: string;
    days: number;
    bucket: 'day' | 'week' | 'month';
    barSize: number;
};

export const RANGES: FlowRange[] = [
    { value: '30d', label: '30D', days: 30, bucket: 'day', barSize: 10 },
    { value: '90d', label: '90D', days: 91, bucket: 'week', barSize: 18 },
    { value: '1y', label: '1Y', days: 365, bucket: 'month', barSize: 19 },
];

// Order inside the tuples below: [wbtc, eth, usdt, usdc, withdrawn or net] in $M.
const ORDER = ['wbtc', 'eth', 'usdt', 'usdc'];

// Sep 1 to Sep 30 2026, [.., withdrawn].
const SEPTEMBER: number[][] = [
    [6.4, 12.0, 12.8, 22.5, 46.2],
    [4.1, 14.4, 7.6, 22.0, 49.6],
    [5.0, 15.5, 7.7, 19.3, 44.1],
    [5.6, 12.0, 12.3, 23.8, 48.4],
    [2.9, 7.3, 6.2, 15.2, 34.8],
    [3.8, 12.1, 5.5, 16.1, 26.0],
    [5.6, 13.3, 12.7, 23.2, 47.7],
    [5.4, 14.4, 10.1, 14.0, 47.1],
    [5.9, 16.1, 7.3, 17.2, 46.2],
    [4.2, 18.0, 11.9, 22.2, 47.2],
    [6.1, 14.5, 10.0, 17.1, 46.7],
    [3.8, 11.8, 5.7, 9.6, 26.3],
    [3.2, 10.6, 7.1, 9.2, 25.2],
    [6.3, 13.7, 10.9, 16.0, 49.3],
    [5.1, 13.4, 24.9, 40.1, 49.8],
    [4.5, 14.9, 10.8, 38.2, 54.6],
    [6.2, 16.4, 12.4, 24.2, 38.8],
    [3.6, 12.9, 10.2, 16.9, 43.8],
    [3.1, 11.3, 6.6, 13.0, 35.3],
    [2.8, 6.9, 6.9, 14.3, 32.6],
    [5.9, 10.6, 8.4, 25.0, 44.1],
    [6.7, 18.6, 8.8, 13.8, 47.7],
    [4.3, 14.9, 11.5, 23.6, 78.2],
    [6.8, 15.3, 10.2, 20.1, 41.1],
    [3.9, 10.8, 12.7, 17.9, 43.2],
    [3.8, 10.2, 8.8, 10.1, 29.2],
    [2.9, 9.3, 7.5, 14.0, 33.7],
    [6.2, 12.1, 11.3, 25.8, 53.4],
    [5.8, 17.0, 12.0, 22.5, 41.2],
    [6.6, 11.9, 12.5, 20.4, 48.7],
];

// Weekly totals Jul 2 to Sep 2 2026 (7-day weeks from Jul 2), [.., net flow].
const WEEKS: number[][] = [
    [35.0, 91.8, 65.6, 125.2, 8.1],
    [30.0, 97.0, 66.6, 123.6, 21.7],
    [37.8, 118.9, 69.0, 120.1, 30.5],
    [35.1, 86.9, 67.6, 121.4, 14.3],
    [31.5, 86.0, 66.6, 118.7, -5.6],
    [30.9, 82.7, 65.9, 125.4, 7.5],
    [33.5, 89.3, 61.3, 126.7, 13.7],
    [33.5, 75.3, 62.3, 135.0, 3.1],
    [33.1, 91.7, 63.4, 129.6, 21.8],
];

// Monthly totals Oct 2025 to Aug 2026, [.., net flow].
const MONTHS: number[][] = [
    [130.8, 358.3, 241.3, 488.0, 85.2],
    [120.6, 340.4, 236.9, 468.6, 36.2],
    [119.4, 349.9, 241.2, 473.4, 80.5],
    [114.4, 340.0, 245.8, 479.3, 44.0],
    [121.8, 321.9, 248.9, 499.3, 94.0],
    [130.9, 365.6, 271.8, 530.0, -0.6],
    [131.3, 359.3, 255.0, 509.8, 121.7],
    [138.9, 357.1, 257.1, 490.0, 63.0],
    [148.9, 429.5, 292.1, 525.7, 85.1],
    [152.0, 435.4, 300.3, 546.3, 67.8],
    [142.1, 372.6, 278.0, 552.7, 40.9],
];

/** Withdrawals by asset over September ($M): fits each day's withdrawals to the assets. */
const SEPT_OUT: Record<string, number> = {
    usdc: 491.0,
    usdt: 287.5,
    eth: 382.4,
    wbtc: 139.3,
};

/** Up days (net flow > 0) to place: Oct 1 to Jul 1, and Jul 2 to Aug 31. */
const UP_EARLY = 174;
const UP_SUMMER = 33;
/** The year's peak day: Jul 21, +$40.5M net. */
const PEAK = { date: '2026-07-21', net: 40.5 };

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const T0 = Date.parse(`${START_DATE}T00:00:00Z`);
const dayIndex = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - T0) / DAY);

function seeded(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Segment = {
    from: number;
    days: number;
    totals: number[];
    up: number;
    group: 'early' | 'summer';
};

const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);

function segments(): Segment[] {
    const out: Segment[] = [];
    const sep12 = SEPTEMBER.slice(0, 2).reduce(
        (acc, r) => add(acc, [r[0], r[1], r[2], r[3], r[0] + r[1] + r[2] + r[3] - r[4]]),
        [0, 0, 0, 0, 0]
    );
    const aug2731 = sub(WEEKS[8], sep12);
    const augWeeks = WEEKS.slice(5, 8).reduce(add, [0, 0, 0, 0, 0]);
    const aug0105 = sub(sub(MONTHS[10], augWeeks), aug2731);
    const jul3031 = sub(WEEKS[4], aug0105);
    const julWeeks = WEEKS.slice(0, 4).reduce(add, [0, 0, 0, 0, 0]);
    const jul01 = sub(sub(MONTHS[9], julWeeks), jul3031);
    // Oct to Jun by calendar month.
    let from = 0;
    for (let m = 0; m < 9; m++) {
        const first = new Date(Date.UTC(2025, 9 + m, 1));
        const next = new Date(Date.UTC(2025, 10 + m, 1));
        const days = Math.round((next.getTime() - first.getTime()) / DAY);
        out.push({ from, days, totals: MONTHS[m], up: 0, group: 'early' });
        from += days;
    }
    out.push({ from, days: 1, totals: jul01, up: 0, group: 'early' });
    from += 1;
    for (let w = 0; w < 4; w++) {
        out.push({ from, days: 7, totals: WEEKS[w], up: 0, group: 'summer' });
        from += 7;
    }
    out.push({ from, days: 2, totals: jul3031, up: 0, group: 'summer' });
    from += 2;
    out.push({ from, days: 5, totals: aug0105, up: 0, group: 'summer' });
    from += 5;
    for (let w = 5; w < 8; w++) {
        out.push({ from, days: 7, totals: WEEKS[w], up: 0, group: 'summer' });
        from += 7;
    }
    out.push({ from, days: 5, totals: aug2731, up: 0, group: 'summer' });
    return out;
}

/** Spreads `target` up days over the segments, by length, keeping each segment's net sign possible. */
function placeUpDays(segs: Segment[], target: number) {
    const total = segs.reduce((s, g) => s + g.days, 0);
    const lo = (g: Segment) => (g.totals[4] > 0 ? 1 : 0);
    const hi = (g: Segment) => (g.totals[4] < 0 ? g.days - 1 : g.days);
    let placed = 0;
    segs.forEach((g) => {
        g.up = Math.min(hi(g), Math.max(lo(g), Math.round((g.days * target) / total)));
        placed += g.up;
    });
    let guard = 0;
    while (placed !== target && guard < 1000) {
        const step = placed < target ? 1 : -1;
        const g = segs[guard % segs.length];
        if (g.up + step >= lo(g) && g.up + step <= hi(g)) {
            g.up += step;
            placed += step;
        }
        guard++;
    }
}

function build(): FlowDay[] {
    const rand = seeded(19);
    const total = dayIndex(END_DATE) + 1;
    const supply: number[][] = [];
    const net: number[] = [];
    const segs = segments();
    placeUpDays(
        segs.filter((g) => g.group === 'early'),
        UP_EARLY
    );
    placeUpDays(
        segs.filter((g) => g.group === 'summer'),
        UP_SUMMER
    );
    const peakAt = dayIndex(PEAK.date);
    segs.forEach((g) => {
        // Supply: each asset's total spread by weekday weight and noise.
        const days = Array.from({ length: g.days }, (_, i) => g.from + i);
        const wk = days.map((d) => {
            const dow = new Date(T0 + d * DAY).getUTCDay();
            return dow === 0 || dow === 6 ? 0.64 : 1;
        });
        ORDER.forEach((_, a) => {
            const w = wk.map((v) => v * (0.72 + rand() * 0.56));
            const sum = w.reduce((s, v) => s + v, 0);
            days.forEach((d, i) => {
                supply[d] = supply[d] || [0, 0, 0, 0];
                supply[d][a] = (g.totals[a] * w[i]) / sum;
            });
        });
        // Net flow: `up` positive days, the rest negative, scaled to the segment's net.
        const forced = peakAt >= g.from && peakAt < g.from + g.days ? peakAt - g.from : -1;
        const order = days.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const t = order[i];
            order[i] = order[j];
            order[j] = t;
        }
        const ups = order.filter((i) => i !== forced).slice(0, Math.max(0, g.up - (forced >= 0 ? 1 : 0)));
        const mags = days.map(() => 2 + rand() * 9);
        const target = g.totals[4] - (forced >= 0 ? PEAK.net : 0);
        let pos = 0;
        let neg = 0;
        days.forEach((_, i) => {
            if (i === forced) return;
            if (ups.indexOf(i) >= 0) pos += mags[i];
            else neg += mags[i];
        });
        // pos * kp - neg * kn = target, keeping both scales positive.
        let kp = 1;
        let kn = 1;
        if (pos > 0 && neg > 0) {
            if (target + neg > 0.15 * pos) kp = (target + neg) / pos;
            else {
                kp = 0.5;
                kn = (pos * 0.5 - target) / neg;
            }
        } else if (pos > 0) kp = target / pos;
        else if (neg > 0) kn = -target / neg;
        days.forEach((d, i) => {
            if (i === forced) net[d] = PEAK.net;
            else net[d] = ups.indexOf(i) >= 0 ? mags[i] * kp : -mags[i] * kn;
        });
    });
    // September, fixed.
    const sepFrom = dayIndex('2026-09-01');
    SEPTEMBER.forEach((r, i) => {
        supply[sepFrom + i] = [r[0], r[1], r[2], r[3]];
        net[sepFrom + i] = r[0] + r[1] + r[2] + r[3] - r[4];
    });
    // Withdrawals by asset: the day's total split by supply, weighted per asset to fit September.
    const k = [1, 1, 1, 1];
    for (let it = 0; it < 40; it++) {
        const got = [0, 0, 0, 0];
        for (let d = sepFrom; d < total; d++) {
            const s = supply[d];
            const w = s.reduce((acc, v, a) => acc + v * k[a], 0) - net[d];
            const den = s.reduce((acc, v, a) => acc + v * k[a], 0);
            s.forEach((v, a) => {
                got[a] += (w * v * k[a]) / den;
            });
        }
        ORDER.forEach((key, a) => {
            k[a] *= SEPT_OUT[key] / got[a];
        });
    }
    const out: FlowDay[] = [];
    for (let d = 0; d < total; d++) {
        const s = supply[d];
        const withdrawn = s.reduce((acc, v) => acc + v, 0) - net[d];
        const den = s.reduce((acc, v, a) => acc + v * k[a], 0);
        const day: FlowDay = { date: iso(T0 + d * DAY), supply: {}, out: {} };
        ORDER.forEach((key, a) => {
            day.supply[key] = s[a] * 1e6;
            day.out[key] = ((withdrawn * s[a] * k[a]) / den) * 1e6;
        });
        out.push(day);
    }
    return out;
}

/** 365 days ending on END_DATE. */
export const DAYS: FlowDay[] = build();
