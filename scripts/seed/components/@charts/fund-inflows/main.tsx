import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartFigure, ChartDataTable } from 'components:chart';
import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
    FrameFooter,
    ToolbarGroup,
    rowsToCsv,
    downloadText,
    copyText,
} from 'components:chart-frame';
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
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { toast } from '@portal/runtime';
import { series, SeriesScope, useReplayKey } from 'components:charts/chart-kit';
import { TEXT_TRIM, MenuSelect, RefreshButton, DeltaChip, useBusy, niceTicks } from 'components:charts/bar-kit';
import { YEARS, FUNDS, BOOKED_THROUGH, ELAPSED } from './data';
import type { Fund, InflowYear } from './data';

/**
 * components:charts/fund-inflows: yearly capital inflows as pseudo-3D prisms (front, skewed side and
 * top faces in plain HTML) stacked by fund, with a hatched run-rate estimate on the partial year. Pick a
 * year (click / arrow keys) to drive the KPI tiles, isolate a fund from the legend or the fund menu,
 * switch the prisms to totals, toggle value labels / estimate / gridlines, choose the year range,
 * refresh (replays the rise), and export CSV / TSV / summary.
 *
 *   <FundInflows />                                   sample data
 *   <FundInflows funds={[…]} years={[…]} elapsed={0.75} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type FundInflowsProps = {
    title?: string;
    funds?: Fund[];
    years?: InflowYear[];
    elapsed?: number;
    bookedThrough?: string;
    currency?: string;
    className?: string;
};

type Range = 'all' | '5' | '3';
type Prisms = 'fund' | 'total';

const EASE = [0.22, 1, 0.36, 1];

/** 3 significant digits, trailing zeros trimmed: 7604600 → "$7.6M", 1512600 → "$1.51M", 0 → "$0". */
function money(v: number): string {
    const a = Math.abs(v);
    const sig = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/\.?0+$/, '');
    if (a >= 1e9) return `$${sig(v / 1e9)}B`;
    if (a >= 1e6) return `$${sig(v / 1e6)}M`;
    if (a >= 1e3) return `$${sig(v / 1e3)}K`;
    return `$${Math.round(v)}`;
}

function reducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        !!window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: any }) {
    return (
        <div className="flex min-w-0 flex-col gap-2 @3xl:py-(--frame-panel-py) @3xl:not-first:border-s @3xl:not-first:ps-6 @3xl:not-last:pe-6">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-2">
                <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
                <span className="flex h-5 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{children}</span>
            </dd>
        </div>
    );
}

function Sub({ children }: { children?: any }) {
    return (
        <span className="flex h-4 min-w-0 items-center tabular-nums">
            <span className={`${TEXT_TRIM} overflow-x-clip text-ellipsis whitespace-nowrap`}>{children}</span>
        </span>
    );
}

type Layer = { key: string; color: string; frac: number; offset: number };

