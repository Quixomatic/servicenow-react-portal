// Light / dark / system mode: the next-themes API, adapted to shadow DOM. next-themes toggles
// <html class> and injects into <head>, which never reaches our shadow root; here the host
// element itself gets the `dark` class (the renderer mirrors host classes onto the overlay layer,
// so dialogs, menus and popovers follow), and theme tokens key off :host(.dark).
//
// One module-level store per page: every host instance (and Studio, through the registry) shares
// the preference. It is read synchronously at module load, so the first render already knows
// the resolved mode (no flash).
import { useSyncExternalStore } from 'react';

export const THEMES = ['light', 'dark', 'system'];
const STORAGE_KEY = 'rp-theme';

const hasWindow = typeof window !== 'undefined';
const media = hasWindow && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readStored() {
    try {
        const value = hasWindow && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
        return THEMES.includes(value) ? value : 'system';
    } catch (error) {
        return 'system';
    }
}

const systemOf = () => (media && media.matches ? 'dark' : 'light');

function snapshotOf(theme, systemTheme) {
    return { theme, systemTheme, resolvedTheme: theme === 'system' ? systemTheme : theme };
}

let snapshot = snapshotOf(readStored(), systemOf());
const listeners = new Set();

function update(theme, systemTheme) {
    if (theme === snapshot.theme && systemTheme === snapshot.systemTheme) return;
    snapshot = snapshotOf(theme, systemTheme);
    listeners.forEach((l) => l());
}

export function setTheme(value) {
    const next = typeof value === 'function' ? value(snapshot.theme) : value;
    if (!THEMES.includes(next)) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
        /* private mode / quota: the choice still applies for this page */
    }
    update(next, snapshot.systemTheme);
}

if (hasWindow) {
    // Follow the OS live.
    const onMedia = () => update(snapshot.theme, systemOf());
    if (media && media.addEventListener) media.addEventListener('change', onMedia);
    else if (media && media.addListener) media.addListener(onMedia);
    // Other tabs changed the preference.
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY)
            update(THEMES.includes(event.newValue) ? event.newValue : 'system', snapshot.systemTheme);
    });
}

/** Plain store (get / subscribe / setTheme): shared with Portal Studio through the registry. */
export const themeStore = {
    get: () => snapshot,
    subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    setTheme,
    themes: THEMES,
};

/**
 * useTheme() → { theme, setTheme, resolvedTheme, systemTheme, themes } (next-themes API).
 * `store` lets another React copy (the Studio chunk) bind to the host's store.
 */
export function useTheme(store) {
    const s = store || themeStore;
    const snap = useSyncExternalStore(s.subscribe, s.get, s.get);
    return {
        theme: snap.theme,
        resolvedTheme: snap.resolvedTheme,
        systemTheme: snap.systemTheme,
        setTheme: s.setTheme,
        themes: THEMES,
    };
}
