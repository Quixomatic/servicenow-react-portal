import { Fragment } from 'react'
import { Link, usePortal, useNavigation, useSidebar } from '@portal/runtime'
import { SidebarTrigger } from 'components:sidebar'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { HeaderSlotOutlet } from 'utilities:app/header-slots'
import { ModeToggle } from './parts/ModeToggle'

type Action = { label: string; to?: string; href?: string; icon?: string }
type Options = { menu?: string; sidebarTrigger?: boolean; center?: string; actions?: Action[]; tints?: boolean; brand?: string }

// Tile tints on theme tokens (same palette as the app sidebar).
const TINTS: Record<string, string> = {
    'chart-1': 'border-chart-1/30 bg-chart-1/15 text-chart-1',
    'chart-2': 'border-chart-2/30 bg-chart-2/15 text-chart-2',
    'chart-3': 'border-chart-3/30 bg-chart-3/15 text-chart-3',
    'chart-4': 'border-chart-4/30 bg-chart-4/15 text-chart-4',
    'chart-5': 'border-chart-5/30 bg-chart-5/15 text-chart-5',
}

/**
 * Dashboard top bar (ChannelGuide's TopHeader): transparent 56px bar on the page background.
 * Left: the sidebar trigger and breadcrumbs (useNavigation().activePath, then the page title);
 * centre: optional text; right: the "header-actions" header slot (utilities:app/header-slots, e.g.
 * app/cart-button), action buttons and the theme toggle. No divider next to the
 * trigger: spacing separates it.
 */
export default function AppHeader({ options = {} }: { options?: Options }) {
    const { page } = usePortal()
    const nav = useNavigation(options.menu || 'primary')
    // Labelled items only (no separators, no empty / whitespace labels), so two slashes never meet.
    const crumbs: { label: string; link?: any }[] = nav.activePath
        .filter((i: any) => i && i.type !== 'separator' && String(i.label || '').trim())
        .map((i: any) => ({ label: String(i.label).trim(), link: i.type === 'group' ? null : i.link }))
    const title = String((page ? page.title || page.name : '') || '').trim()
    // The page title closes the trail unless the active item already says it (case-insensitive).
    if (title && (!crumbs.length || crumbs[crumbs.length - 1].label.toLowerCase() !== title.toLowerCase())) crumbs.push({ label: title })
    const lead = nav.activePath.find((i: any) => i.icon)
    const actions = Array.isArray(options.actions) ? options.actions : []
    // Brand link only on pages without a sidebar (e.g. a Centered Layout page): the sidebar shows it otherwise.
    const { available } = useSidebar()

    return (
        <div className="grid h-(--rp-shell-header,3.5rem) shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3">
            <div className="flex min-w-0 items-center gap-3 justify-self-start">
                {options.sidebarTrigger !== false ? <SidebarTrigger /> : null}
                {options.brand && !available ? (
                    <Link to="" className="shrink-0 text-sm font-semibold text-foreground no-underline">
                        {options.brand}
                    </Link>
                ) : null}
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    {lead ? (
                        <span aria-hidden="true" className={'inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border ' + ((options.tints !== false && TINTS[lead.tint]) || 'border-border bg-background text-foreground/80')}>
                            <Icon name={lead.icon} className="size-3!" />
                        </span>
                    ) : null}
                    <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0">
                        {crumbs.map((c, i) => {
                            const last = i === crumbs.length - 1
                            return (
                                <Fragment key={i}>
                                    {i > 0 ? (
                                        <li aria-hidden="true" className="mx-0.5 text-muted-foreground max-sm:hidden">
                                            /
                                        </li>
                                    ) : null}
                                    <li className={'min-w-0 truncate ' + (last ? '' : 'max-sm:hidden')}>
                                        {last ? (
                                            <span aria-current="page">{c.label}</span>
                                        ) : c.link ? (
                                            <Link {...c.link} className="text-muted-foreground no-underline transition-colors hover:text-foreground">
                                                {c.label}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">{c.label}</span>
                                        )}
                                    </li>
                                </Fragment>
                            )
                        })}
                    </ol>
                </nav>
            </div>
            {/* Always rendered (keeps the 3-column grid); the text hides on narrow frames. */}
            <div className="justify-self-center text-sm text-muted-foreground invisible md:visible">{options.center || ''}</div>
            <div className="flex items-center gap-2 justify-self-end">
                {/* Header slot "header-actions": widgets portal buttons here (e.g. app/cart-button). */}
                <HeaderSlotOutlet name="header-actions" className="flex items-center gap-2 empty:hidden" />
                {actions.map((a, i) =>
                    a.href ? (
                        <Button key={i} variant="ghost" size="sm" render={<a href={a.href} target="_blank" rel="noreferrer" />}>
                            {a.icon ? <Icon name={a.icon} /> : null}
                            <span className="sr-only sm:not-sr-only">{a.label}</span>
                        </Button>
                    ) : (
                        <Button key={i} variant="ghost" size="sm" render={<Link to={a.to || ''} />} aria-label={a.label}>
                            {a.icon ? <Icon name={a.icon} /> : null}
                            <span className="sr-only sm:not-sr-only">{a.label}</span>
                        </Button>
                    )
                )}
                <ModeToggle />
            </div>
        </div>
    )
}
