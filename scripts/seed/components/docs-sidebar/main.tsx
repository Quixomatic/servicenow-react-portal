/**
 * app/docs-sidebar — the docs navigation (fumadocs DocsLayout sidebar): title, search, an optional
 * section switcher, the page tree from utilities:app/docs (sections as separators, pages with icons,
 * the current page highlighted), and a footer with icon links and the light / dark switch.
 *
 * Desktop: fills the layout's sticky sidebar column; the collapse button hides it (useSidebar().open,
 * persisted per portal) and leaves a small floating panel (expand + search). Mobile (frame < 768px):
 * a drawer from the right in the overlay layer, opened by app/docs-header (useSidebar().openMobile).
 * It also mounts the page's single search dialog (components:app/docs-search).
 */
import { useEffect, useRef } from 'react';
import { Link, usePortal, usePortalLocation, useSidebar, useTheme } from '@portal/runtime';
import { Icon } from 'components:icon';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from 'components:sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from 'components:dropdown-menu';
import { Skeleton } from 'components:skeleton';
import { cn } from 'utilities:cn';
import { useDocsNav, docPathOf, docRoute, usePrefetchDoc } from 'utilities:app/docs';
import type { DocsSection } from 'utilities:app/docs';
import DocsSearchDialog, { DocsSearchTrigger, DocsSearchButton } from 'components:app/docs-search';

type SwitchItem = {
    title: string;
    description?: string;
    icon?: string;
    tint?: string;
    portal?: string;
    to?: string;
    url?: string;
};
type FooterLink = { label?: string; icon?: string; url?: string };
type Options = {
    title?: string;
    icon?: string;
    search?: boolean;
    collapsible?: boolean;
    switcher?: SwitchItem[];
    links?: FooterLink[];
    tintSections?: string[];
};

// Switcher tiles use the theme's chart tints (chart-1…5), like sp's icon tiles.
const TINTS: Record<string, string> = {
    'chart-1': 'bg-chart-1/15 text-chart-1',
    'chart-2': 'bg-chart-2/15 text-chart-2',
    'chart-3': 'bg-chart-3/15 text-chart-3',
    'chart-4': 'bg-chart-4/15 text-chart-4',
    'chart-5': 'bg-chart-5/15 text-chart-5',
};
const GHOST_ICON =
    'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4';

export default function DocsSidebar({ options = {} }: { options?: Options }) {
    const sidebar = useSidebar();
    const collapsed = !sidebar.isMobile && options.collapsible !== false && !sidebar.open;
    return (
        <>
            {options.search !== false ? <DocsSearchDialog /> : null}
            {sidebar.isMobile ? (
                <Sheet open={sidebar.openMobile} onOpenChange={(v: boolean) => sidebar.setOpenMobile(v)}>
                    <SheetContent
                        side="right"
                        showCloseButton={false}
                        className="w-[85%] max-w-[380px] gap-0 border-s bg-background p-0 text-[0.9375rem] sm:max-w-[380px]"
                    >
                        <SheetTitle className="sr-only">Documentation menu</SheetTitle>
                        <SheetDescription className="sr-only">Pages of the documentation</SheetDescription>
                        <Drawer options={options} onClose={() => sidebar.setOpenMobile(false)} />
                    </SheetContent>
                </Sheet>
            ) : collapsed ? (
                <div data-docs-sidebar-collapsed="" className="relative h-full w-0">
                    <div className="absolute start-4 top-4 z-10 flex rounded-xl border bg-muted p-0.5 text-muted-foreground shadow-lg">
                        <button
                            type="button"
                            aria-label="Expand sidebar"
                            title="Expand sidebar"
                            onClick={() => sidebar.setOpen(true)}
                            className={cn(GHOST_ICON, 'rounded-lg')}
                        >
                            <Icon name="panel-left" />
                        </button>
                        {options.search !== false ? (
                            <DocsSearchButton className="size-8 rounded-lg text-muted-foreground [&_svg]:size-4" />
                        ) : null}
                    </div>
                </div>
            ) : (
                // Inside the sidebar, hovers use the theme's sidebar-accent.
                <aside
                    id="nd-sidebar"
                    className="flex h-full w-full justify-end border-e border-sidebar-border bg-sidebar text-sm text-foreground [--accent:var(--sidebar-accent)]"
                >
                    <div className="flex h-full w-[var(--docs-sidebar-width,268px)] min-w-0 flex-col">
                        <div className="flex flex-col gap-3 p-4 pb-2">
                            <div className="flex items-center">
                                <Brand options={options} className="me-auto text-[0.9375rem]" />
                                {options.collapsible !== false ? (
                                    <button
                                        type="button"
                                        aria-label="Collapse sidebar"
                                        title="Collapse sidebar"
                                        onClick={() => sidebar.setOpen(false)}
                                        className={cn(GHOST_ICON, 'mb-auto')}
                                    >
                                        <Icon name="panel-left" />
                                    </button>
                                ) : null}
                            </div>
                            {options.search !== false ? <DocsSearchTrigger /> : null}
                            <Switcher items={options.switcher} />
                        </div>
                        <NavTree tintSections={options.tintSections} />
                        <div className="flex flex-col p-4 pt-2">
                            <div className="flex items-center rounded-lg border bg-secondary/50 p-0.5 pe-0 text-muted-foreground">
                                <FooterLinks links={options.links} />
                                <ThemeSwitch className="ms-auto rounded-none border-y-0 border-e-0 px-1 py-0 *:rounded-md" />
                            </div>
                        </div>
                    </div>
                </aside>
            )}
        </>
    );
}

