// Types and sample rows for components:charts/incident-status-tracker. The block reads records by default;
// SAMPLE_ROWS is static demo data for the pure `rows` prop (docs, previews, tests).

/** One day of one row: counts for records opened that day (and resolved that day when known). */
export type StatusDay = {
    /** Local calendar date 'YYYY-MM-DD'. */
    date: string;
    /** Records opened that day. */
    opened: number;
    /** Records opened that day that breached their SLA. */
    breached: number;
    /** Records resolved that day (null / undefined = not tracked). */
    resolved?: number | null;
    /** Encoded query for the day's records (click-through). */
    query?: string;
};

/** One tracker row: a group (priority, assignment group, category…) and its days, oldest first. */
export type StatusRow = {
    key: string;
    label: string;
    /** Second line under the label. */
    description?: string;
    days: StatusDay[];
    /** Encoded query for the row's records (click-through). */
    query?: string;
};

export type StatusGroup = { key: string; label: string; description?: string };

/** Default rows for groupBy 'priority' (incident priorities 1 to 4). */
export const PRIORITY_GROUPS: StatusGroup[] = [
    { key: '1', label: '1 - Critical', description: 'priority=1' },
    { key: '2', label: '2 - High', description: 'priority=2' },
    { key: '3', label: '3 - Moderate', description: 'priority=3' },
    { key: '4', label: '4 - Low', description: 'priority=4' },
];

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** mulberry32: deterministic sample numbers. */
function seeded(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Deterministic sample rows: `days` days ending at `end` ('YYYY-MM-DD'), one row per priority. */
export function sampleRows(days = 30, end = '2026-11-20'): StatusRow[] {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end);
    const last = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
    const volume = [1.2, 3.5, 7, 4];
    const breachRate = [0.18, 0.1, 0.05, 0.03];
    return PRIORITY_GROUPS.map((g, gi) => {
        const rnd = seeded(31 + gi * 7);
        const out: StatusDay[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() - i);
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const opened = Math.max(0, Math.round(volume[gi] * (weekend ? 0.4 : 1) * (0.4 + rnd() * 1.3)));
            let breached = 0;
            for (let k = 0; k < opened; k++) if (rnd() < breachRate[gi]) breached++;
            const resolved = Math.max(0, Math.round(opened * (0.6 + rnd() * 0.6)));
            out.push({
                date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                opened,
                breached,
                resolved,
            });
        }
        return { key: g.key, label: g.label, description: g.description, days: out };
    });
}

export const SAMPLE_ROWS: StatusRow[] = sampleRows(30);
