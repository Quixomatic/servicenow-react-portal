import { graphql, authHeaders, safeName } from 'utilities:app/graphql';
import { attachmentUrl, isAttachableSysId, parseExtensions } from './files';

/**
 * Platform calls (plain async, usable outside React):
 *
 *   fetchAttachments(table, sysId)   GraphQL GlideAttachmentQuery_Query.attachments (per-file canDelete /
 *                                    canEditName, canCreate, allowed extensions, file name length: the
 *                                    query Workspace's attachment panel runs) + GET /api/now/attachment
 *                                    (content type, bytes, created by / on) in parallel, merged by sys_id
 *   uploadAttachment({...})          POST /api/now/attachment/file (raw body; XHR for progress + abort)
 *   deleteAttachment(sysId)          DELETE /api/now/attachment/{sys_id}
 *   renameAttachment(sysId, name)    GraphQL GlideRecord_Mutation.update_sys_attachment(file_name) (Workspace's rename)
 *   fetchAttachment(sysId)           GET /api/now/attachment/{sys_id} (one file's metadata)
 *
 * Every call runs as the user (session + X-UserToken), so sys_attachment ACLs and the platform's
 * own upload checks (glide.attachment.extensions, com.glide.attachment.max_size, the type
 * blocklist) apply whatever the client checked first.
 */

export type Attachment = {
    sysId: string;
    fileName: string;
    contentType: string;
    /** Bytes (uncompressed). */
    size: number;
    /** Table the file is attached to (ZZ_YY<table> for field / variable attachments). */
    table: string;
    tableSysId: string;
    /** Glide UTC 'yyyy-MM-dd HH:mm:ss'. */
    createdOn: string;
    /** user_name of the uploader. */
    createdBy: string;
    updatedOn: string;
    /** The platform's own label for the date, in the user's format (GraphQL dateLabel). */
    dateLabel: string;
    /** Virus-scan / upload state ('available', 'pending', 'not_available' = failed the scan…). */
    state: string;
    canDelete: boolean;
    canRename: boolean;
    isEncrypted: boolean;
    imageWidth?: number;
    imageHeight?: number;
    /** /sys_attachment.do?sys_id=… */
    url: string;
};

export type AttachmentPermissions = {
    /** The user may add attachments to this record (sys_attachment create ACL, record access). */
    canCreate: boolean;
    /** Allowed extensions (glide.attachment.extensions as the server resolved it); [] = any. */
    extensions: string[];
    /** Max file name length. */
    fileNameLength: number;
    /** The platform document viewer is on (glide.ui.document_viewer…). */
    docViewerEnabled: boolean;
};

export type AttachmentSet = {
    table: string;
    sysId: string;
    attachments: Attachment[];
    permissions: AttachmentPermissions;
};

export const ATTACHMENTS_QUERY = `query rpAttachments($table: String!, $sysId: String!) {
  GlideAttachmentQuery_Query {
    attachments(table: $table, sysId: $sysId, fetchDocument: false) {
      records { name date dateLabel type state size sysId canEditName canDelete isEncrypted }
      count extensions canCreate fileNameLength docViewerEnabled
    }
  }
}`;

export const RENAME_ATTACHMENT_MUTATION = `mutation rpRenameAttachment($sys_id: String!, $file_name: String!) {
  GlideRecord_Mutation { update_sys_attachment(sys_id: $sys_id, file_name: $file_name) { file_name { value } } }
}`;

const bool = (v: unknown) => v === true || v === 'true';

/** Normalise an Attachment API row (GET /api/now/attachment, upload results). */
export function attachmentFromRest(r: any): Attachment {
    return {
        sysId: String(r.sys_id || ''),
        fileName: String(r.file_name || ''),
        contentType: String(r.content_type || ''),
        size: Number(r.size_bytes || 0),
        table: String(r.table_name || ''),
        tableSysId: String(r.table_sys_id || ''),
        createdOn: String(r.sys_created_on || ''),
        createdBy: String(r.sys_created_by || ''),
        updatedOn: String(r.sys_updated_on || ''),
        dateLabel: '',
        state: String(r.state || ''),
        canDelete: true,
        canRename: true,
        isEncrypted: false,
        imageWidth: r.image_width ? Number(r.image_width) : undefined,
        imageHeight: r.image_height ? Number(r.image_height) : undefined,
        url: attachmentUrl(String(r.sys_id || '')),
    };
}

