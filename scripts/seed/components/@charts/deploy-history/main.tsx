import { useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    downloadText,
    rowsToCsv,
    copyText,
} from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components:dialog';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { Icon } from 'components:icon';
import { StatusBadge } from 'components:charts/composed-kit';
import { OutlineBadge, useInterval } from 'components:charts/slope-kit';
import { SepDot, PickMenu, agoShort, utc } from 'components:charts/status-kit';
import { STAGES, SERVICES, ENVIRONMENTS, DEPLOYS, NOW } from './data';
import type { Deploy, DeployStatus, Service, StageDef } from './data';

/**
 * components:charts/deploy-history: a status tracker listing pipeline runs: service tile, name + environment,
 * version + deploy ID, status badge, a segmented 6-stage meter (passed / failed / live progress / pending) with a
 * hover card listing every stage and its duration, and when it started. Environment filter with counts, a New deploy
 * dialog (service, version, environment, strategy) that starts a simulated run, and copy-ID / CSV / JSON exports.
 *
 * Data (records later: one row per deployment record, stages from its pipeline steps):
 *   <DeployHistory deploys={[{ id, service, env, version, at: ISO, status: 'running' | 'succeeded' | 'failed' |
 *       'rolled-back', passed: metered stages passed, durations: [seconds per stage that ran], progress?: 0-1 }]}
 *       services={[{ key, icon, versions }]} environments={[{ value, label }]}
 *       stages={[{ key, label, gate? }]} now="2026-09-29T14:19Z" live />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type DeployHistoryProps = {
    title?: string;
    deploys?: Deploy[];
    services?: Service[];
    environments?: { value: string; label: string }[];
    stages?: StageDef[];
    now?: string;
    live?: boolean;
    className?: string;
};

const STATUS_LABEL: Record<DeployStatus, string> = {
    running: 'Running',
    succeeded: 'Succeeded',
    failed: 'Failed',
    'rolled-back': 'Rolled back',
};
const STATUS_TONE: Record<DeployStatus, string> = {
    running: 'muted',
    succeeded: 'success',
    failed: 'destructive',
    'rolled-back': 'muted',
};
const STRATEGIES = [
    { value: 'canary', label: 'Canary', icon: 'bird', hint: 'Shifts traffic in steps, gated on health' },
    { value: 'rolling', label: 'Rolling', icon: 'refresh-cw', hint: 'Replaces pods in waves' },
    { value: 'blue-green', label: 'Blue-green', icon: 'split', hint: 'Switches all traffic at once' },
];
const DEFAULT_DURATIONS = [50, 100, 32, 150, 150, 200];

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

function stageState(d: Deploy, i: number): 'passed' | 'failed' | 'running' | 'pending' {
    if (i < d.passed) return 'passed';
    if (i === d.passed) {
        if (d.status === 'running') return 'running';
        if (d.status === 'failed' || d.status === 'rolled-back') return 'failed';
    }
    return 'pending';
}

function describe(d: Deploy, metered: StageDef[]) {
    const at = metered[d.passed] ? metered[d.passed].label : '';
    const of = `${d.passed} of ${metered.length} stages passed`;
    if (d.status === 'running') return `${at} running, ${of}`;
    if (d.status === 'succeeded') return `Rollout complete, ${of}`;
    if (d.status === 'rolled-back') return `Rolled back at ${at}, ${of}`;
    return `Failed at ${at}, ${of}`;
}

function IconTile({ icon }: { icon: string }) {
    return (
        <span
            aria-hidden="true"
            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-background bg-muted text-foreground shadow-[0_1px_3px_0_rgb(0_0_0/0.14)] dark:border dark:border-border [&_svg]:size-4.5"
        >
            <Icon name={icon} />
        </span>
    );
}

function StageMeter({ d, stages }: { d: Deploy; stages: StageDef[] }) {
    const metered = stages.filter((s) => !s.gate);
    const label = describe(d, metered);
    const elapsed = d.durations.reduce(
        (s, v, i) =>
            s +
            (i < d.passed
                ? v
                : i === d.passed && d.status === 'running'
                  ? v * (d.progress || 0)
                  : i === d.passed
                    ? v
                    : 0),
        0
    );
    let m = -1;
    const list = stages.map((s) => {
        if (!s.gate) m += 1;
        const idx = s.gate ? m + 1 : m;
        const state = s.gate ? (d.passed >= idx ? 'passed' : 'pending') : stageState(d, idx);
        return { s, idx, state };
    });
    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                delay={120}
                closeDelay={80}
                render={
                    <button
                        type="button"
                        aria-label={label}
                        className="flex w-full min-w-0 cursor-help items-center gap-2 rounded-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring/50"
                    />
                }
            >
                <span
                    role="img"
                    aria-label={label}
                    className="grid h-1.5 min-w-16 flex-1 grid-cols-6 gap-1"
                    style={{ gridTemplateColumns: `repeat(${metered.length}, minmax(0, 1fr))` }}
                >
                    {metered.map((s, i) => {
                        const st = stageState(d, i);
                        return (
                            <span
                                key={s.key}
                                aria-hidden="true"
                                className={`relative overflow-hidden rounded-full ${st === 'passed' ? 'bg-success' : st === 'failed' ? 'bg-destructive' : st === 'running' ? 'bg-foreground/20' : 'bg-muted'}`}
                            >
                                {st === 'running' ? (
                                    <span
                                        className="absolute inset-0 origin-left bg-foreground transition-transform duration-200 ease-linear motion-reduce:transition-none"
                                        style={{ transform: `scaleX(${d.progress || 0})` }}
                                    />
                                ) : null}
                            </span>
                        );
                    })}
                </span>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums">{`${d.passed}/${metered.length}`}</span>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-72 gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                        {d.status === 'running' && metered[d.passed]
                            ? metered[d.passed].label
                            : d.status === 'succeeded'
                              ? 'Rollout complete'
                              : `${STATUS_LABEL[d.status]} at ${metered[d.passed] ? metered[d.passed].label : ''}`}
                    </span>
                    <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{clock(elapsed)}</span>
                </div>
                <div role="separator" className="h-px w-full shrink-0 bg-border" />
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
                    {list.map(({ s, idx, state }) => (
                        <li key={s.key} className="flex min-w-0 items-center gap-2">
                            <span
                                role="img"
                                aria-label={state[0].toUpperCase() + state.slice(1)}
                                className={`flex size-4 shrink-0 items-center justify-center ${state === 'passed' ? 'text-success' : state === 'failed' ? 'text-destructive' : state === 'running' ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                                {state === 'passed' ? (
                                    <Icon name="circle-check" className="size-4" />
                                ) : state === 'failed' ? (
                                    <Icon name="circle-x" className="size-4" />
                                ) : state === 'running' ? (
                                    <Icon
                                        name="loader-circle"
                                        className="size-4 animate-spin motion-reduce:animate-none"
                                    />
                                ) : (
                                    <span className="size-4 rounded-full border border-dashed border-current" />
                                )}
                            </span>
                            <span
                                className={`min-w-0 flex-1 truncate ${state === 'pending' ? 'text-muted-foreground' : ''}`}
                            >
                                {s.label}
                            </span>
                            <span
                                className={`shrink-0 tabular-nums ${state === 'running' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                            >
                                {s.gate || state === 'pending'
                                    ? ''
                                    : state === 'running'
                                      ? `${Math.round((d.progress || 0) * 100)}%`
                                      : d.durations[idx] != null
                                        ? clock(d.durations[idx])
                                        : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}

function FieldSelect({ id, label, value, options, onValueChange, mono, description }: any) {
    return (
        <div role="group" className="flex w-full flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <PickMenu
                label={label}
                value={value}
                options={options}
                onValueChange={onValueChange}
                align="start"
                className={`h-9 w-full ${mono ? 'font-mono' : ''}`}
            />
            {description ? <p className="m-0 text-sm text-muted-foreground">{description}</p> : null}
        </div>
    );
}

export function DeployHistory({
    title = 'Deploy History',
    deploys = DEPLOYS,
    services = SERVICES,
    environments = ENVIRONMENTS,
    stages = STAGES,
    now = NOW,
    live = true,
    className = '',
}: DeployHistoryProps) {
    const [list, setList] = useState(deploys);
    const [env, setEnv] = useState('all');
    const [elapsed, setElapsed] = useState(0);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ service: 'search-indexer', version: '', env: 'staging', strategy: 'rolling' });
    const metered = stages.filter((s) => !s.gate);
    const nowMs = new Date(now).getTime() + elapsed * 1000;
    const running = list.some((d) => d.status === 'running');

    useInterval(
        () => {
            setElapsed((e) => e + 1);
            setList((cur) =>
                cur.map((d) => {
                    if (d.status !== 'running') return d;
                    const expected = d.durations[d.passed] || DEFAULT_DURATIONS[d.passed] || 60;
                    const progress = (d.progress || 0) + Math.max(0.02, 6 / expected);
                    if (progress < 1) return { ...d, progress };
                    const passed = d.passed + 1;
                    const durations = d.durations.slice(0, passed);
                    if (passed >= metered.length)
                        return { ...d, passed, durations, progress: 0, status: 'succeeded' as DeployStatus };
                    return {
                        ...d,
                        passed,
                        durations: durations.concat([DEFAULT_DURATIONS[passed] || 60]),
                        progress: 0,
                    };
                })
            );
        },
        live && running ? 1000 : null
    );

    const serviceOf = (k: string) => services.find((s) => s.key === k) || { key: k, icon: 'box', versions: [] };
    const envLabel = (v: string) => (environments.find((e) => e.value === v) || { label: v }).label;
    const shown = env === 'all' ? list : list.filter((d) => d.env === env);
    const counts: Record<string, number> = { all: list.length };
    environments.forEach((e) => {
        counts[e.value] = list.filter((d) => d.env === e.value).length;
    });

    const svc = serviceOf(form.service);
    const version =
        form.version && svc.versions.indexOf(form.version) >= 0
            ? form.version
            : svc.versions[svc.versions.length - 1] || 'v0.0.1';
    const current = list.find((d) => d.service === form.service && d.env === form.env && d.status === 'succeeded');
    const strategy = STRATEGIES.find((s) => s.value === form.strategy) || STRATEGIES[0];
    const submit = (e: any) => {
        e.preventDefault();
        const max = Math.max(0, ...list.map((d) => Number(d.id.replace(/\D/g, '')) || 0));
        const id = `DEP-${max + 1}`;
        setList((cur) => [
            {
                id,
                service: form.service,
                env: form.env,
                version,
                at: new Date(nowMs).toISOString(),
                status: 'running',
                passed: 0,
                durations: [DEFAULT_DURATIONS[0]],
                progress: 0,
            },
            ...cur,
        ]);
        setOpen(false);
        toast.success(`${id} started`, {
            description: `${form.service} ${version} to ${envLabel(form.env)}, ${strategy.label.toLowerCase()}`,
        });
    };

    const rows = shown.map((d) => ({
        id: d.id,
        service: d.service,
        environment: envLabel(d.env),
        version: d.version,
        status: STATUS_LABEL[d.status],
        stages: `${d.passed}/${metered.length}`,
        started: d.at,
    }));
    const csvColumns = [
        { key: 'id', label: 'Deploy' },
        { key: 'service', label: 'Service' },
        { key: 'environment', label: 'Environment' },
        { key: 'version', label: 'Version' },
        { key: 'status', label: 'Status' },
        { key: 'stages', label: 'Stages passed' },
        { key: 'started', label: 'Started (UTC)' },
    ];
    const summary =
        `${shown.length} deploys${env === 'all' ? '' : ` to ${envLabel(env)}`}: ` +
        shown
            .map(
                (d) =>
                    `${d.service} ${d.version} (${d.id}) ${STATUS_LABEL[d.status].toLowerCase()}, ${d.passed} of ${metered.length} stages`
            )
            .join('; ') +
        '.';

    const listView = (
        <div role="list" aria-label="Deploy history" className="flex w-full flex-col divide-y divide-border">
            {shown.length ? (
                shown.map((d) => {
                    const s = serviceOf(d.service);
                    return (
                        <div
                            key={d.id}
                            role="listitem"
                            className="flex w-full flex-wrap items-center gap-2.5 px-(--frame-panel-px) py-2.5"
                        >
                            <IconTile icon={s.icon} />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div className="flex w-fit max-w-full min-w-0 items-center gap-2 text-sm leading-snug font-medium">
                                    <span className="min-w-0 truncate">{d.service}</span>
                                    <OutlineBadge className="hidden @2xl/panel:inline-flex!">
                                        {envLabel(d.env)}
                                    </OutlineBadge>
                                </div>
                                <p className="m-0 flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
                                    <span className="truncate">{d.version}</span>
                                    <SepDot />
                                    <span className="shrink-0">{d.id}</span>
                                </p>
                            </div>
                            <div className="order-last flex basis-full items-center justify-between gap-4 @2xl/panel:order-none! @2xl/panel:basis-auto!">
                                <span className="flex shrink-0 items-center gap-1.5 @2xl/panel:w-24">
                                    <OutlineBadge className="@2xl/panel:hidden!">{envLabel(d.env)}</OutlineBadge>
                                    <StatusBadge
                                        tone={STATUS_TONE[d.status]}
                                        className={
                                            d.status === 'running'
                                                ? 'border-foreground/10! bg-foreground/10! text-foreground!'
                                                : d.status === 'rolled-back'
                                                  ? 'border-foreground/15! bg-foreground/10! text-foreground!'
                                                  : ''
                                        }
                                    >
                                        {d.status === 'running' ? (
                                            <Icon
                                                name="loader-circle"
                                                className="size-3 animate-spin motion-reduce:animate-none"
                                            />
                                        ) : null}
                                        {STATUS_LABEL[d.status]}
                                    </StatusBadge>
                                </span>
                                <div className="max-w-36 min-w-0 flex-1 @2xl/panel:w-36 @2xl/panel:flex-none!">
                                    <StageMeter d={d} stages={stages} />
                                </div>
                            </div>
                            <div className="flex w-24 shrink-0 flex-col items-end gap-0.5">
                                <span className="text-sm whitespace-nowrap tabular-nums">
                                    {utc(d.at).replace(' UTC', '')}
                                </span>
                                <span className="text-xs whitespace-nowrap text-muted-foreground">
                                    {agoShort(d.at, nowMs)}
                                </span>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                    No deploys yet.
                </div>
            )}
        </div>
    );

    const envOptions = [{ value: 'all', label: 'All' }].concat(environments);

    return (
        <div className={`w-full min-w-0 ${className}`}>
            <Frame className="min-w-0">
                <FrameHeader className="@container/header min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                        <FrameTitle role="heading">{title}</FrameTitle>
                        <FrameDescription aria-live="polite" className="text-xs whitespace-nowrap tabular-nums">
                            {`${shown.length} deploy${shown.length === 1 ? '' : 's'}`}
                        </FrameDescription>
                    </div>
                    <div
                        role="group"
                        aria-label="Environment"
                        className="order-last flex w-full flex-row items-center @xl/header:order-none! @xl/header:w-fit!"
                    >
                        {envOptions.map((o) => {
                            const on = env === o.value;
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    aria-pressed={on}
                                    aria-label={`${o.label}, ${counts[o.value] || 0} deploys`}
                                    onClick={() => setEnv(o.value)}
                                    className={`inline-flex h-7 flex-1 items-center justify-center gap-1.5 border border-border px-2 text-[0.8rem] font-medium whitespace-nowrap outline-none not-first:border-l-0 first:rounded-l-lg last:rounded-r-lg hover:bg-muted focus-visible:relative focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 @xl/header:flex-none! dark:border-input ${on ? 'bg-card text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <span>{o.label}</span>
                                    <span className="text-muted-foreground tabular-nums">{counts[o.value] || 0}</span>
                                </button>
                            );
                        })}
                    </div>
                    <Button size="sm" onClick={() => setOpen(true)}>
                        <Icon name="plus" />
                        New deploy
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="ghost" size="icon-sm" aria-label="More actions" title="More actions" />
                            }
                        >
                            <Icon name="ellipsis" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Deploys</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (!list[0]) return;
                                        copyText(list[0].id);
                                        toast.success(`Copied ${list[0].id}`);
                                    }}
                                >
                                    <Icon name="copy" />
                                    Copy latest deploy ID
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Data</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        downloadText('deploy-history.csv', rowsToCsv(rows, csvColumns));
                                        toast.success('Deploys exported as CSV');
                                    }}
                                >
                                    <Icon name="file-spreadsheet" />
                                    Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        downloadText('deploy-history.json', JSON.stringify(shown, null, 2));
                                        toast.success('Deploys exported as JSON');
                                    }}
                                >
                                    <Icon name="file-braces" />
                                    Export JSON
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>View</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                    <Icon name={view === 'table' ? 'list' : 'sheet'} />
                                    {view === 'table' ? 'View as List' : 'View as Table'}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </FrameHeader>
                <FramePanel className="@container/panel min-w-0 p-0">
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <div className="p-(--frame-panel-px)">
                                <ChartDataTable
                                    data={shown.map((d) => ({
                                        label: `${d.service} ${d.version} (${d.id})`,
                                        passed: d.passed,
                                    }))}
                                    index="label"
                                    indexLabel="Deploy"
                                    series={[{ key: 'passed', label: 'Stages passed' }]}
                                    valueFormatter={(v: number) => `${v} of ${metered.length}`}
                                    caption="Deploy history"
                                />
                            </div>
                        }
                    >
                        {listView}
                    </ChartFigure>
                </FramePanel>
            </Frame>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Deploy</DialogTitle>
                        <DialogDescription>Ship one release to one environment.</DialogDescription>
                    </DialogHeader>
                    <form id="rp-c39-new-deploy" className="flex flex-col gap-4" noValidate onSubmit={submit}>
                        <FieldSelect
                            id="rp-c39-service"
                            label="Service"
                            value={form.service}
                            onValueChange={(v: string) => setForm({ ...form, service: v, version: '' })}
                            options={services.map((s) => ({
                                value: s.key,
                                label: s.key,
                                icon: <Icon name={s.icon} />,
                            }))}
                        />
                        <FieldSelect
                            id="rp-c39-version"
                            label="Version"
                            mono
                            value={version}
                            onValueChange={(v: string) => setForm({ ...form, version: v })}
                            options={svc.versions.map((v) => ({ value: v, label: v }))}
                            description={
                                current
                                    ? `${envLabel(form.env)} runs ${current.version}.`
                                    : `Nothing on ${envLabel(form.env)} yet.`
                            }
                        />
                        <FieldSelect
                            id="rp-c39-env"
                            label="Environment"
                            value={form.env}
                            onValueChange={(v: string) => setForm({ ...form, env: v })}
                            options={environments}
                        />
                        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                            <legend className="mb-3 text-sm font-medium">Strategy</legend>
                            <div role="group" aria-label="Strategy" className="flex w-fit flex-row items-center">
                                {STRATEGIES.map((s) => {
                                    const on = form.strategy === s.value;
                                    return (
                                        <button
                                            key={s.value}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setForm({ ...form, strategy: s.value })}
                                            className={`inline-flex h-7 items-center justify-center gap-1.5 border border-border px-2 text-[0.8rem] font-medium whitespace-nowrap outline-none not-first:border-l-0 first:rounded-l-lg last:rounded-r-lg hover:bg-muted focus-visible:relative focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input [&_svg]:size-3.5 ${on ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            <Icon name={s.icon} />
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="m-0 text-sm text-muted-foreground">{strategy.hint}</p>
                        </fieldset>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" form="rp-c39-new-deploy">
                            <Icon name="rocket" />
                            Deploy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default DeployHistory;
