// Sample data for components:charts/working-agreements (26 weekly tiles per team practice, harvested shape).

/** One week of a practice: [done, due] counts, a pause reason, or null when not adopted yet. */
export type AgreementWeek = [number, number] | string | null;

export type Practice = {
    area: string;
    name: string;
    description?: string;
    /** Plural unit counted, e.g. 'PRs', 'shifts'. */
    unit: string;
    /** Weekly target, percent of due items kept. */
    target: number;
    /** Oldest to newest; the last entry is the current (partial) week. */
    weeks: AgreementWeek[];
};

export type AgreementArea = { key: string; label: string; icon: string; color: string };

export type AgreementTeam = { key: string; label: string; avatar?: string; practices: Practice[] };

/** Monday of the first week shown. */
export const WEEK_START = '2026-04-06';
export const NOW = '2026-09-29T14:20:00Z';

export const AREAS: AgreementArea[] = [
    { key: 'code-review', label: 'Code Review', icon: 'square-code', color: 'var(--tile-kept)' },
    { key: 'releases', label: 'Releases', icon: 'rocket', color: 'var(--band-blue)' },
    { key: 'reliability', label: 'Reliability', icon: 'activity', color: 'var(--band-violet)' },
    { key: 'knowledge', label: 'Knowledge', icon: 'brain', color: 'var(--accent-blue)' },
];

/** Adopted by a team with no agreements yet ('Adopt Starters'); counting starts this week. */
export const STARTERS: Omit<Practice, 'weeks'>[] = [
    {
        area: 'code-review',
        name: 'Fast reviews',
        description: 'PRs get a first review within one working day.',
        unit: 'PRs',
        target: 85,
    },
    {
        area: 'releases',
        name: 'Green main',
        description: 'Working days end with main passing every check.',
        unit: 'days',
        target: 80,
    },
    {
        area: 'reliability',
        name: 'Handoffs',
        description: 'Every on-call shift ends with a written handoff.',
        unit: 'shifts',
        target: 100,
    },
    {
        area: 'knowledge',
        name: 'Docs updated',
        description: 'User facing PRs merge with their docs updated.',
        unit: 'PRs',
        target: 85,
    },
];

