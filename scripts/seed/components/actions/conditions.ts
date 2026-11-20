import type { ActionModel } from './types';

/**
 * Declarative action client-side evaluation, as Workspace's action mediator does it:
 * - `{{field}}` interpolation of labels, tooltips, payloads and conditions against a model
 *   ({ table, view, query, count, sysIds, … }). A string that is exactly one `{{x}}` takes the value
 *   itself (arrays stay arrays); otherwise it's string interpolation. Unknown keys stay as written.
 *   The platform sometimes stores `{​{` (zero-width space) so classic forms don't evaluate it.
 * - model conditions: newQuery groups are OR'ed, inside each the terms are AND'ed, `or` terms
 *   OR'ed onto the previous one.
 * - scripted client condition: an expression over the model's keys (platform-authored config,
 *   evaluated with `new Function` exactly as Workspace does; failures count as true).
 * Roles and server conditions are already applied by the platform.
 */

const INTERPOLATION = /\{​?\{([\s\S]+?)\}\}/g;

function lookup(model: ActionModel, path: string): unknown {
    let cur: any = model;
    for (const k of path.split('.')) {
        if (cur == null) return undefined;
        cur = cur[k];
    }
    return cur;
}

/** Interpolate one string ('Edit ({{count}})' → 'Edit (2)'). */
export function interpolate(value: unknown, model: ActionModel): unknown {
    if (typeof value !== 'string' || !model) return value;
    INTERPOLATION.lastIndex = 0;
    const whole = /^\{​?\{([\s\S]+?)\}\}$/.exec(value);
    const sub = (match: string, field: string) => {
        const key = field.trim();
        const v = lookup(model, key);
        if (v !== undefined && v !== null && typeof v === 'object' && !Array.isArray(v)) return key;
        if (v !== undefined) return v;
        return key.split('.')[0] in model ? '' : match;
    };
    if (whole) return sub(value, whole[1]);
    return value.replace(INTERPOLATION, (m, f) => String(sub(m, f)));
}

/** Interpolate recursively (payload objects, arrays). */
export function interpolateDeep(value: unknown, model: ActionModel): any {
    if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, model));
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        Object.keys(value as object).forEach((k) => (out[k] = interpolateDeep((value as any)[k], model)));
        return out;
    }
    return interpolate(value, model);
}

/** JSON payload text → object ('' → {}; invalid → {}). */
export function parseJson(value: unknown): Record<string, any> {
    if (value && typeof value === 'object') return value as Record<string, any>;
    if (typeof value !== 'string' || !value.trim()) return {};
    try {
        const v = JSON.parse(value);
        return v && typeof v === 'object' ? v : {};
    } catch (e) {
        return {};
    }
}

/**
 * Apply a payload map ([{ name: 'fields@table', value: '{{table}}' }]) onto a payload: `@` separates
 * nested keys, `@0@` indexes arrays.
 */
export function applyPayloadMap(payload: Record<string, any>, map: { name: string; value: unknown }[] | undefined) {
    const out = JSON.parse(JSON.stringify(payload || {}));
    (map || []).forEach((entry) => {
        if (!entry || !entry.name) return;
        const keys = String(entry.name).split('@').filter(Boolean);
        let cur = out;
        keys.forEach((k, i) => {
            const key: string | number = /^\d+$/.test(k) ? Number(k) : k;
            if (i === keys.length - 1) cur[key] = entry.value;
            else {
                if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
                cur = cur[key];
            }
        });
    });
    return out;
}

export type ModelCondition = {
    field: string | null;
    operator: string;
    value: unknown;
    newQuery?: boolean;
    or?: boolean;
};

const eq = (m: ActionModel, f: string, v: unknown) => String(m[f]) === String(v);
const empty = (m: ActionModel, f: string) => m[f] === '' || m[f] === null || m[f] === undefined;
const OPS: Record<string, (m: ActionModel, f: string, v: any) => boolean> = {
    ANYTHING: () => true,
    '=': eq,
    '!=': (m, f, v) => !eq(m, f, v),
    SAMEAS: (m, f, v) => m[f] === m[v],
    NSAMEAS: (m, f, v) => m[f] !== m[v],
    ISEMPTY: (m, f) => empty(m, f),
    EMPTYSTRING: (m, f) => empty(m, f),
    ISNOTEMPTY: (m, f) => !empty(m, f),
    STARTSWITH: (m, f, v) => String(m[f]).startsWith(String(v)),
    ENDSWITH: (m, f, v) => String(m[f]).endsWith(String(v)),
    LIKE: (m, f, v) => String(m[f]).includes(String(v)),
    'NOT LIKE': (m, f, v) => !String(m[f]).includes(String(v)),
    IN: (m, f, v) =>
        String(v)
            .split(',')
            .some((x) => eq(m, f, x)),
    'NOT IN': (m, f, v) =>
        !String(v)
            .split(',')
            .some((x) => eq(m, f, x)),
    '>': (m, f, v) => m[f] > v,
    '>=': (m, f, v) => m[f] >= v,
    '<': (m, f, v) => m[f] < v,
    '<=': (m, f, v) => m[f] <= v,
    BETWEEN: (m, f, v) => {
        const [a, b] = String(v).split('@');
        return m[f] >= a && m[f] <= b;
    },
    GT_FIELD: (m, f, v) => m[f] > m[v],
    LT_FIELD: (m, f, v) => m[f] < m[v],
    GT_OR_EQUALS_FIELD: (m, f, v) => m[f] >= m[v],
    LT_OR_EQUALS_FIELD: (m, f, v) => m[f] <= m[v],
};

/** Model conditions → true when the action shows. Unknown operators count as true. */
export function evaluateConditions(conditions: ModelCondition[] | undefined, model: ActionModel): boolean {
    if (!conditions || !conditions.length) return true;
    const groups: ModelCondition[][] = [];
    conditions.forEach((c, i) => {
        if (c.newQuery || i === 0) groups.push([c]);
        else groups[groups.length - 1].push(c);
    });
    return groups.some((group) => {
        const ands: ModelCondition[][] = [];
        group.forEach((c, i) => {
            if (!c.or || i === 0) ands.push([c]);
            else ands[ands.length - 1].push(c);
        });
        return ands.every((ors) =>
            ors.some((c) => {
                if (c.field == null && c.value == null) return true;
                const op = OPS[String(c.operator || '').toUpperCase()] || OPS[String(c.operator || '')];
                return op ? op(model, String(c.field), c.value) : true;
            })
        );
    });
}

/** A scripted client condition ('"{{view}}" == "sow"', already interpolated) over the model's keys. */
export function evaluateScriptedCondition(expression: unknown, model: ActionModel): boolean {
    if (typeof expression !== 'string' || !expression.trim() || !model) return true;
    const names = Object.keys(model).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k));
    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(...names, `return (${expression});`);
        return !!fn(...names.map((k) => model[k]));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('(actions) scripted client condition failed', expression, e);
        return true;
    }
}
