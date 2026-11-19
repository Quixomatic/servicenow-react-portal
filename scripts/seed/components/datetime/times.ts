/**
 * Times for utilities:app/datetime: glide_time values (both shapes), time patterns, lenient time
 * entry, and date-time text / wall-time helpers.
 */
import { zonedParts, localInputToUtc, utcToLocalInput, parseDate } from './dates'

const pad = (n: number) => String(n).padStart(2, '0')

/** Seconds since midnight. */
export type TimeOfDay = number

export function isUtcTimeValue(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(String(value || ''))
}

/** Glide time value (either shape) → seconds since midnight in the zone, or null. */
export function timeValueToSeconds(value: string, timeZone?: string): TimeOfDay | null {
    const v = String(value || '').trim()
    if (!v) return null
    if (isUtcTimeValue(v)) {
        const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v)
        if (!m) return null
        const p = zonedParts(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)), timeZone)
        return p.h * 3600 + p.mi * 60 + p.s
    }
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v)
    if (!m || +m[1] > 23 || +m[2] > 59 || +(m[3] || 0) > 59) return null
    return +m[1] * 3600 + +m[2] * 60 + +(m[3] || 0)
}

/** Seconds since midnight → a glide value in the requested shape. */
export function secondsToTimeValue(sec: TimeOfDay, shape: 'local' | 'utc', timeZone?: string): string {
    const h = Math.floor(sec / 3600) % 24
    const mi = Math.floor(sec / 60) % 60
    const s = sec % 60
    const local = `${pad(h)}:${pad(mi)}:${pad(s)}`
    if (shape === 'local') return local
    // The platform converts glide_time on 1970-01-01, then keeps only the time.
    const utc = localInputToUtc(`1970-01-01T${local}`, timeZone)
    return `1970-01-01 ${utc.slice(11, 19)}`
}

/** 'HH:mm:ss' / 'h:mm:ss a' style pattern → text. Seconds are dropped unless asked for. */
export function formatTime(sec: TimeOfDay, pattern: string, opts: { seconds?: boolean; locale?: string } = {}): string {
    const h = Math.floor(sec / 3600) % 24
    const mi = Math.floor(sec / 60) % 60
    const s = sec % 60
    const p = opts.seconds ? pattern : pattern.replace(/[:.]s+/, '')
    const ampm = (() => {
        try {
            const parts = new Intl.DateTimeFormat(opts.locale || 'en-US', { hour: 'numeric', hourCycle: 'h12', timeZone: 'UTC' }).formatToParts(new Date(Date.UTC(2020, 0, 1, h)))
            const dp = parts.find((x) => x.type === 'dayPeriod')
            return dp ? dp.value : h < 12 ? 'AM' : 'PM'
        } catch (e) {
            return h < 12 ? 'AM' : 'PM'
        }
    })()
    return p.replace(/'[^']*'|HH|H|hh|h|kk|k|mm|m|ss|s|a/g, (tok) => {
        switch (tok) {
            case 'HH': return pad(h)
            case 'H': return String(h)
            case 'kk': return pad(h === 0 ? 24 : h)
            case 'k': return String(h === 0 ? 24 : h)
            case 'hh': return pad(h % 12 === 0 ? 12 : h % 12)
            case 'h': return String(h % 12 === 0 ? 12 : h % 12)
            case 'mm': return pad(mi)
            case 'm': return String(mi)
            case 'ss': return pad(s)
            case 's': return String(s)
            case 'a': return ampm
            default: return tok[0] === "'" ? tok.slice(1, -1) : tok
        }
    })
}

/** Lenient time text → seconds since midnight, or null. */
export function parseTime(text: string): TimeOfDay | null {
    let t = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (!t) return null
    if (t === 'noon') return 12 * 3600
    if (t === 'midnight') return 0
    if (t === 'now') {
        const d = new Date()
        return d.getHours() * 3600 + d.getMinutes() * 60
    }
    let period: 'a' | 'p' | '' = ''
    const pm = /\s*([ap])\.?\s*m?\.?$/.exec(t)
    if (pm) {
        period = pm[1] as 'a' | 'p'
        t = t.slice(0, pm.index).trim()
    }
    let h: number
    let mi = 0
    let s = 0
    const sep = /^(\d{1,2})[:.h ](\d{1,2})(?:[:.](\d{1,2}))?$/.exec(t)
    if (sep) {
        h = +sep[1]
        mi = +sep[2]
        s = +(sep[3] || 0)
        if (sep[2].length !== 2) return null
    } else if (/^\d{1,6}$/.test(t)) {
        // '9' → 9:00, '930' → 9:30, '0930' → 9:30, '093015' → 9:30:15
        if (t.length <= 2) h = +t
        else if (t.length <= 4) {
            h = +t.slice(0, t.length - 2)
            mi = +t.slice(-2)
        } else {
            h = +t.slice(0, t.length - 4)
            mi = +t.slice(-4, -2)
            s = +t.slice(-2)
        }
    } else return null
    if (period) {
        if (h < 1 || h > 12) return null
        h = (h % 12) + (period === 'p' ? 12 : 0)
    }
    if (h > 23 || mi > 59 || s > 59) return null
    return h * 3600 + mi * 60 + s
}

/** Seconds since midnight → 'HH:mm:ss'. */
export const hms = (sec: number) => `${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`

/** Wall parts of a UTC glide value in the zone: { ymd, sec } or null. */
export function wallOf(value: string, timeZone?: string): { ymd: string; sec: number } | null {
    const local = utcToLocalInput(value, timeZone, true)
    if (!local) return null
    const [d, t] = local.split('T')
    const [h, m, s] = t.split(':').map(Number)
    return { ymd: d, sec: h * 3600 + m * 60 + (s || 0) }
}

/** Text → { ymd, sec | null } (sec null when only a date was typed), or null. */
export function parseDateTime(text: string, datePattern: string, locale?: string, today?: string): { ymd: string; sec: number | null } | null {
    const t = String(text || '').trim()
    const m = /^(.*?)[\sT,]+(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s*m?\.?)?|noon|midnight|now)$/i.exec(t)
    if (m) {
        const ymd = parseDate(m[1], datePattern, locale, today)
        const sec = parseTime(m[2])
        return ymd && sec !== null ? { ymd, sec } : null
    }
    const ymd = parseDate(t, datePattern, locale, today)
    return ymd ? { ymd, sec: null } : null
}
