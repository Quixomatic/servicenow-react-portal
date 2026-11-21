import { useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure } from 'components:chart';
import { Frame, FrameHeader, FrameTitle, FrameDescription, FramePanel } from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
} from 'components:dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components:dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { Avatar, AvatarImage, AvatarFallback } from 'components:avatar';
import { Separator } from 'components:separator';
import { Icon } from 'components:icon';
import { StatusBadge } from 'components:charts/composed-kit';
import { OutlineBadge, useInterval } from 'components:charts/slope-kit';
import { agoShort } from 'components:charts/status-kit';
import { LANES, SERVICES, RELEASES, NOW } from './data';
import type { Lane, LaneDeploy, LaneService, Release } from './data';

/**
 * components:charts/release-lanes: environment lanes (Staging / Sandbox / Production) side by side, each a panel
 * with its health badge, hosts, the latest deploy (service, version, commit, message, a live 6-stage meter, author
 * and timing) and a collapsible service version matrix (Services button). Promote buttons between lanes open a
 * confirm dialog listing the versions that move; production holds at its Promote gate until approved. A demo
 * clock (4x) advances queued / running stages. Lane menus freeze and resume deploys; toasts offer Undo.
 *
 * Data (records later: one lane per environment, versions from the deployed CI records):
 *   <ReleaseLanes lanes={[{ key, label, hosts: string[], trigger?, frozen?, stages: [{ label, seconds,
 *       gate?: { title, action, checks, done } }], versions: { [serviceKey]: 'v1.2.3' },
 *       failed?: { [serviceKey]: 'v1.2.4' }, deploy?: { service, version, from, commit, message, author, avatar?,
 *       status: 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed', stage, progress?, startedAt,
 *       waitingSince? } }]}
 *     services={[{ key, icon }]} releases={[{ service, version, commit, message, author, avatar? }]}
 *     now="2026-09-29T14:20:00Z" live speed={4} />
 *   Lanes promote left to right (lanes[i] into lanes[i + 1]).
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type ReleaseLanesProps = {
    title?: string;
    lanes?: Lane[];
    services?: LaneService[];
    releases?: Release[];
    now?: string;
    /** Run the demo clock. */
    live?: boolean;
    /** Demo seconds per real second. */
    speed?: number;
    defaultExpanded?: boolean;
    className?: string;
};

type Dlg = { kind: 'promote'; from: number } | { kind: 'gate'; lane: number } | null;

const RUNNING_TONE =
    'border-foreground/10 bg-foreground/10 text-foreground dark:border-foreground/25 dark:bg-foreground/15';
const QUEUE_DELAY = 4;

