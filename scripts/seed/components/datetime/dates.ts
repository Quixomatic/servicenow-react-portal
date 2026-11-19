/**
 * Dates for utilities:app/datetime: time zones, glide date-time strings, the user's formats,
 * SimpleDateFormat-style format / parse, bounds, and plain calendar math on 'YYYY-MM-DD'.
 */
import { useUser } from '@portal/runtime'
import { useGraphQL } from 'utilities:app/graphql'

const pad = (n: number) => String(n).padStart(2, '0')

// ---- time zones -------------------------------------------------------------------------------

/** Wall-clock parts of a UTC instant in a time zone. */
export function zonedParts(utcMs: number, timeZone?: string) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const p: Record<string, string> = {}
    for (const part of f.formatToParts(new Date(utcMs))) p[part.type] = part.value
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second }
}

/** Glide UTC 'YYYY-MM-DD HH:mm:ss' → epoch ms (NaN when invalid). */
export function parseGlideDateTime(value: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value || ''))
    if (!m) return NaN
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
}

export function formatGlideDateTime(utcMs: number): string {
    const d = new Date(utcMs)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** UTC glide value → 'YYYY-MM-DDTHH:mm' wall time in the zone (datetime-local value). */
export function utcToLocalInput(value: string, timeZone?: string, withSeconds = false): string {
    const ms = parseGlideDateTime(value)
    if (Number.isNaN(ms)) return ''
    const p = zonedParts(ms, timeZone)
    return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}${withSeconds ? ':' + pad(p.s) : ''}`
}

/** 'YYYY-MM-DDTHH:mm[:ss]' wall time in the zone → UTC glide value (handles DST by iterating). */
export function localInputToUtc(local: string, timeZone?: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(local || ''))
    if (!m) return ''
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
    let guess = wall
    for (let i = 0; i < 3; i++) {
        const p = zonedParts(guess, timeZone)
        const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s)
        guess += wall - asUtc
    }
    return formatGlideDateTime(guess)
}

export function todayIn(timeZone?: string): string {
    const p = zonedParts(Date.now(), timeZone)
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** An IANA zone the browser knows, else undefined (the browser's zone). */
export function validZone(tz?: string): string | undefined {
    if (!tz) return undefined
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        return tz
    } catch (e) {
        return undefined
    }
}

/** Short zone name ('PST', 'GMT+1') for a zone, now. */
export function zoneLabel(timeZone?: string): string {
    try {
        const p = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, timeZoneName: 'short' }).formatToParts(new Date())
        const z = p.find((x) => x.type === 'timeZoneName')
        return z ? z.value : timeZone || ''
    } catch (e) {
        return timeZone || ''
    }
}

// ---- the user's formats -----------------------------------------------------------------------

const FORMATS_QUERY = `query rpUserFormats { GlideClientScriptingEnvironment_Query { ClientScriptingEnvironment_Globals(table: "sys_user", sysId: "-1") { g_date_time_format } } }`

export type UserFormats = { date: string; time: string; dateTime: string; loading: boolean }

/** Split 'yyyy-MM-dd HH:mm:ss' into its date and time patterns. */
export function splitDateTimeFormat(dateTime: string): { date: string; time: string } {
    const f = String(dateTime || '').trim()
    const i = f.search(/\s+[Hhk]/)
    if (i < 0) return { date: f || 'yyyy-MM-dd', time: 'HH:mm:ss' }
    return { date: f.slice(0, i).trim(), time: f.slice(i).trim() }
}

/** The user's date / time patterns (cached for the page; one tiny GraphQL request). */
export function useUserFormats(): UserFormats {
    const q = useGraphQL(FORMATS_QUERY, {}, { staleTime: Infinity })
    const raw = (q.data && q.data.GlideClientScriptingEnvironment_Query && q.data.GlideClientScriptingEnvironment_Query.ClientScriptingEnvironment_Globals && q.data.GlideClientScriptingEnvironment_Query.ClientScriptingEnvironment_Globals.g_date_time_format) || 'yyyy-MM-dd HH:mm:ss'
    const { date, time } = splitDateTimeFormat(raw)
    return { date, time, dateTime: `${date} ${time}`, loading: q.isLoading }
}

/** The user's locale (ServiceNow language, else the browser's). */
export function useLocale(): string | undefined {
    const user = useUser() as any
    return user && user.language ? user.language : undefined
}

// ---- format / parse (SimpleDateFormat subset) -------------------------------------------------

const TOKENS = /'[^']*'|yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|HH|H|hh|h|kk|k|mm|m|ss|s|a/g

function monthNames(locale: string | undefined, style: 'long' | 'short'): string[] {
    const f = new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' })
    const out: string[] = []
    for (let m = 0; m < 12; m++) out.push(f.format(new Date(Date.UTC(2020, m, 1))))
    return out
}

/** 'YYYY-MM-DD' → text in a pattern (dd/MM/yyyy, dd-MMM-yyyy, …). */
export function formatDate(ymd: string, pattern: string, locale?: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''))
    if (!m) return ''
    const y = +m[1]
    const mo = +m[2]
    const d = +m[3]
    const t = new Date(Date.UTC(y, mo - 1, d))
    return pattern.replace(TOKENS, (tok) => {
        switch (tok) {
            case 'yyyy': return String(y).padStart(4, '0')
            case 'yy': return pad(y % 100)
            case 'MMMM': return monthNames(locale, 'long')[mo - 1]
            case 'MMM': return monthNames(locale, 'short')[mo - 1]
            case 'MM': return pad(mo)
            case 'M': return String(mo)
            case 'dd': return pad(d)
            case 'd': return String(d)
            case 'EEEE': return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(t)
            case 'EEE': return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(t)
            default: return tok[0] === "'" ? tok.slice(1, -1) : tok
        }
    })
}

function validYmd(y: number, m: number, d: number): string | null {
    if (!(y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null
    const t = new Date(Date.UTC(y, m - 1, d))
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
    return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`
}

