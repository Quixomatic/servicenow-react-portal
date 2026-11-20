/**
 * File helpers shared by every attachment surface (panel, list, field, activity stream…): file kinds
 * and their Lucide icon names, sizes, extensions, URLs, and the upload checks.
 */

export type FileKind = 'image' | 'pdf' | 'spreadsheet' | 'document' | 'presentation' | 'archive' | 'audio' | 'video' | 'code' | 'text' | 'other'

const KIND_BY_EXT: Record<string, FileKind> = {
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', bmp: 'image', webp: 'image', svg: 'image', ico: 'image', tif: 'image', tiff: 'image', heic: 'image', iix: 'image',
    pdf: 'pdf',
    xls: 'spreadsheet', xlsx: 'spreadsheet', xlsm: 'spreadsheet', csv: 'spreadsheet', ods: 'spreadsheet', numbers: 'spreadsheet',
    doc: 'document', docx: 'document', odt: 'document', rtf: 'document', pages: 'document',
    ppt: 'presentation', pptx: 'presentation', odp: 'presentation', key: 'presentation',
    zip: 'archive', rar: 'archive', '7z': 'archive', gz: 'archive', tgz: 'archive', tar: 'archive', bz2: 'archive',
    mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio', aac: 'audio',
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video', flv: 'video', wmv: 'video', m4v: 'video',
    js: 'code', ts: 'code', tsx: 'code', jsx: 'code', json: 'code', xml: 'code', html: 'code', htm: 'code', css: 'code', py: 'code', java: 'code', sh: 'code', sql: 'code', yml: 'code', yaml: 'code',
    txt: 'text', log: 'text', md: 'text', eml: 'text', msg: 'text',
}

/** Lucide icon per kind (render with components:icon `<Icon name={fileIconName(kind)} />`). */
export const FILE_KIND_ICONS: Record<FileKind, string> = {
    image: 'file-image',
    pdf: 'file-text',
    spreadsheet: 'file-spreadsheet',
    document: 'file-text',
    presentation: 'presentation',
    archive: 'file-archive',
    audio: 'file-audio',
    video: 'file-video',
    code: 'file-code',
    text: 'file-text',
    other: 'file',
}

/** Lower-case extension without the dot ('' when none). The platform's `.iix` image names count as png. */
export function fileExtension(name: string): string {
    const n = String(name || '')
    const i = n.lastIndexOf('.')
    if (i <= 0 || i === n.length - 1) return ''
    const ext = n.slice(i + 1).toLowerCase()
    return ext === 'iix' ? 'png' : ext
}

/** The name without its extension. */
export function fileBaseName(name: string): string {
    const n = String(name || '')
    const i = n.lastIndexOf('.')
    return i > 0 ? n.slice(0, i) : n
}

/** A rename that keeps the original extension: ('report.pdf', 'Q3 report') → 'Q3 report.pdf'. */
export function withExtensionOf(original: string, base: string): string {
    const ext = String(original || '').lastIndexOf('.') > 0 ? String(original).slice(String(original).lastIndexOf('.') + 1) : ''
    const b = String(base || '').trim()
    return ext ? `${b}.${ext}` : b
}

export function fileKind(name: string, contentType?: string): FileKind {
    const ct = String(contentType || '').toLowerCase()
    if (ct.indexOf('image/') === 0) return 'image'
    if (ct === 'application/pdf') return 'pdf'
    if (ct.indexOf('audio/') === 0) return 'audio'
    if (ct.indexOf('video/') === 0) return 'video'
    return KIND_BY_EXT[fileExtension(name)] || (ct.indexOf('text/') === 0 ? 'text' : 'other')
}

export function fileIconName(nameOrKind: string, contentType?: string): string {
    const kind = (nameOrKind in FILE_KIND_ICONS ? nameOrKind : fileKind(nameOrKind, contentType)) as FileKind
    return FILE_KIND_ICONS[kind]
}

