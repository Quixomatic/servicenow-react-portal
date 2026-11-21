import { InflowsBySource } from 'components:charts/inflows-by-source';
import { BrowserUsage } from 'components:charts/browser-usage';
import { CloudSpend } from 'components:charts/cloud-spend';
import type { GalleryFamily } from './types';

// Pie chart blocks (owned by the pie family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'pie',
    label: 'Pie',
    blocks: [
        { key: 'inflows-by-source', title: 'Inflows by Source', render: () => <InflowsBySource /> },
        { key: 'browser-usage', title: 'Browser Usage', render: () => <BrowserUsage /> },
        { key: 'cloud-spend', title: 'Cloud Spend', render: () => <CloudSpend /> },
    ],
};
