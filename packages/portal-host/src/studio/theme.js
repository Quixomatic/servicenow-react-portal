// Studio uses the host's light/dark/system store (registry internals), not its own: the deployed
// Studio chunk has separate copies of the runtime modules, and one preference must drive both the
// portal and Studio. The local import is only a fallback.
import { useSyncExternalStore } from 'react';
import { themeStore as localStore } from '#/runtime/theme-mode';

const NEXT = { light: 'dark', dark: 'system', system: 'light' };

export function hostThemeStore() {
    const registry = globalThis.__REACT_PORTAL__;
    return (registry && registry.internals && registry.internals.themeStore) || localStore;
}

/** { theme, resolvedTheme, systemTheme, setTheme, cycle } */
export function useStudioTheme() {
    const store = hostThemeStore();
    const snap = useSyncExternalStore(store.subscribe, store.get, store.get);
    return { ...snap, setTheme: store.setTheme, cycle: () => store.setTheme(NEXT[snap.theme] || 'system') };
}
