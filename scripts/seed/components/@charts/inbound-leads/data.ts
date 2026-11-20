// Sample data for components:charts/inbound-leads: leads per month, this year and last year.

export type LeadsPoint = { label: string; name: string; current: number; prior: number };

const MONTHS = [
    ['Jan', 'January'],
    ['Feb', 'February'],
    ['Mar', 'March'],
    ['Apr', 'April'],
    ['May', 'May'],
    ['Jun', 'June'],
    ['Jul', 'July'],
    ['Aug', 'August'],
    ['Sep', 'September'],
    ['Oct', 'October'],
    ['Nov', 'November'],
    ['Dec', 'December'],
];

const CURRENT = [398, 431, 506, 488, 547, 529, 468, 452, 583, 641, 612, 503];
const PRIOR = [352, 381, 404, 436, 428, 459, 392, 371, 448, 497, 521, 437];

export const MONTHLY: LeadsPoint[] = MONTHS.map((m, i) => ({
    label: m[0],
    name: m[1],
    current: CURRENT[i],
    prior: PRIOR[i],
}));

/** Particles drifting down through the fill: fractions of the plot (x, y, fall), radius, seconds, peak opacity. */
export type Particle = { x: number; y: number; r: number; fall: number; duration: number; delay: number; peak: number };

export const PARTICLES: Particle[] = [
    { x: 0.05, y: 0.3, r: 1.6, fall: 0.55, duration: 9.7, delay: -2.1, peak: 0.45 },
    { x: 0.12, y: 0.18, r: 1.2, fall: 0.62, duration: 12.3, delay: -7.4, peak: 0.35 },
    { x: 0.19, y: 0.36, r: 2, fall: 0.5, duration: 10.9, delay: -4.6, peak: 0.4 },
    { x: 0.27, y: 0.24, r: 1.4, fall: 0.6, duration: 13.7, delay: -0.8, peak: 0.35 },
    { x: 0.34, y: 0.4, r: 1.8, fall: 0.48, duration: 8.9, delay: -5.9, peak: 0.45 },
    { x: 0.42, y: 0.2, r: 1.3, fall: 0.66, duration: 11.6, delay: -9.2, peak: 0.35 },
    { x: 0.49, y: 0.33, r: 1.7, fall: 0.56, duration: 14.4, delay: -3.3, peak: 0.4 },
    { x: 0.57, y: 0.26, r: 1.2, fall: 0.58, duration: 9.4, delay: -6.7, peak: 0.35 },
    { x: 0.64, y: 0.38, r: 1.9, fall: 0.5, duration: 12.8, delay: -1.5, peak: 0.45 },
    { x: 0.71, y: 0.16, r: 1.4, fall: 0.68, duration: 10.3, delay: -8.1, peak: 0.35 },
    { x: 0.78, y: 0.3, r: 1.6, fall: 0.56, duration: 15.1, delay: -4, peak: 0.4 },
    { x: 0.85, y: 0.22, r: 1.3, fall: 0.62, duration: 11.1, delay: -10.6, peak: 0.35 },
    { x: 0.91, y: 0.34, r: 1.8, fall: 0.52, duration: 13.3, delay: -2.8, peak: 0.45 },
    { x: 0.96, y: 0.26, r: 1.2, fall: 0.58, duration: 9.9, delay: -6.1, peak: 0.35 },
];
