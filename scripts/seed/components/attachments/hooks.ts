import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'utilities:react-query';
import { useRecordWatch, useProperties } from '@portal/runtime';
import { fetchAttachments, uploadAttachment, deleteAttachment, renameAttachment } from './api';
import type { Attachment, AttachmentPermissions, AttachmentSet } from './api';
import { isAttachableSysId, parseExtensions, validateFiles } from './files';
import type { Rejection, UploadRules } from './files';
import { useFormAttachmentsEnabled } from './form-state';

/** Query keys: every hook for the same record shares one cache entry. */
export const attachmentKeys = {
    all: ['rp-attachments'] as const,
    record: (table: string, sysId: string) => ['rp-attachments', table, sysId] as const,
};

export type UseAttachmentsOptions = {
    /** Watch sys_attachment for this record over AMB (another tab, the classic UI). Default true. */
    live?: boolean;
    enabled?: boolean;
};

/**
 * A record's attachments (+ the user's permissions), cached and live:
 *
 *   const { attachments, permissions, isLoading } = useAttachments('incident', sysId)
 *
 * Unsaved records: pass the sys_id the form reserved (form.sysId / bootstrap.sysId); '-1' / '' load nothing.
 */
export function useAttachments(table: string, sysId: string, options: UseAttachmentsOptions = {}) {
    const qc = useQueryClient();
    const enabled = options.enabled !== false && !!table && isAttachableSysId(sysId);
    const key = attachmentKeys.record(table, sysId);
    const query = useQuery<AttachmentSet>({
        queryKey: key,
        queryFn: ({ signal }: { signal?: AbortSignal }) => fetchAttachments(table, sysId, signal),
        enabled,
        staleTime: 30000,
    });
    const watch = useRecordWatch(
        'sys_attachment',
        enabled ? `table_name=${table}^table_sys_id=${sysId}` : 'sys_id=-1',
        () => qc.invalidateQueries({ queryKey: key }),
        {
            enabled: enabled && options.live !== false,
            invalidate: false,
        }
    );
    const data = query.data;
    return {
        ...query,
        attachments: (data && data.attachments) || EMPTY,
        permissions: data ? data.permissions : undefined,
        count: data ? data.attachments.length : 0,
        /** AMB watch status ('subscribed', 'denied', …). */
        liveStatus: watch.status as string,
        refresh: () => qc.invalidateQueries({ queryKey: key }),
    };
}
const EMPTY: Attachment[] = [];

/**
 * Instance-wide limits: com.glide.attachment.max_size (MB) and glide.attachment.extensions, read
 * through the portal's exposed properties (settings.exposedProperties); null when not exposed.
 */
export function useAttachmentLimits(): { maxBytes: number | null; extensions: string[] } {
    const { values } = useProperties(['com.glide.attachment.max_size', 'glide.attachment.extensions']) as {
        values: Record<string, string | null>;
    };
    const mb = Number(values && values['com.glide.attachment.max_size']);
    return useMemo(
        () => ({
            maxBytes: mb > 0 ? Math.round(mb * 1024 * 1024) : null,
            extensions: parseExtensions(values && values['glide.attachment.extensions']),
        }),
        [mb, values && values['glide.attachment.extensions']]
    );
}

export type AttachmentPermissionOptions = {
    /** The form showing these attachments: g_form.disableAttachments() turns uploads off. */
    form?: any;
    /** Force read-only (e.g. a read-only presentation). */
    readOnly?: boolean;
    /** Narrow the allowed extensions (intersected with the platform's). */
    extensions?: string[] | string;
    /** Narrow the size limit (the smaller of this and the platform's wins). */
    maxBytes?: number | null;
    multiple?: boolean;
    live?: boolean;
};

export type AttachmentPermissionState = {
    loading: boolean;
    /** The platform answer (create ACL on this record). */
    canCreate: boolean;
    /** canCreate, and not read-only / disabled by g_form. */
    canUpload: boolean;
    /** Why canUpload is false ('' when it's true). */
    reason: string;
    /** Rules for validateFiles / useUploadAttachments. */
    rules: UploadRules;
    permissions: AttachmentPermissions | undefined;
};