/** One prism: front layers, the skewed right side (shaded), the top cap and the value label. */
function Prism({
    layers,
    total,
    top,
    capColor,
    label,
    estimate,
    estColor,
    i,
}: {
    layers: Layer[];
    total: number;
    top: number;
    capColor: string;
    label: any;
    estimate: number;
    estColor: string;
    i: number;
}) {
    const shade = (c: string) => `color-mix(in oklab, ${c} 72%, black)`;
    const tf = (l: Layer) => `translateY(${-l.offset * 100}%) scaleY(${l.frac})`;
    const tt = 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
    const sum = total / top;
    const est = estimate > total ? (estimate - total) / top : 0;
    return (
        <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                {layers.map((l) => (
                    <span
                        key={l.key}
                        data-rise=""
                        data-i={i}
                        className={`absolute inset-0 origin-bottom ${tt} bg-linear-to-t from-(--layer) to-(--layer)/65`}
                        style={{ ['--layer' as any]: l.color, transform: tf(l) }}
                    />
                ))}
                <span className="absolute inset-y-0 left-full w-(--depth) origin-bottom-left -skew-y-45">
                    {layers.map((l) => (
                        <span
                            key={l.key}
                            data-rise=""
                            data-i={i}
                            className={`absolute inset-0 origin-bottom ${tt} bg-linear-to-t from-(--layer-shade) to-(--layer-shade)/65`}
                            style={{ ['--layer-shade' as any]: shade(l.color), transform: tf(l) }}
                        />
                    ))}
                </span>
                <span
                    data-lift=""
                    data-i={i}
                    className={`absolute inset-0 ${tt}`}
                    style={{
                        ['--cap' as any]: `color-mix(in oklab, ${capColor} 35%, var(--background))`,
                        transform: `translateY(${(1 - sum) * 100}%)`,
                    }}
                >
                    <span className="absolute bottom-full left-0 h-(--depth) w-full origin-bottom -skew-x-45 bg-(--cap)" />
                    {est ? null : label}
                </span>
            </span>
            {est ? (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <span
                        data-rise=""
                        data-i={i}
                        className={`absolute inset-0 origin-bottom ${tt} bg-(--layer)/8`}
                        style={{
                            ['--layer' as any]: estColor,
                            transform: `translateY(${-sum * 100}%) scaleY(${est})`,
                            backgroundImage: `linear-gradient(to bottom right, transparent 42%, color-mix(in oklab, ${estColor} 40%, transparent) 42% 58%, transparent 58%)`,
                            backgroundSize: `6px ${6 / Math.max(est, 0.01)}px`,
                        }}
                    />
                    <span className="absolute inset-y-0 left-full w-(--depth) origin-bottom-left -skew-y-45">
                        <span
                            data-rise=""
                            data-i={i}
                            className={`absolute inset-0 origin-bottom ${tt} bg-(--layer)/16`}
                            style={{
                                ['--layer' as any]: estColor,
                                transform: `translateY(${-sum * 100}%) scaleY(${est})`,
                            }}
                        />
                    </span>
                    <span
                        data-lift=""
                        data-i={i}
                        className={`absolute inset-0 ${tt}`}
                        style={{ ['--cap' as any]: estColor, transform: `translateY(${(1 - sum - est) * 100}%)` }}
                    >
                        <span className="absolute bottom-full left-0 h-(--depth) w-full origin-bottom -skew-x-45 bg-(--cap)/14" />
                        {label}
                    </span>
                </span>
            ) : null}
        </>
    );
}

