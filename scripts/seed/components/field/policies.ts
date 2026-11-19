import type { UiPolicy, UiPolicyCondition } from 'utilities:app/graphql'
import type { FieldMessageKind, PolicyState } from './types'
import type { FormStore } from './store'

/**
 * UI policy engine (record forms and catalog items share it).
 *
 * The platform ships each policy with its conditions (encoded-query terms) and actions; the
 * server marks terms it already evaluated (dot-walks, fields that aren't on the form) with
 * preEvaluatedTerm / preEvaluatedTermResult. Everything else is evaluated here, against the
 * form's committed values, on load and after every change, as Workspace's GlideForm runtime does.
 *
 * Results go into the store's policy LAYER (setPolicyLayer), recomputed as a whole: a policy that
 * turns false without "reverse if false" simply stops contributing, so whatever was below it
 * (server state, dictionary) shows again. With reverse, its actions apply inverted. Later
 * policies (higher order) win over earlier ones. Script overrides (g_form.setX) sit above it.
 *
 * Side effects run on a false → true transition only: "clear value" actions, catalog "set value".
 * Policy scripts (run scripts) run through options.onResult (the g_form shim in utilities:app/gform).
 */

export type PolicyEvaluation = {
    layer: Record<string, PolicyState>
    /** Policy id → condition result (undefined = not evaluated yet: onLoad false, untouched). */
    results: Record<string, boolean | undefined>
}

const EMPTY_OPS = new Set(['ISEMPTY', 'EMPTYSTRING'])

function num(v: string): number {
    const n = Number(String(v).replace(/,/g, ''))
    return isNaN(n) ? NaN : n
}

function isNumeric(type?: string) {
    return !!type && ['integer', 'longint', 'decimal', 'float', 'numeric', 'currency', 'price', 'percent_complete', 'order_index'].indexOf(type) >= 0
}

/** Normalise a value for comparison by field type (booleans: '' is false). */
function normalise(v: string, type?: string): string {
    const s = v == null ? '' : String(v)
    if (type === 'boolean') return s === 'true' || s === '1' ? 'true' : 'false'
    return s
}

function compare(a: string, b: string, type?: string): number {
    if (isNumeric(type) || (a !== '' && b !== '' && !isNaN(num(a)) && !isNaN(num(b)) && type !== 'string')) {
        const x = num(a)
        const y = num(b)
        if (!isNaN(x) && !isNaN(y)) return x - y
    }
    return a < b ? -1 : a > b ? 1 : 0
}

/** One term against the form. Returns undefined when it can't be evaluated client-side. */
export function evaluateTerm(c: UiPolicyCondition, getValue: (name: string) => string | undefined): boolean | undefined {
    if (c.preEvaluatedTerm) return c.preEvaluatedTermResult
    const raw = getValue(c.field)
    if (raw === undefined) return undefined
    const type = c.type
    const v = normalise(raw, type)
    const target = normalise(c.value, type)
    const list = () => String(c.value || '').split(',').map((s) => s.trim())
    const lower = v.toLowerCase()
    const t = String(c.value || '').toLowerCase()
    switch (c.oper) {
        case '=':
            return type === 'boolean' ? v === target : v === String(c.value || '')
        case '!=':
            return type === 'boolean' ? v !== target : v !== String(c.value || '')
        case 'ISEMPTY':
        case 'EMPTYSTRING':
            return String(raw).trim() === ''
        case 'ISNOTEMPTY':
            return String(raw).trim() !== ''
        case 'ANYTHING':
            return true
        case 'IN':
            return list().indexOf(v) >= 0
        case 'NOT IN':
            return list().indexOf(v) < 0
        case 'LIKE':
            return lower.indexOf(t) >= 0
        case 'NOT LIKE':
            return lower.indexOf(t) < 0
        case 'STARTSWITH':
            return lower.indexOf(t) === 0
        case 'ENDSWITH':
            return t === '' || lower.slice(-t.length) === t
        case '<':
            return v !== '' && compare(v, String(c.value), type) < 0
        case '<=':
            return v !== '' && compare(v, String(c.value), type) <= 0
        case '>':
            return v !== '' && compare(v, String(c.value), type) > 0
        case '>=':
            return v !== '' && compare(v, String(c.value), type) >= 0
        case 'BETWEEN': {
            const [lo, hi] = String(c.value || '').split('@')
            return v !== '' && compare(v, lo, type) >= 0 && compare(v, hi, type) <= 0
        }
        case 'SAMEAS': {
            const other = getValue(c.value)
            return other === undefined ? undefined : v === normalise(other, type)
        }
        case 'NSAMEAS': {
            const other = getValue(c.value)
            return other === undefined ? undefined : v !== normalise(other, type)
        }
        case 'GT_FIELD':
        case 'LT_FIELD':
        case 'GT_OR_EQUALS_FIELD':
        case 'LT_OR_EQUALS_FIELD': {
            const other = getValue(c.value)
            if (other === undefined || v === '' || other === '') return undefined
            const d = compare(v, other, type)
            return c.oper === 'GT_FIELD' ? d > 0 : c.oper === 'LT_FIELD' ? d < 0 : c.oper === 'GT_OR_EQUALS_FIELD' ? d >= 0 : d <= 0
        }
        default:
            // Relative dates (ONToday, RELATIVEGT…), DYNAMIC, CHANGES…: not evaluated client-side.
            return undefined
    }
}

