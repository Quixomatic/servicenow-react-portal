import { usePortal, useNavigation } from '@portal/runtime'
import { Badge } from 'components:badge'
import { HeaderSlotOutlet } from 'utilities:app/header-slots'

type Options = { menu?: string; showTitle?: boolean; note?: string }

/**
 * The inset card's 40px sub-header bar (ChannelGuide's SubHeader): page title on the left, the
 * active menu item's badge and an optional note on the right. Owns its height and bottom border.
 *
 * Slots (utilities:app/header-slots): page widgets portal into "left", "center" and "right" with
 * <HeaderSlot name="right">…</HeaderSlot>. A filled left slot replaces the page title; a filled
 * right slot replaces the badge and note. On a narrow frame the bar wraps: left on one row, the
 * right slot (toolbars, actions) on the next. The max-sm: utilities are important (!): a later
 * widget stylesheet re-declares base utilities such as .grid / .h-10 in the same cascade layer and
 * would otherwise beat these variants.
 */
export default function AppSubheader({ options = {} }: { options?: Options }) {
    const { page } = usePortal()
    const nav = useNavigation(options.menu || 'primary')
    const active = nav.active as any
    const title = (page && (page.title || page.name)) || ''
    return (
        <div className="rp-subheader grid h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b px-3 max-sm:flex! max-sm:h-auto! max-sm:min-h-10! max-sm:flex-wrap! max-sm:py-1.5!">
            <div className="col-start-1 flex min-w-0 items-center gap-2 justify-self-start max-sm:w-full!">
                <HeaderSlotOutlet name="left" className="flex min-w-0 items-center gap-2 empty:hidden" />
                {options.showTitle !== false ? <h1 className="rp-sub-default m-0 truncate text-sm font-medium">{title}</h1> : null}
            </div>
            <HeaderSlotOutlet name="center" className="col-start-2 flex min-w-0 items-center gap-2 justify-self-center max-sm:empty:hidden!" />
            <div className="rp-sub-right col-start-3 flex min-w-0 items-center justify-end gap-2 justify-self-end text-xs text-muted-foreground max-sm:w-full!">
                <HeaderSlotOutlet name="right" className="ml-auto flex min-w-0 items-center justify-end gap-1.5 text-sm text-foreground empty:hidden" />
                <span className="rp-sub-default flex items-center gap-2">
                    {active && active.badge ? <Badge variant="secondary">{active.badge}</Badge> : null}
                    {options.note ? <span className="max-sm:hidden">{options.note}</span> : null}
                </span>
            </div>
        </div>
    )
}