/** What the user may do with this record's attachments (read-only check first). */
export function useAttachmentPermissions(
    table: string,
    sysId: string,
    options: AttachmentPermissionOptions = {}
): AttachmentPermissionState {
    const { permissions, isLoading } = useAttachments(table, sysId, { live: options.live });
    const limits = useAttachmentLimits();
    const formEnabled = useFormAttachmentsEnabled(options.form || null);
    const own = parseExtensions(options.extensions as any);
    return useMemo(() => {
        const platformExt = permissions && permissions.extensions.length ? permissions.extensions : limits.extensions;
        const extensions =
            own.length && platformExt.length
                ? own.filter((e) => platformExt.indexOf(e) >= 0)
                : own.length
                  ? own
                  : platformExt;
        const sizes = [limits.maxBytes, options.maxBytes].filter((n): n is number => !!n && n > 0);
        const maxBytes = sizes.length ? Math.min.apply(null, sizes) : null;
        const canCreate = !!permissions && permissions.canCreate;
        const reason = !isAttachableSysId(sysId)
            ? 'Save the record to add attachments.'
            : options.readOnly
              ? 'Attachments are read-only here.'
              : !formEnabled
                ? 'Adding attachments is turned off for this form.'
                : permissions && !canCreate
                  ? 'You can’t add attachments to this record.'
                  : '';
        const canUpload = !!permissions && canCreate && !reason;
        return {
            loading: isLoading,
            canCreate,
            canUpload,
            reason,
            permissions,
            rules: {
                extensions,
                maxBytes,
                readOnly: !canUpload,
                readOnlyReason: reason || (permissions ? '' : 'Loading…'),
                fileNameLength: permissions ? permissions.fileNameLength : undefined,
                multiple: options.multiple !== false,
            },
        };
    }, [
        permissions,
        isLoading,
        limits,
        formEnabled,
        options.readOnly,
        options.maxBytes,
        options.multiple,
        own.join(','),
        sysId,
    ]);
}

// ---- uploads -----------------------------------------------------------------------------------

export type UploadStatus = 'staged' | 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export type UploadItem = {
    id: string;
    file: File;
    name: string;
    size: number;
    /** 0..1 */
    progress: number;
    status: UploadStatus;
    error?: string;
    attachment?: Attachment;
};

export type UseUploadOptions = {
    /** Checks before uploading (from useAttachmentPermissions().rules); omit to let the server decide. */
    rules?: UploadRules;
    /** Parallel uploads. Default 3. */
    concurrency?: number;
    /** Drop finished items from `uploads` after this many ms (0 = keep). Default 2000. */
    clearDoneAfter?: number;
    onUploaded?: (attachment: Attachment, item: UploadItem) => void;
    onRejected?: (rejected: Rejection[]) => void;
    onError?: (item: UploadItem) => void;
};

let uploadSeq = 0;

/**
 * Multi-file uploads with progress and cancel:
 *
 *   const up = useUploadAttachments(table, sysId, { rules })
 *   up.upload(fileList)        → { accepted, rejected } (rejected never start)
 *   up.uploads                 → UploadItem[] (status, progress 0..1, error)
 *   up.cancel(id) / up.cancelAll() / up.retry(id) / up.dismiss(id) / up.clearFinished()
 *
 * Without a sys_id to attach to (no reserved one) files are kept as `staged`; call
 * up.flush(sysId) after the record is created to upload them.
 */
