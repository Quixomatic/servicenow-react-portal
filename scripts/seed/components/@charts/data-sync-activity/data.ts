// Sample data for components:charts/data-sync-activity: 24 hourly buckets (UTC, oldest first; the last one is
// the open hour) with, per source, succeeded / slow / failed runs, rows synced, the top connection by rows
// and the connection that needs attention.

export type SourceHour = {
    s: number;
    slow: number;
    f: number;
    rows: number;
    top?: { name: string; rows: number };
    issue?: { name: string; n: number; kind: string };
};
export type SyncHour = { hour: number } & Record<string, any>;
export type Source = { key: string; label: string; icon: string; connections: number; active: number };

export const SOURCES: Source[] = [
    { key: 'databases', label: 'Databases', icon: 'database', connections: 5, active: 5 },
    { key: 'warehouses', label: 'Warehouses', icon: 'layers', connections: 1, active: 1 },
    { key: 'apps', label: 'Apps', icon: 'blocks', connections: 5, active: 4 },
    { key: 'files', label: 'Files', icon: 'folder', connections: 2, active: 2 },
];

/** Minutes elapsed in the open (last) hour. */
export const OPEN_MINUTES = 20;

export const HOURS: SyncHour[] = [
    {
        hour: 15,
        databases: { s: 22, slow: 0, f: 0, rows: 201700, top: { name: 'risk-feature-store', rows: 96500 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 11, slow: 0, f: 0, rows: 18500, top: { name: 'stripe-live', rows: 12200 } },
        files: { s: 1, slow: 0, f: 0, rows: 11500, top: { name: 'bank-settlement-files', rows: 11500 } },
    },
    {
        hour: 16,
        databases: { s: 22, slow: 0, f: 0, rows: 206000, top: { name: 'risk-feature-store', rows: 101700 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 11, slow: 0, f: 0, rows: 21100, top: { name: 'stripe-live', rows: 14600 } },
        files: { s: 1, slow: 0, f: 0, rows: 11400, top: { name: 'bank-settlement-files', rows: 11400 } },
    },
    {
        hour: 17,
        databases: { s: 22, slow: 0, f: 0, rows: 194600, top: { name: 'risk-feature-store', rows: 93100 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 11, slow: 0, f: 0, rows: 20700, top: { name: 'stripe-live', rows: 14100 } },
        files: { s: 1, slow: 0, f: 0, rows: 11700, top: { name: 'bank-settlement-files', rows: 11700 } },
    },
    {
        hour: 18,
        databases: { s: 22, slow: 0, f: 0, rows: 173740, top: { name: 'risk-feature-store', rows: 78800 } },
        warehouses: { s: 1, slow: 0, f: 0, rows: 1149000, top: { name: 'analytics-warehouse', rows: 1149000 } },
        apps: { s: 11, slow: 0, f: 0, rows: 17540, top: { name: 'stripe-live', rows: 11200 } },
        files: { s: 1, slow: 0, f: 0, rows: 11140, top: { name: 'bank-settlement-files', rows: 11140 } },
    },
    {
        hour: 19,
        databases: { s: 22, slow: 0, f: 0, rows: 180100, top: { name: 'risk-feature-store', rows: 78400 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 12500, top: { name: 'stripe-live', rows: 10800 } },
        files: { s: 1, slow: 0, f: 0, rows: 8100, top: { name: 'bank-settlement-files', rows: 8100 } },
    },
    {
        hour: 20,
        databases: { s: 22, slow: 0, f: 0, rows: 184400, top: { name: 'risk-feature-store', rows: 84200 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 13500, top: { name: 'stripe-live', rows: 12100 } },
        files: { s: 1, slow: 0, f: 0, rows: 7800, top: { name: 'bank-settlement-files', rows: 7800 } },
    },
    {
        hour: 21,
        databases: { s: 22, slow: 0, f: 0, rows: 215000, top: { name: 'risk-feature-store', rows: 111800 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 14300, top: { name: 'stripe-live', rows: 12400 } },
        files: { s: 1, slow: 0, f: 0, rows: 10800, top: { name: 'bank-settlement-files', rows: 10800 } },
    },
    {
        hour: 22,
        databases: { s: 22, slow: 0, f: 0, rows: 176000, top: { name: 'risk-feature-store', rows: 74900 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 12100, top: { name: 'stripe-live', rows: 10500 } },
        files: { s: 0, slow: 0, f: 1, rows: 0, issue: { name: 'bank-settlement-files', n: 1, kind: 'failed' } },
    },
    {
        hour: 23,
        databases: { s: 22, slow: 0, f: 0, rows: 197600, top: { name: 'risk-feature-store', rows: 97900 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 15500, top: { name: 'stripe-live', rows: 14000 } },
        files: { s: 1, slow: 0, f: 0, rows: 11000, top: { name: 'bank-settlement-files', rows: 11000 } },
    },
    {
        hour: 0,
        databases: { s: 22, slow: 0, f: 0, rows: 185900, top: { name: 'risk-feature-store', rows: 80300 } },
        warehouses: { s: 1, slow: 0, f: 0, rows: 908400, top: { name: 'analytics-warehouse', rows: 908400 } },
        apps: { s: 7, slow: 0, f: 0, rows: 17400, top: { name: 'stripe-live', rows: 15700 } },
        files: { s: 1, slow: 0, f: 0, rows: 8400, top: { name: 'bank-settlement-files', rows: 8400 } },
    },
    {
        hour: 1,
        databases: { s: 22, slow: 0, f: 0, rows: 185400, top: { name: 'risk-feature-store', rows: 79700 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 12300, top: { name: 'stripe-live', rows: 10700 } },
        files: { s: 1, slow: 0, f: 0, rows: 11500, top: { name: 'bank-settlement-files', rows: 11500 } },
    },
    {
        hour: 2,
        databases: { s: 22, slow: 0, f: 0, rows: 184000, top: { name: 'risk-feature-store', rows: 83800 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: {
            s: 3,
            slow: 4,
            f: 0,
            rows: 20000,
            issue: { name: 'harbor-github', n: 4, kind: 'slow' },
            top: { name: 'stripe-live', rows: 18900 },
        },
        files: { s: 2, slow: 0, f: 0, rows: 22300, top: { name: 'bank-settlement-files', rows: 12000 } },
    },
    {
        hour: 3,
        databases: { s: 22, slow: 0, f: 0, rows: 199300, top: { name: 'risk-feature-store', rows: 99300 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 14600, top: { name: 'stripe-live', rows: 13100 } },
        files: { s: 1, slow: 0, f: 0, rows: 9500, top: { name: 'bank-settlement-files', rows: 9500 } },
    },
    {
        hour: 4,
        databases: { s: 22, slow: 0, f: 0, rows: 175500, top: { name: 'risk-feature-store', rows: 76500 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 20400, top: { name: 'stripe-live', rows: 18800 } },
        files: { s: 1, slow: 0, f: 0, rows: 9300, top: { name: 'bank-settlement-files', rows: 9300 } },
    },
    {
        hour: 5,
        databases: { s: 22, slow: 0, f: 0, rows: 182000, top: { name: 'risk-feature-store', rows: 87000 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 12500, top: { name: 'stripe-live', rows: 11000 } },
        files: { s: 1, slow: 0, f: 0, rows: 11800, top: { name: 'bank-settlement-files', rows: 11800 } },
    },
    {
        hour: 6,
        databases: { s: 22, slow: 0, f: 0, rows: 184900, top: { name: 'risk-feature-store', rows: 82600 } },
        warehouses: {
            s: 0,
            slow: 1,
            f: 0,
            rows: 555000,
            issue: { name: 'analytics-warehouse', n: 1, kind: 'slow' },
            top: { name: 'analytics-warehouse', rows: 555000 },
        },
        apps: { s: 7, slow: 0, f: 0, rows: 20400, top: { name: 'stripe-live', rows: 18800 } },
        files: { s: 1, slow: 0, f: 0, rows: 10500, top: { name: 'bank-settlement-files', rows: 10500 } },
    },
    {
        hour: 7,
        databases: { s: 22, slow: 0, f: 0, rows: 195000, top: { name: 'risk-feature-store', rows: 91000 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 20400, top: { name: 'stripe-live', rows: 18600 } },
        files: { s: 1, slow: 0, f: 0, rows: 9300, top: { name: 'bank-settlement-files', rows: 9300 } },
    },
    {
        hour: 8,
        databases: { s: 22, slow: 0, f: 0, rows: 188600, top: { name: 'risk-feature-store', rows: 85800 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 17100, top: { name: 'stripe-live', rows: 15500 } },
        files: { s: 1, slow: 0, f: 0, rows: 9100, top: { name: 'bank-settlement-files', rows: 9100 } },
    },
    {
        hour: 9,
        databases: { s: 22, slow: 0, f: 0, rows: 178000, top: { name: 'risk-feature-store', rows: 83400 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 16300, top: { name: 'stripe-live', rows: 14800 } },
        files: { s: 1, slow: 0, f: 0, rows: 11400, top: { name: 'bank-settlement-files', rows: 11400 } },
    },
    {
        hour: 10,
        databases: { s: 22, slow: 0, f: 0, rows: 188600, top: { name: 'risk-feature-store', rows: 90200 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 14400, top: { name: 'stripe-live', rows: 12900 } },
        files: { s: 1, slow: 0, f: 0, rows: 7100, top: { name: 'bank-settlement-files', rows: 7100 } },
    },
    {
        hour: 11,
        databases: { s: 22, slow: 0, f: 0, rows: 183900, top: { name: 'risk-feature-store', rows: 83300 } },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 13200, top: { name: 'stripe-live', rows: 11600 } },
        files: { s: 1, slow: 0, f: 0, rows: 7200, top: { name: 'bank-settlement-files', rows: 7200 } },
    },
    {
        hour: 12,
        databases: { s: 22, slow: 0, f: 0, rows: 201300, top: { name: 'risk-feature-store', rows: 97500 } },
        warehouses: {
            s: 0,
            slow: 1,
            f: 0,
            rows: 532800,
            issue: { name: 'analytics-warehouse', n: 1, kind: 'slow' },
            top: { name: 'analytics-warehouse', rows: 532800 },
        },
        apps: { s: 7, slow: 0, f: 0, rows: 18400, top: { name: 'stripe-live', rows: 16900 } },
        files: { s: 1, slow: 0, f: 0, rows: 7900, top: { name: 'bank-settlement-files', rows: 7900 } },
    },
    {
        hour: 13,
        databases: {
            s: 18,
            slow: 0,
            f: 4,
            rows: 102900,
            issue: { name: 'risk-feature-store', n: 4, kind: 'failed' },
            top: { name: 'rate-limit-cache', rows: 61800 },
        },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 7, slow: 0, f: 0, rows: 20100, top: { name: 'stripe-live', rows: 18400 } },
        files: { s: 1, slow: 0, f: 0, rows: 12300, top: { name: 'bank-settlement-files', rows: 12300 } },
    },
    {
        hour: 14,
        databases: {
            s: 8,
            slow: 0,
            f: 2,
            rows: 43500,
            issue: { name: 'risk-feature-store', n: 2, kind: 'failed' },
            top: { name: 'rate-limit-cache', rows: 21100 },
        },
        warehouses: { s: 0, slow: 0, f: 0, rows: 0 },
        apps: { s: 5, slow: 0, f: 0, rows: 14000, top: { name: 'stripe-live', rows: 13000 } },
        files: { s: 1, slow: 0, f: 0, rows: 11400, top: { name: 'bank-settlement-files', rows: 11400 } },
    },
];
