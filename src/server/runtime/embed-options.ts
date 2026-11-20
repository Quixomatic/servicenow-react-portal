import { str } from '../lib/gr.ts';
import { isPlainObject, parseJson } from '../lib/util.ts';
import { verifyEmbed } from './embed-token.ts';

/**
 * Effective options of an embedded widget (§5.2 of .plans/embedded-widgets.md).
 *
 * Defaults and schema come from the CHILD's build (options_snapshot, written at compile time), so
 * a schema change applies without touching the parent. Client-supplied options are untrusted:
 *
 *   effective = { ...defaults, ...filtered(clientOptions) }
 *
 * - With a schema (`properties`): known keys only, type-checked (string, number/integer with
 *   minimum/maximum, boolean, enum, array, object). An invalid value falls back to the default
 *   and is reported in `dropped`. A property annotated `"x-embed": "server"` can't be set by the
 *   client at all.
 * - Without a schema: any JSON value is accepted (scripts treat them like `input`).
 * - Options with a valid token (signed by $sp.getWidget for this chain and user) are used as is.
 */

/** Maximum embed levels below a placement (host and server enforce it independently). */
export const MAX_EMBED_DEPTH = 4;
/** Maximum size of an embed's options as JSON. */
export const MAX_EMBED_OPTIONS_BYTES = 16 * 1024;

export interface OptionsSnapshot {
    schema: Record<string, unknown> | null;
    defaults: Record<string, unknown>;
}

export function optionsSnapshotOf(build: any): OptionsSnapshot {
    const snap = parseJson<Record<string, unknown>>(str(build, 'options_snapshot'), {});
    const schema = isPlainObject(snap) && isPlainObject(snap.schema) ? (snap.schema as Record<string, unknown>) : null;
    const defaults =
        isPlainObject(snap) && isPlainObject(snap.defaults) ? (snap.defaults as Record<string, unknown>) : {};
    return { schema, defaults };
}

function typeOk(def: Record<string, unknown>, value: unknown): boolean {
    if (Array.isArray(def.enum)) {
        let found = false;
        for (const e of def.enum as unknown[]) if (e === value) found = true;
        if (!found) return false;
    }
    const t = def.type;
    const types: unknown[] = Array.isArray(t) ? t : t === undefined ? [] : [t];
    if (!types.length) return true;
    for (const type of types) {
        if (type === 'string' && typeof value === 'string') {
            if (typeof def.maxLength === 'number' && value.length > def.maxLength) continue;
            return true;
        }
        if ((type === 'number' || type === 'integer') && typeof value === 'number' && isFinite(value)) {
            if (type === 'integer' && Math.floor(value) !== value) continue;
            if (typeof def.minimum === 'number' && value < def.minimum) continue;
            if (typeof def.maximum === 'number' && value > def.maximum) continue;
            return true;
        }
        if (type === 'boolean' && typeof value === 'boolean') return true;
        if (type === 'array' && Array.isArray(value)) return true;
        if (type === 'object' && isPlainObject(value)) return true;
        if (type === 'null' && value === null) return true;
    }
    return false;
}

/** Client options filtered against a schema: { options (kept), dropped (key names) }. */
export function filterClientOptions(
    schema: Record<string, unknown> | null,
    requested: Record<string, unknown>
): { options: Record<string, unknown>; dropped: string[] } {
    const out: Record<string, unknown> = {};
    const dropped: string[] = [];
    const props = schema && isPlainObject(schema.properties) ? (schema.properties as Record<string, unknown>) : null;
    for (const key of Object.keys(requested || {})) {
        const value = requested[key];
        if (value === undefined) continue;
        if (!props) {
            out[key] = value;
            continue;
        }
        const def = props[key];
        if (!isPlainObject(def) || def['x-embed'] === 'server' || !typeOk(def, value)) {
            dropped.push(key);
            continue;
        }
        out[key] = value;
    }
    return { options: out, dropped };
}

export interface EffectiveEmbedOptions {
    options: Record<string, unknown>;
    /** Client keys that were ignored (unknown, wrong type, or x-embed: server). */
    dropped: string[];
    /** True when a valid token vouched for the options (used as they are). */
    trusted: boolean;
}

/**
 * Effective options for a client-originated embed request (initialize descriptors, execute with
 * `embed`). `requested` must already be a plain object within the size limit.
 */
export function effectiveEmbedOptions(
    build: any,
    requested: Record<string, unknown>,
    token: unknown,
    root: string,
    path: string[]
): EffectiveEmbedOptions {
    const { schema, defaults } = optionsSnapshotOf(build);
    if (token && verifyEmbed(token, root, path, requested))
        return { options: { ...requested }, dropped: [], trusted: true };
    const filtered = filterClientOptions(schema, requested);
    return { options: { ...defaults, ...filtered.options }, dropped: filtered.dropped, trusted: false };
}

/** Options a parent's server script chose ($sp.getWidget): trusted, so defaults ← options, unfiltered. */
export function serverEmbedOptions(build: any, options: Record<string, unknown>): Record<string, unknown> {
    const { defaults } = optionsSnapshotOf(build);
    return { ...defaults, ...(isPlainObject(options) ? options : {}) };
}
