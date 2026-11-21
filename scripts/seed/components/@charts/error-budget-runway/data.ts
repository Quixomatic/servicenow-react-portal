/** A service on the runway: traffic in M requests / day, the share of its 30-day error budget left (0-1), and its
 * current and baseline burn rates (1 = burning exactly the budget over the window). Runway = left * window / burn. */
export type RunwayService = {
    key: string;
    team: string;
    traffic: number;
    left: number;
    burn: number;
    baselineBurn: number;
};

export const WINDOW_DAYS = 30;

export const SERVICES: RunwayService[] = [
    { key: 'api-gateway', team: 'Platform', traffic: 412, left: 0.3813, burn: 2.6, baselineBurn: 1.144 },
    { key: 'auth', team: 'Identity', traffic: 268, left: 0.76, burn: 0.95, baselineBurn: 0.95 },
    { key: 'billing-api', team: 'Payments', traffic: 154, left: 0.2267, burn: 3.4, baselineBurn: 1.447 },
    { key: 'search', team: 'Discovery', traffic: 131, left: 0.697, burn: 1.1, baselineBurn: 0.871 },
    { key: 'webhooks', team: 'Integrations', traffic: 118, left: 0.48, burn: 1.8, baselineBurn: 1.2 },
    { key: 'ingest-worker', team: 'Data', traffic: 96, left: 0.72, burn: 0.8, baselineBurn: 0.675 },
    { key: 'realtime', team: 'Messaging', traffic: 88, left: 0.3287, burn: 2.9, baselineBurn: 1.133 },
    { key: 'notifications', team: 'Messaging', traffic: 61, left: 0.68, burn: 0.6, baselineBurn: 0.567 },
    { key: 'file-storage', team: 'Storage', traffic: 47, left: 0.6667, burn: 1.0, baselineBurn: 0.833 },
    { key: 'reports', team: 'Analytics', traffic: 33, left: 0.6533, burn: 0.7, baselineBurn: 0.676 },
    { key: 'exports', team: 'Analytics', traffic: 21, left: 0.24, burn: 2.4, baselineBurn: 1.2 },
    { key: 'ledger-sync', team: 'Payments', traffic: 14, left: 0.513, burn: 1.9, baselineBurn: 0.905 },
    { key: 'sync-engine', team: 'Data', traffic: 9, left: 0.406, burn: 1.4, baselineBurn: 1.107 },
    { key: 'audit-log', team: 'Compliance', traffic: 4, left: 0.6667, burn: 0.5, baselineBurn: 0.476 },
];

/** Runway thresholds in days: below `critical` is Critical, below `watch` is Watch, otherwise Healthy. */
export const THRESHOLDS = { critical: 5, watch: 14 };
