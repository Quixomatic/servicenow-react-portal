/**
 * Encoded queries as data: parse ⇄ serialize, operators per field type, date presets.
 *
 *   'active=true^priority<=2^ORurgency=1^NQstate=6^ORDERBYDESCnumber'
 *     → groups: [ { clauses: [[active=true], [priority<=2, urgency=1]] }, { clauses: [[state=6]] } ]
 *       orderBy: [{ field: 'number', desc: true }]
 *
 * A group is one "new query" (^NQ, OR between groups); a clause is a run of terms joined by ^OR;
 * clauses inside a group are ANDed. That is exactly the platform's precedence.
 */

export type Term = { field: string; op: string; value: string }
/** Terms joined by ^OR. */
export type Clause = Term[]
/** Clauses joined by ^ (AND). */
export type Group = { clauses: Clause[] }
export type OrderBy = { field: string; desc: boolean }
export type QueryModel = {
    groups: Group[]
    orderBy: OrderBy[]
    /** 123TEXTQUERY321 keyword search (the list's search box). */
    keywords: string
    /** Tokens we keep verbatim (GROUPBY…, EQ). */
    extra: string[]
}

export const KEYWORD_FIELD = '123TEXTQUERY321'

/** Every encoded operator we recognise, longest first so prefixes never win. */
const OPERATORS = [
    'GT_OR_EQUALS_FIELD', 'LT_OR_EQUALS_FIELD', 'NOTSAMEAS', 'ISNOTEMPTY', 'EMPTYSTRING', 'RELATIVEGT', 'RELATIVELT',
    'RELATIVEGE', 'RELATIVELE', 'RELATIVEEE', 'STARTSWITH', 'INSTANCEOF', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO',
    'NOT LIKE', 'GT_FIELD', 'LT_FIELD', 'ENDSWITH', 'MORETHAN', 'LESSTHAN', 'DATEPART', 'ANYTHING', 'ISEMPTY',
    'BETWEEN', 'DYNAMIC', 'NSAMEAS', 'NOT IN', 'SAMEAS', 'NOTON', 'LIKE', 'ON', 'IN', '!=', '<=', '>=', '=', '<', '>',
]

const FIELD_RE = /^[a-z0-9_$][a-z0-9_.$]*/

export function emptyQuery(): QueryModel {
    return { groups: [], orderBy: [], keywords: '', extra: [] }
}

/** One condition token ('priority<=2') → Term, or null when it isn't a condition. */
export function parseTerm(token: string): Term | null {
    const m = FIELD_RE.exec(token)
    if (!m) return null
    const field = m[0]
    const rest = token.slice(field.length)
    for (const op of OPERATORS) {
        if (rest.startsWith(op)) return { field, op, value: rest.slice(op.length) }
    }
    return null
}

/** Encoded query → model. Unknown tokens are kept in `extra` (never dropped). */
export function parseQuery(encoded: string | null | undefined): QueryModel {
    const model = emptyQuery()
    const src = String(encoded || '').trim()
    if (!src) return model
    for (const part of src.split('^NQ')) {
        const group: Group = { clauses: [] }
        for (const raw of part.split('^')) {
            const token = raw.trim()
            if (!token) continue
            if (token.startsWith('ORDERBYDESC')) {
                model.orderBy.push({ field: token.slice(11), desc: true })
                continue
            }
            if (token.startsWith('ORDERBY')) {
                model.orderBy.push({ field: token.slice(7), desc: false })
                continue
            }
            if (token.startsWith(KEYWORD_FIELD)) {
                model.keywords = token.slice(KEYWORD_FIELD.length).replace(/^=/, '')
                continue
            }
            if (token === 'EQ' || token.startsWith('GROUPBY')) {
                model.extra.push(token)
                continue
            }
            const isOr = token.startsWith('OR') && FIELD_RE.test(token.slice(2))
            const term = parseTerm(isOr ? token.slice(2) : token)
            if (!term) {
                model.extra.push(token)
                continue
            }
            if (isOr && group.clauses.length) group.clauses[group.clauses.length - 1].push(term)
            else group.clauses.push([term])
        }
        if (group.clauses.length) model.groups.push(group)
    }
    return model
}

export function termToString(t: Term): string {
    return t.field + t.op + (t.value == null ? '' : t.value)
}

