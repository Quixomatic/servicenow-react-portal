/** Pipeline stages, in order. `gate` stages show in the stage list but not in the 6-segment meter. */
export type StageDef = { key: string; label: string; gate?: boolean };

export const STAGES: StageDef[] = [
    { key: 'build', label: 'Build' },
    { key: 'test', label: 'Test' },
    { key: 'scan', label: 'Security scan' },
    { key: 'canary25', label: 'Canary 25%' },
    { key: 'canary50', label: 'Canary 50%' },
    { key: 'gate', label: 'Promote gate', gate: true },
    { key: 'rollout', label: 'Full rollout' },
];

export type DeployStatus = 'running' | 'succeeded' | 'failed' | 'rolled-back';

/**
 * One pipeline run. Feed records in this shape: `passed` = metered stages passed, `durations` = seconds per metered
 * stage that ran (passed ones, then the failed / running one), `progress` = 0-1 for the running stage.
 */
export type Deploy = {
    id: string;
    service: string;
    env: string;
    version: string;
    at: string;
    status: DeployStatus;
    passed: number;
    durations: number[];
    progress?: number;
};

export type Service = { key: string; icon: string; versions: string[] };

export const SERVICES: Service[] = [
    { key: 'payments-api', icon: 'credit-card', versions: ['v2.41.0', 'v2.41.1', 'v2.42.0'] },
    { key: 'ledger-worker', icon: 'book-open', versions: ['v1.18.4', 'v1.18.5', 'v1.19.0'] },
    { key: 'fraud-scorer', icon: 'shield-check', versions: ['v3.9.0', 'v3.9.1'] },
    { key: 'reconciliation', icon: 'arrow-left-right', versions: ['v2.7.1', 'v2.7.2', 'v2.8.0'] },
    { key: 'search-indexer', icon: 'scan-search', versions: ['v2.3.0', 'v2.3.1', 'v2.3.2'] },
    { key: 'notifications', icon: 'bell', versions: ['v3.5.0', 'v3.5.1'] },
];

export const ENVIRONMENTS = [
    { value: 'production', label: 'Production' },
    { value: 'staging', label: 'Staging' },
];

export const NOW = '2026-09-29T14:19Z';

export const DEPLOYS: Deploy[] = [
    {
        id: 'DEP-4128',
        service: 'fraud-scorer',
        env: 'production',
        version: 'v3.9.0',
        at: '2026-09-29T14:12Z',
        status: 'running',
        passed: 4,
        durations: [48, 96, 32, 150, 90],
        progress: 0.7,
    },
    {
        id: 'DEP-4127',
        service: 'payments-api',
        env: 'production',
        version: 'v2.41.0',
        at: '2026-09-29T13:51Z',
        status: 'succeeded',
        passed: 6,
        durations: [52, 104, 35, 160, 155, 210],
    },
    {
        id: 'DEP-4125',
        service: 'reconciliation',
        env: 'production',
        version: 'v2.7.1',
        at: '2026-09-29T10:38Z',
        status: 'rolled-back',
        passed: 3,
        durations: [44, 88, 30, 95],
    },
    {
        id: 'DEP-4124',
        service: 'ledger-worker',
        env: 'staging',
        version: 'v1.18.4',
        at: '2026-09-29T10:02Z',
        status: 'failed',
        passed: 3,
        durations: [61, 120, 41, 72],
    },
    {
        id: 'DEP-4112',
        service: 'notifications',
        env: 'staging',
        version: 'v3.5.0',
        at: '2026-09-28T21:05Z',
        status: 'failed',
        passed: 1,
        durations: [39, 64],
    },
    {
        id: 'DEP-4108',
        service: 'search-indexer',
        env: 'production',
        version: 'v2.3.0',
        at: '2026-09-28T18:07Z',
        status: 'succeeded',
        passed: 6,
        durations: [47, 92, 29, 145, 150, 190],
    },
];
