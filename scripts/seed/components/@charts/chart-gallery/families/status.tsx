import { CronRunHistory } from 'components:charts/cron-run-history';
import { DeployHistory } from 'components:charts/deploy-history';
import { ReleaseLanes } from 'components:charts/release-lanes';
import { WorkingAgreements } from 'components:charts/working-agreements';
import type { GalleryFamily } from './types';

// Status tracker chart blocks (owned by the status family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'status',
    label: 'Status tracker',
    blocks: [
        { key: 'cron-run-history', title: 'Cron Run History', render: () => <CronRunHistory /> },
        { key: 'deploy-history', title: 'Deploy History', render: () => <DeployHistory /> },
        { key: 'release-lanes', title: 'Release Lanes', render: () => <ReleaseLanes /> },
        { key: 'working-agreements', title: 'Working Agreements', render: () => <WorkingAgreements /> },
    ],
};