/** The filter part only (no ORDERBY, no keywords). */
export function serializeFilter(groups: Group[]): string {
    return groups
        .map((g) => g.clauses.map((c) => c.map((t, i) => (i ? 'OR' : '') + termToString(t)).join('^')).join('^'))
        .filter(Boolean)
        .join('^NQ')
}

export function serializeOrder(orderBy: OrderBy[]): string {
    return orderBy.map((o) => (o.desc ? 'ORDERBYDESC' : 'ORDERBY') + o.field).join('^')
}

/** Model → encoded query. */
export function serializeQuery(model: Partial<QueryModel>, opts: { orderBy?: boolean; keywords?: boolean } = {}): string {
    const parts: string[] = []
    const groups = model.groups || []
    const kw = opts.keywords !== false && model.keywords ? KEYWORD_FIELD + '=' + model.keywords : ''
    // Keywords AND every ^NQ group (each group is its own query), so they lead each group.
    const filter = kw && groups.length > 1 ? groups.map((g) => kw + '^' + serializeFilter([g])).join('^NQ') : [kw, serializeFilter(groups)].filter(Boolean).join('^')
    if (filter) parts.push(filter)
    for (const x of model.extra || []) parts.push(x)
    if (opts.orderBy !== false && model.orderBy && model.orderBy.length) parts.push(serializeOrder(model.orderBy))
    return parts.join('^')
}

/** AND a term onto every group (what "Show matching" / "Filter out" do). */
export function andTerm(model: QueryModel, term: Term): QueryModel {
    const groups = model.groups.length ? model.groups : [{ clauses: [] }]
    return { ...model, groups: groups.map((g) => ({ clauses: g.clauses.concat([[term]]) })) }
}

/** Remove one term (by position); empty clauses and groups disappear. */
export function removeTerm(model: QueryModel, gi: number, ci: number, ti: number): QueryModel {
    const groups = model.groups
        .map((g, i) =>
            i !== gi
                ? g
                : { clauses: g.clauses.map((c, j) => (j !== ci ? c : c.filter((_, k) => k !== ti))).filter((c) => c.length) },
        )
        .filter((g) => g.clauses.length)
    return { ...model, groups }
}

/** Every term with its position, in encoded order (aligns with the platform's parse()). */
export function flattenTerms(model: QueryModel): { term: Term; gi: number; ci: number; ti: number; join: 'NQ' | 'AND' | 'OR' }[] {
    const out: { term: Term; gi: number; ci: number; ti: number; join: 'NQ' | 'AND' | 'OR' }[] = []
    model.groups.forEach((g, gi) =>
        g.clauses.forEach((c, ci) =>
            c.forEach((term, ti) => out.push({ term, gi, ci, ti, join: ti > 0 ? 'OR' : ci === 0 ? 'NQ' : 'AND' })),
        ),
    )
    return out
}

// ---- operators ------------------------------------------------------------------------------

/** How a value is entered for an operator. */
export type Editor =
    | 'none'
    | 'string'
    | 'number'
    | 'number-range'
    | 'boolean'
    | 'choice'
    | 'choice-multi'
    | 'reference'
    | 'date-preset'
    | 'date'
    | 'date-range'
    | 'relative'
    | 'list'

export type Operator = { op: string; label: string; editor: Editor }
export type BaseType = 'string' | 'choice' | 'reference' | 'boolean' | 'number' | 'date' | 'datetime' | 'list' | 'other'

const NUMBER_TYPES = ['integer', 'longint', 'decimal', 'float', 'numeric', 'percent_complete', 'order_index', 'currency', 'price', 'currency2', 'glide_duration', 'timer']
const DATETIME_TYPES = ['glide_date_time', 'due_date', 'calendar_date_time', 'glide_time']
const STRING_TYPES = ['string', 'email', 'url', 'ph_number', 'phone_number_e164', 'GUID', 'sys_class_name', 'table_name', 'field_name', 'multi_two_lines', 'translated_field', 'translated_text', 'html', 'translated_html', 'journal', 'journal_input', 'journal_list', 'script', 'script_plain', 'wiki_text', 'domain_id', 'ip_address', 'color', 'user_input']

