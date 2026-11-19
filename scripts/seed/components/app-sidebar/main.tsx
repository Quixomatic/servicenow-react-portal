import { useState } from 'react'
import { Link, usePortal, useNavigation, useSidebar } from '@portal/runtime'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarSeparator,
} from 'components:sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'components:collapsible'
import { Icon } from 'components:icon'
import { TintTile } from './parts/TintTile'
import { UserMenu } from './parts/UserMenu'

type Options = {
    menu?: string
    collapsible?: 'icon' | 'offcanvas' | 'none'
    variant?: 'inset' | 'sidebar' | 'floating'
    userMenu?: 'footer' | 'header' | 'none'
    brand?: string
}

/**
 * Dashboard sidebar (ChannelGuide's AppSidebar: shadcn variant="inset", collapsible="icon").
 * Groups are collapsible sections; items get tinted icon tiles; the user menu sits in the
 * header or footer. Owns its width, padding, scrolling and active styling.
 */
export default function AppSidebar({ options = {} }: { options?: Options }) {
    const { portal, release } = usePortal()
    const nav = useNavigation(options.menu || 'primary')
    const userMenu = options.userMenu || 'footer'
    const brand = options.brand || portal?.name || 'Portal'
    const loose = nav.items.filter((i: any) => i.type !== 'group')
    const groups = nav.items.filter((i: any) => i.type === 'group')

    return (
        <Sidebar collapsible={options.collapsible || 'icon'} variant={options.variant || 'inset'} label={brand + ' navigation'}>
            <SidebarHeader className="h-(--rp-shell-header,3.5rem) shrink-0 flex-row items-center px-2 py-0">
                {userMenu === 'header' ? (
                    <UserMenu side="bottom" />
                ) : (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" tooltip={brand} className="h-10 group-data-rail:justify-center group-data-rail:p-0!" render={<Link to="" />}>
                                <span className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Icon name="layers" className="size-4!" />
                                </span>
                                <span className="truncate text-sm font-semibold group-data-rail:hidden">{brand}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarHeader>
            <SidebarContent>
                {loose.length ? (
                    <SidebarGroup className="pt-0">
                        <SidebarMenu>
                            {loose.map((item: any) => (
                                <NavEntry key={item.id} item={item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ) : null}
                {groups.map((group: any, i: number) => (
                    <NavGroup key={group.id} group={group} first={!loose.length && i === 0} />
                ))}
            </SidebarContent>
            <SidebarFooter>
                {userMenu === 'footer' ? <UserMenu side="top" /> : null}
                <div className="flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-medium text-sidebar-foreground/60 group-data-rail:hidden">
                    <Icon name="layers" className="size-3.5" />
                    <span className="truncate">
                        {brand}
                        {release ? ' · rev ' + release.version : ''}
                    </span>
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

/** A collapsible section: title button (hidden on the icon rail) over its items. */
function NavGroup({ group, first }: { group: any; first?: boolean }) {
    const [open, setOpen] = useState(group.open !== false)
    const shown = open || group.active
    return (
        <SidebarGroup className={'group/nav-section' + (first ? ' pt-0' : '')}>
            <Collapsible open={shown} onOpenChange={setOpen}>
                <CollapsibleTrigger
                    render={
                        <button
                            type="button"
                            {...group.attrs}
                            className="group/section-title flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md border-0 bg-transparent px-2 text-xs font-medium text-sidebar-foreground/60 ring-sidebar-ring outline-hidden transition-colors group-data-rail:hidden hover:bg-sidebar-accent hover:text-sidebar-foreground/80 focus-visible:ring-2"
                            aria-label={'Toggle ' + group.label}
                        />
                    }
                >
                    <span>{group.label}</span>
                    <Icon
                        name="chevron-right"
                        className={'size-3 opacity-0 transition-all duration-200 group-hover/section-title:opacity-100 group-focus-visible/section-title:opacity-100 ' + (shown ? 'rotate-90' : '')}
                    />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenu>
                        {group.children.map((item: any) => (
                            <NavEntry key={item.id} item={item} />
                        ))}
                    </SidebarMenu>
                </CollapsibleContent>
            </Collapsible>
        </SidebarGroup>
    )
}

function NavEntry({ item }: { item: any }) {
    const { setOpenMobile } = useSidebar()
    const close = () => setOpenMobile(false)
    if (item.type === 'separator') return <SidebarSeparator className="my-1" />
    const render = item.type === 'url' ? <a {...item.attrs} href={item.href} target={item.target} rel="noreferrer" /> : <Link {...item.link} onClick={close} />
    return (
        <SidebarMenuItem>
            <SidebarMenuButton isActive={item.active} tooltip={item.tooltip || item.label} className="group-data-rail:p-1.5!" render={render}>
                <TintTile icon={item.icon} tint={item.tint} label={item.label} />
                <span>{item.label}</span>
            </SidebarMenuButton>
            {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
            {item.type === 'group' && item.children.length ? (
                <SidebarMenuSub>
                    {item.children.map((child: any) => (
                        <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                                isActive={child.active}
                                render={child.type === 'url' ? <a {...child.attrs} href={child.href} target={child.target} rel="noreferrer" /> : <Link {...child.link} onClick={close} />}
                            >
                                <span>{child.label}</span>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            ) : null}
        </SidebarMenuItem>
    )
}
