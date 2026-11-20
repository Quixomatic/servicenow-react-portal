import { SalesVsGoal } from 'components:charts/sales-vs-goal';
import { OperatingMargin } from 'components:charts/operating-margin';
import { CashflowTrend } from 'components:charts/cashflow-trend';
import type { GalleryFamily } from './types';

// Composed chart blocks (owned by the composed family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'composed',
    label: 'Composed',
    blocks: [
        { key: 'sales-vs-goal', title: 'Sales vs Goal', render: () => <SalesVsGoal /> },
        { key: 'operating-margin', title: 'Operating Margin', render: () => <OperatingMargin /> },
        { key: 'cashflow-trend', title: 'Cashflow Trend', render: () => <CashflowTrend /> },
    ],
};
