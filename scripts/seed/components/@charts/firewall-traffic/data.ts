/**
 * Sample data for components:charts/firewall-traffic: 24 hours of edge requests (blocked, challenged, the
 * rest allowed) with the incidents that hit some hours. The last hour is still in progress.
 */

export type TrafficHour = {
    /** Hour of day the bucket starts (UTC). */
    hour: number;
    requests: number;
    blocked: number;
    challenged: number;
    incident?: string;
};

/** Oldest first; the last entry is the current, partial hour. */
export const HOURS: TrafficHour[] = [
    { hour: 15, requests: 69800, blocked: 1980, challenged: 1430 },
    { hour: 16, requests: 72820, blocked: 2110, challenged: 1510 },
    { hour: 17, requests: 73290, blocked: 2040, challenged: 9350, incident: 'Scraper wave on /v2/customers' },
    { hour: 18, requests: 68650, blocked: 1890, challenged: 4960 },
    { hour: 19, requests: 60350, blocked: 1720, challenged: 1330 },
    { hour: 20, requests: 54340, blocked: 1560, challenged: 1180 },
    { hour: 21, requests: 47320, blocked: 1380, challenged: 1040 },
    { hour: 22, requests: 39930, blocked: 1210, challenged: 920 },
    { hour: 23, requests: 33770, blocked: 1060, challenged: 810 },
    { hour: 0, requests: 28760, blocked: 940, challenged: 720 },
    { hour: 1, requests: 25110, blocked: 860, challenged: 650 },
    { hour: 2, requests: 25650, blocked: 910, challenged: 2840 },
    { hour: 3, requests: 54050, blocked: 3350, challenged: 30400, incident: 'Credential stuffing on /oauth/token' },
    { hour: 4, requests: 47460, blocked: 21700, challenged: 3960, incident: '203.0.113.128/26 added to the blocklist' },
    { hour: 5, requests: 29160, blocked: 2640, challenged: 1120 },
    { hour: 6, requests: 33200, blocked: 1130, challenged: 870 },
    { hour: 7, requests: 42290, blocked: 1370, challenged: 1020 },
    { hour: 8, requests: 51130, blocked: 1640, challenged: 1190 },
    { hour: 9, requests: 72210, blocked: 16800, challenged: 1310, incident: 'Scanner wave on dotfiles and CMS paths' },
    { hour: 10, requests: 67520, blocked: 5940, challenged: 1380 },
    { hour: 11, requests: 67710, blocked: 2160, challenged: 1450 },
    { hour: 12, requests: 71090, blocked: 2270, challenged: 1520 },
    { hour: 13, requests: 74860, blocked: 2380, challenged: 1580 },
    { hour: 14, requests: 23380, blocked: 760, challenged: 520 },
];

export const RANGES = [6, 12, 24];
