import { graphql, restGet, safeName } from 'utilities:app/graphql'
import type { ActivityChange, ActivityData, ActivityEntry, ActivityFilterField, ActivityKind, ActivityUser } from './types'

/**
 * The platform's activity stream calls, as Workspace's now-activity-stream makes them
 * (sn-activity-stream-queries, glide.activity.api_version = 1):
 *
 *   GlideActivity_Query.getEvents        the stream: events, filter fields, authors, AMB channels
 *   GlideActivity_Mutation.putJournal    post a work note / comment (the compose box's Post)
 *   GlideActivity_Query.getEmailBodies   an email tile's body, on demand
 *   GET /api/now/ui/stream_entry/full_entry?sysparm_sys_id=   a truncated journal entry in full
 *
 * No REST wrapper of our own: every call is the platform's, with the user's session (ACLs apply).
 */

export const ACTIVITY_QUERY = `query rpActivity($table: String!, $sysId: String!, $view: String) {
    GlideActivity_Query {
        getEvents(documents: [{ table: $table, sysId: $sysId }], view: { table: $table, sysId: $sysId, name: $view }) {
            filterFields { name label journal selected specialField eventTable subType }
            featureFlags { name value }
            supplemental { documentId eventId userSysId payload }
            events {
                documentTable documentId eventTable eventSysId
                eventCreatedOn { displayValue numericValue value }
                eventCreatedBy subtype tile payload eventTitle
            }
            userReferences { sysId displayName email avatar userName active ai managerName identityType }
            ambChannels
        }
    }
}`

export const PUT_JOURNAL_MUTATION = `mutation rpPutJournal($table: String!, $sysId: String!, $field: String!, $value: String!) {
    GlideActivity_Mutation { putJournal(documentTable: $table, documentSysId: $sysId, field: $field, value: $value) }
}`

export const EMAIL_BODY_QUERY = `query rpActivityEmail($emailSysIds: [String!]!, $sortDesc: Boolean!, $useSizeLimit: Boolean!) {
    GlideActivity_Query { getEmailBodies(emailSysIds: $emailSysIds, sortDesc: $sortDesc, useSizeLimit: $useSizeLimit) { sysId body processed } }
}`

const SYS_ID = /^[0-9a-f]{32}$/i

function parseJson(text: unknown, fallback: any): any {
    if (text && typeof text === 'object') return text
    if (typeof text !== 'string' || !text) return fallback
    try {
        return JSON.parse(text)
    } catch (e) {
        return fallback
    }
}

/** 'Beth Anglin' → 'BA'; 'admin' → 'AD'. */
export function initialsOf(name: string): string {
    const parts = String(name || '')
        .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean)
    if (!parts.length) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function normalizeUser(raw: any): ActivityUser {
    const displayName = String((raw && (raw.displayName || raw.name)) || (raw && raw.userName) || '')
    return {
        sysId: String((raw && raw.sysId) || ''),
        userName: String((raw && raw.userName) || ''),
        displayName,
        initials: String((raw && raw.initials) || initialsOf(displayName)),
        avatar: String((raw && raw.avatar) || ''),
        email: String((raw && raw.email) || ''),
        active: !raw || raw.active !== false,
        identityType: raw && raw.identityType ? String(raw.identityType) : undefined,
    }
}

/** An author we have no userReference for (system, deleted users). */
export function unknownUser(userName: string): ActivityUser {
    const name = userName || 'system'
    return { sysId: '', userName: name, displayName: name, initials: initialsOf(name), avatar: '', email: '', active: true }
}

export function kindOfEventTable(eventTable: string, tile?: string): ActivityKind {
    if (eventTable === 'sys_journal_field' || tile === 'journal-tile') return 'journal'
    if (eventTable === 'sys_attachment' || tile === 'attachment-tile') return 'attachment'
    if (eventTable === 'sys_email' || tile === 'email-tile') return 'email'
    if (eventTable === 'sys_audit_relation' || tile === 'audit-relation-tile') return 'relation'
    if (eventTable === 'sys_audit' || tile === 'audit-tile') return 'audit'
    return 'other'
}

function list(v: unknown): string[] {
    if (Array.isArray(v)) return v.map(String).filter(Boolean)
    if (typeof v === 'string' && v) return v.split(',').map((s) => s.trim()).filter(Boolean)
    return []
}