function shiftDays(ymd: string, n: number): string {
    const t = Date.parse(ymd + 'T00:00:00Z') + n * 86400000
    const d = new Date(t)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * Text → 'YYYY-MM-DD' (null when it isn't a date). Lenient: any separators, the pattern's field
 * order, 2-digit years (< 70 → 20xx), month names in the locale or English, ISO
 * 'yyyy-mm-dd' always, digits only ('19112026' for dd/MM/yyyy), and today / tomorrow / yesterday.
 */
export function parseDate(text: string, pattern: string, locale?: string, today?: string): string | null {
    const t = String(text || '').trim().toLowerCase()
    if (!t) return null
    const base = today || todayIn()
    if (t === 'today' || t === 't') return base
    if (t === 'tomorrow') return shiftDays(base, 1)
    if (t === 'yesterday') return shiftDays(base, -1)
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
    if (iso) return validYmd(+iso[1], +iso[2], +iso[3])

    const order = (pattern.match(/y+|M+|d+/g) || ['y', 'M', 'd']).map((s) => s[0])
    // A month name (long or short, locale or English) marks the month's position with '@'.
    let s = t
    let named = 0
    const lists = [monthNames(locale, 'long'), monthNames('en', 'long'), monthNames(locale, 'short'), monthNames('en', 'short')]
    for (const list of lists) {
        for (let i = 0; i < 12 && !named; i++) {
            const n = list[i].toLowerCase().replace(/\.$/, '')
            if (n && s.indexOf(n) >= 0) {
                s = s.replace(n, ' @ ')
                named = i + 1
            }
        }
    }
    let parts = s.split(/[^0-9@]+/).filter(Boolean)
    if (named) {
        // Month known: the 4-digit part (else the pattern's later field) is the year, the other the day.
        const nums = parts.filter((x) => x !== '@')
        if (parts.indexOf('@') < 0 || nums.length !== 2) return null
        let yi = nums[0].length >= 3 ? 0 : nums[1].length >= 3 ? 1 : order.indexOf('y') < order.indexOf('d') ? 0 : 1
        let y = +nums[yi]
        if (nums[yi].length <= 2) y = y < 70 ? 2000 + y : 1900 + y
        return validYmd(y, named, +nums[1 - yi])
    }
    if (parts.length === 1 && /^\d{6}$|^\d{8}$/.test(parts[0])) {
        // Digits only: cut by the pattern's field widths.
        const digits = parts[0]
        const out: string[] = []
        let at = 0
        for (const k of order) {
            const w = k === 'y' ? (digits.length === 8 ? 4 : 2) : 2
            out.push(digits.slice(at, at + w))
            at += w
        }
        parts = out
    }
    if (parts.length !== 3) return null
    // A 4-digit first part is always the year (y-M-d), whatever the pattern says.
    const ord = parts[0].length === 4 ? ['y', 'M', 'd'] : order
    const v: Record<string, number> = {}
    ord.forEach((k, i) => (v[k] = +parts[i]))
    let y = v.y
    const yPart = parts[ord.indexOf('y')] || ''
    if (yPart.length <= 2) y = y < 70 ? 2000 + y : 1900 + y
    return validYmd(y, v.M, v.d)
}

/** Placeholder text for a pattern ('dd/mm/yyyy'). */
export function patternHint(pattern: string): string {
    return pattern.replace(/'[^']*'/g, (q) => q.slice(1, -1)).replace(/M{3,}/, 'mmm').replace(/MM?/, 'mm').replace(/EEEE?/, '')
}

/** Medium date for read-only text and display values when no pattern applies. */
export function formatDateForUser(value: string, locale?: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').slice(0, 10))
    if (!m) return value || ''
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])))
}

