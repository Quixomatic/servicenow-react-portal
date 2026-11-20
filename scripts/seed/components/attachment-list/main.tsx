/**
 * components:app/attachment-list: attachments as a list, a grid of tiles or compact chips, with
 * file-type icons, image thumbnails, size / uploader / date, download, inline rename, delete
 * (confirmed through app/confirm-dialog) and an image preview dialog (components:dialog).
 *
 *   <AttachmentList attachments={list} layout="grid" onDelete={…} onRename={…} />
 *   <AttachmentList attachments={list} renderItem={(a, ctx) => <MyRow … onClick={ctx.download} />} />
 *   <UploadQueue uploads={up.uploads} onCancel={up.cancel} onRetry={up.retry} />
 *
 * Presentation only: data and mutations come from utilities:app/attachments (useAttachments,
 * useDeleteAttachment, useRenameAttachment). Every part is exported for your own layouts:
 * AttachmentIcon, AttachmentThumbnail, AttachmentRow, AttachmentTile, AttachmentChip,
 * AttachmentRenameInput, AttachmentActions, ImagePreviewDialog, UploadQueue, UploadProgress,
 * formatAttachmentDate, attachmentMeta, confirmDeleteAttachment.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from 'components:icon';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from 'components:dialog';
import { confirmDialog } from 'components:app/confirm-dialog';
import { cx } from 'components:app/field';
import {
    fileKind,
    fileIconName,
    fileBaseName,
    fileExtension,
    withExtensionOf,
    isPreviewableImage,
    formatBytes,
} from 'utilities:app/attachments';
import type { Attachment, FileKind, UploadItem } from 'utilities:app/attachments';

export type AttachmentLayout = 'list' | 'grid' | 'chips';

/** What a custom renderItem gets for one attachment. */
export type AttachmentItemContext = {
    layout: AttachmentLayout;
    canDelete: boolean;
    canRename: boolean;
    canPreview: boolean;
    renaming: boolean;
    startRename: () => void;
    cancelRename: () => void;
    /** Full new name (the extension is kept by AttachmentRenameInput). */
    commitRename: (fileName: string) => void;
    /** Asks for confirmation, then calls onDelete. */
    remove: () => void;
    preview: () => void;
    /** The download URL. */
    href: string;
    busy: boolean;
};

export type AttachmentListProps = {
    attachments: Attachment[];
    layout?: AttachmentLayout;
    /** Delete (confirmed first unless confirmDelete={false}); hidden when absent or the file's canDelete is false. */
    onDelete?: (a: Attachment) => unknown;
    /** Rename to the full new name; hidden when absent or the file's canRename is false. */
    onRename?: (a: Attachment, fileName: string) => unknown;
    /** Image click: default opens the built-in preview dialog; pass your own to override. */
    onPreview?: (a: Attachment) => void;
    confirmDelete?: boolean;
    readOnly?: boolean;
    /** Max length of a file name (GlideAttachmentQuery fileNameLength). */
    maxNameLength?: number;
    /** Show uploader / date in the meta line (default true). */
    showMeta?: boolean;
    showThumbnails?: boolean;
    emptyText?: any;
    /** Replace the built-in row / tile / chip. */
    renderItem?: (a: Attachment, ctx: AttachmentItemContext) => any;
    className?: string;
    /** Accessible name of the list. */
    label?: string;
    /** sys_ids whose mutation is in flight (rendered dimmed). */
    pending?: string[];
};

// ---- helpers -----------------------------------------------------------------------------------

/** "Just now", "5 min ago", "Yesterday", or a short date; title = the full local date and time. */
export function formatAttachmentDate(a: { createdOn?: string; dateLabel?: string }): { text: string; title: string } {
    const v = String(a.createdOn || '');
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(v);
    if (!m) return { text: a.dateLabel || '', title: a.dateLabel || '' };
    const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const d = new Date(ms);
    const title = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const diff = (Date.now() - ms) / 1000;
    if (diff < 45) return { text: 'Just now', title };
    if (diff < 3600) return { text: `${Math.max(1, Math.round(diff / 60))} min ago`, title };
    if (diff < 86400 && new Date().getDate() === d.getDate())
        return { text: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), title };
    if (diff < 2 * 86400) return { text: 'Yesterday', title };
    return {
        text: d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
        }),
        title,
    };
}

