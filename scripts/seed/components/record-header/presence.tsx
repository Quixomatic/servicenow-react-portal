import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAmbChannel, useUser } from '@portal/runtime';
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroupCount, initialsOf } from 'components:avatar';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { cx } from 'components:app/field';

/**
 * Record presence ("who else is here"), on the platform's own AMB channel /sn/rp/<table>/<sys_id>,
 * the one Workspace's record presence uses, with the same message shape, so Workspace agents and
 * portal users see each other.
 *
 * Verified on dev189813 (2026-11-20): the server only relays. It sends nothing on subscribe or
 * unsubscribe (no "entered" / "exited", no list of current viewers) and it doesn't check the payload;
 * only `ext.from_user` (the sender's user name) is set by the server. So each client:
 * - announces itself when its subscription opens, and again whenever it sees someone new (that's
 *   how a newcomer learns who was already there), plus a heartbeat every 60 s;
 * - says `exited` when it leaves (unmount, page hide);
 * - forgets anyone not heard from in 150 s (Workspace clients only publish while typing in a
 *   journal field, so they show up then and fade out);
 * - ignores entries whose user_name isn't the server-stamped sender (no spoofed avatars) and itself.
 * Status: 'viewing', or 'typing' while the form has unsaved changes (Workspace's own value).
 */

export type PresenceStatus = 'viewing' | 'typing';

export type PresenceUser = {
    id: string;
    userName: string;
    name: string;
    initials: string;
    /** Photo URL ('' = none). */
    avatar: string;
    status: PresenceStatus;
    /** Last heard (ms). */
    seen: number;
};

const HEARTBEAT_MS = 60_000;
const EXPIRE_MS = 150_000;
const ANNOUNCE_GAP_MS = 10_000;

type Wire = {
    user_id?: string;
    user_name?: string;
    user_display_name?: string;
    user_initials?: string;
    user_avatar?: string | null;
    status?: string;
};

function photoOf(avatar?: string | null): string {
    const a = String(avatar || '').trim();
    if (!a) return '';
    return /^https?:|^\//.test(a) ? a : `/${a}`;
}

function ambClient(): any {
    try {
        const w = window as any;
        if (w.amb && typeof w.amb.getClient === 'function') return w.amb.getClient();
        return w.g_ambClient || null;
    } catch (e) {
        return null;
    }
}

export type UsePresenceOptions = {
    table: string | undefined;
    sysId: string | undefined;
    /** What this user is doing (default 'viewing'). */
    status?: PresenceStatus;
    /** Default true; new records ('-1') never have presence. */
    enabled?: boolean;
};

/**
 * usePresence({ table, sysId, status }) → { users, status }: the OTHER users on this record now
 * (most recent first), and the channel's subscription status ('subscribed', 'denied', …).
 * Publishes this user's own presence while mounted.
 */