export function useUploadAttachments(table: string, sysId: string, options: UseUploadOptions = {}) {
    const qc = useQueryClient();
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [rejected, setRejected] = useState<Rejection[]>([]);
    const items = useRef<UploadItem[]>([]);
    const controllers = useRef<Record<string, AbortController>>({});
    const target = useRef({ table, sysId });
    target.current = { table, sysId };
    const opts = useRef(options);
    opts.current = options;
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const commit = () => {
        if (mounted.current) setUploads(items.current.slice());
    };
    const patch = (id: string, change: Partial<UploadItem>) => {
        items.current = items.current.map((i) => (i.id === id ? { ...i, ...change } : i));
        commit();
    };
    const remove = (id: string) => {
        items.current = items.current.filter((i) => i.id !== id);
        commit();
    };

    const pump = () => {
        const limit = Math.max(1, opts.current.concurrency || 3);
        let active = items.current.filter((i) => i.status === 'uploading').length;
        for (const item of items.current) {
            if (active >= limit) break;
            if (item.status !== 'queued') continue;
            active++;
            start(item);
        }
    };

    const start = (item: UploadItem) => {
        const { table: t, sysId: s } = target.current;
        const controller = new AbortController();
        controllers.current[item.id] = controller;
        patch(item.id, { status: 'uploading', progress: 0, error: undefined });
        let last = 0;
        uploadAttachment({
            file: item.file,
            table: t,
            sysId: s,
            fileName: item.name,
            signal: controller.signal,
            onProgress: (f) => {
                const now = Date.now();
                if (f < 1 && now - last < 120) return;
                last = now;
                patch(item.id, { progress: f });
            },
        })
            .then((att) => {
                patch(item.id, { status: 'done', progress: 1, attachment: att });
                // Show it in every list right away; the refetch then brings ACL flags / date labels.
                const key = attachmentKeys.record(t, s);
                qc.setQueryData(key, (old: AttachmentSet | undefined) =>
                    old && !old.attachments.some((a) => a.sysId === att.sysId)
                        ? { ...old, attachments: old.attachments.concat(att) }
                        : old
                );
                qc.invalidateQueries({ queryKey: key });
                const done = items.current.find((i) => i.id === item.id);
                if (opts.current.onUploaded && done) opts.current.onUploaded(att, done);
                const after = opts.current.clearDoneAfter === undefined ? 2000 : opts.current.clearDoneAfter;
                if (after > 0) setTimeout(() => remove(item.id), after);
            })
            .catch((e: Error) => {
                if (e && e.name === 'AbortError') patch(item.id, { status: 'canceled' });
                else {
                    patch(item.id, { status: 'error', error: (e && e.message) || 'Upload failed' });
                    const failed = items.current.find((i) => i.id === item.id);
                    if (opts.current.onError && failed) opts.current.onError(failed);
                }
            })
            .finally(() => {
                delete controllers.current[item.id];
                pump();
            });
    };

    const upload = useCallback((files: File[] | FileList | null | undefined) => {
        const list = Array.from((files || []) as ArrayLike<File>);
        const result = opts.current.rules
            ? validateFiles(list, opts.current.rules)
            : { accepted: list, rejected: [] as Rejection[] };
        setRejected(result.rejected);
        if (result.rejected.length && opts.current.onRejected) opts.current.onRejected(result.rejected);
        const staged = !isAttachableSysId(target.current.sysId);
        const added: UploadItem[] = result.accepted.map((file) => ({
            id: `u${++uploadSeq}`,
            file,
            name: file.name,
            size: file.size,
            progress: 0,
            status: staged ? 'staged' : 'queued',
        }));
        if (added.length) {
            items.current = items.current.concat(added);
            commit();
            pump();
        }
        return result;
    }, []);

    const cancel = useCallback((id: string) => {
        const c = controllers.current[id];
        if (c) c.abort();
        else {
            const it = items.current.find((i) => i.id === id);
            if (it && (it.status === 'queued' || it.status === 'staged')) patch(id, { status: 'canceled' });
        }
    }, []);
    const cancelAll = useCallback(() => {
        for (const it of items.current)
            if (it.status === 'queued' || it.status === 'staged' || it.status === 'uploading') cancel(it.id);
    }, [cancel]);
    const retry = useCallback((id: string) => {
        const it = items.current.find((i) => i.id === id);
        if (!it || (it.status !== 'error' && it.status !== 'canceled')) return;
        patch(id, {
            status: isAttachableSysId(target.current.sysId) ? 'queued' : 'staged',
            progress: 0,
            error: undefined,
        });
        pump();
    }, []);
    const dismiss = useCallback((id: string) => remove(id), []);
    const clearFinished = useCallback(() => {
        items.current = items.current.filter(
            (i) => i.status === 'queued' || i.status === 'uploading' || i.status === 'staged'
        );
        commit();
    }, []);
    const dismissRejected = useCallback(() => setRejected([]), []);
    /** Upload staged files (e.g. after the record was created). */
    const flush = useCallback((toSysId?: string, toTable?: string) => {
        if (toSysId) target.current = { table: toTable || target.current.table, sysId: toSysId };
        if (!isAttachableSysId(target.current.sysId)) return;
        items.current = items.current.map((i) =>
            i.status === 'staged' ? { ...i, status: 'queued' as UploadStatus } : i
        );
        commit();
        pump();
    }, []);

    // Leaving the page cancels what is still uploading.
    useEffect(() => () => Object.keys(controllers.current).forEach((id) => controllers.current[id].abort()), []);

    const active = uploads.filter((u) => u.status === 'uploading' || u.status === 'queued');
    const totalBytes = active.reduce((n, u) => n + u.size, 0);
    const sentBytes = active.reduce((n, u) => n + u.size * u.progress, 0);
    return {
        upload,
        uploads,
        rejected,
        cancel,
        cancelAll,
        retry,
        dismiss,
        clearFinished,
        dismissRejected,
        flush,
        /** Something is uploading or queued. */
        busy: active.length > 0,
        /** Overall progress of the active batch (0..1). */
        progress: totalBytes ? sentBytes / totalBytes : 0,
        staged: uploads.filter((u) => u.status === 'staged'),
    };
}