function Brand({ options, className }: { options: Options; className?: string }) {
    const portal = usePortal();
    return (
        <Link
            to=""
            className={cn(
                'inline-flex min-w-0 items-center gap-2.5 font-semibold text-foreground no-underline',
                className
            )}
        >
            {options.icon ? (
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon name={options.icon} className="size-3.5" />
                </span>
            ) : null}
            <span className="truncate">{options.title || (portal && portal.portal.name) || 'Docs'}</span>
        </Link>
    );
}

function FooterLinks({ links, className }: { links?: FooterLink[]; className?: string }) {
    return (
        <>
            {(links || [])
                .filter((l) => l && l.url && /^https?:\/\//i.test(l.url))
                .map((l, i) => (
                    <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={l.label}
                        title={l.label}
                        className={cn(GHOST_ICON, className)}
                    >
                        <Icon name={l.icon || 'external-link'} />
                    </a>
                ))}
        </>
    );
}

/** fumadocs ThemeSwitch (light-dark mode): one button, sun / moon, the resolved mode highlighted. */
function ThemeSwitch({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    return (
        <button
            type="button"
            aria-label="Toggle theme"
            data-theme-toggle=""
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={cn('inline-flex items-center overflow-hidden rounded-full border p-1 *:rounded-full', className)}
        >
            {(['light', 'dark'] as const).map((m) => (
                <Icon
                    key={m}
                    name={m === 'light' ? 'sun' : 'moon'}
                    fill="currentColor"
                    className={cn(
                        'size-6.5 p-1.5',
                        resolvedTheme === m ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                    )}
                />
            ))}
        </button>
    );
}

function SwitchIcon({ item, className }: { item: SwitchItem; className?: string }) {
    if (!item.icon) return null;
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md',
                TINTS[item.tint || ''] || 'bg-primary/10 text-primary',
                className
            )}
        >
            <Icon name={item.icon} className="size-3.5" />
        </span>
    );
}

