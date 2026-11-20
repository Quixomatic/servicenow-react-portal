import type { ActivityEntry, ActivityFilterField, ActivityFilters, ActivityKind } from './types'

/** Display order and labels of the entry kinds. */
export const ACTIVITY_KINDS: { kind: ActivityKind; label: string }[] = [
    { kind: 'journal', label: 'Journal' },
    { kind: 'audit', label: 'Field changes' },
    { kind: 'attachment', label: 'Attachments' },
    { kind: 'email', label: 'Emails' },
    { kind: 'relation', label: 'Relationships' },
    { kind: 'other', label: 'Other' },
]

function entryText(e: ActivityEntry): string {
    const parts = [e.title, e.author.displayName, e.author.userName, e.content || '']
    if (e.changes) e.changes.forEach((c) => parts.push(c.label, c.oldValue || '', c.newValue))
    if (e.attachment) parts.push(e.attachment.fileName)
    if (e.email) parts.push(e.email.subject, e.email.from, e.email.to.join(' '))
    return parts.join(' ').replace(/<[^>]*>/g, ' ').toLowerCase()
}

/**
 * Entries matching the filters. Field changes keep only the selected fields' changes (an entry
 * with none left is dropped); omitted filter keys keep everything.
 */
export function applyActivityFilters(entries: ActivityEntry[], filters?: ActivityFilters): ActivityEntry[] {
    if (!filters) return entries
    const kinds = filters.kinds ? new Set(filters.kinds) : null
    const journal = filters.journalFields ? new Set(filters.journalFields) : null
    const fields = filters.fields ? new Set(filters.fields) : null
    const term = String(filters.search || '').trim().toLowerCase()
    const out: ActivityEntry[] = []
    for (const e of entries) {
        if (kinds && !kinds.has(e.kind)) continue
        if (journal && e.kind === 'journal' && !journal.has(e.field || '')) continue
        let entry = e
        if (fields && e.kind === 'audit' && e.changes) {
            const changes = e.changes.filter((c) => fields.has(c.field))
            if (!changes.length) continue
            if (changes.length !== e.changes.length) entry = { ...e, changes }
        }
        if (term && entryText(entry).indexOf(term) < 0) continue
        out.push(entry)
    }
    return out
}

/** The kind a special filter field governs ('*Attachments*' → attachment). */
export function kindOfFilterField(f: ActivityFilterField, table?: string): ActivityKind {
    if (f.journal || f.eventTable === 'sys_journal_field') return 'journal'
    if (f.eventTable === 'sys_attachment') return 'attachment'
    if (f.eventTable === 'sys_email') return 'email'
    if (f.eventTable === 'sys_audit_relation') return 'relation'
    if (!f.special || (table && f.eventTable === table)) return 'audit'
    return 'other'
}

/** The platform's default selection as ActivityFilters (unselected filter fields are hidden). */
export function defaultFiltersFrom(filterFields: ActivityFilterField[], table?: string): ActivityFilters {
    if (!filterFields.length) return {}
    const journal = filterFields.filter((f) => kindOfFilterField(f, table) === 'journal')
    const audit = filterFields.filter((f) => kindOfFilterField(f, table) === 'audit')
    const off = filterFields.filter((f) => !f.selected)
    const out: ActivityFilters = {}
    if (journal.some((f) => !f.selected)) out.journalFields = journal.filter((f) => f.selected).map((f) => f.name)
    if (audit.some((f) => !f.selected)) out.fields = audit.filter((f) => f.selected).map((f) => f.name)
    const kindsOff = new Set<ActivityKind>()
    off.filter((f) => f.special).forEach((f) => {
        const k = kindOfFilterField(f, table)
        // A kind is off only when every filter field of that kind is off (emails have two).
        if (filterFields.filter((g) => g.special && kindOfFilterField(g, table) === k).every((g) => !g.selected)) kindsOff.add(k)
    })
    if (kindsOff.size) out.kinds = ACTIVITY_KINDS.map((k) => k.kind).filter((k) => !kindsOff.has(k))
    return out
}

/** Counts per kind and per journal field (for filter chips). */
export function countActivity(entries: ActivityEntry[]): { kinds: Record<string, number>; journal: Record<string, number> } {
    const kinds: Record<string, number> = {}
    const journal: Record<string, number> = {}
    for (const e of entries) {
        kinds[e.kind] = (kinds[e.kind] || 0) + 1
        if (e.kind === 'journal') journal[e.field || ''] = (journal[e.field || ''] || 0) + 1
    }
    return { kinds, journal }
}