/** Images the browser can show inline (thumbnails, preview). */
export function isPreviewableImage(name: string, contentType?: string): boolean {
    const ct = String(contentType || '').toLowerCase()
    if (ct) return /^image\/(png|jpe?g|gif|webp|bmp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(ct)
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'].indexOf(fileExtension(name)) >= 0
}

/** 1536 → "1.5 KB" (binary units, as the platform shows them). */
export function formatBytes(bytes: number | string | null | undefined): string {
    const n = Number(bytes)
    if (!isFinite(n) || n < 0) return ''
    if (n < 1024) return `${n} B`
    const units = ['KB', 'MB', 'GB', 'TB']
    let v = n / 1024
    let u = 0
    while (v >= 1024 && u < units.length - 1) {
        v /= 1024
        u++
    }
    return `${v >= 10 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1)} ${units[u]}`
}

// ---- URLs (same-origin, session cookie) ---------------------------------------------------------

/** The file itself (download, or inline for images). */
export function attachmentUrl(sysId: string): string {
    return `/sys_attachment.do?sys_id=${encodeURIComponent(sysId)}`
}

/** A zip of every attachment of a record (or only `ids`), as Workspace's "Download all". */
export function downloadAllUrl(sysId: string, ids?: string[]): string {
    return `/download_all_attachments.do?sysparm_sys_id=${encodeURIComponent(sysId)}${ids && ids.length ? `&sysparm_attachment_ids=${ids.map(encodeURIComponent).join(',')}` : ''}`
}

const SYS_ID = /^[0-9a-f]{32}$/

/** A real (or reserved) record sys_id that attachments can point at. */
export function isAttachableSysId(sysId: string | null | undefined): boolean {
    return SYS_ID.test(String(sysId || ''))
}

// ---- upload checks -----------------------------------------------------------------------------

export type UploadRules = {
    /** Allowed extensions (lower case, no dot); empty = anything the server accepts. */
    extensions?: string[]
    /** Max bytes per file (null/0 = no client-side limit; the server still enforces its own). */
    maxBytes?: number | null
    /** Uploading is not allowed at all (read-only record, g_form.disableAttachments, no create ACL). */
    readOnly?: boolean
    /** Why uploading is off, shown as the rejection message. */
    readOnlyReason?: string
    /** Max file name length (GlideAttachmentQuery's fileNameLength). */
    fileNameLength?: number
    /** Allow more than one file (else only the first is kept). */
    multiple?: boolean
}

export type RejectReason = 'read-only' | 'extension' | 'size' | 'empty' | 'name' | 'count'
export type Rejection = { file: File; reason: RejectReason; message: string }

/** "pdf, .JPG;png" → ['pdf', 'jpg', 'png']. */
export function parseExtensions(input: string | string[] | null | undefined): string[] {
    const list = Array.isArray(input) ? input : String(input || '').split(/[,;\s]+/)
    return list.map((s) => String(s).trim().toLowerCase().replace(/^\*?\./, '')).filter(Boolean)
}

/** The `accept` attribute for a file input ('.pdf,.png'), or undefined for anything. */
export function acceptAttribute(extensions?: string[]): string | undefined {
    return extensions && extensions.length ? extensions.map((e) => `.${e}`).join(',') : undefined
}

/** A one-line summary of the rules ("pdf, png · up to 10 MB"). */
export function describeRules(rules: UploadRules): string {
    return [rules.extensions && rules.extensions.length ? rules.extensions.join(', ') : '', rules.maxBytes ? `up to ${formatBytes(rules.maxBytes)}` : ''].filter(Boolean).join(' · ')
}

/**
 * Split files into the ones to upload and the rejected ones (with a message each). Checks run in
 * the platform's order: read-only first, then extension, empty file, size, name length.
 */
export function validateFiles(input: File[] | FileList | null | undefined, rules: UploadRules = {}): { accepted: File[]; rejected: Rejection[] } {
    const files = Array.from((input || []) as ArrayLike<File>)
    const accepted: File[] = []
    const rejected: Rejection[] = []
    const exts = rules.extensions || []
    for (const file of files) {
        if (rules.readOnly) {
            rejected.push({ file, reason: 'read-only', message: rules.readOnlyReason || 'Attachments can’t be added here.' })
            continue
        }
        if (!rules.multiple && accepted.length >= 1) {
            rejected.push({ file, reason: 'count', message: `Only one file can be added: ${file.name} was skipped.` })
            continue
        }
        if (exts.length && exts.indexOf(fileExtension(file.name)) < 0) {
            rejected.push({ file, reason: 'extension', message: `${file.name}: this file type isn’t allowed (use ${exts.join(', ')}).` })
            continue
        }
        if (file.size === 0) {
            rejected.push({ file, reason: 'empty', message: `${file.name} is empty.` })
            continue
        }
        if (rules.maxBytes && file.size > rules.maxBytes) {
            rejected.push({ file, reason: 'size', message: `${file.name} is ${formatBytes(file.size)}. The maximum file size is ${formatBytes(rules.maxBytes)}.` })
            continue
        }
        if (rules.fileNameLength && file.name.length > rules.fileNameLength) {
            rejected.push({ file, reason: 'name', message: `${file.name.slice(0, 40)}…: the file name is longer than ${rules.fileNameLength} characters.` })
            continue
        }
        accepted.push(file)
    }
    return { accepted, rejected }
}

/** A pasted image arrives as "image.png": give it a unique, readable name. */
export function namePastedFile(file: File): File {
    if (file.name && !/^image\.(png|jpe?g|gif|webp)$/i.test(file.name)) return file
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*$/, '')
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
    try {
        return new File([file], `pasted-image-${stamp}.${ext}`, { type: file.type, lastModified: Date.now() })
    } catch (e) {
        return file
    }
}

/** Files from a paste / drop DataTransfer (pasted images get a name). */
export function filesFromTransfer(dt: DataTransfer | null | undefined): File[] {
    if (!dt) return []
    const out: File[] = []
    if (dt.files && dt.files.length) for (const f of Array.from(dt.files)) out.push(f)
    else if (dt.items) for (const it of Array.from(dt.items)) if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) out.push(f)
    }
    return out.map(namePastedFile)
}
