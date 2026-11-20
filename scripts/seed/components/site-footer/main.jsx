// Plain JSX on purpose: components can be written in JS/JSX as well as TS/TSX.
// Owns its look: top border, padding, muted small text. Links come from the portal's `footer`
// menu (useNavigation('footer'), menu records only): groups become labelled link clusters.
import { usePortal, useNavigation, Link } from '@portal/runtime';
import { Icon } from 'components:icon';

function FooterLink({ item }) {
    const cls =
        'inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground no-underline hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring';
    const body = (
        <>
            {item.icon ? <Icon name={item.icon} className="size-3.5" fallback={false} /> : null}
            <span>{item.label}</span>
        </>
    );
    if (item.type === 'url') {
        return (
            <a
                {...item.attrs}
                href={item.href}
                target={item.target}
                rel="noreferrer"
                title={item.tooltip}
                className={cls}
            >
                {body}
            </a>
        );
    }
    return (
        <Link
            {...item.link}
            title={item.tooltip}
            aria-current={item.active ? 'page' : undefined}
            className={cls + (item.active ? ' text-foreground font-medium' : '')}
        >
            {body}
        </Link>
    );
}

export default function SiteFooter({ options }) {
    const { release, theme } = usePortal();
    const nav = useNavigation(options?.menu || 'footer');
    const items = nav.source === 'menu' ? nav.items : [];
    const loose = items.filter((i) => i.type !== 'group' && i.type !== 'separator');
    const groups = items.filter((i) => i.type === 'group');
    const parts = [
        options?.text || 'React Portal',
        release ? `release rev ${release.version}` : 'unprocessed',
        theme ? theme.name || theme.key : 'no theme',
    ];
    return (
        <footer className="flex flex-col gap-3 border-t px-6 py-3 text-xs text-muted-foreground">
            {loose.length || groups.length ? (
                <nav
                    aria-label={(nav.menu && nav.menu.name) || 'Footer'}
                    className="flex flex-wrap items-start gap-x-8 gap-y-3"
                >
                    {loose.length ? (
                        <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0">
                            {loose.map((item) => (
                                <li key={item.id}>
                                    <FooterLink item={item} />
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {groups.map((group) => (
                        <div key={group.id} className="flex flex-col gap-1">
                            <span
                                {...group.attrs}
                                className="text-[11px] font-semibold tracking-wider text-foreground/80 uppercase"
                            >
                                {group.label}
                            </span>
                            <ul className="m-0 flex list-none flex-col gap-1 p-0">
                                {group.children
                                    .filter((c) => c.type !== 'separator' && c.type !== 'group')
                                    .map((item) => (
                                        <li key={item.id}>
                                            <FooterLink item={item} />
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            ) : null}
            <div>{parts.join(' · ')}</div>
        </footer>
    );
}