async function json(response: Response): Promise<any> {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch (e) {
        return null;
    }
}

function restError(json: any, status: number, what: string): Error {
    const msg = json && json.error && (json.error.message || json.error.detail);
    return new Error(msg ? String(msg) : `${what} failed (HTTP ${status})`);
}

/**
 * A record's attachments and what the user may do with them. Unsaved records work with the
 * sys_id the form bootstrap reserved (the platform keeps it on insert).
 */
export async function fetchAttachments(table: string, sysId: string, signal?: AbortSignal): Promise<AttachmentSet> {
    safeName(table, 'table');
    const empty: AttachmentSet = {
        table,
        sysId,
        attachments: [],
        permissions: { canCreate: false, extensions: [], fileNameLength: 100, docViewerEnabled: false },
    };
    if (!isAttachableSysId(sysId)) return empty;
    const restUrl = `/api/now/attachment?sysparm_query=${encodeURIComponent(`table_name=${table}^table_sys_id=${sysId}^ORDERBYsys_created_on`)}&sysparm_limit=1000`;
    const [gq, rest] = await Promise.all([
        graphql(ATTACHMENTS_QUERY, { table, sysId }, { signal, allowPartial: true }).catch(() => null),
        fetch(restUrl, { credentials: 'same-origin', headers: authHeaders(false), signal })
            .then(async (r) => (r.ok ? ((await json(r)) || {}).result || [] : null))
            .catch(() => null),
    ]);
    const model = gq && gq.GlideAttachmentQuery_Query && gq.GlideAttachmentQuery_Query.attachments;
    if (!model && !rest) throw new Error('Couldn’t load the attachments');
    const perms: AttachmentPermissions = model
        ? {
              canCreate: bool(model.canCreate),
              extensions: parseExtensions(model.extensions),
              fileNameLength: Number(model.fileNameLength) || 100,
              docViewerEnabled: bool(model.docViewerEnabled),
          }
        : empty.permissions;
    const byId: Record<string, any> = {};
    for (const r of (model && model.records) || []) byId[String(r.sysId)] = r;
    const fromGraph = (g: any): Attachment => ({
        sysId: String(g.sysId),
        fileName: String(g.name || ''),
        contentType: String(g.type || ''),
        size: Number(g.size || 0),
        table,
        tableSysId: sysId,
        createdOn: String(g.date || ''),
        createdBy: '',
        updatedOn: String(g.date || ''),
        dateLabel: String(g.dateLabel || ''),
        state: String(g.state || ''),
        canDelete: bool(g.canDelete),
        canRename: bool(g.canEditName),
        isEncrypted: bool(g.isEncrypted),
        url: attachmentUrl(String(g.sysId)),
    });
    let list: Attachment[];
    if (rest) {
        list = (rest as any[]).map((r) => {
            const a = attachmentFromRest(r);
            const g = byId[a.sysId];
            if (g) {
                a.dateLabel = String(g.dateLabel || '');
                a.canDelete = bool(g.canDelete);
                a.canRename = bool(g.canEditName);
                a.isEncrypted = bool(g.isEncrypted);
                if (!a.state) a.state = String(g.state || '');
                delete byId[a.sysId];
            } else if (model) {
                // GraphQL didn't list it (no read on the file): no actions.
                a.canDelete = false;
                a.canRename = false;
            }
            return a;
        });
        // Anything only GraphQL returned (REST row filtered): still show it.
        for (const id of Object.keys(byId)) list.push(fromGraph(byId[id]));
    } else {
        list = ((model && model.records) || []).map(fromGraph);
    }
    return { table, sysId, attachments: list, permissions: perms };
}

