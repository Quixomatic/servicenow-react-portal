import { IncidentStatusTracker } from 'components:charts/incident-status-tracker';
import { LiveIncidentImpressions, LiveIncidentKpis, LiveIncidentTrends } from 'components:charts/live-blocks';
import type { GalleryFamily } from './types';

// Live data: gallery blocks fed with the user's incident records (utilities:charts/analytics).
export const family: GalleryFamily = {
    key: 'live',
    label: 'Live data',
    blocks: [
        {
            key: 'incident-status-tracker',
            title: 'Incident Status Tracker',
            render: () => <IncidentStatusTracker live />,
        },
        { key: 'live-incident-kpis', title: 'Live Incident KPIs', render: () => <LiveIncidentKpis live /> },
        {
            key: 'live-incident-impressions',
            title: 'Live Incidents Opened',
            render: () => <LiveIncidentImpressions live />,
        },
        { key: 'live-incident-trends', title: 'Live Resolved by Priority', render: () => <LiveIncidentTrends live /> },
    ],
};
