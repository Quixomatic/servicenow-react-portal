import { useState } from 'react'
import { usePortal, useNavigation, useSidebar, Link } from '@portal/runtime'
import { Button } from 'components:button'
import { SidebarTrigger } from 'components:sidebar'
import { Icon } from 'components:icon'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel } from 'components:dropdown-menu'
import { ModeToggle } from './parts/ModeToggle'

type Options = { brand?: string; menu?: string; showNav?: boolean; sidebarTrigger?: boolean }

/**
 * Portal-level header. Owns its look: 56px bar, card background, bottom border.
 * The menu comes from useNavigation() (active item resolved by the host). On a narrow frame the
 * menu collapses into a dropdown. The click counter proves it stays mounted across navigation.
 */
export default function SiteHeader({ options = {} }: { options?: Options }) {
    const { portal } = usePortal()
    const nav = useNavigation(options.menu || 'primary')
    const { isMobile } = useSidebar()
    const [clicks, setClicks] = useState(0)
    const links = nav.items.flatMap((i: any) => (i.type === 'group' ? i.children : [i])).filter((i: any) => i.type === 'route' || i.type === 'page' || i.type === 'url')
    const showNav = options.showNav !== false

    return (
        <div className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 text-card-foreground sm:px-6">
            {options.sidebarTrigger !== false ? <SidebarTrigger className="-ml-1" /> : null}
            <Link to="" className="truncate text-lg font-bold text-primary no-underline">
                {options.brand || portal?.name || 'Portal'}
            </Link>
            {showNav && !isMobile ? (
                <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                    {links.map((item: any) =>
                        item.type === 'url' ? (
                            <a key={item.id} href={item.href} target={item.target} rel="noreferrer" className="rounded-md px-2 py-1 text-sm whitespace-nowrap text-foreground no-underline hover:bg-muted hover:text-primary">
                                {item.label}
                            </a>
                        ) : (
                            <Link
                                key={item.id}
                                {...item.link}
                                aria-current={item.active ? 'page' : undefined}
                                className={
                                    'rounded-md px-2 py-1 text-sm whitespace-nowrap no-underline hover:bg-muted ' +
                                    (item.active ? 'font-medium text-primary' : 'text-foreground hover:text-primary')
                                }
                            >
                                {item.label}
                            </Link>
                        )
                    )}
                </nav>
            ) : (
                <div className="flex-1" />
            )}
            {showNav && isMobile ? <MobileMenu links={links} /> : null}
            <Button variant="outline" size="sm" onClick={() => setClicks(clicks + 1)} title="Local state survives page navigation" className="hidden sm:inline-flex">
                Header clicks: {clicks}
            </Button>
            <ModeToggle />
        </div>
    )
}

function MobileMenu({ links }: { links: any[] }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}>
                <Icon name="menu" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Menu</DropdownMenuLabel>
                    {links.map((item) =>
                        item.type === 'url' ? (
                            <DropdownMenuItem key={item.id} render={<a href={item.href} target={item.target} rel="noreferrer" />}>
                                {item.label}
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem key={item.id} render={<Link {...item.link} />} className={item.active ? 'font-medium text-primary' : undefined}>
                                {item.label}
                            </DropdownMenuItem>
                        )
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
