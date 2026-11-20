// Sample data for components:charts/operating-margin: FY2026 revenue and operating expenses per month.
// status: 'closed' (actuals), 'open' (the current month: posted to date + a projection), 'forecast'.

export type MarginMonth = {
    month: string;
    label: string;
    quarter: string;
    status: 'closed' | 'open' | 'forecast';
    revenue: number;
    expenses: number;
    /** Open month only: posted to date. */
    revenuePosted?: number;
    expensesPosted?: number;
};

export const MONTHS: MarginMonth[] = [
    { month: 'January 2026', label: 'Jan', quarter: 'Q1', status: 'closed', revenue: 1840000, expenses: 1690000 },
    { month: 'February 2026', label: 'Feb', quarter: 'Q1', status: 'closed', revenue: 1910000, expenses: 1720000 },
    { month: 'March 2026', label: 'Mar', quarter: 'Q1', status: 'closed', revenue: 2080000, expenses: 1760000 },
    { month: 'April 2026', label: 'Apr', quarter: 'Q2', status: 'closed', revenue: 2010000, expenses: 1930000 },
    { month: 'May 2026', label: 'May', quarter: 'Q2', status: 'closed', revenue: 2150000, expenses: 1810000 },
    { month: 'June 2026', label: 'Jun', quarter: 'Q2', status: 'closed', revenue: 2290000, expenses: 1850000 },
    { month: 'July 2026', label: 'Jul', quarter: 'Q3', status: 'closed', revenue: 2240000, expenses: 1880000 },
    { month: 'August 2026', label: 'Aug', quarter: 'Q3', status: 'closed', revenue: 2380000, expenses: 1900000 },
    { month: 'September 2026', label: 'Sep', quarter: 'Q3', status: 'closed', revenue: 2510000, expenses: 1950000 },
    {
        month: 'October 2026',
        label: 'Oct',
        quarter: 'Q4',
        status: 'open',
        revenue: 2666000,
        expenses: 2077000,
        revenuePosted: 1636000,
        expensesPosted: 1268000,
    },
    { month: 'November 2026', label: 'Nov', quarter: 'Q4', status: 'forecast', revenue: 2700000, expenses: 2120000 },
    { month: 'December 2026', label: 'Dec', quarter: 'Q4', status: 'forecast', revenue: 2870000, expenses: 2252000 },
];

/** Same period last year (year to date through the open month), for the KPI deltas. */
export const LAST_YEAR = { revenue: 17580000, expenses: 15670000 };

export type LedgerEntry = { id: number; label: string; kind: 'revenue' | 'expenses'; amount: number };

/** Latest postings, newest first. */
export const LATEST: LedgerEntry[] = [
    { id: 4, label: 'Subscriptions', kind: 'revenue', amount: 51900 },
    { id: 3, label: 'Subscriptions', kind: 'revenue', amount: 24600 },
    { id: 2, label: 'Cloud hosting', kind: 'expenses', amount: 8300 },
    { id: 1, label: 'Services', kind: 'revenue', amount: 12900 },
];

/** What the live feed posts next (cycled). */
export const FEED: { label: string; kind: 'revenue' | 'expenses'; amount: number }[] = [
    { label: 'Marketing', kind: 'expenses', amount: 13700 },
    { label: 'Subscriptions', kind: 'revenue', amount: 8800 },
    { label: 'Services', kind: 'revenue', amount: 19400 },
    { label: 'Payroll', kind: 'expenses', amount: 21500 },
    { label: 'Subscriptions', kind: 'revenue', amount: 33200 },
    { label: 'Cloud hosting', kind: 'expenses', amount: 6900 },
    { label: 'Licences', kind: 'revenue', amount: 15100 },
    { label: 'Travel', kind: 'expenses', amount: 4200 },
];
