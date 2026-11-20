/**
 * components:app/sla-timer: a task's SLAs as live timers (Next Experience's now-sla-timer): time
 * left (or since the breach), elapsed percentage on components:progress, breach / paused / done states.
 *
 *   <SlaTimers sysId={incidentId} />                    every task_sla of the task (active first)
 *   <SlaTimer sla={sla} variant="card" | "compact" | "ribbon" />
 *   const { slas, isLoading } = useTaskSlas(sysId, { activeOnly? })
 *   const clock = slaClock(sla, now)                    { state, remainingMs, percent, label, tone }
 *   formatDuration(ms, { seconds? })                    '2d 3h', '3h 12m', '12m 05s'
 *   <SlaRibbonValue sysId={id} />                       the most urgent active SLA, as a ribbon value
 *
 * Data: task_sla read as the user (utilities:app/list-data; ACLs apply), refreshed by the record
 * watch on task_sla for the task. Ticking is client-side, once a second, only while an SLA runs:
 * time left = planned end − now (the breach instant already follows the SLA's schedule); the
 * percentage starts from the server's business elapsed percentage and runs on to 100 % at the
 * planned end. Paused SLAs show the stored business time left and don't tick. The timer text is
 * role="timer" (not announced every second); state changes (breach) are announced once.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecordWatch } from '@portal/runtime';
import { useList } from 'utilities:app/list-data';
import type { ListRow } from 'utilities:app/list-data';
import { parseGlideDateTime } from 'utilities:app/datetime';
import { Progress } from 'components:progress';
import { Icon } from 'components:icon';
import { cx, Spinner } from 'components:app/field';

export type SlaStage = 'in_progress' | 'paused' | 'achieved' | 'breached' | 'cancelled' | 'completed' | string;

export type TaskSla = {
    sysId: string;
    /** The SLA definition's name. */
    name: string;
    stage: SlaStage;
    stageLabel: string;
    active: boolean;
    hasBreached: boolean;
    /** Epoch ms (NaN when empty). */
    start: number;
    plannedEnd: number;
    end: number;
    /** Business elapsed percentage as stored (else the actual one). */
    percent: number;
    /** Business time left as stored, ms. */
    timeLeftMs: number;
    /** plannedEnd as the user reads it (their format and zone). */
    plannedEndDisplay: string;
    /** When this copy was read (the ticking anchor). */
    readAt: number;
    row: ListRow;
};

const COLUMNS = [
    'sla',
    'stage',
    'active',
    'has_breached',
    'start_time',
    'planned_end_time',
    'end_time',
    'percentage',
    'business_percentage',
    'business_time_left',
    'time_left',
];

const cell = (r: ListRow, f: string) => (r.cells[f] ? r.cells[f].value : '');
const cellDv = (r: ListRow, f: string) => (r.cells[f] ? r.cells[f].displayValue || r.cells[f].value : '');

/** 'YYYY-MM-DD HH:mm:ss' duration (1970-based) → ms. */
function durationMs(v: string): number {
    const t = parseGlideDateTime(v);
    return Number.isFinite(t) ? t : 0;
}

function toSla(r: ListRow, readAt: number): TaskSla {
    const bp = parseFloat(cell(r, 'business_percentage'));
    const p = parseFloat(cell(r, 'percentage'));
    return {
        sysId: r.sysId,
        name: cellDv(r, 'sla') || 'SLA',
        stage: cell(r, 'stage'),
        stageLabel: cellDv(r, 'stage'),
        active: cell(r, 'active') === 'true',
        hasBreached: cell(r, 'has_breached') === 'true',
        start: parseGlideDateTime(cell(r, 'start_time')),
        plannedEnd: parseGlideDateTime(cell(r, 'planned_end_time')),
        end: parseGlideDateTime(cell(r, 'end_time')),
        percent: Number.isFinite(bp) ? bp : Number.isFinite(p) ? p : 0,
        timeLeftMs: durationMs(cell(r, 'business_time_left') || cell(r, 'time_left')),
        plannedEndDisplay: cellDv(r, 'planned_end_time'),
        readAt,
        row: r,
    };
}

const STAGE_ORDER: Record<string, number> = {
    in_progress: 0,
    paused: 1,
    breached: 2,
    achieved: 3,
    completed: 3,
    cancelled: 4,
};

/** A task's SLAs (active first, then by stage and start), live. */
export function useTaskSlas(sysId: string | undefined, o: { activeOnly?: boolean; live?: boolean } = {}) {
    const real = !!sysId && /^[0-9a-f]{32}$/i.test(sysId);
    const query = `task=${sysId || ''}${o.activeOnly ? '^active=true' : ''}`;
    const list = useList(
        {
            table: 'task_sla',
            columns: COLUMNS.join(','),
            query,
            orderBy: [{ field: 'start_time', desc: false }],
            limit: 50,
        },
        { enabled: real }
    );
    useRecordWatch('task_sla', `task=${sysId || ''}`, undefined, { enabled: real && o.live !== false });
    const slas = useMemo(() => {
        const at = Date.now();
        return list.rows
            .map((r) => toSla(r, at))
            .sort(
                (a, b) =>
                    Number(b.active) - Number(a.active) ||
                    (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9) ||
                    a.start - b.start
            );
    }, [list.rows]);
    return { slas, isLoading: list.isLoading, error: list.error, count: list.count };
}

