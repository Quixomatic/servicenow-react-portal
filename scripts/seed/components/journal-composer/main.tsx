/**
 * components:app/journal-composer: write work notes and additional comments on a record.
 *
 *   <JournalComposer table="incident" sysId={id} />                 standalone (posts at once)
 *   <JournalComposer table="incident" sysId={id} form={recordForm} />  bound to a RecordForm
 *
 * - A Work notes / Additional comments switch (a radio group: arrow keys, Home / End) offers the
 *   journal fields the user may write on this record (dictionary + field ACLs via
 *   utilities:app/activity useJournalFields; bound: also g_form / UI policy visibility and
 *   read-only). One writable field → no switch, just its label.
 * - Plain text, as the platform stores journals. Work notes are tinted and say they're internal.
 * - Post (or Ctrl/⌘+Enter) uses the platform's journal call, GlideActivity_Mutation.putJournal, as
 *   Workspace's compose box does; the box clears and the stream refreshes (AMB, plus a refetch).
 * - Bound to a form, the text is the form's journal value (g_form.getValue('work_notes') sees it,
 *   a form Save posts it with the rest, mandatory work notes are satisfied by it). When other
 *   fields have unsaved changes, Post becomes "Post and save" and runs the form's Save, so the
 *   journal entry and the edits land in one platform save (no "changed by someone else"
 *   conflict from our own post).
 *
 * Exports: JournalComposer, JournalSwitch (the switch alone), useComposerFields.
 */
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { FormProvider, useField, cx, Spinner, isFieldVisible } from 'components:app/field';
import type { FormStore } from 'components:app/field';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { useJournalFields, usePostJournal } from 'utilities:app/activity';
import type { JournalFieldInfo } from 'utilities:app/activity';
import { useAutoGrow, journalTone, JOURNAL_HELP } from 'components:app/journal-field';

/** What the composer needs from a bound form (a RecordForm model fits). */
export type ComposerForm = FormStore & {
    save?: () => Promise<{ ok: boolean }>;
    isNew?: boolean;
    readOnly?: boolean;
};

export type JournalComposerProps = {
    table: string;
    sysId: string;
    /** Bind to a form: journal text becomes form values (see above). */
    form?: ComposerForm;
    /** Limit and order the journal fields (default: every journal field the user may write). */
    fields?: string[];
    /** Field selected first (default: work_notes when writable, else the first writable). */
    defaultField?: string;
    placeholder?: string;
    /** Lines shown before the box grows (default 3). */
    rows?: number;
    autoFocus?: boolean;
    /** Called after a successful post (or post-and-save). */
    onPosted?: (field: string, value: string) => void;
    /** Accessible name of the composer region (default "Add to the activity"). */
    label?: string;
    className?: string;
};

const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/** The journal fields to offer: writable ones, minus those a bound form hides. */
export function useComposerFields(
    table: string,
    sysId: string,
    options: { form?: ComposerForm | null; only?: string[] } = {}
) {
    const { fields, loading } = useJournalFields(table, sysId, { only: options.only });
    const form = options.form || null;
    const hiddenKey = useSyncExternalStore(
        form ? form.subscribe : noopSubscribe,
        () =>
            form
                ? fields
                      .filter((f) => form.getState().meta[f.name] && !isFieldVisible(form.getState(), f.name))
                      .map((f) => f.name)
                      .join(',')
                : '',
        () => ''
    );
    const hidden = hiddenKey ? hiddenKey.split(',') : [];
    const offered = fields.filter((f) => f.writable && hidden.indexOf(f.name) < 0);
    return { fields: offered, all: fields, loading };
}
const noopSubscribe = () => () => {};