/**
 * A policy's condition. Encoded-query grouping: ^NQ starts a new OR group; inside a group, terms
 * AND together and an OR term joins the previous term (a ^ b ^OR c = a AND (b OR c)).
 * A term that can't be evaluated takes the server's load-time result for the whole policy when the
 * server pre-evaluated it, else false.
 */
export function evaluatePolicy(p: UiPolicy, getValue: (name: string) => string | undefined): boolean {
    if (!p.conditions.length) return true
    let unknown = false
    const term = (c: UiPolicyCondition) => {
        const r = evaluateTerm(c, getValue)
        if (r === undefined) unknown = true
        return !!r
    }
    const groups: UiPolicyCondition[][] = []
    for (const c of p.conditions) {
        if (!groups.length || c.newquery) groups.push([])
        groups[groups.length - 1].push(c)
    }
    let result = false
    for (const g of groups) {
        // AND of OR-clusters
        let groupResult = true
        let cluster: boolean | null = null
        for (const c of g) {
            const r = term(c)
            if (c.or && cluster !== null) cluster = cluster || r
            else {
                if (cluster !== null) groupResult = groupResult && cluster
                cluster = r
            }
        }
        if (cluster !== null) groupResult = groupResult && cluster
        if (groupResult) result = true
    }
    if (unknown && !result && p.preEvaluated) return p.preEvaluatedResult
    return result
}

const flagOf = (f: string, reverse: boolean): boolean | undefined => (f === 'true' ? !reverse : f === 'false' ? reverse : undefined)

/** The whole policy layer for the current values. `armed`: onLoad=false policies that may run. */
export function computePolicyLayer(policies: UiPolicy[], getValue: (name: string) => string | undefined, armed: Set<string>): PolicyEvaluation {
    const layer: Record<string, PolicyState> = {}
    const results: Record<string, boolean | undefined> = {}
    for (const p of policies) {
        if (!p.onLoad && !armed.has(p.id)) {
            results[p.id] = undefined
            continue
        }
        const ok = evaluatePolicy(p, getValue)
        results[p.id] = ok
        if (!ok && !p.reverse) continue
        const inverted = !ok
        for (const a of p.actions) {
            const cur: PolicyState = layer[a.name] ? { ...layer[a.name] } : {}
            const visible = flagOf(a.visible, inverted)
            const mandatory = flagOf(a.mandatory, inverted)
            const readOnly = flagOf(a.disabled, inverted)
            if (visible !== undefined) cur.visible = visible
            if (mandatory !== undefined) cur.mandatory = mandatory
            if (readOnly !== undefined) cur.readOnly = readOnly
            if (ok && a.fieldMessage && a.fieldMessageType && a.fieldMessageType !== 'none') {
                const kind = (['error', 'warning', 'info', 'success'].indexOf(a.fieldMessageType) >= 0 ? a.fieldMessageType : 'info') as FieldMessageKind
                cur.message = { kind, text: a.fieldMessage, id: `policy-${p.id}` }
            }
            layer[a.name] = cur
        }
    }
    return { layer, results }
}

