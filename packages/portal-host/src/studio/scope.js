// Studio scope awareness: GET /rp_studio/context → { app, currentApp, inScope, updateSet }.
// New records take the session's current application, so Studio edits only while the
// platform's application picker is on React Portal (the server also rejects writes with 409
// wrong_scope). Out of scope, every activity shows a banner with "Switch to React Portal" and
// editing is disabled; the status bar shows the current app and update set.
//
// Switching uses the platform picker's own API (what the Next Experience shell sends):
//   PUT /api/now/ui/concoursepicker/application  { app_id: <sys_app sys_id> }   then reload.
//
// Dev-only simulation (never switches anything): localStorage['rp-studio-scope'] = 'out'
// (or ?rpscope=out on the page URL) pretends the current app is Global.
import { useSyncExternalStore } from 'react';
import { STUDIO_API_BASE, isMock, requestAt } from '#/runtime/api';

const PICKER_URL = '/api/now/ui/concoursepicker/application';

function simulated() {
    try {
        const fromUrl = new URLSearchParams(window.location.search).get('rpscope');
        if (fromUrl) return fromUrl === 'out';
        return window.localStorage.getItem('rp-studio-scope') === 'out';
    } catch (error) {
        return false;
    }
}

let state = { context: null, loading: false, error: null, switching: false, simulated: false };
const listeners = new Set();
const set = (partial) => {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
};

function applySimulation(context) {
    if (!context || !simulated()) return context;
    return {
        ...context,
        currentApp: { id: 'global', scope: 'global', name: 'Global' },
        inScope: false,
        updateSet: { id: '', name: 'Default [Global]' },
    };
}

/** Fetch (or re-fetch) the context. Mock data: always in scope. */
export async function loadScope() {
    if (isMock()) {
        const app = { id: 'mock', scope: 'x_312987_portal', name: 'React Portal' };
        set({
            context: applySimulation({
                app,
                currentApp: app,
                inScope: true,
                updateSet: { id: 'mock', name: 'Default' },
            }),
            simulated: simulated(),
        });
        return state.context;
    }
    set({ loading: true });
    try {
        const context = await requestAt(STUDIO_API_BASE, 'GET', '/context');
        set({ context: applySimulation(context), loading: false, error: null, simulated: simulated() });
    } catch (error) {
        set({ loading: false, error });
    }
    return state.context;
}

/** A write came back 409 wrong_scope: the picker changed elsewhere. */
export function markOutOfScope(error) {
    const details = (error && error.details) || {};
    const ctx = state.context || {};
    set({
        context: {
            ...ctx,
            app: details.app || ctx.app,
            currentApp: details.currentApp || ctx.currentApp,
            inScope: false,
        },
    });
    loadScope();
}

export function isWrongScope(error) {
    return (
        !!error &&
        (error.code === 'wrong_scope' || (error.status === 409 && /switch to/i.test(String(error.message || ''))))
    );
}

/** True when Studio must not write (known to be out of scope). */
export function readOnly() {
    return !!(state.context && state.context.inScope === false);
}

/** Switch the session's current application to React Portal, then reload the page. */
export async function switchToReactPortal() {
    const ctx = state.context;
    if (!ctx || !ctx.app || !ctx.app.id) return false;
    if (state.simulated) {
        // Simulation: drop it instead of touching the real picker.
        try {
            window.localStorage.removeItem('rp-studio-scope');
        } catch (error) {
            /* ignore */
        }
        set({ simulated: false, context: { ...ctx, currentApp: ctx.app, inScope: true } });
        return true;
    }
    set({ switching: true });
    try {
        const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
        if (window.g_ck) headers['X-UserToken'] = window.g_ck;
        const response = await fetch(PICKER_URL, {
            method: 'PUT',
            credentials: 'same-origin',
            headers,
            body: JSON.stringify({ app_id: ctx.app.id }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        window.location.reload();
        return true;
    } catch (error) {
        set({ switching: false, error });
        throw error;
    }
}

export const scopeStore = {
    get: () => state,
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

export function useScope() {
    return useSyncExternalStore(scopeStore.subscribe, scopeStore.get, scopeStore.get);
}
