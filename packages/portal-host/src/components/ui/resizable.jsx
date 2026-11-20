import * as React from 'react';
import { GripVerticalIcon, GripHorizontalIcon } from 'lucide-react';
import { cn } from 'cn';

// components:resizable: resizable panes (Next Experience's now-resizable-panes), shadcn's
// Resizable API without the react-resizable-panels dependency.
//
//   <ResizablePanelGroup direction="horizontal" autoSaveId="kb-split" className="min-h-80 rounded-lg border">
//       <ResizablePanel defaultSize={30} minSize={15}>…</ResizablePanel>
//       <ResizableHandle withHandle />
//       <ResizablePanel defaultSize={70}>…</ResizablePanel>
//   </ResizablePanelGroup>
//
// Sizes are percentages of the group. Each handle is a focusable WAI-ARIA window splitter
// (role="separator", aria-valuenow = the size of the panel before it, aria-valuemin / max,
// aria-controls): Left / Right (Up / Down when vertical) move it by `keyboardStep` (5%, Shift:
// 20%), Home / End go to the limits, Enter collapses the panel before it when it's
// `collapsible` (and restores it). Pointer drag works with mouse, pen and touch.
// autoSaveId keeps the layout in localStorage (`x_312987_portal.resizable.<id>`).
// useResizableLayout gives the same state machine to custom splitters.

const STORAGE_PREFIX = 'x_312987_portal.resizable.';

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function readSaved(id, count) {
    if (!id) return null;
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_PREFIX + id) || 'null');
        return Array.isArray(raw) && raw.length === count && raw.every((n) => typeof n === 'number') ? raw : null;
    } catch (e) {
        return null;
    }
}

/** Fill unspecified sizes evenly from what's left, then normalise to 100. */
function initialSizes(panels) {
    const given = panels.map((p) => (typeof p.defaultSize === 'number' ? p.defaultSize : null));
    const used = given.reduce((a, b) => a + (b || 0), 0);
    const open = given.filter((g) => g === null).length;
    const each = open ? Math.max(0, (100 - used) / open) : 0;
    const sizes = given.map((g) => (g === null ? each : g));
    const total = sizes.reduce((a, b) => a + b, 0) || 1;
    return sizes.map((s) => (s * 100) / total);
}

/**
 * The layout state machine: panels = [{ minSize, maxSize, collapsible, collapsedSize }].
 * Returns { sizes, setSizes, resize(handleIndex, delta), setAt(handleIndex, size), toggle(handleIndex) }.
 * resize moves the boundary after panel `handleIndex` by `delta` percent, respecting both
 * neighbours' limits.
 */
function useResizableLayout(panels, { autoSaveId, onLayout } = {}) {
    const count = panels.length;
    const [sizes, setSizesState] = React.useState(() => readSaved(autoSaveId, count) || initialSizes(panels));
    const restore = React.useRef({});
    const latest = React.useRef(sizes);
    latest.current = sizes;
    React.useEffect(() => {
        if (sizes.length !== count) setSizesState(initialSizes(panels));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count]);
    const setSizes = React.useCallback(
        (next) => {
            setSizesState(next);
            if (autoSaveId) {
                try {
                    localStorage.setItem(
                        STORAGE_PREFIX + autoSaveId,
                        JSON.stringify(next.map((n) => Math.round(n * 100) / 100))
                    );
                } catch (e) {
                    /* storage full or blocked: the layout just isn't remembered */
                }
            }
            if (onLayout) onLayout(next);
        },
        [autoSaveId, onLayout]
    );
    const limits = (i) => {
        const p = panels[i] || {};
        return { min: p.minSize || 0, max: p.maxSize || 100 };
    };
    const setAt = (h, target) => {
        const cur = latest.current.slice();
        const pair = cur[h] + cur[h + 1];
        const a = limits(h);
        const b = limits(h + 1);
        const lo = Math.max(a.min, pair - b.max);
        const hi = Math.min(a.max, pair - b.min);
        const p = panels[h] || {};
        let next = clamp(target, lo, hi);
        if (p.collapsible && target < a.min / 2) next = Math.max(p.collapsedSize || 0, pair - b.max);
        cur[h] = next;
        cur[h + 1] = pair - next;
        setSizes(cur);
    };
    const resize = (h, delta) => setAt(h, latest.current[h] + delta);
    const toggle = (h) => {
        const p = panels[h] || {};
        if (!p.collapsible) return;
        const collapsed = p.collapsedSize || 0;
        if (latest.current[h] <= collapsed + 0.01) setAt(h, restore.current[h] || p.defaultSize || limits(h).min || 20);
        else {
            restore.current[h] = latest.current[h];
            const cur = latest.current.slice();
            const pair = cur[h] + cur[h + 1];
            cur[h] = collapsed;
            cur[h + 1] = pair - collapsed;
            setSizes(cur);
        }
    };
    return { sizes, setSizes, resize, setAt, toggle };
}

const GroupContext = React.createContext(null);

function isType(child, type) {
    return React.isValidElement(child) && child.type === type;
}

/**
 * ResizablePanelGroup props: direction ('horizontal' | 'vertical'), autoSaveId, onLayout(sizes),
 * keyboardStep (5). Children: ResizablePanel and ResizableHandle, alternating.
 */
