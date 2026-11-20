// Sample data for components:charts/sales-vs-goal: closed sales per month against the goal and last year.
// sales: null for months not closed yet.

export type SalesMonth = { month: string; label: string; sales: number | null; goal: number; prior: number };

export const MONTHS: SalesMonth[] = [
    { month: 'January 2026', label: 'Jan', sales: 352400, goal: 380000, prior: 318200 },
    { month: 'February 2026', label: 'Feb', sales: 408900, goal: 395000, prior: 341500 },
    { month: 'March 2026', label: 'Mar', sales: 471300, goal: 440000, prior: 396800 },
    { month: 'April 2026', label: 'Apr', sales: 398600, goal: 425000, prior: 372400 },
    { month: 'May 2026', label: 'May', sales: 476200, goal: 450000, prior: 401900 },
    { month: 'June 2026', label: 'Jun', sales: 512800, goal: 490000, prior: 438600 },
    { month: 'July 2026', label: 'Jul', sales: 441700, goal: 455000, prior: 405300 },
    { month: 'August 2026', label: 'Aug', sales: 493500, goal: 470000, prior: 419700 },
    { month: 'September 2026', label: 'Sep', sales: 568900, goal: 530000, prior: 471200 },
    { month: 'October 2026', label: 'Oct', sales: null, goal: 545000, prior: 486500 },
    { month: 'November 2026', label: 'Nov', sales: null, goal: 590000, prior: 529800 },
    { month: 'December 2026', label: 'Dec', sales: null, goal: 660000, prior: 601400 },
];

/** Sales of the month before the first one (prior December), for January's "vs Dec". */
export const OPENING = { label: 'Dec', sales: 601400 };

export type RangeKey = 'full' | 'ytd' | '6m';

export const RANGES: { value: RangeKey; label: string; icon: string }[] = [
    { value: 'full', label: 'Full Year', icon: 'calendar' },
    { value: 'ytd', label: 'Year to Date', icon: 'calendar-check' },
    { value: '6m', label: 'Last 6 Months', icon: 'history' },
];
