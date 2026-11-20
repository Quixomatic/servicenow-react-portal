/**
 * components:app/attachment-field: single-file fields, the file_attachment and user_image
 * dictionary types (registered in app/field-control).
 *
 *   <AttachmentField name="customer_order" />          bound to the nearest form
 *   <FieldControl name="photo" table="sys_user" />      picks this for user_image
 *
 * As Workspace's sn-record-file-attachment: the file uploads to ZZ_YY<table> / the record's sys_id
 * (the reserved one on a new record), so it stays out of the record's attachment list; the field
 * value is the attachment sys_id, the display value its file name. user_image accepts images only
 * (jpg, jpeg, png, bmp, gif, ico, svg) and shows a preview. The instance limits
 * (com.glide.attachment.max_size, glide.attachment.extensions) apply when the portal exposes them.
 *
 * - Choose / drop / paste a file (the drop zone is a button); progress with Cancel while uploading.
 * - Replace, Rename (keeps the extension), Remove (clears the value; saved with the record).
 * - Read-only (dictionary, ACL, UI policy, g_form.setReadOnly): the file as a link / the image.
 */
import { useRef, useState } from 'react';
import { useQuery } from 'utilities:react-query';
import { useField, FieldShell, cx } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { Icon } from 'components:icon';
import {
    uploadAttachment,
    renameAttachment,
    fetchAttachment,
    validateFiles,
    describeRules,
    useAttachmentLimits,
    attachmentUrl,
    formatBytes,
    isPreviewableImage,
    isAttachableSysId,
    USER_IMAGE_EXTENSIONS,
    FIELD_ATTACHMENT_PREFIX,
} from 'utilities:app/attachments';
import type { Attachment } from 'utilities:app/attachments';
import { AttachmentDropzone } from 'components:app/attachment-dropzone';
import { AttachmentIcon, AttachmentRenameInput, UploadProgress } from 'components:app/attachment-list';

export type AttachmentFieldProps = FieldProps & {
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
    /** 'image' = user_image behaviour (default from the dictionary type). */
    kind?: 'file' | 'image';
    /** Narrow the allowed extensions. */
    extensions?: string[];
    /** Narrow the size limit (bytes). */
    maxBytes?: number;
    /** Where the file uploads (default ZZ_YY<field table> / the form's sys_id). */
    target?: { table: string; sysId: string };
};

const IIX = /^[0-9a-f]{32}\.iix$/i;

const iconBtn =
    'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

