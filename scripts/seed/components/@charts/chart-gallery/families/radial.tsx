import { ErrorBudgets } from 'components:charts/error-budgets';
import { ApiHealth } from 'components:charts/api-health';
import { InflowsGauge } from 'components:charts/inflows-gauge';
import type { GalleryFamily } from './types';

// Radial chart blocks (owned by the radial family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'radial',
    label: 'Radial',
    blocks: [
        { key: 'error-budgets', title: 'Error Budgets', render: () => <ErrorBudgets /> },
        { key: 'api-health', title: 'API Health', render: () => <ApiHealth /> },
        { key: 'inflows-gauge', title: 'Inflows Gauge', render: () => <InflowsGauge /> },
    ],
};
