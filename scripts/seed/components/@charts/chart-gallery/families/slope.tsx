import { ErrorBudgetRunway } from 'components:charts/error-budget-runway';
import { RetentionCrossover } from 'components:charts/retention-crossover';
import type { GalleryFamily } from './types';

// Slope chart blocks (owned by the slope family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'slope',
    label: 'Slope',
    blocks: [
        { key: 'error-budget-runway', title: 'Error Budget Runway', render: () => <ErrorBudgetRunway /> },
        { key: 'retention-crossover', title: 'Retention Crossover', render: () => <RetentionCrossover /> },
    ],
};
