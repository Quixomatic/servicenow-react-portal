// shadcn's Sidebar (Base UI flavour), adapted to React Portal:
// - the state is the portal shell's useSidebar() (@portal/runtime), so a trigger in the header
//   widget and the sidebar widget share it; there is no SidebarProvider to render;
// - the sidebar is in flow, filling the layout's sidebar slot (h-full), not position: fixed to
//   the viewport (the portal lives inside the Next Experience page);
// - mobile is the portal frame's width (useSidebar().isMobile), not a viewport media query, so
//   the designer's device frames behave like the real device; on mobile it is a Sheet in the
//   overlay layer (usePortalContainer).
import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';
import { cn } from 'cn';
import { useSidebar, useRegisterSidebar } from '#/runtime/sidebar';
import { Button } from './button';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';

/**
 * <Sidebar side? variant? collapsible? width? iconWidth?>
 *   variant      'sidebar' (bg-sidebar + border) | 'floating' (card) | 'inset' (transparent, padded:
 *                sits on the page background next to an inset main)
 *   collapsible  'offcanvas' (slides out) | 'icon' (icon rail with tooltips) | 'none'
 */
function Sidebar({
    side = 'left',
    variant = 'sidebar',
    collapsible = 'offcanvas',
    width = SIDEBAR_WIDTH,
    iconWidth = SIDEBAR_WIDTH_ICON,
    mobileWidth = SIDEBAR_WIDTH_MOBILE,
    label = 'Sidebar',
    className,
    style,
    children,
    ...props
}) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    useRegisterSidebar(collapsible !== 'none');
    const vars = { '--sidebar-width': width, '--sidebar-width-icon': iconWidth, ...style };

    if (collapsible === 'none') {
        return (
            <div
                data-slot="sidebar"
                data-variant={variant}
                className={cn(
                    'flex h-full w-(--sidebar-width) flex-col text-sidebar-foreground',
                    variant === 'sidebar' && 'bg-sidebar',
                    className
                )}
                style={vars}
                {...props}
            >
                {children}
            </div>
        );
    }

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetContent
                    data-sidebar="sidebar"
                    data-slot="sidebar"
                    data-mobile="true"
                    data-variant={variant}
                    side={side}
                    showCloseButton={false}
                    className="w-(--sidebar-width) gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
                    style={{ ...vars, '--sidebar-width': mobileWidth }}
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>{label}</SheetTitle>
                        <SheetDescription>Site navigation</SheetDescription>
                    </SheetHeader>
                    <div className="flex h-full w-full flex-col overflow-hidden">{children}</div>
                </SheetContent>
            </Sheet>
        );
    }

    const collapsed = state === 'collapsed';
    const padded = variant === 'floating' || variant === 'inset';
    return (
        <div
            className="group peer relative h-full text-sidebar-foreground"
            data-state={state}
            data-collapsible={collapsed ? collapsible : ''}
            // Boolean twin of data-collapsible="icon" for widget classes (group-data-rail:hidden):
            // value-free attribute variants need no "=" in the class name.
            data-rail={collapsed && collapsible === 'icon' ? '' : undefined}
            data-variant={variant}
            data-side={side}
            data-slot="sidebar"
            style={vars}
        >
            <div
                data-slot="sidebar-container"
                data-side={side}
                // Offcanvas-collapsed content is off screen: keep it out of the tab order too.
                inert={collapsed && collapsible === 'offcanvas' ? true : undefined}
                className={cn(
                    'flex h-full w-(--sidebar-width) overflow-hidden transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 motion-reduce:transition-none',
                    padded
                        ? cn(
                              'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem+2px)]',
                              variant === 'inset' && 'pt-0'
                          )
                        : 'bg-sidebar group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l border-sidebar-border',
                    className
                )}
                {...props}
            >
                <div
                    data-sidebar="sidebar"
                    data-slot="sidebar-inner"
                    className="flex h-full w-full shrink-0 flex-col min-w-[calc(var(--sidebar-width)-1rem)] group-data-[variant=sidebar]:min-w-[calc(var(--sidebar-width)-1px)] group-data-[collapsible=icon]:min-w-0 group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:bg-sidebar group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

/** Toggles the shell's sidebar (desktop: expanded/collapsed; mobile: the sheet). Hidden while no collapsible sidebar is mounted, unless `force`. */
function SidebarTrigger({ className, onClick, children, force = false, ...props }) {
    const { toggleSidebar, isMobile, open, openMobile, available } = useSidebar();
    // Nothing to toggle on a page without a collapsible sidebar (unless forced).
    if (!available && !force) return null;
    return (
        <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle sidebar"
            data-state={(isMobile ? openMobile : open) ? 'expanded' : 'collapsed'}
            title="Toggle sidebar (Ctrl+B)"
            className={cn(className)}
            onClick={(event) => {
                if (onClick) onClick(event);
                toggleSidebar();
            }}
            {...props}
        >
            {children || <PanelLeftIcon />}
            <span className="sr-only">Toggle sidebar</span>
        </Button>
    );
}

/** Thin hover strip on the sidebar's inner edge that toggles it (mouse only, like shadcn). */
function SidebarRail({ className, ...props }) {
    const { toggleSidebar, isMobile } = useSidebar();
    if (isMobile) return null;
    return (
        <button
            type="button"
            data-sidebar="rail"
            data-slot="sidebar-rail"
            aria-label="Toggle sidebar"
            tabIndex={-1}
            onClick={toggleSidebar}
            title="Toggle sidebar"
            className={cn(
                'absolute inset-y-0 z-20 flex w-3 cursor-w-resize transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-1.5 group-data-[side=right]:-left-1.5 group-data-[state=collapsed]:cursor-e-resize',
                className
            )}
            {...props}
        />
    );
}

/** The main column next to an inset sidebar (optional: layouts usually own this). */
function SidebarInset({ className, ...props }) {
    return (
        <main
            data-slot="sidebar-inset"
            className={cn('relative flex w-full flex-1 flex-col bg-background', className)}
            {...props}
        />
    );
}

function SidebarInput({ className, ...props }) {
    return (
        <input
            data-slot="sidebar-input"
            data-sidebar="input"
            className={cn(
                'h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-none outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                className
            )}
            {...props}
        />
    );
}

function SidebarHeader({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-header"
            data-sidebar="header"
            className={cn('flex flex-col gap-2 p-2', className)}
            {...props}
        />
    );
}

function SidebarFooter({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-footer"
            data-sidebar="footer"
            className={cn('flex flex-col gap-2 p-2', className)}
            {...props}
        />
    );
}

function SidebarSeparator({ className, ...props }) {
    return (
        <Separator
            data-slot="sidebar-separator"
            data-sidebar="separator"
            className={cn('mx-2 w-auto bg-sidebar-border', className)}
            {...props}
        />
    );
}

function SidebarContent({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-content"
            data-sidebar="content"
            className={cn(
                'flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
                className
            )}
            {...props}
        />
    );
}

function SidebarGroup({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-group"
            data-sidebar="group"
            className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
            {...props}
        />
    );
}

function SidebarGroupLabel({ className, render, ...props }) {
    return useRender({
        defaultTagName: 'div',
        props: mergeProps(
            {
                'data-slot': 'sidebar-group-label',
                'data-sidebar': 'group-label',
                className: cn(
                    'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                    className
                ),
            },
            props
        ),
        render,
    });
}

function SidebarGroupAction({ className, render, ...props }) {
    return useRender({
        defaultTagName: 'button',
        props: mergeProps(
            {
                'data-slot': 'sidebar-group-action',
                'data-sidebar': 'group-action',
                className: cn(
                    'absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                    className
                ),
            },
            props
        ),
        render,
    });
}

function SidebarGroupContent({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-group-content"
            data-sidebar="group-content"
            className={cn('w-full text-sm', className)}
            {...props}
        />
    );
}

function SidebarMenu({ className, ...props }) {
    return (
        <ul
            data-slot="sidebar-menu"
            data-sidebar="menu"
            className={cn('m-0 flex w-full min-w-0 list-none flex-col gap-0.5 p-0', className)}
            {...props}
        />
    );
}

function SidebarMenuItem({ className, ...props }) {
    return (
        <li
            data-slot="sidebar-menu-item"
            data-sidebar="menu-item"
            className={cn('group/menu-item relative', className)}
            {...props}
        />
    );
}

const sidebarMenuButtonVariants = cva(
    'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground no-underline ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
    {
        variants: {
            variant: {
                default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                outline:
                    'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
            },
            size: {
                default: 'h-8 text-sm',
                sm: 'h-7 text-xs',
                lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    }
);

/**
 * <SidebarMenuButton isActive? tooltip? render={<Link to=… />}>: the tooltip shows only while the
 * sidebar is icon-collapsed (desktop). Active items get data-active and aria-current="page".
 */
function SidebarMenuButton({
    render,
    isActive = false,
    variant = 'default',
    size = 'default',
    tooltip,
    className,
    ...props
}) {
    const { isMobile, state } = useSidebar();
    // Tooltips only matter on the icon rail; elsewhere the label is visible.
    const showTip = !!tooltip && state === 'collapsed' && !isMobile;
    const comp = useRender({
        defaultTagName: 'button',
        props: mergeProps(
            {
                'data-slot': 'sidebar-menu-button',
                'data-sidebar': 'menu-button',
                'data-size': size,
                'data-active': isActive ? '' : undefined,
                'aria-current': isActive ? 'page' : undefined,
                className: cn(sidebarMenuButtonVariants({ variant, size }), className),
            },
            props
        ),
        render: showTip ? <TooltipTrigger render={render} /> : render,
    });
    if (!showTip) return comp;
    const content = typeof tooltip === 'string' ? { children: tooltip } : tooltip;
    return (
        <Tooltip>
            {comp}
            <TooltipContent side="right" align="center" {...content} />
        </Tooltip>
    );
}

function SidebarMenuAction({ className, render, showOnHover = false, ...props }) {
    return useRender({
        defaultTagName: 'button',
        props: mergeProps(
            {
                'data-slot': 'sidebar-menu-action',
                'data-sidebar': 'menu-action',
                className: cn(
                    'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                    showOnHover &&
                        'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 aria-expanded:opacity-100 opacity-0',
                    className
                ),
            },
            props
        ),
        render,
    });
}

function SidebarMenuBadge({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-menu-badge"
            data-sidebar="menu-badge"
            className={cn(
                'pointer-events-none absolute top-1.5 right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        />
    );
}

function SidebarMenuSkeleton({ className, showIcon = false, ...props }) {
    const [width] = React.useState(() => `${Math.floor(Math.random() * 40) + 50}%`);
    return (
        <div
            data-slot="sidebar-menu-skeleton"
            data-sidebar="menu-skeleton"
            className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
            {...props}
        >
            {showIcon ? <div className="size-4 animate-pulse rounded-md bg-sidebar-accent" /> : null}
            <div
                className="h-4 max-w-(--skeleton-width) flex-1 animate-pulse rounded bg-sidebar-accent"
                style={{ '--skeleton-width': width }}
            />
        </div>
    );
}

function SidebarMenuSub({ className, ...props }) {
    return (
        <ul
            data-slot="sidebar-menu-sub"
            data-sidebar="menu-sub"
            className={cn(
                'mx-3.5 my-0 flex min-w-0 list-none translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        />
    );
}

function SidebarMenuSubItem({ className, ...props }) {
    return (
        <li
            data-slot="sidebar-menu-sub-item"
            data-sidebar="menu-sub-item"
            className={cn('group/menu-sub-item relative', className)}
            {...props}
        />
    );
}

function SidebarMenuSubButton({ render, size = 'md', isActive = false, className, ...props }) {
    return useRender({
        defaultTagName: 'a',
        props: mergeProps(
            {
                'data-slot': 'sidebar-menu-sub-button',
                'data-sidebar': 'menu-sub-button',
                'data-size': size,
                'data-active': isActive ? '' : undefined,
                'aria-current': isActive ? 'page' : undefined,
                className: cn(
                    'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground no-underline ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[size=md]:text-sm data-[size=sm]:text-xs data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
                    className
                ),
            },
            props
        ),
        render,
    });
}

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    sidebarMenuButtonVariants,
    useSidebar,
};
