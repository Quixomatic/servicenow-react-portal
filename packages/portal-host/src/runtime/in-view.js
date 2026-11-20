// "Has this element come near the viewport yet?": the building block of lazy embeds (embed.js
// `lazy` prop), usable by any component that wants to defer work until it's scrolled into view.
//
//   const [ref, inView] = useInViewOnce({ rootMargin: '200px' })
//   return <div ref={ref}>{inView ? <Expensive /> : <Skeleton />}</div>
import { useCallback, useEffect, useState } from 'react';

export const DEFAULT_ROOT_MARGIN = '200px';

const observers = new Map(); // rootMargin -> { io, callbacks: Map(element -> fn) }

/**
 * Calls onVisible ONCE when `el` comes within rootMargin of the viewport; returns a cancel
 * function. One shared IntersectionObserver per rootMargin, so elements that scroll into view
 * together are reported in the same task (React renders them in one commit; lazy embeds then share
 * one batched initialize). Without IntersectionObserver, onVisible runs at once.
 */
export function observeOnce(el, rootMargin, onVisible) {
    if (!el) return () => {};
    if (typeof IntersectionObserver === 'undefined') {
        onVisible();
        return () => {};
    }
    const margin = rootMargin || DEFAULT_ROOT_MARGIN;
    let entry = observers.get(margin);
    if (!entry) {
        const callbacks = new Map();
        const io = new IntersectionObserver(
            (records) =>
                records.forEach((r) => {
                    if (!r.isIntersecting) return;
                    const fn = callbacks.get(r.target);
                    if (!fn) return;
                    callbacks.delete(r.target);
                    io.unobserve(r.target);
                    fn();
                }),
            { rootMargin: margin }
        );
        entry = { io, callbacks };
        observers.set(margin, entry);
    }
    const current = entry;
    current.callbacks.set(el, onVisible);
    current.io.observe(el);
    return () => {
        current.callbacks.delete(el);
        current.io.unobserve(el);
    };
}

/**
 * useInViewOnce({ rootMargin?, disabled? }) → [ref, inView]. Attach `ref` (a callback ref) to an
 * element with a box (not display: contents). inView turns true once and stays true. disabled =
 * true reports inView immediately (nothing is observed).
 */
export function useInViewOnce(settings) {
    const disabled = !!(settings && settings.disabled);
    const rootMargin = (settings && settings.rootMargin) || DEFAULT_ROOT_MARGIN;
    const [inView, setInView] = useState(disabled);
    const [el, setEl] = useState(null);
    const ref = useCallback((node) => setEl(node), []);
    useEffect(() => {
        if (disabled && !inView) setInView(true);
    }, [disabled, inView]);
    useEffect(() => {
        if (inView || disabled || !el) return undefined;
        return observeOnce(el, rootMargin, () => setInView(true));
    }, [el, rootMargin, inView, disabled]);
    return [ref, inView || disabled];
}
