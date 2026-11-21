import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable, prefersReducedMotion } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ChartToolbar,
    ToolbarGroup,
    ToolbarButton,
    SegmentedControl,
    ChartMoreMenu,
    ChartExpandDialog,
} from 'components:chart-frame';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { Icon } from 'components:icon';
import { series, SeriesScope, useMotion, useReplayKey, EASE_OUT, signedPercent } from 'components:charts/chart-kit';
import { SOURCES, PRESETS, BASELINES, RENEWABLE } from './data';
import type { Source } from './data';

/**
 * components:charts/generation-mix: a day of hourly output by source as gradient ridges standing one
 * behind the other in 3D depth (CSS 3D planes), with a 3D / 2D toggle, a Display menu (source presets,
 * gridlines, floor, peak marker), a Compare-against baseline menu, an hour readout (hover a ridge or use
 * the arrow keys), legend chips that show / hide sources with their share of output, and exports.
 *
 *   <GenerationMix />                                        sample data
 *   <GenerationMix sources={[{ key, label, light, dark, values: [GW at 00:00 … 24:00] }]} />
 *
 * Energy (GWh) is the trapezoid integral of each hourly series; shares use largest-remainder rounding so
 * the chips add up to 100%.
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

type Preset = { key: string; label: string; icon: string; sources: string[] };
type Baseline = { key: string; label: string; icon: string; note: string; delta: number };
type Active = { source: string; hour: number } | null;

export type GenerationMixProps = {
    title?: string;
    description?: string;
    sources?: Source[];
    presets?: Preset[];
    baselines?: Baseline[];
    defaultBaseline?: string;
    renewable?: string[];
    defaultView?: '3d' | '2d';
    /** Hour labels; default "00:00" … one per value. */
    hours?: string[];
    className?: string;
    /** Internal: hides the expand button inside the expand dialog. */
    expandable?: boolean;
};

const VW = 1000;
const VH = 400;

const STAGE_CSS = `
[data-gm-stage]{container-type:size;--gm-depth:4.4cqw}
[data-gm-stage][data-view="3d"] [data-gm-camera]{--gm-gap:var(--gm-depth);--gm-rx:-14deg;--gm-ry:22deg;--gm-scale:0.74;--gm-x:0%;--gm-y:-3%;--gm-floor:1;--gm-lift:2cqw;--gm-fill:1;--gm-ink:0.2px}
[data-gm-stage][data-view="flat"] [data-gm-camera]{--gm-gap:0.02px;--gm-rx:0deg;--gm-ry:0deg;--gm-scale:1;--gm-x:0%;--gm-y:0%;--gm-floor:0;--gm-lift:0px;--gm-fill:0.22;--gm-ink:1px}
@container (max-width:560px){[data-gm-stage][data-view="3d"] [data-gm-camera]{--gm-depth:4.6cqw;--gm-rx:-12deg;--gm-ry:12deg;--gm-scale:0.88;--gm-x:1%;--gm-y:-2%}}
[data-gm-stage] [data-gm-camera]{perspective:220cqw;perspective-origin:50% 40%}
[data-gm-stage] :is([data-gm-rig],[data-gm-scene]){transform-style:preserve-3d}
[data-gm-stage] [data-gm-scene]{transform:translate3d(var(--gm-x),var(--gm-y),0) rotateX(var(--gm-rx)) rotateY(var(--gm-ry)) scale3d(var(--gm-scale),var(--gm-scale),var(--gm-scale))}
[data-gm-stage] [data-gm-plane]{transform:translateZ(calc(var(--gm-z) * var(--gm-gap)))}
[data-gm-stage] [data-gm-plane][data-ink]{transform:translateZ(calc(var(--gm-z) * var(--gm-gap) + var(--gm-ink)))}
[data-gm-stage] [data-gm-floor]{height:calc(2 * var(--gm-span) * var(--gm-depth));transform-origin:50% 0;transform:translateZ(calc(var(--gm-span) * var(--gm-gap) * -1)) rotateX(90deg) scaleY(var(--gm-floor))}
[data-gm-stage] :is([data-gm-lift],[data-gm-reveal]){transform-origin:50% 100%}
[data-gm-stage] [data-gm-fill]{opacity:var(--gm-fill)}
[data-gm-stage][data-view="flat"] [data-lifted] [data-gm-fill]{opacity:0.7}
[data-gm-stage][data-revealing] [data-gm-reveal]{opacity:0}
@media (prefers-reduced-motion:reduce){[data-gm-stage][data-revealing] [data-gm-reveal]{opacity:1}}
@media (prefers-reduced-motion:no-preference){[data-gm-stage][data-revealing][data-view="3d"] [data-gm-rig]{transform:rotateX(5deg) rotateY(-8deg)}}
[data-gm-stage] :is([data-gm-rig],[data-gm-scene],[data-gm-plane],[data-gm-floor]){transition:transform 720ms cubic-bezier(0.65, 0, 0.35, 1)}
[data-gm-stage] [data-gm-floor]{transition:transform 720ms cubic-bezier(0.65, 0, 0.35, 1),opacity 200ms ease-out}
[data-gm-stage] [data-gm-floor][data-hidden]{opacity:0}
[data-gm-stage] [data-gm-fill]{transition:opacity 320ms ease-out}
[data-gm-stage] [data-gm-lift]{transition:transform 280ms cubic-bezier(0.22, 1, 0.36, 1),opacity 200ms ease-out}
@media (prefers-reduced-motion:reduce){[data-gm-stage] :is([data-gm-rig],[data-gm-scene],[data-gm-plane],[data-gm-floor],[data-gm-fill],[data-gm-lift]){transition:none}}
`;

