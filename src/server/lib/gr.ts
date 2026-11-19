import { GlideRecord, GlideAggregate } from '@servicenow/glide'

/**
 * Loose GlideRecord handle. React Portal tables are defined in Fluent, so the typed
 * GlideRecord<'table'> generics don't know their columns; this keeps call sites readable.
 */
export type GR = any

export function newGR(table: string): GR {
    return new GlideRecord(table) as GR
}

/** Fetch one record by sys_id, or null. */
export function getById(table: string, sysId: string | null | undefined): GR | null {
    if (!sysId) return null
    const gr = newGR(table)
    return gr.get(sysId) ? gr : null
}

/** Fetch the first record matching an encoded query, or null. */
export function findOne(table: string, encodedQuery: string, orderBy?: string): GR | null {
    const gr = newGR(table)
    gr.addEncodedQuery(encodedQuery)
    if (orderBy) {
        if (orderBy.charAt(0) === '-') gr.orderByDesc(orderBy.substring(1))
        else gr.orderBy(orderBy)
    }
    gr.setLimit(1)
    gr.query()
    return gr.next() ? gr : null
}

/** Iterate records matching an encoded query. */
export function each(table: string, encodedQuery: string, fn: (gr: GR) => void, orderBy?: string | string[]): void {
    const gr = newGR(table)
    if (encodedQuery) gr.addEncodedQuery(encodedQuery)
    const orders = orderBy ? (Array.isArray(orderBy) ? orderBy : [orderBy]) : []
    for (const o of orders) {
        if (o.charAt(0) === '-') gr.orderByDesc(o.substring(1))
        else gr.orderBy(o)
    }
    gr.query()
    while (gr.next()) fn(gr)
}

export function count(table: string, encodedQuery: string): number {
    const ga: any = new GlideAggregate(table)
    if (encodedQuery) ga.addEncodedQuery(encodedQuery)
    ga.addAggregate('COUNT')
    ga.query()
    return ga.next() ? parseInt(ga.getAggregate('COUNT'), 10) || 0 : 0
}

export function exists(table: string, encodedQuery: string): boolean {
    const gr = newGR(table)
    gr.addEncodedQuery(encodedQuery)
    gr.setLimit(1)
    gr.query()
    return gr.hasNext()
}

/** String value of a field ('' when empty). */
export function str(gr: GR, field: string): string {
    const v = gr.getValue(field)
    return v === null || v === undefined ? '' : String(v)
}

export function int(gr: GR, field: string, fallback = 0): number {
    const n = parseInt(str(gr, field), 10)
    return isNaN(n) ? fallback : n
}

export function bool(gr: GR, field: string): boolean {
    const v = str(gr, field)
    return v === '1' || v === 'true'
}

export function changed(gr: GR, field: string): boolean {
    return gr.getElement(field).changes()
}
