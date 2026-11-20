import { gs } from '@servicenow/glide';
import { global } from '@servicenow/glide/global';
import type { ServerMessage } from '../../shared/contracts';

/**
 * Bridge to global.ReactPortalGlobal (the separate global app in packages/global-helpers), which
 * wraps the session APIs ServiceNow blocks in scoped code: gs.flushMessages(),
 * gs.getImpersonatingUserName(), GlideSession.clearClientData(), and friends.
 *
 * The helper app is a separate install, so every call feature-detects: `helper()` returns null
 * when the class is missing or can't be constructed, and each wrapper then returns null / false so
 * callers keep their scoped fallback.
 */

/** The last reason the helper was unavailable or failed (diagnostics only). */
export let lastHelperError = '';

/**
 * A helper instance, or null when global.ReactPortalGlobal isn't reachable from this scope. Not
 * cached across calls: module state can outlive a transaction, and the helper must act on the
 * current session.
 */
export function helper(): any {
    try {
        const ns: any = global;
        const Ctor = ns && ns.ReactPortalGlobal;
        if (typeof Ctor !== 'function') {
            lastHelperError = 'ReactPortalGlobal: ' + typeof Ctor;
            return null;
        }
        const h = new Ctor();
        return h && typeof h.version === 'function' ? h : null;
    } catch (e) {
        lastHelperError = 'construct: ' + String(e);
        return null;
    }
}

/** True when the global helper app is installed and callable. */
export function hasGlobalHelper(): boolean {
    return helper() !== null;
}

function strings(v: any): string[] {
    if (!v) return [];
    if (typeof v.size === 'function') return Array.from({ length: v.size() }, (_, i) => String(v.get(i)));
    const n = typeof v.length === 'number' ? v.length : 0;
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(String(v[i]));
    return out;
}

/** The session's queued messages read from THIS scope (scoped gs sees the whole queue). */
function scopedQueue(): ServerMessage[] {
    const g: any = gs;
    const out: ServerMessage[] = [];
    const read = (type: ServerMessage['type'], fn: string) => {
        try {
            if (typeof g[fn] === 'function') strings(g[fn]()).forEach((m) => out.push({ type, message: m }));
        } catch (e) {
            /* not available on this release */
        }
    };
    read('info', 'getInfoMessages');
    read('error', 'getErrorMessages');
    read('warning', 'getWarningMessages');
    return out;
}

/**
 * Read AND flush every message queued on the session (info, error, warning), as ServerMessages.
 * Returns null when the helper is unavailable (the caller should fall back to reading without
 * flushing).
 *
 * Inside a scripted REST transaction, global gs.getInfoMessages() comes back empty while the
 * scoped one sees the queue (verified on dev189813, Brazil), but the helper's flush works. So the
 * queue is read here first, then the helper drains (flushes); anything only the helper saw is
 * appended.
 */
export function drainSessionMessages(): ServerMessage[] | null {
    const h = helper();
    if (!h) return null;
    const out = scopedQueue();
    try {
        const raw: any = h.drainSessionMessages();
        if (!raw) return out;
        const seen: Record<string, boolean> = {};
        out.forEach((m) => (seen[m.type + '|' + m.message] = true));
        const add = (type: ServerMessage['type'], list: any) =>
            strings(list).forEach((m) => {
                if (!seen[type + '|' + m]) out.push({ type, message: m });
            });
        add('info', raw.info);
        add('error', raw.error);
        add('warning', raw.warning);
        return out;
    } catch (e) {
        lastHelperError = 'drain: ' + String(e);
        return null;
    }
}

/** The impersonator's user name; null when not impersonating; undefined when the helper is unavailable. */
export function impersonatingUserName(): string | null | undefined {
    const h = helper();
    if (!h) return undefined;
    try {
        const name = h.getImpersonatingUserName();
        return name ? String(name) : null;
    } catch (e) {
        return undefined;
    }
}

/** Remove a session client-data key (x_312987_portal.* only). False when the helper is unavailable. */
export function clearClientData(key: string): boolean {
    const h = helper();
    if (!h) return false;
    try {
        return String(h.clearClientData(key)) === 'true';
    } catch (e) {
        return false;
    }
}
