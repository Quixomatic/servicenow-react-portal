/**
 * components:app/attachment-variable: a single-file attachment variable.
 *
 * Choosing (or dropping) a file uploads it to the catalog form's draft record (the table the
 * platform reserved for this form, prefixed ZZ_YY as the platform does for variable
 * attachments); the value is the attachment sys_id, the display value the file name. Allowed
 * extensions and the size limit are checked before uploading. Keyboard: the drop zone is a
 * button that opens the file picker; Remove clears the value.
 */
import { useRef, useState } from 'react';
import { useField, FieldShell, cx, adornmentButtonClass, IconX, Spinner } from 'components:app/field';
import type { FieldProps, FieldLayout } from 'components:app/field';
import { uploadVariableAttachment } from 'utilities:app/catalog';

export type AttachmentVariableProps = FieldProps & {
    draftTable: string;
    draftSysId: string;
    /** 'pdf,jpeg' or 'pdf;jpeg'. */
    allowedExtensions?: string;
    maxBytes?: number;
    layout?: FieldLayout;
};

function fmtBytes(n: number) {
    return n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(n % 1024 ** 2 ? 1 : 0)} MB` : `${Math.ceil(n / 1024)} KB`;
}

export function AttachmentVariable(props: AttachmentVariableProps) {
    const field = useField(props);
    const input = useRef<HTMLInputElement | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [over, setOver] = useState(false);
    const exts = String(props.allowedExtensions || '')
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean);
    const accept = exts.length ? exts.map((e) => `.${e}`).join(',') : undefined;
    const limits = [exts.length ? exts.join(', ') : '', props.maxBytes ? `up to ${fmtBytes(props.maxBytes)}` : '']
        .filter(Boolean)
        .join(' · ');

    const upload = async (file: File | undefined) => {
        if (!file) return;
        setError('');
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (exts.length && exts.indexOf(ext) < 0) return setError(`Use a ${exts.join(', ')} file`);
        if (props.maxBytes && file.size > props.maxBytes)
            return setError(`The file is larger than ${fmtBytes(props.maxBytes)}`);
        if (!props.draftTable || !props.draftSysId) return setError('This form has no draft record to attach to');
        setBusy(true);
        try {
            const r = await uploadVariableAttachment({
                file,
                draftTable: props.draftTable,
                draftSysId: props.draftSysId,
            });
            field.setValue(r.sysId, r.fileName);
            field.blur();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const shellField = error
        ? {
              ...field,
              messages: [{ kind: 'error' as const, text: error, id: 'upload' }].concat(field.messages),
              invalid: true,
          }
        : field;
    return (
        <FieldShell field={shellField} layout={props.layout} readOnlyValue={field.displayValue || undefined}>
            <input
                ref={input}
                type="file"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                accept={accept}
                onChange={(e: any) => upload(e.target.files && e.target.files[0])}
            />
            {field.value ? (
                <div className="rpf-control flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                    <span className="truncate" id={field.ids.input}>
                        {field.displayValue || field.value}
                    </span>
                    <button
                        type="button"
                        className={cx(adornmentButtonClass, 'ml-auto')}
                        aria-label={`Remove ${field.displayValue || 'attachment'}`}
                        onClick={() => field.setValue('', '')}
                    >
                        <IconX size={14} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    id={field.ids.input}
                    aria-describedby={field.describedBy}
                    aria-invalid={shellField.invalid || undefined}
                    aria-required={field.state.mandatory || undefined}
                    disabled={field.state.disabled || busy}
                    className={cx(
                        'rpf-control flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-background px-3 py-3 text-sm text-muted-foreground outline-none',
                        'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        over ? 'border-primary bg-accent' : shellField.invalid ? 'border-destructive' : 'border-input'
                    )}
                    onClick={() => input.current && input.current.click()}
                    onDragOver={(e: any) => {
                        e.preventDefault();
                        setOver(true);
                    }}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e: any) => {
                        e.preventDefault();
                        setOver(false);
                        upload(e.dataTransfer.files && e.dataTransfer.files[0]);
                    }}
                >
                    {busy ? (
                        <Spinner label="Uploading" />
                    ) : (
                        <span className="text-foreground">Choose a file or drop it here</span>
                    )}
                    {limits ? <span className="text-xs">{limits}</span> : null}
                </button>
            )}
        </FieldShell>
    );
}

export default function AttachmentVariablePreview() {
    return (
        <div className="max-w-md p-4">
            <AttachmentVariable
                name="doc"
                label="Document"
                draftTable=""
                draftSysId=""
                allowedExtensions="pdf,jpeg"
                maxBytes={2 * 1024 * 1024}
            />
        </div>
    );
}
