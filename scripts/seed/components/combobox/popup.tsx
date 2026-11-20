import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx, popupClass } from 'components:app/field';

/**
 * A floating popup anchored to an element, rendered in the browser's top layer (popover="manual")
 * so cards with overflow: hidden and transformed ancestors never clip it. It stays in the same
 * DOM tree (the portal's shadow root), so aria-controls / aria-activedescendant references from
 * the control keep working, which a body-level portal would break.
 */
export function usePopupPosition(
    anchor: { current: HTMLElement | null },
    open: boolean,
    opts: { maxHeight?: number; matchWidth?: boolean; minWidth?: number } = {}
) {
    const [pos, setPos] = useState<{
        top: number;
        left: number;
        width: number;
        maxHeight: number;
        placement: 'bottom' | 'top';
    } | null>(null);
    const maxH = opts.maxHeight ?? 300;
    useLayoutEffect(() => {
        if (!open) return undefined;
        let frame = 0;
        const measure = () => {
            const el = anchor.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const below = vh - r.bottom - 8;
            const above = r.top - 8;
            const placement = below < Math.min(maxH, 180) && above > below ? 'top' : 'bottom';
            const space = placement === 'bottom' ? below : above;
            const width = Math.max(opts.matchWidth === false ? 0 : r.width, opts.minWidth || 0);
            const left = Math.max(8, Math.min(r.left, vw - width - 8));
            setPos({
                top: placement === 'bottom' ? r.bottom + 4 : r.top - 4,
                left,
                width,
                maxHeight: Math.max(120, Math.min(maxH, space)),
                placement,
            });
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener('scroll', schedule, true);
        window.addEventListener('resize', schedule);
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
        if (ro && anchor.current) ro.observe(anchor.current);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule, true);
            window.removeEventListener('resize', schedule);
            if (ro) ro.disconnect();
        };
    }, [open, anchor, maxH, opts.matchWidth, opts.minWidth]);
    return pos;
}

export type PopupProps = {
    anchor: { current: HTMLElement | null };
    open: boolean;
    onDismiss?: () => void;
    children?: any;
    className?: string;
    maxHeight?: number;
    matchWidth?: boolean;
    minWidth?: number;
    id?: string;
    role?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-multiselectable'?: boolean;
    'aria-modal'?: boolean;
    /** Elements (besides the anchor) whose clicks don't dismiss. */
    insideRefs?: { current: HTMLElement | null }[];
};

export function Popup(props: PopupProps) {
    const { anchor, open, onDismiss, children, className, id, role } = props;
    const ref = useRef<HTMLDivElement | null>(null);
    const pos = usePopupPosition(anchor, open, {
        maxHeight: props.maxHeight,
        matchWidth: props.matchWidth,
        minWidth: props.minWidth,
    });

    // Top layer: show/hide with the Popover API when available.
    useLayoutEffect(() => {
        const el = ref.current as any;
        if (!el || typeof el.showPopover !== 'function') return;
        try {
            if (open && pos && !el.matches(':popover-open')) el.showPopover();
            if (!open && el.matches(':popover-open')) el.hidePopover();
        } catch (e) {
            /* not connected yet */
        }
    }, [open, pos]);

    // Dismiss on outside pointer down (composedPath works across the shadow boundary).
    const dismissRef = useRef(onDismiss);
    dismissRef.current = onDismiss;
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e: Event) => {
            const path = (e.composedPath && e.composedPath()) || [];
            const inside = [ref.current, anchor.current]
                .concat((props.insideRefs || []).map((r) => r.current))
                .some((n) => n && path.indexOf(n) >= 0);
            if (!inside && dismissRef.current) dismissRef.current();
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [open, anchor, props.insideRefs]);

    if (!open) return null;
    // Explicit longhands (the UA popover style sets inset: 0 and margin: auto).
    const style: any = pos
        ? {
              position: 'fixed',
              margin: 0,
              right: 'auto',
              top: pos.placement === 'bottom' ? pos.top : 'auto',
              bottom: pos.placement === 'top' ? window.innerHeight - pos.top : 'auto',
              left: pos.left,
              width: pos.width || undefined,
              maxHeight: pos.maxHeight,
          }
        : { position: 'fixed', visibility: 'hidden', margin: 0 };
    return (
        <div
            ref={ref}
            popover="manual"
            id={id}
            role={role}
            aria-label={props['aria-label']}
            aria-labelledby={props['aria-labelledby']}
            aria-multiselectable={props['aria-multiselectable']}
            aria-modal={props['aria-modal']}
            data-placement={pos ? pos.placement : undefined}
            className={cx(popupClass, 'z-50 overflow-auto overscroll-contain', className)}
            style={style}
        >
            {children}
        </div>
    );
}
