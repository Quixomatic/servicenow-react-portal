/**
 * utilities:app/header-slots: named header slots that page widgets portal into (ChannelGuide's
 * HeaderLeftSlot / HeaderCenterSlot / HeaderRightSlot).
 *
 *   A header widget (e.g. app/app-subheader) renders the outlets:
 *     <HeaderSlotOutlet name="left" className="…" />   (also "center", "right", or any name)
 *
 *   Any page widget contributes:
 *     <HeaderSlot name="right"> <Button…/> </HeaderSlot>
 *       → rendered inside the outlet (React portal: state, context and events stay with the widget);
 *       → no outlet on this layout: rendered inline where it stands (fallback="inline", default), or
 *         not at all (fallback="none").
 *     useHeaderSlot("right")  → the outlet element or null (to choose a layout up front)
 *
 * Outlets are scoped per portal host (keyed by its overlay container), so two portals on one page
 * never share slots. Several contributions to one slot render in mount order. An outlet that has
 * contributions gets data-filled, so the header can hide its own default content with CSS
 * (`[data-rp-hslot=left][data-filled] ~ .default { display: none }`).
 *
 * Why a utility, not RegionPortal: RegionPortal targets a layout region's outlet; these slots live
 * inside a header widget's own markup (left / center / right of its bar).
 */
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePortalContainer } from '@portal/runtime';

type Scope = { outlets: Map<string, HTMLElement>; counts: Map<string, number>; listeners: Set<() => void> };

const scopes = new WeakMap<object, Scope>();
const GLOBAL_KEY = {};

function scopeOf(key: object | null | undefined): Scope {
    const k = key || GLOBAL_KEY;
    let s = scopes.get(k);
    if (!s) {
        s = { outlets: new Map(), counts: new Map(), listeners: new Set() };
        scopes.set(k, s);
    }
    return s;
}

function emit(s: Scope) {
    s.listeners.forEach((l) => l());
}

function useScope(): Scope {
    let container: object | null = null;
    try {
        container = usePortalContainer() as object;
    } catch (e) {
        container = null;
    }
    return scopeOf(container);
}

/** The outlet element for a slot, or null (re-renders when outlets appear or go). */
export function useHeaderSlot(name: string): HTMLElement | null {
    const s = useScope();
    return useSyncExternalStore(
        (l: () => void) => {
            s.listeners.add(l);
            return () => s.listeners.delete(l);
        },
        () => s.outlets.get(name) || null,
        () => null
    );
}

/** Rendered by a header: the element contributions to `name` render into. */
export function HeaderSlotOutlet({ name, className, as: Tag = 'div' }: { name: string; className?: string; as?: any }) {
    const s = useScope();
    const [el, setEl] = useState<HTMLElement | null>(null);
    useLayoutEffect(() => {
        if (!el) return undefined;
        s.outlets.set(name, el);
        emit(s);
        return () => {
            if (s.outlets.get(name) === el) s.outlets.delete(name);
            emit(s);
        };
    }, [el, name, s]);
    return <Tag ref={setEl} className={className} data-rp-hslot={name} />;
}

/** Contribute children to a header slot; inline (or nothing) when the layout has no such slot. */
export function HeaderSlot({
    name,
    children,
    fallback = 'inline',
}: {
    name: string;
    children?: any;
    fallback?: 'inline' | 'none';
}) {
    const s = useScope();
    const el = useHeaderSlot(name);
    // Mark the outlet as filled while at least one contribution is mounted.
    useEffect(() => {
        if (!el) return undefined;
        s.counts.set(name, (s.counts.get(name) || 0) + 1);
        el.setAttribute('data-filled', '');
        return () => {
            const n = (s.counts.get(name) || 1) - 1;
            s.counts.set(name, n);
            if (!n) el.removeAttribute('data-filled');
        };
    }, [el, name, s]);
    if (el) return createPortal(children, el);
    return fallback === 'inline' ? children : null;
}
