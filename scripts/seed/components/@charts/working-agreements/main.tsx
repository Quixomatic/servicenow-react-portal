import { useId, useLayoutEffect, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    downloadText,
    rowsToCsv,
    copyText,
} from 'components:chart-frame';
import { Button } from 'components:button';
import { ButtonGroup } from 'components:split-button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components:dialog';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { Avatar, AvatarImage, AvatarFallback } from 'components:avatar';
import { Separator } from 'components:separator';
import { Icon } from 'components:icon';
import { PickMenu, utc } from 'components:charts/status-kit';
import { TEAMS, AREAS, STARTERS, WEEK_START, NOW } from './data.ts';
import type { AgreementTeam, AgreementArea, Practice } from './data.ts';
import { tileState, practiceStats, teamStats, pctOf, STATE_LABEL } from './model.ts';
import type { TileState } from './model.ts';
import {
    TRIM,
    TILE_VARS,
    HatchDefs,
    TileMark,
    StateBadge,
    OutlineCount,
    TrendIcon,
    Ring,
    monotonePath,
} from './parts.tsx';

/**
 * components:charts/working-agreements: a heatmap of weekly tiles per team practice (shaded by share of the weekly
 * target: missed / partly / kept / all done, paused hatched, not adopted grey, the current week on track or behind),
 * grouped by practice area with an area rail. Summary strip: this week's on-track count, the team score ring with a
 * weekly score sparkline and last-4 trend, and concentric rings of weeks kept by area. Click a tile for its week card
 * (counts against target, weeks kept, streak, last 4) to pause the current week or edit the practice's target (dialog
 * previews finished weeks at the new target). Team picker, area / slipping filters, sort, CSV and summary exports.
 *
 * Data (records later: one practice per agreement record, weeks from its weekly roll-up):
 *   <WorkingAgreements teams={[{ key, label, avatar?, practices: [{ area, name, description?, unit: 'PRs',
 *       target: 90, weeks: [[done, due] | 'pause reason' | null (not adopted), ...] }] }]}
 *     areas={[{ key, label, icon, color }]} weekStart="2026-04-06" now="2026-09-29T14:20:00Z" starters={[...]} />
 *   weeks run oldest to newest; the last entry is the current, partial week (Monday weekStart + 7 days each).
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type WorkingAgreementsProps = {
    title?: string;
    teams?: AgreementTeam[];
    areas?: AgreementArea[];
    starters?: Omit<Practice, 'weeks'>[];
    weekStart?: string;
    now?: string;
    defaultTeam?: string;
    className?: string;
};

type SortKey = 'share' | 'streak' | 'name';
type Cell = { r: number; c: number };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;
const SORT_NOTE: Record<SortKey, string> = {
    share: 'Lowest kept share first',
    streak: 'Shortest streak first',
    name: 'A to Z',
};
const LEGEND: { label: string; states: TileState[] }[] = [
    { label: 'Missed', states: ['missed'] },
    { label: 'Partly', states: ['partly', 'partly-strong'] },
    { label: 'Kept', states: ['kept'] },
    { label: 'All Done', states: ['done'] },
    { label: 'Paused', states: ['paused'] },
    { label: 'Not Adopted', states: ['not-adopted'] },
    { label: 'On Track', states: ['on-track'] },
    { label: 'Behind', states: ['behind'] },
];

const pct0 = (v: number) => `${Math.round(v * 100)}%`;
const article = (n: number) => (n === 8 || n === 11 || n === 18 || (n >= 80 && n < 90) ? 'an' : 'a');
const singular = (unit: string) =>
    unit.endsWith('xes') ? unit.slice(0, -2) : unit.endsWith('s') ? unit.slice(0, -1) : unit;
const initials = (s: string) => s.slice(0, 2).toUpperCase();

function weekDate(start: string, i: number) {
    return new Date(new Date(`${start}T00:00:00Z`).getTime() + i * 7 * DAY);
}
const md = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
function weekRange(start: string, i: number) {
    const a = weekDate(start, i);
    const b = new Date(a.getTime() + 6 * DAY);
    return a.getUTCMonth() === b.getUTCMonth() ? `${md(a)} to ${b.getUTCDate()}` : `${md(a)} to ${md(b)}`;
}

export function WorkingAgreements({
    title = 'Working Agreements',
    teams: teamsProp = TEAMS,
    areas = AREAS,
    starters = STARTERS,
    weekStart = WEEK_START,
    now = NOW,
    defaultTeam,
    className = '',
}: WorkingAgreementsProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const hatch = `rp-c55-hatch-${uid}`;
    const tableRef = useRef<HTMLTableElement>(null);
    // Narrow cards scroll the matrix; start at the newest weeks (the right end), as ReUI does.
    const scrollRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const sc = scrollRef.current;
        if (sc) sc.scrollLeft = sc.scrollWidth;
    }, []);
    const [teams, setTeams] = useState<AgreementTeam[]>(teamsProp);
    const [teamKey, setTeamKey] = useState(defaultTeam || (teamsProp[0] ? teamsProp[0].key : ''));
    const [areaFilter, setAreaFilter] = useState('all');
    const [slipping, setSlipping] = useState(false);
    const [sort, setSort] = useState<SortKey>('share');
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [hoverCol, setHoverCol] = useState<number | null>(null);
    const [focus, setFocus] = useState<Cell | null>(null);
    const [openCell, setOpenCell] = useState<string | null>(null);
    const [edit, setEdit] = useState<{ name: string; value: number } | null>(null);

    const team = teams.find((t) => t.key === teamKey) || teams[0];
    const practices = team ? team.practices : [];
    const weeksLen = practices.reduce((m, p) => Math.max(m, p.weeks.length), 26);
    const cur = weeksLen - 1;
    const curStart = weekDate(weekStart, cur).getTime();
    const dayOfWeek = Math.min(5, Math.max(1, Math.floor((new Date(now).getTime() - curStart) / DAY) + 1));
    const stats = teamStats(practices);
    const areaByKey: Record<string, AgreementArea> = {};
    areas.forEach((a) => {
        areaByKey[a.key] = a;
    });
    const statsByName: Record<string, ReturnType<typeof practiceStats>> = {};
    practices.forEach((p) => {
        statsByName[p.name] = practiceStats(p);
    });
    const isSlipping = (p: Practice) => statsByName[p.name].trend === 'down' && statsByName[p.name].prev4Of >= 4;

    const order = (list: Practice[]) =>
        list.slice().sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            const sa = statsByName[a.name];
            const sb = statsByName[b.name];
            const d = sort === 'streak' ? sa.streak - sb.streak : sa.share - sb.share;
            return d || a.name.localeCompare(b.name);
        });
    const groups = areas
        .filter((a) => areaFilter === 'all' || a.key === areaFilter)
        .map((a) => ({
            area: a,
            rows: order(practices.filter((p) => p.area === a.key && (!slipping || isSlipping(p)))),
        }))
        .filter((g) => g.rows.length);
    const flat: Practice[] = [];
    groups.forEach((g) => g.rows.forEach((p) => flat.push(p)));
    const viewChanged = areaFilter !== 'all' || slipping || sort !== 'share';

    const patchPractice = (name: string, fn: (p: Practice) => Practice) =>
        setTeams((cur0) =>
            cur0.map((t) =>
                t.key !== teamKey ? t : { ...t, practices: t.practices.map((p) => (p.name === name ? fn(p) : p)) }
            )
        );

    const pauseWeek = (p: Practice) => {
        const before = p.weeks[cur];
        patchPractice(p.name, (x) => ({
            ...x,
            weeks: x.weeks.map((w, i) => (i === cur ? 'Paused for this week' : w)),
        }));
        setOpenCell(null);
        toast.success('Paused this week', {
            description: `${p.name} sits out This Week.`,
            action: {
                label: 'Undo',
                onClick: () =>
                    patchPractice(p.name, (x) => ({ ...x, weeks: x.weeks.map((w, i) => (i === cur ? before : w)) })),
            },
        });
    };

    const saveTarget = (name: string, value: number) => {
        const p = practices.find((x) => x.name === name);
        if (!p) return;
        const prev = p.target;
        patchPractice(name, (x) => ({ ...x, target: value }));
        toast.success('Target saved', {
            description: `${name} now counts as kept at ${value}%.`,
            action: { label: 'Undo', onClick: () => patchPractice(name, (x) => ({ ...x, target: prev })) },
        });
    };

    const adoptStarters = () => {
        const fresh: Practice[] = starters.map((s) => ({
            ...s,
            weeks: Array.from({ length: weeksLen }, (_, i) => (i === cur ? ([0, 0] as [number, number]) : null)),
        }));
        setTeams((cur0) => cur0.map((t) => (t.key === teamKey ? { ...t, practices: fresh } : t)));
        toast.success('Starters adopted', {
            description: `${team ? team.label : 'The team'} starts counting ${fresh.length} agreements this week.`,
        });
    };

    const resetView = () => {
        setAreaFilter('all');
        setSlipping(false);
        setSort('share');
    };

    const cellLabel = (p: Practice, c: number) => {
        const s = tileState(p, c);
        const w = p.weeks[c];
        const head = `${p.name}, week of ${md(weekDate(weekStart, c))}: ${STATE_LABEL[s]}`;
        if (s === 'not-adopted')
            return `${head}, Counted from the week of ${md(weekDate(weekStart, statsByName[p.name].since))}`;
        if (typeof w === 'string') return `${head}, ${w}`;
        if (!Array.isArray(w)) return head;
        const unit = w[1] === 1 ? singular(p.unit) : p.unit;
        return `${head}, ${w[0]} of ${w[1]} ${unit}${c === cur ? ' so far' : ''}, ${pctText(p, c)}`;
    };
    const pctText = (p: Practice, c: number) => {
        const w = p.weeks[c];
        return Array.isArray(w) ? `${Math.round(pctOf(w))}% against ${article(p.target)} ${p.target}% target` : '';
    };

    const moveFocus = (e: any) => {
        const t = e.target as HTMLElement;
        if (!t || !t.dataset || t.dataset.r == null) return;
        let r = Number(t.dataset.r);
        let c = Number(t.dataset.c);
        const k = e.key;
        if (k === 'ArrowRight') c = Math.min(cur, c + 1);
        else if (k === 'ArrowLeft') c = Math.max(0, c - 1);
        else if (k === 'ArrowDown') r = Math.min(flat.length - 1, r + 1);
        else if (k === 'ArrowUp') r = Math.max(0, r - 1);
        else if (k === 'Home') c = 0;
        else if (k === 'End') c = cur;
        else return;
        e.preventDefault();
        setFocus({ r, c });
        const el = tableRef.current
            ? (tableRef.current.querySelector(`button[data-r="${r}"][data-c="${c}"]`) as HTMLElement | null)
            : null;
        if (el) el.focus();
    };
    const tabCell = focus || { r: 0, c: cur };

    // Sparkline (viewBox 120 x 32, y = 32 - 29 * share): weekly kept share over finished weeks.
    const weekly = stats.weekly;
    const pts: [number, number][] = [];
    weekly.forEach((v, i) => {
        if (v != null) pts.push([(i * 120) / Math.max(1, weekly.length - 1), 32 - 29 * v]);
    });
    const line = monotonePath(pts);
    const last = pts[pts.length - 1];
    const trendDown = stats.last4 < stats.prev4;
    const trendUp = stats.last4 > stats.prev4;

    const summary =
        practices.length === 0
            ? `${team ? team.label : 'This team'} has no working agreements yet.`
            : `${team.label}: ${stats.onTrack} of ${stats.active} practices on track this week. Team score ${pct0(stats.score)} (${stats.kept} of ${stats.counted} weeks kept), last 4 weeks ${pct0(stats.last4)}, was ${pct0(stats.prev4)}. ` +
              areas
                  .filter((a) => stats.areas[a.key])
                  .map((a) => `${a.label} ${pct0(stats.areas[a.key].share)}`)
                  .join(', ') +
              '.';

    const csv = () =>
        rowsToCsv(
            practices.map((p) => {
                const s = statsByName[p.name];
                const row: Record<string, any> = {
                    area: areaByKey[p.area] ? areaByKey[p.area].label : p.area,
                    agreement: p.name,
                    target: p.target,
                    kept: s.kept,
                    counted: s.counted,
                    streak: s.streak,
                };
                p.weeks.forEach((w, i) => {
                    row[md(weekDate(weekStart, i))] = Array.isArray(w) ? `${w[0]}/${w[1]}` : w == null ? '' : 'paused';
                });
                return row;
            })
        );

    const teamOptions = teams.map((t) => ({
        value: t.key,
        label: t.label,
        count: t.practices.length,
        icon: (
            <Avatar className="size-4">
                {t.avatar ? <AvatarImage src={t.avatar} alt="" /> : null}
                <AvatarFallback className="text-[7px]">{initials(t.label)}</AvatarFallback>
            </Avatar>
        ),
    }));

    const editP = edit ? practices.find((p) => p.name === edit.name) : undefined;

    const tile = (p: Practice, r: number, c: number) => {
        const s = tileState(p, c);
        const key = `${p.name}|${c}`;
        const w = p.weeks[c];
        const st = statsByName[p.name];
        const isTab = tabCell.r === r && tabCell.c === c;
        return (
            <Popover open={openCell === key} onOpenChange={(o: boolean) => setOpenCell(o ? key : null)}>
                <PopoverTrigger
                    render={
                        <button
                            type="button"
                            data-r={r}
                            data-c={c}
                            data-cell-week={`w${c}`}
                            tabIndex={isTab ? 0 : -1}
                            aria-label={cellLabel(p, c)}
                            onFocus={() => setFocus({ r, c })}
                            className="group/week relative flex h-8 w-full cursor-pointer outline-none focus-visible:z-2 @3xl/matrix:h-5.5"
                        />
                    }
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-1/2 size-4 -translate-1/2 transition-[scale] duration-150 ease-out group-aria-expanded/week:scale-115 motion-reduce:transition-none"
                    >
                        <TileMark state={s} hatch={hatch} focusRing />
                    </span>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    aria-label={`${p.name}, week of ${md(weekDate(weekStart, c))}`}
                    className={`w-64 gap-3 ${TILE_VARS}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-sm leading-5 font-medium text-pretty">{p.name}</span>
                            <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                    {`Week of ${weekRange(weekStart, c)}`}
                                </span>
                            </span>
                        </div>
                        <StateBadge state={s}>{STATE_LABEL[s]}</StateBadge>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="flex h-5 items-center text-sm font-medium tabular-nums">
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {s === 'not-adopted'
                                    ? 'Not adopted yet'
                                    : typeof w === 'string'
                                      ? 'Paused'
                                      : Array.isArray(w)
                                        ? `${w[0]} of ${w[1]} ${w[1] === 1 ? singular(p.unit) : p.unit}${c === cur ? ' so far' : ''}`
                                        : ''}
                            </span>
                        </span>
                        <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                            <span className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                {s === 'not-adopted'
                                    ? `Counted from the week of ${md(weekDate(weekStart, st.since))}`
                                    : typeof w === 'string'
                                      ? w
                                      : pctText(p, c)}
                            </span>
                        </span>
                        {Array.isArray(w) ? (
                            <span aria-hidden="true" className="relative block h-2.5 w-full">
                                <span className="absolute inset-0 rounded-full bg-muted">
                                    <span
                                        className="absolute inset-y-0 start-0 rounded-full bg-(--tile-done)"
                                        style={{ width: `${Math.min(100, pctOf(w))}%` }}
                                    />
                                </span>
                                <span
                                    className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
                                    style={{ insetInlineStart: `calc(${p.target}% - ${(p.target / 100) * 2}px)` }}
                                />
                            </span>
                        ) : null}
                    </div>
                    <Separator />
                    <dl className="m-0 grid grid-cols-3 gap-3">
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <dt className="flex h-4 items-center text-xs text-muted-foreground">
                                <span className={TRIM}>Weeks Kept</span>
                            </dt>
                            <dd className="m-0 flex">
                                <span className="flex h-5 items-center text-sm tabular-nums">
                                    <span aria-hidden="true" className={TRIM}>{`${st.kept}/${st.counted}`}</span>
                                    <span className="sr-only">{`${st.kept} of ${st.counted} weeks kept, ${pct0(st.share)}`}</span>
                                </span>
                            </dd>
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <dt className="flex h-4 items-center text-xs text-muted-foreground">
                                <span className={TRIM}>Streak</span>
                            </dt>
                            <dd className="m-0 flex">
                                <span
                                    className={`flex h-5 items-center gap-1 text-sm tabular-nums ${st.streak ? '' : 'text-muted-foreground'}`}
                                >
                                    <span className={TRIM}>{st.streak}</span>
                                    <span aria-hidden="true" className={`text-xs text-muted-foreground ${TRIM}`}>
                                        wk
                                    </span>
                                    <span className="sr-only">weeks</span>
                                </span>
                            </dd>
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <dt className="flex h-4 items-center text-xs text-muted-foreground">
                                <span className={TRIM}>Last 4</span>
                            </dt>
                            <dd className="m-0 flex">
                                <span className="inline-flex h-5 shrink-0 items-center gap-1 text-sm whitespace-nowrap tabular-nums">
                                    <TrendIcon trend={st.trend} />
                                    <span aria-hidden="true" className={TRIM}>{`${st.last4}/${st.last4Of}`}</span>
                                    <span className="sr-only">
                                        {`${st.trend === 'up' ? 'Up' : st.trend === 'down' ? 'Down' : 'Level'}: ${st.last4} of the last ${st.last4Of} counted weeks kept, ${st.prev4} of ${st.prev4Of} before`}
                                    </span>
                                </span>
                            </dd>
                        </div>
                    </dl>
                    <div className="flex gap-2">
                        {c === cur && Array.isArray(w) ? (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => pauseWeek(p)}>
                                Pause Week
                            </Button>
                        ) : null}
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                                setOpenCell(null);
                                setEdit({ name: p.name, value: p.target });
                            }}
                        >
                            Edit Target
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        );
    };

    const weekCols = Array.from({ length: weeksLen }, (_, i) => i);
    // Column hover as a data attribute (an attribute change), not a class swap: on Next Experience pages
    // class changes restyle the whole document, and a column change flips ~40 cells.
    const COL_HOVER = 'data-[col=on]:bg-muted/50';
    const colOn = (c: number) => (hoverCol === c ? 'on' : 'off');

    const matrix = (
        <div ref={scrollRef} className="relative w-full overflow-x-auto" onMouseLeave={() => setHoverCol(null)}>
            <table
                ref={tableRef}
                onKeyDown={moveFocus}
                className="w-max table-fixed border-collapse text-sm @3xl/matrix:w-full [--matrix-tint:color-mix(in_oklch,var(--muted)_50%,var(--card))]"
            >
                <colgroup>
                    <col className="hidden w-28 @3xl/matrix:table-column" />
                    <col className="w-48 @2xl/matrix:w-60 @3xl/matrix:w-auto" />
                    {weekCols.map((c) => (
                        <col key={c} className="w-6 @lg/matrix:w-9 @3xl/matrix:w-5.5" />
                    ))}
                    <col className="hidden w-16 @3xl/matrix:table-column" />
                </colgroup>
                <thead>
                    <tr className="border-b border-border">
                        <th
                            scope="col"
                            className="hidden border-e border-border px-2 text-center text-xs font-medium text-muted-foreground @3xl/matrix:table-cell"
                        >
                            Area
                        </th>
                        <th
                            scope="col"
                            className="sticky start-0 z-10 bg-card ps-(--frame-panel-px) pe-2 text-left text-xs font-medium text-muted-foreground @max-3xl/matrix:border-e @3xl/matrix:relative @3xl/matrix:z-auto"
                        >
                            <span className="flex h-4 items-center">
                                <span className={TRIM}>Agreement</span>
                                <span className="sr-only">{`, ${SORT_NOTE[sort]}`}</span>
                            </span>
                        </th>
                        {weekCols.map((c) => {
                            const d = weekDate(weekStart, c);
                            const opens = c === 0 || weekDate(weekStart, c - 1).getUTCMonth() !== d.getUTCMonth();
                            return (
                                <th
                                    key={c}
                                    scope="col"
                                    data-week={`w${c}`}
                                    onMouseEnter={() => setHoverCol(c)}
                                    data-col={colOn(c)}
                                    className={`h-auto px-0 py-2 font-normal ${COL_HOVER}`}
                                >
                                    <span className="flex flex-col items-center gap-1">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-4 items-center text-xs text-muted-foreground"
                                        >
                                            <span className={`${TRIM} ${opens ? '' : 'invisible'}`}>
                                                {MONTHS[d.getUTCMonth()]}
                                            </span>
                                        </span>
                                        <span
                                            aria-hidden="true"
                                            className={`relative flex h-5 min-w-5 items-center justify-center text-xs tabular-nums ${c === cur ? 'font-semibold text-foreground after:absolute after:inset-x-1 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-(--tile-kept)' : 'text-muted-foreground'}`}
                                        >
                                            <span className={TRIM}>{d.getUTCDate()}</span>
                                        </span>
                                        <span className="sr-only">{`Week of ${md(d)}${c === cur ? ', this week' : ''}`}</span>
                                    </span>
                                </th>
                            );
                        })}
                        <th
                            scope="col"
                            className="hidden pe-(--frame-panel-px) text-end text-xs font-medium text-muted-foreground @3xl/matrix:table-cell"
                        >
                            Target
                        </th>
                    </tr>
                </thead>
                {groups.map((g) => {
                    const a = stats.areas[g.area.key] || { kept: 0, counted: 0, share: 0 };
                    const areaLabel = `${g.area.label}, ${a.kept} of ${a.counted} weeks kept, ${pct0(a.share)}`;
                    return (
                        <tbody key={g.area.key} className="border-t border-border">
                            <tr className="@3xl/matrix:hidden">
                                <th
                                    scope="rowgroup"
                                    colSpan={weeksLen + 1}
                                    className="ps-(--frame-panel-px) pt-3 pb-1 text-left"
                                >
                                    <span className="sticky start-(--frame-panel-px) flex h-5 w-max items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                                            <Icon name={g.area.icon} />
                                        </span>
                                        <span className={TRIM}>{g.area.label}</span>
                                        <span
                                            aria-hidden="true"
                                            className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
                                        />
                                        <span className="flex h-4 items-center tabular-nums">
                                            <span
                                                aria-hidden="true"
                                                className={TRIM}
                                            >{`${a.kept}/${a.counted} kept`}</span>
                                            <span className="sr-only">{`${a.kept} of ${a.counted} weeks kept, ${pct0(a.share)}`}</span>
                                        </span>
                                    </span>
                                </th>
                            </tr>
                            {g.rows.map((p, ri) => {
                                const r = flat.indexOf(p);
                                const st = statsByName[p.name];
                                const first = ri === 0;
                                const lastRow = ri === g.rows.length - 1;
                                const pad = `${first ? '@3xl/matrix:pt-2' : ''} ${lastRow ? '@3xl/matrix:pb-2' : ''}`;
                                return (
                                    <tr key={p.name} className="group/row">
                                        {first ? (
                                            <th
                                                scope="rowgroup"
                                                rowSpan={g.rows.length}
                                                className="pointer-events-none hidden h-auto border-e border-border bg-card px-3 py-0.5 text-center align-middle font-normal whitespace-normal @3xl/matrix:table-cell"
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger
                                                        render={
                                                            <span
                                                                role="img"
                                                                tabIndex={0}
                                                                aria-label={areaLabel}
                                                                className="pointer-events-auto mx-auto flex w-fit max-w-full min-w-0 flex-col items-center gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                                            />
                                                        }
                                                    >
                                                        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                                                            <Icon name={g.area.icon} />
                                                        </span>
                                                        <span className="flex h-5 max-w-full min-w-0 items-center text-sm font-medium">
                                                            <span
                                                                className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                            >
                                                                {g.area.label}
                                                            </span>
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="tabular-nums">
                                                        {`${a.kept} of ${a.counted} kept`}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </th>
                                        ) : null}
                                        <th
                                            scope="row"
                                            className={`sticky start-0 z-10 h-auto bg-card py-1.5 ps-(--frame-panel-px) pe-2 text-left align-top font-normal group-hover/row:bg-(--matrix-tint) @max-3xl/matrix:border-e @3xl/matrix:relative @3xl/matrix:z-auto @3xl/matrix:py-0 data-[open=true]:bg-(--matrix-tint) ${pad}`}
                                            data-open={!!openCell && openCell.indexOf(`${p.name}|`) === 0}
                                        >
                                            <span className="flex min-w-0 items-start gap-2.5">
                                                <span
                                                    aria-hidden="true"
                                                    className="flex h-5 shrink-0 items-center @3xl/matrix:h-5.5"
                                                >
                                                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                                                </span>
                                                <span className="flex min-w-0 flex-col gap-1">
                                                    <span className="min-w-0 text-[13px] leading-5 font-normal text-pretty whitespace-normal text-foreground/70 @3xl/matrix:truncate @3xl/matrix:leading-5.5">
                                                        {p.name}
                                                        <span className="sr-only">
                                                            {`. ${st.kept} of ${st.counted} weeks kept, ${pct0(st.share)}. Streak ${st.streak} weeks.`}
                                                        </span>
                                                    </span>
                                                    <span className="flex h-5 items-center text-xs whitespace-nowrap text-muted-foreground tabular-nums @3xl/matrix:hidden">
                                                        <span className={TRIM}>{`Target ${p.target}%`}</span>
                                                    </span>
                                                </span>
                                            </span>
                                        </th>
                                        {weekCols.map((c) => (
                                            <td
                                                key={c}
                                                data-week={`w${c}`}
                                                onMouseEnter={() => setHoverCol(c)}
                                                data-col={colOn(c)}
                                                className={`px-0 py-0 align-top ${COL_HOVER} ${pad}`}
                                            >
                                                {tile(p, r, c)}
                                            </td>
                                        ))}
                                        <td
                                            className={`hidden pe-(--frame-panel-px) text-end align-top @3xl/matrix:table-cell ${first ? '@3xl/matrix:pt-2.75' : 'pt-0.75'} ${lastRow ? '@3xl/matrix:pb-2' : ''}`}
                                        >
                                            <span className="flex h-4 items-center justify-end text-sm text-muted-foreground tabular-nums">
                                                <span className={TRIM}>{`${p.target}%`}</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    );
                })}
            </table>
            {practices.length && !groups.length ? (
                <p className="m-0 px-(--frame-panel-px) py-8 text-center text-sm text-muted-foreground">
                    No agreements match this view.
                </p>
            ) : null}
        </div>
    );

    const empty = (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
                <Icon name="handshake" />
            </span>
            <div className="flex max-w-sm flex-col gap-1">
                <span className="text-sm font-medium">No Agreements Yet</span>
                <span className="text-sm text-muted-foreground">
                    {`Adopt the starter set and the ${team ? team.label : ''} team starts counting this week. Every week fills in here.`}
                </span>
            </div>
            <Button size="sm" onClick={adoptStarters}>
                Adopt Starters
            </Button>
        </div>
    );

    const tileHead = (label: string, right?: any) => (
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="flex h-4 items-center text-sm font-medium text-foreground">
                <span className={TRIM}>{label}</span>
            </span>
            {right ? (
                <span className="flex h-4 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    {right}
                </span>
            ) : null}
        </span>
    );

    const ringAreas = areas.filter((a) => stats.areas[a.key]);
    const ringRadii = [33, 25.5, 18, 10.5];

    return (
        <div className={`@container w-full min-w-0 ${TILE_VARS} ${className}`}>
            <HatchDefs id={hatch} />
            <Frame className="w-full min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-64! flex-col gap-px">
                        <FrameTitle role="heading" aria-level={3} className="truncate">
                            {title}
                        </FrameTitle>
                        <FrameDescription className="truncate text-sm tabular-nums">
                            {`Practices kept, weeks of ${md(weekDate(weekStart, 0))} to ${md(weekDate(weekStart, cur))}`}
                        </FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <PickMenu
                            label="Team"
                            menuLabel="Team"
                            value={teamKey}
                            options={teamOptions}
                            onValueChange={(v) => {
                                setTeamKey(v);
                                setFocus(null);
                            }}
                        />
                        <ButtonGroup aria-label="Matrix menus">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" size="icon" aria-label="View options" />}
                                >
                                    <Icon name="settings-2" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Practice Area</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={areaFilter}
                                            onValueChange={(v: string) => setAreaFilter(v)}
                                        >
                                            <DropdownMenuRadioItem value="all">
                                                <span className="flex h-5 min-w-0 items-center gap-2">
                                                    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                                                        <Icon name="funnel" />
                                                    </span>
                                                    <span className={TRIM}>All Areas</span>
                                                </span>
                                                <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                                    {practices.length}
                                                </span>
                                            </DropdownMenuRadioItem>
                                            {areas.map((a) => (
                                                <DropdownMenuRadioItem key={a.key} value={a.key}>
                                                    <span className="flex h-5 min-w-0 items-center gap-2">
                                                        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                                                            <Icon name={a.icon} />
                                                        </span>
                                                        <span
                                                            className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                        >
                                                            {a.label}
                                                        </span>
                                                    </span>
                                                    <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                                        {practices.filter((p) => p.area === a.key).length}
                                                    </span>
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={slipping}
                                            onCheckedChange={(v: boolean) => setSlipping(!!v)}
                                        >
                                            <Icon name="trending-down" />
                                            Slipping Only
                                            <span className="ms-auto ps-6 text-xs text-muted-foreground tabular-nums">
                                                {practices.filter(isSlipping).length}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={sort} onValueChange={(v: SortKey) => setSort(v)}>
                                            <DropdownMenuRadioItem value="share">
                                                <Icon name="calendar-check" />
                                                Kept Share
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="streak">
                                                <Icon name="flame" />
                                                Streak
                                            </DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="name">
                                                <Icon name="type" />
                                                Name
                                            </DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" size="icon" aria-label="More actions" />}
                                >
                                    <Icon name="ellipsis" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Export</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            disabled={!practices.length}
                                            onClick={() => downloadText(`working-agreements-${teamKey}.csv`, csv())}
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                copyText(summary);
                                                toast.success('Summary copied');
                                            }}
                                        >
                                            <Icon name="file-text" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>View</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'grid-3x3' : 'table'} />
                                            {view === 'table' ? 'View as Matrix' : 'View as Table'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled={!viewChanged} onClick={resetView}>
                                            <Icon name="rotate-ccw" />
                                            Reset View
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ButtonGroup>
                    </div>
                </FrameHeader>

                <FramePanel className="grid grid-cols-1 p-0 *:border-border @xl:grid-cols-3 [&>*:not(:first-child)]:border-t @xl:[&>*:not(:first-child)]:border-s @xl:[&>*:not(:first-child)]:border-t-0">
                    <div className="flex min-w-0 flex-col gap-2 px-(--frame-panel-px) py-3">
                        {tileHead('This Week', <span className={TRIM}>{`Day ${dayOfWeek} of 5`}</span>)}
                        <span className="flex items-center justify-between gap-2">
                            <span className="flex items-baseline gap-1.5">
                                <span className="text-2xl leading-none font-medium tracking-tight text-foreground/80 tabular-nums">
                                    {stats.onTrack}
                                </span>
                                <span className="text-sm text-muted-foreground tabular-nums">{`of ${stats.active} on track`}</span>
                            </span>
                            <OutlineCount>{pct0(stats.active ? stats.onTrack / stats.active : 0)}</OutlineCount>
                        </span>
                        <span
                            aria-hidden="true"
                            className="relative flex h-1.5 w-full overflow-hidden rounded-full bg-(--band-blue)/12"
                        >
                            <span
                                className="h-full rounded-full bg-(--band-blue)"
                                style={{ width: `${stats.active ? (stats.onTrack / stats.active) * 100 : 0}%` }}
                            />
                        </span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 px-(--frame-panel-px) py-3">
                        {tileHead(
                            'Team Score',
                            <>
                                <span aria-hidden="true" className={TRIM}>
                                    Last 4
                                </span>
                                <span className="sr-only">{`Last 4 weeks, ${trendDown ? 'down' : trendUp ? 'up' : 'level'}:`}</span>
                                <span className={`${TRIM} font-medium text-foreground/80`}>{pct0(stats.last4)}</span>
                                <TrendIcon
                                    trend={trendDown ? 'down' : trendUp ? 'up' : 'level'}
                                    className="text-current"
                                />
                                <span className="sr-only">{`was ${pct0(stats.prev4)}`}</span>
                            </>
                        )}
                        <div className="flex items-center gap-3">
                            <span className="relative flex size-12 shrink-0 items-center justify-center">
                                <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute inset-0">
                                    <Ring
                                        r={20}
                                        c={24}
                                        sw={5}
                                        share={stats.score}
                                        track="stroke-(--band-violet)/12"
                                        arc="stroke-(--band-violet)"
                                    />
                                </svg>
                                <span className="text-xs font-medium text-foreground/80 tabular-nums">
                                    {pct0(stats.score)}
                                </span>
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="flex h-4 items-center text-xs text-muted-foreground">
                                    <span className={TRIM}>Weekly score</span>
                                </span>
                                <span aria-hidden="true" className="relative me-1 block h-8">
                                    {pts.length ? (
                                        <>
                                            <svg
                                                viewBox="0 0 120 32"
                                                preserveAspectRatio="none"
                                                className="absolute inset-0 size-full overflow-visible"
                                            >
                                                <defs>
                                                    <linearGradient
                                                        id={`rp-c55-fade-${uid}`}
                                                        x1="0"
                                                        x2="0"
                                                        y1="0"
                                                        y2="1"
                                                    >
                                                        <stop
                                                            offset="0"
                                                            style={{
                                                                stopColor: 'var(--band-violet)',
                                                                stopOpacity: 0.16,
                                                            }}
                                                        />
                                                        <stop
                                                            offset="1"
                                                            style={{ stopColor: 'var(--band-violet)', stopOpacity: 0 }}
                                                        />
                                                    </linearGradient>
                                                </defs>
                                                <path
                                                    d={`${line}L${last[0]},32L${pts[0][0]},32Z`}
                                                    fill={`url(#rp-c55-fade-${uid})`}
                                                />
                                                <path
                                                    d={line}
                                                    strokeWidth="1.5"
                                                    vectorEffect="non-scaling-stroke"
                                                    className="fill-none stroke-(--band-violet)"
                                                />
                                            </svg>
                                            <svg
                                                viewBox="0 0 8 8"
                                                className="absolute size-2 -translate-1/2 overflow-visible"
                                                style={{
                                                    left: `${(last[0] / 120) * 100}%`,
                                                    top: `${(last[1] / 32) * 100}%`,
                                                }}
                                            >
                                                <circle
                                                    cx="4"
                                                    cy="4"
                                                    r="2.75"
                                                    strokeWidth="1.5"
                                                    className="fill-card stroke-(--band-violet)"
                                                />
                                            </svg>
                                        </>
                                    ) : null}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 px-(--frame-panel-px) py-3">
                        {tileHead('Weeks Kept by Area')}
                        <div className="flex items-center gap-3">
                            <ul className="m-0 grid min-w-0 flex-1 list-none grid-cols-1 gap-x-3 gap-y-1 p-0 @[22rem]:grid-cols-[auto_1fr]!">
                                {areas.map((a) => {
                                    const s = stats.areas[a.key];
                                    return (
                                        <li
                                            key={a.key}
                                            className="flex h-4 min-w-0 items-center gap-1.5 text-xs tabular-nums"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="size-2 shrink-0 rounded-full"
                                                style={{ background: a.color }}
                                            />
                                            <span
                                                className={`${TRIM} min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap text-muted-foreground`}
                                            >
                                                {a.label}
                                            </span>
                                            <span
                                                className={`${TRIM} ms-auto shrink-0 font-medium text-foreground/80 @[22rem]:ms-0! @xl:sr-only!`}
                                            >
                                                {s ? pct0(s.share) : '-'}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <svg viewBox="0 0 72 72" className="size-12 shrink-0 overflow-visible" aria-hidden="true">
                                {ringAreas.slice(0, 4).map((a, i) => (
                                    <g key={a.key}>
                                        <circle
                                            cx={36}
                                            cy={36}
                                            r={ringRadii[i]}
                                            strokeWidth={5}
                                            className="fill-none stroke-foreground/8"
                                        />
                                        {stats.areas[a.key].share > 0 ? (
                                            <circle
                                                cx={36}
                                                cy={36}
                                                r={ringRadii[i]}
                                                strokeWidth={5}
                                                strokeLinecap="round"
                                                strokeDasharray={`${Math.max(0, stats.areas[a.key].share * 2 * Math.PI * ringRadii[i] - 5)} ${2 * Math.PI * ringRadii[i]}`}
                                                strokeDashoffset={-2.5}
                                                transform="rotate(-90 36 36)"
                                                className="fill-none"
                                                style={{ stroke: a.color }}
                                            >
                                                <title>{`${a.label}, ${stats.areas[a.key].kept} of ${stats.areas[a.key].counted} kept`}</title>
                                            </circle>
                                        ) : null}
                                    </g>
                                ))}
                            </svg>
                        </div>
                    </div>
                </FramePanel>

                <FramePanel className="@container/matrix p-0">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={practices.length ? view : 'chart'}
                        table={
                            <div className="p-(--frame-panel-px)">
                                <ChartDataTable
                                    data={flat.map((p) => ({
                                        label: p.name,
                                        target: p.target,
                                        kept: statsByName[p.name].kept,
                                        share: Math.round(statsByName[p.name].share * 100),
                                        streak: statsByName[p.name].streak,
                                    }))}
                                    index="label"
                                    indexLabel="Agreement"
                                    series={[
                                        { key: 'target', label: 'Target %' },
                                        { key: 'kept', label: 'Weeks kept' },
                                        { key: 'share', label: 'Kept %' },
                                        { key: 'streak', label: 'Streak (wk)' },
                                    ]}
                                    caption={`${team ? team.label : ''} working agreements`}
                                />
                            </div>
                        }
                    >
                        {practices.length ? matrix : empty}
                    </ChartFigure>
                </FramePanel>

                <FrameFooter className="min-h-10 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        {LEGEND.map((l) => (
                            <span key={l.label} className="flex h-4 shrink-0 items-center gap-1.5">
                                <span aria-hidden="true" className="flex gap-0.5">
                                    {l.states.map((s) => (
                                        <span key={s} className="relative size-3 shrink-0">
                                            <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                                                <TileMark state={s} hatch={hatch} rx={3} />
                                            </span>
                                        </span>
                                    ))}
                                </span>
                                <span className={TRIM}>{l.label}</span>
                            </span>
                        ))}
                    </span>
                    <span className="tabular-nums">
                        <span className={TRIM}>{`As of ${utc(now)}`}</span>
                    </span>
                </FrameFooter>
            </Frame>

            <Dialog open={!!edit} onOpenChange={(o: boolean) => (o ? null : setEdit(null))}>
                {edit && editP ? (
                    <DialogContent className={`sm:max-w-md ${TILE_VARS}`}>
                        <DialogHeader>
                            <DialogTitle>Edit Target</DialogTitle>
                            <DialogDescription>{`${editP.name}: ${editP.description || ''}`}</DialogDescription>
                        </DialogHeader>
                        <EditTargetBody
                            p={editP}
                            value={edit.value}
                            hatch={hatch}
                            weekStart={weekStart}
                            onChange={(v) => setEdit({ name: edit.name, value: v })}
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEdit(null)}>
                                Cancel
                            </Button>
                            <Button
                                disabled={edit.value === editP.target}
                                onClick={() => {
                                    saveTarget(edit.name, edit.value);
                                    setEdit(null);
                                }}
                            >
                                <Icon name="target" />
                                <span className={TRIM}>Save Target</span>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                ) : null}
            </Dialog>
        </div>
    );
}

function EditTargetBody({
    p,
    value,
    hatch,
    weekStart,
    onChange,
}: {
    p: Practice;
    value: number;
    hatch: string;
    weekStart: string;
    onChange: (v: number) => void;
}) {
    const cur = p.weeks.length - 1;
    const now0 = practiceStats(p);
    const next = practiceStats(p, value);
    const diff = next.kept - now0.kept;
    const finished = Array.from({ length: cur }, (_, i) => i);
    const set = (v: number) => onChange(Math.max(50, Math.min(100, v)));
    return (
        <div className="flex flex-col gap-4">
            <div className="flex w-full flex-col gap-2">
                <label htmlFor={`rp-c55-target-${p.name}`} className="w-fit text-sm font-medium">
                    Weekly target
                </label>
                <div className="flex h-8 w-32 items-stretch overflow-hidden rounded-md border border-input">
                    <button
                        type="button"
                        aria-label="Lower the target"
                        disabled={value <= 50}
                        onClick={() => set(value - 5)}
                        className="flex w-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-50 [&_svg]:size-4"
                    >
                        <Icon name="minus" />
                    </button>
                    <input
                        id={`rp-c55-target-${p.name}`}
                        inputMode="numeric"
                        aria-roledescription="Number field"
                        value={`${value}%`}
                        onChange={(e: any) => {
                            const n = parseInt(String(e.target.value).replace(/\D/g, ''), 10);
                            if (!isNaN(n)) set(n);
                        }}
                        onKeyDown={(e: any) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                set(value + 5);
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                set(value - 5);
                            }
                        }}
                        className="w-full min-w-0 flex-1 border-x border-input bg-transparent px-2.5 py-1 text-center text-sm tabular-nums outline-none"
                    />
                    <button
                        type="button"
                        aria-label="Raise the target"
                        disabled={value >= 100}
                        onClick={() => set(value + 5)}
                        className="flex w-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-50 [&_svg]:size-4"
                    >
                        <Icon name="plus" />
                    </button>
                </div>
                <p className="m-0 text-sm text-muted-foreground">
                    {`Kept at ${value}% of the ${p.unit} due, partly kept from ${Math.round(value * 0.75 * 100) / 100}%.`}
                </p>
            </div>
            <div className="flex flex-col gap-3">
                <span className="flex h-4 items-center text-xs text-muted-foreground">
                    <span
                        className={TRIM}
                    >{`Finished weeks at ${value}%, ${md(weekDate(weekStart, 0))} to ${md(weekDate(weekStart, cur - 1))}`}</span>
                </span>
                <div
                    role="img"
                    aria-label={`${next.kept} of ${next.counted} finished weeks kept at ${value}%`}
                    className="flex gap-1"
                >
                    {finished.map((i) => (
                        <span key={i} className="relative h-8 min-w-0 flex-1">
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 top-1/2 aspect-square -translate-y-1/2"
                            >
                                <TileMark state={tileState(p, i, value)} hatch={hatch} rx={3} />
                            </span>
                        </span>
                    ))}
                </div>
                <p className="m-0 text-sm text-muted-foreground tabular-nums">
                    {`${next.kept} of ${next.counted} weeks kept, ${diff === 0 ? 'the same as now' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than now`}.`}
                </p>
            </div>
        </div>
    );
}

export default WorkingAgreements;
