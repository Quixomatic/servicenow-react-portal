import { CampaignImpressions } from 'components:charts/campaign-impressions';
import { OrdersOverview } from 'components:charts/orders-overview';
import { InboundLeads } from 'components:charts/inbound-leads';
import { GenerationMix } from 'components:charts/generation-mix';
import type { GalleryFamily } from './types';

// Area chart blocks (owned by the area family; one entry per components:charts/* block).
export const family: GalleryFamily = {
    key: 'area',
    label: 'Area',
    blocks: [
        { key: 'campaign-impressions', title: 'Campaign Impressions', render: () => <CampaignImpressions /> },
        { key: 'orders-overview', title: 'Orders Overview', render: () => <OrdersOverview /> },
        { key: 'inbound-leads', title: 'Inbound Leads', render: () => <InboundLeads /> },
        { key: 'generation-mix', title: 'Generation Mix', render: () => <GenerationMix /> },
    ],
};
