import { usePortal, Link } from '@portal/runtime'

type Props = { options?: { title?: string } }

/** Portal-level sidebar: one link per page without route parameters; highlights the current page. */
export default function NavSidebar({ options }: Props) {
    const { pages = [], page } = usePortal()
    const links = pages.filter((p) => !p.route.includes(':') && !p.route.includes('*'))

    return (
        <div className="grid gap-1">
            <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{options?.title || 'Pages'}</div>
            {links.map((p) => {
                const active = page?.route === p.route
                return (
                    <Link
                        key={p.id}
                        to={p.route}
                        className={
                            'block rounded-md px-2.5 py-1.5 text-sm no-underline ' +
                            (active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')
                        }
                    >
                        {p.title || '/' + p.route}
                    </Link>
                )
            })}
        </div>
    )
}
