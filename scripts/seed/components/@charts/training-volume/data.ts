// Sample data for components:charts/training-volume (12-week training block vs the last block and the plan).

/** One metric for a week: this block, the last block and the plan (minutes for time, km for distance). */
export type WeekValues = { current: number; last: number; plan: number };

export type TrainingWeek = { week: number; range: string; time: WeekValues; distance: WeekValues };

export const BLOCK_RANGE = 'Jul 7 to Sep 28';

const hm = (h: number, m: number) => h * 60 + m;

export const WEEKS: TrainingWeek[] = [
    {
        week: 1,
        range: 'Jul 7 to 13',
        time: { current: hm(5, 12), last: hm(4, 15), plan: hm(5, 0) },
        distance: { current: 54.0, last: 42.4, plan: 52.2 },
    },
    {
        week: 2,
        range: 'Jul 14 to 20',
        time: { current: hm(5, 34), last: hm(4, 36), plan: hm(5, 30) },
        distance: { current: 58.2, last: 46.2, plan: 57.4 },
    },
    {
        week: 3,
        range: 'Jul 21 to 27',
        time: { current: hm(5, 52), last: hm(5, 56), plan: hm(6, 10) },
        distance: { current: 61.6, last: 59.6, plan: 64.3 },
    },
    {
        week: 4,
        range: 'Jul 28 to Aug 3',
        time: { current: hm(4, 28), last: hm(3, 56), plan: hm(4, 40) },
        distance: { current: 45.7, last: 38.8, plan: 48.7 },
    },
    {
        week: 5,
        range: 'Aug 4 to 10',
        time: { current: hm(6, 26), last: hm(5, 18), plan: hm(6, 15) },
        distance: { current: 67.8, last: 53.5, plan: 65.2 },
    },
    {
        week: 6,
        range: 'Aug 11 to 17',
        time: { current: hm(6, 2), last: hm(6, 11), plan: hm(6, 45) },
        distance: { current: 64.0, last: 62.7, plan: 70.4 },
    },
    {
        week: 7,
        range: 'Aug 18 to 24',
        time: { current: hm(7, 21), last: hm(5, 58), plan: hm(7, 15) },
        distance: { current: 77.1, last: 59.8, plan: 75.7 },
    },
    {
        week: 8,
        range: 'Aug 25 to 31',
        time: { current: hm(5, 22), last: hm(4, 41), plan: hm(5, 15) },
        distance: { current: 55.2, last: 46.4, plan: 54.8 },
    },
    {
        week: 9,
        range: 'Sep 1 to 7',
        time: { current: hm(7, 38), last: hm(6, 17), plan: hm(7, 30) },
        distance: { current: 81.2, last: 63.6, plan: 78.3 },
    },
    {
        week: 10,
        range: 'Sep 8 to 14',
        time: { current: hm(8, 7), last: hm(6, 30), plan: hm(8, 0) },
        distance: { current: 85.6, last: 65.4, plan: 83.5 },
    },
    {
        week: 11,
        range: 'Sep 15 to 21',
        time: { current: hm(5, 51), last: hm(5, 18), plan: hm(6, 15) },
        distance: { current: 62.6, last: 53.9, plan: 65.2 },
    },
    {
        week: 12,
        range: 'Sep 22 to 28',
        time: { current: hm(4, 19), last: hm(4, 28), plan: hm(4, 30) },
        distance: { current: 44.0, last: 43.9, plan: 47.0 },
    },
];
