/**
 * app/docs-header — the docs portal's mobile top bar (fumadocs' #nd-subnav): title, search, and the
 * button that opens app/docs-sidebar's drawer (useSidebar().openMobile). The docs layout only shows
 * its header region below md, so on desktop this renders nothing visible.
 */
import { Link, usePortal, useSidebar } from '@portal/runtime';
import { Icon } from 'components:icon';
import { DocsSearchButton } from 'components:app/docs-search';
import { useDocsCollection } from 'utilities:app/docs';

type Options = { title?: string; icon?: string; search?: boolean; collection?: string };

export default function DocsHeader({ options = {} }: { options?: Options }) {
    const portal = usePortal();
    const sidebar = useSidebar();
    const coll = useDocsCollection(options.collection);
    if (!sidebar.isMobile) return null;
    return (
        <div className="flex h-14 items-center border-b bg-background/80 ps-4 pe-2.5 backdrop-blur-sm">
            <Link
                to=""
                q={Object.keys(coll.q).length ? coll.q : undefined}
                className="inline-flex min-w-0 items-center gap-2.5 font-semibold text-foreground no-underline"
            >
                {options.icon ? (
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Icon name={options.icon} className="size-3.5" />
                    </span>
                ) : null}
                <span className="truncate">{options.title || (portal && portal.portal.name) || 'Docs'}</span>
            </Link>
            <div className="flex-1" />
            {options.search !== false ? <DocsSearchButton className="p-2" /> : null}
            <button
                type="button"
                aria-label="Open menu"
                aria-expanded={sidebar.openMobile}
                onClick={() => sidebar.setOpenMobile(true)}
                className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
                <Icon name="panel-left" className="size-4.5" />
            </button>
        </div>
    );
}
