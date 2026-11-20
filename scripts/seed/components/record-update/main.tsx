/**
 * components:app/record-update: change a few fields of a record through the platform's own form
 * save, headless. Board lane moves (app/visual-board) and calendar reschedules (app/calendar-view)
 * use it, and any widget can.
 *
 *   const updater = useRecordUpdate();
 *   const outcome = await updater.update({ table, sysId, values: { state: '2' }, label: 'INC0010001' });
 *   …
 *   return <>{…}{updater.element}</>        render the element once (it hosts the hidden forms + dialog)
 *
 *   updateWithUndo(updater, request, previous, { success? })   update, then a toast with Undo
 *
 * How: each request mounts an invisible app/form record form (useRecordForm: the record's form view,
 * UI policies, client scripts with onChange, ACLs), sets the values, waits for the scripts, then runs
 * the form's Save UI action, so business rules, data policies and ACLs run as on any form and their
 * messages come back as toasts. When the save needs more (a UI policy made a field mandatory, e.g.
 * resolution notes when an incident moves to Resolved), a dialog shows the missing fields with the
 * new values filled in; Cancel rolls back. Fields the record's form view doesn't have are written
 * through the list edit path (utilities:app/list-data writeCells: business rules and ACLs still apply).
 *
 * Outcome: { ok: true } | { ok: false, reason: 'cancelled' | 'readonly' | 'invalid' | 'server' |
 * 'blocked' | 'conflict' | 'error', message }. The caller decides how to roll back (optimistic UI).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { useQueryClient } from 'utilities:react-query';
import { useRecordForm } from 'components:app/form';
import type { RecordFormModel, SaveOutcome } from 'components:app/form';
import { FormProvider, Spinner, IconAlert, cx } from 'components:app/field';
import { FieldControl } from 'components:app/field-control';
import { writeCells, useListInvalidate } from 'utilities:app/list-data';
import { Button } from 'components:button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from 'components:dialog';

export type UpdateValue = string | { value: string; displayValue?: string };

export type RecordUpdateRequest = {
    table: string;
    sysId: string;
    /**
     * field → new value: glide internal values (UTC date-times, sys_ids, choice values). Date and
     * date-time fields also need `displayValue` in the user's format and zone: the form path holds
     * them that way (the list path writes the UTC value).
     */
    values: Record<string, UpdateValue>;
    /** The record's name in messages ('INC0010001'). */
    label?: string;
    /** What happens, in the "needs more" dialog ('Move to Resolved'). */
    description?: string;
    /** Skip the form and write through the list edit path (no UI policies / client scripts). */
    listPath?: boolean;
};

export type RecordUpdateOutcome =
    | { ok: true; path: 'form' | 'list' }
    | {
          ok: false;
          reason: 'cancelled' | 'readonly' | 'invalid' | 'server' | 'blocked' | 'conflict' | 'error';
          message: string;
      };

type Job = { id: number; request: RecordUpdateRequest; resolve: (o: RecordUpdateOutcome) => void };

export type RecordUpdater = {
    update: (request: RecordUpdateRequest) => Promise<RecordUpdateOutcome>;
    /** Render once: the hidden forms and the "needs more" dialog. */
    element: any;
    /** Requests in flight. */
    pending: number;
};

function valueOf(v: UpdateValue): { value: string; displayValue?: string } {
    return typeof v === 'string' ? { value: v } : { value: v.value, displayValue: v.displayValue };
}

const DATE_TYPES = ['glide_date_time', 'glide_date', 'due_date', 'date', 'datetime'];

let jobSeq = 0;

/** The headless updater: one hidden form per request in flight. */
export function useRecordUpdate(): RecordUpdater {
    const [jobs, setJobs] = useState<Job[]>([]);
    const invalidate = useListInvalidate();
    const qc = useQueryClient();
    const update = useCallback(
        (request: RecordUpdateRequest) =>
            new Promise<RecordUpdateOutcome>((resolve) => {
                if (request.listPath) {
                    listWrite(request).then((o) => {
                        invalidate(request.table);
                        resolve(o);
                    });
                    return;
                }
                const enqueue = (attempt: number) => {
                    // Always a fresh bootstrap: a cached one carries an old sys_mod_count (save → conflict).
                    qc.removeQueries({ queryKey: ['rp-gql', 'form', request.table, request.sysId] });
                    const id = ++jobSeq;
                    const job: Job = {
                        id,
                        request,
                        resolve: (o) => {
                            setJobs((list) => list.filter((j) => j.id !== id));
                            // Changed on the server between the read and the save: read again once.
                            if (!o.ok && o.reason === 'conflict' && attempt === 0) {
                                enqueue(1);
                                return;
                            }
                            invalidate(request.table);
                            qc.invalidateQueries({ queryKey: ['rp-gql', 'record', request.table, request.sysId] });
                            resolve(o);
                        },
                    };
                    setJobs((list) => list.concat(job));
                };
                enqueue(0);
            }),
        [invalidate, qc]
    );
    const element = jobs.length ? (
        <>
            {jobs.map((j) => (
                <UpdateJob key={j.id} job={j} />
            ))}
        </>
    ) : null;
    return { update, element, pending: jobs.length };
}

