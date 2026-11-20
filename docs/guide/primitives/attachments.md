---
title: Attachments
description: Headless attachment logic (utilities:app/attachments), the drop zone, list and panel primitives, the file_attachment / user_image field, g_form.enable/disableAttachments, RecordForm's attachments option and the app/attachments-card widget.
section: Primitives and utilities
order: 7
tags: [attachments, upload, drag-drop, paste, file_attachment, user_image, amb]
---

# Attachments

Attachments are built in layers, so the look can change without touching the logic:

| Layer | Record | What |
|---|---|---|
| Logic | `utilities:app/attachments` | Platform calls, TanStack Query hooks, validation, drop / paste hooks, form state. No markup |
| Building blocks | `components:app/attachment-dropzone`, `components:app/attachment-list` | A drop zone that is also a button; a list / grid / chips with every part exported |
| Composed | `components:app/attachment-panel` | Drop zone + upload queue + list for one record |
| Field | `components:app/attachment-field` | `file_attachment` and `user_image` dictionary types (registered in `app/field-control`) |
| Widget | `components:app/attachments-card` | A placeable attachments card, in the style of Service Portal's "Ticket Attachments" |

> **Note:** The final presentation isn't decided yet. The sp page **Attachments** (`/attachments`) shows the same record as a list, as compact chips and as a thumbnail grid, plus the record form's header toggle.

## Platform calls

