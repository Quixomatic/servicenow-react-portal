import { useEffect, useState } from 'react';
import { useServer, useUser } from '@portal/runtime';
import { useQuery } from 'utilities:react-query';
import { Icon, hasIcon } from 'components:icon';
import { cx } from 'components:app/field';
import { restGet } from 'utilities:app/graphql';

export type Announcement = {
    id: string;
    title: string;
    summary: string;
    urgent: boolean;
    glyph: string;
    linkText: string;
    linkUrl: string;
    newTab: boolean;
    dismiss: 'none' | 'session' | 'forever';
    types: string;
    roles: string[];
    from: string;
    to: string;
};

const dv = (f: any) => (f && typeof f === 'object' ? String(f.display_value || '') : String(f || ''));
const v = (f: any) =>
    f && typeof f === 'object' ? String(f.value === null || f.value === undefined ? '' : f.value) : String(f || '');

function utcMs(s: string) {
    const t = Date.parse(String(s || '').replace(' ', 'T') + 'Z');
    return isNaN(t) ? NaN : t;
}

/**
 * Active platform announcements (the `announcement` table Service Portal uses), read as the user
 * through the Table API: only for users who can read that table (admins, by default). The
 * Announcements widget itself uses its server script instead. Filtered on the client to the current window (from / to), the user's roles and the
 * consumer type ('widget', 'banner' or 'any').
 */
export function useAnnouncements(options: { types?: 'widget' | 'banner' | 'any'; limit?: number } = {}) {
    const user = useUser() as any;
    const q = useQuery({
        queryKey: ['rp-announcements'],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const rows = await restGet(
                `/api/now/table/announcement?sysparm_query=${encodeURIComponent('active=true^ORDERBYDESCdisplay_first^ORDERBYDESCfrom')}&sysparm_fields=sys_id,title,summary,from,to,type,roles,glyph,display_style,dismiss_options,click_target,details_url,details_link_text&sysparm_display_value=all&sysparm_exclude_reference_link=true&sysparm_limit=50`,
                signal
            );
            return (Array.isArray(rows) ? rows : []).map((r: any): Announcement => {
                const url = v(r.details_url);
                const dismiss = v(r.dismiss_options);
                return {
                    id: v(r.sys_id),
                    title: dv(r.title),
                    summary: dv(r.summary),
                    urgent: /urgent/i.test(dv(r.display_style)),
                    glyph: v(r.glyph),
                    linkText: dv(r.details_link_text),
                    linkUrl: !url ? '' : /^(https?:|mailto:)/i.test(url) ? url : '/' + url.replace(/^\/+/, ''),
                    newTab: v(r.click_target) !== 'urlSame',
                    dismiss:
                        dismiss === 'dismissible' ? 'forever' : dismiss === 'session_dismissible' ? 'session' : 'none',
                    types: dv(r.type),
                    roles: v(r.roles)
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                    from: v(r.from),
                    to: v(r.to),
                };
            });
        },
        staleTime: 5 * 60_000,
        retry: false,
    }) as any;
    const now = Date.now();
    const want = options.types || 'widget';
    const list: Announcement[] = ((q.data as Announcement[]) || []).filter((a) => {
        const from = utcMs(a.from);
        const to = utcMs(a.to);
        if (!isNaN(from) && from > now) return false;
        if (!isNaN(to) && to < now) return false;
        if (a.roles.length && !(user && user.hasAnyRole && user.hasAnyRole(a.roles))) return false;
        if (want !== 'any' && a.types.toLowerCase().indexOf(want) < 0) return false;
        return true;
    });
    return { items: options.limit ? list.slice(0, options.limit) : list, isLoading: q.isLoading, error: q.error };
}

const DISMISS_KEY = 'x_312987_portal.announcements.dismissed';

