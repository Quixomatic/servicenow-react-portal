/** Sample data for components:charts/trial-journey: trials from four channels through three stages. */

export type JourneyStage = {
    /** Column header. */
    header: string;
    /** The node that continues the journey. */
    name: string;
    /** The drop-off node that splits off at this stage. */
    drop: string;
};

export type JourneyPeriod = {
    key: string;
    label: string;
    /** Signups per channel (same order as CHANNELS). */
    channels: number[];
    /** Trials that make it through each stage (same order as STAGES). */
    kept: number[];
};

export const CHANNELS = ['Docs', 'Referrals', 'Newsletter', 'Marketplace'];

export const SIGNUP_LABEL = 'Signed Up';

export const STAGES: JourneyStage[] = [
    { header: 'Onboarded', name: 'Onboarded', drop: 'Skipped Setup' },
    { header: 'Team Invited', name: 'Team Invited', drop: 'Went Solo' },
    { header: 'Converted', name: 'Upgraded', drop: "Didn't Upgrade" },
];

export const PERIODS: JourneyPeriod[] = [
    { key: '7d', label: '7D', channels: [2060, 1380, 1140, 470], kept: [3390, 1910, 742] },
    { key: '30d', label: '30D', channels: [8420, 5960, 3870, 2150], kept: [13260, 7830, 2940] },
    { key: '90d', label: '90D', channels: [24900, 17350, 10620, 6840], kept: [37620, 21480, 7690] },
];
