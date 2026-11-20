import { useEffect, useState } from 'react'
import { zonedParts } from 'utilities:app/datetime'
import type { ActivityEntry } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' of an instant in a time zone (the user's ServiceNow zone). */
export function dayKey(ms: number, timeZone?: string): string {
    const p = zonedParts(ms, timeZone)
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** 'Today', 'Yesterday', a weekday this week, else a medium date. */
export function dayLabel(key: string, now: number, timeZone?: string, locale?: string): string {
    const today = dayKey(now, timeZone)
    if (key === today) return 'Today'
    if (key === dayKey(now - 86_400_000, timeZone)) return 'Yesterday'
    const [y, m, d] = key.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d, 12))
    const [ty, tm, td] = today.split('-').map(Number)
    const days = Math.round((Date.UTC(ty, tm - 1, td, 12) - date.getTime()) / 86_400_000)
    if (days > 0 && days < 7) return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(date)
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
]

/** '3 minutes ago', 'yesterday', 'just now'. */
export function relativeTime(ms: number, now: number = Date.now(), locale?: string): string {
    const seconds = Math.round((ms - now) / 1000)
    if (Math.abs(seconds) < 45) return 'just now'
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size || unit === 'minute') return rtf.format(Math.round(seconds / size), unit)
    }
    return rtf.format(seconds, 'second')
}

export type ActivityDayGroup = { key: string; label: string; entries: ActivityEntry[] }

/** Entries (newest first) grouped by the user's calendar day. */
export function groupByDay(entries: ActivityEntry[], options: { now?: number; timeZone?: string; locale?: string } = {}): ActivityDayGroup[] {
    const now = options.now || Date.now()
    const groups: ActivityDayGroup[] = []
    let current: ActivityDayGroup | null = null
    for (const e of entries) {
        const key = dayKey(e.createdAt, options.timeZone)
        if (!current || current.key !== key) {
            current = { key, label: dayLabel(key, now, options.timeZone, options.locale), entries: [] }
            groups.push(current)
        }
        current.entries.push(e)
    }
    return groups
}

/** A clock that ticks every `ms` (relative timestamps stay fresh). */
export function useNow(ms = 60_000): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), ms)
        return () => clearInterval(id)
    }, [ms])
    return now
}

/** '71 KB', '1.2 MB'. */
export function formatBytes(bytes: number): string {
    if (!bytes || bytes < 0) return ''
    if (bytes < 1024) return `${bytes} B`
    const units = ['KB', 'MB', 'GB']
    let v = bytes / 1024
    let i = 0
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i += 1
    }
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}
