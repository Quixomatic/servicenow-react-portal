import { useId, useState } from 'react'
import { RichText, safeUrl } from 'components:rich-text'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { cx, Spinner } from 'components:app/field'
import { formatBytes, relativeTime, useEmailBody, useFullJournalEntry } from 'utilities:app/activity'
import type { ActivityEntry, ActivityUser } from 'utilities:app/activity'
import { isInternalJournalField, journalTone } from 'components:app/journal-field'

/** Initials avatar (or the user's photo when the platform has one). */
export function ActivityAvatar({ user, size = 'md', className }: { user: ActivityUser; size?: 'sm' | 'md'; className?: string }) {
    const [broken, setBroken] = useState(false)
    const src = user.avatar && !broken ? safeUrl(user.avatar.charAt(0) === '/' || /^https?:/.test(user.avatar) ? user.avatar : `/${user.avatar}`, 'src') : ''
    const dims = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs'
    return src ? (
        <img src={src} alt="" aria-hidden="true" onError={() => setBroken(true)} className={cx('shrink-0 rounded-full object-cover', dims, className)} />
    ) : (
        <span aria-hidden="true" className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border select-none', dims, className)}>
            {user.initials}
        </span>
    )
}

/** A renderer for attachment entries (the attachments primitive can register a richer one). */
export type AttachmentRenderer = (entry: ActivityEntry) => any
let attachmentRenderer: AttachmentRenderer | null = null
/**
 * Seam for utilities:app/attachments: register a renderer for attachment entries (file icon,
 * preview, download). Returns the unregister function. Until one is registered, a minimal
 * built-in entry renders (name, size, type icon, image thumbnail, download link).
 */
export function registerActivityAttachmentRenderer(renderer: AttachmentRenderer | null): () => void {
    attachmentRenderer = renderer
    return () => {
        if (attachmentRenderer === renderer) attachmentRenderer = null
    }
}

function fileIcon(contentType: string, name: string): string {
    const t = String(contentType || '').toLowerCase()
    const ext = String(name || '').split('.').pop()!.toLowerCase()
    if (t.indexOf('image/') === 0) return 'file-image'
    if (t.indexOf('video/') === 0) return 'file-video'
    if (t.indexOf('audio/') === 0) return 'file-audio'
    if (t === 'application/pdf' || ext === 'pdf') return 'file-text'
    if (/zip|compressed|tar|gzip/.test(t) || /^(zip|gz|tgz|7z|rar)$/.test(ext)) return 'file-archive'
    if (/sheet|excel|csv/.test(t) || /^(xlsx?|csv)$/.test(ext)) return 'file-spreadsheet'
    if (/json|javascript|xml|html/.test(t) || /^(js|ts|json|xml|html?)$/.test(ext)) return 'file-code'
    return 'file'
}

/** Minimal built-in attachment entry. */
export function AttachmentBody({ entry }: { entry: ActivityEntry }) {
    const a = entry.attachment!
    const url = `/sys_attachment.do?sys_id=${encodeURIComponent(a.sysId)}`
    const image = a.contentType.indexOf('image/') === 0 && !a.removed
    return (
        <div className="flex flex-col gap-2" data-rp-activity-attachment={a.sysId}>
            <div className="flex min-w-0 items-center gap-2 text-sm">
                <Icon name={fileIcon(a.contentType, a.fileName)} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {a.removed ? (
                    <span className="truncate text-muted-foreground line-through">{a.fileName}</span>
                ) : (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-primary underline-offset-4 hover:underline" download={a.fileName}>
                        {a.fileName}
                    </a>
                )}
                {a.sizeBytes ? <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.sizeBytes)}</span> : null}
                {a.removed ? <span className="shrink-0 text-xs text-muted-foreground">(removed)</span> : null}
            </div>
            {image ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="block w-fit" tabIndex={-1} aria-hidden="true">
                    <img src={url} alt="" loading="lazy" className="max-h-40 max-w-full rounded-md border border-border object-contain" />
                </a>
            ) : null}
        </div>
    )
}

/** Field changes: label, previous value → new value (the creation entry lists the initial values). */
export function FieldChanges({ entry }: { entry: ActivityEntry }) {
    const changes = entry.changes || []
    return (
        <dl className="grid grid-cols-1 gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(7rem,max-content)_minmax(0,1fr)]" data-rp-activity-changes="">
            {changes.map((c) => (
                <div key={c.field} className="contents">
                    <dt className="text-muted-foreground">{c.label}</dt>
                    <dd className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-1.5 break-words">
                        {c.oldValue !== null ? (
                            <>
                                <span className="text-muted-foreground line-through decoration-muted-foreground/50">{c.oldValue || <em className="not-italic opacity-70">empty</em>}</span>
                                <Icon name="arrow-right" className="size-3 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
                                <span className="sr-only"> changed to </span>
                            </>
                        ) : null}
                        <span className="font-medium text-foreground">{c.newValue || <em className="font-normal not-italic text-muted-foreground">empty</em>}</span>
                    </dd>
                </div>
            ))}
        </dl>
    )
}

function JournalBody({ entry }: { entry: ActivityEntry }) {
    const [full, setFull] = useState(false)
    const more = useFullJournalEntry(entry.eventSysId, { enabled: full && !!entry.truncated })
    const html = full && more.data ? more.data : entry.content || ''
    return (
        <div className="flex flex-col gap-1">
            {/* Journal text keeps its line breaks; HTML (code blocks, links) is sanitised by RichText. */}
            <RichText html={html} size="sm" className="break-words whitespace-pre-wrap text-foreground" />
            {entry.truncated && !(full && more.data) ? (
                <Button type="button" variant="link" size="xs" className="h-auto self-start px-0" onClick={() => setFull(true)} disabled={more.isFetching}>
                    {more.isFetching ? <Spinner /> : null}Show the full entry
                </Button>
            ) : null}
        </div>
    )
}

