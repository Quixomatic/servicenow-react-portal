// Sample data for components:charts/slo-fleet-health: budget left per SLO, the fleet median budget over
// 28 days, hourly peak burn over 24 hours and budget events over 28 days.

export type SloBudget = {
    name: string;
    /** Error budget left as a fraction (1 = untouched, below 0 = over budget). */
    left: number;
    /** Currently burning fast (alerting); drawn with a warning ring and counted as at risk. */
    burning?: boolean;
};

export type BurnHour = { time: string; slo: string; burn: number };

export type BudgetEventKind = 'incident' | 'deploy' | 'change';

export type BudgetEvent = {
    name: string;
    kind: BudgetEventKind;
    ongoing?: boolean;
};

export type SloFleetData = {
    /** Every SLO, lowest budget left first. */
    slos: SloBudget[];
    /** Change in SLOs meeting their objective vs 7 days ago. */
    meetingDelta: number;
    newestMiss: { name: string; date: string };
    /** Fleet median budget left per day, oldest first; `baseIndex` is the comparison day. */
    median: { date: string; value: number }[];
    baseIndex: number;
    lowest: { name: string; over: number };
    /** Peak burn rate per hour, oldest first, with the SLO that peaked; burn thresholds. */
    burn: BurnHour[];
    pageBurn: number;
    alerting: { paging: number; ticket: number };
    /** Budget events per day, oldest first. */
    events: { date: string; events: BudgetEvent[] }[];
    mttr: string;
};

const SLOS: [string, number, boolean?][] = [
    ['Ledger write success', -0.423],
    ['SMS provider availability', -0.196],
    ['Index freshness', 0.147],
    ['Payout batch on time', 0.151],
    ['Fraud score latency', 0.382],
    ['Charge API availability', 0.4849],
    ['Charge API latency', 0.526],
    ['Webhook delivery success', 0.593, true],
    ['Ledger posting freshness', 0.607],
    ['Search query latency', 0.681],
    ['Webhook delivery latency', 0.684],
    ['Reconciliation completeness', 0.701, true],
    ['Push delivery latency', 0.703],
    ['Payout API availability', 0.765],
    ['Recon report freshness', 0.779],
    ['Email send success', 0.849],
    ['Refund API availability', 0.883],
    ['Fraud model availability', 0.898],
];

const MEDIAN = [
    0.7753, 0.7732, 0.7752, 0.7775, 0.7731, 0.7668, 0.7608, 0.7598, 0.763, 0.7611, 0.7613, 0.7614, 0.7606, 0.7597,
    0.759, 0.7607, 0.7594, 0.7594, 0.7553, 0.7333, 0.73, 0.684, 0.6536, 0.6503, 0.6593, 0.6593, 0.6663, 0.64,
];

const BURN: [string, number][] = [
    ['Payout batch on time', 90],
    ['Payout batch on time', 38],
    ['Payout batch on time', 0.64],
    ['Payout batch on time', 0.7],
    ['Index freshness', 0.58],
    ['Payout batch on time', 0.48],
    ['Webhook delivery latency', 0.41],
    ['Ledger write success', 0.47],
    ['Webhook delivery latency', 0.46],
    ['Payout batch on time', 0.62],
    ['Payout batch on time', 0.59],
    ['Search query latency', 43],
    ['Fraud score latency', 0.52],
    ['Payout batch on time', 0.64],
    ['Index freshness', 0.47],
    ['Payout batch on time', 0.6],
    ['Payout batch on time', 0.59],
    ['Payout batch on time', 0.64],
    ['Payout batch on time', 0.51],
    ['Fraud score latency', 0.43],
    ['Reconciliation completeness', 72],
    ['Fraud score latency', 0.48],
    ['Webhook delivery success', 4.6],
    ['Webhook delivery success', 18],
];

/** Events by day offset from Sep 2. */
const EVENTS: Record<number, BudgetEvent[]> = {
    6: [{ name: 'Charge API v4.12 deploy', kind: 'deploy' }],
    8: [{ name: 'Search index rebuild', kind: 'deploy' }],
    10: [{ name: 'Fraud model refresh', kind: 'deploy' }],
    15: [{ name: 'Payout batch stalled', kind: 'incident' }],
    19: [{ name: 'Search cluster failover', kind: 'incident' }],
    21: [{ name: 'Ledger schema migration', kind: 'deploy' }],
    22: [{ name: 'Webhook worker scale-up', kind: 'deploy' }],
    24: [{ name: 'Ledger write timeouts', kind: 'incident' }],
    25: [
        { name: 'SMS provider outage', kind: 'incident' },
        { name: 'SMS SLO target lowered', kind: 'change' },
    ],
    26: [{ name: 'Recon job rollback', kind: 'deploy' }],
    27: [
        { name: 'Webhook retry storm', kind: 'incident', ongoing: true },
        { name: 'Webhook retry backoff hotfix', kind: 'deploy' },
        { name: 'Recon runner rollout', kind: 'deploy' },
    ],
};

function day(i: number): string {
    return `Sep ${i + 2}`;
}

export const SAMPLE: SloFleetData = {
    slos: SLOS.map(([name, left, burning]) => ({
        name,
        left,
        burning: !!burning,
    })),
    meetingDelta: -1,
    newestMiss: { name: 'Ledger write success', date: 'Sep 25' },
    median: MEDIAN.map((value, i) => ({ date: day(i), value })),
    baseIndex: 20,
    lowest: { name: 'Ledger write success', over: 0.42 },
    burn: BURN.map(([slo, burn], i) => ({
        time: `${String((15 + i) % 24).padStart(2, '0')}:20`,
        slo,
        burn,
    })),
    pageBurn: 14.4,
    alerting: { paging: 1, ticket: 1 },
    events: MEDIAN.map((_, i) => ({ date: day(i), events: EVENTS[i] || [] })),
    mttr: '1h 34m',
};