/** Monotone-X cubic path through evenly or unevenly spaced points (the d3 / Recharts "monotone" curve). */
function monotonePath(pts: [number, number][]): string {
    const n = pts.length;
    if (!n) return '';
    if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
    const r = (v: number) => Math.round(v * 1000) / 1000;
    const sign = (v: number) => (v < 0 ? -1 : 1);
    const slope = (i: number) => (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1);
    const m: number[] = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        const h0 = pts[i][0] - pts[i - 1][0];
        const h1 = pts[i + 1][0] - pts[i][0];
        const s0 = slope(i - 1);
        const s1 = slope(i);
        const p = (s0 * h1 + s1 * h0) / (h0 + h1);
        m[i] = (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
    }
    if (n === 2) {
        m[0] = slope(0);
        m[1] = slope(0);
    } else {
        m[0] = (3 * slope(0) - m[1]) / 2;
        m[n - 1] = (3 * slope(n - 2) - m[n - 2]) / 2;
    }
    let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const dx = (x1 - x0) / 3;
        d += `C${r(x0 + dx)},${r(y0 + dx * m[i])},${r(x1 - dx)},${r(y1 - dx * m[i + 1])},${r(x1)},${r(y1)}`;
    }
    return d;
}

/** Trapezoid integral of an hourly series (GW → GWh). */
function energy(values: number[]): number {
    let s = 0;
    for (let i = 1; i < values.length; i++) s += (values[i - 1] + values[i]) / 2;
    return s;
}

/** Whole-number percentages that add up to 100 (largest remainder). */
function shares(parts: number[]): number[] {
    const total = parts.reduce((a, b) => a + b, 0) || 1;
    const raw = parts.map((p) => (p / total) * 100);
    const out = raw.map((v) => Math.floor(v));
    let left = 100 - out.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => ({ i, rem: v - Math.floor(v) })).sort((a, b) => b.rem - a.rem);
    for (let k = 0; k < order.length && left > 0; k++, left--) out[order[k].i] += 1;
    return out;
}

function niceTop(max: number): number {
    const raw = max / 4 || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    return Math.ceil(raw / mag) * mag * 4;
}

const gw = (v: number) => v.toFixed(1);

