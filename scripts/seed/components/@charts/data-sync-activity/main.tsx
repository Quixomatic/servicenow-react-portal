import { useMemo, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { ChartContainer, ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    SegmentedControl,
    rowsToCsv,
    downloadText,
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
import { Icon } from 'components:icon';
import { series, SeriesScope, useEnterAnimation } from 'components:charts/chart-kit';
import { TEXT_TRIM, ToneBadge, CheckMenu, niceStep, short } from 'components:charts/bar-more-kit';
import { HOURS, SOURCES, OPEN_MINUTES } from './data';
import type { SyncHour, Source, SourceHour } from './data';

/**
 * components:charts/data-sync-activity: hourly sync activity across all connections as rounded columns on a
 * hatched track: stacked succeeded / slow / failed runs (Runs) or rows synced (Rows), with KPI tiles (runs,
 * landed, failed with the failing connection, rows synced), a source filter that re-sums everything, a
 * refresh, a tooltip per hour (outcome split, connection needing attention or the per-source rows and the
 * top connection) and CSV / summary exports.
 *
 *   <DataSyncActivity />                                  sample data
 *   <DataSyncActivity hours={[{ hour, databases: { s, slow, f, rows, top?, issue? }, … }]} sources={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type DataSyncActivityProps = {
    title?: string;
    description?: string;
    hours?: SyncHour[];
    sources?: Source[];
    /** Minutes elapsed in the last (open) hour. */
    openMinutes?: number;
    defaultMeasure?: 'runs' | 'rows';
    className?: string;
};

type Row = {
    i: number;
    label: string;
    range: string;
    s: number;
    slow: number;
    f: number;
    runs: number;
    rows: number;
    bySource: Record<string, number>;
    top?: { name: string; rows: number };
    issues: { name: string; n: number; kind: string; source: string }[];
    open: boolean;
};

const pad = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

const STATUS = {
    failing: { label: 'Failing', dot: 'bg-destructive' },
    slow: { label: 'Slow runs', dot: 'bg-warning' },
    healthy: { label: 'Healthy', dot: 'bg-success' },
};
const statusOf = (r: Row) => (r.f > 0 ? STATUS.failing : r.slow > 0 ? STATUS.slow : STATUS.healthy);

function Sep() {
    return <div role="separator" className="h-px w-full shrink-0 bg-border" />;
}

function TipLine({ label, value, note, dot, icon, strong }: any) {
    return (
        <span className="flex h-4 items-center gap-2 text-muted-foreground">
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {dot ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} /> : null}
                <span
                    className={`flex min-w-0 items-center gap-1.5 [&_svg:not([class*=size-])]:size-3.5 ${strong ? 'text-foreground' : ''}`}
                >
                    {icon ? <Icon name={icon} /> : null}
                    <span className={`min-w-0 ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                        {label}
                    </span>
                </span>
            </span>
            <span
                className={`font-mono font-medium tabular-nums ${TEXT_TRIM} ${value === 0 || value === '0' ? 'text-muted-foreground' : 'text-foreground'}`}
            >
                {value}
            </span>
            {note != null ? <span className={`w-9 text-end tabular-nums ${TEXT_TRIM}`}>{note}</span> : null}
        </span>
    );
}

const share = (v: number, t: number) => `${t ? Math.round((v / t) * 100) : 0}%`;
const vsAvg = (v: number, avg: number) => {
    const d = avg ? Math.round((v / avg - 1) * 100) : 0;
    return `${d > 0 ? '+' : ''}${d}% vs avg`;
};

function TooltipBody({
    row,
    measure,
    avg,
    sources,
    openMinutes,
}: {
    row: Row;
    measure: 'runs' | 'rows';
    avg: number;
    sources: Source[];
    openMinutes: number;
}) {
    const st = statusOf(row);
    const icons: Record<string, string> = {};
    sources.forEach((s) => {
        icons[s.key] = s.icon;
    });
    return (
        <div className="grid w-64 min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <span className="flex h-4 items-center justify-between gap-3">
                        <span className={`font-medium tabular-nums ${TEXT_TRIM}`}>{row.range}</span>
                        <span className="flex h-4 shrink-0 items-center gap-1.5">
                            {measure === 'runs' ? (
                                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${st.dot}`} />
                            ) : null}
                            <span className={`text-muted-foreground ${TEXT_TRIM}`}>{st.label}</span>
                        </span>
                    </span>
                    <span className="flex h-5 items-center gap-1.5">
                        <span className={`text-sm font-semibold tabular-nums ${TEXT_TRIM}`}>
                            {measure === 'runs' ? row.runs : short(row.rows)}
                        </span>
                        <span className={`text-muted-foreground ${TEXT_TRIM}`}>
                            {measure === 'runs' ? 'runs' : 'rows synced'}
                        </span>
                        <span className={`ms-auto text-muted-foreground tabular-nums ${TEXT_TRIM}`}>
                            {row.open
                                ? `In progress, ${openMinutes} min`
                                : vsAvg(measure === 'runs' ? row.runs : row.rows, avg)}
                        </span>
                    </span>
                </div>
                <Sep />
                {measure === 'runs' ? (
                    <>
                        <div className="flex flex-col gap-1">
                            <TipLine label="Succeeded" dot="bg-success" value={row.s} note={share(row.s, row.runs)} />
                            <TipLine label="Slow" dot="bg-warning" value={row.slow} note={share(row.slow, row.runs)} />
                            <TipLine label="Failed" dot="bg-destructive" value={row.f} note={share(row.f, row.runs)} />
                        </div>
                        {row.issues.length ? (
                            <>
                                <Sep />
                                <div className="flex flex-col gap-1">
                                    <span className="flex h-4 items-center justify-between gap-3 text-muted-foreground">
                                        <span className={TEXT_TRIM}>Needs attention</span>
                                        <span className={`tabular-nums ${TEXT_TRIM}`}>
                                            {row.issues.length} {row.issues.length === 1 ? 'connection' : 'connections'}
                                        </span>
                                    </span>
                                    {row.issues.map((x) => (
                                        <TipLine
                                            key={x.name}
                                            label={x.name}
                                            icon={icons[x.source]}
                                            strong
                                            value={x.n}
                                            note={x.kind}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : null}
                        <Sep />
                        <TipLine label="Rows synced" value={short(row.rows)} />
                    </>
                ) : (
                    <>
                        <div className="flex flex-col gap-1">
                            {sources.map((s) => (
                                <TipLine
                                    key={s.key}
                                    label={s.label}
                                    icon={s.icon}
                                    value={short(row.bySource[s.key] || 0)}
                                    note={share(row.bySource[s.key] || 0, row.rows)}
                                />
                            ))}
                        </div>
                        {row.top ? (
                            <>
                                <Sep />
                                <div className="flex flex-col gap-1">
                                    <span className="flex h-4 items-center justify-between gap-3 text-muted-foreground">
                                        <span className={TEXT_TRIM}>Top connection</span>
                                    </span>
                                    <TipLine
                                        label={row.top.name}
                                        strong
                                        value={short(row.top.rows)}
                                        note={share(row.top.rows, row.rows)}
                                    />
                                </div>
                            </>
                        ) : null}
                        <Sep />
                        <div className="flex flex-col gap-1">
                            <TipLine label="Runs" value={row.runs} />
                            {row.f ? <TipLine label="Failed runs" value={row.f} /> : null}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/** Stacked outcome segments (succeeded at the base, then slow, then failed) with 2px gaps; or one rows column. */
function SyncColumn(props: any) {
    const { x, width, payload: r, yTop, plotBottom, measure, dim } = props;
    if (r == null || !yTop) return null;
    const scale = (v: number) => plotBottom - yTop(v);
    const segs =
        measure === 'runs'
            ? [
                  { key: 's', v: r.s, fill: 'var(--color-succeeded)' },
                  { key: 'slow', v: r.slow, fill: 'var(--color-partial)' },
                  { key: 'f', v: r.f, fill: 'var(--color-failed)' },
              ]
            : [{ key: 'rows', v: r.rows, fill: 'var(--color-rows)' }];
    const live = segs.filter((s) => s.v > 0);
    let y = plotBottom;
    const out: any[] = [];
    live.forEach((s, k) => {
        if (k > 0) y -= 2;
        const h = Math.max(0, scale(s.v) - (k > 0 ? 1 : 0) - (k < live.length - 1 ? 1 : 0));
        const top = y - h;
        out.push(
            <rect
                key={s.key}
                x={x}
                width={width}
                y={top}
                height={h}
                rx={Math.min(4, h / 2)}
                ry={Math.min(4, h / 2)}
                fill={s.fill}
            />
        );
        y = top;
    });
    return (
        <g
            className="transition-opacity duration-150 ease-out motion-reduce:transition-none"
            style={{ opacity: dim ? 0.4 : 1 }}
        >
            {out}
        </g>
    );
}

export function DataSyncActivity({
    title = 'Sync Activity',
    description = 'Harbor Ops connections, last 24 hours',
    hours = HOURS,
    sources = SOURCES,
    openMinutes = OPEN_MINUTES,
    defaultMeasure = 'runs',
    className,
}: DataSyncActivityProps) {
    const allKeys = sources.map((s) => s.key);
    const [measure, setMeasure] = useState<'runs' | 'rows'>(defaultMeasure);
    const [keys, setKeys] = useState<string[]>(allKeys);
    const [active, setActive] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [synced, setSynced] = useState('Synced 2 min ago');
    const [replay, setReplay] = useState(0);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const rootRef = useRef<HTMLDivElement>(null);

    const config = useMemo(
        () => ({
            succeeded: series('emerald-500', 'emerald-500', 'Succeeded'),
            partial: series('yellow-500', 'yellow-500', 'Slow'),
            failed: series('red-600', 'red-400', 'Failed'),
            rows: series('violet-500', 'violet-500', 'Rows synced'),
        }),
        []
    );

    const rows: Row[] = useMemo(
        () =>
            hours.map((h, i) => {
                const open = i === hours.length - 1 && openMinutes < 60;
                const r: Row = {
                    i,
                    label: open ? 'Now' : pad(h.hour),
                    range: `${pad(h.hour)} to ${open ? `${pad(h.hour).slice(0, 3)}${String(openMinutes).padStart(2, '0')}` : pad(h.hour + 1)} UTC`,
                    s: 0,
                    slow: 0,
                    f: 0,
                    runs: 0,
                    rows: 0,
                    bySource: {},
                    issues: [],
                    open,
                };
                keys.forEach((k) => {
                    const v: SourceHour | undefined = h[k];
                    if (!v) return;
                    r.s += v.s;
                    r.slow += v.slow;
                    r.f += v.f;
                    r.rows += v.rows;
                    r.bySource[k] = v.rows;
                    if (v.top && (!r.top || v.top.rows > r.top.rows)) r.top = v.top;
                    if (v.issue) r.issues.push({ ...v.issue, source: k });
                });
                r.runs = r.s + r.slow + r.f;
                return r;
            }),
        [hours, keys, openMinutes]
    );

    const n = rows.length;
    const elapsed = n - 1 + openMinutes / 60;
    const totalRuns = rows.reduce((a, r) => a + r.runs, 0);
    const totalOk = rows.reduce((a, r) => a + r.s + r.slow, 0);
    const totalSlow = rows.reduce((a, r) => a + r.slow, 0);
    const totalFailed = rows.reduce((a, r) => a + r.f, 0);
    const totalRows = rows.reduce((a, r) => a + r.rows, 0);
    const last = rows[n - 1];
    const avgRuns = n > 1 ? (totalRuns - (last.open ? last.runs : 0)) / (last.open ? n - 1 : n) : totalRuns;
    const avgRows = n > 1 ? (totalRows - (last.open ? last.rows : 0)) / (last.open ? n - 1 : n) : totalRows;
    const peak = rows.reduce((a, r) => (r.rows > a.rows ? r : a), rows[0]);
    const failing: Record<string, number> = {};
    rows.forEach((r) =>
        r.issues.forEach((x) => {
            if (x.kind === 'failed') failing[x.name] = (failing[x.name] || 0) + x.n;
        })
    );
    const failNames = Object.keys(failing).sort((a, b) => failing[b] - failing[a]);

    const max = measure === 'runs' ? Math.max(...rows.map((r) => r.runs)) : Math.max(...rows.map((r) => r.rows));
    const axis = niceStep(max, 4, measure === 'runs');
    const yWidth = measure === 'runs' ? 30 : 44;

    useEnterAnimation(
        rootRef,
        [
            {
                selector: '.recharts-yAxis-tick-labels text',
                keyframes: { opacity: [0, 1] },
                duration: 0.2,
                ease: 'easeOut',
            },
        ],
        [measure, keys.join(','), replay, view]
    );

    const selSources = sources.filter((s) => keys.indexOf(s.key) >= 0);
    const connections = selSources.reduce((a, s) => a + s.connections, 0);
    const activeConn = selSources.reduce((a, s) => a + s.active, 0);
    const scopeLabel =
        keys.length === sources.length
            ? 'Times in UTC'
            : keys.length === 1
              ? `${selSources[0].label} only`
              : `${keys.length} of ${sources.length} sources`;
    const isDefault = measure === defaultMeasure && keys.length === sources.length;

    const refresh = () => {
        if (busy) return;
        setBusy(true);
        setTimeout(() => {
            setBusy(false);
            setSynced('Synced just now');
            setReplay((v) => v + 1);
        }, 900);
    };

    const summary = `${title}, last 24 hours${keys.length < sources.length ? ` (${selSources.map((s) => s.label).join(', ')})` : ''}: ${totalRuns} runs, ${totalRuns ? ((totalOk / totalRuns) * 100).toFixed(1) : '0.0'}% landed, ${totalFailed} failed${failNames.length ? ` (${failNames.join(', ')})` : ''}, ${short(totalRows)} rows synced, peak ${short(peak.rows)} at ${peak.label}.`;
    const csvText = () =>
        rowsToCsv(rows, [
            { key: 'range', label: 'Hour (UTC)' },
            { key: 'runs', label: 'Runs' },
            { key: 's', label: 'Succeeded' },
            { key: 'slow', label: 'Slow' },
            { key: 'f', label: 'Failed' },
            { key: 'rows', label: 'Rows synced' },
        ]);

    const kpis = [
        { label: 'Runs', value: String(totalRuns), note: `${Math.round(totalRuns / elapsed)} an hour on average` },
        {
            label: 'Landed',
            value: `${totalRuns ? ((totalOk / totalRuns) * 100).toFixed(1) : '0.0'}%`,
            note: `${totalOk} of ${totalRuns}${totalSlow ? `, ${totalSlow} slow` : ' runs'}`,
        },
        {
            label: 'Failed',
            value: String(totalFailed),
            note: failNames.length ? (
                <>
                    <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                        <span className={`min-w-0 ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                            {failNames[0]}
                        </span>
                    </span>
                    {failNames.length > 1 ? (
                        <span
                            title={failNames.slice(1).join(', ')}
                            aria-label={`${failNames.length - 1} more failing ${failNames.length === 2 ? 'connection' : 'connections'}`}
                        >
                            <ToneBadge className="tabular-nums">
                                <span className={TEXT_TRIM}>+{failNames.length - 1}</span>
                            </ToneBadge>
                        </span>
                    ) : null}
                </>
            ) : (
                <span className={TEXT_TRIM}>No failed runs</span>
            ),
        },
        { label: 'Rows Synced', value: short(totalRows), note: `Peak ${short(peak.rows)} at ${peak.label}` },
    ];

    const legend =
        measure === 'runs'
            ? [
                  { label: 'Succeeded', dot: 'bg-success' },
                  { label: 'Slow', dot: 'bg-warning' },
                  { label: 'Failed', dot: 'bg-destructive' },
              ]
            : [{ label: 'Rows synced', dot: '', color: 'var(--color-rows)' }];

    return (
        <SeriesScope config={config} className={className}>
            <Frame stacked className="@container w-full min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription>{description}</FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* ReUI's chart-45 uses the 32px default controls and a muted pressed item. */}
                        <SegmentedControl
                            className="[&>[aria-checked=true]]:bg-muted [&>button]:h-8 [&>button]:px-2.5 [&>button]:text-sm"
                            label="Columns measure"
                            value={measure}
                            onValueChange={(v: any) => setMeasure(v)}
                            options={[
                                { value: 'runs', label: 'Runs' },
                                { value: 'rows', label: 'Rows' },
                            ]}
                        />
                        <CheckMenu
                            label="Sources"
                            icon="plug-zap"
                            menuLabel="Sources in the chart"
                            allLabel="Show all sources"
                            value={keys}
                            onValueChange={setKeys}
                            options={sources.map((s) => ({
                                value: s.key,
                                label: s.label,
                                icon: s.icon,
                                note: s.connections,
                            }))}
                        />
                        <ToolbarGroup aria-label="Chart actions">
                            <Button
                                variant="outline"
                                size="icon"
                                className="bg-background"
                                aria-label="Refresh runs"
                                title="Refresh runs"
                                disabled={busy}
                                onClick={refresh}
                            >
                                <Icon
                                    name={busy ? 'loader-circle' : 'refresh-cw'}
                                    className={busy ? 'animate-spin' : ''}
                                />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="bg-background"
                                            aria-label="More actions"
                                            title="More actions"
                                        />
                                    }
                                >
                                    <Icon name="ellipsis" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Data</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                downloadText('sync-activity.csv', csvText());
                                                toast.success('CSV downloaded', { description: 'sync-activity.csv' });
                                            }}
                                        >
                                            <Icon name="download" />
                                            Export CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={async () => {
                                                if (await copyText(summary)) toast.success('Summary copied');
                                                else toast.error('Could not copy to the clipboard');
                                            }}
                                        >
                                            <Icon name="copy" />
                                            Copy summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>View</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                            <Icon name={view === 'table' ? 'chart-column' : 'table'} />
                                            {view === 'table' ? 'View as chart' : 'View as table'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            disabled={isDefault}
                                            onClick={() => {
                                                setMeasure(defaultMeasure);
                                                setKeys(allKeys);
                                            }}
                                        >
                                            <Icon name="rotate-ccw" />
                                            Reset view
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </div>
                </FrameHeader>
                <FramePanel className="p-0">
                    <dl className="grid grid-cols-2 @2xl:grid-cols-4!">
                        {kpis.map((k) => (
                            <div
                                key={k.label}
                                className="flex min-w-0 flex-col gap-1 p-4 even:border-s nth-[n+3]:border-t @2xl:not-first:border-s! @2xl:nth-[n+3]:border-t-0!"
                            >
                                <dt className="flex h-5 items-center text-sm text-muted-foreground">
                                    <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                                        {k.label}
                                    </span>
                                </dt>
                                <dd className="flex min-w-0 flex-col gap-2">
                                    <span className="flex h-7 items-center">
                                        <span
                                            className={`text-2xl font-semibold tracking-tight tabular-nums ${TEXT_TRIM}`}
                                        >
                                            {k.value}
                                        </span>
                                    </span>
                                    <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                                        {typeof k.note === 'string' ? (
                                            <span
                                                className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                            >
                                                {k.note}
                                            </span>
                                        ) : (
                                            k.note
                                        )}
                                    </span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </FramePanel>
                <FramePanel>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="range"
                                indexLabel="Hour (UTC)"
                                series={[
                                    { key: 'runs', label: 'Runs' },
                                    { key: 'f', label: 'Failed' },
                                    { key: 'rows', label: 'Rows synced' },
                                ]}
                                valueFormatter={(v: number) => (v >= 1000 ? short(v) : String(v))}
                                caption={title}
                            />
                        }
                    >
                        <div ref={rootRef} className="flex flex-col gap-4">
                            <ul className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                {legend.map((l: any) => (
                                    <li key={l.label} className="flex h-4 items-center gap-1.5">
                                        <span
                                            className={`size-2 shrink-0 rounded-full ${l.dot}`}
                                            style={l.color ? { background: l.color } : undefined}
                                        />
                                        <span className={TEXT_TRIM}>{l.label}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="h-60 w-full">
                                <ChartContainer config={config} className="aspect-auto h-full w-full">
                                    {(R: any) => (
                                        <R.BarChart
                                            data={rows}
                                            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
                                            barCategoryGap="20%"
                                            accessibilityLayer
                                            onMouseMove={(s: any) =>
                                                setActive(
                                                    s && s.activeTooltipIndex != null
                                                        ? Number(s.activeTooltipIndex)
                                                        : null
                                                )
                                            }
                                            onMouseLeave={() => setActive(null)}
                                        >
                                            <defs>
                                                <pattern
                                                    id="rp-dsa-lines"
                                                    width="4"
                                                    height="4"
                                                    patternUnits="userSpaceOnUse"
                                                    patternTransform="rotate(45)"
                                                >
                                                    <rect
                                                        className="fill-muted-foreground/25"
                                                        width="0.75"
                                                        height="4"
                                                    />
                                                </pattern>
                                            </defs>
                                            <R.XAxis
                                                dataKey="label"
                                                height={26}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                interval={0}
                                                tick={(t: any) => (
                                                    <text
                                                        x={t.x}
                                                        y={t.y}
                                                        dy="0.71em"
                                                        textAnchor="middle"
                                                        className="fill-muted-foreground"
                                                    >
                                                        {t.index === n - 1 || t.index % 4 === 3 ? t.payload.value : ''}
                                                    </text>
                                                )}
                                            />
                                            <R.YAxis
                                                width={yWidth}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={10}
                                                domain={[0, axis.top]}
                                                ticks={axis.ticks}
                                                tickFormatter={(v: number) =>
                                                    measure === 'rows' && v >= 1000
                                                        ? short(v).replace('.0', '')
                                                        : String(v)
                                                }
                                            />
                                            <R.Tooltip
                                                cursor={false}
                                                position={{ y: 8 }}
                                                isAnimationActive={false}
                                                content={({ active: on, payload }: any) =>
                                                    on && payload && payload.length ? (
                                                        <TooltipBody
                                                            row={payload[0].payload}
                                                            measure={measure}
                                                            avg={measure === 'runs' ? avgRuns : avgRows}
                                                            sources={sources}
                                                            openMinutes={openMinutes}
                                                        />
                                                    ) : null
                                                }
                                            />
                                            <R.Bar
                                                dataKey={measure}
                                                isAnimationActive={false}
                                                background={(b: any) => (
                                                    <g key={`bg${b.index}`}>
                                                        <path
                                                            d={roundedTop(b.x, b.y, b.width, b.height, 6)}
                                                            data-on={active === b.index ? 'true' : 'false'}
                                                            className="fill-muted transition-[fill] duration-150 data-[on=true]:fill-muted-foreground/15 dark:data-[on=true]:fill-muted-foreground/25"
                                                        />
                                                        <path
                                                            d={roundedTop(b.x, b.y, b.width, b.height, 6)}
                                                            fill="url(#rp-dsa-lines)"
                                                        />
                                                    </g>
                                                )}
                                                shape={(p: any) => (
                                                    <SyncColumn
                                                        {...p}
                                                        measure={measure}
                                                        dim={active != null && active !== p.index}
                                                        plotBottom={
                                                            p.background ? p.background.y + p.background.height : 0
                                                        }
                                                        yTop={
                                                            p.background
                                                                ? (v: number) =>
                                                                      p.background.y +
                                                                      p.background.height -
                                                                      (v / axis.top) * p.background.height
                                                                : null
                                                        }
                                                    />
                                                )}
                                                activeBar={false}
                                            />
                                        </R.BarChart>
                                    )}
                                </ChartContainer>
                            </div>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex h-4 items-center gap-2">
                        <span className="size-1.5 shrink-0 rounded-full bg-success" />
                        <span className={TEXT_TRIM}>{synced}</span>
                        <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className={`tabular-nums ${TEXT_TRIM}`}>
                            {activeConn} of {connections} connections active
                        </span>
                    </span>
                    <span className="flex h-4 items-center">
                        <span className={TEXT_TRIM}>{scopeLabel}</span>
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

/** A rect path with rounded top corners (radius r) and a square base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
    const rr = Math.min(r, w / 2, h);
    return `M ${x},${y + rr} A ${rr},${rr},0,0,1,${x + rr},${y} L ${x + w - rr},${y} A ${rr},${rr},0,0,1,${x + w},${y + rr} L ${x + w},${y + h - rr} A ${rr},${rr},0,0,1,${x + w - rr},${y + h} L ${x + rr},${y + h} A ${rr},${rr},0,0,1,${x},${y + h - rr} Z`;
}

export default DataSyncActivity;
