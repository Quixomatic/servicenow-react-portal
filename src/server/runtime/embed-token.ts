import { gs, GlideDigest, GlideRecord, GlideSecureRandomUtil } from '@servicenow/glide';
import { canonicalJson } from '../lib/util.ts';

/**
 * Signed embed options (embedded widgets, §5.3 of .plans/embedded-widgets.md).
 *
 * $sp.getWidget() runs a child widget with options chosen by the parent's (trusted) server script
 * and returns a token bound to (root placement, embed path, options, user, expiry). Later calls
 * from that embed send the options back with the token; a valid, unexpired token means the
 * options are used as they are (x-embed: server properties included). Anything else falls back
 * to schema filtering; nothing errors, so a stale tab degrades gracefully.
 *
 * Construction (scoped code has no HMAC primitive: GlideCertificateEncryption is blocked in
 * scope, verified on dev189813). HMAC-style nesting with GlideDigest.getSHA256Hex:
 *
 *   inner = sha256('i:' + secret + '\n' + payload)
 *   sig   = sha256('o:' + secret + '\n' + inner)
 *   token = 'v2.' + exp + '.' + sig             exp = expiry, epoch seconds
 *   payload = 'rp-embed/2|' + root + '|' + path.join('>') + '|' + canonicalJson(options) + '|' + userId + '|' + exp
 *
 * The outer hash over a fixed-length inner digest rules out length extension. Verification
 * compares every character (constant time).
 *
 * The secret is the system property x_312987_portal.embed_secret, created on first use from
 * GlideSecureRandomUtil (64 chars), type password2, admin-only read/write roles, is_private (not
 * carried by update sets). It's deliberately not declared in Fluent: an install would reset it.
 * The runtime properties endpoint refuses it by name. Change or clear it to invalidate every token.
 */

export const EMBED_SECRET_PROPERTY = 'x_312987_portal.embed_secret';
/** Token lifetime. Expired tokens degrade to filtered client options. */
export const EMBED_TOKEN_TTL_SECONDS = 12 * 60 * 60;

function readSecret(): string {
    try {
        return String(gs.getProperty(EMBED_SECRET_PROPERTY, '') || '');
    } catch (e) {
        return '';
    }
}

function randomSecret(): string {
    try {
        const r: any = GlideSecureRandomUtil;
        const v = String(r.getSecureRandomString(64) || '');
        if (v.length >= 48) return v;
    } catch (e) {
        /* fall back below */
    }
    return [gs.generateGUID(), gs.generateGUID(), gs.generateGUID(), gs.generateGUID()].join('');
}

function createSecret(): string {
    try {
        const value = randomSecret();
        const g: any = gs;
        // Scoped gs.setProperty creates the property in this scope when it's missing.
        try {
            g.setProperty(
                EMBED_SECRET_PROPERTY,
                value,
                'React Portal: secret that signs embedded-widget options ($sp.getWidget). Generated on first use; clear it to rotate (invalidates every token).'
            );
        } catch (e) {
            gs.warn('[React Portal] embed secret: setProperty failed: ' + e);
        }
        const gr: any = new GlideRecord('sys_properties');
        gr.addQuery('name', EMBED_SECRET_PROPERTY);
        gr.setLimit(1);
        gr.query();
        const isNew = !gr.next();
        if (isNew) {
            gr.initialize();
            gr.setValue('name', EMBED_SECRET_PROPERTY);
        }
        // Harden the record (setProperty creates a plain string property), then set the value
        // after the type so password2 stores it encrypted.
        gr.setValue('type', 'password2');
        gr.setValue(
            'description',
            'React Portal: secret that signs embedded-widget options ($sp.getWidget). Generated on first use; clear it to rotate (invalidates every token).'
        );
        gr.setValue('read_roles', 'admin');
        gr.setValue('write_roles', 'admin');
        gr.setValue('is_private', true);
        gr.setValue('value', value);
        const ok = isNew ? gr.insert() : gr.update();
        if (!ok)
            gs.warn(
                '[React Portal] embed secret: could not write ' +
                    EMBED_SECRET_PROPERTY +
                    ' (' +
                    (isNew ? 'insert' : 'update') +
                    ' refused)'
            );
        return readSecret();
    } catch (e) {
        gs.warn('[React Portal] embed secret: ' + e);
        return '';
    }
}

/**
 * The signing secret, created on first use; '' when it can't be read or created (signing is then
 * off). Not memoized in module state (it can outlive a transaction and miss a rotation); the
 * platform caches properties anyway.
 */
export function embedSecret(): string {
    const s = readSecret();
    return s || createSecret();
}

/** The fixed-format payload a token signs. */
export function tokenPayload(
    root: string,
    path: string[],
    options: Record<string, unknown>,
    userId: string,
    exp: number
): string {
    return ['rp-embed/2', root, path.join('>'), canonicalJson(options || {}), userId, String(exp)].join('|');
}

function sha256(text: string): string {
    const d: any = new GlideDigest();
    return String(d.getSHA256Hex(text)).toLowerCase();
}

function sign(secret: string, payload: string): string {
    const inner = sha256('i:' + secret + '\n' + payload);
    return sha256('o:' + secret + '\n' + inner);
}

function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

/** Token for options the server chose, bound to the chain, the current user and an expiry; null when signing is unavailable. */
export function signEmbed(root: string, path: string[], options: Record<string, unknown>): string | null {
    const secret = embedSecret();
    if (!secret) return null;
    try {
        const exp = nowSeconds() + EMBED_TOKEN_TTL_SECONDS;
        return 'v2.' + exp + '.' + sign(secret, tokenPayload(root, path, options, gs.getUserID(), exp));
    } catch (e) {
        return null;
    }
}

function constantTimeEqual(a: string, b: string): boolean {
    let diff = a.length ^ b.length;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return diff === 0;
}

/** True when `token` is unexpired and signs exactly these options for this chain and the current user. */
export function verifyEmbed(token: unknown, root: string, path: string[], options: Record<string, unknown>): boolean {
    if (typeof token !== 'string' || token.length > 120) return false;
    const m = /^v2\.(\d{9,12})\.([0-9a-f]{64})$/.exec(token);
    if (!m) return false;
    const exp = parseInt(m[1], 10);
    if (!(exp > nowSeconds())) return false;
    const secret = embedSecret();
    if (!secret) return false;
    try {
        return constantTimeEqual(sign(secret, tokenPayload(root, path, options, gs.getUserID(), exp)), m[2]);
    } catch (e) {
        return false;
    }
}
