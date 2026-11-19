import { GR, getById, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { badRequest, notFound } from '../lib/errors.ts'

/**
 * Source owners: components and themes both own source files and builds. Exactly one
 * owner reference is set on a file/build; owner_key ('component:<id>' / 'theme:<id>')
 * backs the unique indexes.
 */
export type OwnerType = 'component' | 'theme'

export interface Owner {
    type: OwnerType
    id: string
    gr: GR
    key: string
}

export function ownerKey(type: OwnerType, id: string): string {
    return `${type}:${id}`
}

export function ownerTable(type: OwnerType): string {
    return type === 'component' ? T.component : T.theme
}

export function loadOwner(type: OwnerType, id: string): Owner {
    if (type !== 'component' && type !== 'theme') throw badRequest('Unknown owner type')
    const gr = getById(ownerTable(type), id)
    if (!gr) throw notFound(`${type} not found`)
    return { type, id, gr, key: ownerKey(type, id) }
}

/** Owner of a source_file / build record (exactly one of component, theme). */
export function ownerOfRecord(gr: GR): { type: OwnerType; id: string } | null {
    const c = str(gr, 'component')
    const t = str(gr, 'theme')
    if (c && !t) return { type: 'component', id: c }
    if (t && !c) return { type: 'theme', id: t }
    return null
}

export function ownerRecordOf(gr: GR): Owner | null {
    const o = ownerOfRecord(gr)
    if (!o) return null
    const og = getById(ownerTable(o.type), o.id)
    return og ? { type: o.type, id: o.id, gr: og, key: ownerKey(o.type, o.id) } : null
}