const toMs = (v: string | number | undefined) => (v == null ? 0 : typeof v === 'number' ? v : new Date(v).getTime());
const clock = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const initials = (name: string) =>
    name
        .split(/\s+/)
        .map((p) => p[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
const active = (d?: LaneDeploy) => !!d && (d.status === 'queued' || d.status === 'running' || d.status === 'waiting');
const busy = (l: Lane) => active(l.deploy) || !!(l.queue && l.queue.length);

/** Version a lane is on or heading to for one service. */
function target(l: Lane, svc: string): string {
    if (active(l.deploy) && l.deploy!.service === svc) return l.deploy!.version;
    const q = (l.queue || []).filter((d) => d.service === svc);
    return q.length ? q[q.length - 1].version : l.versions[svc];
}

function aheadOf(up: Lane, down: Lane | undefined, services: LaneService[]): string[] {
    if (!down) return [];
    return services.map((s) => s.key).filter((k) => up.versions[k] && up.versions[k] !== target(down, k));
}

function Dot() {
    return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />;
}

function ServiceName({ icon, name, className = '' }: { icon?: string; name: string; className?: string }) {
    return (
        <span className={`flex min-w-0 ${className}`}>
            <span className="flex min-w-0 items-center gap-2 [&_svg:not([class*=size-])]:size-4">
                {icon ? <Icon name={icon} /> : null}
                <span className="truncate">{name}</span>
            </span>
        </span>
    );
}

function FromTo({ from }: { from: string }) {
    return (
        <>
            <span className="text-muted-foreground">{from}</span>
            <Icon name="arrow-right" className="size-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">to</span>
        </>
    );
}

/** Badge shell with literal tone classes (no merge with a default tone). */
function ToneBadge({ className, children }: { className: string; children?: any }) {
    return (
        <span
            data-slot="badge"
            className={`relative inline-flex h-5 w-fit min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3 ${className}`}
        >
            {children}
        </span>
    );
}

function LaneBadge({ lane }: { lane: Lane }) {
    const failed = Object.keys(lane.failed || {}).length;
    if (lane.frozen)
        return (
            <ToneBadge className="border-border bg-background text-info dark:bg-input/30">
                <Icon name="lock" />
                Frozen
            </ToneBadge>
        );
    if (failed)
        return (
            <ToneBadge className="border-border bg-background text-destructive tabular-nums dark:bg-input/30">
                {`${failed} failed`}
            </ToneBadge>
        );
    return <ToneBadge className="border-border bg-background text-success dark:bg-input/30">Healthy</ToneBadge>;
}

function DeployBadge({ status }: { status: LaneDeploy['status'] }) {
    if (status === 'succeeded') return <StatusBadge tone="success">Succeeded</StatusBadge>;
    if (status === 'failed') return <StatusBadge tone="destructive">Failed</StatusBadge>;
    if (status === 'waiting') return <StatusBadge tone="warning">Waiting</StatusBadge>;
    if (status === 'queued') return <OutlineBadge className="font-medium">Queued</OutlineBadge>;
    return (
        <ToneBadge className={RUNNING_TONE}>
            <Icon name="loader-circle" className="size-3 animate-spin motion-reduce:animate-none" />
            Running
        </ToneBadge>
    );
}

function Meter({ lane, d, onGate }: { lane: Lane; d: LaneDeploy; onGate: () => void }) {
    const n = lane.stages.length;
    const cur = lane.stages[d.stage];
    const prev = lane.stages[d.stage - 1];
    const label =
        d.status === 'succeeded'
            ? `Rollout complete, ${n} of ${n} stages passed`
            : d.status === 'queued'
              ? 'Waiting for a runner'
              : d.status === 'waiting'
                ? `Waiting for ${cur?.gate?.action || 'approval'} at ${prev?.label || 'gate'}`
                : `${cur?.label || 'Stage'} ${d.status === 'failed' ? 'failed' : 'running'}, ${d.stage} of ${n} stages passed`;
    const segs = lane.stages.map((s, i) => {
        if (d.status === 'succeeded' || i < d.stage)
            return <span key={i} aria-hidden="true" className="relative overflow-hidden rounded-full bg-success" />;
        if (i === d.stage && d.status === 'running')
            return (
                <span key={i} aria-hidden="true" className="relative overflow-hidden rounded-full bg-foreground/20">
                    <span
                        className="absolute inset-0 origin-left bg-foreground transition-transform duration-200 ease-linear motion-reduce:transition-none"
                        style={{ transform: `scaleX(${Math.min(1, d.progress || 0).toFixed(2)})` }}
                    />
                </span>
            );
        if (i === d.stage && d.status === 'waiting')
            return <span key={i} aria-hidden="true" className="relative overflow-hidden rounded-full bg-warning" />;
        if (i === d.stage && d.status === 'failed')
            return <span key={i} aria-hidden="true" className="relative overflow-hidden rounded-full bg-destructive" />;
        return <span key={i} aria-hidden="true" className="relative overflow-hidden rounded-full bg-muted" />;
    });
    return (
        <div className="flex min-h-6 min-w-0 items-center gap-2">
            <span
                role="img"
                aria-label={label}
                className="grid h-1.5 min-w-16 flex-1 gap-1"
                style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            >
                {segs}
            </span>
            {d.status === 'waiting' ? (
                <Button size="xs" className="shrink-0" onClick={onGate}>
                    {cur?.gate?.action || 'Approve'}
                </Button>
            ) : (
                <span className="shrink-0 text-xs tabular-nums">
                    {d.status === 'succeeded'
                        ? `${n}/${n}`
                        : d.status === 'queued'
                          ? 'Queued'
                          : d.status === 'failed'
                            ? `Failed at ${cur?.label || 'stage'}`
                            : cur?.label}
                </span>
            )}
        </div>
    );
}

export function ReleaseLanes({
    title = 'Environments',
    lanes: lanesProp = LANES,
    services = SERVICES,
    releases = RELEASES,
    now = NOW,
    live = true,
    speed = 4,
    defaultExpanded = false,
    className = '',
}: ReleaseLanesProps) {
    const [lanes, setLanes] = useState<Lane[]>(lanesProp);
    const [nowMs, setNowMs] = useState(() => toMs(now));
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [dlg, setDlg] = useState<Dlg>(null);
    const icons: Record<string, string> = {};
    services.forEach((s) => {
        icons[s.key] = s.icon;
    });
    const tickMs = Math.max(50, Math.round(1000 / Math.max(0.1, speed)));

    // One demo second per tick: queued runs start, running stages advance, finished runs hand over to the queue.
    useInterval(
        () => {
            const t = nowMs + 1000;
            setNowMs(t);
            setLanes((cur) =>
                cur.map((l) => {
                    let d = l.deploy;
                    let queue = l.queue || [];
                    let versions = l.versions;
                    if ((!d || !active(d)) && queue.length) {
                        d = { ...queue[0], status: 'queued', stage: 0, progress: 0, startedAt: t };
                        queue = queue.slice(1);
                    }
                    if (!d) return l;
                    if (d.status === 'queued') {
                        if (l.frozen || t - toMs(d.startedAt) < QUEUE_DELAY * 1000) return { ...l, deploy: d, queue };
                        d = { ...d, status: 'running', stage: 0, progress: 0 };
                    } else if (d.status === 'running') {
                        const stage = l.stages[d.stage];
                        const progress = (d.progress || 0) + 1 / Math.max(1, stage ? stage.seconds : 60);
                        if (progress < 1) d = { ...d, progress };
                        else {
                            const next = d.stage + 1;
                            if (next >= l.stages.length) {
                                d = { ...d, stage: l.stages.length, progress: 0, status: 'succeeded' };
                                versions = { ...versions, [d.service]: d.version };
                            } else if (l.stages[next].gate) {
                                d = { ...d, stage: next, progress: 0, status: 'waiting', waitingSince: t };
                            } else d = { ...d, stage: next, progress: 0 };
                        }
                    } else return l;
                    return { ...l, deploy: d, queue, versions };
                })
            );
        },
        live ? tickMs : null
    );

    const patchLane = (i: number, fn: (l: Lane) => Lane) => setLanes((cur) => cur.map((l, j) => (j === i ? fn(l) : l)));

    const freeze = (i: number) => {
        const l = lanes[i];
        const next = !l.frozen;
        patchLane(i, (x) => ({ ...x, frozen: next }));
        const undo = { label: 'Undo', onClick: () => patchLane(i, (x) => ({ ...x, frozen: !next })) };
        if (next)
            toast.success(`${l.label} frozen`, { description: 'New deploys wait until you resume', action: undo });
        else toast.success(`${l.label} resumed`, { description: 'Queued deploys can start again', action: undo });
    };

    const releaseFor = (svc: string, version: string, up: Lane): Release => {
        const r = releases.find((x) => x.service === svc && x.version === version);
        if (r) return r;
        if (up.deploy && up.deploy.service === svc && up.deploy.version === version) return up.deploy;
        return {
            service: svc,
            version,
            commit: '-------',
            message: `Promote ${svc} ${version}`,
            author: 'Release bot',
        };
    };

    const promote = (from: number) => {
        const up = lanes[from];
        const down = lanes[from + 1];
        const keys = aheadOf(up, down, services);
        if (!down || !keys.length) return;
        const before = down;
        const runs: LaneDeploy[] = keys.map((k) => ({
            ...releaseFor(k, up.versions[k], up),
            from: down.versions[k],
            status: 'queued',
            stage: 0,
            progress: 0,
            startedAt: nowMs,
        }));
        patchLane(from + 1, (x) => ({ ...x, deploy: runs[0], queue: runs.slice(1) }));
        toast.success('Promotion started', {
            description: `${runs.length} deploy${runs.length === 1 ? '' : 's'} to ${down.label}`,
            action: {
                label: 'Undo',
                onClick: () => patchLane(from + 1, (x) => ({ ...x, deploy: before.deploy, queue: before.queue })),
            },
        });
    };

    const approve = (i: number) => {
        const l = lanes[i];
        const d = l.deploy;
        if (!d || d.status !== 'waiting') return;
        const gate = l.stages[d.stage]?.gate;
        const waiting = d;
        patchLane(i, (x) => ({ ...x, deploy: { ...waiting, status: 'running', progress: 0 } }));
        toast.success(gate?.done || 'Approved', {
            description: `${d.service} ${d.version} to 100%`,
            action: { label: 'Undo', onClick: () => patchLane(i, (x) => ({ ...x, deploy: waiting })) },
        });
    };

    const deployCount = services.length;
    const summary =
        `${deployCount} services across ${lanes.length} environments. ` +
        lanes
            .map((l) => {
                const d = l.deploy;
                if (!d) return `${l.label}: no deploys.`;
                const state =
                    d.status === 'running'
                        ? `running ${l.stages[d.stage]?.label || ''}`
                        : d.status === 'waiting'
                          ? 'waiting for approval'
                          : d.status;
                return `${l.label}${l.frozen ? ' (frozen)' : ''}: ${d.service} ${d.version} ${state}, ${Math.min(d.stage, l.stages.length)} of ${l.stages.length} stages passed.`;
            })
            .join(' ');

    const laneIds = lanes.map((l) => `rp-c38-services-${l.key}`).join(' ');

    const dlgFrom = dlg && dlg.kind === 'promote' ? lanes[dlg.from] : undefined;
    const dlgTo = dlg && dlg.kind === 'promote' ? lanes[dlg.from + 1] : undefined;
    const dlgKeys = dlgFrom ? aheadOf(dlgFrom, dlgTo, services) : [];
    const gateLane = dlg && dlg.kind === 'gate' ? lanes[dlg.lane] : undefined;
    const gateDeploy = gateLane?.deploy;
    const gate = gateLane && gateDeploy ? gateLane.stages[gateDeploy.stage]?.gate : undefined;
    const gatePrev = gateLane && gateDeploy ? gateLane.stages[gateDeploy.stage - 1] : undefined;

    return (
        <section aria-labelledby="rp-c38-title" className={`@container w-full min-w-0 ${className}`}>
            <Frame className="w-full min-w-0">
                <FrameHeader className="flex-row items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle id="rp-c38-title" className="text-sm font-semibold">
                            {title}
                        </FrameTitle>
                        <FrameDescription className="text-xs tabular-nums">
                            {`${deployCount} services across ${lanes.length} environments`}
                        </FrameDescription>
                    </div>
                    <Button
                        variant="outline"
                        className="group shrink-0"
                        aria-expanded={expanded}
                        aria-controls={laneIds}
                        onClick={() => setExpanded((v) => !v)}
                    >
                        Services
                        <Icon
                            name="chevron-down"
                            className="transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
                        />
                    </Button>
                </FrameHeader>
                <ChartFigure title={title} summary={summary}>
                    <div className="grid grid-cols-1 gap-1 @4xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] @4xl:gap-0">
                        {lanes.map((l, i) => {
                            const d = l.deploy;
                            const down = lanes[i + 1];
                            const ahead = aheadOf(l, down, services);
                            const downBusy = !!down && busy(down);
                            const canPromote = !!down && !down.frozen && !downBusy && ahead.length > 0;
                            const reason = !down
                                ? ''
                                : down.frozen
                                  ? `${down.label} frozen`
                                  : downBusy
                                    ? `${down.label} rolling out`
                                    : ahead.length
                                      ? `${ahead.length} ahead of ${down.label}`
                                      : `In sync with ${down.label}`;
                            const upBusy = active(d);
                            const matrixNote = down ? reason : `${services.length} services`;
                            const footer = !d
                                ? ''
                                : d.status === 'queued'
                                  ? `Queued ${clock((nowMs - toMs(d.startedAt)) / 1000)}`
                                  : d.status === 'running'
                                    ? `Running ${clock((nowMs - toMs(d.startedAt)) / 1000)}`
                                    : d.status === 'waiting'
                                      ? `Waiting ${clock((nowMs - toMs(d.waitingSince || d.startedAt)) / 1000)}`
                                      : agoShort(toMs(d.startedAt), nowMs);
                            return (
                                <div key={l.key} className="contents">
                                    <FramePanel data-lane={l.key} className="flex min-w-0 flex-col gap-4">
                                        <div className="flex min-w-0 flex-col gap-0.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <h3 className="m-0 min-w-0 truncate text-sm font-medium text-foreground">
                                                        {l.label}
                                                    </h3>
                                                    <LaneBadge lane={l} />
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="-me-1.5 shrink-0"
                                                                aria-label={`${l.label} actions`}
                                                            />
                                                        }
                                                    >
                                                        <Icon name="ellipsis" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuGroup>
                                                            <DropdownMenuLabel>{l.label}</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => freeze(i)}>
                                                                <Icon name={l.frozen ? 'play' : 'lock'} />
                                                                {l.frozen ? 'Resume deploys' : 'Freeze deploys'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <p className="m-0 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                                {l.hosts.map((h, hi) => (
                                                    <span key={h} className="contents">
                                                        {hi ? <Dot /> : null}
                                                        <span className="truncate font-mono">{h}</span>
                                                    </span>
                                                ))}
                                                {l.trigger ? (
                                                    <>
                                                        <Dot />
                                                        <span className="truncate">{l.trigger}</span>
                                                    </>
                                                ) : null}
                                            </p>
                                        </div>
                                        {d ? (
                                            <div className="flex min-w-0 flex-col gap-2">
                                                <div className="flex min-w-0 items-center justify-between gap-2">
                                                    <ServiceName
                                                        icon={icons[d.service]}
                                                        name={d.service}
                                                        className="text-sm font-medium text-foreground"
                                                    />
                                                    <DeployBadge status={d.status} />
                                                </div>
                                                <div className="flex min-w-0 items-baseline gap-2">
                                                    <span className="text-xl font-semibold tracking-tight tabular-nums">
                                                        {d.version}
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground">{`from ${d.from}`}</span>
                                                </div>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <OutlineBadge className="shrink-0 font-mono tabular-nums">
                                                        {d.commit}
                                                    </OutlineBadge>
                                                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                                                        {d.message}
                                                    </span>
                                                </div>
                                                <Meter
                                                    lane={l}
                                                    d={d}
                                                    onGate={() => setDlg({ kind: 'gate', lane: i })}
                                                />
                                                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="flex min-w-0 items-center gap-1.5">
                                                        <Avatar className="size-4 after:mix-blend-darken dark:after:mix-blend-lighten">
                                                            {d.avatar ? <AvatarImage src={d.avatar} alt="" /> : null}
                                                            <AvatarFallback className="text-[7px]">
                                                                {initials(d.author)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="truncate">{d.author}</span>
                                                    </span>
                                                    <Dot />
                                                    <span className="shrink-0 whitespace-nowrap tabular-nums">
                                                        {footer}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="m-0 text-sm text-muted-foreground">No deploys yet</p>
                                        )}
                                        {expanded ? (
                                            <div id={`rp-c38-services-${l.key}`} className="flex flex-col gap-4">
                                                <Separator />
                                                <div className="flex min-w-0 flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                                                        <span className="shrink-0">Services</span>
                                                        <span className="min-w-0 truncate tabular-nums">
                                                            {matrixNote}
                                                        </span>
                                                    </div>
                                                    <ul
                                                        aria-label={`${l.label} versions`}
                                                        className="m-0 flex list-none flex-col p-0"
                                                    >
                                                        {services.map((s) => {
                                                            const v = l.versions[s.key] || '-';
                                                            const failedV = (l.failed || {})[s.key];
                                                            const moving =
                                                                upBusy && d && d.service === s.key ? d : undefined;
                                                            const isAhead = ahead.indexOf(s.key) >= 0;
                                                            const held =
                                                                isAhead && !!down && (downBusy || !!down.frozen);
                                                            return (
                                                                <li
                                                                    key={s.key}
                                                                    className="flex h-7 min-w-0 items-center gap-1.5"
                                                                >
                                                                    <ServiceName
                                                                        icon={s.icon}
                                                                        name={s.key}
                                                                        className="flex-1 text-sm"
                                                                    />
                                                                    {failedV ? (
                                                                        <StatusBadge tone="destructive">{`${failedV} failed`}</StatusBadge>
                                                                    ) : null}
                                                                    {held ? (
                                                                        <StatusBadge tone="warning">Held</StatusBadge>
                                                                    ) : null}
                                                                    {moving ? (
                                                                        <span className="flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums">
                                                                            <FromTo from={moving.from} />
                                                                            <span className="font-medium text-foreground">
                                                                                {moving.version}
                                                                            </span>
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className={`shrink-0 font-mono text-xs tabular-nums ${isAhead && !held ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                                                                        >
                                                                            {v}
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : null}
                                    </FramePanel>
                                    {down ? (
                                        <div className="flex items-center justify-center py-1 @4xl:px-1.5 @4xl:py-0">
                                            <Tooltip>
                                                <TooltipTrigger
                                                    render={
                                                        <Button
                                                            variant="outline"
                                                            size="icon-sm"
                                                            aria-disabled={!canPromote}
                                                            aria-label={`Promote ${l.label} to ${down.label}, ${reason}`}
                                                            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                                                            onClick={() =>
                                                                canPromote ? setDlg({ kind: 'promote', from: i }) : null
                                                            }
                                                        />
                                                    }
                                                >
                                                    <span className="flex rotate-90 @4xl:rotate-0">
                                                        <Icon name="arrow-right" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>{`Promote to ${down.label}`}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </ChartFigure>
            </Frame>

            <Dialog open={!!dlg} onOpenChange={(o: boolean) => (o ? null : setDlg(null))}>
                {dlg && dlg.kind === 'promote' && dlgFrom && dlgTo ? (
                    <DialogContent role="alertdialog" showCloseButton={false} className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{`Promote to ${dlgTo.label}?`}</DialogTitle>
                            <DialogDescription>{`These versions move from ${dlgFrom.label} to ${dlgTo.label}.`}</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-2">
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {dlgKeys.map((k) => (
                                    <li key={k} className="flex min-w-0 items-center gap-2 text-sm">
                                        <ServiceName icon={icons[k]} name={k} className="flex-1" />
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {target(dlgTo, k)}
                                        </span>
                                        <Icon name="arrow-right" className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="sr-only">to</span>
                                        <span className="font-mono text-xs font-medium text-foreground">
                                            {dlgFrom.versions[k]}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDlg(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    promote(dlg.from);
                                    setDlg(null);
                                }}
                            >
                                Promote
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                ) : null}
                {dlg && dlg.kind === 'gate' && gateLane && gateDeploy ? (
                    <DialogContent role="alertdialog" showCloseButton={false} className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>{gate?.title || 'Approve rollout?'}</DialogTitle>
                            <DialogDescription>
                                <span className="font-medium text-foreground">{`${gateDeploy.service} ${gateDeploy.version}`}</span>
                                {` takes all traffic on ${gateLane.hosts[0]}. ${gatePrev?.label || 'The previous stage'} passed ${gate?.checks || 0} of ${gate?.checks || 0} checks.`}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="grid grid-cols-2">
                            <Button variant="outline" onClick={() => setDlg(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    approve(dlg.lane);
                                    setDlg(null);
                                }}
                            >
                                {gate?.action || 'Approve'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                ) : null}
            </Dialog>
        </section>
    );
}

export default ReleaseLanes;
