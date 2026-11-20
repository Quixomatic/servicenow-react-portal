---
title: Dialogs
description: Confirmation, alert and fields dialogs on the host kit's dialog — confirmDialog, useConfirm, the dialog queue, showFieldsDialog and g_modal.
section: Primitives and utilities
order: 5
tags: [dialogs, modal, g_modal, confirm]
---

# Dialogs

Two record primitives build on the host kit's [`components:dialog`](../runtime-api/host-kit.md#dialog-and-calendar): `app/confirm-dialog` for confirmations and alerts (plus a small dialog queue), and `app/field-dialog` for a modal form built from a fields spec. The form runtime's `g_modal` uses both, so legacy client scripts get real dialogs instead of `window.confirm`.

## The dialog outlet

Imperative dialogs render in a **`<DialogOutlet />`**, which must be mounted inside the portal so the dialog lands in the shadow root's overlay layer. Record forms, catalog items, the cart, the variable editor and the attachment panel mount one. Only the first mounted outlet renders, so several forms on one page don't double the dialogs.

```tsx
import { DialogOutlet, useConfirm } from 'components:app/confirm-dialog'

export default function DeleteButton({ onDelete }) {
    const confirm = useConfirm()
    const click = async () => {
        if (await confirm({ title: 'Delete this note?', confirmLabel: 'Delete', destructive: true })) onDelete()
    }
    return (
        <>
            <button onClick={click}>Delete</button>
            <DialogOutlet />
        </>
    )
}
```

> **Note:** With no outlet mounted, `confirmDialog` and `alertDialog` fall back to the browser's `window.confirm` / `window.alert`, and `showFieldsDialog` rejects.

## `components:app/confirm-dialog`

| Export | What |
|---|---|
| `confirmDialog(options)` (alias `confirm`) | Resolves `true` on confirm, `false` on cancel, Escape or an outside click |
| `alertDialog({ title, description?, confirmLabel? })` (alias `alert`) | One OK button; resolves when dismissed |
| `useConfirm()` | Returns `confirmDialog` |
| `useDialog()` | `{ confirm, alert, open, hasOutlet }` |
| `openDialog((close) => <MyDialog onDone={close} />)` | Queue any dialog; returns a function that closes it |
| `hasDialogOutlet()` | Whether an outlet is mounted |
| `DialogOutlet` | Renders the queue |
| `ConfirmDialog` | The controlled component: `open`, `onConfirm`, `onCancel`, `alert?`, plus the options |

`ConfirmOptions` is `{ title, description?, confirmLabel?, cancelLabel?, destructive? }`. `destructive` styles the confirm button as destructive. Record forms use it for the "Keep editing / Discard" prompt; cart, attachments and multi-row variable sets use it before destructive actions.

## `components:app/field-dialog`

A modal form from Workspace's `g_modal.showFields` spec, rendered with the [field primitives](fields.md) on a local form store.

```tsx
import { showFieldsDialog } from 'components:app/field-dialog'

const { updatedFields } = await showFieldsDialog({
    title: 'Resolve incident',
    fields: [
        { type: 'choice', name: 'close_code', label: 'Resolution code', mandatory: true, choices: [{ value: 'Solved', displayValue: 'Solved' }] },
        { type: 'textarea', name: 'close_notes', label: 'Resolution notes', mandatory: true },
        { type: 'reference', name: 'caller_id', label: 'Caller', reference: 'sys_user', referringTable: 'incident' },
    ],
})
```

- **Spec:** `{ title?, instruction?, fields, confirmTitle?, cancelTitle?, size? }`; `size` is `sm`, `md` or `lg`.
- **Field:** `{ type, name, label, mandatory, value, displayValue, choices, reference, referringTable, referringRecordId, readonly, visible, placeholder, help }`.
- **Types:** `string` / `text`, `textarea`, `choice`, `boolean` / `checkbox`, `reference`, `glide_list`, `integer`, `decimal`, `glide_date` / `date`, `glide_date_time` / `datetime`, `email`, `url`. Unknown types render as text. Reference and `glide_list` fields search like they do on a form.
- **Result:** mandatory fields are validated first; the promise resolves `{ updatedFields }`, each field echoed with its `value` and `displayValue`. Cancelling rejects.

Other exports: `showFields` (alias), `useFieldsDialog()` (returns `showFieldsDialog`), and the controlled `FieldDialog` (`open`, `spec`, `onSubmit`, `onCancel`).

## `g_modal` in client scripts

The [form runtime](form-runtime.md) maps `g_modal` onto these dialogs:

| Call | Behaviour |
|---|---|
| `g_modal.alert(title, message?, callback?)` | `alertDialog`; the callback runs on dismiss |
| `g_modal.confirm(title, message?, callback?, { confirmTitle, cancelTitle, confirmType })` | `confirmDialog`; `confirmType: 'destructive'` styles the button. With a callback it gets `true` / `false`; without one the promise rejects on cancel, as in Workspace |
| `g_modal.showFields(spec)` | `showFieldsDialog`; resolves `{ updatedFields }`, rejects on cancel |
| `g_modal.showFrame({ url })` | Opens the URL in a new tab |

HTML in titles and messages is shown as text.

## Related

- [Host kit](../runtime-api/host-kit.md)
- [Form runtime](form-runtime.md)
- [Forms](forms.md)
