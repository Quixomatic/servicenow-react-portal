import { useId, useMemo } from 'react';
import { ChartContainer, ChartFigure, chartKey } from 'components:chart';
import { Frame, FramePanel } from 'components:chart-frame';
import { Icon } from 'components:icon';
import { series } from 'components:charts/chart-kit';
import { WALLETS, TREND_DOMAIN } from './data';
import type { Wallet } from './data';

/**
 * components:charts/wallet-balances: balance cards in one frame. Each card has a glossy icon tile, the
 * wallet name, the balance and its change (green up / red down), and a bottom-anchored line chart over
 * a dotted bed that fades in toward the bottom. Hovering the line shows the active point.
 *
 *   <WalletBalances />                                    sample data
 *   <WalletBalances wallets={[{ key, title, icon, tile, balance, change, changeAmount, up, trend }]} />
 *
 * Visual design inspired by ReUI's chart blocks; independent implementation.
 */

export type WalletBalancesProps = {
    title?: string;
    wallets?: Wallet[];
    domain?: [number, number];
    className?: string;
};

const UP = { value: series('emerald-500', 'emerald-500', 'Balance') };
const DOWN = { value: series('rose-500', 'rose-500', 'Balance') };

const TILE: Record<string, string> = {
    ink: 'border-2 border-white bg-neutral-950 dark:border-border',
    indigo: 'border-2 border-background bg-indigo-600 dark:border-border',
    amber: 'border-2 border-background bg-amber-400 dark:border-border',
};

function DotBed() {
    const id = `rp-wb-${chartKey(useId())}`;
    return (
        <svg
            aria-hidden="true"
            fill="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-foreground/20"
        >
            <defs>
                <pattern
                    id={`${id}-dots`}
                    width="1"
                    height="1"
                    patternUnits="userSpaceOnUse"
                    patternTransform="matrix(4.5 0 0 4.5 0 0)"
                    viewBox="0 0 9 9"
                    preserveAspectRatio="none"
                >
                    <g>
                        <rect fill="currentColor" rx="1" x="2" y="2" width="2" height="2" />
                    </g>
                </pattern>
                <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="white" stopOpacity="0" />
                    <stop offset="0.28" stopColor="white" stopOpacity="0.45" />
                    <stop offset="1" stopColor="white" />
                </linearGradient>
                <mask id={`${id}-fade-mask`}>
                    <rect fill={`url(#${id}-fade)`} width="100%" height="96" />
                </mask>
            </defs>
            <rect fill={`url(#${id}-dots)`} width="100%" height="96" mask={`url(#${id}-fade-mask)`} />
        </svg>
    );
}

function WalletCard({ w, domain }: { w: Wallet; domain: [number, number] }) {
    const rows = useMemo(() => w.trend.map((value, i) => ({ i, value })), [w.trend]);
    const summary = `${w.title}: ${w.balance}, ${w.change} (${w.changeAmount}). Trend ${
        w.trend[w.trend.length - 1] >= w.trend[0] ? 'up' : 'down'
    } over ${w.trend.length} points.`;
    return (
        <FramePanel className="min-h-[178px] p-0!">
            <div className="relative isolate h-full min-h-[178px] overflow-hidden">
                <DotBed />
                <div className="relative z-10 flex items-start gap-2.5 p-5">
                    <div
                        className={`relative isolate flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.35)] [&_svg]:size-5 [&_svg]:text-white ${TILE[w.tile]}`}
                    >
                        {w.tile === 'ink' ? (
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-0 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_0.6px,transparent_0.65px)] [background-size:3px_3px] opacity-[0.42] dark:opacity-[0.38]"
                            />
                        ) : null}
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-[1] [background-image:radial-gradient(48.05%_48.05%_at_50%_5.95%,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_100%)]"
                        />
                        <span className="relative z-10">
                            <Icon name={w.icon} aria-hidden="true" />
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm leading-none text-muted-foreground">{w.title}</h3>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                            <span className="text-base font-medium">{w.balance}</span>
                            <span className={`text-sm ${w.up ? 'text-success' : 'text-destructive'}`}>
                                {w.change} ({w.changeAmount})
                            </span>
                        </div>
                    </div>
                </div>
                <ChartFigure title={`${w.title} trend`} summary={summary}>
                    <ChartContainer
                        config={w.up ? UP : DOWN}
                        className="absolute inset-x-0 bottom-0 aspect-auto h-24 w-full"
                    >
                        {(R: any) => (
                            <R.LineChart
                                data={rows}
                                margin={{ top: 10, right: 0, bottom: 12, left: 0 }}
                                accessibilityLayer
                            >
                                <R.YAxis hide domain={domain} />
                                <R.Tooltip cursor={false} content={() => null} />
                                <R.Line
                                    dataKey="value"
                                    type="linear"
                                    stroke="var(--color-value)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{
                                        r: 4,
                                        fill: 'var(--color-value)',
                                        stroke: 'var(--card)',
                                        strokeWidth: 2,
                                    }}
                                    isAnimationActive={false}
                                />
                            </R.LineChart>
                        )}
                    </ChartContainer>
                </ChartFigure>
            </div>
        </FramePanel>
    );
}

export function WalletBalances({
    title = 'Wallet Balances',
    wallets = WALLETS,
    domain = TREND_DOMAIN,
    className,
}: WalletBalancesProps) {
    return (
        <div className={`@container w-full min-w-0 ${className || ''}`} role="group" aria-label={title}>
            <Frame>
                <div className="grid gap-1 @2xl:grid-cols-3">
                    {wallets.map((w) => (
                        <WalletCard key={w.key} w={w} domain={domain} />
                    ))}
                </div>
            </Frame>
        </div>
    );
}

export default WalletBalances;
