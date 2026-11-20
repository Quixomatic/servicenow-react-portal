/** CSS input safety helpers (no compiler import: cheap to load from business rules). */

export const UNSAFE_CSS = /[;{}<>\\]|\/\*|@import|expression\s*\(|javascript:/i;

const CLASS_TOKEN = /^[\w\-:/.\[\]#%!&@*+,()'"~^$|=?]+$/;

/** Split and validate an instance's class list (invalid tokens are dropped). */
export function classTokens(classes: string): string[] {
    return String(classes || '')
        .split(/\s+/)
        .filter((t) => t && t.length <= 160 && CLASS_TOKEN.test(t) && !UNSAFE_CSS.test(t))
        .slice(0, 200);
}
