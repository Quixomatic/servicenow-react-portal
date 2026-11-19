import { useState } from 'react'
import { usePortal, Link } from '@portal/runtime'
import { Button } from 'components:button'

type NavItem = { label: string; to: string }
type Props = { options?: { brand?: string } }

/** Portal-level header. The click counter proves it stays mounted across page navigation. */
export default function SiteHeader({ options }: Props) {
    const { portal } = usePortal()
    const [clicks, setClicks] = useState(0)
    const nav: NavItem[] = Array.isArray(portal?.navigation) ? portal.navigation : []

    return (
        <div className="flex items-center gap-6 bg-card px-6 py-3 text-card-foreground">
            <div className="text-lg font-bold text-primary">{options?.brand || portal?.name || 'Portal'}</div>
            <nav className="flex flex-1 items-center gap-4">
                {nav.map((item) => (
                    <Link key={item.label} to={item.to} className="text-sm text-foreground no-underline hover:text-primary">
                        {item.label}
                    </Link>
                ))}
            </nav>
            <Button variant="outline" size="sm" onClick={() => setClicks(clicks + 1)} title="Local state survives page navigation">
                Header clicks: {clicks}
            </Button>
        </div>
    )
}
