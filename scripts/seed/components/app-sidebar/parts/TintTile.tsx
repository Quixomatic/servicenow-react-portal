import { Icon } from 'components:icon'

// Tinted icon tile (ChannelGuide's TintedIconTile) on theme tokens: chart-1…chart-5 or neutral.
const TINTS: Record<string, string> = {
    'chart-1': 'border-chart-1/30 bg-chart-1/15 text-chart-1',
    'chart-2': 'border-chart-2/30 bg-chart-2/15 text-chart-2',
    'chart-3': 'border-chart-3/30 bg-chart-3/15 text-chart-3',
    'chart-4': 'border-chart-4/30 bg-chart-4/15 text-chart-4',
    'chart-5': 'border-chart-5/30 bg-chart-5/15 text-chart-5',
    neutral: 'border-sidebar-border bg-background text-sidebar-foreground/80',
}

const SIZES: Record<string, { tile: string; icon: string }> = {
    sm: { tile: 'size-4 rounded-[3px]', icon: 'size-2.5!' },
    md: { tile: 'size-5 rounded-[4px]', icon: 'size-3!' },
    lg: { tile: 'size-7 rounded-md', icon: 'size-4!' },
}

export function tintKey(tint?: string) {
    if (!tint) return 'neutral'
    const t = String(tint).replace(/^--/, '')
    if (TINTS[t]) return t
    if (/^[1-5]$/.test(t)) return 'chart-' + t
    return 'neutral'
}

export function TintTile({ icon, tint, size = 'md', label }: { icon?: string; tint?: string; size?: 'sm' | 'md' | 'lg'; label?: string }) {
    const s = SIZES[size] || SIZES.md
    return (
        <span aria-hidden="true" data-slot="tinted-icon-tile" className={'inline-flex shrink-0 items-center justify-center border ' + s.tile + ' ' + TINTS[tintKey(tint)]}>
            {icon ? <Icon name={icon} className={s.icon} /> : <span className="text-[10px] leading-none font-semibold uppercase">{(label || '?').slice(0, 1)}</span>}
        </span>
    )
}
