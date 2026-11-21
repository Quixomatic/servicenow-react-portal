import { KpiStrip } from 'components:charts/kpi-strip';
import { KpiTrendCards } from 'components:charts/kpi-trend-cards';
import { OrderMetrics } from 'components:charts/order-metrics';
import { InventoryHealth } from 'components:charts/inventory-health';
import { DistanceTracker } from 'components:charts/distance-tracker';
import { WalletBalances } from 'components:charts/wallet-balances';
import { WealthOverview } from 'components:charts/wealth-overview';
import { CronJobHealth } from 'components:charts/cron-job-health';
import { SloFleetHealth } from 'components:charts/slo-fleet-health';
import { SloBudgets } from 'components:charts/slo-budgets';
import { ConnectionHealth } from 'components:charts/connection-health';
import type { GalleryFamily } from './types';

// Sparkline chart blocks (owned by the sparkline family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'sparkline',
    label: 'Sparkline',
    blocks: [
        { key: 'kpi-strip', title: 'KPI Strip', render: () => <KpiStrip /> },
        { key: 'kpi-trend-cards', title: 'KPI Trend Cards', render: () => <KpiTrendCards /> },
        { key: 'order-metrics', title: 'Order Metrics', render: () => <OrderMetrics /> },
        { key: 'inventory-health', title: 'Inventory Health', render: () => <InventoryHealth /> },
        { key: 'distance-tracker', title: 'Distance Tracker', render: () => <DistanceTracker /> },
        { key: 'wallet-balances', title: 'Wallet Balances', render: () => <WalletBalances /> },
        { key: 'wealth-overview', title: 'Wealth Overview', render: () => <WealthOverview /> },
        { key: 'cron-job-health', title: 'Cron Job Health', render: () => <CronJobHealth /> },
        { key: 'slo-fleet-health', title: 'SLO Fleet Health', render: () => <SloFleetHealth /> },
        { key: 'slo-budgets', title: 'SLO Budgets', render: () => <SloBudgets /> },
        { key: 'connection-health', title: 'Connection Health', render: () => <ConnectionHealth /> },
    ],
};