/** The Work notes / Additional comments switch: a radio group of pills. */
export function JournalSwitch(props: {
    fields: JournalFieldInfo[];
    value: string;
    onChange: (name: string) => void;
    drafts?: Record<string, boolean>;
    label?: string;
}) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const index = Math.max(
        0,
        props.fields.findIndex((f) => f.name === props.value)
    );
    const move = (i: number) => {
        const n = props.fields.length;
        const next = ((i % n) + n) % n;
        props.onChange(props.fields[next].name);
        const el = refs.current[next];
        if (el) el.focus();
    };
    return (
        <div
            role="radiogroup"
            aria-label={props.label || 'Journal'}
            className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-0.5"
            data-rp-journal-switch=""
        >
            {props.fields.map((f, i) => {
                const on = f.name === props.value;
                return (
                    <button
                        key={f.name}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        data-rp-journal-option={f.name}
                        className={cx(
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            on
                                ? f.internal
                                    ? 'bg-amber-500/15 text-foreground shadow-xs ring-1 ring-amber-500/40'
                                    : 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => props.onChange(f.name)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                move(index + 1);
                            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                e.preventDefault();
                                move(index - 1);
                            } else if (e.key === 'Home') {
                                e.preventDefault();
                                move(0);
                            } else if (e.key === 'End') {
                                e.preventDefault();
                                move(props.fields.length - 1);
                            }
                        }}
                    >
                        <Icon name={f.internal ? 'lock' : 'message-square'} className="size-3.5" aria-hidden="true" />
                        {f.label}
                        {props.drafts && props.drafts[f.name] && !on ? (
                            <>
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                                <span className="sr-only"> (draft)</span>
                            </>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

export function JournalComposer(props: JournalComposerProps) {
    const inner = <ComposerInner {...props} />;
    // Bound: make sure fields resolve against this form (the composer may render outside its provider).
    return props.form ? <FormProvider form={props.form as any}>{inner}</FormProvider> : inner;
}

function ComposerInner(props: JournalComposerProps) {
    const { table, sysId, form } = props;
    const { fields, all, loading } = useComposerFields(table, sysId, { form, only: props.fields });
    const [active, setActive] = useState('');
    const chosen =
        fields.find((f) => f.name === active) ||
        fields.find((f) => f.name === props.defaultField) ||
        fields.find((f) => f.name === 'work_notes') ||
        fields[0];
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const post = usePostJournal(table, sysId);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const regionId = useId();
    // Fields with unsent text (a dot on their switch option). Bound: the form store's values.
    const boundDrafts = useSyncExternalStore(
        form ? form.subscribe : noopSubscribe,
        () => {
            if (!form) return '';
            const st = form.getState();
            return all
                .filter((f) => {
                    const e = st.fields[f.name];
                    return !!e && !!String(e.staged !== undefined ? e.staged : e.value || '').trim();
                })
                .map((f) => f.name)
                .join(',');
        },
        () => ''
    );

    if (loading && !fields.length) {
        return (
            <div
                className={cx(
                    'flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground',
                    props.className
                )}
                aria-busy="true"
                data-rp-journal-composer="loading"
            >
                <Spinner /> Loading…
            </div>
        );
    }
    if (!chosen) {
        // Nothing writable: say so only when the table has journal fields at all.
        return all.length ? (
            <p
                className={cx(
                    'rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground',
                    props.className
                )}
                data-rp-journal-composer="none"
            >
                You can't add work notes or comments to this record.
            </p>
        ) : null;
    }
    const draftFlags: Record<string, boolean> = {};
    const boundList = boundDrafts ? boundDrafts.split(',') : [];
    fields.forEach(
        (f) => (draftFlags[f.name] = form ? boundList.indexOf(f.name) >= 0 : !!(drafts[f.name] || '').trim())
    );
    return (
        <section
            aria-labelledby={regionId}
            className={cx('flex flex-col gap-2', props.className)}
            data-rp-journal-composer={chosen.name}
        >
            <h3 id={regionId} className="sr-only">
                {props.label || 'Add to the activity'}
            </h3>
            {fields.length > 1 ? (
                <JournalSwitch
                    fields={fields}
                    value={chosen.name}
                    onChange={setActive}
                    drafts={draftFlags}
                    label="Post to"
                />
            ) : null}
            <ComposerBox
                key={chosen.name}
                info={chosen}
                table={table}
                form={form}
                single={fields.length === 1}
                rows={props.rows}
                autoFocus={props.autoFocus}
                placeholder={props.placeholder}
                draft={drafts[chosen.name] || ''}
                setDraft={(v) => setDrafts((d) => ({ ...d, [chosen.name]: v }))}
                journalNames={all.map((f) => f.name)}
                posting={post.posting}
                error={error}
                status={status}
                onPost={async (value, viaSave) => {
                    setError('');
                    setStatus('');
                    try {
                        if (viaSave && form && form.save) {
                            const r = await form.save();
                            if (!r || !r.ok) return false;
                        } else {
                            await post.post(chosen.name, value);
                            if (form) form.reset(chosen.name);
                        }
                        if (!form) setDrafts((d) => ({ ...d, [chosen.name]: '' }));
                        setStatus(`${chosen.internal ? 'Work note' : chosen.label} posted`);
                        if (props.onPosted) props.onPosted(chosen.name, value);
                        return true;
                    } catch (e) {
                        setError((e as Error).message || 'The entry was not posted.');
                        return false;
                    }
                }}
            />
        </section>
    );
}

function ComposerBox(props: {
    info: JournalFieldInfo;
    table: string;
    form?: ComposerForm;
    single: boolean;
    rows?: number;
    autoFocus?: boolean;
    placeholder?: string;
    draft: string;
    setDraft: (v: string) => void;
    journalNames: string[];
    posting: boolean;
    error: string;
    status: string;
    onPost: (value: string, viaSave: boolean) => Promise<boolean>;
}) {
    const { info, form } = props;
    // Bound: the form store's field (g_form state applies); standalone: local draft text.
    const field = useField(
        form
            ? { name: info.name, label: info.label }
            : {
                  name: info.name,
                  table: props.table,
                  label: info.label,
                  value: props.draft,
                  onChange: (v: string) => props.setDraft(v),
                  onStage: (v: string) => props.setDraft(v),
              }
    );
    const ref = useRef<HTMLTextAreaElement | null>(null);
    const text = String((form ? (field.staged ?? field.value) : props.draft) || '');
    useAutoGrow(ref, text, { rows: props.rows || 3, maxRows: 14 });
    const tone = journalTone(info.name);
    const helpId = useId();
    // Other unsaved form changes → Post runs the form's Save (one platform save).
    const otherDirtyKey = useSyncExternalStore(
        form ? form.subscribe : noopSubscribe,
        () =>
            form
                ? form
                      .getDirtyFields()
                      .filter((n) => props.journalNames.indexOf(n) < 0)
                      .join(',')
                : '',
        () => ''
    );
    const viaSave = !!(form && form.save && otherDirtyKey);
    const readOnly = !!(form && field.state.readOnly);
    const max = info.maxLength || field.maxLength || 0;
    const over = max > 0 && text.length > max;
    const canPost = !readOnly && !props.posting && !!text.trim() && !over;
    useEffect(() => {
        if (props.autoFocus && ref.current) ref.current.focus();
    }, []);

    const submit = async () => {
        if (!canPost) return;
        const value = text;
        if (form) field.setValue(value);
        const ok = await props.onPost(value, viaSave);
        if (ok && ref.current) ref.current.focus();
    };
    const help = info.help || JOURNAL_HELP[info.name] || '';
    const shortcut = isMac ? '⌘+Enter' : 'Ctrl+Enter';
    return (
        <div className="flex flex-col gap-1.5">
            {props.single ? (
                <label
                    htmlFor={field.ids.input}
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                    <Icon
                        name={info.internal ? 'lock' : 'message-square'}
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                    />
                    {info.label}
                    {field.state.mandatory ? (
                        <span className="text-destructive" aria-hidden="true">
                            *
                        </span>
                    ) : null}
                </label>
            ) : null}
            <div
                className={cx(
                    'flex flex-col rounded-lg border bg-background shadow-xs transition-[border-color,box-shadow] focus-within:ring-[3px]',
                    info.internal
                        ? 'border-amber-500/40 bg-amber-500/[0.05] focus-within:border-amber-500/70 focus-within:ring-amber-500/20'
                        : 'border-input focus-within:border-ring focus-within:ring-ring/50',
                    field.invalid || over ? 'border-destructive' : ''
                )}
            >
                <textarea
                    ref={ref}
                    id={field.ids.input}
                    rows={props.rows || 3}
                    value={text}
                    readOnly={readOnly}
                    aria-label={props.single ? undefined : info.label}
                    aria-required={field.state.mandatory || undefined}
                    aria-invalid={field.invalid || over || undefined}
                    aria-describedby={[helpId, field.describedBy].filter(Boolean).join(' ') || undefined}
                    aria-keyshortcuts={isMac ? 'Meta+Enter' : 'Control+Enter'}
                    placeholder={
                        props.placeholder ||
                        (info.internal
                            ? 'Add a work note…'
                            : `Add ${info.label.toLowerCase().startsWith('additional') ? 'an additional comment' : 'a comment'}…`)
                    }
                    data-rp-journal-input={info.name}
                    className="min-h-16 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    onChange={(e) => (form ? field.stage(e.target.value) : props.setDraft(e.target.value))}
                    onBlur={(e) => {
                        if (form && e.target.value !== field.value) field.setValue(e.target.value);
                        field.blur();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                />
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-2 pb-2">
                    <span className="mr-auto hidden text-[11px] text-muted-foreground sm:inline">
                        {shortcut} to post
                    </span>
                    {max > 0 && (text.length >= max * 0.8 || over) ? (
                        <span
                            className={cx('text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}
                        >
                            {text.length}/{max}
                        </span>
                    ) : null}
                    <Button
                        type="button"
                        size="sm"
                        onClick={submit}
                        disabled={!canPost}
                        title={viaSave ? 'Saves the form with your other changes and this entry' : undefined}
                        data-rp-journal-post={viaSave ? 'save' : 'post'}
                    >
                        {props.posting ? <Spinner /> : <Icon name="send-horizontal" aria-hidden="true" />}
                        {viaSave ? 'Post and save' : 'Post'}
                    </Button>
                </div>
            </div>
            <p id={helpId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name={info.internal ? 'lock' : 'eye'} className="size-3.5 shrink-0" aria-hidden="true" />
                {readOnly ? 'Read-only on this form' : help}
                {viaSave ? <span className="text-foreground"> · Your other changes are saved with it</span> : null}
            </p>
            {field.messages.length ? (
                <div className="flex flex-col gap-1">
                    {field.messages.map((m: any, i: number) => (
                        <p
                            key={i}
                            className={cx('text-xs', m.kind === 'error' ? 'text-destructive' : 'text-muted-foreground')}
                        >
                            {m.text}
                        </p>
                    ))}
                </div>
            ) : null}
            {props.error ? (
                <p role="alert" className="text-xs text-destructive" data-rp-journal-error="">
                    {props.error}
                </p>
            ) : null}
            <p role="status" aria-live="polite" className="sr-only">
                {props.status}
            </p>
        </div>
    );
}

export default function JournalComposerPreview() {
    return (
        <div className="max-w-xl p-4 text-sm text-muted-foreground">
            The composer needs a record: place app/activity-card, or open a form with an activity formatter.
        </div>
    );
}