/** One getEvents event (or an AMB /activity/events message's event) → ActivityEntry. */
export function normalizeEvent(raw: any, users: Record<string, ActivityUser>): ActivityEntry {
    const payload = parseJson(raw && raw.payload, {}) || {}
    const eventTable = String((raw && raw.eventTable) || '')
    const eventSysId = String((raw && raw.eventSysId) || '')
    const created = (raw && raw.eventCreatedOn) || {}
    const createdBy = String((raw && raw.eventCreatedBy) || '')
    const kind = kindOfEventTable(eventTable, raw && raw.tile)
    const entry: ActivityEntry = {
        key: `${eventTable}:${eventSysId}`,
        kind,
        eventTable,
        eventSysId,
        documentTable: String((raw && raw.documentTable) || ''),
        documentId: String((raw && raw.documentId) || ''),
        createdAt: Number(created.numericValue) || Date.parse(String(created.value || '').replace(' ', 'T') + 'Z') || 0,
        createdAtDisplay: String(created.displayValue || created.value || ''),
        createdAtValue: String(created.value || ''),
        createdBy,
        author: users[createdBy] || unknownUser(createdBy),
        subtype: String((raw && raw.subtype) || ''),
        title: String((raw && raw.eventTitle) || ''),
        payload,
    }
    if (kind === 'journal') {
        entry.field = entry.subtype
        entry.content = String(payload.content || '')
        entry.truncated = !!payload.truncated
    } else if (kind === 'audit') {
        const values: any[] = Array.isArray(payload.auditValues) ? payload.auditValues : []
        entry.changes = values.map(
            (v): ActivityChange => ({
                field: String(v.fieldName || ''),
                label: String(v.fieldLabel || v.fieldName || ''),
                oldValue: v.oldValue === undefined || v.oldValue === null ? null : String(v.oldValue),
                newValue: v.newValue === undefined || v.newValue === null ? '' : String(v.newValue),
                type: String(v.type || ''),
            }),
        )
        entry.initial = eventSysId === '0' || (entry.changes.length > 0 && entry.changes.every((c) => c.oldValue === null))
    } else if (kind === 'attachment') {
        entry.attachment = {
            sysId: String(payload.sys_id || payload.sysId || payload.attachment || eventSysId),
            fileName: String(payload.fileName || payload.file_name || 'Attachment'),
            contentType: String(payload.contentType || payload.content_type || entry.subtype || ''),
            sizeBytes: Number(payload.sizeBytes || payload.size_bytes) || 0,
            tableName: String(payload.table_name || payload.tableName || entry.documentTable),
            removed: payload.state === 'deleted' || payload.deleted === true || payload.forRemoval === true,
        }
    } else if (kind === 'email') {
        entry.email = {
            subject: String(payload.subject || ''),
            from: String(payload.from || payload.user || ''),
            to: list(payload.to || payload.reducedTo || payload.recipients),
            cc: list(payload.cc || payload.copied),
            type: String(payload.type || ''),
        }
    } else if (kind === 'relation') {
        entry.content = String(payload.content || payload.description || '')
    }
    return entry
}

function normalizeFilterField(raw: any): ActivityFilterField {
    return {
        name: String(raw.name || ''),
        label: String(raw.label || raw.name || ''),
        journal: !!raw.journal,
        selected: raw.selected !== false,
        special: !!raw.specialField,
        eventTable: String(raw.eventTable || ''),
        subtype: raw.subType === null || raw.subType === undefined ? '' : String(raw.subType),
    }
}

/** The supplemental "background" config: { background: { subtype: { work_notes: 'yellow' } } }. */
function subtypeColorsOf(supplemental: any[]): Record<string, string> {
    const out: Record<string, string> = {}
    for (const s of supplemental || []) {
        if (s && (s.eventId || s.documentId || s.userSysId)) continue
        const p = parseJson(s && s.payload, null)
        const sub = p && p.background && p.background.subtype
        if (sub && typeof sub === 'object') Object.keys(sub).forEach((k) => (out[k] = String(sub[k])))
    }
    return out
}

export function sortEntries(entries: ActivityEntry[]): ActivityEntry[] {
    return entries.slice().sort((a, b) => b.createdAt - a.createdAt || (a.key < b.key ? 1 : -1))
}

/** The getEvents result → ActivityData. */
export function normalizeActivity(table: string, sysId: string, data: any): ActivityData {
    const r = (data && data.GlideActivity_Query && data.GlideActivity_Query.getEvents) || {}
    const users: Record<string, ActivityUser> = {}
    for (const u of r.userReferences || []) {
        const user = normalizeUser(u)
        if (user.userName) users[user.userName] = user
    }
    const entries = sortEntries((r.events || []).map((e: any) => normalizeEvent(e, users)))
    return {
        table,
        sysId,
        entries,
        filterFields: (r.filterFields || []).map(normalizeFilterField),
        users,
        ambChannels: (r.ambChannels || []).map(String),
        featureFlags: r.featureFlags || [],
        subtypeColors: subtypeColorsOf(r.supplemental || []),
    }
}

