// Sample data for components:charts/sync-run-history: one connection's last 24 hourly buckets (UTC, oldest
// first, the last one open) and its most recent runs.

export type RunHour = {
    hour: number;
    s?: number;
    p?: number;
    f?: number;
    rows?: number;
    partialRows?: number;
    vsYesterday?: number | null;
    p50?: number;
    max?: number;
    open?: boolean;
    paused?: string;
    issue?: { code: string; runs: number; message: string };
};

export type Run = {
    id: string;
    status: 'succeeded' | 'partial' | 'failed' | 'running';
    trigger: 'Scheduled' | 'Manual';
    /** Minutes before now. */
    ago: number;
    started: string;
    rows?: number;
    seconds: number;
    issue?: { code: string; message: string };
};

export const CONNECTION = {
    name: 'bank-settlement-files',
    id: 'CON-4821',
    source: 'Google Drive API v3',
    env: 'Production',
    every: 'every 15 min',
    icon: 'folder-sync',
    now: '14:20',
    nextSync: '14:32',
    freshnessSlo: '30m',
    p50: 33,
    priorSuccessRate: 94.5,
};

// Hourly rows: the observed (100-rounded) values less 13 each, so the 24h total reads 189.1K as in ReUI.
export const HOURS: RunHour[] = [
    {
        hour: 15,
        s: 4,
        p: 0,
        f: 0,
        rows: 15087,
        vsYesterday: null,
        p50: 54,
        max: 55,
    },
    {
        hour: 16,
        s: 4,
        p: 0,
        f: 0,
        rows: 12587,
        vsYesterday: -5,
        p50: 45,
        max: 49,
    },
    {
        hour: 17,
        s: 4,
        p: 0,
        f: 0,
        rows: 11787,
        vsYesterday: null,
        p50: 45,
        max: 47,
    },
    { hour: 18, s: 4, p: 0, f: 0, rows: 9487, vsYesterday: 3, p50: 39, max: 42 },
    {
        hour: 19,
        s: 4,
        p: 0,
        f: 0,
        rows: 7487,
        vsYesterday: -17,
        p50: 32,
        max: 33,
    },
    {
        hour: 20,
        s: 4,
        p: 0,
        f: 0,
        rows: 7387,
        vsYesterday: null,
        p50: 32,
        max: 35,
    },
    {
        hour: 21,
        s: 2,
        p: 0,
        f: 2,
        rows: 2987,
        vsYesterday: -34,
        p50: 16,
        max: 27,
        issue: {
            code: 'E_SCHEMA_HEADER',
            runs: 2,
            message: 'Header row missing in BARC_2100.csv. Recovered at 21:32.',
        },
    },
    { hour: 22, s: 4, p: 0, f: 0, rows: 5087, vsYesterday: -2, p50: 25, max: 26 },
    { hour: 23, s: 4, p: 0, f: 0, rows: 4587, vsYesterday: -4, p50: 26, max: 26 },
    { hour: 0, s: 4, p: 0, f: 0, rows: 3987, vsYesterday: 31, p50: 24, max: 26 },
    { hour: 1, s: 4, p: 0, f: 0, rows: 3887, vsYesterday: 6, p50: 24, max: 25 },
    {
        hour: 2,
        paused: 'Nightly maintenance window, so no scheduled sync started.',
    },
    { hour: 3, s: 4, p: 0, f: 0, rows: 3687, vsYesterday: 15, p50: 22, max: 23 },
    {
        hour: 4,
        s: 4,
        p: 0,
        f: 0,
        rows: 3687,
        vsYesterday: null,
        p50: 23,
        max: 24,
    },
    { hour: 5, s: 4, p: 0, f: 0, rows: 4987, vsYesterday: -6, p50: 26, max: 28 },
    { hour: 6, s: 4, p: 0, f: 0, rows: 6387, vsYesterday: -8, p50: 30, max: 32 },
    { hour: 7, s: 4, p: 0, f: 0, rows: 8187, vsYesterday: -2, p50: 32, max: 36 },
    {
        hour: 8,
        s: 2,
        p: 2,
        f: 0,
        rows: 9187,
        partialRows: 3300,
        vsYesterday: 66,
        p50: 59,
        max: 77,
        issue: {
            code: 'W_RATE_LIMIT',
            runs: 2,
            message: 'HTTP 429, 3 files deferred.',
        },
    },
    { hour: 9, s: 4, p: 0, f: 0, rows: 12387, vsYesterday: 9, p50: 46, max: 52 },
    {
        hour: 10,
        s: 4,
        p: 0,
        f: 0,
        rows: 13987,
        vsYesterday: null,
        p50: 54,
        max: 57,
    },
    {
        hour: 11,
        s: 4,
        p: 0,
        f: 0,
        rows: 11587,
        vsYesterday: -8,
        p50: 45,
        max: 47,
    },
    {
        hour: 12,
        s: 4,
        p: 0,
        f: 0,
        rows: 11787,
        vsYesterday: 20,
        p50: 46,
        max: 48,
    },
    {
        hour: 13,
        s: 4,
        p: 1,
        f: 1,
        rows: 12287,
        partialRows: 1800,
        vsYesterday: 5,
        p50: 50,
        max: 120,
        issue: {
            code: 'E_LIST_TIMEOUT',
            runs: 1,
            message: 'Folder listing timed out after 120s. Recovered at 13:24.',
        },
    },
    {
        hour: 14,
        s: 2,
        p: 0,
        f: 0,
        rows: 6587,
        vsYesterday: null,
        open: true,
        p50: 51,
        max: 55,
    },
];

