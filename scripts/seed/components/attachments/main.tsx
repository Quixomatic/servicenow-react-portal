/**
 * utilities:app/attachments: headless attachment logic for any widget (no markup).
 *
 * Platform calls (plain async)
 *   fetchAttachments(table, sysId)    GraphQL GlideAttachmentQuery_Query.attachments (canCreate, per-file
 *                                     canDelete / canEditName, extensions, fileNameLength) + GET /api/now/attachment
 *   uploadAttachment({ file, table, sysId, onProgress, signal })   POST /api/now/attachment/file (XHR: progress, abort)
 *   deleteAttachment(sysId)           DELETE /api/now/attachment/{sys_id}
 *   renameAttachment(sysId, name)     GraphQL GlideRecord_Mutation.update_sys_attachment
 *   fetchAttachment(sysId)            GET /api/now/attachment/{sys_id}
 *   attachmentUrl(sysId)              /sys_attachment.do?sys_id=…   (download; inline for images)
 *   downloadAllUrl(sysId, ids?)       /download_all_attachments.do?sysparm_sys_id=…   (zip)
 *
 * Hooks (TanStack Query; one cache entry per record, shared by every list / count / panel)
 *   useAttachments(table, sysId, { live })        list + permissions; live over AMB (sys_attachment watch)
 *   useAttachmentPermissions(table, sysId, opts)  canUpload + reason + rules (read-only first, g_form.disableAttachments,
 *                                                 extensions, max size)
 *   useAttachmentLimits()                          com.glide.attachment.max_size / glide.attachment.extensions (exposed properties)
 *   useUploadAttachments(table, sysId, { rules })  multi-file queue: progress, cancel, retry, staged files + flush(sysId)
 *   useDeleteAttachment / useRenameAttachment      optimistic mutations
 *   useRecordAttachments(table, sysId, opts)       all of the above for one record (list, permission, upload queue,
 *                                                 remove, rename, pending): build your own presentation on it
 *   useFileDrop({ onFiles }) / usePasteFiles(ref | 'window', onFiles)   headless drop zone / paste
 *
 * Helpers
 *   validateFiles(files, rules), describeRules, parseExtensions, acceptAttribute, filesFromTransfer, namePastedFile,
 *   fileKind / fileIconName / FILE_KIND_ICONS (Lucide names), fileExtension, fileBaseName, withExtensionOf,
 *   isPreviewableImage, formatBytes, isAttachableSysId
 *
 * Form state (g_form.enableAttachments / disableAttachments)
 *   setFormAttachmentsEnabled(form, on), formAttachmentsEnabled(form), useFormAttachmentsEnabled(form)
 *
 * New records: the form bootstrap reserves the record's sys_id (formLayout.sysId) and the platform
 * keeps it on insert, so files upload straight to (table, reserved sys_id) before the first save —
 * the platform's own pattern (classic and Workspace forms do the same). Field attachments
 * (file_attachment / user_image) and catalog variables use ZZ_YY<table> so they stay out of lists.
 */
export {
    fetchAttachments,
    fetchAttachment,
    uploadAttachment,
    deleteAttachment,
    renameAttachment,
    attachmentFromRest,
    UploadAbortedError,
    ATTACHMENTS_QUERY,
    RENAME_ATTACHMENT_MUTATION,
} from './api';
export type { Attachment, AttachmentPermissions, AttachmentSet, UploadArgs } from './api';
export {
    useAttachments,
    useAttachmentPermissions,
    useAttachmentLimits,
    useUploadAttachments,
    useDeleteAttachment,
    useRenameAttachment,
    useRecordAttachments,
    attachmentKeys,
} from './hooks';
export type {
    UseRecordAttachmentsOptions,
    UseAttachmentsOptions,
    AttachmentPermissionOptions,
    AttachmentPermissionState,
    UploadItem,
    UploadStatus,
    UseUploadOptions,
} from './hooks';
export { useFileDrop, usePasteFiles } from './dom';
export type { UseFileDropOptions } from './dom';
export {
    validateFiles,
    describeRules,
    parseExtensions,
    acceptAttribute,
    filesFromTransfer,
    namePastedFile,
    fileKind,
    fileIconName,
    FILE_KIND_ICONS,
    fileExtension,
    fileBaseName,
    withExtensionOf,
    isPreviewableImage,
    formatBytes,
    attachmentUrl,
    downloadAllUrl,
    isAttachableSysId,
} from './files';
export type { FileKind, UploadRules, Rejection, RejectReason } from './files';
export {
    setFormAttachmentsEnabled,
    formAttachmentsEnabled,
    useFormAttachmentsEnabled,
    subscribeFormAttachments,
    rootFormStore,
} from './form-state';

/** The extensions Workspace allows for user_image fields. */
export const USER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'ico', 'svg'];

/** Table prefix for attachments that belong to a field or variable (kept out of the record's list). */
export const FIELD_ATTACHMENT_PREFIX = 'ZZ_YY';
