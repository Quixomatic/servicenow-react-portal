/**
 * components:app/contact-card: a person at a glance, Next Experience's sn-contact-card.
 *
 *   <ContactCard userId={sysId} onOpen={(table, id) => …} />     photo, name, title, department,
 *                                                                email / phone actions, Open record
 *   <ContactCard user={contact} compact />                        from data you already have
 *   const { contact, isLoading, notFound } = useContact(userId)   the sys_user summary (GraphQL)
 *   userPhotoUrl(avatar)                                          sys_user.avatar → '/<id>.iix?t=small'
 *
 * Read as the user (GlideRecord_Query applies the sys_user ACLs): a field the user can't read comes
 * back empty and its row or action simply doesn't render, so roleless users see what the platform
 * lets them see (usually the name). Built on host kit components:avatar (photo, else initials) and
 * components:button.
 */
import { useGraphQL } from 'utilities:app/graphql';
import { UserAvatar } from 'components:avatar';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { cx, Spinner } from 'components:app/field';

export type Contact = {
    sysId: string;
    name: string;
    userName?: string;
    title?: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    department?: string;
    location?: string;
    company?: string;
    vip?: boolean;
    /** Photo URL (userPhotoUrl), '' = none. */
    photo?: string;
    active?: boolean;
};

const CONTACT_QUERY = `query rpContact($q: String) { GlideRecord_Query { sys_user(queryConditions: $q, pagination: { limit: 1 }) { _results {
    sys_id { value } name { displayValue } user_name { displayValue } title { displayValue } email { displayValue }
    phone { displayValue } mobile_phone { displayValue } department { displayValue } location { displayValue }
    company { displayValue } vip { value } avatar { value } active { value } } } } }`;