/** The root switcher (fumadocs sidebar tabs dropdown). The current portal's entry is selected. */
function Switcher({ items }: { items?: SwitchItem[] }) {
    const portal = usePortal();
    const list = (items || []).filter((i) => i && i.title);
    if (!list.length) return null;
    const slug = portal ? portal.portal.slug : '';
    const current = list.find((i) => !i.url && (!i.portal || i.portal === slug) && !i.to) || list[0];
    const target = (item: SwitchItem) =>
        item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer noopener" />
        ) : (
            <Link to={item.to || ''} portalSlug={item.portal && item.portal !== slug ? item.portal : undefined} />
        );
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg border bg-secondary/50 p-2 text-start text-secondary-foreground transition-colors hover:bg-accent data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground">
                <SwitchIcon item={current} className="size-5" />
                <span className="text-sm font-medium">{current.title}</span>
                <Icon name="chevrons-up-down" className="ms-auto size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--anchor-width)] min-w-56 p-1">
                {list.map((item, i) => (
                    <DropdownMenuItem
                        key={i}
                        render={target(item)}
                        className="flex items-center gap-2 rounded-lg p-1.5"
                    >
                        <SwitchIcon item={item} className="mb-auto size-5" />
                        <span className="flex min-w-0 flex-col">
                            <span className="text-sm leading-none font-medium">{item.title}</span>
                            {item.description ? (
                                <span className="mt-1 text-[0.8125rem] text-muted-foreground">{item.description}</span>
                            ) : null}
                        </span>
                        <Icon
                            name="check"
                            className={cn('ms-auto size-3.5 shrink-0 text-primary', item !== current && 'invisible')}
                        />
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Page icons as sp's tinted icon tiles (app-sidebar TintTile): chart-1…5 by position within a section.
const TILE_TINTS = [
    'border-chart-1/30 bg-chart-1/15 text-chart-1',
    'border-chart-2/30 bg-chart-2/15 text-chart-2',
    'border-chart-3/30 bg-chart-3/15 text-chart-3',
    'border-chart-4/30 bg-chart-4/15 text-chart-4',
    'border-chart-5/30 bg-chart-5/15 text-chart-5',
];
const TILE_NEUTRAL = 'border-border bg-muted text-muted-foreground';
const ITEM =
    'relative flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 text-start text-muted-foreground no-underline [overflow-wrap:anywhere]';

/** The page tree: sections as separators, pages as links. Scrolls the active page into view. */
function NavTree({
    onNavigate,
    className,
    tintSections,
}: {
    onNavigate?: () => void;
    className?: string;
    tintSections?: string[];
}) {
    const tinted = new Set(tintSections || []);
    const nav = useDocsNav();
    const loc = usePortalLocation();
    const current = docPathOf(loc ? loc.page : '');
    const prefetch = usePrefetchDoc();
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = ref.current && (ref.current.querySelector('[data-active="true"]') as HTMLElement | null);
        if (el && ref.current) {
            const box = ref.current.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            if (r.top < box.top || r.bottom > box.bottom) ref.current.scrollTop += r.top - box.top - box.height / 3;
        }
    }, [current, nav.pages.length]);
    return (
        <div
            ref={ref}
            className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [mask-image:linear-gradient(to_bottom,transparent,white_12px,white_calc(100%-12px),transparent)]',
                className
            )}
        >
            <nav aria-label="Documentation" className="flex flex-col gap-0.5">
                {nav.isLoading ? (
                    <div className="flex flex-col gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <Skeleton key={i} className={cn('h-7', i % 4 === 0 ? 'mt-4 w-24' : 'w-full')} />
                        ))}
                    </div>
                ) : nav.error ? (
                    <p className="p-2 text-sm text-destructive">Couldn't load the docs: {nav.error.message}</p>
                ) : (
                    nav.sections.map((s: DocsSection, si: number) => (
                        <div key={s.slug} className="flex flex-col gap-0.5" role="group" aria-label={s.title}>
                            {s.title ? (
                                <p
                                    className={cn(
                                        'mb-1 inline-flex items-center gap-2 px-2 text-sm font-medium text-foreground',
                                        si === 0 ? 'mt-0' : 'mt-6'
                                    )}
                                >
                                    {s.title}
                                </p>
                            ) : null}
                            {s.pages.map((p) => {
                                const active = p.path === current;
                                return (
                                    <Link
                                        key={p.path}
                                        to={docRoute(p.path)}
                                        data-active={active ? 'true' : undefined}
                                        aria-current={active ? 'page' : undefined}
                                        onMouseEnter={() => prefetch(p.path)}
                                        onFocus={() => prefetch(p.path)}
                                        onClick={() => onNavigate && onNavigate()}
                                        className={cn(
                                            ITEM,
                                            'transition-colors hover:bg-accent/50 hover:text-accent-foreground/80 hover:transition-none',
                                            active &&
                                                'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                                        )}
                                    >
                                        {p.icon ? (
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    'inline-flex size-6 shrink-0 items-center justify-center rounded-md border [&_svg]:size-3.5',
                                                    tinted.has(s.slug)
                                                        ? TILE_TINTS[s.pages.indexOf(p) % TILE_TINTS.length]
                                                        : TILE_NEUTRAL
                                                )}
                                            >
                                                <Icon name={p.icon} />
                                            </span>
                                        ) : null}
                                        <span className="min-w-0 flex-1">{p.title}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))
                )}
            </nav>
        </div>
    );
}

/** Mobile drawer contents (fumadocs SidebarDrawer). */
function Drawer({ options, onClose }: { options: Options; onClose: () => void }) {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-col gap-3 p-4 pb-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="flex flex-1">
                        <FooterLinks links={options.links} className="p-2" />
                    </div>
                    <ThemeSwitch className="p-0" />
                    <button type="button" aria-label="Close menu" onClick={onClose} className={cn(GHOST_ICON, 'p-2')}>
                        <Icon name="panel-left" />
                    </button>
                </div>
                <Switcher items={options.switcher} />
            </div>
            <NavTree onNavigate={onClose} tintSections={options.tintSections} className="text-[0.9375rem]" />
        </div>
    );
}
