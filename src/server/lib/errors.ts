/**
 * Typed errors. The platform disallows subclassing Error, so errors are plain objects
 * tagged with `rpError: true`, thrown and recognized with isRPError().
 */
export interface RPError {
    rpError: true;
    status: number;
    code: string;
    message: string;
    details?: unknown;
}

export function rpError(status: number, code: string, message: string, details?: unknown): RPError {
    return { rpError: true, status, code, message, details };
}

export function isRPError(e: unknown): e is RPError {
    return !!e && typeof e === 'object' && (e as RPError).rpError === true;
}

export const badRequest = (message: string, details?: unknown) => rpError(400, 'bad_request', message, details);
export const forbidden = (message = 'Access denied') => rpError(403, 'forbidden', message);
export const notFound = (message = 'Not found') => rpError(404, 'not_found', message);
export const conflict = (message: string, details?: unknown) => rpError(409, 'conflict', message, details);

/** Reduce any thrown value to a message safe to show consumers (no stack, no source). */
export function sanitizeError(e: unknown): string {
    if (isRPError(e)) return e.message;
    let msg = '';
    if (e && typeof e === 'object' && 'message' in (e as object)) msg = String((e as { message: unknown }).message);
    else msg = String(e);
    // Trim script locations and keep it short.
    msg = msg.replace(/\s*\(sys_[a-z_]+\.[0-9a-f]{32}[^)]*\)/g, '').replace(/\s+/g, ' ');
    return msg.length > 500 ? msg.substring(0, 500) + '…' : msg;
}