// ---- delete / rename ---------------------------------------------------------------------------

/** Delete (optimistic: the row disappears at once, comes back on failure). mutate(attachment | sysId). */
export function useDeleteAttachment(table: string, sysId: string) {
    const qc = useQueryClient();
    const key = attachmentKeys.record(table, sysId);
    return useMutation({
        mutationFn: (a: Attachment | string) => deleteAttachment(typeof a === 'string' ? a : a.sysId),
        onMutate: async (a: Attachment | string) => {
            const id = typeof a === 'string' ? a : a.sysId;
            await qc.cancelQueries({ queryKey: key });
            const previous = qc.getQueryData(key) as AttachmentSet | undefined;
            if (previous)
                qc.setQueryData(key, { ...previous, attachments: previous.attachments.filter((x) => x.sysId !== id) });
            return { previous };
        },
        onError: (_e: unknown, _a: unknown, ctx: any) => {
            if (ctx && ctx.previous) qc.setQueryData(key, ctx.previous);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: key }),
    });
}

/** Rename (optimistic). mutate({ sysId, fileName }) — fileName is the full name, extension included. */
export function useRenameAttachment(table: string, sysId: string) {
    const qc = useQueryClient();
    const key = attachmentKeys.record(table, sysId);
    return useMutation({
        mutationFn: (v: { sysId: string; fileName: string }) => renameAttachment(v.sysId, v.fileName),
        onMutate: async (v: { sysId: string; fileName: string }) => {
            await qc.cancelQueries({ queryKey: key });
            const previous = qc.getQueryData(key) as AttachmentSet | undefined;
            if (previous)
                qc.setQueryData(key, {
                    ...previous,
                    attachments: previous.attachments.map((x) =>
                        x.sysId === v.sysId ? { ...x, fileName: v.fileName } : x
                    ),
                });
            return { previous };
        },
        onError: (_e: unknown, _v: unknown, ctx: any) => {
            if (ctx && ctx.previous) qc.setQueryData(key, ctx.previous);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: key }),
    });
}

// ---- everything for one record -----------------------------------------------------------------

export type UseRecordAttachmentsOptions = AttachmentPermissionOptions &
    Omit<UseUploadOptions, 'rules'> & {
        /** Report failures (default: none; the panel passes a toast). */
        onFailure?: (message: string) => void;
    };

/**
 * One hook for a whole attachments surface (what app/attachment-panel is built on):
 *
 *   const att = useRecordAttachments(table, sysId, { form })
 *   att.attachments, att.count, att.isLoading, att.permission.canUpload / reason / rules
 *   att.upload(files)  att.uploads  att.cancel(id)  att.retry(id)  att.rejected
 *   att.remove(attachment)  att.rename(attachment, fullName)  att.pending (sys_ids in flight)
 */
export function useRecordAttachments(table: string, sysId: string, options: UseRecordAttachmentsOptions = {}) {
    const list = useAttachments(table, sysId, { live: options.live });
    const permission = useAttachmentPermissions(table, sysId, options);
    const fail = (m: string) => options.onFailure && options.onFailure(m);
    const up = useUploadAttachments(table, sysId, {
        rules: permission.rules,
        concurrency: options.concurrency,
        clearDoneAfter: options.clearDoneAfter,
        onUploaded: options.onUploaded,
        onRejected: options.onRejected,
        onError: (item) => {
            fail(item.error || `Uploading ${item.name} failed`);
            if (options.onError) options.onError(item);
        },
    });
    const del = useDeleteAttachment(table, sysId);
    const ren = useRenameAttachment(table, sysId);
    const [pending, setPending] = useState<string[]>([]);
    const track = (id: string, p: Promise<unknown>) => {
        setPending((l) => l.concat(id));
        return p.finally(() => setPending((l) => l.filter((x) => x !== id)));
    };
    const remove = (a: Attachment) =>
        track(a.sysId, del.mutateAsync(a)).catch((e: Error) => {
            fail(`Couldn’t delete ${a.fileName}: ${e.message}`);
        });
    const rename = (a: Attachment, fileName: string) =>
        track(a.sysId, ren.mutateAsync({ sysId: a.sysId, fileName })).catch((e: Error) => {
            fail(`Couldn’t rename ${a.fileName}: ${e.message}`);
        });
    return {
        table,
        sysId,
        attachments: list.attachments,
        count: list.count,
        isLoading: list.isLoading,
        error: list.error as Error | null,
        liveStatus: list.liveStatus,
        refresh: list.refresh,
        permission,
        ...up,
        remove,
        rename,
        pending,
    };
}
