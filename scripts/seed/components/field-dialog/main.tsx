/**
 * components:app/field-dialog: a modal form built from a fields spec, on components:dialog with the
 * field primitives (app/field-control) bound to a local form store.
 *
 *   const { updatedFields } = await showFieldsDialog({
 *     title: 'Resolve incident',
 *     fields: [
 *       { type: 'choice', name: 'close_code', label: 'Resolution code', mandatory: true, choices: [{ value: 'Solved', displayValue: 'Solved' }] },
 *       { type: 'textarea', name: 'close_notes', label: 'Resolution notes', mandatory: true },
 *       { type: 'reference', name: 'caller_id', label: 'Caller', reference: 'sys_user', referringTable: 'incident' },
 *     ],
 *   })   // rejects when cancelled
 *
 * The spec is Workspace's g_modal.showFields shape: { title, instruction?, fields[], confirmTitle?,
 * cancelTitle?, size? } with fields { type, name, label, mandatory, value, displayValue, choices,
 * reference, referringTable, referringRecordId, readonly, visible, placeholder, help }. Types:
 * string / text, textarea, choice, boolean / checkbox, reference, glide_list, integer / decimal,
 * glide_date, glide_date_time, email, url (unknown types render as text).
 * updatedFields echoes each field with its value / displayValue. Mandatory fields are validated first.
 */
import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components:dialog';
import { Button } from 'components:button';
import { createFormStore, FormProvider, useFormMeta } from 'components:app/field';
import type { Form, FieldMeta } from 'components:app/field';
import { FieldControl } from 'components:app/field-control';
import { openDialog, hasDialogOutlet } from 'components:app/confirm-dialog';

export type FieldSpec = {
    type?: string;
    name: string;
    label?: string;
    mandatory?: boolean;
    value?: unknown;
    displayValue?: unknown;
    choices?: { value: unknown; displayValue?: unknown; label?: unknown }[];
    reference?: string;
    referringTable?: string;
    referringRecordId?: string;
    readonly?: boolean;
    visible?: boolean;
    placeholder?: string;
    help?: string;
    [extra: string]: unknown;
};

export type FieldsDialogSpec = {
    title?: string;
    instruction?: string;
    fields: FieldSpec[];
    confirmTitle?: string;
    cancelTitle?: string;
    /** 'sm' | 'md' | 'lg' (Workspace sizes). */
    size?: string;
};

export type FieldsDialogResult = { updatedFields: (FieldSpec & { value: string; displayValue: string })[] };

const TYPES: Record<string, string> = {
    string: 'string',
    text: 'string',
    textarea: 'multi_two_lines',
    multi_two_lines: 'multi_two_lines',
    choice: 'choice',
    boolean: 'boolean',
    checkbox: 'boolean',
    reference: 'reference',
    glide_list: 'glide_list',
    integer: 'integer',
    decimal: 'decimal',
    glide_date: 'glide_date',
    date: 'glide_date',
    glide_date_time: 'glide_date_time',
    datetime: 'glide_date_time',
    email: 'email',
    url: 'url',
};

const s = (v: unknown) => (v == null ? '' : String(v));

/** Field name in the dialog's store (a spec without a name gets a positional one). */
const keyOf = (f: FieldSpec, i: number) => s(f.name) || `field_${i}`;

function buildForm(spec: FieldsDialogSpec): Form {
    const store = createFormStore({ table: '', sysId: '-1' });
    const values: Record<string, { value: string; displayValue: string }> = {};
    const meta: Record<string, FieldMeta> = {};
    spec.fields.forEach((f, i) => {
        const name = keyOf(f, i);
        const type = TYPES[s(f.type).toLowerCase()] || 'string';
        values[name] = { value: s(f.value), displayValue: s(f.displayValue ?? f.value) };
        meta[name] = {
            table: s(f.referringTable) || s(f.reference),
            name,
            label: s(f.label) || name,
            type,
            mandatory: !!f.mandatory,
            readOnly: !!f.readonly,
            hint: f.help ? s(f.help) : undefined,
            attributes: f.placeholder ? { placeholder: s(f.placeholder) } : {},
            choices: Array.isArray(f.choices)
                ? f.choices.map((c) => ({ value: s(c.value), label: s(c.displayValue ?? c.label ?? c.value) }))
                : undefined,
            choiceType: Array.isArray(f.choices) ? 1 : undefined,
            reference: f.reference ? { table: s(f.reference) } : undefined,
            source: 'props',
        };
        if (f.visible === false) store.setVisible(name, false);
    });
    store.load({ values, meta, sysId: s(spec.fields[0] && spec.fields[0].referringRecordId) || '-1' });
    const form = Object.create(store) as Form;
    form.status = { isLoading: false, isFetching: false, error: null, loaded: true };
    form.refetch = () => {};
    return form;
}

export type FieldDialogProps = {
    open: boolean;
    spec: FieldsDialogSpec;
    onSubmit: (result: FieldsDialogResult) => void;
    onCancel: () => void;
};