export const RUNS: Run[] = [
    {
        id: 'RUN-48303',
        status: 'succeeded',
        trigger: 'Scheduled',
        ago: 2,
        started: '14:17:15',
        rows: 2886,
        seconds: 47,
    },
    {
        id: 'RUN-48302',
        status: 'succeeded',
        trigger: 'Scheduled',
        ago: 17,
        started: '14:02:11',
        rows: 3745,
        seconds: 55,
    },
    {
        id: 'RUN-48301',
        status: 'succeeded',
        trigger: 'Manual',
        ago: 24,
        started: '13:55:40',
        rows: 1210,
        seconds: 27,
    },
    {
        id: 'RUN-48300',
        status: 'partial',
        trigger: 'Scheduled',
        ago: 32,
        started: '13:47:09',
        rows: 1788,
        seconds: 76,
        issue: { code: 'W_RATE_LIMIT', message: 'HTTP 429, 3 files deferred' },
    },
    {
        id: 'RUN-48299',
        status: 'succeeded',
        trigger: 'Scheduled',
        ago: 47,
        started: '13:32:12',
        rows: 3309,
        seconds: 49,
    },
    {
        id: 'RUN-48298',
        status: 'succeeded',
        trigger: 'Scheduled',
        ago: 62,
        started: '13:17:08',
        rows: 3012,
        seconds: 51,
    },
    {
        id: 'RUN-48297',
        status: 'failed',
        trigger: 'Scheduled',
        ago: 64,
        started: '13:15:02',
        seconds: 120,
        issue: {
            code: 'E_LIST_TIMEOUT',
            message: 'Folder listing timed out after 120s',
        },
    },
    {
        id: 'RUN-48278',
        status: 'partial',
        trigger: 'Scheduled',
        ago: 300,
        started: '09:20:14',
        rows: 1484,
        seconds: 70,
        issue: { code: 'W_RATE_LIMIT', message: 'HTTP 429, 3 files deferred' },
    },
    {
        id: 'RUN-48277',
        status: 'partial',
        trigger: 'Scheduled',
        ago: 360,
        started: '08:20:06',
        rows: 1823,
        seconds: 77,
        issue: { code: 'W_RATE_LIMIT', message: 'HTTP 429, 3 files deferred' },
    },
    {
        id: 'RUN-48237',
        status: 'failed',
        trigger: 'Scheduled',
        ago: 1020,
        started: '21:20:03',
        seconds: 7,
        issue: {
            code: 'E_SCHEMA_HEADER',
            message: 'Header row missing in BARC_2100.csv',
        },
    },
];
