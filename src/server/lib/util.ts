import { gs, GlideDigest, GlideDateTime } from '@servicenow/glide'
import { badRequest } from './errors.ts'

/** Parse JSON leniently: empty/invalid → fallback. */
export function parseJson<T>(text: string | null | undefined, fallback: T): T {
    if (!text) return fallback
    try {
        const v = JSON.parse(text)
        return v === null || v === undefined ? fallback : (v as T)
    } catch (e) {
        return fallback
    }
}

/** Parse JSON strictly: invalid → throws a 400 naming the field. */
export function parseJsonStrict(text: string, field: string): unknown {
    if (!text) return null
    try {
        return JSON.parse(text)
    } catch (e) {
        throw badRequest(`Field "${field}" is not valid JSON`)
    }
}

export function isValidJson(text: string): boolean {
    if (!text) return true
    try {
        JSON.parse(text)
        return true
    } catch (e) {
        return false
    }
}

/** Canonical JSON: object keys sorted, so equal values hash equally. */
export function canonicalJson(value: unknown): string {
    return JSON.stringify(sortKeys(value))
}

function sortKeys(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sortKeys)
    if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {}
        for (const k of Object.keys(v as object).sort()) out[k] = sortKeys((v as Record<string, unknown>)[k])
        return out
    }
    return v
}

export function sha256(text: string): string {
    return new GlideDigest().getSHA256Hex(text || '').toLowerCase()
}

/** UTF-8 byte length without Node APIs. */
export function byteLength(text: string): number {
    let bytes = 0
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i)
        if (c < 0x80) bytes += 1
        else if (c < 0x800) bytes += 2
        else if (c >= 0xd800 && c <= 0xdbff) {
            bytes += 4
            i++
        } else bytes += 3
    }
    return bytes
}

export function correlationId(): string {
    return gs.generateGUID()
}

export function nowValue(): string {
    return new GlideDateTime().getValue()
}

/** GlideDateTime value offset from now by the given minutes (negative = past). */
export function minutesFromNow(minutes: number): string {
    const gdt = new GlideDateTime()
    gdt.addSeconds(Math.round(minutes * 60))
    return gdt.getValue()
}

export function prop(name: string, fallback: string): string {
    return gs.getProperty('x_312987_portal.' + name, fallback)
}

export function propInt(name: string, fallback: number): number {
    const n = parseInt(prop(name, String(fallback)), 10)
    return isNaN(n) ? fallback : n
}

export function propBool(name: string, fallback: boolean): boolean {
    return prop(name, fallback ? 'true' : 'false') === 'true'
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Comma-separated list → trimmed non-empty values. */
export function splitList(text: string): string[] {
    return (text || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
}