/** One attachment's metadata (GET /api/now/attachment/{sys_id}); null when missing / not readable. */
export async function fetchAttachment(sysId: string, signal?: AbortSignal): Promise<Attachment | null> {
    if (!isAttachableSysId(sysId)) return null;
    const r = await fetch(`/api/now/attachment/${encodeURIComponent(sysId)}`, {
        credentials: 'same-origin',
        headers: authHeaders(false),
        signal,
    });
    if (!r.ok) return null;
    const j = await json(r);
    return j && j.result ? attachmentFromRest(j.result) : null;
}

export type UploadArgs = {
    file: File | Blob;
    table: string;
    sysId: string;
    /** Defaults to the file's name. */
    fileName?: string;
    contentType?: string;
    /** 0..1 as bytes go out. */
    onProgress?: (fraction: number, loaded: number, total: number) => void;
    signal?: AbortSignal;
};

export class UploadAbortedError extends Error {
    constructor() {
        super('Upload canceled');
        this.name = 'AbortError';
    }
}

/**
 * Upload one file as an attachment (POST /api/now/attachment/file, the file as the raw body).
 * Uses XMLHttpRequest so callers get upload progress and can cancel (signal).
 */
export function uploadAttachment(args: UploadArgs): Promise<Attachment> {
    const { file, table, sysId } = args;
    const name = args.fileName || (file as File).name || 'file';
    return new Promise<Attachment>((resolve, reject) => {
        if (!table || !isAttachableSysId(sysId)) return reject(new Error('There is no saved record to attach to'));
        if (args.signal && args.signal.aborted) return reject(new UploadAbortedError());
        const url = `/api/now/attachment/file?table_name=${encodeURIComponent(table)}&table_sys_id=${encodeURIComponent(sysId)}&file_name=${encodeURIComponent(name)}`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        const headers = authHeaders(false);
        for (const k of Object.keys(headers)) xhr.setRequestHeader(k, headers[k]);
        xhr.setRequestHeader('Content-Type', args.contentType || file.type || 'application/octet-stream');
        const onAbort = () => xhr.abort();
        if (args.signal) args.signal.addEventListener('abort', onAbort, { once: true });
        xhr.upload.onprogress = (e: ProgressEvent) => {
            if (args.onProgress && e.lengthComputable)
                args.onProgress(e.total ? e.loaded / e.total : 0, e.loaded, e.total);
        };
        xhr.onload = () => {
            if (args.signal) args.signal.removeEventListener('abort', onAbort);
            let body: any = null;
            try {
                body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch (e) {
                body = null;
            }
            if (xhr.status >= 200 && xhr.status < 300 && body && body.result) {
                if (args.onProgress) args.onProgress(1, file.size, file.size);
                resolve(attachmentFromRest(body.result));
            } else reject(restError(body, xhr.status, `Uploading ${name}`));
        };
        xhr.onerror = () => {
            if (args.signal) args.signal.removeEventListener('abort', onAbort);
            reject(new Error(`Uploading ${name} failed (network error)`));
        };
        xhr.onabort = () => reject(new UploadAbortedError());
        xhr.send(file);
    });
}

/** Delete an attachment (the user's sys_attachment delete ACL applies). */
export async function deleteAttachment(sysId: string): Promise<void> {
    const r = await fetch(`/api/now/attachment/${encodeURIComponent(sysId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: authHeaders(false),
    });
    if (!r.ok && r.status !== 404) throw restError(await json(r), r.status, 'Deleting the attachment');
}

/** Rename an attachment (full name, extension included); resolves with the name the server kept. */
export async function renameAttachment(sysId: string, fileName: string): Promise<string> {
    const name = String(fileName || '').trim();
    if (!name) throw new Error('The file needs a name');
    const data = await graphql(RENAME_ATTACHMENT_MUTATION, { sys_id: sysId, file_name: name });
    const out = data && data.GlideRecord_Mutation && data.GlideRecord_Mutation.update_sys_attachment;
    if (!out) throw new Error('You can’t rename this attachment');
    return String((out.file_name && out.file_name.value) || name);
}
