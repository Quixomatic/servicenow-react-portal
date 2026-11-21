// Sample data for components:charts/cron-run-durations (the last 20 runs of an hourly job).

export type RunStatus = 'succeeded' | 'failed' | 'timedOut' | 'skipped' | 'running';

/** Phase durations in seconds. */
export type CronRun = {
    id: string;
    /** "Oct 12, 14:00 UTC"; hour / day drive the axis labels. */
    started: string;
    hour: number;
    day: string;
    status: RunStatus;
    queue: number;
    execute: number;
    teardown: number;
    outlier?: boolean;
    release: string;
};

export type Job = {
    name: string;
    schedule: string;
    timeout: number;
    queue: string;
};

export const JOB: Job = {
    name: 'Refresh fraud model features',
    schedule: 'Hourly at :00 UTC',
    timeout: 900,
    queue: 'fraud-batch',
};

/** A release that went out between two runs (drawn before the run with this id). */
export const DEPLOYS = [{ before: 'RUN-58408', label: 'v2.14.0' }];

const s = (m: number, sec: number) => m * 60 + sec;

function run(
    n: number,
    day: string,
    hour: number,
    status: RunStatus,
    queue: number,
    execute: number,
    teardown: number,
    outlier = false
): CronRun {
    const hh = hour < 10 ? `0${hour}` : `${hour}`;
    return {
        id: `RUN-${n}`,
        started: `${day}, ${hh}:00 UTC`,
        hour,
        day,
        status,
        queue,
        execute,
        teardown,
        outlier,
        release: n >= 58408 ? 'v2.14.0' : 'v2.13.4',
    };
}

export const RUNS: CronRun[] = [
    run(58399, 'Oct 12', 14, 'succeeded', 58, s(6, 2), 36),
    run(58400, 'Oct 12', 15, 'succeeded', 68, s(6, 29), 39),
    run(58401, 'Oct 12', 16, 'succeeded', 42, s(5, 59), 44),
    run(58402, 'Oct 12', 17, 'succeeded', 48, s(6, 31), 45),
    run(58403, 'Oct 12', 18, 'succeeded', 46, s(6, 13), 40),
    run(58404, 'Oct 12', 19, 'succeeded', 63, s(6, 18), 37),
    run(58405, 'Oct 12', 20, 'succeeded', 48, s(5, 43), 38),
    run(58406, 'Oct 12', 21, 'succeeded', 55, s(6, 22), 47),
    run(58407, 'Oct 12', 22, 'succeeded', 54, s(6, 29), 49),
    run(58408, 'Oct 12', 23, 'succeeded', 35, s(7, 2), 41),
    run(58409, 'Oct 13', 0, 'succeeded', 52, s(7, 14), 37),
    run(58410, 'Oct 13', 1, 'succeeded', s(3, 16), s(7, 15), 51, true),
    run(58411, 'Oct 13', 2, 'succeeded', 51, s(7, 14), 38),
    run(58412, 'Oct 13', 3, 'succeeded', 60, s(7, 14), 48),
    run(58413, 'Oct 13', 4, 'timedOut', 31, s(14, 29), 0, true),
    run(58414, 'Oct 13', 5, 'succeeded', 43, s(7, 38), 47),
    run(58415, 'Oct 13', 6, 'succeeded', 49, s(6, 59), 52),
    run(58416, 'Oct 13', 7, 'succeeded', 53, s(7, 1), 41),
    run(58417, 'Oct 13', 8, 'succeeded', 59, s(6, 43), 44),
    run(58418, 'Oct 13', 9, 'succeeded', 40, s(6, 40), 41),
];

/** The 20 runs before RUN-58399 (for the KPI deltas and the grey half of the sparklines). */
const PREV_TOTALS = [
    452, 466, 440, 470, 455, 481, 430, 463, 468, 445, 478, 461, 450, 490, 435, 472, 448, 458, 475, 444,
];
const PREV_STATUS: Record<number, RunStatus> = {
    4: 'failed',
    11: 'failed',
    16: 'skipped',
};

export const PREVIOUS: CronRun[] = PREV_TOTALS.map((t, i) => {
    const hour = (i + 18) % 24;
    const status = PREV_STATUS[i] || 'succeeded';
    const queue = 45 + ((i * 7) % 20);
    const teardown = 36 + ((i * 5) % 12);
    return run(58379 + i, i < 6 ? 'Oct 11' : 'Oct 12', hour, status, queue, t - queue - teardown, teardown);
});
