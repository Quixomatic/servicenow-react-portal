/**
 * components:app/journal-field: journal fields (journal_input, journal; journal_list read-only),
 * the field app/field-control renders for work notes and additional comments.
 *
 *   <JournalField name="work_notes" />            bound to the nearest form (RecordForm, FormProvider)
 *   <JournalField name="comments" label="Reply" value={text} onChange={setText} />   standalone
 *
 * - Plain text, as the platform stores journal entries. The value is the NEW entry only (journal
 *   fields load empty): a form save posts it with the other changes (the Save UI action), so
 *   business rules, notifications and ACLs run as on any platform save. g_form getValue /
 *   setValue / setMandatory / setReadOnly / showFieldMsg work through the form store.
 * - Work notes (internal) are tinted and say so (lock + "Only internal users can see work
 *   notes"); comments say who can see them. Keystrokes stage, blur and Ctrl/⌘+Enter commit.
 * - journal_list (e.g. comments_and_work_notes) is the combined history: read-only.
 *
 * Also exported: useAutoGrow(ref, value, { rows, maxRows }), journalTone(name), isInternalJournalField(name),
 * JOURNAL_HELP.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { useField, FieldShell, controlA11y, textareaClass, cx } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { Icon } from 'components:icon';

export const JOURNAL_HELP: Record<string, string> = {
    work_notes: 'Only internal users can see work notes',
    comments: 'Everyone with access to the record can see this comment',
};

/** Work notes and their variants are internal-only. */
export function isInternalJournalField(name: string): boolean {
    return /work_notes/.test(String(name || ''));
}

/** Classes that set a journal field apart: internal notes get the platform's yellow tint (theme-safe). */
export function journalTone(name: string): { control: string; badge: string; accent: string } {
    return isInternalJournalField(name)
        ? {
              control:
                  'bg-amber-500/[0.07] border-amber-500/40 focus-visible:border-amber-500/70 focus-visible:ring-amber-500/25',
              badge: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
              accent: 'border-l-amber-500',
          }
        : { control: '', badge: 'border-border bg-muted text-muted-foreground', accent: 'border-l-primary/60' };
}

/** Grow a textarea with its content between `rows` and `maxRows` lines. */
export function useAutoGrow(
    ref: { current: HTMLTextAreaElement | null },
    value: string,
    opts: { rows?: number; maxRows?: number } = {}
) {
    const rows = opts.rows || 3;
    const maxRows = opts.maxRows || 12;
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const cs = getComputedStyle(el);
        const line = parseFloat(cs.lineHeight) || 20;
        const pad = el.offsetHeight - el.clientHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        el.style.height = 'auto';
        const h = Math.min(Math.max(el.scrollHeight, rows * line + pad), maxRows * line + pad);
        el.style.height = `${h}px`;
        el.style.overflowY = el.scrollHeight > h ? 'auto' : 'hidden';
    }, [value, rows, maxRows]);
}

export type JournalFieldProps = FieldProps & {
    rows?: number;
    maxRows?: number;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
    /** Hide the "who can see this" line (default shown). */
    hideAudience?: boolean;
};

export function JournalField(props: JournalFieldProps) {
    const type = props.type || '';
    const listType = type === 'journal_list';
    const field = useField(listType ? { ...props, readOnly: true } : props);
    const isList = listType || field.meta.type === 'journal_list';
    const { rows = 3, maxRows = 12 } = props;
    const ref = useRef<HTMLTextAreaElement | null>(null);
    const [focused, setFocused] = useState(false);
    const current = field.staged ?? field.value;
    useAutoGrow(ref, String(current || ''), { rows, maxRows });
    const internal = isInternalJournalField(field.name);
    const tone = journalTone(field.name);
    const audience = props.hideAudience || isList ? '' : JOURNAL_HELP[field.name] || '';

    const max = field.maxLength;
    const len = String(current || '').length;
    const counter =
        max && max > 0 && !field.state.readOnly && (focused || len >= max * 0.8) ? (
            <span className={len > max ? 'text-destructive' : ''}>
                {len}/{max}
                <span className="sr-only"> characters</span>
            </span>
        ) : null;
    const commit = (text: string) => {
        if (text !== field.value || field.staged !== undefined) field.setValue(text);
    };
    const badge =
        internal && !isList ? (
            <span
                className={cx(
                    'inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[11px] font-medium',
                    tone.badge
                )}
                data-rp-journal-internal=""
            >
                <Icon name="lock" className="size-3" aria-hidden="true" />
                Internal
            </span>
        ) : null;
    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            labelAside={counter}
            adornment={badge}
            className={props.className}
            readOnlyValue={
                isList ? <span className="whitespace-pre-wrap">{field.displayValue || field.value}</span> : undefined
            }
        >
            <textarea
                ref={ref}
                {...controlA11y(field)}
                rows={rows}
                placeholder={field.placeholder || (internal ? 'Add a work note' : 'Add a comment')}
                value={current}
                data-rp-journal-field={field.name}
                className={textareaClass({ invalid: field.invalid, className: cx('resize-y', tone.control) })}
                onFocus={() => setFocused(true)}
                onChange={(e: any) => field.stage(e.target.value)}
                onBlur={(e: any) => {
                    setFocused(false);
                    commit(e.target.value);
                    field.blur();
                }}
                onKeyDown={(e: any) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(e.currentTarget.value);
                }}
            />
            {audience ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-rp-journal-audience="">
                    <Icon name={internal ? 'lock' : 'eye'} className="size-3.5 shrink-0" aria-hidden="true" />
                    {audience}
                </p>
            ) : null}
        </FieldShell>
    );
}

export default function JournalFieldPreview() {
    return (
        <div className="flex max-w-xl flex-col gap-4 p-4">
            <JournalField name="work_notes" label="Work notes" value="" onChange={() => undefined} />
            <JournalField name="comments" label="Additional comments" value="" onChange={() => undefined} />
        </div>
    );
}