export function GenerationMix({
    title = 'Generation Mix',
    description = 'Hourly output by source on Oct 10',
    sources = SOURCES,
    presets = PRESETS,
    baselines = BASELINES,
    defaultBaseline = 'week',
    renewable = RENEWABLE,
    defaultView = '3d',
    hours: hoursProp,
    className,
    expandable = true,
}: GenerationMixProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const [view3d, setView3d] = useState<'3d' | '2d'>(defaultView);
    const [shown, setShown] = useState<string[]>(sources.map((s) => s.key));
    const [preset, setPreset] = useState<string>('all');
    const [baseline, setBaseline] = useState(defaultBaseline);
    const [grid, setGrid] = useState(true);
    const [floor, setFloor] = useState(true);
    const [peakMarker, setPeakMarker] = useState(false);
    const [active, setActive] = useState<Active>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [replay, doReplay] = useReplayKey();
    const [revealing, setRevealing] = useState(true);
    const stageRef = useRef<HTMLDivElement>(null);
    const Motion = useMotion();

    const config = useMemo(() => {
        const cfg: Record<string, any> = {};
        sources.forEach((s) => {
            cfg[s.key] = series(s.light, s.dark, s.label);
        });
        return cfg;
    }, [sources]);

    const n = sources.length ? sources[0].values.length : 0;
    const hours = useMemo(
        () => hoursProp || Array.from({ length: n }, (_v, i) => `${String(i).padStart(2, '0')}:00`),
        [hoursProp, n]
    );
    const stats = useMemo(() => {
        const e = sources.map((s) => energy(s.values));
        const total = e.reduce((a, b) => a + b, 0);
        const pct = shares(e);
        const totals = hours.map((_h, i) => sources.reduce((a, s) => a + (s.values[i] || 0), 0));
        let peakHour = 0;
        totals.forEach((t, i) => {
            if (t > totals[peakHour]) peakHour = i;
        });
        const max = Math.max(0, ...sources.map((s) => Math.max(...s.values)));
        const renew = sources.reduce((a, s, i) => a + (renewable.indexOf(s.key) >= 0 ? pct[i] : 0), 0);
        return { e, total, pct, totals, peakHour, top: niceTop(max), renew };
    }, [sources, hours, renewable]);

    const x = (i: number) => (n > 1 ? (i / (n - 1)) * VW : 0);
    const y = (v: number) => VH - (v / stats.top) * VH;
    const geometry = useMemo(
        () =>
            sources.map((s) => {
                const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number]);
                const line = monotonePath(pts);
                const fill = `${line}L${VW},${VH}L0,${VH}Z`;
                // The stroke skips leading / trailing zero runs (keeps the last zero before the first value).
                let a = 0;
                while (a < s.values.length - 1 && !s.values[a + 1]) a++;
                if (s.values[0]) a = 0;
                let b = s.values.length - 1;
                while (b > 0 && !s.values[b - 1]) b--;
                if (s.values[s.values.length - 1]) b = s.values.length - 1;
                const ink = b > a ? monotonePath(pts.slice(a, b + 1)) : line;
                return { line, fill, ink };
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sources, stats.top, n]
    );

    const visible = sources.filter((s) => shown.indexOf(s.key) >= 0);
    const span = (sources.length - 1) / 2 + 0.6;
    const zOf = (i: number) => i - (sources.length - 1) / 2;
    const base = baselines.find((b) => b.key === baseline) || baselines[0];
    const peakTotal = stats.totals[stats.peakHour] || 0;

    // Enter: each source's ridge grows from the floor, 85ms apart; the rig settles from a slight tilt.
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage || view !== 'chart') return undefined;
        if (prefersReducedMotion()) {
            setRevealing(false);
            return undefined;
        }
        if (!Motion) {
            setRevealing(true);
            return undefined;
        }
        const controls: any[] = [];
        const els = Array.prototype.slice.call(stage.querySelectorAll('[data-gm-reveal]')) as HTMLElement[];
        els.forEach((el) => {
            const i = Number(el.getAttribute('data-index')) || 0;
            controls.push(
                Motion.animate(
                    el,
                    { transform: ['scaleY(0)', 'scaleY(1)'], opacity: [0, 1, 1] },
                    {
                        duration: 0.76,
                        delay: i * 0.085,
                        ease: EASE_OUT,
                        opacity: { duration: 0.76, delay: i * 0.085, ease: EASE_OUT, times: [0, 0.35, 1] },
                    }
                )
            );
        });
        setRevealing(false);
        return () => controls.forEach((c) => c && c.stop && c.stop());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Motion, replay, view]);

    // Never stay hidden if the motion chunk fails to load.
    useEffect(() => {
        const t = setTimeout(() => setRevealing(false), 2500);
        return () => clearTimeout(t);
    }, []);

    const applyPreset = (key: string) => {
        const p = presets.find((x) => x.key === key);
        if (!p) return;
        setPreset(key);
        setShown(sources.map((s) => s.key).filter((k) => p.sources.indexOf(k) >= 0));
        setActive(null);
    };
    const toggleSource = (key: string) => {
        const on = shown.indexOf(key) >= 0;
        if (on && shown.length <= 1) return;
        const next = sources.map((s) => s.key).filter((k) => (k === key ? !on : shown.indexOf(k) >= 0));
        setShown(next);
        setPreset('');
        if (active && active.source === key && on) setActive(null);
    };
    const resetView = () => {
        setView3d(defaultView);
        setPreset('all');
        setShown(sources.map((s) => s.key));
        setActive(null);
        setBaseline(defaultBaseline);
        setGrid(true);
        setFloor(true);
        setPeakMarker(false);
        setView('chart');
    };

    const onKeyDown = (e: any) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'];
        if (keys.indexOf(e.key) < 0 || !visible.length) return;
        e.preventDefault();
        if (e.key === 'Escape') {
            setActive(null);
            return;
        }
        const cur = active && shown.indexOf(active.source) >= 0 ? active : null;
        if (!cur) {
            setActive({ source: visible[visible.length - 1].key, hour: stats.peakHour });
            return;
        }
        const vi = visible.findIndex((s) => s.key === cur.source);
        let hour = cur.hour;
        let si = vi;
        if (e.key === 'ArrowLeft') hour = Math.max(0, hour - 1);
        if (e.key === 'ArrowRight') hour = Math.min(n - 1, hour + 1);
        if (e.key === 'Home') hour = 0;
        if (e.key === 'End') hour = n - 1;
        if (e.key === 'ArrowUp') si = Math.max(0, vi - 1);
        if (e.key === 'ArrowDown') si = Math.min(visible.length - 1, vi + 1);
        setActive({ source: visible[si].key, hour });
    };

    const activeSource = active ? sources.find((s) => s.key === active.source) : null;
    const activeValue = activeSource && active ? activeSource.values[active.hour] || 0 : 0;
    const activePct =
        active && stats.totals[active.hour] ? Math.round((activeValue / stats.totals[active.hour]) * 100) : 0;

    const rows = hours.map((h, i) => {
        const r: Record<string, any> = { hour: h };
        sources.forEach((s) => {
            r[s.key] = s.values[i];
        });
        r.total = Math.round(stats.totals[i] * 10) / 10;
        return r;
    });
    const summary = `${title}, ${description}: ${gw(stats.total)} GWh generated, ${signedPercent(base ? base.delta : 0)} ${base ? base.note : ''}, ${stats.renew}% renewable. Peak load ${gw(peakTotal)} GW at ${hours[stats.peakHour]}. ${sources
        .map((s, i) => `${s.label} ${stats.pct[i]}%`)
        .join(', ')}.`;
    const csv = {
        filename: 'generation-mix.csv',
        rows,
        columns: [{ key: 'hour', label: 'Hour' }]
            .concat(sources.map((s) => ({ key: s.key, label: `${s.label} (GW)` })))
            .concat([{ key: 'total', label: 'Total (GW)' }]),
    };

    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const hourTicks = [0, 0.25, 0.5, 0.75, 1];
    const pctX = (i: number) => `${n > 1 ? (i / (n - 1)) * 100 : 0}%`;

    const liftStyle = (key: string) => {
        if (shown.indexOf(key) < 0) return { transform: 'translateY(0px) scaleY(0)', opacity: 0 };
        if (active && active.source === key)
            return { transform: 'translateY(calc(var(--gm-lift) * -1)) scaleY(1)', opacity: 1 };
        return { transform: 'translateY(0px) scaleY(1)', opacity: active ? 0.24 : 1 };
    };

    const onRectOut = (e: any) => {
        const to = e.relatedTarget as Element | null;
        if (!to || !to.hasAttribute || !to.hasAttribute('data-hour')) setActive(null);
    };

    return (
        <SeriesScope config={config} className={className}>
            <style>{STAGE_CSS}</style>
            <Frame className="@container/gm min-w-0">
                <FrameHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription className="truncate">{description}</FrameDescription>
                    </div>
                    <ChartToolbar>
                        <SegmentedControl
                            label="Chart view"
                            value={view3d}
                            onValueChange={(v: any) => setView3d(v)}
                            options={[
                                { value: '3d', label: '3D' },
                                { value: '2d', label: '2D' },
                            ]}
                        />
                        <ToolbarGroup aria-label="Chart settings">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            className="bg-background"
                                            aria-label="Display options"
                                            title="Display options"
                                        />
                                    }
                                >
                                    <Icon name="settings-2" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Sources</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={preset}
                                            onValueChange={(v: any) => applyPreset(v)}
                                        >
                                            {presets.map((p) => (
                                                <DropdownMenuRadioItem key={p.key} value={p.key}>
                                                    <Icon name={p.icon} />
                                                    {p.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={grid}
                                            onCheckedChange={(c: boolean) => setGrid(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="grid-2x2" />
                                            Gridlines
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={floor}
                                            onCheckedChange={(c: boolean) => setFloor(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="panel-bottom" />
                                            Floor
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={peakMarker}
                                            onCheckedChange={(c: boolean) => setPeakMarker(c)}
                                            closeOnClick={false}
                                        >
                                            <Icon name="flag" />
                                            Peak Marker
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            className="bg-background"
                                            aria-label="Compare against"
                                            title="Compare against"
                                        />
                                    }
                                >
                                    <Icon name="scale" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-48">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Compare Against</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                            value={baseline}
                                            onValueChange={(v: any) => setBaseline(v)}
                                        >
                                            {baselines.map((b) => (
                                                <DropdownMenuRadioItem key={b.key} value={b.key}>
                                                    <Icon name={b.icon} />
                                                    {b.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                        <ToolbarGroup aria-label="Chart actions">
                            <ToolbarButton icon={<Icon name="refresh-cw" />} label="Refresh data" onClick={doReplay} />
                            {expandable ? (
                                <ToolbarButton
                                    icon={<Icon name="maximize-2" />}
                                    label="Expand chart"
                                    onClick={() => setExpanded(true)}
                                />
                            ) : null}
                            <ChartMoreMenu
                                title={title}
                                csv={csv}
                                json={{ filename: 'generation-mix.json', data: rows }}
                                summary={summary}
                                items={[
                                    { type: 'separator' },
                                    {
                                        label: view === 'table' ? 'View as chart' : 'View as table',
                                        icon: <Icon name={view === 'table' ? 'chart-area' : 'table'} />,
                                        onSelect: () => setView(view === 'table' ? 'chart' : 'table'),
                                    },
                                    { label: 'Reset View', icon: <Icon name="rotate-ccw" />, onSelect: resetView },
                                ]}
                            />
                        </ToolbarGroup>
                    </ChartToolbar>
                </FrameHeader>
                <FramePanel className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                                    {gw(stats.total)}
                                </span>
                                <span className="text-sm text-muted-foreground">GWh generated</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                {base ? (
                                    <>
                                        <span className="inline-flex items-center gap-1 font-medium text-foreground tabular-nums [&_svg]:size-3.5">
                                            <Icon name={base.delta < 0 ? 'trending-down' : 'trending-up'} />
                                            {signedPercent(base.delta)}
                                        </span>
                                        <span>{base.note}</span>
                                        <span
                                            aria-hidden="true"
                                            className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
                                        />
                                    </>
                                ) : null}
                                <span className="tabular-nums">{stats.renew}% renewable</span>
                            </div>
                        </div>
                        <div aria-live="polite" className="flex min-w-0 flex-col gap-1 sm:items-end sm:text-right">
                            {activeSource && active ? (
                                <>
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span
                                            aria-hidden="true"
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ background: `var(--color-${activeSource.key})` }}
                                        />
                                        {activeSource.label} at {hours[active.hour]}
                                    </span>
                                    <span className="text-sm font-medium tabular-nums">
                                        {gw(activeValue)} GW, {activePct}% of output
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        Peak load
                                    </span>
                                    <span className="text-sm font-medium tabular-nums">
                                        {gw(peakTotal)} GW at {hours[stats.peakHour]}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={rows}
                                index="hour"
                                indexLabel="Hour"
                                series={sources
                                    .map((s) => ({ key: s.key, label: s.label }))
                                    .concat([{ key: 'total', label: 'Total' }])}
                                valueFormatter={(v: number) => `${gw(v)} GW`}
                                caption={`${title}: ${description}`}
                            />
                        }
                    >
                        <div
                            ref={stageRef}
                            data-gm-stage="true"
                            data-view={view3d === '3d' ? '3d' : 'flat'}
                            data-revealing={revealing ? 'true' : undefined}
                            role="group"
                            aria-label="Hourly output by source in GW. Arrow keys read each hour."
                            tabIndex={0}
                            onKeyDown={onKeyDown}
                            onBlur={() => setActive(null)}
                            onPointerLeave={() => setActive(null)}
                            className="relative h-64 w-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-80!"
                            style={{ ['--gm-span' as any]: span }}
                        >
                            <div data-gm-camera="true" className="pointer-events-none absolute inset-0">
                                <div data-gm-rig="true" className="absolute inset-0">
                                    <div data-gm-scene="true" className="absolute top-3 right-0 bottom-7 left-11">
                                        <div
                                            data-gm-plane="true"
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0"
                                            style={{ ['--gm-z' as any]: -span }}
                                        >
                                            {ticks.map((t, i) => (
                                                <div
                                                    key={t}
                                                    className={`absolute inset-x-0 border-t ${grid ? 'border-border' : 'border-transparent'} ${t < 1 ? 'border-dashed' : ''}`}
                                                    style={{ top: `${t * 100}%` }}
                                                >
                                                    <span className="absolute top-0 right-full -translate-y-1/2 pr-2 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                                        {i === 0
                                                            ? `${stats.top * (1 - t)} GW`
                                                            : String(Math.round(stats.top * (1 - t) * 100) / 100)}
                                                    </span>
                                                </div>
                                            ))}
                                            {peakMarker ? (
                                                <div
                                                    className="absolute inset-y-0 animate-in border-l border-dashed border-foreground/40 duration-300 fade-in-0 motion-reduce:animate-none"
                                                    style={{ left: pctX(stats.peakHour) }}
                                                >
                                                    <span className="absolute top-1 left-1.5 text-xs font-medium whitespace-nowrap text-foreground">
                                                        Peak load
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div
                                            data-gm-floor="true"
                                            aria-hidden="true"
                                            data-hidden={floor ? undefined : 'true'}
                                            className="pointer-events-none absolute inset-x-0 top-full bg-muted/60"
                                        >
                                            {hourTicks.map((t) => (
                                                <span
                                                    key={t}
                                                    className="absolute inset-y-0 border-l border-border"
                                                    style={{ left: `${t * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        {sources.map((s, i) => {
                                            const on = shown.indexOf(s.key) >= 0;
                                            const lifted = !!active && active.source === s.key && on;
                                            return (
                                                <div
                                                    key={`f-${s.key}`}
                                                    data-gm-plane="true"
                                                    className="pointer-events-none absolute inset-0"
                                                    style={{ ['--gm-z' as any]: zOf(i) }}
                                                >
                                                    <div
                                                        data-gm-lift="true"
                                                        data-lifted={lifted ? 'true' : undefined}
                                                        className="absolute inset-0"
                                                        style={liftStyle(s.key)}
                                                    >
                                                        <div
                                                            data-gm-reveal="true"
                                                            data-index={i}
                                                            data-source={s.key}
                                                            className="absolute inset-0"
                                                        >
                                                            <svg
                                                                viewBox={`0 0 ${VW} ${VH}`}
                                                                preserveAspectRatio="none"
                                                                aria-hidden="true"
                                                                className="absolute inset-0 size-full overflow-visible"
                                                            >
                                                                <defs>
                                                                    <linearGradient
                                                                        id={`${uid}-${s.key}-fill`}
                                                                        x1="0"
                                                                        y1="0"
                                                                        x2="0"
                                                                        y2="1"
                                                                    >
                                                                        <stop
                                                                            offset="0%"
                                                                            stopColor={`var(--color-${s.key})`}
                                                                            stopOpacity={0.9}
                                                                        />
                                                                        <stop
                                                                            offset="100%"
                                                                            stopColor={`var(--color-${s.key})`}
                                                                            stopOpacity={0.2}
                                                                        />
                                                                    </linearGradient>
                                                                </defs>
                                                                <g data-gm-fill="true">
                                                                    <path
                                                                        d={geometry[i].fill}
                                                                        fill={`url(#${uid}-${s.key}-fill)`}
                                                                        stroke="none"
                                                                    />
                                                                </g>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <svg
                                                        viewBox={`0 0 ${VW} ${VH}`}
                                                        preserveAspectRatio="none"
                                                        aria-hidden="true"
                                                        className="pointer-events-none absolute inset-0 size-full"
                                                    >
                                                        <defs>
                                                            <clipPath id={`${uid}-${s.key}-clip`}>
                                                                <path d={geometry[i].fill} />
                                                            </clipPath>
                                                        </defs>
                                                        <g clipPath={`url(#${uid}-${s.key}-clip)`}>
                                                            {on
                                                                ? hours.map((_h, h) => {
                                                                      const step = n > 1 ? VW / (n - 1) : VW;
                                                                      const x0 = Math.max(0, x(h) - step / 2);
                                                                      const x1 = Math.min(VW, x(h) + step / 2);
                                                                      return (
                                                                          <rect
                                                                              key={h}
                                                                              data-hour={h}
                                                                              x={x0}
                                                                              y={0}
                                                                              width={x1 - x0}
                                                                              height={VH}
                                                                              fill="transparent"
                                                                              pointerEvents="visiblePainted"
                                                                              onPointerEnter={() =>
                                                                                  setActive({ source: s.key, hour: h })
                                                                              }
                                                                              onPointerOut={onRectOut}
                                                                          />
                                                                      );
                                                                  })
                                                                : null}
                                                        </g>
                                                    </svg>
                                                </div>
                                            );
                                        })}
                                        {sources.map((s, i) => {
                                            const on = shown.indexOf(s.key) >= 0;
                                            const lifted = !!active && active.source === s.key && on;
                                            const v = active ? s.values[active.hour] || 0 : 0;
                                            return (
                                                <div
                                                    key={`i-${s.key}`}
                                                    data-gm-plane="true"
                                                    data-ink="true"
                                                    className="pointer-events-none absolute inset-0"
                                                    style={{ ['--gm-z' as any]: zOf(i) }}
                                                >
                                                    <div
                                                        data-gm-lift="true"
                                                        data-lifted={lifted ? 'true' : undefined}
                                                        className="absolute inset-0"
                                                        style={liftStyle(s.key)}
                                                    >
                                                        <div
                                                            data-gm-reveal="true"
                                                            data-index={i}
                                                            data-source={s.key}
                                                            className="absolute inset-0"
                                                        >
                                                            <svg
                                                                viewBox={`0 0 ${VW} ${VH}`}
                                                                preserveAspectRatio="none"
                                                                aria-hidden="true"
                                                                className="absolute inset-0 size-full overflow-visible"
                                                            >
                                                                <path
                                                                    d={geometry[i].ink}
                                                                    fill="none"
                                                                    stroke={`var(--color-${s.key})`}
                                                                    strokeWidth={1.5}
                                                                    vectorEffect="non-scaling-stroke"
                                                                />
                                                            </svg>
                                                            {active ? (
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="absolute bottom-0 w-px -translate-x-1/2"
                                                                    style={{
                                                                        left: pctX(active.hour),
                                                                        height: `${(v / stats.top) * 100}%`,
                                                                        background: `var(--color-${s.key})`,
                                                                    }}
                                                                >
                                                                    <span
                                                                        className="absolute top-0 left-1/2 size-2.5 -translate-1/2 rounded-full border-2 border-card"
                                                                        style={{ background: `var(--color-${s.key})` }}
                                                                    />
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div
                                            data-gm-plane="true"
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0"
                                            style={{ ['--gm-z' as any]: span }}
                                        >
                                            {hourTicks.map((t, i) => {
                                                const h = Math.round(t * (n - 1));
                                                const edge =
                                                    i === 0
                                                        ? ''
                                                        : i === hourTicks.length - 1
                                                          ? '-translate-x-full'
                                                          : `-translate-x-1/2 ${i % 2 ? '@max-sm:hidden' : ''}`;
                                                return (
                                                    <span
                                                        key={t}
                                                        className={`absolute top-full mt-2 text-xs text-muted-foreground tabular-nums ${edge}`}
                                                        style={{ left: `${t * 100}%` }}
                                                    >
                                                        {hours[h]}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ChartFigure>
                    <ul className="sr-only">
                        {sources.map((s, i) => {
                            let ph = 0;
                            s.values.forEach((v, h) => {
                                if (v > s.values[ph]) ph = h;
                            });
                            return (
                                <li key={s.key}>
                                    {s.label}: {stats.e[i].toFixed(1)} GWh, peak {gw(s.values[ph])} GW at {hours[ph]}
                                </li>
                            );
                        })}
                    </ul>
                </FramePanel>
                <FrameFooter>
                    <div
                        role="group"
                        aria-label="Sources in the chart"
                        className="flex w-fit flex-row flex-wrap items-center gap-2"
                    >
                        {sources.map((s, i) => {
                            const on = shown.indexOf(s.key) >= 0;
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleSource(s.key)}
                                    className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-2 text-[0.8rem] font-medium whitespace-nowrap text-muted-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground dark:border-input"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`size-2 shrink-0 rounded-full ${on ? '' : 'border border-muted-foreground/60'}`}
                                        style={on ? { background: `var(--color-${s.key})` } : undefined}
                                    />
                                    {s.label}
                                    <span className="text-muted-foreground tabular-nums">{stats.pct[i]}%</span>
                                    <span className="sr-only"> of output</span>
                                </button>
                            );
                        })}
                    </div>
                </FrameFooter>
            </Frame>
            {expandable ? (
                <ChartExpandDialog open={expanded} onOpenChange={setExpanded} title={title}>
                    <GenerationMix
                        title={title}
                        description={description}
                        sources={sources}
                        presets={presets}
                        baselines={baselines}
                        defaultBaseline={defaultBaseline}
                        renewable={renewable}
                        defaultView={view3d}
                        hours={hoursProp}
                        expandable={false}
                    />
                </ChartExpandDialog>
            ) : null}
        </SeriesScope>
    );
}

export default GenerationMix;
