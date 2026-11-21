// Sample data for components:charts/cron-job-health: job counts, hourly success rate (last 24 hours),
// failed-run split and the next scheduled run.

export type JobState = 'healthy' | 'failing' | 'paused';

export type CronHealthData = {
    jobs: { healthy: number; failing: number; paused: number };
    /** Hourly success rate in percent, oldest first, with the hour label. */
    hourly: { hour: string; rate: number }[];
    runs: { ok: number; total: number };
    slo: number;
    failed: { failed: number; timedOut: number; jobs: number; worst: { name: string; icon: string; count: number } };
    next: {
        in: string;
        at: string;
        runsNextHour: number;
        job: string;
        icon: string;
        status: 'Failing' | 'Healthy' | 'Paused';
        /** Share of the interval already elapsed (0 to 1), and the last run. */
        progress: number;
        last: { at: string; ok: boolean };
    };
};

const RATES = [
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 97.7, 100, 97.7, 100, 100, 100, 100, 97.7, 100, 100, 97.6, 95.6,
    97.7, 86.7,
];

function hours(): { hour: string; rate: number }[] {
    return RATES.map((rate, i) => ({ hour: `${String((15 + i) % 24).padStart(2, '0')}:00 UTC`, rate }));
}

export const SAMPLE: CronHealthData = {
    jobs: { healthy: 24, failing: 3, paused: 5 },
    hourly: hours(),
    runs: { ok: 995, total: 1004 },
    slo: 99.5,
    failed: {
        failed: 7,
        timedOut: 2,
        jobs: 5,
        worst: { name: 'Import bank settlement files', icon: 'database', count: 4 },
    },
    next: {
        in: 'in 5m',
        at: '14:25 UTC',
        runsNextHour: 42,
        job: 'Drain webhook retry queue',
        icon: 'webhook',
        status: 'Failing',
        progress: 0.5,
        last: { at: '14:15', ok: false },
    },
};
