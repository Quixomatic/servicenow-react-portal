import { InventoryVelocity } from 'components:charts/inventory-velocity';
import { TrainingVolume } from 'components:charts/training-volume';
import { CronRunDurations } from 'components:charts/cron-run-durations';
import { CronRunnerLoad } from 'components:charts/cron-runner-load';
import { TransitVsTarget } from 'components:charts/transit-vs-target';
import { FundInflows } from 'components:charts/fund-inflows';
import type { GalleryFamily } from './types';

// Bar chart blocks (owned by the bar family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'bar',
    label: 'Bar',
    blocks: [
        { key: 'inventory-velocity', title: 'Inventory Velocity', render: () => <InventoryVelocity /> },
        { key: 'training-volume', title: 'Training Volume', render: () => <TrainingVolume /> },
        { key: 'cron-run-durations', title: 'Cron Run Durations', render: () => <CronRunDurations /> },
        { key: 'cron-runner-load', title: 'Cron Runner Load', render: () => <CronRunnerLoad /> },
        { key: 'transit-vs-target', title: 'Transit vs Target', render: () => <TransitVsTarget /> },
        { key: 'fund-inflows', title: 'Yearly Fund Inflows', render: () => <FundInflows /> },
    ],
};
