/**
 * components:app/attachment-dropzone: a file drop target that is also a real button.
 *
 *   <AttachmentDropzone onFiles={(files) => up.upload(files)} hint="pdf, png · up to 10 MB" />
 *   <AttachmentDropzone variant="compact" … />      one-line strip
 *   <AttachmentDropzone variant="button" … />       just a button (still accepts drops)
 *   <AttachmentDropzone>{({ dragging, open }) => <MyLook … />}</AttachmentDropzone>   your own markup
 *
 * - Drag and drop files onto it, click / Enter / Space to browse, or paste (Ctrl/⌘+V) while it has
 *   focus (`paste="window"`: anywhere on the page outside text fields).
 * - Validation is the caller's (utilities:app/attachments validateFiles / useUploadAttachments).
 * - Presentation only: the logic is useFileDrop / usePasteFiles in utilities:app/attachments.
 */
import { useRef } from 'react';
import { useFileDrop, usePasteFiles } from 'utilities:app/attachments';
import { Icon } from 'components:icon';
import { cx } from 'components:app/field';

export type AttachmentDropzoneProps = {
    onFiles: (files: File[]) => void;
    disabled?: boolean;
    /** Why it's disabled (shown instead of the hint). */
    disabledReason?: string;
    multiple?: boolean;
    /** Allowed extensions for the file picker. */
    extensions?: string[];
    variant?: 'area' | 'compact' | 'button';
    /** Main text (default "Drop files here or browse"). */
    label?: string;
    /** Secondary text, e.g. describeRules(rules). */
    hint?: string;
    /** Accept pasted files: true (when focused, default), 'window' (anywhere), false. */
    paste?: boolean | 'window';
    /** Spinner / busy text in the zone. */
    busy?: boolean;
    className?: string;
    /** Custom content: render prop with the drop state. */
    children?: (state: { dragging: boolean; open: () => void; disabled: boolean }) => any;
    id?: string;
    'aria-describedby'?: string;
};

export function AttachmentDropzone(props: AttachmentDropzoneProps) {
    const root = useRef<HTMLDivElement | null>(null);
    const disabled = !!props.disabled;
    const drop = useFileDrop({
        onFiles: props.onFiles,
        disabled,
        multiple: props.multiple,
        extensions: props.extensions,
    });
    usePasteFiles(props.paste === 'window' ? 'window' : root, props.onFiles, !disabled && props.paste !== false);
    const variant = props.variant || 'area';
    const label =
        props.label || (props.multiple === false ? 'Drop a file here or browse' : 'Drop files here or browse');
    const hint = disabled && props.disabledReason ? props.disabledReason : props.hint;

    if (props.children) {
        return (
            <div
                ref={root}
                {...drop.rootProps}
                data-rp-dropzone=""
                data-dragging={drop.dragging || undefined}
                className={cx('relative', props.className)}
            >
                <input {...(drop.inputProps as any)} />
                {props.children({ dragging: drop.dragging, open: drop.open, disabled })}
            </div>
        );
    }

    if (variant === 'button') {
        return (
            <div
                ref={root}
                {...drop.rootProps}
                data-rp-dropzone="button"
                data-dragging={drop.dragging || undefined}
                className={cx('relative inline-flex', props.className)}
            >
                <input {...(drop.inputProps as any)} />
                <button
                    type="button"
                    id={props.id}
                    disabled={disabled}
                    aria-describedby={props['aria-describedby']}
                    title={hint || undefined}
                    onClick={drop.open}
                    className={cx(
                        'inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
                        drop.dragging && 'border-primary bg-accent'
                    )}
                >
                    <Icon
                        name={props.busy ? 'loader-circle' : 'paperclip'}
                        size={15}
                        className={props.busy ? 'animate-spin' : undefined}
                        aria-hidden="true"
                    />
                    {props.label || 'Attach'}
                </button>
            </div>
        );
    }

    const compact = variant === 'compact';
    return (
        <div
            ref={root}
            {...drop.rootProps}
            data-rp-dropzone={variant}
            data-dragging={drop.dragging || undefined}
            className={cx('relative', props.className)}
        >
            <input {...(drop.inputProps as any)} />
            <button
                type="button"
                id={props.id}
                disabled={disabled}
                aria-describedby={props['aria-describedby']}
                onClick={drop.open}
                className={cx(
                    'flex w-full items-center rounded-lg border border-dashed text-sm text-muted-foreground outline-none transition-colors',
                    'hover:bg-accent/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
                    compact
                        ? 'min-h-10 gap-2 px-3 py-2 text-left'
                        : 'min-h-24 flex-col justify-center gap-1.5 px-4 py-5 text-center',
                    drop.dragging ? 'border-primary bg-primary/5 text-foreground' : 'border-input bg-background'
                )}
            >
                <Icon
                    name={props.busy ? 'loader-circle' : drop.dragging ? 'download' : 'upload'}
                    size={compact ? 16 : 20}
                    className={cx('shrink-0', props.busy && 'animate-spin')}
                    aria-hidden="true"
                />
                <span
                    className={cx(
                        'min-w-0',
                        compact ? 'flex flex-wrap items-baseline gap-x-2' : 'flex flex-col gap-0.5'
                    )}
                >
                    <span className="font-medium text-foreground">{drop.dragging ? 'Drop to upload' : label}</span>
                    {hint ? <span className="text-xs">{hint}</span> : null}
                </span>
            </button>
        </div>
    );
}

export default function AttachmentDropzonePreview() {
    return (
        <div className="flex max-w-lg flex-col gap-4 p-4">
            <AttachmentDropzone onFiles={(f) => alert(f.map((x) => x.name).join(', '))} hint="Any file · up to 2 GB" />
            <AttachmentDropzone
                variant="compact"
                onFiles={(f) => alert(f.map((x) => x.name).join(', '))}
                hint="pdf, png"
            />
            <AttachmentDropzone variant="button" onFiles={(f) => alert(f.map((x) => x.name).join(', '))} />
            <AttachmentDropzone
                disabled
                disabledReason="You can’t add attachments to this record."
                onFiles={() => {}}
            />
        </div>
    );
}
