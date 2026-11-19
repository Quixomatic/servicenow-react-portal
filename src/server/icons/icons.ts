import { LUCIDE_ICON_NAMES, LUCIDE_VERSION } from './lucide-names.ts'

/**
 * Lucide icon names for validation and pickers. Names only: the SVG sprite (lucide-sprite.ts) is
 * imported solely by the icon sprite route, so business rules and bootstrap never load it.
 */

export { LUCIDE_VERSION }

let index: Record<string, boolean> | null = null

function nameIndex(): Record<string, boolean> {
    if (!index) {
        index = {}
        for (const n of LUCIDE_ICON_NAMES) index[n] = true
    }
    return index
}

/** "LayoutDashboard" / "layout_dashboard" / " Layout Dashboard " → "layout-dashboard". */
export function normalizeIconName(raw: string): string {
    return String(raw || '')
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function isLucideIcon(name: string): boolean {
    return !!name && nameIndex()[name] === true
}

/**
 * Icon names matching a query (every whitespace-separated term is a substring), exact match
 * first, then prefix matches, then the rest, alphabetically within each group.
 */
export function searchIcons(query: string, limit: number): { names: string[]; total: number } {
    const q = normalizeIconName(query).replace(/-/g, ' ').trim()
    const terms = q ? q.split(/\s+/) : []
    const hits = LUCIDE_ICON_NAMES.filter((n) => terms.every((t) => n.indexOf(t) >= 0))
    const joined = terms.join('-')
    const rank = (n: string) => (n === joined ? 0 : n.indexOf(joined) === 0 ? 1 : 2)
    hits.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0))
    const max = Math.max(1, Math.min(limit || 200, 3000))
    return { names: hits.slice(0, max), total: hits.length }
}