/** Glide type (+ whether the column has choices) → the operator family. */
export function baseType(type: string | undefined, isChoice?: boolean): BaseType {
    const t = String(type || 'string')
    if (t === 'choice' || isChoice) return 'choice'
    if (t === 'reference' || t === 'document_id' || t === 'requested_for') return 'reference'
    if (t === 'boolean') return 'boolean'
    if (t === 'glide_list') return 'list'
    if (t === 'glide_date') return 'date'
    if (DATETIME_TYPES.indexOf(t) >= 0) return 'datetime'
    if (NUMBER_TYPES.indexOf(t) >= 0) return 'number'
    if (STRING_TYPES.indexOf(t) >= 0) return 'string'
    return 'other'
}

const EMPTY_OPS: Operator[] = [
    { op: 'ISEMPTY', label: 'is empty', editor: 'none' },
    { op: 'ISNOTEMPTY', label: 'is not empty', editor: 'none' },
]
const ANYTHING: Operator = { op: 'ANYTHING', label: 'is anything', editor: 'none' }

const TEXT_OPS: Operator[] = [
    { op: 'STARTSWITH', label: 'starts with', editor: 'string' },
    { op: 'ENDSWITH', label: 'ends with', editor: 'string' },
    { op: 'LIKE', label: 'contains', editor: 'string' },
    { op: 'NOT LIKE', label: 'does not contain', editor: 'string' },
]

const DATE_OPS: Operator[] = [
    { op: 'ON', label: 'on', editor: 'date-preset' },
    { op: 'NOTON', label: 'not on', editor: 'date-preset' },
    { op: '<', label: 'before', editor: 'date' },
    { op: '<=', label: 'at or before', editor: 'date' },
    { op: '>', label: 'after', editor: 'date' },
    { op: '>=', label: 'at or after', editor: 'date' },
    { op: 'BETWEEN', label: 'between', editor: 'date-range' },
    { op: 'RELATIVEGT', label: 'after (relative)', editor: 'relative' },
    { op: 'RELATIVELT', label: 'before (relative)', editor: 'relative' },
    ...EMPTY_OPS,
    ANYTHING,
]

export const OPERATORS_BY_TYPE: Record<BaseType, Operator[]> = {
    string: [
        ...TEXT_OPS,
        { op: '=', label: 'is', editor: 'string' },
        { op: '!=', label: 'is not', editor: 'string' },
        ...EMPTY_OPS,
        ANYTHING,
        { op: 'IN', label: 'is one of', editor: 'list' },
        { op: 'NOT IN', label: 'is not one of', editor: 'list' },
        { op: 'EMPTYSTRING', label: 'is empty string', editor: 'none' },
    ],
    choice: [
        { op: '=', label: 'is', editor: 'choice' },
        { op: '!=', label: 'is not', editor: 'choice' },
        { op: 'IN', label: 'is one of', editor: 'choice-multi' },
        { op: 'NOT IN', label: 'is not one of', editor: 'choice-multi' },
        { op: '<', label: 'less than', editor: 'choice' },
        { op: '<=', label: 'less than or is', editor: 'choice' },
        { op: '>', label: 'greater than', editor: 'choice' },
        { op: '>=', label: 'greater than or is', editor: 'choice' },
        ...TEXT_OPS,
        ...EMPTY_OPS,
        ANYTHING,
    ],
    reference: [
        { op: '=', label: 'is', editor: 'reference' },
        { op: '!=', label: 'is not', editor: 'reference' },
        ...EMPTY_OPS,
        ...TEXT_OPS,
        ANYTHING,
    ],
    boolean: [
        { op: '=', label: 'is', editor: 'boolean' },
        { op: '!=', label: 'is not', editor: 'boolean' },
        ...EMPTY_OPS,
        ANYTHING,
    ],
    number: [
        { op: '=', label: 'is', editor: 'number' },
        { op: '!=', label: 'is not', editor: 'number' },
        { op: '<', label: 'less than', editor: 'number' },
        { op: '<=', label: 'less than or is', editor: 'number' },
        { op: '>', label: 'greater than', editor: 'number' },
        { op: '>=', label: 'greater than or is', editor: 'number' },
        { op: 'BETWEEN', label: 'between', editor: 'number-range' },
        ...EMPTY_OPS,
        ANYTHING,
    ],
    date: DATE_OPS,
    datetime: DATE_OPS,
    list: [
        { op: 'LIKE', label: 'contains', editor: 'reference' },
        { op: 'NOT LIKE', label: 'does not contain', editor: 'reference' },
        ...EMPTY_OPS,
        ANYTHING,
    ],
    other: [{ op: '=', label: 'is', editor: 'string' }, { op: '!=', label: 'is not', editor: 'string' }, ...EMPTY_OPS, ANYTHING],
}