// prettier-ignore
export const TEAMS: AgreementTeam[] = [
    {
        key: 'payments',
        label: 'Payments',
        practices: [
            {
                area: 'code-review',
                name: 'Fast reviews',
                description: 'PRs get a first review within one working day.',
                unit: 'PRs',
                target: 90,
                weeks: [[21, 21], [24, 27], [17, 17], [20, 21], [18, 21], [21, 21], [17, 17], [22, 25], [15, 17], [17, 19], [25, 26], [21, 22], [22, 24], [25, 26], [20, 21], [23, 24], [18, 19], [22, 23], [21, 22], [17, 18], [23, 25], [14, 16], [20, 22], [20, 24], [21, 26], [7, 9]],
            },
            {
                area: 'code-review',
                name: 'Fix tests',
                description: 'Bug fixes merge with a regression test.',
                unit: 'fixes',
                target: 90,
                weeks: [[9, 9], [9, 9], [10, 10], [9, 9], [9, 10], [8, 8], [8, 10], [7, 8], [7, 7], [9, 9], [9, 10], [7, 7], [9, 9], [7, 7], [6, 7], [8, 9], [6, 6], [8, 8], [8, 10], [5, 5], [7, 7], [5, 6], [9, 9], [8, 8], [10, 11], [3, 3]],
            },
            {
                area: 'code-review',
                name: 'Small PRs',
                description: 'PRs merge with fewer than 400 changed lines.',
                unit: 'PRs',
                target: 80,
                weeks: [[17, 22], [13, 17], [17, 19], [13, 17], [17, 19], [13, 15], [16, 21], [18, 18], [15, 17], [13, 15], [15, 16], [22, 23], [19, 23], [12, 14], [13, 18], [16, 21], [14, 17], [16, 20], [16, 19], [13, 15], [18, 22], [12, 14], [16, 19], [18, 21], [19, 23], [7, 8]],
            },
            {
                area: 'code-review',
                name: 'Ledger review',
                description: 'PRs that touch ledger code merge with two approvals.',
                unit: 'PRs',
                target: 100,
                weeks: [[3, 4], [4, 4], [2, 5], [4, 4], [3, 3], [3, 3], [3, 3], [5, 5], [3, 3], [4, 4], [5, 5], [3, 3], [4, 4], [5, 5], [4, 4], [6, 6], [3, 3], [4, 5], [4, 4], [2, 2], [5, 5], [3, 3], [4, 4], [5, 6], [5, 5], [2, 2]],
            },
            {
                area: 'releases',
                name: 'Flag cleanup',
                description: 'Flags at full rollout are removed within two sprints.',
                unit: 'flags',
                target: 80,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [2, 3], [3, 4], [2, 2], [3, 3], [4, 5], [3, 4], [3, 3], [0, 1]],
            },
            {
                area: 'releases',
                name: 'Green main',
                description: 'Working days end with main passing every check.',
                unit: 'days',
                target: 80,
                weeks: [[5, 5], [2, 5], [5, 5], [3, 5], [3, 5], [5, 5], [4, 5], [4, 5], [3, 5], [5, 5], [4, 5], [5, 5], [5, 5], [5, 5], [5, 5], [4, 5], [5, 5], [4, 5], [5, 5], [5, 5], [3, 5], [4, 5], [5, 5], [4, 5], [5, 5], [2, 2]],
            },
            {
                area: 'releases',
                name: 'Release notes',
                description: 'Production deploys ship with release notes.',
                unit: 'deploys',
                target: 100,
                weeks: [[10, 10], [9, 9], [8, 9], [13, 13], [14, 14], [10, 11], [11, 11], [10, 11], [14, 14], [14, 14], [15, 15], [13, 13], [11, 11], [12, 12], [11, 11], [13, 13], [10, 10], [12, 12], [12, 12], [9, 9], [14, 14], 'Month end close freeze', [15, 15], [12, 12], [9, 13], [4, 4]],
            },
            {
                area: 'releases',
                name: 'Rollback plan',
                description: 'Production deploys carry a rollback step tested in staging.',
                unit: 'deploys',
                target: 90,
                weeks: [[13, 14], [14, 14], [10, 11], [10, 12], [11, 12], [12, 12], [12, 12], [11, 11], [12, 12], [14, 14], [12, 12], [10, 11], [9, 10], [14, 14], [9, 11], [11, 13], [9, 10], [11, 12], [11, 12], [9, 9], [13, 14], 'Month end close freeze', [14, 15], [11, 12], [12, 13], [3, 4]],
            },
            {
                area: 'reliability',
                name: 'Action items',
                description: 'Postmortem action items close by their due date.',
                unit: 'action items',
                target: 80,
                weeks: [[3, 4], [4, 4], [3, 4], [3, 4], [5, 5], [3, 4], [3, 4], [3, 5], [3, 4], [4, 4], [3, 3], [3, 4], [3, 3], [4, 4], [2, 4], [3, 3], [4, 5], [2, 2], [3, 4], [5, 6], [3, 3], [4, 4], [4, 5], [3, 3], [3, 4], [1, 1]],
            },
            {
                area: 'reliability',
                name: 'Page ack',
                description: 'Pages are acknowledged within five minutes.',
                unit: 'pages',
                target: 95,
                weeks: [[11, 11], [11, 11], [10, 11], [14, 14], [11, 12], [12, 12], [11, 11], [12, 12], [7, 8], [10, 10], [13, 13], [10, 10], [10, 10], [11, 11], [12, 12], [9, 9], [14, 15], [11, 11], [8, 8], [14, 14], [10, 10], [6, 6], [13, 13], [9, 9], [15, 17], [4, 4]],
            },
            {
                area: 'reliability',
                name: 'Handoffs',
                description: 'Every on-call shift ends with a written handoff.',
                unit: 'shifts',
                target: 100,
                weeks: [[1, 2], [2, 2], [2, 2], [2, 2], [1, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 1]],
            },
            {
                area: 'knowledge',
                name: 'Docs updated',
                description: 'User facing PRs merge with their docs updated.',
                unit: 'PRs',
                target: 85,
                weeks: [[2, 5], [5, 6], [6, 8], [6, 8], [6, 7], [6, 8], [6, 7], [8, 8], [7, 7], [4, 5], [5, 5], [7, 8], [7, 8], [5, 5], [5, 6], [7, 8], [5, 5], [6, 7], [8, 9], [4, 4], [7, 8], [5, 5], [6, 7], [8, 9], [7, 8], [2, 3]],
            },
            {
                area: 'knowledge',
                name: 'ADRs',
                description: 'Architecture changes land with a decision record.',
                unit: 'changes',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [2, 2], [1, 1], [2, 3], [2, 2], [1, 1], [0, 1]],
            },
            {
                area: 'knowledge',
                name: 'Help channel',
                description: 'Questions in the payments help channel get an answer within one working day.',
                unit: 'questions',
                target: 80,
                weeks: [[7, 8], [9, 11], [13, 14], [11, 12], [7, 9], [9, 11], [10, 11], [8, 11], [7, 10], [11, 12], [12, 12], [10, 11], [9, 9], [13, 13], [8, 9], [10, 12], [7, 8], [9, 11], [7, 10], [6, 7], [11, 13], [5, 6], [9, 11], [11, 14], [10, 12], [4, 5]],
            },
        ],
    },
    {
        key: 'platform',
        label: 'Platform',
        practices: [
            {
                area: 'code-review',
                name: 'Small PRs',
                description: 'PRs merge with fewer than 400 changed lines.',
                unit: 'PRs',
                target: 75,
                weeks: [[13, 18], [13, 14], [11, 16], [12, 17], [16, 18], [14, 19], [6, 18], [11, 16], [14, 16], [15, 16], [20, 21], [13, 16], [19, 20], [14, 17], [11, 16], [13, 18], [11, 14], [13, 17], [12, 15], 'Team offsite week', [14, 19], [13, 17], [12, 16], [15, 20], [14, 18], [5, 6]],
            },
            {
                area: 'code-review',
                name: 'Plan review',
                description: 'Infrastructure changes apply only after a reviewed plan.',
                unit: 'changes',
                target: 100,
                weeks: [[4, 9], [7, 7], [6, 7], [9, 10], [6, 7], [9, 9], [7, 8], [7, 7], [9, 9], [7, 7], [10, 10], [9, 9], [10, 10], [8, 8], [8, 8], [10, 10], [7, 7], [8, 9], [11, 11], 'Team offsite week', [9, 9], [12, 12], [8, 8], [9, 10], [7, 9], [2, 3]],
            },
            {
                area: 'code-review',
                name: 'Code owners',
                description: 'PRs merge only after a code owner approves.',
                unit: 'PRs',
                target: 95,
                weeks: [[14, 15], [13, 14], [17, 17], [14, 14], [19, 20], [17, 18], [19, 19], [13, 13], [19, 19], [14, 15], [13, 14], [16, 16], [16, 16], [16, 16], [16, 16], [17, 18], [14, 14], [17, 17], [15, 15], 'Team offsite week', [18, 19], [17, 17], [16, 16], [19, 20], [18, 18], [6, 6]],
            },
            {
                area: 'code-review',
                name: 'Fast reviews',
                description: 'PRs get a first review within one working day.',
                unit: 'PRs',
                target: 85,
                weeks: [[16, 16], [17, 18], [15, 18], [18, 20], [21, 21], [14, 15], [11, 14], [16, 19], [12, 15], [16, 17], [14, 17], [11, 14], [16, 20], [16, 17], [15, 16], [16, 18], [13, 14], [15, 17], [14, 15], 'Team offsite week', [17, 19], [16, 17], [15, 16], [18, 20], [17, 18], [6, 6]],
            },
            {
                area: 'releases',
                name: 'Change log',
                description: 'Production changes are logged in the change calendar first.',
                unit: 'changes',
                target: 90,
                weeks: [[8, 17], [10, 12], [13, 15], [16, 17], [5, 15], [13, 13], [13, 14], [15, 15], [15, 16], [11, 13], [15, 17], [13, 13], [15, 16], [17, 17], [13, 14], [15, 16], [11, 12], [14, 15], [12, 13], 'Team offsite week', [15, 17], [15, 18], [13, 14], [14, 16], [12, 15], [4, 5]],
            },
            {
                area: 'releases',
                name: 'Image patches',
                description: 'Base images are patched within seven days of a critical CVE.',
                unit: 'images',
                target: 90,
                weeks: [[6, 6], [5, 5], [3, 6], [5, 6], [4, 5], [7, 7], [6, 6], [7, 7], [5, 5], [7, 7], [5, 5], [7, 7], [5, 6], [7, 7], [6, 6], [4, 4], [7, 8], [5, 5], [7, 7], [6, 6], [9, 9], [5, 5], [7, 7], [6, 6], [8, 8], [2, 2]],
            },
            {
                area: 'releases',
                name: 'Green main',
                description: 'Working days end with main passing every check.',
                unit: 'days',
                target: 80,
                weeks: [[2, 5], [2, 5], [5, 5], [5, 5], [5, 5], [5, 5], [4, 5], [4, 5], [4, 5], [3, 5], [5, 5], [4, 5], [4, 5], [4, 5], [5, 5], [5, 5], [4, 5], [5, 5], [5, 5], 'Team offsite week', [5, 5], [3, 5], [4, 5], [5, 5], [5, 5], [2, 2]],
            },
            {
                area: 'releases',
                name: 'Canary first',
                description: 'Cluster upgrades reach the canary pool first.',
                unit: 'upgrades',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [4, 4], [3, 3], [2, 2], 'Team offsite week', [3, 3], [4, 4], [2, 2], [3, 3], [3, 3], [1, 1]],
            },
            {
                area: 'reliability',
                name: 'Action items',
                description: 'Postmortem action items close by their due date.',
                unit: 'action items',
                target: 80,
                weeks: [[3, 5], [6, 6], [4, 5], [4, 4], [4, 6], [3, 4], [3, 5], [3, 4], [3, 4], [3, 5], [4, 6], [5, 6], [4, 5], [6, 6], [4, 5], [3, 3], [5, 6], [3, 4], [2, 2], [4, 5], [5, 7], [3, 4], [4, 6], [3, 5], [2, 3], [1, 2]],
            },
            {
                area: 'reliability',
                name: 'Alert tuning',
                description: 'Alerts that page twice in a week are tuned within seven days.',
                unit: 'alerts',
                target: 75,
                weeks: [[3, 4], [2, 5], [3, 3], [4, 5], [4, 5], [4, 4], [5, 5], [4, 5], [3, 5], [3, 3], [5, 5], [4, 4], [5, 5], [3, 4], [2, 3], [4, 5], [2, 2], [3, 4], [3, 3], 'Team offsite week', [4, 6], [3, 4], [3, 3], [4, 5], [3, 4], [1, 1]],
            },
            {
                area: 'reliability',
                name: 'Handoffs',
                description: 'Every on-call shift ends with a written handoff.',
                unit: 'shifts',
                target: 100,
                weeks: [[1, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 2], [2, 2], [2, 2], [1, 1]],
            },
            {
                area: 'reliability',
                name: 'Page ack',
                description: 'Pages are acknowledged within five minutes.',
                unit: 'pages',
                target: 95,
                weeks: [[23, 24], [22, 22], [23, 23], [20, 20], [20, 20], [15, 16], [22, 22], [22, 23], [17, 18], [24, 25], [21, 22], [23, 24], [22, 24], [18, 18], [20, 21], [18, 18], [23, 24], [19, 19], [25, 26], [21, 22], [17, 17], [19, 20], [22, 23], [19, 19], [24, 25], [7, 7]],
            },
            {
                area: 'reliability',
                name: 'Restore tests',
                description: 'Each database backup is restored in a weekly test run.',
                unit: 'databases',
                target: 100,
                weeks: [[4, 4], [4, 4], [3, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [3, 4], [4, 4], 'Team offsite week', [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [1, 1]],
            },
            {
                area: 'knowledge',
                name: 'Docs updated',
                description: 'User facing PRs merge with their docs updated.',
                unit: 'PRs',
                target: 85,
                weeks: [[6, 6], [3, 6], [6, 7], [4, 5], [5, 7], [4, 5], [4, 5], [6, 7], [5, 6], [5, 7], [6, 7], [5, 7], [6, 6], [5, 5], [4, 5], [5, 6], [4, 4], [6, 7], [4, 5], 'Team offsite week', [5, 6], [7, 8], [5, 5], [5, 6], [6, 7], [2, 2]],
            },
            {
                area: 'knowledge',
                name: 'Runbooks',
                description: 'Paging alerts link a runbook reviewed this quarter.',
                unit: 'alerts',
                target: 90,
                weeks: [[14, 32], [34, 35], [31, 35], [41, 42], [47, 50], [45, 45], [37, 42], [29, 32], [32, 36], [29, 33], [49, 49], [39, 43], [40, 45], [50, 53], [33, 41], [34, 41], [35, 42], [36, 42], [38, 43], [38, 43], [39, 43], [40, 44], [41, 44], [42, 45], [41, 45], [42, 45]],
            },
            {
                area: 'knowledge',
                name: 'Office hours',
                description: 'Both weekly office hour slots are held for other teams.',
                unit: 'slots',
                target: 100,
                weeks: [[2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 2], 'Team offsite week', [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 1]],
            },
        ],
    },
    {
        key: 'data',
        label: 'Data',
        practices: [
            {
                area: 'code-review',
                name: 'Peer check',
                description: 'Model changes merge after a second analyst approves.',
                unit: 'changes',
                target: 100,
                weeks: [[8, 8], [7, 7], [7, 8], [4, 5], [5, 6], [4, 7], [8, 9], [4, 5], [6, 6], [8, 8], [6, 6], [7, 8], [8, 8], [8, 8], [5, 6], [8, 8], [5, 5], [7, 7], [8, 9], [6, 6], [8, 8], [7, 7], [9, 9], [6, 6], [8, 8], [3, 3]],
            },
            {
                area: 'code-review',
                name: 'Model tests',
                description: 'New models merge with not null and unique tests.',
                unit: 'models',
                target: 90,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [3, 4], [5, 6], [3, 3], [5, 5], [6, 7], [4, 4], [6, 6], [5, 5], [4, 4], [1, 1]],
            },
            {
                area: 'code-review',
                name: 'Small PRs',
                description: 'PRs merge with fewer than 400 changed lines.',
                unit: 'PRs',
                target: 75,
                weeks: [[11, 11], [11, 13], [12, 13], [5, 12], [11, 13], [8, 11], [11, 11], [13, 13], [8, 12], [9, 10], [9, 10], [8, 12], [11, 14], [13, 13], [6, 9], [8, 11], [7, 10], [9, 12], [8, 10], [10, 13], [9, 11], [10, 12], [11, 14], [8, 10], [10, 13], [3, 4]],
            },
            {
                area: 'code-review',
                name: 'Fast reviews',
                description: 'PRs get a first review within one working day.',
                unit: 'PRs',
                target: 85,
                weeks: [[13, 13], [7, 9], [10, 10], [7, 8], [14, 14], [12, 12], [13, 13], [13, 13], [9, 10], [11, 13], [7, 8], [9, 10], [8, 9], [9, 9], [7, 9], [9, 11], [9, 10], [10, 12], [9, 10], [11, 13], [10, 11], [11, 12], [12, 14], [9, 10], [12, 13], [4, 4]],
            },
            {
                area: 'releases',
                name: 'Green main',
                description: 'Working days end with main passing every check.',
                unit: 'days',
                target: 80,
                weeks: [[4, 5], [5, 5], [3, 5], [4, 5], [3, 5], [3, 5], [3, 5], [5, 5], [5, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5], [3, 5], [4, 5], [5, 5], [4, 5], [5, 5], [5, 5], [4, 5], [5, 5], [5, 5], [4, 5], [2, 2]],
            },
            {
                area: 'releases',
                name: 'Backfill notes',
                description: 'Backfills are announced a working day before they run.',
                unit: 'backfills',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [1, 2], [3, 3], [1, 1], [2, 2], [3, 4], [2, 2], [3, 3], [2, 2], [1, 1]],
            },
            {
                area: 'releases',
                name: 'Schema versions',
                description: 'Breaking schema changes ship as a new contract version.',
                unit: 'changes',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [1, 2], [1, 1], [3, 3], [2, 2], [1, 1], [2, 2], [1, 1]],
            },
            {
                area: 'reliability',
                name: 'Data freshness',
                description: 'Freshness alerts are triaged the same working day.',
                unit: 'alerts',
                target: 90,
                weeks: [[7, 7], [7, 8], [5, 6], [6, 7], [5, 6], [2, 5], [6, 6], [6, 7], [5, 5], [6, 6], [7, 7], [7, 8], [8, 8], [6, 7], [7, 8], [6, 6], [8, 10], [7, 7], [9, 9], [5, 5], [8, 8], [6, 6], [7, 7], [8, 9], [6, 6], [2, 2]],
            },
            {
                area: 'reliability',
                name: 'Action items',
                description: 'Postmortem action items close by their due date.',
                unit: 'action items',
                target: 80,
                weeks: [[2, 3], [4, 4], [2, 2], [3, 3], [1, 3], [3, 3], [2, 2], [2, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 4], [3, 3], [1, 2], [2, 3], [2, 2], [3, 4], [3, 3], [2, 2], [3, 3], [3, 4], [2, 2], [3, 3], [3, 3], [1, 1]],
            },
            {
                area: 'reliability',
                name: 'Pipeline SLA',
                description: 'Daily pipelines finish by 07:00 UTC, weekends included.',
                unit: 'days',
                target: 85,
                weeks: [[2, 7], [7, 7], [6, 7], [7, 7], [5, 7], [6, 7], [7, 7], [5, 7], [7, 7], [6, 7], [6, 7], [6, 7], [7, 7], [7, 7], [6, 7], [7, 7], [5, 7], [6, 7], [7, 7], [6, 7], [7, 7], [7, 7], [6, 7], [7, 7], [7, 7], [2, 2]],
            },
            {
                area: 'reliability',
                name: 'Handoffs',
                description: 'Every on-call shift ends with a written handoff.',
                unit: 'shifts',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [2, 2], [2, 2], [2, 2], [1, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [1, 1]],
            },
            {
                area: 'knowledge',
                name: 'Help channel',
                description: 'Questions in the data help channel get an answer within one working day.',
                unit: 'questions',
                target: 80,
                weeks: [[12, 16], [11, 12], [14, 16], [11, 12], [15, 16], [12, 16], [13, 17], [12, 14], [11, 12], [13, 13], [10, 13], [11, 14], [8, 11], [10, 11], [10, 14], [10, 12], [12, 16], [11, 13], [12, 15], [9, 11], [14, 17], [12, 14], [10, 12], [12, 15], [11, 13], [4, 5]],
            },
            {
                area: 'knowledge',
                name: 'Office hours',
                description: 'Both weekly office hour slots are held for other teams.',
                unit: 'slots',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [2, 2], [2, 2], [1, 2], [2, 2], [2, 2], [1, 1]],
            },
            {
                area: 'knowledge',
                name: 'ADRs',
                description: 'Architecture changes land with a decision record.',
                unit: 'changes',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [1, 1], [1, 2], [1, 1], [2, 2], [1, 1], [3, 3], [2, 2], [1, 1]],
            },
            {
                area: 'knowledge',
                name: 'Metric catalog',
                description: 'New metrics land with a definition in the catalog.',
                unit: 'metrics',
                target: 100,
                weeks: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [3, 3], [2, 2], [4, 4], [1, 1]],
            },
        ],
    },
    {
        key: 'search',
        label: 'Search',
        practices: [
        ],
    },
];
