/**
 * components:app/attachment-panel: a record's attachments, composed from app/attachment-dropzone
 * and app/attachment-list on utilities:app/attachments (useRecordAttachments).
 *
 *   <AttachmentPanel table="incident" sysId={sysId} />                  list + drop area
 *   <AttachmentPanel table="incident" sysId={sysId} layout="grid" dropzone="compact" />
 *   <AttachmentPanel layout="chips" dropzone="button" title={null} />   inside a form: table / sysId from it
 *
 * - Inside a <FormProvider> (RecordForm) it follows the form: its table and sys_id (the reserved
 *   one on a new record, so files can be added before the first save) and g_form.disableAttachments.
 * - The whole panel is a drop target; paste works while focus is in it (paste="window": anywhere).
 * - Read-only first: no create ACL, readOnly, or disabled by g_form → no drop zone, the reason as a hint.
 * - Live: another tab's uploads appear (AMB watch on sys_attachment).
 * - Everything presentational is swappable: layout, dropzone variant, renderItem, or build your own
 *   on useRecordAttachments.
 */
import { useRef } from 'react'
import { toast } from '@portal/runtime'
import { useRecordAttachments, useAttachments, useFileDrop, usePasteFiles, describeRules, downloadAllUrl } from 'utilities:app/attachments'
import type { Attachment, UseRecordAttachmentsOptions } from 'utilities:app/attachments'
import { AttachmentDropzone } from 'components:app/attachment-dropzone'
import { AttachmentList, UploadQueue } from 'components:app/attachment-list'
import type { AttachmentLayout, AttachmentItemContext } from 'components:app/attachment-list'
import { DialogOutlet } from 'components:app/confirm-dialog'
import { useFormContext, cx } from 'components:app/field'
import { Icon } from 'components:icon'

export type AttachmentPanelProps = {
    /** The record (default: the surrounding form's). */
    table?: string
    sysId?: string
    /** The form these attachments belong to (default: the surrounding FormProvider's). */
    form?: any
    layout?: AttachmentLayout
    /** How files are added: a drop area, a one-line strip, a header button, or not at all. */
    dropzone?: 'area' | 'compact' | 'button' | 'none'
    /** Heading ('Attachments'); null hides the header row. */
    title?: string | null
    /** Heading level for the title (default 3). */
    headingLevel?: 2 | 3 | 4
    readOnly?: boolean
    live?: boolean
    paste?: boolean | 'window'
    /** Narrow the platform's allowed extensions / size for this panel. */
    extensions?: string[] | string
    maxBytes?: number | null
    /** "Download all" (zip) when there are two or more files. Default true. */
    downloadAll?: boolean
    emptyText?: any
    showMeta?: boolean
    renderItem?: (a: Attachment, ctx: AttachmentItemContext) => any
    /** Extra header content (right side). */
    headerActions?: any
    /** No border / padding (the host card provides them). */
    bare?: boolean
    className?: string
    onUploaded?: UseRecordAttachmentsOptions['onUploaded']
    id?: string
}

