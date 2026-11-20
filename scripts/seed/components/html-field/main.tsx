/**
 * components:app/html-field: HTML fields (html, translated_html, catalog variable type 23) on the
 * host kit's TipTap editor (components:rich-text-editor), read-only through components:rich-text.
 *
 *   <HtmlField name="text" />                         bound to the nearest form (kb_knowledge.text…)
 *   <HtmlField name="notes" label="Notes" value={html} onChange={(html) => …} />   standalone
 *
 * - FieldShell: label, required marker, hint, messages, dirty marker; the editor's contenteditable
 *   is the labelled control (aria-labelledby / -describedby / -invalid / -required).
 * - Values are HTML strings (sanitised on output, '' when empty). Keystrokes stage; leaving the
 *   editor commits, and only when the user changed something: a form that merely displays an
 *   article never writes back the editor's normalised copy.
 * - Content the editor can't represent (tables, colours, embedded media…) is named in a notice:
 *   editing simplifies it.
 * - Inline images: on a saved record (bound form, real sys_id, not a catalog variable) pasted,
 *   dropped or uploaded images are attached to that record, as the platform's HTML editor does
 *   (utilities:app/attachments uploadAttachment → POST /api/now/attachment/file, src =
 *   /sys_attachment.do?sys_id=…; new records use the sys_id the form reserved). Elsewhere images are
 *   URL-only. `imageUpload={false}` turns uploads off; `uploadImage(file)` replaces the uploader.
 * - g_form: setValue / getValue / setReadOnly / setMandatory / showFieldMsg work through the
 *   form store like every field.
 */
import { useMemo, useRef } from 'react'
import { useField, FieldShell } from 'components:app/field'
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field'
import { RichTextEditor } from 'components:rich-text-editor'
import { RichText, isHtmlEmpty, findUnsupportedHtml } from 'components:rich-text'
import { uploadAttachment, attachmentUrl, namePastedFile } from 'utilities:app/attachments'

export type HtmlFieldProps = FieldProps & {
    layout?: FieldLayout
    size?: FieldSize
    showOptional?: boolean
    className?: string
    /** Content area bounds (CSS lengths). */
    minHeight?: string
    maxHeight?: string
    /** false: images by URL only, even on a saved record. */
    imageUpload?: boolean
    /** Custom uploader (resolves with the image URL); wins over the record attachment upload. */
    uploadImage?: (file: File) => Promise<{ src: string; alt?: string }>
    /** Toolbar items to hide ('block', 'bold', 'italic', 'underline', 'strike', 'code', 'bulletList', 'orderedList', 'blockquote', 'link', 'image', 'undo', 'redo'). */
    toolbarHide?: string[]
}

const SYS_ID = /^[0-9a-f]{32}$/

/** Max image size for inline uploads (the platform's attachment limit still applies on top). */
export const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * Upload an image as an attachment of a record and return the URL to put in the HTML (the
 * platform HTML editor's convention: /sys_attachment.do?sys_id=<attachment>).
 */
export async function uploadRecordImage(args: { file: File; table: string; sysId: string }): Promise<{ src: string; alt: string; sysId: string; fileName: string }> {
    const { file, table, sysId } = args
    if (!/^image\//.test(file.type)) throw new Error(`${file.name} is not an image`)
    if (file.size > MAX_INLINE_IMAGE_BYTES) throw new Error(`${file.name} is larger than ${Math.round(MAX_INLINE_IMAGE_BYTES / 1024 / 1024)} MB`)
    // The shared attachment upload (utilities:app/attachments): same endpoint, plus progress / abort for other callers.
    const named = namePastedFile(file)
    const name = named.name || `pasted-image-${Date.now()}.png`
    const att = await uploadAttachment({ file: named, table, sysId, fileName: name })
    return { src: attachmentUrl(att.sysId), alt: name.replace(/\.[a-z0-9]+$/i, ''), sysId: att.sysId, fileName: att.fileName }
}

/** Where inline images of this field upload to, or null (URL-only). */
export function imageUploadTarget(field: { bound: boolean; name: string; table: string | undefined; lookup: { sysId: string } }): { table: string; sysId: string } | null {
    if (!field.bound || !field.table || field.name.indexOf('variables.') === 0 || field.name.indexOf('.') >= 0) return null
    const sysId = field.lookup.sysId
    return SYS_ID.test(sysId) ? { table: field.table, sysId } : null
}

export function HtmlField(props: HtmlFieldProps) {
    const field = useField(props)
    const current = field.staged ?? field.value
    const lastCommitted = useRef(field.value)
    lastCommitted.current = field.value

    const target = props.imageUpload === false ? null : imageUploadTarget(field)
    const uploader = props.uploadImage || (target ? (file: File) => uploadRecordImage({ file, table: target.table, sysId: target.sysId }) : undefined)
    const lost = useMemo(() => findUnsupportedHtml(field.originalValue), [field.originalValue])

    const readOnlyValue = isHtmlEmpty(field.value) ? undefined : <RichText html={field.value} />
    return (
        <FieldShell field={field} layout={props.layout} size={props.size} showOptional={props.showOptional} className={props.className} readOnlyValue={readOnlyValue}>
            <RichTextEditor
                id={field.ids.input}
                aria-labelledby={field.ids.label}
                aria-describedby={field.describedBy}
                invalid={field.invalid}
                required={field.state.mandatory}
                disabled={field.state.disabled}
                autoFocus={field.autoFocus}
                placeholder={field.placeholder}
                value={current}
                minHeight={props.minHeight || (props.size === 'sm' ? '5rem' : '8rem')}
                maxHeight={props.maxHeight}
                toolbarHide={props.toolbarHide}
                onUploadImage={uploader}
                notice={lost.length ? `This content has ${lost.join(', ')}, which the editor can’t keep: editing simplifies them.` : undefined}
                onChange={(html: string) => field.stage(html)}
                onBlur={(html: string, info: { changed: boolean }) => {
                    if (info.changed && html !== lastCommitted.current) field.setValue(html, html)
                    field.blur()
                }}
            />
        </FieldShell>
    )
}

export default function HtmlFieldPreview() {
    return (
        <div className="max-w-2xl p-4">
            <HtmlField
                name="notes"
                label="Notes"
                hint="Bold, lists, links (Ctrl+K), images by URL"
                defaultValue="<h3>Release notes</h3><p>The editor loads <strong>on demand</strong>: <a href='https://tiptap.dev'>TipTap</a> in its own chunk.</p><ul><li>Keyboard shortcuts</li><li>Sanitised paste</li></ul>"
            />
        </div>
    )
}
