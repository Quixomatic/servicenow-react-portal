// The boot gate: one full-size loading skeleton covers a portal from the host's first paint until
// its layout has rendered (spec: loading states). PortalApp provides the gate and draws the
// skeleton; the stages in between (bootstrap, router load, theme) render nothing while a gate is
// present, and the first real UI (the layout, or an error view) opens it with useBootReady().
// Without a gate (embedded previews), the stages keep their own small placeholders.
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

/** { ready() } while a host skeleton covers this tree; null otherwise. */
export const BootGateContext = createContext(null);

/** True when an outer skeleton covers loading, so intermediate placeholders should render nothing. */
export function useBootGated() {
    return !!useContext(BootGateContext);
}

/** Opens the gate once `ready` is true: before paint, so the real UI and the fade share a frame. */
export function useBootReady(ready) {
    const gate = useContext(BootGateContext);
    useLayoutEffect(() => {
        if (ready && gate) gate.ready();
    }, [ready, gate]);
}

/** Skeleton fade-out (≤150 ms). Under prefers-reduced-motion it disappears at once. */
export const FADE_MS = 150;

function reducedMotion() {
    try {
        return (
            typeof window !== 'undefined' &&
            !!window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
    } catch (e) {
        return false;
    }
}

/**
 * Keeps a skeleton mounted for a short fade after `visible` turns false.
 * → 'shown' | 'fading' | 'gone'
 */
export function useFadeOut(visible) {
    const [phase, setPhase] = useState(visible ? 'shown' : 'gone');
    useLayoutEffect(() => {
        if (visible) setPhase('shown');
        else setPhase((prev) => (prev === 'gone' || reducedMotion() ? 'gone' : 'fading'));
    }, [visible]);
    useEffect(() => {
        if (phase !== 'fading') return undefined;
        const timer = setTimeout(() => setPhase('gone'), FADE_MS + 30);
        return () => clearTimeout(timer);
    }, [phase]);
    return phase;
}
