import { usePortal, useNavigation, useLayout } from '@portal/runtime'
import { Badge } from 'components:badge'
import { Icon } from 'components:icon'
import { HeaderSlotOutlet } from 'utilities:app/header-slots'

type Options = { menu?: string; showTitle?: boolean; note?: string }

/**
 * The inset card's 40px sub-header bar (ChannelGuide's SubHeader): page title on the left, the
 * active menu item's badge and an optional note on the right. Owns its height and bottom border.
 *
 * Slots (utilities:app/header-slots): page widgets portal into "left", "center" and "right" with
 * <HeaderSlot name="right">…</HeaderSlot>. A filled left slot replaces the page title; a filled
 * right slot replaces the badge and note. On a narrow frame the bar wraps: left on one row, the
 * right slot (toolbars, actions) on the next. (The max-sm: variants need no "!": the compiler puts
 * variants in the rp-variants layer, after every sheet's base utilities.)
 *
 * Variant (layout option `subheader`, read with useLayout().options): "bar" (above), "banner" (a
 * taller tinted band: large title + subtitle + optional icon; the same slots, a filled left slot
 * still replaces the title) or "hidden" (renders nothing; app-shell drops the region). Banner text:
 * layout options subheaderTitle (default: the page's title) and subheaderSubtitle (default: the
 * page's description, if it has one); subheaderIcon (Lucide name) and subheaderTint (primary,
 * chart-1…5, none: theme tokens). The banner also has a "below" slot: a full-width row under the
 * title (app/hero-search puts the portal search there).
 */
export default function AppSubheader({ options = {} }: { options?: Options }) {
    const { page } = usePortal()
    const layout = useLayout() as any
    const nav = useNavigation(options.menu || 'primary')
    const active = nav.active as any
    // Variant and banner text come from the layout options (app/app-shell: portal default
    // settings.layoutOptions, overridden per page by layout_options_json).
    const lo = (layout && layout.options) || {}
    const variant = lo.subheader === 'banner' || lo.subheader === 'hidden' ? lo.subheader : 'bar'
    const title = (page && (page.title || page.name)) || ''
    // hidden: render nothing, so no slot outlets exist and HeaderSlot contributions fall back inline.
    if (variant === 'hidden') return null
    const banner = variant === 'banner'
    const showTitle = options.showTitle !== false
    const bannerTitle = String(lo.subheaderTitle || '') || title
    const subtitle = String(lo.subheaderSubtitle || '') || String((page && page.description) || '')
    const icon = String(lo.subheaderIcon || '')
    const tint = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'none'].includes(lo.subheaderTint) ? lo.subheaderTint : 'primary'
    // One element tree for both variants (switching never remounts the outlets or what widgets
    // portal into them). Bar: the inner box is display:contents, so the outer is today's grid.
    // Banner: the outer is the tinted band; the inner grid is capped at the page's content width
    // and padded like main, so the title lines up with the content below.
    return (
        <div
            className={
                banner
                    ? 'rp-subheader shrink-0 border-b py-7 max-sm:py-5'
                    : 'rp-subheader grid h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b px-3 max-sm:flex max-sm:h-auto max-sm:min-h-10 max-sm:flex-wrap max-sm:py-1.5'
            }
            data-variant={variant}
            data-tint={banner ? tint : undefined}
        >
            <div
                className={banner ? 'rp-sub-inner mx-auto box-border grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 max-sm:flex max-sm:flex-wrap max-sm:gap-3' : 'contents'}
            >
                <div className={banner ? 'col-start-1 flex min-w-0 items-center gap-3 justify-self-stretch max-sm:w-full' : 'col-start-1 flex min-w-0 items-center gap-2 justify-self-start max-sm:w-full'}>
                    <HeaderSlotOutlet name="left" className="flex min-w-0 items-center gap-2 empty:hidden" />
                    {showTitle && banner ? (
                        <div className="rp-sub-default flex min-w-0 items-center gap-4">
                            {icon ? (
                                <span className="rp-sub-icon flex size-12 shrink-0 items-center justify-center rounded-xl max-sm:size-10">
                                    <Icon name={icon} className="size-6 max-sm:size-5" />
                                </span>
                            ) : null}
                            <div className="min-w-0">
                                <h1 className="m-0 text-2xl leading-tight font-semibold tracking-tight text-balance max-sm:text-xl">{bannerTitle}</h1>
                                {subtitle ? <p className="m-0 mt-1 text-sm text-pretty text-muted-foreground">{subtitle}</p> : null}
                            </div>
                        </div>
                    ) : null}
                    {showTitle && !banner ? <h1 className="rp-sub-default m-0 truncate text-sm font-medium">{title}</h1> : null}
                </div>
                <HeaderSlotOutlet name="center" className="col-start-2 flex min-w-0 items-center gap-2 justify-self-center max-sm:empty:hidden" />
                <div className="rp-sub-right col-start-3 flex min-w-0 items-center justify-end gap-2 justify-self-end text-xs text-muted-foreground max-sm:w-full">
                    <HeaderSlotOutlet name="right" className="ml-auto flex min-w-0 items-center justify-end gap-1.5 text-sm text-foreground empty:hidden" />
                    <span className="rp-sub-default flex items-center gap-2">
                        {active && active.badge ? <Badge variant="secondary">{active.badge}</Badge> : null}
                        {options.note ? <span className="max-sm:hidden">{options.note}</span> : null}
                    </span>
                </div>
                {/* Banner only: a full-width row under the title (e.g. app/hero-search). Bar pages have no
                    "below" outlet, so contributions fall back inline. */}
                {banner ? <HeaderSlotOutlet name="below" className="col-span-full flex min-w-0 empty:hidden max-sm:w-full" /> : null}
            </div>
        </div>
    )
}
