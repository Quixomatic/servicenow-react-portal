import { Link, useNavigation } from '@portal/runtime';
import { useQuery } from 'utilities:react-query';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { cx } from 'components:app/field';
import { restGet } from 'utilities:app/graphql';

export type QuickLink = {
    label: string;
    description?: string;
    /** Lucide icon. */
    icon?: string;
    /** Tile tint: primary, chart-1 … chart-5. */
    tint?: string;
    /** Portal page + params (as <Link>), or an external href. */
    to?: string;
    q?: Record<string, string>;
    table?: string;
    sysId?: string;
    query?: string;
    href?: string;
    /** A live count badge: records of countTable matching countQuery (as the user). */
    countTable?: string;
    countQuery?: string;
    /** Badge text after the number, e.g. "pending". */
    countLabel?: string;
};

type Options = {
    title?: string;
    description?: string;
    /** tiles: a grid of link cards; cta: a call-to-action band with buttons; list: compact rows. */
    variant?: 'tiles' | 'cta' | 'list';
    items?: QuickLink[];
    /** Take the items from a portal menu instead (its leaf items, in order). */
    menu?: string;
    /** Grid columns at full width (tiles never get narrower than 12rem). */
    columns?: number;
};

const TINT: Record<string, string> = {
    primary: 'bg-primary/10 text-primary ring-primary/20',
    'chart-1': 'bg-chart-1/12 text-chart-1 ring-chart-1/20',
    'chart-2': 'bg-chart-2/12 text-chart-2 ring-chart-2/20',
    'chart-3': 'bg-chart-3/12 text-chart-3 ring-chart-3/20',
    'chart-4': 'bg-chart-4/12 text-chart-4 ring-chart-4/20',
    'chart-5': 'bg-chart-5/12 text-chart-5 ring-chart-5/20',
};
const TINTS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

/** How many records of a table match a query, for the current user (Aggregate API, ACLs apply). */
export function useRecordCount(
    table: string | undefined,
    query: string | undefined,
    options: { enabled?: boolean } = {}
) {
    const ok = !!table && /^[a-z0-9_]+$/.test(table);
    return useQuery({
        queryKey: ['rp-count', table || '', query || ''],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const r = await restGet(
                `/api/now/stats/${table}?sysparm_count=true&sysparm_query=${encodeURIComponent(query || '')}`,
                signal
            );
            return parseInt((r && r.stats && r.stats.count) || '0', 10) || 0;
        },
        enabled: ok && options.enabled !== false,
        staleTime: 30_000,
    }) as any;
}

function CountBadge({ item }: { item: QuickLink }) {
    const c = useRecordCount(item.countTable, item.countQuery);
    if (!item.countTable || c.data === undefined) return null;
    const n = c.data as number;
    return (
        <span
            className={cx(
                'inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold tabular-nums',
                n ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground'
            )}
        >
            {n}
            {item.countLabel ? ` ${item.countLabel}` : ''}
        </span>
    );
}

function linkProps(item: QuickLink): any {
    if (item.href) return { href: item.href, target: '_blank', rel: 'noopener noreferrer' };
    const p: any = { to: item.to || '' };
    if (item.q) p.q = item.q;
    if (item.table) p.table = item.table;
    if (item.sysId) p.sysId = item.sysId;
    if (item.query) p.query = item.query;
    return p;
}

function ItemLink({ item, className, children }: { item: QuickLink; className: string; children: any }) {
    const p = linkProps(item);
    if (item.href)
        return (
            <a {...p} className={className}>
                {children}
            </a>
        );
    return (
        <Link {...p} className={className}>
            {children}
        </Link>
    );
}

function menuItems(items: any[], out: QuickLink[]) {
    for (const it of items || []) {
        if (!it || it.type === 'separator') continue;
        if (it.type === 'group') {
            menuItems(it.children, out);
            continue;
        }
        out.push({
            label: it.label,
            description: it.tooltip,
            icon: it.icon,
            tint: it.tint,
            to: it.to,
            q: it.q,
            table: it.table,
            sysId: it.sysId,
            query: it.query,
            href: it.href,
        });
    }
}

