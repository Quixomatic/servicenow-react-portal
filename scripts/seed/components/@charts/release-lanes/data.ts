// Sample data for components:charts/release-lanes (three environments promoting releases left to right).

export type LaneService = { key: string; icon: string };

/** Release metadata shown on a lane's deploy card once a version is promoted there. */
export type Release = {
    service: string;
    version: string;
    commit: string;
    message: string;
    author: string;
    avatar?: string;
};

/** One metered pipeline stage; `gate` holds the run before this stage until someone approves it. */
export type LaneStage = {
    label: string;
    seconds: number;
    gate?: { title: string; action: string; checks: number; done: string };
};

export type LaneDeployStatus = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed';

export type LaneDeploy = Release & {
    from: string;
    status: LaneDeployStatus;
    /** Stages passed so far (index of the current stage). */
    stage: number;
    /** Progress through the current stage, 0-1. */
    progress?: number;
    startedAt: string | number;
    waitingSince?: string | number;
};

export type Lane = {
    key: string;
    label: string;
    hosts: string[];
    trigger?: string;
    frozen?: boolean;
    stages: LaneStage[];
    /** Deployed version per service key. */
    versions: Record<string, string>;
    /** Latest failed version per service key (shown as a destructive badge). */
    failed?: Record<string, string>;
    deploy?: LaneDeploy;
    queue?: LaneDeploy[];
};

export const NOW = '2026-09-29T14:20:00Z';
const at = (secondsAgo: number) => new Date(new Date(NOW).getTime() - secondsAgo * 1000).toISOString();

export const SERVICES: LaneService[] = [
    { key: 'payments-api', icon: 'banknote' },
    { key: 'ledger-worker', icon: 'database' },
    { key: 'webhook-dispatcher', icon: 'webhook' },
    { key: 'fraud-scorer', icon: 'shield-check' },
    { key: 'payouts-scheduler', icon: 'wallet' },
    { key: 'reconciliation', icon: 'list-checks' },
    { key: 'search-indexer', icon: 'search' },
    { key: 'notifications', icon: 'bell' },
];

export const RELEASES: Release[] = [
    {
        service: 'webhook-dispatcher',
        version: 'v1.27.0',
        commit: '7c3e8b1',
        message: 'Sign deliveries with the rotated whsec key',
        author: 'Omar Haddad',
    },
    {
        service: 'reconciliation',
        version: 'v2.7.1',
        commit: 'f2a6c84',
        message: 'Parse CAMT.053 statements from EU banks',
        author: 'Sofia Romero',
    },
    {
        service: 'fraud-scorer',
        version: 'v3.9.0',
        commit: 'd4a7c19',
        message: 'Serve fs-v7 features from the online store',
        author: 'Kenji Tan',
    },
    {
        service: 'payouts-scheduler',
        version: 'v4.12.1',
        commit: '91b0d3e',
        message: 'Batch SEPA payouts by cutoff window',
        author: 'Lena Fischer',
    },
    {
        service: 'search-indexer',
        version: 'v2.3.2',
        commit: '5e8f2a7',
        message: 'Reindex merchants on category change',
        author: 'Priya Nair',
    },
];

const PIPELINE: LaneStage[] = [
    { label: 'Build', seconds: 60 },
    { label: 'Test', seconds: 100 },
    { label: 'Security scan', seconds: 30 },
    { label: 'Wave 1', seconds: 36 },
    { label: 'Wave 2', seconds: 40 },
    { label: 'Wave 3', seconds: 40 },
];

const PROD_PIPELINE: LaneStage[] = [
    { label: 'Build', seconds: 60 },
    { label: 'Test', seconds: 100 },
    { label: 'Security scan', seconds: 30 },
    { label: 'Canary 10%', seconds: 120 },
    { label: 'Canary 50%', seconds: 180 },
    {
        label: 'Full rollout',
        seconds: 120,
        gate: { title: 'Promote Canary?', action: 'Promote', checks: 4, done: 'Canary promoted' },
    },
];

export const LANES: Lane[] = [
    {
        key: 'staging',
        label: 'Staging',
        hosts: ['staging-us-east-1'],
        trigger: 'On merge',
        stages: PIPELINE,
        versions: {
            'payments-api': 'v2.41.0',
            'ledger-worker': 'v1.18.3',
            'webhook-dispatcher': 'v1.27.0',
            'fraud-scorer': 'v3.9.0',
            'payouts-scheduler': 'v4.12.1',
            reconciliation: 'v2.7.1',
            'search-indexer': 'v2.3.2',
            notifications: 'v3.4.0',
        },
        failed: { 'ledger-worker': 'v1.18.4', notifications: 'v3.5.0' },
        deploy: { ...RELEASES[0], from: 'v1.26.2', status: 'succeeded', stage: 6, startedAt: at(3600) },
    },
    {
        key: 'sandbox',
        label: 'Sandbox',
        hosts: ['staging-us-east-1'],
        trigger: 'Partner testing',
        stages: PIPELINE,
        versions: {
            'payments-api': 'v2.41.0',
            'ledger-worker': 'v1.18.3',
            'webhook-dispatcher': 'v1.26.2',
            'fraud-scorer': 'v3.9.0',
            'payouts-scheduler': 'v4.12.1',
            reconciliation: 'v2.7.1',
            'search-indexer': 'v2.3.2',
            notifications: 'v3.4.0',
        },
        deploy: { ...RELEASES[1], from: 'v2.7.0', status: 'succeeded', stage: 6, startedAt: at(14400) },
    },
    {
        key: 'production',
        label: 'Production',
        hosts: ['prod-us-east-1', 'prod-eu-west-1'],
        stages: PROD_PIPELINE,
        versions: {
            'payments-api': 'v2.41.0',
            'ledger-worker': 'v1.18.3',
            'webhook-dispatcher': 'v1.26.2',
            'fraud-scorer': 'v3.8.2',
            'payouts-scheduler': 'v4.12.0',
            reconciliation: 'v2.7.0',
            'search-indexer': 'v2.3.1',
            notifications: 'v3.4.0',
        },
        deploy: {
            ...RELEASES[2],
            from: 'v3.8.2',
            status: 'running',
            stage: 4,
            progress: 0.62,
            startedAt: at(450),
        },
    },
];
