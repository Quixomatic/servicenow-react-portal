/**
 * Transport for the platform GraphQL endpoint (and the few REST calls GraphQL can't replace).
 *
 *   POST /api/now/graphql   { operationName?, query, variables }   →   { data, errors? }
 *
 * Same-origin, session cookie + X-UserToken (window.g_ck), exactly what Workspace sends. In the
 * local dev server there is no g_ck; its proxy authenticates instead.
 */

export const GRAPHQL_ENDPOINT = '/api/now/graphql'

export type GraphQLErrorEntry = { message: string; path?: (string | number)[]; locations?: unknown; extensions?: unknown }

export class GraphQLError extends Error {
    errors: GraphQLErrorEntry[]
    status: number
    data: unknown
    constructor(message: string, status: number, errors: GraphQLErrorEntry[] = [], data: unknown = null) {
        super(message)
        this.name = 'GraphQLError'
        this.status = status
        this.errors = errors
        this.data = data
    }
}

export type GraphQLOptions = {
    operationName?: string
    signal?: AbortSignal
    /** Resolve with partial data instead of throwing when the response carries errors. */
    allowPartial?: boolean
}

/** Identity tag so editors can highlight GraphQL documents: gql`query X { … }`. */
export function gql(strings: TemplateStringsArray, ...values: unknown[]): string {
    let out = ''
    strings.forEach((s, i) => {
        out += s + (i < values.length ? String(values[i]) : '')
    })
    return out
}

export function authHeaders(json = true): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' }
    if (json) h['Content-Type'] = 'application/json'
    const token = typeof window !== 'undefined' ? (window as unknown as { g_ck?: string }).g_ck : undefined
    if (token) h['X-UserToken'] = token
    return h
}

const OPERATION_RE = /^\s*(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/

/** Run a GraphQL document. Resolves with `data`; GraphQL errors throw a GraphQLError. */
export async function graphql<T = any>(query: string, variables: Record<string, unknown> = {}, options: GraphQLOptions = {}): Promise<T> {
    const m = OPERATION_RE.exec(query)
    const operationName = options.operationName || (m ? m[1] : undefined)
    const body: Record<string, unknown> = { query, variables }
    if (operationName) body.operationName = operationName
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(true),
        body: JSON.stringify(body),
        signal: options.signal,
    })
    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        throw new GraphQLError(`GraphQL ${operationName || 'request'}: HTTP ${response.status} (not JSON)`, response.status)
    }
    if (!response.ok && !(json && json.data)) {
        const msg = (json && json.error && (json.error.message || json.error.detail)) || `HTTP ${response.status}`
        throw new GraphQLError(`GraphQL ${operationName || 'request'}: ${msg}`, response.status, json && json.errors)
    }
    const errors: GraphQLErrorEntry[] = (json && json.errors) || []
    if (errors.length && !options.allowPartial) {
        throw new GraphQLError(errors.map((e) => e.message).join('; '), response.status, errors, json && json.data)
    }
    return (json ? json.data : null) as T
}

/** GET a same-origin JSON endpoint (Table / UI APIs) with the session token. Returns `result`. */
export async function restGet<T = any>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, { credentials: 'same-origin', headers: authHeaders(false), signal })
    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch (e) {
        /* not JSON */
    }
    if (!response.ok) {
        const msg = (json && json.error && (json.error.message || json.error.detail)) || `HTTP ${response.status}`
        throw new GraphQLError(`GET ${url}: ${msg}`, response.status)
    }
    return (json ? json.result : null) as T
}

/** Table and field names are interpolated into a few documents: allow only dictionary-safe names. */
export function safeName(name: string, what = 'name'): string {
    if (!/^[a-z0-9_]+$/i.test(String(name || ''))) throw new Error(`Invalid ${what} "${name}"`)
    return name
}