export function AttachmentPanel(props: AttachmentPanelProps) {
    const ctxForm = useFormContext() as any
    const form = props.form || ctxForm
    const table = props.table || (form && form.table) || ''
    const sysId = props.sysId || (form && form.sysId) || ''
    const root = useRef<HTMLElement | null>(null)
    const att = useRecordAttachments(table, sysId, {
        form,
        readOnly: props.readOnly,
        extensions: props.extensions,
        maxBytes: props.maxBytes,
        live: props.live,
        onUploaded: props.onUploaded,
        onFailure: (m) => toast.error(m),
    })
    const { permission } = att
    const canUpload = permission.canUpload
    const variant = props.dropzone || 'area'
    // The whole panel accepts drops (the drop zone inside handles its own).
    const drop = useFileDrop({ onFiles: (f) => att.upload(f), disabled: !canUpload || variant === 'none' })
    usePasteFiles(props.paste === 'window' ? 'window' : root, (f) => att.upload(f), canUpload && variant !== 'none' && props.paste !== false)
    const hint = describeRules(permission.rules)
    const title = props.title === undefined ? 'Attachments' : props.title
    const H: any = `h${props.headingLevel || 3}`
    const showDownloadAll = props.downloadAll !== false && att.count > 1

    const dropButton =
        variant === 'button' && canUpload ? <AttachmentDropzone variant="button" onFiles={(f) => att.upload(f)} extensions={permission.rules.extensions} hint={hint} paste={false} busy={att.busy} /> : null

    return (
        <section
            ref={root as any}
            id={props.id}
            aria-label={title ? undefined : 'Attachments'}
            aria-labelledby={title ? `${props.id || 'rp-att'}-title` : undefined}
            aria-busy={att.isLoading || undefined}
            data-rp-attachment-panel={`${table}:${sysId}`}
            data-dragging={drop.dragging || undefined}
            {...drop.rootProps}
            className={cx('relative flex flex-col gap-3', !props.bare && 'rounded-xl border border-border bg-card p-4', props.className)}
        >
            <DialogOutlet />
            {title !== null || dropButton || showDownloadAll || props.headerActions ? (
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                    {title !== null ? (
                        <H id={`${props.id || 'rp-att'}-title`} className="m-0 mr-auto flex items-center gap-2 text-sm font-semibold">
                            <Icon name="paperclip" size={15} aria-hidden="true" className="text-muted-foreground" />
                            {title}
                            {att.count ? (
                                <span className="rounded-full bg-muted px-1.5 py-px text-xs font-medium text-muted-foreground" aria-label={`${att.count} files`}>
                                    {att.count}
                                </span>
                            ) : null}
                        </H>
                    ) : (
                        <span className="mr-auto" />
                    )}
                    {props.headerActions}
                    {showDownloadAll ? (
                        <a
                            href={downloadAllUrl(sysId)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                            data-rp-attachments-download-all=""
                        >
                            <Icon name="download" size={15} aria-hidden="true" /> Download all
                        </a>
                    ) : null}
                    {dropButton}
                </div>
            ) : null}

            {canUpload && (variant === 'area' || variant === 'compact') ? (
                <AttachmentDropzone variant={variant} onFiles={(f) => att.upload(f)} extensions={permission.rules.extensions} hint={hint} paste={false} busy={att.busy} />
            ) : null}

            {att.rejected.length ? (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" data-rp-attachments-rejected="">
                    <Icon name="circle-alert" size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-0.5 p-0">
                        {att.rejected.map((r, i) => (
                            <li key={i}>{r.message}</li>
                        ))}
                    </ul>
                    <button type="button" className="inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Dismiss" onClick={att.dismissRejected}>
                        <Icon name="x" size={14} aria-hidden="true" />
                    </button>
                </div>
            ) : null}

            <UploadQueue uploads={att.uploads} onCancel={att.cancel} onRetry={att.retry} onDismiss={att.dismiss} />

            {att.isLoading ? (
                <div className="flex flex-col gap-2" aria-hidden="true">
                    <span className="h-12 animate-pulse rounded-lg bg-muted" />
                    <span className="h-12 animate-pulse rounded-lg bg-muted" />
                </div>
            ) : att.error ? (
                <p className="text-sm text-destructive" role="alert">
                    {att.error.message}
                </p>
            ) : (
                <AttachmentList
                    attachments={att.attachments}
                    layout={props.layout}
                    readOnly={props.readOnly}
                    onDelete={att.remove}
                    onRename={att.rename}
                    pending={att.pending}
                    maxNameLength={permission.permissions ? permission.permissions.fileNameLength : undefined}
                    showMeta={props.showMeta}
                    renderItem={props.renderItem}
                    emptyText={props.emptyText !== undefined ? props.emptyText : canUpload ? null : 'No attachments'}
                />
            )}

            {!canUpload && permission.reason && !permission.loading && variant !== 'none' ? (
                <p className="m-0 text-xs text-muted-foreground" data-rp-attachments-readonly="">
                    {permission.reason}
                </p>
            ) : null}

            {drop.dragging ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/85 text-sm font-medium" aria-hidden="true">
                    <Icon name="download" size={18} className="mr-2" /> Drop files to attach
                </div>
            ) : null}
        </section>
    )
}

/**
 * A paperclip button with the record's attachment count (e.g. in a form header) that shows / hides
 * a panel: <AttachmentsToggle table sysId pressed={open} onPressedChange={setOpen} controls="panel-id" />.
 */
export function AttachmentsToggle(props: { table: string; sysId: string; pressed: boolean; onPressedChange: (pressed: boolean) => void; controls?: string; size?: 'sm' | 'icon-sm'; className?: string }) {
    const { count } = useAttachments(props.table, props.sysId)
    const label = count ? `Attachments (${count})` : 'Attachments'
    const iconOnly = props.size === 'icon-sm'
    return (
        <button
            type="button"
            aria-pressed={props.pressed}
            aria-controls={props.controls}
            aria-label={iconOnly ? label : undefined}
            title={label}
            onClick={() => props.onPressedChange(!props.pressed)}
            data-rp-attachments-toggle=""
            className={cx(
                'inline-flex h-7 shrink-0 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-transparent px-2 text-[0.8rem] font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50',
                props.pressed && 'bg-accent text-accent-foreground',
                props.className,
            )}
        >
            <Icon name="paperclip" size={14} aria-hidden="true" />
            {count ? <span className="tabular-nums">{count}</span> : null}
            {iconOnly ? null : <span className="sr-only">{count ? ` attachments` : 'Attachments'}</span>}
        </button>
    )
}

export default function AttachmentPanelPreview() {
    return (
        <div className="max-w-2xl p-4">
            <AttachmentPanel table="incident" sysId="1964bd1783e05310e8fbc9a6feaad338" />
        </div>
    )
}
