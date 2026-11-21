// Sample data for components:charts/connection-health: connection and dataset states now, rows synced per
// day and failed sync runs per day (with the failing sources) over the last 14 days.

export type SyncDay = {
    /** Short weekday + date label, e.g. "Wed, Sep 16". */
    label: string;
    /** Date only, e.g. "Sep 16" (used in "vs Sep 16"). */
    date: string;
    rows: number;
    /** Failed runs by source. */
    failures: { source: string; count: number }[];
};

export type ConnectionHealthData = {
    connections: { healthy: number; degraded: number; failing: number; paused: number };
    healthyYesterday: number;
    datasets: { inSync: number; drifted: number; unlinked: number };
    linkedLastWeek: number;
    /** Oldest first; the last day is today. */
    days: SyncDay[];
};

const WEEKDAYS = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];

const ROWS = [
    7120000, 7480000, 6910000, 7830000, 8240000, 6380000, 6090000, 7710000, 8020000, 7940000, 8310000, 7560000, 8060000,
    8417609,
];

const FAILURES: Record<number, [string, number][]> = {
    1: [['risk-feature-store', 1]],
    4: [
        ['risk-feature-store', 1],
        ['bank-settlement-files', 1],
    ],
    5: [['analytics-warehouse', 1]],
    7: [['stripe-live', 1]],
    9: [
        ['risk-feature-store', 2],
        ['finance-close-sheets', 1],
    ],
    10: [
        ['risk-feature-store', 1],
        ['analytics-warehouse', 1],
    ],
    12: [
        ['risk-feature-store', 1],
        ['bank-settlement-files', 1],
    ],
    13: [
        ['risk-feature-store', 6],
        ['bank-settlement-files', 1],
    ],
};

export const SAMPLE: ConnectionHealthData = {
    connections: { healthy: 10, degraded: 1, failing: 1, paused: 1 },
    healthyYesterday: 12,
    datasets: { inSync: 32, drifted: 1, unlinked: 16 },
    linkedLastWeek: 31,
    days: ROWS.map((rows, i) => ({
        label: `${WEEKDAYS[i % 7]}, Sep ${16 + i}`,
        date: `Sep ${16 + i}`,
        rows,
        failures: (FAILURES[i] || []).map(([source, count]) => ({ source, count })),
    })),
};
