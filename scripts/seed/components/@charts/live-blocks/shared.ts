// Shared pieces for the live-data adapters in components:charts/live-blocks.
import { ymd, parseYmd, addInterval } from 'utilities:charts/analytics';

/** A group (raw field value) shown as a series, with its Tailwind palette colours. */
export type LiveGroup = { value: string; label: string; light: string; dark: string };

/** Incident priorities 1 to 4 (raw values of incident.priority). */
export const PRIORITY_GROUPS: LiveGroup[] = [
    { value: '1', label: 'Critical', light: 'red-400', dark: 'red-300' },
    { value: '2', label: 'High', light: 'amber-400', dark: 'amber-300' },
    { value: '3', label: 'Moderate', light: 'sky-400', dark: 'sky-300' },
    { value: '4', label: 'Low', light: 'violet-400', dark: 'violet-300' },
];

/** A safe series key for a raw group value ('1' → 'g_1'): used as a dataKey and a --color-<key> name. */
export function groupKey(value: string): string {
    return `g_${String(value || 'empty').replace(/[^a-z0-9]/gi, '_')}`;
}

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

/** 'YYYY-MM-DD' → 'Nov 20'. */
export const shortDay = (date: string) => SHORT.format(parseYmd(date));
/** 'YYYY-MM-DD' → 'Fri'. */
export const weekday = (date: string) => WEEKDAY.format(parseYmd(date));

/** Today plus n days, as 'YYYY-MM-DD'. */
export function dayOffset(n: number): string {
    return ymd(addInterval(parseYmd(), 'day', n));
}

/** Today's date, part of query keys so buckets roll over at midnight. */
export const todayKey = () => ymd(new Date());

/** Percent change, two decimals (0 when there is no previous value). */
export function change(cur: number, prev: number): number {
    return prev ? Math.round(((cur - prev) / prev) * 10000) / 100 : 0;
}
