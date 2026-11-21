// Sample data for components:charts/canary-rollback: a canary of search-indexer v2.3.2 against v2.3.1, sampled
// every 10 seconds until it breached the latency limit and was rolled back. Per percentile: the limit and one
// [canary ms, baseline ms] pair per sample.

export type Percentile = { key: string; label: string; limit: number; points: [number, number][] };

export const PERCENTILES: Percentile[] = [
    {
        key: 'p50',
        label: 'p50',
        limit: 80,
        points: [
            [45, 43],
            [44, 44],
            [46, 45],
            [52, 46],
            [58.05, 42.55],
            [66, 44],
            [74, 45],
            [83, 46],
            [87.05, 42.55],
            [97, 44],
            [104, 45],
            [111.55, 46.1],
            [119.05, 42.55],
        ],
    },
    {
        key: 'p95',
        label: 'p95',
        limit: 120,
        points: [
            [75, 71],
            [73, 73],
            [77, 75],
            [88, 77],
            [99, 71],
            [113, 73],
            [128, 75],
            [144, 77],
            [152, 71],
            [169, 73],
            [183, 75],
            [196, 77],
            [210, 71],
        ],
    },
    {
        key: 'p99',
        label: 'p99',
        limit: 160,
        points: [
            [111, 105],
            [108, 108],
            [115, 111],
            [133, 114],
            [152, 105],
            [176, 108],
            [201, 111],
            [229, 114],
            [242, 105],
            [271, 108],
            [295, 111],
            [317, 114],
            [341, 105],
        ],
    },
];

/** Rollout stages by first sample index (the track above the plot). */
export type Stage = { label: string; from: number };
export const STAGES: Stage[] = [{ label: 'Canary 25%', from: 0 }];

export const DEPLOY = {
    service: 'search-indexer',
    candidate: 'v2.3.2',
    baseline: 'v2.3.1',
    id: 'DEP-4116',
    env: 'prod-us-east-1',
    /** Seconds between samples. */
    interval: 10,
    outcome: 'Rolled back',
    at: 'Oct 14, 14:32 UTC',
};
