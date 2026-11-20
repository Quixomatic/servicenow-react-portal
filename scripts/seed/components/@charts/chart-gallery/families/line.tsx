import { BalanceTracker } from 'components:charts/balance-tracker';
import { MetricSwitcher } from 'components:charts/metric-switcher';
import type { GalleryFamily } from './types';

// Line chart blocks (owned by the line family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'line',
    label: 'Line',
    blocks: [
        { key: 'balance-tracker', title: 'Balance Tracker', render: () => <BalanceTracker /> },
        { key: 'metric-switcher', title: 'Metric Switcher', render: () => <MetricSwitcher /> },
    ],
};