export type SlaState = 'running' | 'warning' | 'breached' | 'paused' | 'achieved' | 'cancelled';

export type SlaClock = {
    state: SlaState;
    /** ms left (negative once breached and still running); paused: the stored business time left. */
    remainingMs: number;
    /** 0–100+ elapsed. */
    percent: number;
    /** 'Breaches in 3h 12m', 'Breached 2d ago', 'Paused · 4h left', 'Achieved', 'Cancelled'. */
    label: string;
    tone: 'default' | 'warning' | 'destructive' | 'success';
    ticking: boolean;
};

/** 2d 3h · 3h 12m · 12m 05s · 45s */
export function formatDuration(ms: number, o: { seconds?: boolean } = {}): string {
    const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return o.seconds !== false ? `${m}m ${String(sec).padStart(2, '0')}s` : `${m}m`;
    return `${sec}s`;
}

/** Long form for screen readers: '2 days 3 hours'. */
function spokenDuration(ms: number): string {
    const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
    const parts: [number, string][] = [
        [Math.floor(s / 86400), 'day'],
        [Math.floor((s % 86400) / 3600), 'hour'],
        [Math.floor((s % 3600) / 60), 'minute'],
    ];
    const out = parts
        .filter(([n]) => n > 0)
        .slice(0, 2)
        .map(([n, u]) => `${n} ${u}${n === 1 ? '' : 's'}`);
    return out.length ? out.join(' ') : 'less than a minute';
}

/** The live state of one SLA at `now`. */
export function slaClock(sla: TaskSla, now: number): SlaClock {
    const stage = sla.stage;
    if (stage === 'cancelled')
        return {
            state: 'cancelled',
            remainingMs: 0,
            percent: sla.percent,
            label: 'Cancelled',
            tone: 'default',
            ticking: false,
        };
    if (stage === 'achieved' || stage === 'completed' || (!sla.active && stage !== 'breached' && !sla.hasBreached))
        return {
            state: 'achieved',
            remainingMs: 0,
            percent: sla.percent,
            label: sla.stageLabel || 'Achieved',
            tone: 'success',
            ticking: false,
        };
    if (!sla.active && (stage === 'breached' || sla.hasBreached))
        return {
            state: 'breached',
            remainingMs: 0,
            percent: sla.percent,
            label: 'Breached',
            tone: 'destructive',
            ticking: false,
        };
    if (stage === 'paused')
        return {
            state: 'paused',
            remainingMs: sla.timeLeftMs,
            percent: sla.percent,
            label: sla.hasBreached
                ? 'Paused · breached'
                : `Paused · ${formatDuration(sla.timeLeftMs, { seconds: false })} left`,
            tone: sla.hasBreached ? 'destructive' : 'default',
            ticking: false,
        };
    const end = sla.plannedEnd;
    if (!Number.isFinite(end))
        return {
            state: 'running',
            remainingMs: 0,
            percent: sla.percent,
            label: sla.stageLabel || 'In progress',
            tone: 'default',
            ticking: false,
        };
    const remaining = end - now;
    let percent = sla.percent;
    if (end > sla.readAt && sla.percent < 100)
        percent = sla.percent + ((100 - sla.percent) * (now - sla.readAt)) / (end - sla.readAt);
    else if (remaining < 0) percent = Math.max(100, sla.percent);
    if (remaining < 0 || sla.hasBreached)
        return {
            state: 'breached',
            remainingMs: remaining,
            percent: Math.max(100, percent),
            label: remaining < 0 ? `Breached ${formatDuration(remaining, { seconds: false })} ago` : 'Breached',
            tone: 'destructive',
            ticking: true,
        };
    const warn = percent >= 75;
    return {
        state: warn ? 'warning' : 'running',
        remainingMs: remaining,
        percent,
        label: `${formatDuration(remaining)} left`,
        tone: warn ? 'warning' : 'default',
        ticking: true,
    };
}

/** A clock that ticks every second while `on`. */
function useTick(on: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!on) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [on]);
    return on ? now : Date.now();
}

const STATE_ICON: Record<SlaState, string> = {
    running: 'timer',
    warning: 'alarm-clock',
    breached: 'circle-alert',
    paused: 'circle-pause',
    achieved: 'circle-check',
    cancelled: 'circle-slash',
};
const STATE_TEXT: Record<SlaState, string> = {
    running: 'text-foreground',
    warning: 'text-amber-700 dark:text-amber-300',
    breached: 'text-destructive',
    paused: 'text-muted-foreground',
    achieved: 'text-emerald-700 dark:text-emerald-300',
    cancelled: 'text-muted-foreground',
};

export type SlaTimerProps = {
    sla: TaskSla;
    variant?: 'card' | 'compact' | 'ribbon';
    className?: string;
};

