/**
 * Time buckets as date ranges. Bucket edges are calendar dates in the browser's time zone, sent as
 * javascript:gs.dateGenerate('YYYY-MM-DD','00:00:00'), which the platform reads in the user's time
 * zone, so the two agree when the profile and the browser share a zone (the usual case).
 */
import type { Interval, TimeBucket } from './types';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Date → 'YYYY-MM-DD' (local). */
export function ymd(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → local Date at midnight (invalid → today). */
export function parseYmd(s?: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Start of the bucket containing d. weekStart: 1 = Monday, 0 = Sunday. */
export function startOf(d: Date, interval: Interval, weekStart: 0 | 1 = 1): Date {
    const y = d.getFullYear();
    const m = d.getMonth();
    switch (interval) {
        case 'week': {
            const back = (d.getDay() - weekStart + 7) % 7;
            return new Date(y, m, d.getDate() - back);
        }
        case 'month':
            return new Date(y, m, 1);
        case 'quarter':
            return new Date(y, Math.floor(m / 3) * 3, 1);
        case 'year':
            return new Date(y, 0, 1);
        default:
            return new Date(y, m, d.getDate());
    }
}

/** d plus n intervals. */
export function addInterval(d: Date, interval: Interval, n: number): Date {
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    switch (interval) {
        case 'week':
            return new Date(y, m, day + 7 * n);
        case 'month':
            return new Date(y, m + n, day);
        case 'quarter':
            return new Date(y, m + 3 * n, day);
        case 'year':
            return new Date(y + n, m, day);
        default:
            return new Date(y, m, day + n);
    }
}

/** Short bucket label: 'Nov 16' (day, week), 'Nov 2026' (month), 'Q4 2026', '2026'. */
export function bucketLabel(d: Date, interval: Interval, locale?: string): string {
    if (interval === 'year') return String(d.getFullYear());
    if (interval === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    if (interval === 'month') return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
}

/** Encoded condition: field in [start, end) (dates 'YYYY-MM-DD'). */
export function rangeCondition(field: string, start: string, end: string): string {
    return `${field}>=javascript:gs.dateGenerate('${start}','00:00:00')^${field}<javascript:gs.dateGenerate('${end}','00:00:00')`;
}

/**
 * The last `periods` buckets of `interval` on `field`, oldest first, the last one containing `end`
 * (default today). Each has start / end dates, a label and its encoded condition.
 */
export function timeBuckets(
    field: string,
    interval: Interval = 'week',
    periods = 12,
    options: { end?: string; weekStart?: 0 | 1; locale?: string } = {}
): TimeBucket[] {
    const n = Math.max(1, Math.min(120, Math.floor(periods || 12)));
    const last = startOf(parseYmd(options.end), interval, options.weekStart === 0 ? 0 : 1);
    const out: TimeBucket[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const s = addInterval(last, interval, -i);
        const e = addInterval(s, interval, 1);
        const start = ymd(s);
        const end = ymd(e);
        out.push({
            start,
            end,
            label: bucketLabel(s, interval, options.locale),
            condition: rangeCondition(field, start, end),
        });
    }
    return out;
}

/**
 * Current and previous periods for a score. A number = rolling days ending today (7 → the last 7
 * days incl. today vs the 7 before). An interval = this interval so far vs the same span of the
 * previous one (month → Nov 1–20 vs Oct 1–20).
 */
export function scorePeriods(
    period: number | Interval = 7,
    options: { end?: string; weekStart?: 0 | 1 } = {}
): { current: { start: string; end: string }; previous: { start: string; end: string } } {
    const today = parseYmd(options.end);
    const tomorrow = addInterval(today, 'day', 1);
    if (typeof period === 'number' || /^\d+$/.test(String(period))) {
        const days = Math.max(1, Math.floor(Number(period)));
        const curStart = addInterval(tomorrow, 'day', -days);
        const prevStart = addInterval(curStart, 'day', -days);
        return {
            current: { start: ymd(curStart), end: ymd(tomorrow) },
            previous: { start: ymd(prevStart), end: ymd(curStart) },
        };
    }
    const interval = period as Interval;
    const curStart = startOf(today, interval, options.weekStart === 0 ? 0 : 1);
    const elapsed = Math.round((tomorrow.getTime() - curStart.getTime()) / 86400000);
    const prevStart = addInterval(curStart, interval, -1);
    const prevEnd = addInterval(prevStart, 'day', elapsed);
    return {
        current: { start: ymd(curStart), end: ymd(tomorrow) },
        previous: { start: ymd(prevStart), end: ymd(prevEnd) },
    };
}

/** Days in a score period (for picking the sparkline interval). */
export function periodDays(period: number | Interval = 7): number {
    if (typeof period === 'number' || /^\d+$/.test(String(period))) return Math.max(1, Number(period));
    return { day: 1, week: 7, month: 31, quarter: 92, year: 366 }[period as Interval] || 7;
}