/** "34 KB · admin · 5 min ago". */
export function attachmentMeta(a: Attachment, opts: { uploader?: boolean; date?: boolean } = {}): string {
    const parts = [formatBytes(a.size)];
    if (opts.uploader !== false && a.createdBy) parts.push(a.createdBy);
    if (opts.date !== false) parts.push(formatAttachmentDate(a).text);
    return parts.filter(Boolean).join(' · ');
}

/** The standard confirmation: resolves true when the user confirms. */
export function confirmDeleteAttachment(a: { fileName: string }): Promise<boolean> {
    return confirmDialog({
        title: 'Delete attachment?',
        description: `“${a.fileName}” will be deleted. This can’t be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
    });
}

const KIND_TINT: Record<FileKind, string> = {
    image: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
    pdf: 'bg-red-500/12 text-red-700 dark:text-red-300',
    spreadsheet: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    document: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
    presentation: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
    archive: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    audio: 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300',
    video: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
    code: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
    text: 'bg-muted text-muted-foreground',
    other: 'bg-muted text-muted-foreground',
};

// ---- parts -------------------------------------------------------------------------------------

/** File-type icon in a tinted square. */
export function AttachmentIcon(props: { name: string; contentType?: string; size?: number; className?: string }) {
    const kind = fileKind(props.name, props.contentType);
    const px = props.size || 36;
    return (
        <span
            className={cx(
                'inline-flex shrink-0 items-center justify-center rounded-md',
                KIND_TINT[kind],
                props.className
            )}
            style={{ width: px, height: px }}
            data-rp-file-kind={kind}
        >
            <Icon name={fileIconName(kind)} size={Math.round(px * 0.5)} aria-hidden="true" />
        </span>
    );
}

/** Image thumbnail (lazy) or the file-type icon. */
export function AttachmentThumbnail(props: {
    attachment: Attachment;
    size?: number;
    className?: string;
    fill?: boolean;
}) {
    const a = props.attachment;
    const [failed, setFailed] = useState(false);
    const px = props.size || 36;
    if (isPreviewableImage(a.fileName, a.contentType) && !failed) {
        return (
            <img
                src={a.url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
                className={cx(
                    'shrink-0 rounded-md bg-muted object-cover',
                    props.fill && 'h-full w-full',
                    props.className
                )}
                style={props.fill ? undefined : { width: px, height: px }}
            />
        );
    }
    if (props.fill) {
        return (
            <span
                className={cx(
                    'flex h-full w-full items-center justify-center',
                    KIND_TINT[fileKind(a.fileName, a.contentType)],
                    props.className
                )}
            >
                <Icon name={fileIconName(a.fileName, a.contentType)} size={32} aria-hidden="true" />
            </span>
        );
    }
    return <AttachmentIcon name={a.fileName} contentType={a.contentType} size={px} className={props.className} />;
}

/** Inline rename: base name editable, extension fixed. Enter saves, Escape cancels. */
export function AttachmentRenameInput(props: {
    attachment: Attachment;
    onCommit: (fileName: string) => void;
    onCancel: () => void;
    maxLength?: number;
    className?: string;
}) {
    const a = props.attachment;
    const ext = fileExtension(a.fileName) ? a.fileName.slice(a.fileName.lastIndexOf('.')) : '';
    const [value, setValue] = useState(fileBaseName(a.fileName));
    const input = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
        if (input.current) {
            input.current.focus();
            input.current.select();
        }
    }, []);
    const done = useRef(false);
    const commit = () => {
        if (done.current) return;
        done.current = true;
        const v = value.trim();
        if (!v || v === fileBaseName(a.fileName)) props.onCancel();
        else props.onCommit(withExtensionOf(a.fileName, v));
    };
    const max = props.maxLength ? Math.max(1, props.maxLength - ext.length) : undefined;
    return (
        <span className={cx('flex min-w-0 flex-1 items-center gap-1', props.className)}>
            <input
                ref={input}
                value={value}
                maxLength={max}
                aria-label={`New name for ${a.fileName}`}
                onChange={(e: any) => setValue(e.target.value)}
                onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        done.current = true;
                        props.onCancel();
                    }
                }}
                onBlur={commit}
                className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {ext ? <span className="shrink-0 text-sm text-muted-foreground">{ext}</span> : null}
        </span>
    );
}

const iconBtn =
    'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

/** Download / rename / delete icon buttons. */
export function AttachmentActions(props: { attachment: Attachment; ctx: AttachmentItemContext; className?: string }) {
    const { attachment: a, ctx } = props;
    return (
        <span className={cx('flex shrink-0 items-center gap-0.5', props.className)} data-rp-attachment-actions="">
            <a
                href={ctx.href}
                download={a.fileName}
                className={iconBtn}
                aria-label={`Download ${a.fileName}`}
                title="Download"
                data-rp-attachment-download=""
            >
                <Icon name="download" size={15} aria-hidden="true" />
            </a>
            {ctx.canRename ? (
                <button
                    type="button"
                    className={iconBtn}
                    aria-label={`Rename ${a.fileName}`}
                    title="Rename"
                    onClick={ctx.startRename}
                    disabled={ctx.busy}
                    data-rp-attachment-rename=""
                >
                    <Icon name="pencil" size={15} aria-hidden="true" />
                </button>
            ) : null}
            {ctx.canDelete ? (
                <button
                    type="button"
                    className={cx(iconBtn, 'hover:text-destructive')}
                    aria-label={`Delete ${a.fileName}`}
                    title="Delete"
                    onClick={ctx.remove}
                    disabled={ctx.busy}
                    data-rp-attachment-delete=""
                >
                    <Icon name="trash-2" size={15} aria-hidden="true" />
                </button>
            ) : null}
        </span>
    );
}

/** The file name: a preview button for images, else a download link. */
function NameLink({ a, ctx, className }: { a: Attachment; ctx: AttachmentItemContext; className?: string }) {
    const cls = cx(
        'min-w-0 truncate text-left font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline',
        className
    );
    return ctx.canPreview ? (
        <button type="button" className={cls} onClick={ctx.preview} title={a.fileName}>
            {a.fileName}
        </button>
    ) : (
        <a href={ctx.href} download={a.fileName} className={cls} title={a.fileName}>
            {a.fileName}
        </a>
    );
}

/** List layout: one row per file. */
export function AttachmentRow(props: {
    attachment: Attachment;
    ctx: AttachmentItemContext;
    showMeta?: boolean;
    showThumbnail?: boolean;
    maxNameLength?: number;
}) {
    const { attachment: a, ctx } = props;
    const date = formatAttachmentDate(a);
    return (
        <div
            className={cx('flex min-h-12 items-center gap-3 px-3 py-2', ctx.busy && 'opacity-60')}
            data-rp-attachment={a.sysId}
        >
            {props.showThumbnail === false ? (
                <AttachmentIcon name={a.fileName} contentType={a.contentType} />
            ) : ctx.canPreview ? (
                <button
                    type="button"
                    className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={ctx.preview}
                    aria-label={`Preview ${a.fileName}`}
                    tabIndex={-1}
                >
                    <AttachmentThumbnail attachment={a} />
                </button>
            ) : (
                <AttachmentThumbnail attachment={a} />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
                {ctx.renaming ? (
                    <AttachmentRenameInput
                        attachment={a}
                        onCommit={ctx.commitRename}
                        onCancel={ctx.cancelRename}
                        maxLength={props.maxNameLength}
                    />
                ) : (
                    <NameLink a={a} ctx={ctx} className="text-sm" />
                )}
                <span className="truncate text-xs text-muted-foreground" title={date.title}>
                    {props.showMeta === false ? formatBytes(a.size) : attachmentMeta(a)}
                </span>
            </div>
            {ctx.renaming ? null : <AttachmentActions attachment={a} ctx={ctx} />}
        </div>
    );
}

/** Grid layout: a tile with a large thumbnail. */
export function AttachmentTile(props: {
    attachment: Attachment;
    ctx: AttachmentItemContext;
    showMeta?: boolean;
    maxNameLength?: number;
}) {
    const { attachment: a, ctx } = props;
    const date = formatAttachmentDate(a);
    return (
        <div
            className={cx(
                'group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card',
                ctx.busy && 'opacity-60'
            )}
            data-rp-attachment={a.sysId}
        >
            {/* Actions sit on the thumbnail (always visible: touch and keyboard), so the meta line keeps its width. */}
            {ctx.renaming ? null : (
                <AttachmentActions
                    attachment={a}
                    ctx={ctx}
                    className="absolute top-1.5 right-1.5 z-10 rounded-md bg-background/90 p-0.5 shadow-sm ring-1 ring-border"
                />
            )}
            {ctx.canPreview ? (
                <button
                    type="button"
                    className="aspect-[4/3] w-full overflow-hidden bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    onClick={ctx.preview}
                    aria-label={`Preview ${a.fileName}`}
                >
                    <AttachmentThumbnail
                        attachment={a}
                        fill
                        className="rounded-none transition-transform group-hover:scale-[1.02]"
                    />
                </button>
            ) : (
                <a
                    href={ctx.href}
                    download={a.fileName}
                    className="block aspect-[4/3] w-full overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    aria-label={`Download ${a.fileName}`}
                    tabIndex={-1}
                >
                    <AttachmentThumbnail attachment={a} fill className="rounded-none" />
                </a>
            )}
            <div className="flex min-w-0 flex-col gap-0.5 p-2">
                {ctx.renaming ? (
                    <AttachmentRenameInput
                        attachment={a}
                        onCommit={ctx.commitRename}
                        onCancel={ctx.cancelRename}
                        maxLength={props.maxNameLength}
                    />
                ) : (
                    <NameLink a={a} ctx={ctx} className="text-sm" />
                )}
                <span className="min-w-0 truncate text-xs text-muted-foreground" title={date.title}>
                    {props.showMeta === false ? formatBytes(a.size) : `${formatBytes(a.size)} · ${date.text}`}
                </span>
            </div>
        </div>
    );
}

/** Chips layout: a compact pill (name, size, delete). */
export function AttachmentChip(props: { attachment: Attachment; ctx: AttachmentItemContext; maxNameLength?: number }) {
    const { attachment: a, ctx } = props;
    if (ctx.renaming) {
        return (
            <span
                className="inline-flex max-w-full items-center rounded-full border border-border bg-background py-0.5 pr-1 pl-2"
                data-rp-attachment={a.sysId}
            >
                <AttachmentRenameInput
                    attachment={a}
                    onCommit={ctx.commitRename}
                    onCancel={ctx.cancelRename}
                    maxLength={props.maxNameLength}
                    className="min-w-40"
                />
            </span>
        );
    }
    return (
        <span
            className={cx(
                'inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-background pr-1 pl-1 text-sm',
                ctx.busy && 'opacity-60'
            )}
            data-rp-attachment={a.sysId}
        >
            {isPreviewableImage(a.fileName, a.contentType) ? (
                <AttachmentThumbnail attachment={a} size={22} className="rounded-full" />
            ) : (
                <AttachmentIcon name={a.fileName} contentType={a.contentType} size={22} className="rounded-full" />
            )}
            <NameLink a={a} ctx={ctx} className="max-w-[16rem] text-[0.8rem]" />
            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.size)}</span>
            {ctx.canRename ? (
                <button
                    type="button"
                    className={cx(iconBtn, 'size-6 rounded-full')}
                    aria-label={`Rename ${a.fileName}`}
                    title="Rename"
                    onClick={ctx.startRename}
                    disabled={ctx.busy}
                >
                    <Icon name="pencil" size={13} aria-hidden="true" />
                </button>
            ) : null}
            {ctx.canDelete ? (
                <button
                    type="button"
                    className={cx(iconBtn, 'size-6 rounded-full hover:text-destructive')}
                    aria-label={`Delete ${a.fileName}`}
                    title="Delete"
                    onClick={ctx.remove}
                    disabled={ctx.busy}
                    data-rp-attachment-delete=""
                >
                    <Icon name="x" size={14} aria-hidden="true" />
                </button>
            ) : null}
        </span>
    );
}

// ---- image preview -----------------------------------------------------------------------------

/** Image preview with previous / next (arrow keys) across the given images. */
export function ImagePreviewDialog(props: {
    attachment: Attachment | null;
    images?: Attachment[];
    onOpenChange: (open: boolean) => void;
    onNavigate?: (a: Attachment) => void;
}) {
    const a = props.attachment;
    const list = props.images && props.images.length ? props.images : a ? [a] : [];
    const index = a ? list.findIndex((x) => x.sysId === a.sysId) : -1;
    const go = (d: number) => {
        if (index < 0 || list.length < 2 || !props.onNavigate) return;
        props.onNavigate(list[(index + d + list.length) % list.length]);
    };
    return (
        <Dialog open={!!a} onOpenChange={(open: boolean) => props.onOpenChange(open)}>
            {a ? (
                <DialogContent
                    className="flex w-[min(64rem,calc(100vw-2rem))] max-w-none flex-col gap-3 sm:max-w-none"
                    data-rp-attachment-preview=""
                    onKeyDown={(e: any) => {
                        if (e.key === 'ArrowRight') go(1);
                        else if (e.key === 'ArrowLeft') go(-1);
                    }}
                >
                    <div className="flex min-w-0 items-center gap-2 pr-8">
                        <DialogTitle className="min-w-0 truncate text-base font-semibold">{a.fileName}</DialogTitle>
                        <DialogDescription className="shrink-0 text-xs">
                            {attachmentMeta(a)}
                            {list.length > 1 ? ` · ${index + 1} of ${list.length}` : ''}
                        </DialogDescription>
                    </div>
                    <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        <img src={a.url} alt={a.fileName} className="max-h-[70vh] w-auto max-w-full object-contain" />
                        {list.length > 1 ? (
                            <>
                                <button
                                    type="button"
                                    className="absolute top-1/2 left-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
                                    aria-label="Previous image"
                                    onClick={() => go(-1)}
                                >
                                    <Icon name="chevron-left" size={18} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
                                    aria-label="Next image"
                                    onClick={() => go(1)}
                                >
                                    <Icon name="chevron-right" size={18} aria-hidden="true" />
                                </button>
                            </>
                        ) : null}
                    </div>
                    <div className="flex justify-end">
                        <a
                            href={a.url}
                            download={a.fileName}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                            <Icon name="download" size={15} aria-hidden="true" /> Download
                        </a>
                    </div>
                </DialogContent>
            ) : null}
        </Dialog>
    );
}

// ---- the list ----------------------------------------------------------------------------------

export function AttachmentList(props: AttachmentListProps) {
    const layout = props.layout || 'list';
    const [renaming, setRenaming] = useState('');
    const [previewing, setPreviewing] = useState<Attachment | null>(null);
    const images = props.attachments.filter((a) => isPreviewableImage(a.fileName, a.contentType));
    const pending = props.pending || [];

    if (!props.attachments.length) {
        return props.emptyText === null ? null : (
            <p className="px-1 py-2 text-sm text-muted-foreground" data-rp-attachments-empty="">
                {props.emptyText === undefined ? 'No attachments' : props.emptyText}
            </p>
        );
    }

    const ctxFor = (a: Attachment): AttachmentItemContext => {
        const canPreview = isPreviewableImage(a.fileName, a.contentType);
        return {
            layout,
            canDelete: !props.readOnly && !!props.onDelete && a.canDelete,
            canRename: !props.readOnly && !!props.onRename && a.canRename,
            canPreview,
            renaming: renaming === a.sysId,
            startRename: () => setRenaming(a.sysId),
            cancelRename: () => setRenaming(''),
            commitRename: (name: string) => {
                setRenaming('');
                if (props.onRename) props.onRename(a, name);
            },
            remove: async () => {
                if (!props.onDelete) return;
                if (props.confirmDelete === false || (await confirmDeleteAttachment(a))) props.onDelete(a);
            },
            preview: () => (props.onPreview ? props.onPreview(a) : setPreviewing(a)),
            href: a.url,
            busy: pending.indexOf(a.sysId) >= 0,
        };
    };

    const items = props.attachments.map((a) => {
        const ctx = ctxFor(a);
        const node = props.renderItem ? (
            props.renderItem(a, ctx)
        ) : layout === 'grid' ? (
            <AttachmentTile attachment={a} ctx={ctx} showMeta={props.showMeta} maxNameLength={props.maxNameLength} />
        ) : layout === 'chips' ? (
            <AttachmentChip attachment={a} ctx={ctx} maxNameLength={props.maxNameLength} />
        ) : (
            <AttachmentRow
                attachment={a}
                ctx={ctx}
                showMeta={props.showMeta}
                showThumbnail={props.showThumbnails}
                maxNameLength={props.maxNameLength}
            />
        );
        return (
            <li key={a.sysId} className={layout === 'chips' ? 'max-w-full' : 'min-w-0'}>
                {node}
            </li>
        );
    });

    return (
        <>
            <ul
                aria-label={props.label || 'Attachments'}
                data-rp-attachment-list={layout}
                className={cx(
                    'm-0 list-none p-0',
                    layout === 'grid'
                        ? 'grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3'
                        : layout === 'chips'
                          ? 'flex flex-wrap gap-2'
                          : 'flex flex-col divide-y divide-border rounded-lg border border-border',
                    props.className
                )}
            >
                {items}
            </ul>
            {props.onPreview ? null : (
                <ImagePreviewDialog
                    attachment={previewing}
                    images={images}
                    onOpenChange={(open) => !open && setPreviewing(null)}
                    onNavigate={setPreviewing}
                />
            )}
        </>
    );
}

// ---- uploads in progress -----------------------------------------------------------------------

/** A determinate progress bar (role=progressbar). */
export function UploadProgress(props: {
    value: number;
    label?: string;
    className?: string;
    tone?: 'default' | 'error';
}) {
    const pct = Math.round(Math.max(0, Math.min(1, props.value)) * 100);
    return (
        <span
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={props.label}
            className={cx('block h-1.5 w-full overflow-hidden rounded-full bg-muted', props.className)}
        >
            <span
                className={cx(
                    'block h-full rounded-full transition-[width] duration-150',
                    props.tone === 'error' ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${pct}%` }}
            />
        </span>
    );
}

