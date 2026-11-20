import { transform } from '../compiler/vendor/sucrase.js';
import { str } from '../lib/gr.ts';
import { isBareExpression } from '../runtime/menu-service.ts';
import { abort } from './guards.ts';

/**
 * Syntax check for menu item scripts (condition, badge_script, script), so a malformed script is
 * rejected on save instead of failing (and logging a trailing SyntaxError) when menus resolve.
 *
 * Runs from its own business rule, filtered to changes of those fields, so the vendored Sucrase
 * parser loads only then. Sucrase parses with Babel's grammar but is lenient in a few places (for
 * example `return (throw x)` passes), so this catches typos and unbalanced code, not every error.
 */

const FIELDS: { field: string; label: string }[] = [
    { field: 'condition', label: 'Condition' },
    { field: 'badge_script', label: 'Badge script' },
    { field: 'script', label: 'Script' },
];

/** null when the script parses, else "message (line L, column C)" relative to the author's code. */
export function scriptSyntaxError(source: string, allowExpression: boolean): string | null {
    const src = String(source || '');
    if (!src.trim()) return null;
    // The author's code starts on line 2 of the wrapper (a function body, as at runtime).
    const code =
        allowExpression && isBareExpression(src)
            ? `(function () {\nreturn (${src.trim().replace(/;$/, '')}\n)\n})`
            : `(function () {\n${src}\n})`;
    try {
        transform(code, { transforms: [] });
        return null;
    } catch (e) {
        const message = String((e && (e as { message?: string }).message) || e);
        const m = message.match(/\((\d+):(\d+)\)\s*$/);
        if (!m) return message;
        const line = Math.max(1, parseInt(m[1], 10) - 1);
        return `${message.replace(/\s*\(\d+:\d+\)\s*$/, '')} (line ${line}, column ${parseInt(m[2], 10) + 1})`;
    }
}

/** before insert/update on menu item, when condition / badge_script / script changed. */
export function checkMenuItemScripts(current: any, previous: any): void {
    for (const f of FIELDS) {
        if (!current.isNewRecord() && !current.getElement(f.field).changes()) continue;
        const problem = scriptSyntaxError(str(current, f.field), f.field === 'condition');
        if (problem) return abort(current, `${f.label} has a syntax error: ${problem}`);
    }
}