/** The record's activity (getEvents). `view` scopes the platform's filter configuration. */
export async function fetchActivity(table: string, sysId: string, view = '', signal?: AbortSignal): Promise<ActivityData> {
    safeName(table, 'table')
    if (!SYS_ID.test(sysId)) throw new Error(`Invalid sys_id "${sysId}"`)
    const data = await graphql(ACTIVITY_QUERY, { table, sysId, view: view || '' }, { signal, allowPartial: true })
    return normalizeActivity(table, sysId, data)
}

/** Post a journal entry (work note, comment) as Workspace's compose box does: GlideActivity_Mutation.putJournal. */
export async function postJournal(args: { table: string; sysId: string; field: string; value: string }): Promise<void> {
    safeName(args.table, 'table')
    safeName(args.field, 'field')
    if (!SYS_ID.test(args.sysId)) throw new Error(`Invalid sys_id "${args.sysId}"`)
    const value = String(args.value || '')
    if (!value.trim()) throw new Error('Nothing to post')
    const data = await graphql(PUT_JOURNAL_MUTATION, { table: args.table, sysId: args.sysId, field: args.field, value })
    const ok = data && data.GlideActivity_Mutation && data.GlideActivity_Mutation.putJournal
    if (ok !== true) throw new Error('The journal entry was not saved (no write access, or the record is read-only).')
}

/** An email entry's body (HTML; render it sanitised). */
export async function fetchEmailBody(emailSysId: string, signal?: AbortSignal): Promise<{ body: string; processed: boolean }> {
    const data = await graphql(EMAIL_BODY_QUERY, { emailSysIds: [emailSysId], sortDesc: true, useSizeLimit: false }, { signal })
    const rows = (data && data.GlideActivity_Query && data.GlideActivity_Query.getEmailBodies) || []
    const row = rows.find((r: any) => r && r.sysId === emailSysId) || rows[0] || {}
    return { body: String(row.body || ''), processed: row.processed !== false }
}

/** A truncated journal entry in full (the platform's UI API Workspace uses). */
export async function fetchFullJournalEntry(eventSysId: string, signal?: AbortSignal): Promise<string> {
    if (!SYS_ID.test(eventSysId)) throw new Error(`Invalid sys_id "${eventSysId}"`)
    const result = await restGet<any>(`/api/now/ui/stream_entry/full_entry?sysparm_sys_id=${eventSysId}`, signal)
    if (typeof result === 'string') return result
    return String((result && (result.content || result.value)) || '')
}

/** Which journal fields the user may write on this record (GlideRecord_Query field canWrite, ACL-evaluated). */
export async function fetchJournalAccess(table: string, sysId: string, fields: string[], signal?: AbortSignal): Promise<Record<string, boolean>> {
    const t = safeName(table, 'table')
    const names = fields.filter((f) => /^[a-z0-9_]+$/i.test(f))
    if (!names.length || !SYS_ID.test(sysId)) return {}
    const q = `query rpJournalAccess { GlideRecord_Query { ${t}(queryConditions: "sys_id=${sysId}") { _results { ${names.map((f) => `${f} { canWrite }`).join(' ')} } } } }`
    const data = await graphql(q, {}, { signal, allowPartial: true })
    const row = data && data.GlideRecord_Query && data.GlideRecord_Query[t] && data.GlideRecord_Query[t]._results && data.GlideRecord_Query[t]._results[0]
    const out: Record<string, boolean> = {}
    names.forEach((f) => (out[f] = !!(row && row[f] && row[f].canWrite)))
    return out
}

/**
 * Apply one AMB /activity/events message to cached data (insert / replace / remove by event).
 * Returns the same object when nothing changed.
 */
export function applyActivityMessage(data: ActivityData, event: any, userRefs: any[], operation: string): ActivityData {
    const users = { ...data.users }
    for (const u of userRefs || []) {
        const user = normalizeUser(u)
        if (user.userName) users[user.userName] = user
    }
    const entry = normalizeEvent(event, users)
    const rest = data.entries.filter((e) => e.key !== entry.key)
    if (operation === 'delete' || (event && event.forRemoval === true)) {
        return rest.length === data.entries.length ? data : { ...data, users, entries: rest }
    }
    return { ...data, users, entries: sortEntries(rest.concat(entry)) }
}
