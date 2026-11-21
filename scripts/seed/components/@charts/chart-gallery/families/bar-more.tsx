import { ErrorBudgetBurn } from 'components:charts/error-budget-burn';
import { DataSyncActivity } from 'components:charts/data-sync-activity';
import { SyncRunHistory } from 'components:charts/sync-run-history';
import { SloBurnRate } from 'components:charts/slo-burn-rate';
import { AuditLogVolume } from 'components:charts/audit-log-volume';
import { FirewallTraffic } from 'components:charts/firewall-traffic';
import type { GalleryFamily } from './types';

// Bar chart blocks, second half (owned by the second bar helper; merged into the Bar family by main.tsx).
export const family: GalleryFamily = {
    key: 'bar',
    label: 'Bar',
    blocks: [
        { key: 'error-budget-burn', title: 'Error Budget Burn', render: () => <ErrorBudgetBurn /> },
        { key: 'data-sync-activity', title: 'Data Sync Activity', render: () => <DataSyncActivity /> },
        { key: 'sync-run-history', title: 'Sync Run History', render: () => <SyncRunHistory /> },
        { key: 'slo-burn-rate', title: 'SLO Burn Rate', render: () => <SloBurnRate /> },
        { key: 'audit-log-volume', title: 'Audit Log Volume', render: () => <AuditLogVolume /> },
        { key: 'firewall-traffic', title: 'Firewall Traffic', render: () => <FirewallTraffic /> },
    ],
};
