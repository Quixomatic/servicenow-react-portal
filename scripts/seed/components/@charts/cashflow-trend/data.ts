// Sample data for components:charts/cashflow-trend: monthly cash in / out from an opening balance.

export type CashMonth = { key: string; label: string; title: string; quarter: string; inflow: number; outflow: number };

export const OPENING = { balance: 1700000, date: 'Oct 1, 2025' };

export const MONTHS: CashMonth[] = [
    { key: '2025-10', label: 'Oct', title: 'Oct 2025', quarter: 'Q4 2025', inflow: 538000, outflow: 578000 },
    { key: '2025-11', label: 'Nov', title: 'Nov 2025', quarter: 'Q4 2025', inflow: 558000, outflow: 613000 },
    { key: '2025-12', label: 'Dec', title: 'Dec 2025', quarter: 'Q4 2025', inflow: 578000, outflow: 558000 },
    { key: '2026-01', label: 'Jan', title: 'Jan 2026', quarter: 'Q1 2026', inflow: 689000, outflow: 619000 },
    { key: '2026-02', label: 'Feb', title: 'Feb 2026', quarter: 'Q1 2026', inflow: 588000, outflow: 558000 },
    { key: '2026-03', label: 'Mar', title: 'Mar 2026', quarter: 'Q1 2026', inflow: 609000, outflow: 564000 },
    { key: '2026-04', label: 'Apr', title: 'Apr 2026', quarter: 'Q2 2026', inflow: 617000, outflow: 647000 },
    { key: '2026-05', label: 'May', title: 'May 2026', quarter: 'Q2 2026', inflow: 636000, outflow: 576000 },
    { key: '2026-06', label: 'Jun', title: 'Jun 2026', quarter: 'Q2 2026', inflow: 644000, outflow: 669000 },
    { key: '2026-07', label: 'Jul', title: 'Jul 2026', quarter: 'Q3 2026', inflow: 665000, outflow: 575000 },
    { key: '2026-08', label: 'Aug', title: 'Aug 2026', quarter: 'Q3 2026', inflow: 672000, outflow: 572000 },
    { key: '2026-09', label: 'Sep', title: 'Sep 2026', quarter: 'Q3 2026', inflow: 693000, outflow: 653000 },
];

/** The 12 months before the range, for the KPI comparisons. */
export const PRIOR = { net: -830000, burn: 521400 };

export const RESERVE = 1500000;

/** Category shares of cash in / out (applied to the range totals). */
export const CASH_IN = [
    { key: 'subscriptions', label: 'Subscriptions', share: 0.8942 },
    { key: 'services', label: 'Services', share: 0.0948 },
    { key: 'interest', label: 'Interest', share: 0.011 },
];

export const CASH_OUT = [
    { key: 'payroll', label: 'Payroll', share: 0.5751 },
    { key: 'overhead', label: 'Overhead and Tax', share: 0.2325 },
    { key: 'vendors', label: 'Vendors', share: 0.1924 },
];

export const RANGES = [
    { value: '6m', label: 'Last 6 months', short: '6 months', months: 6 },
    { value: 'ytd', label: 'Year to date', short: 'YTD', months: 0 },
    { value: '12m', label: 'Last 12 months', short: '12 months', months: 12 },
];
