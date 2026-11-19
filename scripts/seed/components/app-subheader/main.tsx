import { usePortal, useNavigation } from '@portal/runtime'
import { Badge } from 'components:badge'

type Options = { menu?: string; showTitle?: boolean; note?: string }

/**
 * The inset card's 40px sub-header bar (ChannelGuide's SubHeader): page title on the left, the
 * active menu item's badge and an optional note on the right. Owns its height and bottom border.
 */
export default function AppSubheader({ options = {} }: { options?: Options }) {
    const { page } = usePortal()
    const nav = useNavigation(options.menu || 'primary')
    const active = nav.active as any
    const title = (page && (page.title || page.name)) || ''
    return (
        <div className="grid h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b px-3">
            <div className="flex min-w-0 items-center gap-2 justify-self-start">
                {options.showTitle !== false ? <h1 className="m-0 truncate text-sm font-medium">{title}</h1> : null}
            </div>
            <div className="justify-self-center" />
            <div className="flex items-center gap-2 justify-self-end text-xs text-muted-foreground">
                {active && active.badge ? <Badge variant="secondary">{active.badge}</Badge> : null}
                {options.note ? <span className="hidden sm:inline">{options.note}</span> : null}
            </div>
        </div>
    )
}