export type AttachedPolicies = {
    /** Latest condition results (policy id → true / false / undefined). */
    results: () => Record<string, boolean | undefined>
    /** Re-evaluate now (e.g. after loading fresh values). */
    refresh: () => void
    /** Set (or clear) the run-scripts hook; `replay` calls it now for every evaluated policy. */
    setOnResult: (fn: ((policy: UiPolicy, result: boolean, previous: boolean | undefined) => void) | undefined, replay?: boolean) => void
    detach: () => void
}

/**
 * Bind policies to a form store: evaluate now, then whenever a condition field's committed value
 * changes (setValue or a reload). `resolve` maps condition / action names to store names (catalog
 * aliases); identity for record forms.
 */
export function attachPolicies(
    store: FormStore,
    policies: UiPolicy[],
    options: {
        resolve?: (name: string) => string
        /** Called when a policy's result changes (and on its first evaluation): run-scripts hook. */
        onResult?: (policy: UiPolicy, result: boolean, previous: boolean | undefined) => void
    } = {},
): AttachedPolicies {
    const resolve = options.resolve || ((n: string) => n)
    const list: UiPolicy[] = (policies || []).map((p) => ({
        ...p,
        conditions: p.conditions.map((c) => ({ ...c, field: resolve(c.field) })),
        actions: p.actions.map((a) => ({ ...a, name: resolve(a.name) })),
    }))
    const condFields = new Set<string>()
    const byField = new Map<string, string[]>()
    for (const p of list)
        for (const c of p.conditions) {
            condFields.add(c.field)
            byField.set(c.field, (byField.get(c.field) || []).concat(p.id))
        }
    let onResult = options.onResult
    const armed = new Set<string>()
    let results: Record<string, boolean | undefined> = {}
    let lastKey: string | null = null
    let running = false

    const has = (name: string) => name in store.getState().fields || name in store.getState().meta
    const getValue = (name: string) => (has(name) ? store.getValue(name) : undefined)
    const keyOf = () => Array.from(condFields).map((f) => f + '=' + (getValue(f) ?? '\u0000')).join('&') + '|' + Array.from(armed).join(',')

    const run = (force = false) => {
        if (running || !list.length) return
        const key = keyOf()
        if (!force && key === lastKey) return
        lastKey = key
        running = true
        try {
            const prev = results
            const next = computePolicyLayer(list, getValue, armed)
            results = next.results
            store.setPolicyLayer(next.layer)
            // Run-scripts hook: every result change (the original policy, names as the platform sent them).
            if (onResult)
                list.forEach((p, i) => {
                    const r = next.results[p.id]
                    if (r === undefined || r === prev[p.id]) return
                    try {
                        onResult!(policies[i], r, prev[p.id])
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error('[app/field] policy onResult failed', e)
                    }
                })
            // Side effects on false → true.
            for (const p of list) {
                if (!next.results[p.id] || prev[p.id] === true) continue
                for (const a of p.actions) {
                    if (a.cleared) store.clearValue(a.name)
                    if (a.valueAction === 'setValue' && a.value !== undefined) store.setValue(a.name, a.value)
                    if (a.valueAction === 'clearValue') store.clearValue(a.name)
                }
            }
        } finally {
            running = false
        }
        // Side effects may have changed condition fields: settle (bounded by the key check).
        if (keyOf() !== lastKey) run()
    }

    const offChange = store.onChange('*', (name) => {
        const ids = byField.get(name)
        if (!ids) return
        // onChange fires after the value is in the store: arm onLoad=false policies, re-run.
        const before = armed.size
        ids.forEach((id) => armed.add(id))
        if (armed.size !== before) run()
    })
    const offState = store.subscribe(() => run())
    run(true)
    return {
        results: () => results,
        refresh: () => run(true),
        setOnResult: (fn, replay) => {
            onResult = fn
            if (!fn || !replay) return
            list.forEach((p, i) => {
                const r = results[p.id]
                if (r === undefined) return
                try {
                    fn(policies[i], r, undefined)
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[app/field] policy onResult failed', e)
                }
            })
        },
        detach: () => {
            offChange()
            offState()
            store.setPolicyLayer({})
        },
    }
}
