// Sample data for components:charts/campaign-impressions: impressions per 3-day bucket and channel, with
// the prior period's total per bucket. Values in thousands of impressions.

export type ImpressionBucket = {
    start: string;
    end: string;
    days: number;
    prior: number;
    [channel: string]: string | number;
};

export type Channel = { key: string; label: string; light: string; dark: string };

export const CHANNELS: Channel[] = [
    { key: 'search', label: 'Search', light: 'sky-400', dark: 'sky-300' },
    { key: 'social', label: 'Social', light: 'violet-400', dark: 'violet-300' },
    { key: 'display', label: 'Display', light: 'pink-400', dark: 'pink-300' },
    { key: 'video', label: 'Video', light: 'amber-400', dark: 'amber-300' },
];

const K = 1000;

function row(start: string, end: string, days: number, s: number, so: number, d: number, v: number, prior: number) {
    return { start, end, days, search: s * K, social: so * K, display: d * K, video: v * K, prior: prior * K };
}

export const LAST_30_DAYS: ImpressionBucket[] = [
    row('Sep 12', 'Sep 14', 3, 364, 487, 224, 174, 1179.4),
    row('Sep 15', 'Sep 17', 3, 458, 478, 261, 175, 1194.1),
    row('Sep 18', 'Sep 20', 3, 375, 530, 239, 191, 1228.1),
    row('Sep 21', 'Sep 23', 3, 489, 558, 288, 188, 1160.0),
    row('Sep 24', 'Sep 26', 3, 427, 579, 266, 205, 1254.9),
    row('Sep 27', 'Sep 29', 3, 445, 529, 270, 188, 1185.4),
    row('Sep 30', 'Oct 2', 3, 457, 571, 265, 204, 1282.8),
    row('Oct 3', 'Oct 5', 3, 405, 598, 243, 208, 1247.0),
    row('Oct 6', 'Oct 8', 3, 501, 574, 279, 189, 1253.5),
    row('Oct 9', 'Oct 11', 3, 400, 580, 243, 201, 1328.4),
];

export const LAST_7_DAYS: ImpressionBucket[] = [
    row('Oct 5', 'Oct 5', 1, 139, 198, 82, 70, 410.5),
    row('Oct 6', 'Oct 6', 1, 162, 189, 91, 61, 421.0),
    row('Oct 7', 'Oct 7', 1, 171, 194, 95, 64, 418.2),
    row('Oct 8', 'Oct 8', 1, 168, 191, 93, 64, 414.3),
    row('Oct 9', 'Oct 9', 1, 128, 189, 80, 66, 441.0),
    row('Oct 10', 'Oct 10', 1, 137, 196, 82, 68, 446.9),
    row('Oct 11', 'Oct 11', 1, 135, 195, 81, 67, 440.5),
];

export const LAST_90_DAYS: ImpressionBucket[] = [
    row('Jul 14', 'Jul 22', 9, 1012, 1361, 655, 498, 3290.0),
    row('Jul 23', 'Jul 31', 9, 1105, 1402, 690, 512, 3405.2),
    row('Aug 1', 'Aug 9', 9, 1088, 1455, 702, 530, 3468.4),
    row('Aug 10', 'Aug 18', 9, 1174, 1490, 731, 541, 3502.9),
    row('Aug 19', 'Aug 27', 9, 1150, 1528, 744, 552, 3611.0),
    row('Aug 28', 'Sep 5', 9, 1210, 1563, 762, 560, 3640.7),
    row('Sep 6', 'Sep 14', 9, 1198, 1499, 726, 548, 3585.3),
    row('Sep 15', 'Sep 23', 9, 1322, 1566, 788, 554, 3582.2),
    row('Sep 24', 'Oct 2', 9, 1329, 1679, 801, 597, 3723.1),
    row('Oct 3', 'Oct 11', 9, 1306, 1752, 765, 598, 3828.9),
];

export const PERIODS: Record<string, { label: string; days: number; data: ImpressionBucket[]; range: string }> = {
    '7d': { label: 'Last 7 days', days: 7, data: LAST_7_DAYS, range: 'Oct 5 to Oct 11 vs Sep 28 to Oct 4' },
    '30d': { label: 'Last 30 days', days: 30, data: LAST_30_DAYS, range: 'Sep 12 to Oct 11 vs Aug 13 to Sep 11' },
    '90d': { label: 'Last 90 days', days: 90, data: LAST_90_DAYS, range: 'Jul 14 to Oct 11 vs Apr 15 to Jul 13' },
};
