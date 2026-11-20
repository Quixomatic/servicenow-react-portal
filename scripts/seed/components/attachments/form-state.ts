import { useCallback, useSyncExternalStore } from 'react';

/**
 * Form-level attachment state: g_form.enableAttachments() / disableAttachments() (the platform's
 * names: disable "prevents new file attachments from being added"; existing files stay listed).
 * Kept beside the form store, keyed by its root store, so any panel showing that form's
 * attachments reads the same flag. Pass any form object (useForm / useRecordForm / a FormStore).
 */

type Entry = { disabled: boolean; listeners: Set<() => void> };
const states = new WeakMap<object, Entry>();

/** The root form store behind a form object (forms are Object.create(store) layers). */
export function rootFormStore(form: any): object | null {
    let f = form;
    while (f && typeof f === 'object' && !Object.prototype.hasOwnProperty.call(f, 'getState'))
        f = Object.getPrototypeOf(f);
    return f && typeof f === 'object' ? f : form && typeof form === 'object' ? form : null;
}

function entry(form: any): Entry | null {
    const key = rootFormStore(form);
    if (!key) return null;
    let e = states.get(key);
    if (!e) {
        e = { disabled: false, listeners: new Set() };
        states.set(key, e);
    }
    return e;
}

/** g_form.enableAttachments / disableAttachments. */
export function setFormAttachmentsEnabled(form: any, enabled: boolean): void {
    const e = entry(form);
    if (!e || e.disabled === !enabled) return;
    e.disabled = !enabled;
    e.listeners.forEach((l) => l());
}

/** False after g_form.disableAttachments() (until enableAttachments). True for no form. */
export function formAttachmentsEnabled(form: any): boolean {
    const e = form ? entry(form) : null;
    return e ? !e.disabled : true;
}

export function subscribeFormAttachments(form: any, listener: () => void): () => void {
    const e = form ? entry(form) : null;
    if (!e) return () => {};
    e.listeners.add(listener);
    return () => {
        e.listeners.delete(listener);
    };
}

/** React: is adding attachments enabled on this form (g_form.disableAttachments flips it)? */
export function useFormAttachmentsEnabled(form: any): boolean {
    const subscribe = useCallback((l: () => void) => subscribeFormAttachments(form, l), [form]);
    return useSyncExternalStore(
        subscribe,
        () => formAttachmentsEnabled(form),
        () => true
    );
}