export function FundInflows({
    title = 'Capital Inflows',
    funds = FUNDS,
    years: allYears = YEARS,
    elapsed = ELAPSED,
    bookedThrough = BOOKED_THROUGH,
    currency = 'USD',
    className,
}: FundInflowsProps) {
    const lastFull = (() => {
        for (let k = allYears.length - 1; k >= 0; k -= 1) if (!allYears[k].ytd) return allYears[k].year;
        return allYears[allYears.length - 1].year;
    })();
    const [range, setRange] = useState<Range>('all');
    const [fund, setFund] = useState<string>('all');
    const [prisms, setPrisms] = useState<Prisms>('fund');
    const [layersOn, setLayersOn] = useState({ labels: true, estimate: true, grid: true });
    const [selected, setSelected] = useState<number>(lastFull);
    const [hover, setHover] = useState<number | null>(null);
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [replay, bump] = useReplayKey();
    const [busy, refresh] = useBusy(600, bump);

    const config = useMemo(() => {
        const c: Record<string, any> = {};
        funds.forEach((f) => {
            c[f.key] = series(f.color, f.color, f.label);
        });
        return c;
    }, [funds]);
    const colorOf = (k: string) => `var(--color-${k})`;

    const years = range === 'all' ? allYears : allYears.slice(Math.max(0, allYears.length - Number(range)));
    const fundObj = funds.find((f) => f.key === fund) || null;
    const keys = fundObj ? [fundObj.key] : funds.map((f) => f.key);
    const valOf = (y: InflowYear) => keys.reduce((s, k) => s + (y.values[k] || 0), 0);
    const runRate = (y: InflowYear) => (y.ytd ? valOf(y) / (elapsed || 1) : valOf(y));
    const peak = years.reduce((m, y) => Math.max(m, layersOn.estimate ? runRate(y) : valOf(y)), 0);
    const { ticks, top } = niceTicks(peak, 4);

    const sel = years.find((y) => y.year === selected) || years[years.length - 1];
    const prevOf = (y: InflowYear) => allYears[allYears.indexOf(y) - 1] || null;
    const ytdYear = allYears.find((y) => y.ytd) || null;
    const selPrev = prevOf(sel);
    const selDelta = selPrev ? ((sel.ytd ? runRate(sel) : valOf(sel)) / valOf(selPrev) - 1) * 100 : null;
    const shareOf = (y: InflowYear, k: string) => {
        const t = funds.reduce((s, f) => s + (y.values[f.key] || 0), 0) || 1;
        return ((y.values[k] || 0) / t) * 100;
    };
    const topFund = funds.reduce((a, f) => (shareOf(sel, f.key) > shareOf(sel, a.key) ? f : a), funds[0]);
    const kpiFund = fundObj || topFund;
    const fullYears = years.filter((y) => !y.ytd);
    const first = fullYears[0];
    const last = fullYears[fullYears.length - 1];
    const cagr =
        first && last && last.year > first.year
            ? (Math.pow(valOf(last) / valOf(first), 1 / (last.year - first.year)) - 1) * 100
            : null;
    const ytdPrev = ytdYear ? prevOf(ytdYear) : null;
    const ytdDelta = ytdYear && ytdPrev ? (runRate(ytdYear) / valOf(ytdPrev) - 1) * 100 : null;

    // Enter: every face rises from the floor (700 ms, 70 ms per year); caps lift with them.
    const plotRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const root = plotRef.current;
        if (!root || reducedMotion()) return undefined;
        const anims: any[] = [];
        const ease = `cubic-bezier(${EASE.join(',')})`;
        Array.prototype.slice.call(root.querySelectorAll('[data-rise],[data-lift]')).forEach((el: HTMLElement) => {
            if (!el.animate) return;
            const delay = (Number(el.getAttribute('data-i')) || 0) * 70;
            const to = el.style.transform;
            const from = el.hasAttribute('data-rise') ? 'translateY(0px) scaleY(0)' : 'translateY(100%)';
            anims.push(
                el.animate([{ transform: from }, { transform: to }], {
                    duration: 700,
                    delay,
                    easing: ease,
                    fill: 'backwards',
                })
            );
        });
        return () => anims.forEach((a) => a.cancel());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replay, range, view]);

    const yearName = (y: InflowYear) => (y.ytd ? `${y.year} YTD` : `${y.year}`);
    const describe = (y: InflowYear) => {
        const p = prevOf(y);
        const v = valOf(y);
        const ch = p ? ((y.ytd ? runRate(y) : v) / valOf(p) - 1) * 100 : 0;
        const chText = p
            ? `${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(1)}% on ${p.year}`
            : 'first year on record';
        return y.ytd
            ? `${y.year} to date: ${money(v)}, run-rate ${money(runRate(y))}, ${chText}`
            : `${y.year}: ${money(v)}, ${chText}`;
    };
    const scope = fundObj ? fundObj.label : `${funds.length} funds`;
    const summary = `${title}, ${scope}: ${years.map(describe).join('; ')}.${
        cagr != null ? ` Compounded growth ${cagr.toFixed(1)}% a year since ${first.year}.` : ''
    }`;
    const tableRows = years.map((y) => {
        const r: Record<string, any> = { year: yearName(y) };
        funds.forEach((f) => {
            r[f.key] = y.values[f.key] || 0;
        });
        r.total = funds.reduce((s, f) => s + (y.values[f.key] || 0), 0);
        return r;
    });
    const columns = [{ key: 'year', label: 'Year' }]
        .concat(funds.map((f) => ({ key: f.key, label: f.label })))
        .concat([{ key: 'total', label: 'Total' }]);
    const copy = async (text: string, what: string) => {
        if (await copyText(text)) toast.success(`${what} copied`);
        else toast.error('Could not copy to the clipboard');
    };
    const reset = () => {
        setRange('all');
        setFund('all');
        setPrisms('fund');
        setLayersOn({ labels: true, estimate: true, grid: true });
        setSelected(lastFull);
        setView('chart');
    };
    const pick = (k: number) => {
        const y = years[Math.max(0, Math.min(years.length - 1, k))];
        if (!y) return;
        setSelected(y.year);
        const el = plotRef.current && (plotRef.current.querySelector(`[data-year="${y.year}"]`) as HTMLElement | null);
        if (el) el.focus();
    };
    const rangeOptions = [
        { value: '3', label: 'Last 3 Years', icon: 'calendar' },
        { value: '5', label: 'Last 5 Years', icon: 'calendar-range' },
        { value: 'all', label: 'All Years', icon: 'calendar-days' },
    ].map((o) => {
        const ys = o.value === 'all' ? allYears : allYears.slice(Math.max(0, allYears.length - Number(o.value)));
        return { ...o, note: `${ys[0].year} to ${ys[ys.length - 1].year}` };
    });

    return (
        <SeriesScope config={config} className={`w-full min-w-0 ${className || ''}`}>
            <Frame dense stacked className="@container min-w-0">
                <FrameHeader className="flex-row! flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-px">
                        <FrameTitle>{title}</FrameTitle>
                        <FrameDescription>
                            {fundObj
                                ? `Net new capital into ${fundObj.label} by year`
                                : `Net new capital by year across ${funds.length} funds`}
                        </FrameDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ToolbarGroup aria-label="Data scope">
                            <MenuSelect
                                options={rangeOptions}
                                value={range}
                                onValueChange={(v) => setRange(v as Range)}
                                icon="calendar"
                                label="Year range"
                                menuLabel="Year Range"
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-background"
                                            aria-label={`Fund: ${fundObj ? fundObj.label : 'All Funds'}`}
                                        />
                                    }
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`size-2 shrink-0 rounded-full ${fundObj ? '' : 'bg-foreground'}`}
                                        style={fundObj ? { background: colorOf(fundObj.key) } : undefined}
                                    />
                                    <span className={`@max-md:sr-only ${TEXT_TRIM}`}>
                                        {fundObj ? fundObj.label : 'All Funds'}
                                    </span>
                                    <Icon name="chevron-down" className="text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-48">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Fund</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={fund} onValueChange={(v: string) => setFund(v)}>
                                            <DropdownMenuRadioItem value="all">
                                                <span
                                                    aria-hidden="true"
                                                    className="size-2 shrink-0 rounded-full bg-foreground"
                                                />
                                                All Funds
                                            </DropdownMenuRadioItem>
                                            {funds.map((f) => (
                                                <DropdownMenuRadioItem key={f.key} value={f.key}>
                                                    <span
                                                        aria-hidden="true"
                                                        className="size-2 shrink-0 rounded-full"
                                                        style={{ background: colorOf(f.key) }}
                                                    />
                                                    {f.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="outline" size="sm" className="bg-background" />}
                            >
                                <Icon name="settings-2" />
                                <span className={`@max-md:sr-only ${TEXT_TRIM}`}>Display</span>
                                <Icon name="chevron-down" className="text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-auto min-w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Prisms</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={prisms}
                                        onValueChange={(v: string) => setPrisms(v as Prisms)}
                                    >
                                        <DropdownMenuRadioItem value="fund">
                                            <Icon name="layers" />
                                            By Fund
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="total">
                                            <Icon name="chart-column" />
                                            Total
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Layers</DropdownMenuLabel>
                                    <DropdownMenuCheckboxItem
                                        checked={layersOn.labels}
                                        closeOnClick={false}
                                        onCheckedChange={(c: boolean) => setLayersOn((v) => ({ ...v, labels: !!c }))}
                                    >
                                        <Icon name="tag" />
                                        Value Labels
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={layersOn.estimate}
                                        closeOnClick={false}
                                        onCheckedChange={(c: boolean) => setLayersOn((v) => ({ ...v, estimate: !!c }))}
                                    >
                                        <Icon name="target" />
                                        Run-rate Estimate
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={layersOn.grid}
                                        closeOnClick={false}
                                        onCheckedChange={(c: boolean) => setLayersOn((v) => ({ ...v, grid: !!c }))}
                                    >
                                        <Icon name="grid-2x2" />
                                        Gridlines
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ToolbarGroup aria-label="Chart actions">
                            <RefreshButton busy={busy} onClick={refresh} />
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
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
                                        <DropdownMenuLabel>Export</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                downloadText('capital-inflows.csv', rowsToCsv(tableRows, columns));
                                                toast.success('CSV downloaded', { description: 'capital-inflows.csv' });
                                            }}
                                        >
                                            <Icon name="download" />
                                            Download CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                copy(
                                                    [columns.map((c) => c.label).join('\t')]
                                                        .concat(
                                                            tableRows.map((r) =>
                                                                columns.map((c) => r[c.key]).join('\t')
                                                            )
                                                        )
                                                        .join('\n'),
                                                    'Data'
                                                )
                                            }
                                        >
                                            <Icon name="table" />
                                            Copy Data
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copy(summary, 'Summary')}>
                                            <Icon name="file-text" />
                                            Copy Summary
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
                                        <Icon name={view === 'table' ? 'chart-column' : 'rows-3'} />
                                        {view === 'table' ? 'View as Chart' : 'View as Table'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={reset}>
                                        <Icon name="rotate-ccw" />
                                        Reset View
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ToolbarGroup>
                    </div>
                </FrameHeader>
                <FramePanel>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 @3xl:-my-(--frame-panel-py) @3xl:grid-cols-4 @3xl:gap-0">
                        <Kpi label={sel.ytd ? `${sel.year} to Date` : `${sel.year} Inflows`} value={money(valOf(sel))}>
                            {selDelta != null && selPrev ? (
                                <>
                                    <DeltaChip signed value={selDelta} />
                                    <Sub>{sel.ytd ? `pace vs ${selPrev.year}` : `vs ${selPrev.year}`}</Sub>
                                </>
                            ) : (
                                <Sub>First year on record</Sub>
                            )}
                        </Kpi>
                        <Kpi
                            label={fundObj ? 'Fund Share' : 'Top Fund'}
                            value={`${shareOf(sel, kpiFund.key).toFixed(1)}%`}
                        >
                            <span
                                aria-hidden="true"
                                className="flex size-5 shrink-0 items-center justify-center rounded-md border bg-background [&_svg]:size-3"
                                style={{ color: colorOf(kpiFund.key) }}
                            >
                                <Icon name={kpiFund.icon} />
                            </span>
                            <Sub>{kpiFund.label}</Sub>
                        </Kpi>
                        <Kpi
                            label={ytdYear ? `${ytdYear.year} Run-rate` : 'Run-rate'}
                            value={ytdYear ? money(runRate(ytdYear)) : '—'}
                        >
                            {ytdDelta != null && ytdPrev ? (
                                <>
                                    <DeltaChip signed value={ytdDelta} />
                                    <Sub>{`vs ${ytdPrev.year}`}</Sub>
                                </>
                            ) : null}
                        </Kpi>
                        <Kpi
                            label="Yearly Growth"
                            value={cagr != null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : '—'}
                        >
                            <Sub>{first ? `Compounded since ${first.year}` : ''}</Sub>
                        </Kpi>
                    </dl>
                </FramePanel>
                <FramePanel>
                    <ChartFigure
                        title={title}
                        summary={summary}
                        view={view}
                        table={
                            <ChartDataTable
                                data={tableRows}
                                index="year"
                                indexLabel="Year"
                                series={funds
                                    .map((f) => ({ key: f.key, label: f.label }))
                                    .concat([{ key: 'total', label: 'Total' }])}
                                valueFormatter={(v: number) => money(v)}
                                caption={`Net new capital by fund and year (${currency})`}
                            />
                        }
                    >
                        <div className="flex min-w-0 flex-col gap-2">
                            <div
                                ref={plotRef}
                                className="relative flex h-72 min-w-0 [--depth:--spacing(2.5)] [--prism-w:--spacing(14)] @3xl:h-88 @3xl:[--depth:--spacing(3.5)] @3xl:[--prism-w:--spacing(20)]"
                            >
                                <div className="relative w-11 shrink-0">
                                    <div className="absolute inset-x-0 top-10 bottom-10">
                                        {ticks.map((t) => (
                                            <span
                                                key={t}
                                                className="absolute right-3 translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                                                style={{ bottom: `${(t / top) * 100}%` }}
                                            >
                                                {t ? money(t) : '$0'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative min-w-0 flex-1 overflow-clip">
                                    <div
                                        className={`pointer-events-none absolute inset-x-0 top-10 bottom-10 transition-opacity duration-200 ${
                                            layersOn.grid ? 'opacity-100' : 'opacity-0'
                                        }`}
                                    >
                                        {ticks
                                            .filter((t) => t > 0)
                                            .map((t) => (
                                                <span
                                                    key={t}
                                                    className="absolute inset-x-0 border-t border-border/60"
                                                    style={{ bottom: `${(t / top) * 100}%` }}
                                                />
                                            ))}
                                    </div>
                                    <div className="pointer-events-none absolute right-(--depth) bottom-8 left-0 h-2">
                                        <div className="absolute inset-0 bg-border" />
                                        <div className="absolute bottom-full left-0 h-(--depth) w-full origin-bottom -skew-x-45 bg-muted" />
                                        <div className="absolute inset-y-0 left-full w-(--depth) origin-bottom-left -skew-y-45 bg-input" />
                                    </div>
                                    <div
                                        role="radiogroup"
                                        aria-label="Inflows by year"
                                        className="relative flex h-full min-w-0 gap-2 @lg:gap-4"
                                        onMouseLeave={() => setHover(null)}
                                    >
                                        {years.map((y, yi) => {
                                            const isSel = y.year === sel.year;
                                            const lit = isSel || hover === y.year;
                                            const v = valOf(y);
                                            const showEst = !!y.ytd && layersOn.estimate;
                                            const rr = runRate(y);
                                            let acc = 0;
                                            const layers: Layer[] =
                                                prisms === 'total' && !fundObj
                                                    ? [
                                                          {
                                                              key: 'total',
                                                              color: 'var(--primary)',
                                                              frac: v / top,
                                                              offset: 0,
                                                          },
                                                      ]
                                                    : keys.map((k) => {
                                                          const frac = (y.values[k] || 0) / top;
                                                          const l = { key: k, color: colorOf(k), frac, offset: acc };
                                                          acc += frac;
                                                          return l;
                                                      });
                                            const topLayer = layers.filter((l) => l.frac > 0).pop();
                                            const label = layersOn.labels ? (
                                                <span className="absolute bottom-[calc(100%+var(--depth)+--spacing(1))] left-0 hidden w-[calc(100%+var(--depth))] text-center text-xs font-medium whitespace-nowrap text-foreground tabular-nums @3xl:block!">
                                                    {showEst ? (
                                                        <>
                                                            {money(rr)}
                                                            <span className="font-normal text-muted-foreground">
                                                                {' '}
                                                                est.
                                                            </span>
                                                        </>
                                                    ) : (
                                                        money(v)
                                                    )}
                                                </span>
                                            ) : null;
                                            return (
                                                <button
                                                    key={y.year}
                                                    type="button"
                                                    role="radio"
                                                    data-year={y.year}
                                                    aria-checked={isSel}
                                                    aria-label={describe(y)}
                                                    tabIndex={isSel ? 0 : -1}
                                                    onClick={() => setSelected(y.year)}
                                                    onMouseEnter={() => setHover(y.year)}
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            pick(yi + 1);
                                                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            pick(yi - 1);
                                                        } else if (e.key === 'Home') {
                                                            e.preventDefault();
                                                            pick(0);
                                                        } else if (e.key === 'End') {
                                                            e.preventDefault();
                                                            pick(years.length - 1);
                                                        }
                                                    }}
                                                    className="group/year flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center pt-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                                                >
                                                    <span className="relative w-full max-w-[calc(var(--prism-w)+var(--depth))] flex-1 pr-(--depth)">
                                                        <span
                                                            className={`relative block h-full transition-opacity duration-200 motion-reduce:transition-none ${
                                                                lit ? 'opacity-100' : 'opacity-45'
                                                            }`}
                                                        >
                                                            <Prism
                                                                layers={layers}
                                                                total={v}
                                                                top={top}
                                                                capColor={
                                                                    topLayer
                                                                        ? topLayer.color
                                                                        : 'var(--muted-foreground)'
                                                                }
                                                                label={label}
                                                                estimate={showEst ? rr : 0}
                                                                estColor={
                                                                    fundObj ? colorOf(fundObj.key) : 'var(--foreground)'
                                                                }
                                                                i={yi}
                                                            />
                                                        </span>
                                                    </span>
                                                    <span className="h-2 shrink-0" />
                                                    <span className="flex h-8 w-full max-w-[calc(var(--prism-w)+var(--depth))] shrink-0 flex-col items-center pr-(--depth) text-xs leading-4 tabular-nums @3xl:flex-row! @3xl:justify-center @3xl:gap-1">
                                                        <span
                                                            className={`transition-colors ${
                                                                isSel
                                                                    ? 'font-medium text-foreground'
                                                                    : 'text-muted-foreground group-hover/year:text-foreground'
                                                            }`}
                                                        >
                                                            {y.year}
                                                        </span>
                                                        {y.ytd ? (
                                                            <span className="text-muted-foreground">YTD</span>
                                                        ) : null}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="grid min-w-0 justify-items-center ps-11 @3xl:flex! @3xl:justify-center">
                                <div
                                    role="group"
                                    aria-label="Isolate a fund"
                                    className="grid w-fit grid-cols-2 items-center gap-1 @3xl:flex! @3xl:flex-wrap @3xl:justify-center"
                                >
                                    {funds.map((f) => {
                                        const on = fund === f.key;
                                        return (
                                            <button
                                                key={f.key}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => setFund(on ? 'all' : f.key)}
                                                className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                                                    on ? 'bg-muted text-foreground' : 'text-muted-foreground'
                                                }`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`size-2 shrink-0 rounded-full transition-opacity ${
                                                        fundObj && !on ? 'opacity-50' : ''
                                                    }`}
                                                    style={{ backgroundColor: colorOf(f.key) }}
                                                />
                                                {f.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </ChartFigure>
                </FramePanel>
                <FrameFooter className="flex-row! flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        {currency}
                        <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        Demo figures, unaudited
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                        {`Booked through ${bookedThrough}`}
                        <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        {busy ? 'Syncing…' : replay ? 'Synced just now' : 'Synced 2h ago'}
                    </span>
                </FrameFooter>
            </Frame>
        </SeriesScope>
    );
}

export default FundInflows;
