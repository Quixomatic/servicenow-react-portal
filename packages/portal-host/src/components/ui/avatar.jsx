import * as React from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

// components:avatar: shadcn Avatar on Base UI (the image shows once it has loaded, the fallback
// until then or when it fails), plus a presence dot, a stacked group with a "+N" count and a
// one-line UserAvatar convenience.
//
//   <Avatar size="lg"><AvatarImage src alt="" /><AvatarFallback>BA</AvatarFallback>
//       <AvatarBadge status="online" /></Avatar>
//   <UserAvatar name="Beth Anglin" src={photo} status="away" size="sm" />
//   <AvatarGroup max={3} size="sm">{people.map((p) => <UserAvatar key … />)}</AvatarGroup>
//
// Generic: no user records or photo URLs here (callers pass `src`). Sizes: xs 20, sm 24,
// default 32, lg 40, xl 48 px. Presence colours follow app/highlighted-value's tones.

const avatarVariants = cva(
    'group/avatar relative flex shrink-0 rounded-full select-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
    {
        variants: {
            size: {
                xs: 'size-5 text-[9px]',
                sm: 'size-6 text-[10px]',
                default: 'size-8 text-xs',
                lg: 'size-10 text-sm',
                xl: 'size-12 text-base',
            },
        },
        defaultVariants: { size: 'default' },
    }
);

const AvatarSizeContext = React.createContext(null);

function Avatar({ className, size, ...props }) {
    const inherited = React.useContext(AvatarSizeContext);
    const resolved = size || inherited || 'default';
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            data-size={resolved}
            className={cn(avatarVariants({ size: resolved }), className)}
            {...props}
        />
    );
}

function AvatarImage({ className, ...props }) {
    return (
        <AvatarPrimitive.Image
            data-slot="avatar-image"
            className={cn('aspect-square size-full rounded-full object-cover', className)}
            {...props}
        />
    );
}

function AvatarFallback({ className, ...props }) {
    return (
        <AvatarPrimitive.Fallback
            data-slot="avatar-fallback"
            className={cn(
                'flex size-full items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground',
                className
            )}
            {...props}
        />
    );
}

const PRESENCE = {
    online: { className: 'bg-emerald-500', label: 'Online' },
    away: { className: 'bg-amber-500', label: 'Away' },
    busy: { className: 'bg-destructive', label: 'Busy' },
    offline: { className: 'bg-muted-foreground/60', label: 'Offline' },
};

/**
 * A dot (or a small icon) at the avatar's bottom-right corner. `status` picks a presence colour
 * and an sr-only label ("Online"); pass `label` to override it, or children for an icon badge.
 */
function AvatarBadge({ className, status, label, children, ...props }) {
    const presence = status ? PRESENCE[status] : null;
    const text = label !== undefined ? label : presence ? presence.label : undefined;
    return (
        <span
            data-slot="avatar-badge"
            data-status={status}
            className={cn(
                'absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none',
                'group-data-[size=xs]/avatar:size-1.5 group-data-[size=sm]/avatar:size-2 group-data-[size=default]/avatar:size-2.5 group-data-[size=lg]/avatar:size-3 group-data-[size=xl]/avatar:size-3.5',
                '[&>svg]:size-[70%]',
                presence ? presence.className : '',
                className
            )}
            {...props}
        >
            {children}
            {text ? <span className="sr-only">{text}</span> : null}
        </span>
    );
}

/** Split a list for "show N, then +rest": { visible, hidden, overflow } (max <= 0: no limit). */
function splitOverflow(items, max) {
    const list = Array.isArray(items) ? items : [];
    if (!max || max <= 0 || list.length <= max) return { visible: list, hidden: [], overflow: 0 };
    // Keep the count chip inside the limit: max 3 of 5 shows 2 + "+3".
    const keep = Math.max(1, max - 1);
    return { visible: list.slice(0, keep), hidden: list.slice(keep), overflow: list.length - keep };
}

/**
 * Overlapping avatars. `max` keeps the stack short: the rest collapse into an AvatarGroupCount
 * ("+3", with an sr-only "3 more"). `size` applies to every child Avatar that has none.
 * `renderCount(count, hidden)` replaces the default count chip (e.g. a tooltip or popover trigger).
 */
function AvatarGroup({ className, children, max, size, renderCount, ...props }) {
    const items = React.Children.toArray(children).filter(Boolean);
    const { visible, hidden, overflow } = splitOverflow(items, max);
    return (
        <AvatarSizeContext.Provider value={size || null}>
            <div
                data-slot="avatar-group"
                data-size={size || 'default'}
                className={cn(
                    'group/avatar-group flex items-center -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
                    'data-[size=xs]:-space-x-1 data-[size=sm]:-space-x-1.5 data-[size=lg]:-space-x-2.5 data-[size=xl]:-space-x-3',
                    className
                )}
                {...props}
            >
                {visible}
                {overflow > 0 ? (
                    renderCount ? (
                        renderCount(overflow, hidden)
                    ) : (
                        <AvatarGroupCount size={size}>+{overflow}</AvatarGroupCount>
                    )
                ) : null}
            </div>
        </AvatarSizeContext.Provider>
    );
}

/** The "+N" chip at the end of a group (also usable on its own). */
function AvatarGroupCount({ className, size, children, ...props }) {
    const inherited = React.useContext(AvatarSizeContext);
    const resolved = size || inherited || 'default';
    const text = typeof children === 'string' ? children : '';
    const more = /^\+(\d+)$/.exec(text);
    return (
        <span
            data-slot="avatar-group-count"
            className={cn(
                avatarVariants({ size: resolved }),
                'items-center justify-center bg-muted font-medium text-muted-foreground ring-2 ring-background after:hidden',
                className
            )}
            {...props}
        >
            <span aria-hidden={more ? 'true' : undefined}>{children}</span>
            {more ? <span className="sr-only">{more[1]} more</span> : null}
        </span>
    );
}

/** 'Beth Anglin' -> 'BA'; 'admin' -> 'AD'; '' -> '?'. */
function initialsOf(name) {
    // Words that start with a letter or digit (any script: everything from U+00C0 up counts).
    const parts = String(name || '')
        .split(/[\s,()[\]{}<>"/\\|]+/)
        .filter((w) => /^[A-Za-z0-9À-￿]/.test(w));
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * One-line avatar: photo when `src` loads, else initials from `name` (or `initials`).
 * Decorative by default (the name is usually printed next to it); `labelled` gives it
 * role="img" with the name (and presence) as its accessible name, for avatar-only UIs.
 */
function UserAvatar({ name, src, initials, status, size, labelled = false, className, title, ...props }) {
    const presence = status ? PRESENCE[status] : null;
    const a11y = labelled
        ? { role: 'img', 'aria-label': [name, presence ? presence.label : ''].filter(Boolean).join(', ') }
        : { 'aria-hidden': true };
    return (
        <Avatar size={size} className={className} title={title === undefined ? name : title} {...a11y} {...props}>
            {src ? <AvatarImage src={src} alt="" /> : null}
            <AvatarFallback>{initials || initialsOf(name)}</AvatarFallback>
            {status ? <AvatarBadge status={status} label={labelled ? '' : undefined} /> : null}
        </Avatar>
    );
}

export {
    Avatar,
    AvatarImage,
    AvatarFallback,
    AvatarBadge,
    AvatarGroup,
    AvatarGroupCount,
    UserAvatar,
    avatarVariants,
    initialsOf,
    splitOverflow,
    PRESENCE as avatarPresence,
};
