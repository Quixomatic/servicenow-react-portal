import { useUser, useTheme, useSidebar, useNavigation, Link } from '@portal/runtime';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from 'components:sidebar';
import { Icon } from 'components:icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from 'components:dropdown-menu';

function initials(value: string) {
    const parts = String(value || '')
        .trim()
        .split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(value || '?')
        .slice(0, 2)
        .toUpperCase();
}

const MODES = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'monitor' },
];

/** Items of the portal's `account` menu (records only), above Theme / Sign out. */
function AccountItems({ menu }: { menu: string }) {
    const nav = useNavigation(menu);
    if (nav.source !== 'menu' || !nav.items.length) return null;
    const render = (item: any) => {
        if (item.type === 'separator') return <DropdownMenuSeparator key={item.id} />;
        if (item.type === 'group') {
            return (
                <DropdownMenuGroup key={item.id}>
                    <DropdownMenuLabel {...item.attrs} className="text-xs text-muted-foreground">
                        {item.label}
                    </DropdownMenuLabel>
                    {item.children.map(render)}
                </DropdownMenuGroup>
            );
        }
        const el =
            item.type === 'url' ? (
                <a {...item.attrs} href={item.href} target={item.target} rel="noreferrer" />
            ) : (
                <Link {...item.link} />
            );
        return (
            <DropdownMenuItem key={item.id} render={el} title={item.tooltip}>
                <Icon name={item.icon || 'circle'} className="mr-2 size-4" />
                <span>{item.label}</span>
                {item.badge ? <span className="ml-auto text-xs text-muted-foreground">{item.badge}</span> : null}
            </DropdownMenuItem>
        );
    };
    return (
        <>
            <DropdownMenuGroup>{nav.items.map(render)}</DropdownMenuGroup>
            <DropdownMenuSeparator />
        </>
    );
}

/** ChannelGuide's user menu: avatar + name; the account menu, theme submenu and sign out. */
export function UserMenu({ side = 'top', menu = 'account' }: { side?: 'top' | 'bottom'; menu?: string }) {
    const user = useUser() as any;
    const { theme, setTheme } = useTheme();
    const { state, isMobile } = useSidebar();
    const collapsed = state === 'collapsed' && !isMobile;
    const name = (user && (user.name || user.userName)) || 'Account';
    const email = (user && user.email) || '';
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                tooltip={name}
                                aria-label={'Account menu for ' + name}
                                className="h-10 aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground group-data-rail:justify-center group-data-rail:p-0!"
                            />
                        }
                    >
                        <span className="flex aspect-square size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-chart-2/30 bg-chart-2/15 text-chart-2">
                            {user && user.avatar ? (
                                <img src={user.avatar} alt="" className="size-7 object-cover" />
                            ) : (
                                <span className="text-xs font-semibold">{initials(name)}</span>
                            )}
                        </span>
                        {!collapsed ? (
                            <>
                                <span className="grid flex-1 text-start leading-tight">
                                    <span className="truncate text-sm font-semibold">{name}</span>
                                    {email ? (
                                        <span className="truncate text-xs text-sidebar-foreground/60">{email}</span>
                                    ) : null}
                                </span>
                                <Icon name="chevrons-up-down" className="ms-auto" />
                            </>
                        ) : null}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-64"
                        align="start"
                        side={isMobile ? 'bottom' : collapsed ? 'right' : side}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col gap-1">
                                    <p className="m-0 text-sm font-medium">{name}</p>
                                    {email ? <p className="m-0 text-xs text-muted-foreground">{email}</p> : null}
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <AccountItems menu={menu} />
                        <DropdownMenuGroup>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Icon name="monitor" className="mr-2 size-4" />
                                    <span>Theme</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {MODES.map((m) => (
                                        <DropdownMenuItem key={m.value} onClick={() => setTheme(m.value)}>
                                            <Icon name={m.icon} className="mr-2 size-4" />
                                            <span>{m.label}</span>
                                            {theme === m.value ? (
                                                <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                                            ) : null}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem render={<a href="/logout.do" />}>
                                <Icon name="log-out" className="mr-2 size-4" />
                                <span>Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
