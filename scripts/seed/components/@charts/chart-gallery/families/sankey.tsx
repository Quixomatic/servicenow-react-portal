import { RevenueFlow } from 'components:charts/revenue-flow';
import { TrialJourney } from 'components:charts/trial-journey';
import { PipelineLeakage } from 'components:charts/pipeline-leakage';
import type { GalleryFamily } from './types';

// Sankey chart blocks (owned by the sankey family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'sankey',
    label: 'Sankey',
    blocks: [
        { key: 'revenue-flow', title: 'Revenue Flow', render: () => <RevenueFlow /> },
        { key: 'trial-journey', title: 'Trial Journey', render: () => <TrialJourney /> },
        { key: 'pipeline-leakage', title: 'Pipeline Leakage', render: () => <PipelineLeakage /> },
    ],
};
