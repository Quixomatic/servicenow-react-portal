import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@portal/runtime';
import { useQuery, useQueryClient } from 'utilities:react-query';
import { fetchUserPreferenceValue, saveUserPreferenceValue } from 'utilities:app/list-data';

/**
 * Per-user form preferences, in OUR namespace only (never a platform preference the classic UI or
 * Workspace reads, e.g. not tabbed.forms / workspace.layout.section.<table>):
 *
 *   x_312987_portal.form.<table>.collapsed   comma list of collapsed section names
 *   x_312987_portal.form.presentation        'stacked' | 'tabs' (the user's toggle)
 *
 * Same read / save path as list personalization (utilities:app/list-data). A localStorage mirror
 * gives the first paint the last known value; the server copy wins until the user changes it here.
 */

export const formPreferenceName = {
    collapsed: (table: string) => `x_312987_portal.form.${String(table).replace(/[^A-Za-z0-9_]/g, '_')}.collapsed`,
    presentation: () => 'x_312987_portal.form.presentation',
    /** The form view the user last chose for a table (used when the URL names none). Never <table>.view. */
    view: (table: string) => `x_312987_portal.form.${String(table).replace(/[^A-Za-z0-9_]/g, '_')}.view`,
};

/** Writes per preference name run one after another (the last value always lands last). */
const writeChains = new Map<string, Promise<void>>();
function writeInOrder(name: string, value: string): Promise<void> {
    const prev = writeChains.get(name) || Promise.resolve();
    const next = prev
        .catch(() => undefined)
        .then(() => saveUserPreferenceValue(name, value))
        .catch(() => {
            /* the local copy still applies */
        });
    writeChains.set(name, next);
    return next;
}

export function useOwnPreference(
    name: string | undefined,
    options: { enabled?: boolean } = {}
): [string | null, (value: string) => void, boolean] {
    const user = useUser() as { sysId?: string };
    const userId = (user && user.sysId) || '';
    const enabled = !!name && options.enabled !== false;
    const qc = useQueryClient();
    const queryKey = ['rp-form-pref', userId, name || ''];
    const storageKey = name && userId ? `rp-pref:${userId}:${name}` : '';
    const readLocal = (key: string) => {
        if (!enabled || !key || typeof localStorage === 'undefined') return null;
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    };
    const [value, setValueState] = useState<string | null>(() => readLocal(storageKey));
    // Each preference is its own record and its own query: one write never touches another.
    const touched = useRef(false);
    // The user id can arrive after the first render: pick up the local mirror then.
    useEffect(() => {
        if (!touched.current && storageKey) {
            const local = readLocal(storageKey);
            if (local !== null) setValueState(local);
        }
    }, [storageKey]);
    const remote = useQuery({
        queryKey,
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchUserPreferenceValue(userId, name as string, signal),
        enabled: enabled && !!userId,
        staleTime: 10 * 60_000,
        retry: false,
    });
    // The stored value wins over defaults and over the local mirror (until the user changes it here).
    useEffect(() => {
        if (remote.data === undefined || remote.data === null || touched.current) return;
        setValueState(remote.data);
        try {
            if (storageKey) localStorage.setItem(storageKey, remote.data);
        } catch (e) {
            /* storage blocked */
        }
    }, [remote.data, storageKey]);
    const setValue = useCallback(
        (next: string) => {
            if (!enabled || !name) return;
            touched.current = true;
            setValueState(next);
            // Reads after a write see it: the query cache (other mounts, remounts) and the local mirror.
            qc.setQueryData(['rp-form-pref', userId, name], next);
            try {
                if (storageKey) localStorage.setItem(storageKey, next);
            } catch (e) {
                /* ignore */
            }
            // Saved right away (no debounce: a reload right after a click keeps it), in order per name.
            writeInOrder(name, next);
        },
        [enabled, name, storageKey, userId, qc]
    );
    // ready: the stored value is known (fetched, failed, or nothing to fetch).
    const ready = !enabled || (!!userId && (remote.isFetched || remote.isError)) || touched.current;
    return [value, setValue, ready];
}

/** Collapsed sections of a table's form (by section name). */
export function useCollapsedSections(table: string | undefined, options: { enabled?: boolean } = {}) {
    const [raw, setRaw] = useOwnPreference(table ? formPreferenceName.collapsed(table) : undefined, options);
    const list = (raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const set = new Set(list);
    const toggle = useCallback(
        (name: string, collapsed: boolean) => {
            const next = new Set(
                (raw || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
            );
            if (collapsed) next.add(name);
            else next.delete(name);
            setRaw(Array.from(next).sort().join(','));
        },
        [raw, setRaw]
    );
    return { collapsed: set, isCollapsed: (name: string) => set.has(name), setCollapsed: toggle };
}

/**
 * The form view a user last chose for a table (x_312987_portal.form.<table>.view, never <table>.view):
 * [view, setView, ready]. Use it when the URL / options name no view; wait for `ready` so the form
 * loads once, in the right view.
 */
export function useRememberedView(table: string | undefined): [string, (view: string) => void, boolean] {
    const [raw, setRaw, ready] = useOwnPreference(table ? formPreferenceName.view(table) : undefined);
    return [raw || '', setRaw, ready];
}

export type FormPresentation = 'stacked' | 'tabs';

/** The user's presentation choice (toggle on the form); null = none yet (the page option applies). */
export function usePresentationPreference(
    options: { enabled?: boolean } = {}
): [FormPresentation | null, (p: FormPresentation) => void] {
    const [raw, setRaw] = useOwnPreference(formPreferenceName.presentation(), options);
    const value = raw === 'tabs' || raw === 'stacked' ? raw : null;
    return [value, setRaw as (p: FormPresentation) => void];
}