/** The list edit path (GlideListLayoutInline_Query.writeMultiRow): BRs and ACLs, no client logic. */
async function listWrite(request: RecordUpdateRequest): Promise<RecordUpdateOutcome> {
    try {
        const res = await writeCells({
            table: request.table,
            sysIds: [request.sysId],
            values: Object.keys(request.values).map((column) => ({
                column,
                value: valueOf(request.values[column]).value,
            })),
        });
        for (const m of res.info) toast(m);
        if (res.ok) return { ok: true, path: 'list' };
        return {
            ok: false,
            reason: 'server',
            message:
                res.errors[0] ||
                `${request.label || 'The record'} wasn't updated (no permission, or a rule refused it).`,
        };
    } catch (e) {
        return { ok: false, reason: 'error', message: (e as Error).message || String(e) };
    }
}

function outcomeMessage(o: SaveOutcome, label: string): string {
    if (o.ok) return '';
    if (o.reason === 'blocked') return `A script on the form stopped the update of ${label}.`;
    if (o.reason === 'conflict') return o.error.message;
    if (o.reason === 'server') return o.error.message || `${label} wasn't saved.`;
    if (o.reason === 'invalid') return o.validation.errors.map((e) => e.message).join(' · ');
    return '';
}

/** A field's effective read-only state (script override → UI policy → server state → dictionary / ACL). */
function isReadOnly(form: RecordFormModel, name: string): boolean {
    const s = form.fieldSnapshot(name);
    const e: any = s.entry || {};
    const o = e.overrides || {};
    const p = e.policy || {};
    const m = s.meta;
    return !!(
        o.readOnly ??
        p.readOnly ??
        (s.server && s.server.readonly) ??
        (m && (m.readOnly || m.canWrite === false))
    );
}

