import { BalanceTracker } from 'components:charts/balance-tracker';
import { MetricSwitcher } from 'components:charts/metric-switcher';
import { RevenueTrend } from 'components:charts/revenue-trend';
import { SocialEngagement } from 'components:charts/social-engagement';
import { SalesVsTraffic } from 'components:charts/sales-vs-traffic';
import { FloorMonitor } from 'components:charts/floor-monitor';
import type { GalleryFamily } from './types';

// Line chart blocks (owned by the line family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'line',
    label: 'Line',
    blocks: [
        { key: 'balance-tracker', title: 'Balance Tracker', render: () => <BalanceTracker /> },
        { key: 'metric-switcher', title: 'Metric Switcher', render: () => <MetricSwitcher /> },
        { key: 'revenue-trend', title: 'Revenue Trend', render: () => <RevenueTrend /> },
        { key: 'social-engagement', title: 'Social Engagement', render: () => <SocialEngagement /> },
        { key: 'sales-vs-traffic', title: 'Sales vs Traffic', render: () => <SalesVsTraffic /> },
        { key: 'floor-monitor', title: 'Floor Monitor', render: () => <FloorMonitor /> },
    ],
};
