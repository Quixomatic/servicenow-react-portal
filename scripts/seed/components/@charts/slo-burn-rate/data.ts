/**
 * Sample data for components:charts/slo-burn-rate: one SLO's hourly error-budget burn rate (1× = the even
 * pace that spends the whole budget over the window), the multi-window burn rates and the alert rules.
 */

export type BurnIncident = {
    id: string;
    title: string;
    from: number;
    to: number;
};
export type BurnWindow = {
    key: string;
    label: string;
    name: string;
    value: number;
};
export type BurnRule = {
    key: string;
    name: string;
    action: 'page' | 'ticket';
    /** Long and short window keys (both must pass the threshold to fire). */
    long: string;
    short: string;
    threshold: number;
};
export type BurnSlo = {
    key: string;
    name: string;
    /** Target, %. */
    target: number;
    windowDays: number;
    channel: string;
    /** The current hour (ISO, local wall time). */
    now: string;
    /** % of the error budget still left. */
    budgetLeft: number;
    /** Hourly burn rates, oldest first; the last one is the current hour. */
    hourly: number[];
    incidents: BurnIncident[];
    windows: BurnWindow[];
    rules: BurnRule[];
};

export const SLO: BurnSlo = {
    key: 'webhook-delivery',
    name: 'Webhook delivery success',
    target: 99.9,
    windowDays: 28,
    channel: '#sre-oncall',
    now: '2026-09-29T14:20',
    budgetLeft: 74,
    hourly: [
        0.12, 0.1, 0.11, 0.15, 0.23, 0.22, 0.15, 0.31, 0.16, 0.11, 0.15, 0.12, 0.1, 0.14, 0.18, 0.12, 0.18, 0.88, 4.8,
        2.0, 0.21, 0.11, 0.22, 0.22, 0.09, 0.29, 0.08, 0.19, 0.18, 0.16, 0.32, 0.28, 0.31, 0.31, 0.16, 0.11, 1.9, 2.0,
        1.8, 2.0, 0.16, 0.11, 0.15, 0.29, 0.11, 0.29, 0.3, 0.22, 0.3, 0.17, 0.22, 0.19, 0.09, 3.2, 1.01, 0.25, 0.28,
        0.08, 0.17, 0.15, 0.31, 0.25, 0.1, 0.08, 0.15, 0.12, 0.22, 0.24, 0.22, 0.26, 0.87, 18.44,
    ],
    incidents: [
        { id: 'INC-2187', title: 'Signing key rotation', from: 17, to: 19 },
        { id: 'INC-2191', title: 'Partner endpoint timeouts', from: 36, to: 39 },
        { id: 'INC-2198', title: 'Delivery queue backlog', from: 53, to: 54 },
        { id: 'INC-2209', title: 'Webhook retry storm', from: 70, to: 71 },
    ],
    windows: [
        { key: '5m', label: '5m', name: '5 minutes', value: 29.4 },
        { key: '30m', label: '30m', name: '30 minutes', value: 24.5 },
        { key: '1h', label: '1h', name: '1 hour', value: 18.44 },
        { key: '6h', label: '6h', name: '6 hours', value: 3.38 },
        { key: '3d', label: '3d', name: '3 days', value: 0.7 },
    ],
    rules: [
        {
            key: 'fast',
            name: 'Fast Burn',
            action: 'page',
            long: '1h',
            short: '5m',
            threshold: 14.4,
        },
        {
            key: 'medium',
            name: 'Medium Burn',
            action: 'page',
            long: '6h',
            short: '30m',
            threshold: 6,
        },
        {
            key: 'slow',
            name: 'Slow Burn',
            action: 'ticket',
            long: '3d',
            short: '6h',
            threshold: 1,
        },
    ],
};