/** The fields dialog, controlled. */
export function FieldDialog(props: FieldDialogProps) {
    const { spec } = props;
    const form = useMemo(() => buildForm(spec), [spec]);
    const meta = useFormMeta(form);
    const [error, setError] = useState('');
    const root = useRef<HTMLFormElement | null>(null);
    const submit = () => {
        // Commit typing in progress, then validate mandatory fields.
        const state = form.getState();
        for (const n of Object.keys(state.fields))
            if (state.fields[n].staged !== undefined) form.setValue(n, state.fields[n].staged as string);
        const v = form.validate();
        if (!v.valid) {
            setError(`Fill in ${v.errors.map((e) => e.label).join(', ')}`);
            const first =
                root.current &&
                (root.current.querySelector(
                    `[data-rpf-field="${v.errors[0].name}"] input, [data-rpf-field="${v.errors[0].name}"] textarea, [data-rpf-field="${v.errors[0].name}"] [role=combobox], [data-rpf-field="${v.errors[0].name}"] button`
                ) as HTMLElement | null);
            if (first) first.focus();
            return;
        }
        props.onSubmit({
            updatedFields: spec.fields.map((f, i) => {
                const name = keyOf(f, i);
                return {
                    ...f,
                    name: s(f.name) || name,
                    value: form.getValue(name),
                    displayValue: form.getDisplayValue(name),
                };
            }),
        });
    };
    const width = spec.size === 'lg' ? 'sm:max-w-2xl' : spec.size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg';
    return (
        <Dialog open={props.open} onOpenChange={(open: boolean) => !open && props.onCancel()}>
            <DialogContent className={width} data-rp-field-dialog="">
                <DialogHeader>
                    <DialogTitle>{spec.title || 'Fill in the fields'}</DialogTitle>
                    {spec.instruction ? <DialogDescription>{spec.instruction}</DialogDescription> : null}
                </DialogHeader>
                <FormProvider form={form}>
                    <form
                        ref={root}
                        noValidate
                        className="flex flex-col gap-4"
                        onSubmit={(e: any) => {
                            e.preventDefault();
                            submit();
                        }}
                    >
                        {spec.fields.map((f, i) => (
                            // referringTable: reference / glide_list lookups run against that table's dictionary field
                            // (the dialog's own store has no table, so lookups had nothing to search).
                            <FieldControl
                                key={keyOf(f, i)}
                                name={keyOf(f, i)}
                                table={s(f.referringTable) || undefined}
                            />
                        ))}
                        {error ? (
                            <p role="alert" className="m-0 text-sm text-destructive" data-rp-field-dialog-error="">
                                {error}
                            </p>
                        ) : null}
                        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                    </form>
                </FormProvider>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={props.onCancel} data-rp-field-dialog-cancel="">
                        {spec.cancelTitle || 'Cancel'}
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        data-rp-field-dialog-ok=""
                        data-dirty={meta.isDirty ? '' : undefined}
                    >
                        {spec.confirmTitle || 'OK'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Open the fields dialog; resolves { updatedFields }, rejects when cancelled (or no outlet is mounted). */
export function showFieldsDialog(spec: FieldsDialogSpec): Promise<FieldsDialogResult> {
    if (!hasDialogOutlet()) return Promise.reject(new Error('No dialog outlet is mounted on this page'));
    return new Promise((resolve, reject) => {
        openDialog((close) => (
            <FieldDialog
                open
                spec={spec}
                onSubmit={(r) => {
                    close();
                    resolve(r);
                }}
                onCancel={() => {
                    close();
                    reject(new Error('cancelled'));
                }}
            />
        ));
    });
}

/** Alias: showFields(spec) (same as showFieldsDialog). */
export const showFields = showFieldsDialog;

/** Hook form for widgets: const showFields = useFieldsDialog(); const { updatedFields } = await showFields(spec). */
export function useFieldsDialog() {
    return showFieldsDialog;
}

/** Preview (Studio). */
export default function FieldDialogPreview() {
    const [open, setOpen] = useState(false);
    const [out, setOut] = useState('');
    const spec: FieldsDialogSpec = {
        title: 'Resolve',
        instruction: 'Fill in the resolution details.',
        fields: [
            {
                type: 'choice',
                name: 'close_code',
                label: 'Resolution code',
                mandatory: true,
                choices: [
                    { value: 'Solved', displayValue: 'Solved' },
                    { value: 'Workaround', displayValue: 'Workaround' },
                ],
            },
            { type: 'textarea', name: 'close_notes', label: 'Resolution notes', mandatory: true },
            { type: 'boolean', name: 'notify', label: 'Notify the caller', value: 'true' },
        ],
    };
    return (
        <div className="flex flex-col items-start gap-3 p-4">
            <Button onClick={() => setOpen(true)}>Open fields dialog…</Button>
            <FieldDialog
                open={open}
                spec={spec}
                onSubmit={(r) => {
                    setOpen(false);
                    setOut(JSON.stringify(r.updatedFields.map((f) => [f.name, f.value])));
                }}
                onCancel={() => setOpen(false)}
            />
            {out ? <pre className="text-xs">{out}</pre> : null}
        </div>
    );
}