/** One SLA's timer. */
export function SlaTimer({ sla, variant = 'card', className }: SlaTimerProps) {
    const first = slaClock(sla, Date.now());
    const now = useTick(first.ticking);
    const c = slaClock(sla, now);
    // Announce a state change (e.g. the breach) once.
    const [announce, setAnnounce] = useState('');
    const prev = useRef(c.state);
    useEffect(() => {
        if (prev.current !== c.state) {
            prev.current = c.state;
            setAnnounce(`${sla.name}: ${c.state === 'breached' ? 'breached' : c.label}`);
        }
    }, [c.state]);
    const due = sla.plannedEndDisplay;
    const spoken = c.ticking && c.state !== 'breached' ? `${spokenDuration(c.remainingMs)} left` : c.label;
    const pct = Math.round(Math.min(999, c.percent));
    if (variant === 'ribbon')
        return (
            <span
                className={cx(
                    'inline-flex min-w-0 items-center gap-1.5 text-sm font-medium',
                    STATE_TEXT[c.state],
                    className
                )}
                data-rp-sla-ribbon={sla.sysId}
            >
                <Icon name={STATE_ICON[c.state]} className="size-3.5 shrink-0" aria-hidden="true" />
                <span role="timer" aria-label={`${sla.name}: ${spoken}`} className="truncate tabular-nums">
                    {c.label}
                </span>
            </span>
        );
    return (
        <div
            className={cx(
                'flex min-w-0 flex-col gap-2',
                variant === 'card' ? 'rounded-lg border border-border bg-card p-3' : '',
                c.state === 'breached' && variant === 'card' ? 'border-destructive/40' : '',
                className
            )}
            data-rp-sla-timer={sla.sysId}
            data-state={c.state}
        >
            <div className="flex min-w-0 items-start gap-2">
                <Icon
                    name={STATE_ICON[c.state]}
                    className={cx('mt-0.5 size-4 shrink-0', STATE_TEXT[c.state])}
                    aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-medium" title={sla.name}>
                        {sla.name}
                    </p>
                    {variant === 'card' && due ? (
                        <p className="m-0 text-xs text-muted-foreground">
                            {c.state === 'achieved' || c.state === 'cancelled' ? sla.stageLabel : `Due ${due}`}
                        </p>
                    ) : null}
                </div>
                <span
                    role="timer"
                    aria-label={spoken}
                    className={cx('shrink-0 text-sm font-semibold tabular-nums', STATE_TEXT[c.state])}
                >
                    {c.label}
                </span>
            </div>
            <Progress
                value={Math.min(100, Math.max(0, c.percent))}
                size="sm"
                variant={c.tone}
                getAriaValueText={() => `${pct}% elapsed`}
                aria-label={`${sla.name} elapsed`}
            />
            <p className="m-0 flex justify-between text-xs text-muted-foreground">
                <span>{pct}% elapsed</span>
                {c.state === 'paused' ? <span>Paused</span> : null}
            </p>
            <span className="sr-only" aria-live="polite">
                {announce}
            </span>
        </div>
    );
}

export type SlaTimersProps = {
    sysId: string | undefined;
    activeOnly?: boolean;
    variant?: 'card' | 'compact';
    emptyText?: string;
    className?: string;
};

/** Every SLA of a task. */
export function SlaTimers(props: SlaTimersProps) {
    const t = useTaskSlas(props.sysId, { activeOnly: props.activeOnly });
    if (t.error)
        return (
            <p role="alert" className="m-0 text-sm text-destructive">
                {t.error.message}
            </p>
        );
    if (t.isLoading)
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
                <Spinner label="Loading SLAs" /> Loading SLAs…
            </div>
        );
    if (!t.slas.length)
        return <p className="m-0 text-sm text-muted-foreground">{props.emptyText || 'No SLAs on this record.'}</p>;
    return (
        <ul
            className={cx(
                'm-0 flex list-none flex-col p-0',
                props.variant === 'compact' ? 'gap-4' : 'gap-2',
                props.className
            )}
            aria-label="SLAs"
        >
            {t.slas.map((s) => (
                <li key={s.sysId}>
                    <SlaTimer sla={s} variant={props.variant || 'card'} />
                </li>
            ))}
        </ul>
    );
}

/** The most urgent active SLA of a task as a ribbon value (nothing when none is active). */
export function SlaRibbonValue({ sysId, className }: { sysId: string | undefined; className?: string }) {
    const t = useTaskSlas(sysId, { activeOnly: true });
    const now = Date.now();
    const pick = t.slas
        .filter((s) => s.active)
        .sort((a, b) => slaClock(a, now).remainingMs - slaClock(b, now).remainingMs)[0];
    if (!pick) return null;
    return <SlaTimer sla={pick} variant="ribbon" className={className} />;
}

/** Preview (Studio): explains itself (needs a task). */
export default function SlaTimerPreview() {
    return (
        <p className="p-4 text-sm text-muted-foreground">
            &lt;SlaTimers sysId /&gt;: see the Timeline &amp; SLA page (sp portal).
        </p>
    );
}