| Step | Call |
|---|---|
| List + permissions | GraphQL `GlideAttachmentQuery_Query.attachments(table, sysId)`: per-file `canDelete` / `canEditName`, `canCreate`, allowed `extensions`, `fileNameLength` (the query Workspace's attachment panel runs). In parallel, `GET /api/now/attachment?sysparm_query=table_name=…^table_sys_id=…` adds content type, bytes and uploader |
| Upload | `POST /api/now/attachment/file?table_name&table_sys_id&file_name` with the file as the body, sent with `XMLHttpRequest` for progress and cancel |
| Delete | `DELETE /api/now/attachment/{sys_id}` |
| Rename | GraphQL `GlideRecord_Mutation.update_sys_attachment(sys_id, file_name)` (Workspace's rename) |
| Download | `/sys_attachment.do?sys_id=…`; all files as a zip: `/download_all_attachments.do?sysparm_sys_id=…` |
| Live | `useRecordWatch('sys_attachment', 'table_name=…^table_sys_id=…')` |

Everything runs as the user, so `sys_attachment` ACLs and the platform's own upload checks (extension list, size limit, type blocklist) apply whatever the browser checked first.

## New records

Opening a new record (`sys_id = -1`) makes the form bootstrap **reserve** the record's sys_id (`formLayout.sysId`), and the platform keeps that sys_id when the record is inserted. Files therefore upload straight to `(table, reserved sys_id)` before the first save, which is what classic and Workspace forms do. Inside a form, the panel, the field and HTML-field images all use `form.sysId`, which is the reserved id.

- Files added to a new form that is then abandoned stay orphaned, as on the platform.
- Without a reserved id (a bare `sysId="-1"` outside a form), `useUploadAttachments` keeps files as **staged**; call `flush(sysId)` once the record exists.

## `utilities:app/attachments`

### Hooks

```ts
useAttachments(table, sysId, { live? = true, enabled? })
  → { attachments, permissions, count, isLoading, error, liveStatus, refresh, …query }

useAttachmentPermissions(table, sysId, { form?, readOnly?, extensions?, maxBytes?, multiple?, live? })
  → { canCreate, canUpload, reason, rules, permissions, loading }

useUploadAttachments(table, sysId, { rules?, concurrency? = 3, clearDoneAfter? = 2000, onUploaded?, onRejected?, onError? })
  → { upload(files) → { accepted, rejected }, uploads, rejected, busy, progress,
      cancel(id), cancelAll(), retry(id), dismiss(id), clearFinished(), dismissRejected(), flush(sysId?), staged }

useDeleteAttachment(table, sysId)   // mutate(attachment | sysId), optimistic
useRenameAttachment(table, sysId)   // mutate({ sysId, fileName }), optimistic
useAttachmentLimits()               // { maxBytes, extensions } from exposed properties (null / [] when not exposed)

useRecordAttachments(table, sysId, options)   // all of the above for one record: build your own presentation on it
useFileDrop({ onFiles, disabled?, multiple?, extensions? })  → { dragging, open, rootProps, inputProps, inputRef }
usePasteFiles(ref | 'window', onFiles, enabled?)
```

Every hook for the same record shares one cache entry (`attachmentKeys.record(table, sysId)`), so a count badge, a list and a panel stay in step. A finished upload is added to the cache at once, then refetched for its ACL flags and date label.

### Validation

`validateFiles(files, rules)` returns `{ accepted, rejected }`. Each rejection has a `reason` (`read-only`, `extension`, `empty`, `size`, `name`, `count`) and a message. Checks run in the platform's order, **read-only first**:

1. Read-only: no create ACL, `readOnly`, or `g_form.disableAttachments()`.
2. Extension.
3. Empty file.
4. Size.
5. Name length.

Where the rules come from:

| Rule | Source |
|---|---|
| Allowed extensions | `GlideAttachmentQuery.extensions` (the server's `glide.attachment.extensions`); `user_image` fields use `jpg, jpeg, png, bmp, gif, ico, svg`, as Workspace does |
| Max size | `com.glide.attachment.max_size` (MB), read when the portal lists it in `settings.exposedProperties` (the demo portals do). Otherwise only the server enforces it |
| Narrowing | Props such as `extensions` / `maxBytes` can only narrow the platform's rules, never widen them |

### Helpers

| Group | Exports |
|---|---|
| Calls | `fetchAttachments`, `fetchAttachment`, `uploadAttachment({ file, table, sysId, fileName?, onProgress?, signal? })` (a cancelled upload rejects with `UploadAbortedError`), `deleteAttachment`, `renameAttachment`, `attachmentFromRest` |
| Queries | `ATTACHMENTS_QUERY`, `RENAME_ATTACHMENT_MUTATION`, `attachmentKeys` |
| URLs | `attachmentUrl`, `downloadAllUrl` |
| File types | `fileKind(name, contentType)`, `fileIconName` / `FILE_KIND_ICONS` (Lucide names for `components:icon`), `isPreviewableImage`, `formatBytes`, `fileExtension`, `fileBaseName`, `withExtensionOf` |
| Validation | `validateFiles`, `describeRules`, `parseExtensions`, `acceptAttribute`, `filesFromTransfer`, `namePastedFile`, `isAttachableSysId` |
| Form flag | `setFormAttachmentsEnabled`, `formAttachmentsEnabled`, `useFormAttachmentsEnabled`, `subscribeFormAttachments`, `rootFormStore` |
| Constants | `USER_IMAGE_EXTENSIONS`, `FIELD_ATTACHMENT_PREFIX` (`ZZ_YY`) |

## Building blocks

### `app/attachment-dropzone`

```tsx
<AttachmentDropzone onFiles={(f) => up.upload(f)} hint={describeRules(rules)} />   // variant 'area' (default)
<AttachmentDropzone variant="compact" … />   // one-line strip
<AttachmentDropzone variant="button" … />    // a button that also takes drops
<AttachmentDropzone onFiles={…}>{({ dragging, open }) => <YourLook />}</AttachmentDropzone>
```

- It is a real `<button>`: Tab focuses it; Enter or Space opens the picker.
- Drag and drop works on it.
- Paste (Ctrl/⌘+V) works while it has focus. With `paste="window"`, paste works anywhere except text fields and editors.
- `disabled` + `disabledReason` show why files can't be added.
- Other props: `label` (default "Drop files here or browse"), `hint`, `multiple`, `extensions` (the picker's `accept`; validation still runs in `validateFiles`), `busy`.

### `app/attachment-list`

```tsx
<AttachmentList attachments={list} layout="grid"   // 'list' (default), 'grid' or 'chips'
    onDelete={att.remove} onRename={att.rename} pending={att.pending}
    renderItem={(a, ctx) => <MyRow a={a} onDownload={ctx.href} onDelete={ctx.remove} />} />
<UploadQueue uploads={up.uploads} onCancel={up.cancel} onRetry={up.retry} onDismiss={up.dismiss} />
```

| Behaviour | What it does |
|---|---|
| Thumbnails | Images get lazy thumbnails; everything else gets a file-type icon |
| Meta line | Size · uploader · relative date (the full date is in the title) |
| Download | A link with `download` |
| Rename | Inline: the base name is editable and the extension is kept. Enter saves, Escape cancels |
| Delete | Confirmed through `app/confirm-dialog` (`confirmDelete={false}` skips the confirmation) |
| Actions shown | Delete and rename appear only when the file's own `canDelete` / `canEditName` is true |
| Images | Clicking an image opens `ImagePreviewDialog` (`components:dialog`), with previous / next and arrow keys |

Every part is exported for your own layouts:

- `AttachmentIcon`, `AttachmentThumbnail`, `AttachmentRow`, `AttachmentTile`, `AttachmentChip`;
- `AttachmentRenameInput`, `AttachmentActions`, `ImagePreviewDialog`, `UploadQueue`, `UploadProgress`;
- `formatAttachmentDate`, `attachmentMeta`, `confirmDeleteAttachment`.

The activity stream reuses the icons and thumbnails.

### `app/attachment-panel`

```tsx
<AttachmentPanel table="incident" sysId={sysId} />
<AttachmentPanel layout="grid" dropzone="compact" />           // inside a FormProvider: the form's record
<AttachmentPanel layout="chips" dropzone="button" title={null} bare />
```

| Prop | Meaning |
|---|---|
| `table`, `sysId`, `form` | The record (default: the surrounding form; its reserved sys_id when new) |
| `layout` | `list`, `grid`, `chips` |
| `dropzone` | `area`, `compact`, `button` (in the header), `none` |
| `title` (default "Attachments"; `null` hides the header row), `headingLevel` (default 3), `headerActions`, `bare` | Presentation |
| `readOnly`, `extensions`, `maxBytes` | Narrow what the platform allows |
| `paste` | `true` (focus inside the panel), `'window'`, `false` |
| `downloadAll` | "Download all" (zip) with two or more files (default true) |
| `renderItem`, `emptyText`, `showMeta` | List presentation |
| `live`, `onUploaded` | AMB refresh; a callback per finished upload |

- The whole panel is a drop target.
- Rejected files are listed in an alert.
- Uploads show progress with Cancel, and Retry after a failure.
- When files can't be added, the drop zone is hidden and the reason shows instead.

`AttachmentsToggle` is a paperclip button with the count; the form header uses it.

## Fields: `file_attachment` and `user_image`

`<FieldControl name="…" />` picks `components:app/attachment-field` for both types. It works like Workspace's file attachment control:

- The file uploads to `ZZ_YY<table>` / the record's sys_id, which keeps it out of the record's attachment list.
- The value is the attachment sys_id; the display value is the file name.
- You can choose, drop or paste a file, follow its progress and cancel.
- Replace, Rename (file fields only) and Remove (clears the value; it's saved with the record).
- `user_image` shows an image preview.
- Read-only fields show the file as a link, or the image.
- Props: `kind` (`file` | `image`; default from the dictionary type), `extensions` and `maxBytes` (narrow the rules), `target` (`{ table, sysId }`, where the file uploads).

## Forms

- **`g_form.enableAttachments()` / `disableAttachments()`** (the platform's names) set a form-level flag. While it's off, no new files can be added, and files already attached stay listed.
  - The flag lives beside the form store: `setFormAttachmentsEnabled(form, on)`, `useFormAttachmentsEnabled(form)`.
  - The panel reads it.
- **`RecordForm attachments`**: `'off'` (default), `'below'` (a panel under the sections) or `'header'` (a paperclip + count in the header that shows / hides the panel above the sections).
  - The `app/record-form` widget has the same `attachments` option.
  - The panel sits outside the `<form>` element, so Enter in a rename never submits the record.
- **HTML fields**: pasted or dropped images upload through `uploadAttachment`. That includes new records, because they use the reserved sys_id.

## `app/attachments-card` widget

A record's attachments as a page widget. The record comes from the options, else the route params, else the URL params (`table`, `sys_id`), so it can sit next to `app/record-form` on a generic form page.

| Option | Meaning |
|---|---|
| `table`, `sysId` | The record (empty: from the page) |
| `title` | Heading (default "Attachments"; '' hides it) |
| `layout` | `list` (default), `grid`, `chips` |
| `dropzone` | `area`, `compact`, `button`, `none` (default: button for chips, area otherwise) |
| `downloadAll` | Zip download link (default true) |
| `emptyText` | Text with no files |

Presentation options only: what users may do follows the platform's ACLs.

## Not built yet

- Document viewer previews (PDF, Office): images only.
- Encryption modules (`sysparm_encryption_context`).
- Multi-select delete / download.
- Choosing a file name in a pre-upload dialog, as Workspace's upload modal does.

## Related

- [Forms](forms.md)
- [Form runtime](form-runtime.md)
- [Fields](fields.md)
- [Live updates](../runtime-api/live-updates.md)