export function AttachmentField(props: AttachmentFieldProps) {
    const field = useField(props);
    const isImage = props.kind ? props.kind === 'image' : field.meta.type === 'user_image';
    const limits = useAttachmentLimits();
    const [busy, setBusy] = useState<{ name: string; progress: number } | null>(null);
    const [error, setError] = useState('');
    const [renaming, setRenaming] = useState(false);
    const controller = useRef<AbortController | null>(null);

    const target =
        props.target ||
        (field.table ? { table: FIELD_ATTACHMENT_PREFIX + field.table, sysId: field.lookup.sysId } : null);
    const canAttach = !!target && isAttachableSysId(target.sysId);
    const base = isImage ? USER_IMAGE_EXTENSIONS : limits.extensions;
    const extensions =
        props.extensions && props.extensions.length
            ? base.length
                ? props.extensions.filter((e) => base.indexOf(e) >= 0)
                : props.extensions
            : base;
    const maxBytes =
        [limits.maxBytes, props.maxBytes].filter((n): n is number => !!n && n > 0).sort((a, b) => a - b)[0] || null;
    const rules = {
        extensions,
        maxBytes,
        multiple: false,
        readOnly: !canAttach,
        readOnlyReason: 'Save the record before attaching a file.',
    };

    const value = field.value;
    const meta = useQuery<Attachment | null>({
        queryKey: ['rp-attachments', 'one', value],
        queryFn: ({ signal }: { signal?: AbortSignal }) => fetchAttachment(value, signal),
        enabled: isAttachableSysId(value),
        staleTime: 60000,
    });
    const att = meta.data || null;
    const name =
        (att && att.fileName) ||
        (field.displayValue && !IIX.test(field.displayValue)
            ? field.displayValue
            : isImage
              ? 'Image'
              : value
                ? 'Attached file'
                : '');
    const showImage = isImage || (att ? isPreviewableImage(att.fileName, att.contentType) : false);

    const upload = async (files: File[]) => {
        setError('');
        const { accepted, rejected } = validateFiles(files, rules);
        if (rejected.length) return setError(rejected[0].message);
        const file = accepted[0];
        if (!file || !target) return;
        const c = new AbortController();
        controller.current = c;
        setBusy({ name: file.name, progress: 0 });
        try {
            const res = await uploadAttachment({
                file,
                table: target.table,
                sysId: target.sysId,
                signal: c.signal,
                onProgress: (p) => setBusy({ name: file.name, progress: p }),
            });
            field.setValue(res.sysId, res.fileName);
            field.blur();
        } catch (e) {
            if ((e as Error).name !== 'AbortError') setError((e as Error).message);
        } finally {
            controller.current = null;
            setBusy(null);
        }
    };

    const rename = async (fileName: string) => {
        setRenaming(false);
        try {
            const kept = await renameAttachment(value, fileName);
            field.setValue(value, kept);
            meta.refetch();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const shellField = error
        ? {
              ...field,
              messages: [{ kind: 'error' as const, text: error, id: 'upload' }].concat(field.messages),
              invalid: true,
          }
        : field;
    const readOnly = field.state.readOnly || field.state.disabled;

    const preview = value ? (
        showImage ? (
            <a
                href={attachmentUrl(value)}
                target="_blank"
                rel="noopener"
                className="block shrink-0 overflow-hidden rounded-md border border-border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Open ${name}`}
            >
                <img
                    src={attachmentUrl(value)}
                    alt=""
                    className={cx('object-cover', isImage ? 'size-16' : 'size-10')}
                />
            </a>
        ) : (
            <AttachmentIcon name={name} contentType={att ? att.contentType : ''} />
        )
    ) : null;

    const readOnlyValue = value ? (
        <span className="flex min-w-0 items-center gap-3">
            {preview}
            <a
                href={attachmentUrl(value)}
                download={name}
                className="min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline"
            >
                {name}
            </a>
        </span>
    ) : undefined;

    return (
        <FieldShell
            field={shellField}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={readOnlyValue}
        >
            {busy ? (
                <div
                    className="flex min-h-10 items-center gap-3 rounded-md border border-input bg-background px-3 py-2"
                    id={field.ids.input}
                    aria-describedby={field.describedBy}
                    data-rp-attachment-field="uploading"
                >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-baseline gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate">{busy.name}</span>
                            <span className="text-xs text-muted-foreground">{Math.round(busy.progress * 100)}%</span>
                        </span>
                        <UploadProgress value={busy.progress} label={`Uploading ${busy.name}`} />
                    </div>
                    <button
                        type="button"
                        className={iconBtn}
                        aria-label={`Cancel uploading ${busy.name}`}
                        onClick={() => controller.current && controller.current.abort()}
                    >
                        <Icon name="x" size={15} aria-hidden="true" />
                    </button>
                </div>
            ) : value ? (
                <div
                    className="flex min-h-10 items-center gap-3 rounded-md border border-input bg-background px-2 py-1.5"
                    data-rp-attachment-field="value"
                >
                    {preview}
                    {renaming && att ? (
                        <AttachmentRenameInput attachment={att} onCommit={rename} onCancel={() => setRenaming(false)} />
                    ) : (
                        <span className="flex min-w-0 flex-1 flex-col">
                            <a
                                id={field.ids.input}
                                aria-describedby={field.describedBy}
                                href={attachmentUrl(value)}
                                download={name}
                                className="min-w-0 truncate text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                            >
                                {name}
                            </a>
                            {att ? (
                                <span className="text-xs text-muted-foreground">{formatBytes(att.size)}</span>
                            ) : null}
                        </span>
                    )}
                    {renaming ? null : (
                        <span className="flex shrink-0 items-center gap-0.5">
                            <AttachmentDropzone
                                variant="button"
                                multiple={false}
                                extensions={extensions}
                                onFiles={upload}
                                label={isImage ? 'Replace' : 'Replace'}
                                paste={false}
                                disabled={!canAttach}
                            />
                            {att && !isImage ? (
                                <button
                                    type="button"
                                    className={iconBtn}
                                    aria-label={`Rename ${name}`}
                                    title="Rename"
                                    onClick={() => setRenaming(true)}
                                >
                                    <Icon name="pencil" size={15} aria-hidden="true" />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className={cx(iconBtn, 'hover:text-destructive')}
                                aria-label={`Remove ${name}`}
                                title="Remove"
                                onClick={() => field.setValue('', '')}
                                data-rp-attachment-field-remove=""
                            >
                                <Icon name="trash-2" size={15} aria-hidden="true" />
                            </button>
                        </span>
                    )}
                </div>
            ) : (
                <AttachmentDropzone
                    id={field.ids.input}
                    aria-describedby={field.describedBy}
                    variant="compact"
                    multiple={false}
                    extensions={extensions}
                    onFiles={upload}
                    disabled={readOnly || !canAttach}
                    disabledReason={!canAttach ? 'Save the record before attaching a file.' : undefined}
                    label={isImage ? 'Choose an image or drop it here' : 'Choose a file or drop it here'}
                    hint={describeRules(rules)}
                />
            )}
        </FieldShell>
    );
}

export default function AttachmentFieldPreview() {
    return (
        <div className="flex max-w-md flex-col gap-4 p-4">
            <AttachmentField name="doc" label="Contract" type="file_attachment" />
            <AttachmentField name="photo" label="Photo" type="user_image" kind="image" />
        </div>
    );
}