/** Files being uploaded: name, progress, cancel / retry / dismiss. Announces completions politely. */
export function UploadQueue(props: {
    uploads: UploadItem[];
    onCancel?: (id: string) => void;
    onRetry?: (id: string) => void;
    onDismiss?: (id: string) => void;
    className?: string;
    compact?: boolean;
}) {
    const done = props.uploads.filter((u) => u.status === 'done').map((u) => u.name);
    const failed = props.uploads.filter((u) => u.status === 'error').map((u) => u.name);
    return (
        <>
            <span className="sr-only" aria-live="polite">
                {done.length ? `Uploaded ${done.join(', ')}.` : ''}{' '}
                {failed.length ? `Failed: ${failed.join(', ')}.` : ''}
            </span>
            {props.uploads.length ? (
                <ul
                    className={cx('m-0 flex list-none flex-col gap-1.5 p-0', props.className)}
                    aria-label="Uploads"
                    data-rp-upload-queue=""
                >
                    {props.uploads.map((u) => (
                        <li
                            key={u.id}
                            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                            data-rp-upload={u.status}
                        >
                            {props.compact ? null : (
                                <AttachmentIcon name={u.name} contentType={u.file.type} size={28} />
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex min-w-0 items-baseline gap-2 text-sm">
                                    <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                                    <span
                                        className={cx(
                                            'shrink-0 text-xs',
                                            u.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                                        )}
                                    >
                                        {u.status === 'uploading'
                                            ? `${Math.round(u.progress * 100)}%`
                                            : u.status === 'queued'
                                              ? 'Waiting…'
                                              : u.status === 'staged'
                                                ? 'Uploads after saving'
                                                : u.status === 'done'
                                                  ? 'Uploaded'
                                                  : u.status === 'canceled'
                                                    ? 'Canceled'
                                                    : 'Failed'}
                                    </span>
                                </div>
                                {u.status === 'error' ? (
                                    <span className="text-xs text-destructive" role="alert">
                                        {u.error}
                                    </span>
                                ) : u.status === 'uploading' || u.status === 'queued' || u.status === 'done' ? (
                                    <UploadProgress
                                        value={u.status === 'done' ? 1 : u.progress}
                                        label={`Uploading ${u.name}`}
                                    />
                                ) : null}
                            </div>
                            {(u.status === 'uploading' || u.status === 'queued' || u.status === 'staged') &&
                            props.onCancel ? (
                                <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Cancel ${u.name}`}
                                    title="Cancel"
                                    onClick={() => props.onCancel!(u.id)}
                                    data-rp-upload-cancel=""
                                >
                                    <Icon name="x" size={15} aria-hidden="true" />
                                </button>
                            ) : null}
                            {(u.status === 'error' || u.status === 'canceled') && props.onRetry ? (
                                <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Retry ${u.name}`}
                                    title="Retry"
                                    onClick={() => props.onRetry!(u.id)}
                                >
                                    <Icon name="rotate-cw" size={15} aria-hidden="true" />
                                </button>
                            ) : null}
                            {(u.status === 'error' || u.status === 'canceled' || u.status === 'done') &&
                            props.onDismiss ? (
                                <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Dismiss ${u.name}`}
                                    title="Dismiss"
                                    onClick={() => props.onDismiss!(u.id)}
                                >
                                    <Icon name="check" size={15} aria-hidden="true" />
                                </button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : null}
        </>
    );
}

export default function AttachmentListPreview() {
    const now = new Date(Date.now() - 5 * 60000).toISOString().replace('T', ' ').slice(0, 19);
    const sample: Attachment[] = [
        {
            sysId: 'a1',
            fileName: 'network-diagram.pdf',
            contentType: 'application/pdf',
            size: 248000,
            table: 'incident',
            tableSysId: 'x',
            createdOn: now,
            createdBy: 'abel.tuter',
            updatedOn: now,
            dateLabel: '',
            state: 'available',
            canDelete: true,
            canRename: true,
            isEncrypted: false,
            url: '#',
        },
        {
            sysId: 'a2',
            fileName: 'error-log.txt',
            contentType: 'text/plain',
            size: 5300,
            table: 'incident',
            tableSysId: 'x',
            createdOn: now,
            createdBy: 'beth.anglin',
            updatedOn: now,
            dateLabel: '',
            state: 'available',
            canDelete: false,
            canRename: false,
            isEncrypted: false,
            url: '#',
        },
        {
            sysId: 'a3',
            fileName: 'budget.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: 1900000,
            table: 'incident',
            tableSysId: 'x',
            createdOn: now,
            createdBy: 'abel.tuter',
            updatedOn: now,
            dateLabel: '',
            state: 'available',
            canDelete: true,
            canRename: true,
            isEncrypted: false,
            url: '#',
        },
    ];
    return (
        <div className="flex max-w-2xl flex-col gap-6 p-4">
            <AttachmentList
                attachments={sample}
                layout="list"
                onDelete={() => {}}
                onRename={() => {}}
                confirmDelete={false}
            />
            <AttachmentList
                attachments={sample}
                layout="grid"
                onDelete={() => {}}
                onRename={() => {}}
                confirmDelete={false}
            />
            <AttachmentList
                attachments={sample}
                layout="chips"
                onDelete={() => {}}
                onRename={() => {}}
                confirmDelete={false}
            />
        </div>
    );
}
