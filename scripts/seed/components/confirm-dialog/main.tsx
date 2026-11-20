/**
 * components:app/confirm-dialog: confirmation / alert dialogs on the host kit's components:dialog,
 * plus the tiny dialog queue other primitives (app/field-dialog, g_modal) open dialogs through.
 *
 *   const ok = await confirmDialog({ title: 'Discard changes?', description, confirmLabel: 'Discard', destructive: true })
 *   await alertDialog({ title: 'Saved', description })
 *   <ConfirmDialog open title onConfirm onCancel />         controlled, for your own state
 *   <DialogOutlet />                                        renders queued dialogs (mount once, e.g. in a form)
 *   openDialog((close) => <MyDialog onDone={close} />)      queue any dialog; returns a close function
 *   useDialog() → { confirm, alert, open, hasOutlet }; useConfirm() → confirm   (hooks for widgets)
 *
 * Imperative dialogs need a mounted <DialogOutlet /> (inside the portal, so the dialog renders in the
 * shadow-root overlay); with none mounted, confirmDialog / alertDialog fall back to the browser's.
 * Only the first mounted outlet renders, so several forms on a page don't double them.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components:dialog';
import { Button } from 'components:button';

// ---- queue -------------------------------------------------------------------------------------

type Entry = { id: number; render: (close: () => void) => any };
let entries: Entry[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const outlets: number[] = [];
const emit = () => listeners.forEach((l) => l());

/** Queue a dialog; it renders in the first mounted <DialogOutlet />. Returns a function that closes it. */
export function openDialog(render: (close: () => void) => any): () => void {
    const id = ++seq;
    const close = () => {
        entries = entries.filter((e) => e.id !== id);
        emit();
    };
    entries = entries.concat({ id, render });
    emit();
    return close;
}

/** Is a <DialogOutlet /> mounted (imperative dialogs can render)? */
export function hasDialogOutlet(): boolean {
    return outlets.length > 0;
}

/** Renders queued dialogs. Mount it once inside the portal (RecordForm does). */
export function DialogOutlet() {
    const [me] = useState(() => ++seq);
    useEffect(() => {
        outlets.push(me);
        emit();
        return () => {
            const i = outlets.indexOf(me);
            if (i >= 0) outlets.splice(i, 1);
            emit();
        };
    }, [me]);
    const snapshot = useSyncExternalStore(
        (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => (outlets[0] === me ? entries : NONE),
        () => NONE
    );
    return (
        <>
            {snapshot.map((e) => (
                <QueuedDialog key={e.id} entry={e} />
            ))}
        </>
    );
}
const NONE: Entry[] = [];

function QueuedDialog({ entry }: { entry: Entry }) {
    const close = () => {
        entries = entries.filter((x) => x.id !== entry.id);
        emit();
    };
    return entry.render(close);
}

// ---- confirm / alert ---------------------------------------------------------------------------

export type ConfirmOptions = {
    title: string;
    description?: any;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Destructive styling for the confirm button. */
    destructive?: boolean;
};

export type ConfirmDialogProps = ConfirmOptions & {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    /** Alert: only the confirm button (labelled OK by default). */
    alert?: boolean;
};

/** A modal confirmation: title, description, Cancel / Confirm. Escape and outside click cancel. */
export function ConfirmDialog(props: ConfirmDialogProps) {
    return (
        <Dialog open={props.open} onOpenChange={(open: boolean) => !open && props.onCancel()}>
            <DialogContent showCloseButton={false} className="sm:max-w-md" data-rp-confirm-dialog="">
                <DialogHeader>
                    <DialogTitle>{props.title}</DialogTitle>
                    {props.description ? <DialogDescription>{props.description}</DialogDescription> : null}
                </DialogHeader>
                <DialogFooter>
                    {props.alert ? null : (
                        <Button type="button" variant="outline" onClick={props.onCancel} data-rp-confirm-cancel="">
                            {props.cancelLabel || 'Cancel'}
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant={props.destructive ? 'destructive' : 'default'}
                        onClick={props.onConfirm}
                        autoFocus
                        data-rp-confirm-ok=""
                    >
                        {props.confirmLabel || (props.alert ? 'OK' : 'Confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Ask for confirmation; resolves true (confirm) or false (cancel / Escape / outside click). */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
    if (!hasDialogOutlet())
        return Promise.resolve(
            window.confirm(
                [options.title, typeof options.description === 'string' ? options.description : '']
                    .filter(Boolean)
                    .join('\n\n')
            )
        );
    return new Promise((resolve) => {
        openDialog((close) => (
            <ConfirmDialog
                open
                {...options}
                onConfirm={() => {
                    close();
                    resolve(true);
                }}
                onCancel={() => {
                    close();
                    resolve(false);
                }}
            />
        ));
    });
}

/** Show a message with an OK button; resolves when dismissed. */
export function alertDialog(options: { title: string; description?: any; confirmLabel?: string }): Promise<void> {
    if (!hasDialogOutlet()) {
        window.alert(
            [options.title, typeof options.description === 'string' ? options.description : '']
                .filter(Boolean)
                .join('\n\n')
        );
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        openDialog((close) => (
            <ConfirmDialog
                open
                alert
                {...options}
                onConfirm={() => {
                    close();
                    resolve();
                }}
                onCancel={() => {
                    close();
                    resolve();
                }}
            />
        ));
    });
}

/** Aliases: `confirm` / `alert` (same as confirmDialog / alertDialog). */
export const confirm = confirmDialog;
export const alert = alertDialog;

/** Hook form for widgets: { confirm, alert, open } (mount <DialogOutlet /> once on the page). */
export function useDialog() {
    return { confirm: confirmDialog, alert: alertDialog, open: openDialog, hasOutlet: hasDialogOutlet };
}

/** Just the confirmation: const confirm = useConfirm(); if (await confirm({ title })) … */
export function useConfirm() {
    return confirmDialog;
}

/** Preview (Studio). */
export default function ConfirmDialogPreview() {
    const [answer, setAnswer] = useState('');
    return (
        <div className="flex flex-col items-start gap-3 p-4">
            <DialogOutlet />
            <Button
                onClick={() =>
                    confirmDialog({
                        title: 'Discard your changes?',
                        description: 'Unsaved edits on this form will be lost.',
                        confirmLabel: 'Discard',
                        destructive: true,
                    }).then((ok) => setAnswer(ok ? 'confirmed' : 'cancelled'))
                }
            >
                Confirm…
            </Button>
            <Button
                variant="outline"
                onClick={() => alertDialog({ title: 'Heads up', description: 'An alert dialog.' })}
            >
                Alert…
            </Button>
            {answer ? <p className="text-sm text-muted-foreground">Answer: {answer}</p> : null}
        </div>
    );
}