export function usePresence(options: UsePresenceOptions) {
    const { table, sysId } = options;
    const me = useUser() as any;
    const myId = String((me && me.sysId) || '');
    const myName = String((me && me.userName) || '');
    const on =
        options.enabled !== false &&
        !!table &&
        !!sysId &&
        sysId !== '-1' &&
        /^[a-z0-9_]+$/i.test(table) &&
        /^[0-9a-f]{32}$/.test(sysId) &&
        !!myId;
    const channel = on ? `/sn/rp/${table}/${sysId}` : null;
    const status: PresenceStatus = options.status === 'typing' ? 'typing' : 'viewing';
    const [peers, setPeers] = useState<Record<string, PresenceUser>>({});
    const peersRef = useRef<Record<string, PresenceUser>>({});
    const statusRef = useRef(status);
    statusRef.current = status;
    const lastAnnounce = useRef(0);
    const announceTimer = useRef<any>(null);

    const publish = useCallback(
        (s: string) => {
            if (!channel) return;
            const client = ambClient();
            if (!client || typeof client.getChannel !== 'function') return;
            const avatar = String((me && me.avatar) || '').replace(/^\//, '');
            const message = {
                table,
                sysId,
                presences: [
                    {
                        field_type: '',
                        user_id: myId,
                        session_id: myId,
                        user_display_name: String((me && me.name) || myName),
                        user_name: myName,
                        user_initials: initialsOf(String((me && me.name) || myName)),
                        user_avatar: avatar ? `${avatar}?t=small` : null,
                        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                        // The date format Workspace's presence code expects.
                        time: new Date().toString().substring(0, 24),
                        status: s,
                    },
                ],
                options: {},
            };
            try {
                client.getChannel(channel).publish(message);
                if (s !== 'exited') lastAnnounce.current = Date.now();
            } catch (e) {
                /* presence is best effort */
            }
        },
        [channel, table, sysId, myId, myName, me]
    );

    const onMessage = useCallback(
        (m: any) => {
            const from = String((m && m.ext && m.ext.from_user) || '');
            const list: Wire[] = (m && m.data && Array.isArray(m.data.presences) && m.data.presences) || [];
            const prev = peersRef.current;
            let next = prev;
            let someoneNew = false;
            for (const p of list) {
                const id = String((p && p.user_id) || '');
                const userName = String((p && p.user_name) || '');
                if (!id || id === myId) continue;
                // Only the server stamps from_user: an entry for anyone else is not trusted.
                if (from && userName !== from) continue;
                const st = String(p.status || '');
                if (next === prev) next = Object.assign({}, prev);
                if (st === 'exited' || st === 'offline') {
                    delete next[id];
                    continue;
                }
                if (!prev[id]) someoneNew = true;
                next[id] = {
                    id,
                    userName,
                    name: String(p.user_display_name || userName),
                    initials: String(p.user_initials || ''),
                    avatar: photoOf(p.user_avatar),
                    status: st === 'typing' ? 'typing' : 'viewing',
                    seen: Date.now(),
                };
            }
            if (next !== prev) {
                peersRef.current = next;
                setPeers(next);
            }
            // A newcomer: tell them we're here (soon, jittered, at most every 10 s).
            if (someoneNew && !announceTimer.current) {
                const wait = Math.max(
                    800 + Math.random() * 1200,
                    ANNOUNCE_GAP_MS - (Date.now() - lastAnnounce.current)
                );
                announceTimer.current = setTimeout(() => {
                    announceTimer.current = null;
                    publish(statusRef.current);
                }, wait);
            }
        },
        [myId, publish]
    );

    const sub = useAmbChannel(channel, onMessage, { enabled: on });
    const subscribed = sub.status === 'subscribed';

    // Announce on subscribe and whenever the status changes; heartbeat while subscribed.
    useEffect(() => {
        if (!subscribed) return undefined;
        publish(status);
        const beat = setInterval(() => publish(statusRef.current), HEARTBEAT_MS);
        return () => clearInterval(beat);
    }, [subscribed, status, publish]);

    // Leave: unmount, record change or page hide.
    useEffect(() => {
        if (!subscribed) return undefined;
        const onHide = () => publish('exited');
        window.addEventListener('pagehide', onHide);
        return () => {
            window.removeEventListener('pagehide', onHide);
            publish('exited');
        };
    }, [subscribed, publish]);

    // Forget the silent; reset when the record changes.
    useEffect(() => {
        peersRef.current = {};
        setPeers({});
        if (!channel) return undefined;
        const prune = setInterval(() => {
            const cutoff = Date.now() - EXPIRE_MS;
            const prev = peersRef.current;
            const stale = Object.keys(prev).filter((k) => prev[k].seen < cutoff);
            if (!stale.length) return;
            const next = Object.assign({}, prev);
            stale.forEach((k) => delete next[k]);
            peersRef.current = next;
            setPeers(next);
        }, 15_000);
        return () => {
            clearInterval(prune);
            if (announceTimer.current) clearTimeout(announceTimer.current);
            announceTimer.current = null;
        };
    }, [channel]);

    const users = useMemo(
        () =>
            Object.keys(peers)
                .map((k) => peers[k])
                .sort((a, b) => b.seen - a.seen),
        [peers]
    );
    return { users, status: sub.status as string };
}

function statusLabel(s: PresenceStatus) {
    return s === 'typing' ? 'Editing' : 'Viewing';
}

function PresenceAvatar({ user, size }: { user: PresenceUser; size: 'xs' | 'sm' | 'default' }) {
    return (
        <Avatar size={size} aria-hidden="true" data-rp-presence-user={user.userName}>
            {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
            <AvatarFallback>{user.initials || initialsOf(user.name)}</AvatarFallback>
            <AvatarBadge status={user.status === 'typing' ? 'away' : 'online'} label="" />
        </Avatar>
    );
}

export type RecordPresenceProps = {
    users: PresenceUser[];
    /** Avatars before "+N" (default 3). */
    max?: number;
    size?: 'xs' | 'sm' | 'default';
    className?: string;
};

/**
 * Overlapping avatars of the other users on the record (green dot viewing, amber editing). A
 * button: it opens the full list. Renders nothing when nobody else is here.
 */
export function RecordPresence({ users, max = 3, size = 'sm', className }: RecordPresenceProps) {
    if (!users.length) return null;
    const shown = users.length > max ? users.slice(0, Math.max(1, max - 1)) : users;
    const rest = users.length - shown.length;
    const summary =
        users.length === 1
            ? `${users[0].name} is ${users[0].status === 'typing' ? 'editing' : 'viewing'} this record`
            : `${users.length} others are on this record: ${users.map((u) => `${u.name} (${statusLabel(u.status).toLowerCase()})`).join(', ')}`;
    return (
        <Popover>
            <PopoverTrigger
                className={cx(
                    'inline-flex shrink-0 items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    className
                )}
                aria-label={summary}
                title={summary}
                data-rp-presence={users.length}
            >
                <span className="flex items-center -space-x-1.5 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background">
                    {shown.map((u) => (
                        <PresenceAvatar key={u.id} user={u} size={size} />
                    ))}
                    {rest > 0 ? (
                        <AvatarGroupCount size={size} aria-hidden="true">
                            +{rest}
                        </AvatarGroupCount>
                    ) : null}
                </span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
                <p className="m-0 text-xs font-medium text-muted-foreground">Also on this record</p>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {users.map((u) => (
                        <li key={u.id} className="flex min-w-0 items-center gap-2">
                            <PresenceAvatar user={u} size="default" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{u.name}</span>
                                <span className="block text-xs text-muted-foreground">{statusLabel(u.status)}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}