/** sys_user.avatar (an image sys_id, or '<id>.iix') → an image URL; '' when there is none. */
export function userPhotoUrl(avatar?: string | null): string {
    const a = String(avatar || '').trim();
    if (!a) return '';
    if (/^https?:|^\//.test(a)) return a;
    return `/${a.replace(/\.iix.*$/, '')}.iix?t=small`;
}

const SYS_ID = /^[0-9a-f]{32}$/;

/** One user's contact summary, read as the current user. */
export function useContact(userId: string | undefined | null, options: { enabled?: boolean } = {}) {
    const id = String(userId || '');
    const ok = SYS_ID.test(id) && options.enabled !== false;
    const q = useGraphQL(CONTACT_QUERY, { q: `sys_id=${id}` }, { enabled: ok, staleTime: 5 * 60_000 });
    const rows =
        q.data && q.data.GlideRecord_Query && q.data.GlideRecord_Query.sys_user
            ? q.data.GlideRecord_Query.sys_user._results
            : null;
    const r = rows && rows[0];
    const dv = (f: string) => (r && r[f] && r[f].displayValue != null ? String(r[f].displayValue) : '');
    const contact: Contact | null = r
        ? {
              sysId: r.sys_id.value,
              name: dv('name') || dv('user_name'),
              userName: dv('user_name'),
              title: dv('title'),
              email: dv('email'),
              phone: dv('phone'),
              mobilePhone: dv('mobile_phone'),
              department: dv('department'),
              location: dv('location'),
              company: dv('company'),
              vip: !!(r.vip && String(r.vip.value) === 'true'),
              photo: userPhotoUrl(r.avatar && r.avatar.value),
              active: !(r.active && String(r.active.value) === 'false'),
          }
        : null;
    return {
        contact,
        isLoading: ok && q.isLoading,
        error: (q.error as Error | null) || null,
        notFound: ok && !q.isLoading && !q.error && !r,
    };
}

export type ContactCardProps = {
    /** sys_user sys_id (the card loads the contact), or `user` with data you already have. */
    userId?: string;
    user?: Contact;
    /** "Open record" (e.g. the form's openRecord); absent: no button. */
    onOpen?: (table: string, sysId: string) => void;
    /** Smaller: no department / location lines. */
    compact?: boolean;
    /** Extra actions after Email / Call / Open. */
    actions?: any;
    className?: string;
};

/** Photo, name, title, department and location; Email / Call / Open record actions. */
export function ContactCard(props: ContactCardProps) {
    const loaded = useContact(props.user ? '' : props.userId, { enabled: !props.user });
    const c = props.user || loaded.contact;
    if (!c) {
        return (
            <div className={cx('flex items-center gap-2 p-1 text-sm text-muted-foreground', props.className)}>
                {loaded.isLoading ? (
                    <>
                        <Spinner label="Loading contact" /> Loading…
                    </>
                ) : loaded.error ? (
                    <span role="alert">{loaded.error.message}</span>
                ) : (
                    'This user is not available.'
                )}
            </div>
        );
    }
    const phone = c.phone || c.mobilePhone || '';
    const lines = props.compact ? [] : [c.department, c.location || c.company].filter(Boolean);
    return (
        <div className={cx('flex min-w-0 flex-col gap-3', props.className)} data-rp-contact-card={c.sysId}>
            <div className="flex min-w-0 items-start gap-3">
                <UserAvatar name={c.name} src={c.photo || undefined} size={props.compact ? 'default' : 'lg'} />
                <div className="min-w-0 flex-1">
                    <p className="m-0 flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate">{c.name}</span>
                        {c.vip ? (
                            <span
                                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                                title="VIP"
                            >
                                <Icon name="star" className="size-2.5" aria-hidden="true" /> VIP
                            </span>
                        ) : null}
                        {c.active === false ? (
                            <span className="shrink-0 text-xs font-normal text-muted-foreground">(inactive)</span>
                        ) : null}
                    </p>
                    {c.title ? <p className="m-0 truncate text-xs text-muted-foreground">{c.title}</p> : null}
                    {lines.map((l, i) => (
                        <p key={i} className="m-0 truncate text-xs text-muted-foreground">
                            {l}
                        </p>
                    ))}
                </div>
            </div>
            {c.email || phone ? (
                <dl className="m-0 grid gap-1 text-xs">
                    {c.email ? (
                        <div className="flex min-w-0 items-center gap-2">
                            <dt className="sr-only">Email</dt>
                            <Icon name="mail" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <dd className="m-0 min-w-0 truncate">
                                <a
                                    href={`mailto:${c.email}`}
                                    className="text-primary underline-offset-4 hover:underline"
                                >
                                    {c.email}
                                </a>
                            </dd>
                        </div>
                    ) : null}
                    {phone ? (
                        <div className="flex min-w-0 items-center gap-2">
                            <dt className="sr-only">Phone</dt>
                            <Icon name="phone" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <dd className="m-0 min-w-0 truncate">
                                <a
                                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                                    className="text-primary underline-offset-4 hover:underline"
                                >
                                    {phone}
                                </a>
                            </dd>
                        </div>
                    ) : null}
                </dl>
            ) : null}
            {props.onOpen || props.actions ? (
                <div className="flex flex-wrap items-center gap-1.5">
                    {props.onOpen ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => props.onOpen && props.onOpen('sys_user', c.sysId)}
                            data-rp-open-record=""
                        >
                            <Icon name="external-link" aria-hidden="true" /> Open record
                        </Button>
                    ) : null}
                    {props.actions}
                </div>
            ) : null}
        </div>
    );
}

/** Preview (Studio): the signed-in user's card. */
export default function ContactCardPreview() {
    const q = useGraphQL(
        `query rpContactPreview { GlideRecord_Query { sys_user(queryConditions: "active=true^emailISNOTEMPTY^titleISNOTEMPTY^ORDERBYname", pagination: { limit: 1 }) { _results { sys_id { value } } } } }`
    );
    const rows = q.data && q.data.GlideRecord_Query ? q.data.GlideRecord_Query.sys_user._results : [];
    return (
        <div className="max-w-sm p-4">
            {rows && rows[0] ? (
                <ContactCard userId={rows[0].sys_id.value} onOpen={() => {}} />
            ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
            )}
        </div>
    );
}