function ResizablePanelGroup({
    className,
    direction = 'horizontal',
    autoSaveId,
    onLayout,
    keyboardStep = 5,
    children,
    ...props
}) {
    const items = React.Children.toArray(children);
    const panelEls = items.filter((c) => isType(c, ResizablePanel));
    const panels = panelEls.map((el) => el.props);
    const layout = useResizableLayout(panels, { autoSaveId, onLayout });
    const groupRef = React.useRef(null);
    const baseId = React.useId();
    let panelIndex = -1;
    const out = items.map((child) => {
        if (isType(child, ResizablePanel)) {
            panelIndex += 1;
            return React.cloneElement(child, { __index: panelIndex });
        }
        if (isType(child, ResizableHandle)) return React.cloneElement(child, { __index: panelIndex });
        return child;
    });
    const ctx = { direction, layout, panels, groupRef, baseId, keyboardStep };
    return (
        <GroupContext.Provider value={ctx}>
            <div
                ref={groupRef}
                data-slot="resizable-panel-group"
                data-panel-group-direction={direction}
                className={cn(
                    'flex h-full w-full min-w-0',
                    direction === 'vertical' ? 'flex-col' : 'flex-row',
                    className
                )}
                {...props}
            >
                {out}
            </div>
        </GroupContext.Provider>
    );
}

/** ResizablePanel props: defaultSize, minSize, maxSize, collapsible, collapsedSize, id. */
function ResizablePanel({
    className,
    style,
    defaultSize,
    minSize,
    maxSize,
    collapsible,
    collapsedSize,
    id,
    __index,
    children,
    ...props
}) {
    const ctx = React.useContext(GroupContext);
    const size = ctx ? ctx.layout.sizes[__index] : undefined;
    const collapsed = !!collapsible && size !== undefined && size <= (collapsedSize || 0) + 0.01;
    return (
        <div
            id={id || (ctx ? `${ctx.baseId}-panel-${__index}` : undefined)}
            data-slot="resizable-panel"
            data-collapsed={collapsed || undefined}
            style={Object.assign({ flex: `${size === undefined ? 1 : size} 1 0px` }, style || {})}
            className={cn('min-h-0 min-w-0 overflow-auto', collapsed && 'invisible', className)}
            {...props}
        >
            {children}
        </div>
    );
}

/** ResizableHandle props: withHandle (a grip), disabled, aria-label ('Resize'). */
function ResizableHandle({
    className,
    withHandle = false,
    disabled = false,
    __index,
    'aria-label': ariaLabel,
    ...props
}) {
    const ctx = React.useContext(GroupContext);
    const [dragging, setDragging] = React.useState(false);
    if (!ctx) return null;
    const { direction, layout, panels, groupRef, baseId, keyboardStep } = ctx;
    const h = __index;
    const vertical = direction === 'vertical';
    const before = panels[h] || {};
    const value = Math.round(layout.sizes[h] || 0);
    const onPointerDown = (event) => {
        if (disabled || event.button !== 0) return;
        const group = groupRef.current;
        if (!group) return;
        event.preventDefault();
        const rect = group.getBoundingClientRect();
        const total = vertical ? rect.height : rect.width;
        const start = vertical ? event.clientY : event.clientX;
        const startSize = layout.sizes[h];
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        target.focus();
        setDragging(true);
        const move = (e) => {
            const pos = vertical ? e.clientY : e.clientX;
            layout.setAt(h, startSize + ((pos - start) * 100) / (total || 1));
        };
        const up = () => {
            setDragging(false);
            target.removeEventListener('pointermove', move);
            target.removeEventListener('pointerup', up);
            target.removeEventListener('pointercancel', up);
        };
        target.addEventListener('pointermove', move);
        target.addEventListener('pointerup', up);
        target.addEventListener('pointercancel', up);
    };
    const onKeyDown = (event) => {
        if (disabled) return;
        const step = event.shiftKey ? keyboardStep * 4 : keyboardStep;
        const dec = vertical ? 'ArrowUp' : 'ArrowLeft';
        const inc = vertical ? 'ArrowDown' : 'ArrowRight';
        let handled = true;
        if (event.key === dec) layout.resize(h, -step);
        else if (event.key === inc) layout.resize(h, step);
        else if (event.key === 'Home') layout.setAt(h, 0);
        else if (event.key === 'End') layout.setAt(h, 100);
        else if (event.key === 'Enter') layout.toggle(h);
        else handled = false;
        if (handled) event.preventDefault();
    };
    const Grip = vertical ? GripHorizontalIcon : GripVerticalIcon;
    return (
        <div
            role="separator"
            tabIndex={disabled ? -1 : 0}
            aria-orientation={vertical ? 'horizontal' : 'vertical'}
            aria-label={ariaLabel || 'Resize'}
            aria-controls={`${baseId}-panel-${h}`}
            aria-valuenow={value}
            aria-valuemin={Math.round(before.minSize || 0)}
            aria-valuemax={Math.round(before.maxSize || 100)}
            aria-disabled={disabled || undefined}
            data-slot="resizable-handle"
            data-dragging={dragging || undefined}
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            onDoubleClick={() => before.collapsible && layout.toggle(h)}
            className={cn(
                'relative flex shrink-0 touch-none items-center justify-center bg-border outline-none select-none',
                'focus-visible:bg-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-dragging:bg-ring',
                vertical
                    ? 'h-px w-full cursor-row-resize after:absolute after:inset-x-0 after:-top-1 after:-bottom-1'
                    : 'w-px cursor-col-resize after:absolute after:inset-y-0 after:-left-1 after:-right-1',
                disabled && 'cursor-default',
                className
            )}
            {...props}
        >
            {withHandle ? (
                <span
                    aria-hidden="true"
                    className={cn(
                        'z-10 flex items-center justify-center rounded-sm border bg-border text-muted-foreground',
                        vertical ? 'h-3 w-4' : 'h-4 w-3'
                    )}
                >
                    <Grip className="size-2.5" />
                </span>
            ) : null}
        </div>
    );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, useResizableLayout };