function EmailBody({ entry }: { entry: ActivityEntry }) {
    const [open, setOpen] = useState(false)
    const body = useEmailBody(entry.eventSysId, { enabled: open })
    const id = useId()
    const m = entry.email!
    return (
        <div className="flex flex-col gap-1.5 text-sm">
            <div className="font-medium text-foreground">{m.subject || '(no subject)'}</div>
            <div className="text-xs text-muted-foreground">
                {m.from ? <span>From {m.from}</span> : null}
                {m.to.length ? <span> · To {m.to.join(', ')}</span> : null}
                {m.cc.length ? <span> · Cc {m.cc.join(', ')}</span> : null}
            </div>
            <Button type="button" variant="link" size="xs" className="h-auto self-start px-0" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
                {open ? 'Hide email' : 'Show email'}
            </Button>
            {open ? (
                <div id={id} className="rounded-md border border-border bg-muted/30 p-3">
                    {body.isLoading ? <Spinner /> : body.error ? <span className="text-destructive">The email could not be loaded.</span> : <RichText html={body.data ? body.data.body : ''} size="sm" />}
                </div>
            ) : null}
        </div>
    )
}

/** What an entry is, as a short label ('Work notes', 'Field changes', …). */
export function entryLabel(entry: ActivityEntry): string {
    if (entry.kind === 'audit') return entry.initial ? 'Created' : 'Field changes'
    if (entry.kind === 'attachment') return entry.attachment && entry.attachment.removed ? 'Attachment removed' : 'Attachment added'
    if (entry.kind === 'email') return entry.email && entry.email.type === 'received' ? 'Email received' : 'Email sent'
    return entry.title || entry.kind
}

function kindIcon(entry: ActivityEntry): string {
    if (entry.kind === 'journal') return isInternalJournalField(entry.field || '') ? 'lock' : 'message-square'
    if (entry.kind === 'audit') return entry.initial ? 'sparkles' : 'pencil-line'
    if (entry.kind === 'attachment') return 'paperclip'
    if (entry.kind === 'email') return entry.email && entry.email.type === 'received' ? 'mail-open' : 'mail'
    if (entry.kind === 'relation') return 'link'
    return 'circle-dot'
}

export type ActivityEntryProps = {
    entry: ActivityEntry
    now: number
    locale?: string
    /** aria-posinset / aria-setsize (feed). */
    position: number
    setSize: number
    fresh?: boolean
    compact?: boolean
    renderAttachment?: AttachmentRenderer
}

/** One feed article: avatar, author, what happened, when, and the body for its kind. */
export function ActivityEntryView(props: ActivityEntryProps) {
    const { entry, now } = props
    const labelId = useId()
    const bodyId = useId()
    const internal = entry.kind === 'journal' && isInternalJournalField(entry.field || '')
    const journal = entry.kind === 'journal'
    const tone = journalTone(entry.field || '')
    const when = relativeTime(entry.createdAt, now, props.locale)
    const iso = entry.createdAt ? new Date(entry.createdAt).toISOString() : undefined
    const label = entryLabel(entry)
    const custom = entry.kind === 'attachment' ? props.renderAttachment || attachmentRenderer : null
    return (
        <article
            tabIndex={0}
            aria-posinset={props.position}
            aria-setsize={props.setSize}
            aria-labelledby={labelId}
            aria-describedby={bodyId}
            data-rp-activity-entry={entry.kind}
            data-rp-activity-key={entry.key}
            data-rp-activity-field={entry.field || undefined}
            data-rp-new={props.fresh ? '' : undefined}
            className={cx(
                'group/entry relative flex gap-3 rounded-lg outline-none transition-[background-color,box-shadow] duration-700 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                props.compact ? 'p-2' : 'p-3',
                journal ? cx('border border-l-4', internal ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-border bg-card', tone.accent) : 'border border-transparent',
                props.fresh ? 'ring-2 ring-primary/40' : '',
            )}
        >
            <ActivityAvatar user={entry.author} size={props.compact ? 'sm' : 'md'} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-medium text-foreground">{entry.author.displayName}</span>
                    <span
                        className={cx(
                            'inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[11px] font-medium',
                            journal ? tone.badge : 'border-border bg-muted text-muted-foreground',
                        )}
                    >
                        <Icon name={kindIcon(entry)} className="size-3" aria-hidden="true" />
                        {label}
                    </span>
                    <time dateTime={iso} title={entry.createdAtDisplay} className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {when}
                    </time>
                    <span id={labelId} className="sr-only">
                        {`${label} by ${entry.author.displayName}, ${when} (${entry.createdAtDisplay})`}
                    </span>
                </div>
                <div id={bodyId} className="min-w-0">
                    {entry.kind === 'journal' ? <JournalBody entry={entry} /> : null}
                    {entry.kind === 'audit' ? <FieldChanges entry={entry} /> : null}
                    {entry.kind === 'attachment' ? (custom ? custom(entry) : <AttachmentBody entry={entry} />) : null}
                    {entry.kind === 'email' ? <EmailBody entry={entry} /> : null}
                    {entry.kind === 'relation' || entry.kind === 'other' ? <RichText html={entry.content || entry.title} size="sm" className="text-muted-foreground" /> : null}
                </div>
            </div>
        </article>
    )
}
