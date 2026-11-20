/**
 * components:app/string-field: single-line text (string, plus the input types email, url, tel,
 * password and search that app/email-field, app/url-field, … build on).
 *
 *   <StringField name="short_description" />                  bound to the form
 *   <StringField name="q" label="Search" value={v} onChange={(v) => …} />   standalone
 *
 * Typing stages the value; blur or Enter commits it (onChange / form listeners fire once).
 * With a max length the label row shows a live character counter.
 */
import { useEffect, useRef, useState } from 'react';
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, cx } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize, UseFieldResult } from 'components:app/field';

export type StringFieldProps = FieldProps & {
    inputType?: 'text' | 'email' | 'url' | 'tel' | 'password' | 'search';
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    startAdornment?: any;
    endAdornment?: any;
    autoComplete?: string;
    inputMode?: 'text' | 'email' | 'url' | 'tel' | 'numeric' | 'decimal' | 'search';
    /** Commit on every keystroke instead of on blur/Enter. */
    commitOnInput?: boolean;
    /** Custom read-only rendering (links for email/url/phone). */
    readOnlyValue?: (field: UseFieldResult) => any;
    /** Show the character counter from this fraction of maxLength (default 0.8; 0 = always). */
    counterFrom?: number;
    className?: string;
    /** Use an already-resolved field (wrappers that call useField themselves). */
    field?: UseFieldResult;
};

export function StringField(props: StringFieldProps) {
    const own = useField(props.field ? { name: props.name, standalone: true } : props);
    const field = props.field || own;
    return <StringInput {...props} field={field} />;
}

/** The control + shell for a resolved field (exported for wrappers). */
export function StringInput(props: StringFieldProps & { field: UseFieldResult }) {
    const { field } = props;
    const current = field.staged ?? field.value;
    const [focused, setFocused] = useState(false);
    const input = useRef<HTMLInputElement | null>(null);
    const committed = useRef(field.value);
    useEffect(() => {
        committed.current = field.value;
    }, [field.value]);

    const commit = (text: string) => {
        if (text !== committed.current || field.staged !== undefined) {
            committed.current = text;
            field.setValue(text);
        }
    };
    const max = field.maxLength;
    const from = props.counterFrom ?? 0.8;
    const showCounter =
        !!max &&
        max > 0 &&
        !field.state.readOnly &&
        (focused || String(current).length >= max * from) &&
        String(current).length >= max * from;
    const counter = showCounter ? (
        <span aria-live="polite" className={String(current).length > (max as number) ? 'text-destructive' : ''}>
            {String(current).length}/{max}
            <span className="sr-only"> characters</span>
        </span>
    ) : null;

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            labelAside={counter}
            readOnlyValue={props.readOnlyValue ? props.readOnlyValue(field) : undefined}
            className={props.className}
        >
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-2' })}>
                {props.startAdornment ? (
                    <span className="flex items-center text-muted-foreground">{props.startAdornment}</span>
                ) : null}
                <input
                    ref={input}
                    {...controlA11y(field)}
                    type={props.inputType || 'text'}
                    inputMode={props.inputMode}
                    autoComplete={props.autoComplete || 'off'}
                    placeholder={field.placeholder}
                    value={current}
                    className={bareInputClass}
                    onFocus={() => setFocused(true)}
                    onChange={(e: any) => {
                        const v = e.target.value;
                        if (props.commitOnInput) field.setValue(v);
                        else field.stage(v);
                    }}
                    onBlur={(e: any) => {
                        setFocused(false);
                        commit(e.target.value);
                        field.blur();
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') commit(e.currentTarget.value);
                        if (e.key === 'Escape' && field.staged !== undefined) {
                            // Escape abandons the uncommitted edit.
                            e.preventDefault();
                            field.stage(field.value);
                        }
                    }}
                />
                {props.endAdornment ? (
                    <span className={cx('flex items-center gap-1')}>{props.endAdornment}</span>
                ) : null}
            </div>
        </FieldShell>
    );
}

export default function StringFieldPreview() {
    return (
        <div className="flex max-w-md flex-col gap-4 p-4">
            <StringField name="title" label="Title" hint="Commits on blur or Enter" maxLength={40} mandatory />
            <StringField name="ro" label="Read only" defaultValue="Selectable value" readOnly />
        </div>
    );
}
