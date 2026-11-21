import { useEffect, useMemo, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
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
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { useReplayKey } from 'components:charts/chart-kit';
import { TEXT_TRIM, Pill, MetaDot, LiveDot, ServiceSelect, polar, arcPath } from 'components:charts/radial-kit';
import { SOURCES, PERIODS } from './data';
import type { InflowSourceDef, GaugePeriod } from './data';

/**
 * components:charts/inflows-gauge: a day clock of cash inflows. Each day is a spoke stacked by source
 * (rounded ends), the prior period sits behind as faint ghost spokes, and an outer target ring fills with
 * settled cash per source plus the in-transit amount; a bead marks where the pace says you should be.
 * Centre: total, share of target and a pace badge (hovering or arrowing through the spokes shows that day).
 * Beside it forecast / per-day-needed / in-transit tiles and a source list with changes vs the prior period.
 * Period select (with detail lines), display options (sources, pace, in transit, previous period), refresh,
 * CSV / copy data / copy summary.
 *
 *   <InflowsGauge />                                    sample data
 *   <InflowsGauge sources={[…]} periods={[…]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type InflowsGaugeProps = {
    title?: string;
    sources?: InflowSourceDef[];
    periods?: GaugePeriod[];
    defaultPeriod?: string;
    updatedLabel?: string;
    unitLabel?: string;
    className?: string;
};

const V = 380;
const C = V / 2;
const R0 = 100;
const UNIT = 50.19;
const RING = 168;
const INSET = 2.2;
const SWIFT = 'cubic-bezier(0.77,0,0.175,1)';

function usd(v: number, d = 1): string {
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const trim = (s: string) => s.replace(/\.0+$/, '');
    if (a >= 1e6) return `${sign}$${trim((a / 1e6).toFixed(d))}M`;
    if (a >= 1e3) return `${sign}$${trim((a / 1e3).toFixed(1))}K`;
    return `${sign}$${Math.round(a)}`;
}

const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

export function InflowsGauge({
    title = 'Cash Inflows',
    sources = SOURCES,
    periods = PERIODS,
    defaultPeriod = 'month',
    updatedLabel = 'Updated 2 min ago',
    unitLabel = 'Amounts in USD',
    className,
}: InflowsGaugeProps) {
    const first = periods.some((p) => p.key === defaultPeriod) ? defaultPeriod : periods[0].key;
    const [periodKey, setPeriodKey] = useState(first);
    const [hidden, setHidden] = useState<Record<string, boolean>>({});
    const [showPace, setShowPace] = useState(true);
    const [showTransit, setShowTransit] = useState(true);
    const [showGhost, setShowGhost] = useState(true);
    const [day, setDay] = useState<number | null>(null);
    const [spot, setSpot] = useState<string | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [grown, setGrown] = useState(false);
    const [replayKey, replay] = useReplayKey();
    const period = periods.find((p) => p.key === periodKey) || periods[0];
    const n = period.spokes.length;

    useEffect(() => {
        setGrown(false);
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
        return () => cancelAnimationFrame(id);
    }, [periodKey, replayKey]);

    const rows = sources.map((s, i) => {
        const v = period.sources[i] || { total: 0, transit: 0, delta: 0 };
        return { ...s, total: v.total, transit: v.transit, settled: v.total - v.transit, delta: v.delta, note: v.note };
    });
    const total = rows.reduce((a, r) => a + r.total, 0);
    const transit = rows.reduce((a, r) => a + r.transit, 0);
    const settled = total - transit;
    const share = (v: number) => (total ? Math.round((v / total) * 100) : 0);
    const visible = rows.filter((r) => !hidden[r.key]);

    /** $ per spoke unit, so the actual spokes add up to the settled total. */
    const unitValue = useMemo(() => {
        const sum = period.spokes.reduce((a, s) => a + s.slice(1).reduce((b, v) => b + v, 0), 0);
        return sum ? settled / sum : 0;
    }, [period, settled]);
    const spokeTotal = (i: number) =>
        period.spokes[i].slice(1).reduce((a, v, k) => a + (hidden[sources[k] && sources[k].key] ? 0 : v), 0);
    const actualCount = period.spokes.filter((s) => s.length > 1).length;

    const badge = period.closed
        ? total >= period.target
            ? { tone: 'success', text: 'Target hit' }
            : { tone: 'destructive', text: 'Target missed' }
        : period.pace != null && total < period.pace
          ? { tone: 'warning', text: 'Behind pace' }
          : { tone: 'success', text: 'On pace' };

    const dateOf = (i: number) => {
        const d = new Date(`${period.start}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + Math.round(i * period.step));
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    };
    const dayInfo =
        day != null && period.spokes[day] && period.spokes[day].length > 1
            ? (() => {
                  const s = period.spokes[day];
                  const v = spokeTotal(day) * unitValue;
                  let lead = 0;
                  s.slice(1).forEach((x, k) => {
                      if (x > s[lead + 1]) lead = k;
                  });
                  return {
                      v,
                      lead: sources[lead] ? sources[lead].label : '',
                      delta: s[0] ? (spokeTotal(day) / s[0] - 1) * 100 : 0,
                  };
              })()
            : null;

    const w = Math.min(11.81, ((2 * Math.PI * R0) / n) * 0.6);
    const angleOf = (i: number) => ((i + 0.5) * 360) / n;
    const scaleMax = Math.max(period.target, total);
    const ringArcs = useMemo(() => {
        const arcs: { key: string; cls: string; a0: number; a1: number; spot?: string }[] = [];
        let cur = 0;
        visible.forEach((r) => {
            const a = (r.settled / scaleMax) * 360;
            arcs.push({ key: r.key, cls: r.text, a0: cur, a1: cur + a, spot: r.key });
            cur += a;
        });
        if (showTransit && transit > 0)
            arcs.push({
                key: 'transit',
                cls: 'text-muted-foreground/45',
                a0: cur,
                a1: cur + (transit / scaleMax) * 360,
            });
        return arcs;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, hidden, showTransit]);

    const csvRows = period.spokes.map((s, i) => {
        const r: Record<string, any> = {
            spoke: s.length > 1 ? dateOf(i) : `${dateOf(i)} (to come)`,
            prior: Math.round(s[0] * unitValue),
        };
        sources.forEach((src, k) => {
            r[src.key] = s.length > 1 ? Math.round((s[k + 1] || 0) * unitValue) : '';
        });
        return r;
    });
    const csvColumns = [{ key: 'spoke', label: 'Date' }]
        .concat(sources.map((s) => ({ key: s.key, label: `${s.label} (USD)` })))
        .concat([{ key: 'prior', label: `${period.priorLabel} (USD)` }]);
    const pct = Math.round((total / period.target) * 100);
    const summary = `${title}, ${period.scopeLabel}: ${usd(total)} of ${usd(period.target)} (${pct}%), ${usd(settled)} settled and ${usd(
        transit
    )} in transit${period.pace != null ? `, pace ${usd(period.pace)}` : ''}. ${rows
        .map((r) => `${r.label} ${usd(r.total)} (${share(r.total)}%, ${signed(r.delta)})`)
        .join('; ')}. ${signed(period.totalDelta)} vs ${period.vsLabel}.`;
    const aria = `${usd(total)} of inflows against a ${usd(period.target)} target ${period.scopeLabel}, ${pct}%: ${usd(settled)} settled and ${usd(
        transit
    )} in transit${period.pace != null ? `, with pace at ${usd(period.pace)}` : ''}. Arrow keys step through the ${n} spokes.`;

    const onKey = (e: any) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Escape') return;
        e.preventDefault();
        if (e.key === 'Escape') return setDay(null);
        const last = Math.max(0, actualCount - 1);
        if (day == null) return setDay(e.key === 'ArrowRight' ? 0 : last);
        setDay(Math.max(0, Math.min(last, day + (e.key === 'ArrowRight' ? 1 : -1))));
    };
    const reset = () => {
        setPeriodKey(first);
        setHidden({});
        setShowPace(true);
        setShowTransit(true);
        setShowGhost(true);
        setView('chart');
    };
    const ease400 = `transform 400ms ${SWIFT}, opacity 150ms cubic-bezier(0.23,1,0.32,1)`;

    return (
        <Frame className={`@container w-full min-w-0 ${className || ''}`}>
            <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-px">
                    <FrameTitle>{title}</FrameTitle>
                    <FrameDescription>All sources, {period.scopeLabel}</FrameDescription>
                </div>
                <div className="flex w-full items-center gap-2 @2xl:w-auto">
                    <ServiceSelect
                        label="Period"
                        icon="calendar"
                        value={periodKey}
                        align="end"
                        onValueChange={(v) => {
                            setPeriodKey(v);
                            setDay(null);
                        }}
                        options={periods.map((p) => ({ value: p.key, label: p.label, description: p.detail }))}
                        className="w-44 @max-2xl:flex-1"
                    />
                    <div role="group" aria-label="Chart actions" className="flex w-fit items-stretch">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Display options"
                                        className="size-8 rounded-e-none"
                                    />
                                }
                            >
                                <Icon name="settings-2" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Sources</DropdownMenuLabel>
                                    {sources.map((s) => (
                                        <DropdownMenuCheckboxItem
                                            key={s.key}
                                            checked={!hidden[s.key]}
                                            onCheckedChange={(v: boolean) => setHidden({ ...hidden, [s.key]: !v })}
                                        >
                                            {s.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                    <DropdownMenuCheckboxItem
                                        checked={showPace}
                                        onCheckedChange={(v: boolean) => setShowPace(!!v)}
                                    >
                                        Pace Marker
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={showTransit}
                                        onCheckedChange={(v: boolean) => setShowTransit(!!v)}
                                    >
                                        In Transit
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={showGhost}
                                        onCheckedChange={(v: boolean) => setShowGhost(!!v)}
                                    >
                                        Previous Period
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Refresh inflows"
                            className="size-8 rounded-none border-s-0"
                            onClick={replay}
                        >
                            <Icon name="refresh-cw" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="More actions"
                                        className="size-8 rounded-s-none border-s-0"
                                    />
                                }
                            >
                                <Icon name="ellipsis" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const name = `cash-inflows-${period.key}.csv`;
                                            downloadText(name, rowsToCsv(csvRows, csvColumns));
                                            toast.success('CSV downloaded', { description: name });
                                        }}
                                    >
                                        <Icon name="download" />
                                        Download CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={async () => {
                                            if (await copyText(rowsToCsv(csvRows, csvColumns)))
                                                toast.success('Data copied');
                                        }}
                                    >
                                        <Icon name="clipboard" />
                                        Copy Data
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={async () => {
                                            if (await copyText(summary)) toast.success('Summary copied');
                                        }}
                                    >
                                        <Icon name="copy" />
                                        Copy Summary
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                    <Icon name={view === 'table' ? 'chart-pie' : 'table'} />
                                    {view === 'table' ? 'View as Chart' : 'View as Table'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={reset}>
                                    <Icon name="rotate-ccw" />
                                    Reset View
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </FrameHeader>
            <FramePanel>
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(circle_at_50%_32%,black,transparent_60%)] @3xl:[mask-image:radial-gradient(circle_at_25%_50%,black,transparent_45%)]"
                />
                <div className="relative grid items-center gap-x-12 gap-y-8 @3xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                    <div className="flex flex-col items-center gap-4">
                        <ChartFigure
                            title={title}
                            summary={summary}
                            view={view}
                            className="w-full items-center"
                            table={
                                <ChartDataTable
                                    data={csvRows}
                                    index="spoke"
                                    indexLabel="Date"
                                    series={sources
                                        .map((s) => ({ key: s.key, label: s.label }))
                                        .concat([{ key: 'prior', label: period.priorLabel }])}
                                    valueFormatter={(v: any) => (v === '' ? '' : usd(Number(v)))}
                                    caption={aria}
                                />
                            }
                        >
                            <div
                                role="group"
                                tabIndex={0}
                                aria-label={aria}
                                onKeyDown={onKey}
                                onBlur={() => setDay(null)}
                                onMouseLeave={() => setDay(null)}
                                className="relative aspect-square w-full max-w-96 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <svg
                                    viewBox={`0 0 ${V} ${V}`}
                                    className="absolute inset-0 size-full overflow-visible"
                                    aria-hidden="true"
                                >
                                    <g fill="none" stroke="currentColor" className="text-border">
                                        {[84, 100, 125, 150, 158].map((r) => (
                                            <circle key={r} cx={C} cy={C} r={r} strokeWidth={1} strokeDasharray="1 4" />
                                        ))}
                                    </g>
                                    {period.spokes.map((s, i) => {
                                        const actual = s.length > 1;
                                        const dim = (day != null && day !== i) || (spot != null && !actual) ? 0.35 : 1;
                                        let off = 0;
                                        const segs: any[] = [];
                                        s.slice(1).forEach((v, k) => {
                                            const src = sources[k];
                                            if (!src || hidden[src.key] || !v) return;
                                            segs.push({ key: src.key, cls: src.text, y0: off, len: v * UNIT });
                                            off += v * UNIT;
                                        });
                                        const ghostLen = s[0] * UNIT;
                                        const by = C - R0;
                                        const grow = grown ? 'scale(1)' : 'scale(1, 0)';
                                        return (
                                            <g
                                                key={`${period.key}-${i}`}
                                                style={{
                                                    transform: `rotate(${angleOf(i)}deg)`,
                                                    transformOrigin: `${C}px ${C}px`,
                                                    transition: ease400,
                                                    opacity: dim,
                                                }}
                                            >
                                                {showGhost ? (
                                                    <g className="text-muted-foreground opacity-15">
                                                        <circle cx={C} cy={by} r={w / 2} className="fill-current" />
                                                        <rect
                                                            x={C - w / 2}
                                                            y={by - ghostLen}
                                                            width={w}
                                                            height={ghostLen}
                                                            className="fill-current"
                                                        />
                                                        <circle
                                                            cx={C}
                                                            cy={by - ghostLen}
                                                            r={w / 2}
                                                            className="fill-current"
                                                        />
                                                    </g>
                                                ) : null}
                                                {actual && segs.length ? (
                                                    <g
                                                        style={{
                                                            transform: grow,
                                                            transformOrigin: `${C}px ${by}px`,
                                                            transition: `transform 400ms cubic-bezier(0.23,1,0.32,1) ${i * 9}ms`,
                                                        }}
                                                    >
                                                        <circle
                                                            cx={C}
                                                            cy={by}
                                                            r={w / 2}
                                                            className={`fill-current ${segs[0].cls}`}
                                                        />
                                                        {segs.map((g) => (
                                                            <rect
                                                                key={g.key}
                                                                x={C - w / 2}
                                                                y={by - g.y0 - g.len}
                                                                width={w}
                                                                height={g.len}
                                                                className={`fill-current transition-opacity duration-150 ${g.cls}`}
                                                                style={{ opacity: spot && spot !== g.key ? 0.25 : 1 }}
                                                            />
                                                        ))}
                                                        <circle
                                                            cx={C}
                                                            cy={by - off}
                                                            r={w / 2}
                                                            className={`fill-current ${segs[segs.length - 1].cls}`}
                                                        />
                                                    </g>
                                                ) : null}
                                                <rect
                                                    x={C - w / 2}
                                                    y={26}
                                                    width={w}
                                                    height={70}
                                                    fill="transparent"
                                                    onMouseEnter={() => (actual ? setDay(i) : setDay(null))}
                                                />
                                            </g>
                                        );
                                    })}
                                    {period.marks.map(([i, label]) => {
                                        const [x, y] = polar(C, C, 184, angleOf(i));
                                        return (
                                            <text
                                                key={`${i}${label}`}
                                                x={x}
                                                y={y}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                className="fill-muted-foreground text-xs tabular-nums"
                                            >
                                                {label}
                                            </text>
                                        );
                                    })}
                                    <circle
                                        cx={C}
                                        cy={C}
                                        r={RING}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        className="text-border"
                                    />
                                    {[90, 180, 270].map((a) => {
                                        const [x1, y1] = polar(C, C, RING - 5, a);
                                        const [x2, y2] = polar(C, C, RING + 5, a);
                                        return (
                                            <line
                                                key={a}
                                                x1={x1}
                                                y1={y1}
                                                x2={x2}
                                                y2={y2}
                                                stroke="currentColor"
                                                strokeWidth={1.5}
                                                strokeLinecap="round"
                                                className="text-border"
                                            />
                                        );
                                    })}
                                    {ringArcs.map((a) =>
                                        a.a1 - a.a0 > INSET * 2 + 0.2 ? (
                                            <g key={a.key}>
                                                <path
                                                    d={arcPath(C, C, RING, a.a0 + INSET, a.a1 - INSET)}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={7}
                                                    strokeLinecap="round"
                                                    className={`${a.cls} transition-opacity duration-150`}
                                                    style={{ opacity: spot && a.spot && spot !== a.spot ? 0.3 : 1 }}
                                                />
                                                <path
                                                    d={arcPath(C, C, RING, a.a0 + INSET, a.a1 - INSET)}
                                                    fill="none"
                                                    stroke="transparent"
                                                    strokeWidth={18}
                                                    pointerEvents="stroke"
                                                    onMouseEnter={() => setSpot(a.spot || null)}
                                                    onMouseLeave={() => setSpot(null)}
                                                />
                                            </g>
                                        ) : null
                                    )}
                                    <line
                                        x1={C}
                                        y1={14}
                                        x2={C}
                                        y2={30}
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        className="text-foreground"
                                    />
                                    {showPace && period.pace != null ? (
                                        <g
                                            style={{
                                                transform: `rotate(${(period.pace / scaleMax) * 360}deg)`,
                                                transformOrigin: `${C}px ${C}px`,
                                                transition: ease400,
                                            }}
                                        >
                                            <circle
                                                cx={C}
                                                cy={C - RING}
                                                r={5.5}
                                                strokeWidth={2.5}
                                                className="fill-card stroke-foreground"
                                            />
                                        </g>
                                    ) : null}
                                </svg>
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="flex w-28 flex-col items-center gap-2 text-center @md:w-36 @md:gap-2.5">
                                        <span className="flex h-4 items-center text-xs text-muted-foreground">
                                            <span className={TEXT_TRIM}>
                                                {dayInfo && day != null ? dateOf(day) : 'Inflows'}
                                            </span>
                                        </span>
                                        <span
                                            className={`text-2xl font-semibold tracking-tight tabular-nums @md:text-3xl ${TEXT_TRIM}`}
                                        >
                                            {usd(dayInfo ? dayInfo.v : total)}
                                        </span>
                                        <span className="flex h-4 items-center text-xs text-muted-foreground tabular-nums">
                                            <span className={TEXT_TRIM}>
                                                {dayInfo ? `${dayInfo.lead} led` : `${pct}% of ${usd(period.target)}`}
                                            </span>
                                        </span>
                                        {dayInfo ? (
                                            <Pill tone={dayInfo.delta < 0 ? 'destructive' : 'success'}>
                                                {signed(dayInfo.delta)}
                                            </Pill>
                                        ) : (
                                            <Pill tone={badge.tone}>{badge.text}</Pill>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ChartFigure>
                        <ul
                            aria-label="Clock marks"
                            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground tabular-nums"
                        >
                            <li className="flex h-4 items-center gap-1.5">
                                <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
                                    <g strokeWidth={3} strokeLinecap="round">
                                        <line
                                            x1={1.5}
                                            y1={6}
                                            x2={3.5}
                                            y2={6}
                                            className={sources[0] ? sources[0].stroke : ''}
                                        />
                                        <line
                                            x1={5.5}
                                            y1={6}
                                            x2={6.5}
                                            y2={6}
                                            className={sources[1] ? sources[1].stroke : ''}
                                        />
                                        <line
                                            x1={8.5}
                                            y1={6}
                                            x2={10.5}
                                            y2={6}
                                            className={sources[2] ? sources[2].stroke : ''}
                                        />
                                    </g>
                                </svg>
                                <span className={TEXT_TRIM}>Settled {usd(settled)}</span>
                            </li>
                            {transit > 0 ? (
                                <li className="flex h-4 items-center gap-1.5">
                                    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
                                        <line
                                            x1={1.5}
                                            y1={6}
                                            x2={10.5}
                                            y2={6}
                                            stroke="currentColor"
                                            strokeWidth={3}
                                            strokeLinecap="round"
                                            className="text-muted-foreground/45"
                                        />
                                    </svg>
                                    <span className={TEXT_TRIM}>In transit {usd(transit)}</span>
                                </li>
                            ) : null}
                            {period.pace != null ? (
                                <li className="flex h-4 items-center gap-1.5">
                                    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
                                        <circle
                                            cx={6}
                                            cy={6}
                                            r={3.5}
                                            strokeWidth={2}
                                            className="fill-card stroke-foreground"
                                        />
                                    </svg>
                                    <span className={TEXT_TRIM}>
                                        Pace {usd(period.pace)}, {usd(total - period.pace)}
                                    </span>
                                </li>
                            ) : null}
                            <li className="flex h-4 items-center gap-1.5">
                                <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
                                    <line
                                        x1={6}
                                        y1={3.5}
                                        x2={6}
                                        y2={8.5}
                                        stroke="currentColor"
                                        strokeWidth={5}
                                        strokeLinecap="round"
                                        className="text-muted-foreground/40"
                                    />
                                </svg>
                                <span className={TEXT_TRIM}>{period.priorLabel}</span>
                            </li>
                        </ul>
                    </div>
                    <div className="flex min-w-0 flex-col gap-6">
                        <dl className="grid divide-y @md:-mx-4 @md:grid-cols-3 @md:divide-x @md:divide-y-0">
                            {[
                                period.closed
                                    ? { k: 'Closed At', v: usd(total), s: `${pct}% of target` }
                                    : {
                                          k: 'Forecast',
                                          v: usd(period.forecast),
                                          s: `${Math.round((period.forecast / period.target) * 100)}% of target`,
                                      },
                                period.closed || period.perDay == null
                                    ? { k: 'Per Day Needed', v: 'None', s: 'Period closed' }
                                    : {
                                          k: 'Per Day Needed',
                                          v: usd(period.perDay, 2),
                                          s: `${usd(period.soFar || 0, 2)} so far`,
                                      },
                                transit > 0
                                    ? { k: 'In Transit', v: usd(transit), s: 'Within 3 days' }
                                    : { k: 'In Transit', v: '$0', s: 'All settled' },
                            ].map((t) => (
                                <div
                                    key={t.k}
                                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-2.5 first:pt-0 last:pb-0 @md:flex @md:flex-col @md:items-start @md:px-4 @md:py-0"
                                >
                                    <dt className="flex h-4 min-w-0 items-center text-xs text-muted-foreground">
                                        <span
                                            className={`min-w-0 ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                        >
                                            {t.k}
                                        </span>
                                    </dt>
                                    <dd className="col-start-2 row-span-2 row-start-1 flex h-6 items-center">
                                        <span
                                            className={`text-xl font-semibold tracking-tight tabular-nums ${TEXT_TRIM}`}
                                        >
                                            {t.v}
                                        </span>
                                    </dd>
                                    <dd className="flex h-4 min-w-0 items-center text-xs text-muted-foreground tabular-nums">
                                        <span
                                            className={`min-w-0 text-muted-foreground ${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                        >
                                            {t.s}
                                        </span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span className={TEXT_TRIM}>Source</span>
                                <span className={TEXT_TRIM}>Inflows vs {period.vsLabel}</span>
                            </div>
                            <ul aria-label="Inflows by source" className="flex flex-col divide-y">
                                {rows.map((r) => (
                                    <li
                                        key={r.key}
                                        className={`flex min-w-0 items-center gap-3 py-2.5 transition-opacity duration-150 ${hidden[r.key] ? 'opacity-40' : ''}`}
                                        onMouseEnter={() => setSpot(r.key)}
                                        onMouseLeave={() => setSpot(null)}
                                    >
                                        <span
                                            data-slot="icon-tile"
                                            className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-background bg-muted shadow-[0_1px_3px_0_rgb(0_0_0/0.14)] dark:border [&_svg]:size-4 ${r.text}`}
                                        >
                                            <Icon name={r.icon} />
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <span className="flex h-4 items-center text-sm font-medium">
                                                <span
                                                    className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                >
                                                    {r.label}
                                                </span>
                                            </span>
                                            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                                                <span className={TEXT_TRIM}>{share(r.total)}%</span>
                                                <MetaDot />
                                                <span
                                                    className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}
                                                >
                                                    {r.transit > 0
                                                        ? `${usd(r.transit)} in transit`
                                                        : r.note || 'Settled'}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                                            <span className="flex h-4 items-center text-sm font-medium tabular-nums">
                                                <span className={TEXT_TRIM}>{usd(r.total)}</span>
                                            </span>
                                            <Pill tone={r.delta < 0 ? 'destructive' : 'success'}>
                                                <Icon name={r.delta < 0 ? 'arrow-down' : 'arrow-up'} />
                                                <span className={TEXT_TRIM}>{signed(r.delta)}</span>
                                            </Pill>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex h-9 items-center justify-between gap-3 border-t pt-1 text-sm font-medium">
                                <span className={TEXT_TRIM}>All sources</span>
                                <span className="flex items-center gap-2 tabular-nums">
                                    <span className={TEXT_TRIM}>{usd(total)}</span>
                                    <Pill tone={period.totalDelta < 0 ? 'destructive' : 'success'}>
                                        <Icon name={period.totalDelta < 0 ? 'arrow-down' : 'arrow-up'} />
                                        <span className={TEXT_TRIM}>{signed(period.totalDelta)}</span>
                                    </Pill>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </FramePanel>
            <FrameFooter className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex h-4 min-w-0 items-center gap-2">
                    <LiveDot />
                    <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>
                        {updatedLabel}
                    </span>
                    <MetaDot />
                    <span className={`${TEXT_TRIM} tabular-nums`}>{period.footnote}</span>
                </span>
                <span className={TEXT_TRIM}>{unitLabel}</span>
            </FrameFooter>
        </Frame>
    );
}

export default InflowsGauge;