export function formatDateTimeForUser(value: string, timeZone?: string, locale?: string): string {
    const ms = parseGlideDateTime(value)
    if (Number.isNaN(ms)) return value || ''
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone || undefined }).format(new Date(ms))
}

/** 'today' → today's date in the zone; other values pass through ('YYYY-MM-DD' or undefined). */
export function resolveBound(v: string | undefined, timeZone?: string): string | undefined {
    if (!v) return undefined
    const s = String(v).trim().toLowerCase()
    if (s === 'today') return todayIn(timeZone)
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined
}

/** Range message for a date outside [min, max], else undefined. */
export function rangeError(ymd: string, min: string | undefined, max: string | undefined, pattern: string, locale?: string): string | undefined {
    if (min && ymd < min) return `Choose ${formatDate(min, pattern, locale)} or later`
    if (max && ymd > max) return `Choose ${formatDate(max, pattern, locale)} or earlier`
    return undefined
}

// ---- calendar math on 'YYYY-MM-DD' ------------------------------------------------------------

/** 'YYYY-MM-DD' + n days. */
export function addDays(ymd: string, n: number): string {
    return shiftDays(ymd, n)
}

/** 'YYYY-MM-DD' + n months (the day clamps to the month's last day). */
export function addMonths(ymd: string, n: number): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''))
    if (!m) return ''
    const y = +m[1]
    const mo = +m[2] - 1 + n
    const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
    const d = new Date(Date.UTC(y, mo, Math.min(+m[3], last)))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Day of week of 'YYYY-MM-DD' (0 = Sunday). */
export function weekdayOf(ymd: string): number {
    return new Date(Date.parse(String(ymd).slice(0, 10) + 'T00:00:00Z')).getUTCDay()
}

/** First day of the week for a locale (0 = Sunday … 6 = Saturday), from Intl.Locale weekInfo. */
export function weekStartFor(locale?: string): number {
    try {
        const l: any = new (Intl as any).Locale(locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US')
        const info = typeof l.getWeekInfo === 'function' ? l.getWeekInfo() : l.weekInfo
        if (info && info.firstDay) return info.firstDay % 7
    } catch (e) {
        /* older engines */
    }
    return 0
}

/** Is 'YYYY-MM-DD' a real date? */
export function isValidYmd(ymd: string): boolean {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''))
    return !!m && validYmd(+m[1], +m[2], +m[3]) === ymd
}

/** The user's ServiceNow time zone when the browser knows it (else undefined = the browser's zone). */
export function useUserTimeZone(override?: string): string | undefined {
    const user = useUser() as any
    return validZone(override || (user && user.timeZone))
}
