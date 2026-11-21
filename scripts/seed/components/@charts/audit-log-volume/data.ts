/**
 * Sample data for components:charts/audit-log-volume: audit events per bucket (success / denied / failed) for
 * four time ranges, the actors (people and service accounts), the event categories, and the denials still
 * awaiting review. Bucket outcome totals are given; each bucket's events are spread over categories and
 * actors with a seeded generator (denials land on Secrets / Access, failures on Deploys / Config / Infra).
 */

export type Outcome = 'success' | 'denied' | 'failed';
export type AuditCategory = { key: string; label: string; icon: string; weight: number };
export type AuditActor = { key: string; name: string; kind: 'person' | 'service'; weight: number };
export type AuditRange = {
    key: string;
    label: string;
    /** Menu note and header subtitle, e.g. "6-hour buckets". */
    buckets: string;
    /** Range length and bucket size, minutes. */
    spanMin: number;
    sizeMin: number;
    /** "7d" in "vs prior 7d". */
    short: string;
    /** Event total of the prior range (null: nothing to compare). */
    prior: number | null;
    /** [success, denied, failed] per bucket, oldest first. */
    counts: [number, number, number][];
    /** Bucket index of each denial awaiting review. */
    reviews: number[];
};

/** The end of every range (UTC). */
export const NOW = '2026-09-29T14:20:00Z';

export const CATEGORIES: AuditCategory[] = [
    { key: 'deploys', label: 'Deploys', icon: 'rocket', weight: 0.24 },
    { key: 'config', label: 'Config', icon: 'settings-2', weight: 0.24 },
    { key: 'secrets', label: 'Secrets', icon: 'key-round', weight: 0.14 },
    { key: 'access', label: 'Access', icon: 'shield', weight: 0.2 },
    { key: 'infra', label: 'Infra', icon: 'server', weight: 0.18 },
];

export const ACTORS: AuditActor[] = [
    { key: 'mrodriguez', name: 'Michael Rodriguez', kind: 'person', weight: 0.1272 },
    { key: 'sromero', name: 'Sofia Romero', kind: 'person', weight: 0.12 },
    { key: 'schen', name: 'Sarah Chen', kind: 'person', weight: 0.09 },
    { key: 'nsantos', name: 'Nina Santos', kind: 'person', weight: 0.08 },
    { key: 'dkim', name: 'David Kim', kind: 'person', weight: 0.07 },
    { key: 'ewilson', name: 'Emma Wilson', kind: 'person', weight: 0.06 },
    { key: 'lmartin', name: 'Lucas Martin', kind: 'person', weight: 0.05 },
    { key: 'abello', name: 'Aisha Bello', kind: 'person', weight: 0.05 },
    { key: 'tbecker', name: 'Tom Becker', kind: 'person', weight: 0.04 },
    { key: 'gha', name: 'GitHub Actions', kind: 'service', weight: 0.09 },
    { key: 'vercel', name: 'Vercel', kind: 'service', weight: 0.08 },
    { key: 'terraform', name: 'Terraform Cloud', kind: 'service', weight: 0.05 },
    { key: 'n8n', name: 'n8n', kind: 'service', weight: 0.04 },
    { key: 'datadog', name: 'Datadog', kind: 'service', weight: 0.04 },
];

export const RANGES: AuditRange[] = [
    {
        key: '1h',
        label: '1 Hour',
        buckets: '5-minute buckets',
        spanMin: 60,
        sizeMin: 5,
        short: '1h',
        prior: 11,
        counts: [
            [2, 0, 0],
            [1, 0, 0],
            [2, 0, 0],
            [2, 0, 0],
            [1, 0, 0],
            [1, 0, 1],
            [3, 0, 0],
            [2, 1, 0],
            [1, 0, 0],
            [4, 1, 0],
            [1, 0, 0],
            [3, 0, 0],
        ],
        reviews: [7, 9],
    },
    {
        key: '24h',
        label: '24 Hours',
        buckets: 'Hourly buckets',
        spanMin: 24 * 60,
        sizeMin: 60,
        short: '24h',
        prior: 161,
        counts: [
            [6, 1, 0],
            [10, 0, 1],
            [10, 0, 1],
            [9, 1, 1],
            [10, 1, 0],
            [7, 1, 1],
            [7, 0, 1],
            [8, 0, 0],
            [7, 0, 0],
            [4, 1, 0],
            [5, 0, 0],
            [3, 0, 0],
            [4, 0, 1],
            [4, 0, 0],
            [4, 0, 1],
            [4, 1, 0],
            [6, 0, 0],
            [6, 1, 2],
            [7, 1, 1],
            [10, 1, 0],
            [11, 0, 1],
            [9, 1, 0],
            [11, 0, 1],
            [18, 1, 1],
            [9, 1, 0],
        ],
        reviews: [0, 9, 18, 21, 23, 24],
    },
    {
        key: '7d',
        label: '7 Days',
        buckets: '6-hour buckets',
        spanMin: 7 * 24 * 60,
        sizeMin: 6 * 60,
        short: '7d',
        prior: 1360,
        counts: [
            [46, 2, 3],
            [50, 4, 5],
            [31, 2, 2],
            [63, 3, 5],
            [71, 4, 5],
            [52, 4, 2],
            [30, 1, 3],
            [61, 3, 4],
            [69, 4, 4],
            [47, 3, 5],
            [30, 2, 1],
            [57, 3, 5],
            [66, 4, 5],
            [47, 3, 3],
            [15, 0, 2],
            [29, 3, 2],
            [37, 1, 2],
            [22, 2, 3],
            [16, 1, 0],
            [31, 1, 1],
            [32, 2, 4],
            [24, 1, 1],
            [25, 2, 2],
            [52, 2, 3],
            [57, 4, 5],
            [43, 3, 2],
            [24, 1, 2],
            [49, 4, 4],
            [38, 2, 2],
        ],
        reviews: [22, 23, 24, 25, 25, 27, 28, 28],
    },
    {
        key: '30d',
        label: '30 Days',
        buckets: 'Daily buckets',
        spanMin: 30 * 24 * 60,
        sizeMin: 24 * 60,
        short: '30d',
        prior: null,
        counts: [
            [58, 4, 4],
            [235, 14, 18],
            [230, 12, 15],
            [219, 13, 17],
            [212, 12, 15],
            [203, 12, 14],
            [107, 6, 9],
            [103, 7, 7],
            [181, 9, 12],
            [171, 10, 12],
            [161, 10, 13],
            [240, 13, 16],
            [229, 14, 17],
            [121, 7, 10],
            [117, 7, 8],
            [206, 11, 15],
            [200, 11, 13],
            [188, 11, 15],
            [180, 11, 13],
            [173, 10, 12],
            [92, 5, 6],
            [131, 8, 10],
            [231, 13, 18],
            [224, 13, 16],
            [217, 13, 14],
            [207, 11, 16],
            [200, 12, 14],
            [103, 6, 9],
            [103, 5, 6],
            [177, 11, 12],
            [111, 7, 8],
        ],
        reviews: [29, 29, 29, 29, 29, 30, 30, 30],
    },
];
