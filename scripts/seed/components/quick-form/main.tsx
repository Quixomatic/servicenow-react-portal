/**
 * components:app/quick-form: a compact create / edit form for a few fields (Next Experience's
 * sn-record-common-quick-form), on the full form runtime (app/form useRecordForm): UI policies,
 * client scripts, ACLs and the platform's Save / Submit UI action, so business rules run as on any form.
 *
 *   <QuickForm table="incident" fields={['short_description', 'urgency']} onSaved={(id) => …} />
 *                                              inline; sysId '-1' (default) = new, else edit that record
 *   <QuickFormDialog open={open} onOpenChange={setOpen} table fields title="New incident" query="caller_id=…" />
 *                                              the same in a dialog (the form mounts only while open)
 *   const { form, fields } = useQuickForm({ table, sysId, fields, query })
 *
 * New records: like any platform form, loading one reserves a number. Mandatory fields that aren't
 * in `fields` still block the save; their messages are listed above the buttons, so include them
 * (or preset them with `query`). The default form view is used (no portal view rules).
 */
import { useState } from 'react';
import { useRecordForm } from 'components:app/form';
import type { RecordFormModel } from 'components:app/form';
import { FormProvider, useFormMeta, Spinner, IconAlert, cx } from 'components:app/field';
import { FieldControl } from 'components:app/field-control';
import { Button } from 'components:button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from 'components:dialog';

export type UseQuickFormOptions = {
    table: string;
    /** '-1' / '' (default) = a new record. */
    sysId?: string;
    /** Fields to show, in order. */
    fields: string[];
    /** Encoded query presetting a new record's values ('parent=<sys_id>^caller_id=…'). */
    query?: string;
    /** After a successful save: the record's sys_id and whether it was new. */
    onSaved?: (sysId: string, info: { isNew: boolean }) => void;
    /** Redirects / g_aw.openRecord from the form's scripts and actions. */
    onOpenRecord?: (table: string, sysId: string, params?: Record<string, unknown>) => void;
};

/** A RecordForm model for a quick form (default view, no live refresh needed for a dialog). */
export function useQuickForm(options: UseQuickFormOptions): { form: RecordFormModel; fields: string[] } {
    const form = useRecordForm({
        table: options.table,
        sysId: options.sysId || '-1',
        query: options.query,
        viewRules: false,
        onSaved: (result, info) => {
            const id = (result && result.sysId) || '';
            if (options.onSaved) options.onSaved(id, { isNew: info.isNew });
        },
        onOpenRecord: options.onOpenRecord,
    });
    return { form, fields: options.fields };
}

export type QuickFormProps = UseQuickFormOptions & {
    /** Cancel button (absent: none). */
    onCancel?: () => void;
    submitLabel?: string;
    className?: string;
};

/** The fields plus a footer (messages, Cancel, Create / Save). */
export function QuickForm(props: QuickFormProps) {
    const { form, fields } = useQuickForm(props);
    return (
        <QuickFormBody
            form={form}
            fields={fields}
            onCancel={props.onCancel}
            submitLabel={props.submitLabel}
            className={props.className}
        />
    );
}

function QuickFormBody(props: {
    form: RecordFormModel;
    fields: string[];
    onCancel?: () => void;
    submitLabel?: string;
    className?: string;
}) {
    const { form, fields } = props;
    const meta = useFormMeta(form);
    const [busy, setBusy] = useState(false);
    const boot = form.bootstrap;
    if (!boot) {
        return (
            <div className={cx('flex items-center gap-2 py-2 text-sm text-muted-foreground', props.className)}>
                {form.status.error ? (
                    <span role="alert" className="text-destructive">
                        {form.status.error.message}
                    </span>
                ) : (
                    <>
                        <Spinner label="Loading the form" /> Loading…
                    </>
                )}
            </div>
        );
    }
    const errors = form.validation ? form.validation.errors : [];
    const shown = new Set(fields);
    // Problems with fields this quick form doesn't show (they'd otherwise be invisible).
    const hiddenErrors = errors.filter((e) => !shown.has(e.name));
    const failure = form.saveError;
    const canSave = !form.readOnly && (form.isNew || meta.dirtyFields.length > 0) && !form.saving && !busy;
    const submit = async () => {
        setBusy(true);
        try {
            await form.save();
        } finally {
            setBusy(false);
        }
    };
    return (
        <FormProvider form={form}>
            <form
                noValidate
                aria-label={`${boot.tableLabel} quick form`}
                className={cx('flex flex-col gap-4', props.className)}
                onSubmit={(e: any) => {
                    e.preventDefault();
                    if (canSave) submit();
                }}
                data-rp-quick-form={`${boot.table}:${form.isNew ? 'new' : boot.sysId}`}
            >
                {fields.map((name) => (
                    <FieldControl key={name} name={name} />
                ))}
                {hiddenErrors.length || failure ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                    >
                        <IconAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                            {failure ? <p className="m-0">{failure.message}</p> : null}
                            {hiddenErrors.map((e) => (
                                <p key={e.name} className="m-0">
                                    {e.label}: {e.message}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {props.onCancel ? (
                        <Button type="button" variant="ghost" onClick={props.onCancel} data-rp-quick-cancel="">
                            Cancel
                        </Button>
                    ) : null}
                    <Button type="submit" disabled={!canSave || form.readOnly} data-rp-quick-save="">
                        {form.saving || busy ? <Spinner label="Saving" /> : null}
                        {props.submitLabel || (form.isNew ? 'Create' : 'Save')}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

export type QuickFormDialogProps = QuickFormProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
};

/** A QuickForm in a dialog; it closes after a successful save. */
export function QuickFormDialog(props: QuickFormDialogProps) {
    const { open, onOpenChange, title, description, ...rest } = props;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-rp-quick-form-dialog="">
                <DialogHeader>
                    <DialogTitle>
                        {title || (rest.sysId && rest.sysId !== '-1' ? 'Edit record' : 'New record')}
                    </DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                {open ? (
                    <QuickForm
                        {...rest}
                        onCancel={() => onOpenChange(false)}
                        onSaved={(id, info) => {
                            onOpenChange(false);
                            if (rest.onSaved) rest.onSaved(id, info);
                        }}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

/** Preview (Studio): explains itself (a live quick form would reserve a record number). */
export default function QuickFormPreview() {
    return (
        <p className="p-4 text-sm text-muted-foreground">
            &lt;QuickForm table fields /&gt; / &lt;QuickFormDialog /&gt;: see the Fields demo page (sp portal).
        </p>
    );
}
