import { Link, useNavigation, useSidebar } from '@portal/runtime';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
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
} from 'components:sidebar';
import { Icon } from 'components:icon';

type Options = { title?: string; menu?: string; collapsible?: 'offcanvas' | 'icon' | 'none'; width?: string };

// The active item is the brand colour, like the original nav-sidebar.
const ACTIVE =
    'data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground';

/**
 * Portal-level sidebar. Owns its look: width, right border, background, padding, scrolling and
 * active styling. Collapses with the shell (useSidebar): to an icon rail or off canvas; an
 * overlay sheet on mobile. Menu items come from useNavigation().
 */
export default function NavSidebar({ options = {} }: { options?: Options }) {
    const nav = useNavigation(options.menu || 'primary');
    const loose = nav.items.filter((i: any) => i.type !== 'group');
    const groups = nav.items.filter((i: any) => i.type === 'group');
    return (
        <Sidebar
            collapsible={options.collapsible || 'offcanvas'}
            width={options.width || '220px'}
            label={options.title || 'Pages'}
        >
            <SidebarHeader className="px-3 pt-4 pb-0 group-data-rail:px-2">
                <div className="truncate px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase group-data-rail:hidden">
                    {options.title || 'Pages'}
                </div>
            </SidebarHeader>
            <SidebarContent>
                {loose.length ? (
                    <SidebarGroup className="px-3 group-data-rail:px-2">
                        <SidebarMenu>
                            {loose.map((item: any) => (
                                <NavItem key={item.id} item={item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ) : null}
                {groups.map((group: any) => (
                    <SidebarGroup key={group.id} className="px-3 group-data-rail:px-2">
                        <SidebarGroupLabel {...group.attrs}>{group.label}</SidebarGroupLabel>
                        <SidebarMenu>
                            {group.children.map((item: any) => (
                                <NavItem key={item.id} item={item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}

/** Icon from the menu data (any lucide name), else the label's first letter in a small tile (so the icon rail still works). */
function ItemIcon({ item }: { item: any }) {
    const letter = (
        <span
            aria-hidden="true"
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-muted text-[10px] font-semibold text-muted-foreground uppercase"
        >
            {(item.label || '?').slice(0, 1)}
        </span>
    );
    return item.icon ? <Icon name={item.icon} fallback={letter} /> : letter;
}

function NavItem({ item }: { item: any }) {
    const { setOpenMobile } = useSidebar();
    const close = () => setOpenMobile(false);
    if (item.type === 'separator') return <SidebarSeparator className="my-1" />;
    if (item.type === 'group') {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={item.label} {...item.attrs}>
                    <ItemIcon item={item} />
                    <span>{item.label}</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                    {item.children.map((child: any) => (
                        <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                                isActive={child.active}
                                className={ACTIVE}
                                render={
                                    child.type === 'url' ? (
                                        <a {...child.attrs} href={child.href} target={child.target} rel="noreferrer" />
                                    ) : (
                                        <Link {...child.link} onClick={close} />
                                    )
                                }
                            >
                                <span>{child.label}</span>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            </SidebarMenuItem>
        );
    }
    const render =
        item.type === 'url' ? (
            <a {...item.attrs} href={item.href} target={item.target} rel="noreferrer" />
        ) : (
            <Link {...item.link} onClick={close} />
        );
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                isActive={item.active}
                tooltip={item.tooltip || item.label}
                className={ACTIVE}
                render={render}
            >
                <ItemIcon item={item} />
                <span>{item.label}</span>
            </SidebarMenuButton>
            {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
        </SidebarMenuItem>
    );
}