/** Operators for a field type, minus the column's excluded operators. */
export function operatorsFor(type: string | undefined, isChoice?: boolean, excluded: string[] = []): Operator[] {
    const list = OPERATORS_BY_TYPE[baseType(type, isChoice)]
    return excluded.length ? list.filter((o) => excluded.indexOf(o.op) < 0) : list
}

export function findOperator(type: string | undefined, isChoice: boolean | undefined, op: string): Operator {
    const list = OPERATORS_BY_TYPE[baseType(type, isChoice)]
    return list.find((o) => o.op === op) || { op, label: op, editor: 'string' }
}

// ---- dates ----------------------------------------------------------------------------------

/** "on"/"not on" presets, encoded as label@start@end exactly as the platform stores them. */
export const DATE_PRESETS: { label: string; value: string }[] = [
    ['Today', 'Today'],
    ['Yesterday', 'Yesterday'],
    ['Tomorrow', 'Tomorrow'],
    ['This week', 'ThisWeek'],
    ['Last week', 'LastWeek'],
    ['Next week', 'NextWeek'],
    ['This month', 'ThisMonth'],
    ['Last month', 'LastMonth'],
    ['This quarter', 'ThisQuarter'],
    ['This year', 'ThisYear'],
    ['Last year', 'LastYear'],
].map(([label, fn]) => ({ label, value: `${label}@javascript:gs.beginningOf${fn}()@javascript:gs.endOf${fn}()` }))
    .concat(
        [7, 30, 90].map((n) => ({
            label: `Last ${n} days`,
            value: `Last ${n} days@javascript:gs.daysAgoStart(${n})@javascript:gs.endOfToday()`,
        })),
    )

/** 'YYYY-MM-DD' → the "on" encoding for one specific day. */
export function specificDay(date: string): string {
    return `${date}@javascript:gs.dateGenerate('${date}','start')@javascript:gs.dateGenerate('${date}','end')`
}

/** 'YYYY-MM-DD' + bound → javascript:gs.dateGenerate(…) for <, >, BETWEEN. */
export function dateGenerate(date: string, time: 'start' | 'end' | string = 'start'): string {
    const t = time === 'start' ? '00:00:00' : time === 'end' ? '23:59:59' : time
    return `javascript:gs.dateGenerate('${date}','${t}')`
}

/** The date inside a gs.dateGenerate('YYYY-MM-DD', …) value (or a plain date), else ''. */
export function dateOf(value: string): string {
    const m = /(\d{4}-\d{2}-\d{2})/.exec(String(value || ''))
    return m ? m[1] : ''
}

/** RELATIVE value '@hour@ago@3' ⇄ parts. */
export function parseRelative(value: string): { unit: string; dir: 'ago' | 'ahead'; n: string } {
    const p = String(value || '').split('@')
    return { unit: p[1] || 'dayofweek', dir: p[2] === 'ahead' ? 'ahead' : 'ago', n: p[3] || '1' }
}
export function formatRelative(parts: { unit: string; dir: string; n: string }): string {
    return `@${parts.unit}@${parts.dir}@${parts.n}`
}
export const RELATIVE_UNITS = [
    { value: 'minute', label: 'minutes' },
    { value: 'hour', label: 'hours' },
    { value: 'dayofweek', label: 'days' },
    { value: 'week', label: 'weeks' },
    { value: 'month', label: 'months' },
    { value: 'quarter', label: 'quarters' },
    { value: 'year', label: 'years' },
]

/** A readable fallback label for a term when the platform's parse isn't available. */
export function describeTerm(t: Term, fieldLabel?: string, opLabel?: string): string {
    const v = t.value || ''
    const shown = v.indexOf('@javascript') > 0 ? v.split('@')[0] : v.replace(/^javascript:gs\.dateGenerate\('([^']+)'.*$/, '$1')
    return [fieldLabel || t.field, opLabel || t.op, shown].filter(Boolean).join(' ')
}