/** One request: a hidden record form → set values → Save; a dialog when the form needs more. */
function UpdateJob({ job }: { job: Job }) {
    const { request } = job;
    const label = request.label || 'the record';
    const form = useRecordForm({
        table: request.table,
        sysId: request.sysId,
        viewRules: false,
        live: false,
        onOpenRecord: () => {},
    });
    const [phase, setPhase] = useState<'loading' | 'saving' | 'needs' | 'done'>('loading');
    const [needs, setNeeds] = useState<string[]>([]);
    const started = useRef(false);
    const doneRef = useRef(false);
    const finish = (o: RecordUpdateOutcome) => {
        if (doneRef.current) return;
        doneRef.current = true;
        setPhase('done');
        job.resolve(o);
    };

    const runSave = async (f: RecordFormModel) => {
        setPhase('saving');
        let out: SaveOutcome;
        try {
            out = await f.save();
        } catch (e) {
            finish({ ok: false, reason: 'error', message: (e as Error).message || String(e) });
            return;
        }
        if (out.ok || out.reason === 'nothing') return finish({ ok: true, path: 'form' });
        if (out.reason === 'invalid') {
            const names = out.validation.errors.map((e) => e.name);
            setNeeds(Array.from(new Set(names.concat(Object.keys(request.values)))));
            setPhase('needs');
            return;
        }
        finish({ ok: false, reason: out.reason, message: outcomeMessage(out, label) });
    };

    useEffect(() => {
        if (started.current) return;
        if (form.status.error) {
            started.current = true;
            finish({ ok: false, reason: 'error', message: form.status.error.message });
            return;
        }
        if (!form.bootstrap || !form.status.loaded) return;
        started.current = true;
        const boot = form.bootstrap;
        if (form.readOnly) {
            finish({ ok: false, reason: 'readonly', message: `You can't edit ${label}.` });
            return;
        }
        const names = Object.keys(request.values);
        const offView = names.filter((n) => !(n in boot.meta) && !(n in boot.values));
        if (offView.length) {
            // Not on the record's form view: the list edit path for the whole request.
            listWrite(request).then(finish);
            return;
        }
        const locked = names.filter((n) => isReadOnly(form, n));
        if (locked.length) {
            const m = boot.meta[locked[0]];
            finish({
                ok: false,
                reason: 'readonly',
                message: `${(m && m.label) || locked[0]} is read-only on ${label}.`,
            });
            return;
        }
        // Give onLoad scripts a moment (they start right after the bootstrap lands), then set and save.
        const t = setTimeout(() => {
            for (const n of names) {
                const v = valueOf(request.values[n]);
                // The form holds date / date-time values as the user sees them (their format and zone).
                const m = boot.meta[n];
                const local = !!m && DATE_TYPES.indexOf(String(m.internalType || m.type)) >= 0 && !!v.displayValue;
                form.setValue(n, local ? v.displayValue! : v.value, v.displayValue);
            }
            // onChange scripts and UI policies react to the new values before the save.
            setTimeout(() => runSave(form), 150);
        }, 120);
        return () => clearTimeout(t);
    }, [form.bootstrap, form.status.loaded, form.status.error]);

    if (phase !== 'needs') return null;
    const boot = form.bootstrap;
    const errors = form.validation ? form.validation.errors : [];
    const shown = new Set(needs.filter((n) => boot && (n in boot.meta || n in boot.values)));
    const hidden = errors.filter((e) => !shown.has(e.name));
    return (
        <Dialog
            open
            onOpenChange={(open: boolean) => {
                if (!open && !form.saving) finish({ ok: false, reason: 'cancelled', message: 'Cancelled' });
            }}
        >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-rp-record-update-dialog="">
                <DialogHeader>
                    <DialogTitle>{`Update ${label}`}</DialogTitle>
                    <DialogDescription>
                        {request.description ? `${request.description}. ` : ''}
                        The form needs a few more values before it can be saved.
                    </DialogDescription>
                </DialogHeader>
                <FormProvider form={form}>
                    <form
                        noValidate
                        className="flex flex-col gap-4"
                        onSubmit={(e: any) => {
                            e.preventDefault();
                            if (!form.saving) runSave(form);
                        }}
                    >
                        {Array.from(shown).map((name) => (
                            <FieldControl key={name} name={name} />
                        ))}
                        {hidden.length || form.saveError ? (
                            <div
                                role="alert"
                                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                            >
                                <IconAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <div className="min-w-0">
                                    {form.saveError ? <p className="m-0">{form.saveError.message}</p> : null}
                                    {hidden.map((e) => (
                                        <p key={e.name} className="m-0">
                                            {e.label}: {e.message}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <div className={cx('flex flex-wrap items-center justify-end gap-2')}>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => finish({ ok: false, reason: 'cancelled', message: 'Cancelled' })}
                                data-rp-record-update-cancel=""
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.saving} data-rp-record-update-save="">
                                {form.saving ? <Spinner label="Saving" /> : null}
                                Save
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Update, then toast the result: success with an Undo button (which writes `previous` back the same
 * way), failure with the reason. Returns the outcome so the caller can roll its optimistic state back.
 */
export async function updateWithUndo(
    updater: RecordUpdater,
    request: RecordUpdateRequest,
    previous: Record<string, UpdateValue>,
    messages: { success?: string; undone?: string } = {}
): Promise<RecordUpdateOutcome> {
    const outcome = await updater.update(request);
    const label = request.label || 'Record';
    if (outcome.ok) {
        toast.success(messages.success || `${label} updated`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => {
                    updater
                        .update({ ...request, values: previous, description: `Undo: ${request.description || ''}` })
                        .then((o) => {
                            if (o.ok) toast(messages.undone || `${label} restored`);
                            else if (o.reason !== 'cancelled') toast.error(o.message);
                        });
                },
            },
        });
    } else if (outcome.reason !== 'cancelled') {
        toast.error(outcome.message || `${label} wasn't updated`);
    }
    return outcome;
}

/** Preview (Studio): explains itself (a live update would write to a record). */
export default function RecordUpdatePreview() {
    return (
        <p className="p-4 text-sm text-muted-foreground">
            useRecordUpdate(): headless form saves. See the Board and Calendar pages (sp portal).
        </p>
    );
}
