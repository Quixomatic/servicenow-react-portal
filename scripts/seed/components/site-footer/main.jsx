// Plain JSX on purpose: components can be written in JS/JSX as well as TS/TSX.
// Owns its look: top border, padding, muted small text.
import { usePortal } from '@portal/runtime'

export default function SiteFooter({ options }) {
    const { release, theme } = usePortal()
    const parts = [options?.text || 'React Portal', release ? `release rev ${release.version}` : 'unprocessed', theme ? theme.name || theme.key : 'no theme']
    return <div className="border-t px-6 py-3 text-xs text-muted-foreground">{parts.join(' · ')}</div>
}