function readDismissed(store: Storage | null): string[] {
    try {
        const raw = store ? store.getItem(DISMISS_KEY) : null;
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

/** Dismissed announcement ids: per session or for good, under our own storage keys. */
export function useDismissedAnnouncements() {
    const [ids, setIds] = useState<string[]>([]);
    useEffect(() => {
        setIds(
            readDismissed(typeof sessionStorage !== 'undefined' ? sessionStorage : null).concat(
                readDismissed(typeof localStorage !== 'undefined' ? localStorage : null)
            )
        );
    }, []);
    const dismiss = (a: Pick<Announcement, 'id' | 'dismiss'>) => {
        const store = a.dismiss === 'forever' ? localStorage : sessionStorage;
        try {
            store.setItem(DISMISS_KEY, JSON.stringify(readDismissed(store).concat(a.id).slice(-100)));
        } catch (e) {
            /* blocked */
        }
        setIds((prev) => prev.concat(a.id));
    };
    return { ids, dismiss };
}

type Options = { types?: 'widget' | 'banner' | 'any'; limit?: number };

/**
 * Announcements: the platform's active announcements as slim alert cards (urgent styles in the
 * destructive tone), with their details link and the record's dismiss rule (session / for good /
 * not dismissible). Renders nothing when there are none. Hooks: useAnnouncements,
 * useDismissedAnnouncements.
 */
export default function Announcements({ options = {} }: { options?: Options }) {
    // The server script reads the announcement table with the scope's rights and applies the
    // audience rules (most users can't read the table: useAnnouncements would get a 403 for them).
    const { data } = useServer() as any;
    const items: Pick<
        Announcement,
        'id' | 'title' | 'summary' | 'urgent' | 'glyph' | 'linkText' | 'linkUrl' | 'newTab' | 'dismiss'
    >[] = data && Array.isArray(data.items) ? data.items.slice(0, options.limit || 3) : [];
    const { ids, dismiss } = useDismissedAnnouncements();
    const shown = items.filter((a) => ids.indexOf(a.id) < 0);
    if (!shown.length) return null;
    return (
        <div
            className="rp-ann grid min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card shadow-xs"
            role="region"
            aria-label="Announcements"
            data-rp-announcements=""
        >
            {shown.map((a, i) => {
                const icon =
                    a.glyph && a.glyph !== 'empty' && hasIcon(a.glyph) !== false
                        ? a.glyph
                        : a.urgent
                          ? 'triangle-alert'
                          : 'megaphone';
                return (
                    <div
                        key={a.id}
                        className={cx(
                            'rp-ann__row flex items-center gap-3 py-2.5 pr-2 pl-4',
                            i ? 'border-t border-border' : '',
                            a.urgent ? 'rp-ann--urgent' : ''
                        )}
                    >
                        <span
                            className={cx(
                                'flex size-7 shrink-0 items-center justify-center rounded-lg',
                                a.urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                            )}
                        >
                            <Icon
                                name={icon}
                                className="size-4"
                                fallback={<Icon name="megaphone" className="size-4" />}
                            />
                        </span>
                        <p
                            className="m-0 min-w-0 flex-1 truncate text-sm max-md:whitespace-normal max-md:line-clamp-2"
                            title={a.summary || a.title}
                        >
                            <span className="font-semibold text-foreground">{a.title}</span>
                            {a.summary ? (
                                <span className="text-muted-foreground max-md:hidden"> · {a.summary}</span>
                            ) : null}
                        </p>
                        {a.linkUrl ? (
                            <a
                                href={a.linkUrl}
                                target={a.newTab ? '_blank' : undefined}
                                rel={a.newTab ? 'noopener noreferrer' : undefined}
                                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-primary no-underline hover:underline"
                                title={a.linkText || 'Learn more'}
                            >
                                <span className="max-sm:hidden">Learn more</span>
                                <Icon name={a.newTab ? 'arrow-up-right' : 'arrow-right'} className="size-3.5" />
                            </a>
                        ) : null}
                        {a.dismiss !== 'none' ? (
                            <button
                                type="button"
                                aria-label={`Dismiss ${a.title}`}
                                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                onClick={() => dismiss(a)}
                            >
                                <Icon name="x" className="size-4" />
                            </button>
                        ) : (
                            <span className="w-1" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