/**
 * Quick Links: link tiles (icon, label, description, optional live count badge), a call-to-action
 * band, or compact rows. Items come from options or from a portal menu. Each item links to a portal
 * page with explicit params (to, q, table, sysId, query) or an external href. Hook: useRecordCount.
 */
export default function QuickLinks({ options = {} }: { options?: Options }) {
    const nav = useNavigation(options.menu || 'quick-links') as any;
    let items: QuickLink[] = Array.isArray(options.items) ? options.items.filter((i) => i && i.label) : [];
    if (options.menu) {
        const fromMenu: QuickLink[] = [];
        menuItems(nav.items, fromMenu);
        items = fromMenu;
    }
    const variant = options.variant || 'tiles';
    if (!items.length) return null;

    if (variant === 'cta') {
        return (
            <section
                className="rp-ql-cta relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4 overflow-hidden rounded-xl border border-border px-6 py-5 max-sm:px-4"
                aria-label={options.title || 'Get help'}
                data-rp-quick-links="cta"
            >
                <div className="flex min-w-0 items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 ring-inset max-sm:hidden">
                        <Icon name="message-circle-question" className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="m-0 text-base font-semibold tracking-tight">
                            {options.title || "Can't find what you need?"}
                        </h2>
                        {options.description ? (
                            <p className="m-0 mt-0.5 text-sm text-pretty text-muted-foreground">
                                {options.description}
                            </p>
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {items.map((it, i) => {
                        const p = linkProps(it);
                        return (
                            <Button
                                key={it.label}
                                variant={i === 0 ? 'default' : 'outline'}
                                render={it.href ? <a {...p} /> : <Link {...p} />}
                            >
                                {it.icon ? <Icon name={it.icon} /> : null}
                                {it.label}
                            </Button>
                        );
                    })}
                </div>
            </section>
        );
    }

    if (variant === 'list') {
        return (
            <nav aria-label={options.title || 'Quick links'} className="flex flex-col gap-1" data-rp-quick-links="list">
                {options.title ? <h2 className="m-0 mb-1 px-2 text-sm font-semibold">{options.title}</h2> : null}
                {items.map((it, i) => (
                    <ItemLink
                        key={it.label}
                        item={it}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground no-underline outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    >
                        <span
                            className={cx(
                                'flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset',
                                TINT[it.tint || TINTS[i % 5]] || TINT['chart-1']
                            )}
                        >
                            <Icon name={it.icon || 'link'} className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                        <CountBadge item={it} />
                    </ItemLink>
                ))}
            </nav>
        );
    }

    const cols = Math.max(2, Math.min(6, options.columns || 4));
    return (
        <section
            className="rp-ql flex min-w-0 flex-col gap-3"
            aria-label={options.title || 'Quick links'}
            data-rp-quick-links="tiles"
        >
            {options.title ? (
                <div className="px-0.5">
                    <h2 className="m-0 text-base font-semibold tracking-tight">{options.title}</h2>
                    {options.description ? (
                        <p className="m-0 mt-0.5 text-sm text-muted-foreground">{options.description}</p>
                    ) : null}
                </div>
            ) : null}
            <div className="rp-ql-grid grid gap-3" style={{ ['--rp-ql-cols' as any]: cols }}>
                {items.map((it, i) => (
                    <ItemLink
                        key={it.label}
                        item={it}
                        className="group/ql flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground no-underline shadow-xs outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary/35 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    >
                        <span
                            className={cx(
                                'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                                TINT[it.tint || TINTS[i % 5]] || TINT['chart-1']
                            )}
                        >
                            <Icon name={it.icon || 'link'} className="size-5" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex min-w-0 items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">{it.label}</span>
                                {it.countTable ? (
                                    <CountBadge item={it} />
                                ) : (
                                    <Icon
                                        name={it.href ? 'arrow-up-right' : 'arrow-right'}
                                        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover/ql:translate-x-0.5 group-hover/ql:text-primary"
                                    />
                                )}
                            </span>
                            {it.description ? (
                                <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {it.description}
                                </span>
                            ) : null}
                        </span>
                    </ItemLink>
                ))}
            </div>
        </section>
    );
}
